// Règles du jeu : l'état d'un niveau et la façon dont il évolue.
//
// Principe « systémique » : aucun enchaînement n'est écrit à l'avance.
// Chaque élément ne réagit qu'à ce qu'il reçoit :
//   lumière sur un glacier   → il fond (et libère ce qu'il retenait)
//   ombre sur une eau calme  → elle gèle ; lumière → elle dégèle
//   eau qui coule            → fait tourner une roue, qui ouvre une porte
//   lumière sur le cristal   → le temple s'allume
//
// Un niveau (src/levels/) ne fait que LISTER ses éléments ; ce fichier les
// fait vivre. Il ne dessine rien (voir render.js) : on peut le tester avec Node.

import { rad, clamp, smooth, pointInPolygon, distToPolygon } from '../engine/vec.js';
import {
  visibilityPolygon,
  traceBeams,
  polygonSegments,
  mirrorGeometry,
  isBlocked,
  beamPolygons,
} from '../engine/light.js';

export const SLICES = 12; // finesse des faisceaux (tranches par miroir)

// Profondeur (en unités monde) à laquelle la lumière « mord » dans chaque
// matière : c'est le liseré clair qu'on voit sur les surfaces éclairées.
const BITE = { rock: 14, cloud: 12, ice: 12, house: 7, door: 2.5 };
const biteOf = (owner) => BITE[typeof owner === 'string' ? owner : owner.kind] || 0;

/** Les cristaux d'un sanctuaire : un seul (temple.crystal) ou plusieurs (temple.crystals). */
export const templeCrystals = (level) => level.temple.crystals || [level.temple.crystal];

// ── L'onde du réveil ──────────────────────────────────────────────────
// Quand le sanctuaire se rallume, un cercle d'or part de ses cristaux et
// traverse toute la scène. Ce qu'il touche se réveille à cet instant : la
// neige fond, les fleurs poussent, les machines des anciens se rallument.
// Il part doucement, pour qu'on le voie naître, puis il accélère.
const WAVE_DELAY = 0.3; // secondes entre l'allumage et le départ de l'onde
const WAVE_SPEED = 55; // vitesse de départ (unités par seconde)
const WAVE_PUSH = 16; // accélération
const WAVE_MARGIN = 60; // la scène vue par un écran plus large ou plus haut que 360 × 720
const waveRadius = (t) => (t <= 0 ? 0 : WAVE_SPEED * t + WAVE_PUSH * t * t);
const waveTime = (r) => (-WAVE_SPEED + Math.sqrt(WAVE_SPEED * WAVE_SPEED + 4 * WAVE_PUSH * r)) / (2 * WAVE_PUSH);

/**
 * L'onde d'un niveau, avant son départ. Elle part du milieu des cristaux
 * (x, y) ; `r` est son rayon, `max` le rayon où elle a tout traversé (le coin
 * le plus éloigné de ce qu'un écran peut montrer), `end` l'instant (g.win.t)
 * où elle y arrive, `woke` le nombre de machines déjà rallumées.
 */
function makeWave(level) {
  const all = templeCrystals(level);
  const x = all.reduce((s, c) => s + c.x, 0) / all.length;
  const y = all.reduce((s, c) => s + c.y, 0) / all.length;
  const far = (cx, cy) => Math.hypot(cx - x, cy - y);
  const m = WAVE_MARGIN;
  const max = Math.max(far(-m, -2 * m), far(360 + m, -2 * m), far(-m, 720 + 2 * m), far(360 + m, 720 + 2 * m));
  return { x, y, r: 0, max, end: WAVE_DELAY + waveTime(max), woke: 0 };
}

/** Depuis combien de secondes l'onde du réveil est passée ici (0 : pas encore). */
export function wokenFor(g, x, y) {
  if (!g.temple.lit) return 0;
  const d = Math.hypot(x - g.wave.x, y - g.wave.y);
  return Math.max(0, g.win.t - WAVE_DELAY - waveTime(d));
}

/**
 * Les machines des anciens, là où elles sont en ce moment : chacune se
 * rallume au passage de l'onde. `r` est la taille de son anneau d'or
 * (0 : pas d'anneau, juste un éclat, pour ce qui a déjà sa propre lueur).
 */
