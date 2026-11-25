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

### L'histoire ✅

Une civilisation maîtrisait la lumière du soleil. Elle a vu venir l'ère
glaciaire, et plutôt que de lutter, elle a **préparé le retour** :

- elle a scellé ses temples et ses machines sous la glace, pour les protéger
  du temps ;
- elle a laissé à ses descendants un geste simple à répéter — tourner un
  miroir vers le soleil — pour qu'ils sachent un jour tout réveiller.

Les siècles ont passé. Le geste est devenu un rite, le rite un culte du
soleil, et plus personne ne sait pourquoi on le fait. Le petit peuple vit au
milieu des ruines sans les comprendre.

Le joueur ne répare donc pas un désastre : il **tient une promesse** dont tout
le monde a oublié l'existence.

Ce que cette histoire explique déjà dans le jeu :

- un miroir attendait dans le glacier du niveau 1 : il y avait été déposé ;
- les temples sont intacts sous la glace : elle les protégeait ;
- le village tourne son miroir « parce qu'on a toujours fait ainsi » ;
- l'ombre et le froid sont des outils, pas des ennemis.

### La fin du jeu ✅

Au dernier temple, on découvre que tout avait été prévu pour ce retour : le
culte du soleil était un mode d'emploi déguisé, et chaque niveau franchi
était une étape du plan des anciens.

### Le sens du titre ✅

Tout le jeu, comme toute l'ancienne civilisation, repose sur un équilibre du
monde entre l'ombre et la lumière. Cet équilibre est parfait un seul jour :
l'équinoxe. Le dernier temple ne s'allume que ce jour-là.

Conséquence pour le jeu : ni la lumière ni l'ombre n'est « la bonne ». Chaque
énigme demande de doser les deux, et le dernier monde les met à égalité.

### Ce que rend chaque temple

- un **souvenir** — un fragment de texte, à la manière d'une tradition orale ;
- une **technologie** — un nouvel objet de jeu pour les niveaux suivants ;
- un peu de **chaleur** — la palette glisse du blanc-bleu vers le vert et l'or.

Les souvenirs racontent l'histoire à l'envers : d'abord ce que les anciens
savaient faire, puis qu'ils ont vu venir l'hiver, enfin qu'ils attendaient
quelqu'un.

Le tableau ci-dessous donne cet arc en cinq temps. Il a été écrit quand le
jeu était pensé comme un seul monde gelé ; il faudra le redistribuer sur les
six milieux (voir § 8) quand la répartition des niveaux sera faite.

| Temps du récit | Ambiance d'origine | Ce qu'on y apprend des anciens | Souvenir |
| --- | --- | --- | --- |
| I. Les glaces | blanc, bleu nuit | ils guidaient la lumière | ✅ « Ils ne priaient pas le soleil : ils le guidaient. » |
| II. Le dégel | turquoise, premiers verts | ils en faisaient de la chaleur | « La lumière serrée dans le poing devient flamme. » |
| III. Les eaux | vert, brume | ils la confiaient à l'eau | « Ce que le soleil réveille, l'eau le porte. » |
| IV. Les vents | or, ocre | ils ont vu venir le froid | « Le ciel se fermait. Nous avons compté les étés qu'il restait. » |
| V. L'équinoxe | or et nuit à parts égales | ils ont tout préparé pour nous | « Nous avons rangé le jour sous la glace. À vous de l'ouvrir. » |

La répartition des dix machines entre les milieux reste à faire (voir § 7).

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

### Les machines ✅

Dix machines retenues. Chacune suit une seule règle et réagit à ce qu'elle
reçoit ; on les répartira au fil des niveaux pour varier les énigmes.
Planches de référence : [machines 1 à 5](images/machines-1-5.jpg),
[machines 6 à 10](images/machines-6-10.jpg).

