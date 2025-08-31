/**
 * Менеджер тем оформления
 * Управляет переключением между светлой и темной темой
 */
class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.themeToggleBtn = null;
        this.init();
    }

    init() {
        // Находим кнопку переключения темы
        this.themeToggleBtn = document.getElementById('theme-toggle');
        
        // Загружаем сохраненную тему
        this.loadSavedTheme();
        
        // Привязываем события
        this.bindEvents();
        
        console.log('ThemeManager инициализирован, текущая тема:', this.currentTheme);
    }

    /**
     * Привязка событий
     */
    bindEvents() {
        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Слушаем системные изменения темы
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addListener((e) => {
                // Автоматически переключаем тему только если пользователь не устанавливал вручную
                if (!Storage.getSetting('themeSetManually', false)) {
                    this.setTheme(e.matches ? 'dark' : 'light', false);
                }
            });
        }
    }

    /**
     * Загрузка сохраненной темы
     */
    loadSavedTheme() {
        const savedTheme = Storage.getSetting('theme');
        
        if (savedTheme) {
            this.setTheme(savedTheme, false);
        } else {
            // Определяем тему по системным настройкам
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.setTheme('dark', false);
            } else {
                this.setTheme('light', false);
            }
        }
    }

    /**
     * Переключение между темами
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme, true);
        
        // Показываем уведомление
        const themeText = newTheme === 'light' ? 'Светлая' : 'Темная';
        Utils.showToast(`${themeText} тема включена`, 'success');
    }

    /**
     * Установка темы
     * @param {string} theme Название темы ('light' или 'dark')
     * @param {boolean} saveToStorage Сохранять ли в хранилище
     */
    setTheme(theme, saveToStorage = true) {
        if (theme !== 'light' && theme !== 'dark') {
            console.warn('ThemeManager: неизвестная тема', theme);
            return;
        }

        this.currentTheme = theme;
        
        // Применяем тему к body
        document.body.setAttribute('data-theme', theme);
        
        // Обновляем meta theme-color для браузера
        this.updateThemeColor(theme);
        
        // Обновляем иконку кнопки
        this.updateThemeIcon(theme);
        
        // Сохраняем в хранилище
        if (saveToStorage) {
            Storage.setSetting('theme', theme);
            Storage.setSetting('themeSetManually', true);
        }
        
        // Обновляем статус-бар для PWA
        this.updateStatusBar(theme);
    }

    /**
     * Обновление цвета темы в meta теге
     * @param {string} theme Название темы
     */
    updateThemeColor(theme) {
        let themeColor = '#6366f1'; // По умолчанию светлая тема
        
        if (theme === 'dark') {
            themeColor = '#1e293b';
        }
        
        // Обновляем meta тег
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

    /**
     * Обновление иконки кнопки переключения темы
     * @param {string} theme Название темы
     */
    updateThemeIcon(theme) {
        if (!this.themeToggleBtn) return;
        
        const icon = this.themeToggleBtn.querySelector('svg');
        if (!icon) return;
        
        if (theme === 'dark') {
            // Иконка луны для темной темы
            icon.innerHTML = `
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            `;
            this.themeToggleBtn.title = 'Переключить на светлую тему';
        } else {
            // Иконка солнца для светлой темы
            icon.innerHTML = `
                <circle cx="12" cy="12" r="5"></circle>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
            `;
            this.themeToggleBtn.title = 'Переключить на темную тему';
        }
    }

    /**
     * Обновление статус-бара для PWA
     * @param {string} theme Название темы
     */
    updateStatusBar(theme) {
        let statusBarStyle = 'default';
        
        if (theme === 'dark') {
            statusBarStyle = 'black-translucent';
        }
        
        // Обновляем meta тег для статус-бара
        let metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (metaStatusBar) {
            metaStatusBar.setAttribute('content', statusBarStyle);
        }
    }

    /**
     * Получить текущую тему
     * @returns {string} Название текущей темы
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Проверить, темная ли тема
     * @returns {boolean} True, если темная тема
     */
    isDarkTheme() {
        return this.currentTheme === 'dark';
    }

    /**
     * Применить тему к конкретному элементу
     * @param {HTMLElement} element Элемент для применения темы
     */
    applyThemeToElement(element) {
        if (element) {
            element.setAttribute('data-theme', this.currentTheme);
        }
    }

    /**
     * Получить CSS переменные для текущей темы
     * @returns {Object} Объект с CSS переменными
     */
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

    /**
     * Сброс темы к системным настройкам
     */
    resetToSystem() {
        Storage.setSetting('themeSetManually', false);
        
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.setTheme('dark', true);
        } else {
            this.setTheme('light', true);
        }
        
        Utils.showToast('Тема сброшена к системным настройкам', 'success');
    }

    /**
     * Анимация перехода между темами
     */
    animateThemeTransition() {
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }
}

// Глобальный экземпляр
let themeManager;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    themeManager = new ThemeManager();
    
    // Применяем тему ко всем существующим модальным окнам
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        themeManager.applyThemeToElement(modal);
    });
});

// Экспортируем для использования в других модулях
window.ThemeManager = ThemeManager;
