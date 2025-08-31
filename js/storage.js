/**
 * Класс для работы с локальным хранилищем
 */
class Storage {
    static PRODUCTS_KEY = 'pt_products';
    static RECORDS_KEY = 'pt_records';
    static PRESETS_KEY = 'pt_presets';
    static SETTINGS_KEY = 'pt_settings';
    static VERSION_KEY = 'pt_version';
    static CURRENT_VERSION = '3.0';

    /**
     * Инициализация хранилища
     */
    static init() {
        this.migrateData();
        this.initDefaultPresets();
        this.initSettings();
    }

    /**
     * Миграция данных при обновлении версии
     */
    static migrateData() {
        const version = localStorage.getItem(this.VERSION_KEY);
        if (version !== this.CURRENT_VERSION) {
            localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
        }
    }

    /**
     * Инициализация настроек по умолчанию
     */
    static initSettings() {
        const settings = this.getSettings();
        if (!settings.theme) {
            settings.theme = 'light';
            this.saveSettings(settings);
        }
    }

    /**
     * Инициализация пресетов по умолчанию
     */
    static initDefaultPresets() {
        const presets = this.getQuantityPresets();
        if (presets.length === 0) {
            const defaultPresets = [1, 5, 10, 25, 50];
            defaultPresets.forEach(preset => {
                this.addQuantityPreset(preset);
            });
        }
    }

    // Методы для продуктов (обновленные)
    static getProducts() {
        try {
            const products = localStorage.getItem(this.PRODUCTS_KEY);
            return products ? JSON.parse(products) : [];
        } catch (error) {
            console.error('Ошибка при загрузке продуктов:', error);
            return [];
        }
    }

    static saveProducts(products) {
        try {
            localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
        } catch (error) {
            console.error('Ошибка при сохранении продуктов:', error);
            throw new Error('Не удалось сохранить продукты');
        }
    }

    static addProduct(product) {
        const products = this.getProducts();
        const newProduct = {
            id: this.generateId(),
            name: product.name.trim(),
            price: parseFloat(product.price),
            isFavorite: product.isFavorite || false,
            createdAt: new Date().toISOString()
        };
        
        products.push(newProduct);
        this.saveProducts(products);
        return newProduct;
    }

    static updateProduct(id, updates) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === id);
        
        if (index !== -1) {
            products[index] = { 
                ...products[index], 
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveProducts(products);
            return products[index];
        }
        return null;
    }

    static deleteProduct(id) {
        const products = this.getProducts();
        const filteredProducts = products.filter(p => p.id !== id);
        this.saveProducts(filteredProducts);
    }

    static getProductById(id) {
        const products = this.getProducts();
        return products.find(p => p.id === id) || null;
    }

    static getFavoriteProducts() {
        const products = this.getProducts();
        return products.filter(p => p.isFavorite);
    }

    static searchProducts(query) {
        const products = this.getProducts();
        if (!query) return products;
        
        const lowerQuery = query.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowerQuery)
        );
    }

    // Методы для пресетов количества
    static getQuantityPresets() {
        try {
            const presets = localStorage.getItem(this.PRESETS_KEY);
            return presets ? JSON.parse(presets) : [];
        } catch (error) {
            console.error('Ошибка при загрузке пресетов:', error);
            return [];
        }
    }

    static saveQuantityPresets(presets) {
        try {
            localStorage.setItem(this.PRESETS_KEY, JSON.stringify(presets));
        } catch (error) {
            console.error('Ошибка при сохранении пресетов:', error);
        }
    }

    static addQuantityPreset(value) {
        const presets = this.getQuantityPresets();
        const numValue = parseFloat(value);
        
        if (numValue > 0 && !presets.includes(numValue)) {
            presets.push(numValue);
            presets.sort((a, b) => a - b);
            this.saveQuantityPresets(presets);
        }
    }

    static removeQuantityPreset(value) {
        const presets = this.getQuantityPresets();
        const filteredPresets = presets.filter(p => p !== value);
        this.saveQuantityPresets(filteredPresets);
    }

    // Методы для настроек
    static getSettings() {
        try {
            const settings = localStorage.getItem(this.SETTINGS_KEY);
            return settings ? JSON.parse(settings) : {};
        } catch (error) {
            console.error('Ошибка при загрузке настроек:', error);
            return {};
        }
    }

    static saveSettings(settings) {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Ошибка при сохранении настроек:', error);
        }
    }

    static getSetting(key, defaultValue = null) {
        const settings = this.getSettings();
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }

    static setSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        this.saveSettings(settings);
    }

    // Остальные методы остаются без изменений...
    static getRecords() {
        try {
            const records = localStorage.getItem(this.RECORDS_KEY);
            return records ? JSON.parse(records) : [];
        } catch (error) {
            console.error('Ошибка при загрузке записей:', error);
            return [];
        }
    }

    static saveRecords(records) {
        try {
            localStorage.setItem(this.RECORDS_KEY, JSON.stringify(records));
        } catch (error) {
            console.error('Ошибка при сохранении записей:', error);
            throw new Error('Не удалось сохранить записи');
        }
    }

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

    static deleteRecord(id) {
        const records = this.getRecords();
        const filteredRecords = records.filter(r => r.id !== id);
        this.saveRecords(filteredRecords);
    }

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

    static clearAllRecords() {
        localStorage.removeItem(this.RECORDS_KEY);
    }

    static exportData() {
        return {
            products: this.getProducts(),
            records: this.getRecords(),
            presets: this.getQuantityPresets(),
            settings: this.getSettings(),
            exportDate: new Date().toISOString(),
            version: this.CURRENT_VERSION
        };
    }

    static importData(data) {
        if (data.products) {
            this.saveProducts(data.products);
        }
        if (data.records) {
            this.saveRecords(data.records);
        }
        if (data.presets) {
            this.saveQuantityPresets(data.presets);
        }
        if (data.settings) {
            this.saveSettings(data.settings);
        }
    }

    static generateId() {
        return Date.now() + Math.floor(Math.random() * 1000);
    }

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
 * Утилиты (расширенные)
 */
class Utils {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount) + ' ₽';
    }

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

    static isValidNumber(value) {
        return !isNaN(value) && !isNaN(parseFloat(value)) && parseFloat(value) > 0;
    }

    static sanitizeString(str) {
        return str.trim().replace(/\s+/g, ' ');
    }

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

    // Новые утилиты
    static copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return Promise.resolve();
            } catch (err) {
                document.body.removeChild(textArea);
                return Promise.reject(err);
            }
        }
    }

    static shareData(data) {
        if (navigator.share) {
            return navigator.share(data);
        } else {
            // Fallback: копировать в буфер обмена
            return this.copyToClipboard(data.text || data.url || '');
        }
    }

    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    Storage.init();
});
