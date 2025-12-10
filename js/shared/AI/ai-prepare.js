
import TOOLS            	from "../tools.js";
import { getProductData } 	from './ai-common.js';
import AIapi           		from "./ai-api.js";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}
let OPT = DATA.options || {};









	// MARK: Prepare Request Data
	// ────────────────────────────────────
export default async function prepareRequest( args ) {
	let {
		action,
		form = {},
		extraData = {},
		files = [],
		getProduct,
	} = args;
	if ( getProduct === undefined ) getProduct = true;


	// Load License and API Keys
	let license = await TOOLS.loadOption('copyspell-ai-license')
	let apiKeys = {}
	let providers = Object.keys(OPT.api)
	providers.forEach(provider => {
		if (OPT.api[provider]?.status == 'valid') {
			apiKeys[provider] = OPT.api[provider].key || '';
		}
	})


	let addons = window.CopyspellAI.getExtensions() || [];
	addons = addons.map(ext => ext.id);

	// Prepare request data
	let request = {
		id: `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
		action: action,
		domain: DATA.domain,
		service: "copyspell-ai",
		version: DATA.version,
		signature: DATA.signature || '',
	}
	// Prepare User Data
	let user = {
		domain: DATA.domain,
		wordpress: DATA.wordpress_version,
		woocommerce: DATA.woocommerce.version,
		addons: addons,
		license: license.key || '',
		keys: apiKeys,
	}


	// Prepare Options
	DATA.extra_prompt = form['extra-prompt'] || DATA.extra_prompt
	delete form['extra-prompt']
	let options  = {
		form     : JSON.parse( JSON.stringify( form ) ),
		siteData : {
			siteUrl : DATA.siteUrl || '',
			siteName : DATA.siteName || ''
			//brandTone: form['brand-tone'] || await wpApi.getOption('copyspell_ai_brand') || ''
		},
		sequence : args.sequence || await prepareSequence( action, form ),
		prompt   : extraData.prompt || DATA.extra_prompt || '',
		content  : extraData.content || '',
	}
	if ( extraData ) options.extraData = JSON.parse(JSON.stringify( extraData ));
	DATA.extra_prompt = ''
	let product = {}
	

	// Prepare Product Data
	if ( ! action.startsWith('ai-') && getProduct !== false ) {
		let productMode = 'clean'
		if ( action === 'seo-report' ) productMode = 'full'

		product = await getProductData( DATA.post.id, productMode )
		if ( extraData?.productInfo ) {
			product = { ...product, ...extraData.productInfo }
			if ( product.search ) {
				product.infoFromWeb = product.search
				delete product.search
			}
			if ( product.usp ) {
				product.uniqueSellingPoint = product.usp
				delete product.usp
			}
			if ( product['extra-info'] ) {
				product.moreProductInfo = product['extra-info']
				delete product['extra-info']
			}
			delete options.extraData.productInfo
		}
	}



	// prepare files
	if (files && files.length > 0 && typeof files[0] == 'string') {
		for (let i = 0; i < files.length; i++) {
			files[i] = {
				url: files[i],
				//mime: getMimeType( files[i] ),
			}
		}
	}


	// Final Data
	let data = { products: [ product ], options, files }
	if ( form.page_html ) data.page_html = form.page_html || '';


	return { request, user, data };

}




// MARK: Prepare Sequence
// ────────────────────────────────────
async function prepareSequence( action, form={} ) {

	let serverModels = await AIapi.getModels('all', true);
	//console.log('SERVER MODELS:', serverModels);

	let serverSequences = serverModels.models.sequences || {};
	//OPT.sequences = { ...OPT.sequences, ...serverSequences }

	let sequences = {  ...serverSequences, ...OPT.sequences }

	let validProviders = []
	let _model = document.querySelector('select.aai-select-model');
	_model = _model?.value  || (form._model || 'sequence');

	// filter sequences based on valid providers
	let providers = Object.keys(OPT.api)
	providers.forEach(provider => {
		if (OPT.api[provider]?.status != 'valid') {
			sequences.main = sequences.main?.filter(item => item[1] != provider) || [];
			sequences.keywords = sequences.keywords?.filter(item => item[1] != provider) || [];
			sequences.search = sequences.search?.filter(item => item[1] != provider) || []
			sequences.images = sequences.images?.filter(item => item[1] != provider) || []
		} else {
			validProviders.push(provider);
		}
	});



	let sequence = sequences.main
	
	// Έχει δοθεί μοντέλο αλλά όχι sequence
	/*
	if (model && (!sequence || !sequence.length)) {
		if (Array.isArray(model) && model.length > 0) sequence = [model]
		else sequence = [[model, api]];
	}
	*/

	// Το sequence είναι string
	if (typeof sequence == 'string') sequence = sequences[sequence] || sequences.main || []

	// Αν το sequence είναι array με strings, το μετατρέπουμε σε array με arrays
	// π.χ. ['gemini-2.0-pro', 'google']
	if (Array.isArray(sequence) && typeof sequence[0] == 'string') {
		sequence = [sequence];
	}

	// Αν το sequence είναι κενό, το αρχικοποιούμε με το μοντέλο και τον πάροχο
	if (!sequence || !sequence.length) {
		//sequence = [[this.model, this.provider]];
		//sequence = [[ "gemini-flash-latest", "google" ]]
	}






	if ( action == 'product-keywords' ) sequence = sequences.keywords
	if ( action == 'product-search' ) sequence = sequences.search



	if ( _model && _model !== 'sequence' ) {

		let model, api;
		model = _model.split(':::')[0] || 'gemini-2.5-flash';
		api = _model.split(':::')[1] || 'google';
		sequence = [[ model, api ]];
	}


	return sequence

}

