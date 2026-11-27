// Niveau 1 — « Le glacier suspendu »
//
// Un niveau n'est (presque) que des DONNÉES : formes, positions, textes.
// Les règles du jeu, elles, sont dans src/game/game.js.
// Les coordonnées sont en « unités monde ». La scène de référence fait
// 360 de large sur 720 de haut ; x va vers la droite, y vers le BAS.
//
// Solution prévue :
//  1. sortir le soleil de derrière la montagne (et écarter le nuage) pour
//     éclairer le miroir du village ;
//  2. tourner ce miroir pour envoyer la lumière sous le surplomb : le glacier
//     fond, l'eau tombe en cascade, la roue tourne, la porte du temple s'ouvre ;
//  3. le glacier a libéré un second miroir : village → glacier → temple.

import { toPoints } from '../engine/vec.js';

export default {
  id: 1,
  number: '1',
  title: 'Le glacier suspendu',
  size: { w: 360, h: 720 },

  // Le soleil glisse sur une demi-ellipse. Angles en degrés :
  // 0° = horizon à droite, 90° = zénith, 180° = horizon à gauche.
  sun: { cx: 180, cy: 330, rx: 172, ry: 268, min: 22, max: 150, start: 146, radius: 13 },

  // Le nuage glisse sur un rail horizontal.
  cloud: { y: 172, minX: 44, maxX: 316, startX: 204, w: 88, h: 30 },

  // Le sol : un seul grand polygone (montagne + vallée + plateau + grotte).
  // Les numéros servent à repérer les tronçons enneigés ci-dessous.
  ground: toPoints([
    [-3000, 3000], //  0
    [-3000, 300], //   1
    [-60, 262], //     2
    [-8, 205], //      3
    [30, 150], //      4  sommet
    [50, 188], //      5
    [70, 212], //      6
    [96, 262], //      7
    [140, 282], //     8
    [178, 318], //     9
    [182, 340], //    10  pointe du surplomb
    [166, 326], //    11  plafond de la niche
    [140, 312], //    12
    [116, 316], //    13
    [106, 340], //    14  fond de la niche
    [108, 372], //    15
    [128, 384], //    16
    [150, 398], //    17  bord d'où tombe la cascade
    [146, 450], //    18
    [136, 530], //    19
    [124, 600], //    20
    [112, 646], //    21  vallée
    [150, 651], //    22
    [190, 652], //    23
    [218, 650], //    24  pied de la falaise
    [218, 540], //    25  bas de l'entrée de la grotte
    [240, 580], //    26
    [262, 618], //    27
    [334, 622], //    28
    [334, 572], //    29
    [310, 540], //    30
    [262, 492], //    31
    [218, 452], //    32  haut de l'entrée de la grotte
    [218, 412], //    33  bord du plateau
    [252, 409], //    34
    [300, 413], //    35
    [350, 407], //    36
    [3000, 404], //   37
    [3000, 3000], //  38
  ]),
  // Tronçons du sol couverts de neige : [numéro de départ, numéro d'arrivée].
  snow: [
    [1, 9],
    [21, 24],
    [33, 37],
  ],
  // Intérieurs de grottes (dessinés derrière le sol) : numéros du polygone.
  caves: [[25, 32]],

  // Le glacier suspendu, coincé sous le surplomb.
  ices: [
    {
      id: 'glacier',
      points: toPoints([
        [172, 332],
        [166, 326],
        [140, 312],
        [116, 316],
        [106, 340],
        [107, 356],
        [146, 356],
        [166, 343],
      ]),
      meltTime: 3.2, // secondes de pleine lumière pour fondre
    },
  ],

  // Miroirs : angle en degrés, len = longueur.
  mirrors: [
    { id: 'village', x: 262, y: 390, angle: 8, len: 26, mount: { type: 'pole', baseY: 411 } },
    {
      id: 'glacier',
      x: 136,
      y: 336,
      angle: 18,
      len: 24,
      frozen: 'glacier', // prisonnier de ce glacier au départ
      mount: { type: 'arm', fromX: 107, fromY: 349 },
    },
  ],

  // Le temple au fond de la grotte, et son cristal à éclairer.
  temple: { x: 300, baseY: 621, crystal: { x: 298, y: 596, r: 10 } },

  // Le torrent : libéré par la fonte du glacier, il tombe puis suit la vallée.
  streams: [
    {
      id: 'torrent',
      after: 'glacier',
      drain: { x: 218.6, y: 653 }, // l'arche par où l'eau quitte la vallée
      parts: [
        {
          run: [
            [112, 374],
            [129, 385.5],
            [151, 399.5],
          ],
        },
        { fall: { x: 151.5, top: 399, bottom: 650 } },
        {
          run: [
            [151.5, 653],
            [190, 654],
            [218, 652.5],
          ],
        },
      ],
    },
  ],
  // L'eau dans la roche, vue en coupe (décor : voir src/game/underground.js).
  // En amont, la neige du sommet s'infiltre : trois filets fins naissent sous
  // elle et se rejoignent en une fissure, qui descend jusqu'au glacier.
  veins: [
    {
      after: 'glacier',
      width: 3,
      path: [
        [20, 178],
        [27, 188],
        [36, 200],
      ],
    },
    {
      after: 'glacier',
      width: 3,
      path: [
        [30, 163],
        [33, 180],
        [36, 200],
      ],
    },
    {
      after: 'glacier',
      width: 3,
      path: [
        [42, 186],
        [41, 193],
        [36, 200],
      ],
    },
    {
      after: 'glacier',
      width: 5.5,
      path: [
        [36, 200],
        [36, 214],
        [56, 246],
        [70, 262],
        [78, 292],
        [98, 312],
        [110, 331],
      ],
    },
  ],
  // En aval, l'eau s'infiltre au pied de la falaise, remplit une nappe sous
  // le temple, puis le trop-plein repart vers le bas de l'écran.
  aquifers: [
    {
      stream: 'torrent',
      inlet: [
        [219, 654],
        [232, 664],
        [244, 679],
      ],
      cavern: [
        [242, 682],
        [250, 670],
        [266, 663],
        [286, 667],
        [300, 661],
        [312, 671],
        [315, 690],
        [306, 704],
        [284, 709],
        [260, 706],
        [246, 697],
      ],
      low: 709, // fond de la grotte
      high: 680, // niveau de l'eau quand elle est pleine (la hauteur du trop-plein)
      fillTime: 18, // secondes pour la remplir
      stalactites: [
        [263, 664.5, 8],
        [284, 667, 6],
        [302, 662.5, 8],
      ],
      outlet: [
        [313, 682],
        [328, 704],
        [348, 732],
        [366, 760],
      ],
    },
  ],
  // Lit gelé de la rivière (décor).
  beds: [
    [
      [118, 649],
      [150, 653],
      [190, 654],
      [218, 652.5],
    ],
  ],

  // La roue à eau ouvre la porte de cuivre qui ferme la grotte : elle entraîne
  // une chaîne sans fin, le contrepoids monte, la porte descend (voir machine.js).
  wheels: [{ id: 'roue', x: 199, y: 635, r: 15, stream: 'torrent', door: 'porte' }],
  doors: [{ id: 'porte', x: 216, top: 452, bottom: 541, w: 7 }],

  // Le village : des huttes enterrées (w règle leur taille).
  houses: [
    { x: 303, baseY: 413, w: 24 },
    { x: 336, baseY: 410, w: 26 },
  ],
  lanterns: [
    { x: 281, y: 396, baseY: 411 },
    { x: 359, y: 392, baseY: 407 },
  ],
  villagers: [
    { x: 239, y: 410.5, s: 1.0, dir: 1 },
    { x: 249, y: 409.5, s: 0.8, dir: 1 },
    { x: 320, y: 412, s: 1.05, dir: -1 },
    { x: 176, y: 651.5, s: 0.95, dir: 1 },
  ],
  // Les décors de la haute montagne (voir src/game/decor.js). Les animaux
  // vivent leur vie (voir src/game/life.js) sans rien changer à l'énigme.
  decor: [
    // Le rapace plane le jour ; la nuit il dort sur le cairn du sommet.
    { type: 'raptor', layer: 'sky', x: 236, y: 138, r: 34, s: 0.6, perch: [30, 140.5] },
    // Le bouquetin suit sa crête, de vire en vire, à la recherche du soleil.
    {
      type: 'ibex',
      x: 101,
      y: 264.3,
      s: 0.8,
      dir: -1,
      path: [
        [43, 174.7],
        [50, 188, 'rest'],
        [70, 212, 'rest'],
        [83, 237, 'hop'],
        [96, 262],
        [101, 264.3, 'rest'],
      ],
    },
    { type: 'cairn', x: 30, y: 151.5, s: 0.5 },
    // Les marmottes de la vallée : elles ne sortent que si le soleil y descend.
    { type: 'marmots', x: 117, y: 647, s: 0.5, to: [141, 650] },
    // Le lièvre broute sur l'épaule de la montagne, là où passent les reflets.
    {
      type: 'hare',
      x: 122,
      y: 273.8,
      s: 0.5,
      range: [
        [107, 267],
        [137, 280.6],
      ],
    },
    { type: 'bush', x: 226, y: 412, s: 0.55 },
    { type: 'flowers', x: 234, y: 410.6, s: 0.9, n: 3 },
    { type: 'flowers', x: 131, y: 648.6, s: 0.9, n: 3 },
    { type: 'flowers', x: 352, y: 407.2, s: 0.9, n: 3 },
    { type: 'flags', x: 281, y: 394, x1: 301, y1: 396.5, sag: 5 },
    // La nuit seulement : une chouette sur la hutte, deux yeux dans la grotte.
    { type: 'owl', x: 303, y: 400.3, s: 0.55 },
    { type: 'eyes', x: 256, y: 600, s: 0.8 },
  ],
  // Brume du petit matin, au fond de la vallée.
  mists: [{ x0: 114, x1: 216, y: 648 }],
  // Où les fleurs poussent quand le monde revient à la vie (en plus du bord de l'eau).
  blooms: [
    [
      [116, 647],
      [148, 651],
    ],
    [
      [221, 412],
      [258, 409],
    ],
  ],

  // Lignes gravées qui s'illuminent du temple jusqu'au village à la victoire.
  conduits: [
    [
      [304, 536],
      [304, 470],
      [281, 440],
      [281, 411],
    ],
    [
      [304, 470],
      [359, 440],
      [359, 407],
    ],
  ],

  // Indice affiché en bas de l'écran, selon l'avancement du joueur.
  hint(g) {
    const ice = g.ices[0];
    if (g.temple.lit) return '';
    if (!g.touched.sun) return 'Fais glisser le soleil dans le ciel';
    if (!ice.gone) {
      if (ice.heating) return 'La glace fond…';
      if (!g.mirrors[0].lit) return 'Le miroir du village attend la lumière';
      return 'Tourne le miroir : la lumière réchauffe ce qu’elle touche';
    }
    if (g.doors[0].open < 1) return 'L’eau réveille une vieille mécanique…';
    return 'Un miroir ancien dormait dans la glace. Guide la lumière jusqu’au temple.';
  },

  memory: {
    number: 'I',
    title: 'Le Miroir',
    text:
      '« Avant le long hiver, nos ancêtres ne priaient pas le soleil : ils le guidaient. ' +
      'De miroir en miroir, sa chaleur voyageait jusqu’au cœur des montagnes. »',
    tech: 'Technologie retrouvée : l’héliostat',
  },
};
