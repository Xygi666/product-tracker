/**
 * Модуль экспорта данных
 * Обрабатывает экспорт в различные форматы и отправку отчетов
 */
class ExportManager {
    constructor() {
        this.init();
    }

    init() {
        console.log('ExportManager инициализирован');
    }

    /**
     * Экспорт в CSV формат
     * @returns {string} CSV данные
     */
    exportToCSV() {
        try {
            const records = Storage.getCurrentMonthRecords();
            const products = Storage.getProducts();
            
            if (records.length === 0) {
                Utils.showToast('Нет данных для экспорта', 'warning');
                return null;
            }

            // Заголовки CSV
            const headers = [
                'Дата',
                'Время',
                'Продукт',
                'Количество',
                'Цена за ед.',
                'Сумма'
            ];

            // Данные записей
            const csvRows = [headers.join(',')];
            
            records.forEach(record => {
                const date = new Date(record.createdAt);
                const dateStr = date.toLocaleDateString('ru-RU');
                const timeStr = date.toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const row = [
                    dateStr,
                    timeStr,
                    `"${record.productName}"`,
                    record.quantity,
                    record.price,
                    record.amount
                ];
                
                csvRows.push(row.join(','));
            });

            // Итоговая сумма
            const total = records.reduce((sum, r) => sum + r.amount, 0);
            csvRows.push('');
            csvRows.push(`"Итого за месяц:",,,,,${total}`);

            const csvContent = csvRows.join('\n');
            
            // Скачивание файла
            const fileName = `отчет-продукции-${new Date().toISOString().split('T')[0]}.csv`;
            this.downloadCSV(csvContent, fileName);
            
            Utils.showToast('CSV файл скачан', 'success');
            return csvContent;
            
        } catch (error) {
            console.error('Ошибка экспорта CSV:', error);
            Utils.showToast('Ошибка при экспорте CSV', 'error');
            return null;
        }
    }

