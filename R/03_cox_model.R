# ============================================================
# Script:      03_cox_model.R
# Purpose:     Cox proportional hazards modeling for IBM HR attrition
# Author:      Joshua Cole
# ============================================================

suppressPackageStartupMessages(library(tidyverse))
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(survminer))

# Keep captured model summaries stable across terminals and CI environments.
options(width = 120)

# ---- Load dataset ----
df <- readRDS("outputs/hr_survival_df.rds")

# ---- Validate required columns ----
required <- c("time", "event")
missing <- setdiff(required, names(df))
if (length(missing) > 0) {
  stop("Missing required columns: ", paste(missing, collapse = ", "))
}

# ---- Validate modeling columns (IBM default names) ----
model_cols <- c("Department", "OverTime", "YearsSinceLastPromotion")
missing_model <- setdiff(model_cols, names(df))
if (length(missing_model) > 0) {
  stop("Missing required modeling columns: ", paste(missing_model, collapse = ", "))
}

# ---- Output folder ----
dir.create("figures", showWarnings = FALSE, recursive = TRUE)

# ============================================================
# 1) Fit Cox proportional hazards model
# ============================================================

# Make types explicit so model contrasts are stable across machines and reruns.
df_model <- df %>%
  mutate(
    Department = droplevels(factor(Department)),
    OverTime = droplevels(factor(OverTime, levels = c("No", "Yes"))),
    YearsSinceLastPromotion = as.numeric(YearsSinceLastPromotion)
  )

# Keep the model compact and interpretable: these fields are available in most
# HRIS exports and translate cleanly into workload, org-design, and career-path
# decisions. This is decision support, not a causal claim about individual exits.
cox_fit <- coxph(
  Surv(time, event) ~ Department + OverTime + YearsSinceLastPromotion,
  data = df_model,
  model = TRUE,
  x = TRUE
)

cox_summary <- summary(cox_fit)
print(cox_summary)

# Save model summary to text
capture.output(cox_summary, file = "figures/cox_summary.txt")
message("Saved: figures/cox_summary.txt")

# ============================================================
# 2) Forest plot of hazard ratios (custom, robust)
# ============================================================
s <- cox_summary

forest_df <- tibble(
  term = rownames(s$coefficients),
  hr   = s$coefficients[, "exp(coef)"],
  lo   = s$conf.int[, "lower .95"],
  hi   = s$conf.int[, "upper .95"],
  p    = s$coefficients[, "Pr(>|z|)"]
) %>%
  mutate(
    term = str_replace(term, "^Department", "Department: "),
    term = str_replace(term, "^OverTime", "OverTime: "),
    term = str_replace(term, "^YearsSinceLastPromotion$", "Years Since Last Promotion"),
    term = fct_rev(factor(term)),
    effect_type = case_when(
      hr > 1 & lo > 1 ~ "Risk",
      hr < 1 & hi < 1 ~ "Protective",
      TRUE ~ "Neutral"
    )
  )

write_csv(forest_df, "figures/cox_model_drivers.csv")
message("Saved: figures/cox_model_drivers.csv")

p_forest <- ggplot(
  forest_df,
  aes(x = hr, y = term, color = effect_type)
) +
  geom_vline(xintercept = 1, linetype = "dashed", color = "gray50") +
  geom_point(size = 3) +
  geom_errorbar(aes(xmin = lo, xmax = hi), width = 0.25, orientation = "y") +
  scale_x_log10() +
  scale_color_manual(
    values = c(
      "Risk" = "#D55E00",        # muted red
      "Protective" = "#009E73",  # muted green
      "Neutral" = "gray40"
    )
  ) +
  labs(
    title = "Cox Model Hazard Ratios (Attrition)",
    x = "Hazard Ratio (log scale)",
    y = NULL,
    color = "Effect"
  ) +
  theme_bw(base_size = 12) +
  theme(
    legend.position = "bottom",
    panel.grid.minor = element_blank()
  )

print(p_forest)

ggsave(
  "figures/cox_forest_color.pdf",
  plot = p_forest,
  width = 9,
  height = 6,
  units = "in"
)

ggsave(
  "figures/cox_forest_color.png",
  plot = p_forest,
  width = 9,
  height = 6,
  dpi = 300
)
message("Saved: figures/cox_forest_color.pdf")
message("Saved: figures/cox_forest_color.png")

# ============================================================
# 3) Proportional hazards assumption check
# ============================================================
ph_test <- cox.zph(cox_fit)
print(ph_test)

capture.output(ph_test, file = "figures/cox_ph_test.txt")
message("Saved: figures/cox_ph_test.txt")

pdf("figures/cox_ph_diagnostics.pdf", width = 9, height = 6)
plot(ph_test)
dev.off()
message("Saved: figures/cox_ph_diagnostics.pdf")

# ============================================================
# 4) Adjusted survival curves (example: OverTime Yes vs No)
# ============================================================
reference_department <- names(sort(table(df_model$Department), decreasing = TRUE))[1]
reference_promotion <- median(df_model$YearsSinceLastPromotion, na.rm = TRUE)

# Use the modal department and median promotion timing to make the comparison
# read like a typical-employee scenario for executives. The only intended
# difference between rows is overtime exposure.
newdata_ot <- data.frame(
  Department = factor(rep(reference_department, 2), levels = levels(df_model$Department)),
  OverTime = factor(c("No", "Yes"), levels = levels(df_model$OverTime)),
  YearsSinceLastPromotion = reference_promotion
)

sf_ot <- survfit(cox_fit, newdata = newdata_ot)

p_adj_ot <- ggsurvplot(
  sf_ot,
  data = newdata_ot,
  conf.int = TRUE,
  legend = "bottom",
  legend.title = "OverTime",
  legend.labs = c("No", "Yes"),
  xlab = "Years at Company",
  ylab = "Adjusted Probability of Remaining Employed",
  title = "Adjusted Retention Curves by OverTime (Cox Model)"
)

print(p_adj_ot)

ggsave(
  "figures/cox_adjusted_overtime.pdf",
  plot = p_adj_ot$plot,
  width = 9,
  height = 6,
  units = "in"
)
message("Saved: figures/cox_adjusted_overtime.pdf")

message("03_cox_model.R complete.")
