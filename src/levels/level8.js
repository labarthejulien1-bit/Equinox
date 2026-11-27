// Niveau 8 — « La veillée »
//
// Un petit lac. Le village veille sur la rive gauche, sous la grotte du
// sanctuaire. Sur l'autre rive, un socle attend sous une avancée de roche.
// Un porteur de miroir voudrait traverser, mais il n'y a pas de nuage : seule
// la nuit peut geler le lac. Et la nuit, il n'y a plus de soleil à renvoyer.
// Nouveautés : le soleil peut se coucher ; le cristal-mémoire (une lanterne
// d'ambre) garde la lumière du jour et la rend la nuit (de jour, sa lueur ne
// se voit pas). Il y en a deux : l'une au village, l'autre suspendue sous la
// roche de l'autre rive.
//
// Solution prévue :
//  1. de jour, la lanterne du village se remplit seule au soleil ;
//  2. viser celle de l'autre rive avec le miroir du village : le soleil ne
//     l'atteint jamais, seul ce reflet la remplit ;
//  3. coucher le soleil : le lac gèle, le porteur traverse et pose son miroir ;
//  4. de nuit : miroir du socle → le cristal du fond de la grotte, avec la
//     lueur de l'autre rive ; miroir du village → le cristal de la voûte,
//     avec la lueur du village.
// Si une lueur s'éteint avant la fin, on refait le jour pour la recharger.
//
// À CHAQUE MIROIR SON CRISTAL. Les deux cristaux sont placés pour qu'aucun
// miroir ne puisse les éclairer tous les deux :
//  - celui de la voûte n'est visible que d'en bas (le miroir du village) :
//    la visière de roche le cache au miroir d'en face ;
//  - celui du fond n'est visible que de loin, presque à l'horizontale (le
//    miroir du socle) : le seuil de la grotte le cache au miroir du village.
// (Avant cela, les deux cristaux étaient côte à côte : en plein jour, le
// miroir du village les allumait d'un seul reflet et le niveau se gagnait
// sans la nuit. Le test vérifie maintenant que c'est impossible.)

import { terrain } from './terrain.js';

const relief = terrain([
  { pts: [[-3000, 200], [-40, 200], [-6, 244], [20, 294], [36, 340]], rough: 1, snow: true }, // versant de gauche
  { pts: [[36, 340], [54, 380], [70, 430], [76, 460], [72, 478]] }, // au-dessus de la grotte, en visière
  { pts: [[72, 478], [56, 446], [30, 436], [8, 444], [0, 470], [6, 508]], cave: true }, // voûte de la grotte
  { pts: [[6, 508], [28, 508], [52, 506], [70, 512]], cave: true }, // son sol, qui descend vers le fond
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
  nightWatch: true, // ce soir, le village ne rentre pas : il veille près du feu
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

  // Deux cristaux enchâssés dans la grotte : [0] au fond, près du sol (pour le
  // miroir du socle) ; [1] dans la voûte (pour le miroir du village).
  temple: {
    crystals: [
      { x: 15, y: 502, r: 7 },
      { x: 40, y: 446, r: 7 },
    ],
  },

  // Les cristaux-mémoire : chargeTime = secondes pour les charger ; hold =
  // secondes avant qu'ils s'éteignent ; range = portée de leur lueur.
  memories: [
    { id: 'village', x: 112, y: 537, r: 7, baseY: 557, chargeTime: 2.5, hold: 75, range: 70 },
    // (celle de l'autre rive pend sous l'avancée de roche : posée au sol, elle
    // se trouverait sur le trajet du reflet qu'elle allume)
    { id: 'rive', x: 268, y: 514, r: 7, hang: 504, chargeTime: 2.5, hold: 75, range: 70 },
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
    { type: 'raptor', layer: 'sky', x: 200, y: 230, r: 30, s: 0.6, perch: [252, 548.7] },
    { type: 'ibex', x: 259.2, y: 462.7, s: 0.6, dir: -1, path: [[240, 484, 'rest'], [246.8, 477.3], [252.5, 469.5], [259.2, 462.7, 'rest'], [266, 456], [272.9, 446.2]] },
    { type: 'cairn', x: 252, y: 557.5, s: 0.4 },
    { type: 'bush', x: 22, y: 298, s: 0.5 },
    { type: 'flowers', x: 260, y: 556.4, s: 0.9, n: 3 },
    { type: 'flowers', x: 60, y: 508.7, s: 0.9, n: 3 },
    { type: 'flowers', x: 312, y: 554.3, s: 0.9, n: 3 },
    { type: 'owl', x: 94, y: 548.8, s: 0.55 },
    { type: 'eyes', x: 34, y: 500, s: 0.8 },
  ],
  // Brume du petit matin et de la nuit.
  mists: [
    { x0: 139, x1: 239, y: 562 },
  ],
  // Où les fleurs poussent quand le monde revient à la vie (en plus du bord de l'eau).
  blooms: [
    [[84, 552.4], [104, 556], [134, 557.9]],
    [[244, 557.8], [290, 556], [314, 554.2]],
  ],

  // Les objectifs secondaires : une médaille chacun (cuivre, argent, or).
  goals: [
    { id: 'perchoir', type: 'perch', title: 'Le rapace s’est posé', text: 'Couche le soleil : le rapace rejoint son perchoir' },
    { id: 'etoile', type: 'star', title: 'Une étoile filante est passée', text: 'Reste dans la nuit jusqu’à voir une étoile filante' },
    { id: 'nuit', type: 'night', title: 'Les veilleurs de la nuit t’ont vu', text: 'Dans la même nuit, touche la chouette et les yeux qui brillent dans la grotte' },
  ],

  hint(g) {
    const [mVillage, mShore] = g.memories;
    const porter = g.walkers[0];
    const [village, placed] = g.mirrors;
    const night = g.light && g.light.sunHidden;
    if (g.temple.lit) return '';
    if (!porter.done) {
      if (night) return g.frosts[0].amount > 0.05 ? 'La nuit fige le lac…' : 'La nuit tombe…';
      if (mShore.charge < 0.9) return 'Seule la nuit gèlera le lac. Les deux lanternes d’ambre gardent la lumière du jour : remplis-les avant de coucher le soleil.';
      return 'Les deux lanternes sont pleines. Couche le soleil, tout à gauche.';
    }
    if (!night) return 'Le miroir est posé. Les lanternes ne rendent leur lumière que dans le noir.';
    if (mShore.charge < 0.15 || mVillage.charge < 0.15) return 'Une lanterne s’est éteinte. Refais le jour pour la remplir : rien n’est perdu.';
    if (!placed.lit || !village.lit) return 'Un miroir attend la lueur de sa lanterne';
    if (!g.crystals.some((c) => c.lit)) return 'À chaque miroir son cristal : celui d’en face vise le fond de la grotte, celui du village vise la voûte';
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
