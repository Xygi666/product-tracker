class SettingsManager {
  constructor() {
    this.isLoading = false;
    this.editingProduct = null;
    this.currentFilter = 'all';
    this.init();
  }

  init() {
    if (typeof Storage === 'undefined') {
      console.error('Storage класс не найден');
      Utils.showToast('Ошибка загрузки данных', 'error');
      return;
    }

    this.bindEvents();
    this.loadProducts();
    this.loadQuantityPresets();
    this.loadSalarySettings();
    
    console.log('SettingsManager v3.1 инициализирован');
  }

  bindEvents() {
    this.bindProductEvents();
    this.bindFilterEvents();
    this.bindPresetEvents();
    this.bindSalaryEvents();
    this.bindManageDataEvents();
    this.bindEditModalEvents();
  }

  bindProductEvents() {
    const addBtn = document.getElementById('add-product-btn');
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price');

    if (addBtn) addBtn.addEventListener('click', () => this.addProduct());
    if (nameInput) nameInput.addEventListener('input', () => this.validateProductForm());
    if (priceInput) priceInput.addEventListener('input', () => this.validateProductForm());

    [nameInput, priceInput].forEach(input => {
      if (input) input.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !this.isLoading) this.addProduct();
      });
    });
  }

  bindFilterEvents() {
    const filterAll = document.getElementById('filter-all');
    const filterFav = document.getElementById('filter-favorites');

    if (filterAll) {
      filterAll.addEventListener('click', () => this.setFilter('all'));
    }
    if (filterFav) {
      filterFav.addEventListener('click', () => this.setFilter('favorites'));
    }
  }

  bindPresetEvents() {
    const addPresetBtn = document.getElementById('add-preset-btn');
    const newPresetInput = document.getElementById('new-preset-value');

    if (addPresetBtn) addPresetBtn.addEventListener('click', () => this.addPreset());
    if (newPresetInput) newPresetInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.addPreset();
    });
  }

  bindSalaryEvents() {
    const saveSalaryBtn = document.getElementById('save-salary-settings-btn');
    const inputs = [
      document.getElementById('base-salary'),
      document.getElementById('advance-payment'),
      document.getElementById('tax-rate'),
    ];

    if (saveSalaryBtn) saveSalaryBtn.addEventListener('click', () => this.saveSalarySettings());

    inputs.forEach(inp => {
      if (inp) inp.addEventListener('blur', () => this.saveSalarySettings());
    });
  }

  bindManageDataEvents() {
    const exportBtn = document.getElementById('export-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const clearBtn = document.getElementById('clear-records-btn');

    if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportToExcel());
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearAllRecords());
  }

  bindEditModalEvents() {
    const saveEditBtn = document.getElementById('save-product-btn');
    const modal = document.getElementById('edit-product-modal');

    if (saveEditBtn) saveEditBtn.addEventListener('click', () => this.saveEditedProduct());

    if (modal) modal.addEventListener('click', e => {
      if (e.target === modal) this.closeEditModal();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.closeEditModal();
    });
  }

  setFilter(filter) {
    this.currentFilter = filter;

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));

    const activeBtn = document.getElementById(`filter-${filter}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    this.loadProducts();
  }

  validateProductForm() {
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price');
    const addButton = document.getElementById('add-product-btn');
    
    if (!nameInput || !priceInput || !addButton) return;

    const name = nameInput.value.trim();
    const price = priceInput.value.trim();
    
    const isValid = name.length > 0 && Utils.isValidNumber(price);
    addButton.disabled = !isValid || this.isLoading;
  }

  async addProduct() {
    if (this.isLoading) return;

    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price');
    const isFavoriteInput = document.getElementById('is-favorite');
    const addButton = document.getElementById('add-product-btn');

    if (!nameInput || !priceInput || !addButton) return;

    const name = Utils.sanitizeString(nameInput.value);
    const price = priceInput.value.trim();
    const isFavorite = isFavoriteInput ? isFavoriteInput.checked : false;

    if (!name) {
      Utils.showToast('Введите название продукта', 'error');
      nameInput.focus();
      return;
    }

    if (name.length > 50) {
      Utils.showToast('Название слишком длинное (макс. 50 символов)', 'error');
      nameInput.focus();
      nameInput.select();
      return;
    }

    if (!Utils.isValidNumber(price)) {
      Utils.showToast('Введите корректную цену', 'error');
      priceInput.focus();
      priceInput.select();
      return;
    }

    const existingProducts = Storage.getProducts();
    const isDuplicate = existingProducts.some(p => 
      p.name.toLowerCase() === name.toLowerCase()
    );

    if (isDuplicate) {
      Utils.showToast('Продукт с таким названием уже существует', 'warning');
      nameInput.focus();
      nameInput.select();
      return;
    }

    this.setLoading(true, addButton);

    try {
      const product = Storage.addProduct({
        name: name,
        price: parseFloat(price),
        isFavorite: isFavorite
      });

      this.loadProducts();

      nameInput.value = '';
      priceInput.value = '';
      if (isFavoriteInput) {
        isFavoriteInput.checked = false;
      }
      nameInput.focus();

      Utils.showToast(`Продукт "${product.name}" добавлен`, 'success');

    } catch (error) {
      console.error('Ошибка при добавлении продукта:', error);
      Utils.showToast('Ошибка при добавлении продукта', 'error');
    } finally {
      this.setLoading(false, addButton);
    }
  }

  loadProducts() {
    let products = Storage.getProducts();
    const productsList = document.getElementById('products-list');
    const productsCount = document.getElementById('products-count');

    if (!productsList || !productsCount) return;

    if (this.currentFilter === 'favorites') {
      products = products.filter(p => p.isFavorite);
    }

    productsCount.textContent = products.length;

    if (products.length === 0) {
      const emptyMessage = this.currentFilter === 'favorites' 
        ? 'Избранные продукты не добавлены'
        : 'Продукты не добавлены';
      const emptyHint = this.currentFilter === 'favorites'
        ? 'Отметьте продукты как избранные'
        : 'Добавьте первый продукт для учета';
      
      productsList.innerHTML = this.getEmptyState('📦', emptyMessage, emptyHint);
      return;
    }

    products.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    productsList.innerHTML = '';

    products.forEach(product => {
      const productElement = this.createProductElement(product);
      productsList.appendChild(productElement);
    });
  }

  createProductElement(product) {
    const div = document.createElement('div');
    div.className = 'product-item';
    
    div.innerHTML = `
      <div class="product-info">
        <div class="product-name">
          ${product.name}
          ${product.isFavorite ? '<span class="product-favorite">⭐</span>' : ''}
        </div>
        <div class="product-price">${Utils.formatCurrency(product.price)} за шт.</div>
      </div>
      <div class="product-actions">
        <button class="edit-btn" onclick="settings.editProduct(${product.id})" title="Редактировать продукт">
          ✏️
        </button>
        <button class="delete-btn" onclick="settings.deleteProduct(${product.id})" title="Удалить продукт">
          ❌
        </button>
      </div>
    `;

    return div;
  }

  editProduct(productId) {
    const product = Storage.getProductById(productId);
    if (!product) return;

    this.editingProduct = product;

    const nameInput = document.getElementById('edit-product-name');
    const priceInput = document.getElementById('edit-product-price');
    const favoriteInput = document.getElementById('edit-is-favorite');

    if (nameInput) nameInput.value = product.name;
    if (priceInput) priceInput.value = product.price;
    if (favoriteInput) favoriteInput.checked = product.isFavorite || false;

    this.showEditModal();
  }

  showEditModal() {
    const modal = document.getElementById('edit-product-modal');
    if (modal) {
      modal.classList.add('show');
      
      const nameInput = document.getElementById('edit-product-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }
  }

  async saveEditedProduct() {
    if (!this.editingProduct) return;

    const nameInput = document.getElementById('edit-product-name');
    const priceInput = document.getElementById('edit-product-price');
    const favoriteInput = document.getElementById('edit-is-favorite');
    const saveButton = document.getElementById('save-product-btn');

    if (!nameInput || !priceInput) return;

    const name = Utils.sanitizeString(nameInput.value);
    const price = priceInput.value.trim();
    const isFavorite = favoriteInput ? favoriteInput.checked : false;

    if (!name) {
      Utils.showToast('Введите название продукта', 'error');
      nameInput.focus();
      return;
    }

    if (name.length > 50) {
      Utils.showToast('Название слишком длинное (макс. 50 символов)', 'error');
      nameInput.focus();
      nameInput.select();
      return;
    }

    if (!Utils.isValidNumber(price)) {
      Utils.showToast('Введите корректную цену', 'error');
      priceInput.focus();
      priceInput.select();
      return;
    }

    const existingProducts = Storage.getProducts();
    const isDuplicate = existingProducts.some(p => 
      p.id !== this.editingProduct.id && 
      p.name.toLowerCase() === name.toLowerCase()
    );

    if (isDuplicate) {
      Utils.showToast('Продукт с таким названием уже существует', 'warning');
      nameInput.focus();
      nameInput.select();
      return;
    }

    this.setLoading(true, saveButton);

    try {
      const updatedProduct = Storage.updateProduct(this.editingProduct.id, {
        name: name,
        price: parseFloat(price),
        isFavorite: isFavorite
      });

      if (updatedProduct) {
        this.loadProducts();

        this.closeEditModal();

        Utils.showToast(`Продукт "${updatedProduct.name}" обновлен`, 'success');
      } else {
        Utils.showToast('Ошибка при обновлении продукта', 'error');
      }

    } catch (error) {
      console.error('Ошибка при сохранении продукта:', error);
      Utils.showToast('Ошибка при сохранении изменений', 'error');
    } finally {
      this.setLoading(false, saveButton);
    }
  }

  closeEditModal() {
    const modal = document.getElementById('edit-product-modal');
    if (modal) {
      modal.classList.remove('show');
    }
    this.editingProduct = null;
  }

  deleteProduct(productId) {
    const product = Storage.getProductById(productId);
    if (!product) return;

    const records = Storage.getRecords();
    const hasRecords = records.some(r => r.productId === productId);
    
    let confirmMessage = `Удалить продукт "${product.name}"?`;
    if (hasRecords) {
      confirmMessage += '\n\nВнимание: У этого продукта есть записи в истории. Они останутся, но продукт нельзя будет выбрать для новых записей.';
    }

    if (!confirm(confirmMessage)) return;

    try {
      Storage.deleteProduct(productId);
      this.loadProducts();
      Utils.showToast(`Продукт "${product.name}" удален`, 'success');
    } catch (error) {
      console.error('Ошибка при удалении продукта:', error);
      Utils.showToast('Ошибка при удалении продукта', 'error');
    }
  }

  loadQuantityPresets() {
    const presets = Storage.getQuantityPresets();
    const container = document.getElementById('current-presets');

    if (!container) return;

    container.innerHTML = '';

    if (presets.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">Пресеты не добавлены</p>';
      return;
    }

    presets.forEach(preset => {
      const presetElement = this.createPresetElement(preset);
      container.appendChild(presetElement);
    });
  }

  createPresetElement(preset) {
    const div = document.createElement('div');
    div.className = 'preset-item';
    
    div.innerHTML = `
      <span class="preset-value">${preset}</span>
      <button class="delete-preset-btn" onclick="settings.deleteQuantityPreset(${preset})" title="Удалить пресет">
        ×
      </button>
    `;

    return div;
  }

  addPreset() {
    const input = document.getElementById('new-preset-value');
    if (!input) return;

    const value = parseFloat(input.value);

    if (!Utils.isValidNumber(input.value)) {
      Utils.showToast('Введите корректное число', 'error');
      input.focus();
      input.select();
      return;
    }

    const existingPresets = Storage.getQuantityPresets();
    if (existingPresets.includes(value)) {
      Utils.showToast('Такой пресет уже существует', 'warning');
      input.focus();
      input.select();
      return;
    }

    try {
      Storage.addQuantityPreset(value);
      this.loadQuantityPresets();
      input.value = '';
      input.focus();
      Utils.showToast(`Пресет ${value} добавлен`, 'success');
    } catch (error) {
      console.error('Ошибка при добавлении пресета:', error);
      Utils.showToast('Ошибка при добавлении пресета', 'error');
    }
  }

  deleteQuantityPreset(preset) {
    if (!confirm(`Удалить пресет ${preset}?`)) return;

    try {
      Storage.removeQuantityPreset(preset);
      this.loadQuantityPresets();
      Utils.showToast(`Пресет ${preset} удален`, 'success');
    } catch (error) {
      console.error('Ошибка при удалении пресета:', error);
      Utils.showToast('Ошибка при удалении пресета', 'error');
    }
  }

  loadSalarySettings() {
    const salarySettings = Storage.getSalarySettings();
    
    const baseSalaryInput = document.getElementById('base-salary');
    const advancePaymentInput = document.getElementById('advance-payment');
    const taxRateInput = document.getElementById('tax-rate');

    if (baseSalaryInput) baseSalaryInput.value = salarySettings.baseSalary;
    if (advancePaymentInput) advancePaymentInput.value = salarySettings.advancePayment;
    if (taxRateInput) taxRateInput.value = salarySettings.taxRate;
  }

  async saveSalarySettings() {
    const baseSalaryInput = document.getElementById('base-salary');
    const advancePaymentInput = document.getElementById('advance-payment');
    const taxRateInput = document.getElementById('tax-rate');
    const saveButton = document.getElementById('save-salary-settings-btn');

    if (!baseSalaryInput || !advancePaymentInput || !taxRateInput) return;

    const baseSalary = parseFloat(baseSalaryInput.value) || 0;
    const advancePayment = parseFloat(advancePaymentInput.value) || 0;
    const taxRate = parseFloat(taxRateInput.value) || 13;

    if (taxRate < 0 || taxRate > 100) {
      Utils.showToast('Налог должен быть от 0% до 100%', 'error');
      taxRateInput.focus();
      return;
    }

    if (advancePayment < 0) {
      Utils.showToast('Аванс не может быть отрицательным', 'error');
      advancePaymentInput.focus();
      return;
    }

    try {
      Storage.saveSalarySettings({
        baseSalary,
        advancePayment,
        taxRate
      });

      Utils.showToast('Настройки зарплаты сохранены', 'success');

      if (saveButton) {
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '✅ Сохранено';
        saveButton.disabled = true;
        
        setTimeout(() => {
          saveButton.innerHTML = originalText;
          saveButton.disabled = false;
        }, 2000);
      }

    } catch (error) {
      console.error('Ошибка сохранения настроек зарплаты:', error);
      Utils.showToast('Ошибка при сохранении настроек', 'error');
    }
  }

  exportData() {
    try {
      const data = Storage.exportData();
      const jsonString = JSON.stringify(data, null, 2);
      const fileName = `product-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      Utils.downloadFile(jsonString, fileName, 'application/json');
      Utils.showToast('Резервная копия создана', 'success');
      
    } catch (error) {
      console.error('Ошибка при экспорте:', error);
      Utils.showToast('Ошибка при экспорте данных', 'error');
    }
  }

  exportToExcel() {
    const exportManager = new ExportManager();
    exportManager.exportToExcel();
  }

  clearAllRecords() {
    const records = Storage.getRecords();
    if (records.length === 0) {
      Utils.showToast('Нет записей для удаления', 'warning');
      return;
    }

    const confirmMessage = `Удалить все записи (${records.length} шт.)?`;
    if (!confirm(confirmMessage)) return;

    try {
      Storage.clearAllRecords();
      Utils.showToast('Все записи удалены', 'success');
    } catch (error) {
      console.error('Ошибка при очистке записей:', error);
      Utils.showToast('Ошибка при удалении записей', 'error');
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
        const originalText = button.textContent;
        button.innerHTML = 'Сохранение...';
      } else {
        button.classList.remove('loading');
        button.innerHTML = button.id === 'add-product-btn' ? 'Добавить продукт' : 'Сохранить';
      }
    }
    
    this.validateProductForm();
  }
}

window.closeEditModal = function() {
  if (window.settings) {
    window.settings.closeEditModal();
  }
};

let settings;

document.addEventListener('DOMContentLoaded', () => {
  settings = new SettingsManager();
  window.settings = settings;

  if (typeof themeManager !== 'undefined') {
    const savedTheme = Storage.getSetting('theme', 'light');
    document.body.setAttribute('data-theme', savedTheme);
  }
});
