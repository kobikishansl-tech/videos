/* glow.js: light that spills. Glow around marked lights, and haze in the sun's beams. Load it before stage.js.
 *
 * Glow (hand-off 1 with the set): a mesh with userData.glow = 0..3 is a light source (flame, lamp, bright window).
 *   1. an id pass at a quarter of the internal size draws the scene with every mesh black except glow meshes, which
 *      write their strength (so a light hidden behind a pillar or a character does not glow);
 *   2. the source is the lit colour where the id pass says "light", times strength, plus a soft threshold on anything
 *      very bright (sunlit paper, a lit window that was not marked);
 *   3. three blur levels (1/4, 1/8, 1/16 of the internal size) are added: a tight core glow and a wide warm halo.
 * Haze: for each pixel, 40 steps along the view ray (to the surface, at most hazeDist metres) look the step up in the
 *   sun's shadow map: lit air scatters a little sun colour back. Light that comes through a window becomes a visible
 *   beam; air in shadow stays clear. Uses the first DirectionalLight with castShadow (or stage.glow.light).
 *
 * Flicker (hand-off 5): a light's strength is userData.glow x userData.flicker (about 0.7..1.3; 1 when not set), read every
 *   frame, so a candle's glow breathes with its flame. Only meshes that are visible (with all their parents) are drawn.
 * Sets: the haze uses the sun of the set in use (stage.useSet sets api.setLight from set.sun), else the first VISIBLE
 *   DirectionalLight with castShadow; api.light still overrides both.
 * Tunables (stage.glow.u.*.value): amount (glow), threshold, knee, w1/w2/w3 (the three blur levels),
 *   haze (scatter per metre), hazeDist (metres), hazeForward (extra when looking toward the sun), hazeTint (RGB).
 */
