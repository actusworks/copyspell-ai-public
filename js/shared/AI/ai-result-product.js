import wpAPI 				from '../wp-api.js';
import SVG 					from '../svg.js';
import TOOLS            	from "../tools.js";
import { customRefinement } from './ai-common.js';
import copyspellAIContent 	from './ai-content.js';
import AIH 					from './ai-helpers.js';
import _log	 				from "../Log.js";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SDK = window.CopyspellAI || {};
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;




// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: Result Product
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class ResultProduct {
	
	// ────────────────────────────────────
	constructor( panel, data ) {
		this.data 		= {};
		this.panel 		= panel || null
		this.meta		= {}   	// suggestions metadata
		this.json		= {}   	// suggestions metadata
		this.selected 	= {} 	// selected suggestions
		this.revisions  = {
			title	: [ [], [], [] ],
			excerpt	: [ [], [] ],
			content	: [ [], [] ],
		}
		this.currentRevision = {
			title	: [ 0, 0, 0 ],
			excerpt	: [ 0, 0 ],
			content	: [ 0, 0 ],
		}
		this.firstResponse = true;
	}



	static run( panel, data, onBack ) {
        const c = new ResultProduct( panel, data );
		c.onBack = onBack || (() => {});
		c.data = data || {};
		c.meta = data.meta || {};
		c.json = data.json || {};
		c.original = data.products?.[0] || {};
		c.showSuggestions();
	}



	// ────────────────────────────────────
	setPanel( panel ) {
		this.panel = panel;
	}


	// ────────────────────────────────────
	setProductData( data ) {
		this.data = data;
	}




	// MARK: Suggestions
	// ────────────────────────────────────
	// This function displays the suggestions for refining the product information.
	// It shows the HTML structure for the suggestions
	// and sets up event handlers for selection.
	// ────────────────────────────────────
	showSuggestions() {

		//console.log('showSuggestions this.json ================', this.json);


		// hard copy this.json to corresponding this.revisions
		if ( this.firstResponse ) {
			for (let key in this.revisions) {
				this.json[key] = this.json[key] || {};
				this.json[key].suggestions = this.json[key].suggestions || [];
				this.revisions[key] = []
				this.json[key].suggestions.forEach( ( suggestion, index ) => {
					this.revisions[key].push( [ suggestion || '' ] )
				})
			}
		}



		let $panel = this.panel.$el;
		$panel.classList.remove('analysis-options')
		$panel.classList.add('aai-suggestions');

		// show HTML
		this.showSuggestionsHTML();


		// Set buttons
		let selectedCount = this.panel.$el.querySelectorAll('.aai-product-suggestions .aai-suggestion.aai-selected').length;
		if (selectedCount > 0) {
			this.setButtons('select')
		} else {
			this.setButtons('suggestions')
		}


		// Set events
		this.events();


		this.firstResponse = false;

	}





	// MARK: Events
	// ────────────────────────────────────
	events() {
		let $panel = this.panel.$el;



		// Suggestion click
		$panel.querySelectorAll('.aai-product-suggestions .aai-suggestion').forEach(card => {
			card.onclick = (e) => {
				SDK.events.emit('suggestions-click', e);

				e.stopPropagation();


				// if suggestion is being edited
				if (card.classList.contains('aai-editing')) {
					return;
				}


				// revisions navigation
				if (e.target.closest('.aai-revisions-buttons')) {
					const prev = e.target.closest('.aai-prev-revision');
					const next = e.target.closest('.aai-next-revision');
					if (prev) this.showPrevRevision( e );
					if (next) this.showNextRevision( e );
					return;
				}

				
				// edit suggestion
				if (e.target.closest('.aai-edit-suggestion')) {
					this.editSuggestion( e.target );
					return;
				}

				
				// Select suggestion
				this.selectSuggestion( card )

			}
		});





		// refinement prompts
		$panel.querySelectorAll('.aai-suggestion-wrapper').forEach(wrapper => {
			wrapper.onclick = (e) => {
				const span = e.target.closest('.aai-refinement-prompts span');
				if (span && wrapper.contains(span)) {
					e.stopPropagation();
					this.refineSuggestion(span);
				}
			};
		});




	}

	// MARK: Events Buttons
	// ────────────────────────────────────
	buttonsEvents() {

		let $panel = this.panel.$el;

		
		// Preview
		$panel.querySelector('.aai-panel-footer button[alt="preview"]').onclick = () => {
			// Show selected refinement
			this.selected = this.getSelectedData();
			this.showPreview();

		}


		
		// Update product
		$panel.querySelector('.aai-panel-footer button[alt="update"]').onclick = async () => {
			this.selected = this.getSelectedData();
			await this.updateProduct( this.selected );
			window.location.reload();

		}


	}




	// MARK: RENDER
	// ────────────────────────────────────
	// This function generates the HTML for displaying the suggestions.
	// It creates a structured layout for the title, excerpt, and content suggestions.
	// ────────────────────────────────────
	showSuggestionsHTML() {

		//console.log('Product data', this.data);

		this.setButtons('suggestions')

		let HTML = `<div class="aai-product-suggestions">`
		HTML += `<div class="aai-bg-pattern"></div>`


		HTML += this.suggestionsHeaderHTML()



		// Title suggestions
		// ────────────────────────────────────
		HTML += this.titleSuggestionsHTML()



		// Short description suggestions
		// ────────────────────────────────────
		HTML += this.shortDescriptionSuggestionsHTML()



		// Description suggestions
		// ────────────────────────────────────
		HTML += this.descriptionSuggestionsHTML()


		// Insert output in header before button
		let output = document.querySelector('.aai-call-progress .aai-output') || '';
		output.innerHTML = `<p class="aai-row-success">Response from <b>${this.data.model}</b> (${this.data.api})</p>`;
		const $button = this.panel.$header.querySelector('button');
		if (output && $button) {
			this.panel.$header.insertBefore(output, $button);
			this.panel.$header.querySelector('span').style.flex = '0 0 auto';
		}
		
		this.panel.$body.innerHTML = HTML;


		
		SDK.events.emit('suggestions-rendered', { ...this });


	}






	// MARK: HTML
	// ────────────────────────────────────



	// Header HTML
	suggestionsHeaderHTML( superTitle = __('AI Suggestions for', 'copyspell-ai') ) {
		let code = DATA.woocommerce?.product?.sku || '';
		if ( code ) code = `SKU: ${code}`;
		else code = `ID #${DATA.post.id}`;

		let imageSrc = this.original.imageUrls?.[0] || DATA.plugin_url + 'img/placeholder.jpg';
		let modelName = this.meta?.model?.replace(/-/g, ' ') || ''
		let HTML =``
		HTML += `<div class="aai-card aai-no-header aai-suggestions-header">`
		HTML += `<img src="${imageSrc}"/>`
		HTML += `<div class="aai-text">`
			HTML += `<h4>${superTitle}</h4>`
			HTML += `<h2>${this.original.title}</h2>`
				HTML += `<div class="aai-header-bottom-line">`
					HTML += `<div>${SVG.cube2} <span>${__('Woocomerce Product', 'copyspell-ai')}</span></div>`
					HTML += `<div>${SVG.id2} <span>${code}</span></div>`
					HTML += `<div>${SVG.clock} <span>${__('Last updated', 'copyspell-ai')} ${this.formatDate(this.original.modified)}</span></div>`
				HTML += `</div>`
				if ( modelName ) {
					HTML += `<div class="aai-header-model">`
					HTML += `<div>${SVG.robot}Generated with <span>${modelName}</span> in  <span>${this.meta?.duration}s</span></div>`
					HTML += `</div>`

				}
		HTML += `</div>`


		HTML += `</div>`

		return HTML;

	}
	

	// Title Suggestions HTML
	titleSuggestionsHTML() {

		let comment = this.json.title.comment || '';
		if ( comment ) {
			comment = this.stripHtmlTags(comment);
			comment += ` ${__('Select a suggestion', 'copyspell-ai')}.`;
		} else {
			comment = __("Oops—no response from the model. Please try another model or tweak your prompt and try again", 'copyspell-ai');
		}

		let HTML = `
		<div class="aai-card aai-suggestions-card aai-suggestions-titles" alt="title">
			<div class="aai-card-header">
				<div class="aai-left">
					<h3>${SVG.title} ${__('Select a Product Title', 'copyspell-ai')}</h3>
					<p class="comment">${comment}.</p>
				</div>
				<div class="aai-right">
				</div>
			</div>
			<div class="aai-card-body">
				<div class="aai-flex">`
				this.json.title.suggestions.forEach( ( suggestion, index ) => {
					
					let revision = this.revisions.title[index][this.currentRevision.title[index]] || suggestion || '';

					let clss = ''
					if ( this.selected.idx_name === String(index) ) {
						clss = 'aai-selected';
					}

					HTML += `
					<div class="aai-card aai-suggestion aai-selectable aai-no-header aai-card-small aai-flex-3 ${clss}" alt="${index}">
						<div class="aai-revisions">${this.revisionsHTML('title', index)}</div>
						<h3 class="aai-body">${revision}</h3>
						<div class="aai-labels">
							<label class="aai-blank">${SVG.textLines} ${suggestion.length} chars</label>
							${this.json.metrics?.quality?.titles ? `<label class="aai-blank">${SVG.star2} Quality: ${this.json?.metrics?.quality?.titles?.[index]}%</label>` : ''}
							${this.json.metrics?.seo?.titles ? `<label class="aai-blank">${SVG.search2} SEO: ${this.json?.metrics?.seo?.titles?.[index]}%</label>` : ''}
						</div>
						<div class="aai-edit-suggestion">${SVG.edit2}</div>
						<div class="aai-selector">
							${SVG.square}
							${SVG.squareCheck}
						</div>
					</div>`
				});
				HTML += `
				</div>
				<div class="original">${this.original.title}</div>
			</div>
		</div>`

		return HTML;

	}


	// Short Description Suggestions HTML
	shortDescriptionSuggestionsHTML() {
		
		let comment = this.json.excerpt.comment || '';
		if ( comment ) {
			comment = this.stripHtmlTags(comment);
			comment += ` ${__('Select a suggestion', 'copyspell-ai')}.`;
		} else {
			comment = __("Oops—no response from the model. Please try another model or tweak your prompt and try again", 'copyspell-ai');
		}


		let HTML = `
		<div class="aai-card aai-suggestions-card aai-suggestions-excerpt" alt="excerpt">
			<div class="aai-card-header">
				<div class="aai-left">
					<h3>${SVG.shorterText} ${__('Select a Short Description', 'copyspell-ai')}</h3>
					<p class="comment">${comment}.</p>
				</div>
				<div class="aai-right">
				</div>
			</div>
			<div class="aai-card-body">
				<div class="aai-flex">`
				this.json.excerpt.suggestions.forEach( ( suggestion, index ) => {
					
					let revision = this.revisions.excerpt[index][this.currentRevision.excerpt[index]] || suggestion || '';

					let clss = ''
					if ( this.selected.idx_short_description === String(index) ) {
						clss = 'aai-selected';
					}

					HTML += `
					<div class="aai-card aai-suggestion aai-selectable aai-no-header aai-card-small aai-flex-3 ${clss}" alt="${index}">
						<div class="aai-revisions">${this.revisionsHTML('excerpt', index)}</div>
						<div class="aai-body">${revision}</div>
						<div class="aai-labels">
						<label class="aai-blank">${SVG.textLines} ${suggestion.length} chars</label>
						<label class="aai-blank">${SVG.star2} Quality: ${this.json?.metrics?.quality?.excerpts?.[index]}%</label>
						<label class="aai-blank">${SVG.search2} SEO: ${this.json?.metrics?.seo?.excerpts?.[index]}%</label>
						</div>
						<div class="aai-edit-suggestion">${SVG.edit2}</div>
						<div class="aai-selector">
							${SVG.square}
							${SVG.squareCheck}
						</div>
					</div>`
				});
				HTML += `
				</div>
				<div class="original">${this.original.excerpt}</div>
			</div>
		</div>`


		return HTML;


	}


	// Description Suggestions HTML
	descriptionSuggestionsHTML() {

		let comment = this.json.content.comment || '';
		if ( comment ) {
			comment = this.stripHtmlTags(comment);
			comment += ` ${__('Select a suggestion', 'copyspell-ai')}.`;
		} else {
			comment = __("Oops—no response from the model. Please try another model or tweak your prompt and try again", 'copyspell-ai');
		}

		let HTML = `
		<div class="aai-card aai-suggestions-card aai-suggestions-content" alt="content">
			<div class="aai-card-header">
				<h3>${SVG.text} ${__('Select a Description', 'copyspell-ai')}</h3>
				<p class="comment">${comment}.</p>
			</div>
			<div class="aai-card-body">
				<div class="aai-flex">`
				this.json.content.suggestions.forEach( ( suggestion, index ) => {
					HTML += this.singleDescriptionHTML( suggestion, index );
				})
				HTML += `
				</div>
				<div class="original">${this.original.content}</div>
			</div>
		</div>
			
		</div>`



		return HTML;


	}


	// Single Description HTML
	singleDescriptionHTML( suggestion, index ) {
		if ( typeof suggestion !== 'string' ) suggestion = '';
		let wordCount = suggestion.trim().split(/\s+/).length || 0;


		let revision = this.revisions.content[index][this.currentRevision.content[index]] || suggestion || '';


		let clss = ''
		if ( this.selected.idx_description === String(index) ) {
			clss = 'aai-selected';
		}

		let HTML = `
		<div class="aai-suggestion-wrapper" alt="${index}">
			<div class="aai-card aai-suggestion aai-selectable aai-no-header aai-card-small aai-flex-3 ${clss}" alt="${index}">
				<div class="aai-revisions">${this.revisionsHTML('content', index)}</div>
				<div class="aai-body aai-description">${revision}</div>
				<div class="aai-labels">
					<label class="aai-blank">${SVG.words} ${wordCount} words</label>
					<label class="aai-blank">${SVG.star2} Quality: ${this.json?.metrics?.quality?.contents?.[index]}%</label>
					<label class="aai-blank">${SVG.engagement} Engagement: ${this.json?.metrics?.engagement?.contents?.[index]}%</label>
					<label class="aai-blank">${SVG.conversion} Conversion: ${this.json?.metrics?.conversion?.contents?.[index]}%</label>
					<label class="aai-blank">${SVG.search2} SEO: ${this.json?.metrics?.seo?.contents?.[index]}%</label>
				</div>
				<div class="aai-edit-suggestion">${SVG.edit2}</div>
				<div class="aai-selector">
					${SVG.square}
					${SVG.squareCheck}
				</div>
			</div>
			${this.refinementPromptsHTML(index)}
		</div>`
		
		return HTML;


	}


	// Refinement Prompts HTML
	refinementPromptsHTML( index, prompts ) {
		this.json.content.refinementPrompts = this.json.content.refinementPrompts || {};
		prompts = prompts || this.json.content.refinementPrompts[index] || [];

		let HTML = `
			<div class="aai-refinement-prompts">`
			if ( prompts ) {
				prompts.forEach( prompt => {
					HTML += `<span class="aai-chip">${prompt}</span>`
				});
				HTML += `<span class="aai-chip aai-custom" alt="longer">${__('Make it longer', 'copyspell-ai')}</span>`
				HTML += `<span class="aai-chip aai-custom" alt="shorter">${__('Make it shorter', 'copyspell-ai')}</span>`
				HTML += `<span class="aai-chip aai-custom" alt="custom">${__('Custom changes', 'copyspell-ai')}</span>`
			}
			HTML += `
			</div>`

		return HTML;

	}








	// MARK: ACTIONS






	// MARK: Edit
	// ────────────────────────────────────
	editSuggestion( btn ) {

		let suggestion = btn.closest('.aai-suggestion');
		let card = suggestion.closest('.aai-suggestions-card ');
		suggestion.classList.add('aai-editing');
		let body = suggestion.querySelector('.aai-body');
		body.contentEditable = true;
		let type = card.getAttribute('alt') || 'content';
		let index = suggestion.getAttribute('alt') || 0;
		let revisionIndex = this.currentRevision[type][index] || 0;

		this.revisions[type] = this.revisions[type] || [];
		this.revisions[type][index] = this.revisions[type][index] || [];

		let buttons = `
		<div class="aai-card-buttons">
			<button class="aai-btn aai-btn-secondary">Cancel</button>
			<button class="aai-btn aai-btn-primary">Keep</button>
		</div>`


		if ( ! suggestion.querySelector('.aai-card-buttons') ) {
			suggestion.insertAdjacentHTML('beforeend', buttons);
		}


		// on click keep button
		let keepBtn = suggestion.querySelector('.aai-card-buttons button.aai-btn-primary');
		keepBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			suggestion.classList.remove('aai-editing');
			body.contentEditable = false;
			this.revisions[type][index].push( body.innerHTML || '' );
			this.currentRevision[type][index] = this.revisions[type][index].length - 1;
			// delete buttons
			let buttons = suggestion.querySelector('.aai-card-buttons');
			buttons?.remove();

			let revisionsElement = suggestion.querySelector('.aai-revisions');
			if ( revisionsElement ) {
				revisionsElement.innerHTML = this.revisionsHTML(type, index);
			}

			//console.log('Revisions for', type, this.revisions[type]);
		});


		// on click cancel button
		let cancelBtn = suggestion.querySelector('.aai-card-buttons button.aai-btn-secondary');
		cancelBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			suggestion.classList.remove('aai-editing');
			body.contentEditable = false;
			// restore original content
			body.innerHTML = this.revisions[type][index][revisionIndex] || '';
			// delete buttons
			let buttons = suggestion.querySelector('.aai-card-buttons');
			buttons?.remove();
		});



		body.focus();

	}




	// MARK: Refine
	// ────────────────────────────────────
	async refineSuggestion( span ) {


		if ( ! await TOOLS.isAllowed('product-refine') ) return;


		let wrapper = span.closest('.aai-suggestion-wrapper')
		let suggestion = wrapper.querySelector('.aai-suggestion');
		let prompts = suggestion.querySelector('.aai-refinement-prompts');
		let card = suggestion.closest('.aai-suggestions-card ');
		let body = suggestion.querySelector('.aai-body');
		//let type = card.getAttribute('alt') || 'content';
		//let index = suggestion.getAttribute('alt') || 0;
		//let revisionIndex = this.currentRevision[type][index] || 0;



		
		// Set user prompt
		let userPrompt = '';
		if (span.getAttribute('alt') === 'custom') {
			let customPrompt = await customRefinement();
			if (!customPrompt) return;
			userPrompt = customPrompt
		} else {
			userPrompt = span.textContent.trim() || span.val().trim() || '';
		}



		
		wrapper.querySelector('.aai-refinement-prompts').remove()

		const loaderDiv = document.createElement('div');
		loaderDiv.className = 'aai-loader';
		loaderDiv.innerHTML = SVG.loader7;
		suggestion.appendChild(loaderDiv);
		// Scroll to the top of the suggestions card
		card.scrollIntoView({ behavior: 'smooth', block: 'center' });

		suggestion.classList.add('aai-refining');

		/*
		let prompt = {
			contentToRefine: body.innerHTML.trim() || '',
			refinementPrompt: userPrompt,
		}
		*/

		// •••••••••••••••••••••••••••••••••••••
		let response = await copyspellAIContent.refine( userPrompt, body.innerHTML.trim() )
		// •••••••••••••••••••••••••••••••••••••

		
		if ( ! response || response.error ) {
			suggestion.classList.remove('aai-refining');
			loaderDiv.remove();
			
			const errorDiv = document.createElement('div');
			errorDiv.className = 'aai-error-message';
			errorDiv.innerHTML = response?.error || 'Error';
			wrapper.appendChild( errorDiv );
			errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });


			_log('❌ Error refining suggestion:', response.error);
			return;
		}



		// Finalize
		this.finalizeRefinement( response, suggestion, loaderDiv )



		//console.log('--- CopySpell AI - REFINEMENT -', response.meta);

	}



	// MARK: Finalize Refinement
	// ────────────────────────────────────
	finalizeRefinement( response, suggestion, loaderDiv ) {
		let card = suggestion.closest('.aai-suggestions-card ');
		let body = suggestion.querySelector('.aai-body');
		let type = card.getAttribute('alt') || 'content';
		let index = suggestion.getAttribute('alt') || 0;

		suggestion.classList.remove('aai-refining');
		loaderDiv.remove();

	
		body.innerHTML = response.content || '';

		let refinementPrompts = this.refinementPromptsHTML(index, response.refinementPrompts);
		suggestion.insertAdjacentHTML('afterend', refinementPrompts);



		
		this.revisions[type] = this.revisions[type] || [];
		this.revisions[type][index] = this.revisions[type][index] || [];
		this.revisions[type][index].push( response.content || '' );
			this.currentRevision[type][index] = this.revisions[type][index].length - 1;

		let revisionsElement = suggestion.querySelector('.aai-revisions');
		if ( revisionsElement ) {
			revisionsElement.innerHTML = this.revisionsHTML(type, index);
		}

		//console.log('Revisions for', type, this.revisions[type]);
		
		//body.focus();

	}





	// MARK: Custom Refinement
	// ────────────────────────────────────
	async customRefinement1() {
		return new Promise((resolve, reject) => {

			// Create modal overlay
			const modalOverlay = document.createElement('div');
			modalOverlay.className = 'aai-modal-overlay';

			// Create modal
			const modal = document.createElement('div');
			modal.className = 'aai-modal';

			// Create modal content
			const modalContent = document.createElement('div');
			modalContent.className = 'aai-modal-content';

			// Create textarea
			const textarea = document.createElement('textarea');
			textarea.className = 'aai-custom-refinement-textarea';
			textarea.placeholder = __("How would you like me to change this content?", 'copyspell-ai');

			// Create buttons container
			const buttonsDiv = document.createElement('div');
			buttonsDiv.style.cssText = 'margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;';

			// Create cancel button
			const cancelBtn = document.createElement('button');
			cancelBtn.textContent = 'Cancel';
			cancelBtn.className = 'aai-btn aai-btn-secondary medium';

			// Create apply button
			const applyBtn = document.createElement('button');
			applyBtn.textContent = 'Apply';
			applyBtn.className = 'aai-btn aai-btn-primary medium';

			// Assemble modal
			buttonsDiv.appendChild(cancelBtn);
			buttonsDiv.appendChild(applyBtn);
			modalContent.appendChild(textarea);
			modalContent.appendChild(buttonsDiv);
			modal.appendChild(modalContent);
			modalOverlay.appendChild(modal);

			// Add to body
			document.body.appendChild(modalOverlay);

			// Focus textarea
			textarea.focus();

			// Event handlers
			cancelBtn.onclick = () => {
				document.body.removeChild(modalOverlay);
				reject('cancelled');
			};

			applyBtn.onclick = () => {
				const customPrompt = textarea.value.trim();
				if (customPrompt) {
					document.body.removeChild(modalOverlay);
					resolve(customPrompt);
				}
			};

			// Close on overlay click
			modalOverlay.onclick = (e) => {
				if (e.target === modalOverlay) {
					document.body.removeChild(modalOverlay);
					resolve(false);
					//reject('cancelled');
				}
			};

			// Close on escape key
			document.addEventListener('keydown', function escapeHandler(e) {
				if (e.key === 'Escape') {
					document.removeEventListener('keydown', escapeHandler);
					if (document.body.contains(modalOverlay)) {
						document.body.removeChild(modalOverlay);
					}
					resolve(false);
					//reject('cancelled');
				}
			});
			


			
		})
	}




	// MARK: Select
	// ────────────────────────────────────
	// This function is called when a suggestion card is clicked.
	// It toggles the selected state of the button and updates the UI accordingly.
	// ────────────────────────────────────
	selectSuggestion( card ) {

		if (card.classList.contains('aai-selected')) {
			card.classList.remove('aai-selected');
		} else {
			card.classList.add('aai-selected');
			card.closest('.aai-flex').querySelectorAll('.aai-suggestion').forEach(sibling => {
				if (sibling !== card) sibling.classList.remove('aai-selected');
			});
		}

		
		// Set buttons
		this.setButtons('select')


		//console.log('Selected Data:', this.selected);



	}


	// MARK: Get Selected
	// ────────────────────────────────────
	// This function retrieves the selected data from the suggestions.
	// It checks if a suggestion for title, short description, or description is selected,
	// and returns an object with the selected values or the original product data if no selection is made.
	// ────────────────────────────────────
	getSelectedData() {
		let $panel = this.panel.$el;

		let selectedTitle = $panel.querySelector('.aai-product-suggestions .aai-suggestions-titles .aai-suggestion.aai-selected .aai-body');
		let selectedExcerpt = $panel.querySelector('.aai-product-suggestions .aai-suggestions-excerpt .aai-suggestion.aai-selected .aai-body');
		let selectedContent = $panel.querySelector('.aai-product-suggestions .aai-suggestions-content .aai-suggestion.aai-selected .aai-body');

		if ( !selectedTitle && !selectedExcerpt && !selectedContent ) {
			if ( this.selected.id ) return this.selected; // return previous selection if exists
			// If no selection is made, alert the user
			alert( __('Please select a suggestion for title, short description, or description.', 'copyspell-ai') );
			return;
		}
		return {
			id			: this.original.id,
			name		: selectedTitle?.textContent.trim() || this.original.title,
			description	: selectedContent?.innerHTML.trim() || this.original.content,
			short_description	: selectedExcerpt?.textContent.trim() || this.original.excerpt,
			idx_name : selectedTitle?.closest('.aai-suggestion')?.getAttribute('alt') || 0,
			idx_description : selectedContent?.closest('.aai-suggestion')?.getAttribute('alt') || 0,
			idx_short_description : selectedExcerpt?.closest('.aai-suggestion')?.getAttribute('alt') || 0,
		};

	}


	// MARK: Preview
	// ────────────────────────────────────
	// This function displays the selected data in the panel.
	// It shows the name, description, and short description of the selected product.
	// It also sets up the continue and back buttons for further actions.
	// ────────────────────────────────────
	showPreview() {
		let $panelBody = this.panel.$body;
		if ( ! this.selected || ! this.selected.id ) {
			_log('⚠️ No data provided for selected refinement');
			return;
		}
		//console.log('Selected Data:', this.selected);


		let HTML = `
		<!-- Preview -->
		<div class="aai-preview">


			<!-- Original -->
			<div class="aai-original-post">
				<h3>${__('Original Content', 'copyspell-ai')}</h3>
				<div class="aai-card aai-no-header">
				
					<div class="aai-block aai-title">
						<h1 class="aai-selected">${this.original.title}</h1>
					</div>
					<div class="aai-block aai-description">
						<div class="aai-selected">${this.original.content}</div>
					</div>
					<div class="aai-block aai-excerpt">
						<div class="aai-card aai-no-header">
							<label>short description:</label>
							<div class="aai-selected">${this.original.excerpt}</div>
						</div>
					</div>

				</div>
			</div>


			<!-- Selected -->
			<div class="aai-selected-post">
				<h3>${__('AI Content', 'copyspell-ai')}</h3>
				<div class="aai-card aai-no-header">
					<div class="aai-block aai-title">
						<h1 class="aai-selected">${this.selected.name}</h1>
					</div>
					<div class="aai-block aai-description">
						<div class="aai-selected">${this.selected.description}</div>
					</div>
					<div class="aai-block aai-excerpt">
						<div class="aai-card aai-no-header">
							<label>short description:</label>
							<div class="aai-selected">${this.selected.short_description}</div>
						</div>
					</div>
				</div>
			</div>


		</div>
		`;

		$panelBody.innerHTML = HTML;
		$panelBody.scrollTo({ top: 0, behavior: 'smooth' });


		
		// Set buttons
		this.setButtons('preview')



		// Back button handler
		//$panel.querySelector('.aai-panel-footer button[alt="back"]').onclick = this.showSuggestions.bind(this);



	}


	// MARK: Set Buttons
	// ────────────────────────────────────
	// This function sets the visibility of the buttons in the panel.
	// It updates the prompt text and shows or hides buttons based on the current status.
	// ────────────────────────────────────
	setButtons( status='loading' ) {
//console.log('Set buttons status:', status);
		let $buttons = this.panel.$footer
		$buttons.innerHTML = `
			<button class="aai-btn-big" alt="back">${SVG.back}${__('Back', 'copyspell-ai')}</button>
			<button class="aai-btn-big" alt="preview">${SVG.preview}${__('Preview', 'copyspell-ai')}</button>
			<button class="aai-btn-big" alt="continue">${__('Continue', 'copyspell-ai')}</button>
			<button class="aai-btn-big" alt="update">${SVG.apply}${__('Update Product', 'copyspell-ai')}</button>
			<div class="aai-prompt"></div>
		`;
		//$buttons.querySelector('.aai-prompt').textContent = '';
		$buttons.querySelector('.aai-prompt').style.display = 'none';
		$buttons.querySelector('button[alt="back"]').style.display = 'none';
		$buttons.querySelector('button[alt="preview"]').style.display = 'none';
		$buttons.querySelector('button[alt="continue"]').style.display = 'none';
		$buttons.querySelector('button[alt="update"]').style.display = 'none';
		
		// Back button handler
		this.panel.$el.querySelector('.aai-panel-footer button[alt="back"]').onclick = this.onBack;


		this.buttonsEvents();



		// SUGGESTIONS
		if ( status == 'suggestions' ) {
		
			// select prompt
			$buttons.querySelector('.aai-prompt').textContent = `${__('select a refined title, excerpt or description...', 'copyspell-ai')}`;
			$buttons.querySelector('.aai-prompt').style.display = 'block';

		}


		// SELECT SUGGESTION
		if ( status == 'select' ) {
			
			// show/hide prompt or continue button
			let selectedCount = this.panel.$el.querySelectorAll('.aai-product-suggestions .aai-suggestion.aai-selected').length;
			if (selectedCount > 0) {
				//$buttons.querySelector('button[alt="back"]').style.display = 'flex';
				$buttons.querySelector('button[alt="preview"]').style.display = 'flex';
				$buttons.querySelector('button[alt="update"]').style.display = 'flex';
			} else {
				$buttons.querySelector('.aai-prompt').style.display = 'block';
			}

		}




		// PREVIEW
		if ( status == 'preview' ) {
			
			// show back and update buttons
			$buttons.querySelector('button[alt="back"]').style.display = 'flex';
			$buttons.querySelector('button[alt="update"]').style.display = 'flex';

			// Back button handler
			this.panel.$el.querySelector('.aai-panel-footer button[alt="back"]').onclick = this.showSuggestions.bind(this);


		}



	}


















	// MARK: REVISIONS
	// ────────────────────────────────────


	// Revisions HTML
	revisionsHTML( type, index ) {
		let currentRevision = this.currentRevision[type][index] || 0;
		let totalRevisions = this.revisions[type][index]?.length || 0;

		//console.log(type, index, '- totalRevisions', totalRevisions);
		//console.log(type, index, '- currentRevision', currentRevision);

		if ( totalRevisions <= 1 ) return '';


		let labels = this.panel.$el.querySelector(`.aai-suggestions-card[alt="${type}"] .aai-suggestion[alt="${index}"] .aai-labels`);
		if ( labels ) {
			labels.style.display = 'flex';
			if ( currentRevision > 0 ) labels.style.display = 'none';
		}


		let HTML = `
			<label>${__('Revisions', 'copyspell-ai')}: <b>${currentRevision + 1}/${totalRevisions}</b></label>
			<div class="aai-revisions-buttons">`
		if ( totalRevisions > 0 ) {
			HTML += `
				<div class="aai-prev-revision" data-action="prev">${SVG.caret}</div>
				<div class="aai-next-revision" data-action="next">${SVG.caret}</div>`
		}
		HTML += `</div>`

		return HTML;
	}


	// Previous Revision
	showNextRevision( e ) {
		let btn = e.target.closest('.aai-next-revision');
		if (btn) {
			let suggestion = btn.closest('.aai-suggestion');
			let index = suggestion.getAttribute('alt') || 0;
			let type = suggestion.closest('.aai-suggestions-card').getAttribute('alt') || 'content';
			let body = suggestion.querySelector('.aai-body');
			this.currentRevision[type][index] = Math.min(this.currentRevision[type][index] + 1, this.revisions[type][index].length - 1);
			body.innerHTML = this.revisions[type][index][this.currentRevision[type][index]] || '';
			let revisionsElement = suggestion.querySelector('.aai-revisions');
			if ( revisionsElement ) {
				revisionsElement.innerHTML = this.revisionsHTML(type, index);
			}
		}
	}


	// Next Revision
	showPrevRevision( e ) {
		let btn = e.target.closest('.aai-prev-revision');
		if (btn) {
			let suggestion = btn.closest('.aai-suggestion');
			let index = suggestion.getAttribute('alt') || 0;
			let type = suggestion.closest('.aai-suggestions-card').getAttribute('alt') || 'content';
			let body = suggestion.querySelector('.aai-body');
			this.currentRevision[type][index] = Math.max(this.currentRevision[type][index] - 1, 0);
			body.innerHTML = this.revisions[type][index][this.currentRevision[type][index]] || '';
			let revisionsElement = suggestion.querySelector('.aai-revisions');
			if ( revisionsElement ) {
				revisionsElement.innerHTML = this.revisionsHTML(type, index);
			}
		}
	}






















	// MARK: HELPERS








	// MARK: Update
	// ────────────────────────────────────
	// This function updates the product with the provided data.
	// ────────────────────────────────────
	async updateProduct( data ) {
//console.log('updateProduct ***************************')
//return
		if ( !data || !data.id ) {
			_log('⚠️ No product data provided for update');
			return;
		}

		delete data.idx_short_description
		delete data.idx_description
		delete data.idx_name



		// Allow addons to modify product data before update
		// Usage: SDK.filters.add('before_update_product', (data, context) => { ... return modifiedData; })
		data = await SDK.filters.applyAsync('before_update_product', data, { ...this });


		// Update product via WooCommerce API
		let response = await wpAPI.updateProduct( data.id, data );

		


		let product = this.data?.products?.[0] || DATA.post || {};
		let content = {
			title: data.name || '',
			excerpt: data.short_description || '',
			content: data.description || '',
		}

		// Only add if original doesn't exist
		if (! await AIH.recordExists( content, product.id )) {
			await AIH.addRecord(0, product.id || 0, 
				{
					_type: 'published',
					_action: 'product-content',
					api: this.data.api || '',
					model: this.data.model || '',
					duration: this.data.duration || 0,
				}, 
				content
			);
		}

		

		if ( response && response.id ) {
			//console.log('Product updated successfully:', response);
			return response;
		} else {
			_log('❌ Failed to update product:', response);
			return null;
		}

	}





	// MARK: Strip HTML
	// ────────────────────────────────────
	stripHtmlTags(html) {
		const div = document.createElement('div');
		div.innerHTML = html;
		return div.textContent || div.innerText || '';
	}




	// MARK: Format Date
	// ────────────────────────────────────
	formatDate( dateString ) {
 		if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();
        const diffInMilliseconds = now - date;
        const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);
        const diffInWeeks = Math.floor(diffInDays / 7);
        const diffInMonths = Math.floor(diffInDays / 30);
        const diffInYears = Math.floor(diffInDays / 365);

        if (diffInSeconds < 60) {
            return __('just now', 'copyspell-ai');
        } else if (diffInMinutes === 1) {
            return __('1 minute ago', 'copyspell-ai');
        } else if (diffInMinutes < 60) {
            return `${__(': ', 'copyspell-ai')}${diffInMinutes} ${__('minutes ago', 'copyspell-ai')}`;
        } else if (diffInHours === 1) {
            return __('1 hour ago', 'copyspell-ai');
        } else if (diffInHours < 24) {
            return `${__(': ', 'copyspell-ai')}${diffInHours} ${__('hours ago', 'copyspell-ai')}`;
        } else if (diffInDays === 1) {
            return __('1 day ago', 'copyspell-ai');
        } else if (diffInDays < 7) {
            return `${__(': ', 'copyspell-ai')}${diffInDays} ${__('days ago', 'copyspell-ai')}`;
        } else if (diffInWeeks === 1) {
            return __('1 week ago', 'copyspell-ai');
        } else if (diffInWeeks < 4) {
            return `${__(': ', 'copyspell-ai')}${diffInWeeks} ${__('weeks ago', 'copyspell-ai')}`;
        } else if (diffInMonths === 1) {
            return __('1 month ago', 'copyspell-ai');
        } else if (diffInMonths < 12) {
            return `${__(': ', 'copyspell-ai')}${diffInMonths} ${__('months ago', 'copyspell-ai')}`;
        } else if (diffInYears === 1) {
            return __('1 year ago', 'copyspell-ai');
        } else {
            return `${__(': ', 'copyspell-ai')}${diffInYears} ${__('years ago', 'copyspell-ai')}`;
        }

	}




}




















