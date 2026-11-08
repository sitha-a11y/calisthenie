// session.js — le MODE SÉANCE : un exercice à la fois, en plein écran.
//
// Au lancement, on prend une copie des exercices du jour (ou du groupe d'étirements) :
// modifier la routine pendant la séance ne casse rien.
// L'état de la séance est enregistré à part (SESSION_KEY) pour pouvoir la reprendre
// si l'app est fermée en plein milieu.

const SESSION_KEY = 'calisthenie-session';

// Horloge de la séance (les tests peuvent la faire avancer)
const SessionClock = {
  offset: 0,
  now() { return Date.now() + this.offset; },
  advance(ms) { this.offset += ms; },
};

// Texte de la cible d'un set : "5 reps /jambe", "6 s", "max (−1)", "20 m"
function sessionTargetText(item) {
  let text;
  if (item.toMax) text = item.maxMinusOne ? 'max (−1)' : 'max';
  else if (item.target === null) text = item.type === 'hold' ? 'Durée libre' : 'Reps libres';
  else if (item.type === 'hold') text = formatDuration(item.target);
  else if (item.type === 'distance') text = `${formatNumber(item.target)} m`;
  else text = `${item.target} reps`;
  return item.perSide ? `${text} /${item.perSide}` : text;
}

// Copie des exercices pour la séance
function buildSessionItems(exercises, kind) {
  return exercises.map((ex) => ({
    exId: ex.id,
    name: ex.name,
    color: exerciseColor(ex),
    category: ex.category,
    type: ex.type,
    sets: ex.sets || 1,
    target: ex.target,
    toMax: !!ex.toMax,
    maxMinusOne: !!(ex.toMax && (ex.note || '').includes('1 rep avant')),
    perSide: ex.perSide,
    vest: !!ex.vest,
    weightKg: ex.weightKg || 0,
    // Pas de repos après un échauffement, ni pendant les étirements
    restSec: kind === 'daily' || ex.role === 'warmup' ? null : ex.restSec,
    role: ex.role,
    note: ex.note,
    howTo: ex.howTo,
    results: [],   // un résultat par set fait : { value, adjusted }
    skipped: false,
  }));
}

