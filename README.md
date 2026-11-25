# Equinox

Un jeu d'énigmes d'ombre et de lumière, en portrait, pour téléphone.
Déplace le soleil, écarte les nuages, oriente les miroirs — et rallume les
temples d'une civilisation solaire oubliée sous la glace.

![Aperçu du niveau 1](docs/images/apercu.jpg)

**État actuel : v0.2** — quatre niveaux jouables de bout en bout :

| | Niveau | Ce qu'on y apprend |
| --- | --- | --- |
| I | Le glacier suspendu | La lumière réchauffe ; les miroirs la guident |
| II | Le rideau d'eau | L'ombre gèle l'eau calme : elle devient un outil |
| III | La digue de glace | L'ombre du relief retient l'eau et la fait monter |
| IV | Le pont de givre | Le petit peuple agit quand le monde le lui permet |

La progression est gardée sur l'appareil. Le bouton ☰ permet de choisir un
niveau (tous sont ouverts pour l'instant, pour faciliter les tests).

## Technologies

| Besoin | Choix | Pourquoi |
| --- | --- | --- |
| Langage | JavaScript moderne (modules ES) | Simple à lire, aucun outil exotique |
| Dessin | Canvas 2D, sans moteur de jeu | Les ombres nettes sont du calcul géométrique sur mesure ; un moteur n'apporterait rien |
| Outil de dev | [Vite](https://vite.dev) | Rechargement instantané, build en un clic |
| Démo | PWA (manifeste + service worker) | S'installe sur le téléphone depuis le navigateur, marche hors-ligne |
| Android (étape 2) | [Capacitor](https://capacitorjs.com) | Emballe le même code en APK / AAB |

Le jeu complet pèse environ 30 Ko.

## Lancer le jeu sur son ordinateur

Il faut [Node.js](https://nodejs.org) (version 20 ou plus).

```bash
npm install     # une seule fois
npm run dev     # lance le jeu
```

Le terminal affiche deux adresses :

- `Local` — à ouvrir dans le navigateur de l'ordinateur ;
- `Network` — à ouvrir sur le téléphone, s'il est sur le même Wi-Fi.

Chaque modification d'un fichier recharge le jeu tout seul.

Autres commandes :

```bash
npm run check   # vérifie que chaque niveau est résoluble, sans raccourci
npm run build   # fabrique la version finale dans dist/
npm run preview # sert dist/ pour tester la version finale
```

## Tester la démo PWA sur son téléphone

Le dépôt contient une recette de publication automatique vers GitHub Pages
(`.github/workflows/deploy.yml`). Pour l'activer, une seule fois :

1. Sur GitHub : **Settings → Pages → Source : « GitHub Actions »**.
2. Avoir le code sur la branche `main` (la publication se lance à chaque mise
   à jour de `main`, ou à la main depuis l'onglet **Actions**).
3. Ouvrir sur le téléphone : `https://labarthejulien1-bit.github.io/Equinox/`
4. Dans Chrome : menu **⋮ → Ajouter à l'écran d'accueil**. Le jeu se lance
   alors en plein écran, comme une application, même sans réseau.

> GitHub Pages est gratuit pour les dépôts publics. Pour un dépôt privé, il
> faut un abonnement GitHub payant — ou une alternative gratuite comme
> Netlify ou Cloudflare Pages (il suffit d'y déposer le dossier `dist/`).

## Organisation du code

```
index.html              page unique : canvas + interface
src/
  main.js               point d'entrée : boucle de jeu
  style.css             mise en page, écran titre, carte souvenir
  engine/               briques réutilisables d'un niveau à l'autre
    light.js            ★ rayons, zones éclairées, reflets des miroirs
    input.js            gestes tactiles (soleil, nuage, miroirs, bulles)
    vec.js              petites fonctions mathématiques
  game/
    game.js             ★ règles : la glace fond, l'eau gèle, la porte s'ouvre…
    render.js           ★ dessin : palette d'ombre + palette de lumière
    palette.js          toutes les couleurs (ère glaciaire → dégel)
    progress.js         niveaux terminés, gardés sur l'appareil
    sliders.js          bulles du bas de l'écran (soleil et nuage au pouce)
  levels/
    index.js            la liste des niveaux, dans l'ordre
    level1.js … level4.js   un fichier par niveau : formes, positions, textes
  ui/ui.js              écran titre, indices, choix du niveau, souvenir
public/                 icône, manifeste PWA, service worker
scripts/check-level.mjs test automatique de tous les niveaux
docs/GAME_DESIGN.md     le document de conception du jeu
```

Pour comprendre le jeu, lis dans l'ordre : `levels/level1.js` (ce qu'il y a
dans la scène), `game/game.js` (comment ça réagit), `engine/light.js`
(comment la lumière se propage).

### Les briques d'un niveau

Un niveau est une liste d'éléments ; les règles sont les mêmes partout.

| Dans le fichier du niveau | Ce que c'est | Sa règle |
| --- | --- | --- |
| `sun`, `cloud` | soleil sur son arc, nuage sur son rail (facultatif) | déplacés par le joueur |
| `ground`, `snow`, `caves` | le relief | bloque la lumière |
| `mirrors` | miroirs (sur mât, pris dans la glace, sur radeau, portés) | renvoient la lumière |
| `ices` | glaciers | fondent à la lumière, une fois pour toutes |
| `frosts` | eaux calmes : source, digue, pont | gèlent à l'ombre, dégèlent à la lumière |
| `streams` | cours d'eau (tronçons qui coulent ou qui tombent) | coulent si leur source est ouverte ; une cascade peut arrêter la lumière |
| `basins` | bassins | se remplissent quand leur digue est gelée |
| `wheels`, `doors` | roues à eau, portes de pierre | l'eau fait tourner la roue, qui ouvre la porte |
| `walkers` | porteurs | avancent tant que le chemin les porte, puis posent leur miroir |
| `temple` | le temple et son cristal | s'allume quand le cristal reçoit de la lumière |

## Comment marche la lumière

1. Tout ce qui bloque la lumière (sol, nuage, glace, maisons, miroirs) est
   décrit par des **segments**.
2. Depuis le soleil, on lance un rayon vers chaque extrémité de segment : les
   points touchés, reliés entre eux, forment la **zone éclairée**.
3. Un miroir éclairé renvoie un **faisceau** (loi de la réflexion), qui peut
   toucher un autre miroir, et ainsi de suite.
4. À l'écran, la scène est dessinée deux fois : en couleurs d'ombre partout,
   puis en couleurs de lumière uniquement dans les zones éclairées. La
   frontière nette entre les deux est la signature visuelle du jeu.

## Étape 2 : l'application Android (APK / AAB)

Rien n'est à réécrire : Capacitor emballe le dossier `dist/`.

```bash
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap init Equinox com.equinox.game --web-dir dist
npm run build
npx cap add android
npx cap sync
npx cap open android      # ouvre Android Studio → Build → APK ou Bundle (AAB)
```

Il faut [Android Studio](https://developer.android.com/studio) sur
l'ordinateur — ou bien une recette GitHub Actions qui fabrique l'APK dans le
cloud (à ajouter à l'étape 2).

## Travailler avec Claude Code

Le fichier `CLAUDE.md` explique le projet à Claude à chaque session. Exemples
de demandes qui marchent bien :

- « Ajoute un niveau 5 avec de la pluie, en suivant `docs/GAME_DESIGN.md`. »
- « Dans le niveau 1, rends le glacier deux fois plus long à fondre. »
- « Change la couleur de la neige dans l'ombre pour un bleu plus violet. »
