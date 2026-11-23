/* mila.cjs — WorldFrame prototype character: "MILA" (original design, no reference copying).
 *
 * A young courier with a bold teal ponytail, mustard jacket over a plum top and teal boots.
 * Distinct silhouette: the high swept ponytail + the cropped jacket line read at any size.
 *
 * The rig reuses SF.draw (D.*) primitives so she belongs to the measured family look
 * (ink ~4.8% head width, dark tube arms 0.03, ball hands, near-white head), but draws
 * herself with full control so we can support a real SIDE view:
 *
 *   pose.turn    0..1  built-in spin squeeze (3/4 and mirror) exactly like the family rig
 *   pose.profile 0..1  a blend to a true side view. 1 = full profile, facing pose.faceDir
 *   pose.faceDir +1 faces screen right, -1 faces screen left (profile mode)
 *   otherwise the family pose language: bob, tilt, kick, step, sit, seatH, armF, armN,
 *   face (an expression object; RT.MILA.EXPR has ready ones), shoeCol, talk
 *
 * Makers:
 *   RT.cast.mila(stage, pos, opts)   -> card standing on the ground, contact shadow [0.78, 0.3]
 *   RT.MILA.walk(t, o)               -> walking pose, o = { bps, amp, ph, face }
 *   RT.MILA.run(t, o)                -> running pose (faster, leaning, bent arms)
 *   RT.MILA.talk(t, o)               -> talking pose (mouth flaps, near hand gestures)
 *   RT.MILA.idle(t, o)               -> standing, breathing bob
 *   RT.MILA.expression(name)         -> an expression object (blends nothing, swaps like the family)
 */
