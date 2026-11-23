/* props.js: set dressing built from three.js shapes, painted with SF.paint. Load after paint.js.
 *
 * Every builder returns a THREE.Group in metres, origin at its foot (or its back for wall pieces), facing +z.
 * Place it with SF.props.place(scene, group, [x, y, z], ry, { cast, receive, ink }) which sets shadows and ink on every mesh.
 * Light sources (flames) carry mesh.userData.glow = 0..3 and userData.noDepth = true (hand-off 1: C draws glow from it).
 *
 *   const K = SF.props;  K.mat.oak, K.mat.gold, ... (shared painted materials, made once)
 *   K.column({ h, r, mat, cap })          shaft with a moulded base, a ring and a carved capital
 *   K.arch({ span, spring, thick, depth }) pointed arch with two orders of moulding (stands on two columns or a wall)
 *   K.candelabrum({ arms, h })            standing gilt candlestick, 1 or 3 candles, lit
 *   K.candlestick({ h })                  small table candlestick, lit
 *   K.sconce()                            wall candle on a gilt back plate, lit
 *   K.shelf({ w, h, d, rows, seed })      open bookcase: books one by one, scrolls, a jar; carved cornice
 *   K.inkwell(), K.quill({ size, wide, mat, nib }), K.seal(), K.scroll({ len }), K.book({ w, d, t, color })
 *   K.bench({ len, back })                oak bench with shaped end boards
 *   K.banner({ w, h, map })               hanging banner on a rod with finials, pointed foot
 *   K.beads({ len, r, axis, mat })        a row of carved beads (merged into one mesh)
 *   K.dentils({ len, size, mat })         a row of small square blocks under a cornice
 *   K.pinnacle({ h, r, mat })             a carved spire with a ball finial
 *   K.chair({ w, h, seat, lights })       the judge's high-backed chair: linenfold, a carved arcade, a damask dossal, a canopy, our shield;
 *                                         seat: false = back and canopy only (a cloth of estate on a wall); lights: a candle on each post
 *   K.burn(obj, k)                        every candle inside obj burnt to k of its height (1 new, 0.15 stubs); flames move down with it
 *   K.bigBook({ w, d, t, cover })         a huge law book; book.open(k) 0 shut .. 1 flat open; book.pages.left/right
 *   K.lectern({ h }), K.stamp(), K.door({ w, h })   reading desk on a post; a seal stamp; a planked door leaf (hinge at x 0)
 *   K.merge(geometries)                   join non-indexed copies of several geometries into one
 */
