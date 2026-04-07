// withRetry and detectPaymentLoop.
import { describe, it, expect } from "vitest";
import { withRetry, detectPaymentLoop } from "../src/retry.js";
import { SwyftPayError, ErrorCodes } from "../src/errors.js";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const { result, attempts } = await withRetry(
      async () => "ok",
      "https://x.com",
      { maxRetries: 3 },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(1);
  });

  it("retries on RECOVERABLE error and succeeds", async () => {
    let call = 0;
    const { result, attempts } = await withRetry(
      async () => {
        call++;
        if (call < 3) throw new Error("fetch failed");
        return "recovered";
      },
      "https://x.com",
      { maxRetries: 3, initialDelayMs: 10, backoffMultiplier: 1, jitter: false },
    );
    expect(result).toBe("recovered");
    expect(attempts).toBe(3);
  });

  it("throws immediately on FATAL error (no retry)", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new SwyftPayError({
            code: ErrorCodes.PAYMENT_FAILED,
            message: "sign failed",
            severity: "FATAL",
          });
        },
        "https://x.com",
        { maxRetries: 3, initialDelayMs: 10 },
      ),
    ).rejects.toThrow("sign failed");
    expect(calls).toBe(1);
  });

  it("exhausts retries and throws FATAL after max attempts", async () => {
    await expect(
      withRetry(
        async () => {
          throw new Error("fetch failed");
        },
        "https://x.com",
        { maxRetries: 2, initialDelayMs: 10, backoffMultiplier: 1, jitter: false },
      ),
    ).rejects.toThrow(/All 3 attempts failed/);
  });

  it("tracks total delay", async () => {
    let call = 0;
    const { totalDelayMs } = await withRetry(
      async () => {
        call++;
        if (call < 2) throw new Error("fetch failed");
        return "ok";
      },
      "https://x.com",
      { maxRetries: 3, initialDelayMs: 50, backoffMultiplier: 1, jitter: false },
    );
    expect(totalDelayMs).toBeGreaterThanOrEqual(40);
  });
});

describe("detectPaymentLoop", () => {
  it("does nothing when count is below threshold", () => {
    expect(() => detectPaymentLoop(1, 3, "https://x.com")).not.toThrow();
    expect(() => detectPaymentLoop(2, 3, "https://x.com")).not.toThrow();
  });

  it("throws PAYMENT_LOOP at threshold", () => {
    expect(() => detectPaymentLoop(3, 3, "https://x.com")).toThrow(SwyftPayError);

    try {
      detectPaymentLoop(3, 3, "https://x.com");
    } catch (e) {
      const err = e as SwyftPayError;
      expect(err.code).toBe(ErrorCodes.PAYMENT_LOOP);
      expect(err.severity).toBe("FATAL");
      expect(err.details.consecutivePayments).toBe(3);
    }
  });

  it("throws above threshold", () => {
    expect(() => detectPaymentLoop(5, 3, "https://x.com")).toThrow();
  });
});
