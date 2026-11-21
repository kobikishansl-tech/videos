/* ink.js: black ink lines on the edges of the 3D geometry, found from depth and normals.
 *
 * For each pixel it looks `width / 2` frame pixels away in four directions (across, down, two diagonals):
 *  - a depth edge: the second difference of 1/depth across the pixel (zero on any flat plane, large at a
 *    silhouette, a little at a crease), relative to 1/depth here, so it does not depend on distance;
 *  - a normal edge: how much the normals on the two sides disagree (creases, where a thing meets the floor).
 * Both sides of an edge answer, so a line is `width` frame px wide wherever it is, near or far.
 * Cards (flat characters) write alpha 0 in the normal pass: no ink is drawn on them or right beside them;
 * they carry their own drawn outline. A mesh draws ink at userData.ink (0..1, default 1).
 *
 * defer (set by stage.js every frame): 1 = leave the colour as it is and write the line's strength into alpha, for the lens
 *   to lay on after the depth blur (see lens.js); 0 = draw the line into the colour here (the old way, and the "ink" debug view).
 * Tunables (stage.ink.u.*.value): width (frame px at 1080 wide, 5), color (linear RGB, warm brown-black), depthLo/Hi, normalLo/Hi.
 */
window.SF = window.SF || {};
SF.ink = {
  create(ctx) {
    const u = {
      tColor: { value: null }, tNormal: { value: null }, tDepth: { value: null }, cNear: { value: 0.1 }, cFar: { value: 60 },
      texel: { value: new THREE.Vector2(1 / ctx.IW, 1 / ctx.IH) },
      // 2026-11-12 (topic C): width 4 -> 5 and lower edge thresholds (the reference inks ~53% of colour edges, v1 ~34%);
      // a warm brown-black like the reference's lines (median line pixel ~(47,28,28)) instead of violet-black.
      width: { value: 5.0 }, scale: { value: ctx.S }, defer: { value: 0 },
      color: { value: new THREE.Color(0.010, 0.0055, 0.005) },
      depthLo: { value: 0.009 }, depthHi: { value: 0.03 }, normalLo: { value: 0.07 }, normalHi: { value: 0.2 },
    };
    const frag = ctx.DEPTH_GLSL + `
      uniform sampler2D tColor, tNormal; uniform vec2 texel; uniform float width, scale, depthLo, depthHi, normalLo, normalHi, defer; uniform vec3 color;
      varying vec2 vUv;
      float edgeAt(vec2 uv, vec2 dir, float ic, inout float minA){
        vec2 o = dir * texel;
        vec4 na = texture2D(tNormal, uv + o), nb = texture2D(tNormal, uv - o);
        minA = min(minA, min(na.a, nb.a));
        float ia = 1.0 / linDepth(uv + o), ib = 1.0 / linDepth(uv - o);
        float lap = abs(ia + ib - 2.0 * ic) / ic;
        float e = smoothstep(depthLo, depthHi, lap);
        float nd = 1.0 - dot(na.rgb * 2.0 - 1.0, nb.rgb * 2.0 - 1.0);
        return max(e, smoothstep(normalLo, normalHi, nd));
      }
      void main(){
        vec4 c = texture2D(tColor, vUv);
        vec4 n = texture2D(tNormal, vUv);
        if (n.a < 0.125) { gl_FragColor = vec4(c.rgb, defer > 0.5 ? 0.0 : 1.0); return; }   // a card pixel: its own outline is drawn on it
        float ic = 1.0 / linDepth(vUv), r = 0.5 * width * scale, minA = n.a, e = 0.0;
        e = max(e, edgeAt(vUv, vec2(r, 0.0), ic, minA));
        e = max(e, edgeAt(vUv, vec2(0.0, r), ic, minA));
        e = max(e, edgeAt(vUv, vec2(0.7071 * r, 0.7071 * r), ic, minA));
        e = max(e, edgeAt(vUv, vec2(0.7071 * r, -0.7071 * r), ic, minA));
        // half-way samples fill the middle of the line so it never splits in two
        e = max(e, edgeAt(vUv, vec2(0.5 * r, 0.0), ic, minA));
        e = max(e, edgeAt(vUv, vec2(0.0, 0.5 * r), ic, minA));
        if (minA < 0.125) e = 0.0;                                // right beside a card
        float strength = clamp((min(minA, n.a) - 0.25) / 0.75, 0.0, 1.0);
        gl_FragColor = defer > 0.5 ? vec4(c.rgb, e * strength) : vec4(mix(c.rgb, color, e * strength), 1.0);
      }`;
    const mat = ctx.passMat(frag, u);
    return {
      u, mat,
      run(pass, color, normal, depth, camera, target) {
        u.tColor.value = color; u.tNormal.value = normal; u.tDepth.value = depth; u.cNear.value = camera.near; u.cFar.value = camera.far;
        pass(mat, target);
      },
    };
  },
};
