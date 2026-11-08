// ui.js — petit outil pour fabriquer des éléments HTML depuis le JavaScript.
//
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
