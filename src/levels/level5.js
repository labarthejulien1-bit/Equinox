// Niveau 5 — « L'aiguille »
//
// Les anciens ont laissé un miroir sur un rail, le long d'une vire (une
// corniche du versant), au pied d'une aiguille rocheuse. Le temple est en
// face, plus bas, sous un surplomb. Pas de nuage.
// Nouveauté : ce miroir ne tourne pas, il GLISSE sur son rail.
//
// Solution prévue :
//  1. la hauteur du soleil règle la direction du reflet : il faut l'amener
//     assez bas, à gauche, pour que le reflet parte vers le temple ;
//  2. la place du miroir sur le rail règle le point de départ du reflet :
//     trop à gauche, il est dans l'ombre de l'aiguille ou bute sur la vire ;
//     trop à droite, le reflet bute sur le surplomb ;
//  3. trouver la paire (soleil, place) qui passe sous le surplomb.

import { terrain } from './terrain.js';

const relief = terrain([
  { pts: [[-3000, 280], [-40, 280], [0, 322], [24, 380], [36, 432]], rough: 1, snow: true }, // versant de gauche
  // L'aiguille
  { pts: [[36, 432], [46, 444], [54, 422], [60, 390], [58, 360], [66, 322], [70, 286], [78, 256], [84, 280], [90, 306], [88, 330], [98, 364], [102, 400], [112, 432], [118, 457]] },
  { pts: [[118, 457], [150, 462], [186, 466], [214, 469]], snow: true }, // la vire, où court le rail
  { pts: [[214, 469], [232, 500], [240, 540], [250, 590], [266, 626]], rough: 4, amp: 0.04, depth: 1 }, // la pente sous la vire
  { pts: [[266, 626], [282, 634], [296, 628]], snow: true }, // le fond du vallon
  { pts: [[296, 628], [304, 590], [298, 560], [302, 538]] },
  { pts: [[302, 538], [322, 536], [350, 538]], cave: true }, // sol de la grotte
  { pts: [[350, 538], [358, 512], [350, 484], [328, 472], [304, 474], [282, 492]], cave: true }, // sa voûte, en surplomb
  { pts: [[282, 492], [290, 464], [308, 420], [332, 370], [358, 322], [400, 270], [3000, 270]], rough: 9, snow: true }, // versant de droite
]);

export default {
  id: 5,
  number: '5',
  title: 'L’aiguille',
  size: { w: 360, h: 720 },

  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 96, radius: 13 },
  // Pas de nuage : seule l'aiguille fait de l'ombre.

  ...relief,

  mirrors: [
    {
      id: 'rail',
      x: 0, // sa place est calculée d'après le rail (voir game.js, placeMirrors)
      y: 0,
      angle: 44.3, // fixe : c'est le soleil et le rail qui règlent le reflet
      len: 24,
      // Le rail : ses deux bouts, la hauteur du miroir au-dessus de lui, et
      // sa place au départ (0 = bout gauche, 1 = bout droit).
      rail: { x0: 128, y0: 459, x1: 208, y1: 468.5, height: 16, start: 0.12 },
      mount: { type: 'rail' },
    },
  ],

  temple: { x: 326, baseY: 537, scale: 0.75, crystal: { x: 325, y: 518, r: 7.5 } },

  // Ils attendent au fond du vallon : la vire est laissée au rail.
  villagers: [
    { x: 276, y: 631.5, s: 1.0, dir: -1 },
    { x: 288, y: 632, s: 0.8, dir: -1 },
  ],
  decor: [
    { type: 'raptor', layer: 'sky', x: 230, y: 250, r: 30, s: 0.6 },
    { type: 'ibex', x: 8, y: 334, s: 0.7 },
    { type: 'cairn', x: 222, y: 484, s: 0.4 },
    { type: 'hare', x: 338, y: 360, s: 0.45, dir: -1 },
  ],

  hint(g) {
    const mirror = g.mirrors[0];
    if (g.temple.lit) return '';
    if (!g.touched.rail) return 'Ce miroir ne tourne pas : fais-le glisser sur son rail';
    if (!mirror.lit) return 'L’aiguille lui fait de l’ombre. Le soleil, ou le miroir, doit bouger.';
    if (!g.touched.sun) return 'La hauteur du soleil change la direction du reflet';
    return 'Soleil et rail, ensemble : le reflet doit passer sous le surplomb';
  },

  memory: {
    number: 'V',
    title: 'Le Rail',
    text:
      '« Ils ne laissaient rien au hasard. Sur chaque vire, un miroir attendait le jour ' +
      'où quelqu’un saurait de nouveau le pousser vers la lumière. »',
    tech: 'Technologie retrouvée : le miroir sur rail',
  },
};
