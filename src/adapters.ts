import { SwyftPayClient } from "./client.js";
import type { SwyftPayConfig } from "./types.js";

/** Minimal contract for agent frameworks that call paid HTTP APIs. */
export interface AgentAdapter {
  name: string;
  description: string;
  execute(input: { url: string; method?: string; body?: string }): Promise<string>;
}

/** Wraps SwyftPayClient.execute as response text. */
export class SwyftPayBaseAdapter implements AgentAdapter {
  readonly name: string = "swyftpay_fetch";
  readonly description: string =
    "Make an HTTP request to an x402-protected API. Automatically handles payment if the server requires it (HTTP 402). " +
    "Input: URL to fetch. Returns: the response body as text or JSON.";

  protected client: SwyftPayClient;

  constructor(config: SwyftPayConfig) {
    this.client = new SwyftPayClient(config);
  }

  async execute(input: { url: string; method?: string; body?: string }): Promise<string> {
    const method = input.method?.toUpperCase() ?? "GET";
    const init: RequestInit = { method };

    if (input.body) {
      init.body = input.body;
      init.headers = { "Content-Type": "application/json" };
    }

    const response = await this.client.request(input.url, init);
    return response.text();
  }

  getClient(): SwyftPayClient {
    return this.client;
  }
}

/** LangChain DynamicStructuredTool-shaped { name, description, schema, func }. */
export class SwyftPayLangChainTool extends SwyftPayBaseAdapter {
  override readonly name = "swyftpay_paid_request";
  override readonly description =
    "Fetch data from an x402 payment-gated API. The tool automatically detects HTTP 402 responses, " +
    "executes a micropayment on Algorand, and retries with proof of payment. " +
    "Use this when you need to access a paid API endpoint. Input: the URL to fetch.";

  toToolDefinition() {
    return {
      name: this.name,
      description: this.description,
      schema: {
        type: "object" as const,
        properties: {
          url: {
            type: "string",
            description: "The URL of the x402-protected API endpoint to fetch",
          },
          method: {
            type: "string",
            description: "HTTP method (GET, POST, etc.). Defaults to GET.",
            enum: ["GET", "POST", "PUT", "DELETE"],
          },
          body: {
            type: "string",
            description: "Optional JSON request body for POST/PUT requests",
          },
        },
        required: ["url"],
      },
      func: (input: { url: string; method?: string; body?: string }) =>
        this.execute(input),
    };
  }
}

/** AutoGPT-style { command_name, arguments, execute }. */
export class SwyftPayAutoGPTPlugin extends SwyftPayBaseAdapter {
  override readonly name = "swyftpay";
  override readonly description = "Make paid HTTP requests through the x402 payment protocol on Algorand.";

  toCommandSpec() {
    return {
      command_name: "swyftpay_fetch",
      description: "Fetch data from a payment-gated API using x402. Handles payment automatically.",
      arguments: {
        url: { type: "string", required: true, description: "API endpoint URL" },
        method: { type: "string", required: false, description: "HTTP method (default: GET)" },
        body: { type: "string", required: false, description: "JSON request body" },
      },
      execute: (args: Record<string, string>) =>
        this.execute({ url: args.url, method: args.method, body: args.body }),
    };
  }
}

/** OpenAI Chat Completions tools[] entry plus call(). */
export class SwyftPayOpenAITool extends SwyftPayBaseAdapter {
  override readonly name = "swyftpay_paid_request";
  override readonly description =
    "Make an HTTP request to a paid API. Handles x402 payment automatically on Algorand.";

  toFunctionDefinition() {
    return {
      type: "function" as const,
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL of the payment-gated API endpoint",
            },
            method: {
              type: "string",
              description: "HTTP method. Defaults to GET.",
              enum: ["GET", "POST", "PUT", "DELETE"],
            },
            body: {
              type: "string",
              description: "JSON request body for POST/PUT requests",
            },
          },
          required: ["url"],
        },
      },
      call: (args: { url: string; method?: string; body?: string }) =>
        this.execute(args),
    };
  }
}
