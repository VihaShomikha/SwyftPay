import type { SpendPolicy } from "./types.js";

export class PolicyViolationError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "PolicyViolationError";
    this.code = code;
    this.details = details;
  }
}

export class SpendPolicyEngine {
  private policy: Required<SpendPolicy>;

  constructor(policy: SpendPolicy) {
    this.policy = {
      maxAmountPerRequest: policy.maxAmountPerRequest ?? BigInt(0),
      allowedHosts: policy.allowedHosts ?? [],
      allowedAssets: policy.allowedAssets ?? [],
    };
  }

  enforce(params: {
    amount: string | bigint;
    endpoint: string;
    assetId?: string | number;
  }): void {
    this.checkAmount(params.amount);
    this.checkHost(params.endpoint);
    this.checkAsset(params.assetId);
  }

  private checkAmount(amount: string | bigint): void {
    if (this.policy.maxAmountPerRequest === BigInt(0)) return;

    const value = typeof amount === "string" ? BigInt(amount) : amount;
    if (value > this.policy.maxAmountPerRequest) {
      throw new PolicyViolationError(
        "MAX_AMOUNT_EXCEEDED",
        `Payment amount ${value} exceeds policy limit of ${this.policy.maxAmountPerRequest}`,
        {
          requested: value.toString(),
          limit: this.policy.maxAmountPerRequest.toString(),
        },
      );
    }
  }

  private checkHost(endpoint: string): void {
    if (this.policy.allowedHosts.length === 0) return;

    let hostname: string;
    try {
      hostname = new URL(endpoint).hostname;
    } catch {
      throw new PolicyViolationError(
        "INVALID_ENDPOINT",
        `Cannot parse hostname from endpoint: ${endpoint}`,
        { endpoint },
      );
    }

    const allowed = this.policy.allowedHosts.some((pattern) =>
      matchHostPattern(pattern, hostname),
    );

    if (!allowed) {
      throw new PolicyViolationError(
        "HOST_NOT_ALLOWED",
        `Host "${hostname}" is not in the allowed hosts list`,
        { hostname, allowedHosts: this.policy.allowedHosts },
      );
    }
  }

  private checkAsset(assetId?: string | number): void {
    if (this.policy.allowedAssets.length === 0) return;
    if (assetId === undefined) return;

    const id = typeof assetId === "string" ? parseInt(assetId, 10) : assetId;
    if (!this.policy.allowedAssets.includes(id)) {
      throw new PolicyViolationError(
        "ASSET_NOT_ALLOWED",
        `Asset ID ${id} is not in the allowed assets list`,
        { assetId: id, allowedAssets: this.policy.allowedAssets },
      );
    }
  }
}

/** Exact host, "*.suffix", or "*". */
function matchHostPattern(pattern: string, hostname: string): boolean {
  if (pattern === "*") return true;
  if (pattern === hostname) return true;

  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1);
    return hostname.endsWith(suffix) || hostname === pattern.slice(2);
  }

  return false;
}
