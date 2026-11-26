// La machine à eau : une roue à aubes, une chaîne sans fin, un contrepoids
// de pierre et la porte qu'ils ouvrent.
//
// Comment ça marche (et comment ça doit se LIRE à l'écran) :
//   1. l'eau pousse le bas de la roue : elle tourne dans le sens du courant ;
//   2. le pignon de son moyeu entraîne le pignon du bas de la chaîne, qui
//      tourne donc à l'envers ;
//   3. la chaîne monte jusqu'à un second pignon, au-dessus de la porte, et
//      redescend : un brin monte, l'autre descend ;
//   4. le contrepoids est accroché au brin qui monte, la porte à celui qui
//      descend : la pierre s'élève, la porte s'enfonce le long de la falaise.
//
// Ce fichier ne fait que dessiner. La règle (l'eau fait tourner la roue, qui
// ouvre la porte) est dans game.js ; un niveau n'a qu'à poser une roue au
// pied de sa porte :
//   wheels: [{ id, x, y, r, stream, door }]   doors: [{ id, x, top, bottom, w }]
// La roue doit être à moins de 10 unités de la chaîne, et l'eau doit couler
// vers la falaise de la porte : c'est ce qui donne le bon sens à la chaîne.

import { TAU, smooth } from '../engine/vec.js';

const HUB = 5; // rayon du pignon de la roue
const LOW = 5.5; // rayon du pignon du bas de la chaîne
const TOP = 4.6; // rayon du pignon du haut
const STRAND = 4; // écart entre l'axe de la chaîne et chacun de ses brins

const line = (c, pts) => {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
};
const disc = (c, x, y, r) => {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
};

/** De combien la porte est descendue (en unités monde). */
export function doorSink(door) {
  return (door.def.bottom - door.def.top) * smooth(door.open);
}

/** Où sont les pièces de la machine, d'après la roue et la porte. */
function layout(wheel, door) {
  const w = wheel.def;
  const d = door.def;
  const side = w.x < d.x ? -1 : 1; // de quel côté de la porte est la roue
  const x = d.x + side * (d.w / 2 + 5); // l'axe de la chaîne
  const dx = Math.abs(x - w.x);
  const reach = HUB + LOW; // les deux pignons se touchent
  const low = w.y - Math.sqrt(Math.max(0, reach * reach - dx * dx));
  return {
    side,
    x,
    low, // hauteur du pignon du bas
    top: d.top - 8, // hauteur du pignon du haut
    doorX: x - side * STRAND, // le brin de la porte (celui qui descend)
    weightX: x + side * STRAND, // le brin du contrepoids (celui qui monte)
    ring: d.top + doorSink(door) + 8, // l'anneau qui tient la porte à la chaîne
    weight: low - 23 - doorSink(door), // le contrepoids
    ground: w.y + w.r + 2,
  };
}

/** Un pignon de bronze. */
function gear(c, P, x, y, r, angle, teeth = 8) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = P.bronze;
  for (let i = 0; i < teeth; i++) {
    c.save();
    c.rotate((i / teeth) * TAU);
    c.fillRect(r - 2.2, -1.1, 2.6, 2.2);
    c.restore();
  }
  disc(c, 0, 0, r - 1.6);
  c.fillStyle = P.stoneDark;
  disc(c, 0, 0, Math.max(0.8, r - 4));
  c.fillStyle = P.bronze;
  disc(c, 0, 0, 1.2);
  c.restore();
}

/** La porte de pierre : une dalle qui glisse le long de la falaise, entre deux glissières. */
export function drawDoor(c, P, door) {
  const d = door.def;
  const h = d.bottom - d.top;
  const s = doorSink(door);
  const x = d.x - d.w / 2;
  c.fillStyle = P.stone;
  c.fillRect(x, d.top + s, d.w, h);
  c.fillStyle = P.stoneDark;
  for (let y = d.top + s + 9; y < d.bottom + s - 4; y += 14) disc(c, d.x, y, 1.5);
  // Les glissières de bronze, scellées dans la roche sous la porte
  c.fillStyle = P.bronze;
  for (const y of [d.bottom + 5, d.bottom + h - 12]) c.fillRect(x - 1.6, y, d.w + 2.6, 2.4);
}

