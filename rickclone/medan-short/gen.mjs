import { writeFileSync, mkdirSync } from "node:fs";

const ROOT = new URL(".", import.meta.url).pathname;
mkdirSync(ROOT + "compositions", { recursive: true });

const DUR = 57.0;
const TITLE = "The Ghost Ship That Killed Everyone Aboard";

const SCENES = [
  { n: 1, shot: 1, start: 0.0,  dur: 5.8, kb: { from: { scale: 1.02, y: 20 },  to: { scale: 1.14, y: -14 }, ease: "power2.inOut" }, dipIn: false, dipOut: true },
  { n: 2, shot: 2, start: 5.8,  dur: 5.8, kb: { from: { scale: 1.16, x: -26 },  to: { scale: 1.04, x: 26 },  ease: "power2.inOut" }, dipIn: true,  dipOut: true },
  { n: 3, shot: 3, start: 11.6, dur: 5.8, kb: { from: { scale: 1.0 },          to: { scale: 1.18 },         ease: "power2.inOut" }, dipIn: true,  dipOut: true },
  { n: 4, shot: 4, start: 17.4, dur: 5.0, kb: { from: { scale: 1.12, y: 22 },  to: { scale: 1.34, y: -18 }, ease: "power2.inOut" }, dipIn: true,  dipOut: true },
  { n: 5, shot: 5, start: 22.4, dur: 5.6, kb: { from: { scale: 1.06 },         to: { scale: 1.2 },          ease: "power2.inOut" }, dipIn: true,  dipOut: true },
  { n: 6, shot: 6, start: 28.0, dur: 6.5, kb: { from: { scale: 1.14, x: 24 },  to: { scale: 1.06, x: -24 }, ease: "power2.inOut" }, dipIn: true,  dipOut: true },
  { n: 7, shot: 7, start: 34.5, dur: 5.5, kb: { from: { scale: 1.18 },         to: { scale: 1.36 },         durSec: 3.0, ease: "power3.inOut" }, dipIn: true, dipOut: true },
  { n: 8, shot: 8, start: 40.0, dur: 8.0, kb: { from: { scale: 1.16 },         to: { scale: 1.28 },         durSec: 1.6, ease: "power3.inOut" }, dipIn: true, dipOut: true, flash: true, shake: true },
  { n: 9, shot: 9, start: 48.0, dur: 9.0, kb: { from: { scale: 1.06 },         to: { scale: 1.24 },         ease: "power2.inOut" }, dipIn: true, dipOut: false, secondPunch: { at: 6.0, from: { scale: 1.24 }, to: { scale: 1.38 }, ease: "power2.inOut" } },
];

// ---------- index.html ----------
const hosts = SCENES.map(
  (s) => `      <div
        id="scene${s.n}"
        data-composition-id="scene${s.n}"
        data-composition-src="compositions/scene${s.n}.html"
        data-start="${s.start}"
        data-duration="${s.dur}"
        data-track-index="0"
        data-track-kind="graphics"
        data-width="1080"
        data-height="1920"
      ></div>`
).join("\n");

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>${TITLE}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <style>
      :root {
        --ground: #000000;
        --ink: #ffffff;
        --punch: #FFE040;
        --font-display: "Archivo Black", sans-serif;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: var(--ground); }
      #root { width: 100%; height: 100%; position: relative; background: var(--ground); }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${DUR}"
      data-width="1080"
      data-height="1920"
    >
${hosts}

      <div
        id="captions"
        data-composition-id="captions"
        data-composition-src="compositions/captions.html"
        data-start="0"
        data-duration="${DUR}"
        data-track-index="1"
        data-track-kind="captions"
        data-width="1080"
        data-height="1920"
      ></div>
    </div>
    <script>
      (function () {
        const tl = gsap.timeline({ paused: true });
        window.__timelines["main"] = tl;
        tl.seek(0);
      })();
    </script>
  </body>
