<?php


if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly



include_once __DIR__ . '/class-aai-bulk-records.php';
include_once __DIR__ . '/copyspell-ai-call.php';
include_once __DIR__ . '/log.php';



// COPYSPELL_AI_BATCH_PRODUCTS_PER_CALL || 3







// MARK: Start Bulk AI Generation
// ----------------------------------------------------------
add_action('wp_ajax_csai_bulk_start', 'csai_bulk_start');
// ----------------------------------------------------------
function csai_bulk_start() {
    check_ajax_referer('copyspell_ai_admin_nonce', 'nonce');



    //$items = isset($_POST['items']) ? $_POST['items'] : [];
    //$query = isset($_POST['query']) ? $_POST['query'] : [];
    $job_id = isset($_POST['job_id']) ? sanitize_text_field(wp_unslash($_POST['job_id'])) : '';

	$job = CSAI_Bulk_Records::get_job( $job_id );
    
    $meta = $job['meta'];
    $job['status'] = 'running';
    


    // Call the main function
    $product_ids = $meta['ids'];
    if ( $product_ids && ! is_array($product_ids) ) {
        $product_ids = explode( ',', $product_ids );
    }
    csai_log('■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■');
    csai_log('Products:', is_array($product_ids) ? count($product_ids) : 'not array');
    csai_log('-----------------------------------------------');

    // Initialize progress tracking
    $meta['processed'] = 0;
    $meta['total'] = count($product_ids);
    $started_at = current_time('mysql');

    

    //csai_log('job', $job);
    //csai_log('query', $query);
    //csai_log('product ids', sizeof($product_ids));


    $batch_size = COPYSPELL_AI_BATCH_PRODUCTS_PER_CALL ?? 3;
    $product_batches = array_chunk($product_ids, $batch_size);


    $job['bulk_id'] = 'BULK-' . time() . '-' . substr(str_shuffle('abcdefghijklmnopqrstuvwxyz0123456789'), 0, 7);

        
    // Process first batch immediately, queue the rest
    /*
    $first_batch = array_shift($product_batches);
    if ($first_batch) {
        csai_log('Processing first batch immediately', count($first_batch) . ' products');
        // Process immediately to give instant feedback
        csai_batch_worker_handler($job, $first_batch, $i);
    }
    */
    

    $i = 1;
    foreach ($product_batches as $batch) {
        // Store action ID in job meta so we can cancel later
        $action_id = as_enqueue_async_action('csai_batch_worker', [$job, $batch, $i], 'copyspell-bulk');
        $queued_actions[] = $action_id;
        $i++;
    }

    // Save action IDs to job meta for cancellation
    $meta['queued_action_ids'] = $queued_actions ?? [];
    $meta['batch_tracking'] = []; // Track each batch status
    $meta['total_batches'] = count($product_batches);
    CSAI_Bulk_Records::set_job_meta($job['id'], [
        'queued_action_ids' => $meta['queued_action_ids'],
        'started_at' => $started_at,
        'batch_tracking' => $meta['batch_tracking'],
        'total_batches' => $meta['total_batches']
    ]);



    wp_send_json_success([
        'job_id' => $job['id']
    ]);
}




