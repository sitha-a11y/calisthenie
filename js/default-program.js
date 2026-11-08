// default-program.js — ton programme de départ, chargé au premier lancement
// (et par Réglages → « Charger mon programme de départ »).
//
// P(nom, catégorie, options) décrit un exercice ; W(...) pareil pour un échauffement.
// Options :
//   lib       : nom exact dans la bibliothèque (relie l'exercice au chart) ;
//               sans "lib", l'exercice est ajouté à la famille "Hors chart"
//   noLibrary : true = ne pas l'ajouter à la bibliothèque (ex. échauffements généraux)
//   type      : 'reps' (par défaut), 'hold' (secondes) ou 'distance' (mètres)
//   sets, target : ex. 3 × 12 → sets: 3, target: 12 ; "1 × 5 min" → type 'hold', sets: 1, target: 300
//   toMax     : true = "max"
//   perSide   : 'côté', 'jambe' ou 'bras'
//   vest      : true = avec le gilet lesté
//   rest      : repos en secondes (sinon : la règle par défaut, voir defaultRest)
//   note      : note libre
//   howTo     : explication "Comment faire" (bloc dépliable)
const P = (name, category, options = {}) => Object.assign({ name, category }, options);
const W = (name, category, options = {}) => P(name, category, Object.assign({ warmup: true }, options));

// Repos
const REST_SKILL = 150; // 2 min 30 : skills et force
const REST_OTHER = 90;  // 1 min 30 : le reste
const REST_CORE = 60;   // 1 min : gainage et cou

const BOX_NOTE = 'Banc, marche ou muret';
const HIP_THRUST_NOTE = 'Gilet sur les hanches, dos sur un canapé ou un lit';
const MAX_MINUS_ONE = 'S’arrêter 1 rep avant l’échec – noter le nombre de reps';

// "max (−1)" = Max activé + la note ci-dessus
const maxMinusOne = (name, category, options = {}) =>
  P(name, category, Object.assign({ sets: 1, toMax: true, note: MAX_MINUS_ONE }, options));

// Repos par défaut : 2 min 30 pour les skills et la force, 1 min pour le gainage et le cou
// ("le reste" à 1 min 30 est indiqué exercice par exercice avec rest: REST_OTHER).
// Pas de repos pour les échauffements, les exercices en 1 seule série
// ni les étirements du matin.
function defaultRest(spec) {
  if (spec.rest !== undefined) return spec.rest;
  if (spec.warmup || spec.sets === undefined || spec.sets === 1 || spec.category === 'mobility') return null;
  if (spec.category === 'core' || spec.category === 'neck') return REST_CORE;
  return REST_SKILL;
}

// ---------- Séances identiques en semaine A et B ----------

const MONDAY = {
  title: 'Handstand + équilibre', note: '~25 min · Natation', exercises: () => [
    W('Poignets', 'mobility', { type: 'hold', sets: 1, target: 120 }),
    W('Frog Stand', 'push', { lib: 'Frog Stand / Crow Pose', type: 'hold', sets: 3, target: 15 }),
    P('Handstand ventre face au mur', 'push', { lib: 'Wall HS', type: 'hold', sets: 4, target: 40 }),
    P('Kick-ups libres', 'push', { lib: 'Handstand', type: 'hold', sets: 1, target: 300, note: 'Viser 2-3 s sans le mur' }),
    P('Side to Side Shift', 'push', { lib: 'Side to Side Shift', sets: 3, target: 10, note: 'Ventre face au mur · 5 par côté' }),
    maxMinusOne('Pompes', 'push', { lib: 'Push Up', vest: true }),
  ],
};

