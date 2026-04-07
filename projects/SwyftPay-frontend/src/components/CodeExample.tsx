import { motion } from "framer-motion";
import { Copy, ArrowRight } from "lucide-react";
import { useState } from "react";
import { GITHUB_REPO_URL } from "../config/site";

const code = `import { SwyftPayClient } from "swyftpay";

const client = new SwyftPayClient({
  avmPrivateKey: process.env.AVM_PRIVATE_KEY,
  spendPolicy: {
    maxAmountPerRequest: BigInt(10_000),
    allowedHosts: ["*.goplausible.xyz"],
  },
  logFilePath: "logs/payments.jsonl",
  cacheTtlMs: 60_000,
});

const res = await client.get("https://api.weather.x402/forecast");
const data = await res.json();`;

const cliCode = `$ npm install swyftpay

$ swyftpay fetch https://api.weather.x402/forecast
[SwyftPay] 402 detected — signing $0.001 USDC
[SwyftPay] Payment settled TX 7FHL2V...XEMOQ
Status: 200 OK
{ "forecast": "clear skies", "temperature": 72 }

$ swyftpay simulate https://api.premium.x402/data
[SwyftPay] [SIMULATION] Would pay $0.005 to ADDR...XYZ
No funds were transferred.

$ swyftpay trust
┌────────────────────────────────┬───────┬───────┐
│ Endpoint                       │ Score │ Grade │
├────────────────────────────────┼───────┼───────┤
│ api.weather.x402/forecast      │ 94    │ A     │
│ api.premium.x402/data          │ 67    │ C     │
└────────────────────────────────┴───────┴───────┘`;

export function CodeExample() {
  const [tab, setTab] = useState<"sdk" | "cli">("sdk");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(tab === "sdk" ? code : cliCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section id="code" className="py-24 md:py-32 border-t border-border/50">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="font-pixel text-sm md:text-base text-text-muted tracking-widest uppercase">
            Developer Experience
          </h2>
          <p className="mt-4 text-2xl md:text-3xl font-bold text-text">
            Three lines to{" "}
            <span className="gradient-text">automatic payments</span>
          </p>
          <p className="mt-3 text-text-muted text-base max-w-xl mx-auto">
            Configure once, pay everywhere. Every x402-protected API becomes
            accessible to your agent.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-xl border border-border bg-bg-card overflow-hidden"
          style={{
            boxShadow: "0 30px 60px rgba(0,0,0,0.3), 0 0 80px rgba(245,160,177,0.03)",
          }}
        >
          {/* Tab bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-[#080808]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTab("sdk")}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  tab === "sdk"
                    ? "bg-pink-dim text-pink"
                    : "text-text-muted hover:text-text"
                }`}
              >
                SDK
              </button>
              <button
                onClick={() => setTab("cli")}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  tab === "cli"
                    ? "bg-purple-dim text-purple"
                    : "text-text-muted hover:text-text"
                }`}
              >
                CLI
              </button>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
            >
              <Copy size={12} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Code content */}
          <pre className="p-5 overflow-x-auto text-sm leading-relaxed font-mono">
            <code>
              {(tab === "sdk" ? code : cliCode).split("\n").map((line, i) => (
                <div key={i} className="flex">
                  <span className="select-none text-text-muted/20 w-7 text-right mr-4 shrink-0 text-xs">
                    {i + 1}
                  </span>
                  <span className="text-text-muted">{line}</span>
                </div>
              ))}
            </code>
          </pre>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 text-center"
        >
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-sm text-text-muted hover:text-pink transition-colors"
          >
            View source on GitHub
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
