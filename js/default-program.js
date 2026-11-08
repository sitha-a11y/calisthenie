// default-program.js — ton programme de départ, chargé au premier lancement
// (et par Réglages → « Charger mon programme de départ »).
//
// P(nom, catégorie, options) décrit un exercice ; W(...) pareil pour un échauffement.
// Options :
//   lib     : nom exact dans la bibliothèque (relie l'exercice au chart) ;
//             sans "lib", l'exercice est ajouté à la famille "Hors chart"
//   type    : 'reps' (par défaut), 'hold' (secondes) ou 'distance' (mètres)
//   sets, target : ex. 3 × 12 → sets: 3, target: 12 ; un bloc "5 min" → type 'hold', target: 300
//   toMax   : true = "max"
//   perSide : 'côté', 'jambe' ou 'bras'
//   vest    : true = avec le gilet lesté
//   rest    : repos en secondes (sinon : la règle par défaut, voir defaultRest)
//   note    : note libre
const P = (name, category, options = {}) => Object.assign({ name, category }, options);
const W = (name, category, options = {}) => P(name, category, Object.assign({ warmup: true }, options));

const BOX_NOTE = 'Banc, marche ou muret';
const HIP_THRUST_NOTE = 'Gilet sur les hanches, dos sur un canapé ou un lit';

// Repos par défaut : 2 min 30 pour les skills et la force, 1 min pour le gainage et le cou.
// Pas de repos pour les échauffements, les blocs de temps (ex. "Kick-ups 5 min")
// ni les étirements du matin (routine de 10-12 min).
function defaultRest(spec) {
  if (spec.rest !== undefined) return spec.rest;
  if (spec.warmup || spec.sets === undefined || spec.category === 'mobility') return null;
  if (spec.category === 'core' || spec.category === 'neck') return 60;
  return 150;
}

// Les échauffements qui reviennent plusieurs fois
const wristsShoulders = (cat) => W('Poignets + épaules', cat, { type: 'hold', target: 180, note: 'Rotations, scap push-ups 2 × 10' });
const wallHandstand = (cat, sets = 3, target = 30) => W('Handstand ventre face au mur', cat, { lib: 'Wall HS', type: 'hold', sets, target });
const legsWarmup = () => W('Squats + fentes + chevilles', 'legs', { type: 'hold', target: 300 });
const scapPulls = () => W('Scapular pulls', 'pull', { lib: 'Scapular Shrug', sets: 2, target: 8 });
// Fin de séance jambes (A et B)
const legsEnd = () => [
  P('Hip thrust', 'legs', { sets: 3, target: 12, rest: 90, vest: true, note: HIP_THRUST_NOTE }),
  P('Mollets 1 jambe', 'legs', { sets: 3, target: 15, perSide: 'jambe', rest: 60, vest: true }),
  P('Exo anti-périostite', 'legs', { sets: 2, target: 20, rest: 60 }),
];

