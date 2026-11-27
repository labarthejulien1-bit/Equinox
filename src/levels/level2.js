// Niveau 2 — « Le rideau d'eau »
//
// Un cirque glaciaire : un petit lac retenu par une barre rocheuse (un
// « verrou »), d'où tombe une cascade. Le temple est dans une grotte, juste
// derrière la chute : elle brise la lumière.
// Nouvelle règle : l'ombre gèle l'eau calme.
//
// Solution prévue :
//  1. viser le temple avec le miroir : le faisceau se brise dans la cascade ;
//  2. amener l'ombre du nuage sur le lac, en haut de la barre : il gèle et la
//     cascade se tarit ;
//  3. garder le lac à l'ombre ET le miroir au soleil, puis viser le temple.

import { terrain } from './terrain.js';

// Le relief, de la gauche vers la droite (voir terrain.js).
const relief = terrain([
  { pts: [[-3000, 372], [-50, 372], [-8, 440], [20, 510], [44, 548]], rough: 11, snow: true }, // versant de gauche
  { pts: [[44, 548], [80, 556], [118, 562], [142, 572]], rough: 12, amp: 0.03, depth: 1, snow: true }, // la moraine du village
  { pts: [[142, 572], [164, 592], [186, 608], [202, 616]], rough: 13, amp: 0.04, depth: 1, snow: true }, // pente vers le torrent
  { pts: [[202, 616], [218, 622], [236, 618]] }, // la vasque au pied de la chute
  { pts: [[236, 618], [243, 596], [241, 576], [246, 560]] },
  { pts: [[246, 560], [270, 556], [302, 552], [334, 548]], cave: true }, // sol de la grotte
  { pts: [[334, 548], [342, 520], [328, 494], [300, 480], [268, 474], [248, 472]], cave: true }, // sa voûte
  { pts: [[248, 472], [243, 452], [247, 440], [236, 434], [226, 430]] }, // la barre rocheuse, en surplomb
  { pts: [[226, 430], [238, 427]], snow: true }, // le rebord d'où tombe l'eau
  { pts: [[238, 427], [242, 433.5], [292, 434], [296, 427]] }, // la cuvette du lac
  { pts: [[296, 427], [314, 412], [330, 380], [342, 330], [352, 270], [360, 200], [374, 140], [404, 90], [3000, 90]], rough: 19, snow: true }, // la paroi du cirque
]);

