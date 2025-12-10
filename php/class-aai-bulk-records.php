<?php
/**
 * Bulk Records Database Management
 * 
 * Manages database table for storing bulk AI generation records
 * 
 * @package CopySpell_AI
 * @since 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly


include_once __DIR__ . '/log.php';
global $per_page;
$per_page = 20;

class CSAI_Bulk_Records {

	/**
	 * Table name (without prefix)
	 * @var string
	 */
	private static $table_name = 'csai_bulk_records';
	private static $jobs_table_name = 'csai_bulk_jobs';
	private static $per_page = 20;
	private static $limit = -1;



	
	/**
	 * Get full table name with WordPress prefix
	 * 
	 * @return string
	 */
    // --------------------------------------------------
	private static function get_table_name( $type = 'records' ) {
		global $wpdb;
		if ( $type === 'jobs' ) {
			return $wpdb->prefix . self::$jobs_table_name;
		}
		return $wpdb->prefix . self::$table_name;
	}




	/** MARK: CREATE TABLES
	 * Create the bulk records table
	 * 
	 * @return bool True on success, false on failure
	 * 
	 * @example
	 * CSAI_Bulk_Records::create_tables();
	 */
    // --------------------------------------------------
	public static function create_tables() {
		global $wpdb;
		
		$charset_collate = $wpdb->get_charset_collate();
		require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

		// Create jobs table FIRST (since records references job_id)
		$jobs_table = self::get_table_name('jobs');
		$sql_jobs = "CREATE TABLE $jobs_table (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			status varchar(50) NOT NULL,
			meta mediumtext NOT NULL,
			created datetime DEFAULT CURRENT_TIMESTAMP,
			updated datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY status (status),
			KEY created (created)
		) $charset_collate;";

		$result_jobs = dbDelta( $sql_jobs );

		// Create records table SECOND
		$records_table = self::get_table_name('records');
		$sql_records = "CREATE TABLE $records_table (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			context varchar(30) NOT NULL DEFAULT 'product',
			job_id bigint(20) unsigned NOT NULL,
			product_id bigint(20) unsigned NOT NULL,
			calldata mediumtext NOT NULL,
			content mediumtext NOT NULL,
			created datetime DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY context (context),
			KEY job_id (job_id),
			KEY product_id (product_id),
			KEY context_product (context, product_id),
			KEY created (created)
		) $charset_collate;";

		$result_records = dbDelta( $sql_records );

	
		return true;
	}




	/**
	 * Delete the bulk records table
	 * 
	 * @return bool True on success, false on failure
	 * 
	 * @example
	 * CSAI_Bulk_Records::delete_tables();
	 */
    // --------------------------------------------------
	public static function delete_tables() {
		global $wpdb;
		$records_table = self::get_table_name('records');
		$jobs_table = self::get_table_name('jobs');
		//$wpdb->query( "DROP TABLE IF EXISTS {$records_table}" );
		//$wpdb->query( "DROP TABLE IF EXISTS {$jobs_table}" );
		return true;
	}




	/** MARK: ADD
	 * Add a new record
	 * 
	 * @param int $job_id Job ID (use 0 for single product content generation)
	 * @param int $product_id Product ID
	 * @param array|string $calldata Call data (will be JSON encoded if array)
	 * @param array|string $content Generated content data (will be JSON encoded if array)
	 * @param string $context Optional context identifier (default: '')
	 * @return int|false Record ID on success, false on failure
	 * 
	 * @example
	 * // Batch job record
	 * $record_id = CSAI_Bulk_Records::add_record(
	 *     123,
	 *     456,
	 *     ['prompt' => 'Generate content...', 'model' => 'gpt-4'],
	 *     ['content' => 'Generated content here...', 'tokens' => 150],
	 *     'bulk_generation'
	 * );
	 * 
	 * // Single product content generation (job_id = 0)
	 * $record_id = CSAI_Bulk_Records::add_record(
	 *     0,
	 *     456,
	 *     ['prompt' => 'Generate...'],
	 *     ['content' => 'Generated...'],
	 *     'single_product'
	 * );
	 */
    // --------------------------------------------------
	public static function add_record( $job_id, $product_id, $calldata, $content, $context = '' ) {
		global $wpdb;
		
		// Convert arrays to JSON strings
        // JSON_UNESCAPED_UNICODE preserves Unicode characters for database storage
        // SQL injection is handled by $wpdb->insert() prepared statements
		if ( is_array( $calldata ) ) {
			$calldata = wp_json_encode( $calldata, JSON_UNESCAPED_UNICODE );
		}
		if ( is_array( $content ) ) {
			$content = wp_json_encode( $content, JSON_UNESCAPED_UNICODE );
		}

		$table_name = self::get_table_name();
		
		$result = $wpdb->insert(
			$table_name,
			array(
				'context' => sanitize_text_field( $context ),
				'job_id' => absint( $job_id ),
				'product_id' => absint( $product_id ),
				'calldata' => $calldata,
				'content' => $content,
			),
			array(
				'%s', // context
				'%d', // job_id
				'%d', // product_id
				'%s', // calldata
				'%s', // content
			)
		);

		return $result ? $wpdb->insert_id : false;
	}



	
	/** MARK: UPDATE
	 * Update an existing record
	 * 
	 * @param int $id Record ID
	 * @param array $data Data to update (can include: context, job_id, product_id, calldata, content)
	 * @return bool True on success, false on failure
	 * 
	 * @example
	 * CSAI_Bulk_Records::update_record(
	 *     123,
	 *     [
	 *         'content' => ['content' => 'Updated content...', 'tokens' => 200],
	 *         'job_id' => 456,
	 *         'context' => 'updated_context'
	 *     ]
	 * );
	 */
    // --------------------------------------------------
	public static function update_record( $id, $data ) {
		global $wpdb;
		
		$table_name = self::get_table_name();
		$update_data = array();
		$format = array();

		// Prepare update data
		if ( isset( $data['context'] ) ) {
			$update_data['context'] = sanitize_text_field( $data['context'] );
			$format[] = '%s';
		}
		if ( isset( $data['job_id'] ) ) {
			$update_data['job_id'] = absint( $data['job_id'] );
			$format[] = '%d';
		}
		if ( isset( $data['product_id'] ) ) {
			$update_data['product_id'] = absint( $data['product_id'] );
			$format[] = '%d';
		}
		if ( isset( $data['calldata'] ) ) {
			$update_data['calldata'] = is_array( $data['calldata'] ) ? 
				wp_json_encode( $data['calldata'], JSON_UNESCAPED_UNICODE ) : 
				$data['calldata'];
			$format[] = '%s';
		}
		if ( isset( $data['content'] ) ) {
			$update_data['content'] = is_array( $data['content'] ) ? 
				wp_json_encode( $data['content'], JSON_UNESCAPED_UNICODE ) : 
				$data['content'];
			$format[] = '%s';
		}

		if ( empty( $update_data ) ) {
			return false;
		}

		$result = $wpdb->update(
			$table_name,
			$update_data,
			array( 'id' => absint( $id ) ),
			$format,
			array( '%d' )
		);

		return $result !== false;
	}




	/** MARK: UPDATE BATCH
	 * Update multiple records at once
	 * 
	 * @param array $updates Array of update data objects. Each object must have an 'id' and data to update.
	 * @return bool True on success, false on failure
	 * 
	 * @example
	 * CSAI_Bulk_Records::update_records_batch([
	 *     ['id' => 1, 'content' => ['updated' => true]],
	 *     ['id' => 2, 'content' => ['updated' => true]]
	 * ]);
	 */
    // --------------------------------------------------
	public static function update_records_batch( $updates ) {
		global $wpdb;
		$table_name = self::get_table_name();
		
		if ( empty( $updates ) || ! is_array( $updates ) ) {
			return false;
		}

		$success = true;
		
		// Start transaction
		$wpdb->query( 'START TRANSACTION' );

		foreach ( $updates as $data ) {
			if ( empty( $data['id'] ) ) {
				continue;
			}
			
			$id = absint( $data['id'] );
			unset( $data['id'] ); // Remove ID from update data
			
			if ( ! self::update_record( $id, $data ) ) {
				$success = false;
				break; 
			}
		}

		if ( $success ) {
			$wpdb->query( 'COMMIT' );
			return true;
		} else {
			$wpdb->query( 'ROLLBACK' );
			return false;
		}
	}




	/** MARK: DELETE
	 * Delete a record by ID
	 * 
	 * @param int $id Record ID
	 * @return bool True on success, false on failure
	 * 
	 * @example
	 * CSAI_Bulk_Records::delete_record( 123 );
	 */
    // --------------------------------------------------
	public static function delete_record( $id ) {
		global $wpdb;
		$table_name = self::get_table_name();
		
		$result = $wpdb->delete(
			$table_name,
			array( 'id' => absint( $id ) ),
			array( '%d' )
		);

		return $result !== false;
	}




	/** MARK: DELETE ALL job
	 * Delete all records by job ID
	 * 
	 * @param int $job_id Job identifier
	 * @return bool True on success, false on failure
	 * 
	 * @example
	 * CSAI_Bulk_Records::delete_records_by_job( 123 );
	 */
    // --------------------------------------------------
	public static function delete_records_by_job( $job_id ) {
		global $wpdb;
		$table_name = self::get_table_name();
		
		$result = $wpdb->delete(
			$table_name,
			array( 'job_id' => absint( $job_id ) ),
			array( '%d' )
		);

		return $result !== false;
	}




	/** MARK: DELETE ALL product
	 * Delete all records by product ID
	 * 
	 * @param int $product_id Product ID
	 * @return bool True on success, false on failure
	 * 
	 * @example
	 * CSAI_Bulk_Records::delete_records_by_product( 456 );
	 */
    // --------------------------------------------------
	public static function delete_records_by_product( $product_id ) {
		global $wpdb;
		$table_name = self::get_table_name();
		
		$result = $wpdb->delete(
			$table_name,
			array( 'product_id' => absint( $product_id ) ),
			array( '%d' )
		);

		return $result !== false;
	}




	/** MARK: GET single
	 * Get a single record by ID
	 * 
	 * @param int $id Record ID
	 * @param bool $decode_json Whether to decode JSON fields (default: true)
	 * @return object|null Record object or null if not found
	 * 
	 * @example
	 * $record = CSAI_Bulk_Records::get_record( 123 );
	 * echo $record->batch_id;
	 * print_r( $record->calldata ); // Already decoded as array
	 */
    // --------------------------------------------------
	public static function get_record( $id, $decode_json = true ) {
		global $wpdb;
		$table_name = self::get_table_name();
		
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		$record = $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM {$table_name} WHERE id = %d",
			absint( $id )
		));
		if ( $record && $decode_json ) {
			$record = self::decode_record_json( $record );
		}

		return $record;
	}




	/** MARK: GET by job
	 * Get all records by job ID
	 * 
	 * @param int $job_id Job identifier (use 0 to get single product content generation records)
	 * @param bool $decode_json Whether to decode JSON fields (default: true)
	 * @param int $page Optional page number (1-indexed). If provided, pagination is enabled.
	 * @param int $perPage Optional records per page (default: 20)
	 * @return array Array of record objects
	 * 
	 * @example
	 * $records = CSAI_Bulk_Records::get_records_by_job( 123 );
	 * $records = CSAI_Bulk_Records::get_records_by_job( 123, true, 2, 50 ); // Page 2, 50 per page
	 * foreach ( $records as $record ) {
	 *     echo $record->product_id . ': ' . $record->content['content'];
	 * }
	 */
    // --------------------------------------------------
	public static function get_records_by_job( $job_id, $decode_json = true, $page = null, $perPage = null ) {
		global $wpdb;
		$table_name = self::get_table_name();
		
	if ( $page !== null && $page > 0 ) {
		$offset = ( absint( $page ) - 1 ) * absint( $perPage );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		$records = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table_name} WHERE job_id = %d ORDER BY created DESC LIMIT %d OFFSET %d",
				absint( $job_id ),
				absint( $perPage ),
				$offset
			)
		);
	} else {
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		$records = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table_name} WHERE job_id = %d ORDER BY created DESC",
				absint( $job_id )
			)
		);
	}		if ( $records && $decode_json ) {
			$records = array_map( array( self::class, 'decode_record_json' ), $records );
		}

		return $records;
	}




	/** MARK: GET by product
	 * Get all records by product ID
	 * 
	 * @param int $product_id Product ID
	 * @param bool $decode_json Whether to decode JSON fields (default: true)
	 * @param int $page Optional page number (1-indexed). If provided, pagination is enabled.
	 * @param int $perPage Optional records per page (default: 20)
	 * @return array Array of record objects
	 * 
	 * @example
	 * $records = CSAI_Bulk_Records::get_records_by_product( 456 );
	 * $records = CSAI_Bulk_Records::get_records_by_product( 456, true, 1, 50 ); // Page 1, 50 per page
	 * foreach ( $records as $record ) {
	 *     echo $record->batch_id . ': ' . $record->created;
	 * }
	 */
    // --------------------------------------------------
	public static function get_records_by_product( $product_id, $decode_json = true, $page = null, $perPage = null ) {
		global $wpdb;
		$table_name = self::get_table_name();
		
	if ( $page !== null && $page > 0 ) {
		$offset = ( absint( $page ) - 1 ) * absint( $perPage );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		$records = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table_name} WHERE product_id = %d ORDER BY created DESC LIMIT %d OFFSET %d",
				absint( $product_id ),
				absint( $perPage ),
				$offset
			)
		);
	} else {
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		$records = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table_name} WHERE product_id = %d ORDER BY created DESC",
				absint( $product_id )
			)
		);
	}		if ( $records && $decode_json ) {
			$records = array_map( array( self::class, 'decode_record_json' ), $records );
		}

		return $records;
	}




	/** MARK: GET by context and product
	 * Get all records by context and product ID
	 * 
	 * @param string $context Context identifier
	 * @param int $product_id Product ID
	 * @param bool $decode_json Whether to decode JSON fields (default: true)
	 * @param int $page Optional page number (1-indexed). If provided, pagination is enabled.
	 * @param int $perPage Optional records per page (default: 20)
	 * @return array Array of record objects
	 * 
	 * @example
	 * $records = CSAI_Bulk_Records::get_records_by_context_and_product( 'bulk_generation', 456 );
	 * $records = CSAI_Bulk_Records::get_records_by_context_and_product( 'single_product', 456, true, 1, 50 );
	 * foreach ( $records as $record ) {
	 *     echo $record->context . ': ' . $record->created;
	 * }
	 */
    // --------------------------------------------------
	public static function get_records_by_context_and_product( $context, $product_id, $decode_json = true, $page = null, $perPage = null ) {
		global $wpdb;
		$table_name = self::get_table_name();
		$context = sanitize_text_field( $context );

		if ( $page !== null && $page > 0 ) {
			$offset = ( absint( $page ) - 1 ) * absint( $perPage );
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
			$records = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT * FROM {$table_name} WHERE context = %s AND product_id = %d ORDER BY created DESC LIMIT %d OFFSET %d",
					$context,
					absint( $product_id ),
					absint( $perPage ),
					$offset
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
			$records = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT * FROM {$table_name} WHERE context = %s AND product_id = %d ORDER BY created DESC",
					$context,
					absint( $product_id )
				)
			);
		}		if ( $records && $decode_json ) {
				$records = array_map( array( self::class, 'decode_record_json' ), $records );
			}


			return $records;
		}




	/** MARK: GET all
	 * Get all records with optional filters
	 * 
	 * @param array $args {
	 *     Optional. Query arguments.
	 *     @type int    $limit      Maximum number of records to return. Default 100.
	 *     @type int    $offset     Number of records to skip. Default 0.
	 *     @type int    $page       Page number (1-indexed). Overrides offset if provided.
	 *     @type int    $perPage    Records per page. Default 20.
	 *     @type string $order      Order direction (ASC|DESC). Default 'DESC'.
	 *     @type string $order_by   Column to order by. Default 'created'.
	 * }
	 * @param bool $decode_json Whether to decode JSON fields (default: true)
	 * @return array Array of record objects
	 * 
	 * @example
	 * $records = CSAI_Bulk_Records::get_all_records([
	 *     'limit' => 50,
	 *     'offset' => 0,
	 *     'order' => 'ASC'
	 * ]);
	 * $records = CSAI_Bulk_Records::get_all_records(['page' => 2, 'perPage' => 50]);
	 */
    // --------------------------------------------------
	public static function get_all_records( $args = array(), $decode_json = true ) {
		global $wpdb;
		$table_name = self::get_table_name();
		
		$defaults = array(
			'limit' => self::$limit,
			'offset' => 0,
			'page' => null,
			'perPage' => self::$per_page,
			'order' => 'DESC',
			'order_by' => 'created'
		);
		$args = wp_parse_args( $args, $defaults );

		// Use page-based pagination if page is provided
		if ( $args['page'] !== null && $args['page'] > 0 ) {
			$args['offset'] = ( absint( $args['page'] ) - 1 ) * absint( $args['perPage'] );
			$args['limit'] = absint( $args['perPage'] );
		}

		// Sanitize order_by to prevent SQL injection
		$allowed_order_by = array( 'id', 'job_id', 'product_id', 'created' );
		if ( ! in_array( $args['order_by'], $allowed_order_by ) ) {
			$args['order_by'] = 'created';
		}

		// Sanitize order direction
		$args['order'] = strtoupper( $args['order'] ) === 'ASC' ? 'ASC' : 'DESC';

	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from class, order_by/order are sanitized.
	$records = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT * FROM {$table_name} ORDER BY {$args['order_by']} {$args['order']} LIMIT %d OFFSET %d",
			absint( $args['limit'] ),
			absint( $args['offset'] )
		)
	);		if ( $records && $decode_json ) {
			$records = array_map( array( self::class, 'decode_record_json' ), $records );
		}

		return $records;
	}





	/** MARK: GET IDs by job
	 * Get record IDs by job ID
	 * 
	 * @param int $job_id Job identifier
	 * @return array Array of record IDs
	 * 
	 * @example
	 * $ids = CSAI_Bulk_Records::get_record_ids_by_job( 123 );
	 * foreach ( $ids as $id ) {
	 *     echo "Record ID: $id\n";
	 * }
	 */
	// --------------------------------------------------
	public static function get_record_ids_by_job( $job_id ) {
		global $wpdb;
		$table_name = self::get_table_name();
		
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		return $wpdb->get_col( $wpdb->prepare(
			"SELECT id FROM {$table_name} WHERE job_id = %d ORDER BY created DESC",
			absint( $job_id )
		) );
	}



	/** MARK: COUNT job
	 * Get record count by job ID
	 * 
	 * @param int $job_id Job identifier
	 * @return int Number of records
	 * 
	 * @example
	 * $count = CSAI_Bulk_Records::get_job_record_count( 123 );
	 * echo "Total records in job: $count";
	 */
    // --------------------------------------------------
	public static function get_job_record_count( $job_id ) {
		global $wpdb;
		$table_name = self::get_table_name();
		
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		return (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM {$table_name} WHERE job_id = %d",
			absint( $job_id )
		) );
	}




	/** MARK: COUNT total
	 * Get total record count
	 * 
	 * @return int Total number of records
	 * 
	 * @example
	 * $total = CSAI_Bulk_Records::get_total_count();
	 * echo "Total records: $total";
	 */
    // --------------------------------------------------
	public static function get_total_count() {
		global $wpdb;
		$table_name = self::get_table_name();
		
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table_name}" );
	}




	/** MARK: COUNT by product
	 * Get record count by product ID
	 * 
	 * @param int $product_id Product ID
	 * @return int Number of records for the product
	 * 
	 * @example
	 * $count = CSAI_Bulk_Records::get_product_record_count( 456 );
	 * echo "Total records for product: $count";
	 */
    // --------------------------------------------------
	public static function get_product_record_count( $product_id ) {
		global $wpdb;
		$table_name = self::get_table_name();
		
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		return (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM {$table_name} WHERE product_id = %d",
			absint( $product_id )
		) );
	}




	/** MARK: COUNT by context and product
	 * Get record count by context and product ID
	 * 
	 * @param string $context Context identifier
	 * @param int $product_id Product ID
	 * @return int Number of records for the context and product
	 * 
	 * @example
	 * $count = CSAI_Bulk_Records::get_context_product_record_count( 'bulk_generation', 456 );
	 * echo "Total records: $count";
	 */
    // --------------------------------------------------
	public static function get_context_product_record_count( $context, $product_id ) {
		global $wpdb;
		$table_name = self::get_table_name();
		$context = sanitize_text_field( $context );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		return (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM {$table_name} WHERE context = %s AND product_id = %d",
			$context,
			absint( $product_id )
		) );
	}




	/** MARK: DECODE
	 * Decode JSON fields in a record
	 * 
	 * @param object $record Record object
	 * @return object Record with decoded JSON fields
	 */
    // --------------------------------------------------
	private static function decode_record_json( $record ) {
		if ( ! empty( $record->calldata ) ) {
			$decoded = json_decode( $record->calldata, true );
			if ( json_last_error() === JSON_ERROR_NONE ) {
				$record->calldata = $decoded;
			}
		}
		if ( ! empty( $record->content ) ) {
			$decoded = json_decode( $record->content, true );
			if ( json_last_error() === JSON_ERROR_NONE ) {
				$record->content = $decoded;
			}
		}
		return $record;
	}




	/**
	 * Check if table exists
	 * 
	 * @return bool True if table exists, false otherwise
	 * 
	 * @example
	 * if ( ! CSAI_Bulk_Records::table_exists() ) {
	 *     CSAI_Bulk_Records::create_tables();
	 * }
	 */
    // --------------------------------------------------
