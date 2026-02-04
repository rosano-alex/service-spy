/**
 * Basic usage example — wire service-spy into an Express-like service
 * and watch all outbound HTTP calls in real time.
 */

import { ServiceSpy, withContext } from '../src/index.js';
import http from 'node:http';
import { generateCorrelationId, generateSpanId } from '../src/utils/ids.js';

// ##########.  1. Create and configure service-spy ──────────────────────────

const scope = new ServiceSpy({
  // Intercept all outbound HTTP/HTTPS calls
  intercept: true,

  // Only capture calls to our internal services
  filter: {
    urls: ['api.example.com', 'localhost'],
    excludeUrls: ['/health', '/ready'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },

  // Record traffic for later replay
  recorder: {
    storagePath: '.service-spy/recordings',
    redactHeaders: ['authorization', 'x-api-key'],
    redactBodyPaths: ['password', 'user.ssn', 'creditCard.number'],
  },

  // Live inspection dashboard + terminal output
  inspector: {
    port: 8787,
    stdout: true,
    slowThresholdMs: 500,
  },

  // Structured tracing with correlation IDs
  tracer: {
    serviceName: 'order-service',
    level: 'info',
    format: 'pretty',
    propagateCorrelation: true,
  },
});

// ##########.  2. Start service-spy ─────────────────────────────────────────

async function main() {
  await scope.start();

  // Start a recording session
  scope.startRecording('debug-checkout-flow', {
    developer: 'alex',
    ticket: 'PROJ-1234',
  });


  // ##########  3. Simulate some service-to-service calls ────────────────

  // Wrap in a correlation context so all nested calls share the same ID
  withContext(
    {
      correlationId: generateCorrelationId(),
      spanId: generateSpanId(),
      tags: { flow: 'checkout', userId: 'user_abc123' },
    },
    () => {
      // This outbound call will be automatically intercepted, logged,
      // and recorded — no changes to the calling code needed.
      const req = http.request(
        'http://localhost:3001/api/inventory/check',
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            console.log('\nInventory response:', body);
          });
        }
      );

      req.write(JSON.stringify({ sku: 'WIDGET-001', quantity: 2 }));
      req.end();
    }
  );


  // ##########  4. Later: stop recording and inspect the session ─────────

  // In a real app, you'd stop recording when the debug session ends
  setTimeout(async () => {
    const session = await scope.stopRecording();
    console.log(`\nRecorded ${session.exchanges.length} exchanges`);

    // Get session summary
    const summary = await scope.sessionSummary(session.id);
    console.log('Session summary:', summary);

    // Replay the session for assertions in tests
    for await (const exchange of scope.replay(session.id)) {
      console.log(
        `Replayed: ${exchange.request.method} ${exchange.request.url}`,
        exchange.response?.statusCode ?? 'ERROR'
      );
    }

    await scope.stop();
  }, 5000);
}

main().catch(console.error);

// ##########.  
//  5. Using individual modules standalone 

/*
 * You don't have to use the all-in-one ServiceSpy class.
 * Each module works independently:
 *
 * import { Interceptor } from '@codigos/service-spy';
 *
 * const interceptor = new Interceptor({ urls: ['api.example.com'] });
 * interceptor.on('exchange:captured', (exchange) => {
 *   console.log(exchange.request.url, exchange.response?.statusCode);
 * });
 * interceptor.enable();
 *
 * // Or just the recorder for test fixtures:
 * import { Recorder } from '@codigos/service-spy';
 *
 * const recorder = new Recorder({ storagePath: './fixtures' });
 * recorder.startSession('test-happy-path');
 * // ... make HTTP calls ...
 * await recorder.stopSession();
 */
