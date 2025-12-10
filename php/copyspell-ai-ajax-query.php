<?php


if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

include_once __DIR__ . '/log.php';






// MARK: Query
// -----------------------------------------------------


add_action( 'wp_ajax_csai_query', 'csai_ajax_query' );


/**
 * AJAX handler for counting products matching query
 */
function csai_ajax_query() {
    // Security check
    check_ajax_referer('copyspell_ai_admin_nonce', 'nonce');
    
    if (!current_user_can('edit_products')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'copyspell-ai')));
        return;
    }
    
    // Get query from POST
    $query = isset($_POST['query']) ? wp_unslash($_POST['query']) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Sanitized via csai_sanitize_options() after JSON decode
    $mode = isset($_POST['mode']) ? sanitize_text_field(wp_unslash($_POST['mode'])) : '';
    $images = isset($_POST['images']) ? boolval($_POST['images']) : false;
	$page = isset($_POST['page']) ? max(1, intval($_POST['page'])) : 1;
	$limit = isset($_POST['limit']) ? max(1, intval($_POST['limit'])) : -1;
    
    //csai_log('mode', $mode);
    //csai_log('query', $query);
	
    // Try to decode if it's a JSON string
    if ( is_string($query) ) {
        $decoded = json_decode($query, true);
        if ( json_last_error() === JSON_ERROR_NONE && is_array($decoded) ) {
            $query = $decoded;
        }
    }
    
    // Sanitize the query recursively
    if (is_array($query)) {
        $query = csai_sanitize_options($query);
    } else {
        wp_send_json_error(array('message' => 'Query must be an array or valid JSON string.'));
        return;
    }

    $count_limit = $limit;
	if ( $mode != 'full' ) $count_limit = -1;

    // Call the main function
    $response = csai_query($query, $mode, $page, $count_limit, $images);

    if ( is_wp_error($response) ) {
        wp_send_json_error(array(
            'message' => $response->get_error_message(),
            'code' => $response->get_error_code(),
            'query' => $query,
        ));
    } elseif ( $mode == 'ids' ) {
    
        $response2 = csai_query($query, $mode, $page, $count_limit);
        if ( ! is_array($response2) ) {
            $response2 = array();
        }
        $result = $response2;
        //$result['query'] = $query;
        wp_send_json_success($result);

    } else {
       
		 if ( $mode == 'full' ) {
			$response2 = csai_get_multiple_products( $response['products'] );
			if ( ! is_array($response2) ) {
				$response2 = array();
			}
			$result = array_merge( $response, $response2 );
			$result['query'] = $query;
		 } else {
			$result = array(
				'query' => $query,
				'count' => $response,
			);
		 }
        wp_send_json_success($result);
    }
}




// MARK: Query Function
/**
 * Count products matching the given query
 * 
 * @param array $query Query parameters (categories, tags, attributes, etc.)
 * @return int|WP_Error Product count or WP_Error on failure
 * {
 *   "success": true,
 *   "data": {
 *     "count": 42,
 *     "query": { --original query-- }
 *   }
 * }
 */
function csai_query( $query = array(), $mode = 'full', $page = 1, $limit = 20, $images = false ) {
    if ( ! is_array($query) ) {
        return new WP_Error( 'invalid_query', 'Query must be an array' );
    }
	if ( $mode != 'full' ) $limit = -1; // No limit when counting


    // Build WP_Query arguments
    $args = csai_build_query( $query, $mode, $page, $limit, $images );
   //error_log('=============================== AAI QUERY ARGS');
   //error_log(print_r($args, true));

   //csai_log('WP_Query Args', $args);
   
    // Execute query
    $products_query = new WP_Query($args);
    
   //csai_log('WP_Query Result', $products_query);

    // Return count
	if ( $mode == 'count' ) {


		return $products_query->found_posts;
		
        
    // Return products
	} elseif ( $mode == 'ids' ) {

        return $products_query->posts;

	} elseif ( $mode == 'full' ) {

        $result = $products_query->posts;
        $ordered_ids = array();
        $image_urls = array();
        $product = null;
        $variations = 0;
        $product_types = array();
        
        // Loop through products and insert variations after variable products
        foreach ($result as $product_id) {
            $ordered_ids[] = $product_id;

            // Get image URLs
            /*
            if ( $images ) {
                $product = wc_get_product( $product_id );
                if ( $product ) {
                    $pid = $product->get_id();
                    $image_urls[ $pid ] = array();

                    // Main image
                    $image_id = $product->get_image_id();
                    if ( $image_id ) {
                        $image_urls[ $pid ][ $image_id ] = wp_get_attachment_url( $image_id );
                    } else {
                        $image_urls[ $pid ][] = wc_placeholder_img_src();
                    }

                    // Gallery images
                    $gallery_ids = $product->get_gallery_image_ids();
                    if ( ! empty( $gallery_ids ) ) {
                        foreach ( $gallery_ids as $gallery_id ) {
                            $image_urls[ $pid ][ $gallery_id ] = wp_get_attachment_url( $gallery_id );
                        }
                    }
                }
            }
            */
            
             
            
            if ( ! $product ) $product = wc_get_product( $product_id );
            $product_type = $product->get_type();
            if ( ! isset( $product_types[ $product_type ] ) ) {
                $product_types[ $product_type ] = 0;
            }
            $product_types[ $product_type ]++;
      
            if ( $product && $product->is_type( 'variable' ) ) {
                // Get all variation IDs for this variable product
                $variation_ids = $product->get_children();
                if ( ! empty( $variation_ids ) ) {
                    // Add variations right after the parent
                    $ordered_ids = array_merge( $ordered_ids, $variation_ids );
                    $variations += count( $variation_ids );
                }
            }
            

            $product = null;
        }

        
		return array(
			'products' => $ordered_ids,
			'variations' => $variations,
			//'product_types' => $product_types,
			//'image_urls' => $image_urls,
			'total' => $products_query->found_posts,
			'pages' => $products_query->max_num_pages,
			'page' => $page,
			'query_args' => $args,
		);
	}

}






