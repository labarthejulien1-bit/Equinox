// La vie du monde : animaux, vent, petit peuple, oiseaux, fleurs…
//
// Rien de tout cela ne change l'énigme : ce fichier ne fait que REGARDER le
// jeu (où tombe la lumière, où passe l'ombre, ce que fait le joueur) et
// faire réagir ce qui vit. Il ne touche pas au navigateur ; le dessin est
// dans lifeDraw.js et decor.js, le son dans engine/audio.js.
//
// Chaque animal suit une petite règle, toujours la même :
//   - le bouquetin cherche le soleil, s'y couche, et se lève quand l'ombre vient ;
//   - les marmottes sortent au soleil ; la sentinelle siffle quand une ombre passe ;
//   - le lièvre détale quand le reflet d'un miroir le touche ;
//   - le rapace plane le jour et se pose quand le soleil disparaît ;
//   - la chouette ne vient que la nuit ;
//   - les fleurs s'ouvrent à la lumière.

import { clamp, lerp, smooth, pointInPolygon, dist } from '../engine/vec.js';
import { isBlocked, castRay, polygonSegments } from '../engine/light.js';
import { sunPosition, streamWet, walkerPosition, hutSize } from './game.js';

const rnd = (a, b) => a + Math.random() * (b - a);
/** Fait glisser v vers `target`, de `rate` par seconde au plus. */
const approach = (v, target, rate, dt) => (v < target ? Math.min(target, v + rate * dt) : Math.max(target, v - rate * dt));

// ───────────────────────────── Lumière et relief ─────────────────────────────

/** Ce point voit-il le soleil ? */
export function sunAt(g, x, y) {
  const l = g.light;
  return !l.sunHidden && l.intensity > 0.25 && !isBlocked(l.sun.x, l.sun.y, x, y, l.segs);
}

/** Ce point est-il dans le reflet d'un miroir ? */
export function beamAt(g, x, y) {
  const p = { x, y };
  return g.light.beamPolys.some((poly) => pointInPolygon(p, poly)) || g.light.lampPolys.some((poly) => pointInPolygon(p, poly));
}

/** Force du vent à cet endroit : une brise légère, plus la rafale qui passe. */
export function windAt(life, x) {
  if (!life) return 0.12;
  const w = life.wind;
  if (w.front === null) return 0.12;
  const k = (x - w.front) / 80;
  return 0.12 + Math.exp(-k * k);
}

/** Hauteur du sol sous un point (on lance un rayon vers le bas). */
function groundBelow(life, x, y) {
  const h = castRay(x, y - 14, 0, 1, life.groundSegs);
  return h.seg ? y - 14 + h.t : y;
}

/** Ramène l'angle d'une pente à celui qu'elle a quand on la suit vers la droite. */
const rightward = (a) => (Math.cos(a) < 0 ? Math.atan2(-Math.sin(a), -Math.cos(a)) : a);

/** Un chemin : points [x, y] (ajouter 'hop' pour un tronçon sauté, 'rest' pour un lieu de repos). */
function makePath(points) {
  const pts = points.map(([x, y, ...flags]) => ({ x, y, hop: flags.includes('hop'), rest: flags.includes('rest') }));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, total: cum[cum.length - 1] };
}

/** Le point du chemin à la distance d : { x, y, slope, hop, u }. */
function pathAt(path, d) {
  const { pts, cum } = path;
  let i = 1;
  while (i < pts.length - 1 && cum[i] < d) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const u = clamp((d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1), 0, 1);
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), slope: Math.atan2(b.y - a.y, b.x - a.x), hop: b.hop, u };
}

// ───────────────────────────── Création ─────────────────────────────

