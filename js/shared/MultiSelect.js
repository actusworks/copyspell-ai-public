import TOOLS            	from "./tools.js";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;



// Load the CSS file
TOOLS.loadCSS(`multi-select.css?v=${DATA.version}`);



/*
MultiSelect({
	name: 'audiences',
	values: this.options.audiences.map((a,i) => this.optionsEn.audiences[i]),
	titles: this.options.audiences.map((a,i) => a),
	onChange: (value, selected, action) => {
		if ( action === 'add' ) {}
		if ( action === 'remove' ) {}
	}
})
*/




// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: Multi Select
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class MultiSelect {

	
	// ────────────────────────────────────
	constructor( args ) {

		// Set values and titles
		this.values = args.values || [];
		this.titles = args.titles || args.values.map(v => v); // Fallback to values if titles not provided
		if ( ! this.values.length ) return;


		this.element= null;
		// Ensure this.value is an array, even if a single value is passed
		this.value 	= Array.isArray(args.value) ? args.value : (args.value ? args.value.split(',').map(v => v.trim()) : []);
		this.name 	= args.name || 'multi-select-' + Math.random().toString(36).substr(2, 4);
		this.var 	= args.var || args.name;
		this.label 	= args.label || '';
		this.icon 	= args.icon || '';
		this.placeholder 		= args.placeholder || 'Select...';
		this.searchPlaceholder 	= args.searchPlaceholder || 'Search or add...';
		this.onChange 			= args.onChange || (() => {});
		this.onNewItem 			= args.onNewItem || (() => {});
        this.allowCreate 		= args.allowCreate || false; // New option to enable creating new items
        this.createLabel 		= args.createLabel || 'Add'; // Label for create button


		// This line is no longer used by create(), but kept for potential other uses
		//this.options = args.values.map((val,i) => `<option value="${val}">${args.titles[i]}</option>`).join('');

		this.create()

	}


	// MARK: Get Value
	// ────────────────────────────────────
	getValue() {
		return this.value || [];
	}


	// MARK: Get Title from Value
	// ────────────────────────────────────
	getTitle(value) {
		const valueIndex = this.values.indexOf(String(value));
		if (valueIndex > -1 && this.titles[valueIndex]) {
			return this.titles[valueIndex];
		}
		// Fallback to capitalized value if title not found
		return this.capitalizeWords(String(value));
	}
	
	
	// MARK: On Change Value
	// ────────────────────────────────────
	changeValue( changed, action ) {

		document.querySelector(`input[name="${this.var}"]`).value = this.value.join(', ');
		this.onChange( this.value, changed, action );

	}


	// MARK: Create HTML
	// ────────────────────────────────────
	create() {

		this.element = document.createElement('div');
		this.element.className = `aai-group aai-${this.name}`;

		let HTML = ``
		if ( this.label )
			HTML += `<label class="aai-label" for="multi-select-${this.var}">${this.icon}${this.label}</label>`;
		HTML += `
			<div class="aai-multi-select" id="multi-select-${this.name}">
				<button type="button" class="aai-multi-select-btn">
					<span class="aai-multi-select-placeholder">${this.placeholder}</span>
					<div class="aai-multi-select-arrow">
						<svg viewBox="0 0 24 24" fill="currentColor">
							<path d="M7 10l5 5 5-5z"/>
						</svg>
					</div>
				</button>
				<div class="aai-multi-select-dropdown">
					<input type="text" class="aai-multi-select-search" placeholder="${this.searchPlaceholder}">
					<div class="aai-multi-select-options">
						${this.generateOptions()}
					</div>
				</div>
			</div>
			<div class="aai-multi-select-chips"></div>
			<input hidden id="${this.var}" name="${this.var}" type="text">
		`;
		
		
		this.element.innerHTML = HTML;


		this.html = `<div class="aai-group aai-${this.name}">${HTML}</div>`;

		requestAnimationFrame(() => {
			this.events()
		})

	}


	// MARK: Event Handling
	// ────────────────────────────────────
	events() {
		const group = document.querySelector(`.aai-group.aai-${this.name}`);
		if (!group) return;
		const btn = group.querySelector('.aai-multi-select-btn');
		const dropdown = group.querySelector('.aai-multi-select-dropdown');
		const search = group.querySelector('.aai-multi-select-search');
		const optionsContainer = group.querySelector('.aai-multi-select-options');
		const chipsContainer = group.querySelector('.aai-multi-select-chips');
		let isOpen = false;

		let self = this; // Reference to the MultiSelect instance

		// Toggle dropdown
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			toggleDropdown();
		});

		// Search functionality
		search.addEventListener('input', (e) => {
			filterOptions(e.target.value);
		});

		// Option selection
		optionsContainer.addEventListener('click', (e) => {
			const option = e.target.closest('.aai-multi-select-option:not(.separator)');
            if (option) {
                if (option.classList.contains('create-new')) {
                    createNewItem();
                } else {
                    toggleOption(option);
                }
            }
		});

		// Keyboard navigation
        optionsContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                const option = e.target.closest('.aai-multi-select-option:not(.separator)');
                if (option) {
                    if (option.classList.contains('create-new')) {
                        createNewItem();
                    } else {
                        toggleOption(option);
                    }
                }
            }
        });

        // Handle Enter key in search input to create new items
        search.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && self.allowCreate) {
                e.preventDefault();
                e.stopPropagation();
                const searchTerm = e.target.value.trim();
                if (searchTerm && !self.values.map(v => String(v).toLowerCase()).includes(searchTerm.toLowerCase())) {
                    createNewItemWithValue(searchTerm);
                }
            }
        });

		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
				closeDropdown();
			}
		});

		// Close dropdown on escape
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && isOpen) {
				closeDropdown();
				btn.focus();
			}
		});

		
		// ────────────────────────────────────

        function createNewItem() {
            const searchTerm = search.value.trim();
            if (searchTerm) {
                createNewItemWithValue(searchTerm);
            }
        }

        function createNewItemWithValue(value) {
            // Check if item already exists
            if (self.values.map(v => String(v).toLowerCase()).includes(value.toLowerCase())) {
                return;
            }

            // Add to values and titles arrays
            self.values.push(value);
            self.titles.push(value);

            // Add to selected values
            self.value.push(value);
            self.changeValue(value, 'add');

			self.onNewItem(value); // Call the onNewItem callback

            // Add chip
            addChip(value);

            // Update button text
            updateButtonText();

            // Clear search and regenerate options
            search.value = '';
            regenerateOptions();
            filterOptions('');

            // Close dropdown
            closeDropdown();
        }

        function regenerateOptions() {
            optionsContainer.innerHTML = self.generateOptions();
        }

		function toggleDropdown() {
			if (isOpen) {
				closeDropdown();
			} else {
				openDropdown();
			}
		}

		function openDropdown() {
			isOpen = true;
			btn.classList.add('active');
			dropdown.classList.add('show');
			setTimeout(() => {
				search.focus();
			}, 50);
		}

		function closeDropdown() {
			isOpen = false;
			btn.classList.remove('active');
			dropdown.classList.remove('show');
			search.value = '';
			filterOptions(''); // Reset filter
		}

		function toggleOption(option) {
			const value = option.dataset.value;
			const isSelected = option.classList.contains('selected');

			if (isSelected) {
				// Remove selection
				option.classList.remove('selected');
				self.value = self.value.filter(a => String(a) !== String(value));
				self.changeValue(value, 'remove');
				// Remove chip
				removeChip(value);
			} else {
				// Add selection
				option.classList.add('selected');
				self.value.push(value);
				self.changeValue(value, 'add');
				addChip(value);
			}

			updateButtonText();
		}

		function addChip(value) {
			const title = self.getTitle(value);
			const chip = document.createElement('div');
			chip.className = 'aai-multi-select-chip';
			chip.dataset.value = value;
			chip.innerHTML = `
				<span>${title}</span>
				<button type="button" class="aai-multi-select-chip-remove" data-value="${value}" title="Remove ${title}">
					×
				</button>
			`;

			// Add remove functionality
			chip.querySelector('.aai-multi-select-chip-remove').addEventListener('click', (e) => {
				e.stopPropagation();
				const valueToRemove = e.target.dataset.value;
				removeChip(valueToRemove);
				// Update option state
				const option = optionsContainer.querySelector(`[data-value="${valueToRemove}"]`);
				if (option) {
					option.classList.remove('selected');
				}
				self.value = self.value.filter(a => String(a) !== String(valueToRemove));
				self.changeValue(valueToRemove, 'remove');
				updateButtonText();
			});

			chipsContainer.appendChild(chip);
		}

		function removeChip(value) {
			const chip = chipsContainer.querySelector(`[data-value="${value}"]`);
			if (chip) {
				chip.style.animation = 'chipSlideOut 0.2s ease forwards';
				setTimeout(() => {
					if (chip.parentNode) {
						chip.parentNode.removeChild(chip);
					}
				}, 200);
			}
		}

		function updateButtonText() {
			const btnText = btn.querySelector('.aai-multi-select-placeholder, .aai-multi-select-text');
			const count = self.value.length;

			if (count === 0) {
				btnText.textContent = self.placeholder;
				btnText.className = 'aai-multi-select-placeholder';
			} else if (count === 1) {
				btnText.textContent = self.getTitle(self.value[0]);
				btnText.className = 'aai-multi-select-text';
			} else {
				const labelText = self.label || 'Items';
				btnText.innerHTML = `
					<span class="aai-multi-select-text"><span class="aai-multi-select-label">${labelText}</span> <span class="aai-multi-select-count">${count}</span> ${count === 1 ? __('selection', 'copyspell-ai') : __('selections', 'copyspell-ai')}</span>
					
				`;
				btnText.className = 'aai-multi-select-text';
			}
		}

		function filterOptions(searchTerm) {
			const options = optionsContainer.querySelectorAll('.aai-multi-select-option');
			const term = searchTerm.toLowerCase();
			let hasVisibleOptions = false;

			options.forEach(option => {
				if (option.classList.contains('separator')) {
					option.style.display = 'block';
					return;
				}

                if (option.classList.contains('create-new')) {
                    // Show create option only if allowCreate is true and search term doesn't match existing items
                    const shouldShowCreate = self.allowCreate && 
                        searchTerm.trim() && 
                        !self.values.map(v => String(v).toLowerCase()).includes(term);
                    option.style.display = shouldShowCreate ? 'flex' : 'none';
                    if (shouldShowCreate) {
                        option.querySelector('span').textContent = `${self.createLabel} "${searchTerm}"`;
                        hasVisibleOptions = true;
                    }
                    return;
                }

				const text = option.textContent.toLowerCase();
				const matches = text.includes(term);
				option.style.display = matches ? 'flex' : 'none';
				
				if (matches) {
					hasVisibleOptions = true;
				}
			});

			// Show/hide no results message
			let noResults = optionsContainer.querySelector('.aai-multi-select-no-results');
			if (!hasVisibleOptions && searchTerm) {
				if (!noResults) {
					noResults = document.createElement('div');
					noResults.className = 'aai-multi-select-no-results';
					noResults.textContent = 'No items found';
					optionsContainer.appendChild(noResults);
				}
				noResults.style.display = 'block';
			} else if (noResults) {
				noResults.style.display = 'none';
			}
		}

		// --- START: INITIALIZE UI STATE ---
		// This block runs once to set up the UI based on the initial `this.value`.
		const initializeUI = () => {
			if (self.value && self.value.length > 0) {
				// Create a chip for each pre-selected value
				self.value.forEach(value => addChip(value));

				// Update the main button text
				updateButtonText();

				// Set the initial value of the hidden input
				document.querySelector(`input[name="${self.var}"]`).value = self.value.join(', ');
			}
		};
		initializeUI();
		// --- END: INITIALIZE UI STATE ---

		// Add chip slide out animation to CSS
		const style = document.createElement('style');
		style.textContent = `
			@keyframes chipSlideOut {
				to {
					opacity: 0;
					transform: scale(0.8) translateX(20px);
				}
			}
		`;
		document.head.appendChild(style);
	}


	// MARK: Generate Options
	// ────────────────────────────────────
	generateOptions() {
		let options = this.values.map((val, index) => {
			if (val === '-') {
				return `<div class="aai-multi-select-option separator">──────────────</div>`;
			}
			// Check if the current value is in the pre-selected values array
			const isSelected = this.value.map(String).includes(String(val));
			const selectedClass = isSelected ? 'selected' : '';
			const title = this.titles[index] || this.capitalizeWords(String(val));

			return `
				<div class="aai-multi-select-option ${selectedClass}" data-value="${val}" tabindex="0">
					<div class="aai-multi-select-checkbox"></div>
					<span>${title}</span>
				</div>
			`;
		}).join('');

		
		// Add create new option if allowCreate is enabled
		if (this.allowCreate) {
			options += `
				<div class="aai-multi-select-option create-new" tabindex="0" style="display: none;">
					<div class="aai-multi-select-checkbox"></div>
					<span>${this.createLabel} ""</span>
				</div>
			`;
		}

        return options;

	}



	
	// Capitalize Words
	// ────────────────────────────────────
	capitalizeWords(str) {
		if (typeof str !== 'string') return '';
		return str.replace(/\b\w/g, l => l.toUpperCase());
	}
}


