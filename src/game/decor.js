// Les petits décors qui font vivre le monde : animaux, cairns, buissons,
// fanions… Ils n'ont aucun effet sur l'énigme (ils ne bloquent pas la
// lumière), mais ils suivent la règle commune : une couleur au soleil, une
// couleur dans l'ombre (P est la palette du moment).
//
// Dans un niveau, on les pose ainsi :
//   decor: [{ type: 'ibex', x: 120, y: 273, s: 0.8, dir: -1 }, …]
// (x, y) est le point du sol sous le décor ; s sa taille ; dir = 1 s'il
// regarde à droite, -1 à gauche. Ajouter layer: 'sky' pour un décor du ciel.
//
// Ce fichier ne fait que DESSINER. Ce que font les animaux (se coucher au
// soleil, fuir un reflet, dormir la nuit…) est décidé dans life.js ; chaque
// fonction de dessin reçoit l'état k de son animal (ou null s'il n'y en a pas).
// Réglages possibles dans le niveau :
//   ibex     path: [[x, y], [x, y, 'rest'], [x, y, 'hop']…]  son chemin
//   marmots  to: [x, y]                    un second terrier
//   hare     range: [[x, y], [x, y]]        la pente où il vit
//   raptor   perch: [x, y]                  où il se pose la nuit
//   owl, eyes                               ne se voient que la nuit
//   flowers  n, color                       s'ouvrent à la lumière

import { TAU } from '../engine/vec.js';
import { windAt } from './life.js';

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

/**
 * Bouquetin. Debout, il tourne parfois la tête ; au soleil il se couche et
 * rumine ; la nuit il dort, la tête posée. Sur une pente, son corps se
 * penche à moitié et ses pattes font le reste.
 */
function ibex(c, P, k, g) {
  const t = g.time;
  const lie = k ? k.lie : 0;
  const asleep = !!k && k.state === 'sleep';
  const walking = !!k && k.state === 'walk';
  const tilt = k ? k.slope * k.dir * 0.5 : 0;
  c.rotate(tilt);
  if (k && k.state === 'shake') c.rotate(Math.sin(t * 38) * 0.07); // il s'ébroue
  const drop = lie * 6.5; // couché, le corps descend
  // La tête : baissée quand il dort, hochée de temps en temps sinon
  const sleepy = asleep ? lie : 0;
  const nod = sleepy ? 0 : Math.sin(t * 0.5 + (k ? k.d.x : 0)) > 0.6 ? 1.2 : 0;
  const hx = sleepy * 1.5;
  const hy = drop + nod + sleepy * 8;

  // Cornes (derrière la tête)
  c.strokeStyle = P.horn;
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(7 + hx, -22.5 + hy, 6.6, 0, -Math.PI * 0.95, true);
  c.stroke();
  c.fillStyle = P.fur;
  // Pattes : repliées quand il est couché, en mouvement quand il marche
  [-8, -4, 4, 7.5].forEach((x, i) => {
    const swing = walking ? Math.sin(k.step + i * 1.9) * 1.7 : 0;
    const top = -8 + drop;
    const bottom = top + (x * Math.tan(tilt) + 0.5 - top) * (1 - lie) + 2.5 * lie;
    c.fillRect(x + swing, top, 2, bottom - top);
  });
  ellipse(c, 0, -11 + drop, 10, 5.2);
  shape(c, [
    [6, -14 + drop],
    [12 + hx, -21 + hy],
    [15 + hx, -18 + hy],
    [9, -9 + drop],
  ]);
  ellipse(c, 14.5 + hx, -20.5 + hy, 3.6, 2.4, 0.3);
  ellipse(c, -10, -14 + drop, 1.8, 1.2);
  // La barbiche (elle remue quand il rumine)
  const chew = lie > 0.8 && !asleep ? Math.sin(t * 6) * 0.5 : 0;
  shape(c, [
    [13 + hx, -18.5 + hy],
    [14.5 + hx + chew, -15 + hy],
    [15.5 + hx, -18.5 + hy],
  ]);
}

