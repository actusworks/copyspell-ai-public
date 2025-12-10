import wpAPI 				from '../wp-api.js';
import TOOLS            	from "../tools.js";
import copyspellAIPanel 	from '../../frontend/copyspell-ai-panel.js';
import promptOptions		from './ai-prompts-options.js';
import AIH					from './ai-helpers.js';
import AIHistory			from './ai-history.js';
import CopySpellCall 		from './ai-call.js';
import ProductSearch 		from './ai-search.js';
import _log	 				from "../Log.js";
import {
	headerHTML,
	historyButtonHTML,
	modelSelectionDropdown,
	keywordsHTML,
	featuresHTML,
	brandToneHTML,
	multiSelectsHTML,
	strategyHTML,
	submitButtonHTML,
	rateButtonHTML,
	loadingState,
	showError
} from './ai-settings-UI.js';
import { getProductData } 	from './ai-common.js';
import SVG from '../svg.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SDK = window.CopyspellAI || {};
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;
let OPT = DATA.options || {};

//console.log('DATA', DATA);





const defaultOptions = {
	preferedModel	: 'sequence',
	audiences		: 'general public',
	tone			: 'informative, sales-oriented',
	priorities		: 'visual formatting, SEO keywords',
	language		: 'Same as the content',
	"content-size"	: '150-300 words',
	"excerpt-size"	: '30-100 words',
	framework		: 'Benefit-driven',
}






// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: AI SETTINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class AISettings {
	

	// ────────────────────────────────────
	constructor( action, title ) {

		this.id			= DATA.post.id || null;
		this.title		= title || '';
		this.action 	= action || 'content';
		this.context    = this.action
		if ( this.action == 'settings' ) this.context = 'content';
		if ( this.action.includes('product') ) this.context = 'content';
		if ( this.action.includes('marketing') ) this.context = 'marketing';
		if ( this.action.includes('bulk') ) this.context = 'bulk';

		this.promptOptions 	 = promptOptions[ DATA.locale.substring(0, 2) || 'en' ] || promptOptions.en;
		this.promptOptionsEn = promptOptions.en;
		this.onSubmit    	 = function(){};
		this.ProductSearch 	 = null;
		if ( this.context != 'bulk' )
			this.ProductSearch = new ProductSearch( DATA.post );

	}

	// MARK: START
	// ────────────────────────────────────
	static async start( action, context='content', onSubmit ) {
        const c = new AISettings( action );
		c.onSubmit = onSubmit || function(){};
		c.context = context;
		await c.init( false );
		let result = {
			onSubmit: c.onSubmit.bind(c),
			loadingState: c.loadingState.bind(c),
			showError: c.showError.bind(c),
			getForm: c.getForm.bind(c),
			getFormData: c.getFormData.bind(c),
		}
        return result
	}


	// MARK: RUN
	// ────────────────────────────────────
	static async run( action, title='', onSubmit ) {

        const c = new AISettings( action, title );
		c.onSubmit = onSubmit || function(){};
		if ( action != 'product-content' ) c.clss = 'aai-settings-panel'
		if ( action.includes('marketing') ) c.clss = 'aai-marketing-panel'
		await c.init();

		if ( action != 'product-content' && action != 'marketing-content' ) {
			const overlay = document.createElement('div');
			overlay.className = 'aai-panel-overlay';
			c.panel.$el.parentNode.insertBefore(overlay, c.panel.$el);
		}

		let result = {
			onSubmit: c.onSubmit.bind(c),
			loadingState: c.loadingState.bind(c),
			showError: c.showError.bind(c),
			getForm: c.getForm.bind(c),
			getFormData: c.getFormData.bind(c),
		}

		//if ( action.includes('-content') ) {
		result.panel = await c.render()
		//}
        return result

	}



	// MARK: GET
	// ────────────────────────────────────
	static async get( action ) {
        const c = new AISettings( action );
		await c.init( false );
		return c.getFormData();
	}




	// MARK: Get Form
	// ────────────────────────────────────
	getForm() {
		return this.form || {};
	}




	// MARK: INIT
	// ────────────────────────────────────
	async init( render=true ) {

		// product data
		this.productData = await getProductData( this.id );
		this.saved 		 = {}
		this.productInfo = {}

		if ( this.context != 'bulk' ) {
			this.saved 		 = this.productData.meta_data?.find( meta => meta.key === 'copyspell_ai' )?.value || '{}';
			this.saved 		 = await wpAPI.getMeta( this.id, 'copyspell_ai', 'product' ) || this.saved;
			this.saved 		 = JSON.parse( this.saved ) || {};
			this.productInfo = JSON.parse(JSON.stringify(this.saved.productInfo||{}));
		}
		
		this.prefsName	 = 'copyspell-ai-' + this.context;
		this.prefs 		 = { ...defaultOptions, ...AIH.LOCAL.get(this.prefsName) };
		this.form	 	 = {
			...this.prefs || {},
			...this.saved[ this.context ] || {},
			//...this.saved.productInfo || {},
		};
		this.license 	 = null

/*
console.log('FORM  ---------', this.form)
console.log('PREFS ---------', this.prefs)
console.log('SAVED ---------', this.saved)
*/

		if ( ! render ) return;

		// create the panel
		this.panelClass = 'aai-settings'
		if ( this.action == 'marketing' ) this.panelClass = 'aai-marketing-panel'
		if ( this.action == 'settings' )  this.panelClass = 'aai-settings-panel'
		if ( this.clss ) this.panelClass = this.clss;
		this.panel = new copyspellAIPanel( this.panelClass )
		


	}




	// MARK: Render
	// ────────────────────────────────────
	async render() {


		this.license = await TOOLS.loadOption('copyspell-ai-license');
		//console.log("this.license:", this.license);
		_log("Setting action: " + this.action);


		// set the panel
		this.panel.open()
		this.panel.$el.classList.add('analysis-options');
		this.panel.$el.classList.remove('aai-suggestions');

		
		this.panel.$body.innerHTML = await this.panelHtml()

		this.multiSelectsHTML()
		
		this.setFormData();
		this.events();
		this.ProductSearch?.events();


		// Unfold the brand section by default
		const brandCaret = document.querySelector('.aai-brand-section .svg-caret');
		if (brandCaret) {
			brandCaret.dispatchEvent(new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
				view: window
			}));
		}


		this.settingsButtons()



		
		SDK.events.emit('panel-rendered', { ...this });

		return this.panel;

	}




	// MARK: Settings Buttons
	// ────────────────────────────────────
	settingsButtons() {
		if ( this.action == 'product-content' || this.action == 'marketing-content' ) return;

		let $buttons = this.panel.$footer
		$buttons.innerHTML = `
			<button class="aai-btn-big" alt="cancel">${__('Cancel', 'copyspell-ai')}</button>
			<button class="aai-btn-big" alt="keep">${__('Keep Settings', 'copyspell-ai')}</button>
		`;

		
		$buttons.style.display = 'flex';
		$buttons.querySelector('.aai-btn-big[alt="cancel"]').style.display = 'block';
		$buttons.querySelector('.aai-btn-big[alt="keep"]').style.display = 'block';




		this.panel.$el.querySelector('.aai-panel-footer button[alt="cancel"]').onclick = (e) => {
			e.preventDefault();
			this.panel.close();
		}

		this.panel.$el.querySelector('.aai-panel-footer button[alt="keep"]').onclick = async (e) => {
			e.preventDefault();
			// save settings
			const form = this.getFormData();

			this.form = JSON.parse(JSON.stringify( form ));
			this.setFormData()
			this.panel.close();
			
			if ( this.context == 'bulk' ) return;
			this.saved[ this.context ] = JSON.parse(JSON.stringify( this.form ));
			this.saved.productInfo = JSON.parse(JSON.stringify( this.productInfo ));
			await wpAPI.addProductMeta(this.id, 'copyspell_ai', this.saved)
		}



		
	}




	// MARK: Panel HTML
	// ────────────────────────────────────
	async panelHtml() {
		let HTML = ``;

		HTML += `<form class="aai-form" id="aai-settings-form">`
		if ( this.action == 'product-content' ) {
			HTML += this.headerHTML( this.title )
			HTML += await this.submitButtonHTML( null, this.license )
			HTML += '<div class="aai-settings-header-buttons">'
				HTML += this.historyButtonHTML( this.title )
				HTML += await TOOLS.renderCredits()
				HTML += '<div class="aai-flex-1"></div>'
				HTML += this.modelSelectionDropdown()
			HTML += '</div>'
		}
		HTML += this.strategyHTML()
		if ( this.action == 'product-content' ) {
			HTML += await this.submitButtonHTML()
		}
		HTML += this.rateButtonHTML()
		if ( ! this.action.includes('bulk') ) {
			HTML += this.ProductSearch?.HTML( this.productInfo.search || '' )
			HTML += this.keywordsHTML()
			HTML += this.featuresHTML()
		}
		HTML += this.brandToneHTML()
		if ( this.action == 'product-content' ) {
			HTML += await this.submitButtonHTML()
		}
		HTML += `</form>`

		return HTML;
	}




	
	// MARK: EVENTS
	// ────────────────────────────────────
	events() {


		// SUBMIT
		// ────────────────────────────────────
		this.panel.$body.addEventListener('submit', this.onSubmitHandler.bind(this))



		this.panel.$body.addEventListener('click', (e) => {


			// Retry button
			// ────────────────────────────────────
			if (e.target.matches('.aai-output .aai-submit-btn')) {
				e.preventDefault();
				e.stopPropagation();
				
				// Prevent double-clicks
				if ( e.target.disabled ) return;
				e.target.disabled = true;
				
				Promise.resolve( this.onSubmit( this.form ) ).finally(() => {
					if (e.target) e.target.disabled = false;
				});
			}


			// History button
			// ────────────────────────────────────
			if (e.target.matches('.aai-history-button')) {
				new AIHistory( this.id, this.panel.$body, this.context )
			}




		});
		// Model change on retry
		this.panel.$body.addEventListener('change', (e) => {
			if (e.target.matches('.aai-select-model')) {
				this.form._model = e.target.value;
				this.prefs._model = e.target.value;
				AIH.LOCAL.set(this.prefsName, this.prefs);
			}
		});



		// handle Keywords button click
		this.panel.$body.querySelector('.aai-keywords-button')
			?.addEventListener('click', this.getAIkeywords.bind(this));



		// handle form select  changes
		const form = this.panel.$body.querySelector('#aai-settings-form');
		if (form) {
			
			// Handle select changes
			form.querySelectorAll('select').forEach(select => {
				select.addEventListener('change', (e) => {
					this.form[e.target.name] = e.target.value;
					this.prefs[e.target.name] = e.target.value;
					AIH.LOCAL.set(this.prefsName, this.prefs);
					this.setFormData()
				});
			});

			// Handle input changes
			form.querySelectorAll('input').forEach(input => {
				input.addEventListener('input', (e) => {
					this.productInfo[e.target.name] = e.target.value;
				});
			});

			// Handle textarea changes
			form.querySelectorAll('textarea').forEach(textarea => {
				textarea.addEventListener('change', (e) => {
					//this.form[e.target.name] = e.target.value;
					if ( e.target.name == 'brand-tone' ) {
						DATA.brand_tone = e.target.value;
						OPT.generic['brand-tone'] = e.target.value;
						OPT.generic = JSON.parse(JSON.stringify( OPT.generic ));
						TOOLS.saveOptions( OPT )
					} else if ( e.target.name == 'extra-prompt' ) {
						DATA.extra_prompt = e.target.value;
					} else {
						this.productInfo[e.target.name] = e.target.value;
					}
				});
			});
		}



	
		// Handle caret clicks to unfold sections
		form.querySelectorAll('.aai-section-title').forEach(select => {
			select.addEventListener('click', (e) => {
				select.closest('.aai-section').classList.toggle('aai-unfolded');
				select.closest('.aai-section').classList.toggle('aai-folded');
				const groups = select.closest('.aai-section').querySelector('.aai-groups');
				if (groups) {
					// Animate slide up/down like jQuery's slideToggle
					const duration = 250;
					const isHidden = groups.style.display === 'none' || getComputedStyle(groups).display === 'none';
					if (isHidden) {
						groups.style.removeProperty('display');
						let display = getComputedStyle(groups).display;
						if (display === 'none') display = 'block';
						groups.style.display = display;
						const height = groups.scrollHeight + 'px';
						groups.style.height = '0px';
						groups.style.overflow = 'hidden';
						groups.offsetHeight; // force reflow
						groups.style.transition = `height ${duration}ms`;
						groups.style.height = height;
						setTimeout(() => {
							groups.style.removeProperty('height');
							groups.style.removeProperty('overflow');
							groups.style.removeProperty('transition');
						}, duration);
					} else {
						const height = groups.scrollHeight + 'px';
						groups.style.height = height;
						groups.style.overflow = 'hidden';
						groups.offsetHeight; // force reflow
						groups.style.transition = `height ${duration}ms`;
						groups.style.height = '0px';
						setTimeout(() => {
							groups.style.display = 'none';
							groups.style.removeProperty('height');
							groups.style.removeProperty('overflow');
							groups.style.removeProperty('transition');
						}, duration);
					}
				}


			});
		});
		

	}
	
	



	// MARK: On Submit
	// ────────────────────────────────────
	async onSubmitHandler(e) {
		if (
			e.target.matches('#aai-settings-form') &&
			e.submitter &&
			e.submitter.classList.contains('aai-submit-btn')
		) {
			e.preventDefault();
			e.stopPropagation();
			
			// Prevent double-clicks on submit button
			if ( e.submitter.disabled ) return;
			e.submitter.disabled = true;
			
			if ( ! await TOOLS.isAllowed('product-content') ) {
				e.submitter.disabled = false;
				return;
			}


			// collect form data
			//let mixedForm = this.getFormData() // form + form.productInfo
			this.form = this.getFormData() // form + form.productInfo
			

			// Save AI options
			if ( this.context != 'bulk' ) {
				this.saved[ this.context ] = JSON.parse(JSON.stringify( this.form ));
				this.saved.productInfo = JSON.parse(JSON.stringify( this.productInfo ));
				await wpAPI.addProductMeta(this.id, 'copyspell_ai', this.saved)
			}


			// submit
			try {
				await this.onSubmit({
					form: this.form,
					generic: OPT.generic,
					productInfo: this.productInfo
				});
			} finally {
				if (e.submitter) e.submitter.disabled = false;
			}


		}
	}





	// MARK: Get Form Data
	// ────────────────────────────────────
	getFormData() {
		const form = this.panel?.$body?.querySelector('#aai-settings-form');
		if ( form ) {
			let formData = new FormData(form);
			let entries = Object.fromEntries(formData.entries());
			this.form = {
				...this.form,
				preferedModel	: entries['sequence'] || this.form.preferedModel,
				audiences		: entries['audiences'] || this.form.audiences,
				tone			: entries['tone'] || this.form.tone,
				priorities		: entries['priorities'] || this.form.priorities,
				language		: entries['language'] || this.form.language,
				"content-size"	: entries['content-size'] || this.form['content-size'],
				"excerpt-size"	: entries['excerpt-size'] || this.form['excerpt-size'],
				framework		: entries['framework'] || this.form.framework,
			}
		}
		this.productInfo.search = this.ProductSearch?.getResult() || ''
		if ( ! this.productInfo.search ) delete this.productInfo.search


		return this.form;
		//return { ...this.form, productInfo: this.productInfo }
	}

	
	


	// MARK: Set Form Data
	// ────────────────────────────────────
	setFormData() {
		this.form = this.form || {};


		// set the form values
		for ( const key in this.form ) {
			if ( ! key ) continue
			if ( key == 'search' ) continue
			const input = this.panel.$body.querySelector(`#${key}`);

			if ( input ) {
				if ( input.type === 'checkbox' || input.type === 'radio' ) {
					input.checked = this.form[key];
				} else {
					input.value = this.form[key];
				}
			}
		}

		let contentSizeInfo = '';
		let index = this.promptOptionsEn.sizes.findIndex( size => size[0] === this.form['content-size'] );
		if ( index !== -1 ) {
			contentSizeInfo = this.promptOptions.sizes[index][2] + '<br>' +
							  this.promptOptions.sizes[index][0];
		}
		
		if ( this.panel.$body.querySelector('#content-size') )
			this.panel.$body.querySelector('#content-size').nextElementSibling.innerHTML = contentSizeInfo || '';


		let excerptSizeInfo = '';
		index = this.promptOptionsEn.excerptSizes.findIndex( size => size[0] === this.form['excerpt-size'] );
		if ( index !== -1 ) {
			excerptSizeInfo = this.promptOptions.excerptSizes[index][2] + '<br>' +
							  this.promptOptions.excerptSizes[index][0];
		}
		if ( this.panel.$body.querySelector('#excerpt-size') )
			this.panel.$body.querySelector('#excerpt-size').nextElementSibling.innerHTML = excerptSizeInfo || '';


		let frameworkInfo = '';
		index = this.promptOptionsEn.frameworks.findIndex( f => f[0] === this.form.framework );
		if ( index !== -1 ) {
			frameworkInfo = this.promptOptions.frameworks[index][1];
		}
		this.panel.$body.querySelector('#framework').nextElementSibling.innerHTML = frameworkInfo || '';
		

		
		this.panel.$body.querySelector('#brand-tone').value = DATA.brand_tone || '';

		
		if ( this.context != 'bulk' ) {
			if (Array.isArray(this.productInfo?.['primary-keywords']))
				this.panel.$body.querySelector('#primary-keywords').value = this.productInfo['primary-keywords'].join(', ');
			else
				this.panel.$body.querySelector('#primary-keywords').value = this.productInfo?.['primary-keywords'] || '';
			if (Array.isArray(this.productInfo?.['secondary-keywords']))
				this.panel.$body.querySelector('#secondary-keywords').value = this.productInfo['secondary-keywords'].join(', ');
			else
				this.panel.$body.querySelector('#secondary-keywords').value = this.productInfo?.['secondary-keywords'] || '';
			this.panel.$body.querySelector('#usp').value = this.productInfo?.usp || '';
			this.panel.$body.querySelector('#extra-info').value = this.productInfo?.['extra-info'] || '';
		}
		
		
		// console.log('--- CopySpell AI - analysis - setFormData -', this.form);


	}







	// MARK: Get AI Keywords
	// ────────────────────────────────────
	async getAIkeywords() {
		//const form = this.panel.$body.querySelector('#aai-settings-form');
		//const formData = new FormData(form);
		//this.form = Object.fromEntries(formData.entries());


		this.panel.$body.querySelector('.aai-error')?.remove();
		this.panel.$body.querySelector('.aai-keywords-button').innerHTML = SVG.loader7
		this.panel.$body.querySelector('.aai-keywords-button').classList.add('aai-disabled')


		// •••••••••••••••••••••••••••••••••••••
		const response = await CopySpellCall.run({ action: 'product-keywords' })
		// •••••••••••••••••••••••••••••••••••••

		

		this.panel.$body.querySelector('.aai-keywords-button').innerHTML = __('Get Keywords with AI', 'copyspell-ai')
		this.panel.$body.querySelector('.aai-keywords-button').classList.remove('aai-disabled')

		if ( response.error ) {
			const errorDiv = document.createElement('div');
			errorDiv.className = 'aai-error';
			errorDiv.textContent = response.error;
			const keywordsButton = this.panel.$body.querySelector('.aai-keywords-button');
			keywordsButton.parentNode.insertBefore(errorDiv, keywordsButton);
			return;
		}
		this.panel.$body.querySelector('#primary-keywords').value = response.json.primary.join(', ') || '';
		this.panel.$body.querySelector('#secondary-keywords').value = response.json.secondary.join(', ') || '';
		

		this.productInfo['primary-keywords'] = response.json.primary || '';
		this.productInfo['secondary-keywords'] = response.json.secondary || '';
		


		
	}








}







AISettings.prototype.headerHTML = headerHTML;
AISettings.prototype.historyButtonHTML = historyButtonHTML;
AISettings.prototype.modelSelectionDropdown = modelSelectionDropdown;
AISettings.prototype.keywordsHTML = keywordsHTML;
AISettings.prototype.featuresHTML = featuresHTML;
AISettings.prototype.brandToneHTML = brandToneHTML;
AISettings.prototype.multiSelectsHTML = multiSelectsHTML;
AISettings.prototype.strategyHTML = strategyHTML;
AISettings.prototype.submitButtonHTML = submitButtonHTML;
AISettings.prototype.rateButtonHTML = rateButtonHTML;
AISettings.prototype.loadingState = loadingState;
AISettings.prototype.showError = showError;








