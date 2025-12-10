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
	

	// ────────────────────────────────────
	constructor( action, form, onProgress, onResult, extraData ) {

		this.action 	= action || 'product-content'
		this.form 		= form || {};
		this.meta		= null;
		this.usage		= null;
		this.onResult	= onResult || function() {};
		this.onProgress	= onProgress || function() {};
		this.extraData  = extraData || {};

		this.call()
	}




	// MARK: CALL
	// ────────────────────────────────────
	async call() {

		
		// Prepare Request Data
		let { request, user, data } = await prepareRequest( this.action, this.form, this.extraData )

		console.log('PREPARED DATA', data)

		// No API Keys
		if ( ! Object.keys( user.keys ).length ) {
			this.AISettings.showError( __('No API keys configured. Please set up your AI provider API keys in the settings.', 'copyspell-ai') );
			return;
		}


		// Store original content
		// ────────────────────────────────────
		if ( this.action === 'product-content' ||
			 this.action === 'marketing-content'
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
					{_type: 'original', _action: this.action }, 
					content
				);
			}
	
		}


		console.log('*************** request', { request, user, data });


		
		// API call
		// •••••••••••••••••••••••••••••••••••••
		const response = await fetch('https://copyspell.actusanima.com/v1/content', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ request, user, data })
		});
		// •••••••••••••••••••••••••••••••••••••



console.log('response', response);

				
		// Handle non-200 responses (errors before SSE stream starts)
		if (!response.ok) {
			try {
				const errorData = await response.json();
				console.error(`❌ Server error (${response.status}):`, errorData);
				this.callProgress({
					...errorData,
					status: errorData.status || 'error'
				});
				
				// Call onResult with error details
				if (errorData.status === 'error') {
					this.onResult({
						...errorData,
						products: data.products || []
					});
				}
				return; // Exit early, no stream to process
			} catch (parseError) {
				console.error('Failed to parse error response:', parseError);
				this.callProgress({
					error: `Server error (${response.status})`,
					status: 'error'
				});
				return;
			}
		}






		// Streamed response handling
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = ''; // Buffer for incomplete SSE messages
		let receivedFinalStatus = false; // Track if we got success/error
		
		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				if (!receivedFinalStatus) {
					console.warn('⚠️ Server closed connection without final status');
					this.callProgress({
						error: 'Connection lost. Server did not send final status.',
						status: 'server error',
					});
				} else {
					console.log('✅ Stream completed successfully');
				}
				break;
			}
		
			// Decode chunk and add to buffer
			buffer += decoder.decode(value, { stream: true });
			
			// Split by SSE message delimiter, but keep incomplete message in buffer
			const messages = buffer.split('\n\n');
			buffer = messages.pop() || ''; // Keep last incomplete message in buffer

			messages.forEach(message => {
				const line = message.trim();
				//if (line.startsWith('data: ')) {
					try {
						const jsonString = line.trim();
						
						// Skip empty or invalid data
						if (!jsonString || jsonString === 'undefined' || jsonString === 'null') {
							return;
						}
						
						const result = JSON.parse(jsonString);
						//console.log('Update:', result);
						try {
							this.callProgress(result);
						} catch (progressError) {
							console.error('Error in callProgress:', progressError);
						}
						
						if (result.status === 'success' || result.status === 'error' || result.status === 'server error') {
							receivedFinalStatus = true;

							if (result.content !== undefined || result.json !== undefined) {
								console.log('*************** final result', result);

								
								this.onResult({
									...result,
									products: data.products || []
								});
								
							}

						}
					} catch (parseError) {
						console.error('Failed to parse SSE JSON:', parseError.message);
						//console.error('Problematic JSON:', jsonString.substring(0, 200) + '...');
					}
				//}
			});
		}



	}





	
	// MARK: Call Progress
	// ────────────────────────────────────
	callProgress( progress ) {

		this.onProgress( progress );

	}







}





