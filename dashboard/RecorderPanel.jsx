import { useState, useRef } from "react";
import {
  Activity,
  Radio,
  Database,
  Play,
  Square,
  Zap,
  Clock,
  AlertTriangle,
  XCircle,
} from "./icons.jsx";
import { T, methodColor, statusColor } from "./theme.js";
import { genId } from "./mockData.js";
import { Badge, Card, CardHeader, StatBox, Btn, EmptyState } from "./components.jsx";

export function RecorderPanel({ exchanges }) {
  const [sessions, setSessions] = useState([]);
  const [recording, setRecording] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [viewingSession, setViewingSession] = useState(null);
  const capturedRef = useRef(0);

  const startRecording = () => {
    const session = {
      id: genId("ses"),
      name: `session-${new Date().toISOString().slice(0, 19)}`,
      startedAt: Date.now(),
      exchanges: [],
      metadata: { developer: "alex", ticket: "PROJ-1234" },
    };
    setActiveSession(session);
    setRecording(true);
    capturedRef.current = exchanges.length;
  };

  const stopRecording = () => {
    if (!activeSession) return;
    const newExchanges = exchanges.slice(capturedRef.current);
    const finalized = {
      ...activeSession,
      endedAt: Date.now(),
      exchanges: newExchanges,
    };
    setSessions((prev) => [finalized, ...prev]);
    setActiveSession(null);
    setRecording(false);
  };

  const getSummary = (session) => {
    const exs = session.exchanges;
    let errors = 0,
      totalLatency = 0,
      count = 0,
      statusCodes = {};
    exs.forEach((ex) => {
      if (ex.error) errors++;
      if (ex.response) {
        totalLatency += ex.response.latencyMs;
        count++;
        statusCodes[ex.response.statusCode] =
          (statusCodes[ex.response.statusCode] || 0) + 1;
      }
    });
    return {
      total: exs.length,
      errors,
      avgLatency: count ? Math.round(totalLatency / count) : 0,
      duration: (session.endedAt || Date.now()) - session.startedAt,
      statusCodes,
    };
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: viewingSession ? "1fr 1fr" : "1fr",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <CardHeader
            title="Session Recorder"
            subtitle={
              recording
                ? `Recording... (${exchanges.length - capturedRef.current} captured)`
                : `${sessions.length} saved sessions`
            }
            icon={Radio}
            right={
              <Btn
                onClick={recording ? stopRecording : startRecording}
                variant={recording ? "danger" : "primary"}
                size="sm"
                icon={recording ? Square : Play}
              >
                {recording ? "Stop Recording" : "Start Recording"}
              </Btn>
            }
          />
          {recording && activeSession && (
            <div
              style={{
                padding: "12px 20px",
                background: T.redDim,
                borderBottom: "1px solid " + T.border,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: T.red,
                  animation: "pulse 1.5s infinite",
                }}
              />
              <span
                style={{ fontSize: 12, color: T.red, fontWeight: 600 }}
              >
                RECORDING
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: T.textDim,
                  marginLeft: "auto",
                }}
              >
                {activeSession.name}
              </span>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Saved Sessions"
            subtitle="Click to inspect & replay"
            icon={Database}
          />
          {sessions.length === 0 ? (
            <EmptyState icon={Database} message="No recorded sessions yet" />
          ) : (
            sessions.map((s) => {
              const summary = getSummary(s);
              return (
                <div
                  key={s.id}
                  onClick={() => setViewingSession(s)}
                  style={{
                    padding: "12px 20px",
                    borderBottom: "1px solid " + T.border,
                    cursor: "pointer",
                    background:
                      viewingSession?.id === s.id
                        ? T.accentGlow
                        : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.text,
                      }}
                    >
                      {s.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: T.textDim,
                        fontFamily: "monospace",
                      }}
                    >
                      {s.id}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      fontSize: 11,
                      color: T.textDim,
                    }}
                  >
                    <span>{summary.total} exchanges</span>
                    <span>{summary.errors} errors</span>
                    <span>~{summary.avgLatency}ms avg</span>
                    <span>{(summary.duration / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {viewingSession && (
        <Card>
          <CardHeader
            title="Session Replay"
            subtitle={viewingSession.name}
            icon={Play}
            right={
              <Btn
                size="sm"
                onClick={() => setViewingSession(null)}
                icon={XCircle}
              >
                Close
              </Btn>
            }
          />
          {(() => {
            const summary = getSummary(viewingSession);
            return (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <StatBox
                    label="Exchanges"
                    value={summary.total}
                    icon={Activity}
                  />
                  <StatBox
                    label="Errors"
                    value={summary.errors}
                    color={summary.errors > 0 ? T.red : T.green}
                    icon={AlertTriangle}
                  />
                  <StatBox
                    label="Avg Latency"
                    value={`${summary.avgLatency}ms`}
                    icon={Clock}
                  />
                </div>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {viewingSession.exchanges.map((ex, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 16px",
                        borderBottom: "1px solid " + T.border,
                        fontSize: 12,
                      }}
                    >
                      <span
                        style={{
                          color: T.textDim,
                          fontFamily: "monospace",
                          minWidth: 20,
                        }}
                      >
                        {i + 1}
                      </span>
                      <Badge color={methodColor[ex.request.method]}>
                        {ex.request.method}
                      </Badge>
                      {ex.response && (
                        <Badge
                          color={statusColor(ex.response.statusCode)}
                        >
                          {ex.response.statusCode}
                        </Badge>
                      )}
                      {ex.error && (
                        <Badge color={T.red} bg={T.redDim}>
                          ERR
                        </Badge>
                      )}
                      <span
                        style={{
                          flex: 1,
                          fontFamily: "monospace",
                          color: T.text,
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
                            color: T.textDim,
                            fontFamily: "monospace",
                          }}
                        >
                          {ex.response.latencyMs}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </Card>
      )}
    </div>
  );
}