/** Prépare la vie d'un niveau. À appeler une fois, juste après createGame(). */
export function createLife(g) {
  const L = g.level;
  const sun = sunPosition(g);
  const night = pointInPolygon(sun, L.ground) ? 1 : 0;
  const life = {
    night, // 1 quand le soleil est derrière le relief
    revive: 0, // monte à 1 quand le sanctuaire s'est rallumé
    wind: { front: null, next: rnd(4, 7), level: 0, drift: 0, lines: [] },
    groundSegs: polygonSegments(L.ground, 'rock'),
    critters: [],
    byDecor: new Map(), // décor du niveau → son animal
    folk: [],
    prints: [], // empreintes dans la neige
    bits: [], // neige soufflée, embruns, flocons secoués
    motes: [], // poussières dans les faisceaux
    blooms: [], // fleurs qui poussent quand le monde revient à la vie
    waters: [], // poissons et ronds dans l'eau, un par bassin
    sky: { star: null, starIn: rnd(3, 6), flock: null, flockIn: rnd(9, 14) },
    focus: null, // ce que les villageois regardent
    focusT: 0,
    crests: [],
    snowPts: [],
  };

  // Crêtes enneigées (d'où le vent arrache la neige) et points de neige.
  for (const [from, to] of L.snow || []) {
    for (let i = from; i <= to; i++) {
      const p = L.ground[i];
      if (p.x < -10 || p.x > L.size.w + 10) continue;
      const a = L.ground[i - 1];
      const b = L.ground[i + 1];
      if (i > from && i < to && a && b && p.y < a.y - 2 && p.y < b.y - 2) life.crests.push(p);
      if (i === to) continue;
      const n = L.ground[i + 1];
      const len = Math.hypot(n.x - p.x, n.y - p.y);
      for (let d = 0; d < len; d += 7) {
        const x = lerp(p.x, n.x, d / len);
        if (x > -5 && x < L.size.w + 5) life.snowPts.push({ x, y: lerp(p.y, n.y, d / len) });
      }
    }
  }

  for (const d of L.decor || []) {
    const k = makeCritter(d, g, life);
    if (!k) continue;
    life.critters.push(k);
    life.byDecor.set(d, k);
  }

  // Le petit peuple : chacun a sa place, et sa hutte s'il y en a une sur sa terrasse.
  (L.villagers || []).forEach((p, i) => {
    let hut = null;
    for (const h of L.houses || []) {
      if (Math.abs(h.baseY - p.y) > 14 || Math.abs(h.x - p.x) > 110) continue;
      // Le chemin jusqu'à la hutte doit être de plain-pied : ni ravin, ni mur.
      let flat = true;
      for (let u = 0; u <= 1; u += 0.05) {
        const x = lerp(p.x, h.x, u);
        const y = lerp(p.y, h.baseY, u);
        if (Math.abs(groundBelow(life, x, y) - y) > 7) flat = false;
      }
      if (flat && (!hut || Math.abs(h.x - p.x) < Math.abs(hut.x - p.x))) hut = h;
    }
    const inside = !!hut && night === 1 && !L.nightWatch;
    life.folk.push({
      p,
      i,
      hut,
      x: inside ? hut.x : p.x,
      y: inside ? hut.baseY : p.y,
      dir: p.dir,
      vis: inside ? 0 : 1, // 0 = dans sa hutte
      target: 'post',
      delay: 0,
      moving: false,
      walked: 0,
      postSun: 0,
      postShade: 0,
      sunlit: false,
      crouch: 0,
      stretch: 0,
      nextStretch: rnd(4, 10),
      sink: p.y - groundBelow(life, p.x, p.y), // de combien ses pieds s'enfoncent dans la neige
      lookY: 0,
      cheer: 0,
      tap: false,
      hop: 0,
    });
  });
  // Près du feu, chacun a sa place : on les range de part et d'autre de la porte.
  for (const h of L.houses || []) {
    const mine = life.folk.filter((f) => f.hut === h);
    const { half } = hutSize(h);
    for (const side of [-1, 1]) {
      mine
        .filter((f) => (f.p.x < h.x ? -1 : 1) === side)
        .sort((a, b) => Math.abs(a.p.x - h.x) - Math.abs(b.p.x - h.x))
        .forEach((f, slot) => {
          f.fireX = h.x + side * (half * 0.42 + 4 + slot * 6.5);
        });
    }
  }

  // Les fleurs du dégel : le long de l'eau, et là où le niveau le demande.
  const lines = [];
  for (const s of L.streams || []) for (const part of s.parts) if (part.run) lines.push(part.run);
  for (const line of L.blooms || []) lines.push(line);
  for (const line of lines) {
    const path = makePath(line);
    for (let d = 3; d < path.total - 2 && life.blooms.length < 48; d += rnd(6, 9)) {
      const p = pathAt(path, d);
      life.blooms.push({ x: p.x, y: p.y + 1, h: rnd(4, 7), color: life.blooms.length % 3, delay: life.blooms.length * 0.16 + rnd(0, 0.5), grow: 0 });
    }
  }

  life.waters = (g.basins || []).map((b) => ({ b, fishIn: rnd(5, 10), ringIn: rnd(2, 5), jump: null, rings: [] }));
  g.life = life;
  return life;
}

/** L'animal (ou la plante) derrière un décor du niveau, s'il en a un. */
function makeCritter(d, g, life) {
  const k = { d, type: d.type, x: d.x, y: d.y, dir: d.dir ?? 1, s: d.s ?? 1, sun: false, beam: false, state: '', t: 0, tap: false };
  switch (d.type) {
    case 'ibex': {
      k.path = d.path ? makePath(d.path) : null;
      k.dist = 0; // distance parcourue sur son chemin
      if (k.path) {
        // Il part du point de son chemin le plus proche de sa place.
        let best = Infinity;
        k.path.pts.forEach((p, i) => {
          const dd = Math.hypot(p.x - d.x, p.y - d.y);
          if (dd < best) {
            best = dd;
            k.dist = k.path.cum[i];
          }
        });
      }
      k.goal = null;
      k.lie = 0;
      k.slope = 0;
      k.step = 0;
      k.printAt = 0;
      k.rest = rnd(10, 18);
      k.state = life.night ? 'sleep' : 'stand';
      if (life.night) k.lie = 1;
      return k;
    }
    case 'marmots':
      k.out = 0;
      k.out2 = 0;
      k.sunT = 0;
      k.calm = 0;
      k.nextRun = rnd(8, 14);
      k.at = 0; // 0 = la seconde marmotte est à son terrier, 1 = à l'autre
      k.run = null;
      k.whistle = 0;
      k.wasSun = false;
      k.wasBeam = false;
      k.home2 = { x: d.x + 17 * k.s * k.dir, y: d.y };
      k.x2 = k.home2.x;
      k.y2 = k.home2.y;
      k.state = 'in';
      return k;
    case 'hare': {
      const r = d.range || [
        [d.x, d.y],
        [d.x, d.y],
      ];
      k.range = { x0: r[0][0], y0: r[0][1], x1: r[1][0], y1: r[1][1] };
      const dx = k.range.x1 - k.range.x0;
      const dy = k.range.y1 - k.range.y0;
      k.len = Math.hypot(dx, dy);
      k.u = k.len ? clamp(((d.x - k.range.x0) * dx + (d.y - k.range.y0) * dy) / (k.len * k.len), 0, 1) : 0;
      k.home = k.u;
      k.slope = k.len ? rightward(Math.atan2(dy, dx)) : 0;
      k.hops = 0;
      k.hop = null; // bond en cours : { from, to, t, dur }
      k.lift = 0;
      k.cross = rnd(18, 30);
      k.state = life.night ? 'sleep' : 'graze';
      return k;
    }
    case 'raptor':
      k.a = d.x; // où il en est de sa ronde
      k.u = 0;
      k.from = null;
      k.flap = 0;
      k.loop = 0;
      k.shadow = null;
      k.state = d.perch && life.night ? 'perch' : 'soar';
      if (k.state === 'perch') [k.x, k.y] = d.perch;
      return k;
    case 'owl':
      k.u = 0;
      k.hootIn = 1.6;
      k.blink = 0;
      k.state = life.night ? 'perch' : 'away';
      return k;
    case 'eyes':
      k.shut = 0;
      return k;
    case 'flowers':
    case 'bush':
      k.open = 0;
      return k;
    default:
      return null; // cairns, fanions, ponts : rien à animer ici
  }
}

