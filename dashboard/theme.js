// ─── Theme   ###############────
export const T = {
  bg: "#f8f9fc",
  surface: "#ffffff",
  surfaceAlt: "#f1f5f9",
  border: "#e2e8f0",
  borderLight: "#cbd5e1",
  text: "#1e293b",
  textDim: "#64748b",
  textMuted: "#94a3b8",
  accent: "#3b82f6",
  accentGlow: "rgba(59,130,246,0.08)",
  green: "#16a34a",
  greenDim: "rgba(22,163,74,0.08)",
  yellow: "#ca8a04",
  yellowDim: "rgba(202,138,4,0.08)",
  red: "#dc2626",
  redDim: "rgba(220,38,38,0.06)",
  cyan: "#0891b2",
  purple: "#9333ea",
};

export const methodColor = {
  GET: T.green,
  POST: T.yellow,
  PUT: T.accent,
  DELETE: T.red,
  PATCH: T.cyan,
};

export const statusColor = (code) =>
  code >= 500 ? T.red : code >= 400 ? T.yellow : code >= 300 ? T.cyan : T.green;

export const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