// MARK: AI Batch Worker
// ----------------------------------------------------------
add_action('csai_batch_worker', 'csai_batch_worker_handler', 10, 4);
// ----------------------------------------------------------
function csai_batch_worker_handler($job, $ids, $i, $retry_count = 0) {
    // Force load dependencies in background context
    if (!function_exists('wp_date')) {
        require_once(ABSPATH . 'wp-includes/functions.php');
    }
    include_once __DIR__ . '/log.php';
    
    global $wpdb;

    $max_retries = 2; // Allow 2 retries per batch
    csai_log($job['id'] . " - BATCH $i - (" . implode(', ', $ids) . ")");
    if ($retry_count > 0) {
        csai_log('Batch retry attempt', "$retry_count / $max_retries");
    }

    $bulk_id = $job['bulk_id'] ?? 'BULK-unknown';

    // ────────────────────────────────────
    try {
        
        // Check if job was cancelled
        $job = CSAI_Bulk_Records::get_job($job['id']);
        if (!$job || $job['status'] === 'cancelled') {
            csai_log('Batch skipped - job cancelled', $job['id']);
            return;
        }
        if (!$job || !is_array($job) || $job['status'] !== 'running') {
            csai_log('Batch skipped - job not running or invalid');
            return; // batch cancelled or finished
        }
        
        // Track this batch as in-progress
        $batch_key = 'batch_' . md5(wp_json_encode($ids));
        CSAI_Bulk_Records::set_job_meta($job['id'], [
            'batch_ids' => $ids,
            "batch_tracking.$batch_key" => [
                'status' => 'processing',
                'started_at' => current_time('mysql'),
                'retry_count' => $retry_count,
                'product_ids' => $ids,
                'product_count' => count($ids)
            ],
            'current_error' => null,
        ]);

        $job['bulk_id'] = $bulk_id;


        // Get progress
        $meta = $job['meta'];
        if (is_string($meta)) {
            $meta = json_decode($meta, true);
        }
        if ( !isset($meta['errors']) || ! is_array( $meta['errors'] ) ) {
            if (isset($meta['errors']) && is_string($meta['errors'])) {
                $meta['errors'] = json_decode($meta['errors'], true);
            } else {
                $meta['errors'] = [];
            }
        }
                    
        
        $success_count = 0;
        $failed_count = 0;
    

        // Process products
        $products = csai_get_multiple_products( $ids, null, 'AI' );
        $products = $products['products'] ?? [];
        //csai_log('PRODUCTS IN BATCH', $products ?? []);
        
        // ────────────────────────────────────

            $result = csai_batch_ai_call( $job, $products, $meta, $ids );

            csai_log( 'result   >', (isset($result['json']) && isset($result['json']['products'])) ? count($result['json']['products']) : 'none' );
            csai_log( 'errors   >', ($result['errors'] && count($result['errors']) > 0) ? count($result['errors']) : 'none' );

            // Check for errors that should trigger retry
            if ( $result['errors'] && is_array( $result['errors'] ) ) {
                $has_retryable_error = false;
                
                foreach ( $result['errors'] as $error ) {
                    $error_msg = $error['error'] ?? '';
                    $error_type = $error['type'] ?? '';
                    
                    // Skip non-retryable errors (config errors like Model not found)
                    if ($error_type === 'config_error') {
                        continue;
                    }
                    
                    // Check if this is a retryable error (server drops, timeouts, unknown errors)
                    // Only retry api_error type AND specific transient error messages
                    if (
                        $error_type === 'api_error' && (
                            strpos($error_msg, 'Unknown error') !== false ||
                            strpos($error_msg, 'timeout') !== false ||
                            strpos($error_msg, 'timed out') !== false ||
                            strpos($error_msg, 'Connection') !== false ||
                            strpos($error_msg, 'Server error') !== false ||
                            strpos($error_msg, 'Internal server error') !== false ||
                            strpos($error_msg, 'Rate limit') !== false
                        )
                    ) {
                        $has_retryable_error = true;
                        break;
                    }
                }
                
                // If retryable error and we haven't exceeded retries, throw exception to trigger retry
                if ($has_retryable_error && $retry_count < $max_retries) {
                    throw new Exception($error_msg);
                }
                
                // Otherwise, log errors and mark as failed
                foreach ( $result['errors'] as $error ) {
                    $meta['errors'][] = $error;
                }
                // Mark batch as failed but continue processing other batches
                $failed_count = count( $ids );
            }
            if ( ! $failed_count ) {
                $success_count = count( $ids );
            }
        // ────────────────────────────────────
        
 


    // Handle errors
    // ────────────────────────────────────
    } catch (Exception $e) {
        $error = $e->getMessage();
        csai_log('=== ERROR ---', $error);
        
        //csai_log( $e->getMessage() );
        //csai_log( basename($e->getFile()) . ':' . $e->getLine() );

        // Not enough credits - stop the job
        if ( $error == 'Not enough credits' ) {
            if (function_exists('as_unschedule_all_actions')) {
                $cancelled = as_unschedule_all_actions('csai_batch_worker', [], 'copyspell-bulk');
                csai_log('Cancelled Action Scheduler tasks', $cancelled);
            }
            
            if (!empty($job['meta']['queued_action_ids'])) {
                foreach ($job['meta']['queued_action_ids'] as $action_id) {
                    if (function_exists('as_unschedule_action')) {
                        as_unschedule_action('csai_batch_worker', [$action_id]);
                    }
                }
            }
            if ( ! $job['meta']['success'] ) $status = 'failed';
            else $status = 'warning';
            
 
            $meta['errors'][] = [
                'error' => $error,
                'fatal_error' => true,
            ];
            //csai_writeRecords( $products, $job, $meta );
            
            
            // Update job status
            CSAI_Bulk_Records::update_job($job['id'], [
                'status' => $status
            ]);
            CSAI_Bulk_Records::set_job_meta($job['id'], [
                'completed_at' => current_time('mysql'),
                'errors' => $meta['errors'],
                'failed' => $job['meta']['total'] - $job['meta']['success'],
            ]);


            return;
        }


        // Retry logic for transient errors (network, server drops, etc.)
        if ($retry_count < $max_retries) {
            $retry_count++;
            csai_log('Scheduling batch retry', "$retry_count / $max_retries");
            
            // Re-queue this batch with exponential backoff
            $delay = pow(2, $retry_count) * 30; // 60s, 120s
            as_schedule_single_action(time() + $delay, 'csai_batch_worker', [$job, $ids, $i, $retry_count], 'copyspell-bulk');
            
            // Don't count progress for retrying batches - just return
            return;
        }
        
        // Max retries exceeded, mark as failed and count as processed
        csai_log('Batch failed after ' . $max_retries . ' retries', $e->getMessage());
        $failed_count = count($ids);
        $meta['errors'][] = [
            'error' => 'Batch failed after ' . $max_retries . ' retries: ' . $e->getMessage(),
            'product_ids' => $ids,
            'batch_failed' => true,
            'retries' => $max_retries
        ];
        csai_writeRecords( $products, $job, $meta );

    } catch (Error $e) {
        
        csai_log('=== ERROR (Fatal)');
        csai_log( $e->getMessage() );
        csai_log( basename($e->getFile()) . ':' . $e->getLine() );
        csai_log('---------------------------');
        //csai_log('Batch processing error (Fatal) stack', $e->getTraceAsString());
        
        $human_message = 'An unexpected error occurred during batch processing.';

        // Retry logic for fatal errors
        if ($retry_count < $max_retries) {
            $retry_count++;
            csai_log('Scheduling batch retry after fatal error', "$retry_count / $max_retries");
            
            // Re-queue this batch with exponential backoff
            $delay = pow(2, $retry_count) * 30; // 60s, 120s
            as_schedule_single_action(time() + $delay, 'csai_batch_worker', [$job, $ids, $i, $retry_count], 'copyspell-bulk');
            
            // Don't count progress for retrying batches - just return
            csai_log('Batch will retry - not counting as processed yet');
            return;
        }

        // Catch PHP 7+ fatal errors, count as processed and continue job
        csai_log('Fatal error - batch failed after ' . $max_retries . ' retries');
        $failed_count = count($ids);
        $meta['errors'][] = [
            'error' => $human_message,
            'message' => $e->getMessage(),
            'file' => $e->getFile() . ':' . $e->getLine(),
            'product_ids' => $ids,
            'fatal_error' => true,
            'retries' => $max_retries
        ];
        csai_writeRecords( $products, $job, $meta );
        
    }



    /*
    csai_log('set_job_meta', [
        '+processed' => count($ids),
        '+success' => $success_count,
        '+failed' => $failed_count,
        'errors' => $meta['errors']
    ]);
    */

    // ALWAYS update progress, even if there were errors
    $batch_key = 'batch_' . md5(wp_json_encode($ids));
    CSAI_Bulk_Records::set_job_meta($job['id'], [
        '+processed' => count($ids),
        '+success' => $success_count,
        '+failed' => $failed_count,
        'errors' => $meta['errors'],
        "batch_tracking.$batch_key.status" => 'completed',
        "batch_tracking.$batch_key.completed_at" => current_time('mysql')
    ]);

    


    // Check if all batches are complete
    $updated_job = CSAI_Bulk_Records::get_job($job['id']);
    $updated_meta = $updated_job['meta'];
    $processed = $updated_meta['processed'] ?? 0;
    $total = $updated_meta['total'] ?? count($meta['ids'] ?? []);
    
    csai_log('=======================', "$processed / $total");
    
    if ($processed >= $total) {
        // Determine final status based on success/failed counts
        $success_total = $updated_meta['success'] ?? 0;
        $failed_total = $updated_meta['failed'] ?? 0;
        
        if ($failed_total >= $total) {
            // All products failed
            $final_status = 'failed';
        } elseif ($failed_total > 0) {
            // Some products failed
            $final_status = 'warning';
        } else {
            // All products succeeded
            $final_status = 'completed';
        }
        
        CSAI_Bulk_Records::update_job($job['id'], [
            'status' => $final_status,
        ]);
        CSAI_Bulk_Records::set_job_meta($job['id'], [
            'completed_at' => current_time('mysql')
        ]);
        csai_log('Job ' . $final_status, $job['id']);
        if ( sizeof($meta['errors']) > 0 ) csai_log('Job errors', $meta['errors']);
        csai_log('■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■');
    }


}






