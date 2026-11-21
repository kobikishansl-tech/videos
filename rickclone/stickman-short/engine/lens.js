/* lens.js: depth blur, run AFTER the ink, so far ink lines soften with what they are drawn on; and camera motion blur.
 *
 * Depth blur. Blur size per pixel (frame px at 1080 wide): coc = clamp(aperture * |1 - focus / depth|, 0, maxBlur).
 * Behind the focus it grows toward aperture; in front of it, it grows fast (things near the lens go soft too).
 * Two separable passes (across, then down), 21 taps each, Gaussian weights, a per-pixel jittered tap offset so a wide
 * blur shows no ghost copies. A tap only counts if its own blur reaches back toward this pixel, so a sharp character
 * never smears into the soft wall behind it.
 * 2026-11-12 (topic C): aperture 6 -> 12, maxBlur 8 -> 18. The reference's background edges behind a close character
 * rise over ~10 px (2-18), v1 over 3 px.
 *
 * 2026-11-12 (topic D): the ink comes in as a mask in alpha (ink.js, defer). The colour is blurred as before; the mask is
 * blurred with its own, smaller blur (inkSoft x the colour's), its peak is lifted back by the share a line of the ink's width
 * loses to that blur (inkKeep: 1 = full, 0 = none), and the second pass lays the ink on. So lines behind a close subject
 * soften but stay, where before the full blur rubbed them out (edges inked 0.27 against the reference's 0.53).
 * stage.focus (metres) is the focus distance; cam.js sets it every frame from the shot's look-at point.
 * Tunables (stage.lens.u.*.value): aperture, maxBlur (frame px).
 *
 * Motion blur (SF.lens.motion): a 180-degree shutter for camera moves. Each pixel's world point (from depth) is
 * projected through the camera half a shutter before and after this instant (stage.camAt), and the picture is
 * averaged along that path: what the frame would be if all the in-between camera positions were averaged
 * (without parallax hiding). stage.js runs it only when stage.speedAt(t) says the picture moves enough.
 * Tunables (stage.motion.u.*.value): maxLen (share of the frame, 0.5).
 */
