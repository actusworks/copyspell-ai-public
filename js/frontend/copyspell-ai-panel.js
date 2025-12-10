let DATA = window.copyspell_ai_admin || {};














// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: ACTUS-AI Panel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class copyspellAIPanel {
	
	// ────────────────────────────────────
	constructor( args={} ) {
		if ( typeof args == 'string' ) args = { clss: args };

		this.panel 		= null
		this.clss 		= args.clss || ''
		this.action		= null
		this.onAction 	= args.onAction || (() => {})
		this.target		= args.target || document.body
		
		this.create()
		this.events()
	}




	// MARK: Open
	// ────────────────────────────────────
	// Creates and Opens the panel
	// ────────────────────────────────────
	open() {

		// If the panel already exists, toggle its visibility
		// if ( this.panel ) return this.panel.classList.toggle('open');

		// if the panel already exists, remove it
		//if ( this.panel ) this.close();


		// Create the panel if it doesn't exist


		// Add open class for transition
		setTimeout(() => {
			this.panel.classList.add('open');
		}, 0);



		return this;


	}




	// MARK: Close
	// ────────────────────────────────────
	close() {
		this.panel.classList.remove('open');
		setTimeout(() => {
			const overlay = document.querySelector('.aai-panel-overlay');
			if (overlay) overlay.remove();
			
			this.panel.remove()
			this.panel = null;
		}, 500);
	}




	// MARK: Create
	// ────────────────────────────────────
	// Creates the panel and appends it to the body.
	// ────────────────────────────────────
	create() {
		if ( this.panel ) return this.panel; // If the panel already exists, return it)

		// Create the panel
		this.panel = document.createElement('div');
		this.panel.className = 'aai-panel';
		if ( this.clss ) this.panel.classList.add( this.clss );


		// Panel content
		this.panel.innerHTML = 
			this.panelHeader() + 
			this.panelContent() + 
			this.panelFooter();


		// Append panel to target
		this.target.appendChild(this.panel);


		// Return panel elements for easy access
		this.$el 	= this.panel
		this.$header	= this.panel.querySelector('.aai-panel-header');
		this.$body		= this.panel.querySelector('.aai-panel-body');
		this.$footer	= this.panel.querySelector('.aai-panel-footer');
		this.$close		= this.panel.querySelector('.aai-panel-close');



		return this.panel;


	}




	// MARK: Events
	// ────────────────────────────────────
	events() {


		// Close button handler
		this.panel.querySelector('.aai-panel-close').onclick = this.close.bind(this);

			
		// Action Buttons handler
		this.panel.querySelectorAll('.aai-panel-body .aai-btn').forEach(btn => {
			btn.onclick = () => {
				this.action = btn.getAttribute('alt');
				this.onAction( this.action );
			};
		});


	}




	// MARK: HTML header
	// ────────────────────────────────────
	panelHeader() {
		return `
			<div class="aai-panel-header">
				<img src="${DATA.logo}" alt="CopySpell AI Logo" class="aai-panel-logo">
				<span>CopySpell AI</span>
				<button class="aai-panel-close" title="Close">&times;</button>
			</div>
		`;
	}


		
	// MARK: HTML content
	// ────────────────────────────────────
	panelContent( content = '' ) {
		//if ( DATA.post.postType == 'post' ) content += this.postAIpanel();
		//if ( DATA.post.postType == 'product' ) content += this.productAIpanel();
		return `
			<div class="aai-panel-body">${content}</div>
		`;
	}




	// MARK: HTML buttons
	// ────────────────────────────────────
	panelFooter(){
		return `
			<div class="aai-panel-footer"></div>
		`;
	}



		





}






