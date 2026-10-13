# Saved laboratory name matching

Existing exact aliases stay local. Unfamiliar blood test names go to an OpenAI Responses action in Convex; only names, units, specimen and method are sent, without results or patient information. The action chooses an existing catalog identifier or abstains. Semen matching retains its existing strict specimen and assay rules.

`testNameMappings.by_key` saves normalized name, specimen and method, independently of unit. A transaction claims each name before the provider request. Pending, uncertain and failed attempts are saved and never automatically sent again; stale claims fail after two minutes. Inputs and raw provider outputs are saved through `evaluationRuns`. Concurrent requests may retain an original name while its first mapping is pending.

Conversions are deterministic, not model arithmetic: metric mass/volume and activity/volume ratios, count-volume scales, and a small analyte-specific allowlist. Unsupported units retain the original result separately. Parsed reference intervals scale with the value; descriptive ranges remain unconverted and explicitly identified. Original result, name, unit and range remain on each normalized observation and are available through result hover titles and SVG point titles. Source-page references remain unchanged.

Conversion references:
- Creatinine: https://www.niddk.nih.gov/research-funding/research-programs/kidney-clinical-research-epidemiology/laboratory/glomerular-filtration-rate-equations/adults (µmol/L divided by 88.4).
- Glucose: https://www.niddk.nih.gov/-/media/Files/Strategic-Plans/Diabetes-in-America-3rd-Edition/DIA_Conversions.pdf (mg/dL multiplied by 0.0555 to mmol/L).
- Cholesterol: https://www.ncbi.nlm.nih.gov/books/NBK83505/ (mmol/L multiplied by 38.67 to mg/dL).

These mappings do not interpret measurements or provide diagnoses. The catalog is deliberately bounded; uncertain or unlisted tests stay separate.
