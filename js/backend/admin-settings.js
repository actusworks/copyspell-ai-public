import SVG 				from "../shared/svg.js";
import TOOLS            from "../shared/tools.js";
import AIapi           	from "../shared/AI/ai-api.js";
import Providers	   	from "./admin-providers.js";
// -----------------------------------------------------
const SDK = window.CopyspellAI || {};
const DATA = JSON.parse(JSON.stringify(window.copyspell_ai_admin || {}));
const { __, _x, _n, sprintf } = wp.i18n;
let $ = jQuery;


// Load the CSS file
TOOLS.loadCSS(`settings.css?v=${DATA.version}`);



let currentSettings = {
	api : {
		google : {},
		groq   : {},
		openai : {},
		github : {},
		naga   : {},
	},
	sequences : {
		mainDefault : [],
		keywordsDefault : [],
		searchDefault : []
	},
};
let allModels = {}




// MARK: Admin Settings
// -----------------------------------------------------
export default function AdminSettings() {

    // Load current settings from WordPress
    loadCurrentSettings().then(async () => {
		
		allModels = await AIapi.getModels('all');
		allModels = allModels.models || {};

		currentSettings.sequences.main = currentSettings.sequences.main || JSON.parse(JSON.stringify( allModels.sequences.main ))
		currentSettings.sequences.keywords = currentSettings.sequences.keywords || JSON.parse(JSON.stringify( allModels.sequences.keywords ))
		currentSettings.sequences.search = currentSettings.sequences.search || JSON.parse(JSON.stringify( allModels.sequences.search ))
		
		//console.log('Current settings:', currentSettings);

        // Insert the admin settings HTML
        const adminContainer = $('.copyspell-ai-tab-content');
        if (adminContainer.length) {
            adminContainer.html( await adminSettingsHTML() );
			SDK.events.emit('admin-settings-rendered', currentSettings);
            adminSettingsEvents();
            populateSettings();
        }

		

		//let models = await AIapi.listModels('google');
		//models = TOOLS.models(models.models, 'name')
		//console.log('MODEL NAMES:', models);

    });

}




// MARK: Load Current Settings
// -----------------------------------------------------
function loadCurrentSettings() {
    return new Promise((resolve) => {
        if (DATA && DATA.options) {
			currentSettings = TOOLS.deepMerge(DATA.options, currentSettings)
        }
		resolve();
    });
}




// MARK: EVENTS
// -----------------------------------------------------
function adminSettingsEvents() {

    // Tab switching
    $('body').off('click', '.aai-settings-tab');
    $('body').on('click', '.aai-settings-tab', function(e) {
        e.preventDefault();
        const tab = $(this).attr('data-tab');
        switchSettingsTab(tab);
    });


    // Change Models Selects
    $('body').off('change', '[data-tab="models"] select');
    $('body').on('change', '[data-tab="models"] select', function(e) {
		let value = $(this).val().trim();
		const provider = value.split(':::')[1] || 'google';
		value = value.split(':::')[0] || '';
		$(this).attr('data-value', value);
		$(this).attr('data-provider', provider);
    });

    // Change Api Inputs
    $('body').off('change', '[data-tab="api"] input');
    $('body').on('change', '[data-tab="api"] input', function(e) {
		$(this).siblings('.aai-test-button').removeClass('success error').html('Connect').prop('disabled', false);
    });


    // Form submission
    $('body').off('submit', '#aai-settings-form');
    $('body').on('submit', '#aai-settings-form', handleSettingsSubmit);



    // Test connection buttons
    $('body').off('click', '.aai-test-button');
    $('body').on('click', '.aai-test-button', handleTestConnection);



    // Restore default sequences
    $('body').off('click', '.aai-default-sequence');
    $('body').on('click', '.aai-default-sequence', function(e) {
		const sequenceType = $(this).attr('alt');
		//console.log('sequenceType:', sequenceType);
		//console.log('currentSettings.sequences:', currentSettings.sequences);
		if (sequenceType) {
			currentSettings.sequences[sequenceType] = JSON.parse(JSON.stringify( allModels.sequences[ sequenceType ] || []));
			tabAIModels();
		}
	});




}




