// exercise-form.js — le formulaire pour ajouter ou modifier un exercice.

const ExerciseForm = {
  // exercise : l'exercice à modifier (ou rien pour en créer un nouveau)
  // onSave(brouillon) : appelé avec l'exercice rempli
  // onDelete() : appelé si on appuie sur "Supprimer"
  open({ exercise = null, onSave, onDelete }) {
    const isNew = !exercise;
    // On travaille sur un "brouillon" : rien n'est modifié tant qu'on n'a pas enregistré
    const draft = isNew ? createExercise() : JSON.parse(JSON.stringify(exercise));

    const nameInput = el('input', {
      class: 'input input-lg',
      type: 'text',
      value: draft.name,
      placeholder: 'Ex. Tuck Planche',
      autocomplete: 'off',
      'aria-label': 'Nom',
      oninput: (e) => { draft.name = e.target.value; nameInput.classList.remove('invalid'); },
    });

    // Le titre du champ "cible" dépend du type (reps ou secondes)
    const targetLabel = el('span', { class: 'field-label' });
    const updateTargetLabel = () => {
      targetLabel.textContent = draft.type === 'hold' ? 'Secondes par set' : 'Reps par set';
    };
    updateTargetLabel();

    const restStepper = numberStepper({
      value: draft.restSec, step: 15, label: 'Repos en secondes',
      onChange: (v) => { draft.restSec = v; },
    });

    const content = el('form', {
      class: 'form',
      onsubmit: (e) => { e.preventDefault(); save(); },
    },
      field('Nom', nameInput),

      field('Rôle', segmentedControl([
        { value: 'warmup', label: 'Échauffement' },
        { value: 'main', label: 'Principal' },
      ], draft.role, (v) => { draft.role = v; })),

      field('Type', segmentedControl([
        { value: 'reps', label: 'Reps' },
        { value: 'hold', label: 'Hold (maintien)' },
      ], draft.type, (v) => { draft.type = v; updateTargetLabel(); })),

      field('Sets', numberStepper({
        value: draft.sets, step: 1, label: 'Sets',
        onChange: (v) => { draft.sets = v; },
      })),

      field(targetLabel, numberStepper({
        value: draft.target,
        step: () => (draft.type === 'hold' ? 5 : 1),
        label: 'Cible',
        onChange: (v) => { draft.target = v; },
      })),

      field('Lest (kg)', numberStepper({
        value: draft.weightKg, step: 1, decimals: true, label: 'Lest en kg',
        onChange: (v) => { draft.weightKg = v ?? 0; },
      })),

      field('Repos entre les sets (secondes)',
        restStepper,
        el('div', { class: 'quick-chips' },
          [30, 60, 90, 120, 180].map((s) => el('button', {
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
