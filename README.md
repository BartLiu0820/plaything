# Plaything · 小小群落

A standalone browser recreation inspired by Black Mirror: Thronglets. An unofficial tribute, not the complete official game. All graphics use original procedural Canvas pixel rendering. Behavior is rule-based simulation; there is no conscious AI, external model API, backend, or paid dependency.

## Run

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. No dependencies or build required. Progress is browser-local, auto-saved every eight seconds and on page exit; it does not advance while closed. Sound starts off.

## Game loop

Feed, clean, and play with yellow creatures. Gather renewable wood and ore, process ore into gems, reproduce, and build orchards, baths, playgrounds, nests, mines, and resonance towers. Creatures seek facilities autonomously and reproduce when healthy. Food shortages and storms challenge the colony. Reach 16 creatures and build a resonance tower to complete progression, then keep growing.

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
