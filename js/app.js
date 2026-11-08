// app.js — démarrage de l'app et navigation entre les écrans.

// Toutes les données de l'app, chargées une fois au démarrage
const appData = loadData();
saveData(appData); // enregistre tout de suite les données de départ au premier lancement

const App = {
  currentView: 'session',
  lastRenderDay: toISODate(new Date()),

  show(view) {
    this.currentView = view;
    document.querySelectorAll('.view').forEach((section) => {
      section.hidden = section.id !== `view-${view}`;
    });
    document.querySelectorAll('.tabbar-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    if (view === 'session') WeekView.render();
    if (view === 'daily') DailyView.render();
    if (view === 'library') LibraryView.render();
    if (view === 'progress') ProgressView.render();
    if (view === 'settings') SettingsView.render();
    window.scrollTo(0, 0);
  },
};

// Clic sur un bouton de la barre du bas
document.getElementById('tabbar').addEventListener('click', (e) => {
  const btn = e.target.closest('.tabbar-btn');
  if (btn) App.show(btn.dataset.view);
});

// Si l'app reste ouverte et qu'on change de jour (ex. on la rouvre le lendemain),
// on revient automatiquement sur le jour actuel.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const todayISO = toISODate(new Date());
  if (todayISO !== App.lastRenderDay) {
    App.lastRenderDay = todayISO;
    WeekView.goToToday();
    App.show(App.currentView);
  }
});

// Au lancement : semaine et jour d'aujourd'hui
WeekView.goToToday();
App.show('session');
