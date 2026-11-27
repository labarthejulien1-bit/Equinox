// Les objectifs secondaires : trois par niveau, une médaille chacun.
//
// Ils n'ont rien à voir avec l'énigme : ils invitent à éveiller le milieu
// (faire sortir les marmottes, ouvrir les fleurs…) ou à jouer avec les
// machines des anciens. Comme life.js, ce fichier ne fait que REGARDER le
// jeu : il ne le modifie jamais, et ne touche pas au navigateur.
//
// Un niveau les déclare dans sa liste `goals`, du plus simple au plus fin :
//   goals: [
//     { id: 'chouette', type: 'owl', text: 'Touche la chouette…' },   → cuivre
//     { id: 'marmottes', type: 'marmots', text: '…' },                → argent
//     { id: 'nappe', type: 'aquifer', text: '…' },                    → or
//   ]
// `id` sert à retenir la médaille sur l'appareil : ne pas le changer ensuite.
// `type` choisit l'un des tests ci-dessous ; `hold` (secondes) demande que la
// condition tienne un moment. Chaque objectif doit avoir sa recette dans
// scripts/check-level.mjs, qui prouve qu'on peut l'atteindre.

import { sunAt, beamAt } from './life.js';

/** Les trois médailles d'un niveau, dans l'ordre de ses objectifs. */
export const MEDALS = ['cuivre', 'argent', 'or'];

const critter = (g, type, n = 0) => g.life.critters.filter((k) => k.type === type)[n];
const plants = (g) => g.life.critters.filter((k) => k.type === 'flowers' || k.type === 'bush');
/** Vrai tant que le sanctuaire dort : après, le monde s'éveille tout seul. */
const asleep = (g) => !g.temple.lit;

