import SVG 				from "../shared/svg.js";
import TOOLS            from "../shared/tools.js";
import AIH 				from "../shared/AI/ai-helpers.js";
import _log	 			from "../shared/Log.js";
// -----------------------------------------------------
const DATA = JSON.parse(JSON.stringify(window.copyspell_ai_admin || {}));
const { __, _x, _n, sprintf } = wp.i18n;
let $ = jQuery;


// Load the CSS file
TOOLS.loadCSS(`settings.css?v=${DATA.version}`);




let settings = {
	key			: '',
	status		: 'no key',
	email 		: '',
	expires 	: '',
	activations : '',
	trialleft   : 0,
	end 	    : null,
	plan 	    : '',
};
let licenseAPI = DATA.license_api_url || '';




// MARK: Admin License
// -----------------------------------------------------
export default async function AdminLicense() {

	// Load the license settings from options
	// -----------------------------------------------------
	let savedLicense = await TOOLS.loadOption('copyspell-ai-license');
	if ( savedLicense ) settings = savedLicense;

	//console.log("Settings:", settings);

	const adminContainer = $('.copyspell-ai-tab-content');
	if (adminContainer.length) {
		adminContainer.html( licenseHTML() );
		licenseEvents();
		if ( settings.key ) {
			await validateLicenseKey(settings.key)
		}
		showLicenseStatus();
	}



	//TOOLS.saveOptions('aai-test-2', {a: 'test value'});


}








// MARK: EVENTS
// -----------------------------------------------------
function licenseEvents() {
	const tab = document.querySelector('[data-tab="license"]');
	const testButton = tab.querySelector('.aai-test-button');
	const deactivateButton = tab.querySelector('.aai-deactivate-button');
	const licenseInput = tab.querySelector('#license_key');
	const statusElement = tab.querySelector('.aai-license-status');



	// Input change event
	licenseInput.addEventListener('input', () => {
		document.querySelector('[data-tab="license"] .aai-deactivate-button').style.display = 'none';
		const licenseKey = licenseInput.value.trim();
		if ( licenseKey ) {
			testButton.style.display = 'inline-block';
			statusElement.style.display = 'none';
			testButton.textContent = __('Activate', 'copyspell-ai');
		} else {
			testButton.style.display = 'none';
			testButton.style.display = 'inline-block';
			testButton.textContent = __('Save', 'copyspell-ai');
			statusElement.style.display = 'inline-flex';
			settings.status = 'no key';
			showLicenseStatus()
		}
		settings.key = licenseKey;
	})



	// Test button
	testButton.addEventListener('click', async (e) => {
		e.preventDefault();
		testButton.disabled = true;
		testButton.innerHTML = SVG.loader8;
		const licenseKey = licenseInput.value.trim();
		//if (licenseKey) {
			// Call the function to check the license key
			await validateLicenseKey(licenseKey);
			statusElement.style.display = 'inline-flex';
			testButton.textContent = __('Activate', 'copyspell-ai');
			testButton.disabled = false;
			testButton.style.display = 'none';
		//}
		showLicenseStatus()
	});


	// Deactivate button
	deactivateButton.addEventListener('click', async (e) => {
		e.preventDefault();
		let r = confirm(__('Are you sure you want to deactivate your license key? The key will be cleared. Make sure you have a copy available.', 'copyspell-ai'));
		if ( ! r ) return;
		deactivateButton.disabled = true;
		deactivateButton.innerHTML = SVG.loader8;
		const licenseKey = licenseInput.value.trim();
		licenseInput.value = ''
		settings.key = '';
		if (licenseKey) {
			// Call the function to check the license key
			await deactivateLicenseKey(licenseKey);
			statusElement.style.display = 'inline-flex';
			deactivateButton.textContent = __('Deactivate', 'copyspell-ai');
			deactivateButton.disabled = false;
			deactivateButton.style.display = 'none';
		}
		showLicenseStatus()
	});


	$('body').on('click', '.aai-addons-item', function() {
		const $el = $(this);
		const addon = $el.attr('alt');
		let extensions = window.CopyspellAI.getExtensions();
		let csi_installed = extensions.find(ext => ext.id == 'copyspell-images')
		if ( csi_installed ) return;

		$.post(ajaxurl, {
			action: 'copyspell_install_addon',
			addon: 'copyspell-images',
			url: 'https://license.actusanima.com/copyspell-ai/addons/copyspell-images/'
		}).done(function (response) {
			if (response.success) {
				$el.find('.aai-toggle').addClass('aai-active');
				console.log('Success response:', response);
				alert('Add-on installed successfully');
			} else {
				console.log('Error response:', response);
				alert('Error: ' + response.data);
			}
		});
	
	});

	
	$('body').on('click', '.aai-addons-item .aai-toggle', function( e ) {
		const addon = $(this).parent().attr('alt');
		let extensions = window.CopyspellAI.getExtensions();
		let csi_installed = extensions.find(ext => ext.id == 'copyspell-images')
		if ( !csi_installed ) return;

		e.stopPropagation();

		$(this).removeClass('aai-active');
		$.post(ajaxurl, {
			action: 'copyspell_uninstall_addon',
			addon: 'copyspell-images',
			nonce: DATA.nonce,
		}).done(function (response) {
			if (response.success) {
				console.log('Success response:', response);
				alert('Add-on uninstalled successfully');
				windows.location.reload();
			} else {
				console.log('Error response:', response);
				alert('Error: ' + response.data);
				windows.location.reload();
			}
		}).catch( (err) => {
			_log('❌ ' + err.status, err.statusText, err.responseText);
		})

	})


}






