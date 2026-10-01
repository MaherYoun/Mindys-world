/* Mindy's open world — a continuous third-person world built from the places
   she has visited. Walk, run, jump, borrow a car, follow the GPS between cities
   and step through each city's guild portal into its original walkable scene. */
import * as THREE from "./vendor/three.module.min.js";
import { TAU, clamp, lerp, smoothstep, angleLerp, rng, hash, pick, makeTextures, Humanoid, randomLook, makeCar, CAR_COLORS } from "./ow-assets.js";
import { planWorld, World } from "./ow-world.js";
import { TravelGlobe } from "./ow-globe.js";

const SAVE_KEY = "mindys-openworld-v1";
const SKY = [[-.4, "#02040b", "#070d1d", "#05070d"], [-.14, "#0c1433", "#272a52", "#0b0d16"], [-.03, "#24326a", "#c56a5f", "#1a1a24"], [.05, "#3a5aa0", "#ffad78", "#3a3a40"], [.16, "#3b73c0", "#ffd6a8", "#5a5a5a"], [.38, "#2f70c6", "#acd3ef", "#6a6f75"], [1, "#2766bb", "#bcdff5", "#6a6f75"]];
const lerpStops = (e, out) => {
  let i = 0; while (i < SKY.length - 2 && e > SKY[i + 1][0]) i++;
  const a = SKY[i], b = SKY[i + 1], t = clamp((e - a[0]) / (b[0] - a[0]), 0, 1);
  for (let k = 0; k < 3; k++) out[k].set(a[k + 1]).lerp(new THREE.Color(b[k + 1]), t);
};
const isTouch = () => matchMedia("(pointer: coarse)").matches;

