# ============================================================
# Script:      00_setup.R
# Purpose:     Project setup and reproducible environment
# Author:      Joshua Cole
# ============================================================

message("Starting project setup...")

# ---- Install renv ----
if (!requireNamespace("renv", quietly = TRUE)) {
  install.packages("renv")
}
library(renv)

# ---- Initialize renv (only once) ----
if (!file.exists("renv.lock")) {
  renv::init(bare = TRUE)
  message("renv initialized.")
} else {
  message("renv already initialized.")
  # Ensure the project library is in sync for this session
  renv::activate()
}

# ---- Packages used in this repo ----
packages <- c(
  "tidyverse",
  "survival",
  "survminer"
)

# ---- Install missing packages into renv project library ----
renv::install(packages)

# ---- Snapshot environment (lock package versions) ----
renv::snapshot(prompt = FALSE)

message("Setup complete. Environment is reproducible.")