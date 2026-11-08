// backup.js — sauvegarde : exporter / importer toutes les données dans un fichier JSON,
// et le petit rappel si la dernière sauvegarde date de plus de 2 semaines.

const BACKUP_REMINDER_DAYS = 14;
const BEFORE_IMPORT_KEY = 'calisthenie-data-avant-import'; // copie de sécurité avant un import

const Backup = {
  fileName() {
    return `calisthenie-sauvegarde-${toISODate(new Date())}.json`;
  },

  markExported() {
    appData.settings.lastExport = toISODate(new Date());
    appData.settings.reminderSnoozedUntil = null;
    saveData(appData);
  },

  // Exporter : partage (iPhone) ou téléchargement (Mac). Renvoie true si c'est fait.
  async exportData() {
    const text = JSON.stringify(appData, null, 2);
    const file = new File([text], this.fileName(), { type: 'application/json' });

    // Sur téléphone : la feuille de partage (→ "Enregistrer dans Fichiers", AirDrop, mail…)
    const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (isTouch && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Sauvegarde Calisthénie' });
        this.markExported();
        showToast('Sauvegarde exportée');
        return true;
      } catch (error) {
        if (error.name === 'AbortError') return false; // partage annulé
        // Sinon, on essaie le téléchargement classique ci-dessous
      }
    }

    // Sur ordinateur : téléchargement du fichier
    const url = URL.createObjectURL(file);
    const link = el('a', { href: url, download: this.fileName() });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    this.markExported();
    showToast('Sauvegarde téléchargée');
    return true;
  },

  // Importer : lit le fichier, vérifie qu'il vient bien de l'app, demande confirmation
  async importFile(file) {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch (error) {
      showToast('Fichier illisible : ce n’est pas un fichier JSON valide.');
      return false;
    }
    if (!data || typeof data !== 'object' || !data.weeks || !data.weeks.A || !data.weeks.B) {
      showToast('Ce fichier n’est pas une sauvegarde de l’app.');
      return false;
    }

    const exported = data.settings && data.settings.lastExport;
    const ok = await confirmSheet('Remplacer toutes tes données ?',
      `Tes données actuelles seront remplacées par celles du fichier « ${file.name} »`
        + (exported ? ` (sauvegarde du ${formatLongDate(parseISODate(exported))})` : '') + '.',
      'Importer', { danger: true });
    if (!ok) return false;

    // Copie de sécurité des données actuelles, au cas où
    try { localStorage.setItem(BEFORE_IMPORT_KEY, JSON.stringify(appData)); } catch (e) { /* tant pis */ }

    const imported = normalizeData(data);
    Object.keys(appData).forEach((key) => { delete appData[key]; });
    Object.assign(appData, imported);
    saveData(appData);
    WeekView.goToToday();
    showToast('Données importées');
    return true;
  },

  // Faut-il afficher le rappel ? (jamais exporté, ou dernier export il y a plus de 14 jours)
  reminderDue(now = new Date()) {
    const s = appData.settings;
    if (s.reminderSnoozedUntil && toISODate(now) < s.reminderSnoozedUntil) return false;
    const since = s.lastExport || s.createdAt;
    return daysBetween(parseISODate(since), now) > BACKUP_REMINDER_DAYS;
  },

  // "Plus tard" : on ne redemande pas avant 3 jours
  snooze() {
    const until = new Date();
    until.setDate(until.getDate() + 3);
    appData.settings.reminderSnoozedUntil = toISODate(until);
    saveData(appData);
  },

  // Le bandeau discret affiché en haut de l'écran Séance
  renderReminder(onChange) {
    if (!this.reminderDue()) return null;
    const s = appData.settings;
    const days = daysBetween(parseISODate(s.lastExport || s.createdAt), new Date());
    return el('div', { class: 'reminder', role: 'status' },
      el('span', { class: 'reminder-text' },
        s.lastExport ? `Dernière sauvegarde il y a ${days} jours.` : 'Tu n’as jamais sauvegardé tes données.'),
      el('div', { class: 'reminder-actions' },
        el('button', {
          type: 'button', class: 'reminder-btn primary',
          onclick: async () => { await this.exportData(); onChange(); },
        }, 'Exporter'),
        el('button', {
          type: 'button', class: 'reminder-btn',
          onclick: () => { this.snooze(); onChange(); },
        }, 'Plus tard'),
      ),
    );
  },
};