window.RT = window.RT || {};
(function () {
  "use strict";
  const TAU = Math.PI * 2;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpA = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const alpha = (v) => Math.max(0, Math.min(1, v));

  // ---------------- palette (original colours, chosen against the research spec: rich + saturated) ----------------
  const HAIR = "#25b5a3";      // teal
  const HAIR_D = "#178a7c";    // teal shade
  const HAIR_L = "#4fd6c4";    // teal light
  const JACKET = "#d9a13a";    // mustard
  const JACKET_D = "#b57f22";  // mustard shade
  const TOP = "#7a3b6e";       // plum
  const PANTS = "#e8e4da";     // off-white trousers
  const BOOTS = "#1d8d80";     // teal boots (echo of the hair, ties the design together)
  const SKIN = "#f8ddd1";
  const LIMB = "#2b2027";

  // named arm poses, same convention as the family rig: [upper, fore] radians, 0 = straight down
  const ARMS = {
    down: (s) => [s * 0.22, s * 0.08], out: (s) => [s * 1.45, s * 1.6], point: (s) => [s * 1.72, s * 1.85],
    up: (s) => [s * 2.85, s * 3.02], wide: (s) => [s * 2.0, s * 2.35], cheer: (s) => [s * 2.45, s * 2.95],
    carry: (s) => [s * 2.7, -s * 2.84], hips: (s) => [s * 0.75, -s * 0.55], shrug: (s) => [s * 0.5, s * 1.75],
    front: (s) => [s * 0.2, -s * 1.0],
  };
  const armOf = (name, s) => (Array.isArray(name) ? name : (ARMS[name] || ARMS.down)(s));

  function shape(g, D, pts, fill, w, seed) {
    D.tracePts(g, pts, true); g.fillStyle = fill; g.fill();
    D.inkLine(g, pts, w == null ? 0.016 : w, { closed: true, seed: seed == null ? 3 : seed });
  }
  function about(g, px, py, rot, fn) {
    if (!rot) { fn(); return; }
    g.save(); g.translate(px, py); g.rotate(rot); g.translate(-px, -py); fn(); g.restore();
  }

  // ---------------- legs (dark limbs + white trouser cuffs + teal boots) ----------------
  function legs(g, D, o) {
    const top = o.top == null ? 0.52 : o.top, x = o.x || 0.085, w = 0.05, sz = 0.15;
    const k = Math.max(-1, Math.min(1, o.kick || 0)), st = Math.max(-1, Math.min(1, o.step || 0));
    const shoe = (fx, fy, dir) => {
      D.limb(g, [[fx, fy + 0.03], [fx, fy - 0.02]], 0.052, PANTS);          // white cuff
      g.beginPath(); g.ellipse(fx + dir * 0.05, fy - 0.045, 0.085, 0.045, 0, 0, TAU);
      g.fillStyle = o.shoeCol || BOOTS; g.fill(); D.stroke(g, 0.011);
      g.beginPath(); g.ellipse(fx + dir * 0.075, fy - 0.06, 0.03, 0.012, 0, 0, TAU);
      g.fillStyle = "rgba(255,255,255,0.3)"; g.fill();
    };
    if (!k && !st) {   // standing: both feet planted
      D.limb(g, [[-x, top], [-x - 0.01, 0.09]], w);
      D.limb(g, [[x, top], [x + 0.02, 0.09]], w);
      shoe(-x - 0.02, 0.06, -1); shoe(x + 0.03, 0.06, 1); return;
    }
    // stride: near foot and far foot swing apart, the lifted one comes up
    const kl = k < 0 ? -k : 0, kr = k > 0 ? k : 0, span = 2 * x + 0.12;
    const nx = -x - 0.01 - 0.22 * kl + span * Math.max(0, st), ny = 0.09 + 0.18 * kl;
    const fx = x + 0.02 + 0.22 * kr - span * Math.max(0, -st), fy = 0.09 + 0.18 * kr;
    const near = () => { D.limb(g, [[-x, top], [(-x + nx) / 2 - 0.05 * kl, top * 0.5 + 0.06 * kl], [nx, ny]], w); shoe(nx, ny - 0.02, -1); };
    const far = () => { D.limb(g, [[x, top], [(x + fx) / 2 + 0.05 * kr, top * 0.5 + 0.06 * kr], [fx, fy]], w); shoe(fx, fy - 0.02, 1); };
    if (st > 0) { far(); near(); } else { near(); far(); }
  }

  // ---------------- body: plum top, cropped mustard jacket with lapels, white trousers hips ----------------
  function body(g, D, p, sh, k, shx) {
    const bob = p.bob || 0;
    // trousers to the waist
    shape(g, D, [[-0.14 + 0.03 * k, 0.56], [0.14 - 0.03 * k, 0.56], [0.16, 0.34], [-0.16, 0.34]], PANTS, 0.014, 6);
    // plum top
    D.robe(g, 0, 0.34, 0.34 - 0.1 * k, 0.6, 0.94 + bob, TOP, { folds: [-0.4, 0.4], seed: 9 });
    // jacket: two open front panels with a turned collar, hem above the hips
    for (const s of [-1, 1]) {
      const jk = [[s * 0.05, 1.34 + bob], [s * (0.26 - 0.1 * k), 1.3 + bob], [s * (0.3 - 0.12 * k), 0.62], [s * 0.13, 0.58]];
      shape(g, D, jk, s < 0 ? JACKET : JACKET_D, 0.017, 11 + s);
    }
    // collar triangle behind the neck
    const col = [[-0.12, 1.36 + bob], [0, 1.22 + bob], [0.12, 1.36 + bob]];
    shape(g, D, col, JACKET_D, 0.012, 4);
    // jacket buttons on the near panel
    g.beginPath(); g.arc(-0.08, 0.94 + bob, 0.014, 0, TAU); g.fillStyle = "#f4e8c8"; g.fill(); D.stroke(g, 0.005);
  }

  // ---------------- head + hair ----------------
  function head(g, D, p, k) {
    const dir = (p.faceDir == null ? 1 : Math.sign(p.faceDir)) * (1 - k) + k * (p.faceDir == null ? 1 : Math.sign(p.faceDir));
    const fd = p.faceDir == null ? 1 : Math.sign(p.faceDir) || 1;       // profile facing: +1 screen right
    const bob = p.bob || 0, H = { y: 1.66, r: 0.25 };
    const hy = H.y + bob, r = H.r;
    const hxo = fd * r * 0.16 * k;                                      // the head shifts a touch toward the facing side

    about(g, 0, hy - r, p.tilt || 0, () => {
      g.translate(hxo, 0);
      const hx = 0;
      // ---- hair BACK: the big swept ponytail (her silhouette signature) ----
      const sw = (p.hairSwing || 0) - fd * k * 0.5;                     // it swings behind when she turns profile
      const px0 = hx - fd * r * 0.55 + sw * r * 0.5, py0 = hy + r * 0.25;
      // tail chain: three teardrops getting smaller, curving down-behind
      const tail = [].concat(
        D.quadPts([hx + fd * 0.02, py0 + r * 0.5], [px0 - fd * 0.25, py0 + r * 0.75], [px0 - fd * 0.05, py0 + r * 0.1], 8),
        D.quadPts([px0 - fd * 0.05, py0 + r * 0.1], [px0 - fd * 0.55, py0 - r * 0.25], [px0 - fd * 0.3, py0 - r * 0.75], 8)
      );
      shape(g, D, tail, HAIR_D, 0.017, 7);
      const band0 = D.blobPts(px0 + fd * 0.25, py0 + r * 0.25, 0.045, 0.035, 12, 0.05, 24);
      shape(g, D, band0, "#f4e8c8", 0.009, 2);                          // the tie
      // ---- skull ----
      D.head(g, hx, hy, r, { seed: 21, fill: SKIN });
      // ---- hair FRONT: swept fringe, a loose strand over one eye ----
      const fr = [].concat(
        D.quadPts([hx - r * 1.02, hy + r * 0.25], [hx - r * 0.75, hy + r * 1.05], [hx + r * 0.25, hy + r * 1.0], 10),
        D.quadPts([hx + r * 0.25, hy + r * 1.0], [hx + r * 0.95, hy + r * 0.8], [hx + r * 1.02, hy + r * 0.3], 10),
        D.quadPts([hx + r * 1.02, hy + r * 0.3], [hx + r * 0.25, hy + r * 0.55], [hx - r * 1.02, hy + r * 0.25], 8)
      );
      shape(g, D, fr, HAIR, 0.018, 5);
      // the fringe under-edge (a clean silhouette line, reads at small sizes)
      g.beginPath(); g.moveTo(hx - r * 0.85, hy + r * 0.42);
      g.bezierCurveTo(hx - r * 0.25, hy + r * 0.75, hx + r * 0.25, hy + r * 0.25, hx + r * 0.8, hy + r * 0.5);
      D.stroke(g, 0.013, HAIR_D);
      // ---- face ----
      const f = Object.assign({ look: [0, 0] }, p.face || {});
      if (k > 0.25) {
        // profile face: features slide to the facing edge, a nose bump grows, mouth sits forward
        f.look = [fd * (1.4 + k), f.look[1] || 0];
        const nx = hx + fd * r * (0.86 + 0.14 * k), ny = hy - r * 0.25;
        const nose = [[hx + fd * r * 0.25, ny + r * 0.1], [nx, ny - r * 0.25], [hx + fd * r * 0.25, ny - r * 0.25]];
        shape(g, D, nose, SKIN, 0.011, 15);
      }
      D.face(g, hx + fd * r * 0.1 * k, hy - 0.04, r, f);
    });
  }

  // ---------------- the rig ----------------
  function milaRig(g, p, D) {
    const turn = p.turn ? Math.cos(TAU * p.turn) : 1;
    if (turn !== 1) { g.save(); g.scale(Math.sign(turn || 1) * Math.max(0.06, Math.abs(turn)), 1); }
    rig(g, p, D);
    if (turn !== 1) g.restore();

    function rig(g, p, D) {
      const k = clamp01(p.profile || 0);
      const bob = p.bob || 0, sh = 1.32 + bob, shx = (0.19 - 0.09 * k), L = 0.64;
      const sFlow = (p.armF == null && p.armN == null && !p.kick && !p.step) ? 0 : 1;
      const sit = clamp01(p.sit) > 0.5, seatH = p.seatH == null ? 0.46 : p.seatH;
      if (sit) { for (const s of [-1, 1]) { D.limb(g, [[s * 0.13, seatH], [s * 0.14, 0.09]], 0.05); g.beginPath(); g.ellipse(s * 0.18, 0.045, 0.08, 0.04, 0, 0, TAU); g.fillStyle = p.shoeCol || BOOTS; g.fill(); D.stroke(g, 0.01); } g.save(); g.translate(0, seatH - 0.52 + 0.04); }
      else legs(g, D, { top: 0.52, x: 0.085, kick: p.kick, step: p.step, shoeCol: p.shoeCol });
      const walkAmp = p.kick || p.step ? 1 : 0;
      // far arm behind the body
      const armF = p.armF == null ? (walkAmp ? downSwing(p, 1) : "down") : p.armF;
      if (!p.profile || k < 0.6) {                                       // in profile the far arm hides behind the body
        const af = armOf(armF, 1), hf = D.arm(g, shx, sh, af[0], af[1], L, 0.03);
        if (p.propF) p.propF(g, D, hf, p);
        sleeveMinus(g, D, shx, sh, af[0], JACKET_D);
        D.hand(g, hf[0], hf[1], 0.034);
      }
      body(g, D, p, sh, k, shx);
      if (k < 0.55) head(g, D, p, k); else headProfileFull(g, D, p, k);
      // near arm in front
      const armN = p.armN == null ? (walkAmp ? downSwing(p, -1) : "down") : p.armN;
      const an = armOf(armN, -1), hn = D.arm(g, -shx, sh, an[0], an[1], L, 0.03);
      if (p.propN) p.propN(g, D, hn, p);
      sleeveMinus(g, D, -shx, sh, an[0], JACKET);
      D.hand(g, hn[0], hn[1], 0.034);
      if (sit) g.restore();
    }
  }

  // walk swing: the arms pendulum against the legs
  function downSwing(p, s) {
    const ph = p.stepPhase || 0;
    const w = Math.sin(ph + (s < 0 ? 0 : Math.PI));
    return [s * (0.22 + 0.42 * w), s * (0.08 + 0.3 * w)];
  }

  function sleeveMinus(g, D, sx, sy, a1, col) {
    const ex = sx + Math.sin(a1) * 0.32, ey = sy - Math.cos(a1) * 0.32;
    D.limb(g, [[sx, sy], [ex, ey]], 0.085, col);
  }

  // full profile: the head is drawn side-on (nose wedge in front, single readable eye cluster, tail behind)
  function headProfileFull(g, D, p, k) {
    const fd = p.faceDir == null ? 1 : Math.sign(p.faceDir) || 1;
    const bob = p.bob || 0, hy = 1.66 + bob, r = 0.25, hx = fd * r * 0.1;
    about(g, 0, hy - r, p.tilt || 0, () => {
      g.translate(hx, 0);
      // tail fully behind
      const px0 = -fd * r * 1.05, py0 = hy + r * 0.2;
      const tail = [].concat(
        D.quadPts([-fd * r * 0.2, py0 + r * 0.25], [px0 - fd * 0.2, py0 + r * 0.25 + r * 0.3], [px0, py0], 8),
        D.quadPts([px0, py0], [px0 - fd * 0.5, py0 - r * 0.5], [px0 - fd * 0.2, py0 - r * 1.0], 8)
      );
      shape(g, D, tail, HAIR_D, 0.017, 7);
      // skull + profile hair mass (smooth dome from brow over crown to nape)
      D.head(g, 0, hy, r, { seed: 21, fill: SKIN });
      const dome = [].concat(
        D.quadPts([fd * r * 0.75, hy + r * 0.25], [fd * r * 0.55, hy + r * 1.15], [0, hy + r * 1.05], 10),
        D.quadPts([0, hy + r * 1.05], [-fd * r * 1.0, hy + r * 0.75], [-fd * r * 0.95, hy - r * 0.25], 10),
        D.quadPts([-fd * r * 0.95, hy - r * 0.25], [-fd * r * 0.4, hy + r * 0.1], [0, hy + r * 0.25], 8)
      );
      shape(g, D, dome, HAIR, 0.018, 5);
      // nose
      const nose = [[fd * r * 0.3, hy - r * 0.25], [fd * r * 1.02, hy - r * 0.42], [fd * r * 0.3, hy - r * 0.5]];
      shape(g, D, nose, SKIN, 0.011, 15);
      // one eye near the facing edge, brow above it
      const fx = fd * r * 0.42, fy = hy + r * 0.05;
      const f = Object.assign({ mouth: "line", mouthW: 0.7 }, p.face || {});
      g.save(); g.globalAlpha = 1;
      g.beginPath(); g.ellipse(fx, fy, r * 0.13, r * 0.09, 0, 0, TAU); g.fillStyle = "#221a22"; g.fill();
      g.beginPath(); g.arc(fx - fd * r * 0.03, fy + r * 0.25, Math.max(1, 0.012 * 0.25), 0, TAU); g.fillStyle = "rgba(255,255,255,0.85)"; g.fill();
      const by = fy + r * 0.3;
      g.beginPath(); g.moveTo(fx - fd * r * 0.12, by); g.lineTo(fx + fd * r * 0.25, by - r * 0.05); D.stroke(g, r * 0.075);
      g.restore();
      // mouth set forward
      g.beginPath(); g.arc(fx + fd * r * 0.25, hy - r * 0.28, r * 0.05 * (1 + (f.mouthOpen || 0)), 0, TAU);
      g.fillStyle = (f.mouthOpen || 0) > 0.25 ? "#5a2430" : "#221a22"; g.fill(); D.stroke(g, 0.008);
      // fringe strand
      g.beginPath(); g.moveTo(fd * r * 0.25, hy + r * 0.25); g.quadraticCurveTo(0, hy + r * 0.25, -fd * r * 0.5, hy + r * 0.05); D.stroke(g, 0.012, HAIR_D);
    });
  }

  // ---------------- the card def ----------------
  const mila = {
    w: 1.5, h: 2.25, px: 1000,
    pose: { face: null, hairSwing: 0 },
    draw: milaRig,
  };

  // ---------------- pose makers ----------------
  function walk(t, o) {
    o = o || {}; const bps = o.bps || 2.1, amp = clamp01(o.amp == null ? 1 : o.amp), ph = o.ph || 0;
    const b = t * bps + ph, w = TAU * b;
    return {
      kick: 0.5 * amp * Math.sin(w), step: 0.5 * amp * Math.cos(w), bob: 0.03 * amp * Math.abs(Math.sin(w)),
      tilt: 0.03 * amp * Math.sin(w * 0.5), stepPhase: w, face: o.face, talk: o.talk,
    };
  }
  function run(t, o) {
    o = o || {}; const bps = o.bps || 3.6, amp = clamp01(o.amp == null ? 1 : o.amp), ph = o.ph || 0;
    const b = t * bps + ph, w = TAU * b;
    const p = walk(t, { bps, amp, ph, face: o.face, talk: o.talk });
    p.kick = 0.9 * amp * Math.sin(w); p.step = 0.35 * amp * Math.cos(w);
    p.bob = 0.055 * amp * Math.abs(Math.sin(w)); p.tilt = 0.16 * amp;
    p.armN = lerpA(ARMS.down(-1), [1.15, 1.7], 0.5 + 0.5 * Math.sin(w));      // bent pumping arms
    p.armF = lerpA(ARMS.down(1), [1.15, 1.7], 0.5 + 0.5 * Math.sin(w + Math.PI));
    return p;
  }
  function talk(t, o) {
    o = o || {}; const flap = Math.abs(Math.sin(t * (o.hz || 9)));
    return {
      face: Object.assign({ mouth: "open", mouthOpen: 0.15 + 0.5 * flap }, o.face || {}),
      armN: lerpA(ARMS.down(-1), ARMS.shrug(-1), 0.35 + 0.3 * Math.sin(t * 2.4)),
      bob: 0.012 * Math.sin(t * 1.8), faceMouth: flap,
    };
  }
  function idle(t, o) {
    o = o || {};
    return { bob: 0.012 * Math.sin(t * (o.hz || 1.7)), face: o.face, armN: o.armN, armF: o.armF };
  }

  const EXPR = {
    joy:     { browL: -0.7, browR: -0.7, browY: 0.07, eye: 1.1, mouth: "open", mouthOpen: 0.75, mouthW: 1.2, mouthTilt: -0.1 },
    gasp:    { browL: -1.0, browR: -1.0, browY: 0.1, eyeStyle: "wide", eye: 1.25, mouth: "open", mouthOpen: 1.0, mouthW: 0.7 },
    sly:     { browL: 0.3, browR: -0.4, eyeStyle: "lid", lid: 0.5, lidTilt: 0.5, eye: 1, mouth: "smirk", mouthW: 1.15 },
    worried: { browL: -0.9, browR: -0.9, browY: 0.09, eye: 1.15, look: [0.5, 0.25], mouth: "wavy", mouthW: 0.85 },
    laugh:   { browL: -0.5, browR: -0.5, eyeStyle: "happy", eye: 1, mouth: "open", mouthOpen: 0.8, mouthW: 1.3 },
    focused: { browL: 0.5, browR: 0.3, browY: -0.03, eyeStyle: "lid", lid: 0.3, eye: 1.05, look: [0.6, -0.2], mouth: "line", mouthW: 0.7 },
    blink:   { eyeStyle: "shut", eye: 0.1, mouth: "line", mouthW: 0.9 },
  };

  // ---------------- registration ----------------
  window.RT.MILA = Object.assign({ def: mila, walk, run, talk, idle, ARMS, EXPR }, {});
  if (window.make && window.ground) { /* not used; make lives inside cast closures */ }
  // the card factory follows exactly the family `make(def, null, ground(cs))` contract
  RT.cast = RT.cast || {};
  RT.cast.mila = (function () {
    // a local copy of the family make() (the proven factory), bound to this def
    return function (stage, pos, opts) {
      opts = opts || {}; pos = pos || [0, 0, 0];
      const base = Object.assign({}, mila.pose, opts.pose || {});
      const card = window.SF.card(stage, Object.assign({ pos, parent: opts.parent, scale: opts.scale, posLocal: opts.posLocal }, mila, { pose: base, groundY: pos[1], contact: [0.95, 0.36] }));
      card.name = opts.name || "mila"; return card;
    };
  })();
})();