// ───────────────────────────── Évolution ─────────────────────────────

/** Fait vivre le monde pendant dt secondes. À appeler après update(g, dt). */
export function updateLife(g, dt) {
  const life = g.life;
  const L = g.level;
  const light = g.light;
  if (!life || !light) return;

  // La nuit : le soleil est passé derrière le relief (un nuage ne suffit pas).
  const behind = pointInPolygon(light.sun, L.ground);
  life.night = approach(life.night, behind ? 1 : 0, behind ? 0.5 : 0.9, dt);
  life.revive = g.temple.lit ? smooth((g.win.t - 2) / 3) : 0;

  updateWind(g, life, dt);

  // Ce que chacun reçoit : soleil, reflet.
  for (const k of life.critters) {
    const h = k.type === 'raptor' ? 0 : 6 * k.s;
    k.sun = sunAt(g, k.x, k.y - h);
    // (le lièvre est craintif : un reflet qui passe juste au-dessus de lui suffit)
    const heights = k.type === 'hare' ? [3, 7, 11, 15] : [h, h * 2.2];
    k.beam = heights.some((up) => beamAt(g, k.x, k.y - up));
    k.t += dt;
    UPDATE[k.type](k, g, life, dt);
    k.tap = false;
  }

  updateFocus(g, life, dt);
  for (const f of life.folk) updateVillager(f, g, life, dt);

  // Les porteurs laissent des traces dans la neige.
  for (const w of g.walkers) {
    if (!w.moving) continue;
    if (w.printAt === undefined || Math.abs(w.d - w.printAt) > 5) {
      w.printAt = w.d;
      const p = walkerPosition(w);
      addPrint(life, p.x, p.y);
      g.events.push('step');
    }
  }

  // Empreintes : elles s'effacent lentement.
  for (const p of life.prints) p.age += dt;
  life.prints = life.prints.filter((p) => p.age < 24);

  updateBits(g, life, dt);
  updateMotes(g, life, dt);
  updateWaters(g, life, dt);
  updateSky(g, life, dt);

  // Les fleurs poussent une à une quand le sanctuaire s'est rallumé.
  if (g.temple.lit) {
    for (const b of life.blooms) {
      if (g.win.t < 2.6 + b.delay) continue;
      if (b.grow === 0) g.events.push('bloom');
      b.grow = Math.min(1, b.grow + dt / 1.3);
    }
  }
}

function addPrint(life, x, y) {
  life.prints.push({ x, y, age: 0 });
  if (life.prints.length > 180) life.prints.shift();
}

function addBit(life, bit) {
  if (life.bits.length < 260) life.bits.push({ life: 0, ...bit });
}

// ── Le vent ──

function updateWind(g, life, dt) {
  const w = life.wind;
  const W = g.level.size.w;
  w.next -= dt;
  if (w.front === null && w.next <= 0) {
    // Une rafale entre par la gauche et traverse l'écran.
    w.front = -110;
    w.next = rnd(10, 17);
    w.lines = [0, 1, 2].map(() => ({ y: rnd(110, 560), off: rnd(-70, 30), len: rnd(40, 70), wave: rnd(0, 6) }));
    g.events.push('gust');
  }
  if (w.front !== null) {
    const before = w.front;
    w.front += 150 * dt;
    // Elle arrache la neige des crêtes…
    for (const c of life.crests) {
      if (before < c.x && w.front >= c.x) {
        for (let i = 0; i < 16; i++) addBit(life, { type: 'snow', x: c.x + rnd(-2, 4), y: c.y + rnd(-1, 3), vx: rnd(50, 120), vy: rnd(-28, -4), max: rnd(0.7, 1.5), r: rnd(0.5, 1.1) });
      }
    }
    // … et soulève une poudrerie partout où elle passe.
    for (const p of life.snowPts) {
      if (Math.abs(p.x - w.front) < 45 && Math.random() < dt * 0.9) {
        addBit(life, { type: 'snow', x: p.x, y: p.y - 1, vx: rnd(40, 95), vy: rnd(-16, -2), max: rnd(0.5, 1.1), r: rnd(0.4, 0.9) });
      }
    }
    if (w.front > W + 130) w.front = null;
  }
  const inside = w.front !== null && w.front > -40 && w.front < W + 40;
  w.level = approach(w.level, inside ? 1 : 0, 0.9, dt);
  w.drift += dt * (3 + 70 * w.level);
}

// ── Les animaux ──

