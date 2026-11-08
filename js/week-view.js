// week-view.js — l'écran "Séance" : choix de la semaine A/B, des 7 jours, et contenu du jour.

const WeekView = {
  week: 'A',   // semaine affichée
  day: 'mon',  // jour affiché

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

    // Interrupteur Semaine A | Semaine B
    const weekSwitch = el('div', { class: 'segmented', role: 'tablist' },
      ['A', 'B'].map((w) => el('button', {
        class: 'seg' + (w === this.week ? ' active' : ''),
        role: 'tab',
        'aria-selected': w === this.week ? 'true' : 'false',
        onclick: () => { this.week = w; this.render(); },
      }, `Semaine ${w}`)),
    );

    // Les 7 onglets
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
          // Petit point bleu = le jour d'aujourd'hui
          el('span', { class: 'today-dot' + (this.week === todayWeek && key === todayDay ? ' on' : '') }),
        );
      }),
    );

    return el('header', { class: 'session-header' }, info, weekSwitch, tabs);
  },

  renderDay() {
    const dayData = appData.weeks[this.week][this.day];
    const save = () => saveData(appData);

    const label = el('p', { class: 'day-label' }, `${DAY_LONG[this.day]} · semaine ${this.week}`);

    const restToggle = toggleSwitch(dayData.rest, (checked) => {
      dayData.rest = checked;
      save();
      this.render();
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
        oninput: (e) => { dayData.title = e.target.value; save(); },
        onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
      });
      body = el('div', {},
        titleInput,
        el('div', { class: 'empty-state' },
          el('p', {}, 'Aucun exercice pour l’instant.'),
          el('p', { class: 'hint' }, 'L’ajout d’exercices arrive à l’étape 2.'),
        ),
      );
    }

    // La clé "data-key" change à chaque jour → relance la petite animation d'apparition
    return el('div', { class: 'day-content', 'data-key': this.week + this.day },
      label, body, el('div', { class: 'card' }, restToggle));
  },
};
