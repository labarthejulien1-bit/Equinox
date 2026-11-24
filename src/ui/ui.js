// Interface : écran titre, indice en bas d'écran, carte « souvenir ».
// Tout est en HTML/CSS par-dessus le canvas (voir index.html et style.css).

const $ = (id) => document.getElementById(id);

export function createUI({ onStart, onRestart }) {
  const title = $('title');
  const hud = $('hud');
  const hint = $('hint');
  const memory = $('memory');
  let currentHint = null;
  let memoryShown = false;

  $('start').addEventListener('click', () => {
    title.classList.add('hidden');
    hud.classList.remove('hidden');
    onStart();
  });

  const restart = () => {
    memory.classList.add('hidden');
    memoryShown = false;
    currentHint = null;
    onRestart();
  };
  $('restart').addEventListener('click', restart);
  $('replay').addEventListener('click', restart);
  $('contemplate').addEventListener('click', () => memory.classList.add('hidden'));

  /** Appelée à chaque image : met à jour l'indice et affiche le souvenir. */
  function update(g) {
    $('level-name').textContent = g.level.title;

    const text = g.started ? g.level.hint(g) : '';
    if (text !== currentHint) {
      currentHint = text;
      hint.classList.remove('visible');
      // Petit fondu : on change le texte une fois l'ancien disparu.
      setTimeout(() => {
        if (currentHint !== text) return;
        hint.textContent = text;
        if (text) hint.classList.add('visible');
      }, 350);
    }

    if (g.temple.lit && g.win.t > 5.5 && !memoryShown) {
      memoryShown = true;
      const m = g.level.memory;
      $('memory-number').textContent = `Souvenir ${m.number}`;
      $('memory-title').textContent = m.title;
      $('memory-text').textContent = m.text;
      $('memory-tech').textContent = m.tech;
      memory.classList.remove('hidden');
    }
  }

  return { update };
}