export function machineSpots(g) {
  const spots = [];
  for (const m of g.mirrors) if (m.free) spots.push({ x: m.x, y: m.y, r: m.len / 2 + 3 });
  for (const w of g.wheels) {
    spots.push({ x: w.def.x, y: w.def.y, r: w.def.r + 3 });
    // (le pignon du haut de sa chaîne, au-dessus de la porte : voir machine.js)
    const d = w.def.door && byId(g.doors, w.def.door);
    if (d) spots.push({ x: d.def.x + (w.def.x < d.def.x ? -1 : 1) * (d.def.w / 2 + 5), y: d.def.top - 8, r: 5 });
  }
  for (const e of g.eyes) spots.push({ x: e.def.x, y: e.def.y, r: 7 }, { x: e.def.out.x, y: e.def.out.y, r: 0 });
  for (const m of g.memories) spots.push({ x: m.def.x, y: m.def.y, r: 0 });
  for (const l of g.level.lanterns || []) spots.push({ x: l.x, y: l.y, r: 0 });
  return spots;
}

// Lever et coucher du soleil : la lumière ne s'allume pas d'un coup. Elle
// monte à mesure que le soleil s'éloigne du relief (sur DAWN_ZONE unités) ou
// sort du nuage (sur CLOUD_ZONE unités).
const DAWN_ZONE = 40;
const CLOUD_ZONE = 16;
// Les teintes d'aube durent plus longtemps que la montée de la lumière.
const DAWN_COLOR_ZONE = 105;

const byId = (list, id) => list.find((e) => e.def.id === id);
const pt = ([x, y]) => ({ x, y });

/**
 * Sens dans lequel l'eau fait tourner une roue. Le courant pousse le BAS de
 * la roue : s'il va vers la droite, la roue tourne à l'envers des aiguilles
 * d'une montre (-1) ; s'il va vers la gauche, dans leur sens (+1).
 */
function wheelSpin(level, def) {
  const stream = (level.streams || []).find((s) => s.id === def.stream);
  for (const part of stream ? stream.parts : []) {
    if (!part.run) continue;
    const a = part.run[0];
    const b = part.run[part.run.length - 1];
    const under = def.x >= Math.min(a[0], b[0]) - 20 && def.x <= Math.max(a[0], b[0]) + 20 && Math.abs(def.y - a[1]) < 40;
    if (under) return b[0] >= a[0] ? -1 : 1; // c'est ce tronçon qui passe sous la roue
  }
  return -1;
}