const DEFAULT_PROGRAM = {
  // Jours de repos, identiques en semaine A et B
  restDays: { mon: 'Natation', tue: 'Boxe plus tard', thu: 'Boxe plus tard' },

  A: {
    wed: { title: 'Push horizontal (planche)', note: '~70 min', exercises: [
      wristsShoulders('push'),
      wallHandstand('push'),
      W('Kick-ups handstand', 'push', { lib: 'Handstand', type: 'hold', target: 180 }),
      W('Planche Lean', 'push', { lib: 'Planche Lean', type: 'hold', sets: 3, target: 15 }),
      P('Tuck Planche', 'push', { lib: 'Tuck Planche', type: 'hold', sets: 3, target: 15 }),
      P('Adv Tuck Planche', 'push', { lib: 'Adv Tuck Planche', type: 'hold', sets: 4, target: 5 }),
      P('Tuck PL Push Up', 'push', { lib: 'Tuck PL PU', sets: 3, target: 5 }),
      P('One Arm Push Up', 'push', { lib: 'One Arm Push Up', sets: 3, target: 5, perSide: 'bras' }),
      P('RTO Push Up', 'push', { lib: 'RTO PU', sets: 3, target: 10, rest: 90 }),
      P('Pompes doigts', 'push', { sets: 2, toMax: true, rest: 90 }),
    ] },
    fri: { title: 'Jambes', note: '~60 min', exercises: [
      legsWarmup(),
      W('Saut masaï', 'legs', { sets: 3, target: 20 }),
      P('Pistol Squat lesté', 'legs', { lib: 'Pistol Squat', sets: 4, target: 5, perSide: 'jambe', vest: true,
        note: 'Si trop dur, faire 4 × 3 puis remonter à 5' }),
      P('Shrimp Squat', 'legs', { lib: 'Shrimp Squat', sets: 3, target: 6, perSide: 'jambe' }),
      P('Nordic Curl', 'legs', { lib: 'Nordic Curl', sets: 3, target: 5, note: 'Négatives si besoin' }),
      P('Sissy squat', 'legs', { sets: 3, target: 10, rest: 90 }),
      ...legsEnd(),
    ] },
    sat: { title: 'Pull horizontal (levers)', note: '~70 min', exercises: [
      scapPulls(),
      wallHandstand('pull'),
      W('Skin the Cat', 'pull', { lib: 'Skin the Cat', sets: 2, target: 3 }),
      P('Front Lever', 'pull', { lib: 'Front Lever', type: 'hold', sets: 1, toMax: true, note: 'Test, 1 seul essai' }),
      P('Straddle FL', 'pull', { lib: 'Straddle FL', type: 'hold', sets: 5, target: 6 }),
      P('Négatives front lever', 'pull', { lib: 'Front Lever', sets: 3, target: 3, note: '5 s de descente' }),
      P('Back lever', 'pull', { lib: 'Back Lever', type: 'hold', sets: 3, target: 10, note: 'À ton niveau : tuck, straddle ou full' }),
      P('Adv Tuck FL Row', 'pull', { lib: 'Adv Tuck FL Row', sets: 3, target: 8 }),
      P('One Arm Row', 'pull', { lib: 'One Arm Row', sets: 3, target: 6, perSide: 'bras', rest: 90 }),
      P('YTL anneaux', 'pull', { sets: 2, target: 8, rest: 60 }),
    ] },
    sun: { title: 'Explosivité', note: '~50 min · Récup complète entre les séries, vitesse maximale à chaque rep', exercises: [
      W('Footwork + montées de genoux + 2 sprints progressifs', 'cardio', { type: 'hold', target: 480 }),
      wallHandstand('cardio'),
      P('Box jumps', 'cardio', { sets: 4, target: 3, rest: 120, note: `Sans gilet : la vitesse avant tout. ${BOX_NOTE}` }),
      P('Sauts en longueur', 'cardio', { sets: 4, target: 3, rest: 120, note: 'Sans gilet : la vitesse avant tout' }),
      P('Saut masaï 1 jambe', 'cardio', { sets: 3, target: 10, perSide: 'jambe', rest: 90 }),
      P('Pompes claquées', 'cardio', { sets: 4, target: 5, rest: 120 }),
      P('Muscle Up explosifs', 'cardio', { lib: 'Muscle Up', sets: 3, target: 2, rest: 150, note: 'Le plus haut possible' }),
      P('Sprints', 'cardio', { type: 'distance', sets: 6, target: 20, rest: 120 }),
      P('Finisher burpees + lunge claps', 'cardio', { type: 'hold', sets: 4, target: 20, rest: 40,
        note: '4 tours : 20 s effort / 40 s repos, burpees puis lunge claps. Tant que pas de boxe' }),
    ] },
  },

  B: {
    wed: { title: 'Push vertical (handstand)', note: '~70 min', exercises: [
      wristsShoulders('push'),
      W('Frog Stand', 'push', { lib: 'Frog Stand / Crow Pose', type: 'hold', sets: 3, target: 15 }),
      P('Handstand ventre face au mur', 'push', { lib: 'Wall HS', type: 'hold', sets: 4, target: 40 }),
      P('Kick-ups handstand', 'push', { lib: 'Handstand', type: 'hold', target: 300, note: 'Chercher à tenir sans le mur' }),
      P('Wall HS Push Up', 'push', { lib: 'Wall HS PU', sets: 4, target: 5, note: 'Négatives si besoin' }),
      P('Pike Push Up pieds surélevés', 'push', { lib: 'Decline Pike Push Up', sets: 3, target: 10, rest: 90 }),
      P('Tuck Planche', 'push', { lib: 'Tuck Planche', type: 'hold', sets: 3, target: 15, note: 'Rappel planche' }),
      P('Bulgarian Dip', 'push', { lib: 'Bulgarian Dip', sets: 3, target: 8,
        note: 'Alterner avec Ring Dip + gilet 3 × 6 une semaine B sur deux' }),
      P('V-sit to tuck planche', 'push', { sets: 3, target: 4 }),
      P('Bridge one leg push-ups', 'push', { sets: 2, target: 5, perSide: 'jambe', rest: 90 }),
    ] },
    fri: { title: 'Jambes', note: '~60 min', exercises: [
      legsWarmup(),
      W('Box jumps 1 jambe lestés', 'legs', { sets: 4, target: 3, perSide: 'jambe', vest: true, note: BOX_NOTE }),
      P('Pistol Squat', 'legs', { lib: 'Pistol Squat', sets: 3, target: 6, perSide: 'jambe', note: 'Tempo lent, 3 s de descente' }),
      P('Elevated Shrimp Squat', 'legs', { lib: 'Elevated Shrimp Squat', sets: 3, target: 6, perSide: 'jambe' }),
      P('Nordic Curl', 'legs', { lib: 'Nordic Curl', sets: 3, target: 5 }),
      P('Sprinter lunge', 'legs', { sets: 3, target: 8, perSide: 'jambe', rest: 90, vest: true }),
      ...legsEnd(),
    ] },
    sat: { title: 'Pull vertical (one arm + muscle-up)', note: '~70 min', exercises: [
      scapPulls(),
      wallHandstand('pull'),
      W('Pull-ups faciles', 'pull', { lib: 'Pull Up', sets: 2, target: 5 }),
      P('Muscle Up stricts', 'pull', { lib: 'Muscle Up', sets: 4, target: 4, note: 'Lents, sans kip' }),
      P('One Arm Pull Up', 'pull', { lib: 'One Arm Pull Up', sets: 3, target: 1, perSide: 'bras', rest: 180,
        note: 'Toujours commencer par le bras gauche' }),
      P('One Arm Pull Up Negative', 'pull', { lib: 'One Arm Pull Up Negative', sets: 3, target: 1, perSide: 'bras',
        note: '5 s de descente' }),
      P('Archer pull-ups', 'pull', { sets: 3, target: 5, perSide: 'côté',
        note: 'Alterner avec hammer pull-ups une semaine B sur deux' }),
      P('Straddle FL', 'pull', { lib: 'Straddle FL', type: 'hold', sets: 3, target: 6, note: 'Rappel front lever' }),
      P('Hefesto curl', 'pull', { sets: 3, target: 5, rest: 90 }),
      P('Dead hang', 'pull', { type: 'hold', sets: 1, target: 60, rest: 90 }),
    ] },
    sun: { title: 'Gainage + cou', note: '~35 min', exercises: [
      W('Rotations du cou douces', 'neck', { type: 'hold', target: 60 }),
      P('Adv Tuck Dragon Flag', 'core', { lib: 'Advanced Tuck Dragon Flag', sets: 3, target: 5 }),
      P('Hanging Straight Leg Toes to Bar', 'core', { lib: 'Hanging Straight Leg Toes to Bar', sets: 3, target: 10 }),
      P('Ab wheel', 'core', { sets: 3, target: 8 }),
      P('L raise fesses au sol', 'core', { sets: 3, target: 10 }),
      P('Hollow rock hold', 'core', { type: 'hold', sets: 2, target: 30 }),
      P('Neck curls', 'neck', { sets: 2, target: 15 }),
      P('Neck extensions', 'neck', { sets: 2, target: 15 }),
      P('Neck side crunches', 'neck', { sets: 2, target: 12, perSide: 'côté' }),
      P('Neck bridges chaise', 'neck', { sets: 2, target: 10, note: 'Léger et contrôlé' }),
      P('Shrugs', 'neck', { sets: 3, target: 12 }),
    ] },
  },

  // Tous les jours, 7 j/7 : groupe 1 un jour, groupe 2 le lendemain, sans s'arrêter
  daily: [
    { name: 'Étirements matin (10-12 min)', groups: [
      { name: 'Hanches + haut du corps', color: '#4dabf7', exercises: [
        P('Poignets (flexion/extension au sol)', 'mobility', { type: 'hold', sets: 2, target: 30 }),
        P('Figure 4 stretch (pigeon)', 'mobility', { type: 'hold', sets: 2, target: 45, perSide: 'côté' }),
        P('Hip flexor stretch', 'mobility', { type: 'hold', sets: 2, target: 45, perSide: 'côté' }),
        P('Chest stretch', 'mobility', { type: 'hold', sets: 2, target: 30, perSide: 'côté' }),
        P('Lat stretch', 'mobility', { type: 'hold', sets: 2, target: 30, perSide: 'côté' }),
        P('Chevilles (genou vers le mur)', 'mobility', { type: 'reps', sets: 2, target: 10, perSide: 'côté' }),
      ] },
      { name: 'Grand écart + arrière des jambes', color: '#9775fa', exercises: [
        P('Poignets (flexion/extension au sol)', 'mobility', { type: 'hold', sets: 2, target: 30 }),
        P('Pancake stretch', 'mobility', { type: 'hold', sets: 2, target: 60 }),
        P('Middle split', 'mobility', { type: 'hold', sets: 2, target: 60 }),
        P('Hamstring stretch', 'mobility', { type: 'hold', sets: 2, target: 45, perSide: 'côté' }),
        P('Butterfly stretch', 'mobility', { type: 'hold', sets: 2, target: 45 }),
        P('German hang', 'mobility', { lib: 'German Hang', type: 'hold', sets: 3, target: 15,
          note: 'Ou étirement épaules au mur si pas de barre' }),
      ] },
    ] },
  ],
};

