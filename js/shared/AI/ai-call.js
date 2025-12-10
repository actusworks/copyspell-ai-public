import prepareRequest 		from './ai-prepare.js';
import AIH 					from './ai-helpers.js';
import _log	 				from "../Log.js";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;
let OPT = DATA.options || {};











// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: COPYSPELL AI CALL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class CopySpellCall {
	
	// Static flag to prevent duplicate concurrent calls per action type
	static activeRequests = new Map();

	// ────────────────────────────────────
	constructor( args ) {
		const {
			action,
			form,
			extraData,
			onProgress,
			onResult,
			getProduct = true,
		} = args;

		this.action 	= action || 'product-content'
		this.form 		= form || {};
		this.meta		= null;
		this.usage		= null;
		this.onResult	= onResult || function() {};
		this.onProgress	= onProgress || function() {};
		this.extraData  = extraData || {};
		this.getProduct = getProduct;

		// Wrap call() to ensure onResult is always invoked, even on unexpected errors
		this.call( args ).catch((err) => {
			_log(`❌ Unexpected error in call():`, err);
			this.onResult({ 
				error: err.message || 'Unexpected error occurred', 
				status: 'error', 
				products: [] 
			});
		});
	}



	// MARK: RUN
	// ────────────────────────────────────
	static async run( args ) {
		const {
			action,
			form,
			extraData,
			onProgress,
			onResult,
			getProduct,
		} = args;

		// Prevent duplicate concurrent calls for the same action
		if ( CopySpellCall.activeRequests.get( action ) ) {
			_log(`⚠️ Blocked duplicate call for action: ${action}`);
			return { error: 'Request already in progress', status: 'blocked' };
		}

		CopySpellCall.activeRequests.set( action, true );

		return new Promise( ( resolve ) => {

			const instance = new CopySpellCall({ ...args,
				onResult: ( result ) => {
					CopySpellCall.activeRequests.delete( action );
					resolve( result );
				}
			});

		});
	}


	// MARK: CALL
	// ────────────────────────────────────
	async call( args = {} ) {
		// Prepare Request Data
		const { request, user, data } = await prepareRequest( args );

//return this.onResult({ status: 'error', error: 'DEBUGGING', data });
console.log('➡️ Request:', data.options.sequence[0]);


		// No API Keys
		if ( !Object.keys( user.keys ).length ) {
			args.onResult({
				status: 'error',
				error: __('No API keys configured. Please set up your AI provider API keys in the settings.', 'copyspell-ai'),
				products: data.products || []
			});
			return;
		}

		// Store original content
		await this.storeOriginalContent( data, args.action );

		
		_log('➡️ Request:', { request, user, data });



		// API call
		let response;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 180000);
		try {
			// •••••••••••••••••••••••••••••••••••••
			response = await fetch('https://copyspell.actusanima.com/v1/content', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ request, user, data }),
				signal: controller.signal
			});
			// •••••••••••••••••••••••••••••••••••••
		} catch (err) {
			clearTimeout(timeout);
			const error = err.name === 'AbortError' ? 'Request timed out' : err.message;
			_log(`❌ Fetch error:`, error);
			this.callProgress({ error, status: 'error' });
			args.onResult({ error, status: 'error', products: data.products || [] });
			return;
		}
		clearTimeout(timeout);

		// Handle non-200 responses (errors before stream starts)
		if ( !response.ok ) {
			const errorData = await response.json().catch(() => ({ error: `Server error (${response.status})` }));
			_log(`❌ Server error (${response.status}):`, errorData);
			this.callProgress({ ...errorData, status: 'error' });
			this.onResult({ ...errorData, status: 'error', products: data.products || [] });
			return;
		}

		// Stream NDJSON response
		await this.readNDJSONStream( response, data.products );
	}




	// MARK: STORE ORIGINAL CONTENT
	// ────────────────────────────────────
	async storeOriginalContent( data, action ) {

		if ( action === 'product-content' ||
			 action === 'marketing-content'
		 ) {
			let product = data.products[0] || DATA.post || {};
			let content = {
				title: product.title || '',
				excerpt: product.excerpt || '',
				content: product.content || '',
				url: product.url || ''
			}

			// Only add if original doesn't exist
			if (! await AIH.recordExists( content, product.id )) {
				await AIH.addRecord(0, product.id || 0, 
					{_type: 'original', _action: action }, 
					content
				);
			}
	
		}

	}




	// MARK: Read NDJSON Stream
	// ────────────────────────────────────
	async readNDJSONStream( response, products = [] ) {
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let receivedFinal = false;
		while ( true ) {
			const { done, value } = await reader.read();

			if ( done ) {
				if ( !receivedFinal ) {
					console.log('DONE', done)
					console.log('VALUE', value)
					_log('⚠️ Connection closed without final status');
					this.callProgress({ error: 'Connection lost', status: 'error' });
					// Ensure onResult is called so the Promise resolves and activeRequests is cleaned up
					this.onResult({ error: 'Connection lost', status: 'error', products });
				}
				break;
			}

			buffer += decoder.decode( value, { stream: true } );
			const lines = buffer.split('\n\n');
			buffer = lines.pop() || '';
			for ( const line of lines ) {
				const json = line.trim();
				if ( !json ) continue;

				try {
					const result = JSON.parse( json );
					if ( result.heartbeat ) continue;
					this.callProgress( result );

					// Check for final status
					if ( ['success', 'error', 'server error'].includes( result.status ) ) {
						receivedFinal = true;
						
						// Handle error responses
						if ( result.status === 'error' || result.status === 'server error' ) {
							_log(`❌ Error response:`, result.error);
							this.onResult( { ...result, products } );
						}
						// Handle success responses
						else if ( result.content !== undefined || result.json !== undefined ) {
							const responseSizeInKB = new Blob([JSON.stringify(result)]).size / 1024;
							const finalResult = { ...result, products };
							
							_log(`✅ Response: ${responseSizeInKB.toFixed(2)} KB`, finalResult);
							//_log(`📋 Response size: ${responseSizeInKB.toFixed(2)} KB`);

							this.onResult( finalResult );
						}
					}
				} catch ( e ) {
					_log('⚠️ Parse error:', e.message);
				}
			}
		}
	}





	
	// MARK: Call Progress
	// ────────────────────────────────────
	callProgress( progress ) {

		//_log('⤑ progress', progress)
		this.onProgress( progress );

	}







}





