# service-spy dashboard

A React-based developer dashboard for the [service-spy](../README.md) HTTP debugging toolkit. Visualizes live HTTP exchanges across five panels: Interceptor, Recorder, Inspector, Tracer, and Utilities.

## Getting started

Install dependencies from the project root (if you haven't already):

```bash
npm install
```

Start the dev server:

```bash
npm run dashboard:dev
```

This opens the dashboard at `http://localhost:3000` with hot-module reloading enabled.

## Available scripts

| Script | Description |
|---|---|
| `npm run dashboard:dev` | Start Vite dev server on port 3000 (auto-opens browser) |
| `npm run dashboard:build` | Production build → `dist/dashboard/` |
| `npm run dashboard:preview` | Preview the production build locally |
| `npm run test:dashboard` | Run dashboard component tests |
| `npm run test:all` | Run both library and dashboard tests |

## Panels

**Interceptor** — Live feed of outbound HTTP exchanges. Toggle the interceptor on/off and filter by method, status, or URL pattern.

**Recorder** — Records traffic sessions for later replay. Start and stop recording, browse captured sessions, and export them.

**Inspector** — Deep-dive into individual requests and responses. Explore headers, body, metadata, and timing side by side.

**Tracer** — Structured log view of all exchanges, formatted as trace entries with correlation IDs, span IDs, log levels, and latency. Supports pretty and JSON output modes.

**Utilities** — Convenience tools: redaction rules, connection health checks, and configuration helpers.

## Simulate traffic

The **Simulate Traffic** button in the header generates mock HTTP exchanges every 800 ms so you can explore the dashboard without a live backend. Click **Stop Simulation** to pause, and **Clear** to reset the exchange list.

## Project structure

```
dashboard/
├── index.html          # Vite HTML entry point
├── main.jsx            # React root mount
├── index.jsx           # ServiceSpyDashboard — top-level component and tab router
├── InterceptorPanel.jsx
├── RecorderPanel.jsx
├── InspectorPanel.jsx
├── TracerPanel.jsx
├── UtilitiesPanel.jsx
├── components.jsx      # Shared UI primitives (Badge, Pill, Card, Btn, …)
├── icons.jsx           # MUI icon wrappers with lucide-react-compatible API
├── theme.js            # Design tokens (colors, spacing)
├── mockData.js         # Mock exchange generator for simulation
└── tests/
    ├── setup.js
    ├── mockData.test.js
    ├── components.test.jsx
    └── service-spyDashboard.test.jsx
```

## Tech stack

- **React 18** with hooks
- **Material UI (MUI) v7** icons via `@mui/icons-material`
- **Vite 5** for bundling and dev server
- **Vitest + React Testing Library** for component tests

## Testing

Run the dashboard test suite:

```bash
npm run test:dashboard
```

Tests cover the mock data generator, all shared UI components, and the top-level dashboard (tab navigation, simulation toggle, exchange accumulation). 55 tests total.

To run the full test suite (library + dashboard):

```bash
npm run test:all
```

## Building for production

```bash
npm run dashboard:build
```

Output is written to `dist/dashboard/`. Serve it from any static host or embed it in the service-spy server as a built-in UI.