public static function table_exists() {
	global $wpdb;
	$table_name = self::get_table_name();
	
	return $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name ) ) === $table_name;
}


	// ========================================
	// JOBS MANAGEMENT METHODS
	// ========================================




	/** MARK: ADD job
	 * Add a new job
	 * 
	 * @param string $status Job status (e.g., 'pending', 'processing', 'completed', 'failed')
	 * @param array|string $meta Job metadata (will be JSON encoded if array)
	 * @return int|false Job ID on success, false on failure
	 * 
	 * @example
	 * $job_id = CSAI_Bulk_Records::add_job(
	 *     'pending',
	 *     [
	 *         'total_products' => 50,
	 *         'processed' => 0,
	 *         'settings' => ['model' => 'gpt-4', 'temperature' => 0.7]
	 *     ]
	 * );
	 */
    // --------------------------------------------------
	public static function add_job( $status, $meta = array() ) {
		global $wpdb;
		
		// Convert arrays to JSON strings
		if ( is_array( $meta ) ) {
			$meta = wp_json_encode( $meta, JSON_UNESCAPED_UNICODE );
		}

		$table_name = self::get_table_name( 'jobs' );
		
		$result = $wpdb->insert(
			$table_name,
			array(
				'status' => sanitize_text_field( $status ),
				'meta' => $meta,
			),
			array(
				'%s', // status
				'%s', // meta
			)
		);

		return $result ? $wpdb->insert_id : false;
	}




	/** MARK: UPDATE job
	 * Update an existing job
	 * 
	 * @param int $id Job ID
	 * @param array $data Data to update (can include: status, meta)
	 * @return bool True on success, false on failure
	 * 
	 * @example
	 * CSAI_Bulk_Records::update_job(
	 *     123,
	 *     [
	 *         'status' => 'processing',
	 *         'meta' => ['processed' => 25, 'total_products' => 50]
	 *     ]
	 * );
	 */
    // --------------------------------------------------
	public static function update_job( $id, $data ) {
		global $wpdb;
		
		$table_name = self::get_table_name( 'jobs' );
		$update_data = array();
		$format = array();

		// Prepare update data
		if ( isset( $data['status'] ) ) {
			$update_data['status'] = sanitize_text_field( $data['status'] );
			$format[] = '%s';
		}
		if ( isset( $data['meta'] ) ) {
			$update_data['meta'] = is_array( $data['meta'] ) ? 
				wp_json_encode( $data['meta'], JSON_UNESCAPED_UNICODE ) : 
				$data['meta'];
			$format[] = '%s';
		}

		if ( empty( $update_data ) ) {
			return false;
		}

		$result = $wpdb->update(
			$table_name,
			$update_data,
			array( 'id' => absint( $id ) ),
			$format,
			array( '%d' )
		);

		return $result !== false;
	}




	/** MARK: SET job meta fields
	 * Atomically set or increment fields in job meta (race-condition safe)
	 * Prefix field names with '+' for atomic increment, otherwise sets value directly
	 * 
	 * @param int $id Job ID
	 * @param string|array $field Field name or array of field=>value pairs
	 * @param mixed $value Value to set (ignored if $field is array)
	 * @return bool True on success, false on failure
	 * 
	 * @example
	 * // Set single field
	 * CSAI_Bulk_Records::set_job_meta( 123, 'last_product_id', 456 );
	 * 
	 * // Mix increments and sets in ONE query
	 * CSAI_Bulk_Records::set_job_meta( 123, [
	 *     '+processed' => 3,        // Increment by 3
	 *     '+success' => 2,          // Increment by 2
	 *     '+failed' => 1,           // Increment by 1
	 *     'last_product_id' => 456, // Set to 456
	 *     'current_batch' => 5      // Set to 5
	 * ]);
	 */
    // --------------------------------------------------
	public static function set_job_meta( $id, $field, $value = null ) {
		global $wpdb;
		
		$table_name = self::get_table_name( 'jobs' );
		
		// Handle multiple fields
		if ( is_array( $field ) ) {
			$json_sets = array();
			
			foreach ( $field as $f => $val ) {
				// Check if field name starts with '+' for increment
				if ( substr( $f, 0, 1 ) === '+' ) {
					// Increment operation
					$f = substr( $f, 1 ); // Remove '+' prefix
					$f = sanitize_text_field( $f );
					$val = absint( $val );
					$json_sets[] = "'$." . $f . "', COALESCE(JSON_EXTRACT(meta, '$." . $f . "'), 0) + " . $val;
				} else {
					// Set operation
					$f = sanitize_text_field( $f );
					
					// Handle different value types
					if ( is_array( $val ) || is_object( $val ) ) {
						$val = wp_json_encode( $val, JSON_UNESCAPED_UNICODE );
						$val = "'" . esc_sql( $val ) . "'";
					} elseif ( is_numeric( $val ) ) {
						$val = absint( $val );
					} elseif ( is_string( $val ) ) {
						$val = "'" . esc_sql( $val ) . "'";
					} else {
						$val = "'" . esc_sql( (string) $val ) . "'";
					}
					
					$json_sets[] = "'$." . $f . "', " . $val;
				}
			}
			
		if ( empty( $json_sets ) ) {
			return false;
		}
		
		$sets = implode( ', ', $json_sets );
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $json_sets contains sanitized field names via sanitize_text_field() and values escaped via esc_sql() or absint(), table name is from class method.
		$result = $wpdb->query(
			$wpdb->prepare(
				"UPDATE {$table_name} 
				SET meta = JSON_SET(meta, " . $sets . ")
				WHERE id = %d",
				absint( $id )
			)
		);
		return $result !== false;
	}
	
	// Handle single field (backward compatibility)
	$field = sanitize_text_field( $field );
	
	// Convert arrays/objects to JSON
	if ( is_array( $value ) || is_object( $value ) ) {
		$value = wp_json_encode( $value, JSON_UNESCAPED_UNICODE );
		$format = '%s';
	} elseif ( is_numeric( $value ) ) {
		$format = '%d';
	} else {
		$format = '%s';
	}
	

	// Build the SQL query with the dynamic format placeholder
	// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $format is controlled placeholder (%s or %d), table name is from class method.
	$sql = "UPDATE {$table_name} SET meta = JSON_SET(meta, %s, " . $format . ") WHERE id = %d";
	
	// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $format is controlled placeholder, table name is from class method.
	$result = $wpdb->query(
		$wpdb->prepare(
			$sql,
			'$.' . $field,
			$value,
			absint( $id )
		)
	);
	
	return $result !== false;
	}






	/** MARK: INCREMENT job meta field (DEPRECATED - use set_job_meta with '+' prefix)
	 * Atomically increment a numeric field in job meta (race-condition safe)
	 * 
	 * @deprecated Use set_job_meta() with '+' prefix instead
	 * @param int $id Job ID
	 * @param string|array $field Field name or array of field=>increment pairs
	 * @param int $increment Amount to increment (default: 1, ignored if $field is array)
	 * @return bool True on success, false on failure
	 */
    // --------------------------------------------------
	public static function increment_job_meta( $id, $field, $increment = 1 ) {
		// Convert to new format
		if ( is_array( $field ) ) {
			$new_format = array();
			foreach ( $field as $f => $inc ) {
				$new_format['+' . $f] = $inc;
			}
			return self::set_job_meta( $id, $new_format );
		}
		
		return self::set_job_meta( $id, array( '+' . $field => $increment ) );
	}




	/** MARK: DELETE job
	 * Delete a job by ID
	 * 
	 * @param int $id Job ID
	 * @return bool True on success, false on failure
	 * 
	 * @example
	 * CSAI_Bulk_Records::delete_job( 123 );
	 */
    // --------------------------------------------------
	public static function delete_job( $id ) {
		global $wpdb;
		$table_name = self::get_table_name( 'jobs' );
		
		$result = $wpdb->delete(
			$table_name,
			array( 'id' => absint( $id ) ),
			array( '%d' )
		);

		return $result !== false;
	}




	/** MARK: GET single job
	 * Get a single job by ID
	 * 
	 * @param int $id Job ID
	 * @param bool $decode_json Whether to decode JSON fields (default: true)
	 * @return array|null Job array or null if not found
	 * 
	 * @example
	 * $job = CSAI_Bulk_Records::get_job( 123 );
	 * echo $job['status'];
	 * print_r( $job['meta'] ); // Already decoded as array
	 */
    // --------------------------------------------------
	public static function get_job( $id, $decode_json = true ) {
		global $wpdb;
		$table_name = self::get_table_name( 'jobs' );
		
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		$job = $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM {$table_name} WHERE id = %d",
			absint( $id )
		), ARRAY_A );

		if ( $job && $decode_json && !empty( $job['meta'] ) ) {
			$decoded = json_decode( $job['meta'], true );
			if ( json_last_error() === JSON_ERROR_NONE ) {
				$job['meta'] = $decoded;
			}
		}

		return $job;
	}




	/** MARK: GET all jobs
	 * Get all jobs with optional filters
	 * 
	 * @param array $args {
	 *     Optional. Query arguments.
	 *     @type string $status     Filter by status. Default empty (all statuses).
	 *     @type int    $limit      Maximum number of jobs to return. Default 100.
	 *     @type int    $offset     Number of jobs to skip. Default 0.
	 *     @type int    $page       Page number (1-indexed). Overrides offset if provided.
	 *     @type int    $perPage    Jobs per page. Default 20.
	 *     @type string $order      Order direction (ASC|DESC). Default 'DESC'.
	 *     @type string $order_by   Column to order by. Default 'created'.
	 * }
	 * @param bool $decode_json Whether to decode JSON fields (default: true)
	 * @return array Array of job objects
	 * 
	 * @example
	 * // Get all pending jobs
	 * $pending_jobs = CSAI_Bulk_Records::get_all_jobs(['status' => 'pending']);
	 * 
	 * // Get recent jobs with pagination
	 * $recent_jobs = CSAI_Bulk_Records::get_all_jobs([
	 *     'page' => 2,
	 *     'perPage' => 50,
	 *     'order_by' => 'updated',
	 *     'order' => 'DESC'
	 * ]);
	 */
    // --------------------------------------------------
	public static function get_all_jobs( $args = array(), $decode_json = true ) {
		global $wpdb;
		$table_name = self::get_table_name( 'jobs' );
		
		$defaults = array(
			'status' => '',
			'limit' => self::$limit,
			'offset' => 0,
			'page' => null,
			'perPage' => self::$per_page,
			'order' => 'DESC',
			'order_by' => 'created'
		);
		$args = wp_parse_args( $args, $defaults );

		// Use page-based pagination if page is provided
		if ( $args['page'] !== null && $args['page'] > 0 ) {
			$args['offset'] = ( absint( $args['page'] ) - 1 ) * absint( $args['perPage'] );
			$args['limit'] = absint( $args['perPage'] );
		}

		// Sanitize order_by to prevent SQL injection
		$allowed_order_by = array( 'id', 'status', 'created', 'updated' );
		if ( ! in_array( $args['order_by'], $allowed_order_by ) ) {
			$args['order_by'] = 'created';
		}

		// Sanitize order direction
		$args['order'] = strtoupper( $args['order'] ) === 'ASC' ? 'ASC' : 'DESC';

		// Build query
		$where = '';
		$where_params = array();
		
		if ( ! empty( $args['status'] ) ) {
			$where = 'WHERE status = %s';
			$where_params[] = sanitize_text_field( $args['status'] );
		}

	$where_params[] = absint( $args['limit'] );
	$where_params[] = absint( $args['offset'] );

	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from class, where/order_by/order are sanitized.
	$jobs = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT * FROM {$table_name} {$where} ORDER BY {$args['order_by']} {$args['order']} LIMIT %d OFFSET %d",
			...$where_params
		)
	);

	if ( $jobs && $decode_json ) {
		$jobs = array_map( array( self::class, 'decode_job_json' ), $jobs );
	}		return $jobs;
	}




	/** MARK: GET jobs by status
	 * Get jobs by status
	 * 
	 * @param string $status Job status
	 * @param bool $decode_json Whether to decode JSON fields (default: true)
	 * @param int $page Optional page number (1-indexed). If provided, pagination is enabled.
	 * @param int $perPage Optional jobs per page (default: 20)
	 * @return array Array of job objects
	 * 
	 * @example
	 * $processing_jobs = CSAI_Bulk_Records::get_jobs_by_status( 'processing' );
	 * $processing_jobs = CSAI_Bulk_Records::get_jobs_by_status( 'processing', true, 1, 50 ); // Page 1, 50 per page
	 * foreach ( $processing_jobs as $job ) {
	 *     echo $job->batch_id . ': ' . $job->meta['processed'] . ' completed';
	 * }
	 */
    // --------------------------------------------------
	public static function get_jobs_by_status( $status, $decode_json = true, $page = null, $perPage = null ) {
		if ( isset( $perPage ) === false ) {
			$perPage = self::$per_page;
		}
		global $wpdb;
		$table_name = self::get_table_name( 'jobs' );
		$status = sanitize_text_field( $status );
		
		if ( $page !== null && $page > 0 ) {
			$offset = ( absint( $page ) - 1 ) * absint( $perPage );
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
			$jobs = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT * FROM {$table_name} WHERE status = %s ORDER BY created DESC LIMIT %d OFFSET %d",
					$status,
					absint( $perPage ),
					$offset
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
			$jobs = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT * FROM {$table_name} WHERE status = %s ORDER BY created DESC",
					$status
				)
			);
		}		if ( $jobs && $decode_json ) {
				$jobs = array_map( array( self::class, 'decode_job_json' ), $jobs );
			}

			return $jobs;
		}




	/** MARK: COUNT total jobs
	 * Get total job count
	 * 
	 * @param string $status Optional. Filter by status. Default empty (all jobs).
	 * @return int Total number of jobs
	 * 
	 * @example
	 * $total = CSAI_Bulk_Records::get_total_job_count();
	 * $pending = CSAI_Bulk_Records::get_total_job_count( 'pending' );
	 * echo "Total jobs: $total, Pending: $pending";
	 */
    // --------------------------------------------------
	public static function get_total_job_count( $status = '' ) {
		global $wpdb;
		$table_name = self::get_table_name( 'jobs' );
		
		if ( ! empty( $status ) ) {
			$status = sanitize_text_field( $status );
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
			return (int) $wpdb->get_var( $wpdb->prepare(
				"SELECT COUNT(*) FROM {$table_name} WHERE status = %s",
				$status
			) );
		}
		
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is from class method.
		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table_name}" );
	}




	/** MARK: DECODE job
	 * Decode JSON fields in a job
	 * 
	 * @param object $job Job object
	 * @return object Job with decoded JSON fields
	 */
    // --------------------------------------------------
	private static function decode_job_json( $job ) {
		if ( ! empty( $job->meta ) ) {
			$decoded = json_decode( $job->meta, true );
			if ( json_last_error() === JSON_ERROR_NONE ) {
				$job->meta = $decoded;
			}
		}
		return $job;
	}



}






