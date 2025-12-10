import _log	 				from "../Log.js";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}
let OPT = DATA.options;








const AIH = {}



AIH.LOCAL = {
	get: (key) => {
		return JSON.parse(localStorage.getItem(key));
	},
	set: (key, value) => {
		if ( ! Array.isArray(value) && typeof value !== 'object' ) {
			value = [ value ];
		}
		localStorage.setItem(key, JSON.stringify(value));
	},
}







// MARK: Valid Providers
// -----------------------------------------------------
AIH.validProviders = ( providers = OPT.api ) => {
	let validProviders = [];
	let keys = Object.keys( providers || {} );
	keys.forEach(provider => {
		if (providers[provider]?.status == 'valid') {
			validProviders.push(provider);
		}
	});
	return validProviders;

}












// MARK: File Object from URL
// ────────────────────────────────────
AIH.fileFromUrl = async ( url ) => {
	let mime = getMimeType( url )
	let fname = url.split('/').pop()

	const buff = await AIH.arrayBufferFromUrl( url );
	const uint8 = new Uint8Array(buff);
	const blobFile = new window.File([uint8], fname, { type: mime });
	return blobFile;

}





// MARK: Array Buffer from URL
// ────────────────────────────────────
AIH.arrayBufferFromUrl = async ( url ) => {

	let arrayBuff = await $.ajax({
		//url: VAL.SERVER_URL + 'media/fetch-url',
		xhrFields: {
			withCredentials: true
		},
		type: 'GET',
		data: { url },
		processData: true,
		contentType: false,
		dataType: 'binary', 
		success: (res)=> {
			//console.log('success:', res);
		},
		error: (xhr, status, error) => {
			_log('❌ error:', status, error);
			return { error: status, message: error }
		},
		xhr: function () {
			let xhr = new XMLHttpRequest();
			xhr.responseType = 'arraybuffer'; // 👈 important!
			return xhr;
		}
	});

	return arrayBuff;



}



// MARK: Array Buffer to Base64
// ────────────────────────────────────
AIH.arrayBufferToBase64 = ( buffer ) => {
	const bytes = new Uint8Array( buffer );
	const binary = bytes.reduce((str, byte) => str + String.fromCharCode(byte), '');
	return btoa( binary );
}






// MARK: Add Record
// ────────────────────────────────────
/**
 * Add a bulk record via AJAX
 * @param {number} jobId - Job ID (use 0 for single product content generation)
 * @param {number} productId - Product ID
 * @param {object|string} calldata - Call data (will be JSON encoded if object)
 * @param {object|string} content - Generated content data (will be JSON encoded if object)
 * @param {string} [context=''] - Context identifier (e.g., 'bulk_generation', 'single_product')
 * @returns {Promise<{record_id: number, message: string}>}
 * 
 * @example
 * // Add record for a batch job
 * AIH.addRecord(123, 456, 
 *     {prompt: 'Generate...', model: 'gpt-4'}, 
 *     {content: 'Generated...', tokens: 150},
 *     'bulk_generation'
 * ).then(result => {
 *     console.log('Record ID:', result.record_id);
 * });
 * 
 * // Add record for single product generation
 * AIH.addRecord(0, 456, 
 *     {prompt: 'Generate...'}, 
 *     {content: 'Generated...'},
 *     'single_product'
 * );
 */
AIH.addRecord = async (jobId, productId, calldata, content, context = 'product') => {
	// Prepare form data - send as raw objects, PHP will handle JSON encoding
	const formData = new FormData();
	formData.append('action', 'csai_add_bulk_record');
	formData.append('nonce', DATA.nonce);
	formData.append('job_id', jobId);
	formData.append('product_id', productId);
	formData.append('context', context);
	
	// Send calldata - if object, send as JSON string
	if (typeof calldata === 'object' && calldata !== null) {
		formData.append('calldata', JSON.stringify(calldata));
	} else {
		formData.append('calldata', calldata || '');
	}
	
	// Send content - if object, send as JSON string
	if (typeof content === 'object' && content !== null) {
		formData.append('content', JSON.stringify(content));
	} else {
		formData.append('content', content || '');
	}

	try {
		const response = await fetch(DATA.ajax_url, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		});

		const result = await response.json();

		if (!result.success) {
			throw new Error(result.data?.message || 'Failed to add record');
		}

		return result.data;
	} catch (error) {
		_log('❌ AIH.addRecord error:', error);
		throw error;
	}
};




