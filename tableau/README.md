# Tableau Public Dashboard Setup

This folder contains the CSV to use for the real Tableau Public workbook:

- `hr_attrition_tableau_export.csv`

Recommended dashboard structure:

1. KPI band: employee count, attrition count, attrition rate, active employees, average age.
2. Department attrition: pie or packed bar by `Department` and `Attrition`.
3. Age distribution: bar chart using `Age` grouped into bins.
4. Satisfaction matrix: heatmap by `JobRole` and `JobSatisfaction`.
5. Education field attrition: horizontal bar chart by `EducationField`.
6. Filters: `Department`, `EducationField`, `OverTime`, `BusinessTravel`, `YearsAtCompany`.

After publishing to Tableau Public, set this Vercel environment variable:

```text
NEXT_PUBLIC_TABLEAU_VIZ_URL=https://public.tableau.com/views/YOUR_WORKBOOK/YOUR_VIEW
```

The Next.js app will then render the published Tableau dashboard directly.
