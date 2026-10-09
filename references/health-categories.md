# Health-category mapping

These are common Indian lab-panel groupings for browsing uploaded blood results, not a comprehensive national classification or a diagnosis. A test may be in multiple categories. Categories never alter extracted names, values, units, reference ranges or matching rules. Unknown tests stay under Other tests. Empty categories show that these reports contain no mapped results, rather than implying the organ is healthy or recommending a test.

The mapping is implemented in src/health-categories.js and checked with synthetic tests. It includes both comparable and unmatched results; unit variants count separately. Infection & inflammation includes nonspecific inflammatory and white-cell markers and does not confirm infection. Ferritin remains in Iron. Routine CRP is not automatically a cardiac marker.

Primary Indian lab sources checked on 4 October 2026:

- [Apollo lab-test catalogue](https://www.apollo247.com/lab-tests): blood count, lipid, liver, renal, thyroid, glucose, vitamin and hormone profiles.
- [Tata 1mg lipid profile](https://www.1mg.com/labs/test/lipid-profile-1909): total cholesterol, HDL, LDL and triglycerides.
- [Tata 1mg comprehensive pathology package](https://www.1mg.com/labs/test/comprehensive-platinum-package-pathology-44003): liver enzymes, bilirubin and proteins.
- [Tata 1mg thyroid profile](https://www.1mg.com/labs/test/thyroid-profile-total-t3-t4-tsh-2571): T3, T4 and TSH.
- [Tata 1mg ESR](https://www.1mg.com/labs/test/esr-erythrocyte-sedimentation-rate-1417): ESR is a nonspecific inflammation marker.
- [Tata 1mg TIBC](https://www.1mg.com/labs/test/total-iron-binding-capacity-1953): iron-binding tests with ferritin and transferrin.
- [IHBAS laboratory service list](https://ihbas.delhi.gov.in/sites/default/files/ihbas/rti-files/268-1_03.pdf): kidney tests and electrolytes.

The uploaded lab pages also provide panel context. Personal reports and extracted patient data are excluded from git.

## Fertility and Longevity — researched 9 October 2026

These are cross-cutting Summary groups; they do not alter My Reports panel labels, test matching, values, units or printed reference ranges. Both include comparable and single-report results already read by the supported blood-report reader. They do not suggest ordering a panel.

### Fertility

Group recorded AMH, FSH, LH, estradiol/o estradiol, progesterone (including the distinct 17-hydroxyprogesterone test), testosterone, prolactin and TSH. The grouping spans ovarian and male endocrine evaluation; it does not imply that every test is routinely indicated for every person. Pregnancy hCG, nutritional vitamins, semen metrics and ultrasound findings are excluded. FSH/estradiol interpretation depends on cycle timing; progesterone timing depends on the expected next period. Prolactin and androgen tests are conditional investigations. AMH reflects ovarian reserve and does not predict an individual's chance of natural pregnancy. Male fertility evaluation requires semen analysis and clinical context; hormones alone are insufficient. The current reader does not support semen analysis or ultrasound.

- [ASRM female fertility evaluation (2021)](https://www.asrm.org/practice-guidance/practice-committee-documents/fertility-evaluation-of-infertile-women-a-committee-opinion-2021/): reserve tests, timed progesterone, TSH and conditional prolactin/androgens; poor predictive value of reserve tests for fertility.
- [AUA/ASRM male infertility guideline, amended 2024](https://www.auanet.org/documents/Guidelines/PDF/2024%20Guidelines/Male%20Infertility%20Unabridged%20Final.pdf): indicated FSH/testosterone evaluation, conditional LH/prolactin, and semen analysis.

### Longevity

This is an editorial grouping of established long-term cardiovascular, metabolic and kidney-health blood markers, not a validated longevity panel. Includes total/LDL/HDL/non-HDL cholesterol, triglycerides, ApoB, Lp(a), reported glucose and HbA1c, creatinine, eGFR, cystatin C and explicitly high-sensitivity CRP. Routine CRP/ESR, troponin, ApoA1, vitamins, reproductive hormones, telomere tests and biological-age clocks are excluded. No lifespan, risk or biological-age score is calculated. Reference ranges remain those printed by the lab; they are not personalized treatment targets.

- [2026 ACC/AHA dyslipidemia guideline announcement](https://www.acc.org/About-ACC/Press-Releases/2026/03/13/18/01/ACCAHA-Issue-Updated-Guideline-for-Managing-Lipids-Cholesterol): cholesterol/triglycerides, ApoB, Lp(a), hsCRP and their contextual use in cardiovascular risk assessment.
- [AHA PREVENT](https://professional.heart.org/en/guidelines-and-statements/about-prevent-calculator): integrates cardiovascular, kidney and metabolic factors; HbA1c and urine albumin-creatinine ratio can add context. Urine ACR is relevant clinically but outside this blood-reader scope; blood pressure, lifestyle and medical history are also not represented by this card.
- [NIA aging-clock research](https://www.nia.nih.gov/news/research-context-can-we-slow-aging) and [biomarker-validation research review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11090477/): aging clocks remain a distinct research/validation field; routine results cannot be presented as an individual lifespan prediction.

Clinical relevance is not proof that changing a marker increases lifespan. Fertility results are not fertility probabilities. Empty cards mean no mapped tests were read, not a health assessment.