/**
 * Deux marmottes et leurs terriers. La sentinelle se dresse et siffle quand
 * une ombre passe ; l'autre court parfois jusqu'à un second terrier (`to`).
 */
function marmots(c, P, k, g, d) {
  const s = d.s ?? 1;
  const dir = d.dir ?? 1;
  const local = (x, y) => [(x - d.x) / (s * dir), (y - d.y) / s];
  // Les trous
  c.fillStyle = P.doorway;
  ellipse(c, 0, 0.4, 5.6, 1.7);
  ellipse(c, 17, 0.4, 5.6, 1.7);
  if (d.to) ellipse(c, ...local(d.to[0], d.to[1] + 0.4 * s), 5.6, 1.7);

  // La sentinelle sort de son trou (out va de 0 à 1)
  const out = k ? k.out : 1;
  const alarm = !!k && k.state === 'alarm';
  const calm = !k || (k.state === 'out' && k.calm > 1.5);
  const up = calm && Math.sin(g.time * 0.7 + d.x) < -0.4 ? 3 : 0; // elle se baisse de temps en temps
  c.save();
  c.beginPath();
  c.rect(-10, -44, 20, 44.3);
  c.clip();
  c.translate(0, (1 - out) * 26);
  if (alarm) c.scale(0.92, 1.14);
  c.fillStyle = P.fur;
  ellipse(c, 0, -8.5 + up, 4.6, 8.5 - up);
  ellipse(c, 0.5, -19 + up * 2, 3.6, 3.2);
  ellipse(c, -2.2, -21.6 + up * 2, 1, 1);
  ellipse(c, 3, -21.6 + up * 2, 1, 1);
  c.restore();
  // Le sifflet : deux petits arcs près de sa tête
  if (k && k.whistle > 0) {
    c.strokeStyle = P.trim;
    c.lineWidth = 0.8;
    c.lineCap = 'round';
    c.globalAlpha = Math.min(1, k.whistle * 2);
    for (const r of [5, 8.5]) {
      c.beginPath();
      c.arc(4, -22, r + (0.75 - k.whistle) * 6, -0.9, 0.3);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  // La seconde : couchée près de son trou, ou en pleine course
  const out2 = k ? k.out2 : 1;
  const [x2, y2] = k ? local(k.x2, k.y2) : [17, 0];
  const running = !!k && !!k.run;
  const face = running ? k.dir2 * dir : 1;
  c.save();
  c.translate(x2, y2);
  c.beginPath();
  c.rect(-12, -20, 26, 20.3);
  c.clip();
  c.translate(0, (1 - out2) * 9 - (running ? Math.abs(Math.sin(g.time * 16)) * 1.8 : 0));
  c.fillStyle = P.fur;
  ellipse(c, 0, -3.6, 7, 3.6);
  ellipse(c, 7 * face, -5.6, 3, 2.6);
  c.restore();
}

/**
 * Lièvre des neiges : blanc, il se fond dans la neige au soleil. Il broute,
 * guette, détale en bonds, et dort roulé en boule.
 */
function hare(c, P, k, g) {
  const state = k ? k.state : 'alert';
  const t = g.time;
  if (k) c.rotate(k.slope * k.dir * 0.6);
  c.fillStyle = P.furWhite;
  if (state === 'sleep') {
    // En boule, les oreilles couchées sur le dos
    ellipse(c, 0, -4.4, 7.2, 4.4);
    ellipse(c, 5.4, -5, 3, 2.6);
    ellipse(c, 0.6, -8.4, 4.6, 1.1, 0.12);
    return;
  }
  if (state === 'bound') {
    // En plein bond : allongé, les oreilles en arrière
    const u = k.hop ? Math.min(1, k.hop.t) : 0;
    c.rotate((u - 0.5) * 0.7);
    ellipse(c, 0, -5, 8.6, 3.8);
    ellipse(c, 8.4, -7.6, 3.2, 2.7);
    ellipse(c, 4.2, -10.4, 4.4, 1.1, 0.5);
    ellipse(c, 5.4, -11.6, 4.4, 1.1, 0.75);
    ellipse(c, -9.2, -4.4, 1.8, 1.5);
    c.fillRect(-9, -3.4, 5, 1.6); // pattes arrière tendues
    c.fillRect(5, -3.2, 5.4, 1.4);
    return;
  }
  const graze = state === 'graze';
  const nibble = graze ? Math.sin(t * 7) * 0.5 : 0;
  const twitch = Math.sin(t * 1.3 + (k ? k.d.x : 0)) > 0.9 ? 0.25 : 0;
  const tall = state === 'sit' ? 2.4 : 0; // dressé sur ses pattes
  ellipse(c, 0, -5 - tall * 0.4, 7, 4.8 + tall * 0.5);
  if (graze) {
    // La tête dans la neige, les oreilles en arrière
    ellipse(c, 8, -4.6 + nibble, 3.3, 2.9);
    ellipse(c, 4.6, -9.4 + nibble, 1.2, 4.3, -1);
    ellipse(c, 5.8, -8.2 + nibble, 1.2, 4.3, -0.75);
  } else {
    ellipse(c, 7, -10.5 - tall, 3.3, 2.9);
    ellipse(c, 6.4, -17 - tall, 1.2, 4.5, -0.2 - twitch);
    ellipse(c, 8.9, -16.6 - tall, 1.2, 4.5, 0.25 + twitch);
  }
  ellipse(c, -7.2, -6.5, 1.8, 1.6);
  c.fillStyle = P.cloak;
  if (graze) ellipse(c, 9, -5.2 + nibble, 0.5, 0.5);
  else ellipse(c, 8.2, -11 - tall, 0.5, 0.5);
}

/** Cairn : des pierres empilées par ceux qui sont passés là. */
function cairn(c, P) {
  c.fillStyle = P.cairn;
  ellipse(c, 0, -3, 9, 4);
  ellipse(c, 0, -10, 7, 3.4);
  ellipse(c, 0.5, -16, 5.2, 2.8);
  ellipse(c, 0, -21, 3.4, 2.2);
}

/** Buisson à baies rouges, coiffé de neige. Il plie sous le vent et se regonfle au soleil. */
function bush(c, P, k, g, d) {
  const wind = windAt(g.life, d.x);
  const puff = 1 + 0.07 * (k ? k.open : 0);
  c.transform(1, 0, -(wind - 0.12) * 0.35, 1, 0, 0); // penché par la rafale
  c.fillStyle = P.leaf;
  ellipse(c, 0, -5 * puff, 10 * puff, 7.5 * puff);
  c.strokeStyle = P.snow;
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(0, -5 * puff, 8.6 * puff, Math.PI * 1.15, Math.PI * 1.6);
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
    ellipse(c, x * puff, y * puff, 1.2, 1.2);
}

/**
 * Une fleur : une tige, une feuille, et une corolle qui s'ouvre (open de 0 à
 * 1). color choisit sa teinte (0 blanche, 1 dorée, 2 rouge) ; grow la fait
 * sortir de terre.
 */
export function drawFlower(c, P, x, y, h, open, lean, color, grow = 1) {
  const H = h * grow;
  if (H < 0.3) return;
  const tx = x + lean * H;
  const ty = y - H;
  c.strokeStyle = P.leaf;
  c.lineWidth = 0.7;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x, y - H * 0.6, tx, ty);
  c.stroke();
  c.fillStyle = P.leaf;
  ellipse(c, x + 1.1, y - H * 0.35, 1.3 * grow, 0.6 * grow, -0.5);
  if (open < 0.15) {
    ellipse(c, tx, ty, 0.8, 1.2); // bouton fermé
    return;
  }
  const [petal, heart] = [
    [P.trim, P.gold],
    [P.gold, P.berry],
    [P.berry, P.gold],
  ][color % 3];
  c.fillStyle = petal;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2;
    ellipse(c, tx + Math.cos(a) * 1.25 * open, ty + Math.sin(a) * 1.25 * open, 0.95 * open, 0.95 * open);
  }
  c.fillStyle = heart;
  ellipse(c, tx, ty, 0.65, 0.65);
}

