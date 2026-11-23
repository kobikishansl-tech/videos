/* sets/market.js — WorldFrame prototype set: a market square at golden hour (original design).
 *
 *   const market = RT.sets.market(stage);   // a set object: { name, group, origin, spots, mood, moodDay, onMood, setDay, views, ... }
 *
 * Layout (local metres; set at world x = 900; the camera side is +z, looking toward -z):
 *   - a warm flagstone plaza 26 x 18, dirt streets beyond it south (+z) and north (-z)
 *   - NEAR plane (z +3..+7): a handcart, barrels, a lamp, a tree — foreground dressing for close work
 *   - MID plane (z -4..-10): two market stalls with striped awnings (rust, and teal to echo our character),
 *     produce, a crate stack she interacts with, a second lamp, an alley of depth between the houses
 *   - FAR plane (z -14..-18): timber-framed gabled house fronts on both sides and facing the plaza
 *   - SKYLINE (z -24): a far row of houses as a back flat (cast: false)
 *
 * Light (golden hour): a low warm sun key from front-left with long shadows, sky-hemisphere fill,
 * a warm camera-side fill so faces read, and a warm rim from behind the plaza. setDay(k) blends
 * golden hour (0) to clear noon (1). Default mood IS the golden hour (day: 0); moodDay = noon.
 *
 * Spots (world): enter (south edge), south (mid-street), center, stall (front of the teal stall),
 *   crates (the crate stack she interacts with), alley, lamp, door, cart.
 */
