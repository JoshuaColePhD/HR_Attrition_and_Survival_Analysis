# ============================================================
# Script:      01_map_custom_data.R
# Purpose:     Map a custom HR export into the dashboard schema
# Author:      Joshua Cole
# Usage:       Rscript R/01_map_custom_data.R <input_csv> [mapping_csv] [output_csv]
# ============================================================

suppressPackageStartupMessages(library(tidyverse))

args <- commandArgs(trailingOnly = TRUE)

INPUT_CSV <- if (length(args) >= 1) args[[1]] else "data/IBM-HR-Employee-Attrition.csv"
MAPPING_CSV <- if (length(args) >= 2) args[[2]] else "config/custom_data_mapping.example.csv"
OUTPUT_CSV <- if (length(args) >= 3) args[[3]] else "outputs/hr_survival_df.csv"
OUTPUT_RDS <- sub("\\.csv$", ".rds", OUTPUT_CSV)

required_targets <- c(
  "Age",
  "Department",
  "JobRole",
  "OverTime",
  "BusinessTravel",
  "JobSatisfaction",
  "WorkLifeBalance",
  "YearsAtCompany",
  "YearsSinceLastPromotion",
  "event",
  "time"
)

if (!file.exists(INPUT_CSV)) {
  stop("Input file not found: ", INPUT_CSV)
}

if (!file.exists(MAPPING_CSV)) {
  stop("Mapping file not found: ", MAPPING_CSV)
}

raw_df <- read_csv(INPUT_CSV, show_col_types = FALSE)
mapping_df <- read_csv(MAPPING_CSV, show_col_types = FALSE) %>%
  mutate(
    source = na_if(source, ""),
    transform = replace_na(transform, "text")
  )

required_mapping_cols <- c("target", "source", "transform")
missing_mapping_cols <- setdiff(required_mapping_cols, names(mapping_df))
if (length(missing_mapping_cols) > 0) {
  stop("Mapping file is missing required columns: ", paste(missing_mapping_cols, collapse = ", "))
}

unknown_sources <- mapping_df %>%
  filter(!is.na(source), !source %in% names(raw_df)) %>%
  pull(source) %>%
  unique()

if (length(unknown_sources) > 0) {
  stop("Mapping file references missing source columns: ", paste(unknown_sources, collapse = ", "))
}

normalize_yes_no <- function(x) {
  x_chr <- str_trim(as.character(x))
  case_when(
    str_to_lower(x_chr) %in% c("yes", "y", "1", "true", "t") ~ "Yes",
    str_to_lower(x_chr) %in% c("no", "n", "0", "false", "f") ~ "No",
    TRUE ~ x_chr
  )
}

normalize_event <- function(x) {
  x_chr <- str_trim(as.character(x))
  case_when(
    str_to_lower(x_chr) %in% c("yes", "y", "1", "true", "t") ~ 1,
    str_to_lower(x_chr) %in% c("no", "n", "0", "false", "f") ~ 0,
    TRUE ~ suppressWarnings(as.numeric(x_chr))
  )
}

apply_transform <- function(df, source, transform) {
  if (transform == "derive_event") {
    if (!"Attrition" %in% names(df)) {
      stop("Cannot derive event without an Attrition column in the mapped output.")
    }
    return(normalize_event(df$Attrition))
  }

  if (transform == "derive_time") {
    if (!"YearsAtCompany" %in% names(df)) {
      stop("Cannot derive time without a YearsAtCompany column in the mapped output.")
    }
    return(suppressWarnings(as.numeric(df$YearsAtCompany)))
  }

  if (is.na(source)) {
    stop("Transform '", transform, "' requires a source column or supported derive transform.")
  }

  values <- df[[source]]

  if (transform == "text") {
    return(as.character(values))
  }

  if (transform == "numeric") {
    return(suppressWarnings(as.numeric(values)))
  }

  if (transform == "yes_no") {
    return(normalize_yes_no(values))
  }

  if (transform == "event_yes_no") {
    return(normalize_event(values))
  }

  stop("Unsupported transform in mapping file: ", transform)
}

mapped_cols <- list()

for (i in seq_len(nrow(mapping_df))) {
  row <- mapping_df[i, ]
  mapped_cols[[row$target]] <- apply_transform(raw_df, row$source[[1]], row$transform[[1]])
}

mapped_df <- as_tibble(mapped_cols)

if ("Attrition" %in% names(mapped_df)) {
  mapped_df <- mapped_df %>%
    mutate(Attrition = factor(normalize_yes_no(Attrition), levels = c("No", "Yes")))
}

missing_targets <- setdiff(required_targets, names(mapped_df))
if (length(missing_targets) > 0) {
  stop("Mapped output is missing required targets: ", paste(missing_targets, collapse = ", "))
}

if (anyNA(mapped_df$event) || !all(mapped_df$event %in% c(0, 1))) {
  stop("Mapped event column must contain only 0/1 values with no missing data.")
}

if (anyNA(mapped_df$time) || any(mapped_df$time < 0)) {
  stop("Mapped time column must contain non-missing, non-negative numeric values.")
}

dir.create(dirname(OUTPUT_CSV), recursive = TRUE, showWarnings = FALSE)

write_csv(mapped_df, OUTPUT_CSV)
saveRDS(mapped_df, OUTPUT_RDS)

message("Custom data mapped successfully.")
message("Saved CSV: ", OUTPUT_CSV)
message("Saved RDS: ", OUTPUT_RDS)
message("Rows: ", nrow(mapped_df))
message("Columns: ", ncol(mapped_df))
