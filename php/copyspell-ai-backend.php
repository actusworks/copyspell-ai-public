<?php


if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly



include_once __DIR__ . '/copyspell-ai-admin-menu.php';
include_once __DIR__ . '/log.php';



add_action('admin_enqueue_scripts', 'copyspell_ai_backend_scripts');


// Disable emoji conversion in admin for our plugin
add_action('admin_init', 'copyspell_ai_disable_emoji_conversion');
function copyspell_ai_disable_emoji_conversion() {
	// Remove WordPress emoji scripts and styles in admin
	remove_action('admin_print_scripts', 'print_emoji_detection_script');
	remove_action('admin_print_styles', 'print_emoji_styles');
}




// MARK: Enqueue Scripts
// Enqueue backend scripts and styles
// ----------------------------------------------------------
function copyspell_ai_backend_scripts($hook) {
	global $post;

	// DEBUG
	// Delete copyspell_ai meta if product exists
	if (isset($post) && $post->post_type === 'product') {
		//delete_post_meta($post->ID, 'copyspell_ai');
	}
	

    if ( wp_doing_ajax() || defined('REST_REQUEST') ) return;
	// Only load on our admin pages
	if (strpos($hook, 'copyspell') === false && strpos($hook, '-ai') === false && 
		$hook != 'post.php' && $hook != 'post-new.php') {
		return;
	}
	  

	$manifest = json_decode(file_get_contents(COPYSPELL_AI_PATH . 'dist/manifest-backend.json'), true);

 

	wp_enqueue_script('jquery');
	wp_enqueue_script( 'wp-api-fetch' );
	wp_enqueue_script( 'wp-i18n' );
	//wp_enqueue_script( 'wp-url' );

	// Enqueue Google Fonts
	wp_enqueue_style(
		'copyspell-ai-google-fonts',
		'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;700;900&family=Geologica:wght@300;400;700;900&display=swap&subset=greek',
		array(),
		null
	);


	
	if ((($hook == 'post.php' || $hook == 'post-new.php') && 
		isset($post) && $post->post_type == 'product') ||
		strpos($hook, 'copyspell') !== false ) {

		// Enqueue CSS
		wp_enqueue_style(
			'copyspell-ai-backend-css',
			COPYSPELL_AI_URL . 'css/backend.css',
			array(),
			COPYSPELL_AI_VERSION  
		);
		
	}
		
	if (($hook == 'post.php' || $hook == 'post-new.php') && 
		isset($post) && $post->post_type == 'product') {
		
		// Enqueue CSS
		wp_enqueue_style(
			'copyspell-ai-frontend-css',
			COPYSPELL_AI_URL . 'css/frontend.css',
			array(),
			COPYSPELL_AI_VERSION
		);

	}

	if (
		( ($hook == 'post.php' || $hook == 'post-new.php') && 
		isset($post) && $post->post_type == 'product' )  ||
		strpos($hook, 'copyspell') !== false
	) {
		
		// Enqueue CSS
		wp_enqueue_style(
			'copyspell-ai-common-css',
			COPYSPELL_AI_URL . 'css/common.css',
			array(),
			COPYSPELL_AI_VERSION
		);

	}


	// Enqueue JavaScript
	$handle = 'copyspell-ai-backend-js';
	$src = COPYSPELL_AI_URL . 'dist/' . $manifest['backend.js']['file'];

	// DEV
	if ( COPYSPELL_AI_MODE == 'DEV' )
		$src = COPYSPELL_AI_URL . 'js/backend.js';

	wp_enqueue_script($handle, $src, ['jquery','wp-api-fetch', 'wp-i18n'], COPYSPELL_AI_VERSION, true);
	

	
	// Make translations available to JS 
	$locale = determine_locale();
	
	// Use base path for hash calculation to match JSON filename (regardless of Vite hash)
	$translation_path = ( COPYSPELL_AI_MODE == 'DEV' ) ? 'js/backend.js' : 'dist/backend.js';
	$expected_hash = md5($translation_path);

	
	// Add cache buster to force reload
	add_filter('load_script_translation_file', function($file, $handle_filter, $domain) use ($handle) {
		if ($handle_filter === $handle && $domain === 'copyspell-ai') {
			if (file_exists($file)) {
				//error_log('File exists! Content: ' . substr(file_get_contents($file), 0, 200));
			} else {
				//error_log('File does NOT exist!');
			}
		}
		return $file;
	}, 10, 3);
	
	wp_set_script_translations($handle, 'copyspell-ai', COPYSPELL_AI_PATH . 'languages');
	

	// manually inject translations using setLocaleData
	// wp_set_script_translations doesn't work properly with ES6 modules
	$json_file = COPYSPELL_AI_PATH . 'languages/copyspell-ai-' . $locale . '-' . $expected_hash . '.json';
	if (file_exists($json_file)) {
		$translations_json = json_decode(file_get_contents($json_file), true);
		if (isset($translations_json['locale_data']['copyspell-ai'])) {
			$locale_data = wp_json_encode($translations_json['locale_data']['copyspell-ai']);
			$inline_script = sprintf(
				'wp.i18n.setLocaleData(%s, "copyspell-ai");',
				$locale_data
			);
			wp_add_inline_script('wp-i18n', $inline_script, 'after');
		}
	}




	// MARK: LOCALIZE


	// Localize admin script with settings
    $signature = get_option('copyspell_ai_signature', '' );
	$options = get_option('copyspell_ai_options', array());
    if (is_array($options) && isset($options['api'])) {
        foreach ($options['api'] as $provider => &$config) {
            if (!empty($config['key'])) {
                $config['key'] = copyspell_ai_decrypt_api_key($config['key']);
            }
        }
    }


	//error_log('------------ Setting backend data');

	$data = array(
		'domain' => wp_parse_url( home_url(), PHP_URL_HOST ),
		'siteUrl' => get_site_url(),
		'siteName' => get_bloginfo('name'),
		'currentUrl' => esc_url_raw(home_url(add_query_arg(null, null))),
		'restNonce' => wp_create_nonce( 'wp_rest' ),
		'restUrl'   => rest_url(),
		'ajax_url' => admin_url('admin-ajax.php'),
		'nonce' => wp_create_nonce('copyspell_ai_admin_nonce'),
		'locale' => get_locale(),
		//'copyspell_ai_on' => copyspell_ai_on(),
		'logo' => plugins_url('img/logo.png', dirname(__FILE__)),
		'logoWhite' => plugins_url('img/logo-white.png', dirname(__FILE__)),
		'logoWhite2s' => plugins_url('img/logo-white-2s.png', dirname(__FILE__)),
		'logoWhite3s' => plugins_url('img/logo-white-3s.png', dirname(__FILE__)),
		'placeholder' => plugins_url('img/placeholder.jpg', dirname(__FILE__)),
		'isGutenberg' => function_exists('is_gutenberg_page') && is_gutenberg_page(),
		'isAdmin' => is_admin(),
		'license_api_url' => COPYSPELL_AI_LICENSE_API_URL,
		'plugin_url' => COPYSPELL_AI_URL,
		'plugin_path' => COPYSPELL_AI_PATH,
		'version' => COPYSPELL_AI_VERSION,
		'mode' => COPYSPELL_AI_MODE,
		'sample_call' => COPYSPELL_AI_SAMPLE_CALL,
		'options' => $options,
		'signature' => $signature,
		'wordpress_version' => get_bloginfo('version'),
		'addons' => copyspell_ai_addons_manager_init()
	);
	$current_user = wp_get_current_user();
	$data['currentUser'] = array(
		'id'       => $current_user->ID,
		'username' => $current_user->user_login,
		'email'    => $current_user->user_email,
		'roles'    => $current_user->roles,
	);


	
	// Get the status of revisions in WordPress
	$revisions_enabled = false;
	$revisions_max = null;
	if ( defined( 'WP_POST_REVISIONS' ) ) {
		if ( WP_POST_REVISIONS === false ) {
			$revisions_enabled = false;
		} elseif ( is_numeric( WP_POST_REVISIONS ) && WP_POST_REVISIONS > 0 ) {
			$revisions_enabled = true;
			$revisions_max = intval( WP_POST_REVISIONS );
		} elseif ( WP_POST_REVISIONS === true ) {
			$revisions_enabled = true;
		}
	} else {
		// Default: revisions are enabled
		$revisions_enabled = true;
	}
	$data['revisions_enabled'] = $revisions_enabled;
	$data['revisions_max'] = $revisions_enabled ? ( $revisions_max !== null ? $revisions_max : -1 ) : 0;
	$data['revisions_max'] = WP_POST_REVISIONS;




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
			'store_url' => wc_get_page_permalink( 'shop' ),
			'taxonomies' => csai_get_taxonomies( 'product' ),
			//'supportedShippingMethods' => WC()->shipping->get_shipping_methods(),
		);

		if ( isset( $post ) ) {
			$data['post'] = array(
				'id'           => $post->ID,
				'title'        => get_the_title( $post ),
				'slug'         => $post->post_name,
				'status'       => $post->post_status,
				'permalink'    => get_permalink( $post ),
				'author'       => get_the_author_meta( 'display_name', $post->post_author ),
				'postType'     => get_post_type( $post ),
				'image'  	   => get_the_post_thumbnail_url($post->ID, 'full') ?: ''
			);
			if ( $post->post_type === 'product' ) {
				$product = wc_get_product( $post->ID );
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
		
		} else {
			$data['post'] = array();
			$data['woocommerce']['product'] = array();
		}


	} else {
		$data['woocommerce'] = array(
			'isActive' => false,
		);
	}



	wp_localize_script($handle, 'copyspell_ai_admin', $data);


	// Set script type to module AFTER localization
	//wp_script_add_data($handle, 'type', 'module');

	
}



