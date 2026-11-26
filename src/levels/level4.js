// Niveau 4 — « Le pont de givre »
//
// Un fond de vallée : un torrent, le village sur la rive droite, la grotte du
// temple au-dessus de lui. Un villageois porte un miroir, mais le torrent lui
// barre la route. Le socle qui l'attend, sur l'autre rive, est à l'abri sous
// un énorme bloc posé sur la pente : le soleil n'y arrive jamais.
//
// Solution prévue :
//  1. amener l'ombre du nuage sur le torrent : il gèle en pont ;
//  2. le porteur traverse tout seul et pose son miroir sur le socle ;
//  3. écarter le nuage, puis : miroir du village → miroir du socle → temple.

import { terrain } from './terrain.js';

const relief = terrain([
  { pts: [[-3000, 260], [-40, 260], [-10, 302], [20, 354], [40, 392], [52, 416]], rough: 11, amp: 0.04, snow: true }, // versant de gauche
  { pts: [[52, 416], [76, 404], [104, 410], [128, 430], [136, 452]], snow: true }, // le dessus du bloc perché
  { pts: [[136, 452], [92, 460], [62, 468], [56, 486], [64, 508]] }, // l'abri, sous le bloc
  { pts: [[64, 508], [100, 510], [140, 510], [170, 511]], rough: 13, amp: 0.02, depth: 1, snow: true }, // rive gauche
  { pts: [[170, 511], [175, 528], [189, 542], [213, 542], [229, 528], [235, 511]] }, // le lit du torrent
  { pts: [[235, 511], [252, 510], [270, 509], [288, 504]], rough: 14, amp: 0.02, depth: 1, snow: true }, // rive droite, le village
  { pts: [[288, 504], [296, 482], [292, 454], [298, 430]] },
  { pts: [[298, 430], [314, 425], [334, 421], [354, 421]], cave: true }, // sol de la grotte
  { pts: [[354, 421], [361, 392], [354, 366], [334, 356], [312, 362], [299, 388]], cave: true }, // sa voûte
  { pts: [[299, 388], [295, 360], [308, 330], [326, 290]] },
  { pts: [[326, 290], [340, 240], [366, 192], [400, 150], [3000, 150]], rough: 19, snow: true }, // versant de droite
]);

export default {
  id: 4,
  number: '4',
  title: 'Le pont de givre',
  size: { w: 360, h: 720 },

  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 75, radius: 13 },
  // Un petit nuage bas : son ombre ne couvre que le torrent et ses abords.
  cloud: { y: 292, minX: 44, maxX: 282, startX: 60, w: 64, h: 24 },

  ...relief,

  mirrors: [
    { id: 'village', x: 272, y: 494, angle: 30, len: 22, mount: { type: 'pole', baseY: 508 } },
    // Porté par le villageois jusqu'au socle (x, y = sa place une fois posé).
    { id: 'socle', x: 82, y: 485, angle: 120, len: 24, carried: true, mount: { type: 'none' } },
  ],
  pedestals: [{ x: 82, baseY: 509, topY: 487 }],

  temple: { x: 334, baseY: 421, scale: 0.75, crystal: { x: 333, y: 402, r: 7.5 } },

  // Le torrent : une eau calme en surface, qui gèle à l'ombre.
  basins: [{ id: 'torrent', x0: 170, x1: 235, floor: 542, low: 516, flow: true }],
  frosts: [
    {
      id: 'pont',
      role: 'bridge',
      rect: { x0: 170, x1: 235, y0: 513, y1: 520 },
      probes: [
        [185, 515],
        [202, 515],
        [220, 515],
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
        [258, 510],
        [239, 511],
        [233, 513.5],
        [172, 513.5],
        [166, 511],
        [96, 510],
      ],
      bridge: { frost: 'pont', from: 1, to: 4 }, // le pont est entre ces deux points du chemin
      carries: 'socle',
      speed: 20,
      s: 1.05,
    },
  ],

  houses: [{ x: 250, baseY: 510, w: 16 }],
  lanterns: [{ x: 284, y: 491, baseY: 506 }],
  villagers: [
    { x: 280, y: 506.5, s: 0.8, dir: -1 },
    { x: 110, y: 510, s: 1.0, dir: 1 },
  ],
  decor: [
    { type: 'raptor', layer: 'sky', x: 220, y: 240, r: 30, s: 0.6 },
    { type: 'ibex', x: 350, y: 218, s: 0.65, dir: -1 },
    { type: 'cairn', x: 150, y: 511, s: 0.4 },
    { type: 'marmots', x: 14, y: 344, s: 0.45 },
    { type: 'bush', x: 88, y: 407, s: 0.5 },
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