// MARK: AJAX







/**
 * MARK: Add Record
 * 
 * @example JavaScript:
 * // Using jQuery:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_add_bulk_record',
 *         nonce: copyspell_ai_admin.nonce,
 *         job_id: 123, // Use 0 for single product content generation
 *         product_id: 456,
 *         calldata: {prompt: 'Generate...', model: 'gpt-4'},
 *         content: {content: 'Generated...', tokens: 150}
 *     },
 *     success: function(response) {
 *         console.log('Record ID:', response.data.record_id);
 *     }
 * });
 * 
 * // Using AIH helper (fetch):
 * AIH.addRecord(123, 456, 
 *     {prompt: 'Generate...', model: 'gpt-4'}, 
 *     {content: 'Generated...', tokens: 150}
 * ).then(result => {
 *     console.log('Record ID:', result.record_id);
 * }).catch(error => {
 *     console.error('Error:', error);
 * });
 */
add_action( 'wp_ajax_csai_add_bulk_record', 'csai_ajax_add_bulk_record' );
// --------------------------------------------------
function csai_ajax_add_bulk_record() {
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$job_id = isset( $_POST['job_id'] ) ? absint( $_POST['job_id'] ) : 0;
	$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
	$context = isset( $_POST['context'] ) ? sanitize_text_field( wp_unslash( $_POST['context'] ) ) : '';
	
	// Get calldata and content without sanitization to preserve special characters
	// WordPress adds slashes, so we need to strip them
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- JSON data, sanitized by add_record() method.
	$calldata = isset( $_POST['calldata'] ) ? wp_unslash( $_POST['calldata'] ) : '';
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- JSON data, sanitized by add_record() method.
	$content = isset( $_POST['content'] ) ? wp_unslash( $_POST['content'] ) : '';

	// Validate
	if ( empty( $product_id ) ) {
		wp_send_json_error( array( 'message' => 'Missing required parameters' ), 400 );
	}
error_log( 'Adding record for job_id: ' . $job_id . ', product_id: ' . $product_id );
error_log( 'Calldata: ' . print_r( $calldata, true ) );
error_log( 'Content: ' . print_r( $content, true ) );
error_log( 'Context: ' . $context );
	// Add record
	$record_id = CSAI_Bulk_Records::add_record( $job_id, $product_id, $calldata, $content, $context );
error_log( 'Added record ID: ' . $record_id );
	if ( $record_id ) {
		wp_send_json_success( array(
			'message' => 'Record added successfully',
			'record_id' => $record_id
		) );
	} else {
		wp_send_json_error( array( 'message' => 'Failed to add record' ), 500 );
	}
}