/** Crée l'état de départ d'un niveau. */
export function createGame(level) {
  const L = level;
  return {
    level,
    time: 0,
    started: false, // devient vrai quand le joueur quitte l'écran titre
    sunAngle: rad(L.sun.start),
    cloudX: L.cloud ? L.cloud.startX : 0,
    cloudShape: L.cloud ? makeCloudShape(L.cloud.w, L.cloud.h) : null,
    // Un miroir est « libre » s'il n'est ni pris dans la glace, ni porté.
    // (t = position le long du rail, pour les miroirs qui en ont un)
    mirrors: L.mirrors.map((m) => ({
      ...m,
      angle: rad(m.angle),
      t: m.rail ? (m.rail.start ?? 0.5) : 0,
      free: !m.frozen && !m.carried,
      lit: false,
    })),
    // Glaciers et neiges : fondent à la lumière, une fois pour toutes.
    // (active = la glace existe ; un tas de neige n'existe qu'après la chute
    // de la corniche dont il vient, voir `after` dans le niveau)
    ices: (L.ices || []).map((def) => ({ def, kind: 'ice', melt: 0, gone: false, heating: false, exposure: 0, active: !def.after })),
    // Cristaux du sanctuaire, yeux de pierre et cristaux-mémoire
    crystals: templeCrystals(L).map((def, index) => ({ def, kind: 'crystal', index, lit: false })),
    eyes: (L.eyes || []).map((def) => ({ def, kind: 'eye', lit: false })),
    memories: (L.memories || []).map((def) => ({ def, kind: 'memory', charge: 0, lit: false })),
    // Eaux calmes : gèlent à l'ombre (amount → 1), dégèlent à la lumière (→ 0).
    frosts: (L.frosts || []).map((def) => ({ def, kind: 'ice', amount: def.start || 0, lit: false, held: false })),
    // Cours d'eau : head = jusqu'où l'eau est arrivée, tail = jusqu'où elle s'est retirée.
    streams: (L.streams || []).map((def) => ({
      def,
      geo: streamGeometry(def),
      on: false,
      head: def.startFull ? 1 : 0,
      tail: 0,
    })),
    basins: (L.basins || []).map((def) => ({ def, level: def.low })),
    // (spin : le sens où l'eau la fait tourner, voir wheelSpin)
    wheels: (L.wheels || []).map((def) => ({ def, angle: 0, speed: 0, spin: wheelSpin(L, def) })),
    doors: (L.doors || []).map((def) => ({ def, kind: 'door', open: 0 })),
    walkers: (L.walkers || []).map((def) => ({ def, geo: pathGeometry(def.path.map(pt)), d: 0, moving: false, done: false })),
    temple: { charge: 0, lit: false, glow: 0 },
    win: { t: 0 },
    thaw: 0, // 0 = ère glaciaire, 1 = monde dégelé
    // L'onde du réveil : un cercle qui part du sanctuaire rallumé (voir makeWave).
    wave: makeWave(L),
    touched: { sun: false, cloud: false, mirror: false, rail: false },
    particles: [],
    events: [], // messages pour l'interface : 'ice-gone', 'door-open', 'mirror-placed', 'temple-lit', 'wake'
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
      // Le ventre du nuage est plein (un rectangle relie les deux bouts) : un
      // point de cercle qui s'y trouve n'est pas sur le contour. Le garder
      // creuserait des dents dans le dessous, et un faisceau venu d'en bas y
      // dessinerait des éclats.
      if (p.y > 0 && p.x > circles[0].x && p.x < circles[4].x) continue;
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

/** Demi-largeur et hauteur du dôme d'une hutte enterrée. */
export function hutSize(h) {
  const half = h.w * 0.75;
  return { half, height: half * 0.72 };
}

/** Le contour d'une hutte (un dôme) : c'est lui qui fait de l'ombre. */
export function housePolygon(h) {
  const { half, height } = hutSize(h);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI; // de la gauche à la droite, en passant par le sommet
    pts.push({ x: h.x + Math.cos(a) * half, y: h.baseY + Math.sin(a) * height });
  }
  return pts;
}

/** Une porte descend dans le sol quand elle s'ouvre. */
export function doorPolygon(door) {
  const d = door.def;
  const top = d.top + (d.bottom - d.top) * smooth(door.open);
  return [
    { x: d.x - d.w / 2, y: top },
    { x: d.x + d.w / 2, y: top },
    { x: d.x + d.w / 2, y: d.bottom },
    { x: d.x - d.w / 2, y: d.bottom },
  ];
}

/** Un petit losange autour d'un point : la forme des cristaux et des yeux de pierre. */
function diamond(c) {
  return [
    { x: c.x, y: c.y - c.r * 1.15 },
    { x: c.x + c.r * 0.9, y: c.y },
    { x: c.x, y: c.y + c.r * 1.15 },
    { x: c.x - c.r * 0.9, y: c.y },
  ];
}

export function crystalPolygon(level, i = 0) {
  return diamond(templeCrystals(level)[i]);
}

export const eyePolygon = (eye) => diamond({ x: eye.def.x, y: eye.def.y, r: eye.def.r || 5 });
export const memoryPolygon = (mem) => diamond({ x: mem.def.x, y: mem.def.y, r: mem.def.r || 8 });

/** Une digue de glace monte depuis sa base à mesure qu'elle gèle. */
export function frostPolygon(f) {
  const r = f.def.rect;
  const top = r.y1 - (r.y1 - r.y0) * f.amount;
  return [
    { x: r.x0, y: top },
    { x: r.x1, y: top },
    { x: r.x1, y: r.y1 },
    { x: r.x0, y: r.y1 },
  ];
}

// ── Chemins (cours d'eau, trajets des personnages) ──

function pathGeometry(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, total: cum[cum.length - 1] };
}

/** Point situé à la distance d le long d'un chemin. */
function pointAt(geo, d) {
  const { pts, cum } = geo;
  if (d <= 0) return { ...pts[0] };
  for (let i = 1; i < pts.length; i++) {
    if (d <= cum[i]) {
      const k = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
    }
  }
  return { ...pts[pts.length - 1] };
}

/** Morceau d'un chemin entre les distances d0 et d1. */
function subPath(geo, d0, d1) {
  const out = [pointAt(geo, d0)];
  for (let i = 0; i < geo.pts.length; i++) if (geo.cum[i] > d0 && geo.cum[i] < d1) out.push(geo.pts[i]);
  out.push(pointAt(geo, d1));
  return out;
}

