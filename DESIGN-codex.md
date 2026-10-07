---
name: Health history
description: A dated clinical comparison sheet for patients and doctors.
colors:
  background: "#f1f5f7"
  paper: "#ffffff"
  text: "#233c48"
  secondary: "#526977"
  action: "#174e65"
  chart: "#176889"
  reference: "#e6f0f1"
  above-range: "#6e542c"
  error: "#8e342d"
  reports-page: "#f6f5ff"
  reports-surface: "#f0eeff"
  reports-action: "#4942bc"
  reports-action-hover: "#38319f"
  reports-ink: "#171d4b"
  reports-muted: "#555f88"
  reports-card-border: "#e9e6fa"
  reports-filter-selected: "#4942bc"
  glass-edge: "rgba(255,255,255,.9)"
  glass-ink: "#35308f"
  reports-focus: "#9187de"
typography:
  title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.2
  summary-page-title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "28px"
    fontWeight: 600
  summary-sheet-title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "24px"
    fontWeight: 600
  body:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "14px"
rounded:
  summary: "12px"
  control: "7px"
  reports-shell: "20px"
  reports-card: "16px"
  reports-search: "12px"
  reports-button: "9px"
  reports-filter: "24px"
spacing:
  inset: "32px"
  mobile-inset: "20px"
  reports-inset: "28px"
  reports-card-inset: "18px"
  reports-grid-gap: "18px"
  reports-mobile-gap: "16px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "13px 18px"
  summary-screen-primary:
    backgroundColor: "{colors.reports-action}"
    textColor: "{colors.paper}"
    rounded: "{rounded.reports-button}"
    height: "44px"
  summary-screen-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.reports-ink}"
    rounded: "{rounded.reports-card}"
  report-open:
    backgroundColor: "{colors.reports-action}"
    textColor: "{colors.paper}"
    rounded: "{rounded.reports-button}"
    padding: "12px 16px"
    width: "100%"
    height: "44px"
  report-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.reports-ink}"
    rounded: "{rounded.reports-card}"
    padding: "18px"
---

# Health history design

## Overview

**Creative North Star: "Dated clinical comparison sheet"**

The summary is a reading surface used by patients and doctors during a visit. Paired results sit beneath each chart, with source links beside the evidence.

My Reports follows the user-selected middle “02 Premium Cards” reference in `references/Reports-design.png`: a lavender report library with white cards and indigo actions. My Summary now shares that palette, Public Sans typography, rounded white cards and indigo actions on screen. The fictional sample and printed clinical comparison retain their existing treatment. Screen overrides live in `src/summary.css` and the last-imported `src/glass.css`, both inside `@media screen`. The current screen finish is translucent lavender glass; selected categories and report filters retain solid indigo with white text.

## Colors

My Reports and My Summary share lavender page and shell backgrounds, white cards, indigo actions and trends, dark indigo headings, muted blue-purple secondary text and pale lavender borders. The clinical sample and print palette remain recorded in the original background, text, action, chart and reference tokens. Trend color represents measured change, never improvement. Above-range text uses muted amber; the doctor interprets its meaning.

## Typography

Self-hosted Public Sans uses 400 for body, 500 for labels, 600 for headings and 700 for the brand. My Summary screen page titles use 28px desktop and 25px on phones; the sheet title uses 24px and 22px, controls headings 22px and 20px, and test headings 18px and 17px. The clinical sample retains its 34px page title (29px on phones) and 25px sheet title (21px on phones). Body text is 14–16px and source details are 11–12px.

## Layout

Maximum content width is 1096px. Tests use two columns on desktop and one at 760px and below. Summary insets use the spacing tokens above. Original report links repeat beside each value. Print uses A4 and shows the selected summary only. The original fictional sample was verified as one page; the real summary print check is tracked separately.

## Elevation & Depth

The clinical sample and printed summary use borders and pale background layers without shadows. My Reports and My Summary screen cards retain their restrained ambient shadow. Their outer panels, actions, unselected category/filter controls, test-name headings and small report/review badges use a white-to-lavender translucent gradient, bright glass edge, inset highlight and soft purple shadow. Outer panels blur the backdrop at 20px; smaller glass controls use 12px. Summary context, footer and result-table headers use a lighter lavender gradient. Selected category/filter controls remove backdrop blur and stay solid indigo with white text. Reduced-transparency preferences remove panel, category/filter and test-heading blur. Action menus retain their stronger local shadow.

## Shapes

My Summary screen uses a 20px shell (16px on phones), 16px white cards, 12px category buttons and 9px action buttons. The clinical sample retains its 12px paper and 7px controls.

## Components

My Summary screen primary buttons and source links use indigo, with lavender keyboard focus. Charts use indigo paths and points, a pale lavender reference band and muted purple labels. Source links remain underlined. Clinical sample and print styles keep their original action and chart colors; sample keyboard focus remains amber.

My Reports has a two-column white card grid on the lavender shell; at 760px and below it becomes one column. The shell inset reduces from 28px to 18px, with card gaps reducing from 18px to 16px. Report headings are 18px desktop and 17px on phones; the page heading is 28px desktop and 25px on phones. Filenames and patient names wrap within the available width.

Each card shows a stable report serial, an optional “Duplicate of report #N” notice, an original-file preview, short test type, lab, test date, patient, file format/size and the filename. PDF previews render the actual first page of the saved original; image reports preview the saved image. A document icon with PDF/Photo text remains while loading or if reading fails. Never substitute a decorative or fabricated report thumbnail. The preview is supplementary; the full-width Open report action opens the original file.

