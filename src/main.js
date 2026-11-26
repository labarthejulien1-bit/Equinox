// Point d'entrée du jeu : on assemble les morceaux et on lance la boucle.
//
// Le code est écrit pour tourner aussi SANS étape de construction : tous les
// imports sont relatifs et se terminent par .js, et la feuille de style est
// chargée par index.html. Un simple serveur de fichiers suffit donc à jouer.

import { chapters, levels, LEVELS_PER_CHAPTER } from './levels/index.js';
import { createGame, update } from './game/game.js';
import { createRenderer } from './game/render.js';
import { loadDone, markDone } from './game/progress.js';
import { attachInput } from './engine/input.js';
import { createUI } from './ui/ui.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);

// Derrière l'écran titre, on montre le premier niveau pas encore terminé.
let index = Math.max(
  0,
  levels.findIndex((l) => !loadDone().includes(l.id)),
);
let game = createGame(levels[index]);

/** Lance (ou relance) un niveau. */
function play(i) {
  index = i;
  game = createGame(levels[i]);
  game.started = true;
  renderer.resize(game.level);
}

const ui = createUI({
  chapters,
  perChapter: LEVELS_PER_CHAPTER,
  isDone: (id) => loadDone().includes(id),
  onRestart: () => play(index),
  onSelect: (level) => play(levels.indexOf(level)),
  onNext: () => play(Math.min(index + 1, levels.length - 1)),
});

attachInput(canvas, renderer.view, () => game, ui.touch);

const resize = () => renderer.resize(game.level);
window.addEventListener('resize', resize);
resize();

// La boucle de jeu : ~60 fois par seconde, on fait évoluer le monde puis on le dessine.
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // jamais plus de 50 ms d'un coup
  last = now;
  update(game, dt);
  if (game.events.includes('temple-lit')) markDone(game.level.id);
  game.events.length = 0;
  renderer.render(game);
  ui.update(game, index < levels.length - 1);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Pratique pour bricoler depuis la console du navigateur :
//   __equinox.game        l'état du niveau en cours
//   __equinox.play(2)     saute au niveau 3 (on compte à partir de 0)
window.__equinox = {
  get game() {
    return game;
  },
  play,
};

// Mode hors-ligne (PWA) : seulement sur le site publié, pas en développement
// ni dans l'application Android.
if (import.meta.env?.PROD && !window.Capacitor) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    } catch {
      // Certains contextes (aperçus intégrés) interdisent le service worker : tant pis.
    }
  });
}
