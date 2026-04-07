import {
  wrapFetchWithPayment,
  x402Client,
  decodePaymentResponseHeader,
} from "@x402-avm/fetch";
import type { PaymentPolicy, Network } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

import type { SwyftPayConfig, PaymentRecord } from "./types.js";
import { createSignerFromPrivateKey } from "./signer.js";
import { SpendPolicyEngine, PolicyViolationError } from "./policy.js";
import { TransactionLogger } from "./logger.js";
import { ResponseCache } from "./cache.js";
import { withRetry, detectPaymentLoop } from "./retry.js";
import type { RetryConfig } from "./retry.js";
import { SwyftPayError, classifyError } from "./errors.js";

const TESTNET = ALGORAND_TESTNET_CAIP2 as Network;

export class SwyftPayClient {
  private x402: x402Client;
  private fetchWithPay: typeof globalThis.fetch;
  private records: PaymentRecord[] = [];
  private policyEngine: SpendPolicyEngine | null;
  private logger: TransactionLogger | null;
  private responseCache: ResponseCache | null;
  private retryConfig: RetryConfig;
  private maxPaymentLoopCount: number;
  private currentRequestUrl = "";
  private consecutivePaymentCounts = new Map<string, number>();
  private lastSimulatedPayment: { amount: string; network: string; payTo: string } | null = null;
  readonly simulationMode: boolean;
  readonly address: string;

  constructor(config: SwyftPayConfig) {
    const signer = createSignerFromPrivateKey(config.avmPrivateKey);
    this.address = signer.address;

    this.policyEngine = config.spendPolicy
      ? new SpendPolicyEngine(config.spendPolicy)
      : null;

    this.logger = config.logFilePath
      ? new TransactionLogger(config.logFilePath)
      : null;

    this.responseCache = config.cacheTtlMs
      ? new ResponseCache(config.cacheTtlMs)
      : null;

    this.simulationMode = config.simulationMode ?? false;
    this.retryConfig = config.retry ?? {};
    this.maxPaymentLoopCount = config.maxPaymentLoopCount ?? 3;

    this.x402 = new x402Client();

    const networks = (config.networks ?? [ALGORAND_TESTNET_CAIP2]) as Network[];

    registerExactAvmScheme(this.x402, {
      signer,
      algodConfig: {
        algodUrl: config.algodUrl ?? "https://testnet-api.algonode.cloud",
        algodToken: config.algodToken ?? "",
      },
      networks,
    });

    const preferTestnet: PaymentPolicy = (_version, reqs) => {
      const testnet = reqs.filter((r) => r.network === TESTNET);
      return testnet.length > 0 ? testnet : reqs;
    };
    this.x402.registerPolicy(preferTestnet);

    this.x402.onBeforePaymentCreation(async ({ selectedRequirements }) => {
      const amount = Number(selectedRequirements.amount ?? 0) / 1_000_000;

      if (this.simulationMode) {
        console.log(
          `[SwyftPay] [SIMULATION] Would pay $${amount.toFixed(6)} on ${selectedRequirements.network} to ${(selectedRequirements as Record<string, unknown>).payTo ?? "unknown"}`,
        );
        this.lastSimulatedPayment = {
          amount: selectedRequirements.amount ?? "0",
          network: selectedRequirements.network ?? TESTNET,
          payTo: String((selectedRequirements as Record<string, unknown>).payTo ?? ""),
        };
        throw new Error("__SWYFTPAY_SIMULATION_SKIP__");
      }

      console.log(
        `[SwyftPay] Paying $${amount.toFixed(6)} on ${selectedRequirements.network}`,
      );

      const url = this.currentRequestUrl;
      const count = (this.consecutivePaymentCounts.get(url) ?? 0) + 1;
      this.consecutivePaymentCounts.set(url, count);
      detectPaymentLoop(count, this.maxPaymentLoopCount, url);

      if (this.policyEngine) {
        this.policyEngine.enforce({
          amount: selectedRequirements.amount ?? "0",
          endpoint: url,
          assetId: (selectedRequirements as Record<string, unknown>).asset as
            | string
            | undefined,
        });
      }
    });

    this.x402.onAfterPaymentCreation(async () => {
      console.log("[SwyftPay] Payment signed");
    });

    this.x402.onPaymentCreationFailure(async ({ error }) => {
      console.error("[SwyftPay] Payment failed:", error.message);
    });

    this.fetchWithPay = wrapFetchWithPayment(fetch, this.x402);
  }

