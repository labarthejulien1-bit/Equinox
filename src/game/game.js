// Règles du jeu : l'état d'un niveau et la façon dont il évolue.
//
// Principe « systémique » : aucun enchaînement n'est écrit à l'avance.
// Chaque élément ne réagit qu'à ce qu'il reçoit :
//   lumière sur la glace  → la glace fond
//   glace fondue          → l'eau coule
//   eau sur la roue       → la porte s'ouvre
//   lumière sur le cristal→ le temple s'allume
//
// Ce fichier ne dessine rien (voir render.js) : on peut le tester avec Node.

import { rad, clamp, smooth, pointInPolygon } from '../engine/vec.js';
import { visibilityPolygon, traceBeams, polygonSegments, mirrorGeometry } from '../engine/light.js';

export const SLICES = 12; // finesse des faisceaux (tranches par miroir)

// Profondeur (en unités monde) à laquelle la lumière « mord » dans chaque
// matière : c'est le liseré clair qu'on voit sur les surfaces éclairées.
const BITE = { rock: 14, cloud: 12, ice: 12, house: 7, door: 2.5 };
const biteOf = (owner) => BITE[owner] || 0;

/** Crée l'état de départ d'un niveau. */
export function createGame(level) {
  return {
    level,
    time: 0,
    started: false, // devient vrai quand le joueur quitte l'écran titre
    sunAngle: rad(level.sun.start),
    cloudX: level.cloud.startX,
    cloudShape: makeCloudShape(level.cloud.w, level.cloud.h),
    mirrors: level.mirrors.map((m) => ({ ...m, angle: rad(m.angle), free: !m.frozen, lit: false })),
    ice: { melt: 0, gone: false, heating: false },
    water: { fall: 0, river: 0 },
    wheel: { angle: 0, speed: 0 },
    door: { open: 0 },
    temple: { charge: 0, lit: false, glow: 0 },
    win: { t: 0 },
    thaw: 0, // 0 = ère glaciaire, 1 = monde dégelé
    touched: { sun: false, cloud: false, mirror: false },
    particles: [],
    events: [], // messages pour l'interface : 'ice-gone', 'door-open', 'temple-lit'
    light: null, // résultat du dernier calcul de lumière
  };
}

// ───────────────────────────── Géométrie ─────────────────────────────

export function sunPosition(g) {
  const s = g.level.sun;
  return { x: s.cx + s.rx * Math.cos(g.sunAngle), y: s.cy - s.ry * Math.sin(g.sunAngle) };
}

/** Forme du nuage : quelques cercles + leur contour (pour bloquer la lumière). */
function makeCloudShape(w, h) {
  const bottom = h * 0.5;
  const circles = [
    { x: -w * 0.4, y: h * 0.22, r: h * 0.28 },
    { x: -w * 0.24, y: h * 0.06, r: h * 0.42 },
    { x: -w * 0.02, y: -h * 0.1, r: h * 0.54 },
    { x: w * 0.22, y: h * 0.04, r: h * 0.44 },
    { x: w * 0.4, y: h * 0.2, r: h * 0.3 },
  ];
  const outline = [];
  for (const c of circles) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const p = { x: c.x + Math.cos(a) * c.r, y: c.y + Math.sin(a) * c.r };
      if (p.y > bottom) continue;
      if (circles.some((o) => o !== c && Math.hypot(p.x - o.x, p.y - o.y) < o.r - 0.01)) continue;
      outline.push(p);
    }
  }
  outline.push({ x: circles[0].x, y: bottom }, { x: circles[4].x, y: bottom });
  const cy = h * 0.25;
  outline.sort((p, q) => Math.atan2(p.y - cy, p.x) - Math.atan2(q.y - cy, q.x));
  return { circles, outline, bottom };
}

export function cloudPolygon(g) {
  const { y } = g.level.cloud;
  return g.cloudShape.outline.map((p) => ({ x: p.x + g.cloudX, y: p.y + y }));
}

export function housePolygon(h) {
  const l = h.x - h.w / 2;
  const r = h.x + h.w / 2;
  return [
    { x: l, y: h.baseY },
    { x: l, y: h.baseY - h.h },
    { x: h.x, y: h.baseY - h.h - h.roof },
    { x: r, y: h.baseY - h.h },
    { x: r, y: h.baseY },
  ];
}