/** Une touffe de fleurs : elles s'ouvrent à la lumière et se referment à l'ombre. */
function flowers(c, P, k, g, d) {
  const n = d.n ?? 4;
  const wind = windAt(g.life, d.x) - 0.12;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 4.4 + Math.sin(i * 7.3 + d.x) * 1.2;
    const h = 6 + Math.sin(i * 3.1 + d.x) * 1.8;
    const lean = Math.sin(g.time * 1.7 + i) * 0.06 + wind * 0.45;
    drawFlower(c, P, x, 0, h, k ? k.open : 0, lean, d.color ?? i);
  }
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
  const gust = windAt(g.life, mx) - 0.12;
  const colors = [P.trim, P.cloak, P.gold, P.trim, P.cloak];
  colors.forEach((color, i) => {
    const [x, y] = at((i + 0.8) / (colors.length + 0.6));
    const sway = Math.sin(g.time * (2.2 + gust * 6) + i * 1.7) * 0.9 + gust * 3.4; // la rafale les couche
    c.fillStyle = color;
    shape(c, [
      [x - 2.4, y],
      [x + 2.4, y + 0.5],
      [x + sway, y + 6],
    ]);
  });
}

/**
 * Pont de corde tendu entre deux points : { x, y, x1, y1, sag }.
 * (un simple décor : dans ce jeu, seuls les porteurs marchent, et ils ont
 * leur propre chemin)
 */
