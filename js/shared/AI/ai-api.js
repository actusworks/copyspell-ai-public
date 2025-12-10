import TOOLS            		from "../tools.js";
import _log	 					from "../Log.js";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}
let OPT = DATA.options || {};

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const CACHE_KEY_PREFIX = 'copyspell_ai_models_';




const AIapi = {}
AIapi.models = {}


// MARK: Get Models
// ────────────────────────────────────
AIapi.getModels = async ( provider = 'google', forceRefresh = false ) => {
	
	// Check cache first (unless force refresh)
	//forceRefresh = true
	if ( !forceRefresh ) {
		let cached = AIapi.getCachedModels( provider );
		if ( cached ) {
			_log(`📦 Using cached models for ${provider}`);
			return cached;
		}
	}

	// Prepare Request Data
	const { request, user } = await AIapi.prepare( provider, `ai-${provider}-models` );


	let response = {};


	
	try {
		// •••••••••••••••••••••••••••••••••••••
		response = await fetch(`https://copyspell.actusanima.com/v1/ai/${provider}/models`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ request, user }),
			//signal: controller.signal
		});
		// •••••••••••••••••••••••••••••••••••••
	} catch (err) {
		//clearTimeout(timeout);
		const error = err.name === 'AbortError' ? 'Request timed out' : err.message;
		_log(`❌ Server error (${response.status}):`, error);
		//this.callProgress({ error, status: 'error' });
		//this.onResult({ error, status: 'error', products: data.products || [] });
		return;
	}

	// Handle non-200 responses (errors before stream starts)
	if ( !response.ok ) {
		const errorData = await response.json().catch(() => ({ error: `Server error (${response.status})` }));
		_log(`❌ Server error (${response.status}):`, errorData);
		//this.callProgress({ ...errorData, status: 'error' });
		//this.onResult({ ...errorData, status: 'error', products: data.products || [] });
		return;
	}



	response = await response.json();


	// Cache the response
	AIapi.cacheModels( provider, response );
	
	return response;

}





// MARK: Models Cache
// ────────────────────────────────────
AIapi.getCachedModels = ( provider ) => {
	try {
		const cacheKey = CACHE_KEY_PREFIX + provider;
		const cached = localStorage.getItem( cacheKey );
		
		if ( !cached ) return null;
		
		const { data, timestamp } = JSON.parse( cached );
		const now = Date.now();
		
		// Check if cache is still valid (within 12 hours)
		if ( now - timestamp < CACHE_DURATION ) {
			return data;
		}
		
		// Cache expired, remove it
		localStorage.removeItem( cacheKey );
		return null;
		
	} catch ( err ) {
		_log(`⚠️ Error reading models cache for ${provider}:`, err.message);
		return null;
	}
}
AIapi.cacheModels = ( provider, data ) => {
	try {
		const cacheKey = CACHE_KEY_PREFIX + provider;
		const cacheData = {
			data,
			timestamp: Date.now()
		};
		localStorage.setItem( cacheKey, JSON.stringify( cacheData ) );
		_log(`💾 Cached models for ${provider}`);
	} catch ( err ) {
		_log(`⚠️ Error caching models for ${provider}:`, err.message);
	}
}
AIapi.clearModelsCache = ( provider = null ) => {
	try {
		if ( provider ) {
			localStorage.removeItem( CACHE_KEY_PREFIX + provider );
			_log(`🗑️ Cleared models cache for ${provider}`);
		} else {
			// Clear all provider caches
			const keys = Object.keys( localStorage ).filter( k => k.startsWith( CACHE_KEY_PREFIX ) );
			keys.forEach( k => localStorage.removeItem( k ) );
			_log(`🗑️ Cleared all models cache (${keys.length} providers)`);
		}
	} catch ( err ) {
		_log(`⚠️ Error clearing models cache:`, err.message);
	}
}










