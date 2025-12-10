import SVG 					from '../../shared/svg.js';
import AISettings           from "../../shared/AI/ai-settings.js";
import ProductSelect 		from '../../shared/ProductSelect.js';
import BulkListProducts 	from './BulkListProducts.js';
import BulkMonitor 			from './BulkMonitor.js';
import {
	productQuery,
	buildCategoryTree,
	renderCategoryTree
} from './bulk-helpers.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;







// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: BULK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class Bulk {


	// ────────────────────────────────────
	constructor() {

		this.$admin = document.querySelector('.copyspell-ai-tab-content');
		this.$container = null
		this.$status = null
		this.$bulkStatus = null
		this.ids = [];
		this.count = 0;
		this.query = {
			/*
			ids			: [],
			specific	: [],
			categories	: [],
			tags		: [],
			date_from	: null,
			date_to		: null,
			*/
		}

		this.init();

	}



	// MARK: Init
	// ────────────────────────────────────
	init() {

		this.$admin.innerHTML = ''


		// Admin elements
		this.$container = document.createElement('div');
		this.$container.className = 'aai-bulk';
		this.$admin.appendChild(this.$container);


		// Title
		const $title = document.createElement('h2');
		$title.className = 'aai-bulk-title';
		$title.textContent = __('Select Products for Bulk AI Content Generation', 'copyspell-ai');
		this.$container.appendChild($title);



		// Bulk Status Component
		/*
				this.$bulkStatus = document.createElement('bulk-status');
				this.$bulkStatus.setAttribute('count', '0');
				this.$bulkStatus.onButton = this.listProducts.bind(this);
				this.$container.appendChild( this.$bulkStatus );
		*/
		// Buttons
		this.$buttons = document.createElement('div');
		this.$buttons.className = 'aai-bulk-buttons';
		$title.appendChild(this.$buttons);

		// Add Monitor button to bulk-status
		const monitorBtn = document.createElement('button');
		monitorBtn.className = 'aai-btn aai-btn-secondary';
		monitorBtn.textContent = __('Bulk Jobs', 'copyspell-ai');
		monitorBtn.onclick = () => {
			new BulkMonitor();
		};
		this.$buttons.appendChild(monitorBtn);

		// Add Settings button to bulk-status
		const settingsBtn = document.createElement('button');
		settingsBtn.className = 'aai-btn aai-btn-secondary';
		settingsBtn.textContent = __('AI Settings', 'copyspell-ai');
		settingsBtn.onclick = () => {
			AISettings.run('bulk-content');
		};
		this.$buttons.appendChild(settingsBtn);


		// Status UI
		this.statusUI()



		// Query
		this.$query = document.createElement('div');
		this.$query.className = 'aai-query';
		this.$container.appendChild(this.$query);



		this.queryFilters()
		this.queryEvents()
		this.queryRender()



	}



	// MARK: List Products
	// ────────────────────────────────────
	listProducts(data) {

		let bulkListProducts = new BulkListProducts(this.query, this.ids)
		//bulkListProducts.render()

	}


	// MARK: Status UI
	// ────────────────────────────────────
	statusUI() {
		let html = `
			<h4>${__('Selected products:', 'copyspell-ai')} <span class="aai-count">0</span></h4>
			<div class="actus-flex-1"></div>
			<button class="aai-btn aai-btn-primary aai-button-list">${__('Continue to Products List', 'copyspell-ai')}</button>
		`

		this.$status = document.createElement('div');
		this.$status.classList.add('aai-bulk-status');
		this.$status.innerHTML = html;
		this.$status.setAttribute('count', '0');
		this.$container.appendChild(this.$status);
		this.$count = this.$status.querySelector('.aai-count');

		let $button = this.$status.querySelector('.aai-button-list');
		$button.addEventListener('click', this.listProducts.bind(this));


	}




	// MARK: Query Render
	// ────────────────────────────────────
	queryRender() {

		this.$query.innerHTML = ``
		this.criteria = 0

		for (let key of Object.keys(this.query)) {

			const $row = document.createElement('div');
			$row.className = 'aai-query-row';

			const value = this.query[key];
			let displayValue = '';
			if (Array.isArray(value)) {
				displayValue = value.join(', ');
			} else {
				displayValue = value || '';
			}
			if (key === 'specific') {
				if (!value.length) {
					delete this.query.specific;
					continue;
				}
				key = __('Product IDs', 'copyspell-ai');
				$row.innerHTML = `<strong>${__('Product IDs', 'copyspell-ai')}:</strong> ${displayValue}`;
				this.$query.appendChild($row);
				this.criteria++;
				break;
			}
			if (key === 'ids') {
				if (!value.length) {
					delete this.query.ids;
					continue;
				}
				key = 'Product IDs';
				$row.innerHTML = `<strong>__('Product IDs', 'copyspell-ai'):</strong> ${displayValue}`;
				this.$query.appendChild($row);
				this.criteria++;
				break;
			}
			if (!displayValue) {
				delete this.query[key];
				continue;
			}
			this.criteria++;
			$row.innerHTML = `<strong>${__(key, 'copyspell-ai')}:</strong> ${displayValue}`;
			this.$query.appendChild($row);
		}

	}


	// MARK: Query Filters
	// ────────────────────────────────────
	queryFilters() {


		this.productsFilters();
		this.categoriesFilters();
		this.tagsFilters();
		this.brandsFilters();


	}


	// MARK: Query Events
	// ────────────────────────────────────
	queryEvents() {

		// Change Event
		this.$container.addEventListener('change', (e) => {
			let $el, name, val, event;

			// Input & Select
			// ────────────────────────
			if (e.target.classList.contains('aai-input, .aai-select')) {
				$el = e.target.closest('.aai-input, .aai-select');
				if ($el) {
					name = $el.name;
					val = $el.value;
				}
			}

			if (!name) return;
			this.filterChanged(name, val, $el)

		})



		// Click Event
		this.$container.addEventListener('click', (e) => {
			let $el, name, val, $element;

			// Caret
			// ────────────────────────
			$el = e.target.closest('.aai-caret');
			if ($el) {
				e.preventDefault();
				e.stopPropagation();
				$el.closest('li').classList.toggle('is-closed');
			}
			$el = e.target.closest('.aai-tag');
			if ($el) $el.classList.toggle('aai-selected');


			// Tag Click
			// ────────────────────────
			$el = e.target.closest('.aai-tags-container .aai-tag');
			if ($el) {
				val = Array.from($el.parentElement.querySelectorAll('.aai-tag.aai-selected'))
					.map(tag => decodeURIComponent(tag.getAttribute('data-slug')));
				name = 'tags';
				$element = $el;
			}


			// Brand Click
			// ────────────────────────
			$el = e.target.closest('.aai-brands-container .aai-tag');
			if ($el) {
				val = Array.from($el.parentElement.querySelectorAll('.aai-tag.aai-selected'))
					.map(tag => decodeURIComponent(tag.getAttribute('data-slug')));
				name = 'brands';
				$element = $el;
			}


			// Category Click
			// ────────────────────────
			$el = e.target.closest('.aai-category-tree label input');
			if ($el) {
				val = Array.from($el.closest('.aai-category-tree').querySelectorAll('.aai-category-checkbox:checked'))
					.map(checkbox => checkbox.value);
				name = 'categories';
				$element = $el;
			}

			// ────────────────────────
			if (!name) return;
			this.filterChanged(name, val, $element)

		})




	}









	// MARK: Get Product Count
	// -----------------------------------------------------
	async getProductCount() {

		this.$count.innerHTML = SVG.loader2;

		// Clear any existing timeout
		if (this.productCountTimeout) {
			clearTimeout(this.productCountTimeout);
			this.productCountTimeout = null;
		}


		// Return a promise that resolves after the throttle delay
		return new Promise((resolve) => {
			//this.$count.html( DATA.SVG.loader );
			//this.$preview.html(`<div class="actus-loader">${DATA.SVG.loader}</div>`);

			if (!this.criteria) {
				//this.$bulkStatus.setAttribute('count', '0');
				this.$count.innerHTML = '0';
				this.$status.setAttribute('count', '0');
				return resolve(0);
			}


			this.productCountTimeout = setTimeout(async () => {

				let query = JSON.parse(JSON.stringify(this.query));
				if (query.specific) {
					query.ids = query.ids || []
					query.ids = [...new Set([...query.ids, ...query.specific])];
					query.ids = query.ids.join(',');
					delete query.specific;
				}

				//this.$count.html( DATA.SVG.loader );
				this.ids = await productQuery(query, 'ids');
				this.count = this.ids?.length || 0;
				//this.$bulkStatus.setAttribute('count', this.count || '0');
				this.$count.innerHTML = this.count || '0';
				this.$status.setAttribute('count', this.count || '0');

				// Clear reference after use
				this.productCountTimeout = null;

				//this.$variable.html('');
				resolve(this.count);
				//await this.fetchProducts( query );
			}, 1000); // 1000ms throttle delay
		});


	}









	// MARK: Filter Changed
	// ────────────────────────────────────
	filterChanged(name, val, element) {

		this.query[name] = val;

		//log('Filter changed: ' + name, this.query, element);

		this.queryRender()
		this.getProductCount()

	}





	// MARK: Products Filters
	// ────────────────────────────────────
	productsFilters() {


		let filterHtml = `
		<div class="aai-filter aai-products-filters actus-open">
			<h3>${__('Products', 'copyspell-ai')}<span>${SVG.caret}</span></h3>
			<div class="aai-filters-body"></div>
		</div>
		`
		this.$container.insertAdjacentHTML('beforeend', filterHtml);
		let $filter = this.$container.querySelector('.aai-products-filters .aai-filters-body');


		// Product IDs
		let html = `
			<div class="aai-filter-row aai-filter-specific actus-flex">
				<label class="aai-label">${__('Specific Products', 'copyspell-ai')}</label>
				<div class="aai-product-select-container"></div>
			</div>
			<div class="aai-filter-row aai-filter-ids actus-flex">
				<label class="aai-label">${__('Product IDs', 'copyspell-ai')}</label>
				<input class="aai-input aai-small" type="text" id="ids" name="ids" value="" placeholder="${__('enter product IDs separated by commas...', 'copyspell-ai')}" />	
			</div>
			<div class="aai-note">${__('If product IDs or Specific Products are entered, all other filters will be ignored.', 'copyspell-ai')}</div>
		`
		$filter.insertAdjacentHTML('beforeend', html);



		// Product Select
		this.$productSelect = new ProductSelect({
			container: $filter.querySelector('.aai-product-select-container'),
			placeholder: __('search products...', 'copyspell-ai'),
			multiple: true,
			initialIds: [DATA.post.id],
			onChange: (selectedIds) => {
				this.filterChanged('specific', selectedIds, $filter.querySelector('.aai-product-select-container'))
				//console.log('Selected product IDs:', selectedIds);
			}
		});




		// Created Date Filter
		html = `
		<div class="aai-filter-row aai-filter-created actus-flex">
			<label class="aai-label">${__('Created', 'copyspell-ai')}</label>
			<div class="aai-form-group actus-flex">
				<label class="aai-label aai-small" for="date_from">${__('From:', 'copyspell-ai')}</label>
				<input class="aai-input aai-small" type="date" name="date_from" class="aai-on-sale-date-input" value="${this.query.date_from || ''}" />
			</div>
			<div class="aai-form-group actus-flex">
				<label class="aai-label aai-small" for="date_to">${__('To:', 'copyspell-ai')}</label>
				<input class="aai-input aai-small" type="date" name="date_to" class="aai-on-sale-date-input" value="${this.query.date_to || ''}" />
			</div>
			<button class="aai-btn aai-btn-secondary aai-clear-created-date">${__('clear', 'copyspell-ai')}</button>
		</div>
		`
		$filter.insertAdjacentHTML('beforeend', html);




	}




	// MARK: Categories Filters
	// ────────────────────────────────────
	categoriesFilters() {

		let categories = DATA.woocommerce.taxonomies.categories.terms || [];
		let tree = buildCategoryTree(categories);

		let filterHtml = `
		<div class="aai-filter aai-categories-filters actus-open">
			<h3>${__('Categories', 'copyspell-ai')}<span>${SVG.caret}</span></h3>
			<div class="aai-filters-body"></div>
		</div>
		`
		this.$container.insertAdjacentHTML('beforeend', filterHtml);
		let $filter = this.$container.querySelector('.aai-categories-filters .aai-filters-body');





		let html = `
			<div class="aai-category-tree">
				${renderCategoryTree(tree, this.query.categories)}
			</div>
		`
		$filter.insertAdjacentHTML('beforeend', html);


	}




	// MARK: Tags Filters
	// ────────────────────────────────────
	tagsFilters() {

		let tags = DATA.woocommerce.taxonomies.tags.terms || [];

		let filterHtml = `
		<div class="aai-filter aai-tags-filters actus-open">
			<h3>${__('Tags', 'copyspell-ai')}<span>${SVG.caret}</span></h3>
			<div class="aai-filters-body"></div>
		</div>
		`
		this.$container.insertAdjacentHTML('beforeend', filterHtml);
		let $filter = this.$container.querySelector('.aai-tags-filters .aai-filters-body');



		let html = `
			<div class="aai-tags-container">
				${tags.map(tag => {
			const isSelected = this.query.tags?.includes(String(tag.slug)) ? 'actus-selected' : '';
			return `<div class="aai-tag ${isSelected}" data-id="${tag.term_id}" data-slug="${tag.slug}">${tag.name}</div>`;
		}).join('')}
			</div>
		`
		$filter.insertAdjacentHTML('beforeend', html);




	}




	// MARK: Brands Filters
	// ────────────────────────────────────
	brandsFilters() {


		let tags = DATA.woocommerce.taxonomies.product_brand.terms || [];

		let filterHtml = `
		<div class="aai-filter aai-brands-filters actus-open">
			<h3>${__('Brands', 'copyspell-ai')}<span>${SVG.caret}</span></h3>
			<div class="aai-filters-body"></div>
		</div>
		`
		this.$container.insertAdjacentHTML('beforeend', filterHtml);
		let $filter = this.$container.querySelector('.aai-brands-filters .aai-filters-body');



		let html = `
			<div class="aai-brands-container">
				${tags.map(tag => {
			const isSelected = this.query.tags?.includes(String(tag.slug)) ? 'actus-selected' : '';
			return `<div class="aai-tag ${isSelected}" data-id="${tag.term_id}" data-slug="${tag.slug}">${tag.name}</div>`;
		}).join('')}
			</div>
		`
		$filter.insertAdjacentHTML('beforeend', html);




	}









}