// MARK: Build Query
/**
 * Build WP_Query arguments from the given query parameters
 * 
 * @param array $query Query parameters
 * @param string $mode full | count | ids
 * @param int $page Current page number
 * @param int $limit Number of products per page
 * @return array WP_Query arguments
 */
function csai_build_query( $query = array(), $mode = 'full', $page = 1, $limit = 20, $images = false ) {
    global $csai_query_templates;


    // Build WP_Query arguments
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => $limit,
        'paged' => $page,
        'fields' => 'ids', // Only get IDs for performance
        'no_found_rows' => false,
    );
    
    // Tax query array
    $tax_query = array();



    // Handle status
    if ( ! empty($query['status']) ) {
        $status = $query['status'];
        if ( is_array($status) ) {
            $args['post_status'] = array_map('sanitize_text_field', $status);
        } else {
            $args['post_status'] = sanitize_text_field($status);
        }
    }

    $taxonomies = csai_get_taxonomies();

    // Handle taxonomies
    foreach ( $taxonomies as $key => $taxonomy ) {
        if ( ! empty($query[$key]) && is_array($query[$key]) ) {
            $term_slugs = array_map(function($slug) {
                return sanitize_text_field(urldecode($slug));
            }, $query[$key]);
            if ( ! empty($term_slugs) ) {
                $tax_query[] = array(
                    'taxonomy' => $taxonomy->query_var,
                    'field' => 'slug',
                    'terms' => $term_slugs,
                    'operator' => 'IN',
                );
            }
        }
    }



    // Handle product attributes (e.g., pa_color, pa_size)
    if ( ! empty($query['attributes']) && is_array($query['attributes']) ) {
        foreach ( $query['attributes'] as $taxonomy => $term_ids ) {
            if ( is_array($term_ids) && ! empty($term_ids) ) {
                $term_ids = array_map('absint', $term_ids);
                $tax_query[] = array(
                    'taxonomy' => sanitize_text_field($taxonomy),
                    'field' => 'term_id',
                    'terms' => $term_ids,
                    'operator' => 'IN',
                );
            }
        }
    }
    
    // Set tax query relation if multiple taxonomies
    if ( count($tax_query) > 1 ) {
        $tax_query['relation'] = isset($query['tax_relation']) ? strtoupper($query['tax_relation']) : 'AND';
    }
    
    if ( ! empty($tax_query) ) {
        $args['tax_query'] = $tax_query;
    }
    
    // Meta query array
    $meta_query = array();
    
    

    // Handle stock quantity
    if ( isset($query['min_stock']) || isset($query['max_stock']) ) {
        if ( isset($query['min_stock']) && isset($query['max_stock']) ) {
            $meta_query[] = array(
                'key' => '_stock',
                'value' => array(intval($query['min_stock']), intval($query['max_stock'])),
                'type' => 'NUMERIC',
                'compare' => 'BETWEEN',
            );
        } elseif ( isset($query['min_stock']) ) {
            $meta_query[] = array(
                'key' => '_stock',
                'value' => intval($query['min_stock']),
                'type' => 'NUMERIC',
                'compare' => '>=',
            );
        } elseif ( isset($query['max_stock']) ) {
            $meta_query[] = array(
                'key' => '_stock',
                'value' => intval($query['max_stock']),
                'type' => 'NUMERIC',
                'compare' => '<=',
            );
        }
    }


    // Handle price range
    if ( isset($query['min_price']) || isset($query['max_price']) ) {
        if ( isset($query['min_price']) && isset($query['max_price']) ) {
            $meta_query[] = array(
                'key' => '_price',
                'value' => array(floatval($query['min_price']), floatval($query['max_price'])),
                'type' => 'NUMERIC',
                'compare' => 'BETWEEN',
            );
        } elseif ( isset($query['min_price']) ) {
            $meta_query[] = array(
                'key' => '_price',
                'value' => floatval($query['min_price']),
                'type' => 'NUMERIC',
                'compare' => '>=',
            );
        } elseif ( isset($query['max_price']) ) {
            $meta_query[] = array(
                'key' => '_price',
                'value' => floatval($query['max_price']),
                'type' => 'NUMERIC',
                'compare' => '<=',
            );
        }
    }


    // Handle sale price range
    if ( isset($query['min_sale_price']) || isset($query['max_sale_price']) ) {
        if ( isset($query['min_sale_price']) && isset($query['max_sale_price']) ) {
            $meta_query[] = array(
                'key' => '_sale_price',
                'value' => array(floatval($query['min_sale_price']), floatval($query['max_sale_price'])),
                'type' => 'NUMERIC',
                'compare' => 'BETWEEN',
            );
        } elseif ( isset($query['min_sale_price']) ) {
            $meta_query[] = array(
                'key' => '_sale_price',
                'value' => floatval($query['min_sale_price']),
                'type' => 'NUMERIC',
                'compare' => '>=',
            );
        } elseif ( isset($query['max_sale_price']) ) {
            $meta_query[] = array(
                'key' => '_sale_price',
                'value' => floatval($query['max_sale_price']),
                'type' => 'NUMERIC',
                'compare' => '<=',
            );
        }
    }


    
    // Handle date on sale range
    if ( ! empty($query['date_on_sale_from']) || ! empty($query['date_on_sale_to']) ) {
        $date_query = array();
        
        if ( ! empty($query['date_on_sale_from']) ) {
            $date_query['after'] = sanitize_text_field($query['date_on_sale_from']);
        }
        
        if ( ! empty($query['date_on_sale_to']) ) {
            $date_query['before'] = sanitize_text_field($query['date_on_sale_to']);
        }
        
        $date_query['inclusive'] = true;
        $meta_query[] = array(
            'key' => '_sale_price_dates_from',
            'value' => isset($date_query['after']) ? strtotime($date_query['after']) : '',
            'type' => 'NUMERIC',
            'compare' => '>=',
        );
        $meta_query[] = array(
            'key' => '_sale_price_dates_to',
            'value' => isset($date_query['before']) ? strtotime($date_query['before']) : '',
            'type' => 'NUMERIC',
            'compare' => '<=',
        );
    }




    
    // Handle SKU
    if ( ! empty($query['sku']) ) {
        $meta_query[] = array(
            'key' => '_sku',
            'value' => sanitize_text_field($query['sku']),
            'compare' => 'LIKE',
        );
    }
    
    // Handle featured products
    if ( isset($query['featured']) ) {
        $meta_query[] = array(
            'key' => '_featured',
            'value' => $query['featured'] ? 'yes' : 'no',
            'compare' => '=',
        );
    }
    
    // Handle on sale
    if ( isset($query['on_sale']) && $query['on_sale'] ) {
        $meta_query[] = array(
            'key' => '_sale_price',
            'value' => '',
            'compare' => '!=',
        );
    }
    
    // Handle custom meta queries
    if ( ! empty($query['meta']) && is_array($query['meta']) ) {
        foreach ( $query['meta'] as $meta ) {
            if ( isset($meta['key']) ) {
                $meta_item = array(
                    'key' => sanitize_text_field($meta['key']),
                );
                
                if ( isset($meta['value']) ) {
                    $meta_item['value'] = $meta['value'];
                }
                
                if ( isset($meta['compare']) ) {
                    $meta_item['compare'] = strtoupper(sanitize_text_field($meta['compare']));
                }
                
                if ( isset($meta['type']) ) {
                    $meta_item['type'] = strtoupper(sanitize_text_field($meta['type']));
                }
                
                $meta_query[] = $meta_item;
            }
        }
    }
    
    // Set meta query relation if multiple meta queries
    if ( count($meta_query) > 1 ) {
        $meta_query['relation'] = isset($query['meta_relation']) ? strtoupper($query['meta_relation']) : 'AND';
    }
    
    if ( ! empty($meta_query) ) {
        $args['meta_query'] = $meta_query;
    }
    
    // Handle product type
    if ( ! empty($query['product_type']) ) {
        $product_types = is_array($query['product_type']) ? $query['product_type'] : array($query['product_type']);
        $type_terms = array();
        
        foreach ( $product_types as $type ) {
            $type = sanitize_text_field($type);
            if ( in_array($type, array('simple', 'grouped', 'external', 'variable')) ) {
                $type_terms[] = $type;
            }
        }
        
        if ( ! empty($type_terms) ) {
            if ( ! isset($args['tax_query']) ) {
                $args['tax_query'] = array();
            }
            $args['tax_query'][] = array(
                'taxonomy' => 'product_type',
                'field' => 'slug',
                'terms' => $type_terms,
                'operator' => 'IN',
            );
        }
    }
    
    // Handle search term
    if ( ! empty($query['search']) ) {
        $args['s'] = sanitize_text_field($query['search']);
    }
    
    // Handle date range
    if ( ! empty($query['date_from']) || ! empty($query['date_to']) ) {
        $date_query = array();
        
        if ( ! empty($query['date_from']) ) {
            $date_query['after'] = sanitize_text_field($query['date_from']);
        }
        
        if ( ! empty($query['date_to']) ) {
            $date_query['before'] = sanitize_text_field($query['date_to']);
        }
        
        $date_query['inclusive'] = true;
        $args['date_query'] = array($date_query);
    }

    
    // Handle modified date range
    if ( ! empty($query['modified_from']) || ! empty($query['modified_to']) ) {
        $date_query = array();
        
        if ( ! empty($query['modified_from']) ) {
            $date_query['after'] = sanitize_text_field($query['modified_from']);
        }
        
        if ( ! empty($query['modified_to']) ) {
            $date_query['before'] = sanitize_text_field($query['modified_to']);
        }
        
        $date_query['inclusive'] = true;
        $args['date_query'][] = array_merge($date_query, array('column' => 'post_modified'));
    }


    //if ( $args['raw_query'] ) $args = $args['raw_query'];
    if ( ! empty( $query['template'] ) ) {
        // Deep merge template args into $args
        if ( isset( $csai_query_templates[ $query['template'] ] ) && is_array( $csai_query_templates[ $query['template'] ] ) ) {
            $args = array_replace_recursive( $csai_query_templates[ $query['template'] ], $args );
        }
    }


    // Handle author IDs
    if ( ! empty($query['author_ids']) ) {
        // Accept comma-separated string or array
        if ( is_string($query['author_ids']) ) {
            $author_ids = array_filter(array_map('absint', explode(',', $query['author_ids'])));
        } elseif ( is_array($query['author_ids']) ) {
            $author_ids = array_map('absint', $query['author_ids']);
        } else {
            $author_ids = array();
        }
        if ( ! empty($author_ids) ) {
            $args['author__in'] = $author_ids;
        }
    }

    
    
    
    // Handle specific IDs
    if ( ! empty($query['ids']) ) {
        // Accept comma-separated string or array
        if ( is_string($query['ids']) ) {
            $ids = array_filter(array_map('absint', explode(',', $query['ids'])));
        } elseif ( is_array($query['ids']) ) {
            $ids = array_map('absint', $query['ids']);
        } else {
            $ids = array();
        }
        if ( ! empty($ids) ) {
            $args = array(
                'post__in' => $ids,
                'post_type' => 'product',
                'posts_per_page' => $limit,
                'paged' => $page,
                'fields' => 'ids', // Only get IDs for performance
                'no_found_rows' => false,
            );
        }
    }



    return $args;

}






