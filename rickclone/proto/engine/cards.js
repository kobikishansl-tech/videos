/* cards.js: flat characters standing in the 3D world.
 *
 * A card is a flat plane carrying a picture drawn by code on a canvas. It is lit by the scene's lights (a Lambert
 * material with a small self-light `lift` so heads stay near-white), casts a shadow in the shape of the drawing
 * (alpha-tested depth material, not the rectangle), stands on the ground at its bottom centre, and by default turns
 * about its upright axis to face the camera.
 *
 *   const c = SF.card(stage, { w: 1.4, h: 2.0, draw: (g, pose, D) => {...}, pose: {...}, pos: [x, y, z] });
 *   c.set(pose)     redraws only if the pose changed (call it from an onFrame hook)
 *
 * The draw function works in METRES with the origin at the card's bottom centre and y UP. D is SF.draw (below),
 * the parts every character is built from: head, face, pill (body), robe, limb, arm, hand, shoe, line, plus the
 * detail helpers inkLine (hand-drawn variable-width outline), pattern, buttons, band, fur, tone.
 * Faces take an expression object; SF.faces holds 18 ready ones; SF.expr.mix(a, b, k) blends two (strings switch at
 * k = 0.5); SF.mouthAt(t, words) gives a mouth-open value 0..1 that flaps on the syllables of the spoken words.
 *
 * Measured targets: head outline ~4.8% of head width, eyes ~0.18 head widths wide and
 * wider than tall, eye centres 0.27 head widths apart, mouth ~0.13 wide, arms ~6% of head width as solid dark tubes
 * with ball hands (no outline, no fingers), legs ~10%.
 */
window.SF = window.SF || {};
SF.INK = "#221a22";
SF.LIMB = "#2b2027";

