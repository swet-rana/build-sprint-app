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

Maximum content width is 1096px. Tests use two columns on desktop and one at 760px and below. Summary insets use the spacing tokens above. Original report links repeat beside each value. Print uses A4 and shows the summary only; browser preview was verified as one page.

## Elevation & Depth

Flat surfaces use borders and pale background layers, without shadows.

## Shapes

The paper summary has gently rounded corners; controls use the smaller corner token above.

## Components

The print button uses the action color. Source links are underlined. Keyboard focus uses an amber outline. Charts show blue measured trends and a pale reference band from the sample reports.

## Do's and Don'ts

- Do explicitly label fictional data.
- Do show source links beside every value.
- Don't label measured changes as health improving or worsening.

Current scope is a sample screen. Upload, report reading, sign-in, and saving are not implemented.
