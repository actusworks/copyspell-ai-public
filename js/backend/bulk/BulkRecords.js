import log from '../../shared/Log.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DATA = window.copyspell_ai_admin || {};
const { __, _x, _n, sprintf } = wp.i18n;








// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: BULK RECORDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * BulkRecords - Database operations for bulk AI generation records
 * 
 * Provides a JavaScript interface to the WordPress database table for storing
 * bulk generation records via AJAX handlers in class-aai-bulk-records.php
 * 
 * @example
 * const records = new BulkRecords();
 * 
 * // Add a new record
 * const recordId = await records.add({
 *     job_id: 123,
 *     product_id: 456,
 *     calldata: { prompt: 'Generate...', model: 'gpt-4' },
 *     response: { content: 'Generated...', tokens: 150 },
 *     original: { title: 'Original title', description: 'Original desc' }
 * });
 * 
 * // Get records by job
 * const jobRecords = await records.getByJob(123);
 * 
 * // Delete a job's records
 * await records.deleteByJob(123);
 */
// ────────────────────────────────────
export default class BulkRecords {


	// MARK: Constructor
	// ────────────────────────────────────
	constructor() {
		this.ajaxUrl = DATA.ajax_url || '/wp-admin/admin-ajax.php';
		this.nonce = DATA.nonce;
	}




	// MARK: Add Record
	// ────────────────────────────────────
	/**
	 * Add a new bulk record to the database
	 * 
	 * @param {Object} params - Record parameters
	 * @param {number} params.job_id - Job ID
	 * @param {number} params.product_id - Product ID
	 * @param {Object|string} params.calldata - Call data (will be JSON encoded if object)
	 * @param {Object|string} params.response - Response data (will be JSON encoded if object)
	 * @param {Object|string} [params.original=''] - Original data (will be JSON encoded if object)
	 * @param {string} [params.context=''] - Context identifier (e.g., 'bulk_generation', 'single_product')
	 * @returns {Promise<number|null>} Record ID on success, null on failure
	 * 
	 * @example
	 * const recordId = await records.add({
	 *     job_id: 123,
	 *     product_id: 456,
	 *     calldata: { prompt: 'Generate content', model: 'gpt-4' },
	 *     response: { content: 'Generated text', tokens: 150 },
	 *     original: { title: 'Original title', description: 'Original desc' },
	 *     context: 'bulk_generation'
	 * });
	 */
	async add({ job_id, product_id, calldata, response, original = '', context = 'product' }) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_add_bulk_record');
			formData.append('nonce', this.nonce);
			formData.append('job_id', job_id);
			formData.append('product_id', product_id);
			formData.append('context', context);

			// Handle call data
			if (typeof calldata === 'object') {
				formData.append('calldata', JSON.stringify(calldata));
			} else {
				formData.append('calldata', calldata);
			}

			// Handle response data
			if (typeof response === 'object') {
				formData.append('response', JSON.stringify(response));
			} else {
				formData.append('response', response);
			}

			// Handle original data
			if (typeof original === 'object') {
				formData.append('original', JSON.stringify(original));
			} else {
				formData.append('original', original);
			}

			const result = await this._fetch(formData);

