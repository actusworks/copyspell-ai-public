<?php
/**
 * Plugin Deactivator
 * Handles plugin deactivation tasks
 */


if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly





// MARK: Deactivation
// ----------------------------------------------------------
function copyspell_ai_deactivate() {

    // Remove database tables
    // copyspell_ai_remove_tables();

    // Remove options
    // copyspell_ai_remove_options();

    // Remove capabilities
    // copyspell_ai_remove_capabilities();

    // Clear scheduled events
    copyspell_ai_clear_scheduled_events();


    // LICENSE
    // Clear any scheduled WP-Cron events for the plugin
    wp_clear_scheduled_hook('copyspell_ai_daily_license_check');

    // Attempt to deactivate the license on the server
    copyspell_ai_deactivate_license_on_server();



}






// MARK: Tables
// ----------------------------------------------------------
function copyspell_ai_remove_tables() {
	global $wpdb;

    $settings = get_option('csai_options', array());
    $delete_data_on_deactivation = isset($settings['delete_data_on_deactivation']) ? $settings['delete_data_on_deactivation'] : false;
    
    if ($delete_data_on_deactivation) {
        require_once __DIR__ . '/class-aai-bulk-records.php';
        $records = new CSAI_Bulk_Records();
        $records->delete_tables();
        
        // Clean up options
        delete_option('csai_db_version');
        delete_option('csai_options');
    }


}





// MARK: Options
// ----------------------------------------------------------
function copyspell_ai_remove_options() {

    // Remove options for the plugin
    //delete_option('copyspell_ai_options');

}




// MARK: Capabilities
// ----------------------------------------------------------
function copyspell_ai_remove_capabilities() {

    // Remove custom capabilities for the plugin
    $role = get_role('editor');

    /*
    if ($role) {
        $role->remove_cap('read_private_products');
        $role->remove_cap('edit_products');
        $role->remove_cap('edit_published_products');
        $role->remove_cap('publish_products');
    }
    */
	
}


// MARK: Scheduled Events
// ----------------------------------------------------------
function copyspell_ai_clear_scheduled_events() {
    $timestamp = wp_next_scheduled('copyspell_ai_cron_job');
    if ($timestamp) {
        wp_unschedule_event($timestamp, 'copyspell_ai_cron_job');
    }

	// Clear any scheduled hooks
	wp_clear_scheduled_hook('copyspell_ai_cleanup_hook');
	wp_clear_scheduled_hook('copyspell_ai_sync_hook');

}







/**
 * The code that runs during plugin uninstallation.
 * This action is fired when the plugin is uninstalled.
 */
function copyspell_ai_uninstall() {
    // Clear any scheduled WP-Cron events for the plugin
    wp_clear_scheduled_hook('copyspell_ai_daily_license_check');

    // Attempt to deactivate the license on the server
    copyspell_ai_deactivate_license_on_server();

    // Delete plugin options from the database
    //delete_option('copyspell_ai_license_key');
    //delete_option('copyspell_ai_license_status');

    // You might want to delete other plugin-specific data here
    // For example: delete_option('copyspell_ai_some_other_setting');
}





/**
 * Sends a deactivation request to the licensing server.
 * This function is called on both deactivation and uninstallation.
 */
function copyspell_ai_deactivate_license_on_server() {
    $license_key = copyspell_ai_get_license_key();
    if (empty($license_key)) {
        return; // No license key to deactivate
    }

    $domain = copyspell_ai_get_domain();
    $plugin_id = COPYSPELL_AI_PLUGIN_SLUG;

    $response = wp_remote_post(
        COPYSPELL_AI_LICENSE_API_URL . '/license/deactivate',
        [
            'body'    => wp_json_encode([
                'licenseKey' => $license_key,
                'domain'     => $domain,
                'pluginId'   => $plugin_id,
            ]),
            'headers' => ['Content-Type' => 'application/json'],
            'timeout' => 15, // seconds
            'blocking' => false, // Don't block WordPress execution, send in background
            'sslverify' => false, // Set to true in production with valid SSL
        ]
    );

    if (is_wp_error($response)) {
        //error_log('CopySpell AI License Deactivation Error: ' . $response->get_error_message());
    } else {
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        if (isset($data['success']) && $data['success']) {
            //error_log('CopySpell AI License successfully deactivated on server for site: ' . $domain);
        } else {
            //error_log('CopySpell AI License Deactivation Failed on server: ' . ($data['message'] ?? 'Unknown error.'));
        }
    }
}



