<?php


if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly



include_once __DIR__ . '/log.php';
include_once __DIR__ . '/class-aai-bulk-records.php';





// MARK: AI CALL FOR BULK PRODUCTS
// ───────────────────────────────────────────────────
function copyspell_ai_call_bulk_products( $products, $meta, $batch_ids=[], $job = [] ) {
	$jobId = $job['id'];
	$bulk_id = $job['bulk_id'];

	$settings = $meta['ai_settings'] ?? [];


	//csai_log('AI CALL SETTINGS', $settings );
	//csai_log('AI CALL products', $products );
    $copyspell_options = get_option('copyspell_ai_options', array());
	$sequence = copyspell_ai_get_sequence( $copyspell_options );

	$keys = array();
	foreach ( $copyspell_options['api'] as $key => $data ) {
		if ( isset( $data['status'] ) && $data['status'] === 'valid' ) {
			$keys[$key] = $data['key'];
		}
	}
	

	$license = get_option('copyspell-ai-license', '');
	if ( $license && is_array($license) && isset($license['key']) ) {
		$license = copyspell_ai_decrypt_api_key( $license['key'] );
	} else {
		$license = '';
	}


	$request = array(
		'id' => 'REQ-' . time() . '-' . substr(str_shuffle('abcdefghijklmnopqrstuvwxyz0123456789'), 0, 7),
		'action' => 'bulk-content',
		'domain' => isset( $_SERVER['HTTP_HOST'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) ) : '',
		'service' => 'copyspell-ai',
		'version' => COPYSPELL_AI_VERSION,
		'signature' => get_option('copyspell_ai_signature', '' ),
		'bulk_id' => $bulk_id,
	);
	$user = array(
		'domain' => isset( $_SERVER['HTTP_HOST'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) ) : '',
		'wordpress' => get_bloginfo('version'),
		'woocommerce' => WC_VERSION,
		'license' => $license,
		'keys' => $keys,
		'userAgent' => isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '',
		'ip' => isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '',
	);
	$data = array(
		'products' => $products,
		'options' => array(
			'form' => $settings,
			'siteData' => array(
				'siteUrl' => get_site_url(),
				'siteName' => get_bloginfo('name'),
			),
			'sequence' => $sequence,
		)
	);
	$calldata = array(
		'request' => $request,
		'user' => $user,
		'data' => $data,
	);
	

	csai_log('======================= AI CALL');



	$result = copyspell_ai_bulk_call( $calldata, $meta, $batch_ids, $jobId );


	//csai_log('FINAL RESPONSE ===========', $result );

	return $result;

}



// MARK: AI CALL
// ───────────────────────────────────────────────────
function copyspell_ai_bulk_call( $calldata, $meta=array(), $batch_ids=[], $jobId ) {


	// TODO: checkLicenseKey

	$errors = array();

    $options = get_option('copyspell_ai_options', array());

	// Decrypt API keys
	if (is_array($options) && isset($options['api'])) {
        foreach ($calldata['user']['keys'] as $provider => &$key) {
            if (!empty($key)) {
                $key = copyspell_ai_decrypt_api_key($key);
            }
        }
    }


	// MAKE THE CALL
	$response = copyspell_ai_make_bulk_call( $calldata, $options = array() );

	// Handle error responses
	if (isset($response['error'])) {
		$error_msg = $response['error'];
		
		// Determine error type - some errors should not be retried
		$error_type = 'api_error'; // Default: retryable
		if (
			strpos($error_msg, 'Model not found') !== false ||
			strpos($error_msg, 'unexpected model') !== false ||
			strpos($error_msg, 'Invalid API key') !== false ||
			strpos($error_msg, 'API key') !== false ||
			strpos($error_msg, 'Access denied') !== false ||
			strpos($error_msg, 'permission') !== false
		) {
			$error_type = 'config_error'; // Non-retryable configuration error
		}
		
		return [
			'errors' => [
				['error' => $error_msg, 'type' => $error_type]
			],
			'json' => ['products' => []],
			'meta' => ['model' => 'unknown', 'api' => 'unknown']
		];
	}

	
	// ========================================= response
	$finalResponse = array( 
		'content' => $response['content'], 
		'json' => $response['json'], 
		'model' => $response['meta']['model'], 
		'api' => $response['meta']['api'], 
		'usage' => $response['meta']['usage'] ?? array() 
	);


	return $finalResponse;

}





// MARK: MAKE AI CALL
// ----------------------------------------------------------
function copyspell_ai_make_bulk_call( $calldata, $options = array() ) {

	
	$success = false;
	$contentLength = 0;
	
	// ───────────────────────────
	try {
		
		$url = "https://copyspell.actusanima.com/v1/bulk";
		
		$body = wp_json_encode( $calldata );

		$response = wp_remote_post($url, array(
			'headers' => array(
				'Content-Type' => 'application/json',
				'X-Forwarded-For' => isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '',
				'X-Real-IP' => isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '',
				'X-Forwarded-Host' => isset( $_SERVER['HTTP_HOST'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) ) : '',
			),
			'body' => $body,
			'timeout' => 120,
		));

		if (is_wp_error($response)) {
			throw new Exception($response->get_error_message());
		}

		$status_code = wp_remote_retrieve_response_code($response);
		$body = wp_remote_retrieve_body($response);
		$response = json_decode($body, true);


		// Handle error responses
		if ($status_code !== 200) {

			$error_message = $response['error']['message'] ?? $response['error'] ?? 'Unknown error';
			$error = $error_message;
			if ($status_code == 429) {
				$error = "$model: Rate limit exceeded. Please try again later.";
			} else if ($status_code == 403) {
				//$error = 'Access denied. Please check your API key and permissions.';
			} else if ($status_code == 404) {
				$error = "Model not found: $model";
			} else if ($status_code == 500) {
				$error = 'Internal server error. Please try again later.';
			}
			
			if (strpos($error, 'unexpected model') !== false) {
				$error = 'Model not found: ' . $model;
			}
			
			//csai_log('ai-google - error', $error);
			return array('error' => $error);
		}

	// ───────────────────────────
	} catch ( Exception $e ) {
        csai_log('ERROR ---', $model );
        csai_log( $e->getMessage );
        csai_log( basename($e->getFile()) . ':' . $e->getLine() );
		$response = array( 'error' => $e->getMessage() );
		return $response;
	}


	//csai_log('RAW RESPONSE ===========', $response );

	return $response;

}















