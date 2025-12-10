import log from '../../shared/Log.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DATA = window.copyspell_ai_admin || {};
const { __, _x, _n, sprintf } = wp.i18n;







// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: BULK JOBS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * BulkJobs - Database operations for bulk AI generation jobs
 * 
 * Provides a JavaScript interface to the WordPress database table for managing
 * bulk generation jobs via AJAX handlers in class-aai-bulk-records.php
 * 
 * @example
 * const jobs = new BulkJobs();
 * 
 * // Add a new job
 * const jobId = await jobs.add({
 *     batch_id: 'batch_123',
 *     status: 'pending',
 *     meta: { total_products: 50, processed: 0, settings: { model: 'gpt-4' } }
 * });
 * 
 * // Get job by batch
 * const job = await jobs.getByBatch('batch_123');
 * 
 * // Update job status
 * await jobs.update(jobId, { status: 'completed' });
 * 
 * // Delete a job
 * await jobs.deleteByBatch('batch_123');
 */
// ────────────────────────────────────
export default class BulkJobs {
	

	// MARK: Constructor
	// ────────────────────────────────────
	constructor() {
		this.ajaxUrl = DATA.ajax_url || '/wp-admin/admin-ajax.php';
		this.nonce = DATA.nonce;
	}




	// MARK: Add Job
	// ────────────────────────────────────
	/**
	 * Add a new bulk job to the database
	 * 
	 * @param {Object} params - Job parameters
	 * @param {string} params.batch_id - Batch identifier
	 * @param {string} params.status - Job status (e.g., 'pending', 'processing', 'completed', 'failed')
	 * @param {Object|string} params.meta - Job metadata (will be JSON encoded if object)
	 * @returns {Promise<number|null>} Job ID on success, null on failure
	 * 
	 * @example
	 * const jobId = await jobs.add({
	 *     batch_id: 'batch_123',
	 *     status: 'pending',
	 *     meta: { 
	 *         total_products: 50, 
	 *         processed: 0,
	 *         settings: { model: 'gpt-4', temperature: 0.7 }
	 *     }
	 * });
	 */
	async add({ status = 'pending', meta = {} }) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_add_bulk_job');
			formData.append('nonce', this.nonce);
			formData.append('status', status);
			
			// Handle meta data
			if (typeof meta === 'object') {
				formData.append('meta', JSON.stringify(meta));
			} else {
				formData.append('meta', meta);
			}

			const result = await this._fetch(formData);
			
