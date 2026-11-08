// ui.js — petits outils réutilisables pour fabriquer l'interface.

// el() fabrique un élément HTML depuis le JavaScript.
// Exemple : el('button', { class: 'big', onclick: maFonction }, 'Valider')
// crée <button class="big">Valider</button> qui appelle maFonction au clic.
// Le texte est inséré tel quel (jamais interprété comme du HTML) : c'est plus sûr.
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);

  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (name.startsWith('on') && typeof value === 'function') {
      node.addEventListener(name.slice(2), value); // onclick → événement "click"
    } else if (name === 'value' || name === 'checked') {
      node[name] = value;
    } else {
      node.setAttribute(name, value === true ? '' : value);
    }
  }

  children.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child instanceof Node ? child : String(child));
  });

  return node;
}

// ---------- Mise en forme des nombres ----------

// 90 → "1 min 30", 45 → "45 s", 300 → "5 min"
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds} s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec ? `${min} min ${sec}` : `${min} min`;
}

// 2.5 → "2,5" (virgule à la française)
function formatNumber(n) {
  return String(n).replace('.', ',');
}

// ---------- Champs de formulaire ----------

// Un champ avec son titre au-dessus
function field(label, ...children) {
  return el('div', { class: 'field' },
    label instanceof Node ? label : el('span', { class: 'field-label' }, label),
    children);
}

// Interrupteur on/off (style iPhone)
function toggleSwitch(checked, onChange, label) {
  return el('label', { class: 'switch-row' },
    el('span', {}, label),
    el('span', { class: 'switch' },
      el('input', { type: 'checkbox', checked, onchange: (e) => onChange(e.target.checked) }),
      el('span', { class: 'switch-track' }),
    ),
  );
}

// Boutons à choix unique côte à côte (ex. Reps | Hold)
function segmentedControl(options, current, onChange) {
  // "accent" : l'option choisie est bien visible (fond et bordure bleus)
  const wrap = el('div', { class: 'segmented accent' });
  options.forEach((opt) => {
    const btn = el('button', {
      type: 'button',
      class: 'seg' + (opt.value === current ? ' active' : ''),
      onclick: () => {
        wrap.querySelectorAll('.seg').forEach((s) => s.classList.remove('active'));
        btn.classList.add('active');
        onChange(opt.value);
      },
    }, opt.label);
    wrap.append(btn);
  });
  // Pour changer le choix depuis le code (sans déclencher onChange)
  wrap.setValue = (value) => {
    [...wrap.children].forEach((b, i) => b.classList.toggle('active', options[i].value === value));
  };
  return wrap;
}

