// progress.js — la progression : journal de performances, fiche d'exercice (historique + courbe).
//
// L'historique est rangé par NOM d'exercice : "Tractions" du mardi A et du mardi B
// partagent le même historique.

// ---------- Données ----------

// Clé d'un exercice dans le journal : son nom sans majuscules ni accents
function perfKey(name) {
  return normalizeSearch(name);
}

// Unité d'une performance selon le type de l'exercice
function perfUnit(exercise) {
  if (exercise.type === 'hold') return 's';
  if (exercise.type === 'distance') return 'm';
  return 'reps';
}

// "8", "12 s", "1 min 30", "20 m"
function formatPerf(value, unit) {
  if (unit === 's') return formatDuration(value);
  if (unit === 'm') return `${formatNumber(value)} m`;
  return formatNumber(value);
}

// Les notes d'un exercice, de la plus ancienne à la plus récente
function perfEntries(name) {
  const record = appData.performances[perfKey(name)];
  if (!record) return [];
  return [...record.entries].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : (a.date < b.date ? -1 : 1)));
}

// Tendance sur les 3 dernières notes : "up", "flat", "down" (ou null s'il y a moins de 2 notes)
function perfTrend(entries) {
  const last3 = entries.slice(-3);
  if (last3.length < 2) return null;
  const diff = last3[last3.length - 1].value - last3[0].value;
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return 'flat';
}

// { last, record, trend, count } ou null si rien n'est noté
function perfStats(name) {
  const entries = perfEntries(name);
  if (entries.length === 0) return null;
  const last = entries[entries.length - 1];
  const record = entries.reduce((best, e) => (e.value > best.value ? e : best), entries[0]);
  return { last, record, trend: perfTrend(entries), count: entries.length };
}

function addPerf(name, entry) {
  const key = perfKey(name);
  if (!appData.performances[key]) appData.performances[key] = { name, entries: [] };
  appData.performances[key].entries.push(Object.assign({ id: newId('perf'), createdAt: Date.now() }, entry));
}

function removePerf(name, entryId) {
  const record = appData.performances[perfKey(name)];
  if (!record) return null;
  const index = record.entries.findIndex((e) => e.id === entryId);
  if (index === -1) return null;
  return record.entries.splice(index, 1)[0];
}

// ---------- Règles de progression ----------

const PROGRESS_RULES = {
  skillHold: 'Quand toutes les séries atteignent 10 s propres → monter d’un cran et repartir à 5 s.',
  strength: 'Quand toutes les séries sont au max de reps prévu, 2 séances de suite → ajouter 1 rep par série, ou monter d’un cran.',
  vest: 'Quand c’est facile 2 séances de suite → ajouter du poids (ou plus de reps si le gilet est déjà au max).',
  oneArmPullUp: 'Quand 3 × 2 /bras → passer à 3 × 3.',
  handstand: 'Noter le meilleur temps sans mur à chaque séance du lundi.',
  maxMinusOne: 'Noter le nombre de reps à chaque fois.',
};

// Familles du chart dont les holds sont des "skills" (planche, levers, V-sit…)
const SKILL_HOLD_FAMILIES = ['front-lever', 'back-lever', 'planche', 'ring-planche', 'l-sit', 'elbow-lever', 'human-flag', 'one-arm-handstand'];
// Familles du chart dont les exercices en reps sont de la force
const STRENGTH_FAMILIES = ['pistol', 'shrimp', 'hamstrings', 'squat', 'split-squat', 'one-arm-push-up', 'push-up', 'ring-push-up',
  'planche-push-up', 'ring-planche-push-up', 'hspu', 'dips', 'ring-dips', 'one-arm-pull-up', 'pull-up', 'muscle-up', 'rows', 'front-lever-rows'];
const STRENGTH_NAMES = ['archer pull-ups'];

// Famille du chart d'un exercice relié (la plus précise : "front-lever-rows" plutôt que "front-lever")
function chartFamilyOf(libraryId) {
  if (!libraryId) return null;
  let best = null;
  LIBRARY_DATA.forEach((s) => s.families.forEach((f) => {
    if (libraryId.startsWith(`${f.id}-`) && (!best || f.id.length > best.id.length)) best = f;
  }));
  return best;
}