SF.draw = (function () {
  "use strict";
  const INK = SF.INK, LIMB = SF.LIMB, OUT = 0.024;
  const TAU = Math.PI * 2;
  // smooth seeded 1D noise in -1..1 along a path (u = 0..1 around it)
  const wn = (u, s) => 0.55 * Math.sin(u * TAU * 3 + s * 1.7) + 0.3 * Math.sin(u * TAU * 7 + s * 4.1) + 0.15 * Math.sin(u * TAU * 13 + s * 2.3);
  // seeded random 0..1
  function rng(seed) { let s = Math.abs(Math.floor(seed * 7919)) % 2147483647 || 1; return () => (s = (s * 48271) % 2147483647) / 2147483647; }
  // colour helpers: tone("#2f62c4", -0.3) darker, +0.3 lighter; rgba with alpha
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function tone(c, k, a) {
    const v = hex(c).map((x) => Math.round(k < 0 ? x * (1 + k) : x + (255 - x) * k));
    return a == null ? `rgb(${v[0]},${v[1]},${v[2]})` : `rgba(${v[0]},${v[1]},${v[2]},${a})`;
  }
  function tracePts(g, pts, closed) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (closed) g.closePath(); }

  // points of a closed wobbly ellipse: hand-drawn, the same wobble every frame for the same seed
  function blobPts(x, y, rx, ry, seed, wob, n) {
    n = n || 64; wob = wob == null ? 0.012 : wob; const p = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + wob * (Math.sin(a * 3 + seed) * 0.6 + Math.sin(a * 5 + seed * 2.3) * 0.4);
      p.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
    return p;
  }
  function blob(g, x, y, rx, ry, seed, wob) { tracePts(g, blobPts(x, y, rx, ry, seed, wob, 48), true); }
  function stroke(g, w, col) { g.lineWidth = w; g.strokeStyle = col || INK; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
  // a hand-drawn ink line: the width swells and thins along the path (seeded, +-amp), round ends
  function inkLine(g, pts, w, o) {
    o = o || {}; const seed = o.seed || 1, amp = o.amp == null ? 0.28 : o.amp, closed = !!o.closed, n = pts.length;
    g.strokeStyle = o.col || INK; g.lineCap = "round"; g.lineJoin = "round";
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      g.lineWidth = w * (1 + amp * wn(i / segs, seed)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
  }
  // sample a list of segment generators into points (for bodies)
  function arcPts(cx, cy, r, a0, a1, n) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }
  function quadPts(p0, c, p1, n) { const p = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; p.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]); } return p; }

  // head: near-white, a soft cool crescent on the side away from the light (o.lightX: -1 = light from screen left)
  // o: { seed, fill, shade, out, sx (default 1.04), sy (default 0.93), lightX }
  function head(g, x, y, r, o) {
    o = o || {}; const seed = o.seed || 1, sx = o.sx || 1.04, sy = o.sy || 0.93;
    const pts = blobPts(x, y, r * sx, r * sy, seed, 0.014);
    tracePts(g, pts, true); g.fillStyle = o.fill || "#fdfcfa"; g.fill();
    g.save(); tracePts(g, pts, true); g.clip();
    const lx = o.lightX == null ? -1 : o.lightX;
    const gr = g.createRadialGradient(x + lx * r * 0.32, y + r * 0.22, r * 0.55, x + lx * r * 0.12, y + r * 0.08, r * 1.18);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.72, "rgba(225,222,232,0.18)"); gr.addColorStop(1, o.shade || "rgba(168,162,188,0.62)");
    g.fillStyle = gr; g.fillRect(x - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6);
    // a faint highlight on the lit brow
    const hg = g.createRadialGradient(x + lx * r * 0.35, y + r * 0.45, 0, x + lx * r * 0.35, y + r * 0.45, r * 0.35);
    hg.addColorStop(0, "rgba(255,255,255,0.55)"); hg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = hg; g.fillRect(x - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6);
    g.restore();
    inkLine(g, pts, o.out || r * sx * 2 * 0.048, { closed: true, seed: seed + 3, amp: 0.26 });
  }

  // face: e = {
  //   browL, browR (tilt, + = inner end down: cross), browY, browW (length x), eye (0 shut .. 1 open .. 1.4 wide),
  //   eyeStyle "dot" (default: wide almond dots) | "lid" (half-lidded, smug/stern) | "wide" (alarm: white circles + pupils)
  //            | "shut" (asleep: down arcs) | "happy" (laughing: up arcs) | "squint" (tight lines),
  //   lid (0..1 how far the upper lid comes down, "dot"/"lid"), lidTilt (+ = outer end down), look: [dx, dy],
  //   mouth "line" | "flat" | "frown" | "smile" | "wavy" | "open" (talking, uses mouthOpen) | "shout" | "grin" | "smirk" | "o",
  //   mouthOpen 0..1, mouthW, mouthY, mouthTilt, blush 0..1, sweat 0..1, stache "bar" | "curl",
  //   wink -1 | 1 (that eye, screen left / right, shut as a happy arc), lines 0..1 (age: crow's feet and a brow crease),
  //   mouth also "whistle" (a small round o pushed to one side) | "tongue" (a smile with the tongue out, tongueX -1..1 slides it) |
  //   "tremble" (a wavy frown, mouthOpen sets how much it shakes; the story varies mouthTilt per frame) }
  function face(g, x, y, r, e) {
    e = Object.assign({ browL: 0, browR: 0, browY: 0, browW: 1, eye: 1, eyeStyle: "dot", lid: 0, lidTilt: 0, look: [0, 0], mouth: "line", mouthOpen: 0, mouthW: 1, mouthY: 0, mouthTilt: 0, blush: 0, sweat: 0 }, e);
    const ex = r * 0.27, ey = y + r * 0.05, lx = e.look[0] * r * 0.05, ly = e.look[1] * r * 0.04, lw = r * 0.05;
    for (const s of [-1, 1]) {
      const cx = x + s * ex + lx, cy = ey + ly, open = Math.max(0, e.eye), st = e.wink === s ? "happy" : e.eyeStyle;
      if (st === "wide") {                                              // alarm: open white circles with a dot
        const R = r * 0.15 * Math.max(0.6, Math.min(1.3, open));
        g.beginPath(); g.ellipse(x + s * ex, ey, R, R * 1.08, 0, 0, TAU); g.fillStyle = "#ffffff"; g.fill(); stroke(g, r * 0.045);
        g.beginPath(); g.arc(x + s * ex + e.look[0] * R * 0.35, ey + e.look[1] * R * 0.35, R * 0.38, 0, TAU); g.fillStyle = INK; g.fill();
      } else if (st === "shut" || st === "happy" || open < 0.2) {        // asleep: arcs down; laughing: arcs up; blink: a line
        g.beginPath();
        if (st === "happy") { g.moveTo(cx - r * 0.12, cy - r * 0.03); g.quadraticCurveTo(cx, cy + r * 0.11, cx + r * 0.12, cy - r * 0.03); }
        else if (st === "shut") { g.moveTo(cx - r * 0.12, cy + r * 0.02); g.quadraticCurveTo(cx, cy - r * 0.08, cx + r * 0.12, cy + r * 0.02); }
        else { g.moveTo(cx - r * 0.12, cy); g.lineTo(cx + r * 0.12, cy); }
        stroke(g, lw);
      } else if (st === "squint") {
        g.beginPath(); g.moveTo(cx - r * 0.13, cy + s * r * 0.0); g.lineTo(cx + r * 0.13, cy - r * 0.01); stroke(g, r * 0.065);
      } else {                                                            // "dot" / "lid": an almond wider than tall
        const lid = st === "lid" ? Math.max(0.35, e.lid) : e.lid;
        const k = Math.min(1.25, open), ew = r * 0.17 * (0.85 + 0.15 * k), eh = r * 0.11 * k * (1 + Math.min(0.85, lid) * 0.9);   // a lidded eye is a taller almond cut flat
        g.save();
        if (lid > 0) {                                                    // the upper lid cuts the top off, tilted
          const t = e.lidTilt * s * r * 0.05, yl = cy + eh * (1 - 2 * Math.min(0.85, lid));
          g.beginPath(); g.moveTo(cx - ew * 1.6, yl + t * 1.6 * -1); g.lineTo(cx + ew * 1.6, yl + t * 1.6); g.lineTo(cx + ew * 1.6, cy - eh * 2); g.lineTo(cx - ew * 1.6, cy - eh * 2); g.closePath(); g.clip();
        }
        g.beginPath(); g.ellipse(cx, cy, ew, eh, 0, 0, TAU); g.fillStyle = INK; g.fill();
        if (lid <= 0.5) { g.beginPath(); g.arc(cx - ew * 0.35, cy + eh * 0.3, Math.min(ew, eh) * 0.28, 0, TAU); g.fillStyle = "rgba(255,255,255,0.9)"; g.fill(); }
        g.restore();
        if (lid > 0) { const t = e.lidTilt * s * r * 0.05, yl = cy + eh * (1 - 2 * Math.min(0.85, lid)); g.beginPath(); g.moveTo(cx - ew * 1.15, yl - t * 1.15); g.lineTo(cx + ew * 1.15, yl + t * 1.15); stroke(g, r * 0.045); }
      }
      // brows: short thick bars, thicker at the inner end
      const tilt = s < 0 ? e.browL : e.browR, by = ey + r * (0.25 + e.browY), bl = r * 0.17 * e.browW;
      const ix = x + s * r * 0.1, ox = x + s * (r * 0.1 + bl * 2);
      g.beginPath(); g.moveTo(ix, by - tilt * r * 0.08); g.lineTo(ox, by + tilt * r * 0.08); stroke(g, r * 0.085);
      g.beginPath(); g.moveTo(ix, by - tilt * r * 0.08); g.lineTo((ix + ox) / 2, by); stroke(g, r * 0.1);
    }
    if (e.lines > 0) {                                                    // age: two short crow's-feet strokes each side, a crease between the brows
      const la = Math.min(1, e.lines); g.globalAlpha = la;
      for (const s of [-1, 1]) for (const k of [-1, 1]) { g.beginPath(); g.moveTo(x + s * r * 0.6, ey + k * r * 0.025); g.lineTo(x + s * r * 0.7, ey + k * r * 0.06); stroke(g, r * 0.02, "rgba(34,26,34,0.7)"); }
      g.beginPath(); g.moveTo(x - r * 0.03, ey + r * 0.2); g.lineTo(x - r * 0.02, ey + r * 0.3); stroke(g, r * 0.025);
      g.beginPath(); g.moveTo(x - r * 0.3, y - r * 0.18); g.quadraticCurveTo(x - r * 0.24, y - r * 0.3, x - r * 0.28, y - r * 0.4); stroke(g, r * 0.022);
      g.beginPath(); g.moveTo(x + r * 0.3, y - r * 0.18); g.quadraticCurveTo(x + r * 0.24, y - r * 0.3, x + r * 0.28, y - r * 0.4); stroke(g, r * 0.022);
      g.globalAlpha = 1;
    }
    if (e.blush > 0) for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * r * 0.52, ey - r * 0.2, r * 0.13, r * 0.07, 0, 0, TAU); g.fillStyle = `rgba(232,110,120,${0.35 * e.blush})`; g.fill(); }
    if (e.stache) {                                                       // a moustache sits over the mouth line
      const sy0 = y - r * 0.2; g.beginPath();
      if (e.stache === "curl") { g.moveTo(x, sy0); g.quadraticCurveTo(x - r * 0.18, sy0 + r * 0.06, x - r * 0.3, sy0 - r * 0.02); g.moveTo(x, sy0); g.quadraticCurveTo(x + r * 0.18, sy0 + r * 0.06, x + r * 0.3, sy0 - r * 0.02); stroke(g, r * 0.08); }
      else { g.moveTo(x - r * 0.17, sy0); g.lineTo(x + r * 0.17, sy0); stroke(g, r * 0.11); }
    }
    // mouth: small (about 0.13 head widths)
    const my = y - r * (0.33 - e.mouthY), mw = r * 0.135 * e.mouthW, t = e.mouthTilt * r * 0.04, mlw = r * 0.05;
    g.beginPath();
    if (e.mouth === "frown") { g.moveTo(x - mw, my - r * 0.03 - t); g.quadraticCurveTo(x, my + r * 0.07, x + mw, my - r * 0.03 + t); stroke(g, mlw); }
    else if (e.mouth === "smile") { g.moveTo(x - mw * 1.1, my + r * 0.035 - t); g.quadraticCurveTo(x, my - r * 0.08, x + mw * 1.1, my + r * 0.035 + t); stroke(g, mlw); }
    else if (e.mouth === "smirk") { g.moveTo(x - mw * 0.9, my - r * 0.005); g.quadraticCurveTo(x + mw * 0.2, my - r * 0.04, x + mw * 1.05, my + r * 0.06); stroke(g, mlw); }
    else if (e.mouth === "wavy") { g.moveTo(x - mw, my - t); g.bezierCurveTo(x - mw * 0.4, my + r * 0.06, x + mw * 0.1, my - r * 0.07, x + mw, my + r * 0.02 + t); stroke(g, r * 0.045); }
    else if (e.mouth === "whistle") { g.ellipse(x + mw * 0.6, my + r * 0.01, mw * 0.32, r * 0.05, 0, 0, TAU); g.fillStyle = "#2b1418"; g.fill(); stroke(g, r * 0.04);
      for (const k of [0, 1]) { g.beginPath(); g.moveTo(x + r * (0.58 + k * 0.12), my + r * (0.1 + k * 0.08)); g.lineTo(x + r * (0.7 + k * 0.12), my + r * (0.16 + k * 0.08)); stroke(g, r * 0.03); } }
    else if (e.mouth === "tongue") { const tx = x + (e.tongueX || 0) * mw * 0.6;
      g.moveTo(x - mw * 1.2, my + r * 0.04 - t); g.quadraticCurveTo(x, my - r * 0.09, x + mw * 1.2, my + r * 0.04 + t); stroke(g, mlw);
      g.beginPath(); g.moveTo(tx - mw * 0.45, my - r * 0.03); g.lineTo(tx - mw * 0.45, my - r * 0.12); g.arc(tx, my - r * 0.12, mw * 0.45, Math.PI, 0, false); g.lineTo(tx + mw * 0.45, my - r * 0.03); g.closePath();
      g.fillStyle = "#e0707e"; g.fill(); stroke(g, r * 0.03); g.beginPath(); g.moveTo(tx, my - r * 0.04); g.lineTo(tx, my - r * 0.12); stroke(g, r * 0.015, "rgba(120,30,50,0.6)"); }
    else if (e.mouth === "tremble") { const j = (e.mouthOpen || 0.5) * r * 0.035;
      g.moveTo(x - mw * 1.05, my - r * 0.04 - t); g.bezierCurveTo(x - mw * 0.5, my + r * 0.02 + j, x - mw * 0.1, my + r * 0.05 - j, x, my + r * 0.05);
      g.bezierCurveTo(x + mw * 0.1, my + r * 0.05 + j, x + mw * 0.5, my + r * 0.02 - j, x + mw * 1.05, my - r * 0.04 + t); stroke(g, r * 0.045); }
    else if (e.mouth === "o") { g.ellipse(x, my, mw * 0.45, r * 0.07, 0, 0, TAU); g.fillStyle = "#2b1418"; g.fill(); stroke(g, r * 0.035); }
    else if (e.mouth === "open" || e.mouth === "shout" || e.mouth === "grin") {
      // a D shape: flat top, round bottom, dark inside, red tongue, white teeth for shout/grin
      const big = e.mouth === "shout", grin = e.mouth === "grin";
      const w2 = mw * (big ? 2.1 : grin ? 1.6 : 1.05 + 0.25 * e.mouthOpen), hgt = r * (big ? 0.38 : grin ? 0.13 : 0.03 + 0.16 * e.mouthOpen);
      const top = my + hgt * 0.35 + (grin ? r * 0.03 : 0);
      const path = () => { g.beginPath(); g.moveTo(x - w2, top - t); g.lineTo(x + w2, top + t); g.bezierCurveTo(x + w2, top - hgt * 1.25, x - w2, top - hgt * 1.25, x - w2, top - t); g.closePath(); };
      path(); g.fillStyle = "#2b1418"; g.fill();
      g.save(); path(); g.clip();
      if (hgt > r * 0.07) { g.beginPath(); g.ellipse(x + w2 * 0.1, top - hgt * 0.95, w2 * 0.6, hgt * 0.45, 0, 0, TAU); g.fillStyle = "#cf4f5c"; g.fill(); }
      if (big || grin) { g.fillStyle = "#ffffff"; g.fillRect(x - w2, top - hgt * (grin ? 0.42 : 0.24), w2 * 2, hgt); }
      g.restore(); path(); stroke(g, r * 0.04);
    } else if (e.mouth === "flat") { g.moveTo(x - mw * 0.7, my - t); g.lineTo(x + mw * 0.7, my + t); stroke(g, mlw); }
    else { g.moveTo(x - mw, my - t); g.lineTo(x + mw, my + t); stroke(g, mlw); }
    if (e.sweat > 0) {                                                    // one drop at the temple on the far side
      const k = Math.min(1, e.sweat), sx = x + r * 0.78, sy = y + r * 0.42 - (1 - k) * r * 0.1, R = r * 0.085;
      g.beginPath(); g.moveTo(sx, sy + R * 2.2); g.bezierCurveTo(sx + R * 0.4, sy + R * 0.8, sx + R, sy + R * 0.3, sx + R, sy - R * 0.1);
      g.arc(sx, sy - R * 0.1, R, 0, Math.PI, true); g.bezierCurveTo(sx - R, sy + R * 0.3, sx - R * 0.4, sy + R * 0.8, sx, sy + R * 2.2); g.closePath();
      g.fillStyle = `rgba(120,190,240,${k})`; g.fill(); stroke(g, r * 0.03);
      g.beginPath(); g.arc(sx - R * 0.35, sy + R * 0.1, R * 0.25, 0, TAU); g.fillStyle = `rgba(255,255,255,${0.9 * k})`; g.fill();
    }
  }

  // patterns and detail inside a clipped body: kind "speckle" | "damask" | "stripes" | "weave"; box [x0, y0, x1, y1]
  function pattern(g, kind, fill, box, seed, o) {
    o = o || {}; const R = rng(seed || 7), [x0, y0, x1, y1] = box, hv = hex(fill), lum = (hv[0] * 0.3 + hv[1] * 0.59 + hv[2] * 0.11) / 255;
    // on a dark cloth the motif is lighter than the ground, on a mid or pale one darker
    let dark = tone(fill, -0.32, o.alpha || 0.55), light = tone(fill, 0.25, (o.alpha || 0.55) * 0.6);
    if (lum < 0.22) { dark = tone(fill, 0.22, (o.alpha || 0.55) * 0.8); light = tone(fill, -0.3, o.alpha || 0.55); }
    if (kind === "speckle") {
      const n = Math.round((x1 - x0) * (y1 - y0) * (o.density || 1400));
      for (let i = 0; i < n; i++) { const px = x0 + R() * (x1 - x0), py = y0 + R() * (y1 - y0), rr = 0.0025 + R() * 0.004;
        g.beginPath(); g.arc(px, py, rr, 0, TAU); g.fillStyle = R() < 0.7 ? dark : light; g.fill(); }
    } else if (kind === "damask") {                                       // a small four-petal motif on a staggered grid
      const st = o.step || 0.075; g.fillStyle = dark;
      for (let row = 0, py = y0; py < y1 + st; py += st * 0.8, row++) for (let px = x0 + (row % 2) * st / 2; px < x1 + st; px += st) {
        const q = st * 0.16; g.beginPath(); g.moveTo(px, py + q * 1.6); g.quadraticCurveTo(px + q * 0.5, py + q * 0.5, px + q * 1.6, py); g.quadraticCurveTo(px + q * 0.5, py - q * 0.5, px, py - q * 1.6);
        g.quadraticCurveTo(px - q * 0.5, py - q * 0.5, px - q * 1.6, py); g.quadraticCurveTo(px - q * 0.5, py + q * 0.5, px, py + q * 1.6); g.fill();
        g.beginPath(); g.arc(px + st / 2, py + st * 0.4, q * 0.35, 0, TAU); g.fill(); }
    } else if (kind === "stripes") {
      const st = o.step || 0.04; g.strokeStyle = dark; g.lineWidth = st * 0.22;
      for (let px = x0; px < x1 + st; px += st) { g.beginPath(); g.moveTo(px + (o.lean || 0) * (px - (x0 + x1) / 2), y0); g.lineTo(px, y1); g.stroke(); }
    } else if (kind === "weave") {
      const st = o.step || 0.02; g.strokeStyle = dark; g.lineWidth = st * 0.18;
      for (let py = y0; py < y1; py += st) { g.beginPath(); g.moveTo(x0, py + R() * st * 0.2); g.lineTo(x1, py + R() * st * 0.2); g.stroke(); }
    }
  }
  // a row of buttons (gold or cloth), each a small outlined ball with a highlight
  function buttons(g, x, ya, yb, n, r, col) {
    for (let i = 0; i < n; i++) { const y = ya + (yb - ya) * (n === 1 ? 0.5 : i / (n - 1));
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = col || "#e8b440"; g.fill(); stroke(g, r * 0.45);
      g.beginPath(); g.arc(x - r * 0.3, y + r * 0.3, r * 0.3, 0, TAU); g.fillStyle = "rgba(255,255,255,0.6)"; g.fill(); }
  }
  // a band (trim, belt, sash) along a polyline, w wide, with a thin ink edge each side
  function band(g, pts, w, col, o) {
    o = o || {}; tracePts(g, pts, false); stroke(g, w + (o.edge == null ? 0.008 : o.edge)); tracePts(g, pts, false); stroke(g, w, col);
    if (o.dots) { const R = o.dots; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.floor(L / (R * 4)));
      for (let j = 0; j < n; j++) { const k = (j + 0.5) / n; g.beginPath(); g.arc(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, R, 0, TAU); g.fillStyle = o.dotCol || "rgba(255,240,200,0.8)"; g.fill(); } } }
  }
  // fur trim: a soft lumpy band (collar, cuffs, hem) of tufts along a polyline
  function fur(g, pts, w, col, seed) {
    const R = rng(seed || 4), tufts = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / (w * 0.55)));
      for (let j = 0; j < n; j++) { const k = j / n; tufts.push([a[0] + (b[0] - a[0]) * k + (R() - 0.5) * w * 0.15, a[1] + (b[1] - a[1]) * k + (R() - 0.5) * w * 0.15, w * (0.42 + R() * 0.16)]); } }
    tufts.push([pts[pts.length - 1][0], pts[pts.length - 1][1], w * 0.5]);
    for (const t of tufts) { g.beginPath(); g.arc(t[0], t[1], t[2] + 0.009, 0, TAU); g.fillStyle = INK; g.fill(); }
    for (const t of tufts) { g.beginPath(); g.arc(t[0], t[1], t[2], 0, TAU); g.fillStyle = col; g.fill(); }
    for (const t of tufts) { g.beginPath(); g.arc(t[0] - t[2] * 0.25, t[1] + t[2] * 0.25, t[2] * 0.45, 0, TAU); g.fillStyle = tone(col, 0.25, 0.7); g.fill(); }
  }
  // shared body finish: rim shade both sides, a darker hem, pattern, folds, trim; then a hand-drawn outline
  function finishBody(g, pts, fill, box, o) {
    const [x0, y0, x1, y1] = box;
    g.save(); tracePts(g, pts, true); g.clip();
    if (o.pattern) pattern(g, o.pattern, fill, box, o.seed || 11, o.patternOpts);
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, "rgba(20,10,50,0.22)"); gr.addColorStop(0.22, "rgba(255,255,255,0.10)"); gr.addColorStop(0.5, "rgba(0,0,0,0)"); gr.addColorStop(0.82, "rgba(20,10,50,0.22)"); gr.addColorStop(1, "rgba(20,10,50,0.42)");
    g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    const vg = g.createLinearGradient(0, y0, 0, y1); vg.addColorStop(0, "rgba(20,10,40,0.25)"); vg.addColorStop(0.3, "rgba(0,0,0,0)"); g.fillStyle = vg; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (o.folds) for (const f of o.folds) {                               // fold: a dark crease with a light ridge beside it
      const fx0 = (x0 + x1) / 2 + f * (x1 - x0) / 2, fx1 = (x0 + x1) / 2 + f * (x1 - x0) * 0.3;
      g.beginPath(); g.moveTo(fx0, y0); g.quadraticCurveTo(fx0 * 0.6 + fx1 * 0.4 + 0.01, y0 + (y1 - y0) * 0.3, fx1, y0 + (y1 - y0) * 0.6); stroke(g, OUT * 0.55, "rgba(10,5,30,0.42)");
      g.beginPath(); g.moveTo(fx0 + 0.016, y0); g.quadraticCurveTo(fx0 * 0.6 + fx1 * 0.4 + 0.026, y0 + (y1 - y0) * 0.3, fx1 + 0.014, y0 + (y1 - y0) * 0.5); stroke(g, OUT * 0.5, "rgba(255,255,255,0.12)");
    }
    if (o.trim) { g.fillStyle = INK; g.fillRect(x0, y0, x1 - x0, o.trim.w + 0.008); g.fillStyle = o.trim.col; g.fillRect(x0, y0, x1 - x0, o.trim.w);
      if (o.trim.dots) for (let px = x0 + 0.02; px < x1; px += 0.045) { g.beginPath(); g.arc(px, y0 + o.trim.w * 0.5, o.trim.w * 0.18, 0, TAU); g.fillStyle = "rgba(255,240,190,0.85)"; g.fill(); } }
    g.restore();
    inkLine(g, pts, o.out || OUT, { closed: true, seed: o.seed || 11, amp: 0.25 });
  }
  // body: a rounded column (a pill with a flat-ish bottom), one colour, outlined, with shading and optional detail
  function pill(g, x, y0, w, h, fill, o) {
    o = o || {}; const r = w / 2, rb = w * 0.18;
    const pts = [].concat(quadPts([x - r + rb, y0], [x - r, y0], [x - r, y0 + rb], 5), [[x - r, y0 + h - r]], arcPts(x, y0 + h - r, r, Math.PI, 0, 24),
      [[x + r, y0 + rb]], quadPts([x + r, y0 + rb], [x + r, y0], [x + r - rb, y0], 5));
    tracePts(g, pts, true); g.fillStyle = fill; g.fill();
    finishBody(g, pts, fill, [x - r, y0, x + r, y0 + h], Object.assign({ out: o.out || Math.min(OUT, w * 0.07) }, o));
    return () => tracePts(g, pts, true);
  }
  // robe: a bell, wider at the hem than at the shoulders, rounded shoulders, sides bowing out a little
  function robe(g, x, y0, wTop, wBot, h, fill, o) {
    o = o || {}; const rt = wTop / 2, hb = wBot / 2, bow = o.bow == null ? 0.05 : o.bow;
    const pts = [].concat(quadPts([x - hb, y0], [x, y0 - 0.025], [x + hb, y0], 10), quadPts([x + hb, y0], [x + rt + bow + (hb - rt) * 0.35, y0 + h * 0.5], [x + rt, y0 + h - rt], 14),
      arcPts(x, y0 + h - rt, rt, 0, Math.PI, 24), quadPts([x - rt, y0 + h - rt], [x - rt - bow - (hb - rt) * 0.35, y0 + h * 0.5], [x - hb, y0], 14));
    tracePts(g, pts, true); g.fillStyle = fill; g.fill();
    finishBody(g, pts, fill, [x - hb - bow, y0 - 0.03, x + hb + bow, y0 + h], o);
    return () => tracePts(g, pts, true);
  }
  // limbs: solid dark tubes with no outline of their own (arms ~6% of head width = 0.03 m, legs ~0.05 m)
  function limb(g, pts, w, col) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); stroke(g, w || 0.03, col || LIMB); }
  // an arm from the shoulder: a1 = upper arm angle (radians, 0 = straight down, + = toward screen right), a2 = forearm angle
  // w = 0 computes the hand position without drawing
  function arm(g, sx, sy, a1, a2, L, w, col) {
    const ex = sx + Math.sin(a1) * L * 0.5, ey = sy - Math.cos(a1) * L * 0.5, hx = ex + Math.sin(a2) * L * 0.5, hy = ey - Math.cos(a2) * L * 0.5;
    if (w !== 0) limb(g, [[sx, sy], [ex, ey], [hx, hy]], w, col); return [hx, hy];
  }
  // hand: a ball. With no fill it is a dark ball in the limb colour, no outline (the family's look); a fill gives a glove
  function hand(g, x, y, r, fill) {
    blob(g, x, y, r, r * 0.94, 3, 0.03);
    if (fill) { g.fillStyle = fill; g.fill(); stroke(g, OUT * 0.6); }
    else { g.fillStyle = LIMB; g.fill(); g.beginPath(); g.arc(x - r * 0.3, y + r * 0.3, r * 0.28, 0, TAU); g.fillStyle = "rgba(255,255,255,0.18)"; g.fill(); }
  }
  function shoe(g, x, y, w, dir, col) { g.beginPath(); g.ellipse(x + (dir || 0) * w * 0.2, y + w * 0.24, w * 0.55, w * 0.26, 0, 0, TAU); g.fillStyle = col || "#2e2226"; g.fill(); stroke(g, OUT * 0.5);
    g.beginPath(); g.ellipse(x + (dir || 0) * w * 0.3, y + w * 0.34, w * 0.2, w * 0.07, 0, 0, TAU); g.fillStyle = "rgba(255,255,255,0.22)"; g.fill(); }
  function line(g, pts, w, col) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); stroke(g, w || OUT, col); }
  return { OUT, INK, LIMB, blob, blobPts, stroke, inkLine, tracePts, quadPts, arcPts, tone, rng, head, face, pattern, buttons, band, fur, pill, robe, limb, arm, hand, shoe, line };
})();

