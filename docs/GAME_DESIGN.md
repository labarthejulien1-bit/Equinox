# Equinox — document de conception

Ce document fixe la vision du jeu et propose des réponses aux points encore
ouverts. Ce qui est marqué ✅ existe déjà dans le code ; le reste est une
proposition à valider.

## 1. Le jeu en une phrase

Un puzzle contemplatif où l'on déplace le soleil pour que la lumière et
l'ombre transforment le paysage, jusqu'à rallumer un temple ancien.

- Genre : puzzle 2D, chill, systémique. Orientation portrait.
- Une partie = un niveau = une scène fixe = un temple à rallumer.
- Ni chrono, ni score, ni échec : on ne peut pas « perdre », seulement
  chercher.

## 2. Les trois piliers

1. **La lumière est le seul outil.** Le joueur ne touche jamais directement à
   l'eau, à la glace ou aux mécanismes : il déplace des sources de lumière et
   des obstacles, et le monde réagit.
2. **Rien n'est scripté.** Chaque élément suit une règle simple et locale. La
   solution est une réaction en chaîne que le joueur déclenche étape par
   étape ; plusieurs chemins peuvent mener au temple.
3. **L'ombre est aussi belle que la lumière.** La frontière nette entre les
   deux est la signature visuelle, et les deux moitiés du monde doivent donner
   envie d'être regardées.

## 3. Univers et récit

Un petit peuple vit dans un monde gelé. Il descend d'une civilisation qui
maîtrisait l'énergie solaire. Une ère glaciaire a coupé cette civilisation de
sa source ; avec les siècles, la technique est devenue un rite, puis un culte
du soleil dont plus personne ne comprend l'origine.

Chaque temple rallumé rend :

- un **souvenir** — un fragment de texte, à la manière d'une tradition orale ;
- une **technologie** — un nouvel objet de jeu pour les niveaux suivants ;
- un peu de **chaleur** — la palette glisse du blanc-bleu vers le vert et l'or.

| Monde | Ambiance | Technologie retrouvée | Souvenir |
| --- | --- | --- | --- |
| I. Les glaces | blanc, bleu nuit | ✅ l'héliostat (miroir orientable) | « Ils ne priaient pas le soleil : ils le guidaient. » |
| II. Le dégel | turquoise, premiers verts | la lentille (concentre la lumière → feu) | « La lumière serrée dans le poing devient flamme. » |
| III. Les eaux | vert, brume | l'écluse et la roue (l'eau comme énergie) | « Ce que le soleil réveille, l'eau le porte. » |
| IV. Les vents | or, ocre | la voile et la girouette (déplacer les nuages) | « Nous avons appris à demander la pluie. » |
| V. L'équinoxe | or et nuit à parts égales | le cristal-mémoire (stocke la lumière) | « Le jour et la nuit se doivent l'un à l'autre. » |

Le dernier monde renverse la leçon : l'ombre devient nécessaire (protéger du
gel utile, garder l'eau, laisser dormir une graine). D'où le titre.

## 4. Contrôles

Tactile uniquement, un seul doigt, uniquement des « glisser ».

| Objet | Geste | État |
| --- | --- | --- |
| Soleil | glisser le long de son arc | ✅ |
| Nuage | glisser le long de son rail | ✅ |
| Bulles du bas de l'écran | glisser la bulle soleil ou la bulle nuage sur sa ligne : toute la largeur de l'écran = toute la course de l'objet. Pour jouer d'une main, au pouce | ✅ |
| Miroir | tourner le doigt autour du miroir (aide à la visée au lâcher) | ✅ |
| Miroir flottant | idem ; sa hauteur suit le niveau de l'eau | ✅ |
| Porteur de miroir | aucun geste : il avance dès que le chemin le porte | ✅ |
| Lentille | glisser sur un rail, comme le nuage | proposé |
| Vanne / écluse | toucher pour ouvrir ou fermer | proposé |
| Girouette | tourner : change le sens du vent | proposé |
| Lanterne portée | glisser un villageois porteur de lanterne sur un chemin | proposé |

Règle d'ergonomie : zone tactile d'au moins 48 px, jamais deux objets
manipulables à moins de 60 px l'un de l'autre, jamais de geste à deux doigts.

## 5. Direction artistique

Inspirations : Alto's Adventure (aplats, plans successifs, ciel dégradé) et
Prune (silhouettes, économie de moyens).

