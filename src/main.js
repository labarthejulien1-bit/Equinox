// Point d'entrée du jeu : on assemble les morceaux et on lance la boucle.
//
// Le code est écrit pour tourner aussi SANS étape de construction : tous les
// imports sont relatifs et se terminent par .js, et la feuille de style est
// chargée par index.html. Un simple serveur de fichiers suffit donc à jouer.

import { chapters, levels, LEVELS_PER_CHAPTER } from './levels/index.js';
import { createGame, update } from './game/game.js';
import { createLife, updateLife, tapLife } from './game/life.js';
import { createAudio } from './engine/audio.js';
import { createRenderer } from './game/render.js';
import { createGoals, updateGoals, MEDALS } from './game/goals.js';
import { loadDone, markDone, medalsOf, markMedal, resetProgress } from './game/progress.js';
import { loadSettings, saveSettings } from './ui/settings.js';
import { attachInput } from './engine/input.js';
import { createUI } from './ui/ui.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);

// Derrière l'écran titre, on montre le premier niveau pas encore terminé.
let index = Math.max(
  0,
  levels.findIndex((l) => !loadDone().includes(l.id)),
);
let game = null;

/** Fabrique le niveau i : son énigme, sa vie, ses objectifs. */
function build(i) {
  index = i;
  game = createGame(levels[i]);
  createLife(game); // animaux, vent, petit peuple : tout ce qui vit autour de l'énigme
  createGoals(game, medalsOf(game.level.id)); // les trois médailles du niveau
}
build(index);

/** Lance (ou relance) un niveau. */
function play(i) {
  build(i);
  game.started = true;
  renderer.resize(game.level);
}

// Le son : il ne peut démarrer qu'après un premier geste du joueur.
const settings = loadSettings();
const audio = createAudio();
audio.setVolume(settings.volume);
// (sur un téléphone, c'est le doigt qui se relève qui compte comme un geste)
for (const type of ['pointerdown', 'pointerup', 'click']) window.addEventListener(type, () => audio.unlock());

const ui = createUI({
  chapters,
  perChapter: LEVELS_PER_CHAPTER,
  isDone: (id) => loadDone().includes(id),
  // Les objectifs d'un niveau, avec leur médaille (gagnée ou non)
  goalsOf: (level) => (level.goals || []).map((def, i) => ({ def, medal: MEDALS[i], done: medalsOf(level.id).includes(def.id) })),
  settings,
  sound: audio,
  version: import.meta.env?.VITE_VERSION || '',
  onSettings: () => saveSettings(settings),
  onReset: () => {
    resetProgress();
    for (const goal of game.goals) goal.done = false;
  },
  onRestart: () => play(index),
  onSelect: (level) => play(levels.indexOf(level)),
  onNext: () => play(Math.min(index + 1, levels.length - 1)),
});

// Un simple toucher (sans glisser) dérange l'animal ou le villageois visé.
attachInput(canvas, renderer.view, () => game, ui.touch, (p) => tapLife(game, p));

const resize = () => renderer.resize(game.level);
window.addEventListener('resize', resize);
resize();

// La boucle de jeu : ~60 fois par seconde, on fait évoluer le monde puis on le dessine.
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // jamais plus de 50 ms d'un coup
  last = now;
  update(game, dt);
  updateLife(game, dt);
  if (game.events.includes('temple-lit')) markDone(game.level.id);
  // Un objectif secondaire vient d'être atteint : une médaille !
  for (const goal of updateGoals(game, dt)) {
    markMedal(game.level.id, goal.def.id);
    game.events.push('medal' + goal.index);
    ui.medal(goal);
  }
  for (const e of game.events) audio.event(e);
  game.events.length = 0;
  audio.update(game, dt);
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
  audio,
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
