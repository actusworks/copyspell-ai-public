<?php

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly



include_once __DIR__ . '/class-aai-addons-manager.php';
include_once __DIR__ . '/copyspell-ai-bulk.php';
include_once __DIR__ . '/copyspell-ai-ajax-query.php';



add_action('wp_ajax_copyspell_ai_save_settings', 'copyspell_ai_ajax_save_settings');
add_action('wp_ajax_nopriv_copyspell_ai_save_settings', 'copyspell_ai_ajax_save_settings');

add_action('wp_ajax_copyspell_ai_load_option', 'copyspell_ai_ajax_load_option');
add_action('wp_ajax_nopriv_copyspell_ai_load_option', 'copyspell_ai_ajax_load_option');


// AJAX handlers for frontend
//add_action('wp_ajax_nopriv_copyspell_ai_search_stores', 'copyspell_ai_ajax_search_stores');




// MARK: Load Option
// ----------------------------------------------------------
function copyspell_ai_ajax_load_option() {
    check_ajax_referer('copyspell_ai_admin_nonce', 'nonce');
    
    if (!current_user_can('edit_posts') && !current_user_can('manage_options')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'copyspell-ai')));
        return;
    }
    
    //error_log('=============================== LOAD OPTION');

    // Get the option name from the request
    $option_name = sanitize_text_field(wp_unslash($_POST['name'] ?? ''));
    

    // Retrieve the option value from the database
    $option_value = get_option($option_name);

    //error_log('=============================== LOAD OPTION');
    //error_log('option_name ====='. $option_name);
    //error_log('option_value ====='. print_r($option_value, true));
 
    if (is_array($option_value) && isset($option_value['api'])) {
        foreach ($option_value['api'] as $provider => &$config) {
            if (!empty($config['key'])) {
                $config['key'] = copyspell_ai_decrypt_api_key($config['key']);
            }
        }
    }
    //error_log('option_value ====='. print_r($option_value, true));
    
    if ( is_array($option_value) && $option_value['key'] ) {
        $option_value['key'] = copyspell_ai_decrypt_api_key($option_value['key']);
    }


    //error_log('option_name ====='. $option_name);
    //error_log('option_value ====='. print_r($option_value, true));


    if ($option_value !== false) {
        wp_send_json_success(array(
            'message' => 'Option loaded successfully.',
            'options' => $option_value,
            'name' => $option_name
        ));
    } else {
        wp_send_json_error(array('message' => __('Error loading option.', 'copyspell-ai')));
    }
}




// MARK: Save Settings
// ----------------------------------------------------------
function copyspell_ai_ajax_save_settings() {
    check_ajax_referer('copyspell_ai_admin_nonce', 'nonce');

    if (!current_user_can('manage_options')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'copyspell-ai')));
    }
    
    //error_log('=============================== SAVE SETTINGS');


    
    // Parse the JSON options
    $options_name = sanitize_text_field(wp_unslash($_POST['name'] ?? ''));
    $options = wp_unslash($_POST['options'] ?? '');
    
    //error_log('name ====='. $options_name);
    //error_log('options ====='. print_r($options, true));

    // Try to decode if it's a JSON string
    $parsed_options = $options;
    if (is_string($options)) {
        $decoded = json_decode(stripslashes($options), true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $parsed_options = $decoded;
        }
    }

    //error_log('parsed_options ====='. print_r($parsed_options, true));

    // Sanitize the options only if it's an array, otherwise keep as string
    if (is_array($parsed_options)) {
        $sanitized_options = copyspell_ai_sanitize_options( $parsed_options );
     
    } else {
        $sanitized_options = copyspell_ai_sanitize_options( array($parsed_options) );
        $sanitized_options = $sanitized_options[0];
    }


    // if we are saving main options
    if ( ! $options_name ) {
        $options_name = 'copyspell_ai_options';
            
        // Get current options
        $current_options = get_option('copyspell_ai_options', array());

        // Merge with existing options
        $updated_options = array_merge($current_options, $sanitized_options);

        
        // Encrypt API keys before saving
        if (isset($updated_options['api'])) {
            foreach ($updated_options['api'] as $provider => &$config) {
                if (!empty($config['key'])) {
                    $config['key'] = copyspell_ai_encrypt_api_key($config['key']);
                }
            }
        }


        // Check if the option was saved or if it already exists with the same value
        $saved_options = get_option('copyspell_ai_options');
        if ( $current_options === $updated_options ) {
            wp_send_json_success(array(
                'message' => 'Settings are already up to date.',
                'options' => $updated_options
            ));
            return;
        }
        
    } else {

        
        // Get current options
        $current_options = get_option($options_name, false);
        $updated_options = $sanitized_options;

        if ( is_array($updated_options) && $updated_options['key'] ) {
            $updated_options['key'] = copyspell_ai_encrypt_api_key($updated_options['key']);
        }

    }



    //error_log('=============================== SAVE SETTINGS');
    //error_log('options_name ===== '. $options_name);
    //error_log('updated_options ====='. print_r($updated_options, true));


    // Save to database
    $result = update_option($options_name, $updated_options);
    
    //error_log(print_r($result, true));
    
    if ($result !== false || $current_options === $updated_options ) {
        $message = 'Settings saved successfully!';
        if ( isset($api_status_updated) && $api_status_updated) {
            $message .= ' API keys have been tested and their status updated.';
        }


        if (is_array($updated_options) && isset($updated_options['api'])) {
            foreach ($updated_options['api'] as $provider => &$config) {
                if (!empty($config['key'])) {
                    $config['key'] = copyspell_ai_decrypt_api_key($config['key']);
                }
            }
        }
        
        
        wp_send_json_success(array(
            'message' => $message,
            'options' => $updated_options,
            'name'    => $options_name
        ));
    } else {
        wp_send_json_error(array('message' => __('Error saving settings.', 'copyspell-ai')));
    }
}









// MARK: Sanitize
// ----------------------------------------------------------
// Helper function to recursively sanitize options
function copyspell_ai_sanitize_options($options) {

    $sanitized = array();
    
    foreach ($options as $key => $value) {
        $sanitized_key = sanitize_key($key);
        
        if (is_array($value)) {
            $sanitized[$sanitized_key] = copyspell_ai_sanitize_options($value);
        } elseif (is_string($value)) {
            $sanitized[$sanitized_key] = sanitize_text_field($value);
        } elseif (is_numeric($value)) {
            $sanitized[$sanitized_key] = is_float($value) ? floatval($value) : intval($value);
        } elseif (is_bool($value)) {
            $sanitized[$sanitized_key] = (bool) $value;
        } else {
            $sanitized[$sanitized_key] = $value;
        }
    }
    
    return $sanitized;
}
















// MARK: Encryption
// ----------------------------------------------------------

/**
 * Encrypt API keys
 */
function copyspell_ai_encrypt_api_key($key) {
    if (empty($key)) return '';
    
    $salt = wp_salt('auth');
    $encrypted = openssl_encrypt($key, 'AES-256-CBC', $salt, 0, substr($salt, 0, 16));
    return base64_encode($encrypted);
}

/**
 * Decrypt API keys
 */
function copyspell_ai_decrypt_api_key($encrypted_key) {
    if (empty($encrypted_key)) return '';
    
    $salt = wp_salt('auth');
    $decoded = base64_decode($encrypted_key);
    $decrypted = openssl_decrypt($decoded, 'AES-256-CBC', $salt, 0, substr($salt, 0, 16));
    
    // If decryption fails (key might already be plain text), return original
    if ($decrypted === false) {
        return $encrypted_key;
    }
    
    return $decrypted;
}

























