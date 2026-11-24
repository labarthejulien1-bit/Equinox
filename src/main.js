// Point d'entrée du jeu : on assemble les morceaux et on lance la boucle.

import './style.css';
import level1 from './levels/level1.js';
import { createGame, update } from './game/game.js';
import { createRenderer } from './game/render.js';
import { attachInput } from './engine/input.js';
import { createUI } from './ui/ui.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);

let game = createGame(level1);

const ui = createUI({
  onStart: () => {
    game.started = true;
  },
  onRestart: () => {
    game = createGame(level1);
    game.started = true;
  },
});

attachInput(canvas, renderer.view, () => game);

const resize = () => renderer.resize(game.level);
window.addEventListener('resize', resize);
resize();

// La boucle de jeu : ~60 fois par seconde, on fait évoluer le monde puis on le dessine.
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // jamais plus de 50 ms d'un coup
  last = now;
  update(game, dt);
  renderer.render(game);
  ui.update(game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Pratique pour bricoler depuis la console du navigateur : __equinox.game
window.__equinox = {
  get game() {
    return game;
  },
};

// Mode hors-ligne (PWA) : seulement sur le site publié, pas en développement
// ni dans l'application Android.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !window.Capacitor) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