window.RT = window.RT || {}; RT.sets = RT.sets || {};
RT.sets.market = function (stage) {
  "use strict";
  const O = SF.outdoor, P = SF.paint, M = O.mats(), OX = 900;
  const group = new THREE.Group(); group.name = "set:market";
  const root = new THREE.Group(); root.position.set(OX, 0, 0); group.add(root);
  if (stage && stage.scene && !stage.addSet) stage.scene.add(group);
  const W = (x, y, z) => [x + OX, y, z];
  const add = (m, o) => { o = o || {}; if (m.isMesh) { m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false; } if (o.ink != null) m.userData.ink = o.ink; root.add(m); return m; };
  const put = (obj, x, y, z, ry, o) => { obj.position.set(x, y, z); if (ry) obj.rotation.y = ry; o = o || {};
    obj.traverse((m) => { if (m.isMesh && !m.userData.noDepth && !m.userData.card) { m.castShadow = o.cast !== false; m.receiveShadow = true; } }); root.add(obj); return obj; };
  const lit = (G) => { if (G.userData.windows) for (const w of G.userData.windows) if (w.userData.glow) windows.push(w); return G; };
  const windows = [];

  // ---------- ground: warm stone plaza + dirt streets beyond it, shaded darker along the house fronts ----------
  const flags = P.flags({ seed: 31, cols: 5, rows: 5, base: ["#a89274", "#9c876c", "#b29c7c", "#8e7a64", "#a4906e"] }); flags.repeat.set(1 / 2.4, 1 / 2.4);
  const plaza = new THREE.PlaneGeometry(26, 18); { const uv = plaza.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 26, uv.getY(i) * 18); }
  P.shade(plaza, (x, y) => 0.72 + 0.28 * Math.max(0, 1 - Math.max(0, Math.abs(x) - 6) / 5));
  const plazaM = new THREE.Mesh(plaza, new THREE.MeshLambertMaterial({ map: flags, polygonOffset: true, polygonOffsetFactor: -1 }));
  plazaM.rotation.x = -Math.PI / 2; plazaM.position.set(0, 0.004, -5); plazaM.userData.ink = 0.4; add(plazaM, { cast: false });

  const dirt = O.paint.dirt({ seed: 31, base: "#9c8868" }); dirt.repeat.set(1 / 5, 1 / 5);
  const dg = new THREE.PlaneGeometry(30, 30, 30, 30); { const uv = dg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 30, uv.getY(i) * 30); }
  P.shade(dg, (x, y) => 0.72 + 0.28 * Math.max(0, 1 - Math.max(0, Math.abs(x) - 6) / 5));
  const ground = new THREE.Mesh(dg, new THREE.MeshLambertMaterial({ map: dirt, vertexColors: true }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -14); add(ground, { cast: false });
  const dirtS = O.paint.dirt({ seed: 32, base: "#9c8868" }); dirtS.repeat.set(1 / 5, 1 / 5);
  const dgS = new THREE.PlaneGeometry(30, 16, 24, 12); { const uv = dgS.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 30, uv.getY(i) * 16); }
  const south = new THREE.Mesh(dgS, new THREE.MeshLambertMaterial({ map: dirtS, vertexColors: true }));
  south.rotation.x = -Math.PI / 2; south.position.set(0, 0, 8); add(south, { cast: false });
  for (const s of [-1, 1]) O.box(root, 0.34, 0.12, 18, M.stone, s * 6.6, 0.06, -5, { cast: false });   // kerbs

  // ---------- houses: rows of jettied timber-framed fronts on the sides (MID/FAR), a far row (SKYLINE) ----------
  const L = [[4.5, 5.4, 3, 1], [-2.5, 5.0, 2, 2], [-9.5, 5.6, 3, 3]];      // [z, w, floors, seed]
  const R = [[3.5, 5.2, 2, 4], [-4.0, 5.8, 3, 5], [-11.0, 4.6, 2, 6]];
  const houses = { L: [], R: [] };
  for (const [z, w, fl, seed] of L) { const h = lit(O.house({ seed, w, d: 6, floors: fl, jetty: 0.42, lit: 0, gable: seed % 3 !== 0, doorX: seed % 2 ? -0.6 : 0.6 })); put(h, -6.8, 0, z, Math.PI / 2); houses.L.push(h); }
  for (const [z, w, fl, seed] of R) { const h = lit(O.house({ seed, w, d: 6, floors: fl, jetty: 0.42, lit: 0, gable: seed % 3 !== 1, doorX: seed % 2 ? 0.6 : -0.6 })); put(h, 6.8, 0, z, -Math.PI / 2); houses.R.push(h); }
  for (let i = 0; i < 6; i++) { const h = O.house({ seed: 70 + i, w: 4.6, d: 5, floors: i % 2 ? 3 : 2, lit: 0, door: false, gable: i % 2 === 0 }); put(h, -12 + i * 4.9, 0, -24, 0, { cast: false }); }
  const doorOf = (h) => { const d = h.userData.door, v = new THREE.Vector3(d[0], 0, d[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), h.rotation.y); return [h.position.x + v.x, 0, h.position.z + v.z]; };

  // ---------- market stalls (MID plane): posts, counter, striped awning, produce, hanging cloth ----------
  function awningTex(c1, c2, seed) {
    const [c, g] = O.canvas(512, 256);
    const stripes = 8;
    for (let i = 0; i < stripes; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * (512 / stripes), 0, 512 / stripes + 1, 256); }
    const r = O.rng(seed);                                // a little dirt and fray so it is cloth, not plastic
    for (let i = 0; i < 700; i++) { g.fillStyle = "rgba(60,40,30,0.07)"; g.fillRect(r() * 512, r() * 256, 2 + r() * 5, 2 + r() * 3); }
    g.fillStyle = "rgba(40,25,20,0.28)"; g.fillRect(0, 0, 512, 9); g.fillRect(0, 247, 512, 9);
    const t = O.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  function stall(x, z, ry, o) {
    o = o || {}; const G = new THREE.Group();
    const wdt = o.w || 2.4, dep = o.d || 1.1, hcount = 0.85, htop = 2.1;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) O.box(G, 0.09, htop, 0.09, M.beam, sx * (wdt / 2), htop / 2, sz * (dep / 2));
    O.box(G, wdt + 0.14, 0.07, dep + 0.14, M.plank, 0, hcount, 0, { ink: 0.9 });                    // counter
    O.box(G, wdt, 0.34, dep * 0.8, M.plankGrey, 0, hcount - 0.34, 0.05, { ink: 0.7 });              // solid front
    const aw = new THREE.Mesh(new THREE.BoxGeometry(wdt + 0.5, 0.035, dep + 1.0), new THREE.MeshLambertMaterial({ map: awningTex(o.colA || "#b8432e", o.colB || "#f2e6d0", o.seed || 3) }));
    aw.position.set(0, htop + 0.18, -0.35); aw.rotation.x = 0.30; aw.castShadow = true; G.add(aw);
    const hem = new THREE.Mesh(new THREE.BoxGeometry(wdt + 0.5, 0.16, 0.03), new THREE.MeshLambertMaterial({ map: awningTex(o.colA || "#b8432e", o.colB || "#f2e6d0", (o.seed || 3) + 1) }));
    hem.position.set(0, htop - 0.02, 0.78); G.add(hem);
    const r = O.rng((o.seed || 3) * 7 + 1);
    for (let i = 0; i < (o.goods == null ? 14 : o.goods); i++) {
      const px = (r() - 0.5) * (wdt - 0.3), pz = (r() - 0.5) * (dep - 0.34), kind = Math.floor(r() * 3);
      if (kind === 0) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05 + r() * 0.02, 8, 6), O.lam(null, { color: o.fruit || new THREE.Color(0xc03828) })); b.position.set(px, hcount + 0.05, pz); b.castShadow = true; G.add(b); }
      else if (kind === 1) { const b = O.box(G, 0.16, 0.09, 0.11, M.plank, px, hcount + 0.05, pz); b.material.color.offsetHSL(0, 0, 0.08); }
      else { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), O.lam(null, { color: new THREE.Color(0xcbb489) })); s.scale.y = 0.7; s.position.set(px, hcount + 0.05, pz); s.castShadow = true; G.add(s); }
    }
    if (o.cloth !== false) { const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.9), new THREE.MeshLambertMaterial({ color: new THREE.Color(o.clothCol || 0xd9a13a), side: THREE.DoubleSide }));
      cl.position.set(wdt / 2 - 0.3, hcount + 0.42, dep / 2 + 0.03); G.add(cl); }
    return put(G, x, 0, z, ry);
  }
  stall(-2.6, -7.2, 0.12, { seed: 41, colA: "#25b5a3", colB: "#f2e6d0", clothCol: 0x25b5a3, fruit: new THREE.Color(0xd96b28) });   // teal stall (echoes Mila)
  stall(2.7, -7.8, -0.08, { seed: 42, colA: "#b8432e", colB: "#f2e6d0", clothCol: 0x7a3b6e, fruit: new THREE.Color(0xc03828) });   // rust stall

  // ---------- NEAR plane dressing: the crate stack she works at, a handcart, barrels, lamp posts, a tree ----------
  const cratesBig = O.crates({ seed: 51, n: 3, sack: true }); put(cratesBig, 1.7, 0, -9.6, -0.28);
  put(O.crates({ seed: 52, n: 2 }), 2.6, 0, -9.0, 0.5);
  put(O.cart({}), -1.7, 0, 4.6, 0.14);
  const barrels = (x, z, n, seed) => { const r = O.rng(seed); const G = new THREE.Group(); for (let i = 0; i < n; i++) { const b = O.barrel({ h: 0.85 + r() * 0.18 }); b.position.set((i % 2) * 0.6 + (r() - 0.5) * 0.12, i > 1 ? 0.88 : 0, Math.floor(i / 2) * 0.12 + (r() - 0.5) * 0.1); G.add(b); } return put(G, x, 0, z); };
  barrels(-2.5, 5.6, 3, 5);
  const lamp1 = O.lamp({ h: 3.2, intensity: 2.2, distance: 7 }); put(lamp1, 3.1, 0, -3.4, Math.PI);
  const lamp2 = O.lamp({ h: 3.2, intensity: 0.0, distance: 7 }); put(lamp2, -3.1, 0, 2.2, 0);
  put(O.tree({ seed: 9, h: 4.6 }), 5.6, 0, 2.4);
  const bannerCols = [0xb8432e, 0x25b5a3, 0xd9a13a];
  for (const [x0, x1, z, col] of [[-6.4, 6.4, -13.5, bannerCols[0]], [6.6, -4.5, 2.0, bannerCols[1]]]) {
    O.box(root, Math.abs(x1 - x0), 0.03, 0.03, M.iron, (x0 + x1) / 2, 5.02, z, { cast: false });
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.5, 1, 4), new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }));
      const u = i / 3; b.position.set(x0 + (x1 - x0) * u, 4.25, z + Math.sin(i * 1.7) * 0.05); b.castShadow = true; root.add(b); }
  }

  // ---------- the sky: golden hour — blue overhead draining to a warm horizon; standing clouds ----------
  const sky = O.sky(stage, group, { top: "#4f86cf", mid: "#8fb8ea", horizon: "#f6c890", below: "#b9a288",
    clouds: [{ seed: 61, az: 0.35, el: 0.3, w: 18 }, { seed: 62, az: -0.7, el: 0.22, w: 15 }, { seed: 63, az: 0.05, el: 0.5, w: 20 }, { seed: 64, az: 1.2, el: 0.26, w: 16 }] });
  let skyDay = null;
  const daySky = () => skyDay || (skyDay = O.sky(stage, group, { top: "#3e7fd2", mid: "#70adf1", horizon: "#b8d0ec", below: "#b9b0a0",
    clouds: [{ seed: 65, az: 0.3, el: 0.3, w: 18 }, { seed: 66, az: -0.6, el: 0.2, w: 15 }, { seed: 67, az: 0.05, el: 0.5, w: 20 }] }));

  // ---------- light: golden hour. key = low warm sun front-left (long shadows); hemi = sky/ground bounce;
  // fill = warm camera-side fill; rim = warm backlight from the north, no shadow ----------
  const hemi = new THREE.HemisphereLight(0x9cc0ff, 0x8a7458, 1.02); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffcf9a, 3.1); sun.position.set(-11, 6.5, 9); sun.target.position.set(0, 0.8, -6); root.add(sun); root.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  { const c = sun.shadow.camera; c.left = -16; c.right = 16; c.top = 16; c.bottom = -16; c.near = 1; c.far = 60; }
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 2.5;
  const fill = new THREE.DirectionalLight(0xffe8d0, 0.5); fill.position.set(5, 4, 12); root.add(fill);
  const rim = new THREE.DirectionalLight(0xffa060, 1.1); rim.position.set(3, 3.2, -10); rim.target.position.set(0, 1.1, -2); root.add(rim); root.add(rim.target);
  const ambient = new THREE.AmbientLight(0xfff0dc, 0.14); root.add(ambient);

  // ---------- spots + views ----------
  const dL = houses.L.map(doorOf);
  const spots = {
    enter: W(0.4, 0, 7.2),
    south: W(0.9, 0, 4.2),
    center: W(0.2, 0, -1.4),
    stall: W(-1.9, 0, -6.0),
    crates: W(1.55, 0, -8.6),
    alley: W(-4.9, 0, -5.2),
    lamp: W(3.1, 1.9, -3.4),
    door: dL[0] ? W(dL[0][0], 0.1, dL[0][2]) : W(-6.2, 0.1, 4.0),
    cart: W(-1.7, 0, 4.6),
  };
  const views = {
    aWide: { pos: W(2.0, 3.1, 15.5), look: W(-0.2, 1.7, -7), fov: 44 },
    bMed: { pos: W(2.3, 1.5, -4.2), look: W(1.6, 1.1, -8.6), fov: 42 },
    cClose: { pos: W(1.6, 1.45, -6.9), look: W(1.55, 1.25, -8.6)? W(1.55, 1.25, -8.6) : null, fov: 36 },
    dLow: { pos: W(1.6, 0.42, -6.3), look: W(1.55, 1.3, -8.6)? W(1.55, 1.3, -8.6) : null, fov: 40 },
    eTrack: { pos: W(2.4, 1.5, 6.0), look: W(0.9, 1.1, 4.2), fov: 42 },
  };

  // ---------- golden hour -> noon (setDay). Pure in k (0 golden, 1 noon). ----------
  const C = (h) => new THREE.Color(h), lerpC = (a, b, k) => a.clone().lerp(b, k), lerp = (a, b, k) => a + (b - a) * k;
  const GOLD = { key: C(0xffcf9a), keyI: 3.1, keyP: [-11, 6.5, 9], hemiS: C(0x9cc0ff), hemiG: C(0x8a7458), hemiI: 1.02, fill: C(0xffe8d0), fillI: 0.5, rim: C(0xffa060), rimI: 1.1 };
  const NOON = { key: C(0xfff2dc), keyI: 4.0, keyP: [-8, 16, 6], hemiS: C(0xa8ccff), hemiG: C(0x9a8468), hemiI: 1.2, fill: C(0xfff4e4), fillI: 0.4, rim: C(0xffe0b0), rimI: 0.5 };
  function setDay(k, st) {
    k = Math.max(0, Math.min(1, k || 0)); const d = k >= 0.5;
    sun.color.copy(lerpC(GOLD.key, NOON.key, k)); sun.intensity = lerp(GOLD.keyI, NOON.keyI, k);
    sun.position.set(lerp(GOLD.keyP[0], NOON.keyP[0], k), lerp(GOLD.keyP[1], NOON.keyP[1], k), lerp(GOLD.keyP[2], NOON.keyP[2], k));
    hemi.color.copy(lerpC(GOLD.hemiS, NOON.hemiS, k)); hemi.groundColor.copy(lerpC(GOLD.hemiG, NOON.hemiG, k)); hemi.intensity = lerp(GOLD.hemiI, NOON.hemiI, k);
    fill.color.copy(lerpC(GOLD.fill, NOON.fill, k)); fill.intensity = lerp(GOLD.fillI, NOON.fillI, k);
    rim.color.copy(lerpC(GOLD.rim, NOON.rim, k)); rim.intensity = lerp(GOLD.rimI, NOON.rimI, k);
    sky.rig.visible = !d;
    if (d) { const sd = daySky(), cam = (st || stage || {}).camera; sd.rig.visible = true;
      if (cam) { const p = cam.position; sd.rig.position.set(p.x - group.position.x, p.y - group.position.y, p.z - group.position.z); sd.rig.updateMatrixWorld(true); } }
    else if (skyDay) skyDay.rig.visible = false;
  }
  const mood = { day: 0, clear: 0xf6c890, fog: [0xf2d9b0, 34, 130], glow: { haze: 0.0012, amount: 0.9 },
    grade: { sat: 1.35, contrast: 1.03, curve: 0.35, pivot: 0.45, warm: [1.06, 1.0, 0.92], warmAmt: 0.5, lift: [0.04, 0.028, 0.022], shadowTint: [0.92, 0.94, 1.1], shadowAmt: 0.3, vignette: 0.16, vigInner: 0.3, vigOuter: 1.0 } };
  const moodDay = { day: 1, clear: 0x9cc0e8, fog: [0xb8d0ec, 30, 120], glow: { haze: 0.0008, amount: 0.8 },
    grade: { sat: 1.35, contrast: 1.02, curve: 0.35, warmAmt: 0.45, lift: [0.035, 0.022, 0.022], vignette: 0.16, vigInner: 0.3, vigOuter: 1.0 } };

  return {
    name: "market", group, origin: [OX, 0, 0], spots,
    mood, moodDay, onMood: (m, st) => setDay(m && typeof m.day === "number" ? m.day : 0, st), setDay,
    sun, hemi, fill, rim, sky, views, lamp: lamp1, lamps: [lamp1, lamp2], houses,
  };
};
