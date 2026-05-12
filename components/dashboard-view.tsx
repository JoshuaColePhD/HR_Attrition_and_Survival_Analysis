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
  FilterDefinition,
  FilterKey,
  ScenarioDefinition,
  SegmentMetric,
  SurvivalSeries,
} from "@/lib/types";

type DashboardViewProps = {
  initialPayload: DashboardPayload;
};

type ScenarioSelection = "overtime" | "promotion";
type DashboardTab = "summary" | "risk-patterns" | "model-scenarios";

const surfaceClass =
  "w-full max-w-full min-w-0 rounded-[3px] border border-[#37577b] bg-[#132a46]/92 p-4 shadow-soft md:p-5";
const chartColors = ["#5BC0EB", "#F4727A", "#F6C85F", "#9B7EDE", "#4E79A7"];
const primaryFilterKeys: FilterKey[] = ["department", "jobRoleFamily", "overTime", "tenureBand"];
const dashboardShellClass =
  "overflow-hidden rounded-[3px] border border-[#42658d] bg-[radial-gradient(circle_at_25%_45%,rgba(23,146,161,0.35),transparent_28rem),linear-gradient(135deg,#05345a_0%,#07556a_48%,#08203b_100%)] p-4 shadow-soft";
const summaryChartClass = "min-h-[250px] min-w-0 flex-1";
const summarySurfaceClass = `${surfaceClass}`;
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
    <div className="mb-4">
      <div>
        <h2 className="text-2xl font-semibold uppercase tracking-[0.02em] text-[#48a8ff] md:text-3xl">
          HR Analytics Dashboard
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-sand/85">{subtitle}</p>
      </div>

      <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="flex shrink-0 flex-wrap gap-2">
          {[
            { id: "summary" as DashboardTab, label: "Summary" },
            { id: "risk-patterns" as DashboardTab, label: "Risk Patterns" },
            { id: "model-scenarios" as DashboardTab, label: "Model + Scenarios" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.label}
              aria-pressed={selectedTab === tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`min-h-9 rounded-[2px] border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                selectedTab === tab.id
                  ? "border-[#4aa8ff] bg-[#1477c8] text-white"
                  : "border-[#4d8abb] bg-[#10385f] text-sand hover:border-[#7bbdff]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2 xl:justify-end">
          {primaryDefinitions.map((definition) => (
            <label key={definition.key} className="min-w-[126px] flex-1 sm:max-w-[170px] xl:flex-none">
              <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-gold">
                {definition.label}
              </span>
              <select
                aria-label={definition.label}
                className="h-9 w-full rounded-[2px] border border-[#4d8abb] bg-[#10385f] px-2 text-xs font-semibold text-sand outline-none transition focus:border-[#7bbdff]"
                value={filters[definition.key]}
                onChange={(event) => setFilters((current) => ({ ...current, [definition.key]: event.target.value }))}
              >
                {definition.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <button
            type="button"
            onClick={() => setShowMoreFilters((current) => !current)}
            className="h-9 rounded-[2px] border border-[#4d8abb] bg-[#10385f] px-3 text-xs font-semibold text-sand transition hover:border-[#7bbdff]"
          >
            {showMoreFilters ? "Fewer filters" : `More filters${activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}`}
          </button>
          <button
            type="button"
            onClick={() => setFilters(payload.filters)}
            className="h-9 rounded-[2px] border border-gold/60 bg-gold px-3 text-xs font-semibold text-[#071321] transition hover:bg-[#ffd977]"
          >
            Reset
          </button>
        </div>
      </div>

      {showMoreFilters ? (
        <div className="mt-3 rounded-[3px] border border-[#37577b] bg-[#0b1f35]/75 p-3">
          <FilterBar
            definitions={advancedDefinitions}
            filters={filters}
            onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <main className="min-h-screen overflow-x-hidden px-3 py-4 md:px-7 md:py-6">
      <div className="mx-auto w-full max-w-7xl min-w-0">
        {selectedTab === "summary" ? (
          <section aria-label="Summary tab" className={dashboardShellClass}>
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
              <Panel title="Attrition by Department" subtitle="Observed attritions by department.">
                <div className={summaryChartClass}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
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
                      <Tooltip formatter={(value: number) => `${value} attritions`} />
                      <Legend />
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
                    <BarChart data={summarySegments} layout="vertical" margin={{ top: 10, right: 46, bottom: 10, left: 68 }}>
                      <CartesianGrid stroke="#2b6687" horizontal={false} />
                      <XAxis type="number" domain={[0, 40]} tickFormatter={(value) => `${value}%`} />
                      <YAxis type="category" dataKey="segment" width={104} tick={{ fill: "#F8FAFC", fontSize: 11 }} />
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
          </section>
        ) : null}

        {selectedTab === "risk-patterns" ? (
          <section aria-label="Risk Patterns tab" className={dashboardShellClass}>
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
          </section>
        ) : null}

        {selectedTab === "model-scenarios" ? (
          <section aria-label="Model and Scenarios tab" className={dashboardShellClass}>
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
          </section>
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

function formatGeneratedDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function ContextBar({
  employees,
  attritions,
  activeFilterCount,
  generatedAt,
  modelConcordance,
}: {
  employees: number;
  attritions: number;
  activeFilterCount: number;
  generatedAt: string;
  modelConcordance: number;
}) {
  const items = [
    { label: "Selected population", value: `${employees} employees` },
    { label: "Observed attritions", value: `${attritions}` },
    { label: "Filters active", value: activeFilterCount === 0 ? "None" : `${activeFilterCount}` },
    { label: "Generated", value: formatGeneratedDate(generatedAt) },
    { label: "Model C-index", value: modelConcordance.toFixed(2) },
  ];

  return (
    <div className="mb-3 grid min-w-0 gap-0 border-x border-b border-[#42658d] bg-[#102846] shadow-soft md:mb-4 md:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 border-b border-[#37577b] px-4 py-3 md:border-b-0 md:border-r last:md:border-r-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">{item.label}</p>
          <p className="mt-1 break-words text-xl font-semibold text-white md:text-2xl">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function TabBar({
  selectedTab,
  onChange,
}: {
  selectedTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}) {
  const tabs: Array<{ id: DashboardTab; label: string; shortLabel: string }> = [
    { id: "summary", label: "Summary", shortLabel: "Summary" },
    { id: "risk-patterns", label: "Risk Patterns", shortLabel: "Risks" },
    { id: "model-scenarios", label: "Model + Scenarios", shortLabel: "Scenarios" },
  ];

  return (
    <nav aria-label="Dashboard tabs" className="rounded-[3px] border border-[#42658d] bg-[#102846] p-1 shadow-soft">
      <div className="grid grid-cols-3 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-label={tab.label}
            aria-pressed={selectedTab === tab.id}
            onClick={() => onChange(tab.id)}
            className={`min-h-10 min-w-0 rounded-[4px] px-1.5 py-2 text-xs font-semibold leading-tight transition md:px-4 md:py-2.5 md:text-sm ${
              selectedTab === tab.id
                ? tab.id === "summary"
                  ? "bg-slateblue text-white"
                  : tab.id === "risk-patterns"
                    ? "bg-ember text-[#071321]"
                    : "bg-ocean text-[#071321]"
                : "text-sand hover:bg-[#19385c] hover:text-white"
            }`}
          >
            <span aria-hidden="true" className="md:hidden">{tab.shortLabel}</span>
            <span aria-hidden="true" className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function FilterPanel({
  activeFilterCount,
  showMoreFilters,
  onToggleMore,
  onReset,
  primaryDefinitions,
  advancedDefinitions,
  filters,
  onChange,
}: {
  activeFilterCount: number;
  showMoreFilters: boolean;
  onToggleMore: () => void;
  onReset: () => void;
  primaryDefinitions: FilterDefinition[];
  advancedDefinitions: FilterDefinition[];
  filters: DashboardFilters;
  onChange: (key: FilterKey, value: string) => void;
}) {
  return (
    <aside className="min-w-0 rounded-[3px] border border-[#42658d] bg-[#0b1f35] p-4 text-white shadow-soft lg:sticky lg:top-[76px] lg:self-start">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold">Filter</p>
        <p className="rounded-[3px] border border-gold/30 bg-gold/10 px-2 py-1 text-[11px] font-semibold text-gold">
          {activeFilterCount === 0 ? "All" : `${activeFilterCount} active`}
        </p>
      </div>

      <FilterBar definitions={primaryDefinitions} filters={filters} onChange={onChange} variant="rail" />

      {showMoreFilters ? (
        <div className="mt-4 border-t border-white/20 pt-4">
          <FilterBar definitions={advancedDefinitions} filters={filters} onChange={onChange} variant="rail" />
        </div>
      ) : null}

      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={onToggleMore}
          className="rounded-[3px] border border-[#5f82aa] bg-[#173c61] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#214d78]"
        >
          {showMoreFilters ? "Fewer filters" : "More filters"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-[3px] border border-gold/50 bg-gold px-3 py-2 text-sm font-semibold text-[#071321] transition hover:bg-[#ffd977]"
        >
          Reset filters
        </button>
      </div>
    </aside>
  );
}

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  accent: "pine" | "ember" | "gold" | "ocean" | "plum";
}) {
  const accentMap = {
    pine: "border-t-ocean bg-[#0b1f35]",
    ember: "border-t-ember bg-[#0b1f35]",
    gold: "border-t-gold bg-[#0b1f35]",
    ocean: "border-t-ocean bg-[#0b1f35]",
    plum: "border-t-plum bg-[#0b1f35]",
  } as const;

  return (
    <article className={`min-w-0 rounded-[3px] border border-[#37577b] border-t-4 px-4 py-3 md:py-4 ${accentMap[accent]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold md:text-[11px]">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-white md:text-[1.65rem]">{value}</p>
      <p className="mt-1 break-words text-xs text-sand/75 md:text-sm">{hint}</p>
    </article>
  );
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

function InsightCard({ text, tone }: { text: string; tone: "pine" | "ember" | "ocean" }) {
  const toneMap = {
    pine: "border-[#37577b] bg-[#0b1f35]",
    ember: "border-[#37577b] bg-[#0b1f35]",
    ocean: "border-[#37577b] bg-[#0b1f35]",
  } as const;

  return (
    <article className={`min-w-0 rounded-[6px] border p-4 ${toneMap[tone]}`}>
      <p className="break-words text-sm leading-6 text-sand/90">{text}</p>
    </article>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col rounded-[8px] border border-[#37577b] bg-[#0b1f35] p-4 shadow-[0_8px_18px_rgba(17,24,39,0.04)] md:p-5">
      <div className="mb-4 min-w-0 border-b border-[#26415f] pb-3">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1 break-words text-sm text-sand/80">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function FilterBar({
  definitions,
  filters,
  onChange,
  variant = "default",
}: {
  definitions: FilterDefinition[];
  filters: DashboardFilters;
  onChange: (key: FilterKey, value: string) => void;
  variant?: "default" | "rail";
}) {
  const isRail = variant === "rail";

  return (
    <div className={isRail ? "grid gap-4" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}>
      {definitions.map((definition) => (
        <label key={definition.key} className="block">
          <span className={`mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] ${isRail ? "text-white/82" : "text-sand/60"}`}>
            {definition.label}
          </span>
          <select
            aria-label={definition.label}
            className={`w-full rounded-[6px] border px-3 py-2.5 text-sm shadow-sm outline-none transition md:px-3 md:py-2.5 ${
              isRail
                ? "border-white/30 bg-[#0b1f35] text-ink focus:border-white"
                : "border-[#37577b] bg-[#0b1f35] text-ink focus:border-pine"
            }`}
            value={filters[definition.key]}
            onChange={(event) => onChange(definition.key, event.target.value)}
          >
            {definition.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function CompactTable({ rows }: { rows: SegmentMetric[] }) {
  return (
    <div className="rounded-[8px] border border-[#37577b]">
      <div className="divide-y divide-slate-100 sm:hidden">
        {rows.map((row) => (
          <article key={`${row.dimension}-${row.segment}`} className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-sand/60">{row.dimension}</p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-semibold text-ink">{row.segment}</p>
              <p className="shrink-0 text-sm font-semibold text-ember">{row.attritionRate}%</p>
            </div>
            <p className="mt-2 text-xs text-sand/60">{row.attritions} attritions</p>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full table-fixed border-collapse text-sm">
          <thead className="bg-mist text-left text-[10px] uppercase tracking-[0.12em] text-sand/60">
            <tr>
              <th className="w-[26%] px-3 py-3">Dimension</th>
              <th className="w-[31%] px-3 py-3">Segment</th>
              <th className="w-[19%] px-3 py-3">Rate</th>
              <th className="w-[24%] px-3 py-3">Attritions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.dimension}-${row.segment}`} className="border-t border-[#26415f]">
                <td className="px-3 py-3 text-sand/60">{row.dimension}</td>
                <td className="break-words px-3 py-3 font-medium text-ink">{row.segment}</td>
                <td className="px-3 py-3 text-ember">{row.attritionRate}%</td>
                <td className="px-3 py-3 text-ink">{row.attritions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompactListCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "ember" | "ocean";
}) {
  const toneMap = {
    ember: "border-[#37577b] bg-[#0b1f35]",
    ocean: "border-[#37577b] bg-[#0b1f35]",
  } as const;

  return (
    <section className={`min-w-0 rounded-[3px] border p-4 md:p-5 ${toneMap[tone]}`}>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <ul className="mt-3 space-y-3 pl-5 text-sm leading-6 text-sand/90">
        {items.map((item) => (
          <li key={item} className="list-disc break-words">
            {item}
          </li>
        ))}
      </ul>
    </section>
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
