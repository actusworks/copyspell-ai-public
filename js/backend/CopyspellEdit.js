import SVG 					from '../shared/svg.js';
import copyspellAIContent 	from '../shared/AI/ai-content.js';
import copyspellAIMarketing	from '../shared/AI/ai-marketing.js';
import AISettings           from "../shared/AI/ai-settings.js";
import { customRefinement } from '../shared/AI/ai-common.js';
import TOOLS            	from "../shared/tools.js";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const SDK = window.CopyspellAI || {};
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;



TOOLS.loadCSS(`source-preview.css?v=${DATA.version}`);
TOOLS.loadCSS(`seo.css?v=${DATA.version}`);






// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: COPYSPELL AI INLINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class CopyspellEdit {
	

	// ────────────────────────────────────
	constructor() {

		this.init();

	}



	// MARK: Init
	// ────────────────────────────────────
	init() {
		
		this.copySpellButtons();

		document.querySelectorAll('#copyspell-ai-metabox-app .aai-btn')
			.forEach(btn => btn.classList.remove('aai-disabled'));


		this.titleAIButton();

		
		setTimeout(() => {

			if (document.querySelector('#poststuff #postdivrich .postbox-header')) {
				this.descriptionAIButton()
			} else {
				setTimeout(() => {
					this.descriptionAIButton()
				}, 500);
			}
		}, 500);

		
		this.excerptAIButton()


	}





	// MARK: AI buttons
	// ────────────────────────────────────
	copySpellButtons() {

		//this.$metabox = document.getElementById('copyspell_ai_metabox');

		// Add the postbox after the publish metabox
		//const submitDiv = document.getElementById('submitdiv');
		//submitDiv.parentNode.insertBefore(this.$metabox, submitDiv.nextSibling);


		SDK.ui.renderSlots()


		// EVENTS ==================================
	
		// click - Product Content
		// ────────────────────────────────────
		document.getElementById('copyspell-ai-generate-content').addEventListener('click', async (e) => {

			new copyspellAIContent('product-content');

		});

		// click - Marketing
		// ────────────────────────────────────
		document.getElementById('copyspell-ai-generate-marketing').addEventListener('click', async (e) => {

			new copyspellAIMarketing('marketing-content');

		});

		
	}



	// MARK: SEO report render
	// ────────────────────────────────────
	seoReportRender( response ){
		
		let json = response.json || {};
		// Generate SEO Report HTML
		//const seoReportHTML = generateSEOReport( json );

		const modal = document.createElement('div');
		modal.className = 'source-preview-modal';
		modal.innerHTML = `
			<div class="source-preview-backdrop"></div>
			<div class="source-preview-container">
				<div class="source-preview-header">
					<div class="source-preview-title">
						<span>${__('SEO Report', 'copyspell-ai')}</span>
					</div>
					<button class="source-preview-close">&times;</button>
				</div>
				<div class="source-preview-content">
					${response.content}
				</div>
				<div class="source-preview-footer">
					<button class="aai-btn aai-btn-secondary aai-cancel">${__('Cancel', 'copyspell-ai')}</button>
					<button class="aai-btn aai-btn-primary aai-save-changes">${__('Save', 'copyspell-ai')}</button>
				</div>
			</div>
		`;
		
		// Add to document
		document.body.appendChild(modal);

		setTimeout(() => {
			modal.classList.add('active');
		}, 10);


	}







	// MARK: Title button
	// ────────────────────────────────────
	titleAIButton() {


		const aiButton = document.createElement('button');
		aiButton.type = 'button';
		aiButton.className = 'aai-title-ai-button';
		aiButton.innerHTML = `
			<img src="${DATA.logo}" alt="CopySpell AI Logo">
		`;


		// Add button after the publish metabox
		const titleWrap = document.querySelector('#poststuff #titlewrap');
		if (titleWrap) {
			titleWrap.appendChild(aiButton);
		}



		// EVENTS ==================================

		// button click
		// ────────────────────────────────────
		aiButton.addEventListener('click', async (e) => {
			e.preventDefault();
			this.titleAIpop();
		});


	}



	// MARK: Title popover
	// ────────────────────────────────────
	async titleAIpop() {


	
		// Toggle if already exists
		const existingPop = document.querySelector('.aai-title-ai-pop');
		if (existingPop) {
			existingPop.remove();
			return;
		}

		
		// Create the popup element
		const titleAIPop = document.createElement('div');
		titleAIPop.className = 'aai-ai-pop aai-title-ai-pop';
		titleAIPop.innerHTML = `
			<div class="aai-buttons">
				<div class="aai-button aai-button-2">${__("Suggest 5 titles", 'copyspell-ai')}</div>
				<div class="aai-button aai-button-1">${SVG.gear}</div>
			</div>
		`;


		// Insert after title wrap
		const titleWrap = document.querySelector('#poststuff #titlewrap');
		titleWrap.insertAdjacentElement('afterend', titleAIPop);


		


		// EVENTS ==================================
		const buttonsDiv = titleAIPop.querySelector('.aai-buttons');
		const button1 = titleAIPop.querySelector('.aai-button-1');
		const button2 = titleAIPop.querySelector('.aai-button-2');
		


		// Settings button click
		// ────────────────────────────────────
		button1.addEventListener('click', async () => {

			//new copyspellAIContent('settings');
			AISettings.run('product-suggest');

		});



		// Suggest titles button click
		// ────────────────────────────────────
		button2.addEventListener('click', async () => {
			
			if ( ! await TOOLS.isAllowed('product-suggest-titles') ) return;

			// Show loading			
			buttonsDiv.innerHTML = `<div class="copyspell-ai-loading"><span>${__('thinking', 'copyspell-ai')}...</span>${SVG.loader14}</div>`;

			let responseMeta;
			if (!DATA.sample_call) {
				// •••••••••••••••••••••••••••••••••••••
				responseMeta = await copyspellAIContent.suggest('titles');
				// •••••••••••••••••••••••••••••••••••••
			} else {
				responseMeta = sampleTitles;
			}

			if ( !responseMeta || responseMeta.error ) {
				buttonsDiv.innerHTML = `<div class="aai-error-message">${ responseMeta?.error || 'Error' }</div>`;
				return;
			}

			this.titleAIResult( responseMeta, titleAIPop );
			
			

		});

	}



	// MARK: Title result
	// ────────────────────────────────────
	async titleAIResult( responseMeta, titleAIPop ) {


		titleAIPop.innerHTML = `
			<div class="aai-pop-suggestions aai-pop-suggested-titles">
				<ul>
					${responseMeta.suggestions.map(s => `<li class="aai-pop-suggestion aai-pop-suggested-title">${s}</li>`).join('')}
				</ul>
			</div>
		`;


		// EVENTS ==================================

		// Add click handlers to all suggested titles
		const suggestedTitles = titleAIPop.querySelectorAll('.aai-pop-suggested-title');
		suggestedTitles.forEach(title => {
			title.addEventListener('click', function() {
				
				// Update the post title
				const titleInput = document.querySelector('#poststuff #titlewrap input#title');
				titleInput.value = this.textContent;
				titleInput.dispatchEvent(new Event('input')); // Trigger input event

			});
		});


	}


	





	// MARK: Description button
	// ────────────────────────────────────
	descriptionAIButton() {
	
		const aiButton = document.createElement('button');
		aiButton.type = 'button';
		aiButton.className = 'aai-descr-ai-button';
		aiButton.innerHTML = `
			<img src="${DATA.logo}" alt="CopySpell AI Logo">
		`;


		// Add button after the publish metabox
		const postboxHeader = document.querySelector('#poststuff #postdivrich .postbox-header');
		if (postboxHeader) {
			postboxHeader.appendChild(aiButton);
		}
		



		// EVENTS ==================================


		// button click
		// ────────────────────────────────────
		aiButton.addEventListener('click', async (e) => {
			e.preventDefault();
			this.descriptionAIpop();
		});

	}



	// MARK: Description popover
	// ────────────────────────────────────
	async descriptionAIpop() {


		// Toggle if already exists
		const existingPop = document.querySelector('.aai-description-ai-pop');
		if (existingPop) {
			existingPop.remove();
			return;
		}
		

		// Create the popup element
		const descriptionAIPop = document.createElement('div');
		descriptionAIPop.className = 'aai-ai-pop aai-description-ai-pop';
		descriptionAIPop.innerHTML = `
			<div class="aai-buttons">
				<input class="aai-input small" placeholder="what would you like different?">
				<div class="aai-button-4">${SVG.play}</div>
				<div class="aai-button aai-button-2">${__("Suggest 2 descriptions", 'copyspell-ai')}</div>
				<div class="aai-button aai-button-1">${SVG.gear}</div>
			</div>
		`;

		// Insert before postdivrich
		const postdivrich = document.querySelector('#poststuff #postdivrich');
		postdivrich.parentNode.insertBefore(descriptionAIPop, postdivrich);



		// EVENTS ==================================

		// Settings button click
		// ────────────────────────────────────
		descriptionAIPop.querySelector('.aai-button-1').addEventListener('click', async () => {
			
			//new copyspellAIContent('settings');
			AISettings.run('product-suggest');

		});


		
		// Click custom change
		// ────────────────────────────────────
		descriptionAIPop.querySelector('.aai-button-4').addEventListener('click', async (e) => {
			
			const userPrompt = e.currentTarget.parentElement.querySelector('.aai-input').value.trim();
			if (!userPrompt) return;

			if ( ! await TOOLS.isAllowed('product-change') ) return;

			descriptionAIPop.querySelector('.aai-buttons').innerHTML = `<div class="copyspell-ai-loading"><span>${__('thinking', 'copyspell-ai')}...</span>${SVG.loader14}</div>`;

			let response = await this.customChangeCall(userPrompt);

				
			if ( !response || response.error ) {
				descriptionAIPop.querySelector('.aai-buttons').innerHTML = `<div class="aai-error-message">${ response?.error || 'Error' }</div>`;
				return;
			}
			
			this.customChangeResult(response);
			
		});




		// Click suggest descriptions
		// ────────────────────────────────────
		descriptionAIPop.querySelector('.aai-button-2').addEventListener('click', async () => {

			if ( ! await TOOLS.isAllowed('product-suggest-descriptions') ) return;

			descriptionAIPop.querySelector('.aai-buttons').innerHTML = `<div class="copyspell-ai-loading"><span>${__('thinking', 'copyspell-ai')}...</span>${SVG.loader14}</div>`;

			let responseMeta;
			if (!DATA.sample_call) {
		
				// •••••••••••••••••••••••••••••••••••••
				responseMeta = await copyspellAIContent.suggest('descriptions');
				// •••••••••••••••••••••••••••••••••••••

			} else {
				responseMeta = sampleDescriptions;
			}

			if ( !responseMeta || responseMeta.error ) {
				descriptionAIPop.querySelector('.aai-buttons').innerHTML = `<div class="aai-error-message">${ responseMeta?.error || 'Error' }</div>`;
				return;
			}

			this.descriptionAIResult( responseMeta, descriptionAIPop );

		});


		
	}



	// MARK: Description result
	// ────────────────────────────────────
	async descriptionAIResult( responseMeta, descriptionAIPop ) {

		
		descriptionAIPop.innerHTML = `
			<div class="aai-pop-suggestions aai-pop-suggested-descriptions">
				${responseMeta.suggestions.map(s => `<div class="aai-pop-suggestion aai-pop-suggested-description">${s}</div>`).join('')}
			</div>
			<div class="aai-pop-controls">
				<div class="aai-pop-controls-left">
					<div class="aai-btn aai-btn-outline medium aai-pop-sug-1 active" alt="0">Suggestion 1</div>
					<div class="aai-btn aai-btn-outline medium aai-pop-sug-2" alt="1">Suggestion 2</div>
				</div>
				<div class="aai-pop-controls-right">
					<div class="aai-btn aai-btn-primary medium aai-pop-cancel">Cancel</div>
					<div class="aai-btn aai-btn-primary medium aai-pop-refine">Refine</div>
					<div class="aai-btn aai-btn-primary medium aai-pop-select">Select</div>
				</div>
			</div>
		`;
		descriptionAIPop.querySelector('.aai-pop-suggested-description:nth-child(1)').classList.add('active');
		descriptionAIPop.scrollIntoView({ behavior: 'smooth', block: 'center' });


		
		// EVENTS ==================================
	
		// click cancel
		// ────────────────────────────────────
		descriptionAIPop.querySelector('.aai-pop-cancel').addEventListener('click', async () => {
			descriptionAIPop.remove();
		});

		// click refine
		// ────────────────────────────────────
		descriptionAIPop.querySelector('.aai-pop-refine').addEventListener('click', async () => {
			this.refinementPrompts(responseMeta, result => {
				responseMeta = result;
			});
		});

		// click select
		// ────────────────────────────────────
		descriptionAIPop.querySelector('.aai-pop-select').addEventListener('click', async () => {
			this.setProductDescription(descriptionAIPop.querySelector('.aai-pop-suggested-description.active').innerHTML);
			const postdivrich = document.querySelector('#postdivrich');
			window.scrollTo({
				top: postdivrich.offsetTop - 50,
				behavior: 'smooth'
			});
		});

		// click suggestion
		// ────────────────────────────────────
		descriptionAIPop.querySelectorAll('.aai-pop-controls-left .aai-btn').forEach(btn => {
			btn.addEventListener('click', async function() {
				const refinementPop = document.querySelector('.aai-refinement-pop');
				if (refinementPop) refinementPop.remove();
				const selection = this.classList.contains('aai-pop-sug-1') ? 1 : 2;
	
				this.parentElement.querySelectorAll('.aai-btn').forEach(btn => btn.classList.remove('active'));
				this.classList.add('active');
				descriptionAIPop.querySelectorAll('.aai-pop-suggested-description').forEach(desc => desc.classList.remove('active'));
				descriptionAIPop.querySelector(`.aai-pop-suggested-description:nth-child(${selection})`).classList.add('active');
			});
		});


	}


	

	



	
	

	// MARK: excerpt button
	// ────────────────────────────────────
	excerptAIButton() {

		const aiButton = document.createElement('button');
		aiButton.type = 'button';
		aiButton.className = 'aai-excerpt-ai-button';
		aiButton.innerHTML = `
			<img src="${DATA.logo}" alt="CopySpell AI Logo">
		`;

		// Add button after the publish metabox
		const excerptHeader = document.querySelector('#poststuff #postexcerpt .postbox-header');
		if (excerptHeader) {
			excerptHeader.appendChild(aiButton);
		}


		// EVENTS ==================================



		// button click
		// ────────────────────────────────────
		aiButton.addEventListener('click', async (e) => {
			e.preventDefault();
			this.excerptAIpop();
		});


	}


	
	// MARK: excerpt popover
	// ────────────────────────────────────
	async excerptAIpop() {


		// Toggle if already exists
		const existingPop = document.querySelector('.aai-excerpt-ai-pop');
		if (existingPop) {
			existingPop.remove();
			return;
		}


		// Create the popup element
		const excerptAIPop = document.createElement('div');
		excerptAIPop.className = 'aai-ai-pop aai-excerpt-ai-pop';
		excerptAIPop.innerHTML = `
			<div class="aai-buttons">
				<div class="aai-button aai-button-2">${__("Suggest 3 short descriptions", 'copyspell-ai')}</div>
				<div class="aai-button aai-button-1">${SVG.gear}</div>
			</div>
		`;

		// Insert before postexcerpt
		const postexcerpt = document.querySelector('#poststuff #postexcerpt');
		postexcerpt.parentNode.insertBefore(excerptAIPop, postexcerpt);




		// EVENTS ==================================

			
		// click - Settings button
		// ────────────────────────────────────
		excerptAIPop.querySelector('.aai-button-1').addEventListener('click', async () => {
			
			//new copyspellAIContent('settings');
			AISettings.run('product-suggest');

		});



		// click - Suggest Excerpt button
		// ────────────────────────────────────
		excerptAIPop.querySelector('.aai-button-2').addEventListener('click', async () => {

			if ( ! await TOOLS.isAllowed('product-suggest-excerpts') ) return;

			excerptAIPop.querySelector('.aai-buttons').innerHTML = `<div class="copyspell-ai-loading"><span>${__('thinking', 'copyspell-ai')}...</span>${SVG.loader14}</div>`;

			let responseMeta;
			if (!DATA.sample_call) {

				// •••••••••••••••••••••••••••••••••••••
				responseMeta = await copyspellAIContent.suggest('excerpts');
				// •••••••••••••••••••••••••••••••••••••

			} else {
				responseMeta = sampleExcerpts;
			}

			
			if ( !responseMeta || responseMeta.error ) {
				excerptAIPop.querySelector('.aai-buttons').innerHTML = `<div class="aai-error-message">${ responseMeta?.error || 'Error' }</div>`;
				return;
			}

			this.excerptAIResult( responseMeta, excerptAIPop );
			

		});

		
	}



	// MARK: excerpt result
	// ────────────────────────────────────
	excerptAIResult( responseMeta, excerptAIPop ) {
		
		excerptAIPop.innerHTML = `
			<div class="aai-pop-suggestions aai-pop-suggested-excerpts">
				<ul>
					${responseMeta.suggestions.map(s => `<li class="aai-pop-suggestion aai-pop-suggested-excerpt">${s}</li>`).join('')}
				</ul>
			</div>
		`;

		excerptAIPop.querySelectorAll('.aai-pop-suggested-excerpt').forEach(excerpt => {
			excerpt.addEventListener('click', () => {
				this.setProductExcerpt( excerpt.innerHTML );
			});
		});

	}










	// MARK: Custom Change Call
	// ────────────────────────────────────
	async customChangeCall( prompt, content ) {
	
	
		// •••••••••••••••••••••••••••••••••••••
		let response = await copyspellAIContent.change( prompt, content );
		// •••••••••••••••••••••••••••••••••••••
		

		if ( !response || response.error ) {
			return response || { error: 'Error' };
		}

	
		return response
			
	}
	
	

	// MARK: Custom Change Result
	// ────────────────────────────────────
	async customChangeResult( response ) {

		const descriptionAIPop = document.querySelector('.aai-description-ai-pop');
		descriptionAIPop.innerHTML = `
			<div class="aai-pop-suggestions aai-pop-changed-content">
				<div class="aai-pop-suggestion aai-pop-suggested-description">${response.content}</div>
			</div>
			<div class="aai-pop-controls">
				<div class="aai-pop-controls-left">
				<div class="aai-custom-refine">
					<input class="aai-input small" placeholder="what would you like different?">
					<div class="aai-button-4">${SVG.play}</div>
				</div>
				</div>
				<div class="aai-pop-controls-right">
					<div class="aai-btn aai-btn-primary medium aai-pop-cancel">Cancel</div>
					<div class="aai-btn aai-btn-primary medium aai-pop-select">Keep</div>
				</div>
			</div>
		`;
		descriptionAIPop.scrollIntoView({ behavior: 'smooth', block: 'center' });


		

		// EVENTS ==================================

	
		// click cancel
		// ────────────────────────────────────
		descriptionAIPop.querySelector('.aai-pop-cancel').addEventListener('click', async () => {
			document.querySelector('.aai-description-ai-pop').remove();
		});


		// click select
		// ────────────────────────────────────
		descriptionAIPop.querySelector('.aai-pop-select').addEventListener('click', async () => {
			
			// set product description
			this.setProductDescription(document.querySelector('.aai-pop-suggested-description').innerHTML);
			const postdivrich = document.querySelector('#postdivrich');
			window.scrollTo({
				top: postdivrich.offsetTop - 50,
				behavior: 'smooth'
			});
			document.querySelector('.aai-description-ai-pop').remove();

		});

	
		// click change further
		// ────────────────────────────────────
		descriptionAIPop.querySelector('.aai-custom-refine .aai-button-4').addEventListener('click', async (e) => {
			const userPrompt = e.currentTarget.parentElement.querySelector('.aai-input').value.trim();
			if (!userPrompt) return;
			
			if ( ! await TOOLS.isAllowed('product-change') ) return;

			document.querySelector('.aai-description-ai-pop').innerHTML = `<div class="aai-buttons"><div class="copyspell-ai-loading"><span>${__('thinking', 'copyspell-ai')}...</span>${SVG.loader14}</div></div>`;
			descriptionAIPop.scrollIntoView({ behavior: 'smooth', block: 'center' });

			let newResponse = await this.customChangeCall(userPrompt, response.content);
			
			if ( !newResponse || newResponse.error ) {
				document.querySelector('.aai-description-ai-pop').querySelector('.aai-buttons').innerHTML = `<div class="aai-error-message">${ newResponse?.error || 'Error' }</div>`;
				return;
			}
			
			this.customChangeResult(newResponse);
		});
		
	}
	
	



















	// MARK: Set Product Description
	// ────────────────────────────────────
	setProductDescription(htmlContent) {
		// Try TinyMCE first (Classic Editor)
		if (typeof tinymce !== 'undefined' && tinymce.get('content')) {
			tinymce.get('content').setContent(htmlContent);
			tinymce.get('content').fire('change');
		}
		// Try Block Editor
		else if (wp.data && wp.data.dispatch('core/editor')) {
			wp.data.dispatch('core/editor').editPost({
				content: htmlContent
			});
		}
		// Fallback to textarea
		else {
			const contentElement = document.getElementById('content_ifr');
			if (contentElement) {
				contentElement.value = htmlContent;
				// Trigger input event to notify any listeners
				contentElement.dispatchEvent(new Event('input'));
			}
		}
	}



	

	// MARK: Set product excerpt
	// ────────────────────────────────────
	setProductExcerpt(htmlContent) {

		// Try TinyMCE first (Classic Editor)
		if (typeof tinymce !== 'undefined' && tinymce.get('excerpt')) {
			tinymce.get('excerpt').setContent(htmlContent);
			tinymce.get('excerpt').fire('change');
		}
		// Try Block Editor
		else if (wp.data && wp.data.dispatch('core/editor')) {
			wp.data.dispatch('core/editor').editPost({
				excerpt: htmlContent
			});
		}
		// Fallback to textarea
		else {
			$('#excerpt').val(htmlContent);
			$('#excerpt').trigger('input');
		}
	}






	// MARK: Refinement Prompts
	// ────────────────────────────────────
	refinementPrompts( responseData, callback ) {
		callback = callback || function(){};
		
		// Toggle if already exists
		const existingPop = document.querySelector('.aai-refinement-pop');
		if (existingPop) {
			existingPop.remove();
			return;
		}

		// Create refinement prompts HTML
		const activeBtn = document.querySelector('.aai-pop-controls-left .aai-btn.active');
		let index = parseInt(activeBtn.getAttribute('alt'));
		let prompts = responseData.refinementPrompts ? responseData.refinementPrompts[index] : [];
		let suggestion = responseData.suggestions ? responseData.suggestions[index] : '';
		//console.log(index, '---', prompts)

		const refinementPop = document.createElement('div');
		refinementPop.className = 'aai-refinement-pop';
		refinementPop.innerHTML = this.refinementPromptsHTML(prompts);
		
		const suggestionsContainer = document.querySelector('.aai-pop-suggested-descriptions');
		suggestionsContainer.insertAdjacentElement('afterend', refinementPop);


		
		
		// EVENTS ==================================

		// click - prompt spans
		// ────────────────────────────────────
		const promptSpans = refinementPop.querySelectorAll('span');
		promptSpans.forEach(span => {
			span.addEventListener('click', async (e) => {
				e.stopPropagation();

				let result = await this.refineSuggestion( span, suggestion );
				callback(result);

			});
		});



	}




	
	// MARK: Refine suggestion
	// ────────────────────────────────────
	async refineSuggestion( span, suggestion ) {
	
		// Set prompt
		let userPrompt = '';
		if (span.getAttribute('alt') === 'custom') {
			let customPrompt = await customRefinement();
			if (!customPrompt) return;
			userPrompt = customPrompt;
		} else {
			userPrompt = span.textContent.trim();
		}

		if ( ! await TOOLS.isAllowed('product-refine') ) return;

		document.querySelector('.aai-refinement-pop').innerHTML = `<div class="copyspell-ai-loading"><span>${__('thinking', 'copyspell-ai')}...</span>${SVG.loader14}</div>`;

		/*
		let prompt = {
			contentToRefine: suggestion || '',
			refinementPrompt: userPrompt
		}
		*/
//console.log('REFINE SUGGESTION');
		// •••••••••••••••••••••••••••••••••••••
		let response = await copyspellAIContent.refine( userPrompt, suggestion )
		// •••••••••••••••••••••••••••••••••••••
		
		if ( ! response || response.error ) {
			document.querySelector('.aai-refinement-pop').innerHTML = `<div class="aai-error-message">${ response.error || 'Error refining suggestion. Please try again.' }</div>`;
			return;
		}
	
	
	
	
		// Finalize
		this.finalizeRefinement( response );
	
	
		
	
	}
	
	


		

	// MARK: Finalize Refinement
	// ────────────────────────────────────
	finalizeRefinement( response ) {
		let suggestion = response.content || '';

		document.querySelector('.aai-pop-suggested-description.active').innerHTML = suggestion;

		const refinementPop = document.querySelector('.aai-refinement-pop');
		refinementPop.innerHTML = this.refinementPromptsHTML(response.refinementPrompts);

		
		
		// EVENTS ==================================

		// click - prompt spans
		// ────────────────────────────────────
		const promptSpans = refinementPop.querySelectorAll('span');
		promptSpans.forEach(span => {
			span.addEventListener('click', async (e) => {
				e.stopPropagation();
				let result = await this.refineSuggestion(span, suggestion);
				//callback(result);
			});
		});


	}



	

	// MARK: Refinement Prompts HTML
	// ────────────────────────────────────
	refinementPromptsHTML( prompts ) {
		let HTML = `
			<div class="aai-refinement-prompts">`
			if ( prompts ) {
				prompts.forEach( prompt => {
					HTML += `<span class="aai-chip">${prompt}</span>`
				});
				HTML += `<span class="aai-chip aai-custom" alt="longer">${__("Make it longer", 'copyspell-ai')}</span>`
				HTML += `<span class="aai-chip aai-custom" alt="shorter">${__("Make it shorter", 'copyspell-ai')}</span>`
				HTML += `<span class="aai-chip aai-custom" alt="custom">${__("Custom changes", 'copyspell-ai')}</span>`
			}
			HTML += `
			</div>`

		return HTML;

	}















}

