/* paint.js: surfaces painted by code on a 2D canvas, used as three.js textures.
 *
 * Every painter takes a seed, so a surface is the same on every frame and every render. Each returns a
 * THREE.CanvasTexture (sRGB, repeat-wrapped). Pass { repeat: [u, v] } to tile it.
 * The look we aim for is "painted": every flat area carries tone change, wear, stains and shaded edges, never one clean fill.
 *
 *   SF.paint.stone({ seed, rows, base: ["#hex", ...], mortar, gap, stain })   wall blocks: mortar, worn edges, cracks, chips, stains
 *   SF.paint.flags({ seed, cols, rows, base, mortar })                        floor flagstones: uneven, cracked, worn, stained
 *   SF.paint.planks({ seed, count, base, vertical, gap, ends })               boards: plank-to-plank colour, grain, knots, gaps, nails, wear
 *   SF.paint.cloth({ seed, base, trim, folds, pattern })                      hanging cloth: folds, gold trim, a small motif
 *   SF.paint.plaster({ seed, base })                                          mottled plaster
 *   SF.paint.glass({ seed, base })                                            leaded window glass, warm and bright
 *   SF.paint.stained({ seed, w, h, colors })                                  stained glass in lead: medallions, border, a lancet head
 *   SF.paint.damask({ seed, base, motif, w, h, lattice })                     wall cloth: a lily motif on a staggered grid, folds, wear
 *   SF.paint.tufted({ seed, base, button, cell })                             buttoned upholstery: diamond cells, shaded, a button each
 *   SF.paint.carpet({ seed, base, field, border, accent, w, h })              a runner: borders, a diamond lattice, dots, wear down the middle
 *   SF.paint.tapestry({ seed, base, border, w, h })                           woven hanging: flower field, vine border, a central roundel
 *   SF.paint.gold({ seed, w, h, base })                                       gilt: banded light and dark, bright glints, dark in the hollows
 *   SF.paint.books({ seed, rows, w, h })                                      a shelf face of book spines: sizes, colours, bands, titles
 *   SF.paint.shield({ seed, field, charge })                                  a coat of arms on a transparent ground (our own: a gold tower)
 *   SF.paint.parchment({ seed, lines })                                       paper: stained edges and hand lines of text
 *   SF.paint.linenfold({ seed, base, cols, rows, w, h })                      carved oak panels with linen folds (period: about 1500)
 *   SF.paint.cobweb({ seed, size })                                           a corner cobweb on a transparent ground (added round 2)
 *   SF.paint.sky({ seed, stops, clouds, stars })                              window sky: gradient, cloud bands, a few stars (added round 2)
 *   SF.paint.village({ seed, hill, wall, roof, lit, houses, church, taper })                 a hill with a village on top as an inked cut-out (added round 2)
 *   parchment({ blank: true }) = no writing; parchment({ initial: "#a8222c" }) = a red drop capital (added round 2)
 *   SF.paint.texture(canvas, repeat)                                         wrap any canvas you drew yourself
 *   SF.paint.shade(geometry, fn)                                              vertex colours from fn(x, y, z) -> 0..1 (dark corners, grime)
 */