const skyVS = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const skyFS = `uniform vec3 uTop, uHorizon, uGround, uSunDir, uSunColor; uniform float uNight, uTime; varying vec3 vDir;
float h21(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 c = mix(uHorizon, uTop, pow(clamp(h, 0., 1.), .42));
  c = mix(c, uGround, smoothstep(0.0, -0.2, h));
  float s = max(dot(d, uSunDir), 0.);
  c += uSunColor * (pow(s, 1400.) * 18. + pow(s, 12.) * .32 + pow(s, 3.) * .07);
  float m = max(dot(d, -uSunDir), 0.);
  c += vec3(.8, .85, 1.) * smoothstep(.9994, .9997, m) * 2.2 * uNight + vec3(.25, .3, .45) * pow(m, 40.) * .2 * uNight;
  if (h > 0.) { float st = h21(floor(d * 380.)); float tw = .55 + .45 * sin(uTime * 2.5 + st * 60.); c += vec3(step(.9978, st)) * uNight * tw * smoothstep(0., .2, h) * 1.6; }
  gl_FragColor = vec4(c, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

class Sfx {
  constructor(enabled) { this.enabled = enabled; this.ctx = null; }
  ensure() { if (this.ctx || !this.enabled()) return this.ctx; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); const c = this.ctx; this.master = c.createGain(); this.master.gain.value = .5; this.master.connect(c.destination); const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = "sawtooth"; o2.type = "square"; o2.detune.value = 7; f.type = "lowpass"; f.frequency.value = 420; g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master); o.start(); o2.start(); this.engine = { o, o2, f, g }; } catch { this.ctx = null; } return this.ctx; }
  engineAt(on, speed, throttle) { if (!this.ensure() || !this.engine) return; const t = this.ctx.currentTime, e = this.engine, rpm = 38 + Math.abs(speed) * 2.6 + throttle * 18; e.o.frequency.setTargetAtTime(rpm, t, .08); e.o2.frequency.setTargetAtTime(rpm * .5, t, .08); e.f.frequency.setTargetAtTime(300 + Math.abs(speed) * 22 + throttle * 300, t, .1); e.g.gain.setTargetAtTime(on && this.enabled() ? .035 + throttle * .03 : 0, t, .12); }
  tone(freqs, dur = .18, type = "sine", vol = .12, gap = .09) { if (!this.ensure() || !this.enabled()) return; const c = this.ctx; freqs.forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * gap; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .05); }); }
  chime() { this.tone([784, 988, 1175, 1568], .35, "triangle", .09, .08); }
  horn() { this.tone([392, 494], .35, "square", .05, 0); }
  stop() { if (this.engine && this.ctx) this.engine.g.gain.setTargetAtTime(0, this.ctx.currentTime, .05); }
}

class Vehicle {
  constructor(type, color, extra = {}) { Object.assign(this, makeCar(type, color, extra)); this.x = 0; this.z = 0; this.y = 0; this.heading = 0; this.vf = 0; this.vr = 0; this.steer = 0; this.pitch = 0; this.roll = 0; this.spin = 0; this.root.rotation.order = "YXZ"; this.vis = { x: 0, z: 0, h: 0 }; }
  sync(snap = false) {
    if (snap) { this.vis.x = this.x; this.vis.z = this.z; this.vis.h = this.heading; }
    this.root.position.set(this.vis.x, this.y, this.vis.z); this.root.rotation.set(this.pitch, this.vis.h, this.roll);
    for (const w of this.wheels) { w.w.rotation.set(0, w.front ? -this.steer : 0, -this.spin); }
  }
}

export class MindyOpenWorld {
  constructor(container, opts = {}) {
    this.el = container; this.opts = opts; this.save = this.load(); window.__mindyOpenWorld = this;
    this.quality = this.save.quality || (isTouch() || (navigator.hardwareConcurrency || 8) <= 4 ? "low" : "high");
    this.keys = new Set(); this.stick = { x: 0, y: 0 }; this.touchRun = false;
    this.yaw = 0; this.pitch = .32; this.zoom = 1; this.lastDrag = -10; this.time = 0;
    this.hour = this.save.hour ?? (new Date().getHours() + new Date().getMinutes() / 60);
    this.sfx = new Sfx(() => this.opts.soundOn?.() !== false);
    this.buildDom(); this.installInput();
    this.tx = null; this.running = false; this.frame = this.frame.bind(this);
  }
  load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } }
  persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...this.save, hour: this.hour, quality: this.quality })); } catch {} }
  $(sel) { return this.el.querySelector(sel); }

  /* ---------------- DOM ---------------- */
  buildDom() {
    this.el.classList.add("ow-root");
    this.el.innerHTML = `
      <canvas class="ow-canvas" aria-label="Mindy's open world, a 3D world of the places she has visited"></canvas>
      <div class="ow-hud">
        <div class="ow-topbar">
          <button data-act="exit" title="Back to the journey">✕ <span>Leave</span></button>
          <button data-act="map" title="World map (M)">⌖ <span>Map</span> <kbd>M</kbd></button>
          <button data-act="time" title="Skip ahead 3 hours (T)">◑ <span>Time</span> <kbd>T</kbd></button>
          <button data-act="quality" title="Graphics quality"></button>
          <button data-act="help" title="Controls">?</button>
        </div>
        <div class="ow-status"><div class="ow-clock"></div><div class="ow-flowers"></div><div class="ow-where"></div></div>
        <div class="ow-mini"><canvas width="220" height="220"></canvas><span class="ow-north">N</span></div>
        <div class="ow-speed" hidden><b>0</b><small>KM/H</small></div>
        <div class="ow-prompt" hidden></div>
        <div class="ow-banner" aria-live="polite"><span class="ow-banner-kicker"></span><span class="ow-banner-city"></span><span class="ow-banner-sub"></span></div>
        <div class="ow-toast" aria-live="polite"></div>
        <div class="ow-touch">
          <div class="ow-stick"><div class="ow-knob"></div></div>
          <div class="ow-buttons">
            <button class="ow-tb ow-tb-e" data-touch="E" hidden>E</button>
            <button class="ow-tb ow-tb-f" data-touch="F">🚗</button>
            <button class="ow-tb ow-tb-jump" data-touch="Space">⤒</button>
            <button class="ow-tb ow-tb-run" data-touch="run">A<small>RUN</small></button>
          </div>
        </div>
      </div>
      <div class="ow-mapview" hidden>
        <div class="ow-map-board"><canvas></canvas>
          <div class="ow-map-zoom"><button data-zoom="1.4" aria-label="Zoom in">＋</button><button data-zoom="0.7" aria-label="Zoom out">−</button><button data-zoom="0" aria-label="Center on Mindy">⌖</button></div>
          <span class="ow-map-hint">Tap a city to plan a route · drag to pan · scroll to zoom</span>
        </div>
        <aside class="ow-map-side">
          <div class="ow-map-head"><span class="ow-eyebrow">MINDY'S WORLD</span><h2>The whole journey</h2><button class="ow-map-close" aria-label="Close map">✕</button></div>
          <label class="ow-scope">Explore <select aria-label="Country to explore"></select></label>
          <div class="ow-map-card" hidden></div>
          <div class="ow-map-list"></div>
        </aside>
      </div>
      <div class="ow-globe-host" hidden></div>
      <div class="ow-loading"><div class="ow-loading-card"><span class="ow-eyebrow">MINDY'S WORLD</span><h2>Building Mindy's world…</h2><div class="ow-bar"><i></i></div><p class="ow-loading-tip">Every stop on her journey becomes a city, placed where it really is and joined by highways. Visited cities are marked with a ✓.</p></div></div>
      <div class="ow-help" hidden><div class="ow-help-card">
        <span class="ow-eyebrow">HOW TO PLAY</span><h2>Explore Mindy's world</h2>
        <div class="ow-help-grid">
          <div><kbd>W</kbd>/<kbd>Z</kbd> <kbd>S</kbd> <kbd>Q</kbd> <kbd>D</kbd> or arrows</div><div>Walk · steer when driving</div>
          <div>hold <kbd>A</kbd> or <kbd>Shift</kbd></div><div>Run · nitro boost when driving</div>
          <div><kbd>Space</kbd></div><div>Jump · handbrake drift</div>
          <div><kbd>F</kbd></div><div>Get in or out of a car</div>
          <div><kbd>E</kbd></div><div>Open the journey navigator at a portal · open the diary kiosk</div>
          <div><kbd>M</kbd> <kbd>T</kbd> <kbd>H</kbd></div><div>Map &amp; GPS · skip time · horn</div>
          <div>Drag / scroll</div><div>Look around · zoom the camera</div>
        </div>
        <p>Every city is a stop on Mindy's journey; the ones she has visited are marked ✓. Find the 3 golden sunflowers hidden in every city. Step into any glowing portal to open the journey navigator and travel to any city on her trip.</p>
        <button class="ow-primary" data-act="closehelp">Let's go →</button>
      </div></div>`;
    this.canvas = this.$(".ow-canvas"); this.mini = this.$(".ow-mini canvas"); this.miniCtx = this.mini.getContext("2d");
    this.el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => this.action(b.dataset.act)));
    this.$(".ow-map-close").addEventListener("click", () => this.toggleMap(false));
    this.$(".ow-scope select").addEventListener("change", e => { this.toggleMap(false); this.open({ ...this.config, scope: e.target.value }); this.opts.onScope?.(e.target.value); });
    this.updateQualityButton();
  }
  action(a) {
    if (a === "exit") this.opts.onExit?.();
    else if (a === "map") this.toggleMap();
    else if (a === "time") { this.hour = (this.hour + 3) % 24; this.envStamp = -1; this.toast(`⏱ ${this.clockText()}`); this.persist(); }
    else if (a === "quality") { this.quality = this.quality === "high" ? "low" : "high"; this.persist(); this.updateQualityButton(); this.toast(this.quality === "high" ? "High graphics — rebuilding…" : "Battery saver graphics — rebuilding…"); this.signature = null; setTimeout(() => this.open(this.config), 60); }
    else if (a === "help") this.$(".ow-help").hidden = false;
    else if (a === "closehelp") { this.$(".ow-help").hidden = true; this.save.seenHelp = true; this.persist(); }
  }
  updateQualityButton() { const b = this.$('[data-act="quality"]'); b.innerHTML = this.quality === "high" ? "◆ <span>HD</span>" : "◇ <span>Saver</span>"; }

  /* ---------------- input ---------------- */
  installInput() {
    const map = { w: "fwd", z: "fwd", arrowup: "fwd", s: "back", arrowdown: "back", q: "left", arrowleft: "left", d: "right", arrowright: "right", a: "run", shift: "run", " ": "jump", e: "use", f: "car", m: "map", t: "time", h: "horn", escape: "esc" };
    const keyOf = e => map[e.key?.toLowerCase()] || ({ KeyW: "fwd", KeyS: "back", KeyD: "right", Space: "jump", ShiftLeft: "run", ShiftRight: "run" })[e.code];
    this.onKeyDown = e => {
      if (!this.running || this.blocked() || this.globeOpen) return; const k = keyOf(e); if (!k) return; e.preventDefault();
      if (e.repeat) return; this.keys.add(k); this.sfx.ensure();
      if (k === "use") this.use(); if (k === "car") this.toggleCar(); if (k === "map") this.toggleMap(); if (k === "time") this.action("time"); if (k === "horn") this.sfx.horn();
      if (k === "esc") { if (!this.$(".ow-mapview").hidden) this.toggleMap(false); else if (!this.$(".ow-help").hidden) this.action("closehelp"); }
      if (k === "jump" && !this.driving && this.p.grounded) { this.p.vy = 5.6; this.p.grounded = false; }
    };
    this.onKeyUp = e => { const k = keyOf(e); if (k) this.keys.delete(k); };
    window.addEventListener("keydown", this.onKeyDown); window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", () => { this.keys.clear(); this.stick = { x: 0, y: 0 }; this.touchRun = false; });
    const pointers = new Map();
    this.canvas.addEventListener("pointerdown", e => { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.canvas.setPointerCapture(e.pointerId); this.sfx.ensure(); });
    this.canvas.addEventListener("pointermove", e => {
      const p = pointers.get(e.pointerId); if (!p) return;
      if (pointers.size === 2) { const [a, b] = [...pointers.values()], before = Math.hypot(a.x - b.x, a.y - b.y); p.x = e.clientX; p.y = e.clientY; const after = Math.hypot(a.x - b.x, a.y - b.y); this.zoom = clamp(this.zoom * before / Math.max(1, after), .45, 2.4); return; }
      this.yaw -= (e.clientX - p.x) * .0055; this.pitch = clamp(this.pitch + (e.clientY - p.y) * .004, -.05, 1.25); p.x = e.clientX; p.y = e.clientY; this.lastDrag = this.time;
    });
    const up = e => pointers.delete(e.pointerId); this.canvas.addEventListener("pointerup", up); this.canvas.addEventListener("pointercancel", up);
    this.canvas.addEventListener("wheel", e => { e.preventDefault(); this.zoom = clamp(this.zoom * (e.deltaY > 0 ? 1.1 : .9), .45, 2.4); }, { passive: false });
    // Touch joystick and buttons
    const stick = this.$(".ow-stick"), knob = this.$(".ow-knob"); let sid = null;
    const move = e => { const r = stick.getBoundingClientRect(), rad = r.width * .38, dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), l = Math.max(1, Math.hypot(dx, dy) / rad); this.stick = { x: dx / l / rad, y: dy / l / rad }; knob.style.transform = `translate(${this.stick.x * rad}px,${this.stick.y * rad}px)`; };
    stick.addEventListener("pointerdown", e => { sid = e.pointerId; stick.setPointerCapture(sid); move(e); e.preventDefault(); this.sfx.ensure(); });
    stick.addEventListener("pointermove", e => { if (e.pointerId === sid) move(e); });
    const rel = e => { if (e.pointerId !== sid) return; sid = null; this.stick = { x: 0, y: 0 }; knob.style.transform = ""; }; stick.addEventListener("pointerup", rel); stick.addEventListener("pointercancel", rel);
    this.el.querySelectorAll("[data-touch]").forEach(b => {
      const k = b.dataset.touch;
      b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture(e.pointerId); this.sfx.ensure(); if (k === "run") this.touchRun = true; else if (k === "E") this.use(); else if (k === "F") this.toggleCar(); else if (k === "Space") { if (this.driving) this.keys.add("jump"); else if (this.p.grounded) { this.p.vy = 5.6; this.p.grounded = false; } } });
      const end = () => { if (k === "run") this.touchRun = false; if (k === "Space") this.keys.delete("jump"); }; b.addEventListener("pointerup", end); b.addEventListener("pointercancel", end);
    });
    // Full map interactions
    const mc = this.$(".ow-map-board canvas"); let drag = null, moved = 0;
    mc.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; moved = 0; mc.setPointerCapture(e.pointerId); });
    mc.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); this.mapView.cx -= dx / this.mapView.scale; this.mapView.cz -= dy / this.mapView.scale; drag = { x: e.clientX, y: e.clientY }; this.drawMap(); });
    mc.addEventListener("pointerup", e => { if (drag && moved < 8) this.mapClick(e); drag = null; });
    mc.addEventListener("wheel", e => { e.preventDefault(); this.mapView.scale = clamp(this.mapView.scale * (e.deltaY > 0 ? .85 : 1.18), this.mapView.min, 3); this.drawMap(); }, { passive: false });
    this.el.querySelectorAll("[data-zoom]").forEach(b => b.addEventListener("click", () => { const z = Number(b.dataset.zoom); if (!z) { const t = this.focusPos(); this.mapView.cx = t.x; this.mapView.cz = t.z; } else this.mapView.scale = clamp(this.mapView.scale * z, this.mapView.min, 3); this.drawMap(); }));
    this.onResize = () => this.resize(); window.addEventListener("resize", this.onResize);
  }
  blocked() { return this.opts.blockControls?.() || false; }

  /* ---------------- lifecycle ---------------- */
  open(config) {
    this.config = config; const scope = config.scope || "all";
    const sel = this.$(".ow-scope select"), countries = [...new Set(config.places.map(p => p.country))];
    sel.replaceChildren(new Option("The whole journey", "all"), ...countries.map(c => new Option(`${c} (${config.places.filter(p => p.country === c).length})`, c))); sel.value = scope;
    this.$(".ow-map-head h2").textContent = scope === "all" ? "The whole journey" : scope;
    this.$(".ow-loading h2").textContent = scope === "all" ? "Building every city on her journey…" : `Building ${scope}…`;
    this.el.hidden = false; this.running = true;
    const coords = window.SunflowerGlobeMath?.coords || (() => [0, 0]);
    const plan = planWorld(config.places, { visited: config.visited, currentId: config.currentId, scope, coords });
    const sig = `${this.quality}|${scope}|${plan.districts.map(d => d.id + (d.visited ? "+" : "")).join(",")}`;
    const startId = config.currentId;
    if (sig !== this.signature) {
      this.$(".ow-loading").hidden = false; this.$(".ow-bar i").style.width = "15%";
      this.signature = sig;
      requestAnimationFrame(() => requestAnimationFrame(() => { setTimeout(() => {
        try { this.build(plan); this.spawnAt(startId); }
        catch (err) { console.error(err); this.$(".ow-loading h2").textContent = "The open world needs WebGL. Please try another browser."; return; }
        this.$(".ow-bar i").style.width = "100%"; setTimeout(() => { this.$(".ow-loading").hidden = true; if (!this.save.seenHelp) this.$(".ow-help").hidden = false; }, 150);
        this.start();
      }, 30); }));
    } else { this.applyLooks(); if (this.config.respawn !== false) this.spawnAt(startId); this.start(); }
  }
  start() { this.lastT = performance.now(); cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(this.frame); this.resize(); }
  close() { this.running = false; cancelAnimationFrame(this.raf); this.keys.clear(); this.sfx.stop(); this.el.hidden = true; this.toggleMap(false); this.persist(); }

  build(plan) {
    this.disposeWorld();
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.quality === "high", powerPreference: "high-performance" });
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.pmrem = new THREE.PMREMGenerator(this.renderer);
    }
    const low = this.quality === "low", R = this.renderer;
    R.shadowMap.enabled = !low; R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.75)); this.sizeKey = null;
    this.tx ??= makeTextures();
    this.scene = new THREE.Scene(); this.scene.fog = new THREE.FogExp2("#a9c9e0", low ? .0019 : .0013);
    this.camera = new THREE.PerspectiveCamera(60, 1, .3, 4200);
    this.world = new World(plan, this.tx, { quality: this.quality });
    this.scene.add(this.world.group);
    // Sky + lights
    this.skyMat = new THREE.ShaderMaterial({ vertexShader: skyVS, fragmentShader: skyFS, side: THREE.BackSide, depthWrite: false, uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGround: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color() }, uNight: { value: 0 }, uTime: { value: 0 } } });
    const skyGeo = new THREE.SphereGeometry(50, 32, 16);
    this.sky = new THREE.Mesh(skyGeo, this.skyMat); this.sky.frustumCulled = false; this.sky.renderOrder = -10; this.scene.add(this.sky);
    this.envScene = new THREE.Scene(); this.envScene.add(new THREE.Mesh(skyGeo, this.skyMat));
    this.sun = new THREE.DirectionalLight("#ffffff", 3); this.sun.castShadow = !low;
    const sc = this.sun.shadow.camera; sc.left = -95; sc.right = 95; sc.top = 95; sc.bottom = -95; sc.near = 10; sc.far = 800; this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -.0004; this.sun.shadow.normalBias = .5;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight("#bcd8ff", "#4a4230", .6); this.scene.add(this.hemi);
    this.lampLights = []; for (let i = 0; i < (low ? 0 : 6); i++) { const l = new THREE.PointLight("#ffc98a", 0, 26, 1.6); this.scene.add(l); this.lampLights.push(l); }
    this.headlight = new THREE.SpotLight("#fff2d6", 0, 60, .5, .5, 1.2); this.scene.add(this.headlight, this.headlight.target);
    // Clouds
    const cb = []; const cr = rng("clouds"); const cloudGeo = new THREE.IcosahedronGeometry(1, 1); const cloudMat = new THREE.MeshBasicMaterial({ color: "#ffffff", fog: false, transparent: true, opacity: .9 }); this.cloudMat = cloudMat;
    this.clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, 26 * 5); const dm = new THREE.Object3D(); const h = this.world.hf;
    for (let i = 0; i < 26; i++) { const x = h.x0 + cr() * (h.x1 - h.x0), z = h.z0 + cr() * (h.z1 - h.z0), y = 340 + cr() * 120; for (let k = 0; k < 5; k++) { dm.position.set(x + (k - 2) * 28 + cr() * 10, y + cr() * 12, z + cr() * 26); dm.scale.set(30 + cr() * 22, 12 + cr() * 8, 22 + cr() * 14); dm.updateMatrix(); this.clouds.setMatrixAt(i * 5 + k, dm.matrix); cb.push(0); } }
    this.clouds.computeBoundingSphere(); this.clouds.frustumCulled = false; this.scene.add(this.clouds);
    // Waypoint beam
    const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uColor: { value: new THREE.Color("#c27bff") }, uTime: { value: 0 } }, vertexShader: "varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }", fragmentShader: "uniform vec3 uColor; uniform float uTime; varying float vY; void main(){ float a = (1. - smoothstep(0., 420., vY)) * (.55 + .2 * sin(uTime * 3. - vY * .05)); gl_FragColor = vec4(uColor * a, a); }" });
    const beamGeo = new THREE.CylinderGeometry(2.6, 2.6, 420, 16, 1, true); beamGeo.translate(0, 210, 0);
    this.beam = new THREE.Mesh(beamGeo, beamMat); this.beam.visible = false; this.beam.frustumCulled = false; this.scene.add(this.beam);
    // Collectible sunflowers
    const flower = new THREE.Group(), fm = this.world.mats.flower, fg = (geo, y, z = 0, rx = 0) => { const m = new THREE.Mesh(geo, fm); m.position.set(0, y, z); m.rotation.x = rx; return m; };
    const petals = new THREE.CylinderGeometry(.62, .62, .08, 14); petals.setAttribute("color", new THREE.Float32BufferAttribute(new Array(petals.attributes.position.count * 3).fill(0).map((_, i) => [1, .78, .12][i % 3]), 3));
    const center = new THREE.CylinderGeometry(.28, .28, .14, 14); center.setAttribute("color", new THREE.Float32BufferAttribute(new Array(center.attributes.position.count * 3).fill(0).map((_, i) => [.35, .2, .08][i % 3]), 3));
    const stem = new THREE.CylinderGeometry(.05, .05, 1.2, 6); stem.setAttribute("color", new THREE.Float32BufferAttribute(new Array(stem.attributes.position.count * 3).fill(0).map((_, i) => [.25, .55, .22][i % 3]), 3));
    flower.add(fg(stem, .6), fg(petals, 1.35, 0, Math.PI / 2), fg(center, 1.35, .06, Math.PI / 2));
    this.flowerProto = flower;
    for (const c of this.world.collectibles) { c.mesh = flower.clone(); c.mesh.position.set(c.x, c.y + .3, c.z); c.mesh.visible = !this.save.collected?.[c.id]; c.mesh.traverse(o => { o.castShadow = true; }); this.scene.add(c.mesh); }
    this.save.collected ||= {};
    // Characters
    this.mindy = new Humanoid(this.config.mindy || {}, { backpack: true }); this.scene.add(this.mindy.root);
    this.friend = new Humanoid({}, { scale: .92 }); this.scene.add(this.friend.root);
    this.applyLooks();
    this.p = { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, heading: 0, grounded: true };
    this.f = { x: 0, z: 0, heading: 0 };
    // Vehicles & people
    this.cars = []; this.traffic = []; this.peds = []; this.driving = null; this.myCar = null;
    this.spawnTraffic();
    this.envStamp = -1; this.lastDistrict = null; this.route = null; this.target = null;
    this.mapView = null; this.lastMini = 0; this.lastSlow = 0;
    this.updateFlowers();
  }
  disposeWorld() {
    if (!this.scene) return;
    this.scene.traverse(o => { if (o.geometry && !o.geometry.__shared) o.geometry.dispose?.(); });
    for (const m of Object.values(this.world?.mats || {})) m.dispose?.();
    this.envRT?.dispose(); this.envRT = null; this.scene = null; this.world = null;
  }
  applyLooks() {
    if (!this.mindy) return; this.mindy.setLook(this.config.mindy || {});
    const look = this.config.companion?.(this.config.currentId) || {}; this.friendName = look.name || "your companion"; this.friend.setLook(look);
  }
  spawnAt(id) {
    const d = this.world.districts.find(v => v.id === id) || this.world.districts[0]; if (!d) return;
    if (this.driving) this.exitCar(true);
    Object.assign(this.p, { x: d.x + 3, z: d.z - 27.5, vx: 0, vz: 0, vy: 0, heading: 0, grounded: true }); this.p.y = this.world.surfaceAt(this.p.x, this.p.z);
    Object.assign(this.f, { x: d.x + 1.4, z: d.z - 29, heading: 0 }); this.yaw = 0; this.pitch = .3;
    if (!this.myCar) { this.myCar = new Vehicle("sport", "#ff7a3d", { special: true }); this.myCar.mine = true; this.scene.add(this.myCar.root); this.cars.push(this.myCar); }
    Object.assign(this.myCar, { x: d.x - 8, z: d.z - 32.8, heading: Math.PI / 2, vf: 0, vr: 0 }); this.myCar.y = this.world.surfaceAt(this.myCar.x, this.myCar.z); this.myCar.sync(true);
    this.lastDistrict = null; this.camPos = null;
  }

  /* ---------------- traffic & people ---------------- */
  spawnTraffic() {
    const W = this.world, r = rng("traffic"), max = this.quality === "low" ? 14 : 26;
    const slots = []; for (const e of W.edges) for (let k = 0; k < Math.min(3, Math.ceil(e.len / 300)); k++) slots.push({ mode: "hw", edge: e, s: r() * e.len, dir: r() > .5 ? 1 : -1 });
    for (const d of W.districts) slots.push({ mode: "ring", d, ang: r() * TAU, sgn: r() > .5 ? 1 : -1 });
    slots.sort(() => r() - .5);
    for (const s of slots.slice(0, max)) this.addTrafficCar(s, r);
  }
  addTrafficCar(slot, r = Math.random) {
    const type = pick(r, ["sedan", "sedan", "hatch", "van", "sedan"]), taxi = type === "sedan" && r() < .2;
    const v = new Vehicle(type, pick(r, CAR_COLORS), { taxi }); this.scene.add(v.root); this.cars.push(v);
    const t = { v, ...slot, speed: 0, cruise: slot.mode === "hw" ? 15 + r() * 7 : 9 + r() * 3, remaining: TAU, wait: 0 };
    if (t.mode === "ring") this.ringNext(t, t.d, null);
    this.traffic.push(t); v.traffic = t; this.placeTraffic(t, 0, true); return t;
  }
  ringNext(t, d, fromEdge) {
    const exits = d.exits; if (!exits.length) { t.next = null; t.remaining = Infinity; return; }
    const options = exits.filter(e => e.edge !== fromEdge); const next = (options.length ? options : exits)[Math.floor(Math.random() * (options.length || exits.length))];
    let delta = Math.atan2(Math.sin(next.angle - t.ang), Math.cos(next.angle - t.ang)); if (next.edge === fromEdge) delta = TAU;
    t.sgn = delta >= 0 ? 1 : -1; t.remaining = Math.abs(delta); t.next = next;
  }
  placeTraffic(t, dt, snap = false) {
    const W = this.world; let x, z, tx, tz;
    if (t.mode === "hw") { const e = t.edge, p = W.pointOnEdge(e, t.dir > 0 ? t.s : e.len - t.s); tx = p.tx * t.dir; tz = p.tz * t.dir; x = p.x; z = p.z; }
    else { const d = t.d; x = d.x + Math.cos(t.ang) * d.R; z = d.z + Math.sin(t.ang) * d.R; tx = -Math.sin(t.ang) * t.sgn; tz = Math.cos(t.ang) * t.sgn; }
    const v = t.v; v.x = x - tz * 3; v.z = z + tx * 3; v.heading = Math.atan2(tx, tz); v.y = Math.max(0, W.groundAt(v.x, v.z)) + .02; v.vf = t.speed;
    const k = snap ? 1 : Math.min(1, dt * 9); v.vis.x = lerp(v.vis.x, v.x, k); v.vis.z = lerp(v.vis.z, v.z, k); v.vis.h = angleLerp(v.vis.h, v.heading, k);
    if (snap) { v.vis.x = v.x; v.vis.z = v.z; v.vis.h = v.heading; }
  }
  updateTraffic(dt) {
    const W = this.world, me = this.driving || this.p;
    for (const t of this.traffic) {
      const v = t.v, fx = Math.sin(v.heading), fz = Math.cos(v.heading); let block = false;
      const check = (ox, oz, gap = 11) => { const dx = ox - v.x, dz = oz - v.z, ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx); if (ahead > 0 && ahead < gap && side < 2.6) block = true; };
      check(me.x, me.z, 12); if (!this.driving && this.myCar) check(this.myCar.x, this.myCar.z);
      for (const o of this.traffic) if (o !== t && Math.abs(o.v.x - v.x) < 14 && Math.abs(o.v.z - v.z) < 14) check(o.v.x, o.v.z, 9);
      t.speed = block ? Math.max(0, t.speed - 16 * dt) : Math.min(t.cruise, t.speed + 5 * dt);
      t.wait = block && t.speed < .5 ? t.wait + dt : 0; if (t.wait > 2.5 && Math.hypot(me.x - v.x, me.z - v.z) < 14) { if (Math.random() < dt * .6) this.sfxNear(v, () => this.sfx.horn()); }
      if (t.wait > 6) { t.wait = 0; t.speed = t.cruise * .5; } // nudge past gridlock
      const step = t.speed * dt;
      if (t.mode === "hw") {
        t.s += step;
        if (t.s >= t.edge.len) { const di = t.dir > 0 ? t.edge.b : t.edge.a, d = W.districts[di], ex = d.exits.find(e => e.edge === t.edge.index && e.end === (t.dir > 0 ? "b" : "a")); t.mode = "ring"; t.d = d; t.ang = ex.angle; this.ringNext(t, d, t.edge.index); }
      } else {
        const da = step / t.d.R; t.ang += da * t.sgn; t.remaining -= da;
        if (t.remaining <= 0 && t.next) { const e = W.edges[t.next.edge]; t.mode = "hw"; t.edge = e; t.dir = t.next.end === "a" ? 1 : -1; t.s = 0; }
      }
      this.placeTraffic(t, dt);
      const dist = Math.hypot(v.x - this.p.x, v.z - this.p.z); v.root.visible = dist < 650;
      v.spin += t.speed * dt / .37; v.steer = 0; if (v.root.visible) v.sync();
    }
  }
  sfxNear(v, fn) { const d = Math.hypot(v.x - this.p.x, v.z - this.p.z); if (d < 40) fn(); }
  updateDistrictsSlow() {
    const W = this.world, px = this.focusPos().x, pz = this.focusPos().z, low = this.quality === "low";
    for (const d of W.districts) {
      const dist = Math.hypot(px - d.x, pz - d.z);
      d.group.visible = dist < 1900;
      // Parked cars
      if (dist < 360 && !d.parked) { const r = rng(d.id + ":parked"); d.parked = d.parkSpots.slice(0, low ? 3 : 6).map(s => { const v = new Vehicle(pick(r, ["sedan", "hatch", "van", "sedan"]), pick(r, CAR_COLORS), { taxi: r() < .15 }); Object.assign(v, { x: s.x, z: s.z, heading: s.heading }); v.y = W.surfaceAt(s.x, s.z); v.sync(true); this.scene.add(v.root); this.cars.push(v); return v; }); }
      else if (dist > 560 && d.parked) { for (const v of d.parked) if (v !== this.driving && v !== this.myCar && !v.claimed) { this.scene.remove(v.root); this.cars.splice(this.cars.indexOf(v), 1); } d.parked = null; }
      // Pedestrians
      if (dist < 280 && !d.peds && d.pedLoops.length) {
        const r = rng(d.id + ":peds"), n = Math.min(d.pedLoops.length, (d.big ? 12 : 7) >> (low ? 1 : 0)); d.peds = [];
        for (let i = 0; i < n; i++) { const loop = d.pedLoops[(i * 7) % d.pedLoops.length], h = new Humanoid(randomLook(r), { detail: false }); this.scene.add(h.root); const ped = { h, loop, t: r() * 4, dir: r() > .5 ? 1 : -1, speed: 1.1 + r() * .6, dodge: 0, d }; d.peds.push(ped); this.peds.push(ped); }
      } else if (dist > 420 && d.peds) { for (const p of d.peds) { this.scene.remove(p.h.root); this.peds.splice(this.peds.indexOf(p), 1); } d.peds = null; }
      // City name sign (texture created only when close)
      if (dist < 300 && !d.sign) d.sign = this.makeSign(d); else if (dist > 600 && d.sign) { this.scene.remove(d.sign); d.sign.material.map.dispose(); d.sign.material.dispose(); d.sign.geometry.dispose(); d.sign = null; }
    }
    // Night lamp lights follow the nearest lamps.
    if (this.lampLights.length && this.world.lampGrid) {
      const near = this.world.lampGrid.query(px, pz, 120, []).map(l => ({ l, d: (l.hx - px) ** 2 + (l.hz - pz) ** 2 })).sort((a, b) => a.d - b.d);
      this.lampLights.forEach((L, i) => { const n = near[i]; if (n) { L.position.set(n.l.hx, n.l.hy - .5, n.l.hz); L.intensity = this.night * 60; } else L.intensity = 0; });
    }
  }
  makeSign(d) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 192; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 192); g.addColorStop(0, "#1f2a3f"); g.addColorStop(1, "#141b29"); x.fillStyle = g; x.fillRect(0, 0, 512, 192);
    x.strokeStyle = d.style.accent; x.lineWidth = 6; x.strokeRect(8, 8, 496, 176);
    x.fillStyle = "#fff5dd"; x.textAlign = "center"; x.font = "700 64px Georgia, serif"; x.fillText(d.place.city, 256, 96, 470);
    x.fillStyle = d.style.accent; x.font = "600 26px system-ui, sans-serif"; x.fillText(`${d.place.country.toUpperCase()} · ${d.visited ? "VISITED ✓" : "ON THE JOURNEY"}`, 256, 146, 470);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.875), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(d.signPos.x, 2.6, d.signPos.z); m.rotation.y = Math.PI / 2; this.scene.add(m); return m;
  }
  updatePeds(dt) {
    const me = this.driving || this.p, speed = this.driving ? Math.abs(this.driving.vf) : 0;
    for (const p of this.peds) {
      const { loop } = p, h = loop.h, L = h * 8; p.t = (p.t + p.dir * p.speed * dt / (h * 2) + 4) % 4;
      const seg = Math.floor(p.t), u = p.t - seg, corners = [[-h, -h], [h, -h], [h, h], [-h, h]], a = corners[seg], b = corners[(seg + 1) % 4];
      let x = loop.x + lerp(a[0], b[0], u), z = loop.z + lerp(a[1], b[1], u); const tx = (b[0] - a[0]) * p.dir, tz = (b[1] - a[1]) * p.dir; void L;
      // Pedestrians always hop clear of a moving car.
      const dme = Math.hypot(me.x - x, me.z - z); if (this.driving && speed > 2.5 && dme < 7) p.dodge = Math.min(1, p.dodge + dt * 6); else p.dodge = Math.max(0, p.dodge - dt * 1.2);
      const inward = [loop.x - x, loop.z - z], il = Math.hypot(...inward) || 1; x += inward[0] / il * p.dodge * 1.6; z += inward[1] / il * p.dodge * 1.6;
      p.h.root.position.set(x, .2 + Math.sin(p.dodge * Math.PI) * .5, z); p.h.root.rotation.y = Math.atan2(tx, tz);
      const vis = Math.hypot(x - this.p.x, z - this.p.z) < 160; p.h.root.visible = vis; if (vis) p.h.update(dt, p.speed, false, p.dodge > .2);
    }
  }

  /* ---------------- player ---------------- */
  focusPos() { return this.driving ? this.driving : this.p; }
  input() {
    const k = this.keys, side = (k.has("right") ? 1 : 0) - (k.has("left") ? 1 : 0) + this.stick.x, fwd = (k.has("fwd") ? 1 : 0) - (k.has("back") ? 1 : 0) - this.stick.y;
    return { side: clamp(side, -1, 1), fwd: clamp(fwd, -1, 1), run: k.has("run") || this.touchRun, jump: k.has("jump") };
  }
  collide(x, z, r, y = 0) {
    for (const c of this.world.colliders.query(x, z, r + 1, this._cq ||= [])) {
      if (c.type === "box") { if (y > c.h + .2) continue; const nx = clamp(x, c.x0, c.x1), nz = clamp(z, c.z0, c.z1), dx = x - nx, dz = z - nz, d = Math.hypot(dx, dz);
        if (d < r) { if (d > 1e-4) { x = nx + dx / d * r; z = nz + dz / d * r; } else { const o = [[c.x0 - r - x, 0], [c.x1 + r - x, 0], [0, c.z0 - r - z], [0, c.z1 + r - z]].sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]))[0]; x += o[0]; z += o[1]; } this._hit = true; } }
      else { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-4) { x = c.x + dx / d * m; z = c.z + dz / d * m; this._hit = true; } }
    }
    return [x, z];
  }
  updateWalk(dt) {
    const p = this.p, inp = this.input(), W = this.world;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), rx = -fz, rz = fx;
    let mx = fx * inp.fwd + rx * inp.side, mz = fz * inp.fwd + rz * inp.side; const ml = Math.hypot(mx, mz);
    const speed = ml > .1 ? (inp.run ? 8.6 : 4.3) * Math.min(1, ml) : 0; if (ml > .1) { mx /= ml; mz /= ml; }
    const acc = p.grounded ? 12 : 3; p.vx = lerp(p.vx, mx * speed, Math.min(1, dt * acc)); p.vz = lerp(p.vz, mz * speed, Math.min(1, dt * acc));
    let nx = p.x + p.vx * dt, nz = p.z + p.vz * dt;
    [nx, nz] = this.collide(nx, nz, .38, p.y);
    for (const c of this.cars) if (c !== this.driving) { const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz); if (d < 1.9 && d > 1e-3) { nx = c.x + dx / d * 1.9; nz = c.z + dz / d * 1.9; } }
    if (W.groundAt(nx, nz) < -1.4) { nx = p.x; nz = p.z; } // the sea stops at the ankles
    p.x = nx; p.z = nz;
    const floor = W.surfaceAt(p.x, p.z); p.vy -= 16 * dt; p.y += p.vy * dt;
    if (p.y <= floor) { p.y = floor; p.vy = 0; p.grounded = true; } else if (p.y - floor > .35) p.grounded = false;
    if (Math.hypot(p.vx, p.vz) > .4) p.heading = angleLerp(p.heading, Math.atan2(p.vx, p.vz), Math.min(1, dt * 12));
    this.mindy.sitting = false; this.mindy.root.position.set(p.x, p.y, p.z); this.mindy.root.rotation.set(0, p.heading, 0);
    this.mindy.update(dt, Math.hypot(p.vx, p.vz), inp.run, !p.grounded);
    // Companion trails a step behind and to the side.
    const f = this.f, tx = p.x - Math.sin(p.heading) * 1.6 - Math.cos(p.heading) * 1.1, tz = p.z - Math.cos(p.heading) * 1.6 + Math.sin(p.heading) * 1.1;
    const fd = Math.hypot(tx - f.x, tz - f.z); if (fd > 25) { f.x = tx; f.z = tz; }
    const fs = fd > .5 ? Math.min(fd * 2.4, 9) : 0; const ox = f.x, oz = f.z;
    if (fs) { f.x += (tx - f.x) / fd * fs * dt; f.z += (tz - f.z) / fd * fs * dt; [f.x, f.z] = this.collide(f.x, f.z, .35); }
    const moved = Math.hypot(f.x - ox, f.z - oz) / Math.max(dt, 1e-3); if (moved > .3) f.heading = angleLerp(f.heading, Math.atan2(f.x - ox, f.z - oz), Math.min(1, dt * 10)); else f.heading = angleLerp(f.heading, p.heading, dt * 2);
    this.friend.sitting = false; this.friend.root.visible = true; this.friend.root.position.set(f.x, W.surfaceAt(f.x, f.z), f.z); this.friend.root.rotation.set(0, f.heading, 0); this.friend.update(dt, moved, moved > 5);
    this.sfx.engineAt(false, 0, 0);
  }
  updateDrive(dt) {
    const c = this.driving, inp = this.input(), W = this.world;
    const boost = inp.run, top = boost ? 64 : 44, accel = boost ? 22 : 13;
    if (inp.fwd > .1) c.vf += (c.vf < -.5 ? 32 : accel * (1 - Math.max(0, c.vf) / top)) * inp.fwd * dt;
    else if (inp.fwd < -.1) c.vf -= (c.vf > .5 ? 30 : 9 * (1 + c.vf / 14)) * -inp.fwd * dt;
    else c.vf *= Math.max(0, 1 - .55 * dt);
    if (inp.jump) c.vf *= Math.max(0, 1 - 1.6 * dt);
    const maxSteer = .58 * (1 - Math.min(Math.abs(c.vf) / 90, .55));
    c.steer = lerp(c.steer, inp.side * maxSteer, Math.min(1, dt * 6));
    const grip = inp.jump ? 1.6 : 9;
    let fx = Math.sin(c.heading), fz = Math.cos(c.heading);
    let vx = fx * c.vf + -fz * c.vr, vz = fz * c.vf + fx * c.vr; // world velocity from forward + right
    c.heading -= (c.vf / 2.7) * Math.tan(c.steer) * dt * (inp.jump ? 1.35 : 1);
    fx = Math.sin(c.heading); fz = Math.cos(c.heading);
    c.vf = vx * fx + vz * fz; c.vr = (vx * -fz + vz * fx) * Math.exp(-grip * dt);
    vx = fx * c.vf - fz * c.vr; vz = fz * c.vf + fx * c.vr;
    let nx = c.x + vx * dt, nz = c.z + vz * dt; this._hit = false;
    for (const s of [1.25, -1.25]) { const px = nx + fx * s, pz = nz + fz * s, [ax, az] = this.collide(px, pz, 1.05, 0); nx += ax - px; nz += az - pz; }
    for (const o of this.cars) if (o !== c && o.root.visible !== false) { const dx = nx - o.x, dz = nz - o.z, d = Math.hypot(dx, dz); if (d < 3.4 && d > 1e-3) { nx = o.x + dx / d * 3.4; nz = o.z + dz / d * 3.4; this._hit = true; if (!o.traffic) { o.x -= dx / d * .3; o.z -= dz / d * .3; o.sync(true); } } }
    if (W.groundAt(nx + fx * 2, nz + fz * 2) < -1.1) { nx = c.x; nz = c.z; this._hit = true; }
    if (this._hit) { if (Math.abs(c.vf) > 9) { this.shake = Math.min(1, Math.abs(c.vf) / 30); this.sfx.tone([90, 70], .25, "sawtooth", .08, .03); } c.vf *= -.25; c.vr *= .3; }
    c.x = nx; c.z = nz;
    const yf = W.surfaceAt(c.x + fx * 1.4, c.z + fz * 1.4), yb = W.surfaceAt(c.x - fx * 1.4, c.z - fz * 1.4); c.y = lerp(c.y, (yf + yb) / 2 + .02, Math.min(1, dt * 12));
    const accelNow = (c.vf - (c.prevV ?? c.vf)) / Math.max(dt, 1e-3); c.prevV = c.vf;
    c.pitch = lerp(c.pitch, Math.atan2(yb - yf, 2.8) + clamp(-accelNow * .004, -.05, .05), Math.min(1, dt * 8)); c.roll = lerp(c.roll, clamp(c.steer * c.vf * .006, -.08, .08), Math.min(1, dt * 6));
    c.spin += c.vf * dt / .37; c.sync(true);
    // Mindy and her companion ride along.
    const seat = (h, side) => { h.sitting = true; h.root.visible = true; const sx = c.x + fx * -.2 - fz * side * .42, sz = c.z + fz * -.2 + fx * side * .42; h.root.position.set(sx, c.y + .02 + (c.profile.roof[2] - 1.5), sz); h.root.rotation.set(0, c.heading, 0); h.sit(); };
    seat(this.mindy, -1); seat(this.friend, 1);
    this.p.x = c.x; this.p.z = c.z; this.p.y = c.y; this.f.x = c.x; this.f.z = c.z;
    this.sfx.engineAt(true, c.vf, Math.max(0, inp.fwd));
  }
  toggleCar() {
    if (this.driving) return this.exitCar();
    let best = null, bd = 4.2; for (const c of this.cars) { const d = Math.hypot(c.x - this.p.x, c.z - this.p.z); if (d < bd) { bd = d; best = c; } }
    if (!best) return this.toast("No car nearby — find a parked one, or your orange car near the plaza");
    if (best.traffic) { this.traffic.splice(this.traffic.indexOf(best.traffic), 1); best.traffic = null; best.vis = { x: best.x, z: best.z, h: best.heading }; this.sfx.horn(); setTimeout(() => this.running && this.addTrafficCar(this.randomSlot()), 4000); }
    best.claimed = true; best.vf = 0; best.vr = 0; best.steer = 0; this.driving = best; this.yaw = best.heading; this.lastDrag = -10;
    this.toast(best.mine ? "In your car. Hold A for nitro, Space to drift." : `${this.friendName} hops in too.`);
    this.$(".ow-speed").hidden = false;
  }
  randomSlot() { const W = this.world, e = pick(Math.random, W.edges); return e ? { mode: "hw", edge: e, s: 0, dir: Math.random() > .5 ? 1 : -1 } : { mode: "ring", d: W.districts[0], ang: Math.random() * TAU, sgn: 1 }; }
  exitCar(silent = false) {
    const c = this.driving; if (!c) return; this.driving = null; c.vf = 0; c.vr = 0; c.steer = 0; c.pitch = 0; c.roll = 0; c.sync(true);
    const fx = Math.sin(c.heading), fz = Math.cos(c.heading); let x = c.x + fz * 2.1, z = c.z - fx * 2.1;
    [x, z] = this.collide(x, z, .4); Object.assign(this.p, { x, z, vx: 0, vz: 0, vy: 0, heading: c.heading, grounded: true }); this.p.y = this.world.surfaceAt(x, z);
    this.f.x = c.x - fz * 2.1; this.f.z = c.z + fx * 2.1; this.mindy.sitting = false; this.friend.sitting = false;
    this.$(".ow-speed").hidden = true; this.sfx.engineAt(false, 0, 0); if (!silent) this.toast("Parked. Press F to get back in.");
  }
  nearest() {
    if (this.driving) return null; const p = this.p; let best = null, bd = Infinity;
    for (const it of this.world.interactions) { const d = Math.hypot(it.x - p.x, it.z - p.z); if (d < it.r && d < bd) { bd = d; best = it; } }
    return best;
  }
  use() {
    const it = this.nearest(); if (!it) return;
    if (it.type === "portal") this.openGlobe();
    if (it.type === "diary") this.opts.onDiary?.(it.district.id);
  }
  updateCollectibles(dt) {
    const p = this.focusPos(), reach = this.driving ? 3.4 : 1.7;
    for (const c of this.world.collectibles) {
      if (!c.mesh.visible) continue; const d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d > 220) continue; c.mesh.rotation.y += dt * 1.8; c.mesh.position.y = c.y + .35 + Math.sin(this.time * 2 + c.x) * .18;
      if (d < reach) { c.mesh.visible = false; this.save.collected[c.id] = true; this.persist(); this.sfx.chime(); const n = this.world.collectibles.filter(v => v.district === c.district && this.save.collected[v.id]).length; this.toast(`🌻 Golden sunflower · ${n}/3 in ${c.district.place.city}`); this.updateFlowers(); }
    }
  }
  updateFlowers() { const all = this.world.collectibles, n = all.filter(c => this.save.collected[c.id]).length; this.$(".ow-flowers").textContent = `🌻 ${n} / ${all.length}`; }

  /* ---------------- camera, sky ---------------- */
  updateCamera(dt) {
    const c = this.driving, t = c ? new THREE.Vector3(c.x, c.y + 1.7, c.z) : new THREE.Vector3(this.p.x, this.p.y + 1.55, this.p.z);
    if (c && this.time - this.lastDrag > 1.2 && Math.abs(c.vf) > 1.5) this.yaw = angleLerp(this.yaw, c.heading + (c.vf < -2 ? Math.PI : 0), Math.min(1, dt * 2.6));
    const speed = c ? Math.abs(c.vf) : 0, dist = (c ? 8.5 + speed * .05 : 4.6) * this.zoom, pitch = c ? Math.max(this.pitch, .12) : this.pitch;
    const dx = -Math.sin(this.yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = -Math.cos(this.yaw) * Math.cos(pitch);
    let d = dist; // pull in when a wall is between camera and Mindy
    for (const col of this.world.colliders.query(t.x + dx * dist / 2, t.z + dz * dist / 2, dist / 2 + 2, this._camq ||= [])) {
      if (col.type !== "box") continue; let t0 = 0, t1 = dist; const ok = [[t.x, dx, col.x0, col.x1], [t.y, dy, 0, col.h], [t.z, dz, col.z0, col.z1]].every(([o, v, mn, mx]) => { if (Math.abs(v) < 1e-6) return o >= mn && o <= mx; let a = (mn - o) / v, b = (mx - o) / v; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); return t0 <= t1; });
      if (ok && t0 > .3) d = Math.min(d, t0 - .35);
    }
    const pos = new THREE.Vector3(t.x + dx * d, t.y + dy * d, t.z + dz * d); pos.y = Math.max(pos.y, this.world.groundAt(pos.x, pos.z) + .5);
    if (this.shake > 0) { pos.x += (Math.random() - .5) * this.shake * .5; pos.y += (Math.random() - .5) * this.shake * .4; this.shake = Math.max(0, this.shake - dt * 2.5); }
    if (!this.camPos) this.camPos = pos.clone(); else this.camPos.lerp(pos, Math.min(1, dt * (c ? 9 : 14)));
    this.camera.position.copy(this.camPos); this.camera.lookAt(t);
    const fov = 58 + (c ? clamp(speed - 10, 0, 50) * .35 : 0); if (Math.abs(this.camera.fov - fov) > .05) { this.camera.fov = lerp(this.camera.fov, fov, Math.min(1, dt * 4)); this.camera.updateProjectionMatrix(); }
    this.sky.position.copy(this.camera.position);
  }
  updateSky(dt) {
    this.hour = (this.hour + dt / 60) % 24; // one in-game minute per second
    const a = (this.hour - 6) / 24 * TAU, sunDir = new THREE.Vector3(Math.cos(a), Math.sin(a) * .93, .38).normalize(), e = sunDir.y;
    const cols = this._skyCols ||= [new THREE.Color(), new THREE.Color(), new THREE.Color()]; lerpStops(e, cols);
    const night = smoothstep(.04, -.14, e); this.night = night;
    const U = this.skyMat.uniforms; U.uTop.value.copy(cols[0]); U.uHorizon.value.copy(cols[1]); U.uGround.value.copy(cols[2]); U.uSunDir.value.copy(sunDir); U.uNight.value = night; U.uTime.value = this.time;
    const golden = 1 - smoothstep(.04, .35, e); U.uSunColor.value.set("#fff3dc").lerp(new THREE.Color("#ff9d55"), golden).multiplyScalar(smoothstep(-.06, .02, e));
    const f = this.focusPos(), T = new THREE.Vector3(f.x, 0, f.z);
    if (e > -.04) { this.sun.position.copy(T).addScaledVector(sunDir, 400); this.sun.color.set("#fff4e2").lerp(new THREE.Color("#ffab6b"), golden); this.sun.intensity = 3.1 * smoothstep(-.04, .2, e) + .15; }
    else { this.sun.position.copy(T).addScaledVector(sunDir, -400); this.sun.color.set("#9fb6ff"); this.sun.intensity = .42 * night; }
    this.sun.target.position.copy(T); this.sun.shadow.intensity = smoothstep(-.02, .12, Math.abs(e)) * (e > 0 ? 1 : .5);
    this.hemi.color.copy(cols[0]).lerp(new THREE.Color("#ffffff"), .25); this.hemi.groundColor.set("#4a4230").multiplyScalar(1 - night * .7); this.hemi.intensity = .35 + .6 * (1 - night);
    this.scene.fog.color.copy(cols[1]).lerp(cols[0], .25);
    this.renderer.toneMappingExposure = 1 + night * .35;
    const M = this.world.mats; M.facade.emissiveIntensity = night * 1.05 + golden * .08; M.glass.emissiveIntensity = night * .6 + .02; M.lamp.color.setScalar(.7 + night * 2.6); M.neon.color.setScalar(.8 + night * 1.6);
    M.water.color.set("#1f6683").multiplyScalar(1 - night * .6);
    if (this.world.glowMat) this.world.glowMat.opacity = night * .9;
    this.cloudMat.color.copy(cols[1]).lerp(new THREE.Color("#ffffff"), .6).multiplyScalar(1 - night * .82);
    this.headlight.intensity = this.driving ? night * 140 : 0;
    if (this.driving) { const c = this.driving, fx = Math.sin(c.heading), fz = Math.cos(c.heading); this.headlight.position.set(c.x + fx * 2.3, c.y + .8, c.z + fz * 2.3); this.headlight.target.position.set(c.x + fx * 20, 0, c.z + fz * 20); }
    // Re-light reflections when the sky has changed enough.
    const stamp = Math.round(e * 25) + (night > .5 ? 100 : 0);
    if (stamp !== this.envStamp) { this.envStamp = stamp; const rt = this.pmrem.fromScene(this.envScene, 0, .1, 100); this.envRT?.dispose(); this.envRT = rt; this.scene.environment = rt.texture; this.scene.environmentIntensity = .55 + (1 - night) * .4; }
    this.world.mats.water.normalMap.offset.set(this.time * .004, this.time * .0025);
    this.clouds.position.x = (this.time * 1.5) % 600;
  }
  clockText() { const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }

  /* ---------------- GPS & maps ---------------- */
  setTarget(d) {
    this.target = d; this.route = null; this.routeAt = -10;
    if (d) { this.beam.position.set(d.x, 0, d.z); this.beam.visible = true; this.toast(`GPS set: ${d.place.city}`); } else this.beam.visible = false;
  }
  computeRoute() {
    const W = this.world, T = this.target, p = this.focusPos(); if (!T) return;
    if (Math.hypot(p.x - T.x, p.z - T.z) < T.R) { this.route = [{ x: p.x, z: p.z }, { x: T.x, z: T.z }]; return; }
    const N = W.districts.length, dist = new Array(N).fill(Infinity), via = new Array(N).fill(null), done = new Set(); dist[T.index] = 0;
    while (done.size < N) { let u = -1; for (let i = 0; i < N; i++) if (!done.has(i) && (u < 0 || dist[i] < dist[u])) u = i; if (u < 0 || dist[u] === Infinity) break; done.add(u);
      for (const ex of W.districts[u].exits) { const e = W.edges[ex.edge], v = ex.end === "a" ? e.b : e.a, nd = dist[u] + e.len + W.districts[u].R; if (nd < dist[v]) { dist[v] = nd; via[v] = { u, e }; } } }
    // Join the network at the nearest city (or the nearer end of the highway she is on).
    let start = W.districtAt(p.x, p.z, 8);
    if (!start) { let bd = Infinity; for (const d of W.districts) { if (dist[d.index] === Infinity) continue; const c = Math.hypot(p.x - d.x, p.z - d.z) - d.R; if (c < bd) { bd = c; start = d; } } }
    const pts = [{ x: p.x, z: p.z }]; let cur = start?.index;
    if (cur == null || dist[cur] === Infinity) { this.route = [{ x: p.x, z: p.z }, { x: T.x, z: T.z }]; return; }
    pts.push({ x: W.districts[cur].x, z: W.districts[cur].z });
    while (cur !== T.index && via[cur]) { const { u, e } = via[cur]; const forward = e.a === cur; const list = forward ? e.pts : [...e.pts].reverse(); pts.push(...list.filter((_, i) => i % 3 === 0 || i === list.length - 1)); cur = u; pts.push({ x: W.districts[cur].x, z: W.districts[cur].z }); }
    this.route = pts;
  }
  drawMini() {
    const ctx = this.miniCtx, S = this.mini.width, C = S / 2, map = this.world.map, p = this.focusPos();
    const range = this.driving ? 300 : 170, k = (S / 2) / range * map.mpp; // screen px per map px
    const rot = -Math.PI / 2 - Math.atan2(Math.cos(this.yaw), Math.sin(this.yaw)); // camera forward points up
    const toMini = (x, z) => { const dx = (x - p.x) / map.mpp * k, dz = (z - p.z) / map.mpp * k, c = Math.cos(rot), s = Math.sin(rot); return [C + dx * c - dz * s, C + dx * s + dz * c]; };
    ctx.save(); ctx.clearRect(0, 0, S, S); ctx.beginPath(); ctx.arc(C, C, C - 3, 0, TAU); ctx.clip();
    ctx.fillStyle = "#2c6a86"; ctx.fillRect(0, 0, S, S);
    ctx.save(); ctx.translate(C, C); ctx.rotate(rot); ctx.scale(k, k); ctx.translate(-(p.x - map.x0) / map.mpp, -(p.z - map.z0) / map.mpp); ctx.drawImage(map.canvas, 0, 0); ctx.restore();
    ctx.fillStyle = "rgba(10,18,30,.18)"; ctx.fillRect(0, 0, S, S);
    if (this.route) { ctx.strokeStyle = "#c27bff"; ctx.lineWidth = 5; ctx.lineJoin = ctx.lineCap = "round"; ctx.beginPath(); this.route.forEach((q, i) => { const [x, y] = toMini(q.x, q.z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
    const blip = (x, z, color, r = 4, glyph, pin = false) => { let [sx, sy] = toMini(x, z); const dd = Math.hypot(sx - C, sy - C), lim = C - 12; if (dd > lim) { if (!pin) return; sx = C + (sx - C) / dd * lim; sy = C + (sy - C) / dd * lim; } ctx.fillStyle = color; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); ctx.strokeStyle = "#0b1320"; ctx.lineWidth = 1.5; ctx.stroke(); if (glyph) { ctx.fillStyle = "#0b1320"; ctx.font = "700 9px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(glyph, sx, sy + .5); } };
    for (const d of this.world.districts) { blip(d.portal.x, d.portal.z, "#8ff7ee", 6, "✦"); if (Math.hypot(d.x - p.x, d.z - p.z) < range * 1.4) blip(d.x + 16, d.z, "#ffcf7a", 5, "✎"); }
    for (const c of this.world.collectibles) if (c.mesh.visible) blip(c.x, c.z, "#ffd23f", 3.5);
    if (this.myCar && this.driving !== this.myCar) blip(this.myCar.x, this.myCar.z, "#ff7a3d", 5, "▲");
    if (this.target) blip(this.target.x, this.target.z, "#c27bff", 7, "★", true);
    ctx.restore();
    ctx.save(); ctx.translate(C, C); ctx.rotate(rot + (this.driving ? this.driving.heading : this.p.heading) * -1 + Math.PI); // arrow points along heading
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(-6.5, 7); ctx.lineTo(0, 3.5); ctx.lineTo(6.5, 7); ctx.closePath(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#1a2433"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    const north = this.$(".ow-north"), nr = this.mini.clientWidth / 2 - 11, na = rot - Math.PI / 2; // world -z is north
    north.style.transform = `translate(${Math.cos(na) * nr}px, ${Math.sin(na) * nr}px)`;
  }
  toggleMap(force) {
    const v = this.$(".ow-mapview"), show = force ?? v.hidden; if (!this.world && show) return;
    v.hidden = !show; if (!show) return;
    const board = this.$(".ow-map-board canvas"), r = board.getBoundingClientRect(), map = this.world.map, f = this.focusPos();
    const fit = Math.min(r.width / (map.w * map.mpp), r.height / (map.h * map.mpp)) * .92;
    this.mapView ||= { cx: f.x, cz: f.z, scale: Math.max(fit, .08) }; this.mapView.min = Math.min(fit, .5) * .8; this.mapView.cx = f.x; this.mapView.cz = f.z;
    this.renderMapList(); this.drawMap();
  }
  drawMap() {
    const board = this.$(".ow-map-board canvas"), r = board.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2); if (!r.width) return;
    board.width = r.width * dpr; board.height = r.height * dpr; const ctx = board.getContext("2d"), map = this.world.map, v = this.mapView;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "#24607b"; ctx.fillRect(0, 0, r.width, r.height);
    const toScreen = (x, z) => [r.width / 2 + (x - v.cx) * v.scale, r.height / 2 + (z - v.cz) * v.scale];
    const [ox, oy] = toScreen(map.x0, map.z0); ctx.imageSmoothingEnabled = true; ctx.drawImage(map.canvas, ox, oy, map.w * map.mpp * v.scale, map.h * map.mpp * v.scale);
    if (this.route) { ctx.strokeStyle = "#c27bff"; ctx.lineWidth = 5; ctx.lineJoin = ctx.lineCap = "round"; ctx.beginPath(); this.route.forEach((q, i) => { const [x, y] = toScreen(q.x, q.z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
    this.mapHits = [];
    for (const d of this.world.districts) {
      const [x, y] = toScreen(d.x, d.z), sel = this.mapSel === d, tgt = this.target === d, n = this.world.collectibles.filter(c => c.district === d && this.save.collected[c.id]).length;
      ctx.beginPath(); ctx.arc(x, y, sel ? 11 : 8, 0, TAU); ctx.fillStyle = tgt ? "#c27bff" : d.visited ? "#ffc276" : "#9fe8de"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = sel ? "#fff" : "#13202f"; ctx.stroke();
      ctx.font = "700 13px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(10,16,26,.85)"; ctx.strokeText(d.place.city, x, y - 16); ctx.fillStyle = "#fff8e8"; ctx.fillText(d.place.city, x, y - 16);
      if (v.scale > .25) { ctx.font = "600 11px system-ui"; ctx.fillStyle = "#ffe08a"; ctx.strokeText(`🌻 ${n}/3`, x, y + 24); ctx.fillText(`🌻 ${n}/3`, x, y + 24); }
      this.mapHits.push({ d, x, y });
    }
    const p = this.focusPos(), [px, py] = toScreen(p.x, p.z), h = this.driving ? this.driving.heading : this.p.heading;
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI - h); ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(-8, 8); ctx.lineTo(0, 4); ctx.lineTo(8, 8); ctx.closePath(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#ff7a3d"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  }
  mapClick(e) {
    const r = e.target.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = (this.mapHits || []).map(h => ({ ...h, dd: Math.hypot(h.x - x, h.y - y) })).filter(h => h.dd < 22).sort((a, b) => a.dd - b.dd)[0];
    if (hit) this.selectOnMap(hit.d);
  }
  renderMapList() {
    const list = this.$(".ow-map-list"); list.replaceChildren();
    const ds = [...this.world.districts].sort((a, b) => (b.visited - a.visited) || a.place.city.localeCompare(b.place.city));
    for (const d of ds) { const b = document.createElement("button"), n = this.world.collectibles.filter(c => c.district === d && this.save.collected[c.id]).length; b.className = `ow-map-item${d.visited ? " visited" : ""}`; b.innerHTML = `<span></span><small></small>`; b.children[0].textContent = d.place.city; b.children[1].textContent = `${d.place.country} · 🌻${n}/3`; b.addEventListener("click", () => { this.selectOnMap(d); this.mapView.cx = d.x; this.mapView.cz = d.z; this.drawMap(); }); list.append(b); }
    if (this.world.districts.length < 2) { const p = document.createElement("p"); p.className = "ow-map-empty"; p.textContent = "This country has one stop on the journey. Pick another country above, or the whole journey."; list.append(p); }
  }
  selectOnMap(d) {
    this.mapSel = d; const card = this.$(".ow-map-card"), pages = this.config.diaryCount?.(d.id) || 0; card.hidden = false;
    card.innerHTML = `<strong></strong><small></small><div class="ow-map-actions"><button data-m="gps">★ Set GPS route</button><button data-m="travel">⇢ Fast travel</button><button data-m="enter">◎ Journey navigator</button></div>`;
    card.querySelector("strong").textContent = d.place.city; card.querySelector("small").textContent = `${d.place.country} · ${d.visited ? "Visited ✓" : "On the journey"} · ${pages} diary ${pages === 1 ? "page" : "pages"}`;
    card.querySelector('[data-m="gps"]').addEventListener("click", () => { this.setTarget(d); this.computeRoute(); this.drawMap(); this.toggleMap(false); });
    card.querySelector('[data-m="travel"]').addEventListener("click", () => { this.toggleMap(false); this.fastTravel(d); });
    card.querySelector('[data-m="enter"]').addEventListener("click", () => { this.toggleMap(false); this.openGlobe(); });
    this.drawMap();
  }
  fastTravel(d) {
    const fade = this.$(".ow-loading"); fade.hidden = false; fade.classList.add("ow-fade"); this.$(".ow-loading h2").textContent = `Travelling to ${d.place.city}…`;
    setTimeout(() => { this.spawnAt(d.id); if (this.target === d) this.setTarget(null); fade.hidden = true; fade.classList.remove("ow-fade"); }, 700);
  }

  /* ---------------- Journey navigator ---------------- */
  openGlobe() {
    const host = this.$(".ow-globe-host"), coords = window.SunflowerGlobeMath?.coords || (() => [0, 0]);
    try { this.globe ??= new TravelGlobe(host, { coords, low: this.quality === "low", onClose: () => this.closeGlobe(), onPick: id => this.travelTo(id) }); }
    catch (err) { console.warn(err); return this.toast("The navigator needs WebGL."); }
    const f = this.focusPos(), here = this.world.districtAt(f.x, f.z, 40) || this.world.nearestDistrict(f.x, f.z);
    this.keys.clear(); this.globeOpen = true; this.sfx.tone([392, 523, 784], .5, "sine", .07, .07);
    this.globe.open({ places: this.config.places, visited: this.config.visited, currentId: here?.id });
  }
  closeGlobe() { this.globeOpen = false; this.lastT = performance.now(); }
  travelTo(id) {
    this.globeOpen = false; this.lastT = performance.now(); this.sfx.tone([784, 1046, 1568], .6, "triangle", .07, .06);
    const p = this.config.places.find(v => v.id === id); if (!p) return;
    this.opts.onTravel?.(id);
    const d = this.world.districts.find(v => v.id === id);
    if (d) this.fastTravel(d);
    else { this.config.currentId = id; this.open({ ...this.config, scope: p.country, currentId: id }); }
  }

  /* ---------------- HUD ---------------- */
  toast(msg) { const t = this.$(".ow-toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove("show"), 2600); }
  banner(d) {
    const b = this.$(".ow-banner"); b.querySelector(".ow-banner-kicker").textContent = d.visited ? "A PLACE MINDY HAS BEEN" : "NEXT ON HER JOURNEY";
    b.querySelector(".ow-banner-city").textContent = d.place.city; b.querySelector(".ow-banner-sub").textContent = `${d.place.country} · ${d.place.region}`;
    b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
  }
  updateHud() {
    this.$(".ow-clock").textContent = `${this.night > .5 ? "☾" : "☀"} ${this.clockText()}`;
    const f = this.focusPos(), d = this.world.districtAt(f.x, f.z, 6);
    if (d !== this.lastDistrict) { if (d) this.banner(d); this.lastDistrict = d; }
    this.$(".ow-where").textContent = d ? `${d.place.city}, ${d.place.country}` : (() => { const n = this.world.nearestDistrict(f.x, f.z); return n ? `Countryside near ${n.place.city}` : ""; })();
    const it = this.nearest(), prompt = this.$(".ow-prompt"), eb = this.$(".ow-tb-e");
    let text = ""; if (it) text = it.type === "portal" ? `<kbd>E</kbd> Open the journey navigator — travel anywhere` : `<kbd>E</kbd> Open the ${it.district.place.city} diary (${this.config.diaryCount?.(it.district.id) || 0} pages)`;
    if (!this.driving && !it) { const car = this.cars.find(c => Math.hypot(c.x - this.p.x, c.z - this.p.z) < 4.2); if (car) text = `<kbd>F</kbd> ${car.mine ? "Get in your car" : car.traffic ? "Borrow this car" : "Get in"}`; }
    if (this.driving && Math.abs(this.driving.vf) < 2) text = `<kbd>F</kbd> Get out`;
    if (text !== this.lastPrompt) { this.lastPrompt = text; prompt.innerHTML = text; prompt.hidden = !text; }
    eb.hidden = !it;
    if (this.driving) this.$(".ow-speed b").textContent = Math.round(Math.abs(this.driving.vf) * 3.6);
  }
  resize() {
    if (!this.renderer || !this.camera) return; const r = this.canvas.getBoundingClientRect(); if (!r.width) return;
    const key = `${r.width}x${r.height}x${this.renderer.getPixelRatio()}`; if (key === this.sizeKey) return; this.sizeKey = key;
    this.renderer.setSize(r.width, r.height, false); this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix();
  }

  /* ---------------- main loop ---------------- */
  frame(now) {
    if (!this.running) return; this.raf = requestAnimationFrame(this.frame);
    if (!this.world || !this.$(".ow-loading").hidden && !this.$(".ow-loading").classList.contains("ow-fade")) return;
    const dt = Math.min(.05, (now - this.lastT) / 1000 || 0); this.lastT = now; this.time += dt;
    if (this.globeOpen) { this.sfx.engineAt(false, 0, 0); return; }
    const paused = this.blocked() || !this.$(".ow-mapview").hidden || !this.$(".ow-help").hidden;
    if (paused) { this.keys.clear(); this.sfx.engineAt(!!this.driving, 0, 0); }
    else if (this.driving) this.updateDrive(dt); else this.updateWalk(dt);
    if (now - this.lastSlow > 400) { this.lastSlow = now; this.updateDistrictsSlow(); }
    this.updateTraffic(paused ? 0 : dt); this.updatePeds(paused ? 0 : dt); this.updateCollectibles(dt);
    for (const d of this.world.districts) if (d.group.visible) { d.portal.disc.rotation.z -= dt * 1.2; d.portal.orb.rotation.y += dt * .8; d.portal.orb.rotation.x = .4; d.book.position.y = 1.9 + Math.sin(this.time * 2 + d.x) * .08; }
    this.beam.material.uniforms.uTime.value = this.time;
    if (this.target) { if (now - (this.routeAt || 0) > 1200) { this.routeAt = now; this.computeRoute(); } const f = this.focusPos(); if (Math.hypot(f.x - this.target.x, f.z - this.target.z) < 30) { this.toast(`You've arrived in ${this.target.place.city}`); this.setTarget(null); } }
    this.updateSky(dt); this.updateCamera(dt);
    if (now - this.lastMini > 50) { this.lastMini = now; this.drawMini(); this.updateHud(); }
    this.resize(); this.renderer.render(this.scene, this.camera);
  }
}
if (typeof window !== "undefined") window.MindyOpenWorld = MindyOpenWorld;
