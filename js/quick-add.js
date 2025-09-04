class QuickAdd {
  constructor() {
    this.select = document.getElementById('qa-product-select');
    this.qty = document.getElementById('qa-quantity-input');
    this.amountEl = document.getElementById('qa-amount');
    this.presetsEl = document.getElementById('qa-presets');
    this.addBtn = document.getElementById('qa-add-btn');
    this.addMoreBtn = document.getElementById('qa-add-more-btn');

    this.init();
  }

  init() {
    this.loadProducts();
    this.loadPresets();
    this.bindEvents();
  }

  loadProducts() {
    const products = Storage.getProducts();
    this.select.innerHTML = '<option value="">Выберите продукт...</option>';
    products.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = (p.isFavorite ? '⭐ ' : '') + p.name + ` • ${Utils.formatCurrency(p.price)}`;
      option.dataset.price = p.price;
      option.dataset.name = p.name;
      this.select.appendChild(option);
    });
  }

  loadPresets() {
    const presets = Storage.getQuantityPresets();
    this.presetsEl.innerHTML = '';
    presets.forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = v;
      btn.type = 'button';
      btn.addEventListener('click', () => {
        this.qty.value = v;
        this.updateAmount();
      });
      this.presetsEl.appendChild(btn);
    });
  }

  bindEvents() {
    this.select.addEventListener('change', () => this.updateAmount());
    this.qty.addEventListener('input', Utils.debounce(() => this.updateAmount(), 200));
    this.addBtn.addEventListener('click', () => this.addRecord());
    this.addMoreBtn.addEventListener('click', () => this.resetForm());
    this.qty.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.addRecord();
    });
  }

  updateAmount() {
    const opt = this.select.options[this.select.selectedIndex];
    const qty = parseFloat(this.qty.value);
    if (opt && opt.dataset.price && qty > 0)
      this.amountEl.textContent = Utils.formatCurrency(parseFloat(opt.dataset.price) * qty);
    else this.amountEl.textContent = '0 ₽';
  }

  addRecord() {
    if (!this.select.value) {
      Utils.showToast('Выберите продукт', 'error');
      this.select.focus();
      return;
    }
    if (!Utils.isValidNumber(this.qty.value)) {
      Utils.showToast('Введите корректное количество', 'error');
      this.qty.focus();
      return;
    }
    const productId = parseInt(this.select.value);
    const productName = this.select.options[this.select.selectedIndex].dataset.name;
    const price = parseFloat(this.select.options[this.select.selectedIndex].dataset.price);
    const quantity = parseFloat(this.qty.value);
    Storage.addRecord({ productId, productName, quantity, price, amount: price * quantity });
    Utils.showToast(`Добавлено: ${productName}`, 'success');
    this.addMoreBtn.style.display = 'inline-flex';
    this.addBtn.textContent = 'Готово';
    this.addBtn.onclick = () => (window.location.href = 'index.html');
  }

  resetForm() {
    this.qty.value = '';
    this.select.selectedIndex = 0;
    this.updateAmount();
    this.addMoreBtn.style.display = 'none';
    this.addBtn.textContent = 'Добавить';
    this.addBtn.onclick = () => this.addRecord();
    this.select.focus();
  }
}

document.addEventListener('DOMContentLoaded', () => new QuickAdd());
