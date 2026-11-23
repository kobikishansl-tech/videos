/* grade.js: the last pass. Linear light in, the frame out (1080 x 1920, sRGB).
 *
 * In order: a 2 x 2 box down from the internal size (one bilinear tap at the shared corner), to sRGB,
 * saturation split by hue (reds get `satRed`, every other hue `sat`; near-white stays near-white so pale heads
 * do not turn beige), an S-curve for contrast, cool tint in the shadows and warm in the highlights, a vignette
 * (darker corners), then a small lift so the darkest ink sits about 20-25 of 255, not 0.
 * No grain by default (the rule book: "No grain"); the uniform is kept for other films.
 *
 * Measured against the reference (64 frames): darkest 0.1% ~10-25, other-hue saturation ~142, red ~136,
 * luma p5-p95 ~185, corners ~0.70 of the centre.
 *
 * Tunables (stage.grade.u.*.value): sat, satRed, contrast + pivot (linear stretch about pivot), curve (0 none .. 1 full smoothstep S), shadowTint (RGB multiplier),
 * shadowAmt, warm, warmAmt, lift (RGB), vignette, vigInner, vigOuter, grain.
 */
window.SF = window.SF || {};
SF.grade = {
  create(ctx) {
    const u = {
      tSrc: { value: null }, texel: { value: new THREE.Vector2(1 / ctx.IW, 1 / ctx.IH) },
      sat: { value: 1.6 }, satRed: { value: 0.75 }, curve: { value: 0.5 }, contrast: { value: 1.18 }, pivot: { value: 0.45 },
      shadowTint: { value: new THREE.Vector3(0.8, 0.86, 1.2) }, shadowAmt: { value: 0.55 },
      warm: { value: new THREE.Vector3(1.05, 1.0, 0.92) }, warmAmt: { value: 0.6 },
      lift: { value: new THREE.Vector3(0.035, 0.024, 0.05) }, vignette: { value: 0.5 }, vigInner: { value: 0.3 }, vigOuter: { value: 1.0 },
      grain: { value: 0.0 },
    };
    const frag = `
      uniform sampler2D tSrc; uniform vec2 texel; uniform float sat, satRed, curve, contrast, pivot, shadowAmt, warmAmt, vignette, vigInner, vigOuter, grain;
      uniform vec3 shadowTint, warm, lift;
      varying vec2 vUv;
      vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      vec3 rgb2hsv(vec3 c){ vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y); return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x); }
      void main(){
        vec3 c = clamp(toSRGB(texture2D(tSrc, vUv).rgb), 0.0, 1.0);   // vUv sits on the corner of 4 internal texels at scale 2
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        // saturation by hue: reds (hue within ~20 degrees of 0) apart from the rest
        vec3 hsv = rgb2hsv(c);
        float rd = min(hsv.x, 1.0 - hsv.x);
        float red = (1.0 - smoothstep(0.03, 0.06, rd)) * smoothstep(0.12, 0.3, hsv.y);
        float s = mix(sat, satRed, red);
        s = mix(s, 1.0, smoothstep(0.78, 0.95, l) * (1.0 - smoothstep(0.1, 0.3, hsv.y)));   // pale heads and paper stay pale
        c = clamp(mix(vec3(l), c, s), 0.0, 1.0);
        // contrast: an S-curve on each channel (keeps 0 and 1 in place)
        c = clamp((c - pivot) * contrast + pivot, 0.0, 1.0);
        c = mix(c, c * c * (3.0 - 2.0 * c), curve);
        l = dot(c, vec3(0.299, 0.587, 0.114));
        float sh = 1.0 - smoothstep(0.05, 0.6, l), hi = smoothstep(0.55, 1.0, l);
        c = mix(c, c * shadowTint, sh * shadowAmt);
        c = mix(c, c * warm, hi * warmAmt);
        vec2 q = vUv - 0.5; float r = length(q) * 1.4142;                         // 0 centre, 0.71 mid-edge, 1 in a corner (elliptical in the frame)
        c *= 1.0 - vignette * smoothstep(vigInner, vigOuter, r) ;
        c = lift + c * (1.0 - lift);
        c += (hash(floor(vUv / texel)) - 0.5) * grain;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`;
    const mat = ctx.passMat(frag, u);
    return { u, mat, run(pass, src, target) { u.tSrc.value = src; pass(mat, target); } };
  },
};
