const C = window.CONFIG;
const fill = s => s.replace("{name}", C.name).replace("{from}", C.from);
const PHOTOS = (C.photos || []).concat(C.portrait && C.portrait.src ? [C.portrait] : []);
const AR = {}, clampAr = a => Math.max(.55, Math.min(1.6, a || .8)); // photo shapes, so each frame matches its photo
PHOTOS.forEach(p => { const i = new Image(); i.onload = () => { AR[p.src] = i.naturalWidth / i.naturalHeight; }; i.src = p.src; }); // preload so the photos pop out instantly
const sizeCard = (el, ar) => { // equal visual area: wide photos get wider frames, tall photos stay narrower
  const maxW = Math.min(innerWidth * .8, 330) - 18, maxH = Math.min(innerHeight * .36, 330), area = Math.min(innerWidth * .6, 240) * Math.min(innerHeight * .34, 300);
  const pw = Math.min(maxW, maxH * ar, Math.sqrt(area * ar)); el.style.width = (pw + 18) + "px"; el.querySelector(".ph").style.aspectRatio = String(ar);
};
const $ = id => document.getElementById(id);
const show = id => document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === id));
const cl = t => Math.max(0, Math.min(1, t));
const back = t => { const c = 1.7; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; };
const bounce = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
const inOut = t => t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
const BLOW_MIN = 0.1; // mic sensitivity: lower = easier to blow out (try 0.06 to 0.2)
const unlockAt = C.unlockAt === "demo" ? Date.now() + 20000 : C.unlockAt ? new Date(C.unlockAt).getTime() : 0;
const preview = /[?&#]preview\b/.test(location.search + location.hash); // add ?preview to the URL to skip the lock
const isLocked = () => !preview && unlockAt > Date.now();

/* ---------- Audio (optional, fails silently) ---------- */
let AC;
const ac = () => (AC = AC || new (window.AudioContext || window.webkitAudioContext)());
function tune() {
  try {
    const A = ac(); let t = A.currentTime + .05;
    [[392,.4],[392,.2],[440,.6],[392,.6],[523,.6],[494,1.1],[392,.4],[392,.2],[440,.6],[392,.6],[587,.6],[523,1.1]].forEach(([f, d]) => {
      const o = A.createOscillator(), g = A.createGain();
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + d * .95);
      o.connect(g); g.connect(A.destination); o.start(t); o.stop(t + d); t += d;
    });
  } catch (e) {}
}
function clink() {
  try {
    const A = ac(), t = A.currentTime;
    [1800, 2400].forEach((f, i) => { const o = A.createOscillator(), g = A.createGain(), s = t + i * .07; o.type = "square"; o.frequency.value = f; g.gain.setValueAtTime(.08, s); g.gain.exponentialRampToValueAtTime(.0001, s + .09); o.connect(g); g.connect(A.destination); o.start(s); o.stop(s + .1); });
  } catch (e) {}
}
function popSound() {
  try {
    const A = ac(), n = A.sampleRate * .09 | 0, b = A.createBuffer(1, n, A.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = A.createBufferSource(), g = A.createGain(); g.gain.value = .5;
    s.buffer = b; s.connect(g); g.connect(A.destination); s.start();
  } catch (e) {}
}

/* ---------- 2D confetti overlay ---------- */
const cv = $("cf"), cx = cv.getContext("2d"); let P = [], running = false;
function fit2d() { const d = window.devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); }
function burst(x, y, n = 80) {
  const col = ["#ff5c93", "#ffb703", "#4cc9f0", "#7ae582", "#b388ff", "#ffffff"];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = 3 + Math.random() * 7;
    P.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, w: 4 + Math.random() * 5, h: 6 + Math.random() * 6, c: col[i % 6], l: 90 + Math.random() * 60, r: Math.random() * 6 });
  }
  if (!running) { running = true; loop(); }
}
function loop() {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  P = P.filter(p => p.l > 0);
  P.forEach(p => {
    p.vy += .2; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += .15; p.l--;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.globalAlpha = Math.min(1, p.l / 30); cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
  });
  if (P.length) requestAnimationFrame(loop); else running = false;
}
const rain = () => { for (let i = 0; i < 6; i++) setTimeout(() => burst(Math.random() * innerWidth, 20 + Math.random() * innerHeight * .25, 60), i * 220); };