const THURSDAY = {
  title: 'Cou + prévention', note: '~30 min · Boxe plus tard', exercises: () => [
    P('Neck curls', 'neck', { sets: 2, target: 15 }),
    P('Neck extensions', 'neck', { sets: 2, target: 15 }),
    P('Neck side crunches', 'neck', { sets: 2, target: 12, perSide: 'côté' }),
    P('Neck bridges chaise', 'neck', { sets: 2, target: 10, note: 'Léger et contrôlé' }),
    P('Shrugs', 'neck', { sets: 3, target: 12, vest: true }),
    P('YTL anneaux', 'pull', { sets: 2, target: 8, rest: REST_OTHER }),
    P('RTO Support Hold', 'push', { lib: 'RTO Support Hold', type: 'hold', sets: 3, target: 20, rest: REST_OTHER }),
    P('Hefesto curl', 'pull', { sets: 3, target: 5, rest: REST_OTHER }),
    P('Pompes doigts', 'push', { sets: 2, toMax: true, rest: REST_OTHER, note: 'Pour les doigts, MMA plus tard' }),
    maxMinusOne('Ring Dip', 'push', { lib: 'Ring Dip', vest: true }),
  ],
};

// Échauffements et fins de séance qui reviennent
const wristsScap = () => W('Poignets + scap push-ups', 'mobility', { noLibrary: true, sets: 2, target: 10 });
const legsWarmup = () => W('Squats + fentes + chevilles', 'mobility', { noLibrary: true, type: 'hold', sets: 1, target: 300 });
const scapPulls = () => W('Scapular pulls', 'pull', { lib: 'Scapular Shrug', sets: 2, target: 8 });
const sundayWarmup = () => W('Footwork + montées de genoux + 2 sprints progressifs', 'mobility',
  { noLibrary: true, type: 'hold', sets: 1, target: 480 });
const legsEnd = () => [
  P('Hip thrust', 'legs', { sets: 3, target: 12, vest: true, rest: REST_OTHER, note: HIP_THRUST_NOTE }),
  P('Mollets 1 jambe', 'legs', { sets: 3, target: 15, perSide: 'jambe', vest: true, rest: 60 }),
  P('Exo anti-périostite', 'legs', { sets: 2, target: 20, rest: 60 }),
];
const SUNDAY_NOTE = '~45 min · Récup complète entre les séries, vitesse max';

