// default-program.js — ton programme, chargé au premier lancement (sets/reps vides).
//
// P(nom, catégorie, options) décrit un exercice :
//   lib    : nom exact dans la bibliothèque (pour relier l'exercice au chart)
//            sans "lib", l'exercice est ajouté à la famille "Hors chart"
//   warmup : true = échauffement
//   note   : note libre
//   type   : 'reps' ou 'hold' (sinon : celui de la bibliothèque, ou "reps")
const P = (name, category, options = {}) => Object.assign({ name, category }, options);

const DEFAULT_PROGRAM = {
  restDays: ['mon', 'thu', 'fri'],
  A: {
    tue: { title: 'Cou + gainage léger', exercises: [
      P('Neck curls', 'neck'),
      P('Neck extensions', 'neck'),
      P('Neck side crunches', 'neck'),
      P('Neck bridges chaise', 'neck', { note: 'Léger et contrôlé' }),
      P('Shrugs', 'neck'),
      P('Ab wheel', 'core'),
      P('Hollow rock hold', 'core', { type: 'hold' }),
    ] },
    wed: { title: 'Push horizontal (planche)', exercises: [
      P('Planche Lean', 'push', { lib: 'Planche Lean', warmup: true }),
      P('Tuck Planche', 'push', { lib: 'Tuck Planche' }),
      P('Tuck PL PU', 'push', { lib: 'Tuck PL PU' }),
      P('L-sit to tuck planche', 'push'),
      P('One Arm Push Up', 'push', { lib: 'One Arm Push Up' }),
      P('RTO PU', 'push', { lib: 'RTO PU' }),
      P('Skull crushers', 'push'),
      P('Pompes doigts', 'push'),
    ] },
    sat: { title: 'Pull horizontal (levers)', exercises: [
      P('Skin the Cat', 'pull', { lib: 'Skin the Cat', warmup: true }),
      P('Max full front lever', 'pull', { lib: 'Front Lever', note: '1-2 essais' }),
      P('Front lever hold', 'pull', { lib: 'Front Lever', note: '5 s descente, 5 s montée' }),
      P('Back Lever', 'pull', { lib: 'Back Lever' }),
      P('Adv Tuck FL Row', 'pull', { lib: 'Adv Tuck FL Row', note: 'To failure, puis L tuck FL rows' }),
      P('Tuck BL', 'pull', { lib: 'Tuck BL' }),
      P('YTL rings', 'pull'),
      P('One Arm Row', 'pull', { lib: 'One Arm Row' }),
      P('Bicep curl one arm', 'pull'),
      P('Dead hang', 'pull', { type: 'hold' }),
    ] },
    sun: { title: 'Jambes', exercises: [
      P('Saut masaï', 'legs', { note: 'Alterner avec single leg weighted box jumps' }),
      P('Pistol Squat', 'legs', { lib: 'Pistol Squat' }),
      P('Shrimp Squat', 'legs', { lib: 'Shrimp Squat' }),
      P('Sissy squat', 'legs'),
      P('Nordic Curl', 'legs', { lib: 'Nordic Curl', note: 'Nordic hamstring curl' }),
      P('Hip thrusts', 'legs'),
      P('One leg calf raises', 'legs', { note: '+ exo anti-périostite' }),
    ] },
  },
  B: {
    tue: { title: 'Gainage + cou léger', exercises: [
      P('Advanced Tuck Dragon Flag', 'core', { lib: 'Advanced Tuck Dragon Flag' }),
      P('Ab wheel', 'core'),
      P('Hanging Straight Leg Toes to Bar', 'core', { lib: 'Hanging Straight Leg Toes to Bar' }),
      P('Abs L raise fesses au sol', 'core'),
      P('Hollow rock hold', 'core', { type: 'hold' }),
      P('Neck curls', 'neck'),
      P('Neck extensions', 'neck'),
    ] },
    wed: { title: 'Push vertical (handstand)', exercises: [
      P('Wall Plank', 'push', { lib: 'Wall Plank', warmup: true }),
      P('Frog Stand / Crow Pose', 'push', { lib: 'Frog Stand / Crow Pose', warmup: true }),
      P('Handstand libre', 'push', { lib: 'Handstand', note: '5-10 min' }),
      P('Wall HS PU', 'push', { lib: 'Wall HS PU' }),
      P('V-sit to tuck planche', 'push'),
      P('Bulgarian Dip', 'push', { lib: 'Bulgarian Dip', note: 'Alterner avec korean dips d’une semaine B à l’autre' }),
      P('Bridge one leg pushups', 'push'),
    ] },
    sat: { title: 'Pull vertical', exercises: [
      P('Muscle Up', 'pull', { lib: 'Muscle Up' }),
      P('One Arm Pull Up', 'pull', { lib: 'One Arm Pull Up', note: '+ négatives (même bloc)' }),
      P('Archer pull-ups', 'pull', { note: 'Alterner avec hammer pull-ups' }),
      P('Hefesto curl', 'pull'),
      P('6 fingers pull-ups', 'pull'),
      P('Dead hang', 'pull', { type: 'hold' }),
    ] },
    sun: { title: 'HIIT + jambes', exercises: [
      P('Pistol Squat', 'legs', { lib: 'Pistol Squat' }),
      P('Nordic Curl', 'legs', { lib: 'Nordic Curl', note: 'Nordic hamstring curl' }),
      P('Saut masaï', 'cardio', { note: 'Début du HIIT' }),
      P('Lunge claps', 'cardio'),
      P('Burpees', 'cardio'),
      P('Carré grappling', 'cardio'),
      P('Squat jumps', 'cardio'),
      P('Sprint', 'cardio'),
    ] },
  },
  daily: [
    { name: 'Étirements matin', groups: [
      { name: 'Groupe 1', color: '#4dabf7', exercises: [
        P('Figure 4 stretch (pigeon)', 'mobility'),
        P('Hip flexor stretch', 'mobility'),
        P('Chest stretch', 'mobility'),
        P('Lat stretch', 'mobility'),
        P('Poignets (étirement + mobilité)', 'mobility'),
        P('Chevilles', 'mobility'),
      ] },
      { name: 'Groupe 2', color: '#9775fa', exercises: [
        P('Pancake stretch', 'mobility'),
        P('Middle split', 'mobility'),
        P('Hamstring stretch', 'mobility'),
        P('Butterfly stretch', 'mobility'),
        P('German hang (épaules)', 'mobility', { lib: 'German Hang' }),
        P('Poignets', 'mobility'),
      ] },
    ] },
  ],
};

