import AISettings           from "./ai-settings.js";
import AIH 					from './ai-helpers.js';
import CopySpellCall 		from './ai-call.js';
import ResultProduct 		from './ai-result-product.js';
import _log	 				from "../Log.js";
import {
	modelSelectionDropdown,
	submitButtonHTML,
} from './ai-settings-UI.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;
let OPT = DATA.options || {};

//console.log('DATA', DATA);



const defaultPrefs = {
	preferedModel	: 'sequence',
	audiences		: ['general public'],
	tone			: ['informative', 'sales-oriented'],
	priorities		: ['visual formatting', 'SEO keywords'],
	framework		: 'Benefit-driven',
	language		: 'Same as the content',
	productInfo		: { id: DATA.post.id || null },
	"brand-tone"	: DATA.brand_tone || '',
	"content-size"	: '150-300 words',
	"excerpt-size"	: '30-100 words',
	"extra-prompt"	: DATA.extra_prompt || '',
}



// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: COPYSPELL AI Product Content
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class copyspellAIContent {
	
	// ────────────────────────────────────
	constructor( action ) {
		// AIH.LOCAL.set('copyspell-ai-prefs', null) // reset prefs for testing

		this.AISettings = null
		this.id			= DATA.post.id || null;
		this.action		= action || 'product-content'
		this.form 		= {};
		this.sources	= null;


		if ( action === 'settings' ) this.settings();
		
		if ( action === 'product-content' ) this.start();
		
		//if ( action.includes('-suggest') ) this.suggest();
 
	}




	

	// MARK: Settings Panel
	// ────────────────────────────────────
	async settings() {
		requestAnimationFrame(async () => {

			// Settings Panel
			this.AISettings = await AISettings.run('settings');
			_log('AISettings', this.AISettings);

			const overlay = document.createElement('div');
			overlay.className = 'aai-panel-overlay';
			this.AISettings.panel.$el.parentNode.insertBefore(overlay, this.AISettings.panel.$el);

		});
	}






	// MARK: Suggest
	// ────────────────────────────────────
	static async suggest( name ) {
		let action = `product-suggest-${name}`;
        const c = new copyspellAIContent( action );

		// Settings Panel
		c.AISettings = await AISettings.start( action );
		let form = c.AISettings.getFormData();

console.log('form framework ---------', form.framework)
		// •••••••••••••••••••••••••••••••••••••
		const response = await CopySpellCall.run({ action, form })
		// •••••••••••••••••••••••••••••••••••••

		return response.json || response

	}



	// MARK: Change
	// ────────────────────────────────────
	static async change( prompt, content ) {

		let action = `product-change`;
        const c = new copyspellAIContent( action );

		// Settings Panel
		c.AISettings = await AISettings.start( action );
		let form = c.AISettings.getFormData();

		
		// •••••••••••••••••••••••••••••••••••••
		const response = await CopySpellCall.run({ action, form, extraData: { prompt, content } })
		// •••••••••••••••••••••••••••••••••••••

		return response.json || response


	}





	// MARK: Refine
	// ────────────────────────────────────
	static async refine( prompt, content ) {

		let action = `product-refine`;
        const c = new copyspellAIContent( action );

		// Settings Panel
		c.AISettings = await AISettings.start( action );
		let form = c.AISettings.getFormData();

				
		// •••••••••••••••••••••••••••••••••••••
		const response = await CopySpellCall.run({ action, form, extraData: { prompt, content } })
		// •••••••••••••••••••••••••••••••••••••

		return response.json || response


	}






	// MARK: Start
	// ────────────────────────────────────
	async start() {
		requestAnimationFrame(async () => {
			this.action = 'product-content'

			// Settings Panel
			this.AISettings = await AISettings.run(
				this.action,
				__('Product Information Improvement', 'copyspell-ai'),
				this.onSubmit.bind(this)
			);

		});
	}


	




	// Submit action
	// ────────────────────────────────────
	async onSubmit( _data={} ){
		
		this.AISettings.loadingState()
		this.form = _data.form; 
		this.generic = _data.generic;
		this.productInfo = _data.productInfo;

		// •••••••••••••••••••••••••••••••••••••
		const response = await CopySpellCall.run({ action: this.action, form: this.form,
			extraData: {
				generic: this.generic,
				productInfo: this.productInfo
			},
			onProgress: p => this.callProgress( p )
		})
		// •••••••••••••••••••••••••••••••••••••
		//console.log('▶ Response:', response)



		if ( !response || response.error ) return;

		
		// Store suggestions
		this.saveRecord( response );
		

		// Display results
		try {
			ResultProduct.run(this.panel, response);
		} catch (resultError) {
			this.callProgress({
				status: 'error',
				error: __('There was an error rendering the result. Please try again.', 'copyspell-ai')
			})
			_log('❌ Error in ResultProduct.run', resultError);
		}

		
		
	}




	// MARK: Save Record
	// ────────────────────────────────────
	async saveRecord( response ) {

		let suggestions = response.json?.content?.suggestions || [];
		for ( let i = 0; i < suggestions.length; i++ ) {
			await AIH.addRecord(0, response.products[0].id || 0, 
				{
					_type: 'suggestion',
					_action: this.action,
					meta	: response.meta.model,
					api		: response.meta.api,
					duration: response.meta.duration,
				}, 
				{
					title	: response.json?.title?.suggestions?.[i] || '',
					excerpt	: response.json?.excerpt?.suggestions?.[i]  || '',
					content	: suggestions[i] || ''
				},
				'product'
			);
		}

	}
	





	
	// MARK: Call Progress
	// ────────────────────────────────────
	async callProgress( progress ) {
		try {
			this.panel = this.AISettings.panel
			if ( ! this.panel || ! this.panel.$body ) return;

			//console.log('progress =================', progress);
			let output = this.panel.$body.querySelector('.aai-call-progress .aai-output');

			if ( progress.status === 'success' ) {
				return;
			}

			/*
			if ( progress.status === 'success' ) {
				const loadingElement = this.panel.$body.querySelector('.aai-call-progress .copyspell-ai-loading');
				const processingElement = this.panel.$body.querySelector('.aai-processing');
				if (loadingElement) loadingElement.remove();
				if (processingElement) processingElement.remove();
				output.innerHTML = `<p class="aai-row-success">Response from <b>${progress.model}</b> (${progress.api})</p>`;
				return;
			};
			*/
			
			let HTML = ``;
			if ( progress.status === 'processing' ) {
				let modelName = progress.model.replace(/-/g, ' ')
				HTML += `<p class="aai-row-calling">trying with <b>${modelName}</b> @ ${progress.api}...</p>`;
			}
			if ( progress.status === 'processing error' ||
				progress.status === 'error'
			) {
	//console.log('progress', progress)
				if ( progress.status === 'processing error' )
					HTML += `<p class="aai-row-error">${progress.error}</p>`;
				if ( progress.status === 'error' && ! progress.model ) {
					HTML += modelSelectionDropdown( this.form  )
					HTML += await submitButtonHTML( __("Try again", 'copyspell-ai') )
					HTML += `<button class="aai-btn aai-btn-primary aai-cancel-button">${ __('Back', 'copyspell-ai') }</button>`
				}
			}
			if ( progress.status === 'server error' ) {
	//console.log('progress', progress)
				HTML += `<p class="aai-row-error">${progress.error}</p>`;
				HTML += `<p class="aai-row-error-final">All models and providers have been tried without success.</p>`;
				HTML += modelSelectionDropdown( this.form )
				HTML += await submitButtonHTML( __("Try again", 'copyspell-ai') )
				HTML += `<button class="aai-btn aai-btn-primary aai-cancel-button">${ __('Back', 'copyspell-ai') }</button>`
			}
			if ( output ) {
				output.insertAdjacentHTML('beforeend', HTML)
				output.querySelector('.aai-cancel-button')?.addEventListener('click', e => {
					this.AISettings.panel.close();
				});
			}

			//if ( this.panel.$body.querySelector(`#_model`) )
				//this.panel.$body.querySelector(`#_model`).value = this.form._model || 'sequence';



		
		} catch (error) {
			_log('❌ Error in callProgress:', error);
		}
	}



	


}














