import SVG 						from '../svg.js';
import TOOLS            		from "../tools.js";
import CopySpellCall			from './ai-call.js';
//import { getArticle }			from './ai-analysis-getPageInfo.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}
let OPT = DATA.options || {};
const { __, _x, _n, sprintf } = wp.i18n;


TOOLS.loadCSS(`source-preview.css?v=${DATA.version}`);







export default class ProductSearch  {


	// ────────────────────────────────────
	constructor( product ) {
		this.product 			= product
		this.sources 			= null
		this.userSources 		= []
		this.response 			= null
		this.searchResult 		= ''
		this.searchResults 		= []
		this.selectedSources 	= []
		this.selectedLength 	= 0
    	this.abortController 	= null
		this.count 				= 0;


	}



	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// MARK: HTML
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	HTML( value = '' ) {
		this.searchResult = value || this.searchResult;

		let HTML = `
		<section class="aai-section aai-sources">
			<h3 class="aai-section-title">
				${SVG.internet}
				<span class="aai-text">${__('Search', 'copyspell-ai')} <span class="aai-selection"></span></span>
				<span class="aai-optional">${__('optional', 'copyspell-ai')}</span>
				${SVG.caret}
			</h3>
		
			<div class="aai-groups">
				<div class="aai-search-flex">
					<button class="aai-btn aai-btn-primary aai-search-ai">${SVG.search}${__('Search the internet for', 'copyspell-ai')} <span>${this.product.title}</span></button>
					<button class="aai-btn aai-btn-secondary aai-search-result-button">${ this.searchResult ? __('View Results', 'copyspell-ai') : ''}</button>
					<button class="aai-btn aai-btn-secondary aai-search-clear" style="display: ${ this.searchResult ? 'inline-block' : 'none'}">×</button>
				</div>
			</div>
			

			
		</section>
		`
		return HTML;
	}
	





	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// MARK: Loader HTML
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	loaderHTML(alt = '') {
		return `
		<div class="aai-source-item aai-loader" alt="${alt}">
			${SVG.loader14}<br>
		</div>`
	}






	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// MARK: EVENTS
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	/** * Initializes the sources section and sets up event listeners.
	 * This function is called to handle the display of sources in the AI analysis section.
	 * It sets up an event listener on the caret icon to fetch sources when clicked.
	 */
	events() {

		this.section = document.querySelector('.aai-section.aai-sources');
		this.caret = this.section.querySelector('.aai-section-title svg:last-child');
		this.list = this.section.querySelector('.aai-sources-list');
		if ( ! this.section ) return;


		// Get Sources in first time
		this.caret.addEventListener('click', async () => {
			if ( ! this.sources ) {
//this.product.title = "Fencee Duo RF PDX10"
				this.sources = []
				//await this.search( this.product.title );
				//this.getSearchURLs();
				//this.listSources()
			}
		});


		// Search button
		this.section.querySelector('.aai-search-ai').addEventListener('click', async (e) => {
			e.preventDefault()
			this.section.querySelector('.aai-search-result-button').innerHTML = ''
			this.section.querySelector('.aai-search-clear').style.display = 'none'
			this.section.querySelector('.aai-error')?.remove();
			this.section.querySelector('.aai-search-ai').classList.add('aai-disabled');
			this.section.querySelector('.aai-search-ai .svg-search').replaceWith(TOOLS.createElementFromHTML(SVG.loader7));
			this.searchCall();
		});


		// View Results
		this.section.querySelector('.aai-search-result-button').addEventListener('click', async (e) => {
			e.preventDefault()
			this.previewContent({ product_overview: this.searchResult })
		});


		// Clear Results
		this.section.querySelector('.aai-search-clear')?.addEventListener('click', async (e) => {
			e.preventDefault()
			this.searchResult = ''
			this.section.querySelector('.aai-search-clear').style.display = 'none'
			this.section.querySelector('.aai-search-result-button').innerHTML = ''
		});


	}


	




	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// MARK: Search Call
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	async searchCall() {

		// •••••••••••••••••••••••••••••••••••••
		const response = await CopySpellCall.run({ action: 'product-search' })
		// •••••••••••••••••••••••••••••••••••••


		this.response = response;
		this.listSources()

	}



	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// MARK: Add URL
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	async addURL() {
		let URL = prompt(__('Add a URL to your own source', 'copyspell-ai'), '');
		if ( ! URL ) return;

		this.list.insertAdjacentHTML('beforeend', this.loaderHTML('custom'));
		//let source = await this.getArticle( URL );
		let source = ''
		if ( ! source ) return this.showMessage(URL +'<br>' + __('Cannot parse this URL', 'copyspell-ai'), 'error');

		
		// remove loader
		if (this.list.querySelector('.aai-loader[alt="custom"]'))
			this.list.querySelectorAll('.aai-loader[alt="custom"]').forEach(el => el.remove());


		this.userSources.push( source );
		this.displaySource( source, this.sources.length + this.userSources.length - 1 );
		//this.sources.push({ url: URL });
		//this.sources.push({ url: URL });

	
	}





		
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// MARK: List Sources
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	/**
	 * Fetches sources based on a query and displays them.
	 * @param {string} query - The search query.
	 * @param {object} self - The context object, typically the AI instance.
	 * @param {number} limit - The maximum number of sources to display.
	 * @returns {Promise<Array>} - A promise that resolves to an array of source objects.
	 */
	async listSources( limit = 4 ){
		//console.log('SOURCES -------------------------', this.sources.length);




		
console.log('--- this.response ---', this.response);

		if ( this.response.error || ! this.response.json || ! this.response.json.product_overview ) {
			
			this.section.querySelector('.aai-search-ai').classList.remove('aai-disabled');	
			this.section.querySelector('.aai-search-ai .svg-loader').replaceWith(TOOLS.createElementFromHTML(SVG.search));
			this.section.querySelector('.aai-search-ai').insertAdjacentHTML('afterend', `<div class="aai-error">${this.response.error || __('No results found.', 'copyspell-ai')}</div>`);

			return {
				status: 'error',
				error: this.response.error || __('No results found.', 'copyspell-ai')
			};
		}
		/// clear list
		//this.list.innerHTML = this.addHTML()

		this.section.querySelector('.aai-search-clear').style.display = 'inline-block'
		this.section.querySelector('.aai-search-result-button').innerHTML = __('View Results', 'copyspell-ai');
		this.previewContent( this.response.json );



		//this.sources = this.response?.json?.citations || []
		//console.log('--- SOURCES - caret - click - sources -', this.sources);
		return this.response.json;
	}



	









	

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// MARK: Preview
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	previewContent( json ){
		
		if (! json.product_overview ) {
			console.warn('No content available for preview');
			return;
		}

		this.searchResult = json.product_overview
		// Generate SEO Report HTML
		//const seoReportHTML = this.generateSEOReport(json);

		// Create modal overlay
		const modal = document.createElement('div');
		modal.className = 'source-preview-modal';
		modal.innerHTML = `
			<div class="source-preview-backdrop"></div>
			<div class="source-preview-container">
				<div class="source-preview-header">
					<div class="source-preview-title">
						<span>Search results</span>
					</div>
					<button class="source-preview-close">&times;</button>
				</div>
				<div class="source-preview-content" contenteditable="false">
					${this.searchResult}
				</div>
				<div class="source-preview-footer">
					${json.citations ? `<div class="source-preview-citations">${json.citations.map(cite => `<a href="${cite.url}" target="_blank" rel="noopener noreferrer">${cite.source}</a>`).join('')}</div>` : ''}
					<button class="aai-btn aai-btn-secondary aai-cancel">${__('Cancel', 'copyspell-ai')}</button>
					<button class="aai-btn aai-btn-primary aai-save-changes">${__('Save', 'copyspell-ai')}</button>
				</div>
			</div>
		`;
		
		// Add to document
		document.body.appendChild(modal);

		
		this.showMessage( __('You can edit the text and remove the parts that are not relevant.', 'copyspell-ai'), '', 5000 );

		
		// Add event listeners
		const closeBtn = modal.querySelector('.source-preview-close');
		const backdrop = modal.querySelector('.source-preview-backdrop');
		
		const closeModal = () => {
			modal.remove();
		};
		
		closeBtn.addEventListener('click', closeModal);
		backdrop.addEventListener('click', closeModal);
		
		// Close on Escape key
		const handleKeydown = (e) => {
			if (e.key === 'Escape') {
				closeModal();
				document.removeEventListener('keydown', handleKeydown);
			}
		};
		document.addEventListener('keydown', handleKeydown);


		// Update save button visibility
		const contentDiv = modal.querySelector('.source-preview-content');
		const saveChangesBtn = modal.querySelector('.aai-save-changes');
		const cancelBtn = modal.querySelector('.aai-cancel');
		contentDiv.addEventListener('input', () => {
			saveChangesBtn.style.display = 'inline-block';
		});

		json.product_overview = contentDiv.innerText;
		//this.searchResult = json.product_overview;
		

		// Save changes
		saveChangesBtn.addEventListener('click', (e) => {
			e.preventDefault();
			json.product_overview = contentDiv.innerText;
			this.searchResult = json.product_overview;
			closeModal();
			this.showMessage(__('Saved', 'copyspell-ai'), 'success');

			this.section.querySelector('.aai-search-ai').classList.remove('aai-disabled');
			this.section.querySelector('.aai-search-ai .svg-loader')?.replaceWith(TOOLS.createElementFromHTML(SVG.search));

		});

		// Cancel changes
		cancelBtn.addEventListener('click', (e) => {
			e.preventDefault();
			this.section.querySelector('.aai-search-ai').classList.remove('aai-disabled');
			this.section.querySelector('.aai-search-ai .svg-loader')?.replaceWith(TOOLS.createElementFromHTML(SVG.search));
			closeModal();
		});

		// Trigger modal animation
		setTimeout(() => {
			modal.classList.add('active');
		}, 10);
	}








	





	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// MARK: Show Message
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	showMessage( message, clss = '', time = 4000 ){
		const existing = document.querySelector('.aai-modal-message');
		if (existing) existing.remove();
        // Create temporary feedback message
        const feedback = document.createElement('div');
        feedback.className = 'aai-modal-message ' + clss;
        feedback.textContent = message;
       
		feedback.addEventListener('click', () => feedback.remove());
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, time);
	}







	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// MARK: Get Sources Text
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	getResult() {

		return this.searchResult || '';

	}




}






//ProductSearch.prototype.getArticle = getArticle;





























