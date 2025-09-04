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
    this.addSampleDataIfEmpty();
    
    console.log('ProductTracker v3.1 initialized');
  }

  bindEvents() {
    const addRecordBtn = document.getElementById('add-record-btn');
    const quantityInput = document.getElementById('quantity-input');
    const productSelect = document.getElementById('product-select');

    if (productSelect) {
      productSelect.addEventListener('change', () => this.updateCurrentAmount());
    }
    
    if (quantityInput) {
      quantityInput.addEventListener('input', Utils.debounce(() => this.updateCurrentAmount(), 300));
      quantityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !this.isLoading) {
          this.addRecord();
        }
      });
    }

    if (addRecordBtn) {
      addRecordBtn.addEventListener('click', () => this.addRecord());
    }

    this.bindStatisticsEvents();
    this.bindQuickExportEvents();

    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.id !== 'quantity-input') {
        e.preventDefault();
      }
    });
  }

  bindStatisticsEvents() {
    const statisticsBtn = document.getElementById('statistics-btn');
    if (statisticsBtn) {
      statisticsBtn.addEventListener('click', () => this.showStatistics());
    }

    const statisticsModal = document.getElementById('statistics-modal');
    if (statisticsModal) {
      statisticsModal.addEventListener('click', (e) => {
        if (e.target === statisticsModal) {
          this.closeStatisticsModal();
        }
      });
    }
  }

  bindQuickExportEvents() {
    const quickExportBtn = document.getElementById('quick-export-btn');
    if (quickExportBtn) {
      quickExportBtn.addEventListener('click', () => {
        const modal = document.getElementById('quick-export-modal');
        if (modal) {
          modal.classList.add('show');
        }
      });
    }

    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        if (typeof ExportManager !== 'undefined') {
          const exportManager = new ExportManager();
          exportManager.exportToCSV();
        } else {
          Utils.showToast('Модуль экспорта не загружен', 'error');
        }
      });
    }

    const modal = document.getElementById('quick-export-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeQuickExport();
        }
      });
    }
  }

  addSampleDataIfEmpty() {
    const products = Storage.getProducts();
    if (products.length === 0) {
      const sampleProducts = [
        { name: 'Хлеб белый', price: 45, isFavorite: true },
        { name: 'Хлеб черный', price: 50, isFavorite: true },
        { name: 'Булочка с маком', price: 35, isFavorite: false },
        { name: 'Багет французский', price: 75, isFavorite: false },
        { name: 'Круассан', price: 60, isFavorite: false }
      ];

      sampleProducts.forEach(product => {
        Storage.addProduct(product);
      });

      this.loadProducts();
      Utils.showToast('Добавлены образцы продуктов', 'success');
    }
  }

  loadProducts() {
    const products = Storage.getProducts();
    const select = document.getElementById('product-select');
    
    if (!select) return;

    select.innerHTML = '<option value="">Выберите продукт...</option>';

    if (products.length === 0) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = 'Нет продуктов (добавьте в настройках)';
      emptyOption.disabled = true;
      select.appendChild(emptyOption);
      return;
    }

    const favorites = products.filter(p => p.isFavorite).sort((a, b) => a.name.localeCompare(b.name));
    const regular = products.filter(p => !p.isFavorite).sort((a, b) => a.name.localeCompare(b.name));
    const sortedProducts = [...favorites, ...regular];

    sortedProducts.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = `${product.isFavorite ? '⭐ ' : ''}${product.name} • ${Utils.formatCurrency(product.price)}`;
      option.dataset.price = product.price;
      option.dataset.name = product.name;
      select.appendChild(option);
    });

    this.updateCurrentAmount();

    if (typeof searchManager !== 'undefined') {
      searchManager.refreshResults();
    }
  }

  loadQuantityPresets() {
    this.currentPresets = Storage.getQuantityPresets();
    this.renderQuantityPresets();
  }

  renderQuantityPresets() {
    const container = document.getElementById('quantity-presets');
    if (!container) return;

    container.innerHTML = '';

    if (this.currentPresets.length === 0) {
      return;
    }

    this.currentPresets.forEach(preset => {
      const button = document.createElement('button');
      button.className = 'preset-btn';
      button.textContent = preset;
      button.type = 'button';
      
      button.addEventListener('click', () => {
        this.setQuantity(preset);
      });

      container.appendChild(button);
    });
  }

  setQuantity(value) {
    const quantityInput = document.getElementById('quantity-input');
    if (quantityInput) {
      quantityInput.value = value;
      this.updateCurrentAmount();
      
      const activeBtn = document.querySelector('.preset-btn.active');
      if (activeBtn) {
        activeBtn.classList.remove('active');
      }
      
      const clickedBtn = Array.from(document.querySelectorAll('.preset-btn'))
        .find(btn => parseFloat(btn.textContent) === value);
      if (clickedBtn) {
        clickedBtn.classList.add('active');
        setTimeout(() => {
          clickedBtn.classList.remove('active');
        }, 1000);
      }
    }
  }

  updateCurrentAmount() {
    const select = document.getElementById('product-select');
    const quantityInput = document.getElementById('quantity-input');
    const currentAmount = document.getElementById('current-amount');
    
    if (!select || !quantityInput || !currentAmount) return;

    let selectedOption = null;
    let price = 0;

    if (typeof searchManager !== 'undefined' && searchManager.getSelectedProduct()) {
      const selectedProduct = searchManager.getSelectedProduct();
      price = selectedProduct.price;
    } else {
      selectedOption = select.options[select.selectedIndex];
      if (selectedOption && selectedOption.dataset.price) {
        price = parseFloat(selectedOption.dataset.price);
      }
    }

    const quantity = parseFloat(quantityInput.value) || 0;

    if (price > 0 && quantity > 0) {
      const amount = price * quantity;
      currentAmount.textContent = Utils.formatCurrency(amount);
      currentAmount.style.color = 'var(--success-color)';
    } else {
      currentAmount.textContent = '0 ₽';
      currentAmount.style.color = 'var(--text-secondary)';
    }
  }

  async addRecord() {
    if (this.isLoading) return;

    const select = document.getElementById('product-select');
    const quantityInput = document.getElementById('quantity-input');
    const addButton = document.getElementById('add-record-btn');

    if (!select || !quantityInput || !addButton) return;

    let selectedProduct = null;
    let productId = null;
    let productName = '';
    let price = 0;

    if (typeof searchManager !== 'undefined' && searchManager.getSelectedProduct()) {
      selectedProduct = searchManager.getSelectedProduct();
      productId = selectedProduct.id;
      productName = selectedProduct.name;
      price = selectedProduct.price;
    } else {
      const selectedOption = select.options[select.selectedIndex];
      if (selectedOption && selectedOption.value) {
        productId = parseInt(selectedOption.value);
        productName = selectedOption.dataset.name;
        price = parseFloat(selectedOption.dataset.price);
      }
    }

    const quantity = quantityInput.value.trim();

    if (!productId) {
      Utils.showToast('Выберите продукт', 'error');
      if (typeof searchManager !== 'undefined') {
        const searchInput = document.getElementById('product-search');
        if (searchInput) searchInput.focus();
      } else {
        select.focus();
      }
      return;
    }

    if (!Utils.isValidNumber(quantity)) {
      Utils.showToast('Введите корректное количество', 'error');
      quantityInput.focus();
      quantityInput.select();
      return;
    }

    this.setLoading(true, addButton);

    try {
      const record = {
        productId: productId,
        productName: productName,
        quantity: parseFloat(quantity),
        price: price,
        amount: parseFloat(quantity) * price
      };

      Storage.addRecord(record);

      this.loadRecords();
      this.updateMainStats();

      quantityInput.value = '';
      this.updateCurrentAmount();

      if (typeof searchManager !== 'undefined') {
        searchManager.clear();
      } else {
        select.selectedIndex = 0;
      }

      const activePresets = document.querySelectorAll('.preset-btn.active');
      activePresets.forEach(btn => btn.classList.remove('active'));

      setTimeout(() => {
        if (typeof searchManager !== 'undefined') {
          const searchInput = document.getElementById('product-search');
          if (searchInput) searchInput.focus();
        } else {
          select.focus();
        }
      }, 100);

      Utils.showToast(`Добавлена запись: ${record.productName}`, 'success');

    } catch (error) {
      console.error('Ошибка при добавлении записи:', error);
      Utils.showToast('Ошибка при добавлении записи', 'error');
    } finally {
      this.setLoading(false, addButton);
    }
  }

  loadRecords() {
    const records = Storage.getCurrentMonthRecords();
    const recordsList = document.getElementById('records-list');
    const recordsCount = document.getElementById('records-count');

    if (!recordsList || !recordsCount) return;

    recordsCount.textContent = records.length;

    if (records.length === 0) {
      recordsList.innerHTML = this.getEmptyState('📝', 'Записи отсутствуют', 'Добавьте первую запись о продукции');
      return;
    }

    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    recordsList.innerHTML = '';

    records.forEach(record => {
      const recordElement = this.createRecordElement(record);
      recordsList.appendChild(recordElement);
    });
  }

  createRecordElement(record) {
    const div = document.createElement('div');
    div.className = 'record-item';
    
    div.innerHTML = `
      <div class="record-info">
        <div class="record-title">${record.productName}</div>
        <div class="record-details">
          ${record.quantity} шт. × ${Utils.formatCurrency(record.price)} • ${Utils.formatDate(record.createdAt)}
        </div>
      </div>
      <div class="record-amount">${Utils.formatCurrency(record.amount)}</div>
      <button class="delete-btn" onclick="app.deleteRecord(${record.id})" title="Удалить запись">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M12.854 4.854a.5.5 0 0 0-.708-.708L8 8.293 3.854 4.146a.5.5 0 1 0-.708.708L7.293 9l-4.147 4.146a.5.5 0 0 0 .708.708L8 9.707l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 9l4.147-4.146z"/>
        </svg>
      </button>
    `;

    return div;
  }

  deleteRecord(recordId) {
    if (!confirm('Удалить эту запись?')) return;

    try {
      Storage.deleteRecord(recordId);
      this.loadRecords();
      this.updateMainStats();
      Utils.showToast('Запись удалена', 'success');
    } catch (error) {
      console.error('Ошибка при удалении записи:', error);
      Utils.showToast('Ошибка при удалении записи', 'error');
    }
  }

  updateMainStats() {
    const records = Storage.getCurrentMonthRecords();
    
    const totalSales = records.reduce((sum, record) => sum + record.amount, 0);
    const totalProduction = records.reduce((sum, record) => sum + record.quantity, 0);
    
    const monthlySalesElement = document.getElementById('monthly-sales');
    if (monthlySalesElement) {
      monthlySalesElement.textContent = Utils.formatCurrency(totalSales);
    }

    const monthlyProductionElement = document.getElementById('monthly-production');
    if (monthlyProductionElement) {
      monthlyProductionElement.textContent = `${totalProduction} шт`;
    }
  }

  showStatistics() {
    const modal = document.getElementById('statistics-modal');
    if (!modal) return;

    const salaryData = Storage.calculateSalary();
    document.getElementById('stat-sales').textContent = Utils.formatCurrency(salaryData.salesAmount);
    document.getElementById('stat-salary').textContent = Utils.formatCurrency(salaryData.baseSalary);
    document.getElementById('stat-before-tax').textContent = Utils.formatCurrency(salaryData.beforeTax);
    document.getElementById('stat-tax-percent').textContent = salaryData.taxRate;
    document.getElementById('stat-tax-amount').textContent = Utils.formatCurrency(salaryData.taxAmount);
    document.getElementById('stat-advance').textContent = Utils.formatCurrency(salaryData.advancePayment);
    document.getElementById('stat-net-salary').textContent = Utils.formatCurrency(salaryData.netSalary);

    const productionStats = Storage.getProductionStats();
    document.getElementById('stat-total-production').textContent = `${productionStats.totalProduction} шт`;
    document.getElementById('stat-records-count').textContent = productionStats.recordsCount;
    document.getElementById('stat-avg-per-record').textContent = Utils.formatCurrency(productionStats.avgPerRecord);

    this.renderTopProducts(productionStats.topProducts);

    modal.classList.add('show');
  }

  renderTopProducts(topProducts) {
    const container = document.getElementById('stat-top-products');
    if (!container) return;

    if (topProducts.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Нет данных</p>';
      return;
    }

    container.innerHTML = '';
    topProducts.forEach((product, index) => {
      const div = document.createElement('div');
      div.className = 'top-product-item';
      
      div.innerHTML = `
        <div class="top-product-info">
          <div class="top-product-rank">${index + 1}</div>
          <div class="top-product-name">${product.name}</div>
        </div>
        <div class="top-product-stats">
          <div class="top-product-amount">${Utils.formatCurrency(product.amount)}</div>
          <div class="top-product-quantity">${product.quantity} шт (${product.count} записей)</div>
        </div>
      `;
      
      container.appendChild(div);
    });
  }

  closeStatisticsModal() {
    const modal = document.getElementById('statistics-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  closeQuickExport() {
    const modal = document.getElementById('quick-export-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  getEmptyState(icon, title, subtitle) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-text">${title}</div>
        <div class="empty-state-subtext">${subtitle}</div>
      </div>
    `;
  }

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
          Добавить запись
        `;
      }
    }
  }

  refresh() {
    this.loadProducts();
    this.loadRecords();
    this.loadQuantityPresets();
    this.updateMainStats();
  }
}

window.setQuantity = function(value) {
  if (window.app) {
    window.app.setQuantity(value);
  }
};

window.closeStatisticsModal = function() {
  if (window.app) {
    window.app.closeStatisticsModal();
  }
};

window.closeQuickExport = function() {
  if (window.app) {
    window.app.closeQuickExport();
  }
};

let app;

document.addEventListener('DOMContentLoaded', () => {
  app = new ProductTracker();
  window.app = app;
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && app) {
    app.refresh();
  }
});

window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('pt_') && app) {
    app.refresh();
  }
});
