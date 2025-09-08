class SearchManager {
  constructor() {
    this.searchInput = null;
    this.searchResults = null;
    this.isSearchMode = false;
    this.selectedProduct = null;
    this.searchTimeout = null;
    
    this.init();
  }

  init() {
    this.searchInput = document.getElementById('product-search');
    this.searchResults = document.getElementById('search-results');

    if (!this.searchInput || !this.searchResults) {
      console.warn('SearchManager: не найдены необходимые элементы');
      return;
    }

    this.bindEvents();
    console.log('SearchManager инициализирован');
  }

  bindEvents() {
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      this.handleSearch(query);
    });

    this.searchInput.addEventListener('focus', () => {
      const query = this.searchInput.value.trim();
      if (query) {
        this.showResults();
      } else {
        this.showAllProducts();
      }
    });

    this.searchInput.addEventListener('blur', (e) => {
      setTimeout(() => {
        this.hideResults();
      }, 200);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      this.handleKeyNavigation(e);
    });

    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) && !this.searchResults.contains(e.target)) {
        this.hideResults();
      }
    });
  }

  handleSearch(query) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      if (query.length === 0) {
        this.showAllProducts();
      } else {
        this.performSearch(query);
      }
    }, 300);
  }

  performSearch(query) {
    const products = Storage.searchProducts(query);
    
    if (products.length === 0) {
      this.showNoResults(query);
    } else {
      this.displayResults(products, query);
    }
    
    this.showResults();
  }

  showAllProducts() {
    const products = Storage.getProducts();
    
    if (products.length === 0) {
      this.showEmptyState();
    } else {
      const favorites = products.filter(p => p.isFavorite);
      const regular = products.filter(p => !p.isFavorite);
      const sortedProducts = [...favorites, ...regular];
      
      this.displayResults(sortedProducts);
    }
    
    this.showResults();
  }

  displayResults(products, query = '') {
    this.searchResults.innerHTML = '';
    
    products.forEach(product => {
      const resultItem = this.createResultItem(product, query);
      this.searchResults.appendChild(resultItem);
    });
  }

  createResultItem(product, query = '') {
    const div = document.createElement('div');
    div.className = 'search-result-item';
    div.dataset.productId = product.id;
    
    let productName = product.name;
    if (query) {
      const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
      productName = productName.replace(regex, '<mark>$1</mark>');
    }
    
    div.innerHTML = `
      <div class="search-result-info">
        <span class="search-result-name">${productName}</span>
        ${product.isFavorite ? '<span class="search-result-favorite">⭐</span>' : ''}
      </div>
      <span class="search-result-price">${Utils.formatCurrency(product.price)}</span>
    `;
    
    div.addEventListener('click', () => {
      this.selectProduct(product);
    });
    
    div.addEventListener('mouseenter', () => {
      this.clearSelection();
      div.classList.add('selected');
    });
    
    return div;
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  showNoResults(query) {
    this.searchResults.innerHTML = `
      <div class="search-no-results">
        <div class="search-no-results-icon">🔍</div>
        <div class="search-no-results-text">Не найдено: "${query}"</div>
        <div class="search-no-results-hint">Попробуйте изменить запрос</div>
      </div>
    `;
  }

  showEmptyState() {
    this.searchResults.innerHTML = `
      <div class="search-empty-state">
        <div class="search-empty-icon">📦</div>
        <div class="search-empty-text">Продукты не добавлены</div>
        <div class="search-empty-hint">Добавьте продукты в настройках</div>
      </div>
    `;
  }

  selectProduct(product) {
    this.selectedProduct = product;
    this.searchInput.value = product.name;
    this.hideResults();
    
    // Обновляем сумму через app
    if (window.app) {
      window.app.updateCurrentAmount();
    }
    
    const quantityInput = document.getElementById('quantity-input');
    if (quantityInput) {
      quantityInput.focus();
    }
  }

  handleKeyNavigation(e) {
    const items = this.searchResults.querySelectorAll('.search-result-item');
    const currentSelected = this.searchResults.querySelector('.search-result-item.selected');
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this.searchResults.classList.contains('show')) {
          this.showResults();
          return;
        }
        
        if (!currentSelected) {
          if (items.length > 0) {
            items[0].classList.add('selected');
          }
        } else {
          const nextIndex = Array.from(items).indexOf(currentSelected) + 1;
          if (nextIndex < items.length) {
            this.clearSelection();
            items[nextIndex].classList.add('selected');
          }
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (currentSelected) {
          const prevIndex = Array.from(items).indexOf(currentSelected) - 1;
          if (prevIndex >= 0) {
            this.clearSelection();
            items[prevIndex].classList.add('selected');
          }
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (currentSelected) {
          const productId = parseInt(currentSelected.dataset.productId);
          const product = Storage.getProductById(productId);
          if (product) {
            this.selectProduct(product);
          }
        }
        break;
        
      case 'Escape':
        this.hideResults();
        this.searchInput.blur();
        break;
    }
  }

  clearSelection() {
    const selected = this.searchResults.querySelector('.search-result-item.selected');
    if (selected) {
      selected.classList.remove('selected');
    }
  }

  showResults() {
    this.searchResults.classList.add('show');
    this.searchResults.style.display = 'block';
  }

  hideResults() {
    this.searchResults.classList.remove('show');
    this.searchResults.style.display = 'none';
    this.clearSelection();
  }

  refreshResults() {
    const query = this.searchInput.value.trim();
    if (query) {
      this.performSearch(query);
    } else if (this.searchResults.classList.contains('show')) {
      this.showAllProducts();
    }
  }

  clear() {
    this.searchInput.value = '';
    this.selectedProduct = null;
    this.hideResults();
  }

  getSelectedProduct() {
    return this.selectedProduct;
  }
}

let searchManager;

document.addEventListener('DOMContentLoaded', () => {
  searchManager = new SearchManager();
  window.searchManager = searchManager;
});
