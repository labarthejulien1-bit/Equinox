// Les petits décors qui font vivre le monde : animaux, cairns, buissons,
// fanions… Ils n'ont aucun effet sur l'énigme (ils ne bloquent pas la
// lumière), mais ils suivent la règle commune : une couleur au soleil, une
// couleur dans l'ombre (P est la palette du moment).
//
// Dans un niveau, on les pose ainsi :
//   decor: [{ type: 'ibex', x: 120, y: 273, s: 0.8, dir: -1 }, …]
// (x, y) est le point du sol sous le décor ; s sa taille ; dir = 1 s'il
// regarde à droite, -1 à gauche. Ajouter layer: 'sky' pour un décor du ciel.

import { TAU } from '../engine/vec.js';

function ellipse(c, x, y, rx, ry, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
  c.fill();
}

function shape(c, pts) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts) c.lineTo(x, y);
  c.closePath();
  c.fill();
}

/** Bouquetin : il tourne parfois la tête. */
function ibex(c, P, d, g) {
  const nod = Math.sin(g.time * 0.5 + d.x) > 0.6 ? 1.2 : 0;
  // Cornes (derrière la tête)
  c.strokeStyle = P.horn;
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(7, -22.5 + nod, 6.6, 0, -Math.PI * 0.95, true);
  c.stroke();
  c.fillStyle = P.fur;
  ellipse(c, 0, -11, 10, 5.2);
  shape(c, [
    [6, -14],
    [12, -21 + nod],
    [15, -18 + nod],
    [9, -9],
  ]);
  ellipse(c, 14.5, -20.5 + nod, 3.6, 2.4, 0.3);
  for (const x of [-8, -4, 4, 7.5]) c.fillRect(x, -8, 2, 8.5);
  ellipse(c, -10, -14, 1.8, 1.2);
  shape(c, [
    [13, -18.5 + nod],
    [14.5, -15 + nod],
    [15.5, -18.5 + nod],
  ]);
}

/** Deux marmottes : l'une fait le guet, l'autre est couchée. */
function marmots(c, P, d, g) {
  const up = Math.sin(g.time * 0.7 + d.x) > -0.4 ? 0 : 3; // elle se baisse de temps en temps
  c.fillStyle = P.fur;
  ellipse(c, 0, -8.5 + up, 4.6, 8.5 - up);
  ellipse(c, 0.5, -19 + up * 2, 3.6, 3.2);
  ellipse(c, -2.2, -21.6 + up * 2, 1, 1);
  ellipse(c, 3, -21.6 + up * 2, 1, 1);
  ellipse(c, 17, -3.6, 7, 3.6);
  ellipse(c, 24, -5.6, 3, 2.6);
}

/** Lièvre des neiges : blanc, il se fond dans la neige au soleil. */
function hare(c, P, d, g) {
  const twitch = Math.sin(g.time * 1.3 + d.x) > 0.9 ? 0.25 : 0;
  c.fillStyle = P.furWhite;
  ellipse(c, 0, -5, 7, 4.8);
  ellipse(c, 7, -10.5, 3.3, 2.9);
  ellipse(c, 6.4, -17, 1.2, 4.5, -0.2 - twitch);
  ellipse(c, 8.9, -16.6, 1.2, 4.5, 0.25 + twitch);
  ellipse(c, -7.2, -6.5, 1.8, 1.6);
  c.fillStyle = P.cloak;
  ellipse(c, 8.2, -11, 0.5, 0.5);
}

/** Cairn : des pierres empilées par ceux qui sont passés là. */
function cairn(c, P) {
  c.fillStyle = P.cairn;
  ellipse(c, 0, -3, 9, 4);
  ellipse(c, 0, -10, 7, 3.4);
  ellipse(c, 0.5, -16, 5.2, 2.8);
  ellipse(c, 0, -21, 3.4, 2.2);
}

/** Buisson à baies rouges, coiffé de neige. */
function bush(c, P) {
  c.fillStyle = P.leaf;
  ellipse(c, 0, -5, 10, 7.5);
  c.strokeStyle = P.snow;
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(0, -5, 8.6, Math.PI * 1.15, Math.PI * 1.6);
  c.stroke();
  c.fillStyle = P.berry;
  for (const [x, y] of [
    [-6, -4],
    [-1, -7.4],
    [4, -4.4],
    [-3, -1.6],
    [3, -1],
    [7, -3],
  ])
    ellipse(c, x, y, 1.2, 1.2);
}

/**
 * Fanions tendus entre deux points : { x, y, x1, y1, sag }.
 * Les couleurs sont celles du peuple : blanc, noir, or.
 */
function flags(c, P, d, g) {
  const sag = d.sag ?? 8;
  const mx = (d.x + d.x1) / 2;
  const my = (d.y + d.y1) / 2 + sag;
  const at = (t) => [
    (1 - t) * (1 - t) * d.x + 2 * (1 - t) * t * mx + t * t * d.x1,
    (1 - t) * (1 - t) * d.y + 2 * (1 - t) * t * my + t * t * d.y1,
  ];
  c.strokeStyle = P.trim;
  c.lineWidth = 0.7;
  c.beginPath();
  c.moveTo(d.x, d.y);
  c.quadraticCurveTo(mx, my, d.x1, d.y1);
  c.stroke();
  const colors = [P.trim, P.cloak, P.gold, P.trim, P.cloak];
  colors.forEach((color, i) => {
    const [x, y] = at((i + 0.8) / (colors.length + 0.6));
    const sway = Math.sin(g.time * 2.2 + i * 1.7) * 0.9; // un peu de vent
    c.fillStyle = color;
    shape(c, [
      [x - 2.4, y],
      [x + 2.4, y + 0.5],
      [x + sway, y + 6],
    ]);
  });
}

/** Grand rapace : il plane lentement dans le ciel. */
function raptor(c, P, d, g) {
  const a = g.time * 0.12 + d.x;
  const r = d.r ?? 30;
  const flap = Math.sin(g.time * 0.9) * 1.5;
  c.save();
  c.translate(Math.cos(a) * r, Math.sin(a * 2) * r * 0.22);
  c.scale(Math.sin(a) > 0 ? -1 : 1, 1); // il regarde là où il va
  c.fillStyle = P.bird;
  c.beginPath();
  c.moveTo(-28, flap);
  c.quadraticCurveTo(-14, -10, -2, 2);
  c.quadraticCurveTo(12, -12, 28, -4 + flap);
  c.quadraticCurveTo(14, -4, 4, 6);
  c.lineTo(-2, 9);
  c.lineTo(-7, 6);
  c.quadraticCurveTo(-18, -2, -28, flap);
  c.fill();
  c.restore();
}

const DRAW = { ibex, marmots, hare, cairn, bush, raptor };

/** Dessine un décor du niveau. */
export function drawDecor(c, P, d, g) {
  if (d.type === 'flags') return flags(c, P, d, g); // lui se décrit par deux points
  const draw = DRAW[d.type];
  if (!draw) return;
  const s = d.s ?? 1;
  c.save();
  c.translate(d.x, d.y);
  c.scale(s * (d.dir ?? 1), s);
  draw(c, P, d, g);
  c.restore();
}
