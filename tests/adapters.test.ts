// Framework adapter shapes and execute.
import { describe, it, expect } from "vitest";
import {
  SwyftPayBaseAdapter,
  SwyftPayLangChainTool,
  SwyftPayAutoGPTPlugin,
  SwyftPayOpenAITool,
} from "../src/adapters.js";
import type { AgentAdapter } from "../src/adapters.js";

const TEST_KEY =
  "qES+jwmPiUjVmfPg0YYhVb5G7aSjQT7FlqkFqGH/9txBqaiwv5l1MLGXBMN2VIDvfUFdif+RhS6hpBCVGHk33A==";

const baseConfig = {
  avmPrivateKey: TEST_KEY,
  algodUrl: "https://testnet-api.algonode.cloud",
};

describe("SwyftPayBaseAdapter", () => {
  it("implements AgentAdapter interface", () => {
    const adapter: AgentAdapter = new SwyftPayBaseAdapter(baseConfig);
    expect(adapter.name).toBe("swyftpay_fetch");
    expect(adapter.description).toBeTruthy();
    expect(typeof adapter.execute).toBe("function");
  });

  it("exposes the underlying client", () => {
    const adapter = new SwyftPayBaseAdapter(baseConfig);
    const client = adapter.getClient();
    expect(client).toBeTruthy();
    expect(client.address).toHaveLength(58);
  });
});

describe("SwyftPayLangChainTool", () => {
  it("has correct name and description", () => {
    const tool = new SwyftPayLangChainTool(baseConfig);
    expect(tool.name).toBe("swyftpay_paid_request");
    expect(tool.description).toContain("x402");
    expect(tool.description).toContain("Algorand");
  });

  it("produces a valid tool definition", () => {
    const tool = new SwyftPayLangChainTool(baseConfig);
    const def = tool.toToolDefinition();

    expect(def.name).toBe("swyftpay_paid_request");
    expect(def.description).toBeTruthy();
    expect(def.schema.type).toBe("object");
    expect(def.schema.properties.url).toBeTruthy();
    expect(def.schema.properties.method).toBeTruthy();
    expect(def.schema.properties.body).toBeTruthy();
    expect(def.schema.required).toContain("url");
    expect(typeof def.func).toBe("function");
  });
});

describe("SwyftPayAutoGPTPlugin", () => {
  it("has correct name", () => {
    const plugin = new SwyftPayAutoGPTPlugin(baseConfig);
    expect(plugin.name).toBe("swyftpay");
  });

  it("produces a valid command spec", () => {
    const plugin = new SwyftPayAutoGPTPlugin(baseConfig);
    const spec = plugin.toCommandSpec();

    expect(spec.command_name).toBe("swyftpay_fetch");
    expect(spec.description).toContain("payment");
    expect(spec.arguments.url.required).toBe(true);
    expect(spec.arguments.method.required).toBe(false);
    expect(typeof spec.execute).toBe("function");
  });
});

describe("SwyftPayOpenAITool", () => {
  it("has correct name", () => {
    const tool = new SwyftPayOpenAITool(baseConfig);
    expect(tool.name).toBe("swyftpay_paid_request");
  });

  it("produces a valid function definition", () => {
    const tool = new SwyftPayOpenAITool(baseConfig);
    const def = tool.toFunctionDefinition();

    expect(def.type).toBe("function");
    expect(def.function.name).toBe("swyftpay_paid_request");
    expect(def.function.parameters.type).toBe("object");
    expect(def.function.parameters.properties.url).toBeTruthy();
    expect(def.function.parameters.required).toContain("url");
    expect(typeof def.call).toBe("function");
  });
});

describe("AgentAdapter interface compliance", () => {
  it("all adapters implement the interface", () => {
    const adapters: AgentAdapter[] = [
      new SwyftPayBaseAdapter(baseConfig),
      new SwyftPayLangChainTool(baseConfig),
      new SwyftPayAutoGPTPlugin(baseConfig),
      new SwyftPayOpenAITool(baseConfig),
    ];

    for (const adapter of adapters) {
      expect(typeof adapter.name).toBe("string");
      expect(typeof adapter.description).toBe("string");
      expect(typeof adapter.execute).toBe("function");
    }
  });
});
