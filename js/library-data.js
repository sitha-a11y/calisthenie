// library-data.js — la bibliothèque de progressions, d'après le chart "Bodyweight Fitness Progressions".
//
// Noms : ceux de ta liste. Niveaux : d'après les couleurs du chart.
// Chaque exercice s'écrit [nom, niveau, milestone, type] :
//   niveau    : 'D' Débutant (vert), 'I' Intermédiaire (bleu), 'A' Avancé (jaune), 'E' Élite (orange),
//               '?' = pas sûr d'après l'image (à confirmer)
//   milestone : 1 = étape clé ★ (facultatif)
//   type      : 'reps' ou 'hold' si différent du type de la famille (facultatif)
// Les familles sont rangées du plus facile au plus dur.

const LEVELS = {
  beginner: { label: 'Débutant', short: 'Débutant', color: '#51cf66' },
  intermediate: { label: 'Intermédiaire', short: 'Inter.', color: '#4dabf7' },
  advanced: { label: 'Avancé', short: 'Avancé', color: '#fcc419' },
  elite: { label: 'Élite', short: 'Élite', color: '#ff922b' },
};
const LEVEL_KEYS = ['beginner', 'intermediate', 'advanced', 'elite'];
const LEVEL_CODES = { D: 'beginner', I: 'intermediate', A: 'advanced', E: 'elite', '?': null };

const CUSTOM_FAMILY_ID = 'hors-chart';

