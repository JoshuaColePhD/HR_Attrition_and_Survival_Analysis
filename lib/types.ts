export type FilterKey =
  | "department"
  | "jobRoleFamily"
  | "overTime"
  | "tenureBand"
  | "promotionBand"
  | "businessTravel"
  | "jobSatisfactionBand"
  | "workLifeBalanceBand";

export type DashboardFilters = Record<FilterKey, string>;

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterDefinition = {
  key: FilterKey;
  label: string;
  options: FilterOption[];
};

export type DashboardSummary = {
  totalEmployees: number;
  attritions: number;
  attritionRate: number;
  overtimeShare: number;
  medianTenure: number;
  modelConcordance: number;
  filteredEmployees: number;
  filteredAttritions: number;
};

export type SegmentMetric = {
  dimension: string;
  segment: string;
  employees: number;
  attritions: number;
  attritionRate: number;
  shareOfPopulation: number;
  medianTenure: number;
  overtimeShare: number;
};

export type SurvivalPoint = {
  tenure: number;
  survival: number;
  atRisk: number;
  events: number;
};

export type SurvivalSeries = {
  name: string;
  points: SurvivalPoint[];
};

export type ModelDriver = {
  key: string;
  label: string;
  hazardRatio: number;
  lowerCi: number;
  upperCi: number;
  pValue: string;
  interpretation: string;
  evidenceType: "modeled";
  caution?: string;
};

export type ScenarioDefinition = {
  id: "overtime" | "promotion";
  label: string;
  modeled: boolean;
  currentState: string;
  proposedChange: string;
  expectedDirection: "decrease" | "mixed" | "neutral";
  impactSummary: string;
  caution: string;
};

export type RecommendationBlock = {
  summary: string;
  keyDrivers: string[];
  recommendedActions: string[];
  managerGuidance: string;
  hrLeadershipGuidance: string;
  cautions: string[];
  monitoringSuggestions: string[];
};

export type DashboardPayload = {
  generatedAt: string;
  filters: DashboardFilters;
  filterDefinitions: FilterDefinition[];
  summary: DashboardSummary;
  segmentMetrics: SegmentMetric[];
  concentrationTable: SegmentMetric[];
  survival: {
    overall: SurvivalSeries[];
    byDimension: Record<string, SurvivalSeries[]>;
  };
  modelDrivers: ModelDriver[];
  scenarioInputs: ScenarioDefinition[];
  recommendations: RecommendationBlock;
  notes: {
    modelCaution: string;
    dataScope: string;
  };
};
