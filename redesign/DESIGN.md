# VibeCloud: the design (2027)

*Written as the studio: an ops-tooling designer who draws SRE consoles.*

## Concept

Calm mission control. The page is a console. Nothing blinks for attention; the one warm color is for what waits on a
person. A visitor does here what an operator does: types what the fleet should be, reads the diff, approves, applies,
and watches states move from proposed to verified. Nothing on the page claims live status: the fleet is labeled
illustrative and simulated, and the status section lists what is built, not lights.

## Type

- Geist (variable, 100–900) for display and text; Geist Mono for every machine word: commands, ids, states, labels,
  prices, the nav. No other family. Self-hosted latin subsets (28 KB + 31 KB), metric-matched fallbacks.
- The display scale is a weight axis, not only a size: headings pair Geist 250 with Geist 600–640 in one line
  ("Say what the fleet / **should be.**"). On load the bold line grows from 250 to 640 (`@starting-style`).
- Scale: hero 42 → 112 px (`clamp`, 0.92 leading, −0.05 em), section heads 32 → 124 px, text 17–19 px, mono 11–13 px.
  Ratio ≈ 1.5 between steps. Tabular numerals in the plan table.
- `text-wrap: balance` on headings, `pretty` on paragraphs.

## Color (OKLCH, sRGB fallbacks)

| role | sRGB | OKLCH | on navy |
|---|---|---|---|
| navy (ground) | #0b1423 | 0.19 0.035 256 | — |
| panel | #0f1b2d | 0.22 0.038 256 | — |
| ice (text) | #dbe8f1 | 0.925 0.018 235 | 14.8:1 (13.8 on panel) |
| ice-2 (secondary) | #a9bccb | 0.79 0.03 238 | 9.4:1 |
| steel (labels, rules) | #7297b5 | 0.66 0.065 246 | 6.0:1 (5.6 on panel) |
| amber (waits on a person, focus) | #ecc36b | 0.84 0.115 84 | 11.1:1; navy on amber 11.1:1 |
| bad | #f2a48f | — | 9.2:1 |

Rules are steel at 24 % and 13 %. No gradients on type, no glow, no blur. Scrims over video are flat navy ramps.

## Shape and the corner language

Beveled corners: a 45° cut (`corner-shape: bevel`, 14 px on panels, 7 px on keys), square where the browser has no
`corner-shape`. One button shape on the whole site, the **key**: mono label, 1 px steel edge, beveled; amber fill
only for the action that commits (Apply, Plan it). Hairlines, not cards. Focus: 2 px amber outline, 3 px offset.

## Navigation

A console bar: the wordmark, the page as a path (`fleet / how / console / providers / status / about / team`, in
mono), and a ⌘K key that opens the command palette. Below 900 px the path is a second, horizontally scrolling row.

## Layout

- 1440 / 2560: a 12-column console grid; the hero sets type on 5 columns and the console on 6, over faint graph
  paper that fades out from the console. Section heads are huge and left-aligned; content caps at 1320 px.
- 768: one column; the console under the type, full width.
- 390: the topology redraws as stacked regions (`topology(…, { narrow })`) so its mono labels stay 11 px; the rail
  becomes 2 × 2; the plan table becomes two-line rows; the ⌘K hint hides on touch screens (the key stays).
- 320: the same, with nothing wider than the screen (the journey checks `scrollWidth`).

## Motion (each with its reduced-motion still)

| motion | explains | reduced motion |
|---|---|---|
| proposed squares appear dashed, become steel when provisioned, ice with a tick when verified | a state change | instant class changes; same states |
| removed squares fade | a replica drained | instant |
| scroll stage: describe → plan → wire → fail over, the SVG builds per step | a sequence and a cause | the steps switch with no transition; without script the stage shows its whole picture |
| step text rises on `animation-timeline: view()` | reading order | none |
| headline weight 250 → 640 on load | — (brand) | set at 640 |
| section loops (clouds, relief) | atmosphere | never play; the poster is the designed still |
| palette opens with a short drop (`@starting-style`) | where it came from | none |

Nothing flashes. Loops are slow drifts at 24 fps.

## Media plan (fal, budget $15, spent ≈ $1.12: NOTES.md)

1. **Deck** (§01, fullscreen): a moonlit sea of clouds from above, a few amber lights through one gap — the name made
   literal, calm. Flux Pro 1.1 Ultra still (21:9) → Kling 2.1 image-to-video, 10 s slow forward drift.
2. **Relief** (§04, under the ledger): an engraved contour-line terrain with three amber points; Kling draws the arcs
   between them. Shown at 55 % under a navy ramp.
Crop: wide, horizon high; color held to the palette by the prompt; grain from the model. Each loop: 8.5 s with a
1.5 s crossfade seam, 1280 px, AV1 WebM + H.264 MP4 (0.25–1.6 MB), a poster, muted, `preload="none"`, played only on
screen and never with reduced motion, a pause key on each. Captions say "generated, not a real place".

## The signature moment

`› scale api to 6 in us-west` is already typed and planned when the page opens: three dashed amber squares wait in
us-west, the log prices them on `cloudflare/main` at +$87.60 a month by the console's own planner, and nothing moves
until the visitor presses Approve, then Apply. ⌘K offers more (drain us-east, add 2 worker in eu-central …), and a
typed command runs if it parses.

## Sections

00 the fleet console · 01 deck loop "Capabilities, not product names." · 02 the scroll stage "Four states. One
description." · 03 the console "Plan a real sentence." · 04 the ledger of five accounts over the relief loop ·
05 status: built / not built, pricing, contact · footer with A/文.

## Don'ts

No live-looking status lights, uptime or counters. No rounded cards, no shadows, no gradients on type, no glow. No
second button shape. No icon pack. No photo of a person outside the team pages. Never amber for decoration.