/** La porte descend dans le sol quand elle s'ouvre. */
export function doorPolygon(g) {
  const d = g.level.door;
  const top = d.top + (d.bottom - d.top) * smooth(g.door.open);
  return [
    { x: d.x - d.w / 2, y: top },
    { x: d.x + d.w / 2, y: top },
    { x: d.x + d.w / 2, y: d.bottom },
    { x: d.x - d.w / 2, y: d.bottom },
  ];
}

export function crystalPolygon(level) {
  const c = level.temple.crystal;
  return [
    { x: c.x, y: c.y - c.r * 1.15 },
    { x: c.x + c.r * 0.9, y: c.y },
    { x: c.x, y: c.y + c.r * 1.15 },
    { x: c.x - c.r * 0.9, y: c.y },
  ];
}

/** Tous les bords qui arrêtent la lumière, à cet instant. */
export function buildSegments(g) {
  const L = g.level;
  const segs = [];
  polygonSegments(L.ground, 'rock', segs);
  polygonSegments(cloudPolygon(g), 'cloud', segs);
  for (const h of L.houses) polygonSegments(housePolygon(h), 'house', segs);
  if (!g.ice.gone) polygonSegments(L.ice.points, 'ice', segs);
  if (g.door.open < 0.97) polygonSegments(doorPolygon(g), 'door', segs);
  polygonSegments(crystalPolygon(L), 'crystal', segs);
  for (const m of g.mirrors) {
    if (!m.free) continue;
    const geo = mirrorGeometry(m);
    segs.push({ a: geo.a, b: geo.b, owner: m });
  }
  // Un grand cadre autour du monde : chaque rayon finit par toucher quelque chose.
  polygonSegments(
    [
      { x: -2000, y: -2000 },
      { x: 2400, y: -2000 },
      { x: 2400, y: 2600 },
      { x: -2000, y: 2600 },
    ],
    'bounds',
    segs,
  );
  return segs;
}

// ───────────────────────────── Lumière ─────────────────────────────

/** Calcule où va la lumière : zone ensoleillée, faisceaux, lumières ponctuelles. */
export function computeLight(g) {
  const L = g.level;
  const segs = buildSegments(g);
  const sun = sunPosition(g);

  // Le soleil est-il caché derrière le relief ou dans le nuage ?
  const hidden = pointInPolygon(sun, L.ground) || pointInPolygon(sun, cloudPolygon(g));
  const vis = hidden ? null : visibilityPolygon(sun.x, sun.y, segs, biteOf);

  const active = g.mirrors.filter((m) => m.free);
  const beams = traceBeams(hidden ? null : sun, active, segs, SLICES, biteOf);
  for (const m of g.mirrors) m.lit = beams.some((b) => b.mirror === m);

  // Qui reçoit de la lumière ?
  let iceExposure = vis && vis.owners.has('ice') ? 0.5 : 0;
  let crystalLit = !!(vis && vis.owners.has('crystal'));
  for (const b of beams) {
    for (const s of b.slices) {
      if (!s.lit) continue;
      if (s.owner === 'ice') iceExposure += 1.6 / SLICES;
      if (s.owner === 'crystal') crystalLit = true;
    }
  }

  // Lumières ponctuelles : le temple allumé et les lanternes du village.
  const points = [];
  if (g.temple.glow > 0) {
    const c = L.temple.crystal;
    const noCrystal = segs.filter((s) => s.owner !== 'crystal');
    points.push({ x: c.x, y: c.y, r: 190 * g.temple.glow, pts: visibilityPolygon(c.x, c.y, noCrystal, biteOf).points });
    const k = smooth((g.win.t - 2.4) / 1.6);
    if (k > 0) {
      for (const l of L.lanterns) {
        points.push({ x: l.x, y: l.y, r: 52 * k, pts: visibilityPolygon(l.x, l.y, segs, biteOf).points });
      }
    }
  }

  return { sun, sunHidden: hidden, sunPoly: vis ? vis.points : null, beams, points, iceExposure, crystalLit };
}

/**
 * Aide à la visée : quand le joueur lâche un miroir tout près d'une cible
 * (glace, autre miroir, cristal), on corrige l'angle de quelques degrés.
 * Sur un écran tactile, viser au degré près serait frustrant.
 */
