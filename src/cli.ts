#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import "dotenv/config";
import algosdk from "algosdk";
import { SwyftPayClient } from "./client.js";
import { TransactionLogger } from "./logger.js";
import { computeTrustScore, computeAllTrustScores } from "./trust.js";

const HELP = `
  swyftpay — Agentic x402 CLI

  COMMANDS
    fetch <url>       Make an x402-aware HTTP request (auto-pay on 402)
    simulate <url>    Dry-run: show what would be paid, don't sign
    logs              Query the payment log
    balance           Show wallet address and on-chain balances
    trust [url]       Show API trust scores (all endpoints, or one)

  OPTIONS (fetch / simulate)
    --method, -X      HTTP method (default: GET)
    --data, -d        Request body (JSON string)
    --header, -H      Custom header (key:value), repeatable

  OPTIONS (logs)
    --paid            Show only paid records
    --since <date>    Filter records since date (ISO string)
    --endpoint <url>  Filter by endpoint substring

  GLOBAL OPTIONS
    --log-file        Path to transaction log (default: logs/cli.jsonl)
    --help, -h        Show this help

  ENVIRONMENT
    AVM_PRIVATE_KEY   Base64-encoded 64-byte Algorand private key (required)
    ALGOD_TESTNET_URL Algorand TestNet API (default: https://testnet-api.algonode.cloud)

  EXAMPLES
    swyftpay fetch https://example.x402.goplausible.xyz/avm/weather
    swyftpay simulate https://example.x402.goplausible.xyz/avm/weather
    swyftpay logs --paid
    swyftpay balance
    swyftpay trust
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h", default: false },
      method: { type: "string", short: "X", default: "GET" },
      data: { type: "string", short: "d" },
      header: { type: "string", short: "H", multiple: true },
      paid: { type: "boolean", default: false },
      since: { type: "string" },
      endpoint: { type: "string" },
      "log-file": { type: "string", default: "logs/cli.jsonl" },
      "dry-run": { type: "boolean", default: false },
    },
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP);
    return;
  }

  const command = positionals[0];
  const target = positionals[1];
  const logFile = resolve(values["log-file"] as string);

  switch (command) {
    case "fetch":
      return cmdFetch(target, logFile, values, false);
    case "simulate":
      return cmdFetch(target, logFile, values, true);
    case "logs":
      return cmdLogs(logFile, values);
    case "balance":
      return cmdBalance();
    case "trust":
      return cmdTrust(logFile, target);
    default:
      console.error(`Unknown command: ${command}\nRun 'swyftpay --help' for usage.`);
      process.exit(1);
  }
}

async function cmdFetch(
  url: string | undefined,
  logFile: string,
  values: Record<string, unknown>,
  simulate: boolean,
): Promise<void> {
  if (!url) {
    console.error("Usage: swyftpay fetch <url>");
    process.exit(1);
  }

  const privateKey = requireKey();
  const isDryRun = simulate || (values["dry-run"] as boolean);

  const client = new SwyftPayClient({
    avmPrivateKey: privateKey,
    algodUrl: process.env.ALGOD_TESTNET_URL ?? "https://testnet-api.algonode.cloud",
    logFilePath: logFile,
    simulationMode: isDryRun,
    retry: { maxRetries: 2, initialDelayMs: 300 },
    maxPaymentLoopCount: 3,
  });

  const method = (values.method as string).toUpperCase();
  const headers: Record<string, string> = {};
  if (values.header) {
    for (const h of values.header as string[]) {
      const idx = h.indexOf(":");
      if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    }
  }

  console.log(`${isDryRun ? "[SIMULATION] " : ""}${method} ${url}`);
  console.log(`Wallet: ${client.address}`);
  console.log();

  const init: RequestInit = { method, headers };
  if (values.data) {
    init.body = values.data as string;
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  }

  try {
    const res = await client.request(url, init);
    console.log(`Status: ${res.status}`);

    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("json")) {
      const body = await res.json();
      console.log(JSON.stringify(body, null, 2));
    } else {
      console.log(await res.text());
    }

    if (isDryRun) {
      const records = client.getRecords();
      const last = records[records.length - 1];
      if (last?.simulated) {
        console.log(`\nSimulation: would have paid ${last.amount} to ${last.payTo} on ${last.network}`);
      }
    }

    const records = client.getRecords();
    const last = records[records.length - 1];
    if (last?.txId) {
      console.log(`\nTransaction: https://allo.info/tx/${last.txId}`);
    }
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function cmdLogs(logFile: string, values: Record<string, unknown>): void {
  const logger = new TransactionLogger(logFile);
  const records = logger.query({
    paidOnly: values.paid as boolean | undefined,
    since: values.since as string | undefined,
    endpoint: values.endpoint as string | undefined,
  });

  if (records.length === 0) {
    console.log("No records found.");
    return;
  }

  console.log(`Found ${records.length} record(s):\n`);

  const rows = records.map((r) => ({
    Time: r.timestamp.slice(0, 19),
    Method: r.method,
    Endpoint: truncate(r.endpoint, 50),
    Status: r.status,
    Amount: r.amount,
    TxID: r.txId ? truncate(r.txId, 12) : (r.simulated ? "simulated" : "—"),
    Attempts: r.attempts ?? 1,
  }));
  console.table(rows);
}

