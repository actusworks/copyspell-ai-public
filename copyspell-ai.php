<?php
/**
 * Plugin Name: CopySpell AI
 * Plugin URI: https://copyspell.ai
 * Description: AI-Powered Product Descriptions for WooCommerce
 * Version: 2.0.4
 * Author: Actus Anima
 * Author URI: https://actus.works
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: copyspell-ai
 */

 // Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}
 
// Define plugin constants
define('COPYSPELL_AI_VERSION', '2.0.4');
define('COPYSPELL_AI_URL', plugin_dir_url(__FILE__));
define('COPYSPELL_AI_PATH', plugin_dir_path(__FILE__));
define('COPYSPELL_AI_FILE', __FILE__);
define('COPYSPELL_AI_LICENSE_API_URL', 'https://license.actusanima.com/api');
define('COPYSPELL_AI_PLUGIN_SLUG', 'copyspell-ai');
define('COPYSPELL_AI_MODE', 'PROD');  // PROD or DEV
define('COPYSPELL_AI_SAMPLE_CALL', false);
define('COPYSPELL_AI_BATCH_PRODUCTS_PER_CALL', 3);

 

// Activation and deactivation hooks
require_once COPYSPELL_AI_PATH . 'php/copyspell-ai-activator.php';
require_once COPYSPELL_AI_PATH . 'php/copyspell-ai-deactivator.php';
register_activation_hook(__FILE__, 'copyspell_ai_activate');
register_deactivation_hook(__FILE__, 'copyspell_ai_deactivate');
register_uninstall_hook(__FILE__, 'copyspell_ai_uninstall');





// Initialize the plugin
add_action('init', 'copyspell_ai_init');
// ----------------------------------------------------------
function copyspell_ai_init() {

        
        // Initialize backend features
        if (is_admin() || (defined('DOING_AJAX') && DOING_AJAX) || class_exists('ActionScheduler')) {
            // Include necessary files
            require_once COPYSPELL_AI_PATH . 'php/copyspell-ai-backend.php';
            require_once COPYSPELL_AI_PATH . 'php/copyspell-ai-ajax.php';
                    
            //require_once COPYSPELL_AI_PATH . 'php/copyspell-ai-licensing.php';
            //require_once COPYSPELL_AI_PATH . 'php/copyspell-ai-updater.php';
            
            require_once COPYSPELL_AI_PATH . 'php/copyspell-ai-tools.php';
            require_once COPYSPELL_AI_PATH . 'php/class-aai-bulk-records.php';
            // Include Licensing and Updater Files
            //require_once COPYSPELL_AI_PATH . 'php/copyspell-ai-licensing.php';
            //require_once COPYSPELL_AI_PATH . 'php/copyspell-ai-updater.php';
        }


        // Initialize frontend features
        require_once COPYSPELL_AI_PATH . 'php/copyspell-ai-frontend.php';


        copyspell_ai_addons_manager_init();
        


        /*
        if (copyspell_ai_on()) {
            // Enable premium feature
        } else {
            // Show upgrade notice or disable feature
        }
        */


}








/**
 * Helper function to get the current WordPress site URL.
 * Used for sending to the licensing API.
 * @return string The site URL.
 */
function copyspell_ai_get_domain() {
    $url = get_site_url();
    $domain = wp_parse_url($url, PHP_URL_HOST);
    return $domain;
}

/**
 * Helper function to get the stored license key.
 * @return string The license key or empty string if not set.
 */
function copyspell_ai_get_license_key() {
    $license = get_option('copyspell-ai-license', ['key' => '', 'status' => 'inactive']);
    $key = copyspell_ai_decrypt_api_key($license['key']);
    return $key;
}

/**
 * Helper function to get the stored license status.
 * @return array The license status array or default values.
 */
function copyspell_ai_get_license_status() {

    return get_option('copyspell_ai_license_status', [
        'status' => 'inactive',
        'message' => 'License not activated.',
        'expires' => null,
        'activationsCount' => 0,
        'maxActivations' => 0,
    ]);
}

/**
 * Helper function to check if the plugin is licensed and active.
 * You can use this to conditionally enable/disable features.
 * @return bool True if licensed and active, false otherwise.
 */
function copyspell_ai_on() {
    $status = copyspell_ai_get_license_status();
    return (isset($status['status']) && 
        ($status['status'] === 'active' || $status['status'] === 'trial' || $status['status'] === 'expired trial'));
}





// Addons Manager Init
// ----------------------------------------------------------
function copyspell_ai_addons_manager_init() {

	include_once __DIR__ . '/php/class-aai-addons-manager.php';
	$addons_manager = new Copyspell_Addons_Manager();

	$addons = $addons_manager->load_installed_addons();

    return $addons;
}








// Add settings link
// ┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅
$copyspell_ai_plugin_name = plugin_basename(__FILE__);
add_filter("plugin_action_links_$copyspell_ai_plugin_name", 'copyspell_ai_settings_link' );
function copyspell_ai_settings_link( $links ) { 
    $settings_link = '<a href="admin.php?page=copyspell-ai">'. esc_html__( "Settings", "copyspell-ai" ) .'</a>'; 
    array_unshift( $links, $settings_link );
    return $links; 
}







