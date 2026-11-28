// Le dessin du film du chapitre 0 (voir film.js pour son déroulé).
//
// Un seul décor, la capitale des anciens, dessiné dans le style du jeu : des
// aplats, une face au soleil et une face à l'ombre. Chaque chose se dessine
// d'après l'état du film (filmState) : rien ici ne connaît l'heure.
//
// La scène fait 360 × 780 unités. Elle est calée au-dessus du bandeau de
// texte (FILM_BAND, le bas de l'écran) ; sur un écran plus large ou plus
// haut, le ciel, les lointains et le sol débordent.

import { TAU, clamp, lerp, smooth } from '../engine/vec.js';
import { mix } from '../game/palette.js';
import { filmState } from './film.js';

/** La part de l'écran, en bas, réservée au bandeau de texte et à la barre d'avancement. */
export const FILM_BAND = 0.13;

const W = 360;
const H = 780;
const LEFT = -90; // jusqu'où débordent le ciel et le sol, de chaque côté
const RIGHT = 450;

// Les pierres de l'âge d'or, et les mêmes dans l'ombre et le froid.
const WARM = { stone: '#f7eedb', shade: '#d2c4a4', deep: '#ab9b7c', back: '#e6e3dc', backS: '#d3d6da', far: '#a9c6e4', far2: '#c9dcee', gold: '#ffb62e', goldL: '#ffe29a', bronze: '#c8842c', bronzeD: '#96601f', glass: '#fff6c8', mirror: '#ffd76a', win: '#e6a93a', tree: '#86b96c', tree2: '#5f9a5c' };
const COLD = { stone: '#8798cc', shade: '#36437d', deep: '#28335f', back: '#5b6ba6', backS: '#47558d', far: '#4c5e9a', far2: '#6a7cb8', gold: '#4a5b96', goldL: '#5f70ab', bronze: '#77708a', bronzeD: '#4d4a68', glass: '#5f78bc', mirror: '#b8a67e', win: '#2b3768', tree: '#5d6fa6', tree2: '#4a5a90' };
const ROBE = '#fffdf6';
const ROBE_S = '#e2d8c6';
const MASK = '#f0b84e';
const SNOW = '#f4f8ff';
const SNOW2 = '#dce6fa';
const NIGHT = '#141833';
const WOOD = '#6b4a3a';
const ICE = 'rgba(118,178,252,.78)';
const ICE_L = 'rgba(190,225,255,.6)';
const ICE_D = 'rgba(64,112,205,.4)';
// Le ciel, en quatre bandes : âge d'or, ciel fermé, nuit, aube d'aujourd'hui.
const SKY_AT = [0, 0.34, 0.56, 0.74];
const SKIES = { gold: ['#5fa8e3', '#9ccdee', '#c6e2ee', '#fbeccb'], closed: ['#55648c', '#7c89ab', '#9da8c2', '#c5c9d6'], night: ['#0c1230', '#161f4a', '#232f63', '#33427c'], dawn: ['#141d4a', '#4d5aa6', '#b9a4cf', '#f6cdb8'] };

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const norm = (v) => { const n = Math.hypot(v[0], v[1]) || 1; return [v[0] / n, v[1] / n]; };
/** Un hasard qui ne change pas d'une image à l'autre. */
const rnd = (i) => { const x = Math.sin(i * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };
/** La direction d'un miroir qui renvoie vers T la lumière venue de S. */
function aim(S, M, T) { const n = norm(sub(norm(sub(T, M)), norm(sub(M, S)))); return [-n[1], n[0]]; }
/** Passe d'une direction à une autre en tournant par le plus court. */
function turnTo(a, b, k) { const A = Math.atan2(a[1], a[0]); let d = Math.atan2(b[1], b[0]) - A; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return [Math.cos(A + d * k), Math.sin(A + d * k)]; }
/** La hauteur d'un profil de sommet [[fraction, y]…] à la fraction f. */
function profileAt(prof, f) { for (let i = 1; i < prof.length; i++) if (f <= prof[i][0]) { const [f0, y0] = prof[i - 1], [f1, y1] = prof[i]; return y0 + ((y1 - y0) * (f - f0)) / (f1 - f0 || 1); } return prof[prof.length - 1][1]; }
/** Le profil d'une tour à mi-chemin entre intacte (a) et en ruine (b). */
function erode(a, b, k) { const fs = [...new Set([...a, ...b].map((p) => p[0]))].sort((x, y) => x - y); return fs.map((f) => [f, lerp(profileAt(a, f), profileAt(b, f), k)]); }

// ── Le plan de la cité ──
// Les quatre grandes lames : intactes (un biseau), puis en ruine.
const TOWERS = {
  leftTall: { x: 26, w: 38, whole: [[0, 260], [1, 232]], ruin: [[0, 312], [0.1, 294], [0.2, 300], [0.3, 270], [0.36, 250], [1, 232]], ice: [45, 20, 468, 1] },
  leftSmall: { x: 80, w: 24, whole: [[0, 384], [1, 400]], ruin: [[0, 478], [0.25, 458], [0.45, 482], [0.7, 466], [1, 496]], ice: [92, 13, 528, 2] },
  rightSmall: { x: 256, w: 24, whole: [[0, 360], [1, 344]], ruin: [[0, 436], [0.3, 408], [0.5, 430], [0.75, 402], [1, 422]], ice: [268, 13, 500, 3] },
  rightTall: { x: 296, w: 40, whole: [[0, 176], [1, 206]], ruin: [[0, 322], [0.14, 302], [0.3, 330], [0.48, 314], [0.62, 336], [0.7, 252], [0.8, 238], [0.9, 266], [1, 306]], ice: [316, 21, 452, 4] },
};
// Les lames du fond : [x, largeur, sommet intact, sens du biseau, profil en ruine]
const BACKS = [
  [-32, 13, 300, 1, [[0, 470], [1, 482]]], [8, 13, 330, 1, [[0, 404], [0.4, 386], [0.7, 410], [1, 396]]], [66, 9, 420, 1, [[0, 540], [0.5, 528], [1, 546]]], [116, 11, 262, -1, [[0, 500], [0.5, 486], [1, 506]]],
  [142, 9, 318, 1, [[0, 327], [1, 318]]], [214, 9, 300, -1, [[0, 560], [0.4, 548], [1, 566]]], [234, 12, 250, 1, [[0, 548], [0.3, 530], [0.6, 552], [1, 540]]], [286, 9, 430, -1, [[0, 470], [0.6, 456], [1, 476]]],
  [340, 14, 356, -1, [[0, 480], [0.5, 462], [1, 488]]], [380, 12, 280, -1, [[0, 440], [1, 452]]],
];
const SUN = [70, 46]; // le soleil de l'âge d'or
const TOP = [180, 150]; // le cristal, au sommet de l'aiguille
const HEART = [180, 346];
// Les sillons de lumière : quatre partent du cœur par les passerelles, quatre descendent les tours.
const RUNS = [[[150, 346], [118, 346], [100, 364], [92, 364]], [[210, 346], [240, 346], [256, 330], [268, 330]], [[150, 356], [126, 380], [64, 380], [64, 300]], [[210, 356], [236, 382], [316, 382], [316, 250]], [[92, 364], [92, 600]], [[268, 330], [268, 600]], [[64, 380], [64, 640]], [[316, 382], [316, 640]]];
const VILLAGE_MIRROR = [296, 722];
const FOLK = [[226, 776, 34, 1], [254, 778, 26, 1], [96, 778, 30, -1], [322, 778, 36, -1]]; // x, y, taille, regard

export function createFilmRenderer(canvas) {
  const c = canvas.getContext('2d');
  // Une tache de lumière, dessinée une fois pour toutes (bien plus rapide qu'un dégradé par lueur).
  const spot = document.createElement('canvas');
  spot.width = spot.height = 128;
  { const g = spot.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,242,192,.85)'); gr.addColorStop(1, 'rgba(255,242,192,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }

  let C = WARM; // la palette de l'image en cours

  // ── Les outils de dessin ──
  const alpha = (a, draw) => { if (a <= 0.01) return; const before = c.globalAlpha; c.globalAlpha = before * Math.min(1, a); draw(); c.globalAlpha = before; };
  const poly = (pts, fill) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fillStyle = fill; c.fill(); };
  const line = (pts, stroke, w = 1.6, dash = null) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.strokeStyle = stroke; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]); };
  const circle = (x, y, r, fill) => { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fillStyle = fill; c.fill(); };
  const ring = (x, y, r, stroke, w, a0 = 0, a1 = TAU) => { c.beginPath(); c.arc(x, y, r, a0, a1); c.strokeStyle = stroke; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); };
  const oval = (x, y, rx, ry, rot, stroke, w, a0 = 0, a1 = TAU) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, a0, a1); c.strokeStyle = stroke; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); };
  const path = (d, fill, stroke = null, w = 1) => { const p = new Path2D(d); if (fill) { c.fillStyle = fill; c.fill(p); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = w; c.lineCap = 'round'; c.stroke(p); } };
  const glow = (x, y, r, a = 1) => alpha(a, () => c.drawImage(spot, x - r, y - r, r * 2, r * 2));
  /** Un faisceau : quatre coins, et un dégradé d'or du point a (force a0) au point b (force a1). */
  const shaft = (pts, a, b, a0, a1, mid = null) => { const g = c.createLinearGradient(a[0], a[1], b[0], b[1]); g.addColorStop(0, `rgba(255,224,138,${a0})`); if (mid) g.addColorStop(mid[0], `rgba(255,224,138,${mid[1]})`); g.addColorStop(1, `rgba(255,216,112,${a1})`); poly(pts, g); };
  /** Une calotte de neige épaisse, posée sur une arête. */
  const cap = (x0, y0, x1, y1, t = 6) => path(`M${x0 - 2} ${y0 + 1} Q${x0 - 1} ${y0 - t * 1.3} ${(x0 + x1) / 2} ${(y0 + y1) / 2 - t} Q${x1 + 1} ${y1 - t * 1.3} ${x1 + 2} ${y1 + 1}z`, SNOW);
  const icicles = (x0, x1, y, n = 5, long = 1) => { for (let i = 0; i < n; i++) { const x = x0 + ((x1 - x0) * (i + 0.5)) / n, h = (5 + rnd(x + y) * 9) * long; poly([[x - 1.7, y], [x + 1.7, y], [x, y + h]], '#d5eaff'); } };

  /**
   * Une tour : son profil de sommet, sa face à l'ombre, son sillon, ses
   * fenêtres ; de la neige sur le sommet quand `snow` > 0.
   */
  function tower(x, w, base, prof, { back = false, snow = 0, k = 0.58, snowW = 4 } = {}) {
    const pts = prof.map(([f, y]) => [x + w * f, y]);
    poly([[x, base], ...pts, [x + w, base]], back ? C.back : C.stone);
    poly([[x + w * k, base], [x + w * k, profileAt(prof, k)], ...pts.filter((p) => p[0] > x + w * k), [x + w, base]], back ? C.backS : C.shade);
    if (!back) {
      line([[x + w * 0.2, base], [x + w * 0.2, profileAt(prof, 0.2) + 14]], C.gold, 1.4);
      for (let y = Math.max(...prof.map((p) => p[1])) + 20; y < base - 16; y += 15) { line([[x + w * 0.36, y], [x + w * 0.36, y + 7]], C.win, 1.6); if (w > 26) line([[x + w * 0.48, y + 4], [x + w * 0.48, y + 11]], C.win, 1.6); line([[x + w * 0.78, y + 2], [x + w * 0.78, y + 9]], C.deep, 1.4); }
    }
    alpha(snow, () => line(pts, SNOW, snowW));
    return pts;
  }

  /**
   * La glace prend une structure : une gangue à facettes, large au pied,
   * émoussée en haut, coiffée de neige. `grow` la fait monter de 0 à 1.
   */
  function ice(xc, hw, topFinal, base, seed, grow) {
    if (grow <= 0.02) return;
    const topY = lerp(base, topFinal, grow), h = base - topY, j = (i, a) => (rnd(seed * 7 + i) - 0.5) * a * grow;
    const L = [[xc - hw * 2.3 + j(1, 4), base], [xc - hw * 1.9 + j(2, 4), base - h * 0.22 + j(3, 8)], [xc - hw * 1.55 + j(4, 3), base - h * 0.5 + j(5, 10)], [xc - hw * 1.25 + j(6, 3), base - h * 0.74 + j(7, 8)], [xc - hw * 0.95 + j(8, 2), topY + 10 * grow + j(9, 5)]];
    const T = [[xc - hw * 0.5 + j(10, 2), topY + j(11, 4)], [xc - hw * 0.08, topY + 9 * grow + j(12, 4)], [xc + hw * 0.36, topY + 2 * grow + j(13, 4)], [xc + hw * 0.82, topY + 15 * grow + j(14, 5)]];
    const R = [[xc + hw * 1.25 + j(15, 3), base - h * 0.68 + j(16, 8)], [xc + hw * 1.62 + j(17, 3), base - h * 0.42 + j(18, 10)], [xc + hw * 2.0 + j(19, 4), base - h * 0.18 + j(20, 8)], [xc + hw * 2.4 + j(21, 4), base]];
    poly([...L, ...T, ...R], ICE);
    const k1 = [xc - hw * 0.6, base - h * 0.3], k2 = [xc + hw * 0.7, base - h * 0.36];
    poly([L[0], L[1], L[2], L[3], k1, [xc - hw, base]], ICE_L);
    poly([T[3], R[0], R[1], R[2], R[3], [xc + hw * 0.9, base], k2], ICE_D);
    for (const [p, q] of [[L[4], k1], [L[2], k1], [T[1], k1], [T[1], k2], [T[3], k2], [R[1], k2], [k1, [xc - hw, base]], [k2, [xc + hw * 0.9, base]]]) line([p, q], 'rgba(235,246,255,.5)', 0.9);
    line([L[4], ...T, R[0]], SNOW, 4.2 * grow);
    cap(T[0][0] - 3, T[0][1] + 1, T[2][0] + 3, T[2][1] + 1, 5 * grow);
    for (const q of [L[2], L[3], R[0], R[1]]) cap(q[0] - hw * 0.34, q[1] + 1, q[0] + hw * 0.34, q[1] + 1, 3.6 * grow);
    line([L[1], L[2], L[3], L[4]], 'rgba(244,248,255,.85)', 1.6);
    line([R[0], R[1], R[2]], 'rgba(244,248,255,.6)', 1.4);
    c.beginPath(); c.ellipse(xc, base - 2, hw * 2.7, (6 + hw * 0.22) * grow, 0, 0, TAU); c.fillStyle = SNOW; c.fill();
  }

  /** Un héliostat : pied de bronze, axe, plaque (dos de bronze, face dorée, reflet). */
  function helio(cx, cy, baseY, dir, len, k, shine) {
    const n = [dir[1], -dir[0]], e1 = add([cx, cy], dir, len), e2 = add([cx, cy], dir, -len);
    poly([[cx - 6 * k, baseY], [cx - 3.2 * k, baseY - 5 * k], [cx + 3.2 * k, baseY - 5 * k], [cx + 6 * k, baseY]], C.bronzeD);
    poly([[cx - 1.8 * k, baseY - 5 * k], [cx - 1.3 * k, cy], [cx + 1.3 * k, cy], [cx + 1.8 * k, baseY - 5 * k]], C.bronze);
    return { c: [cx, cy], n, e1, e2, k, shine };
  }
  function plate(m) {
    const k = m.k;
    line([add(m.e1, m.n, -1.6 * k), add(m.e2, m.n, -1.6 * k)], C.bronzeD, 4.2 * k);
    line([m.e1, m.e2], C.mirror, 3.2 * k);
    alpha(m.shine, () => line([add(m.e1, m.n, k), add(m.e2, m.n, k)], '#fff8dc', k));
    const p = add(m.c, m.n, -2.6 * k);
    circle(p[0], p[1], 3 * k, C.bronze); circle(p[0], p[1], 1.2 * k, C.goldL);
  }
  /** Les deux bouts d'un miroir, rangés pour qu'un faisceau venu de (ou parti vers) `d` ne se croise pas. */
  const ends = (m, d) => { const p = [-d[1], d[0]]; return (m.e1[0] - m.c[0]) * p[0] + (m.e1[1] - m.c[1]) * p[1] > 0 ? [m.e1, m.e2, p] : [m.e2, m.e1, p]; };
  /** Le soleil éclaire un miroir : le faisceau naît au bord du disque, mince, et arrive large comme le miroir. */
  function fromSun(sun, R, m, a) { const d = norm(sub(m.c, sun)), [e1, e2, p] = ends(m, d), o = add(sun, d, R - 2); shaft([add(o, p, 3.5), e1, e2, add(o, p, -3.5)], o, m.c, 0.75 * a, 0.5 * a, [0.35, 0.34 * a]); }
  /** Le miroir renvoie la lumière : le faisceau part de toute sa largeur et se resserre sur la cible. */
  function toTarget(m, T, w, a0, a1) { const d = norm(sub(T, m.c)), [e1, e2, p] = ends(m, d); shaft([e1, add(T, p, w), add(T, p, -w), e2], m.c, T, a0, a1); }

  function cloud(cx, cy, w, h, body, rim) {
    const lobes = [[-0.34, 0.06, 0.52], [-0.12, -0.3, 0.82], [0.14, -0.14, 0.7], [0.36, 0.08, 0.5]];
    for (const [dy, fill] of [[2.5, rim], [0, body]]) {
      for (const [fx, fy, fr] of lobes) circle(cx + fx * w, cy + fy * h + dy, h * fr, fill);
      c.beginPath(); c.roundRect(cx - w / 2, cy - h * 0.1 + dy, w, h * 0.62, h * 0.31); c.fillStyle = fill; c.fill();
    }
  }
  function tree(x, y, r, fill) { line([[x, y + r - 1], [x, y + r + 5]], '#8a6a44', 2); circle(x, y, r, fill); path(`M${x} ${y - r} A${r} ${r} 0 0 1 ${x} ${y + r}z`, 'rgba(40,90,70,.28)'); }

  /** Un ancien : longue robe blanche à capuchon, ceinture d'or, masque d'or. */
  function elder(x, y, h, { dir = 1, staff = false, arm = false, halo = false } = {}) {
    const u = h / 100, X = (v) => x + v * u * dir, Y = (v) => y - v * u;
    if (halo) ring(X(0), Y(88), 13 * u, C.gold, 2.2 * u);
    if (staff) { line([[X(30), Y(0)], [X(30), Y(112)]], C.bronzeD, 2.4 * u + 0.6); line([[X(21), Y(116)], [X(39), Y(108)]], C.mirror, 4 * u + 1); glow(X(30), Y(112), 16 * u + 4, 0.8); }
    path(`M${X(-13)} ${Y(76)} Q${X(-19)} ${Y(40)} ${X(-27)} ${Y(0)} H${X(27)} Q${X(19)} ${Y(40)} ${X(13)} ${Y(76)} Q${X(0)} ${Y(82)} ${X(-13)} ${Y(76)}z`, ROBE);
    path(`M${X(4)} ${Y(79)} Q${X(8)} ${Y(40)} ${X(10)} ${Y(0)} H${X(27)} Q${X(19)} ${Y(40)} ${X(13)} ${Y(76)}z`, ROBE_S);
    path(`M${X(-13)} ${Y(74)} Q${X(-24)} ${Y(58)} ${X(-22)} ${Y(38)} L${X(-14)} ${Y(40)} Q${X(-14)} ${Y(58)} ${X(-9)} ${Y(70)}z`, ROBE);
    if (staff || arm) path(`M${X(12)} ${Y(74)} Q${X(24)} ${Y(70)} ${X(32)} ${Y(staff ? 62 : 84)} L${X(28)} ${Y(staff ? 54 : 78)} Q${X(20)} ${Y(60)} ${X(10)} ${Y(64)}z`, ROBE_S);
    else path(`M${X(13)} ${Y(74)} Q${X(24)} ${Y(58)} ${X(22)} ${Y(38)} L${X(14)} ${Y(40)} Q${X(14)} ${Y(58)} ${X(9)} ${Y(70)}z`, ROBE_S);
    line([[X(-14), Y(52)], [X(15), Y(52)]], C.gold, 2.6 * u + 0.4); line([[X(0), Y(52)], [X(0), Y(6)]], C.gold, 1.6 * u + 0.3);
    path(`M${X(-10)} ${Y(78)} Q${X(-12)} ${Y(100)} ${X(0)} ${Y(101)} Q${X(12)} ${Y(100)} ${X(10)} ${Y(78)}z`, ROBE);
    c.beginPath(); c.ellipse(X(1.5), Y(88), 5.6 * u, 7 * u, 0, 0, TAU); c.fillStyle = MASK; c.fill();
    path(`M${X(4)} ${Y(100)} Q${X(12)} ${Y(98)} ${X(10)} ${Y(78)} L${X(6)} ${Y(80)}z`, ROBE_S);
  }
  /** Un oiseau blanc, qui bat des ailes. */
  function bird(x, y, k, flap) { const w = 5 * k, lift = Math.sin(flap) * 2.6 * k; path(`M${x - w} ${y - lift} Q${x - w * 0.5} ${y - 1.6 * k - lift * 0.4} ${x} ${y} Q${x + w * 0.5} ${y - 1.6 * k - lift * 0.4} ${x + w} ${y - lift}`, null, '#ffffff', 1.3 * k); }
  /** Un point à la fraction u d'un trajet en plusieurs segments. */
  function along(pts, u) { let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); let d = len * clamp(u, 0, 1);
    for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); if (d <= l) return [lerp(pts[k - 1][0], pts[k][0], d / l), lerp(pts[k - 1][1], pts[k][1], d / l)]; d -= l; } return pts[pts.length - 1]; }
  /** Un ancien, vu de loin. */
  function small(x, y, h = 13) { poly([[x - h * 0.2, y - h * 0.72], [x - h * 0.3, y], [x + h * 0.3, y], [x + h * 0.2, y - h * 0.72]], ROBE); poly([[x + h * 0.05, y - h * 0.72], [x + h * 0.08, y], [x + h * 0.3, y], [x + h * 0.2, y - h * 0.72]], ROBE_S); circle(x, y - h * 0.84, h * 0.16, MASK); line([[x - h * 0.2, y - h * 0.4], [x + h * 0.2, y - h * 0.4]], C.gold, 1); }
  /** Un villageois d'aujourd'hui : cape sombre, visage pâle, comme dans le jeu. */
  function folk(x, y, h, dir) { const u = h / 30; path(`M${x - 9 * u} ${y} Q${x - 10 * u} ${y - 18 * u} ${x} ${y - 30 * u} Q${x + 10 * u} ${y - 18 * u} ${x + 9 * u} ${y}z`, NIGHT); c.beginPath(); c.ellipse(x + dir * 1.5 * u, y - 18 * u, 4.6 * u, 5 * u, 0, 0, TAU); c.fillStyle = '#e9e4d6'; c.fill(); circle(x + dir * 0.2 * u, y - 18.5 * u, 0.8 * u, NIGHT); circle(x + dir * 3.4 * u, y - 18.5 * u, 0.8 * u, NIGHT); }
  /** Une hutte du village : dôme sombre, calotte de neige, porte éclairée. */
  function hut(x, y, r, smoke, t) {
    path(`M${x - r} ${y} A${r} ${r * 0.9} 0 0 1 ${x + r} ${y}z`, '#2b3566');
    path(`M${x + 1} ${y} V${y - r * 0.6} Q${x + r * 0.7} ${y - r * 0.5} ${x + r} ${y}z`, 'rgba(10,14,40,.35)');
    path(`M${x - r * 0.9} ${y - r * 0.4} A${r} ${r * 0.9} 0 0 1 ${x + r * 0.9} ${y - r * 0.4} Q${x} ${y - r * 0.62} ${x - r * 0.9} ${y - r * 0.4}z`, SNOW);
    glow(x, y - 5, 16, 0.9);
    poly([[x - 4, y], [x - 4, y - 9], [x + 4, y - 9], [x + 4, y]], '#ffd98a');
    alpha(smoke, () => { const sx = x + r * 0.4, sy = y - r * 0.85, w = Math.sin(t * 1.3 + x) * 3; path(`M${sx} ${sy} q${-6 + w} -9 1 -17 q${6 - w} -8 -1 -17`, null, 'rgba(120,135,195,.6)', 2.6); });
  }

  // ───────────────────────────── L'image ─────────────────────────────

  function draw(film) {
    const p = filmState(film.t);
    const t = p.t;
    // La scène est centrée, et calée juste au-dessus du bandeau de texte.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.width / dpr, ch = (canvas.height / dpr) * (1 - FILM_BAND);
    const s = Math.min(cw / W, ch / H);
    c.setTransform(dpr * s, 0, 0, dpr * s, (dpr * (cw - W * s)) / 2, dpr * (ch - H * s));
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    C = {}; for (const key in WARM) C[key] = mix(COLD[key], WARM[key], p.warm);
    const cold = 1 - p.warm; // à quel point le froid s'est installé
    const sunR = 20;

    // ── le ciel ──
    const sky = c.createLinearGradient(0, 0, 0, H);
    SKY_AT.forEach((at, i) => { let col = mix(SKIES.closed[i], SKIES.gold[i], p.warm); col = mix(col, SKIES.night[i], p.night); col = mix(col, SKIES.dawn[i], p.dawn); sky.addColorStop(at, col); });
    c.fillStyle = sky; c.fillRect(LEFT, -600, RIGHT - LEFT, H + 600);
    alpha(Math.max(p.night * 0.9, 0.7 * p.dawn) * cold, () => { for (let i = 0; i < 34; i++) circle(((i * 131 + 17) % 440) - 40, (i * 71 + 9) % 290, 0.6 + (i % 3) * 0.3, 'rgba(230,238,255,.75)'); });
    // le soleil de l'âge d'or : ses rayons (le disque vient après les faisceaux)
    alpha(p.sun, () => { for (let i = 0; i < 8; i++) { const a = 0.05 + i * 0.24 + Math.sin(t * 0.25 + i) * 0.02; poly([SUN, add(SUN, [Math.cos(a), Math.sin(a)], 620), add(SUN, [Math.cos(a + 0.06), Math.sin(a + 0.06)], 620)], 'rgba(255,246,214,.09)'); } });
    // le soleil d'aujourd'hui, qui se lève derrière les crêtes
    const dawnSun = [220, lerp(548, 446, p.sunrise)];
    alpha(p.dawn, () => { glow(dawnSun[0], dawnSun[1], 82, 0.95); circle(dawnSun[0], dawnSun[1], 15, '#ffe6c4'); });
    // des oiseaux blancs traversent le ciel de l'âge d'or
    alpha(p.sun, () => { for (let i = 0; i < 7; i++) { const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1; bird(-30 + t * 52 - row * 13, 236 + side * row * 8 + Math.sin(t * 0.8) * 6, 1, t * 9 + i); }
      for (let i = 0; i < 4; i++) bird(430 - (t - 2.4) * 64 + i * 15, 118 + (i % 2) * 9 + Math.sin(t * 0.7 + 2) * 5, 0.8, t * 10 + i * 2); });
    // deux petits nuages blancs, au temps de l'âge d'or
    alpha(p.warm * 0.85, () => { cloud(300 + t * 1.2, 250, 60, 14, '#ffffff', '#e4eef6'); cloud(34 + t * 0.8, 318, 50, 12, '#ffffff', '#e4eef6'); });
    // les longs nuages de l'aube
    alpha(p.dawn, () => { for (const [x, y, w] of [[-10, 498, 130], [250, 486, 130], [120, 520, 90]]) { c.beginPath(); c.roundRect(x, y, w, 7, 3.5); c.fillStyle = 'rgba(244,206,198,.55)'; c.fill(); }
      const d = Math.sin(t * 0.3) * 2; cloud(240 + d, 464, 112, 26, '#8f93c9', '#f3c9c0'); cloud(74 - d, 322, 104, 28, '#7b82bf', '#c9b3d6'); cloud(304 + d, 262, 82, 22, '#6f77b6', '#b9a9d2'); });

    // ── les lointains ──
    poly([[LEFT, 560], [-40, 540], [0, 566], [44, 528], [96, 552], [150, 516], [214, 548], [276, 514], [330, 540], [360, 526], [400, 548], [RIGHT, 530], [RIGHT, 660], [LEFT, 660]], C.far2);
    alpha(p.ground, () => { for (const q of [[[26, 544], [44, 528], [62, 538], [50, 540], [40, 546]], [[132, 530], [150, 516], [170, 526], [156, 528], [146, 534]], [[258, 526], [276, 514], [296, 526], [282, 526], [272, 532]]]) poly(q, SNOW); });
    poly([[LEFT, 590], [0, 596], [70, 566], [140, 588], [226, 562], [300, 586], [360, 570], [RIGHT, 584], [RIGHT, 660], [LEFT, 660]], C.far);

    // ── les lames du fond : elles tombent une à une, chacune dans sa glace ──
    BACKS.forEach(([x, w, top, dir, ruined], i) => { const whole = dir > 0 ? [[0, top + 9], [1, top]] : [[0, top], [1, top + 9]]; const prof = erode(whole, ruined, p.ruin.back(i % 8));
      tower(x, w, 650, prof, { back: true, snow: p.ground, snowW: 2.6 });
      ice(x + w / 2, w * 0.62, Math.min(600, Math.max(...ruined.map((q) => q[1])) + 70 + rnd(i) * 40), 664, i + 20, p.ice(i % 5)); });

    // ── la cage du cœur, côté lointain : des anneaux qui tournent, puis des fragments ──
    glow(HEART[0], HEART[1], 130, 0.8 * p.power);
    const rot = p.spin * 0.5;
    alpha(1 - p.cage, () => { oval(180, 346, 74, 18, -0.42 + rot, C.bronze, 3.5); oval(180, 346, 74, 18, 0.6 - rot * 0.7, C.bronze, 3); ring(180, 346, 52, C.bronze, 5); });
    alpha(p.cage, () => { ring(180, 346, 52, C.bronze, 5, -2.23, -1.12); ring(180, 346, 52, C.bronze, 5, 0.72, 1.38); oval(180, 346, 74, 18, -0.42, C.bronze, 3.2, 0, 0.95); });

    // ── les quatre grandes lames ──
    const tw = {};
    for (const [name, d] of Object.entries(TOWERS)) { const k = p.ruin[name]; const prof = erode(d.whole, d.ruin, k); tw[name] = prof;
      tower(d.x, d.w, 650, prof, { snow: p.ground });
      // la coiffe de bronze du biseau (elle part avec le sommet)
      const f0 = name === 'leftTall' ? 0.36 * k : 0;
      alpha(name === 'leftTall' ? 1 : 1 - k * 3, () => { const a = [d.x + d.w * f0, profileAt(d.whole, f0)], b = [d.x + d.w, profileAt(d.whole, 1)]; poly([[a[0] - 1, a[1] + 4], [a[0] - 1, a[1] - 1], [b[0] + 1, b[1] - 1], [b[0] + 1, b[1] + 4]], C.bronze); }); }
    // des cabines de bronze montent et descendent le long des lames, tant que le cœur bat
    alpha(1 - p.ground, () => { Object.values(TOWERS).forEach((d, i) => { const x = d.x + d.w * 0.2, top = Math.max(...d.whole.map((q) => q[1])) + 34, y = lerp(top, 612, 0.5 + 0.5 * Math.sin(p.spin * 0.75 + i * 1.9));
      poly([[x - 3.2, y - 5], [x + 3.2, y - 5], [x + 3.2, y + 5], [x - 3.2, y + 5]], C.bronze); poly([[x - 1.8, y - 3], [x + 1.8, y - 3], [x + 1.8, y + 1], [x - 1.8, y + 1]], mix(C.win, '#fffdf0', p.power)); glow(x, y - 1, 7, 0.8 * p.power); }); });
    alpha(p.cracks, () => { line([[30, 360], [38, 384], [34, 410], [42, 436]], C.deep, 1.1); line([[58, 300], [52, 330], [56, 352]], C.deep, 1.1); line([[304, 380], [312, 408], [306, 436]], C.deep, 1.1); line([[330, 340], [326, 366], [331, 390]], C.deep, 1.1); });
    // le socle et le grand miroir de gauche (il se replie, et il tiendra mille ans)
    const pedestal = (x0, x1, y0, y1, flat) => { poly([[x0, y0], [x0, flat], [x1, flat], [x1, y1]], C.stone); const mx = x0 + (x1 - x0) * 0.58; poly([[mx, y0 + (y1 - y0) * 0.58], [mx, flat], [x1, flat], [x1, y1]], C.shade); poly([[x0 - 1.5, flat], [x1 + 1.5, flat], [x1 + 1.5, flat + 2.6], [x0 - 1.5, flat + 2.6]], C.bronze); };
    const FOLDED = [0.12, -0.99];
    pedestal(42, 62, 248.2, 233.5, 222);
    const mL = helio(52, 206, 222, turnTo(aim(SUN, [52, 206], TOP), FOLDED, p.foldLeft), 16, 1.25, p.sun * (1 - p.foldLeft));
    // celui de droite tombe avec le sommet de sa tour
    const rightUp = 1 - clamp(p.ruin.rightTall * 5, 0, 1);
    let mR = null;
    alpha(rightUp, () => { pedestal(298, 318, 177.5, 192.5, 166); mR = helio(308, 150, 166, turnTo(aim(SUN, [308, 150], TOP), FOLDED, p.foldRight), 16, 1.25, p.sun * (1 - p.foldRight)); });
    // les lanternes des petites tours, allumées par le cœur
    for (const [name, x, y] of [['leftSmall', 88, 384], ['rightSmall', 272, 344]]) alpha(1 - p.ruin[name] * 4, () => { poly([[x - 5, y + 3], [x - 3, y - 7], [x + 3, y - 7], [x + 5, y + 3]], C.bronze); glow(x, y - 12, 16, p.power); circle(x, y - 12, 4.6, mix(C.glass, '#fffdf0', p.power)); ring(x, y - 12, 4.6, C.gold, 1.4); });
    // la glace monte sur chaque lame
    Object.values(TOWERS).forEach((d, i) => ice(d.ice[0], d.ice[1], d.ice[2], 668, d.ice[3], p.ice(i)));
    alpha(p.ice(0), () => { icicles(27, 37, 301, 3, 1.3); icicles(298, 320, 334, 4, 1.2); });

    // ── l'aiguille : son socle, son fût ouvert autour du cœur, la lumière qui y descend ──
    for (const [hw, y0, y1] of [[62, 650, 630], [46, 630, 610], [32, 610, 590]]) { poly([[180 - hw, y0], [180 - hw, y1], [180 + hw, y1], [180 + hw, y0]], C.stone); poly([[180 + hw * 0.2, y0], [180 + hw * 0.2, y1], [180 + hw, y1], [180 + hw, y0]], C.shade); line([[180 - hw, y1], [180 + hw, y1]], '#ffffff', 1); alpha(p.ground, () => cap(180 - hw, y1, 180 + hw, y1, 5)); }
    const half = (y) => 7 + (y - 186) * 0.024;
    const stone = (y0, y1) => { poly([[180 - half(y0), y0], [180 - half(y1), y1], [180 + half(y1), y1], [180 + half(y0), y0]], C.stone); poly([[180 + half(y0) * 0.15, y0], [180 + half(y1) * 0.15, y1], [180 + half(y1), y1], [180 + half(y0), y0]], C.shade); for (let y = Math.ceil(y1 / 44) * 44; y < y0; y += 44) line([[180 - half(y), y], [180 + half(y), y]], C.deep, 1); };
    stone(590, 392); stone(300, 186);
    alpha(p.power * 0.9, () => { for (const [y0, hh] of [[178, 122], [392, 198]]) { const g = c.createLinearGradient(174, 0, 186, 0); g.addColorStop(0, 'rgba(255,226,154,0)'); g.addColorStop(0.5, 'rgba(255,251,230,1)'); g.addColorStop(1, 'rgba(255,226,154,0)'); c.fillStyle = g; c.fillRect(174, y0, 12, hh); } });
    line([[180, 180], [180, 300]], C.gold, 1.3 + 0.7 * p.power); line([[180, 392], [180, 590]], C.gold, 1.3 + 0.7 * p.power);
    alpha(p.cracks, () => { line([[176, 214], [183, 238], [178, 262], [184, 284]], C.deep, 1.2); line([[172, 430], [180, 462], [174, 496], [183, 530]], C.deep, 1.2); });
    poly([[170, 190], [172, 178], [188, 178], [190, 190]], C.bronze);

    // ── le soleil, ses faisceaux, les grands miroirs, le cristal ──
    alpha(1, () => { const aL = p.sun * (1 - p.foldLeft), aR = p.sun * (1 - p.foldRight) * rightUp;
      if (aL > 0.01) { fromSun(SUN, sunR, mL, aL); toTarget(mL, TOP, 5, 0.62 * aL, 0.42 * aL); }
      if (mR && aR > 0.01) { fromSun(SUN, sunR, mR, aR); toTarget(mR, TOP, 5, 0.62 * aR, 0.42 * aR); } });
    // des poussières d'or voyagent dans les faisceaux, des miroirs vers le cristal
    for (const [m, a] of [[mL, p.sun * (1 - p.foldLeft)], [mR, p.sun * (1 - p.foldRight) * rightUp]]) if (m && a > 0.02) alpha(a, () => { const d = norm(sub(TOP, m.c)), q = [-d[1], d[0]]; for (let i = 0; i < 7; i++) { const u = (t * 0.32 + i / 7) % 1, o = add([lerp(m.c[0], TOP[0], u), lerp(m.c[1], TOP[1], u)], q, Math.sin(t * 1.7 + i * 2.1) * 6 * (1 - u)); circle(o[0], o[1], 0.9 + (i % 3) * 0.3, 'rgba(255,250,225,.9)'); } });
    alpha(p.sun, () => { glow(SUN[0], SUN[1], 92); circle(SUN[0], SUN[1], sunR + 5, 'rgba(255,246,214,.55)'); circle(SUN[0], SUN[1], sunR, '#fff6d6'); });
    // le ciel se ferme : de grands nuages arrivent des deux côtés et couvrent le soleil ; ils resteront mille ans
    alpha(p.clouds * (1 - p.dawn), () => { const k = smooth(p.clouds), drift = p.cloudDrift * 2.2, body = mix('#6f7a9c', '#f2f5f9', p.warm), rim = mix('#4f5a80', '#cfd9e6', p.warm);
      cloud(lerp(-150, 62, k) + drift, 52, 190, 50, body, rim); cloud(lerp(520, 262, k) - drift, 72, 200, 46, body, rim); cloud(lerp(-170, 160, k) + drift * 0.6, 20, 150, 36, body, rim); });
    // l'anneau du cristal : entier, puis ébréché
    glow(TOP[0], TOP[1], 50, p.sun);
    alpha(1 - p.topRing, () => { ring(180, 150, 26, C.bronze, 5.5); ring(180, 150, 23.2, C.bronzeD, 0.8); });
    alpha(p.topRing, () => { ring(180, 150, 26, C.bronze, 5.5, -0.66, 1.88); ring(180, 150, 26, C.bronze, 5.5, 3.03, 4.34); });
    for (let i = 0; i < 12; i++) { if (p.topRing > 0.5 && ![0, 1, 2, 5, 6, 8].includes(i)) continue; const a = (i / 12) * TAU, r1 = i % 3 ? 34.5 : 37.5; line([[180 + Math.cos(a) * 31.5, 150 + Math.sin(a) * 31.5], [180 + Math.cos(a) * r1, 150 + Math.sin(a) * r1]], C.bronze, 1.4); }
    const lit = Math.max(p.sun, p.glint * 0.8);
    poly([[180, 130], [192, 150], [180, 170], [168, 150]], mix('#5f78bc', '#fff6c8', lit)); line([[180, 130], [192, 150], [180, 170], [168, 150], [180, 130]], mix('#8ea5e0', '#ffffff', lit), 1); line([[180, 130], [178, 150], [180, 170]], mix('#8ea5e0', '#ffffff', lit), 0.8);
    alpha(p.sun, () => poly([[180, 130], [192, 150], [180, 170]], 'rgba(255,210,120,.35)'));
    alpha(p.ground, () => { cap(172, 133, 188, 133, 5); icicles(160, 200, 176, 5, 1.1); });
    plate(mL); alpha(p.ground, () => cap(52, 191, 58, 190, 4)); if (mR) alpha(rightUp, () => plate(mR));

    // ── l'esplanade, son champ de miroirs : chacun vise le cristal, puis se couche ──
    poly([[LEFT, 650], [RIGHT, 650], [RIGHT, 800], [LEFT, 800]], C.stone); for (const y of [664, 676]) line([[LEFT, y], [RIGHT, y]], C.shade, 1);
    alpha(1 - p.ground, () => { [[670, 7, 20, 5.5, 0.62], [687, 6, 27, 6.5, 0.74]].forEach(([y, n, gap, len, k], r) => { for (let i = 0; i < n; i++) for (const side of [-1, 1]) { const x = 180 + side * (58 + i * gap); if (x < 8 || x > 352) continue;
      const f = p.foldField(i + r * 3), m = helio(x, y - 9 * k, y, turnTo(aim(SUN, [x, y - 9 * k], TOP), [1, 0.04 * side], f), len, k, p.sun * (1 - f) * (0.55 + 0.45 * Math.sin(t * 2.6 - x * 0.045)));
      if (i % 2 === r && p.sun * (1 - f) > 0.02) toTarget(m, TOP, 0.8, 0.3 * p.sun * (1 - f), 0.05 * p.sun * (1 - f)); plate(m); } }); });

    // ── le cœur : la sphère dans sa cage, les passerelles, les sillons de lumière ──
    const beat = Math.pow(Math.max(0, Math.sin(p.spin * 3.4)), 6); // le cœur bat
    glow(180, 346, 78 + 16 * beat, p.power);
    line([[170, 300], [154, 346], [170, 392]], C.bronze, 4);
    if (p.cage < 0.5) line([[190, 300], [206, 346], [190, 392]], C.bronze, 4); else line([[190, 300], [199, 326]], C.bronze, 4); // un montant cède
    RUNS.slice(0, 4).forEach((r, i) => { const b = p.bridge(i), full = r.slice(0, 3), stub = i === 0 ? [[150, 346], [124, 346]] : i === 3 ? [[210, 356], [224, 370]] : null;
      const way = b < 0.5 ? full : stub; if (!way) return; line(way, C.shade, 10); line(way, C.stone, 7); });
    alpha(p.ground * (p.bridge(0) > 0.5 ? 1 : 0.6), () => { cap(122, 342, 150, 342, 4); icicles(124, 150, 351, 4, 1.4); });
    circle(180, 346, 30, mix('#3d4b86', '#fff3c4', p.power)); circle(180, 346, 20 + 3 * beat * p.power, mix('#4a5a98', '#fffdf0', p.power));
    ring(180, 346, 30, C.gold, 2); oval(180, 346, 30, 9, 0, C.bronze, 1.6); oval(180, 346, 9, 30, 0, C.bronze, 1.6);
    alpha(p.cracks, () => line([[166, 330], [176, 346], [170, 362]], '#1c2450', 1.1));
    alpha(p.ice(2), () => { poly([[148, 352], [154, 372], [164, 384], [180, 390], [198, 384], [208, 370], [213, 352], [200, 364], [180, 370], [160, 364]], ICE); line([[148, 352], [160, 364], [180, 370], [200, 364], [213, 352]], 'rgba(235,246,255,.7)', 1); icicles(156, 206, 384, 7, 2.4 * p.ice(2)); });
    alpha(p.ground, () => { path('M151 338 A30 30 0 0 1 209 338 Q196 322 180 326 Q164 322 151 338z', SNOW); path('M160 318 Q180 302 200 318 Q180 312 160 318z', SNOW); });
    // les sillons : sombres quand la cité dort, d'or quand elle vit, avec des perles de lumière qui voyagent
    const topOf = { 4: ['leftSmall', 0.5], 5: ['rightSmall', 0.5], 7: ['rightTall', 0.5] };
    RUNS.forEach((r, i) => { if (i < 4) { if (p.bridge(i) > 0.5 || p.power > 0.98) return; return alpha(1 - p.power, () => line(r.slice(0, 3), C.gold, 1.4)); }
      const stop = topOf[i] ? profileAt(tw[topOf[i][0]], topOf[i][1]) + 8 : 0; alpha(1 - p.power, () => line([[r[0][0], Math.max(r[0][1], stop)], r[1]], C.gold, 1.4)); });
    alpha(p.power, () => { for (const r of RUNS) { line(r, 'rgba(255,200,90,.45)', 6); line(r, '#ffe29a', 2.2); }
      RUNS.forEach((r, i) => { let len = 0; for (let k = 1; k < r.length; k++) len += Math.hypot(r[k][0] - r[k - 1][0], r[k][1] - r[k - 1][1]);
        for (let n = 0; n < Math.max(1, Math.round(len / 90)); n++) { let d = ((t * 34 + n * 90 + i * 37) % len + len) % len; for (let k = 1; k < r.length; k++) { const l = Math.hypot(r[k][0] - r[k - 1][0], r[k][1] - r[k - 1][1]); if (d <= l) { const x = lerp(r[k - 1][0], r[k][0], d / l), y = lerp(r[k - 1][1], r[k][1], d / l); glow(x, y, 9); circle(x, y, 2.2, '#fffdf0'); break; } d -= l; } } });
      for (const d of Object.values(TOWERS)) for (let y = Math.max(...d.whole.map((q) => q[1])) + 60; y < 630; y += 30) glow(d.x + d.w * 0.4, y + 4, 9, 0.9); });
    // les lampes de l'esplanade, les anciens qui s'y promènent
    alpha(1 - p.ground, () => { for (const x of [20, 60, 108, 252, 300, 340]) { line([[x, 650], [x, 634]], C.bronzeD, 1.6); glow(x, 632, 10, p.power); circle(x, 632, 2.6, mix(C.glass, '#fffdf0', p.power)); } });
    // l'esplanade est pleine de monde : chacun va son chemin, d'autres passent sur les passerelles
    const leave = smooth(1 - p.elders), going = p.elders < 1 && p.elders > 0;
    alpha(clamp(p.elders * 4, 0, 1), () => {
      for (let i = 0; i < 11; i++) { const speed = (7 + rnd(i) * 9) * (i % 2 ? 1 : -1) * (1 + leave * 6), x = ((((rnd(i + 40) * 400 + speed * t) % 440) + 440) % 440) - 40; small(x, 650 - Math.abs(Math.sin(t * 7 + i * 1.3)) * 0.9, 11 + rnd(i + 9) * 3); }
      [[RUNS[2].slice(0, 3), 0.42, 0], [RUNS[3].slice(0, 3), 0.36, 2.1], [RUNS[0].slice(0, 3), 0.5, 4]].forEach(([way, speed, phase]) => { const q = along(way, 0.12 + 0.76 * (0.5 + 0.5 * Math.sin(t * speed + phase))); small(q[0], q[1] - 4, 9); });
    });
    // la glace au pied de l'aiguille
    ice(180, 30, 546, 668, 5, p.ice(4));

    // ── la terrasse des anciens ──
    poly([[LEFT, 706], [RIGHT, 706], [RIGHT, 800], [LEFT, 800]], C.shade); poly([[LEFT, 706], [RIGHT, 706], [RIGHT, 712], [LEFT, 712]], C.stone); poly([[LEFT, 756], [RIGHT, 756], [RIGHT, 800], [LEFT, 800]], C.deep);
    alpha(1 - p.ground, () => { for (let x = -70; x < RIGHT; x += 20) line([[x, 712], [x, 724]], C.stone, 2.4); line([[LEFT, 724], [RIGHT, 724]], C.stone, 3); });
    alpha(p.warm, () => { tree(22 + Math.sin(t * 1.1) * 0.8, 690, 12, C.tree); tree(338 + Math.sin(t * 0.9 + 1) * 0.9, 688, 13, C.tree2); });
    // au second plan, un ancien et un enfant traversent la terrasse
    if (p.elders > 0) { const x = -40 + t * 21 + leave * 260, step = Math.abs(Math.sin(t * 5.2)) * 1.2; elder(x, 752 - step, 46, { dir: 1, arm: true }); elder(x - 26, 752 - Math.abs(Math.sin(t * 6.4 + 1)) * 1.4, 30, { dir: 1 }); }
    if (p.elders > 0) { const out = leave * 240, bob = (i) => (going ? Math.abs(Math.sin(t * 6 + i * 1.3)) * 1.6 : Math.sin(t * 1.5 + i * 1.7) * 0.5); // ils respirent, puis ils marchent jusqu'à sortir de l'image
      elder(54 - out, 779 - bob(0), 72, { dir: going ? -1 : 1, halo: true }); elder(102 - out * 1.15, 779 - bob(1), 60, { dir: -1 }); elder(304 + out, 779 - bob(2), 74, { dir: going ? 1 : -1, staff: true }); elder(246 + out * 1.15, 779 - bob(3), 58, { dir: 1, arm: true }); }

    // ── mille ans : la neige monte, et ce qui tombe y reste ──
    const up = (1 - p.ground) * 150; // la neige arrive par le bas de l'image
    c.save(); c.translate(0, up);
    path(`M${LEFT} 664 L0 664 Q40 640 96 654 T200 648 T300 652 T360 640 L${RIGHT} 644 V960 H${LEFT}z`, SNOW);
    c.restore();
    alpha(p.blocks, () => { const fall = (1 - p.blocks) * -24; for (const [x, w, a] of [[20, 50, -9], [78, 40, -6], [124, 30, -3]]) { c.save(); c.translate(x, 672 + fall); c.rotate((a * Math.PI) / 180); poly([[0, -12], [w, -12], [w, 5], [0, 5]], C.stone); poly([[w * 0.62, -12], [w, -12], [w, 5], [w * 0.62, 5]], C.shade); path(`M-2 -11 Q${w / 2} -24 ${w + 2} -11z`, SNOW); c.restore(); } });
    alpha(p.cage, () => { const fall = (1 - p.cage) * -30; c.save(); c.translate(0, fall); path('M206 690 A40 40 0 0 1 270 668', null, C.bronze, 5.5); path('M214 676 A40 40 0 0 1 262 664', null, SNOW, 3); c.restore(); });
    alpha(p.ground, () => { for (const [x, y, a] of [[150, 672, 0.5], [292, 662, -0.4], [330, 672, 0.2]]) { line([[x, y], [x, y - 7]], C.bronzeD, 2); line([[x - Math.cos(a) * 6, y - 8 - Math.sin(a) * 6], [x + Math.cos(a) * 6, y - 8 + Math.sin(a) * 6]], C.mirror, 3); cap(x - 5, y - 10, x + 5, y - 9, 3); } });
    c.save(); c.translate(0, up);
    path(`M${LEFT} 700 L0 700 Q70 682 150 694 T360 684 L${RIGHT} 688 V960 H${LEFT}z`, SNOW2);
    c.restore();
    // ce qui reste de la balustrade
    alpha(p.ground, () => { for (const x of [14, 34, 330, 350]) line([[x, 720], [x, 704]], C.stone, 2.6); line([[8, 704], [40, 704]], C.stone, 3); line([[324, 704], [356, 704]], C.stone, 3); cap(8, 702, 40, 702, 3.5); cap(324, 702, 356, 702, 3.5); });
    c.save(); c.translate(0, up);
    path(`M${LEFT} 738 L0 738 Q80 716 170 730 T360 722 L${RIGHT} 726 V960 H${LEFT}z`, SNOW);
    c.restore();

    // ── le petit peuple arrive et s'installe au pied des ruines ──
    [[60, 754, 24], [112, 760, 17], [18, 764, 14]].forEach(([x, y, r], i) => { const k = p.hut(i); if (k <= 0.01) return; c.save(); c.translate(x, y); c.scale(k, k * (1 + 0.15 * Math.sin(k * Math.PI))); c.translate(-x, -y); hut(x, y, r, p.smoke(i), t); c.restore(); });
    alpha(p.garland, () => { line([[140, 764], [140, 732]], WOOD, 2); line([[200, 768], [200, 738]], WOOD, 2); path('M140 734 Q170 748 200 740', null, WOOD, 1); for (const [x, y, col] of [[150, 739, '#e9b860'], [162, 743, '#2b3566'], [174, 744, '#e9b860'], [186, 743, '#2b3566']]) poly([[x - 4, y], [x + 4, y + 0.6], [x, y + 8 + Math.sin(t * 2 + x) * 0.8]], col); });
    const sunNow = dawnSun;
    const vm = VILLAGE_MIRROR;
    // le vieux miroir sur son trépied : à plat, puis tourné vers le cristal
    const mdir = turnTo([1, 0.12], aim(sunNow, vm, TOP), p.turn), mn = [mdir[1], -mdir[0]], e1 = add(vm, mdir, 15), e2 = add(vm, mdir, -15);
    alpha(p.tripod, () => { line([vm, [286, 770]], WOOD, 2.4); line([vm, [306, 770]], WOOD, 2.4); line([vm, [296, 768]], WOOD, 2); });
    // son reflet monte jusqu'au cristal éteint
    if (p.beam > 0.01) { const tip = [lerp(vm[0], TOP[0], p.beam), lerp(vm[1], TOP[1], p.beam)], d = norm(sub(TOP, vm)), q = [-d[1], d[0]], [a1, a2] = (e1[0] - vm[0]) * q[0] + (e1[1] - vm[1]) * q[1] > 0 ? [e1, e2] : [e2, e1]; shaft([a1, add(tip, q, 3), add(tip, q, -3), a2], vm, tip, 0.5, 0.2); }
    alpha(p.tripod, () => { line([add(e1, mn, -1.8), add(e2, mn, -1.8)], WOOD, 5); line([e1, e2], mix('#b8a67e', '#ffd76a', p.turn), 3.6); circle(vm[0], vm[1], 3, '#a8692a'); });
    FOLK.forEach(([x, y, h, dir], i) => { const k = p.folk(i); if (k <= 0) return; const from = p.folkFrom(i), fx = lerp(from, x, k), walking = p.walking(i); folk(fx, y - (walking ? Math.abs(Math.sin(t * 9 + i)) * 1.6 : 0), h, walking ? (x > from ? 1 : -1) : dir);
      if (i === 3 && k >= 1) line([[313, 756], add([303, 734], [0, -4 * p.turn])], NIGHT, 3); }); // son bras, sur le miroir
    // le cristal répond : une lueur
    alpha(p.glint, () => { glow(TOP[0], TOP[1], 30 + Math.sin(t * 5) * 2, 0.95); poly([[180, 138], [187, 150], [180, 162], [173, 150]], 'rgba(255,240,190,.75)'); });

    // ── la nuit qui passe (pendant les mille ans), la neige qui tombe, les fondus ──
    if (p.night > 0.01) { c.fillStyle = `rgba(8,12,36,${0.42 * p.night})`; c.fillRect(LEFT, -600, RIGHT - LEFT, H + 800); }
    alpha(p.snowfall, () => { const fast = 1 + 2.5 * (p.years > 0 && p.years < 1 ? 1 : 0); for (let i = 0; i < 120; i++) { const x = ((i * 97 + 13 + Math.sin(t * 0.7 + i) * 8) % 520) - 80, y = ((i * 211 + 40 + t * (30 + (i % 5) * 10) * fast) % 800) - 10; circle(x, y, 0.9 + (i % 4) * 0.4, `rgba(255,255,255,${0.55 + (i % 3) * 0.15})`); } });
    if (p.veil > 0.005) { c.fillStyle = `rgba(7,11,26,${p.veil})`; c.fillRect(LEFT - 400, -900, RIGHT - LEFT + 800, H + 1400); }
  }

  /** Accorde la taille du dessin à celle de l'écran. */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
  }

  return { draw, resize };
}
