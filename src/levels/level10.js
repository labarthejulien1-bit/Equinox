// Niveau 10 — « Le grand glacier »
//
// Le grand glacier descend de la crête jusqu'à un petit lac : la source. Sa
// chute tombe sur toute la hauteur de la paroi. Le sanctuaire est dans cette
// paroi, avec TROIS cristaux, à éclairer en même temps :
//   - en haut, sous la voûte de glace d'où sort l'eau : pour le miroir sur
//     rail, sur la vire d'en face ;
//   - au milieu, dans une chambre derrière une étroite fenêtre de pierre,
//     cachée par la chute : seul un reflet montant, venu du village, y entre ;
//   - en bas, dans une grotte au pied de la chute : pour un troisième miroir,
//     pris dans un bloc de glace tombé du glacier.
//
// Solution prévue :
//  1. viser le bloc de glace avec le miroir du village : il fond et libère
//     le troisième miroir ;
//  2. mettre le nuage sur le lac : il gèle, la chute se tarit, la fenêtre et
//     la grotte du bas sont dégagées ;
//  3. régler le soleil et la place du miroir sur rail : son reflet atteint le
//     cristal du haut ;
//  4. le soleil a bougé : replacer le nuage pour que le lac reste à l'ombre,
//     sans que son ombre tombe sur un des trois miroirs ;
//  5. miroir du village → cristal du milieu ; troisième miroir → cristal du
//     bas.
// Quand le sanctuaire s'allume, le grand glacier fond : c'est la source.

import { terrain } from './terrain.js';
import { toPoints } from '../engine/vec.js';

const relief = terrain([
  { pts: [[-3000, 200], [-40, 200], [-12, 270], [10, 356]], rough: 1, amp: 0.04, snow: true }, // versant de gauche
  { pts: [[10, 356], [40, 360], [72, 364]], snow: true }, // la vire du rail
  { pts: [[72, 364], [82, 420], [78, 480], [92, 540], [104, 582]] },
  { pts: [[104, 582], [150, 586], [190, 586]], snow: true }, // le village, au fond de la vallée
  { pts: [[190, 586], [196, 598], [212, 600], [222, 588]] }, // la vasque au pied de la chute
  { pts: [[222, 588], [250, 586], [276, 582], [282, 562], [274, 546], [250, 542], [226, 546], [218, 552]], cave: true }, // la grotte du bas
  { pts: [[218, 552], [224, 520], [222, 490]] },
  { pts: [[222, 490], [226, 490], [232, 502], [262, 502], [270, 472], [262, 440], [242, 436], [230, 450], [226, 474], [222, 474]], cave: true }, // la fenêtre de pierre et sa chambre
  { pts: [[222, 474], [216, 440], [218, 380], [210, 356], [200, 336]] }, // la paroi
  { pts: [[200, 336], [214, 333]], snow: true },
  { pts: [[214, 333], [218, 339.5], [264, 340], [268, 333]] }, // la cuvette du lac
  { pts: [[268, 333], [286, 330], [302, 326]] }, // le replat, sous la voûte de glace
  { pts: [[302, 326], [318, 290], [338, 240], [360, 196], [384, 160], [420, 130], [3000, 130]], rough: 9, amp: 0.03, depth: 1 }, // le lit du glacier
]);

