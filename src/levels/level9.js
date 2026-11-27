// Niveau 9 — « Les jumeaux »
//
// Une gorge profonde, franchie par un pont de corde. Deux miroirs anciens,
// reliés par une chaîne : quand on en tourne un, l'autre tourne d'autant, à
// l'envers. Le premier est en haut à gauche, sous un bloc de glace perché ;
// son jumeau à mi-hauteur à droite, dans un creux où le soleil n'entre pas.
// Le sanctuaire est tout au fond de la gorge, avec deux cristaux : celui de
// la grotte pour le jumeau, celui du fond de la gorge pour le miroir du
// village, sur la terrasse juste au-dessus.
// Nouveauté : les miroirs jumelés.
//
// Solution prévue :
//  1. pour une position du soleil, un seul réglage envoie la lumière du
//     premier miroir au second ; la direction du second est alors imposée.
//     C'est donc le SOLEIL qui choisit où frappe le second jumeau ;
//  2. le soleil qu'il faudrait est caché par le bloc de glace : il met le
//     premier miroir à l'ombre ;
//  3. placer le soleil ailleurs et tourner le premier miroir vers la glace,
//     juste au-dessus de lui : elle fond ;
//  4. ramener le soleil là où la glace le cachait, régler les jumeaux : le
//     second touche le cristal de la grotte ;
//  5. sans plus toucher au soleil, tourner le miroir du village vers le
//     cristal du fond de la gorge.

import { terrain } from './terrain.js';
import { toPoints } from '../engine/vec.js';

const relief = terrain([
  { pts: [[-3000, 130], [-40, 130], [0, 152], [40, 176], [78, 196]], rough: 1, amp: 0.04, snow: true }, // versant de gauche
  { pts: [[78, 196], [96, 204], [94, 226], [90, 244]] }, // le bec où est perchée la glace
  { pts: [[90, 244], [106, 250], [118, 256]], snow: true }, // la vire du premier miroir
  { pts: [[118, 256], [126, 320], [120, 380], [132, 440], [126, 490], [132, 520]] }, // la paroi de gauche
  { pts: [[132, 520], [108, 514], [84, 520], [64, 540], [58, 568], [64, 596]], cave: true }, // voûte de la grotte
  { pts: [[64, 596], [90, 598], [116, 600], [138, 606]], cave: true }, // son sol
  { pts: [[138, 606], [150, 628], [176, 640], [200, 634]], snow: true }, // le fond de la gorge
  { pts: [[200, 634], [214, 600], [222, 560], [218, 520], [228, 480], [236, 452]] }, // la paroi de droite
  { pts: [[236, 452], [262, 448], [290, 446]], cave: true }, // le creux du second miroir
  { pts: [[290, 446], [298, 420], [292, 398], [268, 392], [246, 388], [232, 376]], cave: true },
  { pts: [[232, 376], [238, 350], [246, 318], [240, 290]] },
  { pts: [[240, 290], [270, 286], [300, 280]], snow: true }, // la terrasse du village
  { pts: [[300, 280], [320, 240], [340, 190], [372, 140], [420, 100], [3000, 100]], rough: 9, amp: 0.04, snow: true }, // versant de droite
]);

