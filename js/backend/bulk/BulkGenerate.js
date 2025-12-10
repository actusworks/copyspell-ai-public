import _log 					from '../../shared/Log.js';
import BulkJobs 			from './BulkJobs.js';
import BulkRecords 			from './BulkRecords.js';
import BulkMonitor 			from './BulkMonitor.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;








// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: BULK GENERATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class BulkGenerate {
	

	// ────────────────────────────────────
	constructor() {

		this.$admin 		= document.querySelector('.copyspell-ai-tab-content');
		this.$container 	= null
		this.$bulkStatus 	= null
		this.query 			= {}
		this.ids 			= []
		this.total 			= 0;

		this.jobs 			= new BulkJobs();
		this.records 		= new BulkRecords();

		this.job = null;
		this.record = null;
		this.bulk = null;
		

		this.init();
	}



	// MARK: Init
	// ────────────────────────────────────
	init() {
		// Initialize any event listeners or setup here
		// Don't create a job yet - wait for newJob() to be called explicitly
	}

	


	// MARK: New Job
	// ────────────────────────────────────
	async newJob( query, ids = [], aiSettings = {} ) {
		this.query = query || this.query;
		this.ids = ids || this.ids;
		this.total = this.ids.length;

		//console.log('NEW JOB ******************', this.ids);
		_log('NEW JOB', aiSettings);

		this.job = {
			status: 'running',
			meta: {
				total: this.ids.length,
				query: this.query,
				ids: this.ids,
				processed: 0,
				success: 0,
				failed: 0,
				started_at: null,
				completed_at: null,
				settings: {},
				ai_settings: aiSettings || {}
			}
		}

		this.job.id = await this.jobs.add( this.job );


		if ( this.job.id ) {
			_log( 'BulkGenerate: Created new job with ID ' + this.job.id );
			this.start();
		} else {
			_log( 'BulkGenerate: Failed to create new job' );
		}

		
		

	}



	// MARK: Start Job
	// ────────────────────────────────────
	async start() {

		//console.log('START JOB ******************', this.job);
		//console.log('START JOB query ************', this.query);

		this.bulk = await $.post( DATA.ajax_url, {
			action	: "csai_bulk_start",
			query	: this.query,
			job_id	: this.job.id,
			_ajax_nonce: DATA.nonce
		})

		new BulkMonitor();

		
		_log('BULK START ==>>', this.bulk);
	}





	// MARK: Cancel Job
	// ────────────────────────────────────
	async cancelJob( id ) {

		fetch( DATA.ajax_url, {
			method: 'POST',
			body: new URLSearchParams({
				action: 'csai_bulk_cancel',
				job_id: id || this.job.id,
				nonce: DATA.nonce
			})
		});
		

	}



}