			if (result.success) {
				log(`Record added: ID ${result.data.record_id}`);
				return result.data.record_id;
			} else {
				return this._error(result.data?.message || 'Failed to add record');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Update Record
	// ────────────────────────────────────
	/**
	 * Update an existing record
	 * 
	 * @param {number} id - Record ID
	 * @param {Object} data - Data to update
	 * @param {string} [data.context] - Updated context identifier
	 * @param {number} [data.job_id] - New job ID
	 * @param {number} [data.product_id] - New product ID
	 * @param {Object|string} [data.calldata] - Updated call data
	 * @param {Object|string} [data.response] - Updated response data
	 * @param {Object|string} [data.original] - Updated original data
	 * @returns {Promise<boolean>} True on success, false on failure
	 * 
	 * @example
	 * await records.update(123, {
	 *     response: { content: 'Updated content', tokens: 200 },
	 *     context: 'updated_context'
	 * });
	 */
	async update(id, data) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_update_bulk_record');
			formData.append('nonce', this.nonce);
			formData.append('id', id);

			// Convert data object to match PHP expectations
			const updateData = {};
			if (data.context !== undefined) updateData.context = data.context;
			if (data.job_id !== undefined) updateData.job_id = data.job_id;
			if (data.product_id !== undefined) updateData.product_id = data.product_id;
			if (data.calldata !== undefined) {
				updateData.calldata = typeof data.calldata === 'object' ? JSON.stringify(data.calldata) : data.calldata;
			}
			if (data.response !== undefined) {
				updateData.response = typeof data.response === 'object' ? JSON.stringify(data.response) : data.response;
			}
			if (data.original !== undefined) {
				updateData.original = typeof data.original === 'object' ? JSON.stringify(data.original) : data.original;
			}


			formData.append('data', JSON.stringify(updateData));

			const result = await this._fetch(formData);

			if (result.success) {
				log('Record updated');
				return true;
			} else {
				return this._error(result.data?.message || 'Failed to update record');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Batch Update Records
	// ────────────────────────────────────
	/**
	 * Update multiple records at once
	 * 
	 * @param {Array} updates - Array of update objects {id, ...data}
	 * @returns {Promise<boolean>} True on success, false on failure
	 */
	async batchUpdate(updates) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_update_bulk_records_batch');
			formData.append('nonce', this.nonce);

			// Prepare updates for JSON encoding
			const preparedUpdates = updates.map(update => {
				const data = { ...update };
				if (data.calldata && typeof data.calldata === 'object') data.calldata = JSON.stringify(data.calldata);
				if (data.response && typeof data.response === 'object') data.response = JSON.stringify(data.response);
				if (data.original && typeof data.original === 'object') data.original = JSON.stringify(data.original);
				if (data.context !== undefined) data.context = data.context;
				return data;
			});

			formData.append('updates', JSON.stringify(preparedUpdates));

			const result = await this._fetch(formData);

			if (result.success) {
				log('Records batch updated');
				return true;
			} else {
				return this._error(result.data?.message || 'Failed to batch update records');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Delete Record
	// ────────────────────────────────────
	/**
	 * Delete a record by ID
	 * 
	 * @param {number} id - Record ID
	 * @returns {Promise<boolean>} True on success, false on failure
	 * 
	 * @example
	 * await records.delete(123);
	 */
	async delete(id) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_delete_bulk_record');
			formData.append('nonce', this.nonce);
			formData.append('id', id);

			const result = await this._fetch(formData);

			if (result.success) {
				log('Record deleted');
				return true;
			} else {
				return this._error(result.data?.message || 'Failed to delete record');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Get Records by Job
	// ────────────────────────────────────
	/**
	 * Get all records for a specific job
	 * 
	 * @param {number} job_id - Job ID
	 * @param {number} [page] - Optional page number (1-indexed). If provided, pagination is enabled.
	 * @param {number} [perPage=20] - Optional records per page
	 * @returns {Promise<Array|null>} Array of record objects or null on failure
	 * 
	 * @example
	 * const records = await bulkRecords.getByJob(123);
	 * const page2 = await bulkRecords.getByJob(123, 2, 50); // Page 2, 50 per page
	 * records.forEach(record => {
	 *     console.log(record.product_id, record.response.content);
	 * });
	 */
	async getByJob(job_id, page = null, perPage) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_get_bulk_records_by_job');
			formData.append('nonce', this.nonce);
			formData.append('job_id', job_id);

			if (page !== null && page > 0) {
				formData.append('page', page);
				formData.append('perPage', perPage);
			}

			const result = await this._fetch(formData);

			if (result.success) {
				//log(`Retrieved ${result.data.count} records for job ${job_id}`);
				return result.data.records;
			} else {
				return this._error(result.data?.message || 'Failed to get records');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Get Records by Product
	// ────────────────────────────────────
	/**
	 * Get all records for a specific product
	 * 
	 * @param {number} product_id - Product ID
	 * @param {number} [page] - Optional page number (1-indexed). If provided, pagination is enabled.
	 * @param {number} [perPage=20] - Optional records per page
	 * @returns {Promise<Array|null>} Array of record objects or null on failure
	 * 
	 * @example
	 * const records = await bulkRecords.getByProduct(456);
	 * const page1 = await bulkRecords.getByProduct(456, 1, 50); // Page 1, 50 per page
	 * records.forEach(record => {
	 *     console.log(record.job_id, record.created);
	 * });
	 */
	async getByProduct(product_id, page = null, perPage) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_get_bulk_records_by_product');
			formData.append('nonce', this.nonce);
			formData.append('product_id', product_id);

			if (page !== null && page > 0) {
				formData.append('page', page);
				formData.append('perPage', perPage);
			}

			const result = await this._fetch(formData);

			if (result.success) {
				//log(`Retrieved ${result.data.count} records for product ${product_id}`);
				return result.data.records;
			} else {
				return this._error(result.data?.message || 'Failed to get records');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Get Records by Context and Product
	// ────────────────────────────────────
	/**
	 * Get all records for a specific context and product
	 * 
	 * @param {string} context - Context identifier
	 * @param {number} product_id - Product ID
	 * @param {number} [page] - Optional page number (1-indexed). If provided, pagination is enabled.
	 * @param {number} [perPage=20] - Optional records per page
	 * @returns {Promise<Array|null>} Array of record objects or null on failure
	 * 
	 * @example
	 * const records = await bulkRecords.getByContextAndProduct('bulk_generation', 456);
	 * const page1 = await bulkRecords.getByContextAndProduct('single_product', 456, 1, 50);
	 * records.forEach(record => {
	 *     console.log(record.context, record.created);
	 * });
	 */
	async getByContextAndProduct(context, product_id, page = null, perPage) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_get_bulk_records_by_context_and_product');
			formData.append('nonce', this.nonce);
			formData.append('context', context);
			formData.append('product_id', product_id);

			if (page !== null && page > 0) {
				formData.append('page', page);
				formData.append('perPage', perPage);
			}

			const result = await this._fetch(formData);

			if (result.success) {
				//log(`Retrieved ${result.data.count} records for context '${context}' and product ${product_id}`);
				return result.data.records;
			} else {
				return this._error(result.data?.message || 'Failed to get records');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Get Record IDs by Job
	// ────────────────────────────────────
	/**
	 * Get all record IDs for a specific job
	 *
	 * @param {number} jobId - Job ID
	 * @returns {Promise<Array<number>|null>} Array of record IDs or null on failure
	 * 
	 * @example
	 * const recordIds = await bulkRecords.getRecordIdsByJob(123);
	 * console.log(`Job has ${recordIds.length} records`);
	 * // [1, 5, 8, 12, 15, ...]
	 */
	async getRecordIdsByJob(jobId) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_get_bulk_record_ids_by_job');
			formData.append('nonce', this.nonce);
			formData.append('job_id', jobId);

			const result = await this._fetch(formData);

			if (result.success) {
				//log(`Retrieved ${result.data.ids.length} record IDs for job ${jobId}`);
				return result.data.ids;
			} else {
				return this._error(result.data?.message || 'Failed to get record IDs');
			}
		} catch (error) {
			return this._error(error);
		}
	}





	// MARK: Delete Records by Job
	// ────────────────────────────────────
	/**
	 * Delete all records for a specific job
	 * 
	 * @param {number} job_id - Job ID
	 * @returns {Promise<boolean>} True on success, false on failure
	 * 
	 * @example
	 * await records.deleteByJob(123);
	 */
	async deleteByJob(job_id) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_delete_bulk_records_by_job');
			formData.append('nonce', this.nonce);
			formData.append('job_id', job_id);

			const result = await this._fetch(formData);

			if (result.success) {
				log(`Job ${job_id} records deleted`);
				return true;
			} else {
				return this._error(result.data?.message || 'Failed to delete job records');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Fetch Helper
	// ────────────────────────────────────
	/**
	 * Internal fetch helper
	 * @private
	 */
	async _fetch(formData) {
		const response = await fetch(this.ajaxUrl, {
			method: 'POST',
			body: formData
		});

		return await response.json();
	}




	// MARK: Error Handler
	// ────────────────────────────────────
	/**
	 * Internal error handler
	 * @private
	 */
	_error(error) {
		const message = error?.message || error || 'Database operation failed';
		log('BulkRecords: ' + message);
		return null;
	}


}

