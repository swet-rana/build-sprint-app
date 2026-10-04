# Equivalent test names

The reader uses an explicit alias dictionary in src/test-names.js. No fuzzy word similarity is used. Original names remain in rawName and are displayed beside dated summary values when different from the common name. Source pages, values, units and printed reference ranges stay unchanged.

Mappings cover the naming variations in the supplied Apollo and Tata 1mg reports, plus common abbreviations for those analytes: cholesterol fractions and ratios, fasting/random glucose, HbA1c, haemoglobin, haematocrit/PCV, RBC, RDW-CV, total T3/T4 and TSH, vitamin D/B12, routine CRP/ESR, ALT/SGPT, AST/SGOT, ALP/GGT, BUN, iron/TIBC/UIBC, FSH/LH. Recognized specimen suffixes are stripped only for matching. RDW without a CV/SD suffix matches RDW-CV only when its unit is percent. A blank unit for a specifically identified cholesterol ratio matches the printed Ratio unit; numeric units are never converted.

Different cholesterol fractions and ratio formulas remain separate. Fasting and random glucose, free and total thyroid hormones, routine and high-sensitivity CRP, RDW-CV and RDW-SD, serum and urinary creatinine, and explicitly direct LDL remain separate. Unknown labels keep their own identity. Different numeric units remain separate even when names match. Conflicting values for aliases within one dated report raise an error.

Primary sources checked on 4 October 2026:

- [Tata 1mg lipid profile](https://www.1mg.com/labs/test/lipid-profile-1909) and the original reports establish total/HDL/LDL/VLDL cholesterol naming variants.
- [Apollo ALT/SGPT](https://www.apollo247.com/lab-tests/sgpt-alt-alanine-aminotransferase) establishes ALT and SGPT names for the same enzyme.
- [Pathkind lab report](https://cdn.pathkindlabs.com/edos/sample-reports/PL145.PDF) identifies haematocrit and packed cell volume (PCV).
- [Tata 1mg HbA1c](https://www.1mg.com/labs/test/hba1c-glycosylated-hemoglobin-1611) identifies glycosylated haemoglobin as HbA1c.
- [Apollo fasting glucose](https://www.apollo247.com/lab-tests/glucose-fasting) identifies fasting blood sugar/FBS as fasting glucose.
- [Tata 1mg BUN/urea/creatinine](https://www.1mg.com/labs/test/bun-urea-creatinine-36789) identifies BUN as blood urea nitrogen, separately from urea and creatinine.

Anonymous tests verify equivalent aliases and protect against merging distinct tests. Private reports and actual extracted values remain outside git.
