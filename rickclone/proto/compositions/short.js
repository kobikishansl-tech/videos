(() => { try {
  const D = RT.DURATION, $ = (s) => document.querySelector(s);
  const W = (x, y, z) => [x + 900, y, z];                    // the market set's world offset (set origin x = 900)
  const stage = SF.stage($("#stage"), { width: 1080, height: 1920, scale: 1, fov: 44, near: 0.1, far: 200 });
  const market = RT.sets.market(stage); stage.addSet(market);
  const S = market.spots;                                    // world coords
  const mila = RT.cast.mila(stage, S.enter, { parent: market.group });

  // ---------- Mila's path through the world, a pure function of t (seconds) ----------
  const P = { enter: S.enter.slice(), south: S.south.slice(), center: S.center.slice(), crates: S.crates.slice() };
  function seg(t, t0, t1) { return Math.max(0, Math.min(1, (t - t0) / (t1 - t0))); }
  function easeIO(u) { return u * u * (3 - 2 * u); }
  function pathAt(t) {
    const pos = P.enter.slice();
    if (t <= 2.2) return pos;
    const u1 = easeIO(seg(t, 2.2, 4.6)); pos[0] += (P.south[0] - P.enter[0]) * u1; pos[2] += (P.south[2] - P.enter[2]) * u1;
    const u2 = easeIO(seg(t, 4.6, 9.2));
    const cz = P.south[2] + (P.crates[2] - P.south[2]) * u2;
    pos[0] += (P.center[0] - P.south[0]) * Math.min(1, u2 * 1.4) + Math.sin(u2 * Math.PI) * 0.5 * Math.sin(u2 * Math.PI * 1.2);
    pos[2] = cz;
    return pos;
  }

  // ---------- staging: pose per frame ----------
  stage.onFrame.push((t, st) => {
    const pos = pathAt(t);
    mila.group.position.set(pos[0], pos[1], pos[2]);
    let pose;
    if (t < 2.2) {                                                                // 0-2.2: at the edge, breathing, then a step in
      pose = RT.MILA.idle(t, { face: null });
    } else if (t < 9.2) {                                                         // 2.2-9.2: the walk
      pose = RT.MILA.walk(t, { bps: 2.2 });
    } else if (t < 12.6) {                                                        // 9.2-12.6: rummaging in the crates
      const f = seg(t, 12.2, 12.6);
      pose = {
        profile: 0.45, faceDir: -1, kick: 0, step: 0,
        bob: 0.025 * Math.abs(Math.sin(t * 3.1)) * (1 - f) - f * 0.05,
        tilt: 0.1 * (1 - f) - f * 0.12,
        armN: [0.5 + 0.45 * Math.sin(t * 4.2), -1.25 - 0.2 * Math.sin(t * 4.2)],
        armF: [-0.5, -0.4],
        face: f > 0.5 ? RT.MILA.EXPR.gasp : RT.MILA.EXPR.focused,
        propN: null,
      };
    } else {                                                                      // 12.6-15: finds it, turns to camera, holds it up
      const turnK = seg(t, 12.9, 13.9);
      pose = {
        profile: 0.45 * (1 - turnK), armN: [-0.5 - 1.1 * turnK, -1.1 - 1.7 * turnK], armF: [-0.5, -0.4],
        bob: 0.015 * Math.sin(t * 1.8), tilt: -0.06 * turnK,
        face: turnK > 0.4 ? RT.MILA.EXPR.joy : RT.MILA.EXPR.gasp,
        propN: function (g, D, h, p) {                                            // the found thing: a small golden bundle
          g.save(); g.translate(h[0], h[1] + 0.03);
          g.beginPath(); g.ellipse(0, 0, 0.075, 0.05, -0.4, 0, TAU); g.fillStyle = "#e8b23a"; g.fill(); D.stroke(g, 0.01);
          g.beginPath(); g.moveTo(-0.03, 0.02); g.quadraticCurveTo(0, 0.045, 0.033, 0.01); D.stroke(g, 0.008, "#a4791f");
          g.restore();
        },
      };
    }
    mila.set(pose);
  });

  // ---------- camera: SF.cam stations; targets come from RT.CAMERA_LIB builds ----------
  const CL = RT.CAMERA_LIB;
  const her = (t) => pathAt(t);
  const keys = [];
  // A — wide establishing (0-3.0): stationary composed hold with slow settle drift (ESTAB build)
  const A = CL.build("ESTAB", { pos: W(2.0, 3.1, 14.5), look: W(-0.2, 1.7, -7), fov: 44, t0: 0, t1: 3.0 });
  keys.push({ t: 0, pos: A(0).pos, look: A(0).look, fov: 44, focus: 23, set: "market", ease: "push" });
  keys.push({ t: 3.0, pos: A(3).pos, look: A(3).look, ease: "push" });
  // B — medium on the entering walk (3.0-6.0): sideway drift following her
  var b0 = her(3.0);
  keys.push({ t: 3.0, pos: [b0[0] + 2.25, 1.62, b0[2] - 1.7], look: [b0[0], 1.08, b0[2]], fov: 42, ease: "cut", focus: 4.0 });
  for (const tt of [4.4, 6.0]) { var b = her(tt); keys.push({ t: tt, pos: [b[0] + 2.15, 1.56, b[2] - 1.6], look: [b[0], 1.08, b[2]], fov: 42, ease: "push" }); }
  // E — tracking (6.0-9.4): the follow, sampled every 0.4 s into push keys (SF.cam interpolates linearly)
  for (let tt = 6.0; tt <= 9.4001; tt += 0.4) { var e = her(tt);
    keys.push({ t: parseFloat(tt.toFixed(2)), pos: [e[0] + 0.9, 1.62, e[2] + 3.5], look: [e[0], 1.02, e[2]], fov: 42, ease: tt === 6.0 ? "cut" : "push", focus: 3.4 }); }
  // C — interaction two-shot (9.4-12.4), a slow dolly-in
  const cl0 = her(9.4);
  keys.push({ t: 9.4, pos: [cl0[0] + 1.05, 1.4, cl0[2] + 2.5], look: [cl0[0], 1.05, cl0[2]], fov: 40, ease: "cut", focus: 2.8 });
  keys.push({ t: 12.4, pos: [cl0[0] + 0.8, 1.3, cl0[2] + 1.85], look: [cl0[0], 1.1, cl0[2]], fov: 38, ease: "push", focus: 2.2 });
  // D — low angle (12.4-13.6): camera at knee height looking up
  keys.push({ t: 12.4, pos: [cl0[0] + 0.2, 0.52, cl0[2] + 1.85], look: [cl0[0], 1.3, cl0[2]], fov: 40, ease: "cut", focus: 2.0 });
  keys.push({ t: 13.6, pos: [cl0[0] + 0.34, 0.68, cl0[2] + 2.02], look: [cl0[0], 1.3, cl0[2]], fov: 38, ease: "push", focus: 2.1 });
  // E2 — the ending: whip (as a cut, measured grammar), then a settle into the final close-up
  const e2 = her(15.0);
  keys.push({ t: 13.6, pos: [e2[0] + 0.75, 1.55, e2[2] + 2.3], look: [e2[0], 1.32, e2[2]], fov: 36, ease: "whip", frames: 6, focus: 2.5 });
  keys.push({ t: 15.0, pos: [e2[0] + 0.7, 1.5, e2[2] + 2.2], look: [e2[0], 1.32, e2[2]], fov: 35, ease: "settle", focus: 2.5 });

  SF.cam(stage, keys, {});
  if (market.onMood) market.onMood(market.mood, stage);

  stage.clock = { t: 0 };
  stage.renderAt(0);
  window.__short = { stage, sets: { market }, mila };     // for stills and debugging only
  const tl = gsap.timeline({ paused: true });
  tl.to(stage.clock, { t: D, duration: D, ease: "none", onUpdate: () => stage.renderAt(stage.clock.t) }, 0);
  window.__timelines["short"] = tl;
} catch (err) { console.error("short build failed: " + err.message + " | " + (err.stack||"").split("\n").slice(0,8).join(" ~ ")); }
})();
