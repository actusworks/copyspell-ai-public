// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}








                
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: WP API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class wpAPI {


	// MARK: Constructor
	// ────────────────────────────────────
	constructor() {
	


	}




	// MARK: Get Post
	// ────────────────────────────────────
	// Fetches a post by ID
	// ────────────────────────────────────
	async getPost( id, type = 'post' ) {
		if ( type == 'product' ) {
			return await this.getProduct( id );
		}
		
		try {

			let result = await wp.apiFetch( { path: `/wp/v2/posts/${id}` } )
			return result;


		// ERROR
		} catch (error) { return this.error(error) }

	}

	



	// MARK: Get Product
	// ────────────────────────────────────
	// Fetches a product by ID
	// ────────────────────────────────────
	async getProduct( id ) {
		try {
			let result = await wp.apiFetch({ path: `/wc/v3/products/${id}` })
			return result;
		// ERROR
		} catch (error) { return this.error(error) }
	}




	// MARK: Create Product
	// ────────────────────────────────────
	// Creates a new WooCommerce product
	// ────────────────────────────────────
	async createProduct( data ) {
		try {
			let result = await wp.apiFetch({
				path: `/wc/v3/products`,
				method: 'POST',
				data: data
			});
			return result;
		} catch (error) { return this.error(error) }
	}




	// MARK: Update Product
	// ────────────────────────────────────
	// Updates an existing WooCommerce product
	// ────────────────────────────────────
	async updateProduct( id, data ) {
		try {
			let result = await wp.apiFetch({
				path: `/wc/v3/products/${id}`,
				method: 'PUT',
				data: data
			});
			return result;
		} catch (error) { return this.error(error) }
	}




	// MARK: Batch Update Products
	// ────────────────────────────────────
	// Updates multiple WooCommerce products in a single request
	// ────────────────────────────────────
	async batchUpdateProducts( updates ) {
		try {
			let result = await wp.apiFetch({
				path: `/wc/v3/products/batch`,
				method: 'POST',
				data: {
					update: updates // Array of {id, ...fields}
				}
			});
			return result;
		} catch (error) { return this.error(error) }
	}




	// MARK: Get Meta
	// ────────────────────────────────────
	async getMeta( id, name, type = 'post' ) {
		if ( ! id ) return null;
		if ( type == 'product' ) {	
			
			let product = await this.getProduct( id );
			if ( product.error ) return product;

			let meta = product.meta_data.find( meta => meta.key === name );
			return meta ? meta.value : null;
		}
		// Fetch existing post
		let post = await this.getPost( id, type );

		if ( post.error ) return post;

		let meta = post.meta.find( meta => meta.key === name );
		return meta ? meta.value : null;
	}



	// MARK: Add Meta to Post
	// ────────────────────────────────────
	async addMeta( id, name, value ) {

		// Fetch existing post
		let post = await this.getPost( id );
		if ( post.error ) return post;

		// Check if meta already exists
		let existingMeta = post.meta.find( meta => meta.key === name );
		if ( existingMeta ) {
			// Update existing meta
			existingMeta.value = value;
		} else {
			// Add new meta
			post.meta.push({ key: name, value: value });
		}

		// Update post with new meta
		let updatedPost = await this.updatePost( id, post );
		return updatedPost;

	}



	// MARK: Add Meta to Product
	// ────────────────────────────────────
	async addProductMeta( id, name, value ) {
		if ( ! id ) return;
		if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
			value = JSON.stringify(value);
		}
		

		// Fetch existing product
		let product = await this.getProduct( id );
		if ( product.error ) return product;

		// Check if meta already exists
		let existingMeta = product.meta_data.find( meta => meta.key === name );
		if ( existingMeta ) {
			// Update existing meta
			existingMeta.value = value;
		} else {
			// Add new meta
			product.meta_data.push({ key: name, value: value });
		}

		// Update product with new meta
		let updatedProduct = await this.updateProduct( id, product );
		return updatedProduct;


	}



	// MARK: Get Option
	// ────────────────────────────────────
	// Gets a WordPress option value
	// ────────────────────────────────────
	async getOption( optionName ) {
		try {
			let formData = new FormData();
			formData.append('action', 'copyspell_ai_load_option');
			formData.append('name', optionName);
			formData.append('nonce', DATA.nonce);

			let response = await fetch(DATA.ajax_url || '/wp-admin/admin-ajax.php', {
				method: 'POST',
				body: formData
			});
			
			let result = await response.json();
			
			if (result.success) {
				return result.data.options;
			} else {
				return this.error(result.data?.message || 'Failed to get option');
			}
		} catch (error) { return this.error(error) }
	}



	// MARK: Save Option
	// ────────────────────────────────────
	// Saves a WordPress option value
	// ────────────────────────────────────
	async saveOption( optionName, value ) {
		try {
			let formData = new FormData();
			formData.append('action', 'copyspell_ai_save_settings');
			formData.append('name', optionName);
			formData.append('options', typeof value === 'object' ? JSON.stringify(value) : value);
			formData.append('nonce', DATA.nonce);

			let response = await fetch(DATA.ajax_url || '/wp-admin/admin-ajax.php', {
				method: 'POST',
				body: formData
			});
			
			let result = await response.json();
			
			if (result.success) {
				return result.data.options;
			} else {
				return this.error(result.data?.message || 'Failed to save option');
			}
		} catch (error) { return this.error(error) }
	}


	// MARK: Error Message
	// ────────────────────────────────────
	error( error ) {
		let message = error?.message || 'API error';
		console.groupCollapsed('%c'+message, 'padding:2px 8px; background:#fff2ac;')
		console.log(( new Error().stack || '' ).split('\n')[2]);
		console.groupEnd();
		return { error: (error?.message || error || 'API error' ) }
	}



}















// Singleton export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default new wpAPI();