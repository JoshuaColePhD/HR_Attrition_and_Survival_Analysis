# ============================================================
# Script:      01_load_data.R
# Purpose:     Load + prep IBM HR attrition data for survival analysis
# Author:      Joshua Cole
# ============================================================

library(tidyverse)

# ---- Paths ----
INPUT_CSV <- "data/IBM-HR-Employee-Attrition.csv"
OUT_DIR   <- "outputs"

# ---- Load data ----
if (!file.exists(INPUT_CSV)) stop("Input file not found: ", INPUT_CSV)

df <- read_csv(INPUT_CSV, show_col_types = FALSE)

# ---- Inspect ----
glimpse(df)
print(summary(df))
print(colSums(is.na(df)))

# ---- Initial prep for survival analysis ----
df <- df %>%
  mutate(
    Attrition = factor(Attrition, levels = c("No", "Yes")),
    event = if_else(Attrition == "Yes", 1L, 0L),
    time  = as.numeric(YearsAtCompany)
  )

# ---- Validate survival fields ----
stopifnot(!anyNA(df$time))
stopifnot(all(df$time >= 0))
stopifnot(!anyNA(df$event))
stopifnot(all(df$event %in% c(0L, 1L)))

# ---- Save analysis-ready dataset ----
dir.create(OUT_DIR, showWarnings = FALSE, recursive = TRUE)

saveRDS(df, file.path(OUT_DIR, "hr_survival_df.rds"))
write_csv(df, file.path(OUT_DIR, "hr_survival_df.csv"))

message("Saved: outputs/hr_survival_df.rds")
message("Saved: outputs/hr_survival_df.csv")

View(df)
