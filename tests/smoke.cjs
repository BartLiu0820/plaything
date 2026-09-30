const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');
let createCanvas;
try { ({ createCanvas } = require('@napi-rs/canvas')); const {GlobalFonts}=require('@napi-rs/canvas'); if(fs.existsSync('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'))GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','Noto Sans CJK SC'); } catch {}
const source = fs.readFileSync(path.join(__dirname, '../dist/game.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(x => x[1]));
function harness(saved, width = 1120, height = 800) {
  let events = {}, frame, seed = 1731;
  const storage = { value: saved, getItem() { return this.value; }, setItem(k, v) { this.value = v; } };
  const noop = () => {};
  const fakeContext = new Proxy({}, { get: () => noop, set: () => true });
  const elements = new Map();
  function el(id) {
    assert(ids.has(id), `Missing HTML id ${id}`);
    if (elements.has(id)) return elements.get(id);
    const cv = createCanvas && ['game', 'portrait'].includes(id) ? createCanvas(id === 'game' ? width : 120, id === 'game' ? height : 100) : null;
    const classes = new Set();
    const o = { id, style: {}, dataset: {}, classList: { add: x => classes.add(x), remove: x => classes.delete(x), toggle: (x, flag) => flag ? classes.add(x) : classes.delete(x) },
      addEventListener(n, f) { (events[id] ??= {})[n] = f; }, setAttribute: noop,
      getBoundingClientRect: () => ({ width, height, left: 0, top: 0 }),
      getContext: () => cv ? cv.getContext('2d') : fakeContext, setPointerCapture: noop,
      showModal() { this.open = true; }, close() { this.open = false; }, click() { this.onclick?.(); },
      get width() { return cv?.width; }, set width(v) { if (cv) cv.width = v; },
      get height() { return cv?.height; }, set height(v) { if (cv) cv.height = v; }, canvas: cv,
    };
    elements.set(id, o); return o;
  }
  const document = { getElementById: el, querySelector: () => [...elements.values()].find(e => e.open) || null, querySelectorAll: () => [], addEventListener(n, f) { events[n] = f; }, hidden: false };
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const context = { document, window: { addEventListener: noop }, localStorage: storage, ResizeObserver: class { observe() {} }, requestAnimationFrame: f => frame = f, clearTimeout: noop, setTimeout: noop, console, Math: deterministicMath, Set };
  vm.createContext(context); vm.runInContext(source, context);
  return { api: context.window.Thronglets, el, events, storage, frame: t => frame(t) };
}
function seedCreature(changes = {}, world = {}) {
  const base = harness().api.getState();
  Object.assign(base, world);
  Object.assign(base.creatures[0], { age: 50, food: 80, clean: 80, happy: 75, health: 100, energy: 85, wait: 10 }, changes);
  return base;
}
function run() {
  const h = harness(), g = h.api;
  assert.equal(g.getState().creatures.length, 1);
  g.selectTool('feed'); g.actAt(10.2, 11);
  assert.equal(g.getState().food, 28); assert(g.getState().creatures[0].food > 95);
  assert.equal(g.stateOf(1).key, 'eating'); assert(!g.split(), 'busy creature cannot divide');
  g.advance(2.5); g.selectTool('play'); g.actAt(g.getState().creatures[0].x, g.getState().creatures[0].y);
  assert.equal(g.stateOf(1).key, 'playing'); g.advance(3); assert(g.split());
  assert.equal(g.getState().creatures.length, 2); assert.equal(g.stateOf(1).key, 'splitting'); assert(!g.split());
  let a = g.getState(); let tree = a.objects.find(o => o.type === 'tree'), rock = a.objects.find(o => o.type === 'rock');
  g.selectTool('harvest'); g.actAt(tree.x, tree.y); assert.equal(g.getState().wood, a.wood + 3); assert.equal(g.getState().food, a.food + 1);
  g.actAt(rock.x, rock.y); assert.equal(g.getState().gems, a.gems + 2);
  function build(h, type, x, y) { h.el('buildings').onclick({ target: { closest: () => ({ dataset: { build: type } }) } }); h.api.actAt(x, y); }
  build(h, 'orchard', 9, 10); assert.equal(g.getState().buildings.length, 0, 'apple tree locked below historical 10');
  build(h, 'nest', 9, 10); assert.equal(g.getState().buildings.length, 1); a = g.getState();
  build(h, 'nest', 9, 10); assert.equal(g.getState().wood, a.wood, 'occupied placement does not spend');
  build(h, 'tower', 8, 10); assert.equal(g.getState().buildings.length, 1);
  h.el('pause').click(); assert(g.paused); a = g.getState(); g.care(1, 'play'); assert.equal(g.getState().creatures[0].happy, a.creatures[0].happy);
  g.selectTool('inspect'); g.actAt(a.creatures[1].x, a.creatures[1].y); h.el('pause').click(); assert(!g.paused);
  for (const speed of [2, 4, 1]) { h.el('speed').click(); assert.equal(g.speed, speed); }
  h.el('confirm-reset').click(); assert.equal(g.getState().creatures.length, 1); assert(h.storage.value); assert.equal(harness(h.storage.value).api.getState().creatures.length, 1);
  // Existing v1 saves migrate without resetting progress or existing buildings.
  let legacy = seedCreature({}, { version: 1, wood: 81 }); delete legacy.creatures[0].energy;
  legacy.buildings.push({ type: 'orchard', x: 9, y: 10, t: 0 });
  const migrated = harness(JSON.stringify(legacy)); assert.equal(migrated.api.getState().version, 2); assert.equal(migrated.api.getState().wood, 81); assert.equal(migrated.api.getState().creatures[0].energy, 90); assert(migrated.api.getState().maxPopulation >= 10);
  const empty = seedCreature(); empty.creatures = []; const extinct = harness(JSON.stringify(empty)); assert.equal(extinct.api.getState().creatures.length, 0); assert(extinct.api.paused);
  // States are distinct, and care directly targets exactly one creature.
  const states = [['neutral', {}], ['happy', { happy: 96 }], ['hungry', { food: 32 }], ['starving', { food: 9 }], ['dirty', { clean: 31 }], ['filthy', { clean: 9 }], ['sad', { happy: 12 }], ['bored', { happy: 41 }], ['tired', { energy: 12 }], ['sick', { health: 21 }]];
  for (const [expected, changes] of states) { const check = harness(JSON.stringify(seedCreature(changes))); assert.equal(check.api.stateOf(1).key, expected); check.frame(1000); }
  const dirty = seedCreature({ clean: 12 }); dirty.creatures.push({ ...dirty.creatures[0], id: 2, x: 10.55, y: 11.2 });
  const wash = harness(JSON.stringify(dirty)); wash.api.care(1, 'wash'); assert.equal(wash.api.getState().creatures[1].clean, 12); assert.equal(wash.api.stateOf(1).key, 'washing'); assert.equal(wash.api.getState().creatures[0].clean, 37);
  const scrub = harness(JSON.stringify(seedCreature({ clean: 5 })));
  scrub.api.selectTool('wash'); const point = scrub.api.worldPoint(10.2, 11); const pointer = { pointerId: 1, clientX: point.x, clientY: point.y - 22 };
  scrub.events.game.pointerdown(pointer); scrub.api.advance(2); scrub.events.game.pointerup(pointer); assert(scrub.api.getState().creatures[0].clean > 85, 'hold-to-scrub clears accumulating dirt');
  const sleepy = harness(JSON.stringify(seedCreature({ energy: 12 }))); sleepy.api.advance(.2); assert.equal(sleepy.api.stateOf(1).key, 'sleeping'); sleepy.api.advance(8); assert(sleepy.api.getState().creatures[0].energy > 45);
  const full = harness(JSON.stringify(seedCreature({ food: 100 }))); a = full.api.getState(); full.api.care(1, 'feed'); assert.equal(full.api.getState().food, a.food, 'no food charged for full creature');
  const detour = seedCreature({x:16,y:10,tx:16,ty:10,food:25,wait:0}, {maxPopulation:10,food:100});
  detour.buildings=[{type:'orchard',x:16,y:2,t:0}];const routed=harness(JSON.stringify(detour));routed.api.advance(70);assert(routed.api.getState().creatures[0].food>40,'routes around pond to food rather than getting stuck');
  // Six hundred simulated seconds exercise facility seeking, state completion, and reproduction.
  const seeded = seedCreature({ food: 100, clean: 100, happy: 100 }, { food: 700, wood: 500, gems: 500, maxPopulation: 16 });
  seeded.buildings = [{ type: 'orchard', x: 9, y: 10, t: 0 }, { type: 'bath', x: 10, y: 10, t: 0 }, { type: 'play', x: 11, y: 10, t: 0 }, { type: 'nest', x: 12, y: 11, t: 0 }, { type: 'nest', x: 12, y: 12, t: 0 }, { type: 'mine', x: 13, y: 12, t: 0 }];
  const stress = harness(JSON.stringify(seeded)); stress.api.advance(600); const st = stress.api.getState();
  assert(st.creatures.length > 1, 'natural reproduction'); assert(st.creatures.every(c => Number.isFinite(c.x) && c.health > 0)); assert(st.gems > 450); assert(st.creatures.length <= 24);
  stress.frame(1000);
  if (createCanvas && process.env.GAME_SCREENSHOT) fs.writeFileSync(process.env.GAME_SCREENSHOT, stress.el('game').canvas.toBuffer('image/png'));
  if (createCanvas && process.env.STATE_SCREENSHOT) {
    const cards = [...states, ...['eating', 'washing', 'playing', 'sleeping', 'splitting', 'newborn'].map(behavior => [behavior, { behavior, actionTime: 3, actionTotal: 3, ...(behavior === 'washing' ? { clean: 20 } : {}) }])];
    const cv = createCanvas(800, 480), cx = cv.getContext('2d'); cx.fillStyle = '#e5e0c7'; cx.fillRect(0, 0, 800, 480);
    cards.forEach(([name, changes], i) => { const sample = harness(JSON.stringify(seedCreature(changes))); sample.frame(1000); const x = i % 8 * 100, y = Math.floor(i / 8) * 240; cx.drawImage(sample.el('portrait').canvas, x, y + 40, 100, 100); cx.fillStyle = '#26382d'; cx.font = '12px monospace'; cx.fillText(name, x + 7, y + 170); });
    fs.writeFileSync(process.env.STATE_SCREENSHOT, cv.toBuffer('image/png'));
  }
  console.log('PASS: care actions, busy/repeated split, exact harvesting, building locks/costs, pause/speed/reset, v1 migration, extinct save, 10 need states, targeted care, hold scrub, rest recovery, no full-feed charge, 600s automatic care/reproduction');
  console.log('Stress population:', st.creatures.length, 'Stable source IDs:', ids.size);
}
if (require.main === module) run();
module.exports = { harness, seedCreature };
