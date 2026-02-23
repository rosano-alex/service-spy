import { useState } from "react";
import { T } from "./theme.js";

export function Badge({ children, color, bg }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "monospace",
        letterSpacing: "0.5px",
        color,
        background: bg || "rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </span>
  );
}

export function Pill({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        border: "1px solid " + (active ? T.accent : "transparent"),
        borderRadius: 8,
        background: active ? T.accentGlow : "transparent",
        color: active ? T.accent : T.textDim,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        transition: "all 0.2s",
      }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

export function Card({ children, style }) {
  return (
    <div
      style={{
        background: T.surface,
        border: "1px solid " + T.border,
        borderRadius: 12,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, right }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid " + T.border,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {Icon && <Icon size={18} color={T.accent} />}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

export function StatBox({ label, value, color, icon: Icon }) {
  return (
    <div
      style={{
        padding: "14px 18px",
        background: T.surfaceAlt,
        borderRadius: 10,
        border: "1px solid " + T.border,
        minWidth: 130,
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        {Icon && <Icon size={13} color={T.textDim} />}
        <span
          style={{
            fontSize: 11,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: color || T.text,
          fontFamily: "monospace",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "default",
  size = "md",
  icon: Icon,
  disabled,
}) {
  const styles = {
    primary: { bg: T.accent, color: "#fff", border: T.accent },
    danger: { bg: T.red, color: "#fff", border: T.red },
    default: { bg: "transparent", color: T.textDim, border: T.border },
    success: { bg: T.green, color: "#fff", border: T.green },
  };
  const s = styles[variant];
  const pad = size === "sm" ? "5px 10px" : "8px 16px";
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: pad,
        borderRadius: 6,
        border: "1px solid " + s.border,
        background: s.bg,
        color: s.color,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: size === "sm" ? 11 : 13,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
      }}
    >
      {Icon && <Icon size={size === "sm" ? 12 : 14} />}
      {children}
    </button>
  );
}

export function EmptyState({ icon: Icon, message }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        color: T.textMuted,
      }}
    >
      {Icon && <Icon size={32} strokeWidth={1} style={{ marginBottom: 12 }} />}
      <span style={{ fontSize: 13 }}>{message}</span>
    </div>
  );
}

export function JsonView({ data, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  if (data === null || data === undefined)
    return <span style={{ color: T.textMuted }}>null</span>;
  if (typeof data === "string")
    return <span style={{ color: T.green }}>"{data}"</span>;
  if (typeof data === "number")
    return <span style={{ color: T.cyan }}>{data}</span>;
  if (typeof data === "boolean")
    return <span style={{ color: T.purple }}>{String(data)}</span>;

  const isArr = Array.isArray(data);
  const entries = Object.entries(data);
  if (entries.length === 0)
    return <span style={{ color: T.textDim }}>{isArr ? "[]" : "{}"}</span>;

  return (
    <span>
      <span
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", color: T.textDim }}
      >
        {open
          ? isArr
            ? "["
            : "{"
          : isArr
            ? `[${entries.length}]`
            : `{${entries.length}}`}
      </span>
      {open && (
        <div
          style={{
            marginLeft: 16,
            borderLeft: "1px solid " + T.border,
            paddingLeft: 10,
          }}
        >
          {entries.map(([k, v]) => (
            <div key={k} style={{ fontSize: 12, lineHeight: "20px" }}>
              {!isArr && <span style={{ color: T.accent }}>"{k}"</span>}
              {!isArr && <span style={{ color: T.textDim }}>: </span>}
              <JsonView data={v} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
      {open && (
        <span style={{ color: T.textDim }}>{isArr ? "]" : "}"}</span>
      )}
    </span>
  );
}