/** Un cours d'eau est une suite de tronçons : 'run' (il coule sur le sol) ou 'fall' (il tombe). */
function streamGeometry(def) {
  let start = 0;
  const parts = def.parts.map((p) => {
    const pts = p.run
      ? p.run.map(pt)
      : [
          { x: p.fall.x, y: p.fall.top },
          { x: p.fall.x, y: p.fall.bottom },
        ];
    const geo = pathGeometry(pts);
    const part = { type: p.run ? 'run' : 'fall', geo, start, blocksLight: !!p.blocksLight };
    start += geo.total;
    return part;
  });
  return { parts, total: start };
}

/** Les tronçons actuellement mouillés d'un cours d'eau : [{ type, pts, reachesEnd, blocksLight }]. */
export function streamWet(stream) {
  const { parts, total } = stream.geo;
  const d0 = stream.tail * total;
  const d1 = stream.head * total;
  const out = [];
  if (d1 - d0 < 0.5) return out;
  for (const p of parts) {
    const a = Math.max(d0, p.start) - p.start;
    const b = Math.min(d1, p.start + p.geo.total) - p.start;
    if (b - a < 0.5) continue;
    out.push({ type: p.type, pts: subPath(p.geo, a, b), reachesEnd: b >= p.geo.total - 0.5, blocksLight: p.blocksLight });
  }
  return out;
}

/** Où se trouve un personnage qui marche. */
export function walkerPosition(w) {
  return pointAt(w.geo, w.d);
}

/**
 * Met à leur place les miroirs qui ne tiennent pas en place tout seuls :
 *  - un miroir sur radeau suit le niveau de son bassin ;
 *  - un miroir sur rail glisse entre les deux bouts de son rail (m.t va de 0
 *    à 1), un peu au-dessus de lui.
 */
export function placeMirrors(g) {
  for (const m of g.mirrors) {
    if (m.raft) m.y = byId(g.basins, m.raft.basin).level - m.raft.offset;
    if (m.rail) {
      const r = m.rail;
      m.x = r.x0 + (r.x1 - r.x0) * m.t;
      m.y = r.y0 + (r.y1 - r.y0) * m.t - (r.height ?? 15);
    }
  }
}

