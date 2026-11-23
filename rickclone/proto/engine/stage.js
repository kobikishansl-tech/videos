/* stage.js: the renderer, the render targets, the pass chain and renderAt(t).
 *
 * Pass chain (every frame, all at `scale` x the frame size, then boxed down to 1080 x 1920):
 *   1. shadows + colour        scene -> rtColor          (lit, painted, linear light)
 *   2. normals + depth         scene -> rtNormal (+depth) (each mesh swapped to a normal material; cards write alpha 0)
 *   3. ink      (ink.js)       rtColor + rtNormal + depth -> rtA   (black ink lines on geometry edges)
 *   4. lens x2  (lens.js)      rtA -> rtB -> rtA             (depth blur AFTER the ink, so far lines soften too)
 *   5. glow     (glow.js)      rtA + glow + sun haze -> rtB  (marked lights glow; lit air in the sun's beams; optional file)
 *   6. motion   (lens.js)      rtB -> rtA                    (camera motion blur, only when stage.speedAt(t) is high enough)
 *   7. grade    (grade.js)     -> canvas                     (to sRGB, saturation by hue, S-curve, cool shadows, vignette, lift, 2x2 box down)
 *
 * Hand-offs (2026-11-12):
 *   stage.camAt = (t) => ({ pos, look, fov })  and  stage.speedAt = (t) => share of the frame height the picture moves
 *   in one frame. cam.js (topic D) sets them. With camAt but no speedAt, the stage estimates the speed itself.
 *   Motion blur runs when speedAt(t) > stage.motionMin (0.012); shutter stage.shutter (0.5 of a frame, 180 degrees).
 *   stage.blend = { from: view, to: view, k: 0..1 } (a view is { pos, look, fov }) during a cross-dissolve, else null:
 *   steps 1-6 run once per view (the cards turn to each view) and the two pictures are mixed by k before the grade.
 *
 * Nothing here keeps time. renderAt(t) runs every onFrame hook with t (poses, camera, words), then every
 * beforeDraw hook (cards turning to the camera, which must come after the camera has moved), then draws.
 * World units are metres; y is up; the floor is y = 0.
 *
 * Several sets in one film (topic D, 2026-11-12, round 1 of the full short):
 *   stage.addSet(setObject)      a set object as PLAN.md: { name, group, origin, spots, mood, ...; optional sun, onMood(mood, stage) }.
 *                                Its group is added to the scene; the first set added is shown, the others hidden.
 *   stage.useSet(name[, mood])   shows that set's group, hides every other set's group, applies the mood (default: the set's own).
 *   stage.setMood(mood[, name])  this frame's mood for that set (default: the set in use, i.e. the last useSet; with no set
 *                                in use, every set). Call it from an onFrame hook; it is cleared at the start of every
 *                                renderAt, so nothing carries between frames. (2026-11-12 r2: the default was "every set",
 *                                which put the night court's mood on the road side of a dissolve.)
 *   SF.mood.mix(a, b, k)         field-by-field mix of two moods (a field one side lacks is taken from the engine's base).
 *   A view may carry  set: "court"  and  mood: {...}.  Each frame the stage reads stage.camAt(t).set (and blend.from.set /
 *   blend.to.set in a dissolve) and shows that set in its mood. Precedence: view.mood > setMood(m, name) > setMood(m) > set.mood.
 *   A mood: { clear: 0xRRGGBB, fog: [0xRRGGBB, near, far] | null, grade: {...}, glow: {...}, lens: {...}, ink: {...} }, each
 *   group the uniforms of that pass by name (numbers; colours and vectors as [r, g, b] 0..1 or 0xRRGGBB; clear and the fog
 *   colour may be either too). Any field not given is
 *   the engine's base value (what the pass files set), so moods never leak from one set into another. Other fields
 *   (e.g. night: 1) are passed to set.onMood(mood, stage), which a set may use to change its own lights.
 *   Dissolve: each side is drawn with its own set and mood. If both sides are the same set in the same mood, the two
 *   pictures are mixed in linear light and graded once (as before); otherwise each side is graded in its own mood and the
 *   two finished pictures are mixed (as an editor's cross-dissolve does). A hard cut is just a view whose set changes;
 *   motion blur is never taken across a change of set.
 *   stage.sets (by name), stage.activeSet (name of the set drawn last), stage.moodBase (the base values).
 */
