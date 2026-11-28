# Equinox — guide pour Claude

Jeu d'énigmes 2D en portrait pour Android (PWA d'abord, Capacitor ensuite).
Le propriétaire du projet débute en code : privilégier la lisibilité.

## Commandes

- `npm run dev` — serveur de développement (Vite)
- `npm run check` — vérifie chaque niveau (résoluble, sans raccourci ; décor
  bien posé : animaux sur le sol, eau souterraine dans la roche). À lancer
  après toute modification de `src/engine/`, `src/game/game.js` ou d'un niveau.
  Il vérifie aussi les trois objectifs secondaires de chaque niveau.
  Le tour complet prend environ cinq minutes ; `npm run check -- 7` ne
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
   un raccourci impossible, et la solution prévue de bout en bout. Lui donner
   aussi ses trois objectifs (`goals`) et leurs recettes (voir plus bas).
4. Si le niveau demande une règle nouvelle, l'ajouter dans `game.js` comme un
   type d'élément réutilisable, jamais comme un cas particulier du niveau.
5. Vérifier le rendu par captures d'écran (voir plus bas).

Si le niveau a de l'eau, elle doit venir de quelque chose de naturel et de
visible en surface : neige qui fond (un filet, `width` dans `streams`, ou un
goutte-à-goutte, `drips`), reste de glacier (`remnants`), source, lac. Les
veines et les nappes dessinées dans la roche (`veins`, `aquifers`) ont été
retirées partout sauf au niveau 1, à la demande du propriétaire : ne pas en
remettre sans qu'il le demande.

À partir du niveau 6, un sanctuaire a plusieurs cristaux (`temple.crystals`),
et chaque cristal ne doit être atteignable que par un seul miroir : le
vérifier dans le test, cristal par cristal.

Un faisceau a deux visages (`traceBeams` dans `engine/light.js`) : les règles
lisent ses 12 tranches (`slices`), le dessin suit son bout exact (`runs`),
calculé en visant chaque coin du relief. Un niveau n'a rien à faire pour ça.

Piège connu : deux cristaux côte à côte s'allument d'un seul reflet (un
faisceau est large comme son miroir). C'est arrivé au niveau 8, qui se
gagnait en plein jour avec un seul miroir. Écarter les cristaux et jouer sur
le relief : l'un visible seulement d'en bas, l'autre seulement de loin. Le
test le contrôle pour tous les niveaux (`checkNoInstantWin`) : au départ,
aucun miroir ne doit pouvoir allumer tout le sanctuaire à lui seul.

Autre piège : un cristal-mémoire (ou tout objet qui arrête la lumière) posé
entre un miroir et sa cible coupe le reflet. Au niveau 8, la lanterne de
l'autre rive est suspendue (`hang`) pour cette raison.

Piège connu : un miroir éclairé renvoie toujours un faisceau, même quand le
joueur n'y a pas touché. Choisir son angle de départ pour que ce faisceau ne
vienne pas faire fondre une glace utile (c'est arrivé au niveau 3).

## Architecture en une phrase

(Le film et les menus sont à part : voir plus bas.)

`main.js` fait tourner la boucle → `game.update()` calcule la lumière
(`engine/light.js`) puis applique les règles → `render.js` dessine la scène en
palette d'ombre, puis en palette de lumière dans les zones éclairées.

## L'histoire d'un chapitre : le film

Chaque chapitre s'ouvre par une **histoire** : un court film à regarder en
entier pour ouvrir ses niveaux. Seule celle du chapitre I existe : « Il y a
mille ans », 30 secondes, la capitale des anciens à son âge d'or, puis
éteinte, puis mille ans de neige, et le petit peuple qui s'installe dans ses
ruines. Elle est dessinée par le jeu (aucun fichier vidéo) et vit dans
`src/film/`. Huit phrases courtes l'accompagnent, chacune dans un petit
encart posé sur l'image ; une barre d'avancement court en bas de l'écran.

- `film.js` — le **déroulé** : `filmState(t)` dit où en est chaque chose à
  l'instant t (entre 0 et 1), `CAPTIONS` liste ses phrases et `CUES` ses sons
  brefs. Il ne touche pas au DOM : `npm run check` le fait défiler
  (`npm run check -- film`).
- Les phrases ont le ton d'une légende : une cité éternelle qui s'est
  éteinte. Elles gardent le suspense : ni ce que sont devenus les anciens,
  ni pourquoi ils ont tout éteint (c'est la révélation du dernier temple).
  Les garder courtes (le test refuse plus de 56 caractères, ou trop peu de
  temps pour lire).
- Chaque phrase a sa place sur l'image (`[x, y]` dans `CAPTIONS`, en
  centièmes de l'écran), choisie pour ne pas cacher ce qui se passe à ce
  moment. L'encart et la barre sont en HTML (`#film-text`, `#film-bar`, mis
  à jour par `ui.film()`) ; l'image du film occupe tout l'écran.
- `filmDraw.js` — le **dessin**, d'après cet état. Il ne connaît aucune
  date : pour changer le moment d'une chose, c'est dans `film.js`.
- Une histoire se déclare dans son chapitre (`story` dans
  `levels/index.js`) ; `progress.js` retient celles qui ont été vues
  (`storySeen`). Ne jamais changer l'`id` d'une histoire publiée. Décision du
  propriétaire : on ne peut pas passer une histoire ; on la revoit depuis sa
  bannière, dans « Le voyage ».
- Pour l'histoire d'un autre chapitre : il faudra un deuxième film. Le code
  n'en connaît qu'un (`playFilm` dans `main.js` joue toujours celui-ci).
- La ville du film est celle du dernier chapitre (VI) : le dernier temple
  devra retrouver ce cadrage.
- Pour le regarder à un instant donné : `__equinox.playFilm(20)`.

## Les menus

Le principe : **jouer en un toucher**, et tout garder à portée de pouce.
Tout est dans `src/ui/ui.js`, `index.html` et `style.css`.

- **L'accueil** (`#title`) : un seul grand bouton, qui mène toujours à la
  prochaine chose à faire (« Regarder l'histoire », « Commencer »,
  « Continuer »). Derrière lui, le niveau où l'on en est ; pour un nouveau
  joueur, l'affiche du film, vivante (`posterOn` dans `main.js`).
- **Le voyage** (`#voyage`) : les six chapitres en ronds, puis la bannière
  de l'histoire, large comme deux niveaux, puis les dix niveaux en
  vignettes. Tant que l'histoire n'est pas vue, les niveaux sont fermés.
- **Les volets** (`.sheet`) montent du bas de l'écran : la pause
  (objectifs, puis cinq actions) et la fin d'un niveau (le souvenir, puis
  le niveau suivant déjà prêt). En jeu, il n'y a qu'un bouton : pause.