function bridge(c, P, d) {
  const sag = d.sag ?? 12;
  const mx = (d.x + d.x1) / 2;
  const at = (t, lift) => [
    (1 - t) * (1 - t) * d.x + 2 * (1 - t) * t * mx + t * t * d.x1,
    (1 - t) * (1 - t) * (d.y - lift) + 2 * (1 - t) * t * ((d.y + d.y1) / 2 + sag - lift * 0.7) + t * t * (d.y1 - lift),
  ];
  c.strokeStyle = P.wood;
  c.lineCap = 'round';
  for (const lift of [0, 14]) {
    c.lineWidth = lift ? 0.8 : 1.2;
    c.beginPath();
    for (let i = 0; i <= 20; i++) {
      const [x, y] = at(i / 20, lift);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
  }
  const n = Math.round(Math.abs(d.x1 - d.x) / 6);
  for (let i = 1; i < n; i++) {
    const [x, y] = at(i / n, 0);
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x - 1.8, y);
    c.lineTo(x + 1.8, y);
    c.stroke();
    if (i % 2) {
      const [hx, hy] = at(i / n, 14);
      c.lineWidth = 0.5;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(hx, hy);
      c.stroke();
    }
  }
  c.lineWidth = 1.6;
  for (const [x, y] of [
    [d.x, d.y],
    [d.x1, d.y1],
  ]) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y - 16);
    c.stroke();
  }
}

/**
 * Grand rapace : il plane lentement dans le ciel, bat des ailes quand il
 * décolle ou se pose, et replie ses ailes sur son perchoir.
 */
function raptor(c, P, k, g) {
  c.fillStyle = P.bird;
  if (k && k.state === 'perch') {
    ellipse(c, 0, -11, 6, 11, 0.1);
    ellipse(c, 2, -23, 4.6, 4.2);
    shape(c, [
      [5.6, -24],
      [10, -22.4],
      [5.6, -21],
    ]);
    shape(c, [
      [-3, -3],
      [-7, 5],
      [-1, 4],
      [1, -2],
    ]);
    return;
  }
  const busy = !!k && (k.state === 'toSky' || k.state === 'toPerch' || k.flap > 0);
  const flap = busy ? Math.sin(g.time * 11) * 7 : Math.sin(g.time * 0.9) * 1.5;
  c.beginPath();
  c.moveTo(-28, flap);
  c.quadraticCurveTo(-14, -10, -2, 2);
  c.quadraticCurveTo(12, -12, 28, -4 + flap);
  c.quadraticCurveTo(14, -4, 4, 6);
  c.lineTo(-2, 9);
  c.lineTo(-7, 6);
  c.quadraticCurveTo(-18, -2, -28, flap);
  c.fill();
}