// MARK: List Models
// ────────────────────────────────────
AIapi.listModels = async ( provider = 'google' ) => {

	// Prepare Request Data
	const { request, user } = await AIapi.prepare( provider, `ai-${provider}-list` );

	let response = {};

	
	try {
		// •••••••••••••••••••••••••••••••••••••
		response = await fetch(`https://copyspell.actusanima.com/v1/ai/${provider}/list`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ request, user }),
			//signal: controller.signal
		});
		// •••••••••••••••••••••••••••••••••••••
	} catch (err) {
		//clearTimeout(timeout);
		const error = err.name === 'AbortError' ? 'Request timed out' : err.message;
		_log(`❌ Server error (${response.status}):`, error);
		//this.callProgress({ error, status: 'error' });
		//this.onResult({ error, status: 'error', products: data.products || [] });
		return;
	}

	// Handle non-200 responses (errors before stream starts)
	if ( !response.ok ) {
		const errorData = await response.json().catch(() => ({ error: `Server error (${response.status})` }));
		_log(`❌ Server error (${response.status}):`, errorData);
		//this.callProgress({ ...errorData, status: 'error' });
		//this.onResult({ ...errorData, status: 'error', products: data.products || [] });
		return;
	}

	response = await response.json();


	return response;

	
}







// MARK: Prepare Request
// ────────────────────────────────────
AIapi.prepare = async ( provider, action ) => {

	let license = await TOOLS.loadOption('copyspell-ai-license')
	let apiKeys = {}
	let providers = Object.keys(OPT.api)
	providers.forEach(provider => {
		if (OPT.api[provider]?.status == 'valid') {
			apiKeys[provider] = OPT.api[provider].key || '';
		}
	})
	let request = {
		id: `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
		app: "copyspell",
		action: action,
	}
	// Prepare User Data
	let user = {
		wordpress: DATA.wordpress_version,
		woocommerce: DATA.woocommerce.version,
		license: license.key || '',
		keys: apiKeys,
	}


	return { request, user };

}







// MARK: Google
// ────────────────────────────────────
AIapi.google = {}
AIapi.google.checkAPIKey = async (apiKey) => {

	try {

		// Try to list models - this is a lightweight way to test the API key
		let models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1000`);

		if ( models.ok ) {
			models = await models.json();
			if ( ! models.models ) {}
			models = models.models || [];
		
			console.log('GOOGLE MODELS', models);
			_log('GOOGLE MODELS', models);
		} else {
			return { valid: false, error: `API key validation failed` };
		}

		AIapi.models = await AIapi.getModels('all', true);

		// If we get here without error, the API key is valid
		return { valid: true, models };
		
	} catch (error) {
		// Check specific error types
		if (error.status === 401 || error.status === 403) {
			return { valid: false, error: "Invalid API key or insufficient permissions" };
		} else if (error.status === 429) {
			return { valid: true, error: "API key is valid but rate limited" };
		} else {
			return { valid: false, error: error.message || "API key validation failed" };
		}
	}


}



