/* cam.js: camera stations, slow pushes with drift, fast moves, cross-dissolves and hard cuts, all a pure function of time.
 *
 *   SF.cam(stage, [
 *     { t: 0,    pos: [x, y, z], look: [x, y, z], fov: 40, set: "court" },   // a station (set: which set this view shows)
 *     { t: 1.25, pos: [...], look: [...], ease: "push" },                    // got here by a slow push (linear: never stops)
 *     { t: 1.25, pos: [...], look: [...], ease: "dissolve", dur: 0.233 },    // a cross-dissolve to a new view, centred on t
 *     { t: 2.40, pos: [...], look: [...], ease: "push" },                    // the new view keeps pushing
 *     { t: 3.20, pos: [...], look: [...], fov: 30, ease: "whip", frames: 21 },// a fast move of 21 frames ENDING at t
 *     { t: 4.00, pos: [...], look: [...], ease: "cut", set: "road" },        // a hard cut to a new view at t
 *   ], { moodAt(set, t, view) { return mood or null } });
 *
 * Each key says how the camera ARRIVES at it from the key before:
 *   "push"   linear (the camera is never still inside a view; put sideways drift in the keys, 3-8 % of the frame a second)
 *   "whip"   the measured fast move of the reference shorts: speed rises over the first third, then falls away slowly
 *            (21-35 frames; peak about 2.4x the mean speed)
 *   "glide"  cubic in-out (symmetric; kept for old plans)   "settle" fast start, soft landing
 *   "hold"   stays on the key before, then jumps (the view before is FROZEN until the jump; prefer "cut")
 *   "cut"    a hard cut at t: the view before keeps moving as it was (its last push carried on) right up to t, then the
 *            new view starts at this key. Starts a new take, like a dissolve of length 0. Usually carries a `set`.
 *   "dissolve" (with dur, seconds, default 7 frames): the view before keeps moving as it was (its last push carried on)
 *            while the new view is already moving as its next push will (carried back), and the two are mixed by k.
 *            During it stage.blend = { from: view, to: view, k }; otherwise null.
 *            The stage's camera itself is set to `from` until k = 0.5, then `to`, so a stage that does not mix views
 *            shows a clean hard cut at the dissolve's middle.
 *   frames: N (on a whip, glide or settle key): the move takes exactly N frames and ends at t. Until t - N/30 the camera
 *            keeps moving as it was arriving at the key before (that push is carried on; the part of it not reached is
 *            dropped), so a fast move can be written as "the old view's aim at t, then the new view at t, frames N".
 * The lens focuses on the look-at point (focus = distance to it) unless a key gives focus (metres) itself.
 *
 * A view is { pos, look, fov, focus, set, mood }. `set` is inherited from the key before when a key has none.
 * `mood` is only there when opt.moodAt returns one for that view (the story's own light change, e.g. the court at night);
 * otherwise the stage uses the set's own mood.
 *
 * Hand-offs:
 *   stage.camAt(t)   -> view     the main camera view at any t (pure)
 *   stage.speedAt(t) -> number  how far the picture moves in one frame (1/30 s) around t, as a share of the frame's
 *                       height: the median screen travel of a 5 x 7 grid of points on the focus plane. 0.1+ in a whip.
 *   stage.blend      set by the hook each frame (see "dissolve"); its from/to views carry set and mood.
 *   stage.camSet     the set of the main view this frame. stage.useSet(name) is called with it when the stage has one,
 *                    then stage.setMood(view.mood) when the view carries a mood.
 *   stage.drawingView(st) -> view   the view being drawn right now: inside a dissolve, the side the stage's camera has
 *                    been set to (compared by position), else the main view. For beforeDraw hooks that stage each view.
 *   cam.cuts / cam.dissolves / cam.moves   lists of { t, ... } for counting and checks.
 *   cam.inside       warnings (also console.warn, which `hyperframes check --json` reports and tools/stills.sh prints)
 *                    for every view whose camera stands inside a set's solid: a wall, a house, a pillar.
 */
