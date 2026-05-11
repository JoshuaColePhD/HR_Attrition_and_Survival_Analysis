from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
from dash import Dash, Input, Output, dcc, html


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "outputs" / "hr_survival_df.csv"
DRIVERS_PATH = ROOT / "figures" / "cox_model_drivers.csv"

COLORS = {
    "page": "#08111f",
    "panel": "#102846",
    "panel_alt": "#0b1f35",
    "border": "#42658d",
    "grid": "#274766",
    "text": "#f8fafc",
    "muted": "#d7e4f7",
    "gold": "#f6c85f",
    "blue": "#5bc0eb",
    "red": "#f4727a",
    "purple": "#9b7ede",
}


def load_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_csv(DATA_PATH)
    drivers = pd.read_csv(DRIVERS_PATH)

    df["ActiveEmployee"] = (df["Attrition"] == "No").astype(int)
    df["JobRoleFamily"] = df["JobRole"].map(to_job_role_family)
    df["TenureBand"] = pd.cut(
        df["YearsAtCompany"],
        bins=[-1, 1, 3, 6, 10, 100],
        labels=["0-1 years", "2-3 years", "4-6 years", "7-10 years", "11+ years"],
    ).astype(str)
    df["AgeGroup"] = pd.cut(
        df["Age"],
        bins=[0, 24, 34, 44, 54, 100],
        labels=["Under 25", "25-34", "35-44", "45-54", "55+"],
    ).astype(str)
    return df, drivers


def to_job_role_family(job_role: str) -> str:
    if "Sales" in job_role:
        return "Sales"
    if "Research" in job_role:
        return "Research"
    if "Laboratory" in job_role or "Manufacturing" in job_role:
        return "Operations"
    if "Manager" in job_role or "Director" in job_role:
        return "Leadership"
    if "Human Resources" in job_role:
        return "Human Resources"
    if "Healthcare" in job_role:
        return "Healthcare"
    return "Other"


def option_list(values: pd.Series) -> list[dict[str, str]]:
    options = [{"label": "All", "value": "All"}]
    options.extend({"label": str(value), "value": str(value)} for value in sorted(values.dropna().unique()))
    return options


df, model_drivers = load_data()

app = Dash(__name__, title="HR Analytics Dash")
server = app.server


def card(label: str, value: str, tone: str = "blue") -> html.Div:
    accent = COLORS[tone]
    return html.Div(
        [
            html.Div(label, className="metric-label"),
            html.Div(value, className="metric-value"),
        ],
        className="metric-card",
        style={"borderTopColor": accent},
    )


def empty_fig(title: str) -> go.Figure:
    fig = go.Figure()
    fig.update_layout(template=enterprise_template(), title=title)
    return fig


def enterprise_template() -> dict:
    return {
        "layout": {
            "paper_bgcolor": COLORS["panel_alt"],
            "plot_bgcolor": COLORS["panel_alt"],
            "font": {"color": COLORS["text"], "family": "Inter, Segoe UI, Arial"},
            "title": {"font": {"size": 16, "color": COLORS["text"]}},
            "xaxis": {
                "gridcolor": COLORS["grid"],
                "zerolinecolor": COLORS["border"],
                "tickfont": {"color": COLORS["muted"]},
                "titlefont": {"color": COLORS["muted"]},
            },
            "yaxis": {
                "gridcolor": COLORS["grid"],
                "zerolinecolor": COLORS["border"],
                "tickfont": {"color": COLORS["muted"]},
                "titlefont": {"color": COLORS["muted"]},
            },
            "legend": {"font": {"color": COLORS["muted"]}},
            "margin": {"l": 48, "r": 24, "t": 48, "b": 52},
            "colorway": [COLORS["blue"], COLORS["red"], COLORS["gold"], COLORS["purple"]],
        }
    }


