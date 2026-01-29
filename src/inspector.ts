import { createServer, type Server } from 'node:http';
import type {
  InspectorConfig,
  CapturedExchange,
  CapturedRequest,
  CapturedError,
  InspectorEvent,
} from './types';


////////////////////////////////////////
////////////////////////////////////////
////////////////////////////////////////
////////////////////////////////////////
const DEFAULT_PORT = 8787;
const DEFAULT_SLOW_THRESHOLD = 1000;

// ANSI color helpers for terminal output
const color = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

/**
 * The Inspector provides real-time visibility into HTTP traffic.
 * It offers both a WebSocket server for UI clients and formatted
 * stdout output for terminal debugging.
 */
export class Inspector {
  private config: Required<InspectorConfig>;
  private server: Server | null = null;
  private clients: Set<import('node:net').Socket> = new Set();
  private eventBuffer: InspectorEvent[] = [];
  private running = false;

  constructor(config: InspectorConfig = {}) {
    this.config = {
      port: config.port ?? DEFAULT_PORT,
      stdout: config.stdout ?? true,
      slowThresholdMs: config.slowThresholdMs ?? DEFAULT_SLOW_THRESHOLD,
    };
  }

  /**
   * Start the inspector server for real-time streaming.
   */
  async start(): Promise<void> {
    if (this.running) return;

    this.server = createServer((req, res) => {
      // Simple SSE endpoint for real-time streaming
      if (req.url === '/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });

        this.clients.add(res.socket!);
        res.socket!.on('close', () => {
          this.clients.delete(res.socket!);
        });

        // Send buffered events
        for (const event of this.eventBuffer) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
        return;
      }

      // Dashboard HTML
      if (req.url === '/' || req.url === '/dashboard') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(this.getDashboardHtml());
        return;
      }

      // JSON API for recent events
      if (req.url === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(this.eventBuffer));
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    return new Promise((resolve) => {
      this.server!.listen(this.config.port, () => {
        this.running = true;
        if (this.config.stdout) {
          console.log(
            `${color.cyan}[service-spy]${color.reset} Inspector running at ${color.bold}http://localhost:${this.config.port}/dashboard${color.reset}`
          );
        }
        resolve();
      });
    });
  }

  /**
   * Stop the inspector server.
   */
  async stop(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.running = false;
        this.server = null;
        this.clients.clear();
        resolve();
      });
    });
  }

  /**
   * Called when a new outbound request starts.
   */
  onRequestStart(request: CapturedRequest): void {
    const event: InspectorEvent = {
      type: 'request:start',
      timestamp: Date.now(),
      data: request,
    };

    this.pushEvent(event);

    if (this.config.stdout) {
      const method = this.colorMethod(request.method);
      const ts = this.formatTime();
      console.log(
        `${color.dim}${ts}${color.reset} ${color.cyan}→${color.reset} ${method} ${request.url} ${color.dim}[${request.correlationId}]${color.reset}`
      );
    }
  }

  /**
   * Called when a request completes (success or error).
   */
  onRequestEnd(exchange: CapturedExchange): void {
    const event: InspectorEvent = {
      type: exchange.error ? 'request:error' : 'request:end',
      timestamp: Date.now(),
      data: exchange.response ?? exchange.error!,
    };

    this.pushEvent(event);

    if (this.config.stdout) {
      const ts = this.formatTime();

      if (exchange.error) {
        console.log(
          `${color.dim}${ts}${color.reset} ${color.red}✗${color.reset} ${exchange.request.method} ${exchange.request.url} ${color.red}${exchange.error.code}: ${exchange.error.message}${color.reset} ${color.dim}[${exchange.request.correlationId}]${color.reset}`
        );
        return;
      }

      if (exchange.response) {
        const status = this.colorStatus(exchange.response.statusCode);
        const latency = this.colorLatency(exchange.response.latencyMs);
        console.log(
          `${color.dim}${ts}${color.reset} ${color.green}←${color.reset} ${status} ${exchange.request.method} ${exchange.request.url} ${latency} ${color.dim}[${exchange.request.correlationId}]${color.reset}`
        );
      }
    }
  }

  /**
   * Called on request error.
   */
  onRequestError(error: CapturedError): void {
    const event: InspectorEvent = {
      type: 'request:error',
      timestamp: Date.now(),
      data: error,
    };

    this.pushEvent(event);

    if (this.config.stdout) {
      const ts = this.formatTime();
      console.log(
        `${color.dim}${ts}${color.reset} ${color.bgRed}${color.bold} ERR ${color.reset} ${color.red}${error.code}: ${error.message}${color.reset} ${color.dim}[${error.correlationId}]${color.reset}`
      );
    }
  }

  get isRunning(): boolean {
    return this.running;
  }


  // ##########  Private helpers ───────────────────────────────────────────

  private pushEvent(event: InspectorEvent): void {
    this.eventBuffer.push(event);

    // Keep buffer bounded
    if (this.eventBuffer.length > 500) {
      this.eventBuffer = this.eventBuffer.slice(-250);
    }

    // Broadcast to SSE clients
    this.broadcast(event);
  }

  private broadcast(event: InspectorEvent): void {
    if (!this.server) return;
    // We'd broadcast over SSE connections here.
    // The actual SSE write happens through the response objects,
    // which we'd need to track separately. For now, the /api/events
    // endpoint provides polling access.
  }

  private formatTime(): string {
    return new Date().toISOString().slice(11, 23);
  }

  private colorMethod(method: string): string {
    const colors: Record<string, string> = {
      GET: color.green,
      POST: color.yellow,
      PUT: color.blue,
      PATCH: color.cyan,
      DELETE: color.red,
    };
    const c = colors[method] ?? color.magenta;
    return `${c}${color.bold}${method.padEnd(7)}${color.reset}`;
  }

  private colorStatus(code: number): string {
    if (code >= 500) return `${color.bgRed}${color.bold} ${code} ${color.reset}`;
    if (code >= 400) return `${color.red}${code}${color.reset}`;
    if (code >= 300) return `${color.yellow}${code}${color.reset}`;
    return `${color.green}${code}${color.reset}`;
  }

  private colorLatency(ms: number): string {
    const formatted = ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
    if (ms >= this.config.slowThresholdMs) {
      return `${color.bgYellow}${color.bold} ${formatted} ${color.reset}`;
    }
    if (ms >= this.config.slowThresholdMs / 2) {
      return `${color.yellow}${formatted}${color.reset}`;
    }
    return `${color.dim}${formatted}${color.reset}`;
  }

  private getDashboardHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>service-spy inspector</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'SF Mono', 'Fira Code', monospace; background: #0d1117; color: #c9d1d9; padding: 20px; }
    h1 { color: #58a6ff; margin-bottom: 20px; font-size: 18px; }
    .event { padding: 8px 12px; border-bottom: 1px solid #21262d; font-size: 13px; display: flex; gap: 12px; align-items: center; }
    .event:hover { background: #161b22; }
    .time { color: #484f58; min-width: 90px; }
    .method { font-weight: bold; min-width: 70px; }
    .method.GET { color: #3fb950; }
    .method.POST { color: #d29922; }
    .method.PUT { color: #58a6ff; }
    .method.DELETE { color: #f85149; }
    .status { min-width: 40px; }
    .status.s2xx { color: #3fb950; }
    .status.s3xx { color: #d29922; }
    .status.s4xx { color: #f85149; }
    .status.s5xx { color: #ff7b72; font-weight: bold; }
    .url { color: #c9d1d9; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .latency { color: #484f58; min-width: 60px; text-align: right; }
    .latency.slow { color: #d29922; }
    .latency.very-slow { color: #f85149; font-weight: bold; }
    .correlation { color: #484f58; font-size: 11px; }
    .error { color: #f85149; }
    #events { max-height: calc(100vh - 80px); overflow-y: auto; }
    .empty { color: #484f58; padding: 40px; text-align: center; }
  </style>
</head>
<body>
  <h1>service-spy inspector</h1>
  <div id="events"><div class="empty">Waiting for requests...</div></div>
  <script>
    const eventsEl = document.getElementById('events');
    const source = new EventSource('/events');
    let hasEvents = false;
    source.onmessage = (e) => {
      if (!hasEvents) { eventsEl.innerHTML = ''; hasEvents = true; }
      const event = JSON.parse(e.data);
      const div = document.createElement('div');
      div.className = 'event';
      const data = event.data;
      if (event.type === 'request:start') {
        div.innerHTML = '<span class="time">' + new Date(event.timestamp).toISOString().slice(11,23) + '</span>' +
          '<span class="method ' + (data.method||'') + '">' + (data.method||'') + '</span>' +
          '<span>→</span>' +
          '<span class="url">' + (data.url||'') + '</span>';
      } else if (event.type === 'request:end') {
        const code = data.statusCode || 0;
        const cls = code >= 500 ? 's5xx' : code >= 400 ? 's4xx' : code >= 300 ? 's3xx' : 's2xx';
        div.innerHTML = '<span class="time">' + new Date(event.timestamp).toISOString().slice(11,23) + '</span>' +
          '<span class="status ' + cls + '">' + code + '</span>' +
          '<span>←</span>' +
          '<span class="url">' + (data.requestId||'') + '</span>' +
          '<span class="latency">' + (data.latencyMs||0) + 'ms</span>';
      } else if (event.type === 'request:error') {
        div.innerHTML = '<span class="time">' + new Date(event.timestamp).toISOString().slice(11,23) + '</span>' +
          '<span class="error">ERR ' + (data.code||'') + ': ' + (data.message||'') + '</span>';
      }
      eventsEl.appendChild(div);
      eventsEl.scrollTop = eventsEl.scrollHeight;
    };
  </script>
</body>
</html>`;
  }
}
