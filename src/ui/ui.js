// Interface : écran titre, indice en bas d'écran, choix du niveau, carte « souvenir ».
// Tout est en HTML/CSS par-dessus le canvas (voir index.html et style.css).

const $ = (id) => document.getElementById(id);

export function createUI({ levels, isDone, onStart, onRestart, onSelect, onNext }) {
  const title = $('title');
  const hud = $('hud');
  const hint = $('hint');
  const memory = $('memory');
  const menu = $('levels');
  let currentHint = null;
  let memoryShown = false;
  let currentGame = null;

  const hideMemory = () => memory.classList.add('hidden');

  /** À appeler quand un niveau démarre (ou redémarre). */
  function reset() {
    hideMemory();
    menu.classList.add('hidden');
    memoryShown = false;
    currentHint = null;
    hint.classList.remove('visible');
  }

  $('start').addEventListener('click', () => {
    title.classList.add('hidden');
    hud.classList.remove('hidden');
    onStart();
  });
  $('restart').addEventListener('click', () => {
    reset();
    onRestart();
  });
  $('replay').addEventListener('click', () => {
    reset();
    onRestart();
  });
  $('next').addEventListener('click', () => {
    reset();
    onNext();
  });
  $('contemplate').addEventListener('click', hideMemory);

  // Choix du niveau
  $('open-levels').addEventListener('click', () => {
    const list = $('level-list');
    list.textContent = '';
    levels.forEach((level, i) => {
      const b = document.createElement('button');
      b.className = isDone(level.id) ? 'done' : '';
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = level.number;
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = level.title;
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.textContent = isDone(level.id) ? '✓' : '';
      b.append(num, name, mark);
      b.addEventListener('click', () => {
        reset();
        onSelect(i);
      });
      list.append(b);
    });
    menu.classList.remove('hidden');
  });
  $('close-levels').addEventListener('click', () => menu.classList.add('hidden'));

  /** Appelée à chaque image : met à jour l'indice et affiche le souvenir. */
  function update(g, hasNext) {
    // Nouveau niveau (ou niveau relancé) : on repart d'une interface propre.
    if (g !== currentGame) {
      currentGame = g;
      reset();
    }
    $('level-name').textContent = `${g.level.number} · ${g.level.title}`;

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
      $('next').hidden = !hasNext;
      $('replay').hidden = hasNext;
      $('memory-end').hidden = hasNext;
      memory.classList.remove('hidden');
    }
  }

  return { update };
}