/** La chaîne sans fin et le contrepoids (dessinés avant la roue, qui passe devant). */
export function drawChain(c, P, wheel, door) {
  const d = door.def;
  const m = layout(wheel, door);
  const s = doorSink(door);
  c.lineCap = 'round';
  // La potence qui porte le pignon du haut
  c.strokeStyle = P.wood;
  c.lineWidth = 1.6;
  line(c, [
    { x: d.x, y: m.top },
    { x: m.x, y: m.top },
  ]);
  c.stroke();
  // Les deux brins : les maillons défilent, l'un vers le haut, l'autre vers le bas
  c.strokeStyle = P.bronze;
  c.lineWidth = 1.5;
  c.setLineDash([2.6, 1.7]);
  c.lineDashOffset = s;
  line(c, [
    { x: m.weightX, y: m.low },
    { x: m.weightX, y: m.top },
  ]);
  c.stroke();
  c.lineDashOffset = -s;
  line(c, [
    { x: m.doorX, y: m.top },
    { x: m.doorX, y: m.low },
  ]);
  c.stroke();
  c.setLineDash([]);
  // Les pignons tournent à l'envers de la roue (ils engrènent avec son moyeu)
  gear(c, P, m.x, m.top, TOP, -wheel.angle);
  gear(c, P, m.x, m.low, LOW, -wheel.angle);
  // Le contrepoids de pierre
  c.fillStyle = P.stone;
  c.beginPath();
  c.roundRect(m.weightX - 5.5, m.weight - 9, 11, 18, 2);
  c.fill();
  c.fillStyle = P.stoneDark;
  disc(c, m.weightX, m.weight, 1.8);
  // L'anneau qui accroche la porte au brin qui descend
  c.strokeStyle = P.bronze;
  c.lineWidth = 1.3;
  c.beginPath();
  c.arc(m.doorX, m.ring, 2.2, 0, TAU);
  c.stroke();
}

/**
 * La roue à aubes sur son bâti. wheel.angle est compté dans le sens du
 * courant (voir game.js) : le bas de la roue part avec l'eau.
 * flowing = l'eau est arrivée jusqu'à elle.
 */
export function drawWaterWheel(c, P, wheel, g, flowing) {
  const w = wheel.def;
  const ground = w.y + w.r + 2;
  // Le bâti : deux montants qui portent l'axe
  c.strokeStyle = P.wood;
  c.lineCap = 'round';
  c.lineWidth = 1.8;
  line(c, [
    { x: w.x - 8, y: ground },
    { x: w.x, y: w.y },
    { x: w.x + 8, y: ground },
  ]);
  c.stroke();
  // La roue et ses huit aubes
  c.save();
  c.translate(w.x, w.y);
  c.rotate(wheel.angle);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, w.r - 2, 0, TAU);
  c.stroke();
  c.lineWidth = 1.4;
  c.fillStyle = P.wood;
  for (let i = 0; i < 8; i++) {
    c.save();
    c.rotate((i / 8) * TAU);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(w.r, 0);
    c.stroke();
    c.fillRect(w.r - 3.5, -3.2, 4.6, 6.4);
    c.restore();
  }
  c.restore();
  gear(c, P, w.x, w.y, HUB, wheel.angle);
  // L'eau frappe les aubes : des éclaboussures
  if (flowing) {
    c.fillStyle = P.iceLine;
    for (let i = 0; i < 5; i++) {
      const u = (g.time * 1.6 + i / 5) % 1;
      c.globalAlpha = 0.9 * (1 - u);
      disc(c, w.x + wheel.spin * (6 - u * 16) + Math.sin(i * 9) * 3, ground - 1 - Math.sin(Math.PI * u) * (5 + (i % 3) * 2), 1.1 - u * 0.5);
    }
    c.globalAlpha = 1;
  }
}

/** Une arche au pied de la falaise, par où l'eau s'en va (`drain` dans un cours d'eau). */
export function drawDrain(c, P, drain) {
  const side = drain.side ?? -1; // -1 : l'arche s'ouvre vers la gauche
  c.fillStyle = P.caveBack;
  c.beginPath();
  if (side < 0) c.ellipse(drain.x, drain.y, 4.2, 6.5, 0, Math.PI * 0.5, Math.PI * 1.5);
  else c.ellipse(drain.x, drain.y, 4.2, 6.5, 0, -Math.PI * 0.5, Math.PI * 0.5);
  c.fill();
  c.strokeStyle = P.stone;
  c.lineWidth = 1.1;
  c.stroke();
}

/**
 * Par-dessus tout, pour que la machine se lise même dans l'ombre : pendant
 * qu'elle travaille, des éclats dorés montent de la roue vers la porte.
 */
export function drawMachineGlow(c, wheel, door, g) {
  if (door.open <= 0.001 || door.open >= 0.999) return;
  const w = wheel.def;
  const m = layout(wheel, door);
  const path = [
    { x: w.x, y: w.y },
    { x: m.x, y: m.low },
    { x: m.doorX, y: m.low - 8 },
    { x: m.doorX, y: m.ring },
  ];
  const lens = [0];
  for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  const total = lens[lens.length - 1];
  for (let k = 0; k < 3; k++) {
    const u = (g.time * 0.7 + k / 3) % 1;
    const at = u * total;
    let i = 1;
    while (i < path.length - 1 && lens[i] < at) i++;
    const t = (at - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
    c.fillStyle = `rgba(255, 228, 150, ${0.9 * Math.sin(Math.PI * u)})`;
    disc(c, path[i - 1].x + (path[i].x - path[i - 1].x) * t, path[i - 1].y + (path[i].y - path[i - 1].y) * t, 1.5);
  }
}
