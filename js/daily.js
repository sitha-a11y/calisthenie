// daily.js — l'écran "Quotidien" : les routines qui reviennent chaque jour (ex. Étirements matin),
// découpées en groupes de couleur qui alternent automatiquement (groupe 1, groupe 2, groupe 1…).

const DailyView = {
  selected: {}, // groupe affiché pour chaque routine : { idRoutine: numéroDuGroupe }

  saveAndRender() { saveData(appData); this.render(); },

  // Choisir le groupe à afficher (utilisé depuis l'écran Séance)
  selectGroup(routineId, index) { this.selected[routineId] = index; },

  render() {
    const root = document.getElementById('view-daily');
    root.replaceChildren(
      el('h1', { class: 'page-title' }, 'Quotidien'),
      el('p', { class: 'muted' },
        'Routines à faire chaque jour. Les groupes alternent tout seuls : groupe 1 un jour, groupe 2 le lendemain, etc.'),
      ...appData.dailyRoutines.map((routine) => this.renderRoutine(routine)),
      el('button', { class: 'add-btn', onclick: () => this.addRoutine() }, '+ Nouvelle routine quotidienne'),
    );
  },

  renderRoutine(routine) {
    const todayIndex = dailyGroupIndexFor(routine, new Date());
    let index = this.selected[routine.id];
    if (index === undefined || index >= routine.groups.length) index = Math.max(todayIndex, 0);
    const group = routine.groups[index];

    const nameInput = el('input', {
      class: 'routine-title',
      type: 'text',
      value: routine.name,
      placeholder: 'Nom de la routine',
      'aria-label': 'Nom de la routine',
      oninput: (e) => { routine.name = e.target.value; saveData(appData); },
      onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
    });

    // Onglets des groupes (avec "Aujourd'hui" sur le groupe du jour)
    const tabs = el('div', { class: 'group-tabs' },
      routine.groups.map((g, i) => el('button', {
        type: 'button',
        class: 'group-tab' + (i === index ? ' active' : ''),
        style: `--group-color:${g.color}`,
        onclick: () => { this.selected[routine.id] = i; this.render(); },
      },
        el('span', { class: 'dot', style: `background:${g.color}` }),
        g.name,
        i === todayIndex ? el('span', { class: 'today-badge' }, "Aujourd'hui") : null,
      )),
      el('button', {
        type: 'button',
        class: 'group-tab group-add',
        'aria-label': 'Ajouter un groupe',
        onclick: () => this.addGroup(routine),
      }, '+'),
    );

    return el('section', { class: 'card routine-card' },
      el('div', { class: 'routine-head' },
        nameInput,
        el('button', {
          class: 'icon-btn',
          'aria-label': 'Options de la routine',
          onclick: () => this.openRoutineMenu(routine),
        }, '⋯'),
      ),
      tabs,
      group ? this.renderGroup(routine, group, index, todayIndex) : el('p', { class: 'hint' }, 'Ajoute un groupe avec « + ».'),
    );
  },

  renderGroup(routine, group, index, todayIndex) {
    return el('div', { class: 'group-panel', style: `--group-color:${group.color}` },
      el('div', { class: 'group-head' },
        el('span', { class: 'group-head-name' }, group.name),
        el('span', { class: 'hint group-when' },
          index === todayIndex ? "C'est le groupe d'aujourd'hui" : this.nextDateText(routine, index)),
        el('button', {
          class: 'icon-btn',
          'aria-label': `Options de ${group.name}`,
          onclick: () => this.openGroupMenu(routine, group, index),
        }, '⋯'),
      ),
      ExerciseList.render(group, () => this.saveAndRender(), {
        newDefaults: { category: 'mobility', type: 'hold' },
        emptyText: 'Aucun exercice dans ce groupe.',
      }),
    );
  },

  // "Prochaine fois : demain" / "Prochaine fois : jeudi 12 nov."
  nextDateText(routine, index) {
    const date = new Date();
    for (let i = 1; i <= routine.groups.length; i++) {
      date.setDate(date.getDate() + 1);
      if (dailyGroupIndexFor(routine, date) === index) {
        return 'Prochaine fois : ' + (i === 1 ? 'demain' : formatDayMonth(date));
      }
    }
    return '';
  },

  // ---------- Actions ----------

  addRoutine() {
    const routine = createDailyRoutine();
    appData.dailyRoutines.push(routine);
    this.selected[routine.id] = 0;
    this.saveAndRender();
  },

  openRoutineMenu(routine) {
    actionSheet(routine.name || 'Routine', [
      { label: 'Ajouter un groupe', onClick: () => this.addGroup(routine) },
      { label: 'Supprimer cette routine', danger: true, onClick: () => this.deleteRoutine(routine) },
    ]);
  },

  async deleteRoutine(routine) {
    const ok = await confirmSheet(`Supprimer « ${routine.name} » ?`,
      'La routine et tous ses groupes seront supprimés.', 'Supprimer', { danger: true });
    if (!ok) return;
    appData.dailyRoutines = appData.dailyRoutines.filter((r) => r !== routine);
    this.saveAndRender();
  },

  addGroup(routine) {
    // On garde le groupe du jour inchangé : on recale la date de départ après l'ajout
    const todayIndex = dailyGroupIndexFor(routine, new Date());
    const n = routine.groups.length;
    routine.groups.push(createDailyGroup({
      name: `Groupe ${n + 1}`,
      color: PALETTE[(PALETTE.indexOf('#4dabf7') + n * 2) % PALETTE.length],
    }));
    if (todayIndex >= 0) this.setTodayGroup(routine, todayIndex, false);
    this.selected[routine.id] = n;
    this.saveAndRender();
  },

  // Faire du groupe n° "index" celui d'aujourd'hui (la rotation continue ensuite)
  setTodayGroup(routine, index, render = true) {
    const start = new Date();
    start.setDate(start.getDate() - index);
    routine.startDate = toISODate(start);
    if (render) this.saveAndRender();
  },

  openGroupMenu(routine, group, index) {
    actionSheet(group.name, [
      { label: 'Renommer / changer la couleur', onClick: () => this.editGroup(group) },
      { label: "En faire le groupe d'aujourd'hui", onClick: () => this.setTodayGroup(routine, index) },
      { label: 'Supprimer ce groupe', danger: true, onClick: () => this.deleteGroup(routine, group) },
    ]);
  },

  editGroup(group) {
    const draft = { name: group.name, color: group.color };
    const nameInput = el('input', {
      class: 'input input-lg', type: 'text', value: draft.name, 'aria-label': 'Nom du groupe',
      oninput: (e) => { draft.name = e.target.value; },
    });
    const form = el('form', {
      class: 'form',
      onsubmit: (e) => {
        e.preventDefault();
        group.name = draft.name.trim() || group.name;
        group.color = draft.color;
        close();
        this.saveAndRender();
      },
    },
      field('Nom', nameInput),
      field('Couleur', colorPicker({ value: draft.color, onChange: (c) => { draft.color = c; } })),
      el('div', { class: 'form-actions' }, el('button', { type: 'submit', class: 'btn btn-primary' }, 'Enregistrer')),
    );
    const close = openSheet('Modifier le groupe', form);
  },

  deleteGroup(routine, group) {
    const todayIndex = dailyGroupIndexFor(routine, new Date());
    const todayGroup = routine.groups[todayIndex];
    const index = routine.groups.indexOf(group);
    const oldStart = routine.startDate;
    routine.groups.splice(index, 1);
    // Si on n'a pas supprimé le groupe du jour, il reste le groupe du jour
    const keep = routine.groups.indexOf(todayGroup);
    if (keep >= 0) this.setTodayGroup(routine, keep, false);
    this.selected[routine.id] = Math.max(0, Math.min(index, routine.groups.length - 1));
    this.saveAndRender();
    showToast(`« ${group.name} » supprimé`, {
      actionLabel: 'Annuler',
      onAction: () => {
        routine.groups.splice(index, 0, group);
        routine.startDate = oldStart;
        this.saveAndRender();
      },
    });
  },
};
