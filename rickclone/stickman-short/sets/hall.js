/* sets/hall.js: decades later (about 1540), a far grander hall of justice. Cool grey stone, royal blue and gold, dusk in the window.
 *
 *   const hall = RT.sets.hall(stage);   // everything in hall.group, placed at origin [1200, 0, 0]; spots are WORLD positions
 *
 * Room (local): x -6..6, z -10 (the back wall) .. 6, floor y = 0, walls 8.5 m, a coffered ceiling with gilt bosses.
 * At the back on a dais of three steps (top y 0.6): the high seat under a canopy before a royal blue cloth of estate with gold
 * lilies. Before it the long table (blue cloth, gold border) with the warrant (a written parchment), quill and inkwell, a seal
 * stamp, candles; an iron candle crown above. In the RIGHT wall a tall cross window (stone mullion and transom, leaded
 * diamonds) with dusk outside: a sky, two villages on their hills, far hills (flat inked cut-outs, 12..30 m out).
 * The low dusk sun comes in through it. Blue hangings between grey pilasters; a great fireplace on the left wall.
 *   spots: seat (the dais in front of the high seat; seat top at seat y + hall.seatH), table (the warrant's centre, on the table top),
 *          window (the window's centre on the wall), accuser (a man who stands up, left of the table)
 *   hall.setSeal(k): the red wax seal on the warrant, 0 = none .. 1 = pressed (it grows in over k). hall.stamp: the stamp (story may move it)
 */
