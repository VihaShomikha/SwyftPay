/** In-memory TTL cache so repeat GETs skip paying within the window. */

interface CacheEntry {
  body: string;
  status: number;
  headers: Record<string, string>;
  cachedAt: number;
}

export class ResponseCache {
  private store = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  private key(method: string, url: string): string {
    return `${method.toUpperCase()}:${url}`;
  }

  get(method: string, url: string): Response | null {
    const k = this.key(method, url);
    const entry = this.store.get(k);
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.store.delete(k);
      return null;
    }

    return new Response(entry.body, {
      status: entry.status,
      headers: { ...entry.headers, "x-swyftpay-cache": "HIT" },
    });
  }

  async set(method: string, url: string, response: Response): Promise<Response> {
    const body = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((v, k) => { headers[k] = v; });

    this.store.set(this.key(method, url), {
      body,
      status: response.status,
      headers,
      cachedAt: Date.now(),
    });

    return new Response(body, {
      status: response.status,
      headers: { ...headers, "x-swyftpay-cache": "MISS" },
    });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  prune(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [k, entry] of this.store) {
      if (now - entry.cachedAt > this.ttlMs) {
        this.store.delete(k);
        evicted++;
      }
    }
    return evicted;
  }
}