const CACHE_KEY = 'copyspell_ai_license_check';
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
//localStorage.setItem(CACHE_KEY, ''); // Clear cache on load

// MARK: Check License Key
// -----------------------------------------------------
export async function checkLicenseKey() {
	let check;
	
	// Check cache
	let cachedData = localStorage.getItem(CACHE_KEY);
	//cachedData = null
	if (cachedData) {
		cachedData = JSON.parse(cachedData);
		const { timestamp, data, status } = cachedData;
		if ( status && status != 'trial' ) {
			if (Date.now() - timestamp < CACHE_DURATION) {
				check = data;
			}
		}
	}
	cachedData = cachedData || {}
	//_log('-------- cachedData', cachedData)

	
	if (typeof check === 'undefined') {
		let license = await TOOLS.loadOption('copyspell-ai-license') || {};
		check = await validateLicenseKey(license?.key);
		license = await TOOLS.loadOption('copyspell-ai-license') || {};
	
		if ( typeof cachedData == 'string' )
			cachedData = JSON.parse(cachedData)
		cachedData.status = license.status;
		//_log('-------- license', license)

		localStorage.setItem(CACHE_KEY, JSON.stringify({
			timestamp: Date.now(),
			status: license.status,
			data: check
		}));


	}

	//console.log('-------- cachedData.status', cachedData.status)
	// EXPIRED TRIAL
	if ( cachedData.status == 'expired trial' ) {
		//alert('EXPIRED TRIAL');
		check = 'expired trial';
	}

	
	_log('LICENSE check: ' + check)
	return check;

}





// MARK: Deactivate License Key
// -----------------------------------------------------
export async function deactivateLicenseKey( key ) {
	key = key || settings.key;
	if ( !key ) return false

	let data = {};


	try {

		// API call
		const response = await fetch(licenseAPI + '/license/deactivate', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				licenseKey: key,
				domain: DATA.siteUrl.replace(/^https?:\/\//, ''),
				pluginId: 'copyspell-ai',
			})
		});
		data = await response.json();

		
		settings.key = '';
		settings.status = 'no key';
		settings.activations = data.activationsCount + ' / ' + data.maxActivations;

		showLicenseStatus()
		await TOOLS.saveOptions('copyspell-ai-license', settings)
		await TOOLS.saveOptions('copyspell_ai_license_status', {
			status: 'no key',
			expires: data.expires || '',
			activationsCount: data.activationsCount,
			maxActivations: data.maxActivations,
		})




	// Catch network or API errors
	} catch (error) {

		_log('❌ Network or API error:', error);

	}

	return data;
}




