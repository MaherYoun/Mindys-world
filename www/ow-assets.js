/* Mindy's open world — shared procedural assets.
   Everything here is generated in code (no downloaded models), so the world
   stays original, small to ship and fully offline. */
import * as THREE from "./vendor/three.module.min.js";

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const angleLerp = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
export const hash = s => { let n = 2166136261; for (const c of String(s)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };
export const rng = seed => { let n = (typeof seed === "number" ? seed >>> 0 : hash(seed)) || 1; return () => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296; }; };
export const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];
const _c = new THREE.Color();
export const col = hex => new THREE.Color(hex);

/* ---------- Geometry builder: merges many parts into one draw call ---------- */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _n3 = new THREE.Matrix3();
export function M(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, "YXZ"); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
}
const templateCache = new Map();
export function T(key, make) {
  if (!templateCache.has(key)) { const g = make(); templateCache.set(key, g.index ? g.toNonIndexed() : g); }
  return templateCache.get(key);
}
export const G = {
  box: () => T("box", () => new THREE.BoxGeometry(1, 1, 1)),
  cyl: (n = 8, top = 1, bottom = 1) => T(`cyl${n}-${top}-${bottom}`, () => new THREE.CylinderGeometry(top, bottom, 1, n)),
  cone: (n = 8) => T(`cone${n}`, () => new THREE.ConeGeometry(1, 1, n)),
  ico: (d = 0) => T(`ico${d}`, () => new THREE.IcosahedronGeometry(1, d)),
  sphere: (w = 10, h = 7) => T(`sph${w}-${h}`, () => new THREE.SphereGeometry(1, w, h)),
  dodeca: () => T("dodeca", () => new THREE.DodecahedronGeometry(1, 0)),
  torus: (r = 1, t = .1, a = 8, b = 18) => T(`tor${r}-${t}-${a}-${b}`, () => new THREE.TorusGeometry(r, t, a, b)),
  capsule: (r, l, a = 4, b = 10) => T(`cap${r}-${l}-${a}-${b}`, () => new THREE.CapsuleGeometry(r, l, a, b)),
  hemi: (r, w = 16, h = 8, cut = .5) => T(`hemi${r}-${w}-${h}-${cut}`, () => new THREE.SphereGeometry(r, w, h, 0, TAU, 0, Math.PI * cut)),
};

