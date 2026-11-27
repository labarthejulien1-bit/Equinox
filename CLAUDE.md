# Equinox — guide pour Claude

Jeu d'énigmes 2D en portrait pour Android (PWA d'abord, Capacitor ensuite).
Le propriétaire du projet débute en code : privilégier la lisibilité.

## Commandes

- `npm run dev` — serveur de développement (Vite)
- `npm run check` — vérifie chaque niveau (résoluble, sans raccourci ; décor
  bien posé : animaux sur le sol, eau souterraine dans la roche). À lancer
  après toute modification de `src/engine/`, `src/game/game.js` ou d'un niveau.
  Le tour complet prend environ trois minutes ; `npm run check -- 7` ne
  vérifie que le niveau 7.
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

## Ajouter un niveau

1. Créer `src/levels/levelN.js` en copiant le niveau le plus proche ; il ne
   contient que des listes d'éléments (voir le tableau « Les briques d'un
   niveau » du README) et sa fonction `hint(g)`. Le relief s'écrit en
   tronçons nommés avec `terrain()` (`src/levels/terrain.js`). Son plan
   (relief, places des éléments) a été choisi : voir le tableau des plans
   dans `docs/GAME_DESIGN.md` (§ 9) ; il doit ressembler à un vrai paysage et
   occuper toute la hauteur de l'écran.
2. L'ajouter à son chapitre dans `src/levels/index.js` (et retirer son titre
   de la liste `soon`).
3. Écrire sa fonction `checkLevelN` dans `scripts/check-level.mjs` : au moins
   un raccourci impossible, et la solution prévue de bout en bout.
4. Si le niveau demande une règle nouvelle, l'ajouter dans `game.js` comme un
   type d'élément réutilisable, jamais comme un cas particulier du niveau.
5. Vérifier le rendu par captures d'écran (voir plus bas).

Si le niveau a de l'eau, on doit voir d'où elle vient et où elle repart :
`veins` et `aquifers` (`src/game/underground.js`) la dessinent en coupe dans
la roche, comme au niveau 1.

À partir du niveau 6, un sanctuaire a plusieurs cristaux (`temple.crystals`),
et chaque cristal ne doit être atteignable que par un seul miroir : le
vérifier dans le test, cristal par cristal.

Un faisceau a deux visages (`traceBeams` dans `engine/light.js`) : les règles
lisent ses 12 tranches (`slices`), le dessin suit son bout exact (`runs`),
calculé en visant chaque coin du relief. Un niveau n'a rien à faire pour ça.

Piège connu : un miroir éclairé renvoie toujours un faisceau, même quand le
joueur n'y a pas touché. Choisir son angle de départ pour que ce faisceau ne
vienne pas faire fondre une glace utile (c'est arrivé au niveau 3).

## Architecture en une phrase

`main.js` fait tourner la boucle → `game.update()` calcule la lumière
(`engine/light.js`) puis applique les règles → `render.js` dessine la scène en
palette d'ombre, puis en palette de lumière dans les zones éclairées.

## Références

- `docs/GAME_DESIGN.md` — univers, système d'éléments, design des temples et
  du peuple, idées de niveaux. À consulter avant d'inventer du contenu.
- `README.md` — installation, publication PWA, étape Capacitor.

## La vie du monde et le son

`src/game/life.js` fait vivre ce qui entoure l'énigme : animaux, vent,
villageois, empreintes, fleurs. Il ne fait que **regarder** le jeu (où tombe
la lumière, ce que fait le joueur) et ne doit jamais le modifier : rien de ce
qui vit ne bloque la lumière ni ne compte pour gagner. Il est appelé par
`main.js` après `update()`, pas par `game.js`. Comme `game.js`, il ne touche
pas au DOM : `npm run check` le fait tourner une journée dans chaque niveau,
pour s'assurer que rien ne casse.

- Ce que fait un animal se décide dans `life.js` (une fonction `update…` par
  espèce) ; comment il se dessine, dans `decor.js`, qui reçoit son état `k`.
- Le reste se dessine dans `lifeDraw.js`.
- Ses réglages sont dans le décor du niveau (`path`, `range`, `perch`, `to`…),
  listés en tête de `decor.js`. Le niveau 1 sert de modèle.
- Un animal a besoin d'un endroit où vivre : chemin du bouquetin sur des
  pentes de moins de 70°, avec si possible un replat (`'rest'`) ; terriers et
  lièvre sur des pentes douces. Poser chaque point exactement sur le sol
  (les sommets du relief conviennent) : le test le vérifie.
- Le son est dans `src/engine/audio.js`, sans fichier audio : les nappes
  suivent l'état du monde dans `update()`, les sons brefs répondent aux
  événements de `g.events` dans `event()`. Pour un son nouveau : pousser un
  nom dans `g.events`, puis l'ajouter à `SOUNDS`.
- Le son ne peut pas être vérifié à l'oreille dans une session cloud : le
  dire au propriétaire, et vérifier au moins le volume (`__equinox.audio.level()`).

## Ajouter un décor

Les petits décors (animaux, cairns, buissons…) vivent dans
`src/game/decor.js` : une fonction de dessin par type, enregistrée dans
`DRAW`. Un niveau les pose dans sa liste `decor`. Ils ne bloquent pas la
lumière ; s'il faut qu'un élément fasse de l'ombre, c'est un élément de jeu et
il va dans `game.js`. Les décors retenus pour chaque milieu sont listés dans
`docs/GAME_DESIGN.md` (§ 5 ter).

## Vérifier un changement visuel

Chromium et Playwright sont disponibles dans les sessions cloud. Lancer
`npm run dev`, ouvrir la page en 412 × 892, cliquer `#start`, choisir le
niveau avec `window.__equinox.play(i)` (i compté à partir de 0), puis piloter
l'état via `window.__equinox.game` (par ex. `sunAngle`, `cloudX`,
`mirrors[0].angle`) et faire des captures d'écran.

## Branches

Le travail se fait sur la branche de la session. `main` est la branche
publiée : chaque mise à jour de `main` redéploie la démo sur GitHub Pages.
