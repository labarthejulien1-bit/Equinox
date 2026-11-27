// Niveau 3 — « La digue de glace »
//
// Un lac de montagne, large et peu profond. Un radeau y porte un miroir. À
// droite, un éperon rocheux avance en proue au-dessus du déversoir par où
// l'eau s'échappe. À l'ombre, l'eau qui franchit ce seuil gèle et bâtit une
// digue : le lac monte, le radeau aussi.
//
// Solution prévue :
//  1. placer le soleil assez à droite pour que l'ombre de l'éperon couvre le
//     déversoir : la digue monte, l'eau aussi ;
//  2. …mais pas trop bas, sinon le radeau reste lui aussi dans l'ombre ;
//  3. une fois le miroir en haut et au soleil, viser le temple, dont la grotte
//     s'ouvre sur la rive gauche.

import { terrain } from './terrain.js';

const relief = terrain([
  { pts: [[-3000, 200], [-40, 200], [0, 236], [30, 286], [52, 332]], rough: 1, snow: true }, // versant de gauche
  { pts: [[52, 332], [74, 380], [88, 418], [84, 440]] },
  { pts: [[84, 440], [64, 420], [38, 414], [14, 424], [4, 446], [10, 480]], cave: true }, // voûte de la grotte
  { pts: [[10, 480], [40, 479], [64, 477], [82, 468]], cave: true }, // son sol, relevé à l'entrée
  { pts: [[82, 468], [96, 500], [114, 542], [134, 570], [164, 584]], rough: 5, amp: 0.03, depth: 1 }, // la cuvette du lac
  { pts: [[164, 584], [202, 588], [232, 574], [246, 562], [252, 553]], rough: 6, amp: 0.03, depth: 1 },
  { pts: [[252, 553], [258, 551], [264, 553]] }, // le seuil du déversoir
  { pts: [[264, 553], [268, 620], [274, 690], [280, 762]] }, // le ravin
  { pts: [[294, 762], [304, 660], [312, 580], [316, 500], [310, 430], [298, 384], [268, 330]] }, // le dessous de l'éperon
  { pts: [[268, 330], [278, 300], [300, 268], [326, 250], [352, 246], [374, 232], [420, 170], [3000, 170]], rough: 9, amp: 0.04, snow: true }, // son dos, où vit le village
]);

