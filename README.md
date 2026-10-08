# Plaything · 小小群落

A standalone browser recreation inspired by Black Mirror: Thronglets. An unofficial tribute, not the complete official game. World graphics use Canvas pixel rendering. The six supplied expression families retain their original indexed pixels and timing; missing motions are completed in the same pixel style. Behavior is rule-based simulation; there is no conscious AI, external model API, backend, or paid dependency.

## Run

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. No dependencies or build required. Progress is browser-local, auto-saved every eight seconds and on page exit; it does not advance while closed. Sound starts off.

## Game loop

Feed, clean, and play with yellow creatures. Gather renewable wood and ore, process ore into gems, reproduce, and build orchards, baths, playgrounds, nests, mines, and resonance towers. Creatures seek facilities autonomously and reproduce when healthy. Food shortages and storms challenge the colony. Reach 16 creatures and build a resonance tower, then continue into bridge exploration, industry and pollution management.

Chinese interface; draggable isometric world; zoom; pause and 1×/2×/4× speed; help; reset confirmation; optional synthesized sound; desktop/mobile layouts; local save.

## Controls

Select a tool, then click a creature. Harvest trees and rocks; choose a building and click empty land. Drag or arrow keys pan; scroll or +/− zoom; 1–6 select tools; Space pauses; Escape cancels. Help includes restart on mobile.

## Source

- `dist/index.html`: Chinese interface and dialogs
- `dist/style.css`: responsive retro styling
- `dist/game.js`: state, simulation, input, Canvas renderer
- `tests/smoke.cjs`: headless simulation checks

Run `node --check dist/game.js` and `node tests/smoke.cjs`. Tests need only Node built-ins; optional `@napi-rs/canvas` enables rendered captures with `GAME_SCREENSHOT=/path/image.png`.

Intended canonical maintenance destination: https://github.com/BartLiu0820/plaything . Sites uses a separate managed deployment repository. No credentials belong in source; `.openai/hosting.json` is deployment metadata only.

## Verification and scope

Tests cover care, splitting, exact resource targeting, construction costs, occupied placement rejection, tower requirement, orchard production, pause/speed/reset, local persistence, automated care/reproduction, and 600 simulated seconds. Browser-process launch was restricted in the build environment, so full browser UI/keyboard/touch verification remains a manual follow-up. The game world was rendered and visually inspected with offscreen Canvas.

Includes a bounded original progression, not all official levels, tools, story, assets, or endings. Not affiliated with Netflix or Night School Studio.

## References

- https://www.netflix.com/tudum/articles/black-mirror-thronglets-mobile-game-news
- https://about.netflix.com/en/news/experience-black-mirror-like-never-before-introducing-the-long-lost-game

## Character-state fidelity update

The latest pass adds reference-shaped floppy ears, tuft and blue shorts; varied expressions and actions; progressive grime, sponge/foam and continuous scrubbing; individual navigation/urgent-care focus; autonomous needs and resting; historical 6/10/15 population unlocks; and non-destructive old-save migration. See [fidelity notes](docs/fidelity.md) for verified references, balancing choices and remaining gaps.

## Bridge and industry update

Deposit wood at the bridge and healthy creatures build it, opening the far shore. Build mines on glowing nodes, process ore, and unlock factories at 300 gems (Mark II at 5,000). Factories leave purple pollution that harms nearby creatures. Pause production or use the radius mop to clean up. Old local saves migrate without losing creatures or existing facilities. See the fidelity notes for verified milestones and explicitly adapted costs/rates.

## Episode-first visual mode

The default view now targets the game shown on-screen in *Plaything*: left 2×4 toolbar with T crest, top-right population medallion, full-screen green diamond-patch terrain and blue left-side river. Click the population badge or a creature to inspect it; T opens settings/help; the house tool opens construction. Mobile-derived expansion/industry features remain accessible under the labeled expansion tab. The permanent dashboard, goal banner and bottom dock no longer dominate the screen. Back-facing sprites and intermittent singing poses were added using inspected episode stills and a production interview as evidence. See fidelity notes for interpretation limits.

## Map and animation reference pass

The episode HUD remains primary. Open T → 全图 to navigate the expanded world: northern cube platform reached by a new wooden bridge, original home territory, and larger industrial shore with river crossing and ponds. Bridge controls are in 设施 → 拓展. Existing saves migrate to v5 without resetting resources, creatures or facilities.

Motion now includes traveled-distance walking, retained direction, ground-level apple bites, moving sponge/bubbles, turning ball-play hops with a stationary shadow, crying crouches and visible mitosis separation. These are original reconstructions from inspected official gameplay footage, not extracted source sprites. The map combines observed regions in one saved world; exact original perimeter and multi-act story are not claimed. Run `node tests/map-animation.cjs` for new navigation, animation and migration regressions. See the fidelity notes for sources and omissions.

## Measured animation pass

New games now begin with the observed falling egg, rim/star flash, three-frame crack wobble, emergence and stepped hop; existing saves do not replay it. Feeding mouth/apple transitions, the 40-sample sponge path, play anticipation jump and front/back/root displacement are calibrated against the official 30fps Apple preview. `docs/animation-reference.json` records measured frames, normalized dimensions, confidence and missing evidence. These are rebuilt graphics aligned to the observed clip, not original sprite assets or a pixel-exact copy. Run `node tests/hatch-animation.cjs` for intro persistence, old saves, pauses, scrub cadence and landing regressions.

