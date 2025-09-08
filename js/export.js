class ExportManager {
  constructor() {
    this.init();
  }

  init() {
    console.log('ExportManager initialized');
  }

  exportToCSV() {
    try {
      const records = Storage.getCurrentMonthRecords();
      
      if (records.length === 0) {
        Utils.showToast('Нет данных для экспорта', 'warning');
        return null;
      }

      const headers = [
        'Дата',
        'Время',
        'Продукт',
        'Количество',
        'Цена за ед.',
        'Сумма'
      ];

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

      const total = records.reduce((sum, r) => sum + r.amount, 0);
      csvRows.push('');
      csvRows.push(`"Итого за месяц:",,,,,${total}`);

      const csvContent = '\uFEFF' + csvRows.join('\n');
      
      const fileName = `отчет-продукции-${new Date().toISOString().split('T')[0]}.csv`;
      this.downloadFile(csvContent, fileName, 'text/csv;charset=utf-8');
      
      Utils.showToast('CSV файл скачан', 'success');
      return csvContent;
      
    } catch (error) {
      console.error('Ошибка экспорта CSV:', error);
      Utils.showToast('Ошибка при экспорте CSV', 'error');
      return null;
    }
  }

  exportToExcel() {
    try {
      const records = Storage.getCurrentMonthRecords();
      
      if (records.length === 0) {
        Utils.showToast('Нет данных для экспорта', 'warning');
        return;
      }

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

      const fileName = `отчет-продукции-${new Date().toISOString().split('T')[0]}.xls`;
      this.downloadFile(html, fileName, 'application/vnd.ms-excel');
      
      Utils.showToast('Excel файл скачан', 'success');
      
    } catch (error) {
      console.error('Ошибка экспорта Excel:', error);
      Utils.showToast('Ошибка при экспорте Excel', 'error');
    }
  }

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
        await Utils.copyToClipboard(report);
        Utils.showToast('Отчет скопирован в буфер обмена', 'success');
        
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(report)}`;
        window.open(mailtoLink);
      }
      
    } catch (error) {
      console.error('Ошибка отправки email:', error);
      Utils.showToast('Ошибка при отправке отчета', 'error');
    }
  }

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
        await Utils.copyToClipboard(report);
        Utils.showToast('Отчет скопирован в буфер обмена', 'success');
      }
      
    } catch (error) {
      console.error('Ошибка при отправке:', error);
      Utils.showToast('Ошибка при отправке отчета', 'error');
    }
  }

  downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

function exportToCSV() {
  const exportManager = new ExportManager();
  exportManager.exportToCSV();
  if (window.app) {
    window.app.closeQuickExport();
  }
}

function exportToEmail() {
  const exportManager = new ExportManager();
  exportManager.sendToEmail();
  if (window.app) {
    window.app.closeQuickExport();
  }
}

function shareReport() {
  const exportManager = new ExportManager();
  exportManager.shareReport();
  if (window.app) {
    window.app.closeQuickExport();
  }
}
