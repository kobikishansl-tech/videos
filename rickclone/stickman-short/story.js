/* story.js: "The City That Dance-Cursed Itself" (the Dancing Plague of 1518), 62.87 s. The 28 views of PLAN.md as
 * data (views.js, written by tools/views.py), the camera (RT.CAMERAS), who stands where and does what in each view
 * (STAGING), faces on cues, mouths, the day light on the road, the stages up and down, the words.
 *
 *   RT.story(stage, sets, wordsLayer)   sets = { road, field, hall, church } (set objects already added with stage.addSet).
 *                                       Builds the cast, the camera, the words and hooks everything on the stage.
 *                                       Returns { cam, cast, views, keys, counts }.
 *
 * Everything is a pure function of t. Nothing keeps state between frames.
 */
window.RT = window.RT || {};
RT.FPS = 30;
RT.DURATION = RT.DURATION || 62.87;
RT.CAMERAS = {
  1:  { a: { pos: ["dance", [1.05, 1.4, 2.4]], look: ["dance", [0, 1.12, 0]], fov: 40 },
        b: { pos: ["dance", [0.85, 1.3, 2.3]], look: ["dance", [0, 1.17, 0]] } },
  2:  { a: { pos: ["dance", [0.75, 0.95, 2.6]], look: ["dance", [0, 0.9, 0]], fov: 40 },
        b: { pos: ["dance", [0.62, 0.9, 2.3]], look: ["dance", [0, 0.9, 0]] } },
  3:  { a: { pos: ["dance", [0.38, 1.74, 1.75]], look: ["dance", [0, 1.6, 0]], fov: 34 },
        b: { pos: ["dance", [0.3, 1.7, 1.5]], look: ["dance", [0, 1.58, 0]] } },
  4:  { a: { pos: ["start", [-2.2, 3.2, 8.5]], look: ["dance", [0, 1.0, 0]], fov: 48 },
        b: { pos: ["start", [-1.9, 3.05, 7.9]], look: ["dance", [0, 1.0, 0]] } },
  5:  { a: { pos: ["dance", [0.4, 1.6, 4.6]], look: ["dance", [0, 1.15, 0]], fov: 40 },
        b: { pos: ["dance", [0.3, 1.55, 4.2]], look: ["dance", [0, 1.15, 0]] } },
  6:  { a: { pos: ["dance", [-0.2, 1.5, 3.4]], look: ["stage", [0.3, 1.15, 0]], fov: 42 },
        b: { pos: ["dance", [-0.1, 1.45, 3.0]], look: ["stage", [0.3, 1.15, 0]] } },
  7:  { a: { pos: ["rats.1", [1.1, 1.05, 2.3]], look: ["rats.1", [0, 0.35, 0]], fov: 40 },
        b: { pos: ["rats.1", [0.9, 0.95, 2.0]], look: ["rats.1", [0, 0.35, 0]] } },
  8:  { a: { pos: ["dance", [-0.9, 1.1, 2.0]], look: ["dance", [0, 0.85, 0]], fov: 38 },
        b: { pos: ["dance", [-0.75, 1.05, 1.75]], look: ["dance", [0, 0.85, 0]] } },
  9:  { a: { pos: ["start", [1.9, 1.55, 5.4]], look: ["dance", [0, 1.1, 0]], fov: 44 },
        b: { pos: ["start", [1.65, 1.5, 4.9]], look: ["dance", [0, 1.1, 0]] } },
  10: { a: { pos: ["gate", [1.0, 1.6, 3.6]], look: ["gate", [-0.15, 1.35, 0]], fov: 40 },
        b: { pos: ["gate", [0.85, 1.55, 3.2]], look: ["gate", [-0.15, 1.35, 0]] } },
  11: { a: { pos: ["corners.1", [0.8, 1.3, 2.4]], look: ["corners.1", [0, 1.15, 0]], fov: 38 },
        b: { pos: ["corners.1", [0.65, 1.25, 2.05]], look: ["corners.1", [0, 1.15, 0]] } },
  12: { a: { pos: ["seat", [-2.0, 2.1, 4.8]], look: ["seat", [0, 1.2, 0]], fov: 44 },
        b: { pos: ["seat", [-1.8, 2.0, 4.3]], look: ["seat", [0, 1.2, 0]] } },
  13: { a: { pos: ["accuser", [0.8, 1.62, 2.6]], look: ["accuser", [0, 1.45, 0]], fov: 36 },
        b: { pos: ["accuser", [0.65, 1.58, 2.25]], look: ["accuser", [0, 1.43, 0]] } },
  14: { a: { pos: ["table", [-1.4, 1.85, 3.0]], look: ["table", [0.1, 0.98, 0]], fov: 40 },
        b: { pos: ["table", [-1.2, 1.8, 2.65]], look: ["table", [0.1, 0.98, 0]] } },
  15: { a: { pos: ["start", [-1.75, 1.75, 6.8]], look: ["start", [0.2, 1.1, 0]], fov: 44 },
        b: { pos: ["start", [-1.5, 1.7, 6.3]], look: ["start", [0.2, 1.1, 0]] } },
  16: { a: { pos: ["start", [1.2, 2.0, 6.4]], look: ["dance", [0, 1.2, 0]], fov: 46 },
        b: { pos: ["start", [1.0, 1.9, 5.6]], look: ["dance", [0, 1.2, 0]] } },
  17: { a: { pos: ["stage", [0.9, 1.2, 2.6]], look: ["stage", [0, 1.0, 0]], fov: 38 },
        b: { pos: ["stage", [0.75, 1.15, 2.3]], look: ["stage", [0, 1.0, 0]] } },
  18: { a: { pos: ["dance", [-1.55, 1.65, 4.4]], look: ["dance", [0, 1.1, 0]], fov: 46 },
        b: { pos: ["dance", [-1.35, 1.6, 4.0]], look: ["dance", [0, 1.1, 0]] } },
  19: { a: { pos: ["stage", [1.15, 1.45, 3.6]], look: ["stage", [0, 1.2, 0]], fov: 42 },
        b: { pos: ["stage", [0.95, 1.4, 3.25]], look: ["stage", [0, 1.2, 0]] } },
  20: { a: { pos: ["stage", [-1.25, 1.55, 4.3]], look: ["stage", [0.1, 0.75, 0]], fov: 42 },
        b: { pos: ["stage", [-1.05, 1.5, 3.9]], look: ["stage", [0.1, 0.75, 0]] } },
  21: { a: { pos: ["well", [-0.9, 1.4, 2.8]], look: ["well", [0, 1.15, 0]], fov: 42 },
        b: { pos: ["well", [-0.75, 1.35, 2.5]], look: ["well", [0, 1.15, 0]] } },
  22: { a: { pos: ["start", [0.5, 7.5, 16.5]], look: ["gate", [0, 1.5, -4]], fov: 46 },
        b: { pos: ["start", [0.5, 7.3, 15.9]], look: ["gate", [0, 1.5, -4]] } },
  23: { a: { pos: ["farmer", [1.3, 1.55, 3.5]], look: ["farmer", [0, 1.4, 0]], fov: 40 },
        b: { pos: ["farmer", [1.1, 1.5, 3.1]], look: ["farmer", [0, 1.4, 0]] } },
  24: { a: { pos: ["vista", [0, 0, 0]], look: ["vistaLook", [0, 0, 0]], fov: 50 },
        b: { pos: ["vista", [0, -0.15, 0]], look: ["vistaLook", [0, 0, 0]] } },
  25: { a: { pos: ["farmer", [0.85, 1.65, 1.95]], look: ["farmer", [0.02, 1.5, 0]], fov: 34 },
        b: { pos: ["farmer", [0.7, 1.6, 1.7]], look: ["farmer", [0.02, 1.48, 0]] } },
  26: { a: { pos: ["pews.1", [0.85, 1.4, 2.1]], look: ["pews.1", [0, 1.05, 0]], fov: 38 },
        b: { pos: ["pews.1", [0.7, 1.35, 1.85]], look: ["pews.1", [0, 1.05, 0]] } },
  27: { a: { pos: ["pews.0", [-0.5, 1.75, 4.8]], look: ["pews.2", [0, 0.95, 0]], fov: 46 },
        b: { pos: ["pews.0", [-0.45, 1.7, 4.4]], look: ["pews.2", [0, 0.95, 0]] } },
  28: { a: { pos: ["stage", [-0.8, 1.3, 3.5]], look: ["stage", [-0.4, 1.05, -0.5]], fov: 46 },
        b: { pos: ["stage", [-0.62, 1.25, 2.8]], look: ["stage", [-0.4, 1.05, -0.5]] } },
};
// who the narrator is standing next to in each stretch: their mouths flap with the words (RT.SPOKEN times)
RT.SPEAKERS = [
  [0.0, 4.9, "dancer"],        // line 1: she begins
  [10.9, 14.9, "dancer"],      // line 3: begging
  [19.2, 22.6, "doctor"],      // line 6: the verdict
  [26.8, 28.4, "usher"],       // line 8: the doors opened
  [29.8, 31.5, "drummer"],     // line 9: paid to play
  [45.8, 50.5, "farmer"],      // line 14: the famine
];