export default {
  id: 10,
  number: '10',
  title: 'Le grand glacier',
  size: { w: 360, h: 720 },

  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 70, radius: 13 },
  cloud: { y: 230, minX: 44, maxX: 316, startX: 70, w: 72, h: 26 },

  ...relief,

  mirrors: [
    { id: 'village', x: 150, y: 568, angle: -55, len: 24, mount: { type: 'pole', baseY: 586 } },
    {
      id: 'rail',
      x: 0,
      y: 0,
      angle: 50, // fixe : c'est le soleil et le rail qui règlent le reflet
      len: 24,
      rail: { x0: 20, y0: 358, x1: 66, y1: 363, height: 16, start: 0.1 },
      mount: { type: 'rail' },
    },
    // Pris dans un bloc de glace tombé du glacier.
    { id: 'tiers', x: 180, y: 575, angle: 150, len: 18, frozen: 'bloc', mount: { type: 'pole', baseY: 586 } },
  ],

  // [0] en haut (rail), [1] au milieu (village), [2] en bas (troisième miroir).
  temple: {
    crystals: [
      { x: 284, y: 318, r: 7.5 },
      { x: 250, y: 458, r: 7.5 },
      { x: 252, y: 566, r: 7.5 },
    ],
  },

  ices: [
    // Le grand glacier : il arrête la lumière, et ne fondra que lorsque le
    // sanctuaire sera rallumé (thaws).
    {
      id: 'glacier',
      thaws: true,
      points: toPoints([
        [302, 326],
        [298, 306],
        [282, 297],
        [264, 299],
        [252, 312],
        [244, 288],
        [264, 248],
        [290, 204],
        [316, 158],
        [346, 116],
        [392, 72],
        [426, 84],
        [402, 134],
        [366, 172],
        [342, 212],
        [322, 250],
        [306, 292],
      ]),
      meltTime: 9,
    },
    // Le bloc tombé du glacier : une glace dure, que seul un reflet fait fondre.
    {
      id: 'bloc',
      beamOnly: true,
      points: toPoints([
        [167, 587],
        [169, 562],
        [180, 553],
        [190, 562],
        [191, 587],
      ]),
      meltTime: 3,
    },
  ],

  frosts: [
    {
      id: 'source',
      role: 'spring',
      rect: { x0: 218, x1: 264, y0: 334, y1: 340 },
      probes: [
        [228, 335],
        [241, 335],
        [254, 335],
      ],
      freezeTime: 2.4,
      meltTime: 2.0,
    },
  ],

  streams: [
    {
      id: 'torrent',
      drain: { x: 198.5, y: 598.4, floor: true }, // la perte où l'eau s'enfonce
      spring: 'source',
      startFull: true,
      speed: 300,
      parts: [
        {
          run: [
            [219, 335.5],
            [207, 337],
          ],
        },
        { fall: { x: 205.5, top: 337, bottom: 598 }, blocksLight: true },
        {
          run: [
            [205, 600],
            [197, 597.5],
          ],
        },
      ],
    },
  ],
  beds: [
    [
      [194, 596],
      [204, 601.5],
      [218, 596],
    ],
  ],

  houses: [{ x: 126, baseY: 584, w: 13 }],
  lanterns: [{ x: 108, y: 568, baseY: 583 }],
  villagers: [
    { x: 138, y: 585.5, s: 0.8, dir: 1 },
    { x: 56, y: 362, s: 1.0, dir: 1 },
  ],
  decor: [
    { type: 'raptor', layer: 'sky', x: 130, y: 250, r: 30, s: 0.6, perch: [8, 347.7] },
    { type: 'ibex', x: -4, y: 262, s: 0.6 },
    { type: 'marmots', x: 158, y: 586, s: 0.4 },
    { type: 'cairn', x: 8, y: 356.5, s: 0.4 },
    { type: 'flowers', x: 232, y: 587.3, s: 0.9, n: 3 },
    { type: 'flowers', x: 270, y: 582.9, s: 0.9, n: 3 },
    { type: 'owl', x: 126, y: 577.3, s: 0.55 },
    { type: 'eyes', x: 234, y: 496, s: 0.8 },
  ],
  // Brume du petit matin et de la nuit.
  mists: [
    { x0: 220, x1: 262, y: 335 },
  ],
  // Où les fleurs poussent quand le monde revient à la vie (en plus du bord de l'eau).
  blooms: [
    [[106, 582.2], [150, 586], [188, 586]],
  ],
  // L'eau dans la roche, vue en coupe (décor : voir src/game/underground.js).
  // En amont : l'eau de fonte suinte sous le grand glacier et nourrit la source.
  veins: [
    { width: 3, path: [[300, 330.3], [282, 336], [265, 338.6]] },
  ],
  // En aval : l'eau s'enfonce au pied de la cascade, remplit une nappe sous le village, puis repart vers les plaines.
  aquifers: [
    { stream: 'torrent', inlet: [[199, 600], [188, 614], [176, 628]], cavern: [[98, 650], [106, 634], [124, 624], [146, 628], [164, 622], [180, 632], [184, 652], [174, 668], [146, 675], [118, 672], [102, 662]], low: 674, high: 643, fillTime: 18, stalactites: [[120, 625.5, 7], [142, 628, 6], [166, 623, 8]], outlet: [[183, 645], [214, 664], [262, 700], [320, 740], [352, 764]] },
  ],

  // Traits gravés qui relient les trois cristaux (ils s'illuminent à la victoire).
  conduits: [
    [
      [284, 330],
      [278, 400],
      [262, 446],
    ],
    [
      [256, 470],
      [264, 520],
      [256, 556],
    ],
  ],

  // Les objectifs secondaires : une médaille chacun (cuivre, argent, or).
  goals: [
    { id: 'rail', type: 'rail', title: 'Le miroir a parcouru son rail', text: 'Fais glisser le miroir du haut d’un bout à l’autre de son rail' },
    { id: 'sentinelle', type: 'whistle', by: 'shade', title: 'La sentinelle a sifflé', text: 'Fais passer l’ombre du nuage sur les marmottes qui prennent le soleil' },
    { id: 'rapace', type: 'dazzle', title: 'Le rapace est ébloui', text: 'Éblouis le rapace : fais passer un reflet sur lui' },
  ],

  hint(g) {
    const block = g.ices[1];
    const source = g.frosts[0];
    const [village, rail, third] = g.mirrors;
    const [top, middle, bottom] = g.crystals;
    const lit = g.crystals.filter((c) => c.lit).length;
    if (g.temple.lit) return '';
    if (!block.gone) return block.heating ? 'La glace fond…' : 'Trois cristaux, trois lumières. Un miroir dort dans la glace, près du village.';
    if (source.amount < 0.5) return 'La chute cache une fenêtre de pierre et une grotte. Il faudra la faire taire.';
    if (lit === 0) return 'Chaque cristal a son miroir : le rail pour le haut, le village pour la fenêtre, le troisième pour la grotte';
    if (!top.lit) return rail.lit ? 'Le cristal du haut : le soleil et le rail, ensemble' : 'Le miroir sur rail est à l’ombre';
    if (!middle.lit) return village.lit ? 'Le cristal du milieu : un reflet montant, par la fenêtre de pierre' : 'Le miroir du village est à l’ombre';
    if (!bottom.lit) return third.lit ? 'Le cristal du bas : le troisième miroir, au pied de la chute' : 'Le troisième miroir est à l’ombre';
    return 'Les trois cristaux, ensemble…';
  },

  memory: {
    number: 'X',
    title: 'La Source',
    text:
      '« Nous avons rangé le jour sous la glace. Quand trois lumières se rejoindront, ' +
      'elle rendra l’eau au monde, et l’eau descendra réveiller ceux d’en bas. »',
    tech: 'Le grand glacier fond : la source coule vers les plaines',
  },
};
