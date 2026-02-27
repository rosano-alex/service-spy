import { describe, it, expect, beforeEach } from "vitest";
import { generateExchange, genId } from "../mockData.js";
import { METHODS } from "../theme.js";

describe("genId", () => {
  it("returns a string with the given prefix", () => {
    const id = genId("req");
    expect(id).toMatch(/^req_/);
  });

  it("returns unique IDs on each call", () => {
    const ids = new Set(Array.from({ length: 20 }, () => genId("x")));
    expect(ids.size).toBe(20);
  });

  it("pads the counter portion to at least 6 hex chars", () => {
    const id = genId("test");
    const hex = id.split("_")[1];
    expect(hex.length).toBeGreaterThanOrEqual(6);
    expect(hex).toMatch(/^[0-9a-f]+$/);
  });
});

describe("generateExchange", () => {
  let exchange;

  beforeEach(() => {
    exchange = generateExchange();
  });

  // ── request shape ──────────────────────────────────────────────────────────

  it("returns an object with a request field", () => {
    expect(exchange).toHaveProperty("request");
  });

  it("request has required string fields", () => {
    const { request } = exchange;
    expect(typeof request.id).toBe("string");
    expect(typeof request.correlationId).toBe("string");
    expect(typeof request.url).toBe("string");
    expect(typeof request.method).toBe("string");
    expect(request.direction).toBe("outbound");
  });

  it("request.method is one of the known HTTP methods", () => {
    expect(METHODS).toContain(exchange.request.method);
  });

  it("request.url is a valid URL", () => {
    expect(() => new URL(exchange.request.url)).not.toThrow();
  });

  it("request.timestamp is a recent epoch millisecond", () => {
    const now = Date.now();
    expect(exchange.request.timestamp).toBeGreaterThan(now - 5000);
    expect(exchange.request.timestamp).toBeLessThanOrEqual(now);
  });

  it("request.headers contains expected keys", () => {
    const { headers } = exchange.request;
    expect(headers).toHaveProperty("content-type");
    expect(headers).toHaveProperty("x-correlation-id");
    expect(headers).toHaveProperty("authorization");
    expect(headers["authorization"]).toBe("[REDACTED]");
  });

  it("request.metadata has spanId and tags", () => {
    const { metadata } = exchange.request;
    expect(typeof metadata.spanId).toBe("string");
    expect(metadata.tags).toMatchObject({ service: "order-service", flow: "checkout" });
  });

  // ── response shape ─────────────────────────────────────────────────────────

  it("response is either undefined or a valid object", () => {
    if (exchange.response !== undefined) {
      expect(typeof exchange.response.statusCode).toBe("number");
      expect(exchange.response.statusCode).toBeGreaterThanOrEqual(100);
      expect(exchange.response.statusCode).toBeLessThan(600);
      expect(typeof exchange.response.latencyMs).toBe("number");
      expect(exchange.response.latencyMs).toBeGreaterThan(0);
    } else {
      expect(exchange.response).toBeUndefined();
    }
  });

  it("response.latencyMs is between 10ms and 2010ms when present", () => {
    if (exchange.response) {
      expect(exchange.response.latencyMs).toBeGreaterThanOrEqual(10);
      expect(exchange.response.latencyMs).toBeLessThanOrEqual(2010);
    }
  });

  // ── error shape ────────────────────────────────────────────────────────────

  it("error is either undefined or a valid error object", () => {
    if (exchange.error !== undefined) {
      expect(exchange.error).toHaveProperty("code");
      expect(exchange.error).toHaveProperty("message");
      expect(exchange.error).toHaveProperty("requestId");
      expect(exchange.error).toHaveProperty("correlationId");
    }
  });

  it("error.message references the request URL when present", () => {
    if (exchange.error) {
      expect(exchange.error.message).toContain(exchange.request.url);
    }
  });

  // ── consistency checks ─────────────────────────────────────────────────────

  it("request and response share the same correlationId", () => {
    if (exchange.response) {
      expect(exchange.response.correlationId).toBe(exchange.request.correlationId);
    }
  });

  it("POST and PUT exchanges may have a request body; others do not", () => {
    const { method, body } = exchange.request;
    if (method === "POST" || method === "PUT") {
      // body is optional but typed
      if (body !== undefined) {
        expect(body).toHaveProperty("data");
      }
    } else {
      expect(body).toBeUndefined();
    }
  });
});
