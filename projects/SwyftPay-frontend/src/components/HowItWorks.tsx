import { motion } from "framer-motion";
import { Send, Lock, CreditCard, CheckCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  num: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    num: "01",
    icon: Send,
    title: "Agent sends request",
    description:
      "Your agent calls any x402-protected API through SwyftPayClient. Standard HTTP — no special protocol adapters.",
  },
  {
    num: "02",
    icon: Lock,
    title: "Server responds 402",
    description:
      "The API returns HTTP 402 with a payment challenge: amount, recipient address, asset ID, and network identifier.",
  },
  {
    num: "03",
    icon: CreditCard,
    title: "SwyftPay settles on-chain",
    description:
      "The policy engine validates the payment. If approved, an Algorand USDC transaction is signed and submitted through the facilitator.",
  },
  {
    num: "04",
    icon: CheckCircle,
    title: "Response delivered",
    description:
      "The request retries with proof of payment. The server verifies and returns the protected resource. Payment is logged with the on-chain transaction ID.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 border-t border-border/50">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-pixel text-sm md:text-base text-text-muted tracking-widest uppercase">
            Protocol
          </h2>
          <p className="mt-4 text-2xl md:text-3xl font-bold text-text">
            Request &rarr; 402 &rarr; Pay &rarr;{" "}
            <span className="gradient-text">Done</span>
          </p>
        </motion.div>

        <div className="space-y-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="card-3d flex gap-5 md:gap-6 items-start rounded-xl border border-border bg-bg-card p-5 md:p-6 hover:border-border-hover"
              >
                <div className="shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-pink-dim to-purple-dim flex items-center justify-center border border-border">
                  <Icon size={18} className="text-pink" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-pixel text-[10px] text-purple">{step.num}</span>
                    <h3 className="text-base font-semibold text-text">{step.title}</h3>
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
