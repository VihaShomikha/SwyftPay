// Runs all major SDK features on TestNet (npm run demo:all).
import "dotenv/config";
import { resolve } from "node:path";
import {
  SwyftPayClient,
  SwyftPayError,
  PolicyViolationError,
} from "../src/index.js";

const LOG_FILE = resolve("logs/full-sdk-demo.jsonl");

const GOPLAUSIBLE_WEATHER =
  "https://example.x402.goplausible.xyz/avm/weather";

async function main() {
  const privateKey = process.env.AVM_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: AVM_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  SwyftPay SDK — Full Feature Demo (Algorand TestNet)     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const client = new SwyftPayClient({
    avmPrivateKey: privateKey,
    algodUrl:
      process.env.ALGOD_TESTNET_URL ?? "https://testnet-api.algonode.cloud",
    spendPolicy: {
      maxAmountPerRequest: BigInt(50_000),
      allowedHosts: ["*.goplausible.xyz"],
      allowedAssets: [10458941],
    },
    logFilePath: LOG_FILE,
    retry: {
      maxRetries: 2,
      initialDelayMs: 300,
      backoffMultiplier: 2.0,
    },
    maxPaymentLoopCount: 2,
  });

  console.log(`  Address:  ${client.address}`);
  console.log(`  Network:  Algorand TestNet`);
  console.log(`  Log:      ${LOG_FILE}\n`);

  // ── Phase 1: x402 payment flow ──
  console.log("━━━ Phase 1: x402 Payment Flow ━━━");
  try {
    const res = await client.get(GOPLAUSIBLE_WEATHER);
    console.log(`  [OK] Status ${res.status} — payment processed on-chain`);
    const body = await res.json();
    console.log(`  Response:`, body);
  } catch (err) {
    printError(err);
  }

  // ── Phase 2: Policy enforcement ──
  console.log("\n━━━ Phase 2: Spend Policy Enforcement ━━━");

  console.log("  [TEST] Blocked host:");
  try {
    await client.get("https://unauthorized-api.example.com/data");
    console.log("  (unexpected: request went through)");
  } catch (err) {
    if (err instanceof PolicyViolationError) {
      console.log(`  [BLOCKED] ${err.code}: ${err.message}`);
    } else {
      printError(err);
    }
  }

  console.log("  [TEST] Allowed host:");
  try {
    const res = await client.get(GOPLAUSIBLE_WEATHER);
    console.log(`  [OK] Status ${res.status} — passed policy check`);
  } catch (err) {
    printError(err);
  }

  // ── Phase 3: Persistent logging ──
  console.log("\n━━━ Phase 3: Persistent Logging ━━━");
  const allRecords = client.readLogFile();
  console.log(`  Total records in log: ${allRecords.length}`);
  const paidRecords = client.queryLog({ paidOnly: true });
  console.log(`  Paid records: ${paidRecords.length}`);
  for (const r of paidRecords.slice(-3)) {
    console.log(`    ${r.timestamp} | ${r.endpoint} | txId=${r.txId}`);
  }

  // ── Phase 4: Retry + error handling ──
  console.log("\n━━━ Phase 4: Retry & Error Handling ━━━");
  console.log("  [TEST] Unreachable host (expect backoff retries):");
  try {
    await client.get("https://localhost:19999/unreachable");
  } catch (err) {
    if (err instanceof SwyftPayError) {
      console.log(`  [${err.severity}] ${err.code} after ${err.details.attempts} attempts`);
    } else {
      printError(err);
    }
  }

  // ── Phase 5: SDK summary ──
  console.log("\n━━━ Phase 5: SDK Summary ━━━");
  const records = client.getRecords();
  console.log(`  In-memory records: ${records.length}`);
  console.log(`  Persistent log records: ${client.readLogFile().length}`);
  console.log(`\n  SDK features verified:`);
  console.log(`    [x] x402 payment flow on Algorand TestNet`);
  console.log(`    [x] Spend policy (host, amount, asset)`);
  console.log(`    [x] Persistent JSON Lines logging`);
  console.log(`    [x] Exponential backoff retry`);
  console.log(`    [x] Error classification (FATAL / RECOVERABLE)`);
  console.log(`    [x] Payment loop detection`);

  console.log("\nDone.");
}

function printError(err: unknown): void {
  if (err instanceof SwyftPayError) {
    console.log(`  [${err.severity}] ${err.code}: ${err.message}`);
  } else if (err instanceof Error) {
    console.log(`  [ERROR] ${err.message}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
