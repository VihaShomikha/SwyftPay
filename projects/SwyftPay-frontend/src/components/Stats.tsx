import { motion } from "framer-motion";

const stats = [
  { value: "< 4s", label: "Payment round-trip", sub: "402 to 200" },
  { value: "$0.001", label: "Minimum transaction", sub: "USDC on Algorand" },
  { value: "12", label: "SDK modules", sub: "Tree-shakeable ESM" },
  { value: "92", label: "Automated tests", sub: "Unit + integration" },
];

export function Stats() {
  return (
    <section className="py-12 md:py-16 border-t border-border/50">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="text-center"
            >
              <div className="font-pixel text-base sm:text-lg md:text-xl gradient-text">{s.value}</div>
              <div className="mt-2 text-xs sm:text-sm font-medium text-text">{s.label}</div>
              <div className="mt-1 text-[10px] sm:text-xs text-text-muted">{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