app.layout = html.Div(
    [
        html.Header(
            [
                html.Div(
                    [
                        html.Div("+", className="brand-mark"),
                        html.Div("Plotly Dash Enterprise Template", className="brand-text"),
                    ],
                    className="brand-row",
                ),
                html.Div(
                    [
                        html.Div(
                            [
                                html.H1("HR Analytics Dashboard"),
                                html.P(
                                    "Executive attrition risk and survival-analysis views built from the current project outputs."
                                ),
                            ],
                            className="hero-copy",
                        ),
                        html.Div(
                            [
                                html.Div("Dataset", className="context-label"),
                                html.Div("IBM HR attrition records", className="context-value"),
                            ],
                            className="context-box",
                        ),
                    ],
                    className="hero-row",
                ),
            ],
            className="dashboard-header",
        ),
        html.Section(id="kpi-row", className="kpi-row"),
        html.Div(
            [
                html.Aside(
                    [
                        html.Div("Filters", className="section-label"),
                        html.Label("Department"),
                        dcc.Dropdown(
                            id="department-filter",
                            options=option_list(df["Department"]),
                            value="All",
                            clearable=False,
                        ),
                        html.Label("Job role family"),
                        dcc.Dropdown(
                            id="role-filter",
                            options=option_list(df["JobRoleFamily"]),
                            value="All",
                            clearable=False,
                        ),
                        html.Label("Overtime"),
                        dcc.Dropdown(
                            id="overtime-filter",
                            options=option_list(df["OverTime"]),
                            value="All",
                            clearable=False,
                        ),
                        html.Label("Tenure band"),
                        dcc.Dropdown(
                            id="tenure-filter",
                            options=option_list(df["TenureBand"]),
                            value="All",
                            clearable=False,
                        ),
                    ],
                    className="filter-rail",
                ),
                html.Main(
                    [
                        html.Div(
                            [
                                dcc.Graph(id="department-chart", config={"displayModeBar": False}),
                                dcc.Graph(id="age-chart", config={"displayModeBar": False}),
                                dcc.Graph(id="driver-chart", config={"displayModeBar": False}),
                            ],
                            className="chart-grid top-grid",
                        ),
                        html.Div(
                            [
                                dcc.Graph(id="segment-chart", config={"displayModeBar": False}),
                                dcc.Graph(id="survival-chart", config={"displayModeBar": False}),
                            ],
                            className="chart-grid bottom-grid",
                        ),
                    ],
                    className="dashboard-main",
                ),
            ],
            className="dashboard-shell",
        ),
    ],
    className="page",
)


@app.callback(
    Output("kpi-row", "children"),
    Output("department-chart", "figure"),
    Output("age-chart", "figure"),
    Output("driver-chart", "figure"),
    Output("segment-chart", "figure"),
    Output("survival-chart", "figure"),
    Input("department-filter", "value"),
    Input("role-filter", "value"),
    Input("overtime-filter", "value"),
    Input("tenure-filter", "value"),
)
def update_dashboard(department: str, role: str, overtime: str, tenure: str):
    filtered = df.copy()
    if department != "All":
        filtered = filtered[filtered["Department"] == department]
    if role != "All":
        filtered = filtered[filtered["JobRoleFamily"] == role]
    if overtime != "All":
        filtered = filtered[filtered["OverTime"] == overtime]
    if tenure != "All":
        filtered = filtered[filtered["TenureBand"] == tenure]

    employee_count = len(filtered)
    attritions = int((filtered["Attrition"] == "Yes").sum())
    active = int((filtered["Attrition"] == "No").sum())
    attrition_rate = (attritions / employee_count * 100) if employee_count else 0
    avg_age = filtered["Age"].mean() if employee_count else 0

    kpis = [
        card("Employee Count", f"{employee_count:,}", "blue"),
        card("Attrition Count", f"{attritions:,}", "red"),
        card("Attrition Rate", f"{attrition_rate:.1f}%", "gold"),
        card("Active Employees", f"{active:,}", "blue"),
        card("Avg. Age", f"{avg_age:.0f}", "purple"),
    ]

    department_fig = department_attrition_fig(filtered)
    age_fig = age_distribution_fig(filtered)
    driver_fig = model_driver_fig()
    segment_fig = segment_risk_fig(filtered)
    survival_fig = survival_fig_by_overtime(filtered)

    return kpis, department_fig, age_fig, driver_fig, segment_fig, survival_fig