// MARK: Groq
// ────────────────────────────────────
AIapi.groq = {}
AIapi.groq.checkAPIKey = async (apiKey) => {

	try {
		// Make a direct fetch request to Groq's API
		const response = await fetch('https://api.groq.com/openai/v1/models', {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const status = response.status;
			if (status === 401 || status === 403) {
				return { valid: false, error: "Invalid API key or insufficient permissions" };
			} else if (status === 429) {
				return { valid: true, error: "API key is valid but rate limited" };
			} else {
				return { valid: false, error: `API request failed with status ${status}` };
			}
		}

		const data = await response.json();
		const models = data.data || [];
		
		AIapi.models = await AIapi.getModels('all', true);

		// If we get here without error, the API key is valid
		return { valid: true, models };
		
	} catch (error) {
		return { valid: false, error: error.message || "API key validation failed" };
	}
	
}



// MARK: OpenAI
// ────────────────────────────────────
AIapi.openai = {}
AIapi.openai.checkAPIKey = async (apiKey) => {
	try {
		
		const { default: OpenAI } = await import('https://cdn.skypack.dev/openai@4.67.1');

		
		// Create a temporary client with the provided API key
		const tempClient = new OpenAI({ 
			apiKey: apiKey, 
			dangerouslyAllowBrowser: true 
		});
		//_log('tempClient', tempClient);
		// Make a simple API call to verify the key
		// Using the models endpoint is a lightweight way to test
		let tst = await tempClient.models.list();
		//_log('tst', tst);
		
		AIapi.models = await AIapi.getModels('all', true);

		// If we get here, the API key is valid
		return { valid: true };


	} catch (error) {
		_log('❌ AI --- openAI --- checkAPIKey ---', error);
		// Handle different types of authentication errors
		if (error.status === 401) {
			return { valid: false, error: 'Invalid API key' };
		} else if (error.status === 403) {
			return { valid: false, error: 'API key does not have required permissions' };
		} else if (error.status === 429) {
			return { valid: false, error: 'Rate limit exceeded' };
		} else {
			return { valid: false, error: error.message || 'Unknown error occurred' };
		}
	}
}




// MARK: GitHub
// ────────────────────────────────────
AIapi.github = {}
AIapi.github.checkAPIKey = async (apiKey) => {
	try {

		const aiInference = await import('https://cdn.skypack.dev/@azure-rest/ai-inference');
		const coreAuth = await import('https://cdn.skypack.dev/@azure/core-auth');
		const endpoint = "https://models.github.ai/inference"
	
		const ModelClient = aiInference.default;
		const isUnexpected = aiInference.isUnexpected;
		const AzureKeyCredential = coreAuth.AzureKeyCredential;
		
		// Create a temporary client with the provided API key
		const tempClient = ModelClient(
			endpoint,
			new AzureKeyCredential( apiKey ),
		);

		// Make a minimal chat completion request to test the key
		const response = await tempClient.path("/chat/completions").post({
			body: {
				messages: [
					{ role: "user", content: "test" }
				],
				model: "openai/gpt-4o-mini", // Use a lightweight model
				max_tokens: 1
			}
		});

		// Check if the response is unexpected (error)
		if (isUnexpected(response)) {
			let body = response.body;
			try {
				body = JSON.parse(response.body);
			} catch (e) {
				// Keep original body if parsing fails
			}
			
			if (response.status === 401) {
				return { valid: false, error: 'Invalid API key' };
			} else if (response.status === 403) {
				return { valid: false, error: 'API key does not have required permissions' };
			} else if (response.status === 429) {
				return { valid: false, error: 'Rate limit exceeded' };
			} else {
				return { valid: false, error: body.error?.message || body || 'Unknown error occurred' };
			}
		}

		AIapi.models = await AIapi.getModels('all', true);

		// If we get here, the API key is valid
		return { valid: true };

	} catch (error) {
		// Handle network or other errors
		return { valid: false, error: error.message || 'Unknown error occurred' };
	}
}





// MARK: NagaAI
// ────────────────────────────────────
AIapi.naga = {}
AIapi.naga.checkAPIKey = async (apiKey) => {
	try {

		const { default: OpenAI } = await import('https://cdn.skypack.dev/openai@4.67.1');

		
		// Create a temporary client with the provided API key
		const tempClient = new OpenAI({ 
    		baseURL: "https://api.naga.ac/v1",
			apiKey: apiKey, 
			dangerouslyAllowBrowser: true 
		});
		//_log('tempClient', tempClient);
		// Make a simple API call to verify the key
		// Using the models endpoint is a lightweight way to test
		let tst = await tempClient.models.list();
		_log('tst', tst);
		

		AIapi.models = await AIapi.getModels('all', true);

		// If we get here, the API key is valid
		return { valid: true };


	} catch (error) {
		_log('❌ AI --- openAI --- checkAPIKey ---', error);
		// Handle different types of authentication errors
		if (error.status === 401) {
			return { valid: false, error: 'Invalid API key' };
		} else if (error.status === 403) {
			return { valid: false, error: 'API key does not have required permissions' };
		} else if (error.status === 429) {
			return { valid: false, error: 'Rate limit exceeded' };
		} else {
			return { valid: false, error: error.message || 'Unknown error occurred' };
		}
	}
}











// ────────────────────────────────────
// MARK: Auto-init on DOM ready
// ────────────────────────────────────
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', async () => {
		
		AIapi.models = await AIapi.getModels('all');
		AIapi.models = AIapi.models?.models || {};
		
	});
} else {
	(async () => {

		AIapi.models = await AIapi.getModels('all');
		AIapi.models = AIapi.models?.models || {};

	})();
}








// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default AIapi;