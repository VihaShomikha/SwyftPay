export interface SwyftPayConfig {
  avmPrivateKey: string;
  algodUrl?: string;
  algodToken?: string;
  facilitatorUrl?: string;
  networks?: string[];
  spendPolicy?: SpendPolicy;
  logFilePath?: string;
  retry?: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffMultiplier?: number;
    maxDelayMs?: number;
    jitter?: boolean;
    requestTimeoutMs?: number;
  };
  maxPaymentLoopCount?: number;
  simulationMode?: boolean;
  cacheTtlMs?: number;
}

export interface PaymentRecord {
  timestamp: string;
  endpoint: string;
  method: string;
  amount: string;
  network: string;
  payTo: string;
  txId?: string;
  status: number;
  correlationId: string;
  attempts?: number;
  simulated?: boolean;
}

export interface SpendPolicy {
  maxAmountPerRequest?: bigint;
  allowedHosts?: string[];
  allowedAssets?: number[];
}
