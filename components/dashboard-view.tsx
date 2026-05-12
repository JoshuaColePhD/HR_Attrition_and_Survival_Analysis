"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DashboardFilters,
  DashboardPayload,
  FilterKey,
  ScenarioDefinition,
  SegmentMetric,
  SurvivalSeries,
} from "@/lib/types";
import {
  CompactTable,
  DashboardHeader,
  DashboardShell,
  KpiCard,
  Panel,
} from "@/components/dashboard-kit";

type DashboardViewProps = {
  initialPayload: DashboardPayload;
};

type ScenarioSelection = "overtime" | "promotion";
type DashboardTab = "summary" | "risk-patterns" | "model-scenarios";

const surfaceClass =
  "w-full max-w-full min-w-0 rounded-[3px] border border-[#37577b] bg-[#132a46]/92 p-4 shadow-soft md:p-5";
const chartColors = ["#5BC0EB", "#F4727A", "#F6C85F", "#9B7EDE", "#4E79A7"];
const primaryFilterKeys: FilterKey[] = ["department", "jobRoleFamily", "overTime", "tenureBand"];
const dashboardTabs: Array<{ id: DashboardTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "risk-patterns", label: "Risk Patterns" },
  { id: "model-scenarios", label: "Model + Scenarios" },
];
const summaryChartClass = "min-h-[250px] min-w-0 flex-1";
const riskSurfaceClass = `${surfaceClass}`;
const modelSurfaceClass = `${surfaceClass}`;