window.SF = window.SF || {};
SF.lens = {
  create(ctx) {
    const u = {
      tSrc: { value: null }, tDepth: { value: null }, cNear: { value: 0.1 }, cFar: { value: 60 },
      texel: { value: new THREE.Vector2(1 / ctx.IW, 1 / ctx.IH) }, dir: { value: new THREE.Vector2(1, 0) },
      focus: { value: 4 }, aperture: { value: 12 }, maxBlur: { value: 18 }, scale: { value: ctx.S },
      inkMask: { value: 0 }, finalPass: { value: 0 }, inkColor: { value: new THREE.Color(0, 0, 0) }, inkWidth: { value: 5 },
      inkSoft: { value: 0.45 }, inkKeep: { value: 0.85 }, inkFar: { value: 0.8 },
    };
    const frag = ctx.DEPTH_GLSL + `
      uniform sampler2D tSrc; uniform vec2 texel, dir; uniform float focus, aperture, maxBlur, scale;
      uniform float inkMask, finalPass, inkWidth, inkSoft, inkKeep, inkFar; uniform vec3 inkColor;
      varying vec2 vUv;
      float coc(vec2 uv){ float d = linDepth(uv); return clamp(aperture * abs(1.0 - focus / d), 0.0, maxBlur) * scale; }
      void main(){
        float c0 = coc(vUv);
        vec4 src = texture2D(tSrc, vUv);
        vec3 col = src.rgb; float a = src.a;
        if (c0 >= 0.6) {
          float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5;
          vec3 sum = src.rgb; float ws = 1.0;
          for (int i = 1; i <= 10; i++) {
            float k = (float(i) + 0.6 * j) / 10.0, x = k * c0, g = exp(-k * k * 2.2);
            for (int s = -1; s <= 1; s += 2) {
              vec2 uv = vUv + dir * texel * x * float(s);
              float cs = coc(uv);
              float w = g * clamp(cs - 0.5 * x + 0.5, 0.0, 1.0);
              sum += texture2D(tSrc, uv).rgb * w; ws += w;
            }
          }
          col = sum / ws;
          // the ink mask: the same kind of blur, inkSoft as wide
          float ra = c0 * inkSoft;
          if (inkMask > 0.5 && ra >= 0.6) {
            float as = src.a, aw = 1.0;
            for (int i = 1; i <= 6; i++) {
              float k = (float(i) + 0.6 * j) / 6.0, x = k * ra, g = exp(-k * k * 2.2);
              for (int s = -1; s <= 1; s += 2) {
                vec2 uv = vUv + dir * texel * x * float(s);
                float cs = coc(uv) * inkSoft;
                float w = g * clamp(cs - 0.5 * x + 0.5, 0.0, 1.0);
                as += texture2D(tSrc, uv).a * w; aw += w;
              }
            }
            a = as / aw;
          }
        }
        if (inkMask > 0.5 && finalPass > 0.5) {
          // a line of the ink's width blurred by sigma (both passes) keeps about w / sqrt(w^2 + 2 pi sigma^2) of its peak:
          // lift it back by inkKeep of that loss, and fade far lines a little (inkFar at the largest blur)
          float w = inkWidth * scale, sig = 0.48 * c0 * inkSoft;
          float gain = mix(1.0, sqrt(1.0 + 6.283 * sig * sig / (w * w)), inkKeep);
          float far = mix(1.0, inkFar, clamp(c0 / max(maxBlur * scale, 1e-3), 0.0, 1.0));
          col = mix(col, inkColor, clamp(a * gain, 0.0, 1.0) * far);
          a = 1.0;
        }
        gl_FragColor = vec4(col, a);
      }`;
    const mat = ctx.passMat(frag, u);
    return {
      u, mat,
      run(pass, src, depth, camera, focus, tmp, dst) {
        u.tDepth.value = depth; u.cNear.value = camera.near; u.cFar.value = camera.far; u.focus.value = focus;
        u.tSrc.value = src; u.dir.value.set(1, 0); u.finalPass.value = 0; pass(mat, tmp);
        u.tSrc.value = tmp.texture; u.dir.value.set(0, 1); u.finalPass.value = 1; pass(mat, dst);
      },
    };
  },

  motion(ctx) {
    const u = {
      tSrc: { value: null }, tDepth: { value: null },
      invProj: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() },
      prevVP: { value: new THREE.Matrix4() }, nextVP: { value: new THREE.Matrix4() }, maxLen: { value: 0.5 },
    };
    const frag = `
      uniform sampler2D tSrc, tDepth; uniform mat4 invProj, camWorld, prevVP, nextVP; uniform float maxLen;
      varying vec2 vUv;
      void main(){
        float d = texture2D(tDepth, vUv).x;
        vec4 v = invProj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); v /= v.w;
        vec4 wp = camWorld * v;
        vec4 a = prevVP * wp, b = nextVP * wp;
        if (a.w <= 0.0 || b.w <= 0.0) { gl_FragColor = texture2D(tSrc, vUv); return; }
        vec2 dv = (b.xy / b.w - a.xy / a.w) * 0.5;               // the path across the shutter, in uv
        float l = length(dv); if (l > maxLen) dv *= maxLen / l;
        if (l < 0.0008) { gl_FragColor = texture2D(tSrc, vUv); return; }
        float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        vec3 s = vec3(0.0);
        for (int i = 0; i < 40; i++) { float k = (float(i) + j) / 40.0 - 0.5; s += texture2D(tSrc, clamp(vUv + dv * k, 0.0, 1.0)).rgb; }
        gl_FragColor = vec4(s / 40.0, 1.0);
      }`;
    const mat = ctx.passMat(frag, u);
    const tmpCam = new THREE.PerspectiveCamera();
    // view-projection matrix of a camera state { pos, look, fov } with the stage camera's aspect and clip planes
    function vpOf(s, camera, out) {
      tmpCam.aspect = camera.aspect; tmpCam.near = camera.near; tmpCam.far = camera.far; tmpCam.fov = s.fov || camera.fov;
      tmpCam.up.copy(camera.up); tmpCam.position.set(s.pos[0], s.pos[1], s.pos[2]); tmpCam.lookAt(s.look[0], s.look[1], s.look[2]);
      tmpCam.updateMatrixWorld(true); tmpCam.updateProjectionMatrix();
      return out.multiplyMatrices(tmpCam.projectionMatrix, tmpCam.matrixWorldInverse);
    }
    return {
      u, mat, vpOf,
      run(pass, src, depth, camera, before, after, target) {
        u.tSrc.value = src; u.tDepth.value = depth;
        u.invProj.value.copy(camera.projectionMatrix).invert(); u.camWorld.value.copy(camera.matrixWorld);
        vpOf(before, camera, u.prevVP.value); vpOf(after, camera, u.nextVP.value);
        pass(mat, target);
      },
    };
  },
};
