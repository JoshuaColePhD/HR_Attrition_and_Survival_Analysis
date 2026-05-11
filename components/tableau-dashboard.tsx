"use client";

import Script from "next/script";
import React from "react";

type TableauDashboardProps = {
  tableauUrl: string;
};

export function TableauDashboard({ tableauUrl }: TableauDashboardProps) {
  const hasTableauUrl = tableauUrl.trim().length > 0;

  return (
    <main className="min-h-screen bg-[#f4f5f7] px-4 py-5 text-[#111827] md:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-4 border border-[#d4d8df] bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4e79a7]">Actual Tableau Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">HR Analytics Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4b5563]">
            This page is configured to render a published Tableau Public workbook using Tableau's Embedding API.
          </p>
        </header>

        {hasTableauUrl ? (
          <section className="border border-[#d4d8df] bg-white p-2 shadow-sm">
            <Script
              src="https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js"
              strategy="afterInteractive"
              type="module"
            />
            {/*
              React does not need a custom JSX type here because this element is
              created dynamically. Tableau's script upgrades it in the browser.
            */}
            {React.createElement("tableau-viz", {
              src: tableauUrl,
              toolbar: "bottom",
              "hide-tabs": "true",
              style: { width: "100%", minHeight: "82vh", display: "block" },
            })}
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px]">
            <div className="border border-[#d4d8df] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Publish the workbook, then paste the Tableau URL</h2>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-[#374151]">
                <li>Open Tableau Public and connect to `tableau/hr_attrition_tableau_export.csv`.</li>
                <li>Build the HR Analytics dashboard in Tableau Public.</li>
                <li>Publish it to Tableau Public.</li>
                <li>Add the published view URL as `NEXT_PUBLIC_TABLEAU_VIZ_URL` in Vercel.</li>
              </ol>
            </div>

            <aside className="border border-[#d4d8df] bg-[#102846] p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f6c85f]">Recommended Tableau layout</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#d7e4f7]">
                <li>KPI strip: employee count, attrition count, attrition rate, active employees, average age.</li>
                <li>Top row: department attrition, age group distribution, satisfaction matrix.</li>
                <li>Bottom row: education field attrition and gender or tenure survival patterns.</li>
                <li>Filters: department, education field, overtime, business travel, tenure band.</li>
              </ul>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
