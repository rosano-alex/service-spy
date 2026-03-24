<p style="text-align: Left;"><img src="img/logo.png" width="560"></p>

**service-spy** is a minimal, composable debugging toolkit for server-to-server HTTP communication.

It gives you **full visibility into your network layer** with interception, recording, replay, inspection, and tracing, all in a single lightweight runtime.

---

##  Features

- **Intercept HTTP traffic** (Node.js)
- **Record & replay** real request/response exchanges
- **Live inspector UI** for real-time debugging
- **Distributed tracing** with correlation IDs
-  **Context propagation utilities**
- Modular architecture, use only what you need

---

##  Installation

```bash
npm install service-spy
```

---

##  Quick Start

```ts
import { service-spy } from 'service-spy';

const service-spy = new service-spy({
  intercept: true,
  recorder: { storagePath: '.service-spy/recordings' },
  inspector: { port: 8787, stdout: true },
  tracer: { serviceName: 'order-service', format: 'pretty' },
});

await service-spy.start();
```

---

## Core Concepts

### Interceptor
Captures outgoing HTTP requests and responses.

- Emits lifecycle events:
  - `request:start`
  - `request:end`
  -:captured`

### Recorder
Persists HTTP exchanges for replay and analysis.

- Session-based recording
- File-backed storage
- Deterministic replay

### Inspector
Live debugging interface.

- Real-time request visualization
- Optional web dashboard
- CLI/stdout support

### Tracer
Adds observability and correlation across services.

- Correlation IDs (`x-correlation-id` by default)
- Latency tracking
- Structured logs

---

##  Recording & Replay

### Start Recording

```ts
const session = service-spy.startRecording('checkout-flow', {
  env: 'staging',
});
```

### Stop Recording

```ts
await service-spy.stopRecording();
```

### Replay

```ts
for await (const exchange of service-spy.replay(session.id)) {
  console.log(exchange.request.url);
}
```

### List Sessions

```ts
const sessions = await service-spy.listSessions();
```

---

##  Inspector

Enable the inspector:

```ts
const service-spy = new service-spy({
  inspector: { port: 8787 }
});
```

Then open:

http://localhost:8787

---

##  Tracing

```ts
const service-spy = new service-spy({
  tracer: {
    serviceName: 'payments',
    correlationHeader: 'x-correlation-id',
  }
});
```

---

## Context Utilities

```ts
import {
  withContext,
  getContext,
  getCorrelationId,
  addContextTags
} from 'service-spy';
```

Example:

```ts
await withContext({ userId: '123' }, async () => {
  const ctx = getContext();
});
```

---

##  Configuration

```ts
type service-spyConfig = {
  intercept?: boolean;

  filter?: (url: string) => boolean;

  recorder?: {
    storagePath: string;
  };

  inspector?: {
    port?: number;
    stdout?: boolean;
  };

  tracer?: {
    serviceName: string;
    correlationHeader?: string;
    format?: 'pretty' | 'json';
  };
};
```

---
## 🧱 Advanced Usage

```ts
const interceptor = service-spy.getInterceptor();
const recorder = service-spy.getRecorder();
const inspector = service-spy.getInspector();
const tracer = service-spy.getTracer();
```

---

##  Project Structure

```
src/
  interceptor/
  recorder/
  inspector/
  tracer/
  utils/
```

---

##  Use Cases

- Debugging microservices communication
- Reproducing production bugs locally
- Contract testing with real traffic
- Observability without heavy infra
- Building internal devtools

---

## ⚡ Philosophy

- Capture once, reuse forever
- Make invisible systems visible
- Stay lightweight and composable
- Work with your stack, not against it

---

## 🛠 Roadmap

- Browser support
- Distributed replay across services
- Plugin ecosystem
- Cloud session storage
- Deeper OpenTelemetry integration

---

##  Contributing

PRs welcome. Keep it small, composable, and focused.

---

##  License

MIT