const DEFAULT_PROGRAM = {
  A: {
    mon: MONDAY,
    tue: { title: 'Gainage', note: '~25 min', exercises: () => [
      P('Adv Tuck Dragon Flag', 'core', { lib: 'Advanced Tuck Dragon Flag', sets: 3, target: 5 }),
      P('Hanging Straight Leg Toes to Bar', 'core', { lib: 'Hanging Straight Leg Toes to Bar', sets: 3, target: 10 }),
      P('Ab wheel', 'core', { sets: 3, target: 8 }),
      P('Reverse Hyperextension', 'core', { lib: 'Reverse Hyperextension', sets: 3, target: 12,
        note: 'À plat ventre au bord du lit, lever les jambes. Sinon : arch body hold 2 × 20 s' }),
      P('Hollow rock hold', 'core', { type: 'hold', sets: 2, target: 30 }),
      maxMinusOne('Tractions', 'pull', { lib: 'Pull Up', vest: true }),
    ] },
    wed: { title: 'Push horizontal (planche)', note: '~50 min', exercises: () => [
      wristsScap(),
      W('Planche Lean', 'push', { lib: 'Planche Lean', type: 'hold', sets: 3, target: 15 }),
      P('Tuck Planche', 'push', { lib: 'Tuck Planche', type: 'hold', sets: 3, target: 15 }),
      P('Adv Tuck Planche', 'push', { lib: 'Adv Tuck Planche', type: 'hold', sets: 4, target: 5 }),
      P('Tuck PL Push Up', 'push', { lib: 'Tuck PL PU', sets: 3, target: 5 }),
      P('One Arm Push Up', 'push', { lib: 'One Arm Push Up', sets: 3, target: 5, perSide: 'bras' }),
      P('RTO PP Push Up', 'push', { lib: 'RTO PP PU', sets: 3, target: 8, rest: REST_OTHER }),
    ] },
    thu: THURSDAY,
    fri: { title: 'Jambes', note: '~55 min', exercises: () => [
      legsWarmup(),
      W('Saut masaï', 'legs', { sets: 3, target: 20 }),
      P('Pistol Squat', 'legs', { lib: 'Pistol Squat', sets: 4, target: 5, perSide: 'jambe', vest: true,
        note: 'Si trop dur, 4 × 3 puis remonter à 5' }),
      P('Shrimp Squat', 'legs', { lib: 'Shrimp Squat', sets: 3, target: 6, perSide: 'jambe' }),
      P('Nordic Curl', 'legs', { lib: 'Nordic Curl', sets: 3, target: 5, note: 'Négatives si besoin' }),
      P('Sissy squat', 'legs', { sets: 3, target: 10, rest: REST_OTHER }),
      ...legsEnd(),
    ] },
    sat: { title: 'Pull horizontal (levers)', note: '~50 min', exercises: () => [
      scapPulls(),
      W('Skin the Cat', 'pull', { lib: 'Skin the Cat', sets: 2, target: 3 }),
      P('Front Lever', 'pull', { lib: 'Front Lever', type: 'hold', sets: 1, toMax: true, note: 'Test, 1 seul essai' }),
      P('Straddle FL', 'pull', { lib: 'Straddle FL', type: 'hold', sets: 5, target: 6 }),
      P('Négatives front lever', 'pull', { lib: 'Front Lever', sets: 3, target: 3, note: '5 s de descente' }),
      P('Back lever', 'pull', { lib: 'Back Lever', type: 'hold', sets: 3, target: 10, note: 'À ton niveau : tuck, straddle ou full' }),
      P('Adv Tuck FL Row', 'pull', { lib: 'Adv Tuck FL Row', sets: 3, target: 8 }),
      P('One Arm Row', 'pull', { lib: 'One Arm Row', sets: 3, target: 6, perSide: 'bras', rest: REST_OTHER }),
    ] },
    sun: { title: 'Explosivité', note: SUNDAY_NOTE, exercises: () => [
      sundayWarmup(),
      P('Box jumps', 'cardio', { sets: 4, target: 3, rest: 120, note: `Sans gilet · ${BOX_NOTE}` }),
      P('Sauts en longueur', 'cardio', { sets: 4, target: 3, rest: 120, note: 'Sans gilet' }),
      P('Saut masaï 1 jambe', 'cardio', { sets: 3, target: 10, perSide: 'jambe', rest: REST_OTHER }),
      P('Pompes claquées', 'push', { sets: 4, target: 5, rest: 120 }),
      P('Muscle Up explosifs', 'pull', { lib: 'Muscle Up', sets: 3, target: 2, note: 'Le plus haut possible' }),
      P('Sprints', 'cardio', { type: 'distance', sets: 6, target: 20, rest: 120 }),
      P('Finisher burpees + lunge claps', 'cardio', { type: 'hold', sets: 4, target: 20, rest: 40,
        note: '4 tours : 20 s effort / 40 s repos. Tant que pas de boxe' }),
    ] },
  },

  B: {
    mon: MONDAY,
    tue: { title: 'Gainage compression', note: '~25 min', exercises: () => [
      P('45° V-Sit', 'core', { lib: '45° V-Sit', type: 'hold', sets: 4, target: 8 }),
      P('L raise fesses au sol', 'core', { sets: 3, target: 10 }),
      P('Copenhagen plank', 'core', { type: 'hold', sets: 3, target: 20, perSide: 'côté' }),
      P('Arch body hold (superman)', 'core', { type: 'hold', sets: 3, target: 20 }),
      P('Hollow rock hold', 'core', { type: 'hold', sets: 2, target: 30 }),
      maxMinusOne('Tractions', 'pull', { lib: 'Pull Up', vest: true }),
    ] },
    wed: { title: 'Push vertical (handstand)', note: '~45 min', exercises: () => [
      wristsScap(),
      W('Wall HS', 'push', { lib: 'Wall HS', type: 'hold', sets: 2, target: 30 }),
      P('Wall HS Push Up', 'push', { lib: 'Wall HS PU', sets: 4, target: 5, note: 'Négatives si besoin' }),
      P('Tuck Planche', 'push', { lib: 'Tuck Planche', type: 'hold', sets: 3, target: 15, note: 'Rappel planche' }),
      P('Bulgarian Dip', 'push', { lib: 'Bulgarian Dip', sets: 3, target: 8 }),
      P('V-sit to tuck planche', 'push', { sets: 3, target: 4 }),
      P('Bridge one leg push-ups', 'push', { sets: 2, target: 5, perSide: 'jambe', rest: REST_OTHER }),
    ] },
    thu: THURSDAY,
    fri: { title: 'Jambes', note: '~55 min', exercises: () => [
      legsWarmup(),
      W('Box jumps 1 jambe', 'legs', { sets: 4, target: 3, perSide: 'jambe', vest: true, note: BOX_NOTE }),
      P('Pistol Squat', 'legs', { lib: 'Pistol Squat', sets: 3, target: 6, perSide: 'jambe', note: 'Tempo lent, 3 s de descente' }),
      P('Elevated Shrimp Squat', 'legs', { lib: 'Elevated Shrimp Squat', sets: 3, target: 6, perSide: 'jambe' }),
      P('Nordic Curl', 'legs', { lib: 'Nordic Curl', sets: 3, target: 5 }),
      P('Sissy squat', 'legs', { sets: 3, target: 10, rest: REST_OTHER }),
      P('Sprinter lunge', 'legs', { sets: 3, target: 8, perSide: 'jambe', vest: true, rest: REST_OTHER }),
      ...legsEnd(),
    ] },
    sat: { title: 'Pull vertical (one arm + muscle-up)', note: '~50 min', exercises: () => [
      scapPulls(),
      W('Pull-ups faciles', 'pull', { lib: 'Pull Up', sets: 2, target: 5 }),
      P('Muscle Up stricts', 'pull', { lib: 'Muscle Up', sets: 4, target: 4, note: 'Lents, sans kip' }),
      P('One Arm Pull Up', 'pull', { lib: 'One Arm Pull Up', sets: 3, target: 1, perSide: 'bras', rest: 180,
        note: 'Bras gauche en premier' }),
      P('One Arm Pull Up Negative', 'pull', { lib: 'One Arm Pull Up Negative', sets: 3, target: 1, perSide: 'bras',
        note: '5 s de descente' }),
      P('Archer pull-ups', 'pull', { sets: 3, target: 5, perSide: 'côté',
        note: 'Une semaine B sur deux, hammer pull-ups à la place' }),
      P('Straddle FL', 'pull', { lib: 'Straddle FL', type: 'hold', sets: 3, target: 6, note: 'Rappel front lever' }),
      P('Dead hang', 'pull', { type: 'hold', sets: 1, target: 60, rest: REST_OTHER }),
    ] },
    sun: { title: 'Explosivité 2', note: SUNDAY_NOTE, exercises: () => [
      sundayWarmup(),
      P('Bonds sur 1 jambe', 'cardio', { sets: 4, target: 3, perSide: 'jambe', rest: 120 }),
      P('Squat jumps', 'cardio', { sets: 3, target: 5, rest: 120, note: 'Hauteur max, pas en cardio' }),
      P('Lunge claps', 'cardio', { sets: 3, target: 6, perSide: 'jambe', rest: REST_OTHER }),
      P('Pompes claquées pieds surélevés', 'push', { sets: 4, target: 4, rest: 120 }),
      P('Sprints en côte', 'cardio', { type: 'hold', sets: 6, target: 15, rest: 120, note: 'Ou sur le plat' }),
      P('Finisher carré grappling + burpees', 'cardio', { type: 'hold', sets: 4, target: 20, rest: 40,
        note: '4 tours : 20 s effort / 40 s repos' }),
    ] },
  },

  // howTo = explication "Comment faire" ; noLibrary = ne pas l'ajouter à la bibliothèque
  daily: [
    {
      name: 'Étirements matin',
      reminder: 'Tension 6-7/10, jamais de douleur, pas de rebond, respire lentement.',
      rules: 'Quand une position devient facile, va un peu plus loin en amplitude, sans allonger la durée. '
        + 'Une fois par mois, prends une photo de ton grand écart pour voir ta progression.',
      groups: [
        { name: 'Hanches + haut du corps (~15 min)', color: '#4dabf7', exercises: [
          W('Échauffement', 'mobility', { noLibrary: true, type: 'hold', sets: 1, target: 120,
            howTo: 'Cercles de bras, cercles de hanches, 20 jumping jacks. Juste de quoi te réchauffer.' }),
          P('Poignets', 'mobility', { type: 'hold', sets: 4, target: 30, note: '2 en flexion + 2 en extension',
            howTo: 'À quatre pattes, mains à plat. Doigts vers les genoux, recule doucement les fesses (extension). '
              + 'Puis dos des mains au sol, doigts vers toi (flexion). Bras tendus.' }),
          P('Figure 4 stretch (pigeon)', 'mobility', { type: 'hold', sets: 3, target: 45, perSide: 'côté',
            howTo: 'Au sol, jambe avant pliée devant toi, tibia en travers. Jambe arrière tendue derrière. '
              + 'Garde le bassin droit, puis penche le buste vers l’avant en gardant le dos long. '
              + 'Tu dois sentir la fesse de la jambe avant.' }),
          P('Hip flexor stretch', 'mobility', { type: 'hold', sets: 3, target: 45, perSide: 'côté',
            howTo: 'En fente, genou arrière au sol (sur un coussin). Serre la fesse de la jambe arrière et rentre le ventre '
              + 'pour basculer le bassin, puis avance doucement. Tu dois sentir l’avant de la hanche arrière. '
              + 'Essentiel pour le grand écart facial.' }),
          P('Chest stretch', 'mobility', { type: 'hold', sets: 2, target: 40, perSide: 'côté',
            howTo: 'Avant-bras contre un cadre de porte, coude à hauteur d’épaule (90°). Tourne doucement le buste vers '
              + 'l’autre côté. Tu dois sentir le pec et l’avant de l’épaule.' }),
          P('Lat stretch', 'mobility', { type: 'hold', sets: 2, target: 40, perSide: 'côté',
            howTo: 'Mains sur une table ou sur la barre à hauteur de hanches. Recule les fesses, dos plat, et laisse '
              + 'descendre la poitrine vers le sol. Pour cibler un côté, décale les hanches de l’autre côté.' }),
          P('Chevilles', 'mobility', { type: 'reps', sets: 2, target: 12, perSide: 'côté',
            howTo: 'Face au mur, pied à environ 10 cm du mur, talon au sol. Pousse le genou vers le mur sans décoller '
              + 'le talon. Quand c’est facile, recule le pied de 1-2 cm.' }),
        ] },
        { name: 'Grand écart + arrière des jambes (~15 min)', color: '#9775fa', exercises: [
          W('Échauffement', 'mobility', { noLibrary: true, type: 'hold', sets: 1, target: 120,
            howTo: 'Cercles de hanches, 10 squats, 10 balancements de jambes de chaque côté.' }),
          P('Poignets', 'mobility', { type: 'hold', sets: 2, target: 30,
            howTo: 'Comme dans le groupe 1. À quatre pattes, doigts vers les genoux, recule doucement les fesses.' }),
          P('Pancake stretch', 'mobility', { type: 'hold', sets: 3, target: 60, note: 'Contracter-relâcher',
            howTo: 'Assis, jambes écartées et tendues, genoux vers le plafond. Bascule le bassin vers l’avant '
              + '(le ventre va vers le sol, pas la tête), dos plat, mains devant toi. Pendant chaque série : '
              + '20 s de relâchement, 5 s à pousser les talons fort contre le sol, puis relâche et descends un peu plus. '
              + 'Répète jusqu’à 60 s.' }),
          P('Middle split (grand écart facial)', 'mobility', { type: 'hold', sets: 3, target: 60, note: 'Contracter-relâcher',
            howTo: 'Debout, mains au sol devant toi, écarte les jambes progressivement, pointes de pieds vers l’avant. '
              + 'Quand tu es au maximum : presse 5 s les pieds contre le sol comme pour les rapprocher, relâche, '
              + 'puis glisse un peu plus loin. Sur des chaussettes, ça glisse mieux.' }),
          P('Hamstring stretch', 'mobility', { type: 'hold', sets: 3, target: 45, perSide: 'côté',
            howTo: 'Talon posé sur un support bas (chaise, marche), jambe tendue. Garde le dos plat et penche-toi depuis '
              + 'les hanches, comme si tu poussais les fesses vers l’arrière. Ne t’enroule pas pour aller chercher les orteils.' }),
          P('Butterfly stretch', 'mobility', { type: 'hold', sets: 2, target: 45,
            howTo: 'Assis, plantes de pieds collées, talons proches du bassin. Dos droit, puis appuie doucement avec '
              + 'les coudes sur les genoux pour les faire descendre.' }),
          P('German hang', 'mobility', { lib: 'German Hang', type: 'hold', sets: 3, target: 20,
            howTo: 'Aux anneaux ou à la barre, passe les jambes entre les bras puis derrière toi (comme un skin the cat), '
              + 'et laisse doucement descendre les épaules vers l’arrière. Garde les pieds au sol si tu peux, pour doser. '
              + 'Si tu as une douleur pointue dans l’épaule, tu arrêtes. '
              + 'Si tu n’as pas de barre ce jour-là : épaules contre le mur, 3 × 30 s.' }),
        ] },
      ],
    },
  ],
};