/* ---------- 3D helpers ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $("gl"), antialias: true, alpha: true });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const clock = new THREE.Clock(); let tNow = 0, cur;
const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .5, metalness: 0 }, o));
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
function glowTex(c) {
  const k = document.createElement("canvas"); k.width = k.height = 64;
  const g = k.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, c + "ff"); r.addColorStop(.3, c + "88"); r.addColorStop(1, c + "00");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(k);
}
const TEX = { gold: glowTex("#ffc933"), pink: glowTex("#ff7aa6"), cyan: glowTex("#4cc9f0"), warm: glowTex("#ffb74d"), grey: glowTex("#b8b0c4"), white: glowTex("#ffffff") };
const sprite = (tex, s, o = .9) => { const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: o, depthWrite: false })); p.scale.set(s, s, 1); return p; };
function makeScene(hw, pos, look) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb79be0, .95));
  const sun = new THREE.DirectionalLight(0xffffff, .9); sun.position.set(4, 8, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 8, bottom: -4 }); scene.add(sun);
  const L = new THREE.Vector3(...look);
  return { scene, camera, hw, look: L, off: new THREE.Vector3(...pos).sub(L), k: 1, t0: 0, update() {} };
}
function ground(S, y) { const g = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .22 })); g.rotation.x = -Math.PI / 2; g.position.y = y; g.receiveShadow = true; S.scene.add(g); }
function sparkles(S, n, rad, h0, h1) {
  const tx = [TEX.gold, TEX.pink, TEX.cyan], arr = [];
  for (let i = 0; i < n; i++) {
    const sp = sprite(tx[i % 3], .25 + Math.random() * .25);
    sp.position.set((Math.random() * 2 - 1) * rad, h0 + Math.random() * (h1 - h0), (Math.random() - .5) * rad);
    sp.userData = { ph: Math.random() * 6.28, v: .15 + Math.random() * .3, s: sp.scale.x }; S.scene.add(sp); arr.push(sp);
  }
  return (t, dt) => arr.forEach(sp => { const u = sp.userData; sp.position.y += u.v * dt; if (sp.position.y > h1) sp.position.y = h0; const k = u.s * (.6 + .4 * Math.sin(t * 3 + u.ph)); sp.scale.set(k, k, 1); });
}

/* ---------- Scene 1: gift ---------- */
const gift = makeScene(2.7, [0, 3.2, 11], [0, 1.3, 0]); ground(gift, 0);
const gG = new THREE.Group(); gift.scene.add(gG);
const gold = mat(0xffc233, { roughness: .3, metalness: .35 });
const pinkM = mat(0xff5c93); // hollow box: 4 walls + floor, so it is empty when the lid comes off
[[2.4, 1.8, .12, 0, .9, 1.14], [2.4, 1.8, .12, 0, .9, -1.14], [.12, 1.8, 2.16, 1.14, .9, 0], [.12, 1.8, 2.16, -1.14, .9, 0]].forEach(([w, h, d, x, y, z]) => gG.add(mesh(new THREE.BoxGeometry(w, h, d), pinkM, x, y, z)));
gG.add(mesh(new THREE.BoxGeometry(2.16, .12, 2.16), mat(0x7a2250), 0, .06, 0));
[[.5, 1.82, .14, 0, .91, 1.14], [.5, 1.82, .14, 0, .91, -1.14], [.14, 1.82, .5, 1.14, .91, 0], [.14, 1.82, .5, -1.14, .91, 0]].forEach(([w, h, d, x, y, z]) => gG.add(mesh(new THREE.BoxGeometry(w, h, d), gold, x, y, z)));
const lid = new THREE.Group(); lid.position.y = 1.8; gG.add(lid);
lid.add(mesh(new THREE.BoxGeometry(2.7, .55, 2.7), mat(0xff7aa6), 0, .275, 0));
lid.add(mesh(new THREE.BoxGeometry(.5, .57, 2.74), gold, 0, .275, 0));
lid.add(mesh(new THREE.BoxGeometry(2.74, .57, .5), gold, 0, .275, 0));
[-1, 1].forEach(s => {
  const l = mesh(new THREE.TorusGeometry(.42, .13, 14, 36), gold, s * .5, .95, 0); l.rotation.z = -s * .5; l.scale.set(1, 1.25, .7); lid.add(l);
  const t = mesh(new THREE.BoxGeometry(.26, .8, .06), gold, s * .3, .5, .45); t.rotation.set(.3, 0, s * .3); lid.add(t);
});
lid.add(mesh(new THREE.SphereGeometry(.24, 20, 16), gold, 0, .72, 0));
const gGlow = sprite(TEX.warm, 1, 0); gGlow.position.set(0, 2.1, 0); gG.add(gGlow);
const gLight = new THREE.PointLight(0xffd27a, 0, 12); gLight.position.set(0, 2.4, 1.5); gift.scene.add(gLight);
const lockG = new THREE.Group(); lockG.position.set(0, 1, 1.4); lockG.scale.setScalar(1.6); gG.add(lockG);
lockG.add(mesh(new THREE.BoxGeometry(.6, .5, .2), mat(0xd4a017, { roughness: .25, metalness: .7 })));
const shackle = mesh(new THREE.TorusGeometry(.17, .045, 10, 24, Math.PI), mat(0xbfc5cc, { roughness: .2, metalness: .85 }), 0, .25, 0); lockG.add(shackle);
const kh = mesh(new THREE.CylinderGeometry(.05, .05, .04, 10), mat(0x3a2a00), 0, 0, .11); kh.rotation.x = Math.PI / 2; lockG.add(kh);
const LK = { locked: false, fall: 1e9 };
const gSp = sparkles(gift, 16, 2.8, 0, 4.5), GS = { open: false, t0: 0, nope: -9 };
gift.enter = () => { lockG.visible = LK.locked; lockG.position.set(0, 1, 1.4); lockG.rotation.set(0, 0, 0); shackle.position.y = .25; gift.off.y = 1.9; gift.look.y = 1.3; GS.open = false; lid.position.set(0, 1.8, 0); lid.rotation.set(0, 0, 0); gG.rotation.set(0, 0, 0); gGlow.material.opacity = 0; gLight.intensity = 0; };
gift.update = (t, dt) => {
  const lt = t - gift.t0; gSp(t, dt);
  if (!GS.open) {
    gG.rotation.y = Math.sin(lt * .8) * .5 + .3; gG.position.y = Math.sin(lt * 2) * .08; lid.position.y = 1.8 + Math.max(0, Math.sin(lt * 2.2)) * .06;
    const n = t - GS.nope; gG.rotation.z = n < .5 ? Math.sin(n * 50) * .1 * (1 - n / .5) : Math.sin(lt * 3) * .015;
    const rn = t - GS.nope, f = t - LK.fall;
    if (f < 0) { const d = Math.max(0, 1 - rn / .7); lockG.rotation.set(Math.sin(rn * 26) * .15 * d, 0, Math.sin(rn * 40) * .4 * d); shackle.position.y = .25 + Math.abs(Math.sin(rn * 40)) * .05 * d; }
    else { const q = Math.max(0, f - .35); shackle.position.y = .25 + cl(f / .25) * .12; lockG.position.y = 1 - q * q * 6; lockG.rotation.z = q * 2; lockG.visible = f < 1.2; }
    return;
  }
  const a = t - GS.t0, u = cl((a - .35) / 1);
  gG.rotation.z = a < .4 ? Math.sin(a * 60) * .09 * (1 - a / .4) : 0;
  const ez = 1 - Math.pow(1 - cl((a - .3) / .9), 3); gift.off.y = 1.9 + 3.6 * ez; gift.look.y = 1.3 + (PHOTOS.length ? 1.6 * ez : 0);
  lid.position.set(u * 1.2, 1.8 + (1 - Math.pow(1 - u, 3)) * 7, 0); lid.rotation.set(u * .9, 0, -u * 1.3);
  gGlow.material.opacity = u > 0 ? Math.sin(Math.min(1, u * 1.5) * Math.PI) * .95 : 0; gGlow.scale.setScalar(1 + u * 7); gLight.intensity = u > 0 ? (1 - u) * 3 : 0;
};
function openGift() {
  if (GS.open) return;
  if (isLocked()) { GS.nope = tNow; clink(); if (navigator.vibrate) navigator.vibrate(30); showWish("🔒 Still locked! It opens when the countdown ends.", innerWidth / 2, innerHeight * .4, "#ffb703"); return; }
  GS.open = true; GS.t0 = tNow;
  setTimeout(() => burst(innerWidth / 2, innerHeight / 2, 90), 450);
  if (PHOTOS.length) setTimeout(startMemories, 1000); else setTimeout(() => { show("s2"); go(cakeS); }, 1500);
}

