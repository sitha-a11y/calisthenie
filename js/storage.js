// storage.js — lire et enregistrer les données dans le navigateur (localStorage).

const STORAGE_KEY = 'calisthenie-data';
const DATA_VERSION = 1;

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
      data.weeks[w][key] = Object.assign(createEmptyDay(), data.weeks[w][key]);
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
