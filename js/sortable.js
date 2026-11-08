// sortable.js — réordonner une liste en faisant glisser la poignée ⠿.
//
// On utilise les "pointer events" : des événements qui marchent pareil
// avec le doigt (iPhone) et avec la souris (Mac).
//
// makeSortable(liste, (de, vers) => { ... }) : la fonction est appelée
// quand l'élément n° "de" a été déposé à la position "vers".

function makeSortable(listEl, onReorder) {
  listEl.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle || !listEl.contains(handle)) return;

    const items = [...listEl.querySelectorAll(':scope > .sortable-item')];
    const item = handle.closest('.sortable-item');
    const from = items.indexOf(item);
    if (items.length < 2 || from === -1) return;
    e.preventDefault();

    // Positions de départ de chaque élément (dans la page, pas dans l'écran)
    const startScroll = window.scrollY;
    const rects = items.map((it) => {
      const r = it.getBoundingClientRect();
      return { top: r.top + startScroll, height: r.height };
    });
    const gap = parseFloat(getComputedStyle(listEl).rowGap) || 0;
    const shift = rects[from].height + gap; // de combien les voisins se décalent
    const startY = e.clientY;
    let lastY = e.clientY;
    let to = from;

    item.classList.add('dragging');
    listEl.classList.add('is-sorting');
    document.body.classList.add('no-select');
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* sans importance */ }

    const update = () => {
      const dy = lastY - startY + (window.scrollY - startScroll);
      item.style.transform = `translateY(${dy}px)`;

      // Nouvelle position = nombre d'autres éléments dont le centre est au-dessus du nôtre
      const center = rects[from].top + rects[from].height / 2 + dy;
      to = 0;
      rects.forEach((r, i) => { if (i !== from && r.top + r.height / 2 < center) to++; });

      // Les voisins s'écartent pour faire de la place
      items.forEach((it, i) => {
        if (i === from) return;
        let s = 0;
        if (i > from && i <= to) s = -shift;
        else if (i < from && i >= to) s = shift;
        it.style.transform = s ? `translateY(${s}px)` : '';
      });
    };

    // Défilement automatique quand on approche du haut ou du bas de l'écran
    const autoScroll = setInterval(() => {
      if (Math.abs(lastY - startY) < 10) return;
      if (lastY > window.innerHeight - 130) { window.scrollBy(0, 8); update(); }
      else if (lastY < 220 && window.scrollY > 0) { window.scrollBy(0, -8); update(); }
    }, 16);

    const onMove = (ev) => { lastY = ev.clientY; update(); };

    const finish = (commit) => {
      clearInterval(autoScroll);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onCancel);
      items.forEach((it) => { it.style.transform = ''; });
      item.classList.remove('dragging');
      listEl.classList.remove('is-sorting');
      document.body.classList.remove('no-select');
      if (commit && to !== from) onReorder(from, to);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onCancel);
  });
}

// Déplace un élément d'un tableau de la position "from" à la position "to"
function moveItem(array, from, to) {
  const [moved] = array.splice(from, 1);
  array.splice(to, 0, moved);
}