/* ---------- Photo memories: pop out of the opened gift ---------- */
let MEM = { i: 0, cards: [], busy: false };
function startMemories() {
  const stack = $("stack"); stack.innerHTML = ""; MEM = { i: 0, cards: [], busy: true };
  $("smTitle").textContent = fill(C.memoriesTitle || "A few memories, {name} 💛");
  show("sm");
  const list = (C.photos || []).map(p => ({ src: p.src, caption: p.caption, hero: false }));
  if (C.portrait && C.portrait.src) list.push({ src: C.portrait.src, caption: C.portrait.caption || "Happy Birthday, {name}! 🎂", hero: true });
  const R = stack.getBoundingClientRect(), ox = R.left + R.width / 2, oy = R.top + R.height / 2;
  const v = new THREE.Vector3(0, 2, 0).project(gift.camera), sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight; // top of the opened box
  const dx0 = sx - ox, dy0 = sy - oy, n = list.length;
  burst(sx, sy, 70);
  list.forEach((p, i) => {
    const el = document.createElement("div"); el.className = "polaroid" + (p.hero ? " hero" : "");
    el.innerHTML = '<div class="ph"><img alt=""></div><div class="cap"></div>';
    const img = el.querySelector("img"); img.alt = fill(p.caption || ""); sizeCard(el, clampAr(AR[p.src]));
    img.onload = () => sizeCard(el, clampAr(img.naturalWidth / img.naturalHeight)); img.src = p.src;
    el.querySelector(".cap").textContent = fill(p.caption || "");
    el.querySelector(".ph").style.setProperty("--img", `url("${p.src}")`);
    el.style.zIndex = n - i; el.onclick = memNext; stack.appendChild(el); MEM.cards.push(el);
    const rot = i === 0 ? -2 : ((i * 37) % 15) - 7, tx = i === 0 ? 0 : ((i * 53) % 25) - 12, ty = i === 0 ? 0 : ((i * 29) % 17) - 8, delay = (n - 1 - i) * 130;
    const A = `translate(-50%,-50%) translate(${dx0}px,${dy0}px) rotate(${rot * 6}deg) scale(.15)`;
    const B = `translate(-50%,-50%) translate(${dx0 * .35 + tx}px,${dy0 * .35 - 150}px) rotate(${rot * 3}deg) scale(1.12)`;
    const E = `translate(-50%,-50%) translate(${tx}px,${ty}px) rotate(${rot}deg) scale(1)`;
    el.style.transform = A; el.style.opacity = 0;
    const a = el.animate([{ transform: A, opacity: 0 }, { transform: B, opacity: 1, offset: .5 }, { transform: E, opacity: 1 }], { duration: 900, delay, easing: "cubic-bezier(.25,.9,.3,1.08)", fill: "both" });
    a.onfinish = () => { el.style.transform = E; el.style.opacity = 1; a.cancel(); void el.offsetWidth; el.classList.add("settled"); };
    setTimeout(() => { burst(sx, sy, 14); popSound(); }, delay);
  });
  updateMem(); setTimeout(() => { MEM.busy = false; }, (n - 1) * 130 + 950);
}
function updateMem() {
  const n = MEM.cards.length, left = n - MEM.i;
  $("smCount").textContent = Math.min(MEM.i + 1, n) + " / " + n;
  $("smNext").textContent = left <= 1 ? "Now make a wish 🎂" : "Next ➜";
  $("smSkip").hidden = left <= 1;
}
function memNext() {
  if (MEM.busy) return;
  if (MEM.cards.length - MEM.i <= 1) { memDone(); return; }
  MEM.busy = true; const el = MEM.cards[MEM.i], dir = MEM.i % 2 ? -1 : 1; MEM.i++;
  el.style.pointerEvents = "none";
  el.animate([{ transform: el.style.transform, opacity: 1 }, { transform: `translate(-50%,-50%) translate(${dir * innerWidth * .9}px,-40px) rotate(${dir * 28}deg)`, opacity: 0 }], { duration: 480, easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" }).onfinish = () => { el.remove(); MEM.busy = false; };
  MEM.cards[MEM.i].style.transform = "translate(-50%,-50%) rotate(0deg) scale(1.02)";
  updateMem();
}
function memDone() { MEM.busy = true; show("s2"); go(cakeS); }
$("smNext").onclick = memNext; $("smSkip").onclick = memDone;

/* ---------- Scene 2: living cake ---------- */
const cakeS = makeScene(2.9, [0, 3.8, 12], [0, 1.3, 0]); ground(cakeS, -1.26);
const cake = new THREE.Group(); cakeS.scene.add(cake);
const items = [], puffs = [];
function addItem(g, base, start, squash = true) { g.position.y = base; cake.add(g); items.push({ g, base, start, squash }); }
const stand = new THREE.Group();
stand.add(mesh(new THREE.CylinderGeometry(2.7, 2.9, .22, 64), mat(0xf4effa, { roughness: .3 }), 0, -.11, 0));
stand.add(mesh(new THREE.CylinderGeometry(.45, .7, .9, 32), mat(0xe3daf2), 0, -.67, 0));
stand.add(mesh(new THREE.CylinderGeometry(1.5, 1.6, .14, 48), mat(0xf4effa), 0, -1.19, 0));
addItem(stand, 0, .1, false);
function tier(r, h, color, frost) {
  const g = new THREE.Group(), fm = mat(frost, { roughness: .35 }), pm = mat(0xffffff, { roughness: .2 });
  g.add(mesh(new THREE.CylinderGeometry(r, r, h, 56), mat(color, { roughness: .6 }), 0, h / 2, 0));
  const rim = mesh(new THREE.TorusGeometry(r, .1, 14, 64), fm, 0, h, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
  g.add(mesh(new THREE.CylinderGeometry(r, r, .05, 56), fm, 0, h, 0));
  const n = Math.round(r * 10);
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283, len = .08 + Math.random() * .22, x = Math.cos(a) * r, z = Math.sin(a) * r;
    g.add(mesh(new THREE.CylinderGeometry(.08, .08, len, 10), fm, x, h - len / 2, z));
    g.add(mesh(new THREE.SphereGeometry(.095, 12, 10), fm, x, h - len, z));
    g.add(mesh(new THREE.SphereGeometry(.07, 10, 8), pm, Math.cos(a + .15) * (r + .03), .08, Math.sin(a + .15) * (r + .03)));
  }
  return g;
}
const t1 = tier(2, 1, 0x8a4fd0, 0xffd1e3), t2 = tier(1.5, 1, 0xff5c93, 0xfff4c4), t3 = tier(1.05, .8, 0x4cc9f0, 0xffffff);
addItem(t1, 0, .5); addItem(t2, 1, 1.1); addItem(t3, 2, 1.7);
const dark = mat(0x2a1238, { roughness: .3 });
const face = new THREE.Group(); face.position.set(0, 0, 1.46); t2.add(face);
const eyes = [-1, 1].map(s => {
  const e = mesh(new THREE.SphereGeometry(.11, 18, 14), dark, s * .4, .52, 0); e.scale.set(1, 1.25, .5);
  e.add(mesh(new THREE.SphereGeometry(.035, 8, 8), mat(0xffffff, { emissive: 0xffffff }), .03, .04, .18)); face.add(e); return e;
});
const mouth = mesh(new THREE.TorusGeometry(.14, .03, 8, 24, Math.PI), dark, 0, .36, 0); mouth.rotation.z = Math.PI; face.add(mouth);
[-1, 1].forEach(s => { const b = mesh(new THREE.SphereGeometry(.11, 12, 10), mat(0xff9ec0), s * .68, .4, -.1); b.scale.set(1.4, .8, .3); face.add(b); });
const cs = [-.5, 0, .5].map((x, i) => {
  const g = new THREE.Group(); g.position.set(x, 2.85, 0); cake.add(g);
  g.add(mesh(new THREE.CylinderGeometry(.075, .075, .9, 16), mat([0xffb703, 0x7ae582, 0xb388ff][i], { roughness: .4 }), 0, .45, 0));
  for (let k = 0; k < 3; k++) { const s = mesh(new THREE.TorusGeometry(.077, .014, 6, 16), mat(0xffffff), 0, .2 + k * .25, 0); s.rotation.x = Math.PI / 2; g.add(s); }
  g.add(mesh(new THREE.CylinderGeometry(.012, .012, .12, 6), dark, 0, .96, 0));
  const flame = new THREE.Group(); flame.position.y = 1.02; g.add(flame);
  const fo = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 14), new THREE.MeshBasicMaterial({ color: 0xffa726 })); fo.scale.set(1, 1.8, 1); fo.position.y = .2;
  const fi = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff3c4 })); fi.scale.set(1, 1.7, 1); fi.position.y = .12;
  const gl = sprite(TEX.warm, 1.1, .7); gl.position.y = .2;
  const light = new THREE.PointLight(0xffb060, .8, 5, 2); light.position.y = .25;
  flame.add(fo, fi, gl, light);
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, 1.9, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.position.y = .8; g.add(hit);
  const c = { g, flame, gl, light, hit, ph: Math.random() * 6, out: false, outT: 0, y0: 2.85 }; hit.userData.c = c; return c;
});
const cSp = sparkles(cakeS, 18, 3.3, -.5, 5);
const CK = { ready: false, lit: 3, mood: 0, happy: false, giggle: -9, dance: -9, taps: [], H: { t0: -9, h: .3, d: .7 }, SP: -9, nextHop: 99, nextBlink: 2, blink: -9, shift: 0 };
const aim = new THREE.Vector2(), mouse = new THREE.Vector2();
addEventListener("pointermove", e => mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1));
const hop = (h, d) => { CK.H.t0 = tNow; CK.H.h = h; CK.H.d = d; };
cakeS.enter = () => {
  Object.assign(CK, { ready: false, lit: 3, happy: false, mood: 0, giggle: -9, dance: -9, taps: [], SP: -9, shift: 0, nextHop: cakeS.t0 + 7 }); CK.H.t0 = -9;
  stopMic(); $("mic").hidden = true; $("blow").classList.remove("ghost"); cs.forEach(c => c.out = false); cakeS.look.y = 1.3; $("hint").textContent = "Baking your cake…"; $("blow").disabled = true;
};
cakeS.update = (t, dt) => {
  const lt = t - cakeS.t0;
  items.forEach(it => {
    const a = lt - it.start; it.g.visible = a >= 0; if (a < 0) return;
    it.g.position.y = it.base + (1 - bounce(cl(a / .75))) * 9;
    const q = a - .27, s = it.squash && q > 0 ? Math.exp(-q * 6) * Math.sin(q * 20) * .14 : 0; it.g.scale.set(1 - s * .6, 1 + s, 1 - s * .6);
  });
  cs.forEach((c, i) => {
    const a = lt - (2.4 + i * .25); c.g.visible = a >= 0; c.g.position.y = c.y0 + (1 - bounce(cl(a / .5))) * 3;
    const f = lt - (3.3 + i * .2); let k = f <= 0 ? 0 : back(cl(f / .4));
    if (c.out) k *= Math.max(0, 1 - (t - c.outT) / .25);
    c.flame.visible = k > .01;
    const fl = 1 + (.07 * Math.sin(t * 17 + c.ph) + .05 * Math.sin(t * 29 + c.ph * 2)) * (1 + MIC.level * 3);
    c.flame.scale.set(k * (2 - fl), k * fl, k); c.flame.rotation.z = Math.sin(t * 8 + c.ph) * .12 * k + MIC.level * .7 * k;
    c.light.intensity = k * (.75 + .15 * Math.sin(t * 21 + c.ph)); c.gl.material.opacity = .7 * k;
    c.g.rotation.z = Math.sin(t * 1.3 + c.ph) * .015;
  });
  if (!CK.ready && lt > 3.9) { CK.ready = true; $("hint").textContent = micOK ? "Blow into your mic, or tap the candles" : "Tap each candle to blow it out"; $("blow").disabled = false; $("blow").classList.toggle("ghost", micOK); $("mic").hidden = !micOK; }
  if (lt > 4.5 && t > CK.nextHop && !CK.happy) { hop(.3, .7); CK.nextHop = t + 4 + Math.random() * 3; }
  const hu = (t - CK.H.t0) / CK.H.d; let hy = 0, sq = 0;
  if (hu >= 0 && hu < 1) { hy = Math.sin(hu * Math.PI) * CK.H.h; sq = hu < .15 ? -hu / .15 * .08 : hu > .85 ? -(1 - hu) / .15 * .08 : .05; }
  const sy = 1 + Math.sin(t * 2.2) * .012 + sq;
  const dn = (t - CK.dance) / 4, dz = dn >= 0 && dn < 1 ? 1 - dn : 0;
  cake.rotation.y = Math.sin(t * .7) * .1 + inOut(cl((t - CK.SP) / 1.4)) * Math.PI * 2 + Math.sin(t * 9) * .4 * dz; cake.position.y = hy + Math.abs(Math.sin(t * 7)) * .35 * dz; cake.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
  aim.lerp(mouse, Math.min(1, dt * 4));
  CK.mood += ((CK.happy || t - CK.giggle < 1 ? 1 : 0) - CK.mood) * Math.min(1, dt * 8);
  if (t > CK.nextBlink) { CK.blink = t; CK.nextBlink = t + 2.5 + Math.random() * 3; }
  const bu = (t - CK.blink) / .16, bl = bu >= 0 && bu < 1 ? Math.sin(bu * Math.PI) : 0;
  const ey = Math.max(.06, 1.25 * (1 - .7 * CK.mood) * (1 - bl));
  eyes.forEach((e, i) => { e.scale.y = ey; e.position.x = (i ? 1 : -1) * .4 + aim.x * .06; e.position.y = .52 + aim.y * .04; });
  mouth.scale.setScalar(1 + .5 * CK.mood);
  cakeS.look.y += (1.3 + CK.shift - cakeS.look.y) * Math.min(1, dt * 3);
  for (let i = puffs.length - 1; i >= 0; i--) {
    const s = puffs[i], u = s.userData; u.age += dt; s.visible = u.age >= 0; if (u.age < 0) continue;
    s.position.y += dt * .7; s.position.x += u.vx * dt; const k = .3 + u.age * .9; s.scale.set(k, k, 1); s.material.opacity = .5 * Math.max(0, 1 - u.age / 1.4);
    if (u.age > 1.4) { cakeS.scene.remove(s); s.material.dispose(); puffs.splice(i, 1); }
  }
  micTick(t, dt); cSp(t, dt);
};
function smoke(c) {
  const p = new THREE.Vector3(); c.flame.getWorldPosition(p);
  for (let i = 0; i < 5; i++) { const s = sprite(TEX.grey, .3, .5); s.position.copy(p); s.userData = { age: -i * .08, vx: (Math.random() - .5) * .25 }; cakeS.scene.add(s); puffs.push(s); }
}
function blow(c) {
  if (!CK.ready || c.out) return; c.out = true; c.outT = tNow; smoke(c);
  if (--CK.lit === 0) {
    CK.happy = true; $("hint").textContent = "Your wish is on its way ✨"; $("blow").disabled = true; $("mic").hidden = true; stopMic();
    hop(1.1, 1.3); CK.SP = tNow; rain(); tune(); setTimeout(() => { CK.shift = 1.9; startMsg(); }, 2600);
  }
}
$("blow").onclick = () => cs.forEach((c, i) => setTimeout(() => blow(c), i * 180));