// Applique le programme aux données : remplace les semaines A/B et les routines quotidiennes,
// et ajoute tes exercices perso dans la famille "Hors chart" (sans doublons).
// Les couleurs, la progression, le poids du gilet et les autres exercices perso sont conservés.
function applyDefaultProgram(data) {
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
    libraryId: spec.lib ? chartId(spec.lib) : customItem(spec).id,
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
  });

  ['A', 'B'].forEach((w) => {
    data.weeks[w] = createEmptyWeek();
    DAY_KEYS.forEach((key) => {
      const day = data.weeks[w][key];
      if (DEFAULT_PROGRAM.restDays[key] !== undefined) {
        day.rest = true;
        day.note = DEFAULT_PROGRAM.restDays[key];
      }
      const planned = DEFAULT_PROGRAM[w][key];
      if (planned) {
        day.title = planned.title;
        day.note = planned.note || '';
        day.exercises = planned.exercises.map(makeExercise);
        sortByRole(day);
      }
    });
  });

  data.dailyRoutines = DEFAULT_PROGRAM.daily.map((routine) => createDailyRoutine({
    name: routine.name,
    startDate: toISODate(new Date()), // aujourd'hui = groupe 1
    groups: routine.groups.map((g) => createDailyGroup({
      name: g.name,
      color: g.color,
      exercises: g.exercises.map(makeExercise),
    })),
  }));

  return data;
}
