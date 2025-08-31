/**
 * Главный класс приложения для учета продукции
 * Управляет всем функционалом приложения
 */
class ProductTracker {
    constructor() {
        this.currentScreen = 'main';
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
        this.updateCurrentAmount();
        
        // Добавляем тестовые данные при первом запуске
        this.addDefaultProducts();
        
        console.log('Приложение "Учет продукции" запущено');
    }

    /**
     * Привязка событий к элементам интерфейса
     */
    bindEvents() {
        // Навигация
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showScreen('settings');
        });

        document.getElementById('back-btn').addEventListener('click', () => {
            this.showScreen('main');
        });

        // Главный экран
        document.getElementById('add-record-btn').addEventListener('click', () => {
            this.addRecord();
        });

        document.getElementById('product-select').addEventListener('change', () => {
            this.updateCurrentAmount();
        });

        document.getElementById('quantity-input').addEventListener('input', () => {
            this.updateCurrentAmount();
        });

        // Настройки
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.addProduct();
        });

        // Enter для быстрого добавления
        document.getElementById('quantity-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addRecord();
            }
        });

        document.getElementById('product-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('product-price').focus();
            }
        });

        document.getElementById('product-price').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addProduct();
            }
        });
    }

    /**
     * Переключение между экранами
     * @param {string} screenName - название экрана для показа
     */
    showScreen(screenName) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active', 'slide-in', 'slide-out');
        });

        const targetScreen = document.getElementById(`${screenName}-screen`);
        targetScreen.classList.add('active', 'slide-in');
        
        this.currentScreen = screenName;

        // Обновляем данные при возврате на главный экран
        if (screenName === 'main') {
            this.loadProducts();
            this.updateCurrentAmount();
        }
    }

    /**
     * Добавление тестовых продуктов при первом запуске
     */
    addDefaultProducts() {
        const existingProducts = Storage.getProducts();
        if (existingProducts.length === 0) {
            const defaultProducts = [
                { name: 'Хлеб белый', price: 45 },
                { name: 'Хлеб черный', price: 50 },
                { name: 'Булочка', price: 25 }
            ];

            defaultProducts.forEach(product => {
                Storage.addProduct(product);
            });

            this.loadProducts();
            Utils.showNotification('Добавлены примеры продуктов');
        }
    }

    /**
     * Загрузка списка продуктов в выпадающий список
     */
    loadProducts() {
        const products = Storage.getProducts();
        const select = document.getElementById('product-select');
        
        // Очищаем текущие опции кроме заголовка
        select.innerHTML = '<option value="">-- Выберите продукт --</option>';
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${Utils.formatCurrency(product.price)})`;
            option.dataset.price = product.price;
            option.dataset.name = product.name;
            select.appendChild(option);
        });

        // Обновляем список в настройках
        this.updateProductsList();
    }

    /**
     * Обновление списка продуктов в настройках
     */
    updateProductsList() {
        const products = Storage.getProducts();
        const container = document.getElementById('products-list');
        
        if (products.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: white; opacity: 0.7;">Продукты не добавлены</p>';
            return;
        }

        container.innerHTML = '';
        
        products.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product-item';
            productElement.innerHTML = `
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <div class="product-price">${Utils.formatCurrency(product.price)}</div>
                </div>
                <button class="btn btn-danger" onclick="app.deleteProduct(${product.id})">
                    Удалить
                </button>
            `;
            container.appendChild(productElement);
        });
    }

    /**
     * Добавление нового продукта
     */
    addProduct() {
        const nameInput = document.getElementById('product-name');
        const priceInput = document.getElementById('product-price');
        
        const name = Utils.sanitizeString(nameInput.value);
        const price = parseFloat(priceInput.value);

        // Валидация
        if (!name) {
            Utils.showNotification('Введите название продукта', 'error');
            nameInput.focus();
            return;
        }

        if (!Utils.isValidNumber(priceInput.value) || price <= 0) {
            Utils.showNotification('Введите корректную цену', 'error');
            priceInput.focus();
            return;
        }

        // Проверка на дублирование
        const existingProducts = Storage.getProducts();
        const isDuplicate = existingProducts.some(p => 
            p.name.toLowerCase() === name.toLowerCase()
        );

        if (isDuplicate) {
            Utils.showNotification('Продукт с таким названием уже существует', 'error');
            return;
        }

        // Добавление продукта
        const product = {
            name: name,
            price: price
        };

        Storage.addProduct(product);
        this.loadProducts();

        // Очистка полей
        nameInput.value = '';
        priceInput.value = '';
        nameInput.focus();

        Utils.showNotification('Продукт успешно добавлен');
    }

    /**
     * Удаление продукта
     * @param {number} productId - ID продукта для удаления
     */
    deleteProduct(productId) {
        if (confirm('Вы уверены, что хотите удалить этот продукт?')) {
            Storage.deleteProduct(productId);
            this.loadProducts();
            Utils.showNotification('Продукт удален');
        }
    }

    /**
     * Обновление текущей суммы на основе выбранного продукта и количества
     */
    updateCurrentAmount() {
        const select = document.getElementById('product-select');
        const quantityInput = document.getElementById('quantity-input');
        const amountElement = document.getElementById('current-amount');

        const selectedOption = select.options[select.selectedIndex];
        const quantity = parseFloat(quantityInput.value) || 0;

        if (selectedOption && selectedOption.dataset.price && quantity > 0) {
            const price = parseFloat(selectedOption.dataset.price);
            const amount = price * quantity;
            amountElement.textContent = Utils.formatCurrency(amount);
        } else {
            amountElement.textContent = '0 руб.';
        }
    }

    /**
     * Добавление новой записи
     */
    addRecord() {
        const select = document.getElementById('product-select');
        const quantityInput = document.getElementById('quantity-input');

        const selectedOption = select.options[select.selectedIndex];
        const quantity = parseFloat(quantityInput.value);

        // Валидация
        if (!selectedOption || !selectedOption.value) {
            Utils.showNotification('Выберите продукт', 'error');
            select.focus();
            return;
        }

        if (!Utils.isValidNumber(quantityInput.value) || quantity <= 0) {
            Utils.showNotification('Введите корректное количество', 'error');
            quantityInput.focus();
            return;
        }

        // Создание записи
        const record = {
            productId: parseInt(selectedOption.value),
            productName: selectedOption.dataset.name,
            quantity: quantity,
            price: parseFloat(selectedOption.dataset.price),
            amount: quantity * parseFloat(selectedOption.dataset.price)
        };

        Storage.addRecord(record);
        this.loadRecords();
        this.updateMonthlyTotal();

        // Очистка полей
        quantityInput.value = '';
        select.selectedIndex = 0;
        this.updateCurrentAmount();

        Utils.showNotification('Запись добавлена');
        
        // Фокус на количество для быстрого ввода следующей записи
        quantityInput.focus();
    }

    /**
     * Загрузка и отображение записей за текущий месяц
     */
    loadRecords() {
        const records = Storage.getCurrentMonthRecords();
        const container = document.getElementById('records-list');

        if (records.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: white; opacity: 0.7;">Записи за текущий месяц отсутствуют</p>';
            return;
        }

        // Сортируем записи по дате (новые сначала)
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = '';

        records.forEach(record => {
            const recordElement = document.createElement('div');
            recordElement.className = 'record-item';
            recordElement.innerHTML = `
                <div class="record-info">
                    <div class="record-product">${record.productName}</div>
                    <div class="record-details">
                        ${record.quantity} шт. × ${Utils.formatCurrency(record.price)} 
                        • ${Utils.formatDateTime(record.date)}
                    </div>
                </div>
                <div class="record-amount">${Utils.formatCurrency(record.amount)}</div>
                <button class="btn btn-danger" onclick="app.deleteRecord(${record.id})" title="Удалить запись">
                    ×
                </button>
            `;
            container.appendChild(recordElement);
        });
    }

    /**
     * Удаление записи
     * @param {number} recordId - ID записи для удаления
     */
    deleteRecord(recordId) {
        if (confirm('Удалить эту запись?')) {
            Storage.deleteRecord(recordId);
            this.loadRecords();
            this.updateMonthlyTotal();
            Utils.showNotification('Запись удалена');
        }
    }

    /**
     * Обновление месячной суммы
     */
    updateMonthlyTotal() {
        const records = Storage.getCurrentMonthRecords();
        const total = records.reduce((sum, record) => sum + record.amount, 0);
        
        document.getElementById('monthly-amount').textContent = Utils.formatCurrency(total);
    }
}

// Запуск приложения при загрузке страницы
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ProductTracker();
});

// Предотвращение случайного обновления страницы
window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = '';
});
