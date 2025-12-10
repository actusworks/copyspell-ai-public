import "../copyspell-sdk.js";
import SVG 				from "../shared/svg.js";
import AIH				from '../shared/AI/ai-helpers.js';
import _log	 			from "../shared/Log.js";
import IFC 				from "./interface.js";
// -----------------------------------------------------
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;


//console.log('DATA', DATA);

//console.log("ACTUS-AI Admin Home", DATA);






// MARK: Admin Home
// -----------------------------------------------------
export default async function AdminHome() {

    // Insert the admin home HTML
    const adminContainer = $('.copyspell-ai-tab-content');
    if (adminContainer.length) {
        adminContainer.html( await adminHomeHTML() );
        adminHomeEvents();
    }


	// Load Add-ons
	/*
	window.CopyspellAddons.modules.forEach(url => {
		console.log('url', url);
		import(url).then(mod => {
			console.log('Addon module loaded:', mod);
			if (mod.init) mod.init( window.CopyspellAI );
		});
	});
	*/




}




// MARK: Events
// -----------------------------------------------------
function adminHomeEvents() {

    // Bind click events for action buttons
    $('.aai-action-btn').on('click', function(e) {
        e.preventDefault();
        const action = $(this).attr('data-action');
        handleActionClick(action, e);
    });
    

}



// MARK: Action Handlers
// -----------------------------------------------------
function handleActionClick(action, e) {
    switch(action) {
        case 'add-item':
            //window.location.href = '?page=copyspell-ai&tab=items&action=add';
            break;
        case 'settings':
            // Navigate to general settings
			$('.copyspell-ai-nav-tab[alt="settings"]').trigger('click');
            break;
        case 'license':
            // Navigate to license tab
			$('.copyspell-ai-nav-tab[alt="license"]').trigger('click');
            break;
        case 'copy-shortcode':
			// Copy shortcode to clipboard
			navigator.clipboard.writeText('[copyspell_ai]').then(() => {
				//console.log('Shortcode copied to clipboard');
				// Show success feedback
				const button = $(e.target);
				const originalText = button.text();
				button.text('Copied!').addClass('copied');
				setTimeout(() => {
					button.text(originalText).removeClass('copied');
				}, 8000);
			});
            break;
        case 'shop-page':
            // Open shop page in new tab
            window.open(DATA.woocommerce.store_url, '_blank');
            break;
        case 'learn-more':
            // Open documentation in new tab
            window.open('https://copyspell.ai/custom-control', '_blank');
            break;
        case 'documentation':
            // Open documentation in new tab
            window.open('https://copyspell.ai/user-guide', '_blank');
            break;
        case 'support':
            // Open support page
            window.open('https://support.copyspell.ai', '_blank');
            break;
    }
}