| # | Machine | Verbe | Règle | Énigme type | Coût |
| --- | --- | --- | --- | --- | --- |
| 1 | Oculus | filtrer | ne laisse passer qu'un rayon, sous un angle précis | trouver la position exacte du soleil | léger |
| 2 | Lentille sur rail | concentrer | rassemble la lumière en un point brûlant | aligner soleil, lentille et cible | moyen |
| 3 | Cristal-mémoire | garder | se charge au soleil, puis éclaire quelques secondes | avoir lumière et ombre « en même temps » | moyen |
| 4 | Conduit | conduire | la lumière entre par un œil et ressort par un autre | atteindre un lieu fermé | léger à moyen |
| 5 | Poumon de pierre | mouvoir | se dilate à la lumière, se rétracte à l'ombre | monter ou descendre un miroir, un villageois | moyen |
| 6 | Prisme | diviser | coupe un faisceau en deux | deux cibles avec un seul soleil | léger à moyen |
| 7 | Cadran d'ombre | mesurer | la pointe de l'ombre sert de clé | poser l'ombre sur la bonne graduation | moyen |
| 8 | Vanne solaire | libérer l'eau | s'ouvre à la lumière, se referme à l'ombre | décider où va l'eau | léger |
| 9 | Serre | faire pousser | lumière et eau font pousser une liane | un pont vivant, qui fait aussi de l'ombre | lourd |
| 10 | Cheminée à vent | souffler | chauffée, elle pousse le nuage | déplacer le nuage avec la lumière | moyen |

S'y ajoute l'héliostat (miroir orientable), déjà dans le jeu.

Règle d'introduction : une seule machine nouvelle par niveau, d'abord seule,
puis combinée avec les précédentes deux ou trois niveaux plus tard.

### Pourquoi tout s'est arrêté ✅

Ils ont vu venir l'ère glaciaire et ont choisi de mettre leur monde en
sommeil, en préparant son réveil (voir § 3). Les temples ne sont donc pas des
ruines de guerre ou d'abandon : ils sont **rangés**. Portes closes, miroirs
repliés, cristaux éteints, le tout pris dans une glace qui a été voulue.

Conséquence pour le dessin : ce qui est abîmé l'est par le temps (un anneau
ébréché, une dalle couchée), jamais par la violence.

### Les ruines aujourd'hui

- Toujours abîmées d'un côté : un anneau ébréché, une dalle couchée, un
  escalier qui ne mène plus nulle part.
- Prises dans la glace, noyées ou envahies de végétation selon le monde.
- **Habitées sans être comprises** ✅ (sur la planche) : maisons adossées à un
  gnomon, linge tendu entre un anneau et un escalier, enfants sur les marches.

### Variantes par milieu (pistes)

Temple-phare au sommet (montagne), temple-écluse à bassin en gradins (lacs),
temple-forge à lentille (désert), temple enfoui sous les racines (forêt),
temple à ciel ouvert sur son parvis (plateaux), temple-girouette dans le vent
(plaines). Le dernier temple, celui de l'équinoxe, a des portes jumelles :
une pour le jour, une pour la nuit.

## 8. Le petit peuple et son village

![Le petit peuple](images/peuple.jpg)

### Les personnages ✅

- **Silhouette** : une goutte encapuchonnée, sans bras ni jambes visibles. La
  pointe de la capuche est leur seul « geste ».
- **Vêtement** : cape noire, frise de triangles blancs à l'ourlet. Le noir se
  détache sur la neige et sur le ciel.
- **Masque** : un petit disque noir cerclé de blanc, porté dans l'ouverture
  de la capuche. Au-dessus, un soleil levant tracé en blanc. Il reprend les
  formes des anciens (cercle, triangle, graduations), pas celles d'une
  culture réelle.
- **La barre de lumière** : à la place des yeux, un trait doré qui brille.
  Dans l'ombre, la cape disparaît et il ne reste presque que lui : c'est ce
  qu'ils ont gardé des anciens sans le savoir.
- **Déclinaisons** : l'enfant est plus petit et sans frise ; l'ancien a la
  pointe de capuche recourbée et un bâton ; le porteur a son miroir dans le
  dos.
- **Comportement** : ils respirent ✅, sautent de joie quand le temple
  s'allume ✅. À venir : se tourner vers la lumière, se blottir dans l'ombre,
  s'approcher des objets libérés (indice discret).

