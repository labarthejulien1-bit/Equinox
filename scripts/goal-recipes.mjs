// Comment gagner chaque médaille : une « recette » par objectif secondaire.
//
// `npm run check` les rejoue comme le ferait un joueur, pour prouver que
// chaque objectif est atteignable (voir playRecipe dans check-level.mjs).
// C'est aussi l'antisèche du jeu : la solution de chacune des 30 médailles.
//
// Une recette : on place le soleil (`sun`, en degrés), le nuage (`cloud`) et
// le rail (`rail`), on attend `settle` secondes, on vise avec un miroir
// (`aim` : [miroir, x, y], ou [miroir, 'raptor'] pour viser le rapace), on
// attend `wait` secondes en touchant `taps` de temps en temps (un animal, 'folk'
// pour chaque villageois, 'lake' pour le lac, 'night' pour la chouette et les
// yeux), puis on
// enchaîne les étapes de `then`.

export const RECIPES = {
  1: {
    chouette: { taps: 'owl', wait: 4 },
    marmottes: { sun: 58, cloud: 44, wait: 7 },
    cairn: { sun: 52, cloud: 180, aim: ['village', 30, 146.5], wait: 3 },
  },
  2: {
    rapace: { taps: 'raptor', wait: 5 },
    sentinelle: { sun: 52, cloud: 316, settle: 5, aim: ['village', 164, 589.3], wait: 4 },
    buisson: { sun: 112, cloud: 44, aim: ['village', 9, 479], wait: 4 },
  },
  3: {
    poisson: { taps: 'lake', wait: 3 },
    fleurs: { sun: 34, wait: 5 },
    rapace: { sun: 94, settle: 3, aim: ['radeau', 'raptor'], wait: 2 },
  },
  4: {
    bouquetin: { taps: 'ibex', wait: 3 },
    sentinelle: { sun: 40, cloud: 44, settle: 6, wait: 0.2, then: { sun: 22, wait: 4 } },
    fleur: { sun: 112, cloud: 163, aim: ['village', 266, 503.9], wait: 4 },
  },
  5: {
    rail: { rail: { rail: 0 }, wait: 1, then: { rail: { rail: 1 }, wait: 1 } },
    ciel: { sun: 28, rail: { rail: 0.25 }, wait: 2 },
    fleurs: { sun: 136, wait: 5 },
  },
  6: {
    villageois: { taps: 'folk', wait: 8 },
    lievre: { sun: 28, cloud: 316, settle: 3, aim: ['crete', 314, 368], wait: 4 },
    fleur: { sun: 52, cloud: 44, aim: ['crete', 34, 348.9], wait: 4 },
  },
  7: {
    ciel: { sun: 94, cloud: 60, aim: ['village', 230, -200], wait: 2 },
    sentinelle: { sun: 40, cloud: 180, settle: 5, aim: ['village', 330, 395.2], wait: 4 },
    rapace: { sun: 94, cloud: 60, settle: 3, aim: ['village', 'raptor'], wait: 2 },
  },
  8: {
    perchoir: { sun: 184, wait: 9 },
    etoile: { sun: 184, wait: 12 },
    nuit: { sun: 184, wait: 9, taps: 'night' },
  },
  9: {
    villageois: { taps: 'folk', wait: 8 },
    bouquetin: { sun: 70, wait: 24, then: { sun: 22, wait: 5 } },
    eveil: { sun: 76, wait: 28 },
  },
  10: {
    rail: { rail: { rail: 0 }, wait: 1, then: { rail: { rail: 1 }, wait: 1 } },
    sentinelle: { sun: 88, cloud: 44, settle: 6, wait: 0.2, then: { cloud: 180, wait: 4 } },
    rapace: { sun: 106, cloud: 180, settle: 3, aim: ['village', 'raptor'], wait: 2 },
  },
};