// MARK: HTML
// -----------------------------------------------------
async function adminHomeHTML() {
	//${check ? '' : '<div class="aai-warning aai-big">' + __("Please activate a license key to access all features.", 'copyspell-ai') + licenseButton + '</div>'}

	let licenseButton = `<button class="aai-action-btn aai-btn-2-primary" data-action="license">${__("License", 'copyspell-ai')}</button>`

    return `
        <div class="aai-admin-home">

		
            <!-- Header Section -->
            ${headerHTML()}


			
			${( ! DATA.revisions_enabled ) ? '<div class="aai-warning">' + __("Enable <a href='https://wordpress.org/documentation/article/revisions/#revision-options' target='_blank'>revisions</a> to prevent losing your existing content.", 'copyspell-ai') + '</div>' : ''}

		
            <!-- Action Steps -->
            ${actionStepsHTML()}



            <!-- Features Section -->
            ${featureSectionHTML()}


            <!-- Feature Suggestions -->
            ${suggestHTML()}


            <!-- Help Section -->
            ${helpSectionHTML()}


            <!-- Footer -->
            ${IFC.footerHTML()}


        </div>
    `;
}
// -----------------------------------------------------
function headerHTML() {
	return `
		<div class="aai-home-header">
			<div class="aai-header-icon">
				<img src="${DATA.logo}">
			</div>
			<div class="aai-header-content">
				<h1 class="aai-home-title">${__('Getting Started', 'copyspell-ai')}</h1>
				<p class="aai-home-subtitle">${__('Welcome to Copyspell AI!', 'copyspell-ai')}</p>
				<p class="aai-home-description">${__(`Welcome aboard! You've just equipped your store with a powerful content assistant. Configure your AI settings and start generating high-impact product content in minutes.`, 'copyspell-ai')}</p>
			</div>
		</div>
	`;
}
// -----------------------------------------------------
function actionStepsHTML() {

	let $el = $('<div>')
	let $steps = $('<div class="aai-action-steps">').appendTo( $el );
	let cards = [
		{
			number: 1,
			title: __("Configure AI Settings", 'copyspell-ai'),
			description: __("Go to the settings page and add your AI provider API keys. You can start for free with a Google AI Studio or a Groq key to unlock powerful content generation.", 'copyspell-ai'),
			//extra: successMessageHTML(),
			buttonText: __("GO TO SETTINGS", 'copyspell-ai'),
			buttonAction: "settings"
		},
		{
			number: 2,
			title: __("Generate Your First Content", 'copyspell-ai'),
			description: __("Navigate to any WooCommerce product page. You'll find the new CopySpell AI panel ready to transform your product details into compelling copy.", 'copyspell-ai'),
			buttonText: __("GO TO PRODUCTS", 'copyspell-ai'),
			buttonAction: "shop-page"
		},
		{
			number: 3,
			title: __("Customize & Apply", 'copyspell-ai'),
			description: __("Fine-tune the results by selecting a tone, audience, and strategy. Preview the suggestions and apply them to your product with a single click.", 'copyspell-ai'),
			extraX: `<div class="aai-shortcode-display">
				<code>[copyspell_ai]</code>
			</div>`,
			buttonText: __("LEARN MORE", 'copyspell-ai'),
			buttonAction: "learn-more"
		}
	]


	// Generate cards
	cards.forEach(card => {
		let $card = $(`
			<div class="aai-step-card">
				<div class="aai-step-number">${card.number}</div>
				<div class="aai-step-content">
					<h3>${card.title}</h3>
					<p>${card.description}</p>
					${card.extra ? card.extra : ''}
					<button class="aai-action-btn aai-btn-2-primary" data-action="${card.buttonAction}">${card.buttonText}</button>
				</div>
			</div>
		`);
		$steps.append($card);
	});

	$( successMessageHTML() ).appendTo( $el );

	return $el.html();
}
// -----------------------------------------------------
function successMessageHTML() {
	let validProviders = AIH.validProviders();
	let providers = __("You have no providers enabled", 'copyspell-ai');
	if (validProviders.length == 1) providers = __("You have", 'copyspell-ai') + ' ' + validProviders.length + ' ' + __("providers enabled", 'copyspell-ai') + ' (' + validProviders[0] + ')';
	if (validProviders.length > 1) providers = __("You have", 'copyspell-ai') + ' ' + validProviders.length + ' ' + __("providers enabled", 'copyspell-ai') + ' (' + validProviders.join(', ') + ')';

	if ( ! validProviders.length ) {
		return `
			<div class="aai-warning">
				${__("You have not configured any AI providers yet. To get started:", 'copyspell-ai')}
				<ol>
					<li>${__("Go to", 'copyspell-ai')} <b>${__("Settings", 'copyspell-ai')} -> ${__("API Settings", 'copyspell-ai')}</b></li>
					<li>${__("Enter your API keys", 'copyspell-ai')}</li>
					<ul>
						<li>${__("Get free API keys from", 'copyspell-ai')} <b>Google</b> ${__("or", 'copyspell-ai')} <b>Groq</b></li>
						<li>${__("Use your own", 'copyspell-ai')} <b>OpenAI</b> ${__("or", 'copyspell-ai')} <b>GitHub</b> ${__("keys", 'copyspell-ai')}</li>
					</ul>
					<li>${__("Click", 'copyspell-ai')} <b>Connect</b> ${__("to verify each API key", 'copyspell-ai')}.</li>
				</ol>
			</div>`;
	}
	return `
	<div class="aai-success-message">
		<div class="aai-success-icon">✓</div>
		<span>${providers}</span>
	</div>`;
}
// -----------------------------------------------------
function featureSectionHTML() {
	return `
	<div class="aai-features-section">
		<h2 class="aai-section-title">${__("Plugin Features", 'copyspell-ai')}</h2>
		<div class="aai-features-grid">
			${featureCardHTML(SVG.bulb, "red",
				__("Intelligent Content Generation", 'copyspell-ai'),
				__("Instantly create SEO-optimized titles, compelling short descriptions, and rich, formatted long descriptions from basic product info.", 'copyspell-ai')
			)}
			${featureCardHTML(SVG.sliders, "blue",
				__("Advanced Customization", 'copyspell-ai'),
				__("Tailor every output with 24+ tones, 30+ audiences, and 22+ content strategies to perfectly match your brand voice.", 'copyspell-ai')
			)}
			${featureCardHTML(SVG.cloudCheck, "green",
				__("Multi-Provider Reliability", 'copyspell-ai'),
				__("Our smart failover system uses multiple AI providers like Google Gemini to ensure 99.9% uptime and avoid service interruptions.", 'copyspell-ai')
			)}
			${featureCardHTML(SVG.woo, "orange",
				__("Seamless WooCommerce Integration", 'copyspell-ai'),
				__("Built specifically for WooCommerce. Intuitive interface and zero learning curve.", 'copyspell-ai')
			)}
			${featureCardHTML(SVG.key, "purple",
				__("Smart Keyword Generation", 'copyspell-ai'),
				__("Let AI analyze your product title and details to automatically generate a list of relevant SEO keywords. Use them to fine-tune your content and attract more organic traffic.", 'copyspell-ai')
			)}
			${featureCardHTML(SVG.rocket, "teal",
				__("Built-in SEO Optimization", 'copyspell-ai'),
				__("Generate content designed to rank. Our AI focuses on creating titles and descriptions that improve your organic search performance.", 'copyspell-ai')
			)}
		</div>
	</div>`;
}
function featureCardHTML(icon, iconColor, title, description) {
	return `
		<div class="aai-feature-card">
			<div class="aai-feature-icon aai-icon-${iconColor}">${icon}</div>
			<div class="aai-feature-content">
				<h3>${title}</h3>
				<p>${description}</p>
			</div>
		</div>`;
}


// -----------------------------------------------------
function suggestHTML() {
	return `
		<div class="aai-home-header aai-suggest-feature">
			<div class="aai-header-content">
				<h1 class="aai-home-title">${__('Feature Suggestions', 'copyspell-ai')}</h1>
				<p class="aai-home-subtitle">${__('Have an idea that could make CopySpell AI even better?', 'copyspell-ai')}</p>
				<p class="aai-home-description">${__(`We would love to hear it. Send us your suggestion and it may be included in a future update.`, 'copyspell-ai')}</p>
			</div>
			<button class="aai-btn aai-btn-big aai-btn-primary" data-action="support">${__("Submit a Suggestion", 'copyspell-ai')}</button>
		</div>
	`;
}


// -----------------------------------------------------
function helpSectionHTML() {
	return `
	<div class="aai-help-section">
		<h2 class="aai-section-title">${__("Need Help?", 'copyspell-ai')}</h2>
		<div class="aai-help-grid">
			<div class="aai-help-card">
				<h3>${__("Documentation", 'copyspell-ai')}</h3>
				<p>${__("Read our comprehensive documentation for detailed setup instructions and guides on advanced features.", 'copyspell-ai')}</p>
				<button class="aai-action-btn aai-btn-outline" data-action="documentation">${__("View Documentation", 'copyspell-ai')}</button>
			</div>
			<div class="aai-help-card">
				<h3>${__("Support", 'copyspell-ai')}</h3>
				<p>${__("Need assistance? Our support team is here to help you get the most out of CopySpell AI.", 'copyspell-ai')}</p>
				<button class="aai-action-btn aai-btn-outline" data-action="support">${__("Get Support", 'copyspell-ai')}</button>
			</div>
		</div>
	</div>`;
}












