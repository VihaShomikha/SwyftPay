// Live TestNet x402 tests; skipped without AVM_PRIVATE_KEY (real small USDC spends).
import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { existsSync, rmSync } from "node:fs";
import "dotenv/config";
import { SwyftPayClient, PolicyViolationError } from "../src/index.js";

const GOPLAUSIBLE_WEATHER = "https://example.x402.goplausible.xyz/avm/weather";
const LOG_FILE = resolve("logs/integration-test.jsonl");

const privateKey = process.env.AVM_PRIVATE_KEY;
const hasKey = !!privateKey;

describe.skipIf(!hasKey)("SwyftPayClient (Algorand TestNet)", () => {
  let client: SwyftPayClient;

  beforeAll(() => {
    if (existsSync(LOG_FILE)) rmSync(LOG_FILE);

    client = new SwyftPayClient({
      avmPrivateKey: privateKey!,
      algodUrl:
        process.env.ALGOD_TESTNET_URL ?? "https://testnet-api.algonode.cloud",
      spendPolicy: {
        maxAmountPerRequest: BigInt(50_000),
        allowedHosts: ["*.goplausible.xyz"],
        allowedAssets: [10458941],
      },
      logFilePath: LOG_FILE,
      retry: { maxRetries: 2, initialDelayMs: 200, jitter: false },
      maxPaymentLoopCount: 3,
    });
  });

  it("has a valid Algorand address", () => {
    expect(client.address).toMatch(/^[A-Z2-7]{58}$/);
  });

  it("completes x402 payment and gets 200", async () => {
    const res = await client.get(GOPLAUSIBLE_WEATHER);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("report");
  });

  it("records the payment in memory", () => {
    const records = client.getRecords();
    expect(records.length).toBeGreaterThanOrEqual(1);

    const last = records[records.length - 1];
    expect(last.endpoint).toBe(GOPLAUSIBLE_WEATHER);
    expect(last.status).toBe(200);
    expect(last.txId).toBeTruthy();
    expect(last.attempts).toBe(1);
  });

  it("persists the payment to the log file", () => {
    const logRecords = client.readLogFile();
    expect(logRecords.length).toBeGreaterThanOrEqual(1);

    const last = logRecords[logRecords.length - 1];
    expect(last.txId).toBeTruthy();
  });

  it("query returns paid records", () => {
    const paid = client.queryLog({ paidOnly: true });
    expect(paid.length).toBeGreaterThanOrEqual(1);
    expect(paid.every((r) => r.txId !== undefined)).toBe(true);
  });

  it("blocks unauthorized host via policy", async () => {
    await expect(
      client.get("https://unauthorized.example.com/data"),
    ).rejects.toThrow(PolicyViolationError);
  });

  it("clears in-memory records", () => {
    client.clearRecords();
    expect(client.getRecords()).toHaveLength(0);
  });
});