// MARK: Sanitize
// ----------------------------------------------------------
/**
 * Helper function to recursively sanitize options
 * 
 * @param mixed $options The data to sanitize
 * @return mixed Sanitized data
 */
function csai_sanitize_options($options, $context = '') {
    if (!is_array($options)) {
        // Sanitize non-array values
        if (is_string($options)) {
            return sanitize_text_field($options);
        }
        return $options;
    }

    $sanitized = array();
    
    // Fields that should preserve HTML content
    $html_fields = array(
        'description',
        'short_description', 
        'excerpt',
        'content',
        'post_content',
        'post_excerpt',
        'purchase_note',
    );
    
    /**
     * Filter the list of fields that should preserve HTML during import sanitization.
     * 
     * Use this filter to add custom fields or meta keys that contain HTML content.
     * 
     * @param array $html_fields Array of field names that should preserve HTML.
     * @param string $context The parent key context (useful for nested arrays).
     * 
     * @example
     * add_filter('csai_html_fields', function($fields) {
     *     $fields[] = 'custom_html_field';
     *     $fields[] = '_custom_meta_with_html';
     *     return $fields;
     * });
     */
    $html_fields = apply_filters('csai_html_fields', $html_fields, $context);
    
    foreach ($options as $key => $value) {
        // Sanitize the key
        $sanitized_key = sanitize_key($key);
        
        if (is_array($value)) {
            // Recursively sanitize nested arrays, pass the current key as context
            $sanitized[$sanitized_key] = csai_sanitize_options($value, $sanitized_key);
        } elseif (is_string($value)) {
            // Check if this field should preserve HTML
            //if (in_array($sanitized_key, $html_fields) || in_array($context, $html_fields)) {
                // Use wp_kses_post to allow safe HTML (same as WordPress post editor)
                $sanitized[$sanitized_key] = wp_kses_post($value);
            //} else {
                // For all other fields, strip HTML for security
                //$sanitized[$sanitized_key] = sanitize_text_field($value);
            //}
        } elseif (is_numeric($value)) {
            // Preserve numeric values
            $sanitized[$sanitized_key] = is_float($value) ? floatval($value) : intval($value);
        } elseif (is_bool($value)) {
            // Preserve boolean values
            $sanitized[$sanitized_key] = (bool) $value;
        } else {
            // For other types (null, objects, etc), pass through
            $sanitized[$sanitized_key] = $value;
        }
    }
    
    return $sanitized;
}

















