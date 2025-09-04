class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.toggleBtn = null;
    this.init();
  }

  init() {
    this.toggleBtn = document.getElementById('theme-toggle');
    this.loadTheme();
    if (this.toggleBtn)
      this.toggleBtn.addEventListener('click', () => this.toggleTheme());
  }

  loadTheme() {
    const stored = Storage.getSetting('theme', null);
    if (stored) {
      this.setTheme(stored);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  toggleTheme() {
    this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
  }

  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    this.currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    Storage.setSetting('theme', theme);
    this.updateToggleIcon();
  }

  updateToggleIcon() {
    if (!this.toggleBtn) return;
    this.toggleBtn.title = this.currentTheme === 'light' ? 'Включить темную тему' : 'Включить светлую тему';
  }
}

window.themeManager = new ThemeManager();