/* ---------- Blow with the microphone ---------- */
const MIC = { on: false, stream: null, src: null, an: null, buf: null, t0: 0, base: 0, acc: 0, level: 0, cal: false };
const micOK = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.isSecureContext); // needs https or localhost
async function startMic() {
  $("mic").hidden = true;
  try {
    const A = ac(); A.resume();
    MIC.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    MIC.src = A.createMediaStreamSource(MIC.stream); MIC.an = A.createAnalyser(); MIC.an.fftSize = 1024; MIC.buf = new Float32Array(1024); MIC.src.connect(MIC.an);
    Object.assign(MIC, { on: true, t0: tNow, base: 0, acc: 0, cal: false }); $("hint").textContent = "Stay quiet for a second…";
  } catch (e) { stopMic(); $("blow").classList.remove("ghost"); $("hint").textContent = "Mic isn’t available. Tap the candles instead"; }
}
function stopMic() { MIC.on = false; if (MIC.stream) MIC.stream.getTracks().forEach(t => t.stop()); if (MIC.src) MIC.src.disconnect(); MIC.stream = MIC.src = null; }
function micTick(t, dt) {
  if (!MIC.on) { MIC.level *= .9; return; }
  MIC.an.getFloatTimeDomainData(MIC.buf);
  let s = 0; for (let i = 0; i < 1024; i++) s += MIC.buf[i] * MIC.buf[i];
  const rms = Math.sqrt(s / 1024);
  if (t - MIC.t0 < .7) { MIC.base = Math.min(.1, Math.max(MIC.base, rms)); return; }
  if (!MIC.cal) { MIC.cal = true; $("hint").textContent = "Now blow! 🌬️"; }
  const thr = Math.max(BLOW_MIN, MIC.base * 3), on = rms > thr;
  MIC.level += ((on ? Math.min(1, rms / (thr * 2)) : 0) - MIC.level) * Math.min(1, dt * 12);
  MIC.acc = Math.max(0, MIC.acc + (on ? dt : -dt * 2));
  if (MIC.acc > .3) { const c = cs.find(c => !c.out); if (c) blow(c); MIC.acc = 0; }
}
$("mic").onclick = startMic;