/** Tous les bords qui arrêtent la lumière, à cet instant. */
export function buildSegments(g) {
  const L = g.level;
  const segs = [];
  polygonSegments(L.ground, 'rock', segs);
  if (L.cloud) polygonSegments(cloudPolygon(g), 'cloud', segs);
  for (const h of L.houses || []) polygonSegments(housePolygon(h), 'house', segs);
  for (const ice of g.ices) if (ice.active && !ice.gone) polygonSegments(ice.def.points, ice, segs);
  for (const f of g.frosts) if (f.def.role === 'dam' && f.amount > 0.04) polygonSegments(frostPolygon(f), f, segs);
  for (const d of g.doors) if (d.open < 0.97) polygonSegments(doorPolygon(d), d, segs);
  // Une cascade disperse la lumière : elle l'arrête.
  for (const s of g.streams) {
    const wet = streamWet(s);
    wet.forEach((w, i) => {
      if (!w.blocksLight) return;
      const a = w.pts[0];
      const b = w.pts[w.pts.length - 1];
      polygonSegments(
        [
          { x: a.x - 1.6, y: a.y },
          { x: a.x + 1.6, y: a.y },
          { x: b.x + 1.6, y: b.y },
          { x: b.x - 1.6, y: b.y },
        ],
        'water',
        segs,
      );
      // L'eau arrive par le bord d'où elle tombe : entre ce bord et le haut de
      // la chute, il ne doit pas rester de jour par où un rayon se glisserait.
      const before = wet[i - 1];
      const lip = before && before.type === 'run' && before.reachesEnd ? before.pts[before.pts.length - 1] : null;
      if (lip && Math.hypot(lip.x - a.x, lip.y - a.y) < 10) {
        polygonSegments(
          [
            { x: a.x, y: a.y - 1.6 },
            { x: lip.x, y: lip.y - 1.6 },
            { x: lip.x, y: lip.y + 1.6 },
            { x: a.x, y: a.y + 1.6 },
          ],
          'water',
          segs,
        );
      }
    });
  }
  for (const c of g.crystals) polygonSegments(crystalPolygon(L, c.index), c, segs);
  for (const e of g.eyes) polygonSegments(eyePolygon(e), e, segs);
  for (const m of g.memories) polygonSegments(memoryPolygon(m), m, segs);
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
  placeMirrors(g);
  const segs = buildSegments(g);
  const sun = sunPosition(g);

  // Le soleil est-il caché derrière le relief ou dans le nuage ?
  const hidden = pointInPolygon(sun, L.ground) || (L.cloud ? pointInPolygon(sun, cloudPolygon(g)) : false);
  const vis = hidden ? null : visibilityPolygon(sun.x, sun.y, segs, biteOf);

  // intensity : force de la lumière du jour, de 0 (nuit) à 1 (plein jour).
  // dawn : teinte d'aube, forte quand le soleil est bas ou frôle le relief.
  const clear = smooth(distToPolygon(sun, L.ground) / DAWN_ZONE);
  const outOfCloud = L.cloud ? smooth(distToPolygon(sun, cloudPolygon(g)) / CLOUD_ZONE) : 1;
  const intensity = hidden ? 0 : Math.min(clear, outOfCloud);
  const low = 1 - smooth((Math.sin(g.sunAngle) - 0.45) / 0.4);
  const dawn = hidden ? 1 : Math.max(low, 1 - smooth(distToPolygon(sun, L.ground) / DAWN_COLOR_ZONE));

  const active = g.mirrors.filter((m) => m.free);
  // Un objet reçoit-il de la lumière, du soleil ou d'un faisceau ?
  const touchedBy = (beams, owner) => !!(vis && vis.owners.has(owner)) || beams.some((b) => b.slices.some((s) => s.lit && s.owner === owner));

  // Les lampes : les cristaux-mémoire chargés, et la sortie des conduits dont
  // l'œil d'entrée est éclairé. Un œil pouvant être éclairé par un faisceau,
  // on calcule les faisceaux une première fois, puis une seconde s'il le faut.
  // (un cristal-mémoire ne brille que dans le noir : de jour, sa lueur se perd)
  const memoryLamps = g.memories
    .filter((m) => m.charge > 0.12 && intensity < 0.35)
    .map((m) => ({ x: m.def.x, y: m.def.y, range: m.def.range || 70, owner: m, power: m.charge }));
  let lamps = memoryLamps;
  let beams = traceBeams(hidden ? null : sun, active, segs, SLICES, biteOf, lamps);
  for (const e of g.eyes) e.lit = touchedBy(beams, e);
  if (g.eyes.some((e) => e.lit)) {
    const eyeLamps = g.eyes.filter((e) => e.lit).map((e) => ({ ...e.def.out, range: e.def.out.range || 70, owner: null, power: 1 }));
    lamps = [...memoryLamps, ...eyeLamps];
    beams = traceBeams(hidden ? null : sun, active, segs, SLICES, biteOf, lamps);
    for (const e of g.eyes) e.lit = e.lit || touchedBy(beams, e);
  }
  for (const m of g.mirrors) m.lit = beams.some((b) => b.mirror === m);
  const beamPolys = beams.filter((b) => !b.fromLamp).flatMap(beamPolygons);
  const lampPolys = beams.filter((b) => b.fromLamp).flatMap(beamPolygons);

  // Qui reçoit de la lumière ?
  for (const c of g.crystals) c.lit = touchedBy(beams, c);
  for (const m of g.memories) m.lit = touchedBy(beams, m);
  const crystalLit = g.crystals.every((c) => c.lit); // le sanctuaire veut tous ses cristaux en même temps
  const waterHits = []; // points où un faisceau se brise dans une cascade
  // (le plein soleil fait fondre lentement ; une glace `beamOnly` ne cède qu'à un reflet)
  for (const ice of g.ices) ice.exposure = ice.active && !ice.def.beamOnly && vis && vis.owners.has(ice) ? 0.5 : 0;
  for (const b of beams) {
    for (const s of b.slices) {
      if (!s.lit) continue;
      if (s.owner === 'water') waterHits.push({ x: s.p.x + b.dir.x * s.t, y: s.p.y + b.dir.y * s.t });
      else if (s.owner && s.owner.kind === 'ice' && 'exposure' in s.owner) s.owner.exposure += 1.6 / SLICES;
    }
  }
  // Eaux calmes : éclairées si l'un de leurs points témoins voit le soleil ou
  // se trouve dans un faisceau.
  for (const f of g.frosts) {
    f.lit = f.def.probes.some(([x, y]) => {
      if (!hidden && !isBlocked(sun.x, sun.y, x, y, segs, f)) return true;
      return beamPolys.some((poly) => pointInPolygon({ x, y }, poly));
    });
  }

  // Lumières ponctuelles : le temple allumé, les lanternes du village, et
  // les lampes (qui éclairent leurs alentours, même la nuit).
  const points = [];
  if (g.temple.glow > 0) {
    const c = templeCrystals(L)[0];
    const noCrystal = segs.filter((s) => !s.owner || s.owner.kind !== 'crystal');
    points.push({ x: c.x, y: c.y, r: 190 * g.temple.glow, pts: visibilityPolygon(c.x, c.y, noCrystal, biteOf).points });
    for (const l of L.lanterns || []) {
      const k = smooth(wokenFor(g, l.x, l.y) / 1.6); // elle s'allume au passage de l'onde
      if (k > 0) points.push({ x: l.x, y: l.y, r: 52 * k, pts: visibilityPolygon(l.x, l.y, segs, biteOf).points });
    }
  }

  return {
    sun,
    sunHidden: hidden,
    intensity,
    dawn,
    sunPoly: vis ? vis.points : null,
    beams,
    beamPolys,
    lampPolys,
    lamps,
    segs,
    points,
    crystalLit,
    waterHits,
  };
}

