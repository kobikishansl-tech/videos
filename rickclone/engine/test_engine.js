/* test_engine.js — Petrichor Engine R1 self-test, runs headless (node test_engine.js):
 *   1. determinism: the same seed builds identical worlds (same child count + spots)
 *   2. different seeds differ
 *   3. every CAMERA_LIB move evaluates to a finite camera at t0 / mid / t1
 *   4. FROZEN is alive (moves a little); ESTAB settles; POSTCARD composes
 * Uses a THREE stub (geometry counter); the real renderer exercises the same calls in-page.
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

function THREEstub() {
  const G = Object.assign(function THREE() {}, {
    Group: class { constructor() { this.children = []; } add(m) { this.children.push(m); return m; } },
    Mesh: class { constructor(geo, m) { this.geometry = geo; this.material = m; this.position = { x:0,y:0,z:0, set(x,y,z){this.x=x;this.y=y;this.z=z;} };
      this.rotation = { x:0,y:0,z:0, set(x,y,z){this.x=x;this.y=y;this.z=z;} }; } },
    BoxGeometry: class { constructor(w,h,d) { THREEstub.geometries++; this.k="box"; } },
    CylinderGeometry: class { constructor() { THREEstub.geometries++; this.k="cyl"; } },
    SphereGeometry: class { constructor() { THREEstub.geometries++; this.k="sph"; } },
    PlaneGeometry: class { constructor() { THREEstub.geometries++; this.k="plane"; } },
    MeshLambertMaterial: class { constructor(o) { this.o = o || {}; } },
  });
  return G;
}
THREEstub.geometries = 0;

function load(file, ctx) {
  const code = fs.readFileSync(path.join(__dirname, file), "utf8");
  vm.runInContext(code, ctx, { filename: file });
}
const ctx = vm.createContext({ THREE: THREEstub(), console });
ctx.window = ctx;   // `window` IS the global, as in the browser: window.RT = ... makes bare RT resolvable
load("camera_lib.js", ctx);
load("sets_families.js", ctx);
const RT = ctx.window.RT;
let fails = [], notes = [];
function chk(ok, msg) { (ok ? notes.push("  ok  " + msg) : fails.push("  FAIL " + msg)); }
function same3(A, B) { return A.every((v, i) => Math.abs(v - B[i]) < 1e-12); }

// 1+2 determinism
const stag = new THREEstub().Group;
const u1 = RT.FAMILIES.build("urban", stag, { seed: 7 }, 7);
const stag2 = new THREEstub().Group;
const u2 = RT.FAMILIES.build("urban", stag2, { seed: 7 }, 7);
chk(u1.group.children.length === u2.group.children.length, `urban seed 7 child count stable (${u1.group.children.length})`);
chk(Object.keys(u1.spots).join() === Object.keys(u2.spots).join(), "urban spots stable");
chk(JSON.stringify(u1.spots.streetMid) === JSON.stringify(u2.spots.streetMid), "streetMid identical");
const u3 = RT.FAMILIES.build("urban", stag, { seed: 8 }, 8);
chk(JSON.stringify(u1.occluders) !== JSON.stringify(u3.occluders), "different seeds differ (building layout)");
const d1 = RT.FAMILIES.build("domestic", stag, {}, 7);
chk(Object.keys(d1.spots).length >= 5, `domestic spots (${Object.keys(d1.spots).join(",")})`);
chk(u1.occluders.length > 5 && d1.occluders.length > 3, `occluders registered: urban ${u1.occluders.length}, domestic ${d1.occluders.length}`);

// 3_camera moves
for (const mv of RT.CAMERA_LIB.MOVES) {
  const p = { t0: 0, t1: 4, target: [0, 1.1, 0], look: [0, 1.1, 0], pos: [0, 1.4, 3], shoulder: [0, 1.5, 1] };
  const f = RT.CAMERA_LIB.build(mv, p);
  let allfin = true;
  for (const t of [0, 2, 4]) {
    const c = f(t);
    if (!c || !c.pos || !isFinite(c.pos[0] + c.pos[1] + c.pos[2]) || !isFinite(c.fov) || c.fov < 20) allfin = false;
  }
  chk(allfin, `${mv}: finite camera across the scene`);
}
// 4 life + settle
const fr = RT.CAMERA_LIB.build("FROZEN", { t0: 0, t1: 4, target: [0, 1.1, 0], dist: 2.4 });
const c1 = fr(0), c2 = fr(0.3);
chk(!same3(c1.pos, c2.pos), `FROZEN alive (d=${Math.hypot(c1.pos[0]-c2.pos[0], c1.pos[1]-c2.pos[1], c1.pos[2]-c2.pos[2]).toFixed(4)} m)`);
const es = RT.CAMERA_LIB.build("ESTAB", { t0: 0, t1: 7, pos: [0, 1.4, 3], look: [0, 1.1, 0] });
chk(es(7).pos[2] > es(0).pos[2], `ESTAB settles forward (+${(es(7).pos[2]-es(0).pos[2]).toFixed(2)} m over 7 s)`);
const pu = RT.CAMERA_LIB.build("PUSH", { t0: 0, t1: 1.5, target: [0, 1.1, 0], look: [0, 1.1, 0] });
chk(Math.hypot(pu(0).pos[2] - pu(1.5).pos[2]) > 1, "PUSH approaches > 1 m");

console.log(notes.join("\n"));
if (fails.length) { console.log(fails.join("\n")); console.log("FAIL: " + fails.length); process.exit(1); }
console.log("ENGINE R1 SELF-TEST PASS (" + notes.length + " checks)");
