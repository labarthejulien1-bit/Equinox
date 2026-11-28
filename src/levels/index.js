// Le voyage : six chapitres, un par milieu, de dix niveaux chacun. Chaque
// chapitre s'ouvre par une histoire (`story`) ; seule celle du chapitre I
// existe pour l'instant.
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
import level8 from './level8.js';
import level9 from './level9.js';
import level10 from './level10.js';

export const chapters = [
  {
    number: 'I',
    title: 'La source',
    place: 'Haute montagne, glaciers',
    // L'histoire du chapitre : un court film (voir src/film/), à regarder en
    // entier pour ouvrir ses niveaux. `id` retient sur l'appareil qu'elle a
    // été vue : ne jamais le changer une fois publié.
    story: { id: 'mille-ans', title: 'Il y a mille ans', seconds: 30 },
    levels: [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10],
    // Niveaux écrits mais pas encore construits : ils apparaissent grisés.
    soon: [],
  },
  { number: 'II', title: 'Les grandes ombres', place: 'Plaines gelées', levels: [], soon: [] },
  { number: 'III', title: 'Le peuple de la forêt', place: 'Forêt', levels: [], soon: [] },
  { number: 'IV', title: 'Miroir de la vie', place: 'Lacs, marais, côtes', levels: [], soon: [] },
  { number: 'V', title: 'La brûlure', place: 'Désert, pierre nue', levels: [], soon: [] },
  // (le dernier chapitre se passe dans la capitale des anciens : la ville du film)
  { number: 'VI', title: 'L’Equinox', place: 'Hauts plateaux de ruines', levels: [], soon: [] },
];

/** Combien de niveaux comptera chaque chapitre, une fois le jeu fini. */
export const LEVELS_PER_CHAPTER = 10;

/** Tous les niveaux jouables, dans l'ordre où le joueur les découvre. */
export const levels = chapters.flatMap((c) => c.levels);