/**
 * Ce que les lampes éclairent autour d'elles (pour le dessin seulement) :
 * [{ x, y, r, pts }], pts étant la zone visible depuis la lampe.
 */
export function lampHalos(light) {
  return light.lamps.map((lamp) => {
    const others = lamp.owner ? light.segs.filter((s) => s.owner !== lamp.owner) : light.segs;
    return { x: lamp.x, y: lamp.y, r: lamp.range * (0.4 + 0.6 * lamp.power), pts: visibilityPolygon(lamp.x, lamp.y, others, biteOf).points };
  });
}

/**
 * Aide à la visée : quand le joueur lâche un miroir tout près d'une cible
 * (glace, autre miroir, cristal), on corrige l'angle de quelques degrés.
 * Sur un écran tactile, viser au degré près serait frustrant.
 */
export function settleMirror(g, mirror) {
  if (mirror.rail) return; // un miroir sur rail ne tourne pas
  const score = () => {
    const l = computeLight(g);
    return (
      g.mirrors.filter((m) => m.lit).length +
      (g.ices.some((i) => i.active && !i.gone && i.exposure > 0) ? 1 : 0) +
      g.crystals.filter((c) => c.lit).length +
      g.memories.filter((m) => m.lit).length +
      (l.crystalLit ? 2 : 0)
    );
  };
  const current = score();
  const step = rad(0.5);
  const results = [];
  for (let i = -8; i <= 8; i++) {
    turnMirror(g, mirror, i * step);
    results.push({ i, s: score() });
    turnMirror(g, mirror, -i * step);
  }
  const best = Math.max(...results.map((r) => r.s));
  if (best <= current) return;
  // Parmi les angles gagnants, on prend le milieu de la plage la plus proche.
  const wins = results.filter((r) => r.s === best).map((r) => r.i);
  const nearest = wins.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a));
  let lo = nearest;
  let hi = nearest;
  while (wins.includes(lo - 1)) lo--;
  while (wins.includes(hi + 1)) hi++;
  turnMirror(g, mirror, ((lo + hi) / 2) * step);
}

/**
 * Tourne un miroir de d radians. S'il a un jumeau (m.twin = l'identifiant de
 * l'autre), celui-ci tourne d'autant, mais à l'envers : une chaîne les relie.
 */
export function turnMirror(g, mirror, d) {
  mirror.angle += d;
  if (mirror.twin) {
    const other = g.mirrors.find((m) => m.id === mirror.twin);
    if (other) other.angle -= d;
  }
}

// ───────────────────────────── Évolution ─────────────────────────────

