import wpAPI 		from '../../shared/wp-api.js';
import SVG 			from '../../shared/svg.js';
import _log			from '../../shared/Log.js';
import BulkRecords 	from './BulkRecords.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;








// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: BULK MONITOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class BulkJobEdit {


	// ────────────────────────────────────
	constructor(jobId) {

		this.$admin = document.querySelector('.copyspell-ai-tab-content');
		this.$container = null
		this.$list = null
		this.jobId = jobId || null;
		this.records = null
		this.allIds = []; // All record IDs
		this.ids = []; // Selected record IDs

		// Pagination state
		this.totalPages = 0;
		this.currentPage = 1;
		this.itemsPerPage = 20;
		this.totalItems = 0;


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
		this.$container.className = 'aai-bulk-records-list';
		this.$admin.appendChild(this.$container);



		this.$container.innerHTML = `
			<div class="aai-initial-loader">
				<div class="aai-loader-container">
					${SVG.loader7}
					<p>Loading products...</p>
				</div>
			</div>
		`;

		// Initial fetch with pagination
		await this.fetchRecords();
		this.render();

		this.events();



	}










	// MARK: Fetch Records
	// ────────────────────────────────────
	async fetchRecords() {

		this.fetching = true;

		if (!this.REC) {
			this.REC = new BulkRecords();
			this.allIds = await this.REC.getRecordIdsByJob(this.jobId);
			this.allIds = this.allIds ? this.allIds.map(id => Number(id)) : [];
			this.ids = [];
			this.totalItems = this.allIds ? this.allIds.length : 0;
			this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
		}


		// Fetch paginated records from server
		this.records = await this.REC.getByJob(this.jobId, this.currentPage, this.itemsPerPage);

		this.fetching = false;

		if (!this.records) {
			this.records = [];
		}

		this.setCount();
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

		if (!this.records.length) {
			this.$container.innerHTML = '<div class="aai-no-records">No products found</div>';
			return;
		}

		//console.log('records', this.records);

		let dsbl = this.ids.length === 0 ? ' disabled' : '';

		// Render products list
		let html = '';

		// Select All button above header
		html += `
			<div class="aai-select-all-container">
				<button class="aai-btn aai-btn-secondary aai-select-all-btn">Select All</button>
				<button class="aai-btn aai-btn-secondary aai-deselect-all-btn">Deselect All</button>
				<div class="actus-flex-1"></div>
				<button class="aai-btn aai-btn-secondary aai-retry-btn"${dsbl}>Retry Failed</button>
				<button class="aai-btn aai-btn-secondary aai-regenerate-btn"${dsbl}>Regenerate Selected</button>
			</div>
			<div class="aai-products-grid aai-job-products-grid">
		`;

		// Header row
		html += `
			<div class="aai-product-header">
				<div class="aai-product-checkbox"><input type="checkbox" class="aai-product-select-all"></div>
				<div class="aai-product-sku">ID</div>
				<div class="aai-product-status">Status</div>
				<div class="aai-product-title">Title</div>
				<div class="aai-product-content">Excerpt</div>
				<div class="aai-product-url">Actions</div>
			</div>
		`;



		this.records.forEach(product => {
			product.id = Number(product.id);
			const isExcluded = !this.ids.includes(product.id);
			const checkedAttr = isExcluded ? '' : 'checked';
			let modelName = product.response?.model?.replace(/-/g, ' ') || ''
			let clss = ''
			let status = '';
			let final = [];
			if ( product.response?.errors?.length ) {
				//final = product.response.errors.filter(e => e.final);
				//if (final.length) {
					clss = ' aai-error-product';
					status += '<span class="aai-error-box">error</span>'
				//}
			}
			if (product.original?.updated) status += '<span class="aai-success-box">published</span>';
			if (product.original?.published) status += '<span class="aai-success-box">published</span>';
			html += `
				<div class="aai-product-item${clss}" data-id="${product.id}">
					<div class="aai-product-checkbox"><input type="checkbox" class="aai-product-select" data-id="${product.id}" ${checkedAttr}></div>
					<div class="aai-product-sku">${product.product_id}</div>
					<div class="aai-product-status">${status}</div>
					<div class="aai-product-title">
						<span>${product.original.title || ''}</span><br>
						${product.response.title || ''}
						<div class="aai-model-name">${modelName ? modelName : ''}</div>
						${ product.response?.errors?.length ? `<div class="aai-product-error-summary">${product.response.errors.map(e => `<div class="aai-error-message">${e.error}</div>`).join('')}</div>` : '' }
					</div>
					<div class="aai-product-content">
						${final.length ?
					`<div class="aai-product-error">${product.response.errors.map(e => !e.final ? e.error : '').join('<br>')}</div>`
					:
					`${product.response.excerpt || product.original.excerpt || ''}`
				}
					</div>
					<div class="aai-product-actions">
						${product.original.url ? `<div class="aai-product-url"><button class="aai-product-view aai-btn aai-btn-secondary"><a href="${product.original.url}" target="_blank" rel="noopener noreferrer">${SVG.link}</a></button></div>` : ''}
						<div class="aai-product-url"><button class="aai-product-refresh aai-btn aai-btn-secondary">${SVG.refresh}</button></div>
					</div>
				</div>
			`;
			//<div class="aai-product-categories">${(product.categories || []).map(cat => cat.name).join(', ')}</div>
		});
		html += '</div>';


		// Add pagination
		html += this.pagination();

		this.$container.innerHTML = html;




	}







	// MARK: Events
	// ────────────────────────────────────
	events() {

		// Select All Products button
		this.$container.addEventListener('click', (e) => {
			if (e.target.classList.contains('aai-select-all-btn')) {
				this.ids = [...this.allIds];
				this.setCount();
				this.render();
			}
			if (e.target.classList.contains('aai-deselect-all-btn')) {
				this.ids = []
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
				const recordId = $item.dataset.id;
				const record = this.records.find(p => p.id == recordId);

				if (record && record.response) {
					this.previewProduct(record);
				}
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










	// MARK: Preview Product
	// ────────────────────────────────────
	previewProduct(product) {
		_log('PREVIEW PRODUCT ==>>', product);
		// Create modal overlay
		const $overlay = document.createElement('div');
		$overlay.className = 'aai-bulk-preview-modal aai-modal-overlay active';

		const $modal = document.createElement('div');
		$modal.className = 'aai-modal';

		$modal.innerHTML = `
			<div class="aai-modal-header">
				<h3 class="aai-modal-title">Product #${product.product_id || ''}</h3>
				<button class="aai-modal-close">&times;</button>
			</div>
			<div class="aai-modal-body">
				<div class="aai-preview-product-flex">
					<div class="aai-preview-product aai-preview-original">
						<div class="aai-preview-title">${product.original.title || ''}</div>
						<div class="aai-preview-excerpt"><span>short description</span>${product.original.excerpt || ''}</div>
						<div class="aai-preview-content">${product.original.content || ''}</div>
					</div>
					<div class="aai-preview-product aai-preview-response">
						<div class="aai-preview-title">${product.response.title || ''}</div>
						<div class="aai-preview-excerpt"><span>short description</span>${product.response.excerpt || ''}</div>
						<div class="aai-preview-content">${product.response.content || ''}</div>
						${product.response.errors && product.response.errors.length ?
				`<div class="aai-preview-errors">` +
				`${product.response.errors.map(e => !e.final ? `<div class="aai-preview-error">${e.error}</div>` : '').join('')}` +
				`</div>`
				: ''}

					</div>
				</div>
			</div>
			<div class="aai-modal-footer">
				<button class="aai-btn aai-btn-secondary aai-modal-update" data-id="${product.id}">Update Product</button>
				<button class="aai-btn aai-btn-primary aai-modal-mark">Mark as Selected</button>
			</div>
		`;

		$overlay.appendChild($modal);
		document.body.appendChild($overlay);

		// Close modal handlers
		const closeModal = () => {
			$overlay.classList.remove('active');
			setTimeout(() => $overlay.remove(), 300);
		};

		$overlay.querySelector('.aai-modal-update').addEventListener('click', this.updateProduct.bind(this));
		$overlay.querySelector('.aai-modal-close').addEventListener('click', closeModal);
		$overlay.addEventListener('click', (e) => {
			if (e.target === $overlay) closeModal();
		});
	}




	// MARK: Update Selected
	// ────────────────────────────────────
	async UpdateSelected() {

		_log('UPDATE SELECTED IDS ==>>', this.ids);

		if (!this.ids.length) return;

		// Show loader
		await this.showLoader();

		const batchSize = 50;
		const totalPages = Math.ceil(this.totalItems / batchSize);
		let publishedCount = 0;

		try {
			// Iterate through all pages to find selected records
			for (let page = 1; page <= totalPages; page++) {
				// Fetch records for this page
				let records = await this.REC.getByJob(this.jobId, page, batchSize);
				if (!records || !records.length) break;

				// Filter records to find those selected
				let batchToUpdate = records.filter(r => this.ids.includes(Number(r.id)));

				if (batchToUpdate.length > 0) {

					// 1. Update Products in WooCommerce
					let productUpdates = batchToUpdate.map(record => ({
						id: record.product_id,
						name: record.response.title || record.original.title,
						description: record.response.content,
						short_description: record.response.excerpt
					}));

					await wpAPI.batchUpdateProducts(productUpdates);

					// 2. Update Records status
					let recordUpdates = batchToUpdate.map(record => {
						// Update local record object
						if (!record.original) record.original = {};
						record.original.published = true;

						return {
							id: record.id,
							original: record.original
						};
					});

					await this.REC.batchUpdate(recordUpdates);

					publishedCount += batchToUpdate.length;
				}
			}

			this.hideLoader();

			// Show success message
			alert(`Successfully published ${publishedCount} products.`);

			// Refresh view
			await this.fetchRecords();
			this.render();

		} catch (error) {
			_log('❌ error', error);
			this.hideLoader();
			alert('An error occurred while updating products.');
		}

	}


	// MARK: Update Product
	// ────────────────────────────────────
	async updateProduct(e) {

		let $container = document.querySelector('.aai-preview-original');
		$container.innerHTML = `
			<div class="aai-loader-container">
				${SVG.loader7}
				<div>Updating product...</div>
			</div>
		`


		const $item = e.target.closest('.aai-btn');
		const recordId = $item.dataset.id;
		const record = this.records.find(p => p.id == recordId);
		$item.disabled = true;

		let data = {
			id: record.product_id,
			name: record.original.title,
			description: record.response.content,
			short_description: record.response.excerpt,
		}

		let response = await wpAPI.batchUpdateProducts([data]);

		record.original.published = true;
		this.REC.update(record.id, { original: record.original });

		$container.innerHTML = `<div class="aai-loader-container">
			<div class="aai-success">Product published successfully!</div>
			<button class="aai-btn aai-btn-primary aai-modal-close">Close</button>
		</div>`;
		$container.querySelector('.aai-modal-close').addEventListener('click', () => {
			const modal = $container.closest('.aai-modal-overlay');
			if (modal) modal.remove();
		});

		_log('BATCH UPDATE RESPONSE ==>>', response);

	}











	// MARK: Pagination
	// ────────────────────────────────────
	pagination() {
		this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

		if (this.totalPages <= 1) return '';

		let html = '<div class="aai-pagination">';

		// Previous button
		const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
		html += `<button class="aai-pagination-btn aai-pagination-prev" data-page="${this.currentPage - 1}" ${prevDisabled}>Previous</button>`;

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
		html += `<button class="aai-pagination-btn aai-pagination-next" data-page="${this.currentPage + 1}" ${nextDisabled}>Next</button>`;

		// Page info
		html += `<div class="aai-pagination-info">Page ${this.currentPage} of ${this.totalPages} (${this.totalItems} items)</div>`;

		html += '</div>';

		return html;
	}





	// MARK: Status UI
	// ────────────────────────────────────
	statusUI() {
		let html = `
			<h4>Selected products: <span class="aai-count">0</span></h4>
			<div class="aai-bulk-pagination"></div>
			<button class="aai-btn aai-btn-primary aai-button-generate">Update Selected Products</button>
		`

		this.$status = document.createElement('div');
		this.$status.classList.add('aai-bulk-status');
		this.$status.innerHTML = html;
		this.$status.setAttribute('count', '0');
		this.$admin.appendChild(this.$status);
		this.$count = this.$status.querySelector('.aai-count');
		this.$pagination = this.$status.querySelector('.aai-bulk-pagination');


		let $button = this.$status.querySelector('.aai-button-generate');
		$button.addEventListener('click', this.UpdateSelected.bind(this));



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

		// Show loader and fetch
		await this.showLoader();
		await this.fetchRecords();
		this.render();
		this.hideLoader();
		this.$container.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}



	// MARK: Set Count
	// ────────────────────────────────────
	setCount(count) {
		count = count !== undefined ? count : this.ids.length;
		if (count < 0) count = 0;

		this.$count.innerText = count;
		this.$status.setAttribute('count', count);

		let $regenerateButton = document.querySelector('.aai-regenerate-btn');
		if ($regenerateButton) $regenerateButton.disabled = count === 0;


		if (this.totalPages > 1) {
			this.$pagination.innerHTML = `
				<button class="aai-pagination-btn aai-pagination-prev aai-pagination-compact" ${this.currentPage === 1 ? "disabled" : ""} data-page="${this.currentPage - 1}">Previous</button>
				<span class="aai-pagination-info">Page ${this.currentPage} of ${this.totalPages}</span>
				<button class="aai-pagination-btn aai-pagination-next aai-pagination-compact" ${this.currentPage === this.totalPages ? "disabled" : ""} data-page="${this.currentPage + 1}">Next</button>
			`;
		}
	}



}


