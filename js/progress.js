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

      body.replaceChildren(
        stats ? el('div', { class: 'perf-summary' },
          el('div', {}, el('strong', {}, formatPerf(stats.record.value, stats.record.unit)), el('span', {}, 'Record')),
          el('div', {}, el('strong', {}, formatPerf(stats.last.value, stats.last.unit)), el('span', {}, 'Dernier')),
          el('div', {}, el('strong', { class: `trend trend-${stats.trend || 'none'}` }, stats.trend ? TREND_SYMBOL[stats.trend] : '–'),
            el('span', {}, stats.trend ? TREND_LABEL[stats.trend] : 'Tendance')),
        ) : el('p', { class: 'muted' }, 'Pas encore de performance notée.'),

        perfChart(entries, unit, color),

        el('button', {
          type: 'button', class: 'btn btn-primary',
          onclick: () => { close(); LogSheet.open({ name, exercise, onDone: onChange }); },
        }, '+ Noter une performance'),

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