def department_attrition_fig(filtered: pd.DataFrame) -> go.Figure:
    if filtered.empty:
        return empty_fig("Department-wise Attrition")
    grouped = filtered.groupby("Department", as_index=False)["event"].sum()
    fig = go.Figure(
        go.Pie(
            labels=grouped["Department"],
            values=grouped["event"],
            hole=0.48,
            marker={"colors": [COLORS["blue"], COLORS["red"], COLORS["gold"]]},
        )
    )
    fig.update_layout(template=enterprise_template(), title="Department-wise Attrition", showlegend=True)
    return fig


def age_distribution_fig(filtered: pd.DataFrame) -> go.Figure:
    grouped = filtered.groupby("AgeGroup", observed=False).size().reset_index(name="Employees")
    fig = go.Figure(go.Bar(x=grouped["AgeGroup"], y=grouped["Employees"], marker_color=COLORS["purple"]))
    fig.update_layout(template=enterprise_template(), title="Employees by Age Group")
    return fig


def model_driver_fig() -> go.Figure:
    colors = [COLORS["red"] if row.effect_type == "Risk" else COLORS["blue"] for row in model_drivers.itertuples()]
    fig = go.Figure(
        go.Bar(
            x=model_drivers["hr"],
            y=model_drivers["term"],
            orientation="h",
            marker_color=colors,
            error_x={
                "type": "data",
                "array": model_drivers["hi"] - model_drivers["hr"],
                "arrayminus": model_drivers["hr"] - model_drivers["lo"],
            },
        )
    )
    fig.add_vline(x=1, line_dash="dash", line_color=COLORS["gold"])
    fig.update_layout(template=enterprise_template(), title="Adjusted Cox Model Drivers", xaxis_title="Hazard ratio")
    return fig


def segment_risk_fig(filtered: pd.DataFrame) -> go.Figure:
    if filtered.empty:
        return empty_fig("Top Attrition Segments")

    rows = []
    for dimension in ["TenureBand", "JobRoleFamily", "OverTime", "BusinessTravel"]:
        grouped = filtered.groupby(dimension).agg(employees=("event", "size"), attritions=("event", "sum")).reset_index()
        grouped["Rate"] = grouped["attritions"] / grouped["employees"] * 100
        grouped["Segment"] = grouped[dimension].astype(str)
        rows.append(grouped[["Segment", "Rate"]])

    top = pd.concat(rows).sort_values("Rate", ascending=False).head(8).sort_values("Rate")
    fig = go.Figure(go.Bar(x=top["Rate"], y=top["Segment"], orientation="h", marker_color=COLORS["red"]))
    fig.update_layout(template=enterprise_template(), title="Top Attrition Segments", xaxis_title="Attrition rate")
    return fig


def survival_fig_by_overtime(filtered: pd.DataFrame) -> go.Figure:
    fig = go.Figure()
    for label, color in [("No", COLORS["blue"]), ("Yes", COLORS["red"])]:
        subset = filtered[filtered["OverTime"] == label]
        if subset.empty:
            continue
        curve = retention_curve(subset)
        fig.add_trace(go.Scatter(x=curve["time"], y=curve["retention"], mode="lines", name=f"Overtime: {label}", line={"color": color, "width": 3}))
    fig.update_layout(
        template=enterprise_template(),
        title="Retention Survival Curve",
        xaxis_title="Years at company",
        yaxis_title="Retention %",
        yaxis={"range": [0, 100]},
    )
    return fig


def retention_curve(subset: pd.DataFrame) -> pd.DataFrame:
    rows = []
    total = len(subset)
    for year in range(0, int(df["time"].max()) + 1):
        attrited_by_year = ((subset["event"] == 1) & (subset["time"] <= year)).sum()
        rows.append({"time": year, "retention": (1 - attrited_by_year / total) * 100 if total else 0})
    return pd.DataFrame(rows)


if __name__ == "__main__":
    app.run_server(debug=False, port=8050)