// MARK: Add Metabox to Product Edit Screen
// ----------------------------------------------------------
//add_action( 'add_meta_boxes', 'csai_add_metabox_to_product_edit' );
// ----------------------------------------------------------
function csai_add_metabox_to_product_edit() {
	$logo = plugins_url('img/logo.png', dirname(__FILE__));
	$logo = "<img src='$logo' alt='CopySpell AI Logo'>";
	add_meta_box(
		'copyspell_ai_metabox',
		'<span class="copyspell-ai-title">' . $logo . esc_html__('CopySpell AI', 'copyspell-ai') . '</span>',
		'csai_render_product_metabox',
		'product',
		'side',
		'high'
	);
}
// ----------------------------------------------------------
function csai_render_product_metabox( $post ) {
	?>
	<div id="copyspell-ai-metabox">
		<div id="copyspell-ai-generate-content" class="aai-btn aai-btn-primary">
			<?php esc_html_e( 'Product Content', 'copyspell-ai' ); ?>
		</div>
		<div id="copyspell-ai-generate-marketing" class="aai-btn aai-btn-primary">
			<?php esc_html_e( 'Marketing Content', 'copyspell-ai' ); ?>
		</div>
		<div id="copyspell-ai-generate-seo" class="aai-btn aai-btn-primary">
			<?php esc_html_e( 'SEO Tools', 'copyspell-ai' ); ?>
		</div>
		<div id="copyspell-ai-metabox-status"></div>
	</div>
	<?php
}