const UPDATE = {
  ibex: updateIbex,
  marmots: updateMarmots,
  hare: updateHare,
  raptor: updateRaptor,
  owl: updateOwl,
  eyes(k, g, life, dt) {
    k.shut = Math.max(0, k.shut - dt);
    if (k.tap) k.shut = 2.5;
  },
  flowers: updatePlant,
  bush: updatePlant,
};

function updatePlant(k, g, life, dt) {
  const want = k.sun || k.beam || life.revive > 0.3;
  k.open = approach(k.open, want ? 1 : 0, want ? 0.8 : 1.2, dt);
}

function setState(k, state) {
  k.state = state;
  k.t = 0;
}

/**
 * Le bouquetin cherche le soleil. Au soleil, sur un lieu de repos, il se
 * couche et rumine. Quand l'ombre arrive, il se lève, s'ébroue, et marche
 * jusqu'à un endroit ensoleillé de son chemin.
 */
function updateIbex(k, g, life, dt) {
  const lit = k.sun || k.beam;
  const asleep = life.night > 0.6 && !g.temple.lit;
  const path = k.path;
  const nodes = path ? path.pts.map((p, i) => ({ ...p, d: path.cum[i] })) : [];
  const here = nodes.find((n) => Math.abs(n.d - k.dist) < 0.5);
  const sunny = (n) => sunAt(g, n.x, n.y - 8 * k.s);
  // Le lieu de repos ensoleillé le plus proche (ou, à défaut, un point ensoleillé).
  const nearest = (list) => list.reduce((best, n) => (!best || Math.abs(n.d - k.dist) < Math.abs(best.d - k.dist) ? n : best), null);
  const go = (n) => {
    k.goal = n.d;
    setState(k, 'walk');
  };
  const shake = () => {
    setState(k, 'shake');
    g.events.push('snort');
    for (let i = 0; i < 9; i++) addBit(life, { type: 'snow', x: k.x + rnd(-7, 7) * k.s, y: k.y - rnd(8, 16) * k.s, vx: rnd(-22, 22), vy: rnd(-26, -6), max: rnd(0.4, 0.8), r: rnd(0.4, 0.8), fall: 90 });
  };

  if (k.tap && k.state !== 'walk' && k.state !== 'shake') shake();

  if (k.state === 'sleep') {
    if (!asleep) shake();
  } else if (k.state === 'shake') {
    if (k.t > 0.8) setState(k, 'stand');
  } else if (k.state === 'lie') {
    if (asleep) setState(k, 'sleep');
    else if (g.temple.lit || (!lit && k.t > 0.7)) shake(); // l'ombre arrive : debout !
    else if (path && k.t > k.rest) {
      // De temps en temps, il change de place.
      const others = nodes.filter((n) => n !== here && sunny(n));
      if (others.length) go(others[Math.floor(Math.random() * others.length)]);
      k.rest = rnd(12, 22);
      k.t = 0;
    }
  } else if (k.state === 'stand') {
    if (asleep) setState(k, 'sleep');
    else if (g.temple.lit) {
      // Le monde revient à la vie : il descend voir, au bout de son chemin.
      const gather = nodes[k.d.gather ?? nodes.length - 1];
      if (gather && Math.abs(gather.d - k.dist) > 0.5 && life.revive > 0.2) go(gather);
    } else if (k.t > 1.3) {
      const rests = nodes.filter((n) => n.rest && sunny(n));
      if (lit && (!path || (here && here.rest))) setState(k, 'lie');
      else if (rests.length) go(nearest(rests));
      else if (!lit) {
        const any = nodes.filter(sunny);
        if (any.length) go(nearest(any));
      }
      if (k.state === 'stand') k.t = 0.4; // rien de mieux à faire : il attend un peu
    }
  } else if (k.state === 'walk') {
    const p0 = pathAt(path, k.dist);
    const speed = p0.hop ? 46 : 11;
    const before = k.dist;
    k.dist = approach(k.dist, k.goal, speed, dt);
    const ahead = pathAt(path, k.dist + (k.goal >= before ? 1 : -1));
    if (Math.abs(ahead.x - p0.x) > 0.01) k.dir = ahead.x > p0.x ? 1 : -1;
    k.step += dt * 9;
    if (!p0.hop && Math.abs(k.dist - k.printAt) > 5) {
      k.printAt = k.dist;
      addPrint(life, k.x, k.y);
    }
    if (Math.abs(k.dist - k.goal) < 0.01) {
      k.goal = null;
      setState(k, 'stand');
      k.t = 0.7;
    }
  }

  // Où il se trouve, et la pente sous ses sabots.
  if (path) {
    const p = pathAt(path, k.dist);
    k.x = p.x;
    k.y = p.y - (p.hop && k.state === 'walk' ? Math.sin(Math.PI * p.u) * 10 : 0);
    k.slope = p.hop && k.state === 'walk' ? 0 : rightward(p.slope);
  }
  const down = k.state === 'lie' || k.state === 'sleep';
  k.lie = approach(k.lie, down ? 1 : 0, 1.8, dt);
}

/**
 * Les marmottes sortent quand le soleil chauffe leur terrier. Si une ombre
 * passe (nuage, rapace), si un reflet les touche ou si on les dérange, la
 * sentinelle se dresse et siffle ; l'autre plonge dans son trou.
 */