// MARK: Validate License Key
// -----------------------------------------------------
export async function validateLicenseKey( key ) {
	key = key || settings.key;
	//if ( !key ) return false
	settings.key = key;

	let data = {};

	try {

		// API call
		const response = await fetch(licenseAPI + '/license/validate', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				licenseKey: key,
				domain: DATA.siteUrl.replace(/^https?:\/\//, ''),
				pluginId: 'copyspell-ai',
			})
		});
		data = await response.json();

		settings.email = data.email || '';
		settings.expires = data.expires || '';
		settings.activations = ''
		settings.isSiteActivated = data.isSiteActivated || false;
		settings.plan = data.plan || '';
		settings.end = data.end || null;
		settings.type = data.type || null;

		// Success
		if (response.ok && data.success) {
			//console.log("License validation OK:", data);

			settings.status = data.status

			if ( data.maxActivations && data.maxActivations > 1 ) {
				settings.activations = data.activationsCount + ' / ' + data.maxActivations;
			}

			if ( data.status == 'trial' ) settings.trialleft = data.maxActivations


		// Error
		} else {
			
			//console.log("License validation failed:", data);
			settings.status = 'inactive';
			if (data.code == "NOT_FOUND") settings.status = 'invalid'; 
			if (data.code == "EXPIRED") settings.status = 'expired'; 
			if (data.code == "DEACTIVATED") settings.status = 'deactivated'; 
			if (data.code == "REVOKED") settings.status = 'inactive'; 
			if (data.code == "MAX_ACTIVATIONS") settings.status = 'max activations reached'; 
			if (data.code == "EXPIRED_TRIAL") settings.status = 'expired trial'; 

		}



	// Catch network or API errors
	} catch (error) {

		_log('❌ Network or API error:', error);
		settings.status = 'inactive';

	// Finalize
	} finally {

		
		showLicenseStatus()
		await TOOLS.saveOptions('copyspell-ai-license', settings)
		await TOOLS.saveOptions('copyspell_ai_license_status', {
			status: settings.status,
			expires: settings.expires,
			activationsCount: data.activationsCount,
			maxActivations: data.maxActivations,
		})

		//activateButton.prop('disabled', false).text('Activate License');
		//deactivateButton.prop('disabled', false);
	}

	let check = false
	if ( settings.status == 'active' ) check = true
	if ( settings.status == 'trial' && data.maxActivations > 0 ) check = true


	localStorage.setItem(CACHE_KEY, JSON.stringify({
		timestamp: Date.now(),
		data: check
	}));

	return check;

}


















