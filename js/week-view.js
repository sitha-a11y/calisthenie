// week-view.js — l'écran "Séance" : choix de la semaine A/B, des 7 jours, et contenu du jour.

const WeekView = {
  week: 'A',   // semaine affichée
  day: 'mon',  // jour affiché

  // Raccourcis
  currentDay() { return appData.weeks[this.week][this.day]; },
  saveAndRender() { saveData(appData); this.render(); },

  // Se placer sur la semaine et le jour d'aujourd'hui
  goToToday() {
    const today = new Date();
    this.week = weekLetterFor(today, appData.settings.weekAReference);
    this.day = dayKeyFor(today);
  },

  // La vraie date du jour affiché : dans la semaine en cours si c'est sa lettre,
  // sinon dans la semaine suivante (qui a l'autre lettre)
  viewedDate() {
    const today = new Date();
    const currentLetter = weekLetterFor(today, appData.settings.weekAReference);
    const date = mondayOf(today);
    date.setDate(date.getDate() + (this.week === currentLetter ? 0 : 7) + DAY_KEYS.indexOf(this.day));
    return date;
  },

  render() {
    const root = document.getElementById('view-session');
    root.replaceChildren(this.renderHeader(), this.renderDay());
  },

  // ---------- En-tête : aujourd'hui, A/B, 7 jours ----------

  renderHeader() {
    const today = new Date();
    const todayWeek = weekLetterFor(today, appData.settings.weekAReference);
    const todayDay = dayKeyFor(today);
    const isOnToday = this.week === todayWeek && this.day === todayDay;

    const info = el('div', { class: 'today-row' },
      el('p', { class: 'today-info' },
        `Aujourd'hui : ${DAY_LONG[todayDay]} · semaine ${todayWeek}`),
      isOnToday ? null : el('button', {
        class: 'link-btn',
        onclick: () => { this.goToToday(); this.render(); },
      }, "Revenir à aujourd'hui"),
    );

    const weekSwitch = el('div', { class: 'segmented', role: 'tablist' },
      ['A', 'B'].map((w) => el('button', {
        class: 'seg' + (w === this.week ? ' active' : ''),
        role: 'tab',
        'aria-selected': w === this.week ? 'true' : 'false',
        onclick: () => { this.week = w; this.render(); },
      }, `Semaine ${w}`)),
    );

    const tabs = el('div', { class: 'day-tabs', role: 'tablist' },
      DAY_KEYS.map((key) => {
        const dayData = appData.weeks[this.week][key];
        const classes = ['day-tab'];
        if (key === this.day) classes.push('active');
        if (dayData.rest) classes.push('rest');
        return el('button', {
          class: classes.join(' '),
          role: 'tab',
          'aria-selected': key === this.day ? 'true' : 'false',
          onclick: () => { this.day = key; this.render(); },
        },
          el('span', {}, DAY_SHORT[key]),
          el('span', { class: 'today-dot' + (this.week === todayWeek && key === todayDay ? ' on' : '') }),
        );
      }),
    );

    return el('header', { class: 'session-header' }, info, weekSwitch, tabs);
  },

  // ---------- Contenu du jour ----------

  renderDay() {
    const dayData = this.currentDay();
    const date = this.viewedDate();

    const labelRow = el('div', { class: 'day-label-row' },
      el('p', { class: 'day-label' },
        `${formatDayMonth(date)} · semaine ${this.week}`),
      el('button', {
        class: 'icon-btn',
        'aria-label': 'Options du jour',
        onclick: () => this.openDayMenu(),
      }, '⋯'),
    );

    const restToggle = toggleSwitch(dayData.rest, (checked) => {
      dayData.rest = checked;
      this.saveAndRender();
    }, 'Jour de repos');

    // Note du jour : "~70 min", "Natation"…
    const noteInput = (placeholder, extraClass = '') => el('input', {
      class: 'day-note ' + extraClass,
      type: 'text',
      value: dayData.note,
      placeholder,
      'aria-label': 'Note du jour',
      oninput: (e) => { dayData.note = e.target.value; saveData(appData); },
      onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
    });

    let body;
    if (dayData.rest) {
      body = el('div', { class: 'rest-block' },
        el('div', { class: 'rest-icon', 'aria-hidden': 'true' }, '☾'),
        el('p', { class: 'rest-title' }, 'Repos'),
        noteInput('Ajouter une note (ex. natation)', 'centered'),
      );
    } else {
      const titleInput = el('input', {
        class: 'day-title',
        type: 'text',
        value: dayData.title,
        placeholder: 'Nom de la routine',
        'aria-label': 'Nom de la routine',
        oninput: (e) => { dayData.title = e.target.value; saveData(appData); },
        onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
      });
      body = el('div', {},
        titleInput,
        noteInput('Note du jour (ex. ~70 min)'),
        ExerciseList.render(dayData, () => this.saveAndRender()));
    }

    // La clé "data-key" change à chaque jour → relance la petite animation d'apparition
    return el('div', { class: 'day-content', 'data-key': this.week + this.day },
      Backup.renderReminder(() => this.render()),
      labelRow,
      this.renderDailyBlocks(date),
      body,
      el('div', { class: 'card' }, restToggle));
  },

  // Le groupe du jour de chaque routine quotidienne (ex. Étirements matin · Groupe 2)
  renderDailyBlocks(date) {
    const blocks = appData.dailyRoutines
      .filter((routine) => routine.groups.length > 0)
      .map((routine) => {
        const index = dailyGroupIndexFor(routine, date);
        const group = routine.groups[index];
        return el('section', { class: 'daily-block', style: `--group-color:${group.color}` },
          el('button', {
            type: 'button',
            class: 'daily-head',
            'aria-label': `Modifier ${routine.name}`,
            onclick: () => { DailyView.selectGroup(routine.id, index); App.show('daily'); },
          },
            el('span', { class: 'daily-name' }, routine.name),
            el('span', { class: 'daily-group' }, group.name),
            el('span', { class: 'chevron', 'aria-hidden': 'true' }, '›'),
          ),
          routine.reminder ? el('p', { class: 'daily-reminder' }, routine.reminder) : null,
          group.exercises.length
            ? el('ul', { class: 'daily-list' }, group.exercises.map((ex) => {
              const color = exerciseColor(ex);
              const row = [
                el('span', { class: 'dot' + (color ? '' : ' empty'), style: color ? `background:${color}` : null }),
                el('span', { class: 'daily-ex-name' }, ex.name),
                el('span', { class: 'daily-ex-sets' }, ExerciseList.compactSets(ex)),
              ];
              // Avec une explication : la ligne se déplie pour l'afficher
              if (ex.howTo) {
                return el('li', {}, el('details', { class: 'daily-howto' },
                  el('summary', {}, row, el('span', { class: 'chevron', 'aria-hidden': 'true' }, '›')),
                  el('p', {}, ex.howTo)));
              }
              return el('li', {}, el('div', { class: 'daily-row' }, row));
            }))
            : el('p', { class: 'hint daily-empty' }, 'Aucun exercice dans ce groupe.'),
        );
      });
    return blocks.length ? el('div', { class: 'daily-blocks' }, blocks) : null;
  },

  // ---------- Actions sur le jour et la semaine ----------

  openDayMenu() {
    const other = this.week === 'A' ? 'B' : 'A';
    actionSheet(`${DAY_LONG[this.day]} · semaine ${this.week}`, [
      { label: 'Copier ce jour vers…', onClick: () => this.openCopyDay() },
      { label: `Copier la semaine ${this.week} dans la semaine ${other}`, onClick: () => this.copyWeek() },
    ]);
  },

  openCopyDay() {
    const sourceWeek = this.week;
    const sourceDay = this.day;
    const source = this.currentDay();
    let targetWeek = sourceWeek;

    const grid = el('div', { class: 'copy-grid' });
    const renderGrid = () => {
      grid.replaceChildren(...DAY_KEYS.map((key) => {
        const d = appData.weeks[targetWeek][key];
        const isSource = targetWeek === sourceWeek && key === sourceDay;
        let summary = 'Vide';
        if (d.rest) summary = 'Repos';
        else if (d.title) summary = d.title;
        else if (d.exercises.length) summary = `${d.exercises.length} exercice(s)`;
        return el('button', {
          type: 'button',
          class: 'copy-day',
          disabled: isSource,
          onclick: () => pick(targetWeek, key),
        },
          el('span', { class: 'copy-day-name' }, DAY_LONG[key]),
          el('span', { class: 'copy-day-sub' }, isSource ? 'Jour copié' : summary),
        );
      }));
    };

    const pick = async (week, key) => {
      close();
      const target = appData.weeks[week][key];
      const hasContent = target.title || target.exercises.length;
      if (hasContent) {
        const ok = await confirmSheet(
          `Remplacer ${DAY_LONG[key]} ${week} ?`,
          `Son contenu actuel sera remplacé par celui de ${DAY_LONG[sourceDay]} ${sourceWeek}.`,
          'Remplacer',
          { danger: true },
        );
        if (!ok) return;
      }
      const backup = target;
      appData.weeks[week][key] = cloneDay(source);
      this.saveAndRender();
      showToast(`Copié vers ${DAY_LONG[key]} ${week}`, {
        actionLabel: 'Annuler',
        onAction: () => { appData.weeks[week][key] = backup; this.saveAndRender(); },
      });
    };

    renderGrid();
    const close = openSheet('Copier ce jour vers…', el('div', {},
      el('p', { class: 'muted' },
        `Le nom, le repos et les exercices de ${DAY_LONG[sourceDay]} ${sourceWeek} seront copiés.`),
      segmentedControl([
        { value: 'A', label: 'Semaine A' },
        { value: 'B', label: 'Semaine B' },
      ], targetWeek, (v) => { targetWeek = v; renderGrid(); }),
      grid,
    ));
  },

  async copyWeek() {
    const from = this.week;
    const to = from === 'A' ? 'B' : 'A';
    const ok = await confirmSheet(
      `Copier la semaine ${from} dans la semaine ${to} ?`,
      `Les 7 jours de la semaine ${to} seront remplacés par ceux de la semaine ${from}.`,
      'Copier',
      { danger: true },
    );
    if (!ok) return;
    const backup = appData.weeks[to];
    const copy = {};
    DAY_KEYS.forEach((key) => { copy[key] = cloneDay(appData.weeks[from][key]); });
    appData.weeks[to] = copy;
    this.saveAndRender();
    showToast(`Semaine ${from} copiée dans la semaine ${to}`, {
      actionLabel: 'Annuler',
      onAction: () => { appData.weeks[to] = backup; this.saveAndRender(); },
    });
  },
};