// MARK: Get Multiple Products
/** 
 * Get multiple products by IDs with options for chunking and error handling
 * 
 * @param array $product_ids Array of product IDs to fetch
 * @param array $options Options array:
 *   - chunk_size: Number of products to process per chunk (default 50)
 *   - skip_errors: Whether to skip products that cause errors (default true)
 * @return array Array of product data arrays or WP_Error objects
 */
function csai_get_multiple_products( $product_ids, $options = array(), $mode = '' ) {
    $get_meta = false;
    $get_variations = false;
	if ( is_string( $product_ids ) ) {
		// If it's a comma-separated string, convert to array
		if ( strpos( $product_ids, ',' ) !== false ) {
			$product_ids = array_map( 'trim', explode( ',', $product_ids ) );
		}
	}
    if ( ! is_array( $product_ids ) || empty( $product_ids ) ) {
        return new WP_Error( 'invalid_ids', 'Product IDs must be a non-empty array' );
    }


    // Default options
    $defaults = array(
        'chunk_size' => 50,
        'skip_errors' => true,
    );
    $options = wp_parse_args( $options, $defaults );


    // Sanitize product IDs
    $product_ids = array_map( 'absint', $product_ids );
    $product_ids = array_filter( $product_ids ); // Remove zeros
    $product_ids = array_unique( $product_ids ); // Remove duplicates
    
    if ( empty( $product_ids ) ) {
        return new WP_Error( 'invalid_ids', 'No valid product IDs provided' );
    }
    
    $results = array();



   //error_log('=============================== AAI MULTIPLE IDS');
   //error_log(print_r(sizeof($product_ids), true));


    // Pre-load all products efficiently to reduce database queries
    $products_cache = array();
	$variation_ids = array();
	$variations = 0;
	$variable_products = 0;
	$simple_products = 0;
	$grouped_products = 0;
	$external_products = 0;
	$downloadable_products = 0;
    foreach ( $product_ids as $product_id ) {
		try {

            if ( $mode == 'AI' ) {
                $product = csai_get_productAI( $product_id );
            } else {
                $product = csai_get_product( $product_id, false, false );
            }
            
			if ( $product ) {
				$products_cache[ $product_id ] = $product;

				// Count product types
				if ( isset( $product['type'] ) ) {
					switch ( $product['type'] ) {
						case 'variable':
							$variable_products++;
							break;
						case 'simple':
							$simple_products++;
							break;
						case 'grouped':
							$grouped_products++;
							break;
						case 'external':
							$external_products++;
							break;
					}
				}
                if ( isset( $product['downloadable'] ) && $product['downloadable'] ) {
                    $downloadable_products++;
                }
			
			}

		} catch ( Exception $e ) {
			if ( $options['skip_errors'] ) {
				$results[] = array(
					'product_id' => $product_id,
					'error' => new WP_Error( 'product_error', $e->getMessage() ),
				);
			} else {
				return new WP_Error( 'product_error', "Error processing product {$product_id}: " . $e->getMessage() );
			}
		}
    }

    if ( $get_variations ) $product_ids = array_merge( $product_ids, $variation_ids );
     

	if ( $get_meta ) $meta_cache = csai_get_multi_meta( $product_ids );

    $taxonomies = csai_get_taxonomies();
	$tax_cache = csai_get_multi_taxonomies( $product_ids, $taxonomies );


    
    // Process products in chunks to manage memory
    $chunks = array_chunk( $product_ids, $options['chunk_size'], true );
    

    foreach ( $chunks as $chunk ) {
        foreach ( $chunk as $product_id ) {
            if ( ! isset( $products_cache[ $product_id ] ) ) {
                if ( $options['skip_errors'] ) {
                    $results[ $product_id ] = new WP_Error( 'product_not_found', "Product {$product_id} not found" );
                    continue;
                } else {
                    return new WP_Error( 'product_not_found', "Product {$product_id} not found" );
                }
            }

			$product = $products_cache[ $product_id ];
	
			// Use cached meta and taxonomy terms
			if ( $get_meta ) $product['meta_data'] = $meta_cache[ $product_id ] ?? array();
            
            foreach ( $taxonomies as $tax_key => $tax ) {
                if ( isset( $tax_cache[ $tax_key ][ $product_id ] ) ) {
                    //$product[ $tax_key ] = $tax_cache[ $tax_key ][ $product_id ];
                    $product[ $tax_key ] = array_values( wp_list_pluck( $tax_cache[ $tax_key ][ $product_id ], 'name' ) );
                }
            }

			$results[] = $product;
     
        }
        
        // Optional: Clear some caches between chunks to manage memory
        // wp_cache_flush();

	}

	$results = array(
		'products' => $results,
	);

	if ( $simple_products > 0 ) $results['simple_products'] = $simple_products;
	if ( $variable_products > 0 ) $results['variable_products'] = $variable_products;
	if ( $variations > 0 ) $results['variations'] = $variations;
	if ( $grouped_products > 0 ) $results['grouped_products'] = $grouped_products;
	if ( $external_products > 0 ) $results['external_products'] = $external_products;
	if ( $downloadable_products > 0 ) $results['downloadable_products'] = $downloadable_products;
	if ( ! empty( $variation_ids ) ) $results['variation_ids'] = $variation_ids;

    return $results;


}










