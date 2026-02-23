import { useState } from "react";
import { Shield, Zap, RefreshCw, Filter } from "./icons.jsx";
import { T, methodColor, METHODS } from "./theme.js";
import { genId } from "./mockData.js";
import { Card, CardHeader, Btn } from "./components.jsx";

export function UtilitiesPanel() {
  const [redactInput, setRedactInput] = useState(
    '{\n  "authorization": "Bearer sk-abc123",\n  "content-type": "application/json",\n  "x-api-key": "secret-key-456"\n}'
  );
  const [redactOutput, setRedactOutput] = useState("");
  const [filterInput, setFilterInput] = useState("");
  const [filterMethods, setFilterMethods] = useState(["GET", "POST"]);
  const [contextCorrelationId, setContextCorrelationId] = useState("");
  const [contextSpanId, setContextSpanId] = useState("");

  const runRedact = () => {
    try {
      const headers = JSON.parse(redactInput);
      const sensitive = [
        "authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "x-auth-token",
        "proxy-authorization",
      ];
      const result = {};
      for (const [k, v] of Object.entries(headers)) {
        result[k] = sensitive.includes(k.toLowerCase()) ? "[REDACTED]" : v;
      }
      setRedactOutput(JSON.stringify(result, null, 2));
    } catch (e) {
      setRedactOutput("Error: Invalid JSON input");
    }
  };

  const generateIds = () => {
    setContextCorrelationId(genId("cor"));
    setContextSpanId(genId("spn"));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card>
        <CardHeader
          title="Header Redaction"
          subtitle="Sanitize sensitive headers"
          icon={Shield}
        />
        <div style={{ padding: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: T.textDim,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Input Headers (JSON)
          </div>
          <textarea
            value={redactInput}
            onChange={(e) => setRedactInput(e.target.value)}
            style={{
              width: "100%",
              height: 120,
              background: T.surfaceAlt,
              border: "1px solid " + T.border,
              borderRadius: 6,
              color: T.text,
              padding: 10,
              fontSize: 12,
              fontFamily: "monospace",
              resize: "vertical",
              outline: "none",
            }}
          />
          <Btn
            onClick={runRedact}
            variant="primary"
            size="sm"
            icon={Shield}
            style={{ marginTop: 8 }}
          >
            Redact
          </Btn>
          {redactOutput && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  color: T.textDim,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Output
              </div>
              <pre
                style={{
                  background: T.surfaceAlt,
                  border: "1px solid " + T.border,
                  borderRadius: 6,
                  color: T.green,
                  padding: 10,
                  fontSize: 12,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}
              >
                {redactOutput}
              </pre>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="ID Generator"
          subtitle="Correlation & span IDs"
          icon={Zap}
        />
        <div style={{ padding: 16 }}>
          <Btn
            onClick={generateIds}
            variant="primary"
            size="sm"
            icon={RefreshCw}
          >
            Generate IDs
          </Btn>
          {contextCorrelationId && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{ fontSize: 11, color: T.textDim, marginBottom: 4 }}
              >
                Correlation ID
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 14,
                  color: T.accent,
                  background: T.surfaceAlt,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid " + T.border,
                }}
              >
                {contextCorrelationId}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.textDim,
                  marginBottom: 4,
                  marginTop: 12,
                }}
              >
                Span ID
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 14,
                  color: T.purple,
                  background: T.surfaceAlt,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid " + T.border,
                }}
              >
                {contextSpanId}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card style={{ gridColumn: "1 / -1" }}>
        <CardHeader
          title="Request Filter Builder"
          subtitle="Configure URL and method filters"
          icon={Filter}
        />
        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 12,
              alignItems: "center",
            }}
          >
            <label style={{ fontSize: 11, color: T.textDim }}>
              URL pattern:
            </label>
            <input
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="e.g. api.example.com"
              style={{
                flex: 1,
                background: T.surfaceAlt,
                border: "1px solid " + T.border,
                borderRadius: 4,
                color: T.text,
                padding: "6px 10px",
                fontSize: 12,
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            <label style={{ fontSize: 11, color: T.textDim }}>
              Methods:
            </label>
            {METHODS.map((m) => (
              <label
                key={m}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: filterMethods.includes(m)
                    ? methodColor[m]
                    : T.textMuted,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={filterMethods.includes(m)}
                  onChange={(e) =>
                    setFilterMethods((prev) =>
                      e.target.checked
                        ? [...prev, m]
                        : prev.filter((x) => x !== m)
                    )
                  }
                />
                {m}
              </label>
            ))}
          </div>
          <div
            style={{
              fontSize: 11,
              color: T.textDim,
              marginBottom: 6,
            }}
          >
            Generated Config
          </div>
          <pre
            style={{
              background: T.surfaceAlt,
              border: "1px solid " + T.border,
              borderRadius: 6,
              color: T.text,
              padding: 12,
              fontSize: 12,
              fontFamily: "monospace",
              margin: 0,
            }}
          >
            {`{
  filter: {
    urls: [${filterInput ? `'${filterInput}'` : ""}],
    methods: [${filterMethods.map((m) => `'${m}'`).join(", ")}],
    excludeUrls: ['/health', '/ready'],
  }
}`}
          </pre>
        </div>
      </Card>
    </div>
  );
}
