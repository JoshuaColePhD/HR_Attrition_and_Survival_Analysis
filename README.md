# HR Attrition and Survival Analysis

People analytics portfolio project using survival analysis and an executive BI dashboard to identify when attrition risk accelerates, which workforce conditions are associated with that risk, and where HR should intervene first.

**Live dashboard:** https://hr-attrition-dashboard.vercel.app  
**Repository:** https://github.com/JoshuaColePhD/HR_Attrition_and_Survival_Analysis

[![Attrition risk driver chart](figures/attrition_risk_drivers_clean.png)](https://hr-attrition-dashboard.vercel.app)

*Static README visual: adjusted hazard ratios from the Cox proportional hazards model. Open the live dashboard for interactive filters, KPI views, survival curves, and scenario framing.*

## Executive Summary

Most attrition models answer a limited question: did an employee leave or not? This project treats attrition as a time-to-event problem instead, preserving tenure information for employees who have not yet left and showing when risk accumulates.

The headline finding is clear: **employees reporting overtime show about 3.1x higher adjusted attrition hazard** than employees not reporting overtime, after controlling for department and years since last promotion. In business terms, workload pressure is the strongest actionable retention signal in this analysis.

| Finding | Evidence | Business implication |
| --- | ---: | --- |
| Overtime is the dominant modeled risk factor | HR = 3.07, 95% CI 2.38-3.97 | Prioritize workload redesign, staffing coverage, manager escalation paths, and burnout prevention. |
| Promotion timing is associated with lower observed hazard | HR = 0.87 per year, 95% CI 0.83-0.91 | Use as a career mobility review signal, not as proof that delaying promotion reduces attrition. |
| Department effects are not statistically clear after adjustment | Sales HR = 1.30, 95% CI 0.71-2.39 | Monitor departments, but investigate local work conditions before treating department as the cause. |
| Model discrimination is portfolio-ready | C-index = 0.74 | Useful for aggregate workforce planning and executive discussion. |

Full model output and diagnostics are saved in `figures/cox_summary.txt` and `figures/cox_ph_test.txt`.

## Business Question

Where should HR and leadership intervene first to reduce preventable turnover, and when is intervention most likely to matter?

This project answers that question with:

- Kaplan-Meier survival curves to show when retention curves separate
- Cox proportional hazards regression to estimate adjusted attrition drivers
- Dashboard views that translate statistical results into executive planning actions
- Scenario framing for retention ROI, avoided replacement cost, and intervention prioritization

## Recommended Actions

1. **Reduce concentrated overtime exposure.** Start with teams where overtime is high and attrition curves separate early. Review staffing ratios, scheduling practices, role overload, and manager escalation norms.
2. **Intervene before risk becomes exit behavior.** Use survival curves to identify tenure windows where attrition accelerates, then schedule workload and career check-ins before those windows.
3. **Frame retention ROI in avoided replacement cost.** For each priority segment, estimate expected attritions avoided and multiply by replacement cost assumptions, commonly 50%-200% of salary depending on role criticality.
4. **Use department as a monitoring lens, not a causal explanation.** Department-level differences should trigger diagnosis of local work design, manager capacity, travel burden, and growth access.
5. **Keep outputs aggregate and ethical.** This project is designed for workforce planning and support, not individual surveillance or automated employment decisions.

## Dashboard

The included Next.js dashboard turns the prepared analysis dataset and saved model outputs into an executive decision-support tool. It is designed for HR leaders and recruiters to quickly understand the business story, not just inspect statistical output.

**Open the live dashboard:** https://hr-attrition-dashboard.vercel.app

Dashboard features:

- Compact KPI strip for attrition, overtime exposure, median tenure, and model concordance
- Department, role family, overtime, tenure band, promotion band, travel, satisfaction, and work-life balance filters
- Survival curves and concentration tables for non-technical interpretation
- Cox model driver summaries with clear caveats
- Scenario panel for retention planning and directional pressure reduction
- Reusable dashboard presentation components in `components/dashboard-kit.tsx`

## Methods

### Data

| Attribute | Value |
| --- | --- |
| Source | IBM HR Analytics Employee Attrition dataset |
| File | `data/IBM-HR-Employee-Attrition.csv` |
| Unit of analysis | Employee |
| Rows | 1,470 |
| Observed attritions | 237 |
| Observed attrition rate | 16.1% |
| Time variable | `YearsAtCompany` |
| Event variable | `Attrition` converted to `event`, where 1 = attrition and 0 = censored |

Employees with `YearsAtCompany == 0` are retained as first-year employees so early-tenure risk is not removed from the business story.

### Survival EDA

Kaplan-Meier estimators are used to show retention over tenure:

- Overall retention curve
- Retention by department
- Retention by overtime status
- Retention by years-since-promotion band

Log-rank tests support unadjusted group comparisons. The generated plots emphasize where curves separate over tenure; the dashboard adds aggregate segment and survival views for leadership interpretation.

Script: `R/02_survival_eda.R`

### Cox Model

The Cox proportional hazards model estimates adjusted attrition hazard:

```text
Surv(time, event) ~ Department + OverTime + YearsSinceLastPromotion
```

This specification is intentionally compact for portfolio clarity. It focuses on drivers that are interpretable, available in typical HRIS data, and actionable through workforce planning. The proportional hazards test flags `YearsSinceLastPromotion`, so that coefficient should be treated as directional context rather than a fixed effect across tenure.

Script: `R/03_cox_model.R`

## Reproducing the Project

### Run the Dashboard Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Run Dashboard Checks

```bash
npm test
npm run build
```

### Restore the R Environment

```r
source("renv/activate.R")
renv::restore()
```

### Run the R Pipeline

```bash
Rscript R/run_analysis.R
```

Or run each stage manually:

```bash
Rscript R/01_load_data.R
Rscript R/02_survival_eda.R
Rscript R/03_cox_model.R
```

## Adapting to Custom HR Data

The dashboard is portable but expects a stable prepared schema in `outputs/hr_survival_df.csv`. A replacement dataset must map into these fields:

| Field | Description |
| --- | --- |
| `Age` | Employee age |
| `Department` | Organizational unit |
| `JobRole` | Role classification |
| `OverTime` | Overtime indicator |
| `BusinessTravel` | Travel frequency |
| `JobSatisfaction` | Satisfaction score |
| `WorkLifeBalance` | Work-life balance score |
| `YearsAtCompany` | Tenure in years |
| `YearsSinceLastPromotion` | Promotion recency |
| `event` | 1 = attrition, 0 = censored |
| `time` | Survival time |

Use the mapping template:

```bash
Rscript R/01_map_custom_data.R path/to/hr_export.csv config/custom_data_mapping.example.csv
```

The script writes:

- `outputs/hr_survival_df.csv`
- `outputs/hr_survival_df.rds`

## Reusing the Dashboard Style

The dashboard styling has been extracted into a small reusable kit:

- `components/dashboard-kit.tsx` contains the reusable shell, header, KPI card, panel, filter bar, and compact table components.
- `components/dashboard-kit.md` explains how to copy the kit into another Next.js or React dashboard project.
- `tailwind.config.ts` contains the color tokens and shadows that give the dashboard its current visual identity.

For a new project, keep the kit, replace the data transforms, and wire your new KPIs, filters, charts, and table rows into the same presentation components.

## Project Structure

```text
HR_Attrition/
├── app/                         # Next.js routes and dashboard API
├── components/                  # Dashboard UI and reusable dashboard kit
├── config/                      # Custom data mapping template
├── data/                        # Source IBM HR dataset
├── figures/                     # Survival curves, Cox plots, diagnostics
├── lib/                         # Dashboard data transforms and types
├── outputs/                     # Analysis-ready survival dataset
├── R/                           # R survival analysis pipeline
├── tests/                       # Dashboard tests
├── package-lock.json
├── package.json
├── renv.lock
└── README.md
```

## Portfolio Skills Demonstrated

- People analytics problem framing
- Survival analysis with right-censored outcomes
- Kaplan-Meier estimation and log-rank comparisons
- Cox proportional hazards modeling and diagnostics
- Executive-facing data visualization
- Reproducible R workflows with `renv`
- TypeScript and Next.js dashboard implementation
- Translation of statistical findings into retention ROI and workforce planning actions
- Ethical workforce analytics design for aggregate planning rather than individual surveillance

## Contact

**Joshua Cole, PhD**  
People Analytics / Data Analytics  
GitHub: https://github.com/JoshuaColePhD
