// Dessin du jeu.
//
// La signature visuelle d'Equinox tient en trois étapes, à chaque image :
//   1. on dessine toute la scène avec la palette d'OMBRE (froide, sombre) ;
//   2. on redessine toute la scène avec la palette de LUMIÈRE (chaude), mais
//      seulement à l'intérieur des zones éclairées calculées par le moteur ;
//   3. on ajoute par-dessus ce qui n'est pas « de la matière » : faisceaux,
//      lueurs, miroirs, repères tactiles.
// La frontière entre 1 et 2 est le bord net ombre / lumière.

import { TAU, smooth, clamp } from '../engine/vec.js';
import { mirrorGeometry } from '../engine/light.js';
import { getPalettes, mix } from './palette.js';
import {
  hutSize,
  doorPolygon,
  crystalPolygon,
  memoryPolygon,
  frostPolygon,
  streamWet,
  walkerPosition,
  templeCrystals,
  lampHalos,
} from './game.js';
import { drawDecor } from './decor.js';
import { drawUnderground, drawRemnants, drawDrips } from './underground.js';
import { drawDoor, drawChain, drawWaterWheel, drawDrain, drawMachineGlow } from './machine.js';
import { windAt } from './life.js';
import { drawLifeSky, drawLifeFar, drawLifeGround, drawLifeFront, drawLifeGlow } from './lifeDraw.js';
import { sliderBubbles } from './sliders.js';

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

const P2 = ([x, y]) => ({ x, y });

