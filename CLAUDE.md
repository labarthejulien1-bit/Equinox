# Equinox — guide pour Claude

Jeu d'énigmes 2D en portrait pour Android (PWA d'abord, Capacitor ensuite).
Le propriétaire du projet débute en code : privilégier la lisibilité.

## Commandes

- `npm run dev` — serveur de développement (Vite)
- `npm run check` — vérifie le niveau 1 (résoluble, sans raccourci). À lancer
  après toute modification de `src/engine/`, `src/game/game.js` ou d'un niveau.
- `npm run build` — build de production dans `dist/`

## Conventions

- JavaScript moderne (modules ES), sans framework ni moteur de jeu, sans
  TypeScript. Pas de nouvelle dépendance sans raison forte.
- Commentaires, textes du jeu et documentation **en français** ; noms de
  variables et de fonctions en anglais.
- Coordonnées en « unités monde » : scène de référence 360 × 720, y vers le
  bas. Ne jamais raisonner en pixels en dehors de `render.js` (objet `view`).
- `src/engine/light.js` et `src/game/game.js` ne touchent jamais au DOM : ils
  doivent rester exécutables par Node (c'est ce que fait `npm run check`).
- Un niveau est un fichier de données dans `src/levels/` ; les règles vivent
  dans `game.js`. Pas de solution scriptée : les éléments réagissent à ce
  qu'ils reçoivent (lumière, eau…), c'est le principe « systémique » du jeu.
- Chaque couleur existe en version lumière et en version ombre
  (`src/game/palette.js`). Tout nouvel élément visuel doit avoir les deux.
- Chemins relatifs partout (`base: './'`) : le même build sert GitHub Pages et
  Capacitor.

## Architecture en une phrase

`main.js` fait tourner la boucle → `game.update()` calcule la lumière
(`engine/light.js`) puis applique les règles → `render.js` dessine la scène en
palette d'ombre, puis en palette de lumière dans les zones éclairées.

## Références

- `docs/GAME_DESIGN.md` — univers, système d'éléments, design des temples et
  du peuple, idées de niveaux. À consulter avant d'inventer du contenu.
- `README.md` — installation, publication PWA, étape Capacitor.

## Vérifier un changement visuel

Chromium et Playwright sont disponibles dans les sessions cloud. Lancer
`npm run dev`, ouvrir la page en 412 × 892, cliquer `#start`, puis piloter
l'état via `window.__equinox.game` (par ex. `sunAngle`, `cloudX`,
`mirrors[0].angle`) et faire des captures d'écran.
