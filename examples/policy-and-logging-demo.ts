// Demo policy engine + JSON Lines log + queries (npm run demo:policy).
import "dotenv/config";
import { resolve } from "node:path";
import { SwyftPayClient, PolicyViolationError } from "../src/index.js";

const LOG_FILE = resolve("logs/transactions.jsonl");

const GOPLAUSIBLE_WEATHER =
  "https://example.x402.goplausible.xyz/avm/weather";

async function main() {
  const privateKey = process.env.AVM_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: AVM_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  SwyftPay — Policy & Logging Demo               ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── 1. Client WITH policy + logging ──
  // Policy: max $0.01 per request, only GoPlausible hosts, only USDC (ASA 10458941)
  const client = new SwyftPayClient({
    avmPrivateKey: privateKey,
    algodUrl:
      process.env.ALGOD_TESTNET_URL ?? "https://testnet-api.algonode.cloud",
    spendPolicy: {
      maxAmountPerRequest: BigInt(10_000),      // $0.01 USDC = 10,000 micro-units
      allowedHosts: ["*.goplausible.xyz"],       // only GoPlausible endpoints
      allowedAssets: [10458941],                  // only TestNet USDC
    },
    logFilePath: LOG_FILE,
  });

  console.log(`[SwyftPay] Address: ${client.address}`);
  console.log(`[SwyftPay] Log:     ${LOG_FILE}\n`);

  // ── 2. Allowed request — should succeed ──
  console.log("── Test 1: Allowed request (GoPlausible weather, $0.001) ──");
  try {
    const res = await client.get(GOPLAUSIBLE_WEATHER);
    console.log(`  Status: ${res.status}`);
    if (res.status === 200) {
      console.log("  Body:", await res.json());
    }
  } catch (err) {
    if (err instanceof PolicyViolationError) {
      console.log(`  BLOCKED by policy: [${err.code}] ${err.message}`);
    } else {
      console.error("  Error:", err instanceof Error ? err.message : err);
    }
  }

  // ── 3. Blocked by host policy — random host ──
  console.log("\n── Test 2: Blocked host (https://random-api.example.com) ──");
  try {
    await client.get("https://random-api.example.com/data");
    console.log("  (unexpected: request went through)");
  } catch (err) {
    if (err instanceof PolicyViolationError) {
      console.log(`  BLOCKED by policy: [${err.code}] ${err.message}`);
    } else {
      // Network errors from the blocked host are also expected
      console.log("  Request did not complete (host not in allowlist or unreachable)");
    }
  }

  // ── 4. Query the persistent log ──
  console.log("\n── Persistent log records ──");
  const allRecords = client.readLogFile();
  console.log(`  Total records in ${LOG_FILE}: ${allRecords.length}`);
  for (const r of allRecords.slice(-5)) {
    console.log(`  ${r.timestamp} | ${r.method} ${r.endpoint} | status=${r.status} | txId=${r.txId ?? "none"}`);
  }

  // ── 5. Query with filter ──
  console.log("\n── Query: paid requests only ──");
  const paid = client.queryLog({ paidOnly: true });
  console.log(`  Paid records: ${paid.length}`);
  for (const r of paid.slice(-3)) {
    console.log(`  ${r.timestamp} | ${r.endpoint} | txId=${r.txId}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
