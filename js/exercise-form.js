// exercise-form.js — le formulaire pour ajouter ou modifier un exercice.

const ExerciseForm = {
  // exercise : l'exercice à modifier (ou rien pour en créer un nouveau)
  // onSave(brouillon) : appelé avec l'exercice rempli
  // onDelete() : appelé si on appuie sur "Supprimer"
  // defaults : valeurs de départ d'un nouvel exercice (ex. { category: 'mobility' })
  open({ exercise = null, defaults = {}, onSave, onDelete }) {
    const isNew = !exercise;
    // On travaille sur un "brouillon" : rien n'est modifié tant qu'on n'a pas enregistré
    const draft = isNew ? createExercise(defaults) : JSON.parse(JSON.stringify(exercise));

    const nameInput = el('input', {
      class: 'input input-lg',
      type: 'text',
      value: draft.name,
      placeholder: 'Ex. Tuck Planche',
      autocomplete: 'off',
      'aria-label': 'Nom',
      oninput: (e) => { draft.name = e.target.value; nameInput.classList.remove('invalid'); },
    });

    // Le titre du champ "cible" dépend du type (reps, secondes ou mètres)
    const targetLabel = el('span', { class: 'field-label' });
    const updateTargetLabel = () => {
      targetLabel.textContent = { reps: 'Reps par set', hold: 'Secondes par set', distance: 'Mètres par set' }[draft.type];
    };
    updateTargetLabel();

    const restStepper = numberStepper({
      value: draft.restSec, step: 15, label: 'Repos en secondes',
      onChange: (v) => { draft.restSec = v; },
    });

    // Couleur : "Auto" = couleur de la catégorie choisie
    const colorField = colorPicker({
      value: draft.color,
      autoColor: () => (appData.categories[draft.category] || {}).color,
      onChange: (c) => { draft.color = c; },
    });

    const categoryField = choiceChips(
      [
        ...CATEGORY_KEYS.map((key) => ({
          value: key, label: appData.categories[key].name, color: appData.categories[key].color,
        })),
        { value: null, label: 'Aucune' },
      ],
      draft.category,
      (v) => { draft.category = v; colorField.refresh(); },
    );

    const typeControl = segmentedControl([
      { value: 'reps', label: 'Reps' },
      { value: 'hold', label: 'Hold' },
      { value: 'distance', label: 'Distance' },
    ], draft.type, (v) => { draft.type = v; updateTargetLabel(); });

    // Cible : un nombre, ou "max" (le champ nombre se cache quand "max" est activé)
    const targetWrap = el('div', {}, numberStepper({
      value: draft.target,
      step: () => ({ reps: 1, hold: 5, distance: 5 }[draft.type]),
      label: 'Cible',
      onChange: (v) => { draft.target = v; },
    }));
    targetWrap.hidden = draft.toMax;
    const maxToggle = toggleSwitch(draft.toMax, (v) => { draft.toMax = v; targetWrap.hidden = v; },
      'Max (jusqu’à l’échec)');

    // Lest : un nombre de kg, ou le gilet lesté (son poids se règle dans Réglages)
    const weightWrap = el('div', {}, numberStepper({
      value: draft.weightKg, step: 1, decimals: true, label: 'Lest en kg',
      onChange: (v) => { draft.weightKg = v ?? 0; },
    }));
    weightWrap.hidden = draft.vest;
    const vestToggle = toggleSwitch(draft.vest, (v) => { draft.vest = v; weightWrap.hidden = v; },
      `Gilet lesté (${formatNumber(appData.settings.vestKg)} kg)`);

    // Ligne "Bibliothèque : Front Lever · Intermédiaire ★" quand l'exercice y est relié
    const libInfo = el('div', { class: 'lib-link' });
    const updateLibInfo = () => {
      const item = draft.libraryId ? findLibraryItem(draft.libraryId) : null;
      if (!item) { libInfo.replaceChildren(); return; }
      const level = item.level ? LEVELS[item.level] : null;
      libInfo.replaceChildren(
        el('span', {}, '📚 ', item.name, level ? ` · ${level.label}` : '', item.milestone ? ' ★' : ''),
        el('button', {
          type: 'button', class: 'link-btn',
          onclick: () => { draft.libraryId = null; updateLibInfo(); },
        }, 'Retirer le lien'),
      );
    };
    updateLibInfo();

    // Choisir dans la bibliothèque : remplit le nom, le type et la catégorie
    const pickFromLibrary = () => {
      const closePicker = openSheet('Choisir dans la bibliothèque', LibraryView.build({
        onPick: (item) => {
          closePicker();
          draft.name = item.name;
          nameInput.value = item.name;
          nameInput.classList.remove('invalid');
          draft.libraryId = item.id;
          if (item.id) {
            draft.type = item.type;
            typeControl.setValue(item.type);
            updateTargetLabel();
            if (item.category) {
              draft.category = item.category;
              categoryField.setValue(item.category);
              colorField.refresh();
            }
          }
          updateLibInfo();
        },
      }));
    };

    const content = el('form', {
      class: 'form',
      onsubmit: (e) => { e.preventDefault(); save(); },
    },
      field('Nom', nameInput,
        el('button', { type: 'button', class: 'btn btn-secondary pick-btn', onclick: pickFromLibrary },
          '📚 Choisir dans la bibliothèque'),
        libInfo),

      field('Catégorie', categoryField),

      field('Couleur de la carte', colorField,
        el('p', { class: 'hint' }, '« Auto » reprend la couleur de la catégorie.')),

      field('Rôle', segmentedControl([
        { value: 'warmup', label: 'Échauffement' },
        { value: 'main', label: 'Principal' },
      ], draft.role, (v) => { draft.role = v; })),

      field('Type', typeControl),

      field('Sets', numberStepper({
        value: draft.sets, step: 1, label: 'Sets',
        onChange: (v) => { draft.sets = v; },
      })),

      field(targetLabel, targetWrap, maxToggle),

      field('Par côté', choiceChips([
        { value: null, label: 'Non' },
        { value: 'côté', label: '/côté' },
        { value: 'jambe', label: '/jambe' },
        { value: 'bras', label: '/bras' },
      ], draft.perSide, (v) => { draft.perSide = v; })),

      field('Lest (kg)', vestToggle, weightWrap),

      field('Repos entre les sets (secondes)',
        restStepper,
        el('div', { class: 'quick-chips' },
          [30, 60, 90, 120, 150, 180].map((s) => el('button', {
            type: 'button', class: 'quick-chip', onclick: () => restStepper.setValue(s),
          }, formatDuration(s))),
          el('button', { type: 'button', class: 'quick-chip', onclick: () => restStepper.setValue(null) }, 'Aucun'),
        ),
      ),

      field('Note', el('textarea', {
        class: 'input textarea',
        rows: 2,
        value: draft.note,
        placeholder: 'Ex. 5 s descente, 5 s montée',
        'aria-label': 'Note',
        oninput: (e) => { draft.note = e.target.value; },
      })),

      el('div', { class: 'form-actions' },
        el('button', { type: 'submit', class: 'btn btn-primary' }, isNew ? 'Ajouter' : 'Enregistrer'),
        isNew ? null : el('button', {
          type: 'button',
          class: 'btn btn-danger',
          onclick: () => { close(); onDelete(); },
        }, 'Supprimer'),
      ),
    );

    const close = openSheet(isNew ? 'Nouvel exercice' : 'Modifier l’exercice', content);

    function save() {
      draft.name = draft.name.trim();
      if (!draft.name) {
        nameInput.classList.add('invalid');
        nameInput.focus();
        return;
      }
      draft.note = draft.note.trim();
      close();
      onSave(draft);
    }
  },
};
