/* sets/field.js: the eaten barley field, a bright warm afternoon (France, about 1510). Views 5, 6, 7, 13, 14.
 *
 *   const field = RT.sets.field(stage);    // a set object (PLAN.md): { name, group, origin, spots, mood, ... }
 *
 * Layout (local metres; the set sits at world x = 300, so every spot below is WORLD = local + [300, 0, 0]):
 *   - a stubble field x -21..21, z -15..17: a painted ground of furrows and cut stalks, ~9,000 real stalks in one mesh,
 *     a few whole stalks with drooping ears still standing (round the farmer, by the barn); a dirt track to the barn
 *   - the barn at the back (x -2.5, z -7): timber frame, plaster, a thatched roof, big double doors; on the right leaf
 *     a summons with a red seal is nailed at rat height (y 0.32 .. 0.8)
 *   - a cart, barrels, crates, a fence, a big tree, hedges round the field
 *   - beyond: rolling hills (one terrain of patchwork fields rising to ~16 m), seven villages on them as cut-outs, tree cut-outs
 *   - a big blue sky with flat cartoon clouds (a dome that rides with the camera)
 *   - light: a low warm sun from the front left (long shadows to the back right), blue sky light in the shade
 *
 * Spots (world): rats (3 places in the stubble, cleared of stalks), farmer, barndoor (the notice itself, on the door),
 *   reader (the ground in front of the notice, where a rat stands to read it), vista (a high camera point) and vistaLook,
 *   plus villages (7 points, one in front of each village, for the rats that pop up in view 13; extra, not in the plan).
 * Also returned: sun, hemi, notice (the mesh), barn (group), views (suggested cameras for 5, 6, 7, 7b, 13, 14; local to
 *   nothing: world positions), heightAt(x, z) (terrain height, world x/z).
 */
