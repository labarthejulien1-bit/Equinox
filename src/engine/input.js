// Contrôles tactiles (et souris sur ordinateur).
//
// Tous les gestes sont des « glisser » :
//   - le soleil suit le doigt le long de son arc ;
//   - le nuage suit le doigt le long de son rail ;
//   - un miroir tourne quand le doigt tourne autour de lui ;
//   - un miroir sur rail suit le doigt le long de son rail ;
//   - en bas de l'écran, deux bulles permettent de déplacer le soleil et le
//     nuage au pouce, sans lever la main (voir game/sliders.js).

import { clamp, rad, dist } from './vec.js';
import { sunPosition, settleMirror, turnMirror } from '../game/game.js';
import { sliderBubbles, moveSlider } from '../game/sliders.js';

/**
 * @param onTouch appelée à chaque appui, avec la position du doigt dans la
 *                page (sert à l'interface, par exemple pour effacer l'indice)
 */
export function attachInput(canvas, view, getGame, onTouch = () => {}) {
  let drag = null;

  // Position du doigt en pixels, par rapport au coin du canvas.
  const toScreen = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  // Position du doigt en unités monde.
  const toWorld = (e) => {
    const s = toScreen(e);
    return { x: (s.x - view.ox) / view.scale, y: (s.y - view.oy) / view.scale };
  };

  // Angle du soleil correspondant à un point de l'écran.
  const sunAngleAt = (g, p) => {
    const s = g.level.sun;
    return Math.atan2((s.cy - p.y) / s.ry, (p.x - s.cx) / s.rx);
  };

  // Place sur un rail (de 0 à 1) du point le plus proche du doigt.
  const railAt = (rail, p) => {
    const dx = rail.x1 - rail.x0;
    const dy = rail.y1 - rail.y0;
    return ((p.x - rail.x0) * dx + (p.y - rail.y0) * dy) / (dx * dx + dy * dy);
  };

  canvas.addEventListener('pointerdown', (e) => {
    const g = getGame();
    if (!g.started || drag) return;
    onTouch(e.clientX, e.clientY);
    const L = g.level;

    // 1. Les bulles du bas de l'écran passent avant tout le reste.
    const s = toScreen(e);
    let grabbed = null;
    for (const b of sliderBubbles(g, view)) {
      const d = dist(s, b);
      if (d < b.r + 10 && (!grabbed || d < grabbed.d)) grabbed = { d, b };
    }

    // 2. Sinon, on cherche l'objet le plus proche du doigt (zones généreuses).
    let best = null;
    if (grabbed) {
      const b = grabbed.b;
      best = { make: () => ({ type: b.type, slider: true, offset: b.x - s.x }) };
    } else {
      const p = toWorld(e);
      const consider = (score, make) => {
        if (score < 1 && (!best || score < best.score)) best = { score, make };
      };
      for (const m of g.mirrors) {
        if (!m.free) continue;
        if (m.rail) consider(dist(p, m) / 38, () => ({ type: 'rail', mirror: m, offset: m.t - railAt(m.rail, p) }));
        else consider(dist(p, m) / 38, () => ({ type: 'mirror', mirror: m, last: null }));
      }
      consider(dist(p, sunPosition(g)) / 42, () => ({ type: 'sun', offset: g.sunAngle - sunAngleAt(g, p) }));
      if (L.cloud) {
        const cdx = Math.abs(p.x - g.cloudX) / (L.cloud.w / 2 + 14);
        const cdy = Math.abs(p.y - L.cloud.y) / (L.cloud.h / 2 + 18);
        consider(Math.max(cdx, cdy) * 0.9, () => ({ type: 'cloud', offset: g.cloudX - p.x }));
      }
    }

    if (!best) return;
    drag = best.make();
    drag.id = e.pointerId;
    drag.game = g;
    g.drag = drag;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const g = getGame();
    if (g !== drag.game) return; // le niveau a changé pendant le geste
    const L = g.level;

    if (drag.slider) {
      // La bulle suit le doigt sur sa ligne ; l'objet suit la bulle.
      moveSlider(drag.type, g, view, toScreen(e).x + drag.offset);
      return;
    }

    const p = toWorld(e);
    if (drag.type === 'sun') {
      let a = sunAngleAt(g, p) + drag.offset;
      if (a < -Math.PI / 2) a += Math.PI * 2; // évite un saut sous l'horizon gauche
      g.sunAngle = clamp(a, rad(L.sun.min), rad(L.sun.max));
      g.touched.sun = true;
    } else if (drag.type === 'cloud') {
      g.cloudX = clamp(p.x + drag.offset, L.cloud.minX, L.cloud.maxX);
      g.touched.cloud = true;
    } else if (drag.type === 'rail') {
      drag.mirror.t = clamp(railAt(drag.mirror.rail, p) + drag.offset, 0, 1);
      g.touched.rail = true;
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
        turnMirror(g, m, d); // (son jumeau, s'il en a un, tourne à l'envers)
        g.touched.mirror = true;
        m.turned = true;
      }
      drag.last = a;
    }
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const g = getGame();
    if (g === drag.game && drag.type === 'mirror') settleMirror(g, drag.mirror);
    drag.game.drag = null;
    drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}
