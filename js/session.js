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

// Bip sonore avec Web Audio (l'API du navigateur pour produire du son).
// Sur iPhone, le son doit être "débloqué" par un toucher : on appelle unlock() au lancement.
// Attention : le bouton silencieux de l'iPhone coupe ce son.
const Beeper = {
  ctx: null,
  unlock() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* pas de son, tant pis */ }
  },
  beep(count = 1) {
    if (!this.ctx) return;
    try {
      const t0 = this.ctx.currentTime;
      for (let i = 0; i < count; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.value = i === count - 1 && count > 1 ? 1320 : 880; // le dernier bip plus aigu
        const t = t0 + i * 0.25;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      }
    } catch (e) { /* tant pis */ }
  },
};

// 75000 ms → "1:15"
function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

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
  countdown: null,  // chrono d'un hold en cours : { stage: "prep"|"run", mode: "down"|"up", side, endsAt, runStart }
  timerEl: null,    // éléments mis à jour à chaque "tick" (sans tout redessiner)
  barEl: null,

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
      restEndsAt: null, // fin du repos en cours (heure absolue : continue même si l'app est en arrière-plan)
      restTotal: 0,
      next: null,       // set à faire après le repos
    }, fields);
    this.draftValue = null;
    this.countdown = null;
    Beeper.unlock();
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
    this.timerEl = null;
    this.barEl = null;
    let screen;
    if (s.phase === 'recap') screen = this.renderRecap();
    else if (s.phase === 'rest') screen = this.renderRest();
    else screen = this.renderExercise();
    this.root.replaceChildren(screen);
  },

  // Appelé 4 fois par seconde : fait avancer les chronos
  tick() {
    if (!this.session) return;
    const s = this.session;
    const now = SessionClock.now();

    if (s.phase === 'rest') {
      const left = s.restEndsAt - now;
      if (left <= 0) { Beeper.beep(3); this.endRest(); return; }
      if (this.timerEl) this.timerEl.textContent = formatClock(left);
      if (this.barEl) this.barEl.style.width = `${Math.min(100, (left / (s.restTotal * 1000)) * 100)}%`;
      return;
    }

    const c = this.countdown;
    if (!c || s.phase !== 'set') return;
    const item = this.current();
    if (c.stage === 'prep') {
      const left = c.endsAt - now;
      if (left > 0) { if (this.timerEl) this.timerEl.textContent = String(Math.ceil(left / 1000)); return; }
      // Fin de la préparation : c'est parti
      Object.assign(c, { stage: 'run', runStart: now, endsAt: c.mode === 'down' ? now + item.target * 1000 : null });
      Beeper.beep(1);
      this.render();
      return;
    }
    if (c.mode === 'up') {
      if (this.timerEl) this.timerEl.textContent = formatClock(now - c.runStart);
      return;
    }
    const left = c.endsAt - now;
    if (left > 0) { if (this.timerEl) this.timerEl.textContent = formatClock(left); return; }
    this.holdFinished();
  },

  // ---------- Chrono des holds ----------

  startHold() {
    Beeper.unlock();
    const item = this.current();
    const mode = item.toMax || item.target === null ? 'up' : 'down';
    this.countdown = {
      stage: 'prep',
      mode,
      side: item.perSide && mode === 'down' ? 'gauche' : null,
      endsAt: SessionClock.now() + 3000,
    };
    this.render();
  },

  // Le compte à rebours est arrivé à zéro
  holdFinished() {
    const item = this.current();
    const c = this.countdown;
    if (c.side === 'gauche') {
      // Côté gauche fini : 3 s pour changer de côté, puis côté droit
      this.countdown = { stage: 'prep', mode: 'down', side: 'droit', switching: true, endsAt: SessionClock.now() + 3000 };
      Beeper.beep(2);
      this.render();
      return;
    }
    Beeper.beep(3);
    this.countdown = null;
    this.validateSet(item.target);
  },

  // "■ Arrêter" : on note le temps réellement tenu (à valider avec ✓)
  stopHold() {
    const c = this.countdown;
    this.countdown = null;
    if (c && c.stage === 'run') this.draftValue = Math.round((SessionClock.now() - c.runStart) / 1000);
    this.render();
  },

  renderCountdown() {
    const c = this.countdown;
    const now = SessionClock.now();
    let label;
    if (c.stage === 'prep') label = c.switching ? 'Change de côté' : (c.side ? `Prépare-toi · côté ${c.side}` : 'Prépare-toi');
    else label = c.side ? `Côté ${c.side}` : (c.mode === 'up' ? 'Chrono' : 'Tiens !');
    let text;
    if (c.stage === 'prep') text = String(Math.ceil((c.endsAt - now) / 1000));
    else text = c.mode === 'up' ? formatClock(now - c.runStart) : formatClock(c.endsAt - now);
    this.timerEl = el('div', { class: 'countdown-time' + (c.stage === 'prep' ? ' prep' : '') }, text);
    return el('div', { class: 'session-actions countdown', role: 'timer' },
      el('div', { class: 'countdown-label' }, label),
      this.timerEl,
      el('button', { type: 'button', class: 'session-secondary-btn', onclick: () => this.stopHold() }, '■ Arrêter'),
    );
  },

  // ---------- Repos ----------

  endRest() {
    const next = this.session.next;
    Object.assign(this.session, { restEndsAt: null, next: null });
    this.goTo(next);
  },

  changeRest(seconds) {
    const s = this.session;
    const now = SessionClock.now();
    s.restEndsAt = Math.max(now, s.restEndsAt + seconds * 1000);
    s.restTotal = Math.max(s.restTotal, Math.ceil((s.restEndsAt - now) / 1000));
    this.persist();
    this.tick();
  },

  renderRest() {
    const s = this.session;
    const next = s.next;
    const nextItem = s.items[next.index];
    const sameExercise = next.index === s.index;
    const left = s.restEndsAt - SessionClock.now();
    this.timerEl = el('div', { class: 'rest-time', role: 'timer' }, formatClock(left));
    this.barEl = el('div', { class: 'rest-bar-fill', style: `width:${Math.min(100, (left / (s.restTotal * 1000)) * 100)}%` });

    return el('div', { class: 'session-screen rest', style: `--ex-color:${nextItem.color || 'var(--accent)'}` },
      this.renderTop(),
      el('main', { class: 'session-body rest-body' },
        el('span', { class: 'rest-label' }, 'Repos'),
        this.timerEl,
        el('div', { class: 'rest-bar', 'aria-hidden': 'true' }, this.barEl),
        el('div', { class: 'rest-controls' },
          el('button', { type: 'button', class: 'session-secondary-btn', onclick: () => this.changeRest(-15) }, '−15 s'),
          el('button', { type: 'button', class: 'session-secondary-btn', onclick: () => this.changeRest(15) }, '+15 s'),
        ),
        el('button', { type: 'button', class: 'session-done-btn', onclick: () => this.endRest() }, 'Passer le repos'),
        el('div', { class: 'next-up' },
          el('span', { class: 'next-label' }, sameExercise ? 'Ensuite' : 'Suivant :'),
          el('strong', { class: 'next-name' }, nextItem.name),
          el('span', { class: 'next-detail' }, sameExercise
            ? `Set ${next.setIndex + 1} / ${nextItem.sets} · ${sessionTargetText(nextItem)}`
            : `${nextItem.sets} × ${sessionTargetText(nextItem)}`),
        ),
      ),
      el('footer', { class: 'session-nav single' },
        el('button', { type: 'button', class: 'session-nav-btn danger', onclick: () => this.askFinish() }, 'Terminer la séance'),
      ),
    );
  },

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

  // Zone des gros boutons (remplacée par le chrono pendant un hold)
  renderActionArea(item, adjust) {
    if (this.countdown) return this.renderCountdown();
    const doneBtn = el('button', {
      type: 'button', class: 'session-done-btn',
      onclick: () => { Beeper.unlock(); this.validateSet(this.draftValue); },
    }, '✓ Set fait');
    if (item.type !== 'hold') return el('div', { class: 'session-actions' }, adjust, doneBtn);

    // Hold : "Démarrer" lance le chrono ; on peut aussi valider à la main
    const countsDown = !item.toMax && item.target !== null;
    const startLabel = countsDown
      ? `▶ Démarrer · ${formatDuration(item.target)}${item.perSide ? ' × 2 côtés' : ''}`
      : '▶ Démarrer le chrono';
    return el('div', { class: 'session-actions' },
      el('button', { type: 'button', class: 'session-start-btn', onclick: () => this.startHold() }, startLabel),
      adjust,
      doneBtn,
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

    // Repos automatique après le set (sauf échauffements et étirements : restSec est vide)
    if (item.restSec) {
      Object.assign(s, {
        phase: 'rest',
        restTotal: item.restSec,
        restEndsAt: SessionClock.now() + item.restSec * 1000,
        next,
      });
      this.persist();
      this.render();
      return;
    }
    this.goTo(next);
  },

  goTo({ index, setIndex }) {
    Object.assign(this.session, { index, setIndex, phase: 'set', restEndsAt: null, next: null });
    this.draftValue = null;
    this.countdown = null;
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
    this.countdown = null;
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