// MARK: Update Record
// ────────────────────────────────────
/**
 * Update an existing bulk record via AJAX
 * @param {number} recordId - Record ID
 * @param {object} data - Data to update (can include: context, job_id, product_id, calldata, content)
 * @returns {Promise<{message: string}>}
 * 
 * @example
 * // Update record content and context
 * AIH.updateRecord(123, {
 *     content: { ...existingContent, published: true, updated: new Date().toISOString() },
 *     context: 'published'
 * }).then(result => {
 *     console.log('Updated:', result.message);
 * });
 * 
 * // Update calldata
 * AIH.updateRecord(123, {
 *     calldata: { _type: 'published', _action: 'product-content' }
 * });
 * 
 * // Update multiple fields including context
 * AIH.updateRecord(123, {
 *     job_id: 456,
 *     context: 'bulk_generation',
 *     calldata: { status: 'completed' },
 *     content: { title: 'New Title', updated: true }
 * });
 */
AIH.updateRecord = async (recordId, data) => {
	// Prepare form data
	const formData = new FormData();
	formData.append('action', 'csai_update_bulk_record');
	formData.append('nonce', DATA.nonce);
	formData.append('id', recordId);
	
	// Build update data object
	const updateData = {};
	
	if (data.context !== undefined) {
		updateData.context = data.context;
	}
	
	if (data.job_id !== undefined) {
		updateData.job_id = data.job_id;
	}
	
	if (data.product_id !== undefined) {
		updateData.product_id = data.product_id;
	}
	
	if (data.calldata !== undefined) {
		// Send calldata as JSON string
		if (typeof data.calldata === 'object' && data.calldata !== null) {
			formData.append('data[calldata]', JSON.stringify(data.calldata));
		} else {
			formData.append('data[calldata]', data.calldata);
		}
	}
	
	if (data.content !== undefined) {
		// Send content as JSON string
		if (typeof data.content === 'object' && data.content !== null) {
			formData.append('data[content]', JSON.stringify(data.content));
		} else {
			formData.append('data[content]', data.content);
		}
	}

	try {
		const response = await fetch(DATA.ajax_url, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		});

		const result = await response.json();

		if (!result.success) {
			throw new Error(result.data?.message || 'Failed to update record');
		}

		return result.data;
	} catch (error) {
		_log('❌ AIH.updateRecord error:', error);
		throw error;
	}
};




// MARK: Record Exists
// ────────────────────────────────────
AIH.recordExists = async ( content, productId, jobId=0, type ) => {
	let exists = false;
	try {
		const existingRecords = await AIH.getRecords(productId, jobId);
		
		// Helper to normalize whitespace for comparison
		const normalizeWhitespace = (str) => {
			if (!str) return '';
			return str.replace(/\s+/g, ' ').trim();
		};
		
		exists = existingRecords.records?.some(record => {
			if ( type && record.calldata?._type !== type) return false;
			// Compare content
			const recordContent = record.content || {};
			return normalizeWhitespace(recordContent.title) === normalizeWhitespace(content.title) &&
					normalizeWhitespace(recordContent.excerpt) === normalizeWhitespace(content.excerpt) &&
					normalizeWhitespace(recordContent.content) === normalizeWhitespace(content.content)
		});
	} catch (error) {
		return true;
	}

	return exists;

}






// MARK: Get Records
// ────────────────────────────────────
/**
 * Get records by product ID and job ID via AJAX
 * @param {number} productId - Product ID
 * @param {number} [jobId=0] - Job ID (default: 0 for single product content generation)
 * @param {number} [page=null] - Optional page number for pagination
 * @param {number} [perPage=null] - Optional records per page
 * @returns {Promise<{records: Array, count: number, total: number}>} - count is current page records, total is all matching records
 * 
 * @example
 * // Get all records for a product (single generation, job_id = 0)
 * AIH.getRecords(456).then(result => {
 *     console.log('Records:', result.records);
 *     console.log('Page count:', result.count);
 *     console.log('Total:', result.total);
 * });
 * 
 * // Get records for a specific product and job
 * AIH.getRecords(456, 123).then(result => {
 *     console.log('Records:', result.records);
 * });
 * 
 * // Get records with pagination
 * AIH.getRecords(456, 123, 1, 20).then(result => {
 *     console.log('Page 1 records:', result.records);
 *     console.log('Total available:', result.total);
 * });
 */
