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

    const labelRow = el('div', { class: 'day-label-row' },
      el('p', { class: 'day-label' }, `${DAY_LONG[this.day]} · semaine ${this.week}`),
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

    let body;
    if (dayData.rest) {
      body = el('div', { class: 'rest-block' },
        el('div', { class: 'rest-icon', 'aria-hidden': 'true' }, '☾'),
        el('p', { class: 'rest-title' }, 'Repos'),
        el('p', { class: 'rest-sub' }, 'Récupère bien.'),
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
      body = el('div', {}, titleInput, this.renderExercises(dayData));
    }

    // La clé "data-key" change à chaque jour → relance la petite animation d'apparition
    return el('div', { class: 'day-content', 'data-key': this.week + this.day },
      labelRow, body, el('div', { class: 'card' }, restToggle));
  },

  renderExercises(dayData) {
    const warmups = dayData.exercises.filter((e) => e.role === 'warmup');
    const mains = dayData.exercises.filter((e) => e.role !== 'warmup');

    const addButton = el('button', {
      class: 'add-btn',
      onclick: () => this.addExercise(),
    }, '+ Ajouter un exercice');

    if (dayData.exercises.length === 0) {
      return el('div', {},
        el('div', { class: 'empty-state' },
          el('p', {}, 'Aucun exercice pour l’instant.'),
          el('p', { class: 'hint' }, 'Ajoute ton premier exercice ci-dessous.'),
        ),
        addButton,
      );
    }

    // Une liste par rôle ; on peut réordonner à l'intérieur de chaque liste
    const makeList = (list, role) => {
      const listEl = el('div', { class: 'ex-list' }, list.map((ex) => this.renderExerciseCard(ex)));
      makeSortable(listEl, (from, to) => {
        moveItem(list, from, to);
        dayData.exercises = role === 'warmup' ? [...list, ...mains] : [...warmups, ...list];
        this.saveAndRender();
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

  renderExerciseCard(ex) {
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
        onclick: () => this.editExercise(ex),
        onkeydown: (e) => { if (e.key === 'Enter') this.editExercise(ex); },
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
          onclick: () => this.openExerciseMenu(ex),
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

  // ---------- Actions sur les exercices ----------

  addExercise() {
    ExerciseForm.open({
      onSave: (draft) => {
        const day = this.currentDay();
        day.exercises.push(draft);
        sortByRole(day);
        this.saveAndRender();
      },
    });
  },

  editExercise(ex) {
    ExerciseForm.open({
      exercise: ex,
      onSave: (draft) => {
        Object.assign(ex, draft);
        sortByRole(this.currentDay());
        this.saveAndRender();
      },
      onDelete: () => this.deleteExercise(ex),
    });
  },

  duplicateExercise(ex) {
    const day = this.currentDay();
    const index = day.exercises.indexOf(ex);
    day.exercises.splice(index + 1, 0, cloneExercise(ex));
    this.saveAndRender();
    showToast(`« ${ex.name} » dupliqué`);
  },

  deleteExercise(ex) {
    const day = this.currentDay();
    const index = day.exercises.indexOf(ex);
    if (index === -1) return;
    day.exercises.splice(index, 1);
    this.saveAndRender();
    // Pas de confirmation, mais un bouton "Annuler" pendant quelques secondes
    showToast(`« ${ex.name} » supprimé`, {
      actionLabel: 'Annuler',
      onAction: () => {
        day.exercises.splice(index, 0, ex);
        this.saveAndRender();
      },
    });
  },

  openExerciseMenu(ex) {
    actionSheet(ex.name, [
      { label: 'Modifier', onClick: () => this.editExercise(ex) },
      { label: 'Dupliquer', onClick: () => this.duplicateExercise(ex) },
      { label: 'Supprimer', danger: true, onClick: () => this.deleteExercise(ex) },
    ]);
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