    /**
     * Экспорт в Excel формат (HTML таблица)
     */
    exportToExcel() {
        try {
            const records = Storage.getCurrentMonthRecords();
            
            if (records.length === 0) {
                Utils.showToast('Нет данных для экспорта', 'warning');
                return;
            }

            // Создаем HTML таблицу для Excel
            let html = `
                <table border="1">
                    <thead>
                        <tr style="background-color: #f0f0f0; font-weight: bold;">
                            <th>Дата</th>
                            <th>Время</th>
                            <th>Продукт</th>
                            <th>Количество</th>
                            <th>Цена за ед.</th>
                            <th>Сумма</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            records.forEach(record => {
                const date = new Date(record.createdAt);
                const dateStr = date.toLocaleDateString('ru-RU');
                const timeStr = date.toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });

                html += `
                    <tr>
                        <td>${dateStr}</td>
                        <td>${timeStr}</td>
                        <td>${record.productName}</td>
                        <td>${record.quantity}</td>
                        <td>${record.price} ₽</td>
                        <td style="font-weight: bold;">${record.amount} ₽</td>
                    </tr>
                `;
            });

            const total = records.reduce((sum, r) => sum + r.amount, 0);
            html += `
                    <tr style="background-color: #e0e0e0; font-weight: bold;">
                        <td colspan="5">Итого за месяц:</td>
                        <td>${total} ₽</td>
                    </tr>
                </tbody>
                </table>
            `;

            // Скачивание как Excel файл
            const fileName = `отчет-продукции-${new Date().toISOString().split('T')[0]}.xls`;
            this.downloadExcel(html, fileName);
            
            Utils.showToast('Excel файл скачан', 'success');
            
        } catch (error) {
            console.error('Ошибка экспорта Excel:', error);
            Utils.showToast('Ошибка при экспорте Excel', 'error');
        }
    }

    /**
     * Создание текстового отчета для отправки
     * @returns {string} Текстовый отчет
     */
    createTextReport() {
        const records = Storage.getCurrentMonthRecords();
        const now = new Date();
        const monthName = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
        
        let report = `📦 ОТЧЕТ ПО ПРОДУКЦИИ\n`;
        report += `📅 За ${monthName}\n`;
        report += `🕐 Создан: ${now.toLocaleString('ru-RU')}\n`;
        report += `\n`;

        if (records.length === 0) {
            report += `❌ Записи отсутствуют\n`;
            return report;
        }

        // Группировка по продуктам
        const productSummary = {};
        records.forEach(record => {
            if (!productSummary[record.productName]) {
                productSummary[record.productName] = {
                    quantity: 0,
                    amount: 0,
                    count: 0
                };
            }
            productSummary[record.productName].quantity += record.quantity;
            productSummary[record.productName].amount += record.amount;
            productSummary[record.productName].count += 1;
        });

        report += `📊 СВОДКА ПО ПРОДУКТАМ:\n`;
        Object.entries(productSummary).forEach(([name, data]) => {
            report += `• ${name}: ${data.quantity} шт., ${Utils.formatCurrency(data.amount)}\n`;
        });

        const total = records.reduce((sum, r) => sum + r.amount, 0);
        report += `\n💰 ОБЩИЙ ДОХОД: ${Utils.formatCurrency(total)}\n`;
        report += `📈 Всего записей: ${records.length}\n`;
        report += `🏆 Лучший продукт: ${this.getBestProduct(productSummary)}\n`;

        return report;
    }

    /**
     * Определение лучшего продукта по прибыли
     * @param {Object} productSummary Сводка по продуктам
     * @returns {string} Название лучшего продукта
     */
    getBestProduct(productSummary) {
        let bestProduct = '';
        let maxAmount = 0;
        
        Object.entries(productSummary).forEach(([name, data]) => {
            if (data.amount > maxAmount) {
                maxAmount = data.amount;
                bestProduct = name;
            }
        });
        
        return bestProduct || 'Не определен';
    }

    /**
     * Отправка отчета на email (через веб-шер или копирование)
     */
    async sendToEmail() {
        try {
            const report = this.createTextReport();
            const subject = `Отчет по продукции за ${new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
            
            if (navigator.share && navigator.canShare && navigator.canShare({ text: report })) {
                await navigator.share({
                    title: subject,
                    text: report
                });
                Utils.showToast('Отчет отправлен через шер', 'success');
            } else {
                // Fallback: копирование в буфер обмена
                await Utils.copyToClipboard(report);
                Utils.showToast('Отчет скопирован в буфер обмена', 'success');
                
                // Попытка открыть email клиент
                const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(report)}`;
                window.open(mailtoLink);
            }
            
        } catch (error) {
            console.error('Ошибка отправки email:', error);
            Utils.showToast('Ошибка при отправке отчета', 'error');
        }
    }

    /**
     * Поделиться отчетом
     */
    async shareReport() {
        try {
            const report = this.createTextReport();
            const subject = `Отчет по продукции за ${new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
            
            if (navigator.share) {
                await navigator.share({
                    title: subject,
                    text: report
                });
                Utils.showToast('Отчет отправлен', 'success');
            } else {
                // Fallback: копирование в буфер обмена
                await Utils.copyToClipboard(report);
                Utils.showToast('Отчет скопирован в буфер обмена', 'success');
            }
            
        } catch (error) {
            console.error('Ошибка при отправке:', error);
            Utils.showToast('Ошибка при отправке отчета', 'error');
        }
    }

    /**
     * Скачать CSV файл
     * @param {string} content Содержимое CSV
     * @param {string} fileName Имя файла
     */
    downloadCSV(content, fileName) {
        const BOM = '\uFEFF'; // BOM для корректного отображения в Excel
        const blob = new Blob([BOM + content], { 
            type: 'text/csv;charset=utf-8;' 
        });
        
        Utils.downloadFile(blob, fileName, 'text/csv');
    }

    /**
     * Скачать Excel файл
     * @param {string} htmlContent HTML содержимое
     * @param {string} fileName Имя файла
     */
    downloadExcel(htmlContent, fileName) {
        const blob = new Blob([htmlContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8;' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Экспорт всех данных в JSON (резервная копия)
     */
    exportBackup() {
        try {
            const data = Storage.exportData();
            const jsonString = JSON.stringify(data, null, 2);
            const fileName = `product-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            Utils.downloadFile(jsonString, fileName, 'application/json');
            Utils.showToast('Резервная копия создана', 'success');
            
        } catch (error) {
            console.error('Ошибка создания резервной копии:', error);
            Utils.showToast('Ошибка при создании резервной копии', 'error');
        }
    }
}

// Глобальные функции для вызова из HTML
function exportToCSV() {
    const exportManager = new ExportManager();
    exportManager.exportToCSV();
    closeQuickExport();
}

function exportToEmail() {
    const exportManager = new ExportManager();
    exportManager.sendToEmail();
    closeQuickExport();
}

function shareReport() {
    const exportManager = new ExportManager();
    exportManager.shareReport();
    closeQuickExport();
}

function closeQuickExport() {
    const modal = document.getElementById('quick-export-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const exportManager = new ExportManager();
    
    // Привязка события к кнопке быстрого экспорта
    const quickExportBtn = document.getElementById('quick-export-btn');
    if (quickExportBtn) {
        quickExportBtn.addEventListener('click', () => {
            const modal = document.getElementById('quick-export-modal');
            if (modal) {
                modal.classList.add('show');
            }
        });
    }

    // Привязка события к кнопке экспорта CSV в списке записей
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            exportManager.exportToCSV();
        });
    }

    // Закрытие модала по клику вне его
    const modal = document.getElementById('quick-export-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeQuickExport();
            }
        });
    }
});
