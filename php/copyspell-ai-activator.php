<?php
/**
 * Plugin Activator
 * Handles plugin activation tasks
 */



if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly


include_once __DIR__ . '/log.php';


// MARK: Activation
// ----------------------------------------------------------
function copyspell_ai_activate() {

    // Create database tables
    copyspell_ai_create_tables();
    
    // Set default options
    copyspell_ai_set_default_options();

    // Ensure installation is registered before making API calls
    copyspell_ai_register_site_signature();
    
    // Create necessary capabilities
    copyspell_ai_create_capabilities();
    
    // Flush rewrite rules
    copyspell_ai_flush_rewrite_rules();
}





function copyspell_ai_create_tables(){
    require_once __DIR__ . '/class-aai-bulk-records.php';
    $records = new CSAI_Bulk_Records();
    $records->create_tables();
    
    // Store database version for future updates
    update_option('copyspell_ai_db_version', '1.0');
}



// MARK: Options
// ----------------------------------------------------------
function copyspell_ai_set_default_options() {

    // Set default options for the plugin
    $default_options = array(
        'enabled'   => true,
        'api'       => array()
    );
    add_option('copyspell_ai_options', $default_options);
 
}


// MARK: Remote Registration
// ----------------------------------------------------------
function copyspell_ai_register_site_signature() {

    // delete_option('copyspell_ai_signature'); // For testing purposes only

    $existing_signature = get_option('copyspell_ai_signature', '' );

    if ( ! empty( $existing_signature ) ) {
        return;
    }

    $home_url   = home_url();
    $site_url   = site_url();
    $domain     = wp_parse_url( $home_url, PHP_URL_HOST );

    if ( empty( $domain ) ) {
        $domain = $home_url;
    }

    // Generate verification token and store in transient
    // Server will callback to verify we control this domain
    $verify_token = bin2hex( random_bytes( 16 ) );
    set_transient( 'copyspell_verification_token', $verify_token, 300 ); // 5 min expiry

    $payload    = array(
        'domain'          => $domain,
        'home_url'        => $home_url,
        'site_url'        => $site_url,
        'site_name'       => get_option('blogname'),
        'verify_token'    => $verify_token,
        'admin_email'     => get_option('admin_email'),
        'wp_version'      => get_bloginfo('version'),
        'service'         => 'copyspell-ai',
        'service_version' => defined('COPYSPELL_AI_VERSION') ? COPYSPELL_AI_VERSION : null,
    );


    $request_args = array(
        'timeout' => 20,
        'headers' => array(
            'Content-Type' => 'application/json',
        ),
        'body'    => wp_json_encode( $payload ),
    );

    $response = wp_remote_post( 'https://copyspell.actusanima.com/v1/register', $request_args );


    if ( is_wp_error( $response ) ) {
        copyspell_ai_log_registration_issue( 'signature_request_failed', $response->get_error_message() );
        return;
    }

    $code     = wp_remote_retrieve_response_code( $response );
    $raw_body = wp_remote_retrieve_body( $response );
    $body     = json_decode( $raw_body, true );

    if ( ! is_array( $body ) ) {
        copyspell_ai_log_registration_issue( 'signature_request_invalid_body', array(
            'code' => $code,
            'body' => $raw_body,
        ) );
        return;
    }

    if ( 200 === (int) $code && isset( $body['signature'] ) && ! empty( $body['signature'] ) ) {
        update_option( 'copyspell_ai_signature', sanitize_text_field( $body['signature'] ) );
        delete_transient( 'copyspell_verification_token' ); // Clean up
        return;
    }

    copyspell_ai_log_registration_issue( 'signature_request_invalid', array(
        'code' => $code,
        'body' => $body,
    ) );

    delete_transient( 'copyspell_verification_token' ); // Clean up on failure too
}







// MARK: Logging
// ----------------------------------------------------------
function copyspell_ai_log_registration_issue( $message, $context = null ) {
    if ( function_exists( 'csai_log' ) ) {
        csai_log( $message, $context );
        return;
    }

    error_log( '[CopySpell AI] ' . $message . ' ' . print_r( $context, true ) );
}
















// MARK: Capabilities
// ----------------------------------------------------------
function copyspell_ai_create_capabilities() {
    // Add custom capabilities for the plugin
    $role = get_role('editor');
    /*
    if ($role) {
        $role->add_cap('read_private_products');
        $role->add_cap('edit_products');
        $role->add_cap('edit_published_products');
        $role->add_cap('publish_products');
    }
    */
}




// MARK: Flush Rewrite Rules
// Flush rewrite rules to ensure custom post types and taxonomies work correctly
// ----------------------------------------------------------
function copyspell_ai_flush_rewrite_rules() {
    flush_rewrite_rules();
}