async function cmdBalance(): Promise<void> {
  const privateKey = requireKey();
  const keyBytes = Buffer.from(privateKey, "base64");
  const address = algosdk.encodeAddress(keyBytes.slice(32));
  const algodUrl = process.env.ALGOD_TESTNET_URL ?? "https://testnet-api.algonode.cloud";

  console.log(`Address: ${address}`);
  console.log(`Network: Algorand TestNet`);
  console.log(`Algod:   ${algodUrl}\n`);

  try {
    const client = new algosdk.Algodv2("", algodUrl, "");
    const info = await client.accountInformation(address).do();
    const algoBalance = Number(info.amount) / 1_000_000;
    console.log(`ALGO:    ${algoBalance.toFixed(6)}`);

    const assets = info.assets ?? [];
    for (const asset of assets) {
      const assetId = asset.assetId;
      const amount = asset.amount;
      if (Number(assetId) === 10458941) {
        console.log(`USDC:    ${(Number(amount) / 1_000_000).toFixed(6)} (ASA 10458941)`);
      } else {
        console.log(`ASA ${assetId}: ${amount}`);
      }
    }

    if (assets.length === 0) {
      console.log("No ASA holdings. Opt into TestNet USDC (ASA 10458941) via Pera Wallet.");
    }
  } catch (err) {
    console.error("Failed to fetch account info:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function cmdTrust(logFile: string, endpoint?: string): void {
  const logger = new TransactionLogger(logFile);
  const records = logger.readAll();

  if (records.length === 0) {
    console.log("No payment history. Make some requests first.");
    return;
  }

  if (endpoint) {
    const report = computeTrustScore(records, endpoint);
    printTrustReport(report);
  } else {
    const reports = computeAllTrustScores(records);
    console.log(`Trust scores for ${reports.length} endpoint(s):\n`);
    const rows = reports.map((r) => ({
      Endpoint: truncate(r.endpoint, 45),
      Score: `${r.score}/100`,
      Grade: r.grade,
      "Success Rate": `${Math.round(r.successRate * 100)}%`,
      Requests: r.totalRequests,
      Paid: r.paidRequests,
      Flags: r.flags.join(", ") || "—",
    }));
    console.table(rows);
  }
}

function printTrustReport(r: import("./trust.js").TrustReport): void {
  console.log(`Trust Report: ${r.endpoint}\n`);
  console.log(`  Score:           ${r.score}/100 (${r.grade})`);
  console.log(`  Total requests:  ${r.totalRequests}`);
  console.log(`  Paid requests:   ${r.paidRequests}`);
  console.log(`  Success rate:    ${Math.round(r.successRate * 100)}%`);
  console.log(`  Avg attempts:    ${r.averageAttempts}`);
  console.log(`  Flags:           ${r.flags.length > 0 ? r.flags.join(", ") : "none"}`);
}

function requireKey(): string {
  const key = process.env.AVM_PRIVATE_KEY;
  if (!key) {
    console.error("Error: AVM_PRIVATE_KEY not set in environment or .env file.");
    console.error("Run 'npm run key:convert' to derive it from your mnemonic.");
    process.exit(1);
  }
  return key;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