/** Chouette : elle ne vient que la nuit. Ses yeux brillent ; elle gonfle ses plumes quand elle hulule. */
function owl(c, P, k, g) {
  const eye = (x, y, shut) => {
    c.fillStyle = '#ffd76a';
    if (shut) c.fillRect(x - 2, y - 0.3, 4, 0.7);
    else {
      ellipse(c, x, y, 2.2, 2.2);
      c.fillStyle = '#1a1426';
      ellipse(c, x, y, 0.9, 0.9);
    }
  };
  const shut = k.blink > 0 || Math.sin(g.time * 0.8 + 1) > 0.97;
  c.fillStyle = P.fur;
  if (k.state !== 'perch') {
    // En vol : deux grandes ailes silencieuses
    const flap = Math.sin(g.time * 9) * 6;
    c.beginPath();
    c.moveTo(-16, -4 + flap);
    c.quadraticCurveTo(-7, -9, 0, -2);
    c.quadraticCurveTo(7, -9, 16, -4 + flap);
    c.quadraticCurveTo(7, -1, 0, 4);
    c.quadraticCurveTo(-7, -1, -16, -4 + flap);
    c.fill();
    ellipse(c, 0, -1, 5, 4.4);
    eye(-2.2, -2, false);
    eye(2.2, -2, false);
    return;
  }
  const puff = 1 + 0.1 * Math.sin(Math.PI * Math.min(1, (k.hoot || 0) / 0.9));
  ellipse(c, 0, -9, 7 * puff, 9);
  ellipse(c, 0, -19, 7.4, 6.4);
  shape(c, [
    [-7, -22],
    [-6, -27.5],
    [-2.6, -24],
  ]);
  shape(c, [
    [7, -22],
    [6, -27.5],
    [2.6, -24],
  ]);
  eye(-3, -19.5, shut);
  eye(3, -19.5, shut);
  c.fillStyle = P.horn;
  shape(c, [
    [-0.9, -17.6],
    [0.9, -17.6],
    [0, -15.6],
  ]);
}

/** Deux yeux qui brillent dans le noir (on ne saura jamais à qui ils sont). */
function eyes(c, P, k, g) {
  const blink = k.shut > 0 || Math.sin(g.time * 0.63 + k.d.x) > 0.96;
  if (blink) return;
  c.fillStyle = '#ffe9a0';
  ellipse(c, -2.6, 0, 1.15, 1);
  ellipse(c, 2.6, 0, 1.15, 1);
}

const DRAW = { ibex, marmots, hare, cairn, bush, flowers, raptor, owl, eyes };

/** Dessine un décor du niveau. Les animaux sont dessinés là où leur vie les a menés (voir life.js). */
export function drawDecor(c, P, d, g) {
  // Fanions et pont de corde se décrivent par deux points.
  if (d.type === 'flags') return flags(c, P, d, g);
  if (d.type === 'bridge') return bridge(c, P, d);
  const draw = DRAW[d.type];
  if (!draw) return;
  const k = g.life ? g.life.byDecor.get(d) || null : null;
  // La chouette et les yeux n'existent que la nuit.
  if (d.type === 'owl' && (!k || k.state === 'away')) return;
  if (d.type === 'eyes' && (!k || g.life.night < 0.05)) return;
  const s = d.s ?? 1;
  c.save();
  if (d.type === 'eyes') c.globalAlpha = g.life.night;
  c.translate(k ? k.x : d.x, k ? k.y : d.y);
  c.scale(s * (k ? k.dir : (d.dir ?? 1)), s);
  draw(c, P, k, g, d);
  c.restore();
}