// MARK: Get Product
/** 
 * Get product data including all standard properties, taxonomies, attributes, and meta
 * 
 * @param int $product_id The product ID to fetch
 * @param bool $with_tax Whether to include taxonomies (categories, tags)
 * @param bool $with_meta Whether to include all post meta
 * @return array Full product data array
 */
function csai_get_productAI( $product_id ) {

	$product = wc_get_product( $product_id );

    if ( ! $product ) {
        return [
            'error' => 'Product not found',
            'product_id' => $product_id,
        ];
        //return new WP_Error( 'product_not_found', 'Product not found' );
    }


    // Basic product data
    $product_data = array(

        // Core post fields
        'id' 				=> $product->get_id(),
        'title'				=> $product->is_type('variation') ? wp_strip_all_tags($product->get_name()) : $product->get_name(), // Strip HTML from variations
        'excerpt'	        => $product->get_short_description(),
        'content' 		    => $product->get_description(),
        'url'               => urldecode( get_permalink( $product->get_id() ) ),
        
        'data'              => array(
            'regular_price' 	=> $product->get_regular_price(),
            'sale_price' 		=> $product->get_sale_price(),
            'date_on_sale_from' => $product->get_date_on_sale_from() ? $product->get_date_on_sale_from()->date('Y-m-d H:i:s') : null,
            'date_on_sale_to' 	=> $product->get_date_on_sale_to() ? $product->get_date_on_sale_to()->date('Y-m-d H:i:s') : null,
            'type' 				=> $product->get_type(),
            'date_modified' 	=> $product->get_date_modified() ? $product->get_date_modified()->date('Y-m-d H:i:s') : null,

            'weight' 			=> $product->get_weight(),
            'length' 			=> $product->get_length(),
            'width' 			=> $product->get_width(),
            'height' 			=> $product->get_height(),
            
            'virtual' 			=> $product->get_virtual(),
            'downloadable' 		=> $product->get_downloadable(),
            'featured' 			=> $product->get_featured(),

        ),

        
        'attributes' 		=> array(),
        'categories' 		=> array(),
        'tags' 				=> array(),
        // All meta data
		//'meta_data_raw' 	=> $product->get_meta_data(),

    );

    // Get copyspell_ai meta and merge into data
    $copyspell_meta = get_post_meta($product->get_id(), 'copyspell_ai', true);
    if (!empty($copyspell_meta) && is_array($copyspell_meta)) {
        $product_data['data'] = array_merge($product_data['data'], $copyspell_meta);
    }

    if ( !  $product_data['data']['weight'] ) unset( $product_data['data']['weight'] );
    if ( !  $product_data['data']['length'] ) unset( $product_data['data']['length'] );
    if ( !  $product_data['data']['width'] ) unset( $product_data['data']['width'] );
    if ( !  $product_data['data']['height'] ) unset( $product_data['data']['height'] );
    if ( !  $product_data['data']['virtual'] ) unset( $product_data['data']['virtual'] );
    if ( !  $product_data['data']['downloadable'] ) unset( $product_data['data']['downloadable'] );
    if ( !  $product_data['data']['featured'] ) unset( $product_data['data']['featured'] );
    if ( !  $product_data['data']['regular_price'] ) unset( $product_data['data']['regular_price'] );
    if ( !  $product_data['data']['sale_price'] ) unset( $product_data['data']['sale_price'] );
    if ( !  $product_data['data']['date_on_sale_from'] ) unset( $product_data['data']['date_on_sale_from'] );
    if ( !  $product_data['data']['date_on_sale_to'] ) unset( $product_data['data']['date_on_sale_to'] );


    $product_data['slug'] = $product->get_slug() ? urldecode($product->get_slug()) : urldecode(sanitize_title( $product->get_name() ));


    // Get attributes
	$product_data['attributes'] = csai_get_attributes( $product );
    if ( ! empty( $product_data['attributes'] ) && is_array( $product_data['attributes'] ) ) {
        $formatted_attrs = array();
        foreach ( $product_data['attributes'] as $attr ) {
            $label = isset( $attr['label'] ) ? $attr['label'] : ( isset( $attr['name'] ) ? $attr['name'] : '' );
            $options = isset( $attr['options'] ) && is_array( $attr['options'] )
                ? array_map( 'urldecode', $attr['options'] )
                : array();
            
            if ( $label ) {
                $formatted_attrs[ $label ] = $options;
            }
        }
        $product_data['attributes'] = $formatted_attrs;
    } else {
        $product_data['attributes'] = array();
    }





    /*
    $tax_data = csai_get_product_taxonomies( $product->get_id() );
    foreach ( $tax_data as $tax_key => $tax_terms ) {
        // Transform to array of names only
        if ( is_array( $tax_terms ) && ! empty( $tax_terms ) ) {
            $product_data[ $tax_key ] = array_values( wp_list_pluck( $tax_terms, 'name' ) );
        } else {
            $product_data[ $tax_key ] = array();
        }
        csai_log('Taxonomy', $tax_key );
        csai_log('Taxonomy', $product_data[ $tax_key ] );
    }
	*/






	// Get all meta data
	//if ( $with_meta ) {

		//csai_get_product_meta( $product->get_id() );

	//}






    return $product_data;


}
function csai_get_productFull( $product_id, $with_tax = true, $with_meta = true ) {

	$product = wc_get_product( $product_id );

    if ( ! $product ) {
        return [
            'error' => 'Product not found',
            'product_id' => $product_id,
        ];
        //return new WP_Error( 'product_not_found', 'Product not found' );
    }


    // Basic product data
    $product_data = array(

        // Core post fields
        'id' 				=> $product->get_id(),
        'name' 				=> $product->is_type('variation') ? wp_strip_all_tags($product->get_name()) : $product->get_name(), // Strip HTML from variations
        //'slug' 				=> $product->get_slug(),
        'status' 			=> $product->get_status(),
        'type' 				=> $product->get_type(),
        'description' 		=> $product->get_description(),
        'short_description'	=> $product->get_short_description(),
        'date_created' 		=> $product->get_date_created() ? $product->get_date_created()->date('Y-m-d H:i:s') : null,
        'date_modified' 	=> $product->get_date_modified() ? $product->get_date_modified()->date('Y-m-d H:i:s') : null,
		'author_id'			=> get_post_field( 'post_author', $product->get_id() ),

        // Pricing
        'price' 			=> $product->get_price(),
        'regular_price' 	=> $product->get_regular_price(),
        'sale_price' 		=> $product->get_sale_price(),
        'date_on_sale_from' => $product->get_date_on_sale_from() ? $product->get_date_on_sale_from()->date('Y-m-d H:i:s') : null,
        'date_on_sale_to' 	=> $product->get_date_on_sale_to() ? $product->get_date_on_sale_to()->date('Y-m-d H:i:s') : null,
		'total_sales'		=> $product->get_total_sales(),
		'tax_status'		=> $product->get_tax_status(),
		'tax_class'			=> $product->get_tax_class(),


        // Stock
        'sku' 				=> $product->get_sku(),
        'manage_stock' 		=> $product->get_manage_stock(),
        'stock_quantity' 	=> $product->get_stock_quantity(),
        'stock_status' 		=> $product->get_stock_status(),
        'backorders' 		=> $product->get_backorders(),
        'sold_individually' => $product->get_sold_individually(),
        'low_stock_amount' 	=> $product->get_low_stock_amount(),
        
        // Shipping
        'weight' 			=> $product->get_weight(),
        'length' 			=> $product->get_length(),
        'width' 			=> $product->get_width(),
        'height' 			=> $product->get_height(),
        'shipping_class' 	=> $product->get_shipping_class(),
        
        // Virtual/Downloadable
        'virtual' 			=> $product->get_virtual(),
        'downloadable' 		=> $product->get_downloadable(),
        'downloads' 		=> $product->get_downloads(),
        'download_limit' 	=> $product->get_download_limit(),
        'download_expiry' 	=> $product->get_download_expiry(),

        // Linked products
        'cross_sell_ids' 	=> $product->get_cross_sell_ids(),
        'upsell_ids' 		=> $product->get_upsell_ids(),
		'grouped_products' 	=> $product->is_type('grouped') ? $product->get_children() : array(),

		// External
		'product_url' 		=> $product->is_type('external') ? $product->get_product_url() : '',
		'button_text' 		=> $product->is_type('external') ? $product->get_button_text() : '',
        
        // Reviews
        'reviews_allowed' 	=> $product->get_reviews_allowed(),
        'average_rating' 	=> $product->get_average_rating(),
        'review_count' 		=> $product->get_review_count(),
        'rating_counts' 	=> $product->get_rating_counts(),

        // Images
        'image_id' 			=> $product->get_image_id(),
        'gallery_image_ids' => $product->get_gallery_image_ids(),

        // Misc
        'menu_order' 		=> $product->get_menu_order(),
        'catalog_visibility'=> $product->get_catalog_visibility(),
        'featured' 			=> $product->get_featured(),
        'purchase_note' 	=> $product->get_purchase_note(),

        // Attributes / Variations
        'attributes' 		=> array(),
		'default_attributes'=> $product->get_default_attributes(),
        'attribute_values'	=> $product->is_type( 'variation' ) ? $product->get_attributes() : array(),
        'parent_id' 		=> $product->get_parent_id(),
        
        // Taxonomies
        'categories' 		=> array(),
        'tags' 				=> array(),

        
        // All meta data
		//'meta_data_raw' 	=> $product->get_meta_data(),

    );


    $product_data['slug'] = $product->get_slug() ? urldecode($product->get_slug()) : urldecode(sanitize_title( $product->get_name() ));





    // Get attributes
	$product_data['attributes'] = csai_get_attributes( $product );




	
    // For grouped products, get children
    if ( $product->is_type( 'grouped' ) ) {
        $product_data['grouped_products'] = $product->get_children();
    }





	if ( $with_tax )  {

		$tax_data = csai_get_product_taxonomies( $product->get_id() );
        foreach ( $tax_data as $tax_key => $tax ) {
            $product_data[ $tax_key ] = $tax_data[ $tax_key ];
        }

	}



    if ( $product && $product->is_type( 'variable' ) ) {
        // Get all variation IDs for this variable product
        $variation_ids = $product->get_children();
        if ( ! empty( $variation_ids ) ) {
            // Add variations right after the parent
            $product_data['variation_ids'] = $variation_ids;
        }
    }


	// Get all meta data
	if ( $with_meta ) {
		
		csai_get_product_meta( $product->get_id() );

	}






    return $product_data;


}
function csai_get_product( $product_id, $with_tax = true, $with_meta = true ) {

	$product = wc_get_product( $product_id );

    if ( ! $product ) {
        return [
            'error' => 'Product not found',
            'product_id' => $product_id,
        ];
        //return new WP_Error( 'product_not_found', 'Product not found' );
    }


    // Basic product data
    $product_data = array(

        // Core post fields
        'id' 				=> $product->get_id(),
        'title' 			=> $product->is_type('variation') ? wp_strip_all_tags($product->get_name()) : $product->get_name(), // Strip HTML from variations
        'excerpt'			=> $product->get_short_description(),
        'content' 			=> $product->get_description() ?? '',
        'categories' 		=> $product->get_category_ids(),
		'tags' 				=> $product->get_tag_ids(),
		'brands' 			=> $product->get_attribute('brand'),
		'meta_data' 		=> $with_meta ? csai_get_product_meta( $product->get_id() ) : array(),
        'regular_price' 	=> $product->get_regular_price(),
        'sale_price' 		=> $product->get_sale_price(),
        'image_id' 			=> $product->get_image_id(),
        'gallery_image_ids' => $product->get_gallery_image_ids(),
		'url' 				=> $product->is_type('external') ? $product->get_product_url() : '',
        'featured' 			=> $product->get_featured(),

        //'slug' 				=> $product->get_slug(),
        'status' 			=> $product->get_status(),
        'type' 				=> $product->get_type(),
        'date_modified' 	=> $product->get_date_modified() ? $product->get_date_modified()->date('Y-m-d H:i:s') : null,

        'date_on_sale_from' => $product->get_date_on_sale_from() ? $product->get_date_on_sale_from()->date('Y-m-d H:i:s') : null,
        'date_on_sale_to' 	=> $product->get_date_on_sale_to() ? $product->get_date_on_sale_to()->date('Y-m-d H:i:s') : null,
		'total_sales'		=> $product->get_total_sales(),


        // Stock
        'sku' 				=> $product->get_sku(),
        'stock_quantity' 	=> $product->get_stock_quantity(),
        'stock_status' 		=> $product->get_stock_status(),
        'backorders' 		=> $product->get_backorders(),
        'sold_individually' => $product->get_sold_individually(),
        'low_stock_amount' 	=> $product->get_low_stock_amount(),
        
        // Shipping
        'weight' 			=> $product->get_weight(),
        'length' 			=> $product->get_length(),
        'width' 			=> $product->get_width(),
        'height' 			=> $product->get_height(),
        'shipping_class' 	=> $product->get_shipping_class(),
        
        // Virtual/Downloadable
        'virtual' 			=> $product->get_virtual(),
        'downloadable' 		=> $product->get_downloadable(),
        'downloads' 		=> $product->get_downloads(),

        // Linked products
        //'cross_sell_ids' 	=> $product->get_cross_sell_ids(),
        //'upsell_ids' 		=> $product->get_upsell_ids(),

		// External

        // Attributes / Variations
        'attributes' 		=> array(),
		'default_attributes'=> $product->get_default_attributes(),
        'attribute_values'	=> $product->is_type( 'variation' ) ? $product->get_attributes() : array(),
        
        // Taxonomies

        
        // All meta data
		//'meta_data_raw' 	=> $product->get_meta_data(),

    );


    $product_data['slug'] = $product->get_slug() ? urldecode($product->get_slug()) : urldecode(sanitize_title( $product->get_name() ));
    
	$product_data['image_url'] = wp_get_attachment_url( $product->get_image_id() );





    // Get attributes
	$product_data['attributes'] = csai_get_attributes( $product );




	
    // For grouped products, get children
    if ( $product->is_type( 'grouped' ) ) {
        $product_data['grouped_products'] = $product->get_children();
    }





	if ( $with_tax )  {

		$tax_data = csai_get_product_taxonomies( $product->get_id() );
        foreach ( $tax_data as $tax_key => $tax ) {
            $product_data[ $tax_key ] = $tax_data[ $tax_key ];
        }

	}



    if ( $product && $product->is_type( 'variable' ) ) {
        // Get all variation IDs for this variable product
        $variation_ids = $product->get_children();
        if ( ! empty( $variation_ids ) ) {
            // Add variations right after the parent
            $product_data['variation_ids'] = $variation_ids;
        }
    }


	// Get all meta data
	if ( $with_meta ) {
		$product_data['meta_data_raw'] = csai_get_product_meta( $product->get_id() );
	}



	// Remove null, empty string, and empty array values
	$product_data = array_filter($product_data, function($value) {
		if (is_null($value)) return false;
		if ($value === '') return false;
		if (is_array($value) && empty($value)) return false;
		return true;
	});


    return $product_data;


}







