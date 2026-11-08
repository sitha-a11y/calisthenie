// storage.js — la forme des données, et leur lecture/enregistrement dans le navigateur (localStorage).

const STORAGE_KEY = 'calisthenie-data';
const DATA_VERSION = 1;

// ---------- Catégories ----------

// Les catégories, dans l'ordre d'affichage, avec leur couleur par défaut
const CATEGORY_KEYS = ['push', 'pull', 'legs', 'core', 'neck', 'cardio', 'mobility'];

function createDefaultCategories() {
  return {
    push: { name: 'Push', color: '#ff6b6b' },
    pull: { name: 'Pull', color: '#4dabf7' },
    legs: { name: 'Jambes', color: '#51cf66' },
    core: { name: 'Core', color: '#fcc419' },
    neck: { name: 'Cou', color: '#ff922b' },
    cardio: { name: 'Cardio', color: '#f06595' },
    mobility: { name: 'Mobilité/Étirements', color: '#9775fa' },
  };
}

// La couleur à afficher pour un exercice : sa couleur perso, sinon celle de sa catégorie
function exerciseColor(exercise) {
  if (exercise.color) return exercise.color;
  const category = appData.categories[exercise.category];
  return category ? category.color : null;
}

// ---------- Exercices, jours, semaines ----------

// Fabrique un identifiant unique, ex. "ex_lq3k9a1f2b"
function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Un exercice avec toutes ses cases (les cases données dans "fields" remplacent les valeurs par défaut)
function createExercise(fields = {}) {
  return Object.assign({
    id: newId('ex'),
    name: '',
    libraryId: null,   // lien vers la bibliothèque
    category: null,    // catégorie de couleur
    type: 'reps',      // "reps", "hold" (secondes) ou "distance" (mètres)
    sets: null,        // null = pas encore rempli
    target: null,      // nombre de reps, secondes de maintien, ou mètres
    toMax: false,      // true = "max" (jusqu'à l'échec) au lieu d'un nombre
    perSide: null,     // null, "côté", "jambe" ou "bras" → affiché "/jambe"
    weightKg: 0,
    vest: false,       // true = lesté avec le gilet (poids réglé dans Réglages)
    restSec: null,
    role: 'main',      // "warmup" (échauffement) ou "main" (principal)
    note: '',
    howTo: '',         // explication "Comment faire" (bloc dépliable)
    progressRule: null, // règle de progression (null = règle automatique selon le type d'exercice)
    color: null,       // couleur perso (null = couleur de la catégorie)
  }, fields);
}

// Copie indépendante d'un exercice, avec un nouvel identifiant
function cloneExercise(exercise) {
  return Object.assign(JSON.parse(JSON.stringify(exercise)), { id: newId('ex') });
}

// Copie indépendante d'un jour entier
function cloneDay(day) {
  return { title: day.title, note: day.note, rest: day.rest, exercises: day.exercises.map(cloneExercise) };
}

// Range les échauffements avant les exercices principaux (sans changer l'ordre à l'intérieur)
// "owner" = tout ce qui contient une liste d'exercices (un jour, un groupe d'étirements)
function sortByRole(owner) {
  owner.exercises = [
    ...owner.exercises.filter((e) => e.role === 'warmup'),
    ...owner.exercises.filter((e) => e.role !== 'warmup'),
  ];
}

function createEmptyDay() {
  return { title: '', note: '', rest: false, exercises: [] }; // note : ex. "~70 min" ou "Natation"
}

function createEmptyWeek() {
  const week = {};
  DAY_KEYS.forEach((key) => { week[key] = createEmptyDay(); });
  return week;
}

// ---------- Routines quotidiennes ----------

// Un groupe (ex. "Groupe 1", bleu) d'une routine quotidienne
function createDailyGroup(fields = {}) {
  return Object.assign({ id: newId('grp'), name: 'Groupe 1', color: '#4dabf7', exercises: [] }, fields);
}

function createDailyRoutine(fields = {}) {
  return Object.assign({
    id: newId('daily'),
    name: 'Nouvelle routine',
    startDate: toISODate(new Date()), // ce jour-là, c'est le groupe 1 ; ensuite ça tourne
    reminder: '', // rappel affiché en haut (ex. "Tension 6-7/10…")
    rules: '',    // règles de progression affichées en bas
    groups: [createDailyGroup()],
  }, fields);
}

