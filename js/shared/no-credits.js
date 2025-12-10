// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;





//console.log('DATA', DATA)


// MARK: Trial Expired Modal
// ────────────────────────────────────
export default async function noCreditsModal() {
	//return new Promise(async (resolve, reject) => {


		// Create modal overlay
		const modalOverlay = document.createElement('div');
		modalOverlay.className = 'aai-modal-overlay';

		// Create modal
		const modal = document.createElement('div');
		modal.className = 'aai-modal';

		// Create modal content
		const modalContent = document.createElement('div');
		modalContent.className = 'aai-modal-content';


		// Create logo container
		const logoDiv = document.createElement('div');
		logoDiv.className = 'aai-modal-logo';
		logoDiv.textContent = "CopySpell AI";
		const modalLogo = document.createElement('img');
		modalLogo.src = DATA.logo;
		logoDiv.appendChild(modalLogo);


		// Create modal title
		const modalTitle = document.createElement('h2');
		modalTitle.className = 'aai-modal-title';
		modalTitle.textContent = __(`You don't have enough credits.`, 'copyspell-ai');


		// Create modal text
		const modalText = document.createElement('p');
		modalText.className = 'aai-modal-text';
		modalText.textContent = __("Your credits are not enough for this action. Upgrade to the Premium License to get unlimited generations, priority support and lifetime updates.", 'copyspell-ai');


	

		
		// Create offer container
		const offerDiv = document.createElement('div');
		offerDiv.style.cssText = 'text-align: center; margin-top: 15px; padding: 20px; border-radius: 16px; background: #DDD;';

		// Create modal label
		const modalLabel = document.createElement('label');
		modalLabel.className = 'aai-modal-label';
		modalLabel.textContent = __('LIMITED TIME', 'copyspell-ai');
	

		// Create price container
		const priceDiv = document.createElement('div');
		priceDiv.className = 'aai-modal-price';
		const priceOld = document.createElement('div');
		priceOld.className = 'aai-modal-price-old';
		priceOld.textContent = '€600';
		const priceNew = document.createElement('div');
		priceNew.className = 'aai-modal-price-new';
		priceNew.textContent = '€400';


		// Create modal offer note
		const modalNote = document.createElement('div');
		modalNote.className = 'aai-modal-note aai-modal-offer-note';
		modalNote.textContent = __('Early Bird Offer', 'copyspell-ai');
	




		// Create buttons container
		const buttonsDiv = document.createElement('div');
		buttonsDiv.className = 'aai-modal-buttons aai-modal-buttons-upgrade';
		buttonsDiv.style.cssText = 'margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;';

		// Create upgrade button
		const applyBtn = document.createElement('button');
		applyBtn.textContent = __('Upgrade to Premium', 'copyspell-ai');
		applyBtn.className = 'aai-btn aai-btn-primary medium';

		// Create cancel button
		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = __('Maybe later', 'copyspell-ai');
		cancelBtn.className = 'aai-btn aai-btn-secondary medium';


		
		// Create modal note
		const modalNote2 = document.createElement('div');
		modalNote2.className = 'aai-modal-note';
		modalNote2.textContent = __("One-time payment • No AI subscription • No monthly fees", 'copyspell-ai');
	




		// Assemble modal
		buttonsDiv.appendChild(applyBtn);
		buttonsDiv.appendChild(cancelBtn);
		modalContent.appendChild(logoDiv);
		modalContent.appendChild(modalTitle);
		modalContent.appendChild(modalText);
		/*
		modalContent.appendChild(offerDiv);
		offerDiv.appendChild(modalLabel);
		offerDiv.appendChild(priceDiv);
		offerDiv.appendChild(modalNote);
		*/
		priceDiv.appendChild(priceOld);
		priceDiv.appendChild(priceNew);
		modalContent.appendChild(buttonsDiv);
		modalContent.appendChild(modalNote2);
		modal.appendChild(modalContent);
		modalOverlay.appendChild(modal);

		// Add to body
		document.body.appendChild(modalOverlay);
		setTimeout(() => {
			modalOverlay.classList.add('active');
		}, 10);

		// Focus textarea

		// Event handlers
		cancelBtn.onclick = () => {
			document.body.removeChild(modalOverlay);
			reject('cancelled');
		};

		applyBtn.onclick = () => {
			document.body.removeChild(modalOverlay);
			window.open('https://copyspell.ai/#home-pricing', '_blank');
			return true;
			//resolve(true);
		};

		// Close on overlay click
		modalOverlay.onclick = (e) => {
			if (e.target === modalOverlay) {
				document.body.removeChild(modalOverlay);
				return false
				//resolve(false);
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
				return false
				//resolve(false);
				//reject('cancelled');
			}
		});
		


		
	//})
}
