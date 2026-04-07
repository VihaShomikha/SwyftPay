import { motion } from "framer-motion";
import {
  ShieldCheck,
  ScrollText,
  RefreshCcw,
  Fingerprint,
  TerminalSquare,
  Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Policy Engine",
    description:
      "Enforce spend caps, restrict hosts, and limit asset types before any transaction is signed. Machine-readable violations for agent decision loops.",
    color: "text-pink",
  },
  {
    icon: ScrollText,
    title: "Audit Logging",
    description:
      "Every payment is persisted to a JSON Lines ledger with transaction IDs, amounts, timestamps, and correlation IDs. Queryable in real-time.",
    color: "text-purple",
  },
  {
    icon: RefreshCcw,
    title: "Resilient Retries",
    description:
      "Exponential backoff with jitter for transient failures. Payment loop detection prevents fund drain from misbehaving endpoints.",
    color: "text-pink",
  },
  {
    icon: Fingerprint,
    title: "Trust Scoring",
    description:
      "Every API endpoint earns a trust score (0-100) based on payment success rate, retry consistency, and response reliability.",
    color: "text-purple",
  },
  {
    icon: TerminalSquare,
    title: "CLI & SDK",
    description:
      "Ship as an npm package with subpath exports and a standalone CLI. One command to fetch, simulate, query logs, or check balances.",
    color: "text-pink",
  },
  {
    icon: Eye,
    title: "Simulation Mode",
    description:
      "Dry-run any x402 request to see exact payment details without spending. Built for staging environments and cost estimation.",
    color: "text-purple",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function Features() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-pixel text-sm md:text-base text-text-muted tracking-widest uppercase">
            Capabilities
          </h2>
          <p className="mt-4 text-2xl md:text-3xl font-bold text-text">
            Everything an agent needs to{" "}
            <span className="gradient-text">transact safely</span>
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={cardVariants}
                className="card-3d rounded-xl border border-border bg-bg-card p-6 hover:border-border-hover"
              >
                <div className={`${f.color} mb-4`}>
                  <Icon size={22} strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-text mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