// Applique le programme aux données et ajoute tes exercices perso dans la famille "Hors chart" (sans doublons).
// Les couleurs, la progression, le poids du gilet et les autres exercices perso sont toujours conservés.
//   weeks : remplacer les semaines A et B
//   daily : remplacer les routines quotidiennes (en gardant la rotation en cours)
function applyDefaultProgram(data, { weeks = true, daily = true } = {}) {
  // Exercice perso → on le cherche (ou on le crée) dans "Hors chart"
  const customItem = (spec) => {
    let item = data.customLibrary.find((c) =>
      c.familyId === CUSTOM_FAMILY_ID && c.name.toLowerCase() === spec.name.toLowerCase());
    if (!item) {
      item = {
        id: `perso-${slugify(spec.name)}`,
        familyId: CUSTOM_FAMILY_ID,
        name: spec.name,
        level: null,
        milestone: false,
        type: spec.type || 'reps',
        category: spec.category,
      };
      data.customLibrary.push(item);
    }
    return item;
  };

  // Identifiant d'un exercice du chart d'après son nom
  const chartId = (name) => {
    const family = LIBRARY_DATA.flatMap((s) => s.families).find((f) => f.items.some(([n]) => n === name));
    return family ? `${family.id}-${slugify(name)}` : null;
  };

  const makeExercise = (spec) => createExercise({
    name: spec.name,
    libraryId: spec.noLibrary ? null : (spec.lib ? chartId(spec.lib) : customItem(spec).id),
    category: spec.category,
    type: spec.type || 'reps',
    sets: spec.sets === undefined ? null : spec.sets,
    target: spec.target === undefined ? null : spec.target,
    toMax: !!spec.toMax,
    perSide: spec.perSide || null,
    vest: !!spec.vest,
    restSec: defaultRest(spec),
    role: spec.warmup ? 'warmup' : 'main',
    note: spec.note || '',
    howTo: spec.howTo || '',
  });

  if (weeks) {
    ['A', 'B'].forEach((w) => {
      data.weeks[w] = createEmptyWeek();
      DAY_KEYS.forEach((key) => {
        const planned = DEFAULT_PROGRAM[w][key];
        const day = data.weeks[w][key];
        if (!planned) { day.rest = true; return; }
        day.title = planned.title;
        day.note = planned.note || '';
        day.exercises = planned.exercises().map(makeExercise);
        sortByRole(day);
      });
    });
  }

  if (daily) {
    data.dailyRoutines = DEFAULT_PROGRAM.daily.map((routine) => {
      // Si la routine existait déjà (même début de nom, même nombre de groupes),
      // on garde sa rotation : le groupe du jour ne change pas.
      const previous = (data.dailyRoutines || []).find((r) =>
        r.name.startsWith(routine.name) && r.groups.length === routine.groups.length);
      return createDailyRoutine({
        name: routine.name,
        reminder: routine.reminder || '',
        rules: routine.rules || '',
        startDate: previous ? previous.startDate : toISODate(new Date()), // sinon : aujourd'hui = groupe 1
        groups: routine.groups.map((g) => createDailyGroup({
          name: g.name,
          color: g.color,
          exercises: g.exercises.map(makeExercise),
        })),
      });
    });
  }

  return data;
}
