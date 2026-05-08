# ============================================================
# Script:      run_analysis.R
# Purpose:     Rebuild the complete HR attrition analysis pipeline
# Author:      Joshua Cole
# ============================================================

required_files <- c(
  "R/01_load_data.R",
  "R/02_survival_eda.R",
  "R/03_cox_model.R"
)

missing_files <- required_files[!file.exists(required_files)]
if (length(missing_files) > 0) {
  stop(
    "Run this script from the project root. Missing files: ",
    paste(missing_files, collapse = ", ")
  )
}

message("Running HR attrition survival analysis pipeline...")

# Run the numbered scripts as separate R sessions. That mirrors how analysts
# typically execute reproducible pipelines and avoids formula-environment issues
# in survival plot objects.
rscript <- file.path(R.home("bin"), "Rscript")

for (script in required_files) {
  message("\n--- ", script, " ---")
  status <- system2(rscript, script)
  if (!identical(status, 0L)) {
    stop("Pipeline failed while running ", script, call. = FALSE)
  }
}

message("\nPipeline complete. Updated outputs/ and figures/.")