/**
 * MARK: Update Record
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_update_bulk_record',
 *         nonce: copyspell_ai_admin.nonce,
 *         id: 123,
 *         data: {
 *             content: {content: 'Updated...', tokens: 200}
 *         }
 *     },
 *     success: function(response) {
 *         console.log('Record updated');
 *     }
 * });
 */
add_action( 'wp_ajax_csai_update_bulk_record', 'csai_ajax_update_bulk_record' );
// --------------------------------------------------
function csai_ajax_update_bulk_record() {
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}


	// Get parameters
	$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash -- JSON string, unslashed and sanitized by update_record() method after decode.
	$data = isset( $_POST['data'] ) ? wp_unslash( $_POST['data'] ) : array();

	// Decode data if it's a JSON string (from JavaScript)
	if ( is_string( $data ) ) {
		$data = stripslashes( $data );
		$decoded = json_decode( $data, true );
		if ( json_last_error() === JSON_ERROR_NONE ) {
			$data = $decoded;
		}
	}

	// Validate
	if ( empty( $id ) || empty( $data ) ) {
		wp_send_json_error( array( 'message' => 'Missing required parameters' ), 400 );
	}

	// Update record
	$result = CSAI_Bulk_Records::update_record( $id, $data );


	if ( $result ) {
		wp_send_json_success( array( 'message' => 'Record updated successfully' ) );
	} else {
		wp_send_json_error( array( 'message' => 'Failed to update record' ), 500 );
	}
}



