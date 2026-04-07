// SwyftPayError and classifyError.
import { describe, it, expect } from "vitest";
import { SwyftPayError, ErrorCodes, classifyError } from "../src/errors.js";

describe("SwyftPayError", () => {
  it("sets all fields correctly", () => {
    const err = new SwyftPayError({
      code: ErrorCodes.NETWORK_ERROR,
      message: "connection refused",
      severity: "RECOVERABLE",
      details: { endpoint: "https://x.com" },
    });

    expect(err.code).toBe("NETWORK_ERROR");
    expect(err.severity).toBe("RECOVERABLE");
    expect(err.retryable).toBe(true);
    expect(err.message).toBe("connection refused");
    expect(err.details.endpoint).toBe("https://x.com");
    expect(err.name).toBe("SwyftPayError");
  });

  it("FATAL errors are not retryable", () => {
    const err = new SwyftPayError({
      code: ErrorCodes.PAYMENT_FAILED,
      message: "sign failed",
      severity: "FATAL",
    });
    expect(err.retryable).toBe(false);
  });
});

describe("classifyError", () => {
  it("returns existing SwyftPayError unchanged", () => {
    const original = new SwyftPayError({
      code: ErrorCodes.PAYMENT_LOOP,
      message: "loop",
      severity: "FATAL",
    });
    expect(classifyError(original, "https://x.com")).toBe(original);
  });

  it("classifies ECONNREFUSED as NETWORK_ERROR / RECOVERABLE", () => {
    const err = classifyError(new Error("connect ECONNREFUSED 127.0.0.1:4021"), "https://x.com");
    expect(err.code).toBe(ErrorCodes.NETWORK_ERROR);
    expect(err.severity).toBe("RECOVERABLE");
  });

  it("classifies fetch failed as NETWORK_ERROR", () => {
    const err = classifyError(new Error("fetch failed"), "https://x.com");
    expect(err.code).toBe(ErrorCodes.NETWORK_ERROR);
  });

  it("classifies timeout as TIMEOUT / RECOVERABLE", () => {
    const err = classifyError(new Error("request ETIMEDOUT"), "https://x.com");
    expect(err.code).toBe(ErrorCodes.TIMEOUT);
    expect(err.severity).toBe("RECOVERABLE");
  });

  it("classifies abort as TIMEOUT", () => {
    const err = classifyError(new Error("The operation was aborted"), "https://x.com");
    expect(err.code).toBe(ErrorCodes.TIMEOUT);
  });

  it("classifies facilitator errors as RECOVERABLE", () => {
    const err = classifyError(new Error("facilitator settlement failed"), "https://x.com");
    expect(err.code).toBe(ErrorCodes.FACILITATOR_ERROR);
    expect(err.severity).toBe("RECOVERABLE");
  });

  it("classifies payment/sign errors as FATAL", () => {
    const err = classifyError(new Error("payment creation failed"), "https://x.com");
    expect(err.code).toBe(ErrorCodes.PAYMENT_FAILED);
    expect(err.severity).toBe("FATAL");
  });

  it("classifies unknown errors as RECOVERABLE", () => {
    const err = classifyError(new Error("something weird"), "https://x.com");
    expect(err.code).toBe(ErrorCodes.UNKNOWN);
    expect(err.severity).toBe("RECOVERABLE");
  });

  it("handles non-Error values", () => {
    const err = classifyError("string error", "https://x.com");
    expect(err).toBeInstanceOf(SwyftPayError);
    expect(err.message).toContain("string error");
  });
});