window.RT = window.RT || {}; RT.sets = RT.sets || {};
RT.sets.field = function (stage) {
  "use strict";
  const O = SF.outdoor, P = SF.paint, M = O.mats(), OX = 300;
  const group = new THREE.Group(); group.name = "set:field";
  const root = new THREE.Group(); root.position.set(OX, 0, 0); group.add(root);   // build in local metres; the group itself stays at 0
  if (stage && stage.scene && !stage.addSet) stage.scene.add(group);               // without D's addSet, put it in the scene ourselves
  const W = (x, y, z) => [x + OX, y, z];
  const add = (m, o) => { o = o || {}; if (m.isMesh) { m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false; } if (o.ink != null) m.userData.ink = o.ink; root.add(m); return m; };
  const put = (obj, x, y, z, ry, o) => { obj.position.set(x, y, z); if (ry) obj.rotation.y = ry; o = o || {};
    obj.traverse((m) => { if (m.isMesh && !m.userData.noDepth && !m.userData.card) { m.castShadow = o.cast !== false; m.receiveShadow = true; } }); root.add(obj); return obj; };
  const FAR = 200;   // the camera far limit this set needs (the vista)
  const sm = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

  // ---- the stubble field (its own tiled ground) and the terrain of hills around it
  const FX0 = -21, FX1 = 21, FZ0 = -15, FZ1 = 17;
  const stub = O.paint.stubble({ seed: 3, base: "#bfa36a" }); stub.repeat.set(1 / 3.2, 1 / 3.2);
  const fg = new THREE.PlaneGeometry(FX1 - FX0, FZ1 - FZ0, 42, 32); { const uv = fg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (FX1 - FX0), uv.getY(i) * (FZ1 - FZ0)); }
  P.shade(fg, (x, y) => 0.82 + 0.18 * Math.sin(x * 0.35 + 1.3) * Math.sin(y * 0.27) + 0.06 * Math.sin(x * 1.3 + y));
  const fieldM = new THREE.MeshLambertMaterial({ map: stub, vertexColors: true });
  const fieldMesh = new THREE.Mesh(fg, fieldM); fieldMesh.rotation.x = -Math.PI / 2; fieldMesh.position.set((FX0 + FX1) / 2, 0, (FZ0 + FZ1) / 2); add(fieldMesh, { cast: false });

  const hBase = (x, z) => 7 + 4.5 * Math.sin(x * 0.075 + 1.0) + 3 * Math.sin(z * 0.12 + 0.4) + 2.2 * Math.sin((x - z) * 0.045) + 1.2 * Math.sin(x * 0.21 + z * 0.13);
  const outside = (x, z) => Math.hypot(Math.max(0, FX0 - x, x - FX1), Math.max(0, FZ0 - z, z - FZ1));
  const height = (x, z) => { const d = outside(x, z); return d <= 0 ? -0.05 : sm(0, 12, d) * 1.4 + sm(8, 55, d) * hBase(x, z) * 0.95 + Math.max(0, -z - 34) * 0.18 - 0.05; };
  const TW = 270, TD = 250, TZ = -25;
  const tg = new THREE.PlaneGeometry(TW, TD, 180, 166); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, TZ);
  { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i))); tg.computeVertexNormals(); }
  P.shade(tg, (x, y, z) => 0.85 + 0.15 * sm(-0.5, 8, y));
  const pw = O.paint.patchwork({ seed: 9 }); pw.repeat.set(2.0, 1.8);
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ map: pw, vertexColors: true })); terrain.userData.ink = 0.7; add(terrain, { cast: false });

  // ---- the barn: timber frame, plaster, thatch, big double doors with Z braces and iron straps
  const BX = -2.5, BZ = -7, bw = 7.5, bd = 6;
  const barn = O.house({ seed: 5, w: bw, d: bd, floors: 1, floorH: 4.0, jetty: 0, roof: "thatch", door: false, pitch: 0.9, chimney: false });
  // its ground-floor windows: barns get a small dark vent high up instead (move them up and shrink)
  for (const wmesh of barn.userData.windows) { wmesh.scale.set(0.6, 0.5, 1); wmesh.position.y = 3.2; wmesh.position.x = wmesh.position.x > 0 ? 2.9 : -2.9; }
  put(barn, BX, 0, BZ);
  const bf = BZ + bd / 2;                                                       // the barn's front face (z)
  const dw = 2.6, dh = 2.9;
  const opening = new THREE.Mesh(new THREE.PlaneGeometry(dw + 0.1, dh), M.dark); opening.position.set(BX, 0.5 + dh / 2 - 0.25, bf + 0.01); add(opening, { cast: false });
  const doorM = O.lam(O.tile(P.planks({ seed: 41, count: 4, base: "#86664a", vertical: true }), 1.3));
  const leaves = [];
  for (const s of [-1, 1]) {
    const lf = new THREE.Group(); lf.position.set(BX + s * dw / 2, 0, bf + 0.08); root.add(lf);
    const board = O.box(lf, dw / 2 - 0.03, dh, 0.08, M.plank, -s * (dw / 4), dh / 2 + 0.02, 0);
    for (const y of [0.18, dh - 0.3]) O.box(lf, dw / 2 - 0.12, 0.16, 0.06, M.beam, -s * dw / 4, y, 0.07);
    const L = Math.hypot(dw / 2 - 0.3, dh - 0.48); O.box(lf, 0.14, L, 0.05, M.beam, -s * dw / 4, dh / 2, 0.07, { rz: s * Math.atan2(dw / 2 - 0.3, dh - 0.48) });   // the Z brace
    for (const y of [0.18, dh - 0.3]) O.box(lf, dw / 2 * 0.55, 0.05, 0.03, M.iron, -s * (0.12 + dw / 2 * 0.275), y, 0.115, { cast: false });                // iron straps
    lf.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
    leaves.push(lf);
  }
  O.box(root, dw + 0.5, 0.26, 0.22, M.beam, BX, dh + 0.15, bf + 0.1); for (const s of [-1, 1]) O.box(root, 0.22, dh + 0.1, 0.22, M.beam, BX + s * (dw / 2 + 0.12), dh / 2, bf + 0.1);
  // the notice, nailed to the right leaf at rat height (a rat stands about 0.5 m tall)
  const NX = BX + dw / 4 + 0.05, NY = 0.56, NW = 0.38, NH = 0.5;
  const notice = new THREE.Mesh(new THREE.PlaneGeometry(NW, NH), new THREE.MeshLambertMaterial({ map: O.paint.notice({ seed: 4 }), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 }));
  notice.position.set(NX, NY, bf + 0.19); notice.rotation.z = -0.04; notice.userData.ink = 0.4; add(notice, { cast: false });
  // straw and dirt at the door, a track from the door toward the camera
  const dirt = O.paint.dirt({ seed: 6, base: "#9a7a52" }); dirt.repeat.set(1 / 4, 1 / 4);
  const tr = new THREE.PlaneGeometry(2.6, 22, 4, 22); { const uv = tr.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.6, uv.getY(i) * 22); const p = tr.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + Math.sin(p.getY(i) * 0.25) * 0.5); }
  const track = new THREE.Mesh(tr, new THREE.MeshLambertMaterial({ map: dirt, polygonOffset: true, polygonOffsetFactor: -1 })); track.rotation.x = -Math.PI / 2; track.position.set(BX, 0.004, bf + 11); track.userData.ink = 0.2; add(track, { cast: false });
  const trackX = (z) => BX + Math.sin(-(z - (bf + 11)) * 0.25) * 0.5;

  // ---- farmyard dressing
  put(O.cart({}), BX + 6.6, 0, BZ + 1.2, -0.5);
  put(O.barrel({}), BX - 4.6, 0, bf + 0.6); put(O.barrel({ h: 0.8, r: 0.28 }), BX - 4.0, 0, bf + 1.0); { const b = O.barrel({}); b.rotation.z = Math.PI / 2; put(b, BX - 4.5, 0.32, bf + 1.6, 0.3); }
  put(O.crates({ seed: 3 }), BX - 6.2, 0, bf + 0.3, 0.2);
  put(O.fence({ len: 9, seed: 2 }), 9.5, 0, -2.0, 0.15); put(O.fence({ len: 7, seed: 3 }), -12, 0, -3.0, -0.1);
  put(O.tree({ seed: 4, h: 9 }), -11, 0, -9); put(O.tree({ seed: 6, h: 7 }), 12.5, 0, -11); put(O.tree({ seed: 8, h: 6 }), 17, 0, 4);
  for (const [x, z, len, ry] of [[-11, -15.2, 20, 0], [11.5, -15.2, 19, 0], [-21.2, 0, 30, Math.PI / 2], [21.2, 0, 30, Math.PI / 2]]) put(O.hedge({ seed: x * 3 + z, len }), x, 0, z, ry);
  { // a hay rick by the barn: a thatched cone on a round stack
    const hay = new THREE.Group(); const c1 = O.cyl(hay, 1.3, 1.4, 1.6, M.thatch, 0, 0.8, 0, 18); const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.8, 18), M.thatch); c2.position.y = 2.5; hay.add(c2);
    put(hay, BX + 6.0, 0, BZ - 3.0); }

  // ---- the stubble: thousands of cut stalks in one mesh, cleared where the track, the barn and the rats are
  const spots = {};
  const RATS = [[2.0, 3.4], [2.55, 3.85], [3.05, 3.3]];
  const clear = (x, z) => {
    if (Math.abs(x - trackX(z)) < 1.5 && z > bf - 0.2) return false;
    if (x > BX - bw / 2 - 1.2 && x < BX + bw / 2 + 1.2 && z < bf + 1.2 && z > BZ - bd / 2 - 1) return false;
    if (x > BX - 7 && x < BX - 3.4 && z > bf - 0.5 && z < bf + 2.4) return false;          // barrels, crates
    if (x > BX + 4.5 && x < BX + 8.8 && z > BZ - 4.6 && z < BZ + 3.6) return false;          // cart, rick
    for (const [rx, rz] of RATS) if (Math.hypot(x - rx, z - rz) < 0.34) return false;
    return true;
  };
  const NEAR = [-1.5, -1.5, 8.5, 8.5], inNear = (x, z) => x > NEAR[0] && x < NEAR[2] && z > NEAR[1] && z < NEAR[3];
  add(O.stalks({ seed: 7, n: 9000, area: [FX0 + 0.5, FZ0 + 1, FX1 - 0.5, FZ1 - 0.2], keep: (x, z) => clear(x, z) && !inNear(x, z), h: 0.13, r: 0.006, color: [0.82, 0.6, 0.27] }), { cast: true });
  const rows = add(O.stubbleRows({ seed: 8, area: NEAR, keep: clear, h: 0.11, gap: 0.15, step: 0.075 }), { cast: true });    // cut barley in drilled rows where the close views are
  // a few whole stalks still standing (with ears), round the farmer and by the barn
  const FARMER = [5.6, 0.6];
  add(O.stalks({ seed: 9, n: 14, area: [FARMER[0] - 1.6, FARMER[1] - 1.5, FARMER[0] + 1.8, FARMER[1] + 0.6], keep: (x, z) => Math.hypot(x - FARMER[0], z - FARMER[1]) > 0.5, h: 0.95, r: 0.011, ears: true, ink: 0.6 }));
  add(O.stalks({ seed: 10, n: 22, area: [BX + 4.6, bf - 0.6, BX + 7.5, bf + 2.0], keep: () => true, h: 0.9, r: 0.011, ears: true, ink: 0.6 }));
  add(O.stalks({ seed: 11, n: 30, area: [-18, -14, 18, -10], keep: () => true, h: 0.9, r: 0.012, ears: true, ink: 0.4 }));

  // ---- the hills: villages and trees as cut-outs, standing on the terrain, turned toward the vista
  const VISTA = [12, 50, 98], VLOOK = [-3, 0, -6];
  const VILL = [[-30, -28, 12], [-12, -36, 13], [8, -34, 12], [26, -26, 11], [-36, -10, 10], [34, -8, 10], [-20, -20, 9], [20, -40, 11], [-2, -24, 9], [-26, -41, 11],
    [-44, 14, 12], [42, 18, 12], [-32, 34, 12], [28, 40, 12], [-6, 44, 11], [-58, -30, 13], [56, -26, 13], [-10, -62, 14], [24, -66, 14], [-40, -60, 13], [50, 50, 12]];
  const villages = [];
  VILL.forEach(([x, z, w], i) => {
    const v = O.village(100 + i, { w, ground: "#86a04c" }); const ry = Math.atan2(VISTA[0] - x, VISTA[2] - z), cx = Math.cos(ry) * w * 0.45, cz = -Math.sin(ry) * w * 0.45;
    const y = Math.max(height(x, z), height(x + cx, z + cz), height(x - cx, z - cz)) - 0.35;
    v.position.set(x, y, z); v.rotation.y = ry; root.add(v);
    villages.push(W(x, y + 0.35, z + 0.6));
  });
  const rT = O.rng(55);
  for (let i = 0; i < 190; i++) { const x = -110 + rT() * 220, z = -110 + rT() * 180; if (outside(x, z) < 6) continue; if (VILL.some(([vx, vz, w]) => Math.hypot(x - vx, z - vz) < w * 0.6)) continue;
    const t = O.treeCard(200 + i, { h: 4 + rT() * 3, color: rT() < 0.5 ? "#4f7030" : "#62803a" }); t.position.set(x, height(x, z) - 0.2, z); t.rotation.y = Math.atan2(VISTA[0] - x, VISTA[2] - z) * 0.6; root.add(t); }

  // ---- the sky and its clouds
  const sky = O.sky(stage, group, { top: "#3f78cc", mid: "#76a8e2", horizon: "#dde7ee", below: "#c8d8a8",
    clouds: [{ seed: 1, az: -0.25, el: 0.32, w: 22 }, { seed: 2, az: 0.35, el: 0.22, w: 18 }, { seed: 3, az: 0.9, el: 0.4, w: 20 }, { seed: 4, az: -0.85, el: 0.18, w: 16 },
      { seed: 5, az: 0.05, el: 0.55, w: 24 }, { seed: 6, az: -1.5, el: 0.35, w: 18 }, { seed: 7, az: 1.6, el: 0.25, w: 18 }, { seed: 8, az: 0.6, el: 0.08, w: 14 }, { seed: 9, az: -0.5, el: 0.06, w: 12 }] });

  // ---- light: a low warm afternoon sun from the front left, blue sky light in the shade
  const hemi = new THREE.HemisphereLight(0x9cc0ff, 0x7a5a3a, 0.62); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffdcae, 2.5); sun.position.set(-22, 13, 16); sun.target.position.set(0, 0, -2); root.add(sun); root.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); { const c = sun.shadow.camera; c.left = -24; c.right = 24; c.top = 24; c.bottom = -24; c.near = 1; c.far = 80; }
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;

  Object.assign(spots, {
    rats: RATS.map(([x, z]) => W(x, 0, z)),
    farmer: W(FARMER[0], 0, FARMER[1]),
    barndoor: W(NX, NY, bf + 0.13),
    reader: W(NX, 0, bf + 0.55),
    vista: W(VISTA[0], VISTA[1], VISTA[2]),
    vistaLook: W(VLOOK[0], VLOOK[1], VLOOK[2]),
    villages,
    barn: W(BX, 0, bf),
  });

  // suggested cameras (world) for the views in this set; E decides
  const views = {
    v5: { pos: W(3.3, 0.75, 5.6), look: W(2.5, 0.12, 3.5), fov: 40, set: "field" },
    v6: { pos: W(3.0, 1.35, 4.6), look: W(5.6, 1.15, 0.6), fov: 38, set: "field" },
    v7: { pos: W(NX - 0.7, 1.5, bf + 7.2), look: W(NX - 0.6, 1.25, bf), fov: 40, set: "field" },
    v7b: { pos: W(NX - 0.15, 0.62, bf + 1.45), look: W(NX, 0.5, bf), fov: 38, set: "field" },
    v13: { pos: W(VISTA[0], VISTA[1], VISTA[2]), look: W(VLOOK[0], VLOOK[1], VLOOK[2]), fov: 50, set: "field" },
    v14: { pos: W(NX - 0.15, 0.7, bf + 2.0), look: W(NX, 0.55, bf), fov: 40, set: "field" },
  };

  return {
    name: "field", group, origin: [OX, 0, 0], spots,
    mood: { clear: 0x9cc0e8, fog: [0xdde7ee, 140, 270], glow: { haze: 0.0004 },
      // a sunny day: less saturation and contrast than the candle-lit court's base grade, lighter shadow tint, a soft vignette
      grade: { sat: 1.22, satRed: 0.8, contrast: 1.06, curve: 0.3, pivot: 0.45, shadowTint: [0.9, 0.94, 1.1], shadowAmt: 0.3, warm: [1.04, 1.0, 0.93], warmAmt: 0.35, lift: [0.02, 0.02, 0.03], vignette: 0.28 } },
    // the vista sees farmland ~180 m away: the camera's far limit must reach it (raised once, never lowered; see the notes)
    onMood(m, st) { const cam = st && st.camera; if (cam && cam.far < FAR) { cam.far = FAR; cam.updateProjectionMatrix(); } },
    sun, hemi, notice, barn, leaves, sky, views, heightAt: (x, z) => height(x - OX, z),
  };
};
