/**
 * Настройки приложения
 */
class SettingsManager {
    constructor() {
        this.isLoading = false;
        this.init();
    }

    /**
     * Инициализация
     */
    init() {
        // Проверяем что Storage доступен
        if (typeof Storage === 'undefined') {
            console.error('Storage класс не найден');
            this.showToast('Ошибка загрузки данных', 'error');
            return;
        }

        this.bindEvents();
        this.loadProducts();
        
        console.log('SettingsManager инициализирован');
    }

    /**
     * Привязка событий
     */
    bindEvents() {
        const addProductBtn = document.getElementById('add-product-btn');
        const productNameInput = document.getElementById('product-name');
        const productPriceInput = document.getElementById('product-price');
        const exportBtn = document.getElementById('export-btn');
        const clearRecordsBtn = document.getElementById('clear-records-btn');

        // Добавление продукта
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.addProduct());
        }

        // Быстрые клавиши
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

        // Управление данными
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        if (clearRecordsBtn) {
            clearRecordsBtn.addEventListener('click', () => this.clearAllRecords());
        }

        // Валидация в реальном времени
        if (productNameInput) {
            productNameInput.addEventListener('input', () => this.validateForm());
        }
        
        if (productPriceInput) {
            productPriceInput.addEventListener('input', () => this.validateForm());
        }
    }

    /**
     * Валидация формы
     */
    validateForm() {
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
     * Добавить продукт
     */
    async addProduct() {
        if (this.isLoading) return;

        const nameInput = document.getElementById('product-name');
        const priceInput = document.getElementById('product-price');
        const addButton = document.getElementById('add-product-btn');

        if (!nameInput || !priceInput || !addButton) return;

        const name = Utils.sanitizeString(nameInput.value);
        const price = priceInput.value.trim();

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

        // Показать загрузку
        this.setLoading(true, addButton);

        try {
            // Добавить продукт
            const product = Storage.addProduct({
                name: name,
                price: parseFloat(price)
            });

            // Обновить список
            this.loadProducts();

            // Очистить форму
            nameInput.value = '';
            priceInput.value = '';
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
     * Загрузить продукты
     */
    loadProducts() {
        const products = Storage.getProducts();
        const productsList = document.getElementById('products-list');
        const productsCount = document.getElementById('products-count');

        if (!productsList || !productsCount) return;

        // Обновить счетчик
        productsCount.textContent = products.length;

        if (products.length === 0) {
            productsList.innerHTML = this.getEmptyState('📦', 'Продукты не добавлены', 'Добавьте первый продукт для учета');
            return;
        }

        // Сортировать по дате создания (новые сначала)
        products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        productsList.innerHTML = '';

        products.forEach(product => {
            const productElement = this.createProductElement(product);
            productsList.appendChild(productElement);
        });
    }

    /**
     * Создать элемент продукта
     */
    createProductElement(product) {
        const div = document.createElement('div');
        div.className = 'product-item';
        
        div.innerHTML = `
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${Utils.formatCurrency(product.price)} за шт.</div>
            </div>
            <button class="delete-btn" onclick="settings.deleteProduct(${product.id})" title="Удалить продукт">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.854 4.854a.5.5 0 0 0-.708-.708L8 8.293 3.854 4.146a.5.5 0 1 0-.708.708L7.293 9l-4.147 4.146a.5.5 0 0 0 .708.708L8 9.707l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 9l4.147-4.146z"/>
                </svg>
            </button>
        `;

        return div;
    }

    /**
     * Удалить продукт
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
     * Экспорт данных
     */
    exportData() {
        try {
            const data = Storage.exportData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `product-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Utils.showToast('Данные экспортированы', 'success');
        } catch (error) {
            console.error('Ошибка при экспорте:', error);
            Utils.showToast('Ошибка при экспорте данных', 'error');
        }
    }

    /**
     * Очистить все записи
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
     * Создать пустое состояние
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
                    Добавить продукт
                `;
            }
        }
        
        this.validateForm();
    }
}

// Глобальный экземпляр настроек
let settings;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    settings = new SettingsManager();
});
