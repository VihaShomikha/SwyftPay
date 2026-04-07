import { SwyftPayError, ErrorCodes, classifyError } from "./errors.js";

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;

  /** Initial delay in ms before first retry (default: 500) */
  initialDelayMs?: number;

  /** Multiplier applied to delay after each retry (default: 2.0) */
  backoffMultiplier?: number;

  /** Maximum delay in ms between retries (default: 10000) */
  maxDelayMs?: number;

  /** Add random jitter to prevent thundering herd (default: true) */
  jitter?: boolean;

  /** Timeout per individual request in ms (default: 30000) */
  requestTimeoutMs?: number;
}

const DEFAULTS: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 500,
  backoffMultiplier: 2.0,
  maxDelayMs: 10_000,
  jitter: true,
  requestTimeoutMs: 30_000,
};

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalDelayMs: number;
}

/** Retry on RECOVERABLE errors with exponential backoff and jitter. */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  endpoint: string,
  config?: RetryConfig,
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULTS, ...config };
  let lastError: SwyftPayError | null = null;
  let delay = opts.initialDelayMs;
  let totalDelay = 0;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const result = await operation(attempt);
      return { result, attempts: attempt + 1, totalDelayMs: totalDelay };
    } catch (err) {
      lastError = classifyError(err, endpoint);

      if (lastError.severity === "FATAL") {
        throw lastError;
      }

      if (attempt >= opts.maxRetries) {
        throw new SwyftPayError({
          code: ErrorCodes.NETWORK_ERROR,
          message: `All ${opts.maxRetries + 1} attempts failed for ${endpoint}. Last error: ${lastError.message}`,
          severity: "FATAL",
          details: {
            endpoint,
            attempts: attempt + 1,
            totalDelayMs: totalDelay,
            lastErrorCode: lastError.code,
          },
          cause: lastError,
        });
      }

      const jitter = opts.jitter ? Math.random() * delay * 0.3 : 0;
      const waitMs = Math.min(delay + jitter, opts.maxDelayMs);

      console.log(
        `[SwyftPay] Retry ${attempt + 1}/${opts.maxRetries} for ${endpoint} in ${Math.round(waitMs)}ms (${lastError.code})`,
      );

      await sleep(waitMs);
      totalDelay += waitMs;
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}

/** Throw FATAL if too many consecutive pays hit the same URL without finishing. */
export function detectPaymentLoop(
  consecutivePayments: number,
  maxConsecutive: number,
  endpoint: string,
): void {
  if (consecutivePayments >= maxConsecutive) {
    throw new SwyftPayError({
      code: ErrorCodes.PAYMENT_LOOP,
      message: `Payment loop detected: ${consecutivePayments} consecutive payments to ${endpoint} without success. Halting to prevent fund drain.`,
      severity: "FATAL",
      details: { endpoint, consecutivePayments, maxConsecutive },
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