// MARK: Switch Settings Tab
// -----------------------------------------------------
function switchSettingsTab(tab) {
    // Update active tab
    $('.aai-settings-tab').removeClass('active');
    $(`.aai-settings-tab[data-tab="${tab}"]`).addClass('active');

    // Show/hide content
    $('.aai-settings-tab-content').removeClass('active');
    $(`.aai-settings-tab-content[data-tab="${tab}"]`).addClass('active');

	// Renew tab content if needed
	if ( tab == 'models' ) tabAIModels();
}




// MARK: Submit
// -----------------------------------------------------
async function handleSettingsSubmit(e) {
	console.log('SUBMIT');
    e.preventDefault();
	if ( ! e.originalEvent.submitter.classList.contains('aai-save-settings') ) return
	const $submitBtn = $('.aai-save-settings');
    

    // Collect form data
    const formData = getFormData()

	console.log('Form Data:', formData);

	
    // Save settings
    saveOptions( formData, $submitBtn );
	

    
}




// MARK: Save Options
// -----------------------------------------------------
async function saveOptions( options, $button ) {
	options = options || currentSettings || {}

    if ( $button ) $button.addClass('loading').removeClass('success error').prop('disabled', true);

	//console.log('Saving options:', options);

	let savedOptions = await TOOLS.saveOptions( options );
	if ( savedOptions ) {
		// Update current settings with the response data (contains proper field names)
		currentSettings = TOOLS.deepMerge(currentSettings, savedOptions);

		TOOLS.showNotification('Settings saved successfully!', 'success');
	} else {
		TOOLS.showNotification('Error saving settings', 'error');
	}
	if ( $button ) $button.removeClass('loading').prop('disabled', false);


}




// MARK: Test Connection
// -----------------------------------------------------
async function handleTestConnection(e) {
	e.preventDefault();
	const $button = $(this);
	$button.addClass('loading').removeClass('success error').prop('disabled', true);
	const apiType = $button.closest('.aai-section').attr('alt');
	const apiKey = $button.siblings('input').val().trim();

	if ( ! apiType || ! apiKey ) {
		$button.removeClass('loading').prop('disabled', false);
		TOOLS.showNotification('Please enter a valid API key', 'error');
		return;
	}
	
	let res = await AIapi[ apiType ]?.checkAPIKey( apiKey );
		
	//console.log('res:', res);

	$button.removeClass('loading')
	currentSettings.api[apiType] = currentSettings.api[apiType] || {};
	currentSettings.api[apiType].key = apiKey
	delete currentSettings.api[apiType].status;
	if ( res && res.valid ) {
		currentSettings.api[apiType].status = 'valid';
		$button.addClass('success').html('connected');
	} else {
		currentSettings.api[apiType].status = 'failed';
		$button.addClass('error').html('failed');
	}
	
    // Save settings
    await saveOptions( currentSettings );



}



