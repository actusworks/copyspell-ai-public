<?php



if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly





// MARK: Actus Anima
// ----------------------------------------------------------






// Add CopySpell AI admin menu item
// ----------------------------------------------------------
if (!function_exists('copyspell_ai_menu_item')) {

	add_action('admin_menu', 'copyspell_ai_menu_item');

	function copyspell_ai_menu_item() {

		// Add main CopySpell AI menu
		$icon_url = plugins_url('img/logo-white-20.png', dirname(__FILE__));
		add_menu_page(
			'CopySpell AI',             // Page title
			'CopySpell AI',             // Menu title
			'manage_options',        	// Capability
			'copyspell-ai',           	// Menu slug
			'copyspell_ai_admin_home',	// Callback function
			$icon_url,               	// Icon URL
			30                       	// Position
		);

	}
}





// Callback function for the CopySpell AI admin page
// ----------------------------------------------------------
function copyspell_ai_admin_home() {
	// Check if the user has the required capability
	if (!current_user_can('manage_options')) {
		wp_die(esc_html__('You do not have sufficient permissions to access this page.', 'copyspell-ai'));
	}

			
	// Addons Manager
	// ----------------------------------------------------------
	//include_once __DIR__ . '/class-aai-addons-manager.php';
	//$addons_manager = new Copyspell_Addons_Manager();


	// Output installed add-ons to JS
	//$addons_manager->get_installed_addons();


	$logo_url = esc_url(plugins_url('img/logo.png', dirname(__FILE__)));
	?>

	<div class="copyspell-ai-admin">
		<div class="copyspell-ai-admin-header">
			<img src="<?php echo esc_url($logo_url); ?>" alt="<?php echo esc_attr__('CopySpell AI Logo', 'copyspell-ai'); ?>" class="copyspell-logo">
			<h1 class="copyspell-ai-admin-title"><?php echo esc_html(get_admin_page_title()); ?></h1>
			<div class="aai-credits-display">
				<div class="aai-credits-loader">
					<svg class="aai-spinner" viewBox="0 0 50 50">
						<circle cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
					</svg>
				</div>
			</div>
		</div>
		
		<!-- Tab Navigation -->
		<h2 class="copyspell-ai-nav-tab-wrapper">
			<div class="copyspell-ai-nav-tab" alt="home">
				<?php esc_html_e('Home', 'copyspell-ai'); ?>
			</div>
			<div class="copyspell-ai-nav-tab" alt="bulk">
				<?php esc_html_e('Bulk generation', 'copyspell-ai'); ?>
			</div>
			<div class="copyspell-ai-nav-tab" alt="settings">
				<?php esc_html_e('Settings', 'copyspell-ai'); ?>
			</div>
			<div class="copyspell-ai-nav-tab" alt="license">
				<?php esc_html_e('License', 'copyspell-ai'); ?>
			</div> 

			<div class="aai-rate-section">
				<a href="https://copyspell.ai/review-copyspell-ai/" target="_blank" class="aai-rate-btn"><?php esc_html_e('Rate CopySpell AI', 'copyspell-ai'); ?></a>
			</div>

		</h2>
		
		<!-- Tab Content -->
		<div class="copyspell-ai-tab-content"></div>
	</div>
	<?php
}
