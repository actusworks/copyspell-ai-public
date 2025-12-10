import SVG 					from '../svg.js';
import AIH					from './ai-helpers.js';
import AIapi 				from './ai-api.js';
import MultiSelect 			from '../MultiSelect.js';
import TOOLS 				from '../tools.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}
let OPT = DATA.options || {};
const { __, _x, _n, sprintf } = wp.i18n;







// MARK: Header
// ────────────────────────────────────
export function headerHTML( superTitle = __('AI Suggestions for', 'copyspell-ai') ) {
	let code = DATA.woocommerce?.product?.sku || '';
	if ( code ) code = `SKU: ${code}`;
	else code = `ID #${DATA.post.id}`;

	let imageSrc = this.productData.imageUrls?.[0] || DATA.plugin_url + 'img/placeholder.jpg';
	let HTML =``
	HTML += `<div class="aai-card aai-no-header aai-suggestions-header">`
	HTML += `<img src="${imageSrc}"/>`
	HTML += `<div class="aai-text">`
		HTML += `<h4>${superTitle}</h4>`
		HTML += `<h2>${this.productData.title}</h2>`
			HTML += `<div class="aai-header-bottom-line">`
				HTML += `<div>${SVG.cube2} <span>${__('Woocomerce Product', 'copyspell-ai')}</span></div>`
				HTML += `<div>${SVG.id2} <span>${code}</span></div>`
				HTML += `<div>${SVG.clock} <span>${__('Last updated', 'copyspell-ai')} ${formatDate(this.productData.modified)}</span></div>`
			HTML += `</div>`
	HTML += `</div>`


	HTML += `</div>`

	return HTML;

}
	



// MARK: History Button
// ────────────────────────────────────
export function historyButtonHTML() {

	let HTML =``
	HTML += `<div class="aai-history-button-container">`
	HTML += `<button class="aai-btn aai-history-button" type="button">`
	HTML += SVG.history
	HTML += `${__('History', 'copyspell-ai')}`
	HTML += `</button>`
	HTML += `</div>`

	return HTML;

}
	
					





// MARK: Model Selection Dropdown
// ────────────────────────────────────
export function modelSelectionDropdown( form ) {

	form = form || this.form || {};
	let allModels = AIapi.models;

	let model = form._model || 'sequence';
	let modelName = 'sequence';
	let provider = '';

	if ( model != 'sequence' ) {
		let modelParts = model.split(':::');
		model = [modelParts[0], modelParts[1] || ''];
		modelName = model[0] || '';
		provider = model[1] || '';
	}

	let providers = form.providers || OPT.api || {}
	let validProviders = AIH.validProviders( providers );

	let selected = modelName === 'sequence' ? 'selected' : '';
	let info = '';
	if ( selected ) {
		info = `${__('First model in the sequence:', 'copyspell-ai')} <span>${ OPT?.sequences?.main[0][0].replace(/-/g, ' ') || ''}</span>`;
	}
	let res = '<div class="aai-select-model-options">'
	//res += '<label>' + __('preferred model', 'copyspell-ai') + '</label>'
	res += '<select class="aai-select aai-select-model" id="_model" name="_model" data-value="'+ modelName +'" data-provider="'+ provider +'">'
	if ( validProviders.length ) {
		res += `<option value="sequence" ${selected}>${__('Automatic Model Sequence', 'copyspell-ai')}</option>`;
		for (const provider of Object.keys(providers)) {
			let models = form.models?.[provider] || allModels[provider] || [];

			if ( !models.length ) continue;
			if ( providers[provider]?.status != 'valid' ) {
				res += `<option value="" disabled>Enter an API key to see available ${provider} models.</option>`;
				continue;
			}

			res += `<optgroup label="${provider}">`;
			for (const m of models) {
				selected = m === modelName ? 'selected' : '';
				res += `<option value="${m}:::${provider}" ${selected}>${m.replace(/-/g, ' ')}</option>`;
			}
			res += `</optgroup>`;
		}
	} else {
		res += `<option value="" disabled selected>${__('No valid AI providers found.', 'copyspell-ai')}</option>`;
		info = __("Please configure your AI providers.", 'copyspell-ai')
	}
	res += '</select>'
	res += `<div class="aai-info">${info}</div>`
	res += '</div>'


	return res;

	
}





