const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("nextGoat");
const nextCtx = nextCanvas.getContext("2d");
const goatImage = new Image();
const goatSound = new Audio("assets/goat_sound.mp3");
goatSound.preload = "auto";
let goatImageReady = false;
let goatSprite = null;

const els = {
  coverage: document.getElementById("coverage"),
  coverageBar: document.getElementById("coverageBar"),
  score: document.getElementById("score"),
  remaining: document.getElementById("remaining"),
  powerBar: document.getElementById("powerBar"),
  combo: document.getElementById("combo"),
  lastBonus: document.getElementById("lastBonus"),
  bestCoverage: document.getElementById("bestCoverage"),
  rank: document.getElementById("rank"),
  nextBadge: document.getElementById("nextBadge"),
  result: document.getElementById("result"),
  resultTitle: document.getElementById("resultTitle"),
  resultCoverage: document.getElementById("resultCoverage"),
  resultRank: document.getElementById("resultRank"),
  resultScore: document.getElementById("resultScore"),
  resultPlaced: document.getElementById("resultPlaced"),
  retryButton: document.getElementById("retryButton"),
  shareButton: document.getElementById("shareButton"),
  menuButton: document.getElementById("menuButton"),
};

const TOTAL_GOATS = 15;
const GRAVITY = 430;
const POWER_MIN = 980;
const POWER_MAX = 2050;
const STORAGE_KEY = "cliff-goat-best";

let audioContext = null;

function audio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function tone(frequency, duration, type = "sine", volume = 0.16, when = 0) {
  const ac = audio();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const start = ac.currentTime + when;
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noise(duration, volume = 0.12, when = 0) {
  const ac = audio();
  const bufferSize = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ac.createBufferSource();
  const gain = ac.createGain();
  const start = ac.currentTime + when;
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(gain);
  gain.connect(ac.destination);
  source.start(start);
}

function bleat(when = 0, volume = 0.13) {
  const ac = audio();
  const osc = ac.createOscillator();
  const nasal = ac.createOscillator();
  const cheer = ac.createOscillator();
  const wobble = ac.createOscillator();
  const wobbleGain = ac.createGain();
  const gain = ac.createGain();
  const nasalGain = ac.createGain();
  const cheerGain = ac.createGain();
  const filter = ac.createBiquadFilter();
  const start = ac.currentTime + when;

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(260, start);
  osc.frequency.exponentialRampToValueAtTime(205, start + 0.22);
  osc.frequency.exponentialRampToValueAtTime(175, start + 0.64);

  nasal.type = "triangle";
  nasal.frequency.setValueAtTime(390, start);
  nasal.frequency.exponentialRampToValueAtTime(310, start + 0.24);
  nasal.frequency.exponentialRampToValueAtTime(255, start + 0.64);

  cheer.type = "triangle";
  cheer.frequency.setValueAtTime(520, start + 0.18);
  cheer.frequency.exponentialRampToValueAtTime(690, start + 0.42);
  cheer.frequency.exponentialRampToValueAtTime(820, start + 0.68);

  wobble.type = "sine";
  wobble.frequency.setValueAtTime(9, start);
  wobble.frequency.exponentialRampToValueAtTime(5, start + 0.64);
  wobbleGain.gain.setValueAtTime(36, start);
  wobbleGain.gain.exponentialRampToValueAtTime(18, start + 0.64);
  wobble.connect(wobbleGain);
  wobbleGain.connect(osc.frequency);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(420, start);
  filter.frequency.exponentialRampToValueAtTime(520, start + 0.2);
  filter.frequency.exponentialRampToValueAtTime(330, start + 0.66);
  filter.Q.setValueAtTime(4.2, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume * 1.35, start + 0.045);
  gain.gain.exponentialRampToValueAtTime(volume * 0.58, start + 0.24);
  gain.gain.exponentialRampToValueAtTime(volume * 1.05, start + 0.38);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.82);

  nasalGain.gain.setValueAtTime(0.0001, start);
  nasalGain.gain.exponentialRampToValueAtTime(volume * 0.22, start + 0.05);
  nasalGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);

  cheerGain.gain.setValueAtTime(0.0001, start);
  cheerGain.gain.setValueAtTime(0.0001, start + 0.16);
  cheerGain.gain.exponentialRampToValueAtTime(volume * 0.28, start + 0.28);
  cheerGain.gain.exponentialRampToValueAtTime(volume * 0.12, start + 0.56);
  cheerGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.78);

  osc.connect(filter);
  nasal.connect(nasalGain);
  cheer.connect(cheerGain);
  nasalGain.connect(filter);
  cheerGain.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  nasal.start(start);
  cheer.start(start + 0.18);
  wobble.start(start);
  osc.stop(start + 0.84);
  nasal.stop(start + 0.84);
  cheer.stop(start + 0.84);
  wobble.stop(start + 0.84);
}

