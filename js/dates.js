// dates.js — tout ce qui concerne les jours et les semaines A/B.

// Les 7 jours, dans l'ordre lundi → dimanche (clés courtes utilisées dans les données)
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DAY_SHORT = { mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Jeu', fri: 'Ven', sat: 'Sam', sun: 'Dim' };
const DAY_LONG = { mon: 'lundi', tue: 'mardi', wed: 'mercredi', thu: 'jeudi', fri: 'vendredi', sat: 'samedi', sun: 'dimanche' };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Transforme une date en texte "2026-11-09" (heure locale, pas UTC)
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// L'inverse : "2026-11-09" → objet Date à minuit (heure locale)
function parseISODate(text) {
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Renvoie le lundi de la semaine qui contient cette date
function mondayOf(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (monday.getDay() + 6) % 7; // getDay() : 0 = dimanche
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday;
}

// Nombre de jours entiers entre deux dates (arrondi pour ignorer le changement d'heure)
function daysBetween(from, to) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

// "A" ou "B" pour une date, à partir du lundi de référence (une semaine A)
function weekLetterFor(date, referenceISO) {
  const weeks = Math.round(daysBetween(parseISODate(referenceISO), mondayOf(date)) / 7);
  const parity = ((weeks % 2) + 2) % 2; // marche aussi pour les dates avant la référence
  return parity === 0 ? 'A' : 'B';
}

// Clé du jour ("mon", "tue"…) pour une date
function dayKeyFor(date) {
  return DAY_KEYS[(date.getDay() + 6) % 7];
}

// "mardi 10 nov."
function formatDayMonth(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
}

// "lundi 9 novembre"
function formatLongDate(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
