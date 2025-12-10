import SVG 					from '../svg.js';
import _log	 				from "../Log.js";
import TOOLS 				from '../tools.js';
import AIH					from './ai-helpers.js';
import AISettings           from "./ai-settings.js";
import CopySpellCall 		from './ai-call.js';
import AIapi           		from "./ai-api.js";
import MarketingExtra 		from './ai-marketing-extra.js';
import CFG 					from '../config.js';
import { MarketingResultRenderer } from './ai-marketing-result.js';
import {
	modelSelectionDropdown,
	submitButtonHTML,
	historyButtonHTML,
	loadingState
} from './ai-settings-UI.js';
import { markdownToHTML } 	from './ai-common.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const SDK = window.CopyspellAI || {};
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;
let OPT = DATA.options || {};

//console.log('DATA', DATA);



const defaultPrefs = {
	group 	: 'social',
	type  	: 0,
	medium	: 0,
	mediumName	: 'Facebook Post',
	includeLinks: true,
	useEmojis: true,
	noPrices: false,
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: Marketing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class copyspellAIMarketing {
	
	// ────────────────────────────────────
	constructor( action ) {

		this.prefsName	 = 'copyspell-ai-marketing-prefs'
		
		this.prefs = AIH.LOCAL.get( this.prefsName )
		if ( ! this.prefs ) {
			this.prefs = JSON.parse( JSON.stringify( defaultPrefs ) )
			AIH.LOCAL.set( this.prefsName, defaultPrefs )
		}
		this.prefs = { ...defaultPrefs, ...this.prefs }
		// AIH.LOCAL.set('copyspell-ai-marketing-prefs', null) // reset prefs for testing
		
		_log('Marketing prefs', this.prefs );



		this.AIPanel 	= null
		this.Sources 	= {}
		this.id			= DATA.post.id || null;
		this.panel 		= null
		this.action		= action || 'marketing-content'
		this.item 		= DATA.post || {};
		this.callData	= {};
		this.form 		= {};
		this.$controls	= null;
		this.$controls2	= null;
		this.$groups	= null;
		this.$types		= null;
		this.$result	= null;
		this.extra 		= new MarketingExtra();
		this.resultRenderer = new MarketingResultRenderer();

		this.cur = {
			suggestion : 0,
		}

		this.groups = CFG.marketing.groups;
		this.groupsShort = CFG.marketing.groupsShort;
		this.media = CFG.marketing.media;
		this.types = CFG.marketing.types;
		this.descriptions = CFG.marketing.descriptions;



 //console.log('Marketing prefs:', this.prefs );
		if ( action === 'marketing-content' ) this.start();


		//SDK.CopySpellCall = CopySpellCall;
		//SDK.AIapi = AIapi;
		//SDK.modelSelectionDropdown = modelSelectionDropdown;

	}




	// MARK: Start
	// ────────────────────────────────────
	async start() {
		requestAnimationFrame(async () => {

		SDK.data.set('CopySpellCall', CopySpellCall );

			// Settings Panel
			this.AISettings = await AISettings.run(
				this.action,
				__('Marketing Tools', 'copyspell-ai'),
			);
			this.panel = this.AISettings.panel;
			
			this.createInterface();
			this.events();
			await this.typeButtons();
						
			this.$description.html( `${this.types[ this.prefs.group ][ this.prefs.type ]}<span>${ this.descriptions[ this.prefs.group ][ this.prefs.type ] || '' }</span>` );

			this.license = await TOOLS.loadOption('copyspell-ai-license');

		});
	}


	




	// MARK: Create Interface
	// ────────────────────────────────────
	createInterface() {

		this.$body = $( this.panel.$body );
		this.$controls2 = $('<div class="aai-marketing-controls-2 aai-section">').prependTo( this.$body)
		this.$controls = $('<div class="aai-marketing-controls aai-section">').prependTo( this.$body)
		this.$controls.html(`
			<div class="aai-marketing-groups"></div>
			<div class="aai-marketing-media"></div>
		`)
		this.$controls2.html(`
			<div class="aai-marketing-flex">
				<div class="aai-marketing-types"></div>
				<div class="aai-marketing-flex-right">
					<div class="aai-marketing-extra"></div>
					<div class="aai-flex-1"></div>
					<div class="aai-marketing-flags"></div>
					<div class="aai-bottom-flex aai-flex">
						<div class="aai-marketing-description"></div>
							<button class="aai-btn aai-btn-primary aai-marketing-create">${SVG.play} ${__('Create', 'copyspell-ai')}</button>
					</div>
				</div>
			</div>
		`)
		this.$result = $('<div class="aai-marketing-result aai-section">').insertAfter( this.$controls2 );

		this.$groups = this.$controls.find('.aai-marketing-groups');
		this.$media = this.$controls.find('.aai-marketing-media');
		this.$types = this.$controls2.find('.aai-marketing-types');
		this.$extra = this.$controls2.find('.aai-marketing-extra');
		this.$flags = this.$controls2.find('.aai-marketing-flags');
		this.$bottom = this.$controls2.find('.aai-bottom-flex');
		this.$description = this.$controls2.find('.aai-marketing-description');
		this.$create = this.$controls2.find('.aai-marketing-create');


		this.$extraPrompt = this.$body.find('.aai-extra-prompt-group');
		this.$bottom.before( this.$extraPrompt );

		$('<div class="aai-marketing-controls-3">')
			.insertBefore( this.$result )
			.html(
				historyButtonHTML('History') +
				this.modelSelectionDropdown({ _model: this.prefs.model })
			);

		this.flags()

	}





	// MARK: Flags
	// ────────────────────────────────────
	flags() {

		// FLAGS
		let flagHtml = `
			<div class="aai-group aai-group-checkbox">
				<input type="checkbox" class="aai-checkbox" id="use-emojis" name="useEmojis"/>
				<label class="aai-label" for="use-emojis">Use emojis</label>
			</div>
			<div class="aai-group aai-group-checkbox">
				<input type="checkbox" class="aai-checkbox" id="include-links" name="includeLinks"/>
				<label class="aai-label" for="include-links">Include links</label>
			</div>
			<div class="aai-group aai-group-checkbox">
				<input type="checkbox" class="aai-checkbox" id="no-prices" name="noPrices"/>
				<label class="aai-label" for="no-prices">Do not show prices</label>
			</div>
		`;


		this.$flags.html( flagHtml );
		if ( this.prefs.useEmojis ) this.$flags.find('#use-emojis').prop('checked', true);
		if ( this.prefs.includeLinks ) this.$flags.find('#include-links').prop('checked', true);
		if ( this.prefs.noPrices ) 	this.$flags.find('#no-prices').prop('checked', true);


		this.$flags.on('change', 'input', (e) => {
			let checked = $(e.target).is(':checked');
			let name = $(e.target).attr('name');
			this.prefs[name] = checked;
			AIH.LOCAL.set('copyspell-ai-marketing-prefs', this.prefs );
			_log('No prices clicked:', this.prefs);
		})



	}





	// MARK: Type Buttons
	// ────────────────────────────────────
	async typeButtons() {

		let groupButtons = ''
		for ( let key in this.groups ) {
			groupButtons += `<button class="aai-btn" data-type="${key}">${this.groups[key]}</button>`;
		}
		groupButtons += '<div class="aai-flex-1"></div>';
		groupButtons += await TOOLS.renderCredits()
		let mediumButtons = ''
		let i = 0
		if ( this.media[this.prefs.group] ) {
			for ( let medium of this.media[this.prefs.group] ) {
				mediumButtons += `<button class="aai-btn medium" data-type="${i}">${medium}</button>`;
				i++
			}
		}
		let typeButtons = ''
		i = 0
		if ( this.types[this.prefs.group] ) {
			for ( let type of this.types[this.prefs.group] ) {
				typeButtons += `<button class="aai-btn medium" data-type="${i}">${type}</button>`;
				i++
			}
		}

		this.$groups.html( groupButtons );
		this.$media.html( mediumButtons );
		this.$types.html( typeButtons );

		this.$groups.find(`[data-type="${this.prefs.group}"]`).addClass('aai-active');
		this.$media.find(`[data-type="${this.prefs.medium}"]`).trigger('click');
		this.$types.find(`[data-type="${this.prefs.type}"]`).trigger('click');
			

	}





	// MARK: Events
	// ────────────────────────────────────
	events() {

		// group buttons
		this.$groups.off('click', 'button')
		this.$groups.on('click', 'button', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			let $btn = $(e.target).closest('button.aai-btn');
			this.prefs.group = $btn.data('type');
			this.$groups.children().removeClass('aai-active');
			$btn.addClass('aai-active');

			this.prefs.medium = 0;
			this.prefs.mediumName = this.media[ this.prefs.group ] ? this.media[ this.prefs.group ][0] : '';
			this.prefs.type = 0;
			AIH.LOCAL.set('copyspell-ai-marketing-prefs', this.prefs );
			this.$description.html( `${this.types[ this.prefs.group ][ this.prefs.type ]}<span>${ this.descriptions[ this.prefs.group ][ this.prefs.type ] || '' }</span>` );

			//this.eventsDestroy();
			this.typeButtons();
			this.events();
		})

		// medium buttons
		this.$media.off('click', 'button')
		this.$media.on('click', 'button', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			let $btn = $(e.target).closest('button.aai-btn');
			this.prefs.medium = parseInt( $btn.data('type') );
			this.prefs.mediumName = $btn.text();
			AIH.LOCAL.set('copyspell-ai-marketing-prefs', this.prefs );
			this.$media.children().removeClass('aai-active');
			$btn.addClass('aai-active');
		})

		// type buttons
		this.$types.off('click', 'button')
		this.$types.on('click', 'button', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			let $btn = $(e.target).closest('button.aai-btn');
			this.prefs.type = parseInt( $btn.data('type') );
			AIH.LOCAL.set('copyspell-ai-marketing-prefs', this.prefs );
			this.$types.children().removeClass('aai-active');
			$btn.addClass('aai-active');

			this.$description.html( `${this.types[ this.prefs.group ][ this.prefs.type ]}<span>${ this.descriptions[ this.prefs.group ][ this.prefs.type ] || '' }</span>` );

			//this.generatePost();
			this.extra.render( this.prefs, this.$extra )

			// Add help icons to all .aai-group elements
			this.$body.find('.aai-marketing-extra .aai-group:not(.aai-group-checkbox)').each(function() {
				const $group = $(this);
				const $label = $group.find('> label');
				if ($label.length && !$label.prev('.aai-help').length) {
					$('<span class="aai-help">')
						.html(SVG.help).insertBefore($label)
						.click(function(e) {
							$label.toggle()
						});
				}
			});

			$('.aai-marketing-extra .aai-select-products-container').appendTo('.aai-marketing-extra')



		})


		// create button
		this.$body[0].addEventListener('click', (e) => {
			if (e.target.matches('.aai-marketing-create') ||
		 	    e.target.matches('.aai-submit-btn')) {

				e.preventDefault();
				e.stopPropagation();
				
				// Prevent double-clicks - guard is now in CopySpellCall
				if ( e.target.disabled ) return;
				e.target.disabled = true;
				
				this.generatePost().finally(() => {
					e.target.disabled = false;
				});
			}
		})



		// model select change
		this.$body[0].addEventListener('change', (e) => {
			if (e.target.matches('.aai-select-model')) {
				let model = e.target.value;
				this.prefs.model = model;
				AIH.LOCAL.set(this.prefsName, this.prefs);

				document.querySelectorAll('.aai-select-model').forEach( select => {
					select.value = model;
				})
console.log('Model selected:', model);
			}
		})



		
		// group buttons
		this.$result.off('click', '.aai-create-image')
		this.$result.on('click', '.aai-create-image', async (e) => {

			e.preventDefault();
			e.stopPropagation();
			
			const $btn = $(e.target).closest('.aai-create-image');
			
			// Disable button and show loading state
			$btn.prop('disabled', true).html(`${SVG.loader} Creating...`);


			$btn.prop('disabled', false).html(`Create Image`);

		})

	}




	// MARK: Events Destroy
	// ────────────────────────────────────
	eventsDestroy() {
		this.$groups.replaceWith( this.$groups.cloneNode( true ) );
		this.$media.replaceWith( this.$media.cloneNode( true ) );
		this.$types.replaceWith( this.$types.cloneNode( true ) );
	}




	// MARK: Generate Post
	// ────────────────────────────────────
	async generatePost() {
		if ( ! await TOOLS.isAllowed('marketing-content') ) return;
			

		let formData = this.AISettings.getFormData()
		let extraData = this.extra.get()
		extraData.prefs = this.prefs;
		extraData.generic = OPT.generic;
		
		// show loading state
		let loadingHtml = `
		<div class="aai-call-progress loading">
			<div class="copyspell-ai-loading">
				${SVG.loader}<label>${__('AI analysis', 'copyspell-ai')}...</label>
			</div>
			<div class="aai-processing">
				<div class="status-pulse"></div>
				<span class="status-label">thinking</span>
			</div>
			<div class="aai-output"></div>
		</div>`
		this.$result.html( loadingHtml );
		this.$result[0].scrollIntoView({ behavior: 'smooth', block: 'center' });


		// make the AI call
		// •••••••••••••••••••••••••••••••••••••
		const response = await CopySpellCall.run({ action: this.action, form: formData, extraData,
				onProgress: p => this.callProgress( p ) })
		// •••••••••••••••••••••••••••••••••••••


		if ( !response || response.error ) return;


		// Store suggestions
		this.saveRecord( response );

		SDK.data.set('marketing-result', response );
		
		try {
			await this.resultRenderer.render( response, this.prefs, this.$result );
			//this.renderResult( response );
		} catch (renderError) {
			this.callProgress({
				status: 'error',
				error: __('There was an error rendering the result. Please try again.', 'copyspell-ai')
			})
			_log('❌ Error rendering marketing result:', renderError);
		}




	}





	// MARK: Save Record
	// ────────────────────────────────────
	async saveRecord( response ) {
		
		let json = { ...response.json }
		delete json.refinementPrompts;
		await AIH.addRecord(0, response.products[0].id || 0, 
			{
				_type: this.groupsShort[ this.prefs.group ] || 'marketing',
				_action: this.action,
				meta	: response.meta.model,
				api		: response.meta.api,
				duration: response.meta.duration,
				prefs	: this.prefs,
			}, 
			json,
			'marketing'
			/*
			{
				suggestions	: response.json?.suggestions?.[i] || [],
				visualSuggestions : response.json?.visualSuggestions?.[i]  || [],
				hashtags : response.json?.hashtags?.[i]  || [],
			}
			*/
		);

	}





	// MARK: Render Result
	// ────────────────────────────────────
	renderResult( response ) {
		let json = response.json || {}
		this.suggestions = JSON.parse( JSON.stringify( json.suggestions || {} ) );
		this.refinements = JSON.parse( JSON.stringify( json.refinementPrompts || {} ) );
		this.visuals = JSON.parse( JSON.stringify( json.visualSuggestions || {} ) );

		_log('JSON', json );
		
		let html = this.renderResultCard( response )
		let refinement = this.renderRefinement()
		//let visuals = this.renderVisuals()
		let visuals = ''
		
		this.$result.html(`
			<div class="aai-marketing-result-output">
				<div class="aai-flex">
					<div class="aai-marketing-cards">
						<div class="aai-marketing-cards-buttons">
							${this.suggestions.map( (s, i) => `
								<button class="aai-btn medium ${ this.cur.suggestion === i ? 'aai-active' : '' }">version ${i + 1}</button>
							`).join('')}
						</div>
						<div class="aai-marketing-card">
							${html}
						</div>
						<div class="aai-marketing-cards-footer">
						</div>
					</div>
					<div class="aai-marketing-refine">
						${refinement}
						${visuals}
					</div>
				</div>
			</div>
		`);
//									<button class="aai-btn aai-btn-primary aai-create-image">Create Image</button>


		this.$card = this.$result.find('.aai-marketing-card');
		this.$refine = this.$result.find('.aai-marketing-refine');


		
		this.$result[0].scrollIntoView({ behavior: 'smooth', block: 'center' });


		// version buttons click
		this.$result.off('click', '.aai-marketing-cards-buttons button')
		this.$result.on('click', '.aai-marketing-cards-buttons button', (e) => {
			e.stopPropagation();
			e.preventDefault();
			const $btn = $(e.target).closest('button.aai-btn');
			// Update active state
			this.$result.find('.aai-marketing-cards-buttons button').removeClass('aai-active');
			$btn.addClass('aai-active');
			// Update current suggestion
			this.cur.suggestion = parseInt( $btn.index() );
			// Re-render
			let html = this.renderResultCard()
			let refinement = this.renderRefinement()
			this.$card.html( html );
			this.$refine.html( refinement );
		});

		
		// refinement prompts click
		this.$result.off('click', '.aai-refinement-prompts span')
		this.$result.on('click', '.aai-refinement-prompts span', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const span = $(e.target).closest('.aai-refinement-prompts span');
			this.refine(span, json);
		});
		this.$result.off('click', '.aai-refinement-custom-submit')
		this.$result.on('click', '.aai-refinement-custom-submit', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const span = $(e.target).closest('button').siblings('textarea');
			this.refine(span, json);
		});



		// visual prompts click
		this.$result.off('click', '.aai-marketing-visuals span')
		this.$result.on('click', '.aai-marketing-visuals span', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const span = $(e.target).closest('.aai-marketing-visuals span');
			this.createImage(span, json);
		});

	}



	// MARK: Create Image
	// ────────────────────────────────────
	async createImage( span, json ) {
		let visualPrompt = span.text();
		let prompt = '';
	
		//let content = this.suggestions[ this.cur.suggestion ] || '';

		//console.log('Create an illustration for this facebook post:', content );
		prompt = `Create an image for this ${this.prefs.mediumName.toLowerCase()}: ${visualPrompt}.`;
		//prompt = `Make sure the product looks exactly like it looks in the provided image.`;
		prompt = `You can change everything in the image as asked in the prompt, but keep the product always visually consistent with the provided image.`;
		//prompt = `Create an illustration or photo for a ${this.prefs.mediumName.toLowerCase()} about: ${visualPrompt}`;
		//prompt += ` Style: vibrant colors, high detail, professional, modern design.`;
		//content += ` Do not include much text in the image.`;
		
		// API call
		// •••••••••••••••••••••••••••••••••••••
		const response = await fetch('https://copyspell.actusanima.com/v1/image', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				prompt: prompt,
				model: 'Lykon/DreamShaper',
				model: 'google/gemini-3-pro-image',
			})
		});
		// •••••••••••••••••••••••••••••••••••••
	

		console.log('IMAGE RESPONSE', response);
		

		if ( response.error ) {
			_log('❌ Error fetching credits:', response.error || 'Unknown error');
			TOOLS.showNotification(response.error || 'Error creating image.', 'error');
			return null;
		} 

		const data = await response.json();

		
		console.log('IMAGE RESPONSE', data);
		this.postImage = data.image || '';
		const $imageContainer = this.$result.find('.aai-card-result-image');
		$('<img>').attr('src', data.image).appendTo( $imageContainer.empty() );


		
	}





	// MARK: Refinement
	// ────────────────────────────────────
	renderRefinement( prompts ) {
		
		prompts = prompts || this.refinements[ this.cur.suggestion ] || [];

		let HTML = `
			<div class="aai-refinement-prompts">
				<div class="aai-refinement-custom">
					<textarea class="aai-textarea" placeholder="${__("refine the content—what would you like different?...", 'copyspell-ai')}"></textarea>
					<button class="aai-btn aai-btn-primary aai-refinement-custom-submit">${SVG.play}</button>
				</div>`
			if ( prompts ) {
				prompts.forEach( prompt => {
					HTML += `<span class="aai-chip">${prompt}</span>`
				});
				HTML += `<span class="aai-chip aai-custom" alt="longer">${__("Make it longer", 'copyspell-ai')}</span>`
				HTML += `<span class="aai-chip aai-custom" alt="shorter">${__("Make it shorter", 'copyspell-ai')}</span>`
				//HTML += `<span class="aai-chip aai-custom" alt="custom">${__("Custom changes", 'copyspell-ai')}</span>`
			}
			HTML += `
			</div>`

		return HTML;

	}


	// MARK: Visuals
	// ────────────────────────────────────
	renderVisuals() {
		
console.log('visuals:', this.visuals );
		let HTML = `<div class="aai-marketing-visuals">`
			if ( this.visuals.length ) {
				this.visuals.forEach( prompt => {
					HTML += `<span class="aai-chip">${prompt}</span>`
				});
			}
			HTML += `
			</div>`

		return HTML;

	}







	// MARK: Result Card
	// ────────────────────────────────────
	renderResultCard( response, postBody='', postImage ) {
		postBody = postBody || this.suggestions[ this.cur.suggestion ] || ''
		postImage = postImage || this.postImage || response?.products?.[0]?.imageUrls?.[0] || ''

		this.postImage = postImage


		let bodyHtml = postBody
		if ( this.prefs.group === 'social' || this.prefs.group === 'adv' ) {
			bodyHtml = markdownToHTML( postBody )
		}
		

		let html = `
		<div class="aai-card  aai-card-result" data-group="${this.prefs.group}" data-medium="${this.prefs.mediumName.toLowerCase().replace(/ /g,'-')}">
			

			<div class="aai-card-result-header">
			
				${(this.prefs.group === 'blog' && postImage) ? 
					`<img class="aai-post-image" src="${postImage}" alt="Post Image">`
				: ''}

				${this.prefs.group === 'email' ? 
					`${SVG.email}`
				: ''}


				${this.prefs.group === 'social' ? 
					`${SVG.user}
					<div class="aai-card-result-user-info">
						${DATA.siteName || 'CopySpell AI'}<br>
						
						${this.prefs.medium < 2 ? `<span>Just now</span>` : ''}

						${this.prefs.medium == 2 ? 
							`<span>7642 followers</span><br><span>16m • 🌎</span>`
						: ''}

						${this.prefs.medium == 3 ? 
							`<span>@${DATA.siteName.toLowerCase().replace(/ /g,'')} • 1h</span>`
						: ''}



					</div>`
				: ''}

				
			</div>

			${(this.prefs.group === 'social' && this.prefs.medium == 1) ? 
				`<img class="aai-post-image" src="${postImage}" alt="Post Image">` + 
				`<img class="aai-insta-icons" src="/wp-content/plugins/copyspell-ai/img/insta-icons.jpg" alt="Instagram Icons">` 
			: ''}
			

			<div class="aai-card-result-body">
				${bodyHtml}
			</div>

			<div class="aai-card-result-image">
				${(this.prefs.group === 'social' && postImage && 
				   (this.prefs.medium == 0 || this.prefs.medium == 2 || this.prefs.medium == 3)) ? 
					`<img src="${postImage}" alt="Post Image">`
				: ''}
			</div>


			<div class="aai-card-result-footer">
				${(this.prefs.group === 'social' && this.prefs.medium == 0) ? 
					`<img src="/wp-content/plugins/copyspell-ai/img/facebook-footer.jpg" alt="Facebook Footer Image">` 
				: ''}
				${(this.prefs.group === 'social' && this.prefs.medium == 2) ? 
					`<img src="/wp-content/plugins/copyspell-ai/img/linkedin-footer.jpg" alt="LinkedIn Footer Image">` 
				: ''}
				${(this.prefs.group === 'social' && this.prefs.medium == 3) ? 
					`<img src="/wp-content/plugins/copyspell-ai/img/tweet-icons.jpg" alt="LinkedIn Footer Image">` 
				: ''}
			</div>
		</div>
		`

		return html;

	}




	





	
	// MARK: Call Progress
	// ────────────────────────────────────
	async callProgress( progress ) {
		try {
			this.panel = this.AISettings.panel
			if ( ! this.panel || ! this.panel.$body ) return;

			//console.log('progress =================', progress);
			let output = this.$result[0].querySelector('.aai-output');

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
	//console.log('progress 1', progress)
				if ( progress.model )
					HTML += `<p class="aai-row-error">${progress.error}</p>`;
				if ( progress.status === 'error' && ! progress.model ) {
					HTML += await submitButtonHTML( __("Try again", 'copyspell-ai') )
					HTML += modelSelectionDropdown({ _model: this.prefs.model })
				}
			}
			if ( progress.status === 'server error' ) {
	//console.log('progress 2', progress)
				HTML += `<p class="aai-row-error">${progress.error}</p>`;
				HTML += `<p class="aai-row-error-final">All models and providers have been tried without success.</p>`;
				HTML += submitButtonHTML( __("Try again", 'copyspell-ai') )
				HTML += modelSelectionDropdown({ _model: this.prefs.model })
			}
			if ( output ) output.insertAdjacentHTML('beforeend', HTML)

			//if ( this.panel.$body.querySelector(`#_model`) )
				//this.panel.$body.querySelector(`#_model`).value = this.form._model || 'sequence';



		
		} catch (error) {
			_log('❌ Error in callProgress:', error);
		}
	}






	// MARK: Refine
	// ────────────────────────────────────
	async refine( span, meta ) {
		let $prompts = span.closest('.aai-refinement-prompts')

		if ( ! await TOOLS.isAllowed('marketing-refine') ) return;

		$prompts.addClass('aai-loading');
		const loaderDiv = $('<div class="aai-loader">').html( SVG.loader7 ).insertAfter( $prompts );

		
		let formData = this.AISettings.getFormData()
		let extraData = this.extra.get()
		extraData.prefs = this.prefs;

		console.log('▶ extraData:', extraData)
		

		
		// make the AI call
		// •••••••••••••••••••••••••••••••••••••
		const response = await CopySpellCall.run({ action: 'marketing-refine', form: formData,
			extraData: {
				prompt: span.text()?.trim() || span.val()?.trim() || '',
				content: meta.suggestions[ this.cur.suggestion ] || ''
			}
		})
		// •••••••••••••••••••••••••••••••••••••

		
		loaderDiv.remove();
		$prompts.removeClass('aai-loading');
						
		if ( ! response || response.error ) {
			$prompts.html(`<div class="aai-error-message">${ response?.error || 'Error' }</div>`);
			return;
		}


		// Finalize
		this.finalizeRefinement( response )

		return response.json || response;


		
	
	}
	

	// MARK: Finalize Refinement
	// ────────────────────────────────────
	finalizeRefinement( response ) {

		this.suggestions[ this.cur.suggestion ] = response.json?.content || this.suggestions[ this.cur.suggestion ];
		this.refinements[ this.cur.suggestion ] = response.refinementPrompts || this.refinements[ this.cur.suggestion ];

		// Re-render
		let html = this.renderResultCard( response )
		let refinement = this.renderRefinement()
		this.$card.html( html );
		this.$refine.html( refinement );

	}



}






copyspellAIMarketing.prototype.modelSelectionDropdown = modelSelectionDropdown;
copyspellAIMarketing.prototype.loadingState = loadingState;







