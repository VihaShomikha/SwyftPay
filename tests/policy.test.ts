// SpendPolicyEngine rules and violations.
import { describe, it, expect } from "vitest";
import { SpendPolicyEngine, PolicyViolationError } from "../src/policy.js";

describe("SpendPolicyEngine", () => {
  describe("host matching", () => {
    const engine = new SpendPolicyEngine({
      allowedHosts: ["*.goplausible.xyz", "api.example.com"],
    });

    it("allows exact host match", () => {
      expect(() =>
        engine.enforce({ amount: "0", endpoint: "https://api.example.com/data" }),
      ).not.toThrow();
    });

    it("allows wildcard subdomain match", () => {
      expect(() =>
        engine.enforce({ amount: "0", endpoint: "https://example.x402.goplausible.xyz/avm/weather" }),
      ).not.toThrow();
    });

    it("allows bare domain from wildcard", () => {
      expect(() =>
        engine.enforce({ amount: "0", endpoint: "https://goplausible.xyz/path" }),
      ).not.toThrow();
    });

    it("blocks host not in allowlist", () => {
      expect(() =>
        engine.enforce({ amount: "0", endpoint: "https://evil.attacker.com/drain" }),
      ).toThrow(PolicyViolationError);
    });

    it("returns correct error code for blocked host", () => {
      try {
        engine.enforce({ amount: "0", endpoint: "https://blocked.com/x" });
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(PolicyViolationError);
        expect((e as PolicyViolationError).code).toBe("HOST_NOT_ALLOWED");
      }
    });

    it("returns error details with hostname and allowedHosts", () => {
      try {
        engine.enforce({ amount: "0", endpoint: "https://blocked.com/x" });
      } catch (e) {
        const err = e as PolicyViolationError;
        expect(err.details.hostname).toBe("blocked.com");
        expect(err.details.allowedHosts).toEqual(["*.goplausible.xyz", "api.example.com"]);
      }
    });
  });

  describe("amount limits", () => {
    const engine = new SpendPolicyEngine({
      maxAmountPerRequest: BigInt(10_000),
    });

    it("allows amount within limit", () => {
      expect(() =>
        engine.enforce({ amount: "1000", endpoint: "https://any.com/x" }),
      ).not.toThrow();
    });

    it("allows amount exactly at limit", () => {
      expect(() =>
        engine.enforce({ amount: "10000", endpoint: "https://any.com/x" }),
      ).not.toThrow();
    });

    it("blocks amount above limit", () => {
      expect(() =>
        engine.enforce({ amount: "10001", endpoint: "https://any.com/x" }),
      ).toThrow(PolicyViolationError);
    });

    it("returns MAX_AMOUNT_EXCEEDED code", () => {
      try {
        engine.enforce({ amount: BigInt(50_000), endpoint: "https://any.com/x" });
      } catch (e) {
        expect((e as PolicyViolationError).code).toBe("MAX_AMOUNT_EXCEEDED");
      }
    });
  });

  describe("asset allowlist", () => {
    const engine = new SpendPolicyEngine({
      allowedAssets: [10458941, 999],
    });

    it("allows permitted asset ID", () => {
      expect(() =>
        engine.enforce({ amount: "0", endpoint: "https://any.com/x", assetId: 10458941 }),
      ).not.toThrow();
    });

    it("allows string asset ID that parses to permitted", () => {
      expect(() =>
        engine.enforce({ amount: "0", endpoint: "https://any.com/x", assetId: "10458941" }),
      ).not.toThrow();
    });

    it("blocks asset ID not in allowlist", () => {
      expect(() =>
        engine.enforce({ amount: "0", endpoint: "https://any.com/x", assetId: 12345 }),
      ).toThrow(PolicyViolationError);
    });

    it("returns ASSET_NOT_ALLOWED code", () => {
      try {
        engine.enforce({ amount: "0", endpoint: "https://any.com/x", assetId: 12345 });
      } catch (e) {
        expect((e as PolicyViolationError).code).toBe("ASSET_NOT_ALLOWED");
      }
    });

    it("allows undefined asset (no check)", () => {
      expect(() =>
        engine.enforce({ amount: "0", endpoint: "https://any.com/x" }),
      ).not.toThrow();
    });
  });

  describe("empty policy (allow all)", () => {
    const engine = new SpendPolicyEngine({});

    it("allows any host", () => {
      expect(() =>
        engine.enforce({ amount: "0", endpoint: "https://anything.com/x" }),
      ).not.toThrow();
    });

    it("allows any amount", () => {
      expect(() =>
        engine.enforce({ amount: "999999999", endpoint: "https://any.com/x" }),
      ).not.toThrow();
    });

    it("allows any asset", () => {
      expect(() =>
        engine.enforce({ amount: "0", endpoint: "https://any.com/x", assetId: 99999 }),
      ).not.toThrow();
    });
  });

  describe("invalid input", () => {
    const engine = new SpendPolicyEngine({ allowedHosts: ["*.example.com"] });

    it("throws INVALID_ENDPOINT for unparseable URL", () => {
      try {
        engine.enforce({ amount: "0", endpoint: "not-a-url" });
      } catch (e) {
        expect((e as PolicyViolationError).code).toBe("INVALID_ENDPOINT");
      }
    });
  });
});
