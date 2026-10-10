# Summary preparation surface

Mode: Operate. Extend the established Home and My Reports system. Reference: `references/summary design reference.png`; the user's requested headline and accurate dynamic state override the illustration's old headline and example metrics.

## Direction contract

THESIS: Let users confirm their selected originals, then deliberately prepare a comparison. Selection and preparation share the first viewport rather than competing with the generated results.

OWN-WORLD: Existing Manrope and HealthStats logo, near-white center with lavender edges, purple text, thin lavender borders, white rounded report rows and soft shadows. Reuse the existing summary illustration and report cluster; no new artwork or global token changes.

STORY: Read filenames and actual metadata, remove an accidental selection, return to My Reports to add another, then press Prepare summary. Only completed analysis supplies counts and findings; every extracted finding retains its original source.

FIRST VIEWPORT: Header with 106px report art and 40px headline. A 65/35 desktop composition pairs compact selected rows with a preparation card and full-width purple action. A lavender information strip sits below. Mobile stacks these panels and reserves space for a floating bottom navigation.

FORM: User-pinned two-column reference; no concept seed needed. At 768px use narrower balanced columns, at 390px one column. Signature interaction is deliberate preparation with actual reading progress and an explicit retry, never automatic analysis.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Reference map and implementation

5×5 map: top row logo left and empty illumination right; second row summary illustration/headline across columns 1–3 and faded report cluster at 4–5; rows 3–4 contain selected reports across 1–3 and preparation across 4–5; fifth row information notice and bottom navigation. Reference at 1536×1024 uses roughly 54px outer gutters, 24px panel gaps, 24px rounded corners, 26–30px padding, 42px title, 24px section headings and 13–16px supporting text. White center and lavender edges keep the records readable. Unsupported privacy badge and fake completed metrics are omitted. The reference's two PDF rows are actual components with stored file size/date/lab, never baked artwork.

The summary may print onto additional pages when many tests are selected; avoid an unconditional one-page claim. Browser-local access wording is retained as requested. No parser, matching, backend, schema, auth, or storage changes are part of this redesign.

## Final implementation and verification

Finish review disposition: **ship**. The completed preparation surface in `src/analysis.js` and `src/summary-premium.css`, connected through `src/main.js` and `src/uploads.js`, matches the pinned reference within the existing HealthStats Home and My Reports visual world. It retains Manrope, the incumbent logo and illustration assets, white panels, thin lavender borders, soft shadows and purple actions. The surface uses the pinned colors #F8F7FF, #EEE9FF, #E4DCFF, #493DBB, #100078, #17145C and #62658C; these remain local surface decisions, not new global tokens.

Observed implementation: headlines are 40px desktop, 34px tablet and 27px mobile; headline art is 106×118px desktop and 54×64px mobile. Columns change from 1.85fr/1fr to 1.35fr/1fr at 1100px and stack at 760px. Desktop panels have 24px corners. A scrolling main frame reserves space outside the content for bottom navigation and includes safe-area spacing. Browser measurements confirmed the content frame ends before navigation (800px versus 808.6px desktop; 748px versus 766px mobile), with no horizontal overflow.

Independent finish review checked `artifacts/summary-desktop.png` (1440×900), `artifacts/summary-tablet.png` (768×1024), `artifacts/summary-mobile.png` (390×844) and `artifacts/summary-mobile-action.png`. The parent agent exercised the actual browser flow: selected Apollo reports 1 and 2, removed report 2, returned to My Reports with report 1 still selected, selected report 2 again, and prepared a comparison containing two reports and 55 matching tests. Opening the original Haemoglobin source reached report 1, page 2 of 20. Removal uses the existing `mountUploads.removeFromAnalysis` selection publication; no backend change was needed. Counts and findings come from actual reports rather than display fixtures.

Validation reported 51 passing tests, successful type check and production build, dependency audit with zero issues, and a clean detection result (`[]`). An isolated test of the mounted Summary covers download failure and retry. Preparation promises a doctor-friendly summary; printing may continue onto additional pages. Published successfully with `npm run deploy` to https://zealous-kiwi-423.convex.site. Final browser verification of that production deployment could not complete because the browser connection timed out twice; the captured layouts and functional walkthrough above were verified against the local running app. No separate lint command is configured.

Asset provenance: the existing repository raster logo and summary-trendlines illustration, plus `reports-floating-documents.svg`, were reused; no image was produced or replaced. The incumbent `DESIGN.md` and `.impeccable/design.json` were preserved because this is an ordinary extension without an approved global system change. Pre-existing drift includes unfinished template fields in `DESIGN.md` and its user's 40-line unstaged edit; neither was repaired or canonized by this surface pass.