const LIBRARY_DATA = [
  { section: 'Horizontal Pull', families: [
    { id: 'rows', name: 'Rows', category: 'pull', type: 'reps', items: [
      ['Vertical Row', 'D'], ['Incline Row', 'D'], ['Row', 'D', 1], ['Wide Row', 'D'], ['Archer Row', 'D'],
      ['Straddle OA Row', 'I'], ['One Arm Row', 'I', 1],
    ] },
    { id: 'front-lever', name: 'Front Lever', category: 'pull', type: 'hold', items: [
      ['Tuck FL', 'D'], ['Adv Tuck FL', 'D'], ['One Leg FL', 'I'], ['Straddle FL', 'I'], ['Front Lever', 'I', 1],
      ['Front Lever to Inverted', 'I', 0, 'reps'], ['Hang Pull to Inverted', 'A', 0, 'reps'], ['Circle Front Lever', 'A', 0, 'reps'],
    ] },
    { id: 'front-lever-rows', name: 'Front Lever Rows', category: 'pull', type: 'reps', items: [
      ['Tuck FL Row', 'D'], ['Adv Tuck FL Row', 'I'], ['Straddle FL Row', 'I'], ['Front Lever Row', 'A', 1],
    ] },
    { id: 'back-lever', name: 'Back Lever', category: 'pull', type: 'hold', items: [
      ['German Hang', 'D'], ['Skin the Cat', 'D', 0, 'reps'], ['Tuck BL', 'D'], ['Adv Tuck BL', 'D'], ['Straddle BL', 'D'],
      ['One Leg BL', 'I'], ['Back Lever', 'I', 1], ['BL Pullout', 'I', 0, 'reps'], ['German Hang Pullout', 'I', 0, 'reps'],
      ['Bent Arm Pull Up to BL', 'A', 0, 'reps'], ['HS Lower to Back Lever', 'A', 0, 'reps'],
    ] },
  ] },

  { section: 'Vertical Pull', families: [
    { id: 'pull-up', name: 'Pull Up', category: 'pull', type: 'reps', items: [
      ['Scapular Shrug', 'D'], ['Arch Hang', 'D'], ['Pull Up Negative', 'D'], ['Pull Up', 'D', 1], ['L-Pull Up', 'D'], ['Pullover', 'D'],
    ] },
    { id: 'muscle-up', name: 'Muscle Up', category: 'pull', type: 'reps', items: [
      ['Kipping PU', 'D'], ['Chest to Bar PU', 'D'], ['Kipping MU', 'D'], ['Muscle Up', 'D', 1],
    ] },
    { id: 'one-arm-pull-up', name: 'One Arm Pull Up', category: 'pull', type: 'reps', items: [
      // Le chart a "Ring L-Pull Up" (vert) ET "Wide Ring L-Pull Up" (bleu) : niveau à confirmer
      ['Wide Ring L-Pull Up', '?'], ['Wide Ring Pull Up', 'D'], ['Ring Archer Pull Up', 'I'],
      ['One Arm Pull Up Negative', 'I'], ['One Arm Pull Up', 'I', 1],
    ] },
  ] },

  { section: 'Vertical Push', families: [
    { id: 'dips', name: 'Dips', category: 'push', type: 'reps', items: [
      ['Parallel Bar Support Hold', 'D', 0, 'hold'], ['Dip Negative', 'D'], ['Dip', 'D', 1], ['L-Dip', 'D'],
    ] },
    { id: 'ring-dips', name: 'Ring Dips', category: 'push', type: 'reps', items: [
      ['Ring Support Hold', 'D', 0, 'hold'], ['RTO Support Hold', 'D', 0, 'hold'], ['Ring Dip Negative', 'D'], ['Ring Dip', 'D', 1],
      ['RTO Dip', 'D'], ['Bulgarian Dip', 'D'], ['Ring L-Dip', 'D'],
    ] },
    { id: 'l-sit', name: 'L-Sit / V-Sit', category: 'core', type: 'hold', items: [
      ['Foot Supported L-Sit', 'D'], ['One Leg L-Sit', 'D'], ['Tuck L-Sit', 'D'], ['One Leg Bent L-Sit', 'D'], ['L-Sit', 'D', 1],
      ['Straddle L-Sit', 'D'], ['RTO L-Sit', 'D'], ['45° V-Sit', 'I'], ['140° V-Sit', 'A'], ['170° V-Sit', 'A'], ['Manna', 'A', 1],
    ] },
    { id: 'bridge', name: 'Bridge', category: 'mobility', type: 'hold', items: [
      ['Shoulder Bridge', 'D'], ['Table Bridge', 'D'], ['Angled Bridge', 'D'], ['Head Bridge', 'D'], ['Bridge', 'D', 1],
      ['Decline Bridge', 'D'], ['One Leg Bridge', 'D'], ['Decline OL Bridge', 'D'], ['One Arm Head Bridge', 'D'], ['One Arm Bridge', 'D'],
    ] },
    { id: 'handstand', name: 'Handstand', category: 'push', type: 'hold', items: [
      ['Wall Plank', 'D'], ['Wall HS', 'D'], ['Handstand', 'D', 1], ['Ring Shoulder Stand', 'D'], ['Ring Handstand', 'I', 1],
    ] },
    { id: 'hspu', name: 'HSPU', category: 'push', type: 'reps', items: [
      ['Pike HeS PU', 'D'], ['Box HeS PU', 'D'], ['Wall HeS PU Negative', 'D'], ['Wall HeS PU', 'D'], ['Wall HS PU', 'D'],
      ['Handstand Push Up', 'I', 1],
    ] },
    { id: 'one-arm-handstand', name: 'One Arm Handstand', category: 'push', type: 'hold', items: [
      ['Side to Side Shift', 'I'], ['Side Flexion', 'I'], ['Palm Up', 'I'], ['Up on Fingertips', 'I'],
      ['Reduce Number of Fingers', 'I'], ['Elbow Lift', 'I'], ['One Arm Handstand', 'A', 1],
    ] },
  ] },

  { section: 'Horizontal Push', families: [
    { id: 'push-up', name: 'Push Up', category: 'push', type: 'reps', items: [
      ['Incline Push Up', 'D'], ['Push Up', 'D', 1], ['Diamond Push Up', 'D'], ['Pike Push Up', 'D'], ['Decline Pike Push Up', 'D'],
    ] },
    { id: 'ring-push-up', name: 'Ring Push Up', category: 'push', type: 'reps', items: [
      ['Ring Wide PU', 'D'], ['Ring PU', 'D'], ['RTO PU', 'D'], ['RTO Archer PU', 'I'], ['RTO PP PU', 'I'], ['RTO Maltese PU', 'I'],
    ] },
    { id: 'one-arm-push-up', name: 'One Arm Push Up', category: 'push', type: 'reps', items: [
      ['Archer Push Up', 'D'], ['Incline One Arm PU', 'D'], ['Straddle One Arm PU', 'I'], ['Ring Straddle One Arm PU', 'I'],
      ['One Arm Push Up', 'I', 1], ['Ring One Arm PU', 'I'],
    ] },
    { id: 'elbow-lever', name: 'Elbow Lever', category: 'push', type: 'hold', items: [
      ['Plank', 'D'], ['One Arm Plank', 'D'], ['Planche Lean', 'D'], ['Frog Stand / Crow Pose', 'D', 1], ['Bent Leg Elbow Lever', 'D'],
      ['Elbow Lever', 'D', 1], ['One Arm Straddle Elbow Lever', 'D'], ['One Arm Elbow Lever', 'D', 1],
    ] },
    { id: 'planche', name: 'Planche', category: 'push', type: 'hold', items: [
      ['Straight Arm Frog Stand', 'D'], ['Tuck Planche', 'D'], ['Adv Tuck Planche', 'I'], ['Straddle Planche', 'I'],
      ['One Leg Planche', 'I'], ['Planche', 'A', 1],
    ] },
    { id: 'planche-push-up', name: 'Planche Push Up', category: 'push', type: 'reps', items: [
      ['Wall PP Push Up', 'A'], ['Tuck PL PU', 'I'], ['Adv Tuck PL PU', 'I'], ['Straddle Planche PU', 'A'],
      ['One Leg Planche PU', 'A'], ['Planche Push Up', 'E', 1],
    ] },
    { id: 'ring-planche', name: 'Ring Planche', category: 'push', type: 'hold', items: [
      ['Ring Frog Stand', 'D'], ['Ring Straight Arm Frog Stand', 'D'], ['Ring Tuck Planche', 'I'], ['Ring Adv Tuck PL', 'I'],
      ['Ring Straddle PL', 'A'], ['Ring One Leg PL', 'A'], ['Ring Planche', 'E', 1], ['Maltese', 'E', 1],
    ] },
    { id: 'ring-planche-push-up', name: 'Ring Planche Push Up', category: 'push', type: 'reps', items: [
      ['Ring Adv Tuck PL PU', 'A'], ['Ring Straddle PL PU', 'A'], ['Ring One Leg PL PU', 'E'], ['Ring Planche Push Up', 'E', 1],
    ] },
  ] },

  { section: 'Human Flag', families: [
    { id: 'human-flag-prereq', name: 'Prérequis', category: 'core', type: 'reps', items: [
      ['Side Plank', 'D', 0, 'hold'], ['Pull Up', 'D'], ['One Arm Hang', 'D', 0, 'hold'], ['Pike Push Up', 'D'],
    ] },
    { id: 'human-flag', name: 'Progression', category: 'core', type: 'hold', items: [
      ['Tuck Flag', 'D'], ['Advanced Tuck Flag', 'I'], ['Straddle Flag', 'I'], ['Human Flag / Side Planche', 'I', 1],
    ] },
  ] },

  { section: 'Legs', families: [
    { id: 'squat', name: 'Squat', category: 'legs', type: 'reps', items: [
      ['Assisted Squat', 'D'], ['Parallel Squat', 'D'], ['Squat', 'D', 1],
    ] },
    { id: 'pistol', name: 'Pistol', category: 'legs', type: 'reps', items: [
      ['Side to Side Squat', 'D'], ['Partial Pistol Squat', 'D'], ['Assisted Pistol Squat', 'D'], ['Pistol Squat', 'D', 1],
    ] },
    { id: 'split-squat', name: 'Split Squat', category: 'legs', type: 'reps', items: [
      ['Split Squat', 'D'], ['Bulgarian Split Squat', 'D'],
    ] },
    { id: 'shrimp', name: 'Shrimp', category: 'legs', type: 'reps', items: [
      ['Beginner Shrimp Squat', 'D'], ['Step Up', 'D'], ['Deep Step Up', 'D'], ['Intermediate Shrimp Squat', 'D'],
      ['Shrimp Squat', 'D', 1], ['Two Hand Shrimp Squat', 'D'], ['Elevated Shrimp Squat', 'D'],
    ] },
    { id: 'hamstrings', name: 'Ischios', category: 'legs', type: 'reps', items: [
      ['One Leg Deadlift', 'D'], ['90° Hip Nordic Curl', 'D'], ['45° Hip Nordic Curl', 'D'], ['Nordic Curl Negative', 'D'],
      ['Nordic Curl', 'D', 1],
    ] },
  ] },

  { section: 'Core', families: [
    { id: 'lower-back', name: 'Lombaires', category: 'core', type: 'reps', items: [
      ['Reverse Hyperextension', 'D'], ['Hyperextension', 'D'],
    ] },
    { id: 'abs', name: 'Abdos', category: 'core', type: 'reps', items: [
      ['Tuck Up Crunch', 'D'], ['Seated Pike Leg Lift', 'D'],
    ] },
    { id: 'hanging', name: 'Hanging', category: 'core', type: 'reps', items: [
      ['Hanging Knees to Chest', 'D'], ['Hanging Bent Leg Toes to Bar', 'D'], ['Hanging Straight Leg Toes to Bar', 'D'],
    ] },
    { id: 'dragon-flag', name: 'Dragon Flag', category: 'core', type: 'reps', items: [
      ['Tuck Dragon Flag Negative', 'D'], ['Advanced Tuck Dragon Flag', 'D'], ['Straddle or One Leg Dragon Flag', 'D'],
      ['Dragon Flag', 'D', 1],
    ] },
  ] },

  { section: 'Perso', families: [
    // Tes exercices perso (ajoutés depuis l'app, ou par le programme de départ)
    { id: CUSTOM_FAMILY_ID, name: 'Hors chart', category: null, type: 'reps', items: [] },
  ] },
];

