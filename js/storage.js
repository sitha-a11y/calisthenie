// storage.js — lire et enregistrer les données dans le navigateur (localStorage).

const STORAGE_KEY = 'calisthenie-data';
const DATA_VERSION = 1;

// Fabrique un identifiant unique, ex. "ex_lq3k9a1f2b"
function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Un exercice avec toutes ses cases (les cases données dans "fields" remplacent les valeurs par défaut)
function createExercise(fields = {}) {
  return Object.assign({
    id: newId('ex'),
    name: '',
    libraryId: null,   // lien vers la bibliothèque (étape 5)
    category: null,    // catégorie de couleur (étape 3)
    type: 'reps',      // "reps" ou "hold"
    sets: null,        // null = pas encore rempli
    target: null,      // nombre de reps, ou secondes de maintien
    weightKg: 0,
    restSec: null,
    role: 'main',      // "warmup" (échauffement) ou "main" (principal)
    note: '',
    color: null,       // couleur perso (étape 3)
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
function sortByRole(day) {
  day.exercises = [
    ...day.exercises.filter((e) => e.role === 'warmup'),
    ...day.exercises.filter((e) => e.role !== 'warmup'),
  ];
}

// Un jour vide
function createEmptyDay() {
  return { title: '', rest: false, exercises: [] };
}

// Une semaine vide : 7 jours vides
function createEmptyWeek() {
  const week = {};
  DAY_KEYS.forEach((key) => { week[key] = createEmptyDay(); });
  return week;
}

// Les données de départ, la toute première fois
function createDefaultData() {
  return {
    version: DATA_VERSION,
    settings: {
      weekAReference: toISODate(mondayOf(new Date())), // par défaut : cette semaine = A
      lastExport: null,
    },
    weeks: { A: createEmptyWeek(), B: createEmptyWeek() },
  };
}

// Complète les cases manquantes (utile quand on ajoutera des fonctions plus tard)
function normalizeData(data) {
  const defaults = createDefaultData();
  data.version = data.version || DATA_VERSION;
  data.settings = Object.assign({}, defaults.settings, data.settings);
  data.weeks = data.weeks || {};
  ['A', 'B'].forEach((w) => {
    data.weeks[w] = data.weeks[w] || {};
    DAY_KEYS.forEach((key) => {
      const day = Object.assign(createEmptyDay(), data.weeks[w][key]);
      day.exercises = (day.exercises || []).map((ex) => createExercise(ex));
      data.weeks[w][key] = day;
    });
  });
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
  return createDefaultData();
}

// Enregistre toutes les données
function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Enregistrement impossible.', error);
  }
}
