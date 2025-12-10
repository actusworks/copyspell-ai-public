<?php


if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly


include_once __DIR__ . '/log.php';


add_action('wp_enqueue_scripts', 'copyspell_ai_frontend_scripts');


// Enqueue frontend scripts and styles
// ----------------------------------------------------------
function copyspell_ai_frontend_scripts() {
	global $post;
	
    if ( ! copyspell_ai_allowed() ) return;
	//if ( ! copyspell_ai_on() ) return;
    if ( is_admin() || wp_doing_ajax() || defined('REST_REQUEST') ) return;
    if (!is_singular() || !isset($post->ID)) return;

	$manifest = json_decode(file_get_contents(COPYSPELL_AI_PATH . 'dist/manifest-frontend.json'), true);

	wp_enqueue_script('jquery');
	wp_enqueue_script( 'wp-api-fetch' );
	wp_enqueue_script( 'wp-i18n' );

	// Enqueue Google Fonts
	wp_enqueue_style(
		'copyspell-ai-google-fonts',
		'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;700;900&family=Geologica:wght@300;400;700;900&family=Sofia+Sans+Condensed:wght@100..1000&display=swap&subset=greek',
		array(),
		null // No version for external fonts
	);

	// Enqueue CSS
	wp_enqueue_style(
		'copyspell-ai-frontend-css',
		COPYSPELL_AI_URL . 'css/frontend.css',
		array('copyspell-ai-google-fonts'), // Depend on fonts loading first
		COPYSPELL_AI_VERSION
	);


	// Enqueue CSS
	wp_enqueue_style(
		'copyspell-ai-common-css',
		COPYSPELL_AI_URL . 'css/common.css',
		array(),
		COPYSPELL_AI_VERSION
	);


	// Enqueue JavaScript
	//$handle = 'copyspell-ai-frontend-js';
	//$src = COPYSPELL_AI_URL . 'dist/' . $manifest['frontend.js']['file'];
	
    //wp_enqueue_script($handle, $src, ['jquery'], null, true);


	// Localize frontend script with settings
	// ----------------------------------------------------------
    $signature = get_option('copyspell_ai_signature', '' );
	$options = get_option('copyspell_ai_options', array());
    if (is_array($options) && isset($options['api'])) {
        foreach ($options['api'] as $provider => &$config) {
            if (!empty($config['key'])) {
                $config['key'] = copyspell_ai_decrypt_api_key($config['key']);
            }
        }
    }

	$data = array(
		'domain' => wp_parse_url( home_url(), PHP_URL_HOST ),
		'siteUrl' => get_site_url(),
		'siteName' => get_bloginfo('name'),
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.MissingUnslash -- wp_unslash() is applied to both $_SERVER variables.
		'currentUrl' => esc_url_raw((is_ssl() ? "https" : "http") . "://" . sanitize_text_field(wp_unslash($_SERVER['HTTP_HOST'] ?? '')) . sanitize_text_field(wp_unslash($_SERVER['REQUEST_URI'] ?? ''))),
		'ajax_url' => admin_url('admin-ajax.php'),
		'nonce' => wp_create_nonce('copyspell_ai_admin_nonce'),
		'locale' => get_locale(),
		//'copyspell_ai_on' => copyspell_ai_on(),
		'logo' => plugins_url('img/logo.png', dirname(__FILE__)),
		'logoWhite' => plugins_url('img/logo-white.png', dirname(__FILE__)),
		'logoWhite2s' => plugins_url('img/logo-white-2s.png', dirname(__FILE__)),
		'logoWhite3s' => plugins_url('img/logo-white-3s.png', dirname(__FILE__)),
		'post' => array(
			'id'           => $post->ID,
			'title'        => get_the_title( $post ),
			'slug'         => $post->post_name,
			'status'       => $post->post_status,
			'permalink'    => get_permalink( $post ),
			'author'       => get_the_author_meta( 'display_name', $post->post_author ),
			'postType'     => get_post_type( $post ),
		),
		'license_api_url' => COPYSPELL_AI_LICENSE_API_URL,
		'plugin_url' => COPYSPELL_AI_URL,
		'plugin_path' => COPYSPELL_AI_PATH,
		'version' => COPYSPELL_AI_VERSION,
		'mode' => COPYSPELL_AI_MODE,
		'sample_call' => COPYSPELL_AI_SAMPLE_CALL,
		'options' => $options,
		'signature' => $signature,
		'postId'       => $post->ID,
		'postType'     => get_post_type( $post ),
		'taxonomyTerms' => wp_get_post_terms( $post->ID, 'your_taxonomy', [ 'fields' => 'names' ] ),
		/*
		'strings' => array(
			'loading' => __('Loading...', 'copyspell-ai'),
			'error' => __('An error occurred. Please try again.', 'copyspell-ai')
		)
		*/
	);
	//wp_localize_script($handle, 'copyspell_ai_data', $data);

	// Set script type to module AFTER localization
	//wp_script_add_data($handle, 'type', 'module');



	// FRONTEND ADMIN SCRIPTS
	// ----------------------------------------------------------


	$manifest = json_decode(file_get_contents(COPYSPELL_AI_PATH . 'dist/manifest-frontend-admin.json'), true);


	$handle = 'copyspell-ai-frontend-admin-js';
	$src = COPYSPELL_AI_URL . 'dist/' . $manifest['frontend-admin.js']['file'];

	// DEV
	if ( COPYSPELL_AI_MODE == 'DEV' )
		$src = COPYSPELL_AI_URL . 'js/frontend-admin.js';

	
	//if ( copyspell_ai_on() )
	wp_enqueue_script($handle, $src, ['jquery','wp-api-fetch', 'wp-i18n'], COPYSPELL_AI_VERSION, true);
	


	$data['restNonce'] = wp_create_nonce( 'wp_rest' );
	$data['restUrl'] = rest_url();

	//error_log('------------ Setting frontend-admin data');

	// WooCommerce Data
	if ( class_exists( 'WooCommerce' ) ) {
		$data['woocommerce'] = array(
			'wcRestUrl' => get_rest_url( null, 'wc/v3/' ),
			'isActive' => true,
			'version' => WC_VERSION,
			'woo_settings' => get_option('woocommerce_settings', array()),
			'currency' => get_woocommerce_currency(),
			'currencySymbol' => get_woocommerce_currency_symbol(),
			'supportedGateways' => WC()->payment_gateways->get_available_payment_gateways(),
			//'supportedShippingMethods' => WC()->shipping->get_shipping_methods(),
			'cart' => array(
				'items' => WC()->cart->get_cart(),
				'total' => WC()->cart->get_total(),
			),
		);

		if ( is_product() ) {
			$product = wc_get_product( get_the_ID() );
       		if ( isset( $product ) && $product ) {
				//error_log( '------------ Setting product data' );


				$data['woocommerce']['product'] = array(
					'id'            => $product->get_id(),
					'name'          => $product->get_name(),
					'slug'          => $product->get_slug(),
					'price'         => $product->get_price(),
					'regular_price' => $product->get_regular_price(),
					'sale_price'    => $product->get_sale_price(),
					'sku'           => $product->get_sku(),
					'stock_status'  => $product->get_stock_status(),
					'permalink'     => get_permalink( $product->get_id() ),
					'categories'    => wp_get_post_terms( $product->get_id(), 'product_cat', [ 'fields' => 'names' ] ),
					'tags'          => wp_get_post_terms( $product->get_id(), 'product_tag', [ 'fields' => 'names' ] ),
					'image'         => wp_get_attachment_image_url( $product->get_image_id(), 'full' ),
				);
			}
		}


		//error_log( print_r( $data, true ) );
		
		wp_localize_script($handle, 'copyspell_ai_admin', $data);

	}






}




// =====================================================
add_filter( 'script_loader_tag', 'copyspell_ai_script_module_fe', 10, 3 );
function copyspell_ai_script_module_fe( $tag, $handle, $src ) {

	if ( $handle == 'copyspell-ai-frontend-admin-js' || $handle == 'copyspell-ai-frontend-js' ) {
		// phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedScript -- Modifying enqueued script tag to add type="module" attribute.
		return '<script src="' . $src . '" type="module"></script>' . "\n";
	}

	return $tag;

}







