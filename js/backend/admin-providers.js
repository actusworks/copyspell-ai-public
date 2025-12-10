import wpAPI 				from '../shared/wp-api.js';
import SVG 					from '../shared/svg.js';
import TOOLS            	from "../shared/tools.js";
import _log	 				from "../shared/Log.js";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const $ = jQuery;
const SDK = window.CopyspellAI || {};
const DATA = window.copyspell_ai_admin || {}
let OPT = DATA.options || {};
const { __, _x, _n, sprintf } = wp.i18n;






const Providers = {}


Providers.all = [
	{
		id: 'google',
		name: 'Google AI',
		icon: 'svg.google',
		active: false,
		url: 'https://aistudio.google.com/apikey',
	},
	{
		id: 'groq',
		name: 'Groq',
		icon: 'svg.groq',
		active: false,
		url: 'https://platform.groq.com/account/api-keys',
	},
	{
		id: 'naga',
		name: 'NAGA AI',
		icon: 'svg.naga',
		active: false,
		url: 'https://app.naga.ai/settings/api-keys',
	},
	{
		id: 'openai',
		name: 'OpenAI',
		icon: 'svg.openai',
		active: false,
		url: 'https://platform.openai.com/account/api-keys',
	},
	{
		id: 'github',
		name: 'GitHub',
		icon: 'svg.github',
		active: false,
		url: 'https://github.com/settings/tokens',
	}
]




// MARK: init
// ────────────────────────────────────
Providers.init = () => {

	Providers.all = SDK.filters.apply('providers_array', Providers.all, { ...Providers });

	SDK.events.on('admin-settings-rendered', () => {
		Providers.events();
	})

	return Providers.render()


}


// MARK: keys settings
// ────────────────────────────────────
Providers.render = () => {

	let html = `<div class="aai-settings-tab-content aai-provider-keys active" data-tab="api">`
	
	Providers.all.forEach( provider => {

		let providerData = OPT.api?.[provider.id] || {}
		let status = providerData.status || 'invalid';
console.log('providerData ---',providerData)
console.log(provider.name,'---',status)
		let iconSVG = provider.icon
		if ( provider.icon.split('.')[0] === 'svg' ) {
			iconSVG = SVG[ provider.icon.split('.')[1] ] || ''
		}

		html += `<div class="aai-section ${status === 'valid' ? 'aai-valid' : ''}" alt="${provider.id}">
					<h2 class="aai-section-title-3">
						<span class="aai-section-icon">${iconSVG}</span>
						${provider.name}
					</h2>
					<div class="aai-group-button">
						<button class="aai-btn aai-btn-secondary aai-keys-btn" data-provider="${provider.id}">
							${status === 'valid' ? __('Active', 'copyspell-ai') : `${providerData.key ?  __('Invalid Key', 'copyspell-ai') : __('Enter API Key', 'copyspell-ai')}`}
						</button>
					</div>
					<div class="aai-form-group">
						<label class="aai-label" for="${provider.id}_key">API key</label>
						<div class="actus-flex">
							<input type="text"
									class="aai-input"
									id="${provider.id}_key"
									name="${provider.id}_key" 
									placeholder="Enter ${provider.name} API key">
							<button class="aai-btn-big aai-test-button">Connect</button>
						</div>
						<small class="aai-form-help">${__("To use", 'copyspell-ai')} ${provider.name} ${__("features, you need an API key from.", 'copyspell-ai')} <a href="${provider.url}" target="_blank" rel="noopener" class="aai-link">${provider.name}</a>.</small>
						<a href="${provider.url}" target="_blank" rel="noopener" class="aai-btn-2 aai-btn-outline aai-info-btn">${status === 'valid' ? '' : 'Get API Key from'} ${provider.name}</a>
					</div>
				</div>
				`
	})

	html += `</div>`

	
	

	return html;
	

}



// MARK: Events
// ────────────────────────────────────
Providers.events = () => {

	const adminContainer = $('.copyspell-ai-tab-content');


	// Enter API Key
	adminContainer.find('.aai-keys-btn').on('click', async function(e){
		e.preventDefault();
		e.stopPropagation();

		$(this).closest('.aai-section').siblings().removeClass('aai-open')
		$(this).closest('.aai-section').toggleClass('aai-open')
		$(this).find('input').focus();
		
		console.log('scroll to', $(this).closest('.aai-section')[0])
		$(this).closest('.aai-section')[0].scrollIntoView({ behavior: 'smooth', block: 'center' });


	})


	// Test API Keys
	adminContainer.find('.aai-test-button').on('click', async function(){


	})



}











// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Providers;

