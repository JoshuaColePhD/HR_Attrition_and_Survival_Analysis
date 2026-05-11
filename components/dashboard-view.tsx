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
  const concentrationRows = useMemo(() => payload.concentrationTable.slice(0, 6), [payload.concentrationTable]);
  const survivalDimensionOptions = Object.keys(payload.survival.byDimension);
  const selectedScenarioDetails =
    payload.scenarioInputs.find((item) => item.id === selectedScenario) ?? payload.scenarioInputs[0];
  const selectedSurvivalSeries = payload.survival.byDimension[selectedSurvivalDimension] ?? payload.survival.overall;
  const overtimeSeries = payload.survival.byDimension.OverTime ?? [];
  const overtimeDriver = payload.modelDrivers.find((driver) => driver.key === "OverTimeYes");
  const overtimeGapRows = useMemo(() => mergeSurvivalSeries(overtimeSeries), [overtimeSeries]);
  const overtimeGapSummary = useMemo(
    () => buildOvertimeGapSummary(overtimeSeries, selectedGapTenure),
    [overtimeSeries, selectedGapTenure],
  );
  const activeFilterCount = countActiveFilters(filters);
  const primaryDefinitions = payload.filterDefinitions.filter((definition) => primaryFilterKeys.includes(definition.key));
  const advancedDefinitions = payload.filterDefinitions.filter((definition) => !primaryFilterKeys.includes(definition.key));

  return (
    <main className="min-h-screen overflow-x-hidden px-3 py-4 md:px-7 md:py-6">
      <div className="mx-auto w-full max-w-7xl min-w-0">
        <header className="mb-0 overflow-hidden rounded-t-[3px] border border-[#42658d] bg-[#071321] text-white shadow-soft">
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[#345779] bg-[#0a1b2e] px-4 py-2 md:px-6">
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-[2px] border border-gold/50 bg-white/8 text-lg font-semibold text-gold">
                +
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Tableau-style BI view</p>
            </div>
            <p className="hidden text-xs uppercase tracking-[0.18em] text-sand/75 sm:block">People Analytics</p>
          </div>
          <div className="flex flex-col gap-4 bg-[linear-gradient(120deg,#0d2037,#1c4771)] px-4 py-5 md:flex-row md:items-end md:justify-between md:px-6 md:py-6">
            <div className="min-w-0 max-w-4xl">
              <h1 className="text-balance text-3xl font-semibold uppercase tracking-[0.02em] text-white sm:text-4xl md:text-[2.75rem]">
                HR Analytics Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-sand md:text-base">
                Aggregated attrition insights for business leaders, with action guidance grounded in current risk patterns.
              </p>
            </div>
            <div className="rounded-[3px] border border-[#6d8db4] bg-[#0b1f35]/80 px-4 py-3 text-sm text-sand md:min-w-[250px]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Dashboard view</p>
              <p className="mt-1 font-semibold text-white">{activeFilterCount === 0 ? "Full workforce" : `${activeFilterCount} filtered dimension${activeFilterCount === 1 ? "" : "s"}`}</p>
            </div>
          </div>
        </header>

        <ContextBar
          employees={payload.summary.filteredEmployees}
          attritions={payload.summary.filteredAttritions}
          activeFilterCount={activeFilterCount}
          generatedAt={payload.generatedAt}
          modelConcordance={payload.summary.modelConcordance}
        />

        <div className="sticky top-0 z-10 mb-3 bg-[linear-gradient(180deg,rgba(8,17,31,0.98),rgba(8,17,31,0.86),rgba(8,17,31,0))] pb-2 pt-2 backdrop-blur md:mb-4">
          <TabBar selectedTab={selectedTab} onChange={setSelectedTab} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <FilterPanel
            activeFilterCount={activeFilterCount}
            showMoreFilters={showMoreFilters}
            onToggleMore={() => setShowMoreFilters((current) => !current)}
            onReset={() => setFilters(payload.filters)}
            primaryDefinitions={primaryDefinitions}
            advancedDefinitions={advancedDefinitions}
            filters={filters}
            onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          />
          <div className="min-w-0">
        {selectedTab === "summary" ? (
          <section aria-label="Summary tab" className="space-y-4">
            <div className={summarySurfaceClass}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-gold">Summary</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink md:text-2xl">Current attrition picture</h2>
                </div>
                <p className="max-w-xl text-sm text-sand/80">{payload.recommendations.summary}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-5">
                <KpiCard label="Employees" value={payload.summary.filteredEmployees} hint="Selected scope" accent="pine" />
                <KpiCard
                  label="Attrition Rate"
                  value={`${toPercent(payload.summary.filteredAttritions, payload.summary.filteredEmployees)}%`}
                  hint={`Overall baseline ${payload.summary.attritionRate}%`}
                  accent="ember"
                />
                <KpiCard
                  label="Observed Attritions"
                  value={payload.summary.filteredAttritions}
                  hint="Historical exits in view"
                  accent="gold"
                />
                <KpiCard
                  label="Overtime Share"
                  value={`${toPercentFromMetric(
                    getMetric(payload.segmentMetrics, "Overtime", "Yes")?.employees ?? 0,
                    payload.summary.filteredEmployees,
                  )}%`}
                  hint="Current filtered population"
                  accent="ocean"
                />
                <KpiCard label="Median Tenure" value={`${payload.summary.medianTenure} yrs`} hint="Org-wide baseline" accent="plum" />
              </div>
            </div>

            <OvertimeGapExplorer
              rows={overtimeGapRows}
              series={overtimeSeries}
              selectedTenure={selectedGapTenure}
              onTenureChange={setSelectedGapTenure}
              summary={overtimeGapSummary}
              hazardRatio={overtimeDriver?.hazardRatio}
              lowerCi={overtimeDriver?.lowerCi}
              upperCi={overtimeDriver?.upperCi}
              overTimeFilter={filters.overTime}
              onCompare={() => setFilters((current) => ({ ...current, overTime: "all" }))}
              onFocusOvertime={() => setFilters((current) => ({ ...current, overTime: "Yes" }))}
            />

            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="min-w-0 space-y-4">
                <section className={summarySurfaceClass}>
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-gold">Key drivers</p>
                  <h3 className="mt-1 text-lg font-semibold text-ink md:text-xl">What deserves attention first</h3>
                    </div>
                      <div className="w-fit max-w-full rounded-[4px] border border-[#37577b] bg-mist px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-sand/80 sm:text-xs sm:tracking-[0.18em]">
                      Risk-informed view
                      </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {payload.recommendations.keyDrivers.slice(0, 3).map((item, index) => (
                      <InsightCard key={item} text={item} tone={index % 3 === 0 ? "pine" : index % 3 === 1 ? "ember" : "ocean"} />
                    ))}
                  </div>
                </section>

                <section className={summarySurfaceClass}>
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-gold">Recommended Actions</p>
                      <h3 className="mt-1 text-lg font-semibold text-ink md:text-xl">Evidence-based next steps</h3>
                    </div>
                    <p className="max-w-xl text-sm text-sand/80">{payload.notes.dataScope}</p>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                    <RecommendationSection
                      title="Recommended actions"
                      items={payload.recommendations.recommendedActions}
                      ordered
                    />
                    <div className="space-y-4">
                      <TextPanel title="Manager Guidance" body={payload.recommendations.managerGuidance} />
                      <TextPanel title="HR / Leadership Guidance" body={payload.recommendations.hrLeadershipGuidance} />
                    </div>
                  </div>
                </section>
              </div>

              <div className="min-w-0 space-y-4">
                <Panel
                  title="Top segments at risk"
                  subtitle="Highest observed attrition-rate segments in the selected population."
                >
                  <div className="h-[260px] sm:h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summarySegments} margin={{ top: 18, right: 8, bottom: 8, left: 0 }}>
                        <CartesianGrid stroke="#274766" vertical={false} />
                        <XAxis
                          dataKey="segment"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-24}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tickFormatter={(value) => `${value}%`} width={46} tickMargin={8} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Bar dataKey="attritionRate" radius={[8, 8, 0, 0]}>
                          <LabelList
                            dataKey="attritionRate"
                            position="top"
                            formatter={(value: number) => `${value}%`}
                            style={{ fill: "#D7E4F7", fontSize: 11, fontWeight: 600 }}
                          />
                          {summarySegments.map((segment, index) => (
                            <Cell
                              key={`${segment.dimension}-${segment.segment}`}
                              fill={chartColors[index % chartColors.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <Panel
                  title="Hotspot table"
                  subtitle="Short list of the most concentrated attrition hotspots in the selected population."
                >
                  <CompactTable rows={concentrationRows.slice(0, 4)} />
                </Panel>

                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <CompactListCard title="Cautions / Limitations" items={payload.recommendations.cautions} tone="ember" />
                  <CompactListCard title="Monitoring Suggestions" items={payload.recommendations.monitoringSuggestions} tone="ocean" />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {selectedTab === "risk-patterns" ? (
          <section aria-label="Risk Patterns tab" className="space-y-4">
            <div className={riskSurfaceClass}>
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.24em] text-ember">Risk Patterns</p>
                <h2 className="mt-1 text-xl font-semibold text-ink md:text-2xl">Segment filters and concentration views</h2>
                <p className="mt-2 max-w-2xl text-sm text-sand/80">
                  Descriptive patterns update with the global filters and help show where observed attrition is concentrated.
                </p>
              </div>
              <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                <Panel title="Highest attrition segments" subtitle="Ranked by observed attrition rate in the selected population.">
                  <div className="h-[250px] sm:h-[290px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topSegments} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 42 }}>
                        <CartesianGrid stroke="#274766" horizontal={false} />
                        <XAxis type="number" tickFormatter={(value) => `${value}%`} />
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
                      <AreaChart data={topSegments}>
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
                        <YAxis tickFormatter={(value) => `${value}%`} width={34} />
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
                      <LineChart data={mergeSurvivalSeries(selectedSurvivalSeries)}>
                        <CartesianGrid stroke="#274766" />
                        <XAxis dataKey="tenure" label={{ value: "Years at company", position: "insideBottom", offset: -4 }} />
                        <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} width={38} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Legend />
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
          <section aria-label="Model and Scenarios tab" className="space-y-4">
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
        </div>
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
    <section className="min-w-0 rounded-[8px] border border-[#37577b] bg-[#0b1f35] p-4 shadow-[0_8px_18px_rgba(17,24,39,0.04)] md:p-5">
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
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-mist text-left text-[11px] uppercase tracking-[0.18em] text-sand/60">
            <tr>
              <th className="px-4 py-3">Dimension</th>
              <th className="px-4 py-3">Segment</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Attritions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.dimension}-${row.segment}`} className="border-t border-[#26415f]">
                <td className="px-4 py-3 text-sand/60">{row.dimension}</td>
                <td className="px-4 py-3 font-medium text-ink">{row.segment}</td>
                <td className="px-4 py-3 text-ember">{row.attritionRate}%</td>
                <td className="px-4 py-3 text-ink">{row.attritions}</td>
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