function playSound(name) {
  try {
    if (name === "charge") {
      tone(220, 0.06, "triangle", 0.06);
    } else if (name === "fire") {
      noise(0.18, 0.18);
      tone(92, 0.16, "sawtooth", 0.14);
      tone(55, 0.22, "square", 0.08, 0.03);
    } else if (name === "stick") {
      playGoatSound();
    } else if (name === "perfect") {
      playGoatSound();
      tone(1180, 0.08, "sine", 0.08, 0.16);
    } else if (name === "fail") {
      tone(180, 0.18, "sawtooth", 0.12);
      tone(90, 0.24, "square", 0.09, 0.12);
    } else if (name === "result") {
      tone(392, 0.1, "triangle", 0.11);
      tone(523, 0.1, "triangle", 0.11, 0.09);
      tone(659, 0.16, "triangle", 0.11, 0.18);
    }
  } catch {
    audioContext = null;
  }
}

function playGoatSound() {
  audio();
  goatSound.currentTime = 0;
  goatSound.play().catch(() => {
    bleat(0, 0.12);
  });
}

const state = {
  w: 0,
  h: 0,
  dpr: 1,
  cliff: [],
  cliffArea: 1,
  occupiedArea: 0,
  goats: [],
  projectile: null,
  nextGoat: null,
  remaining: TOTAL_GOATS,
  score: 0,
  combo: 0,
  coverage: 0,
  power: 0,
  charging: false,
  chargeDir: 1,
  angle: Math.PI / 2,
  angleDir: 1,
  lastTime: 0,
  gameOver: false,
  message: "",
  messageTimer: 0,
  seed: dailySeed(),
};

goatImage.onload = () => {
  goatSprite = buildGoatSprite(goatImage);
  goatImageReady = true;
  drawNextGoat();
};

goatImage.onerror = () => {
  goatImageReady = false;
  state.message = "assets/goat.png が見つかりません";
  state.messageTimer = 3;
};

function loadGoatImage() {
  goatImage.src = "assets/goat.png";
}

function buildGoatSprite(image) {
  const source = document.createElement("canvas");
  source.width = image.naturalWidth || image.width;
  source.height = image.naturalHeight || image.height;
  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);

  const imageData = sourceCtx.getImageData(0, 0, source.width, source.height);
  const data = imageData.data;
  const width = source.width;
  const height = source.height;
  const visited = new Uint8Array(width * height);
  const stack = [];

  const isBackground = (index) => {
    const offset = index * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    return r > 220 && g > 220 && b > 220 && spread < 18;
  };

  for (let x = 0; x < width; x++) {
    stack.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width, y * width + width - 1);
  }

  while (stack.length) {
    const index = stack.pop();
    if (visited[index] || !isBackground(index)) continue;
    visited[index] = 1;
    data[index * 4 + 3] = 0;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) stack.push(index - 1);
    if (x < width - 1) stack.push(index + 1);
    if (y > 0) stack.push(index - width);
    if (y < height - 1) stack.push(index + width);
  }

  sourceCtx.putImageData(imageData, 0, 0);

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  const pad = 12;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const sprite = document.createElement("canvas");
  sprite.width = Math.max(1, maxX - minX + 1);
  sprite.height = Math.max(1, maxY - minY + 1);
  sprite.getContext("2d").drawImage(source, minX, minY, sprite.width, sprite.height, 0, 0, sprite.width, sprite.height);
  return sprite;
}

