// settings.js — l'écran "Réglages".

const SettingsView = {
  render() {
    const root = document.getElementById('view-settings');
    root.replaceChildren(
      el('h1', { class: 'page-title' }, 'Réglages'),
      this.renderWeekCard(),
      this.renderEquipmentCard(),
      this.renderBackupCard(),
      this.renderCategoriesCard(),
      this.renderProgramCard(),
    );
  },

  // Matériel : poids du gilet lesté
  renderEquipmentCard() {
    return el('div', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Matériel'),
      field('Poids du gilet lesté (kg)', numberStepper({
        value: appData.settings.vestKg,
        step: 0.5,
        min: 0,
        decimals: true,
        label: 'Poids du gilet en kg',
        onChange: (v) => {
          if (v === null) return; // champ vidé : on garde l'ancien poids
          appData.settings.vestKg = v;
          saveData(appData);
        },
      })),
      el('p', { class: 'hint' }, 'Affiché sur les exercices marqués « Gilet lesté ».'),
    );
  },

  // Exporter / importer
  renderBackupCard() {
    const last = appData.settings.lastExport;
    const fileInput = el('input', {
      type: 'file',
      accept: '.json,application/json',
      class: 'visually-hidden',
      'aria-hidden': 'true',
      tabindex: '-1',
      onchange: async (e) => {
        const file = e.target.files[0];
        e.target.value = ''; // pour pouvoir réimporter le même fichier
        if (file && await Backup.importFile(file)) this.render();
      },
    });

    return el('div', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Sauvegarde'),
      el('p', { class: 'muted' },
        'Tes données restent dans ce navigateur. Exporte-les de temps en temps dans un fichier pour ne rien perdre. ',
        el('strong', {}, last ? `Dernier export : ${formatLongDate(parseISODate(last))}.` : 'Aucun export pour l’instant.')),
      el('div', { class: 'form-actions' },
        el('button', {
          type: 'button', class: 'btn btn-primary',
          onclick: async () => { if (await Backup.exportData()) this.render(); },
        }, 'Exporter mes données'),
        el('button', {
          type: 'button', class: 'btn btn-secondary',
          onclick: () => fileInput.click(),
        }, 'Importer un fichier'),
      ),
      fileInput,
      el('p', { class: 'hint' }, 'Importer remplace toutes les données actuelles (une confirmation est demandée).'),
    );
  },

  // Recharger le programme de départ (utile si tu as déjà des données de test)
  renderProgramCard() {
    return el('div', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Programme de départ'),
      el('p', { class: 'muted' },
        'Remet ton programme A/B et tes étirements du matin tels qu’au premier lancement (avec les sets, reps et repos prévus).'),
      el('button', {
        type: 'button',
        class: 'btn btn-secondary',
        onclick: async () => {
          const ok = await confirmSheet('Charger le programme de départ ?',
            'Les semaines A et B et les routines quotidiennes seront remplacées. Tes couleurs, ta progression et ta bibliothèque perso sont gardées.',
            'Charger', { danger: true });
          if (!ok) return;
          applyDefaultProgram(appData);
          saveData(appData);
          WeekView.goToToday();
          showToast('Programme de départ chargé');
        },
      }, 'Charger mon programme de départ'),
    );
  },

  // Couleur de chaque catégorie
  renderCategoriesCard() {
    const rows = CATEGORY_KEYS.map((key) => {
      const cat = appData.categories[key];
      return el('button', {
        type: 'button',
        class: 'list-row',
        onclick: () => this.editCategoryColor(key),
      },
        el('span', { class: 'dot dot-lg', style: `background:${cat.color}` }),
        el('span', { class: 'list-row-label' }, cat.name),
        el('span', { class: 'chevron', 'aria-hidden': 'true' }, '›'),
      );
    });

    return el('div', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Couleurs des catégories'),
      el('p', { class: 'muted' }, 'Touche une catégorie pour changer sa couleur.'),
      el('div', { class: 'list' }, rows),
      el('button', {
        type: 'button',
        class: 'link-btn reset-btn',
        onclick: async () => {
          const ok = await confirmSheet('Couleurs par défaut ?',
            'Les 7 catégories reprendront leur couleur d’origine. Les couleurs perso des exercices ne changent pas.',
            'Réinitialiser');
          if (!ok) return;
          appData.categories = createDefaultCategories();
          saveData(appData);
          this.render();
        },
      }, 'Remettre les couleurs par défaut'),
    );
  },

  editCategoryColor(key) {
    const cat = appData.categories[key];
    openSheet(`Couleur : ${cat.name}`, el('div', {},
      colorPicker({
        value: cat.color,
        onChange: (color) => {
          cat.color = color;
          saveData(appData);
          this.render(); // la liste derrière se met à jour en direct
        },
      }),
      el('p', { class: 'hint' }, 'Le « + » ouvre le sélecteur pour choisir n’importe quelle couleur.'),
    ));
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
