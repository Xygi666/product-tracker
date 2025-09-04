class SettingsManager {
  constructor() {
    this.isLoading = false;
    this.editingProduct = null;
    this.currentFilter = 'all';
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadProducts();
    this.loadQuantityPresets();
    this.loadSalarySettings();
    console.log('SettingsManager initialized');
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

    if (filterAll)
      filterAll.addEventListener('click', () => this.setFilter('all'));
    if (filterFav)
      filterFav.addEventListener('click', () => this.setFilter('favorites'));
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
    const saveSalaryBtn = document.getElementById('save-salary-btn');
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
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportExcel());
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearRecords());
  }

  bindEditModalEvents() {
    const saveEditBtn = document.getElementById('save-product-btn');
    const modal = document.getElementById('edit-product-modal');

    if (saveEditBtn) saveEditBtn.addEventListener('click', () => this.saveEdit());

    if (modal) modal.addEventListener('click', e => {
      if (e.target === modal) this.closeEditModal();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('show')) this.closeEditModal();
    });
  }

  // ... остальные методы: addProduct, addPreset, saveSalarySettings, loadSalarySettings и т.д.

}
window.settings = new SettingsManager();