// MARK: Keywords HTML
// ────────────────────────────────────
export function keywordsHTML() {
	
	let disabledState = ''
	let validProviders = AIH.validProviders();
	if ( ! validProviders.length === 0 ) disabledState = ' disabled';


	let HTML = `
	<section class="aai-section aai-keywords-section">
		<h3 class="aai-section-title">
			${SVG.key2}
			<span class="aai-text">${__('Target Keywords', 'copyspell-ai')}</span>
			<span class="aai-optional">${__('optional', 'copyspell-ai')}</span>
			${SVG.caret}
		</h3>

		<div class="aai-groups">
			<div class="aai-group">
				<label class="aai-label" for="primary-keywords">${__('Primary Keywords', 'copyspell-ai')}</label>
				<div class="aai-keywords-row">
					<input class="aai-input" id="primary-keywords" name="primary-keywords" type="text" placeholder="${__('e.g. running shoes, home decor, phone case', 'copyspell-ai')}">
					<button class="aai-btn-big aai-keywords-button" type="button" ${disabledState}>${__('Get Keywords with AI', 'copyspell-ai')}</button>
				</div>
			</div>

			<div class="aai-group">
				<label class="aai-label" for="secondary-keywords">${__('Secondary Keywords', 'copyspell-ai')}</label>
				<textarea class="aai-textarea" id="secondary-keywords" name="secondary-keywords" type="text" placeholder="${__('e.g. casual sneakers, stylish pet collars and leashes, eco-friendly office supplies', 'copyspell-ai')}"></textarea>
			</div>
		</div>

	</section>
	`

	return HTML;
}






// MARK: Features HTML
// ────────────────────────────────────
export function featuresHTML() {
	let HTML = `
	<section class="aai-section aai-features-section">
		<h3 class="aai-section-title">
			${SVG.cube2}
			<span class="aai-text">${__('Product Info', 'copyspell-ai')}</span>
			<span class="aai-optional">${__('optional', 'copyspell-ai')}</span>
			${SVG.caret}
		</h3>


		<div class="aai-groups">
			<div class="aai-group">
				<label class="aai-label" for="usp">${__('Unique Selling Proposition', 'copyspell-ai')}</label>
				<textarea class="aai-textarea" id="usp" name="usp" placeholder="${__("What makes this product stand out from the competition? What's the one thing this product does better than anyone else?", 'copyspell-ai')}"></textarea>
			</div>
			<div class="aai-group">
				<label class="aai-label" for="extra-info">${__('Extra Product Info', 'copyspell-ai')}</label>
				<textarea class="aai-textarea" id="extra-info" name="extra-info" placeholder="${__('Extra information about the product that might be useful for the AI to generate content.', 'copyspell-ai')}"></textarea>
			</div>
		</div>

	</section>
	`

	return HTML;
}


 

 

// MARK: Brand Tone
// ────────────────────────────────────
export function brandToneHTML() {
	let HTML = `
	<section class="aai-section aai-brand-section">
		<h3 class="aai-section-title">
			${SVG.shield}
			<span class="aai-text">${__('Brand Tone', 'copyspell-ai')}</span>
			<span class="aai-optional">${__('optional', 'copyspell-ai')}</span>
			${SVG.caret}
		</h3>

		<div class="aai-groups">
		
			<div class="aai-group">
				<textarea class="aai-textarea" id="brand-tone" name="brand-tone" placeholder="${__('Describe your brand’s tone and style...', 'copyspell-ai')}"></textarea>
			</div>

		</div>
		
	</section>
	`

	return HTML;
}