window.SF = window.SF || {};
SF.glow = {
  create(ctx) {
    const { passMat, renderer } = ctx;
    const GW = Math.round(ctx.IW / 4), GH = Math.round(ctx.IH / 4);
    const mk = (w, h, depth) => { const r = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth });
      r.texture.generateMipmaps = false; return r; };
    const rtId = mk(GW, GH, true), s1 = mk(GW, GH), t1 = mk(GW, GH), b1 = mk(GW, GH),
      t2 = mk(GW >> 1, GH >> 1), b2 = mk(GW >> 1, GH >> 1), t3 = mk(GW >> 2, GH >> 2), b3 = mk(GW >> 2, GH >> 2),
      hz = mk(GW, GH), hzT = mk(GW, GH);

    const u = {
      amount: { value: 1.0 }, threshold: { value: 1.1 }, knee: { value: 0.25 },
      w1: { value: 0.9 }, w2: { value: 0.8 }, w3: { value: 0.7 },
      haze: { value: 0.006 }, hazeDist: { value: 14 }, hazeForward: { value: 3.0 }, hazeTint: { value: new THREE.Vector3(1.0, 0.92, 0.8) },
    };

    // ---- 1. the id pass: materials cached per mesh
    const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const idMat = (strength, map, side) => new THREE.ShaderMaterial({ vertexShader: VERT, side, blending: THREE.NoBlending,
      uniforms: { s: { value: strength }, map: { value: map || null }, useMap: { value: map ? 1 : 0 } },
      fragmentShader: `uniform float s, useMap; uniform sampler2D map; varying vec2 vUv;
        void main(){ if (useMap > 0.5 && texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(s, s, s, 1.0); }` });
    function idMaterialOf(o) {
      const ud = o.userData, g = ud.glow || 0, m = o.material, f = g > 0 && ud.flicker != null ? Math.max(0, ud.flicker) : 1;
      if (!ud.glowMat || ud.glowMat.userData.src !== m) { ud.glowMat = idMat(0, ud.card ? m.map : (m.alphaTest > 0 ? m.map : null), m.side); ud.glowMat.userData.src = m; }
      ud.glowMat.uniforms.s.value = (g / 3) * f;              // updated every frame: follows userData.flicker
      return ud.glowMat;
    }
    const swapped = [];
    function idPass(scene, camera) {
      const bg = scene.background, fog = scene.fog; scene.background = null; scene.fog = null; swapped.length = 0;
      scene.traverseVisible((o) => { if (!o.isMesh && !o.isSprite) return;
        if (!o.visible) return;
        if (o.isSprite || (o.userData.noDepth && !(o.userData.glow > 0))) { o.visible = false; swapped.push([o, null]); return; }
        swapped.push([o, o.material]); o.material = idMaterialOf(o); });
      renderer.setRenderTarget(rtId); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
      for (const [o, m] of swapped) { if (m) o.material = m; else o.visible = true; }
      scene.background = bg; scene.fog = fog;
    }

    // ---- 2. the source: lit colour x strength, plus a soft threshold on very bright light
    const srcMat = passMat(`uniform sampler2D tColor, tId; uniform vec2 texel; uniform float threshold, knee; varying vec2 vUv;
      void main(){
        vec3 c = 0.25 * (texture2D(tColor, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tColor, vUv + texel * vec2(1.0, -1.0)).rgb
                       + texture2D(tColor, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tColor, vUv + texel * vec2(1.0, 1.0)).rgb);
        float s = texture2D(tId, vUv).r * 3.0;
        float l = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c * s + c * knee * max(l - threshold, 0.0) / max(l, 1e-3), 1.0);
      }`, { tColor: { value: null }, tId: { value: null }, texel: { value: new THREE.Vector2(1 / ctx.IW, 1 / ctx.IH) }, threshold: u.threshold, knee: u.knee });

    // ---- 3. separable Gaussian blur (13 taps); a pass into a smaller target also halves the size
    const blurMat = passMat(`uniform sampler2D tSrc; uniform vec2 step; varying vec2 vUv;
      void main(){ vec3 s = vec3(0.0); float ws = 0.0;
        for (int i = -6; i <= 6; i++) { float k = float(i) / 6.0, w = exp(-k * k * 2.5); s += texture2D(tSrc, vUv + step * float(i)).rgb * w; ws += w; }
        gl_FragColor = vec4(s / ws, 1.0); }`, { tSrc: { value: null }, step: { value: new THREE.Vector2() } });
    function blur(pass, src, srcW, srcH, tmp, dst, spread) {
      blurMat.uniforms.tSrc.value = src; blurMat.uniforms.step.value.set(spread / srcW, 0); pass(blurMat, tmp);
      blurMat.uniforms.tSrc.value = tmp.texture; blurMat.uniforms.step.value.set(0, spread / tmp.height); pass(blurMat, dst);
    }

    // ---- haze: march the sun's shadow map along each view ray
    const hazeMat = passMat(`#include <packing>
      uniform sampler2D tDepth, tShadow; uniform mat4 invProj, camWorld, shadowMatrix; uniform vec3 camPos, lightDir, lightColor, hazeTint;
      uniform float haze, hazeDist, hazeForward, shadowBias; varying vec2 vUv;
      void main(){
        float d = texture2D(tDepth, vUv).x;
        vec4 v = invProj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); v /= v.w;
        vec3 wp = (camWorld * v).xyz, ray = wp - camPos; float L = min(length(ray), hazeDist); vec3 rd = normalize(ray);
        float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        float lit = 0.0;
        for (int i = 0; i < 40; i++) {
          vec3 p = camPos + rd * L * (float(i) + j) / 40.0;
          vec4 sc = shadowMatrix * vec4(p, 1.0); sc.xyz /= sc.w;
          if (sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0 && sc.z < 1.0)
            lit += step(sc.z + shadowBias, unpackRGBAToDepth(texture2D(tShadow, sc.xy)));
        }
        float phase = 1.0 + hazeForward * pow(max(dot(rd, lightDir), 0.0), 6.0);
        gl_FragColor = vec4(lightColor * hazeTint * haze * L * (lit / 40.0) * phase, 1.0);
      }`, { tDepth: { value: null }, tShadow: { value: null }, invProj: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() },
      shadowMatrix: { value: new THREE.Matrix4() }, camPos: { value: new THREE.Vector3() }, lightDir: { value: new THREE.Vector3() },
      lightColor: { value: new THREE.Vector3() }, hazeTint: u.hazeTint, haze: u.haze, hazeDist: u.hazeDist, hazeForward: u.hazeForward, shadowBias: { value: 0.0 } });

    // ---- composite: picture + glow levels + haze
    const compMat = passMat(`uniform sampler2D tSrc, g1, g2, g3, tHaze; uniform float amount, w1, w2, w3, useHaze; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tSrc, vUv).rgb;
        vec3 g = w1 * texture2D(g1, vUv).rgb + w2 * texture2D(g2, vUv).rgb + w3 * texture2D(g3, vUv).rgb;
        vec3 h = useHaze > 0.5 ? texture2D(tHaze, vUv).rgb : vec3(0.0);
        gl_FragColor = vec4(c + amount * g + h, 1.0); }`,
      { tSrc: { value: null }, g1: { value: b1.texture }, g2: { value: b2.texture }, g3: { value: b3.texture }, tHaze: { value: hz.texture },
        amount: u.amount, w1: u.w1, w2: u.w2, w3: u.w3, useHaze: { value: 0 } });

    const api = { u, light: null, setLight: null, enabled: true };
    const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    function sunOf(scene) {
      if (api.light) return api.light;
      if (api.setLight && shown(api.setLight)) return api.setLight;
      let s = null; scene.traverseVisible((o) => { if (!s && o.isDirectionalLight && o.castShadow) s = o; }); return s;
    }
    // color: the lit colour (rtColor), depth: the depth texture, src: the picture so far, target: where the sum goes
    api.run = function (pass, scene, camera, color, depth, src, target) {
      idPass(scene, camera);
      srcMat.uniforms.tColor.value = color; srcMat.uniforms.tId.value = rtId.texture; pass(srcMat, s1);
      blur(pass, s1.texture, GW, GH, t1, b1, 1.0);
      blur(pass, b1.texture, GW, GH, t2, b2, 1.5);
      blur(pass, b2.texture, GW >> 1, GH >> 1, t3, b3, 2.0);
      const sun = sunOf(scene), hu = hazeMat.uniforms;
      const useHaze = !!(sun && sun.shadow && sun.shadow.map && u.haze.value > 0);
      if (useHaze) {
        hu.tDepth.value = depth; hu.tShadow.value = sun.shadow.map.texture; hu.shadowMatrix.value.copy(sun.shadow.matrix);
        hu.invProj.value.copy(camera.projectionMatrix).invert(); hu.camWorld.value.copy(camera.matrixWorld); hu.camPos.value.setFromMatrixPosition(camera.matrixWorld);
        hu.lightDir.value.setFromMatrixPosition(sun.matrixWorld).sub(new THREE.Vector3().setFromMatrixPosition(sun.target.matrixWorld)).normalize();
        hu.lightColor.value.set(sun.color.r, sun.color.g, sun.color.b).multiplyScalar(sun.intensity); hu.shadowBias.value = sun.shadow.bias;
        pass(hazeMat, hz);
        blur(pass, hz.texture, GW, GH, hzT, hz, 0.7);
      }
      compMat.uniforms.useHaze.value = useHaze ? 1 : 0; compMat.uniforms.tSrc.value = src; pass(compMat, target);
    };
    return api;
  },
};
