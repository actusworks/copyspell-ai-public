import wpAPI 			from '../wp-api.js';
import SVG 				from '../svg.js';
import _log				from '../Log.js';
import AIH				from './ai-helpers.js';
import CFG 				from '../config.js';
import MarketingResult 	from './ai-marketing-result.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;








// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: AI HISTORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class AIHistory {


	// ────────────────────────────────────
	constructor( id, target, context ) {

		this.id = id || 0; // product ID
		this.$target = target || null;
		this.context = context || 'product';
		if ( this.context == 'content' ) this.context = 'product'

		this.$container = null
		this.$list = null
		this.jobId = 0;
		this.records = null
		this.allIds = []; // All record IDs
		this.ids = []; // Selected record IDs
		this._eventsAttached = false; // Flag to prevent duplicate listeners

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




		// Admin elements
		this.$container = document.createElement('div');
		this.$container.className = 'aai-product-records-list';
		this.$target.appendChild(this.$container);



		this.$container.innerHTML = `
			<div class="aai-initial-loader">
				<div class="aai-loader-container">
					${SVG.loader7}
					<p>Loading records...</p>
				</div>
			</div>
		`;


		


		// Initial fetch with pagination
		await this.fetchRecords();


		_log('HISTORY records', this.records);

		this.render();

		// Set up event delegation once (works with dynamic content)
		this.events();




	}










	// MARK: Fetch Records
	// ────────────────────────────────────
	async fetchRecords() {

		this.fetching = true;

		try {
			let result;
console.log('this.context', this.context);
			// Fetch records for this product with pagination
			if (this.context == 'product') {
				//result = await AIH.getRecords(this.id, this.jobId, this.currentPage, this.itemsPerPage);
				result = await AIH.getRecordsByContext(this.context, this.id, this.currentPage, this.itemsPerPage);
			} else {
				result = await AIH.getRecordsByContext(this.context, this.id, this.currentPage, this.itemsPerPage);
			}

			
			this.records = result.records || [];
			// Calculate total items and pages
			// Use result.total for proper pagination (total count of all matching records)
			// result.count is just the current page's record count
			this.totalItems = result.total || result.count || this.records.length;
			this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
			

			// Get all record IDs (only on first fetch)
			if (this.currentPage === 1) {
				this.allIds = this.records.map(r => Number(r.id));
			}

		} catch (error) {
			_log('❌ Failed to fetch records:', error);
			this.records = [];
		}

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

						if ( this.context == 'product' ) {
							this.renderProducts();
						} else {
							this.renderMarketing();
						}

					}
				}, 100);
			}
			return
		}


		if ( this.context == 'product' ) {
			this.renderProducts();
		} else {
			this.renderMarketing();
		}

	}




	// MARK: Render Marketing
	// ────────────────────────────────────
	renderMarketing() {

		if (!this.records.length) {
			this.$container.innerHTML = '<div class="aai-no-records">No records found</div>';
			return;
		}


		let dsbl = this.records.length === 0 ? ' disabled' : '';



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
				<div class="aai-product-date">Date</div>
				<div class="aai-product-status">Type</div>
				<div class="aai-product-medium">Medium</div>
				<div class="aai-product-content">Content</div>
				<div class="aai-product-url">Actions</div>
			</div>
		`;

		this.records.forEach(row => {
			row.id = Number(row.id);

			row.content = row.content || {}
			let modelName = row.content?.model?.replace(/-/g, ' ') || ''
			let clss = ''
			let status = '';
			let final = [];
			if ( row.content?.errors?.length ) {
				//final = row.content.errors.filter(e => e.final);
				//if (final.length) {
					clss = ' aai-error-product';
					status += '<span class="aai-error-box">error</span>'
				//}
			}
			let date = row.created
			let humanReadableDate = new Date(date).toLocaleString('el', { 
				hour12: false,
			});
			humanReadableDate = humanReadableDate.slice(0, -3);
			humanReadableDate = humanReadableDate.replace(',', '<br>');

			
			if (row.calldata?._type == 'published' )
				status += `<span class="aai-success-box">${__('published', 'copyspell-ai')}</span>`;
			else if (row.calldata?._type == 'original' )
				status += `<span class="aai-info-box">${row.calldata?._type||''}</span>`;
			else
				status += `<span class="aai-gray-box">${row.calldata?._type||''}</span>`;

			status += row.calldata?._action ? `<span class="aai-action-box">${row.calldata?._action||''}</span>` : '';

			let mediumName = row.calldata?.prefs?.mediumName || ''
			if ( mediumName ) mediumName += '<br>'
			mediumName += CFG.marketing.types?.[row.calldata?.prefs?.group]?.[row.calldata?.prefs?.type] || mediumName;


			html += `
				<div class="aai-product-item${clss}" data-id="${row.id}" data-context="${row.context || 'marketing'}">
					<div class="aai-product-checkbox"><input type="checkbox" class="aai-product-select" data-id="${row.id}"></div>
					<div class="aai-product-date">${humanReadableDate}</div>
					<div class="aai-product-status">${status}</div>
					<div class="aai-product-medium">${mediumName}</div>
					<div class="aai-product-content aai-marketing-content">
						${final.length ?
						`<div class="aai-product-error">${row.content.errors.map(e => !e.final ? e.error : '').join('<br>')}</div>`
						:
						`${row.content?.suggestions?.[0]?.substring(0, 200) || ''}...`
				}
					</div>
					<div class="aai-product-actions">
						<div class="aai-product-url"><button class="aai-record-delete aai-btn aai-btn-secondary">${SVG.trash}</button></div>
						${row.content.url ? `<div class="aai-product-url"><button class="aai-product-view aai-btn aai-btn-secondary"><a href="${row.content.url}" target="_blank" rel="noopener noreferrer">${SVG.link}</a></button></div>` : ''}
					</div>
				</div>
			`;
			//<div class="aai-product-categories">${(product.categories || []).map(cat => cat.name).join(', ')}</div>
		});
		html += '</div>';


		// Add pagination
		html += this.pagination();

		this.$container.innerHTML = html;


		this.$close = document.createElement('div');
		this.$close.className = 'aai-panel-close';
		this.$close.innerHTML = '×';
		this.$container.appendChild(this.$close);
		this.$close.addEventListener('click', () => {
			this.$container.remove();
		});



	}






	// MARK: Render Products
	// ────────────────────────────────────
	renderProducts() {

		if (!this.records.length) {
			this.$container.innerHTML = '<div class="aai-no-records">No records found</div>';
			return;
		}

		//console.log('records', this.records);

		let dsbl = this.records.length === 0 ? ' disabled' : '';

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
				<div class="aai-product-date">Date</div>
				<div class="aai-product-status">Type</div>
				<div class="aai-product-title">Title</div>
				<div class="aai-product-content">Excerpt</div>
				<div class="aai-product-url">Actions</div>
			</div>
		`;


		this.records.forEach(row => {
			row.id = Number(row.id);

			row.content = row.content || {}
			let modelName = row.content?.model?.replace(/-/g, ' ') || ''
			let clss = ''
			let status = '';
			let final = [];
			if ( row.content?.errors?.length ) {
				//final = row.content.errors.filter(e => e.final);
				//if (final.length) {
					clss = ' aai-error-product';
					status += '<span class="aai-error-box">error</span>'
				//}
			}
			let date = row.created
			let humanReadableDate = new Date(date).toLocaleString('el', { 
				hour12: false,
			});
			humanReadableDate = humanReadableDate.slice(0, -3);
			humanReadableDate = humanReadableDate.replace(',', '<br>');

			
			if (row.calldata?._type == 'published' )
				status += `<span class="aai-success-box">${__('published', 'copyspell-ai')}</span>`;
			else if (row.calldata?._type == 'original' )
				status += `<span class="aai-info-box">${row.calldata?._type||''}</span>`;
			else
				status += `<span class="aai-gray-box">${row.calldata?._type||''}</span>`;

			status += row.calldata?._action ? `<span class="aai-action-box">${row.calldata?._action||''}</span>` : '';

			html += `
				<div class="aai-product-item${clss}" data-id="${row.id}" data-context="${row.context || 'product'}" data-type="${row.calldata?._type||''}">
					<div class="aai-product-checkbox"><input type="checkbox" class="aai-product-select" data-id="${row.id}"></div>
					<div class="aai-product-date">${humanReadableDate}</div>
					<div class="aai-product-status">${status}</div>
					<div class="aai-product-title">
						${row.content.title || ''}
						<div class="aai-model-name">${modelName ? modelName : ''}</div>
						${ row.content?.errors?.length ? `<div class="aai-product-error-summary">${row.content.errors.map(e => `<div class="aai-error-message">${e.error}</div>`).join('')}</div>` : '' }
					</div>
					<div class="aai-product-content">
						${final.length ?
					`<div class="aai-product-error">${row.content.errors.map(e => !e.final ? e.error : '').join('<br>')}</div>`
					:
					`${row.content.excerpt || ''}`
				}
					</div>
					<div class="aai-product-actions">
						<div class="aai-product-url"><button class="aai-record-delete aai-btn aai-btn-secondary">${SVG.trash}</button></div>
						${row.content.url ? `<div class="aai-product-url"><button class="aai-product-view aai-btn aai-btn-secondary"><a href="${row.content.url}" target="_blank" rel="noopener noreferrer">${SVG.link}</a></button></div>` : ''}
					</div>
				</div>
			`;
			//<div class="aai-product-categories">${(product.categories || []).map(cat => cat.name).join(', ')}</div>
		});
		html += '</div>';


		// Add pagination
		html += this.pagination();

		this.$container.innerHTML = html;


		this.$close = document.createElement('div');
		this.$close.className = 'aai-panel-close';
		this.$close.innerHTML = '×';
		this.$container.appendChild(this.$close);
		this.$close.addEventListener('click', () => {
			this.$container.remove();
		});


	}







	// MARK: Events
	// ────────────────────────────────────
	events() {

		// Prevent duplicate event listeners
		if (this._eventsAttached) return;
		this._eventsAttached = true;


		this.$container.addEventListener('click', (e) => {

			// Pagination
			if (e.target.classList.contains('aai-pagination-btn') && !e.target.disabled) {
				const page = parseInt(e.target.dataset.page);
				if (page && page !== this.currentPage) {
					this.handlePagination(page);
				}
				return;
			}

			// Delete record - check before preview since delete button is inside product-item
			if (e.target.closest('.aai-record-delete')) {
				e.stopPropagation();
				const $btn = e.target.closest('.aai-record-delete');
				const $item = $btn.closest('.aai-product-item');
				const recordId = $item.dataset.id;
				this.deleteRecord(recordId, $item);
				return;
			}

			// Don't trigger preview when clicking on buttons, links, or checkboxes
			if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) {
				return;
			}

			// Preview product content
			if (e.target.closest('.aai-product-item')) {
				const $item = e.target.closest('.aai-product-item');
				const recordId = $item.dataset.id;
				const record = this.records.find(p => p.id == recordId);

				if (record && record.content) {
					// Use record.context to determine preview type
					// context='marketing' has suggestions array, context='product' has title/excerpt/content
					if (record.context === 'marketing' || record.content.suggestions) {
						this.previewMarketing(record);
					} else {
						this.previewProduct(record);
					}
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
		// Find original record - use == for type coercion (product_id may be string or number)
		const originalRecord = this.records.find(
			r => r.product_id == product.product_id && r.calldata?._type === 'original'
		);
		// originalRecord may not exist on current page (pagination), so use optional chaining
		product.original = originalRecord?.content || {};
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
					<div class="aai-preview-product aai-preview-response">
						<div class="aai-preview-title">${product.content.title || ''}</div>
						<div class="aai-preview-excerpt"><span>short description</span>${product.content.excerpt || ''}</div>
						<div class="aai-preview-content">${product.content.content || ''}</div>
						${product.content.errors && product.content.errors.length ?
				`<div class="aai-preview-errors">` +
				`${product.content.errors.map(e => !e.final ? `<div class="aai-preview-error">${e.error}</div>` : '').join('')}` +
				`</div>`
				: ''}

					</div>
				</div>
			</div>
			<div class="aai-modal-footer">
				<button class="aai-btn aai-btn-primary aai-modal-update" data-id="${product.id}">${__('Publish', 'copyspell-ai')}</button>
			</div>
		`;

		$overlay.appendChild($modal);
		document.body.appendChild($overlay);

		// Close modal handlers
		const closeModal = () => {
			$overlay.classList.remove('active');
			setTimeout(() => $overlay.remove(), 300);
		};

		$overlay.querySelector('.aai-modal-update').addEventListener('click', this.publishProduct.bind(this));
		$overlay.querySelector('.aai-modal-close').addEventListener('click', closeModal);
		$overlay.addEventListener('click', (e) => {
			if (e.target === $overlay) closeModal();
		});
	}




	// MARK: Preview Marketing
	// ────────────────────────────────────
	previewMarketing(record) {
		_log('PREVIEW MARKETING ==>>', record);

		// Get preferences from calldata
		const prefs = record.calldata?.prefs || {};
		const content = record.content || {};

		// Get medium and type info for display
		const mediumName = prefs.mediumName || '';
		const typeName = CFG.marketing.types?.[prefs.group]?.[prefs.type] || '';

		// Create modal overlay
		const $overlay = document.createElement('div');
		$overlay.className = 'aai-bulk-preview-modal aai-modal-overlay aai-marketing-modal active';

		const $modal = document.createElement('div');
		$modal.className = 'aai-modal aai-modal-large';

		$modal.innerHTML = `
			<div class="aai-modal-header">
				<h3 class="aai-modal-title">${CFG.marketing.groups?.[prefs.group] || __('Marketing Content', 'copyspell-ai')}</h3>
				<div class="aai-modal-subtitle">${mediumName}${typeName ? ' • ' + typeName : ''}</div>
				<button class="aai-modal-close">&times;</button>
			</div>
			<div class="aai-modal-body">
				<div class="aai-marketing-preview-container"></div>
			</div>
		`;

		$overlay.appendChild($modal);
		document.body.appendChild($overlay);

		// Render marketing content using the reusable renderer
		const $container = $($modal.querySelector('.aai-marketing-preview-container'));
		MarketingResult.render( content, prefs, $container );

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




	// MARK: Publish Selected
	// ────────────────────────────────────
	async PublishSelected() {

		_log('PUBLISH SELECTED IDS ==>>', this.ids);

		if (!this.ids.length) return;

		// Show loader
		await this.showLoader();

		let publishedCount = 0;

		try {
			// Get all records for selected IDs
			let selectedRecords = this.records.filter(r => this.ids.includes(Number(r.id)));

			if (selectedRecords.length > 0) {

				// 1. Update Products in WooCommerce
				let productUpdates = selectedRecords.map(record => ({
					id: record.product_id,
					name: record.content.title || record.original?.title,
					description: record.content.content,
					short_description: record.content.excerpt
				}));

				await wpAPI.batchUpdateProducts(productUpdates);

				// 2. Update Records status
				let recordUpdates = selectedRecords.map(record => {
					// Update local record object
					if (!record.original) record.original = {};
					record.original.published = true;

					return {
						id: record.id,
						calldata: record.calldata,
						content: {
							...record.content,
							published: true
						}
					};
				});

				// Update each record via AIH
				for (const update of recordUpdates) {
					// Note: You'll need to add an AIH.updateRecord method
					// await AIH.updateRecord(update.id, update);
				}

				publishedCount += selectedRecords.length;
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


	// MARK: Publish Product
	// ────────────────────────────────────
	async publishProduct(e) {

		let $container = document.querySelector('.aai-preview-response');
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
			name: record.original?.title,
			description: record.content.content,
			short_description: record.content.excerpt,
		}

		let response = await wpAPI.batchUpdateProducts([data]);

		// Update record status
		if (!record.calldata) record.calldata = {};
		record.calldata._type = 'published'
		
		await AIH.updateRecord(record.id, { 
		     calldata: { ...record.calldata, _type: 'published' }
		});

		$container.innerHTML = `<div class="aai-loader-container">
			<div class="aai-success">${__('Product published successfully!', 'copyspell-ai')}</div>
			<button class="aai-btn aai-btn-primary aai-modal-close">${__('Close', 'copyspell-ai')}</button>
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
		this.$container.appendChild(this.$status);
		this.$count = this.$status.querySelector('.aai-count');
		this.$pagination = this.$status.querySelector('.aai-bulk-pagination');


		let $button = this.$status.querySelector('.aai-button-generate');
		//$button.addEventListener('click', this.PublishSelected.bind(this));



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
					<p>Loading records...</p>
				</div>
			`;
		}
		//this.$container.style.position = 'relative';
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
		// Note: events() is NOT called here - event delegation on this.$container
		// continues to work after render() replaces innerHTML
		this.hideLoader();
		this.$container.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}



	// MARK: Set Count
	// ────────────────────────────────────
	setCount(count) {
return;
		count = count !== undefined ? count : this.records.length;
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



	// MARK: Delete Record
	// ────────────────────────────────────
	async deleteRecord(recordId, $item) {
		// Confirm deletion
		if (!confirm(__('Are you sure you want to delete this record?', 'copyspell-ai'))) {
			return;
		}

		// Visual feedback - fade the row
		$item.style.opacity = '0.5';
		$item.style.pointerEvents = 'none';

		try {
			await AIH.deleteRecord(recordId);

			// Remove from local records array
			this.records = this.records.filter(r => r.id != recordId);
			this.totalItems--;

			// Animate removal
			$item.style.transition = 'all 0.3s ease';
			$item.style.transform = 'translateX(20px)';
			$item.style.opacity = '0';

			setTimeout(() => {
				$item.remove();

				// If no more records on this page, go to previous page or refresh
				if (this.records.length === 0) {
					if (this.currentPage > 1) {
						this.handlePagination(this.currentPage - 1);
					} else {
						this.render();
					}
				} else {
					// Update pagination info
					const $paginationInfo = this.$container.querySelector('.aai-pagination-info');
					if ($paginationInfo) {
						this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
						$paginationInfo.textContent = `Page ${this.currentPage} of ${this.totalPages} (${this.totalItems} items)`;
					}
				}
			}, 300);

			_log('✓ Record deleted:', recordId);

		} catch (error) {
			_log('❌ Failed to delete record:', error);
			
			// Restore visual state
			$item.style.opacity = '1';
			$item.style.pointerEvents = '';
			
			alert(__('Failed to delete record. Please try again.', 'copyspell-ai'));
		}
	}


}


