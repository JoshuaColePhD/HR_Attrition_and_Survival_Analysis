# HR Attrition and Survival Analysis

Most organizations learn about attrition too late.

By the time an exit interview happens, the decision has already been made, the replacement cost is already real, and leaders are left trying to explain a resignation after the window for intervention has closed. Traditional attrition models often reinforce that problem because they ask a narrow question: did this employee leave, yes or no?

This project asks a more useful question for HR leaders:

**When does attrition risk begin to build, and which working conditions make that risk accelerate?**

To answer it, I treated attrition as a time-to-event problem using survival analysis, then translated the results into an executive dashboard designed for workforce planning and retention decisions.

**Live dashboard:** https://hr-attrition-dashboard.vercel.app  
**Repository:** https://github.com/JoshuaColePhD/HR_Attrition_and_Survival_Analysis

[![Attrition risk driver chart](figures/attrition_risk_drivers_clean.png)](https://hr-attrition-dashboard.vercel.app)

*Adjusted hazard ratios from the Cox proportional hazards model. Open the live dashboard for interactive filters, KPI views, survival curves, and scenario framing.*

## The Story

Imagine an HR leader looking at annual attrition and seeing a familiar number: 16.1% of employees left. That number matters, but it arrives as a summary of damage already done. It does not say when risk started rising, which employees were still being retained, or which conditions were most closely tied to exits.

That is the blind spot this project is built around.

A simple classification model would label employees as either "left" or "stayed." But employees who have not left are not failed data points. They are right-censored observations: people who have remained with the organization up to the point we observe them. Their tenure still carries information.

Survival analysis keeps that information. Kaplan-Meier curves show where retention begins to separate over tenure. Cox proportional hazards regression estimates which workplace conditions are associated with faster attrition, while still accounting for employees who have not exited.

The result is not just a model. It is a clearer retention question:

**Where should leadership intervene before risk becomes resignation?**

## What the Analysis Found

The clearest signal in this dataset is workload pressure.

Employees reporting overtime show about **3.1x higher adjusted attrition hazard** than employees not reporting overtime, after controlling for department and years since last promotion. In business terms, overtime is not just a descriptive HR metric here. It is the strongest actionable warning signal in the model.

| Finding | Evidence | What it means for leaders |
| --- | ---: | --- |
| Overtime is the dominant modeled risk factor | HR = 3.07, 95% CI 2.38-3.97 | Start with workload design, staffing coverage, manager escalation paths, and burnout prevention. |
| Promotion timing is associated with lower observed hazard | HR = 0.87 per year, 95% CI 0.83-0.91 | Use as a career mobility review signal, not as proof that delaying promotion reduces attrition. |
| Department effects are not statistically clear after adjustment | Sales HR = 1.30, 95% CI 0.71-2.39 | Monitor departments, but investigate local work conditions before treating department as the cause. |
| Model discrimination is strong enough for portfolio planning | C-index = 0.74 | Useful for aggregate workforce planning and executive discussion. |

Full model output and diagnostics are saved in `figures/cox_summary.txt` and `figures/cox_ph_test.txt`.

## From Finding to Action

The practical value of this analysis is not that it identifies a single magic variable. It gives HR a sequence for decision-making.

1. **Find concentrated overtime exposure.** Start with teams and segments where overtime is structurally high, especially where retention curves separate early.
2. **Intervene before the exit window opens.** Use tenure patterns to schedule workload and career conversations before attrition accelerates.
3. **Translate risk into a business case.** Estimate expected attritions avoided and multiply by role-specific replacement cost assumptions, commonly 50%-200% of salary depending on role criticality.
4. **Use department as a diagnostic lens.** Department-level differences should trigger investigation of work design, manager capacity, travel burden, and growth access.
5. **Keep the analysis aggregate and ethical.** This project is designed for workforce planning and support, not individual surveillance or automated employment decisions.

## The Dashboard

The dashboard turns the analysis into an executive decision-support tool. The goal is to help a leader understand the retention story quickly: where risk is concentrated, what conditions are associated with higher attrition, and what action would be most defensible.

**Open the live dashboard:** https://hr-attrition-dashboard.vercel.app

Dashboard features:

- KPI strip for attrition, overtime exposure, median tenure, and model concordance
- Filters for department, role family, overtime, tenure band, promotion band, travel, satisfaction, and work-life balance
- Survival curves that show when risk accumulates
- Segment tables that highlight concentrated attrition hotspots
- Cox model summaries with plain-language cautions
- Scenario framing for retention planning and directional pressure reduction

The dashboard styling has also been extracted into `components/dashboard-kit.tsx` so the same executive BI look can be reused in future analytics projects.

## Methodology

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

Employees with `YearsAtCompany == 0` are retained as first-year employees so early-tenure risk is not removed from the analysis.

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