## Original expression sprites

Six supplied artist animation families now play from exact indexed source pixels and their original variable frame durations: explanation, nod, skeptical reaction, conversation, thought and singing. Click a creature → 动作与表情 to play them; performance A–E selects the available conversation/singing variants. Native source frames receive no invented overlays. Care, walking, hatching and splitting use separately labeled, original-style authored completions because their original clips were not in the bundle. See `docs/sprite-sources.json` for attribution and provenance, and run `node tests/sprites.cjs` for pixel/timing verification.

`dist/sprites.js` contains the complete compiled frame data. `scripts/compile-sprites.py` can regenerate it from the supplied bundle's extracted PNG/JSON files using Pillow; it never executes bundle code.

## Original-style motion completions

The supplied 44-pixel canvas, character palette and proportions now provide a common foundation for eight-way walking/standing, eating, washing, playing, sleep, negative need states, emergence, mitosis and prone remains. These are articulated frame sequences with independent ear, eye, mouth, arm and foot changes; they are authored completions, not recovered official frames. The immutable supplied six families are still in `dist/sprites.js`; completions live separately in `dist/authored-sprites.js`.

Open a creature → 动作与表情 → 动作图鉴 to preview either set, pause, scrub and step through frames without changing colony resources or progress. Source clips are labeled 原始素材; completions are labeled 同风格补绘. Original measured hatch/play root trajectories and care costs remain in place.

Run `node tests/authored-animation.cjs` alongside the other suites. It checks frame bounds/palette indices/timing, heading selection, action entry/exit/interruption, pause, saved active actions and viewer isolation. `python3 scripts/build-authored-sprites.py --source dist/sprites.js --output /tmp/thronglet-assets` regenerates the authored pack and review sheets from the compiled supplied source pack (requires Pillow).

## Direct manipulation and toolbar update

The entire upper-left toolbar now uses locally bundled official Lucide 1.52.0 SVGs with Chinese action labels, a consistent 24 px grid and 2 px strokes. See `docs/icon-provenance.json` for pinned sources, checksums and exact mappings; the unmodified upstream ISC license, including the Feather-derived MIT notice, is shipped at `dist/icons/lucide/LICENSE` and linked in Help. The toolbar is now 2×5; the crest opens the menu using an actual menu icon. Pause changes to a real play icon when paused.

- Observe: tap the creature to inspect; drag its body beyond 8 screen pixels to pick up. The creature remains frozen at its origin until released onto unoccupied, accessible grass. A green/red landing tile previews validity. Water, locked shores, occupied land, releasing outside the canvas, Escape, tool changes, pause, focus loss and lost pointer capture safely cancel. The state is saved after a valid drop. Original supplied animation data is unchanged.
- Pan: drag empty land under normal tools, or select the dedicated move tool (8) to drag anywhere without picking up a creature. Desktop and touch share one captured pointer; secondary pointers cannot steal or commit a gesture. Touch scrolling is suppressed only on the game/map canvases.
- Throw (7): deliberately select the warm-colored stone tool, then tap a creature or scene object. One stone costs one ore; harvesting a gray rock gives three ore, available immediately. The no-ammunition message explains this directly. A 0.55 s cooldown, delayed arcing projectile, dust, impact feedback and target hit checks prevent rapid accidental actions. Dragging the map never throws.
- Creature impacts reduce health by up to 18 (the impact never reduces health below 10 or heals an already weaker creature), happiness by 22 and energy by 8; they stun briefly and can be cared for normally. Moving or carried creatures can evade. No gore is rendered.
- Trees/rocks lose three resource units and regrow normally without yielding harvested resources. Structures have four impact points, with a visible damage bar and crack; the fourth hit removes the structure without refund, including its capacity/production effects. Destruction and partial damage persist in existing v6 saves. This is a bounded adaptation, not a claim of original-game mechanical fidelity.

Run all checks with `for f in tests/*.cjs; do node "$f" || exit 1; done` plus `node --check dist/game.js`. `tests/interactions.cjs` covers input interruption, pointer identity, tap/drag distinction, zoom-coordinate fidelity, persistence, resource-priced delayed hits, destruction and regrowth; `tests/icons.cjs` checks source SVGs and all toolbar actions. Headless/offscreen Canvas visual review is available. Full browser UI and physical touch-device QA remains unverified where supported browser control is unavailable.

## Construction availability

Building buttons share the placement engine's availability rules: historical population/gem unlocks, the resonance tower's current 16-living-creature requirement, and exact wood/gem costs. Locked buttons use dashed muted styling and explain their requirement; unlocked but unaffordable buttons use amber styling and name the missing resource amounts. Both remain keyboard-focusable and clickable for feedback (`aria-disabled`, never native `disabled`), without changing the current tool, valid pending placement, or panel. Only affordable unlocked selections enter placement. Availability is rechecked before map actions and each UI refresh; an invalidated preview is cancelled with feedback. Costs are deducted only once after valid terrain/occupancy checks. Existing v6 saves are unchanged.

`node tests/construction.cjs` covers those states and transitions, repeated selection/placement, direct API entry, keyboard cancellation, resource races with splitting, bridge-spend invalidation, historical unlocks, mine terrain, pause and save continuity. The DOM test harness now observes actual generated building button state; browser layout/touch testing remains subject to the existing static-preview limitation.