// "45° Hip Nordic Curl" → "45-hip-nordic-curl" (pour fabriquer des identifiants)
function slugify(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Construit la bibliothèque complète : celle du chart + tes exercices ajoutés.
// Chaque exercice devient { id, name, level, milestone, type, category, familyId, custom }
function buildLibrary() {
  return LIBRARY_DATA.map((section) => ({
    section: section.section,
    families: section.families.map((family) => {
      const items = family.items.map(([name, code, milestone, type]) => ({
        id: `${family.id}-${slugify(name)}`,
        name,
        level: LEVEL_CODES[code],
        milestone: !!milestone,
        type: type || family.type,
        category: family.category,
        familyId: family.id,
        custom: false,
      }));
      appData.customLibrary
        .filter((c) => c.familyId === family.id)
        .forEach((c) => items.push({
          id: c.id,
          name: c.name,
          level: c.level || null,
          milestone: !!c.milestone,
          type: c.type || family.type,
          category: c.category !== undefined ? c.category : family.category,
          familyId: family.id,
          custom: true,
        }));
      return { id: family.id, name: family.name, category: family.category, type: family.type, items };
    }),
  }));
}

// Retrouve un exercice de la bibliothèque par son identifiant
function findLibraryItem(id) {
  for (const section of buildLibrary()) {
    for (const family of section.families) {
      const item = family.items.find((i) => i.id === id);
      if (item) return item;
    }
  }
  return null;
}

// Retrouve un exercice par son nom exact (sans tenir compte des majuscules)
function findLibraryItemByName(name) {
  const wanted = name.toLowerCase();
  for (const section of buildLibrary()) {
    for (const family of section.families) {
      const item = family.items.find((i) => i.name.toLowerCase() === wanted);
      if (item) return item;
    }
  }
  return null;
}
