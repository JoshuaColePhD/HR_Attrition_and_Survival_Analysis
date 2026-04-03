import { promises as fs } from "fs";
import path from "path";
import {
  DashboardFilters,
  DashboardPayload,
  DashboardSummary,
  FilterDefinition,
  FilterKey,
  ModelDriver,
  RecommendationBlock,
  ScenarioDefinition,
  SegmentMetric,
  SurvivalPoint,
  SurvivalSeries,
} from "@/lib/types";

type EmployeeRecord = {
  Age: number;
  Department: string;
  JobRole: string;
  OverTime: string;
  BusinessTravel: string;
  JobSatisfaction: number;
  WorkLifeBalance: number;
  YearsAtCompany: number;
  YearsSinceLastPromotion: number;
  event: number;
  time: number;
  jobRoleFamily: string;
  tenureBand: string;
  promotionBand: string;
  jobSatisfactionBand: string;
  workLifeBalanceBand: string;
};

const DATA_FILE = path.join(process.cwd(), "outputs", "hr_survival_df.csv");
const COX_SUMMARY_FILE = path.join(process.cwd(), "figures", "cox_summary.txt");
const COX_PH_TEST_FILE = path.join(process.cwd(), "figures", "cox_ph_test.txt");

const ALL = "all";

const defaultFilters: DashboardFilters = {
  department: ALL,
  jobRoleFamily: ALL,
  overTime: ALL,
  tenureBand: ALL,
  promotionBand: ALL,
  businessTravel: ALL,
  jobSatisfactionBand: ALL,
  workLifeBalanceBand: ALL,
};

const dimensionLabelMap: Record<string, string> = {
  Department: "Department",
  jobRoleFamily: "Job Role Family",
  OverTime: "Overtime",
  tenureBand: "Tenure Band",
  promotionBand: "Promotion Band",
  BusinessTravel: "Business Travel",
  jobSatisfactionBand: "Job Satisfaction",
  workLifeBalanceBand: "Work-Life Balance",
};

let cachedRecords: EmployeeRecord[] | null = null;
let cachedDrivers: ModelDriver[] | null = null;
let cachedModelCaution = "";

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function splitCsvLine(line: string): string[] {
  return line.split(",").map((item) => item.trim());
}

function toTenureBand(yearsAtCompany: number): string {
  if (yearsAtCompany <= 1) return "0-1 years";
  if (yearsAtCompany <= 3) return "2-3 years";
  if (yearsAtCompany <= 6) return "4-6 years";
  if (yearsAtCompany <= 10) return "7-10 years";
  return "11+ years";
}

function toPromotionBand(yearsSinceLastPromotion: number): string {
  if (yearsSinceLastPromotion <= 1) return "0-1 years";
  if (yearsSinceLastPromotion <= 3) return "2-3 years";
  if (yearsSinceLastPromotion <= 6) return "4-6 years";
  return "7+ years";
}

function toJobRoleFamily(jobRole: string): string {
  if (jobRole.includes("Sales")) return "Sales";
  if (jobRole.includes("Research")) return "Research";
  if (jobRole.includes("Laboratory") || jobRole.includes("Manufacturing")) {
    return "Operations";
  }
  if (jobRole.includes("Manager") || jobRole.includes("Director")) {
    return "Leadership";
  }
  if (jobRole.includes("Human Resources")) return "Human Resources";
  if (jobRole.includes("Healthcare")) return "Healthcare";
  return "Other";
}

function toSatisfactionBand(value: number): string {
  if (value <= 1) return "Low";
  if (value === 2) return "Moderate";
  if (value === 3) return "Good";
  return "High";
}