État : choisi, **pas encore dans le jeu** (les niveaux actuels montrent
encore les capuchons corail d'origine).

Conséquence : le peuple n'apporte plus de couleur chaude. La chaleur du
monde gelé vient désormais des feux et des fenêtres de leurs habitations.

### Les habitations ✅

Le peuple d'aujourd'hui est primitif : il a perdu la technique des anciens.
Il n'y a pas un village mais **plusieurs tribus**, dispersées, chacune avec
sa façon de bâtir. Un niveau montre un petit village d'un seul type, choisi
selon le lieu. Planches : [habitations 1 à 3](images/habitations-1-3.jpg),
[habitations 4 à 6](images/habitations-4-6.jpg).

| # | Habitation | Ce qu'elle dit de la tribu |
| --- | --- | --- |
| 1 | Hutte de rondins | sédentaire, vit du bois |
| 2 | Tente de peaux | nomade, suit les troupeaux |
| 3 | Dôme de pierres sèches | bâtit avec les blocs des ruines, sans le savoir |
| 4 | Abri adossé à une ruine | vit littéralement dans les restes des anciens |
| 5 | Hutte enterrée | se protège du froid sous la terre et la neige |
| 6 | Nid sur pilotis | vit au-dessus de l'eau ou de la neige profonde |

Règle commune : dans un monde où les personnages sont en noir et blanc, le
feu des portes et des fenêtres est la seule couleur chaude. Chaque
habitation en a un, visible de loin.

### Tribus et milieux ✅

Le jeu traverse **six milieux**. Chaque milieu a sa tribu et son habitat.

| Milieu | Habitation | Pourquoi |
| --- | --- | --- |
| Haute montagne, glaciers | hutte enterrée (5) | le sol protège du froid |
| Plaines gelées | tente de peaux (2) | rien pour bâtir, on se déplace |
| Forêt | hutte de rondins (1) | le bois est partout |
| Hauts plateaux de ruines | abri adossé (4) | les dalles anciennes servent de murs |
| Désert, pierre nue | dôme de pierres sèches (3) | frais le jour, tiède la nuit |
| Lacs, marais, côtes | nid sur pilotis (6) | l'eau monte et descend |

Ce que toutes les tribus ont en commun : la cape noire et le masque à barre
de lumière.

Encore à décider :

- **La répartition des niveaux.** Le jeu final comptera plus de 30 niveaux,
  répartis équitablement entre les six milieux (soit cinq ou plus par
  milieu). L'ordre de traversée et la répartition restent à faire.
- **Un signe par tribu** (proposé) : le signe tracé au-dessus de la barre de
  lumière changerait d'une tribu à l'autre (soleil levant, graduations, trait
  vertical…), comme si chacune n'avait gardé qu'un fragment du savoir ancien.
- **Le sens du déséquilibre** (proposé) : certains milieux souffrent de trop
  d'ombre (la glace), d'autres de trop de lumière (le désert). Dans les
  premiers on apporte la lumière ; dans les seconds, l'ombre.
- **Les couleurs** : chaque milieu aura besoin de sa palette de lumière et de
  sa palette d'ombre. Seule celle de la glace existe aujourd'hui.

### Le rite

Au centre du village, un miroir sur un mât ✅. Ils le tournent vers le soleil
« parce qu'on a toujours fait ainsi » : c'est le geste que les anciens leur
ont laissé pour réveiller les temples (voir § 3).

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

Cible du jeu final : **plus de 30 niveaux**, répartis équitablement sur les
six milieux. Les quatre niveaux actuels servent à tester le moteur et les
règles ; ils se passent tous dans la glace.

1. ✅ **v0.1** — moteur de lumière, direction artistique, niveau 1, PWA.
2. ✅ **v0.2** — règles réutilisables, gel de l'eau, niveaux 2 à 4, sauvegarde
   de la progression, choix des niveaux, lever de soleil progressif, bulles
   pour jouer au pouce.
3. ✅ **Conception** — histoire, sens du titre, direction des temples, dix
   machines, design du petit peuple, six habitations, six milieux.
4. **À venir, dans un ordre à décider** :
   - mettre le nouveau design dans le jeu (personnages, temples, habitations) ;
   - premières machines, un niveau par machine ;
   - une palette d'ombre et de lumière par milieu ;
   - sons (nappes, tintement du cristal, eau) ;
   - répartition des 30 niveaux et des machines entre les milieux ;
   - emballage Capacitor, APK de test, puis AAB signé pour le Play Store.
