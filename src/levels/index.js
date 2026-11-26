// Le voyage : six chapitres, un par milieu, de dix niveaux chacun.
//
// Pour ajouter un niveau : créer son fichier, puis l'ajouter à la liste
// `levels` de son chapitre (et retirer son titre de `soon`).

import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';
import level4 from './level4.js';
import level5 from './level5.js';
import level6 from './level6.js';
import level7 from './level7.js';

export const chapters = [
  {
    number: 'I',
    title: 'La source',
    place: 'Haute montagne, glaciers',
    levels: [level1, level2, level3, level4, level5, level6, level7],
    // Niveaux écrits mais pas encore construits : ils apparaissent grisés.
    soon: ['La veillée', 'Les jumeaux', 'Le grand glacier'],
  },
  { number: 'II', title: 'Les grandes ombres', place: 'Plaines gelées', levels: [], soon: [] },
  { number: 'III', title: 'Le peuple de la forêt', place: 'Forêt', levels: [], soon: [] },
  { number: 'IV', title: 'Miroir de la vie', place: 'Lacs, marais, côtes', levels: [], soon: [] },
  { number: 'V', title: 'La brûlure', place: 'Désert, pierre nue', levels: [], soon: [] },
  { number: 'VI', title: 'L’Equinox', place: 'Hauts plateaux de ruines', levels: [], soon: [] },
];

/** Combien de niveaux comptera chaque chapitre, une fois le jeu fini. */
export const LEVELS_PER_CHAPTER = 10;

/** Tous les niveaux jouables, dans l'ordre où le joueur les découvre. */
export const levels = chapters.flatMap((c) => c.levels);
