import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Badge,
  Pill,
  Card,
  CardHeader,
  StatBox,
  Btn,
  EmptyState,
} from "../components.jsx";
import { Activity } from "../icons.jsx";

// ── Badge ──────────────────────────────────────────────────────────────────

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>200 OK</Badge>);
    expect(screen.getByText("200 OK")).toBeInTheDocument();
  });

  it("applies custom color and background via style", () => {
    const { container } = render(<Badge color="red" bg="blue">error</Badge>);
    const el = container.firstChild;
    expect(el.style.color).toBe("red");
    expect(el.style.background).toBe("blue");
  });
});

// ── Pill ───────────────────────────────────────────────────────────────────

describe("Pill", () => {
  it("renders its children", () => {
    render(<Pill>Interceptor</Pill>);
    expect(screen.getByText("Interceptor")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Pill onClick={onClick}>Tab</Pill>);
    fireEvent.click(screen.getByText("Tab"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the icon when provided", () => {
    const { container } = render(<Pill icon={Activity}>With Icon</Pill>);
    // MUI icon renders an SVG
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("does not render an icon element when icon prop is omitted", () => {
    const { container } = render(<Pill>No Icon</Pill>);
    expect(container.querySelector("svg")).toBeNull();
  });
});

// ── Card ───────────────────────────────────────────────────────────────────

describe("Card", () => {
  it("renders children inside a container", () => {
    render(<Card><p>hello</p></Card>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("merges extra styles", () => {
    const { container } = render(<Card style={{ padding: "99px" }}>x</Card>);
    expect(container.firstChild.style.padding).toBe("99px");
  });
});

// ── CardHeader ─────────────────────────────────────────────────────────────

describe("CardHeader", () => {
  it("renders the title", () => {
    render(<CardHeader title="My Panel" />);
    expect(screen.getByText("My Panel")).toBeInTheDocument();
  });

  it("renders the subtitle when provided", () => {
    render(<CardHeader title="Panel" subtitle="5 items" />);
    expect(screen.getByText("5 items")).toBeInTheDocument();
  });

  it("does not render subtitle element when omitted", () => {
    render(<CardHeader title="Panel" />);
    expect(screen.queryByText("5 items")).toBeNull();
  });

  it("renders an icon when provided", () => {
    const { container } = render(<CardHeader title="Panel" icon={Activity} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders the right slot content", () => {
    render(<CardHeader title="T" right={<button>Action</button>} />);
    expect(screen.getByText("Action")).toBeInTheDocument();
  });
});

// ── StatBox ────────────────────────────────────────────────────────────────

describe("StatBox", () => {
  it("renders label and value", () => {
    render(<StatBox label="Requests" value={42} />);
    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders an icon when provided", () => {
    const { container } = render(
      <StatBox label="Errors" value={3} icon={Activity} />
    );
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

// ── Btn ────────────────────────────────────────────────────────────────────

describe("Btn", () => {
  it("renders its children", () => {
    render(<Btn>Click me</Btn>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick}>Go</Btn>);
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when the disabled prop is set", () => {
    render(<Btn disabled>Disabled</Btn>);
    expect(screen.getByText("Disabled").closest("button")).toBeDisabled();
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(<Btn disabled onClick={onClick}>Disabled</Btn>);
    fireEvent.click(screen.getByText("Disabled"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders icon when provided", () => {
    const { container } = render(<Btn icon={Activity}>Save</Btn>);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

// ── EmptyState ─────────────────────────────────────────────────────────────

describe("EmptyState", () => {
  it("renders the message", () => {
    render(<EmptyState message="Nothing here yet" />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("renders an icon when provided", () => {
    const { container } = render(
      <EmptyState icon={Activity} message="Empty" />
    );
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders without an icon when omitted", () => {
    const { container } = render(<EmptyState message="Empty" />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