/**
 * MARK: Update Records Batch
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_update_bulk_records_batch',
 *         nonce: copyspell_ai_admin.nonce,
 *         updates: [
 *             {id: 123, content: {updated: true}},
 *             {id: 124, content: {updated: true}}
 *         ]
 *     },
 *     success: function(response) {
 *         console.log('Records updated');
 *     }
 * });
 */
add_action( 'wp_ajax_csai_update_bulk_records_batch', 'csai_ajax_update_bulk_records_batch' );
// --------------------------------------------------
function csai_ajax_update_bulk_records_batch() {
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash -- JSON string, unslashed and sanitized by update_records_batch() method after decode.
	$updates = isset( $_POST['updates'] ) ? wp_unslash( $_POST['updates'] ) : array();

	// Decode if string
	if ( is_string( $updates ) ) {
		$updates = stripslashes( $updates );
		$decoded = json_decode( $updates, true );
		if ( json_last_error() === JSON_ERROR_NONE ) {
			$updates = $decoded;
		}
	}

	// Validate
	if ( empty( $updates ) || ! is_array( $updates ) ) {
		wp_send_json_error( array( 'message' => 'Missing or invalid updates data' ), 400 );
	}

	// Update records
	$result = CSAI_Bulk_Records::update_records_batch( $updates );

	if ( $result ) {
		wp_send_json_success( array( 'message' => 'Records updated successfully' ) );
	} else {
		wp_send_json_error( array( 'message' => 'Failed to update records' ), 500 );
	}
}