// La règle automatique d'un exercice (texte vide s'il n'y en a pas)
function defaultProgressRule(ex) {
  if (ex.role === 'warmup' || ex.category === 'mobility') return '';
  const name = perfKey(ex.name);
  if (name === 'one arm pull up') return PROGRESS_RULES.oneArmPullUp;
  if (name.includes('kick-ups') || name.includes('handstand libre')) return PROGRESS_RULES.handstand;
  if (ex.toMax && (ex.note || '').includes('1 rep avant')) return PROGRESS_RULES.maxMinusOne;
  if (ex.vest) return PROGRESS_RULES.vest;
  const family = chartFamilyOf(ex.libraryId);
  if (ex.type === 'hold' && family && SKILL_HOLD_FAMILIES.includes(family.id)) return PROGRESS_RULES.skillHold;
  if (ex.type === 'reps' && !ex.toMax && !name.includes('explosif')
    && ((family && STRENGTH_FAMILIES.includes(family.id)) || STRENGTH_NAMES.includes(name))) return PROGRESS_RULES.strength;
  return '';
}

// La règle à afficher : celle écrite à la main, sinon la règle automatique
function progressRuleOf(ex) {
  return ex.progressRule === null || ex.progressRule === undefined ? defaultProgressRule(ex) : ex.progressRule;
}

// ---------- Monter d'un cran ----------

// L'exercice suivant dans la même famille du chart (ou null)
function nextLibraryItem(ex) {
  if (!ex.libraryId) return null;
  for (const section of buildLibrary()) {
    for (const family of section.families) {
      const index = family.items.findIndex((i) => i.id === ex.libraryId);
      if (index !== -1) return family.items[index + 1] || null;
    }
  }
  return null;
}

// Petit panneau pour choisir la nouvelle cible. Renvoie une promesse avec le nombre choisi.
function askNewTarget(item, suggested) {
  return new Promise((resolve) => {
    let value = suggested;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(value); } };
    const label = { reps: 'Reps par set', hold: 'Secondes par set', distance: 'Mètres par set' }[item.type];
    const form = el('form', {
      class: 'form',
      onsubmit: (e) => { e.preventDefault(); close(); finish(); },
    },
      el('p', { class: 'muted' }, `Les sets et le repos sont gardés. Ajuste la cible pour « ${item.name} ».`),
      field(label, numberStepper({ value, step: item.type === 'hold' ? 1 : 1, label, onChange: (v) => { value = v; } })),
      el('div', { class: 'form-actions' }, el('button', { type: 'submit', class: 'btn btn-primary' }, 'Valider')),
    );
    const close = openSheet('Nouvelle cible', form);
    // Fermé autrement (✕, clic à côté) : on garde la valeur affichée
    const observer = new MutationObserver(() => {
      if (!document.body.contains(form)) { observer.disconnect(); finish(); }
    });
    observer.observe(document.body, { childList: true });
  });
}

// Les autres jours (semaines A et B) qui ont un exercice du même nom : [{ exercise, label }]
function otherOccurrences(ex) {
  const found = [];
  ['A', 'B'].forEach((w) => DAY_KEYS.forEach((key) => {
    appData.weeks[w][key].exercises.forEach((e) => {
      if (e !== ex && perfKey(e.name) === perfKey(ex.name)) found.push({ exercise: e, label: `${DAY_LONG[key]} ${w}` });
    });
  }));
  return found;
}

