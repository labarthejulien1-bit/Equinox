// Curseurs du bas de l'écran : une seconde façon de déplacer le soleil et le
// nuage, pensée pour jouer d'une seule main, au pouce.
//
// Chaque bulle glisse sur une ligne invisible qui traverse tout l'écran :
// toute la largeur de l'écran = toute la course de l'objet, pour un maximum
// de précision. La position d'une bulle reflète toujours celle de son objet.
//
// Ici, exceptionnellement, on travaille en pixels d'écran (et non en unités
// monde) : ces curseurs sont de l'interface, pas des objets du décor.

import { rad, clamp } from '../engine/vec.js';

export const SLIDER = {
  r: 20, // rayon d'une bulle
  margin: 8, // espace entre la bulle et le bord de l'écran, en bout de course
  sunY: 88, // hauteur de la ligne du soleil, depuis le bas de l'écran
  cloudY: 40, // hauteur de la ligne du nuage
  railY: 136, // hauteur de la ligne du miroir sur rail, quand il y a aussi un nuage
};

/** Le miroir sur rail du niveau, s'il y en a un (et s'il est libre). */
const railMirror = (g) => g.mirrors.find((m) => m.rail && m.free);

/** Début et fin de la course d'une bulle, en pixels. */
function track(view) {
  const x0 = SLIDER.margin + SLIDER.r;
  return { x0, x1: Math.max(x0 + 1, view.w - x0) };
}

/** De 0 (objet tout à gauche) à 1 (tout à droite). */
function position(type, g) {
  const L = g.level;
  if (type === 'sun') {
    const max = rad(L.sun.max);
    return (max - g.sunAngle) / (max - rad(L.sun.min));
  }
  if (type === 'rail') return railMirror(g).t;
  return (g.cloudX - L.cloud.minX) / (L.cloud.maxX - L.cloud.minX);
}

/** Les bulles à afficher : [{ type, x, y, r }] en pixels d'écran. */
export function sliderBubbles(g, view) {
  const { x0, x1 } = track(view);
  const types = ['sun'];
  if (g.level.cloud) types.push('cloud');
  if (railMirror(g)) types.push('rail');
  // Le rail prend la ligne du nuage quand il n'y a pas de nuage.
  const lineOf = { sun: SLIDER.sunY, cloud: SLIDER.cloudY, rail: g.level.cloud ? SLIDER.railY : SLIDER.cloudY };
  return types.map((type) => ({
    type,
    x: x0 + position(type, g) * (x1 - x0),
    y: view.h - lineOf[type],
    r: SLIDER.r,
  }));
}

/** Place l'objet d'après la position x (en pixels) de sa bulle. */
export function moveSlider(type, g, view, x) {
  const { x0, x1 } = track(view);
  const k = clamp((x - x0) / (x1 - x0), 0, 1);
  const L = g.level;
  if (type === 'sun') {
    const max = rad(L.sun.max);
    g.sunAngle = max - k * (max - rad(L.sun.min));
    g.touched.sun = true;
  } else if (type === 'rail') {
    railMirror(g).t = k;
    g.touched.rail = true;
  } else {
    g.cloudX = L.cloud.minX + k * (L.cloud.maxX - L.cloud.minX);
    g.touched.cloud = true;
  }
}