// MARK: Multi Meta
// Pre-fetch all post meta in a single query for better performance
function csai_get_multi_meta( $product_ids ) {
    global $wpdb;
    $ids_placeholder = implode( ',', array_fill( 0, count( $product_ids ), '%d' ) );
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Bulk fetch all meta for multiple products in single query for performance, caching not suitable for bulk operations. Dynamic placeholders for IN clause.
    $all_meta = $wpdb->get_results( 
        $wpdb->prepare(
            "SELECT post_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id IN ({$ids_placeholder})", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from $wpdb property, placeholders are dynamically generated %d
            ...$product_ids
        )
    );
	foreach ( $all_meta as $key => $values ) {
		$processed_values = array();
		foreach ( $values as $value ) {
			$processed_values[] = is_serialized( $value ) ? unserialize( $value ) : $value;
		}
		$all_meta[ $key ] = count( $processed_values ) === 1 ? $processed_values[0] : $processed_values;
	}

    //error_log('================================= all_meta');
    //error_log( print_r($all_meta, true) );
    //error_log('=================================');

    // Organize meta by post ID
    $meta_cache = array();
    foreach ( $all_meta as $meta ) {
        if (!isset($meta) || !is_array($meta)) {
			continue;
		}
        if (isset($meta[0], $meta[1], $meta[2])) {
            $id = $meta[0];
            $key = $meta[1];
            $value = $meta[2];
        } else {
            if ( isset( $meta['post_id'] ) ) $id = $meta['post_id'];
            if ( isset( $meta['meta_key'] ) ) $key = $meta['meta_key'];
            if ( isset( $meta['meta_value'] ) ) $value = $meta['meta_value'];
        }

        if ( isset( $id ) && ! isset( $meta_cache[ $id ] ) ) {
            $meta_cache[ $id ] = array();
        }
        if ( isset( $id ) && ! isset( $meta_cache[ $id ][ $key ] ) ) {
            $meta_cache[ $id ][ $key ] = array();
        }
        if ( isset($id) && isset($key) )
            $meta_cache[ $id ][ $key ][] = $value;
    }


	return $meta_cache;

}






