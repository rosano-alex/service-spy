import { useState } from "react";
import {
  Activity,
  FileText,
  Search,
  Play,
  Square,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
} from "./icons.jsx";
import { T, methodColor, statusColor } from "./theme.js";
import { Card, CardHeader, StatBox, Btn } from "./components.jsx";

export function InspectorPanel({ exchanges }) {
  const [inspectorRunning, setInspectorRunning] = useState(false);
  const [port, setPort] = useState(8787);
  const [slowThreshold, setSlowThreshold] = useState(1000);
  const [showStdout, setShowStdout] = useState(true);

  const stats = (() => {
    let s2xx = 0,
      s4xx = 0,
      s5xx = 0,
      errors = 0,
      totalLat = 0,
      count = 0;
    exchanges.forEach((ex) => {
      if (ex.error) errors++;
      if (ex.response) {
        const c = ex.response.statusCode;
        if (c >= 200 && c < 300) s2xx++;
        else if (c >= 400 && c < 500) s4xx++;
        else if (c >= 500) s5xx++;
        totalLat += ex.response.latencyMs;
        count++;
      }
    });
    return {
      s2xx,
      s4xx,
      s5xx,
      errors,
      avgLat: count ? Math.round(totalLat / count) : 0,
      total: exchanges.length,
    };
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHeader
          title="Live Inspector"
          subtitle={
            inspectorRunning ? `Streaming on port ${port}` : "Stopped"
          }
          icon={Search}
          right={
            <Btn
              onClick={() => setInspectorRunning(!inspectorRunning)}
              variant={inspectorRunning ? "danger" : "primary"}
              size="sm"
              icon={inspectorRunning ? Square : Play}
            >
              {inspectorRunning ? "Stop Server" : "Start Server"}
            </Btn>
          }
        />
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 20px",
            borderBottom: "1px solid " + T.border,
            alignItems: "center",
          }}
        >
          <Settings size={13} color={T.textDim} />
          <label style={{ fontSize: 11, color: T.textDim }}>Port:</label>
          <input
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            style={{
              width: 60,
              background: T.surfaceAlt,
              border: "1px solid " + T.border,
              borderRadius: 4,
              color: T.text,
              padding: "3px 6px",
              fontSize: 11,
              fontFamily: "monospace",
            }}
          />
          <label style={{ fontSize: 11, color: T.textDim, marginLeft: 12 }}>
            Slow threshold:
          </label>
          <input
            value={slowThreshold}
            onChange={(e) => setSlowThreshold(Number(e.target.value))}
            style={{
              width: 60,
              background: T.surfaceAlt,
              border: "1px solid " + T.border,
              borderRadius: 4,
              color: T.text,
              padding: "3px 6px",
              fontSize: 11,
              fontFamily: "monospace",
            }}
          />
          <span style={{ fontSize: 11, color: T.textDim }}>ms</span>
          <label
            style={{
              fontSize: 11,
              color: T.textDim,
              marginLeft: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={showStdout}
              onChange={(e) => setShowStdout(e.target.checked)}
            />
            stdout
          </label>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatBox label="Total" value={stats.total} icon={Activity} />
        <StatBox
          label="2xx Success"
          value={stats.s2xx}
          color={T.green}
          icon={CheckCircle}
        />
        <StatBox
          label="4xx Client"
          value={stats.s4xx}
          color={T.yellow}
          icon={AlertTriangle}
        />
        <StatBox
          label="5xx Server"
          value={stats.s5xx}
          color={T.red}
          icon={XCircle}
        />
        <StatBox
          label="Avg Latency"
          value={`${stats.avgLat}ms`}
          icon={Clock}
        />
      </div>

      {showStdout && inspectorRunning && (
        <Card>
          <CardHeader
            title="Terminal Output"
            subtitle="Formatted stdout stream"
            icon={FileText}
          />
          <div
            style={{
              maxHeight: 300,
              overflowY: "auto",
              padding: 12,
              background: "#f8fafc",
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              fontSize: 12,
              lineHeight: "20px",
            }}
          >
            {exchanges.slice(-30).map((ex, i) => {
              const ts = new Date(ex.request.timestamp)
                .toISOString()
                .slice(11, 23);
              const mc = methodColor[ex.request.method] || T.text;
              if (ex.error) {
                return (
                  <div key={i}>
                    <span style={{ color: T.textMuted }}>{ts}</span>{" "}
                    <span style={{ color: T.red, fontWeight: 700 }}>
                      ERR
                    </span>{" "}
                    <span style={{ color: T.red }}>
                      {ex.error.code}: {ex.error.message}
                    </span>{" "}
                    <span style={{ color: T.textMuted }}>
                      [{ex.request.correlationId}]
                    </span>
                  </div>
                );
              }
              const sc = ex.response?.statusCode;
              const lat = ex.response?.latencyMs;
              return (
                <div key={i}>
                  <span style={{ color: T.textMuted }}>{ts}</span>{" "}
                  <span style={{ color: T.green }}>
                    {sc ? "\u2190" : "\u2192"}
                  </span>{" "}
                  {sc && (
                    <span
                      style={{
                        color: statusColor(sc),
                        fontWeight: 600,
                      }}
                    >
                      {sc}{" "}
                    </span>
                  )}
                  <span style={{ color: mc, fontWeight: 600 }}>
                    {ex.request.method.padEnd(7)}
                  </span>{" "}
                  <span style={{ color: T.text }}>{ex.request.url}</span>{" "}
                  {lat != null && (
                    <span
                      style={{
                        color:
                          lat > slowThreshold
                            ? T.red
                            : lat > slowThreshold / 2
                              ? T.yellow
                              : T.textMuted,
                      }}
                    >
                      {lat}ms
                    </span>
                  )}{" "}
                  <span style={{ color: T.textMuted }}>
                    [{ex.request.correlationId}]
                  </span>
                </div>
              );
            })}
            {exchanges.length === 0 && (
              <span style={{ color: T.textMuted }}>
                Waiting for requests...
              </span>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
