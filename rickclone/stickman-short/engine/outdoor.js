/* outdoor.js: what the outdoor sets need (field by day, road by night). Load after paint.js and props.js, before sets/.
 * France about 1510. Everything is drawn by code: no models, no photos.
 *
 * Painters (each returns a THREE.CanvasTexture, sRGB, repeat-wrapped; seeded, so the same on every frame):
 *   O.paint.stubble({ seed })            barley stubble on dry earth: furrow rows, cut stalk ends, bare patches (tile ~4 m)
 *   O.paint.grass({ seed, base })        rough grass with blade strokes (tile ~3 m)
 *   O.paint.dirt({ seed, night })        a packed-earth street: wheel ruts, stones, a central gutter line, puddles (tile ~5 m)
 *   O.paint.tiles({ seed, base })        clay roof tiles in overlapping rows (tile ~2 m)
 *   O.paint.thatch({ seed })             straw thatch in combed courses (tile ~2 m)
 *   O.paint.patchwork({ seed, w, h })    farmland seen from afar: strips of field, hedges, tree dots (one image over a whole terrain)
 *   O.paint.windowLit({ seed, panes })   a small leaded window glowing warm from inside (night)
 *   O.paint.notice({ seed })             a summons: parchment, lines of hand, a red wax seal on a ribbon
 * Cut-outs (flat cards with their own ink outline; userData.card = true, so the engine treats them like characters: no
 * geometry ink, depth only where drawn):
 *   O.cloud(seed, { w, night })                  a flat cartoon cloud: puffs, flat bottom, a shaded underside, an ink edge
 *   O.village(seed, { w, dusk, lit })            a village on a hill: timber houses, red roofs, a church spire, trees
 *   O.treeCard(seed, { h })                      a round cartoon tree
 * Builders (THREE.Group, metres, origin at the foot, front facing +z):
 *   O.house({ seed, w, d, floors, jetty, roof, plaster, lit, door, windows })   a timber-framed town house; .userData.windows, .userData.door
 *   O.barrel({ seed }), O.cart({ seed }), O.well(), O.lamp({ light }), O.fence({ len }), O.crates({ seed }), O.tree({ seed, h })
 *   O.stalks({ seed, n, area: [x0, z0, x1, z1], keep(x, z), h, color, ears })   many stalks as ONE merged mesh (cheap)
 *   O.stubbleRows({ seed, area, keep, h, gap, step, lean })   cut barley in drilled rows, tufts of hollow straws (one mesh)
 *   O.hedge({ seed, len })
 * Sky:
 *   O.sky(stage, group, { night, top, horizon, clouds, moon, stars, sunDir })   a dome that rides with the camera (drawn
 *   behind everything, no depth, no ink); cartoon clouds, or moon and stars at night. Returns { dome, moon }.
 * Helpers: O.rng(seed), O.mat(map, opts) (Lambert), O.box(...), O.mergeColored(parts), O.isShown(obj)
 */