function updateMarmots(k, g, life, dt) {
  const want = (k.sun && life.night < 0.5) || life.revive > 0.3;
  k.sunT = want ? k.sunT + dt : 0;
  const bird = life.critters.find((c) => c.type === 'raptor' && c.shadow);
  const birdNear = bird && Math.hypot(bird.shadow.x - k.x, bird.shadow.y - k.y) < 16;
  const scare = k.tap || (k.beam && !k.wasBeam) || (k.wasSun && !k.sun) || (birdNear && !k.wasBird);
  k.wasSun = k.sun;
  k.wasBeam = k.beam;
  k.wasBird = birdNear;
  k.whistle = Math.max(0, k.whistle - dt);

  if (k.state === 'in') {
    if (k.sunT > 1) setState(k, 'peek');
    else if (k.tap) setState(k, 'peek'); // on frappe à la porte : un museau pointe
  } else if (k.state === 'peek') {
    if (k.t > 1.3) setState(k, want ? 'out' : 'in');
  } else if (k.state === 'out') {
    k.calm += dt;
    if (scare) {
      setState(k, 'alarm');
      k.calm = 0;
      k.whistle = 0.75;
      g.events.push('whistle');
    } else if (!want) setState(k, 'in');
    else if (k.d.to && !k.run && k.out2 >= 1 && k.calm > k.nextRun) {
      // La seconde marmotte court d'un terrier à l'autre.
      const other = { x: k.d.to[0], y: k.d.to[1] };
      k.run = k.at === 0 ? { from: k.home2, to: other, u: 0 } : { from: other, to: k.home2, u: 0 };
      k.nextRun = k.calm + rnd(11, 20);
    }
  } else if (k.state === 'alarm') {
    if (k.t > 1.2) setState(k, want ? 'out' : 'in');
  }

  const target = { in: 0, peek: 0.42, out: 1, alarm: 1 }[k.state];
  k.out = approach(k.out, target, k.state === 'in' ? 4 : 2.4, dt);
  if (k.run) {
    // Elle court (deux fois plus vite si l'alerte est donnée).
    const len = Math.hypot(k.run.to.x - k.run.from.x, k.run.to.y - k.run.from.y) || 1;
    const before = k.run.u;
    k.run.u = Math.min(1, k.run.u + ((k.state === 'alarm' ? 80 : 42) * dt) / len);
    k.x2 = lerp(k.run.from.x, k.run.to.x, k.run.u);
    k.y2 = lerp(k.run.from.y, k.run.to.y, k.run.u);
    k.dir2 = k.run.to.x > k.run.from.x ? 1 : -1;
    if (Math.floor(before * len / 5) !== Math.floor(k.run.u * len / 5)) addPrint(life, k.x2, k.y2);
    k.out2 = 1;
    if (k.run.u >= 1) {
      k.at = 1 - k.at;
      k.run = null;
    }
  } else {
    const out2 = k.state === 'out' && k.t > 0.8 ? 1 : 0;
    k.out2 = approach(k.out2, out2, out2 ? 2 : 6, dt);
  }
}

/**
 * Le lièvre broute. Si le reflet d'un miroir le touche (ou si on le
 * dérange), il s'enfuit en trois bonds, guette, puis revient.
 */
function updateHare(k, g, life, dt) {
  const asleep = life.night > 0.6 && !g.temple.lit;
  const r = k.range;
  // Lance une série de bonds vers la place `to` (entre 0 et 1 le long de sa pente).
  const bounds = (to, n, dur, then) => {
    k.hops = n;
    k.stepU = (to - k.u) / n;
    k.hopDur = dur;
    k.then = then;
    k.hop = null;
    setState(k, 'bound');
  };

  if (k.state === 'sleep') {
    if (!asleep) setState(k, 'alert');
    else if (k.tap) bounds(k.u, 1, 0.3, 'sleep');
  } else if (k.state === 'graze' || k.state === 'alert' || k.state === 'sit') {
    // Un reflet le fait fuir quand il broute ; une fois en alerte, il ne bouge
    // plus que si on le dérange (sinon il courrait sans fin sous un reflet fixe).
    const threat = k.state === 'graze' ? k.beam || k.tap : k.state === 'alert' && k.tap;
    const homeX = lerp(r.x0, r.x1, k.home);
    const homeY = lerp(r.y0, r.y1, k.home);
    const homeLit = [3, 7, 11, 15].some((up) => beamAt(g, homeX, homeY - up));
    if (k.tap && k.state === 'sit') bounds(k.u, 1, 0.3, 'sit');
    else if (threat) {
      // Il file vers le bout le plus éloigné.
      bounds(k.len ? (k.u < 0.5 ? 1 : 0) : k.u, 3, 0.25, 'alert');
      k.back = rnd(3.5, 5.5);
    } else if (asleep) setState(k, 'sleep');
    else if (g.temple.lit && k.state !== 'sit' && life.revive > 0.3) {
      // Le monde revient à la vie : il s'approche et se dresse.
      bounds(k.d.gather ?? k.home, 3, 0.36, 'sit');
    } else if (k.state === 'alert' && k.t > (k.back || 1.2) && !homeLit) {
      if (Math.abs(k.u - k.home) > 0.02) bounds(k.home, 3, 0.38, 'graze');
      else setState(k, 'graze');
    } else if (k.state === 'graze' && k.len && k.t > k.cross) {
      // De temps en temps, il traverse sa pente.
      k.home = k.home < 0.5 ? 0.85 : 0.15;
      k.cross = rnd(20, 34);
      bounds(k.home, Math.max(2, Math.round((Math.abs(k.home - k.u) * k.len) / 9)), 0.4, 'graze');
    }
  }
  if (k.state === 'bound') {
    if (!k.hop) {
      k.hop = { from: k.u, to: clamp(k.u + k.stepU, 0, 1), t: 0 };
      if (k.hop.to !== k.hop.from) k.dir = (k.hop.to > k.hop.from ? 1 : -1) * (r.x1 >= r.x0 ? 1 : -1);
      g.events.push('hop');
    }
    k.hop.t += dt / k.hopDur;
    const u = Math.min(1, k.hop.t);
    k.u = lerp(k.hop.from, k.hop.to, u);
    k.lift = Math.sin(Math.PI * u) * (k.len ? 7 : 9) * k.s * 1.6;
    if (u >= 1) {
      addPrint(life, lerp(r.x0, r.x1, k.u), lerp(r.y0, r.y1, k.u));
      k.hop = null;
      k.lift = 0;
      if (--k.hops <= 0) setState(k, k.then);
    }
  }
  k.x = lerp(r.x0, r.x1, k.u);
  k.y = lerp(r.y0, r.y1, k.u) - k.lift;
}

