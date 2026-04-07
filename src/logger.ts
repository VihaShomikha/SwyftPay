import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { PaymentRecord } from "./types.js";

/** Append-only JSON Lines log of payment records. */
export class TransactionLogger {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  append(record: PaymentRecord): void {
    const line = JSON.stringify(record) + "\n";
    appendFileSync(this.filePath, line, "utf-8");
  }

  readAll(): PaymentRecord[] {
    if (!existsSync(this.filePath)) return [];
    const content = readFileSync(this.filePath, "utf-8").trim();
    if (!content) return [];
    return content.split("\n").map((line) => JSON.parse(line) as PaymentRecord);
  }

  query(filter: {
    endpoint?: string;
    method?: string;
    since?: string;
    until?: string;
    paidOnly?: boolean;
  }): PaymentRecord[] {
    let records = this.readAll();

    if (filter.endpoint) {
      const ep = filter.endpoint;
      records = records.filter((r) => r.endpoint.includes(ep));
    }
    if (filter.method) {
      const m = filter.method.toUpperCase();
      records = records.filter((r) => r.method === m);
    }
    if (filter.since) {
      const since = filter.since;
      records = records.filter((r) => r.timestamp >= since);
    }
    if (filter.until) {
      const until = filter.until;
      records = records.filter((r) => r.timestamp <= until);
    }
    if (filter.paidOnly) {
      records = records.filter((r) => r.txId !== undefined);
    }

    return records;
  }

  /** Return the path to the log file */
  getFilePath(): string {
    return this.filePath;
  }
}
