/* cast.js: every character of "The Lawyer Who Defended Rats" (France, about 1510; the hall about 1540). Our own designs,
 * drawn by code with SF.draw parts (metres, y up, origin at the feet). The three look-test characters are carried over.
 *
 *   const c = RT.cast.<name>(stage, pos, opts)     an SF.card; story.js calls c.set(pose) every frame
 *   opts: { parent (the set's THREE.Group the card lives in), scale, variant, pose (defaults merged under every set()) }
 *   c.set(pose) merges the pose OVER the character's defaults (opts.pose, then the options below), so a story may pass
 *   only what changes. c.group.visible hides a character. RT.cast.defs[name] = { w, h, px, draw, pose } for flat sheets.
 *
 * POSE FIELDS (every human also takes face: an expression object (RT.EXPR.* or SF.faces.*), bob (m), tilt (rad)):
 *   lawyer      armOut 0..1 (near arm out toward screen left), beat -1..1, up 0..1 (near arm raised high: "one finger up"),
 *               wide 0..1 (both arms flung wide), shrug 0..1, reach 0..1 (near hand down and forward: finger on the book),
 *               roll (bool, default true: the sealed roll in the far hand)
 *   lawyerOld   all of lawyer's, plus sit 0..1 (lowered onto a seat, robe to the floor), stamp null | 0..1 (holds a stamp in
 *               the near hand: 1 raised high, 0 pressed down at about 0.95 m standing / 0.75 m seated), quill (bool, far hand)
 *   judge       chin 0..1 (hand to chin; with SF.faces.asleep = asleep on his hand), lean 0..1 (leans over the bench to glare),
 *               zzz 0..1 (sleep letters)
 *   rat         tail (rad sway), look [dx, dy], eye 0..1.2, hands -1..1 (wringing), face (expr, optional),
 *               asleep (bool: on its back, belly up), fat 0..1, specs (bool), ear 0..1 (paw to the ear, listening),
 *               bundle (bool: a bundle on a stick over the shoulder), zzz 0..1.  opts.small = true scales it to 0.32
 *               (a hat or an inkwell); opts.asleep / fat / specs / ear / bundle set the defaults
 *   pig         face, tail, rope (bool, the usher's rope at the neck), trotters -1..1 (fidget)
 *   usher       face, call 0..1 (near hand cupped at the mouth), staff (bool, default true), rope (bool: holds the pig's rope)
 *   prosecutor  face (default smug), fold 0..1 (arms folded), point 0..1 (near arm points)
 *   farmer      face, stalk 0..1 (holds the bare stalk up), tremble 0..1 (shakes the stalk a little; story varies it)
 *   priest      face, unroll 0..1 (the summons unrolls between his hands)
 *   villager    opts.variant "a" (stout man, green, brown hood) | "b" (woman, red dress, white coif) | "c" (tall thin man,
 *               ochre, felt cap). Pose: face, arms "down" | "cheer" | "carry" | "hips" | "point" | "clap", look,
 *               armF / armN (one arm: a name above, or an [upper, fore] pair of angles in radians, 0 = down, the far arm's
 *               angles positive and the near arm's negative: armF: [2.7, 3.1] is the far arm straight up), sit 0..1 with
 *               seatH, cross (bool: a small wooden cross in the far hand), drum (bool: a tabor slung at the near hip and a
 *               stick in the near hand), hit 0..1 (the stick comes down on the drum)
 *   cat         opts.variant 0 (black) | 1 (dark grey tabby) | 2 (dark ginger, torn ear). Pose: eyes 0..1 (shut .. open),
 *               shine 0..1 (glow of the eyes, default = eyes; set 0 in a lit room), look [dx, dy], face "plain" | "whistle"
 *               | "grin", tail -1..1. Drawn dark with almost no self-light, so at night it is a dark shape with two eyes.
 *   catFace     lick 0..1 (the tongue sweeps across the upper lip, hidden at 0 and 1), eyes 0..1, shine, squint 0..1, look
 *   noble       face, point 0..1 (near arm points at screen left), tilt
 * LEGS AND DANCING: every character drawn with person() (usher, prosecutor, farmer, villager, noble) also takes
 *               kick -1..1 (one foot lifts out to its side: -1 the near, screen-left foot, +1 the far one),
 *               step -1..1 (the feet cross: +1 the near foot steps over in front of the far one, -1 the far over the near),
 *               turn 0..1 (one full spin on the spot: the figure narrows, shows its mirror image, comes back),
 *               shoeCol (this pose's shoe colour, e.g. "#c0182a" for red shoes in one view; default the character's own).
 *               At 0 they draw exactly the standing figure. RT.cast.dance(t, opts) returns a whole dancing pose of these
 *               fields plus armF, armN, bob, tilt, as a pure function of t:
 *                 by time:      RT.cast.dance(t, { bps: 1.6, ph: 0.5 })     bps beats a second (1.2 to 2.2 reads as a jig)
 *                 by the words: RT.cast.dance(t, { beats: RT.SPOKEN })      one step on every spoken word's start
 *               opts: ph (this dancer's offset in beats: give each dancer its own), amp 0..1 (0 standing, 1 full),
 *               spin (a turn in the last beat of every `spin` beats; 0 never; default 8), face (merged into the pose).
 *               A four-beat jig: kick right, kick left, cross, cross back; a hop on every beat, a sway every two, the
 *               arms swinging between out and up out of step with the feet. RT.cast.beatAt(t, beats) gives the beat count.
 *
 * Measured family (RULEBOOK 5): heads near-white, outline ~4.8% of head width, two dark almond eyes, brows that act,
 * small mouths; arms 0.03 m dark tubes with ball hands, legs 0.05 m; figures about 4 heads tall.
 */
window.RT = window.RT || {};
RT.EXPR = Object.assign({}, SF.faces, {
  calm:     { browL: 0, browR: 0, browY: 0, eye: 1, look: [0, 0], mouth: "line", mouthW: 0.9 },
  earnest:  { browL: -0.6, browR: -0.6, browY: 0.05, eye: 1.1, look: [-0.8, 0.3], mouth: "open", mouthOpen: 0.3, mouthW: 1.1 },
  stern:    { browL: 1.0, browR: 1.0, browY: -0.06, eyeStyle: "lid", lid: 0.42, lidTilt: -0.6, eye: 1, look: [0.5, -0.4], mouth: "frown", mouthW: 1.0 },
  puzzled:  { browL: -1.0, browR: 0.7, browY: 0.06, eyeStyle: "dot", lid: 0, lidTilt: 0, eye: 1.2, look: [0.3, -0.2], mouth: "wavy", mouthW: 0.9, mouthTilt: 0.8 },
  rat:      { browL: -0.9, browR: -0.9, browY: 0.04, eye: 1.2, look: [0.6, 0.2], mouth: "line", mouthW: 0.5 },
  plain:    { browL: 0, browR: 0, eye: 1, look: [0, 0], mouth: "flat", mouthW: 0.9 },
  shrug:    { browL: -0.7, browR: -0.7, browY: 0.08, eye: 1, look: [0, 0], mouth: "wavy", mouthW: 0.8 },
  grinSmall:{ browL: -0.2, browR: 0.2, eye: 1, eyeStyle: "lid", lid: 0.3, look: [0, 0], mouth: "smirk", mouthW: 1.0 },
  wink:     { browL: -0.3, browR: 0.5, eye: 1, wink: 1, look: [0, 0], mouth: "smile", mouthW: 1.1 },
  tinySmile:{ browL: 0.1, browR: 0.1, eye: 1, eyeStyle: "lid", lid: 0.35, look: [0, 0], mouth: "smirk", mouthW: 0.7 },
  serious:  { browL: 0.6, browR: 0.6, browY: -0.04, eye: 1.05, look: [-0.4, 0], mouth: "open", mouthOpen: 0.4 },
  innocent: { browL: -0.7, browR: -0.7, browY: 0.08, eye: 1.25, look: [0, 0.3], mouth: "smile", mouthW: 0.6, blush: 0.8 },
  smugFold: { browL: 0.3, browR: -0.6, browY: 0.02, eyeStyle: "lid", lid: 0.6, lidTilt: 0.5, eye: 1, look: [-0.5, 0], mouth: "smirk", mouthW: 1.1 },
  trembling:{ browL: -1.1, browR: -1.1, browY: 0.06, eye: 1.05, look: [0, 0.2], mouth: "tremble", mouthOpen: 0.6 },
  calling:  { browL: -0.5, browR: -0.5, browY: 0.06, eye: 1.1, look: [-0.8, 0], mouth: "shout", mouthW: 0.7 },
  reading:  { browL: -0.3, browR: -0.3, eye: 1, look: [0, -0.6], mouth: "open", mouthOpen: 0.4 },
  sideEye:  { browL: 0.4, browR: -0.4, eye: 1, look: [0.9, 0], mouth: "flat" },
  remember: { browL: -0.8, browR: -0.8, browY: 0.08, eye: 1.2, look: [0, 0.2], mouth: "o", mouthW: 0.7, lines: 1 },
  oldCalm:  { browL: 0.2, browR: 0.2, eye: 1, eyeStyle: "lid", lid: 0.3, look: [0, 0], mouth: "line", mouthW: 0.9, lines: 1 },
  oldFirm:  { browL: 0.8, browR: 0.8, browY: -0.05, eye: 1, eyeStyle: "lid", lid: 0.35, look: [0, -0.3], mouth: "frown", mouthW: 0.9, lines: 1 },
  accuse:   { browL: 1.1, browR: 1.1, browY: -0.06, eye: 1.1, look: [-0.8, 0], mouth: "open", mouthOpen: 0.7 },
});

