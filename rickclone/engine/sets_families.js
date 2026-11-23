/* sets_families.js — Petrichor Engine R1: seeded parametric set builders for the two R1
 * families, urban and domestic (blueprint M2). Pure functions of (params, seed): same seed,
 * same world. Builders depend only on the injected THREE and a tiny helper set, so they run
 * inside any hyperframes page (THREE is global there).
 *
 *   RT.FAMILIES.build("urban", stage, { palette, seed, lanes: 5, lamps: 3 }, THREE);
 *     -> { name, group, spots: {streetA.., door, corner.., lamp}, occluders: [box...], rnd }
 *
 * urban  — a street corridor: earth/asphalt strip, sidewalk slabs, N building blocks each side
 *          (window grids, doors, shopfront strip on near blocks), lamps, props (barrel, crate,
 *          signpost). Bright-top/dark-bottom composition by construction (sky above).
 * domestic — one room-box: floor, back + side walls, ceiling with a lit point source, furniture
 *          kit (table, chairs, bed, shelf, window with a light shaft). Warm preset default.
 *
 * Detail budget (blueprint M2/M6): geometry only in the foreground/midground; the far layer is
 * a gradient slab + fog handled by the host. Orchestration (lighting presets, grade) stays in
 * the host page — builders only place geometry and register occluders.
 */
