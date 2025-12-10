import SVG 					from '../../shared/svg.js';
import BulkJobs 			from './BulkJobs.js';
import BulkJobEdit 			from './BulkJobEdit.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
const { __, _x, _n, sprintf } = wp.i18n;








// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: BULK MONITOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class BulkMonitor {
	

	// ────────────────────────────────────
	constructor() {

		this.$admin 		= document.querySelector('.copyspell-ai-tab-content');
		this.$container 	= null
		this.$list 			= null
		this.$pagination 	= null
		this.jobs 			= { all: [] }
		this.job 			= null;
		this.interval 		= null;
		this.intervalTime 	= 5000; // 5 seconds
		this.currentPage 	= 1;
		this.perPage 		= 20;
		this.totalJobs 		= 0;
		

		this.init();
	}



	// MARK: Init
	// ────────────────────────────────────
	async init() {
		
		this.renderUI();
		await this.loadJobs('all');
		this.renderJobs();
		this.startMonitor()

	}


	

	// MARK: Render UI
	// ────────────────────────────────────
	renderUI() {
		this.$admin.innerHTML = '';
		this.$container = document.createElement('div');
		this.$container.classList.add('aai-bulk-monitor');
		this.$admin.appendChild(this.$container);
		this.$container.innerHTML = `
			<h2 class="aai-bulk-title">${__('Bulk Jobs', 'copyspell-ai')}</h2>
			<div class="aai-bulk-jobs-list"></div>
			<div class="aai-bulk-pagination"></div>
		`;
		this.$list = this.$container.querySelector('.aai-bulk-jobs-list');
		this.$pagination = this.$container.querySelector('.aai-bulk-pagination');
	}




	// MARK: Render Jobs
	// ────────────────────────────────────
	renderJobs() {
//console.log('Rendering Jobs', this.jobs);
		this.$list.innerHTML = '';
		this.jobs.all.forEach( job => {
			if ( Array.isArray(job.meta.ai_settings) ) {
				job.meta.ai_settings = {};
			}
			let total = (job.meta.processed || 0) + ' / ' + (job.meta.total || 0)
			if ( job.meta.processed == job.meta.total ) {
				total = job.meta.total || 0;
			}
			let jobTime = job.meta.started_at ? new Date( job.meta.started_at ) : null;
			let completedAt = job.meta.completed_at ? new Date( job.meta.completed_at ) : null;
			if ( jobTime && completedAt ) {
				completedAt = completedAt.getTime();
				let diffMs = completedAt - jobTime;
				let diffMins = Math.floor( diffMs / 60000 );
				let diffSecs = Math.floor( (diffMs % 60000) / 1000 );
				jobTime = `${diffMins}m ${diffSecs}s`;
			} else {
				jobTime = '';
			}
			let errors = []
			try {
				errors = JSON.parse( job.meta.errors || '[]' );
			} catch (e) {
				errors = [];
			}
			const jobEl = document.createElement('div');
			jobEl.classList.add('aai-bulk-job');
			jobEl.classList.add('aai-bulk-job-' + job.status);
			if ( typeof job.meta.ai_settings?.audiences === 'string' ) {
				job.meta.ai_settings.audiences = job.meta.ai_settings.audiences.split(',').map(s => s.trim());
			}
			if ( typeof job.meta.ai_settings?.tone === 'string' ) {
				job.meta.ai_settings.tone = job.meta.ai_settings.tone.split(',').map(s => s.trim())
			}
			if ( typeof job.meta.ai_settings?.priorities === 'string' ) {
				job.meta.ai_settings.priorities = job.meta.ai_settings.priorities.split(',').map(s => s.trim());
			}
			jobEl.innerHTML = `
				<div class="aai-bulk-job-title">
					<h3>Job #${job.id}</h3>
					<div class="aai-bulk-job-status status-${job.status}">${job.status}</div><span class="aai-job-time">${jobTime}</span>
				</div>
				<div class="aai-bulk-job-actions">
					${job.meta.processed > 0 ? `<button class="aai-btn aai-btn-secondary aai-bulk-monitor-edit-btn" data-job-id="${job.id}">View Products</button>` : ''}
					${job.status === 'running' ?
						`<button class="aai-btn aai-btn-secondary aai-bulk-monitor-cancel-btn" data-job-id="${job.id}">Cancel Job</button>`
					: ''}
				</div>
				<div class="aai-bulk-counts">
					${job.status == 'running' ? `<div class="aai-spinner">${SVG.refresh}</div>` : ''}
					<p><strong>Processed</strong> <span>${total}</span></p>
					<p class="aai-success"><strong>Success</strong> <span>${job.meta.success || 0}</span></p>
					<p class="aai-failed"><strong>Failed</strong> <span>${job.meta.failed || 0}</span></p>
				</div>
				<div class="aai-bulk-meta">
					${Object.keys(job.meta.query).map((q => 
						`<span class="aai-bulk-query"><strong>${q}:</strong> ${job.meta.query[q]}</span>`
					)).join(' ')}
				</div>
				<div class="aai-bulk-job-settings">
					${job.meta.ai_settings?.audiences?.map(a => `<span class="aai-chip aai-bulk-audience">${a}</span>`).join(' ') || ''}
					${job.meta.ai_settings?.tone?.map(t => `<span class="aai-chip aai-bulk-tone">${t}</span>`).join(' ') || ''}
					${job.meta.ai_settings?.priorities?.map(p => `<span class="aai-chip aai-bulk-priority">${p}</span>`).join(' ') || ''}
					<span class="aai-chip aai-bulk-size">${job.meta.ai_settings?.['content-size'] || ''}</span>
					<span class="aai-chip aai-bulk-framework">${job.meta.ai_settings?.framework || ''}</span>
					<span class="aai-chip aai-bulk-language">${job.meta.ai_settings?.language || ''}</span>
				</div>
				${job.status === 'running' ?
					`<div class="aai-bulk-current-model">
						<div>${job.meta.current_model ? `<strong>Current Model:</strong> ${job.meta.current_model||''}` : ''}</div>
						${job.meta.batch_ids ? `<div><strong>Current Products:</strong> ${job.meta.batch_ids || ''}</div>` : ''}
						</div>`+
						`${job.meta.current_error ? `<div class="aai-bulk-current-error">${job.meta.current_error}</div>` : ''}`
				: ''}
				<div class="aai-bulk-meta">
					${errors.length > 0 ? `<ul class="aai-bulk-error-list">${errors.map(e => `<li class="aai-error-message">${e.error}</li>`).join('')}</ul>` : ''}
				</div>
						`;

			this.$list.appendChild(jobEl);
		});


		// Move running jobs to the top in reverse order
		const runningJobs = Array.from(this.$list.querySelectorAll('.aai-bulk-job-running'));
		runningJobs.reverse().forEach(jobEl => {
			this.$list.prepend(jobEl);
		});



		this.$list.querySelectorAll('.aai-bulk-monitor-cancel-btn').forEach( btn => {
			btn.addEventListener('click', async (e) => {
				const jobId = e.target.getAttribute('data-job-id');
				await this.cancelJob(jobId);
				await this.loadJobs();
				this.renderJobs();
			});	
		});
		this.$list.querySelectorAll('.aai-bulk-monitor-edit-btn').forEach( btn => {
			btn.addEventListener('click', async (e) => {
				const jobId = e.target.getAttribute('data-job-id');
				await this.editJob(jobId);
			});	
		});

		this.renderPagination();

	}




	// MARK: Render Pagination
	// ────────────────────────────────────
	renderPagination() {
		const totalPages = Math.ceil(this.totalJobs / this.perPage);
		
		if (totalPages <= 1) {
			this.$pagination.innerHTML = '';
			return;
		}

		const maxVisible = 5;
		let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
		let endPage = Math.min(totalPages, startPage + maxVisible - 1);
		
		if (endPage - startPage < maxVisible - 1) {
			startPage = Math.max(1, endPage - maxVisible + 1);
		}

		let paginationHTML = '<div class="aai-pagination-controls">';
		
		// Previous button
		if (this.currentPage > 1) {
			paginationHTML += `<button class="aai-btn aai-btn-pagination" data-page="${this.currentPage - 1}">← Previous</button>`;
		}
		
		// First page
		if (startPage > 1) {
			paginationHTML += `<button class="aai-btn aai-btn-pagination" data-page="1">1</button>`;
			if (startPage > 2) {
				paginationHTML += `<span class="aai-pagination-ellipsis">...</span>`;
			}
		}
		
		// Page numbers
		for (let i = startPage; i <= endPage; i++) {
			const activeClass = i === this.currentPage ? 'aai-btn-active' : '';
			paginationHTML += `<button class="aai-btn aai-btn-pagination ${activeClass}" data-page="${i}">${i}</button>`;
		}
		
		// Last page
		if (endPage < totalPages) {
			if (endPage < totalPages - 1) {
				paginationHTML += `<span class="aai-pagination-ellipsis">...</span>`;
			}
			paginationHTML += `<button class="aai-btn aai-btn-pagination" data-page="${totalPages}">${totalPages}</button>`;
		}
		
		// Next button
		if (this.currentPage < totalPages) {
			paginationHTML += `<button class="aai-btn aai-btn-pagination" data-page="${this.currentPage + 1}">Next →</button>`;
		}
		
		paginationHTML += `</div>`;
		paginationHTML += `<div class="aai-pagination-info">Showing page ${this.currentPage} of ${totalPages} (${this.totalJobs} total jobs)</div>`;
		
		this.$pagination.innerHTML = paginationHTML;
		
		// Add event listeners
		this.$pagination.querySelectorAll('.aai-btn-pagination').forEach(btn => {
			btn.addEventListener('click', async (e) => {
				const page = parseInt(e.target.getAttribute('data-page'));
				await this.changePage(page);
			});
		});
	}




	// MARK: Change Page
	// ────────────────────────────────────
	async changePage(page) {
		this.currentPage = page;
		await this.loadJobs('all');
		this.renderJobs();
		
		// Scroll to top of jobs list
		this.$container.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}





	// MARK: Edit Job
	// ────────────────────────────────────
	async editJob( id ) {

		let jobEdit = new BulkJobEdit( id );

	}



	// MARK: Start Monitor
	// ────────────────────────────────────
	startMonitor( force=false ) {
		let runningJobs = this.jobs.all.filter( job => job.status === 'running' );
		if ( runningJobs.length === 0 && !force ) return;

		this.interval = setInterval( async () => {
			await this.loadJobs('all');
			this.renderJobs();
			runningJobs = this.jobs.all.filter( job => job.status === 'running' );
//console.log('runningJobs', runningJobs);
			if ( runningJobs.length === 0 ) {
				clearInterval(this.interval);
			}
		}, this.intervalTime );

	}








	// MARK: Load Jobs
	// ────────────────────────────────────
	async loadJobs( status = 'running' ) {
		
		if ( ! this.JOBS ) this.JOBS = new BulkJobs();

		if ( status === 'all' ) {
			// First, get total count for pagination
			const allJobs = await this.JOBS.getAll({ 
				limit: -1, 
				order_by: 'updated', 
				order: 'DESC' 
			});
			this.totalJobs = allJobs.length;
			// Then get paginated results
			this.jobs.all = await this.JOBS.getAll({ 
				page: this.currentPage,
				perPage: this.perPage,
				order_by: 'updated', 
				order: 'DESC' 
			});
			return;
		}
		this.jobs[status] = await this.JOBS.getByStatus( status )
		//console.log(status, 'jobs:', this.jobs);
	}




	
	// MARK: Cancel Job
	// ────────────────────────────────────
	async cancelJob( id ) {

		let res = await fetch( DATA.ajax_url, {
			method: 'POST',
			body: new URLSearchParams({
				action: 'csai_bulk_cancel',
				job_id: id || this.job.id,
				nonce: DATA.nonce
			})
		});

		res = await res.json();
		
		return res;

	}


}


