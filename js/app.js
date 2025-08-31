/**
 * Главное приложение для учета продукции
 */
class ProductTracker {
    constructor() {
        this.isLoading = false;
        this.init();
    }

    /**
     * Инициализация приложения
     */
    init() {
        this.bindEvents();
        this.loadProducts();
        this.loadRecords();
        this.updateMonthlyTotal();
        this.addSampleDataIfEmpty();
        
        console.log('ProductTracker инициализирован');
    }

    /**
     * Привязка событий
     */
    bindEvents() {
        const productSelect = document.getElementById('product-select');
        const quantityInput = document.getElementById('quantity-input');
        const addRecordBtn = document.getElementById('add-record-btn');

        // События формы
        productSelect?.addEventListener('change', () => this.updateCurrentAmount());
        quantityInput?.addEventListener('input', Utils.debounce(() => this.updateCurrentAmount(), 300));
        addRecordBtn?.addEventListener('click', () => this.addRecord());

        // Быстрые клавиши
        quantityInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isLoading) {
                this.addRecord();
            }
        });

        // Предотвращение отправки формы
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
                e.preventDefault();
            }
        });
    }

    /**
     * Добавить образцы данных при первом запуске
     */
    addSampleDataIfEmpty() {
        const products = Storage.getProducts();
        if (products.length === 0) {
            const sampleProducts = [
                { name: 'Хлеб белый', price: 45 },
                { name: 'Хлеб черный', price: 50 },
                { name: 'Булочка с маком', price: 35 },
                { name: 'Багет французский', price: 75 }
            ];

            sampleProducts.forEach(product => {
                Storage.addProduct(product);
            });

            this.loadProducts();
            Utils.showToast('Добавлены образцы продуктов', 'success');
        }
    }

    /**
     * Загрузить продукты в селект
     */
    loadProducts() {
        const products = Storage.getProducts();
        const select = document.getElementById('product-select');
        
        if (!select) return;

        // Сохранить текущий выбор
        const currentValue = select.value;

        // Очистить опции
        select.innerHTML = '<option value="">Выберите продукт...</option>';

        if (products.length === 0) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = 'Нет продуктов (добавьте в настройках)';
            emptyOption.disabled = true;
            select.appendChild(emptyOption);
            return;
        }

        // Добавить продукты
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} • ${Utils.formatCurrency(product.price)}`;
            option.dataset.price = product.price;
            option.dataset.name = product.name;
            select.appendChild(option);
        });

        // Восстановить выбор если возможно
        if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        }

        this.updateCurrentAmount();
    }

    /**
     * Обновить текущую сумму
     */
    updateCurrentAmount() {
        const select = document.getElementById('product-select');
        const quantityInput = document.getElementById('quantity-input');
        const currentAmount = document.getElementById('current-amount');
        
        if (!select || !quantityInput || !currentAmount) return;

        const selectedOption = select.options[select.selectedIndex];
        const quantity = parseFloat(quantityInput.value) || 0;

        if (selectedOption && selectedOption.dataset.price && quantity > 0) {
            const price = parseFloat(selectedOption.dataset.price);
            const amount = price * quantity;
            currentAmount.textContent = Utils.formatCurrency(amount);
            currentAmount.style.color = 'var(--success-color)';
        } else {
            currentAmount.textContent = '0 ₽';
            currentAmount.style.color = 'var(--text-secondary)';
        }
    }

    /**
     * Добавить запись
     */
    async addRecord() {
        if (this.isLoading) return;

        const select = document.getElementById('product-select');
        const quantityInput = document.getElementById('quantity-input');
        const addButton = document.getElementById('add-record-btn');

        if (!select || !quantityInput || !addButton) return;

        const selectedOption = select.options[select.selectedIndex];
        const quantity = quantityInput.value.trim();

        // Валидация
        if (!selectedOption || !selectedOption.value) {
            Utils.showToast('Выберите продукт', 'error');
            select.focus();
            return;
        }

        if (!Utils.isValidNumber(quantity)) {
            Utils.showToast('Введите корректное количество', 'error');
            quantityInput.focus();
            quantityInput.select();
            return;
        }

        // Показать загрузку
        this.setLoading(true, addButton);

        try {
            // Создать запись
            const record = {
                productId: parseInt(selectedOption.value),
                productName: selectedOption.dataset.name,
                quantity: parseFloat(quantity),
                price: parseFloat(selectedOption.dataset.price),
                amount: parseFloat(quantity) * parseFloat(selectedOption.dataset.price)
            };

            // Сохранить
            Storage.addRecord(record);

            // Обновить интерфейс
            this.loadRecords();
            this.updateMonthlyTotal();

            // Очистить форму
            quantityInput.value = '';
            this.updateCurrentAmount();

            // Фокус на количество для следующего ввода
            setTimeout(() => {
                quantityInput.focus();
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
     * Загрузить записи
     */
    loadRecords() {
        const records = Storage.getCurrentMonthRecords();
        const recordsList = document.getElementById('records-list');
        const recordsCount = document.getElementById('records-count');

        if (!recordsList || !recordsCount) return;

        // Обновить счетчик
        recordsCount.textContent = records.length;

        if (records.length === 0) {
            recordsList.innerHTML = this.getEmptyState('📝', 'Записи отсутствуют', 'Добавьте первую запись о продукции');
            return;
        }

        // Сортировать по дате (новые сначала)
        records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        recordsList.innerHTML = '';

        records.forEach(record => {
            const recordElement = this.createRecordElement(record);
            recordsList.appendChild(recordElement);
        });
    }

    /**
     * Создать элемент записи
     * @param {Object} record запись
     * @returns {HTMLElement} элемент записи
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
     * Удалить запись
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
     * Обновить месячную сумму
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
     * Создать пустое состояние
     * @param {string} icon иконка
     * @param {string} title заголовок
     * @param {string} subtitle подзаголовок
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
     * Установить состояние загрузки
     * @param {boolean} loading состояние загрузки
     * @param {HTMLElement} button кнопка
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
}

// Глобальный экземпляр приложения
let app;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    app = new ProductTracker();
});

// Обновление данных при возврате на страницу
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && app) {
        app.loadProducts();
        app.updateMonthlyTotal();
    }
});
