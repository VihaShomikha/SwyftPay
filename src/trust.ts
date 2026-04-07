import type { PaymentRecord } from "./types.js";

export interface TrustReport {
  endpoint: string;
  totalRequests: number;
  paidRequests: number;
  successfulAfterPayment: number;
  failedAfterPayment: number;
  successRate: number;
  averageAttempts: number;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  flags: string[];
}

/** Trust score 0-100 from payment history (success rate, retries, volume). */
export function computeTrustScore(records: PaymentRecord[], endpoint: string): TrustReport {
  const relevant = records.filter((r) => normalizeEndpoint(r.endpoint) === normalizeEndpoint(endpoint));

  if (relevant.length === 0) {
    return {
      endpoint,
      totalRequests: 0,
      paidRequests: 0,
      successfulAfterPayment: 0,
      failedAfterPayment: 0,
      successRate: 0,
      averageAttempts: 0,
      score: 50,
      grade: "C",
      flags: ["NO_DATA"],
    };
  }

  const paid = relevant.filter((r) => r.txId);
  const successfulPaid = paid.filter((r) => r.status >= 200 && r.status < 300);
  const failedPaid = paid.filter((r) => r.status >= 400);

  const successRate = paid.length > 0 ? successfulPaid.length / paid.length : 0;
  const avgAttempts = relevant.reduce((sum, r) => sum + (r.attempts ?? 1), 0) / relevant.length;

  const successComponent = successRate * 70;

  const retryPenalty = Math.min(avgAttempts - 1, 3) / 3;
  const consistencyComponent = (1 - retryPenalty) * 20;

  const volumeBonus = Math.min(relevant.length / 10, 1) * 10;

  let score = Math.round(successComponent + consistencyComponent + volumeBonus);
  score = Math.max(0, Math.min(100, score));

  const flags: string[] = [];
  if (failedPaid.length > 0) flags.push("FAILURES_AFTER_PAYMENT");
  if (avgAttempts > 2) flags.push("HIGH_RETRY_COUNT");
  if (successRate < 0.5 && paid.length >= 3) flags.push("LOW_SUCCESS_RATE");
  if (paid.length > 0 && successRate === 0) flags.push("NEVER_SUCCEEDS_AFTER_PAYMENT");

  return {
    endpoint,
    totalRequests: relevant.length,
    paidRequests: paid.length,
    successfulAfterPayment: successfulPaid.length,
    failedAfterPayment: failedPaid.length,
    successRate: Math.round(successRate * 100) / 100,
    averageAttempts: Math.round(avgAttempts * 100) / 100,
    score,
    grade: scoreToGrade(score),
    flags,
  };
}

/** Trust reports for every distinct endpoint, highest score first. */
export function computeAllTrustScores(records: PaymentRecord[]): TrustReport[] {
  const endpoints = new Set(records.map((r) => normalizeEndpoint(r.endpoint)));
  return Array.from(endpoints)
    .map((ep) => computeTrustScore(records, ep))
    .sort((a, b) => b.score - a.score);
}

function normalizeEndpoint(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}