export class Builder {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; }
  get empty() { return this.pos.length === 0; }
  geo(src, m, color) {
    const P = src.attributes.position.array, N = src.attributes.normal.array, U = src.attributes.uv?.array, C = src.attributes.color?.array;
    const e = m.elements, a = _n3.getNormalMatrix(m).elements;
    const c = color ? (color.isColor ? color : _c.set(color)) : null;
    const cr = c?.r, cg = c?.g, cb = c?.b;
    for (let i = 0, j = 0; i < P.length; i += 3, j += 2) {
      const x = P[i], y = P[i + 1], z = P[i + 2];
      this.pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      const nx = N[i], ny = N[i + 1], nz = N[i + 2];
      let ox = a[0] * nx + a[3] * ny + a[6] * nz, oy = a[1] * nx + a[4] * ny + a[7] * nz, oz = a[2] * nx + a[5] * ny + a[8] * nz;
      const l = Math.hypot(ox, oy, oz) || 1; this.nor.push(ox / l, oy / l, oz / l);
      this.uv.push(U ? U[j] : 0, U ? U[j + 1] : 0);
      if (c) this.col.push(cr, cg, cb); else if (C) this.col.push(C[i], C[i + 1], C[i + 2]); else this.col.push(1, 1, 1);
    }
    return this;
  }
  box(x, y, z, w, h, d, color, ry = 0) { return this.geo(G.box(), M(x, y + h / 2, z, ry, w, h, d), color); }
  cyl(x, y, z, r, h, color, n = 8, top = 1) { return this.geo(G.cyl(n, top, 1), M(x, y + h / 2, z, 0, r, h, r), color); }
  cone(x, y, z, r, h, color, n = 8, ry = 0) { return this.geo(G.cone(n), M(x, y + h / 2, z, ry, r, h, r), color); }
  sphere(x, y, z, r, color, sx = 1, sy = 1, sz = 1, w = 10, hh = 7) { return this.geo(G.sphere(w, hh), M(x, y, z, 0, r * sx, r * sy, r * sz), color); }
  // A triangle whose winding is flipped when needed so it faces `out`.
  tri(a, b, c, color, out, uvs) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (out && nx * out[0] + ny * out[1] + nz * out[2] < 0) { [b, c] = [c, b]; nx = -nx; ny = -ny; nz = -nz; if (uvs) uvs = [uvs[0], uvs[2], uvs[1]]; }
    const l = Math.hypot(nx, ny, nz) || 1; _c.set(color);
    [a, b, c].forEach((p, i) => { this.pos.push(...p); this.nor.push(nx / l, ny / l, nz / l); this.uv.push(...(uvs ? uvs[i] : [0, 0])); this.col.push(_c.r, _c.g, _c.b); });
  }
  quad(a, b, c, d, color, out, uvs) { this.tri(a, b, c, color, out, uvs && [uvs[0], uvs[1], uvs[2]]); this.tri(a, c, d, color, out, uvs && [uvs[0], uvs[2], uvs[3]]); }
  // Building walls with real window UVs: 1 texture repeat = 4 bays × 4 floors.
  facade(x0, z0, x1, z1, y0, y1, color, uoff = 0) {
    const U = 16, V = 14, v0 = y0 / V, v1 = y1 / V;
    const side = (ax, az, bx, bz, nx, nz) => {
      const len = Math.hypot(bx - ax, bz - az), u1 = uoff + len / U;
      this.quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], color, [nx, 0, nz], [[uoff, v0], [u1, v0], [u1, v1], [uoff, v1]]);
    };
    side(x1, z0, x0, z0, 0, -1); side(x0, z1, x1, z1, 0, 1); side(x0, z0, x0, z1, -1, 0); side(x1, z1, x1, z0, 1, 0);
  }
  top(x0, z0, x1, z1, y, color) { this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], color, [0, 1, 0]); }
  gable(x0, z0, x1, z1, y, h, color, over = .5) {
    x0 -= over; z0 -= over; x1 += over; z1 += over;
    const alongX = (x1 - x0) >= (z1 - z0), top = y + h, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (alongX) {
      this.quad([x0, y, z0], [x1, y, z0], [x1, top, cz], [x0, top, cz], color, [0, .6, -1]);
      this.quad([x0, y, z1], [x1, y, z1], [x1, top, cz], [x0, top, cz], color, [0, .6, 1]);
      this.tri([x0, y, z0], [x0, y, z1], [x0, top, cz], color, [-1, 0, 0]); this.tri([x1, y, z0], [x1, y, z1], [x1, top, cz], color, [1, 0, 0]);
    } else {
      this.quad([x0, y, z0], [x0, y, z1], [cx, top, z1], [cx, top, z0], color, [-1, .6, 0]);
      this.quad([x1, y, z0], [x1, y, z1], [cx, top, z1], [cx, top, z0], color, [1, .6, 0]);
      this.tri([x0, y, z0], [x1, y, z0], [cx, top, z0], color, [0, 0, -1]); this.tri([x0, y, z1], [x1, y, z1], [cx, top, z1], color, [0, 0, 1]);
    }
  }
  // Flat strip along a polyline (roads). uv.x across, uv.y along in metres/vScale.
  ribbon(pts, width, y, vScale = 12, closed = false) {
    const n = pts.length; if (n < 2) return this; let dist = 0;
    const L = [], R = [], D = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const rx = -tz, rz = tx; // right-hand side of travel
      if (i > 0) dist += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
      L.push([p.x - rx * width / 2, y, p.z - rz * width / 2]); R.push([p.x + rx * width / 2, y, p.z + rz * width / 2]); D.push(dist / vScale);
    }
    const count = closed ? n : n - 1;
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % n, dj = closed && j === 0 ? D[i] + Math.hypot(pts[0].x - pts[i].x, pts[0].z - pts[i].z) / vScale : D[j];
      this.quad(L[i], R[i], R[j], L[j], "#ffffff", [0, 1, 0], [[0, D[i]], [1, D[i]], [1, dj], [0, dj]]);
    }
    return this;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere(); return g;
  }
  mesh(material, shadows = true) { const m = new THREE.Mesh(this.geometry(), material); m.castShadow = shadows; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); return m; }
}