export default {
  id: 3,
  number: '3',
  title: 'La digue de glace',
  size: { w: 360, h: 720 },

  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 105, radius: 13 },
  // Pas de nuage ici : seul le relief fait de l'ombre.

  ...relief,

  mirrors: [
    {
      id: 'radeau',
      x: 180,
      y: 536,
      angle: 0,
      len: 24,
      raft: { basin: 'lac', offset: 16 }, // flotte 16 unités au-dessus de l'eau
      mount: { type: 'raft' },
    },
  ],

  temple: { x: 38, baseY: 479, scale: 0.75, crystal: { x: 37, y: 460, r: 7.5 } },

  // Le seuil : l'eau qui le franchit gèle à l'ombre et monte en digue.
  frosts: [
    {
      id: 'digue',
      role: 'dam',
      rect: { x0: 252, x1: 264, y0: 480, y1: 553 },
      probes: [
        [258, 549],
        [258, 516],
        [258, 486],
      ],
      freezeTime: 4.5,
      meltTime: 3.0,
    },
  ],

  basins: [{ id: 'lac', x0: 78, x1: 252, floor: 592, low: 552, high: 480, dam: 'digue', speed: 20, spout: { x: 96, y: 498 } }],

  // Tant que la digue n'existe pas, l'eau s'échappe par le ravin.
  streams: [
    {
      id: 'fuite',
      spring: 'digue',
      frozenAt: 0.12,
      startFull: true,
      speed: 320,
      width: 2.4, // un petit filet : c'est lui qui gèle en cascade de glace
      parts: [
        {
          run: [
            [251, 553.5],
            [258, 552],
            [265, 554],
            [269, 620],
            [275, 690],
            [281, 762],
          ],
        },
      ],
    },
    // D'où vient l'eau du lac : la neige du versant fond, et un filet descend
    // la pente. Au surplomb, il tombe goutte à goutte (voir `drips`), pour ne
    // pas cacher l'entrée de la grotte ; puis il rejoint la rive.
    {
      id: 'fonte',
      startFull: true,
      speed: 200,
      width: 2.2, // un simple filet (un torrent fait 4.6)
      parts: [
        {
          run: [
            [35.8, 297.4],
            [40.2, 309.4],
            [46.3, 320.6],
            [52, 332],
            [74, 380],
            [88, 418],
          ],
        },
        {
          run: [
            [88.6, 482.5],
            [89.5, 483.8],
            [96, 500],
          ],
        },
      ],
    },
  ],

  houses: [{ x: 338, baseY: 248, w: 22 }],
  lanterns: [{ x: 304, y: 251, baseY: 265 }],
  villagers: [
    { x: 316, y: 253, s: 1.0, dir: -1 },
    { x: 362, y: 240, s: 0.8, dir: -1 },
  ],
  decor: [
    { type: 'raptor', layer: 'sky', x: 170, y: 290, r: 30, s: 0.6, perch: [286, 279.1] },
    { type: 'ibex', x: 22.3, y: 273.6, s: 0.7, path: [[7.9, 248.3], [14.6, 261.2], [22.3, 273.6], [30, 286], [35.8, 297.4], [40.2, 309.4]] },
    { type: 'cairn', x: 286, y: 289, s: 0.45 },
    { type: 'bush', x: 60, y: 350, s: 0.5 },
    { type: 'hare', x: 4, y: 240, s: 0.45 },
    { type: 'flowers', x: 60, y: 477.3, s: 0.8, n: 3 },
    { type: 'flowers', x: 309.5, y: 262.2, s: 0.8, n: 3 },
    { type: 'flowers', x: 356.5, y: 243.3, s: 0.8, n: 3 },
    { type: 'owl', x: 338, y: 236.4, s: 0.55 },
    { type: 'eyes', x: 15, y: 474.5, s: 0.8 },
  ],
  // Où les fleurs poussent quand le monde revient à la vie (en plus du bord de l'eau).
  blooms: [
    [[320, 254.7], [326, 250], [338.8, 247], [352, 246], [361, 240.7]],
  ],
  // Le goutte-à-goutte du surplomb : [x, d'où ça tombe, le sol] (décor).
  drips: [
    [88.2, 418.5, 481.5],
    [89, 418.5, 482.5],
  ],

  // Les objectifs secondaires : une médaille chacun (cuivre, argent, or).
  goals: [
    { id: 'poisson', type: 'fish', title: 'Un poisson a sauté', text: 'Touche le lac : un poisson y saute' },
    { id: 'fleurs', type: 'flowers', title: 'Toutes les fleurs sont ouvertes', text: 'Trouve l’heure où toutes les fleurs s’ouvrent ensemble' },
    { id: 'rapace', type: 'dazzle', title: 'Le rapace est ébloui', text: 'Éblouis le rapace : fais passer sur lui le reflet du radeau' },
  ],

  hint(g) {
    const dam = g.frosts[0];
    const mirror = g.mirrors[0];
    if (g.temple.lit) return '';
    if (dam.amount < 0.05) {
      if (!g.touched.sun) return 'L’eau s’échappe par le ravin, et le radeau reste trop bas';
      return 'Au soleil, rien ne gèle. Quelle ombre pourrait couvrir le déversoir ?';
    }
    if (dam.amount < 0.95) return dam.lit ? 'La digue fond…' : 'À l’ombre de l’éperon, l’eau bâtit une digue…';
    if (!mirror.lit) return 'Le radeau est monté. Son miroir, lui, attend le soleil.';
    return 'Guide la lumière jusqu’au temple';
  },

  memory: {
    number: 'III',
    title: 'La Digue',
    text:
      '« Ils bâtissaient sans pierre ni mortier. Une nuit d’ombre suffisait à dresser un mur, ' +
      'un matin de soleil à le défaire. »',
    tech: 'Technologie retrouvée : le miroir flottant',
  },
};