</html>
`;
writeFileSync(ROOT + "index.html", indexHtml);

// ---------- scenes ----------
for (const s of SCENES) {
  const p = (v) => Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(", ");
  const kbDur = s.kb.durSec || (s.secondPunch ? s.secondPunch.at : Math.max(s.dur - 0.15, 0.5));
  const kbFrom = s.kb.from, kbTo = s.kb.to;

  const secondPunch = s.secondPunch
    ? `
      tl.fromTo("#s${s.n}-kb", { ${p(s.secondPunch.from)} }, { ${p(s.secondPunch.to)}, duration: ${s.dur - s.secondPunch.at - 0.05}, ease: "${s.secondPunch.ease}", immediateRender: false }, ${s.secondPunch.at});`
    : "";

  const kbTransform = `{ ${p(kbFrom)} }, { ${p(kbTo)}, z: 0.001, force3D: true, duration: ${kbDur.toFixed(3)}, ease: "${s.kb.ease}" }`;

  const dipIn = s.dipIn
    ? `
      tl.fromTo("#s${s.n}-dip", { opacity: 0.35 }, { opacity: 0, duration: 0.14, ease: "power2.out" }, 0);`
    : "";
  const dipOut = s.dipOut
    ? `
      tl.to("#s${s.n}-dip", { opacity: 0.35, duration: 0.1, ease: "power2.in" }, ${Number(s.dur - 0.1).toFixed(2)});`
    : "";

  const flash = s.flash
    ? `
      tl.fromTo("#s${s.n}-flash", { opacity: 1 }, { opacity: 0, duration: 0.14, ease: "power2.out" }, 0);`
    : "";
  const flashEl = s.flash ? `    <div id="s${s.n}-flash" data-layout-ignore></div>\n` : "";
  const flashStyle = s.flash
    ? `    #s${s.n}-flash { position: absolute; inset: 0; background: #ffffff; opacity: 0; }\n`
    : "";

  const shake = s.shake
    ? `
      let seed = 20247;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const kf = [];
      const shakeLen = ${Math.min(s.dur - 0.2, 2.3).toFixed(2)};
      for (let t = 0.08; t < shakeLen; t += 0.1) {
        const a = 5.0 * (1 - (t - 0.08) / (shakeLen - 0.08));
        kf.push({ x: ((rnd() * 2 - 1) * a).toFixed(2), y: ((rnd() * 2 - 1) * a).toFixed(2), duration: 0.1, ease: "none" });
      }
      tl.to("#s${s.n}-shakewrap", { keyframes: kf }, 0.08);`
    : "";
  const shakeWrapOpen = s.shake ? `    <div id="s${s.n}-shakewrap" style="position:absolute; inset:0;">\n` : "";
  const shakeWrapClose = s.shake ? `    </div>\n` : "";

  const step = (0.33).toFixed(2);
  const sceneHtml = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body>
<template>
  <style>
    #root { position: absolute; inset: 0; background: #000; overflow: hidden; }
    #s${s.n}-shakewrap { position: absolute; inset: 0; }
    #s${s.n}-kb { position: absolute; inset: 0; will-change: transform; }
    #s${s.n}-kb img { position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; }
    #s${s.n}-img-b { opacity: 0; }
    #s${s.n}-dip { position: absolute; inset: 0; background: #000; opacity: 0; }
${flashStyle}  </style>
  <div id="root" data-composition-id="scene${s.n}" data-width="1080" data-height="1920">
${shakeWrapOpen}    <div id="s${s.n}-kb" data-layout-allow-overflow>
      <img id="s${s.n}-img-a" src="assets/shot${s.shot}_a.jpg" alt="" />
      <img id="s${s.n}-img-b" src="assets/shot${s.shot}_b.jpg" alt="" />
    </div>
${shakeWrapClose}    <div id="s${s.n}-dip" data-layout-ignore></div>
${flashEl}  </div>
  <script>
    (function () {
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#s${s.n}-kb", ${kbTransform}, 0);${secondPunch}

      for (let i = 1, t = ${step}; t < ${s.dur}; i++, t += ${step}) {
        tl.set("#s${s.n}-img-b", { opacity: i % 2 }, Number(t.toFixed(3)));
      }${dipIn}${dipOut}${flash}${shake}

      window.__timelines["scene${s.n}"] = tl;
    })();
  </script>