// a plain camera for a view the list above does not have yet: 3 m in front of its spot, a little to one side, pushing in
const plainCam = (v) => ({ a: { pos: [v.aim, [0.5, 1.6, 3.2]], look: [v.aim, [0, 1.2, 0]], fov: 40 }, b: { pos: [v.aim, [0.35, 1.58, 2.8]], look: [v.aim, [0, 1.22, 0]] } });
RT.VIEWS = (RT.PLAN || []).map((v) => Object.assign({}, v, RT.CAMERAS[v.n] || plainCam(v)));

RT.story = function (stage, sets, wordsLayer) {
  "use strict";
  const FPS = RT.FPS, DUR = RT.DURATION, V = RT.VIEWS;
  const clamp01 = (v) => Math.max(0, Math.min(1, v)), smooth = (a, b, t) => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };
  const frame = (t) => Math.round(t * FPS + 1e-6);
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const blink = (t, at) => { const d = frame(t) - Math.round(at * FPS); return d >= 0 && d < 2 ? 0 : 1; };
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const X = RT.EXPR || SF.faces;
  const face = (base, extra) => Object.assign({}, base, extra || {});
  const blinkF = (base, t, ...ats) => { let e = base.eye == null ? 1 : base.eye; for (const a of ats) e *= blink(t, a); return face(base, { eye: e }); };

  // ---- spots: "name", "name.i" (the i-th of a list), lists of { pos, ... } give their pos
  function spot(setName, ref) {
    const s = sets[setName]; if (!s) throw new Error("story: no set " + setName);
    let v = s.spots; for (const p of ref.split(".")) { v = v == null ? v : v[/^\d+$/.test(p) ? +p : p]; }
    if (v && !Array.isArray(v) && v.pos) v = v.pos;
    if (!Array.isArray(v) || typeof v[0] !== "number") throw new Error("story: no spot " + setName + "." + ref);
    return v;
  }
  const at = (setName, r) => add3(spot(setName, r[0]), r[1]);
  const camKey = (setName, c, t, ease, extra) => Object.assign({ t, pos: at(setName, c.pos), look: at(setName, c.look), set: setName, ease }, c.fov ? { fov: c.fov } : {}, c.focus ? { focus: c.focus } : {}, extra || {});
  const parseHow = (h) => { const m = /^([A-Z]+)(\d*)$/.exec(h || ""); return m ? { kind: m[1], n: +m[2] || 0 } : { kind: "open", n: 0 }; };

  // ---- the camera plan: views -> keys for engine/cam.js
  const keys = [];
  V.forEach((v, i) => {
    const end = i + 1 < V.length ? V[i + 1].t : DUR, h = parseHow(v.how);
    const first = h.kind === "D" ? { ease: "dissolve", dur: h.n / FPS } : h.kind === "W" ? { ease: "whip", frames: h.n } : h.kind === "CUT" ? { ease: "cut" } : {};
    const k0 = camKey(v.set, v.a, v.t, first.ease, first); if (i === 0) delete k0.ease; keys.push(k0);
    let last = v.b;
    for (const m of v.moves || []) {
      const mh = parseHow(m.how);
      keys.push(camKey(v.set, last, m.t, "push"));
      keys.push(camKey(v.set, m.a, m.t, mh.kind === "S" ? "settle" : "whip", { frames: mh.n }));
      last = m.b;
    }
    keys.push(camKey(v.set, last, end, "push"));
  });
  // the road is a set with two moods: day everywhere except the last night view; every other set carries its own mood
  const moodAt = (name, tt) => {
    if (name !== "road") return null;
    const v = V[viewIndexAt(tt)];
    return v && v.n >= 28 ? sets.road.mood : sets.road.moodDay;
  };

  // ---- which view is being drawn (in a dissolve both sides are staged separately)
  const startOf = (i) => { const h = parseHow(V[i].how); return h.kind === "W" ? V[i].t - h.n / FPS : V[i].t; };
  const viewIndexAt = (t) => { let i = 0; while (i + 1 < V.length && t >= startOf(i + 1) - 1e-9) i++; return i; };
  function drawingIndex(st, t) {
    const b = st.blend;
    if (b && b.k > 0 && b.k < 1 && st.drawingView) {
      let c = -1; for (let i = 1; i < V.length; i++) if (parseHow(V[i].how).kind === "D" && Math.abs(t - V[i].t) <= 3.6 / FPS) c = i;
      if (c > 0) return st.drawingView(st) === b.from ? c - 1 : c;
    }
    return viewIndexAt(t);
  }

  // ---- the staging hook runs before the cards turn to the camera: register it before any card exists
  const STAGING = {};
  let cast = null;
  stage.beforeDraw.push((t, st) => { if (cast) { const i = drawingIndex(st, t); stageView(V[i], i, t); } });

  // ---- the cast
  const make = (name, setName, ref, opts) => {
    const s = sets[setName], pos = typeof ref === "string" ? spot(setName, ref) : ref;
    const fn = RT.cast[name]; if (!fn) throw new Error("story: no RT.cast." + name);
    const c = fn(stage, pos, Object.assign({ parent: s.group }, opts || {}));
    if (c.group.parent !== s.group) s.group.add(c.group);
    c._home = pos.slice(); c._set = setName; return c;
  };
  cast = {
    dancer:  make("villager", "road", "dance", { variant: "b", name: "dancer" }),
    dancer2: make("villager", "road", [spot("road", "stage"), [0.9, 0, 1.4]], { variant: "a", name: "dancer2" }),
    dancer3: make("villager", "road", [spot("road", "dance"), [-1.5, 0, 1.2]], { variant: "c", name: "dancer3" }),
    dancer4: make("villager", "road", [spot("road", "stage"), [-1.1, 0, 0.9]], { variant: "a", name: "dancer4" }),
    crowd1:  make("villager", "road", [spot("road", "stage"), [2.1, 0, 2.6]], { variant: "b", name: "crowd1" }),
    crowd2:  make("villager", "road", [spot("road", "start"), [-1.2, 0, 2.2]], { variant: "c", name: "crowd2" }),
    pool:    (() => {
      for (const k of ["villagerA", "villagerB", "villagerC"]) if (RT.cast.defs && RT.cast.defs[k]) RT.cast.defs[k].px = 320;
      const D = spot("road", "dance");
      const ps = [[-0.4, -5.0], [0.5, -5.6], [-0.8, -6.2], [0.9, -6.8], [-0.3, -7.4], [0.4, -8.0],
                  [-1.1, -5.8], [1.15, -7.0], [-0.6, -8.6]];
      const out = [];
      for (let i = 0; i < ps.length; i++)
        out.push(make("villager", "road", [D[0] + ps[i][0], D[1], D[2] + ps[i][1]],
          { variant: ["a", "b", "c"][i % 3], name: "pool" + i }));
      return out;
    })(),
    usher:   make("usher", "road", "gate", { name: "usher", rope: false, staff: false }),
    drummer: make("villager", "road", "stage", { variant: "b", name: "drummer", pose: { drum: true } }),
    judge:   make("judge", "hall", "seat", { name: "judge" }),
    doctor:  make("prosecutor", "hall", "accuser", { name: "doctor" }),
    clap1:   make("villager", "hall", [spot("hall", "table"), [-1.6, 0, 1.4]], { variant: "a", name: "clap1" }),
    clap2:   make("villager", "hall", [spot("hall", "table"), [1.9, 0, 1.6]], { variant: "c", name: "clap2" }),
    farmer:  make("farmer", "field", "farmer", { name: "farmer" }),
    collapsed: make("villager", "field", "rats.1", { variant: "b", name: "collapsed", pose: { sit: 1, seatH: 0 } }),
    priest:  make("priest", "church", "pulpit", { name: "priest" }),
    pew1:    make("villager", "church", "pews.1", { variant: "b", name: "pew1", pose: { sit: 1 } }),
    pew2:    make("villager", "church", "pews.2", { variant: "c", name: "pew2", pose: { sit: 1 } }),
  };
  const dancerHome = cast.dancer._home.slice();
  const all = [];
  for (const v of Object.values(cast)) (Array.isArray(v) ? v : [v]).forEach((c) => all.push(c));
  const place = (c, pos) => { const g = c.group, p = g.parent; c.group.visible = true;
    if (p && p !== stage.scene) { const w = new THREE.Vector3(pos[0], pos[1], pos[2]); p.worldToLocal(w); g.position.copy(w); } else g.position.set(pos[0], pos[1], pos[2]); };
  const show = (c, pos, pose) => { place(c, pos || c._home); if (pose) c.set(pose); };
  const hideAll = () => { for (const c of all) c.group.visible = false; };

  // ---- words and mouths
  const words = SF.words(wordsLayer, RT.WORDS, { y: 0.706 });
  const SPOKEN = RT.SPOKEN || RT.WORDS;
  const cue = (text, after) => { const b = (s) => s.toLowerCase().replace(/[^a-z']/g, ""); const w = SPOKEN.find((x) => x.at >= (after || 0) - 1e-6 && b(x.text) === b(text)); return w ? w.at : after || 0; };
  const speaking = (who, t) => RT.SPEAKERS.some(([a, b, w]) => w === who && t >= a && t < b);
  function mouth(who, t) {
    if (!speaking(who, t)) return 0;
    const f = frame(t);
    for (let i = 0; i < SPOKEN.length; i++) {
      const w = SPOKEN[i], f0 = Math.round(w.at * FPS), f1 = Math.round(w.end * FPS) - 1;
      if (f < f0 || f >= f1) continue;
      const step = Math.floor((f - f0) / 2); if (step === 0) return 0.8;
      const r = hash(i + 1, step); return r < 0.3 ? 0 : r < 0.65 ? 0.4 : 0.85;
    }
    return 0;
  }
  const talkFace = (base, m) => (m > 0 ? face(base, { mouth: "open", mouthOpen: m }) : face(base, { mouth: base.mouth === "open" ? "line" : base.mouth }));

  const DANCE = RT.cast.dance;
  const dancePose = (t, ph, amp, fx) => Object.assign(DANCE(t, { bps: 1.5, ph, amp: amp == null ? 1 : amp }), fx || {});
  const wobB = (t, ph) => 0.008 * Math.sin(t * 2.2 + ph);
  const poolT = (t) => Math.floor(t * 8) / 8;   // the crowd redraws at 8 fps: it keeps the page light
  const poolT4 = (t) => Math.floor(t * 4) / 4;  // the deep pool at 4 fps: half the repaints for the budget
  const poolFx = (t, i, fx) => Object.assign({ bob: wobB(poolT(t), i) }, fx || {});

  // ---- the road view base: the dancer dancing, two onlookers; everything else hidden
  function roadBase(t) {
    show(cast.dancer, null, dancePose(t, 0, 1, { face: talkFace(blinkF(X.alarm, t, 2.2, 9.4), mouth("dancer", t)), sweat: smooth(1.5, 2.6, t) }));
    show(cast.crowd1, null, { arms: "down", face: blinkF(X.puzzled, t, 4.4) });
    show(cast.crowd2, null, { arms: "down", face: blinkF(X.puzzled, t, 5.1) });
    for (const n of ["usher", "drummer", "judge", "doctor", "clap1", "clap2", "farmer", "priest", "pew1", "pew2", "dancer3", "dancer4", "collapsed"]) cast[n].group.visible = false;
    for (const c of cast.pool) c.group.visible = false;
  }

  Object.assign(STAGING, {
    1(t) { roadBase(t);
      show(cast.dancer, null, dancePose(t, 0, 0.55 + 0.45 * smooth(0.0, 0.4, t), { face: talkFace(blinkF(X.calm, t, 1.7), 0), sweat: 0 })); },
    2(t) { roadBase(t); show(cast.dancer, null, dancePose(t, 0, 1, { face: X.alarm })); },
    3(t) { roadBase(t); show(cast.dancer, null, dancePose(t, 0, 1, { face: face(X.alarm, { sweat: 1 }) })); },
    4(t) { hideAll(); show(cast.dancer, null, dancePose(t, 0, smooth(3.9, 4.7, t), { face: X.scared })); },
    5(t) { roadBase(t);
      show(cast.crowd1, add3(spot("road", "dance"), [0.35, 0, 0.9]), { arms: "down", face: blinkF(X.puzzled, t, 5.6) });
      show(cast.crowd2, add3(spot("road", "dance"), [0.55, 0, 0.15]), { arms: "down", face: blinkF(X.puzzled, t, 6.4) }); },
    6(t) { roadBase(t);
      show(cast.dancer2, null, dancePose(t, 0.7, smooth(7.6, 8.6, t), { face: X.happy }));
      show(cast.dancer3, null, { arms: "down", face: X.puzzled }); show(cast.dancer4, null, poolFx(t, 4, { arms: "down", face: X.puzzled }));
      const tp4 = poolT4(t);
      for (let i = 0; i < cast.pool.length; i++)
        show(cast.pool[i], null, dancePose(tp4, i * 0.9, smooth(7.8, 9.4, tp4), { face: i % 2 ? X.happy : X.puzzled, bob: wobB(tp4, i) })); },
    7(t) { hideAll();
      show(cast.collapsed, add3(cast.collapsed._home, [0, 0, 0.35]), { sit: 1, seatH: 0, arms: "down", face: face(X.wince, { sweat: 1 }) });
      show(cast.farmer, null, { stalk: 0, tremble: 0, face: X.wince }); },
    8(t) { roadBase(t);
      show(cast.dancer, null, { arms: "down", face: face(X.wince, { sweat: 1, mouth: "shout" }), bob: 0.01 * Math.sin(t * 5) });
      show(cast.crowd1, add3(cast.crowd1._home, [0, 0, -0.6]), { arms: "down", face: X.scared });
      show(cast.crowd2, null, { arms: "down", face: X.scared }); },
    9(t) { roadBase(t); show(cast.dancer, null, dancePose(t, 0, 1, { face: X.scared }));
      show(cast.dancer2, null, poolFx(t, 1, { arms: "down", face: X.scared })); show(cast.dancer3, null, poolFx(t, 2, { arms: "down", face: X.scared })); show(cast.dancer4, null, poolFx(t, 3, { arms: "down", face: X.scared }));
      for (let i = 0; i < cast.pool.length; i++) show(cast.pool[i], null, { arms: "down", face: X.scared, bob: wobB(poolT4(t), i) }); },
    10(t) { roadBase(t); show(cast.usher, null, { call: smooth(16.3, 16.9, t), face: X.stern }); },
    11(t) { roadBase(t);
      show(cast.dancer3, add3(spot("road", "corners.1"), [0, 0, 0.35]), { arms: "down", face: X.scared });
      show(cast.dancer4, add3(spot("road", "corners.1"), [0.55, 0, -0.05]), { arms: "down", face: X.wince }); },
    12(t) { hideAll();
      show(cast.judge, null, { chin: 1, lean: 0, face: blinkF(X.stern, t, 1.5) });
      show(cast.doctor, add3(cast.doctor._home, [0.25, 0, 0.55]), { face: talkFace(blinkF(X.earnest, t, 1.1), mouth("doctor", t)), point: 0.7 * smooth(19.6, 20.4, t) });
      show(cast.clap1, null, { arms: "down", face: X.calm }); },
    13(t) { hideAll();
      show(cast.doctor, null, { face: talkFace(blinkF(X.smug, t, 1.9), mouth("doctor", t)), point: 0.85 * smooth(21.9, 22.5, t), bob: 0.006 * Math.sin(t * 6) }); },
    14(t) { hideAll();
      show(cast.judge, null, { chin: 0, lean: 0.35, face: X.stern });
      show(cast.doctor, null, { face: X.smug, fold: 1, point: 0 });
      show(cast.clap1, null, { arms: "clap", face: X.happy });
      show(cast.clap2, null, { arms: "cheer", face: X.laugh }); },
    15(t) { roadBase(t);
      for (let i = 0; i < cast.pool.length; i++) show(cast.pool[i], null, { arms: "down", face: X.earnest, bob: wobB(poolT4(t), i) });
      show(cast.dancer2, add3(cast.dancer2._home, [-0.4, 0, -0.5 + smooth(26.9, 27.6, t) * 1.2]), { arms: "carry", face: X.earnest, bob: 0.012 * Math.abs(Math.sin(t * 4.2)) });
      show(cast.dancer3, add3(cast.dancer3._home, [0.6, 0, -0.2 + smooth(27.1, 27.8, t) * 1.0]), { arms: "down", face: X.earnest });
      show(cast.dancer4, add3(cast.dancer4._home, [-0.2, 0, -1.0 + smooth(27.0, 27.7, t) * 0.9]), { arms: "down", face: X.earnest }); },
    16(t) { roadBase(t); show(cast.dancer2, null, poolFx(t, 1, { arms: "down", face: X.puzzled })); show(cast.dancer3, null, poolFx(t, 2, { arms: "down", face: X.puzzled }));
      for (let i = 0; i < cast.pool.length; i++) show(cast.pool[i], null, { arms: "down", face: X.puzzled, bob: wobB(poolT4(t), i) }); },
    17(t) { roadBase(t);
      show(cast.drummer, null, { hit: 0.5 + 0.5 * Math.sign(Math.sin(t * Math.PI * 1.5)), face: talkFace(blinkF(X.earnest, t, 1.2), mouth("drummer", t)) });
      show(cast.dancer2, null, { arms: "clap", face: X.happy }); show(cast.dancer3, null, { arms: "cheer", face: X.laugh }); },
    18(t) { roadBase(t);
      show(cast.dancer2, null, dancePose(t, 0.7, 1, { face: X.happy }));
      show(cast.dancer3, null, dancePose(t, 1.9, smooth(31.9, 32.8, t), { face: X.happy }));
      show(cast.dancer4, null, dancePose(t, 3.1, smooth(32.3, 33.2, t), { face: X.laugh }));
      show(cast.drummer, add3(cast.drummer._home, [0, 0, -0.5]), { hit: 0.5 + 0.5 * Math.sign(Math.sin(t * Math.PI * 1.5)), face: X.earnest });
      show(cast.crowd1, null, poolFx(t, 0, { arms: "cheer", face: X.laugh }));
      show(cast.crowd2, null, poolFx(t, 2, { arms: "clap", face: X.happy }));
      const tp = poolT4(t);
      for (let i = 0; i < cast.pool.length; i++)
        show(cast.pool[i], null, dancePose(tp, i * 0.9, smooth(31.8, 33.2, tp), { face: i % 3 ? X.happy : X.laugh, bob: wobB(tp, i) })); },
    19(t) { roadBase(t);
      show(cast.dancer2, null, dancePose(t, 0.7, 1, { face: face(X.scared, { sweat: 1 }) }));
      show(cast.dancer3, null, dancePose(t, 1.9, 1, { face: face(X.scared, { sweat: 1, wink: 1 }) }));
      show(cast.dancer4, null, dancePose(t, 3.1, 1, { face: face(X.wince, { sweat: 1 }) }));
      show(cast.drummer, add3(cast.drummer._home, [0, 0, -0.5]), { hit: 0.5 + 0.5 * Math.sign(Math.sin(t * Math.PI * 1.7)), face: X.stern });
      const tp = poolT4(t);
      for (let i = 0; i < cast.pool.length; i++)
        show(cast.pool[i], null, dancePose(tp, i * 0.9, 1, { face: X.scared, sweat: i % 3 === 0 ? 1 : 0, bob: wobB(tp, i) })); },
    20(t) { hideAll(); },
    21(t) { hideAll();
      show(cast.crowd1, add3(spot("road", "well"), [-0.42, 0, 1.3]), { arms: "carry", face: X.earnest });
      show(cast.crowd2, add3(spot("road", "well"), [-0.18, 0, 0.75]), { arms: "carry", face: X.earnest });
      show(cast.dancer2, add3(spot("road", "well"), [0.1, 0, 0.35]), { arms: "carry", face: X.earnest }); },
    22(t) { hideAll(); },
    23(t) { hideAll(); show(cast.farmer, null, { stalk: 1, tremble: 0, face: talkFace(blinkF(X.earnest, t, 0.9), mouth("farmer", t)) }); },
    24(t) { hideAll(); show(cast.farmer, null, { stalk: 1, tremble: smooth(47.5, 48.5, t), face: X.scared }); },
    25(t) { hideAll(); show(cast.farmer, null, { stalk: 0, tremble: 1, face: face(X.scared, { sweat: 1, mouth: "tremble" }) }); },
    26(t) { hideAll();
      show(cast.pew1, null, { sit: 1, arms: "down", face: face(X.wince, { sweat: 1 }), bob: 0.004 * Math.sin(t * 1.2) });
      show(cast.priest, null, { unroll: 0, face: X.sad });
      show(cast.pew2, null, { sit: 1, arms: "down", face: X.asleep, look: [0.05, -0.15] }); },
    27(t) { hideAll();
      show(cast.pew1, null, { sit: 1, arms: "down", face: face(X.wince, { sweat: 1 }) });
      show(cast.priest, null, { unroll: 0, face: X.sad });
      show(cast.pew2, null, { sit: 1, arms: "down", face: X.asleep, look: [0.05, -0.15] }); },
    28(t) { hideAll();
      show(cast.drummer, add3(cast.drummer._home, [0.15, 0, -0.2]), { drum: true, hit: 0, arms: "down", face: X.stern }); },
  });
  function stageView(v, i, t) {
    sets.road.setDay(v.n >= 28 ? 0 : 1);
    const stageUp = v.n >= 16 && v.n <= 20 || v.n === 28;
    sets.road.setStage(stageUp ? 1 : 0);
    if (v.n <= 14) sets.hall.setSeal(v.n >= 12 ? 0 : 0);
    hideAll();
    (STAGING[v.n] || (() => {}))(t);
  }

  // ---- flames: every small light-source mesh flickers (glow follows userData.flicker)
  const flames = [];
  for (const s of Object.values(sets)) s.group.traverse((o) => {
    if (!o.isMesh) return; const u = o.userData, geo = o.geometry && o.geometry.type;
    if ((u.glow > 0 && !/Plane|Box|Shape|Circle/.test(geo || "")) || (u.noDepth && o.material && o.material.isMeshBasicMaterial && geo === "SphereGeometry"))
      flames.push({ o, sx: o.scale.x, sy: o.scale.y, ph: flames.length * 2.17 });
  });
  const flick = (t, ph) => 0.5 + 0.22 * Math.sin(t * 23.0 + ph) + 0.16 * Math.sin(t * 37.3 + ph * 1.7) + 0.12 * Math.sin(t * 61.1 + ph * 0.6);

  const cam = SF.cam(stage, keys, { moodAt });
  stage.onFrame.push((t) => {
    for (const fl of flames) { const k = flick(t, fl.ph); fl.o.scale.set(fl.sx * (0.92 + 0.1 * k), fl.sy * (0.82 + 0.3 * k), fl.o.scale.z); fl.o.userData.flicker = 0.7 + 0.6 * k; }
    words.renderAt(t);
  });
  const counts = { views: V.length, cuts: cam.cuts.length, dissolves: cam.dissolves.length, fastMoves: cam.keys.filter((k) => k.ease === "whip").length };
  return { cam, cast, views: V, keys: cam.keys, counts, words, flames, viewIndexAt };
};