// MARK: AI Call
// ----------------------------------------------------------
function csai_batch_ai_call( $job, $products, $meta, $batch_ids=[] ) {
    global $wpdb;

    /*
    CSAI_Bulk_Records::set_job_meta($job['id'], [
        'product_id' => $product_id
    ]);
    */
    
        // Update products and add records
        foreach ( $products as $row ) {
            $product_id = $row['id'];

            // Find the original product by ID
            $original_product = wp_list_filter( $products, array( 'id' => $product_id ) );
            $original_product = reset( $original_product );
            $original = [
                "title" => $original_product['title'] ?? '',
                "excerpt" => $original_product['excerpt'] ?? '',
                "content" => $original_product['content'] ?? '',
                "url" => $original_product['url'] ?? ''
            ];

            // 1. Add the record
            $record_id = CSAI_Bulk_Records::add_record( 
                $job['id'],
                $row['id'],
                array(
                    '_type' => 'original',
                    '_action' => 'bulk-content'
                ),
                $original,
                $row['context'] ?? 'product'
            );

            if (!$record_id) {
                csai_log('Failed to add record', 1);
            }

            // Update product content
            //$product->set_content( $updated, 'AI' );
            //$update_result = $product->save();

        }




        // AI CALL
        // ────────────────────────────────────
        $result = copyspell_ai_call_bulk_products( $products, $meta, $batch_ids, $job );
        // ────────────────────────────────────
        //csai_log('RESULT ===========', $result );
        
        $newContent = $result['json']['products'] ?? [];

        

        // ERROR HANDLING
        // ────────────────────────────────────
        if ( ! $newContent || ! is_array( $newContent ) ) {
            if ( ! is_array( $result ) ) {
                $result = [];
            }
            if ( ! $result['errors'] ) {
                $result['errors'] = array(
                    array(
                        'error' => 'No valid content returned from AI',
                        'product_ids' => $batch_ids
                    )
                );
            }
            csai_writeRecords( $products, $job, $meta, $result );
            return $result;
            
        }

        
        
        // Update products and add records
        foreach ( $newContent as $row ) {
            $product_id = $row['id'];

            $calldata = array(
                '_type'     => 'suggestion',
                '_action'   => 'bulk-content',
                'model'     => $result['meta']['model'] ?? '',
                'api'       => $result['meta']['api'] ?? '',
                'duration'  => $result['meta']['duration'] ?? 0,
                'errors'    => $result['errors'] ?? [],
                'settings'  => $meta['ai_settings'] ?? [],
            );
            $updated = [
                "title"     => $row['title'] ?? '',
                "excerpt"   => $row['excerpt'] ?? '',
                "content"   => $row['content'] ?? '',
            ];

            // 1. Add the record
            $record_id = CSAI_Bulk_Records::add_record( 
                $job['id'],
                $product_id,
                $calldata,
                $updated,
                $row['context'] ?? 'product'
            );

            if (!$record_id) {
                csai_log('Failed to add record', 1);
            }

            // Update product content
            //$product->set_content( $updated, 'AI' );
            //$update_result = $product->save();

        }




    return $result;


}







