import React from "react";
import { vi } from "vitest";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();

  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 320 }}>{children}</div>
    ),
  };
});

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DashboardView } from "@/components/dashboard-view";
import { getDashboardPayload } from "@/lib/dashboard-data";
import { DashboardPayload } from "@/lib/types";

let latestPayload: DashboardPayload;

beforeEach(async () => {
  latestPayload = await getDashboardPayload();
  window.history.replaceState(null, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => latestPayload,
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("DashboardView", () => {
  it("opens on the summary tab by default and shows the compact BI board", async () => {
    render(<DashboardView initialPayload={latestPayload} />);

    expect(screen.getByLabelText("Summary tab")).toBeInTheDocument();
    expect(screen.getByText("Count of Employee")).toBeInTheDocument();
    expect(screen.getByText("Attrition by Department")).toBeInTheDocument();
    expect(screen.getByText("Attrition by Job Role")).toBeInTheDocument();
    expect(screen.queryByLabelText("Risk Patterns tab")).not.toBeInTheDocument();
  });

  it("switches tabs and shows the right content blocks", async () => {
    const user = userEvent.setup();
    render(<DashboardView initialPayload={latestPayload} />);

    await user.click(screen.getByRole("button", { name: "Risk Patterns" }));

    expect(screen.getByLabelText("Risk Patterns tab")).toBeInTheDocument();
    expect(screen.getByLabelText("Survival grouping")).toBeInTheDocument();
    expect(screen.queryByText(/Attrition by Job Role/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Model + Scenarios" }));

    expect(screen.getByLabelText("Model and Scenarios tab")).toBeInTheDocument();
    expect(screen.getByText(/What might reduce pressure/i)).toBeInTheDocument();
  });

  it("keeps filters applied when switching tabs and persists url state", async () => {
    const user = userEvent.setup();
    render(<DashboardView initialPayload={latestPayload} />);

    await user.click(screen.getByRole("button", { name: "Sales" }));
    await user.click(screen.getByRole("button", { name: "Risk Patterns" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(window.location.search).toContain("department=Sales");
      expect(window.location.search).toContain("tab=risk-patterns");
    });
  });

  it("shows more filters on demand without duplicating the long page layout", async () => {
    const user = userEvent.setup();
    render(<DashboardView initialPayload={latestPayload} />);

    await user.click(screen.getByRole("button", { name: "Risk Patterns" }));
    expect(screen.queryByLabelText("Business Travel")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More filters" }));
    expect(screen.getByLabelText("Business Travel")).toBeInTheDocument();
  });

  it("lets leaders filter the BI board with department buttons", async () => {
    const user = userEvent.setup();
    render(<DashboardView initialPayload={latestPayload} />);

    expect(screen.getByText("Overtime Survival")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Human Resources" }));

    await waitFor(() => {
      expect(window.location.search).toContain("department=Human+Resources");
    });

    await user.click(screen.getByRole("button", { name: "All" }));

    await waitFor(() => {
      expect(window.location.search).not.toContain("department=Human+Resources");
    });
  });
});