window.SF = window.SF || {};
SF.EASE = (function () {
  // the whip: speed v(u) rises as a smoothstep to its peak at P, then falls as (1 - s)^Q; position = integral, normalised
  const P = 0.33, Q = 1.6, N = 400, tab = new Float32Array(N + 1);
  const v = (u) => (u < P ? ((x) => x * x * (3 - 2 * x))(u / P) : Math.pow(1 - (u - P) / (1 - P), Q));
  let acc = 0; tab[0] = 0;
  for (let i = 1; i <= N; i++) { acc += (v((i - 0.5) / N)) / N; tab[i] = acc; }
  for (let i = 1; i <= N; i++) tab[i] /= acc;
  const whip = (k) => { if (k <= 0) return 0; if (k >= 1) return 1; const x = k * N, i = Math.floor(x), f = x - i; return tab[i] + (tab[Math.min(N, i + 1)] - tab[i]) * f; };
  return {
    push: (k) => k,
    whip,
    glide: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    settle: (k) => 1 - Math.pow(1 - k, 3),
    hold: (k) => (k < 1 ? 0 : 1),
  };
})();
SF.cam = function (stage, keysIn, opt) {
  "use strict";
  opt = opt || {};
  const FPS = stage.fps || 30;
  const lerp = (a, b, k) => a + (b - a) * k, lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const isNew = (k) => k && (k.ease === "dissolve" || k.ease === "cut");     // keys that start a new take

  // ---- compile: inherit sets, then turn "frames" moves into a carried push up to t - N/FPS
  const keys = keysIn.map((k) => Object.assign({}, k));
  for (let i = 1; i < keys.length; i++) if (!keys[i].set) keys[i].set = keys[i - 1].set;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (!k.frames || isNew(k) || !k.ease || k.ease === "push") continue;
    const t0 = k.t - k.frames / FPS, p = keys[i - 1];
    const pushIn = i >= 2 && !isNew(p) && (p.ease || "push") === "push";        // the key before was reached by a push
    const at = (u) => { const q = keys[i - 2]; return { pos: lerp3(q.pos, p.pos, u), look: lerp3(q.look, p.look, u), fov: lerp(q.fov || keys[0].fov || 40, p.fov || keys[0].fov || 40, u) }; };
    if (p.t > t0 + 1e-6 && isNew(p)) continue;                                   // the key before starts its take: never move it
    if (p.t > t0 + 1e-6) {                                                       // the old view's aim lies past the move's start: stop the push at t0
      if (pushIn) { const q = keys[i - 2], u = (t0 - q.t) / Math.max(1e-6, p.t - q.t); Object.assign(p, at(u)); }
      p.t = t0;
    } else if (p.t < t0 - 1e-6) {                                                // the old view ends early: carry its push on to t0
      const stop = Object.assign({}, p, { t: t0, ease: "push", frames: 0 });
      if (pushIn) { const q = keys[i - 2], u = (t0 - q.t) / Math.max(1e-6, p.t - q.t); Object.assign(stop, at(u)); }
      keys.splice(i, 0, stop); i++;
    }
  }

  const fovOf = (k) => k.fov || keys[0].fov || 40, focusOf = (k) => (k.focus != null ? k.focus : dist(k.pos, k.look));
  const view = (k) => ({ pos: k.pos, look: k.look, fov: fovOf(k), focus: focusOf(k), set: k.set });
  const mix = (a, b, k) => ({ pos: lerp3(a.pos, b.pos, k), look: lerp3(a.look, b.look, k), fov: lerp(a.fov, b.fov, k), focus: lerp(a.focus, b.focus, k), set: k < 1 ? (b.set || a.set) : b.set });
  const isDis = (k) => k && k.ease === "dissolve";
  const half = (k) => (k.ease === "cut" ? 0 : (k.dur == null ? 7 / 30 : k.dur) / 2);

  // segment i runs from keys[i-1] to keys[i]; evaluate it at t, carrying a linear push on past its ends (u outside 0..1)
  function seg(i, t) {
    const a = view(keys[i - 1]), b = view(keys[i]), span = keys[i].t - keys[i - 1].t;
    const u = span > 0 ? (t - keys[i - 1].t) / span : 1, e = keys[i].ease || "push";
    if (e === "push") return mix(a, b, u);                                   // linear: extrapolates naturally
    return mix(a, b, SF.EASE[e](Math.max(0, Math.min(1, u))));
  }
  // the view that is "live" at t if no dissolve were running: the segment containing t, take-starting keys skipped
  function plain(t, lo, hi) {
    // lo..hi: key index range of one continuous take (no dissolve or cut inside)
    if (t <= keys[lo].t) {                                                   // before the take: carry its first push back
      if (hi > lo && (keys[lo + 1].ease || "push") === "push") return seg(lo + 1, t);
      return view(keys[lo]);
    }
    for (let i = lo + 1; i <= hi; i++) if (t <= keys[i].t) return seg(i, t);
    if (hi > lo && (keys[hi].ease || "push") === "push") return seg(hi, t);  // after the take: carry its last push on
    return view(keys[hi]);
  }
  // takes: runs of keys split at dissolve and cut keys
  const takes = []; { let s = 0; for (let i = 1; i < keys.length; i++) if (isNew(keys[i])) { takes.push([s, i - 1]); s = i; } takes.push([s, keys.length - 1]); }

  const withMood = (v, t) => { if (opt.moodAt) { const m = opt.moodAt(v.set, t, v); if (m) v.mood = m; } return v; };
  // { view, blend } at t
  function state(t) {
    for (let j = 1; j < takes.length; j++) {
      const d = keys[takes[j][0]], h = half(d);
      if (h > 0 && t >= d.t - h && t < d.t + h) {
        const from = withMood(plain(t, takes[j - 1][0], takes[j - 1][1]), t), to = withMood(plain(t, takes[j][0], takes[j][1]), t);
        const k = (t - (d.t - h)) / (2 * h);
        return { view: k < 0.5 ? from : to, blend: { from, to, k }, j };
      }
    }
    let j = 0; while (j + 1 < takes.length && t >= keys[takes[j + 1][0]].t - 1e-9) j++;
    return { view: withMood(plain(t, takes[j][0], takes[j][1]), t), blend: null, j };
  }
  const at = (t) => state(t).view;

  // speed: project a grid on the focus plane of the view at t - 1/60 into the view at t + 1/60
  let THREEcam = null;
  const camFor = () => THREEcam || (THREEcam = [new THREE.PerspectiveCamera(40, stage.W / stage.H, 0.05, 100), new THREE.PerspectiveCamera(40, stage.W / stage.H, 0.05, 100)]);
  function setCam(c, v) { c.position.set(v.pos[0], v.pos[1], v.pos[2]); c.fov = v.fov; c.updateProjectionMatrix(); c.lookAt(v.look[0], v.look[1], v.look[2]); c.updateMatrixWorld(true); }
  function speedBetween(v0, v1) {
    const [c0, c1] = camFor(); setCam(c0, v0); setCam(c1, v1);
    const p = new THREE.Vector3(), d = [], depth = Math.max(0.3, v0.focus);
    for (let iy = 0; iy < 7; iy++) for (let ix = 0; ix < 5; ix++) {
      const nx = -0.8 + 0.4 * ix, ny = -0.85 + (1.7 / 6) * iy;
      p.set(nx, ny, 0.5).unproject(c0).sub(c0.position).normalize();
      const fwd = new THREE.Vector3(); c0.getWorldDirection(fwd);
      p.multiplyScalar(depth / Math.max(1e-3, p.dot(fwd))).add(c0.position);
      p.project(c1);
      d.push(Math.hypot((p.x - nx) * stage.W / stage.H, p.y - ny) / 2);  // NDC spans 2 per frame height
    }
    d.sort((a, b) => a - b); return d[(d.length / 2) | 0];
  }
  function speedAt(t) {
    const s = state(t);
    const e = 1 / 60;
    if (s.blend) { const A = takes[s.j - 1], B = takes[s.j];      // both views keep moving through a dissolve
      return Math.max(speedBetween(plain(t - e, A[0], A[1]), plain(t + e, A[0], A[1])), speedBetween(plain(t - e, B[0], B[1]), plain(t + e, B[0], B[1]))); }
    // a hard cut ("hold" or "cut") inside the window: measure on the side of t only, so the cut itself is not read as speed
    for (const k of keys) if ((k.ease === "hold" || k.ease === "cut") && Math.abs(k.t - t) < 2 * e) return t < k.t ? speedBetween(at(t - 2 * e), at(t - e)) * 2 : speedBetween(at(t + e), at(t + 2 * e)) * 2;
    return speedBetween(at(t - e), at(t + e));
  }

  // the view being drawn: in a dissolve, the side the camera stands on now
  function drawingView(st) {
    st = st || stage;
    const b = st.blend;
    if (b && b.from && b.to && b.k > 0 && b.k < 1) {
      const c = st.camera.position, df = Math.hypot(c.x - b.from.pos[0], c.y - b.from.pos[1], c.z - b.from.pos[2]), dt = Math.hypot(c.x - b.to.pos[0], c.y - b.to.pos[1], c.z - b.to.pos[2]);
      return df < dt ? b.from : b.to;
    }
    return st.camView || at(st.t || 0);
  }

  stage.camAt = at;
  stage.speedAt = speedAt;
  stage.drawingView = drawingView;
  stage.blend = null;
  stage.onFrame.push((t, st) => {
    const s = state(t), v = s.view, c = st.camera;
    c.position.set(v.pos[0], v.pos[1], v.pos[2]); c.fov = v.fov; c.updateProjectionMatrix(); c.lookAt(v.look[0], v.look[1], v.look[2]);
    st.focus = v.focus; st.blend = s.blend; st.camView = v; st.camSet = v.set;
    if (v.set && st.useSet) st.useSet(v.set);
    if (v.mood && st.setMood && !st.showView) st.setMood(v.mood, v.set);   // a stage with showView applies view.mood itself (per side)
  });
  const lists = { cuts: keys.filter((k) => k.ease === "cut" || k.ease === "hold"), dissolves: keys.filter(isDis),
    moves: keys.filter((k) => k.ease === "whip" || k.ease === "glide" || k.ease === "settle") };

  // ---- a camera inside a set's solid (a wall, a house, a pillar) otherwise shows only in a still. Once, at load: the
  // camera at every key and half-way between keys; a closed mesh whose box holds it gets six rays (+-x, +-y, +-z): from
  // inside, five or six of them first meet a back face. Each hit is a console warning naming the view (RT.VIEWS by time),
  // which `hyperframes check --json` reports and tools/stills.sh prints. Reads the sets, changes nothing.
  function insideCheck() {
    if (!stage.sets || !THREE.Raycaster) return [];
    const solids = {}, rc = new THREE.Raycaster(), P = new THREE.Vector3(), N = new THREE.Vector3();
    const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((d) => new THREE.Vector3(d[0], d[1], d[2]));
    const solidsOf = (name) => {
      if (solids[name]) return solids[name];
      const s = stage.sets[name], out = [];
      if (s && s.group) {
        s.group.updateMatrixWorld(true);
        s.group.traverse((o) => {
          if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.material || Array.isArray(o.material)) return;
          const u = o.userData || {}, type = o.geometry.type || "";
          if (u.card || u.noDepth || o.material.side !== THREE.FrontSide || /Plane|Circle|Ring|Shape/.test(type)) return;
          for (let p = o; p && p !== s.group; p = p.parent) if (p.visible === false) return;     // parts the set hides (the set itself is hidden until used)
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          out.push({ mesh: o, box: o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld) });
        });
      }
      return (solids[name] = out);
    };
    const insideOf = (pos, name) => {
      P.set(pos[0], pos[1], pos[2]);
      for (const c of solidsOf(name)) {
        if (!c.box.containsPoint(P)) continue;
        const m = c.mesh, side = m.material.side; let back = 0;
        m.material.side = THREE.DoubleSide;
        for (const d of DIRS) {
          rc.set(P, d); const hit = rc.intersectObject(m, false)[0];
          if (hit && hit.face) { N.copy(hit.face.normal).transformDirection(m.matrixWorld); if (N.dot(d) > 0) back++; }
        }
        m.material.side = side;
        if (back >= 5) return c;
      }
      return null;
    };
    const V = (window.RT && RT.VIEWS) || [];
    const viewAt = (t, before) => { let n = null; for (const v of V) if (before ? v.t < t - 1e-6 : v.t <= t + 1e-6) n = v.n; return n; };
    const f2 = (x) => x.toFixed(2), seen = {}, out = [];
    for (let i = 0; i < keys.length; i++) for (const t of i + 1 < keys.length ? [keys[i].t, (keys[i].t + keys[i + 1].t) / 2] : [keys[i].t]) {
      const s = state(t);
      for (const v of s.blend ? [s.blend.from, s.blend.to] : [s.view]) {
        const c = v && v.set && insideOf(v.pos, v.set); if (!c) continue;
        const n = viewAt(t, s.blend && v === s.blend.from); if (seen[n + "/" + v.set]) continue; seen[n + "/" + v.set] = 1;
        const sz = c.box.getSize(new THREE.Vector3()), mid = c.box.getCenter(new THREE.Vector3());
        const msg = `camera inside a solid: view ${n == null ? "?" : n} at ${f2(t)} s (set ${v.set}): the camera [${v.pos.map(f2).join(", ")}] ` +
          `is inside ${c.mesh.name ? '"' + c.mesh.name + '", ' : ""}a ${c.mesh.geometry.type.replace("Geometry", "").toLowerCase() || "mesh"} ` +
          `${f2(sz.x)} x ${f2(sz.y)} x ${f2(sz.z)} m centred at [${f2(mid.x)}, ${f2(mid.y)}, ${f2(mid.z)}]`;
        out.push(msg); console.warn(msg);
      }
    }
    return out;
  }
  let inside = [];
  try { inside = insideCheck(); } catch (e) { console.warn("camera inside a solid: the check could not run (" + e.message + ")"); }
  return Object.assign({ keys, at, state, speedAt, drawingView, takes, inside }, lists);
};
