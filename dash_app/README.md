# Plotly Dash HR Analytics Dashboard

This is an alternate enterprise-style BI dashboard built with Plotly Dash. It reads the same project outputs used by the main app:

- `outputs/hr_survival_df.csv`
- `figures/cox_model_drivers.csv`

## Run Locally

```bash
./.venv/bin/pip install -r dash_app/requirements.txt
./.venv/bin/python dash_app/app.py
```

Then open:

```text
http://127.0.0.1:8050
```

## Why Dash

Dash is a better fit than Streamlit for this portfolio use case if the goal is to signal an enterprise analytics product. It keeps the app Python-native, but gives more control over layout, styling, callbacks, and chart composition.
