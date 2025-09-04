class SearchManager {
  constructor() {
    this.searchInput = null;
    this.resultsContainer = null;
    this.productSelect = null;
    this.selectedProduct = null;

    this.init();
  }

  init() {
    this.searchInput = document.getElementById('product-search');
    this.resultsContainer = document.getElementById('search-results');
    this.productSelect = document.getElementById('product-select');

    if (!this.searchInput || !this.resultsContainer || !this.productSelect) {
      console.warn('SearchManager: Элементы не найдены');
      return;
    }

    this.bindEvents();
    this.showAllProducts();
  }

  bindEvents() {
    this.searchInput.addEventListener('input', () => this.updateSearch());
    this.searchInput.addEventListener('focus', () => this.showResults());
    this.searchInput.addEventListener('blur', () => setTimeout(() => this.hideResults(), 200));
    this.resultsContainer.addEventListener('mousedown', e => e.preventDefault());
    this.searchInput.addEventListener('keydown', e => this.handleKeyDown(e));
  }

  updateSearch() {
    const query = this.searchInput.value.trim().toLowerCase();
    if (!query) {
      this.showAllProducts();
      return;
    }

    const products = Storage.getProducts().filter(p => p.name.toLowerCase().includes(query));
    this.showResultsList(products);
  }

  showAllProducts() {
    const products = Storage.getProducts();
    this.showResultsList(products);
  }

  showResultsList(products) {
    this.resultsContainer.innerHTML = '';
    if (products.length === 0) {
      this.resultsContainer.innerHTML = '<div class="search-no-results">Ничего не найдено</div>';
      return;
    }
    products.forEach(p => {
      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.textContent = (p.isFavorite ? '⭐ ' : '') + p.name;
      div.dataset.id = p.id;
      div.addEventListener('click', () => this.selectProduct(p));
      this.resultsContainer.appendChild(div);
    });
    this.showResults();
  }

  selectProduct(product) {
    this.selectedProduct = product;
    this.searchInput.value = product.name;
    this.resultsContainer.innerHTML = '';
    this.hideResults();

    const option = [...this.productSelect.options].find(opt => opt.value == product.id);
    if (option) {
      this.productSelect.value = product.id;
      this.productSelect.dispatchEvent(new Event('change'));
    }

    const qty = document.getElementById('quantity-input');
    if (qty) qty.focus();
  }

  showResults() {
    this.resultsContainer.style.display = 'block';
  }

  hideResults() {
    this.resultsContainer.style.display = 'none';
  }

  handleKeyDown(event) {
    const items = [...this.resultsContainer.querySelectorAll('.search-result-item')];
    if (!items.length) return;

    let index = items.findIndex(item => item.classList.contains('selected'));
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (index < items.length - 1) {
        if (index >= 0) items[index].classList.remove('selected');
        items[++index].classList.add('selected');
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index > 0) {
        items[index].classList.remove('selected');
        items[--index].classList.add('selected');
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (index >= 0) this.selectProduct(Storage.getProductById(parseInt(items[index].dataset.id)));
    }
  }
}

window.searchManager = new SearchManager();