SF.expr = {
  mix(a, b, k) {
    const o = {}; for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const va = a[key], vb = b[key];
      if (typeof va === "number" && typeof vb === "number") o[key] = va + (vb - va) * k;
      else if (Array.isArray(va) && Array.isArray(vb)) o[key] = va.map((v, i) => v + (vb[i] - v) * k);
      else o[key] = k < 0.5 ? (va !== undefined ? va : vb) : (vb !== undefined ? vb : va);
    } return o;
  },
};

// eighteen ready faces (the family swaps faces in one frame; mix() is there for brows and eyes that ease)
SF.faces = {
  calm:     { browL: 0, browR: 0, eye: 1, mouth: "line", mouthW: 0.9 },
  talk:     { browL: -0.2, browR: -0.2, eye: 1, mouth: "open", mouthOpen: 0.5 },
  earnest:  { browL: -0.5, browR: -0.5, browY: 0.04, eye: 1.1, mouth: "open", mouthOpen: 0.3 },
  stern:    { browL: 0.9, browR: 0.9, browY: -0.06, eyeStyle: "lid", lid: 0.4, eye: 1, mouth: "frown" },
  angry:    { browL: 1.3, browR: 1.3, browY: -0.1, eyeStyle: "lid", lid: 0.45, lidTilt: -1, eye: 1, mouth: "frown", mouthW: 1.2 },
  alarm:    { browL: -0.8, browR: -0.8, browY: 0.1, eyeStyle: "wide", eye: 1.1, mouth: "o", mouthW: 1.1 },
  scared:   { browL: -1.1, browR: -1.1, browY: 0.08, eyeStyle: "wide", eye: 0.9, mouth: "wavy", sweat: 1 },
  smug:     { browL: 0.2, browR: -0.5, eyeStyle: "lid", lid: 0.55, lidTilt: 0.6, eye: 1, mouth: "smirk" },
  bored:    { browL: 0, browR: 0, browY: -0.04, eyeStyle: "lid", lid: 0.6, eye: 1, mouth: "flat" },
  laugh:    { browL: -0.4, browR: -0.4, browY: 0.06, eyeStyle: "happy", mouth: "grin", mouthW: 1.1 },
  happy:    { browL: -0.3, browR: -0.3, browY: 0.04, eye: 1, mouth: "smile" },
  puzzled:  { browL: -0.9, browR: 0.6, browY: 0.06, eye: 1.2, look: [0.3, -0.2], mouth: "wavy", mouthW: 0.85, mouthTilt: 0.8 },
  shout:    { browL: 1.2, browR: 1.2, browY: -0.06, eyeStyle: "dot", eye: 1.2, mouth: "shout" },
  asleep:   { browL: 0, browR: 0, browY: -0.05, eyeStyle: "shut", mouth: "o", mouthW: 0.7 },
  sad:      { browL: -1.0, browR: -1.0, eye: 0.9, look: [0, -0.5], mouth: "frown", mouthW: 0.9 },
  sly:      { browL: 0.6, browR: -0.3, eyeStyle: "lid", lid: 0.5, look: [0.8, 0], eye: 1, mouth: "smirk", mouthTilt: 0.5 },
  wince:    { browL: -0.9, browR: -0.9, eyeStyle: "squint", mouth: "grin", mouthW: 0.9 },
  stuck:    { browL: -0.7, browR: 0.4, browY: 0.04, eye: 1, look: [-0.6, 0.2], mouth: "flat", sweat: 1 },
};