window.SF = window.SF || {};
SF.props = (function () {
  "use strict";
  const P = SF.paint;
  const lam = (o) => new THREE.MeshLambertMaterial(o);
  let M = null;
  function mats() {
    if (M) return M;
    const t = (tex, m) => { tex.repeat.set(1 / m, 1 / m); return tex; };
    M = {
      oak: lam({ map: t(P.planks({ seed: 101, count: 5, base: "#7e4c2a", vertical: true, ends: 0 }), 0.9) }),
      oakDark: lam({ map: t(P.planks({ seed: 102, count: 5, base: "#4e2e1c", ends: 0 }), 0.9) }),
      linen: lam({ map: P.linenfold({ seed: 103, base: "#7a4a2a", cols: 2, rows: 1 }) }),
      gold: new THREE.MeshPhongMaterial({ map: P.gold({ seed: 104 }), color: 0xffffff, emissive: 0x2a1804, specular: 0xffe0a0, shininess: 38 }),   // gilt catches the light
      iron: lam({ color: 0x2c2628 }),
      wax: lam({ color: 0xf6ecd4, emissive: 0x3a3020 }),
      parchment: lam({ map: P.parchment({ seed: 105, lines: 9 }) }),
      parchRoll: lam({ color: 0xead8ae }),
      glassInk: lam({ color: 0x1e2230 }),
      feather: lam({ color: 0xf4f0e6, side: THREE.DoubleSide }),
      sealWax: lam({ color: 0xa8222c }),
      flame: new THREE.MeshBasicMaterial({ color: 0xffd36b }),
      flameCore: new THREE.MeshBasicMaterial({ color: 0xfff6d6 }),
      jar: lam({ color: 0x5a7a8a }),
      books: ["#7a2230", "#2c4a7a", "#5a3a22", "#3c5a32", "#8a6a2a", "#4a2a4a", "#9a4a22", "#2a2a3a"].map((c) => lam({ color: new THREE.Color(c) })),
    };
    return M;
  }
  // metre-scaled UVs on a box, so painted textures keep their size on any box
  function boxGeo(w, h, d) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, su = [d, d, w, w, w, w], sv = [h, h, d, d, h, h];
    for (let i = 0; i < uv.count; i++) { const f = Math.floor(i / 4); uv.setXY(i, uv.getX(i) * su[f], uv.getY(i) * sv[f]); }
    return g;
  }
  function mesh(geo, mat, x, y, z, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(m); return m; }
  const box = (p, w, h, d, mat, x, y, z) => mesh(boxGeo(w, h, d), mat, x, y, z, p);
  const cyl = (p, r0, r1, h, mat, x, y, z, seg) => mesh(new THREE.CylinderGeometry(r0, r1, h, seg || 20), mat, x, y, z, p);
  const sph = (p, r, mat, x, y, z) => mesh(new THREE.SphereGeometry(r, 14, 10), mat, x, y, z, p);
  // a lathe from a profile [[r, y], ...]
  const lathe = (p, prof, mat, x, y, z, seg) => mesh(new THREE.LatheGeometry(prof.map((q) => new THREE.Vector2(q[0], q[1])), seg || 24), mat, x, y, z, p);

  function merge(geos) {
    const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g)); let n = 0; parts.forEach((g) => (n += g.attributes.position.count));
    const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nrm.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
    const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nrm, 3)); out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return out;
  }
  function place(scene, obj, pos, ry, o) {
    o = o || {}; if (pos) obj.position.set(pos[0], pos[1], pos[2]); if (ry) obj.rotation.y = ry;
    obj.traverse((m) => { if (!m.isMesh) return; if (m.userData.noDepth) { m.castShadow = m.receiveShadow = false; return; }
      m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false; if (o.ink != null && m.userData.ink == null) m.userData.ink = o.ink; });
    scene.add(obj); return obj;
  }
  function flame(p, x, y, z, s, glow) {
    const M = mats(), f = sph(p, 0.032 * s, M.flame, x, y, z); f.scale.set(1, 1.9, 1); f.userData.noDepth = true; f.userData.glow = glow == null ? 2 : glow;
    const c = sph(p, 0.015 * s, M.flameCore, x, y - 0.012 * s, z); c.scale.set(1, 1.6, 1); c.userData.noDepth = true;
    f.userData.core = c; return f;
  }

  // remember a candle so burn() can shorten it: wax mesh, its bottom y and height, its flame (and the flame's core)
  function rec(g, wax, f, y0, h) {
    (g.userData.candles = g.userData.candles || []).push({ wax, flame: f, core: f.userData.core, y0, h, fy: f.position.y - (y0 + h), cy: f.userData.core.position.y - (y0 + h) });
  }
  // burn(obj, k): every candle inside obj at k of its new height (1 = new, 0.15 = stubs). Pure: the same k gives the same picture.
  function burn(obj, k) {
    k = Math.max(0.05, Math.min(1, k));
    obj.traverse((o) => { const cs = o.userData && o.userData.candles; if (!cs) return;
      for (const c of cs) { c.wax.scale.y = k; c.wax.position.y = c.y0 + c.h * k / 2; c.flame.position.y = c.y0 + c.h * k + c.fy; c.core.position.y = c.y0 + c.h * k + c.cy; } });
  }

  function beads(o) {
    o = o || {}; const n = Math.max(2, Math.round(o.len / (o.r * 2.4))), geos = [];
    for (let i = 0; i < n; i++) { const g = new THREE.SphereGeometry(o.r, 10, 8), t = -o.len / 2 + (i + 0.5) * o.len / n;
      g.translate(o.axis === "y" ? 0 : o.axis === "z" ? 0 : t, o.axis === "y" ? t : 0, o.axis === "z" ? t : 0); geos.push(g); }
    const grp = new THREE.Group(); mesh(merge(geos), o.mat || mats().gold, 0, 0, 0, grp); return grp;
  }
  function dentils(o) {
    o = o || {}; const s = o.size || 0.05, n = Math.max(2, Math.round(o.len / (s * 1.8))), geos = [];
    for (let i = 0; i < n; i++) { const g = boxGeo(s, s * 1.2, s); g.translate(-o.len / 2 + (i + 0.5) * o.len / n, 0, 0); geos.push(g); }
    const grp = new THREE.Group(); mesh(merge(geos), o.mat || mats().oakDark, 0, 0, 0, grp); return grp;
  }
  function pinnacle(o) {
    o = o || {}; const M = mats(), h = o.h || 0.5, r = o.r || 0.05, g = new THREE.Group(), mat = o.mat || M.oak;
    box(g, r * 2.2, h * 0.3, r * 2.2, mat, 0, h * 0.15, 0);
    const spire = cyl(g, 0.001, r * 1.3, h * 0.6, mat, 0, h * 0.6, 0, 4); spire.rotation.y = Math.PI / 4;
    for (let i = 0; i < 3; i++) { const k = sph(g, r * 0.35, mat, 0, h * (0.42 + i * 0.13), 0); k.position.x = r * (1.0 - i * 0.25) * (i % 2 ? -1 : 1); }   // crockets
    sph(g, r * 0.55, o.ball || M.gold, 0, h * 0.93, 0);
    return g;
  }

  function column(o) {
    o = o || {}; const M = mats(), h = o.h || 6, r = o.r || 0.32, mat = o.mat || M.oak, cap = o.cap || mat, g = new THREE.Group();
    box(g, r * 2.9, r * 0.5, r * 2.9, cap, 0, r * 0.25, 0);                                                                     // plinth
    lathe(g, [[r * 1.3, 0], [r * 1.32, r * 0.18], [r * 1.18, r * 0.26], [r * 1.12, r * 0.36], [r * 1.05, r * 0.5], [r, r * 0.56]], cap, 0, r * 0.5, 0);   // moulded base
    const shaftH = h - r * 0.5 - r * 0.56 - r * 1.6;
    const sh = new THREE.CylinderGeometry(r * 0.95, r, shaftH, 28, 1), uv = sh.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * r, uv.getY(i) * shaftH);
    mesh(sh, mat, 0, r * 1.06 + shaftH / 2, 0, g);
    const y0 = r * 1.06 + shaftH;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, r * 0.09, 8, 28), o.ringMat || M.gold); ring.rotation.x = Math.PI / 2; ring.position.y = y0 + r * 0.06; g.add(ring);
    lathe(g, [[r * 0.95, 0], [r * 1.05, r * 0.3], [r * 1.25, r * 0.7], [r * 1.5, r * 1.0], [r * 1.5, r * 1.05]], cap, 0, y0 + r * 0.12, 0, 4).rotation.y = Math.PI / 4;   // bell, square at the top
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, l = sph(g, r * 0.28, o.leafMat || cap, Math.cos(a) * r * 1.05, y0 + r * 0.95, Math.sin(a) * r * 1.05); l.scale.set(1, 0.7, 1); }   // carved leaf knobs at the corners
    box(g, r * 2.5, r * 0.32, r * 2.5, cap, 0, y0 + r * 1.32, 0);                                                                // abacus
    return g;
  }

  // a pointed arch ring: span (inner width), spring (height where the curve starts), thick (face width), depth
  function archShape(half, spring, k) {             // the pointed curve: two arcs whose centres sit k * half inside each side
    const R = half * (1 + k), pts = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI - i / 16 * Math.acos(k * half / R) ; pts.push([half * k + R * Math.cos(a), spring + R * Math.sin(a)]); }
    return pts;   // left half, from the spring point to the apex
  }
  function arch(o) {
    o = o || {}; const M = mats(), span = o.span || 3, spring = o.spring || 3, t = o.thick || 0.4, d = o.depth || 0.5, g = new THREE.Group();
    const ring = (half, th, dep, mat, z) => {
      const inner = archShape(half, spring, 0.6), outer = archShape(half + th, spring, 0.6 * half / (half + th) + 0.0);
      const s = new THREE.Shape(); s.moveTo(-half - th, 0);
      outer.forEach((q) => s.lineTo(q[0], q[1])); outer.slice().reverse().forEach((q) => s.lineTo(-q[0], q[1]));
      s.lineTo(half + th, 0); s.lineTo(half, 0);
      inner.slice().reverse().forEach((q) => s.lineTo(-q[0], q[1])); inner.forEach((q) => s.lineTo(q[0], q[1]));
      s.lineTo(-half, 0); s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: dep, bevelEnabled: false, curveSegments: 4 }); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.6, uv.getY(i) * 0.6);
      mesh(geo, mat, 0, 0, z, g);
    };
    ring(span / 2 + t * 0.45, t * 0.55, d, o.mat || M.oak, -d);               // outer order
    ring(span / 2, t * 0.45, d * 1.25, o.inner || o.mat || M.oak, -d * 1.1);  // inner order, stands proud
    if (o.keystone !== false) { const ho = span / 2 + t, c = 0.6 * (span / 2 + t * 0.45);   // the outer curve's half width and its centre offset
      const Ro = ho + c, apex = spring + Math.sqrt(Ro * Ro - c * c) - t * 0.3; sph(g, t * 0.22, o.boss || M.gold, 0, apex, d * 0.2); }
    return g;
  }

  function candlestick(o) {
    o = o || {}; const M = mats(), h = o.h || 0.32, g = new THREE.Group();
    lathe(g, [[0.001, 0], [0.09, 0], [0.085, 0.02], [0.03, 0.05], [0.022, 0.1], [0.04, 0.13], [0.018, 0.16], [0.02, h - 0.03], [0.05, h - 0.01], [0.04, h]], M.gold, 0, 0, 0);
    const wx = cyl(g, 0.022, 0.024, 0.2, M.wax, 0, h + 0.1, 0);
    rec(g, wx, flame(g, 0, h + 0.24, 0, 1, o.glow), h, 0.2);
    return g;
  }
  function candelabrum(o) {
    o = o || {}; const M = mats(), h = o.h || 1.6, arms = o.arms || 3, g = new THREE.Group();
    lathe(g, [[0.001, 0], [0.24, 0], [0.22, 0.05], [0.08, 0.12], [0.05, 0.22], [0.09, 0.3], [0.04, 0.38], [0.035, h * 0.55], [0.08, h * 0.6], [0.035, h * 0.66], [0.035, h - 0.05], [0.07, h - 0.02], [0.06, h]], M.gold, 0, 0, 0);
    const top = (x, y) => { cyl(g, 0.05, 0.03, 0.04, M.gold, x, y, 0); const wx = cyl(g, 0.026, 0.028, 0.24, M.wax, x, y + 0.14, 0); rec(g, wx, flame(g, x, y + 0.3, 0, 1.15, o.glow == null ? 2 : o.glow), y + 0.02, 0.24); };
    top(0, h);
    if (arms >= 3) for (const s of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, h * 0.72, 0), new THREE.Vector3(s * 0.22, h * 0.7, 0), new THREE.Vector3(s * 0.32, h * 0.8, 0), new THREE.Vector3(s * 0.33, h * 0.9, 0)]);
      mesh(new THREE.TubeGeometry(curve, 16, 0.022, 8), M.gold, 0, 0, 0, g); top(s * 0.33, h * 0.9 + 0.02);
    }
    return g;
  }
  function sconce(o) {
    o = o || {}; const M = mats(), g = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 6), M.gold); plate.rotation.x = Math.PI / 2; plate.scale.set(1, 1, 1.6); plate.position.set(0, 0, 0.015); g.add(plate);
    const arm = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.05, 0.02), new THREE.Vector3(0, -0.12, 0.15), new THREE.Vector3(0, -0.05, 0.26)]);
    mesh(new THREE.TubeGeometry(arm, 10, 0.018, 6), M.iron, 0, 0, 0, g);
    cyl(g, 0.07, 0.04, 0.04, M.gold, 0, -0.03, 0.27); const wx = cyl(g, 0.026, 0.028, 0.22, M.wax, 0, 0.09, 0.27); rec(g, wx, flame(g, 0, 0.23, 0.27, 1.1, o.glow == null ? 2 : o.glow), -0.02, 0.22);
    return g;
  }

  function book(o) {
    o = o || {}; const M = mats(), w = o.w || 0.3, d = o.d || 0.22, t = o.t || 0.06, g = new THREE.Group(), cover = o.mat || M.books[o.color || 0];
    box(g, w, t, d, cover, 0, t / 2, 0); box(g, w - 0.02, t * 0.7, d - 0.015, M.parchRoll, 0.012, t / 2, 0.006);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.035, t + 0.006, 0.035, M.gold, sx * (w / 2 - 0.015), t / 2, sz * (d / 2 - 0.015));   // gilt corners
    return g;
  }
  function scroll(o) {
    o = o || {}; const M = mats(), len = o.len || 0.32, g = new THREE.Group();
    const c = cyl(g, 0.035, 0.035, len, M.parchRoll, 0, 0.035, 0); c.rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) { const e = cyl(g, 0.012, 0.012, 0.05, M.oakDark, s * (len / 2 + 0.02), 0.035, 0); e.rotation.z = Math.PI / 2; }
    const rib = cyl(g, 0.037, 0.037, 0.02, M.sealWax, 0, 0.035, 0); rib.rotation.z = Math.PI / 2;
    return g;
  }
  function inkwell() {
    const M = mats(), g = new THREE.Group();
    lathe(g, [[0.001, 0], [0.06, 0], [0.065, 0.02], [0.06, 0.06], [0.03, 0.075], [0.025, 0.09], [0.03, 0.095]], M.glassInk, 0, 0, 0);
    cyl(g, 0.08, 0.085, 0.012, M.gold, 0, 0.006, 0);
    return g;
  }
  // quill(o): o.size scales it (1 = 0.36 m), o.wide widens the vane, o.mat a feather material, o.nib = true: an ink-dark nib
  function quill(o) {
    o = o || {}; const M = mats(), g = new THREE.Group(), k = o.size || 1, wv = o.wide || 1, fm = o.mat || M.feather;
    const shaft = cyl(g, 0.003 * k, 0.006 * k, 0.34 * k, fm, 0, 0.17 * k, 0);
    const s = new THREE.Shape(); s.moveTo(0, 0.07 * k); s.quadraticCurveTo(0.05 * k * wv, 0.18 * k, 0.012 * k, 0.36 * k); s.quadraticCurveTo(-0.02 * k * wv, 0.2 * k, 0, 0.07 * k);
    const vane = new THREE.Mesh(new THREE.ShapeGeometry(s, 8), fm); g.add(vane); vane.userData.ink = 0.8;
    if (o.nib) cyl(g, 0.0005, 0.0045 * k, 0.04 * k, M.glassInk, 0, 0.02 * k, 0);
    g.rotation.z = -0.35; return g;
  }
  function seal() {
    const M = mats(), g = new THREE.Group();
    lathe(g, [[0.001, 0], [0.04, 0], [0.042, 0.015], [0.02, 0.03], [0.014, 0.07], [0.026, 0.1], [0.02, 0.12], [0.001, 0.125]], M.gold, 0, 0, 0);
    const blob = cyl(g, 0.045, 0.05, 0.012, M.sealWax, 0.12, 0.006, 0.02);   // a wax seal pressed beside it
    return g;
  }

  function shelf(o) {
    o = o || {}; const M = mats(), w = o.w || 1.6, h = o.h || 2.4, d = o.d || 0.4, rows = o.rows || 4, r = P.rng(o.seed || 7), g = new THREE.Group(), wood = o.mat || M.oak;
    box(g, w, h, 0.04, M.oakDark, 0, h / 2, -d / 2 + 0.02);                                                           // back
    for (const s of [-1, 1]) box(g, 0.07, h, d, wood, s * (w / 2 - 0.035), h / 2, 0);                                  // sides
    box(g, w + 0.16, 0.1, d + 0.1, wood, 0, h + 0.05, 0.02); box(g, w + 0.26, 0.08, d + 0.16, wood, 0, h + 0.14, 0.04);    // cornice
    const den = dentils({ len: w, size: 0.045 }); den.position.set(0, h - 0.04, d / 2 + 0.01); g.add(den);
    const cr = beads({ len: w + 0.2, r: 0.025 }); cr.position.set(0, h + 0.2, d / 2 + 0.04); g.add(cr);
    const sh = (h - 0.2) / rows;
    for (let j = 0; j < rows; j++) {
      const y = 0.12 + j * sh; box(g, w - 0.1, 0.04, d - 0.02, wood, 0, y, 0);
      let x = -w / 2 + 0.1;
      while (x < w / 2 - 0.12) {
        const k = r();
        if (k < 0.08 && x < w / 2 - 0.45) { const sc = scroll({ len: 0.3 }); sc.position.set(x + 0.17, y + 0.02, 0.02); sc.rotation.y = (r() - 0.5) * 0.4; g.add(sc);       // a pile of scrolls
          const sc2 = scroll({ len: 0.28 }); sc2.position.set(x + 0.16, y + 0.09, 0.0); g.add(sc2); x += 0.36; continue; }
        if (k < 0.13 && x < w / 2 - 0.3) { const b = book({ w: 0.28, d: 0.22, t: 0.05, color: Math.floor(r() * 8) }); b.position.set(x + 0.15, y + 0.02, 0); g.add(b);       // books lying flat
          const b2 = book({ w: 0.25, d: 0.2, t: 0.045, color: Math.floor(r() * 8) }); b2.position.set(x + 0.15, y + 0.07, 0); b2.rotation.y = 0.2; g.add(b2); x += 0.31; continue; }
        if (k < 0.16) { lathe(g, [[0.001, 0], [0.06, 0], [0.075, 0.08], [0.05, 0.16], [0.035, 0.18], [0.04, 0.2]], M.jar, x + 0.08, y + 0.02, 0); x += 0.17; continue; }   // a jar
        if (k < 0.2) { x += 0.05 + r() * 0.08; continue; }                                                               // a gap
        const bw = 0.04 + r() * 0.05, bh = sh * (0.55 + r() * 0.33), bd = d * (0.55 + r() * 0.3), lean = r() < 0.12 ? (r() - 0.5) * 0.5 : 0;
        const bk = box(g, bw, bh, bd, M.books[Math.floor(r() * M.books.length)], x + bw / 2, y + 0.02 + bh / 2, -d / 2 + bd / 2 + 0.03); bk.rotation.z = lean;
        if (r() < 0.6) box(g, bw + 0.004, 0.012, bd + 0.004, M.gold, x + bw / 2, y + 0.02 + bh * 0.82, -d / 2 + bd / 2 + 0.03).rotation.z = lean;   // gilt band
        x += bw + 0.004 + Math.abs(lean) * 0.1;
      }
    }
    return g;
  }

  function bench(o) {
    o = o || {}; const M = mats(), len = o.len || 1.9, g = new THREE.Group(), wood = o.mat || M.oak;
    box(g, len, 0.07, 0.42, wood, 0, 0.46, 0);
    const s = new THREE.Shape(); s.moveTo(-0.21, 0); s.lineTo(-0.12, 0); s.quadraticCurveTo(0, 0.12, 0.12, 0); s.lineTo(0.21, 0); s.lineTo(0.18, 0.43); s.lineTo(0.21, 0.43);
    if (o.back !== false) { s.lineTo(0.21, 1.0); s.quadraticCurveTo(0.24, 1.12, 0.14, 1.12); s.quadraticCurveTo(0.16, 1.05, 0.1, 1.0); s.lineTo(0.1, 0.5); }
    s.lineTo(-0.21, 0.43); s.lineTo(-0.18, 0.43); s.closePath();
    for (const sx of [-1, 1]) { const e = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }), wood, sx * (len / 2 - 0.03) - 0.03, 0, 0, g); e.rotation.y = Math.PI / 2; }
    if (o.back !== false) { box(g, len - 0.06, 0.42, 0.04, M.linen, 0, 0.78, -0.16); box(g, len, 0.06, 0.08, wood, 0, 1.0, -0.16);
      const b = beads({ len: len - 0.1, r: 0.018, mat: wood }); b.position.set(0, 1.05, -0.16); g.add(b); }
    box(g, len - 0.06, 0.06, 0.04, wood, 0, 0.2, 0);
    return g;
  }

  function banner(o) {
    o = o || {}; const M = mats(), w = o.w || 0.8, h = o.h || 2.0, g = new THREE.Group();
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, -h * 0.85); s.lineTo(0, -h); s.lineTo(-w / 2, -h * 0.85); s.closePath();
    const geo = new THREE.ShapeGeometry(s, 4), uv = geo.attributes.uv, pos = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) { uv.setXY(i, pos.getX(i) / w + 0.5, 1 + pos.getY(i) / h); pos.setZ(i, 0.04 * Math.sin((pos.getX(i) / w) * Math.PI * 3)); }   // a little ripple
    geo.computeVertexNormals();
    const cl = mesh(geo, lam({ map: o.map, side: THREE.DoubleSide }), 0, -0.04, 0.06, g); cl.userData.ink = 0.8;
    const rod = cyl(g, 0.022, 0.022, w + 0.24, M.gold, 0, 0, 0.06); rod.rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) sph(g, 0.045, M.gold, sx * (w / 2 + 0.14), 0, 0.06);
    const tas = cyl(g, 0.012, 0.035, 0.12, M.gold, 0, -h - 0.1, 0.06);                  // tassel at the point
    return g;
  }

  function chair(o) {
    o = o || {}; const M = mats(), w = o.w || 1.5, h = o.h || 3.3, g = new THREE.Group(), wood = o.mat || M.oak;
    const seat = o.seat !== false;                                                                               // seat: false = only the back and canopy (a cloth of estate on a wall)
    if (seat) { box(g, w, 0.5, 0.7, wood, 0, 0.25, 0.25);                                                        // seat box
      box(g, w - 0.1, 0.5, 0.02, M.linen, 0, 0.25, 0.61); }                                                      // linenfold front of the seat
    box(g, w, h, 0.12, wood, 0, h / 2, -0.12);                                                                   // the back board
    const lf = box(g, w - 0.2, 0.9, 0.02, M.linen, 0, 0.98, -0.05);                                              // linenfold lower back
    const dossal = mesh(boxGeo(w - 0.24, h - 1.85, 0.02), lam({ map: o.dossal || P.damask({ seed: 120, base: "#24408a", motif: "#e2b04a", step: 96 }) }), 0, 1.8 + (h - 1.85) / 2, -0.04, g);
    dossal.userData.ink = 0.8;
    { const n = Math.max(3, Math.round((w - 0.3) / 0.28)), aw = (w - 0.3) / n;                                    // a carved band of small pointed arches with gilt bosses, under the dossal
      box(g, w - 0.2, 0.36, 0.04, M.oakDark, 0, 1.6, -0.03);
      for (let i = 0; i < n; i++) { const a = arch({ span: aw * 0.7, spring: 0.12, thick: 0.05, depth: 0.03, mat: M.oak, keystone: false }); a.position.set(-(w - 0.3) / 2 + (i + 0.5) * aw, 1.44, 0.0); g.add(a);
        sph(g, 0.025, M.gold, -(w - 0.3) / 2 + (i + 1) * aw, 1.72, 0.0); } }
    for (const s of [-1, 1]) { const fb = beads({ len: h - 1.85, r: 0.03, axis: "y" }); fb.position.set(s * (w / 2 - 0.13), 1.8 + (h - 1.85) / 2, -0.02); g.add(fb); }   // a gilt bead frame round the dossal
    { const fb = beads({ len: w - 0.2, r: 0.03 }); fb.position.set(0, 1.8, -0.02); g.add(fb); }
    for (const s of [-1, 1]) {                                                                                   // posts, armrests, finials
      box(g, 0.14, h + 0.1, 0.16, M.oakDark, s * (w / 2 - 0.07), (h + 0.1) / 2, -0.06);
      if (seat) { box(g, 0.12, 0.42, 0.7, wood, s * (w / 2 - 0.06), 0.71, 0.25); sph(g, 0.08, M.gold, s * (w / 2 - 0.06), 0.96, 0.56); }
      if (o.lights) { const sc = sconce({}); sc.position.set(s * (w / 2 - 0.07), h * 0.5, 0.02); g.add(sc); }       // a candle on each post at head height
      for (const k of [0.32, 0.62, 0.86]) { const b = sph(g, 0.06, M.gold, s * (w / 2 - 0.07), h * k, 0.04); b.scale.set(1, 0.8, 0.6); }   // gilt bosses up the posts
      const pn = pinnacle({ h: 0.7, r: 0.07 }); pn.position.set(s * (w / 2 - 0.07), h + 0.42, -0.06); g.add(pn);
    }
    // the canopy: a cornice that leans out, dentils, a fringe of pendants, a crest of small pinnacles
    box(g, w + 0.3, 0.16, 0.65, wood, 0, h + 0.05, 0.16); box(g, w + 0.42, 0.1, 0.75, M.oakDark, 0, h + 0.18, 0.18);
    const den = dentils({ len: w + 0.26, size: 0.05 }); den.position.set(0, h - 0.07, 0.49); g.add(den);
    const bd = beads({ len: w + 0.4, r: 0.028 }); bd.position.set(0, h + 0.24, 0.56); g.add(bd);
    for (let i = 0; i < 5; i++) { const x = -w / 2 + 0.1 + i * (w - 0.2) / 4; const pd = cyl(g, 0.035, 0.001, 0.16, M.gold, x, h - 0.2, 0.47, 6); }
    for (let i = 0; i < 3; i++) { const pn = pinnacle({ h: 0.42, r: 0.045 }); pn.position.set(-w / 4 + i * w / 4, h + 0.23, 0.3); g.add(pn); }
    const shTex = P.shield({ field: "#2a4fa0" });
    const sh = mesh(new THREE.PlaneGeometry(0.42, 0.5), lam({ map: shTex, transparent: true, alphaTest: 0.5 }), 0, h - 0.45, -0.02, g); sh.userData.ink = 0.6;
    return g;
  }

  // a huge law book lying on a table, spine along z. g.open(k): 0 = shut, 1 = lying open flat. Open width w, depth d, thickness t.
  function bigBook(o) {
    o = o || {}; const M = mats(), w = o.w || 1.0, d = o.d || 0.72, t = o.t || 0.22, g = new THREE.Group(), half = w / 2, pt = t / 2 - 0.024;
    const cover = lam({ map: (function () { const tx = P.plaster({ seed: 130, base: o.cover || "#7a2026", size: 256 }); tx.repeat.set(2, 2); return tx; })() });
    const page = (seed) => lam({ map: P.parchment({ seed, lines: 14, initial: seed % 2 ? "#a8222c" : null, w: 256, h: 360 }) });
    const side = lam({ color: 0xe8d6a8 });
    const L = new THREE.Group(), R = new THREE.Group(); g.add(L); g.add(R);
    box(L, half, 0.024, d, cover, -half / 2, 0.012, 0); box(L, half - 0.03, pt, d - 0.04, side, -half / 2 + 0.01, 0.024 + pt / 2, 0);
    const pl = mesh(new THREE.PlaneGeometry(half - 0.05, d - 0.06), page(131), -half / 2 + 0.012, 0.024 + pt + 0.002, 0, L); pl.rotation.x = -Math.PI / 2; pl.userData.ink = 0.3;
    R.position.y = t / 2;                                                // the hinge: the top of the left page block
    box(R, half, 0.024, d, cover, half / 2, -t / 2 + 0.012, 0); box(R, half - 0.03, pt, d - 0.04, side, half / 2 - 0.01, -t / 2 + 0.024 + pt / 2, 0);
    const pr = mesh(new THREE.PlaneGeometry(half - 0.05, d - 0.06), page(132), half / 2 - 0.012, 0.002, 0, R); pr.rotation.x = -Math.PI / 2; pr.userData.ink = 0.3;
    for (const [grp, sx, y] of [[L, -1, 0.012], [R, 1, -t / 2 + 0.012]]) for (const sz of [-1, 1]) box(grp, 0.07, 0.03, 0.07, M.gold, sx * (half - 0.03), y, sz * (d / 2 - 0.03));   // gilt corners
    for (const sz of [-1, 1]) { const cl = box(R, 0.05, 0.03, 0.08, M.gold, half - 0.01, -t / 2 + 0.03, sz * d * 0.25); }   // clasps
    const spine = cyl(g, t / 2, t / 2, d, cover, 0, t / 2, 0, 12); spine.rotation.x = Math.PI / 2; spine.scale.set(0.35, 1, 1);
    g.open = (k) => { k = Math.max(0, Math.min(1, k)); const e = k * k * (3 - 2 * k); R.rotation.z = Math.PI * (1 - e); spine.visible = e < 0.5; };
    g.pages = { left: pl, right: pr }; g.open(0);
    return g;
  }
  // a reading desk on one post: a sloping board with a lip, a book on it
  function lectern(o) {
    o = o || {}; const M = mats(), h = o.h || 1.15, g = new THREE.Group(), wood = o.mat || M.oak;
    box(g, 0.5, 0.08, 0.42, M.oakDark, 0, 0.04, 0);
    lathe(g, [[0.001, 0], [0.09, 0], [0.08, 0.06], [0.05, 0.12], [0.045, h - 0.2], [0.07, h - 0.14], [0.05, h - 0.1]], wood, 0, 0.08, 0);
    const top = new THREE.Group(); top.position.set(0, h, 0); top.rotation.x = 0.42; g.add(top);
    box(top, 0.62, 0.04, 0.46, wood, 0, 0, 0); box(top, 0.64, 0.06, 0.03, M.oakDark, 0, 0.03, 0.235);
    const b = book({ w: 0.42, d: 0.3, t: 0.05, color: o.color == null ? 3 : o.color }); b.position.set(0, 0.02, 0); top.add(b);
    const fr = box(g, 0.66, 0.24, 0.02, M.linen, 0, h - 0.18, 0.12); fr.rotation.x = 0.42;
    return g;
  }
  // a seal stamp (matrix): a turned wooden handle on a brass die
  function stamp() {
    const M = mats(), g = new THREE.Group();
    cyl(g, 0.045, 0.05, 0.03, M.gold, 0, 0.015, 0);
    lathe(g, [[0.001, 0.03], [0.03, 0.03], [0.018, 0.06], [0.022, 0.12], [0.034, 0.16], [0.03, 0.19], [0.001, 0.2]], M.oakDark, 0, 0, 0);
    return g;
  }
  // a planked door leaf with iron straps and a ring, hinge on the left edge (x = 0), w wide, h tall, facing +z
  function door(o) {
    o = o || {}; const M = mats(), w = o.w || 1.1, h = o.h || 2.3, g = new THREE.Group();
    box(g, w, h, 0.07, o.mat || M.oak, w / 2, h / 2, 0);
    for (const y of [0.3, h - 0.4]) { box(g, w * 0.85, 0.06, 0.02, M.iron, w * 0.45, y, 0.045); sph(g, 0.03, M.iron, w * 0.86, y, 0.05); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), M.iron); ring.position.set(w * 0.82, h * 0.48, 0.06); g.add(ring);
    return g;
  }

  return { get mat() { return mats(); }, merge, place, boxGeo, flame, column, arch, candlestick, candelabrum, sconce, shelf, inkwell, quill, seal, scroll, book, bench, banner, beads, dentils, pinnacle, chair,
    burn, bigBook, lectern, stamp, door };
})();