const SessionPlayer = {
  session: null,
  root: null,
  ticker: null,
  draftValue: null, // valeur affichée dans le − / + du set en cours

  // ---------- Lancer ----------

  launchDay(week, day) {
    const dayData = appData.weeks[week][day];
    this.start({
      kind: 'day', week, day,
      title: `${dayData.title || 'Séance'} · ${DAY_LONG[day]} ${week}`,
      items: buildSessionItems(dayData.exercises, 'day'),
    });
  },

  launchDaily(routine, group) {
    this.start({
      kind: 'daily', routineId: routine.id, groupId: group.id,
      title: `${routine.name} · ${group.name}`,
      items: buildSessionItems(group.exercises, 'daily'),
    });
  },

  start(fields) {
    this.session = Object.assign({
      version: 1,
      id: newId('session'),
      date: toISODate(new Date()),
      startedAt: SessionClock.now(),
      index: 0,      // exercice en cours
      setIndex: 0,   // set en cours
      phase: 'set',  // "set", "rest" ou "recap"
      finishedAt: null,
    }, fields);
    this.draftValue = null;
    this.persist();
    this.open();
  },

  // ---------- Affichage ----------

  open() {
    if (!this.root) {
      this.root = el('div', { class: 'session-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Séance' });
      document.body.append(this.root);
    }
    document.documentElement.classList.add('no-scroll', 'in-session');
    clearInterval(this.ticker);
    this.ticker = setInterval(() => this.tick(), 250);
    this.render();
  },

  close() {
    clearInterval(this.ticker);
    this.ticker = null;
    if (this.root) this.root.remove();
    this.root = null;
    document.documentElement.classList.remove('no-scroll', 'in-session');
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
    App.show(App.currentView);
  },

  persist() {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(this.session)); } catch (e) { /* tant pis */ }
  },

  current() { return this.session.items[this.session.index]; },

  render() {
    if (!this.root || !this.session) return;
    const s = this.session;
    let screen;
    if (s.phase === 'recap') screen = this.renderRecap();
    else screen = this.renderExercise();
    this.root.replaceChildren(screen);
  },

  // Appelé 4 fois par seconde (chronos)
  tick() {},

  // Barre du haut : progression + bouton fermer
  renderTop() {
    const s = this.session;
    const total = s.items.length;
    return el('header', { class: 'session-top' },
      el('div', { class: 'session-top-row' },
        el('span', { class: 'session-count' }, `Exercice ${s.index + 1} / ${total}`),
        el('button', {
          type: 'button', class: 'session-close', 'aria-label': 'Terminer la séance',
          onclick: () => this.askFinish(),
        }, '✕'),
      ),
      el('div', { class: 'session-progress', 'aria-hidden': 'true' },
        el('div', { class: 'session-progress-fill', style: `width:${(s.index / total) * 100}%` })),
    );
  },

  renderExercise() {
    const s = this.session;
    const item = this.current();
    if (this.draftValue === null || this.draftValue === undefined) this.draftValue = this.defaultValue(item);

    const categoryLabel = item.role === 'warmup' ? 'Échauffement'
      : (appData.categories[item.category] ? appData.categories[item.category].name : '');

    const dots = el('div', { class: 'set-dots', 'aria-label': `${item.results.filter(Boolean).length} sets faits sur ${item.sets}` },
      Array.from({ length: item.sets }, (_, i) => el('span', {
        class: 'set-dot' + (item.results[i] ? ' done' : '') + (i === s.setIndex ? ' current' : ''),
      })));

    const unitLabel = { reps: 'reps', hold: 's', distance: 'm' }[item.type];
    const adjust = el('div', { class: 'session-adjust' },
      el('span', { class: 'session-adjust-label' }, `Fait (${unitLabel})`),
      numberStepper({
        value: this.draftValue,
        step: 1,
        decimals: item.type === 'distance',
        label: 'Valeur réellement faite',
        onChange: (v) => { this.draftValue = v; },
      }),
    );

    return el('div', { class: 'session-screen', style: `--ex-color:${item.color || 'var(--accent)'}` },
      this.renderTop(),
      el('main', { class: 'session-body' },
        categoryLabel ? el('span', { class: 'session-cat' }, categoryLabel) : null,
        el('h1', { class: 'session-name' }, item.name),
        el('div', { class: 'session-setline' }, `Set ${s.setIndex + 1} / ${item.sets}`),
        el('div', { class: 'session-target' },
          sessionTargetText(item),
          item.vest ? el('span', { class: 'chip session-chip' }, `Gilet (${formatNumber(appData.settings.vestKg)} kg)`) : null,
          !item.vest && item.weightKg > 0 ? el('span', { class: 'chip session-chip' }, `+${formatNumber(item.weightKg)} kg`) : null,
        ),
        dots,
        this.renderActionArea(item, adjust),
        item.howTo ? el('details', { class: 'howto session-details' }, el('summary', {}, 'Comment faire'), el('p', {}, item.howTo)) : null,
        item.note ? el('details', { class: 'howto session-details' }, el('summary', {}, 'Note'), el('p', {}, item.note)) : null,
      ),
      el('footer', { class: 'session-nav' },
        el('button', { type: 'button', class: 'session-nav-btn', disabled: s.index === 0 && s.setIndex === 0, onclick: () => this.previous() }, '← Précédent'),
        el('button', { type: 'button', class: 'session-nav-btn', onclick: () => this.skip() }, 'Passer l’exercice'),
        el('button', { type: 'button', class: 'session-nav-btn danger', onclick: () => this.askFinish() }, 'Terminer'),
      ),
    );
  },

  // Zone des gros boutons (remplacée par le chrono pendant un hold, étape suivante)
  renderActionArea(item, adjust) {
    return el('div', { class: 'session-actions' },
      adjust,
      el('button', { type: 'button', class: 'session-done-btn', onclick: () => this.validateSet(this.draftValue) }, '✓ Set fait'),
    );
  },

  // Valeur proposée dans le − / + : la cible, ou pour un "max" la dernière perf notée
  defaultValue(item) {
    if (item.toMax) {
      const stats = perfStats(item.name);
      return stats ? stats.last.value : null;
    }
    return item.target;
  },

  // ---------- Avancer dans la séance ----------

  validateSet(value) {
    const s = this.session;
    const item = this.current();
    const adjusted = item.toMax ? value !== null : value !== item.target;
    item.results[s.setIndex] = { value, adjusted };
    this.draftValue = null;

    const lastSet = s.setIndex >= item.sets - 1;
    const lastItem = s.index >= s.items.length - 1;
    if (lastSet && lastItem) { this.finish(); return; }
    const next = lastSet ? { index: s.index + 1, setIndex: 0 } : { index: s.index, setIndex: s.setIndex + 1 };
    this.goTo(next);
  },

  goTo({ index, setIndex }) {
    Object.assign(this.session, { index, setIndex, phase: 'set' });
    this.draftValue = null;
    this.persist();
    this.render();
  },

  previous() {
    const s = this.session;
    if (s.setIndex > 0) { this.goTo({ index: s.index, setIndex: s.setIndex - 1 }); return; }
    if (s.index === 0) return;
    const prev = s.items[s.index - 1];
    this.goTo({ index: s.index - 1, setIndex: prev.sets - 1 });
  },

  skip() {
    const s = this.session;
    const item = this.current();
    if (!item.results.some(Boolean)) item.skipped = true;
    if (s.index >= s.items.length - 1) { this.finish(); return; }
    this.goTo({ index: s.index + 1, setIndex: 0 });
  },

  async askFinish() {
    const ok = await confirmSheet('Terminer la séance ?', 'Tu verras le récapitulatif de ce que tu as fait.', 'Terminer');
    if (ok) this.finish();
  },

  finish() {
    const s = this.session;
    s.phase = 'recap';
    s.finishedAt = SessionClock.now();
    this.persist();
    this.render();
  },

  // ---------- Récap (complété à l'étape S3) ----------

  renderRecap() {
    return el('div', { class: 'session-screen recap' },
      el('main', { class: 'session-body' },
        el('h1', { class: 'session-name' }, 'Séance terminée'),
        el('button', { type: 'button', class: 'session-done-btn', onclick: () => this.close() }, 'Fermer'),
      ),
    );
  },
};
