// Demo: x402 pay flow vs GoPlausible and optional local server (npm run dev:client).
import "dotenv/config";
import { SwyftPayClient } from "../src/index.js";

const GOPLAUSIBLE_WEATHER =
  "https://example.x402.goplausible.xyz/avm/weather";
const GOPLAUSIBLE_PROTECTED =
  "https://example.x402.goplausible.xyz/avm/protected";

async function main() {
  const privateKey = process.env.AVM_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: AVM_PRIVATE_KEY not set in .env");
    console.error("Run: npm run key:convert");
    process.exit(1);
  }

  const client = new SwyftPayClient({
    avmPrivateKey: privateKey,
    algodUrl:
      process.env.ALGOD_TESTNET_URL ?? "https://testnet-api.algonode.cloud",
  });

  console.log(`\n[SwyftPay] Address: ${client.address}`);
  console.log(`[SwyftPay] Network: Algorand TestNet\n`);

  // ── 1. x402 API — GoPlausible /avm/weather ($0.001) ──
  console.log("═══ x402 API: GoPlausible /avm/weather ($0.001) ═══");
  try {
    const weather = await client.get(GOPLAUSIBLE_WEATHER);
    console.log(`  Status: ${weather.status}`);
    const contentType = weather.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      console.log("  Body:", await weather.json());
    } else {
      const text = await weather.text();
      console.log("  Body:", text.slice(0, 200));
    }
  } catch (err) {
    console.error("  Failed:", err instanceof Error ? err.message : err);
  }

  // ── 2. x402 API — GoPlausible /avm/protected ($0.001) ──
  console.log("\n═══ x402 API: GoPlausible /avm/protected ($0.001) ═══");
  try {
    const page = await client.get(GOPLAUSIBLE_PROTECTED);
    console.log(`  Status: ${page.status}`);
    const text = await page.text();
    console.log("  Body (first 200 chars):", text.slice(0, 200));
  } catch (err) {
    console.error("  Failed:", err instanceof Error ? err.message : err);
  }

  // ── 3. Local test server (optional) ──
  const localUrl = `http://localhost:${process.env.PORT ?? "4021"}`;
  console.log(`\n═══ Local server: ${localUrl} ═══`);
  try {
    const health = await client.get(`${localUrl}/api/health`);
    console.log(`  Health: ${health.status}`, await health.json());

    const weather = await client.get(`${localUrl}/api/weather/london`);
    console.log(`  Weather: ${weather.status}`, await weather.json());
  } catch {
    console.log("  (skipped — not running. Start with: npm run dev:server)");
  }

  // ── 4. Payment records ──
  console.log("\n═══ Payment records ═══");
  const records = client.getRecords();
  if (records.length === 0) {
    console.log("  No records.");
  } else {
    for (const r of records) {
      console.log(`  ${r.timestamp} | ${r.method} ${r.endpoint}`);
      console.log(`    status=${r.status} | txId=${r.txId ?? "none"}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
