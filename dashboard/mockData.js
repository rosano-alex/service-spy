import { METHODS } from "./theme.js";

const URLS = [
  "https://api.example.com/users",
  "https://api.example.com/orders/123",
  "https://api.example.com/inventory/check",
  "https://payments.stripe.com/v1/charges",
  "https://api.example.com/auth/token",
  "https://api.example.com/products?page=2",
  "https://notifications.internal/send",
  "https://api.example.com/webhooks/github",
  "https://cdn.example.com/assets/logo.png",
  "https://api.example.com/health",
];

let idCounter = 0;
export const genId = (prefix) =>
  `${prefix}_${(++idCounter).toString(16).padStart(6, "0")}`;

export function generateExchange() {
  const method = METHODS[Math.floor(Math.random() * METHODS.length)];
  const url = URLS[Math.floor(Math.random() * URLS.length)];
  const statusCode = [200, 200, 200, 201, 204, 301, 400, 401, 404, 500, 503][
    Math.floor(Math.random() * 11)
  ];
  const latencyMs = Math.floor(Math.random() * 2000) + 10;
  const correlationId = genId("cor");
  const requestId = genId("req");
  const spanId = genId("spn");
  const hasError = statusCode >= 500 || Math.random() < 0.05;

  return {
    request: {
      id: requestId,
      correlationId,
      timestamp: Date.now(),
      direction: "outbound",
      method,
      url,
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        authorization: "[REDACTED]",
        "user-agent": "service-spy/0.1.0",
      },
      body:
        method === "POST" || method === "PUT"
          ? { data: "sample", id: Math.floor(Math.random() * 999) }
          : undefined,
      metadata: {
        spanId,
        parentSpanId: Math.random() > 0.5 ? genId("spn") : undefined,
        tags: { service: "order-service", flow: "checkout" },
      },
    },
    response:
      hasError && Math.random() < 0.3
        ? undefined
        : {
            requestId,
            correlationId,
            timestamp: Date.now() + latencyMs,
            statusCode,
            headers: {
              "content-type": "application/json",
              "x-request-id": requestId,
            },
            body:
              statusCode < 400
                ? { success: true, items: Math.floor(Math.random() * 50) }
                : { error: "Something went wrong", code: statusCode },
            latencyMs,
          },
    error: hasError
      ? {
          requestId,
          correlationId,
          timestamp: Date.now(),
          code: "ECONNREFUSED",
          message: "Connection refused to " + url,
          stack: "Error: Connection refused...",
        }
      : undefined,
  };
}
