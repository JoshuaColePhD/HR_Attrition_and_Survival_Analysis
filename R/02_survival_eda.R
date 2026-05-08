# ============================================================
# Script:      02_survival_eda.R
# Purpose:     Explore and visualize IBM HR attrition data (survival EDA)
# Author:      Joshua Cole
# ============================================================

suppressPackageStartupMessages(library(tidyverse))
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(survminer))

# ---- Load dataset ----
df <- readRDS("outputs/hr_survival_df.rds")

# ---- Validate required columns ----
required <- c("time", "event")
missing <- setdiff(required, names(df))
if (length(missing) > 0) {
  stop("Missing required columns: ", paste(missing, collapse = ", "))
}

# ---- Output folder ----
dir.create("figures", showWarnings = FALSE, recursive = TRUE)

# ---- Summary statistics ----
summary_stats <- df %>%
  summarise(
    total_employees  = n(),
    total_attritions = sum(event, na.rm = TRUE),
    attrition_rate   = mean(event, na.rm = TRUE)
  )
print(summary_stats)

# ---- Create survival object ----
# Surv() preserves partial tenure information for employees who have not left yet.
# This is the core reason survival analysis is a better HR planning frame than a
# binary attrition flag alone.
surv_obj <- Surv(time = df$time, event = df$event)

# Helper: show plots in the Plot panel when running interactively
show_plot <- function(p) {
  if (interactive()) print(p)
}

# Save the main ggplot panel from survminer objects. Risk tables are displayed
# interactively and can be exported separately if a full report needs them.
save_plot <- function(p, filename, width = 9, height = 6) {
  ggsave(filename, plot = p$plot, width = width, height = height, units = "in")
  message("Saved: ", filename)
}

# ============================================================
# 1) Overall Kaplan-Meier survival curve
# ============================================================
km_overall <- survfit(surv_obj ~ 1, data = df)

p_overall <- ggsurvplot(
  km_overall,
  data = df,
  risk.table = TRUE,
  conf.int = TRUE,
  legend = "bottom",
  xlab = "Years at Company",
  ylab = "Probability of Remaining Employed",
  title = "Overall Retention (Kaplan-Meier)"
)

show_plot(p_overall)
save_plot(p_overall, "figures/km_overall.pdf")

# ============================================================
# 2) Stratified survival curves by Department
# ============================================================
if ("Department" %in% names(df)) {
  df_dept <- df %>% mutate(Department = factor(Department))

  # Department curves are useful for leadership accountability, but any visible
  # separation should be interpreted as a prompt for diagnosis rather than as a
  # causal department effect.
  km_dept <- survfit(Surv(time = df_dept$time, event = df_dept$event) ~ Department, data = df_dept)
  
  p_dept <- ggsurvplot(
    km_dept,
    data = df_dept,
    risk.table = TRUE,
    pval = TRUE,
    conf.int = TRUE,
    legend = "bottom",
    legend.title = "Department",
    legend.labs = c("HR", "R&D", "Sales"),
    xlab = "Years at Company",
    ylab = "Probability of Remaining Employed",
    title = "Retention by Department (Kaplan-Meier)"
  )
  
  show_plot(p_dept)
  save_plot(p_dept, "figures/km_department.pdf")
} else {
  message("Department column not found - skipping department plot.")
}

# ============================================================
# 3) Stratified survival curves by OverTime
# ============================================================
if ("OverTime" %in% names(df)) {
  df_ot <- df %>%
    mutate(OverTime = factor(OverTime, levels = c("No", "Yes")))

  # Overtime is the most decision-ready segmentation variable here: it maps
  # directly to staffing, scheduling, and manager workload interventions.
  km_ot <- survfit(Surv(time = df_ot$time, event = df_ot$event) ~ OverTime, data = df_ot)
  
  p_ot <- ggsurvplot(
    km_ot,
    data = df_ot,
    risk.table = TRUE,
    pval = TRUE,
    conf.int = TRUE,
    legend = "bottom",
    legend.title = "OverTime",
    legend.labs = c("No", "Yes"),
    xlab = "Years at Company",
    ylab = "Probability of Remaining Employed",
    title = "Retention by Overtime Status (Kaplan-Meier)"
  )
  
  show_plot(p_ot)
  save_plot(p_ot, "figures/km_overtime.pdf")
} else {
  message("OverTime column not found - skipping overtime plot.")
}

# ============================================================
# 4) Stratified survival curves by YearsSinceLastPromotion bands
# ============================================================
if ("YearsSinceLastPromotion" %in% names(df)) {

  df_promo <- df %>%
    mutate(
      years_since_promo = suppressWarnings(as.numeric(YearsSinceLastPromotion)),
      # Bands make the plot readable for HR leaders and reduce over-precision
      # from a coarse annual variable.
      promo_band = case_when(
        is.na(years_since_promo) ~ NA_character_,
        years_since_promo <= 1 ~ "0-1 years",
        years_since_promo <= 3 ~ "2-3 years",
        years_since_promo <= 6 ~ "4-6 years",
        TRUE ~ "7+ years"
      ),
      promo_band = factor(
        promo_band,
        levels = c("0-1 years", "2-3 years", "4-6 years", "7+ years"),
        labels = c("0-1", "2-3", "4-6", "7+")
      )
    ) %>%
    filter(!is.na(promo_band))
  
  km_promo <- survfit(Surv(time = df_promo$time, event = df_promo$event) ~ promo_band, data = df_promo)
  
  if (!is.null(km_promo$strata)) {
    names(km_promo$strata) <- gsub("^promo_band=", "", names(km_promo$strata))
  }
  
  p_promo <- ggsurvplot(
    km_promo,
    data = df_promo,
    risk.table = TRUE,
    pval = TRUE,
    conf.int = TRUE,
    legend = "bottom",
    legend.title = "Time Since Promotion",
    xlab = "Years at Company",
    ylab = "Probability of Remaining Employed",
    title = "Retention by Time Since Last Promotion (Kaplan-Meier)"
  )
  
  show_plot(p_promo)
  save_plot(p_promo, "figures/km_promotion_band.pdf")
} else {
  message("YearsSinceLastPromotion column not found - skipping promotion plot.")
}

message("02_survival_eda.R complete.")