// Confirmation de "Monter d'un cran", avec la case "aussi les autres jours".
// Renvoie une promesse : { ok, updateOthers }
function confirmLevelUp(ex, next, others) {
  return new Promise((resolve) => {
    let answered = false;
    const answer = (ok) => {
      if (answered) return;
      answered = true;
      close();
      resolve({ ok, updateOthers: ok && others.length > 0 && checkbox.checked });
    };
    const checkbox = el('input', { type: 'checkbox', checked: true, class: 'checkbox' });
    const content = el('div', {},
      el('p', { class: 'muted' },
        `« ${ex.name} » sera remplacé par « ${next.name} » dans cette séance. Les sets, le repos et les notes sont gardés.`),
      others.length ? el('label', { class: 'check-row' },
        checkbox,
        el('span', {},
          el('strong', {}, `Mettre aussi à jour les autres jours (${others.length})`),
          el('span', { class: 'check-days' }, others.map((o) => o.label).join(' · ')),
        ),
      ) : null,
      el('div', { class: 'form-actions' },
        el('button', { type: 'button', class: 'btn btn-primary', onclick: () => answer(true) }, 'Monter d’un cran'),
        el('button', { type: 'button', class: 'btn btn-secondary', onclick: () => answer(false) }, 'Annuler'),
      ),
    );
    const close = openSheet('Monter d’un cran ?', content);
    // Fermé autrement (✕, clic à côté) : c'est un "non"
    const observer = new MutationObserver(() => {
      if (!document.body.contains(content)) { observer.disconnect(); answer(false); }
    });
    observer.observe(document.body, { childList: true });
  });
}

async function levelUp(ex, onChange) {
  const next = nextLibraryItem(ex);
  if (!next) return;
  const others = otherOccurrences(ex);
  const { ok, updateOthers } = await confirmLevelUp(ex, next, others);
  if (!ok) return;

  // Holds de skill : on repart à 5 s (règle de progression) ; sinon on garde la cible
  const family = chartFamilyOf(next.id);
  const isSkillHold = next.type === 'hold' && family && SKILL_HOLD_FAMILIES.includes(family.id);
  const suggested = isSkillHold ? 5 : (next.type === ex.type ? ex.target : null);
  const target = await askNewTarget(next, suggested);

  // Les exercices à modifier : celui-ci, plus les autres jours si la case est cochée
  const targets = [ex, ...(updateOthers ? others.map((o) => o.exercise) : [])];
  const backups = targets.map((e) => JSON.parse(JSON.stringify(e)));
  targets.forEach((e) => {
    // Autres jours : même cible pour un hold de skill, sinon chacun garde la sienne
    const ownTarget = e === ex || isSkillHold || next.type !== e.type ? target : e.target;
    Object.assign(e, { name: next.name, libraryId: next.id, type: next.type, target: ownTarget });
  });
  onChange();
  const count = targets.length > 1 ? ` (${targets.length} jours)` : '';
  showToast(`Monté d’un cran : ${next.name}${count}`, {
    actionLabel: 'Annuler',
    onAction: () => { targets.forEach((e, i) => Object.assign(e, backups[i])); onChange(); },
  });
}

// ---------- Semaine de test (toutes les 4 semaines) ----------

// Les semaines sont comptées depuis testCycleStart : 1, 2, 3, puis la 4e est une semaine de test
function isTestWeek(date = new Date()) {
  const weeks = Math.round(daysBetween(parseISODate(appData.settings.testCycleStart), mondayOf(date)) / 7);
  return ((weeks % 4) + 4) % 4 === 3;
}

// Lundi de la prochaine semaine de test (ou de celle en cours)
function nextTestWeekMonday(date = new Date()) {
  const monday = mondayOf(date);
  for (let i = 0; i < 4; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + 7 * i);
    if (isTestWeek(d)) return d;
  }
  return monday;
}

// Faire de la semaine en cours une semaine de test (le cycle repart de là)
function setThisWeekAsTest() {
  const start = mondayOf(new Date());
  start.setDate(start.getDate() - 21);
  appData.settings.testCycleStart = toISODate(start);
  appData.settings.testBannerDismissed = null;
  saveData(appData);
}

// Bandeau discret, affiché pendant la semaine de test (jusqu'à ce qu'on appuie sur OK)
function renderTestBanner(onChange, { showLink = true } = {}) {
  const thisMonday = toISODate(mondayOf(new Date()));
  if (!isTestWeek() || appData.settings.testBannerDismissed === thisMonday) return null;
  return el('div', { class: 'reminder test-banner', role: 'status' },
    el('span', { class: 'reminder-text' }, '🎯 Semaine de test : note tes max sur les exercices épinglés.'),
    el('div', { class: 'reminder-actions' },
      showLink ? el('button', { type: 'button', class: 'reminder-btn primary', onclick: () => App.show('progress') }, 'Voir') : null,
      el('button', {
        type: 'button', class: 'reminder-btn',
        onclick: () => { appData.settings.testBannerDismissed = thisMonday; saveData(appData); onChange(); },
      }, 'OK'),
    ),
  );
}

