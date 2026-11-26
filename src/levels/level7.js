// Niveau 7 — « La corniche »
//
// Le village est sur une moraine, au bord d'un glacier. Le glacier mène au
// pied d'un contrefort rocheux, où s'ouvre la rimaye : la grande crevasse qui
// sépare la glace du rocher. Un porteur de miroir attend au bord du glacier.
// Deux corniches de neige :
//   - celle du bas, à l'abri sous le rocher : si elle tombe, elle comble la
//     rimaye ;
//   - celle du haut, sur le rebord, en plein soleil : si elle tombe trop tôt,
//     elle barre le chemin du porteur. Mais elle cache un miroir ancien.
// Le sanctuaire a deux cristaux : l'un au fond d'une cheminée, au-dessus du
// socle ; l'autre dans une niche, sous un bec de roche, que seul un reflet
// montant depuis le rebord peut atteindre.
// Nouveauté : la neige qui tombe quand on la chauffe.
//
// Solution prévue :
//  1. garder la corniche du haut à l'ombre du nuage ;
//  2. viser celle du bas avec le miroir du village : elle comble la rimaye ;
//  3. le porteur traverse et pose son miroir sur le socle ;
//  4. écarter le nuage : la corniche du haut tombe et libère le miroir ancien ;
//  5. village → socle → cristal de la cheminée ; miroir ancien → cristal de
//     la niche.

import { terrain } from './terrain.js';
import { toPoints } from '../engine/vec.js';

const relief = terrain([
  { pts: [[-2640, 160], [-60, 160], [-24, 196], [16, 236], [42, 280], [62, 320], [80, 360], [98, 396], [108, 420]], rough: 9, amp: 0.04, snow: true }, // la paroi
  { pts: [[108, 420], [90, 414], [74, 416], [68, 430], [74, 442], [98, 446], [110, 450]], cave: true }, // la niche du second cristal, sous un bec de roche
  { pts: [[110, 450], [124, 458], [146, 474], [154, 492]], snow: true }, // son rebord, où s'accroche la corniche du haut
  { pts: [[154, 492], [110, 482], [78, 484], [54, 488]] }, // le dessous du rocher
  { pts: [[54, 488], [56, 460], [52, 428], [38, 432], [34, 460], [38, 496]] }, // la cheminée du premier cristal
  { pts: [[38, 496], [34, 516], [44, 540]] },
  { pts: [[44, 540], [68, 542], [90, 544]] }, // le replat du socle, sous le rocher
  { pts: [[90, 544], [95, 584], [99, 616], [104, 584], [108, 546]], cave: true }, // la rimaye
  { pts: [[108, 546], [132, 540], [164, 532], [200, 522]], snow: true }, // le glacier
  { pts: [[200, 522], [230, 516], [260, 508]], snow: true }, // la moraine du village
  { pts: [[260, 508], [284, 470], [320, 410], [360, 360], [400, 330], [3360, 330]], rough: 1, amp: 0.04, snow: true }, // versant du village
]);

