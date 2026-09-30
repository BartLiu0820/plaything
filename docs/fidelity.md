# Fidelity notes · 2026-09-30

This project is an unofficial recreation of a bounded game loop inspired by Black Mirror: Plaything / Thronglets. It is not an exact copy of all episode scenes or the released Netflix game. Research in this pass used official game screenshots and documentation, not inferred unseen episode details.

## Verified reference details implemented

- Official gameplay silhouette: gold/yellow head, two large white eyes, dark pupils, crown tuft, floppy side ears with warm inner color, cyan/blue clothing, tiny yellow feet. Replaced the first version's plain yellow body.
- Individual care follows the three documented needs: Fed, Amused, Clean. Click an individual to inspect and care for it.
- Apple, multicolored toy ball, sponge, bubbles, and bath motifs match visible official gameplay props.
- Well-cared-for creatures divide into two via mitosis. They do not require pairing.
- Bath, apple tree and roundabout unlocks follow documented populations of 6, 10 and 15. Existing structures remain usable when upgrading a previous local save; reached population is remembered.
- Bath service is single-occupancy. Apple trees produce food; hungry creatures seek them. Multiple creatures can use entertainment facilities.

## New implementation in this pass

- Separate neutral, happy, hungry, starving, dirty, filthy, bored, sad, tired and weak states, with state-specific poses/eyes/mouths, plus eating, washing, playing, sleeping, splitting and newborn actions
- Blinking, ear movement, stepping, chewing a red apple, bouncing a beach ball, sleeping, birth sparkles and selected-creature need bars
- Progressive dirt layers and flies at very low cleanliness; a visible sponge, foam, water particles and hold-to-scrub input
- Precise individual care: clicking a sprite or using its card affects only that creature, with explicit costs and no charge for a full creature
- Individual previous/next/focus controls, warning badges and one-click focus on the most urgent creature
- Need-prioritized autonomous facility seeking, action durations, fatigue/rest, illness/recovery, and save migration from v1
- Pausing also freezes creature/particle animation. A dead colony remains dead after reload rather than silently restarting

## Interpretive or incomplete, not verified as exact

- Facial animation frames and emotion-to-pose mapping are original interpretations, not traced original sprite animations
- Hunger/cleanliness/fun thresholds, decay rates, costs, splitting timer, energy and resting behavior are local balancing choices
- This version delivers food at the apple tree rather than spawning independently collectible dropped apples
- Original factories, purple pollution, advanced upgrades, broader map/bridge expansion, sacrifices, full story dialogs, videos, sound/music, and all endings are not implemented
- No artificial consciousness: all behavior and dialogue are locally programmed

## Primary sources

- Official overview and gameplay/title stills: https://www.netflix.com/tudum/articles/black-mirror-thronglets-mobile-game-news
- Official guide: https://www.netflix.com/tudum/articles/black-mirror-thronglets-mobile-game-guide
- Needs and mitosis: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1036-how-do-thronglets-multiply/
- Bath: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1041-what-is-the-bathtub-for/?p=all
- Apple tree: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1044-what-is-an-apple-tree-for/?p=all
- Roundabout: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1045-what-is-the-roundabout-for/?p=ios

## Verification

`node --check dist/game.js` and `node tests/smoke.cjs` pass. The deterministic harness checks 47 HTML element bindings, care and busy action transitions, exact harvest targeting, unlock/resource/occupied placement rules, pause/speed/reset, old-save migration, extinct save persistence, ten need states, targeted care, hold cleaning, resting recovery, no food charge when full, and 600 simulated seconds of automatic care/reproduction (population reached 24 without non-finite coordinates or death).

The renderer generated a 16-state portrait comparison and a populated-world image for visual review. This is offscreen Canvas verification, not a claim of full browser end-to-end testing. The environment blocks browser process sockets and file navigation, so native mobile touch and full browser DOM layout remain unverified here.