// MARK: Helpers
// ----------------------------------------------------------





// MARK: Write Records
// ----------------------------------------------------------
function csai_writeRecords( $products, $job, $meta, $content ) {
    foreach ( $products as $row ) {
        if ( ! isset($row['id']) ) $row['id'] = 0;
        //if ( ! $content['errors'] ) $content['errors'] = $meta['errors'] ?? [];

        $calldata = array(
            '_type'     => 'suggestion',
            '_action'   => 'bulk-content',
            'errors'    => $meta['errors'] ?? [],
            'settings'  => $meta['ai_settings'] ?? [],
        );
        
        // Add the records
        $record_id = CSAI_Bulk_Records::add_record( 
            $job['id'],
            $row['id'],
            $calldata,
            $content,
            $row['context'] ?? 'product'
        );

        if (!$record_id) {
            csai_log('Failed to add record', 1);
        }

    }
}



// MARK: Cancel Bulk Job
// ----------------------------------------------------------
add_action('wp_ajax_csai_bulk_cancel', 'csai_bulk_cancel');
// ----------------------------------------------------------
function csai_bulk_cancel() {
    check_ajax_referer('copyspell_ai_admin_nonce', 'nonce');
    
    $job_id = isset($_POST['job_id']) ? sanitize_text_field(wp_unslash($_POST['job_id'])) : null;
    
    if (!$job_id) {
        wp_send_json_error(['message' => 'No job ID provided']);
        return;
    }
    
    $job = CSAI_Bulk_Records::get_job($job_id);
    
    if (!$job) {
        wp_send_json_error(['message' => 'Job not found']);
        return;
    }
    
    // Cancel all queued Action Scheduler tasks for this job
    if (function_exists('as_unschedule_all_actions')) {
        // Cancel by hook and group
        $cancelled = as_unschedule_all_actions('csai_batch_worker', [], 'copyspell-bulk');
        csai_log('Cancelled Action Scheduler tasks', $cancelled);
    }
    
    // Alternative: Cancel by stored action IDs
    $meta = $job['meta'];
    if (!empty($meta['queued_action_ids'])) {
        foreach ($meta['queued_action_ids'] as $action_id) {
            if (function_exists('as_unschedule_action')) {
                as_unschedule_action('csai_batch_worker', [$action_id]);
            }
        }
    }
    
    // Update job status
    CSAI_Bulk_Records::update_job($job_id, [
        'status' => 'cancelled'
    ]);
    
    csai_log('Job cancelled', $job_id);
    
    wp_send_json_success([
        'message' => 'Job cancelled',
        'job_id' => $job_id
    ]);
}