// ---------- Épinglés ----------

function isPinned(name) {
  return appData.pinned.some((p) => perfKey(p) === perfKey(name));
}

function setPinned(name, pinned) {
  appData.pinned = appData.pinned.filter((p) => perfKey(p) !== perfKey(name));
  if (pinned) appData.pinned.push(name);
  saveData(appData);
}

// Retrouve un exercice d'après son nom dans les semaines A puis B : { exercise, owner } ou null
function findExerciseByName(name) {
  for (const w of ['A', 'B']) {
    for (const key of DAY_KEYS) {
      const day = appData.weeks[w][key];
      const exercise = day.exercises.find((e) => perfKey(e.name) === perfKey(name));
      if (exercise) return { exercise, owner: day };
    }
  }
  return null;
}

// "lun. 9 nov."
function formatShortDate(iso) {
  return parseISODate(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

const TREND_SYMBOL = { up: '↑', flat: '→', down: '↓' };
const TREND_LABEL = { up: 'En progrès', flat: 'Stable', down: 'En baisse' };

// ---------- Courbe (SVG fait à la main) ----------
// SVG = format d'image fait de formes (lignes, points) décrites en texte ; il reste net à toutes les tailles.

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  children.forEach((c) => node.append(c instanceof Node ? c : document.createTextNode(String(c))));
  return node;
}

function perfChart(entries, unit, color) {
  if (entries.length < 2) {
    return el('p', { class: 'hint chart-empty' }, 'La courbe apparaît dès 2 notes.');
  }
  const W = 320;
  const H = 150;
  const left = 44;
  const right = 12;
  const top = 14;
  const bottom = 26;
  const values = entries.map((e) => e.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const x = (i) => left + (i * (W - left - right)) / (entries.length - 1);
  const y = (v) => top + ((max - v) * (H - top - bottom)) / (max - min);
  const points = entries.map((e, i) => `${x(i).toFixed(1)},${y(e.value).toFixed(1)}`).join(' ');

  return svgEl('svg', {
    class: 'perf-chart', viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Courbe : de ${formatPerf(values[0], unit)} à ${formatPerf(values[values.length - 1], unit)}`,
  },
    // Lignes de repère (max et min)
    svgEl('line', { x1: left, x2: W - right, y1: y(max), y2: y(max), class: 'chart-grid' }),
    svgEl('line', { x1: left, x2: W - right, y1: y(min), y2: y(min), class: 'chart-grid' }),
    svgEl('text', { x: left - 6, y: y(max) + 4, class: 'chart-label', 'text-anchor': 'end' }, formatPerf(max, unit)),
    svgEl('text', { x: left - 6, y: y(min) + 4, class: 'chart-label', 'text-anchor': 'end' }, formatPerf(min, unit)),
    // La courbe et ses points
    svgEl('polyline', { points, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
    ...entries.map((e, i) => svgEl('circle', { cx: x(i), cy: y(e.value), r: 3.5, fill: color })),
    // Dates de la première et de la dernière note
    svgEl('text', { x: left, y: H - 6, class: 'chart-label', 'text-anchor': 'start' }, formatShortDate(entries[0].date)),
    svgEl('text', { x: W - right, y: H - 6, class: 'chart-label', 'text-anchor': 'end' }, formatShortDate(entries[entries.length - 1].date)),
  );
}

// ---------- Onglet "Progrès" ----------

const ProgressView = {
  render() {
    const root = document.getElementById('view-progress');
    const pinnedKeys = appData.pinned.map(perfKey);
    const others = Object.values(appData.performances)
      .filter((r) => r.entries.length && !pinnedKeys.includes(perfKey(r.name)))
      .sort((a, b) => (perfStats(b.name).last.date > perfStats(a.name).last.date ? 1 : -1));

    root.replaceChildren(
      el('h1', { class: 'page-title' }, 'Progrès'),
      renderTestBanner(() => this.render(), { showLink: false }),
      el('h2', { class: 'section-label' }, 'Épinglés'),
      appData.pinned.length
        ? el('div', { class: 'progress-list' }, appData.pinned.map((name) => this.renderRow(name)))
        : el('p', { class: 'hint' }, 'Épingle un exercice depuis sa fiche.'),
      el('h2', { class: 'section-label' }, 'Autres exercices suivis'),
      others.length
        ? el('div', { class: 'progress-list' }, others.map((r) => this.renderRow(r.name)))
        : el('p', { class: 'hint' }, 'Les exercices que tu notes apparaîtront ici.'),
    );
  },

  renderRow(name) {
    const record = appData.performances[perfKey(name)];
    const displayName = record ? record.name : name;
    const stats = perfStats(name);
    return el('button', {
      type: 'button',
      class: 'progress-row',
      onclick: () => {
        const found = findExerciseByName(name);
        ProgressSheet.open({ name: displayName, exercise: found ? found.exercise : null, onChange: () => this.render() });
      },
    },
      el('div', { class: 'progress-row-main' },
        el('span', { class: 'progress-row-name' }, displayName,
          isTestWeek() && isPinned(name) ? el('span', { class: 'test-badge' }, '🎯 Test') : null),
        el('span', { class: 'progress-row-sub' }, stats
          ? `Record ${formatPerf(stats.record.value, stats.record.unit)} · Dernier ${formatPerf(stats.last.value, stats.last.unit)} (${formatShortDate(stats.last.date)})`
          : 'Pas encore noté'),
      ),
      el('span', {
        class: `trend trend-big trend-${stats && stats.trend ? stats.trend : 'none'}`,
        'aria-label': stats && stats.trend ? TREND_LABEL[stats.trend] : 'Pas de tendance',
      }, stats && stats.trend ? TREND_SYMBOL[stats.trend] : '–'),
    );
  },
};

// ---------- Panneau "Noter" ----------

const LogSheet = {
  // name : nom de l'exercice ; exercise : l'exercice (pour l'unité et le lest) ; onDone : après enregistrement
  open({ name, exercise = null, onDone = () => {} }) {
    const previous = perfStats(name);
    const unit = exercise ? perfUnit(exercise) : (previous ? previous.last.unit : 'reps');
    const draft = {
      date: toISODate(new Date()),
      value: previous ? previous.last.value : null, // on part de la dernière perf
      weightKg: exercise && exercise.vest ? appData.settings.vestKg : (exercise ? exercise.weightKg || 0 : 0),
      note: '',
    };

    const valueStepper = numberStepper({
      value: draft.value,
      step: unit === 'reps' ? 1 : (unit === 's' ? 1 : 5),
      decimals: unit === 'm',
      label: 'Valeur',
      onChange: (v) => { draft.value = v; valueStepper.classList.remove('invalid'); },
    });

    const form = el('form', {
      class: 'form',
      onsubmit: (e) => {
        e.preventDefault();
        if (draft.value === null) { valueStepper.classList.add('invalid'); return; }
        const isRecord = !previous || draft.value > previous.record.value;
        addPerf(name, { date: draft.date, value: draft.value, unit, weightKg: draft.weightKg || 0, note: draft.note.trim() });
        saveData(appData);
        close();
        showToast(isRecord && previous ? `Nouveau record : ${formatPerf(draft.value, unit)} !` : `Noté : ${formatPerf(draft.value, unit)}`);
        onDone();
      },
    },
      previous ? el('p', { class: 'muted' },
        `Dernier : ${formatPerf(previous.last.value, previous.last.unit)} (${formatShortDate(previous.last.date)}) · Record : ${formatPerf(previous.record.value, previous.record.unit)}`) : null,
      field({ reps: 'Reps', s: 'Secondes', m: 'Mètres' }[unit], valueStepper),
      field('Lest (kg)', numberStepper({
        value: draft.weightKg, step: 0.5, decimals: true, label: 'Lest en kg',
        onChange: (v) => { draft.weightKg = v ?? 0; },
      })),
      field('Date', el('input', {
        class: 'input', type: 'date', value: draft.date, 'aria-label': 'Date',
        onchange: (e) => { if (e.target.value) draft.date = e.target.value; },
      })),
      field('Note (facultatif)', el('input', {
        class: 'input', type: 'text', placeholder: 'Ex. dernière rep difficile', 'aria-label': 'Note',
        oninput: (e) => { draft.note = e.target.value; },
      })),
      el('div', { class: 'form-actions' }, el('button', { type: 'submit', class: 'btn btn-primary' }, 'Enregistrer')),
    );
    const close = openSheet(`Noter : ${name}`, form);
  },
};

// ---------- Fiche d'un exercice : résumé, courbe, historique ----------

const ProgressSheet = {
  // exercise / owner / onChange : donnés quand on ouvre la fiche depuis une carte (pour "Monter d'un cran")
  open({ name, exercise = null, owner = null, onChange = () => {} }) {
    const body = el('div', { class: 'progress-sheet' });
    const color = (exercise && exerciseColor(exercise)) || 'var(--accent)';

    const render = () => {
      const entries = perfEntries(name);
      const stats = perfStats(name);
      const unit = stats ? stats.last.unit : (exercise ? perfUnit(exercise) : 'reps');
      const rule = exercise ? progressRuleOf(exercise) : '';
      // "Monter d'un cran" seulement depuis une carte (on sait quelle séance modifier)
      const next = exercise && owner ? nextLibraryItem(exercise) : null;

      body.replaceChildren(
        el('div', { class: 'pin-row' }, toggleSwitch(isPinned(name), (v) => { setPinned(name, v); onChange(); }, '★ Épinglé dans Progrès')),
        stats ? el('div', { class: 'perf-summary' },
          el('div', {}, el('strong', {}, formatPerf(stats.record.value, stats.record.unit)), el('span', {}, 'Record')),
          el('div', {}, el('strong', {}, formatPerf(stats.last.value, stats.last.unit)), el('span', {}, 'Dernier')),
          el('div', {}, el('strong', { class: `trend trend-${stats.trend || 'none'}` }, stats.trend ? TREND_SYMBOL[stats.trend] : '–'),
            el('span', {}, stats.trend ? TREND_LABEL[stats.trend] : 'Tendance')),
        ) : el('p', { class: 'muted' }, 'Pas encore de performance notée.'),

        perfChart(entries, unit, color),

        rule ? el('div', { class: 'rule-block' },
          el('span', { class: 'rule-title' }, 'Règle de progression'),
          el('p', {}, rule)) : null,

        el('div', { class: 'form-actions sheet-actions' },
          el('button', {
            type: 'button', class: 'btn btn-primary',
            onclick: () => { close(); LogSheet.open({ name, exercise, onDone: onChange }); },
          }, '+ Noter une performance'),
          next ? el('button', {
            type: 'button', class: 'btn btn-secondary',
            onclick: () => { close(); levelUp(exercise, onChange); },
          }, `Monter d’un cran → ${next.name}`) : null,
        ),

        entries.length ? el('h3', { class: 'section-label' }, 'Historique') : null,
        entries.length ? el('ul', { class: 'perf-history' }, [...entries].reverse().map((entry) => el('li', {},
          el('span', { class: 'perf-date' }, formatShortDate(entry.date)),
          el('span', { class: 'perf-value' }, formatPerf(entry.value, entry.unit),
            entry.weightKg ? el('span', { class: 'perf-weight' }, ` +${formatNumber(entry.weightKg)} kg`) : null),
          entry.note ? el('span', { class: 'perf-note' }, entry.note) : null,
          el('button', {
            type: 'button', class: 'icon-btn perf-delete', 'aria-label': `Supprimer la note du ${formatShortDate(entry.date)}`,
            onclick: () => {
              const removed = removePerf(name, entry.id);
              saveData(appData);
              render();
              onChange();
              showToast('Note supprimée', {
                actionLabel: 'Annuler',
                onAction: () => {
                  appData.performances[perfKey(name)].entries.push(removed);
                  saveData(appData);
                  render();
                  onChange();
                },
              });
            },
          }, '✕'),
        ))) : null,
      );
    };

    render();
    const close = openSheet(name, body);
    return { render, close, body };
  },
};
