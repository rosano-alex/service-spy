import { useState, useEffect, useRef } from "react";
import {
  Activity,
  Play,
  Square,
  Eye,
  Zap,
  XCircle,
  Filter,
} from "./icons.jsx";
import { T, methodColor, statusColor, METHODS } from "./theme.js";
import { Badge, Card, CardHeader, Btn, EmptyState, JsonView } from "./components.jsx";

export function InterceptorPanel({
  exchanges,
  interceptorActive,
  setInterceptorActive,
}) {
  const [selected, setSelected] = useState(null);
  const [filterMethod, setFilterMethod] = useState("ALL");
  const [filterUrl, setFilterUrl] = useState("");
  const listRef = useRef(null);

  const filtered = exchanges.filter((ex) => {
    if (filterMethod !== "ALL" && ex.request.method !== filterMethod)
      return false;
    if (
      filterUrl &&
      !ex.request.url.toLowerCase().includes(filterUrl.toLowerCase())
    )
      return false;
    return true;
  });

  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [filtered.length]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: selected ? "1fr 1fr" : "1fr",
        gap: 16,
        height: "100%",
      }}
    >
      <Card>
        <CardHeader
          title="HTTP Interceptor"
          subtitle={`${exchanges.length} exchanges captured`}
          icon={Zap}
          right={
            <div style={{ display: "flex", gap: 8 }}>
              <Btn
                onClick={() => setInterceptorActive(!interceptorActive)}
                variant={interceptorActive ? "danger" : "success"}
                size="sm"
                icon={interceptorActive ? Square : Play}
              >
                {interceptorActive ? "Disable" : "Enable"}
              </Btn>
            </div>
          }
        />
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "10px 16px",
            borderBottom: "1px solid " + T.border,
            alignItems: "center",
          }}
        >
          <Filter size={13} color={T.textDim} />
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            style={{
              background: T.surfaceAlt,
              border: "1px solid " + T.border,
              borderRadius: 4,
              color: T.text,
              padding: "4px 8px",
              fontSize: 11,
            }}
          >
            <option value="ALL">All Methods</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            value={filterUrl}
            onChange={(e) => setFilterUrl(e.target.value)}
            placeholder="Filter by URL..."
            style={{
              flex: 1,
              background: T.surfaceAlt,
              border: "1px solid " + T.border,
              borderRadius: 4,
              color: T.text,
              padding: "4px 8px",
              fontSize: 11,
              outline: "none",
            }}
          />
        </div>
        <div ref={listRef} style={{ maxHeight: 440, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Activity}
              message={
                interceptorActive
                  ? "Waiting for HTTP traffic..."
                  : "Interceptor is disabled"
              }
            />
          ) : (
            filtered.map((ex, i) => {
              const sc = ex.response?.statusCode;
              const err = ex.error;
              return (
                <div
                  key={i}
                  onClick={() => setSelected(ex)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 16px",
                    borderBottom: "1px solid " + T.border,
                    cursor: "pointer",
                    background:
                      selected === ex ? T.accentGlow : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <Badge color={methodColor[ex.request.method] || T.text}>
                    {ex.request.method.padEnd(6)}
                  </Badge>
                  {sc && (
                    <Badge
                      color={statusColor(sc)}
                      bg={
                        sc >= 400
                          ? sc >= 500
                            ? T.redDim
                            : T.yellowDim
                          : T.greenDim
                      }
                    >
                      {sc}
                    </Badge>
                  )}
                  {err && !sc && (
                    <Badge color={T.red} bg={T.redDim}>
                      ERR
                    </Badge>
                  )}
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: T.text,
                      fontFamily: "monospace",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ex.request.url}
                  </span>
                  {ex.response && (
                    <span
                      style={{
                        fontSize: 11,
                        color:
                          ex.response.latencyMs > 1000
                            ? T.red
                            : ex.response.latencyMs > 500
                              ? T.yellow
                              : T.textDim,
                        fontFamily: "monospace",
                      }}
                    >
                      {ex.response.latencyMs}ms
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      color: T.textMuted,
                      fontFamily: "monospace",
                    }}
                  >
                    {new Date(ex.request.timestamp)
                      .toISOString()
                      .slice(11, 23)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {selected && (
        <Card>
          <CardHeader
            title="Exchange Detail"
            subtitle={selected.request.id}
            icon={Eye}
            right={
              <Btn size="sm" onClick={() => setSelected(null)} icon={XCircle}>
                Close
              </Btn>
            }
          />
          <div style={{ padding: 16, maxHeight: 500, overflowY: "auto" }}>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  color: T.textDim,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Request
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  background: T.surfaceAlt,
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid " + T.border,
                }}
              >
                <JsonView
                  data={{
                    method: selected.request.method,
                    url: selected.request.url,
                    headers: selected.request.headers,
                    body: selected.request.body,
                    correlationId: selected.request.correlationId,
                    metadata: selected.request.metadata,
                  }}
                />
              </div>
            </div>
            {selected.response && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: T.textDim,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Response
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    background: T.surfaceAlt,
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid " + T.border,
                  }}
                >
                  <JsonView data={selected.response} />
                </div>
              </div>
            )}
            {selected.error && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.red,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Error
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    background: T.redDim,
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid " + T.red,
                    color: T.red,
                  }}
                >
                  <JsonView data={selected.error} />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
