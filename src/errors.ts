/** FATAL vs RECOVERABLE errors for retry decisions. */

export type ErrorSeverity = "FATAL" | "RECOVERABLE";

export class SwyftPayError extends Error {
  readonly code: string;
  readonly severity: ErrorSeverity;
  readonly retryable: boolean;
  readonly details: Record<string, unknown>;
  readonly cause?: Error;

  constructor(params: {
    code: string;
    message: string;
    severity: ErrorSeverity;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(params.message);
    this.name = "SwyftPayError";
    this.code = params.code;
    this.severity = params.severity;
    this.retryable = params.severity === "RECOVERABLE";
    this.details = params.details ?? {};
    this.cause = params.cause;
  }
}

export const ErrorCodes = {
  PAYMENT_LOOP: "PAYMENT_LOOP",
  NETWORK_ERROR: "NETWORK_ERROR",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  FACILITATOR_ERROR: "FACILITATOR_ERROR",
  TIMEOUT: "TIMEOUT",
  POLICY_VIOLATION: "POLICY_VIOLATION",
  INVALID_CONFIG: "INVALID_CONFIG",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** Map thrown values to SwyftPayError with FATAL or RECOVERABLE. */
export function classifyError(err: unknown, endpoint: string): SwyftPayError {
  if (err instanceof SwyftPayError) return err;

  const error = err instanceof Error ? err : new Error(String(err));
  const message = error.message.toLowerCase();

  if (
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("econnreset") ||
    message.includes("socket hang up") ||
    message.includes("network")
  ) {
    return new SwyftPayError({
      code: ErrorCodes.NETWORK_ERROR,
      message: `Network error calling ${endpoint}: ${error.message}`,
      severity: "RECOVERABLE",
      details: { endpoint, originalMessage: error.message },
      cause: error,
    });
  }

  if (
    message.includes("timeout") ||
    message.includes("timedout") ||
    message.includes("etimedout") ||
    message.includes("abort")
  ) {
    return new SwyftPayError({
      code: ErrorCodes.TIMEOUT,
      message: `Request timed out for ${endpoint}: ${error.message}`,
      severity: "RECOVERABLE",
      details: { endpoint, originalMessage: error.message },
      cause: error,
    });
  }

  if (
    message.includes("facilitator") ||
    message.includes("settlement") ||
    message.includes("verify")
  ) {
    return new SwyftPayError({
      code: ErrorCodes.FACILITATOR_ERROR,
      message: `Facilitator error for ${endpoint}: ${error.message}`,
      severity: "RECOVERABLE",
      details: { endpoint, originalMessage: error.message },
      cause: error,
    });
  }

  if (message.includes("payment") || message.includes("sign")) {
    return new SwyftPayError({
      code: ErrorCodes.PAYMENT_FAILED,
      message: `Payment failed for ${endpoint}: ${error.message}`,
      severity: "FATAL",
      details: { endpoint, originalMessage: error.message },
      cause: error,
    });
  }

  return new SwyftPayError({
    code: ErrorCodes.UNKNOWN,
    message: `Unexpected error calling ${endpoint}: ${error.message}`,
    severity: "RECOVERABLE",
    details: { endpoint, originalMessage: error.message },
    cause: error,
  });
}