// Chaque test répond : « la condition est-elle remplie en ce moment ? »
// (o = l'objectif tel qu'écrit dans le niveau, memo = son carnet de notes)
const TESTS = {
  /** Toucher la chouette posée (la nuit). */
  owl: (g) => critter(g, 'owl')?.blink > 0,
  /** Toucher les yeux qui brillent dans la grotte (la nuit). */
  eyes: (g) => g.life.night > 0.5 && critter(g, 'eyes')?.shut > 0,
  /** Les deux marmottes dehors, au soleil. */
  marmots: (g) => asleep(g) && critter(g, 'marmots')?.state === 'out' && critter(g, 'marmots').out2 > 0.95,
  /** La sentinelle siffle. by: 'shade' (une ombre passe), 'beam' (un reflet), 'bird' (l'ombre du rapace). */
  whistle: (g, o) => critter(g, 'marmots')?.state === 'alarm' && critter(g, 'marmots').alarmBy === o.by,
  /** Le bouquetin couché au soleil. */
  ibex: (g) => asleep(g) && critter(g, 'ibex')?.state === 'lie' && critter(g, 'ibex').lie > 0.9,
  /** Le bouquetin, couché au soleil, se lève et s'ébroue quand on lui fait de l'ombre. */
  ibexUp: (g) => critter(g, 'ibex')?.state === 'shake' && critter(g, 'ibex').shookBy === 'shade',
  /** Le bouquetin touché : il se lève et s'ébroue. */
  ibexTap: (g) => critter(g, 'ibex')?.state === 'shake' && critter(g, 'ibex').shookBy === 'tap',
  /** Le lièvre détale devant un reflet. */
  hare: (g) => critter(g, 'hare')?.state === 'bound' && critter(g, 'hare').fledBy === 'beam',
  /** Toutes les fleurs (et les buissons) ouvertes en même temps. */
  flowers: (g) => asleep(g) && plants(g).length > 0 && plants(g).every((k) => k.open > 0.9),
  /** Une fleur précise (n : la combientième du niveau) ouverte par un reflet, sans soleil. */
  flower: (g, o) => {
    const k = plants(g)[o.n ?? 0];
    return asleep(g) && !!k && k.beam && !k.sun && k.open > 0.9;
  },
  /** Le rapace posé sur son perchoir. */
  perch: (g) => critter(g, 'raptor')?.state === 'perch',
  /** Le rapace touché en plein vol. */
  raptor: (g) => critter(g, 'raptor')?.state === 'soar' && critter(g, 'raptor').loop > 6.5,
  /** Le rapace ébloui par un reflet, en plein vol (il faut avoir tourné un miroir : pas de hasard). */
  dazzle: (g) => g.touched.mirror && critter(g, 'raptor')?.dazzled > 0,
  /** Chaque villageois touché au moins une fois. */
  chimes: (g, o, memo) => {
    memo.rung ??= new Set();
    for (const f of g.life.folk) if (f.hop > 0.5) memo.rung.add(f.i);
    return g.life.folk.length > 0 && memo.rung.size === g.life.folk.length;
  },
  /** Tout le village rentré dans ses huttes. */
  asleep: (g) => g.life.folk.length > 0 && g.life.folk.every((f) => f.vis < 0.05),
  /** En plein jour, tout le village serré près du feu (on lui a fait de l'ombre). */
  huddle: (g) =>
    asleep(g) && g.life.night < 0.5 && g.life.folk.length > 0 && g.life.folk.every((f) => f.hut && f.target === 'fire' && !f.moving && Math.abs(f.x - f.fireX) < 1),
  /** Tout le village à sa place, au soleil. */
  warm: (g) => asleep(g) && g.life.folk.length > 0 && g.life.folk.every((f) => f.target === 'post' && !f.moving && f.sunlit && f.crouch < 0.2),
  /** Un villageois réchauffé par un reflet, là où le soleil ne vient pas. */
  beamWarm: (g) => asleep(g) && g.life.folk.some((f) => f.vis > 0.9 && beamAt(g, f.x, f.y - 8 * f.p.s) && !sunAt(g, f.x, f.y - 8 * f.p.s)),
  /** Un reflet posé sur un point précis (at: [x, y]) : un cairn, une ruine… */
  shine: (g, o) => beamAt(g, o.at[0], o.at[1]),
  /** Un reflet renvoyé vers le ciel : il sort par le haut de l'écran. */
  sky: (g) =>
    g.light.beams.some((b) => !b.fromLamp && b.dir.y < 0 && b.slices.some((s) => s.lit && (!s.owner || s.owner === 'bounds') && s.p.y + b.dir.y * s.t < 0)),
  /** Dans la même nuit, toucher la chouette et les yeux de la grotte. */
  night: (g, o, memo) => {
    if (g.life.night < 0.5) memo.owl = memo.eyes = false;
    else {
      if (critter(g, 'owl')?.blink > 0) memo.owl = true;
      if (critter(g, 'eyes')?.shut > 0) memo.eyes = true;
    }
    return !!memo.owl && !!memo.eyes;
  },
  /** Une étoile filante traverse la nuit. */
  star: (g) => !!g.life.sky.star,
  /** Un poisson saute parce qu'on a touché le lac. */
  fish: (g) => g.life.waters.some((w) => w.jump && w.jump.by === 'tap'),
  /** Le miroir sur rail promené d'un bout à l'autre. */
  rail: (g, o, memo) => {
    const m = g.mirrors.find((k) => k.rail && (!o.mirror || k.id === o.mirror));
    if (!m) return false;
    if (m.t <= 0.04) memo.low = true;
    if (m.t >= 0.96) memo.high = true;
    return !!memo.low && !!memo.high;
  },
  /** La nappe sous la roche remplie jusqu'en haut. */
  aquifer: (g) => g.life.aquifers.some((a) => a.def.cavern && a.fill >= 1),
  /** Plusieurs conditions à la fois (of: [objectifs]). */
  all: (g, o, memo) => o.of.every((sub, i) => TESTS[sub.type](g, sub, (memo[i] ??= {}))),
};

/** Prépare les objectifs d'un niveau. earned : les ids déjà médaillés sur cet appareil. */
export function createGoals(g, earned = []) {
  g.goals = (g.level.goals || []).map((def, index) => ({ def, index, medal: MEDALS[index], done: earned.includes(def.id), held: 0, memo: {} }));
  return g.goals;
}

/**
 * À appeler après updateLife(). Renvoie les objectifs qui viennent d'être
 * atteints (le plus souvent : aucun).
 */
export function updateGoals(g, dt) {
  const fresh = [];
  if (!g.life || !g.light || !g.started) return fresh;
  for (const goal of g.goals || []) {
    if (goal.done) continue;
    const ok = !!TESTS[goal.def.type](g, goal.def, goal.memo);
    goal.held = ok ? goal.held + dt : 0;
    if (ok && goal.held >= (goal.def.hold || 0)) {
      goal.done = true;
      fresh.push(goal);
    }
  }
  return fresh;
}

/** Les types d'objectifs connus (pour le test automatique). */
export const GOAL_TYPES = Object.keys(TESTS);