// MARK: License Status
// -----------------------------------------------------
function showLicenseStatus( status ) {
	let tab = document.querySelector('[data-tab="license"]');
	if ( ! tab ) return;
	const statusElement = tab.querySelector('.aai-license-status');
	const helpElement = tab.querySelector('.aai-form-help');
	const testButton = tab.querySelector('.aai-test-button');
	

	status = status || settings.status || 'no key';
	let statusText = status;
	let clss = '';

	// Format the expiration date as DD/MM/YYYY
	let expires = '';
	if (settings.expires) {
		const date = new Date(settings.expires);
		if (!isNaN(date)) {
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			expires = `${day}/${month}/${year}`;
		} else {
			expires = settings.expires;
		}
	}
	

	document.querySelector('[data-tab="license"] .aai-info-btn').style.display = 'none';
	document.querySelector('[data-tab="license"] .aai-deactivate-button').style.display = 'none';

	//console.log("Settings:", settings);
	//console.log("License Status:", status);


	switch (status) {
		case 'no key':
			statusText = __('You have not entered a license key yet.', 'copyspell-ai');
			clss = 'aai-chip-purple';
			break;
		case 'active':
			clss = 'aai-chip-green';
			statusText = __('Licensed to:', 'copyspell-ai') + ' <b>' + settings.email + '</b><br>'
			//if ( expires ) statusText += __('Expires at:', 'copyspell-ai') + ' <b>' + expires + '</b><br>';
			if ( settings.end ) {
				const endDate = new Date(settings.end * 1000);
				if (!isNaN(endDate)) {
					const day = String(endDate.getDate()).padStart(2, '0');
					const month = String(endDate.getMonth() + 1).padStart(2, '0');
					const year = endDate.getFullYear();
					statusText += __('Expires at:', 'copyspell-ai') + ' <b>' + `${day}/${month}/${year}` + '</b><br>';
				} else {
					statusText += __('Expires at:', 'copyspell-ai') + ' <b>' + settings.end + '</b><br>';
				}
				statusText += `<br><a href="https://billing.stripe.com/p/login/7sY14mfvofQ86Gbgtf2go00?prefilled_email=${settings.email}" target="_blank" rel="noopener" class="aai-btn-2 aai-btn-2-primary">${__('Manage Your Subscription', 'copyspell-ai')}</a>`
			}
			if ( settings.activations ) {
				statusText += __('Activations:', 'copyspell-ai') + ' <b>' + settings.activations + '</b>';
			}
			break;
		case 'trial':
			clss = 'aai-chip-purple';
			statusText = __('Trial License:', 'copyspell-ai') + ' <b>' + settings.email + '</b><br>'
			if ( settings.trialleft ) {
				statusText += __('Remaining requests:', 'copyspell-ai') + ' <b>' + settings.trialleft + '</b>';
			}
			break;
		case 'expired':
			statusText = __('Your license key has expired.', 'copyspell-ai');
			statusText += `<br><br><a href="https://billing.stripe.com/p/login/7sY14mfvofQ86Gbgtf2go00?prefilled_email=${settings.email}" target="_blank" rel="noopener" class="aai-btn-2 aai-btn-2-primary">${__('Renew Your Subscription', 'copyspell-ai')}</a>`
			clss = 'aai-chip-red';
			break;
		case 'expired_trial':
			statusText = __('Your trial has expired.', 'copyspell-ai');
			clss = 'aai-chip-red';
			break;
		case 'invalid':
			statusText = __('Your license key is invalid.', 'copyspell-ai');
			clss = 'aai-chip-red';
			break;
		case 'inactive':
			statusText = __('Your license key is inactive.', 'copyspell-ai');
			clss = 'aai-chip-red';
			break;
		case 'deactivated':
			statusText = __('Your license key has been deactivated.', 'copyspell-ai');
			clss = 'aai-chip-orange';
			break;
		case 'revoked':
			statusText = __('Your license key has been revoked.', 'copyspell-ai');
			clss = 'aai-chip-red';
			break;
		default:
			statusText = __('You have not entered a license key yet.', 'copyspell-ai');
			clss = 'aai-chip-purple';
			break;
	}

	if ( status != 'active' && status != 'trial' && status != 'expired' ) document.querySelector('[data-tab="license"] .aai-info-btn').style.display = 'inline-block';
	else if ( status == 'active' ) document.querySelector('[data-tab="license"] .aai-deactivate-button').style.display = 'inline-block';


	if ( status == 'deactivated' && settings.key ) {
		testButton.style.display = 'inline-block';
	}

	helpElement.innerHTML = statusText;
	statusElement.classList = 'aai-chip aai-license-status ' + clss;
	statusElement.innerHTML = __(status, 'copyspell-ai') || status;



	// Remove any existing warning elements
	const existingWarnings = helpElement.parentNode.querySelectorAll('.aai-warning');
	existingWarnings.forEach(warning => warning.remove());
	if ( status == 'active' || status == 'trial' ) {
		let validProviders = AIH.validProviders();
		if ( ! validProviders.length ) {
			let apiButton = `<button class="aai-action-btn aai-btn-2-primary" data-action="apiKey">${__('Settings', 'copyspell-ai')}</button>`
			let html = `
				<div class="aai-warning aai-big aai-api-warning">
					${__('Now you need an AI API key.', 'copyspell-ai')}<br>
					<strong>${__('Get a free API key from Google', 'copyspell-ai')}</strong> ${__('and add it in the Settings tab.', 'copyspell-ai')}<br><br>
					${apiButton}
				</div>`;
			helpElement.innerHTML += '<br><br>';
			helpElement.insertAdjacentHTML('afterend', html);
			// Add click event to API warning button
			document.querySelector('.aai-api-warning').addEventListener('click', (e) => {
				e.preventDefault();
				$('.copyspell-ai-nav-tab[alt="settings"]').trigger('click');
			});
		}
	}


}




