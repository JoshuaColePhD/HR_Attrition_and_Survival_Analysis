import { describe, expect, it } from "vitest";
import { dashboardTestUtils, getDashboardPayload } from "@/lib/dashboard-data";

describe("dashboard data transforms", () => {
  it("matches expected topline counts from the prepared dataset", async () => {
    const payload = await getDashboardPayload();

    expect(payload.summary.totalEmployees).toBe(1470);
    expect(payload.summary.attritions).toBe(237);
    expect(payload.summary.attritionRate).toBe(16.1);
  });

  it("bands tenure and promotion windows consistently", () => {
    expect(dashboardTestUtils.toTenureBand(1)).toBe("0-1 years");
    expect(dashboardTestUtils.toTenureBand(5)).toBe("4-6 years");
    expect(dashboardTestUtils.toPromotionBand(0)).toBe("0-1 years");
    expect(dashboardTestUtils.toPromotionBand(8)).toBe("7+ years");
  });

  it("reconciles segment totals for overtime and promotion bands", async () => {
    const payload = await getDashboardPayload();
    const overtimeTotal = payload.segmentMetrics
      .filter((item) => item.dimension === "Overtime")
      .reduce((sum, item) => sum + item.employees, 0);
    const promotionTotal = payload.segmentMetrics
      .filter((item) => item.dimension === "Promotion Band")
      .reduce((sum, item) => sum + item.employees, 0);

    expect(overtimeTotal).toBe(1470);
    expect(promotionTotal).toBe(1470);
  });

  it("normalizes filters from search params", () => {
    const filters = dashboardTestUtils.normalizeFiltersFromSearchParams(
      new URLSearchParams("department=Sales&overTime=Yes"),
    );

    expect(filters.department).toBe("Sales");
    expect(filters.overTime).toBe("Yes");
    expect(filters.businessTravel).toBe("all");
  });

  it("includes guardrail language in recommendations and scenarios", async () => {
    const payload = await getDashboardPayload();

    expect(payload.recommendations.cautions.join(" ")).toContain("directional decision support");
    expect(payload.scenarioInputs[0].impactSummary).not.toContain("will quit");
    expect(payload.notes.modelCaution).toContain("directional");
  });

  it("parses model driver values as finite numbers", async () => {
    const payload = await getDashboardPayload();

    payload.modelDrivers.forEach((driver) => {
      expect(Number.isFinite(driver.hazardRatio)).toBe(true);
      expect(Number.isFinite(driver.lowerCi)).toBe(true);
      expect(Number.isFinite(driver.upperCi)).toBe(true);
    });
  });
});
