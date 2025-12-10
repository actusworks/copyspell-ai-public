import SVG 					from '../svg.js';
import _log	 				from "../Log.js";
import TOOLS				from '../tools.js';
import CopySpellCall 		from './ai-call.js';
import { getProductData, markdownToHTML } 	from './ai-common.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const SDK = window.CopyspellAI || {};
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;




// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: Marketing Result Renderer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class MarketingResultRenderer {

	constructor() {
		this.suggestions = [];
		this.refinements = [];
		this.visualSuggestions = [];
		this.hashtags = [];
		this.prefs = {};
		this.cur = { suggestion: 0 };
		this.$container = null;
		this.$card = null;
	}



	// MARK: Render
	// ────────────────────────────────────
	async render( response, prefs, $container ) {
		this.$container = $container || this.$container;
		this.prefs = prefs || this.prefs || {};
		let content = response || {};
		if ( response.json )
			content = response.json || {};
		this.suggestions = content?.suggestions || [];
		this.visualSuggestions = content?.visualSuggestions || [];
		this.refinements = content?.refinementPrompts || [];
		this.hashtags = content?.hashtags || [];
		this.prefs = prefs || {};
		this.$container = $container;
		this.cur.suggestion = 0;

		if ( !this.suggestions.length ) {
			$container.html('<div class="aai-no-content">' + __('No marketing content found', 'copyspell-ai') + '</div>');
			return;
		}

		let html = await this.renderResultCard();
		let extras = this.renderExtras();

		$container.html(`
			<div class="aai-marketing-result-output aai-marketing-preview">
				<div class="aai-flex">
					<div class="aai-marketing-cards">
						<div class="aai-marketing-cards-buttons">
							${this.suggestions.map( (s, i) => `
								<button class="aai-btn medium ${ this.cur.suggestion === i ? 'aai-active' : '' }">${__('version', 'copyspell-ai')} ${i + 1}</button>
							`).join('')}
						</div>
						<div class="aai-marketing-card">
							${html}
						</div>
					</div>
					<div class="aai-marketing-extras">${extras}</div>
				</div>
			</div>
		`);

		this.$card = $container.find('.aai-marketing-card');
		this.$extras = $container.find('.aai-marketing-extras');

		this.bindEvents( $container );

		SDK.events.emit('marketing-rendered', { ...this });
		
	}



	// MARK: Bind Events
	// ────────────────────────────────────
	bindEvents( $container ) {

		// Version buttons click
		$container.off('click', '.aai-marketing-cards-buttons button');
		$container.on('click', '.aai-marketing-cards-buttons button',  async (e) => {
			e.stopPropagation();
			e.preventDefault();

			const $btn = $(e.target).closest('button.aai-btn');
			// Update active state
			$container.find('.aai-marketing-cards-buttons button').removeClass('aai-active');
			$btn.addClass('aai-active');
			// Update current suggestion
			this.cur.suggestion = parseInt( $btn.index() );
			// Re-render
			let html = await this.renderResultCard();
			let extras = this.renderExtras();
			this.$card.html( html );
			this.$extras.html( extras );
			SDK.events.emit('marketing-rendered', { ...this });
		});



		SDK.events.emit('marketing-events', { ...this });

	}



	// MARK: Render Result Card
	// ────────────────────────────────────
	async renderResultCard( postBody = '', postImage = '' ) {
		postBody = postBody || this.suggestions[ this.cur.suggestion ] || '';
		postImage = postImage || this.image || '';
		if ( ! postImage ) {
			let productData = await getProductData( DATA.post.id );
			this.image = productData.imageUrls?.[0] || ''
			postImage = this.image;
		}
		
		let bodyHtml = postBody;
		if ( this.prefs.group === 'social' || this.prefs.group === 'adv' ) {
			bodyHtml = markdownToHTML( postBody );
		}

		let html = `
		<div class="aai-card aai-card-result" data-group="${this.prefs.group || 'social'}" data-medium="${(this.prefs.mediumName || 'facebook-post').toLowerCase().replace(/ /g,'-')}">
			
			<div class="aai-card-result-header">
			
				${(this.prefs.group === 'blog' && postImage) ? 
					`<div class="aai-card-result-image">`+
					`<img class="aai-post-image" src="${postImage}" alt="Post Image">`+
					`</div>`
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
							`<span>@${(DATA.siteName || 'copyspellai').toLowerCase().replace(/ /g,'')} • 1h</span>`
						: ''}

					</div>`
				: ''}
				
			</div>

			${(this.prefs.group === 'social' && this.prefs.medium == 1) ? 
				(postImage ? `<div class="aai-card-result-image">`+
							 `<img class="aai-post-image" src="${postImage}" alt="Post Image">`+
							 `</div>` : '') + 
				`<img class="aai-insta-icons" src="/wp-content/plugins/copyspell-ai/img/insta-icons.jpg" alt="Instagram Icons">` 
			: ''}
			

			<div class="aai-card-result-body">
				${bodyHtml}
			</div>

			<div class="aai-card-result-image">
				${(this.prefs.group === 'social' && postImage && 
				   (this.prefs.medium == 0 || this.prefs.medium == 2 || this.prefs.medium == 3)) ? 
					`<img class="aai-post-image" src="${postImage}" alt="Post Image">`
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
		`;

		return html;
	}



	// MARK: Render Extras (Visual Suggestions & Hashtags)
	// ────────────────────────────────────
	renderExtras() {
		let HTML = '';

		// Refinements
		if ( this.refinements && this.refinements.length ) {
			HTML += `
				<div class="aai-marketing-refine">
					<h4>✍️ ${__('Refinement Suggestions', 'copyspell-ai')}</h4>
					${ this.renderRefinement() }
				</div>
			`;
		}

		
		// Hashtags
		if ( this.hashtags && this.hashtags.length ) {
			HTML += `
				<div class="aai-marketing-hashtags">
					<h4># ${__('Hashtags', 'copyspell-ai')}</h4>
					<div class="aai-hashtags-list">
						${this.hashtags.map( tag => `<span class="aai-chip">${tag}</span>` ).join('')}
					</div>
				</div>
			`;
		}

		HTML += '<div data-copyspell-slot="marketing-render-extras"></div>'


		// Visual Suggestions
		if ( this.visualSuggestions && this.visualSuggestions.length ) {
			HTML += `
				<div class="aai-image-prompts">
					<h4>🎨 ${__('Visual Suggestions', 'copyspell-ai')}</h4>
					<div class="aai-marketing-visual-controls"></div>
					<ul>
						${this.visualSuggestions.map( vs => `<li>${vs}</li>` ).join('')}
					</ul>
				</div>
			`;
		}


		return HTML;
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



	



}












// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Static instance for easy usage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MarketingResult = new MarketingResultRenderer();


export default MarketingResult;
export { MarketingResultRenderer };
