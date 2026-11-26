// Le dessin de la vie du monde : tout ce que life.js fait bouger et qui
// n'est ni un animal (voir decor.js) ni un villageois (voir render.js).
//
// Comme partout dans le jeu, chaque chose est dessinée deux fois : avec la
// palette d'ombre, puis avec la palette de lumière là où la lumière tombe
// (P est la palette du moment, isLit dit laquelle).

import { TAU } from '../engine/vec.js';
import { streamWet } from './game.js';
import { drawFlower } from './decor.js';
import { windAt } from './life.js';

// Un nombre « au hasard », mais toujours le même pour un i donné.
const hash = (i) => {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

function ellipse(c, x, y, rx, ry, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
  c.fill();
}

/** Loin dans le ciel, derrière les montagnes : de longs nuages qui dérivent. */
export function drawLifeSky(c, P, g, view) {
  const life = g.life;
  if (!life) return;
  const W = view.right - view.left + 260;
  c.fillStyle = P.cloud;
  c.globalAlpha = 0.3;
  for (let i = 0; i < 3; i++) {
    const w = 46 + hash(i + 11) * 44;
    const x = view.left - 130 + ((hash(i + 3) * W + g.time * (1.2 + i * 0.7) + life.wind.drift * 0.1) % W);
    const y = 150 + hash(i + 5) * 190;
    ellipse(c, x, y, w, 3.2);
    ellipse(c, x + w * 0.35, y - 3, w * 0.55, 2.8);
    ellipse(c, x - w * 0.4, y + 2.6, w * 0.5, 2.2);
  }
  c.globalAlpha = 1;
}

/** Entre les crêtes lointaines : un vol d'oiseaux ; dans la nuit, une étoile filante. */
export function drawLifeFar(c, P, g, isLit) {
  const life = g.life;
  if (!life) return;
  const { star, flock } = life.sky;
  if (star && !isLit) {
    const k = star.t * star.max;
    const x = star.x + star.vx * k;
    const y = star.y + star.vy * k;
    const n = Math.hypot(star.vx, star.vy);
    const tail = c.createLinearGradient(x, y, x - (star.vx / n) * 30, y - (star.vy / n) * 30);
    const a = Math.sin(Math.PI * star.t);
    tail.addColorStop(0, `rgba(255,255,255,${a})`);
    tail.addColorStop(1, 'rgba(255,255,255,0)');
    c.strokeStyle = tail;
    c.lineWidth = 1.1;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - (star.vx / n) * 30, y - (star.vy / n) * 30);
    c.stroke();
  }
  if (flock) {
    c.strokeStyle = P.bird;
    c.globalAlpha = 0.5;
    c.lineWidth = 0.7;
    c.lineCap = 'round';
    const dir = flock.vx > 0 ? 1 : -1;
    for (let i = 0; i < flock.n; i++) {
      // En V : le premier devant, les autres de part et d'autre
      const row = Math.ceil(i / 2);
      const side = i % 2 ? 1 : -1;
      const x = flock.x - dir * row * 7;
      const y = flock.y + side * row * 3 + Math.sin(g.time * 1.3 + i) * 0.8;
      const wing = Math.sin(g.time * 7 + i * 1.3) * 1.5;
      c.beginPath();
      c.moveTo(x - 2.6, y - 0.6 + wing);
      c.lineTo(x, y);
      c.lineTo(x + 2.6, y - 0.6 + wing);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
}

/** Sur le sol, sous les personnages : empreintes, fleurs du dégel, ombre du rapace, éclats sur l'eau. */
export function drawLifeGround(c, P, g, isLit) {
  const life = g.life;
  if (!life) return;
  const t = g.time;

  // Empreintes dans la neige
  c.fillStyle = P.print;
  for (const p of life.prints) {
    c.globalAlpha = 0.85 * (1 - p.age / 24);
    ellipse(c, p.x, p.y, 1.15, 0.6);
  }
  c.globalAlpha = 1;

  // Fleurs qui poussent quand le monde revient à la vie
  for (const b of life.blooms) {
    if (b.grow <= 0) continue;
    const lean = Math.sin(t * 1.7 + b.x) * 0.06 + (windAt(life, b.x) - 0.12) * 0.45;
    drawFlower(c, P, b.x, b.y, b.h, b.grow, lean, b.color, b.grow);
  }

  if (!isLit) return;
  // L'ombre du rapace glisse sur le relief (elle n'existe qu'au soleil).
  for (const k of life.critters) {
    if (k.type !== 'raptor' || !k.shadow) continue;
    c.fillStyle = 'rgba(40, 52, 96, 0.3)';
    ellipse(c, k.shadow.x, k.shadow.y, 9 * k.s, 2.6 * k.s);
  }
  // Éclats de soleil sur l'eau vive et sur les lacs
  c.fillStyle = '#ffffff';
  const glint = (x, y, i) => {
    const a = Math.max(0, Math.sin(t * 3.1 + i * 2.4 + x * 0.3)) ** 4;
    if (a < 0.05) return;
    const r = 0.5 + 2 * a;
    c.globalAlpha = a;
    c.beginPath();
    c.moveTo(x - r, y);
    c.lineTo(x, y - r * 0.28);
    c.lineTo(x + r, y);
    c.lineTo(x, y + r * 0.28);
    c.closePath();
    c.moveTo(x, y - r);
    c.lineTo(x + r * 0.28, y);
    c.lineTo(x, y + r);
    c.lineTo(x - r * 0.28, y);
    c.closePath();
    c.fill();
  };
  let n = 0;
  for (const s of g.streams) {
    for (const w of streamWet(s)) {
      const step = w.type === 'fall' ? 24 : 11;
      for (let i = 1; i < w.pts.length; i++) {
        const a = w.pts[i - 1];
        const b = w.pts[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        for (let d = step / 2; d < len; d += step) glint(a.x + ((b.x - a.x) * d) / len, a.y + ((b.y - a.y) * d) / len - 0.4, n++);
      }
    }
  }
  for (const b of g.basins) for (let x = b.def.x0 + 8; x < b.def.x1 - 6; x += 15) glint(x + Math.sin(n) * 3, b.level + 1.6 + (n % 3) * 1.4, n++);
  c.globalAlpha = 1;
}

/** Par-dessus la scène : neige soufflée, embruns, poissons, brume, traits de vent. */
export function drawLifeFront(c, P, g, isLit) {
  const life = g.life;
  if (!life) return;
  const t = g.time;

  // Poissons et ronds dans l'eau
  for (const w of life.waters) {
    const y = w.b.level;
    c.strokeStyle = P.iceLine;
    c.lineWidth = 0.6;
    for (const r of w.rings) {
      c.globalAlpha = 0.8 * (1 - r.t);
      c.beginPath();
      c.ellipse(r.x, y + 1.2, 2 + 11 * r.t, 0.5 + 1.6 * r.t, 0, 0, TAU);
      c.stroke();
    }
    c.globalAlpha = 1;
    if (w.jump) {
      const u = w.jump.t;
      const x = w.jump.x0 + w.jump.dir * 15 * u;
      const fy = y - Math.sin(Math.PI * u) * 11;
      c.save();
      c.translate(x, fy);
      c.scale(w.jump.dir, 1);
      c.rotate((u - 0.5) * 2.2);
      c.fillStyle = P.iceLine;
      ellipse(c, 0, 0, 3.2, 1.3);
      c.beginPath();
      c.moveTo(-2.6, 0);
      c.lineTo(-5, -1.6);
      c.lineTo(-5, 1.6);
      c.closePath();
      c.fill();
      c.restore();
    }
  }

  // Brume du petit matin (dans les creux que le niveau désigne : `mists`)
  const haze = Math.max(life.night, g.light.dawn * 0.8) * (1 - 0.6 * g.thaw);
  if (haze > 0.02) {
    c.fillStyle = P.snow;
    for (const m of g.level.mists || []) {
      const w = m.x1 - m.x0;
      for (let i = 0; i < 6; i++) {
        const x = m.x0 + ((hash(i + m.x0) * w + t * (1.5 + hash(i) * 2) + life.wind.drift * 0.2) % w);
        const edge = Math.min(1, (x - m.x0) / 18, (m.x1 - x) / 18); // elle s'efface vers les bords
        c.globalAlpha = 0.085 * haze * Math.max(0, edge);
        ellipse(c, x, m.y - 2 - hash(i + 4) * 7, 22 + hash(i + 2) * 12, 4.5);
        ellipse(c, x, m.y - 2 - hash(i + 4) * 7, 13, 2.8);
      }
    }
    c.globalAlpha = 1;
  }

  // Neige soufflée par le vent, embruns des cascades
  for (const b of life.bits) {
    c.fillStyle = b.type === 'spray' ? P.iceLine : P.snow;
    c.globalAlpha = 0.9 * (1 - b.life / b.max);
    c.beginPath();
    c.arc(b.x, b.y, b.r, 0, TAU);
    c.fill();
  }
  c.globalAlpha = 1;

  // La rafale : quelques traits de vent qui traversent l'écran
  const w = life.wind;
  if (w.front !== null) {
    c.strokeStyle = P.snow;
    c.lineWidth = 0.8;
    c.lineCap = 'round';
    c.globalAlpha = 0.3;
    for (const l of w.lines) {
      const x = w.front + l.off;
      c.beginPath();
      for (let i = 0; i <= 12; i++) {
        const px = x - l.len + (l.len * i) / 12;
        const py = l.y + Math.sin(i * 0.55 + l.wave + t * 3) * 2.2;
        if (i) c.lineTo(px, py);
        else c.moveTo(px, py);
      }
      // (une petite boucle au bout, comme sur les dessins de vent)
      c.arc(x, l.y - 2.4 + Math.sin(12 * 0.55 + l.wave + t * 3) * 2.2, 2.4, Math.PI / 2, -Math.PI * 0.9, true);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
}

/** Les poussières dorées qui dansent dans les faisceaux (à dessiner en mode « lumière ajoutée »). */
export function drawLifeGlow(c, g) {
  const life = g.life;
  if (!life) return;
  for (const m of life.motes) {
    if (m.a < 0.02) continue;
    c.fillStyle = `rgba(255, 238, 180, ${0.85 * m.a})`;
    c.beginPath();
    c.arc(m.x, m.y, 0.5 + 0.5 * m.a, 0, TAU);
    c.fill();
  }
}