</template>
</body>
</html>
`;
  writeFileSync(ROOT + `compositions/scene${s.n}.html`, sceneHtml);
}

// ---------- captions ----------
const GROUPS = [
  { id: "g01", text: "IN JUNE 1947,", start: 0.4, end: 2.6 },
  { id: "g02", text: "RADIO OPERATORS HEARD", start: 2.6, end: 4.7 },
  { id: "g03", text: "A TERRIFIED CALL.", start: 4.7, end: 6.4, giant: true, punch: "CALL." },
  { id: "g04", text: "THE CALL CAME FROM", start: 6.7, end: 8.4 },
  { id: "g05", text: "A DUTCH FREIGHTER", start: 8.4, end: 9.6 },
  { id: "g06", text: "IN THE MALACCA STRAIT.", start: 9.6, end: 11.5, punch: "MALACCA" },
  { id: "g07", text: "THE OPERATOR CLAWED", start: 11.9, end: 13.4 },
  { id: "g08", text: "AT HIS MICROPHONE", start: 13.4, end: 14.8 },
  { id: "g09", text: "THE CAPTAIN COLLAPSED.", start: 14.8, end: 16.3 },
  { id: "g10", text: "DEAD.", start: 16.3, end: 17.4, giant: true, punch: "DEAD." },
  { id: "g11", text: "HIS FINAL TRANSMISSION:", start: 17.8, end: 19.6 },
  { id: "g12", text: "I DIE.", start: 19.6, end: 22.2, giant: true, punch: "DIE." },
  { id: "g13", text: "THE RESCUE SHIP SILVER STAR", start: 22.8, end: 25.2 },
  { id: "g14", text: "REACHED THE DRIFTING VESSEL.", start: 25.2, end: 27.6 },
  { id: "g15", text: "THE ENTIRE CREW LAY FROZEN", start: 28.3, end: 30.4, punch: "FROZEN" },
  { id: "g16", text: "EYES WIDE. MOUTHS OPEN.", start: 30.4, end: 32.6, punch: "WIDE." },
  { id: "g17", text: "FACES LOCKED IN TERROR.", start: 32.6, end: 34.4 },
  { id: "g18", text: "NOT A SINGLE WOUND.", start: 34.9, end: 37.2, punch: "WOUND." },
  { id: "g19", text: "SOMETHING STOPPED THEIR HEARTS.", start: 37.2, end: 39.8, punch: "HEARTS." },
  { id: "g20", text: "BEFORE THEY COULD TOW HER", start: 40.6, end: 42.8 },
  { id: "g21", text: "SMOKE POURED FROM HER HOLD.", start: 42.8, end: 44.8, punch: "SMOKE" },
  { id: "g22", text: "THE GHOST SHIP EXPLODED.", start: 44.8, end: 47.6, punch: "EXPLODED." },
  { id: "g23", text: "NO REGISTRY. NO PORT.", start: 48.6, end: 50.4 },
  { id: "g24", text: "NO RECORD.", start: 50.4, end: 51.8, giant: true, punch: "RECORD." },
  { id: "g25", text: "THE SHIP THAT TERRIFIED THE OCEAN", start: 52.2, end: 54.6 },
  { id: "g26", text: "NEVER EXISTED.", start: 54.6, end: 56.8, giant: true, punch: "EXISTED." },
];

const groupEls = GROUPS.map((g) => {
  const spans = g.text.split(" ").map((w) => {
    const bare = w.replace(/[,."“”…-]+$/, "");
    const barePunch = g.punch ? g.punch.replace(/[,."“”…-]+$/, "") : "";
    const isPunch = g.punch && (w === g.punch || bare === g.punch || bare === barePunch || w === barePunch);
    return `      <span class="w${isPunch ? " punch" : ""}" data-layout-allow-overlap><span class="stroke" aria-hidden="true">${w}</span><span class="fill">${w}</span></span>`;
  }).join("\n");
  const cls = ["caption-group", g.giant ? "giant" : "", g.punch ? "has-punch" : ""].filter(Boolean).join(" ");
  return `    <div id="${g.id}" class="${cls}" data-layout-allow-safe-zone>\n${spans}\n    </div>`;
}).join("\n");

const captionGroupsJs = GROUPS.map(
  (g) => `          { id: "#${g.id}", start: ${g.start}, end: ${g.end}${g.punch ? `, punch: "#${g.id} .punch"` : ""} }`
).join(",\n");

const captionsHtml = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body>
<template>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920">
    <style>
      #root { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
      .caption-group {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 620px;
        text-align: center;
        font-family: "Archivo Black", sans-serif;
        font-weight: 400;
        font-size: 76px;
        line-height: 1.08;
        color: #ffffff;
        text-transform: uppercase;
        letter-spacing: 0.01em;
        opacity: 0;
        visibility: hidden;
        overflow: visible;
        max-width: none;
      }
      .caption-group.giant { font-size: 168px; bottom: 560px; }
      .caption-group .w {
        position: relative;
        display: inline-block;
        line-height: 1.08;
        vertical-align: bottom;
      }
      .caption-group .w .stroke {
        -webkit-text-stroke: 16px #000000;
        text-stroke: 16px #000000;
      }
      .caption-group .w .fill {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      .caption-group .punch .fill { color: var(--punch, #FFE040); font-size: 1.3em; }
      .caption-group.giant .punch .fill { font-size: 1em; }
      .caption-group.giant .punch { color: #FFE040; }
    </style>
${groupEls}
    <script>
      (function () {
        const tl = gsap.timeline({ paused: true });
        const groups = [
${captionGroupsJs}
        ];
        groups.forEach((g) => {
          tl.fromTo(g.id,
            { opacity: 0, scale: 0.85 },
            { opacity: 1, scale: 1, duration: 0.2, ease: "back.out(1.7)" },
            g.start
          );
          if (g.punch) {
            tl.fromTo(g.id + " .punch",
              { scale: 1.45 },
              { scale: 1, duration: 0.3, ease: "expo.out", immediateRender: false },
              g.start
            );
          }
          tl.set(g.id, { visibility: "visible" }, g.start);
          tl.to(g.id, { opacity: 0, duration: 0.12, ease: "power2.in" }, g.end - 0.12);
          tl.set(g.id, { opacity: 0, visibility: "hidden" }, g.end);
        });
        window.__timelines["captions"] = tl;
      })();
    </script>
  </div>
</template>
</body>
</html>
`;
writeFileSync(ROOT + "compositions/captions.html", captionsHtml);
console.log(`written: index.html, compositions/scene1-${SCENES.length}.html, compositions/captions.html (${DUR}s, ${GROUPS.length} caption groups)`);
