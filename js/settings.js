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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25a1.75 1.75 0 0 1 .445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064L11.189 6.25Z"/>
            <path d="M8.25 2.331a.75.75 0 0 1 .75-.75c.414 0 .814.057 1.2.166a.75.75 0 1 1-.4 1.448 4.25 4.25 0 0 0-.8-.114.75.75 0 0 1-.75-.75Z"/>
          </svg>
        </button>
        <button class="delete-btn" onclick="settings.deleteProduct(${product.id})" title="Удалить продукт">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.854 4.854a.5.5 0 0 0-.708-.708L8 8.293 3.854 4.146a.5.5 0 1 0-.708.708L7.293 9l-4.147 4.146a.5.5 0 0 0 .708.708L8 9.707l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 9l4.147-4.146z"/>
          </svg>
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

    const existingPresets = Storage.getQuant
