// computeTrustScore / computeAllTrustScores.
import { describe, it, expect } from "vitest";
import { computeTrustScore, computeAllTrustScores } from "../src/trust.js";
import type { PaymentRecord } from "../src/types.js";

function makeRecord(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    timestamp: new Date().toISOString(),
    endpoint: "https://api.example.com/data",
    method: "GET",
    amount: "paid",
    network: "algorand:testnet",
    payTo: "ADDR",
    txId: "TX123",
    status: 200,
    correlationId: crypto.randomUUID(),
    attempts: 1,
    ...overrides,
  };
}

describe("computeTrustScore", () => {
  it("returns grade C with NO_DATA flag for unknown endpoint", () => {
    const report = computeTrustScore([], "https://unknown.com/api");
    expect(report.score).toBe(50);
    expect(report.grade).toBe("C");
    expect(report.flags).toContain("NO_DATA");
  });

  it("scores highly for consistent successful payments", () => {
    const records = Array.from({ length: 10 }, () =>
      makeRecord({ status: 200, txId: "TX", attempts: 1 }),
    );
    const report = computeTrustScore(records, "https://api.example.com/data");
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.grade).toBe("A");
    expect(report.flags).toHaveLength(0);
  });

  it("penalizes failures after payment", () => {
    const records = [
      makeRecord({ status: 200, txId: "TX1" }),
      makeRecord({ status: 500, txId: "TX2" }),
      makeRecord({ status: 200, txId: "TX3" }),
    ];
    const report = computeTrustScore(records, "https://api.example.com/data");
    expect(report.score).toBeLessThan(90);
    expect(report.flags).toContain("FAILURES_AFTER_PAYMENT");
  });

  it("penalizes high retry counts", () => {
    const records = Array.from({ length: 5 }, () =>
      makeRecord({ status: 200, txId: "TX", attempts: 4 }),
    );
    const report = computeTrustScore(records, "https://api.example.com/data");
    expect(report.flags).toContain("HIGH_RETRY_COUNT");
  });

  it("flags endpoints that never succeed after payment", () => {
    const records = Array.from({ length: 3 }, () =>
      makeRecord({ status: 402, txId: "TX" }),
    );
    const report = computeTrustScore(records, "https://api.example.com/data");
    expect(report.successRate).toBe(0);
    expect(report.flags).toContain("NEVER_SUCCEEDS_AFTER_PAYMENT");
    expect(report.flags).toContain("LOW_SUCCESS_RATE");
  });

  it("normalizes URLs (ignores query strings)", () => {
    const records = [
      makeRecord({ endpoint: "https://api.com/data?key=1", status: 200, txId: "TX" }),
      makeRecord({ endpoint: "https://api.com/data?key=2", status: 200, txId: "TX" }),
    ];
    const report = computeTrustScore(records, "https://api.com/data?key=3");
    expect(report.totalRequests).toBe(2);
  });

  it("calculates correct success rate", () => {
    const records = [
      makeRecord({ status: 200, txId: "TX1" }),
      makeRecord({ status: 200, txId: "TX2" }),
      makeRecord({ status: 500, txId: "TX3" }),
      makeRecord({ status: 200, txId: "TX4" }),
    ];
    const report = computeTrustScore(records, "https://api.example.com/data");
    expect(report.successRate).toBe(0.75);
    expect(report.paidRequests).toBe(4);
    expect(report.successfulAfterPayment).toBe(3);
    expect(report.failedAfterPayment).toBe(1);
  });
});

describe("computeAllTrustScores", () => {
  it("returns reports for all unique endpoints, sorted by score", () => {
    const records = [
      makeRecord({ endpoint: "https://good.com/api", status: 200, txId: "TX" }),
      makeRecord({ endpoint: "https://good.com/api", status: 200, txId: "TX" }),
      makeRecord({ endpoint: "https://bad.com/api", status: 500, txId: "TX" }),
      makeRecord({ endpoint: "https://bad.com/api", status: 500, txId: "TX" }),
    ];

    const reports = computeAllTrustScores(records);
    expect(reports).toHaveLength(2);
    expect(reports[0].endpoint).toContain("good.com");
    expect(reports[0].score).toBeGreaterThan(reports[1].score);
  });

  it("handles empty records", () => {
    expect(computeAllTrustScores([])).toHaveLength(0);
  });
});