/** La hauteur du milieu d'un nuage (sa forme monte plus haut qu'elle ne descend). */
const cloudMid = (cl) => cl.y - cl.h * 0.07;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const litCanvas = document.createElement('canvas');
  const lit = litCanvas.getContext('2d');

  // La « vue » : comment passer des unités monde aux pixels de l'écran.
  const view = { scale: 1, ox: 0, oy: 0, dpr: 1, left: 0, top: 0, right: 360, bottom: 720, w: 360, h: 720 };

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
    view.w = rect.width; // taille de l'écran en pixels, pour l'interface
    view.h = rect.height;
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
    const pal = getPalettes(g.thaw, light.dawn);

    // Zones éclairées par le soleil et les miroirs, sous forme de polygones.
    const shapes = [];
    if (light.sunPoly) shapes.push(light.sunPoly);
    for (const p of light.beamPolys) shapes.push(p);

    // Étape 2 préparée à part : la scène « lumière », découpée par les zones.
    screen(lit);
    lit.globalCompositeOperation = 'source-over';
    lit.clearRect(0, 0, litCanvas.width, litCanvas.height);
    world(lit);
    lit.fillStyle = '#fff6dc';
    for (const s of shapes) {
      poly(lit, s);
      lit.fill();
    }
    lit.globalCompositeOperation = 'source-atop'; // ne peint que là où il y a déjà de la lumière
    drawScene(lit, pal.lit, g, true);

    // Étape 1 : la scène « ombre », puis on pose la lumière dessus.
    world(ctx);
    drawScene(ctx, pal.shadow, g, false);
    screen(ctx);
    ctx.globalAlpha = light.intensity; // à l'aube, le jour se pose en transparence sur la nuit
    ctx.drawImage(litCanvas, 0, 0);
    ctx.globalAlpha = 1;

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
    // Les lampes (cristaux-mémoire, sorties de conduit) et les faisceaux
    // qu'elles alimentent éclairent aussi, même en pleine nuit.
    for (const p of lampHalos(light)) {
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
    for (const pts of light.lampPolys) {
      ctx.save();
      poly(ctx, pts);
      ctx.clip();
      drawForeground(ctx, pal.lit, g, true);
      ctx.restore();
    }

    // Étape 3 : effets et repères.
    drawOverlay(ctx, g);

    // Bulles du bas de l'écran (dessinées en pixels d'écran, pas en unités monde).
    if (g.started) {
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      drawSliders(ctx, g);
    }
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

    // Montagnes lointaines (trois plans). Chaque niveau a ses propres crêtes.
    const seed = L.id * 3.7;
    drawLifeSky(c, P, g, view); // longs nuages lointains
    ridge(c, P.far1, 1.3 + seed, 392, 74, 0.0105, true);
    drawLifeFar(c, P, g, isLit); // vol d'oiseaux, étoile filante
    ridge(c, P.far2, 4.1 + seed, 432, 52, 0.0165, true);
    ridge(c, P.far3, 7.7 + seed, 474, 30, 0.012, false);

    // Décors du ciel (un rapace qui plane…)
    for (const d of L.decor || []) if (d.layer === 'sky') drawDecor(c, P, d, g);

    // Soleil (dessiné ici : il passe DERRIÈRE le relief du premier plan)
    const sun = g.light.sun;
    // Plus il est bas, plus il est orangé, et plus son halo est large.
    const dawn = g.light.dawn;
    const glow = mix('#ffeeaa', '#ffb070', dawn);
    const reach = 78 + 44 * dawn;
    const halo = c.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, reach);
    halo.addColorStop(0, glow + 'c0');
    halo.addColorStop(0.35, glow + '48');
    halo.addColorStop(1, glow + '00');
    c.fillStyle = halo;
    c.beginPath();
    c.arc(sun.x, sun.y, reach, 0, TAU);
    c.fill();
    c.fillStyle = mix('#fff8dc', '#ffd9a0', dawn);
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
        // (le vent les pousse : drift grandit plus vite pendant une rafale)
        const drift = g.life ? g.life.wind.drift : 0;
        const x = v.left - 20 + ((hash(i) * W + t * (2 + hash(i + 9) * 4) + drift * (0.5 + hash(i + 31)) + Math.sin(t * 0.7 + i) * 6) % W);
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

    // Intérieurs des grottes, puis le temple
    c.fillStyle = P.caveBack;
    for (const [from, to] of L.caves || []) {
      poly(c, L.ground.slice(from, to + 1));
      c.fill();
    }
    drawTemple(c, P, g);

    // Eau des bassins (dessinée avant le sol, qui en cache les bords)
    for (const b of g.basins) drawBasin(c, P, b, g, isLit);

    // Cascades (dans l'air : elles brillent au soleil, s'éteignent dans l'ombre)
    for (const s of g.streams) for (const w of streamWet(s)) if (w.type === 'fall') drawFall(c, P, w, g, isLit, s.def.width);

    // Supports des miroirs, socles, pins
    // (un miroir enfoui sous la neige ne montre rien, pas même son support)
    const buried = (m) => g.ices.some((ice) => ice.def.id === m.frozen && ice.def.look === 'snow' && ice.active && !ice.gone);
    for (const m of g.mirrors) if (!buried(m)) drawMount(c, P, m);
    for (const p of L.pedestals || []) drawPedestal(c, P, p);
    for (const p of L.pines || []) drawPine(c, P, p);

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

    // L'eau dans la roche, vue en coupe : veines d'amont, nappes d'aval
    drawUnderground(c, P, g);

    // Lits gelés, puis l'eau qui court sur le sol
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const bed of L.beds || []) {
      c.strokeStyle = P.riverIce;
      c.lineWidth = 4.6;
      line(c, bed.map(P2));
      c.stroke();
    }
    // (la perte par où l'eau s'en va dans le sol, puis l'eau elle-même)
    for (const s of g.streams) if (s.def.drain) drawDrain(c, P, s.def.drain);
    for (const s of g.streams) for (const w of streamWet(s)) if (w.type === 'run') drawRun(c, P, w, g, isLit, s.def.width);
    drawDrips(c, P, g); // (l'eau qui tombe goutte à goutte d'un surplomb)

    // Empreintes, fleurs du dégel, éclats sur l'eau (voir lifeDraw.js)
    drawLifeGround(c, P, g, isLit);

    // Eaux calmes qui gèlent : sources et ponts de givre
    for (const f of g.frosts) if (f.def.role !== 'dam') drawFrost(c, P, f, g);

    for (const w of g.wheels) drawWheel(c, P, w, g);

    // Lanternes du village
    for (const l of L.lanterns || []) {
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

    // Huttes du village, puis les décors posés sur le sol
    for (const h of L.houses || []) drawHouse(c, P, h, g);
    for (const d of L.decor || []) if (d.layer !== 'sky') drawDecor(c, P, d, g);

    // Ce qui restera des glaciers une fois fondus (caché dessous d'ici là)
    drawRemnants(c, P, g);

    // Miroirs prisonniers de la glace, puis les glaciers eux-mêmes
    for (const ice of g.ices) {
      if (ice.gone || !ice.active) continue;
      for (const m of g.mirrors) {
        // (on devine un miroir pris dans la glace ; sous la neige, il est caché)
        if (m.frozen !== ice.def.id || ice.def.look === 'snow') continue;
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
      drawIce(c, P, ice);
    }

    // Neige tombée d'une corniche (elle comble une crevasse)
    for (const fill of L.fills || []) {
      const from = g.ices.find((i) => i.def.id === fill.after);
      if (!from || !from.gone) continue;
      poly(c, fill.points.map(P2));
      c.fillStyle = P.snow;
      c.fill();
    }

    // Yeux de pierre (conduits) et cristaux-mémoire
    for (const e of g.eyes) drawEye(c, P, e);
    for (const m of g.memories) drawMemory(c, P, m);

    // Digues de glace
    for (const f of g.frosts) if (f.def.role === 'dam' && f.amount > 0.01) drawDam(c, P, f, g);

    // Portes de pierre : elles glissent le long de la falaise en s'ouvrant
    for (const d of g.doors) drawDoor(c, P, d);

    // Radeaux
    for (const m of g.mirrors) if (m.raft) drawRaft(c, P, m, g);

    // Le petit peuple
    // (leur vie — où ils sont, ce qu'ils font — est décidée dans life.js)
    if (g.life) {
      for (const f of g.life.folk) {
        if (f.vis > 0.02) drawVillager(c, P, { x: f.x, y: f.y, s: f.p.s, dir: f.dir, pose: f }, f.i, g, f.moving ? 1 : 0);
      }
    } else (L.villagers || []).forEach((p, i) => drawVillager(c, P, p, i, g));
    g.walkers.forEach((w, i) => drawWalker(c, P, w, i, g));

    // Nuage
    if (L.cloud) drawCloud(c, P, g);

    // Neige soufflée, embruns, brume, traits de vent
    drawLifeFront(c, P, g, isLit);
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
    // Certains sanctuaires n'ont pas de porte solaire : leurs cristaux sont
    // enchâssés dans la roche, chacun dans son anneau.
    if (x === undefined) {
      for (const cr of templeCrystals(g.level)) drawRing(c, P, cr);
      return;
    }
    // Un temple peut être plus petit (scale < 1) quand sa grotte est basse.
    const k = T.scale ?? 1;
    c.save();
    c.translate(x, y);
    c.scale(k, k);
    c.translate(-x, -y);
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
    c.restore();
    // Un anneau gradué autour de chaque cristal
    for (const cr of templeCrystals(g.level)) drawRing(c, P, cr);
  }

  /** L'anneau du soleil autour d'un cristal, gradué comme un cadran. */
  function drawRing(c, P, cr) {
    c.strokeStyle = P.stone;
    c.lineWidth = 2.4;
    c.beginPath();
    c.arc(cr.x, cr.y, cr.r + 6, 0, TAU);
    c.stroke();
    // Ses graduations, comme sur un cadran : une longue toutes les trois
    c.lineWidth = 1.2;
    c.lineCap = 'butt';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const len = i % 3 === 0 ? 12.5 : 10.6;
      c.beginPath();
      c.moveTo(cr.x + Math.cos(a) * (cr.r + 8), cr.y + Math.sin(a) * (cr.r + 8));
      c.lineTo(cr.x + Math.cos(a) * (cr.r + len), cr.y + Math.sin(a) * (cr.r + len));
      c.stroke();
    }
  }

  // ── Eau ──

  function drawBasin(c, P, b, g, isLit) {
    const d = b.def;
    const t = g.time;
    c.fillStyle = P.water;
    c.fillRect(d.x0 - 1, b.level, d.x1 - d.x0 + 2, d.floor - b.level + 2);
    // Reflets en surface
    c.fillStyle = isLit ? '#ffffff' : P.iceLine;
    c.globalAlpha = 0.6;
    const w = d.x1 - d.x0;
    for (let i = 0; i < 6; i++) {
      const drift = d.flow ? t * 24 : Math.sin(t * 0.8 + i) * 6;
      const x = d.x0 + ((hash(i + 60) * w + drift + i * 13) % (w - 8));
      c.fillRect(x, b.level + 2 + (i % 3) * 3.5, 5 + (i % 2) * 3, 0.9);
    }
    c.globalAlpha = 1;
    // Filet d'eau qui alimente le bassin
    if (d.spout && b.level > d.spout.y + 2) {
      c.strokeStyle = P.water;
      c.lineWidth = 3;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(d.spout.x, d.spout.y);
      c.quadraticCurveTo(d.spout.x + 12, d.spout.y + 1, d.spout.x + 14, b.level + 1);
      c.stroke();
    }
  }

  function drawFall(c, P, w, g, isLit, width = 4.6) {
    const top = w.pts[0];
    const bot = w.pts[w.pts.length - 1];
    const t = g.time;
    c.fillStyle = P.water;
    if (width < 3) {
      // Un simple filet qui tombe : un trait fin, un reflet, une goutte d'écume
      c.fillRect(top.x - width / 2, top.y, width, bot.y - top.y);
      c.strokeStyle = isLit ? '#ffffff' : P.iceLine;
      c.globalAlpha = 0.6;
      c.lineWidth = 0.6;
      c.lineCap = 'round';
      c.setLineDash([9, 11]);
      c.lineDashOffset = -t * 90;
      c.beginPath();
      c.moveTo(top.x, top.y + 1);
      c.lineTo(top.x, bot.y);
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = 1;
      if (w.reachesEnd && bot.y < view.bottom) {
        c.fillStyle = isLit ? '#ffffff' : P.iceLine;
        c.beginPath();
        c.arc(bot.x, bot.y - 0.8, 1 + 0.5 * Math.abs(Math.sin(t * 5)), 0, TAU);
        c.fill();
      }
      return;
    }
    c.fillRect(top.x - 3, top.y, 6, bot.y - top.y);
    // Filets clairs qui descendent
    c.strokeStyle = isLit ? '#ffffff' : P.iceLine;
    c.globalAlpha = 0.55;
    c.lineWidth = 0.9;
    c.lineCap = 'round';
    c.setLineDash([16, 12]);
    for (let k = 0; k < 2; k++) {
      c.lineDashOffset = -(t * (90 + k * 30)) + k * 7;
      c.beginPath();
      c.moveTo(top.x - 1.2 + k * 2.4, top.y + 2);
      c.lineTo(top.x - 1.2 + k * 2.4, bot.y);
      c.stroke();
    }
    c.setLineDash([]);
    c.globalAlpha = 1;
    // Écume au pied de la chute
    if (w.reachesEnd && bot.y < view.bottom) {
      c.fillStyle = isLit ? '#ffffff' : P.iceLine;
      for (let i = 0; i < 4; i++) {
        const r = 1.6 + 1.2 * Math.abs(Math.sin(t * 5 + i * 1.7));
        c.beginPath();
        c.arc(bot.x - 5 + i * 3.4, bot.y - 1.5, r, 0, TAU);
        c.fill();
      }
    }
  }

  /** width : la largeur du cours d'eau (4.6 pour un torrent, 2 environ pour un filet). */
  function drawRun(c, P, w, g, isLit, width = 4.6) {
    const thin = width < 3;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = P.water;
    c.lineWidth = width;
    line(c, w.pts);
    c.stroke();
    // Reflets qui filent
    c.strokeStyle = isLit ? '#ffffff' : P.iceLine;
    c.globalAlpha = 0.7;
    c.lineWidth = thin ? 0.6 : 0.9;
    c.setLineDash(thin ? [3, 8] : [4, 9]);
    c.lineDashOffset = -g.time * 26;
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
  }

  /** Une eau calme : liquide quand amount = 0, prise par la glace quand amount = 1. */
  /**
   * Une eau calme qui gèle. La glace naît en plaques anguleuses, des rives
   * vers le milieu, comme une banquise ; au dégel, elles fondent dans l'ordre
   * inverse. Entre deux plaques, une fente laisse voir l'eau.
   */
  function drawFrost(c, P, f, g) {
    const r = f.def.rect;
    const w = r.x1 - r.x0;
    const h = r.y1 - r.y0;
    const k = smooth(f.amount);
    const mid = r.x0 + w / 2;
    // L'eau, et ses reflets qui courent (ils ralentissent quand elle gèle)
    c.fillStyle = P.water;
    c.fillRect(r.x0, r.y0, w, h);
    c.fillStyle = P.iceLine;
    c.globalAlpha = 0.55 * (1 - k);
    for (let i = 0; i < 5; i++) {
      const x = r.x0 + ((hash(i + 40) * w + g.time * 9 * (1 - k) + i * 11) % (w - 7));
      c.fillRect(x, r.y0 + 1.6 + (i % 3) * 1.5, 4 + (i % 2) * 2, 0.7);
    }
    c.globalAlpha = 1;
    if (k <= 0.01) return;

    // Les plaques : une tous les dix pas environ, aux bords un peu irréguliers
    const n = Math.max(3, Math.round(w / 10));
    const edge = (i) => r.x0 + (w * (i + (i > 0 && i < n ? (hash(i + 5) - 0.5) * 0.45 : 0))) / n;
    c.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const x0 = edge(i);
      const x1 = edge(i + 1);
      const cx = (x0 + x1) / 2;
      const d = 1 - Math.abs((cx - mid) / (w / 2)); // 0 sur la rive, 1 au milieu
      const s = clamp((k * 1.2 - d * 0.9) / 0.3, 0, 1); // où en est cette plaque
      if (s <= 0) continue;
      const half = ((x1 - x0) / 2 - 0.55) * (0.35 + 0.65 * s);
      const up = (a) => r.y0 - (0.5 + 1.5 * hash(i * 3 + a)) * s; // elle dépasse un peu de l'eau
      const bottom = r.y0 + h * s;
      const pts = [
        { x: cx - half, y: up(1) },
        { x: cx - half * 0.1, y: up(2) - 0.5 * s },
        { x: cx + half, y: up(3) },
        { x: cx + half - 0.25, y: bottom },
        { x: cx - half + 0.25, y: bottom },
      ];
      poly(c, pts);
      c.fillStyle = P.ice;
      c.fill();
      // une facette, puis le dessus plus clair
      c.strokeStyle = P.iceLine;
      c.lineWidth = 0.6;
      c.globalAlpha = 0.6 * s;
      line(c, [pts[1], { x: cx - half * 0.35, y: r.y0 + h * s * 0.7 }]);
      c.stroke();
      c.globalAlpha = s;
      c.lineWidth = 0.9;
      line(c, [pts[0], pts[1], pts[2]]);
      c.stroke();
      c.globalAlpha = 1;
    }
  }

  /**
   * Une digue de glace : une cascade gelée. L'eau qui s'échappe du lac gèle
   * sur place : la chute se fige dans le ravin, et la glace s'accumule couche
   * après couche à la sortie, large à la base, avec des glaçons côté vide.
   * (Ce qui arrête la lumière et l'eau reste le rectangle de frostPolygon.)
   */
  function drawDam(c, P, f, g) {
    const r = f.def.rect;
    const top = frostPolygon(f)[0].y;
    const k = f.amount;
    const mid = (r.x0 + r.x1) / 2;
    c.lineJoin = 'round';
    c.lineCap = 'round';

    // La chute figée : le cours d'eau que cette digue arrête, pris par la glace
    const stream = g.streams.find((s) => s.def.spring === f.def.id);
    const frozenAt = stream ? stream.def.frozenAt || 0.5 : 1;
    if (stream && k >= frozenAt) {
      const pts = [{ x: r.x1 + 0.5, y: r.y1 + 1 }];
      for (const part of stream.def.parts) for (const q of part.run || []) if (q[0] > r.x1 + 2) pts.push(P2(q));
      c.globalAlpha = clamp((k - frozenAt) / 0.15, 0, 1);
      c.strokeStyle = P.ice;
      c.lineWidth = (stream.def.width || 4.6) + 1.6;
      line(c, pts);
      c.stroke();
      // des glaçons, tout le long
      c.fillStyle = P.ice;
      let n = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        for (let d = 7; d < len; d += 14, n++) {
          const x = a.x + ((b.x - a.x) * d) / len + 2;
          const y = a.y + ((b.y - a.y) * d) / len;
          if (y > view.bottom) break;
          poly(c, [
            { x: x - 1.6, y },
            { x: x + 1.6, y },
            { x: x + 0.4, y: y + 7 + hash(n + 3) * 5 },
          ]);
          c.fill();
        }
      }
      c.globalAlpha = 1;
    }
    if (k <= 0.01) return;

    // Le massif de glace : plus large au pied qu'en haut
    const lean = (y) => (r.y1 - y) / (r.y1 - r.y0); // 0 au pied, 1 en haut
    const left = (y) => r.x0 - 8 * (1 - lean(y));
    const right = (y) => r.x1 + 3 * (1 - lean(y));
    c.fillStyle = P.ice;
    c.beginPath();
    c.moveTo(left(r.y1), r.y1 + 2);
    for (let y = r.y1; y > top; y -= 6) c.lineTo(left(y) + Math.sin(y * 0.6) * 0.8, y);
    c.quadraticCurveTo(mid, top - 3.5, right(top), top + 1);
    for (let y = top + 1; y < r.y1; y += 6) c.lineTo(right(y) + Math.sin(y * 0.8) * 0.9, y);
    c.lineTo(right(r.y1), r.y1 + 2);
    c.closePath();
    c.fill();
    // les couches, l'une sur l'autre
    c.strokeStyle = P.iceLine;
    c.lineWidth = 0.6;
    c.globalAlpha = 0.55;
    for (let y = r.y1 - 6; y > top + 3; y -= 7) {
      c.beginPath();
      c.moveTo(left(y) + 1, y);
      c.quadraticCurveTo(mid, y - 2.2, right(y) - 1, y + 0.6);
      c.stroke();
    }
    c.globalAlpha = 1;
    // des glaçons sur la face du ravin
    c.fillStyle = P.ice;
    for (let y = r.y1 - 9, i = 0; y > top + 4; y -= 13, i++) {
      const x = right(y);
      poly(c, [
        { x: x - 1.5, y: y - 1 },
        { x: x + 2.2, y },
        { x: x + 1.2, y: y + 6 + hash(i) * 4 },
      ]);
      c.fill();
    }
    // le dessus, arrondi et plus clair
    c.strokeStyle = P.iceLine;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(left(top) + 0.5, top + 0.6);
    c.quadraticCurveTo(mid, top - 3.5, right(top), top + 1);
    c.stroke();
  }

  /** Une roue à eau, et la chaîne qui la relie à sa porte (voir machine.js). */
  function drawWheel(c, P, wheel, g) {
    const w = wheel.def;
    const door = w.door && g.doors.find((d) => d.def.id === w.door);
    const stream = g.streams.find((k) => k.def.id === w.stream);
    if (door) drawChain(c, P, wheel, door);
    drawWaterWheel(c, P, wheel, g, !!stream && stream.on && stream.head >= 1);
  }

  function drawMount(c, P, m) {
    const mt = m.mount || { type: 'none' };
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (mt.type === 'pole') {
      c.strokeStyle = P.wood;
      c.lineWidth = 2.6;
      line(c, [
        { x: m.x, y: mt.baseY + 1 },
        { x: m.x, y: m.y },
      ]);
      c.stroke();
      c.lineWidth = 1.6;
      line(c, [
        { x: m.x - 6, y: mt.baseY + 1 },
        { x: m.x, y: mt.baseY - 9 },
        { x: m.x + 6, y: mt.baseY + 1 },
      ]);
      c.stroke();
    } else if (mt.type === 'rail') {
      // Le rail des anciens : une barre de pierre, deux butées, un filet d'or.
      const r = m.rail;
      c.strokeStyle = P.stoneDark;
      c.lineWidth = 3.4;
      c.lineCap = 'butt';
      line(c, [
        { x: r.x0 - 6, y: r.y0 - 1.6 },
        { x: r.x1 + 6, y: r.y1 - 1.6 },
      ]);
      c.stroke();
      c.fillStyle = P.stone;
      c.fillRect(r.x0 - 8, r.y0 - 7, 4, 8);
      c.fillRect(r.x1 + 4, r.y1 - 7, 4, 8);
      c.strokeStyle = P.bronze;
      c.lineWidth = 0.8;
      line(c, [
        { x: r.x0 - 3, y: r.y0 - 2.4 },
        { x: r.x1 + 3, y: r.y1 - 2.4 },
      ]);
      c.stroke();
      // Le chariot qui porte le miroir
      const base = m.y + (r.height ?? 15) - 2.6;
      c.fillStyle = P.bronze;
      poly(c, [
        { x: m.x - 6, y: base },
        { x: m.x + 6, y: base },
        { x: m.x + 2.5, y: m.y + 3 },
        { x: m.x - 2.5, y: m.y + 3 },
      ]);
      c.fill();
      c.fillStyle = P.stone;
      for (const dx of [-4, 4]) {
        c.beginPath();
        c.arc(m.x + dx, base + 0.6, 1.7, 0, TAU);
        c.fill();
      }
    } else if (mt.type === 'arm') {
      c.strokeStyle = P.bronze;
      c.lineWidth = 2;
      line(c, [
        { x: mt.fromX, y: mt.fromY },
        { x: m.x - 10, y: mt.fromY - 1 },
        { x: m.x, y: m.y },
      ]);
      c.stroke();
    }
  }

  /** Un conduit : une borne et son œil d'entrée, une trace gravée, un œil de sortie. */
  function drawEye(c, P, e) {
    const d = e.def;
    // La borne qui porte l'œil d'entrée (si le niveau en veut une)
    if (d.baseY !== undefined) {
      c.fillStyle = P.stone;
      poly(c, [
        { x: d.x - 5.5, y: d.baseY + 1 },
        { x: d.x - 4.6, y: d.y - 6 },
        { x: d.x, y: d.y - 11 },
        { x: d.x + 4.6, y: d.y - 6 },
        { x: d.x + 5.5, y: d.baseY + 1 },
      ]);
      c.fill();
    }
    // … et celle de l'œil de sortie
    if (d.out.baseY !== undefined) {
      c.fillStyle = P.stone;
      poly(c, [
        { x: d.out.x - 5.5, y: d.out.baseY + 1 },
        { x: d.out.x - 4.6, y: d.out.y - 6 },
        { x: d.out.x, y: d.out.y - 11 },
        { x: d.out.x + 4.6, y: d.out.y - 6 },
        { x: d.out.x + 5.5, y: d.out.baseY + 1 },
      ]);
      c.fill();
    }
    for (const p of [d, d.out]) {
      c.fillStyle = P.doorway;
      c.beginPath();
      c.arc(p.x, p.y, 4.4, 0, TAU);
      c.fill();
      c.strokeStyle = e.lit ? '#ffe08a' : P.bronze;
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(p.x, p.y, 3.1, 0, TAU);
      c.stroke();
      c.fillStyle = e.lit ? '#fff6c8' : P.bronze;
      c.beginPath();
      c.arc(p.x, p.y, 1.2, 0, TAU);
      c.fill();
    }
  }

  /** Un cristal-mémoire : un gros cristal sur un petit socle. */
  function drawMemory(c, P, m) {
    const d = m.def;
    const r = d.r || 8;
    const base = d.baseY ?? d.y + r * 1.15 + 9;
    c.fillStyle = P.stoneDark;
    c.fillRect(d.x - 7, base - 3, 14, 4);
    c.fillStyle = P.stone;
    c.fillRect(d.x - 4.5, d.y + r * 1.15 - 1, 9, base - 2 - (d.y + r * 1.15 - 1));
    c.strokeStyle = P.stone;
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(d.x, d.y, r + 5, Math.PI * 0.15, Math.PI * 0.85, true);
    c.stroke();
  }

  function drawPedestal(c, P, p) {
    c.fillStyle = P.stoneDark;
    c.fillRect(p.x - 8, p.baseY - 4, 16, 5);
    c.fillStyle = P.stone;
    poly(c, [
      { x: p.x - 5, y: p.baseY - 4 },
      { x: p.x - 3, y: p.topY },
      { x: p.x + 3, y: p.topY },
      { x: p.x + 5, y: p.baseY - 4 },
    ]);
    c.fill();
  }

  function drawRaft(c, P, m, g) {
    const basin = g.basins.find((b) => b.def.id === m.raft.basin);
    const y = basin.level;
    const bob = Math.sin(g.time * 1.6) * 0.5;
    // Mât, puis planches
    c.strokeStyle = P.wood;
    c.lineCap = 'round';
    c.lineWidth = 2.2;
    line(c, [
      { x: m.x, y: y - 1 },
      { x: m.x, y: m.y },
    ]);
    c.stroke();
    c.fillStyle = P.wood;
    c.fillRect(m.x - 17, y - 2.6 + bob, 34, 4);
    c.fillStyle = P.wood;
    c.fillRect(m.x - 17, y + 0.2 + bob, 34, 1.2);
    // Un passager
    drawVillager(c, P, { x: m.x - 10, y: y - 2.4 + bob, s: 0.85, dir: 1 }, 7, g);
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

  /** Une hutte enterrée : un dôme de terre et de neige, une porte, un feu. */
  function drawHouse(c, P, h, g) {
    const { half, height } = hutSize(h);
    const k = half / 42; // les mesures ci-dessous sont celles d'une hutte de 84 de large
    c.save();
    c.translate(h.x, h.baseY);
    // Le dôme
    c.fillStyle = P.turf;
    c.beginPath();
    c.ellipse(0, 0, half, height, 0, Math.PI, TAU);
    c.closePath();
    c.fill();
    // La neige, sur le côté du vent
    c.strokeStyle = P.snow;
    c.lineWidth = 3 * k + 1;
    c.lineCap = 'round';
    c.beginPath();
    c.ellipse(0, 0, half - 1.6, height - 1.6, 0, Math.PI * 1.1, Math.PI * 1.52);
    c.stroke();
    // La porte : un cadre de bois, et le feu qui brûle au fond
    const dw = 16 * k;
    const dh = 18 * k;
    c.fillStyle = P.doorway;
    c.fillRect(-dw / 2, -dh, dw, dh + 1);
    const flicker = 0.85 + 0.15 * Math.sin(g.time * 7 + h.x);
    const night = g.life ? g.life.night : 0; // la nuit, la porte éclaire davantage
    const warm = c.createRadialGradient(0, -dh * 0.3, 0, 0, -dh * 0.3, dh * (g.temple.glow > 0.6 ? 1.5 : 1 + 0.7 * night));
    warm.addColorStop(0, `rgba(255, 220, 140, ${0.75 * flicker})`);
    warm.addColorStop(1, 'rgba(255, 220, 140, 0)');
    c.fillStyle = warm;
    c.fillRect(-dw * 2, -dh * 2.2, dw * 4, dh * 2.3);
    c.fillStyle = '#ffcf7a';
    c.fillRect(-dw * 0.3, -dh * 0.62, dw * 0.6, dh * 0.62 + 1);
    c.strokeStyle = P.wood;
    c.lineWidth = 2.2 * k + 0.6;
    c.lineCap = 'butt';
    line(c, [
      { x: -dw / 2 - 1, y: 1 },
      { x: -dw / 2 - 1, y: -dh - 1 },
      { x: dw / 2 + 1, y: -dh - 1 },
      { x: dw / 2 + 1, y: 1 },
    ]);
    c.stroke();
    // La fumée (le vent la couche)
    const wind = windAt(g.life, h.x);
    c.fillStyle = P.snow;
    for (let i = 0; i < 4; i++) {
      const t = (g.time * 0.22 + i / 4 + h.x * 0.01) % 1;
      c.globalAlpha = 0.6 * (1 - t);
      c.beginPath();
      c.arc(half * 0.42 + Math.sin(t * 5 + i) * 2.4 + wind * t * 30, -height * 0.9 - t * (22 - wind * 8), 1.6 + t * 2.6, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
    c.restore();
  }

  function drawIce(c, P, ice) {
    const pts = ice.def.points;
    const m = ice.melt;
    // La glace s'amincit et se rétracte légèrement en fondant.
    let cx = 0;
    let cy = 0;
    for (const p of pts) {
      cx += p.x / pts.length;
      cy += p.y / pts.length;
    }
    const snow = ice.def.look === 'snow';
    const k = 1 - 0.14 * m;
    // (la glace se soulève un peu en fondant ; la neige, elle, se tasse)
    const shr = pts.map((p) => ({ x: cx + (p.x - cx) * k, y: cy + (snow ? 3 : -6) * m + (p.y - cy) * k }));
    poly(c, shr);
    // Une corniche ou un tas de neige (look: 'snow') : la même neige que celle du
    // sol, opaque (elle cache ce qu'elle recouvre), avec un bord doux qui déborde
    // un peu sur le sol pour faire corps avec lui.
    if (snow) {
      c.globalAlpha = 1 - 0.65 * m;
      c.fillStyle = P.snow;
      c.fill();
      c.strokeStyle = P.snow;
      c.lineJoin = 'round';
      c.lineWidth = 2.6;
      c.stroke();
      c.globalAlpha = 1;
      return;
    }
    c.globalAlpha = 0.94 - 0.6 * m;
    c.fillStyle = P.ice;
    c.fill();
    // Facettes
    c.strokeStyle = P.iceLine;
    c.lineWidth = 0.8;
    c.globalAlpha = (0.94 - 0.6 * m) * 0.7;
    const mid = { x: cx + 6, y: cy - 2 };
    for (let i = 0; i < shr.length; i += 2) {
      line(c, [shr[i], mid, shr[(i + 3) % shr.length]]);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  // ── Personnages ──

  /** p = { x, y, s (taille), dir (1 ou -1) } ; step > 0 quand il marche. */
  /** Le tracé de la cape (une goutte à capuchon), pour la remplir ou s'y limiter. */
  function cloakPath(c, bob) {
    c.beginPath();
    c.moveTo(-5.2, 0.5);
    c.quadraticCurveTo(-6, -9 + bob, -1.2, -14.5 + bob);
    c.quadraticCurveTo(0.5, -18.5 + bob, 3, -17 + bob); // pointe du capuchon
    c.quadraticCurveTo(2.2, -15 + bob, 2.6, -13.5 + bob);
    c.quadraticCurveTo(6, -8 + bob, 5.2, 0.5);
    c.closePath();
  }

  /**
   * Un villageois : cape noire à frise blanche, petit masque noir cerclé de
   * blanc, et une barre de lumière à la place des yeux.
   */
  function drawVillager(c, P, p, i, g, step = 0) {
    const t = g.time;
    // Sa pose du moment (voir updateVillager dans life.js) : accroupi au
    // froid, étiré au soleil, le regard levé ou baissé, sursautant si on le touche.
    const pose = p.pose || {};
    const crouch = pose.crouch || 0;
    const stretch = pose.stretch ? Math.sin(Math.PI * pose.stretch) : 0;
    const cheer = pose.cheer || 0;
    const vis = pose.vis ?? 1;
    // Ils dansent quand le temple s'allume : ils sautent, se balancent et se retournent.
    const joy = g.temple.lit ? smooth(g.win.t / 0.8) * (1 - smooth((g.win.t - 14) / 4)) : 0;
    const hop =
      joy * Math.abs(Math.sin(t * 5.5 + i * 1.3)) * 5 +
      step * Math.abs(Math.sin(t * 9)) * 1.6 +
      (pose.hop ? Math.sin(Math.PI * pose.hop) * 5 : 0) +
      cheer * Math.abs(Math.sin(t * 6 + i)) * 1.2;
    const bob = Math.sin(t * 1.8 + i * 2.1) * 0.5 - stretch * 1.4;
    const dir = joy > 0.5 && Math.sin(t * 2.4 + i * 1.7) < 0 ? -p.dir : p.dir;
    c.save();
    c.globalAlpha = vis; // il s'efface en rentrant dans sa hutte
    c.translate(p.x + Math.sin(t * 23 + i) * 0.25 * crouch, p.y - hop); // il grelotte
    c.rotate(Math.sin(t * 4 + i) * 0.1 * joy);
    const size = p.s * (0.6 + 0.4 * vis);
    c.scale(size * dir * (1 + 0.05 * crouch), size * (1 - 0.09 * crouch + 0.09 * stretch));
    // La cape
    c.fillStyle = P.cloak;
    cloakPath(c, bob);
    c.fill();
    // La frise de triangles, au bas de la cape (les enfants n'en ont pas encore)
    if (p.s >= 0.9) {
      c.save();
      cloakPath(c, bob);
      c.clip();
      c.fillStyle = P.trim;
      c.beginPath();
      for (let x = -7.2; x < 7; x += 2.4) {
        c.moveTo(x, -1.3);
        c.lineTo(x + 1.2, -4.2);
        c.lineTo(x + 2.4, -1.3);
      }
      c.fill();
      c.fillRect(-8, -1.3, 16, 0.7);
      c.restore();
    }
    // Le masque
    const mx = 0.9;
    const my = -9.6 + bob + (pose.lookY || 0) * 0.9;
    c.strokeStyle = P.trim;
    c.lineWidth = 0.65;
    c.beginPath();
    c.ellipse(mx, my, 3.3, 3.2, 0, 0, TAU);
    c.stroke();
    c.fillStyle = P.cloak;
    c.beginPath();
    c.ellipse(mx, my, 2.7, 2.6, 0, 0, TAU);
    c.fill();
    // Le signe de l'aube : un demi-soleil et trois rayons
    c.lineWidth = 0.45;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(mx, my - 0.55, 1.35, Math.PI, TAU);
    c.stroke();
    for (const a of [-2.4, -1.57, -0.74]) {
      c.beginPath();
      c.moveTo(mx + Math.cos(a) * 1.75, my - 0.55 + Math.sin(a) * 1.75);
      c.lineTo(mx + Math.cos(a) * 2.3, my - 0.55 + Math.sin(a) * 2.3);
      c.stroke();
    }
    // La barre de lumière : elle luit plus fort dans l'ombre, et cligne parfois
    const blink = Math.sin(t * 0.9 + i * 3.7) > 0.985 ? 0.25 : 1;
    // (elle s'élargit et rayonne quand un cristal s'allume, ou quand on le touche)
    const flash = Math.max(cheer, pose.hop || 0);
    const reach = 5.5 * (1 + 0.6 * flash);
    const halo = c.createRadialGradient(mx, my - 0.3, 0, mx, my - 0.3, reach);
    halo.addColorStop(0, `rgba(255, 240, 180, ${Math.min(1, P.barGlow * (1 + flash))})`);
    halo.addColorStop(1, 'rgba(255, 220, 130, 0)');
    c.fillStyle = halo;
    c.beginPath();
    c.arc(mx, my - 0.3, reach, 0, TAU);
    c.fill();
    c.fillStyle = '#ffeeb4';
    c.beginPath();
    c.roundRect(mx - 2 - 0.4 * flash, my - 0.3 - 0.48 * blink, 4 + 0.8 * flash, 0.96 * blink, 0.48 * blink);
    c.fill();
    c.restore();
  }

  /** Un porteur : un villageois qui marche, son miroir sur le dos. */
  function drawWalker(c, P, w, i, g) {
    const pos = walkerPosition(w);
    const s = w.def.s || 1;
    // Il regarde là où il va : à gauche si son chemin part vers la gauche.
    const path = w.def.path;
    const dir = path[path.length - 1][0] < path[0][0] ? -1 : 1;
    drawVillager(c, P, { x: pos.x, y: pos.y, s, dir }, i + 11, g, w.moving ? 1 : 0);
    if (w.done) return;
    // Le miroir, tenu dans le dos par une hampe
    const hop = w.moving ? Math.abs(Math.sin(g.time * 9)) * 1.6 : 0;
    const bx = pos.x - 5 * s * dir;
    const by = pos.y - hop;
    c.lineCap = 'round';
    c.strokeStyle = P.wood;
    c.lineWidth = 1.5;
    line(c, [
      { x: bx, y: by - 3 },
      { x: bx - dir, y: by - 21 * s },
    ]);
    c.stroke();
    c.strokeStyle = P.bronze;
    c.lineWidth = 4;
    line(c, [
      { x: bx - 6 * dir, y: by - 16 * s },
      { x: bx + 4 * dir, y: by - 28 * s },
    ]);
    c.stroke();
    c.strokeStyle = P.iceLine;
    c.lineWidth = 2;
    c.stroke();
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

  function drawOverlay(c, g) {
    const L = g.level;
    const t = g.time;
    const crystals = templeCrystals(L);
    const cr = crystals[0];

    // Faisceaux : un voile doré par-dessus tout
    c.fillStyle = `rgba(255, 206, 110, ${0.3 * g.light.intensity})`;
    for (const p of g.light.beamPolys) {
      poly(c, p);
      c.fill();
    }
    // Ceux qui viennent d'une lampe se voient aussi la nuit
    c.fillStyle = 'rgba(255, 214, 130, 0.34)';
    for (const p of g.light.lampPolys) {
      poly(c, p);
      c.fill();
    }

    // Chaînes entre miroirs jumelés, et traces gravées des conduits
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const m of g.mirrors) {
      if (!m.chain) continue;
      c.strokeStyle = 'rgba(255, 224, 138, 0.75)';
      c.lineWidth = 1.2;
      c.setLineDash([2.5, 2.5]);
      line(c, m.chain.map(P2));
      c.stroke();
      c.setLineDash([]);
    }
    for (const e of g.eyes) {
      if (!e.def.path) continue;
      c.strokeStyle = e.lit ? 'rgba(255, 224, 138, 0.95)' : 'rgba(255, 224, 138, 0.22)';
      c.lineWidth = e.lit ? 1.6 : 1;
      line(c, e.def.path.map(P2));
      c.stroke();
    }
    c.globalCompositeOperation = 'lighter';

    // Halo des yeux de pierre éclairés et des cristaux-mémoire chargés
    const halo = (x, y, r, a) => {
      const gl = c.createRadialGradient(x, y, 0, x, y, r);
      gl.addColorStop(0, `rgba(255,240,180,${a})`);
      gl.addColorStop(1, 'rgba(255,220,130,0)');
      c.fillStyle = gl;
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    };
    for (const e of g.eyes) {
      if (!e.lit) continue;
      halo(e.def.x, e.def.y, 11, 0.6);
      halo(e.def.out.x, e.def.out.y, 16 + Math.sin(t * 4) * 1.5, 0.7);
    }
    // (de jour, un cristal-mémoire chargé scintille à peine ; la nuit, il rayonne)
    const dark = 1 - smooth(g.light.intensity / 0.35);
    for (const m of g.memories) if (m.charge > 0.02) halo(m.def.x, m.def.y, 10 + (4 + 22 * dark) * m.charge + Math.sin(t * 3) * 1.5, (0.3 + 0.5 * dark) * m.charge);

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
      for (const path of L.conduits || []) {
        const pts = path.map(P2);
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
      for (const l of L.lanterns || []) {
        const gl = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, 14);
        gl.addColorStop(0, `rgba(255,226,150,${0.55 * lk})`);
        gl.addColorStop(1, 'rgba(255,210,120,0)');
        c.fillStyle = gl;
        c.beginPath();
        c.arc(l.x, l.y, 14, 0, TAU);
        c.fill();
      }
    }

    // Halo des cristaux : chacun brille dès qu'il reçoit de la lumière, mais
    // le sanctuaire ne se charge (ch) que s'ils la reçoivent tous ensemble.
    const ch = g.temple.lit ? 1 : g.temple.charge;
    const glowOf = (i) => (g.temple.lit ? 1 : Math.max(ch, g.crystals[i].lit ? 0.45 : 0));
    crystals.forEach((k, i) => {
      const a = glowOf(i);
      if (a > 0) halo(k.x, k.y, 12 + 12 * a + Math.sin(t * 5 + i) * 1.2, 0.6 * a);
    });

    // Étincelles (dorées) et embruns (blancs)
    for (const p of g.particles) {
      if (p.type === 'drip') continue;
      const a = 1 - p.life / p.max;
      c.fillStyle = p.type === 'mist' ? `rgba(215,240,255,${a})` : `rgba(255,232,160,${a})`;
      c.beginPath();
      c.arc(p.x, p.y, 0.6 + a * 1.2, 0, TAU);
      c.fill();
    }
    drawLifeGlow(c, g); // poussières dorées dans les faisceaux
    c.globalCompositeOperation = 'source-over';

    // La machine à eau au travail : des éclats dorés montent vers la porte
    for (const w of g.wheels) {
      const door = w.def.door && g.doors.find((d) => d.def.id === w.def.door);
      if (door) drawMachineGlow(c, w, door, g);
    }

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

    // Cristaux du sanctuaire, puis cristaux-mémoire
    const gem = (pts, k, a) => {
      poly(c, pts);
      const cc = Math.round(a * 100);
      c.fillStyle = `color-mix(in srgb, #fff6c8 ${cc}%, #6079bd)`;
      c.fill();
      c.strokeStyle = `color-mix(in srgb, #ffffff ${cc}%, #8ea5e0)`;
      c.lineWidth = 0.9;
      c.stroke();
      line(c, [
        { x: k.x, y: k.y - k.r * 1.15 },
        { x: k.x - 2, y: k.y },
        { x: k.x, y: k.y + k.r * 1.15 },
      ]);
      c.stroke();
    };
    crystals.forEach((k, i) => gem(crystalPolygon(L, i), k, glowOf(i)));
    for (const m of g.memories) gem(memoryPolygon(m), { x: m.def.x, y: m.def.y, r: m.def.r || 8 }, m.charge);

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

  /** Les deux bulles du bas de l'écran : soleil et nuage, pour jouer au pouce. */
  function drawSliders(c, g) {
    const drag = g.drag;
    for (const b of sliderBubbles(g, view)) {
      const held = drag && drag.slider && drag.type === b.type;
      // Tant qu'on tient une bulle, sa ligne apparaît en filigrane.
      if (held) {
        c.strokeStyle = 'rgba(255,255,255,0.16)';
        c.lineWidth = 1.5;
        c.lineCap = 'round';
        c.setLineDash([0.1, 8]);
        c.beginPath();
        c.moveTo(b.r + 8, b.y);
        c.lineTo(view.w - b.r - 8, b.y);
        c.stroke();
        c.setLineDash([]);
      }
      // Le disque
      c.fillStyle = held ? 'rgba(30, 44, 92, 0.85)' : 'rgba(18, 27, 58, 0.6)';
      c.beginPath();
      c.arc(b.x, b.y, b.r, 0, TAU);
      c.fill();
      c.strokeStyle = held ? 'rgba(255, 226, 160, 0.95)' : 'rgba(255, 255, 255, 0.35)';
      c.lineWidth = 1.4;
      c.stroke();
      // Le pictogramme
      if (b.type === 'sun') {
        c.fillStyle = '#ffe2a0';
        c.beginPath();
        c.arc(b.x, b.y, 5.2, 0, TAU);
        c.fill();
        c.strokeStyle = '#ffe2a0';
        c.lineWidth = 1.5;
        c.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          c.beginPath();
          c.moveTo(b.x + Math.cos(a) * 8.2, b.y + Math.sin(a) * 8.2);
          c.lineTo(b.x + Math.cos(a) * 11, b.y + Math.sin(a) * 11);
          c.stroke();
        }
      } else if (b.type === 'rail') {
        // Un petit miroir incliné et ses deux flèches
        c.lineCap = 'round';
        c.strokeStyle = '#d9aa52';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(b.x - 4, b.y + 5);
        c.lineTo(b.x + 4, b.y - 5);
        c.stroke();
        c.strokeStyle = '#fffbe2';
        c.lineWidth = 2;
        c.stroke();
        c.strokeStyle = '#eef3ff';
        c.lineWidth = 1.4;
        for (const d of [-1, 1]) {
          c.beginPath();
          c.moveTo(b.x + d * 9, b.y - 3.5);
          c.lineTo(b.x + d * 12.5, b.y);
          c.lineTo(b.x + d * 9, b.y + 3.5);
          c.stroke();
        }
      } else {
        c.fillStyle = '#eef3ff';
        c.beginPath();
        c.arc(b.x - 5, b.y + 2, 4.2, 0, TAU);
        c.arc(b.x, b.y - 2, 5.6, 0, TAU);
        c.arc(b.x + 5.5, b.y + 1.5, 4.4, 0, TAU);
        c.rect(b.x - 5, b.y + 1, 10.5, 5.2);
        c.fill();
      }
    }
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
    if (cl) {
      c.strokeStyle = `rgba(255,255,255,${drag && drag.type === 'cloud' ? 0.5 : 0.22})`;
      // Les pointillés passent par le milieu du nuage, et s'effacent derrière lui
      const y = cloudMid(cl);
      const half = cl.w * 0.5 + 3;
      c.save();
      c.beginPath();
      c.rect(view.left, y - 4, g.cloudX - half - view.left, 8);
      c.rect(g.cloudX + half, y - 4, view.right - g.cloudX - half, 8);
      c.clip();
      c.beginPath();
      c.moveTo(cl.minX - cl.w * 0.45, y);
      c.lineTo(cl.maxX + cl.w * 0.45, y);
      c.stroke();
      c.restore();
    }
    c.setLineDash([]);

    // Anneau autour du soleil tant que le joueur ne l'a pas encore déplacé
    const sun = g.light.sun;
    const viaSlider = drag && drag.slider && drag.type === 'sun';
    if (!g.touched.sun || viaSlider) {
      c.strokeStyle = `rgba(255,240,190,${0.35 + 0.45 * pulse})`;
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(sun.x, sun.y, 20 + pulse * 5, 0, TAU);
      c.stroke();
    }

    // Chevrons de part et d'autre du nuage
    if (cl && !g.touched.cloud) {
      c.strokeStyle = `rgba(255,255,255,${0.3 + 0.5 * pulse})`;
      c.lineWidth = 1.6;
      for (const d of [-1, 1]) {
        const x = g.cloudX + d * (cl.w * 0.5 + 9 + pulse * 3);
        c.beginPath();
        const y = cloudMid(cl);
        c.moveTo(x - d * 3, y - 5);
        c.lineTo(x + d * 2, y);
        c.lineTo(x - d * 3, y + 5);
        c.stroke();
      }
    }

    // Cercle de rotation autour des miroirs
    for (const m of g.mirrors) {
      if (!m.free) continue;
      const active = drag && drag.mirror === m;
      if (m.rail) {
        // Un miroir sur rail : deux chevrons, de part et d'autre, le long du rail.
        const viaSlider = drag && drag.slider && drag.type === 'rail';
        const a = active || viaSlider ? 0.8 : !g.touched.rail ? 0.3 + 0.5 * pulse : 0.25;
        const tilt = Math.atan2(m.rail.y1 - m.rail.y0, m.rail.x1 - m.rail.x0);
        c.strokeStyle = `rgba(255,240,200,${a})`;
        c.lineWidth = 1.6;
        for (const d of [-1, 1]) {
          c.save();
          c.translate(m.x, m.y);
          c.rotate(tilt);
          const x = d * (m.len / 2 + 8 + (g.touched.rail ? 0 : pulse * 3));
          c.beginPath();
          c.moveTo(x - d * 3, -5);
          c.lineTo(x + d * 2, 0);
          c.lineTo(x - d * 3, 5);
          c.stroke();
          c.restore();
        }
        continue;
      }
      const hint = !m.turned;
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
