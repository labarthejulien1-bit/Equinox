// Le film du chapitre 0 : « Il y a mille ans ».
//
// Un seul cadrage, aucun mot : la capitale des anciens à son âge d'or, le
// soir où ils l'éteignent, mille ans qui passent (la neige, la glace, les
// ruines, puis le petit peuple qui s'installe), et le premier reflet
// d'aujourd'hui sur le cristal éteint.
//
// Ce fichier ne contient que le DÉROULÉ : à l'instant t, où en est chaque
// chose (entre 0 et 1). Il ne touche pas au DOM, comme game.js : `npm run
// check` le fait défiler. Le dessin est dans filmDraw.js, le son dans
// engine/audio.js (film() pour les nappes, event() pour les sons brefs).

import { clamp, smooth } from '../engine/vec.js';

/** Durée du film, en secondes. */
export const FILM_LENGTH = 29.5;

/** De 0 (avant a) à 1 (après b), en ligne droite. */
const ramp = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
/** Pareil, mais en douceur au départ et à l'arrivée. */
const ease = (t, a, b) => smooth(ramp(t, a, b));

// Les grands moments (en secondes). Tout le reste se règle par rapport à eux.
export const T = {
  close: 6.2, // le ciel commence à se fermer
  foldRight: 7.6, // le grand miroir de droite se replie
  foldLeft: 8.4, // puis celui de gauche
  dark: 8.8, // le cœur s'éteint
  years: 11, // les mille ans commencent
  dawn: 21, // l'aube d'aujourd'hui
  turn: 24.4, // le villageois tourne le vieux miroir
  glint: 26.2, // le reflet touche le cristal
  fade: 28, // fondu de fin
};

// Quand chaque chose arrive pendant les mille ans.
const RUIN = { rightTall: 12.6, leftTall: 13.2, leftSmall: 14.4, rightSmall: 15.6 };
const BRIDGES = [13.6, 15.2, 16.4, 17.8];
const CAGE = 14.3;
const TOP_RING = 16.2;
const BLOCKS = 16.6; // une tour couchée apparaît dans la neige
const HUTS = [18.4, 19.1, 19.8];
// Les villageois : d'où ils entrent (x), quand ils partent et quand ils arrivent.
const FOLK = [
  { from: -24, start: 17.4, end: 19.2 },
  { from: -24, start: 18.2, end: 20.0 },
  { from: 384, start: 18.8, end: 20.8 },
  { from: 384, start: 20.0, end: 21.6 }, // celui qui porte le miroir
];

// Les sons brefs : [instant, nom] (voir SOUNDS dans engine/audio.js).
const CUES = [
  [0.3, 'film-open'],
  [T.foldRight, 'film-fold'],
  [T.foldLeft, 'film-fold'],
  [T.dark, 'film-dark'],
  [RUIN.rightTall + 0.4, 'film-crack'],
  [RUIN.leftTall + 0.6, 'film-crack'],
  [CAGE + 0.2, 'film-fall'],
  [RUIN.leftSmall + 0.5, 'film-crack'],
  [RUIN.rightSmall + 0.5, 'film-crack'],
  [BLOCKS, 'film-fall'],
  ...HUTS.map((t) => [t, 'film-hut']),
  [T.turn, 'film-turn'],
  [T.glint, 'film-glint'],
];

/** Un film prêt à démarrer (start : pour les essais, on peut sauter à un instant). */
export function createFilm(start = 0) {
  return { t: start, done: false, events: [] };
}

/** Fait avancer le film de dt secondes. Ses sons brefs arrivent dans film.events. */
export function updateFilm(film, dt) {
  const before = film.t;
  film.t = Math.min(FILM_LENGTH, film.t + dt);
  for (const [at, name] of CUES) if (before < at && film.t >= at) film.events.push(name);
  if (film.t >= FILM_LENGTH) film.done = true;
}

/**
 * Où en est chaque chose à l'instant t. Tout est entre 0 et 1, sauf mention.
 * (le dessin n'a plus qu'à lire ces valeurs : aucune date n'y est écrite)
 */
