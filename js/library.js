// library.js — l'écran "Biblio" : les progressions par famille, ta progression,
// et le sélecteur utilisé quand on ajoute un exercice à une routine.

const STATUS_CYCLE = { undefined: 'inProgress', inProgress: 'done', done: undefined };
const STATUS_LABEL = { inProgress: 'En cours', done: 'Validé' };

// "Élévation" → "elevation" : pour chercher sans se soucier des accents et majuscules
function normalizeSearch(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const LibraryView = {
  query: '',          // recherche de l'écran Biblio
  open: new Set(),    // familles dépliées sur l'écran Biblio

  render() {
    const root = document.getElementById('view-library');
    root.replaceChildren(
      el('h1', { class: 'page-title' }, 'Bibliothèque'),
      this.build(),
    );
  },

  // Construit la bibliothèque. Avec onPick, c'est un sélecteur : toucher un exercice le choisit.
  build({ onPick = null } = {}) {
    const picking = !!onPick;
    const state = picking ? { query: '', open: new Set() } : this;

    const summary = el('div');
    const list = el('div', { class: 'lib-sections' });
    const refresh = () => {
      if (!picking) summary.replaceChildren(this.renderSummary());
      list.replaceChildren(...this.renderSections(state, onPick, refresh));
    };

    const search = el('input', {
      class: 'input search',
      type: 'search',
      placeholder: 'Rechercher (ex. planche, FL, row)',
      'aria-label': 'Rechercher un exercice',
      value: state.query,
      oninput: (e) => { state.query = e.target.value; refresh(); },
    });

    refresh();
    return el('div', { class: 'library' },
      picking ? null : summary,
      search,
      picking ? null : el('p', { class: 'hint lib-legend' },
        'Touche un exercice pour changer son statut : ○ → ',
        el('span', { class: 'status-dot in-progress' }), ' en cours → ',
        el('span', { class: 'status-dot done' }, '✓'), ' validé'),
      list,
    );
  },

  renderSummary() {
    let done = 0;
    let inProgress = 0;
    let total = 0;
    buildLibrary().forEach((s) => s.families.forEach((f) => f.items.forEach((item) => {
      total++;
      if (appData.progress[item.id] === 'done') done++;
      if (appData.progress[item.id] === 'inProgress') inProgress++;
    })));
    return el('div', { class: 'lib-summary' },
      el('div', {}, el('strong', {}, String(done)), el('span', {}, 'validés')),
      el('div', {}, el('strong', {}, String(inProgress)), el('span', {}, 'en cours')),
      el('div', {}, el('strong', {}, String(total)), el('span', {}, 'exercices')),
    );
  },

  renderSections(state, onPick, refresh) {
    const q = normalizeSearch(state.query);
    const out = [];

    buildLibrary().forEach((section) => {
      const families = [];
      section.families.forEach((family) => {
        const matching = q
          ? family.items.filter((i) => normalizeSearch(i.name).includes(q) || normalizeSearch(family.name).includes(q))
          : family.items;
        if (q && matching.length === 0) return;
        families.push(this.renderFamily(family, matching, state, onPick, refresh, !!q));
      });
      if (families.length) {
        out.push(el('h2', { class: 'section-label lib-section' }, section.section), ...families);
      }
    });

    if (out.length === 0) {
      out.push(el('div', { class: 'empty-state' },
        el('p', {}, 'Aucun exercice trouvé.'),
        onPick && state.query.trim() ? el('button', {
          type: 'button', class: 'btn btn-secondary free-name-btn',
          onclick: () => onPick({ name: state.query.trim(), id: null }),
        }, `Utiliser « ${state.query.trim()} » sans bibliothèque`) : null,
      ));
    }
    return out;
  },

  renderFamily(family, items, state, onPick, refresh, searching) {
    const expanded = searching || state.open.has(family.id);
    const total = family.items.length;
    const done = family.items.filter((i) => appData.progress[i.id] === 'done').length;
    const inProgress = family.items.filter((i) => appData.progress[i.id] === 'inProgress').length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    const categoryColor = family.category ? appData.categories[family.category].color : 'var(--text-faint)';

    const header = el('button', {
      type: 'button',
      class: 'family-head',
      'aria-expanded': expanded ? 'true' : 'false',
      onclick: () => {
        if (state.open.has(family.id)) state.open.delete(family.id); else state.open.add(family.id);
        refresh();
      },
    },
      el('div', { class: 'family-title-row' },
        el('span', { class: 'family-name' }, family.name),
        el('span', { class: 'family-count' },
          total ? `${done}/${total}` : 'vide',
          inProgress ? el('span', { class: 'family-inprogress' }, ` · ${inProgress} en cours`) : null),
        el('span', { class: 'chevron' + (expanded ? ' open' : ''), 'aria-hidden': 'true' }, '›'),
      ),
      total ? el('div', { class: 'progress-bar', 'aria-hidden': 'true' },
        el('div', { class: 'progress-fill', style: `width:${percent}%` })) : null,
    );

    const body = expanded ? el('div', { class: 'family-body' },
      items.length ? items.map((item) => this.renderItem(item, onPick, refresh)) : el('p', { class: 'hint family-empty' },
        family.id === CUSTOM_FAMILY_ID ? 'Ajoute ici tes exercices qui ne sont pas dans le chart.' : 'Aucun exercice.'),
      onPick ? null : el('button', {
        type: 'button',
        class: 'lib-add-btn',
        onclick: () => this.openCustomForm(family, null, refresh),
      }, `+ Ajouter un exercice dans ${family.name}`),
    ) : null;

    return el('section', { class: 'family-card', style: `--family-color:${categoryColor}` }, header, body);
  },

  renderItem(item, onPick, refresh) {
    const status = appData.progress[item.id];
    const level = item.level ? LEVELS[item.level] : null;

    const levelPill = el('span', {
      class: 'level-pill' + (level ? '' : ' unknown'),
      style: level ? `--level-color:${level.color}` : null,
      title: level ? level.label : 'Niveau à confirmer',
    }, level ? level.short : '?');

    const statusDot = el('span', {
      class: 'status-dot' + (status === 'inProgress' ? ' in-progress' : '') + (status === 'done' ? ' done' : ''),
      'aria-hidden': 'true',
    }, status === 'done' ? '✓' : '');

    const main = el('button', {
      type: 'button',
      class: 'lib-item-main',
      'aria-label': onPick ? `Choisir ${item.name}` : `${item.name}${STATUS_LABEL[status] ? ', ' + STATUS_LABEL[status] : ''}. Toucher pour changer le statut`,
      onclick: () => {
        if (onPick) { onPick(item); return; }
        const next = STATUS_CYCLE[status];
        if (next) appData.progress[item.id] = next; else delete appData.progress[item.id];
        saveData(appData);
        refresh();
      },
    },
      levelPill,
      el('span', { class: 'lib-item-name' }, item.name,
        item.milestone ? el('span', { class: 'milestone-star', title: 'Étape clé' }, ' ★') : null),
      onPick ? el('span', { class: 'chevron', 'aria-hidden': 'true' }, '›') : statusDot,
    );

    return el('div', { class: 'lib-item' + (item.milestone ? ' milestone' : '') + (status ? ` status-${status}` : '') },
      main,
      item.custom && !onPick ? el('button', {
        type: 'button', class: 'icon-btn', 'aria-label': `Modifier ${item.name}`,
        onclick: () => this.openCustomForm(null, item, refresh),
      }, '⋯') : null,
    );
  },

  // Ajouter (family) ou modifier (item) un exercice perso dans la bibliothèque
  openCustomForm(family, item, refresh) {
    const familyId = family ? family.id : item.familyId;
    const isCustomFamily = familyId === CUSTOM_FAMILY_ID;
    const saved = item ? appData.customLibrary.find((c) => c.id === item.id) : null;
    const draft = saved ? Object.assign({}, saved) : {
      id: newId('custom'),
      familyId,
      name: '',
      level: null,
      milestone: false,
      type: family.type,
      category: isCustomFamily ? null : family.category,
    };

    const nameInput = el('input', {
      class: 'input input-lg', type: 'text', value: draft.name, placeholder: 'Nom de l’exercice', 'aria-label': 'Nom',
      oninput: (e) => { draft.name = e.target.value; nameInput.classList.remove('invalid'); },
    });

    const form = el('form', {
      class: 'form',
      onsubmit: (e) => {
        e.preventDefault();
        draft.name = draft.name.trim();
        if (!draft.name) { nameInput.classList.add('invalid'); nameInput.focus(); return; }
        if (saved) Object.assign(saved, draft); else appData.customLibrary.push(draft);
        saveData(appData);
        close();
        refresh();
      },
    },
      field('Nom', nameInput),
      field('Niveau', choiceChips([
        ...LEVEL_KEYS.map((key) => ({ value: key, label: LEVELS[key].label, color: LEVELS[key].color })),
        { value: null, label: 'Aucun' },
      ], draft.level, (v) => { draft.level = v; })),
      el('div', { class: 'field' }, toggleSwitch(draft.milestone, (v) => { draft.milestone = v; }, 'Étape clé ★ (milestone)')),
      field('Type', segmentedControl([
        { value: 'reps', label: 'Reps' },
        { value: 'hold', label: 'Hold (maintien)' },
      ], draft.type, (v) => { draft.type = v; })),
      isCustomFamily ? field('Catégorie (couleur)', choiceChips([
        ...CATEGORY_KEYS.map((key) => ({ value: key, label: appData.categories[key].name, color: appData.categories[key].color })),
        { value: null, label: 'Aucune' },
      ], draft.category, (v) => { draft.category = v; })) : null,
      el('div', { class: 'form-actions' },
        el('button', { type: 'submit', class: 'btn btn-primary' }, saved ? 'Enregistrer' : 'Ajouter'),
        saved ? el('button', {
          type: 'button', class: 'btn btn-danger',
          onclick: async () => {
            close();
            const ok = await confirmSheet(`Supprimer « ${saved.name} » ?`,
              'Il sera retiré de la bibliothèque. Les routines qui l’utilisent le gardent.', 'Supprimer', { danger: true });
            if (!ok) return;
            appData.customLibrary = appData.customLibrary.filter((c) => c !== saved);
            delete appData.progress[saved.id];
            saveData(appData);
            refresh();
          },
        }, 'Supprimer') : null,
      ),
    );
    const close = openSheet(saved ? 'Modifier l’exercice perso' : 'Nouvel exercice perso', form);
  },
};
