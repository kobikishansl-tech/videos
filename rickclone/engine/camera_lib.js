/* camera_lib.js — Petrichor Engine R1: the 13 typed camera moves (blueprint M4).
 *
 *   const move = RT.CAMERA_LIB.build("ESTAB", params);   // returns f(t) -> {pos:[x,y,z], look:[x,y,z], fov}
 *   const cam  = move(t);                                 // pure function of t; no state
 *
 * All moves are parameterised over a TARGET band so that scenes record intent ("DOLLY onto the
 * door, 2.5 .. 1.2 m, fov 40"), not numeric plumbing. Coordinates are the scene's LOCAL metres:
 * the host maps anchor names -> world coords (set.spots) before calling; you may pass pos /
 * look directly or {anchor:<string>} resolved through a lookup given in params.resolve.
 *
 * Conventions: y up, metres; fov in degrees (vertical); every move keeps the subject inside the
 * measured composition band (subj_x 0.38..0.62) when the target is near the horizontal centre.
 * Easings: easeInOut (default), easeOut for PUSH, linear for TRACK (constant follow).
 */
window.RT = window.RT || {};
RT.CAMERA_LIB = (function () {
  "use strict";
  var easeInOut = function (u) { return u * u * (3 - 2 * u); };
  var easeOut = function (u) { return 1 - (1 - u) * (1 - u); };
  var lerp = function (a, b, u) { return a + (b - a) * u; };
  var lerp3 = function (A, B, u) { return [lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)]; };
  var num = function (v, d) { return (typeof v === "number") ? v : d; };
  var backOf = function (p) {   // unit backing direction: where the camera stands relative to the
                                // target. Default +z (toward the lens side of the street/room).
    var b = p.back || [0, 0, 1], L = Math.hypot(b[0], b[1], b[2]) || 1;
    return [b[0] / L, b[1] / L, b[2] / L];
  };
  var standAt = function (p, t, d, h) { // feet-of-the-camera position at backing distance d
    var b = backOf(p), tg = p.target || p.look || [0, 1.1, 0];
    return [tg[0] + b[0] * d, h, tg[2] + b[2] * d];
  };

  function span(t, t0, t1, kind) {
    var u = (t1 - t0) < 1e-6 ? 0 : (t - t0) / (t1 - t0);
    u = Math.max(0, Math.min(1, u));
    if (kind === "out") u = easeOut(u);
    else if (kind !== "lin") u = easeInOut(u);
    return u;
  }
  function dir(from, to, d) { // unit-ish horizontal direction from->to scaled by d
    var dx = to[0] - from[0], dz = to[2] - from[2], L = Math.hypot(dx, dz) || 1;
    return [to[0] + dx / L * d, to[1], to[2] + dz / L * d];
  }

  var BUILDS = {
    ESTAB: function (p) { // wide composed hold (2..7.8 s measured band); slight settle drift
      var a = p.pos, la = p.look, d = num(p.drift, 0.12), fov = num(p.fov, 44);
      return function (t) {
        var u = span(t, p.t0, p.t1);
        return { pos: lerp3(a, [a[0] + d * 0.25, a[1], a[2] + d], u),
                 look: la, fov: fov };
      };
    },
    MED: function (p) {
      return staticish(p, num(p.dist, 2.6), num(p.fov, 42));
    },
    CLOSEUP: function (p) {
      return staticish(p, num(p.dist, 1.4), num(p.fov, 36));
    },
    LOWA: function (p) { // camera below the subject's eye line
      return staticish(p, num(p.dist, 2.2), num(p.fov, 40), num(p.below, 0.35));
    },
    HIGHA: function (p) { // camera above; the portrait min-distance rule is waived for this move
      return staticish(p, num(p.dist, 5.5), num(p.fov, 46), -num(p.above, 2.2));
    },
    TRACK: function (p) { // follow a target anchor whose world pos the host supplies per t (p.follow(t))
      var d = num(p.dist, 2.8), fov = num(p.fov, 42), h = num(p.height, 1.4);
      return function (t) {
        var tp = (p.follow && p.follow(t)) || p.target || [0, 1.1, 0];
        var dirv = p.back || 3.2;
        return { pos: [tp[0], tp[1] + h - 1.1, tp[2] + dirv], look: tp, fov: fov, _d: d };
      };
    },
    DOLLY: function (p) { // distance ramp onto the target
      var fov = num(p.fov, 42), h = num(p.height, 1.4);
      return function (t) {
        var u = span(t, p.t0, p.t1);
        var d = lerp(num(p.from, 3.0), num(p.to, 1.6), u);
        return { pos: standAt(p, t, d, h), look: p.target, fov: fov };
      };
    },
    ORBIT: function (p) { // arc around the target
      var fov = num(p.fov, 42), h = num(p.height, 1.45);
      return function (t) {
        var u = span(t, p.t0, p.t1);
        var ang = lerp(num(p.a0, -0.9), num(p.a1, 0.9), u);
        var r = num(p.radius, 2.6);
        return { pos: [p.target[0] + Math.sin(ang) * r, h, p.target[2] + Math.cos(ang) * r],
                 look: p.target, fov: fov };
      };
    },
    CRANE: function (p) { // rise + retreat (or the reverse), act-transition move
      var fov = num(p.fov, 46);
      return function (t) {
        var u = span(t, p.t0, p.t1);
        var h = lerp(num(p.fromY, 1.5), num(p.toY, 5.5), u);
        var d = lerp(num(p.fromD, 3.0), num(p.toD, 9.0), u);
        return { pos: standAt(p, t, d, h), look: p.target, fov: fov };
      };
    },
    OTS: function (p) { // over-the-shoulder: pos behind p.shoulder, look at the other subject
      var fov = num(p.fov, 38);
      return staticish(p, num(p.dist, 1.9), fov, 0, p.shoulder);
    },
    PUSH: function (p) { // fast 1-2 s punch-in (hook montage)
      var fov = num(p.fov, 40), h = num(p.height, 1.4);
      return function (t) {
        var u = span(t, p.t0, p.t1, "out");
        var d = lerp(num(p.from, 3.2), num(p.to, 1.9), u);
        return { pos: standAt(p, t, d, h), look: p.target, fov: fov };
      };
    },
    PULL: function (p) {
      var q = {}; for (var k in p) q[k] = p[k];
      var f = q.from, to = q.to; q.from = to; q.to = f;
      return BUILDS.PUSH(q);
    },
    WHIP: function (p) { // 4-8 frame blur-as-cut marker: the HOST renders the whip smear;
                         // the camera itself lands instantly (whips happen AS cuts, never inside)
      return function () { return { pos: p.pos, look: p.look, fov: num(p.fov, 42), whip: true }; };
    },
    FROZEN: function (p) { // near-hold: alive by construction (measured floor: change>=0.066/s)
      var base = staticish(p, num(p.dist, 2.4), num(p.fov, 42));
      var amp = num(p.wobble, 0.008), w = num(p.hz, 2.2);
      return function (t) {
        var c = base(t);
        c.pos[1] += Math.sin(t * w * Math.PI * 2) * amp;
        return c;
      };
    },
    POSTCARD: function (p) { // the ending frame: composed, near-still, distance settle only
      var fovv = num(p.fov0, 46);
      return function (t) {
        var u = span(t, p.t0, p.t1);
        var d = lerp(num(p.dist0, 6.0), num(p.dist, 5.2), u);
        return { pos: standAt(p, t, d, num(p.height, 3.5)), look: p.look || p.target, fov: fovv };
      };
    },
  };
  function staticish(p, dist, fov, dy, shoulder) {
    var h = num(p.height, 1.4);
    return function (t) {
      var u = span(t, p.t0, p.t1);
      var tgt = p.target;
      var pp = shoulder
        ? [shoulder[0] * 0.6, (shoulder[1] || 1.5) - (dy || 0), shoulder[2] + dist]
        : dir(tgt, p.look || tgt, dist + num(p.settle, 0) * u);
      return { pos: pp, look: p.look || tgt, fov: fov,
               _dy: dy, _near: (p.nearMin != null ? p.nearMin : 4.0) };
    };
  }
  return {
    MOVES: Object.keys(BUILDS),
    build: function (move, params) {
      if (!BUILDS[move]) throw new Error("camera_lib: unknown move " + move);
      return BUILDS[move](params || {});
    },
    _internals: { easeInOut: easeInOut, lerp3: lerp3, dir: dir },
  };
})();
