<?php
/**
 * CopySpell AI - Domain Verification Endpoint
 * This file handles server callbacks for domain ownership verification.
 * It must be a standalone file to bypass page caching.
 */

// Prevent WordPress from loading heavy components
define( 'SHORTINIT', true );

// Find and load WordPress
$wp_load_path = dirname( __FILE__ ) . '/../../../../wp-load.php';

// Fallback: try to find wp-load.php by traversing up
if ( ! file_exists( $wp_load_path ) ) {
    $dir = dirname( __FILE__ );
    for ( $i = 0; $i < 10; $i++ ) {
        $dir = dirname( $dir );
        if ( file_exists( $dir . '/wp-load.php' ) ) {
            $wp_load_path = $dir . '/wp-load.php';
            break;
        }
    }
}

if ( ! file_exists( $wp_load_path ) ) {
    header( 'Content-Type: application/json; charset=utf-8' );
    http_response_code( 500 );
    echo json_encode( array( 'error' => 'WordPress not found' ) );
    exit;
}

require_once $wp_load_path;

// With SHORTINIT, we need to manually load what we need
require_once ABSPATH . WPINC . '/formatting.php';
require_once ABSPATH . WPINC . '/option.php';

// Prevent caching
header( 'Content-Type: application/json; charset=utf-8' );
header( 'Cache-Control: no-cache, no-store, must-revalidate' );
header( 'Pragma: no-cache' );
header( 'Expires: 0' );
header( 'X-Robots-Tag: noindex, nofollow' );

// Get token from request
$provided_token = isset( $_GET['token'] ) ? sanitize_text_field( wp_unslash( $_GET['token'] ) ) : '';
$stored_token   = get_transient( 'copyspell_verification_token' );

// Verify
if ( $stored_token && $provided_token === $stored_token ) {
    echo json_encode( array(
        'verified' => true,
        'token'    => $provided_token,
    ) );
} else {
    http_response_code( 403 );
    echo json_encode( array( 
        'verified' => false,
        'debug'    => array(
            'provided' => $provided_token ? substr( $provided_token, 0, 8 ) . '...' : 'empty',
            'stored'   => $stored_token ? substr( $stored_token, 0, 8 ) . '...' : 'empty',
        ),
    ) );
}
exit;