/**
 * Enqueue a background task (with fallback to WP Cron)
 */
// ----------------------------------------------------------
function csai_enqueue_background_task($hook, $args = array()) {
    include_once __DIR__ . '/log.php';
    
    if (function_exists('as_enqueue_async_action')) {
        csai_log('Using Action Scheduler for', $hook);
        // Use Action Scheduler - expects args as second param
        as_enqueue_async_action($hook, [$args]);
    } else {
        csai_log('Using WP Cron fallback for', $hook);
        // Fallback to WP Cron - expects array of args
        wp_schedule_single_event(time(), $hook, [$args]);
        
        // WP Cron is unreliable - spawn it manually
        spawn_cron();
    }
}


// MARK: Job Watchdog - Detect and Recover Stuck Batches
// ----------------------------------------------------------
add_action('csai_job_watchdog', 'csai_job_watchdog_check');
// ----------------------------------------------------------
function csai_job_watchdog_check() {
    include_once __DIR__ . '/log.php';
    include_once __DIR__ . '/class-aai-bulk-records.php';
    
    csai_log('=== Job Watchdog Running ===');
    
    // Get all running jobs
    $jobs_table = CSAI_Bulk_Records::$table_name_jobs;
    global $wpdb;
    
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Custom table query for job monitoring, caching not suitable for real-time job status checks. Table name is internally defined constant.
    $running_jobs = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT * FROM {$jobs_table} WHERE status = %s",
            'running'
        ),
        ARRAY_A
    );
    
    if (empty($running_jobs)) {
        csai_log('No running jobs to check');
        return;
    }
    
    $stuck_timeout = 300; // 5 minutes - if batch processing for longer, consider it stuck
    
    foreach ($running_jobs as $job) {
        $meta = json_decode($job['meta'], true);
        $batch_tracking = $meta['batch_tracking'] ?? [];
        $processed = $meta['processed'] ?? 0;
        $total = $meta['total'] ?? 0;
        
        csai_log("Checking job {$job['id']}", "processed: $processed / $total");
        
        // Check for stuck batches
        $stuck_batches = [];
        foreach ($batch_tracking as $batch_key => $batch_info) {
            if ($batch_info['status'] === 'processing') {
                $started_at = strtotime($batch_info['started_at']);
                $now = current_time('timestamp');
                $elapsed = $now - $started_at;
                
                if ($elapsed > $stuck_timeout) {
                    $stuck_batches[$batch_key] = $batch_info;
                    csai_log("Found stuck batch: $batch_key", "elapsed: {$elapsed}s");
                }
            }
        }
        
        // Reschedule stuck batches
        if (!empty($stuck_batches)) {
            csai_log("Recovering " . count($stuck_batches) . " stuck batches for job {$job['id']}");
            
            foreach ($stuck_batches as $batch_key => $batch_info) {
                $product_ids = $batch_info['product_ids'] ?? [];
                $retry_count = ($batch_info['retry_count'] ?? 0) + 1;
                $max_retries = 2;
                
                if (empty($product_ids)) {
                    csai_log("Cannot reschedule batch - no product IDs stored", $batch_key);
                    continue;
                }
                
                if ($retry_count > $max_retries) {
                    csai_log("Batch exceeded max retries, marking as failed", $batch_key);
                    
                    // Mark as failed so job can complete
                    $meta['batch_tracking'][$batch_key]['status'] = 'failed';
                    $meta['batch_tracking'][$batch_key]['failed_at'] = current_time('mysql');
                    $meta['batch_tracking'][$batch_key]['reason'] = 'Stuck/timeout after max retries';
                    
                    // Count as processed so job can complete
                    $product_count = count($product_ids);
                    $meta['processed'] = ($meta['processed'] ?? 0) + $product_count;
                    $meta['failed'] = ($meta['failed'] ?? 0) + $product_count;
                    
                    continue;
                }
                
                csai_log("Rescheduling stuck batch with retry count: $retry_count", $product_ids);
                
                // Reset batch status and reschedule
                $meta['batch_tracking'][$batch_key]['status'] = 'retrying';
                $meta['batch_tracking'][$batch_key]['retry_count'] = $retry_count;
                
                // Reconstruct job array for rescheduling
                $job_for_retry = [
                    'id' => $job['id'],
                    'bulk_id' => $meta['bulk_id'] ?? 'BULK-unknown',
                    'status' => 'running',
                    'meta' => $meta
                ];
                
                // Schedule with delay
                $delay = pow(2, $retry_count) * 30;
                as_schedule_single_action(
                    time() + $delay, 
                    'csai_batch_worker', 
                    [$job_for_retry, $product_ids, 0, $retry_count], 
                    'copyspell-bulk'
                );
                
                csai_log("Batch rescheduled to run in {$delay}s", $batch_key);
            }
            
            // Update job meta
            CSAI_Bulk_Records::set_job_meta($job['id'], [
                'batch_tracking' => $meta['batch_tracking'],
                'processed' => $meta['processed'] ?? 0,
                'failed' => $meta['failed'] ?? 0
            ]);
            
            // Check if job should be completed now
            if (($meta['processed'] ?? 0) >= ($meta['total'] ?? 0)) {
                CSAI_Bulk_Records::update_job($job['id'], ['status' => 'completed']);
                CSAI_Bulk_Records::set_job_meta($job['id'], ['completed_at' => current_time('mysql')]);
                csai_log("Job {$job['id']} completed after watchdog recovery");
            }
        }
    }
    
}

// Schedule the watchdog to run every 5 minutes
if (!wp_next_scheduled('csai_job_watchdog')) {
    wp_schedule_event(time(), 'csai_five_minutes', 'csai_job_watchdog');
}

// Register custom interval
add_filter('cron_schedules', 'csai_custom_cron_intervals');
function csai_custom_cron_intervals($schedules) {
    $schedules['csai_five_minutes'] = array(
        'interval' => 300,
        'display' => __('Every 5 Minutes', 'copyspell-ai')
    );
    return $schedules;
}







