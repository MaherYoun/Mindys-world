/* Mindy's open world — world generation.
   Every place she has marked visited becomes a city district on one continuous
   landmass. Districts keep their real-world direction from each other (north is
   up on the map) but distances are compressed so they are a drive apart, and
   the continent grows around the highways that join them. */
import * as THREE from "./vendor/three.module.min.js";
import { TAU, clamp, lerp, smoothstep, rng, hash, pick, M, G, Builder, treeGeometry, lampGeometry, lampHeadGeometry, col } from "./ow-assets.js";

export const REGIONS = {
  Africa: { ground: "#9a9a52", walls: ["#e0bd8f", "#cf9a6c", "#e9d3ad", "#c08460", "#f1e4c9", "#d7a77a"], roofs: ["#8a5a3c", "#6e4a35", "#a3673f"], trees: ["acacia", "acacia", "broad", "palm"], landmark: "dome", tall: .75, pitched: false, accent: "#ffb347" },
  "The Americas": { ground: "#6f9a4a", walls: ["#f2c6a0", "#e88e7a", "#8cc7c1", "#f4dd8a", "#c9a3d8", "#f3efe6", "#9fd0a8"], roofs: ["#b5523b", "#9b4632", "#7a4f3a"], trees: ["palm", "palm", "broad"], landmark: "pyramid", tall: 1, pitched: true, accent: "#ff8a5c" },
  Europe: { ground: "#6b9450", walls: ["#efe6d2", "#e2d1b3", "#d8c0a0", "#c9b8a6", "#f0d9c2", "#b8c4c9", "#e8c9b5"], roofs: ["#a2493a", "#5d6470", "#8c3f33", "#4d5560"], trees: ["broad", "broad", "pine"], landmark: "clock", tall: .8, pitched: true, accent: "#ffd27a" },
  Caucasus: { ground: "#7f9b55", walls: ["#d9a48f", "#e5c2a8", "#c98f7a", "#ead8c4", "#cdb29a"], roofs: ["#5a5f6b", "#7a4d42", "#6a6f78"], trees: ["pine", "broad", "pine", "orange"], landmark: "tower", tall: .8, pitched: true, accent: "#ffc47a" },
  "Southeast Asia": { ground: "#5c9a48", walls: ["#f4f1ea", "#f6e1b5", "#cfe3d8", "#f1c9b0", "#e6e9ef", "#f6d0d8"], roofs: ["#b4473a", "#c9822f", "#3f6a5e"], trees: ["palm", "palm", "broad"], landmark: "stupa", tall: 1.15, pitched: false, accent: "#ffd36a" },
  "East Asia": { ground: "#6a9a52", walls: ["#d7dde3", "#e9e4dc", "#c9ced6", "#efe8de", "#d9cfc4"], roofs: ["#2f3e4f", "#7a2f2f", "#3b4a3f"], trees: ["blossom", "broad", "pine"], landmark: "pagoda", tall: 1.4, pitched: false, accent: "#ff9fb8" },
  "Silk Road": { ground: "#b2a068", walls: ["#e3cfa5", "#d8b98a", "#ecdcbc", "#c9a77a", "#e8d5b5"], roofs: ["#3f7fae", "#2f6a8f", "#b08a5a"], trees: ["poplar", "poplar", "broad"], landmark: "blueDome", tall: .65, pitched: false, accent: "#5fc3ff" },
};
const BIG = new Set(["Nairobi", "Mexico City", "São Paulo", "Rio de Janeiro", "Bogotá", "Lima", "Buenos Aires", "Santiago", "Istanbul", "Bangkok", "Singapore", "Kuala Lumpur", "Jakarta", "Ho Chi Minh City", "Hanoi", "Manila", "Taipei", "Hong Kong", "Shanghai", "Beijing", "Shenzhen", "Guangzhou", "Chengdu", "Almaty", "Tashkent", "Baku", "Athens", "Warsaw", "Prague", "Budapest", "Stockholm", "Bucharest", "Belgrade", "Cape Town", "Medellín", "Panama City", "Kaohsiung", "Hangzhou", "Kunming", "Xi'an", "Astana", "Yerevan", "Tbilisi", "Sofia", "Helsinki", "Istanbul", "Dubrovnik"]);
const NEON = ["#ff4f9a", "#4ff0ff", "#ffd84f", "#9b5cff", "#5cff9b", "#ff7a3d"];
const S = 36; // block pitch: 26 m block + 10 m street

