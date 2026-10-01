/* Journey Navigator — a holographic dot-matrix Earth for choosing where Mindy
   travels next. Countries glow as beacons; choose one and the globe glides in to
   show its cities; choose a city and she warps there. */
import * as THREE from "./vendor/three.module.min.js";

const MASK = "data:image/png;base64,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";
const D2R = Math.PI / 180, TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export const toVec = (lat, lon, r = 1) => { const phi = (90 - lat) * D2R, th = (lon + 180) * D2R; return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
const km = (a, b) => { const p1 = a.lat * D2R, p2 = b.lat * D2R, dp = p2 - p1, dl = (b.lon - a.lon) * D2R; const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2; return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h))); };
const fmtCoord = (lat, lon) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const facingVS = `
  attribute float aSize; attribute vec3 aColor; attribute float aPhase; attribute float aHi;
  uniform float uScale; uniform float uTime;
  varying vec3 vColor; varying float vPhase; varying float vFace; varying float vHi;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vFace = dot(normalize(wp.xyz), normalize(cameraPosition));
    vec4 mv = viewMatrix * wp;
    gl_PointSize = aSize * uScale * (1.0 + aHi * 0.6) / -mv.z;
    gl_Position = projectionMatrix * mv;
    vColor = aColor; vPhase = aPhase; vHi = aHi;
  }`;
const beaconFS = `
  uniform float uTime; uniform float uDim;
  varying vec3 vColor; varying float vPhase; varying float vFace; varying float vHi;
  void main(){
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = smoothstep(0.34, 0.0, d);
    float halo = smoothstep(1.0, 0.0, d) * 0.35;
    float t = fract(uTime * 0.55 + vPhase);
    float ring = smoothstep(0.07, 0.0, abs(d - (0.25 + t * 0.7))) * (1.0 - t);
    float a = (core + halo + ring * (0.8 + vHi)) * smoothstep(0.02, 0.25, vFace) * uDim;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * (1.0 + core * 0.8 + vHi * 0.5), a);
  }`;

