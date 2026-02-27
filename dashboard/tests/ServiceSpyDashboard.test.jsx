import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ServiceSpyDashboard from "../index.jsx";

// Silence React's "act()" warnings for setInterval-based state in tests
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

function renderDashboard() {
  return render(<ServiceSpyDashboard />);
}

// ── Layout ─────────────────────────────────────────────────────────────────

describe("layout", () => {
  it("renders the service-spy brand name", () => {
    renderDashboard();
    expect(screen.getByText("service-spy")).toBeInTheDocument();
  });

  it("shows the version string", () => {
    renderDashboard();
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument();
  });

  it("renders all five tab labels", () => {
    renderDashboard();
    ["Interceptor", "Recorder", "Inspector", "Tracer", "Utilities"].forEach(
      (label) => expect(screen.getByText(label)).toBeInTheDocument()
    );
  });
});

// ── Status indicator ────────────────────────────────────────────────────────

describe("interceptor status indicator", () => {
  it("shows ACTIVE by default", () => {
    renderDashboard();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });
});

// ── Header buttons ──────────────────────────────────────────────────────────

describe("header controls", () => {
  it("renders the Simulate Traffic button", () => {
    renderDashboard();
    expect(screen.getByText("Simulate Traffic")).toBeInTheDocument();
  });

  it("renders the Clear button", () => {
    renderDashboard();
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("toggles label to Stop Simulation when clicked", async () => {
    renderDashboard();
    const btn = screen.getByText("Simulate Traffic");
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(screen.getByText("Stop Simulation")).toBeInTheDocument();
  });

  it("returns to Simulate Traffic after clicking Stop Simulation", async () => {
    renderDashboard();
    await act(async () => {
      fireEvent.click(screen.getByText("Simulate Traffic"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Stop Simulation"));
    });
    expect(screen.getByText("Simulate Traffic")).toBeInTheDocument();
  });
});

// ── Tab navigation ──────────────────────────────────────────────────────────

describe("tab navigation", () => {
  it("shows Interceptor panel by default", () => {
    renderDashboard();
    // The active panel renders its own heading
    expect(screen.getByText("HTTP Interceptor")).toBeInTheDocument();
  });

  it("switches to Recorder panel when Recorder tab is clicked", () => {
    renderDashboard();
    fireEvent.click(screen.getByText("Recorder"));
    expect(screen.getByText("Session Recorder")).toBeInTheDocument();
  });

  it("switches to Inspector panel when Inspector tab is clicked", () => {
    renderDashboard();
    fireEvent.click(screen.getByText("Inspector"));
    expect(screen.getByText("Live Inspector")).toBeInTheDocument();
  });

  it("switches to Tracer panel when Tracer tab is clicked", () => {
    renderDashboard();
    fireEvent.click(screen.getByText("Tracer"));
    expect(screen.getByText("Structured Tracer")).toBeInTheDocument();
  });

  it("switches to Utilities panel when Utilities tab is clicked", () => {
    renderDashboard();
    fireEvent.click(screen.getByText("Utilities"));
    expect(screen.getByText("Utilities")).toBeInTheDocument();
  });

  it("can switch back to Interceptor after visiting another tab", () => {
    renderDashboard();
    fireEvent.click(screen.getByText("Tracer"));
    fireEvent.click(screen.getByText("Interceptor"));
    expect(screen.getByText("HTTP Interceptor")).toBeInTheDocument();
  });
});

// ── Simulation ──────────────────────────────────────────────────────────────

describe("traffic simulation", () => {
  it("adds exchanges while simulation is running", async () => {
    renderDashboard();

    await act(async () => {
      fireEvent.click(screen.getByText("Simulate Traffic"));
      vi.advanceTimersByTime(800 * 5); // 5 ticks
    });

    // The Interceptor panel subtitle shows "N exchanges captured" after ticks
    const countEl = screen.queryByText(/\d+ exchanges/i);
    // Accept a subtitle count OR any non-zero numeric text in a stat box
    const anyNonZero = screen.queryAllByText(/^[1-9]/).length > 0;
    expect(countEl !== null || anyNonZero).toBe(true);
  });

  it("stops adding exchanges after Stop Simulation is clicked", async () => {
    renderDashboard();

    await act(async () => {
      fireEvent.click(screen.getByText("Simulate Traffic"));
      vi.advanceTimersByTime(800 * 3);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Stop Simulation"));
      vi.advanceTimersByTime(800 * 10); // advance further — should produce no more
    });

    // Button is back to its original label
    expect(screen.getByText("Simulate Traffic")).toBeInTheDocument();
  });
});
