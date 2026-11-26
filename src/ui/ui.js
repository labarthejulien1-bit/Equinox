// Interface : écran titre, choix du chapitre et du niveau, indice en bas
// d'écran, carte « souvenir ».
// Tout est en HTML/CSS par-dessus le canvas (voir index.html et style.css).

const $ = (id) => document.getElementById(id);

/** Fabrique une ligne de liste : numéro, nom (et sous-titre), marque à droite. */
function row({ num, name, sub, mark, done, disabled, onClick }) {
  const b = document.createElement('button');
  if (done) b.className = 'done';
  b.disabled = !!disabled;
  const n = document.createElement('span');
  n.className = 'num';
  n.textContent = num;
  const t = document.createElement('span');
  t.className = 'name';
  t.textContent = name;
  if (sub) {
    const s = document.createElement('small');
    s.textContent = sub;
    t.append(s);
  }
  const m = document.createElement('span');
  m.className = 'mark';
  m.textContent = mark;
  b.append(n, t, m);
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

/**
 * @param chapters  les chapitres du jeu (voir levels/index.js)
 * @param perChapter nombre de niveaux qu'aura chaque chapitre
 * @param isDone    (id) => vrai si ce niveau est terminé
 * @param onSelect  (level) => lance ce niveau
 */
export function createUI({ chapters, perChapter, isDone, onRestart, onSelect, onNext }) {
  const title = $('title');
  const hud = $('hud');
  const hint = $('hint');
  const memory = $('memory');
  const chapterMenu = $('chapters');
  const levelMenu = $('levels');
  let currentHint = null;
  let memoryShown = false;
  let currentGame = null;
  let playing = false; // devient vrai quand un premier niveau a été lancé

  const hide = (el) => el.classList.add('hidden');
  const show = (el) => el.classList.remove('hidden');

  /** À appeler quand un niveau démarre (ou redémarre). */
  function reset() {
    hide(memory);
    hide(chapterMenu);
    hide(levelMenu);
    memoryShown = false;
    currentHint = null;
    hint.classList.remove('visible');
  }

  // ── Choix du chapitre ──

  function openChapters() {
    const list = $('chapter-list');
    list.textContent = '';
    for (const chapter of chapters) {
      const done = chapter.levels.filter((l) => isDone(l.id)).length;
      const open = chapter.levels.length > 0;
      list.append(
        row({
          num: chapter.number,
          name: chapter.title,
          sub: chapter.place,
          mark: open ? `${done}/${perChapter}` : 'bientôt',
          done: open && done === perChapter,
          disabled: !open,
          onClick: () => openLevels(chapter),
        }),
      );
    }
    $('close-chapters').hidden = !playing; // au tout début, il faut choisir
    hide(levelMenu);
    show(chapterMenu);
  }

  // ── Choix du niveau, dans un chapitre ──

  function openLevels(chapter) {
    $('levels-chapter').textContent = `Chapitre ${chapter.number} · ${chapter.title}`;
    $('levels-place').textContent = chapter.place;
    const list = $('level-list');
    list.textContent = '';
    for (const level of chapter.levels) {
      list.append(
        row({
          num: level.number,
          name: level.title,
          mark: isDone(level.id) ? '✓' : '',
          done: isDone(level.id),
          onClick: () => {
            reset();
            hide(title);
            show(hud);
            playing = true;
            onSelect(level);
          },
        }),
      );
    }
    // Les niveaux déjà écrits mais pas encore construits
    chapter.soon.forEach((name, i) => {
      list.append(row({ num: String(chapter.levels.length + i + 1), name, mark: 'bientôt', disabled: true }));
    });
    $('close-levels').hidden = !playing;
    hide(chapterMenu);
    show(levelMenu);
  }

  const chapterOf = (level) => chapters.find((c) => c.levels.includes(level)) || chapters[0];

  $('start').addEventListener('click', () => {
    hide(title);
    openChapters();
  });
  $('open-levels').addEventListener('click', () => openLevels(chapterOf(currentGame.level)));
  $('back-chapters').addEventListener('click', openChapters);
  $('close-chapters').addEventListener('click', () => hide(chapterMenu));
  $('close-levels').addEventListener('click', () => hide(levelMenu));

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
  $('contemplate').addEventListener('click', () => hide(memory));

  /** Appelée à chaque image : met à jour l'indice et affiche le souvenir. */
  function update(g, hasNext) {
    // Nouveau niveau (ou niveau relancé) : on repart d'une interface propre.
    if (g !== currentGame) {
      const first = currentGame === null;
      currentGame = g;
      if (!first) reset();
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
      show(memory);
    }
  }

  /**
   * Appelée à chaque appui sur le jeu. L'indice est écrit par-dessus les
   * bulles du bas de l'écran : si le doigt se pose dessus, il s'efface (il
   * reviendra quand il aura autre chose à dire).
   */
  function touch(x, y) {
    if (!hint.classList.contains('visible')) return;
    const r = hint.getBoundingClientRect();
    if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 12 && y <= r.bottom + 12) hint.classList.remove('visible');
  }

  return { update, touch };
}
