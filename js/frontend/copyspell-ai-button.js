
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━






// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: ACTUS-AI Button
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function copyspellAIButton( onClick = ()=>{} ) {
	// Check if the button already exists
	if (document.querySelector('.copyspell-ai-button-wrapper')) {
		return;
	}

	// Create the wrapper
	const wrapper = document.createElement('div');
	wrapper.className = 'copyspell-ai-button-wrapper';

	// Create the button element
	const button = document.createElement('button');
	button.className = 'copyspell-ai-button';
	button.textContent = 'CopySpell AI';
	button.title = 'CopySpell AI - Generate content with AI';

	// Add click event listener
	button.addEventListener('click', onClick);

	// Append the button to the wrapper
	wrapper.appendChild(button);

	// Append the wrapper to the body
	document.body.appendChild(wrapper);

	return button;
}