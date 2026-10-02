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

## Mobile-reference map and motion pass · 2026-10-01

The user explicitly permits the released game as the reference for the complete map and action frames while keeping the episode's HUD/art direction primary. Inspected actual frames from Netflix's official App Store preview (1920×886, 30 fps), official game stills, and a licensed Act 2 press screenshot. These provide more evidence than descriptions alone.

### Observed and incorporated

- A broad stepped plateau contains angular internal blue ponds, clustered trees, rocks and chopped stumps. Exhausted trees now leave visible stumps until regrowth.
- Act 1's bridge reaches a small platform holding a rotating, patterned glitch cube. Added a distinct northern platform and care-prioritized wooden bridge construction. The cube is an animated visual landmark; no unobserved activation prompt or story transition is invented.
- Act 2 depicts a substantially larger populated landmass divided by a wide diagonal river, with a central crossing, ponds, mines and industrial buildings. Expanded the existing industrial territory, added internal water and its crossing, and increased mineral-node sites. Inspected public gameplay also shows a mine island between the town and northern forest/pond terrain, connected by two bridges. Added that traversable three-region relationship; the two interior crossings open with the existing industrial-shore bridge as a convenience adaptation. Existing ore-shore access and buildings survive.
- Added an optional whole-map navigator inside the T menu. It shows creatures, structures, nodes and camera center; tapping any region moves the camera. It does not replace the episode toolbar.
- Official motion shows ground-level apple bites, squinting/chewing, a sponge traversing the body amid blue-white bubbles, vertical ball-play hops with a ground-fixed shadow, and front/back turns. Actions now use their own frame timelines: six-frame walk/eat/scrub, eight-frame play; walk timing follows actual traveled distance. Persistent eight-way facing includes front, back, profiles and angled looks. Sad poses lower the body and show blue tears.
- Mitosis now visibly stretches the parent and separates/scales in the newborn. Newborn placement and far-shore wandering no longer clamp creatures back to the original home area.

### Reconstruction boundaries

This is a coherent, explorable composite map, not a traced complete official world. The inspected images do not expose every perimeter tile or all island relationships. Exact coordinates, distances, bridge costs, terrain dimensions and the convenient shared-world connection between Act 1/Act 2 regions are authored here. The official game has a multi-act transition; this version preserves one continuous saved colony. Both wooden and bone bridges exist in the source game; only wood is implemented here. The cube's source platform is seen with a bone bridge in the trailer; our wood route is an explicit adaptation.

The original artist's exact sprite sheets were not available. All sprites and frames remain original Canvas reconstructions. The accessible trailer did not show the mitosis transition, so its squash/stretch timing is interpretive. A falling egg/hatching sequence was observed but is not yet implemented. The full mountain/TNT sequence, bone harvesting/bridges, all advanced facilities, complete dialogue and original audio also remain absent. No claim of pixel/temporal 1:1 fidelity is made.

Sources:
- Official Apple page and preview: https://apps.apple.com/us/app/black-mirror-thronglets/id6529524046
- Official bridge/world still: https://www.netflix.com/tudum/articles/black-mirror-thronglets-mobile-game-guide
- Official mechanics, including both acts: https://games-netflix.helpshift.com/hc/en/32-black-mirror-thronglets/
- Actual Act 2 island-junction footage: https://www.reddit.com/r/Thronglets/comments/1k6axo7/ok_im_getting_anxiety/
- Netflix game press assets / studio: https://nightschoolstudio.com/project/black-mirror-thronglets/

### Validation

`node --check dist/game.js`, `node tests/smoke.cjs`, and `node tests/map-animation.cjs` pass. Added coverage for north-bridge cost/repeated clicks/construction/path, river detours via crossing, v4→v5 migration preserving resources/buildings, no duplicate resource seeding, remote newborn/wandering coordinates, map open/close/navigation, traveled-distance walk timing, action-local frames and distinct facing renders. Compared offscreen eight-row animation sheet, far territory, cube platform, initial portrait/mobile-sized Canvas and whole-map renders against inspected reference frames. These captures test the Canvas renderer, not browser DOM layout. Chromium still fails before launch with `socket() failed: Operation not permitted`, including an approved escalation; full browser/touch UI QA remains unverified.


## Frame-measured animation pass · 2026-10-01

The user explicitly requested animation 1:1. This pass measures the continuous official Apple preview instead of assigning generic sine-wave motion. It does **not** establish pixel-exact original sprites. Source video is 1920×886, 30 fps, 897 decoded frames (29.9s); frame n means relative time n/30. The container's PTS offset is excluded. Measurements and confidence are committed in `animation-reference.json`.

Implemented and compared side by side with exact source frames:

