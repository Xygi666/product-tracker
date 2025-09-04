class ProductTracker {
  constructor() {
    this.isLoading = false;
    this.selectedProduct = null;
    this.currentPresets = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadProducts();
    this.loadRecords();
    this.loadQuantityPresets();
    this.updateMainStats();
    this.addSampleData();
    console.log('ProductTracker initialized');
  }

  bindEvents() {
    const addBtn = document.getElementById('add-record-btn');
    const quantityInput = document.getElementById('quantity-input');
    const productSelect = document.getElementById('product-select');

    if (productSelect) productSelect.addEventListener('change', () => this.updateAmount());
    if (quantityInput) {
      quantityInput.addEventListener('input', Utils.debounce(() => this.updateAmount(), 200));
      quantityInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') this.addRecord();
      });
    }
    if (addBtn) addBtn.addEventListener('click', () => this.addRecord());

    this.bindStatsEvents();
    this.bindExportEvents();
  }

  bindStatsEvents() {
    const statBtn = document.getElementById('statistics-btn');
    if (statBtn) statBtn.addEventListener('click', () => this.showStatistics());

    const statModal = document.getElementById('statistics-modal');
    if (statModal)
      statModal.addEventListener('click', e => {
        if (e.target === statModal) this.closeStatistics();
      });
  }

  bindExportEvents() {
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn)
      exportCsvBtn.addEventListener('click', () => {
        if (window.ExportManager)
          new ExportManager().exportCSV();
        else Utils.showToast('Export module not loaded', 'error');
      });
  }

  addSampleData() {
    if (Storage.getProducts().length === 0) {
      const samples = [
        { name: 'Хлеб', price: 50, isFavorite: true },
        { name: 'Булочка', price: 20, isFavorite: false }
      ];
      samples.forEach(p => Storage.addProduct(p));
      this.loadProducts();
    }
  }

  async addRecord() {
    if (this.isLoading) return;

    const addBtn = document.getElementById('add-record-btn');
    const qtyInput = document.getElementById('quantity-input');
    const productSelect = document.getElementById('product-select');

    if (!productSelect || !qtyInput || !addBtn) return;

    const selectedOption = productSelect.options[productSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
      Utils.showToast('Выберите продукт', 'error');
      return;
    }

    const qty = parseFloat(qtyInput.value);
    const price = parseFloat(selectedOption.dataset.price);
    if (!qty || qty <= 0) {
      Utils.showToast('Введите корректное количество', 'error');
      return;
    }

    const productId = parseInt(selectedOption.value);
    const productName = selectedOption.dataset.name;

    this.setLoading(true, addBtn);

    try {
      Storage.addRecord({
        productId,
        productName,
        quantity: qty,
        price,
        amount: qty * price
      });
      qtyInput.value = '';
      this.updateAmount();
      this.loadRecords();
      this.updateMainStats();
      Utils.showToast('Запись добавлена', 'success');
    } catch (e) {
      console.error(e);
      Utils.showToast('Ошибка добавления записи', 'error');
    } finally {
      this.setLoading(false, addBtn);
    }
  }

  updateAmount() {
    const productSelect = document.getElementById('product-select');
    const quantityInput = document.getElementById('quantity-input');
    const amountEl = document.getElementById('current-amount');

    if (!productSelect || !quantityInput || !amountEl) return;

    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const qty = parseFloat(quantityInput.value);
    if (selectedOption && selectedOption.dataset.price && qty > 0) {
      const price = parseFloat(selectedOption.dataset.price);
      amountEl.textContent = Utils.formatCurrency(price * qty);
    } else amountEl.textContent = '0 ₽';
  }

  loadProducts() {
    const products = Storage.getProducts();
    const select = document.getElementById('product-select');
    if (!select) return;

    select.innerHTML = '<option value="">Выберите продукт...</option>';
    products.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.isFavorite ? '⭐ ' : ''}${p.name} (${Utils.formatCurrency(p.price)})`;
      opt.dataset.price = p.price;
      opt.dataset.name = p.name;
      select.appendChild(opt);
    });
  }

  loadRecords() {
    const records = Storage.getRecords();
    const list = document.getElementById('records-list');
    const count = document.getElementById('records-count');
    if (!list || !count) return;

    count.textContent = records.length;
    if (records.length === 0) {
      list.innerHTML = `<p style="text-align:center; color:gray;">Нет записей</p>`;
      return;
    }

    list.innerHTML = '';
    records.forEach(r => {
      const div = document.createElement('div');
      div.className = 'record-item';
      div.textContent = `${r.productName}: ${r.quantity} шт, сумма ${Utils.formatCurrency(r.amount)}`;
      list.appendChild(div);
    });
  }

  updateMainStats() {
    const records = Storage.getRecords();
    const sales = records.reduce((sum, r) => sum + r.amount, 0);
    const qty = records.reduce((sum, r) => sum + r.quantity, 0);

    const saleEl = document.getElementById('monthly-sales');
    const prodEl = document.getElementById('monthly-production');

    if (saleEl) saleEl.textContent = Utils.formatCurrency(sales);
    if (prodEl) prodEl.textContent = `${qty} шт`;
  }

  showStatistics() {
    const modal = document.getElementById('statistics-modal');
    if (!modal) return;

    const salaryData = Storage.calculateSalary();
    document.getElementById('stat-sales').textContent = Utils.formatCurrency(salaryData.salesAmount);
    document.getElementById('stat-salary').textContent = Utils.formatCurrency(salaryData.baseSalary);
    document.getElementById('stat-tax-percent').textContent = salaryData.taxRate.toFixed(2);
    document.getElementById('stat-tax-amount').textContent = Utils.formatCurrency(salaryData.taxAmount);
    document.getElementById('stat-advance').textContent = Utils.formatCurrency(salaryData.advancePayment);
    document.getElementById('stat-net-salary').textContent = Utils.formatCurrency(salaryData.netSalary);
    document.getElementById('monthly-production').textContent = `${Storage.getRecords().reduce((s, r) => s + r.quantity, 0)} шт`;
    document.getElementById('records-count').textContent = Storage.getRecords().length;

    modal.classList.add('show');
  }

  closeStatistics() {
    const modal = document.getElementById('statistics-modal');
    if (modal) modal.classList.remove('show');
  }

  setLoading(state, button) {
    this.isLoading = state;
    if (!button) return;
    button.disabled = state;
    if (state) {
      button.textContent = 'Загрузка...';
      button.classList.add('loading');
    } else {
      button.textContent = 'Добавить запись';
      button.classList.remove('loading');
    }
  }
}

window.closeStatisticsModal = () => {
  if (window.app) window.app.closeStatistics();
};

window.app = new ProductTracker();

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.app) {
    window.app.updateMainStats();
  }
});