// Numéro (0, 1, 2…) du groupe à faire à une date donnée : les groupes tournent chaque jour
function dailyGroupIndexFor(routine, date) {
  const count = routine.groups.length;
  if (count === 0) return -1;
  const days = daysBetween(parseISODate(routine.startDate), date);
  return ((days % count) + count) % count;
}

// Exercices épinglés en haut de l'onglet Progrès (par nom)
const DEFAULT_PINNED = [
  'Pompes', 'Tractions', 'Ring Dip', 'Front Lever', 'Tuck Planche', 'Adv Tuck Planche', 'One Arm Pull Up', 'Kick-ups libres',
];

// ---------- Données complètes ----------

function createDefaultData() {
  return {
    version: DATA_VERSION,
    settings: {
      weekAReference: toISODate(mondayOf(new Date())), // par défaut : cette semaine = A
      createdAt: toISODate(new Date()),
      lastExport: null,
      reminderSnoozedUntil: null, // rappel de sauvegarde mis en pause jusqu'à cette date
      vestKg: 7,                  // poids du gilet lesté
      testCycleStart: toISODate(mondayOf(new Date())), // départ du cycle de 4 semaines (la 4e = semaine de test)
      testBannerDismissed: null,  // lundi de la semaine de test dont le bandeau a été fermé
    },
    categories: createDefaultCategories(),
    weeks: { A: createEmptyWeek(), B: createEmptyWeek() },
    dailyRoutines: [],
    customLibrary: [], // exercices ajoutés à la bibliothèque
    progress: {},      // statut des skills : { idExercice: "inProgress" | "done" }
    // Journal de performances, rangé par NOM d'exercice (partagé entre les jours) :
    // { "tractions": { name: "Tractions", entries: [{ id, date, value, unit, weightKg, note }] } }
    performances: {},
    pinned: [...DEFAULT_PINNED],
    // Séances terminées en mode séance : [{ id, date, kind, week, day, routineId, title, durationSec, setsDone }]
    sessionLog: [],
  };
}

// Complète les cases manquantes (utile pour les anciennes données et les fichiers importés)
function normalizeData(data) {
  const defaults = createDefaultData();
  data.version = data.version || DATA_VERSION;
  data.settings = Object.assign({}, defaults.settings, data.settings);

  // On garde les couleurs choisies, et on ajoute les catégories manquantes
  const savedCategories = data.categories || {};
  data.categories = {};
  CATEGORY_KEYS.forEach((key) => {
    data.categories[key] = Object.assign({}, defaults.categories[key], savedCategories[key]);
  });

  data.weeks = data.weeks || {};
  ['A', 'B'].forEach((w) => {
    data.weeks[w] = data.weeks[w] || {};
    DAY_KEYS.forEach((key) => {
      const day = Object.assign(createEmptyDay(), data.weeks[w][key]);
      day.exercises = (day.exercises || []).map((ex) => createExercise(ex));
      data.weeks[w][key] = day;
    });
  });

  data.dailyRoutines = (data.dailyRoutines || []).map((routine) => {
    const r = createDailyRoutine(routine);
    r.groups = (r.groups || []).map((g) => {
      const group = createDailyGroup(g);
      group.exercises = (group.exercises || []).map((ex) => createExercise(ex));
      return group;
    });
    return r;
  });

  data.customLibrary = Array.isArray(data.customLibrary) ? data.customLibrary : [];
  data.progress = data.progress && typeof data.progress === 'object' ? data.progress : {};
  data.performances = data.performances && typeof data.performances === 'object' ? data.performances : {};
  Object.values(data.performances).forEach((record) => {
    record.entries = Array.isArray(record.entries) ? record.entries : [];
  });
  data.pinned = Array.isArray(data.pinned) ? data.pinned : [...DEFAULT_PINNED];
  data.sessionLog = Array.isArray(data.sessionLog) ? data.sessionLog : [];
  return data;
}

// Charge les données enregistrées, ou crée les données de départ
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeData(JSON.parse(raw));
  } catch (error) {
    console.error('Lecture impossible, données de départ utilisées.', error);
  }
  return createInitialData();
}

// Données du tout premier lancement : ton programme pré-rempli (voir default-program.js)
function createInitialData() {
  return applyDefaultProgram(createDefaultData());
}

// Enregistre toutes les données
function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Enregistrement impossible.', error);
  }
}