// MARK: Get form data
// -----------------------------------------------------
function getFormData() {
	
	let mainSeq = []
	let keywordsSeq = [];
	let searchSeq = [];

	$('.aai-group[alt="main-sequence"] select').each(function() {
		let value = $(this).attr('data-value')?.trim();
		let provider = $(this).attr('data-provider');
		//console.log(provider + ' value:', value);
		if ( value ) mainSeq.push([ value, provider ]);
	});
	$('.aai-group[alt="keywords-sequence"] select').each(function() {
		let value = $(this).attr('data-value')?.trim();
		let provider = $(this).attr('data-provider');
		if ( value ) keywordsSeq.push([ value, provider ]);
	});
	$('.aai-group[alt="search-sequence"] select').each(function() {
		let value = $(this).attr('data-value')?.trim();
		let provider = $(this).attr('data-provider');
		if ( value ) searchSeq.push([ value, provider ]);
	});

	//console.log('mainSeq:', mainSeq);



	let newData = {
		api: {},
		sequences : {
			main: mainSeq,
			keywords: keywordsSeq,
			search: searchSeq
		}
	}

	let apiContainer = $('.aai-settings-tab-content[data-tab="api"]');
	apiContainer.find('.aai-section').each(function() {
		const provider = $(this).attr('alt');
		const key = $(this).find('input').val().trim();
		newData.api[provider] = newData.api[provider] || {};
		newData.api[provider].key = key;
		newData.api[provider].status = currentSettings.api[provider]?.status || '';
	});


	//console.log('newData:', newData);


    return newData

}





// MARK: Populate Settings
// -----------------------------------------------------
function populateSettings() {

	$('.aai-test-button').removeClass('success error').html('Connect');


    // Populate form fields with current settings
	let apiContainer = $('.aai-settings-tab-content[data-tab="api"]');
	apiContainer.find('.aai-section').each(function() {
		const provider = $(this).attr('alt');
		$(this).find('input').val( currentSettings.api[provider]?.key || '' );

		if ( currentSettings.api[provider]?.status === 'valid' ) 
			$('.aai-section[alt="' + provider + '"] .aai-test-button').addClass('success').html('connected');
		else if ( currentSettings.api[provider]?.status === 'failed' && currentSettings.api[provider]?.key )
			$('.aai-section[alt="' + provider + '"] .aai-test-button').addClass('error').html('invalid key');

	})


}

 
 

// MARK: HTML
// -----------------------------------------------------
async function adminSettingsHTML() {
    return `
        <div class="aai-admin-settings">
            
            <!-- Settings Header -->
            <div class="aai-settings-header">
                <h1 class="aai-settings-title">
                    <span class="aai-title-icon">${SVG.settings}</span>
                    ${__("Plugin Settings", 'copyspell-ai')}
                </h1>
                <p class="aai-settings-subtitle">${__("Configure your plugin settings and API keys", 'copyspell-ai')}</p>
            </div>



            <!-- Settings Tabs -->
            <div class="aai-settings-tabs">
			<!--
                <button class="aai-settings-tab active" data-tab="general">
                    ${SVG.settings} ${__("General Settings", 'copyspell-ai')}
                </button>
			-->
                <button class="aai-settings-tab active" data-tab="api">
                    ${SVG.api} ${__("API Settings", 'copyspell-ai')}
                </button>
                <button class="aai-settings-tab" data-tab="models">
                    ${SVG.models} ${__("AI models", 'copyspell-ai')}
                </button>
            </div>





            <!-- Settings Form -->
            <form id="aai-settings-form" class="aai-settings-form">
                
               

				${tabGeneralSettings()}

				${await tabAIModels()}

				${Providers.init()}


                <!-- Form Actions -->
                <div class="aai-settings-actions">
                    <button type="submit" class="aai-btn-2 aai-save-settings aai-btn-2-primary">
                        ${SVG.save} ${__("Save Settings", 'copyspell-ai')}
                    </button>
                </div>

                
            </form>
        </div>
    `;
}




// MARK: General Settings
// -----------------------------------------------------
function tabGeneralSettings() {
	return ` 
	<!-- General Settings Tab -->
	<div class="aai-settings-tab-content" data-tab="general">
		<div class="aai-settings-section">
        
			<h2 class="aai-section-title">
				<span class="aai-section-icon">${SVG.settings}</span>
				General Configuration
			</h2>

        </div>
    </div>`
	
}





function modelsOptionsHTML() {

	let providers = Object.keys(currentSettings.api)
	let options = ''

	//console.log('providers:', providers);
	providers.forEach(provider => {
		let models = allModels[provider] || [];
		if (models.length > 0) {
			options += `<optgroup label="${provider}">`;
			options += models.map(model => `<option value="${model.name}" data-provider="${provider}">${provider} • ${model.name}</option>`).join('');
			options += `</optgroup>`;
		}
	});

	return options;
}