/**
 * Le rapace plane en cercles, d'autant plus haut que le soleil est haut. Son
 * ombre glisse sur le relief. Quand le soleil disparaît, il rejoint son
 * perchoir (s'il en a un : `perch` dans le niveau).
 */
function updateRaptor(k, g, life, dt) {
  const d = k.d;
  const light = g.light;
  const lift = smooth((Math.sin(g.sunAngle) - 0.3) / 0.6);
  k.loop = Math.max(0, k.loop - dt);
  k.flap = Math.max(0, k.flap - dt);
  k.a += dt * 0.12 * (1 + life.revive * 0.8);
  const r = (d.r ?? 30) * (0.75 + 0.45 * lift);
  const sky = { x: d.x + Math.cos(k.a) * r, y: d.y - 26 * lift + Math.sin(k.a * 2) * r * 0.22 };
  const wantPerch = !!d.perch && life.night > 0.5 && !g.temple.lit && k.loop <= 0;
  const px = k.x;

  if (k.tap) {
    g.events.push('raptor');
    k.flap = 1.4;
    k.loop = 7; // dérangé, il fait un tour avant de se reposer
  }
  if (k.state === 'soar') {
    k.x = sky.x;
    k.y = sky.y;
    if (wantPerch) {
      setState(k, 'toPerch');
      k.from = { x: k.x, y: k.y };
    }
  } else if (k.state === 'toPerch') {
    const u = smooth(k.t / 2.8);
    k.x = lerp(k.from.x, d.perch[0], u);
    k.y = lerp(k.from.y, d.perch[1], u) - Math.sin(Math.PI * u) * 12;
    if (k.t >= 2.8) setState(k, 'perch');
    if (!wantPerch) {
      setState(k, 'toSky');
      k.from = { x: k.x, y: k.y };
    }
  } else if (k.state === 'perch') {
    [k.x, k.y] = d.perch;
    if (!wantPerch) {
      setState(k, 'toSky');
      k.from = { x: k.x, y: k.y };
      g.events.push('raptor'); // il s'envole en criant
    }
  } else if (k.state === 'toSky') {
    const u = smooth(k.t / 2.8);
    k.x = lerp(k.from.x, sky.x, u);
    k.y = lerp(k.from.y, sky.y, u) - Math.sin(Math.PI * u) * 14;
    if (k.t >= 2.8) setState(k, 'soar');
  }
  if (Math.abs(k.x - px) > 0.001) k.dir = k.x > px ? 1 : -1; // il regarde là où il va

  // Son ombre : là où le rayon du soleil qui passe par lui touche le sol.
  k.shadow = null;
  if (k.state !== 'perch' && !light.sunHidden && light.intensity > 0.3 && !isBlocked(light.sun.x, light.sun.y, k.x, k.y, light.segs)) {
    const dx = k.x - light.sun.x;
    const dy = k.y - light.sun.y;
    const n = Math.hypot(dx, dy) || 1;
    const h = castRay(k.x, k.y, dx / n, dy / n, light.segs);
    if (h.seg && h.seg.owner !== 'bounds' && h.seg.owner !== 'cloud') k.shadow = { x: k.x + (dx / n) * h.t, y: k.y + (dy / n) * h.t };
  }
}

/** La chouette vient se poser quand la nuit tombe, hulule, et repart au jour. */
function updateOwl(k, g, life, dt) {
  const d = k.d;
  const want = life.night > 0.5 && !g.temple.lit;
  const side = d.from ?? 1;
  const far = { x: d.x + 150 * side, y: d.y - 110 };
  k.blink = Math.max(0, k.blink - dt);
  if (k.state === 'away') {
    if (want) setState(k, 'in');
  } else if (k.state === 'in') {
    const u = smooth(k.t / 2);
    k.x = lerp(far.x, d.x, u);
    k.y = lerp(far.y, d.y, u) + Math.sin(Math.PI * u) * 10;
    k.dir = -side;
    if (k.t >= 2) {
      setState(k, 'perch');
      k.hootIn = 1.2;
    }
  } else if (k.state === 'perch') {
    k.x = d.x;
    k.y = d.y;
    k.hootIn -= dt;
    if (k.tap) {
      k.hootIn = 0;
      k.blink = 0.5;
    }
    if (k.hootIn <= 0) {
      g.events.push('owl');
      k.hootIn = rnd(7, 12);
      k.hoot = 0.9;
    }
    k.hoot = Math.max(0, (k.hoot || 0) - dt);
    if (!want) setState(k, 'out');
  } else if (k.state === 'out') {
    const u = smooth(k.t / 2);
    k.x = lerp(d.x, far.x, u);
    k.y = lerp(d.y, far.y, u) - Math.sin(Math.PI * u) * 6;
    k.dir = side;
    if (k.t >= 2) setState(k, 'away');
  }
}

// ── Le petit peuple ──