export default {
  id: 7,
  number: '7',
  title: 'La corniche',
  size: { w: 360, h: 720 },

  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 60, radius: 13 },
  // Un petit nuage bas. Au départ, son ombre protège la corniche du haut.
  cloud: { y: 330, minX: 60, maxX: 300, startX: 180, w: 92, h: 28 },

  ...relief,

  mirrors: [
    { id: 'village', x: 208, y: 506, angle: 4, len: 24, mount: { type: 'pole', baseY: 521 } },
    // Porté par le villageois jusqu'au socle.
    { id: 'socle', x: 50, y: 516, angle: 45, len: 22, carried: true, mount: { type: 'none' } },
    // Pris dans la corniche du haut : libéré quand elle tombe.
    { id: 'ancien', x: 140, y: 452, angle: 20, len: 24, frozen: 'cornicheHaut', mount: { type: 'pole', baseY: 470 } },
  ],
  pedestals: [{ x: 50, baseY: 541, topY: 518 }],

  // Deux cristaux enchâssés dans la roche : [0] la cheminée, [1] la niche.
  temple: {
    crystals: [
      { x: 45, y: 446, r: 7.5 },
      { x: 84, y: 430, r: 7.5 },
    ],
  },

  // Les neiges. `look: 'snow'` les dessine en blanc ; `after` : le tas
  // n'apparaît que lorsque la corniche du haut est tombée.
  ices: [
    { id: 'cornicheBas', look: 'snow', points: toPoints([[90, 544], [102, 538], [106, 528], [98, 520], [82, 522], [72, 534], [72, 544]]), meltTime: 2.6 },
    { id: 'cornicheHaut', look: 'snow', points: toPoints([[124, 458], [142, 464], [158, 474], [168, 488], [162, 470], [150, 458], [132, 448]]), meltTime: 3 },
    { id: 'tas', look: 'snow', after: 'cornicheHaut', points: toPoints([[176, 529.5], [164, 516], [148, 511], [134, 517], [124, 542], [150, 535.5]]), meltTime: 9 },
  ],
  // La neige de la corniche du bas, une fois tombée dans la rimaye.
  fills: [{ after: 'cornicheBas', points: [[108, 546], [90, 544], [94, 570], [99, 590], [104, 570]] }],

  walkers: [
    {
      id: 'porteur',
      path: [[220, 518], [180, 527.6], [132, 540], [110, 546], [88, 544], [63, 542]],
      // Il attend au bord du glacier (le 2e point de son chemin) tant que la
      // rimaye n'est pas comblée, ou qu'un tas de neige barre le passage.
      gates: [
        { at: 1, needs: 'cornicheBas' },
        { at: 1, blockedBy: 'tas' },
      ],
      carries: 'socle',
      speed: 20,
      s: 1.05,
    },
  ],

  houses: [{ x: 238, baseY: 514, w: 14 }],
  lanterns: [{ x: 256, y: 494, baseY: 509 }],
  villagers: [
    { x: 224, y: 517.5, s: 0.8, dir: -1 },
    { x: 268, y: 496, s: 1.0, dir: -1 },
  ],
  decor: [
    { type: 'raptor', layer: 'sky', x: 230, y: 250, r: 30, s: 0.6 },
    { type: 'ibex', x: 10, y: 228, s: 0.6 },
    { type: 'cairn', x: 194, y: 523, s: 0.4 },
    { type: 'marmots', x: 330, y: 396, s: 0.4, dir: -1 },
    { type: 'bush', x: 300, y: 444, s: 0.45 },
  ],

  hint(g) {
    const [low, high, heap] = g.ices;
    const porter = g.walkers[0];
    const [village, placed, ancient] = g.mirrors;
    const [chimney, niche] = g.crystals;
    if (g.temple.lit) return '';
    if (!porter.done) {
      if (heap.active && !heap.gone) return 'La neige du haut est tombée sur le chemin. Elle fondra au soleil : patience.';
      if (!low.gone) {
        if (low.heating) return 'La corniche cède…';
        return 'Le porteur n’ose pas s’engager : une crevasse coupe le glacier. La neige d’en bas pourrait la combler ; celle d’en haut doit rester à l’ombre.';
      }
      return 'La neige porte ses pas…';
    }
    if (!high.gone) return 'Le porteur est passé. La corniche du haut ne gêne plus personne… et elle cache quelque chose.';
    if (!placed.lit) return village.lit ? 'Envoie la lumière du village au miroir du socle' : 'Le miroir du village attend la lumière';
    if (!chimney.lit) return 'Le cristal de la cheminée est juste au-dessus du socle';
    if (!niche.lit) return ancient.lit ? 'Le miroir ancien peut atteindre la niche, sous le bec de roche' : 'Le miroir ancien attend le soleil';
    return 'Les deux cristaux, ensemble…';
  },

  memory: {
    number: 'VII',
    title: 'La Neige',
    text:
      '« Ils savaient attendre. Ce qui menace aujourd’hui servira demain : ' +
      'il suffit de le garder à l’ombre jusqu’à son heure. »',
    tech: 'Savoir retrouvé : l’ordre des gestes',
  },
};