window.SF = window.SF || {};
SF.paint = (function () {
  "use strict";
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hex = (h) => { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const rgb = (c, k = 1) => `rgb(${Math.round(Math.max(0, Math.min(255, c[0] * k)))},${Math.round(Math.max(0, Math.min(255, c[1] * k)))},${Math.round(Math.max(0, Math.min(255, c[2] * k)))})`;
  const rgba = (c, a, k = 1) => `rgba(${Math.round(Math.max(0, Math.min(255, c[0] * k)))},${Math.round(Math.max(0, Math.min(255, c[1] * k)))},${Math.round(Math.max(0, Math.min(255, c[2] * k)))},${a})`;
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // painted ink (round 2): edges painted INTO a texture carry no geometry line, so the painters draw their own dark outlines.
  // INK is the ink pass's colour; SF.paint.inkOn = false turns the painted outlines off (they are on by default).
  const INK = "rgb(29,22,29)", inkA = (a) => `rgba(29,22,29,${a})`; let lilyInk = 0, towerInk = 0;
  function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function texture(c, repeat) {
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (repeat) t.repeat.set(repeat[0], repeat[1]); return t;
  }
  // soft speckle and blotches over a rectangle: the "painted" texture inside a block or board
  function mottle(g, r, x, y, w, h, base, n, amt) {
    for (let i = 0; i < n; i++) {
      const k = 1 + (r() - 0.5) * amt, cx = x + r() * w, cy = y + r() * h, rad = 2 + r() * Math.min(w, h) * 0.25;
      g.fillStyle = rgb(base, k); g.globalAlpha = 0.18 + r() * 0.2; g.beginPath(); g.ellipse(cx, cy, rad, rad * (0.5 + r() * 0.6), r() * 3, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }
  // a dark, soft-edged stain (water, soot, wear) as a radial gradient blob
  function stain(g, r, cx, cy, rad, col, a) {
    const gr = g.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
    gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.6, rgba(col, a * 0.45)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.save(); g.translate(cx, cy); g.scale(1, 0.5 + r() * 0.8); g.translate(-cx, -cy); g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); g.restore();
  }
  function crack(g, r, x, y, len, w, col) {
    g.strokeStyle = rgb(col); g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y);
    let a = r() * Math.PI * 2, cx = x, cy = y;
    for (let i = 0; i < 4; i++) { a += (r() - 0.5) * 1.4; cx += Math.cos(a) * len / 4; cy += Math.sin(a) * len / 4; g.lineTo(cx, cy);
      if (r() < 0.35) { g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a + 1) * len * 0.15, cy + Math.sin(a + 1) * len * 0.15); g.moveTo(cx, cy); } }
    g.stroke();
  }
  function wobblyRect(g, r, x, y, w, h, j) {
    g.beginPath(); g.moveTo(x + r() * j, y + r() * j); g.lineTo(x + w - r() * j, y + r() * j); g.lineTo(x + w - r() * j, y + h - r() * j); g.lineTo(x + r() * j, y + h - r() * j); g.closePath();
  }
  // a shaded block: lit top-left, dark bottom-right, inner bevel, mottle, the odd chip and stain
  function block(g, r, bx, y, w, h, gap, cb, mortar, o) {
    const gr = g.createLinearGradient(bx, y, bx + w * 0.4, y + h);
    gr.addColorStop(0, rgb(cb, 1.12)); gr.addColorStop(0.55, rgb(cb, 0.98)); gr.addColorStop(1, rgb(cb, 0.8)); g.fillStyle = gr;
    wobblyRect(g, r, bx + gap / 2, y + gap / 2, w - gap, h - gap, gap * 0.7); g.fill();
    if (SF.paint.inkOn !== false && o.ink !== false) { g.save(); g.strokeStyle = inkA(0.85); g.lineWidth = Math.max(3, gap * 0.9); g.lineJoin = "round"; g.stroke(); g.restore(); }   // the joint as an ink line
    mottle(g, r, bx + gap, y + gap, w - 2 * gap, h - 2 * gap, cb, 10, 0.3);
    for (let i = 0; i < 26; i++) { g.fillStyle = rgba(cb, 0.35, r() < 0.5 ? 0.7 : 1.25); g.fillRect(bx + gap + r() * (w - 3 * gap), y + gap + r() * (h - 3 * gap), 1 + r() * 3, 1 + r() * 3); }   // pits and flecks
    g.strokeStyle = rgb(cb, 1.28); g.lineWidth = gap * 0.7; g.globalAlpha = 0.55;          // worn light top and left edge
    g.beginPath(); g.moveTo(bx + gap * 1.2, y + h - gap * 1.6); g.lineTo(bx + gap * 1.2, y + gap * 1.3); g.lineTo(bx + w - gap * 1.4, y + gap * 1.3); g.stroke();
    g.strokeStyle = rgb(cb, 0.55); g.globalAlpha = 0.6;                                     // shaded bottom and right edge
    g.beginPath(); g.moveTo(bx + gap * 1.4, y + h - gap * 1.2); g.lineTo(bx + w - gap * 1.2, y + h - gap * 1.2); g.lineTo(bx + w - gap * 1.2, y + gap * 1.6); g.stroke(); g.globalAlpha = 1;
    if (r() < 0.3) { g.fillStyle = rgb(mortar, 1.3); const cx = r() < 0.5 ? bx + gap : bx + w - gap, cy = r() < 0.5 ? y + gap : y + h - gap, s = h * (0.1 + r() * 0.12);   // a chipped corner
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + (cx > bx + w / 2 ? -s : s), cy); g.lineTo(cx, cy + (cy > y + h / 2 ? -s : s) * 0.8); g.fill(); }
    if (r() < (o.crack == null ? 0.3 : o.crack)) crack(g, r, bx + w * (0.2 + r() * 0.6), y + h * (0.15 + r() * 0.3), h * 0.7, gap * 0.4, mortar);
    if (r() < (o.stain == null ? 0.35 : o.stain)) stain(g, r, bx + r() * w, y + r() * h, h * (0.3 + r() * 0.5), [40, 28, 26], 0.18 + r() * 0.18);
  }

  function stone(o) {
    o = o || {}; const r = rng(o.seed || 1), S = o.size || 1024, rows = o.rows || 8, c = canvas(S, S), g = c.getContext("2d");
    const base = (o.base || ["#b8a99a", "#a99b8e", "#c2b3a1", "#9d9187"]).map(hex), mortar = hex(o.mortar || "#4a3a38");
    g.fillStyle = rgb(mortar); g.fillRect(0, 0, S, S);
    const rh = S / rows, gap = o.gap || Math.max(3, S / 220);
    for (let row = 0; row < rows; row++) {
      let x = -r() * S * 0.2; const y = row * rh;
      while (x < S) {
        const w = rh * (1.3 + r() * 1.3), col = base[Math.floor(r() * base.length)], k = 0.86 + r() * 0.26, cb = col.map((v) => v * k);
        const st = r(); // one draw per block, then copied to the wrapped positions so the texture tiles
        for (const dx of [0, -S, S]) { const bx = x + dx; if (bx > S || bx + w < 0) continue; block(g, rng(Math.floor(st * 1e9)), bx, y, w, rh, gap, cb, mortar, o); }
        x += w;
      }
    }
    for (let i = 0; i < 5; i++) stain(g, r, r() * S, r() * S, S * (0.1 + r() * 0.14), [35, 24, 26], 0.12 + r() * 0.1);    // big damp patches across blocks
    return texture(c, o.repeat);
  }

  function flags(o) {
    o = o || {}; const r = rng(o.seed || 2), S = o.size || 1024, cols = o.cols || 4, rows = o.rows || 4, c = canvas(S, S), g = c.getContext("2d");
    const base = (o.base || ["#a48d78", "#987f6c", "#b19985", "#8f7a6a"]).map(hex), mortar = hex(o.mortar || "#3d2f2c");
    g.fillStyle = rgb(mortar); g.fillRect(0, 0, S, S);
    const cw = S / cols, ch = S / rows, gap = S / 150;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const off = (j % 2) * cw * 0.5, cb = base[Math.floor(r() * base.length)].map((v) => v * (0.86 + r() * 0.24)), st = r();
      for (const dx of [0, -S]) {
        const x = i * cw + off + dx, y = j * ch; if (x > S) continue;
        block(g, rng(Math.floor(st * 1e9)), x, y, cw, ch, gap, cb, mortar, { crack: 0.45, stain: 0.5 });
      }
    }
    for (let i = 0; i < 4; i++) stain(g, r, r() * S, r() * S, S * (0.12 + r() * 0.1), [30, 20, 22], 0.14);
    return texture(c, o.repeat);
  }

  function planks(o) {
    o = o || {}; const r = rng(o.seed || 3), S = o.size || 1024, n = o.count || 6, c = canvas(S, S), g = c.getContext("2d");
    const base = hex(o.base || "#8a5a36"), gapc = hex(o.gap || "#2a1712");
    if (o.vertical) { g.translate(S, 0); g.rotate(Math.PI / 2); }
    const bh = S / n, gw = Math.max(4, S / 170);
    g.fillStyle = rgb(gapc); g.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) {
      const y = i * bh, warm = r(), cb = mixc(base.map((v) => v * (0.78 + r() * 0.4)), [base[0] * 1.1, base[1] * 0.85, base[2] * 0.7], warm * 0.3);   // plank-to-plank tone and hue
      const gr = g.createLinearGradient(0, y, 0, y + bh); gr.addColorStop(0, rgb(cb, 1.16)); gr.addColorStop(0.45, rgb(cb)); gr.addColorStop(1, rgb(cb, 0.8));
      g.fillStyle = gr; g.fillRect(0, y + gw / 2, S, bh - gw);
      for (let k = 0; k < 16; k++) {                             // grain: long wavy strokes, dark and light
        g.strokeStyle = rgb(cb, r() < 0.6 ? 0.68 : 1.22); g.globalAlpha = 0.3 + r() * 0.35; g.lineWidth = 0.8 + r() * 2.4;
        const yy = y + gw + r() * (bh - 2 * gw), amp = 2 + r() * 6, ph = r() * 6, fr = 0.003 + r() * 0.007;
        g.beginPath(); for (let x = 0; x <= S; x += 12) { const v = yy + Math.sin(x * fr + ph) * amp + Math.sin(x * fr * 3.1 + ph) * amp * 0.25; x ? g.lineTo(x, v) : g.moveTo(x, v); } g.stroke();
      }
      g.globalAlpha = 1;
      const nk = r() < 0.7 ? 1 + Math.floor(r() * 2) : 0;
      for (let q0 = 0; q0 < nk; q0++) {                          // knots, with the grain bending round them
        const kx = r() * S, ky = y + bh * (0.3 + r() * 0.4), kr = bh * (0.06 + r() * 0.08);
        g.strokeStyle = rgb(cb, 0.55); g.lineWidth = 2.5; for (let q = 0; q < 4; q++) { g.globalAlpha = 0.8 - q * 0.15; g.beginPath(); g.ellipse(kx, ky, kr * (1 + q * 0.7) * 2.2, kr * (1 + q * 0.55), 0, 0, 7); g.stroke(); }
        g.globalAlpha = 1; g.fillStyle = rgb(cb, 0.4); g.beginPath(); g.ellipse(kx, ky, kr * 1.2, kr * 0.7, 0, 0, 7); g.fill();
      }
      for (let s = 0; s < 2; s++) if (r() < 0.45) stain(g, r, r() * S, y + bh * r(), bh * (0.4 + r() * 0.6), [30, 16, 10], 0.22);   // dark stains
      g.strokeStyle = rgb(cb, 1.35); g.globalAlpha = 0.45; g.lineWidth = gw * 0.6;          // worn light edge along the top of each board
      g.beginPath(); g.moveTo(0, y + gw * 1.1); for (let x = 0; x <= S; x += 40) g.lineTo(x, y + gw * (0.9 + r() * 0.5)); g.stroke(); g.globalAlpha = 1;
      for (let s = 0; s < 5; s++) { g.strokeStyle = rgba(cb, 0.35, 1.3); g.lineWidth = 1; const sx = r() * S, sy = y + r() * bh; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 20 + r() * 50, sy + (r() - 0.5) * 6); g.stroke(); }   // scratches
      const ends = o.ends == null ? 1 : o.ends;                  // board ends: a dark joint across the board, two nails each side
      for (let e = 0; e < ends; e++) { const ex = r() * S; g.fillStyle = rgb(gapc); g.fillRect(ex, y, gw, bh);
        g.fillStyle = rgb([50, 38, 34]); for (const ny of [0.3, 0.7]) { g.beginPath(); g.arc(ex + gw * 4, y + bh * ny, gw * 0.9, 0, 7); g.arc(ex - gw * 3, y + bh * ny, gw * 0.9, 0, 7); g.fill(); } }
    }
    return texture(c, o.repeat);
  }

  function cloth(o) {
    o = o || {}; const r = rng(o.seed || 4), W = o.w || 512, H = o.h || 1024, c = canvas(W, H), g = c.getContext("2d");
    const base = hex(o.base || "#b0202a"), trim = hex(o.trim || "#d9a43a"), folds = o.folds || 7;
    g.fillStyle = rgb(base); g.fillRect(0, 0, W, H);
    if (o.pattern !== false) lilyField(g, r, W, H, base, trim, W / 4, 0.55);
    folds_(g, r, W, H, base, folds, 0.6);
    const tb = H * 0.05;                                          // gold trim bands, top and bottom, with a dark line each side
    for (const y of [H * 0.03, H - H * 0.03 - tb]) {
      g.fillStyle = rgb(trim); g.fillRect(0, y, W, tb);
      g.fillStyle = rgb(trim, 1.25); g.fillRect(0, y + tb * 0.15, W, tb * 0.2);
      g.fillStyle = rgb(trim, 0.6); for (let x = 0; x < W; x += tb * 0.9) { g.beginPath(); g.arc(x + tb * 0.45, y + tb * 0.62, tb * 0.16, 0, 7); g.fill(); }
      g.fillStyle = "rgb(50,26,24)"; g.fillRect(0, y - 2, W, 3); g.fillRect(0, y + tb - 1, W, 3);
    }
    g.fillStyle = rgb(trim, 0.95);                               // fringe at the bottom edge
    for (let x = 0; x < W; x += 9) g.fillRect(x, H - H * 0.03, 5, H * 0.03);
    return texture(c, o.repeat);
  }
  function folds_(g, r, W, H, base, folds, a) {                  // soft light and dark vertical bands over everything drawn so far
    for (let i = 0; i < folds; i++) {
      const x = (i + 0.2 + r() * 0.6) * W / folds, fw = W / folds * (0.25 + r() * 0.3);
      const gl = g.createLinearGradient(x - fw, 0, x + fw, 0);
      gl.addColorStop(0, "rgba(0,0,0,0)"); gl.addColorStop(0.42, rgba(base, 0.55, 1.45)); gl.addColorStop(0.58, rgba([20, 6, 10], 0.45)); gl.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = a; g.fillStyle = gl; g.fillRect(x - fw, 0, fw * 2, H); g.globalAlpha = 1;
    }
  }
  // our own lily: three petals and a band, drawn with curves
  function lily(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y - s); g.bezierCurveTo(x + s * 0.32, y - s * 0.55, x + s * 0.22, y - s * 0.1, x, y + s * 0.1);
    g.bezierCurveTo(x - s * 0.22, y - s * 0.1, x - s * 0.32, y - s * 0.55, x, y - s); g.fill(); if (lilyInk) g.stroke();
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + d * s * 0.08, y + s * 0.05); g.bezierCurveTo(x + d * s * 0.7, y - s * 0.55, x + d * s * 0.95, y + s * 0.05, x + d * s * 0.55, y + s * 0.2);
      g.bezierCurveTo(x + d * s * 0.6, y - s * 0.05, x + d * s * 0.4, y - s * 0.12, x + d * s * 0.12, y + s * 0.2); g.fill(); if (lilyInk) g.stroke(); }
    g.beginPath(); g.rect(x - s * 0.36, y + s * 0.14, s * 0.72, s * 0.14); g.fill(); if (lilyInk) g.stroke();
    g.beginPath(); g.moveTo(x - s * 0.12, y + s * 0.28); g.lineTo(x, y + s * 0.62); g.lineTo(x + s * 0.12, y + s * 0.28); g.fill(); if (lilyInk) g.stroke();
  }
  function lilyField(g, r, W, H, base, motif, step, a) {
    for (let y = step * 0.5, row = 0; y < H + step; y += step * 0.75, row++) for (let x = (row % 2) * step * 0.5; x < W + step; x += step) {
      g.globalAlpha = a; g.fillStyle = rgb(motif, 0.55); lily(g, x + step * 0.02, y + step * 0.03, step * 0.2);   // a dark drop shadow, then the motif
      g.globalAlpha = 1; g.fillStyle = rgb(motif, 0.9 + r() * 0.2); if (SF.paint.inkOn !== false) { lilyInk = 1; g.strokeStyle = inkA(0.9); g.lineWidth = Math.max(2, step * 0.022); g.lineJoin = "round"; }
      lily(g, x, y, step * 0.2); lilyInk = 0;
      g.fillStyle = rgba(motif, 0.5 * a); g.beginPath(); g.arc(x + step * 0.5, y + step * 0.37, step * 0.03, 0, 7); g.fill();
    }
  }

  function damask(o) {
    o = o || {}; const r = rng(o.seed || 40), W = o.w || 512, H = o.h || 1024, c = canvas(W, H), g = c.getContext("2d");
    const base = hex(o.base || "#8e1a24"), motif = hex(o.motif || "#d9a43a"), step = o.step || W / 5;
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, rgb(base, 0.85)); gr.addColorStop(0.5, rgb(base, 1.05)); gr.addColorStop(1, rgb(base, 0.8)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    mottle(g, r, 0, 0, W, H, base, 160, 0.3);
    if (o.lattice !== false) {                                   // a thin diamond lattice in a darker red
      g.strokeStyle = rgba(base, 0.5, 0.62); g.lineWidth = 2.2;
      for (let k = -H; k < W + H; k += step) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H * 0.75, H); g.stroke(); g.beginPath(); g.moveTo(k, 0); g.lineTo(k - H * 0.75, H); g.stroke(); }
    }
    lilyField(g, r, W, H, base, motif, step, 0.85);
    folds_(g, r, W, H, base, o.folds == null ? 6 : o.folds, 0.55);
    for (let i = 0; i < 4; i++) stain(g, r, r() * W, r() * H, W * 0.25, [25, 8, 10], 0.15);                      // age
    return texture(c, o.repeat);
  }

  function tufted(o) {
    o = o || {}; const r = rng(o.seed || 41), W = o.w || 512, H = o.h || 1024, c = canvas(W, H), g = c.getContext("2d");
    const base = hex(o.base || "#a8262e"), btn = hex(o.button || "#e2b048"), cw = o.cell || W / 5, chh = cw * 1.25;
    g.fillStyle = rgb(base, 0.6); g.fillRect(0, 0, W, H);
    for (let j = -1; j * chh / 2 < H + chh; j++) for (let i = -1; i * cw < W + cw; i++) {
      const cx = i * cw + (j % 2 ? cw / 2 : 0), cy = j * chh / 2;
      const gr = g.createRadialGradient(cx - cw * 0.12, cy - chh * 0.15, 2, cx, cy, cw * 0.6);   // a puffed cell: bright top-left, dark rim
      const k = 0.9 + r() * 0.2; gr.addColorStop(0, rgb(base, 1.45 * k)); gr.addColorStop(0.55, rgb(base, 1.0 * k)); gr.addColorStop(1, rgb(base, 0.55));
      g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy - chh / 2); g.lineTo(cx + cw / 2, cy); g.lineTo(cx, cy + chh / 2); g.lineTo(cx - cw / 2, cy); g.closePath(); g.fill();
      g.strokeStyle = rgb(base, 0.42); g.lineWidth = 2.5; g.stroke();
    }
    for (let j = -1; j * chh / 2 < H + chh; j++) for (let i = -1; i * cw < W + cw; i++) {    // a button at every crossing, with a crease out of it
      const x = i * cw + (j % 2 ? 0 : cw / 2), y = j * chh / 2;
      g.fillStyle = rgb([30, 10, 12]); g.beginPath(); g.arc(x + 1.5, y + 2, cw * 0.075, 0, 7); g.fill();
      const bg = g.createRadialGradient(x - 2, y - 2, 1, x, y, cw * 0.07); bg.addColorStop(0, rgb(btn, 1.4)); bg.addColorStop(1, rgb(btn, 0.7)); g.fillStyle = bg;
      g.beginPath(); g.arc(x, y, cw * 0.065, 0, 7); g.fill();
    }
    return texture(c, o.repeat);
  }

  function carpet(o) {
    o = o || {}; const r = rng(o.seed || 42), W = o.w || 512, H = o.h || 1024, c = canvas(W, H), g = c.getContext("2d");
    const field = hex(o.field || "#233a78"), border = hex(o.border || "#9a1e26"), accent = hex(o.accent || "#d9a43a"), dark = hex(o.base || "#1a1424");
    g.fillStyle = rgb(field); g.fillRect(0, 0, W, H); mottle(g, r, 0, 0, W, H, field, 140, 0.35);
    const bw = W * 0.16;
    // field: a lattice of red diamonds with gold centres and small dots
    const nc = o.cols || 3, step = (W - 2 * bw) / nc, dh = step * 1.5;
    for (let y = -dh; y < H + dh; y += dh) for (let i = 0; i <= nc; i++) {
      const cx = bw + i * step, cy = y + (i % 2 ? dh / 2 : 0);
      g.strokeStyle = rgb(border); g.lineWidth = step * 0.07; g.fillStyle = rgb(dark, 1.2);
      g.beginPath(); g.moveTo(cx, cy - dh * 0.42); g.lineTo(cx + step * 0.36, cy); g.lineTo(cx, cy + dh * 0.42); g.lineTo(cx - step * 0.36, cy); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = rgb(accent); g.beginPath(); g.moveTo(cx, cy - dh * 0.14); g.lineTo(cx + step * 0.11, cy); g.lineTo(cx, cy + dh * 0.14); g.lineTo(cx - step * 0.11, cy); g.closePath(); g.fill();
      g.fillStyle = rgb(accent, 0.85); for (const d of [[0.5, 0.25], [-0.5, 0.25], [0.5, -0.25], [-0.5, -0.25]]) { g.beginPath(); g.arc(cx + d[0] * step, cy + d[1] * dh, step * 0.035, 0, 7); g.fill(); }
    }
    // borders: red band, gold zigzag, dark line, small squares
    for (const x0 of [0, W - bw]) {
      g.fillStyle = rgb(border); g.fillRect(x0, 0, bw, H); mottle(g, r, x0, 0, bw, H, border, 40, 0.3);
      g.fillStyle = rgb(dark); g.fillRect(x0 + (x0 ? 0 : bw - bw * 0.12), 0, bw * 0.12, H);
      g.strokeStyle = rgb(accent, 0.85); g.lineWidth = bw * 0.05; g.beginPath();
      for (let y = 0, k = 0; y <= H; y += bw * 0.35, k++) g.lineTo(x0 + bw * (k % 2 ? 0.3 : 0.62) + (x0 ? bw * 0.06 : -bw * 0.06), y); g.stroke();
      g.fillStyle = rgb(accent, 0.8); for (let y = bw * 0.25; y < H; y += bw * 0.5) g.fillRect(x0 + (x0 ? bw * 0.8 : bw * 0.08), y, bw * 0.1, bw * 0.1);
    }
    for (let i = 0; i < W * H / 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,240,220"},${0.05 + r() * 0.1})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }   // pile: tiny light and dark knots
    const wear = g.createLinearGradient(0, 0, W, 0);             // worn lighter and dustier down the middle where people walk
    wear.addColorStop(0, "rgba(0,0,0,0)"); wear.addColorStop(0.5, "rgba(200,180,160,0.13)"); wear.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = wear; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) stain(g, r, r() * W, r() * H, W * 0.18, [10, 6, 10], 0.18);
    return texture(c, o.repeat);
  }

  function tapestry(o) {
    o = o || {}; const r = rng(o.seed || 43), W = o.w || 512, H = o.h || 768, c = canvas(W, H), g = c.getContext("2d");
    const base = hex(o.base || "#2b3f6e"), border = hex(o.border || "#7c1c22"), gold = hex("#d4a040"), leaf = hex("#4f7a3a");
    g.fillStyle = rgb(base); g.fillRect(0, 0, W, H); mottle(g, r, 0, 0, W, H, base, 200, 0.4);
    for (let i = 0; i < 420; i++) {                               // a field of small flowers and leaves
      const x = r() * W, y = r() * H, s = 4 + r() * 6;
      g.fillStyle = rgb(leaf, 0.8 + r() * 0.5); g.beginPath(); g.ellipse(x, y, s, s * 0.4, r() * 3, 0, 7); g.fill();
      if (r() < 0.45) { g.fillStyle = rgb(r() < 0.5 ? [220, 200, 160] : [200, 70, 60]); g.beginPath(); g.arc(x + s, y - s * 0.5, s * 0.45, 0, 7); g.fill(); }
    }
    const cx = W / 2, cy = H * 0.48, R = W * 0.26;                // a roundel with our tower inside
    g.fillStyle = rgb(border); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.strokeStyle = rgb(gold); g.lineWidth = R * 0.1; g.stroke();
    g.fillStyle = rgb(gold); towerInk = SF.paint.inkOn !== false ? R * 0.05 : 0; tower(g, cx, cy + R * 0.05, R * 0.95); towerInk = 0;
    if (SF.paint.inkOn !== false) { g.strokeStyle = INK; g.lineWidth = R * 0.05; g.beginPath(); g.arc(cx, cy, R * 1.05, 0, 7); g.stroke(); }
    const bw = W * 0.08;                                          // border with a running vine
    g.fillStyle = rgb(border); g.fillRect(0, 0, W, bw); g.fillRect(0, H - bw, W, bw); g.fillRect(0, 0, bw, H); g.fillRect(W - bw, 0, bw, H);
    g.strokeStyle = rgb(gold); g.lineWidth = 3;
    const vine = (x0, y0, x1, y1) => { const n = 24; g.beginPath(); for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, s = Math.sin(t * Math.PI * 8) * bw * 0.25;
      const px = x1 === x0 ? x + s : x, py = y1 === y0 ? y + s : y; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); };
    vine(0, bw / 2, W, bw / 2); vine(0, H - bw / 2, W, H - bw / 2); vine(bw / 2, 0, bw / 2, H); vine(W - bw / 2, 0, W - bw / 2, H);
    g.fillStyle = rgb(gold); for (let x = bw; x < W; x += bw * 1.2) for (const y of [bw / 2, H - bw / 2]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
    return texture(c, o.repeat);
  }
  function tower(g, x, y, s) {                                    // our own charge: a castle tower with three merlons and a door
    const w = s * 0.42, h = s * 0.6;
    g.beginPath(); g.moveTo(x - w / 2, y + h / 2); g.lineTo(x - w / 2, y - h / 2);
    for (let i = 0; i < 3; i++) { const mx = x - w / 2 + i * w / 2.5; g.lineTo(mx, y - h / 2 - s * 0.1); g.lineTo(mx + w / 5, y - h / 2 - s * 0.1); g.lineTo(mx + w / 5, y - h / 2); g.lineTo(mx + w / 2.5, y - h / 2); }
    g.lineTo(x + w / 2, y - h / 2 - s * 0.1); g.lineTo(x + w / 2, y + h / 2); g.closePath(); g.fill();
    if (towerInk) { g.save(); g.strokeStyle = INK; g.lineWidth = towerInk; g.lineJoin = "round"; g.stroke(); g.restore(); }
    g.save(); g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(x, y + h * 0.3, w * 0.16, Math.PI, 0); g.lineTo(x + w * 0.16, y + h / 2); g.lineTo(x - w * 0.16, y + h / 2); g.fill();
    g.fillRect(x - w * 0.06, y - h * 0.2, w * 0.12, h * 0.2); g.restore();
  }

  function gold(o) {
    o = o || {}; const r = rng(o.seed || 44), W = o.w || 256, H = o.h || 256, c = canvas(W, H), g = c.getContext("2d"), base = hex(o.base || "#d6a03c");
    const gr = g.createLinearGradient(0, 0, 0, H);                // banded like polished metal: bright, mid, dark, bright
    gr.addColorStop(0, rgb(base, 1.32)); gr.addColorStop(0.22, rgb(base, 1.0)); gr.addColorStop(0.48, rgb(base, 0.62)); gr.addColorStop(0.62, rgb(base, 1.15)); gr.addColorStop(0.8, rgb(base, 1.45)); gr.addColorStop(1, rgb(base, 0.8));
    g.fillStyle = gr; g.fillRect(0, 0, W, H); mottle(g, r, 0, 0, W, H, base, 40, 0.4);
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(255,248,215,${0.4 + r() * 0.5})`; g.beginPath(); g.ellipse(r() * W, r() * H, 2 + r() * 6, 1 + r() * 2, r() * 3, 0, 7); g.fill(); }   // glints
    for (let i = 0; i < 8; i++) stain(g, r, r() * W, r() * H, W * 0.15, [60, 30, 8], 0.25);   // dark in the hollows
    return texture(c, o.repeat);
  }

  function books(o) {
    o = o || {}; const r = rng(o.seed || 45), W = o.w || 512, H = o.h || 512, rows = o.rows || 3, c = canvas(W, H), g = c.getContext("2d");
    const pal = ["#7a2230", "#2c4a7a", "#5a3a22", "#3c5a32", "#8a6a2a", "#4a2a4a", "#9a4a22", "#2a2a3a"].map(hex), rh = H / rows;
    g.fillStyle = "rgb(22,14,12)"; g.fillRect(0, 0, W, H);
    for (let j = 0; j < rows; j++) {
      let x = 2; const y1 = (j + 1) * rh - rh * 0.06;
      while (x < W - 8) {
        if (r() < 0.07) { x += 10 + r() * 20; continue; }         // a gap
        const bw = 10 + r() * 22, bh = rh * (0.55 + r() * 0.37), col = pal[Math.floor(r() * pal.length)], lean = r() < 0.08 ? 0.2 : 0;
        g.save(); g.translate(x, y1); g.rotate(-lean);
        const gr = g.createLinearGradient(0, 0, bw, 0); gr.addColorStop(0, rgb(col, 0.6)); gr.addColorStop(0.35, rgb(col, 1.25)); gr.addColorStop(1, rgb(col, 0.65));
        g.fillStyle = gr; g.fillRect(0, -bh, bw, bh);
        g.fillStyle = "rgb(214,170,70)"; for (const b of [0.12, 0.2, 0.82]) g.fillRect(0, -bh * b - 2, bw, 3);               // gilt bands
        if (bw > 18) { g.fillStyle = "rgba(230,200,120,0.85)"; g.fillRect(bw * 0.3, -bh * 0.62, bw * 0.4, bh * 0.18); }    // a title label
        g.strokeStyle = "rgb(20,12,10)"; g.lineWidth = 2; g.strokeRect(0, -bh, bw, bh); g.restore();
        x += bw + 1 + lean * 20;
      }
      g.fillStyle = "rgb(70,42,26)"; g.fillRect(0, y1, W, rh * 0.06);           // the shelf board edge
    }
    return texture(c, o.repeat);
  }

  function shield(o) {
    o = o || {}; const W = o.w || 256, H = o.h || 300, c = canvas(W, H), g = c.getContext("2d");
    const field = hex(o.field || "#2a4fa0"), gold_ = hex(o.charge || "#e2b04a");
    const path = () => { g.beginPath(); g.moveTo(W * 0.08, H * 0.06); g.lineTo(W * 0.92, H * 0.06); g.lineTo(W * 0.92, H * 0.5); g.quadraticCurveTo(W * 0.9, H * 0.82, W * 0.5, H * 0.96); g.quadraticCurveTo(W * 0.1, H * 0.82, W * 0.08, H * 0.5); g.closePath(); };
    path(); g.fillStyle = rgb(gold_, 0.75); g.fill();
    g.save(); g.translate(W / 2, H / 2); g.scale(0.86, 0.88); g.translate(-W / 2, -H / 2); path();
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, rgb(field, 1.3)); gr.addColorStop(1, rgb(field, 0.7)); g.fillStyle = gr; g.fill(); g.restore();
    const ink = SF.paint.inkOn !== false;
    if (ink) { g.save(); g.translate(W / 2, H / 2); g.scale(0.86, 0.88); g.translate(-W / 2, -H / 2); path(); g.strokeStyle = INK; g.lineWidth = W * 0.028; g.stroke(); g.restore(); }   // the field's rim
    g.fillStyle = rgb(gold_); towerInk = ink ? W * 0.022 : 0; tower(g, W / 2, H * 0.47, W * 0.85); towerInk = 0;
    path(); g.strokeStyle = INK; g.lineWidth = W * (ink ? 0.055 : 0.035); g.stroke();
    const t = texture(c, o.repeat); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }

  function parchment(o) {
    o = o || {}; const r = rng(o.seed || 46), W = o.w || 256, H = o.h || 320, c = canvas(W, H), g = c.getContext("2d"), base = hex(o.base || "#efe0b8");
    g.fillStyle = rgb(base); g.fillRect(0, 0, W, H); mottle(g, r, 0, 0, W, H, base, 50, 0.15);
    const e = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); e.addColorStop(0, "rgba(0,0,0,0)"); e.addColorStop(1, "rgba(120,80,30,0.45)"); g.fillStyle = e; g.fillRect(0, 0, W, H);
    if (o.initial) {                                                // a red drop capital in a gold square, top left (a law book's first line)
      const s = W * 0.2; g.fillStyle = "rgb(200,150,60)"; g.fillRect(W * 0.1, H * 0.1, s, s); g.fillStyle = o.initial; g.fillRect(W * 0.1 + 4, H * 0.1 + 4, s - 8, s - 8);
      g.fillStyle = "rgb(240,214,140)"; lily(g, W * 0.1 + s / 2, H * 0.1 + s * 0.52, s * 0.32);
    }
    if (o.blank) return texture(c, o.repeat);                       // blank: no writing at all (the clerk's empty page)
    g.strokeStyle = "rgba(50,34,30,0.75)"; g.lineWidth = 2.2;
    for (let y = H * 0.12; y < H * 0.9; y += H * (o.lines ? 0.8 / o.lines : 0.06)) { let x = W * 0.1; g.beginPath(); g.moveTo(x, y);
      if (o.initial && y < H * 0.1 + W * 0.22) { x = W * 0.34; g.moveTo(x, y); }
      while (x < W * (0.75 + r() * 0.15)) { x += 4 + r() * 10; g.lineTo(x, y + (r() - 0.5) * 3); if (r() < 0.12) { x += 6; g.moveTo(x, y); } } g.stroke(); }
    return texture(c, o.repeat);
  }

  function plaster(o) {
    o = o || {}; const r = rng(o.seed || 5), S = o.size || 512, c = canvas(S, S), g = c.getContext("2d"), base = hex(o.base || "#d8c4a4");
    g.fillStyle = rgb(base); g.fillRect(0, 0, S, S); mottle(g, r, 0, 0, S, S, base, 160, 0.2);
    for (let i = 0; i < 6; i++) stain(g, r, r() * S, r() * S, S * 0.15, [70, 50, 40], 0.12);
    for (let i = 0; i < 3; i++) crack(g, r, r() * S, r() * S, S * 0.2, 1.5, [90, 70, 60]);
    return texture(c, o.repeat);
  }

  function glass(o) {
    o = o || {}; const r = rng(o.seed || 6), W = o.w || 256, H = o.h || 768, c = canvas(W, H), g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, o.top || "#fff6d8"); gr.addColorStop(1, o.bottom || "#ffd27a");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.25})`; g.fillRect(r() * W, r() * H, 6 + r() * 30, 6 + r() * 30); }
    g.strokeStyle = "rgb(70,52,44)"; g.lineWidth = 5; const d = W / 3;                  // lead lines: diamonds
    for (let k = -H; k < W + H; k += d) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke(); g.beginPath(); g.moveTo(k, 0); g.lineTo(k - H, H); g.stroke(); }
    return texture(c, o.repeat);
  }

  // stained glass for an arched lancet: a coloured border, three medallions, small quarries between, thick lead
  function stained(o) {
    o = o || {}; const r = rng(o.seed || 47), W = o.w || 256, H = o.h || 768, c = canvas(W, H), g = c.getContext("2d");
    const cols = (o.colors || ["#3a6fd8", "#c8323a", "#f2c14e", "#4fa35a", "#f6e7c0", "#8a4fc0"]).map(hex);
    const lead = "rgb(40,30,30)";
    for (let y = 0; y < H; y += W / 4) for (let x = 0; x < W; x += W / 4) {           // small quarries, pale warm with tint
      const k = cols[4]; g.fillStyle = rgb(mixc(k, cols[Math.floor(r() * 4)], 0.25 + r() * 0.25), 0.95 + r() * 0.15); g.fillRect(x, y, W / 4, W / 4);
    }
    const bw = W * 0.14;                                          // border: alternating blue and red pieces
    for (let y = 0, i = 0; y < H; y += bw * 1.4, i++) for (const x of [0, W - bw]) { g.fillStyle = rgb(cols[(i + (x ? 1 : 0)) % 2], 0.95 + r() * 0.2); g.fillRect(x, y, bw, bw * 1.4); }
    for (let m = 0; m < 3; m++) {                                 // medallions: a ring, a coloured field, a gold motif
      const cx = W / 2, cy = H * (0.28 + m * 0.24), R = W * 0.3;
      g.fillStyle = rgb(cols[2]); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
      g.fillStyle = rgb(cols[[0, 1, 3][m]], 1.05); g.beginPath(); g.arc(cx, cy, R * 0.8, 0, 7); g.fill();
      g.fillStyle = rgb(cols[m === 1 ? 2 : 4]); lily(g, cx, cy, R * 0.55);
      g.strokeStyle = lead; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, R * 0.8, 0, 7); g.stroke();
    }
    g.strokeStyle = lead; g.lineWidth = 5;                        // lead grid
    for (let y = 0; y < H; y += W / 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (const x of [bw, W - bw, W / 2]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,240,${0.08 + r() * 0.2})`; g.fillRect(r() * W, r() * H, 4 + r() * 16, 4 + r() * 16); }   // uneven glass
    return texture(c, o.repeat);
  }

  // linenfold: carved oak panels (France and England about 1500): framed panels, each with folds like hanging linen, curled ends
  function linenfold(o) {
    o = o || {}; const r = rng(o.seed || 48), W = o.w || 512, H = o.h || 512, cols = o.cols || 2, rows = o.rows || 1, c = canvas(W, H), g = c.getContext("2d");
    const base = hex(o.base || "#7a4a2a"), pw = W / cols, ph = H / rows, fr = pw * 0.12;
    const gr0 = g.createLinearGradient(0, 0, W, H); gr0.addColorStop(0, rgb(base, 1.05)); gr0.addColorStop(1, rgb(base, 0.85)); g.fillStyle = gr0; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 40; k++) { g.strokeStyle = rgba(base, 0.35, r() < 0.6 ? 0.7 : 1.2); g.lineWidth = 1 + r() * 2; const x = r() * W; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, H * 0.3, x - 8, H * 0.6, x + 4, H); g.stroke(); }   // stile grain
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * pw + fr, y = j * ph + fr, w = pw - 2 * fr, h = ph - 2 * fr, n = 4, fw = w / n;
      g.fillStyle = rgb(base, 0.42); g.fillRect(x - 3, y - 3, w + 6, h + 6);                                      // the dark sunk edge
      if (SF.paint.inkOn !== false) { g.strokeStyle = inkA(0.85); g.lineWidth = Math.max(3, W * 0.008); g.strokeRect(x - 5, y - 5, w + 10, h + 10); }
      g.fillStyle = rgb(base, 0.8); g.fillRect(x, y, w, h);
      for (let f = 0; f < n; f++) {                                                                              // each fold: lit left, dark right
        const fx = x + f * fw, gr = g.createLinearGradient(fx, 0, fx + fw, 0);
        gr.addColorStop(0, rgb(base, 1.4)); gr.addColorStop(0.45, rgb(base, 1.05)); gr.addColorStop(0.8, rgb(base, 0.55)); gr.addColorStop(1, rgb(base, 0.35));
        g.fillStyle = gr; g.fillRect(fx, y + h * 0.1, fw, h * 0.8);
        for (const e of [y + h * 0.1, y + h * 0.9]) { g.fillStyle = rgb(base, 1.2); g.beginPath(); g.ellipse(fx + fw * 0.5, e, fw * 0.5, h * 0.05, 0, e < y + h / 2 ? Math.PI : 0, e < y + h / 2 ? 0 : Math.PI); g.fill();   // curled ends
          g.strokeStyle = rgb(base, 0.4); g.lineWidth = 2; g.beginPath(); g.ellipse(fx + fw * 0.5, e, fw * 0.32, h * 0.03, 0, 0, 7); g.stroke(); }
      }
      g.strokeStyle = rgb(base, 1.35); g.lineWidth = 3; g.beginPath(); g.moveTo(x - 4, y + h + 4); g.lineTo(x - 4, y - 4); g.lineTo(x + w + 4, y - 4); g.stroke();   // lit frame moulding
    }
    for (let i = 0; i < 3; i++) stain(g, r, r() * W, r() * H, W * 0.2, [25, 12, 6], 0.2);
    return texture(c, o.repeat);
  }

  // vertex colours for darker corners and grime: fn(x, y, z) in world-ish geometry space -> brightness 0..1. Turn on vertexColors in the material.
  function shade(geo, fn) {
    const p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const k = fn(p.getX(i), p.getY(i), p.getZ(i)); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); return geo;
  }


  // a cobweb in a corner: radial threads from the top-left corner and sagging rings, on a transparent ground
  function cobweb(o) {
    o = o || {}; const r = rng(o.seed || 61), S = o.size || 512, c = canvas(S, S), g = c.getContext("2d"), n = 7, rings = 7;
    g.strokeStyle = o.color || "rgba(236,232,240,0.85)"; g.lineCap = "round";
    const ang = []; for (let i = 0; i < n; i++) ang.push((i / (n - 1)) * Math.PI / 2 + (r() - 0.5) * 0.08);
    g.lineWidth = 3.2; for (const a of ang) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * S * 1.05, Math.sin(a) * S * 1.05); g.stroke(); }
    g.lineWidth = 2.2;
    for (let k = 1; k <= rings; k++) { const R = S * (k / rings) * 0.95; g.beginPath();
      for (let i = 0; i < n - 1; i++) { const a0 = ang[i], a1 = ang[i + 1], am = (a0 + a1) / 2, sag = R * (0.86 + r() * 0.06);
        const x0 = Math.cos(a0) * R, y0 = Math.sin(a0) * R; if (i === 0) g.moveTo(x0, y0); g.quadraticCurveTo(Math.cos(am) * sag, Math.sin(am) * sag, Math.cos(a1) * R, Math.sin(a1) * R); }
      g.stroke(); }
    g.lineWidth = 1.6; for (let i = 0; i < 3; i++) { g.beginPath(); const a = r() * 1.5; g.moveTo(Math.cos(a) * S * 0.9, Math.sin(a) * S * 0.9); g.quadraticCurveTo(S * 0.9, S * 0.9, S, S * (0.6 + r() * 0.4)); g.stroke(); }   // loose strands
    const t = texture(c, o.repeat); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  // a sky seen through a window: a vertical gradient (top -> horizon), soft cloud bands, a few early stars
  function sky(o) {
    o = o || {}; const r = rng(o.seed || 62), W = o.w || 512, H = o.h || 1024, c = canvas(W, H), g = c.getContext("2d");
    const st = o.stops || [[0, "#26305e"], [0.45, "#6a5a8e"], [0.75, "#d88a6a"], [1, "#f2c48a"]];
    const gr = g.createLinearGradient(0, 0, 0, H); for (const [k, col] of st) gr.addColorStop(k, col); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < (o.clouds == null ? 7 : o.clouds); i++) { const y = H * (0.3 + r() * 0.45), x = r() * W, w = W * (0.3 + r() * 0.5), h = H * (0.012 + r() * 0.02);
      g.fillStyle = `rgba(${o.cloud || "250,190,170"},${0.25 + r() * 0.3})`; g.beginPath(); g.ellipse(x, y, w / 2, h, 0, 0, 7); g.fill(); }
    for (let i = 0; i < (o.stars || 0); i++) { g.fillStyle = `rgba(255,250,230,${0.5 + r() * 0.5})`; g.beginPath(); g.arc(r() * W, r() * H * 0.35, 1 + r() * 2, 0, 7); g.fill(); }
    const t = texture(c, o.repeat); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  // a hill with a village on top, as a flat cut-out on a transparent ground: houses with roofs, a church with a spire,
  // lit windows (warm dots), an ink outline round the hill and every building. o.hill = colour, o.wall, o.roof, o.lit (0..1 windows lit)
  function village(o) {
    o = o || {}; const r = rng(o.seed || 63), W = o.w || 1024, H = o.h || 512, c = canvas(W, H), g = c.getContext("2d");
    const hill = hex(o.hill || "#4a5a4a"), wall = hex(o.wall || "#b8a286"), roof = hex(o.roof || "#7a3a2c"), ink = "rgb(29,22,29)";
    const top0 = (x) => H * (0.55 - 0.22 * Math.exp(-Math.pow((x / W - 0.5) / 0.28, 2)));      // the hill's crest line
    const top = o.taper ? (x) => H - (H - top0(x)) * Math.pow(Math.max(0, Math.sin(Math.PI * x / W)), 0.7) : top0;   // taper: the hill falls to the ground at both ends (no straight side edges)
    const houses = []; const n = o.houses == null ? 9 : o.houses;
    for (let i = 0; i < n; i++) { const x = W * (0.24 + 0.52 * (i + r() * 0.6) / n), w = W * (0.035 + r() * 0.03), h = H * (0.07 + r() * 0.06); houses.push({ x, w, h, y: top(x) + H * 0.02 }); }
    const cx = W * (0.46 + r() * 0.08);                                                           // the church
    const draw = (fill) => {
      g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, top(x)); g.lineTo(W, H); g.closePath();
      if (fill) { const gr = g.createLinearGradient(0, H * 0.3, 0, H); gr.addColorStop(0, rgb(hill, 1.15)); gr.addColorStop(1, rgb(hill, 0.6)); g.fillStyle = gr; g.fill(); } else g.stroke();
      for (const h of houses) { g.beginPath(); g.rect(h.x - h.w / 2, h.y - h.h, h.w, h.h); if (fill) { g.fillStyle = rgb(wall, 0.8 + r() * 0.3); g.fill(); } else g.stroke();
        g.beginPath(); g.moveTo(h.x - h.w * 0.62, h.y - h.h); g.lineTo(h.x, h.y - h.h - h.w * 0.75); g.lineTo(h.x + h.w * 0.62, h.y - h.h); g.closePath(); if (fill) { g.fillStyle = rgb(roof, 0.8 + r() * 0.3); g.fill(); } else g.stroke(); }
      if (o.church === false) return;
      const cy = top(cx) + H * 0.02, tw = W * 0.03, th = H * 0.2;
      g.beginPath(); g.rect(cx - tw / 2, cy - th, tw, th); if (fill) { g.fillStyle = rgb(wall, 0.95); g.fill(); } else g.stroke();
      g.beginPath(); g.moveTo(cx - tw * 0.6, cy - th); g.lineTo(cx, cy - th - H * 0.13); g.lineTo(cx + tw * 0.6, cy - th); g.closePath(); if (fill) { g.fillStyle = rgb(roof, 0.75); g.fill(); } else g.stroke();
      g.beginPath(); g.rect(cx + tw / 2, cy - th * 0.45, W * 0.07, th * 0.45); if (fill) { g.fillStyle = rgb(wall, 0.85); g.fill(); } else g.stroke();
    };
    draw(true);
    if (o.lit) for (const h of houses) if (r() < 0.8) { g.fillStyle = `rgba(255,200,110,${o.lit})`; g.fillRect(h.x - h.w * 0.12, h.y - h.h * 0.6, h.w * 0.24, h.h * 0.3); }
    g.strokeStyle = ink; g.lineWidth = o.line || 5; g.lineJoin = "round"; draw(false);
    const t = texture(c, o.repeat); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }

  return { rng, hex, rgb, rgba, mixc, canvas, texture, stain, crack, lily, tower, stone, flags, planks, cloth, plaster, glass, stained, damask, tufted, carpet, tapestry, gold, books, shield, parchment, linenfold, shade, cobweb, sky, village };
})();
