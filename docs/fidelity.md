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
- Bone/sacrifice bridge alternatives, advanced mining tiers/super-node values, mountain rubble/TNT, full story dialogs, videos, original sound/music, and all endings are not implemented
- No artificial consciousness: all behavior and dialogue are locally programmed

## Primary sources

- Official overview and gameplay/title stills: https://www.netflix.com/tudum/articles/black-mirror-thronglets-mobile-game-news
- Official guide: https://www.netflix.com/tudum/articles/black-mirror-thronglets-mobile-game-guide
- Needs and mitosis: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1036-how-do-thronglets-multiply/
- Bath: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1041-what-is-the-bathtub-for/?p=all
- Apple tree: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1044-what-is-an-apple-tree-for/?p=all
- Roundabout: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1045-what-is-the-roundabout-for/?p=ios

## Verification

`node --check dist/game.js` and `node tests/smoke.cjs` pass. The deterministic harness checks 69 HTML element bindings, care and busy action transitions, exact harvest targeting, unlock/resource/occupied placement rules, pause/speed/reset, old-save migration, extinct save persistence, ten need states, targeted care, hold cleaning, resting recovery, no food charge when full, and 600 simulated seconds of automatic care/reproduction (population reached 24 without non-finite coordinates or death).

The renderer generated a 16-state portrait comparison and a populated-world image for visual review. This is offscreen Canvas verification, not a claim of full browser end-to-end testing. The environment blocks browser process sockets and file navigation, so native mobile touch and full browser DOM layout remain unverified here.


## Bridge / industry pass

Implemented a separate far shore with two new ore nodes, a fixed wooden bridge site, and care-prioritized autonomous bridge construction after the player deposits wood. No land-buying mechanic is used. Mining sites now must occupy glowing nodes. Rocks produce ore; the player can process ore manually into gems to avoid getting locked out before a factory unlocks. Existing mines in older saves are retained.

Implemented the documented mine unlock at 50 gems, factory unlock at 300, and Factory Mark II unlock at 5,000. Here these milestones use the highest gem balance reached. Factories consume ore, produce gems, and leave purple pollution on adjacent ground/buildings. Nearby creatures visibly accumulate exposure, lose cleanliness and health, and can die if neglected. The radius mop unlocks upon pollution and cleans ground, facilities and nearby creatures. Factories can be paused/resumed and upgraded; Mark II has higher throughput and pollution. Post-resonance objectives now continue into this loop.

All map geometry, wood deposit amount (60), building/upgrade purchase prices, processing ratios/timers, pollution radius/emission/damage/recovery formula, and local manual-processing fallback are adaptation choices. Official sources establish the mechanisms and unlock milestones, not those numeric values. Mines produce ore automatically here rather than simulating individual miners carrying each item. Early camera controls remain available as an accessibility/convenience deviation from the original population-4 camera unlock. This is not an exact scene-by-scene recreation.

Additional primary sources:
- Bridge construction: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1035-how-do-i-build-bridges/
- Mines and node constraints: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1050-what-does-a-mine-do/
- Factory unlocks and ore processing: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1053-what-does-the-factory-do/
- Radius mop: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1055-what-does-the-mop-do/
- Pollution removal: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/faq/1105-how-do-i-remove-clean-up-the-pollution/

Additional tests pass for bridge spending/repeated clicks/construction completion, inaccessible far-shore construction, ore conversion and insufficient resources, mine-node constraints, factory throughput/pollution/illness, stopping factory production, mop cleanup, Mark II gating and upgrade costs, and visible purple-ground rendering. Fixed two issues found by testing: the original bridge entry was accidentally inside water, and the first pollution render pass was incorrectly nested under resonance-tower rendering. Rendered and inspected the corrected bridge and pollution scenes. Full browser/touch limitation remains as described above.


## Episode-first visual pass

The user clarified that the on-screen game in the episode is the visual target, rather than the released mobile game. The default composition now follows the inspected episode screen: full-screen environment, a compact left two-column/four-row toolbar under a circular gold-rimmed T crest, and a gold/olive population medallion at the top-right. The always-visible mobile-style objective strip, bottom care dock and permanent side dashboard were removed from the default screen. Existing care controls open in a compact optional panel; previously implemented mobile-derived construction/industrial systems and objectives remain in an explicitly labeled optional expansion panel, preserving saves and functionality without asserting that these appear in the episode.

Scene changes grounded in the inspected frame: a predominantly green, broad diamond-patch landscape; a left-side angular blue river; taller rounded foliage and grey-blue angular rock clusters; smaller yellow/blue creatures relative to trees; and distinct back-facing sprites with no eyes. The visible frame supports those features but does not provide the complete map geometry. Our terrain remains an interpretation. Creature/resource positions affected by the river refinement migrate to nearby valid ground; existing built structures keep valid ground underneath them.

An independent second episode still shows open-mouth singing poses. A production interview with sound designer Tom Jenkins says the animations were created around a melody and that the voice evolves toward a choir at varied speeds/intervals. Implemented occasional open-mouth group-response behavior and optional quiet synthesized square-wave tones, instead of presenting an exact unobserved recording or melody. Sound is off by default. Frame timing, tune and tool semantics are still original choices. Only the active hand tool is clearly identifiable in the reference toolbar; other icons are too blurred to assign canonical labels reliably.

Episode references inspected:
- Genuine Netflix episode still and narrative: https://www.netflix.com/tudum/articles/black-mirror-plaything-ending-explained
- Full episode screen reproduced in editorial coverage: https://cdn.thetab.com/wp-content/uploads/2025/04/22160658/VS-Netflix-BlackMirrorPlaything-2206.jpg
- Second episode screen / group open-mouth poses: https://tvobsessive.com/wp-content/smush-webp/2025/04/black-mirror-plaything-throng-700x461.jpg.webp
- First-person production interview: https://www.asoundeffect.com/black-mirror-season-7-sound/

Added tests verify the eight-cell toolbar and menu/status/build panel open/close behavior. All prior simulation, saves, bridge and pollution tests continue to pass. Compared a populated-world render and an initial-world render against the episode-screen composition. Canvas rendering does not verify HTML layout in a browser; that previously documented limitation remains. Exact episode HUD pixel metrics, all tool meanings, full landscape, dialogue triggers and sprite frame timing still require clearer continuous reference footage.