/* ---------- Message ---------- */
let li = 0; const LINES = C.lines.map(fill);
function startMsg() { li = 0; $("dots").innerHTML = LINES.map(() => "<i></i>").join(""); show("s3"); renderLine(); }
function renderLine() {
  const p = $("line"); p.style.animation = "none"; void p.offsetWidth; p.style.animation = "";
  p.textContent = LINES[li];
  document.querySelectorAll("#dots i").forEach((d, i) => d.classList.toggle("on", i <= li));
  $("next").textContent = li === LINES.length - 1 ? "One more thing" : "Next";
}
$("next").onclick = () => { if (li < LINES.length - 1) { li++; renderLine(); } else startFinal(); };

/* ---------- Scene 3: balloons ---------- */
const balS = makeScene(3.4, [0, 0, 13], [0, 0, 0]);
{ const l = new THREE.DirectionalLight(0xffd6e8, .6); l.position.set(-5, 3, 6); balS.scene.add(l); }
const POS = [[-2.3, 2.3], [0, 1.7], [2.3, 2.3], [-2.3, -1.9], [0, -2.5], [2.3, -1.9]];
const shardGeo = new THREE.BufferGeometry(); shardGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, .2, 0, -.12, -.1, 0, .12, -.1, 0], 3)); shardGeo.computeVertexNormals();
let bls = [], fx = [], popped = 0; const bSp = sparkles(balS, 12, 3.4, -4, 4);
function balloon(color) {
  const g = new THREE.Group(), geo = new THREE.SphereGeometry(1, 40, 30), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y < 0) { const f = 1 + .2 * y; x *= f; z *= f; y *= 1.08; } p.setXYZ(i, x, y, z); }
  geo.computeVertexNormals();
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: .2, clearcoat: 1, clearcoatRoughness: .08 });
  const body = new THREE.Mesh(geo, m); body.scale.set(1, 1.2, 1);
  const tail = new THREE.Group(), knot = new THREE.Mesh(new THREE.ConeGeometry(.14, .22, 12), m); knot.position.y = -1.4;
  const pts = []; for (let i = 0; i < 9; i++) pts.push(new THREE.Vector3(Math.sin(i * 1.1) * .1, -1.5 - i * .2, 0));
  tail.add(knot, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .014, 5), new THREE.MeshBasicMaterial({ color: 0xb9a8d6 })));
  g.add(body, tail); return { g, body, tail, color };
}
balS.enter = () => {
  fx.splice(0).forEach(f => f(99)); clearWish(); bls.forEach(b => balS.scene.remove(b.g)); bls = []; popped = 0;
  C.wishes.forEach((w, i) => {
    const b = balloon(C.balloonColors[i % C.balloonColors.length]); b.i = i; b.wish = w; b.base = POS[i % 6]; b.ph = i * 1.3; b.popped = false; b.body.userData.b = b;
    b.g.position.set(b.base[0], -12, 0); balS.scene.add(b.g); bls.push(b);
  });
};
balS.update = (t, dt) => {
  const lt = t - balS.t0;
  bls.forEach(b => {
    if (b.popped) return; const e = back(cl((lt - .2 - b.i * .12) / 1.1));
    b.g.position.set(b.base[0] + Math.sin(t * .9 + b.ph) * .08, b.base[1] - (1 - e) * 11 + Math.sin(t * 1.4 + b.ph) * .18, 0);
    b.g.rotation.set(0, Math.sin(t * .8 + b.ph) * .35, Math.sin(t * 1.1 + b.ph) * .07);
  });
  for (let i = fx.length - 1; i >= 0; i--) if (!fx[i](dt)) fx.splice(i, 1);
  bSp(t, dt);
};
function popText(x, y, color) {
  const t = document.createElement("div"); t.className = "poptxt"; t.style.cssText = `left:${x}px;top:${y}px;color:${color}`; t.textContent = "POP!"; document.body.appendChild(t);
  t.animate([{ transform: "translate(-50%,-50%) scale(.4) rotate(-10deg)", opacity: 1 }, { transform: "translate(-50%,-120%) scale(1.3) rotate(6deg)", opacity: 0 }], { duration: 650, easing: "ease-out" }).onfinish = () => t.remove();
}
let wishEl, finalTimer;
function clearWish() { ["reply", "card", "again"].forEach(i => $(i).hidden = true); clearTimeout(finalTimer); if (wishEl) { wishEl.remove(); wishEl = null; } }
function showWish(text, x, y, color, keep) {
  if (wishEl) wishEl.remove();
  const el = wishEl = document.createElement("div"); el.className = "wishpop"; el.textContent = text; el.style.borderColor = color;
  const half = Math.min(120, innerWidth * .35);
  el.style.left = Math.max(half + 8, Math.min(innerWidth - half - 8, x)) + "px"; el.style.top = Math.max(70, Math.min(innerHeight - 70, y)) + "px";
  document.body.appendChild(el);
  el.animate([{ transform: "translate(-50%,-50%) scale(.2)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }], { duration: 450, delay: 220, easing: "cubic-bezier(.3,1.5,.5,1)", fill: "both" });
  if (!keep) setTimeout(() => { if (wishEl === el) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }).onfinish = () => el.remove(); }, 4000);
}
function showReply() {
  $("card").hidden = false; $("again").hidden = false;
  const R = C.reply; if (!R || !R.url) return; $("reply").textContent = fill(R.label || "Send a thank-you 💌"); $("reply").hidden = false; }
$("reply").onclick = () => {
  const R = C.reply;
  if (/X{4}|YOUR_/.test(R.url)) { alert("Set your link in js/config.js (reply.url)"); return; }
  const url = R.url.replace("{msg}", encodeURIComponent(R.message || ""));
  if (/^https?:/.test(url)) window.open(url, "_blank", "noopener"); else location.href = url;
};
function popBalloon(b) {
  b.popped = true; const p = new THREE.Vector3(); b.body.getWorldPosition(p); b.body.visible = false; balS.scene.attach(b.tail);
  let vy = 0; const vr = (Math.random() - .5) * 3;
  fx.push(dt => { vy += 9 * dt; b.tail.position.y -= vy * dt; b.tail.rotation.z += vr * dt; if (b.tail.position.y < -14) { balS.scene.remove(b.tail); return false; } return true; });
  const m = new THREE.MeshStandardMaterial({ color: b.color, side: THREE.DoubleSide, roughness: .3 }), sh = [];
  for (let i = 0; i < 20; i++) {
    const s = new THREE.Mesh(shardGeo, m); s.position.copy(p).add(new THREE.Vector3(Math.random() - .5, (Math.random() - .5) * 1.4, (Math.random() - .5) * .6)); s.scale.setScalar(.8 + Math.random() * 1.4);
    s.userData = { v: new THREE.Vector3((Math.random() - .5) * 7, Math.random() * 5 + 1, (Math.random() - .2) * 5), r: new THREE.Vector3(Math.random() * 9 - 4.5, Math.random() * 9 - 4.5, Math.random() * 9 - 4.5) };
    balS.scene.add(s); sh.push(s);
  }
  let age = 0;
  fx.push(dt => {
    age += dt; sh.forEach(s => { const u = s.userData; u.v.y -= 9 * dt; s.position.addScaledVector(u.v, dt); s.rotation.x += u.r.x * dt; s.rotation.y += u.r.y * dt; s.rotation.z += u.r.z * dt; if (age > .7) s.scale.multiplyScalar(.9); });
    if (age > 1.2) { sh.forEach(s => balS.scene.remove(s)); m.dispose(); return false; } return true;
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.85, 1, 48), new THREE.MeshBasicMaterial({ color: b.color, transparent: true, side: THREE.DoubleSide, depthWrite: false })), fl = sprite(TEX.white, 2, .9);
  ring.position.copy(p); fl.position.copy(p); balS.scene.add(ring, fl); let ra = 0;
  fx.push(dt => {
    ra += dt; const u = ra / .4; ring.quaternion.copy(balS.camera.quaternion); ring.scale.setScalar(.6 + u * 3); ring.material.opacity = Math.max(0, 1 - u);
    fl.scale.setScalar(2 + u * 3); fl.material.opacity = Math.max(0, .9 - u * 2.5); if (u >= 1) { balS.scene.remove(ring, fl); return false; } return true;
  });
  const v = p.clone().project(balS.camera), sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
  burst(sx, sy, 30); popText(sx, sy, b.color); popSound(); if (navigator.vibrate) navigator.vibrate(25);
  showWish(b.wish, sx, sy, b.color);
  if (++popped === C.wishes.length) finalTimer = setTimeout(() => { showWish(C.finalWish, innerWidth / 2, innerHeight / 2, "#ff5c93", true); showReply(); rain(); }, 2800);
}
function startFinal() { $("title").textContent = `Happy Birthday, ${C.name}! 🎂`; $("wish").textContent = ""; show("s4"); go(balS); rain(); }
$("again").onclick = () => { clearWish(); show("s1"); go(gift); };

/* ---------- Secret: tap the cake 5 times ---------- */
function secretTap() {
  CK.taps = CK.taps.filter(x => tNow - x < 3).concat(tNow);
  if (CK.taps.length >= 5) { CK.taps = []; CK.dance = tNow; CK.giggle = tNow + 3; rain(); setTimeout(rain, 1500); showWish("🎉 You found the secret!", innerWidth / 2, innerHeight * .45, "#ffb703"); }
}

/* ---------- Save birthday card as a picture ---------- */
function drawCard(g, W, H, name, text, from, cakeImg, faceImg, photoImgs) {
  const F = "Fredoka, ui-rounded, system-ui, sans-serif";
  const rr = (x, y, w, h, r, c) => { g.fillStyle = c; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
  const dot = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); };
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#ffe9f1"); bg.addColorStop(1, "#cdb4ff"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  [[120, 110, 14], [960, 90, 18], [1000, 560, 12], [70, 760, 10], [110, 1290, 12], [975, 1280, 14], [820, 40, 9], [90, 500, 10]].forEach(([x, y, r]) => {
    g.fillStyle = "#ffc933"; g.beginPath(); g.moveTo(x, y - r * 2); g.lineTo(x + r * .6, y - r * .6); g.lineTo(x + r * 2, y); g.lineTo(x + r * .6, y + r * .6); g.lineTo(x, y + r * 2); g.lineTo(x - r * .6, y + r * .6); g.lineTo(x - r * 2, y); g.lineTo(x - r * .6, y - r * .6); g.closePath(); g.fill();
  });
  if (faceImg) {
    const cx = 540, cy = 250, r = 150, ring = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r); ring.addColorStop(0, "#ff5c93"); ring.addColorStop(1, "#ffc933");
    g.fillStyle = ring; g.beginPath(); g.arc(cx, cy, r + 16, 0, 6.283); g.fill();
    dot(cx, cy, r + 5, "#ffffff");
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.clip(); g.drawImage(faceImg, cx - r, cy - r, r * 2, r * 2); g.restore();
  }
  g.save(); g.translate(0, faceImg ? 0 : -120);
  g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.fillStyle = "#3b1a4a"; g.font = `600 84px ${F}`; g.fillText("Happy Birthday", W / 2, 520);
  let fs = 130; g.font = `600 ${fs}px ${F}`; while (g.measureText(name).width > W - 160 && fs > 60) { fs -= 6; g.font = `600 ${fs}px ${F}`; }
  g.fillStyle = "#ff5c93"; g.fillText(name, W / 2, 650);
  if (cakeImg) g.drawImage(cakeImg, 220, 660, 640, 640);
  else {
    g.save(); g.translate(81, 346); g.scale(.85, .85);
      rr(170, 1010, 740, 40, 20, "#f4effa");
      rr(230, 840, 620, 170, 36, "#8a4fd0"); rr(230, 840, 620, 44, 22, "#ffd1e3");
      for (let x = 270, i = 0; x < 820; x += 70, i++) rr(x, 860, 34, 30 + (i % 3) * 14, 17, "#ffd1e3");
      rr(300, 700, 480, 150, 32, "#ff5c93"); rr(300, 700, 480, 40, 20, "#fff4c4");
      for (let x = 330, i = 0; x < 760; x += 62, i++) rr(x, 720, 30, 26 + (i % 3) * 12, 15, "#fff4c4");
      rr(380, 580, 320, 130, 30, "#4cc9f0"); rr(380, 580, 320, 36, 18, "#ffffff");
      for (let x = 410, i = 0; x < 680; x += 58, i++) rr(x, 598, 28, 22 + (i % 3) * 10, 14, "#ffffff");
      [470, 610].forEach(x => { dot(x, 790, 16, "#2a1238"); dot(x + 5, 784, 5, "#ffffff"); });
      dot(425, 822, 18, "#ffb0cf"); dot(655, 822, 18, "#ffb0cf");
      g.strokeStyle = "#2a1238"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.arc(540, 800, 34, .15 * Math.PI, .85 * Math.PI); g.stroke();
      [[470, "#ffb703"], [540, "#7ae582"], [610, "#b388ff"]].forEach(([x, c]) => {
      rr(x - 9, 480, 18, 100, 6, c);
      g.fillStyle = "#ffa726"; g.beginPath(); g.ellipse(x, 448, 16, 30, 0, 0, 6.283); g.fill();
      g.fillStyle = "#fff3c4"; g.beginPath(); g.ellipse(x, 456, 8, 16, 0, 0, 6.283); g.fill();
      });
    g.restore();
  }
  const ph = photoImgs || [];
  if (ph.length) { // every memory photo, as a strip of small polaroids (equal area, so landscape ones are wider)
    const cols = Math.max(Math.min(ph.length, 6), Math.ceil(ph.length / 2)), gap = 14, rows = [];
    for (let i = 0; i < ph.length; i += cols) rows.push(ph.slice(i, i + cols));
    const lay2 = rows.map(row => {
      const it = row.map(im => { const ar = Math.max(.55, Math.min(1.6, im.width / im.height)); let pw = Math.sqrt(18500 * ar); if (pw / ar > 150) pw = 150 * ar; return { im, ar, pw }; });
      const k = Math.min(1, 980 / (it.reduce((a, o) => a + o.pw + 16, 0) + gap * (it.length - 1)));
      it.forEach(o => { o.pw *= k; o.ph = o.pw / o.ar; o.fw = o.pw + 16; o.fh = o.ph + 34; });
      return { it, rowW: it.reduce((a, o) => a + o.fw, 0) + gap * (it.length - 1), rowH: Math.max(...it.map(o => o.fh)) };
    });
    let y = 1320 + (360 - (lay2.reduce((a, r) => a + r.rowH, 0) + gap * (lay2.length - 1))) / 2, n = 0;
    lay2.forEach(({ it, rowW, rowH }) => {
      let x = (W - rowW) / 2;
      it.forEach(o => {
        g.save(); g.translate(x + o.fw / 2, y + rowH / 2); g.rotate(((n++ * 7) % 5 - 2) * .028);
        g.shadowColor = "rgba(0,0,0,.22)"; g.shadowBlur = 10; g.shadowOffsetY = 4; g.fillStyle = "#fff"; g.fillRect(-o.fw / 2, -o.fh / 2, o.fw, o.fh); g.shadowColor = "transparent";
        const sc = Math.max(o.pw / o.im.width, o.ph / o.im.height), sw = o.pw / sc, sh = o.ph / sc;
        g.drawImage(o.im, (o.im.width - sw) / 2, (o.im.height - sh) / 2, sw, sh, -o.fw / 2 + 8, -o.fh / 2 + 8, o.pw, o.ph);
        g.restore(); x += o.fw + gap;
      });
      y += rowH + gap;
    });
  }
  const lay = sz => { g.font = `500 ${sz}px ${F}`; const o = []; let line = ""; text.split(" ").forEach(w => { const t = line ? line + " " + w : w; if (g.measureText(t).width > 900 && line) { o.push(line); line = w; } else line = t; }); o.push(line); return o; };
  let sz = 44, lines = lay(sz); while (lines.length > 2 && sz > 30) { sz -= 4; lines = lay(sz); }
  g.font = `500 ${sz}px ${F}`; g.fillStyle = "#7a5a8c"; lines.forEach((l, i) => g.fillText(l, W / 2, 1738 + i * (sz + 14)));
  if (from) { g.font = `600 46px ${F}`; g.fillStyle = "#3b1a4a"; g.fillText("— " + from, W / 2, 1738 + (lines.length - 1) * (sz + 14) + 72); }
  g.restore();
}
const loadImg = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
function snapCake() { // renders the real 3D cake (lit candles, happy face) to an image
  const S = 1080, cam = new THREE.PerspectiveCamera(36, 1, .1, 100);
  items.forEach(it => { it.g.visible = true; it.g.position.y = it.base; it.g.scale.set(1, 1, 1); });
  cs.forEach(c => { c.g.visible = true; c.g.position.y = c.y0; c.g.rotation.z = 0; c.flame.visible = true; c.flame.scale.set(1, 1, 1); c.flame.rotation.z = 0; c.light.intensity = .8; c.gl.material.opacity = .7; });
  cake.rotation.set(0, 0, 0); cake.position.y = 0; cake.scale.set(1, 1, 1);
  eyes.forEach((e, i) => { e.scale.y = .8; e.position.set((i ? 1 : -1) * .4, .52, 0); }); mouth.scale.setScalar(1.3);
  cam.position.set(0, 3.2, 10.5); cam.lookAt(0, 1.5, 0);
  renderer.setPixelRatio(1); renderer.setSize(S, S, false); renderer.render(cakeS.scene, cam);
  const k = document.createElement("canvas"); k.width = k.height = S; k.getContext("2d").drawImage(renderer.domElement, 0, 0);
  fit(); return k;
}
let CARD;
async function makeCard() {
  try { await document.fonts.load("600 90px Fredoka"); } catch (e) {}
  const k = document.createElement("canvas"); k.width = 1080; k.height = 1920;
  let cakeImg = null; try { cakeImg = snapCake(); } catch (e) { fit(); }
  const faceImg = await loadImg(C.portrait && C.portrait.face);
  const photoImgs = (await Promise.all((C.photos || []).map(p => loadImg(p.src)))).filter(Boolean);
  drawCard(k.getContext("2d"), 1080, 1920, C.name, fill(C.cardText || "Wishing you a year full of love, laughter and cake. 🎂"), C.from, cakeImg, faceImg, photoImgs);
  const blob = await new Promise(r => k.toBlob(r, "image/png"));
  CARD = new File([blob], "birthday-card.png", { type: "image/png" });
  if ($("cardImg").dataset.u) URL.revokeObjectURL($("cardImg").dataset.u);
  $("cardImg").dataset.u = $("cardImg").src = URL.createObjectURL(blob);
}
$("card").onclick = async () => { $("card").disabled = true; try { await makeCard(); $("cardShare").hidden = !(navigator.canShare && navigator.canShare({ files: [CARD] }) && matchMedia("(pointer: coarse)").matches); $("cardView").hidden = false; } catch (e) {} $("card").disabled = false; };
$("cardClose").onclick = () => { $("cardView").hidden = true; };
$("cardSave").onclick = () => { // always downloads the PNG
  const a = document.createElement("a"); a.href = $("cardImg").src; a.download = "birthday-card.png"; document.body.appendChild(a); a.click(); a.remove();
};
$("cardShare").onclick = async () => { try { await navigator.share({ files: [CARD], title: "Birthday card" }); } catch (e) {} }; // phone share sheet

