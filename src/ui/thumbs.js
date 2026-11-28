// Les vignettes des menus : une petite image de chaque niveau, et l'affiche
// de l'histoire. Elles sont dessinées par le jeu lui-même (aucun fichier
// image), une fois, hors de l'écran, puis gardées en mémoire.
//
// Comme un niveau met quelques millisecondes à se dessiner, on les prépare
// l'une après l'autre, entre deux images du jeu : l'écran qui les attend
// les reçoit dès qu'elles sont prêtes.

import { createGame, update } from '../game/game.js';
import { createLife, updateLife } from '../game/life.js';
import { createRenderer } from '../game/render.js';
import { createFilmRenderer } from '../film/filmDraw.js';
import { rad } from '../engine/vec.js';

// Taille d'une vignette de niveau (en pixels CSS) : la scène de référence, en petit.
const SIZE = { width: 180, height: 360 };
const POSTER_AT = 3; // l'instant du film qui sert d'affiche (l'âge d'or)

export function createThumbs() {
  const ready = new Map(); // clé → adresse de l'image
  const waiting = new Map(); // clé → [éléments qui l'attendent]
  const jobs = []; // ce qu'il reste à dessiner : [clé, fonction]
  let busy = false;
  let levelRenderer = null;
  let levelCanvas = null;

  /** Dessine un niveau en plein jour, sans repères ni interface. */
  function drawLevel(level) {
    if (!levelRenderer) {
      levelCanvas = document.createElement('canvas');
      levelRenderer = createRenderer(levelCanvas);
    }
    const g = createGame(level);
    createLife(g);
    g.sunAngle = rad((level.sun.min + level.sun.max) / 2); // le soleil au milieu de sa course
    for (let i = 0; i < 12; i++) {
      update(g, 1 / 30);
      updateLife(g, 1 / 30);
    }
    levelRenderer.resize(level, SIZE);
    levelRenderer.render(g);
    return levelCanvas.toDataURL('image/jpeg', 0.82);
  }

  /** Dessine l'affiche de l'histoire : une image du film. */
  function drawPoster() {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1560;
    createFilmRenderer(canvas).draw({ t: POSTER_AT });
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  const set = (el, url) => el.style.setProperty('--thumb', `url(${url})`);

  /** Dessine la vignette suivante, puis laisse le jeu respirer avant la prochaine. */
  function work() {
    const job = jobs.shift();
    if (!job) {
      busy = false;
      return;
    }
    const [key, make] = job;
    try {
      const url = make();
      ready.set(key, url);
      for (const el of waiting.get(key) || []) set(el, url);
    } catch {
      // une vignette en moins : le menu reste utilisable, sans son image
    }
    waiting.delete(key);
    setTimeout(work, 30);
  }

  /** Donne à `el` l'image `key` (dans sa variable CSS --thumb), tout de suite ou dès qu'elle est prête. */
  function apply(el, key, make) {
    if (ready.has(key)) return set(el, ready.get(key));
    if (!waiting.has(key)) {
      waiting.set(key, []);
      jobs.push([key, make]);
    }
    waiting.get(key).push(el);
    if (!busy) {
      busy = true;
      setTimeout(work, 0);
    }
  }

  return {
    level: (el, level) => apply(el, 'level-' + level.id, () => drawLevel(level)),
    story: (el, story) => apply(el, 'story-' + story.id, drawPoster),
  };
}