/** Ce que les villageois regardent : un cristal qui s'allume, le reflet qu'on tourne, le soleil qu'on déplace. */
function updateFocus(g, life, dt) {
  let focus = null;
  const crystal = g.crystals.find((c) => c.lit);
  life.crystalLit = !!crystal && !g.temple.lit;
  if (crystal) focus = { x: crystal.def.x, y: crystal.def.y };
  else if (g.drag && g.drag.type === 'mirror') {
    const beam = g.light.beams.find((b) => b.mirror === g.drag.mirror);
    const s = beam && beam.slices.find((sl) => sl.lit);
    if (s) focus = { x: s.p.x + beam.dir.x * Math.min(s.t, 300), y: s.p.y + beam.dir.y * Math.min(s.t, 300) };
  } else if (g.drag && g.drag.type === 'sun' && !g.light.sunHidden) focus = g.light.sun;
  if (focus) {
    life.focus = focus;
    life.focusT = 2.5;
  } else {
    life.focusT -= dt;
    if (life.focusT <= 0) life.focus = null;
  }
}

/**
 * Un villageois a sa place. À l'ombre, il va se serrer près du feu de sa
 * hutte ; la nuit, il y rentre. Au soleil, il revient à sa place et s'étire.
 */
function updateVillager(f, g, life, dt) {
  const p = f.p;
  const night = life.night > 0.5 && !g.temple.lit;
  // (on regarde à hauteur de cape et à hauteur de capuchon : devant une hutte,
  // le bas du corps est caché par le dôme)
  const litAt = (x, y) => [8, 15].some((h) => sunAt(g, x, y - h * p.s) || beamAt(g, x, y - h * p.s));
  const postLit = litAt(p.x, p.y);
  f.postSun = postLit ? f.postSun + dt : 0;
  f.postShade = postLit ? 0 : f.postShade + dt;
  f.sunlit = litAt(f.x, f.y);

  // Où veut-il être ?
  let target = 'post';
  if (f.hut && !g.temple.lit) {
    if (night) target = g.level.nightWatch ? 'fire' : 'hut'; // (nightWatch : ce village veille)
    else if (f.target === 'fire' || f.target === 'hut' ? f.postSun < 1.2 : f.postShade > 3) target = 'fire';
  }
  if (target !== f.target) {
    f.target = target;
    f.delay = f.i * 0.6 + rnd(0, 0.6); // ils ne partent pas tous en même temps
  }
  const tx = target === 'hut' ? f.hut.x : target === 'fire' ? f.fireX : p.x;
  f.delay = Math.max(0, f.delay - dt);

  f.moving = false;
  if (Math.abs(tx - f.x) > 0.4 && f.delay <= 0) {
    // Il marche (les enfants trottinent).
    const speed = p.s < 0.9 ? 24 : 17;
    const before = f.x;
    f.x = approach(f.x, tx, speed, dt);
    f.y = groundBelow(life, f.x, f.y) + f.sink;
    f.dir = tx > before ? 1 : -1;
    f.moving = true;
    f.walked += Math.abs(f.x - before);
    if (f.walked > 4.5) {
      f.walked = 0;
      addPrint(life, f.x, f.y + 1);
      g.events.push('step');
    }
  }
  const arrived = Math.abs(tx - f.x) <= 0.4;
  f.vis = approach(f.vis, target === 'hut' && arrived ? 0 : 1, 3.5, dt);

  // Ses gestes, une fois arrêté.
  const resting = !f.moving;
  const cold = resting && !f.sunlit && !g.temple.lit;
  f.crouch = approach(f.crouch, cold ? 1 : 0, 1.5, dt);
  f.cheer = approach(f.cheer, life.crystalLit ? 1 : 0, 2.5, dt);
  f.stretch = Math.max(0, f.stretch - dt / 1.5);
  if (resting && f.sunlit) {
    f.nextStretch -= dt;
    if (f.nextStretch <= 0) {
      f.stretch = 1;
      f.nextStretch = rnd(7, 14);
    }
  }
  // Il suit des yeux ce qui se passe ; près du feu, il regarde le feu.
  let lookY = 0;
  if (resting) {
    if (life.focus && Math.abs(life.focus.x - f.x) > 6) {
      f.dir = life.focus.x > f.x ? 1 : -1;
      lookY = clamp((life.focus.y - (f.y - 10)) / 110, -1, 1);
    } else if (target === 'fire' && arrived) f.dir = f.hut.x > f.x ? 1 : -1;
    else if (target === 'post' && arrived && !g.temple.lit) f.dir = p.dir;
  }
  f.lookY = approach(f.lookY, lookY, 3, dt);

  // On le touche : il sursaute et fait tinter sa barre de lumière.
  f.hop = Math.max(0, f.hop - dt / 0.45);
  if (f.tap) {
    f.tap = false;
    f.hop = 1;
    g.events.push('chime' + (f.i % 5));
  }
}

// ── Petites choses qui volent ──

