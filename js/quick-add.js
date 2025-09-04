class QuickAdd {
  constructor() {
    this.select = null;
    this.qty = null;
    this.amountEl = null;
    this.presetsEl = null;
    this.addBtn = null;
    this.addMoreBtn = null;
    this.init();
  }

  init() {
    this.select = document.getElementById('qa-product-select');
    this.qty = document.getElementById('qa-quantity-input');
    this.amountEl = document.getElementById('qa-amount');
    this.presetsEl = document.getElementById('qa-presets');
    this.addBtn = document.getElementById('qa-add-btn');
    this.addMoreBtn = document.getElementById('qa-add-more-btn');

    this.loadProducts();
    this.loadPresets();
    this.bindEvents();
    this.restoreFromParams();
  }

  bindEvents() {
    if (this.select) {
      this.select.addEventListener('change', () => this.updateAmount());
    }
    if (this.qty) {
      this.qty.addEventListener('input', Utils.debounce(() => this.updateAmount(), 200));
      this.qty.addEventListener('keypress', e => {
        if (e.key === 'Enter') this.addRecord();
      });
    }
    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => this.addRecord());
    }
    if (this.addMoreBtn) {
      this.addMoreBtn.addEventListener('click', () => this.resetForm());
    }
  }

  loadProducts() {
    if (!this.select) return;

    const products = Storage.getProducts();
    this.select.innerHTML = '<option value="">Выберите продукт...</option>';

    if (products.length === 0) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = 'Нет продуктов (добавьте в настройках)';
      emptyOption.disabled = true;
      this.select.appendChild(emptyOption);
      return;
    }

    const favorites = products.filter(p => p.isFavorite).sort((a,b) => a.name.localeCompare(b.name));
    const others = products.filter(p => !p.isFavorite).sort((a,b) => a.name.localeCompare(b.name));
    
    [...favorites, ...others].forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.isFavorite ? '⭐ ' : ''}${p.name} • ${Utils.formatCurrency(p.price)}`;
      opt.dataset.price = p.price;
      opt.dataset.name = p.name;
      this.select.appendChild(opt);
    });
  }

  loadPresets() {
    if (!this.presetsEl) return;

    const presets = Storage.getQuantity