export default {
  id: 9,
  number: '9',
  title: 'Les jumeaux',
  size: { w: 360, h: 720 },

  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 40, radius: 13 },
  // Pas de nuage.

  ...relief,

  // twin = l'identifiant du jumeau ; chain = le dessin de la chaîne.
  // La somme des angles des deux jumeaux ne change jamais (ici 100 − 119,67
  // = −19,67°) : elle est réglée pour que tout s'aligne quand le soleil est
  // derrière la glace, vers 126° sur son arc.
  mirrors: [
    {
      id: 'haut',
      twin: 'bas',
      x: 112,
      y: 238,
      angle: 100,
      len: 24,
      mount: { type: 'pole', baseY: 253 },
      chain: [
        [112, 253],
        [118, 258],
        [150, 278],
        [179, 289],
        [210, 290],
        [240, 292],
        [244, 318],
        [238, 350],
        [233, 378],
        [242, 412],
        [262, 446],
      ],
    },
    { id: 'bas', twin: 'haut', x: 262, y: 431, angle: -119.67, len: 30, mount: { type: 'pole', baseY: 448 } },
    { id: 'village', x: 243, y: 272, angle: 100, len: 30, mount: { type: 'pole', baseY: 290 } },
  ],

  // [0] le cristal de la grotte (pour le second jumeau) ; [1] celui du fond
  // de la gorge (pour le miroir du village, qui est juste à son aplomb).
  temple: {
    crystals: [
      { x: 84, y: 574, r: 11 },
      { x: 186, y: 625, r: 12 },
    ],
  },

  ices: [
    {
      id: 'bloc',
      points: toPoints([
        [80, 197],
        [84, 168],
        [96, 156],
        [114, 166],
        [115, 203],
        [96, 205],
      ]),
      meltTime: 3,
      beamOnly: true, // une glace dure : le soleil seul n'y suffit pas, il faut un reflet
    },
  ],

  houses: [{ x: 284, baseY: 284, w: 13 }],
  lanterns: [],
  villagers: [
    { x: 266, y: 287, s: 0.8, dir: -1 },
    { x: 180, y: 284, s: 1.0, dir: 1 },
  ],
  decor: [
    { type: 'bridge', x: 118, y: 256, x1: 240, y1: 290, sag: 12 },
    { type: 'raptor', layer: 'sky', x: 190, y: 190, r: 28, s: 0.6, perch: [40, 168.2] },
    { type: 'ibex', x: 58.7, y: 186.5, s: 0.6, path: [[10.2, 157.8, 'rest'], [19.8, 164.3], [29.9, 170.1], [49.6, 180.8, 'rest'], [58.7, 186.5], [68.4, 191.2, 'rest']] },
    { type: 'cairn', x: 40, y: 177, s: 0.4 },
    { type: 'flowers', x: 255, y: 288, s: 0.9, n: 3 },
    { type: 'flowers', x: 299, y: 280.2, s: 0.9, n: 3 },
    { type: 'flowers', x: 97, y: 246.6, s: 0.9, n: 3 },
    { type: 'owl', x: 284, y: 277.3, s: 0.55 },
    { type: 'eyes', x: 120, y: 596.5, s: 0.8 },
  ],
  // Brume du petit matin et de la nuit.
  mists: [
    { x0: 152, x1: 198, y: 637 },
  ],
  // Où les fleurs poussent quand le monde revient à la vie (en plus du bord de l'eau).
  blooms: [
    [[242, 289.7], [270, 286], [298, 280.4]],
    [[92, 244.8], [106, 250], [116, 255]],
  ],

  // Les objectifs secondaires : une médaille chacun (cuivre, argent, or).
  goals: [
    { id: 'villageois', type: 'chimes', title: 'Tout le village a tinté', text: 'Touche chacun des deux villageois' },
    { id: 'bouquetin', type: 'ibexUp', title: 'Le bouquetin s’est ébroué', text: 'Laisse le bouquetin se coucher au soleil, puis fais-lui de l’ombre' },
    { id: 'eveil', type: 'all', of: [{ type: 'ibex' }, { type: 'flowers' }], hold: 1, title: 'Le grand éveil', text: 'Le grand éveil : le bouquetin couché au soleil et toutes les fleurs ouvertes, en même temps' },
  ],

  hint(g) {
    const ice = g.ices[0];
    const [top, twin, village] = g.mirrors;
    const [deep, entry] = g.crystals;
    if (g.temple.lit) return '';
    if (!g.touched.mirror) return 'Deux miroirs, une chaîne : tourne l’un, l’autre tourne à l’envers';
    if (!ice.gone) {
      if (ice.heating) return 'La glace fond…';
      if (!top.lit) return 'La glace fait de l’ombre au premier miroir : le soleil doit se placer ailleurs';
      if (!twin.lit) return 'Envoie d’abord la lumière du premier miroir à son jumeau, en face';
      return 'C’est le soleil qui décide où frappe le second jumeau. Mais là où il faudrait, la glace le cache…';
    }
    if (!deep.lit) return twin.lit ? 'Déplace le soleil, règle les jumeaux, et regarde où va le reflet' : 'Le premier miroir doit éclairer son jumeau';
    if (!entry.lit) return village.lit ? 'Ne touche plus au soleil : le miroir du village vise l’autre cristal, au fond de la gorge' : 'Le miroir du village attend la lumière';
    return 'Les deux cristaux, ensemble…';
  },

  memory: {
    number: 'IX',
    title: 'Les Jumeaux',
    text:
      '« Deux miroirs, une seule chaîne. Ce que l’un donne, l’autre le reprend : ' +
      'ainsi nos ancêtres apprenaient que tout se tient. »',
    tech: 'Technologie retrouvée : les miroirs jumelés',
  },
};
