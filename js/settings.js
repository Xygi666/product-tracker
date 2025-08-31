/**
 * Настройки приложения (расширенная версия)
 */
class SettingsManager {
    constructor() {
        this.isLoading = false;
        this.editingProduct = null;
        this.currentFilter = 'all';
        this.init();
    }

    /**
     * Инициализация
     */
    init() {
        // Проверяем доступность Storage
        if (typeof Storage === 'undefined') {
            console.error('Storage класс не найден');
            Utils.showToast('Ошибка загрузки данных', 'error');
            return;
        }

        this.bindEvents();
        this.loadProducts();
        this.loadQuantityPresets();
        
        console.log('SettingsManager v3.0 инициализирован');
    }

    /**
     * Привязка событий
     */
    bindEvents() {
        // Добавление продукта
        const addProductBtn = document.getElementById('add-product-btn');
        const productNameInput = document.getElementById('product-name');
        const productPriceInput = document.getElementById('product-price');

        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.addProduct());
        }

        // Быстрые клавиши для добавления продукта
        if (productNameInput) {
            productNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const priceInput = document.getElementById('product-price');
                    if (priceInput) priceInput.focus();
                }
            });
        }

        if (productPriceInput) {
            productPriceInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.isLoading) {
                    this.addProduct();
                }
            });
        }

        // Валидация в реальном времени
        if (productNameInput) {
            productNameInput.addEventListener('input', () => this.validateProductForm());
        }
        
        if (productPriceInput) {
            productPriceInput.addEventListener('input', () => this.validateProductForm());
        }

        // Фильтры продуктов
        this.bindFilterEvents();

        // Управление данными
        this.bindDataManagementEvents();

        // Управление пресетами
        this.bindPresetEvents();

        // Модальное окно редактирования
        this.bindEditModalEvents();
    }

    /**
     * Привязка событий фильтров
     */
    bindFilterEvents() {
        const filterAll = document.getElementById('filter-all');
        const filterFavorites = document.getElementById('filter-favorites');

        if (filterAll) {
            filterAll.addEventListener('click', () => {
                this.setFilter('all');
            });
        }

        if (filterFavorites) {
            filterFavorites.addEventListener('click', () => {
                this.setFilter('favorites');
            });
        }
    }

    /**
     * Привязка событий управления данными
     */
    bindDataManagementEvents() {
        const exportBtn = document.getElementById('export-btn');
        const exportExcelBtn = document.getElementById('export-excel-btn');
        const clearRecordsBtn = document.getElementById('clear-records-btn');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        }
        
        if (clearRecordsBtn) {
            clearRecordsBtn.addEventListener('click', () => this.clearAllRecords());
        }
    }

    /**
     * Привязка событий управления пресетами
     */
    bindPresetEvents() {
        const addPresetBtn = document.getElementById('add-preset-btn');
        const newPresetInput = document.getElementById('new-preset-value');

        if (addPresetBtn) {
            addPresetBtn.addEventListener('click', () => this.addQuantityPreset());
        }

        if (newPresetInput) {
            newPresetInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addQuantityPreset();
                }
            });
        }
    }

    /**
     * Привязка событий модального окна редактирования
     */
    bindEditModalEvents() {
        const saveProductBtn = document.getElementById('save-product-btn');
        const modal = document.getElementById('edit-product-modal');

        if (saveProductBtn) {
            saveProductBtn.addEventListener('click', () => this.saveEditedProduct());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeEditModal();
                }
            });
        }

        // ESC для закрытия модала
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeEditModal();
            }
        });
    }

    /**
     * Установка фильтра продуктов
     * @param {string} filter Тип фильтра ('all' или 'favorites')
     */
    setFilter(filter) {
        this.currentFilter = filter;

        // Обновляем активную кнопку фильтра
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => btn.classList.remove('active'));

        const activeBtn = document.getElementById(`filter-${filter}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Перезагружаем список продуктов
        this.loadProducts();
    }

    /**
     * Валидация формы продукта
     */
    validateProductForm() {
        const nameInput = document.getElementById('product-name');
        const priceInput = document.getElementById('product-price');
        const addButton = document.getElementById('add-product-btn');
        
        if (!nameInput || !priceInput || !addButton) return;

        const name = nameInput.value.trim();
        const price = priceInput.value.trim();
        
        const isValid = name.length > 0 && Utils.isValidNumber(price);
        addButton.disabled = !isValid || this.isLoading;
    }

    /**
     * Добавление продукта
     */
    async addProduct() {
        if (this.isLoading) return;

        const nameInput = document.getElementById('product-name');
        const priceInput = document.getElementById('product-price');
        const isFavoriteInput = document.getElementById('is-favorite');
        const addButton = document.getElementById('add-product-btn');

        if (!nameInput || !priceInput || !addButton) return;

        const name = Utils.sanitizeString(nameInput.value);
        const price = priceInput.value.trim();
        const isFavorite = isFavoriteInput ? isFavoriteInput.checked : false;

        // Валидация
        if (!name) {
            Utils.showToast('Введите название продукта', 'error');
            nameInput.focus();
            return;
        }

        if (name.length > 50) {
            Utils.showToast('Название слишком длинное (макс. 50 символов)', 'error');
            nameInput.focus();
            nameInput.select();
            return;
        }

        if (!Utils.isValidNumber(price)) {
            Utils.showToast('Введите корректную цену', 'error');
            priceInput.focus();
            priceInput.select();
            return;
        }

        // Проверка дублирования
        const existingProducts = Storage.getProducts();
        const isDuplicate = existingProducts.some(p => 
            p.name.toLowerCase() === name.toLowerCase()
        );

        if (isDuplicate) {
            Utils.showToast('Продукт с таким названием уже существует', 'warning');
            nameInput.focus();
            nameInput.select();
            return;
        }

        // Показываем состояние загрузки
        this.setLoading(true, addButton);

        try {
            // Добавляем продукт
            const product = Storage.addProduct({
                name: name,
                price: parseFloat(price),
                isFavorite: isFavorite
            });

            // Обновляем список
            this.loadProducts();

            // Очищаем форму
            nameInput.value = '';
            priceInput.value = '';
            if (isFavoriteInput) {
                isFavoriteInput.checked = false;
            }
            nameInput.focus();

            Utils.showToast(`Продукт "${product.name}" добавлен`, 'success');

        } catch (error) {
            console.error('Ошибка при добавлении продукта:', error);
            Utils.showToast('Ошибка при добавлении продукта', 'error');
        } finally {
            this.setLoading(false, addButton);
        }
    }

    /**
     * Загрузка продуктов
     */
    loadProducts() {
        let products = Storage.getProducts();
        const productsList = document.getElementById('products-list');
        const productsCount = document.getElementById('products-count');

        if (!productsList || !productsCount) return;

        // Применяем фильтр
        if (this.currentFilter === 'favorites') {
            products = products.filter(p => p.isFavorite);
        }

        // Обновляем счетчик
        productsCount.textContent = products.length;

        if (products.length === 0) {
            const emptyMessage = this.currentFilter === 'favorites' 
                ? 'Избранные продукты не добавлены'
                : 'Продукты не добавлены';
            const emptyHint = this.currentFilter === 'favorites'
                ? 'Отметьте продукты как избранные'
                : 'Добавьте первый продукт для учета';
            
            productsList.innerHTML = this.getEmptyState('📦', emptyMessage, emptyHint);
            return;
        }

        // Сортируем: избранные сначала, затем по дате
        products.sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

        productsList.innerHTML = '';

        products.forEach(product => {
            const productElement = this.createProductElement(product);
            productsList.appendChild(productElement);
        });
    }

    /**
     * Создание элемента продукта
     * @param {Object} product Продукт
     * @returns {HTMLElement} Элемент продукта
     */
    createProductElement(product) {
        const div = document.createElement('div');
        div.className = 'product-item';
        
        div.innerHTML = `
            <div class="product-info">
                <div class="product-name">
                    ${product.name}
                    ${product.isFavorite ? '<span class="product-favorite">⭐</span>' : ''}
                </div>
                <div class="product-price">${Utils.formatCurrency(product.price)} за шт.</div>
            </div>
            <div class="product-actions">
                <button class="edit-btn" onclick="settings.editProduct(${product.id})" title="Редактировать продукт">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25a1.75 1.75 0 0 1 .445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064L11.189 6.25Z"/>
                        <path d="M8.25 2.331a.75.75 0 0 1 .75-.75c.414 0 .814.057 1.2.166a.75.75 0 1 1-.4 1.448 4.25 4.25 0 0 0-.8-.114.75.75 0 0 1-.75-.75Z"/>
                    </svg>
                </button>
                <button class="delete-btn" onclick="settings.deleteProduct(${product.id})" title="Удалить продукт">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12.854 4.854a.5.5 0 0 0-.708-.708L8 8.293 3.854 4.146a.5.5 0 1 0-.708.708L7.293 9l-4.147 4.146a.5.5 0 0 0 .708.708L8 9.707l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 9l4.147-4.146z"/>
                    </svg>
                </button>
            </div>
        `;

        return div;
    }

    /**
     * Редактирование продукта
     * @param {number} productId ID продукта
     */
    editProduct(productId) {
        const product = Storage.getProductById(productId);
        if (!product) return;

        this.editingProduct = product;

        // Заполняем поля модального окна
        const nameInput = document.getElementById('edit-product-name');
        const priceInput = document.getElementById('edit-product-price');
        const favoriteInput = document.getElementById('edit-is-favorite');

        if (nameInput) nameInput.value = product.name;
        if (priceInput) priceInput.value = product.price;
        if (favoriteInput) favoriteInput.checked = product.isFavorite || false;

        // Показываем модальное окно
        this.showEditModal();
    }

    /**
     * Показать модальное окно редактирования
     */
    showEditModal() {
        const modal = document.getElementById('edit-product-modal');
        if (modal) {
            modal.classList.add('show');
            
            // Фокус на поле названия
            const nameInput = document.getElementById('edit-product-name');
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }
    }

    /**
     * Сохранение отредактированного продукта
     */
    async saveEditedProduct() {
        if (!this.editingProduct) return;

        const nameInput = document.getElementById('edit-product-name');
        const priceInput = document.getElementById('edit-product-price');
        const favoriteInput = document.getElementById('edit-is-favorite');
        const saveButton = document.getElementById('save-product-btn');

        if (!nameInput || !priceInput) return;

        const name = Utils.sanitizeString(nameInput.value);
        const price = priceInput.value.trim();
        const isFavorite = favoriteInput ? favoriteInput.checked : false;

        // Валидация
        if (!name) {
            Utils.showToast('Введите название продукта', 'error');
            nameInput.focus();
            return;
        }

        if (name.length > 50) {
            Utils.showToast('Название слишком длинное (макс. 50 символов)', 'error');
            nameInput.focus();
            nameInput.select();
            return;
        }

        if (!Utils.isValidNumber(price)) {
            Utils.showToast('Введите корректную цену', 'error');
            priceInput.focus();
            priceInput.select();
            return;
        }

        // Проверка дублирования (исключая текущий продукт)
        const existingProducts = Storage.getProducts();
        const isDuplicate = existingProducts.some(p => 
            p.id !== this.editingProduct.id && 
            p.name.toLowerCase() === name.toLowerCase()
        );

        if (isDuplicate) {
            Utils.showToast('Продукт с таким названием уже существует', 'warning');
            nameInput.focus();
            nameInput.select();
            return;
        }

        // Показываем состояние загрузки
        this.setLoading(true, saveButton);

        try {
            // Обновляем продукт
            const updatedProduct = Storage.updateProduct(this.editingProduct.id, {
                name: name,
                price: parseFloat(price),
                isFavorite: isFavorite
            });

            if (updatedProduct) {
                // Обновляем список
                this.loadProducts();

                // Закрываем модальное окно
                this.closeEditModal();

                Utils.showToast(`Продукт "${updatedProduct.name}" обновлен`, 'success');
            } else {
                Utils.showToast('Ошибка при обновлении продукта', 'error');
            }

        } catch (error) {
            console.error('Ошибка при сохранении продукта:', error);
            Utils.showToast('Ошибка при сохранении изменений', 'error');
        } finally {
            this.setLoading(false, saveButton);
        }
    }

    /**
     * Закрытие модального окна редактирования
     */
    closeEditModal() {
        const modal = document.getElementById('edit-product-modal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.editingProduct = null;
    }

    /**
     * Удаление продукта
     * @param {number} productId ID продукта
     */
    deleteProduct(productId) {
        const product = Storage.getProductById(productId);
        if (!product) return;

        const records = Storage.getRecords();
        const hasRecords = records.some(r => r.productId === productId);
        
        let confirmMessage = `Удалить продукт "${product.name}"?`;
        if (hasRecords) {
            confirmMessage += '\n\nВнимание: У этого продукта есть записи в истории. Они останутся, но продукт нельзя будет выбрать для новых записей.';
        }

        if (!confirm(confirmMessage)) return;

        try {
            Storage.deleteProduct(productId);
            this.loadProducts();
            Utils.showToast(`Продукт "${product.name}" удален`, 'success');
        } catch (error) {
            console.error('Ошибка при удалении продукта:', error);
            Utils.showToast('Ошибка при удалении продукта', 'error');
        }
    }

    /**
     * Загрузка пресетов количества
     */
    loadQuantityPresets() {
        const presets = Storage.getQuantityPresets();
        const container = document.getElementById('current-presets');

        if (!container) return;

        container.innerHTML = '';

        if (presets.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">Пресеты не добавлены</p>';
            return;
        }

        presets.forEach(preset => {
            const presetElement = this.createPresetElement(preset);
            container.appendChild(presetElement);
        });
    }

    /**
     * Создание элемента пресета
     * @param {number} preset Значение пресета
     * @returns {HTMLElement} Элемент пресета
     */
    createPresetElement(preset) {
        const div = document.createElement('div');
        div.className = 'preset-item';
        
        div.innerHTML = `
            <span class="preset-value">${preset}</span>
            <button class="delete-preset-btn" onclick="settings.deleteQuantityPreset(${preset})" title="Удалить пресет">
                ×
            </button>
        `;

        return div;
    }

    /**
     * Добавление пресета количества
     */
    addQuantityPreset() {
        const input = document.getElementById('new-preset-value');
        if (!input) return;

        const value = parseFloat(input.value);

        if (!Utils.isValidNumber(input.value)) {
            Utils.showToast('Введите корректное число', 'error');
            input.focus();
            input.select();
            return;
        }

        const existingPresets = Storage.getQuantityPresets();
        if (existingPresets.includes(value)) {
            Utils.showToast('Такой пресет уже существует', 'warning');
            input.focus();
            input.select();
            return;
        }

        try {
            Storage.addQuantityPreset(value);
            this.loadQuantityPresets();
            input.value = '';
            input.focus();
            Utils.showToast(`Пресет ${value} добавлен`, 'success');
        } catch (error) {
            console.error('Ошибка при добавлении пресета:', error);
            Utils.showToast('Ошибка при добавлении пресета', 'error');
        }
    }

    /**
     * Удаление пресета количества
     * @param {number} preset Значение пресета
     */
    deleteQuantityPreset(preset) {
        if (!confirm(`Удалить пресет ${preset}?`)) return;

        try {
            Storage.removeQuantityPreset(preset);
            this.loadQuantityPresets();
            Utils.showToast(`Пресет ${preset} удален`, 'success');
        } catch (error) {
            console.error('Ошибка при удалении пресета:', error);
            Utils.showToast('Ошибка при удалении пресета', 'error');
        }
    }

    /**
     * Экспорт данных в JSON
     */
    exportData() {
        try {
            const data = Storage.exportData();
            const jsonString = JSON.stringify(data, null, 2);
            const fileName = `product-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            Utils.downloadFile(jsonString, fileName, 'application/json');
            Utils.showToast('Резервная копия создана', 'success');
            
        } catch (error) {
            console.error('Ошибка при экспорте:', error);
            Utils.showToast('Ошибка при экспорте данных', 'error');
        }
    }

    /**
     * Экспорт в Excel
     */
    exportToExcel() {
        if (typeof ExportManager !== 'undefined') {
            const exportManager = new ExportManager();
            exportManager.exportToExcel();
        } else {
            Utils.showToast('Модуль экспорта не загружен', 'error');
        }
    }

    /**
     * Очистка всех записей
     */
    clearAllRecords() {
        const records = Storage.getRecords();
        if (records.length === 0) {
            Utils.showToast('Нет записей для удаления', 'warning');
            return;
        }

        const confirmMessage = `Удалить все записи (${records.length} шт.)?`;
        if (!confirm(confirmMessage)) return;

        try {
            Storage.clearAllRecords();
            Utils.showToast('Все записи удалены', 'success');
        } catch (error) {
            console.error('Ошибка при очистке записей:', error);
            Utils.showToast('Ошибка при удалении записей', 'error');
        }
    }

    /**
     * Создание пустого состояния
     * @param {string} icon Иконка
     * @param {string} title Заголовок
     * @param {string} subtitle Подзаголовок
     * @returns {string} HTML строка
     */
    getEmptyState(icon, title, subtitle) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <div class="empty-state-text">${title}</div>
                <div class="empty-state-subtext">${subtitle}</div>
            </div>
        `;
    }

    /**
     * Установка состояния загрузки
     * @param {boolean} loading Состояние загрузки
     * @param {HTMLElement} button Кнопка
     */
    setLoading(loading, button) {
        this.isLoading = loading;
        
        if (button) {
            button.disabled = loading;
            if (loading) {
                button.classList.add('loading');
                const originalText = button.textContent;
                button.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    Сохранение...
                `;
            } else {
                button.classList.remove('loading');
                // Восстанавливаем оригинальный текст кнопки
                if (button.id === 'add-product-btn') {
                    button.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                        </svg>
                        Добавить продукт
                    `;
                } else {
                    button.textContent = 'Сохранить';
                }
            }
        }
        
        this.validateProductForm();
    }
}

// Глобальные функции для вызова из HTML
window.closeEditModal = function() {
    if (window.settings) {
        window.settings.closeEditModal();
    }
};

// Глобальный экземпляр настроек
let settings;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    settings = new SettingsManager();
    window.settings = settings; // Для доступа из HTML

    // Применяем сохраненную тему
    if (typeof themeManager !== 'undefined') {
        const savedTheme = Storage.getSetting('theme', 'light');
        document.body.setAttribute('data-theme', savedTheme);
    }
});
