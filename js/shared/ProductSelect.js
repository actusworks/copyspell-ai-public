import TOOLS            	from "./tools.js";
import _log	 				from "./Log.js";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}



// Load the CSS file
TOOLS.loadCSS(`product-select.css?v=${DATA.version}`);



// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: PRODUCT SELECT COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * ProductSelect - A searchable product selector with multi-select capability
 * 
 * Features:
 * - Search products by title or SKU
 * - Multi-select products
 * - Display selected products as chips
 * - Returns array of selected product IDs
 * 
 * @example
 * const productSelect = new ProductSelect({
 *     container: document.getElementById('my-container'),
 *     placeholder: 'Search products...',
 *     multiple: true,
 *     onChange: (selectedIds) => {
 *         console.log('Selected product IDs:', selectedIds);
 *     }
 * });
 */

export default class ProductSelect {
    
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.label = options.label || ''; // Optional label text
        this.placeholder = options.placeholder || 'search products by title or SKU...';
        this.multiple = options.multiple !== undefined ? options.multiple : true;
        this.onChange = options.onChange || (() => {});
        this.minSearchLength = options.minSearchLength || 2;
        this.debounceDelay = options.debounceDelay || 300;
        this.initialIds = options.initialIds || []; // Array of product IDs to pre-select
        
        this.selectedProducts = []; // Array of {id, title, sku}
        this.searchResults = [];
        this.searchTimeout = null;
        this.isLoading = false;
        
