import wpApi 				from '../wp-api.js';
import _log	 				from "../Log.js";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;


const defaultPrefs = {
	preferedModel	: 'sequence',
	audiences		: ['general public'],
	tone			: ['informative', 'sales-oriented'],
	priorities		: ['visual formatting', 'SEO keywords'],
	language		: 'Same as the content',
	"content-size"	: '150-300 words',
	"excerpt-size"	: '30-100 words',
	framework		: 'Benefit-driven',
	
	//productInfo		: { id: DATA.post.id || null },
	//"brand-tone"	: '',
	//"extra-prompt"	: '',
}







// MARK: Get Product Data
// ────────────────────────────────────
export async function getProductData( id=DATA.post?.id, mode='full' ) {

	//if ( this.data && this.data.id && this.data.id == id ) return this.data;


	if ( !id ) {
		//_log('⚠️ No ID provided for product data retrieval');
		return {};
	}

	let product = DATA.product;
	if ( ! DATA.product || DATA.product.id !== id ) {
		product = await wpApi.getPost( id, 'product' );
	}
	DATA.product = product;

 
	let data = {
		id: product.id,
		slug: product.slug,
		title: product.name,
		excerpt: product.short_description,
		content: product.description,
		categories: product.categories.map( cat => cat.name ) || null,
		tags: product.tags || null,
		brands: product.brands || null,
		meta_data: product.meta_data || null,
		regular_price: product.regular_price || null,
		sale_price: product.sale_price || null,
		images: product.images || null,
		imageUrls: product.images?.map( img => img.src || img.url || img.source_url || '' ) || null,
		attributes: product.attributes?.map( attr => {
			return {
				name: decodeURIComponent(attr.name || ''),
				options: attr.options?.map(opt => decodeURIComponent(opt)) || null,
			}
		}) || null,
		modified: product.date_modified || null,
		url: decodeURIComponent(product.permalink || ''),
		//stock_quantity: product.stock_quantity || 0,
		//stock_status: product.stock_status || null,
		//date_on_sale_from: product.date_on_sale_from || null,
		//date_on_sale_to: product.date_on_sale_to || null,
	};

	if ( data.regular_price ) data.regular_price += ' ' + DATA.woocommerce.currency;
	if ( data.sale_price ) data.sale_price += ' ' + DATA.woocommerce.currency;

	//console.log('Product data', this.data);


	if ( mode == 'clean' ) {
		data = await cleanupProductData( data );
	}


	return data;
	

}







// MARK: Cleanup Product Data
// ────────────────────────────────────
export async function cleanupProductData( data ) {
	
	let productData = JSON.parse(JSON.stringify( data || DATA.post ));

	//delete productData.id
	delete productData.slug
	delete productData.images
	delete productData.imageUrls
	delete productData.meta_data
	//delete productData.permalink
	delete productData.postType
	delete productData.author
	delete productData.status

	//console.log('productData', productData)

	Object.keys(productData).forEach(key => {
		if ( productData[key] === null ||
				(Array.isArray(productData[key]) && productData[key].length === 0) ) {
			delete productData[key];
		}
	});

	return productData
	
}









