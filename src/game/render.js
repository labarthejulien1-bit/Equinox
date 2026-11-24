// Dessin du jeu.
//
// La signature visuelle d'Equinox tient en trois étapes, à chaque image :
//   1. on dessine toute la scène avec la palette d'OMBRE (froide, sombre) ;
//   2. on redessine toute la scène avec la palette de LUMIÈRE (chaude), mais
//      seulement à l'intérieur des zones éclairées calculées par le moteur ;
//   3. on ajoute par-dessus ce qui n'est pas « de la matière » : faisceaux,
//      lueurs, miroirs, repères tactiles.
// La frontière entre 1 et 2 est le bord net ombre / lumière.

import { TAU, smooth } from '../engine/vec.js';
import { beamPolygons, mirrorGeometry } from '../engine/light.js';
import { getPalettes } from './palette.js';
import { housePolygon, doorPolygon, crystalPolygon } from './game.js';

const SNOW = 7; // épaisseur de la couche de neige
const ROCK_RIM = 6; // épaisseur du liseré de roche

// Nombres pseudo-aléatoires stables (toujours les mêmes étoiles, flocons…).
const hash = (i) => {
  const v = Math.sin(i * 127.1 + 11.7) * 43758.5453;
  return v - Math.floor(v);
};

function poly(c, pts) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
}