        this.init();
    }
    
    
    
    // MARK: Initialize
    // ────────────────────────────────────
    init() {
        this.render();
        this.attachEvents();
        
        // Load initial products if provided
        if (this.initialIds && this.initialIds.length > 0) {
            this.setSelectedIds(this.initialIds);
        }
    }
    
    
    
    // MARK: Render
    // ────────────────────────────────────
    render() {
        const html = `
            <div class="aai-product-select">
				${this.multiple ? '<div class="aai-product-select-chips"></div>' : ''}
                <div class="aai-product-select-input-wrapper">
                    <input 
                        type="text" 
                        class="aai-product-select-input" 
                        placeholder="${this.placeholder}"
                        autocomplete="off"
                    />
                    <div class="aai-product-select-loader"></div>
                </div>
                <div class="aai-product-select-dropdown">
                    <div class="aai-product-select-options"></div>
                </div>
                ${this.label ? `<label class="aai-product-select-label">${this.escapeHtml(this.label)}</label>` : ''}
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Store references
        this.wrapper = this.container.querySelector('.aai-product-select');
        this.input = this.container.querySelector('.aai-product-select-input');
        this.loader = this.container.querySelector('.aai-product-select-loader');
        this.dropdown = this.container.querySelector('.aai-product-select-dropdown');
        this.optionsContainer = this.container.querySelector('.aai-product-select-options');
        this.chipsContainer = this.container.querySelector('.aai-product-select-chips');
    }
    
    
    
    // MARK: Attach Events
    // ────────────────────────────────────
    attachEvents() {
        // Input events
        this.input.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        this.input.addEventListener('focus', () => {
            if (this.searchResults.length > 0) {
                this.showDropdown();
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.hideDropdown();
            }
        });
        
        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }
    
    
    
    // MARK: Handle Search
    // ────────────────────────────────────
    handleSearch(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Hide dropdown if query is too short
        if (query.length < this.minSearchLength) {
            this.hideDropdown();
            return;
        }
        
        // Debounce search
        this.searchTimeout = setTimeout(async () => {
            await this.searchProducts(query);
        }, this.debounceDelay);
    }
    
    
    
    // MARK: Search Products
    // ────────────────────────────────────
    async searchProducts(query) {
        this.showLoader();
        
        try {
            // Make AJAX request to WordPress REST API
            const response = await wp.apiFetch({
                path: `/wc/v3/products?search=${encodeURIComponent(query)}&per_page=20`
            });
            
            // Also search by SKU if not found in title
            let skuResults = [];
            try {
                skuResults = await wp.apiFetch({
                    path: `/wc/v3/products?sku=${encodeURIComponent(query)}&per_page=20`
                });
            } catch (e) {
                // SKU search might fail, that's okay
            }
            
            // Combine and deduplicate results
            const combined = [...response, ...skuResults];
            const uniqueMap = new Map();
            combined.forEach(product => {
                uniqueMap.set(product.id, product);
            });
            
            this.searchResults = Array.from(uniqueMap.values()).map(product => ({
                id: product.id,
                title: this.decodeHtmlEntities(product.name),
                sku: product.sku || ''
            }));
            
            this.renderResults();
            this.showDropdown();
            
        } catch (error) {
            _log('❌ Error searching products:', error);
            this.optionsContainer.innerHTML = `
                <div class="aai-product-select-no-results">
                    Error searching products. Please try again.
                </div>
            `;
            this.showDropdown();
        } finally {
            this.hideLoader();
        }
    }
    
    
    
    // MARK: Render Results
    // ────────────────────────────────────
    renderResults() {
        if (this.searchResults.length === 0) {
            this.optionsContainer.innerHTML = `
                <div class="aai-product-select-no-results">
                    No products found
                </div>
            `;
            return;
        }
        
        const html = this.searchResults.map(product => {
            const isSelected = this.selectedProducts.some(p => p.id === product.id);
            return `
                <div class="aai-product-select-option ${isSelected ? 'selected' : ''}" data-id="${product.id}">
                    <div class="aai-product-select-option-id">#${product.id}</div>
                    <div class="aai-product-select-option-title">${this.escapeHtml(product.title)}</div>
                    ${product.sku ? `<div class="aai-product-select-option-sku">${this.escapeHtml(product.sku)}</div>` : '<div class="aai-product-select-option-sku"></div>'}
                </div>
            `;
        }).join('');
        
        this.optionsContainer.innerHTML = html;
        
        // Attach click events to options
        this.optionsContainer.querySelectorAll('.aai-product-select-option').forEach(option => {
            option.addEventListener('click', () => {
                const productId = parseInt(option.dataset.id);
                this.toggleProduct(productId);
            });
        });
    }
    
    
    
    // MARK: Toggle Product
    // ────────────────────────────────────
    toggleProduct(productId) {
        const index = this.selectedProducts.findIndex(p => p.id === productId);
        
        if (index >= 0) {
            // Remove product
            this.selectedProducts.splice(index, 1);
        } else {
            // Add product - find it in search results
            const product = this.searchResults.find(p => p.id === productId);
            if (!product) return;
            
            if (this.multiple) {
                this.selectedProducts.push(product);
            } else {
                this.selectedProducts = [product];
                this.hideDropdown();
                this.input.value = product.title;
            }
        }
        
        this.renderResults();
        this.renderChips();
        this.notifyChange();
    }
    
    
    
    // MARK: Render Chips
    // ────────────────────────────────────
    renderChips() {
        if (!this.multiple || !this.chipsContainer) return;
        
        if (this.selectedProducts.length === 0) {
            this.chipsContainer.innerHTML = '';
            return;
        }
        
        const html = this.selectedProducts.map(product => `
            <div class="aai-product-select-chip" data-id="${product.id}">
                <span class="aai-product-select-chip-text">
                    #${product.id} - ${this.escapeHtml(product.title)}
                </span>
                <button class="aai-product-select-chip-remove" type="button">×</button>
            </div>
        `).join('');
        
        this.chipsContainer.innerHTML = html;
        
        // Attach remove events
        this.chipsContainer.querySelectorAll('.aai-product-select-chip-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chip = btn.closest('.aai-product-select-chip');
                const productId = parseInt(chip.dataset.id);
                this.toggleProduct(productId);
            });
        });
    }
    
    
    
    // MARK: Show/Hide Dropdown
    // ────────────────────────────────────
    showDropdown() {
        this.dropdown.classList.add('show');
    }
    
    hideDropdown() {
        this.dropdown.classList.remove('show');
    }
    
    
    
    // MARK: Show/Hide Loader
    // ────────────────────────────────────
    showLoader() {
        this.isLoading = true;
        this.loader.style.display = 'block';
    }
    
    hideLoader() {
        this.isLoading = false;
        this.loader.style.display = 'none';
    }
    
    
    
    // MARK: Notify Change
    // ────────────────────────────────────
    notifyChange() {
        const selectedIds = this.selectedProducts.map(p => p.id);
        this.onChange(selectedIds);
    }
    
    
    
    // MARK: Keyboard Navigation
    // ────────────────────────────────────
    handleKeyboard(e) {
        const options = this.optionsContainer.querySelectorAll('.aai-product-select-option');
        if (options.length === 0) return;
        
        let currentIndex = -1;
        options.forEach((opt, idx) => {
            if (opt.classList.contains('focused')) {
                currentIndex = idx;
            }
        });
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < options.length - 1) {
                    options.forEach(opt => opt.classList.remove('focused'));
                    options[currentIndex + 1].classList.add('focused');
                    options[currentIndex + 1].scrollIntoView({ block: 'nearest' });
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    options.forEach(opt => opt.classList.remove('focused'));
                    options[currentIndex - 1].classList.add('focused');
                    options[currentIndex - 1].scrollIntoView({ block: 'nearest' });
                }
                break;
                
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0) {
                    const productId = parseInt(options[currentIndex].dataset.id);
                    this.toggleProduct(productId);
                }
                break;
                
            case 'Escape':
                this.hideDropdown();
                break;
        }
    }
    
    
    
    // MARK: Get Selected IDs
    // ────────────────────────────────────
    getSelectedIds() {
        return this.selectedProducts.map(p => p.id);
    }
    
    
    
    // MARK: Set Selected IDs
    // ────────────────────────────────────
    async setSelectedIds(ids) {
        if (!Array.isArray(ids)) return;
        
        this.selectedProducts = [];
        
        // Fetch product details for each ID
        for (const id of ids) {
            if ( !id ) continue;
            try {
                const product = await wp.apiFetch({
                    path: `/wc/v3/products/${id}`
                });
                
                this.selectedProducts.push({
                    id: product.id,
                    title: this.decodeHtmlEntities(product.name),
                    sku: product.sku || ''
                });
            } catch (error) {
                _log(`❌ Error fetching product ${id}:`, error);
            }
        }
        
        this.renderChips();
        this.notifyChange();
    }
    
    
    
    // MARK: Clear Selection
    // ────────────────────────────────────
    clear() {
        this.selectedProducts = [];
        this.input.value = '';
        this.renderChips();
        this.notifyChange();
    }
    
    
    
    // MARK: Escape HTML
    // ────────────────────────────────────
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    
    
    // MARK: Decode HTML Entities
    // ────────────────────────────────────
    decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }
    
    
    
    // MARK: Destroy
    // ────────────────────────────────────
    destroy() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        this.container.innerHTML = '';
    }
}
