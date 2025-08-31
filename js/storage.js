/**
 * Класс для работы с локальным хранилищем
 * Управляет сохранением и загрузкой данных о продуктах и записях
 */
class Storage {
    static PRODUCTS_KEY = 'pt_products';
    static RECORDS_KEY = 'pt_records';
    static VERSION_KEY = 'pt_version';
    static CURRENT_VERSION = '2.0';

    /**
     * Инициализация хранилища
     */
    static init() {
        this.migrateData();
    }

    /**
     * Миграция данных при обновлении версии
     */
    static migrateData() {
        const version = localStorage.getItem(this.VERSION_KEY);
        if (version !== this.CURRENT_VERSION) {
            // Здесь можно добавить миграции при необходимости
            localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
        }
    }

    /**
     * Получить все продукты
     * @returns {Array} массив продуктов
     */
    static getProducts() {
        try {
            const products = localStorage.getItem(this.PRODUCTS_KEY);
            return products ? JSON.parse(products) : [];
        } catch (error) {
            console.error('Ошибка при загрузке продуктов:', error);
            return [];
        }
    }

    /**
     * Сохранить продукты
     * @param {Array} products массив продуктов
     */
    static saveProducts(products) {
        try {
            localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
        } catch (error) {
            console.error('Ошибка при сохранении продуктов:', error);
            throw new Error('Не удалось сохранить продукты');
        }
    }

    /**
     * Добавить продукт
     * @param {Object} product объект продукта
     * @returns {Object} добавленный продукт с ID
     */
    static addProduct(product) {
        const products = this.getProducts();
        const newProduct = {
            id: this.generateId(),
            name: product.name.trim(),
            price: parseFloat(product.price),
            createdAt: new Date().toISOString()
        };
        
        products.push(newProduct);
        this.saveProducts(products);
        return newProduct;
    }

    /**
     * Обновить продукт
     * @param {number} id ID продукта
     * @param {Object} updates обновления
     */
    static updateProduct(id, updates) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === id);
        
        if (index !== -1) {
            products[index] = { ...products[index], ...updates };
            this.saveProducts(products);
        }
    }

    /**
     * Удалить продукт
     * @param {number} id ID продукта
     */
    static deleteProduct(id) {
        const products = this.getProducts();
        const filteredProducts = products.filter(p => p.id !== id);
        this.saveProducts(filteredProducts);
    }

    /**
     * Найти продукт по ID
     * @param {number} id ID продукта
     * @returns {Object|null} продукт или null
     */
    static getProductById(id) {
        const products = this.getProducts();
        return products.find(p => p.id === id) || null;
    }

    /**
     * Получить все записи
     * @returns {Array} массив записей
     */
    static getRecords() {
        try {
            const records = localStorage.getItem(this.RECORDS_KEY);
            return records ? JSON.parse(records) : [];
        } catch (error) {
            console.error('Ошибка при загрузке записей:', error);
            return [];
        }
    }

    /**
     * Сохранить записи
     * @param {Array} records массив записей
     */
    static saveRecords(records) {
        try {
            localStorage.setItem(this.RECORDS_KEY, JSON.stringify(records));
        } catch (error) {
            console.error('Ошибка при сохранении записей:', error);
            throw new Error('Не удалось сохранить записи');
        }
    }

    /**
     * Добавить запись
     * @param {Object} record объект записи
     * @returns {Object} добавленная запись с ID
     */
    static addRecord(record) {
        const records = this.getRecords();
        const newRecord = {
            id: this.generateId(),
            productId: record.productId,
            productName: record.productName,
            quantity: parseFloat(record.quantity),
            price: parseFloat(record.price),
            amount: parseFloat(record.amount),
            createdAt: new Date().toISOString()
        };
        
        records.push(newRecord);
        this.saveRecords(records);
        return newRecord;
    }

    /**
     * Удалить запись
     * @param {number} id ID записи
     */
    static deleteRecord(id) {
        const records = this.getRecords();
        const filteredRecords = records.filter(r => r.id !== id);
        this.saveRecords(filteredRecords);
    }

    /**
     * Получить записи за текущий месяц
     * @returns {Array} записи за текущий месяц
     */
    static getCurrentMonthRecords() {
        const records = this.getRecords();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return records.filter(record => {
            const recordDate = new Date(record.createdAt);
            return recordDate.getMonth() === currentMonth && 
                   recordDate.getFullYear() === currentYear;
        });
    }

    /**
     * Очистить все записи
     */
    static clearAllRecords() {
        localStorage.removeItem(this.RECORDS_KEY);
    }

    /**
     * Экспортировать данные
     * @returns {Object} объект с данными для экспорта
     */
    static exportData() {
        return {
            products: this.getProducts(),
            records: this.getRecords(),
            exportDate: new Date().toISOString(),
            version: this.CURRENT_VERSION
        };
    }

    /**
     * Импортировать данные
     * @param {Object} data данные для импорта
     */
    static importData(data) {
        if (data.products) {
            this.saveProducts(data.products);
        }
        if (data.records) {
            this.saveRecords(data.records);
        }
    }

    /**
     * Генерировать уникальный ID
     * @returns {number} уникальный ID
     */
    static generateId() {
        return Date.now() + Math.floor(Math.random() * 1000);
    }

    /**
     * Получить размер хранилища в байтах
     * @returns {number} размер в байтах
     */
    static getStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }
}

/**
 * Утилиты для работы с данными
 */
class Utils {
    /**
     * Форматировать валюту
     * @param {number} amount сумма
     * @returns {string} отформатированная строка
     */
    static formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount) + ' ₽';
    }

    /**
     * Форматировать дату
     * @param {string} dateString строка даты
     * @returns {string} отформатированная дата
     */
    static formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now - date;
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInHours < 1) {
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
            return diffInMinutes < 1 ? 'только что' : `${diffInMinutes} мин. назад`;
        } else if (diffInHours < 24) {
            return `${diffInHours} ч. назад`;
        } else if (diffInDays < 7) {
            return `${diffInDays} дн. назад`;
        } else {
            return new Intl.DateTimeFormat('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        }
    }

    /**
     * Показать уведомление
     * @param {string} message текст
     * @param {string} type тип ('success', 'error', 'warning')
     */
    static showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    /**
     * Валидация числа
     * @param {string} value значение
     * @returns {boolean} валидно ли число
     */
    static isValidNumber(value) {
        return !isNaN(value) && !isNaN(parseFloat(value)) && parseFloat(value) > 0;
    }

    /**
     * Очистка строки
     * @param {string} str строка
     * @returns {string} очищенная строка
     */
    static sanitizeString(str) {
        return str.trim().replace(/\s+/g, ' ');
    }

    /**
     * Debounce функция
     * @param {Function} func функция
     * @param {number} wait время ожидания
     * @returns {Function} debounced функция
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    Storage.init();
});
