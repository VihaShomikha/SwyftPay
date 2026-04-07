// TransactionLogger append/read/query.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { TransactionLogger } from "../src/logger.js";
import type { PaymentRecord } from "../src/types.js";

const TEST_LOG = resolve("logs/test-logger.jsonl");

function makeRecord(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    timestamp: new Date().toISOString(),
    endpoint: "https://example.com/api",
    method: "GET",
    amount: "paid",
    network: "algorand:testnet",
    payTo: "ADDR",
    txId: "TX123",
    status: 200,
    correlationId: crypto.randomUUID(),
    ...overrides,
  };
}

describe("TransactionLogger", () => {
  beforeEach(() => {
    if (existsSync(TEST_LOG)) rmSync(TEST_LOG);
  });

  afterEach(() => {
    if (existsSync(TEST_LOG)) rmSync(TEST_LOG);
  });

  it("creates log directory if missing", () => {
    const nested = resolve("logs/nested/deep/test.jsonl");
    new TransactionLogger(nested);
    // constructor should not throw
    if (existsSync(resolve("logs/nested"))) {
      rmSync(resolve("logs/nested"), { recursive: true });
    }
  });

  it("appends and reads records", () => {
    const logger = new TransactionLogger(TEST_LOG);
    const r1 = makeRecord({ endpoint: "https://a.com/1" });
    const r2 = makeRecord({ endpoint: "https://b.com/2" });

    logger.append(r1);
    logger.append(r2);

    const all = logger.readAll();
    expect(all).toHaveLength(2);
    expect(all[0].endpoint).toBe("https://a.com/1");
    expect(all[1].endpoint).toBe("https://b.com/2");
  });

  it("returns empty array for nonexistent file", () => {
    const logger = new TransactionLogger(resolve("logs/does-not-exist.jsonl"));
    expect(logger.readAll()).toEqual([]);
  });

  describe("query filters", () => {
    it("filters by endpoint substring", () => {
      const logger = new TransactionLogger(TEST_LOG);
      logger.append(makeRecord({ endpoint: "https://api.com/weather" }));
      logger.append(makeRecord({ endpoint: "https://api.com/premium" }));

      const results = logger.query({ endpoint: "weather" });
      expect(results).toHaveLength(1);
      expect(results[0].endpoint).toContain("weather");
    });

    it("filters by HTTP method", () => {
      const logger = new TransactionLogger(TEST_LOG);
      logger.append(makeRecord({ method: "GET" }));
      logger.append(makeRecord({ method: "POST" }));

      expect(logger.query({ method: "POST" })).toHaveLength(1);
    });

    it("filters by date range (since)", () => {
      const logger = new TransactionLogger(TEST_LOG);
      logger.append(makeRecord({ timestamp: "2026-01-01T00:00:00Z" }));
      logger.append(makeRecord({ timestamp: "2026-06-01T00:00:00Z" }));

      const results = logger.query({ since: "2026-04-01" });
      expect(results).toHaveLength(1);
      expect(results[0].timestamp).toBe("2026-06-01T00:00:00Z");
    });

    it("filters by paid-only", () => {
      const logger = new TransactionLogger(TEST_LOG);
      logger.append(makeRecord({ txId: "REAL_TX" }));
      logger.append(makeRecord({ txId: undefined }));

      const paid = logger.query({ paidOnly: true });
      expect(paid).toHaveLength(1);
      expect(paid[0].txId).toBe("REAL_TX");
    });

    it("combines multiple filters", () => {
      const logger = new TransactionLogger(TEST_LOG);
      logger.append(makeRecord({ method: "GET", endpoint: "https://a.com/weather", txId: "TX1" }));
      logger.append(makeRecord({ method: "POST", endpoint: "https://a.com/weather", txId: "TX2" }));
      logger.append(makeRecord({ method: "GET", endpoint: "https://a.com/premium", txId: undefined }));

      const results = logger.query({ method: "GET", endpoint: "weather", paidOnly: true });
      expect(results).toHaveLength(1);
      expect(results[0].txId).toBe("TX1");
    });
  });

  it("reports file path", () => {
    const logger = new TransactionLogger(TEST_LOG);
    expect(logger.getFilePath()).toBe(TEST_LOG);
  });
});