let sampleMeta = {
    "title": {
        "comment": "The original title is too generic.  These suggestions aim for better SEO and click-through rates by highlighting key features and benefits.",
        "suggestions": [
            "Lightweight Water-Resistant Jacket: Packable & Perfect for Travel",
            "Stay Dry in Style: Versatile Water-Resistant Jacket for All Seasons",
            "Men's/Women's Everyday Jacket: Water Resistant & Breathable"
        ]
    },
    "excerpt": {
        "comment": "The original excerpt lacks persuasive language. These suggestions focus on benefits and create a sense of urgency.",
        "suggestions": [
            "Lightweight, water-resistant, and perfect for layering. This jacket offers comfort and protection without the bulk.  Order yours today!",
            "Stay dry and stylish with this versatile jacket.  Its water-resistant design and convenient pockets make it ideal for any adventure."
        ]
    },
    "content": {
        "comment": "The original content is good but can be improved with more persuasive language, SEO keywords, and a more structured format.  The photographer's credit should be less prominent.",
        "suggestions": [
            "<p><strong>Stay comfortable and protected from the elements with our lightweight, water-resistant jacket.</strong></p>\n<p>Perfect for layering during transitional weather, this jacket features a durable water-resistant outer shell to keep you dry.  Adjustable cuffs provide a customized fit, while multiple pockets offer convenient storage for your essentials.</p>\n<ul>\n  <li><strong>Lightweight and packable:</strong>  Easily folds for travel or storage.</li>\n  <li><strong>Water-resistant shell:</strong>  Keeps you dry in light rain and drizzle.</li>\n  <li><strong>Multiple pockets:</strong>  Provides ample space for your phone, wallet, and keys.</li>\n  <li><strong>Adjustable cuffs:</strong>  Ensures a snug and comfortable fit.</li>\n</ul>\n<p>Upgrade your wardrobe with this versatile and practical jacket. Order yours today!</p>",
            "<p><strong>Experience ultimate comfort and protection with our versatile water-resistant jacket.</strong></p>\n<h2>Designed for everyday adventures</h2>\n<p>Whether you're navigating unpredictable weather or simply need a reliable layer for added warmth, this jacket has you covered. Its lightweight design makes it perfect for layering, while the water-resistant outer shell keeps you dry and comfortable. </p>\n<h3>Key Features:</h3>\n<ul>\n  <li>Durable, water-resistant fabric</li>\n  <li>Multiple pockets for secure storage</li>\n  <li>Adjustable cuffs for a personalized fit</li>\n  <li>Lightweight and breathable design</li>\n</ul>\n<p>Don't let the weather dictate your plans. Order your jacket now and experience the difference!</p>"
        ]
    }
}


















