import { motion } from "framer-motion";
import { useState } from "react";
import {
  BookOpen,
  Terminal,
  Shield,
  ScrollText,
  RefreshCcw,
  Fingerprint,
  Users,
  Plug,
  Zap,
  ChevronRight,
  Copy,
  Eye,
  Database,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GITHUB_REPO_URL } from "../config/site";

const QUICKSTART_BASH = `# Clone and install
git clone ${GITHUB_REPO_URL}.git
cd SwyftPay && npm install

# Configure environment
cp .env.template .env
# Paste your 25-word Pera TestNet mnemonic into DEPLOYER_MNEMONIC

# Derive keys
npm run key:convert
# Copy the printed AVM_PRIVATE_KEY and AVM_ADDRESS into .env

# Build
npm run build

# Try it
swyftpay balance
swyftpay fetch https://example.x402.goplausible.xyz/avm/weather`;

interface DocSection {
  id: string;
  icon: LucideIcon;
  title: string;
  content: React.ReactNode;
}

function CodeBlock({ code, lang = "" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-border bg-[#080808] overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <span className="text-[10px] text-text-muted font-mono">{lang}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text transition-colors"
        >
          <Copy size={10} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed font-mono text-text-muted">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const sections: DocSection[] = [
  {
    id: "quickstart",
    icon: Zap,
    title: "Quick Start",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Get SwyftPay running in under two minutes. You need Node.js 20+ and an Algorand TestNet wallet with ALGO + USDC.
        </p>
        <CodeBlock lang="bash" code={QUICKSTART_BASH} />
        <div className="mt-4 p-4 rounded-lg border border-border bg-purple-dim">
          <p className="text-sm text-text-muted">
            <span className="text-purple font-semibold">Prerequisite:</span> Fund your wallet at{" "}
            <a href="https://bank.testnet.algorand.network/" target="_blank" rel="noopener noreferrer" className="text-pink hover:underline">
              bank.testnet.algorand.network
            </a>{" "}
            and opt into TestNet USDC (ASA 10458941) via Pera Wallet.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "sdk",
    icon: BookOpen,
    title: "SDK Usage",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          The <code className="text-pink font-mono text-sm">SwyftPayClient</code> wraps the native <code className="text-pink font-mono text-sm">fetch</code> API.
          Any request to an x402-protected endpoint is automatically intercepted, paid, and retried.
        </p>
        <CodeBlock
          lang="typescript"
          code={`import { SwyftPayClient } from "swyftpay";

const client = new SwyftPayClient({
  avmPrivateKey: process.env.AVM_PRIVATE_KEY!,
  spendPolicy: {
    maxAmountPerRequest: BigInt(10_000),
    allowedHosts: ["*.goplausible.xyz"],
    allowedAssets: [10458941],
  },
  logFilePath: "logs/transactions.jsonl",
  retry: { maxRetries: 3, initialDelayMs: 500 },
  simulationMode: false,
  cacheTtlMs: 60_000,
});

// Automatic: request -> 402 -> pay -> retry -> 200
const response = await client.get("https://example.x402.goplausible.xyz/avm/weather");
const data = await response.json();

// Query payment history
const paid = client.queryLog({ paidOnly: true });`}
        />
        <h4 className="text-text font-semibold mt-6 mb-2">Configuration options</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-text-muted font-mono text-xs">Option</th>
                <th className="text-left py-2 pr-4 text-text-muted font-mono text-xs">Type</th>
                <th className="text-left py-2 text-text-muted font-mono text-xs">Description</th>
              </tr>
            </thead>
            <tbody className="text-text-muted">
              <tr className="border-b border-border/30"><td className="py-2 pr-4 font-mono text-pink text-xs">avmPrivateKey</td><td className="py-2 pr-4 text-xs">string</td><td className="py-2 text-xs">Base64-encoded 64-byte Algorand secret key</td></tr>
              <tr className="border-b border-border/30"><td className="py-2 pr-4 font-mono text-pink text-xs">spendPolicy</td><td className="py-2 pr-4 text-xs">SpendPolicy</td><td className="py-2 text-xs">Max amount, allowed hosts, allowed assets</td></tr>
              <tr className="border-b border-border/30"><td className="py-2 pr-4 font-mono text-pink text-xs">logFilePath</td><td className="py-2 pr-4 text-xs">string</td><td className="py-2 text-xs">Path for persistent JSON Lines transaction log</td></tr>
              <tr className="border-b border-border/30"><td className="py-2 pr-4 font-mono text-pink text-xs">retry</td><td className="py-2 pr-4 text-xs">RetryConfig</td><td className="py-2 text-xs">maxRetries, initialDelayMs, backoffMultiplier, jitter</td></tr>
              <tr className="border-b border-border/30"><td className="py-2 pr-4 font-mono text-pink text-xs">simulationMode</td><td className="py-2 pr-4 text-xs">boolean</td><td className="py-2 text-xs">Dry-run - detect 402, log payment details, skip signing</td></tr>
              <tr className="border-b border-border/30"><td className="py-2 pr-4 font-mono text-pink text-xs">cacheTtlMs</td><td className="py-2 pr-4 text-xs">number</td><td className="py-2 text-xs">Cache paid responses to avoid re-paying within window</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-pink text-xs">maxPaymentLoopCount</td><td className="py-2 pr-4 text-xs">number</td><td className="py-2 text-xs">Safety cap for consecutive 402 cycles (default: 3)</td></tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "cli",
    icon: Terminal,
    title: "CLI Reference",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          The <code className="text-pink font-mono text-sm">swyftpay</code> CLI provides direct access to all SDK features from the terminal. Build first with <code className="text-pink font-mono text-sm">npm run build</code>.
        </p>
        <CodeBlock
          lang="bash"
          code={`# x402-aware HTTP request (auto-pay on 402)
swyftpay fetch <url> [-X METHOD] [-d DATA] [-H header:value]

# Dry-run: see payment details without signing
swyftpay simulate <url>

# Query the payment log
swyftpay logs [--paid] [--since <date>] [--endpoint <url>]

# Wallet address and on-chain balance
swyftpay balance

# API trust scores (all endpoints or one)
swyftpay trust [url]`}
        />
        <h4 className="text-text font-semibold mt-6 mb-2">Environment variables</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-text-muted font-mono text-xs">Variable</th>
                <th className="text-left py-2 text-text-muted font-mono text-xs">Description</th>
              </tr>
            </thead>
            <tbody className="text-text-muted">
              <tr className="border-b border-border/30"><td className="py-2 pr-4 font-mono text-pink text-xs">AVM_PRIVATE_KEY</td><td className="py-2 text-xs">Base64-encoded Algorand private key (required)</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-pink text-xs">ALGOD_TESTNET_URL</td><td className="py-2 text-xs">Algorand TestNet API (default: algonode.cloud)</td></tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "policy",
    icon: Shield,
    title: "Policy Engine",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          The policy engine validates every payment before it is signed. If a policy rule is violated, the request is blocked with a machine-readable <code className="text-pink font-mono text-sm">PolicyViolationError</code>.
        </p>
        <CodeBlock
          lang="typescript"
          code={`const client = new SwyftPayClient({
  avmPrivateKey: "...",
  spendPolicy: {
    maxAmountPerRequest: BigInt(5_000_000), // $5 USDC cap
    allowedHosts: ["*.goplausible.xyz", "api.myservice.com"],
    allowedAssets: [10458941], // TestNet USDC only
  },
});`}
        />
        <h4 className="text-text font-semibold mt-6 mb-2">Policy rules</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-text-muted font-mono text-xs">Rule</th>
                <th className="text-left py-2 pr-4 text-text-muted font-mono text-xs">Error Code</th>
                <th className="text-left py-2 text-text-muted font-mono text-xs">When</th>
              </tr>
            </thead>
            <tbody className="text-text-muted">
              <tr className="border-b border-border/30"><td className="py-2 pr-4 text-xs">Max amount</td><td className="py-2 pr-4 font-mono text-xs text-pink">MAX_AMOUNT_EXCEEDED</td><td className="py-2 text-xs">Payment exceeds per-request cap</td></tr>
              <tr className="border-b border-border/30"><td className="py-2 pr-4 text-xs">Allowed hosts</td><td className="py-2 pr-4 font-mono text-xs text-pink">HOST_NOT_ALLOWED</td><td className="py-2 text-xs">Host not in allowlist (supports *.domain.com)</td></tr>
              <tr><td className="py-2 pr-4 text-xs">Allowed assets</td><td className="py-2 pr-4 font-mono text-xs text-pink">ASSET_NOT_ALLOWED</td><td className="py-2 text-xs">ASA not in allowlist</td></tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "logging",
    icon: ScrollText,
    title: "Audit Logging",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Every payment is persisted to a JSON Lines file with full metadata. The log is append-only and queryable.
        </p>
        <CodeBlock
          lang="typescript"
          code={`// Read all records
const all = client.readLogFile();

// Filtered query
const recent = client.queryLog({
  paidOnly: true,
  since: "2026-04-01T00:00:00Z",
  endpoint: "goplausible.xyz",
});

// Each record contains:
// timestamp, endpoint, method, amount, network,
// payTo, txId, status, correlationId, attempts`}
        />
      </>
    ),
  },
  {
    id: "retry",
    icon: RefreshCcw,
    title: "Retry & Error Handling",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Transient failures (network errors, timeouts, facilitator issues) are retried with exponential backoff and jitter.
          Fatal errors (policy violations, payment failures, payment loops) are thrown immediately.
        </p>
        <CodeBlock
          lang="typescript"
          code={`import { classifyError, ErrorCodes } from "swyftpay";

// Error classification
// RECOVERABLE: NETWORK_ERROR, TIMEOUT, FACILITATOR_ERROR
// FATAL: PAYMENT_LOOP, PAYMENT_FAILED, POLICY_VIOLATION

// Payment loop detection
// After N consecutive 402-pay cycles to the same endpoint,
// SwyftPay halts with PAYMENT_LOOP to prevent fund drain.

// Retry config
const client = new SwyftPayClient({
  avmPrivateKey: "...",
  retry: {
    maxRetries: 3,
    initialDelayMs: 500,
    backoffMultiplier: 2.0,
    maxDelayMs: 10000,
    jitter: true,
  },
  maxPaymentLoopCount: 3,
});`}
        />
      </>
    ),
  },
  {
    id: "trust",
    icon: Fingerprint,
    title: "Trust Scoring",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Every API endpoint earns a trust score (0-100) based on payment history. Agents can use this to make informed decisions about which APIs to pay.
        </p>
        <CodeBlock
          lang="typescript"
          code={`import { computeTrustScore, computeAllTrustScores } from "swyftpay";

// Score a single endpoint
const report = computeTrustScore(records, "https://api.example.com/data");
// { score: 94, grade: "A", successRate: 0.97, flags: [] }

// Score all endpoints
const all = computeAllTrustScores(records);
// Sorted by score, highest first`}
        />
        <h4 className="text-text font-semibold mt-6 mb-2">Grade scale</h4>
        <div className="flex gap-3 flex-wrap mt-2">
          {[
            { grade: "A", range: "90-100", color: "text-green-400" },
            { grade: "B", range: "75-89", color: "text-green-300" },
            { grade: "C", range: "60-74", color: "text-yellow-400" },
            { grade: "D", range: "40-59", color: "text-orange-400" },
            { grade: "F", range: "0-39", color: "text-red-400" },
          ].map((g) => (
            <div key={g.grade} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg-card text-xs">
              <span className={`font-pixel text-xs ${g.color}`}>{g.grade}</span>
              <span className="text-text-muted">{g.range}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "simulation",
    icon: Eye,
    title: "Simulation Mode",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Simulation mode intercepts 402 challenges and logs exactly what would be paid without signing any transaction. No funds leave the wallet.
        </p>
        <CodeBlock
          lang="typescript"
          code={`const client = new SwyftPayClient({
  avmPrivateKey: "...",
  simulationMode: true,
});

const res = await client.get("https://example.x402.goplausible.xyz/avm/weather");
// Returns a 402 response with simulation details:
// { simulated: true, wouldPay: { amount, network, payTo } }

// Check records
const records = client.getRecords();
// records[0].simulated === true
// records[0].amount === "1000 (simulated)"`}
        />
      </>
    ),
  },
  {
    id: "cache",
    icon: Database,
    title: "Response Cache",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Enable caching to avoid re-paying for the same endpoint within a time window. Cache hits return instantly with an <code className="text-pink font-mono text-sm">x-swyftpay-cache: HIT</code> header.
        </p>
        <CodeBlock
          lang="typescript"
          code={`const client = new SwyftPayClient({
  avmPrivateKey: "...",
  cacheTtlMs: 60_000, // 60 seconds

});

// First call: pays, caches response
await client.get("https://api.example.com/data");

// Second call within 60s: returns cached, no payment
await client.get("https://api.example.com/data");

// Manual cache control
client.clearCache();
console.log(client.cacheSize);`}
        />
      </>
    ),
  },
  {
    id: "agents",
    icon: Users,
    title: "Multi-Agent Wallets",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Manage multiple agent identities from a single master key. Each agent gets a deterministically derived wallet with its own budget.
        </p>
        <CodeBlock
          lang="typescript"
          code={`import { AgentWalletManager } from "swyftpay/agents";

const manager = new AgentWalletManager(masterPrivateKey);

// Create agent profiles
manager.createAgent("weather-bot", "Weather Bot", {
  totalLimit: 100_000_000n,  // $100 USDC lifetime
  dailyLimit: 10_000_000n,   // $10 USDC per day
  alertThreshold: 0.8,       // Warn at 80%
});

// Each agent gets an isolated wallet and client
const client = manager.getClient("weather-bot");
const res = await client.get("https://api.weather.x402/forecast");

// Check budget status
const status = manager.getStatus("weather-bot");
// { spent, remaining, usagePercent, alert, alertMessage }`}
        />
      </>
    ),
  },
  {
    id: "adapters",
    icon: Plug,
    title: "Framework Adapters",
    content: (
      <>
        <p className="text-text-muted leading-relaxed mb-4">
          Pre-built adapters for popular agent frameworks. Each adapter wraps a <code className="text-pink font-mono text-sm">SwyftPayClient</code> and exposes a framework-native tool definition.
        </p>
        <CodeBlock
          lang="typescript"
          code={`// LangChain
import { SwyftPayLangChainTool } from "swyftpay/adapters";
const tool = new SwyftPayLangChainTool({ avmPrivateKey: "..." });
const definition = tool.toToolDefinition();
// Pass to DynamicStructuredTool

// OpenAI function calling
import { SwyftPayOpenAITool } from "swyftpay/adapters";
const fn = new SwyftPayOpenAITool({ avmPrivateKey: "..." });
const def = fn.toFunctionDefinition();
// Add to tools[] in Chat Completions API

// AutoGPT
import { SwyftPayAutoGPTPlugin } from "swyftpay/adapters";
const spec = new SwyftPayAutoGPTPlugin({ avmPrivateKey: "..." });
const cmd = spec.toCommandSpec();`}
        />
      </>
    ),
  },
];