/* ---------- Planning (pure; unit-tested) ---------- */
const greatCircle = (a, b) => {
  const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h))) / r;
};
export function planWorld(places, { visited = {}, currentId = null, scope = "all", coords }) {
  // A country's world holds every stop on the journey in that country; "all" holds the whole journey.
  const chosen = places.filter(p => scope === "all" || p.country === scope || p.id === currentId && !places.some(q => q.country === scope));
  const list = chosen.map(p => {
    const [lat, lon] = coords(p), v = !!visited[p.id], big = BIG.has(p.city);
    return { place: p, id: p.id, lat, lon, visited: v, current: p.id === currentId, big, R: big ? 128 : 100, style: REGIONS[p.region] || REGIONS.Caucasus };
  });
  const N = list.length;
  if (!N) return { districts: [], edges: [] };
  const meanLat = list.reduce((s, d) => s + d.lat, 0) / N, k = Math.cos(meanLat * Math.PI / 180);
  list.forEach(d => { d.x = d.lon * k * 60; d.z = -d.lat * 60; });
  // Localised stress layout: nearby cities keep their geometry best.
  const target = (a, b) => 230 + 170 * Math.sqrt(greatCircle(a, b)) + (a.R + b.R - 200);
  if (N > 1) {
    const T = list.map(a => list.map(b => a === b ? 0 : target(a, b)));
    for (let it = 0; it < 160; it++) {
      for (let i = 0; i < N; i++) {
        let sx = 0, sz = 0, sw = 0; const a = list[i];
        for (let j = 0; j < N; j++) {
          if (i === j) continue; const b = list[j], t = T[i][j], w = 1 / (t * t);
          let dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz); if (d < 1e-3) { dx = Math.cos(i + j); dz = Math.sin(i + j); d = 1; }
          sx += w * (b.x + t * dx / d); sz += w * (b.z + t * dz / d); sw += w;
        }
        a.x = sx / sw; a.z = sz / sw;
      }
    }
    for (let it = 0; it < 80; it++) for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = list[i], b = list[j], min = a.R + b.R + 140, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1;
      if (d < min) { const push = (min - d) / 2; a.x -= dx / d * push; a.z -= dz / d * push; b.x += dx / d * push; b.z += dz / d * push; }
    }
  }
  const cx = list.reduce((s, d) => s + d.x, 0) / N, cz = list.reduce((s, d) => s + d.z, 0) / N;
  list.forEach((d, i) => { d.x = Math.round(d.x - cx); d.z = Math.round(d.z - cz); d.index = i; d.exits = []; });
  // Highways: minimum spanning tree plus a few short loops.
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), pairs = new Set(), edges = [];
  const addEdge = (a, b, extra) => {
    const key = a.index < b.index ? `${a.index}-${b.index}` : `${b.index}-${a.index}`; if (pairs.has(key) || a === b) return false;
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    const tooClose = (d, ang) => d.exits.some(e => Math.abs(Math.atan2(Math.sin(e.angle - ang), Math.cos(e.angle - ang))) < .5);
    const angA = Math.atan2(uz, ux), angB = Math.atan2(-uz, -ux);
    if (extra && (tooClose(a, angA) || tooClose(b, angB))) return false;
    const r = rng(`${a.id}>${b.id}`), bend = extra ? 0 : (r() - .5) * .3 * L;
    const P0 = { x: a.x + ux * a.R, z: a.z + uz * a.R }, P2 = { x: b.x - ux * b.R, z: b.z - uz * b.R };
    const make = off => { const P1 = { x: (P0.x + P2.x) / 2 - uz * off, z: (P0.z + P2.z) / 2 + ux * off }, len = Math.hypot(P2.x - P0.x, P2.z - P0.z), n = Math.max(2, Math.ceil(len / 8)), pts = [];
      for (let i = 0; i <= n; i++) { const t = i / n, m = 1 - t; pts.push({ x: m * m * P0.x + 2 * m * t * P1.x + t * t * P2.x, z: m * m * P0.z + 2 * m * t * P1.z + t * t * P2.z }); } return pts; };
    const blocked = pts => list.some(d => d !== a && d !== b && pts.some(p => Math.hypot(p.x - d.x, p.z - d.z) < d.R + 25));
    let pts = make(bend); if (blocked(pts)) { pts = make(0); if (extra && blocked(pts)) return false; }
    // Ease the ends so the highway meets the ring road at a right angle.
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    const e = { a: a.index, b: b.index, pts, cum, len: cum.at(-1), index: edges.length };
    edges.push(e); pairs.add(key);
    a.exits.push({ edge: e.index, end: "a", angle: Math.atan2(pts[0].z - a.z, pts[0].x - a.x) });
    b.exits.push({ edge: e.index, end: "b", angle: Math.atan2(pts.at(-1).z - b.z, pts.at(-1).x - b.x) });
    return true;
  };
  if (N > 1) {
    const inTree = new Set([0]), best = list.map((d, i) => ({ d: i ? dist(list[0], d) : Infinity, from: 0 }));
    while (inTree.size < N) {
      let bi = -1, bd = Infinity; for (let i = 0; i < N; i++) if (!inTree.has(i) && best[i].d < bd) { bd = best[i].d; bi = i; }
      addEdge(list[best[bi].from], list[bi], false); inTree.add(bi);
      for (let i = 0; i < N; i++) if (!inTree.has(i)) { const d = dist(list[bi], list[i]); if (d < best[i].d) best[i] = { d, from: bi }; }
    }
    for (const a of list) {
      const near = list.filter(b => b !== a).sort((p, q) => dist(a, p) - dist(a, q)).slice(0, 3);
      for (const b of near) if (dist(a, b) < 950) addEdge(a, b, true);
    }
  }
  return { districts: list, edges };
}

/* ---------- Spatial helpers ---------- */
class Grid {
  constructor(cell) { this.cell = cell; this.map = new Map(); }
  key(i, j) { return i * 73856093 ^ j * 19349663; }
  insert(item, x0, z0, x1, z1) { const c = this.cell; for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) { const k = this.key(i, j); let a = this.map.get(k); if (!a) this.map.set(k, a = []); a.push(item); } }
  query(x, z, r, out = []) { const c = this.cell, seen = new Set(); out.length = 0; for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) { const a = this.map.get(this.key(i, j)); if (a) for (const it of a) if (!seen.has(it)) { seen.add(it); out.push(it); } } return out; }
}
const vhash = (i, j) => { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return lerp(lerp(vhash(i, j), vhash(i + 1, j), u), lerp(vhash(i, j + 1), vhash(i + 1, j + 1), u), v); }
const fbm = (x, z) => vnoise(x, z) * .5 + vnoise(x * 2.1, z * 2.1) * .3 + vnoise(x * 4.3, z * 4.3) * .2;

