// exercise-list.js — affiche une liste d'exercices (cartes, glisser-déposer, menus).
// Utilisé pour les jours de la semaine ET pour les groupes des routines quotidiennes.
//
// "owner" = l'objet qui contient le tableau "exercises" (un jour, ou un groupe).
// "onChange" = fonction appelée après chaque modification (pour enregistrer et réafficher).

const ExerciseList = {
  // tracking : afficher "Noter" et "Dernier · Record" sur les exercices principaux
  render(owner, onChange, { newDefaults = {}, emptyText = 'Aucun exercice pour l’instant.', tracking = false } = {}) {
    this.tracking = tracking;
    const warmups = owner.exercises.filter((e) => e.role === 'warmup');
    const mains = owner.exercises.filter((e) => e.role !== 'warmup');

    const addButton = el('button', {
      class: 'add-btn',
      onclick: () => this.add(owner, onChange, newDefaults),
    }, '+ Ajouter un exercice');

    if (owner.exercises.length === 0) {
      return el('div', {},
        el('div', { class: 'empty-state' },
          el('p', {}, emptyText),
          el('p', { class: 'hint' }, 'Ajoute ton premier exercice ci-dessous.'),
        ),
        addButton,
      );
    }

    // Une liste par rôle ; on peut réordonner à l'intérieur de chaque liste
    const makeList = (list, role) => {
      const listEl = el('div', { class: 'ex-list' }, list.map((ex) => this.renderCard(ex, owner, onChange)));
      makeSortable(listEl, (from, to) => {
        moveItem(list, from, to);
        owner.exercises = role === 'warmup' ? [...list, ...mains] : [...warmups, ...list];
        onChange();
      });
      return listEl;
    };

    return el('div', {},
      warmups.length ? el('h3', { class: 'section-label' }, 'Échauffement') : null,
      warmups.length ? makeList(warmups, 'warmup') : null,
      warmups.length && mains.length ? el('h3', { class: 'section-label' }, 'Principal') : null,
      mains.length ? makeList(mains, 'main') : null,
      addButton,
    );
  },

  renderCard(ex, owner, onChange) {
    const chips = [];
    if (ex.vest) chips.push(el('span', { class: 'chip' }, `Gilet (${formatNumber(appData.settings.vestKg)} kg)`));
    else if (ex.weightKg > 0) chips.push(el('span', { class: 'chip' }, `+${formatNumber(ex.weightKg)} kg`));
    if (ex.restSec) chips.push(el('span', { class: 'chip' }, `Repos ${formatDuration(ex.restSec)}`));

    const color = exerciseColor(ex);
    return el('article', {
      class: 'ex-card sortable-item' + (ex.role === 'warmup' ? ' warmup' : ''),
      'data-id': ex.id,
      style: color ? `--card-color:${color}` : null, // la bande de couleur à gauche
    },
      el('div', {
        class: 'ex-main',
        role: 'button',
        tabindex: '0',
        onclick: () => this.edit(ex, owner, onChange),
        onkeydown: (e) => { if (e.key === 'Enter') this.edit(ex, owner, onChange); },
      },
        el('div', { class: 'ex-name' }, ex.name),
        this.renderSets(ex),
        chips.length ? el('div', { class: 'chips' }, chips) : null,
        ex.note ? el('div', { class: 'ex-note' }, ex.note) : null,
        this.renderHowTo(ex),
        this.tracking && ex.role !== 'warmup' ? this.renderPerfRow(ex, owner, onChange) : null,
      ),
      el('div', { class: 'ex-side' },
        el('button', {
          class: 'icon-btn',
          'aria-label': `Options pour ${ex.name}`,
          onclick: () => this.openMenu(ex, owner, onChange),
        }, '⋯'),
        el('div', { class: 'drag-handle', 'aria-label': 'Glisser pour déplacer', title: 'Glisser pour déplacer' }, '⠿'),
      ),
    );
  },

  // Ligne "+ Noter   Dernier : 8 · Record : 10" en bas de la carte
  renderPerfRow(ex, owner, onChange) {
    const stats = perfStats(ex.name);
    const stop = (fn) => (e) => { e.stopPropagation(); fn(); }; // ne pas ouvrir le formulaire
    return el('div', { class: 'perf-row' },
      el('button', {
        type: 'button', class: 'perf-log-btn',
        onclick: stop(() => LogSheet.open({ name: ex.name, exercise: ex, onDone: onChange })),
      }, '+ Noter'),
      isTestWeek() && isPinned(ex.name) ? el('span', { class: 'test-badge' }, '🎯 Test : note ton max') : null,
      el('button', {
        type: 'button', class: 'perf-stats',
        'aria-label': `Fiche de ${ex.name}`,
        onclick: stop(() => this.openSheet(ex, owner, onChange)),
      },
        stats
          ? `Dernier : ${formatPerf(stats.last.value, stats.last.unit)} · Record : ${formatPerf(stats.record.value, stats.record.unit)}`
          : 'Fiche',
        el('span', { class: 'chevron', 'aria-hidden': 'true' }, ' ›'),
      ),
    );
  },

  openSheet(ex, owner, onChange) {
    ProgressSheet.open({ name: ex.name, exercise: ex, owner, onChange });
  },

  // Bloc dépliable "Comment faire" (fermé par défaut).
  // "details" est un élément HTML qui se déplie tout seul quand on touche son titre ("summary").
  renderHowTo(ex) {
    if (!ex.howTo) return null;
    return el('details', {
      class: 'howto',
      onclick: (e) => e.stopPropagation(), // toucher le bloc ne doit pas ouvrir le formulaire
      onkeydown: (e) => e.stopPropagation(),
    },
      el('summary', {}, 'Comment faire'),
      el('p', {}, ex.howTo),
    );
  },

  // Découpe l'affichage des sets en { main: "3 × 12", unit: "reps /jambe" } (ou null si rien n'est rempli)
  setsParts(ex) {
    let target = null;
    let unit = '';
    if (ex.toMax) target = 'max';
    else if (ex.target !== null) {
      if (ex.type === 'hold') target = formatDuration(ex.target);
      else if (ex.type === 'distance') target = `${formatNumber(ex.target)} m`;
      else { target = String(ex.target); unit = 'reps'; }
    }
    if (target === null && ex.sets === null) return null;

    let main;
    if (ex.sets !== null && target !== null) main = `${ex.sets} × ${target}`;
    else if (target !== null) main = target;
    else { main = String(ex.sets); unit = ex.sets > 1 ? 'sets' : 'set'; }

    if (ex.perSide) unit = `${unit} /${ex.perSide}`.trim();
    return { main, unit };
  },

  // "3 × 12 reps", "4 × 20 s", "2 × 45 s /côté", "6 × 20 m", "Sets à définir"…
  renderSets(ex) {
    const parts = this.setsParts(ex);
    if (!parts) return el('div', { class: 'ex-sets empty' }, ex.type === 'hold' ? 'Durée à définir' : 'Sets à définir');
    return el('div', { class: 'ex-sets' }, parts.main, parts.unit ? el('span', { class: 'unit' }, parts.unit) : null);
  },

  // Version courte en texte, ex. "3 × 12", "2 × 30 s", "3 × 5 /bras" (vide si rien n'est rempli)
  compactSets(ex) {
    const parts = this.setsParts(ex);
    if (!parts) return '';
    // Avec des sets, "reps" est sous-entendu : "3 × 12" suffit
    const unit = ex.sets !== null ? parts.unit.replace(/^reps\s*/, '') : parts.unit;
    return unit ? `${parts.main} ${unit}` : parts.main;
  },

  // ---------- Actions ----------

  add(owner, onChange, defaults = {}) {
    ExerciseForm.open({
      defaults,
      onSave: (draft) => {
        owner.exercises.push(draft);
        sortByRole(owner);
        onChange();
      },
    });
  },

  edit(ex, owner, onChange) {
    ExerciseForm.open({
      exercise: ex,
      onSave: (draft) => {
        Object.assign(ex, draft);
        sortByRole(owner);
        onChange();
      },
      onDelete: () => this.remove(ex, owner, onChange),
    });
  },

  duplicate(ex, owner, onChange) {
    const index = owner.exercises.indexOf(ex);
    owner.exercises.splice(index + 1, 0, cloneExercise(ex));
    onChange();
    showToast(`« ${ex.name} » dupliqué`);
  },

  remove(ex, owner, onChange) {
    const index = owner.exercises.indexOf(ex);
    if (index === -1) return;
    owner.exercises.splice(index, 1);
    onChange();
    // Pas de confirmation, mais un bouton "Annuler" pendant quelques secondes
    showToast(`« ${ex.name} » supprimé`, {
      actionLabel: 'Annuler',
      onAction: () => {
        owner.exercises.splice(index, 0, ex);
        onChange();
      },
    });
  },

  openMenu(ex, owner, onChange) {
    actionSheet(ex.name, [
      { label: 'Modifier', onClick: () => this.edit(ex, owner, onChange) },
      { label: 'Fiche et progression', onClick: () => this.openSheet(ex, owner, onChange) },
      { label: 'Dupliquer', onClick: () => this.duplicate(ex, owner, onChange) },
      { label: 'Supprimer', danger: true, onClick: () => this.remove(ex, owner, onChange) },
    ]);
  },
};
