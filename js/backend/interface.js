import AdminHome			from './admin-home.js';
import AdminSettings		from './admin-settings.js';
import AdminLicense			from './admin-license.js';
import Bulk					from './bulk/Bulk.js';
import TOOLS				from '../shared/tools.js';
// -----------------------------------------------------
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;
// -----------------------------------------------------






// -----------------------------------------------------
const IFC = {}



// MARK: Initialization
// -----------------------------------------------------
IFC.init = () => {
	
	IFC.navigation();

	$('.copyspell-ai-nav-tab').first().trigger('click');

	if ( $('.aai-credits-display').length )
		TOOLS.renderCredits('.aai-credits-display');

}




// MARK: Navigation
// -----------------------------------------------------
IFC.navigation = () => {

	// Add your navigation logic here
	$('.copyspell-ai-nav-tab').on('click', function() {
		const target = $(this).attr('alt')
		//console.log("Navigation to: " + target);

		$('.copyspell-ai-nav-tab').removeClass('copyspell-ai-nav-tab-active');
		$(this).addClass('copyspell-ai-nav-tab-active');
		
		if ( target == 'home' ) AdminHome();
		if ( target == 'bulk' ) new Bulk();
		if ( target == 'settings' ) AdminSettings();
		if ( target == 'license' ) AdminLicense();

	});


}








// MARK: Footer HTML
// -----------------------------------------------------
IFC.footerHTML = () => {
	return `
	<div class="aai-footer">
		<div class="aai-footer-logo">
			<img src="/wp-content/plugins/copyspell-ai/img/logo.png" alt="CopySpell AI Logo">
			<span>CopySpell AI v${window.copyspell_ai_admin.version}</span>
		</div>
		<div class="aai-footer-links">
			<span>Developed by</span>
			<img src="/wp-content/plugins/copyspell-ai/img/actus-logo.png" alt="Actus Anima Logo">
			<a href="https://actus.works" target="_blank">Actus Anima</a>
			<span>|</span>
			<a href="https://copyspell.ai/user-guide/" target="_blank">${__("Documentation", 'copyspell-ai')}</a>
		</div>
	</div>`;
}









// -----------------------------------------------------
export default IFC;