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
