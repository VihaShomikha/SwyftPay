// AgentWalletManager profiles and derivation.
import { describe, it, expect, beforeEach } from "vitest";
import { AgentWalletManager } from "../src/agents.js";
import type { AgentBudget } from "../src/agents.js";

const TEST_KEY =
  "qES+jwmPiUjVmfPg0YYhVb5G7aSjQT7FlqkFqGH/9txBqaiwv5l1MLGXBMN2VIDvfUFdif+RhS6hpBCVGHk33A==";

function makeBudget(overrides?: Partial<AgentBudget>): AgentBudget {
  return {
    totalLimit: 100_000_000n,
    dailyLimit: 10_000_000n,
    alertThreshold: 0.8,
    ...overrides,
  };
}

describe("AgentWalletManager", () => {
  let manager: AgentWalletManager;

  beforeEach(() => {
    manager = new AgentWalletManager(TEST_KEY);
  });

  it("creates an agent profile", () => {
    const profile = manager.createAgent("agent-1", "Weather Bot", makeBudget());
    expect(profile.id).toBe("agent-1");
    expect(profile.name).toBe("Weather Bot");
    expect(profile.budget.totalLimit).toBe(100_000_000n);
    expect(profile.createdAt).toBeTruthy();
  });

  it("rejects duplicate agent IDs", () => {
    manager.createAgent("dup", "Agent A", makeBudget());
    expect(() => manager.createAgent("dup", "Agent B", makeBudget())).toThrow(
      'Agent "dup" already exists',
    );
  });

  it("derives unique addresses per agent", () => {
    manager.createAgent("agent-a", "A", makeBudget());
    manager.createAgent("agent-b", "B", makeBudget());

    const addrA = manager.getAgentAddress("agent-a");
    const addrB = manager.getAgentAddress("agent-b");

    expect(addrA).toHaveLength(58);
    expect(addrB).toHaveLength(58);
    expect(addrA).not.toBe(addrB);
  });

  it("produces deterministic addresses for the same agent ID", () => {
    manager.createAgent("stable", "Stable", makeBudget());
    const addr1 = manager.getAgentAddress("stable");

    const manager2 = new AgentWalletManager(TEST_KEY);
    manager2.createAgent("stable", "Stable 2", makeBudget());
    const addr2 = manager2.getAgentAddress("stable");

    expect(addr1).toBe(addr2);
  });

  it("returns a SwyftPayClient for an agent", () => {
    manager.createAgent("cli-agent", "CLI Agent", makeBudget());
    const client = manager.getClient("cli-agent");
    expect(client).toBeTruthy();
    expect(client.address).toHaveLength(58);
  });

  it("throws when getting client for unknown agent", () => {
    expect(() => manager.getClient("nonexistent")).toThrow(
      'Agent "nonexistent" not found',
    );
  });

  it("lists all agents", () => {
    manager.createAgent("a", "Alpha", makeBudget());
    manager.createAgent("b", "Beta", makeBudget());
    manager.createAgent("c", "Gamma", makeBudget());

    const list = manager.listAgents();
    expect(list).toHaveLength(3);
    expect(list.map((a) => a.id)).toEqual(["a", "b", "c"]);
  });

  it("removes an agent", () => {
    manager.createAgent("temp", "Temporary", makeBudget());
    expect(manager.listAgents()).toHaveLength(1);

    const removed = manager.removeAgent("temp");
    expect(removed).toBe(true);
    expect(manager.listAgents()).toHaveLength(0);
  });

  it("returns false when removing nonexistent agent", () => {
    expect(manager.removeAgent("ghost")).toBe(false);
  });

  it("reports initial status with zero spend", () => {
    manager.createAgent("fresh", "Fresh Agent", makeBudget());
    const status = manager.getStatus("fresh");

    expect(status.id).toBe("fresh");
    expect(status.spent.total).toBe(0n);
    expect(status.spent.today).toBe(0n);
    expect(status.remaining.total).toBe(100_000_000n);
    expect(status.remaining.today).toBe(10_000_000n);
    expect(status.usagePercent.total).toBe(0);
    expect(status.usagePercent.daily).toBe(0);
    expect(status.alert).toBe(false);
  });

  it("returns all agent statuses", () => {
    manager.createAgent("x", "X", makeBudget());
    manager.createAgent("y", "Y", makeBudget());

    const statuses = manager.getAllStatuses();
    expect(statuses).toHaveLength(2);
    expect(statuses[0].id).toBe("x");
    expect(statuses[1].id).toBe("y");
  });

  it("each agent client has a different address than the master", () => {
    const masterBytes = Buffer.from(TEST_KEY, "base64");
    const algosdk = require("algosdk");
    const masterAddr = algosdk.encodeAddress(masterBytes.slice(32));

    manager.createAgent("child", "Child", makeBudget());
    const childAddr = manager.getAgentAddress("child");

    expect(childAddr).not.toBe(masterAddr);
  });
});
