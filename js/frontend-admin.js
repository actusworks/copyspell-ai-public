import wpAPI 				from './shared/wp-api.js';
import TOOLS				from './shared/tools.js';
import copyspellAIContent 	from './shared/AI/ai-content.js';
import copyspellAIButton 	from './frontend/copyspell-ai-button.js';
//import noCreditsModal 	from './shared/no-credits.js';
//import { checkLicenseKey } 	from './backend/admin-license.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
//console.groupCollapsed('%cACTUS-AI Frontend admin', 'padding:2px 8px; background:darkorange; color:white')
//console.log( DATA );
//console.groupEnd();



initCopySpellAI()
async function initCopySpellAI() {
	if ( DATA.postType == 'product' ) {
		//let cs_license_check = await checkLicenseKey();
		//if ( cs_license_check ) {

 
			// create the CopySpell AI button
			// ────────────────────────────────────
			copyspellAIButton(async onClick =>{ 
				//panel.open()

				//if ( ! await TOOLS.isAllowed('product-content') ) return;
	
				/*
				if ( cs_license_check == 'expired trial' ) {
					await noCreditsModal();
					return;
				}
				*/
	
				
				new copyspellAIContent('product-content');
				
			})




		// console.log('--- CopySpell AI - panel -', panel);

		//}
	}
}





































// ────────────────────────────────────
async function dev(){
	console.log('--- dev -', DATA.post.id);

	let post = await wpAPI.getPost( DATA.post.id, DATA.post.postType );
	console.log('--- dev - post -', post);

	let description = post.description || post.content.rendered || '';
	
	
	let response = await AI.call({
		prompt: 'rewrite the description of the post in a more engaging way for marketing and SEO: ' + description,
	})


	console.log('--- dev - response -', response);


}
//dev()

// ────────────────────────────────────
async function dev2(){

	//searxSearch('Fencee Duo RF PDX10').then(results => {
	searxSearch('Acqua di Parma, Signatures Of The Sun – Lily of the Valley, Eau De Parfum, Unisex, 180 ml').then(results => {
		console.log(results.length, 'results found');
		console.log(results.slice(0, 10));
		console.log(results.slice(0, 10).map(r => r.link).join('\n'));
	}).catch(console.error);

}
//dev2()




async function searxSearch(query) {
  const base = 'https://search.actus.works'; // your instance URL
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    engines: 'google',
    //engines: 'google,duckduckgo,bing',
    categories: 'web',
    lang: 'en',
	language: 'en', // Example: English (United States)
	//country: 'de'
  });
  const res = await fetch(`${base}/search?${params.toString()}`);
  //console.log('--- searxSearch - res -', res);
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  const data = await res.json();
  return data.results.map(r => ({
    title: r.title,
    snippet: r.content,
    link: r.url
  }));
}