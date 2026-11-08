// settings.js — l'écran "Réglages".

const SettingsView = {
  render() {
    const root = document.getElementById('view-settings');
    root.replaceChildren(
      el('h1', { class: 'page-title' }, 'Réglages'),
      this.renderWeekCard(),
    );
  },

  // Définir quelle semaine est une semaine A
  renderWeekCard() {
    const today = new Date();
    const currentLetter = weekLetterFor(today, appData.settings.weekAReference);
    const thisMonday = mondayOf(today);

    const setReference = (mondayDate) => {
      appData.settings.weekAReference = toISODate(mondayDate);
      saveData(appData);
      WeekView.goToToday();
      this.render();
    };

    // "Cette semaine est A" ou "Cette semaine est B"
    const setThisWeekAs = (letter) => {
      const ref = new Date(thisMonday);
      if (letter === 'B') ref.setDate(ref.getDate() - 7); // la semaine A était la précédente
      setReference(ref);
    };

    const dateInput = el('input', {
      type: 'date',
      class: 'input',
      value: appData.settings.weekAReference,
      onchange: (e) => { if (e.target.value) setReference(mondayOf(parseISODate(e.target.value))); },
    });

    return el('div', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Semaines A / B'),
      el('p', { class: 'muted' },
        'Cette semaine (du ', formatLongDate(thisMonday), ') est une ',
        el('strong', {}, `semaine ${currentLetter}`), '.'),
      el('div', { class: 'segmented' },
        ['A', 'B'].map((letter) => el('button', {
          class: 'seg' + (letter === currentLetter ? ' active' : ''),
          onclick: () => setThisWeekAs(letter),
        }, `Cette semaine = ${letter}`)),
      ),
      el('label', { class: 'field' },
        el('span', { class: 'field-label' }, 'Ou choisis une date : la semaine qui la contient est une semaine A'),
        dateInput,
      ),
      el('p', { class: 'hint' }, 'Ensuite, A et B alternent automatiquement chaque lundi.'),
    );
  },
};
