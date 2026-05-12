# Dashboard Kit

Reusable presentation components for the executive BI dashboard style.

Copy `components/dashboard-kit.tsx` into another Next/React project when you want the same look. The kit includes:

- `DashboardShell`
- `DashboardHeader`
- `KpiCard`
- `Panel`
- `FilterBar`
- `CompactTable`

Keep project-specific data fetching, chart data shaping, and business copy outside the kit. In a new project, wire your own tabs, filters, KPI values, chart data, and table rows into these components.

You will also want to copy the Tailwind color tokens and shadows from `tailwind.config.ts` so the classes resolve to the same visual theme.