export class TravelGlobe {
  constructor(host, { coords, onPick, onClose, low = false } = {}) {
    this.host = host; this.coords = coords; this.onPick = onPick; this.onClose = onClose; this.low = low;
    this.yaw = 0; this.pitch = .3; this.dist = 6; this.tYaw = 0; this.tPitch = .3; this.tDist = 4.2; this.vel = { x: 0, y: 0 };
    this.mode = "world"; this.time = 0; this.running = false; this.idle = 0;
    this.buildDom(); this.buildScene(); this.installInput();
    this.frame = this.frame.bind(this);
  }
  buildDom() {
    const h = this.host; h.classList.add("tg-root");
    h.innerHTML = `
      <canvas class="tg-canvas" aria-label="Interactive globe of Mindy's journey"></canvas>
      <div class="tg-labels" aria-hidden="true"></div>
      <div class="tg-tip" hidden></div>
      <div class="tg-flash"></div>
      <header class="tg-head">
        <div><span class="tg-eyebrow">◎ JOURNEY NAVIGATOR</span><h1 class="tg-title">Where to next?</h1><p class="tg-sub"></p></div>
        <button class="tg-close" type="button" aria-label="Back to Mindy">✕ <span>Back to Mindy</span></button>
      </header>
      <aside class="tg-panel">
        <button class="tg-back" type="button" hidden>‹ All countries</button>
        <div class="tg-card" hidden></div>
        <label class="tg-search"><span>⌕</span><input type="search" placeholder="Search a country or city" aria-label="Search a country or city"></label>
        <div class="tg-list" role="list"></div>
      </aside>
      <div class="tg-hint">Drag to spin · scroll or pinch to zoom · tap a glowing beacon</div>
      <div class="tg-scan" aria-hidden="true"></div>`;
    this.canvas = h.querySelector(".tg-canvas"); this.labels = h.querySelector(".tg-labels"); this.tip = h.querySelector(".tg-tip");
    h.querySelector(".tg-close").addEventListener("click", () => this.close(true));
    h.querySelector(".tg-back").addEventListener("click", () => this.showWorld());
    h.querySelector(".tg-search input").addEventListener("input", e => { this.query = e.target.value.trim().toLocaleLowerCase(); this.renderList(); });
  }
  buildScene() {
    const R = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !this.low, alpha: true });
    R.setPixelRatio(Math.min(devicePixelRatio || 1, this.low ? 1.25 : 2)); R.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(38, 1, .05, 100);
    this.globe = new THREE.Group(); this.globe.rotation.order = "XYZ"; this.scene.add(this.globe);
    // Dark core hides the far side; a rim shader gives the glass edge.
    const core = new THREE.Mesh(new THREE.SphereGeometry(.992, 64, 48), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color("#0a2a3f") } },
      vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 wp = modelMatrix*vec4(position,1.); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }",
      fragmentShader: "uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - max(dot(vN, vV), 0.), 2.6); vec3 base = vec3(.008,.02,.045); gl_FragColor = vec4(base + uColor * .2 + vec3(.25,.85,1.) * f * .55, 1.); }"
    }));
    this.globe.add(core);
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.2, 64, 48), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 wp = modelMatrix*vec4(position,1.); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }",
      fragmentShader: "varying vec3 vN; varying vec3 vV; void main(){ float d = dot(vN, vV); float a = pow(clamp(d + .55, 0., 1.), 4.) * 1.6; gl_FragColor = vec4(vec3(.25,.8,1.) * a, a); }"
    }));
    this.scene.add(atmo);
    // Latitude / longitude grid
    const grid = []; for (let lat = -75; lat <= 75; lat += 15) for (let lon = 0; lon < 360; lon += 3) grid.push(toVec(lat, lon, 1.004), toVec(lat, lon + 3, 1.004));
    for (let lon = 0; lon < 360; lon += 15) for (let lat = -87; lat < 87; lat += 3) grid.push(toVec(lat, lon, 1.004), toVec(lat + 3, lon, 1.004));
    this.globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grid), new THREE.LineBasicMaterial({ color: "#3fd8ff", transparent: true, opacity: .07, depthWrite: false })));
    // Orbit rings with travelling satellites
    this.rings = [];
    for (const [r, tilt, spin, n] of [[1.42, .45, .05, 220], [1.62, -.3, -.035, 260]]) {
      const pts = [], phase = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; if (i % 5 > 2) continue; pts.push(Math.cos(a) * r, 0, Math.sin(a) * r); phase.push(i / n); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute("aT", new THREE.Float32BufferAttribute(phase, 1));
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uSpin: { value: spin } },
        vertexShader: "attribute float aT; uniform float uTime; uniform float uSpin; varying float vB; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); float h = fract(aT - uTime*uSpin*1.6); vB = .18 + pow(smoothstep(.12,0.,h),1.5)*1.6; gl_PointSize = (1.6 + vB*2.2) * 2.2; gl_Position = projectionMatrix*mv; }",
        fragmentShader: "varying float vB; void main(){ float d = length(gl_PointCoord-.5)*2.; float a = smoothstep(1.,0.,d)*vB; gl_FragColor = vec4(vec3(.45,.9,1.)*a, a); }" });
      const ring = new THREE.Points(g, m); ring.rotation.set(tilt, 0, tilt * .6); this.scene.add(ring); this.rings.push({ ring, spin, m });
    }
    // Stars
    const sp = []; const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < 1600; i++) { const v = new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).normalize().multiplyScalar(30 + rnd() * 20); sp.push(v.x, v.y, v.z); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    this.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: "#a9d8ff", size: .09, transparent: true, opacity: .7, depthWrite: false })));
    // Land dots load from the embedded mask
    const img = new Image(); img.onload = () => this.buildLand(img); img.src = MASK;
    // Beacons
    const beaconMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uDim: { value: 1 } }, vertexShader: facingVS, fragmentShader: beaconFS });
    this.countryMat = beaconMat(); this.cityMat = beaconMat();
    this.countryPts = new THREE.Points(new THREE.BufferGeometry(), this.countryMat); this.countryPts.frustumCulled = false; this.globe.add(this.countryPts);
    this.cityPts = new THREE.Points(new THREE.BufferGeometry(), this.cityMat); this.cityPts.frustumCulled = false; this.globe.add(this.cityPts);
    // Travel arc
    this.arcN = 90; const ag = new THREE.BufferGeometry(); ag.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(this.arcN * 3), 3));
    ag.setAttribute("aT", new THREE.Float32BufferAttribute(Float32Array.from({ length: this.arcN }, (_, i) => i / (this.arcN - 1)), 1));
    this.arcMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uShow: { value: 0 } },
      vertexShader: "attribute float aT; uniform float uTime; uniform float uScale; varying float vA; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); float head = fract(uTime*.45); float k = smoothstep(.22,0.,head-aT) * step(aT, head); vA = .28 + k*1.4; gl_PointSize = (2.2 + k*4.5) * uScale / -mv.z * .006; gl_Position = projectionMatrix*mv; }",
      fragmentShader: "uniform float uShow; varying float vA; void main(){ float d = length(gl_PointCoord-.5)*2.; float a = smoothstep(1.,0.,d)*vA*uShow; gl_FragColor = vec4(vec3(1.,.82,.45)*a, a); }" });
    this.arc = new THREE.Points(ag, this.arcMat); this.arc.frustumCulled = false; this.globe.add(this.arc);
  }
  buildLand(img) {
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const data = x.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
    const land = (lat, lon) => { const px = Math.floor((lon + 180) / 360 * W) % W, py = clamp(Math.floor((90 - lat) / 180 * H), 0, H - 1); return data[(py * W + px) * 4] > 128; };
    const N = this.low ? 30000 : 60000, pos = [], col = [], ph = [], golden = Math.PI * (3 - Math.sqrt(5));
    const a = new THREE.Color("#3ce7ff"), b = new THREE.Color("#7a6bff"), t = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      const lat = Math.asin(y) / D2R, lon = wrap(Math.atan2(Math.sin(th) * r, Math.cos(th) * r)) / D2R;
      if (lat < -62 || !land(lat, lon)) continue;
      const v = toVec(lat, lon, 1.0); pos.push(v.x, v.y, v.z);
      t.copy(a).lerp(b, clamp((lat + 40) / 120, 0, 1) * .55); col.push(t.r, t.g, t.b); ph.push(Math.random());
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("aPhase", new THREE.Float32BufferAttribute(ph, 1));
    this.landMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uFocus: { value: new THREE.Vector3(0, 0, 1) }, uFocusOn: { value: 0 } },
      vertexShader: `attribute vec3 aColor; attribute float aPhase; uniform float uTime; uniform float uScale; uniform vec3 uFocus; uniform float uFocusOn; varying vec3 vC; varying float vA;
        void main(){ vec4 wp = modelMatrix*vec4(position,1.); float face = dot(normalize(wp.xyz), normalize(cameraPosition)); vec4 mv = viewMatrix*wp;
          float near = smoothstep(.985, .999, dot(normalize(position), uFocus)) * uFocusOn;
          float tw = .75 + .25*sin(uTime*1.7 + aPhase*40.);
          vA = smoothstep(-.05, .3, face) * tw * (1.5 - uFocusOn*.45 + near*.35);
          vC = mix(aColor, vec3(.7,1.,1.), near*.35);
          gl_PointSize = uScale * .58 * (1.0 + near*.25) / sqrt(-mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: "varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord-.5)*2.; float a = smoothstep(1.,.35,d)*vA; if(a<.01) discard; gl_FragColor = vec4(vC*a, a); }" });
    this.land = new THREE.Points(g, this.landMat); this.land.frustumCulled = false; this.globe.add(this.land);
  }
  installInput() {
    const ptrs = new Map(); let moved = 0, last = null;
    const c = this.canvas;
    c.addEventListener("pointerdown", e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); c.setPointerCapture(e.pointerId); moved = 0; last = performance.now(); this.vel = { x: 0, y: 0 }; this.dragging = true; });
    c.addEventListener("pointermove", e => {
      const p = ptrs.get(e.pointerId);
      if (!p) { this.hover(e); return; }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], before = Math.hypot(a.x - b.x, a.y - b.y); p.x = e.clientX; p.y = e.clientY; const after = Math.hypot(a.x - b.x, a.y - b.y); this.tDist = clamp(this.tDist * before / Math.max(1, after), 1.35, 5.5); moved += 10; return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y, k = .0036 * (this.dist - .85) / 2.3; moved += Math.abs(dx) + Math.abs(dy);
      this.yaw += dx * k; this.pitch = clamp(this.pitch + dy * k, -1.3, 1.3); this.tYaw = this.yaw; this.tPitch = this.pitch;
      const now = performance.now(), dt = Math.max(8, now - last); last = now; this.vel = { x: dx * k / dt * 16, y: dy * k / dt * 16 };
      p.x = e.clientX; p.y = e.clientY; this.idle = 0;
    });
    const up = e => { ptrs.delete(e.pointerId); if (ptrs.size) return; this.dragging = false; if (moved < 7) this.click(e); };
    c.addEventListener("pointerup", up); c.addEventListener("pointercancel", e => { ptrs.delete(e.pointerId); this.dragging = false; });
    c.addEventListener("pointerleave", () => { if (!this.dragging) this.setHover(null); });
    c.addEventListener("wheel", e => { e.preventDefault(); this.tDist = clamp(this.tDist * (e.deltaY > 0 ? 1.1 : .9), 1.35, 5.5); this.idle = 0; }, { passive: false });
    this.onKey = e => { if (!this.running) return; if (e.key === "Escape") { e.preventDefault(); if (this.mode === "country") this.showWorld(); else this.close(true); } };
    window.addEventListener("keydown", this.onKey);
    this.onResize = () => this.resize(); window.addEventListener("resize", this.onResize);
  }

  /* ---------- data ---------- */
  open({ places, visited = {}, currentId }) {
    this.places = places; this.visited = visited; this.currentId = currentId;
    const by = new Map();
    for (const p of places) { const [lat, lon] = this.coords(p); const city = { place: p, lat, lon, visited: !!visited[p.id] }; if (!by.has(p.country)) by.set(p.country, { name: p.country, region: p.region, cities: [] }); by.get(p.country).cities.push(city); }
    this.countries = [...by.values()].map(c => { const v = new THREE.Vector3(); c.cities.forEach(ci => v.add(toVec(ci.lat, ci.lon))); v.normalize(); const lat = Math.asin(v.y) / D2R, lon = wrap(Math.atan2(v.z, -v.x) - Math.PI) / D2R; return { ...c, lat, lon, visited: c.cities.filter(ci => ci.visited).length, spread: Math.max(...c.cities.map(ci => toVec(ci.lat, ci.lon).angleTo(v))) }; });
    this.current = this.countries.flatMap(c => c.cities).find(ci => ci.place.id === currentId) || null;
    this.buildCountryBeacons();
    const totalV = Object.values(visited).filter(Boolean).length;
    this.host.querySelector(".tg-sub").textContent = `${this.countries.length} countries · ${places.length} cities · ${totalV} visited`;
    this.host.hidden = false; this.host.classList.remove("tg-out"); this.running = true; this.query = ""; this.host.querySelector(".tg-search input").value = "";
    const start = this.current || this.countries[0];
    this.focusOn(start.lat, start.lon, 4.2); this.yaw = this.tYaw + 1.4; this.pitch = this.tPitch * .4; this.dist = 7.5;
    this.showWorld(false);
    this.host.classList.add("tg-intro"); setTimeout(() => this.host.classList.remove("tg-intro"), 1200);
    this.resize(); this.last = performance.now(); cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(this.frame);
  }
  close(user = false) {
    if (!this.running) return; this.running = false; cancelAnimationFrame(this.raf); this.host.hidden = true; this.setHover(null);
    if (user) this.onClose?.();
  }
  beaconGeometry(items, size, colorOf) {
    const pos = [], col = [], sz = [], ph = [], hi = [], c = new THREE.Color();
    items.forEach((it, i) => { const v = toVec(it.lat, it.lon, 1.012); pos.push(v.x, v.y, v.z); c.set(colorOf(it)); col.push(c.r, c.g, c.b); sz.push(size(it)); ph.push((i * .618) % 1); hi.push(0); });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("aSize", new THREE.Float32BufferAttribute(sz, 1)); g.setAttribute("aPhase", new THREE.Float32BufferAttribute(ph, 1)); g.setAttribute("aHi", new THREE.Float32BufferAttribute(hi, 1));
    return g;
  }
  buildCountryBeacons() {
    this.countryPts.geometry.dispose();
    this.countryPts.geometry = this.beaconGeometry(this.countries, c => 30 + Math.min(c.cities.length, 12) * 2.2, c => c === this.currentCountry() ? "#ff7ad9" : c.visited ? "#ffcf6b" : "#59f2ff");
  }
  currentCountry() { return this.current ? this.countries.find(c => c.cities.some(ci => ci === this.current)) : null; }
  buildCityBeacons(country) {
    this.cityPts.geometry.dispose();
    this.cityList = country ? country.cities : [];
    this.cityPts.geometry = this.beaconGeometry(this.cityList, () => 22, ci => ci === this.current ? "#ff7ad9" : ci.visited ? "#ffcf6b" : "#c9fbff");
  }
  focusOn(lat, lon, dist) {
    const v = toVec(lat, lon); let ty = -Math.atan2(v.x, v.z);
    this.tYaw = this.yaw + wrap(ty - this.yaw); this.tPitch = clamp(lat * D2R, -1.25, 1.25); if (dist) this.tDist = dist; this.idle = 0; this.vel = { x: 0, y: 0 };
  }

  /* ---------- modes & panel ---------- */
  showWorld(animate = true) {
    this.mode = "world"; this.country = null; this.selectedCity = null; this.buildCityBeacons(null);
    this.host.querySelector(".tg-title").textContent = "Where to next?"; this.host.querySelector(".tg-back").hidden = true; this.host.querySelector(".tg-card").hidden = true;
    this.host.querySelector(".tg-search input").placeholder = "Search a country or city";
    if (animate) this.tDist = 4.2; this.renderList(); this.setArcTarget(null);
  }
  selectCountry(c) {
    this.mode = "country"; this.country = c; this.selectedCity = null; this.query = ""; this.host.querySelector(".tg-search input").value = "";
    this.buildCityBeacons(c);
    this.focusOn(c.lat, c.lon, clamp(1.4 + c.spread * 2.4, 1.5, 2.6));
    this.host.querySelector(".tg-title").textContent = c.name; this.host.querySelector(".tg-back").hidden = false;
    this.host.querySelector(".tg-search input").placeholder = `Search ${c.cities.length} ${c.cities.length === 1 ? "city" : "cities"}`;
    const card = this.host.querySelector(".tg-card"); card.hidden = false;
    card.innerHTML = `<span class="tg-eyebrow">${esc(c.region.toUpperCase())}</span><strong>${esc(c.name)}</strong><small>${c.cities.length} ${c.cities.length === 1 ? "stop" : "stops"} on her journey · ${c.visited} visited</small><p class="tg-coord">${fmtCoord(c.lat, c.lon)}</p><p class="tg-card-hint">Choose a city to travel there.</p>`;
    this.renderList(); this.setArcTarget(c);
    if (c.cities.length === 1) this.selectCity(c.cities[0]);
  }
  selectCity(ci) {
    this.selectedCity = ci; this.focusOn(ci.lat, ci.lon, Math.min(this.tDist, 1.75));
    const card = this.host.querySelector(".tg-card"); card.hidden = false;
    const from = this.current, dist = from && from !== ci ? `${Math.round(km(from, ci)).toLocaleString()} km from ${esc(from.place.city)}` : ci === from ? "Mindy is here now" : "";
    card.innerHTML = `<span class="tg-eyebrow">${esc(ci.place.country.toUpperCase())} · ${ci.visited ? "VISITED ✓" : "ON THE JOURNEY"}</span><strong>${esc(ci.place.city)}</strong><p class="tg-coord">${fmtCoord(ci.lat, ci.lon)}</p>${dist ? `<small>${dist}</small>` : ""}<button class="tg-go" type="button">Travel here <span>⟶</span></button>`;
    card.querySelector(".tg-go").addEventListener("click", () => this.travel(ci));
    this.renderList(); this.setArcTarget(ci);
  }
  travel(ci) {
    if (this.warping) return; this.warping = true; this.focusOn(ci.lat, ci.lon, 1.08);
    this.host.classList.add("tg-warp");
    setTimeout(() => { this.host.classList.remove("tg-warp"); this.warping = false; this.close(false); this.onPick?.(ci.place.id); }, 900);
  }
  renderList() {
    const list = this.host.querySelector(".tg-list"), q = this.query || ""; list.replaceChildren();
    const row = (label, side, cls, onClick, hoverItem) => { const b = document.createElement("button"); b.type = "button"; b.className = `tg-item ${cls}`; b.setAttribute("role", "listitem"); b.innerHTML = `<i></i><span></span><small></small>`; b.children[1].textContent = label; b.children[2].textContent = side; b.addEventListener("click", onClick); b.addEventListener("pointerenter", () => this.setArcTarget(hoverItem)); list.append(b); return b; };
    if (this.mode === "world") {
      if (q) { for (const c of this.countries) for (const ci of c.cities) if (ci.place.city.toLocaleLowerCase().includes(q) && !c.name.toLocaleLowerCase().includes(q)) row(ci.place.city, c.name, ci.visited ? "visited" : "", () => { this.selectCountry(c); this.selectCity(ci); }, ci); }
      for (const c of this.countries) if (!q || c.name.toLocaleLowerCase().includes(q)) row(c.name, `${c.cities.length} ${c.cities.length === 1 ? "city" : "cities"}${c.visited ? ` · ${c.visited} ✓` : ""}`, `${c.visited ? "visited" : ""}${c === this.currentCountry() ? " here" : ""}`, () => this.selectCountry(c), c);
    } else {
      for (const ci of this.country.cities) if (!q || ci.place.city.toLocaleLowerCase().includes(q)) row(ci.place.city, ci === this.current ? "You are here" : fmtCoord(ci.lat, ci.lon), `${ci.visited ? "visited" : ""}${ci === this.selectedCity ? " active" : ""}${ci === this.current ? " here" : ""}`, () => this.selectCity(ci), ci);
    }
    if (!list.children.length) { const p = document.createElement("p"); p.className = "tg-empty"; p.textContent = "No match on her journey."; list.append(p); }
  }

  /* ---------- picking ---------- */
  project(lat, lon, r = 1.012) {
    const v = toVec(lat, lon, r).applyEuler(this.globe.rotation), face = v.clone().normalize().dot(this.camera.position.clone().normalize());
    const p = v.project(this.camera), rect = this.canvas.getBoundingClientRect();
    return { x: (p.x + 1) / 2 * rect.width, y: (1 - p.y) / 2 * rect.height, face };
  }
  pickAt(cx, cy) {
    const rect = this.canvas.getBoundingClientRect(), x = cx - rect.left, y = cy - rect.top; let best = null, bd = 26;
    const test = (it, kind) => { const s = this.project(it.lat, it.lon); if (s.face < .15) return; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = { it, kind }; } };
    if (this.mode === "country") this.country.cities.forEach(ci => test(ci, "city"));
    if (!best) this.countries.forEach(c => test(c, "country"));
    return best;
  }
  hover(e) { if (!this.running) return; const hit = this.pickAt(e.clientX, e.clientY); this.setHover(hit, e); }
  setHover(hit, e) {
    this.hovered = hit; this.canvas.style.cursor = hit ? "pointer" : "grab";
    if (!hit) { this.tip.hidden = true; this.setArcTarget(this.selectedCity || this.country); return; }
    const it = hit.it; this.tip.hidden = false;
    this.tip.innerHTML = hit.kind === "country" ? `<b>${esc(it.name)}</b><span>${it.cities.length} ${it.cities.length === 1 ? "city" : "cities"}${it.visited ? ` · ${it.visited} visited` : ""}</span>` : `<b>${esc(it.place.city)}</b><span>${it.visited ? "Visited ✓" : "On the journey"} · ${fmtCoord(it.lat, it.lon)}</span>`;
    const r = this.host.getBoundingClientRect(); this.tip.style.transform = `translate(${e.clientX - r.left + 16}px, ${e.clientY - r.top + 14}px)`;
    this.setArcTarget(it);
  }
  click(e) {
    const hit = this.pickAt(e.clientX, e.clientY); if (!hit) return;
    if (hit.kind === "country") this.selectCountry(hit.it); else if (this.selectedCity === hit.it) this.travel(hit.it); else this.selectCity(hit.it);
  }
  setArcTarget(t) {
    this.arcTarget = t && this.current && t !== this.current && !(t.cities && t.cities.includes(this.current) && t.cities.length === 1) ? t : null;
    if (!this.arcTarget) return;
    const a = toVec(this.current.lat, this.current.lon), b = toVec(t.lat, t.lon), ang = a.angleTo(b), lift = .04 + ang * .22, arr = this.arc.geometry.attributes.position;
    for (let i = 0; i < this.arcN; i++) { const s = i / (this.arcN - 1), v = new THREE.Vector3().copy(a).lerp(b, s).normalize(); if (ang > 3.1) v.copy(a).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang * s); v.multiplyScalar(1.012 + Math.sin(Math.PI * s) * lift); arr.setXYZ(i, v.x, v.y, v.z); }
    arr.needsUpdate = true;
  }

  /* ---------- loop ---------- */
  resize() {
    const r = this.canvas.getBoundingClientRect(); if (!r.width) return; const key = `${r.width}x${r.height}`; if (key === this.sizeKey) return; this.sizeKey = key;
    this.renderer.setSize(r.width, r.height, false); this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix();
  }
  frame(now) {
    if (!this.running) return; this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(.05, (now - this.last) / 1000 || 0); this.last = now; this.time += dt; this.idle += dt;
    if (!this.dragging) {
      if (Math.abs(this.vel.x) + Math.abs(this.vel.y) > 1e-4) { this.yaw += this.vel.x; this.pitch = clamp(this.pitch + this.vel.y, -1.3, 1.3); this.tYaw = this.yaw; this.tPitch = this.pitch; this.vel.x *= .93; this.vel.y *= .93; }
      else if (this.mode === "world" && this.idle > 4) { this.tYaw += dt * .06; }
      const k = 1 - Math.exp(-dt * 3.2); this.yaw = lerp(this.yaw, this.tYaw, k); this.pitch = lerp(this.pitch, this.tPitch, k);
    }
    this.dist = lerp(this.dist, this.tDist, 1 - Math.exp(-dt * (this.warping ? 4.5 : 2.6)));
    this.globe.rotation.set(this.pitch, this.yaw, 0);
    // Camera sits slightly off-axis so the globe floats left of the panel on wide screens.
    const r = this.canvas.getBoundingClientRect(), wide = r.width > 820, aspect = r.width / Math.max(1, r.height), fit = aspect < 1 ? Math.pow(1 / aspect, .7) : 1;
    const camD = this.dist * fit, shift = wide ? .34 * (this.dist / 4.2) : 0, lift = wide ? 0 : -.125 * camD;
    this.camera.position.set(shift, lift, camD); this.camera.lookAt(shift, lift, 0);
    const scale = Math.min(r.width, r.height) * (this.renderer.getPixelRatio()) * (wide ? 1 : 1.25), U = this.time;
    this.countryMat.uniforms.uTime.value = U; this.countryMat.uniforms.uScale.value = scale * .0019; this.countryMat.uniforms.uDim.value = lerp(this.countryMat.uniforms.uDim.value, this.mode === "country" ? .35 : 1, dt * 4);
    this.cityMat.uniforms.uTime.value = U; this.cityMat.uniforms.uScale.value = scale * .0016;
    if (this.landMat) { this.landMat.uniforms.uTime.value = U; this.landMat.uniforms.uScale.value = scale * (this.low ? .017 : .0135) * (4.2 / Math.max(1.4, this.dist)) ** .3; const f = this.country || this.selectedCity; this.landMat.uniforms.uFocusOn.value = lerp(this.landMat.uniforms.uFocusOn.value, f ? 1 : 0, dt * 3); if (f) this.landMat.uniforms.uFocus.value.copy(toVec(f.lat, f.lon)); }
    for (const { ring, spin, m } of this.rings) { ring.rotation.y += dt * spin; m.uniforms.uTime.value = U; }
    this.arcMat.uniforms.uTime.value = U; this.arcMat.uniforms.uScale.value = scale; this.arcMat.uniforms.uShow.value = lerp(this.arcMat.uniforms.uShow.value, this.arcTarget ? 1 : 0, dt * 5);
    // Highlight hovered / selected beacons
    const hiC = this.countryPts.geometry.attributes.aHi; if (hiC) { this.countries.forEach((c, i) => hiC.setX(i, (this.hovered?.it === c || this.country === c) ? 1 : 0)); hiC.needsUpdate = true; }
    const hiT = this.cityPts.geometry.attributes.aHi; if (hiT) { this.cityList.forEach((ci, i) => hiT.setX(i, (this.hovered?.it === ci || this.selectedCity === ci) ? 1 : 0)); hiT.needsUpdate = true; }
    this.renderLabels();
    this.renderer.render(this.scene, this.camera);
  }
  renderLabels() {
    const items = [];
    if (this.mode === "country") this.country.cities.forEach(ci => items.push({ key: ci.place.id, text: ci.place.city, it: ci, cls: `${ci.visited ? "v" : ""}${ci === this.selectedCity ? " sel" : ""}` }));
    else { const cc = this.currentCountry(); if (cc) items.push({ key: "here", text: `Mindy · ${this.current.place.city}`, it: this.current, cls: "here" }); if (this.hovered?.kind === "country") items.push({ key: "h", text: this.hovered.it.name, it: this.hovered.it, cls: "hov" }); }
    const seen = new Set(), placed = [];
    this.labelEls ||= new Map();
    // Selected, hovered and visited labels win; the rest only show where they fit.
    const rank = l => (l.cls.includes("sel") || l.it === this.hovered?.it ? 0 : l.cls.includes("here") ? 1 : l.cls.includes("v") ? 2 : 3);
    for (const l of items.sort((a, b) => rank(a) - rank(b))) {
      const s = this.project(l.it.lat, l.it.lon), w = l.text.length * 7 + 18;
      if (s.face < .15 || placed.some(p => Math.abs(p.x - s.x) < (p.w + w) / 2 && Math.abs(p.y - s.y) < 22)) continue;
      placed.push({ x: s.x, y: s.y, w });
      seen.add(l.key); let el = this.labelEls.get(l.key); if (!el) { el = document.createElement("span"); this.labels.append(el); this.labelEls.set(l.key, el); }
      el.textContent = l.text; el.className = `tg-label ${l.cls}`; el.style.opacity = clamp((s.face - .15) * 4, 0, 1); el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    }
    for (const [k, el] of this.labelEls) if (!seen.has(k)) { el.remove(); this.labelEls.delete(k); }
  }
}
