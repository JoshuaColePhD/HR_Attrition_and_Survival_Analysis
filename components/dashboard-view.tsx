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
  "rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-soft backdrop-blur md:p-6";
const chartColors = ["#184A45", "#B6542F", "#B99246", "#536B78", "#7A3B69"];
const primaryFilterKeys: FilterKey[] = ["department", "jobRoleFamily", "overTime", "tenureBand"];
const summarySurfaceClass = `${surfaceClass} border-pine/10 bg-[linear-gradient(180deg,rgba(220,232,226,0.5),rgba(255,255,255,0.92))]`;
const riskSurfaceClass = `${surfaceClass} border-gold/20 bg-[linear-gradient(180deg,rgba(244,224,204,0.46),rgba(255,255,255,0.94))]`;
const modelSurfaceClass = `${surfaceClass} border-plum/15 bg-[linear-gradient(180deg,rgba(232,221,237,0.44),rgba(255,255,255,0.94))]`;

export function DashboardView({ initialPayload }: DashboardViewProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [filters, setFilters] = useState(initialPayload.filters);
  const [selectedTab, setSelectedTab] = useState<DashboardTab>("summary");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioSelection>("overtime");
  const [selectedSurvivalDimension, setSelectedSurvivalDimension] = useState("Department");
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
  const activeFilterCount = countActiveFilters(filters);
  const primaryDefinitions = payload.filterDefinitions.filter((definition) => primaryFilterKeys.includes(definition.key));
  const advancedDefinitions = payload.filterDefinitions.filter((definition) => !primaryFilterKeys.includes(definition.key));

  return (
    <main className="min-h-screen px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 overflow-hidden rounded-[30px] border border-pine/10 bg-ink px-5 py-6 text-white shadow-soft md:px-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-sand/75">
                Executive Attrition Risk Dashboard
              </p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-[2.7rem]">
                Workforce retention risk overview.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-sand/80">
                Aggregated attrition insights for business leaders, with action guidance grounded in current risk patterns.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-sand/90 md:w-[320px]">
              <MetricBadge label="Scope" value={`${payload.summary.filteredEmployees} employees`} />
              <MetricBadge label="Attritions" value={`${payload.summary.filteredAttritions}`} />
              <MetricBadge label="Generated" value={formatGeneratedDate(payload.generatedAt)} />
              <MetricBadge label="Model C-index" value={payload.summary.modelConcordance.toFixed(2)} />
            </div>
          </div>
        </header>

        <div className="sticky top-0 z-10 mb-4 space-y-3 bg-[linear-gradient(180deg,rgba(248,248,244,0.98),rgba(248,248,244,0.9),rgba(248,248,244,0))] pb-3 pt-1 backdrop-blur">
          <TabBar selectedTab={selectedTab} onChange={setSelectedTab} />
          <div className={`${surfaceClass} border-slateblue/10 bg-[linear-gradient(180deg,rgba(220,234,240,0.6),rgba(255,255,255,0.92))]`}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Population filters</p>
                <p className="mt-1 text-sm text-slate-600">
                  {activeFilterCount === 0
                    ? "All employees in view"
                    : `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"} applied`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowMoreFilters((current) => !current)}
                  className="rounded-full border border-pine/20 bg-mist px-4 py-2 text-sm text-ink transition hover:border-pine/40"
                >
                  {showMoreFilters ? "Fewer filters" : "More filters"}
                </button>
                <button
                  type="button"
                  onClick={() => setFilters(payload.filters)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-pine/30"
                >
                  Reset filters
                </button>
              </div>
            </div>
            <FilterBar
              definitions={primaryDefinitions}
              filters={filters}
              onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
            />
            {showMoreFilters ? (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <FilterBar
                  definitions={advancedDefinitions}
                  filters={filters}
                  onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
                />
              </div>
            ) : null}
          </div>
        </div>

        {selectedTab === "summary" ? (
          <section aria-label="Summary tab" className="space-y-4">
            <div className={summarySurfaceClass}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-pine">Summary</p>
                  <h2 className="mt-1 text-2xl font-semibold text-ink">Current attrition picture</h2>
                </div>
                <p className="max-w-xl text-sm text-slate-600">{payload.recommendations.summary}</p>
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

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <section className={summarySurfaceClass}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-pine">Key drivers</p>
                      <h3 className="mt-1 text-xl font-semibold text-ink">What deserves attention first</h3>
                    </div>
                      <div className="rounded-full bg-[#FFF9ED] px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-700">
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
                      <p className="text-xs uppercase tracking-[0.22em] text-pine">Recommended Actions</p>
                      <h3 className="mt-1 text-xl font-semibold text-ink">Evidence-based next steps</h3>
                    </div>
                    <p className="max-w-xl text-sm text-slate-600">{payload.notes.dataScope}</p>
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

              <div className="space-y-4">
                <Panel
                  title="Top segments at risk"
                  subtitle="Highest observed attrition-rate segments in the selected population."
                >
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summarySegments} margin={{ top: 18, right: 14, bottom: 8, left: 8 }}>
                        <CartesianGrid stroke="#E7ECE8" vertical={false} />
                        <XAxis
                          dataKey="segment"
                          tick={{ fontSize: 11 }}
                          interval={0}
                          angle={-10}
                          textAnchor="end"
                          height={46}
                        />
                        <YAxis tickFormatter={(value) => `${value}%`} width={46} tickMargin={8} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Bar dataKey="attritionRate" radius={[8, 8, 0, 0]}>
                          <LabelList
                            dataKey="attritionRate"
                            position="top"
                            formatter={(value: number) => `${value}%`}
                            style={{ fill: "#475467", fontSize: 11, fontWeight: 600 }}
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

                <div className="grid gap-4 md:grid-cols-2">
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
                <h2 className="mt-1 text-2xl font-semibold text-ink">Segment filters and concentration views</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Descriptive patterns update with the global filters and help show where observed attrition is concentrated.
                </p>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Highest attrition segments" subtitle="Ranked by observed attrition rate in the selected population.">
                  <div className="h-[290px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topSegments} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 42 }}>
                        <CartesianGrid stroke="#E7ECE8" horizontal={false} />
                        <XAxis type="number" tickFormatter={(value) => `${value}%`} />
                        <YAxis type="category" dataKey="segment" width={108} tick={{ fill: "#365A55", fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Bar dataKey="attritionRate" radius={[0, 8, 8, 0]}>
                          {topSegments.map((entry) => (
                            <Cell
                              key={`${entry.dimension}-${entry.segment}`}
                              fill={entry.dimension === "Overtime" ? "#B6542F" : entry.dimension === "Business Travel" ? "#7A3B69" : "#B99246"}
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
                  <div className="h-[290px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={topSegments}>
                        <defs>
                          <linearGradient id="mixFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#184A45" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#184A45" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#E7ECE8" />
                        <XAxis dataKey="segment" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={50} />
                        <YAxis tickFormatter={(value) => `${value}%`} width={34} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Area type="monotone" dataKey="shareOfPopulation" stroke="#2B6F8A" fill="url(#mixFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
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
                  <div className="h-[290px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mergeSurvivalSeries(selectedSurvivalSeries)}>
                        <CartesianGrid stroke="#E7ECE8" />
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
            <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
              <div className={modelSurfaceClass}>
                <p className="text-xs uppercase tracking-[0.24em] text-plum">Model + Scenarios</p>
                <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <h2 className="text-2xl font-semibold text-ink">Why risk may be elevated</h2>
                  <p className="max-w-xl text-sm text-slate-600">{payload.notes.modelCaution}</p>
                </div>
                <div className="mt-4 rounded-3xl border border-gold/30 bg-[#FFF9ED] px-4 py-3 text-sm text-slate-700">
                  Modeled effects come from the current Cox proportional hazards analysis. They support prioritization but
                  do not prove causality or justify person-level decisions.
                </div>
                <div className="mt-5 h-[290px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={payload.modelDrivers} margin={{ top: 8, right: 12, bottom: 8, left: 18 }}>
                      <CartesianGrid stroke="#E7ECE8" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={74} />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatMetric(value)} />
                      <Bar dataKey="hazardRatio" radius={[8, 8, 0, 0]}>
                        {payload.modelDrivers.map((driver) => (
                          <Cell key={driver.key} fill={driver.hazardRatio > 1 ? "#B6542F" : "#184A45"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {payload.modelDrivers.map((driver) => (
                    <article key={driver.key} className="rounded-[22px] border border-slate-200 bg-mist/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-ink">{driver.label}</h3>
                        <span className="rounded-full bg-white px-3 py-1 font-mono text-xs text-slate-600">
                          HR {formatMetric(driver.hazardRatio)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{driver.interpretation}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                        95% CI {formatMetric(driver.lowerCi)}-{formatMetric(driver.upperCi)} | p {driver.pValue}
                      </p>
                      {driver.caution ? <p className="mt-3 text-sm text-amber-700">{driver.caution}</p> : null}
                    </article>
                  ))}
                </div>
              </div>

              <div className={modelSurfaceClass}>
                <p className="text-xs uppercase tracking-[0.24em] text-plum">Scenario Explorer</p>
                <h2 className="mt-1 text-2xl font-semibold text-ink">What might reduce pressure</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Aggregate scenarios are designed for staffing and retention planning, not prediction at the employee level.
                </p>
                <div className="mt-5 grid gap-3">
                  {payload.scenarioInputs.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => setSelectedScenario(scenario.id)}
                      className={`rounded-[22px] border px-4 py-4 text-left transition ${
                        selectedScenario === scenario.id
                          ? "border-plum bg-plum text-white"
                          : "border-slate-200 bg-[linear-gradient(180deg,rgba(232,221,237,0.4),rgba(255,255,255,0.92))] text-ink hover:border-plum/40"
                      }`}
                    >
                      <p className="text-sm font-semibold">{scenario.label}</p>
                      <p className={`mt-2 text-sm ${selectedScenario === scenario.id ? "text-sand/85" : "text-slate-600"}`}>
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

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-sand/70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
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
  const tabs: Array<{ id: DashboardTab; label: string }> = [
    { id: "summary", label: "Summary" },
    { id: "risk-patterns", label: "Risk Patterns" },
    { id: "model-scenarios", label: "Model + Scenarios" },
  ];

  return (
    <nav aria-label="Dashboard tabs" className="rounded-full border border-white/70 bg-white/82 p-1 shadow-soft backdrop-blur">
      <div className="grid gap-1 md:grid-cols-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={selectedTab === tab.id}
            onClick={() => onChange(tab.id)}
            className={`rounded-full px-4 py-3 text-sm font-medium transition ${
              selectedTab === tab.id
                ? tab.id === "summary"
                  ? "bg-pine text-white"
                  : tab.id === "risk-patterns"
                    ? "bg-ember text-white"
                    : "bg-plum text-white"
                : "text-slate-600 hover:bg-mist hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
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
    pine: "border-t-pine bg-[linear-gradient(180deg,rgba(220,232,226,0.5),rgba(255,255,255,0.95))]",
    ember: "border-t-ember bg-[linear-gradient(180deg,rgba(244,224,204,0.52),rgba(255,255,255,0.95))]",
    gold: "border-t-gold bg-[linear-gradient(180deg,rgba(249,241,219,0.7),rgba(255,255,255,0.95))]",
    ocean: "border-t-ocean bg-[linear-gradient(180deg,rgba(220,234,240,0.62),rgba(255,255,255,0.95))]",
    plum: "border-t-plum bg-[linear-gradient(180deg,rgba(232,221,237,0.55),rgba(255,255,255,0.95))]",
  } as const;

  return (
    <article className={`rounded-[22px] border border-slate-200 border-t-4 px-4 py-5 ${accentMap[accent]}`}>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{hint}</p>
    </article>
  );
}

function InsightCard({ text, tone }: { text: string; tone: "pine" | "ember" | "ocean" }) {
  const toneMap = {
    pine: "border-pine/20 bg-[linear-gradient(180deg,rgba(220,232,226,0.52),rgba(255,255,255,0.95))]",
    ember: "border-ember/20 bg-[linear-gradient(180deg,rgba(244,224,204,0.56),rgba(255,255,255,0.95))]",
    ocean: "border-ocean/20 bg-[linear-gradient(180deg,rgba(220,234,240,0.6),rgba(255,255,255,0.95))]",
  } as const;

  return (
    <article className={`rounded-[22px] border p-4 ${toneMap[tone]}`}>
      <p className="text-sm leading-6 text-slate-700">{text}</p>
    </article>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function FilterBar({
  definitions,
  filters,
  onChange,
}: {
  definitions: FilterDefinition[];
  filters: DashboardFilters;
  onChange: (key: FilterKey, value: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {definitions.map((definition) => (
        <label key={definition.key} className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-slate-500">{definition.label}</span>
          <select
            aria-label={definition.label}
            className="w-full rounded-[16px] border border-pine/15 bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none transition focus:border-pine"
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
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-mist text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Dimension</th>
            <th className="px-4 py-3">Segment</th>
            <th className="px-4 py-3">Rate</th>
            <th className="px-4 py-3">Attritions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.dimension}-${row.segment}`} className="border-t border-slate-100">
              <td className="px-4 py-3 text-slate-500">{row.dimension}</td>
              <td className="px-4 py-3 font-medium text-ink">{row.segment}</td>
              <td className="px-4 py-3 text-ember">{row.attritionRate}%</td>
              <td className="px-4 py-3 text-ink">{row.attritions}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    ember: "border-ember/20 bg-[linear-gradient(180deg,rgba(244,224,204,0.56),rgba(255,255,255,0.95))]",
    ocean: "border-ocean/20 bg-[linear-gradient(180deg,rgba(220,234,240,0.6),rgba(255,255,255,0.95))]",
  } as const;

  return (
    <section className={`rounded-[22px] border p-5 ${toneMap[tone]}`}>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <ul className="mt-3 space-y-3 pl-5 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item} className="list-disc">
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
      ? "bg-[#ECF8F3] text-pine"
      : scenario.expectedDirection === "mixed"
        ? "bg-[#FFF4E6] text-ember"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badgeTone}`}>
        {scenario.expectedDirection === "decrease"
          ? "Expected pressure decreases"
          : scenario.expectedDirection === "mixed"
            ? "Mixed directional effect"
            : "Limited effect"}
      </span>
      <p className="mt-4 text-sm text-slate-700">{scenario.currentState}</p>
      <p className="mt-3 text-sm font-medium text-ink">{scenario.proposedChange}</p>
      <p className="mt-4 text-base leading-7 text-ink">{scenario.impactSummary}</p>
      <p className="mt-4 rounded-[18px] bg-mist px-4 py-3 text-sm text-slate-600">{scenario.caution}</p>
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
    <section className="rounded-[22px] border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <ListTag className={`mt-4 space-y-3 ${ordered ? "list-decimal pl-5" : "list-disc pl-5"}`}>
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-slate-700">
            {item}
          </li>
        ))}
      </ListTag>
    </section>
  );
}

function TextPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-700">{body}</p>
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

function getMetric(metrics: SegmentMetric[], dimension: string, segment: string) {
  return metrics.find((metric) => metric.dimension === dimension && metric.segment === segment);
}

function toPercent(part: number, whole: number) {
  return whole ? ((part / whole) * 100).toFixed(1) : "0.0";
}

function toPercentFromMetric(part: number, whole: number) {
  return whole ? ((part / whole) * 100).toFixed(1) : "0.0";
}