function dailySeed() {
  const d = new Date();
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
}

function mulberry32(seed) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = mulberry32(state.seed);

function resize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.w = Math.floor(window.innerWidth);
  state.h = Math.floor(window.innerHeight);
  canvas.width = Math.floor(state.w * state.dpr);
  canvas.height = Math.floor(state.h * state.dpr);
  canvas.style.width = `${state.w}px`;
  canvas.style.height = `${state.h}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  makeCliff();
  recalcCoverage();
}

function makeCliff() {
  const w = state.w;
  const h = state.h;
  const top = h * 0.02;
  const bottom = h * 0.88;
  const leftBase = w * 0.08;
  const rightBase = w * 0.94;
  const points = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const y = top + ((bottom - top) * i) / steps;
    const noise = Math.sin(i * 1.71 + state.seed) * 26 + Math.sin(i * 0.53) * 18;
    points.push({ x: leftBase + noise - (i / steps) * w * 0.04, y });
  }
  for (let i = steps; i >= 0; i--) {
    const y = top + ((bottom - top) * i) / steps;
    const noise = Math.cos(i * 1.23 + state.seed) * 20 + Math.sin(i * 0.91) * 15;
    points.push({ x: rightBase + noise + (i / steps) * w * 0.025, y });
  }
  state.cliff = points;
  state.cliffArea = polygonArea(points);
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area / 2);
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    const hit = a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;
    if (hit) inside = !inside;
  }
  return inside;
}

function cannon() {
  return { x: state.w * 0.5, y: state.h * 0.86 };
}

function rollGoat() {
  const sizeRoll = rand();
  const rareRoll = rand();
  let size = "M";
  if (sizeRoll < 0.35) size = "S";
  else if (sizeRoll > 0.7) size = "L";

  let rare = "normal";
  if (rareRoll > 0.98) rare = "gold";
  else if (rareRoll > 0.9) rare = "rare";

  const dims = {
    S: { w: 64, h: 42, score: 80 },
    M: { w: 84, h: 55, score: 100 },
    L: { w: 112, h: 72, score: 150 },
  }[size];
  return {
    size,
    rare,
    w: dims.w,
    h: dims.h,
    baseScore: dims.score,
    pose: rand() * Math.PI * 2,
    spin: (rand() > 0.5 ? 1 : -1) * (5.5 + rand() * 3.5),
  };
}

function reset() {
  rand = mulberry32(state.seed);
  state.goats = [];
  state.projectile = null;
  state.nextGoat = rollGoat();
  state.remaining = TOTAL_GOATS;
  state.score = 0;
  state.combo = 0;
  state.coverage = 0;
  state.occupiedArea = 0;
  state.power = 0;
  state.charging = false;
  state.chargeDir = 1;
  state.angle = Math.PI / 2;
  state.angleDir = 1;
  state.gameOver = false;
  state.message = "長押しで角度とパワーを合わせろ";
  state.messageTimer = 2.4;
  els.result.hidden = true;
  makeCliff();
  updateHud();
  drawNextGoat();
}

function updateHud() {
  els.coverage.textContent = `${state.coverage.toFixed(1)}%`;
  els.coverageBar.style.width = `${Math.min(100, state.coverage)}%`;
  els.score.textContent = `${state.score.toLocaleString()} pt`;
  els.remaining.textContent = state.remaining;
  els.powerBar.style.width = `${Math.round(state.power * 100)}%`;
  els.combo.textContent = state.combo;
  els.bestCoverage.textContent = `${Number(localStorage.getItem(STORAGE_KEY) || 0).toFixed(1)}%`;
}

function drawNextGoat() {
  const g = state.nextGoat;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const grad = nextCtx.createLinearGradient(0, 0, 220, 170);
  grad.addColorStop(0, "#8b6a47");
  grad.addColorStop(1, "#3a271c");
  nextCtx.fillStyle = grad;
  nextCtx.fillRect(0, 0, 220, 170);
  drawGoat(nextCtx, 112, 88, g, -0.08, 1.7);
  els.nextBadge.textContent = g.size;
  els.nextBadge.style.background = g.rare === "gold" ? "#d5a300" : g.rare === "rare" ? "#7a3fe0" : "#cf1e22";
}

function startCharge() {
  if (state.gameOver || state.projectile || state.remaining <= 0) return;
  audio();
  playSound("charge");
  state.charging = true;
  state.power = 0;
  state.chargeDir = 1;
}

function fire() {
  if (!state.charging || state.gameOver || state.projectile) return;
  state.charging = false;
  const c = cannon();
  const power = POWER_MIN + state.power * (POWER_MAX - POWER_MIN);
  state.projectile = {
    x: c.x,
    y: c.y - 40,
    vx: Math.cos(state.angle) * power,
    vy: -Math.sin(state.angle) * power,
    rot: -state.angle,
    goat: state.nextGoat,
    age: 0,
  };
  playSound("fire");
  state.nextGoat = rollGoat();
  drawNextGoat();
}

function update(dt) {
  if (state.gameOver) return;
  if (state.charging) {
    state.power += state.chargeDir * dt * 0.85;
    if (state.power >= 1) {
      state.power = 1;
      state.chargeDir = -1;
    } else if (state.power <= 0) {
      state.power = 0;
      state.chargeDir = 1;
    }
  }

  if (!state.charging) {
    const minA = Math.PI * 0.24;
    const maxA = Math.PI * 0.76;
    state.angle += state.angleDir * dt * 1.25;
    if (state.angle > maxA) {
      state.angle = maxA;
      state.angleDir = -1;
    } else if (state.angle < minA) {
      state.angle = minA;
      state.angleDir = 1;
    }
  }

  if (state.projectile) {
    const p = state.projectile;
    p.age += dt;
    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.goat.spin * dt;
    const collisionArmed = p.age > 0.18 && p.y < state.h * 0.78;
    if (collisionArmed && pointInPolygon(p.x, p.y, state.cliff)) {
      stickGoat(p);
    } else if (p.y > state.h + 100 || p.x < -120 || p.x > state.w + 120) {
      failGoat("崖に届かず落下");
    }
  }

  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
  }
  updateHud();
}

function goatMaskPoints(x, y, goat, rot, step = 8) {
  const pts = [];
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const rx = goat.w / 2;
  const ry = goat.h / 2;
  for (let yy = -ry; yy <= ry; yy += step) {
    for (let xx = -rx; xx <= rx; xx += step) {
      const body = (xx * xx) / (rx * rx) + (yy * yy) / (ry * ry) <= 1;
      const head = ((xx - rx * 0.52) ** 2) / ((rx * 0.34) ** 2) + ((yy + ry * 0.04) ** 2) / ((ry * 0.46) ** 2) <= 1;
      if (body || head) {
        pts.push({ x: x + xx * cos - yy * sin, y: y + xx * sin + yy * cos });
      }
    }
  }
  return pts;
}

function estimateOverlap(x, y, goat, rot) {
  const pts = goatMaskPoints(x, y, goat, rot, 7);
  let occupied = 0;
  let onCliff = 0;
  for (const pt of pts) {
    if (pointInPolygon(pt.x, pt.y, state.cliff)) onCliff++;
    if (state.goats.some((g) => pointInGoat(pt.x, pt.y, g))) occupied++;
  }
  return {
    overlap: pts.length ? occupied / pts.length : 1,
    onCliff: pts.length ? onCliff / pts.length : 0,
  };
}

function pointInGoat(x, y, placed) {
  const dx = x - placed.x;
  const dy = y - placed.y;
  const cos = Math.cos(-placed.rot);
  const sin = Math.sin(-placed.rot);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const rx = placed.goat.w / 2;
  const ry = placed.goat.h / 2;
  const body = (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1;
  const head = ((lx - rx * 0.52) ** 2) / ((rx * 0.34) ** 2) + ((ly + ry * 0.04) ** 2) / ((ry * 0.46) ** 2) <= 1;
  return body || head;
}

function stickGoat(projectile) {
  const { x, y, goat, rot } = projectile;
  const verdict = estimateOverlap(x, y, goat, rot);
  if (verdict.onCliff < 0.58) {
    failGoat("浅すぎて落下");
    return;
  }
  if (verdict.overlap >= 0.25) {
    failGoat("重なりすぎて落下");
    return;
  }

  state.remaining -= 1;
  state.goats.push({ x, y, goat, rot, verdict: verdict.overlap });
  state.projectile = null;
  state.combo += 1;

  let quality = "Danger";
  let bonus = 20;
  if (verdict.overlap <= 0.05) {
    quality = "Perfect";
    bonus = 180;
  } else if (verdict.overlap <= 0.15) {
    quality = "Good";
    bonus = 85;
  }
  playSound(quality === "Perfect" ? "perfect" : "stick");
  const rareBonus = goat.rare === "gold" ? 450 : goat.rare === "rare" ? 180 : 0;
  const comboBonus = Math.max(0, state.combo - 1) * 35;
  const adjacentBonus = nearbyGoats(x, y, goat) * 45;
  const rockBonus = rockMultiplierAt(x, y);
  const gained = Math.round((goat.baseScore + bonus + comboBonus + adjacentBonus + rareBonus) * rockBonus);
  state.score += gained;
  state.message = `${quality}吸着  +${gained.toLocaleString()} pt`;
  state.messageTimer = 1.6;
  els.lastBonus.innerHTML = `隣接ボーナス<br />+${adjacentBonus.toLocaleString()} pt`;
  recalcCoverage();
  if (state.remaining <= 0) endGame();
}

function nearbyGoats(x, y, goat) {
  const radius = goat.w * 1.12;
  return state.goats.filter((g) => Math.hypot(g.x - x, g.y - y) < radius).length - 1;
}

function rockMultiplierAt(x, y) {
  const stripe = Math.floor(y / Math.max(42, state.h * 0.08)) % 5;
  if (stripe === 1 && x > state.w * 0.48) return 1.35;
  if (stripe === 3 && x < state.w * 0.62) return 0.8;
  return 1;
}

function failGoat(message) {
  state.remaining -= 1;
  state.projectile = null;
  state.combo = 0;
  state.message = message;
  state.messageTimer = 1.5;
  playSound("fail");
  if (state.remaining <= 0) endGame();
}

function recalcCoverage() {
  const sample = Math.max(8, Math.min(14, state.w / 120));
  let cliff = 0;
  let occupied = 0;
  for (let y = 0; y < state.h * 0.9; y += sample) {
    for (let x = 0; x < state.w; x += sample) {
      if (!pointInPolygon(x, y, state.cliff)) continue;
      cliff++;
      if (state.goats.some((g) => pointInGoat(x, y, g))) occupied++;
    }
  }
      state.coverage = cliff ? Math.min(100, (occupied / cliff) * 620) : 0;
  state.occupiedArea = occupied * sample * sample;
}

function endGame() {
  state.gameOver = true;
  playSound("result");
  const best = Number(localStorage.getItem(STORAGE_KEY) || 0);
  if (state.coverage > best) localStorage.setItem(STORAGE_KEY, state.coverage.toFixed(1));
  const rank = rankFor(state.coverage);
  els.resultTitle.textContent = state.coverage >= 80 ? "ヤギだらけの勝利" : "崖埋め完了";
  els.resultCoverage.textContent = `${state.coverage.toFixed(1)}%`;
  els.resultRank.textContent = rank;
  els.resultScore.textContent = `${state.score.toLocaleString()} pt`;
  els.resultPlaced.textContent = `${state.goats.length} / ${TOTAL_GOATS}`;
  els.result.hidden = false;
  updateHud();
}

function rankFor(value) {
  if (value >= 95) return "SS";
  if (value >= 85) return "S";
  if (value >= 70) return "A";
  if (value >= 55) return "B";
  return "C";
}

function draw() {
  ctx.clearRect(0, 0, state.w, state.h);
  drawSkyAndGround();
  drawCliff();
  drawRockAttributes();
  state.goats.forEach((g) => drawGoat(ctx, g.x, g.y, g.goat, g.rot, 1));
  if (state.projectile) {
    drawGoat(ctx, state.projectile.x, state.projectile.y, state.projectile.goat, state.projectile.rot, 1);
  }
  drawCannon();
  drawAim();
  drawMessage();
}

function drawSkyAndGround() {
  const bg = ctx.createLinearGradient(0, 0, 0, state.h);
  bg.addColorStop(0, "#9d876b");
  bg.addColorStop(0.66, "#5c4b37");
  bg.addColorStop(1, "#2b241c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, state.w, state.h);
  ctx.fillStyle = "#33261b";
  ctx.beginPath();
  ctx.moveTo(0, state.h * 0.84);
  ctx.lineTo(state.w, state.h * 0.78);
  ctx.lineTo(state.w, state.h);
  ctx.lineTo(0, state.h);
  ctx.closePath();
  ctx.fill();
}

function drawCliff() {
  ctx.save();
  ctx.beginPath();
  state.cliff.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const rock = ctx.createLinearGradient(0, 0, 0, state.h * 0.9);
  rock.addColorStop(0, "#b98c63");
  rock.addColorStop(0.3, "#d1aa7f");
  rock.addColorStop(0.65, "#9b7351");
  rock.addColorStop(1, "#684b36");
  ctx.fillStyle = rock;
  ctx.fill();
  ctx.clip();

  for (let y = -10; y < state.h * 0.9; y += 17) {
    const wobble = Math.sin(y * 0.05 + state.seed) * 12;
    ctx.strokeStyle = y % 51 === 0 ? "rgba(75,48,30,0.38)" : "rgba(255,239,204,0.2)";
    ctx.lineWidth = y % 51 === 0 ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(state.w * 0.05, y + wobble);
    for (let x = state.w * 0.05; x < state.w; x += 80) {
      ctx.lineTo(x, y + Math.sin(x * 0.018 + y) * 7 + wobble);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 240; i++) {
    const x = randNoise(i, 17) * state.w;
    const y = randNoise(i, 41) * state.h * 0.88;
    if (!pointInPolygon(x, y, state.cliff)) continue;
    ctx.fillStyle = `rgba(${70 + randNoise(i, 3) * 90}, ${48 + randNoise(i, 5) * 70}, ${35}, ${0.14 + randNoise(i, 7) * 0.18})`;
    ctx.fillRect(x, y, 2 + randNoise(i, 9) * 18, 1 + randNoise(i, 11) * 4);
  }
  ctx.restore();
}

function randNoise(i, salt) {
  const v = Math.sin((i + 1) * 127.1 + salt * 311.7 + state.seed) * 43758.5453;
  return v - Math.floor(v);
}

function drawRockAttributes() {
  ctx.save();
  ctx.beginPath();
  state.cliff.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  const stripeH = Math.max(42, state.h * 0.08);
  for (let y = 0; y < state.h * 0.9; y += stripeH) {
    const stripe = Math.floor(y / stripeH) % 5;
    if (stripe === 1) {
      ctx.fillStyle = "rgba(255, 221, 64, 0.08)";
      ctx.fillRect(state.w * 0.48, y, state.w * 0.45, stripeH * 0.8);
    } else if (stripe === 3) {
      ctx.fillStyle = "rgba(88, 177, 205, 0.09)";
      ctx.fillRect(state.w * 0.08, y, state.w * 0.54, stripeH * 0.8);
    }
  }
  ctx.restore();
}

function drawCannon() {
  const c = cannon();
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(-state.angle + Math.PI / 2);
  const barrel = ctx.createLinearGradient(-30, -110, 30, 30);
  barrel.addColorStop(0, "#9b7a5c");
  barrel.addColorStop(0.45, "#2a2019");
  barrel.addColorStop(1, "#b37c54");
  ctx.fillStyle = barrel;
  roundRect(ctx, -34, -124, 68, 138, 28);
  ctx.fill();
  ctx.fillStyle = "#090807";
  ctx.beginPath();
  ctx.ellipse(0, -113, 28, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#2a1a11";
  roundRect(ctx, c.x - 66, c.y + 8, 132, 32, 14);
  ctx.fill();
  ctx.fillStyle = "#17100c";
  ctx.beginPath();
  ctx.arc(c.x - 52, c.y + 32, 24, 0, Math.PI * 2);
  ctx.arc(c.x + 52, c.y + 32, 24, 0, Math.PI * 2);
  ctx.fill();
}

function drawAim() {
  if (state.projectile || state.gameOver) return;
  const c = cannon();
  ctx.save();
  ctx.strokeStyle = "rgba(255, 224, 36, 0.85)";
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 8]);
  ctx.beginPath();
  ctx.arc(c.x, c.y - 34, 134, Math.PI * 1.04, Math.PI * 1.96);
  ctx.stroke();
  ctx.setLineDash([]);
  const endX = c.x + Math.cos(state.angle) * 108;
  const endY = c.y - Math.sin(state.angle) * 108;
  ctx.fillStyle = "#ffdf24";
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(c.x + (endX - c.x) * i / 3, c.y + (endY - c.y) * i / 3 - 32, 10 + i * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = "900 28px system-ui";
  ctx.fillText("角度", c.x + 45, c.y - 132);
  ctx.font = "900 40px system-ui";
  ctx.fillText(`${Math.round((state.angle * 180) / Math.PI)}°`, c.x + 45, c.y - 92);
  ctx.restore();
}

function drawGoat(context, x, y, goat, rot, scale = 1) {
  if (goatImageReady) {
    drawGoatBitmap(context, x, y, goat, rot, scale);
    return;
  }

  context.save();
  context.translate(x, y);
  context.rotate(rot);
  context.scale(scale, scale);
  const bodyColor = goat.rare === "gold" ? "#d7a522" : goat.rare === "rare" ? "#5b2c91" : "#5a3928";
  const hairColor = goat.rare === "gold" ? "#ffe07b" : goat.rare === "rare" ? "#b990ff" : "#2d1f18";
  context.shadowColor = "rgba(0,0,0,0.35)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 9;

  context.fillStyle = bodyColor;
  context.beginPath();
  context.ellipse(0, 0, goat.w / 2, goat.h / 2, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = hairColor;
  for (let i = 0; i < 8; i++) {
    const px = -goat.w * 0.34 + i * goat.w * 0.095;
    context.beginPath();
    context.ellipse(px, Math.sin(goat.pose + i) * 3, goat.w * 0.09, goat.h * 0.28, 0.4, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#efe9dc";
  context.beginPath();
  context.ellipse(goat.w * 0.48, -goat.h * 0.12, goat.w * 0.18, goat.h * 0.3, -0.35, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#24170f";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(goat.w * 0.52, -goat.h * 0.36);
  context.lineTo(goat.w * 0.68, -goat.h * 0.55);
  context.moveTo(goat.w * 0.43, -goat.h * 0.35);
  context.lineTo(goat.w * 0.46, -goat.h * 0.58);
  context.stroke();

  context.strokeStyle = "#2a1a12";
  context.lineWidth = Math.max(3, goat.w * 0.055);
  for (const lx of [-0.28, -0.05, 0.2, 0.38]) {
    context.beginPath();
    context.moveTo(goat.w * lx, goat.h * 0.3);
    context.lineTo(goat.w * (lx + 0.02), goat.h * 0.62);
    context.stroke();
    context.fillStyle = "#f3eee1";
    context.fillRect(goat.w * (lx - 0.03), goat.h * 0.55, goat.w * 0.09, goat.h * 0.08);
  }

  context.strokeStyle = "#2a1a12";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-goat.w * 0.48, -goat.h * 0.03);
  context.quadraticCurveTo(-goat.w * 0.65, -goat.h * 0.16, -goat.w * 0.58, -goat.h * 0.26);
  context.stroke();

  context.shadowColor = "transparent";
  context.fillStyle = "#19120d";
  context.beginPath();
  context.arc(goat.w * 0.55, -goat.h * 0.18, 2.2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawGoatBitmap(context, x, y, goat, rot, scale = 1) {
  const displayW = goat.w * 1.8;
  const displayH = goat.h * 2.55;
  const source = goatSprite || goatImage;

  context.save();
  context.translate(x, y);
  context.rotate(rot);
  context.scale(scale, scale);
  context.shadowColor = "rgba(0,0,0,0.38)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 9;

  if (goat.rare === "gold" || goat.rare === "rare") {
    context.save();
    context.globalAlpha = goat.rare === "gold" ? 0.38 : 0.32;
    context.fillStyle = goat.rare === "gold" ? "#ffd847" : "#9a63ff";
    context.beginPath();
    context.ellipse(0, 0, displayW * 0.52, displayH * 0.45, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  context.drawImage(
    source,
    0,
    0,
    source.width,
    source.height,
    -displayW / 2,
    -displayH / 2,
    displayW,
    displayH,
  );
  context.restore();
}

function drawMessage() {
  if (state.messageTimer <= 0 || !state.message) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.messageTimer);
  ctx.font = `900 ${Math.max(20, Math.min(36, state.w * 0.028))}px system-ui`;
  ctx.textAlign = "center";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.fillStyle = "#ffe349";
  ctx.strokeText(state.message, state.w / 2, state.h * 0.18);
  ctx.fillText(state.message, state.w / 2, state.h * 0.18);
  ctx.restore();
}

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function loop(ts) {
  const dt = Math.min(0.033, (ts - state.lastTime) / 1000 || 0);
  state.lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function exportImage() {
  draw();
  const rank = rankFor(state.coverage);
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  roundRect(ctx, 26, 26, Math.min(520, state.w - 52), 150, 8);
  ctx.fill();
  ctx.fillStyle = "#ffe349";
  ctx.font = "900 42px system-ui";
  ctx.fillText(`崖埋め率 ${state.coverage.toFixed(1)}%`, 54, 82);
  ctx.fillStyle = "#fff";
  ctx.font = "800 26px system-ui";
  ctx.fillText(`ランク ${rank}   スコア ${state.score.toLocaleString()}   配置 ${state.goats.length}/${TOTAL_GOATS}`, 54, 130);
  ctx.fillText("全国132位", 54, 164);
  ctx.restore();

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "cliff-goat-result.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: "崖ヤギ", text: `崖埋め率 ${state.coverage.toFixed(1)}%`, files: [file] });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cliff-goat-result.png";
      a.click();
      URL.revokeObjectURL(url);
    }
  }, "image/png");
}

window.addEventListener("resize", resize);
canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  startCharge();
});
canvas.addEventListener("pointerup", (event) => {
  event.preventDefault();
  fire();
});
canvas.addEventListener("pointercancel", fire);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (!state.charging) startCharge();
  }
});
window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    fire();
  }
});

els.retryButton.addEventListener("click", reset);
els.shareButton.addEventListener("click", exportImage);
els.menuButton.addEventListener("click", () => {
  state.message = "長押し / Space で発射";
  state.messageTimer = 1.6;
});

resize();
reset();
loadGoatImage();
requestAnimationFrame(loop);