A three-dot menu holds Edit details and Delete report. Edit details opens a form inside its card with Lab name, For whom?, Type of test and Date of test, stacked in one column. Save details and Cancel remain explicit actions, with written saving/error status. Automatic test types use short three-to-five-word descriptions, such as “Complete blood count tests” or “Comprehensive blood tests”, rather than a long list of health categories. Existing category-list descriptions are shortened for display and editing. Photos and unsupported PDFs need manual details; missing values have written placeholders. Users are asked to check automatic details against the originals.

Search checks filenames, labs, patients, short test types, dates and serials. The All reports, Blood tests and Photos filters use rounded glass chips with a solid indigo selected state and white text. Upload report reveals an inline white upload panel below these controls and above the cards. The panel keeps the existing file picker, queue and written upload states. My Reports and My Summary screen use lavender keyboard focus; the fictional clinical sample retains its amber focus treatment.

My Summary preserves the same dated comparison structure within the Premium Cards screen treatment. The screen shell is inset 28px desktop and 18px on phones; the report-selection card uses 24px and 18px padding. Selected-report tiles use two columns desktop and one on phones. White cards wrap selection controls, test choices, the comparison sheet and both result tables. Pressed category buttons use white text on indigo. Screen styling does not change the sample or print layout. Three report selectors, with the third optional lead into a draft review notice and an expandable test picker with any number of selected tests. Source controls sit beside each value and include the original PDF page number. Additional expandable sections show all comparable results, unpaired values and excluded-page notes. Tests with different units or conditions stay separate; unpaired values have no trend line. Selectors and test choices stack on phones, and the full results table scrolls horizontally. Printing excludes selection and coverage controls, keeping the selected comparison sheet.

## Do's and Don'ts

- Do explicitly label fictional data.
- Do show source links beside every value.
- Don't label measured changes as health improving or worsening.

Current scope supports uploading and opening original PDF, JPG, PNG and WebP files up to 10 MB each. Access is tied to this browser; clearing browser data loses access. Uploaded originals stay separate from the fictional sample summary. My summary reads two or three text-readable blood-test PDFs with different collection dates for the same patient and matching test units. The checked report pair yielded 55 matching tests; this is a verified example, not a limit or a promise for other report formats. Users select any number of tests for the summary and can inspect all comparable and unpaired values with links to source pages. The generated comparison remains in memory and is rebuilt after reload. Scanned-only PDFs and photos are excluded from comparison. The summary shows measured changes and report reference ranges without diagnoses. Sign-in is not implemented.

Three-report comparisons use three selectors, with an optional third report. Each selected test has dated values across all selected reports, including explicit missing-value labels. Charts stop at missing dates, and change labels show their own first and last available dates.

The test picker includes Select none and allows every checkbox to be cleared. With zero selected tests, the summary explains how to add one and the print action is hidden.

My summary includes a grid of clickable health-category buttons with test counts and pressed states. Four columns become two on phones. Clicking a category filters test choices and comparable/unpaired result lists, keeping both result tables below the blood report summary. Clicking a category selects all its tests and clears all other summary selections. Tests can belong to multiple groups; unmatched names remain in Other tests and empty categories remain visible. Categories are browsing aids, not diagnoses, and are excluded from print.

The test picker has no selection cap. Print allows the summary to span multiple A4 pages, keeping each test block together and preserving readable charts and source details.

Category selection includes tests without a matching result or unit. These tests are selectable individually and printable with recorded dates, values, reference ranges and source pages. They show a single-report label without a trend line or calculated change. Different units remain separate.

Test matching uses checked equivalent-name aliases, with the original printed name shown beside each summary value when different. Numeric units and distinct test conditions remain separate. The alias rules and sources are recorded in references/test-name-matching.md.

Unmatched results use the same bordered table styling as comparable results, with test, report date, recorded value/unit, printed reference range and source columns. Tables scroll horizontally on phones and show a written empty state.

Verification for the report-details extension: 23 code tests and the type check passed. Browser proof and the Convex update were blocked by this session's restrictions. The component descriptions above reflect the code; visual approval and a working save against Convex remain unverified.

Verification for the Premium Cards redesign: the reviewer marked it ready to ship with no material fixes. Desktop (1440px) and phone (390px) screenshots are `.impeccable/review/premium-reports-desktop.png` and `.impeccable/review/premium-reports-mobile.png`. Browser checks covered search, filters, upload-panel toggle, menu, Edit details/Cancel and all four original-file previews, with no horizontal overflow. All 26 unit tests, type check and production build passed. The user activated the backend update: report numbers and duplicate detection were visible, including report #4 marked as a duplicate of #3, and Delete was enabled. Actual deletion, restoration and saved-edit flows were not proved in this redesign review.

Verification for My Summary styling: desktop and 390px phone screenshots are `.impeccable/review/premium-summary-desktop.png` and `.impeccable/review/premium-summary-mobile.png`. Browser checks read two selected reports with 27 matching tests and verified a category button’s pressed state. The phone document width matched its 390px viewport without horizontal overflow. All 27 tests, type check and production build passed. Sample and print CSS are unaffected by the screen-only stylesheet; print output was not re-rendered in this review.

Glass finish verification: desktop and phone evidence is `.impeccable/review/glass-reports-desktop.png`, `.impeccable/review/glass-reports-mobile.png`, `.impeccable/review/glass-summary-desktop.png` and `.impeccable/review/glass-summary-mobile.png`. Browser review showed three selected reports and 63 matching tests. The build and design detector passed. This finish applies only on screen; sample and print styling were not changed.
