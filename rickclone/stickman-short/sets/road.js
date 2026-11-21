/* sets/road.js: the road to the town at night (France, about 1510). Views 20, 21, 22, 23.
 *
 *   const road = RT.sets.road(stage);    // a set object (PLAN.md): { name, group, origin, spots, mood, ... }
 *
 * Layout (local metres; the set sits at world x = 900, spots are WORLD = local + [900, 0, 0]). The street runs from the
 * near end (z +8) away from the camera to the courthouse (z -38):
 *   - a packed-earth street 5 m wide, timber-framed houses on both sides (two and three floors, jettied, tiled roofs,
 *     doors in deep dark doorways, some windows lit warm), alleys between some of them
 *   - barrels, a cart, crates, a well where the street widens, a lantern on a post (a warm pool of light)
 *   - the courthouse at the end: a stone front with a tower, every window lit, a lit door; a lantern either side
 *   - a moon and stars on a deep blue sky; moonlight (blue, with shadows) from behind the courthouse, left
 *
 * Spots (world): start (the near end of the street, where the small rat stands), gate (the courthouse door),
 *   stage (the floor of a plank market stage, shown by road.setStage(1)), dance (the lantern's pool of light),
 *   corners (8 hiding places for cats, in the order the camera passes them from the near end:
 *     { pos: [x, y, z], ry, kind }  pos = where the cat sits (its feet), ry = the way it faces (radians about y; 0 = +z,
 *     toward the near end of the street), facing = the same as a unit vector [x, 0, z] (where the cat looks),
 *     kind = what hides it), bigcat (under the lamp, for the close-up), lamp (the lantern).
 * Also returned: moon (the light), hemi, lamp (group; .userData.light), windows (every lit window mesh: glow 1.6, the
 *   story may set userData.flicker), views (suggested cameras), and setWindows(k) (0..1 dims every lit window).
 * Day: road.moodDay is the same street on a clear day: a blue sky with clouds (the moon and stars gone), a high warm sun
 *   from the front left (the moon light becomes the sun: no extra shadow light), light haze, lanterns, lamp light and lit
 *   windows out, sunlit earth. Choose it like any mood: for the whole film `sets.road.mood = sets.road.moodDay;` at the
 *   top of RT.story, or for some views from the story's moodAt: `(set, t) => set === "road" ? sets.road.moodDay : null`.
 *   Its field `day` (0 night .. 1 day; SF.mood.mix eases it) drives road.setDay(k) through onMood; the sky and the
 *   street's texture switch at 0.5. Picture: library/pictures/set-road-day.jpg.
 */