window.SF = window.SF || {};
SF.outdoor = (function () {
  "use strict";
  const INK = "#221a22";
  const rng = (seed) => { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hex = (h) => { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const rgb = (c, k = 1) => `rgb(${Math.round(Math.max(0, Math.min(255, c[0] * k)))},${Math.round(Math.max(0, Math.min(255, c[1] * k)))},${Math.round(Math.max(0, Math.min(255, c[2] * k)))})`;
  const rgba = (c, a, k = 1) => `rgba(${Math.round(Math.max(0, Math.min(255, c[0] * k)))},${Math.round(Math.max(0, Math.min(255, c[1] * k)))},${Math.round(Math.max(0, Math.min(255, c[2] * k)))},${a})`;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
  function tex(c, repeat) {
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (repeat) t.repeat.set(repeat[0], repeat[1]); return t;
  }
  function speckle(g, r, w, h, base, n, amt, size) {
    for (let i = 0; i < n; i++) { g.fillStyle = rgba(base, 0.15 + r() * 0.25, 1 + (r() - 0.5) * amt); const s = size * (0.4 + r());
      g.beginPath(); g.ellipse(r() * w, r() * h, s, s * (0.4 + r() * 0.6), r() * 3, 0, 7); g.fill(); }
  }
  // wrap-safe blobs: draw at (x, y) and at the copies across each edge, so a tile has no seam
  function wrapDraw(w, h, x, y, rad, fn) { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { const X = x + dx, Y = y + dy; if (X + rad < 0 || X - rad > w || Y + rad < 0 || Y - rad > h) continue; fn(X, Y); } }

  // ------------------------------------------------------------------ painters
  const paint = {
    stubble(o) {
      o = o || {}; const r = rng(o.seed || 1), S = 1024, [c, g] = canvas(S, S);
      const base = hex(o.base || "#b98d4c"), dark = hex("#6e4a28"), straw = hex("#e8c77a");
      g.fillStyle = rgb(base); g.fillRect(0, 0, S, S);
      speckle(g, r, S, S, base, 900, 0.5, 26);
      for (let i = 0; i < 26; i++) { const x = r() * S, y = r() * S, rad = 40 + r() * 120;          // bare earth patches
        wrapDraw(S, S, x, y, rad, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, rad); gr.addColorStop(0, rgba(dark, 0.4)); gr.addColorStop(1, rgba(dark, 0)); g.fillStyle = gr; g.fillRect(X - rad, Y - rad, rad * 2, rad * 2); }); }
      const rows = 16;                                                                              // furrows across the tile
      for (let i = 0; i < rows; i++) { const y = (i + 0.5) * S / rows;
        g.strokeStyle = rgba(dark, 0.45); g.lineWidth = 9; g.beginPath(); for (let x = 0; x <= S; x += 32) g.lineTo(x, y + 6 + Math.sin(x * 0.02 + i) * 3); g.stroke();
        g.strokeStyle = rgba(straw, 0.35); g.lineWidth = 5; g.beginPath(); for (let x = 0; x <= S; x += 32) g.lineTo(x, y - 6 + Math.sin(x * 0.02 + i) * 3); g.stroke(); }
      for (let i = 0; i < 5200; i++) {                                                               // cut stalk ends: short strokes, a light tip
        const x = r() * S, y = Math.floor(r() * rows) * S / rows + S / rows * 0.5 + (r() - 0.5) * 26, l = 6 + r() * 12, a = -1.2 - r() * 0.7;
        g.strokeStyle = rgba(r() < 0.5 ? straw : hex("#c9a35a"), 0.85); g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l * 0.3, y + Math.sin(a) * l); g.stroke();
        if (r() < 0.25) { g.fillStyle = rgba(dark, 0.5); g.fillRect(x - 2, y, 5, 2); } }
      for (let i = 0; i < 220; i++) { g.fillStyle = rgba(hex("#8a8278"), 0.8); const x = r() * S, y = r() * S, s = 2 + r() * 5; g.beginPath(); g.ellipse(x, y, s, s * 0.7, 0, 0, 7); g.fill(); }   // pebbles
      return tex(c);
    },
    grass(o) {
      o = o || {}; const r = rng(o.seed || 2), S = 512, [c, g] = canvas(S, S), base = hex(o.base || "#6f8a3a");
      g.fillStyle = rgb(base); g.fillRect(0, 0, S, S); speckle(g, r, S, S, base, 500, 0.5, 18);
      for (let i = 0; i < 4000; i++) { const x = r() * S, y = r() * S, l = 5 + r() * 10, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
        g.strokeStyle = rgba(base, 0.7, r() < 0.5 ? 0.7 : 1.3); g.lineWidth = 1.5 + r() * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      return tex(c);
    },
    dirt(o) {
      o = o || {}; const r = rng(o.seed || 3), S = 1024, [c, g] = canvas(S, S), base = hex(o.base || "#8a6a4a"), dark = hex("#3e2c22");
      g.fillStyle = rgb(base); g.fillRect(0, 0, S, S); speckle(g, r, S, S, base, 1200, 0.45, 22);
      for (const x of [0.28, 0.72]) {                                                             // two ruts along v (the road's length)
        g.strokeStyle = rgba(dark, 0.45); g.lineWidth = 46; g.beginPath(); for (let y = 0; y <= S; y += 16) g.lineTo(x * S + Math.sin(y * 0.0123 * Math.PI) * 10, y); g.stroke();
        g.strokeStyle = rgba(hex("#b49170"), 0.4); g.lineWidth = 8; g.beginPath(); for (let y = 0; y <= S; y += 16) g.lineTo(x * S + 26 + Math.sin(y * 0.0123 * Math.PI) * 10, y); g.stroke(); }
      g.strokeStyle = rgba(dark, 0.55); g.lineWidth = 14; g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.stroke();   // the gutter down the middle
      for (let i = 0; i < 520; i++) {                                                              // stones and cobbles, worn in
        const x = r() * S, y = r() * S, s = 5 + r() * 16, k = 0.8 + r() * 0.5, col = mix(hex("#9a8c7a"), base, r() * 0.5);
        wrapDraw(S, S, x, y, s, (X, Y) => { g.fillStyle = rgb(col, k); g.beginPath(); g.ellipse(X, Y, s, s * 0.75, r(), 0, 7); g.fill();
          g.strokeStyle = rgba(dark, 0.6); g.lineWidth = 2; g.stroke(); g.fillStyle = rgba([255, 240, 220], 0.18); g.beginPath(); g.ellipse(X - s * 0.25, Y - s * 0.25, s * 0.4, s * 0.25, 0, 0, 7); g.fill(); }); }
      for (let i = 0; i < 10; i++) { const x = r() * S, y = r() * S, rad = 30 + r() * 70;          // puddles (they pick up the sky at night)
        wrapDraw(S, S, x, y, rad, (X, Y) => { g.fillStyle = rgba(o.night ? hex("#4a5e8e") : hex("#6a7a8a"), 0.55); g.beginPath(); g.ellipse(X, Y, rad, rad * 0.45, r() * 0.4, 0, 7); g.fill();
          g.strokeStyle = rgba(dark, 0.5); g.lineWidth = 4; g.stroke(); }); }
      return tex(c);
    },
    tiles(o) {
      o = o || {}; const r = rng(o.seed || 4), W = 512, H = 512, [c, g] = canvas(W, H), base = hex(o.base || "#a4492e"), dark = hex("#3a1a16");
      g.fillStyle = rgb(dark); g.fillRect(0, 0, W, H);
      const rows = 12, cols = 10, th = H / rows, tw = W / cols;
      for (let j = rows; j >= 0; j--) for (let i = -1; i <= cols; i++) {
        const x = i * tw + (j % 2) * tw / 2, y = j * th, k = 0.78 + r() * 0.42, col = mix(base, hex(r() < 0.3 ? "#7a6a52" : "#c0603a"), r() * 0.35);
        const gr = g.createLinearGradient(0, y, 0, y + th * 1.25); gr.addColorStop(0, rgb(col, k * 0.75)); gr.addColorStop(0.5, rgb(col, k)); gr.addColorStop(1, rgb(col, k * 0.6));
        g.fillStyle = gr; g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + tw - 2, y); g.lineTo(x + tw - 3, y + th * 1.05); g.quadraticCurveTo(x + tw / 2, y + th * 1.3, x + 3, y + th * 1.05); g.closePath(); g.fill();
        g.strokeStyle = rgba(dark, 0.9); g.lineWidth = 2.5; g.stroke();
        if (r() < 0.12) { g.fillStyle = rgba(hex("#5e6a3a"), 0.5); g.beginPath(); g.ellipse(x + tw * r(), y + th * 0.8, 8, 4, 0, 0, 7); g.fill(); }   // moss
      }
      return tex(c);
    },
    thatch(o) {
      o = o || {}; const r = rng(o.seed || 5), W = 512, H = 512, [c, g] = canvas(W, H), base = hex(o.base || "#a8874e"), dark = hex("#4a3420");
      g.fillStyle = rgb(base, 0.85); g.fillRect(0, 0, W, H);
      const rows = 6, rh = H / rows;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < 900; i++) { const x = r() * W, y = j * rh + r() * rh, l = rh * (0.4 + r() * 0.6);
          g.strokeStyle = rgba(base, 0.6, 0.65 + r() * 0.7); g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.moveTo(x, y - l * 0.5); g.lineTo(x + (r() - 0.5) * 6, y + l * 0.5); g.stroke(); }
        g.fillStyle = rgba(dark, 0.55); g.fillRect(0, (j + 1) * rh - 7, W, 7);                    // the shadow under each course
        g.fillStyle = rgba(hex("#e6cf8a"), 0.35); g.fillRect(0, (j + 1) * rh - 12, W, 4);
      }
      speckle(g, r, W, H, hex("#5e5a3a"), 60, 0.4, 20);                                           // weather stains
      return tex(c);
    },
    patchwork(o) {
      o = o || {}; const r = rng(o.seed || 6), W = o.w || 2048, H = o.h || 2048, [c, g] = canvas(W, H);
      const greens = ["#7d9a46", "#8fa850", "#6c8a3e", "#a7a94e", "#c9b25e", "#b8984a", "#93a35a", "#c4a35c", "#768f44"].map(hex);
      g.fillStyle = rgb(greens[0]); g.fillRect(0, 0, W, H);
      // fields: rows of strips of varied length and colour, each with furrow lines; hedges between
      let y = 0;
      while (y < H) { const rh = 40 + r() * 110; let x = -r() * 100;
        while (x < W) { const fw = 80 + r() * 260, col = greens[Math.floor(r() * greens.length)];
          g.fillStyle = rgb(col); g.fillRect(x, y, fw, rh);
          g.strokeStyle = rgba(col, 0.5, 0.8); g.lineWidth = 2; const ang = r() < 0.5;
          for (let k = 6; k < (ang ? fw : rh); k += 9) { g.beginPath(); if (ang) { g.moveTo(x + k, y); g.lineTo(x + k, y + rh); } else { g.moveTo(x, y + k); g.lineTo(x + fw, y + k); } g.stroke(); }
          g.strokeStyle = rgba(hex("#3c4a22"), 0.85); g.lineWidth = 5; g.strokeRect(x, y, fw, rh);   // hedge line
          x += fw; }
        y += rh; }
      for (let i = 0; i < 500; i++) { const x = r() * W, y = r() * H, s = 2 + r() * 3;                // trees along the hedges
        g.fillStyle = rgb(hex("#3d5424"), 0.8 + r() * 0.4); g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); g.strokeStyle = rgba(hex("#1e2614"), 0.8); g.lineWidth = 2; g.stroke(); }
      return tex(c);
    },
    windowLit(o) {
      o = o || {}; const r = rng(o.seed || 7), W = 128, H = 192, [c, g] = canvas(W, H);
      const gr = g.createRadialGradient(W / 2, H * 0.6, 4, W / 2, H * 0.6, H * 0.7); gr.addColorStop(0, "#fff0b8"); gr.addColorStop(0.5, "#ffc560"); gr.addColorStop(1, "#d97a2a");
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = "#2a1a14"; g.lineWidth = 3;                                                   // leading: small diamond panes
      for (let k = -H; k < W + H; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke(); g.beginPath(); g.moveTo(k, H); g.lineTo(k + H, 0); g.stroke(); }
      g.lineWidth = 10; g.strokeRect(0, 0, W, H); g.fillStyle = "#2a1a14"; g.fillRect(W / 2 - 5, 0, 10, H); g.fillRect(0, H * 0.45, W, 9);   // frame, mullion, transom
      if (o.figure) { g.fillStyle = "rgba(60,30,20,0.6)"; g.beginPath(); g.arc(W * 0.3, H * 0.7, 14, 0, 7); g.fill(); g.fillRect(W * 0.3 - 16, H * 0.76, 32, 60); }
      return tex(c);
    },
    notice(o) {
      o = o || {}; const r = rng(o.seed || 8), W = 360, H = 480, [c, g] = canvas(W, H);
      g.fillStyle = "#efdcae"; g.beginPath(); g.moveTo(8, 6); g.lineTo(W - 10, 12); g.lineTo(W - 6, H - 8); g.lineTo(12, H - 4); g.closePath(); g.fill();
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,110,60,${0.05 + r() * 0.1})`; g.beginPath(); g.arc(r() * W, r() * H, 10 + r() * 50, 0, 7); g.fill(); }
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(120,80,40,0.25)"); gr.addColorStop(0.15, "rgba(0,0,0,0)"); gr.addColorStop(0.85, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(120,80,40,0.3)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = "#3a2418"; g.font = "bold 44px Georgia, serif"; g.textAlign = "center"; g.fillRect(70, 40, W - 140, 8);   // a heading stroke
      g.strokeStyle = "#3a2418"; g.lineCap = "round";
      for (let i = 0; i < 9; i++) { const y = 82 + i * 30; let x = 34; g.lineWidth = 4;              // lines of hand
        while (x < W - 40) { const l = 12 + r() * 38; g.beginPath(); g.moveTo(x, y + (r() - 0.5) * 2); g.lineTo(Math.min(x + l, W - 34), y + (r() - 0.5) * 2); g.stroke(); x += l + 8; } }
      g.strokeStyle = "#a01c24"; g.lineWidth = 12; g.beginPath(); g.moveTo(W * 0.5, H - 110); g.lineTo(W * 0.4, H - 10); g.moveTo(W * 0.5, H - 110); g.lineTo(W * 0.62, H - 14); g.stroke();   // ribbon
      g.fillStyle = "#b3202c"; g.beginPath(); for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, rr = 52 + (k % 2) * 6; g.lineTo(W / 2 + Math.cos(a) * rr, H - 110 + Math.sin(a) * rr); } g.closePath(); g.fill();
      g.strokeStyle = "#5a0c12"; g.lineWidth = 5; g.stroke(); g.beginPath(); g.arc(W / 2, H - 110, 32, 0, 7); g.stroke();
      g.fillStyle = "rgba(255,200,190,0.5)"; g.beginPath(); g.ellipse(W / 2 - 16, H - 128, 12, 7, -0.5, 0, 7); g.fill();
      g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(8, 6); g.lineTo(W - 10, 12); g.lineTo(W - 6, H - 8); g.lineTo(12, H - 4); g.closePath(); g.stroke();
      for (const [x, y] of [[26, 24], [W - 28, 30]]) { g.fillStyle = "#2c2628"; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.fillStyle = "#8a8288"; g.beginPath(); g.arc(x - 3, y - 3, 3, 0, 7); g.fill(); }   // nails
      const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
    },
  };

  // ------------------------------------------------------------------ materials and small helpers
  const lam = (map, o) => new THREE.MeshLambertMaterial(Object.assign({ map: map || null }, o || {}));
  const tile = (t, m) => { t.repeat.set(1 / m, 1 / m); return t; };
  let MATS = null;
  function mats() {
    if (MATS) return MATS;
    const P = SF.paint;
    MATS = {
      beam: lam(tile(P.planks({ seed: 301, count: 3, base: "#4a2c1c", ends: 0 }), 0.6)),
      plank: lam(tile(P.planks({ seed: 302, count: 5, base: "#7a5232", vertical: true }), 1.2)),
      plankGrey: lam(tile(P.planks({ seed: 303, count: 5, base: "#7c6a58", vertical: true }), 1.2)),
      stone: lam(tile(P.stone({ seed: 304, rows: 6, base: ["#a89a86", "#9a8c7a", "#b4a690", "#8e8070"], mortar: "#3a3030", gap: 6 }), 1.6)),
      stoneWarm: lam(tile(P.stone({ seed: 305, rows: 8, base: ["#c9b493", "#bba684", "#d2bd9c", "#ae987a"], mortar: "#3a2a26", gap: 6 }), 2.6)),
      plaster: [
        lam(tile(P.plaster({ seed: 306, base: "#e2d0a8" }), 2)), lam(tile(P.plaster({ seed: 307, base: "#d8c6a0" }), 2)),
        lam(tile(P.plaster({ seed: 308, base: "#e8d9b8" }), 2)), lam(tile(P.plaster({ seed: 309, base: "#d4b98e" }), 2)),
      ],
      tiles: [lam(tile(paint.tiles({ seed: 310 }), 2)), lam(tile(paint.tiles({ seed: 311, base: "#8c4a34" }), 2)), lam(tile(paint.tiles({ seed: 312, base: "#6a5a54" }), 2))],
      thatch: lam(tile(paint.thatch({ seed: 313 }), 2.2)),
      iron: lam(null, { color: 0x2a2428 }),
      rope: lam(null, { color: 0x9a8058 }),
      dark: lam(null, { color: 0x140e14 }),
      glass: new THREE.MeshBasicMaterial({ color: 0xffd27a }),
      water: lam(null, { color: 0x24304a }),
      leaf: lam(tile(paint.grass({ seed: 314, base: "#5a7a30" }), 1.5)),
      bark: lam(tile(P.planks({ seed: 315, count: 4, base: "#4e3a28", vertical: true, gap: 0 }), 0.8)),
      sack: lam(tile(P.plaster({ seed: 316, base: "#bfa57a" }), 0.6)),
      shutter: [lam(tile(P.planks({ seed: 317, count: 3, base: "#3e5a6a", vertical: true }), 0.6)), lam(tile(P.planks({ seed: 318, count: 3, base: "#6a3a2a", vertical: true }), 0.6)), lam(tile(P.planks({ seed: 319, count: 3, base: "#4a5a3a", vertical: true }), 0.6))],
    };
    return MATS;
  }
  const boxGeo = (w, h, d) => (SF.props && SF.props.boxGeo ? SF.props.boxGeo(w, h, d) : new THREE.BoxGeometry(w, h, d));
  function box(parent, w, h, d, mat, x, y, z, o) {
    const m = new THREE.Mesh(boxGeo(w, h, d), mat); m.position.set(x, y, z); if (o && o.ry) m.rotation.y = o.ry; if (o && o.rz) m.rotation.z = o.rz; if (o && o.rx) m.rotation.x = o.rx;
    m.castShadow = !(o && o.cast === false); m.receiveShadow = true; if (o && o.ink != null) m.userData.ink = o.ink; if (parent) parent.add(m); return m;
  }
  function cyl(parent, r0, r1, h, mat, x, y, z, seg) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg || 16), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m; }
  // join geometries (each optionally transformed by a Matrix4 and tinted) into ONE non-indexed geometry with vertex colours
  function mergeColored(parts) {
    // each distinct source geometry is made non-indexed once; every part is written straight into the output arrays
    const cache = new Map(); let n = 0;
    const src = (g) => { let c = cache.get(g); if (!c) { const ng = g.index ? g.toNonIndexed() : g; c = { p: ng.attributes.position.array, nr: ng.attributes.normal.array, uv: ng.attributes.uv ? ng.attributes.uv.array : null, k: ng.attributes.position.count }; cache.set(g, c); } return c; };
    for (const p of parts) n += src(p.geo).k;
    const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
    const nm = new THREE.Matrix3(), v = new THREE.Vector3(); let o = 0;
    for (const p of parts) { const S = src(p.geo), e = p.m ? p.m.elements : null, c = p.color || [1, 1, 1], gr = p.grad; if (e) nm.getNormalMatrix(p.m);
      for (let i = 0; i < S.k; i++) { const x = S.p[i * 3], y = S.p[i * 3 + 1], z = S.p[i * 3 + 2], j = (o + i) * 3;
        if (e) { pos[j] = e[0] * x + e[4] * y + e[8] * z + e[12]; pos[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; pos[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
          v.set(S.nr[i * 3], S.nr[i * 3 + 1], S.nr[i * 3 + 2]).applyMatrix3(nm).normalize(); nrm[j] = v.x; nrm[j + 1] = v.y; nrm[j + 2] = v.z; }
        else { pos[j] = x; pos[j + 1] = y; pos[j + 2] = z; nrm[j] = S.nr[i * 3]; nrm[j + 1] = S.nr[i * 3 + 1]; nrm[j + 2] = S.nr[i * 3 + 2]; }
        if (S.uv) { uv[(o + i) * 2] = S.uv[i * 2]; uv[(o + i) * 2 + 1] = S.uv[i * 2 + 1]; }
        const f = gr ? gr[0] + (gr[1] - gr[0]) * Math.max(0, Math.min(1, y)) : 1;
        col[j] = c[0] * f; col[j + 1] = c[1] * f; col[j + 2] = c[2] * f * (gr ? 0.85 + 0.15 * f : 1); }
      o += S.k; }
    const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
    out.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); out.setAttribute("color", new THREE.BufferAttribute(col, 3)); return out;
  }
  const M4 = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy || 1, sz || 1));
  function isShown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  // a flat cut-out from a canvas: a plane, alpha-tested; treated as a card by the engine (its own ink, no geometry ink)
  function cutout(c, w, h, o) {
    o = o || {}; const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const mat = o.basic ? new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, fog: o.fog !== false })
      : new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: o.lift == null ? 0.25 : o.lift });
    const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0);
    const m = new THREE.Mesh(g, mat); m.userData.card = true; m.castShadow = false; m.receiveShadow = false;
    if (o.shadow) { m.castShadow = true; m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5, side: THREE.DoubleSide }); }
    return m;
  }

  // ------------------------------------------------------------------ cut-outs
  function puffs(g, r, W, H, n, flatY, lw, fill, under, shadeY) {
    const P = [];
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = W * (0.12 + 0.76 * t), big = Math.sin(t * Math.PI); const rad = H * (0.16 + 0.22 * big * (0.7 + r() * 0.5));
      P.push([x, flatY - rad * (0.35 + r() * 0.35), rad]); }
    for (let i = 0; i < 3; i++) P.push([W * (0.3 + r() * 0.4), flatY - H * (0.45 + r() * 0.12), H * (0.15 + r() * 0.08)]);
    const shape = (grow) => { g.beginPath(); for (const [x, y, rad] of P) { g.moveTo(x + rad + grow, y); g.arc(x, y, rad + grow, 0, Math.PI * 2); } };
    g.save(); g.beginPath(); g.rect(0, 0, W, flatY + lw); g.clip();
    g.fillStyle = INK; shape(lw); g.fill();
    g.restore(); g.save(); g.beginPath(); g.rect(0, 0, W, flatY); g.clip();
    g.fillStyle = fill; shape(0); g.fill();
    g.save(); shape(0); g.clip(); g.fillStyle = under; g.beginPath();                              // a flat shaded underside, bumpy top edge
    g.moveTo(0, H); for (let x = 0; x <= W; x += W / 12) g.lineTo(x, shadeY + Math.sin(x * 0.03) * H * 0.03); g.lineTo(W, H); g.fill();
    g.restore(); g.restore();
    return P;
  }
  function cloud(seed, o) {
    o = o || {}; const r = rng(seed), W = 1024, H = 512, [c, g] = canvas(W, H);
    const fill = o.night ? "#5a6a9a" : "#fffaf0", under = o.night ? "#3a4674" : "#c9d6ea";
    const P = puffs(g, r, W, H, 4 + Math.floor(r() * 3), H * 0.86, 12, fill, under, H * 0.66);
    if (!o.night) { g.save(); g.globalAlpha = 0.85; g.fillStyle = "#ffffff"; for (const [x, y, rad] of P.slice(0, 3)) { g.beginPath(); g.ellipse(x - rad * 0.3, y - rad * 0.4, rad * 0.25, rad * 0.14, -0.4, 0, 7); g.fill(); } g.restore(); }
    return cutout(c, o.w || 14, (o.w || 14) * H / W, { basic: true, fog: false });
  }
  // a village: house shapes, a church with a spire, trees; drawn on one canvas; dusk lights the windows
  function village(seed, o) {
    o = o || {}; const r = rng(seed), W = 1024, H = 512, [c, g] = canvas(W, H), lw = 7;
    const walls = ["#efe2c2", "#e4d2aa", "#f2e6cc", "#dcc69c"], roofs = ["#b0483a", "#9a3e30", "#8a5a42", "#c05a3e", "#7a6a5a"];
    const items = [];
    const nT = 4 + Math.floor(r() * 3); for (let i = 0; i < nT; i++) items.push({ k: "tree", x: W * (0.06 + r() * 0.88), s: 55 + r() * 40, z: r() * 0.5 });
    const nH = 5 + Math.floor(r() * 4); for (let i = 0; i < nH; i++) items.push({ k: "house", x: W * (0.12 + r() * 0.76), w: 90 + r() * 80, h: 70 + r() * 60, z: 0.5 + r() * 0.5 });
    items.push({ k: "church", x: W * (0.35 + r() * 0.3), z: 0.45 });
    items.sort((a, b) => a.z - b.z);
    const base = H - 40;
    for (const it of items) {
      const yb = base - (1 - it.z) * 70;
      g.lineJoin = "round"; g.lineWidth = lw; g.strokeStyle = INK;
      if (it.k === "tree") { g.fillStyle = "#4e3a28"; g.fillRect(it.x - 6, yb - it.s * 0.6, 12, it.s * 0.6); g.strokeRect(it.x - 6, yb - it.s * 0.6, 12, it.s * 0.6);
        g.fillStyle = r() < 0.5 ? "#4f6e2c" : "#5e7e34"; g.beginPath(); g.arc(it.x, yb - it.s, it.s * 0.55, 0, 7); g.fill(); g.stroke();
        g.fillStyle = "rgba(255,255,200,0.18)"; g.beginPath(); g.arc(it.x - it.s * 0.2, yb - it.s * 1.15, it.s * 0.22, 0, 7); g.fill(); continue; }
      if (it.k === "house") { const x0 = it.x - it.w / 2, top = yb - it.h, rh = it.h * 0.75;
        g.fillStyle = walls[Math.floor(r() * walls.length)]; g.fillRect(x0, top, it.w, it.h); g.strokeRect(x0, top, it.w, it.h);
        g.strokeStyle = "#4a2c1c"; g.lineWidth = 4; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x0 + it.w * k / 4, top); g.lineTo(x0 + it.w * k / 4, yb); g.stroke(); }
        g.beginPath(); g.moveTo(x0, top + it.h * 0.45); g.lineTo(x0 + it.w, top + it.h * 0.45); g.stroke(); g.strokeStyle = INK; g.lineWidth = lw;
        g.fillStyle = roofs[Math.floor(r() * roofs.length)]; g.beginPath(); g.moveTo(x0 - 10, top); g.lineTo(it.x, top - rh); g.lineTo(x0 + it.w + 10, top); g.closePath(); g.fill(); g.stroke();
        const lit = o.lit && r() < 0.6; g.fillStyle = lit ? "#ffcf6a" : "#2a2230"; for (const fx of [0.25, 0.7]) { g.fillRect(x0 + it.w * fx - 8, top + it.h * 0.55, 16, 18); }
        g.fillStyle = "#3a2418"; g.fillRect(it.x - 9, yb - 30, 18, 30); continue; }
      if (it.k === "church") { const w = 120, h = 110, x0 = it.x - w / 2, top = yb - h;
        g.fillStyle = "#d6c8a8"; g.fillRect(x0, top, w, h); g.strokeRect(x0, top, w, h);
        g.fillStyle = "#6a5a54"; g.beginPath(); g.moveTo(x0 - 8, top); g.lineTo(it.x, top - 60); g.lineTo(x0 + w + 8, top); g.closePath(); g.fill(); g.stroke();
        const tx = x0 + w - 30; g.fillStyle = "#cbbd9c"; g.fillRect(tx - 24, top - 90, 48, 90 + h); g.strokeRect(tx - 24, top - 90, 48, 90 + h);
        g.fillStyle = "#5a4a50"; g.beginPath(); g.moveTo(tx - 30, top - 90); g.lineTo(tx, top - 230); g.lineTo(tx + 30, top - 90); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(tx, top - 230); g.lineTo(tx, top - 256); g.moveTo(tx - 10, top - 246); g.lineTo(tx + 10, top - 246); g.stroke();
        g.fillStyle = o.lit ? "#ffcf6a" : "#2a2230"; g.beginPath(); g.ellipse(it.x - 20, top + 50, 10, 18, 0, 0, 7); g.fill(); g.fillRect(tx - 7, top - 70, 14, 22); }
    }
    // the hill's own ground under the houses, so the village sits on the hill and not in the air
    g.fillStyle = o.ground || "#7d9a46"; g.beginPath(); g.moveTo(0, H); g.lineTo(0, base - 6); for (let x = 0; x <= W; x += 64) g.lineTo(x, base - 6 + Math.sin(x * 0.01 + seed) * 8); g.lineTo(W, H); g.closePath(); g.fill();
    return cutout(c, o.w || 9, (o.w || 9) * H / W, { lift: o.dusk ? 0.12 : 0.3 });
  }
  function treeCard(seed, o) {
    o = o || {}; const r = rng(seed), W = 256, H = 384, [c, g] = canvas(W, H);
    g.lineWidth = 8; g.strokeStyle = INK; g.lineJoin = "round";
    g.fillStyle = "#4e3a28"; g.beginPath(); g.moveTo(W / 2 - 14, H); g.lineTo(W / 2 - 8, H * 0.5); g.lineTo(W / 2 + 8, H * 0.5); g.lineTo(W / 2 + 14, H); g.closePath(); g.fill(); g.stroke();
    const blobs = []; for (let i = 0; i < 6; i++) blobs.push([W / 2 + (r() - 0.5) * W * 0.4, H * (0.25 + r() * 0.2), W * (0.18 + r() * 0.1)]);
    g.fillStyle = INK; for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x, y, rr + 6, 0, 7); g.fill(); }
    g.fillStyle = o.color || "#56782e"; for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
    g.fillStyle = "rgba(30,50,20,0.45)"; g.beginPath(); g.rect(0, H * 0.36, W, H); g.save(); g.clip(); for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); } g.restore();
    const h = o.h || 6; return cutout(c, h * W / H, h, { shadow: !!o.shadow });
  }

  // ------------------------------------------------------------------ builders
  // a timber-framed town house: stone plinth, ground floor, a jettied upper floor, studs, rails and braces in dark oak,
  // a steep gable roof (tiles or thatch), a door with a frame, small windows with shutters (or lit, at night)
  function house(o) {
    o = o || {}; const r = rng(o.seed || 11), M = mats(), G = new THREE.Group();
    const w = o.w || 5, d = o.d || 6, fl = o.floors || 2, fh = o.floorH || 2.6, jet = o.jetty == null ? 0.35 : o.jetty;
    const pl = M.plaster[Math.floor(r() * M.plaster.length)], roofM = o.roof === "thatch" ? M.thatch : M.tiles[Math.floor(r() * M.tiles.length)];
    const windows = [], beams = [];
    box(G, w + 0.08, 0.5, d + 0.08, M.stone, 0, 0.25, 0);                                                 // plinth
    let yb = 0.5, front = d / 2;
    for (let f = 0; f < fl; f++) {
      const ext = f * jet, H = fh - (f === 0 ? 0.5 : 0), body = box(G, w, H, d + ext, pl, 0, yb + H / 2, ext / 2);
      body.userData.ink = 0.9; const fz = front + ext;
      // the frame on the front face: posts, rails, braces (boxes, standing 4 cm proud)
      const posts = Math.max(3, Math.round(w / 0.9));
      for (let i = 0; i <= posts; i++) beams.push({ geo: boxGeo(0.16, H, 0.08), m: M4(-w / 2 + 0.08 + i * (w - 0.16) / posts, yb + H / 2, fz + 0.02) });
      for (const yy of [yb + 0.08, yb + H * 0.45, yb + H - 0.08]) beams.push({ geo: boxGeo(w + 0.04, 0.15, 0.09), m: M4(0, yy, fz + 0.03) });
      if (r() < 0.8) for (const s of [-1, 1]) { const L = Math.hypot(w / posts, H * 0.45); beams.push({ geo: boxGeo(0.12, L, 0.07), m: M4(s * (w / 2 - w / posts / 2 - 0.08), yb + H * 0.22, fz + 0.035, 0, 0, s * Math.atan2(w / posts, H * 0.45)) }); }
      // the side faces get posts and rails too
      for (const sx of [-1, 1]) { for (let i = 0; i <= 3; i++) beams.push({ geo: boxGeo(0.08, H, 0.16), m: M4(sx * (w / 2 + 0.02), yb + H / 2, -d / 2 + 0.1 + i * (d + ext - 0.2) / 3) });
        beams.push({ geo: boxGeo(0.09, 0.15, d + ext), m: M4(sx * (w / 2 + 0.03), yb + H * 0.5, ext / 2) }); }
      if (f > 0) { for (let i = 0; i <= posts; i++) beams.push({ geo: boxGeo(0.14, 0.14, jet + 0.3), m: M4(-w / 2 + 0.08 + i * (w - 0.16) / posts, yb + 0.07, front + ext - jet / 2 - 0.1) }); }   // joist ends under the jetty
      // windows on this floor
      const nw = f === 0 ? (o.door === false ? 2 : 1) : Math.max(1, Math.round(w / 2));
      for (let i = 0; i < nw; i++) {
        let x = f === 0 ? (o.door === false ? (i - 0.5) * w * 0.45 : (o.doorX == null ? -w * 0.18 : o.doorX) + w * 0.38) : (i + 0.5) * w / nw - w / 2;
        if (f === 0 && x > w / 2 - 0.6) x = w / 2 - 0.6;
        const ww = 0.7, wh = 0.9, wy = yb + H * 0.55, lit = o.lit && (o.lit === true || r() < o.lit);
        let pane;
        if (lit) { pane = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: paint.windowLit({ seed: (o.seed || 1) * 7 + i + f * 3, figure: r() < 0.3 }) }));
          pane.userData.glow = o.glow == null ? 1.6 : o.glow; pane.userData.ink = 0.3; }
        else { pane = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), M.dark); pane.userData.ink = 0.5; }
        pane.position.set(x, wy, fz + 0.012); G.add(pane); windows.push(pane);
        beams.push({ geo: boxGeo(ww + 0.18, 0.1, 0.14), m: M4(x, wy - wh / 2 - 0.05, fz + 0.05) });   // sill
        beams.push({ geo: boxGeo(ww + 0.18, 0.08, 0.1), m: M4(x, wy + wh / 2 + 0.04, fz + 0.04) });
        if (!lit || r() < 0.5) { const sm = M.shutter[Math.floor(r() * 3)];                       // shutters, open
          for (const s of [-1, 1]) box(G, ww / 2, wh, 0.04, sm, x + s * (ww * 0.75 + 0.06), wy, fz + 0.06, { ink: 0.8 }); }
      }
      yb += H;
    }
    const topZ = front + (fl - 1) * jet, D = d + (fl - 1) * jet, zc = (fl - 1) * jet / 2;
    // door (ground floor), recessed in a frame: a dark doorway a cat can sit in
    if (o.door !== false) {
      const dx = o.doorX == null ? -w * 0.18 : o.doorX, dw = 1.0, dh = 1.95;
      const rec = new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), M.dark); rec.position.set(dx, 0.5 + dh / 2, front + 0.005); G.add(rec);
      const dr = box(G, dw - 0.1, dh - 0.05, 0.06, M.plank, dx + (o.doorOpen ? -0.25 : 0), 0.5 + dh / 2, front - 0.25, { ry: o.doorOpen ? 1.0 : 0 });
      beams.push({ geo: boxGeo(0.18, dh + 0.1, 0.16), m: M4(dx - dw / 2 - 0.09, 0.5 + dh / 2, front + 0.05) }, { geo: boxGeo(0.18, dh + 0.1, 0.16), m: M4(dx + dw / 2 + 0.09, 0.5 + dh / 2, front + 0.05) },
        { geo: boxGeo(dw + 0.36, 0.2, 0.18), m: M4(dx, 0.5 + dh + 0.1, front + 0.06) });
      box(G, dw + 0.3, 0.16, 0.5, M.stone, dx, 0.08, front + 0.25);                                    // door step
      G.userData.door = [dx, 0, front + 0.3]; G.userData.doorway = rec; G.userData.doorLeaf = dr;
    }
    const bm = new THREE.Mesh(mergeColored(beams), M.beam); bm.castShadow = bm.receiveShadow = true; G.add(bm);
    // the roof: two sloped slabs, ridge along z (gable to the front) or along x
    const pitch = o.pitch || 0.95, gableFront = o.gable !== false, span = gableFront ? w : D, run = gableFront ? D : w;
    const rise = Math.tan(pitch) * span / 2, slab = Math.hypot(span / 2, rise) + 0.35;
    for (const s of [-1, 1]) {
      const sl = box(G, slab, 0.18, run + 0.6, roofM, 0, 0, 0, { ink: 0.8 });
      if (gableFront) { sl.position.set(s * (span / 4 + 0.05), yb + rise / 2, zc); sl.rotation.z = -s * pitch; }
      else { sl.geometry = boxGeo(run + 0.6, 0.18, slab); sl.position.set(0, yb + rise / 2, zc + s * (span / 4 + 0.05)); sl.rotation.x = s * pitch; }
    }
    // the gable triangles (plaster, with a king post)
    const tri = new THREE.Shape(); tri.moveTo(-span / 2, 0); tri.lineTo(span / 2, 0); tri.lineTo(0, rise); tri.closePath();
    const tg = new THREE.ShapeGeometry(tri); { const uv = tg.attributes.uv, p = tg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), p.getY(i)); }
    for (const s of [-1, 1]) { const m = new THREE.Mesh(tg, pl); m.castShadow = m.receiveShadow = true;
      if (gableFront) { m.position.set(0, yb, zc + s * (D / 2)); if (s < 0) m.rotation.y = Math.PI; }
      else { m.position.set(s * w / 2, yb, zc); m.rotation.y = s * Math.PI / 2; } G.add(m); }
    if (gableFront) { box(G, 0.16, rise * 0.9, 0.1, M.beam, 0, yb + rise * 0.45, topZ + 0.03); box(G, span, 0.15, 0.1, M.beam, 0, yb + 0.07, topZ + 0.04);
      for (const s of [-1, 1]) box(G, Math.hypot(span / 2, rise) + 0.3, 0.2, 0.08, M.beam, s * span / 4, yb + rise / 2 + 0.02, topZ + 0.32, { rz: -s * pitch }); }   // barge boards
    if (o.chimney !== false && r() < 0.7) { const cx = (r() - 0.5) * w * 0.4, cz = zc - D * 0.2; box(G, 0.6, rise + 1.2, 0.6, M.stone, cx, yb + (rise + 1.2) / 2 - 0.2, cz); box(G, 0.75, 0.14, 0.75, M.stone, cx, yb + rise + 1.0, cz); }
    G.userData.windows = windows; G.userData.top = yb + rise; G.userData.eave = yb; G.userData.front = front;
    return G;
  }
  function barrel(o) {
    o = o || {}; const M = mats(), G = new THREE.Group(), h = o.h || 0.95, rr = o.r || 0.32;
    const prof = []; for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(rr * (0.84 + 0.16 * Math.sin(t * Math.PI)), t * h)); }
    const lg = new THREE.LatheGeometry(prof, 20); { const uv = lg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * rr, uv.getY(i) * h); }
    const b = new THREE.Mesh(lg, M.plank); b.castShadow = b.receiveShadow = true; G.add(b);
    const lid = new THREE.Mesh(new THREE.CircleGeometry(rr * 0.84, 20), M.beam); lid.rotation.x = -Math.PI / 2; lid.position.y = h - 0.02; G.add(lid);
    for (const t of [0.12, 0.3, 0.7, 0.88]) { const R = rr * (0.84 + 0.16 * Math.sin(t * Math.PI)) + 0.008; const hp = new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 4, 24), M.iron); hp.rotation.x = Math.PI / 2; hp.position.y = t * h; hp.castShadow = true; G.add(hp); }
    if (o.lying) { G.rotation.z = Math.PI / 2; }
    return G;
  }
  function wheel(G, x, y, z, R) {
    const M = mats(), W = new THREE.Group(); W.position.set(x, y, z); W.rotation.y = Math.PI / 2; G.add(W);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 6, 28), M.beam); rim.castShadow = true; W.add(rim);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(R + 0.03, 0.025, 4, 28), M.iron); W.add(tyre);
    for (let i = 0; i < 8; i++) { const s = box(W, 0.05, R * 2, 0.04, M.beam, 0, 0, 0); s.rotation.z = i * Math.PI / 8; }
    const hub = cyl(W, 0.1, 0.1, 0.22, M.beam, 0, 0, 0); hub.rotation.x = Math.PI / 2;
    return W;
  }
  function cart(o) {
    o = o || {}; const M = mats(), G = new THREE.Group(), R = 0.62;
    box(G, 1.4, 0.1, 2.4, M.plank, 0, R + 0.1, 0);                                                         // bed
    for (const s of [-1, 1]) { box(G, 0.06, 0.45, 2.4, M.plank, s * 0.7, R + 0.38, 0); for (let i = 0; i < 5; i++) box(G, 0.08, 0.55, 0.08, M.beam, s * 0.72, R + 0.38, -1.1 + i * 0.55); }
    box(G, 1.4, 0.45, 0.06, M.plank, 0, R + 0.38, -1.2);
    for (const s of [-1, 1]) wheel(G, s * 0.86, R, 0.1, R);
    box(G, 1.9, 0.1, 0.1, M.beam, 0, R, 0.1);                                                              // axle
    for (const s of [-1, 1]) box(G, 0.08, 0.08, 2.0, M.beam, s * 0.45, 0.42, 1.95, { rx: 0.18 });       // shafts, resting on the ground
    if (o.load !== false) { const sk = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), M.sack); sk.scale.set(1.1, 0.75, 1.3); sk.position.set(-0.3, R + 0.35, -0.5); sk.castShadow = true; G.add(sk);
      const sk2 = sk.clone(); sk2.position.set(0.32, R + 0.33, -0.2); G.add(sk2); const b = barrel({ h: 0.7, r: 0.24 }); b.position.set(0.2, R + 0.15, 0.6); G.add(b); }
    return G;
  }
  function well() {
    const M = mats(), G = new THREE.Group(), R = 0.85;
    const lg = new THREE.CylinderGeometry(R, R + 0.05, 0.85, 24, 1, true); { const uv = lg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * R, uv.getY(i) * 0.85); }
    const ring = new THREE.Mesh(lg, M.stone); ring.material = M.stone; ring.position.y = 0.425; ring.castShadow = ring.receiveShadow = true; G.add(ring);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.16, R - 0.16, 0.86, 24, 1, true), M.stone); inner.material = M.stone; inner.position.y = 0.43; inner.geometry.scale(-1, 1, 1); G.add(inner);
    const cap = new THREE.Mesh(new THREE.RingGeometry(R - 0.18, R + 0.06, 24), M.stone); cap.rotation.x = -Math.PI / 2; cap.position.y = 0.86; cap.receiveShadow = true; G.add(cap);
    const wat = new THREE.Mesh(new THREE.CircleGeometry(R - 0.16, 24), M.water); wat.rotation.x = -Math.PI / 2; wat.position.y = 0.5; G.add(wat);
    for (const s of [-1, 1]) box(G, 0.14, 2.1, 0.14, M.beam, s * (R - 0.05), 1.05, 0);
    const ax = cyl(G, 0.07, 0.07, 2 * R + 0.2, M.beam, 0, 1.75, 0); ax.rotation.z = Math.PI / 2;
    cyl(G, 0.012, 0.012, 0.75, M.rope, 0, 1.35, 0); const bk = cyl(G, 0.13, 0.11, 0.2, M.plank, 0, 0.92, 0); bk.material = M.beam;
    for (const s of [-1, 1]) { const sl = box(G, 2 * R + 0.5, 0.08, 0.95, M.tiles[2], 0, 2.25, s * 0.38, { ink: 0.8 }); sl.rotation.x = s * 0.6; }
    return G;
  }
  // a lantern hanging from an iron bracket on a wooden post; the glass glows; a warm point light inside (no shadow)
  function lamp(o) {
    o = o || {}; const M = mats(), G = new THREE.Group(), H = o.h || 3.0;
    box(G, 0.16, H, 0.16, M.beam, 0, H / 2, 0); box(G, 0.3, 0.3, 0.3, M.stone, 0, 0.15, 0);
    box(G, 0.7, 0.05, 0.05, M.iron, 0.35, H - 0.15, 0); const br = box(G, 0.04, 0.5, 0.04, M.iron, 0.25, H - 0.35, 0, { rz: 0.8 });
    const lx = 0.65, ly = H - 0.55;
    cyl(G, 0.008, 0.008, 0.2, M.iron, lx, ly + 0.32, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.16, 4), M.iron); roof.position.set(lx, ly + 0.2, 0); roof.rotation.y = Math.PI / 4; G.add(roof);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), new THREE.MeshBasicMaterial({ color: 0xffd889 })); glass.position.set(lx, ly, 0); glass.userData.glow = o.glow == null ? 2.6 : o.glow; glass.userData.ink = 0.3; G.add(glass);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(G, 0.025, 0.28, 0.025, M.iron, lx + sx * 0.1, ly, sz * 0.1, { cast: false });
    box(G, 0.24, 0.03, 0.24, M.iron, lx, ly - 0.14, 0);
    let light = null;
    if (o.light !== false) { light = new THREE.PointLight(0xffb45a, o.intensity || 3.2, o.distance || 9, 1.6); light.position.set(lx, ly - 0.05, 0); G.add(light); }
    G.userData.glass = glass; G.userData.light = light; G.userData.lantern = [lx, ly, 0];
    return G;
  }
  function fence(o) {
    o = o || {}; const M = mats(), G = new THREE.Group(), len = o.len || 6, n = Math.max(2, Math.round(len / 1.6)), r = rng(o.seed || 21), parts = [];
    for (let i = 0; i <= n; i++) parts.push({ geo: boxGeo(0.12, 1.1, 0.12), m: M4(-len / 2 + i * len / n, 0.55, 0, (r() - 0.5) * 0.08, 0, (r() - 0.5) * 0.12) });
    for (const y of [0.45, 0.9]) parts.push({ geo: boxGeo(len + 0.2, 0.08, 0.06), m: M4(0, y + (r() - 0.5) * 0.05, 0.07, 0, 0, (r() - 0.5) * 0.03) });
    const m = new THREE.Mesh(mergeColored(parts), M.plankGrey); m.castShadow = m.receiveShadow = true; G.add(m); return G;
  }
  function crates(o) {
    o = o || {}; const M = mats(), G = new THREE.Group(), r = rng(o.seed || 23);
    const n = o.n || 3; for (let i = 0; i < n; i++) { const s = 0.5 + r() * 0.2, b = box(G, s, s, s, M.plank, (i % 2) * 0.55 - 0.25, s / 2 + (i > 1 ? 0.62 : 0), (r() - 0.5) * 0.2, { ry: (r() - 0.5) * 0.4 }); }
    if (o.sack !== false) { const sk = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), M.sack); sk.scale.set(1, 1.2, 0.9); sk.position.set(0.7, 0.3, 0.1); sk.castShadow = true; G.add(sk); }
    return G;
  }
  // a 3D tree: trunk and a few lumpy canopy balls with a painted leaf texture
  function tree(o) {
    o = o || {}; const M = mats(), G = new THREE.Group(), r = rng(o.seed || 31), h = o.h || 6;
    const tr = cyl(G, 0.18 * h / 6, 0.3 * h / 6, h * 0.55, M.bark, 0, h * 0.275, 0, 10);
    const parts = []; const n = 6;
    for (let i = 0; i < n; i++) { const g = new THREE.SphereGeometry(h * (0.2 + r() * 0.1), 14, 10); parts.push({ geo: g, m: M4((r() - 0.5) * h * 0.35, h * (0.6 + r() * 0.25), (r() - 0.5) * h * 0.35), color: [0.8 + r() * 0.3, 0.85 + r() * 0.25, 0.8 + r() * 0.2] }); }
    const cm = new THREE.Mesh(mergeColored(parts), new THREE.MeshLambertMaterial({ map: M.leaf.map, vertexColors: true }));
    cm.castShadow = cm.receiveShadow = true; G.add(cm); return G;
  }
  function hedge(o) {
    o = o || {}; const M = mats(), r = rng(o.seed || 41), len = o.len || 10, parts = [];
    for (let x = -len / 2; x < len / 2; x += 0.7) { const s = 0.55 + r() * 0.4; parts.push({ geo: new THREE.SphereGeometry(s, 10, 7), m: M4(x + r() * 0.3, s * 0.7, (r() - 0.5) * 0.4, r(), r(), r(), 1, 0.85, 1), color: [0.75 + r() * 0.35, 0.8 + r() * 0.3, 0.75 + r() * 0.2] }); }
    const m = new THREE.Mesh(mergeColored(parts), new THREE.MeshLambertMaterial({ map: M.leaf.map, vertexColors: true })); m.castShadow = m.receiveShadow = true;
    const G = new THREE.Group(); G.add(m); return G;
  }
  // many stalks as ONE mesh. Each stalk: a thin three-sided spike (or a full stalk with a drooping ear when ears is set)
  function stalks(o) {
    const r = rng(o.seed || 51), [x0, z0, x1, z1] = o.area, parts = [], h = o.h || 0.22, base = o.color || [0.95, 0.78, 0.45];
    const spike = o.ears ? new THREE.ConeGeometry(o.r || 0.012, 1, 4, 1, true) : new THREE.CylinderGeometry((o.r || 0.012) * 0.8, o.r || 0.012, 1, 5, 1, true); spike.translate(0, 0.5, 0);
    const ear = new THREE.ConeGeometry(0.03, 0.16, 5, 1); ear.translate(0, -0.08, 0);
    let made = 0, tries = 0;
    while (made < o.n && tries < o.n * 4) { tries++;
      const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); if (o.keep && !o.keep(x, z)) continue;
      const hh = h * (0.5 + r() * 0.9), k = 0.7 + r() * 0.45, c = [base[0] * k, base[1] * k, base[2] * k * (0.9 + r() * 0.2)];
      const tx = (r() - 0.5) * 0.35, tz = (r() - 0.5) * 0.35, tuft = o.ears ? 1 : 2 + Math.floor(r() * 4);
      for (let q = 0; q < tuft; q++) { const qx = x + (r() - 0.5) * 0.07, qz = z + (r() - 0.5) * 0.07, kk = 0.85 + r() * 0.3;
        parts.push({ geo: spike, m: M4(qx, 0, qz, tx + (r() - 0.5) * 0.3, r() * 3, tz + (r() - 0.5) * 0.3, 1, hh * (0.7 + r() * 0.5), 1), color: [c[0] * kk, c[1] * kk, c[2] * kk], grad: o.ears ? null : [0.4, 1.0] }); }
      if (o.ears) { const e = new THREE.Matrix4().makeTranslation(0, hh, 0).premultiply(M4(x, 0, z, tx, r() * 3, tz)); e.multiply(new THREE.Matrix4().makeRotationZ(1.9 + r() * 0.6)); parts.push({ geo: ear, m: e, color: [0.95, 0.82, 0.46] }); }
      made++; }
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const m = new THREE.Mesh(mergeColored(parts), mat); m.castShadow = o.cast !== false; m.receiveShadow = true; m.userData.ink = o.ink == null ? 0.25 : o.ink;
    return m;
  }

  // cut barley stubble in drilled rows (rows run along x, `gap` apart in z): tufts of 2-5 short hollow straws, all leaning
  // a little the same way (the sickle's pull), golden at the cut tops, dark and earthy at the foot; a few broken and bent
  function stubbleRows(o) {
    const r = rng(o.seed || 61), [x0, z0, x1, z1] = o.area, parts = [], h = o.h || 0.13, gap = o.gap || 0.2, step = o.step || 0.14;
    const straw = new THREE.CylinderGeometry(0.0045, 0.006, 1, 5, 1, true); straw.translate(0, 0.5, 0);
    const cutTop = new THREE.CircleGeometry(0.0047, 5); cutTop.rotateX(-Math.PI / 2); cutTop.translate(0, 1, 0);
    const lean = o.lean == null ? 0.18 : o.lean;
    for (let z = z0; z < z1; z += gap) { const zr = z + (r() - 0.5) * 0.04;
      for (let x = x0 + r() * step; x < x1; x += step * (0.6 + r() * 0.8)) {
        const xx = x, zz = zr + (r() - 0.5) * 0.05; if (o.keep && !o.keep(xx, zz)) continue;
        const n = 2 + Math.floor(r() * 4), base = 0.85 + r() * 0.3;
        for (let q = 0; q < n; q++) {
          const hh = h * (0.55 + r() * 0.75) * (r() < 0.06 ? 0.4 : 1), bent = r() < 0.07;
          const m = M4(xx + (r() - 0.5) * 0.05, 0, zz + (r() - 0.5) * 0.04, lean + (r() - 0.5) * 0.35 + (bent ? 0.9 : 0), r() * 3, (r() - 0.5) * 0.35, 1, hh, 1);
          const c = [0.78 * base, 0.55 * base, 0.24 * base];
          parts.push({ geo: straw, m, color: c, grad: [0.22, 1.0] });
          parts.push({ geo: cutTop, m, color: [0.62 * base, 0.45 * base, 0.22 * base] });   // the cut end: a darker hollow
        } } }
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(mergeColored(parts), mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.ink = o.ink == null ? 0.12 : o.ink;
    return mesh;
  }

  // ------------------------------------------------------------------ sky
  function skyTexture(o) {
    const W = o.stars ? 2048 : 64, H = 1024, [c, g] = canvas(W, H);
    const gr = g.createLinearGradient(0, 0, 0, H);                         // v = 1 at the top of the dome (canvas y = 0)
    gr.addColorStop(0, o.top); gr.addColorStop(0.35, o.mid || o.top); gr.addColorStop(0.5, o.horizon); gr.addColorStop(1, o.below || o.horizon);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (o.stars) { const r = rng(77);
      for (let i = 0; i < 1500; i++) { const x = r() * W, y = r() * H * 0.46, s = r() < 0.06 ? 2.6 : 0.8 + r() * 1.1; g.fillStyle = `rgba(255,250,230,${0.4 + r() * 0.6})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
        if (s > 2) { g.strokeStyle = "rgba(255,250,230,0.5)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.moveTo(x, y - 7); g.lineTo(x, y + 7); g.stroke(); } } }
    const t = tex(c); t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  function moonCard() {
    const S = 512, [c, g] = canvas(S, S), R = 150;
    const halo = g.createRadialGradient(S / 2, S / 2, R * 0.9, S / 2, S / 2, S / 2); halo.addColorStop(0, "rgba(220,230,255,0.45)"); halo.addColorStop(1, "rgba(220,230,255,0)"); g.fillStyle = halo; g.fillRect(0, 0, S, S);
    g.fillStyle = INK; g.beginPath(); g.arc(S / 2, S / 2, R + 9, 0, 7); g.fill();
    g.fillStyle = "#f6f0d6"; g.beginPath(); g.arc(S / 2, S / 2, R, 0, 7); g.fill();
    g.fillStyle = "rgba(190,184,160,0.7)"; for (const [x, y, rr] of [[-50, -30, 34], [40, 20, 24], [-10, 60, 20], [60, -60, 14], [-70, 40, 12]]) { g.beginPath(); g.arc(S / 2 + x, S / 2 + y, rr, 0, 7); g.fill(); }
    const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  // the sky dome rides with the camera, so it is always "at infinity"; drawn first, no depth, no ink
  function sky(stage, group, o) {
    o = o || {}; const R = o.radius || 50, D = new THREE.Group(); group.add(D);
    const dm = new THREE.MeshBasicMaterial({ map: skyTexture(o), side: THREE.BackSide, depthWrite: false, fog: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24), dm); dome.renderOrder = -10; dome.userData.noDepth = true; dome.frustumCulled = false; D.add(dome);
    const aim = (m, az, el, dist) => { m.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, -Math.cos(az) * Math.cos(el) * dist); m.lookAt(0, 0, 0); };
    for (const cl of o.clouds || []) {                                                // { seed, az (radians, 0 = -z), el, w }
      const m = cloud(cl.seed, { w: cl.w, night: o.night }); m.geometry.translate(0, -m.geometry.parameters.height / 2, 0);
      m.material.depthWrite = false; m.renderOrder = -9; m.userData.noDepth = true; m.userData.card = false; aim(m, cl.az, cl.el, R * 0.92); D.add(m); }
    let moon = null;
    if (o.moon) { moon = new THREE.Mesh(new THREE.PlaneGeometry(o.moon.size || 9, o.moon.size || 9), new THREE.MeshBasicMaterial({ map: moonCard(), transparent: true, alphaTest: 0.01, depthWrite: false, fog: false }));
      moon.renderOrder = -9; moon.userData.noDepth = true; moon.userData.glow = 1.2; aim(moon, o.moon.az, o.moon.el, R * 0.9); D.add(moon); }
    stage.beforeDraw.push((t, st) => { if (!isShown(group)) return; const p = st.camera.position; D.position.set(p.x - group.position.x, p.y - group.position.y, p.z - group.position.z); D.updateMatrixWorld(true); });
    return { dome, moon, rig: D };
  }

  return { rng, hex, rgb, rgba, mix, canvas, tex, tile, paint, mats, lam, box, cyl, boxGeo, mergeColored, M4, isShown, cutout,
    cloud, village, treeCard, house, barrel, cart, well, lamp, fence, crates, tree, hedge, stalks, stubbleRows, sky, wheel };
})();
