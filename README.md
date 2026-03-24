# Service-Spy

**service-spy** is a minimal, composable debugging toolkit for server-to-server HTTP communication. It gives you full visibility into your network layer with interception, recording, replay, inspection, and tracing, all in a single lightweight runtime.


##  Features

- **Intercept HTTP traffic** (Node.js)
- **Record & replay** real request/response exchanges
- **Live inspector UI** for real-time debugging
- **Distributed tracing** with correlation IDs
-  **Context propagation utilities**
- Modular architecture, use only what you need

<b>
##  Installation

```bash
npm install @codigos/service-spy
```


##  Quick Start

```ts
import { ServiceSpy } from '@codigos/service-spy';

const serviceSpy = new ServiceSpy({
  intercept: true,
  recorder: { storagePath: '.service-spy/recordings' },
  inspector: { port: 8787, stdout: true },
  tracer: { serviceName: 'order-service', format: 'pretty' },
});

await serviceSpy.start();
```



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



##  Recording & Replay

### Start Recording

```ts
const session = serviceSpy.startRecording('checkout-flow', {
  env: 'staging',
});
```

### Stop Recording

```ts
await serviceSpy.stopRecording();
```

### Replay

```ts
for await (const exchange of serviceSpy.replay(session.id)) {
  console.log(exchange.request.url);
}
```

### List Sessions

```ts
const sessions = await serviceSpy.listSessions();
```



##  Inspector

Enable the inspector:

```ts
const serviceSpy = new ServiceSpy({
  inspector: { port: 8787 }
});
```

Then open:

http://localhost:8787



##  Tracing

```ts
const serviceSpy = new ServiceSpy({
  tracer: {
    serviceName: 'payments',
    correlationHeader: 'x-correlation-id',
  }
});
```



## Context Utilities

```ts
import {
  withContext,
  getContext,
  getCorrelationId,
  addContextTags
} from '@codigos/service-spy';
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
type ServiceSpyConfig = {
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




##  Contributing

Contributions are welcome and should align with the library’s core principles. Please open an issue before major changes, follow the existing code style, include tests, and ensure all commits are good quality.


##  License

MIT
