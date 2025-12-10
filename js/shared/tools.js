import _log	 				from "./Log.js";
import noCreditsModal 		from './no-credits.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;


 

const TOOLS = {}















// MARK: Load CSS
// -----------------------------------------------------
TOOLS.loadCSS = ( href, id=null ) => {
	// Generate a unique ID if not provided
	const cssId = id || `aai-${href.split('/').pop().replace(/\W/g, '-')}`;
	// Check if CSS is already loaded
	if (document.getElementById(cssId)) {
		return;
	}
	href = window.copyspell_ai_admin ? window.copyspell_ai_admin.plugin_url + '/css/' + href : href;

	const link = document.createElement('link');
	link.id = cssId;
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = href;
	document.head.appendChild(link);
}








// MARK: Get Credits
// -----------------------------------------------------
TOOLS.getCredits = async () => {

	let savedLicense = await TOOLS.loadOption('copyspell-ai-license');
	//console.log('SAVED LICENSE', savedLicense);
	//console.log('BODY', { domain: window.location.hostname });

	
	// Prepare request data
	let request = {
		id: `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
		action: 'get-credits',
		domain: DATA.domain,
		service: "copyspell-ai",
		version: DATA.version,
		signature: DATA.signature || '',
	}

	
	// API call
	// •••••••••••••••••••••••••••••••••••••
	const response = await fetch('https://copyspell.actusanima.com/v1/credits', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			request: request,
			user : {
				license: savedLicense?.key || '',
				domain: window.location.hostname,
			},
		})
	});
	// •••••••••••••••••••••••••••••••••••••
	
	const data = await response.json();
	if ( data.error ) {
		_log('❌ Error fetching credits:', data.error || 'Unknown error');
		TOOLS.showNotification(data.error || 'Error fetching credits. Please check your license.', 'error');
	} else {
		//console.log('CREDITS DATA', data);
		TOOLS.showNotification(`License valid. Credits remaining: ${data.totalCredits}`, 'success');
		data.type = savedLicense?.type || 'free';
	}
	return data;

}





// MARK: Render Credits
// -----------------------------------------------------
TOOLS.renderCredits = async ( target ) => {
	const creditsData = await TOOLS.getCredits();
	//console.log('CREDITS DATA:', creditsData);
	if (creditsData && creditsData.status === 'success') {
		return TOOLS.displayCredits( creditsData, target );
	} else {
		let html = `
			<div class="aai-credits-error">
				<svg viewBox="0 0 24 24" width="16" height="16">
					<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
				</svg>
				<span>${creditsData?.error || __('Error loading credits', 'copyspell-ai')}</span>
			</div>
		`
		if( ! target ) return `<div class="aai-credits-display">${html}</div>`;
		$( target ).html( html );
	}
}


// MARK: Display Credits
// -----------------------------------------------------
TOOLS.displayCredits = ( data, target ) => {
	const totalCredits = data.totalCredits || 0;
	const credits = data.credits || [];
	
	if ( data.type == "lifetime" ) {
		let html = `
			<div class="aai-credit-badge aai-credit-badge-premium">
				Unlimeted Credits
			</div>
		`
		if( ! target ) return `<div class="aai-credits-display aai-credits-premium">${html}</div>`;
		$( target ).html(html).addClass('aai-credits-premium');

		return;
	}


	const typeLabels = {
		'free': 'FREE',
		'add': 'ADD',
		'bonus': 'BONUS',
		'promo': 'PROMO'
	};
	
	const typeColors = {
		'free': '#6b7280',
		'add': '#8b5cf6',
		'bonus': '#f59e0b',
		'promo': '#3b82f6'
	};
	
	let creditsHTML = `
		<a href="https://copyspell.ai/#home-pricing" target="_blank" class="aai-btn aai-btn-secondary aai-credits-refresh">
			${__('Buy Premium', 'copyspell-ai')}
		</a>
		<div class="aai-credits-container">
			<div class="aai-credits-details">`;
	
	// Display each credit type as a separate badge
	credits.forEach(credit => {
		let typeLabel = typeLabels[credit.type] || credit.type.toUpperCase();
		const typeColor = typeColors[credit.type] || '#6b7280';
		if ( typeLabel == 'ADD' ) typeLabel = 'ADDED';
		creditsHTML += `
				<div class="aai-credit-badge" style="background: ${typeColor}">
					${typeLabel}: ${credit.credits}`;
		
		// Add expiry info if exists
		if (credit.expire) {
			const expireDate = new Date(credit.expire);
			const daysUntilExpire = Math.ceil((expireDate - new Date()) / (1000 * 60 * 60 * 24));
			
			creditsHTML += `
					<span class="aai-badge-expiry">
						<svg viewBox="0 0 24 24" width="12" height="12">
							<path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
						</svg>
						${daysUntilExpire}d
					</span>`;
		}
		
		creditsHTML += `
				</div>`;
	});
	
	creditsHTML += `
			</div>
			<div class="aai-credits-main">
				<div class="aai-credits-info">
					<div class="aai-credits-total">${totalCredits.toLocaleString()}</div>
					<div class="aai-credits-label">${__('Credits', 'copyspell-ai')}</div>
				</div>
			</div>
		</div>`;
	
	if( ! target ) return `<div class="aai-credits-display">${creditsHTML}</div>`;
	$( target ).html(creditsHTML);
}
	




// MARK: Credits Needed
// -----------------------------------------------------
TOOLS.enoughCredits = (action) => {
	let creditsNeeded = 1;
	
//TOOLS.totalCredits = 50

	if ( ! TOOLS.totalCredits ) return false;


	if ( action.includes('-refine') ||
		action.includes('-change')  ) 	creditsNeeded = 1;
	if ( action.includes('keywords') ) 	creditsNeeded = 1;
	if ( action.includes('-suggest') ) 	creditsNeeded = 2;
	if ( action.includes('-suggest-descr') ) creditsNeeded = 3;
	if ( action.includes('search') )	creditsNeeded = 3;
	if ( action.includes('-content') ) 	creditsNeeded = 4;
	if ( action.includes('bulk') ) 		creditsNeeded = 6;


	if ( TOOLS.totalCredits < creditsNeeded ) return false;

	return TOOLS.totalCredits;
}
		



// MARK: Is Allowed
// -----------------------------------------------------
TOOLS.isAllowed = async ( action ) => {
	TOOLS.totalCredits = await TOOLS.getCredits();
	TOOLS.totalCredits = TOOLS.totalCredits.totalCredits
	let hasCredits = false;
	const license = await TOOLS.loadOption('copyspell-ai-license');
	if ( action ) hasCredits = TOOLS.enoughCredits( action );
	if ( license.type == 'lifetime' || hasCredits ) return true;

	noCreditsModal()

	return false;

}












// MARK: Show Notification
// -----------------------------------------------------
TOOLS.showNotification = (message, type = 'info') => {
    // Simple notification - could be enhanced with a proper notification system
    const alertClass = type === 'error' ? 'notice-error' : 'notice-success';
    const $notice = $(`<div class="notice ${alertClass} is-dismissible"><p>${message}</p></div>`);
    
    $('.aai-admin-stores').prepend($notice);
    
    setTimeout(() => {
        $notice.fadeOut(300, function() {
            $(this).remove();
        });
    }, 3000);
}






// MARK: Load Option via AJAX
// -----------------------------------------------------
TOOLS.loadOption = ( optionName ) => {
	if ( ! window.copyspell_ai_admin?.ajax_url ) {
		_log('❌ No AJAX URL provided for loading option.');
		return false;
	}
	return new Promise((resolve, reject) => {
		$.ajax({
			url: window.copyspell_ai_admin.ajax_url,
			type: 'POST',
			data: {
				action: 'copyspell_ai_load_option',
				nonce: window.copyspell_ai_admin.nonce,
				name: optionName
			},
			success: function(response) {
				if (response.success) {
					return resolve(response.data.options);
				} else {
					_log('❌ ' + (response.data?.message || 'Error loading option'), 'error');
					return resolve(false);
				}
			},
			error: function(error) {
				_log('❌ Error loading option:', error.status, error.responseText, optionName);
				return resolve(false);
			}
		});
	});
}



// MARK: Save options via AJAX
// -----------------------------------------------------
TOOLS.saveOptions = ( options, val ) => {
	let name = ''
	let dataToSave;
	if ( ! options ) {
		_log('❌ No options provided for saving.');
	}

	if ( typeof options === 'string' ) {

		name = options
		dataToSave = val;

	} else {

		dataToSave = JSON.parse(JSON.stringify( options ));
		delete dataToSave.sequences?.mainDefault;
		delete dataToSave.sequences?.keywordsDefault;
		delete dataToSave.sequences?.searchDefault;
		

	}


	if (Array.isArray(dataToSave)) {
		dataToSave = JSON.stringify( dataToSave );
	}
	

	if ( ! window.copyspell_ai_admin?.ajax_url ) {
		_log('❌ No AJAX URL provided for saving options.');
		return false;
	}



	return new Promise((resolve, reject) => {
	
		$.ajax({
			url: window.copyspell_ai_admin.ajax_url,
			type: 'POST',
			data: {
				action: 'copyspell_ai_save_settings',
				nonce: window.copyspell_ai_admin.nonce,
				options: dataToSave,
				name,
			},
			success: function(response) {
				//console.log('SAVE SETTINGS =======', name || response.data.message, response.data.options);

				if (response.success) {
					if (response.data && response.data.options) {
						return resolve( response.data.options );
					}
					return resolve( options );
				} else {
					_log('❌ ' + (response.data?.message || 'Error saving settings'), 'error');
					TOOLS.showNotification(response.data?.message || 'Error saving settings', 'error');
					return resolve( false );
				}
			},
			error: function( error ) {
				_log('❌ Error saving settings:', error.status, error.responseText);
				TOOLS.showNotification('Error saving settings. Please try again.', 'error');
				return resolve( false );
			}
		});

	})


}







// MARK: Deep merge
// -----------------------------------------------------
TOOLS.deepMerge = (target, source) => {
    // Return source if target is not an object or is null/undefined
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
        return source;
    }
    
    // Return target if source is not an object or is null/undefined
    if (!source || typeof source !== 'object') {
        return target;
    }
    
    // If source is an array, return a copy of it
    if (Array.isArray(source)) {
        return [...source];
    }
    
    // Create a copy of target to avoid mutation
    const result = { ...target };
    
    // Iterate through source properties
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = result[key];
            
            // If both are objects (and not arrays), merge recursively
            if (
                sourceValue && 
                typeof sourceValue === 'object' && 
                !Array.isArray(sourceValue) &&
                targetValue && 
                typeof targetValue === 'object' && 
                !Array.isArray(targetValue)
            ) {
                result[key] = TOOLS.deepMerge(targetValue, sourceValue);
            } else {
                // Otherwise, use source value (overwrites target)
                // For arrays, create a copy to avoid reference issues
                if (Array.isArray(sourceValue)) {
                    result[key] = [...sourceValue];
                } else if (sourceValue && typeof sourceValue === 'object') {
                    result[key] = { ...sourceValue };
                } else {
                    result[key] = sourceValue;
                }
            }
        }
    }
    
    return result;
}








// MARK: Estimate tokens
// -----------------------------------------------------
TOOLS.estimateTokens = (text, language) => {
	const charPerToken = {
		en: 4,
		es: 3.8,
		fr: 3.7,
		de: 3.5,
		el: 3.2,
		zh: 1.5,
		ja: 1.6,
		ko: 2,
		ar: 2.5,
		ru: 2.5,
		he: 2.8,
		hi: 2.5,
		th: 2.2,
		ka: 2.8,
		hr: 3.5,
		no: 3.5,
		pt: 3.8,
		default: 4
	};

  	language = language || TOOLS.detectLanguage(text);
	const avg = charPerToken[language] || charPerToken.default;
	return Math.ceil(text.length / avg);
}





// MARK: Create Element from HTML
// -----------------------------------------------------
TOOLS.createElementFromHTML = (htmlString) => {
	const div = document.createElement('div');
	div.innerHTML = htmlString.trim();
	return div.firstChild;
}



// MARK: Detect Language
// -----------------------------------------------------
TOOLS.detectLanguage = (text) => {
	const scripts = {
		el: /[Α-ωά-ώ]/g,        // Greek
		zh: /[一-龯]/g,          // Chinese
		ja: /[ぁ-んァ-ン]/g,     // Japanese
		ko: /[가-힣]/g,          // Korean
		ar: /[ء-ي]/g,           // Arabic
		ru: /[а-яё]/gi,         // Russian
		he: /[א-ת]/g,           // Hebrew
		hi: /[अ-ह]/g,           // Hindi
		th: /[ก-๙]/g,           // Thai
		ka: /[ა-ჰ]/g,           // Georgian
		hr: /[čšžćđ]/gi,        // Croatian/Serbian Latin
		no: /[øæå]/gi,          // Norwegian
		de: /[ßüöä]/g,          // German
		fr: /[éèêëàâä]/g,       // French
		es: /[áéíóúüñ]/g,       // Spanish
		pt: /[ãõç]/g            // Portuguese
	};


	const counts = {};

	for (const [lang, regex] of Object.entries(scripts)) {
		const matches = text.match(regex);
		counts[lang] = matches ? matches.length : 0;
	}

	// Find the language with the most matches
	let topLang = 'en';
	let maxCount = 0;

	for (const [lang, count] of Object.entries(counts)) {
		if (count > maxCount) {
		maxCount = count;
		topLang = lang;
		}
	}

	// Only switch away from English if significant
	const totalChars = text.length;
	const threshold = 0.3; // e.g. at least 30% of characters must be non-English

	if (maxCount / totalChars >= threshold) {
		return topLang;
	}
	

	return 'en';
}









// MARK: AI Models
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOLS.models = ( models, action = 'id', action2 ) => {



	return getModelById(action, action2);


	function getModelById(property, property2) {

		if ( property2 ) {
			return models.map(model => { return {
				[property] : model[property],
				[property2] : model[property2]
			}});
		}

		return models.map(model => model[property]);
	}

}














if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', async () => {
				
		if (!TOOLS.totalCredits && TOOLS.totalCredits !== 0) {
			//TOOLS.totalCredits = await TOOLS.getCredits();
			//TOOLS.totalCredits = TOOLS.totalCredits.totalCredits
		}
	});
} else {
	(async () => {

		if (!TOOLS.totalCredits && TOOLS.totalCredits !== 0) {
			//TOOLS.totalCredits = await TOOLS.getCredits();
			//TOOLS.totalCredits = TOOLS.totalCredits.totalCredits
		}
	})();
}




// -----------------------------------------------------
export default TOOLS;