/* ---------- Scene manager ---------- */
const ray = new THREE.Raycaster();
const pick = (e, objs) => { ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), cur.camera); return ray.intersectObjects(objs, true); };
$("gl").addEventListener("pointerdown", e => {
  if (cur === gift) openGift();
  else if (cur === cakeS) {
    const h = pick(e, cs.map(c => c.hit));
    if (h.length) blow(h[0].object.userData.c); else if (CK.ready && pick(e, [t1, t2, t3]).length) { hop(.55, .6); CK.giggle = tNow; secretTap(); }
  } else if (cur === balS) { const h = pick(e, bls.filter(b => !b.popped).map(b => b.body)); if (h.length) popBalloon(h[0].object.userData.b); }
});
function go(S) { const c = $("gl"); c.style.opacity = 0; setTimeout(() => { cur = S; S.t0 = tNow; if (S.enter) S.enter(); c.style.opacity = 1; }, 300); }
function fit() {
  fit2d(); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(innerWidth, innerHeight, false);
  const a = innerWidth / innerHeight;
  [gift, cakeS, balS].forEach(S => { S.camera.aspect = a; S.camera.updateProjectionMatrix(); S.k = Math.max(1, S.hw / (Math.tan(19 * Math.PI / 180) * a * S.off.length())); });
}
addEventListener("resize", fit); fit();
const pad = n => String(n).padStart(2, "0");
function tickLock() {
  const left = unlockAt - Date.now(), was = LK.locked, up = $("s1top"), low = $("s1hint");
  LK.locked = !preview && left > 0;
  if (LK.locked) {
    const s = Math.ceil(left / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    low.textContent = "Opens in " + (d ? d + "d " : "") + pad(h) + "h " + pad(m) + "m " + pad(s % 60) + "s";
    up.textContent = fill(C.lockedText || "A surprise is waiting for you, {name}…");
  } else {
    low.textContent = "Tap the gift"; up.textContent = "Someone left you something…";
    if (was) { LK.fall = tNow; burst(innerWidth / 2, innerHeight / 2, 100); if (navigator.vibrate) navigator.vibrate([40, 60, 40]); }
  }
}
tickLock(); setInterval(tickLock, 500);
cur = gift; gift.enter();
(function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05); tNow += dt;
  const S = cur; S.update(tNow, dt);
  S.camera.position.copy(S.look).addScaledVector(S.off, S.k); S.camera.lookAt(S.look); renderer.render(S.scene, S.camera);
})();