/**
 * MARK: Delete Record
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_delete_bulk_record',
 *         nonce: copyspell_ai_admin.nonce,
 *         id: 123
 *     },
 *     success: function(response) {
 *         console.log('Record deleted');
 *     }
 * });
 */
add_action( 'wp_ajax_csai_delete_bulk_record', 'csai_ajax_delete_bulk_record' );
// --------------------------------------------------
function csai_ajax_delete_bulk_record() {
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;

	// Validate
	if ( empty( $id ) ) {
		wp_send_json_error( array( 'message' => 'Missing record ID' ), 400 );
	}

	// Delete record
	$result = CSAI_Bulk_Records::delete_record( $id );

	if ( $result ) {
		wp_send_json_success( array( 'message' => 'Record deleted successfully' ) );
	} else {
		wp_send_json_error( array( 'message' => 'Failed to delete record' ), 500 );
	}
}



/**
 * MARK: Get Records by Job
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_get_bulk_records_by_job',
 *         nonce: copyspell_ai_admin.nonce,
 *         job_id: 123
 *     },
 *     success: function(response) {
 *         console.log('Records:', response.data.records);
 *     }
 * });
 */
add_action( 'wp_ajax_csai_get_bulk_records_by_job', 'csai_ajax_get_bulk_records_by_job' );
// --------------------------------------------------
function csai_ajax_get_bulk_records_by_job() {
	global $per_page;
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$job_id = isset( $_POST['job_id'] ) ? absint( $_POST['job_id'] ) : 0;
	$page = isset( $_POST['page'] ) ? absint( $_POST['page'] ) : null;
	$perPage = isset( $_POST['perPage'] ) ? absint( $_POST['perPage'] ) : $per_page;

	// Validate
	if ( empty( $job_id ) ) {
		wp_send_json_error( array( 'message' => 'Missing job ID' ), 400 );
	}

	// Get records
	$records = CSAI_Bulk_Records::get_records_by_job( $job_id, true, $page, $perPage );

	wp_send_json_success( array(
		'records' => $records,
		'count' => count( $records )
	) );
}



