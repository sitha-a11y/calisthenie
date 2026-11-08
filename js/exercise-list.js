// exercise-list.js — affiche une liste d'exercices (cartes, glisser-déposer, menus).
// Utilisé pour les jours de la semaine ET pour les groupes des routines quotidiennes.
//
// "owner" = l'objet qui contient le tableau "exercises" (un jour, ou un groupe).
// "onChange" = fonction appelée après chaque modification (pour enregistrer et réafficher).

const ExerciseList = {
  render(owner, onChange, { newDefaults = {}, emptyText = 'Aucun exercice pour l’instant.' } = {}) {
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
    if (ex.weightKg > 0) chips.push(el('span', { class: 'chip' }, `+${formatNumber(ex.weightKg)} kg`));
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

  // "3 × 12 reps", "4 × 20 s", "Sets à définir"…
  renderSets(ex) {
    const isHold = ex.type === 'hold';
    const unit = (text) => el('span', { class: 'unit' }, text);
    const targetText = ex.target === null ? null : (isHold ? formatDuration(ex.target) : String(ex.target));

    if (ex.sets !== null && targetText !== null) {
      return el('div', { class: 'ex-sets' }, `${ex.sets} × ${targetText}`, isHold ? null : unit('reps'));
    }
    if (targetText !== null) {
      return el('div', { class: 'ex-sets' }, targetText, isHold ? null : unit('reps'));
    }
    if (ex.sets !== null) {
      return el('div', { class: 'ex-sets' }, String(ex.sets), unit(ex.sets > 1 ? 'sets' : 'set'));
    }
    return el('div', { class: 'ex-sets empty' }, isHold ? 'Durée à définir' : 'Sets à définir');
  },

  // Version courte en texte, ex. "3 × 12" ou "2 × 30 s" (vide si rien n'est rempli)
  compactSets(ex) {
    const isHold = ex.type === 'hold';
    const target = ex.target === null ? null : (isHold ? formatDuration(ex.target) : String(ex.target));
    if (ex.sets !== null && target !== null) return `${ex.sets} × ${target}`;
    if (target !== null) return isHold ? target : `${target} reps`;
    if (ex.sets !== null) return `${ex.sets} sets`;
    return '';
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
      { label: 'Dupliquer', onClick: () => this.duplicate(ex, owner, onChange) },
      { label: 'Supprimer', danger: true, onClick: () => this.remove(ex, owner, onChange) },
    ]);
  },
};