window.RT = window.RT || {}; RT.sets = RT.sets || {};
RT.sets.road = function (stage) {
  "use strict";
  const O = SF.outdoor, P = SF.paint, M = O.mats(), OX = 900;
  const group = new THREE.Group(); group.name = "set:road";
  const root = new THREE.Group(); root.position.set(OX, 0, 0); group.add(root);
  if (stage && stage.scene && !stage.addSet) stage.scene.add(group);
  const W = (x, y, z) => [x + OX, y, z];
  const add = (m, o) => { o = o || {}; if (m.isMesh) { m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false; } if (o.ink != null) m.userData.ink = o.ink; root.add(m); return m; };
  const put = (obj, x, y, z, ry, o) => { obj.position.set(x, y, z); if (ry) obj.rotation.y = ry; o = o || {};
    obj.traverse((m) => { if (m.isMesh && !m.userData.noDepth && !m.userData.card) { m.castShadow = o.cast !== false; m.receiveShadow = true; } }); root.add(obj); return obj; };
  const windows = [];
  const lit = (G) => { for (const w of G.userData.windows) if (w.userData.glow) windows.push(w); return G; };

  // ---- the ground: the street (earth, ruts, cobbles, puddles) and the ground under the houses
  const dirt = O.paint.dirt({ seed: 21, base: "#6a6466", night: true }); dirt.repeat.set(1 / 5, 1 / 5);
  const dirtDay = O.paint.dirt({ seed: 21, base: "#8c7a62" }); dirtDay.repeat.set(1 / 5, 1 / 5);
  const g = new THREE.PlaneGeometry(40, 70, 40, 70); { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 40, uv.getY(i) * 70); }
  P.shade(g, (x, y) => 0.6 + 0.4 * Math.max(0, 1 - Math.max(0, Math.abs(x) - 2.6) / 2.5));           // darker toward the house fronts
  const ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: dirt, vertexColors: true })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -17); ground.userData.ink = 0.35; add(ground, { cast: false });
  for (const s of [-1, 1]) O.box(root, 0.35, 0.12, 50, M.stone, s * 2.85, 0.06, -12, { cast: false });   // kerb stones along the house fronts

  // ---- the houses. Left row faces +x (ry = +PI/2), right row faces -x (ry = -PI/2). A house's width runs along z.
  const L = [[7, 5.2, 2, 3], [1.4, 4.4, 3, 1], [-4.2, 5.4, 2, 5], [-10.4, 4.6, 3, 7], [-16.2, 5.6, 2, 9], [-22.8, 5.0, 3, 11], [-28.6, 4.8, 2, 13]];
  const R = [[6.2, 4.8, 3, 2], [0.6, 5.6, 2, 4], [-5.0, 4.4, 3, 6], [-11.6, 5.8, 2, 8], [-19.6, 5.2, 3, 10], [-25.6, 4.6, 2, 12], [-30.8, 4.0, 2, 14]];
  const houses = { L: [], R: [] };
  for (const [z, w, fl, seed] of L) { const h = lit(O.house({ seed, w, d: 6, floors: fl, jetty: 0.4, lit: 0.45, gable: seed % 3 !== 0, doorX: (seed % 2 ? -0.6 : 0.6) })); put(h, -3.0 - 3, 0, z, Math.PI / 2); houses.L.push(h); }
  for (const [z, w, fl, seed] of R) { const h = lit(O.house({ seed, w, d: 6, floors: fl, jetty: 0.4, lit: 0.45, gable: seed % 3 !== 1, doorX: (seed % 2 ? 0.6 : -0.6) })); put(h, 3.0 + 3, 0, z, -Math.PI / 2); houses.R.push(h); }
  // a house's door, in world terms: the house group's local door point turned by its ry
  const doorOf = (h) => { const d = h.userData.door, v = new THREE.Vector3(d[0], 0, d[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), h.rotation.y); return [h.position.x + v.x, 0, h.position.z + v.z]; };

  // ---- the courthouse at the end of the street: a stone front, a tower with a spire, lit windows, a lit door
  const CZ = -39;
  const court = new THREE.Group(); put(court, 0, 0, CZ);
  O.box(court, 16, 9, 6, M.stoneWarm, 0, 4.5, 0);
  for (const s of [-1, 1]) { const sl = O.box(court, 16.6, 0.25, 4.6, M.tiles[2], 0, 10.1, s * 1.5, { ink: 0.8 }); sl.rotation.x = s * 0.75; }
  O.box(court, 16.4, 0.4, 6.4, M.stoneWarm, 0, 9.0, 0);
  const tw = O.box(court, 4.2, 16, 4.2, M.stoneWarm, 4.8, 8, 1.2); const sp = new THREE.Mesh(new THREE.ConeGeometry(3.1, 7, 4), M.tiles[2]); sp.position.set(4.8, 19.5, 1.2); sp.rotation.y = Math.PI / 4; sp.castShadow = true; court.add(sp);
  const glowWin = (w, h, x, y, z, seed, glow) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: O.paint.windowLit({ seed }), color: 0xb07a48, fog: false })); m.position.set(x, y, z); m.userData.glow = glow || 2; m.userData.ink = 0.3; court.add(m); windows.push(m); return m; };
  for (let i = 0; i < 6; i++) for (const y of [3.0, 6.6]) { const x = -6.6 + i * 2.2; if (Math.abs(x) < 1.6 && y < 4) continue; glowWin(0.9, 1.6, x, y, 3.02, 40 + i + y, 0.9);
    O.box(court, 1.2, 0.16, 0.25, M.stoneWarm, x, y - 0.88, 3.05); O.box(court, 1.2, 0.2, 0.2, M.stoneWarm, x, y + 0.9, 3.05); }
  glowWin(1.2, 2.2, 4.8, 12.0, 3.32, 60, 1.0); glowWin(1.0, 1.8, 4.8, 7.2, 3.32, 61, 0.9);
  // the door: an arch of stone, the doors open, warm light inside
  const dg = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({ color: 0x9a5e2c, fog: false })); dg.position.set(0, 1.6, 3.01); dg.userData.glow = 0.8; dg.userData.ink = 0.2; court.add(dg); windows.push(dg);
  for (const s of [-1, 1]) { O.box(court, 0.5, 3.6, 0.5, M.stoneWarm, s * 1.35, 1.8, 3.1); O.box(court, 1.1, 3.1, 0.08, M.plank, s * 1.65, 1.55, 3.6, { ry: s * -1.1 }); }
  O.box(court, 3.2, 0.6, 0.5, M.stoneWarm, 0, 3.75, 3.1);
  for (let i = 0; i < 3; i++) O.box(court, 4.4 - i * 0.4, 0.18, 0.6, M.stone, 0, 0.09 + i * 0.18, 3.9 - i * 0.35);
  const lamps = [];
  for (const s of [-1, 1]) { const lp = O.lamp({ h: 2.8, intensity: 2.5, distance: 7 }); lp.rotation.y = s > 0 ? Math.PI : 0; lp.position.set(s * 2.6, 0, 4.0); court.add(lp); lamps.push(lp); }
  // the square in front of it: wider, flagstones
  const flags = P.flags({ seed: 22, cols: 4, rows: 4, base: ["#6e6a66", "#64605c", "#7a746c", "#5a5652"] }); flags.repeat.set(1 / 2.5, 1 / 2.5);
  const sq = new THREE.PlaneGeometry(22, 8); { const uv = sq.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 22, uv.getY(i) * 8); }
  const sqm = new THREE.Mesh(sq, new THREE.MeshLambertMaterial({ map: flags, polygonOffset: true, polygonOffsetFactor: -1 })); sqm.rotation.x = -Math.PI / 2; sqm.position.set(0, 0.005, CZ + 7); sqm.userData.ink = 0.4; add(sqm, { cast: false });
  // the town wall's skyline behind, to close the view: dark roofs and a second tower as one far cut row
  for (let i = 0; i < 6; i++) { const h = O.house({ seed: 70 + i, w: 5, d: 5, floors: 2, lit: 0.3, door: false, gable: i % 2 === 0 }); lit(h); put(h, -16 + i * 6.4 + (i > 2 ? 6 : 0), 0, CZ - 6, 0, { cast: false }); }

  // ---- dressing along the street
  const barrels = (x, z, n, seed) => { const r = O.rng(seed); const G = new THREE.Group(); for (let i = 0; i < n; i++) { const b = O.barrel({ h: 0.85 + r() * 0.15 }); b.position.set((i % 2) * 0.62 + (r() - 0.5) * 0.1, i > 1 ? 0.9 : 0, Math.floor(i / 2) * 0.1 + (r() - 0.5) * 0.15 - (i > 1 ? 0.3 : 0)); if (i > 1) b.position.x = 0.31; G.add(b); } return put(G, x, 0, z); };
  barrels(1.7, 2.2, 3, 1);                        // near the start, right: a stack
  put(O.crates({ seed: 4, sack: false }), -2.2, 0, -1.6, 0.4);
  const lampG = O.lamp({ h: 3.1, intensity: 4.2, distance: 10 }); put(lampG, 2.35, 0, -4.4, Math.PI); lamps.push(lampG);   // the lantern leans out over the street
  put(O.cart({}), -1.75, 0, -13.5, 0.12);
  barrels(-2.3, -26.5, 4, 2);
  put(O.crates({ seed: 7, n: 2 }), 2.2, 0, -18.0, -0.3);
  // the well where the street widens
  const wellG = O.well(); put(wellG, 1.0, 0, -21.6, 0.3);
  { const b = O.barrel({ h: 0.7, r: 0.26 }); put(b, 2.1, 0, -22.4); }
  // signs on brackets, a hanging sign, washing on a line between upper floors
  const signTex = (() => { const [c, gg] = O.canvas(256, 192); gg.fillStyle = "#6a3a22"; gg.fillRect(0, 0, 256, 192); gg.strokeStyle = "#221a22"; gg.lineWidth = 12; gg.strokeRect(6, 6, 244, 180);
    gg.fillStyle = "#d9a43a"; gg.beginPath(); gg.ellipse(128, 100, 52, 38, 0, 0, 7); gg.fill(); gg.fillStyle = "#6a3a22"; gg.fillRect(70, 90, 116, 14); const t = O.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })();
  for (const [x, z, s] of [[-2.9, -8.0, 1], [2.9, -15.5, -1]]) { const sg = new THREE.Group(); O.box(sg, 1.0, 0.05, 0.05, M.iron, s * 0.5, 0, 0); const pl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.8), new THREE.MeshLambertMaterial({ map: signTex })); pl.position.set(s * 0.75, -0.4, 0); pl.castShadow = true; sg.add(pl); put(sg, x, 4.0, z); }

  // ---- an extra: a plank market stage in the middle of the street (2.8 x 1.9 m, floor 0.55 m up, a beam frame behind),
  // hidden until the story calls road.setStage(1) (once, before the camera is made, or as a pure function of t)
  const stageG = new THREE.Group(); stageG.visible = false; root.add(stageG);
  O.box(stageG, 2.8, 0.1, 1.9, M.plank, 0, 0.5, -9.0, { ink: 0.9 });
  for (const [x, z] of [[-1.3, -8.15], [1.3, -8.15], [-1.3, -9.85], [1.3, -9.85]]) O.box(stageG, 0.14, 0.5, 0.14, M.beam, x, 0.25, z);
  O.box(stageG, 2.8, 0.36, 0.06, M.plankGrey, 0, 0.27, -8.06, { ink: 0.9 });
  for (const s of [-1, 1]) O.box(stageG, 0.1, 1.6, 0.1, M.beam, s * 1.35, 1.3, -9.85);
  O.box(stageG, 2.8, 0.1, 0.1, M.beam, 0, 2.1, -9.85);
  function setStage(k) { stageG.visible = k > 0.5; }

  // ---- the sky: deep blue, stars, the moon above the courthouse (to the left)
  const sky = O.sky(stage, group, { night: true, stars: true, top: "#070c24", mid: "#12204a", horizon: "#2c3c6e", below: "#141a30",
    moon: { az: -0.04, el: 0.27, size: 4.2 }, clouds: [{ seed: 31, az: 0.25, el: 0.3, w: 18 }, { seed: 32, az: -0.7, el: 0.2, w: 14 }] });
  // the day sky is built the first time a frame asks for the day: a film that never uses it renders exactly as before
  let skyDay = null;
  const daySky = () => skyDay || (skyDay = O.sky(stage, group, { top: "#3f78cc", mid: "#76a8e2", horizon: "#dde7ee", below: "#b9b0a0",
    clouds: [{ seed: 33, az: 0.3, el: 0.3, w: 18 }, { seed: 34, az: -0.6, el: 0.2, w: 15 }, { seed: 35, az: 0.05, el: 0.5, w: 20 }, { seed: 36, az: 1.2, el: 0.25, w: 16 }] }));

  // ---- light: moonlight (blue, shadows) from behind the courthouse on the left; dark blue sky light; warm windows
  const hemi = new THREE.HemisphereLight(0x5a7ac4, 0x1e1a2c, 0.95); root.add(hemi);
  const moon = new THREE.DirectionalLight(0xa8bcff, 2.1); moon.position.set(-14, 22, -26); moon.target.position.set(0, 0, -10); root.add(moon); root.add(moon.target);
  moon.castShadow = true; moon.shadow.mapSize.set(4096, 4096); { const c = moon.shadow.camera; c.left = -26; c.right = 26; c.top = 30; c.bottom = -30; c.near = 1; c.far = 90; }
  moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.03; moon.shadow.radius = 2.5;
  const fill = new THREE.DirectionalLight(0x6a80c8, 0.35); fill.position.set(4, 6, 14); root.add(fill);   // a weak front fill so faces toward the camera still read
  // a few warm pools from windows and the courthouse door (point lights, no shadow, cheap)
  const pools = [];
  for (const [x, y, z, k] of [[-2.2, 2.4, -10.6, 0.7], [2.4, 2.4, -19.8, 0.7], [0, 2.0, CZ + 5.0, 1.6]]) {
    const pl = new THREE.PointLight(0xffa850, k, 7, 1.6); pl.position.set(x, y, z); root.add(pl); pools.push(pl); }

  // ---- the eight hiding places, in the order the camera passes them going away from the start
  const dL = houses.L.map(doorOf), dR = houses.R.map(doorOf);
  const corners = [
    { pos: [1.2, 0, 2.05], ry: 0.3, kind: "behind barrels" },
    { pos: [dL[1][0] - 0.15, 0.16, dL[1][2]], ry: Math.PI / 2, kind: "doorway" },
    { pos: [3.1, houses.R[1].userData.eave + 0.82, 0.6], ry: -Math.PI / 2, kind: "roof" },
    { pos: [-1.6, 0, -12.7], ry: 0.5, kind: "under the cart" },
    { pos: [dR[3][0] + 0.15, 0.16, dR[3][2]], ry: -Math.PI / 2, kind: "doorway" },
    { pos: [1.1, 0.86, -20.95], ry: 0.2, kind: "on the well" },
    { pos: [-3.1, houses.L[4].userData.eave + 0.82, -16.6], ry: Math.PI / 2, kind: "roof" },
    { pos: [-1.55, 0, -25.9], ry: 0.4, kind: "behind barrels" },
  ];
  const LP = lampG.userData.lantern;     // the lantern, local to the lamp group (which is turned by PI)
  const lampW = [2.35 - LP[0], LP[1], -4.4];
  const spots = {
    start: W(0.2, 0, 6.2),
    gate: W(0, 0.54, CZ + 3.4),
    corners: corners.map((c) => ({ pos: W(c.pos[0], c.pos[1], c.pos[2]), ry: c.ry, facing: [Math.sin(c.ry), 0, Math.cos(c.ry)], kind: c.kind })),
    bigcat: W(1.55, 0, -4.1),
    lamp: W(lampW[0], lampW[1], lampW[2]),
    well: W(1.0, 0, -21.6),
    stage: W(0, 0.55, -9.0),          // the market stage's floor (road.setStage(1) shows it)
    dance: W(1.35, 0, -3.6),          // the lantern's pool of light, a place to dance
  };
  const views = {
    v20: { pos: W(-0.6, 1.7, 9.5), look: W(0.3, 2.6, -30), fov: 44, set: "road" },
    v21: { pos: W(0.9, 0.55, 8.4), look: W(0.2, 0.35, 6.2), fov: 40, set: "road" },
    v22a: { pos: W(0.2, 1.1, 5.0), look: W(0.6, 0.8, -2), fov: 44, set: "road" },
    v22b: { pos: W(0.1, 1.3, -10), look: W(0.2, 0.9, -20), fov: 44, set: "road" },
    v23: { pos: W(1.05, 0.95, -2.3), look: W(1.55, 0.8, -4.1), fov: 40, set: "road" },
  };
  for (const w of windows) { w.userData.baseColor = w.material.color.clone(); w.userData.glow0 = w.userData.glow; }
  let winK = 1, dayK = 0;                // the window colour follows both: setWindows(k) from a story, the day from the mood
  const paintWindows = () => { for (const w of windows) { w.material.color.copy(w.userData.baseColor).multiplyScalar((0.15 + 0.85 * winK) * (1 - 0.75 * dayK)); w.userData.glow = w.userData.glow0 * (1 - dayK); } };
  function setWindows(k) { winK = k; paintWindows(); }

  // ---- day: what the set's own lights do (moodDay does the rest). Pure in k: the night values come back at k = 0.
  const C = (h) => new THREE.Color(h), lerpC = (a, b, k) => a.clone().lerp(b, k), lerp = (a, b, k) => a + (b - a) * k;
  const NIGHT = { key: C(0xa8bcff), keyI: 2.1, keyP: [-14, 22, -26], hemiS: C(0x5a7ac4), hemiG: C(0x1e1a2c), hemiI: 0.95, fill: C(0x6a80c8), fillI: 0.35 };
  const DAY = { key: C(0xffe2bc), keyI: 2.9, keyP: [-13, 26, 12], hemiS: C(0x9cc0ff), hemiG: C(0x8a7458), hemiI: 0.8, fill: C(0xfff0dc), fillI: 0.3 };
  const lampLights = lamps.map((l) => l.userData.light).filter(Boolean), lampI = lampLights.map((l) => l.intensity), poolI = pools.map((l) => l.intensity);
  const glass = lamps.map((l) => l.userData.glass).filter(Boolean); for (const g of glass) { g.userData.glow0 = g.userData.glow; g.userData.col0 = g.material.color.clone(); }
  function setDay(k, st) {
    k = Math.max(0, Math.min(1, k || 0)); dayK = k; const d = k >= 0.5;
    moon.color.copy(lerpC(NIGHT.key, DAY.key, k)); moon.intensity = lerp(NIGHT.keyI, DAY.keyI, k);
    moon.position.set(lerp(NIGHT.keyP[0], DAY.keyP[0], k), lerp(NIGHT.keyP[1], DAY.keyP[1], k), lerp(NIGHT.keyP[2], DAY.keyP[2], k));
    hemi.color.copy(lerpC(NIGHT.hemiS, DAY.hemiS, k)); hemi.groundColor.copy(lerpC(NIGHT.hemiG, DAY.hemiG, k)); hemi.intensity = lerp(NIGHT.hemiI, DAY.hemiI, k);
    fill.color.copy(lerpC(NIGHT.fill, DAY.fill, k)); fill.intensity = lerp(NIGHT.fillI, DAY.fillI, k);
    lampLights.forEach((l, i) => { l.intensity = lampI[i] * (1 - k); }); pools.forEach((l, i) => { l.intensity = poolI[i] * (1 - k); });
    for (const g of glass) { g.userData.glow = g.userData.glow0 * (1 - k); g.material.color.copy(g.userData.col0).multiplyScalar(1 - 0.5 * k); }
    paintWindows();
    sky.rig.visible = !d; ground.material.map = d ? dirtDay : dirt;
    if (d) {                                    // the day sky rides with the camera (its own hook does it from the next frame on)
      const sd = daySky(), cam = (st || stage || {}).camera; sd.rig.visible = true;
      if (cam) { const p = cam.position; sd.rig.position.set(p.x - group.position.x, p.y - group.position.y, p.z - group.position.z); sd.rig.updateMatrixWorld(true); }
    } else if (skyDay) skyDay.rig.visible = false;
  }
  const mood = { day: 0, clear: 0x0b1230, fog: [0x1a2446, 14, 62], grade: { sat: 1.4, warmAmt: 0.3, shadowTint: [0.78, 0.86, 1.25], shadowAmt: 0.6, vignette: 0.55 }, glow: { haze: 0.0025, amount: 1.1 } };
  const moodDay = { day: 1, clear: 0x9cc0e8, fog: [0xd6e0e8, 30, 120], glow: { haze: 0.0008, amount: 0.8 },
    // a clear day: the field's day grade (less saturation and contrast than the night's, a light shadow tint, a soft vignette)
    grade: { sat: 1.22, satRed: 0.8, contrast: 1.06, curve: 0.3, pivot: 0.45, shadowTint: [0.9, 0.94, 1.1], shadowAmt: 0.3, warm: [1.04, 1.0, 0.93], warmAmt: 0.35, lift: [0.02, 0.02, 0.03], vignette: 0.3 } };

  return {
    name: "road", group, origin: [OX, 0, 0], spots,
    mood, moodDay, onMood: (m, st) => setDay(m && typeof m.day === "number" ? m.day : 0, st), setDay, setStage,
    moon, sun: moon, hemi, lamp: lampG, lamps, windows, sky, views, setWindows, houses, corners: spots.corners,
  };
};
