// Niveau 4 — « Le pont de givre »
//
// Un villageois porte un miroir, mais le torrent lui barre la route. Le socle
// qui l'attend, sur l'autre rive, est le seul endroit d'où l'on peut éclairer
// le temple — et le soleil n'y arrive jamais directement.
//
// Solution prévue :
//  1. amener l'ombre du nuage sur le torrent : il gèle en pont ;
//  2. le porteur traverse tout seul et pose son miroir sur le socle ;
//  3. écarter le nuage, puis : miroir du village → miroir du socle → temple.

import { toPoints } from '../engine/vec.js';

export default {
  id: 4,
  number: 'IV',
  title: 'Le pont de givre',
  size: { w: 360, h: 720 },

  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 75, radius: 13 },
  cloud: { y: 172, minX: 44, maxX: 316, startX: 60, w: 88, h: 30 },

  ground: toPoints([
    [-3000, 3000], //  0
    [-3000, 322], //   1
    [30, 325], //      2
    [62, 335], //      3
    [70, 350], //      4
    [70, 444], //      5  haut de l'entrée de la grotte
    [58, 410], //      6
    [20, 393], //      7
    [6, 410], //       8
    [6, 466], //       9
    [55, 466], //     10
    [70, 495], //     11  bas de l'entrée de la grotte
    [70, 580], //     12  rive gauche
    [150, 580], //    13
    [150, 616], //    14  lit du torrent
    [215, 616], //    15
    [215, 580], //    16  rive droite
    [300, 580], //    17
    [300, 540], //    18
    [230, 524], //    19  pointe du surplomb
    [232, 518], //    20
    [290, 440], //    21
    [300, 410], //    22
    [3000, 406], //   23
    [3000, 3000], //  24
  ]),
  snow: [
    [1, 4],
    [12, 13],
    [16, 17],
    [20, 23],
  ],
  caves: [[5, 11]],

  mirrors: [
    { id: 'village', x: 100, y: 567, angle: -30, len: 22, mount: { type: 'pole', baseY: 580 } },
    // Porté par le villageois jusqu'au socle (x, y = sa place une fois posé).
    { id: 'socle', x: 262, y: 555, angle: 60, len: 24, carried: true, mount: { type: 'none' } },
  ],
  pedestals: [{ x: 262, baseY: 580, topY: 557 }],

  temple: { x: 32, baseY: 466, crystal: { x: 30, y: 440, r: 10 } },

  // Le torrent : une eau calme en surface, qui gèle à l'ombre.
  basins: [{ id: 'torrent', x0: 150, x1: 215, floor: 616, low: 586, flow: true }],
  frosts: [
    {
      id: 'pont',
      role: 'bridge',
      rect: { x0: 150, x1: 215, y0: 583, y1: 590 },
      probes: [
        [165, 585],
        [182, 585],
        [200, 585],
      ],
      freezeTime: 3.2,
      meltTime: 2.6,
    },
  ],

  // Le porteur : il marche jusqu'à l'eau, attend la glace, traverse, pose le miroir.
  walkers: [
    {
      id: 'porteur',
      path: [
        [118, 580],
        [146, 580],
        [152, 583.5],
        [213, 583.5],
        [219, 580],
        [249, 580],
      ],
      bridge: { frost: 'pont', from: 1, to: 4 }, // le pont est entre ces deux points du chemin
      carries: 'socle',
      speed: 20,
      s: 1.05,
    },
  ],

  houses: [
    { x: 322, baseY: 407, w: 24, h: 16, roof: 13 },
    { x: 20, baseY: 324, w: 24, h: 17, roof: 14 },
  ],
  lanterns: [{ x: 346, y: 392, baseY: 407 }],
  villagers: [
    { x: 84, y: 579.5, s: 0.85, dir: 1 },
    { x: 46, y: 329, s: 1.0, dir: 1 },
    { x: 338, y: 406, s: 0.95, dir: -1 },
  ],
  pines: [
    { x: 355, y: 406, h: 34 },
    { x: -4, y: 323, h: 30 },
    { x: 288, y: 579.5, h: 22 },
  ],

  hint(g) {
    const bridge = g.frosts[0];
    const porter = g.walkers[0];
    const [village, placed] = g.mirrors;
    if (g.temple.lit) return '';
    if (!porter.done) {
      if (bridge.held) return 'Le givre porte ses pas…';
      if (bridge.amount > 0.05 && !bridge.lit) return 'L’eau se fige…';
      return 'Le porteur de miroir ne peut pas franchir le torrent';
    }
    if (!village.lit) return 'Le miroir est posé. Celui du village attend la lumière.';
    if (!placed.lit) return 'Le soleil n’atteint pas le socle : envoie-lui la lumière du village';
    return 'De miroir en miroir, jusqu’au temple';
  },

  memory: {
    number: 'IV',
    title: 'Le Porteur',
    text:
      '« Chaque village avait son porteur de miroir. Il marchait là où le givre le permettait, ' +
      'et la lumière le suivait. »',
    tech: 'Tradition retrouvée : les porteurs de lumière',
  },
};