// MARK: HTML
// -----------------------------------------------------
function licenseHTML() {

	return `
		<div class="aai-admin-settings">
			
			<!-- Settings Header -->
			<div class="aai-settings-header">
				<h1 class="aai-settings-title">
					<span class="aai-title-icon">${SVG.license}</span>
					${__('License', 'copyspell-ai')}
				</h1>
			</div>



			<!-- License Tabs -->
			<div class="aai-settings-tabs">
	
			</div>





			<!-- Settings Form -->
			<form id="aai-settings-form" class="aai-settings-form">
				
			   

				${tabLicense()}

				${tabAddons()}


				<!-- Form Actions -->
				<div class="aai-settings-actions">
				</div>

				
			</form>
		</div>
	`;

}
			/*
			<div class="aai-settings-actions">
				<button type="submit" class="aai-btn-2 aai-save-settings aai-btn-2-primary">
					${SVG.save} ${__('Save Settings', 'copyspell-ai')}
				</button>
			</div>
			*/


// MARK: Tab Addons
// -----------------------------------------------------
function tabAddons() {
	return "";

	let extensions = window.CopyspellAI.getExtensions();
	let csi_installed = extensions.find(ext => ext.id == 'copyspell-images')

	let html = `
	<!-- Addons-->
	<div class="aai-settings-tab-content active" data-tab="addons">

		<div class="aai-section">
			<div class="aai-form-group">
				<label class="aai-label" for="add_ons">${__('Add Ons', 'copyspell-ai')}</label>
				<div class="aai-addons-list actus-flex">
					<div class="aai-addons-item" alt="copyspell-images">
						<div class="aai-icon">${SVG.image}</div>
						<h3>CopySpell Images</h3>
						<div class="aai-toggle${ csi_installed ? ' aai-active' : '' }"><i></i></div>
						${ csi_installed ? '<div class="aai-note">Active</div>'
							: 'click to install' }	
					</div>
				</div>
			</div>

		</div>
			

	</div>
	`

	return html

}

// MARK: Tab License
// -----------------------------------------------------
function tabLicense() {

	return `
	<!-- License Tab -->
	<div class="aai-settings-tab-content active" data-tab="license">
		<div class="aai-section">
			<div class="aai-form-group">
				<label class="aai-label" for="license_key">${__('License key', 'copyspell-ai')}</label>
				<div class="actus-flex">
					<input type="text"
							class="aai-input"
							id="license_key"
							name="license_key"
							value="${settings.key || ''}"
							autocomplete="off"
							placeholder="${__('Enter your license key', 'copyspell-ai')}">
					<div class="aai-chip aai-license-status"></div>
					<button class="aai-btn-big aai-test-button">${__('Activate', 'copyspell-ai')}</button>
					<button class="aai-btn-big aai-deactivate-button">${__('Deactivate', 'copyspell-ai')}</button>
				</div>
				
				<small class="aai-form-help"></small>
				<br>
				<a href="https://copyspell.ai/#home-pricing" target="_blank" rel="noopener" class="aai-btn-2 aai-btn-outline aai-info-btn">${__('Get a License Key from Actus Works', 'copyspell-ai')}</a>
			</div>
		</div>
	</div>
	`

}