export default {
  id: 2,
  number: '2',
  title: 'Le rideau d’eau',
  size: { w: 360, h: 720 },

  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 100, radius: 13 },
  cloud: { y: 222, minX: 44, maxX: 316, startX: 70, w: 80, h: 28 },

  ...relief,

  mirrors: [{ id: 'village', x: 116, y: 540, angle: -20, len: 26, mount: { type: 'pole', baseY: 562 } }],

  // Le temple est plus petit que celui du niveau 1 : la grotte est basse.
  temple: { x: 304, baseY: 552, scale: 0.8, crystal: { x: 303, y: 532, r: 8 } },

  // Le lac : une eau calme, qui gèle à l'ombre et dégèle au soleil.
  // probes = points témoins : s'ils voient tous de l'ombre, l'eau gèle.
  frosts: [
    {
      id: 'source',
      role: 'spring',
      rect: { x0: 242, x1: 292, y0: 428, y1: 434 },
      probes: [
        [252, 429],
        [267, 429],
        [282, 429],
      ],
      freezeTime: 2.4,
      meltTime: 2.0,
    },
  ],

  // Le torrent naît du lac, tombe devant la grotte, finit dans la vasque.
  streams: [
    {
      id: 'torrent',
      drain: { x: 205, y: 617.6, floor: true }, // la perte où l'eau s'enfonce
      spring: 'source', // il s'arrête quand le lac est gelé
      startFull: true,
      speed: 260,
      parts: [
        {
          run: [
            [243, 429.5],
            [228, 431],
          ],
        },
        { fall: { x: 223.5, top: 431, bottom: 620 }, blocksLight: true },
        {
          run: [
            [223, 622],
            [206, 618.5],
          ],
        },
      ],
    },
  ],
  beds: [
    [
      [204, 618],
      [218, 623.5],
      [234, 620],
    ],
  ],

  houses: [{ x: 76, baseY: 556, w: 22 }],
  lanterns: [{ x: 134, y: 553, baseY: 568 }],
  villagers: [
    { x: 100, y: 560, s: 1.0, dir: 1 },
    { x: 128, y: 566, s: 0.8, dir: -1 },
    { x: 270, y: 428, s: 1.0, dir: 1 },
  ],
  decor: [
    { type: 'raptor', layer: 'sky', x: 110, y: 330, r: 30, s: 0.6, perch: [57, 541.2] },
    { type: 'ibex', x: 37.1, y: 539.1, s: 0.7, path: [[12.6, 492.7], [20, 510, 'hop'], [26.4, 519.3], [31.2, 529.5], [37.1, 539.1], [43.5, 547.4, 'rest']] },
    { type: 'cairn', x: 57, y: 551.1, s: 0.45 },
    { type: 'marmots', x: 164, y: 592, s: 0.45, to: [186, 608] },
    { type: 'hare', x: 308, y: 416.1, s: 0.5, dir: -1, range: [[297.5, 425.5], [314, 412]] },
    { type: 'bush', x: 9, y: 482.3, s: 0.55 },
    { type: 'flowers', x: 108.5, y: 560.4, s: 0.9, n: 3 },
    { type: 'flowers', x: 140, y: 571, s: 0.9, n: 3 },
    { type: 'flowers', x: 272, y: 555.7, s: 0.9, n: 3 },
    { type: 'owl', x: 76, y: 544.4, s: 0.55 },
    { type: 'eyes', x: 254, y: 553.5, s: 0.8 },
  ],
  // Brume du petit matin et de la nuit.
  mists: [
    { x0: 244, x1: 290, y: 429 },
    { x0: 198, x1: 238, y: 620 },
  ],
  // Où les fleurs poussent quand le monde revient à la vie (en plus du bord de l'eau).
  blooms: [
    [[96, 558.4], [118, 562], [142, 572]],
    [[250, 559.3], [270, 556], [284, 554.3]],
  ],
  // L'eau dans la roche, vue en coupe (décor : voir src/game/underground.js).
  // En amont : la neige du versant s'infiltre en filets, qui se rejoignent et nourrissent la source.
  veins: [
    { width: 3, path: [[345, 318], [350, 345], [352, 372]] },
    { width: 3, path: [[366, 338], [352, 372]] },
    { width: 3, path: [[338, 356], [344, 366], [352, 372]] },
    { width: 5.5, path: [[352, 372], [336, 398], [316, 424], [293.5, 432.5]] },
  ],
  // En aval : l'eau s'enfonce au pied de la cascade, remplit une nappe sous la pente, puis repart vers le bas.
  aquifers: [
    { stream: 'torrent', inlet: [[205, 619], [196, 632], [184, 645]], cavern: [[128, 664], [136, 650], [152, 643], [170, 647], [184, 642], [194, 652], [196, 668], [186, 680], [164, 685], [142, 682], [131, 674]], low: 684, high: 661, fillTime: 18, stalactites: [[146, 645.5, 7], [166, 646.5, 6], [182, 643, 7]], outlet: [[130, 663], [104, 684], [70, 716], [40, 752]] },
  ],

  // Les objectifs secondaires : une médaille chacun (cuivre, argent, or).
  goals: [
    { id: 'rapace', type: 'raptor', title: 'Le rapace a crié', text: 'Touche le rapace en plein vol' },
    { id: 'sentinelle', type: 'whistle', by: 'beam', title: 'La sentinelle a sifflé', text: 'Pose un reflet sur les marmottes : la sentinelle siffle' },
    { id: 'buisson', type: 'flower', n: 0, title: 'Le buisson a fleuri dans l’ombre', text: 'Réveille le buisson du bord gauche avec un reflet, quand il est à l’ombre' },
  ],

  hint(g) {
    const source = g.frosts[0];
    const mirror = g.mirrors[0];
    if (g.temple.lit) return '';
    if (source.amount < 0.5) {
      if (g.light && g.light.waterHits.length) return 'La cascade brise la lumière en mille éclats…';
      if (!g.touched.mirror) return 'Le torrent tombe devant le temple. Essaie le miroir.';
      return 'L’ombre garde le froid : là où elle se pose, l’eau calme gèle';
    }
    if (!mirror.lit) return 'Le lac dort sous la glace. Le miroir, lui, a besoin de soleil.';
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
