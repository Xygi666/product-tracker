/**
 * Главное приложение для учета продукции (расширенная версия)
 */
class ProductTracker {
    constructor() {
        this.isLoading = false;
        this.selectedProduct = null;
        this.currentPresets = [];
        this.init();
    }

    /**
     * Инициализация приложения
     */
    init() {
        this.bindEvents();
        this.loadProducts();
        this.loadRecords();
        this.loadQuantityPresets();
        this.updateMonthlyTotal();
        this.addSampleDataIfEmpty();
        
        console.log('ProductTracker v3.0 инициализирован');
    }

    /**
     * Привязка событий
     */
    bindEvents() {
        // Основные события формы
        const addRecordBtn = document.getElementById('add-record-btn');
        const quantityInput = document.getElementById('quantity-input');
        const productSelect = document.getElementById('product-select');

        // События для совместимости с поиском
        if (productSelect) {
            productSelect.addEventListener('change', () => this.updateCurrentAmount());
        }
        
        if (quantityInput) {
            quantityInput.addEventListener('input', Utils.debounce(() => this.updateCurrentAmount(), 300));
            quantityInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.isLoading) {
                    this.addRecord();
                }
            });
        }

        if (addRecordBtn) {
            addRecordBtn.addEventListener('click', () => this.addRecord());
        }

        // События быстрого экспорта
        this.bindQuickExportEvents();

        // Предотвращение случайной отправки формы
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.id !== 'quantity-input') {
                e.preventDefault();
            }
        });
    }

    /**
     * Привязка событий быстрого экспорта
     */
    bindQuickExportEvents() {
        // Модальное окно быстрого экспорта уже обрабатывается в export.js
        
        // Экспорт CSV из списка записей
        const exportCsvBtn = document.getElementById('export-csv-btn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => {
                if (typeof ExportManager !== 'undefined') {
                    const exportManager = new ExportManager();
                    exportManager.exportToCSV();
                } else {
                    Utils.showToast('Модуль экспорта не загружен', 'error');
                }
            });
        }
    }

    /**
     * Добавление образцов данных при первом запуске
     */
    addSampleDataIfEmpty() {
        const products = Storage.getProducts();
        if (products.length === 0) {
            const sampleProducts = [
                { name: 'Хлеб белый', price: 45, isFavorite: true },
                { name: 'Хлеб черный', price: 50, isFavorite: true },
                { name: 'Булочка с маком', price: 35, isFavorite: false },
                { name: 'Багет французский', price: 75, isFavorite: false },
                { name: 'Круассан', price: 60, isFavorite: false }
            ];

            sampleProducts.forEach(product => {
                Storage.addProduct(product);
            });

            this.loadProducts();
            Utils.showToast('Добавлены образцы продуктов', 'success');
        }
    }

    /**
     * Загрузка продуктов для совместимости с поиском
     */
    loadProducts() {
        const products = Storage.getProducts();
        const select = document.getElementById('product-select');
        
        if (!select) return;

        // Очищаем опции
        select.innerHTML = '<option value="">Выберите продукт...</option>';

        if (products.length === 0) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = 'Нет продуктов (добавьте в настройках)';
            emptyOption.disabled = true;
            select.appendChild(emptyOption);
            return;
        }

        // Сортируем: сначала избранные, потом по алфавиту
        const favorites = products.filter(p => p.isFavorite).sort((a, b) => a.name.localeCompare(b.name));
        const regular = products.filter(p => !p.isFavorite).sort((a, b) => a.name.localeCompare(b.name));
        const sortedProducts = [...favorites, ...regular];

        sortedProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.isFavorite ? '⭐ ' : ''}${product.name} • ${Utils.formatCurrency(product.price)}`;
            option.dataset.price = product.price;
            option.dataset.name = product.name;
            select.appendChild(option);
        });

        this.updateCurrentAmount();

        // Обновляем результаты поиска если они открыты
        if (typeof searchManager !== 'undefined') {
            searchManager.refreshResults();
        }
    }

    /**
     * Загрузка пресетов количества
     */
    loadQuantityPresets() {
        this.currentPresets = Storage.getQuantityPresets();
        this.renderQuantityPresets();
    }

    /**
     * Отображение пресетов количества
     */
    renderQuantityPresets() {
        const container = document.getElementById('quantity-presets');
        if (!container) return;

        container.innerHTML = '';

        if (this.currentPresets.length === 0) {
            return;
        }

        this.currentPresets.forEach(preset => {
            const button = document.createElement('button');
            button.className = 'preset-btn';
            button.textContent = preset;
            button.type = 'button';
            
            button.addEventListener('click', () => {
                this.setQuantity(preset);
            });

            container.appendChild(button);
        });
    }

    /**
     * Установка количества из пресета
     * @param {number} value Значение количества
     */
    setQuantity(value) {
        const quantityInput = document.getElementById('quantity-input');
        if (quantityInput) {
            quantityInput.value = value;
            this.updateCurrentAmount();
            
            // Визуальная обратная связь
            const activeBtn = document.querySelector('.preset-btn.active');
            if (activeBtn) {
                activeBtn.classList.remove('active');
            }
            
            const clickedBtn = Array.from(document.querySelectorAll('.preset-btn'))
                .find(btn => parseFloat(btn.textContent) === value);
            if (clickedBtn) {
                clickedBtn.classList.add('active');
                setTimeout(() => {
                    clickedBtn.classList.remove('active');
                }, 1000);
            }
        }
    }

    /**
     * Обновление текущей суммы
     */
    updateCurrentAmount() {
        const select = document.getElementById('product-select');
        const quantityInput = document.getElementById('quantity-input');
        const currentAmount = document.getElementById('current-amount');
        
        if (!select || !quantityInput || !currentAmount) return;

        let selectedOption = null;
        let price = 0;

        // Проверяем, используется ли поиск
        if (typeof searchManager !== 'undefined' && searchManager.getSelectedProduct()) {
            const selectedProduct = searchManager.getSelectedProduct();
            price = selectedProduct.price;
        } else {
            selectedOption = select.options[select.selectedIndex];
            if (selectedOption && selectedOption.dataset.price) {
                price = parseFloat(selectedOption.dataset.price);
            }
        }

        const quantity = parseFloat(quantityInput.value) || 0;

        if (price > 0 && quantity > 0) {
            const amount = price * quantity;
            currentAmount.textContent = Utils.formatCurrency(amount);
            currentAmount.style.color = 'var(--success-color)';
        } else {
            currentAmount.textContent = '0 ₽';
            currentAmount.style.color = 'var(--text-secondary)';
        }
    }

    /**
     * Добавление записи (обновленная версия)
     */
    async addRecord() {
        if (this.isLoading) return;

        const select = document.getElementById('product-select');
        const quantityInput = document.getElementById('quantity-input');
        const addButton = document.getElementById('add-record-btn');

        if (!select || !quantityInput || !addButton) return;

        let selectedProduct = null;
        let productId = null;
        let productName = '';
        let price = 0;

        // Определяем источник продукта (поиск или обычный select)
        if (typeof searchManager !== 'undefined' && searchManager.getSelectedProduct()) {
            selectedProduct = searchManager.getSelectedProduct();
            productId = selectedProduct.id;
            productName = selectedProduct.name;
            price = selectedProduct.price;
        } else {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption && selectedOption.value) {
                productId = parseInt(selectedOption.value);
                productName = selectedOption.dataset.name;
                price = parseFloat(selectedOption.dataset.price);
            }
        }

        const quantity = quantityInput.value.trim();

        // Валидация
        if (!productId) {
            Utils.showToast('Выберите продукт', 'error');
            if (typeof searchManager !== 'undefined') {
                const searchInput = document.getElementById('product-search');
                if (searchInput) searchInput.focus();
            } else {
                select.focus();
            }
            return;
        }

        if (!Utils.isValidNumber(quantity)) {
            Utils.showToast('Введите корректное количество', 'error');
            quantityInput.focus();
            quantityInput.select();
            return;
        }

        // Показываем состояние загрузки
        this.setLoading(true, addButton);

        try {
            // Создаем запись
            const record = {
                productId: productId,
                productName: productName,
                quantity: parseFloat(quantity),
                price: price,
                amount: parseFloat(quantity) * price
            };

            // Сохраняем запись
            Storage.addRecord(record);

            // Обновляем интерфейс
            this.loadRecords();
            this.updateMonthlyTotal();

            // Очищаем форму
            quantityInput.value = '';
            this.updateCurrentAmount();

            // Очищаем поиск если используется
            if (typeof searchManager !== 'undefined') {
                searchManager.clear();
            } else {
                select.selectedIndex = 0;
            }

            // Убираем активные пресеты
            const activePresets = document.querySelectorAll('.preset-btn.active');
            activePresets.forEach(btn => btn.classList.remove('active'));

            // Фокус на поиск или селект для следующего ввода
            setTimeout(() => {
                if (typeof searchManager !== 'undefined') {
                    const searchInput = document.getElementById('product-search');
                    if (searchInput) searchInput.focus();
                } else {
                    select.focus();
                }
            }, 100);

            Utils.showToast(`Добавлена запись: ${record.productName}`, 'success');

        } catch (error) {
            console.error('Ошибка при добавлении записи:', error);
            Utils.showToast('Ошибка при добавлении записи', 'error');
        } finally {
            this.setLoading(false, addButton);
        }
    }

    /**
     * Загрузка записей
     */
    loadRecords() {
        const records = Storage.getCurrentMonthRecords();
        const recordsList = document.getElementById('records-list');
        const recordsCount = document.getElementById('records-count');

        if (!recordsList || !recordsCount) return;

        // Обновляем счетчик
        recordsCount.textContent = records.length;

        if (records.length === 0) {
            recordsList.innerHTML = this.getEmptyState('📝', 'Записи отсутствуют', 'Добавьте первую запись о продукции');
            return;
        }

        // Сортируем по дате (новые сначала)
        records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        recordsList.innerHTML = '';

        records.forEach(record => {
            const recordElement = this.createRecordElement(record);
            recordsList.appendChild(recordElement);
        });
    }

    /**
     * Создание элемента записи
     * @param {Object} record Запись
     * @returns {HTMLElement} Элемент записи
     */
    createRecordElement(record) {
        const div = document.createElement('div');
        div.className = 'record-item';
        
        div.innerHTML = `
            <div class="record-info">
                <div class="record-title">${record.productName}</div>
                <div class="record-details">
                    ${record.quantity} шт. × ${Utils.formatCurrency(record.price)} • ${Utils.formatDate(record.createdAt)}
                </div>
            </div>
            <div class="record-amount">${Utils.formatCurrency(record.amount)}</div>
            <button class="delete-btn" onclick="app.deleteRecord(${record.id})" title="Удалить запись">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.854 4.854a.5.5 0 0 0-.708-.708L8 8.293 3.854 4.146a.5.5 0 1 0-.708.708L7.293 9l-4.147 4.146a.5.5 0 0 0 .708.708L8 9.707l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 9l4.147-4.146z"/>
                </svg>
            </button>
        `;

        return div;
    }

    /**
     * Удаление записи
     * @param {number} recordId ID записи
     */
    deleteRecord(recordId) {
        if (!confirm('Удалить эту запись?')) return;

        try {
            Storage.deleteRecord(recordId);
            this.loadRecords();
            this.updateMonthlyTotal();
            Utils.showToast('Запись удалена', 'success');
        } catch (error) {
            console.error('Ошибка при удалении записи:', error);
            Utils.showToast('Ошибка при удалении записи', 'error');
        }
    }

    /**
     * Обновление месячной суммы
     */
    updateMonthlyTotal() {
        const records = Storage.getCurrentMonthRecords();
        const total = records.reduce((sum, record) => sum + record.amount, 0);
        const totalElement = document.getElementById('monthly-total');
        
        if (totalElement) {
            totalElement.textContent = Utils.formatCurrency(total);
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
                button.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    Добавление...
                `;
            } else {
                button.classList.remove('loading');
                button.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                    </svg>
                    Добавить запись
                `;
            }
        }
    }

    /**
     * Обновление интерфейса (вызывается при изменениях в данных)
     */
    refresh() {
        this.loadProducts();
        this.loadRecords();
        this.loadQuantityPresets();
        this.updateMonthlyTotal();
    }
}

// Глобальные функции для использования в HTML
window.setQuantity = function(value) {
    if (window.app) {
        window.app.setQuantity(value);
    }
};

// Глобальный экземпляр приложения
let app;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    app = new ProductTracker();
    window.app = app; // Для доступа из HTML
});

// Обновление данных при возврате на страницу
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && app) {
        app.refresh();
    }
});

// Обработка изменений в localStorage от других вкладок
window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('pt_') && app) {
        app.refresh();
    }
});