export function Docs() {
  const [activeSection, setActiveSection] = useState("quickstart");

  return (
    <main className="pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="font-pixel text-lg md:text-xl text-text leading-relaxed">Documentation</h1>
          <p className="mt-4 text-text-muted text-lg max-w-2xl">
            Everything you need to integrate SwyftPay into your agent, application, or framework.
          </p>
        </motion.div>

        <div className="flex gap-8">
          <nav className="hidden lg:block w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
            <ul className="space-y-1">
              {sections.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        setActiveSection(s.id);
                        document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        activeSection === s.id
                          ? "bg-pink-dim text-pink"
                          : "text-text-muted hover:text-text hover:bg-bg-card"
                      }`}
                    >
                      <Icon size={14} strokeWidth={1.5} />
                      {s.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex-1 min-w-0">
            {sections.map((s, i) => (
              <motion.section
                key={s.id}
                id={s.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                onViewportEnter={() => setActiveSection(s.id)}
                className="mb-16 scroll-mt-28"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-dim to-purple-dim flex items-center justify-center border border-border">
                    <s.icon size={14} className="text-pink" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-pixel text-xs md:text-sm text-text">{s.title}</h2>
                  <ChevronRight size={14} className="text-text-muted" />
                </div>
                <div className="pl-0 lg:pl-0">{s.content}</div>
              </motion.section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