RT.cast = (function () {
  "use strict";
  const BLUE = "#2f62c4", VIOLET = "#3a2a5c", CAPE = "#33265a", CRIMSON = "#a3182c", GOLD = "#e8b440", HAIR = "#6b3f24", FUR = "#86603c";
  const PINK = "#e79aa4", TAU = Math.PI * 2;
  const clamp01 = (v) => Math.max(0, Math.min(1, v || 0));
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpA = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

  // ---------- shared pieces ----------
  // a hanging sleeve over the upper arm: a tube from the shoulder that widens, rounded at the open end, trimmed
  function sleeve(g, D, sx, sy, a1, L, w0, w1, fill, trim) {
    const dx = Math.sin(a1), dy = -Math.cos(a1), nx = -dy, ny = dx, ex = sx + dx * L, ey = sy + dy * L;
    const pts = [[sx + nx * w0 / 2, sy + ny * w0 / 2], [ex + nx * w1 / 2, ey + ny * w1 / 2]].concat(
      D.quadPts([ex + nx * w1 / 2, ey + ny * w1 / 2], [ex + dx * w1 * 0.45, ey + dy * w1 * 0.45], [ex - nx * w1 / 2, ey - ny * w1 / 2], 10),
      [[sx - nx * w0 / 2, sy - ny * w0 / 2]]);
    D.tracePts(g, pts, true); g.fillStyle = fill; g.fill();
    g.save(); D.tracePts(g, pts, true); g.clip();
    g.beginPath(); g.moveTo(sx - nx * w0 * 0.2, sy - ny * w0 * 0.2); g.lineTo(ex - nx * w1 * 0.25, ey - ny * w1 * 0.25); D.stroke(g, 0.03, "rgba(20,10,50,0.3)");
    if (trim) { g.beginPath(); g.moveTo(ex + nx * w1 * 0.6 - dx * 0.02, ey + ny * w1 * 0.6 - dy * 0.02); g.lineTo(ex - nx * w1 * 0.6 - dx * 0.02, ey - ny * w1 * 0.6 - dy * 0.02); D.stroke(g, 0.035, trim); }
    g.restore(); D.inkLine(g, pts, 0.016, { closed: true, seed: 5 });
  }
  // a filled, outlined closed shape from points
  function shape(g, D, pts, fill, w, seed) { D.tracePts(g, pts, true); g.fillStyle = fill; g.fill(); D.inkLine(g, pts, w || 0.016, { closed: true, seed: seed || 3 }); }
  // named arm poses for side s (-1 = near arm, screen left; +1 = far arm, screen right): [upper, fore] angles, 0 = down
  const ARMS = {
    down: (s) => [s * 0.22, s * 0.08], out: (s) => [s * 1.45, s * 1.6], point: (s) => [s * 1.72, s * 1.85], up: (s) => [s * 2.85, s * 3.02],
    wide: (s) => [s * 2.0, s * 2.35], cheer: (s) => [s * 2.45, s * 2.95], carry: (s) => [s * 2.7, -s * 2.84], hips: (s) => [s * 0.75, -s * 0.55],
    shrug: (s) => [s * 0.5, s * 1.75], front: (s) => [s * 0.2, -s * 1.0], clap: (s) => [s * 0.35, -s * 1.35],
  };
  const armOf = (spec, s) => (Array.isArray(spec) ? spec : (ARMS[spec] || ARMS.down)(s));
  // shoes and two dark legs. o.kick -1..1: one foot lifts out to its side (-1 near, +1 far); o.step -1..1: the feet cross
  // (+1 the near foot over in front of the far one). Both 0: exactly the standing legs.
  function legs(g, D, o) {
    o = o || {}; const top = o.top == null ? 0.52 : o.top, x = o.x || 0.08, w = o.w || 0.05, sz = o.shoe || 0.14;
    const k = Math.max(-1, Math.min(1, o.kick || 0)), st = Math.max(-1, Math.min(1, o.step || 0));
    if (!k && !st) {
      D.limb(g, [[-x, top], [-x - 0.01, 0.07]], w); D.limb(g, [[x, top], [x + 0.02, 0.07]], w);
      D.shoe(g, -x - 0.04, 0.0, sz, -1, o.shoeCol); D.shoe(g, x + 0.05, 0.0, sz, 1, o.shoeCol); return;
    }
    const kl = k < 0 ? -k : 0, kr = k > 0 ? k : 0, span = 2 * x + 0.1;
    const nx = -x - 0.01 - 0.2 * kl + span * Math.max(0, st), ny = 0.07 + 0.16 * kl;          // the near foot (its ankle)
    const fx = x + 0.02 + 0.2 * kr - span * Math.max(0, -st), fy = 0.07 + 0.16 * kr;          // the far foot
    const near = () => { D.limb(g, [[-x, top], [(-x + nx) / 2 - 0.05 * kl, top * 0.5 + 0.06 * kl], [nx, ny]], w); D.shoe(g, nx - 0.03, ny - 0.07, sz, -1, o.shoeCol); };
    const far = () => { D.limb(g, [[x, top], [(x + fx) / 2 + 0.05 * kr, top * 0.5 + 0.06 * kr], [fx, fy]], w); D.shoe(g, fx + 0.03, fy - 0.07, sz, 1, o.shoeCol); };
    if (st > 0) { far(); near(); } else { near(); far(); }                                     // the crossing leg in front
  }
  // rotate everything drawn by fn about (px, py)
  function about(g, px, py, rot, fn) { g.save(); g.translate(px, py); g.rotate(rot || 0); g.translate(-px, -py); fn(); g.restore(); }
  // a stamp (wooden handle, brass foot) with its foot at (x, y)
  function stamp(g, D, x, y) {
    g.beginPath(); g.rect(x - 0.05, y, 0.1, 0.035); g.fillStyle = "#c79a3a"; g.fill(); D.stroke(g, 0.008);
    g.beginPath(); g.rect(x - 0.018, y + 0.035, 0.036, 0.1); g.fillStyle = "#6e4426"; g.fill(); D.stroke(g, 0.008);
    const k = D.blobPts(x, y + 0.16, 0.04, 0.035, 2, 0.02, 24); shape(g, D, k, "#7a4c2a", 0.008);
  }
  function quill(g, D, x, y, ang) {
    about(g, x, y, ang || 0, () => {
      const p = [[x, y - 0.03]].concat(D.quadPts([x - 0.005, y + 0.05], [x - 0.07, y + 0.22], [x - 0.02, y + 0.42], 10), D.quadPts([x - 0.02, y + 0.42], [x + 0.06, y + 0.2], [x + 0.01, y + 0.05], 10));
      shape(g, D, p, "#f4efe2", 0.007, 4); g.beginPath(); g.moveTo(x, y - 0.03); g.quadraticCurveTo(x - 0.01, y + 0.2, x - 0.02, y + 0.42); D.stroke(g, 0.006, "rgba(60,50,40,0.7)");
    });
  }
  function zzz(g, D, x, y, k, s) {
    if (!(k > 0)) return; s = s || 1; g.save(); g.globalAlpha = Math.min(1, k * 1.5);
    for (let i = 0; i < 3; i++) { const z = (0.05 + i * 0.022) * s, zx = x + i * 0.07 * s, zy = y + i * 0.1 * s;
      g.beginPath(); g.moveTo(zx, zy + z); g.lineTo(zx + z, zy + z); g.lineTo(zx, zy); g.lineTo(zx + z, zy); D.stroke(g, 0.024 * s, "#ffffff"); D.stroke(g, 0.009 * s); }
    g.restore();
  }

  // ---------- the lawyer, young and old ----------
  // style: { old: bool }. The old one keeps his face and page-boy cut (grey), red robe with an ermine collar, a black
  // round velvet cap with gold bands (a president's mortier).
  function lawyerDraw(style) {
    const old = !!style.old, GOWN = old ? "#b3202e" : BLUE, HEM = old ? "#6e0f1c" : "#1c2b66", HAIRC = old ? "#c9c5cf" : HAIR;
    return function (g, p, D) {
      // seated: hips at the seat top (p.seatH, the set's seatH above the spot), knees apart, the robe over the lap to the floor
      const sit = clamp01(p.sit) > 0.5 ? 1 : 0, seatH = p.seatH == null ? 0.5 : p.seatH, carried = clamp01(p.carried) > 0.5;
      const dy = sit ? seatH - 0.52 : 0, bob = (p.bob || 0) + dy, sh = 1.32 + bob;
      if (carried) {                                                  // on two men's shoulders: legs astride, dangling
        for (const s of [-1, 1]) { D.limb(g, [[s * 0.08, 0.52], [s * 0.36, 0.46], [s * 0.42, 0.12]], 0.05); D.shoe(g, s * 0.45, 0.04, 0.14, s); }
      } else if (!sit) legs(g, D, { top: 0.52 });
      else for (const s of [-1, 1]) { D.limb(g, [[s * 0.15, seatH], [s * 0.16, 0.07]], 0.05); D.shoe(g, s * 0.19, 0.0, 0.14, s); }
      // far arm: holds the roll (young), a quill (old) or flings wide
      const wide = clamp01(p.wide), shrug = clamp01(p.shrug);
      let af = [0.3, 0.05]; af = lerpA(af, ARMS.wide(1), wide); af = lerpA(af, ARMS.shrug(1), shrug * (1 - wide));
      const hand2 = D.arm(g, 0.19, sh, af[0], af[1], 0.66, 0.03);
      if (!old && p.roll !== false && wide < 0.5 && shrug < 0.5) {
        g.save(); g.translate(hand2[0] + 0.025, hand2[1]); g.rotate(-0.25);
        g.beginPath(); g.rect(-0.035, -0.17, 0.07, 0.34); g.fillStyle = "#efe2c0"; g.fill();
        g.fillStyle = "rgba(120,90,40,0.25)"; g.fillRect(0.012, -0.17, 0.023, 0.34); g.beginPath(); g.rect(-0.035, -0.17, 0.07, 0.34); D.stroke(g, 0.011);
        g.beginPath(); g.ellipse(0, 0.17, 0.035, 0.013, 0, 0, 7); g.fillStyle = "#d9c79c"; g.fill(); D.stroke(g, 0.008);
        g.beginPath(); g.moveTo(-0.01, -0.02); g.lineTo(-0.03, -0.14); g.moveTo(0.01, -0.02); g.lineTo(0.025, -0.13); D.stroke(g, 0.012, "#b8202e");
        g.beginPath(); g.arc(0, -0.01, 0.025, 0, 7); g.fillStyle = "#b8202e"; g.fill(); D.stroke(g, 0.007); g.restore();
      }
      if (old && p.quill) quill(g, D, hand2[0], hand2[1] - 0.02, -0.4);
      D.hand(g, hand2[0], hand2[1], 0.034);
      sleeve(g, D, 0.19, sh, af[0], 0.26, 0.12, 0.16, GOWN, HEM);
      // gown
      const y0 = sit ? 0.12 : 0.42, hgt = 0.98 + bob - y0 + 0.42;
      D.robe(g, 0, y0, 0.46, sit ? 0.82 : 0.62, hgt, GOWN, { pattern: old ? "speckle" : "damask", patternOpts: old ? { alpha: 0.3, density: 900 } : { alpha: 0.32, step: 0.085 }, folds: [-0.5, 0.05, 0.5], trim: { col: HEM, w: 0.045 }, seed: 21 });
      D.line(g, [[0, 1.3 + bob], [0, y0]], 0.012, old ? "rgba(60,0,10,0.8)" : "rgba(15,20,60,0.8)");
      D.buttons(g, 0.03, 1.2 + bob, 0.95 + bob, 4, 0.016, GOLD);
      if (sit) {                                                      // the lap: a fold across the knees, a shadow under it
        g.beginPath(); g.moveTo(-0.36, seatH - 0.02); g.quadraticCurveTo(0, seatH + 0.05, 0.36, seatH - 0.02); D.stroke(g, 0.016, "rgba(20,5,20,0.75)");
        g.beginPath(); g.moveTo(-0.3, seatH - 0.06); g.quadraticCurveTo(0, seatH - 0.01, 0.3, seatH - 0.06); D.stroke(g, 0.04, "rgba(20,5,30,0.25)");
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 0.03, seatH - 0.05); g.lineTo(s * 0.06, 0.16); D.stroke(g, 0.012, "rgba(20,5,30,0.4)"); }
      }
      if (!old) {
        D.band(g, [[-0.27, 0.88 + bob], [0, 0.86 + bob], [0.27, 0.88 + bob]], 0.04, "#5a3a22");
        g.beginPath(); g.rect(-0.03, 0.84 + bob, 0.06, 0.045); g.fillStyle = GOLD; g.fill(); D.stroke(g, 0.008);
        g.beginPath(); g.moveTo(0.13, 0.86 + bob); g.lineTo(0.12, 0.74 + bob); g.quadraticCurveTo(0.17, 0.68 + bob, 0.22, 0.74 + bob); g.lineTo(0.21, 0.86 + bob); g.closePath();
        g.fillStyle = "#7a4a2a"; g.fill(); D.stroke(g, 0.01); D.buttons(g, 0.17, 0.79 + bob, 0.79 + bob, 1, 0.01, GOLD);
      } else {
        D.band(g, [[-0.28, 0.9 + bob], [0, 0.88 + bob], [0.28, 0.9 + bob]], 0.035, GOLD);
        // a gold chain of office
        g.beginPath(); g.moveTo(-0.2, 1.3 + bob); g.quadraticCurveTo(0, 0.98 + bob, 0.2, 1.3 + bob); D.stroke(g, 0.026); g.beginPath(); g.moveTo(-0.2, 1.3 + bob); g.quadraticCurveTo(0, 0.98 + bob, 0.2, 1.3 + bob); D.stroke(g, 0.013, GOLD);
      }
      g.beginPath(); g.moveTo(-0.1, 1.4 + bob); g.lineTo(0, 1.2 + bob); g.lineTo(0.1, 1.4 + bob); g.closePath(); g.fillStyle = "#f4f0e8"; g.fill();
      g.beginPath(); g.moveTo(-0.03, 1.36 + bob); g.lineTo(0, 1.3 + bob); g.lineTo(0.03, 1.36 + bob); D.stroke(g, 0.006, "rgba(60,50,70,0.6)");
      if (!old) {
        D.fur(g, [[-0.24, 1.33 + bob], [-0.14, 1.24 + bob], [-0.04, 1.17 + bob]], 0.085, FUR, 3);
        D.fur(g, [[0.24, 1.33 + bob], [0.14, 1.24 + bob], [0.04, 1.17 + bob]], 0.085, FUR, 8);
      } else {                                                        // ermine: white with black tail tips
        const L = [[-0.25, 1.35 + bob], [-0.15, 1.24 + bob], [-0.04, 1.16 + bob]], R = [[0.25, 1.35 + bob], [0.15, 1.24 + bob], [0.04, 1.16 + bob]];
        D.fur(g, L, 0.1, "#f3efe6", 3); D.fur(g, R, 0.1, "#f3efe6", 8);
        for (const q of [[-0.2, 1.3], [-0.1, 1.21], [0.2, 1.3], [0.1, 1.21], [-0.15, 1.27], [0.15, 1.27]]) { g.beginPath(); g.ellipse(q[0], q[1] + bob, 0.009, 0.018, 0, 0, 7); g.fillStyle = "#1c1620"; g.fill(); }
      }
      // head
      const hx = 0, hy = 1.64 + bob, r = 0.25;
      about(g, hx, hy - r, p.tilt || 0, () => {
        const hairPts = D.blobPts(hx, hy + 0.03, 0.31, 0.25, 4, 0.02, 48);
        D.tracePts(g, hairPts, true); g.fillStyle = HAIRC; g.fill();
        g.save(); D.tracePts(g, hairPts, true); g.clip(); for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(hx + i * 0.06, hy + 0.25); g.quadraticCurveTo(hx + i * 0.075, hy + 0.05, hx + i * 0.07, hy - 0.22); D.stroke(g, 0.006, old ? "rgba(90,85,105,0.45)" : "rgba(30,15,5,0.45)"); } g.restore();
        D.inkLine(g, hairPts, 0.02, { closed: true, seed: 6 });
        D.head(g, hx, hy, r, { seed: 2 });
        g.beginPath(); g.moveTo(hx - 0.22, hy + 0.12); g.quadraticCurveTo(hx - 0.08, hy + 0.06, hx + 0.02, hy + 0.15); g.quadraticCurveTo(hx + 0.12, hy + 0.08, hx + 0.23, hy + 0.13);
        g.lineTo(hx + 0.21, hy + 0.22); g.lineTo(hx - 0.21, hy + 0.22); g.closePath(); g.fillStyle = HAIRC; g.fill(); D.stroke(g, 0.014);
        const fe = Object.assign({}, p.face || {}); if (old && fe.lines == null) fe.lines = 1;
        D.face(g, hx, hy - 0.04, r, fe);
        if (!old) {                                                   // soft black bonnet, worn tilted, gold brooch
          g.save(); g.translate(hx + 0.02, hy + 0.21); g.rotate(-0.09);
          const crown = D.blobPts(0.02, 0.08, 0.32, 0.105, 7, 0.03, 48);
          D.tracePts(g, crown, true); g.fillStyle = "#1f1a26"; g.fill(); D.inkLine(g, crown, 0.02, { closed: true, seed: 9 });
          g.beginPath(); g.moveTo(-0.2, 0.13); g.quadraticCurveTo(0.0, 0.18, 0.2, 0.14); D.stroke(g, 0.014, "rgba(255,255,255,0.28)");
          g.beginPath(); g.moveTo(-0.26, 0.0); g.quadraticCurveTo(0, -0.05, 0.27, 0.0); g.lineTo(0.25, 0.05); g.quadraticCurveTo(0, 0.0, -0.24, 0.05); g.closePath(); g.fillStyle = "#2c2536"; g.fill(); D.stroke(g, 0.014);
          g.beginPath(); g.moveTo(0.14, -0.01); g.lineTo(0.15, 0.04); D.stroke(g, 0.008);
          g.beginPath(); g.arc(0.19, 0.035, 0.026, 0, 7); g.fillStyle = GOLD; g.fill(); D.stroke(g, 0.008); g.beginPath(); g.arc(0.183, 0.042, 0.008, 0, 7); g.fillStyle = "#fff6d0"; g.fill();
          g.restore();
        } else {                                                      // mortier: a round black velvet cap with two gold bands
          const b = hy + 0.16, cap = [].concat(D.quadPts([hx - 0.29, b], [hx, b - 0.04], [hx + 0.29, b], 10), D.quadPts([hx + 0.29, b], [hx + 0.31, b + 0.12], [hx + 0.24, b + 0.17], 8),
            D.quadPts([hx + 0.24, b + 0.17], [hx, b + 0.21], [hx - 0.24, b + 0.17], 10), D.quadPts([hx - 0.24, b + 0.17], [hx - 0.31, b + 0.12], [hx - 0.29, b], 8));
          D.tracePts(g, cap, true); g.fillStyle = "#1d1822"; g.fill();
          g.save(); D.tracePts(g, cap, true); g.clip();
          g.beginPath(); g.moveTo(hx - 0.3, b + 0.135); g.quadraticCurveTo(hx, b + 0.175, hx + 0.3, b + 0.135); D.stroke(g, 0.03, GOLD);
          g.beginPath(); g.moveTo(hx - 0.18, b + 0.08); g.quadraticCurveTo(hx - 0.05, b + 0.11, hx + 0.05, b + 0.1); D.stroke(g, 0.014, "rgba(255,255,255,0.22)");
          g.restore(); D.inkLine(g, cap, 0.02, { closed: true, seed: 9 });
        }
      });
      // near arm: blends the look-test arm (armOut + beat) toward up / wide / shrug / reach
      const out = p.armOut == null ? 0 : p.armOut;
      let an = [-0.35 - out * 1.45 + (p.beat || 0) * 0.12, 0]; an[1] = an[0] - out * 0.25 + (p.beat || 0) * 0.2;
      an = lerpA(an, ARMS.up(-1), clamp01(p.up)); an = lerpA(an, ARMS.wide(-1), wide); an = lerpA(an, ARMS.shrug(-1), shrug * (1 - wide));
      an = lerpA(an, [-0.55, -0.15], clamp01(p.reach));
      const st = p.stamp;
      if (st != null) an = lerpA([-0.3, 0.35], [-2.75, -3.1], clamp01(st));
      const hand = D.arm(g, -0.19, sh, an[0], an[1], 0.68, 0.03);
      sleeve(g, D, -0.19, sh, an[0], 0.26, 0.12, 0.16, GOWN, HEM);
      if (st != null) stamp(g, D, hand[0], hand[1] - 0.2);
      D.hand(g, hand[0], hand[1], 0.034);
      if (clamp01(p.up) > 0.6) { g.beginPath(); g.moveTo(hand[0], hand[1] + 0.02); g.lineTo(hand[0] + 0.004, hand[1] + 0.085); D.stroke(g, 0.022, SF.LIMB); }   // one finger up
    };
  }
  const lawyerDef = { w: 1.9, h: 2.25, px: 1000, pose: { armOut: 1, beat: 0, bob: 0, tilt: 0, face: RT.EXPR.earnest }, draw: lawyerDraw({}) };
  const lawyerOldDef = { w: 1.9, h: 2.3, px: 1000, pose: { armOut: 0, beat: 0, bob: 0, tilt: 0, sit: 0, face: RT.EXPR.oldCalm }, draw: lawyerDraw({ old: true }) };

  // ---------- the judge (look test, plus lean and zzz) ----------
  const judgeDef = {
    w: 1.5, h: 2.6, px: 1000,
    pose: { chin: 0, tilt: 0, lean: 0, face: RT.EXPR.stern },
    draw(g, p, D) {
      const lean = clamp01(p.lean), ly = -0.08 * lean;
      D.robe(g, 0, 0.0, 0.52, 0.74, 1.44 + ly, VIOLET, { pattern: "speckle", patternOpts: { alpha: 0.35, density: 1100 }, folds: [-0.5, -0.1, 0.35, 0.7], seed: 31 });
      D.buttons(g, 0, 1.0 + ly, 0.1, 14, 0.013, "#b0203a");
      const hf = D.arm(g, 0.22, 1.26 + ly, 0.35, 0.9, 0.62, 0.03); D.hand(g, hf[0], hf[1], 0.034);
      g.save(); g.translate(0, ly);
      const cape = [].concat(D.quadPts([-0.27, 1.43], [-0.4, 1.3], [-0.33, 1.08], 10), D.quadPts([-0.33, 1.08], [0, 0.94], [0.33, 1.08], 14), D.quadPts([0.33, 1.08], [0.4, 1.3], [0.27, 1.43], 10));
      D.tracePts(g, cape, true); g.fillStyle = CAPE; g.fill();
      g.save(); D.tracePts(g, cape, true); g.clip(); D.pattern(g, "damask", CAPE, [-0.42, 0.9, 0.42, 1.45], 33, { alpha: 0.5, step: 0.07 });
      const cg = g.createLinearGradient(-0.4, 0, 0.4, 0); cg.addColorStop(0, "rgba(20,0,30,0.25)"); cg.addColorStop(0.25, "rgba(255,255,255,0.1)"); cg.addColorStop(0.6, "rgba(0,0,0,0)"); cg.addColorStop(1, "rgba(20,0,30,0.4)"); g.fillStyle = cg; g.fillRect(-0.45, 0.9, 0.9, 0.6);
      g.beginPath(); for (let i = 0; i < cape.length; i++) { const q = cape[i]; i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.lineWidth = 0.05; g.strokeStyle = GOLD; g.stroke();
      g.restore();
      D.fur(g, D.quadPts([-0.335, 1.1], [0, 0.95], [0.335, 1.1], 10), 0.06, "#f3efe6", 12);
      { const R = D.rng(5); for (const q of D.quadPts([-0.3, 1.09], [0, 0.955], [0.3, 1.09], 6)) { g.beginPath(); g.ellipse(q[0] + (R() - 0.5) * 0.02, q[1] - 0.005, 0.008, 0.016, 0, 0, 7); g.fillStyle = "#1c1620"; g.fill(); } }
      D.inkLine(g, cape, 0.02, { closed: true, seed: 12 });
      D.buttons(g, 0, 1.36, 1.0, 6, 0.011, "#d03048");
      g.beginPath(); g.moveTo(-0.11, 1.44); g.quadraticCurveTo(0, 1.38, 0.11, 1.44); g.lineTo(0.1, 1.38); g.quadraticCurveTo(0, 1.32, -0.1, 1.38); g.closePath(); g.fillStyle = "#fbf8f2"; g.fill(); D.stroke(g, 0.009);
      g.beginPath(); g.moveTo(-0.17, 1.36); g.quadraticCurveTo(0, 1.02, 0.17, 1.36); D.stroke(g, 0.024); g.beginPath(); g.moveTo(-0.17, 1.36); g.quadraticCurveTo(0, 1.02, 0.17, 1.36); D.stroke(g, 0.012, GOLD);
      g.beginPath(); g.rect(-0.022, 1.0, 0.044, 0.15); g.rect(-0.065, 1.075, 0.13, 0.04); g.fillStyle = GOLD; g.fill(); D.stroke(g, 0.009);
      g.beginPath(); g.arc(0, 1.095, 0.012, 0, 7); g.fillStyle = "#c02040"; g.fill();
      g.restore();
      const c = p.chin || 0, a1 = -0.3 - c * 0.45, a2 = -1.0 + c * 3.6;
      const rest = D.arm(g, -0.22, 1.26 + ly, a1, a2, 0.62, 0), el = [-0.44 + c * -0.02, 0.98 + c * 0.04 + ly];
      const hn = [rest[0] + (-0.15 - rest[0]) * c, rest[1] + (1.38 + ly * 1.6 - rest[1]) * c];
      if (c > 0.01) D.limb(g, [[-0.22, 1.26 + ly], el, hn], 0.03); else D.arm(g, -0.22, 1.26 + ly, a1, a2, 0.62, 0.03);
      g.beginPath(); g.ellipse(-0.25, 1.2 + ly, 0.055, 0.04, a1, 0, 7); g.fillStyle = CRIMSON; g.fill(); D.stroke(g, 0.01);
      const hx = 0, hy = 1.62 + ly * 1.6, r = 0.27 * (1 + 0.07 * lean);
      about(g, hx, hy - r, p.tilt || 0, () => {
        for (const s of [-1, 1]) { const tp = D.blobPts(hx + s * r, hy - 0.01, 0.065, 0.11, 3 + s, 0.08, 32); D.tracePts(g, tp, true); g.fillStyle = "#cfcad6"; g.fill();
          g.beginPath(); g.moveTo(hx + s * r, hy + 0.07); g.lineTo(hx + s * (r + 0.03), hy - 0.06); D.stroke(g, 0.006, "rgba(90,80,110,0.6)"); D.inkLine(g, tp, 0.014, { closed: true, seed: 4 }); }
        D.head(g, hx, hy, r, { seed: 5 });
        D.face(g, hx, hy - 0.03, r, p.face);
        const k = r / 0.27, base = hy + 0.17 * k, top = hy + 0.4 * k;
        const body = [].concat(D.quadPts([hx - 0.25 * k, base], [hx, base - 0.05], [hx + 0.25 * k, base], 10),
          D.quadPts([hx + 0.25 * k, base], [hx + 0.3 * k, top - 0.08], [hx + 0.3 * k, top + 0.03], 8),
          D.quadPts([hx + 0.3 * k, top + 0.03], [hx + 0.15, top - 0.04], [hx, top - 0.01], 8),
          D.quadPts([hx, top - 0.01], [hx - 0.15, top - 0.04], [hx - 0.3 * k, top + 0.03], 8),
          D.quadPts([hx - 0.3 * k, top + 0.03], [hx - 0.3 * k, top - 0.08], [hx - 0.25 * k, base], 8));
        D.tracePts(g, body, true); g.fillStyle = CRIMSON; g.fill();
        g.save(); D.tracePts(g, body, true); g.clip(); D.pattern(g, "speckle", CRIMSON, [hx - 0.34, base - 0.06, hx + 0.34, top + 0.05], 51, { alpha: 0.3, density: 900 });
        const gr = g.createLinearGradient(hx - 0.3, 0, hx + 0.3, 0); gr.addColorStop(0, "rgba(255,255,255,0.14)"); gr.addColorStop(0.6, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(20,0,40,0.38)");
        g.fillStyle = gr; g.fillRect(hx - 0.34, base - 0.06, 0.68, 0.42); g.fillStyle = "rgba(40,0,20,0.4)"; g.fillRect(hx - 0.34, base - 0.06, 0.68, 0.085);
        g.beginPath(); g.moveTo(hx, top - 0.01); g.quadraticCurveTo(hx + 0.012, base + 0.12, hx - 0.005, base + 0.04); D.stroke(g, 0.012, "rgba(30,0,20,0.55)");
        g.restore(); D.inkLine(g, body, 0.02, { closed: true, seed: 23 });
        const tuft = D.blobPts(hx, top + 0.02, 0.035, 0.03, 6, 0.12, 24); D.tracePts(g, tuft, true); g.fillStyle = "#c22a40"; g.fill(); D.inkLine(g, tuft, 0.011, { closed: true, seed: 3 });
      });
      D.hand(g, hn[0], hn[1], 0.034);
      zzz(g, D, 0.3, 1.95, p.zzz, 1.3);
    },
  };

  // ---------- the rat and its options ----------
  const RATFUR = "#9a94a6", RATHEAD = "#b9b3c2";
  function ratHead(g, D, x, y, p, e) {
    for (const s of [-1, 1]) { const ep = D.blobPts(x + s * 0.08, y + 0.085, 0.05, 0.05, 2 + s, 0.03, 32); D.tracePts(g, ep, true); g.fillStyle = RATFUR; g.fill(); D.inkLine(g, ep, 0.009, { closed: true, seed: 7 });
      g.beginPath(); g.arc(x + s * 0.08, y + 0.085, 0.028, 0, 7); g.fillStyle = PINK; g.fill(); }
    D.head(g, x, y, 0.092, { seed: 9, fill: RATHEAD, shade: "rgba(90,80,120,0.6)" });
    D.face(g, x, y + 0.005, 0.092, Object.assign(e, { mouth: e.mouth === "o" ? "o" : "line", mouthW: e.mouth === "o" ? 0.5 : 0.001 }));
    g.beginPath(); g.ellipse(x, y - 0.022, 0.018, 0.013, 0, 0, 7); g.fillStyle = "#e0707e"; g.fill(); D.stroke(g, 0.005);
    if (e.mouth !== "o") { g.beginPath(); g.rect(x - 0.012, y - 0.062, 0.011, 0.022); g.rect(x + 0.001, y - 0.062, 0.011, 0.022); g.fillStyle = "#fbf8f2"; g.fill(); D.stroke(g, 0.004); }
    for (const s of [-1, 1]) for (const a of [-0.15, 0.05, 0.25]) { g.beginPath(); g.moveTo(x + s * 0.03, y - 0.027); g.lineTo(x + s * 0.135, y - 0.027 + a * 0.15); D.stroke(g, 0.0035); }
    if (p.specs) {                                                    // round rivet spectacles: the one joke
      for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 0.026, y + 0.01, 0.026, 0, TAU); g.fillStyle = "rgba(220,235,255,0.28)"; g.fill(); D.stroke(g, 0.0075, "#3a2a1a"); D.stroke(g, 0.0035, GOLD);
        g.beginPath(); g.arc(x + s * 0.026 - 0.008, y + 0.018, 0.006, 0, TAU); g.fillStyle = "rgba(255,255,255,0.8)"; g.fill(); }
      g.beginPath(); g.moveTo(x - 0.004, y + 0.016); g.quadraticCurveTo(x, y + 0.026, x + 0.004, y + 0.016); D.stroke(g, 0.006, "#3a2a1a");
    }
  }
  const ratDef = {
    w: 0.9, h: 0.62, px: 1600,
    pose: { tail: 0, look: [0.6, 0.2], eye: 1.2, hands: 0 },
    draw(g, p, D) {
      const tw = p.tail || 0, fat = clamp01(p.fat);
      const e = Object.assign({}, RT.EXPR.rat, p.face || {}, { look: p.look || [0, 0], eye: p.eye == null ? 1.2 : p.eye });
      if (p.asleep) {                                                 // on its back, belly up, feet in the air
        const bw = 0.15 + 0.05 * fat, bh = 0.085 + 0.035 * fat, by = bh + 0.01;
        g.beginPath(); g.moveTo(bw - 0.02, by - 0.02); g.bezierCurveTo(bw + 0.12, by - 0.06 + tw * 0.03, bw + 0.2, by + 0.04, bw + 0.16 + tw * 0.03, by + 0.12); D.stroke(g, 0.022);
        g.beginPath(); g.moveTo(bw - 0.02, by - 0.02); g.bezierCurveTo(bw + 0.12, by - 0.06 + tw * 0.03, bw + 0.2, by + 0.04, bw + 0.16 + tw * 0.03, by + 0.12); D.stroke(g, 0.011, PINK);
        for (const lx of [-0.09, 0.1]) { D.limb(g, [[lx * (1 + fat * 0.3), by + bh * 0.6], [lx * (1 + fat * 0.3) + 0.01, by + bh + 0.06]], 0.017); g.beginPath(); g.ellipse(lx * (1 + fat * 0.3) + 0.012, by + bh + 0.075, 0.014, 0.028, 0.2, 0, 7); g.fillStyle = PINK; g.fill(); D.stroke(g, 0.005); }
        const body = D.blobPts(0, by, bw, bh, 5, 0.02, 48); shape(g, D, body, "#8c6d4c", 0.01, 41);
        g.save(); D.tracePts(g, body, true); g.clip(); D.pattern(g, "weave", "#8c6d4c", [-bw, 0, bw, by + bh], 41, { alpha: 0.5, step: 0.012 }); g.restore();
        const belly = D.blobPts(0.0, by + bh * 0.35, bw * 0.62, bh * 0.75, 7, 0.02, 40); shape(g, D, belly, "#efc6cb", 0.008, 8);
        D.band(g, [[-bw * 0.75, by - bh * 0.2], [bw * 0.75, by - bh * 0.25]], 0.01, "#cdb07a", { edge: 0.004 });
        for (const lx of [-0.03, 0.05]) { D.limb(g, [[lx, by + bh * 0.85], [lx - 0.01, by + bh + 0.035]], 0.012); D.hand(g, lx - 0.01, by + bh + 0.04, 0.014, PINK); }
        about(g, -bw - 0.06, by + 0.02, 1.25, () => { ratHead(g, D, -bw - 0.06, by + 0.02, p, Object.assign(e, { eyeStyle: "shut", mouth: "o" })); });
        zzz(g, D, -bw + 0.02, by + bh + 0.06, p.zzz == null ? 0 : p.zzz, 0.55);
        return;
      }
      const bw = 0.17 + 0.12 * fat;
      // tail, legs, feet
      g.beginPath(); g.moveTo(0.05, 0.07); g.bezierCurveTo(0.2, 0.0 + tw * 0.03, 0.27, 0.12 + tw * 0.05, 0.22 + tw * 0.04, 0.22); D.stroke(g, 0.024);
      g.beginPath(); g.moveTo(0.05, 0.07); g.bezierCurveTo(0.2, 0.0 + tw * 0.03, 0.27, 0.12 + tw * 0.05, 0.22 + tw * 0.04, 0.22); D.stroke(g, 0.012, PINK);
      D.limb(g, [[-0.035, 0.1], [-0.045, 0.02]], 0.017); D.limb(g, [[0.035, 0.1], [0.045, 0.02]], 0.017);
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 0.058, 0.015, 0.032, 0.014, 0, 0, 7); g.fillStyle = PINK; g.fill(); D.stroke(g, 0.006); }
      // bundle on a stick: the stick behind the body, over the far shoulder
      if (p.bundle) {
        g.beginPath(); g.moveTo(0.02, 0.16); g.lineTo(0.27, 0.49); D.stroke(g, 0.016); g.beginPath(); g.moveTo(0.02, 0.16); g.lineTo(0.27, 0.49); D.stroke(g, 0.008, "#9a6a3a");
        const bp = D.blobPts(0.28, 0.47, 0.075, 0.062, 4, 0.06, 32); shape(g, D, bp, "#b8322e", 0.008, 2);
        g.save(); D.tracePts(g, bp, true); g.clip(); for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(0.22 + (i % 4) * 0.04, 0.42 + Math.floor(i / 4) * 0.04 + (i % 2) * 0.01, 0.008, 0, TAU); g.fillStyle = "#f3e6cf"; g.fill(); } g.restore();
        g.beginPath(); g.moveTo(0.26, 0.52); g.lineTo(0.25, 0.555); g.moveTo(0.28, 0.525); g.lineTo(0.3, 0.56); D.stroke(g, 0.008);
      }
      // body: a patched burlap smock with a rope belt (wider when fat)
      D.pill(g, 0, 0.065, bw, 0.25 + 0.02 * fat, "#8c6d4c", { pattern: "weave", patternOpts: { alpha: 0.5, step: 0.012 }, out: 0.009, seed: 41 });
      g.beginPath(); g.rect(0.012, 0.09, 0.04, 0.04); g.fillStyle = "#a88a62"; g.fill(); D.stroke(g, 0.004);
      g.setLineDash([0.006, 0.005]); g.beginPath(); g.rect(0.016, 0.094, 0.032, 0.032); D.stroke(g, 0.002); g.setLineDash([]);
      D.band(g, [[-bw / 2 + 0.002, 0.155], [0, 0.148], [bw / 2 - 0.002, 0.155]], 0.012, "#cdb07a", { edge: 0.005 });
      g.beginPath(); g.moveTo(-0.02, 0.15); g.lineTo(-0.03, 0.105); g.moveTo(-0.01, 0.15); g.lineTo(-0.005, 0.11); D.stroke(g, 0.006, "#cdb07a");
      // arms: wringing paws (default), a paw to the ear, a paw on the stick
      const k = p.hands || 0, ear = clamp01(p.ear), sx = bw / 2 - 0.01;
      if (p.bundle) { D.limb(g, [[sx, 0.27], [sx + 0.03, 0.22], [0.12, 0.29]], 0.012); D.hand(g, 0.12, 0.29, 0.016, PINK); }
      if (ear > 0.5) { D.limb(g, [[-sx, 0.27], [-sx - 0.06, 0.33], [-0.095, 0.41]], 0.012); D.hand(g, -0.1, 0.415, 0.018, PINK); }
      if (!p.bundle && ear <= 0.5) { D.limb(g, [[-sx, 0.27], [-0.055, 0.2], [-0.014, 0.19 + k * 0.01]], 0.012); D.limb(g, [[sx, 0.27], [0.055, 0.2], [0.014, 0.19 - k * 0.01]], 0.012);
        D.hand(g, -0.008, 0.19 + k * 0.006, 0.016, PINK); D.hand(g, 0.01, 0.188 - k * 0.006, 0.016, PINK); }
      else { if (!p.bundle) { D.limb(g, [[sx, 0.27], [0.05, 0.2], [0.01, 0.19]], 0.012); D.hand(g, 0.01, 0.19, 0.016, PINK); }
        if (ear <= 0.5) { D.limb(g, [[-sx, 0.27], [-0.05, 0.2], [-0.01, 0.19]], 0.012); D.hand(g, -0.01, 0.19, 0.016, PINK); } }
      ratHead(g, D, 0, 0.355, p, e);
      if (ear > 0.5) { D.hand(g, -0.1, 0.415, 0.018, PINK); for (const a of [0, 1]) { g.beginPath(); g.arc(-0.17, 0.42, 0.04 + a * 0.03, 2.4, 3.9); D.stroke(g, 0.006); } }
      zzz(g, D, 0.1, 0.45, p.zzz, 0.5);
    },
  };

  // ---------- the pig ----------
  const pigDef = {
    w: 1.1, h: 1.5, px: 1000,
    pose: { face: RT.EXPR.innocent, tail: 0, rope: true, trotters: 0 },
    draw(g, p, D) {
      const PK = "#f0aeb8", HEADC = "#f8dde1";
      // curly tail at the far side
      g.beginPath(); g.moveTo(0.26, 0.32); g.bezierCurveTo(0.4, 0.3 + (p.tail || 0) * 0.03, 0.42, 0.45, 0.36, 0.42); g.bezierCurveTo(0.31, 0.39, 0.36, 0.33, 0.42, 0.36); D.stroke(g, 0.03); g.stroke(); D.stroke(g, 0.016, PK);
      legs(g, D, { top: 0.3, x: 0.12, w: 0.06, shoe: 0.12, shoeCol: "#3a2a2c" });
      // a pear-shaped pink body under a short sacking smock with a rope belt (pigs were tried dressed)
      D.robe(g, 0, 0.26, 0.46, 0.64, 0.62, PK, { seed: 6, out: 0.02 });
      D.robe(g, 0, 0.3, 0.5, 0.7, 0.56, "#8d7a58", { pattern: "weave", patternOpts: { alpha: 0.45, step: 0.018 }, folds: [-0.55, -0.1, 0.35], trim: { col: "#6a5838", w: 0.04 }, seed: 13 });
      g.beginPath(); g.moveTo(-0.12, 0.86); g.lineTo(0, 0.74); g.lineTo(0.12, 0.86); g.closePath(); g.fillStyle = PK; g.fill(); D.stroke(g, 0.012);   // the V at the neck
      for (const s of [-1, 1]) { g.beginPath(); g.rect(s * 0.1 - 0.02, 0.64, 0.04, 0.05); g.fillStyle = "#d6c08a"; g.fill(); D.stroke(g, 0.006); }       // two patches of mending
      D.band(g, [[-0.31, 0.55], [0, 0.52], [0.31, 0.55]], 0.024, "#c9a46a", { edge: 0.01 });
      g.beginPath(); g.moveTo(0.04, 0.53); g.lineTo(0.06, 0.42); g.moveTo(0.07, 0.53); g.lineTo(0.11, 0.43); D.stroke(g, 0.014, "#c9a46a");
      // trotters held together in front, innocently
      const k = p.trotters || 0;
      D.limb(g, [[-0.26, 0.7], [-0.17, 0.56], [-0.04, 0.6 + k * 0.01]], 0.035); D.limb(g, [[0.26, 0.7], [0.17, 0.56], [0.04, 0.6 - k * 0.01]], 0.035);
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 0.035, 0.6 - s * k * 0.01, 0.035, 0.03, 0, 0, TAU); g.fillStyle = "#3a2a2c"; g.fill(); }
      // head: big, pale pink, floppy ears, snout
      const hx = 0, hy = 1.04, r = 0.27;
      for (const s of [-1, 1]) { const ear = [[hx + s * 0.12, hy + 0.2], [hx + s * 0.3, hy + 0.3], [hx + s * 0.33, hy + 0.1]]; shape(g, D, ear, PK, 0.016, 2 + s);
        g.beginPath(); g.moveTo(hx + s * 0.17, hy + 0.2); g.lineTo(hx + s * 0.28, hy + 0.25); g.lineTo(hx + s * 0.29, hy + 0.15); g.closePath(); g.fillStyle = "#d9808e"; g.fill(); }
      D.head(g, hx, hy, r, { seed: 14, fill: HEADC, shade: "rgba(190,120,140,0.55)" });
      D.face(g, hx, hy + 0.02, r, Object.assign({}, p.face, { mouthY: -0.1 }));
      const sn = D.blobPts(hx, hy - 0.06, 0.085, 0.055, 3, 0.02, 32); shape(g, D, sn, "#f0a3ae", 0.012, 5);
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(hx + s * 0.03, hy - 0.06, 0.013, 0.02, 0, 0, TAU); g.fillStyle = "#6a2a38"; g.fill(); }
      // the usher's rope at the neck, its loose end off to screen right
      if (p.rope !== false) { g.beginPath(); g.moveTo(-0.2, 0.83); g.quadraticCurveTo(0, 0.76, 0.2, 0.83); g.quadraticCurveTo(0.35, 0.78, 0.5, 0.72); D.stroke(g, 0.03); D.stroke(g, 0.016, "#c9a46a"); }
    },
  };

  // ---------- a generic person: legs, far arm, body, head, near arm, with hooks ----------
  // cfg: { sh, shx, legTop, legX, body(g, D, p, bob), head: { y, r, seed }, hairBack, hairFront, hat(g, D, hx, hy, r, p), beard,
  //        faceDy, armN(p) / armF(p) -> spec, armLen, propN(g, D, hand, p), propF, sleeve: { fill, trim, w0, w1 }, after(g, D, p, bob) }
  function person(cfg) {
    return function (g, p, D) {
      const turn = p.turn ? Math.cos(2 * Math.PI * p.turn) : 1;      // a spin: the drawing narrows, mirrors, comes back
      if (turn !== 1) { g.save(); g.scale(Math.sign(turn || 1) * Math.max(0.06, Math.abs(turn)), 1); }
      draw(g, p, D);
      if (turn !== 1) g.restore();
    };
    function draw(g, p, D) {
      const bob = p.bob || 0, sh = (cfg.sh || 1.32) + bob, shx = cfg.shx || 0.19, L = cfg.armLen || 0.66;
      // seated (p.sit, hips on p.seatH): shins only, knees apart; everything above moves so the hips sit on the seat
      const sit = clamp01(p.sit) > 0.5 && cfg.legs !== false, seatH = p.seatH == null ? 0.46 : p.seatH, legTop = cfg.legTop || 0.52;
      if (sit) { for (const s of [-1, 1]) { D.limb(g, [[s * 0.13, seatH], [s * 0.14, 0.07]], 0.05); D.shoe(g, s * 0.17, 0.0, 0.14, s, p.shoeCol || cfg.shoeCol); } g.save(); g.translate(0, seatH - legTop + 0.04); }
      else if (cfg.legs !== false) legs(g, D, { top: legTop, x: cfg.legX || 0.08, shoeCol: p.shoeCol || cfg.shoeCol, kick: p.kick, step: p.step });
      const specF = cfg.armF ? cfg.armF(p) : "down";
      if (specF !== null) {                                           // null: this character draws its far arm itself
        const armF = armOf(specF, 1), hf = D.arm(g, shx, sh, armF[0], armF[1], L, 0.03);
        if (cfg.propF) cfg.propF(g, D, hf, p);
        if (cfg.sleeve) sleeve(g, D, shx, sh, armF[0], 0.24, cfg.sleeve.w0 || 0.11, cfg.sleeve.w1 || 0.14, cfg.sleeve.fill, cfg.sleeve.trim);
        D.hand(g, hf[0], hf[1], 0.034);
      }
      cfg.body(g, D, p, bob);
      const H = cfg.head || {}, hx = 0, hy = (H.y || 1.64) + bob, r = H.r || 0.25;
      about(g, hx, hy - r, p.tilt || 0, () => {
        if (cfg.hairBack) cfg.hairBack(g, D, hx, hy, r, p);
        D.head(g, hx, hy, r, { seed: H.seed || 2, fill: H.fill });
        if (cfg.hairFront) cfg.hairFront(g, D, hx, hy, r, p);
        if (cfg.beard) cfg.beard(g, D, hx, hy, r, p);
        D.face(g, hx, hy + (cfg.faceDy == null ? -0.04 : cfg.faceDy), r, Object.assign({}, cfg.faceBase || {}, p.face || {}));
        if (cfg.hat) cfg.hat(g, D, hx, hy, r, p);
      });
      if (cfg.armsFront) { cfg.armsFront(g, D, p, bob, sh, shx); }
      else {
        const armN = armOf(cfg.armN ? cfg.armN(p) : "down", -1);
        const hn = D.arm(g, -shx, sh, armN[0], armN[1], L, 0.03);
        if (cfg.propN) cfg.propN(g, D, hn, p);
        if (cfg.sleeve) sleeve(g, D, -shx, sh, armN[0], 0.24, cfg.sleeve.w0 || 0.11, cfg.sleeve.w1 || 0.14, cfg.sleeve.fill, cfg.sleeve.trim);
        D.hand(g, hn[0], hn[1], 0.034);
        if (cfg.afterHandN) cfg.afterHandN(g, D, hn, p);
      }
      if (cfg.after) cfg.after(g, D, p, bob);
      if (sit) {                                                      // the lap: knees under the clothes, a fold across them
        g.restore(); const ly = seatH + 0.02, col = cfg.lapCol || "#6d6878";
        for (const s of [-1, 1]) { const k = D.blobPts(s * 0.13, ly, 0.13, 0.075, 3 + s, 0.03, 32); shape(g, D, k, col, 0.014, 4 + s); }
        g.beginPath(); g.moveTo(-0.2, ly + 0.05); g.quadraticCurveTo(0, ly + 0.09, 0.2, ly + 0.05); D.stroke(g, 0.01, "rgba(20,10,30,0.5)");
      }
    };
  }

  // ---------- usher: staff, tabard with the court's arms, red cap, moustache ----------
  const TABARD = "#2a4fa8";
  const usherDef = {
    w: 1.4, h: 2.3, px: 1000,
    pose: { face: RT.EXPR.stern, call: 0, staff: true },
    draw: person({
      shx: 0.21, legX: 0.09,
      armF: (p) => (p.rope ? [0.6, 1.2] : [0.25, -0.35]),
      propF: (g, D, h, p) => {
        if (p.staff !== false && !p.rope) {                          // a tall staff with a gold knob, held upright
          g.beginPath(); g.moveTo(h[0] + 0.01, 0.0); g.lineTo(h[0] + 0.01, 1.95); D.stroke(g, 0.042); g.beginPath(); g.moveTo(h[0] + 0.01, 0.0); g.lineTo(h[0] + 0.01, 1.95); D.stroke(g, 0.024, "#7a4a26");
          g.beginPath(); g.arc(h[0] + 0.01, 1.98, 0.045, 0, TAU); g.fillStyle = GOLD; g.fill(); D.stroke(g, 0.01); g.beginPath(); g.arc(h[0] - 0.005, 1.995, 0.013, 0, TAU); g.fillStyle = "#fff6d0"; g.fill();
        }
        if (p.rope) { g.beginPath(); g.moveTo(h[0], h[1]); g.quadraticCurveTo(h[0] + 0.25, h[1] - 0.25, h[0] + 0.55, h[1] - 0.2); D.stroke(g, 0.03); D.stroke(g, 0.016, "#c9a46a"); }
      },
      body(g, D, p, bob) {
        // grey wool tunic, then a blue tabard panel with a gold tower, gold edge
        D.robe(g, 0, 0.42, 0.5, 0.64, 0.98 + bob, "#6d6878", { pattern: "speckle", patternOpts: { alpha: 0.35, density: 900 }, folds: [-0.6, 0.6], seed: 61 });
        const tb = [[-0.17, 1.36 + bob], [0.17, 1.36 + bob], [0.2, 0.5], [-0.2, 0.5]];
        D.tracePts(g, tb, true); g.fillStyle = TABARD; g.fill();
        g.save(); D.tracePts(g, tb, true); g.clip(); D.pattern(g, "damask", TABARD, [-0.22, 0.5, 0.22, 1.4 + bob], 7, { alpha: 0.35, step: 0.07 }); g.restore();
        D.tracePts(g, tb, true); D.stroke(g, 0.03); D.tracePts(g, tb, true); D.stroke(g, 0.014, GOLD);
        // the tower
        const tx = 0, ty = 0.95 + bob; g.beginPath(); g.rect(tx - 0.07, ty - 0.1, 0.14, 0.17); for (let i = 0; i < 3; i++) g.rect(tx - 0.07 + i * 0.055, ty + 0.07, 0.03, 0.035);
        g.fillStyle = GOLD; g.fill(); D.stroke(g, 0.008); g.beginPath(); g.rect(tx - 0.02, ty - 0.1, 0.04, 0.07); g.fillStyle = "#1a1830"; g.fill();
        D.band(g, [[-0.25, 0.86 + bob], [0.25, 0.86 + bob]], 0.035, "#4a2e1c");
      },
      head: { seed: 17 },
      hairBack(g, D, hx, hy, r) { for (const s of [-1, 1]) { const tp = D.blobPts(hx + s * 0.235, hy - 0.02, 0.06, 0.1, 5 + s, 0.08, 28); shape(g, D, tp, "#4a3326", 0.014, 4); } },
      faceBase: { stache: "bar" },
      hat(g, D, hx, hy, r) {                                         // a round red felt cap with a turned-up brim
        const b = hy + 0.15, cap = [].concat(D.quadPts([hx - 0.25, b], [hx - 0.24, b + 0.24], [hx, b + 0.25], 10), D.quadPts([hx, b + 0.25], [hx + 0.24, b + 0.24], [hx + 0.25, b], 10));
        shape(g, D, cap, "#b03024", 0.018, 8);
        g.beginPath(); g.moveTo(hx - 0.27, b); g.quadraticCurveTo(hx, b - 0.04, hx + 0.27, b); g.lineTo(hx + 0.27, b + 0.06); g.quadraticCurveTo(hx, b + 0.02, hx - 0.27, b + 0.06); g.closePath(); g.fillStyle = "#7e1f18"; g.fill(); D.stroke(g, 0.014);
      },
      armN: (p) => lerpA(ARMS.down(-1), [-1.05, 2.6], clamp01(p.call)),
      sleeve: { fill: "#6d6878" },
      afterHandN(g, D, h, p) { if (clamp01(p.call) > 0.5) for (const a of [0, 1, 2]) { g.beginPath(); g.arc(-0.12, 1.55, 0.14 + a * 0.07, 2.5, 3.8); D.stroke(g, 0.014); } },
    }),
  };

  // ---------- prosecutor: black gown, white bands, pointed beard, tall black cap, smug ----------
  const GOWNK = "#34303c";
  const prosecutorDef = {
    w: 1.4, h: 2.4, px: 1000,
    pose: { face: RT.EXPR.smugFold, fold: 1, point: 0 },
    draw: person({
      shx: 0.18, legX: 0.07, head: { seed: 23, y: 1.7 }, sh: 1.37,
      armF: (p) => (clamp01(p.fold) > 0.5 ? null : "down"),
      body(g, D, p, bob) {
        D.robe(g, 0, 0.3, 0.42, 0.66, 1.12 + bob, GOWNK, { pattern: "speckle", patternOpts: { alpha: 0.3, density: 700 }, folds: [-0.55, -0.15, 0.25, 0.6], seed: 71 });
        // white falling bands at the throat
        for (const s of [-1, 1]) { const b = [[s * 0.005, 1.42 + bob], [s * 0.06, 1.42 + bob], [s * 0.07, 1.27 + bob], [s * 0.012, 1.27 + bob]]; shape(g, D, b, "#f6f2ea", 0.008, 2); }
      },
      hairBack(g, D, hx, hy, r) { const hb = D.blobPts(hx, hy + 0.02, 0.28, 0.22, 3, 0.02, 40); shape(g, D, hb, "#1e1a1e", 0.016, 3); },
      beard(g, D, hx, hy, r) {                                       // a pointed goatee under the mouth, a thin curled moustache
        const b = [].concat(D.quadPts([hx - 0.1, hy - 0.19], [hx - 0.08, hy - 0.33], [hx + 0.01, hy - 0.46], 10), D.quadPts([hx + 0.01, hy - 0.46], [hx + 0.08, hy - 0.33], [hx + 0.1, hy - 0.19], 10),
          D.quadPts([hx + 0.1, hy - 0.19], [hx, hy - 0.23], [hx - 0.1, hy - 0.19], 6));
        shape(g, D, b, "#1e1a1e", 0.012, 5);
      },
      faceBase: { stache: "curl" },
      hat(g, D, hx, hy, r) {                                         // a tall rounded black cap
        const b = hy + 0.15, cap = [].concat(D.quadPts([hx - 0.24, b], [hx, b - 0.03], [hx + 0.24, b], 10), D.quadPts([hx + 0.24, b], [hx + 0.24, b + 0.28], [hx + 0.08, b + 0.33], 10),
          D.quadPts([hx + 0.08, b + 0.33], [hx, b + 0.34], [hx - 0.08, b + 0.33], 4), D.quadPts([hx - 0.08, b + 0.33], [hx - 0.24, b + 0.28], [hx - 0.24, b], 10));
        shape(g, D, cap, "#1d1a22", 0.018, 11);
        g.beginPath(); g.moveTo(hx - 0.14, b + 0.27); g.quadraticCurveTo(hx - 0.05, b + 0.31, hx + 0.03, b + 0.3); D.stroke(g, 0.012, "rgba(255,255,255,0.25)");
      },
      armsFront(g, D, p, bob, sh, shx) {
        const fold = clamp01(p.fold) > 0.5;
        if (fold) {                                                   // folded: a broad sleeved bar across the chest, hands at its ends
          for (const s of [-1, 1]) D.limb(g, [[s * shx, sh], [s * (shx + 0.06), 1.0 + bob]], 0.13, GOWNK);
          for (const s of [-1, 1]) D.limb(g, [[s * shx, sh - 0.02], [s * (shx + 0.06), 1.0 + bob]], 0.1, D.tone(GOWNK, 0.12));
          const bar = [].concat(D.quadPts([-0.3, 1.0 + bob], [0, 0.94 + bob], [0.3, 1.0 + bob], 10), D.quadPts([0.3, 1.0 + bob], [0.33, 1.07 + bob], [0.3, 1.13 + bob], 4),
            D.quadPts([0.3, 1.13 + bob], [0, 1.07 + bob], [-0.3, 1.13 + bob], 10), D.quadPts([-0.3, 1.13 + bob], [-0.33, 1.07 + bob], [-0.3, 1.0 + bob], 4));
          shape(g, D, bar, D.tone(GOWNK, 0.12), 0.016, 7);
          g.beginPath(); g.moveTo(-0.22, 1.11 + bob); g.quadraticCurveTo(0, 1.02 + bob, 0.22, 1.02 + bob); D.stroke(g, 0.012, "rgba(0,0,0,0.5)");
          D.hand(g, -0.2, 1.13 + bob, 0.034); D.hand(g, 0.21, 1.0 + bob, 0.034);
          return;
        }
        const pt = clamp01(p.point), an = lerpA(ARMS.down(-1), ARMS.point(-1), pt);
        const hn = D.arm(g, -shx, sh, an[0], an[1], 0.66, 0.03);
        sleeve(g, D, -shx, sh, an[0], 0.24, 0.11, 0.15, GOWNK, "#1d1a22"); D.hand(g, hn[0], hn[1], 0.034);
        sleeve(g, D, shx, sh, ARMS.down(1)[0], 0.24, 0.11, 0.15, GOWNK, "#1d1a22");
      },
    }),
  };

  // ---------- farmer: straw hat, smock, one bare stalk ----------
  const SMOCK = "#5d7fa8";
  // one stripped barley stalk held upright in the fist: a thick golden stem with knots, two torn leaves, a bitten top
  function stalk(g, D, x, y, sway) {
    const bx = x, by = y - 0.12, tx = x + 0.03 + sway * 0.03, ty = y + 0.66, cx = x + 0.035, cy = y + 0.3;
    const path = () => { g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(cx, cy, tx, ty); };
    path(); D.stroke(g, 0.05); path(); D.stroke(g, 0.03, "#e2b955"); 
    g.save(); g.translate(0.006, 0); path(); D.stroke(g, 0.009, "rgba(255,240,180,0.7)"); g.restore();
    const at = (k) => { const u = 1 - k; return [u * u * bx + 2 * u * k * cx + k * k * tx, u * u * by + 2 * u * k * cy + k * k * ty]; };
    for (const k of [0.38, 0.66]) { const q = at(k); g.beginPath(); g.moveTo(q[0] - 0.02, q[1]); g.lineTo(q[0] + 0.02, q[1] + 0.004); D.stroke(g, 0.012); }   // knots
    for (const [k, s] of [[0.5, -1], [0.78, 1]]) { const q = at(k); const lf = [[q[0], q[1]], [q[0] + s * 0.11, q[1] - 0.06], [q[0] + s * 0.13, q[1] - 0.1], [q[0] + s * 0.02, q[1] - 0.04]];
      D.tracePts(g, lf, true); g.fillStyle = "#c9a04a"; g.fill(); D.stroke(g, 0.008); }
    g.beginPath(); g.moveTo(tx - 0.025, ty - 0.005); g.lineTo(tx - 0.008, ty + 0.03); g.lineTo(tx + 0.004, ty + 0.008); g.lineTo(tx + 0.02, ty + 0.035); g.lineTo(tx + 0.026, ty); D.stroke(g, 0.012);   // the bitten top
  }
  const farmerDef = {
    w: 1.6, h: 2.6, px: 1000,
    pose: { face: RT.EXPR.trembling, stalk: 1, tremble: 0 },
    draw: person({
      legX: 0.085, shoeCol: "#4a3326",
      armF: () => "down",
      body(g, D, p, bob) {
        D.robe(g, 0, 0.5, 0.5, 0.7, 0.9 + bob, SMOCK, { pattern: "weave", patternOpts: { alpha: 0.4, step: 0.02 }, folds: [-0.6, -0.2, 0.2, 0.6], seed: 81 });
        g.beginPath(); for (let i = -3; i <= 3; i++) { g.moveTo(i * 0.035, 1.38 + bob); g.lineTo(i * 0.04, 1.22 + bob); } D.stroke(g, 0.007, "rgba(20,30,60,0.55)");     // smocking at the yoke
        D.band(g, [[-0.29, 0.85 + bob], [0, 0.83 + bob], [0.29, 0.85 + bob]], 0.03, "#7a5a32");
        g.beginPath(); g.moveTo(-0.1, 1.4 + bob); g.lineTo(0, 1.3 + bob); g.lineTo(0.1, 1.4 + bob); g.closePath(); g.fillStyle = "#e9e0cc"; g.fill(); D.stroke(g, 0.008);
      },
      head: { seed: 31 },
      hairBack(g, D, hx, hy, r) { for (const s of [-1, 1]) { const tp = D.blobPts(hx + s * 0.24, hy - 0.04, 0.05, 0.09, 2 + s, 0.1, 28); shape(g, D, tp, "#8a5a2c", 0.012, 2); } },
      beard(g, D, hx, hy, r) { const R = D.rng(3); for (let i = 0; i < 70; i++) { const a = Math.PI * (1.15 + R() * 0.7), rr = r * (0.55 + R() * 0.35); g.beginPath(); g.arc(hx + Math.cos(a) * rr, hy - 0.04 + Math.sin(a) * rr * 0.85, 0.0045, 0, TAU); g.fillStyle = "rgba(90,60,40,0.55)"; g.fill(); } },
      hat(g, D, hx, hy, r) {                                         // a wide straw hat with a woven crown and a frayed brim
        const b = hy + 0.13, brim = D.blobPts(hx, b, 0.5, 0.075, 4, 0.04, 56); shape(g, D, brim, "#d9b25a", 0.016, 4);
        const crown = [].concat(D.quadPts([hx - 0.22, b + 0.02], [hx - 0.24, b + 0.22], [hx, b + 0.24], 10), D.quadPts([hx, b + 0.24], [hx + 0.24, b + 0.22], [hx + 0.22, b + 0.02], 10));
        D.tracePts(g, crown, true); g.fillStyle = "#e3c06a"; g.fill();
        g.save(); D.tracePts(g, crown, true); g.clip(); for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(hx - 0.3, b + i * 0.03); g.quadraticCurveTo(hx, b + i * 0.03 + 0.02, hx + 0.3, b + i * 0.03); D.stroke(g, 0.005, "rgba(120,80,20,0.5)"); } g.restore();
        D.inkLine(g, crown, 0.016, { closed: true, seed: 2 });
        D.band(g, [[hx - 0.225, b + 0.05], [hx, b + 0.045], [hx + 0.225, b + 0.05]], 0.03, "#8a3a26");
        for (let i = 0; i < 9; i++) { const x = hx - 0.48 + i * 0.12; g.beginPath(); g.moveTo(x, b - 0.06); g.lineTo(x + 0.01, b - 0.09); D.stroke(g, 0.006, "#8a6a2a"); }
      },
      armN: (p) => lerpA(ARMS.down(-1), [-2.3, 2.9], clamp01(p.stalk)),      // the fist up beside the hat brim, inside the frame
      propN: (g, D, h, p) => { if (clamp01(p.stalk) > 0.3) stalk(g, D, h[0], h[1], p.tremble || 0); },
    }),
  };

  // ---------- priest: cassock, surplice, tonsure, the summons ----------
  const priestDef = {
    w: 1.5, h: 2.3, px: 1000,
    pose: { face: RT.EXPR.reading, unroll: 1 },
    draw: person({
      legs: false, head: { seed: 41 },
      armF: () => null, armsFront: () => {},
      body(g, D, p, bob) {
        D.robe(g, 0, 0.0, 0.48, 0.66, 1.4 + bob, "#26222c", { pattern: "speckle", patternOpts: { alpha: 0.25, density: 600 }, seed: 91 });
        // the white surplice over it, to the knee, with a pleated lace hem
        const sp = [].concat(D.quadPts([-0.23, 1.38 + bob], [-0.36, 0.9], [-0.42, 0.55], 10), [[0.42, 0.55]], D.quadPts([0.42, 0.55], [0.36, 0.9], [0.23, 1.38 + bob], 10));
        D.tracePts(g, sp, true); g.fillStyle = "#f2efe9"; g.fill();
        g.save(); D.tracePts(g, sp, true); g.clip(); for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(i * 0.03, 1.3 + bob); g.lineTo(i * 0.08, 0.55); D.stroke(g, 0.008, "rgba(120,120,150,0.4)"); }
        const gr = g.createLinearGradient(-0.42, 0, 0.42, 0); gr.addColorStop(0, "rgba(60,50,90,0.25)"); gr.addColorStop(0.3, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(60,50,90,0.35)"); g.fillStyle = gr; g.fillRect(-0.45, 0.5, 0.9, 1);
        g.restore(); D.inkLine(g, sp, 0.016, { closed: true, seed: 6 });
        for (let x = -0.4; x < 0.41; x += 0.05) { g.beginPath(); g.arc(x + 0.025, 0.55, 0.022, Math.PI, 0, true); g.fillStyle = "#f2efe9"; g.fill(); D.stroke(g, 0.007); }
        // a stole: two red bands down the front
        for (const s of [-1, 1]) D.band(g, [[s * 0.1, 1.38 + bob], [s * 0.12, 0.4]], 0.06, "#9a1f2a", { dots: 0.008, dotCol: "rgba(240,200,90,0.9)" });
      },
      hairBack(g, D, hx, hy, r) { const hb = D.blobPts(hx, hy - 0.02, 0.275, 0.22, 7, 0.03, 40); shape(g, D, hb, "#6a4a32", 0.016, 7); },
      hairFront(g, D, hx, hy, r) {                                   // tonsure: a ring of hair round a bare crown
        g.save(); const hp = D.blobPts(hx, hy, r * 1.04, r * 0.93, 41, 0.014, 48); D.tracePts(g, hp, true); g.clip();
        g.beginPath(); g.ellipse(hx, hy + 0.21, 0.3, 0.09, 0, 0, TAU); g.fillStyle = "#6a4a32"; g.fill(); D.stroke(g, 0.014);
        g.beginPath(); g.ellipse(hx, hy + 0.25, 0.17, 0.06, 0, 0, TAU); g.fillStyle = "#fdfcfa"; g.fill(); D.stroke(g, 0.012); g.restore();
      },
      after(g, D, p, bob) {                                          // the summons, held up in both hands, unrolling downward
        const u = clamp01(p.unroll), top = 1.15 + bob, len = 0.08 + 0.55 * u, x0 = -0.2, x1 = 0.2;
        g.beginPath(); g.rect(x0, top - len, x1 - x0, len); g.fillStyle = "#efe2c0"; g.fill(); D.stroke(g, 0.012);
        g.save(); g.beginPath(); g.rect(x0, top - len, x1 - x0, len); g.clip();
        for (let i = 0; i < 12; i++) { const y = top - 0.06 - i * 0.045; if (y < top - len + 0.03) break; g.beginPath(); g.moveTo(x0 + 0.04, y); for (let k = 1; k <= 8; k++) g.lineTo(x0 + 0.04 + k * 0.04, y + (k % 2 ? 0.006 : -0.004)); D.stroke(g, 0.007, "rgba(40,30,30,0.75)"); }
        if (u > 0.85) { g.beginPath(); g.arc(0.1, top - len + 0.06, 0.035, 0, TAU); g.fillStyle = "#b8202e"; g.fill(); D.stroke(g, 0.007); }
        g.restore();
        for (const y of [top, top - len]) { g.beginPath(); g.ellipse(0, y, 0.24, 0.025, 0, 0, TAU); g.fillStyle = "#d9c79c"; g.fill(); D.stroke(g, 0.01); }
        // both arms reach the ends of the top roller, in wide white surplice sleeves
        for (const s of [-1, 1]) {
          const sx = s * 0.19, sy = 1.32 + bob, el = [s * 0.31, 1.08 + bob], hd = [s * 0.25, top];
          D.limb(g, [[sx, sy], el, hd], 0.03);
          sleeve(g, D, sx, sy, Math.atan2(el[0] - sx, -(el[1] - sy)), 0.22, 0.13, 0.19, "#f2efe9", null);
          D.hand(g, hd[0], hd[1], 0.036);
        }
      },
    }),
  };

  // ---------- villagers a, b, c ----------
  const VILL = {
    a: { body: "#4f7a3a", hood: "#8e3b2a", build: 0.58, top: 1.0, legTop: 0.48, headY: 1.6, seed: 51 },
    b: { body: "#a8452f", coif: "#f3efe6", build: 0.5, top: 1.3, legTop: 0.3, headY: 1.58, seed: 52 },
    c: { body: "#c08a2c", cap: "#3e4a5e", build: 0.42, top: 1.15, legTop: 0.6, headY: 1.76, seed: 53 },
  };
  function villagerDef(v) {
    const V = VILL[v] || VILL.a;
    return {
      w: 1.6, h: 2.5, px: 1000,
      pose: { face: RT.EXPR.calm, arms: "down", bob: 0 },
      draw: person({
        sh: V.headY - 0.32, shx: V.build * 0.4, legTop: V.legTop, legX: v === "a" ? 0.1 : 0.07, head: { seed: V.seed, y: V.headY },
        armF: (p) => p.armF || p.arms || "down", armN: (p) => p.armN || p.arms || "down", lapCol: V.body,
        // a small wooden cross in the far hand (p.cross), a drum stick in the near hand (p.drum; p.hit brings it down)
        propF: (g, D, h, p) => { if (!p.cross) return; const cx = h[0], cy = h[1] + 0.05;
          for (const [w, c] of [[0.034, D.INK], [0.018, "#c79a52"]]) { g.beginPath(); g.moveTo(cx, cy - 0.06); g.lineTo(cx, cy + 0.2); g.moveTo(cx - 0.065, cy + 0.11); g.lineTo(cx + 0.065, cy + 0.11); D.stroke(g, w, c); } },
        afterHandN: (g, D, h, p) => { if (!p.drum) return; const a = -0.5 - 0.6 * clamp01(p.hit);
          for (const [w, c] of [[0.03, D.INK], [0.016, "#d9b07a"]]) { g.beginPath(); g.moveTo(h[0], h[1]); g.lineTo(h[0] + Math.sin(a) * 0.3, h[1] + Math.cos(a) * 0.3); D.stroke(g, w, c); } },
        body(g, D, p, bob) {
          const top = V.headY - 0.24 + bob, y0 = v === "b" ? 0.04 : V.legTop - 0.08;
          D.robe(g, 0, y0, V.build * 0.85, V.build * (v === "b" ? 1.35 : 1.15), top - y0, V.body, { pattern: v === "b" ? "stripes" : "weave", patternOpts: v === "b" ? { alpha: 0.25, step: 0.05 } : { alpha: 0.4, step: 0.02 }, folds: [-0.5, 0.0, 0.5], seed: V.seed });
          if (v === "b") { const ap = [[-0.2, 1.0 + bob], [0.2, 1.0 + bob], [0.26, 0.2], [-0.26, 0.2]]; shape(g, D, ap, "#ece4d2", 0.012, 3); D.band(g, [[-0.27, 1.0 + bob], [0.27, 1.0 + bob]], 0.03, "#ece4d2"); }
          else D.band(g, [[-V.build * 0.5, 0.88 + (v === "c" ? 0.1 : 0) + bob], [V.build * 0.5, 0.88 + (v === "c" ? 0.1 : 0) + bob]], 0.035, "#4a2e1c");
          if (v === "c") D.buttons(g, 0, top - 0.06, top - 0.3, 3, 0.014, "#c9a46a");
          if (p.drum) {                                               // a tabor slung at the near hip: red shell, cream heads, cords
            const dx = -0.26, dy = 0.86 + bob, rw = 0.2, rh = 0.15;
            g.beginPath(); g.rect(dx - rw, dy - rh, rw * 2, rh * 2); g.fillStyle = CRIMSON; g.fill(); D.stroke(g, 0.016);
            for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(dx - rw + i * rw * 0.5, dy - rh); g.lineTo(dx - rw + (i + 0.5) * rw * 0.5, dy + rh); D.stroke(g, 0.008, GOLD); }
            for (const yy of [dy + rh, dy - rh]) { g.beginPath(); g.ellipse(dx, yy, rw, 0.045, 0, 0, TAU); g.fillStyle = "#efe4c8"; g.fill(); D.stroke(g, 0.014); }
            g.beginPath(); g.moveTo(dx + rw * 0.6, dy + rh); g.lineTo(0.15, top - 0.02); D.stroke(g, 0.012, "#4a2e1c");
          }
          if (v === "a") {                                            // the hood's shoulder cape, dagged at the edge
            const cp = [].concat(D.quadPts([-0.2, top + 0.05], [-0.42, top - 0.05], [-0.38, top - 0.26], 8), D.quadPts([-0.38, top - 0.26], [0, top - 0.34], [0.38, top - 0.26], 10), D.quadPts([0.38, top - 0.26], [0.42, top - 0.05], [0.2, top + 0.05], 8));
            shape(g, D, cp, V.hood, 0.016, 8);
            for (let k = -3; k <= 3; k++) { g.beginPath(); g.arc(k * 0.1, top - 0.29 - Math.abs(k) * 0.01, 0.03, Math.PI, 0, true); D.stroke(g, 0.01, D.tone(V.hood, -0.35)); }
          }
        },
        hairBack: v === "c" ? (g, D, hx, hy) => { for (const s of [-1, 1]) { const tp = D.blobPts(hx + s * 0.24, hy - 0.03, 0.05, 0.09, 2 + s, 0.1, 28); shape(g, D, tp, "#2e2420", 0.012, 2); } } : null,
        hat(g, D, hx, hy, r, p) {
          if (v === "a") {                                            // a hood with a short shoulder cape and a tail
            const hd = [].concat(D.quadPts([hx - 0.31, hy - 0.15], [hx - 0.36, hy + 0.3], [hx, hy + 0.33], 12), D.quadPts([hx, hy + 0.33], [hx + 0.3, hy + 0.32], [hx + 0.42, hy + 0.12], 10),
              D.quadPts([hx + 0.42, hy + 0.12], [hx + 0.36, hy + 0.1], [hx + 0.3, hy - 0.15], 6), D.quadPts([hx + 0.3, hy - 0.15], [hx + 0.22, hy + 0.2], [hx, hy + 0.21], 10), D.quadPts([hx, hy + 0.21], [hx - 0.22, hy + 0.2], [hx - 0.31, hy - 0.15], 10));
            shape(g, D, hd, V.hood, 0.018, 4);
            g.save(); D.tracePts(g, hd, true); g.clip(); g.beginPath(); g.ellipse(hx, hy - 0.03, 0.25, 0.25, 0, 0, TAU); D.stroke(g, 0.035, D.tone(V.hood, -0.3)); g.restore();
          } else if (v === "b") {                                     // a white linen coif tied under the chin
            const cf = [].concat(D.quadPts([hx - 0.29, hy - 0.2], [hx - 0.34, hy + 0.32], [hx, hy + 0.31], 12), D.quadPts([hx, hy + 0.31], [hx + 0.34, hy + 0.32], [hx + 0.29, hy - 0.2], 12),
              D.quadPts([hx + 0.29, hy - 0.2], [hx + 0.24, hy + 0.12], [hx, hy + 0.17], 10), D.quadPts([hx, hy + 0.17], [hx - 0.24, hy + 0.12], [hx - 0.29, hy - 0.2], 10));
            shape(g, D, cf, V.coif, 0.016, 4);
            g.beginPath(); g.moveTo(hx - 0.2, hy + 0.24); g.quadraticCurveTo(hx, hy + 0.27, hx + 0.2, hy + 0.24); D.stroke(g, 0.008, "rgba(120,120,140,0.5)");
          } else {                                                    // a soft felt cap with a rolled brim
            const b = hy + 0.15, cap = [].concat(D.quadPts([hx - 0.23, b], [hx - 0.26, b + 0.2], [hx + 0.02, b + 0.22], 10), D.quadPts([hx + 0.02, b + 0.22], [hx + 0.3, b + 0.2], [hx + 0.25, b], 10));
            shape(g, D, cap, V.cap, 0.018, 6);
            g.beginPath(); g.moveTo(hx - 0.28, b - 0.01); g.quadraticCurveTo(hx, b - 0.05, hx + 0.29, b - 0.01); g.lineTo(hx + 0.28, b + 0.05); g.quadraticCurveTo(hx, b + 0.01, hx - 0.27, b + 0.05); g.closePath(); g.fillStyle = D.tone(V.cap, -0.25); g.fill(); D.stroke(g, 0.014);
          }
        },
      }),
    };
  }

  // ---------- cats ----------
  const CATS = [
    { fur: "#25212b", head: "#2c2733", stripe: null, eye: 0xd6ff5c, eyeCol: "#c9f04a" },
    { fur: "#45414d", head: "#4d4956", stripe: "#2a2730", eye: 0xffd84a, eyeCol: "#f2cf45" },
    { fur: "#5e3f2c", head: "#674632", stripe: "#3a2418", eye: 0xc8ff7a, eyeCol: "#bfe86a", torn: true },
  ];
  const CAT_EYE = { x: 0.068, y: 0.64, w: 0.085, h: 0.05 };
  function catDef(vi) {
    const C = CATS[vi % 3];
    return {
      w: 0.9, h: 1.0, px: 1200, lift: 0.03,
      glowEyes: [{ x: -CAT_EYE.x, y: CAT_EYE.y, w: CAT_EYE.w, h: CAT_EYE.h }, { x: CAT_EYE.x, y: CAT_EYE.y, w: CAT_EYE.w, h: CAT_EYE.h }], glowColor: C.eye,
      glowOf: (p) => (p.shine == null ? (p.eyes == null ? 1 : p.eyes) : p.shine) * (p.face === "whistle" ? 0 : 1),
      pose: { eyes: 1, look: [0, 0], face: "plain", tail: 0 },
      draw(g, p, D) {
        const tw = p.tail || 0;
        // tail curling round the front of the feet
        g.beginPath(); g.moveTo(0.16, 0.06); g.bezierCurveTo(0.34, 0.08, 0.3 + tw * 0.03, 0.3, 0.2 + tw * 0.05, 0.36); D.stroke(g, 0.07); D.stroke(g, 0.045, C.fur);
        // body: a sitting pear
        const body = [].concat(D.quadPts([-0.2, 0.02], [0, -0.01], [0.2, 0.02], 10), D.quadPts([0.2, 0.02], [0.26, 0.3], [0.1, 0.52], 12), D.quadPts([0.1, 0.52], [0, 0.56], [-0.1, 0.52], 6), D.quadPts([-0.1, 0.52], [-0.26, 0.3], [-0.2, 0.02], 12));
        D.tracePts(g, body, true); g.fillStyle = C.fur; g.fill();
        g.save(); D.tracePts(g, body, true); g.clip();
        if (C.stripe) for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-0.3, 0.12 + i * 0.08); g.quadraticCurveTo(-0.12, 0.15 + i * 0.08, -0.08, 0.1 + i * 0.08); g.moveTo(0.3, 0.12 + i * 0.08); g.quadraticCurveTo(0.12, 0.15 + i * 0.08, 0.08, 0.1 + i * 0.08); D.stroke(g, 0.022, C.stripe); }
        const bg = g.createLinearGradient(-0.25, 0, 0.25, 0); bg.addColorStop(0, "rgba(255,255,255,0.08)"); bg.addColorStop(0.6, "rgba(0,0,0,0)"); bg.addColorStop(1, "rgba(0,0,0,0.3)"); g.fillStyle = bg; g.fillRect(-0.3, 0, 0.6, 0.6);
        g.restore(); D.inkLine(g, body, 0.016, { closed: true, seed: 3 });
        // front legs and paws
        for (const s of [-1, 1]) { D.limb(g, [[s * 0.06, 0.32], [s * 0.065, 0.05]], 0.05, D.tone(C.fur, -0.2)); g.beginPath(); g.ellipse(s * 0.07, 0.035, 0.045, 0.03, 0, 0, TAU); g.fillStyle = C.fur; g.fill(); D.stroke(g, 0.009); }
        g.beginPath(); g.moveTo(0.2 + tw * 0.05, 0.36); g.quadraticCurveTo(0.12, 0.38, 0.08, 0.32); D.stroke(g, 0.07); D.stroke(g, 0.045, C.fur);
        // head and ears
        const hx = 0, hy = 0.66, r = 0.17;
        for (const s of [-1, 1]) {
          const tip = C.torn && s > 0 ? [hx + s * 0.15, hy + 0.2] : [hx + s * 0.17, hy + 0.25];
          const ear = [[hx + s * 0.05, hy + 0.12], tip, [hx + s * 0.17, hy + 0.06]]; shape(g, D, ear, C.head, 0.014, 2 + s);
          g.beginPath(); g.moveTo(hx + s * 0.08, hy + 0.12); g.lineTo(hx + s * 0.15, hy + (C.torn && s > 0 ? 0.17 : 0.2)); g.lineTo(hx + s * 0.15, hy + 0.09); g.closePath(); g.fillStyle = "#7a4a5a"; g.fill();
        }
        const hp = D.blobPts(hx, hy, r * 1.12, r * 0.9, 6, 0.02, 48); shape(g, D, hp, C.head, 0.016, 6);
        if (C.stripe) { g.save(); D.tracePts(g, hp, true); g.clip(); for (const dx of [-0.04, 0, 0.04]) { g.beginPath(); g.moveTo(hx + dx, hy + 0.16); g.lineTo(hx + dx * 0.6, hy + 0.08); D.stroke(g, 0.016, C.stripe); } g.restore(); }
        // eyes: almonds with slit pupils (drawn; at night the glow meshes sit on top), or shut lines
        const open = p.eyes == null ? 1 : p.eyes, lk = p.look || [0, 0], wh = p.face === "whistle";
        for (const s of [-1, 1]) {
          const ex = hx + s * CAT_EYE.x, ey = CAT_EYE.y;
          if (open < 0.15) { g.beginPath(); g.moveTo(ex - 0.035, ey); g.quadraticCurveTo(ex, ey - 0.015, ex + 0.035, ey); D.stroke(g, 0.009, "#0e0b10"); continue; }
          g.beginPath(); g.moveTo(ex - 0.042, ey); g.quadraticCurveTo(ex, ey + 0.035 * open, ex + 0.042, ey); g.quadraticCurveTo(ex, ey - 0.035 * open, ex - 0.042, ey); g.closePath();
          g.fillStyle = C.eyeCol; g.fill(); D.stroke(g, 0.007, "#0e0b10");
          const px = ex + (wh ? 0.022 : lk[0] * 0.02), py = ey + (wh ? 0.01 : lk[1] * 0.01);
          g.beginPath(); g.ellipse(px, py, 0.008, 0.022 * open, 0, 0, TAU); g.fillStyle = "#0e0b10"; g.fill();
        }
        // nose, mouth, whiskers (pale, so they read on dark fur)
        g.beginPath(); g.moveTo(hx - 0.018, hy - 0.035); g.lineTo(hx + 0.018, hy - 0.035); g.lineTo(hx, hy - 0.055); g.closePath(); g.fillStyle = "#c97a8a"; g.fill(); D.stroke(g, 0.005);
        if (wh) { g.beginPath(); g.ellipse(hx + 0.03, hy - 0.085, 0.012, 0.014, 0, 0, TAU); g.fillStyle = "#1a0e12"; g.fill(); D.stroke(g, 0.005, "#d9d2e0");
          for (const k of [0, 1]) { g.beginPath(); g.moveTo(hx + 0.08 + k * 0.05, hy - 0.06 + k * 0.05); g.quadraticCurveTo(hx + 0.1 + k * 0.05, hy - 0.03 + k * 0.05, hx + 0.09 + k * 0.05, hy - 0.0 + k * 0.05); D.stroke(g, 0.008, "#ffffff"); } }
        else if (p.face === "grin") { g.beginPath(); g.moveTo(hx - 0.06, hy - 0.07); g.quadraticCurveTo(hx, hy - 0.12, hx + 0.06, hy - 0.07); D.stroke(g, 0.008, "#d9d2e0"); }
        else { g.beginPath(); g.moveTo(hx - 0.035, hy - 0.075); g.quadraticCurveTo(hx - 0.017, hy - 0.09, hx, hy - 0.06); g.quadraticCurveTo(hx + 0.017, hy - 0.09, hx + 0.035, hy - 0.075); D.stroke(g, 0.006, "#d9d2e0"); }
        for (const s of [-1, 1]) for (const a of [-0.1, 0.1]) { g.beginPath(); g.moveTo(hx + s * 0.06, hy - 0.06); g.lineTo(hx + s * 0.22, hy - 0.06 + a * 0.4); D.stroke(g, 0.004, "rgba(225,220,235,0.8)"); }
      },
    };
  }
  // the big face under the lamp: fills a frame, licks its lips
  const catFaceDef = {
    w: 2.6, h: 2.2, px: 700, lift: 0.1, glowMax: 1.2,
    glowEyes: [{ x: -0.42, y: 1.18, w: 0.5, h: 0.3 }, { x: 0.42, y: 1.18, w: 0.5, h: 0.3 }], glowColor: 0xd6ff5c,
    glowOf: (p) => (p.shine == null ? (p.eyes == null ? 1 : p.eyes) : p.shine) * (1 - 0.6 * clamp01(p.squint)),
    pose: { lick: 0, eyes: 1, squint: 0.3, look: [0, 0] },
    draw(g, p, D) {
      const F = "#25212b", hx = 0, hy = 1.0;
      for (const s of [-1, 1]) { const ear = [[hx + s * 0.35, hy + 0.65], [hx + s * 1.0, hy + 1.15], [hx + s * 0.95, hy + 0.35]]; shape(g, D, ear, F, 0.03, 4 + s);
        g.beginPath(); g.moveTo(hx + s * 0.48, hy + 0.65); g.lineTo(hx + s * 0.88, hy + 0.98); g.lineTo(hx + s * 0.85, hy + 0.48); g.closePath(); g.fillStyle = "#5a3442"; g.fill(); }
      const hp = D.blobPts(hx, hy, 1.15, 0.88, 9, 0.02, 72); shape(g, D, hp, F, 0.03, 9);
      g.save(); D.tracePts(g, hp, true); g.clip();
      const rg = g.createRadialGradient(hx - 0.3, hy + 0.3, 0.1, hx, hy, 1.2); rg.addColorStop(0, "rgba(120,110,150,0.18)"); rg.addColorStop(1, "rgba(0,0,0,0.25)"); g.fillStyle = rg; g.fillRect(-1.3, 0, 2.6, 2.2);
      for (let i = 0; i < 40; i++) { const R = D.rng(i + 3); const x = (R() - 0.5) * 2.1, y = hy + (R() - 0.5) * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.04, y + 0.08); D.stroke(g, 0.008, "rgba(90,85,110,0.35)"); }
      g.restore();
      // eyes: big almonds, upper lids lowered by squint (the glow meshes sit on top at night)
      const sq = clamp01(p.squint), lk = p.look || [0, 0];
      for (const s of [-1, 1]) {
        const ex = hx + s * 0.42, ey = hy + 0.18;
        g.beginPath(); g.moveTo(ex - 0.25, ey); g.quadraticCurveTo(ex, ey + 0.3, ex + 0.25, ey); g.quadraticCurveTo(ex, ey - 0.3, ex - 0.25, ey); g.closePath(); g.fillStyle = "#c9f04a"; g.fill(); D.stroke(g, 0.02, "#0e0b10");
        g.beginPath(); g.ellipse(ex + lk[0] * 0.08, ey, 0.04, 0.13, 0, 0, TAU); g.fillStyle = "#0e0b10"; g.fill();
        if (sq > 0) { g.beginPath(); g.moveTo(ex - 0.3, ey + 0.32); g.lineTo(ex + 0.3, ey + 0.32); g.lineTo(ex + 0.3, ey + 0.15 - 0.15 * sq + s * 0.04 * sq); g.lineTo(ex - 0.3, ey + 0.15 - 0.15 * sq - s * 0.04 * sq); g.closePath(); g.fillStyle = F; g.fill();
          g.beginPath(); g.moveTo(ex - 0.27, ey + 0.15 - 0.15 * sq - s * 0.04 * sq); g.lineTo(ex + 0.27, ey + 0.15 - 0.15 * sq + s * 0.04 * sq); D.stroke(g, 0.024, "#0e0b10"); }
      }
      // muzzle, nose, mouth; the tongue sweeps across the upper lip
      for (const s of [-1, 1]) { const m = D.blobPts(hx + s * 0.13, hy - 0.32, 0.17, 0.12, 3 + s, 0.03, 32); shape(g, D, m, "#36303e", 0.012, 3 + s); }
      g.beginPath(); g.moveTo(hx - 0.09, hy - 0.12); g.lineTo(hx + 0.09, hy - 0.12); g.lineTo(hx, hy - 0.22); g.closePath(); g.fillStyle = "#c97a8a"; g.fill(); D.stroke(g, 0.016);
      g.beginPath(); g.moveTo(hx, hy - 0.22); g.lineTo(hx, hy - 0.3); D.stroke(g, 0.016, "#d9d2e0");
      g.beginPath(); g.moveTo(hx - 0.22, hy - 0.36); g.quadraticCurveTo(hx - 0.1, hy - 0.42, hx, hy - 0.3); g.quadraticCurveTo(hx + 0.1, hy - 0.42, hx + 0.22, hy - 0.36); D.stroke(g, 0.018, "#d9d2e0");
      const lk2 = clamp01(p.lick);
      if (lk2 > 0.02 && lk2 < 0.98) {
        const tx = hx - 0.22 + 0.44 * lk2, ty = hy - 0.31;
        g.beginPath(); g.moveTo(tx - 0.08, ty - 0.03); g.quadraticCurveTo(tx - 0.1, ty + 0.1, tx, ty + 0.11); g.quadraticCurveTo(tx + 0.1, ty + 0.1, tx + 0.08, ty - 0.03); g.closePath(); g.fillStyle = "#e0707e"; g.fill(); D.stroke(g, 0.014);
        g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx, ty + 0.08); D.stroke(g, 0.008, "rgba(120,30,50,0.6)");
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx + s * 0.16, hy - 0.37); g.lineTo(hx + s * 0.14, hy - 0.45); g.lineTo(hx + s * 0.12, hy - 0.37); g.closePath(); g.fillStyle = "#fbf8f2"; g.fill(); D.stroke(g, 0.008); }
      }
      for (const s of [-1, 1]) for (const a of [-0.12, 0.0, 0.12]) { g.beginPath(); g.moveTo(hx + s * 0.28, hy - 0.3 + a * 0.4); g.quadraticCurveTo(hx + s * 0.7, hy - 0.28 + a * 1.2, hx + s * 1.15, hy - 0.3 + a * 2.2); D.stroke(g, 0.01, "rgba(225,220,235,0.85)"); }
    },
  };

  // ---------- noble (1540): feathered flat cap, slashed doublet, gold chain, points ----------
  const DOUB = "#2e5e4e";
  const nobleDef = {
    w: 1.7, h: 2.6, px: 1000,
    pose: { face: RT.EXPR.accuse, point: 1 },
    draw: person({
      legX: 0.08, legTop: 0.62, head: { seed: 61 }, shoeCol: "#1e1a22",
      armF: () => "hips",
      body(g, D, p, bob) {
        // short puffed trunk hose, then the doublet with a skirt
        const tr = D.blobPts(0, 0.62, 0.24, 0.13, 4, 0.04, 40); shape(g, D, tr, "#6a1f2a", 0.016, 4);
        g.save(); D.tracePts(g, tr, true); g.clip(); for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 0.06, 0.75); g.lineTo(i * 0.065, 0.49); D.stroke(g, 0.018, "#e8c860"); } g.restore(); D.inkLine(g, tr, 0.016, { closed: true, seed: 4 });
        D.robe(g, 0, 0.6, 0.5, 0.62, 0.78 + bob, DOUB, { pattern: "damask", patternOpts: { alpha: 0.4, step: 0.07 }, folds: [-0.5, 0.5], seed: 101 });
        D.buttons(g, 0, 1.3 + bob, 0.82 + bob, 6, 0.014, GOLD);
        D.band(g, [[-0.27, 0.86 + bob], [0, 0.84 + bob], [0.27, 0.86 + bob]], 0.03, "#1e1a22", { dots: 0.008 });
        g.beginPath(); g.moveTo(-0.22, 1.32 + bob); g.quadraticCurveTo(0, 0.98 + bob, 0.22, 1.32 + bob); D.stroke(g, 0.03); g.beginPath(); g.moveTo(-0.22, 1.32 + bob); g.quadraticCurveTo(0, 0.98 + bob, 0.22, 1.32 + bob); D.stroke(g, 0.016, GOLD);
        g.beginPath(); g.arc(0, 1.07 + bob, 0.035, 0, TAU); g.fillStyle = GOLD; g.fill(); D.stroke(g, 0.009); g.beginPath(); g.arc(0, 1.07 + bob, 0.014, 0, TAU); g.fillStyle = "#b8202e"; g.fill();
        // a small white ruff at the neck
        D.fur(g, [[-0.12, 1.38 + bob], [0, 1.36 + bob], [0.12, 1.38 + bob]], 0.05, "#f6f2ea", 2);
      },
      hairBack(g, D, hx, hy, r) { const hb = D.blobPts(hx, hy - 0.02, 0.27, 0.2, 3, 0.02, 40); shape(g, D, hb, "#3a2618", 0.016, 3); },
      beard(g, D, hx, hy, r) { const b = [].concat(D.quadPts([hx - 0.2, hy - 0.08], [hx - 0.16, hy - 0.3], [hx, hy - 0.32], 10), D.quadPts([hx, hy - 0.32], [hx + 0.16, hy - 0.3], [hx + 0.2, hy - 0.08], 10), D.quadPts([hx + 0.2, hy - 0.08], [hx, hy - 0.2], [hx - 0.2, hy - 0.08], 10)); shape(g, D, b, "#3a2618", 0.014, 6); },
      faceBase: { stache: "bar" },
      hat(g, D, hx, hy, r) {                                         // a flat black cap worn tilted, a gold badge and a white plume
        g.save(); g.translate(hx, hy + 0.2); g.rotate(0.12);
        const cap = D.blobPts(0.02, 0.03, 0.36, 0.08, 5, 0.03, 48); shape(g, D, cap, "#1d1a22", 0.018, 5);
        const pl = [].concat(D.quadPts([0.15, 0.05], [0.42, 0.25], [0.55, 0.12], 12), D.quadPts([0.55, 0.12], [0.38, 0.12], [0.18, 0.02], 10));
        shape(g, D, pl, "#f6f2ea", 0.012, 2); g.beginPath(); g.moveTo(0.17, 0.04); g.quadraticCurveTo(0.38, 0.17, 0.53, 0.12); D.stroke(g, 0.006, "rgba(120,120,140,0.6)");
        g.beginPath(); g.arc(0.14, 0.05, 0.03, 0, TAU); g.fillStyle = GOLD; g.fill(); D.stroke(g, 0.008);
        g.restore();
      },
      armN: (p) => lerpA(ARMS.down(-1), ARMS.point(-1), clamp01(p.point)),
      sleeve: { fill: DOUB, trim: GOLD, w0: 0.14, w1: 0.17 },
      afterHandN(g, D, h, p) { if (clamp01(p.point) > 0.6) { g.beginPath(); g.moveTo(h[0], h[1]); g.lineTo(h[0] - 0.075, h[1] + 0.012); D.stroke(g, 0.022, SF.LIMB); } },
    }),
  };

  // ---------- aliases the story may use: arm 0..1 (each character's main gesture), mouthOpen (talking), scroll, whistle ----------
  const ARM_ALIAS = { lawyer: "armOut", lawyerOld: "stamp", usher: "call", prosecutor: "point", farmer: "stalk", noble: "point", priest: "unroll", pig: "trotters" };
  function alias(name, p) {
    if (p.arm != null) {
      const k = ARM_ALIAS[name];
      if (k && p[k] == null) p[k] = p.arm;
      if (name === "prosecutor" && p.fold == null) p.fold = p.arm > 0.5 ? 0 : 1;
      if (/^villager/.test(name) && p.arms == null) p.arms = p.arm > 0.5 ? "cheer" : "down";
    }
    if (p.scroll != null && p.unroll == null) p.unroll = p.scroll;
    if (p.whistle) { p.face = "whistle"; if (p.shine == null) p.shine = 0; }
    if (p.mouthOpen != null && typeof p.face === "object" && p.face) {
      p.face = Object.assign({}, p.face, p.mouthOpen > 0.02 ? { mouth: "open", mouthOpen: p.mouthOpen } : {});
    }
    return p;
  }

  // ---------- the lawyer's arm alone (view 19: the frame is the open book) ----------
  // RT.cast.arm(stage, pos, { parent }): a flat card that LIES on the page: the ball hand (one finger) at pos, the arm
  // and the blue sleeve run away from the camera side (toward -z, the lawyer's side of the desk). The story slides it in
  // by moving card.group.position. Pose: { tap: 0..1 } (the finger presses).
  const armDef = {
    w: 0.36, h: 1.0, px: 900, lift: 0.1,
    pose: { tap: 0 },
    draw(g, p, D) {
      const hy = 0.075 - 0.01 * clamp01(p.tap);
      D.limb(g, [[0.0, 0.62], [0.0, hy + 0.03]], 0.05);                                   // forearm: a dark tube
      g.beginPath(); g.moveTo(0, hy); g.lineTo(0, 0.012); D.stroke(g, 0.028, SF.LIMB);   // one finger, down onto the line
      D.hand(g, 0, hy + 0.02, 0.06);
      const sl = [[-0.075, 1.0], [0.075, 1.0], [0.13, 0.56], [-0.13, 0.56]]; shape(g, D, sl, BLUE, 0.016, 5);
      g.save(); D.tracePts(g, sl, true); g.clip(); D.pattern(g, "damask", BLUE, [-0.15, 0.55, 0.15, 1.0], 21, { alpha: 0.32, step: 0.085 }); g.restore();
      D.fur(g, [[-0.14, 0.57], [0, 0.55], [0.14, 0.57]], 0.07, FUR, 5);
    },
  };

  // ---------- a dance: a pose as a pure function of time (see LEGS AND DANCING at the top) ----------
  const mod = (a, n) => ((a % n) + n) % n;
  function beatAt(t, beats) {                    // the beat count at t: word i's start is beat i (0.3 s beats before the first)
    if (!beats || !beats.length) return 0;
    if (t <= beats[0].at) return (t - beats[0].at) / 0.3;
    let lo = 0, hi = beats.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (beats[m].at <= t) lo = m; else hi = m - 1; }
    const a = beats[lo].at, b = lo + 1 < beats.length ? beats[lo + 1].at : a + 0.3;
    return lo + Math.min(1, (t - a) / Math.max(0.05, b - a));
  }
  function dance(t, o) {
    o = o || {}; const amp = o.amp == null ? 1 : clamp01(o.amp), spin = o.spin == null ? 8 : o.spin;
    const b = (o.beats ? beatAt(t, o.beats) : t * (o.bps || 1.6)) + (o.ph || 0), i = Math.floor(b), f = b - i;
    const side = mod(i, 2) ? -1 : 1, hop = Math.sin(Math.PI * f), kind = mod(i, 4);          // kick, kick, cross, cross back
    const w = Math.PI * b, k1 = 0.5 + 0.5 * Math.sin(w), k2 = 0.5 + 0.5 * Math.sin(w + 2.2);
    const pose = {
      armF: [lerp(0.6, 2.7, k1 * amp), lerp(0.7, 3.1, k1 * amp)], armN: [-lerp(0.6, 2.7, k2 * amp), -lerp(0.7, 3.1, k2 * amp)],
      kick: kind < 2 ? amp * 0.9 * side * hop : 0, step: kind >= 2 ? amp * 0.8 * side * hop : 0,
      bob: amp * 0.06 * hop, tilt: amp * 0.14 * Math.sin(w * 0.5 + 0.7),
      turn: spin > 0 && amp > 0.5 && mod(i, spin) === spin - 1 ? f : 0,
    };
    if (o.face) pose.face = o.face;
    return pose;
  }

  // ---------- makers ----------
  function make(def, defaults, extra) {
    return function (stage, pos, opts) {
      opts = opts || {}; pos = pos || [0, 0, 0];
      const base = Object.assign({}, def.pose, defaults ? defaults(opts) : {}, opts.pose || {});
      const card = SF.card(stage, Object.assign({ pos, parent: opts.parent, scale: opts.scale, posLocal: opts.posLocal }, extra ? extra(pos, opts) : {}, def, { pose: base }));
      const raw = card.set; card.set = (pose) => raw(alias(def.name, Object.assign({}, base, pose || {}))); card.set(base);
      card.name = opts.name || def.name; return card;
    };
  }
  const ground = (cs) => (pos) => ({ groundY: pos[1], contact: cs });
  // the lawyer carried on two villagers' shoulders (view 26). One group at the WORLD pos (in opts.parent): villager "a" on the
  // left, "b" on the right, the lawyer astride their shoulders a little in front. c.set({ face, left, right, bob, lawyer })
  // (left / right: the carriers' faces; lawyer: extra lawyer pose; bob: a bounce 0..1 the story drives). c.hat() = WORLD
  // position of the top of his bonnet (for the small rat). c.group.visible hides all three.
  function carried(stage, pos, opts) {
    opts = opts || {}; pos = pos || [0, 0, 0];
    const G = new THREE.Group(), parent = opts.parent || stage.scene; parent.add(G); parent.updateMatrixWorld(true);
    const w = new THREE.Vector3(pos[0], pos[1], pos[2]); if (parent !== stage.scene) parent.worldToLocal(w); G.position.copy(w);
    const sub = (fn, p, o) => fn(stage, p, Object.assign({ parent: G, posLocal: true }, o));
    const left = sub(RT.cast.villager, [-0.5, 0, -0.06], { variant: opts.left || "a" }), right = sub(RT.cast.villager, [0.5, 0, -0.06], { variant: opts.right || "b" });
    const lawyer = sub(RT.cast.lawyer, [0, 0.8, 0.12], { pose: { carried: 1, armOut: 0, wide: 1, roll: false, face: RT.EXPR.happy } });
    if (lawyer.contact) lawyer.contact.visible = false;
    const c = { group: G, left, right, lawyer,
      set(p) { p = p || {}; const b = p.bob || 0;
        lawyer.group.position.y = 0.8 + 0.06 * Math.abs(Math.sin(b * Math.PI));
        lawyer.set(Object.assign({ face: p.face || RT.EXPR.happy }, p.lawyer || {}));
        left.set({ face: p.left || RT.EXPR.laugh, armF: [1.9, -1.6], armN: "cheer", bob: 0.02 * Math.sin(b * Math.PI * 2) });
        right.set({ face: p.right || RT.EXPR.happy, armN: [-1.9, 1.6], armF: "cheer", bob: 0.02 * Math.sin(b * Math.PI * 2 + 1.5) }); },
      hat() { G.updateMatrixWorld(true); const v = new THREE.Vector3(0.02, lawyer.group.position.y + 2.0, 0.14); return G.localToWorld(v).toArray(); },
    };
    c.set({}); return c;
  }
  const ratOpts = (o) => { const d = {}; for (const k of ["asleep", "fat", "specs", "ear", "bundle"]) if (o[k] != null) d[k] = o[k]; if (o.asleep && o.fat == null) d.fat = 1; return d; };
  const villagers = { a: villagerDef("a"), b: villagerDef("b"), c: villagerDef("c") };
  const cats = [catDef(0), catDef(1), catDef(2)];
  const defs = { lawyer: lawyerDef, lawyerOld: lawyerOldDef, judge: judgeDef, rat: ratDef, pig: pigDef, usher: usherDef, prosecutor: prosecutorDef,
    farmer: farmerDef, priest: priestDef, villagerA: villagers.a, villagerB: villagers.b, villagerC: villagers.c, cat0: cats[0], cat1: cats[1], cat2: cats[2], catFace: catFaceDef, noble: nobleDef };
  defs.arm = armDef; for (const k in defs) defs[k].name = k;

  return {
    lawyer: make(lawyerDef, null, ground([0.8, 0.3])),
    lawyerOld: make(lawyerOldDef, null, ground([0.85, 0.32])),
    judge: make(judgeDef, null, () => ({ contact: false })),
    rat: function (stage, pos, opts) {
      opts = opts || {}; const o2 = Object.assign({}, opts); if (opts.small && !opts.scale) o2.scale = 0.32;
      return make(ratDef, ratOpts, (p, o) => ({ groundY: p[1], contact: o.asleep ? [0.6, 0.16] : [0.26, 0.11] }))(stage, pos, o2);
    },
    pig: make(pigDef, null, ground([0.75, 0.28])),
    usher: make(usherDef, null, ground([0.7, 0.28])),
    prosecutor: make(prosecutorDef, null, ground([0.7, 0.28])),
    farmer: make(farmerDef, null, ground([0.7, 0.28])),
    priest: make(priestDef, null, () => ({ contact: false })),
    villager: function (stage, pos, opts) { opts = opts || {}; return make(villagers[opts.variant] || villagers.a, null, ground([0.75, 0.28]))(stage, pos, opts); },
    // variant 0 | 1 | 2, or "a" | "b" | "c"
    cat: function (stage, pos, opts) { opts = opts || {}; const v = opts.variant, i = typeof v === "string" ? Math.max(0, "abc".indexOf(v)) : (v || 0) % 3;
      return make(cats[i], null, ground([0.5, 0.2]))(stage, pos, opts); },
    carried,
    arm: function (stage, pos, opts) {
      const c = make(armDef, null, () => ({ contact: false, face: "fixed" }))(stage, pos, opts || {});
      c.mesh.rotation.x = -Math.PI / 2; c.mesh.castShadow = true; return c;
    },
    catFace: make(catFaceDef, null, () => ({ contact: false })),
    noble: make(nobleDef, null, ground([0.75, 0.28])),
    defs, EXPR: RT.EXPR, ARMS, dance, beatAt,
  };
})();
