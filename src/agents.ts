import { createHmac } from "node:crypto";
import algosdk from "algosdk";
import { SwyftPayClient } from "./client.js";
import type { SwyftPayConfig, PaymentRecord } from "./types.js";

export interface AgentProfile {
  id: string;
  name: string;
  budget: AgentBudget;
  createdAt: string;
}

export interface AgentBudget {
  totalLimit: bigint;
  dailyLimit: bigint;
  alertThreshold?: number;
}

export interface AgentStatus {
  id: string;
  name: string;
  address: string;
  budget: AgentBudget;
  spent: { total: bigint; today: bigint };
  remaining: { total: bigint; today: bigint };
  usagePercent: { total: number; daily: number };
  alert: boolean;
  alertMessage?: string;
}

/** Derives per-agent wallets from one master key and tracks budgets. */
export class AgentWalletManager {
  private masterKey: string;
  private agents = new Map<string, AgentProfile>();
  private clients = new Map<string, SwyftPayClient>();
  private baseConfig: Omit<SwyftPayConfig, "avmPrivateKey">;

  constructor(
    masterPrivateKey: string,
    baseConfig?: Partial<Omit<SwyftPayConfig, "avmPrivateKey">>,
  ) {
    this.masterKey = masterPrivateKey;
    this.baseConfig = {
      algodUrl: baseConfig?.algodUrl ?? "https://testnet-api.algonode.cloud",
      ...baseConfig,
    };
  }

  createAgent(id: string, name: string, budget: AgentBudget): AgentProfile {
    if (this.agents.has(id)) {
      throw new Error(`Agent "${id}" already exists`);
    }

    const profile: AgentProfile = {
      id,
      name,
      budget,
      createdAt: new Date().toISOString(),
    };
    this.agents.set(id, profile);
    return profile;
  }

  getClient(agentId: string): SwyftPayClient {
    const profile = this.agents.get(agentId);
    if (!profile) throw new Error(`Agent "${agentId}" not found`);

    let client = this.clients.get(agentId);
    if (!client) {
      const derivedKey = this.deriveKey(agentId);
      client = new SwyftPayClient({
        ...this.baseConfig,
        avmPrivateKey: derivedKey,
        spendPolicy: {
          maxAmountPerRequest: profile.budget.totalLimit,
          ...this.baseConfig.spendPolicy,
        },
        logFilePath: this.baseConfig.logFilePath
          ? this.baseConfig.logFilePath.replace(".jsonl", `-${agentId}.jsonl`)
          : undefined,
      });
      this.clients.set(agentId, client);
    }
    return client;
  }

  getAgentAddress(agentId: string): string {
    const derivedKey = this.deriveKey(agentId);
    const keyBytes = Buffer.from(derivedKey, "base64");
    return algosdk.encodeAddress(keyBytes.slice(32));
  }

  getStatus(agentId: string): AgentStatus {
    const profile = this.agents.get(agentId);
    if (!profile) throw new Error(`Agent "${agentId}" not found`);

    const client = this.clients.get(agentId);
    const records = client ? (client.getRecords() as PaymentRecord[]) : [];

    const spent = this.calculateSpend(records);
    const remainingTotal = profile.budget.totalLimit - spent.total;
    const remainingDaily = profile.budget.dailyLimit - spent.today;

    const totalPct = profile.budget.totalLimit > 0n
      ? Number((spent.total * 10000n) / profile.budget.totalLimit) / 100
      : 0;
    const dailyPct = profile.budget.dailyLimit > 0n
      ? Number((spent.today * 10000n) / profile.budget.dailyLimit) / 100
      : 0;

    const threshold = profile.budget.alertThreshold ?? 0.8;
    const alert = totalPct / 100 >= threshold || dailyPct / 100 >= threshold;

    let alertMessage: string | undefined;
    if (dailyPct / 100 >= threshold) {
      alertMessage = `Daily budget ${dailyPct.toFixed(1)}% used (threshold: ${(threshold * 100).toFixed(0)}%)`;
    } else if (totalPct / 100 >= threshold) {
      alertMessage = `Total budget ${totalPct.toFixed(1)}% used (threshold: ${(threshold * 100).toFixed(0)}%)`;
    }

    return {
      id: agentId,
      name: profile.name,
      address: this.getAgentAddress(agentId),
      budget: profile.budget,
      spent,
      remaining: {
        total: remainingTotal > 0n ? remainingTotal : 0n,
        today: remainingDaily > 0n ? remainingDaily : 0n,
      },
      usagePercent: { total: totalPct, daily: dailyPct },
      alert,
      alertMessage,
    };
  }

  listAgents(): AgentProfile[] {
    return Array.from(this.agents.values());
  }

  getAllStatuses(): AgentStatus[] {
    return this.listAgents().map((a) => this.getStatus(a.id));
  }

  removeAgent(agentId: string): boolean {
    this.clients.delete(agentId);
    return this.agents.delete(agentId);
  }

  private deriveKey(agentId: string): string {
    const masterBytes = Buffer.from(this.masterKey, "base64");
    const hmac = createHmac("sha512", masterBytes);
    hmac.update(`swyftpay-agent:${agentId}`);
    const derived = hmac.digest();

    const seed = derived.slice(0, 32);
    const account = algosdk.mnemonicToSecretKey(
      algosdk.secretKeyToMnemonic(new Uint8Array([...seed, ...new Uint8Array(32)])),
    );

    return Buffer.from(account.sk).toString("base64");
  }

  private calculateSpend(records: PaymentRecord[]): { total: bigint; today: bigint } {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    let total = 0n;
    let today = 0n;

    for (const r of records) {
      if (!r.txId || r.simulated) continue;
      const amount = this.parseAmount(r.amount);
      total += amount;
      if (r.timestamp >= todayISO) {
        today += amount;
      }
    }

    return { total, today };
  }

  private parseAmount(amount: string): bigint {
    if (amount === "paid") return 1000n;
    const num = parseInt(amount, 10);
    return isNaN(num) ? 0n : BigInt(num);
  }
}
