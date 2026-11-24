// Petites fonctions mathématiques utilisées partout dans le jeu.

export const TAU = Math.PI * 2;

/** Convertit des degrés en radians. */
export const rad = (deg) => (deg * Math.PI) / 180;

/** Borne une valeur entre min et max. */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Interpolation linéaire entre a et b (t entre 0 et 1). */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Courbe douce 0→1 (départ et arrivée en douceur). */
export const smooth = (t) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};

/** Distance entre deux points {x, y}. */
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Vrai si le point p est à l'intérieur du polygone (liste de points {x, y}). */
export function pointInPolygon(p, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Transforme [[x, y], ...] en [{x, y}, ...]. */
export const toPoints = (pairs) => pairs.map(([x, y]) => ({ x, y }));
