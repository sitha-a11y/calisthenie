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
    type: 'reps',      // "reps" ou "hold"
    sets: null,        // null = pas encore rempli
    target: null,      // nombre de reps, ou secondes de maintien
    weightKg: 0,
    restSec: null,
    role: 'main',      // "warmup" (échauffement) ou "main" (principal)
    note: '',
    color: null,       // couleur perso (null = couleur de la catégorie)
  }, fields);
}

// Copie indépendante d'un exercice, avec un nouvel identifiant
function cloneExercise(exercise) {
  return Object.assign(JSON.parse(JSON.stringify(exercise)), { id: newId('ex') });
}

// Copie indépendante d'un jour entier
function cloneDay(day) {
  return { title: day.title, rest: day.rest, exercises: day.exercises.map(cloneExercise) };
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
  return { title: '', rest: false, exercises: [] };
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

// ---------- Données complètes ----------

function createDefaultData() {
  return {
    version: DATA_VERSION,
    settings: {
      weekAReference: toISODate(mondayOf(new Date())), // par défaut : cette semaine = A
      createdAt: toISODate(new Date()),
      lastExport: null,
      reminderSnoozedUntil: null, // rappel de sauvegarde mis en pause jusqu'à cette date
    },
    categories: createDefaultCategories(),
    weeks: { A: createEmptyWeek(), B: createEmptyWeek() },
    dailyRoutines: [],
    customLibrary: [], // exercices ajoutés à la bibliothèque
    progress: {},      // statut des skills : { idExercice: "inProgress" | "done" }
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