// MARK: AI Models
// -----------------------------------------------------
async function tabAIModels() {
	
	//let providers = Object.keys(currentSettings.api)
	const providers = ['google', 'groq', 'openai', 'github', 'naga'];

	let seqMain = JSON.parse(JSON.stringify( currentSettings.sequences.main ));
	let seqKeywords = JSON.parse(JSON.stringify( currentSettings.sequences.keywords ));
	let seqSearch = JSON.parse(JSON.stringify( currentSettings.sequences.search ));
	let validProviders = []
	providers.forEach( provider => {
		if ( currentSettings.api[provider]?.status != 'valid' ) {
			seqMain = seqMain.filter( item => item[1] != provider );
			seqKeywords = seqKeywords.filter( item => item[1] != provider );
			seqSearch = seqSearch.filter( item => item[1] != provider );
		} else {
			validProviders.push(provider);
		}
	});


	let mainLength = seqMain.length;
	if ( mainLength < 10 ) mainLength = 10;
	let keywordsLength = seqKeywords.length;
	if ( keywordsLength < 10 ) keywordsLength = 10;
	let searchLength = seqSearch.length;
	if ( searchLength < 4 ) searchLength = 4;


	let tabContent = document.querySelector( '.aai-settings-tab-content[data-tab="models"]' );


	let HTML = ``
	
	if ( ! validProviders.length )
		HTML += `<div class="aai-warning">
					${__("You have not configured any AI providers yet. To get started:", 'copyspell-ai')}
					<ol>
						<li>${__("Enter your API keys", 'copyspell-ai')}</li>
						<ul>
							<li>${__("Get free API keys from", 'copyspell-ai')} <b>Google</b> ${__("or", 'copyspell-ai')} <b>Groq</b></li>
							<li>${__("Use your own", 'copyspell-ai')} <b>OpenAI</b> ${__("or", 'copyspell-ai')} <b>GitHub</b> ${__("keys", 'copyspell-ai')}</li>
						</ul>
						<li>${__("Click", 'copyspell-ai')} <b>Connect</b> ${__("to verify each API key", 'copyspell-ai')}.</li>
					</ol>
				</div>`;


	//console.log('seqMain:', seqMain);
	
	HTML += `
	<div class="aai-section-header">
		<h2 class="aai-section-title actus-flex-1">
			<span class="aai-section-icon">${SVG.models}</span>
			${__("Model Sequences", 'copyspell-ai')}
		</h2>
		<button type="submit" class="aai-btn-2 aai-save-settings aai-btn-2-primary">
			${SVG.save} ${__("Save Settings", 'copyspell-ai')}
		</button>
	</div>

	<div class="aai-section">
		
			<div class="aai-info">
				${__("During an AI request, the plugin starts with the first model in the defined sequence. If that model fails—for example, due to rate limits—it automatically tries the next one, continuing until it either finds a working model or exhausts the entire sequence.", 'copyspell-ai')}
				<br>
				<br>
				${__("You can configure separate model sequences for main AI calls and for keyword extraction.", 'copyspell-ai')}
			</div>

		<div class="aai-dropdowns-grid">

			<div class="aai-group" alt="main-sequence">
				<h3>${__("Main Sequence", 'copyspell-ai')}</h3>
				${[...Array(mainLength)].map((_, index) => {
					let model = seqMain[index] || [];
					let modelName = model[0] || '';
					let provider = model[1] || '';
					let res = '<select class="aai-select aai-select-model" id="main-sequence-'+ index +'" alt="'+ index +'" data-value="'+ modelName +'" data-provider="'+ provider +'">'
					res += `<option value="" disabled selected>Select Model</option>`;
					res += providers.map(provider => {
						let models = allModels[provider] || [];
						let options =  `<optgroup label="${provider}">`
						options += models.map(m => {
							let selected = m === modelName ? 'selected' : '';
							return `<option value="${m}:::${provider}" ${selected}>${m.replace(/-/g, ' ')}</option>`;
						}).join('');
						options += `</optgroup>`;
						if ( ! models.length || currentSettings.api[provider]?.status != 'valid' ) options = `<option value="" disabled>Enter an API key to see available ${provider} models.</option>`;
						return options;
					}).join('');
					res += '</select>'
					return res;
				}).join('')}
				<div class="aai-info"></div>
				<button class="aai-btn aai-btn-primary aai-default-sequence" alt="main">${__("Restore Default Sequence", 'copyspell-ai')}</button>
			</div>

			<div class="aai-group" alt="keywords-sequence">
				<h3>${__("Keywords Sequence", 'copyspell-ai')}</h3>
				${[...Array(keywordsLength)].map((_, index) => {
					let model = seqKeywords[index] || [];
					let modelName = model[0] || '';
					let provider = model[1] || 'google';
					let res = '<select class="aai-select aai-select-model" id="main-sequence-'+ index +'" alt="'+ index +'" data-value="'+ modelName +'" data-provider="'+ provider +'">'
					res += `<option value="" disabled selected>Select Model</option>`;
					res += Object.keys(currentSettings.api).map(provider => {
						let models = allModels[provider] || [];
						let options =  `<optgroup label="${provider}">`
						options += models.map(m => {
							let selected = m === modelName ? 'selected' : '';
							return `<option value="${m}:::${provider}" ${selected}>${m.replace(/-/g, ' ')}</option>`;
						}).join('');
						options += `</optgroup>`;
						if ( ! models.length || currentSettings.api[provider]?.status != 'valid' ) options = `<option value="" disabled>Enter an API key to see available ${provider} models.</option>`;
						return options;
					}).join('');
					res += '</select>'
					return res;
				}).join('')}
				<div class="aai-info"></div>
				<button class="aai-btn aai-btn-primary aai-default-sequence" alt="keywords">${__("Restore Default Sequence", 'copyspell-ai')}</button>
			</div>

			<div class="aai-group" alt="search-sequence">
				<h3>${__("Search Sequence", 'copyspell-ai')}</h3>
				${[...Array(searchLength)].map((_, index) => {
					let model = seqSearch[index] || [];
					let modelName = model[0] || '';
					let provider = model[1] || 'google';
					let res = '<select class="aai-select aai-select-model" id="main-sequence-'+ index +'" alt="'+ index +'" data-value="'+ modelName +'" data-provider="'+ provider +'">'
					res += `<option value="" disabled selected>Select Model</option>`;
					res += Object.keys(currentSettings.api).map(provider => {
						let models = allModels[provider] || [];
						let options =  `<optgroup label="${provider}">`
						options += models.map(m => {
							let selected = m === modelName ? 'selected' : '';
							return `<option value="${m}:::${provider}" ${selected}>${m.replace(/-/g, ' ')}</option>`;
						}).join('');
						options += `</optgroup>`;
						if ( ! models.length || currentSettings.api[provider]?.status != 'valid' ) options = `<option value="" disabled>Enter an API key to see available ${provider} models.</option>`;
						return options;
					}).join('');
					res += '</select>'
					return res;
				}).join('')}
				<div class="aai-info"></div>
				<button class="aai-btn aai-btn-primary aai-default-sequence" alt="search">${__("Restore Default Sequence", 'copyspell-ai')}</button>
			</div>

		</div>



	</div>`

	
	let fullHTML = `
		<!-- AI Models Tab -->
		<div class="aai-settings-tab-content" data-tab="models">
			${HTML}
		</div>
	`;
	if ( tabContent ) tabContent.innerHTML = HTML;
	return fullHTML;
}