function updateBits(g, life, dt) {
  // Embruns au pied des cascades
  for (const s of g.streams) {
    for (const w of streamWet(s)) {
      if (w.type !== 'fall' || !w.reachesEnd) continue;
      const bot = w.pts[w.pts.length - 1];
      if (Math.random() < dt * 16) addBit(life, { type: 'spray', x: bot.x + rnd(-4, 4), y: bot.y - 2, vx: rnd(-16, 16), vy: rnd(-34, -10), max: rnd(0.4, 0.8), r: rnd(0.5, 1), fall: 70 });
    }
  }
  for (const b of life.bits) {
    b.life += dt;
    b.vy += (b.fall ?? 14) * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  life.bits = life.bits.filter((b) => b.life < b.max);
}

/** Les poussières qui dansent dans les faisceaux. */
function updateMotes(g, life, dt) {
  const beams = g.light.beams.filter((b) => b.slices.some((s) => s.lit));
  if (beams.length && life.motes.length < 46 && Math.random() < dt * 14) {
    const b = beams[Math.floor(Math.random() * beams.length)];
    const lit = b.slices.filter((s) => s.lit);
    const s = lit[Math.floor(Math.random() * lit.length)];
    const along = rnd(4, Math.min(s.t, 380));
    life.motes.push({ x: s.p.x + b.dir.x * along, y: s.p.y + b.dir.y * along, vx: rnd(-3, 3), vy: rnd(-3.5, 1), life: 0, max: rnd(1.8, 3.4), a: 0 });
  }
  const polys = [...g.light.beamPolys, ...g.light.lampPolys];
  for (const m of life.motes) {
    m.life += dt;
    m.x += (m.vx + windAt(life, m.x) * 6) * dt;
    m.y += m.vy * dt;
    // Hors du faisceau, une poussière ne se voit plus.
    const inside = polys.some((poly) => pointInPolygon(m, poly));
    const want = inside ? Math.sin((Math.PI * m.life) / m.max) : 0;
    m.a = approach(m.a, want, 3, dt);
  }
  life.motes = life.motes.filter((m) => m.life < m.max);
}

/** Bassins : des ronds dans l'eau, et parfois un poisson qui saute. */
function updateWaters(g, life, dt) {
  for (const w of life.waters) {
    const d = w.b.def;
    for (const r of w.rings) r.t += dt / 1.6;
    w.rings = w.rings.filter((r) => r.t < 1);
    // Sous la glace, rien ne bouge.
    const frozen = g.frosts.some((f) => f.amount > 0.25 && f.def.rect && f.def.rect.x1 > d.x0 && f.def.rect.x0 < d.x1);
    const deep = d.floor - w.b.level > 7 && d.x1 - d.x0 > 44;
    if (frozen || !deep || life.night > 0.5) continue;
    w.ringIn -= dt;
    if (w.ringIn <= 0) {
      w.ringIn = rnd(2.5, 6);
      w.rings.push({ x: rnd(d.x0 + 10, d.x1 - 10), t: 0 });
    }
    if (w.jump) {
      w.jump.t += dt / 0.9;
      if (w.jump.t >= 1) {
        w.rings.push({ x: w.jump.x0 + w.jump.dir * 15, t: 0 });
        g.events.push('plop');
        w.jump = null;
      }
    } else {
      w.fishIn -= dt;
      if (w.fishIn <= 0) {
        w.fishIn = rnd(9, 18);
        const dir = Math.random() < 0.5 ? -1 : 1;
        const x0 = rnd(d.x0 + 22, d.x1 - 22);
        w.jump = { x0, dir, t: 0 };
        w.rings.push({ x: x0, t: 0 });
        g.events.push('plop');
      }
    }
  }
}

/** Le ciel : une étoile filante de temps en temps, un vol d'oiseaux au loin. */
function updateSky(g, life, dt) {
  const sky = life.sky;
  const W = g.level.size.w;
  if (sky.star) {
    sky.star.t += dt / sky.star.max;
    if (sky.star.t >= 1) sky.star = null;
  } else if (life.night > 0.7) {
    sky.starIn -= dt;
    if (sky.starIn <= 0) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      sky.star = { x: rnd(70, W - 70), y: rnd(40, 190), vx: dir * rnd(150, 230), vy: rnd(60, 100), t: 0, max: rnd(0.7, 1) };
      sky.starIn = rnd(22, 45);
    }
  }
  if (sky.flock) {
    sky.flock.x += sky.flock.vx * dt;
    if (sky.flock.x < -80 || sky.flock.x > W + 80) sky.flock = null;
  } else if (life.night < 0.3) {
    sky.flockIn -= dt;
    // (un vol passe aussi quand le sanctuaire se rallume)
    const now = g.temple.lit && g.win.t > 3 && !sky.revived;
    if (sky.flockIn <= 0 || now) {
      if (now) sky.revived = true;
      const dir = Math.random() < 0.5 ? -1 : 1;
      sky.flock = { x: dir > 0 ? -60 : W + 60, y: rnd(220, 320), vx: dir * rnd(15, 21), n: 5 + Math.floor(Math.random() * 3) };
      sky.flockIn = rnd(30, 55);
    }
  }
}

// ───────────────────────────── Le toucher ─────────────────────────────

/**
 * Le joueur a touché le monde au point p : l'animal ou le villageois le plus
 * proche réagit. Renvoie vrai si quelqu'un a réagi.
 */
export function tapLife(g, p) {
  const life = g.life;
  if (!life) return false;
  let best = null;
  const consider = (who, x, y, radius) => {
    const d = dist(p, { x, y }) / radius;
    if (d < 1 && (!best || d < best.d)) best = { d, who };
  };
  for (const k of life.critters) {
    if (k.type === 'flowers' || k.type === 'bush') continue;
    if (k.type === 'owl' && k.state !== 'perch') continue;
    if (k.type === 'raptor') consider(k, k.x, k.y, 24);
    else consider(k, k.x + (k.type === 'marmots' ? 4 * k.s : 0), k.y - 8 * k.s, 13 + 10 * k.s);
  }
  for (const f of life.folk) if (f.vis > 0.6) consider(f, f.x, f.y - 8 * f.p.s, 16);
  if (!best) return false;
  best.who.tap = true;
  return true;
}
