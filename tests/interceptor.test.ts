import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Interceptor } from '../src/interceptor/index.js';
import http from 'node:http';

describe('Interceptor', () => {
  let interceptor: Interceptor;

  afterEach(() => {
    interceptor?.disable();
  });

  describe('lifecycle', () => {
    it('starts as inactive', () => {
      interceptor = new Interceptor();
      expect(interceptor.isActive).toBe(false);
    });

    it('activates when enabled', () => {
      interceptor = new Interceptor();
      interceptor.enable();
      expect(interceptor.isActive).toBe(true);
    });

    it('deactivates when disabled', () => {
      interceptor = new Interceptor();
      interceptor.enable();
      interceptor.disable();
      expect(interceptor.isActive).toBe(false);
    });

    it('is a no-op to enable when already active', () => {
      interceptor = new Interceptor();
      interceptor.enable();
      interceptor.enable(); // should not throw
      expect(interceptor.isActive).toBe(true);
    });

    it('is a no-op to disable when already inactive', () => {
      interceptor = new Interceptor();
      interceptor.disable(); // should not throw
      expect(interceptor.isActive).toBe(false);
    });

    it('restores original http.request after disable', () => {
      const originalRequest = http.request;
      interceptor = new Interceptor();
      interceptor.enable();
      expect(http.request).not.toBe(originalRequest);

      interceptor.disable();
      expect(http.request).toBe(originalRequest);
    });
  });

  describe('event emission', () => {
    let server: http.Server;
    let serverPort: number;

    beforeEach(async () => {
      server = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: true, echo: body || null }));
        });
      });

      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          serverPort = (server.address() as any).port;
          resolve();
        });
      });
    });

    afterEach(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('emits request:start when an HTTP request is made', async () => {
      interceptor = new Interceptor();
      interceptor.enable();

      const startPromise = new Promise((resolve) => {
        interceptor.on('request:start', resolve);
      });

      const req = http.request(`http://localhost:${serverPort}/test`);
      req.end();

      const captured = (await startPromise) as any;
      expect(captured.method).toBe('GET');
      expect(captured.url).toContain(`localhost:${serverPort}/test`);
      expect(captured.correlationId).toMatch(/^cor_/);
      expect(captured.id).toMatch(/^req_/);
    });

    it('emits exchange:captured with response data', async () => {
      interceptor = new Interceptor();
      interceptor.enable();

      const exchangePromise = new Promise((resolve) => {
        interceptor.on('exchange:captured', resolve);
      });

      const req = http.request(`http://localhost:${serverPort}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      req.write(JSON.stringify({ hello: 'world' }));
      req.end();

      const exchange = (await exchangePromise) as any;
      expect(exchange.request.method).toBe('POST');
      expect(exchange.response.statusCode).toBe(200);
      expect(exchange.response.latencyMs).toBeGreaterThanOrEqual(0);
      expect(exchange.response.body).toEqual({ received: true, echo: '{"hello":"world"}' });
      expect(exchange.request.body).toEqual({ hello: 'world' });
    });

    it('emits request:error on connection failure', async () => {
      interceptor = new Interceptor();
      interceptor.enable();

      const errorPromise = new Promise((resolve) => {
        interceptor.on('request:error', resolve);
      });

      // Use a port that's unlikely to be listening
      const req = http.request('http://localhost:1/nope');
      req.on('error', () => {}); // suppress unhandled error
      req.end();

      const error = (await errorPromise) as any;
      expect(error.code).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.correlationId).toMatch(/^cor_/);
    });
  });

  describe('filtering', () => {
    let server: http.Server;
    let serverPort: number;

    beforeEach(async () => {
      server = http.createServer((_, res) => {
        res.writeHead(200);
        res.end('ok');
      });
      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          serverPort = (server.address() as any).port;
          resolve();
        });
      });
    });

    afterEach(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('only captures requests matching the filter', async () => {
      interceptor = new Interceptor({ methods: ['POST'] });
      interceptor.enable();

      const events: any[] = [];
      interceptor.on('request:start', (e) => events.push(e));

      // GET should be filtered out
      await new Promise<void>((resolve) => {
        const req = http.request(`http://localhost:${serverPort}/get`);
        req.on('response', (res) => {
          res.resume();
          res.on('end', resolve);
        });
        req.end();
      });

      expect(events).toHaveLength(0);
    });

    it('captures requests that match the URL filter', async () => {
      interceptor = new Interceptor({ urls: ['localhost'] });
      interceptor.enable();

      const capturedPromise = new Promise((resolve) => {
        interceptor.on('exchange:captured', resolve);
      });

      const req = http.request(`http://localhost:${serverPort}/match`);
      req.end();

      const exchange = (await capturedPromise) as any;
      expect(exchange.request.url).toContain('localhost');
    });
  });

  describe('correlation header injection', () => {
    let server: http.Server;
    let serverPort: number;
    let receivedHeaders: http.IncomingHttpHeaders;

    beforeEach(async () => {
      server = http.createServer((req, res) => {
        receivedHeaders = req.headers;
        res.writeHead(200);
        res.end('ok');
      });
      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          serverPort = (server.address() as any).port;
          resolve();
        });
      });
    });

    afterEach(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('injects the x-correlation-id header into outbound requests', async () => {
      interceptor = new Interceptor();
      interceptor.enable();

      await new Promise<void>((resolve) => {
        const req = http.request(`http://localhost:${serverPort}/`, {
          headers: { 'x-correlation-id': undefined },
        });
        req.on('response', (res) => {
          res.resume();
          res.on('end', resolve);
        });
        req.end();
      });

      expect(receivedHeaders['x-correlation-id']).toMatch(/^cor_/);
    });

    it('uses a custom correlation header name', async () => {
      interceptor = new Interceptor(undefined, 'x-trace-id');
      interceptor.enable();

      await new Promise<void>((resolve) => {
        const req = http.request(`http://localhost:${serverPort}/`, {
          headers: {},
        });
        req.on('response', (res) => {
          res.resume();
          res.on('end', resolve);
        });
        req.end();
      });

      expect(receivedHeaders['x-trace-id']).toMatch(/^cor_/);
    });
  });
});
