/* sets/court.js: the church court, a French town about 1510 (the look test's court, moved into one group), plus what the story needs.
 *
 *   const court = RT.sets.court(stage);   // builds everything into court.group (lights included); origin [0, 0, 0]
 *
 * Room: x -4.5..4.5, z -7 (back wall) .. 6.2 (front wall, behind the camera), floor y = 0, ceiling 7. Low warm sun through
 * three stained-glass windows in the LEFT wall, violet sky light in the shade. The judge's high bench at the back.
 * Added in round 2:
 *   desk        the lawyer's table in front of his spot, a huge law book on it        court.openBook(k)  0 shut .. 1 open
 *   bar         a low rail before the bench (right of the carpet); the defendant stands on the camera side of it
 *   prosecutor  his lectern on the left of the carpet, opposite the lawyer
 *   usher/door  a round-headed door in the RIGHT wall (z 3.0..4.2), the leaf open, a dark stone corridor 6 m long behind it
 *   gallery     5 seats on the three benches at the right (floor points in front of each seat; seat top at court.seatH)
 *   clerk       the clerk's table: a blank page (0.40 x 0.54 m, long side along z), a quill  court.setQuill(k) 0 hovering .. 1 lying down
 *   candles     the bench candelabrum; court.setCandles(k) burns EVERY candle in the court to k (1 new, 0.15 stubs)
 *   cobweb      two webs on the dock, court.setCobweb(on)
 *   night       court.moodNight (deep blue, candles the only warm thing) and court.setNight(k): the lights of the set itself
 *               (sun -> moon, windows dark blue, candle lights up). Call setNight(k) with the same k as SF.mood.mix(mood, moodNight, k).
 * Every flame and window carries userData.glow (hand-off 5). All functions are pure in their argument (frames render out of order).
 */