window.SF = window.SF || {};
SF.mood = SF.mood || {};
SF.mood.base = SF.mood.base || null;          // filled in by the first stage: { clear, fog, grade: {...}, glow: {...}, lens: {...}, ink: {...} }
SF.mood.GROUPS = ["grade", "glow", "lens", "ink"];
// a colour or vector field as [r, g, b] (0xRRGGBB numbers are read as sRGB-free linear 0..1 per channel, like THREE.Color.setHex)
SF.mood.rgb = function (v) {
  if (Array.isArray(v)) return v.slice(0, 3);
  if (typeof v === "number") return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  if (v && v.isColor) return [v.r, v.g, v.b];
  if (v && v.isVector3) return [v.x, v.y, v.z];
  return null;
};
// fog given as [[r, g, b], near, far] is read the same way as [0xRRGGBB, near, far]
SF.mood.mix = function (a, b, k) {
  "use strict";
  a = a || {}; b = b || {}; k = Math.max(0, Math.min(1, k));
  const B = SF.mood.base || {}, out = {};
  const lerp = (x, y) => x + (y - x) * k;
  const mixVal = (x, y, base) => {
    if (x == null) x = base; if (y == null) y = base;
    if (x == null) return y; if (y == null) return x;
    const vec = Array.isArray(base) || Array.isArray(x) || Array.isArray(y);
    if (vec) { const X = SF.mood.rgb(x), Y = SF.mood.rgb(y); return [lerp(X[0], Y[0]), lerp(X[1], Y[1]), lerp(X[2], Y[2])]; }
    if (typeof x === "number" && typeof y === "number") return lerp(x, y);
    return k < 0.5 ? x : y;
  };
  // clear colour
  if (a.clear != null || b.clear != null) { const c = mixVal(SF.mood.rgb(a.clear), SF.mood.rgb(b.clear), SF.mood.rgb(B.clear != null ? B.clear : 0));
    out.clear = (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255); }
  // fog: a side with no fog counts as the other side's colour pushed out of sight
  if (a.fog !== undefined || b.fog !== undefined) {
    const fa = a.fog === undefined ? B.fog : a.fog, fb = b.fog === undefined ? B.fog : b.fog;
    if (!fa && !fb) out.fog = null;
    else {
      const A = fa || [fb[0], 400, 800], C = fb || [fa[0], 400, 800], ca = SF.mood.rgb(A[0]), cb = SF.mood.rgb(C[0]);
      const c = [lerp(ca[0], cb[0]), lerp(ca[1], cb[1]), lerp(ca[2], cb[2])];
      out.fog = [(Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255), lerp(A[1], C[1]), lerp(A[2], C[2])];
    }
  }
  for (const g of SF.mood.GROUPS) {
    if (!a[g] && !b[g]) continue;
    const ga = a[g] || {}, gb = b[g] || {}, gB = B[g] || {}, o = {};
    for (const key of new Set(Object.keys(ga).concat(Object.keys(gb)))) o[key] = mixVal(ga[key], gb[key], gB[key]);
    out[g] = o;
  }
  // anything else (a set's own fields, e.g. night: 1): numbers mix, others switch at the middle
  for (const key of new Set(Object.keys(a).concat(Object.keys(b)))) {
    if (key in out || key === "clear" || key === "fog" || SF.mood.GROUPS.includes(key)) continue;
    const x = a[key], y = b[key];
    out[key] = typeof x === "number" || typeof y === "number" ? lerp(x == null ? 0 : x, y == null ? 0 : y) : (k < 0.5 ? (x !== undefined ? x : y) : (y !== undefined ? y : x));
  }
  return out;
};
SF.stage = function (host, opt) {
  "use strict";
  opt = opt || {};
  const W = opt.width || 1080, H = opt.height || 1920, S = opt.scale || 2, IW = W * S, IH = H * S;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none`;
  canvas.setAttribute("data-layout-ignore", ""); host.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.outputEncoding = THREE.LinearEncoding;            // grade.js does the sRGB step itself
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opt.fov || 40, W / H, opt.near || 0.1, opt.far || 60);

  const rt = (depth) => { const r = new THREE.WebGLRenderTarget(IW, IH, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth });
    r.texture.generateMipmaps = false; return r; };
  const rtColor = rt(true), rtNormal = rt(true), rtA = rt(false), rtB = rt(false);
  rtNormal.depthTexture = new THREE.DepthTexture(IW, IH); rtNormal.depthTexture.format = THREE.DepthFormat; rtNormal.depthTexture.type = THREE.UnsignedIntType;

  // ---- full-screen passes
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; quadScene.add(quad);
  const VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  // shared: linear depth from the depth texture
  const DEPTH_GLSL = `uniform sampler2D tDepth; uniform float cNear, cFar;
    float linDepth(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return 2.0 * cNear * cFar / (cFar + cNear - z * (cFar - cNear)); }`;
  function passMat(frag, uniforms) {
    return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
  }
  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }

  // ---- the normal pass: every mesh gets a stand-in material once (cached on userData)
  const NRM_VERT = `varying vec3 vN; varying vec2 vUv;
    void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const nrmGeo = (ink) => new THREE.ShaderMaterial({ vertexShader: NRM_VERT, side: THREE.DoubleSide, blending: THREE.NoBlending,
    uniforms: { uInk: { value: ink } },
    fragmentShader: `uniform float uInk; varying vec3 vN; void main(){ vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0); gl_FragColor = vec4(n * 0.5 + 0.5, uInk); }` });
  const nrmCard = (map) => new THREE.ShaderMaterial({ vertexShader: NRM_VERT, side: THREE.DoubleSide, blending: THREE.NoBlending,
    uniforms: { map: { value: map } },
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec3 vN; void main(){ if (texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(0.5, 0.5, 1.0, 0.0); }` });
  // ink strength per mesh: userData.ink (0..1, default 1) is stored in alpha as 0.25 + 0.75 * ink; 0 means "a card: no ink here"
  function normalMaterialOf(m) {
    const u = m.userData;
    if (u.nrm) return u.nrm;
    if (u.card) u.nrm = nrmCard(m.material.map);
    else u.nrm = nrmGeo(0.25 + 0.75 * (u.ink == null ? 1 : u.ink));
    return u.nrm;
  }

  const ink = SF.ink.create({ passMat, DEPTH_GLSL, IW, IH, S });
  const lens = SF.lens.create({ passMat, DEPTH_GLSL, IW, IH, S });
  const motion = SF.lens.motion ? SF.lens.motion({ passMat, IW, IH, S }) : null;
  const glow = SF.glow ? SF.glow.create({ passMat, renderer, IW, IH, S }) : null;
  const grade = SF.grade.create({ passMat, IW, IH });
  const rtAcc = rt(false);
  const mixMat = new THREE.ShaderMaterial({ vertexShader: VERT, depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    uniforms: { tSrc: { value: null }, k: { value: 1 } },
    fragmentShader: "uniform sampler2D tSrc; uniform float k; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * k, 1.0); }" });

  // a dissolve between two moods: each side graded on its own into a frame-size target, then mixed (display space)
  const rtF = () => { const r = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    r.texture.generateMipmaps = false; return r; };
  let rtG1 = null, rtG2 = null;
  const dispMix = passMat("uniform sampler2D tA, tB; uniform float k; varying vec2 vUv; void main(){ gl_FragColor = vec4(mix(texture2D(tA, vUv).rgb, texture2D(tB, vUv).rgb, k), 1.0); }",
    { tA: { value: null }, tB: { value: null }, k: { value: 0 } });

  const st = { W, H, S, renderer, scene, camera, canvas, ink, lens, grade, glow, motion, onFrame: [], beforeDraw: [], focus: 4, t: 0,
    camAt: null, speedAt: null, blend: null, shutter: 0.5, motionMin: 0.012, fps: opt.fps || 30,
    sets: {}, setList: [], activeSet: null, moodBase: null };

  // ---- moods: the base value of every pass uniform that is a number, a colour or a 3-vector (textures and matrices left out)
  const PASSES = { grade: grade.u, glow: glow ? glow.u : {}, lens: lens.u, ink: ink.u };
  const SKIP = { texel: 1, scale: 1, cNear: 1, cFar: 1, focus: 1, dir: 1, defer: 1, inkMask: 1, finalPass: 1, inkColor: 1, inkWidth: 1 };
  function snapshot() {
    const b = { clear: scene.userData.clear || 0x000000, fog: null };
    for (const g in PASSES) { b[g] = {}; for (const key in PASSES[g]) { if (SKIP[key]) continue; const v = PASSES[g][key].value;
      if (typeof v === "number") b[g][key] = v; else if (v && (v.isColor || v.isVector3)) b[g][key] = SF.mood.rgb(v); } }
    return b;
  }
  st.moodBase = snapshot(); if (!SF.mood.base) SF.mood.base = st.moodBase;
  const fogObj = new THREE.Fog(0x000000, 10, 50), bgColor = new THREE.Color();
  function setUniform(un, v) {
    if (!un) return;
    const cur = un.value;
    if (typeof cur === "number") { if (typeof v === "number") un.value = v; return; }
    const c = SF.mood.rgb(v); if (!c) return;
    if (cur && cur.isColor) cur.setRGB(c[0], c[1], c[2]); else if (cur && cur.isVector3) cur.set(c[0], c[1], c[2]);
  }
  // a colour as 0xRRGGBB from a number, [r, g, b] (0..1) or a THREE.Color
  const hexOf = (v) => { if (typeof v === "number") return v; const c = SF.mood.rgb(v) || [0, 0, 0];
    const b = (x) => Math.max(0, Math.min(255, Math.round(x * 255))); return (b(c[0]) << 16) | (b(c[1]) << 8) | b(c[2]); };
  st.hexOf = hexOf;
  // apply a mood to the scene and the passes: every field first back to its base, then the mood's own
  function applyMood(m, set) {
    m = m || {}; const B = st.moodBase;
    const clear = hexOf(m.clear != null ? m.clear : B.clear);
    scene.userData.clear = clear;
    if (scene.background && scene.background.isColor) scene.background = bgColor.setHex(clear);
    const fog = m.fog !== undefined ? m.fog : B.fog;
    if (fog) { fogObj.color.setHex(hexOf(fog[0])); fogObj.near = fog[1]; fogObj.far = fog[2]; scene.fog = fogObj; } else scene.fog = null;
    for (const g in PASSES) { const mg = m[g] || {};
      for (const key in B[g]) setUniform(PASSES[g][key], mg[key] !== undefined ? mg[key] : B[g][key]); }
    if (glow) glow.setLight = set && set.sun ? set.sun : null;
    if (set && typeof set.onMood === "function") set.onMood(m, st);
    st.mood = m;
  }
  st.applyMood = applyMood;
  const NO_MOOD = {};
  let moodNow = {}, moodAll = null;                  // this frame's overrides (cleared in renderAt)
  st.addSet = function (s) {
    if (!s || !s.name || !s.group) throw new Error("stage.addSet: a set needs a name and a group");
    if (!st.sets[s.name]) st.setList.push(s);
    else { const i = st.setList.indexOf(st.sets[s.name]); st.setList[i] = s; }
    st.sets[s.name] = s;
    if (!s.group.parent) scene.add(s.group);
    if (!st.activeSet || st.activeSet === s.name) st.useSet(s.name); else s.group.visible = false;
    return s;
  };
  st.moodOf = function (name, viewMood) {
    if (viewMood) return viewMood;
    if (name && moodNow[name]) return moodNow[name];
    if (moodAll) return moodAll;
    const s = st.sets[name]; return (s && s.mood) || NO_MOOD;
  };
  st.useSet = function (name, mood) {
    const s = st.sets[name];
    if (!s) { if (name) console.warn("stage.useSet: no set named " + name); return null; }
    for (const o of st.setList) o.group.visible = o === s;
    st.activeSet = name;
    applyMood(st.moodOf(name, mood), s);
    return s;
  };
  st.setMood = function (mood, name) {
    name = name || st.activeSet;
    if (name) moodNow[name] = mood; else moodAll = mood;
    // outside a frame (e.g. a still built by hand) take effect at once on the set in view
    if (!st.inFrame && (!name || name === st.activeSet)) applyMood(st.moodOf(st.activeSet), st.sets[st.activeSet]);
  };
  // show the set (and mood) a view asks for; a view without a set keeps the set in use and refreshes its mood
  function showView(v) {
    if (!st.setList.length) { if (v && v.mood) applyMood(v.mood, null); return; }
    const name = (v && v.set) || st.activeSet;
    st.useSet(name, v && v.mood);
  }
  st.showView = showView;
  const sameMood = (a, b) => { const na = (a && a.set) || st.activeSet, nb = (b && b.set) || st.activeSet;
    return na === nb && st.moodOf(na, a && a.mood) === st.moodOf(nb, b && b.mood); };
  const swapped = [];
  const v3 = new THREE.Vector3(), dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  function setView(v) {
    camera.position.set(v.pos[0], v.pos[1], v.pos[2]); if (v.fov) camera.fov = v.fov; camera.updateProjectionMatrix();
    camera.lookAt(v.look[0], v.look[1], v.look[2]); camera.updateMatrixWorld(true);
    st.focus = v.focus != null ? v.focus : dist3(v.pos, v.look);
  }
  // how far the picture moves in one frame (share of the frame height), from camAt alone: the look-at point of
  // time t seen through the camera half a frame before and after
  const projM = new THREE.Matrix4(), ndc = new THREE.Vector4();
  function speedEstimate(t) {
    if (!st.camAt || !motion) return 0;
    const s = st.camAt(t), a = st.camAt(t - 0.5 / st.fps), b = st.camAt(t + 0.5 / st.fps);
    const P = [s.look, [s.look[0] + 0.5 * (s.look[0] - s.pos[0]), s.look[1] + 0.5 * (s.look[1] - s.pos[1]), s.look[2] + 0.5 * (s.look[2] - s.pos[2])]];
    let m = 0;
    for (const p of P) {
      const pa = ndc.set(p[0], p[1], p[2], 1).applyMatrix4(motion.vpOf(a, camera, projM)); const ax = pa.x / pa.w, ay = pa.y / pa.w;
      const pb = ndc.set(p[0], p[1], p[2], 1).applyMatrix4(motion.vpOf(b, camera, projM)); const bx = pb.x / pb.w, by = pb.y / pb.w;
      m = Math.max(m, 0.5 * Math.hypot((bx - ax) * W / H, by - ay));
    }
    return m;
  }
  st.speedEstimate = speedEstimate;

  // steps 1-6 for the camera as it is now; the result is left in the returned target (linear light)
  function chain(mb) {
    camera.updateMatrixWorld(true);
    // 1. colour (shadow maps drawn once, here)
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(rtColor); renderer.setClearColor(scene.userData.clear || 0x000000, 1); renderer.clear(); renderer.render(scene, camera);
    // 2. normals + depth: hide what draws no ink and has no depth (light shafts, glass), swap the rest
    const bg = scene.background, fog = scene.fog; scene.background = null; scene.fog = null; swapped.length = 0;
    scene.traverseVisible((o) => { if (!o.isMesh && !o.isSprite) return;
      if (o.userData.noDepth || !o.visible) { if (o.visible) { o.visible = false; swapped.push([o, null]); } return; }
      swapped.push([o, o.material]); o.material = normalMaterialOf(o); });
    renderer.setRenderTarget(rtNormal); renderer.setClearColor(0x8080ff, 1); renderer.clear(); renderer.render(scene, camera);
    for (const [o, m] of swapped) { if (m) o.material = m; else o.visible = true; }
    scene.background = bg; scene.fog = fog;
    // 3. ink, 4. lens
    const dt = rtNormal.depthTexture;
    // the ink is drawn into alpha (a mask) and laid on by the lens after the colour blur, with a smaller blur of its own
    // (so far lines soften but stay). st.inkMode = "before" puts it back the old way (ink drawn in, then blurred with the rest).
    const deferInk = st.view !== "ink" && st.inkMode !== "before";
    ink.u.defer.value = deferInk ? 1 : 0; lens.u.inkMask.value = deferInk ? 1 : 0; lens.u.inkColor.value.copy(ink.u.color.value); lens.u.inkWidth.value = ink.u.width.value;
    ink.run(pass, rtColor.texture, rtNormal.texture, dt, camera, rtA);
    if (st.view === "ink") return rtA;
    lens.run(pass, rtA.texture, dt, camera, st.focus, rtB, rtA);
    // 5. glow + haze
    let cur = rtA, spare = rtB;
    if (glow && glow.enabled && st.view !== "noglow") { glow.run(pass, scene, camera, rtColor.texture, dt, cur.texture, spare); [cur, spare] = [spare, cur]; }
    // 6. motion blur
    if (mb) { motion.run(pass, cur.texture, dt, camera, mb[0], mb[1], spare); [cur, spare] = [spare, cur]; }
    return cur;
  }

  function draw() {
    const t = st.t;
    let out;
    const b = st.blend;
    st.dissolveMode = null;
    if (b && b.from && b.to && b.k > 0 && b.k < 1) {
      // a cross-dissolve: both views through the whole chain, each with its own set and mood
      const keep = { pos: camera.position.toArray(), quat: camera.quaternion.clone(), fov: camera.fov, focus: st.focus };
      const split = !sameMood(b.from, b.to) && st.view !== "color" && st.view !== "normal";
      st.dissolveMode = split ? "graded" : "linear";
      if (split) {
        // two moods: grade each side in its own mood, then mix the finished pictures
        if (!rtG1) { rtG1 = rtF(); rtG2 = rtF(); }
        const tg = [rtG1, rtG2];
        [b.from, b.to].forEach((v, i) => {
          showView(v); setView(v); for (const f of st.beforeDraw) f(t, st);
          const r = chain(null);
          grade.run(pass, r.texture, tg[i]);
        });
        dispMix.uniforms.tA.value = rtG1.texture; dispMix.uniforms.tB.value = rtG2.texture; dispMix.uniforms.k.value = b.k;
        pass(dispMix, null);
      } else {
        renderer.setRenderTarget(rtAcc); renderer.setClearColor(0x000000, 1); renderer.clear();
        for (const [v, w] of [[b.from, 1 - b.k], [b.to, b.k]]) {
          showView(v); setView(v); for (const f of st.beforeDraw) f(t, st);
          const r = chain(null);
          mixMat.uniforms.tSrc.value = r.texture; mixMat.uniforms.k.value = w;
          renderer.autoClear = false; pass(mixMat, rtAcc); renderer.autoClear = true;   // add, do not clear
        }
        out = rtAcc;
      }
      camera.position.fromArray(keep.pos); camera.quaternion.copy(keep.quat); camera.fov = keep.fov; camera.updateProjectionMatrix(); st.focus = keep.focus;
      // leave the set of the view the stage camera shows (from until k = 0.5, then to) in use
      showView(b.k < 0.5 ? b.from : b.to);
      if (split) { renderer.setRenderTarget(null); return; }
    } else {
      const cur = st.camAt ? st.camAt(t) : null;
      showView(cur);
      let mb = null;
      if (st.camAt && motion && st.view !== "nomotion") {
        const sp = st.speedAt ? st.speedAt(t) : speedEstimate(t);
        if (sp > st.motionMin) { const h = 0.5 * st.shutter / st.fps; mb = [st.camAt(t - h), st.camAt(t + h)];
          // never blur across a change of set (a hard cut between sets inside the shutter): take this side only
          const here = (cur && cur.set) || null;
          if (here && ((mb[0].set && mb[0].set !== here) || (mb[1].set && mb[1].set !== here))) mb = null; }
      }
      st.motionOn = !!mb;
      out = chain(mb);
    }
    // st.view: "final" (default), or "color" / "normal" / "ink" to look at one stage of the chain (debugging)
    grade.run(pass, st.view === "color" ? rtColor.texture : st.view === "normal" ? rtNormal.texture : out.texture, null);
    renderer.setRenderTarget(null);
  }
  st.draw = draw;
  st.renderAt = function (t) {
    st.t = t; moodNow = {}; moodAll = null; st.inFrame = true;
    try { for (const f of st.onFrame) f(t, st); for (const f of st.beforeDraw) f(t, st); draw(); } finally { st.inFrame = false; }
  };
  return st;
};
