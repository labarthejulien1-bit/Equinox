// Niveau 6 — « L'œil de pierre »
//
// Un hameau est blotti sous un grand rocher, au pied d'une chute : le soleil
// n'y entre jamais. Le sanctuaire est dans la grotte, derrière la chute : il
// a DEUX cristaux, à éclairer en même temps.
//   - celui de l'entrée est au creux d'une cuvette, derrière un seuil de
//     roche : seul un reflet plongeant, venu de la crête, y descend ;
//   - celui du fond est plus haut : seul un reflet presque à plat, venu du
//     hameau, y arrive.
// Nouveauté : le conduit. Quand l'œil de pierre de la crête reçoit de la
// lumière, son jumeau s'allume dans la voûte de l'abri et éclaire le hameau :
// c'est la seule lumière que le miroir du hameau recevra jamais.
//
// Solution prévue :
//  1. mettre le nuage sur le lac : il gèle, la chute se tarit ;
//  2. …sans que son ombre tombe sur la crête : la borne doit rester au
//     soleil pour que sa jumelle éclaire le miroir du hameau ;
//  3. miroir du hameau → cristal du fond ; miroir de la crête → cristal de
//     l'entrée.

import { terrain } from './terrain.js';

const relief = terrain([
  { pts: [[-3000, 372], [-40, 372], [-6, 358], [26, 352], [56, 360]], rough: 1, amp: 0.03, depth: 1, snow: true }, // la crête
  { pts: [[56, 360], [100, 422], [150, 472], [186, 500]], snow: true }, // le dos du grand rocher qui abrite le hameau
  { pts: [[186, 500], [160, 506], [130, 510], [108, 518], [98, 534], [104, 546]] }, // l'abri, sous le rocher
  { pts: [[104, 546], [130, 550], [160, 552], [184, 556]] }, // le sol du hameau
  { pts: [[184, 556], [188, 568], [204, 570], [210, 560]] }, // la vasque au pied de la chute
  { pts: [[210, 560], [212, 538], [218, 536], [220, 548]] }, // le seuil de roche, à l'entrée de la grotte
  { pts: [[220, 548], [232, 570], [258, 570], [268, 556], [290, 544], [338, 540]], cave: true }, // la cuvette, puis le sol qui remonte
  { pts: [[338, 540], [346, 512], [338, 486], [316, 472], [286, 468], [250, 474], [224, 492], [206, 508]], cave: true }, // la voûte, qui s'avance en visière
  { pts: [[206, 508], [204, 482], [212, 462], [218, 438], [210, 420], [200, 404]] }, // la barre rocheuse
  { pts: [[200, 404], [212, 401]], snow: true },
  { pts: [[212, 401], [216, 407.5], [264, 408], [268, 401]] }, // la cuvette du lac
  { pts: [[268, 401], [292, 392], [322, 376], [352, 352], [390, 330], [3000, 330]], rough: 9, amp: 0.03, depth: 1, snow: true }, // le versant de droite, en pente douce
]);

export default {
  id: 6,
  number: '6',
  title: 'L’œil de pierre',
  size: { w: 360, h: 720 },

  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 100, radius: 13 },
  cloud: { y: 290, minX: 44, maxX: 316, startX: 70, w: 88, h: 30 },

  ...relief,

  mirrors: [
    { id: 'hameau', x: 162, y: 532, angle: 60, len: 22, mount: { type: 'pole', baseY: 552 } },
    { id: 'crete', x: 46, y: 340, angle: -30, len: 30, mount: { type: 'pole', baseY: 358 } },
  ],

  // Deux cristaux : [0] celui de l'entrée (pour la crête), [1] celui du fond (pour le pré).
  temple: {
    x: 316,
    baseY: 542,
    scale: 0.7,
    crystals: [
      { x: 246, y: 559, r: 9 },
      { x: 315, y: 524.5, r: 7.5 },
    ],
  },

  // Le conduit : (x, y) = l'œil d'entrée, sur sa borne ; out = l'œil de
  // sortie, qui éclaire jusqu'à `range` ; path = la trace gravée entre eux.
  eyes: [
    {
      id: 'conduit',
      x: 22,
      y: 330,
      baseY: 353,
      out: { x: 134, y: 514, range: 70 }, // dans la voûte de l'abri
      path: [
        [22, 350],
        [50, 400],
        [90, 450],
        [122, 494],
        [133, 510],
      ],
    },
  ],

  frosts: [
    {
      id: 'source',
      role: 'spring',
      rect: { x0: 216, x1: 264, y0: 402, y1: 408 },
      probes: [
        [226, 403],
        [240, 403],
        [254, 403],
      ],
      freezeTime: 2.4,
      meltTime: 2.0,
    },
  ],

  streams: [
    {
      id: 'torrent',
      spring: 'source',
      startFull: true,
      speed: 260,
      parts: [
        {
          run: [
            [217, 403.5],
            [202, 405],
          ],
        },
        { fall: { x: 197.5, top: 405, bottom: 568 }, blocksLight: true },
        {
          run: [
            [198, 570],
            [190, 567],
          ],
        },
      ],
    },
  ],
  beds: [
    [
      [187, 566],
      [196, 571.5],
      [208, 568],
    ],
  ],

  houses: [{ x: 140, baseY: 551, w: 13 }],
  lanterns: [{ x: 176, y: 541, baseY: 555 }],
  villagers: [
    { x: 128, y: 550, s: 0.8, dir: 1 },
    { x: 174, y: 554.5, s: 1.0, dir: -1 },
    { x: 300, y: 388, s: 1.0, dir: -1 },
  ],
  decor: [
    { type: 'raptor', layer: 'sky', x: 120, y: 250, r: 30, s: 0.6 },
    { type: 'ibex', x: 340, y: 362, s: 0.65, dir: -1 },
    { type: 'cairn', x: 4, y: 357, s: 0.4 },
    { type: 'marmots', x: 96, y: 416, s: 0.4 },
    { type: 'hare', x: 318, y: 378, s: 0.45, dir: -1 },
  ],

  hint(g) {
    const source = g.frosts[0];
    const [hamlet, crete] = g.mirrors;
    const [entry, back] = g.crystals;
    if (g.temple.lit) return '';
    if (source.amount < 0.5) {
      if (g.light && g.light.waterHits.length) return 'La chute brise la lumière, comme autrefois…';
      return 'Deux cristaux dorment derrière la chute. Il faudra deux lumières à la fois.';
    }
    if (!hamlet.lit) return 'Le hameau ne voit jamais le soleil. Une borne veille pour lui sur la crête…';
    if (!back.lit && !entry.lit) return 'L’œil de pierre éclaire le miroir du hameau : guide chaque reflet vers son cristal';
    if (!back.lit) return 'Le cristal du fond attend un reflet venu du hameau';
    if (!entry.lit) return crete.lit ? 'Le cristal de l’entrée attend un reflet venu de la crête' : 'Le miroir de la crête a besoin de soleil';
    return 'Les deux cristaux, ensemble…';
  },

  memory: {
    number: 'VI',
    title: 'L’Œil',
    text:
      '« La pierre voyait pour nous. Ce que le soleil lui disait sur la crête, ' +
      'elle le répétait au fond de la vallée. »',
    tech: 'Technologie retrouvée : le conduit de lumière',
  },
};
