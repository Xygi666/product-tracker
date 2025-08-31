/**
 * Утилиты для работы с приложением
 */
class Utils {
    /**
     * Форматировать число как валюту
     * @param {number} amount - сумма для форматирования
     * @returns {string} отформатированная строка
     */
    static formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount) + ' руб.';
    }

    /**
     * Форматировать дату для отображения
     * @param {string} dateString - строка даты в формате ISO
     * @returns {string} отформатированная дата и время
     */
    static formatDateTime(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    /**
     * Проверить, является ли строка валидным числом
     * @param {string} value - строка для проверки
     * @returns {boolean} true, если строка является валидным числом
     */
    static isValidNumber(value) {
        return !isNaN(value) && !isNaN(parseFloat(value)) && parseFloat(value) >= 0;
    }

    /**
     * Очистить строку от лишних пробелов
     * @param {string} str - строка для очистки
     * @returns {string} очищенная строка
     */
    static sanitizeString(str) {
        return str.trim().replace(/\s+/g, ' ');
    }

    /**
     * Показать уведомление
     * @param {string} message - текст уведомления
     * @param {string} type - тип уведомления ('success' или 'error')
     */
    static showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type === 'error' ? 'error' : ''}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    /**
     * Сгенерировать уникальный ID
     * @returns {number} уникальный timestamp
     */
    static generateId() {
        return Date.now() + Math.random();
    }
}
