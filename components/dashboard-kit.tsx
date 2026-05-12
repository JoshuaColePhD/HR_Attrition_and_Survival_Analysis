"use client";

import React from "react";
import { SegmentMetric } from "@/lib/types";

export type DashboardTabOption<TTab extends string> = {
  id: TTab;
  label: string;
};

export type DashboardFilterOption = {
  value: string;
  label: string;
};

export type DashboardFilterDefinition<TKey extends string> = {
  key: TKey;
  label: string;
  options: DashboardFilterOption[];
};

type DashboardHeaderProps<TTab extends string, TFilterKey extends string> = {
  title: string;
  subtitle: string;
  selectedTab: TTab;
  tabs: DashboardTabOption<TTab>[];
  filters: Record<TFilterKey, string>;
  primaryFilters: DashboardFilterDefinition<TFilterKey>[];
  advancedFilters: DashboardFilterDefinition<TFilterKey>[];
  showMoreFilters: boolean;
  activeFilterCount: number;
  onTabChange: (tab: TTab) => void;
  onFilterChange: (key: TFilterKey, value: string) => void;
  onToggleMoreFilters: () => void;
  onResetFilters: () => void;
};

export function DashboardShell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section
      aria-label={label}
      className="overflow-hidden rounded-[3px] border border-[#42658d] bg-[radial-gradient(circle_at_25%_45%,rgba(23,146,161,0.35),transparent_28rem),linear-gradient(135deg,#05345a_0%,#07556a_48%,#08203b_100%)] p-4 shadow-soft"
    >
      {children}
    </section>
  );
}

export function DashboardHeader<TTab extends string, TFilterKey extends string>({
  title,
  subtitle,
  selectedTab,
  tabs,
  filters,
  primaryFilters,
  advancedFilters,
  showMoreFilters,
  activeFilterCount,
  onTabChange,
  onFilterChange,
  onToggleMoreFilters,
  onResetFilters,
}: DashboardHeaderProps<TTab, TFilterKey>) {
  return (
    <div className="mb-4">
      <div>
        <h2 className="text-2xl font-semibold uppercase tracking-[0.02em] text-[#48a8ff] md:text-3xl">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-sand/85">{subtitle}</p>
      </div>

      <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="flex shrink-0 flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.label}
              aria-pressed={selectedTab === tab.id}
              onClick={() => onTabChange(tab.id)}
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
          {primaryFilters.map((definition) => (
            <label key={definition.key} className="min-w-[126px] flex-1 sm:max-w-[170px] xl:flex-none">
              <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-gold">
                {definition.label}
              </span>
              <select
                aria-label={definition.label}
                className="h-9 w-full rounded-[2px] border border-[#4d8abb] bg-[#10385f] px-2 text-xs font-semibold text-sand outline-none transition focus:border-[#7bbdff]"
                value={filters[definition.key]}
                onChange={(event) => onFilterChange(definition.key, event.target.value)}
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
            onClick={onToggleMoreFilters}
            className="h-9 rounded-[2px] border border-[#4d8abb] bg-[#10385f] px-3 text-xs font-semibold text-sand transition hover:border-[#7bbdff]"
          >
            {showMoreFilters ? "Fewer filters" : `More filters${activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}`}
          </button>
          <button
            type="button"
            onClick={onResetFilters}
            className="h-9 rounded-[2px] border border-gold/60 bg-gold px-3 text-xs font-semibold text-[#071321] transition hover:bg-[#ffd977]"
          >
            Reset
          </button>
        </div>
      </div>

      {showMoreFilters ? (
        <div className="mt-3 rounded-[3px] border border-[#37577b] bg-[#0b1f35]/75 p-3">
          <FilterBar definitions={advancedFilters} filters={filters} onChange={onFilterChange} />
        </div>
      ) : null}
    </div>
  );
}

export function KpiCard({
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

export function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
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

export function FilterBar<TKey extends string>({
  definitions,
  filters,
  onChange,
  variant = "default",
}: {
  definitions: DashboardFilterDefinition<TKey>[];
  filters: Record<TKey, string>;
  onChange: (key: TKey, value: string) => void;
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

export function CompactTable({ rows }: { rows: SegmentMetric[] }) {
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