window.RT = window.RT || {}; RT.sets = RT.sets || {};
RT.sets.court = function (stage) {
  "use strict";
  const P = SF.paint, K = SF.props, KM = K.mat;
  const G = new THREE.Group(); G.name = "set:court"; const scene = G;      // everything below goes into G (the old code said scene)

  // ---- textures (repeat = 1 / metres per tile; geometry UVs are in metres, see box())
  const tile = (t, m) => { t.repeat.set(1 / m, 1 / m); return t; };
  const T = {
    wall: tile(P.stone({ seed: 11, rows: 10, base: ["#c4ab8e", "#b49c84", "#cdb699", "#a8927f", "#bfa58a", "#9c8a7c"], mortar: "#33262a", gap: 7 }), 2.4),
    pillar: tile(P.stone({ seed: 12, rows: 6, base: ["#b9a690", "#c8b49c", "#a9977f"], mortar: "#33262a", gap: 7 }), 1.6),
    floor: tile(P.flags({ seed: 13, cols: 4, rows: 4, base: ["#9b7c66", "#8b6e5c", "#a8896f", "#7e6555", "#927060"] }), 2.6),
    oak: tile(P.planks({ seed: 14, count: 6, base: "#8c5a34", vertical: true }), 1.2),
    oakH: tile(P.planks({ seed: 15, count: 5, base: "#7a4b2c" }), 1.2),
    dark: tile(P.planks({ seed: 16, count: 6, base: "#5a3826" }), 1.6),
    dockWood: tile(P.planks({ seed: 17, count: 4, base: "#9a6438", ends: 0 }), 0.5),
    plaster: tile(P.plaster({ seed: 18, base: "#d6bf9c" }), 2),
    linen: tile(P.linenfold({ seed: 19, base: "#7a4a2a", cols: 2, rows: 1 }), 0.9),
  };
  const lam = (map, color, extra) => new THREE.MeshLambertMaterial(Object.assign({ map, color: color == null ? 0xffffff : color }, extra || {}));
  const M = {
    wall: lam(T.wall, null, { vertexColors: true }), wallFlat: lam(T.wall), pillar: lam(T.pillar), floor: lam(T.floor, null, { vertexColors: true }),
    oak: lam(T.oak), oakH: lam(T.oakH), dark: lam(T.dark), dock: lam(T.dockWood), linen: lam(T.linen),
    plaster: lam(T.plaster), gold: KM.gold,
    candle: KM.wax,
    book1: KM.books[0], book2: KM.books[1], paper: lam(P.parchment({ seed: 21, lines: 10 })),
  };
  const add = (mesh, o) => { o = o || {}; mesh.castShadow = o.cast !== false; mesh.receiveShadow = o.receive !== false; if (o.ink != null) mesh.userData.ink = o.ink; scene.add(mesh); return mesh; };
  const put = (obj, pos, ry, o) => K.place(scene, obj, pos, ry, o);
  // a box whose UVs are in metres on every face, so a texture keeps its scale on any size
  function box(w, h, d, mat, x, y, z, o) {
    const m = new THREE.Mesh(K.boxGeo(w, h, d), mat); m.position.set(x, y, z); if (o && o.ry) m.rotation.y = o.ry; return add(m, o);
  }
  function plane(w, h, mat, x, y, z, ry, o) {
    const g = new THREE.PlaneGeometry(w, h, Math.ceil(w * 3), Math.ceil(h * 3)), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
    if (o && o.shade) P.shade(g, (px, py) => o.shade(px + w / 2, py + h / 2, w, h));
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.y = ry || 0; return add(m, o);
  }
  function cyl(r, h, mat, x, y, z, o) {
    const g = new THREE.CylinderGeometry(r, r, h, 28, 1), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * r, uv.getY(i) * h);
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); return add(m, o);
  }
  // darker corners: the walls grow darker near the floor, the ceiling and the room's corners (u, v in metres from the bottom-left)
  const sm = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const wallShade = (u, v, w, h) => 0.55 + 0.45 * sm(0, 1.2, v) * sm(0, 1.6, h - v) * sm(0, 1.4, u) * sm(0, 1.4, w - u) - 0.08 * sm(0.6, 0, v);

  // ---- floor, walls, ceiling. The room runs from the back wall at z = BZ to a front wall at z = 6.2 behind the camera.
  // Every wall, the ceiling and the beams cast shadows (shadowSide both ways), so the sun only enters through the windows.
  const BZ = -7.0, RL = 6.2 - BZ, RC = (6.2 + BZ) / 2;
  for (const m of [M.wall, M.wallFlat, M.dark]) m.shadowSide = THREE.DoubleSide;
  const fgeo = new THREE.PlaneGeometry(9, RL, 27, 40); { const uv = fgeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9, uv.getY(i) * RL); }
  P.shade(fgeo, (x, y) => 0.55 + 0.45 * sm(0, 1.6, x + 4.5) * sm(0, 1.6, 4.5 - x) * sm(0, 2.2, RL / 2 - y));    // dark along the walls (y here is -z before rotation)
  const floor = new THREE.Mesh(fgeo, M.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, RC); add(floor, { cast: false });
  plane(9, 7, M.wall, 0, 3.5, BZ, 0, { shade: wallShade });                                       // back wall
  // right wall with a door (round-headed) into a dark corridor. Shape u = z (rotation -90 degrees), v = y
  const DZc = 3.6, DW = 1.2, DH = 2.2;
  { const s = new THREE.Shape(); s.moveTo(BZ, 0); s.lineTo(DZc - DW / 2, 0); s.lineTo(DZc - DW / 2, DH); s.absarc(DZc, DH, DW / 2, Math.PI, 0, true); s.lineTo(DZc + DW / 2, 0); s.lineTo(6.2, 0); s.lineTo(6.2, 7); s.lineTo(BZ, 7); s.closePath();
    const g = new THREE.ShapeGeometry(s, 16); P.shade(g, (u, v) => wallShade(u - BZ, v, RL, 7) * (0.75 + 0.25 * sm(0.2, 1.2, Math.hypot(u - DZc, Math.max(0, v - DH)) - DW / 2)));
    const rw = new THREE.Mesh(g, M.wall); rw.rotation.y = -Math.PI / 2; rw.position.set(4.5, 0, 0); add(rw); }
  plane(9, 7, M.wall, 0, 3.5, 6.2, Math.PI, { shade: wallShade });                                // front wall (behind the camera; it stops the sun coming in from the front)
  // left wall with three arched window holes. Shape u = -z (see the rotation), v = y
  const shape = new THREE.Shape(); shape.moveTo(-6.2, 0); shape.lineTo(-BZ, 0); shape.lineTo(-BZ, 7); shape.lineTo(-6.2, 7); shape.closePath();
  const WIN = [{ z: -6.15 }, { z: -2.6 }, { z: 1.0 }], wy0 = 2.1, wy1 = 5.2, ww = 1.05;
  for (const w of WIN) { const h = new THREE.Path(), u = -w.z; h.moveTo(u - ww / 2, wy0); h.lineTo(u + ww / 2, wy0); h.lineTo(u + ww / 2, wy1); h.absarc(u, wy1, ww / 2, 0, Math.PI, false); h.lineTo(u - ww / 2, wy0); shape.holes.push(h); }
  const lw = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), M.wallFlat); lw.rotation.y = Math.PI / 2; lw.position.set(-4.5, 0, 0); add(lw);
  const lw2 = lw.clone(); lw2.position.x = -4.86; add(lw2, { receive: false });                     // the wall's outer face: the windows get a deep reveal
  for (const w of WIN) {                                                        // stained glass behind each hole, a mullion, a deep stone reveal
    const gl = P.stained({ seed: 20 + w.z * 3 }); const gm = new THREE.MeshBasicMaterial({ map: gl, color: 0xffffff });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww + 0.1, wy1 - wy0 + ww / 2 + 0.1), gm); pane.rotation.y = Math.PI / 2; pane.position.set(-4.9, (wy0 + wy1 + ww / 2) / 2, w.z);
    pane.userData.ink = 0.2; pane.userData.glow = 1; add(pane, { cast: false, receive: false });
    for (const s of [-1, 1]) box(0.36, wy1 - wy0, 0.05, M.wallFlat, -4.68, (wy0 + wy1) / 2, w.z + s * (ww / 2 + 0.02), { cast: false });   // reveal sides
    box(0.36, 0.12, ww + 0.1, M.wallFlat, -4.66, wy0 - 0.06, w.z, { cast: false });   // sill
    box(0.08, wy1 - wy0, 0.07, M.pillar, -4.62, (wy0 + wy1) / 2, w.z, { cast: true });  // mullion (casts a bar into the light patch)
    box(0.07, 0.06, ww, M.pillar, -4.62, wy0 + (wy1 - wy0) * 0.55, w.z);               // transom
  }
  const cgeo = new THREE.PlaneGeometry(9, RL); const ceil = new THREE.Mesh(cgeo, M.dark); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 7, RC); add(ceil);
  for (let z = BZ + 0.6; z < 6; z += 1.5) box(9, 0.32, 0.26, M.dark, 0, 6.8, z);                        // beams
  box(9, 0.3, 0.3, M.dark, 0, 0.15, BZ + 0.15, { cast: false });                                          // skirting along the back wall
  for (const x of [-3.3, 2.7]) for (const z of [-3.45]) put(K.column({ h: 6.65, r: 0.36, mat: M.pillar, cap: M.wallFlat }), [x, 0, z], 0, { cast: true });

  // ---- the back wall, 3.7 m behind the judge (room for depth blur): an arch over a cloth of estate (the judge's dossal and
  // canopy hang on the wall behind his seat, as they did), banners, a tapestry, candles
  const JX = -0.6, BX = -1.0;
  put(K.arch({ span: 2.9, spring: 3.3, thick: 0.42, depth: 0.22, mat: M.pillar, inner: M.wallFlat }), [BX, 0.9, BZ + 0.28], 0, { cast: false });
  for (const s of [-1, 1]) put(K.column({ h: 3.32, r: 0.13, mat: M.pillar, cap: M.wallFlat }), [BX + s * 1.57, 0.9, BZ + 0.18], 0, { cast: false });
  const hang = P.damask({ seed: 32, base: "#9a1c28", motif: "#d9a43a", step: 96, w: 512, h: 1024 });
  const cb = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 4.8), lam(hang)); cb.position.set(BX, 3.3, BZ + 0.06); cb.userData.ink = 0.8; add(cb, { cast: false });
  put(K.chair({ w: 2.0, h: 3.3, seat: false, lights: true }), [BX, 0.9, BZ + 0.3]);
  { // a tall lancet of stained glass in the back wall, left of the arch: a window you can see in the wide views (lit from outside)
    const bw = 0.95, by0 = 2.0, by1 = 5.0, bxw = -3.75, sh = new THREE.Shape();
    sh.moveTo(-bw / 2, 0); sh.lineTo(bw / 2, 0); sh.lineTo(bw / 2, by1 - by0); sh.absarc(0, by1 - by0, bw / 2, 0, Math.PI, false); sh.closePath();
    const sg = new THREE.ShapeGeometry(sh, 16), uv = sg.attributes.uv, ps = sg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, ps.getX(i) / bw + 0.5, ps.getY(i) / (by1 - by0 + bw / 2));
    const win = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: P.stained({ seed: 29 }) })); win.position.set(bxw, by0, BZ + 0.02); win.userData.ink = 0.3; win.userData.glow = 1.5; add(win, { cast: false, receive: false });
    for (const s of [-1, 1]) box(0.12, by1 - by0, 0.3, M.pillar, bxw + s * (bw / 2 + 0.06), (by0 + by1) / 2, BZ + 0.15, { cast: false });   // jambs
    box(bw + 0.36, 0.14, 0.34, M.pillar, bxw, by0 - 0.07, BZ + 0.17, { cast: false });                                                        // sill
    box(0.06, by1 - by0, 0.06, M.pillar, bxw, (by0 + by1) / 2, BZ + 0.05, { cast: false });                                                   // mullion
    const ar = K.arch({ span: bw, spring: by1, thick: 0.14, depth: 0.15, mat: M.pillar, keystone: false }); put(ar, [bxw, 0, BZ + 0.3], 0, { cast: false });
  }
  put(K.banner({ w: 0.85, h: 2.4, map: P.damask({ seed: 34, base: "#23407e", motif: "#e2b04a", step: 100, folds: 4 }) }), [1.3, 5.6, BZ + 0.02], 0, { cast: false });
  const tap = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.2), lam(P.tapestry({ seed: 35 }))); tap.position.set(3.65, 3.3, BZ + 0.05); add(tap, { cast: false });
  box(1.7, 0.08, 0.1, M.gold, 3.65, 4.44, BZ + 0.08, { cast: false });
  for (const x of [-3.95, 0.95, 2.2]) put(K.sconce(), [x, 2.55, BZ + 0.02]);
  for (const [x, z] of [[-4.48, -4.4], [-4.48, -0.8], [-4.48, 2.6]]) put(K.sconce(), [x, 2.6, z], Math.PI / 2);           // on the left wall between the windows
  const shTex = P.shield({ field: "#2a4fa0" });
  for (const x of [-3.0, 1.0]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.55), lam(shTex, null, { transparent: true, alphaTest: 0.5 })); s.position.set(x, 4.6, BZ + 0.1); s.userData.ink = 0.6; add(s, { cast: false }); }

  // ---- the judge's dais (it runs back to the wall), a low seat, the high bench (linenfold, red lily cloth, gilt beads)
  box(3.4, 0.9, -BZ - 2.75, M.oakH, JX, 0.45, (BZ - 2.75) / 2);                // dais
  put(K.beads({ len: 3.4, r: 0.03, mat: M.gold }), [JX, 0.88, -2.74]);
  box(0.5, 0.3, 0.6, M.oakH, JX + 1.95, 0.15, -2.9); box(0.5, 0.3, 0.3, M.oakH, JX + 1.95, 0.45, -3.05);   // two steps up
  box(1.3, 0.5, 0.6, M.linen, JX, 1.15, -3.75);                                  // the judge's seat (below the bench top)
  box(3.0, 2.0, 0.6, M.oak, JX, 1.0, -2.7);                                      // bench body
  for (const s of [-1, 1]) box(0.68, 1.5, 0.02, M.linen, JX + s * 1.1, 1.0, -2.395);   // linenfold panels either side of the cloth
  box(3.25, 0.09, 0.85, M.oakH, JX, 2.045, -2.78);                               // its top board
  box(3.3, 0.1, 0.1, M.dark, JX, 1.96, -2.36);                                   // a moulding under the top
  put(K.dentils({ len: 3.1, size: 0.05, mat: M.dark }), [JX, 1.87, -2.36]);
  put(K.beads({ len: 3.25, r: 0.025, mat: M.gold }), [JX, 2.1, -2.36]);
  box(3.25, 0.12, 0.7, M.oakH, JX, 0.06, -2.72);                                 // its plinth
  for (const s of [-1, 1]) { box(0.16, 2.0, 0.66, M.dark, JX + s * 1.5, 1.0, -2.7); put(K.pinnacle({ h: 0.5, r: 0.06, mat: M.dark }), [JX + s * 1.5, 2.09, -2.42]); }   // corner posts with finials
  const clothF = P.cloth({ seed: 31, base: "#b3202c", trim: "#dca33c", folds: 8 }); clothF.repeat.set(1, 1);
  const cf = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.5), lam(clothF)); cf.position.set(JX, 1.15, -2.385); cf.userData.ink = 0.8; add(cf, { cast: false });
  const shF = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.43), lam(shTex, null, { transparent: true, alphaTest: 0.5 })); shF.position.set(JX, 1.25, -2.37); shF.userData.ink = 0.6; add(shF, { cast: false });
  // on the bench: candelabra, books, ink, quill, seal, a scroll, papers
  const benchCandles = put(K.candelabrum({ h: 0.55, arms: 3 }), [JX - 1.25, 2.09, -2.85]); put(K.candlestick({ h: 0.3 }), [JX + 1.25, 2.09, -2.9]);
  put(K.book({ w: 0.42, d: 0.3, t: 0.08, color: 0 }), [JX + 0.72, 2.09, -2.9]); put(K.book({ w: 0.38, d: 0.28, t: 0.07, color: 1 }), [JX + 0.73, 2.17, -2.92], 0.2); put(K.book({ w: 0.36, d: 0.27, t: 0.06, color: 5 }), [JX + 0.7, 2.24, -2.9], -0.1);
  put(K.inkwell(), [JX - 0.85, 2.09, -2.72]); put(K.quill(), [JX - 0.83, 2.15, -2.72], 0.4); put(K.seal(), [JX + 0.3, 2.09, -2.68]);
  put(K.scroll({ len: 0.4 }), [JX - 0.3, 2.09, -2.95], 0.3);
  box(0.5, 0.012, 0.36, M.paper, JX - 0.5, 2.096, -2.68, { ry: 0.15 }); box(0.4, 0.012, 0.3, M.paper, JX + 0.05, 2.096, -2.66, { ry: -0.25 });

  // ---- a carpet runner from the bench steps toward the camera
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 7.4), lam(P.carpet({ seed: 36, w: 384, h: 1536, field: "#1f2f5e", border: "#8a1c24" })));
  rug.material.map.repeat.set(1, 3.4); rug.rotation.x = -Math.PI / 2; rug.position.set(0.45, 0.006, 1.45); rug.userData.ink = 0.3; add(rug, { cast: false });

  // ---- the dock: a proper court dock in small, for small defendants
  const DX = -0.05, DZ = 0.6, dw = 1.15, dd = 0.75, dh = 0.5;
  box(dw + 0.1, 0.08, dd + 0.1, M.oakH, DX, 0.04, DZ);                            // its floor, a step up
  for (const sz of [-1, 1]) box(dw, dh * 0.55, 0.04, M.linen, DX, 0.08 + dh * 0.275, DZ + sz * dd / 2);   // linenfold sides
  for (const sx of [-1, 1]) box(0.04, dh * 0.55, dd, M.linen, DX + sx * dw / 2, 0.08 + dh * 0.275, DZ);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { box(0.08, dh + 0.04, 0.08, M.dark, DX + sx * dw / 2, (dh + 0.04) / 2 + 0.04, DZ + sz * dd / 2);
    put(K.pinnacle({ h: 0.2, r: 0.04, mat: M.dark }), [DX + sx * dw / 2, dh + 0.08, DZ + sz * dd / 2]); }
  box(dw + 0.08, 0.05, 0.08, M.oakH, DX, dh + 0.06, DZ + dd / 2); box(dw + 0.08, 0.05, 0.08, M.oakH, DX, dh + 0.06, DZ - dd / 2);
  box(0.08, 0.05, dd + 0.08, M.oakH, DX - dw / 2, dh + 0.06, DZ); box(0.08, 0.05, dd + 0.08, M.oakH, DX + dw / 2, dh + 0.06, DZ);
  for (let i = 1; i < 7; i++) { const x = DX - dw / 2 + i * dw / 7; cyl(0.016, dh * 0.42, M.oakH, x, 0.08 + dh * 0.55 + dh * 0.2, DZ + dd / 2); cyl(0.016, dh * 0.42, M.oakH, x, 0.08 + dh * 0.55 + dh * 0.2, DZ - dd / 2); }
  for (let i = 1; i < 4; i++) for (const sx of [-1, 1]) { const z = DZ - dd / 2 + i * dd / 4; cyl(0.016, dh * 0.42, M.oakH, DX + sx * dw / 2, 0.08 + dh * 0.55 + dh * 0.2, z); }
  put(K.beads({ len: dw, r: 0.014, mat: M.gold }), [DX, 0.08 + dh * 0.55, DZ + dd / 2 + 0.03]);
  const dockCloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), lam(P.cloth({ seed: 37, base: "#b3202c", trim: "#dca33c", folds: 4, w: 256, h: 256 })));
  dockCloth.position.set(DX, 0.08 + dh * 0.3, DZ + dd / 2 + 0.025); dockCloth.userData.ink = 0.8; add(dockCloth, { cast: false });
  const dsh = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.155), lam(shTex, null, { transparent: true, alphaTest: 0.5 })); dsh.position.set(DX, 0.08 + dh * 0.33, DZ + dd / 2 + 0.03); add(dsh, { cast: false });
  box(0.32, 0.24, 0.26, M.oakH, DX, 0.2, DZ - 0.08);                              // the little stand the rat is on
  { const c = K.candlestick({ h: 0.3, glow: 1 }); c.scale.setScalar(0.4); put(c, [DX + dw / 2 - 0.12, dh + 0.085, DZ - dd / 2]); }   // its own tiny candle on the back rail
  put(K.book({ w: 0.12, d: 0.09, t: 0.025, color: 1 }), [DX - dw / 2 + 0.1, dh + 0.085, DZ + dd / 2], 0.1);   // a tiny book on the front rail

  // ---- dressing: the clerk's table with his things, a bookcase behind; benches at the right
  const CX = -2.6, CZ = -1.0;
  box(1.4, 0.07, 0.75, M.oakH, CX, 0.82, CZ); box(1.3, 0.25, 0.65, M.linen, CX, 0.66, CZ);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.08, 0.8, 0.08, M.dark, CX + sx * 0.62, 0.4, CZ + sz * 0.3);
  box(1.2, 0.05, 0.05, M.dark, CX, 0.12, CZ);
  box(0.5, 0.012, 0.35, M.paper, CX + 0.3, 0.858, CZ + 0.22, { ry: -0.5 });   // an old written sheet, pushed aside
  put(K.book({ w: 0.32, d: 0.24, t: 0.07, color: 2 }), [CX + 0.4, 0.855, CZ - 0.05], 0.2); put(K.book({ w: 0.3, d: 0.22, t: 0.06, color: 4 }), [CX + 0.42, 0.925, CZ - 0.07], -0.15);
  put(K.inkwell(), [CX - 0.45, 0.855, CZ + 0.12]); put(K.seal(), [CX + 0.42, 0.855, CZ + 0.3]);
  put(K.scroll({ len: 0.36 }), [CX - 0.1, 0.855, CZ - 0.25], 0.2); put(K.scroll({ len: 0.3 }), [CX + 0.05, 0.925, CZ - 0.22], 0.35);
  put(K.candlestick({ h: 0.26 }), [CX - 0.55, 0.855, CZ - 0.22]);
  box(0.45, 0.45, 0.45, M.oakH, CX + 0.1, 0.225, CZ + 0.75);                       // the clerk's stool
  put(K.shelf({ w: 1.5, h: 2.5, d: 0.42, rows: 4, seed: 9 }), [-3.85, 0, -2.0], Math.PI / 2);
  put(K.candelabrum({ h: 1.7, arms: 3 }), [-2.05, 0, -2.2]);
  put(K.candelabrum({ h: 1.7, arms: 3 }), [1.55, 0, -2.25]);
  for (let i = 0; i < 3; i++) put(K.bench({ len: 1.9 }), [3.35, 0, -0.6 + i * 1.3], 0, {});
  for (let i = 0; i < 2; i++) put(K.bench({ len: 1.7 }), [-3.3, 0, 1.6 + i * 1.3], 0, {});
  // a chest by the right wall, with a lock plate
  box(1.0, 0.55, 0.55, M.oak, 3.6, 0.275, -4.7); box(1.04, 0.08, 0.59, M.dark, 3.6, 0.58, -4.7); box(0.14, 0.18, 0.02, M.gold, 3.6, 0.42, -4.42);
  for (const s of [-1, 1]) box(0.05, 0.56, 0.57, KM.iron, 3.6 + s * 0.35, 0.28, -4.7);

  // ---- light: a low warm sun through the left windows, cool violet sky light in the shade, a weak warm bounce
  const stainedMats = []; G.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial && o.userData.glow > 0 && !o.userData.noDepth) stainedMats.push(o); });
  const DAY = { hemi: 1.15, bounce: 1.25 };   // round 4: the day court came up (film median 57 of 255); night values unchanged
  const hemi = new THREE.HemisphereLight(0x7a76d0, 0x4a3026, DAY.hemi); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc27c, 4.6); sun.position.set(-11.5, 7.4, 1.0); sun.target.position.set(0, 0, 0.4); scene.add(sun); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); const sc = sun.shadow.camera; sc.left = -11; sc.right = 11; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 45;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  const bounce = new THREE.DirectionalLight(0xffcf9a, DAY.bounce); bounce.position.set(3, 2.5, 6); scene.add(bounce);
  // the candles light what is near them: one warm point light at the bench (cheap, no shadow)
  const candle = new THREE.PointLight(0xffb560, 0.9, 4.5, 2); candle.position.set(JX - 1.25, 2.9, -2.6); scene.add(candle);


  // ======== round 2 additions ========
  const add2 = (o, pos, ry, opt) => K.place(G, o, pos, ry, opt);

  // ---- the dark corridor behind the door: floor, walls and a vault falling into darkness, the door leaf open against its wall
  const corr = { x0: 4.5, x1: 10.5, z0: DZc - DW / 2 - 0.05, z1: DZc + DW / 2 + 0.05, h: 2.9 };
  const darkStone = new THREE.MeshLambertMaterial({ map: T.wall, vertexColors: true, color: 0x9088a0 }), darkFloor = new THREE.MeshLambertMaterial({ map: T.floor, vertexColors: true, color: 0x9088a0 });
  const fall = (x) => 0.1 + 0.62 * Math.exp(-(x - corr.x0) / 2.4);                            // brightness falls off into the corridor
  function cplane(w, h, mat, pos, rot, fx) {
    const g = new THREE.PlaneGeometry(w, h, Math.ceil(w * 4), Math.ceil(h * 2)), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
    const m = new THREE.Mesh(g, mat); m.position.set(pos[0], pos[1], pos[2]); m.rotation.set(rot[0], rot[1], rot[2]); m.updateMatrix();
    P.shade(g, (x, y, z) => { const v = new THREE.Vector3(x, y, z).applyMatrix4(m.matrix); return fx(v.x); });
    return add(m);
  }
  const cl = corr.x1 - corr.x0, cx = (corr.x0 + corr.x1) / 2, cw = corr.z1 - corr.z0;
  cplane(cl, cw, darkFloor, [cx, 0.002, DZc], [-Math.PI / 2, 0, 0], fall);
  cplane(cl, corr.h, darkStone, [cx, corr.h / 2, corr.z0], [0, 0, 0], fall);
  cplane(cl, corr.h, darkStone, [cx, corr.h / 2, corr.z1], [0, Math.PI, 0], fall);
  cplane(cl, cw, darkStone, [cx, corr.h, DZc], [Math.PI / 2, 0, 0], fall);
  cplane(cw, corr.h, darkStone, [corr.x1, corr.h / 2, DZc], [0, -Math.PI / 2, 0], () => 0.08);
  for (let x = corr.x0 + 1.2; x < corr.x1; x += 1.5) box(0.2, 0.18, cw, M.dark, x, corr.h - 0.09, DZc, { cast: false });   // ribs
  { const sl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.7), new THREE.MeshBasicMaterial({ color: 0x8090b8 })); sl.rotation.y = -Math.PI / 2; sl.position.set(corr.x1 - 0.02, 1.7, DZc); sl.userData.glow = 0.5; sl.userData.ink = 0.2; add(sl, { cast: false, receive: false }); }   // a far arrow slit
  for (const s of [-1, 1]) box(0.4, DH + 0.1, 0.16, M.pillar, 4.62, (DH + 0.1) / 2, DZc + s * (DW / 2 + 0.08), { cast: false });   // stone jambs (the wall's depth)
  add2(K.arch({ span: DW, spring: DH, thick: 0.2, depth: 0.12, mat: M.pillar, keystone: false }), [4.47, 0, DZc], -Math.PI / 2, { cast: false });
  add2(K.door({ w: DW - 0.04, h: DH + 0.4, mat: M.oak }), [4.68, 0, corr.z1 - 0.06], 0);
  add2(K.sconce(), [4.48, 2.5, DZc - DW / 2 - 0.55], -Math.PI / 2);
  const doorLight = new THREE.PointLight(0xffb560, 0.8, 3.6, 2); doorLight.position.set(4.0, 2.4, DZc - DW / 2 - 0.5); G.add(doorLight);   // a warm pool at the door, so the dark corridor reads against it
  add2(K.sconce(), [8.6, 1.9, corr.z0 + 0.01], 0);                                            // one candle far down the corridor: depth in the dark
  { const cpl = new THREE.PointLight(0xffa850, 0.6, 3.0, 2); cpl.position.set(8.6, 2.0, DZc - 0.2); G.add(cpl); }
  add2(K.sconce(), [6.4, 1.9, corr.z1 - 0.01], Math.PI);                                       // and one nearer, on the other wall: pools of light that step away
  { const cpl = new THREE.PointLight(0xffa850, 0.7, 3.0, 2); cpl.position.set(6.4, 2.0, DZc + 0.2); G.add(cpl); }
  for (let x = corr.x0 + 0.6; x < corr.x1; x += 1.5) box(0.05, 0.05, cw, M.dark, x, 0.012, DZc, { cast: false });   // floor joints across the corridor: lines that run away from us                          // a candle beside the door, in the room

  // ---- the lawyer's desk (in front of his spot) and the huge law book
  const DKX = 1.32, DKZ = 1.0, DKW = 1.3, DKD = 0.7, DKH = 0.8;
  box(DKW, 0.07, DKD, M.oakH, DKX, DKH - 0.035, DKZ); box(DKW - 0.1, 0.55, 0.03, M.linen, DKX, DKH - 0.35, DKZ + DKD / 2 - 0.05);
  for (const sx of [-1, 1]) { box(0.07, DKH - 0.07, DKD - 0.06, M.dark, DKX + sx * (DKW / 2 - 0.05), (DKH - 0.07) / 2, DKZ); }
  box(DKW - 0.1, 0.05, 0.05, M.dark, DKX, 0.12, DKZ);
  add2(K.beads({ len: DKW, r: 0.016, mat: M.gold }), [DKX, DKH - 0.075, DKZ + DKD / 2 + 0.01]);
  const book = add2(K.bigBook({ w: 1.0, d: 0.66, t: 0.2 }), [DKX + 0.2, DKH, DKZ - 0.02], 0);
  const deskCandle = add2(K.candlestick({ h: 0.28 }), [DKX + 0.52, DKH, DKZ - 0.24]); deskCandle.visible = false;   // round 4: hidden (it stood in view 4's line to the bar, and anywhere else on the desk in front of the lawyer); its light stays
  add2(K.inkwell(), [DKX - 0.5, DKH, DKZ + 0.2]); add2(K.quill(), [DKX - 0.48, DKH + 0.05, DKZ + 0.2], 0.6);
  add2(K.scroll({ len: 0.34 }), [DKX - 0.3, DKH, DKZ + 0.25], -0.3);
  const deskLight = new THREE.PointLight(0xffb560, 0.55, 3.2, 2); deskLight.position.set(DKX + 0.45, DKH + 0.85, DKZ - 0.45); G.add(deskLight);

  // ---- the bar: a low rail before the bench, right of the carpet (the defendant stands on the camera side)
  const BRX = 1.75, BRZ = -1.25, BRW = 1.5, BRH = 0.78;
  for (const sx of [-1, 1]) { box(0.1, BRH, 0.1, M.dark, BRX + sx * BRW / 2, BRH / 2, BRZ); add2(K.pinnacle({ h: 0.24, r: 0.045, mat: M.dark }), [BRX + sx * BRW / 2, BRH, BRZ]); }
  box(BRW + 0.1, 0.07, 0.12, M.oakH, BRX, BRH - 0.03, BRZ); box(BRW, 0.32, 0.04, M.linen, BRX, 0.2, BRZ);
  for (let i = 1; i < 9; i++) cyl(0.016, BRH - 0.42, M.oakH, BRX - BRW / 2 + i * BRW / 9, 0.36 + (BRH - 0.42) / 2, BRZ);
  add2(K.beads({ len: BRW, r: 0.014, mat: M.gold }), [BRX, BRH + 0.005, BRZ + 0.06]);

  // ---- the prosecutor's lectern, left of the carpet (he stands beside it, facing the court)
  add2(K.lectern({ h: 1.12, color: 7 }), [-2.05, 0, 1.0], 0.55);

  // ---- the clerk's blank page and the quill that hovers, then lies down
  const pageMat = new THREE.MeshLambertMaterial({ map: P.parchment({ seed: 22, blank: true, w: 384, h: 512 }) });
  const page = box(0.4, 0.008, 0.54, pageMat, CX - 0.12, 0.861, CZ + 0.03, { cast: false }); page.userData.ink = 0.5;
  const quillG = new THREE.Group(); quillG.add(K.quill({ size: 1.25, wide: 1.6, nib: true, mat: new THREE.MeshLambertMaterial({ color: 0xe8dcc4, emissive: 0x3a2a14, side: THREE.DoubleSide }) })); add2(quillG, [CX - 0.1, 0.95, CZ + 0.05]);
  const clerkLight = new THREE.PointLight(0xffb560, 0.5, 2.2, 2); clerkLight.position.set(CX - 0.45, 1.25, CZ - 0.1); G.add(clerkLight);   // the clerk's candle lights his page (warm at night)
  function setQuill(k) {
    k = Math.max(0, Math.min(1, k)); const e = k * k * (3 - 2 * k);
    quillG.position.set(CX - 0.1 + 0.03 * e, 0.95 - 0.082 * e, CZ + 0.05 + 0.1 * e);
    quillG.rotation.set(-0.75 + (-Math.PI / 2 + 0.05 + 0.75) * e, 0.35 * e, 0);   // hovering it leans well over, so a camera above sees the whole feather
  }
  setQuill(0);

  // ---- cobwebs on the dock: one in the front-left top corner, a bigger one across the back-right corner
  const webTex = P.cobweb({ seed: 61 }), webMat = new THREE.MeshLambertMaterial({ map: webTex, transparent: true, depthWrite: false, emissive: 0x1a1820, side: THREE.DoubleSide });
  const webs = [];
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), webMat); w.position.set(DX - dw / 2 + 0.04 + 0.17, dh + 0.04 - 0.17, DZ + dd / 2 + 0.045); w.userData.noDepth = true; G.add(w); webs.push(w); }
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), webMat); w.rotation.y = Math.PI; w.position.set(DX + dw / 2 - 0.04 - 0.21, dh + 0.04 - 0.21, DZ - dd / 2 - 0.04); w.userData.noDepth = true; G.add(w); webs.push(w); }
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), webMat); w.rotation.y = -Math.PI / 2; w.position.set(DX - dw / 2 - 0.045, dh + 0.04 - 0.15, DZ - dd / 2 + 0.04 + 0.15); w.userData.noDepth = true; G.add(w); webs.push(w); }
  const setCobweb = (on) => { for (const w of webs) w.visible = !!on; };
  setCobweb(false);

  const setCandles = (k) => K.burn(G, k);
  const openBook = (k) => book.open(k);

  // ---- night: what the set's own lights do (the mood does the rest)
  const C = (h) => new THREE.Color(h), lerpC = (a, b, k) => a.clone().lerp(b, k);
  const day = { sun: C(0xffc27c), hemiS: C(0x7a76d0), hemiG: C(0x4a3026), win: C(0xffffff) }, nite = { sun: C(0x7f98ff), hemiS: C(0x34478f), hemiG: C(0x121428), win: C(0x30407e) };
  function setNight(k) {
    k = Math.max(0, Math.min(1, k));
    sun.color.copy(lerpC(day.sun, nite.sun, k)); sun.intensity = 4.6 + (2.4 - 4.6) * k;
    hemi.color.copy(lerpC(day.hemiS, nite.hemiS, k)); hemi.groundColor.copy(lerpC(day.hemiG, nite.hemiG, k)); hemi.intensity = DAY.hemi + (0.34 - DAY.hemi) * k;
    bounce.intensity = DAY.bounce * (1 - k);
    candle.intensity = 0.9 + 0.8 * k; deskLight.intensity = 0.55 + 0.25 * k; clerkLight.intensity = 0.5 + 0.6 * k;
    for (const o of stainedMats) { o.material.color.copy(lerpC(day.win, nite.win, k)); o.userData.glow = (o.userData.glow0 == null ? (o.userData.glow0 = o.userData.glow) : o.userData.glow0) * (1 - 0.6 * k); }
  }

  const mood = { night: 0, clear: 0x1c1426, fog: [0x4a3f66, 9, 26],
    grade: { sat: 1.6, warmAmt: 0.6, shadowAmt: 0.55, shadowTint: [0.8, 0.86, 1.2], lift: [0.035, 0.024, 0.05] },
    glow: { amount: 1.0, haze: 0.006, hazeTint: [1.0, 0.92, 0.8] } };
  const moodNight = { night: 1, clear: 0x070a1e, fog: [0x16204a, 7, 22],
    grade: { sat: 1.45, warmAmt: 0.2, shadowAmt: 0.8, shadowTint: [0.62, 0.74, 1.45], lift: [0.012, 0.02, 0.06] },
    glow: { amount: 1.35, haze: 0.004, hazeTint: [0.55, 0.68, 1.0] } };

  return {
    name: "court", group: G, origin: [0, 0, 0], mood, moodNight,
    spots: {
      judge: [JX, 0.9, -3.25], lawyer: [0.95, 0, 0.35], dock: [DX, 0, DZ], rat: [DX, 0.32, DZ - 0.08],
      desk: [DKX, DKH, DKZ], bar: [BRX, 0, BRZ + 0.38], prosecutor: [-1.45, 0, 1.2],
      usher: [3.85, 0, DZc - 0.5], door: [4.5, 0, DZc],
      gallery: [[2.85, 0, -0.5], [3.8, 0, -0.5], [2.85, 0, 0.8], [3.8, 0, 0.8], [3.3, 0, 2.1]],
      clerk: [CX - 0.12, 0.866, CZ + 0.03], candles: [JX - 1.25, 2.09, -2.85],
      // extras (not in the plan's list, free to use): the book's spine, a place for the usher beside the bar, the far end of the corridor
      book: [DKX + 0.2, DKH, DKZ - 0.02], barUsher: [BRX + 0.85, 0, BRZ + 0.45], corridor: [corr.x1 - 0.5, 0, DZc],
    },
    // the engine calls onMood with this frame's mood: its night field (mixed by SF.mood.mix) drives the set's own lights
    onMood: (m) => setNight(m && typeof m.night === "number" ? m.night : 0),
    seatH: 0.46, openBook, setCandles, setCobweb, setQuill, setNight,
    sun, hemi, bounce, candle, deskLight, book, quill: quillG, page, webs, benchCandles, deskCandle, materials: M, textures: T,
  };
};