/* ---------- Canvas textures ---------- */
function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function tex(c, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function noise(ctx, w, h, amount, alpha = .08) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
}
export function makeTextures() {
  const r = rng("mindy-textures");
  // Stucco facade: 4 bays × 4 floors, each 128px. White wall so vertex colour tints it.
  const facade = (() => {
    const [c, x] = canvas(512, 512), [ce, e] = canvas(512, 512);
    x.fillStyle = "#f4f1ec"; x.fillRect(0, 0, 512, 512); e.fillStyle = "#000"; e.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const X = i * 128, Y = j * 128, ground = j === 3;
      x.fillStyle = "#d9d3cb"; x.fillRect(X, Y + 120, 128, 8); // floor band
      if (ground && i % 2 === 0) { // shop front
        x.fillStyle = "#2b3440"; x.fillRect(X + 10, Y + 34, 108, 86); x.fillStyle = "#c9c2b6"; x.fillRect(X + 6, Y + 26, 116, 10);
        const g = x.createLinearGradient(X, Y + 34, X + 108, Y + 120); g.addColorStop(0, "#5d7286"); g.addColorStop(1, "#27313c"); x.fillStyle = g; x.fillRect(X + 14, Y + 40, 100, 76);
        e.fillStyle = r() > .3 ? "#ffd59a" : "#bfe6ff"; e.globalAlpha = .9; e.fillRect(X + 14, Y + 40, 100, 76); e.globalAlpha = 1; continue;
      }
      x.fillStyle = "#ccc4b8"; x.fillRect(X + 26, Y + 18, 76, 92); // frame
      const g = x.createLinearGradient(X + 30, Y + 22, X + 98, Y + 106); g.addColorStop(0, "#7b93a6"); g.addColorStop(.5, "#3b4b5a"); g.addColorStop(1, "#24303b");
      x.fillStyle = g; x.fillRect(X + 31, Y + 23, 66, 82); x.fillStyle = "#e8e2d8"; x.fillRect(X + 62, Y + 23, 4, 82); x.fillRect(X + 24, Y + 104, 80, 7); // mullion + sill
      if (r() > .55) { x.fillStyle = "#6d5a4d"; x.fillRect(X + 16, Y + 22, 12, 84); x.fillRect(X + 100, Y + 22, 12, 84); } // shutters
      if (r() > .6) { x.fillStyle = "#3d3a3f"; x.fillRect(X + 22, Y + 96, 84, 4); for (let k = 0; k < 9; k++) x.fillRect(X + 24 + k * 10, Y + 96, 2, 16); } // balcony rail
      const lit = r(); if (lit > .42) { e.fillStyle = lit > .9 ? "#bcd8ff" : lit > .7 ? "#ffcf86" : "#ffe3b0"; e.globalAlpha = .55 + r() * .45; e.fillRect(X + 31, Y + 23, 66, 82); e.globalAlpha = 1; }
    }
    noise(x, 512, 512, 18);
    return { map: tex(c), emissive: tex(ce) };
  })();
  // Glass tower facade: curtain wall with floor slabs and mullions.
  const glass = (() => {
    const [c, x] = canvas(512, 512), [ce, e] = canvas(512, 512);
    e.fillStyle = "#000"; e.fillRect(0, 0, 512, 512);
    const sky = x.createLinearGradient(0, 0, 512, 512); sky.addColorStop(0, "#dfeaf2"); sky.addColorStop(.45, "#9fb6c8"); sky.addColorStop(1, "#6f879b");
    x.fillStyle = sky; x.fillRect(0, 0, 512, 512);
    for (let j = 0; j < 4; j++) {
      const Y = j * 128;
      for (let i = 0; i < 8; i++) { const v = r(); x.fillStyle = `rgba(${v > .5 ? "255,255,255" : "30,45,60"},${.04 + r() * .1})`; x.fillRect(i * 64, Y, 64, 116); if (r() > .5) { e.fillStyle = r() > .75 ? "#cfe6ff" : "#ffe0a8"; e.globalAlpha = .35 + r() * .6; e.fillRect(i * 64 + 3, Y + 6, 58, 104); e.globalAlpha = 1; } }
      x.fillStyle = "#5d6873"; x.fillRect(0, Y + 116, 512, 12); x.fillStyle = "#8a96a1"; x.fillRect(0, Y + 116, 512, 2);
      for (let i = 0; i <= 8; i++) { x.fillStyle = "#4d5965"; x.fillRect(i * 64 - 2, Y, 4, 128); }
    }
    noise(x, 512, 512, 8);
    return { map: tex(c), emissive: tex(ce) };
  })();
  const road = (lines = true, yellow = true) => {
    const [c, x] = canvas(128, 512); x.fillStyle = "#3a3d42"; x.fillRect(0, 0, 128, 512); noise(x, 128, 512, 26);
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(20,20,24,${r() * .25})`; x.fillRect(r() * 128, r() * 512, 2 + r() * 14, 2 + r() * 30); }
    if (lines) { x.fillStyle = "#e9e6dc"; x.fillRect(5, 0, 4, 512); x.fillRect(119, 0, 4, 512); }
    x.fillStyle = yellow ? "#f0c24a" : "#eeeae0";
    if (yellow) { x.fillRect(59, 0, 3, 512); x.fillRect(66, 0, 3, 512); } else { x.fillRect(62, 0, 4, 220); }
    return tex(c);
  };
  const paving = (() => {
    const [c, x] = canvas(256, 256); x.fillStyle = "#cbbfae"; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const v = 180 + Math.floor(r() * 40); x.fillStyle = `rgb(${v},${v - 10},${v - 24})`; x.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); }
    noise(x, 256, 256, 16); return tex(c);
  })();
  const grass = (() => {
    const [c, x] = canvas(256, 256); x.fillStyle = "#d9d9d9"; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = 170 + Math.floor(r() * 85); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 5); }
    return tex(c);
  })();
  const waterNormal = (() => {
    const [c, x] = canvas(256, 256), img = x.createImageData(256, 256), d = img.data;
    for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
      const a = i / 256 * TAU, b = j / 256 * TAU;
      const nx = Math.sin(a * 3 + Math.cos(b * 2) * 2) * .5 + Math.sin(a * 7 + b * 5) * .25, nz = Math.cos(b * 4 + Math.sin(a * 2) * 2) * .5 + Math.cos(b * 9 - a * 3) * .25;
      const k = (j * 256 + i) * 4; d[k] = 128 + nx * 90; d[k + 1] = 128 + nz * 90; d[k + 2] = 255; d[k + 3] = 255;
    }
    x.putImageData(img, 0, 0); return tex(c, false);
  })();
  const glow = (() => {
    const [c, x] = canvas(64, 64), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.25, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return tex(c, true, false);
  })();
  const swirl = (() => {
    const [c, x] = canvas(256, 256); x.translate(128, 128);
    for (let i = 0; i < 9; i++) { x.rotate(TAU / 9); const g = x.createLinearGradient(0, 0, 120, 0); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.strokeStyle = g; x.lineWidth = 10; x.beginPath(); x.arc(40, 0, 70, -1.2, .6); x.stroke(); }
    return tex(c, true, false);
  })();
  return { facade, glass, highway: road(true, true), street: road(false, false), paving, grass, waterNormal, glow, swirl };
}

/* ---------- Characters ---------- */
export const PALETTE = {
  skin: ["#f0cfb2", "#d99b70", "#b8734c", "#80503e", "#51352e"],
  hair: ["#2b2534", "#694137", "#ad6345", "#bf915f", "#b9adb0", "#5d415c"],
  eyes: ["#493632", "#786040", "#477065", "#506e90", "#6c7380"],
  outfit: ["#d87948", "#628475", "#596587", "#925e79", "#ba8f4e"],
};
const EXTRA_OUTFITS = ["#c94f4f", "#3f7fbf", "#e0b84a", "#7a5fb0", "#3c9c7a", "#d6d0c4", "#2f3542", "#ef8fa8"];
export function randomLook(r) {
  return { skin: Math.floor(r() * 5), hair: Math.floor(r() * 6), eyes: Math.floor(r() * 5), outfitColor: pick(r, EXTRA_OUTFITS), pants: pick(r, ["#2f3a55", "#3b3b40", "#5a4a3a", "#26303f", "#6d6a62"]), style: pick(r, ["waves", "short", "bun", "long", "short"]), accessory: r() > .8 ? "glasses" : "none", build: pick(r, ["slim", "balanced", "strong"]) };
}
const charMaterial = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .72, metalness: 0 });
let sharedCharMat = null;

export class Humanoid {
  constructor(look = {}, { scale = 1, detail = true, backpack = false } = {}) {
    this.root = new THREE.Group(); this.scale = scale; this.detail = detail; this.backpack = backpack;
    sharedCharMat ??= charMaterial(); this.mat = sharedCharMat;
    this.phase = 0; this.amount = 0; this.sitting = false; this.time = Math.random() * 10;
    this.setLook(look);
  }
  setLook(look) {
    this.look = { ...look };
    this.root.clear();
    const L = this.look, seg = this.detail ? 12 : 7;
    const skin = PALETTE.skin[L.skin] ?? PALETTE.skin[1], hair = PALETTE.hair[L.hair] ?? PALETTE.hair[0], eye = PALETTE.eyes[L.eyes] ?? PALETTE.eyes[0];
    const outfit = L.outfitColor || PALETTE.outfit[L.outfit] || PALETTE.outfit[0], pants = L.pants || "#3c4767";
    const build = L.build === "strong" ? 1.14 : L.build === "slim" ? .9 : 1;
    const mesh = b => { const m = new THREE.Mesh(b.geometry(), this.mat); m.castShadow = true; m.receiveShadow = false; return m; };
    this.hips = new THREE.Group(); this.hips.position.y = .92; this.root.add(this.hips);
    this.spine = new THREE.Group(); this.hips.add(this.spine);
    // Torso, head, face and hair share one mesh with vertex colours.
    const t = new Builder();
    t.geo(G.capsule(.17, .3, 4, seg), M(0, .3, 0, 0, 1.12 * build, 1, .8), outfit);
    t.geo(G.cyl(seg, .75, 1), M(0, .02, 0, 0, .27 * build, .28, .22), outfit); // hem
    t.geo(G.cyl(seg, 1, 1), M(0, .13, 0, 0, .2 * build, .045, .155), "#3a3242"); // belt
    t.geo(G.cyl(8), M(0, .6, 0, 0, .062, .12, .062), skin);
    const hy = .76;
    t.geo(G.sphere(seg + 4, seg), M(0, hy, 0, 0, .152, .168, .155), skin);
    for (const s of [-1, 1]) {
      t.geo(G.sphere(8, 6), M(s * .056, hy + .012, .132, 0, .027, .032, .016), eye);
      t.geo(G.sphere(6, 4), M(s * .05, hy + .024, .145, 0, .008, .008, .005), "#ffffff");
      t.geo(G.box(), M(s * .056, hy + .058, .14, s * .1, .05, .009, .01, 0, s * -.12), hair); // brows
      t.geo(G.sphere(6, 4), M(s * .088, hy - .035, .118, 0, .028, .016, .01), "#e79a8f"); // blush
      t.geo(G.sphere(6, 4), M(s * .152, hy, 0, 0, .025, .04, .02), skin); // ears
    }
    t.geo(G.sphere(6, 4), M(0, hy - .02, .152, 0, .016, .02, .016), skin);
    t.geo(G.box(), M(0, hy - .07, .142, 0, .045, .01, .01), "#b0505a");
    // Hair
    t.geo(G.hemi(1, seg + 4, 8, .55), M(0, hy + .015, -.005, 0, .168, .17, .17, -.38), hair);
    t.geo(G.box(), M(0, hy + .1, .118, 0, .2, .055, .05, .35), hair); // fringe
    for (const s of [-1, 1]) t.geo(G.capsule(.035, .1, 3, 6), M(s * .14, hy - .03, .04, 0, 1, 1, 1, 0, s * .1), hair);
    if (L.style === "waves") { t.geo(G.capsule(.12, .16, 4, seg), M(0, hy - .1, -.085, 0, 1.3, 1, .7), hair); for (const s of [-1, 1]) t.geo(G.sphere(8, 6), M(s * .12, hy - .18, -.04, 0, .075, .085, .075), hair); }
    if (L.style === "long") t.geo(G.capsule(.13, .4, 4, seg), M(0, hy - .24, -.08, 0, 1.25, 1, .62), hair);
    if (L.style === "bun") { t.geo(G.sphere(10, 8), M(0, hy + .14, -.12, 0, .085, .085, .085), hair); t.geo(G.capsule(.1, .08, 3, seg), M(0, hy - .06, -.09, 0, 1.3, 1, .7), hair); }
    if (L.accessory === "glasses") { for (const s of [-1, 1]) t.geo(G.torus(1, .2, 6, 14), M(s * .058, hy + .012, .16, 0, .036, .036, .036), "#e9d5ad"); t.geo(G.box(), M(0, hy + .015, .162, 0, .03, .006, .006), "#e9d5ad"); }
    if (L.accessory === "scarf") t.geo(G.torus(1, .4, 8, 16), M(0, .56, 0, 0, .1, .1, .1, Math.PI / 2), "#f7cf83");
    if (L.accessory === "flower") { t.geo(G.sphere(6, 4), M(.13, hy + .1, .06, 0, .03, .03, .03), "#7a4b2e"); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; t.geo(G.sphere(6, 4), M(.13 + Math.cos(a) * .04, hy + .1 + Math.sin(a) * .04, .07, 0, .024, .024, .015), "#ffd24d"); } }
    if (this.backpack) { t.box(0, .14, -.21, .3, .36, .14, "#765e7a"); t.box(0, .42, -.21, .26, .05, .12, "#5d4a63"); }
    this.torso = mesh(t); this.spine.add(this.torso);
    // Limbs
    this.arms = []; this.legs = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * .215 * build, .5, 0); this.spine.add(sh);
      const ua = new Builder().geo(G.capsule(.056, .19, 3, seg), M(0, -.13, 0), outfit); sh.add(mesh(ua));
      const el = new THREE.Group(); el.position.y = -.28; sh.add(el);
      const fa = new Builder().geo(G.capsule(.046, .17, 3, seg), M(0, -.11, 0), skin).geo(G.sphere(8, 6), M(0, -.25, .01, 0, .052, .06, .045), skin); el.add(mesh(fa));
      const hip = new THREE.Group(); hip.position.set(s * .09, 0, 0); this.hips.add(hip);
      const th = new Builder().geo(G.capsule(.078, .28, 3, seg), M(0, -.2, 0), pants); hip.add(mesh(th));
      const kn = new THREE.Group(); kn.position.y = -.43; hip.add(kn);
      const sn = new Builder().geo(G.capsule(.062, .28, 3, seg), M(0, -.2, 0), pants).geo(G.box(), M(0, -.43, .035, 0, .115, .085, .23), "#2a2f45"); kn.add(mesh(sn));
      this.arms.push({ sh, el, s }); this.legs.push({ hip, kn, s });
    }
    this.root.scale.setScalar(this.scale);
  }
  update(dt, speed, running = false, airborne = false) {
    this.time += dt;
    const target = clamp(speed / 4, 0, 1.25);
    this.amount = lerp(this.amount, target, Math.min(1, dt * 10));
    this.phase += dt * (running ? 11.5 : 8.2) * Math.min(1, .35 + this.amount);
    const a = this.amount, ph = this.phase;
    if (this.sitting) return this.sit();
    this.hips.position.y = .92 + Math.abs(Math.sin(ph)) * .04 * a - (airborne ? 0 : 0);
    this.hips.rotation.set(0, 0, 0);
    this.spine.rotation.x = (running ? .22 : .07) * a; this.spine.scale.y = 1 + Math.sin(this.time * 2.1) * .008;
    for (const { hip, kn, s } of this.legs) {
      const p = ph + (s > 0 ? Math.PI : 0);
      hip.rotation.x = airborne ? -.6 + s * .2 : -Math.sin(p) * .6 * a;
      // The knee folds while the leg swings forward, then straightens to land.
      kn.rotation.x = airborne ? .9 : (Math.max(0, Math.cos(p)) * (running ? 1.35 : 1.0) + .08) * a;
    }
    for (const { sh, el, s } of this.arms) {
      const p = ph + (s > 0 ? 0 : Math.PI);
      sh.rotation.x = airborne ? -2.3 : -Math.sin(p) * .55 * a; sh.rotation.z = s * (.07 + .05 * a);
      el.rotation.x = airborne ? -.3 : -.25 - .35 * a;
    }
  }
  sit() {
    this.hips.position.y = .5; this.spine.rotation.x = -.12;
    for (const { hip, kn } of this.legs) { hip.rotation.x = -1.45; kn.rotation.x = 1.35; }
    for (const { sh, el, s } of this.arms) { sh.rotation.x = -1.0; sh.rotation.z = s * .12; el.rotation.x = -.5; }
  }
}

/* ---------- Vehicles ---------- */
const carMats = new Map();
function bodyMat(color) {
  if (!carMats.has(color)) carMats.set(color, new THREE.MeshPhysicalMaterial({ color, metalness: .55, roughness: .32, clearcoat: 1, clearcoatRoughness: .08 }));
  return carMats.get(color);
}
let glassMat, wheelMat, lightMat, trimMat;
const carGeo = new Map();
function extrudeSide(points, depth) {
  const s = new THREE.Shape(); s.moveTo(points[0][0], points[0][1]); for (const p of points.slice(1)) s.lineTo(p[0], p[1]); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -depth / 2); return g;
}
const PROFILES = {
  sedan: { L: 4.4, W: 1.8, body: [[-2.2, .32], [2.2, .32], [2.27, .72], [1.35, .98], [-1.72, .98], [-2.26, .86]], glass: [[1.3, .96], [.5, 1.42], [-.95, 1.42], [-1.68, .96]], roof: [.45, -.92, 1.42], wb: 1.38, track: .82 },
  sport: { L: 4.3, W: 1.85, body: [[-2.15, .3], [2.15, .3], [2.2, .6], [1.1, .82], [-1.7, .86], [-2.2, .82]], glass: [[1.05, .8], [.15, 1.16], [-.85, 1.16], [-1.6, .84]], roof: [.1, -.82, 1.16], wb: 1.32, track: .84 },
  van: { L: 4.9, W: 1.95, body: [[-2.45, .36], [2.45, .36], [2.5, .9], [1.9, 1.15], [-2.45, 1.15]], glass: [[1.85, 1.13], [1.2, 1.95], [-2.4, 1.95], [-2.4, 1.13]], roof: [1.15, -2.4, 1.95], wb: 1.6, track: .88 },
  hatch: { L: 3.9, W: 1.75, body: [[-1.95, .32], [1.95, .32], [2.0, .7], [1.2, .95], [-1.95, .95]], glass: [[1.15, .93], [.35, 1.45], [-1.75, 1.45], [-1.92, .93]], roof: [.3, -1.78, 1.45], wb: 1.25, track: .8 },
};
export const CAR_COLORS = ["#c8ccd2", "#1d2026", "#f2f2ef", "#7d1f2a", "#244b8a", "#3e5f4f", "#b8b2a5", "#d8a33a", "#5d6670", "#8a4b2f"];
export function makeCar(type = "sedan", color = "#c8ccd2", { taxi = false, special = false } = {}) {
  glassMat ??= new THREE.MeshPhysicalMaterial({ color: "#1b2530", metalness: .9, roughness: .05, transparent: true, opacity: .82 });
  wheelMat ??= new THREE.MeshStandardMaterial({ color: "#18191c", roughness: .85 });
  trimMat ??= new THREE.MeshStandardMaterial({ color: "#2a2c31", roughness: .6, metalness: .3 });
  lightMat ??= new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const P = PROFILES[type] || PROFILES.sedan;
  if (!carGeo.has(type)) {
    const body = extrudeSide(P.body, P.W - .12);
    const glass = extrudeSide(P.glass, P.W - .3);
    const [rx0, rx1, ry] = P.roof; const roof = extrudeSide([[rx0, ry - .02], [rx1, ry - .02], [rx1, ry + .05], [rx0 - .04, ry + .05]], P.W - .26);
    const wheel = new THREE.CylinderGeometry(.37, .37, .27, 16); wheel.rotateX(Math.PI / 2);
    const rim = new THREE.CylinderGeometry(.22, .22, .29, 10); rim.rotateX(Math.PI / 2);
    const lights = new Builder(); const front = P.body[2][0];
    for (const s of [-1, 1]) { lights.box(front - .02, .58, s * (P.W / 2 - .3), .1, .14, .38, "#fff6d8"); lights.box(-front + .02, .62, s * (P.W / 2 - .28), .1, .12, .36, "#ff2a2a"); }
    const trim = new Builder(); trim.box(front, .3, 0, .18, .2, P.W - .1, "#222"); trim.box(-front, .3, 0, .18, .2, P.W - .1, "#222");
    for (const s of [-1, 1]) trim.box(.95, .98, s * (P.W / 2 + .02), .12, .1, .16, "#222"); // mirrors
    carGeo.set(type, { body, glass, roof, wheel, rim, lights: lights.geometry(), trim: trim.geometry() });
  }
  const g = carGeo.get(type), root = new THREE.Group(), inner = new THREE.Group(); inner.rotation.y = -Math.PI / 2; root.add(inner);
  const add = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = false; inner.add(m); return m; };
  const bm = bodyMat(taxi ? "#f2c230" : color);
  add(g.body, bm); add(g.roof, bm); add(g.glass, glassMat, false); add(g.trim, trimMat, false); const lights = add(g.lights, lightMat, false);
  if (taxi) { const sign = new Builder().box(-.2, P.roof[2] + .04, 0, .5, .16, .25, "#ffe9a6"); add(sign.geometry(), lightMat, false); }
  if (special) { const sp = new Builder(); sp.box(-P.L / 2 + .2, .95, 0, .3, .05, P.W - .2, "#1d1f24"); for (const s of [-1, 1]) sp.box(-P.L / 2 + .25, .82, s * .6, .08, .14, .06, "#1d1f24"); add(sp.geometry(), trimMat); }
  const wheels = [];
  for (const [x, s] of [[P.wb, 1], [P.wb, -1], [-P.wb, 1], [-P.wb, -1]]) {
    const w = new THREE.Group(); w.position.set(x, .37, s * P.track); inner.add(w);
    const tyre = new THREE.Mesh(g.wheel, wheelMat); tyre.castShadow = true; w.add(tyre);
    const rim = new THREE.Mesh(g.rim, trimMat); w.add(rim);
    wheels.push({ w, front: x > 0 });
  }
  return { root, inner, wheels, lights, type, profile: P, length: P.L, width: P.W };
}

/* ---------- Nature templates (vertex coloured, used with InstancedMesh) ---------- */
export function treeGeometry(kind) {
  const b = new Builder(), trunk = "#6b4f3a";
  const r = rng(kind);
  switch (kind) {
    case "pine": b.cyl(0, 0, 0, .25, 3, trunk, 6, .7); [[2.4, 4.2, 1.6], [1.85, 3.5, 3.6], [1.25, 2.8, 5.4]].forEach(([rr, h, y], i) => b.cone(0, y, 0, rr, h, i % 2 ? "#2f6040" : "#3a7049", 8, i)); break;
    case "palm": {
      let x = 0, y = 0; for (let i = 0; i < 5; i++) { const nx = x + .18 * i, ny = y + 1.5; b.geo(G.cyl(6, .85, 1), M((x + nx) / 2, (y + ny) / 2, 0, 0, .2 - i * .015, 1.55, .2 - i * .015, 0, -.12 * i), "#8a6d4c"); x = nx; y = ny; }
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; b.geo(G.box(), M(x + Math.cos(a) * 1.4, y - .35, Math.sin(a) * 1.4, -a, 3.1, .06, .62, 0, -.42), i % 2 ? "#3f8240" : "#4c9449"); }
      for (let i = 0; i < 3; i++) b.sphere(x + Math.cos(i * 2) * .25, y - .3, Math.sin(i * 2) * .25, .17, "#6b5530");
      break;
    }
    case "acacia": b.cyl(0, 0, 0, .22, 3.2, trunk, 6, .7); b.geo(G.cyl(6, .7, 1), M(.5, 3.4, 0, 0, .12, 1.2, .12, 0, -.5), trunk); b.geo(G.cyl(9, .6, 1), M(0, 4.2, 0, 0, 3.4, .8, 2.9), "#6f8a3a"); b.geo(G.cyl(9, .4, 1), M(.6, 4.8, .3, 0, 2.2, .55, 1.9), "#7d9744"); break;
    case "poplar": b.cyl(0, 0, 0, .2, 2, trunk, 6); b.sphere(0, 5, 0, 1, "#5a7f37", 1.25, 4.4, 1.25, 8, 8); break;
    case "bush": b.geo(G.ico(0), M(0, .7, 0, 0, 1.2, .9, 1.1), "#4f7d3d"); b.geo(G.ico(0), M(.7, .6, .3, 1, .8, .7, .8), "#5a8a45"); break;
    case "rock": b.geo(G.dodeca(), M(0, .3, 0, 0, 1.3, .9, 1.1), "#8b8a86"); break;
    case "sunflower": {
      b.cyl(0, 0, 0, .045, 1.75, "#4a8a3f", 5);
      b.geo(G.box(), M(.14, .8, 0, 0, .32, .03, .14, 0, .4), "#4f9a45"); b.geo(G.box(), M(-.14, 1.15, 0, 0, .32, .03, .14, 0, -.4), "#4f9a45");
      b.geo(G.cyl(12, 1, 1), M(0, 1.85, 0, 0, .46, .05, .46, Math.PI / 2 - .35), "#ffc928");
      b.geo(G.cyl(12, 1, 1), M(0, 1.87, .04, 0, .2, .07, .2, Math.PI / 2 - .35), "#5a3a1e");
      break;
    }
    case "orange": b.cyl(0, 0, 0, .2, 1.8, trunk, 6); b.geo(G.ico(1), M(0, 2.6, 0, 0, 1.6, 1.4, 1.6), "#3f7a46"); for (let i = 0; i < 9; i++) { const a = i * TAU / 9; b.sphere(Math.cos(a) * 1.35, 2.2 + (i % 3) * .5, Math.sin(a) * 1.35, .15, "#ff9330", 1, 1, 1, 6, 4); } break;
    case "blossom": b.cyl(0, 0, 0, .25, 2.6, "#5b4440", 6, .7); for (let i = 0; i < 4; i++) b.geo(G.ico(0), M(Math.cos(i * 1.7) * .9, 3.2 + (i % 2) * .6, Math.sin(i * 1.7) * .9, i, 1.7, 1.35, 1.6), i % 2 ? "#f4b6c8" : "#eea0b8"); break;
    default: b.cyl(0, 0, 0, .27, 3, trunk, 6, .7); for (let i = 0; i < 4; i++) b.geo(G.ico(0), M(Math.cos(i * 1.9) * (i ? 1.1 : 0), 3.6 + (i ? (r() - .3) : .6), Math.sin(i * 1.9) * (i ? 1.1 : 0), i, 2.2 - (i ? .4 : 0), 1.9, 2.1), i % 2 ? "#4a7d3a" : "#3f7334");
  }
  return b.geometry();
}
export function lampGeometry() {
  const b = new Builder();
  b.cyl(0, 0, 0, .09, 6.2, "#30343a", 6, .8); b.cyl(0, 0, 0, .2, .4, "#30343a", 8);
  b.geo(G.box(), M(.7, 6.15, 0, 0, 1.5, .08, .1), "#30343a");
  return b.geometry();
}
export function lampHeadGeometry() { return new Builder().box(1.35, 5.98, 0, .55, .16, .3, "#fff3cf").geometry(); }
