# HealthStats Home

Mode: Operate. Extend the existing HealthStats world; the supplied references/Storyboard.png is visual guidance, not a pixel reproduction or six routes.

Reference map (5×5): top row carries logo/title; columns1–5 carry six narrow phones with generous white/pale-lavender grounds; middle rows carry report sheets, upload well, selectable report list, summary and completion visual; bottom row carries explanatory captions. Phone interiors: logo top, bold centered heading, muted supporting text, report-led focal content; final phone carries connected four-step icons and bottom navigation. Round white cards, thin lavender edges, soft shadows. Reference deep purple approximately #00007f; existing logo pixels confirm #00007f and #2a2483. Existing app type Manrope400/700, secondary #555f88, white/pale lavender #f6f5ff.

Implement one Home panel, automatically advancing intro1200ms → upload1300ms → select1500ms → prepare1300ms → ready1200ms → settled transition500ms. HTML report content is illustrative, never patient data or diagnostic advice. Demo reports1–6, only2/3/5 selected. Reuse the existing switchView with one normal bottom nav (Home/My Reports/Summary/Profile), not duplicate routes or tab architectures. Existing panels stay mounted. Navigation available during animation; leaving pauses, returning continues. Browser localStorage stores completion only; no backend writes. Reduced motion starts in permanent Home.

Permanent Home keeps brand + exact headline and supporting copy, four numbered connected workflow buttons replay their respective upload/select/prepare/ready demonstrations, then return to permanent Home. User correction supersedes route targets for these steps; bottom navigation alone changes views. No Get Started/Skip/carousel dots. White/light lavender, deep logo purple, Manrope, restrained depth; responsive horizontal desktop and2×2phone journey. No new bitmap assets; logo and existing reports3Dcutout may be reused.

Motion thesis: reports converge, upload into a report collection; precise2/3/5 selections appear, Prepare Summary receives a single demonstrated tap, completion check appears, then same journey resolves into permanent tappable steps. Bounded CSS transform/opacity/line stroke only, no loops, no added library. A timer runs only while Home and document are visible. Control timing is cancellable; all views retain independent state.

## Implemented contract

The first exposure lasts 7,000ms in visible Home: intro 1,200ms, upload 1,300ms, select 1,500ms, prepare 1,300ms, ready 1,200ms and final arrival 500ms. The code calls the final state `settled`. Final Home reads “Prepare for conversations with your doctor” and “Turn your medical reports into a clear, one-page summary.”

Completion stores `complete` under `healthstats-home-explainer-v1` in localStorage. A later visit starts on final Home. Storage failure falls back to session memory. Hidden-document time and time spent in another view do not advance the demonstration. Reduced motion starts on final Home and removes transitions; deliberate step replay remains available.

**Final steering:** numbers 1–4 replay only upload, select, prepare and ready respectively, for 3,000ms, then restore final Home and focus to the originating button. They do not run the remaining sequence or change the active tab. The selection replay clears its illustrative checks first and checks only reports 2, 3 and 5. Bottom navigation is the one existing four-tab control: Home, My Reports, Summary and Profile. Real report and summary panels retain their mounted state.

Home-specific colour properties and components remain scoped to this extension. Preserve root DESIGN.md and .impeccable/design.json; no global token refresh is part of this work.

## Verification record

The parent implementation run reports 35 automated tests and a production build passing. Browser checks confirmed the automatic sequence, only 2/3/5 checked, completion persistence after reload, all four isolated replays returning to final Home without navigation, and a 390px phone layout without horizontal overflow. Saved evidence: `.impeccable/review/home-desktop.jpg`, `home-mobile.jpg`, `home-demo-*-mobile.jpg` and `home-step-replay-final.jpg`.

The documentation pass checked source behavior in src/home.js, timing in src/home-timeline.js, styling in src/home.css and navigation wiring in src/main.js. Final reviewer disposition: ship; no material fixes. Pre-existing placeholder DESIGN.md remains outside this extension’s scope. Leaving/re-entering Home, document visibility, reduced-motion handling and focus return are supported by source inspection here; this record does not claim a separate browser test for those paths. No backend write or deployment is included.
