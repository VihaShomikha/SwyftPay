// Demo retries, error types, and payment-loop guard (npm run demo:retry).
import "dotenv/config";
import { resolve } from "node:path";
import { SwyftPayClient, SwyftPayError } from "../src/index.js";

const LOG_FILE = resolve("logs/retry-demo.jsonl");

const GOPLAUSIBLE_WEATHER =
  "https://example.x402.goplausible.xyz/avm/weather";

async function main() {
  const privateKey = process.env.AVM_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: AVM_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  SwyftPay — Retry & Error Handling Demo          ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const client = new SwyftPayClient({
    avmPrivateKey: privateKey,
    algodUrl:
      process.env.ALGOD_TESTNET_URL ?? "https://testnet-api.algonode.cloud",
    spendPolicy: {
      allowedHosts: ["*.goplausible.xyz", "localhost"],
      maxAmountPerRequest: BigInt(10_000),
      allowedAssets: [10458941],
    },
    logFilePath: LOG_FILE,
    retry: {
      maxRetries: 2,
      initialDelayMs: 300,
      backoffMultiplier: 2.0,
      jitter: true,
    },
    maxPaymentLoopCount: 2,
  });

  console.log(`[SwyftPay] Address: ${client.address}`);
  console.log(`[SwyftPay] Log:     ${LOG_FILE}\n`);

  // ── 1. Successful request with retry config active ──
  console.log("── Test 1: Successful x402 payment (should succeed on first attempt) ──");
  try {
    const res = await client.get(GOPLAUSIBLE_WEATHER);
    console.log(`  Status: ${res.status}`);
    if (res.status === 200) {
      console.log("  Body:", await res.json());
    }
  } catch (err) {
    logError(err);
  }

  // ── 2. Network error with retry (unreachable host) ──
  console.log("\n── Test 2: Network failure with exponential backoff ──");
  console.log("  (Calling unreachable host — expect 3 attempts then FATAL)");
  try {
    await client.get("https://localhost:19999/unreachable");
  } catch (err) {
    logError(err);
  }

  // ── 3. Payment loop detection ──
  console.log("\n── Test 3: Payment loop detection ──");
  console.log("  (maxPaymentLoopCount = 2 — would halt after 2 consecutive payments to same endpoint)");
  console.log("  This is a safety mechanism. In normal operation, a single payment resolves the 402.");
  console.log("  If a server kept returning 402 after payment, SwyftPay would halt with PAYMENT_LOOP.");

  // ── 4. Review logged records ──
  console.log("\n── Payment records with retry data ──");
  const records = client.getRecords();
  for (const r of records) {
    console.log(`  ${r.timestamp} | ${r.method} ${r.endpoint}`);
    console.log(`    status=${r.status} | txId=${r.txId ?? "none"} | attempts=${r.attempts ?? 1}`);
  }

  console.log("\nDone.");
}

function logError(err: unknown): void {
  if (err instanceof SwyftPayError) {
    console.log(`  SwyftPayError: [${err.code}] ${err.severity}`);
    console.log(`  Message: ${err.message}`);
    if (err.details.attempts) {
      console.log(`  Attempts: ${err.details.attempts}`);
    }
  } else if (err instanceof Error) {
    console.log(`  Error: ${err.message}`);
  } else {
    console.log(`  Unknown error:`, err);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