// MARK: Multi Taxonomies
// Pre-fetch all taxonomy terms for multiple products
function csai_get_multi_taxonomies( $product_ids, $taxonomies ) {

    $all = array();
    $cache = array();
    foreach ( $taxonomies as $tax_key => $tax ) {
        $query_var = $tax->query_var;

        $all[ $tax_key ] = wp_get_object_terms( $product_ids, $query_var, array( 'fields' => 'all_with_object_id' ) );


        // Organize terms by product ID
        $cache[ $tax_key ] = array();
        foreach ( $all[ $tax_key ] as $term ) {
            if ( ! isset( $cache[ $tax_key ][ $term->object_id ] ) ) {
                $cache[ $tax_key ][ $term->object_id ] = array();
            }
            $cache[ $tax_key ][ $term->object_id ][] = array(
                'id' => $term->term_id,
                'name' => $term->name,
                'slug' => $term->slug,
            );
        }

        //error_log( print_r( $cache[ $key ], true ) );
        
    }
    

	return $cache;
}











// MARK: Get Taxonomies
// ----------------------------------------------------------
function csai_get_taxonomies2() {
	$product_taxonomies = get_object_taxonomies('product', 'objects');
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











// MARK: Get Product Attributes
/** 
 * Get product attributes in a structured array
 * 
 * @param WC_Product $product The WooCommerce product object
 * @return array Array of attributes with details
 */
function csai_get_attributes( $product ) {
	$result = array();

    $attributes = $product->get_attributes();
	
    // For variations, attributes are just key-value pairs (strings)
    if ( $product->is_type( 'variation' ) ) {
        /*
        foreach ( $attributes as $key => $value ) {
            $result[] = array(
                'name' => $key,
                'value' => $value,
                'variation' => true,
            );
        }
        */
        return [];
        //return $result;
    }

	
    // For other product types, attributes are WC_Product_Attribute objects
    foreach ( $attributes as $attribute ) {
        // Skip if not a valid attribute object
        if ( ! is_object( $attribute ) || ! method_exists( $attribute, 'get_id' ) ) {
            continue;
        }
		
        $attribute_data = array(
            'name' => $attribute->get_name(),
            "label" => wc_attribute_label( $attribute->get_name() ),
            //'value' => '',
            'position' => $attribute->get_position(),
            'visible' => $attribute->get_visible(),
            'variation' => $attribute->get_variation(),
            //'is_taxonomy' => $attribute->is_taxonomy(),
            'options' => array(),
        );

        // If taxonomy attribute, get slugs
        if ( $attribute->is_taxonomy() ) {
            $terms = wc_get_product_terms( $product->get_id(), $attribute->get_taxonomy(), array( 'fields' => 'slugs' ) );
            $attribute_data['options'] = $terms;
        } else {
            // Custom attribute: use raw values, sanitize as slugs
            $options = $attribute->get_options();
            $attribute_data['options'] = array_map( 'sanitize_title', $options );
        }
        
        /*
        // If it's a taxonomy attribute, get the terms
        if ( $attribute->is_taxonomy() ) {
            $attribute_data['taxonomy'] = $attribute->get_taxonomy();
            $terms = wp_get_post_terms( $product->get_id(), $attribute->get_taxonomy() );
            if ( ! is_wp_error( $terms ) ) {
                $attribute_data['terms'] = array_map( function( $term ) {
                    return array(
                        'id' => $term->term_id,
                        'name' => $term->name,
                        'slug' => $term->slug,
                    );
                }, $terms );
            }
        }
        */
        
        $result[] = $attribute_data;
        //$result[] = $attribute;
    }

	return $result;
}






// MARK: Get Product Taxonomies
/** 
 * Get product taxonomies (categories, tags)
 * 
 * @param int $product_id The product ID
 * @return array Associative array with 'categories' and 'tags' keys
 */
function csai_get_product_taxonomies( $product_id ) {

    $taxonomies = csai_get_taxonomies();
	$result = array();

    foreach ( $taxonomies as $tax_key => $tax ) {
        $result[ $tax_key ] = array();
	    $terms = wp_get_post_terms( $product_id, $tax->query_var );
        if ( ! is_wp_error( $terms ) ) {
            foreach ( $terms as $term ) {
                $result[ $tax_key ][] = array(
                    'id' => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                );
            }
        }
    }

	return $result;

}










// MARK: Get Product Meta
/** 
 * Get all meta data for a product
 * 
 * @param int $product_id The product ID
 * @return array Associative array of all meta key-value pairs
 */
function csai_get_product_meta( $product_id ) {

	$result = array();

	// Get all meta data
	$meta_data = get_post_meta( $product_id );
	$new_product['meta_data'] = array();
	foreach ( $meta_data as $key => $values ) {
		// Skip internal WordPress and WooCommerce meta (starting with _)
		// but include them in a separate array for completeness


		$i = 0;
		foreach ( $values as $value ) {
			// Check if value is a serialized string
			if ( is_serialized( $values ) ) {
				$values[ $i ] = unserialize( $value );
			}
			$i++;
		}

/*		
		// If only one value, flatten array
		if ( isset( $product_data['meta_data'][ $key ] ) && count( $product_data['meta_data'][ $key ] ) === 1 ) {
			$product_data['meta_data'][ $key ] = $product_data['meta_data'][ $key ][0];
		}

*/
		$values = count( $values ) === 1 ? $values[0] : $values;

		// Check if value is a serialized string
		if ( is_serialized( $values ) ) {
			$values = unserialize( $values );
		}
		
		
		$result[ $key ] = $values;
	}

	return $result;

}