// MARK: HELPERS


function copyspell_ai_get_sequence( $options, $model='' ) {
	$sequence = $options['sequences']['main'] ?? [];
	$provider = copyspell_ai_get_provider( $options );

	// Έχει δοθεί μοντέλο αλλά όχι sequence
	if ( $model && ( ! $sequence || ! count( $sequence ) ) ) {
		if ( is_array( $model ) && count( $model ) > 0 ) {
			$sequence = [ $model ];
		} else {
			$sequence = [ [ $model, $provider ] ];
		}
	}
	// Το sequence είναι string
	if ( is_string( $sequence ) ) {
		$sequence = $options['sequences'][$sequence] ?? $options['sequences']['main'] ?? [];
	}

	// Αν το sequence είναι array με strings, το μετατρέπουμε σε array με arrays
	// π.χ. ['gemini-2.0-pro', 'google']
	if ( is_array( $sequence ) && count( $sequence ) > 0 && is_string( $sequence[0] ) ) {
		$sequence = [ $sequence ];
	}

	// Αν το sequence είναι κενό, το αρχικοποιούμε με το μοντέλο και τον πάροχο
	if ( ! $sequence || ! count( $sequence ) ) {
		$sequence = [ [ $model, $provider ] ];
	}

	return $sequence;
}
function copyspell_ai_get_provider( $options  ) {

    $provider = '';
    if ( ! empty( $options['api'] ) && is_array( $options['api'] ) ) {
        foreach ( $options['api'] as $key => $data ) {
            if ( isset( $data['status'] ) && $data['status'] === 'valid' ) {
                $provider = $key;
                break;
            }
        }
    }
	
    return $provider;
}
function copyspell_ai_prepare_files( $meta ) {
	// ???
	$files = [];
	if ( isset( $meta['files'] ) && is_array( $meta['files'] ) ) {
		foreach ( $meta['files'] as $file_data ) {
			if ( isset( $file_data['path'] ) && file_exists( $file_data['path'] ) ) {
				$files[] = new CURLFile( $file_data['path'], mime_content_type( $file_data['path'] ), basename( $file_data['path'] ) );
			}
		}
	}
	return $files;
}


function copyspell_ai_get_response_meta( $response ) {

	
	$jsonString = $response['content'] ?? '';
	if ( ! $jsonString ) {
		return $response ?? [];
		//return array_merge( $response, array( 'meta' => array() ) );
	}

	// Remove array brackets if jsonString starts with [\n and ends with \n]
	if ( strpos( $jsonString, "[\n" ) === 0 && substr( $jsonString, -2 ) === "\n]" ) {
		$jsonString = trim( substr( $jsonString, 2, -2 ) );
	}

	$pattern = '/```(?:json)?\s*([\s\S]+?)\s*```/s';
	preg_match( $pattern, $jsonString, $match );

	if ( ! empty( $match[1] ) ) {
		$jsonString = trim( $match[1] );
	} else {
		$firstBrace = strpos( $response['content'], '{' );
		$lastBrace = strrpos( $response['content'], '}' );
		if ( $firstBrace !== false && $lastBrace !== false && $lastBrace > $firstBrace ) {
			$possibleJson = trim( substr( $response['content'], $firstBrace, $lastBrace - $firstBrace + 1 ) );
			json_decode( $possibleJson );
			if ( json_last_error() === JSON_ERROR_NONE ) {
				$jsonString = $possibleJson;
			} else {
				$jsonString = trim( $response['content'] );
			}
		} else {
			$jsonString = trim( $response['content'] );
		}
	}


	if ( strpos( $jsonString, '[' ) === 0 && substr( $jsonString, -1 ) === ']' ) {
		$jsonString = trim( substr( $jsonString, 1, -1 ) );
	}

	$responseJSON = array();
	if ( is_string( $jsonString ) && strpos( $jsonString, '{' ) === 0 ) {
		$responseJSON = json_decode( $jsonString, true );
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			csai_log( "Error parsing JSON", json_last_error_msg() );
			$response['meta'] = array( 'error' => "Invalid JSON format in response." );
			$response['error'] = "Invalid JSON format in response.";
		}
	}

	// If we parsed a valid JSON object, put it in meta and clear content
	if ( $responseJSON && is_array( $responseJSON ) && count( $responseJSON ) > 0 ) {
		$response['content'] = "-";
		$response['meta'] = $responseJSON;
	} elseif ( $responseJSON && ( isset( $responseJSON['content'] ) || isset( $responseJSON['meta'] ) ) ) {
		$response['content'] = $responseJSON['content'] ?? $response['content'] ?? '';
		$response['meta'] = $responseJSON['meta'] ?? array();
	}


	return $response;

}