function line(c, pts) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const litCanvas = document.createElement('canvas');
  const lit = litCanvas.getContext('2d');

  // La « vue » : comment passer des unités monde aux pixels de l'écran.
  const view = { scale: 1, ox: 0, oy: 0, dpr: 1, left: 0, top: 0, right: 360, bottom: 720 };

  function resize(level) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    for (const c of [canvas, litCanvas]) {
      c.width = w;
      c.height = h;
    }
    // On fait tenir la scène de référence en entier ; le décor déborde autour.
    const s = Math.min(rect.width / level.size.w, rect.height / level.size.h);
    view.scale = s;
    view.dpr = dpr;
    view.ox = (rect.width - level.size.w * s) / 2;
    view.oy = (rect.height - level.size.h * s) / 2;
    view.left = -view.ox / s;
    view.top = -view.oy / s;
    view.right = view.left + rect.width / s;
    view.bottom = view.top + rect.height / s;
  }

  const world = (c) => {
    const k = view.scale * view.dpr;
    c.setTransform(k, 0, 0, k, view.ox * view.dpr, view.oy * view.dpr);
  };
  const screen = (c) => c.setTransform(1, 0, 0, 1, 0, 0);

  // ───────────────────────────── Image complète ─────────────────────────────

  function render(g) {
    const light = g.light;
    if (!light) return;
    const pal = getPalettes(g.thaw);

    // Zones éclairées par le soleil et les miroirs, sous forme de polygones.
    const shapes = [];
    if (light.sunPoly) shapes.push({ pts: light.sunPoly });
    const beamPolys = [];
    for (const b of light.beams) for (const p of beamPolygons(b)) beamPolys.push(p);
    for (const p of beamPolys) shapes.push({ pts: p });

    // Étape 2 préparée à part : la scène « lumière », découpée par les zones.
    screen(lit);
    lit.globalCompositeOperation = 'source-over';
    lit.clearRect(0, 0, litCanvas.width, litCanvas.height);
    world(lit);
    lit.fillStyle = '#fff6dc';
    for (const s of shapes) {
      poly(lit, s.pts);
      lit.fill();
    }
    lit.globalCompositeOperation = 'source-atop'; // ne peint que là où il y a déjà de la lumière
    drawScene(lit, pal.lit, g, true);

    // Étape 1 : la scène « ombre », puis on pose la lumière dessus.
    world(ctx);
    drawScene(ctx, pal.shadow, g, false);
    screen(ctx);
    ctx.drawImage(litCanvas, 0, 0);

    // Lumières proches (temple, lanternes) : elles n'éclairent que le premier
    // plan autour d'elles, pas le ciel ni les montagnes lointaines.
    world(ctx);
    for (const p of light.points) {
      if (p.pts.length < 3 || p.r < 1) continue;
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.clip();
      poly(ctx, p.pts);
      ctx.clip();
      drawForeground(ctx, pal.lit, g, true);
      ctx.restore();
    }

    // Étape 3 : effets et repères.
    drawOverlay(ctx, g, pal, beamPolys);
  }

  // ───────────────────────────── La scène ─────────────────────────────

  function drawScene(c, P, g, isLit) {
    drawBackdrop(c, P, g, isLit);
    drawForeground(c, P, g, isLit);
  }

  /** Le lointain : ciel, étoiles, crêtes, soleil, flocons. */
  function drawBackdrop(c, P, g, isLit) {
    const L = g.level;
    const t = g.time;
    const v = view;

    // Ciel
    const sky = c.createLinearGradient(0, Math.min(v.top, 0), 0, 620);
    sky.addColorStop(0, P.skyTop);
    sky.addColorStop(0.55, P.skyMid);
    sky.addColorStop(1, P.skyBot);
    c.fillStyle = sky;
    c.fillRect(v.left - 2, v.top - 2, v.right - v.left + 4, v.bottom - v.top + 4);

    // Étoiles : seulement dans l'ombre. Là où le soleil ne passe pas, c'est la nuit.
    if (!isLit) {
      c.fillStyle = '#dfe9ff';
      for (let i = 0; i < 70; i++) {
        const x = v.left + hash(i) * (v.right - v.left);
        const y = v.top + hash(i + 100) * 470;
        const tw = 0.35 + 0.35 * Math.sin(t * (0.6 + hash(i + 7)) + i);
        c.globalAlpha = tw * (1 - (y - v.top) / 520);
        c.beginPath();
        c.arc(x, y, 0.5 + hash(i + 40) * 0.6, 0, TAU);
        c.fill();
      }
      c.globalAlpha = 1;
    }

    // Montagnes lointaines (trois plans, du plus pâle au plus soutenu)
    ridge(c, P.far1, 1.3, 392, 74, 0.0105, true);
    ridge(c, P.far2, 4.1, 432, 52, 0.0165, true);
    ridge(c, P.far3, 7.7, 474, 30, 0.012, false);

    // Soleil (dessiné ici : il passe DERRIÈRE la montagne du premier plan)
    const sun = g.light.sun;
    const halo = c.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 78);
    halo.addColorStop(0, 'rgba(255,238,170,0.75)');
    halo.addColorStop(0.35, 'rgba(255,226,150,0.28)');
    halo.addColorStop(1, 'rgba(255,220,140,0)');
    c.fillStyle = halo;
    c.beginPath();
    c.arc(sun.x, sun.y, 78, 0, TAU);
    c.fill();
    c.fillStyle = '#fff8dc';
    c.beginPath();
    c.arc(sun.x, sun.y, L.sun.radius, 0, TAU);
    c.fill();

    // Flocons (ils disparaissent quand le monde dégèle)
    const snowAlpha = 0.75 * (1 - g.thaw);
    if (snowAlpha > 0.01) {
      c.fillStyle = P.snow;
      c.globalAlpha = snowAlpha;
      const W = v.right - v.left + 40;
      const H = v.bottom - v.top;
      for (let i = 0; i < 44; i++) {
        const sp = 7 + hash(i + 3) * 9;
        const x = v.left - 20 + ((hash(i) * W + t * (2 + hash(i + 9) * 4) + Math.sin(t * 0.7 + i) * 6) % W);
        const y = v.top + ((hash(i + 50) * H + t * sp) % H);
        c.beginPath();
        c.arc(x, y, 0.7 + hash(i + 20) * 0.8, 0, TAU);
        c.fill();
      }
      c.globalAlpha = 1;
    }
  }

  /** Le premier plan : tout ce avec quoi la lumière joue. */
  function drawForeground(c, P, g, isLit) {
    const L = g.level;

    // Intérieur de la grotte, puis le temple qui s'y trouve
    poly(c, L.ground.slice(L.cave[0], L.cave[1] + 1));
    c.fillStyle = P.caveBack;
    c.fill();
    drawTemple(c, P, g);

    // Cascade (dans l'air : elle brille au soleil, s'éteint dans l'ombre)
    drawWaterfall(c, P, g, isLit);

    // Supports des miroirs
    for (const m of g.mirrors) drawMount(c, P, m);

    // Pins
    for (const p of L.pines) drawPine(c, P, p);

    // Le sol : roche, liseré, neige
    poly(c, L.ground);
    c.fillStyle = P.rock;
    c.fill();
    c.save();
    c.clip();
    c.lineJoin = 'round';
    c.strokeStyle = P.rockRim;
    c.lineWidth = ROCK_RIM * 2;
    c.stroke();
    c.strokeStyle = P.snow;
    c.lineWidth = SNOW * 2;
    c.lineCap = 'butt';
    for (const [from, to] of L.snow) {
      line(c, L.ground.slice(from, to + 1));
      c.stroke();
    }
    c.restore();

    drawRiver(c, P, g, isLit);
    drawWheel(c, P, g);

    // Lanternes du village
    for (const l of L.lanterns) {
      c.strokeStyle = P.wood;
      c.lineWidth = 1.6;
      c.lineCap = 'round';
      line(c, [
        { x: l.x, y: l.baseY + 1 },
        { x: l.x, y: l.y + 3 },
      ]);
      c.stroke();
      c.fillStyle = g.temple.glow > 0.5 ? '#ffe7a6' : P.bronze;
      c.fillRect(l.x - 2.2, l.y - 3, 4.4, 6);
    }

    // Maisons
    for (const h of L.houses) drawHouse(c, P, h, g);

    // Miroir prisonnier de la glace, puis la glace elle-même
    if (!g.ice.gone) {
      for (const m of g.mirrors) {
        if (m.free) continue;
        const geo = mirrorGeometry(m);
        c.lineCap = 'round';
        c.strokeStyle = P.bronze;
        c.lineWidth = 4;
        line(c, [geo.a, geo.b]);
        c.stroke();
        c.strokeStyle = P.iceLine;
        c.lineWidth = 2;
        c.stroke();
      }
      drawIce(c, P, g);
    }

    // Porte de la grotte
    if (g.door.open < 0.99) {
      const d = doorPolygon(g);
      poly(c, d);
      c.fillStyle = P.stone;
      c.fill();
      c.fillStyle = P.stoneDark;
      const dy = d[0].y;
      for (let y = dy + 9; y < L.door.bottom - 4; y += 14) {
        c.beginPath();
        c.arc(L.door.x, y, 1.5, 0, TAU);
        c.fill();
      }
    }

    // Le petit peuple
    L.villagers.forEach((p, i) => drawVillager(c, P, p, i, g));

    // Nuage
    drawCloud(c, P, g);
  }

  /** Une ligne de crêtes lointaines. */
  function ridge(c, color, seed, base, amp, freq, sharp) {
    const v = view;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(v.left - 10, v.bottom + 10);
    for (let x = v.left - 10; x <= v.right + 10; x += 6) {
      let s =
        Math.sin(x * freq + seed * 1.3) * 0.55 +
        Math.sin(x * freq * 2.3 + seed * 2.1) * 0.3 +
        Math.sin(x * freq * 4.9 + seed * 4.3) * 0.15;
      if (sharp) s = 1 - 2 * Math.abs(s);
      c.lineTo(x, base - amp * s);
    }
    c.lineTo(v.right + 10, v.bottom + 10);
    c.closePath();
    c.fill();
  }

  function drawTemple(c, P, g) {
    const T = g.level.temple;
    const x = T.x;
    const y = T.baseY;
    const cr = T.crystal;
    // Marches
    c.fillStyle = P.stoneDark;
    c.fillRect(x - 27, y - 4, 54, 5);
    c.fillStyle = P.stone;
    c.fillRect(x - 21, y - 9, 42, 5);
    // Deux piliers inclinés et un fronton : une « porte solaire »
    c.fillStyle = P.stoneDark;
    poly(c, [
      { x: x - 20, y: y - 9 },
      { x: x - 14, y: y - 9 },
      { x: x - 11, y: y - 52 },
      { x: x - 15, y: y - 52 },
    ]);
    c.fill();
    poly(c, [
      { x: x + 20, y: y - 9 },
      { x: x + 14, y: y - 9 },
      { x: x + 11, y: y - 52 },
      { x: x + 15, y: y - 52 },
    ]);
    c.fill();
    c.fillStyle = P.stone;
    poly(c, [
      { x: x - 20, y: y - 51 },
      { x: x, y: y - 66 },
      { x: x + 20, y: y - 51 },
      { x: x + 17, y: y - 47 },
      { x: x - 17, y: y - 47 },
    ]);
    c.fill();
    // Anneau du soleil autour du cristal
    c.strokeStyle = P.stone;
    c.lineWidth = 2.4;
    c.beginPath();
    c.arc(cr.x, cr.y, cr.r + 6, 0, TAU);
    c.stroke();
    c.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      c.beginPath();
      c.moveTo(cr.x + Math.cos(a) * (cr.r + 8), cr.y + Math.sin(a) * (cr.r + 8));
      c.lineTo(cr.x + Math.cos(a) * (cr.r + 11.5), cr.y + Math.sin(a) * (cr.r + 11.5));
      c.stroke();
    }
  }

  function drawWaterfall(c, P, g, isLit) {
    const W = g.level.water;
    if (g.water.fall <= 0) return;
    const t = g.time;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    // L'eau qui sort de la niche
    c.strokeStyle = P.water;
    c.lineWidth = 3;
    line(
      c,
      W.source.map(([x, y]) => ({ x, y })),
    );
    c.stroke();
    // La chute
    const len = (W.fall.bottom - W.fall.top) * g.water.fall;
    c.fillStyle = P.water;
    c.fillRect(W.fall.x - 3, W.fall.top, 6, len);
    // Filets clairs qui descendent
    c.strokeStyle = isLit ? '#ffffff' : P.iceLine;
    c.globalAlpha = 0.55;
    c.lineWidth = 0.9;
    c.setLineDash([16, 12]);
    for (let k = 0; k < 2; k++) {
      c.lineDashOffset = -(t * (90 + k * 30)) + k * 7;
      c.beginPath();
      c.moveTo(W.fall.x - 1.2 + k * 2.4, W.fall.top + 2);
      c.lineTo(W.fall.x - 1.2 + k * 2.4, W.fall.top + len);
      c.stroke();
    }
    c.setLineDash([]);
    c.globalAlpha = 1;
    // Écume au pied de la chute
    if (g.water.fall >= 1) {
      c.fillStyle = isLit ? '#ffffff' : P.iceLine;
      for (let i = 0; i < 4; i++) {
        const r = 1.6 + 1.2 * Math.abs(Math.sin(t * 5 + i * 1.7));
        c.beginPath();
        c.arc(W.fall.x - 5 + i * 3.4, W.fall.bottom - 1.5, r, 0, TAU);
        c.fill();
      }
    }
  }

  /** Hauteur du sol de la vallée à l'abscisse x (pour poser la rivière dessus). */
  function valleyY(L, x) {
    const pts = L.ground.slice(21, 25);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    }
    return pts[pts.length - 1].y;
  }

  function drawRiver(c, P, g, isLit) {
    const L = g.level;
    const R = L.water.river;
    const band = (x0, x1, color) => {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(x0, valleyY(L, x0) - 0.3);
      for (let x = x0; x <= x1; x += 4) c.lineTo(x, valleyY(L, x) - 0.3);
      c.lineTo(x1, valleyY(L, x1) - 0.3);
      c.lineTo(x1, valleyY(L, x1) + 4.2);
      for (let x = x1; x >= x0; x -= 4) c.lineTo(x, valleyY(L, x) + 4.2);
      c.closePath();
      c.fill();
    };
    band(R.fromX, R.toX, P.riverIce); // lit gelé
    if (g.water.river > 0) {
      const fx = L.water.fall.x;
      const x1 = fx + (R.toX - fx) * g.water.river;
      const x0 = fx - (fx - R.fromX - 14) * Math.min(1, g.water.river * 2);
      band(x0, x1, P.water);
      // Reflets qui filent vers la roue
      c.fillStyle = isLit ? '#ffffff' : P.iceLine;
      c.globalAlpha = 0.75;
      for (let i = 0; i < 7; i++) {
        const x = fx + ((g.time * 26 + i * 11) % (R.toX - fx));
        if (x > x1 - 3) continue;
        c.fillRect(x, valleyY(L, x) + 1 + (i % 2) * 1.5, 3.5, 0.8);
      }
      c.globalAlpha = 1;
    }
  }

  function drawWheel(c, P, g) {
    const w = g.level.wheel;
    const d = g.level.door;
    // Chaîne qui relie la roue à la porte
    c.strokeStyle = P.bronze;
    c.lineWidth = 0.9;
    c.setLineDash([2, 1.6]);
    line(c, [
      { x: w.x, y: w.y },
      { x: d.x - 4.5, y: w.y - 26 },
      { x: d.x - 4.5, y: d.bottom },
    ]);
    c.stroke();
    c.setLineDash([]);
    // Roue à aubes
    c.save();
    c.translate(w.x, w.y);
    c.rotate(g.wheel.angle);
    c.strokeStyle = P.wood;
    c.lineCap = 'round';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, w.r - 2, 0, TAU);
    c.stroke();
    c.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * w.r, Math.sin(a) * w.r);
      c.stroke();
      c.save();
      c.rotate(a);
      c.fillStyle = P.wood;
      c.fillRect(w.r - 3.5, -2.6, 4, 5.2);
      c.restore();
    }
    c.fillStyle = P.bronze;
    c.beginPath();
    c.arc(0, 0, 2.6, 0, TAU);
    c.fill();
    c.restore();
  }

  function drawMount(c, P, m) {
    c.lineCap = 'round';
    if (m.mount.type === 'pole') {
      c.strokeStyle = P.wood;
      c.lineWidth = 2.6;
      line(c, [
        { x: m.x, y: m.mount.baseY + 1 },
        { x: m.x, y: m.y },
      ]);
      c.stroke();
      c.lineWidth = 1.6;
      line(c, [
        { x: m.x - 6, y: m.mount.baseY + 1 },
        { x: m.x, y: m.mount.baseY - 9 },
        { x: m.x + 6, y: m.mount.baseY + 1 },
      ]);
      c.stroke();
    } else {
      c.strokeStyle = P.bronze;
      c.lineWidth = 2;
      line(c, [
        { x: m.mount.fromX, y: m.mount.fromY },
        { x: m.x - 10, y: m.mount.fromY - 1 },
        { x: m.x, y: m.y },
      ]);
      c.stroke();
    }
  }

  function drawPine(c, P, p) {
    c.fillStyle = P.wood;
    c.fillRect(p.x - 1.2, p.y - p.h * 0.2, 2.4, p.h * 0.2 + 1);
    for (let i = 0; i < 3; i++) {
      const w = p.h * (0.36 - i * 0.08);
      const y0 = p.y - p.h * (0.14 + i * 0.26);
      const y1 = y0 - p.h * 0.42;
      c.fillStyle = P.pine;
      poly(c, [
        { x: p.x - w, y: y0 },
        { x: p.x, y: y1 },
        { x: p.x + w, y: y0 },
      ]);
      c.fill();
      c.fillStyle = P.pineSnow;
      poly(c, [
        { x: p.x - w * 0.42, y: y0 - (y0 - y1) * 0.58 },
        { x: p.x, y: y1 },
        { x: p.x + w * 0.42, y: y0 - (y0 - y1) * 0.58 },
        { x: p.x, y: y0 - (y0 - y1) * 0.46 },
      ]);
      c.fill();
    }
  }

  function drawHouse(c, P, h, g) {
    const l = h.x - h.w / 2;
    c.fillStyle = P.wall;
    c.fillRect(l, h.baseY - h.h, h.w, h.h + 1);
    c.fillStyle = P.roof;
    poly(c, [
      { x: l - 3, y: h.baseY - h.h },
      { x: h.x, y: h.baseY - h.h - h.roof },
      { x: l + h.w + 3, y: h.baseY - h.h },
    ]);
    c.fill();
    // Neige sur le toit
    c.strokeStyle = P.snow;
    c.lineWidth = 2.6;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    line(c, [
      { x: l - 2, y: h.baseY - h.h - 1 },
      { x: h.x, y: h.baseY - h.h - h.roof },
      { x: l + h.w + 2, y: h.baseY - h.h - 1 },
    ]);
    c.stroke();
    // Porte, et fenêtre qui s'allume quand le temple revit
    c.fillStyle = P.roof;
    c.fillRect(h.x - h.w * 0.3, h.baseY - h.h * 0.55, h.w * 0.2, h.h * 0.55 + 1);
    c.fillStyle = g.temple.glow > 0.6 ? '#ffdf8f' : P.roof;
    c.fillRect(h.x + h.w * 0.1, h.baseY - h.h * 0.7, h.w * 0.22, h.h * 0.3);
  }

  function drawIce(c, P, g) {
    const pts = g.level.ice.points;
    const m = g.ice.melt;
    // La glace s'amincit et se rétracte légèrement en fondant.
    let cx = 0;
    let cy = 0;
    for (const p of pts) {
      cx += p.x / pts.length;
      cy += p.y / pts.length;
    }
    const k = 1 - 0.14 * m;
    const shr = pts.map((p) => ({ x: cx + (p.x - cx) * k, y: cy - 6 * m + (p.y - cy) * k }));
    c.globalAlpha = 0.94 - 0.6 * m;
    poly(c, shr);
    c.fillStyle = P.ice;
    c.fill();
    // Facettes
    c.strokeStyle = P.iceLine;
    c.lineWidth = 0.8;
    c.globalAlpha = (0.94 - 0.6 * m) * 0.7;
    const mid = { x: cx + 6, y: cy - 2 };
    for (const i of [0, 2, 4, 6]) {
      line(c, [shr[i], mid, shr[(i + 3) % shr.length]]);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  function drawVillager(c, P, p, i, g) {
    const t = g.time;
    // Ils sautent de joie quand le temple s'allume.
    const joy = g.temple.lit ? smooth(g.win.t / 0.8) * (1 - smooth((g.win.t - 9) / 3)) : 0;
    const hop = joy * Math.abs(Math.sin(t * 5.5 + i * 1.3)) * 5;
    const bob = Math.sin(t * 1.8 + i * 2.1) * 0.5;
    c.save();
    c.translate(p.x, p.y - hop);
    c.scale(p.s * p.dir, p.s);
    // Cape à capuche, en forme de goutte
    c.fillStyle = P.cloak;
    c.beginPath();
    c.moveTo(-5.2, 0.5);
    c.quadraticCurveTo(-6, -9 + bob, -1.2, -14.5 + bob);
    c.quadraticCurveTo(0.5, -18.5 + bob, 3, -17 + bob); // pointe de la capuche
    c.quadraticCurveTo(2.2, -15 + bob, 2.6, -13.5 + bob);
    c.quadraticCurveTo(6, -8 + bob, 5.2, 0.5);
    c.closePath();
    c.fill();
    // Visage et yeux
    c.fillStyle = P.face;
    c.beginPath();
    c.ellipse(0.9, -9.6 + bob, 3, 2.9, 0, 0, TAU);
    c.fill();
    c.fillStyle = P.eye;
    const blink = Math.sin(t * 0.9 + i * 3.7) > 0.985 ? 0.2 : 1;
    c.beginPath();
    c.ellipse(0.2, -9.8 + bob, 0.55, 0.75 * blink, 0, 0, TAU);
    c.ellipse(2.4, -9.8 + bob, 0.55, 0.75 * blink, 0, 0, TAU);
    c.fill();
    c.restore();
  }

  function drawCloud(c, P, g) {
    const cl = g.level.cloud;
    const sh = g.cloudShape;
    c.save();
    c.translate(g.cloudX, cl.y);
    c.beginPath();
    c.rect(-cl.w, -cl.h * 2, cl.w * 2, cl.h * 2 + sh.bottom);
    c.clip();
    c.fillStyle = P.cloud;
    c.beginPath();
    for (const k of sh.circles) {
      c.moveTo(k.x + k.r, k.y);
      c.arc(k.x, k.y, k.r, 0, TAU);
    }
    c.rect(sh.circles[0].x, 0, sh.circles[4].x - sh.circles[0].x, sh.bottom);
    c.fill();
    c.restore();
  }

  // ───────────────────────────── Effets et repères ─────────────────────────────

  function drawOverlay(c, g, pal, beamPolys) {
    const L = g.level;
    const t = g.time;
    const cr = L.temple.crystal;

    // Faisceaux : un voile doré par-dessus tout
    c.fillStyle = 'rgba(255, 206, 110, 0.30)';
    for (const p of beamPolys) {
      poly(c, p);
      c.fill();
    }
    c.globalCompositeOperation = 'lighter';

    // Lueur du temple (découpée par les ombres de la grotte)
    if (g.temple.glow > 0 && g.light.points.length) {
      const tl = g.light.points[0];
      c.save();
      poly(c, tl.pts);
      c.clip();
      const gl = c.createRadialGradient(cr.x, cr.y, 2, cr.x, cr.y, Math.max(4, tl.r));
      gl.addColorStop(0, 'rgba(255,226,150,0.30)');
      gl.addColorStop(0.5, 'rgba(255,206,120,0.10)');
      gl.addColorStop(1, 'rgba(255,200,110,0)');
      c.fillStyle = gl;
      c.beginPath();
      c.arc(cr.x, cr.y, tl.r, 0, TAU);
      c.fill();
      c.restore();
    }

    // Conduits gravés : la lumière remonte du temple vers le village
    const flow = smooth((g.win.t - 1.0) / 1.8);
    if (flow > 0) {
      c.strokeStyle = 'rgba(255, 220, 130, 0.9)';
      c.lineWidth = 1.5;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      for (const path of L.conduits) {
        const pts = path.map(([x, y]) => ({ x, y }));
        let len = 0;
        for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        c.setLineDash([len * flow, 9999]);
        line(c, pts);
        c.stroke();
      }
      c.setLineDash([]);
    }

    // Halo des lanternes
    const lk = smooth((g.win.t - 2.4) / 1.6);
    if (lk > 0) {
      for (const l of L.lanterns) {
        const gl = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, 14);
        gl.addColorStop(0, `rgba(255,226,150,${0.55 * lk})`);
        gl.addColorStop(1, 'rgba(255,210,120,0)');
        c.fillStyle = gl;
        c.beginPath();
        c.arc(l.x, l.y, 14, 0, TAU);
        c.fill();
      }
    }

    // Halo du cristal qui se charge
    const ch = g.temple.lit ? 1 : g.temple.charge;
    if (ch > 0) {
      const r = 12 + 12 * ch + Math.sin(t * 5) * 1.2;
      const gl = c.createRadialGradient(cr.x, cr.y, 0, cr.x, cr.y, r);
      gl.addColorStop(0, `rgba(255,240,180,${0.6 * ch})`);
      gl.addColorStop(1, 'rgba(255,220,130,0)');
      c.fillStyle = gl;
      c.beginPath();
      c.arc(cr.x, cr.y, r, 0, TAU);
      c.fill();
    }

    // Étincelles
    for (const p of g.particles) {
      if (p.type !== 'spark') continue;
      const a = 1 - p.life / p.max;
      c.fillStyle = `rgba(255,232,160,${a})`;
      c.beginPath();
      c.arc(p.x, p.y, 0.6 + a * 1.2, 0, TAU);
      c.fill();
    }
    c.globalCompositeOperation = 'source-over';

    // Gouttes de fonte
    c.fillStyle = '#c9efff';
    for (const p of g.particles) {
      if (p.type !== 'drip') continue;
      c.globalAlpha = 1 - p.life / p.max;
      c.beginPath();
      c.ellipse(p.x, p.y, 0.8, 1.5, 0, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;

    // Cristal du temple
    poly(c, crystalPolygon(L));
    const cc = Math.round(ch * 100);
    c.fillStyle = `color-mix(in srgb, #fff6c8 ${cc}%, #6079bd)`;
    c.fill();
    c.strokeStyle = `color-mix(in srgb, #ffffff ${cc}%, #8ea5e0)`;
    c.lineWidth = 0.9;
    c.stroke();
    line(c, [
      { x: cr.x, y: cr.y - cr.r * 1.15 },
      { x: cr.x - 2, y: cr.y },
      { x: cr.x, y: cr.y + cr.r * 1.15 },
    ]);
    c.stroke();

    // Miroirs libres
    for (const m of g.mirrors) {
      if (!m.free) continue;
      const geo = mirrorGeometry(m);
      c.lineCap = 'round';
      c.strokeStyle = '#8a6a34';
      c.lineWidth = 4.4;
      line(c, [geo.a, geo.b]);
      c.stroke();
      c.strokeStyle = m.lit ? '#fffbe2' : '#b9d0ee';
      c.lineWidth = 2.2;
      c.stroke();
      c.fillStyle = '#d9aa52';
      c.beginPath();
      c.arc(m.x, m.y, 2.6, 0, TAU);
      c.fill();
    }

    if (g.started) drawGuides(c, g);
  }

  /** Repères tactiles : ce qu'on peut toucher, et comment. */
  function drawGuides(c, g) {
    const L = g.level;
    const t = g.time;
    const drag = g.drag;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    c.lineCap = 'round';

    // Arc du soleil
    const s = L.sun;
    c.strokeStyle = `rgba(255,255,255,${drag && drag.type === 'sun' ? 0.55 : 0.28})`;
    c.lineWidth = 1.5;
    c.setLineDash([0.1, 7]);
    c.beginPath();
    for (let a = s.min; a <= s.max; a += 2) {
      const r = (a * Math.PI) / 180;
      const x = s.cx + s.rx * Math.cos(r);
      const y = s.cy - s.ry * Math.sin(r);
      if (a === s.min) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();

    // Rail du nuage
    const cl = L.cloud;
    c.strokeStyle = `rgba(255,255,255,${drag && drag.type === 'cloud' ? 0.5 : 0.22})`;
    c.beginPath();
    c.moveTo(cl.minX - cl.w * 0.45, cl.y + cl.h * 0.5 + 5);
    c.lineTo(cl.maxX + cl.w * 0.45, cl.y + cl.h * 0.5 + 5);
    c.stroke();
    c.setLineDash([]);

    // Anneau autour du soleil tant que le joueur ne l'a pas encore déplacé
    const sun = g.light.sun;
    if (!g.touched.sun) {
      c.strokeStyle = `rgba(255,240,190,${0.35 + 0.45 * pulse})`;
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(sun.x, sun.y, 20 + pulse * 5, 0, TAU);
      c.stroke();
    }

    // Chevrons de part et d'autre du nuage
    if (g.touched.sun && !g.touched.cloud) {
      c.strokeStyle = `rgba(255,255,255,${0.3 + 0.5 * pulse})`;
      c.lineWidth = 1.6;
      for (const d of [-1, 1]) {
        const x = g.cloudX + d * (cl.w * 0.5 + 9 + pulse * 3);
        c.beginPath();
        c.moveTo(x - d * 3, cl.y + 2);
        c.lineTo(x + d * 2, cl.y + 7);
        c.lineTo(x - d * 3, cl.y + 12);
        c.stroke();
      }
    }

    // Cercle de rotation autour des miroirs
    for (const m of g.mirrors) {
      if (!m.free) continue;
      const active = drag && drag.mirror === m;
      const hint = !g.touched.mirror || (m.frozen && !m.turned);
      const a = active ? 0.75 : hint ? 0.3 + 0.4 * pulse : 0.22;
      c.strokeStyle = `rgba(255,240,200,${a})`;
      c.lineWidth = 1.3;
      c.setLineDash([3, 4.5]);
      c.lineDashOffset = -t * 6;
      c.beginPath();
      c.arc(m.x, m.y, m.len / 2 + 6, 0, TAU);
      c.stroke();
      c.setLineDash([]);
    }
  }

  return { view, resize, render };
}
