// Niveau 3 — « La digue de glace »
//
// Un bassin, un radeau qui porte un miroir, et une gorge par où l'eau
// s'échappe. À l'ombre, l'eau qui franchit le seuil gèle et bâtit une digue :
// le bassin se remplit, le radeau monte.
//
// Solution prévue :
//  1. placer le soleil assez à droite pour que l'ombre de la falaise couvre
//     le seuil : la digue monte, l'eau aussi ;
//  2. …mais pas trop bas, sinon le radeau reste lui aussi dans l'ombre ;
//  3. une fois le miroir en haut et au soleil, viser le temple dans la falaise.

import { toPoints } from '../engine/vec.js';

export default {
  id: 3,
  number: 'III',
  title: 'La digue de glace',
  size: { w: 360, h: 720 },

  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 105, radius: 13 },
  // Pas de nuage ici : seul le relief fait de l'ombre.

  ground: toPoints([
    [-3000, 3000], //  0
    [-3000, 225], //   1
    [40, 225], //      2
    [96, 238], //      3
    [110, 262], //     4
    [110, 385], //     5  haut de l'entrée de la grotte
    [92, 366], //      6
    [30, 358], //      7
    [14, 380], //      8
    [14, 436], //      9
    [110, 436], //    10  bas de l'entrée de la grotte
    [110, 580], //    11  fond du bassin
    [250, 580], //    12
    [250, 540], //    13  seuil
    [264, 540], //    14
    [264, 900], //    15  gorge
    [282, 900], //    16
    [282, 330], //    17
    [260, 300], //    18  surplomb de la falaise
    [3000, 296], //   19
    [3000, 3000], //  20
  ]),
  snow: [
    [1, 4],
    [18, 19],
  ],
  caves: [[5, 10]],

  mirrors: [
    {
      id: 'radeau',
      x: 180,
      y: 524,
      angle: 0,
      len: 24,
      raft: { basin: 'bassin', offset: 16 }, // flotte 16 unités au-dessus de l'eau
      mount: { type: 'raft' },
    },
  ],

  temple: { x: 50, baseY: 436, crystal: { x: 52, y: 411, r: 10 } },

  // Le seuil : l'eau qui le franchit gèle à l'ombre et monte en digue.
  frosts: [
    {
      id: 'digue',
      role: 'dam',
      rect: { x0: 250, x1: 264, y0: 440, y1: 540 },
      probes: [
        [257, 536],
        [257, 492],
        [257, 448],
      ],
      freezeTime: 4.5,
      meltTime: 3.0,
    },
  ],

  basins: [{ id: 'bassin', x0: 110, x1: 250, floor: 580, low: 540, high: 440, dam: 'digue', speed: 26, spout: { x: 110, y: 508 } }],

  // Tant que la digue n'existe pas, l'eau s'échappe par la gorge.
  streams: [
    {
      id: 'fuite',
      spring: 'digue',
      frozenAt: 0.12,
      startFull: true,
      speed: 320,
      parts: [
        {
          run: [
            [249, 541.5],
            [268, 542.5],
          ],
        },
        { fall: { x: 269.5, top: 542, bottom: 900 } },
      ],
    },
  ],

  houses: [
    { x: 312, baseY: 297, w: 24, h: 16, roof: 13 },
    { x: 344, baseY: 297, w: 26, h: 19, roof: 15 },
  ],
  lanterns: [{ x: 292, y: 283, baseY: 298 }],
  villagers: [
    { x: 328, y: 296.5, s: 1.0, dir: -1 },
    { x: 60, y: 229, s: 0.9, dir: 1 },
  ],
  pines: [
    { x: 22, y: 225, h: 40 },
    { x: 78, y: 234, h: 28 },
    { x: 360, y: 296, h: 30 },
  ],

  hint(g) {
    const dam = g.frosts[0];
    const mirror = g.mirrors[0];
    if (g.temple.lit) return '';
    if (dam.amount < 0.05) {
      if (!g.touched.sun) return 'L’eau s’échappe par la gorge, et le radeau reste au fond';
      return 'Au soleil, rien ne gèle. Quelle ombre pourrait couvrir le seuil ?';
    }
    if (dam.amount < 0.95) return dam.lit ? 'La digue fond…' : 'À l’ombre de la falaise, l’eau bâtit une digue…';
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