export function settleMirror(g, mirror) {
  const score = () => {
    const l = computeLight(g);
    return g.mirrors.filter((m) => m.lit).length + (l.iceExposure > 0 ? 1 : 0) + (l.crystalLit ? 2 : 0);
  };
  const base = mirror.angle;
  const current = score();
  const step = rad(0.5);
  const results = [];
  for (let i = -8; i <= 8; i++) {
    mirror.angle = base + i * step;
    results.push({ i, s: score() });
  }
  const best = Math.max(...results.map((r) => r.s));
  mirror.angle = base;
  if (best <= current) return;
  // Parmi les angles gagnants, on prend le milieu de la plage la plus proche.
  const wins = results.filter((r) => r.s === best).map((r) => r.i);
  const nearest = wins.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a));
  let lo = nearest;
  let hi = nearest;
  while (wins.includes(lo - 1)) lo--;
  while (wins.includes(hi + 1)) hi++;
  mirror.angle = base + ((lo + hi) / 2) * step;
}

// ───────────────────────────── Évolution ─────────────────────────────

/** Fait avancer le monde de dt secondes. */
export function update(g, dt) {
  const L = g.level;
  g.time += dt;
  const light = (g.light = computeLight(g));

  // Glace : la lumière la fait fondre.
  if (!g.ice.gone) {
    const e = Math.min(1.5, light.iceExposure);
    g.ice.heating = e > 0;
    if (e > 0) {
      g.ice.melt += (dt * e) / L.ice.meltTime;
      if (Math.random() < dt * 14) spawnDrip(g);
    }
    if (g.ice.melt >= 1) {
      g.ice.melt = 1;
      g.ice.gone = true;
      g.ice.heating = false;
      for (const m of g.mirrors) m.free = true; // le miroir prisonnier est libéré
      for (let i = 0; i < 26; i++) spawnDrip(g, true);
      g.events.push('ice-gone');
    }
  }

  // Eau : la glace fondue libère le torrent, qui tombe puis suit la vallée.
  if (g.ice.gone) {
    if (g.water.fall < 1) g.water.fall = Math.min(1, g.water.fall + dt / 1.3);
    else if (g.water.river < 1) g.water.river = Math.min(1, g.water.river + dt / 2.0);
  }

  // Roue et porte : l'eau fait tourner la roue, la roue ouvre la porte.
  const flowing = g.water.river >= 1;
  g.wheel.speed += ((flowing ? 2.4 : 0) - g.wheel.speed) * Math.min(1, dt * 2);
  g.wheel.angle += g.wheel.speed * dt;
  if (flowing && g.door.open < 1) {
    g.door.open = Math.min(1, g.door.open + dt / 2.8);
    if (g.door.open >= 1) g.events.push('door-open');
  }

  // Temple : le cristal se charge tant qu'il reçoit de la lumière.
  if (!g.temple.lit) {
    g.temple.charge = clamp(g.temple.charge + (light.crystalLit ? dt / 1.4 : -dt / 0.9), 0, 1);
    if (g.temple.charge >= 1) {
      g.temple.lit = true;
      g.events.push('temple-lit');
      const c = L.temple.crystal;
      for (let i = 0; i < 40; i++) spawnSpark(g, c.x, c.y, 30 + Math.random() * 70);
    }
  } else {
    g.win.t += dt;
    g.temple.glow = smooth(g.win.t / 2.2);
    g.thaw = smooth((g.win.t - 1.5) / 7);
    if (Math.random() < dt * 5) {
      const c = L.temple.crystal;
      spawnSpark(g, c.x, c.y, 8 + Math.random() * 14);
    }
  }

  updateParticles(g, dt);
}

// ───────────────────────────── Particules ─────────────────────────────

function spawnDrip(g, burst = false) {
  const pts = g.level.ice.points;
  const p = pts[Math.floor(Math.random() * pts.length)];
  g.particles.push({
    type: 'drip',
    x: 112 + Math.random() * 50,
    y: Math.max(p.y, 345) + Math.random() * 8,
    vx: burst ? (Math.random() - 0.5) * 40 : 0,
    vy: burst ? -Math.random() * 30 : 0,
    life: 0,
    max: 1.6,
  });
}

function spawnSpark(g, x, y, speed) {
  const a = Math.random() * Math.PI * 2;
  g.particles.push({
    type: 'spark',
    x,
    y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed - 10,
    life: 0,
    max: 0.8 + Math.random() * 1.2,
  });
}

function updateParticles(g, dt) {
  for (const p of g.particles) {
    p.life += dt;
    if (p.type === 'drip') p.vy += 260 * dt;
    else {
      p.vx *= 1 - dt * 1.5;
      p.vy *= 1 - dt * 1.5;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  g.particles = g.particles.filter((p) => p.life < p.max && p.y < 660);
}
