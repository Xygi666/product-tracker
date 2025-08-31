/**
 * Модуль для работы с локальным хранилищем
 * Управляет сохранением и загрузкой данных о продуктах и записях
 */
class Storage {
    static PRODUCTS_KEY = 'products';
    static RECORDS_KEY = 'records';

    /**
     * Получить все продукты из локального хранилища
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
     * Сохранить продукты в локальное хранилище
     * @param {Array} products - массив продуктов для сохранения
     */
    static saveProducts(products) {
        try {
            localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
        } catch (error) {
            console.error('Ошибка при сохранении продуктов:', error);
        }
    }

    /**
     * Добавить новый продукт
     * @param {Object} product - объект продукта {id, name, price}
     */
    static addProduct(product) {
        const products = this.getProducts();
        product.id = Date.now(); // Простой способ генерации уникального ID
        products.push(product);
        this.saveProducts(products);
    }

    /**
     * Удалить продукт по ID
     * @param {number} productId - ID продукта для удаления
     */
    static deleteProduct(productId) {
        const products = this.getProducts();
        const filteredProducts = products.filter(p => p.id !== productId);
        this.saveProducts(filteredProducts);
    }

    /**
     * Получить все записи из локального хранилища
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
     * Сохранить записи в локальное хранилище
     * @param {Array} records - массив записей для сохранения
     */
    static saveRecords(records) {
        try {
            localStorage.setItem(this.RECORDS_KEY, JSON.stringify(records));
        } catch (error) {
            console.error('Ошибка при сохранении записей:', error);
        }
    }

    /**
     * Добавить новую запись
     * @param {Object} record - объект записи {id, productId, productName, quantity, price, amount, date}
     */
    static addRecord(record) {
        const records = this.getRecords();
        record.id = Date.now();
        record.date = new Date().toISOString();
        records.push(record);
        this.saveRecords(records);
    }

    /**
     * Удалить запись по ID
     * @param {number} recordId - ID записи для удаления
     */
    static deleteRecord(recordId) {
        const records = this.getRecords();
        const filteredRecords = records.filter(r => r.id !== recordId);
        this.saveRecords(filteredRecords);
    }

    /**
     * Получить записи за текущий месяц
     * @returns {Array} массив записей за текущий месяц
     */
    static getCurrentMonthRecords() {
        const records = this.getRecords();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return records.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === currentMonth && 
                   recordDate.getFullYear() === currentYear;
        });
    }
}
