// Niveau 8 — « La veillée »
//
// Un petit lac. Le village veille sur la rive gauche, sous la grotte du
// sanctuaire. Sur l'autre rive, un socle attend sous une avancée de roche.
// Un porteur de miroir voudrait traverser, mais il n'y a pas de nuage : seule
// la nuit peut geler le lac. Et la nuit, il n'y a plus de soleil à renvoyer.
// Nouveautés : le soleil peut se coucher ; le cristal-mémoire garde la
// lumière du jour et la rend la nuit (de jour, sa lueur ne se voit pas).
// Il y en a deux : l'un au village, l'autre près du socle.
//
// Solution prévue :
//  1. de jour, le cristal-mémoire du village se charge seul au soleil ;
//  2. viser celui de l'autre rive avec le miroir du village : le soleil ne
//     l'atteint jamais, seul ce reflet le charge ;
//  3. coucher le soleil : le lac gèle, le porteur traverse et pose son miroir ;
//  4. de nuit : miroir du socle → un cristal, avec la lueur de l'autre rive ;
//     miroir du village → l'autre cristal, avec la lueur du village.
// Si une lueur s'éteint avant la fin, on refait le jour pour la recharger.

import { terrain } from './terrain.js';

const relief = terrain([
  { pts: [[-3000, 200], [-40, 200], [-6, 244], [20, 294], [36, 340]], rough: 1, snow: true }, // versant de gauche
  { pts: [[36, 340], [54, 380], [70, 430], [76, 460], [72, 478]] }, // au-dessus de la grotte, en visière
  { pts: [[72, 478], [56, 446], [30, 436], [8, 444], [0, 470], [6, 500]], cave: true }, // voûte de la grotte
  { pts: [[6, 500], [30, 500], [52, 506], [70, 512]], cave: true }, // son sol
  { pts: [[70, 512], [76, 536], [82, 552]] },
  { pts: [[82, 552], [104, 556], [136, 558]], snow: true }, // la rive du village
  { pts: [[136, 558], [146, 574], [172, 584], [206, 584], [232, 574], [242, 558]] }, // le lit du lac
  { pts: [[242, 558], [264, 556], [290, 556], [316, 554]], snow: true }, // l'autre rive
  { pts: [[316, 554], [324, 530], [318, 510]] },
  { pts: [[318, 510], [290, 504], [262, 504], [226, 512]] }, // le dessous de l'avancée de roche
  { pts: [[226, 512], [240, 484], [266, 456], [292, 416], [314, 376], [340, 332], [372, 290], [420, 250], [3000, 250]], rough: 9, snow: true }, // versant de droite
]);

export default {
  id: 8,
  number: '8',
  title: 'La veillée',
  size: { w: 360, h: 720 },

  // max dépasse 180° : le soleil peut descendre derrière la montagne de gauche.
  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 192, start: 70, radius: 13 },
  // Pas de nuage : seule la nuit fait de l'ombre sur le lac.

  ...relief,

  mirrors: [
    { id: 'village', x: 130, y: 543, angle: -35, len: 22, mount: { type: 'pole', baseY: 558 } },
    { id: 'socle', x: 294, y: 534, angle: 60, len: 22, carried: true, mount: { type: 'none' } },
  ],
  pedestals: [{ x: 294, baseY: 555, topY: 536 }],

  // Deux cristaux enchâssés dans la grotte.
  temple: {
    crystals: [
      { x: 44, y: 484, r: 7.5 },
      { x: 22, y: 458, r: 7.5 },
    ],
  },

  // Les cristaux-mémoire : chargeTime = secondes pour les charger ; hold =
  // secondes avant qu'ils s'éteignent ; range = portée de leur lueur.
  memories: [
    { id: 'village', x: 112, y: 537, r: 7, baseY: 557, chargeTime: 2.5, hold: 75, range: 70 },
    { id: 'rive', x: 268, y: 536, r: 7, baseY: 556, chargeTime: 2.5, hold: 75, range: 70 },
  ],

  basins: [{ id: 'lac', x0: 136, x1: 242, floor: 584, low: 562 }],
  frosts: [
    {
      id: 'glace',
      role: 'bridge',
      rect: { x0: 136, x1: 242, y0: 559.5, y1: 566 },
      probes: [
        [160, 561],
        [189, 561],
        [218, 561],
      ],
      freezeTime: 3.2,
      meltTime: 2.6,
    },
  ],

  walkers: [
    {
      id: 'porteur',
      path: [
        [118, 557.5],
        [133, 558],
        [139, 560],
        [239, 560],
        [245, 558],
        [281, 556],
      ],
      bridge: { frost: 'glace', from: 1, to: 4 },
      carries: 'socle',
      speed: 20,
      s: 1.05,
    },
  ],

  houses: [{ x: 94, baseY: 555, w: 12 }],
  lanterns: [],
  villagers: [
    { x: 104, y: 556, s: 0.8, dir: 1 },
    { x: 306, y: 555, s: 1.0, dir: -1 },
  ],
  decor: [
    { type: 'raptor', layer: 'sky', x: 200, y: 230, r: 30, s: 0.6 },
    { type: 'ibex', x: 330, y: 348, s: 0.6, dir: -1 },
    { type: 'cairn', x: 252, y: 557.5, s: 0.4 },
    { type: 'bush', x: 22, y: 298, s: 0.5 },
  ],

  hint(g) {
    const [mVillage, mShore] = g.memories;
    const porter = g.walkers[0];
    const [village, placed] = g.mirrors;
    const night = g.light && g.light.sunHidden;
    if (g.temple.lit) return '';
    if (!porter.done) {
      if (night) return g.frosts[0].amount > 0.05 ? 'La nuit fige le lac…' : 'La nuit tombe…';
      if (mShore.charge < 0.9) return 'Pas de nuage ici : seule la nuit gèlera le lac. Mais la nuit, d’où viendra la lumière ? Ces cristaux gardent celle du jour.';
      return 'Les deux cristaux ont bu le jour. Couche le soleil, tout à gauche.';
    }
    if (!night) return 'Le miroir est posé. Les cristaux ne rendent leur lumière que dans le noir.';
    if (mShore.charge < 0.15 || mVillage.charge < 0.15) return 'Une lueur s’est éteinte. Refais le jour pour la rallumer : rien n’est perdu.';
    if (!g.crystals.some((c) => c.lit)) return 'Chaque miroir a sa lueur : guide-les vers les cristaux du sanctuaire';
    if (!placed.lit || !village.lit) return 'Un miroir attend sa lueur';
    return 'Un cristal brille. L’autre miroir, maintenant.';
  },

  memory: {
    number: 'VIII',
    title: 'La Veillée',
    text:
      '« La nuit n’était pas la fin du jour. Nous en gardions un peu dans la pierre, ' +
      'et nous le rallumions quand tout dormait. »',
    tech: 'Technologie retrouvée : le cristal-mémoire',
  },
};