// Pastilles à choix unique, qui passent à la ligne si besoin (ex. les catégories)
// options = [{ value, label, color }]
function choiceChips(options, current, onChange) {
  const wrap = el('div', { class: 'choice-chips', role: 'radiogroup' });
  options.forEach((opt) => {
    const btn = el('button', {
      type: 'button',
      role: 'radio',
      class: 'choice-chip' + (opt.value === current ? ' active' : ''),
      'aria-checked': opt.value === current ? 'true' : 'false',
      onclick: () => {
        wrap.querySelectorAll('.choice-chip').forEach((c) => {
          c.classList.remove('active');
          c.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        onChange(opt.value);
      },
    },
      opt.color ? el('span', { class: 'dot', style: `background:${opt.color}` }) : null,
      opt.label,
    );
    wrap.append(btn);
  });
  wrap.setValue = (value) => {
    [...wrap.children].forEach((b, i) => {
      const on = options[i].value === value;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  };
  return wrap;
}

// ---------- Choix de couleur ----------

// Palette proposée (couleurs vives qui ressortent bien sur fond sombre)
const PALETTE = [
  '#ff6b6b', '#ff922b', '#fcc419', '#94d82d', '#51cf66', '#20c997',
  '#22b8cf', '#4dabf7', '#748ffc', '#9775fa', '#da77f2', '#f06595',
];

// Rangée de pastilles de couleur + une pastille "couleur perso".
// - value : couleur choisie ("#rrggbb"), ou null pour "Auto"
// - autoColor : fonction qui renvoie la couleur "Auto" (ou rien : pas de choix Auto)
function colorPicker({ value, autoColor = null, onChange }) {
  let current = value;
  const wrap = el('div', { class: 'swatches', role: 'radiogroup' });
  const swatches = []; // { node, color }

  const select = (color) => {
    current = color;
    onChange(color);
    update();
  };

  if (autoColor) {
    const auto = el('button', {
      type: 'button', class: 'swatch swatch-auto', role: 'radio', 'aria-label': 'Couleur de la catégorie',
      onclick: () => select(null),
    }, el('span', { class: 'dot' }), 'Auto');
    swatches.push({ node: auto, color: null });
    wrap.append(auto);
  }

  PALETTE.forEach((color) => {
    const node = el('button', {
      type: 'button', class: 'swatch', role: 'radio', 'aria-label': color,
      style: `background:${color}`,
      onclick: () => select(color),
    });
    swatches.push({ node, color });
    wrap.append(node);
  });

  // Couleur perso : le sélecteur de couleur du système (iPhone ou Mac)
  const customInput = el('input', {
    type: 'color',
    'aria-label': 'Couleur personnalisée',
    value: value && !PALETTE.includes(value) ? value : '#ffffff',
    oninput: (e) => select(e.target.value),
  });
  const custom = el('label', { class: 'swatch swatch-custom', title: 'Couleur perso' },
    el('span', { class: 'swatch-plus', 'aria-hidden': 'true' }, '+'), customInput);
  wrap.append(custom);

  // Met à jour l'affichage sans tout reconstruire (sinon le sélecteur se fermerait)
  function update() {
    swatches.forEach(({ node, color }) => {
      const on = color === current;
      node.classList.toggle('selected', on);
      node.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    if (autoColor) {
      const autoDot = wrap.querySelector('.swatch-auto .dot');
      const c = autoColor();
      autoDot.style.background = c || 'transparent';
      autoDot.classList.toggle('empty', !c);
    }
    const isCustom = current !== null && !PALETTE.includes(current);
    custom.classList.toggle('selected', isCustom);
    custom.style.background = isCustom ? current : '';
  }

  update();
  wrap.refresh = update; // pour mettre à jour "Auto" quand la catégorie change
  return wrap;
}

// Champ nombre avec gros boutons − et + (pratique avec des doigts pleins de magnésie)
// "step" peut être un nombre ou une fonction qui renvoie un nombre.
function numberStepper({ value, step = 1, min = 0, decimals = false, placeholder = '—', label, onChange }) {
  const stepOf = () => (typeof step === 'function' ? step() : step);

  const parse = () => {
    const text = input.value.trim().replace(',', '.');
    if (text === '') return null;
    const n = decimals ? parseFloat(text) : parseInt(text, 10);
    return Number.isFinite(n) ? Math.max(min, n) : null;
  };

  const setValue = (n) => {
    input.value = n === null ? '' : formatNumber(n);
    onChange(n);
  };

  const bump = (direction) => {
    let n = (parse() ?? 0) + direction * stepOf();
    n = decimals ? Math.round(n * 100) / 100 : Math.round(n);
    setValue(Math.max(min, n));
  };

  const input = el('input', {
    class: 'stepper-input',
    type: 'text',
    inputmode: decimals ? 'decimal' : 'numeric',
    value: value === null || value === undefined ? '' : formatNumber(value),
    placeholder,
    'aria-label': label,
    oninput: () => onChange(parse()),
  });

  const wrap = el('div', { class: 'stepper' },
    el('button', { type: 'button', class: 'stepper-btn', 'aria-label': 'Moins', onclick: () => bump(-1) }, '−'),
    input,
    el('button', { type: 'button', class: 'stepper-btn', 'aria-label': 'Plus', onclick: () => bump(1) }, '+'),
  );
  wrap.setValue = setValue;
  return wrap;
}

// ---------- Panneaux qui montent du bas ("sheets") ----------

// Ouvre un panneau. Renvoie une fonction close() pour le fermer.
function openSheet(title, content) {
  const overlay = el('div', { class: 'sheet-overlay' });
  const closeBtn = el('button', { type: 'button', class: 'sheet-close', 'aria-label': 'Fermer' }, '✕');
  const sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    el('div', { class: 'sheet-head' },
      el('h2', { class: 'sheet-title' }, title),
      closeBtn,
    ),
    content,
  );
  overlay.append(sheet);
  document.body.append(overlay);
  document.documentElement.classList.add('no-scroll');
  requestAnimationFrame(() => overlay.classList.add('open'));

  let closed = false;
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 250);
    if (!document.querySelector('.sheet-overlay.open')) {
      document.documentElement.classList.remove('no-scroll');
    }
  }

  document.addEventListener('keydown', onKey);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  return close;
}

// Menu d'actions : liste de gros boutons. actions = [{ label, onClick, danger }]
function actionSheet(title, actions) {
  const list = el('div', { class: 'action-list' },
    actions.map((action) => el('button', {
      type: 'button',
      class: 'action-btn' + (action.danger ? ' danger' : ''),
      onclick: () => { close(); action.onClick(); },
    }, action.label)),
  );
  const close = openSheet(title, list);
}

// Demande de confirmation. Renvoie une "promesse" : true si l'utilisateur confirme.
function confirmSheet(title, message, confirmLabel, { danger = false } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const answer = (value) => { if (!answered) { answered = true; close(); resolve(value); } };
    const content = el('div', {},
      el('p', { class: 'muted' }, message),
      el('div', { class: 'form-actions' },
        el('button', { type: 'button', class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), onclick: () => answer(true) }, confirmLabel),
        el('button', { type: 'button', class: 'btn btn-secondary', onclick: () => answer(false) }, 'Annuler'),
      ),
    );
    const close = openSheet(title, content);
    // Si on ferme le panneau autrement (✕, clic à côté), c'est un "non"
    const observer = new MutationObserver(() => {
      if (!document.body.contains(content)) { observer.disconnect(); answer(false); }
    });
    observer.observe(document.body, { childList: true });
  });
}

// ---------- Petit message temporaire en bas de l'écran ("toast") ----------

function showToast(message, { actionLabel, onAction, duration = 5000 } = {}) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const toast = el('div', { class: 'toast', role: 'status' },
    el('span', {}, message),
    actionLabel ? el('button', {
      type: 'button',
      class: 'toast-btn',
      onclick: () => { toast.remove(); onAction(); },
    }, actionLabel) : null,
  );
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