AIH.getRecords = async (productId, jobId = 0, page = null, perPage = null) => {
	// Prepare form data
	const formData = new FormData();
	formData.append('nonce', DATA.nonce);
	formData.append('product_id', productId);
	
	if (page !== null) {
		formData.append('page', page);
	}
	if (perPage !== null) {
		formData.append('perPage', perPage);
	}

	// If jobId is provided and not 0, we need to filter by both product and job
	// Since there's no combined endpoint, we'll use the product endpoint and filter
	formData.append('action', 'csai_get_bulk_records_by_product');

	try {
		const response = await fetch(DATA.ajax_url, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		});

		const result = await response.json();

		if (!result.success) {
			throw new Error(result.data?.message || 'Failed to get records');
		}

		// Parse JSON fields in records (calldata and content are JSON strings from DB)
		if (result.data.records && Array.isArray(result.data.records)) {
			result.data.records = result.data.records.map(record => {
				// Parse calldata if it's a string
				if (typeof record.calldata === 'string' && record.calldata) {
					try {
						record.calldata = JSON.parse(record.calldata);
					} catch (e) {
						_log('⚠️ Failed to parse calldata:', e);
					}
				}
				// Parse content if it's a string
				if (typeof record.content === 'string' && record.content) {
					try {
						record.content = JSON.parse(record.content);
					} catch (e) {
						_log('⚠️ Failed to parse content:', e);
					}
				}
				return record;
			});
		}

		// If jobId is specified and not 0, filter the results
		if (jobId !== 0 && result.data.records) {
			const filteredRecords = result.data.records.filter(record => record.job_id == jobId);
			return {
				records: filteredRecords,
				count: filteredRecords.length
			};
		}

		// Return data with proper pagination info
		return {
			records: result.data.records,
			count: result.data.count,
			total: result.data.total ?? result.data.count
		};
	} catch (error) {
		_log('❌ AIH.getRecords error:', error);
		throw error;
	}
};






// MARK: Get Records by Context
// ────────────────────────────────────
/**
 * Get records by context and product ID via AJAX
 * @param {string} context - Context identifier
 * @param {number} productId - Product ID
 * @param {number} [page=null] - Optional page number for pagination
 * @param {number} [perPage=null] - Optional records per page
 * @returns {Promise<{records: Array, count: number, total: number}>} - count is current page records, total is all matching records
 * 
 * @example
 * // Get all records for a specific context and product
 * AIH.getRecordsByContext('bulk_generation', 456).then(result => {
 *     console.log('Records:', result.records);
 *     console.log('Page count:', result.count);
 *     console.log('Total:', result.total);
 * });
 * 
 * // Get records with pagination
 * AIH.getRecordsByContext('single_product', 456, 1, 20).then(result => {
 *     console.log('Page 1 records:', result.records);
 *     console.log('Total available:', result.total);
 * });
 */
AIH.getRecordsByContext = async (context, productId, page = null, perPage = null) => {
	// Prepare form data
	const formData = new FormData();
	formData.append('action', 'csai_get_bulk_records_by_context_and_product');
	formData.append('nonce', DATA.nonce);
	formData.append('context', context);
	formData.append('product_id', productId);
	
	if (page !== null) {
		formData.append('page', page);
	}
	if (perPage !== null) {
		formData.append('perPage', perPage);
	}

	try {
		const response = await fetch(DATA.ajax_url, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		});

		const result = await response.json();

		if (!result.success) {
			throw new Error(result.data?.message || 'Failed to get records');
		}

		// Parse JSON fields in records (calldata and content are JSON strings from DB)
		if (result.data.records && Array.isArray(result.data.records)) {
			result.data.records = result.data.records.map(record => {
				// Parse calldata if it's a string
				if (typeof record.calldata === 'string' && record.calldata) {
					try {
						record.calldata = JSON.parse(record.calldata);
					} catch (e) {
						_log('⚠️ Failed to parse calldata:', e);
					}
				}
				// Parse content if it's a string
				if (typeof record.content === 'string' && record.content) {
					try {
						record.content = JSON.parse(record.content);
					} catch (e) {
						_log('⚠️ Failed to parse content:', e);
					}
				}
				return record;
			});
		}

		// Return data with proper pagination info
		return {
			records: result.data.records,
			count: result.data.count,
			total: result.data.total ?? result.data.count
		};
	} catch (error) {
		_log('❌ AIH.getRecordsByContext error:', error);
		throw error;
	}
};




// MARK: Delete Record
// ────────────────────────────────────
/**
 * Delete a record by ID via AJAX
 * @param {number} recordId - Record ID to delete
 * @returns {Promise<{message: string}>}
 * 
 * @example
 * AIH.deleteRecord(123).then(result => {
 *     console.log('Deleted:', result.message);
 * });
 */
AIH.deleteRecord = async (recordId) => {
	const formData = new FormData();
	formData.append('action', 'csai_delete_bulk_record');
	formData.append('nonce', DATA.nonce);
	formData.append('id', recordId);

	try {
		const response = await fetch(DATA.ajax_url, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		});

		const result = await response.json();

		if (!result.success) {
			throw new Error(result.data?.message || 'Failed to delete record');
		}

		return result.data;
	} catch (error) {
		_log('❌ AIH.deleteRecord error:', error);
		throw error;
	}
};




export default AIH;