// MARK: Markdown to HTML
// ────────────────────────────────────
export function markdownToHTML( markdown ) {
	if ( !markdown || typeof markdown !== 'string' ) return '';
	let html = markdown;

	// Convert horizontal rules
	html = html.replace(/^\*\*\*$/gim, '<hr>');
	html = html.replace(/^---$/gim, '<hr>');
	html = html.replace(/^___$/gim, '<hr>');

	// Convert headings (must be done before bold/italic to avoid conflicts)
	html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
	html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
	html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
	html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

	// Convert unordered lists (with proper nesting support)
	html = html.replace(/^\*   (.+)$/gim, '<li>$1</li>');
	html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
	html = html.replace(/^\+ (.+)$/gim, '<li>$1</li>');
	
	// Wrap consecutive list items in ul tags
	html = html.replace(/(<li>.*<\/li>\n?)+/gim, function(match) {
		return '<ul>' + match + '</ul>';
	});

	// Convert ordered lists
	html = html.replace(/^\d+\.\s+(.+)$/gim, '<li>$1</li>');
	html = html.replace(/(<li>.*<\/li>(?:\n|$))+/gim, function(match) {
		// Only wrap if not already in ul tags
		if (!match.includes('<ul>')) {
			return '<ol>' + match + '</ol>';
		}
		return match;
	});

	// Convert bold and italics (must handle *** before ** and *)
	html = html.replace(/\*\*\*(.+?)\*\*\*/gim, '<strong><em>$1</em></strong>');
	html = html.replace(/\*\*(.+?)\*\*/gim, '<strong>$1</strong>');
	html = html.replace(/\*(.+?)\*/gim, '<em>$1</em>');
	
	// Alternative bold/italic syntax
	html = html.replace(/___(.+?)___/gim, '<strong><em>$1</em></strong>');
	html = html.replace(/__(.+?)__/gim, '<strong>$1</strong>');
	html = html.replace(/_(.+?)_/gim, '<em>$1</em>');

	// Convert links
	html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>');

	// Convert inline code
	html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

	// Convert blockquotes
	html = html.replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>');

	// Convert paragraphs (double line breaks)
	html = html.replace(/\n\n/gim, '</p><p>');
	html = '<p>' + html + '</p>';

	// Clean up empty paragraphs
	html = html.replace(/<p><\/p>/gim, '');
	html = html.replace(/<p>(\s*<(h[1-6]|hr|ul|ol|blockquote))/gim, '<$2');
	html = html.replace(/(<\/(h[1-6]|hr|ul|ol|blockquote)>)\s*<\/p>/gim, '$1');

	// Convert single line breaks to <br>
	html = html.replace(/\n/gim, '<br>');

	// Clean up extra spaces
	html = html.replace(/<br>\s*<br>/gim, '<br>');

	return html.trim();
}





 



// MARK: Custom Refinement
// ────────────────────────────────────
export async function customRefinement() {
	return new Promise((resolve, reject) => {

		// Create modal overlay
		const modalOverlay = document.createElement('div');
		modalOverlay.className = 'aai-modal-overlay';

		// Create modal
		const modal = document.createElement('div');
		modal.className = 'aai-modal';

		// Create modal content
		const modalContent = document.createElement('div');
		modalContent.className = 'aai-modal-content';

		// Create textarea
		const textarea = document.createElement('textarea');
		textarea.className = 'aai-custom-refinement-textarea';
		textarea.placeholder = __("How would you like me to change this content?", 'copyspell-ai') || 'Enter your custom refinement prompt...';

		// Create buttons container
		const buttonsDiv = document.createElement('div');
		buttonsDiv.style.cssText = 'margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;';

		// Create cancel button
		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = 'Cancel';
		cancelBtn.className = 'aai-btn aai-btn-secondary medium';

		// Create apply button
		const applyBtn = document.createElement('button');
		applyBtn.textContent = 'Apply';
		applyBtn.className = 'aai-btn aai-btn-primary medium';

		// Assemble modal
		buttonsDiv.appendChild(cancelBtn);
		buttonsDiv.appendChild(applyBtn);
		modalContent.appendChild(textarea);
		modalContent.appendChild(buttonsDiv);
		modal.appendChild(modalContent);
		modalOverlay.appendChild(modal);

		// Add to body
		document.body.appendChild(modalOverlay);

		// Focus textarea
		textarea.focus();

		// Event handlers
		cancelBtn.onclick = () => {
			document.body.removeChild(modalOverlay);
			reject('cancelled');
		};

		applyBtn.onclick = () => {
			const customPrompt = textarea.value.trim();
			if (customPrompt) {
				document.body.removeChild(modalOverlay);
				resolve(customPrompt);
			}
		};

		// Close on overlay click
		modalOverlay.onclick = (e) => {
			if (e.target === modalOverlay) {
				document.body.removeChild(modalOverlay);
				resolve(false);
				//reject('cancelled');
			}
		};

		// Close on escape key
		document.addEventListener('keydown', function escapeHandler(e) {
			if (e.key === 'Escape') {
				document.removeEventListener('keydown', escapeHandler);
				if (document.body.contains(modalOverlay)) {
					document.body.removeChild(modalOverlay);
				}
				resolve(false);
				//reject('cancelled');
			}
		});
		


		
	})
}
