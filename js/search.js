/**
 * Модуль поиска продуктов
 * Обрабатывает поиск и автодополнение
 */
class SearchManager {
    constructor() {
        this.searchInput = null;
        this.searchResults = null;
        this.productSelect = null;
        this.isSearchMode = false;
        this.selectedProduct = null;
        this.searchTimeout = null;
        
        this.init();
    }

    init() {
        this.searchInput = document.getElementById('product-search');
        this.searchResults = document.getElementById('search-results');
        this.productSelect = document.getElementById('product-select');

        if (!this.searchInput || !this.searchResults || !this.productSelect) {
            console.warn('SearchManager: не найдены необходимые элементы');
            return;
        }

        this.bindEvents();
        console.log('SearchManager инициализирован');
    }

    bindEvents() {
        // Поиск при вводе
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.handleSearch(query);
        });

        // Показ результатов при фокусе
        this.searchInput.addEventListener('focus', () => {
            const query = this.searchInput.value.trim();
            if (query) {
                this.showResults();
            } else {
                this.showAllProducts();
            }
        });

        // Скрытие результатов при потере фокуса
        this.searchInput.addEventListener('blur', (e) => {
            // Задержка для обработки клика по результату
            setTimeout(() => {
                this.hideResults();
            }, 200);
        });

        // Навигация клавишами
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });

        // Клик вне области поиска
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.searchResults.contains(e.target)) {
                this.hideResults();
            }
        });
    }

    /**
     * Обработка поиска с задержкой
     * @param {string} query Поисковый запрос
     */
    handleSearch(query) {
        // Очистка предыдущего таймера
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Задержка для избежания частых запросов
        this.searchTimeout = setTimeout(() => {
            if (query.length === 0) {
                this.showAllProducts();
            } else {
                this.performSearch(query);
            }
        }, 300);
    }

    /**
     * Выполнение поиска
     * @param {string} query Поисковый запрос
     */
    performSearch(query) {
        const products = Storage.searchProducts(query);
        
        if (products.length === 0) {
            this.showNoResults(query);
        } else {
            this.displayResults(products, query);
        }
        
        this.showResults();
    }

    /**
     * Показать все продукты
     */
    showAllProducts() {
        const products = Storage.getProducts();
        
        if (products.length === 0) {
            this.showEmptyState();
        } else {
            // Сначала показываем избранные, потом остальные
            const favorites = products.filter(p => p.isFavorite);
            const regular = products.filter(p => !p.isFavorite);
            const sortedProducts = [...favorites, ...regular];
            
            this.displayResults(sortedProducts);
        }
        
        this.showResults();
    }

    /**
     * Отображение результатов поиска
     * @param {Array} products Список продуктов
     * @param {string} query Поисковый запрос для подсветки
     */
    displayResults(products, query = '') {
        this.searchResults.innerHTML = '';
        
        products.forEach(product => {
            const resultItem = this.createResultItem(product, query);
            this.searchResults.appendChild(resultItem);
        });
    }

    /**
     * Создание элемента результата поиска
     * @param {Object} product Продукт
     * @param {string} query Поисковый запрос для подсветки
     * @returns {HTMLElement} Элемент результата
     */
    createResultItem(product, query = '') {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.dataset.productId = product.id;
        
        // Подсветка найденного текста
        let productName = product.name;
        if (query) {
            const regex = new RegExp(`(${query})`, 'gi');
            productName = productName.replace(regex, '<mark>$1</mark>');
        }
        
        div.innerHTML = `
            <div class="search-result-info">
                <span class="search-result-name">${productName}</span>
                ${product.isFavorite ? '<span class="search-result-favorite">⭐</span>' : ''}
            </div>
            <span class="search-result-price">${Utils.formatCurrency(product.price)}</span>
        `;
        
        // Обработка клика
        div.addEventListener('click', () => {
            this.selectProduct(product);
        });
        
        // Обработка hover для навигации клавишами
        div.addEventListener('mouseenter', () => {
            this.clearSelection();
            div.classList.add('selected');
        });
        
        return div;
    }

    /**
     * Показать сообщение об отсутствии результатов
     * @param {string} query Поисковый запрос
     */
    showNoResults(query) {
        this.searchResults.innerHTML = `
            <div class="search-no-results">
                <div class="search-no-results-icon">🔍</div>
                <div class="search-no-results-text">Не найдено: "${query}"</div>
                <div class="search-no-results-hint">Попробуйте изменить запрос</div>
            </div>
        `;
    }

    /**
     * Показать пустое состояние
     */
    showEmptyState() {
        this.searchResults.innerHTML = `
            <div class="search-empty-state">
                <div class="search-empty-icon">📦</div>
                <div class="search-empty-text">Продукты не добавлены</div>
                <div class="search-empty-hint">Добавьте продукты в настройках</div>
            </div>
        `;
    }

    /**
     * Выбор продукта из результатов
     * @param {Object} product Выбранный продукт
     */
    selectProduct(product) {
        this.selectedProduct = product;
        this.searchInput.value = product.name;
        this.hideResults();
        
        // Обновляем скрытый select для совместимости с существующим кодом
        this.productSelect.innerHTML = `<option value="${product.id}" selected>${product.name}</option>`;
        this.productSelect.value = product.id;
        
        // Устанавливаем данные для расчета суммы
        const selectedOption = this.productSelect.options[0];
        selectedOption.dataset.price = product.price;
        selectedOption.dataset.name = product.name;
        
        // Триггерим событие изменения для обновления суммы
        this.productSelect.dispatchEvent(new Event('change'));
        
        // Фокус на поле количества
        const quantityInput = document.getElementById('quantity-input');
        if (quantityInput) {
            quantityInput.focus();
        }
    }

    /**
     * Обработка навигации клавишами
     * @param {KeyboardEvent} e Событие клавиатуры
     */
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

    /**
     * Очистить выделение в результатах
     */
    clearSelection() {
        const selected = this.searchResults.querySelector('.search-result-item.selected');
        if (selected) {
            selected.classList.remove('selected');
        }
    }

    /**
     * Показать результаты поиска
     */
    showResults() {
        this.searchResults.classList.add('show');
    }

    /**
     * Скрыть результаты поиска
     */
    hideResults() {
        this.searchResults.classList.remove('show');
        this.clearSelection();
    }

    /**
     * Обновить результаты поиска (вызывается при изменении продуктов)
     */
    refreshResults() {
        const query = this.searchInput.value.trim();
        if (query) {
            this.performSearch(query);
        } else if (this.searchResults.classList.contains('show')) {
            this.showAllProducts();
        }
    }

    /**
     * Очистить поиск
     */
    clear() {
        this.searchInput.value = '';
        this.selectedProduct = null;
        this.hideResults();
    }

    /**
     * Получить выбранный продукт
     * @returns {Object|null} Выбранный продукт
     */
    getSelectedProduct() {
        return this.selectedProduct;
    }
}

// Глобальный экземпляр
let searchManager;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    searchManager = new SearchManager();
});