  registerPolicy(policy: PaymentPolicy): this {
    this.x402.registerPolicy(policy);
    return this;
  }

  /** HTTP request with x402 pay-retry, backoff, cache, logging. */
  async request(
    input: string | URL | globalThis.Request,
    init?: RequestInit,
  ): Promise<Response> {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = init?.method ?? "GET";
    const correlationId = crypto.randomUUID();

    if (this.policyEngine) {
      this.policyEngine.enforce({ amount: "0", endpoint: url });
    }

    if (this.responseCache) {
      const cached = this.responseCache.get(method, url);
      if (cached) {
        console.log(`[SwyftPay] Cache HIT for ${method} ${url}`);
        const record: PaymentRecord = {
          timestamp: new Date().toISOString(),
          endpoint: url,
          method,
          amount: "0 (cached)",
          network: TESTNET,
          payTo: "",
          status: cached.status,
          correlationId,
          attempts: 0,
        };
        this.records.push(record);
        if (this.logger) this.logger.append(record);
        return cached;
      }
    }

    this.currentRequestUrl = url;
    this.consecutivePaymentCounts.delete(url);
    this.lastSimulatedPayment = null;

    let response: Response;
    let attempts: number;

    try {
      const result = await withRetry(
        async () => {
          return await this.fetchWithPay(input, init);
        },
        url,
        this.retryConfig,
      );
      response = result.result;
      attempts = result.attempts;
    } catch (err) {
      const sim = this.lastSimulatedPayment as { amount: string; network: string; payTo: string } | null;
      const isSimSkip = err instanceof Error && err.message?.includes("__SWYFTPAY_SIMULATION_SKIP__");
      if (this.simulationMode && sim && isSimSkip) {
        const record: PaymentRecord = {
          timestamp: new Date().toISOString(),
          endpoint: url,
          method,
          amount: `${sim.amount} (simulated)`,
          network: sim.network,
          payTo: sim.payTo,
          status: 402,
          correlationId,
          attempts: 1,
          simulated: true,
        };
        this.records.push(record);
        if (this.logger) this.logger.append(record);

        return new Response(
          JSON.stringify({
            simulated: true,
            wouldPay: { amount: sim.amount, network: sim.network, payTo: sim.payTo },
            message: "Payment was simulated. No funds were transferred.",
          }),
          {
            status: 402,
            headers: { "content-type": "application/json", "x-swyftpay-simulation": "true" },
          },
        );
      }
      throw err;
    }

    this.consecutivePaymentCounts.delete(url);

    const paymentHeader = response.headers.get("PAYMENT-RESPONSE");
    let txId: string | undefined;
    if (paymentHeader) {
      try {
        const receipt = decodePaymentResponseHeader(paymentHeader);
        txId = receipt?.transaction;
      } catch { /* ignore decode errors */ }
    }

    const record: PaymentRecord = {
      timestamp: new Date().toISOString(),
      endpoint: url,
      method,
      amount: txId ? "paid" : "0",
      network: TESTNET,
      payTo: "",
      txId,
      status: response.status,
      correlationId,
      attempts,
    };
    this.records.push(record);
    if (this.logger) this.logger.append(record);

    if (this.responseCache && response.status >= 200 && response.status < 300) {
      response = await this.responseCache.set(method, url, response);
    }

    return response;
  }

  async get(url: string, headers?: Record<string, string>): Promise<Response> {
    return this.request(url, { method: "GET", headers });
  }

  async post(
    url: string,
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<Response> {
    return this.request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  }

  getRecords(): readonly PaymentRecord[] {
    return this.records;
  }

  clearRecords(): void {
    this.records = [];
  }

  readLogFile(): PaymentRecord[] {
    if (!this.logger) return [];
    return this.logger.readAll();
  }

  queryLog(filter: {
    endpoint?: string;
    method?: string;
    since?: string;
    until?: string;
    paidOnly?: boolean;
  }): PaymentRecord[] {
    if (!this.logger) return [];
    return this.logger.query(filter);
  }

  clearCache(): void {
    this.responseCache?.clear();
  }

  get cacheSize(): number {
    return this.responseCache?.size ?? 0;
  }
}

export { PolicyViolationError, SwyftPayError, classifyError };