/**
 * MARK: Get Record IDs by Job
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_get_bulk_record_ids_by_job',
 *         nonce: copyspell_ai_admin.nonce,
 *         job_id: 123
 *     },
 *     success: function(response) {
 *         console.log('Record IDs:', response.data.ids);
 *     }
 * });
 */
add_action( 'wp_ajax_csai_get_bulk_record_ids_by_job', 'csai_ajax_get_bulk_record_ids_by_job' );
// --------------------------------------------------
function csai_ajax_get_bulk_record_ids_by_job() {
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$job_id = isset( $_POST['job_id'] ) ? absint( $_POST['job_id'] ) : 0;

	// Validate
	if ( empty( $job_id ) ) {
		wp_send_json_error( array( 'message' => 'Missing job ID' ), 400 );
	}

	// Get record IDs
	$ids = CSAI_Bulk_Records::get_record_ids_by_job( $job_id );

	wp_send_json_success( array(
		'ids' => $ids,
		'count' => count( $ids )
	) );
}



/**
 * MARK: Get Records by Product
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_get_bulk_records_by_product',
 *         nonce: copyspell_ai_admin.nonce,
 *         product_id: 456
 *     },
 *     success: function(response) {
 *         console.log('Records:', response.data.records);
 *     }
 * });
 */
add_action( 'wp_ajax_csai_get_bulk_records_by_product', 'csai_ajax_get_bulk_records_by_product' );
// --------------------------------------------------
function csai_ajax_get_bulk_records_by_product() {
	global $per_page;

	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
	$page = isset( $_POST['page'] ) ? absint( $_POST['page'] ) : null;
	$perPage = isset( $_POST['perPage'] ) ? absint( $_POST['perPage'] ) : $per_page;

	// Validate
	if ( empty( $product_id ) ) {
		wp_send_json_error( array( 'message' => 'Missing product ID' ), 400 );
	}

	// Get records
	$records = CSAI_Bulk_Records::get_records_by_product( $product_id, true, $page, $perPage );

	// Get total count for pagination (only when paginating)
	$total = ( $page !== null ) ? CSAI_Bulk_Records::get_product_record_count( $product_id ) : count( $records );

	wp_send_json_success( array(
		'records' => $records,
		'count'   => count( $records ),
		'total'   => $total
	) );
}



/**
 * MARK: Get Records by Context and Product
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_get_bulk_records_by_context_and_product',
 *         nonce: copyspell_ai_admin.nonce,
 *         context: 'bulk_generation',
 *         product_id: 456
 *     },
 *     success: function(response) {
 *         console.log('Records:', response.data.records);
 *     }
 * });
 */
add_action( 'wp_ajax_csai_get_bulk_records_by_context_and_product', 'csai_ajax_get_bulk_records_by_context_and_product' );
// --------------------------------------------------
function csai_ajax_get_bulk_records_by_context_and_product() {
	global $per_page;

	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$context = isset( $_POST['context'] ) ? sanitize_text_field( wp_unslash( $_POST['context'] ) ) : '';
	$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
	$page = isset( $_POST['page'] ) ? absint( $_POST['page'] ) : null;
	$perPage = isset( $_POST['perPage'] ) ? absint( $_POST['perPage'] ) : $per_page;

	// Validate
	if ( empty( $product_id ) ) {
		wp_send_json_error( array( 'message' => 'Missing product ID' ), 400 );
	}

	// Get records
	$records = CSAI_Bulk_Records::get_records_by_context_and_product( $context, $product_id, true, $page, $perPage );

	// Get total count for pagination (only when paginating)
	$total = ( $page !== null ) ? CSAI_Bulk_Records::get_context_product_record_count( $context, $product_id ) : count( $records );

	wp_send_json_success( array(
		'records' => $records,
		'count'   => count( $records ),
		'total'   => $total
	) );
}



/**
 * MARK: Delete Records by Job
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_delete_bulk_records_by_job',
 *         nonce: copyspell_ai_admin.nonce,
 *         job_id: 123
 *     },
 *     success: function(response) {
 *         console.log('Job records deleted');
 *     }
 * });
 */
add_action( 'wp_ajax_csai_delete_bulk_records_by_job', 'csai_ajax_delete_bulk_records_by_job' );
// --------------------------------------------------
function csai_ajax_delete_bulk_records_by_job() {
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$job_id = isset( $_POST['job_id'] ) ? absint( $_POST['job_id'] ) : 0;

	// Validate
	if ( empty( $job_id ) ) {
		wp_send_json_error( array( 'message' => 'Missing job ID' ), 400 );
	}

	// Delete records
	$result = CSAI_Bulk_Records::delete_records_by_job( $job_id );

	if ( $result ) {
		wp_send_json_success( array( 'message' => 'Job records deleted successfully' ) );
	} else {
		wp_send_json_error( array( 'message' => 'Failed to delete job records' ), 500 );
	}
}




// ========================================
// JOBS AJAX HANDLERS
// ========================================




/**
 * MARK: Add Job
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_add_bulk_job',
 *         nonce: copyspell_ai_admin.nonce,
 *         status: 'pending',
 *         meta: {
 *             total_products: 50,
 *             processed: 0,
 *             settings: {model: 'gpt-4', temperature: 0.7}
 *         }
 *     },
 *     success: function(response) {
 *         console.log('Job ID:', response.data.job_id);
 *     }
 * });
 */
add_action( 'wp_ajax_csai_add_bulk_job', 'csai_ajax_add_bulk_job' );
// --------------------------------------------------
function csai_ajax_add_bulk_job() {
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$status = isset( $_POST['status'] ) ? sanitize_text_field( wp_unslash( $_POST['status'] ) ) : 'pending';
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash -- JSON string, unslashed and sanitized by add_job() method after decode.
	$meta = isset( $_POST['meta'] ) ? wp_unslash( $_POST['meta'] ) : array();
	
	// Decode meta if it's a JSON string (from JavaScript)
	if ( is_string( $meta ) ) {
		// Strip slashes that WordPress adds
		$meta = stripslashes( $meta );
		$decoded = json_decode( $meta, true );
		if ( json_last_error() === JSON_ERROR_NONE ) {
			$meta = $decoded;
		}
	}

	// Add job
	$job_id = CSAI_Bulk_Records::add_job( $status, $meta );

	if ( $job_id ) {
		wp_send_json_success( array(
			'message' => 'Job added successfully',
			'job_id' => $job_id
		) );
	} else {
		wp_send_json_error( array( 'message' => 'Failed to add job' ), 500 );
	}
}