async function loadRecords() {
  if (cachedRecords) return cachedRecords;

  const raw = await fs.readFile(DATA_FILE, "utf8");
  const [headerLine, ...rows] = raw.trim().split(/\r?\n/);
  const headers = splitCsvLine(headerLine);

  cachedRecords = rows.map((row) => {
    const values = splitCsvLine(row);
    const mapped = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const yearsAtCompany = toNumber(mapped.YearsAtCompany);
    const yearsSinceLastPromotion = toNumber(mapped.YearsSinceLastPromotion);
    const jobSatisfaction = toNumber(mapped.JobSatisfaction);
    const workLifeBalance = toNumber(mapped.WorkLifeBalance);

    return {
      Age: toNumber(mapped.Age),
      Department: mapped.Department,
      JobRole: mapped.JobRole,
      OverTime: mapped.OverTime,
      BusinessTravel: mapped.BusinessTravel,
      JobSatisfaction: jobSatisfaction,
      WorkLifeBalance: workLifeBalance,
      YearsAtCompany: yearsAtCompany,
      YearsSinceLastPromotion: yearsSinceLastPromotion,
      event: toNumber(mapped.event),
      time: toNumber(mapped.time),
      jobRoleFamily: toJobRoleFamily(mapped.JobRole),
      tenureBand: toTenureBand(yearsAtCompany),
      promotionBand: toPromotionBand(yearsSinceLastPromotion),
      jobSatisfactionBand: toSatisfactionBand(jobSatisfaction),
      workLifeBalanceBand: toSatisfactionBand(workLifeBalance),
    };
  });

  return cachedRecords;
}

