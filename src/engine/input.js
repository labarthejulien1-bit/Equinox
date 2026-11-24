// Contrôles tactiles (et souris sur ordinateur).
//
// Trois gestes, tous des « glisser » :
//   - le soleil suit le doigt le long de son arc ;
//   - le nuage suit le doigt le long de son rail ;
//   - un miroir tourne quand le doigt tourne autour de lui.

import { clamp, rad, dist } from './vec.js';
import { sunPosition, settleMirror } from '../game/game.js';

export function attachInput(canvas, view, getGame) {
  let drag = null;

  // Position du doigt en unités monde.
  const toWorld = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - view.ox) / view.scale,
      y: (e.clientY - r.top - view.oy) / view.scale,
    };
  };

  // Angle du soleil correspondant à un point de l'écran.
  const sunAngleAt = (g, p) => {
    const s = g.level.sun;
    return Math.atan2((s.cy - p.y) / s.ry, (p.x - s.cx) / s.rx);
  };

  canvas.addEventListener('pointerdown', (e) => {
    const g = getGame();
    if (!g.started || drag) return;
    const p = toWorld(e);
    const L = g.level;

    // On cherche l'objet le plus proche du doigt (zones généreuses).
    let best = null;
    const consider = (score, make) => {
      if (score < 1 && (!best || score < best.score)) best = { score, make };
    };
    for (const m of g.mirrors) {
      if (!m.free) continue;
      consider(dist(p, m) / 38, () => ({ type: 'mirror', mirror: m, last: null }));
    }
    consider(dist(p, sunPosition(g)) / 42, () => ({ type: 'sun', offset: g.sunAngle - sunAngleAt(g, p) }));
    const cdx = Math.abs(p.x - g.cloudX) / (L.cloud.w / 2 + 14);
    const cdy = Math.abs(p.y - L.cloud.y) / (L.cloud.h / 2 + 18);
    consider(Math.max(cdx, cdy) * 0.9, () => ({ type: 'cloud', offset: g.cloudX - p.x }));

    if (!best) return;
    drag = best.make();
    drag.id = e.pointerId;
    g.drag = drag;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const g = getGame();
    const p = toWorld(e);
    const L = g.level;

    if (drag.type === 'sun') {
      let a = sunAngleAt(g, p) + drag.offset;
      if (a < -Math.PI / 2) a += Math.PI * 2; // évite un saut sous l'horizon gauche
      g.sunAngle = clamp(a, rad(L.sun.min), rad(L.sun.max));
      g.touched.sun = true;
    } else if (drag.type === 'cloud') {
      g.cloudX = clamp(p.x + drag.offset, L.cloud.minX, L.cloud.maxX);
      g.touched.cloud = true;
    } else if (drag.type === 'mirror') {
      const m = drag.mirror;
      // Trop près du pivot, l'angle du doigt ne veut rien dire : on attend.
      if (dist(p, m) < 7) {
        drag.last = null;
        return;
      }
      const a = Math.atan2(p.y - m.y, p.x - m.x);
      if (drag.last !== null) {
        let d = a - drag.last;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        m.angle += d;
        g.touched.mirror = true;
        m.turned = true;
      }
      drag.last = a;
    }
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const g = getGame();
    if (drag.type === 'mirror') settleMirror(g, drag.mirror);
    drag = null;
    g.drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}