export function DashboardView({ initialPayload }: DashboardViewProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [filters, setFilters] = useState(initialPayload.filters);
  const [selectedTab, setSelectedTab] = useState<DashboardTab>("summary");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioSelection>("overtime");
  const [selectedSurvivalDimension, setSelectedSurvivalDimension] = useState("Department");
  const [selectedGapTenure, setSelectedGapTenure] = useState(5);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextTab = params.get("tab");
    const normalizedTab = isDashboardTab(nextTab) ? nextTab : "summary";
    const urlFilters = extractFiltersFromUrl(params, initialPayload.filters);

    setSelectedTab(normalizedTab);
    setFilters(urlFilters);
  }, [initialPayload.filters]);

  useEffect(() => {
    const params = new URLSearchParams();

    Object.entries(deferredFilters).forEach(([key, value]) => {
      if (value !== "all") {
        params.set(key, value);
      }
    });

    params.set("tab", selectedTab);

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);

    const controller = new AbortController();

    startTransition(() => {
      fetch(`/api/dashboard?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Failed to load dashboard data");
          }
          const nextPayload = (await response.json()) as DashboardPayload;
          setPayload(nextPayload);
        })
        .catch((error: Error) => {
          if (error.name !== "AbortError") {
            console.error(error);
          }
        });
    });

    return () => controller.abort();
  }, [deferredFilters, selectedTab]);

  const topSegments = useMemo(() => payload.segmentMetrics.slice(0, 8), [payload.segmentMetrics]);
  const summarySegments = useMemo(() => payload.segmentMetrics.slice(0, 5), [payload.segmentMetrics]);
  const departmentSegments = useMemo(
    () => payload.segmentMetrics.filter((item) => item.dimension === "Department"),
    [payload.segmentMetrics],
  );
  const jobRoleSegments = useMemo(
    () => payload.segmentMetrics.filter((item) => item.dimension === "Job Role Family").slice(0, 5),
    [payload.segmentMetrics],
  );
  const concentrationRows = useMemo(() => payload.concentrationTable.slice(0, 6), [payload.concentrationTable]);
  const survivalDimensionOptions = Object.keys(payload.survival.byDimension);
  const selectedScenarioDetails =
    payload.scenarioInputs.find((item) => item.id === selectedScenario) ?? payload.scenarioInputs[0];
  const selectedSurvivalSeries = payload.survival.byDimension[selectedSurvivalDimension] ?? payload.survival.overall;
  const overtimeSeries = payload.survival.byDimension.OverTime ?? [];
  const overtimeDriver = payload.modelDrivers.find((driver) => driver.key === "OverTimeYes");
  const overtimeGapRows = useMemo(() => mergeSurvivalSeries(overtimeSeries), [overtimeSeries]);
  const overallSurvivalRows = useMemo(() => mergeSurvivalSeries(payload.survival.overall), [payload.survival.overall]);
  const overtimeGapSummary = useMemo(
    () => buildOvertimeGapSummary(overtimeSeries, selectedGapTenure),
    [overtimeSeries, selectedGapTenure],
  );
  const activeFilterCount = countActiveFilters(filters);
  const primaryDefinitions = payload.filterDefinitions.filter((definition) => primaryFilterKeys.includes(definition.key));
  const advancedDefinitions = payload.filterDefinitions.filter((definition) => !primaryFilterKeys.includes(definition.key));
  const compactDashboardHeader = (subtitle: string) => (
    <DashboardHeader
      title="HR Analytics Dashboard"
      subtitle={subtitle}
      selectedTab={selectedTab}
      tabs={dashboardTabs}
      filters={filters}
      primaryFilters={primaryDefinitions}
      advancedFilters={advancedDefinitions}
      showMoreFilters={showMoreFilters}
      activeFilterCount={activeFilterCount}
      onTabChange={setSelectedTab}
      onFilterChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
      onToggleMoreFilters={() => setShowMoreFilters((current) => !current)}
      onResetFilters={() => setFilters(payload.filters)}
    />
  );

  return (
    <main className="min-h-screen overflow-x-hidden px-3 py-4 md:px-7 md:py-6">
      <div className="mx-auto w-full max-w-7xl min-w-0">
        {selectedTab === "summary" ? (
          <DashboardShell label="Summary tab">
            {compactDashboardHeader(payload.recommendations.summary)}

            <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <KpiCard label="Count of Employee" value={payload.summary.filteredEmployees} hint="Selected scope" accent="pine" />
              <KpiCard label="Attrition" value={payload.summary.filteredAttritions} hint="Observed exits" accent="ember" />
              <KpiCard
                label="AttritionRate"
                value={`${toPercent(payload.summary.filteredAttritions, payload.summary.filteredEmployees)}%`}
                hint={`Baseline ${payload.summary.attritionRate}%`}
                accent="gold"
              />
              <KpiCard label="Model C-index" value={payload.summary.modelConcordance.toFixed(2)} hint="Discrimination" accent="ocean" />
              <KpiCard
                label="Overtime Share"
                value={`${toPercentFromMetric(
                  getMetric(payload.segmentMetrics, "Overtime", "Yes")?.employees ?? 0,
                  payload.summary.filteredEmployees,
                )}%`}
                hint="Current view"
                accent="plum"
              />
              <KpiCard label="Avg Years" value={payload.summary.medianTenure.toFixed(1)} hint="Median tenure" accent="pine" />
            </div>

            <div className="grid min-w-0 gap-4 xl:grid-cols-3">
              <Panel title="Attrition by Department" subtitle="Observed exits by department. Hover for rate and headcount.">
                <div className={summaryChartClass}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <text x="50%" y="45%" textAnchor="middle" fill="#F8FAFC" fontSize={28} fontWeight={700}>
                        {payload.summary.filteredAttritions}
                      </text>
                      <text x="50%" y="54%" textAnchor="middle" fill="#B8C4D6" fontSize={13} fontWeight={600}>
                        observed exits
                      </text>
                      <Pie
                        data={departmentSegments}
                        dataKey="attritions"
                        nameKey="segment"
                        innerRadius="48%"
                        outerRadius="78%"
                        paddingAngle={2}
                      >
                        {departmentSegments.map((segment, index) => (
                          <Cell key={segment.segment} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<DepartmentPieTooltip totalAttritions={payload.summary.filteredAttritions} />} />
                      <Legend
                        formatter={(value) => {
                          const segment = departmentSegments.find((item) => item.segment === value);
                          return segment ? `${value} (${segment.attritions})` : value;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Attrition by Year at Company" subtitle="Retention pattern across tenure.">
                <div className={summaryChartClass}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overallSurvivalRows} margin={{ top: 8, right: 14, bottom: 8, left: 4 }}>
                      <CartesianGrid stroke="#2b6687" />
                      <XAxis dataKey="tenure" />
                      <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip formatter={(value: number) => `${value}% retained`} />
                      <Area type="monotone" dataKey="Overall" stroke="#9B7EDE" fill="#9B7EDE" fillOpacity={0.55} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Hotspot table" subtitle="Most concentrated attrition hotspots.">
                <CompactTable rows={concentrationRows.slice(0, 5)} />
              </Panel>

              <Panel title="Attrition by Segment" subtitle="Highest observed segment rates.">
                <div className={summaryChartClass}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summarySegments} layout="vertical" margin={{ top: 10, right: 54, bottom: 10, left: 4 }}>
                      <CartesianGrid stroke="#2b6687" horizontal={false} />
                      <XAxis type="number" domain={[0, 40]} tickFormatter={(value) => `${value}%`} />
                      <YAxis type="category" dataKey="segment" width={116} tick={{ fill: "#F8FAFC", fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Bar dataKey="attritionRate" fill="#168ef2" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="attritionRate" position="right" formatter={(value: number) => `${value}%`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Overtime Survival" subtitle="Retention by overtime status.">
                <div className={summaryChartClass}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overtimeGapRows} margin={{ top: 8, right: 10, bottom: 22, left: 0 }}>
                      <CartesianGrid stroke="#2b6687" />
                      <XAxis dataKey="tenure" />
                      <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip formatter={(value: number) => `${value}% retained`} />
                      <Legend verticalAlign="bottom" height={24} />
                      <Line type="monotone" dataKey="No" name="No overtime" stroke="#43a7f5" dot={false} strokeWidth={2.4} />
                      <Line type="monotone" dataKey="Yes" name="Overtime" stroke="#b0a5d9" dot={false} strokeWidth={2.4} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Attrition by Job Role" subtitle="Job families with the highest observed rates.">
                <div className={summaryChartClass}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobRoleSegments} layout="vertical" margin={{ top: 10, right: 54, bottom: 10, left: 4 }}>
                      <CartesianGrid stroke="#2b6687" horizontal={false} />
                      <XAxis type="number" domain={[0, 32]} tickFormatter={(value) => `${value}%`} />
                      <YAxis type="category" dataKey="segment" width={106} tick={{ fill: "#F8FAFC", fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Bar dataKey="attritionRate" fill="#168ef2" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="attritionRate" position="right" formatter={(value: number) => `${value}%`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          </DashboardShell>
        ) : null}

        {selectedTab === "risk-patterns" ? (
          <DashboardShell label="Risk Patterns tab">
            {compactDashboardHeader(
              "Descriptive patterns update with the global filters and help show where observed attrition is concentrated.",
            )}
            <div className={riskSurfaceClass}>
                <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                  <Panel title="Highest attrition segments" subtitle="Ranked by observed attrition rate in the selected population.">
                    <div className="h-[250px] sm:h-[290px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topSegments} layout="vertical" margin={{ top: 10, right: 46, bottom: 10, left: 42 }}>
                          <CartesianGrid stroke="#274766" horizontal={false} />
                          <XAxis type="number" domain={[0, 40]} tickFormatter={(value) => `${value}%`} />
                          <YAxis type="category" dataKey="segment" width={108} tick={{ fill: "#D7E4F7", fontSize: 12 }} />
                          <Tooltip formatter={(value: number) => `${value}%`} />
                          <Bar dataKey="attritionRate" radius={[0, 8, 8, 0]}>
                            {topSegments.map((entry) => (
                              <Cell
                                key={`${entry.dimension}-${entry.segment}`}
                                fill={entry.dimension === "Overtime" ? "#F4727A" : "#5BC0EB"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel
                    title="Population mix"
                    subtitle="Share of the selected population represented by the top risk segments."
                  >
                    <div className="h-[250px] sm:h-[290px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={topSegments} margin={{ top: 10, right: 14, bottom: 4, left: 8 }}>
                          <defs>
                            <linearGradient id="mixFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#5BC0EB" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#5BC0EB" stopOpacity={0.04} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#274766" />
                          <XAxis
                            dataKey="segment"
                            tick={{ fontSize: 10 }}
                            interval={0}
                            angle={-22}
                            textAnchor="end"
                            height={64}
                            tickFormatter={formatShortSegmentLabel}
                          />
                          <YAxis tickFormatter={(value) => `${value}%`} width={42} />
                          <Tooltip formatter={(value: number) => `${value}%`} />
                          <Area type="monotone" dataKey="shareOfPopulation" stroke="#5BC0EB" fill="url(#mixFill)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>
                </div>

                <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
                  <Panel
                    title="Retention survival curves"
                    subtitle="Retention patterns by the selected grouping, based on tenure-to-exit history."
                  >
                    <div className="mb-4 flex justify-end">
                      <select
                        aria-label="Survival grouping"
                        className="rounded-full border border-pine/20 bg-mist px-4 py-2 text-sm text-ink"
                        value={selectedSurvivalDimension}
                        onChange={(event) => setSelectedSurvivalDimension(event.target.value)}
                      >
                        {survivalDimensionOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="h-[250px] sm:h-[290px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mergeSurvivalSeries(selectedSurvivalSeries)} margin={{ top: 10, right: 12, bottom: 28, left: 8 }}>
                          <CartesianGrid stroke="#274766" />
                          <XAxis dataKey="tenure" label={{ value: "Years at company", position: "insideBottom", offset: -4 }} />
                          <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} width={46} />
                          <Tooltip formatter={(value: number) => `${value}%`} />
                          <Legend verticalAlign="bottom" height={28} />
                          {selectedSurvivalSeries.map((series, index) => (
                            <Line
                              key={series.name}
                              type="monotone"
                              dataKey={series.name}
                              stroke={chartColors[index % chartColors.length]}
                              dot={false}
                              strokeWidth={2.2}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel
                    title="Concentration table"
                    subtitle="Where observed attrition events cluster most in the current filtered population."
                  >
                    <CompactTable rows={concentrationRows} />
                  </Panel>
                </div>
            </div>
          </DashboardShell>
        ) : null}

        {selectedTab === "model-scenarios" ? (
          <DashboardShell label="Model and Scenarios tab">
            {compactDashboardHeader(payload.notes.modelCaution)}
            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
                <div className={modelSurfaceClass}>
                  <p className="text-xs uppercase tracking-[0.24em] text-ocean">Model + Scenarios</p>
                  <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <h2 className="text-xl font-semibold text-ink md:text-2xl">Why risk may be elevated</h2>
                    <p className="max-w-xl text-sm text-sand/80">{payload.notes.modelCaution}</p>
                  </div>
                  <div className="mt-4 rounded-[8px] border border-[#37577b] bg-mist px-4 py-3 text-sm text-sand/90">
                    Modeled effects come from the current Cox proportional hazards analysis. They support prioritization but
                    do not prove causality or justify person-level decisions.
                  </div>
                  <div className="mt-5 h-[250px] sm:h-[290px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={payload.modelDrivers} margin={{ top: 8, right: 12, bottom: 8, left: 18 }}>
                        <CartesianGrid stroke="#274766" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-18}
                          textAnchor="end"
                          height={58}
                          tickFormatter={formatShortDriverLabel}
                        />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatMetric(value)} />
                        <Bar dataKey="hazardRatio" radius={[8, 8, 0, 0]}>
                          {payload.modelDrivers.map((driver) => (
                            <Cell key={driver.key} fill={driver.hazardRatio > 1 ? "#F4727A" : "#5BC0EB"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {payload.modelDrivers.map((driver) => (
                      <article key={driver.key} className="min-w-0 rounded-[8px] border border-[#37577b] bg-[#0b1f35] p-4">
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="min-w-0 text-base font-semibold text-ink">{driver.label}</h3>
                          <span className="w-fit rounded-full bg-[#0b1f35] px-3 py-1 font-mono text-xs text-sand/80">
                            HR {formatMetric(driver.hazardRatio)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-sand/90">{driver.interpretation}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-sand/60">
                          95% CI {formatMetric(driver.lowerCi)}-{formatMetric(driver.upperCi)} | p {driver.pValue}
                        </p>
                        {driver.caution ? <p className="mt-3 text-sm text-gold">{driver.caution}</p> : null}
                      </article>
                    ))}
                  </div>
                </div>

                <div className={modelSurfaceClass}>
                  <p className="text-xs uppercase tracking-[0.24em] text-ocean">Scenario Explorer</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink md:text-2xl">What might reduce pressure</h2>
                  <p className="mt-2 text-sm leading-6 text-sand/80">
                    Aggregate scenarios are designed for staffing and retention planning, not prediction at the employee level.
                  </p>
                  <div className="mt-5 grid gap-3">
                    {payload.scenarioInputs.map((scenario) => (
                      <button
                        key={scenario.id}
                        type="button"
                        onClick={() => setSelectedScenario(scenario.id)}
                        className={`rounded-[8px] border px-4 py-4 text-left transition ${
                          selectedScenario === scenario.id
                            ? "border-pine bg-pine text-white"
                            : "border-[#37577b] bg-[#0b1f35] text-ink hover:border-pine/40"
                        }`}
                      >
                        <p className="text-sm font-semibold">{scenario.label}</p>
                        <p className={`mt-2 text-sm ${selectedScenario === scenario.id ? "text-sand/85" : "text-sand/80"}`}>
                          {scenario.currentState}
                        </p>
                      </button>
                    ))}
                  </div>
                  {selectedScenarioDetails ? <ScenarioPanel scenario={selectedScenarioDetails} /> : null}
                </div>
            </div>
          </DashboardShell>
        ) : null}
      </div>
    </main>
  );
}

function isDashboardTab(value: string | null): value is DashboardTab {
  return value === "summary" || value === "risk-patterns" || value === "model-scenarios";
}

function extractFiltersFromUrl(params: URLSearchParams, fallback: DashboardFilters): DashboardFilters {
  return {
    department: params.get("department") ?? fallback.department,
    jobRoleFamily: params.get("jobRoleFamily") ?? fallback.jobRoleFamily,
    overTime: params.get("overTime") ?? fallback.overTime,
    tenureBand: params.get("tenureBand") ?? fallback.tenureBand,
    promotionBand: params.get("promotionBand") ?? fallback.promotionBand,
    businessTravel: params.get("businessTravel") ?? fallback.businessTravel,
    jobSatisfactionBand: params.get("jobSatisfactionBand") ?? fallback.jobSatisfactionBand,
    workLifeBalanceBand: params.get("workLifeBalanceBand") ?? fallback.workLifeBalanceBand,
  };
}

function countActiveFilters(filters: DashboardFilters) {
  return Object.values(filters).filter((value) => value !== "all").length;
}

function formatMetric(value: number | null | undefined, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "N/A";
}

function formatShortSegmentLabel(value: string) {
  return value.length > 12 ? `${value.slice(0, 10)}...` : value;
}

function formatShortDriverLabel(value: string) {
  if (value.includes("Research")) return "R&D";
  if (value.includes("Sales")) return "Sales";
  if (value.includes("Overtime")) return "Overtime";
  if (value.includes("Promotion")) return "Promotion";
  return value.length > 12 ? `${value.slice(0, 10)}...` : value;
}

function OvertimeGapExplorer({
  rows,
  series,
  selectedTenure,
  onTenureChange,
  summary,
  hazardRatio,
  lowerCi,
  upperCi,
  overTimeFilter,
  onCompare,
  onFocusOvertime,
}: {
  rows: Record<string, number | string>[];
  series: SurvivalSeries[];
  selectedTenure: number;
  onTenureChange: (tenure: number) => void;
  summary: OvertimeGapSummary;
  hazardRatio?: number;
  lowerCi?: number;
  upperCi?: number;
  overTimeFilter: string;
  onCompare: () => void;
  onFocusOvertime: () => void;
}) {
  const canCompare = series.some((item) => item.name === "No") && series.some((item) => item.name === "Yes");
  const tenureOptions = [1, 3, 5, 7, 10].filter((tenure) =>
    rows.some((row) => Number(row.tenure) === tenure),
  );

  return (
    <section className="min-w-0 rounded-[3px] border border-[#37577b] bg-[#0b1f35] p-4 shadow-soft md:p-5">
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-ember">Interactive retention gap</p>
              <h2 className="mt-1 text-xl font-semibold text-ink md:text-2xl">Overtime retention gap explorer</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-sand/80">
                Compare retention by overtime status inside the current population filters and choose the tenure point leaders should plan around.
              </p>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={onCompare}
                className="rounded-full border border-ember/25 bg-[#0b1f35] px-3 py-2 text-sm font-medium text-ink transition hover:border-ember/50 md:px-4"
              >
                Compare groups
              </button>
              <button
                type="button"
                onClick={onFocusOvertime}
                className="rounded-full border border-ember bg-ember px-3 py-2 text-sm font-medium text-white transition hover:bg-[#9E4627] md:px-4"
              >
                Focus overtime
              </button>
            </div>
          </div>

          <div className="h-[250px] sm:h-[280px] md:h-[310px]">
            {canCompare ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 12, right: 18, bottom: 12, left: 4 }}>
                  <CartesianGrid stroke="#274766" />
                  <XAxis dataKey="tenure" label={{ value: "Years at company", position: "insideBottom", offset: -6 }} />
                  <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} width={38} />
                  <Tooltip formatter={(value: number) => `${value}% retained`} />
                  <Legend />
                  <Line type="monotone" dataKey="No" name="No overtime" stroke="#5BC0EB" dot={false} strokeWidth={2.6} />
                  <Line type="monotone" dataKey="Yes" name="Overtime" stroke="#F4727A" dot={false} strokeWidth={2.6} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-[#5f82aa] bg-[#0b1f35] p-6 text-center text-sm leading-6 text-sand/80">
                Set Overtime to All to compare both groups within the current population.
              </div>
            )}
          </div>
        </div>

        <aside className="min-w-0 rounded-[8px] border border-[#37577b] bg-[#0b1f35] p-4 md:p-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-sand/60">Planning horizon</p>
              <p className="mt-1 text-sm text-sand/80">Choose a tenure point for the retention gap.</p>
            </div>
            <select
              aria-label="Overtime retention planning horizon"
              className="rounded-[6px] border border-[#37577b] bg-[#0b1f35] px-3 py-2 text-sm font-medium text-ink"
              value={selectedTenure}
              onChange={(event) => onTenureChange(Number(event.target.value))}
            >
              {(tenureOptions.length > 0 ? tenureOptions : [selectedTenure]).map((tenure) => (
                <option key={tenure} value={tenure}>
                  {tenure} yrs
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <GapMetric label="No overtime" value={formatGapValue(summary.noOvertime)} />
            <GapMetric label="Overtime" value={formatGapValue(summary.overtime)} tone="ember" />
          </div>

          <div className="mt-4 rounded-[8px] bg-mist px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-ember">Retention gap</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              {summary.gap === null ? "N/A" : `${summary.gap.toFixed(1)} pts`}
            </p>
            <p className="mt-2 text-sm leading-6 text-sand/90">
              {summary.gap === null
                ? "Both overtime groups are needed for a gap estimate."
                : `At ${selectedTenure} years, employees reporting overtime retain at a lower modeled rate in this view.`}
            </p>
          </div>

          <div className="mt-4 rounded-[8px] border border-[#37577b] bg-[#0b1f35] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-sand/60">Modeled driver</p>
            <p className="mt-2 text-lg font-semibold text-ink">
              Overtime HR {hazardRatio ? formatMetric(hazardRatio) : "N/A"}
            </p>
            <p className="mt-1 text-sm text-sand/80">
              {lowerCi && upperCi ? `95% CI ${formatMetric(lowerCi)}-${formatMetric(upperCi)}` : "Confidence interval unavailable"}
            </p>
          </div>

          {overTimeFilter !== "all" ? (
            <p className="mt-4 rounded-[8px] border border-ember/20 bg-[#0b1f35] px-4 py-3 text-sm leading-6 text-ember">
              Current Overtime filter is {overTimeFilter}. Use Compare groups to restore the direct comparison.
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function GapMetric({ label, value, tone = "pine" }: { label: string; value: string; tone?: "pine" | "ember" }) {
  return (
    <div className="min-w-0 rounded-[6px] border border-[#37577b] bg-[#0b1f35] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-sand/60">{label}</p>
      <p className={`mt-2 break-words text-2xl font-semibold ${tone === "ember" ? "text-ember" : "text-ocean"}`}>{value}</p>
    </div>
  );
}

function DepartmentPieTooltip({
  active,
  payload,
  totalAttritions,
}: {
  active?: boolean;
  payload?: Array<{ color?: string; payload?: SegmentMetric }>;
  totalAttritions: number;
}) {
  const segment = payload?.[0]?.payload;

  if (!active || !segment) {
    return null;
  }

  return (
    <div className="max-w-[240px] rounded-[6px] border border-[#5f82aa] bg-[#081a2c] px-4 py-3 text-sm text-ink shadow-soft">
      <p className="font-semibold text-white">{segment.segment}</p>
      <div className="mt-2 space-y-1 text-sand/85">
        <p>
          <span className="font-semibold text-white">{segment.attritions}</span> exits (
          {toPercentFromMetric(segment.attritions, totalAttritions)}% of observed exits)
        </p>
        <p>
          <span className="font-semibold text-white">{segment.attritionRate}%</span> attrition rate
        </p>
        <p>{segment.employees} employees in selected scope</p>
      </div>
    </div>
  );
}

function ScenarioPanel({ scenario }: { scenario: ScenarioDefinition }) {
  const badgeTone =
    scenario.expectedDirection === "decrease"
      ? "bg-mist text-ocean"
      : scenario.expectedDirection === "mixed"
        ? "bg-mist text-ember"
        : "bg-[#1b3554] text-sand/90";

  return (
    <div className="mt-5 min-w-0 rounded-[8px] border border-[#37577b] bg-[#0b1f35] p-4 md:p-5">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badgeTone}`}>
        {scenario.expectedDirection === "decrease"
          ? "Expected pressure decreases"
          : scenario.expectedDirection === "mixed"
            ? "Mixed directional effect"
            : "Limited effect"}
      </span>
      <p className="mt-4 break-words text-sm text-sand/90">{scenario.currentState}</p>
      <p className="mt-3 break-words text-sm font-medium text-ink">{scenario.proposedChange}</p>
      <p className="mt-4 break-words text-base leading-7 text-ink">{scenario.impactSummary}</p>
      <p className="mt-4 break-words rounded-[8px] bg-mist px-4 py-3 text-sm text-sand/80">{scenario.caution}</p>
    </div>
  );
}

function RecommendationSection({
  title,
  items,
  ordered,
}: {
  title: string;
  items: string[];
  ordered: boolean;
}) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <section className="min-w-0 rounded-[8px] border border-[#37577b] bg-[#0b1f35] p-4 md:p-5">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <ListTag className={`mt-4 space-y-3 ${ordered ? "list-decimal pl-5" : "list-disc pl-5"}`}>
        {items.map((item) => (
          <li key={item} className="break-words text-sm leading-6 text-sand/90">
            {item}
          </li>
        ))}
      </ListTag>
    </section>
  );
}

function TextPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="min-w-0 rounded-[8px] border border-[#37577b] bg-[#0b1f35] p-4 md:p-5">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-3 break-words text-sm leading-6 text-sand/90">{body}</p>
    </section>
  );
}

function mergeSurvivalSeries(series: SurvivalSeries[]) {
  const rows = new Map<number, Record<string, number | string>>();

  series.forEach((line) => {
    line.points.forEach((point) => {
      const existing = rows.get(point.tenure) ?? { tenure: point.tenure };
      existing[line.name] = point.survival;
      rows.set(point.tenure, existing);
    });
  });

  return Array.from(rows.values()).sort((a, b) => Number(a.tenure) - Number(b.tenure));
}

type OvertimeGapSummary = {
  noOvertime: number | null;
  overtime: number | null;
  gap: number | null;
};

function buildOvertimeGapSummary(series: SurvivalSeries[], tenure: number): OvertimeGapSummary {
  const noOvertime = getSurvivalAtTenure(series.find((item) => item.name === "No"), tenure);
  const overtime = getSurvivalAtTenure(series.find((item) => item.name === "Yes"), tenure);
  const gap = noOvertime === null || overtime === null ? null : Number((noOvertime - overtime).toFixed(1));

  return { noOvertime, overtime, gap };
}

function getSurvivalAtTenure(series: SurvivalSeries | undefined, tenure: number) {
  if (!series || series.points.length === 0) return null;

  const exact = series.points.find((point) => point.tenure === tenure);
  if (exact) return exact.survival;

  const earlierPoints = series.points.filter((point) => point.tenure <= tenure);
  return earlierPoints.length > 0 ? earlierPoints[earlierPoints.length - 1].survival : null;
}

function formatGapValue(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(1)}%`;
}

function getMetric(metrics: SegmentMetric[], dimension: string, segment: string) {
  return metrics.find((metric) => metric.dimension === dimension && metric.segment === segment);
}

function toPercent(part: number, whole: number) {
  return whole ? ((part / whole) * 100).toFixed(1) : "0.0";
}

function toPercentFromMetric(part: number, whole: number) {
  return whole ? ((part / whole) * 100).toFixed(1) : "0.0";
}
