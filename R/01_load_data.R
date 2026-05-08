# ============================================================
# Script:      01_load_data.R
# Purpose:     Load + prep IBM HR attrition data for survival analysis
# Author:      Joshua Cole
# ============================================================

suppressPackageStartupMessages(library(tidyverse))

# ---- Paths ----
INPUT_CSV <- "data/IBM-HR-Employee-Attrition.csv"
OUT_DIR   <- "outputs"

# ---- Load data ----
if (!file.exists(INPUT_CSV)) stop("Input file not found: ", INPUT_CSV)

df <- read_csv(INPUT_CSV, show_col_types = FALSE)

# ---- Inspect when run interactively ----
# Keep batch runs quiet and reproducible, but expose structure quickly during local exploration.
if (interactive()) {
  glimpse(df)
  print(summary(df))
  print(colSums(is.na(df)))
}

# ---- Initial prep for survival analysis ----
df <- df %>%
  mutate(
    Attrition = factor(Attrition, levels = c("No", "Yes")),
    # Survival models need an event indicator; employees still active are right-censored.
    event = if_else(Attrition == "Yes", 1L, 0L),
    # IBM tenure is measured in whole years. Zero-year employees are retained because
    # first-year attrition is a real retention-planning signal, not missing exposure.
    time  = as.numeric(YearsAtCompany)
  )

# ---- Validate survival fields ----
stopifnot(!anyNA(df$time))
stopifnot(all(df$time >= 0))
stopifnot(!anyNA(df$event))
stopifnot(all(df$event %in% c(0L, 1L)))

if (any(df$time == 0)) {
  message("Note: ", sum(df$time == 0), " employees have 0 years at company; treating them as first-year observations.")
}

# ---- Save analysis-ready dataset ----
dir.create(OUT_DIR, showWarnings = FALSE, recursive = TRUE)

saveRDS(df, file.path(OUT_DIR, "hr_survival_df.rds"))
write_csv(df, file.path(OUT_DIR, "hr_survival_df.csv"))

message("Saved: outputs/hr_survival_df.rds")
message("Saved: outputs/hr_survival_df.csv")