// MARK: Multi Select
// ────────────────────────────────────
export function multiSelectsHTML() {
	const $grid = this.panel.$body.querySelector('.aai-multi-select-grid')


	// Audiences
	// ────────────────────────────────────
	let audiencesControl = new MultiSelect({
		label: __('Target Audience', 'copyspell-ai'),
		icon: SVG.audience,
		name: 'audiences',
		values: this.promptOptions.audiences.map((a,i) => this.promptOptionsEn.audiences[i]),
		titles: this.promptOptions.audiences.map((a,i) => a),
		value: this.form.audiences || [],
		allowCreate: true,
	})
	audiencesControl.onChange = (value, selected, action) => {
		this.form.audiences = value;
		this.prefs.audiences = value;
		AIH.LOCAL.set(this.prefsName, this.prefs);
		this.setFormData()
	}
	$grid.appendChild( audiencesControl.element );


	// Tones
	// ────────────────────────────────────
	let tonesControl = new MultiSelect({
		label: __('Tone of Voice', 'copyspell-ai'),
		icon: SVG.tone,
		name: 'tones',
		values: this.promptOptions.tones.map((a,i) => this.promptOptionsEn.tones[i]),
		titles: this.promptOptions.tones.map((a,i) => a),
		value: this.form.tone || [],
		allowCreate: true,
	})
	tonesControl.onChange = (value, selected, action) => {
		this.form.tone = value;
		this.prefs.tone = value;
		AIH.LOCAL.set(this.prefsName, this.prefs);
		this.setFormData()
	}
	$grid.appendChild( tonesControl.element );



	// Priorities
	// ────────────────────────────────────
	let prioritiesControl = new MultiSelect({
		label: __('Content Priorities', 'copyspell-ai'),
		name: 'priorities',
		icon: SVG.star,
		values: this.promptOptions.priorities.map((a,i) => this.promptOptionsEn.priorities[i]),
		titles: this.promptOptions.priorities.map((a,i) => a),
		value: this.form.priorities || [],
		allowCreate: true,
	})
	prioritiesControl.onChange = (value, selected, action) => {
		this.form.priorities = value;
		this.prefs.priorities = value;
		AIH.LOCAL.set(this.prefsName, this.prefs);
		this.setFormData()
	}
	$grid.appendChild( prioritiesControl.element );




	let languageOptions = this.promptOptions.languages.map((l,i) => `<option value="${this.promptOptionsEn.languages[i][0]}">${l[1]}</option>`).join('');
	let HTML = `
		<div class="aai-group">
			<label class="aai-label" for="language">${SVG.language}${__('Response Language', 'copyspell-ai')}</label>
			<select class="aai-select" id="language" name="language">
				${languageOptions}
			</select>
		</div>`

		

	$grid.insertAdjacentHTML('beforeend', HTML);



	

	/*
	// TEST
	// ────────────────────────────────────
	let testControl = new SearchAsYouType({
		label: 'Content priorities',
		name: 'priorities',
		multiple: true,
		allowAddItems: true,
		allowEditing: true,
		source: {
			values: this.promptOptions.priorities.map((a,i) => this.promptOptionsEn.priorities[i]),
			titles: this.promptOptions.priorities.map((a,i) => a),
		},
		//value: this.form.priorities || this.prefs.priorities || [],
	})
	testControl.onChangeSource = ( updatedSource ) => {

		console.log('------ onChangeSource');
		console.log('Updated source list:', updatedSource);

	}
	testControl.onChange = (value, selected, action, updatedSource) => {
		console.log('action:', action);
		console.log('Current value:', value);
		console.log('selected:', selected);
		console.log(`Item ${selected.title} was ${action}.`);
		//this.form.priorities = value;
		//this.prefs.priorities = value;
		//AIH.LOCAL.set(this.prefsName, this.prefs);
		//this.setFormData()

		if (action === 'source-update' ) {
			console.log('------ Source list was updated!');
			console.log('Updated source list:', updatedSource);
		}
		if (action === 'add' && selected.isNew) {
			console.log('------ A new tag was created!');
			console.log('Updated source list:', updatedSource);
		}
	}
	$grid.appendChild( testControl.element );
	*/





}






// MARK: Strategy HTML
// ────────────────────────────────────
export function strategyHTML() {
	let contentSizeOptions = this.promptOptions.sizes.map((s,i) => `<option value="${this.promptOptionsEn.sizes[i][0]}" title="${s[2]}\n${s[0]}">${s[1]}</option>`).join('');
	let excerptSizeOptions = this.promptOptions.excerptSizes.map((s,i) => `<option value="${this.promptOptionsEn.excerptSizes[i][0]}" title="${s[2]}\n${s[0]}">${s[1]}</option>`).join('');
	let frameworkOptions = this.promptOptions.frameworks.map((f,i) => `<option value="${this.promptOptionsEn.frameworks[i][0]}" title="${f[1]}">${f[0]}</option>`).join('');



	

	
	//<h3 class="aai-section-title">${__('Content Strategy', 'copyspell-ai')}</h3>

	let HTML = `
	<section class="aai-section aai-strategy-section">



		<div class="aai-multi-select-grid"></div>


		<div class="aai-dropdowns-grid aai-grid-sizes">

			<div class="aai-group">
				<label class="aai-label" for="content-size">${SVG.text}${__('Content Length', 'copyspell-ai')}</label>
				<select class="aai-select" id="content-size" name="content-size">
					${contentSizeOptions}
				</select>
				<div class="aai-info"></div>
			</div>


			<div class="aai-group">
				<label class="aai-label" for="excerpt-size">${SVG.text}${__('Short Description Length', 'copyspell-ai')}</label>
				<select class="aai-select" id="excerpt-size" name="excerpt-size">
					${excerptSizeOptions}
				</select>
				<div class="aai-info"></div>
			</div>

		</div>





		<div class="aai-dropdowns-grid aai-grid-framework">

			<div class="aai-group aai-group-1">
				<label class="aai-label" for="framework">${SVG.chart2}${__('Marketing Framework', 'copyspell-ai')}</label>
				<select class="aai-select" id="framework" name="framework">
					${frameworkOptions}
				</select>
				<div class="aai-info"></div>
			</div>

			
			<div class="aai-group aai-group-2"></div>


		</div>






		<div class="aai-group aai-extra-prompt-group">
			<label class="aai-label" for="extra-prompt">${SVG.prompt}${__('Extra Prompt', 'copyspell-ai')} <span class="aai-optional">${__('optional', 'copyspell-ai')}</span></label>
			<textarea class="aai-textarea" id="extra-prompt" name="extra-prompt" placeholder="${__('Provide any additional instructions or context for the AI...', 'copyspell-ai')}"></textarea>
		</div>


	</section>
	`

	return HTML;
}






