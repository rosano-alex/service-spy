import { useState } from "react";
import { Settings, BarChart3 } from "./icons.jsx";
import { T, methodColor, statusColor } from "./theme.js";
import { Card, CardHeader, EmptyState } from "./components.jsx";

export function TracerPanel({ exchanges }) {
  const [serviceName, setServiceName] = useState("order-service");
  const [level, setLevel] = useState("info");
  const [format, setFormat] = useState("pretty");
  const [filterLevel, setFilterLevel] = useState("ALL");

  const levelOrder = { debug: 0, info: 1, warn: 2, error: 3 };
  const levelColor = {
    debug: T.textDim,
    info: T.cyan,
    warn: T.yellow,
    error: T.red,
  };

  const traces = exchanges
    .map((ex) => {
      const lvl = ex.error
        ? "error"
        : !ex.response?.statusCode
          ? "warn"
          : ex.response.statusCode >= 500
            ? "error"
            : ex.response.statusCode >= 400
              ? "warn"
              : "info";
      return {
        timestamp: new Date(ex.request.timestamp).toISOString(),
        level: lvl,
        correlationId: ex.request.correlationId,
        spanId: ex.request.metadata.spanId || "",
        service: serviceName,
        method: ex.request.method,
        url: ex.request.url,
        statusCode: ex.response?.statusCode,
        latencyMs: ex.response?.latencyMs,
        error: ex.error?.message,
        tags: ex.request.metadata.tags || {},
      };
    })
    .filter((t) => {
      if (filterLevel === "ALL") return true;
      return levelOrder[t.level] >= levelOrder[filterLevel];
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHeader
          title="Structured Tracer"
          subtitle={`${traces.length} trace entries`}
          icon={BarChart3}
        />
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 20px",
            borderBottom: "1px solid " + T.border,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Settings size={13} color={T.textDim} />
          <label style={{ fontSize: 11, color: T.textDim }}>Service:</label>
          <input
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            style={{
              width: 120,
              background: T.surfaceAlt,
              border: "1px solid " + T.border,
              borderRadius: 4,
              color: T.text,
              padding: "3px 6px",
              fontSize: 11,
              fontFamily: "monospace",
            }}
          />
          <label style={{ fontSize: 11, color: T.textDim, marginLeft: 8 }}>
            Level:
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            style={{
              background: T.surfaceAlt,
              border: "1px solid " + T.border,
              borderRadius: 4,
              color: T.text,
              padding: "3px 6px",
              fontSize: 11,
            }}
          >
            <option value="debug">debug</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </select>
          <label style={{ fontSize: 11, color: T.textDim, marginLeft: 8 }}>
            Format:
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={{
              background: T.surfaceAlt,
              border: "1px solid " + T.border,
              borderRadius: 4,
              color: T.text,
              padding: "3px 6px",
              fontSize: 11,
            }}
          >
            <option value="pretty">pretty</option>
            <option value="json">json</option>
          </select>
          <label style={{ fontSize: 11, color: T.textDim, marginLeft: 8 }}>
            Filter:
          </label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            style={{
              background: T.surfaceAlt,
              border: "1px solid " + T.border,
              borderRadius: 4,
              color: T.text,
              padding: "3px 6px",
              fontSize: 11,
            }}
          >
            <option value="ALL">All</option>
            <option value="debug">debug+</option>
            <option value="info">info+</option>
            <option value="warn">warn+</option>
            <option value="error">error only</option>
          </select>
        </div>
      </Card>

      <Card>
        <div
          style={{
            maxHeight: 460,
            overflowY: "auto",
            background: format === "json" ? "#f8fafc" : T.surface,
          }}
        >
          {traces.length === 0 ? (
            <EmptyState icon={BarChart3} message="No trace entries yet" />
          ) : format === "json" ? (
            <div
              style={{
                padding: 12,
                fontFamily: "monospace",
                fontSize: 11,
                lineHeight: "18px",
                background: "#f8fafc",
              }}
            >
              {traces.slice(-50).map((t, i) => (
                <div
                  key={i}
                  style={{ color: levelColor[t.level], marginBottom: 2 }}
                >
                  {JSON.stringify(t)}
                </div>
              ))}
            </div>
          ) : (
            traces.slice(-50).map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "6px 16px",
                  borderBottom: "1px solid " + T.border,
                  fontSize: 12,
                  fontFamily: "monospace",
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    color: T.textMuted,
                    minWidth: 190,
                    fontSize: 11,
                  }}
                >
                  {t.timestamp}
                </span>
                <span
                  style={{
                    color: levelColor[t.level],
                    fontWeight: 700,
                    minWidth: 42,
                  }}
                >
                  {t.level.toUpperCase().padEnd(5)}
                </span>
                <span style={{ color: T.textDim }}>[{t.service}]</span>
                <span
                  style={{
                    color: methodColor[t.method] || T.text,
                    fontWeight: 600,
                  }}
                >
                  {t.method}
                </span>
                <span
                  style={{
                    flex: 1,
                    color: T.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.url}
                </span>
                {t.statusCode && (
                  <span style={{ color: statusColor(t.statusCode) }}>
                    {t.statusCode}
                  </span>
                )}
                {t.latencyMs != null && (
                  <span style={{ color: T.textDim }}>{t.latencyMs}ms</span>
                )}
                {t.error && (
                  <span style={{ color: T.red }}>{t.error}</span>
                )}
                <span style={{ color: T.textMuted, fontSize: 10 }}>
                  cor={t.correlationId}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