/** Fait avancer le monde de dt secondes. */
export function update(g, dt) {
  const L = g.level;
  g.time += dt;

  const light = (g.light = computeLight(g));

  // Glaciers et neiges : la lumière les fait fondre. Une neige « after »
  // n'apparaît que lorsque la glace dont elle vient est tombée.
  for (const ice of g.ices) {
    if (!ice.active && byId(g.ices, ice.def.after).gone) ice.active = true;
    if (ice.gone || !ice.active) continue;
    // Un grand glacier (`thaws`) ne fond que lorsque le sanctuaire se rallume
    // et que l'onde du réveil l'atteint.
    if (ice.def.thaws) {
      if (wokenFor(g, ice.def.points[0].x, ice.def.points[0].y) > 0) {
        ice.melt = Math.min(1, ice.melt + dt / 9);
        if (Math.random() < dt * 20) spawnDrip(g, ice);
        if (ice.melt >= 1) ice.gone = true;
      }
      continue;
    }
    const e = Math.min(1.5, ice.exposure);
    ice.heating = e > 0;
    if (e > 0) {
      ice.melt += (dt * e * light.intensity) / ice.def.meltTime; // lumière d'aube : fonte lente
      if (Math.random() < dt * 14) spawnDrip(g, ice);
    }
    if (ice.melt >= 1) {
      ice.melt = 1;
      ice.gone = true;
      ice.heating = false;
      for (const m of g.mirrors) if (m.frozen === ice.def.id) m.free = true; // miroir libéré
      for (let i = 0; i < 26; i++) spawnDrip(g, ice, true);
      g.events.push('ice-gone');
    }
  }

  // Eaux calmes : l'ombre les gèle, la lumière les dégèle.
  for (const f of g.frosts) {
    if (f.held) continue; // quelqu'un marche dessus : la glace tient bon
    f.amount = clamp(f.amount + (f.lit ? (-dt * light.intensity) / f.def.meltTime : dt / f.def.freezeTime), 0, 1);
  }

  // Cours d'eau : ils coulent si leur source est ouverte, sinon ils se vident.
  for (const s of g.streams) {
    const d = s.def;
    const sourceOpen = d.after ? byId(g.ices, d.after).gone : true;
    const frozen = d.spring ? byId(g.frosts, d.spring).amount >= (d.frozenAt || 0.5) : false;
    s.on = sourceOpen && !frozen;
    const v = (d.speed || 200) / s.geo.total;
    if (s.on) {
      s.tail = 0;
      s.head = Math.min(1, s.head + dt * v);
    } else if (s.head > 0) {
      s.tail = Math.min(s.head, s.tail + dt * v * 1.2);
      if (s.tail >= s.head) s.head = s.tail = 0;
    }
  }

  // Bassins : une digue gelée retient l'eau, qui monte.
  for (const b of g.basins) {
    if (!b.def.dam) continue;
    const target = b.def.low - (b.def.low - b.def.high) * byId(g.frosts, b.def.dam).amount;
    const step = (b.def.speed || 30) * dt;
    b.level += clamp(target - b.level, -step, step);
  }

  // Roues et portes : l'eau fait tourner la roue, la roue ouvre la porte.
  for (const w of g.wheels) {
    const s = byId(g.streams, w.def.stream);
    const flowing = s.on && s.head >= 1;
    w.speed += ((flowing ? 2.4 : 0) - w.speed) * Math.min(1, dt * 2);
    w.angle += w.speed * dt * w.spin;
    const door = w.def.door && byId(g.doors, w.def.door);
    if (door && flowing && door.open < 1) {
      door.open = Math.min(1, door.open + dt / 2.8);
      if (door.open >= 1) g.events.push('door-open');
    }
  }

  // Personnages qui marchent : ils avancent tant que le chemin les porte.
  for (const w of g.walkers) updateWalker(g, w, dt);

  // Faisceau brisé par une cascade : une gerbe d'étincelles.
  for (const h of light.waterHits) if (Math.random() < dt * 5) spawnSpark(g, h.x, h.y, 10 + Math.random() * 25, 'mist');

  // Cristaux-mémoire : ils se chargent à la lumière, puis s'éteignent lentement.
  for (const m of g.memories) {
    const d = m.def;
    m.charge = clamp(m.charge + (m.lit ? dt / (d.chargeTime || 2.5) : -dt / (d.hold || 60)), 0, 1);
  }

  // Temple : il se charge tant que TOUS ses cristaux reçoivent de la lumière.
  // (un faisceau venu d'une lampe compte autant que le soleil, même la nuit)
  if (!g.temple.lit) {
    const power = Math.max(light.intensity, light.lampPolys.length ? 1 : 0);
    g.temple.charge = clamp(g.temple.charge + (light.crystalLit ? (dt * power) / 1.4 : -dt / 0.9), 0, 1);
    if (g.temple.charge >= 1) {
      g.temple.lit = true;
      g.events.push('temple-lit');
      for (const c of templeCrystals(L)) for (let i = 0; i < 40; i++) spawnSpark(g, c.x, c.y, 30 + Math.random() * 70);
    }
  } else {
    g.win.t += dt;
    g.temple.glow = smooth(g.win.t / 2.2);
    // L'onde du réveil grandit ; `thaw` dit où elle en est (0 → 1).
    const wave = g.wave;
    wave.r = Math.min(wave.max, waveRadius(g.win.t - WAVE_DELAY));
    g.thaw = smooth(wave.r / wave.max);
    // Chaque machine qu'elle atteint se rallume (une note par machine).
    const woke = machineSpots(g).filter((m) => Math.hypot(m.x - wave.x, m.y - wave.y) <= wave.r).length;
    for (; wave.woke < woke; wave.woke++) g.events.push('wake');
    if (Math.random() < dt * 5) {
      const all = templeCrystals(L);
      const c = all[Math.floor(Math.random() * all.length)];
      spawnSpark(g, c.x, c.y, 8 + Math.random() * 14);
    }
  }

  updateParticles(g, dt);
}

