import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Radio, Search, Shield, Play, Square, Trash2, Zap, BarChart3 } from "./icons.jsx";
import { T } from "./theme.js";
import { generateExchange } from "./mockData.js";
import { Pill, Btn } from "./components.jsx";
import { InterceptorPanel } from "./InterceptorPanel.jsx";
import { RecorderPanel } from "./RecorderPanel.jsx";
import { InspectorPanel } from "./InspectorPanel.jsx";
import { TracerPanel } from "./TracerPanel.jsx";
import { UtilitiesPanel } from "./UtilitiesPanel.jsx";

export default function ServiceSpyDashboard() {
  const [tab, setTab] = useState("interceptor");
  const [exchanges, setExchanges] = useState([]);
  const [interceptorActive, setInterceptorActive] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const intervalRef = useRef(null);

  const toggleSimulation = useCallback(() => {
    if (simulating) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setSimulating(false);
    } else {
      intervalRef.current = setInterval(() => {
        if (interceptorActive) {
          setExchanges((prev) => [...prev.slice(-200), generateExchange()]);
        }
      }, 800);
      setSimulating(true);
    }
  }, [simulating, interceptorActive]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const tabs = [
    { id: "interceptor", label: "Interceptor", icon: Zap },
    { id: "recorder", label: "Recorder", icon: Radio },
    { id: "inspector", label: "Inspector", icon: Search },
    { id: "tracer", label: "Tracer", icon: BarChart3 },
    { id: "utilities", label: "Utilities", icon: Shield },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${T.surfaceAlt}; }
        ::-webkit-scrollbar-thumb { background: ${T.borderLight}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.textMuted}; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, " + T.accent + ", " + T.purple + ")", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={18} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px" }}>service-spy</span>
            <span style={{ fontSize: 11, color: T.textDim, marginLeft: 8 }}>v0.1.0</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, background: interceptorActive ? T.greenDim : T.redDim, border: "1px solid " + (interceptorActive ? T.green : T.red) }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: interceptorActive ? T.green : T.red }} />
            <span style={{ fontSize: 11, color: interceptorActive ? T.green : T.red, fontWeight: 600 }}>{interceptorActive ? "ACTIVE" : "INACTIVE"}</span>
          </div>
          <Btn onClick={toggleSimulation} variant={simulating ? "danger" : "primary"} size="sm" icon={simulating ? Square : Play}>
            {simulating ? "Stop Simulation" : "Simulate Traffic"}
          </Btn>
          <Btn onClick={() => setExchanges([])} variant="default" size="sm" icon={Trash2}>Clear</Btn>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, padding: "8px 24px", borderBottom: "1px solid " + T.border, background: T.surface }}>
        {tabs.map((t) => (
          <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon}>{t.label}</Pill>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
        {tab === "interceptor" && <InterceptorPanel exchanges={exchanges} interceptorActive={interceptorActive} setInterceptorActive={setInterceptorActive} />}
        {tab === "recorder" && <RecorderPanel exchanges={exchanges} />}
        {tab === "inspector" && <InspectorPanel exchanges={exchanges} />}
        {tab === "tracer" && <TracerPanel exchanges={exchanges} />}
        {tab === "utilities" && <UtilitiesPanel />}
      </div>
    </div>
  );
}