export function filmState(t) {
  // Les mille ans : le jour et la nuit défilent, d'abord très vite, puis de
  // plus en plus lentement, jusqu'à s'arrêter sur une aube.
  const u = ramp(t, T.years + 0.2, T.dawn + 0.2);
  const phase = Math.PI * 2 * 6 * (1 - (1 - u) ** 2.2);
  const night = (0.5 - 0.5 * Math.cos(phase)) * (u > 0 ? 1 : 0) * (1 - ease(t, T.dawn - 1.2, T.dawn + 0.2));
  const dark = ramp(t, T.dark, T.dark + 2);
  return {
    t,
    veil: Math.max(1 - ease(t, 0, 1.2), ease(t, T.fade, FILM_LENGTH)), // fondus du début et de la fin
    warm: 1 - ease(t, 7.5, 11.5), // 1 : les couleurs de l'âge d'or ; 0 : celles du froid
    sun: 1 - ease(t, 6.8, 9.6), // la force du soleil d'autrefois (faisceaux, rayons)
    clouds: ease(t, T.close, 9.4), // les nuages qui ferment le ciel
    foldRight: ease(t, T.foldRight, T.foldRight + 1),
    foldLeft: ease(t, T.foldLeft, T.foldLeft + 1),
    foldField: (i) => ease(t, 8 + i * 0.05, 8.8 + i * 0.05), // le champ de miroirs se couche, de proche en proche
    power: 1 - smooth(dark), // la lumière du cœur, des sillons, des fenêtres
    spin: Math.min(t, T.dark) + 2 * (dark - (dark * dark) / 2), // l'angle des anneaux (ils ralentissent, puis s'arrêtent)
    elders: 1 - ramp(t, 8.2, 11.2), // les anciens quittent leur terrasse (1 : ils y sont ; 0 : ils sont sortis de l'image)
    snowfall: ease(t, 9.8, 12) * (1 - 0.45 * ease(t, T.dawn, T.dawn + 3)),
    night,
    years: u,
    ground: ease(t, 10.8, 15.5), // la neige monte sur l'esplanade
    ice: (i) => ease(t, 12 + i * 0.5, 17.5 + i * 0.6), // la glace prend chaque tour, l'une après l'autre
    ruin: {
      rightTall: ease(t, RUIN.rightTall, RUIN.rightTall + 2.4),
      leftTall: ease(t, RUIN.leftTall, RUIN.leftTall + 2.4),
      leftSmall: ease(t, RUIN.leftSmall, RUIN.leftSmall + 2.2),
      rightSmall: ease(t, RUIN.rightSmall, RUIN.rightSmall + 2.2),
      back: (i) => ease(t, 12.4 + i * 0.75, 14.2 + i * 0.75),
    },
    bridge: (i) => ease(t, BRIDGES[i], BRIDGES[i] + 0.5), // 1 : la passerelle est rompue
    cage: ease(t, CAGE, CAGE + 0.6), // 1 : la cage du cœur n'est plus que fragments
    topRing: ease(t, TOP_RING, TOP_RING + 0.6),
    cracks: ease(t, 14, 18),
    blocks: ease(t, BLOCKS, BLOCKS + 0.6),
    hut: (i) => ease(t, HUTS[i], HUTS[i] + 0.7),
    smoke: (i) => ease(t, HUTS[i] + 0.8, HUTS[i] + 1.8),
    folk: (i) => ease(t, FOLK[i].start, FOLK[i].end), // 0 : pas encore entré ; 1 : arrivé
    folkFrom: (i) => FOLK[i].from,
    walking: (i) => t > FOLK[i].start && t < FOLK[i].end,
    garland: ease(t, 20.2, 20.9),
    tripod: ease(t, 21.3, 21.9),
    dawn: ease(t, T.dawn - 0.4, T.dawn + 1.6), // le ciel d'aujourd'hui
    sunrise: ease(t, T.dawn, T.dawn + 3), // le soleil d'aujourd'hui monte derrière son nuage
    turn: ease(t, T.turn, T.turn + 1.2), // le vieux miroir tourne
    beam: ease(t, T.turn + 0.9, T.glint), // le reflet monte vers le cristal
    glint: ease(t, T.glint, T.glint + 0.4), // le cristal répond
    // pour le son
    wind: 0.15 + 0.85 * ease(t, 9, 12) * (1 - 0.6 * ease(t, T.dawn, T.dawn + 3)),
  };
}