			if (result.success) {
				//log(`Job added: ID ${result.data.job_id}`);
				return result.data.job_id;
			} else {
				return this._error(result.data?.message || 'Failed to add job');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Update Job
	// ────────────────────────────────────
	/**
	 * Update an existing job
	 * 
	 * @param {number} id - Job ID
	 * @param {Object} data - Data to update
	 * @param {string} [data.batch_id] - New batch ID
	 * @param {string} [data.status] - New status
	 * @param {Object|string} [data.meta] - Updated metadata
	 * @returns {Promise<boolean>} True on success, false on failure
	 * 
	 * @example
	 * await jobs.update(123, {
	 *     status: 'processing',
	 *     meta: { processed: 25, total_products: 50 }
	 * });
	 */
	async update(id, data) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_update_bulk_job');
			formData.append('nonce', this.nonce);
			formData.append('id', id);
			
			// Convert data object to match PHP expectations
			const updateData = {};
			if (data.batch_id !== undefined) updateData.batch_id = data.batch_id;
			if (data.status !== undefined) updateData.status = data.status;
			if (data.meta !== undefined) {
				updateData.meta = typeof data.meta === 'object' ? JSON.stringify(data.meta) : data.meta;
			}
			
			formData.append('data', JSON.stringify(updateData));

			const result = await this._fetch(formData);
			
			if (result.success) {
				log('Job updated');
				return true;
			} else {
				return this._error(result.data?.message || 'Failed to update job');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Update Job by Batch
	// ────────────────────────────────────
	/**
	 * Update a job by batch ID
	 * 
	 * @param {string} batch_id - Batch identifier
	 * @param {Object} data - Data to update
	 * @param {string} [data.status] - New status
	 * @param {Object|string} [data.meta] - Updated metadata
	 * @returns {Promise<boolean>} True on success, false on failure
	 * 
	 * @example
	 * await jobs.updateByBatch('batch_123', {
	 *     status: 'completed',
	 *     meta: { processed: 50, total_products: 50, success: true }
	 * });
	 */
	async updateByBatch(batch_id, data) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_update_bulk_job_by_batch');
			formData.append('nonce', this.nonce);
			formData.append('batch_id', batch_id);
			
			// Convert data object to match PHP expectations
			const updateData = {};
			if (data.status !== undefined) updateData.status = data.status;
			if (data.meta !== undefined) {
				updateData.meta = typeof data.meta === 'object' ? JSON.stringify(data.meta) : data.meta;
			}
			
			formData.append('data', JSON.stringify(updateData));

			const result = await this._fetch(formData);
			
			if (result.success) {
				log('Job updated by batch');
				return true;
			} else {
				return this._error(result.data?.message || 'Failed to update job');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Delete Job
	// ────────────────────────────────────
	/**
	 * Delete a job by ID
	 * 
	 * @param {number} id - Job ID
	 * @returns {Promise<boolean>} True on success, false on failure
	 * 
	 * @example
	 * await jobs.delete(123);
	 */
	async delete(id) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_delete_bulk_job');
			formData.append('nonce', this.nonce);
			formData.append('id', id);

			const result = await this._fetch(formData);
			
			if (result.success) {
				log('Job deleted');
				return true;
			} else {
				return this._error(result.data?.message || 'Failed to delete job');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Get Job
	// ────────────────────────────────────
	/**
	 * Get a job by ID
	 * 
	 * @param {number} id - Job ID
	 * @returns {Promise<Object|null>} Job object or null on failure
	 * 
	 * @example
	 * const job = await jobs.get(123);
	 * if (job) {
	 *     console.log(job.status, job.meta.processed);
	 * }
	 */
	async get(id) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_get_bulk_job');
			formData.append('nonce', this.nonce);
			formData.append('id', id);

			const result = await this._fetch(formData);
			
			if (result.success) {
				log(`Retrieved job ${id}`);
				return result.data.job;
			} else {
				return this._error(result.data?.message || 'Failed to get job');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Get Job by Batch
	// ────────────────────────────────────
	/**
	 * Get job for a specific batch
	 * 
	 * @param {string} batch_id - Batch identifier
	 * @returns {Promise<Object|null>} Job object or null on failure
	 * 
	 * @example
	 * const job = await jobs.getByBatch('batch_123');
	 * if (job) {
	 *     console.log(job.status, job.meta);
	 * }
	 */
	async getByBatch(batch_id) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_get_bulk_job_by_batch');
			formData.append('nonce', this.nonce);
			formData.append('batch_id', batch_id);

			const result = await this._fetch(formData);
			
			if (result.success) {
				log(`Retrieved job for batch ${batch_id}`);
				return result.data.job;
			} else {
				return this._error(result.data?.message || 'Failed to get job');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Get All Jobs
	// ────────────────────────────────────
	/**
	 * Get all jobs with optional filtering
	 * 
	 * @param {Object} [options] - Query options
	 * @param {string} [options.status] - Filter by status
	 * @param {number} [options.limit=100] - Maximum number of jobs to return
	 * @param {number} [options.offset=0] - Number of jobs to skip
	 * @param {string} [options.order='DESC'] - Order direction (ASC|DESC)
	 * @param {string} [options.order_by='created'] - Column to order by
	 * @returns {Promise<Array|null>} Array of job objects or null on failure
	 * 
	 * @example
	 * // Get all pending jobs
	 * const pendingJobs = await jobs.getAll({ status: 'pending' });
	 * 
	 * // Get recent jobs
	 * const recentJobs = await jobs.getAll({ 
	 *     limit: 20, 
	 *     order_by: 'updated', 
	 *     order: 'DESC' 
	 * });
	 */
	async getAll(options = {}) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_get_all_bulk_jobs');
			formData.append('nonce', this.nonce);
			
			if (options.status) formData.append('status', options.status || '');
			// Always send limit - default to 1000 if not specified
			formData.append('limit', options.limit !== undefined ? options.limit : 1000);
			if (options.offset !== undefined) formData.append('offset', options.offset || 0);
			if (options.order) formData.append('order', options.order || 'DESC');
			if (options.order_by) formData.append('order_by', options.order_by || 'updated');

			const result = await this._fetch(formData);

			//console.log('result:', result);
			
			if (result.success) {
				//log(`Retrieved ${result.data.count} jobs`);
				return result.data.jobs;
			} else {
				return this._error(result.data?.message || 'Failed to get jobs');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Get Jobs by Status
	// ────────────────────────────────────
	/**
	 * Get all jobs with a specific status
	 * 
	 * @param {string} status - Job status
	 * @returns {Promise<Array|null>} Array of job objects or null on failure
	 * 
	 * @example
	 * const processingJobs = await jobs.getByStatus('processing');
	 * processingJobs.forEach(job => {
	 *     console.log(job.batch_id, job.meta.processed);
	 * });
	 */
	async getByStatus(status) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_get_bulk_jobs_by_status');
			formData.append('nonce', this.nonce);
			formData.append('status', status);

			const result = await this._fetch(formData);
			
			if (result.success) {
				log(`Retrieved ${result.data.count} jobs with status: ${status}`);
				return result.data.jobs;
			} else {
				return this._error(result.data?.message || 'Failed to get jobs');
			}
		} catch (error) {
			return this._error(error);
		}
	}




	// MARK: Delete Job by Batch
	// ────────────────────────────────────
	/**
	 * Delete job for a specific batch
	 * 
	 * @param {string} batch_id - Batch identifier
	 * @returns {Promise<boolean>} True on success, false on failure
	 * 
	 * @example
	 * await jobs.deleteByBatch('batch_123');
	 */
	async deleteByBatch(batch_id) {
		try {
			const formData = new FormData();
			formData.append('action', 'csai_delete_bulk_job_by_batch');
			formData.append('nonce', this.nonce);
			formData.append('batch_id', batch_id);

			const result = await this._fetch(formData);
			
			if (result.success) {
				log(`Job for batch ${batch_id} deleted`);
				return true;
			} else {
				return this._error(result.data?.message || 'Failed to delete job');
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
		log('BulkJobs Error: ' + message);
		return null;
	}


}

