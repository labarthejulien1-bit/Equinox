// Niveau 2 — « Le rideau d'eau »
//
// Le torrent libéré au niveau 1 tombe maintenant devant l'entrée du temple :
// la cascade disperse la lumière. Nouvelle règle : l'ombre gèle l'eau calme.
//
// Solution prévue :
//  1. viser le temple avec le miroir : le faisceau se brise dans la cascade ;
//  2. amener l'ombre du nuage sur la source, en haut de la falaise : elle
//     gèle et la cascade se tarit ;
//  3. garder la source à l'ombre ET le miroir au soleil, puis viser le temple.

import { toPoints } from '../engine/vec.js';

export default {
  id: 2,
  number: 'II',
  title: 'Le rideau d’eau',
  size: { w: 360, h: 720 },

  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 100, radius: 13 },
  cloud: { y: 172, minX: 44, maxX: 316, startX: 70, w: 88, h: 30 },

  ground: toPoints([
    [-3000, 3000], //  0
    [-3000, 236], //   1
    [-6, 236], //      2
    [22, 262], //      3
    [36, 340], //      4
    [44, 428], //      5  plateau du village
    [125, 430], //     6
    [130, 520], //     7
    [122, 600], //     8
    [112, 650], //     9  vallée
    [240, 648], //    10  pied de la falaise
    [240, 560], //    11  bas de l'entrée de la grotte
    [262, 566], //    12
    [335, 566], //    13
    [335, 505], //    14
    [300, 490], //    15
    [240, 480], //    16  haut de l'entrée de la grotte
    [240, 330], //    17
    [230, 316], //    18
    [224, 301], //    19  bord d'où tombe la cascade
    [250, 299], //    20
    [252, 304], //    21  cuvette de la source
    [276, 304], //    22
    [278, 299], //    23
    [3000, 296], //   24
    [3000, 3000], //  25
  ]),
  snow: [
    [1, 6],
    [9, 10],
    [19, 20],
    [23, 24],
  ],
  caves: [[11, 16]],

  mirrors: [{ id: 'village', x: 100, y: 406, angle: -20, len: 26, mount: { type: 'pole', baseY: 430 } }],

  temple: { x: 306, baseY: 566, crystal: { x: 304, y: 541, r: 10 } },

  // La source : une eau calme, qui gèle à l'ombre et dégèle au soleil.
  // probes = points témoins : s'ils voient tous de l'ombre, l'eau gèle.
  frosts: [
    {
      id: 'source',
      role: 'spring',
      rect: { x0: 252, x1: 276, y0: 299.5, y1: 304 },
      probes: [
        [258, 300.5],
        [264, 300.5],
        [270, 300.5],
      ],
      freezeTime: 2.4,
      meltTime: 2.0,
    },
  ],

  // Le torrent naît de la source, tombe devant la grotte, suit la vallée.
  streams: [
    {
      id: 'torrent',
      spring: 'source', // il s'arrête quand la source est gelée
      startFull: true,
      speed: 260,
      parts: [
        {
          run: [
            [253, 301],
            [226, 302.5],
          ],
        },
        { fall: { x: 221.5, top: 302, bottom: 649 }, blocksLight: true },
        {
          run: [
            [221, 651.5],
            [113, 653],
          ],
        },
      ],
    },
  ],
  beds: [
    [
      [113, 653],
      [240, 651],
    ],
  ],

  houses: [{ x: 66, baseY: 429, w: 22, h: 15, roof: 13 }],
  lanterns: [{ x: 118, y: 415, baseY: 430 }],
  villagers: [
    { x: 84, y: 429, s: 1.0, dir: 1 },
    { x: 112, y: 429.5, s: 0.8, dir: -1 },
    { x: 300, y: 297.5, s: 1.0, dir: -1 },
    { x: 160, y: 650, s: 0.95, dir: 1 },
  ],
  pines: [
    { x: 334, y: 297, h: 38 },
    { x: 352, y: 297, h: 28 },
    { x: 8, y: 248, h: 26 },
    { x: 138, y: 650, h: 26 },
  ],

  hint(g) {
    const source = g.frosts[0];
    const mirror = g.mirrors[0];
    if (g.temple.lit) return '';
    if (source.amount < 0.5) {
      if (g.light && g.light.waterHits.length) return 'La cascade brise la lumière en mille éclats…';
      if (!g.touched.mirror) return 'Le torrent libéré tombe devant le temple. Essaie le miroir.';
      return 'L’ombre garde le froid : là où elle se pose, l’eau calme gèle';
    }
    if (!mirror.lit) return 'La source dort sous la glace. Le miroir, lui, a besoin de soleil.';
    return 'La voie est libre : guide la lumière jusqu’au temple';
  },

  memory: {
    number: 'II',
    title: 'La Source',
    text:
      '« Le froid n’était pas notre ennemi. Nos anciens appelaient l’ombre pour endormir ' +
      'les eaux, et le soleil pour les réveiller. »',
    tech: 'Savoir retrouvé : l’ombre portée',
  },
};
