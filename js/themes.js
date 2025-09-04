class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.themeToggleBtn = null;
    this.init();
  }

  init() {
    this.themeToggleBtn = document.getElementById('theme-toggle');
    
    this.loadSavedTheme();
    
    this.bindEvents();
    
    console.log('ThemeManager инициализирован, текущая тема:', this.currentTheme);
  }

  bindEvents() {
    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener((e) => {
        if (!Storage.getSetting('themeSetManually', false)) {
          this.setTheme(e.matches ? 'dark' : 'light', false);
        }
      });
    }
  }

  loadSavedTheme() {
    const savedTheme = Storage.getSetting('theme');
    
    if (savedTheme) {
      this.setTheme(savedTheme, false);
    } else {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.setTheme('dark', false);
      } else {
        this.setTheme('light', false);
      }
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme, true);
    
    const themeText = newTheme === 'light' ? 'Светлая' : 'Темная';
    Utils.showToast(`${themeText} тема включена`, 'success');
  }

  setTheme(theme, saveToStorage = true) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn('ThemeManager: неизвестная тема', theme);
      return;
    }

    this.currentTheme = theme;
    
    document.body.setAttribute('data-theme', theme);
    
    this.updateThemeColor(theme);
    
    this.updateThemeIcon(theme);
    
    if (saveToStorage) {
      Storage.setSetting('theme', theme);
      Storage.setSetting('themeSetManually', true);
    }
    
    this.updateStatusBar(theme);
  }

  updateThemeColor(theme) {
    let themeColor = '#6366f1';
    
    if (theme === 'dark') {
      themeColor = '#1e293b';
    }
    
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    } else {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      metaThemeColor.setAttribute('content', themeColor);
      document.head.appendChild(metaThemeColor);
    }
  }

  updateThemeIcon(theme) {
    if (!this.themeToggleBtn) return;
    
    const icon = this.themeToggleBtn.querySelector('svg');
    if (!icon) return;
    
    if (theme === 'dark') {
      icon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      `;
      this.themeToggleBtn.title = 'Переключить на светлую тему';
    } else {
      icon.innerHTML = `
        <circle cx="12" cy="12" r="5"></circle>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
      `;
      this.themeToggleBtn.title = 'Переключить на темную тему';
    }
  }

  updateStatusBar(theme) {
    let statusBarStyle = 'default';
    
    if (theme === 'dark') {
      statusBarStyle = 'black-translucent';
    }
    
    let metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaStatusBar) {
      metaStatusBar.setAttribute('content', statusBarStyle);
    }
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  isDarkTheme() {
    return this.currentTheme === 'dark';
  }

  applyThemeToElement(element) {
    if (element) {
      element.setAttribute('data-theme', this.currentTheme);
    }
  }

  getThemeVariables() {
    const computedStyle = getComputedStyle(document.body);
    
    return {
      background: computedStyle.getPropertyValue('--background').trim(),
      surface: computedStyle.getPropertyValue('--surface').trim(),
      textPrimary: computedStyle.getPropertyValue('--text-primary').trim(),
      textSecondary: computedStyle.getPropertyValue('--text-secondary').trim(),
      primaryColor: computedStyle.getPropertyValue('--primary-color').trim(),
      border: computedStyle.getPropertyValue('--border').trim()
    };
  }

  resetToSystem() {
    Storage.setSetting('themeSetManually', false);
    
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.setTheme('dark', true);
    } else {
      this.setTheme('light', true);
    }
    
    Utils.showToast('Тема сброшена к системным настройкам', 'success');
  }

  animateThemeTransition() {
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
  }
}

let themeManager;

document.addEventListener('DOMContentLoaded', () => {
  themeManager = new ThemeManager();
  
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    themeManager.applyThemeToElement(modal);
  });
});

window.ThemeManager = ThemeManager;