window.RT = window.RT || {}; RT.sets = RT.sets || {};
RT.sets.hall = function (stage) {
  "use strict";
  const P = SF.paint, K = SF.props, KM = K.mat, O = [1200, 0, 0];
  const G = new THREE.Group(); G.name = "set:hall"; G.position.set(O[0], O[1], O[2]);
  const W = (x, y, z) => [x + O[0], y + O[1], z + O[2]];
  const tile = (t, m) => { t.repeat.set(1 / m, 1 / m); return t; };
  const T = {
    wall: tile(P.stone({ seed: 311, rows: 9, base: ["#a9a8a6", "#9a9898", "#b6b3ae", "#8e8c8e", "#a29e9a"], mortar: "#2a2630", gap: 6 }), 2.6),
    dress: tile(P.stone({ seed: 312, rows: 6, base: ["#bcb8b0", "#c8c4ba", "#aeaaa2"], mortar: "#2a2630", gap: 6 }), 1.6),
    floor: tile(P.flags({ seed: 313, cols: 4, rows: 4, base: ["#8c8a88", "#7a7876", "#9a9692", "#6e6c6c"] }), 2.0),
    oak: tile(P.planks({ seed: 314, count: 6, base: "#6e4228", vertical: true }), 1.2),
    dark: tile(P.planks({ seed: 315, count: 6, base: "#3e2618" }), 1.6),
    linen: tile(P.linenfold({ seed: 316, base: "#6a3e24", cols: 2, rows: 1 }), 0.8),
  };
  const lam = (map, color, extra) => new THREE.MeshLambertMaterial(Object.assign({ map, color: color == null ? 0xffffff : color }, extra || {}));
  const M = { wall: lam(T.wall, null, { vertexColors: true }), dress: lam(T.dress), floor: lam(T.floor, null, { vertexColors: true }), oak: lam(T.oak), dark: lam(T.dark),
    linen: lam(T.linen), gold: KM.gold, black: new THREE.MeshBasicMaterial({ color: 0x0c0808 }), iron: KM.iron };
  for (const m of [M.wall, M.dark, M.dress]) m.shadowSide = THREE.DoubleSide;
  const add = (mesh, o) => { o = o || {}; mesh.castShadow = o.cast !== false; mesh.receiveShadow = o.receive !== false; if (o.ink != null) mesh.userData.ink = o.ink; G.add(mesh); return mesh; };
  const put = (obj, pos, ry, o) => K.place(G, obj, pos, ry, o);
  function box(w, h, d, mat, x, y, z, o) { const m = new THREE.Mesh(K.boxGeo(w, h, d), mat); m.position.set(x, y, z); if (o && o.ry) m.rotation.y = o.ry; return add(m, o); }
  function plane(w, h, mat, x, y, z, ry, o) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry || 0; return add(m, Object.assign({ cast: false }, o || {})); }
  const sm = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const wallShade = (u, v, w, h) => 0.5 + 0.5 * sm(0, 1.2, v) * sm(0, 1.8, h - v) * sm(0, 1.5, u) * sm(0, 1.5, w - u) - 0.1 * sm(0.6, 0, v);
  function wall(u0, u1, h, holes, rotY, pos) {                    // holes: rectangles { u, y0, y1, w }
    const s = new THREE.Shape(); s.moveTo(u0, 0); s.lineTo(u1, 0); s.lineTo(u1, h); s.lineTo(u0, h); s.closePath();
    for (const o of holes) { const p = new THREE.Path(); p.moveTo(o.u - o.w / 2, o.y0); p.lineTo(o.u + o.w / 2, o.y0); p.lineTo(o.u + o.w / 2, o.y1); p.lineTo(o.u - o.w / 2, o.y1); p.lineTo(o.u - o.w / 2, o.y0); s.holes.push(p); }
    const g = new THREE.ShapeGeometry(s, 4); P.shade(g, (u, v) => wallShade(u - u0, v, u1 - u0, h));
    const m = new THREE.Mesh(g, M.wall); m.rotation.y = rotY; m.position.set(pos[0], pos[1], pos[2]); return add(m);
  }
  const ZB = -10, ZF = 6, H = 8.5, XL = -6, XR = 6, L = ZF - ZB, ZC = (ZF + ZB) / 2;

  // ---- floor (with a carpet under the table), walls, coffered ceiling
  { const g = new THREE.PlaneGeometry(XR - XL, L, 30, 40), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (XR - XL), uv.getY(i) * L);
    P.shade(g, (x, y) => 0.55 + 0.45 * sm(0, 1.8, x - XL) * sm(0, 1.8, XR - x) * sm(0, 2.2, L / 2 - y));
    const f = new THREE.Mesh(g, M.floor); f.rotation.x = -Math.PI / 2; f.position.set(0, 0, ZC); add(f, { cast: false }); }
  { const c = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 3.6), lam(P.carpet({ seed: 336, w: 768, h: 512, field: "#1d3170", border: "#8a1c24" }))); c.rotation.x = -Math.PI / 2; c.position.set(0, 0.006, -5.2); c.userData.ink = 0.3; add(c, { cast: false }); }
  const WINS = [{ z: -3.0, w: 1.9, y0: 1.0, y1: 5.6 }, { z: 2.6, w: 1.9, y0: 1.0, y1: 5.6 }];
  wall(ZB, ZF, H, WINS.map((o) => ({ u: o.z, y0: o.y0, y1: o.y1, w: o.w })), -Math.PI / 2, [XR, 0, 0]);
  wall(ZB, ZF, H, WINS.map((o) => ({ u: o.z, y0: o.y0, y1: o.y1, w: o.w })), -Math.PI / 2, [XR + 0.55, 0, 0]).receiveShadow = false;
  wall(-ZF, -ZB, H, [], Math.PI / 2, [XL, 0, 0]);
  wall(XL, XR, H, [], 0, [0, 0, ZB]);
  wall(XL, XR, H, [], Math.PI, [0, 0, ZF]);
  { const c = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, L), M.dark); c.rotation.x = Math.PI / 2; c.position.set(0, H, ZC); add(c); }
  for (let z = ZB + 1.6; z < ZF; z += 1.6) box(XR - XL, 0.3, 0.22, M.dark, 0, H - 0.15, z);                                     // coffers: beams both ways
  for (let x = XL + 1.5; x < XR; x += 1.5) box(0.22, 0.3, L, M.dark, x, H - 0.17, ZC);
  for (let z = ZB + 1.6; z < ZF; z += 1.6) for (let x = XL + 1.5; x < XR; x += 1.5) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M.gold); b.position.set(x, H - 0.34, z); add(b, { cast: false }); }
  box(XR - XL, 0.35, 0.3, M.dress, 0, H - 0.5, ZB + 0.15, { cast: false });                                                       // cornice
  for (const s of [-1, 1]) box(0.3, 0.35, L, M.dress, s * (XR - 0.15), H - 0.5, ZC, { cast: false });

  // ---- the windows: deep reveals, a stone cross (mullion + transom), leaded diamonds you can see through
  const lead = (function () { const c = P.canvas(256, 256), g = c.getContext("2d"); g.strokeStyle = "rgb(36,30,34)"; g.lineWidth = 5;
    for (let k = -256; k < 512; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke(); g.beginPath(); g.moveTo(k, 0); g.lineTo(k - 256, 256); g.stroke(); }
    g.fillStyle = "rgba(255,240,220,0.06)"; g.fillRect(0, 0, 256, 256); const t = P.texture(c); t.repeat.set(3, 6); return t; })();
  const leadMat = new THREE.MeshBasicMaterial({ map: lead, transparent: true, depthWrite: false, opacity: 0.8 });
  for (const o of WINS) {
    const h = o.y1 - o.y0, yc = (o.y0 + o.y1) / 2;
    box(0.55, 0.16, o.w + 0.1, M.dress, XR + 0.27, o.y0 - 0.08, o.z, { cast: false }); box(0.55, 0.16, o.w + 0.1, M.dress, XR + 0.27, o.y1 + 0.08, o.z);
    for (const s of [-1, 1]) box(0.55, h, 0.06, M.dress, XR + 0.27, yc, o.z + s * (o.w / 2 + 0.03), { cast: false });
    box(0.12, h, 0.12, M.dress, XR + 0.3, yc, o.z); box(0.12, 0.12, o.w, M.dress, XR + 0.3, o.y0 + h * 0.68, o.z);                  // mullion and transom (they cast a cross of shadow)
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(o.w, h), leadMat); gl.rotation.y = -Math.PI / 2; gl.position.set(XR + 0.33, yc, o.z); gl.userData.noDepth = true; G.add(gl);
    box(o.w + 0.5, 0.1, 0.32, M.dress, XR - 0.12, o.y0 - 0.1, o.z, { ry: Math.PI / 2 });                                            // inner sill
  }
  // outside at dusk: the sky, far hills, two villages each on its hill (flat cut-outs, inked; card-like so their alpha cuts the depth)
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(70, 34), new THREE.MeshBasicMaterial({ map: P.sky({ seed: 341, stars: 30, stops: [[0, "#1e2856"], [0.4, "#4c4c86"], [0.68, "#c47c78"], [0.85, "#f0a46a"], [1, "#f6c888"]] }), fog: false }));
  sky.rotation.y = -Math.PI / 2; sky.position.set(36, 8, -2); sky.userData.noDepth = true; sky.userData.glow = 0.0; sky.material.color.setHex(0x8c8296); G.add(sky);
  function cutout(tex, w, h, x, y, z, tint) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, color: tint || 0xffffff }));
    m.rotation.y = -Math.PI / 2; m.position.set(x, y, z); m.userData.card = true; G.add(m); return m;
  }
  cutout(P.village({ seed: 351, hill: "#3c3c5e", wall: "#6a6680", roof: "#4a3a5a", houses: 0, church: false, line: 4 }), 40, 8, 31, 3.6, -2, 0xb0a8c8);        // far hills (no houses)
  // the two villages sit side by side in the one pane the story's camera (view 28) sees whole, about 14 m out (its focus is 15 m),
  // on a long hill that fills in under them
  cutout(P.village({ seed: 356, hill: "#4a5848", houses: 0, church: false, line: 5, taper: true }), 12, 8, 19.4, 2.4, -3.6, 0xe0c8c0);
  const vA = cutout(P.village({ seed: 352, hill: "#4a5848", wall: "#c0a888", roof: "#8a4434", houses: 9, lit: 0.9, line: 7, taper: true }), 6.0, 3.0, 18.6, 5.0, -4.6, 0xe0c8c0);
  const vB = cutout(P.village({ seed: 353, hill: "#526048", wall: "#c8b090", roof: "#7a3a30", houses: 7, lit: 0.9, line: 7, taper: true }), 5.0, 2.5, 17.4, 3.55, -2.0, 0xd0b8c0);
  cutout(P.village({ seed: 354, hill: "#2e3a30", houses: 0, church: false, line: 5 }), 30, 4, 14, 1.6, -5.0, 0xa098a8);                                // the near slope
  cutout(P.village({ seed: 355, hill: "#2e3a30", houses: 0, church: false, line: 5 }), 30, 4, 14, 1.6, 8.0, 0xa098a8);

  // ---- pilasters and royal blue hangings with gold lilies; the cloth of estate behind the high seat
  const blue = (seed, w, h) => lam(P.damask({ seed, base: "#1f3a8e", motif: "#e8b84a", step: 96, w: 512, h: 1024 }));
  for (const x of [-4.2, -1.9, 1.9, 4.2]) put(K.column({ h: H - 0.7, r: 0.26, mat: M.dress, cap: M.dress }), [x, 0, ZB + 0.3], 0);
  for (const x of [-3.05, 3.05]) { plane(1.7, 4.6, blue(361 + x, 1.7, 4.6), x, 4.4, ZB + 0.05).userData.ink = 0.8; box(1.9, 0.08, 0.1, M.gold, x, 6.75, ZB + 0.1, { cast: false }); }
  plane(3.3, 6.4, blue(365), 0, 3.8, ZB + 0.04).userData.ink = 0.8; box(3.5, 0.1, 0.12, M.gold, 0, 7.05, ZB + 0.1, { cast: false });
  for (const z of [-7.6, -4.6, -1.6, 1.4, 4.4]) put(K.column({ h: H - 0.7, r: 0.22, mat: M.dress, cap: M.dress }), [XL + 0.25, 0, z], 0);
  for (const z of [-0.1, 2.9]) { plane(2.2, 4.4, blue(370 + z, 2.2, 4.4), XL + 0.04, 4.3, z, Math.PI / 2).userData.ink = 0.8; }
  for (const z of [-7.6, 4.4]) put(K.column({ h: H - 0.7, r: 0.22, mat: M.dress, cap: M.dress }), [XR - 0.25, 0, z], 0);
  const shTex = P.shield({ field: "#1f3a8e" });
  for (const x of [-3.05, 3.05]) { const s = plane(0.6, 0.72, lam(shTex, null, { transparent: true, alphaTest: 0.5 }), x, 7.4, ZB + 0.08); s.userData.ink = 0.6; }

  // ---- the dais and the high seat under its canopy
  for (let i = 0; i < 3; i++) box(5.0 - i * 0.5, 0.2, 2.4 - i * 0.35, M.oak, 0, 0.1 + i * 0.2, ZB + 1.2 - i * 0.17);
  put(K.beads({ len: 4.0, r: 0.025, mat: M.gold }), [0, 0.6, ZB + 1.98]);
  put(K.chair({ w: 1.9, h: 3.8, dossal: P.damask({ seed: 366, base: "#24408e", motif: "#e8b84a", step: 90 }), lights: true }), [0, 0.6, ZB + 0.7]);
  { const cu = new THREE.Mesh(K.boxGeo(1.5, 0.12, 0.6), lam(P.tufted({ seed: 367, base: "#b02030" }))); cu.position.set(0, 1.16, ZB + 0.95); add(cu); }   // the red cushion on the seat
  for (const s of [-1, 1]) put(K.candelabrum({ h: 1.8, arms: 3 }), [s * 2.1, 0.6, ZB + 1.3]);

  // ---- the long table, its cloth, the warrant, quill and inkwell, the stamp, candles; an iron candle crown above
  const TX = 0, TZ = -5.3, TW = 4.4, TD = 1.1, TH = 0.82;
  box(TW, 0.07, TD, M.oak, TX, TH - 0.035, TZ);
  { const cl = lam(P.cloth({ seed: 371, base: "#1f3a8e", trim: "#e8b84a", folds: 10, w: 1024, h: 256 })); const f = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.02, TH - 0.08), cl); f.position.set(TX, (TH - 0.08) / 2 + 0.04, TZ + TD / 2 + 0.01); f.userData.ink = 0.8; add(f, { cast: false });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(TD, TH - 0.08), cl); e.rotation.y = s * Math.PI / 2; e.position.set(TX + s * (TW / 2 + 0.01), (TH - 0.08) / 2 + 0.04, TZ); add(e, { cast: false }); } }
  box(TW - 0.1, TH - 0.1, TD - 0.1, M.dark, TX, (TH - 0.1) / 2, TZ, { cast: false });
  const warrant = box(0.42, 0.006, 0.56, lam(P.parchment({ seed: 372, lines: 12, initial: "#a8222c", w: 384, h: 512 })), TX + 0.3, TH + 0.003, TZ + 0.12, { cast: false }); warrant.userData.ink = 0.5;
  const sealMat = new THREE.MeshLambertMaterial({ color: 0x5e0a12 });
  const seal = new THREE.Group(); { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.014, 20), sealMat); seal.add(d);
    { const sq = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.075, 0.006, 11), sealMat); sq.position.y = -0.004; sq.rotation.y = 0.3; seal.add(sq); }   // the wax squeezed out round it
    { const im = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.006, 6, 24), sealMat); im.rotation.x = Math.PI / 2; im.position.y = 0.008; seal.add(im); const bs = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 12), sealMat); bs.position.y = 0.008; seal.add(bs); }   // the impression: a ring and a boss
  }
  put(seal, [TX + 0.3, TH + 0.013, TZ + 0.3]);
  function setSeal(k) { k = Math.max(0, Math.min(1, k)); seal.visible = k > 0.001; const e = 0.6 + 0.4 * k; seal.scale.set(e, k, e); }
  setSeal(0);
  const ink = K.inkwell(); ink.scale.setScalar(1.7); put(ink, [TX - 0.3, TH, TZ + 0.05]);
  put(K.quill(), [TX - 0.26, TH + 0.14, TZ + 0.05], 0.7);
  const stamp = put(K.stamp(), [TX + 0.78, TH, TZ + 0.18]); stamp.scale.setScalar(1.3); stamp.userData.rest = stamp.position.toArray();
  put(K.book({ w: 0.42, d: 0.3, t: 0.08, color: 1 }), [TX - 1.3, TH, TZ - 0.1], 0.2); put(K.book({ w: 0.38, d: 0.28, t: 0.07, color: 0 }), [TX - 1.3, TH + 0.08, TZ - 0.12], -0.1);
  put(K.scroll({ len: 0.42 }), [TX + 1.3, TH, TZ - 0.15], 0.4); put(K.scroll({ len: 0.36 }), [TX + 1.38, TH + 0.07, TZ - 0.1], 0.1);
  for (const s of [-1, 1]) put(K.candlestick({ h: 0.4 }), [TX + s * 1.8, TH, TZ - 0.2]);
  { const crown = new THREE.Group(), R = 0.9; const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 6, 40), M.iron); ring.rotation.x = Math.PI / 2; crown.add(ring);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, c = K.candlestick({ h: 0.12 }); c.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); crown.add(c); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2.5, 4), M.iron); const mid = new THREE.Vector3(Math.cos(a) * R / 2, 1.25, Math.sin(a) * R / 2);
      ch.position.copy(mid); ch.lookAt(0, 2.5, 0); ch.rotateX(Math.PI / 2); crown.add(ch); }
    put(crown, [TX, 4.2, TZ], 0, { cast: false }); }
  for (const x of [-1.2, 1.2]) { box(0.6, 0.06, 0.55, M.oak, x, 0.5, TZ - 0.95); box(0.6, 0.85, 0.06, M.linen, x, 0.95, TZ - 1.22); for (const sx of [-1, 1]) box(0.06, 0.5, 0.5, M.dark, x + sx * 0.27, 0.25, TZ - 0.95); }   // two chairs behind the table

  // ---- the left wall: a great fireplace with a hood and our arms, a bench, a chest
  const FZ = -6.4;
  for (const s of [-1, 1]) box(0.9, 1.5, 0.42, M.dress, XL + 0.45, 0.75, FZ + s * 1.09, { cast: false });                         // jambs
  box(0.1, 1.5, 1.8, M.black, XL + 0.06, 0.75, FZ, { cast: false, ink: 0.5 }); box(0.8, 0.06, 1.8, M.black, XL + 0.42, 0.03, FZ, { cast: false });   // the sooty back and hearth
  box(1.0, 0.25, 2.9, M.dress, XL + 0.5, 1.62, FZ); box(0.7, 2.6, 2.4, M.dress, XL + 0.35, 3.05, FZ);
  { const s = plane(0.9, 1.08, lam(shTex, null, { transparent: true, alphaTest: 0.5 }), XL + 0.71, 3.0, FZ, Math.PI / 2); s.userData.ink = 0.6; }
  for (let i = 0; i < 5; i++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.9, 8), M.dark); lg.rotation.z = Math.PI / 2; lg.rotation.y = Math.PI / 2 + (i - 2) * 0.25; lg.position.set(XL + 0.55, 0.1 + (i % 2) * 0.1, FZ + (i - 2) * 0.18); add(lg); }
  const fire = []; for (let i = 0; i < 5; i++) { const f = K.flame(G, XL + 0.55 + (i % 2) * 0.05, 0.3 + (i % 3) * 0.05, FZ + (i - 2) * 0.17, 3.2, 2.5); fire.push(f); }
  const fireLight = new THREE.PointLight(0xff9a40, 1.2, 6, 2); fireLight.position.set(XL + 1.1, 0.8, FZ); G.add(fireLight);
  put(K.bench({ len: 2.6, mat: M.oak }), [XL + 0.55, 0, -2.6], Math.PI / 2);
  box(1.1, 0.6, 0.6, M.oak, XL + 0.4, 0.3, 0.9, { ry: Math.PI / 2 }); box(1.14, 0.08, 0.64, M.dark, XL + 0.4, 0.62, 0.9, { ry: Math.PI / 2 });
  for (const z of [-3.9, 1.7]) put(K.sconce(), [XL + 0.02, 2.7, z], Math.PI / 2);
  for (const z of [-0.2, 4.0]) put(K.sconce(), [XR - 0.02, 2.9, z], -Math.PI / 2);

  // ---- light: the low dusk sun through the right windows, cool grey-blue sky light, candles and the fire
  const hemi = new THREE.HemisphereLight(0x8a94c8, 0x4a4450, 2.6); G.add(hemi);
  const sun = new THREE.DirectionalLight(0xffa878, 3.6); sun.position.set(16, 5.0, -4.0); sun.target.position.set(0, 0, -2.4); G.add(sun); G.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); const sc = sun.shadow.camera; sc.left = -13; sc.right = 13; sc.top = 13; sc.bottom = -13; sc.near = 1; sc.far = 50;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  const bounce = new THREE.DirectionalLight(0xc8ccf0, 2.7); bounce.position.set(-4, 4, 6); G.add(bounce);
  const c1 = new THREE.PointLight(0xffb560, 3.4, 7, 2); c1.position.set(0, 2.4, ZB + 2.2); G.add(c1);
  const c2 = new THREE.PointLight(0xffb560, 0.35, 3.0, 2); c2.position.set(TX, 2.0, TZ + 0.3); G.add(c2);

  const mood = { clear: 0x14162a, fog: [0x2c3050, 14, 60],
    grade: { vignette: 0.38, sat: 1.5, warmAmt: 0.4, shadowAmt: 0.6, shadowTint: [0.76, 0.84, 1.25], lift: [0.026, 0.028, 0.05] },
    glow: { amount: 1.0, haze: 0.003, hazeTint: [1.0, 0.82, 0.72] } };
  return {
    name: "hall", group: G, origin: O, mood,
    spots: { seat: W(0, 0.6, ZB + 1.35), table: W(TX + 0.3, TH, TZ + 0.12), window: W(XR, 3.3, WINS[0].z), accuser: W(-2.6, 0, -2.6),
      // extras: the inkwell (the small rat sits in it), the stamp, the villages outside (for aiming), the fireplace
      inkwell: W(TX - 0.3, TH + 0.12, TZ + 0.05), stamp: W(TX + 0.78, TH, TZ + 0.18), seal: W(TX + 0.3, TH + 0.013, TZ + 0.3),
      villages: W(21, 3.0, -2.6), fire: W(XL + 0.55, 0.3, FZ) },
    seatH: 0.56, setSeal, setCandles: (k) => K.burn(G, k), stamp, seal, warrant, villages: [vA, vB], sun, hemi, materials: M,
  };
};
