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
typography:
  title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "14px"
rounded:
  summary: "12px"
  control: "7px"
spacing:
  inset: "32px"
  mobile-inset: "20px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "13px 18px"
---

# Health history design

## Overview

**Creative North Star: "Dated clinical comparison sheet"**

The summary is a reading surface used by patients and doctors during a visit. Paired results sit beneath each chart, with source links beside the evidence.

## Colors

The cool paper palette keeps recorded evidence readable. Blue represents measured change, never improvement. Above-range text uses muted amber; the doctor interprets its meaning.

## Typography

Self-hosted Public Sans uses 400 for body, 500 for labels, 600 for headings and 700 for the brand. The page title becomes 29px on phones; the summary title is 25px desktop and 21px on phones. Body text is 14–16px and source details are 11–12px.

## Layout

Maximum content width is 1096px. Tests use two columns on desktop and one at 760px and below. Summary insets use the spacing tokens above. Original report links repeat beside each value. Print uses A4 and shows the selected summary only. The original fictional sample was verified as one page; the real summary print check is tracked separately.

## Elevation & Depth

Flat surfaces use borders and pale background layers, without shadows.

## Shapes

The paper summary has gently rounded corners; controls use the smaller corner token above.

## Components

The primary upload and print buttons use the action color. Source links are underlined. Keyboard focus uses an amber outline. Charts show blue measured trends and a pale reference band from the sample reports.

The upload panel continues the white paper surface and rounded borders. Its file picker uses a dashed border and amber keyboard focus. Selected files show names, sizes and written upload states; errors use the error color and explain what to try next. Secondary controls have white backgrounds and thin blue-gray borders. Busy controls are disabled and muted. Uploaded originals appear in bordered rows with an Open report button; actions and file states stack on phones. My reports, My summary and Sample summary use underlined active-view buttons.

My summary preserves the same dated comparison sheet. Three report selectors, with the third optional lead into a draft review notice and an expandable test picker with any number of selected tests. Source controls sit beside each value and include the original PDF page number. Additional expandable sections show all comparable results, unpaired values and excluded-page notes. Tests with different units or conditions stay separate; unpaired values have no trend line. Selectors and test choices stack on phones, and the full results table scrolls horizontally. Printing excludes selection and coverage controls, keeping the selected comparison sheet.

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