// MARK: Submit Button HTML
// ────────────────────────────────────
export async function submitButtonHTML( label, license ) {
	label = label || __('Generate AI Content', 'copyspell-ai');
	let HTML = ``;
	let disabledState = ''
	let validProviders = AIH.validProviders();
	if ( ! validProviders.length === 0 ) disabledState = ' disabled';

	//console.log('OPT', OPT)

	OPT.api = OPT.api || {};
	if ( ! validProviders.length ) {
		disabledState = ' disabled';
		label = __('Configure AI Providers', 'copyspell-ai');
	}



	HTML += `
	<div class="aai-submit-section aai-${disabledState ? 'disabled' : 'enabled'}">
		<button class="aai-submit-btn" type="submit" ${disabledState}>${label}</button>
	`

	//if ( typeof license != 'undefined' ) HTML += await TOOLS.renderCredits()


		if ( license && license.status == 'trial' ) {
			HTML += `
			<div class="aai-note">
				<a href="https://copyspell.ai/#home-pricing" target="_blank" class="aai-btn aai-btn-secondary medium">${__('Upgrade to Pro for unlimited requests', 'copyspell-ai')}</a>
				<p>${__("TRIAL.", 'copyspell-ai')} ${__('Remaining requests:', 'copyspell-ai')} <b>${license.trialleft}</b></p>
			</div>
			`;
		}
		/*
		console.log('license', license)
		let hasCredits = TOOLS.enoughCredits('product-content');
		if ( license && license.type != 'lifetime' ) {
			HTML += `
			<div class="aai-note">
				<a href="https://copyspell.ai/#home-pricing" target="_blank" class="aai-btn aai-btn-secondary medium">${__('Upgrade to Premium for unlimited requests', 'copyspell-ai')}</a>
				<p>${__('Remaining credits:', 'copyspell-ai')} <b>${hasCredits}</b></p>
			</div>
			`;
		}
		*/
	HTML += `</div>`

	
	if ( ! validProviders.length === 0 ) {
		HTML += `
		<div class="aai-warning">
			<h3>Let's Connect Your AI!</h3>
			<p>You're almost there. To unlock the AI features, just configure a provider on the settings page.</p>
		</div>
		`;
	}




	return HTML;
}





// MARK: Rate Button HTML
// ────────────────────────────────────
export function rateButtonHTML( label ) {
	label = label || __('Rate CopySpell AI', 'copyspell-ai');

	let HTML = `
	<div class="aai-rate-section">
		<a href="https://copyspell.ai/review-copyspell-ai/" target="_blank" class="aai-rate-btn">${label}</a>
	</div>
	`;

	return HTML;
}







// MARK: Loading State
// ────────────────────────────────────
export function loadingState(){
	if ( ! this.panel || ! this.panel.$body ) return;
	this.panel.$body.innerHTML = `
	<div class="aai-call-progress loading">
		<div class="aai-grid"></div>
		<div class="copyspell-ai-loading">${SVG.loader}<label>${__('AI analysis', 'copyspell-ai')}</label></div>
		<div class="aai-processing">
			<div class="status-pulse"></div>
			<span class="status-label">thinking</span>
		</div>
		<div class="aai-output"></div>
	</div>
	`;
}





// MARK: Show Error
// ────────────────────────────────────
export function showError( message ) {
	if ( ! this.panel || ! this.panel.$body ) return;
	this.panel.$body.innerHTML = `
	<div class="aai-call-progress error">
		<div class="aai-grid"></div>
		<div class="copyspell-ai-error">${SVG.error}<label>${message}</label></div>
		<div class="aai-output"></div>
	</div>
	`;
}






// MARK: Format Date
// ────────────────────────────────────
function formatDate( dateString ) {
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
		return __('Just now', 'copyspell-ai');
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