- **Deux palettes, une frontière.** ✅ Chaque couleur existe en version
  lumière (chaude) et en version ombre (froide). La scène est peinte en ombre,
  puis repeinte en lumière dans les zones éclairées : le bord est net, sans
  flou ni dégradé.
- **Aube et crépuscule.** ✅ Le jour ne s'allume pas d'un coup : la lumière
  monte à mesure que le soleil se dégage du relief, rose et dorée tant qu'il
  est bas, blanche au zénith. Une lumière faible agit faiblement (fonte
  lente).
- **La nuit vit dans l'ombre.** ✅ Les étoiles n'apparaissent que là où le
  soleil ne passe pas.
- **La lumière mord la matière.** ✅ Sur les surfaces éclairées, un liseré
  clair (neige blanche, roche dorée) ; son épaisseur dépend de l'angle du
  soleil.
- **Silhouettes sombres au premier plan**, lointains pâles : la profondeur
  vient de la valeur, pas du détail.
- **Formes** : polygones simples, peu de sommets, pas de contour, pas de
  texture.
- **Mouvement** : lent et continu (flocons, respiration des personnages,
  reflets de l'eau). Rien ne clignote.
- **Progression** : la neige devient herbe, le ciel se réchauffe ✅ ; plus
  tard les arbres reverdissent et le village s'agrandit.

Sources de lumière : soleil ✅, faisceaux des miroirs ✅, temple allumé ✅,
lanternes ✅ ; à venir : feu, cristal chargé, lucioles, lune (lumière froide
qui éclaire sans chauffer).

## 6. Système d'éléments

Le principe : chaque élément ne connaît que ce qu'il **reçoit**.

### Briques de base

| Brique | Ce qu'elle apporte | Vient de |
| --- | --- | --- |
| Lumière | chaleur + visibilité | soleil, miroir, lentille, temple, feu |
| Ombre | froid | relief, nuage, objets |
| Eau | poids, mouvement, vie | glace fondue, pluie, source |
| Vent | déplacement | girouette, cheminée de roche chauffée |
| Terre | support, obstacle | le décor |
| Feu | lumière + chaleur locales, même la nuit | lumière concentrée sur du bois |
| Pluie | eau venue d'en haut | nuage refroidi par une ombre ou poussé contre un sommet |

### Tableau des réactions

| Ce qui reçoit | + Lumière | + Ombre | + Eau | + Vent | + Feu |
| --- | --- | --- | --- | --- | --- |
| **Glace** | fond → eau ✅ | reste gelée | — | — | fond vite |
| **Eau** | dégèle ✅ ; s'évapore lentement → nuage | gèle → glace (source, digue, pont) ✅ | coule, remplit ✅ | fait des vagues, pousse un radeau | → vapeur → nuage |
| **Terre humide** | pousse → végétation | reste nue | devient humide | sèche | durcit → brique |
| **Végétation** | grandit (liane, pont, échelle) | se referme, dort | grandit | disperse des graines | brûle → cendre fertile |
| **Nuage** | s'amincit | grossit → pluie | — | se déplace | — |
| **Miroir** | renvoie un faisceau ✅ | inactif | — | — | — |
| **Cristal** | se charge ✅ puis éclaire | se décharge lentement | — | tinte (indice sonore) | — |
| **Roue** | — | — | tourne → actionne un mécanisme ✅ | tourne (moulin) | — |
| **Bois** | — | — | flotte | — | brûle → feu |

États produits : **glace**, **végétation**, **vapeur/nuage**, **feu**,
**cendre**. Chaque état doit se lire au premier coup d'œil et réagir à son
tour : c'est ce qui permet les réactions en chaîne.

Règle d'or pour ajouter un élément : il doit réagir à au moins deux briques
et en produire ou en transporter au moins une. Sinon, c'est du décor.

### Introduction progressive

Un seul nouvel élément par niveau, d'abord en situation évidente, puis
combiné avec les précédents deux ou trois niveaux plus tard.

## 7. Les temples de l'ancienne civilisation

![Direction retenue pour les temples](images/temples-direction.jpg)

**Direction retenue** ✅ : *les instruments* en base, *les monolithes* en
secondaire. Chaque bâtiment est un instrument qui mesure le ciel, taillé dans
de grandes dalles nettes. (Écartée : la piste « orgues », des machines de
bronze à tuyaux et chaudières, trop chargée pour un écran de téléphone.)

### L'idée

Ils ne fabriquaient pas d'énergie : ils traitaient la lumière comme de l'eau.
Ils la captaient, la conduisaient dans la pierre, la gardaient, puis la
changeaient en chaleur, en mouvement ou en vie.

### Les règles de dessin

- **Trois formes** : l'arc, le triangle, l'escalier droit. Aucun ornement.
- **Des coupes nettes** : grandes faces planes, sommets en biseau, arêtes
  vives. C'est ce qui donne les ombres les plus franches.
- **Une seule gravure** : les conduits, lignes fines à angle droit ou à 45°.
- **Une matière** : une pierre claire et lisse. Le bronze est réservé aux
  pièces mobiles (miroirs, anneaux).
- **Deux états** : endormi (pierre bleu froid, gravures presque invisibles,
  cristal terne) et éveillé (gravures dorées, cristal lumineux).
- **Une échelle** : les ruines dominent le paysage ; une maison du village
  arrive à peine à la troisième marche.
- **La forme annonce la fonction** : on doit deviner à quoi sert un lieu avant
  de toucher quoi que ce soit.

### Les pièces

| Pièce | Vient de | Rôle | État |
| --- | --- | --- | --- |
| Porte solaire (deux piliers, un fronton) | instruments | abrite le cristal | ✅ dans le jeu |
| Anneau au cristal | instruments | reçoit la lumière ; ses graduations indiquent l'angle | ✅ (version simple) |
| Conduits gravés | instruments | portent la lumière dans la pierre | ✅ |
| Gnomon à escalier | instruments | grand triangle dont l'ombre sert d'aiguille | à faire |
| Oculus | instruments | trou rond : ne laisse passer qu'un rayon précis | à faire |
| Dalle en biseau | monolithes | mur, écran, porte | à faire |
| Fente de lumière | monolithes | la lumière y passe en lame | à faire |
| Linteau en porte-à-faux | monolithes | fait une ombre « suspendue » | à faire |

À ne pas reprendre des monolithes : les blocs en lévitation. Le jeu obéit à
des règles physiques ; rien n'y flotte.

### Ce que leurs machines savaient faire (proposé)

Chaque verbe devient une mécanique ; chaque monde en introduit un ou deux.

| Verbe | Machine | Dans le jeu |
| --- | --- | --- |
| Guider | héliostat, miroirs | ✅ renvoyer la lumière |
| Conduire | conduits gravés | la lumière traverse la roche d'un point à un autre |
| Concentrer | lentille, miroir courbe | feu, fonte rapide, forge |
| Garder | cristal-mémoire | emporter du jour dans la nuit |
| Mouvoir | « poumon de pierre » : l'air chauffé pousse un piston | portes, monte-charges, pompes |
| Faire pousser | serre sous la glace | végétation, ponts de lianes |

### Pourquoi tout s'est arrêté (proposé)

Ils ont voulu abolir la nuit. À force de garder le jour, ils ont rompu
l'équilibre, et le long hiver en est le contrecoup. C'est le sens du titre,
et du dernier monde, où l'ombre redevient nécessaire.

### Les ruines aujourd'hui

- Toujours abîmées d'un côté : un anneau ébréché, une dalle couchée, un
  escalier qui ne mène plus nulle part.
- Prises dans la glace, noyées ou envahies de végétation selon le monde.
- **Habitées sans être comprises** ✅ (sur la planche) : maisons adossées à un
  gnomon, linge tendu entre un anneau et un escalier, enfants sur les marches.

### Variantes par monde

Temple-phare au sommet (I), temple-forge à lentille (II), temple-écluse à
bassin en gradins (III), temple-girouette dans une gorge venteuse (IV),
portes jumelles jour/nuit (V).

## 8. Le petit peuple et son village

- **Silhouette** ✅ : une goutte encapuchonnée, sans bras ni jambes visibles ;
  deux yeux ronds. La pointe de la capuche est leur seul « geste ».
- **Couleur** ✅ : capes corail, la seule couleur chaude du monde gelé — on les
  repère toujours, même dans l'ombre (où leurs yeux restent clairs).
- **Comportement** : ils respirent ✅, clignent des yeux ✅, sautent de joie
  quand le temple s'allume ✅. À venir : ils se tournent vers la lumière, se
  blottissent dans l'ombre, s'approchent des objets libérés (indice discret).
- **Évolution** : enfants plus petits ✅, capes de couleurs nouvelles à chaque
  monde, objets retrouvés portés en bandoulière.
- **Maisons** ✅ : bois sombre, toits pointus chargés de neige, une petite
  fenêtre qui s'allume quand le temple revit. Elles s'appuient parfois sur des
  ruines anciennes sans le savoir. Au fil des mondes : pilotis (III), moulins
  (IV), premières maisons de pierre claire (V).
- **Le rite** : au centre du village, un miroir sur un mât ✅. Ils le tournent
  vers le soleil « parce qu'on a toujours fait ainsi ».

## 9. Niveaux

### Niveau 1 — Le glacier suspendu ✅

Décor : un soleil, un nuage sur rail, un glacier coincé sous un surplomb, un
village sur un plateau, une vallée et sa rivière gelée, un temple au fond
d'une grotte fermée par une porte.

1. Sortir le soleil de derrière la montagne ; écarter le nuage si son ombre
   tombe sur le village.
2. Tourner le miroir du village vers le glacier : il fond, la cascade tombe,
   la roue tourne, la porte s'ouvre.
3. Le glacier a libéré un second miroir : village → glacier → temple.

Le soleil direct ne peut atteindre ni le glacier ni le temple (c'est vérifié
par `npm run check`) : les deux miroirs sont nécessaires.

### Niveau 2 — Le rideau d'eau ✅

Le torrent libéré au niveau 1 tombe devant l'entrée du temple : la cascade
brise le faisceau. Nouvelle règle : **l'ombre gèle l'eau calme**.

1. Viser le temple : le faisceau se disperse dans la cascade.
2. Amener l'ombre du nuage sur la source : elle gèle, la cascade se tarit.
3. Garder la source à l'ombre et le miroir au soleil, puis viser.

### Niveau 3 — La digue de glace ✅

Un bassin, un miroir sur un radeau, une gorge par où l'eau s'échappe. Pas de
nuage : seule l'ombre du relief compte, donc la position du soleil.

1. Placer le soleil pour que l'ombre de la falaise couvre le seuil : l'eau
   qui le franchit gèle en digue, le bassin se remplit, le radeau monte.
2. Trop bas, le soleil laisse aussi le radeau dans l'ombre : il faut trouver
   la bonne plage.
3. Miroir en haut et au soleil : viser le temple dans la falaise.

### Niveau 4 — Le pont de givre ✅

Un villageois porte un miroir mais le torrent lui barre la route. Le socle
qui l'attend n'est jamais atteint par le soleil direct.

1. Amener l'ombre du nuage sur le torrent : il gèle en pont.
2. Le porteur traverse tout seul et pose son miroir (la glace tient tant
   qu'il est dessus).
3. Écarter le nuage : miroir du village → miroir du socle → temple.

### Pistes pour la suite du monde I

| # | Titre | Nouveauté | Idée |
| --- | --- | --- | --- |
| 5 | La pluie | nuage + ombre → pluie | Faire grossir le nuage dans l'ombre d'un pic, le pousser au-dessus d'un bassin à sec qui alimente une roue. |
| 6 | Le lac | reflet de l'eau | Une eau calme est un miroir horizontal : remplir le lac à la bonne hauteur pour renvoyer le soleil sous une arche. |
| 7 | La graine | lumière → végétation | Faire pousser une liane jusqu'à un miroir trop haut ; trop d'ombre et elle se referme. |
| 8 | Deux temples | deux cristaux | Un seul faisceau, deux temples : il faut un cristal-relais qui garde la lumière quelques secondes. |
| 9 | Le veilleur | lanterne portée | De nuit (soleil couché), guider la lumière du premier temple rallumé vers le second. |
| 10 | Le phare | synthèse | Temple au sommet, toutes les mécaniques du monde I ; l'allumer fait fondre l'horizon. |

### Gabarit d'un niveau

- Une image lisible en trois secondes : où est le temple, qu'est-ce qui bouge.
- Deux à quatre objets manipulables, pas plus.
- Trois temps : comprendre (1 geste), débloquer (la réaction en chaîne),
  viser (le dernier réglage).
- Au moins un « raccourci impossible » vérifié par un test automatique.

## 10. Feuille de route

1. ✅ **v0.1** — moteur de lumière, direction artistique, niveau 1, PWA.
2. ✅ **v0.2** — règles réutilisables, gel de l'eau, niveaux 2 à 4, sauvegarde
   de la progression, choix des niveaux.
3. **v0.3** — sons (nappes, tintement du cristal, eau), nouveaux éléments
   (pluie, végétation), monde I complet.
4. **v0.4** — emballage Capacitor, APK de test, retour haptique.
5. **v1.0** — mondes II à V, AAB signé pour le Play Store.