/**
 * MARK: Update Job
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_update_bulk_job',
 *         nonce: copyspell_ai_admin.nonce,
 *         id: 123,
 *         data: {
 *             status: 'processing',
 *             meta: {processed: 25, total_products: 50}
 *         }
 *     },
 *     success: function(response) {
 *         console.log('Job updated');
 *     }
 * });
 */
add_action( 'wp_ajax_csai_update_bulk_job', 'csai_ajax_update_bulk_job' );
// --------------------------------------------------
function csai_ajax_update_bulk_job() {
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash -- JSON string, unslashed and sanitized by update_job() method after decode.
	$data = isset( $_POST['data'] ) ? wp_unslash( $_POST['data'] ) : array();
	
	// Decode data if it's a JSON string (from JavaScript)
	if ( is_string( $data ) ) {
		$data = stripslashes( $data );
		$decoded = json_decode( $data, true );
		if ( json_last_error() === JSON_ERROR_NONE ) {
			$data = $decoded;
		}
	}
	
	// Decode meta within data if it's a JSON string
	if ( isset( $data['meta'] ) && is_string( $data['meta'] ) ) {
		$data['meta'] = stripslashes( $data['meta'] );
		$decoded = json_decode( $data['meta'], true );
		if ( json_last_error() === JSON_ERROR_NONE ) {
			$data['meta'] = $decoded;
		}
	}

	// Validate
	if ( empty( $id ) || empty( $data ) ) {
		wp_send_json_error( array( 'message' => 'Missing required parameters' ), 400 );
	}

	// Update job
	$result = CSAI_Bulk_Records::update_job( $id, $data );

	if ( $result ) {
		wp_send_json_success( array( 'message' => 'Job updated successfully' ) );
	} else {
		wp_send_json_error( array( 'message' => 'Failed to update job' ), 500 );
	}
}



/**
 * MARK: Delete Job
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_delete_bulk_job',
 *         nonce: copyspell_ai_admin.nonce,
 *         id: 123
 *     },
 *     success: function(response) {
 *         console.log('Job deleted');
 *     }
 * });
 */
add_action( 'wp_ajax_csai_delete_bulk_job', 'csai_ajax_delete_bulk_job' );
// --------------------------------------------------
function csai_ajax_delete_bulk_job() {
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;

	// Validate
	if ( empty( $id ) ) {
		wp_send_json_error( array( 'message' => 'Missing job ID' ), 400 );
	}

	// Delete job
	$result = CSAI_Bulk_Records::delete_job( $id );

	if ( $result ) {
		wp_send_json_success( array( 'message' => 'Job deleted successfully' ) );
	} else {
		wp_send_json_error( array( 'message' => 'Failed to delete job' ), 500 );
	}
}



/**
 * MARK: Get Job
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_get_bulk_job',
 *         nonce: copyspell_ai_admin.nonce,
 *         id: 123
 *     },
 *     success: function(response) {
 *         console.log('Job:', response.data.job);
 *     }
 * });
 */
add_action( 'wp_ajax_csai_get_bulk_job', 'csai_ajax_get_bulk_job' );
// --------------------------------------------------
function csai_ajax_get_bulk_job() {
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;

	// Validate
	if ( empty( $id ) ) {
		wp_send_json_error( array( 'message' => 'Missing job ID' ), 400 );
	}

	// Get job
	$job = CSAI_Bulk_Records::get_job( $id );

	if ( $job ) {
		wp_send_json_success( array( 'job' => $job ) );
	} else {
		wp_send_json_error( array( 'message' => 'Job not found' ), 404 );
	}
}



/**
 * MARK: Get All Jobs
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_get_all_bulk_jobs',
 *         nonce: copyspell_ai_admin.nonce,
 *         status: 'pending', // Optional
 *         limit: 50,         // Optional
 *         offset: 0          // Optional
 *     },
 *     success: function(response) {
 *         console.log('Jobs:', response.data.jobs);
 *         console.log('Count:', response.data.count);
 *     }
 * });
 */
add_action( 'wp_ajax_csai_get_all_bulk_jobs', 'csai_ajax_get_all_bulk_jobs' );
// --------------------------------------------------
function csai_ajax_get_all_bulk_jobs() {
	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$args = array();
	if ( isset( $_POST['status'] ) && ! empty( $_POST['status'] ) ) {
		$args['status'] = sanitize_text_field( wp_unslash( $_POST['status'] ) );
	}
	if ( isset( $_POST['page'] ) ) {
		$args['page'] = absint( $_POST['page'] );
	}
	if ( isset( $_POST['perPage'] ) ) {
		$args['perPage'] = absint( $_POST['perPage'] );
	}
	if ( isset( $_POST['limit'] ) ) {
		$args['limit'] = absint( $_POST['limit'] );
	}
	if ( isset( $_POST['offset'] ) ) {
		$args['offset'] = absint( $_POST['offset'] );
	}
	if ( isset( $_POST['order'] ) ) {
		$args['order'] = sanitize_text_field( wp_unslash( $_POST['order'] ) );
	}
	if ( isset( $_POST['order_by'] ) ) {
		$args['order_by'] = sanitize_text_field( wp_unslash( $_POST['order_by'] ) );
	}

	// Get jobs
	$jobs = CSAI_Bulk_Records::get_all_jobs( $args );

	wp_send_json_success( array(
		'jobs' => $jobs,
		'count' => count( $jobs )
	) );
}



/**
 * MARK: Get Jobs by Status
 * 
 * @example JavaScript:
 * jQuery.ajax({
 *     url: ajaxurl,
 *     method: 'POST',
 *     data: {
 *         action: 'csai_get_bulk_jobs_by_status',
 *         nonce: copyspell_ai_admin.nonce,
 *         status: 'processing'
 *     },
 *     success: function(response) {
 *         console.log('Jobs:', response.data.jobs);
 *     }
 * });
 */
add_action( 'wp_ajax_csai_get_bulk_jobs_by_status', 'csai_ajax_get_bulk_jobs_by_status' );
// --------------------------------------------------
function csai_ajax_get_bulk_jobs_by_status() {
	global $per_page;

	// Verify nonce
	if ( ! check_ajax_referer( 'copyspell_ai_admin_nonce', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
	}

	// Check capabilities
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
	}

	// Get parameters
	$status = isset( $_POST['status'] ) ? sanitize_text_field( wp_unslash( $_POST['status'] ) ) : '';
	$page = isset( $_POST['page'] ) ? absint( $_POST['page'] ) : null;
	$perPage = isset( $_POST['perPage'] ) ? absint( $_POST['perPage'] ) : $per_page;

	// Validate
	if ( empty( $status ) ) {
		wp_send_json_error( array( 'message' => 'Missing status' ), 400 );
	}

	// Get jobs
	$jobs = CSAI_Bulk_Records::get_jobs_by_status( $status, true, $page, $perPage );

	wp_send_json_success( array(
		'jobs' => $jobs,
		'count' => count( $jobs )
	) );
}




