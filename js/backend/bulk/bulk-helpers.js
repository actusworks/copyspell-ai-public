import expired_trialog 					from '../../shared/Log.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;






// MARK: QUERY
/**
 * Get count of products matching a query
 * @param {Object} query - Query object with filters (categories, tags, etc.)
 * @returns {Promise<number|null>} Promise resolving to product count or null on failure
 */
export async function productQuery( _query, mode = 'full', limit = 20, page = 1, images = false ) {
	if ( ! _query || typeof _query !== 'object' ) {
		_log('❌ Query must be an object');
		return null;
	}
	let query = JSON.parse(JSON.stringify(_query)); // Deep copy to avoid mutation
	delete query.description;

	//log('MODE  ***********************', mode)
	//console.log('QUERY ***********************', query)

	try {
		if ( ! images ) images = ''
		const formData = new FormData();
		formData.append('action', 'csai_query');
		formData.append('limit', limit);
		formData.append('page', page);
		formData.append('images', images);
		formData.append('query', JSON.stringify(query));
		formData.append('nonce', DATA?.nonce || '');
		formData.append('mode', mode);

		const response = await fetch(DATA.ajax_url, {
			method: 'POST',
			body: formData
		});
		

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const data = await response.json();
		//if ( data.data.query_args )
			//console.log('Query args -------------', data.data.query_args);
		//else
			//console.log('Query count ------------', data.data.query);

		if (data.success) {

			if ( mode == 'count' ) {
				return data.data.count;
			} else if ( mode == 'ids' ) {
				return data.data;
			} else if ( mode == 'full' ) {
				return data.data;
			}
		} else {
			_log('data', data);
			_log('❌ Error from server:', data.data?.message || 'Unknown error');
			return null;
		}
		
	} catch (error) {
		_log('❌ Error getting product count:', error);
		throw error;
	}
}











// MARK: Build Category Tree
// ────────────────────────────────────
export function buildCategoryTree(categories, parentId = 0, visited = new Set()) {
	const tree = [];
	
	for (const category of categories) {
		// Skip if already visited (prevent infinite loops)
		if (visited.has(category.term_id)) {
			continue;
		}
		
		// Check if this category belongs to the current parent
		// Handle both 'parent' and 'category_parent' property names
		const catParent = category.parent !== undefined ? category.parent : category.category_parent;
		
		if (catParent == parentId) {
			// Mark as visited
			visited.add(category.term_id);
			
			// Create category node
			const node = {
				id: category.term_id,
				name: category.name,
				slug: category.slug,
				parent: catParent,
				count: category.count || 0,
				children: []
			};
			
			// Recursively get children
			node.children = buildCategoryTree(categories, category.term_id, visited);
			
			tree.push(node);
		}
	}
	
	return tree;
};







// MARK: Render Category Tree
// ────────────────────────────────────
export function renderCategoryTree(tree, value){
	if (!tree.length) return '';
	return `<ul>
		${tree.map(cat => {
			const isChecked = value?.includes(String(cat.slug)) ? 'checked' : '';
			let liClass = 'aai-no-children'
			let caret = '';
			if ( cat.children && cat.children.length ) {
				liClass = 'aai-has-children is-closed';
				caret = '<span class="aai-caret"></span>';
			}
			return `
			<li class="${liClass}">
				<label>
					<input type="checkbox" value="${decodeURIComponent(cat.slug)}" class="aai-category-checkbox" ${isChecked} />
					${caret}
					<span class="aai-name">${cat.name}</span>
				</label>
				${renderCategoryTree(cat.children, value)}
			</li>
		`;
		}).join('')}
	</ul>`;
};



