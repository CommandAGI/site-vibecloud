# VibeCloud redesign: notes

## Generated media (fal)

Made by `scripts/media.mjs` (the key from the CommandAGI `.env` cascade, never in the page or a log), encoded by
`scripts/encode.sh`. Raw files are in `.media-raw/` (git-ignored); prompts and seeds in `.media-raw/<name>.json`.
Costs are fal's list prices for these calls (the account's bill is not read here).

| file | model | prompt | cost |
|---|---|---|---|
| deck-still.jpg (3136×1344) | fal-ai/flux-pro/v1.1-ultra, 21:9, seed 1524855264 | "Seen from above at night, a vast calm sea of clouds lit by moonlight, soft ice-blue highlights on the cloud tops, the gaps between clouds deep midnight navy, far below through one gap a few tiny warm amber lights, deep midnight navy, ice blue, a few warm amber points, calm, minimal, cinematic, fine film grain, no text, no letters, no logos, no people" | $0.06 |
| deck-loop (10 s, 2200×940) | fal-ai/kling-video/v2.1/standard/image-to-video, from deck-still | "The camera drifts very slowly forward above the moonlit sea of clouds; the clouds roll gently; the tiny amber lights below glow steadily. Calm, slow, no flashing." (negative: text, flashing, strobe, fast motion, camera shake, people, logos) | $0.50 |
| relief-still.jpg (2752×1536) | fal-ai/flux-pro/v1.1-ultra, 16:9, seed 54837706 | "An abstract terrain relief drawn only in thin ice-blue contour lines on a deep midnight navy ground, like an engraved topographic chart, three small amber points on three far apart ridges joined by thin hairline arcs, top-down, …" (same style tail) | $0.06 |
| relief-loop (10 s, 1928×1072) | fal-ai/kling-video/v2.1/standard/image-to-video, from relief-still | "A very slow top-down pan across the engraved contour-line terrain; the hairline arcs between the amber points draw themselves slowly; calm, no flashing." | $0.50 |
| **total** | | | **≈ $1.12** of $15 |

Encoded (`media/`): deck-loop.webm 242 KB, .mp4 480 KB; relief-loop.webm 811 KB, .mp4 1.6 MB; posters 70 KB and
212 KB. og.png and apple-touch-icon.png are drawn from `scripts/og.html` in the site's own type (`scripts/shots.py
--assets`); favicon.svg by hand.

## Looking at it (§5.4)

`python3 scripts/shots.py` → `redesign/.shots/` (a dot folder: kept, never served): 1440, 768, 390, 320, reduced
motion at 1440 and 390, and the four scroll-stage states at 1440 and 390 (a full-page capture cannot show a
scroll-driven stage). `python3 tests/journey.py` drives every interaction in Chromium.

What the screenshots changed: the hero grid went from 1fr to minmax(0, 1fr) (320 px scrolled sideways); the
topology got a stacked layout for phones (its labels were 6 px); the stage sentence was shortened (it clipped at
390); the nav separator stopped taking the current page's underline; the generated agent-team CSS block came back
(cards had lost their grid); the wordmark's gap closed; graph paper under the hero (it read flat).

## Scores (own, against §5.4)

| | score | why |
|---|---|---|
| art direction | 8 | one held idea (the page is a console) from the bar to the footer; two loops in palette |
| brand specificity | 8 | Geist weight pairs, bevel keys, amber-only-for-decisions; no other site of the set is a console |
| product expression | 9 | the hero is the product's loop (command → priced diff → approve → apply → verified), priced by the real planner |
| interaction | 8 | ⌘K palette with keyboard, typed commands, the console, outage, sample sentences, video pause |
| technical quality | 8 | static, ~90 KB JS+CSS, fonts 59 KB, video lazy, CSP with no other host, no-script page draws the fleet |
| craft | 7.5 | hairlines and states are careful; the scroll stage's fan lines cross a lane label |
| **average** | **8.1** | nothing below 7 |