function parsePValueToken(token: string) {
  return token === "<" ? "<2e-16" : token;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseCoefficientLine(line: string) {
  const match = line.match(
    /^(DepartmentResearch & Development|DepartmentSales|OverTimeYes|YearsSinceLastPromotion)\s+(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(.+)$/,
  );

  if (!match) {
    return null;
  }

  return {
    term: match[1],
    hazardRatio: Number(match[3]),
    pValue: parsePValueToken(match[6].trim()),
  };
}

function parseConfidenceLine(line: string, term: string) {
  const match = line.match(
    new RegExp(
      `^${escapeRegExp(term)}\\s+(\\d+(?:\\.\\d+)?)\\s+(\\d+(?:\\.\\d+)?)\\s+(\\d+(?:\\.\\d+)?)\\s+(\\d+(?:\\.\\d+)?)$`,
    ),
  );

  if (!match) {
    return null;
  }

  return {
    hr: Number(match[1]),
    lower: Number(match[3]),
    upper: Number(match[4]),
  };
}

async function loadModelDrivers() {
  if (cachedDrivers) return cachedDrivers;

  const [summaryText, phText] = await Promise.all([
    fs.readFile(COX_SUMMARY_FILE, "utf8"),
    fs.readFile(COX_PH_TEST_FILE, "utf8"),
  ]);

  cachedModelCaution = phText.includes("YearsSinceLastPromotion")
    ? "The proportional hazards test indicates the promotion-timing effect may vary over tenure, so use it as directional context rather than a fixed effect."
    : "Model effects are directional support, not proof of causality.";

  const lines = summaryText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const coefficientSectionEnd = lines.findIndex((line) => line.startsWith("---"));
  const coefficientLines = lines
    .slice(0, coefficientSectionEnd >= 0 ? coefficientSectionEnd : lines.length)
    .filter((line) =>
      /^(DepartmentResearch & Development|DepartmentSales|OverTimeYes|YearsSinceLastPromotion)/.test(line),
    );

  const confidenceStart = lines.findIndex((line) => line.includes("exp(coef) exp(-coef) lower .95 upper .95"));
  const confidenceLines = confidenceStart >= 0 ? lines.slice(confidenceStart + 1, confidenceStart + 5) : [];

  const confidenceMap = new Map(
    coefficientLines
      .map((line) => parseCoefficientLine(line))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => {
        const matchedLine = confidenceLines.find((line) => line.startsWith(item.term));
        const confidence = matchedLine ? parseConfidenceLine(matchedLine, item.term) : null;

        return [
          item.term,
          confidence ?? {
            hr: item.hazardRatio,
            lower: item.hazardRatio,
            upper: item.hazardRatio,
          },
        ];
      }),
  );

  cachedDrivers = coefficientLines.map((line) => {
    const parsed = parseCoefficientLine(line);
    if (!parsed) {
      throw new Error(`Unable to parse Cox coefficient line: ${line}`);
    }

    const term = parsed.term;
    const confidence = confidenceMap.get(term);
    const pValue = parsed.pValue;

    if (term === "OverTimeYes") {
      return {
        key: term,
        label: "Overtime",
        hazardRatio: confidence?.hr ?? parsed.hazardRatio,
        lowerCi: confidence?.lower ?? 0,
        upperCi: confidence?.upper ?? 0,
        pValue,
        interpretation:
          "Employees working overtime show materially higher modeled attrition hazard, indicating workload pressure is the clearest risk signal in this dataset.",
        evidenceType: "modeled" as const,
      };
    }

    if (term === "YearsSinceLastPromotion") {
      return {
        key: term,
        label: "Years Since Last Promotion",
        hazardRatio: confidence?.hr ?? parsed.hazardRatio,
        lowerCi: confidence?.lower ?? 0,
        upperCi: confidence?.upper ?? 0,
        pValue,
        interpretation:
          "Longer time since last promotion appears protective in the fitted model, which likely reflects survivor effects rather than a simple promotion policy signal.",
        evidenceType: "modeled" as const,
        caution: cachedModelCaution,
      };
    }

    const departmentLabel =
      term === "DepartmentResearch & Development" ? "Department: Research & Development" : "Department: Sales";

    return {
      key: term,
      label: departmentLabel,
      hazardRatio: confidence?.hr ?? parsed.hazardRatio,
      lowerCi: confidence?.lower ?? 0,
      upperCi: confidence?.upper ?? 0,
      pValue,
      interpretation:
        "Department effects are not statistically clear after adjustment, so they should be used for segmentation rather than as standalone intervention targets.",
      evidenceType: "modeled" as const,
    };
  });

  return cachedDrivers;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percent(part: number, whole: number) {
  if (!whole) return 0;
  return Number(((part / whole) * 100).toFixed(1));
}

function rate(records: EmployeeRecord[]) {
  return percent(
    records.reduce((sum, row) => sum + row.event, 0),
    records.length,
  );
}

function applyFilters(records: EmployeeRecord[], filters: DashboardFilters) {
  return records.filter((record) => {
    if (filters.department !== ALL && record.Department !== filters.department) return false;
    if (filters.jobRoleFamily !== ALL && record.jobRoleFamily !== filters.jobRoleFamily) return false;
    if (filters.overTime !== ALL && record.OverTime !== filters.overTime) return false;
    if (filters.tenureBand !== ALL && record.tenureBand !== filters.tenureBand) return false;
    if (filters.promotionBand !== ALL && record.promotionBand !== filters.promotionBand) return false;
    if (filters.businessTravel !== ALL && record.BusinessTravel !== filters.businessTravel) return false;
    if (
      filters.jobSatisfactionBand !== ALL &&
      record.jobSatisfactionBand !== filters.jobSatisfactionBand
    ) {
      return false;
    }
    if (
      filters.workLifeBalanceBand !== ALL &&
      record.workLifeBalanceBand !== filters.workLifeBalanceBand
    ) {
      return false;
    }
    return true;
  });
}

function buildFilterDefinitions(records: EmployeeRecord[]): FilterDefinition[] {
  const optionsFor = (items: string[]) => [
    { value: ALL, label: "All" },
    ...Array.from(new Set(items)).sort().map((value) => ({ value, label: value })),
  ];

  return [
    { key: "department", label: "Department", options: optionsFor(records.map((row) => row.Department)) },
    {
      key: "jobRoleFamily",
      label: "Job Role Family",
      options: optionsFor(records.map((row) => row.jobRoleFamily)),
    },
    { key: "overTime", label: "Overtime", options: optionsFor(records.map((row) => row.OverTime)) },
    { key: "tenureBand", label: "Tenure Band", options: optionsFor(records.map((row) => row.tenureBand)) },
    {
      key: "promotionBand",
      label: "Promotion Band",
      options: optionsFor(records.map((row) => row.promotionBand)),
    },
    {
      key: "businessTravel",
      label: "Business Travel",
      options: optionsFor(records.map((row) => row.BusinessTravel)),
    },
    {
      key: "jobSatisfactionBand",
      label: "Job Satisfaction",
      options: optionsFor(records.map((row) => row.jobSatisfactionBand)),
    },
    {
      key: "workLifeBalanceBand",
      label: "Work-Life Balance",
      options: optionsFor(records.map((row) => row.workLifeBalanceBand)),
    },
  ];
}

function buildSummary(filtered: EmployeeRecord[], allRecords: EmployeeRecord[]): DashboardSummary {
  const attritions = filtered.reduce((sum, row) => sum + row.event, 0);
  const overtimeEmployees = filtered.filter((row) => row.OverTime === "Yes").length;

  return {
    totalEmployees: allRecords.length,
    attritions: allRecords.reduce((sum, row) => sum + row.event, 0),
    attritionRate: rate(allRecords),
    overtimeShare: percent(allRecords.filter((row) => row.OverTime === "Yes").length, allRecords.length),
    medianTenure: median(allRecords.map((row) => row.YearsAtCompany)),
    modelConcordance: 0.74,
    filteredEmployees: filtered.length,
    filteredAttritions: attritions,
  };
}

function buildSegmentMetrics(
  records: EmployeeRecord[],
  filtered: EmployeeRecord[],
  dimensions: Array<keyof EmployeeRecord>,
): SegmentMetric[] {
  const metrics: SegmentMetric[] = [];

  for (const dimension of dimensions) {
    const grouped = new Map<string, EmployeeRecord[]>();

    filtered.forEach((row) => {
      const key = String(row[dimension]);
      const bucket = grouped.get(key) ?? [];
      bucket.push(row);
      grouped.set(key, bucket);
    });

    for (const [segment, rows] of grouped.entries()) {
      metrics.push({
        dimension: dimensionLabelMap[String(dimension)] ?? String(dimension),
        segment,
        employees: rows.length,
        attritions: rows.reduce((sum, row) => sum + row.event, 0),
        attritionRate: rate(rows),
        shareOfPopulation: percent(rows.length, filtered.length || 1),
        medianTenure: median(rows.map((row) => row.YearsAtCompany)),
        overtimeShare: percent(rows.filter((row) => row.OverTime === "Yes").length, rows.length),
      });
    }
  }

  return metrics.sort((a, b) => b.attritionRate - a.attritionRate || b.attritions - a.attritions);
}

function buildConcentrationTable(filtered: EmployeeRecord[]) {
  return buildSegmentMetrics(filtered, filtered, ["Department", "jobRoleFamily", "tenureBand"]).slice(0, 8);
}

function computeSurvivalPoints(records: EmployeeRecord[]): SurvivalPoint[] {
  if (records.length === 0) return [];

  const maxTenure = Math.max(...records.map((row) => row.time));
  const points: SurvivalPoint[] = [];
  let survival = 1;

  for (let tenure = 0; tenure <= maxTenure; tenure += 1) {
    const atRisk = records.filter((row) => row.time >= tenure).length;
    const events = records.filter((row) => row.time === tenure && row.event === 1).length;

    if (tenure > 0 && atRisk > 0) {
      survival *= 1 - events / atRisk;
    }

    points.push({
      tenure,
      survival: Number((survival * 100).toFixed(1)),
      atRisk,
      events,
    });
  }

  return points;
}

function buildSurvivalSeries(records: EmployeeRecord[], dimension?: keyof EmployeeRecord): SurvivalSeries[] {
  if (!dimension) {
    return [
      {
        name: "Overall",
        points: computeSurvivalPoints(records),
      },
    ];
  }

  const grouped = new Map<string, EmployeeRecord[]>();
  records.forEach((row) => {
    const key = String(row[dimension]);
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries())
    .map(([name, rows]) => ({
      name,
      points: computeSurvivalPoints(rows),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildRecommendations(filtered: EmployeeRecord[], allRecords: EmployeeRecord[]): RecommendationBlock {
  const filteredRate = rate(filtered);
  const overallRate = rate(allRecords);
  const overtimeShare = percent(filtered.filter((row) => row.OverTime === "Yes").length, filtered.length);
  const lowBalanceShare = percent(
    filtered.filter((row) => row.workLifeBalanceBand === "Low" || row.workLifeBalanceBand === "Moderate").length,
    filtered.length,
  );
  const travelHeavyShare = percent(
    filtered.filter((row) => row.BusinessTravel === "Travel_Frequently").length,
    filtered.length,
  );
  const earlyPromotionShare = percent(filtered.filter((row) => row.promotionBand === "0-1 years").length, filtered.length);

  const keyDrivers = [
    `Observed attrition in the current view is ${filteredRate}% compared with ${overallRate}% overall.`,
    `Overtime exposure in the selected population is ${overtimeShare}%, which is the strongest modeled risk driver in the dashboard.`,
    `Lower work-life balance responses account for ${lowBalanceShare}% of the selected population, indicating potential workload or scheduling strain.`,
  ];

  if (travelHeavyShare >= 20) {
    keyDrivers.push(
      `Frequent travel makes up ${travelHeavyShare}% of the selected population, so travel burden may be amplifying retention pressure.`,
    );
  }

  if (earlyPromotionShare >= 45) {
    keyDrivers.push(
      `Employees in the 0-1 year promotion band make up ${earlyPromotionShare}% of the selected population, so career timing signals should be reviewed carefully rather than assumed.`,
    );
  }

  const recommendedActions = [
    "Review overtime concentration in the selected segment and rebalance staffing, scheduling, or workload before relying on individual-level interventions.",
    "Ask managers to run check-ins focused on workload sustainability, role clarity, and near-term blockers for the highest-pressure teams.",
    "Review internal mobility and promotion pathways for the selected segment, but interpret the promotion signal cautiously because the model suggests survivor effects may be present.",
  ];

  if (travelHeavyShare >= 20) {
    recommendedActions[2] =
      "Review travel cadence, schedule design, and meeting burden for the selected segment to reduce avoidable strain on employees with heavier travel exposure.";
  }

  return {
    summary:
      filtered.length === 0
        ? "No employees match the current filters, so the risk signal is inconclusive for this view."
        : `The strongest risk pattern in this view is workload pressure, with attrition risk elevated most clearly where overtime exposure remains concentrated.`,
    keyDrivers,
    recommendedActions,
    managerGuidance:
      "Managers should focus on supportive workload and role-clarity conversations, not on predicting who will leave. Use the dashboard to prioritize team conditions that can be improved quickly.",
    hrLeadershipGuidance:
      "HR and leadership should review whether the selected segments show structural workload imbalance, travel burden, or uneven access to growth opportunities rather than treating attrition risk as an individual performance issue.",
    cautions: [
      "This dashboard is directional decision support and should not be used as proof that any employee intends to leave.",
      "Department differences are descriptive here; the current adjusted model does not show statistically clear department effects.",
      "The promotion-timing effect may vary over tenure, so it should be interpreted cautiously and combined with manager context.",
    ],
    monitoringSuggestions: [
      "Track attrition rate, overtime share, and retention by tenure band in the selected segment over time.",
      "Watch whether low work-life balance or frequent travel remain concentrated after any staffing or scheduling changes.",
      "Revisit the highest-risk segments monthly to confirm whether pressure is stabilizing, rising, or declining.",
    ],
  };
}

function buildScenarioInputs(filtered: EmployeeRecord[]): ScenarioDefinition[] {
  const overtimeShare = percent(filtered.filter((row) => row.OverTime === "Yes").length, filtered.length);
  const promotionShare = percent(filtered.filter((row) => row.promotionBand === "0-1 years").length, filtered.length);

  return [
    {
      id: "overtime",
      label: "Reduce overtime exposure",
      modeled: true,
      currentState: `${overtimeShare}% of the selected population currently reports overtime.`,
      proposedChange: "Shift a meaningful share of overtime work into staffing coverage or schedule redesign.",
      expectedDirection: overtimeShare > 0 ? "decrease" : "neutral",
      impactSummary:
        overtimeShare > 0
          ? "Expected risk pressure decreases because overtime is the clearest modeled risk signal in the current Cox analysis."
          : "No overtime exposure is present in the selected view, so this scenario is unlikely to change modeled risk pressure.",
      caution:
        "This is a directional, aggregate scenario only. It should inform staffing decisions, not individual judgments.",
    },
    {
      id: "promotion",
      label: "Improve promotion cadence review",
      modeled: true,
      currentState: `${promotionShare}% of the selected population is in the 0-1 year promotion band.`,
      proposedChange: "Review career path clarity, internal mobility, and progression conversations for the selected segment.",
      expectedDirection: promotionShare > 0 ? "mixed" : "neutral",
      impactSummary:
        "Expected risk pressure may decrease, but the current model’s promotion effect likely includes survivor bias. Use this as a planning prompt, not as a precise forecast.",
      caution:
        "Because the proportional hazards test flagged this effect, promotion timing should be treated as contextual evidence rather than a standalone intervention score.",
    },
  ];
}

function buildPayload(records: EmployeeRecord[], filters: DashboardFilters, drivers: ModelDriver[]): DashboardPayload {
  const filtered = applyFilters(records, filters);
  const summary = buildSummary(filtered, records);
  const segmentMetrics = buildSegmentMetrics(records, filtered, [
    "Department",
    "jobRoleFamily",
    "OverTime",
    "BusinessTravel",
    "workLifeBalanceBand",
    "jobSatisfactionBand",
    "tenureBand",
    "promotionBand",
  ]);

  return {
    generatedAt: new Date().toISOString(),
    filters,
    filterDefinitions: buildFilterDefinitions(records),
    summary,
    segmentMetrics,
    concentrationTable: buildConcentrationTable(filtered),
    survival: {
      overall: buildSurvivalSeries(filtered),
      byDimension: {
        Department: buildSurvivalSeries(filtered, "Department"),
        OverTime: buildSurvivalSeries(filtered, "OverTime"),
        "Tenure Band": buildSurvivalSeries(filtered, "tenureBand"),
        "Promotion Band": buildSurvivalSeries(filtered, "promotionBand"),
      },
    },
    modelDrivers: drivers,
    scenarioInputs: buildScenarioInputs(filtered),
    recommendations: buildRecommendations(filtered, records),
    notes: {
      modelCaution: cachedModelCaution || "Model outputs should be treated as directional support, not final HR determinations.",
      dataScope: "This dashboard uses aggregated patterns from the IBM HR attrition dataset and current repo analysis outputs only.",
    },
  };
}

export function normalizeFiltersFromSearchParams(searchParams: URLSearchParams): DashboardFilters {
  return {
    department: searchParams.get("department") ?? ALL,
    jobRoleFamily: searchParams.get("jobRoleFamily") ?? ALL,
    overTime: searchParams.get("overTime") ?? ALL,
    tenureBand: searchParams.get("tenureBand") ?? ALL,
    promotionBand: searchParams.get("promotionBand") ?? ALL,
    businessTravel: searchParams.get("businessTravel") ?? ALL,
    jobSatisfactionBand: searchParams.get("jobSatisfactionBand") ?? ALL,
    workLifeBalanceBand: searchParams.get("workLifeBalanceBand") ?? ALL,
  };
}

export async function getDashboardPayload(filters: DashboardFilters = defaultFilters): Promise<DashboardPayload> {
  const [records, drivers] = await Promise.all([loadRecords(), loadModelDrivers()]);
  return buildPayload(records, filters, drivers);
}

export const dashboardTestUtils = {
  applyFilters,
  toTenureBand,
  toPromotionBand,
  toJobRoleFamily,
  buildRecommendations,
  normalizeFiltersFromSearchParams,
};