// Applique le programme aux données : remplace les semaines A/B et les routines quotidiennes,
// et ajoute tes exercices perso dans la famille "Hors chart" (sans doublons).
// Les couleurs, la progression et les autres exercices perso sont conservés.
function applyDefaultProgram(data) {
  // Exercice perso → on le cherche (ou on le crée) dans "Hors chart"
  const customItem = (spec, defaultType) => {
    let item = data.customLibrary.find((c) =>
      c.familyId === CUSTOM_FAMILY_ID && c.name.toLowerCase() === spec.name.toLowerCase());
    if (!item) {
      item = {
        id: `perso-${slugify(spec.name)}`,
        familyId: CUSTOM_FAMILY_ID,
        name: spec.name,
        level: null,
        milestone: false,
        type: spec.type || defaultType,
        category: spec.category,
      };
      data.customLibrary.push(item);
    }
    return item;
  };

  const makeExercise = (spec, defaultType) => {
    let libraryId = null;
    let type = spec.type || defaultType;
    if (spec.lib) {
      const found = LIBRARY_DATA.flatMap((s) => s.families).find((f) =>
        f.items.some(([name]) => name === spec.lib));
      if (found) {
        const [name, , , itemType] = found.items.find(([n]) => n === spec.lib);
        libraryId = `${found.id}-${slugify(name)}`;
        type = spec.type || itemType || found.type;
      }
    } else {
      libraryId = customItem(spec, defaultType).id;
    }
    return createExercise({
      name: spec.name,
      libraryId,
      category: spec.category,
      type,
      role: spec.warmup ? 'warmup' : 'main',
      note: spec.note || '',
    });
  };

  ['A', 'B'].forEach((w) => {
    data.weeks[w] = createEmptyWeek();
    DAY_KEYS.forEach((key) => {
      const day = data.weeks[w][key];
      if (DEFAULT_PROGRAM.restDays.includes(key)) day.rest = true;
      const planned = DEFAULT_PROGRAM[w][key];
      if (planned) {
        day.title = planned.title;
        day.exercises = planned.exercises.map((spec) => makeExercise(spec, 'reps'));
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
      exercises: g.exercises.map((spec) => makeExercise(spec, 'hold')),
    })),
  }));

  return data;
}