// mouth-open value 0..1 for a talking character: flaps once per syllable of the word being spoken, shut between words.
// words: [{ text, at, end }] (seconds). o.rate caps flaps per second (default 7), o.max limits a flap to that open.
SF.mouthAt = function (t, words, o) {
  o = o || {}; const rate = o.rate || 7;
  for (const w of words) {
    if (t < w.at || t >= w.end) continue;
    const syl = Math.max(1, (w.text.toLowerCase().replace(/[^a-z]/g, "").replace(/e$/, "").match(/[aeiouy]+/g) || [1]).length);
    const dur = Math.min(w.end - w.at, Math.max(0.12, syl / rate)), k = (t - w.at) / dur;
    if (k >= 1) return 0;
    return Math.min(o.max || 1, Math.pow(Math.abs(Math.sin(k * Math.PI * syl)), 0.7));
  }
  return 0;
};

SF.card = function (stage, o) {
  "use strict";
  const _wp = new THREE.Vector3(), _pq = new THREE.Quaternion();
  const px = o.px || 1000, cw = Math.round(o.w * px), ch = Math.round(o.h * px), ax = o.anchorX == null ? 0.5 : o.anchorX;
  const c = document.createElement("canvas"); c.width = cw; c.height = ch; const g = c.getContext("2d");
  const map = new THREE.CanvasTexture(c); map.encoding = THREE.sRGBEncoding; map.anisotropy = 8;
  const geo = new THREE.PlaneGeometry(o.w, o.h); geo.translate((0.5 - ax) * o.w, o.h / 2, 0);
  // lift: a little self-light from the drawing itself, so pale heads stay near-white in a dim set (0 = plain Lambert)
  const lift = o.lift == null ? 0.14 : o.lift;
  const mat = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(lift > 0 ? 0xffffff : 0x000000), emissiveMap: lift > 0 ? map : null, emissiveIntensity: lift });
  // a drawing is paper, not a light: clamp its lit colour (linear) under the glow pass's threshold (1.1) so a white head in
  // a strong key never blooms. o.maxLit overrides (default 0.98).
  mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("#include <dithering_fragment>",
    "gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(" + (o.maxLit || 0.98).toFixed(3) + "));\n#include <dithering_fragment>"); };
  mat.customProgramCacheKey = () => "card-clamp-" + (o.maxLit || 0.98);
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = o.receiveShadow !== false;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5, side: THREE.DoubleSide });
  mesh.userData.card = true;
  const group = new THREE.Group(); group.add(mesh); if (o.pos) group.position.set(o.pos[0], o.pos[1], o.pos[2]);
  if (o.scale) group.scale.setScalar(o.scale);
  (o.parent || stage.scene).add(group);                        // o.parent: the set's group the card lives in (hidden with its set)
  // o.pos is a WORLD position (PLAN.md: spots are world); inside a parent that is moved (a set at x = 300 ...) convert it
  if (o.pos && o.parent && o.posLocal !== true) { o.parent.updateMatrixWorld(true); const w = new THREE.Vector3(o.pos[0], o.pos[1], o.pos[2]); o.parent.worldToLocal(w); group.position.copy(w); }
  // glowing eyes (cats at night): small flat light sources in front of the drawing, marked userData.glow (hand-off 5).
  // o.glowEyes = [{ x, y, w, h, rot }] in drawing metres; o.glowColor; o.glowMax (light strength at k = 1, default 2.4); o.glowOf(pose) -> 0..1 (0 hides them)
  const glowEyes = [];
  if (o.glowEyes) {
    const ec = document.createElement("canvas"); ec.width = 128; ec.height = 80; const eg = ec.getContext("2d");
    eg.beginPath(); eg.moveTo(4, 40); eg.quadraticCurveTo(64, -14, 124, 40); eg.quadraticCurveTo(64, 94, 4, 40); eg.closePath(); eg.fillStyle = "#ffffff"; eg.fill();
    eg.beginPath(); eg.ellipse(64, 40, 11, 30, 0, 0, Math.PI * 2); eg.fillStyle = "#000000"; eg.fill();
    const et = new THREE.CanvasTexture(ec); et.encoding = THREE.sRGBEncoding;
    for (const e of o.glowEyes) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(e.w, e.h), new THREE.MeshBasicMaterial({ map: et, color: new THREE.Color(o.glowColor || 0xd6ff5c), alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false }));
      m.position.set(e.x, e.y, 0.012); m.rotation.z = e.rot || 0; m.userData.noDepth = true; m.userData.glow = 0; m.visible = false; m.renderOrder = 3;
      m.userData.eyeH = e.h; mesh.add(m); glowEyes.push(m);
    }
  }
  // a soft contact shadow on the ground under the feet (no depth, no ink): a darker core under the feet, a wide soft falloff
  let contact = null;
  if (o.contact !== false) {
    const cc = document.createElement("canvas"); cc.width = cc.height = 128; const cg = cc.getContext("2d"), rg = cg.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, "rgba(22,12,34,0.78)"); rg.addColorStop(0.4, "rgba(22,12,34,0.45)"); rg.addColorStop(0.72, "rgba(22,12,34,0.16)"); rg.addColorStop(1, "rgba(22,12,34,0)"); cg.fillStyle = rg; cg.fillRect(0, 0, 128, 128);
    const ct = new THREE.CanvasTexture(cc);
    contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    contact.rotation.x = -Math.PI / 2; contact.position.y = (o.groundY || 0) - (o.pos ? o.pos[1] : 0) + 0.004; const cs = o.contact || [o.w * 0.55, 0.22];
    contact.scale.set(cs[0], cs[1], 1); contact.userData.noDepth = true; group.add(contact);
  }
  let key = "";
  const card = {
    mesh, group, map, canvas: c, contact, glowEyes, pose: o.pose || {}, face: o.face || "camera",
    // eyes that glow: k 0..1 opens them (scale y) and sets their light strength (0..2.4); 0 hides them
    setGlow(k) { for (const m of glowEyes) { m.visible = k > 0.02; m.scale.y = Math.max(0.05, Math.min(1, k * 1.4)); m.userData.glow = (o.glowMax || 2.4) * Math.min(1, k); } },
    set(pose) {
      card.pose = pose; if (o.glowOf) card.setGlow(o.glowOf(pose)); const k = JSON.stringify(pose, (kk, v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v));
      if (k === key) return; key = k;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
      g.setTransform(px, 0, 0, -px, cw * ax, ch);                // metres, origin at the bottom centre, y up
      o.draw(g, pose, SF.draw); map.needsUpdate = true;
    },
    update(camera) {
      // turn to the camera in WORLD space (a card inside a moved set group must not aim at the set's origin)
      if (card.face === "camera") { group.updateWorldMatrix(true, false); const p = _wp.setFromMatrixPosition(group.matrixWorld), q = camera.position;
        let yaw = Math.atan2(q.x - p.x, q.z - p.z); group.parent && group.parent.getWorldQuaternion(_pq) && (yaw -= 2 * Math.atan2(_pq.y, _pq.w));
        mesh.rotation.y = yaw * (o.turn == null ? 1 : o.turn) + (o.yaw || 0); }
    },
  };
  card.set(card.pose);
  stage.beforeDraw.push((t, st) => card.update(st.camera));
  return card;
};

// draw a character definition onto a plain 2D canvas (cast sheets, tests): def = { w, h, px, draw, anchorX }
SF.drawFlat = function (canvas, def, pose) {
  const px = def.px || 1000, ax = def.anchorX == null ? 0.5 : def.anchorX, g = canvas.getContext("2d");
  canvas.width = Math.round(def.w * px); canvas.height = Math.round(def.h * px);
  g.setTransform(px, 0, 0, -px, canvas.width * ax, canvas.height); def.draw(g, pose, SF.draw); g.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
};