// MARK: Add Metabox to Product Edit Screen
// ----------------------------------------------------------
add_action('edit_form_after_title', function($post) {
    if ($post->post_type !== 'product') return;
	$logo = plugins_url('img/logo.png', dirname(__FILE__));
	$logo = "<img src='$logo' alt='CopySpell AI Logo'>";
?>
	<div id="copyspell-ai-metabox-app">
		<div class="copyspell-ai-flex">

			<?php echo wp_kses_post($logo); ?>

			<div id="copyspell-ai-generate-content" class="aai-btn aai-btn-primary aai-disabled">
				<?php esc_html_e( 'Product Content', 'copyspell-ai' ); ?>
			</div>
			<div id="copyspell-ai-generate-marketing" class="aai-btn aai-btn-primary aai-disabled">
				<?php esc_html_e( 'Marketing Content', 'copyspell-ai' ); ?>
			</div>
			<div data-copyspell-slot="metabox"></div>
			<div class="copyspell-ai-text">CopySpell AI</div>
		</div>
		<div id="copyspell-ai-metabox-status"></div>
	</div>
<?php
});






// MARK: Get Taxonomies
// ----------------------------------------------------------
function csai_get_taxonomies( $name = 'product') {
	$product_taxonomies = get_object_taxonomies($name, 'objects');
	$taxonomy_data = array();
	foreach ($product_taxonomies as $taxonomy) {
		if (strpos($taxonomy->name, 'pa_') === 0) continue;
		if (in_array($taxonomy->name, ['product_type', 'product_visibility', 'product_shipping_class'])) {
			continue;
		}
		
        $key = $taxonomy->name;
        if ( $key === 'product_cat' ) {
            $key = 'categories';
        } elseif ( $key === 'product_tag' ) {
            $key = 'tags';
        }
		$taxonomy_data[$key] = $taxonomy;
		$taxonomy_data[$key]->terms = csai_get_terms( $taxonomy->name );
		/*
        $result[$tax_key] = array(
            'meta_key' => $tax_obj->name,
            'label' => $tax_obj->label,
            // Add other properties you need
        );
		*/
	}
	return $taxonomy_data;

}



// MARK: Get Terms
// ----------------------------------------------------------
function csai_get_terms( $taxonomy = 'product_cat' ) {
	$terms = get_terms( array(
		'taxonomy' => $taxonomy,
		'hide_empty' => false,
		'orderby'    => 'name',
		'order'      => 'asc',
	));
	return $terms;
}









// =====================================================
add_filter( 'script_loader_tag', 'copyspell_ai_script_module', 10, 3 );
function copyspell_ai_script_module( $tag, $handle, $src ) {

	if ( $handle == 'copyspell-ai-backend-js' ) {
		// phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedScript -- Modifying enqueued script tag to add type="module" attribute.
		return '<script src="' . $src . '" type="module"></script>' . "\n";
	}

	return $tag;

}

