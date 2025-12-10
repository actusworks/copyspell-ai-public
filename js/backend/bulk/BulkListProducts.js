import SVG 					from '../../shared/svg.js';
import log 					from '../../shared/Log.js';
import AISettings           from "../../shared/AI/ai-settings.js";
import BulkGenerate 		from './BulkGenerate.js';
import { productQuery } 	from './bulk-helpers.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;








// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: BULK LIST PRODUCTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class BulkListProducts {


	// ────────────────────────────────────
	constructor(query, ids) {

		this.$admin = document.querySelector('.copyspell-ai-tab-content');
		this.$container = null
		this.$bulkStatus = null
		this.query = query || {}
		this.products = []
		this.allIds = [...ids] || []
		this.ids = [...ids] || []
		this.totalPages = 0;
		this.currentPage = 1;
		this.count = 0;

		this.init();

	}




	// MARK: Init
	// ────────────────────────────────────
	async init() {


		// Clear admin
		this.$admin.innerHTML = '';


		// Status UI
		this.statusUI();

		// Admin elements
		this.$container = document.createElement('div');
		this.$container.className = 'aai-bulk-products-list';
		this.$admin.appendChild(this.$container);
		this.$container.innerHTML = `
			<div class="aai-initial-loader">
				<div class="aai-loader-container">
					${SVG.loader7}
					<p>Loading products...</p>
				</div>
			</div>
		`;


		// Pagination state
		this.currentPage = 1;
		this.itemsPerPage = 10;
		this.totalItems = 0;



		// Initial fetch with pagination
		await this.fetchProducts(this.query, this.currentPage, this.itemsPerPage);
		
		this.allIds = this.products.map(p => p.id);
		this.ids = [...this.allIds];

		this.setCount();
		this.render();

		this.events();



	}



	// MARK: Generate AI Content
	// ────────────────────────────────────
	async generateAIContent() {

		//let aiSettings = this.AISettings.getFormData();
		let aiSettings = await AISettings.get('bulk-content');
		log('AI SETTINGS', aiSettings);

		// Create new BulkGenerate job
		let gen = new BulkGenerate()
		await gen.newJob(this.query, this.ids, aiSettings)

	}







	// MARK: Events
	// ────────────────────────────────────
	events() {

		this.$admin.addEventListener('click', (e) => {
			// Settings button
			if (e.target.classList.contains('aai-settings-btn')) {
				AISettings.run('bulk-content');
			}
			// Select All Products button
			if (e.target.classList.contains('aai-select-all-btn')) {
				this.ids = [...this.allIds];
				this.setCount();
				this.render();
			}
			// Deselect All Products button
			if (e.target.classList.contains('aai-deselect-all-btn')) {
				this.ids = [];
				this.setCount();
				this.render();
			}

			// Pagination
			if (e.target.classList.contains('aai-pagination-btn') && !e.target.disabled) {
				const page = parseInt(e.target.dataset.page);
				if (page && page !== this.currentPage) {
					this.handlePagination(page);
				}
			}

			// Preview product content
			if (e.target.closest('.aai-product-content')) {
				const $item = e.target.closest('.aai-product-item');
				const productId = $item.dataset.id;
				const product = this.products.find(p => p.id == productId);

				if (product && product.content) {
					this.showContentModal(product);
				}
			}
			if (e.target.closest('.aai-product-settings')) {

				AISettings.run('product-content');

			}
		});

		// Individual product checkbox & Select All Checkbox
		this.$container.addEventListener('change', (e) => {
			// Individual product
			if (e.target.classList.contains('aai-product-select')) {
				const productId = parseInt(e.target.dataset.id);
				const isChecked = e.target.checked;

				if (!isChecked) {
					const index = this.ids.indexOf(productId);
					if (index > -1) this.ids.splice(index, 1);
				} else {
					if (!this.ids.includes(productId)) this.ids.push(productId);
				}
				this.setCount();
			}

			// Select All Checkbox
			if (e.target.classList.contains('aai-product-select-all')) {
				const isChecked = e.target.checked;
				const checkboxes = this.$container.querySelectorAll('.aai-product-select');

				checkboxes.forEach(checkbox => {
					const productId = parseInt(checkbox.dataset.id);
					checkbox.checked = isChecked;

					if (!isChecked) {
						const index = this.ids.indexOf(productId);
						if (index > -1) this.ids.splice(index, 1);
					} else {
						if (!this.ids.includes(productId)) this.ids.push(productId);
					}
				});
				this.setCount();
			}
		});



	}




	// MARK: Render
	// ────────────────────────────────────
	render() {

		if (this.fetching) {
			this.$container.innerHTML = `
				<div class="aai-initial-loader">
					<div class="aai-loader-container">
						${SVG.loader7}
						<p>Loading products...</p>
					</div>
				</div>
			`;
			if (!this._renderInterval) {
				this._renderInterval = setInterval(() => {
					if (!this.fetching) {
						clearInterval(this._renderInterval);
						this._renderInterval = null;
						this.render();
					}
				}, 100);
			}
			return
		}

		if (!this.products.length) {
			this.$container.innerHTML = `<div class="aai-no-records">${__('No products found', 'copyspell-ai')}</div>`;
			return;
		}

		// Render products list
		let html = '';

		// Select All button above header
		html += `
			<div class="aai-select-all-container">
				<button class="aai-btn aai-btn-secondary aai-select-all-btn">${__('Select All', 'copyspell-ai')}</button>
				<button class="aai-btn aai-btn-secondary aai-deselect-all-btn">${__('Deselect All', 'copyspell-ai')}</button>
				<div class="actus-flex-1"></div>
				<button class="aai-btn aai-btn-secondary aai-settings-btn">${__('AI Settings', 'copyspell-ai')}</button>
			</div>
			<div class="aai-products-grid">
		`;

		// Header row
		html += `
			<div class="aai-product-header">
				<div class="aai-product-checkbox"><input type="checkbox" class="aai-product-select-all" checked></div>
				<div class="aai-product-image-h">${__('Image', 'copyspell-ai')}</div>
				<div class="aai-product-sku">${__('SKU', 'copyspell-ai')}</div>
				<div class="aai-product-type">${__('Type', 'copyspell-ai')}</div>
				<div class="aai-product-title">${__('Title', 'copyspell-ai')}</div>
				<div class="aai-product-content">${__('Content', 'copyspell-ai')}</div>
				<div class="aai-product-price">${__('Price', 'copyspell-ai')}</div>
				<div class="aai-product-url">${__('Actions', 'copyspell-ai')}</div>
			</div>
		`;

		this.products.forEach(product => {
			const isExcluded = !this.ids.includes(product.id);
			const checkedAttr = isExcluded ? '' : 'checked';
			html += `
				<div class="aai-product-item" data-id="${product.id}">
					<div class="aai-product-checkbox"><input type="checkbox" class="aai-product-select" data-id="${product.id}" ${checkedAttr}></div>
					<div class="aai-product-image"><img src="${product.image_url || DATA.placeholder}" alt="${product.title}"></div>
					<div class="aai-product-sku">${product.sku || ''}</div>
					<div class="aai-product-type">${product.type || ''}</div>
					<div class="aai-product-title">${product.title || ''}</div>
					<div class="aai-product-content">${product.content || ''}</div>
					<div class="aai-product-price">${product.sale_price ? `<span class="aai-price-sale">${parseFloat(product.sale_price || 0).toFixed(2)}</span> <span class="aai-price-regular"><s>${parseFloat(product.regular_price || 0).toFixed(2)}</s></span>` : `${parseFloat(product.regular_price || 0).toFixed(2)}`}</div>
					<div class="aai-product-url"><button class="aai-product-settings aai-btn aai-btn-secondary">${SVG.gear}</button></div>
				</div>
			`;
			//<div class="aai-product-categories">${(product.categories || []).map(cat => cat.name).join(', ')}</div>
		});
		html += '</div>';

		// Add pagination
		html += this.pagination();

		this.$container.innerHTML = html;




	}










	// MARK: Status UI
	// ────────────────────────────────────
	statusUI() {
		let html = `
			<h4>Selected products: <span class="aai-count">0</span></h4>
			<div class="aai-bulk-pagination"></div>
			<button class="aai-btn aai-btn-primary aai-button-generate">${__('Start Bulk Generation', 'copyspell-ai')}</button>
		`

		this.$status = document.createElement('div');
		this.$status.classList.add('aai-bulk-status');
		this.$status.innerHTML = html;
		this.$status.setAttribute('count', '0');
		this.$admin.appendChild(this.$status);
		this.$count = this.$status.querySelector('.aai-count');
		this.$pagination = this.$status.querySelector('.aai-bulk-pagination');



		let $button = this.$status.querySelector('.aai-button-generate');
		$button.addEventListener('click', this.generateAIContent.bind(this));



	}




	// MARK: Show Loader
	// ────────────────────────────────────
	async showLoader() {

		// Fade in products
		this.$grid = this.$container.querySelector('.aai-products-grid');
		const items = this.$container.querySelectorAll('.aai-products-grid > *');
		items.forEach(item => item.style.opacity = '0.3');

		// Show overlay with loader
		if (!this.$loaderOverlay) {
			this.$loaderOverlay = document.createElement('div');
			this.$loaderOverlay.className = 'aai-loader-overlay';
			this.$loaderOverlay.innerHTML = `
				<div class="aai-loader-container">
					${SVG.loader7}
					<p>Loading products...</p>
				</div>
			`;
		}
		this.$container.style.position = 'relative';
		this.$grid.appendChild(this.$loaderOverlay);
		// Small delay to show animation
		await new Promise(resolve => setTimeout(resolve, 100));
	}




	// MARK: Hide Loader
	// ────────────────────────────────────
	hideLoader() {
		if (this.$loaderOverlay && this.$loaderOverlay.parentNode) {
			this.$loaderOverlay.remove();
		}
		const items = this.$container.querySelectorAll('.aai-products-grid > *');
		items.forEach(item => item.style.opacity = '1');
	}





	// MARK: Handle Pagination
	// ────────────────────────────────────
	async handlePagination(page) {
		this.currentPage = page;
		// Update bulk-status
		//this.$listStatus.setAttribute('page', this.currentPage);
		//this.$listStatus.setAttribute('totalpages', totalPages);

		// Show loader and fetch
		await this.showLoader();
		await this.fetchProducts(this.query, this.currentPage, this.itemsPerPage);
		this.render();
		this.hideLoader();
		this.$container.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}




	// MARK: Pagination
	// ────────────────────────────────────
	pagination() {
		this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

		if (this.totalPages <= 1) return '';

		let html = '<div class="aai-pagination">';

		// Previous button
		const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
		html += `<button class="aai-pagination-btn aai-pagination-prev" data-page="${this.currentPage - 1}" ${prevDisabled}>${__('Previous', 'copyspell-ai')}</button>`;

		// Page numbers
		html += '<div class="aai-pagination-numbers">';

		const maxVisiblePages = 7;
		let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
		let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

		// Adjust start if we're near the end
		if (endPage - startPage < maxVisiblePages - 1) {
			startPage = Math.max(1, endPage - maxVisiblePages + 1);
		}

		// First page + ellipsis
		if (startPage > 1) {
			html += `<button class="aai-pagination-btn" data-page="1">1</button>`;
			if (startPage > 2) {
				html += '<span class="aai-pagination-ellipsis">...</span>';
			}
		}

		// Page numbers
		for (let i = startPage; i <= endPage; i++) {
			const active = i === this.currentPage ? 'active' : '';
			html += `<button class="aai-pagination-btn ${active}" data-page="${i}">${i}</button>`;
		}

		// Ellipsis + last page
		if (endPage < this.totalPages) {
			if (endPage < this.totalPages - 1) {
				html += '<span class="aai-pagination-ellipsis">...</span>';
			}
			html += `<button class="aai-pagination-btn" data-page="${this.totalPages}">${this.totalPages}</button>`;
		}

		html += '</div>';

		// Next button
		const nextDisabled = this.currentPage === this.totalPages ? 'disabled' : '';
		html += `<button class="aai-pagination-btn aai-pagination-next" data-page="${this.currentPage + 1}" ${nextDisabled}>${__('Next', 'copyspell-ai')}</button>`;

		// Page info
		html += `<div class="aai-pagination-info">${sprintf(__('Page %d of %d (%d items)', 'copyspell-ai'), this.currentPage, this.totalPages, this.totalItems)}</div>`;

		html += '</div>';

		return html;
	}



	// MARK: Preview Product
	// ────────────────────────────────────
	showContentModal(product) {
		// Create modal overlay
		const $overlay = document.createElement('div');
		$overlay.className = 'aai-modal-overlay active';

		const $modal = document.createElement('div');
		$modal.className = 'aai-modal';

		$modal.innerHTML = `
			<div class="aai-modal-header">
				<h3 class="aai-modal-title">${product.title}</h3>
				<button class="aai-modal-close">&times;</button>
			</div>
			<div class="aai-modal-body">
				${product.content}
			</div>
		`;

		$overlay.appendChild($modal);
		document.body.appendChild($overlay);

		// Close modal handlers
		const closeModal = () => {
			$overlay.classList.remove('active');
			setTimeout(() => $overlay.remove(), 300);
		};

		$overlay.querySelector('.aai-modal-close').addEventListener('click', closeModal);
		$overlay.addEventListener('click', (e) => {
			if (e.target === $overlay) closeModal();
		});
	}





	// MARK: Fetch Products
	// -----------------------------------------------------
	async fetchProducts(query, page, limit = 5) {
		query = query || this.query;
		if (!Object.keys(query).length) return;
		this.query = query;
		this.fetching = true;

		// Clear any existing timeout
		if (this.productsTimeout) {
			clearTimeout(this.productsTimeout);
			this.productsTimeout = null;
		}

		// Return a promise that resolves after the throttle delay
		return new Promise((resolve) => {
			this.productsTimeout = setTimeout(async () => {
				let response = await productQuery(query, 'full', limit, page);
				this.products = response.products || [];

				// Exclude variations from the main products list
				this.products = this.products.filter(product => product.type !== 'variation');

				// Update pagination data
				this.totalItems = response.total || 0;
				this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

				//let count = response.total + ` <span>(+${response.variations} variations)</span>`;
				this.count = response.total;
				this.setCount();
				//this.$listStatus.setAttribute('page', this.currentPage);
				//this.$listStatus.setAttribute('totalpages', totalPages);

				log('PRODUCTS', this.products);

				// Clear reference after use
				this.productsTimeout = null;
				this.fetching = false;
				resolve(this.products);
			}, 1000); // 1000ms throttle delay
		});
	}




	// MARK: Set Count
	// ────────────────────────────────────
	setCount(count) {
		count = (count || this.ids.length);
		if (count < 0) count = 0;

		this.$count.innerText = count;
		this.$status.setAttribute('count', count);
		//this.$listStatus.setAttribute('count', count);
		if (this.totalPages > 1) {
			this.$pagination.innerHTML = `
				<button class="aai-pagination-btn aai-pagination-prev aai-pagination-compact" ${this.currentPage === 1 ? "disabled" : ""} data-page="${this.currentPage - 1}">${__('Previous', 'copyspell-ai')}</button>
				<span class="aai-pagination-info">${sprintf(__('Page %d of %d', 'copyspell-ai'), this.currentPage, this.totalPages)}</span>
				<button class="aai-pagination-btn aai-pagination-next aai-pagination-compact" ${this.currentPage === this.totalPages ? "disabled" : ""} data-page="${this.currentPage + 1}">${__('Next', 'copyspell-ai')}</button>
			`;
		}

	}


}
