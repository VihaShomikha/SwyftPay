// Local Express x402 server on PORT (default 4021); npm run dev:server.
import "dotenv/config";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402-avm/express";
import type { Network } from "@x402-avm/express";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const TESTNET = ALGORAND_TESTNET_CAIP2 as Network;

const PAY_TO = process.env.RESOURCE_PAY_TO ?? process.env.AVM_ADDRESS;
if (!PAY_TO) {
  console.error(
    "Error: RESOURCE_PAY_TO or AVM_ADDRESS must be set in .env",
  );
  process.exit(1);
}

const FACILITATOR_URL =
  process.env.FACILITATOR_URL ?? "https://facilitator.goplausible.xyz";

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(resourceServer);

const routes = {
  "GET /api/weather/:city": {
    accepts: {
      scheme: "exact" as const,
      network: TESTNET,
      payTo: PAY_TO,
      price: "$0.01",
    },
    description: "Weather data for a city ($0.01)",
  },
  "GET /api/premium/*": {
    accepts: {
      scheme: "exact" as const,
      network: TESTNET,
      payTo: PAY_TO,
      price: "$0.10",
    },
    description: "Premium API content ($0.10)",
  },
  "POST /api/ai/generate": {
    accepts: {
      scheme: "exact" as const,
      network: TESTNET,
      payTo: PAY_TO,
      price: "$1.00",
    },
    description: "AI content generation ($1.00)",
  },
};

const app = express();
app.use(express.json());
app.use(paymentMiddleware(routes, resourceServer));

app.get("/", (_req, res) => {
  res.json({
    name: "SwyftPay x402 Test Server",
    network: "Algorand TestNet",
    facilitator: FACILITATOR_URL,
    payTo: PAY_TO,
    endpoints: {
      weather: "GET /api/weather/:city — $0.01",
      premium: "GET /api/premium/* — $0.10",
      generate: "POST /api/ai/generate — $1.00",
      health: "GET /api/health — free",
    },
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

app.get("/api/weather/:city", (req, res) => {
  const conditions = ["sunny", "cloudy", "rainy", "snowy", "windy"];
  res.json({
    city: req.params.city,
    temperature: Math.floor(Math.random() * 40) + 50,
    condition: conditions[Math.floor(Math.random() * conditions.length)],
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/premium/*", (_req, res) => {
  res.json({
    content: "This is premium data served after Algorand TestNet micropayment.",
    accessLevel: "premium",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/ai/generate", (req, res) => {
  const prompt = req.body?.prompt ?? "default prompt";
  res.json({
    prompt,
    generated: `AI-generated content for: "${prompt}"`,
    model: "swyftpay-demo-v1",
    timestamp: new Date().toISOString(),
  });
});

const PORT = parseInt(process.env.PORT ?? "4021", 10);
const httpServer = app.listen(PORT, () => {
  console.log("┌──────────────────────────────────────────────────────┐");
  console.log("│  SwyftPay x402 Test Server                           │");
  console.log("├──────────────────────────────────────────────────────┤");
  console.log(`│  URL:          http://localhost:${PORT}`);
  console.log(`│  Network:      Algorand TestNet`);
  console.log(`│  Facilitator:  ${FACILITATOR_URL}`);
  console.log(`│  Pay-to:       ${PAY_TO}`);
  console.log("└──────────────────────────────────────────────────────┘");
});

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nError: Port ${PORT} is already in use.`);
    console.error("Either stop the existing process or change PORT in .env.\n");
    process.exit(1);
  }
  throw err;
});