/**
 * Un porteur avance le long de son chemin. Devant une eau, il attend qu'elle
 * soit gelée ; arrivé au bout, il pose le miroir qu'il porte.
 */
function updateWalker(g, w, dt) {
  if (w.done) return;
  const d = w.def;
  const speed = d.speed || 22;
  const bridge = d.bridge;
  const frost = bridge ? byId(g.frosts, bridge.frost) : null;
  const dA = bridge ? w.geo.cum[bridge.from] : Infinity;
  const dB = bridge ? w.geo.cum[bridge.to] : Infinity;

  w.moving = true;
  if (bridge && w.d >= dA - 0.01 && w.d < dB) {
    // Au bord de l'eau, ou sur la glace.
    const waiting = w.d <= dA + 0.01;
    if (waiting && frost.amount < 0.98) {
      w.d = dA;
      w.moving = false;
      return;
    }
    frost.held = true;
    w.d = Math.min(dB, w.d + speed * dt);
    if (w.d >= dB) frost.held = false;
    return;
  }
  // Autres obstacles sur son chemin (voir `gates` dans le niveau) :
  //   needs: 'id'      il attend que cette glace (ou neige) soit tombée
  //   blockedBy: 'id'  il attend tant que cette neige est là
  let limit = w.d < dA ? dA : w.geo.total;
  for (const gate of d.gates || []) {
    const at = w.geo.cum[gate.at];
    if (w.d > at + 0.01) continue; // déjà franchi
    const ice = byId(g.ices, gate.needs || gate.blockedBy);
    const open = gate.needs ? ice.gone : !ice.active || ice.gone;
    if (!open) limit = Math.min(limit, at);
  }
  if (w.d >= limit - 0.001 && limit < w.geo.total && limit !== dA) {
    w.d = limit;
    w.moving = false;
    return;
  }
  w.d = Math.min(limit, w.d + speed * dt);
  if (w.d >= w.geo.total) {
    w.done = true;
    w.moving = false;
    const m = g.mirrors.find((k) => k.id === d.carries);
    if (m) {
      m.carried = false;
      m.free = true;
      g.events.push('mirror-placed');
      for (let i = 0; i < 14; i++) spawnSpark(g, m.x, m.y, 10 + Math.random() * 30);
    }
  }
}

// ───────────────────────────── Particules ─────────────────────────────

function spawnDrip(g, ice, burst = false) {
  const pts = ice.def.points;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys);
  g.particles.push({
    type: 'drip',
    x: x0 + 4 + Math.random() * (x1 - x0 - 8),
    y: y1 - 10 + Math.random() * 8,
    vx: burst ? (Math.random() - 0.5) * 40 : 0,
    vy: burst ? -Math.random() * 30 : 0,
    life: 0,
    max: 1.6,
  });
}

function spawnSpark(g, x, y, speed, type = 'spark') {
  const a = Math.random() * Math.PI * 2;
  g.particles.push({
    type,
    x,
    y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed - 10,
    life: 0,
    max: 0.8 + Math.random() * (type === 'mist' ? 0.5 : 1.2),
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
  const floor = g.level.size.h + 80;
  g.particles = g.particles.filter((p) => p.life < p.max && p.y < floor);
}
