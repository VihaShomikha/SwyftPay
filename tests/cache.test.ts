// ResponseCache TTL and keys.
import { describe, it, expect, beforeEach } from "vitest";
import { ResponseCache } from "../src/cache.js";

describe("ResponseCache", () => {
  let cache: ResponseCache;

  beforeEach(() => {
    cache = new ResponseCache(5000);
  });

  it("returns null for uncached URL", () => {
    expect(cache.get("GET", "https://api.com/data")).toBeNull();
  });

  it("caches and returns response", async () => {
    const original = new Response('{"value": 42}', {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    await cache.set("GET", "https://api.com/data", original);

    const cached = cache.get("GET", "https://api.com/data");
    expect(cached).not.toBeNull();
    expect(cached!.status).toBe(200);
    expect(cached!.headers.get("x-swyftpay-cache")).toBe("HIT");

    const body = await cached!.json();
    expect(body.value).toBe(42);
  });

  it("differentiates by method", async () => {
    await cache.set("GET", "https://api.com/data", new Response("get"));
    await cache.set("POST", "https://api.com/data", new Response("post"));

    const get = cache.get("GET", "https://api.com/data");
    const post = cache.get("POST", "https://api.com/data");
    expect(await get!.text()).toBe("get");
    expect(await post!.text()).toBe("post");
  });

  it("expires entries after TTL", async () => {
    const short = new ResponseCache(50);
    await short.set("GET", "https://api.com/data", new Response("value"));

    expect(short.get("GET", "https://api.com/data")).not.toBeNull();

    await new Promise((r) => setTimeout(r, 80));
    expect(short.get("GET", "https://api.com/data")).toBeNull();
  });

  it("tracks cache size", async () => {
    expect(cache.size).toBe(0);
    await cache.set("GET", "https://a.com", new Response("a"));
    expect(cache.size).toBe(1);
    await cache.set("GET", "https://b.com", new Response("b"));
    expect(cache.size).toBe(2);
  });

  it("clears all entries", async () => {
    await cache.set("GET", "https://a.com", new Response("a"));
    await cache.set("GET", "https://b.com", new Response("b"));
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("prunes expired entries", async () => {
    const short = new ResponseCache(50);
    await short.set("GET", "https://old.com", new Response("old"));
    await new Promise((r) => setTimeout(r, 80));
    await short.set("GET", "https://new.com", new Response("new"));

    const evicted = short.prune();
    expect(evicted).toBe(1);
    expect(short.size).toBe(1);
    expect(short.get("GET", "https://new.com")).not.toBeNull();
  });

  it("marks set response with MISS header", async () => {
    const res = await cache.set("GET", "https://api.com/data", new Response("x"));
    expect(res.headers.get("x-swyftpay-cache")).toBe("MISS");
  });
});