- **Les vignettes** (`src/ui/thumbs.js`) sont dessinées par le jeu lui-même,
  hors de l'écran, une fois : il n'y a aucun fichier image à tenir à jour.

## L'onde du réveil

À la victoire, un cercle d'or part du sanctuaire et réveille le monde de
proche en proche (`g.wave` dans `game.js`, dessinée par `drawWake` dans
`render.js`). Un niveau n'a rien à faire pour ça.

- Tout ce qui doit réagir au réveil demande `wokenFor(g, x, y)` : le nombre
  de secondes depuis que l'onde est passée à cet endroit (0 : pas encore).
  Ne plus se servir de `g.win.t` pour ça, sinon l'élément se réveille avant
  que l'onde l'ait touché.
- Une machine nouvelle s'ajoute à `machineSpots(g)` : elle aura son éclat,
  sa note et son anneau d'or.
- Pendant le passage de l'onde, `render.js` dessine la scène deux fois
  (gelée, puis dégelée à l'intérieur du cercle) : ne rien y dessiner de
  coûteux qui dépende du hasard d'une image à l'autre.

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

## Objectifs secondaires et médailles

Chaque niveau a une liste `goals` de trois objectifs, du plus simple au plus
fin (médailles de cuivre, d'argent, d'or). Ils sont **à côté de l'énigme** :
`src/game/goals.js` ne fait que regarder le jeu, comme `life.js`.

- Un objectif : `{ id, type, title, text }` (+ réglages du type). `type`
  choisit un test de `goals.js` ; `title` est annoncé quand la médaille est
  gagnée, `text` est la consigne affichée dans le menu.
- Ne jamais changer un `id` publié : c'est lui qui retient la médaille sur
  l'appareil du joueur (`progress.js`).
- Chaque objectif a sa recette dans `scripts/goal-recipes.mjs`. `npm run
  check` la rejoue et vérifie aussi que l'objectif ne se gagne pas sans rien
  faire. `npm run check -- 6 goals` ne vérifie que les objectifs du niveau 6.
- Pour un objectif d'un genre nouveau : ajouter son test dans `TESTS`
  (`goals.js`) ; s'il a besoin de savoir pourquoi un animal a réagi, le noter
  dans `life.js` (comme `alarmBy`, `fledBy`, `shookBy`).
- Choisir des objectifs visibles à l'écran, et vérifier qu'ils ne sont pas
  déjà remplis au début du niveau (marmottes déjà au soleil, etc.).

L'interface (volet de pause, réglages, pastilles, annonce) est dans
`src/ui/ui.js` ; les réglages sont gardés par `src/ui/settings.js`.

## Ajouter un décor

Les petits décors (animaux, cairns, buissons…) vivent dans
`src/game/decor.js` : une fonction de dessin par type, enregistrée dans
`DRAW`. Un niveau les pose dans sa liste `decor`. Ils ne bloquent pas la
lumière ; s'il faut qu'un élément fasse de l'ombre, c'est un élément de jeu et
il va dans `game.js`. Les décors retenus pour chaque milieu sont listés dans
`docs/GAME_DESIGN.md` (§ 5 ter).

## Vérifier un changement visuel

Chromium et Playwright sont disponibles dans les sessions cloud. Lancer
`npm run dev`, ouvrir la page en 412 × 892, choisir le
niveau avec `window.__equinox.play(i)` (i compté à partir de 0), puis piloter
l'état via `window.__equinox.game` (par ex. `sunAngle`, `cloudX`,
`mirrors[0].angle`) et faire des captures d'écran.

## Branches

Le travail se fait sur la branche de la session. `main` est la branche
publiée : chaque mise à jour de `main` redéploie la démo sur GitHub Pages.