- **Hatch, frames 33–80:** falling egg; grounded at41; rim glow45; large star47; crack57–59 (upright / tilted / upright); emergence60–65; stepped hop66–79; grounded80. Egg dimensions normalized to approximately .90H×1.327H. Hop translation follows measured shadow positions, approximately +2.13H horizontally/−.88H vertically, with held lift samples. The final landing persists, and lower shell/shards remain temporarily. Old saves skip this intro; an interrupted new-game intro resumes.
- **Eating, frames254–285:** two mouth states with observed 4/10/10/8 video-frame holds; apple whole→large bite at+9frames→remnant at+24frames. Corrected earlier interpretation: the body remains upright. The apparent crouch was caused by a cropped reference. The preceding apple fall/anticipation hop is separated by a shot relocation; no invented continuous approach is claimed.
- **Wash, frames286–325:** 40 measured sponge centers, diagonal sponge proportions, independent blue/white/lilac bubbles. Body remains upright. Holding scrub no longer resets the visual clock every .18s. The recorded path repeats for longer user input; that loop extension is an adaptation, not a proven source loop.
- **Play, frames326–394:** ball drop; .10s low hop and .10s high hop; front approach; six-frame back-facing hold; front return. Root trajectory uses measured shadow anchors, ending at +1.136H/+0.328H. Valid landings commit without snapping back. At terrain boundaries, motion remains local to keep the creature on walkable ground.
- **Silhouette:** adjusted ear span/drop, face size, eye/pupil boxes and blue-band height to normalized measurements from frame240. The native pixel grid is not recoverable reliably from scaled/compressed video.
- **Prone pose:** existing deaths now display the observed side-lying yellow/blue silhouette with an X eye. Retention time is a local presentation choice.

### Exactness and remaining evidence by animation

- Hatch: visible phase order/timestamps and root samples available; peak head is partly occluded, no original sprite atlas, palette or native frame grid.
- Eating: visible mouth/apple changes available; final apple disappearance and return to idle are cut away; exact original cycle ending is unknown.
- Washing: approximate centers carry ±8–12 source-pixel uncertainty due to bubbles; exact bubble sprites and the unedited reusable loop are unavailable.
- Play: visible jump, back turn and root positions available; ball trajectory after the selected segment, full turnaround angles and the original walk-cycle frame set are incomplete.
- Mitosis, full eight-direction walking, singing/talking and every negative-state transition: no complete clean sequence in this clip. Existing handmade implementations remain explicitly interpretive.

True pixel/frame-identical coverage would require original sprite sheets (or lossless unoccluded frame sequences) plus full unedited recordings for those missing states. Further arbitrary procedural redraws cannot establish that claim. No bone/TNT/gameplay expansion was added in this animation pass.

Validation: all three suites pass (`smoke.cjs`, `map-animation.cjs`, `hatch-animation.cjs`) plus JavaScript syntax. New coverage includes intro gating, no need decay during hatch, pause, mid-intro reload, versions1–5 without replay/resource loss, persistent hop landing/shell expiry, continuous scrub clock, death-state persistence, measured play root/valid terrain and distinct hatch render phases. Inspected side-by-side source/reconstruction contact sheets and action renders. Full browser DOM/touch QA remains blocked by Chromium process socket restrictions, as previously recorded.

## Supplied original GIF bundle · 2026-10-02

The supplied artist-export bundle resolves the previous source-pixel gap for six expression families: explanation, happy nod, skeptical reaction, peer conversation, thought and singing. All 12 GIFs and 135 decoded PNG frames were independently checked against metadata: pixels, GIF hashes, frame order, variable durations, start times and loop flags match. These are source animations supplied for this project, not procedural approximations.

The game now uses lossless indexed pixel data for these clips. Every source cell is exactly 10×10 pixels; no palette reduction, interpolation, recoloring or new in-between frames is used. Only the flat presentation backgrounds (#565656/#7ca4a4) and separate bottom-left letter labels are excluded. Singing's simultaneous three-quarter and front renderings are separated at the canvas midpoint (not the offset background seam). Canvas padding and each clip's fixed foot anchor preserve the authored displacement. Playback keeps every original hold, including 1-second pauses and repeated frames. Deduplication changes storage only.

Neutral forward idle uses the exact source neutral pose; happy idle uses the original nod. Original thought/conversation occur during healthy quiet periods; existing collective singing now uses supplied A–E variants. The optional “动作与表情” controls in the individual card make all six families available, with A–E performance selection (conversation has A/C/D and falls back to A for B/E). Trigger rules are local gameplay choices; the displayed source frames and their sequence timing are unchanged. The native-rendering path applies no invented blink, sway, grime, shadow or other overlays to those frames. Need labels remain outside the sprite.

This does **not** make uncovered care actions exact. The package does not contain original walking, feeding, washing, ball play, sleeping, hatching, mitosis, rear/side directional cycles or every negative-state transition. Those retain the documented reconstruction until matching source frames are provided. The singing right panel is front-facing and left panel three-quarter-facing; neither is a rear view. Original audio is not in the GIFs.

Attribution: Kevin Jean-Philippe, https://kjp.artstation.com/projects/lG8LDk ; portfolio caption credits front singing animation to Alex Chavez. Source is marked all rights reserved; no broader license is asserted. `sprite-sources.json` records the source GIF links/hashes and scope. The game still uses episode-inspired UI and a composite map.

Validation adds exact RGBA hashes before scaling for every compiled source-panel frame; original variable timing and loop boundaries; native action duration/variant/pause/interruption; and a pixel-equality assertion proving the native path adds no overlays. Existing simulation, save migration and map/hatch suites remain in place. Reviewed all source variants, original singing panels, and native in-scene renders. Browser DOM/touch verification remains limited as previously disclosed.
