class ExportManager {
  constructor() {
    this.init();
  }

  init() {
    console.log('ExportManager initialized');
  }

  exportToCSV() {
    const records = Storage.getCurrentMonthRecords();
    if (records.length === 0) {
      Utils.showToast('Нет данных для экспорта', 'warning');
      return;
    }

    const headers = ['Дата', 'Время', 'Продукт', 'Количество', 'Цена за ед.', 'Сумма'];
    const rows = [headers.join(',')];

    records.forEach(record => {
      const date = new Date(record.createdAt);
      const dateStr = date.toLocaleDateString('ru-RU');
      const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      rows.push([
        dateStr,
        timeStr,
        `"${record.productName}"`,
        record.quantity,
        record.price,
        record.amount
      ].join(','));
    });

    const total = records.reduce((sum, r) => sum + r.amount, 0);
    rows.push('');
    rows.push(`"Итого за месяц:",,,,,${total}`);

    const csvContent = '\uFEFF' + rows.join('\n');
    const fileName = `отчет-продукции-${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadFile(csvContent, fileName, 'text/csv');

    Utils.showToast('CSV файл скачан', 'success');
  }

  exportToExcel() {
    const records = Storage.getCurrentMonthRecords();
    if (records.length === 0) {
      Utils.showToast('Нет данных для экспорта', 'warning');
      return;
    }

    let html = `
      <table border="1">
        <thead>
          <tr style="background:#f0f0f0;font-weight:bold;">
            <th>Дата</th><th>Время</th><th>Продукт</th><th>Количество</th><th>Цена за ед.</th><th>Сумма</th>
          </tr>
        </thead>
        <tbody>
    `;

    records.forEach(record => {
      const date = new Date(record.createdAt);
      const dateStr = date.toLocaleDateString('ru-RU');
      const timeStr = date.toLocale