window.RT = window.RT || {};
RT.FAMILIES = (function () {
  "use strict";
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mat(hex, opts) {
    return new THREE.MeshLambertMaterial(Object.assign({ color: hex }, opts || {}));
  }
  function box(g, w, h, d, hex, x, y, z, occluders) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(hex));
    m.position.set(x, y + h / 2, z);
    g.add(m);
    if (occluders) occluders.push({ min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + h, z + d / 2] });
    return m;
  }
  function plane(g, w, d, hex, x, y, z, ry) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(hex));
    m.rotation.x = -Math.PI / 2; if (ry) m.rotation.z = ry;
    m.position.set(x, y, z);
    g.add(m); return m;
  }

  function urban(stage, params, seedInt) {
    var rnd = mulberry32((seedInt || 7) + 1);
    var P = params || {};
    var pal = P.palette || ["#5a5148", "#6e6156", "#7a6a58", "#4c443c"];
    var g = new THREE.Group();
    var occ = [], spots = {};
    var lanes = P.lanes || 5, L = lanes * 6;      // street runs away in -z; ~6 m per lane
    var W = P.width || 7;
    // ground: street + sidewalks
    plane(g, W, L + 8, "#3c3630", 0, 0, -L / 2 + 4);
    plane(g, 1.4, L + 8, "#57514a", -W / 2 + 0.8, 0.012, -L / 2 + 4);
    plane(g, 1.4, L + 8, "#57514a", W / 2 - 0.8, 0.012, -L / 2 + 4);
    // buildings each side
    var z = 0, doorI = 0, corners = [];
    while (z > -L) {
      var w = 4 + rnd() * 3, h = 3.2 + rnd() * (rnd() < 0.3 ? 3.4 : 1.6);
      var x = -(W / 2 + w / 2 + 0.4);
      for (var side = 0; side < 2; side++) {
        var c = pal[Math.floor(rnd() * pal.length)];
        var b = box(g, w, h, 4.6, c, x, 0, z - 2.3, occ);
        // window grid on the street face + door on some blocks
        var rows = Math.max(1, Math.floor(h / 1.7)), dark = "#1c1916";
        for (var r = 0; r < rows; r++)
          for (var k = 0; k < 3; k++)
            box(g, 0.7, 0.9, 0.06, dark, x + w / 2 * (side ? -1 : 1) * 0 - (side ? -1 : 1) * 0.01,
                1.0 + r * 1.7, z - 1.2 - k * 1.1 + (side ? 0 : w * 0), occ);
        if (doorI % 3 === 0) {
          var dz = doorI % 6 === 0 ? z - 2.3 : z;
          box(g, 1.1, 2.2, 0.08, dark, x - (side ? -1 : 1) * 0, 0, z - 2.3, occ);
          spots["door" + doorI] = [x + (side ? 1.0 : -1.0) * (w / 2 + 0.9), 0, z - 2.3];
        }
        spots["wallCorner" + doorI] = [x + (side ? 0.9 : -0.9), 0, z - 3.6];
        doorI++; corners.push([x * 0, z - 3.6]);
        x = -(x) + 0.8; // mirror to the right side
        z -= (side) ? 0 : 0.001; // (x flip done in-place)
      }
      z -= 6.0;
    }
    // street furniture: lamps + props
    var lampX = W / 2 - 1.2;
    for (var li = 0; li < (P.lamps || 3); li++) {
      var lz = -2 - li * (L / (P.lamps || 3));
      var m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2), mat("#2c2824"));
      m.position.set(lampX, 1.6, lz); g.add(m);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.16), mat("#ffd98a", { emissive: "#ffd98a" }));
      head.position.set(lampX, 3.25, lz); g.add(head);
      spots["lamp" + li] = [lampX - 1.0, 0, lz];
    }
    var propX = -lampX;
    for (var pi = 0; pi < (P.props || 4); pi++) {
      var pz = -3.5 - rnd() * (L - 6);
      if (pi % 2) {
        var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.9, 10), mat("#6a4a2c"));
        bar.position.set(propX, 0.45, pz); g.add(bar); occ.push({ min: [propX - .35, 0, pz - .35], max: [propX + .35, .9, pz + .35] });
      } else {
        box(g, 0.7, 0.7, 0.7, "#6b5a40", propX, 0, pz, occ);
      }
    }
    spots.streetA = [0, 0, -1.5];
    spots.streetMid = [0, 0, -L * 0.5];
    spots.streetFar = [0, 0, -L + 2];
    return { name: "urban", group: g, spots: spots, occluders: occ,
             bounds: { x: [-W / 2 - 1, W / 2 + 1], z: [1, -L - 1] }, rnd: rnd };
  }

  function domestic(stage, params, seedInt) {
    var rnd = mulberry32((seedInt || 7) + 2);
    var P = params || {};
    var pal = P.palette || ["#5c4f42", "#7a6a58", "#6a5a4c", "#847660"];
    var g = new THREE.Group(), occ = [], spots = {};
    var W = P.width || 6, D = P.depth || 5, H = P.height || 2.7;
    plane(g, W, D, "#4a4038", 0, 0, -D / 2);                       // floor
    box(g, W, H, 0.2, pal[0], 0, 0, -D, occ);                      // back wall
    box(g, 0.2, H, D, pal[1], -W / 2, 0, -D / 2, occ);             // left wall
    box(g, 0.2, H, D, pal[1], W / 2, 0, -D / 2, occ);              // right wall
    box(g, W, 0.15, D, pal[2], 0, H, -D / 2, occ);                 // ceiling slab
    // window + shaft on the back wall
    var wx = W * 0.25;
    box(g, 1.2, 1.1, 0.08, "#242020", wx, 1.1, -D + 0.14, occ);
    // furniture kit
    box(g, 1.6, 0.08, 0.9, pal[3], -W * 0.25, 0.72, -D * 0.45, occ); // table top
    for (var t2 = 0; t2 < 4; t2++)
      box(g, 0.08, 0.72, 0.08, "#5c4a34", -W * 0.25 + (t2 % 2 ? 0.65 : -0.65), 0, -D * 0.45 + (t2 < 2 ? 0.35 : -0.35));
    box(g, 0.5, 0.5, 0.5, pal[1], -W * 0.25, 0, -D * 0.45 - 1.0, occ); // chair/block
    box(g, 2.0, 0.55, 0.9, "#7a5a40", W * 0.25, 0, -D * 0.75, occ);    // bed
    box(g, 0.9, 1.5, 0.3, pal[3], -W / 2 + 0.8, 0, -0.7, occ);         // shelf
    spots.center = [0, 0, -D * 0.5];
    spots.table = [-W * 0.25, 0, -D * 0.45 + 0.8];
    spots.bed = [W * 0.25, 0, -D * 0.75 + 0.9];
    spots.shelf = [-W / 2 + 1.3, 0, -0.7];
    spots.window = [wx, 0, -D + 0.8];
    return { name: "domestic", group: g, spots: spots, occluders: occ,
             bounds: { x: [-W / 2 + 0.4, W / 2 - 0.4], z: [-0.5, -D + 0.4] }, rnd: rnd };
  }

  var BUILT = { urban: urban, domestic: domestic };
  return {
    FAMILIES: Object.keys(BUILT),
    build: function (family, stage, params, seed) {
      if (!BUILT[family]) throw new Error("set family not built in R1: " + family
        + " (industry/nature/period planned in R2)");
      return BUILT[family](stage, params, seed);
    },
  };
})();