/* ---------- World (three.js objects + queries) ---------- */
export class World {
  constructor(plan, tx, { quality = "high" } = {}) {
    this.plan = plan; this.tx = tx; this.quality = quality; this.low = quality === "low";
    this.districts = plan.districts; this.edges = plan.edges;
    this.group = new THREE.Group();
    this.colliders = new Grid(32); this.surfaces = new Grid(40); this.roadSegs = new Grid(60);
    this.lamps = []; this.collectibles = []; this.interactions = []; this.treeLists = {};
    this.makeMaterials();
    for (const e of this.edges) for (let i = 1; i < e.pts.length; i++) { const a = e.pts[i - 1], b = e.pts[i]; this.roadSegs.insert({ a, b }, Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z)); }
    this.buildTerrain();
    for (const d of this.districts) this.buildDistrict(d);
    for (const e of this.edges) this.buildHighway(e);
    this.scatterNature();
    this.buildInstances();
    this.buildMapImage();
  }
  makeMaterials() {
    const t = this.tx, off = (m, k) => { m.polygonOffset = true; m.polygonOffsetFactor = -k; m.polygonOffsetUnits = -k * 2; return m; };
    t.paving.repeat.set(5, 5);
    this.mats = {
      facade: new THREE.MeshStandardMaterial({ map: t.facade.map, emissiveMap: t.facade.emissive, emissive: "#ffffff", emissiveIntensity: 0, vertexColors: true, roughness: .86 }),
      glass: new THREE.MeshStandardMaterial({ map: t.glass.map, emissiveMap: t.glass.emissive, emissive: "#ffffff", emissiveIntensity: 0, vertexColors: true, roughness: .16, metalness: .6 }),
      solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88 }),
      metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .28, metalness: .85 }),
      neon: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      lamp: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      highway: off(new THREE.MeshStandardMaterial({ map: t.highway, roughness: .9 }), 4),
      ring: off(new THREE.MeshStandardMaterial({ map: t.highway, roughness: .9 }), 3),
      streetX: off(new THREE.MeshStandardMaterial({ map: t.street, roughness: .9 }), 1),
      streetZ: off(new THREE.MeshStandardMaterial({ map: t.street, roughness: .9 }), 2),
      plaza: off(new THREE.MeshStandardMaterial({ map: t.paving, roughness: .8 }), 6),
      ground: new THREE.MeshStandardMaterial({ map: t.grass, vertexColors: true, roughness: 1 }),
      water: new THREE.MeshStandardMaterial({ color: "#1f6683", roughness: .06, metalness: .15, normalMap: t.waterNormal, normalScale: new THREE.Vector2(.35, .35) }),
      portal: new THREE.MeshBasicMaterial({ map: t.swirl, color: "#8ff7ee", transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
      portalRing: new THREE.MeshBasicMaterial({ color: "#a8fff4", toneMapped: false }),
      flower: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, emissive: "#ffb000", emissiveIntensity: .35 }),
    };
    t.grass.repeat.set(1, 1); t.waterNormal.repeat.set(220, 220);
  }
  /* ----- queries ----- */
  groundAt(x, z) {
    const h = this.hf; if (!h) return 0;
    const fx = (x - h.x0) / h.cs, fz = (z - h.z0) / h.cs; if (fx < 0 || fz < 0 || fx >= h.nx - 1 || fz >= h.nz - 1) return -6;
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * h.nx + i, H = h.heights;
    return lerp(lerp(H[k], H[k + 1], u), lerp(H[k + h.nx], H[k + h.nx + 1], u), v);
  }
  surfaceAt(x, z) {
    let y = this.groundAt(x, z); const list = this.surfaces.query(x, z, 0, this._sq ||= []);
    for (const s of list) if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) y = Math.max(y, s.y);
    return y;
  }
  roadDistance(x, z, r = 60) {
    let best = Infinity; for (const { a, b } of this.roadSegs.query(x, z, r, this._rq ||= [])) {
      const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1);
      best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
    } return best;
  }
  districtAt(x, z, pad = 0) { for (const d of this.districts) if (Math.hypot(x - d.x, z - d.z) < d.R + pad) return d; return null; }
  nearestDistrict(x, z) { let best = null, bd = Infinity; for (const d of this.districts) { const v = Math.hypot(x - d.x, z - d.z) - d.R; if (v < bd) { bd = v; best = d; } } return best; }
  addBox(x0, z0, x1, z1, h = 30) { const c = { type: "box", x0, z0, x1, z1, h }; this.colliders.insert(c, x0, z0, x1, z1); return c; }
  addCircle(x, z, r) { const c = { type: "circle", x, z, r }; this.colliders.insert(c, x - r, z - r, x + r, z + r); return c; }
  addTree(kind, x, z, s = 1, collide = true) { (this.treeLists[kind] ||= []).push({ x, y: this.groundAt(x, z), z, s, ry: Math.random() * TAU }); if (collide && kind !== "sunflower" && kind !== "bush") this.addCircle(x, z, kind === "rock" ? 1 * s : .45 * s); }
  addLamp(x, z, ry, y = 0) {
    const c = Math.cos(ry), s = Math.sin(ry); // head at local (1.35, 5.98, 0)
    this.lamps.push({ x, z, y, ry, hx: x + 1.35 * c, hy: y + 5.98, hz: z - 1.35 * s });
  }
  /* ----- terrain ----- */
  buildTerrain() {
    const D = this.districts; let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const d of D) { x0 = Math.min(x0, d.x - d.R); z0 = Math.min(z0, d.z - d.R); x1 = Math.max(x1, d.x + d.R); z1 = Math.max(z1, d.z + d.R); }
    const pad = 560; x0 -= pad; z0 -= pad; x1 += pad; z1 += pad;
    const ext = Math.max(x1 - x0, z1 - z0), cs = clamp(ext / (this.low ? 220 : 340), 8, 28);
    const nx = Math.ceil((x1 - x0) / cs) + 1, nz = Math.ceil((z1 - z0) / cs) + 1;
    const circles = new Grid(300), samples = new Grid(80);
    for (const d of D) circles.insert({ x: d.x, z: d.z, r: d.R + 250 }, d.x, d.z, d.x, d.z);
    for (const e of this.edges) for (let s = 0; s <= e.len; s += 30) { const p = this.pointOnEdge(e, s); circles.insert({ x: p.x, z: p.z, r: 150 }, p.x, p.z, p.x, p.z); samples.insert(p, p.x, p.z, p.x, p.z); }
    const heights = new Float32Array(nx * nz), land = new Float32Array(nx * nz), colors = new Float32Array(nx * nz * 3);
    const sand = col("#d8c48e"), wet = col("#a99a72"), hillCol = col("#5c7d45"), rockCol = col("#8b8577"), tmp = new THREE.Color(), tint = new THREE.Color(), regionCols = new Map(), q = [];
    const regionCol = st => { if (!regionCols.has(st)) regionCols.set(st, col(st.ground)); return regionCols.get(st); };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * cs, z = z0 + j * cs, k = j * nx + i;
      let L = 400; for (const c of circles.query(x, z, 600, q)) L = Math.min(L, Math.hypot(x - c.x, z - c.z) - c.r);
      L += (fbm(x / 260, z / 260) - .5) * 150;
      let rd = 400; for (const p of samples.query(x, z, 160, q)) rd = Math.min(rd, Math.hypot(x - p.x, z - p.z));
      let dd = Infinity, nd = null, d2 = Infinity, nd2 = null;
      for (const d of D) { const v = Math.hypot(x - d.x, z - d.z) - d.R; if (v < dd) { d2 = dd; nd2 = nd; dd = v; nd = d; } else if (v < d2) { d2 = v; nd2 = d; } }
      let h = 0;
      if (L > 0) h = -Math.min(L / 22, 1) * 4.5 - Math.max(0, L - 90) * .01;
      const hillMask = smoothstep(26, 160, Math.min(rd, dd)) * smoothstep(-20, -170, L);
      h += hillMask * (Math.pow(fbm(x / 340 + 7, z / 340 - 3), 1.6) * 46 + 2);
      heights[k] = h; land[k] = L;
      tint.copy(regionCol(nd.style)); if (nd2 && d2 < 900) tint.lerp(regionCol(nd2.style), clamp(.5 - (d2 - dd) / 900, 0, .5));
      const n = fbm(x / 40, z / 40); tmp.copy(tint).multiplyScalar(.82 + n * .36);
      if (hillMask > .3) tmp.lerp(hillCol, (hillMask - .3) * .5);
      if (h > 14) tmp.lerp(rockCol, smoothstep(14, 34, h));
      const beach = smoothstep(-34, -6, L); tmp.lerp(sand, beach); if (h < -.6) tmp.lerp(wet, smoothstep(-.6, -2.5, h));
      colors[k * 3] = tmp.r; colors[k * 3 + 1] = tmp.g; colors[k * 3 + 2] = tmp.b;
    }
    this.hf = { x0, z0, x1, z1, cs, nx, nz, heights, land, colors };
    const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = x0 + i * cs, z = z0 + j * cs; pos[k * 3] = x; pos[k * 3 + 1] = heights[k]; pos[k * 3 + 2] = z; uv[k * 2] = x / 18; uv[k * 2 + 1] = z / 18; }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.setIndex(nx * nz > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1)); g.computeVertexNormals();
    const ground = new THREE.Mesh(g, this.mats.ground); ground.receiveShadow = true; ground.matrixAutoUpdate = false; this.group.add(ground);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), this.mats.water); water.rotation.x = -Math.PI / 2; water.position.set((x0 + x1) / 2, -.9, (z0 + z1) / 2); water.receiveShadow = false; this.water = water; this.group.add(water);
  }
  pointOnEdge(e, s) {
    s = clamp(s, 0, e.len); let lo = 0, hi = e.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (e.cum[m] <= s) lo = m; else hi = m; }
    const a = e.pts[lo], b = e.pts[hi], seg = e.cum[hi] - e.cum[lo] || 1, t = (s - e.cum[lo]) / seg;
    return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), tx: (b.x - a.x) / seg, tz: (b.z - a.z) / seg };
  }
  /* ----- districts ----- */
  buildDistrict(d) {
    const B = { facade: new Builder(), glass: new Builder(), solid: new Builder(), metal: new Builder(), neon: new Builder(), streetX: new Builder(), streetZ: new Builder(), ring: new Builder(), plaza: new Builder() };
    const r = rng(d.id + ":city"), st = d.style, { x: cx, z: cz, R } = d, tall = st.tall * (d.big ? 1.45 : 1);
    d.streets = []; d.blocks = []; d.buildings = []; d.pedLoops = []; d.parkSpots = []; d.parks = [];
    // Ring road
    const ring = []; for (let i = 0; i < 96; i++) { const a = i / 96 * TAU; ring.push({ x: cx + Math.cos(a) * R, z: cz + Math.sin(a) * R }); }
    B.ring.ribbon(ring, 12, .05, 12, true);
    for (let a = 0; a < TAU; a += 34 / R) { const lx = cx + Math.cos(a) * (R + 8), lz = cz + Math.sin(a) * (R + 8); if (!d.exits.some(e => Math.abs(Math.atan2(Math.sin(e.angle - a), Math.cos(e.angle - a))) < 16 / R)) this.addLamp(lx, lz, Math.atan2(Math.sin(a), -Math.cos(a))); }
    // Street grid
    const n = Math.floor((R - 8) / S);
    for (let k = -n; k <= n; k++) {
      const X = k * S; if (Math.abs(X) > R - 12) continue; const m = Math.sqrt(R * R - X * X) - 2;
      for (const [a, b] of k === 0 ? [[-m, -31], [31, m]] : [[-m, m]]) {
        if (b - a < 6) continue;
        B.streetZ.ribbon([{ x: cx + X, z: cz + a }, { x: cx + X, z: cz + b }], 10, .035, 12);
        B.streetX.ribbon([{ x: cx + a, z: cz + X }, { x: cx + b, z: cz + X }], 10, .03, 12);
        d.streets.push({ x0: cx + X, z0: cz + a, x1: cx + X, z1: cz + b }, { x0: cx + a, z0: cz + X, x1: cx + b, z1: cz + X });
        for (let t = a + 9; t < b - 8; t += 27) {
          if (Math.abs(((t % S) + S) % S - S / 2) > 9) continue; // keep lamps mid-block, out of junctions
          this.addLamp(cx + X + 6.4, cz + t, Math.PI, .2); this.addLamp(cx + X - 6.4, cz + t + 13, 0, .2);
          this.addLamp(cx + t, cz + X + 6.4, Math.PI / 2, .2); this.addLamp(cx + t + 13, cz + X - 6.4, -Math.PI / 2, .2);
        }
        if (k !== 0 && r() > .45) { const t = a + 12 + r() * (b - a - 24); if (Math.abs(((t % S) + S) % S - S / 2) < 8) d.parkSpots.push({ x: cx + X + 3.2, z: cz + t, heading: 0 }); }
      }
    }
    // Crosswalk stripes at junctions
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const X = i * S, Z = j * S; if (Math.hypot(X, Z) > R - 14 || (Math.abs(X) < 32 && Math.abs(Z) < 32)) continue;
      for (const [dx, dz, rot] of [[0, 6.2, 0], [0, -6.2, 0], [6.2, 0, 1], [-6.2, 0, 1]]) for (let s = -3.6; s <= 3.6; s += 1.2) B.solid.box(cx + X + dx + (rot ? 0 : s), .04, cz + Z + dz + (rot ? s : 0), rot ? 2.2 : .55, .012, rot ? .55 : 2.2, "#bdbab2");
    }
    // Blocks
    for (let i = -n - 1; i <= n; i++) for (let j = -n - 1; j <= n; j++) {
      const bx = (i + .5) * S, bz = (j + .5) * S; if (Math.hypot(Math.abs(bx) + 13, Math.abs(bz) + 13) > R - 7) continue; if (Math.abs(bx) < S && Math.abs(bz) < S) continue;
      const X = cx + bx, Z = cz + bz, dn = Math.hypot(bx, bz) / R, roll = r();
      const block = { x0: X - 13, z0: Z - 13, x1: X + 13, z1: Z + 13, type: "build" }; d.blocks.push(block);
      this.surfaces.insert({ x0: X - 13, z0: Z - 13, x1: X + 13, z1: Z + 13, y: .2 }, X - 13, Z - 13, X + 13, Z + 13);
      B.solid.box(X, 0, Z, 26, .2, 26, "#b7b2a8"); B.solid.box(X, .2, Z, 25.4, .012, 25.4, "#c7c2b8");
      if (roll < .08 && dn > .3) { block.type = "park"; B.solid.box(X, .2, Z, 23, .06, 23, "#5c8a45"); for (let t = 0; t < 5; t++) this.addTree(pick(r, st.trees), X + (r() - .5) * 17, Z + (r() - .5) * 17, .9 + r() * .4); d.parks.push(block); continue; }
      if (roll < .15 && dn > .35) {
        block.type = "parking"; B.solid.box(X, .2, Z, 24, .03, 24, "#4f5258");
        for (let s = -1; s <= 1; s += 2) for (let t = -2; t <= 2; t++) B.solid.box(X + t * 4.2 - 2.1, .235, Z + s * 6, .1, .01, 6, "#d9d6cc");
        for (let t = -1; t <= 1; t += 2) d.parkSpots.push({ x: X + t * 4.2, z: Z - 6, heading: Math.PI / 2 * (r() > .5 ? 1 : -1) + Math.PI / 2 }, { x: X + t * 4.2 + 2.1, z: Z + 6, heading: 0 });
        continue;
      }
      d.pedLoops.push({ x: X, z: Z, h: 11.7 });
      const wall = () => pick(r, st.walls), roofCol = () => pick(r, st.roofs);
      const shop = (x0, z0, x1, z1) => { // glazed ground floor + awning + neon sign
        B.glass.facade(x0 + .15, z0 + .15, x1 - .15, z1 - .15, .2, 3.8, "#d8e4ea", Math.floor(r() * 4));
        const aw = pick(r, ["#b43c3c", "#2f6b5a", "#d98b2b", "#3a4f86", "#7a3a6b"]);
        B.solid.box((x0 + x1) / 2, 3.8, z0 - .6, x1 - x0 - 1, .12, 1.3, aw); B.solid.box((x0 + x1) / 2, 3.8, z1 + .6, x1 - x0 - 1, .12, 1.3, aw);
        if (r() > .35) { const c = pick(r, NEON), side = r() > .5 ? z0 - .2 : z1 + .2; B.neon.box((x0 + x1) / 2 + (r() - .5) * 4, 4.3, side, 3 + r() * 2, .7, .12, c); }
      };
      if (dn < .45 && tall > .72) {
        const w = 15 + r() * 6, dd = 15 + r() * 6, h = 18 + (14 + r() * 80) * tall * (1 - dn * .9), x0 = X - w / 2, x1 = X + w / 2, z0 = Z - dd / 2, z1 = Z + dd / 2;
        const tint = pick(r, ["#cfe0ea", "#e6efe9", "#d7d4e8", "#f0e6d6", "#c9d6e3"]);
        shop(x0 - 1, z0 - 1, x1 + 1, z1 + 1); B.solid.top(x0 - 1, z0 - 1, x1 + 1, z1 + 1, 3.8, "#8d8a86");
        B.glass.facade(x0, z0, x1, z1, 3.8, h, tint, Math.floor(r() * 4)); B.solid.top(x0, z0, x1, z1, h, "#55585f");
        let top = h;
        if (h > 40 && r() > .35) { const k = .62 + r() * .15, h2 = h * (.18 + r() * .2); B.glass.facade(X - w * k / 2, Z - dd * k / 2, X + w * k / 2, Z + dd * k / 2, h, h + h2, tint, 1); B.solid.top(X - w * k / 2, Z - dd * k / 2, X + w * k / 2, Z + dd * k / 2, h + h2, "#55585f"); top = h + h2; }
        for (let t = 0; t < 3; t++) B.solid.box(X + (r() - .5) * w * .4, top, Z + (r() - .5) * dd * .4, 2 + r() * 2, 1.4, 2 + r() * 2, "#8f9196");
        if (r() > .4) { B.metal.cyl(X, top, Z, .14, 7 + r() * 8, "#c4c7cc", 5); B.neon.sphere(X, top + 15.5, Z, .35, "#ff3030"); }
        this.addBox(x0 - 1.3, z0 - 1.3, x1 + 1.3, z1 + 1.3, top); d.buildings.push({ x0: x0 - 1, z0: z0 - 1, x1: x1 + 1, z1: z1 + 1, h: top });
      } else if (dn < .74) {
        const splitX = r() > .5;
        for (const s of [-1, 1]) {
          const bx0 = splitX ? (s < 0 ? X - 11.5 : X + .5) : X - 11.5, bx1 = splitX ? (s < 0 ? X - .5 : X + 11.5) : X + 11.5;
          const bz0 = splitX ? Z - 11.5 : (s < 0 ? Z - 11.5 : Z + .5), bz1 = splitX ? Z + 11.5 : (s < 0 ? Z - .5 : Z + 11.5);
          const h = 8 + r() * (8 + 16 * tall), c = wall();
          if (r() > .35) shop(bx0, bz0, bx1, bz1); else B.facade.facade(bx0, bz0, bx1, bz1, .2, 3.8, c, Math.floor(r() * 4));
          B.facade.facade(bx0, bz0, bx1, bz1, 3.8, h, c, Math.floor(r() * 4));
          B.solid.top(bx0, bz0, bx1, bz1, h, "#7b766f");
          for (const [a, b, e, f] of [[bx0, bz0, bx1, bz0 + .3], [bx0, bz1 - .3, bx1, bz1], [bx0, bz0, bx0 + .3, bz1], [bx1 - .3, bz0, bx1, bz1]]) B.solid.box((a + e) / 2, h, (b + f) / 2, e - a, .7, f - b, c);
          if (st.pitched && h < 14 && r() > .4) B.solid.gable(bx0, bz0, bx1, bz1, h, 3, roofCol(), .3);
          if (r() > .6) B.solid.box((bx0 + bx1) / 2, h, (bz0 + bz1) / 2, 2.4, 2.2, 2.4, "#9a9690");
          this.addBox(bx0 - .3, bz0 - .3, bx1 + .3, bz1 + .3, h); d.buildings.push({ x0: bx0, z0: bz0, x1: bx1, z1: bz1, h });
        }
      } else {
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          if (r() < .12) { this.addTree(pick(r, st.trees), X + sx * 6, Z + sz * 6, .9); continue; }
          const w = 8.6 + r() * 2, dd = 8.6 + r() * 2, ox = X + sx * 6.2, oz = Z + sz * 6.2, x0 = ox - w / 2, x1 = ox + w / 2, z0 = oz - dd / 2, z1 = oz + dd / 2;
          const h = r() > .5 ? 7.2 : 4.2, c = wall();
          B.facade.facade(x0, z0, x1, z1, .2, h, c, Math.floor(r() * 4));
          if (st.pitched) B.solid.gable(x0, z0, x1, z1, h, 2.6 + r(), roofCol(), .55);
          else { B.solid.top(x0, z0, x1, z1, h, "#8e8478"); for (const [a, b, e, f] of [[x0, z0, x1, z0 + .25], [x0, z1 - .25, x1, z1], [x0, z0, x0 + .25, z1], [x1 - .25, z0, x1, z1]]) B.solid.box((a + e) / 2, h, (b + f) / 2, e - a, .55, f - b, c); }
          this.addBox(x0 - .3, z0 - .3, x1 + .3, z1 + .3, h); d.buildings.push({ x0, z0, x1, z1, h });
        }
      }
    }
    // Central park + plaza
    B.solid.box(cx, 0, cz, 62, .1, 62, "#5d8b47");
    for (const rot of [0, 1]) B.solid.box(cx, .1, cz, rot ? 4 : 62, .02, rot ? 62 : 4, "#cbbda6");
    B.plaza.geo(G.cyl(40), M(cx, .07, cz, 0, 24, .1, 24), "#ffffff");
    this.surfaces.insert({ x0: cx - 31, z0: cz - 31, x1: cx + 31, z1: cz + 31, y: .1 }, cx - 31, cz - 31, cx + 31, cz + 31);
    d.parks.push({ x0: cx - 31, z0: cz - 31, x1: cx + 31, z1: cz + 31, plaza: true });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { this.addTree(pick(r, st.trees), cx + sx * 27, cz + sz * 21, 1); this.addTree(pick(r, st.trees), cx + sx * 21, cz + sz * 27, 1); B.solid.box(cx + sx * 18, .1, cz + sz * 25.5, 3, .5, .7, "#6d4f3a"); }
    for (let a = 0; a < TAU; a += TAU / 8) this.addLamp(cx + Math.cos(a) * 25.5, cz + Math.sin(a) * 25.5, Math.atan2(Math.sin(a), -Math.cos(a)), .1);
    this.buildLandmark(B, d, r);
    // Guild portal (enter the city's original walkable world)
    const px = cx, pz = cz - 16;
    B.solid.box(px, .1, pz, 7, .4, 2.4, "#6a6480"); for (const s of [-1, 1]) B.solid.cyl(px + s * 3, .5, pz, .35, 5.2, "#6a6480", 8);
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(2.4, .16, 10, 40), this.mats.portalRing); ringMesh.position.set(px, 3.1, pz);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), this.mats.portal); disc.position.set(px, 3.1, pz);
    d.portal = { x: px, z: pz, ring: ringMesh, disc }; this.addCircle(px - 3, pz, .5); this.addCircle(px + 3, pz, .5);
    this.interactions.push({ type: "portal", district: d, x: px, z: pz - 1.8, r: 3.2 }, { type: "portal", district: d, x: px, z: pz + 1.8, r: 3.2 });
    // Diary lantern kiosk
    const kx = cx + 16, kz = cz;
    B.solid.box(kx, .1, kz, 2.4, 1.1, 1.4, "#7b5a48"); B.solid.box(kx, 1.2, kz, 2.6, .12, 1.6, "#5b3f33");
    B.metal.cyl(kx + 1.6, .1, kz, .08, 3.6, "#c9a45c", 6); B.neon.box(kx + 1.6, 3.6, kz, .5, .6, .5, "#ffcf7a");
    const book = new Builder(); book.box(-.35, 0, 0, .66, .05, .9, "#fff6e0"); book.box(.35, 0, 0, .66, .05, .9, "#fff6e0"); book.box(0, -.04, 0, 1.42, .05, .96, "#9b3f4c");
    d.book = new THREE.Mesh(book.geometry(), this.mats.neon); d.book.position.set(kx, 1.9, kz); d.book.rotation.z = .1;
    this.addBox(kx - 1.3, kz - .8, kx + 1.3, kz + .8, 1.3);
    this.interactions.push({ type: "diary", district: d, x: kx - 2.2, z: kz, r: 2.8 });
    d.signPos = { x: cx - 17, z: cz - 3 };
    B.solid.cyl(d.signPos.x, .1, d.signPos.z - 2.3, .12, 3.4, "#3d3a40", 6); B.solid.cyl(d.signPos.x, .1, d.signPos.z + 2.3, .12, 3.4, "#3d3a40", 6);
    // Collectible golden sunflowers
    const spots = [{ x: cx + 24, z: cz + 24, y: .1 }];
    const pool = d.blocks.filter(b => b.type === "build"); for (let t = 0; t < 2 && pool.length; t++) { const b = pool.splice(Math.floor(r() * pool.length), 1)[0]; spots.push({ x: (r() > .5 ? b.x0 + 1.3 : b.x1 - 1.3), z: (r() > .5 ? b.z0 + 1.3 : b.z1 - 1.3), y: .2 }); }
    spots.forEach((s, i) => this.collectibles.push({ id: `${d.id}#${i}`, district: d, ...s }));
    // Meshes
    const g = new THREE.Group();
    g.add(B.facade.mesh(this.mats.facade), B.glass.mesh(this.mats.glass), B.solid.mesh(this.mats.solid), B.metal.mesh(this.mats.metal), B.neon.mesh(this.mats.neon, false));
    for (const k of ["streetX", "streetZ", "ring", "plaza"]) { const m = B[k].mesh(this.mats[k], false); m.castShadow = false; g.add(m); }
    g.add(ringMesh, disc, d.book);
    d.group = g; this.group.add(g);
  }
  buildLandmark(B, d, r) {
    const { x, z } = d, st = d.style, stone = "#d8cbb4";
    switch (st.landmark) {
      case "clock": {
        B.solid.box(x, .1, z, 10, 2, 10, "#bfb39d"); B.facade.facade(x - 3.5, z - 3.5, x + 3.5, z + 3.5, 2.1, 26, stone, 1);
        B.solid.box(x, 26, z, 8, 5.5, 8, "#c2b49b"); B.solid.cone(x, 31.5, z, 6, 10, "#5d6470", 4, Math.PI / 4); B.metal.cyl(x, 41.5, z, .12, 4, "#d6b25a", 5);
        for (const [dx, dz, ry] of [[0, 4.05, 0], [0, -4.05, Math.PI], [4.05, 0, Math.PI / 2], [-4.05, 0, -Math.PI / 2]]) { B.neon.geo(G.cyl(24), M(x + dx, 28.6, z + dz, ry, 2.2, .1, 2.2, Math.PI / 2), "#fff5dc"); B.solid.geo(G.box(), M(x + dx * 1.02, 28.9, z + dz * 1.02, ry, .14, 1.6, .05), "#2b2b30"); B.solid.geo(G.box(), M(x + dx * 1.02, 28.6, z + dz * 1.02, ry, 1.2, .14, .05, 0, .6), "#2b2b30"); }
        this.addBox(x - 5, z - 5, x + 5, z + 5, 40); break;
      }
      case "pagoda": {
        B.solid.box(x, .1, z, 13, 1.4, 13, "#bfb8ad");
        for (let i = 0; i < 6; i++) { const s = 9 - i * 1.25, y = 1.5 + i * 4.2; B.solid.box(x, y, z, s, 3.2, s, i % 2 ? "#c8463a" : "#b23c33"); B.solid.cone(x, y + 3.1, z, s * .95, 1.8, "#2f3e4f", 4, Math.PI / 4); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.neon.sphere(x + sx * s * .6, y + 2.9, z + sz * s * .6, .25, "#ffcf70"); }
        B.metal.cyl(x, 26.6, z, .25, 7, "#d9b14f", 6); for (let i = 0; i < 5; i++) B.metal.geo(G.torus(1, .25, 6, 14), M(x, 28 + i * 1.1, z, 0, .6 - i * .07, .6 - i * .07, .6 - i * .07, Math.PI / 2), "#d9b14f");
        this.addBox(x - 6.5, z - 6.5, x + 6.5, z + 6.5, 30); break;
      }
      case "stupa": {
        for (let i = 0; i < 3; i++) B.solid.box(x, .1 + i * 1.3, z, 16 - i * 3, 1.3, 16 - i * 3, "#f1ece2");
        B.metal.sphere(x, 7.5, z, 5.2, "#e1b54a", 1, .85, 1, 20, 12); B.metal.cyl(x, 11, z, 1.6, 1.6, "#e1b54a", 12); B.metal.cone(x, 12.6, z, 1.4, 13, "#e9c25a", 12);
        for (let a = 0; a < TAU; a += TAU / 8) B.metal.cone(x + Math.cos(a) * 7.2, 2.7, z + Math.sin(a) * 7.2, .5, 2.6, "#e1b54a", 6);
        this.addBox(x - 8, z - 8, x + 8, z + 8, 25); break;
      }
      case "pyramid": {
        for (let i = 0; i < 7; i++) B.solid.box(x, .1 + i * 2, z, 19 - i * 2.2, 2, 19 - i * 2.2, i % 2 ? "#c2b090" : "#b6a383");
        B.solid.box(x, 14.1, z, 4.5, 3.6, 4.5, "#a8956f"); B.solid.box(x, 17.7, z, 5.2, .5, 5.2, "#8f7c5c"); B.solid.box(x, .1, z - 9, 4, 13, 3, "#cdbb98");
        this.addBox(x - 9.5, z - 10.5, x + 9.5, z + 9.5, 18); break;
      }
      case "blueDome": {
        B.facade.facade(x - 7, z - 7, x + 7, z + 7, .1, 10, "#e3cfa5", 2); B.solid.top(x - 7, z - 7, x + 7, z + 7, 10, "#cdb68c");
        B.solid.box(x, 10, z, 14.4, .9, 14.4, "#2f78b5"); B.solid.cyl(x, 10, z, 5.4, 3.4, "#e9d9b8", 20); B.solid.geo(G.hemi(1, 24, 10, .5), M(x, 13.3, z, 0, 5.6, 6.8, 5.6), "#2b78c2"); B.metal.cyl(x, 20, z, .14, 2.5, "#d9b14f", 6);
        for (const s of [-1, 1]) { B.solid.cyl(x + s * 9, .1, z + 4, 1, 24, "#e3cfa5", 12, .8); B.solid.cyl(x + s * 9, 17, z + 4, 1.2, .8, "#2f78b5", 12); B.solid.cone(x + s * 9, 24.1, z + 4, .9, 3.4, "#2b78c2", 12); this.addCircle(x + s * 9, z + 4, 1.3); }
        this.addBox(x - 7.4, z - 7.4, x + 7.4, z + 7.4, 20); break;
      }
      case "dome": {
        B.solid.cyl(x, .1, z, 7.5, 6, "#d7a46d", 24); B.solid.geo(G.hemi(1, 24, 10, .5), M(x, 6, z, 0, 7.5, 5.4, 7.5), "#b8693e");
        for (let a = 0; a < TAU; a += TAU / 12) B.solid.cyl(x + Math.cos(a) * 7.4, 5.8, z + Math.sin(a) * 7.4, .45, 1, "#c48a55", 6);
        B.solid.cyl(x + 9, .1, z + 9, 1.8, 7, "#8a6e55", 10, .6); B.solid.geo(G.cyl(10, .6, 1), M(x + 9, 8.2, z + 9, 0, 6, 1.4, 5), "#6f8a3a");
        this.addCircle(x, z, 7.9); this.addCircle(x + 9, z + 9, 2); break;
      }
      default: {
        B.solid.cyl(x, .1, z, 4.6, 19, "#d9a48f", 16); B.solid.cyl(x, 19, z, 5, 1, "#c48f7a", 16); B.solid.cone(x, 20, z, 5, 7.5, "#5a5f6b", 16);
        for (let a = 0; a < TAU; a += TAU / 6) B.neon.box(x + Math.cos(a) * 4.62, 14, z + Math.sin(a) * 4.62, .8, 1.8, .2, "#ffd28a", -a + Math.PI / 2);
        B.solid.box(x - 7, .1, z + 6, 2.2, 6, 12, "#cfa08a"); this.addCircle(x, z, 5); this.addBox(x - 8.2, z, x - 5.8, z + 12, 6);
      }
    }
  }
  /* ----- highways ----- */
  buildHighway(e) {
    const b = new Builder(), y = .06 + (e.index % 7) * .004; b.ribbon(e.pts, 12, y, 12);
    const m = b.mesh(this.mats.highway, false); m.castShadow = false; this.group.add(m);
    let side = 1; for (let s = 25; s < e.len - 20; s += 48) {
      const p = this.pointOnEdge(e, s), rx = -p.tz, rz = p.tx; side = -side;
      const lx = p.x + rx * 8 * side, lz = p.z + rz * 8 * side, ax = -rx * side, az = -rz * side; // arm points toward the road
      this.addLamp(lx, lz, Math.atan2(-az, ax), this.groundAt(lx, lz));
    }
  }
  /* ----- nature ----- */
  scatterNature() {
    const r = rng("nature:" + this.districts.map(d => d.id).join()), low = this.low;
    const country = new Builder();
    const okAt = (x, z, road = 13) => { const d = this.nearestDistrict(x, z); return this.groundAt(x, z) > -.25 && (!d || Math.hypot(x - d.x, z - d.z) > d.R + 14) && this.roadDistance(x, z) > road; };
    const regionTree = (x, z) => pick(r, this.nearestDistrict(x, z).style.trees);
    for (const e of this.edges) {
      for (let s = 10; s < e.len; s += low ? 30 : 20) for (const side of [-1, 1]) {
        if (r() > .5) continue; const p = this.pointOnEdge(e, s), off = 15 + r() * 60, x = p.x - p.tz * off * side, z = p.z + p.tx * off * side;
        if (okAt(x, z)) this.addTree(r() < .12 ? "bush" : regionTree(x, z), x, z, .8 + r() * .6);
      }
      for (let s = 120; s < e.len - 100; s += 230) {
        if (r() > .7) continue; const p = this.pointOnEdge(e, s), side = r() > .5 ? 1 : -1, off = 38 + r() * 20, x = p.x - p.tz * off * side, z = p.z + p.tx * off * side, ang = Math.atan2(p.tx, p.tz), kind = r();
        const along = (u, v) => ({ x: x + p.tx * u - p.tz * v, z: z + p.tz * u + p.tx * v });
        if (kind < .42) { const sp = low ? 1.9 : 1.35; for (let u = -14; u <= 14; u += sp) for (let v = -8; v <= 8; v += sp) { const q = along(u + (r() - .5) * .4, v + (r() - .5) * .4); if (okAt(q.x, q.z, 14)) this.addTree("sunflower", q.x, q.z, .85 + r() * .3, false); } }
        else if (kind < .68) { for (let u = -12; u <= 12; u += 5) for (let v = -8; v <= 8; v += 5) { const q = along(u, v); if (okAt(q.x, q.z)) this.addTree("orange", q.x, q.z, .9 + r() * .2); } }
        else if (kind < .84) {
          const q = along(0, 0); if (!okAt(q.x, q.z, 20)) continue; const g = this.groundAt(q.x, q.z), c = pick(r, ["#e9dcc4", "#d9c7a8", "#c97b5a"]);
          const w = 9, dd = 7, ca = Math.cos(ang), sa = Math.sin(ang);
          country.geo(G.box(), M(q.x, g + 2.4, q.z, ang, dd, 4.8, w), c); const rb = new Builder(); rb.gable(-dd / 2, -w / 2, dd / 2, w / 2, 4.8, 2.6, "#8a3f2f", .5);
          country.geo(rb.geometry(), M(q.x, g, q.z, ang), null);
          const bq = along(-14, 6); country.geo(G.box(), M(bq.x, g + 3, bq.z, ang, 6, 6, 9), "#9e3b2f"); const rb2 = new Builder(); rb2.gable(-3, -4.5, 3, 4.5, 6, 3, "#5d5a57", .4); country.geo(rb2.geometry(), M(bq.x, g, bq.z, ang), null);
          this.addCircle(q.x, q.z, 5.2); this.addCircle(bq.x, bq.z, 5.2); void ca; void sa;
          for (let u = -18; u <= 18; u += 3) for (const v of [-11, 11]) { const f = along(u, v); country.box(f.x, this.groundAt(f.x, f.z), f.z, .12, 1.1, .12, "#7a5f45"); }
        } else { for (let t = 0; t < 14; t++) { const q = along((r() - .5) * 36, (r() - .5) * 20); if (okAt(q.x, q.z)) this.addTree(regionTree(q.x, q.z), q.x, q.z, .9 + r() * .7); } }
      }
    }
    const h = this.hf, area = (h.x1 - h.x0) * (h.z1 - h.z0), tries = Math.min(low ? 3000 : 7000, Math.floor(area / 2200));
    for (let t = 0; t < tries; t++) {
      const x = h.x0 + r() * (h.x1 - h.x0), z = h.z0 + r() * (h.z1 - h.z0); if (!okAt(x, z, 16)) continue;
      const v = r(), kind = v < .05 ? "rock" : v < .2 ? "bush" : regionTree(x, z);
      if (kind !== "rock" && fbm(x / 160, z / 160) < .42) continue; // clustered woods
      this.addTree(kind, x, z, .8 + r() * .7);
    }
    if (!country.empty) this.group.add(country.mesh(this.mats.solid));
  }
  buildInstances() {
    const dummy = new THREE.Object3D(), tint = new THREE.Color();
    const natureMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 });
    this.instanced = [];
    for (const [kind, list] of Object.entries(this.treeLists)) {
      const mesh = new THREE.InstancedMesh(treeGeometry(kind), natureMat, list.length); mesh.castShadow = !this.low; mesh.receiveShadow = true;
      list.forEach((t, i) => { dummy.position.set(t.x, t.y, t.z); dummy.rotation.set(0, kind === "sunflower" ? Math.PI * .05 * (i % 5) : t.ry, 0); dummy.scale.setScalar(t.s); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); tint.setHSL(0, 0, .86 + ((i * 2654435761) % 1000) / 1000 * .26); mesh.setColorAt(i, tint); });
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); this.group.add(mesh); this.instanced.push(mesh);
    }
    const L = this.lamps; if (!L.length) return;
    const poles = new THREE.InstancedMesh(lampGeometry(), this.mats.solid, L.length), heads = new THREE.InstancedMesh(lampHeadGeometry(), this.mats.lamp, L.length);
    poles.castShadow = !this.low; const glowPos = new Float32Array(L.length * 3);
    L.forEach((l, i) => { dummy.position.set(l.x, l.y, l.z); dummy.rotation.set(0, l.ry, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); poles.setMatrixAt(i, dummy.matrix); heads.setMatrixAt(i, dummy.matrix); glowPos.set([l.hx, l.hy - .2, l.hz], i * 3); });
    poles.computeBoundingSphere(); heads.computeBoundingSphere(); this.group.add(poles, heads);
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.BufferAttribute(glowPos, 3));
    this.glowMat = new THREE.PointsMaterial({ map: this.tx.glow, color: "#ffcf8a", size: 9, sizeAttenuation: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.glow = new THREE.Points(gg, this.glowMat); this.glow.frustumCulled = false; this.group.add(this.glow);
    this.lampGrid = new Grid(120); L.forEach(l => this.lampGrid.insert(l, l.hx, l.hz, l.hx, l.hz));
  }
  /* ----- 2D map image for minimap and full map ----- */
  buildMapImage() {
    const h = this.hf, W = h.x1 - h.x0, H = h.z1 - h.z0, mpp = Math.max(1.5, Math.max(W, H) / 2400);
    const cw = Math.ceil(W / mpp), ch = Math.ceil(H / mpp), c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const x = c.getContext("2d"), small = document.createElement("canvas"); small.width = h.nx; small.height = h.nz;
    const sx = small.getContext("2d"), img = sx.createImageData(h.nx, h.nz), tmp = new THREE.Color();
    for (let k = 0; k < h.nx * h.nz; k++) {
      const hh = h.heights[k]; let r, g, b;
      if (hh < -.9) { const deep = clamp((-hh - .9) / 4, 0, 1); r = 52 - deep * 20; g = 112 - deep * 30; b = 140 - deep * 20; }
      else { tmp.setRGB(h.colors[k * 3], h.colors[k * 3 + 1], h.colors[k * 3 + 2]).convertLinearToSRGB(); const s = .55 + clamp(hh / 50, 0, .35); r = tmp.r * 255 * s + 30; g = tmp.g * 255 * s + 34; b = tmp.b * 255 * s + 30; }
      img.data.set([r, g, b, 255], k * 4);
    }
    sx.putImageData(img, 0, 0); x.imageSmoothingEnabled = true; x.drawImage(small, 0, 0, cw, ch);
    const P = (px, pz) => [(px - h.x0) / mpp, (pz - h.z0) / mpp];
    x.lineCap = "round"; x.lineJoin = "round";
    for (const d of this.districts) {
      x.fillStyle = "#3d4450"; x.beginPath(); x.arc(...P(d.x, d.z), (d.R + 4) / mpp, 0, TAU); x.fill();
      x.fillStyle = "#a9a59c"; for (const b of d.blocks) x.fillRect(...P(b.x0, b.z0), 26 / mpp, 26 / mpp);
      x.fillStyle = "#5f8f4a"; for (const b of d.parks) x.fillRect(...P(b.x0 + (b.plaza ? 0 : 1), b.z0 + (b.plaza ? 0 : 1)), (b.x1 - b.x0) / mpp, (b.z1 - b.z0) / mpp);
      x.fillStyle = "#d9cfbd"; x.beginPath(); x.arc(...P(d.x, d.z), 24 / mpp, 0, TAU); x.fill();
      x.fillStyle = "#7b7e86"; for (const b of d.buildings) x.fillRect(...P(b.x0, b.z0), (b.x1 - b.x0) / mpp, (b.z1 - b.z0) / mpp);
      x.strokeStyle = "#e7e3d8"; x.lineWidth = Math.max(1, 6 / mpp); for (const s of d.streets) { x.beginPath(); x.moveTo(...P(s.x0, s.z0)); x.lineTo(...P(s.x1, s.z1)); x.stroke(); }
      x.lineWidth = Math.max(1.5, 9 / mpp); x.strokeStyle = "#f3efe4"; x.beginPath(); x.arc(...P(d.x, d.z), d.R / mpp, 0, TAU); x.stroke();
    }
    x.strokeStyle = "#f6d98a"; x.lineWidth = Math.max(2, 10 / mpp);
    for (const e of this.edges) { x.beginPath(); e.pts.forEach((p, i) => i ? x.lineTo(...P(p.x, p.z)) : x.moveTo(...P(p.x, p.z))); x.stroke(); }
    this.map = { canvas: c, mpp, x0: h.x0, z0: h.z0, w: cw, h: ch };
  }
}
