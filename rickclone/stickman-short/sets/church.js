/* sets/church.js: a village church inside, France about 1510. Dim and gold, shafts of sun through stained glass.
 *
 *   const church = RT.sets.church(stage);   // everything in church.group, placed at origin [600, 0, 0]; spots are WORLD positions
 *
 * Nave (local): x -4..4, z -9 (the altar wall) .. 6 (behind the camera), floor y = 0, walls 6.5 m, a timber roof of tie beams.
 * Sun from the RIGHT through three lancets of stained glass (window-shaped light on the floor and the pews; the glow pass
 * draws the shafts in the air). On the LEFT wall: the raised pulpit (a six-sided tub on a stem, a stair, a back board with
 * a cloth, a sounding board with pinnacles) and, at floor level 1.8 m nearer the camera, a rat hole. Pews in the middle
 * (two near ones for the congregation, more behind), an altar with a painted triptych under a big east window, a rood beam.
 *   spots: pulpit (the tub floor, y 1.5: the priest's feet), pews (4 seats: floor points in front of each seat), hole (the hole's mouth)
 */
window.RT = window.RT || {}; RT.sets = RT.sets || {};
RT.sets.church = function (stage) {
  "use strict";
  const P = SF.paint, K = SF.props, KM = K.mat, O = [600, 0, 0];
  const G = new THREE.Group(); G.name = "set:church"; G.position.set(O[0], O[1], O[2]);
  const W = (x, y, z) => [x + O[0], y + O[1], z + O[2]];
  const tile = (t, m) => { t.repeat.set(1 / m, 1 / m); return t; };
  const T = {
    wall: tile(P.stone({ seed: 211, rows: 10, base: ["#cbb79a", "#bfa98c", "#d6c3a4", "#b29c82", "#c4ae90"], mortar: "#3a2c2a", gap: 6 }), 2.6),
    dress: tile(P.stone({ seed: 212, rows: 6, base: ["#b8a48a", "#c6b296", "#a8947c"], mortar: "#33262a", gap: 7 }), 1.6),
    floor: tile(P.flags({ seed: 213, cols: 4, rows: 4, base: ["#8e7a68", "#7f6c5c", "#9a8572", "#76645a"] }), 2.4),
    oak: tile(P.planks({ seed: 214, count: 6, base: "#7a4a2c", vertical: true }), 1.2),
    dark: tile(P.planks({ seed: 215, count: 6, base: "#4a2e20" }), 1.6),
    linen: tile(P.linenfold({ seed: 216, base: "#6e4428", cols: 2, rows: 1 }), 0.8),
  };
  const lam = (map, color, extra) => new THREE.MeshLambertMaterial(Object.assign({ map, color: color == null ? 0xffffff : color }, extra || {}));
  const M = { wall: lam(T.wall, null, { vertexColors: true }), dress: lam(T.dress), floor: lam(T.floor, null, { vertexColors: true }), oak: lam(T.oak), dark: lam(T.dark),
    linen: lam(T.linen, null, { side: THREE.DoubleSide }), gold: KM.gold, black: new THREE.MeshBasicMaterial({ color: 0x0a0608 }) };
  for (const m of [M.wall, M.dark]) m.shadowSide = THREE.DoubleSide;
  const add = (mesh, o) => { o = o || {}; mesh.castShadow = o.cast !== false; mesh.receiveShadow = o.receive !== false; if (o.ink != null) mesh.userData.ink = o.ink; G.add(mesh); return mesh; };
  const put = (obj, pos, ry, o) => K.place(G, obj, pos, ry, o);
  function box(w, h, d, mat, x, y, z, o) { const m = new THREE.Mesh(K.boxGeo(w, h, d), mat); m.position.set(x, y, z); if (o && o.ry) m.rotation.y = o.ry; return add(m, o); }
  const sm = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const wallShade = (u, v, w, h) => 0.5 + 0.5 * sm(0, 1.2, v) * sm(0, 1.6, h - v) * sm(0, 1.4, u) * sm(0, 1.4, w - u) - 0.1 * sm(0.6, 0, v);
  // a wall from a shape (u along the wall, v up) with holes: [{ u, y0, y1, w }] lancets or a small floor arch
  function wall(u0, u1, h, holes, rotY, pos) {
    // a hole that touches the floor (y0 = 0) is cut as a notch in the outline (three.js drops a hole that touches the outline)
    const s = new THREE.Shape(); s.moveTo(u0, 0);
    for (const o of holes.filter((q) => q.y0 <= 0).sort((a, b) => a.u - b.u)) { s.lineTo(o.u - o.w / 2, 0); s.lineTo(o.u - o.w / 2, o.y1); s.absarc(o.u, o.y1, o.w / 2, Math.PI, 0, true); s.lineTo(o.u + o.w / 2, 0); }
    s.lineTo(u1, 0); s.lineTo(u1, h); s.lineTo(u0, h); s.closePath();
    for (const o of holes.filter((q) => q.y0 > 0)) { const p = new THREE.Path(); p.moveTo(o.u - o.w / 2, o.y0); p.lineTo(o.u + o.w / 2, o.y0); p.lineTo(o.u + o.w / 2, o.y1); p.absarc(o.u, o.y1, o.w / 2, 0, Math.PI, false); p.lineTo(o.u - o.w / 2, o.y0); s.holes.push(p); }
    const g = new THREE.ShapeGeometry(s, 16); P.shade(g, (u, v) => wallShade(u - u0, v, u1 - u0, h));
    const m = new THREE.Mesh(g, M.wall); m.rotation.y = rotY; m.position.set(pos[0], pos[1], pos[2]); return add(m);
  }
  const ZB = -9, ZF = 6, H = 6.5, XL = -4, XR = 4, L = ZF - ZB, ZC = (ZF + ZB) / 2;

  // ---- floor, walls, roof
  { const g = new THREE.PlaneGeometry(XR - XL, L, 24, 45), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (XR - XL), uv.getY(i) * L);
    P.shade(g, (x, y) => 0.55 + 0.45 * sm(0, 1.5, x - XL) * sm(0, 1.5, XR - x) * sm(0, 2, L / 2 - y));
    const f = new THREE.Mesh(g, M.floor); f.rotation.x = -Math.PI / 2; f.position.set(0, 0, ZC); add(f, { cast: false }); }
  const WINS = [-6.2, -2.6, 1.0], wy0 = 2.0, wy1 = 4.6, ww = 0.95;
  wall(ZB, ZF, H, WINS.map((z) => ({ u: z, y0: wy0, y1: wy1, w: ww })), -Math.PI / 2, [XR, 0, 0]);   // right wall: u = z
  const HOLE = { z: 0.5, w: 0.34, spring: 0.14 };
  wall(-ZF, -ZB, H, [{ u: -HOLE.z, y0: 0, y1: HOLE.spring, w: HOLE.w }], Math.PI / 2, [XL, 0, 0]);                                     // left wall: u = -z, the rat hole
  wall(XL, XR, H, [{ u: 0, y0: 2.4, y1: 4.9, w: 1.7 }], 0, [0, 0, ZB]);                                                                   // altar wall with the east window
  wall(XL, XR, H, [], Math.PI, [0, 0, ZF]);
  // the wall's other face behind the windows and the hole (deep reveals), and what shows through them
  wall(ZB, ZF, H, WINS.map((z) => ({ u: z, y0: wy0, y1: wy1, w: ww })), -Math.PI / 2, [XR + 0.4, 0, 0]).receiveShadow = false;
  for (const z of WINS) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww + 0.1, wy1 - wy0 + ww / 2 + 0.1), new THREE.MeshBasicMaterial({ map: P.stained({ seed: 230 + z * 3, colors: ["#3a6fd8", "#c8323a", "#f2c14e", "#4fa35a", "#f6e7c0", "#8a4fc0"] }) }));
    pane.rotation.y = -Math.PI / 2; pane.position.set(XR + 0.42, (wy0 + wy1 + ww / 2) / 2, z); pane.userData.ink = 0.2; pane.userData.glow = 1.2; add(pane, { cast: false, receive: false });
    box(0.4, 0.12, ww + 0.1, M.dress, XR + 0.2, wy0 - 0.06, z, { cast: false });
    for (const s of [-1, 1]) box(0.4, wy1 - wy0, 0.05, M.dress, XR + 0.2, (wy0 + wy1) / 2, z + s * (ww / 2 + 0.02), { cast: false });
    box(0.07, wy1 - wy0, 0.07, M.dress, XR + 0.3, (wy0 + wy1) / 2, z);
  }
  { // east window over the altar: a wide lancet, lit from behind
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.4), new THREE.MeshBasicMaterial({ map: P.stained({ seed: 241, w: 384, h: 768 }) }));
    pane.position.set(0, 2.4 + 1.7, ZB - 0.3); pane.userData.ink = 0.2; pane.userData.glow = 1.4; add(pane, { cast: false, receive: false });
    for (const s of [-1, 0, 1]) box(0.07, 2.5, 0.07, M.dress, s * 0.57, 3.65, ZB - 0.15, { cast: !!s });
    for (const s of [-1, 1]) box(0.14, 2.5, 0.32, M.dress, s * 0.92, 3.65, ZB - 0.15, { cast: false });
    box(1.98, 0.14, 0.34, M.dress, 0, 2.33, ZB - 0.12, { cast: false });
  }
  { // behind the rat hole: a black recess in the wall's thickness, a few crumbs of plaster at its mouth
    box(0.5, 0.36, 0.5, M.black, XL - 0.27, 0.18, HOLE.z, { cast: false, ink: 0.4 });
    for (const [dz, dx, s] of [[-0.24, 0.08, 0.04], [0.21, 0.12, 0.03], [0.05, 0.22, 0.025], [-0.12, 0.17, 0.02]]) box(s, s * 0.6, s, M.dress, XL + dx, s * 0.3, HOLE.z + dz, { ry: dz * 9 });
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, L), M.dark); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, ZC); add(ceil);
  for (let z = ZB + 0.8; z < ZF; z += 2.2) { box(XR - XL, 0.34, 0.28, M.dark, 0, H - 0.6, z); box(0.22, 0.6, 0.22, M.dark, 0, H - 0.3, z);
    for (const s of [-1, 1]) { const b = box(0.22, 1.2, 0.22, M.dark, s * 3.7, H - 1.05, z); } }                                 // tie beams, king posts, wall posts
  for (const s of [-1, 1]) box(0.3, 0.3, L, M.dark, s * 3.85, H - 0.45, ZC);                                                       // wall plates
  box(0.12, 0.6, L, M.dress, XR - 0.06, 0.3, ZC, { cast: false });                                                       // a stone bench along the right wall (the left keeps its floor clear for the hole)
  for (const z of [-4.4, 2.8]) for (const s of [-1, 1]) put(K.column({ h: 6.1, r: 0.22, mat: M.dress, cap: M.dress }), [s * 3.72, 0, z], 0);   // wall shafts

  // ---- the pulpit on the left wall: stem, six-sided tub, stair, back board with a cloth, sounding board
  const PX = -3.05, PZ = -3.0, PY = 1.5;
  put(K.column({ h: PY, r: 0.2, mat: M.oak, cap: M.oak, ringMat: M.gold }), [PX, 0, PZ], 0);
  { const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.56, 1.05, 6, 1, true), M.linen); tub.position.set(PX, PY + 0.52, PZ); add(tub);
    const uv = tub.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3.6, uv.getY(i) * 1.05);
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.45, 0.14, 6), M.oak); fl.position.set(PX, PY - 0.02, PZ); add(fl);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.66, 0.08, 6, 1, true), M.dark); rim.position.set(PX, PY + 1.06, PZ); rim.material = M.dark; add(rim);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; box(0.06, 1.06, 0.06, M.dark, PX + Math.cos(a) * 0.6, PY + 0.53, PZ + Math.sin(a) * 0.6, { ry: -a }); }   // corner posts
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), lam(P.cloth({ seed: 233, base: "#b3202c", trim: "#dca33c", folds: 3, w: 256, h: 256 }), null, { side: THREE.DoubleSide }));
    cl.position.set(PX + 0.62, PY + 0.75, PZ + 0.2); cl.rotation.y = Math.PI / 2 - 0.5; cl.userData.ink = 0.8; add(cl, { cast: false });                    // a hanging cloth on the tub's front
  }
  box(0.08, 2.4, 0.95, M.oak, XL + 0.12, PY + 1.2 + 0.05, PZ);                                                                     // back board
  { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.6), lam(P.damask({ seed: 234, base: "#2a4a8e", motif: "#e2b04a", step: 80, w: 256, h: 512 }))); c.rotation.y = Math.PI / 2; c.position.set(XL + 0.17, PY + 1.9, PZ); c.userData.ink = 0.8; add(c, { cast: false }); }
  { const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.16, 6), M.oak); sb.position.set(PX - 0.1, PY + 2.6, PZ); add(sb);
    const sb2 = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.95, 0.12, 6), M.dark); sb2.position.set(PX - 0.1, PY + 2.74, PZ); add(sb2);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; put(K.pinnacle({ h: 0.4, r: 0.05, mat: M.oak }), [PX - 0.1 + Math.cos(a) * 0.7, PY + 2.8, PZ + Math.sin(a) * 0.7]);
      const pd = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.001, 0.16, 6), M.gold); pd.position.set(PX - 0.1 + Math.cos(a + 0.5) * 0.86, PY + 2.45, PZ + Math.sin(a + 0.5) * 0.86); add(pd); }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), M.gold); ball.position.set(PX - 0.1, PY + 3.05, PZ); add(ball); }
  for (let i = 0; i < 6; i++) { const y = 0.25 * (i + 0.5); box(0.6, 0.12, 0.3, M.oak, XL + 0.42, y, PZ + 1.85 - i * 0.24); box(0.6, y, 0.3, M.dark, XL + 0.42, y / 2, PZ + 1.85 - i * 0.24, { cast: false }); }   // the stair
  { const rail = new THREE.CatmullRomCurve3([new THREE.Vector3(XL + 0.72, 1.0, PZ + 2.0), new THREE.Vector3(XL + 0.72, 2.3, PZ + 0.6)]); const m = new THREE.Mesh(new THREE.TubeGeometry(rail, 6, 0.03, 6), M.dark); add(m);
    for (let i = 0; i < 5; i++) { const k = i / 4, z = PZ + 2.0 - 1.4 * k, y = 1.0 + 1.3 * k, foot = Math.max(0, Math.min(1.5, ((PZ + 1.85 - z) / 0.24 + 1) * 0.25)); box(0.04, y - foot, 0.04, M.dark, XL + 0.72, (y + foot) / 2, z); } }

  // ---- pews (bench fronts face the camera), the congregation's two near ones first
  for (const [x, z, len] of [[0.9, -0.4, 2.6], [0.9, 1.1, 2.6], [0.9, -1.9, 2.6], [0.9, -3.4, 2.6], [-1.3, -1.9, 1.8], [-1.3, -3.4, 1.8]]) put(K.bench({ len, mat: M.oak }), [x, 0, z], 0);

  // ---- the altar end: a step, the altar with a frontal, a painted triptych, candles; a rood beam with a cross
  box(5.0, 0.2, 2.6, M.dress, 0, 0.1, ZB + 1.3);
  box(2.1, 0.95, 0.9, M.dress, 0, 0.2 + 0.475, ZB + 0.75);
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.85), lam(P.cloth({ seed: 235, base: "#b3202c", trim: "#dca33c", folds: 6, w: 512, h: 256 }))); f.position.set(0, 0.2 + 0.47, ZB + 1.205); f.userData.ink = 0.8; add(f, { cast: false }); }
  box(2.3, 0.05, 1.0, lam(null, 0xf0e6d2), 0, 1.17, ZB + 0.75);                                                                       // the white altar cloth
  { const pw = [0.62, 0.9, 0.62], px = [-0.78, 0, 0.78];
    for (let i = 0; i < 3; i++) { const h = i === 1 ? 1.3 : 1.0; const pan = new THREE.Mesh(new THREE.PlaneGeometry(pw[i] - 0.08, h - 0.08), lam(P.tapestry({ seed: 236 + i, base: ["#3a5a8e", "#7a2a2a", "#3a5a8e"][i], border: "#c89a3a", w: 256, h: 384 })));
      pan.position.set(px[i], 1.2 + h / 2 + 0.02, ZB + 0.42); add(pan, { cast: false }); box(pw[i], h, 0.06, M.gold, px[i], 1.2 + h / 2, ZB + 0.37); } }
  for (const s of [-1, 1]) put(K.candlestick({ h: 0.4 }), [s * 0.95, 1.2, ZB + 0.95]);
  for (const s of [-1, 1]) put(K.candelabrum({ h: 1.6, arms: 3 }), [s * 1.9, 0.2, ZB + 1.6]);
  box(XR - XL, 0.3, 0.3, M.dark, 0, 4.7, ZB + 3.0);
  box(0.16, 1.5, 0.12, M.dark, 0, 4.85 + 0.75, ZB + 3.0); box(0.9, 0.16, 0.12, M.dark, 0, 5.85, ZB + 3.0);
  put(K.candelabrum({ h: 1.55, arms: 1 }), [PX + 0.95, 0, PZ + 0.75]);                                                                 // a candle by the pulpit
  put(K.sconce(), [XL + 0.02, 2.4, 1.6], Math.PI / 2); put(K.sconce(), [XL + 0.02, 2.4, -6.0], Math.PI / 2);
  { const t = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.1), lam(P.tapestry({ seed: 238, base: "#5a3a2a", border: "#2a4a7a" }))); t.rotation.y = Math.PI / 2; t.position.set(XL + 0.03, 3.4, -6.0 + 1.6); add(t, { cast: false }); }   // a painted hanging
  put(K.banner({ w: 0.7, h: 1.8, map: P.damask({ seed: 239, base: "#7a1c26", motif: "#e2b04a", step: 90, folds: 4 }) }), [XL + 0.08, 4.8, 2.0], Math.PI / 2, { cast: false });

  // ---- light: low warm sun through the right lancets, cool dim sky light, candles near the pulpit and the altar
  const hemi = new THREE.HemisphereLight(0x8a80c0, 0x4a3628, 0.95); G.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc27c, 5.0); sun.position.set(13, 7.8, -0.8); sun.target.position.set(0, 0, -1.6); G.add(sun); G.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); const sc = sun.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 45;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  const bounce = new THREE.DirectionalLight(0xffcf9a, 0.9); bounce.position.set(-3, 2.5, 6); G.add(bounce);
  const c1 = new THREE.PointLight(0xffb560, 1.4, 4.5, 2); c1.position.set(PX + 0.95, 1.9, PZ + 0.75); G.add(c1);
  const c2 = new THREE.PointLight(0xffb560, 0.9, 5.0, 2); c2.position.set(0, 2.0, ZB + 1.6); G.add(c2);

  const mood = { clear: 0x1a1210, fog: [0x3c2c2c, 8, 28],
    grade: { sat: 1.6, warmAmt: 0.75, shadowAmt: 0.6, shadowTint: [0.8, 0.84, 1.2], lift: [0.035, 0.024, 0.04] },
    glow: { amount: 1.0, haze: 0.012, hazeTint: [1.0, 0.86, 0.62] } };
  return {
    name: "church", group: G, origin: O, mood,
    spots: { pulpit: W(PX, PY, PZ), pews: [W(0.3, 0, -0.32), W(1.5, 0, -0.32), W(0.3, 0, 1.18), W(1.5, 0, 1.18)], hole: W(XL + 0.02, 0, HOLE.z),
      // extras: the altar, the foot of the pulpit stair
      altar: W(0, 1.2, ZB + 0.75), stair: W(XL + 0.42, 0, PZ + 2.0) },
    seatH: 0.46, setCandles: (k) => K.burn(G, k), sun, hemi, materials: M,
  };
};
