import IFC 					from "./backend/interface.js";
import CopyspellEdit 		from "./backend/CopyspellEdit.js";
import _log					from './shared/Log.js';
import { checkLicenseKey }	from './backend/admin-license.js';
// -----------------------------------------------------
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}
const { __ } = wp.i18n;
// -----------------------------------------------------
//console.groupCollapsed('%cACTUS-AI Backend', 'padding:2px 8px; background:darkorange; color:white')
//console.log( DATA );
//console.groupEnd();
_log("DATA", DATA);



// admin
// ------------------------------
if (typeof jQuery !== 'undefined') {
	IFC.init();
} else {
	console.warn("WordPress dependencies not available");
}




// Fallback if promise isn't available
document.addEventListener('DOMContentLoaded', async () => {

	//let cs_license_check = await checkLicenseKey();
	//console.log('---------- check', cs_license_check)	

		
    // Load installed addon files
    for (const url of DATA.addons || []) {
		try {
			let mod = await import(url);
			if (mod.register) mod.register( window.CopyspellAI );
		} catch (err) {
			console.warn(`Failed to load addon: ${url}`, err);
		}
	}

    window.CopyspellAI.initExtensions( window.CopyspellAI );
    //window.CopyspellAI.ui.renderSlots();
    _log('Extensions', window.CopyspellAI.getExtensions() );




	// MARK: product page
	// ------------------------------
	if (window.pagenow === 'product' && window.typenow === 'product') {

		new CopyspellEdit();

	}

})













// DEBUG LOG
//setTimeout(() => $(".copyspell-ai-admin-header img").on("click", showDebugLog), 200);
function showDebugLog() {
	const logUrl = '/wp-content/debug.log?' + new Date().getTime();
	const winName = 'copyspell-ai-log';
	const win = window.open('', winName, 'width=1000,height=700,scrollbars=yes');
	if (!win) return;
	win.document.title = 'CopySpell AI Debug Log';
	win.document.body.innerHTML = '<pre id="debug-log" style="white-space: pre-wrap; word-break: break-all; font-family: monospace; height: 100vh; margin:0; overflow:auto;">Loading...</pre>';
	fetch(logUrl)
		.then(r => r.text())
		.then(text => {
			const pre = win.document.getElementById('debug-log');
			if (pre) {
				pre.textContent = text + '\n\n\n\n\n\n';
				pre.scrollTop = pre.scrollHeight;
			}
		})
		.catch(() => {
			const pre = win.document.getElementById('debug-log');
			if (pre) pre.textContent = 'Could not load debug.log';
		});
	win.focus();
}






// MARK: Sample Data
// ────────────────────────────────────
let sampleTitles = {
    "suggestions": [
		"Aero Daily Fitness Tee: Stay Cool, Perform Better",
		"Stay Cool Daily: Aero Performance Fitness Tee",
		"Ultimate Workout Comfort: Aero Daily Fitness Tee",
		"Aero Daily Fitness Tee: Your Breathable Workout Shirt",
		"Dry & Cool Workouts: Aero Daily Fitness Tee"
	]
}

let sampleExcerptsShort = {
    "suggestions": [
		"Maximize workout comfort with our breathable Aero Daily Fitness Tee - perfect for any fitness enthusiast!",
		"Stay cool and dry during intense workouts with our Aero Daily Fitness Tee, designed for comfort and performance.",
		"Elevate your fitness game with our Aero Daily Fitness Tee - quick-drying, comfortable, and made for active lifestyles."
	]
}

let sampleExcerpts = {
    "suggestions": [
		"<p>Elevate your training with the <strong>Aero Daily Fitness Tee</strong>, designed to keep you feeling fresh and focused. Its advanced moisture-wicking fabric pulls sweat away from your body, ensuring you stay cool and dry through every rep and stride. Experience peak comfort and performance for your daily workouts, no matter the intensity.</p>",
		"<h3>Unleash Your Best Performance</h3><p>Discover the ultimate workout companion: the <strong>Aero Daily Fitness Tee</strong>. Engineered with ultra-breathable material, it provides superior ventilation to combat heat buildup, allowing you to push your limits comfortably. This tee isn't just clothing; it's an essential upgrade for anyone serious about staying cool and maximizing their fitness potential.</p>",
		"<p>Tired of overheating during your exercise? Our revolutionary <strong>Aero Daily Fitness Tee</strong> is your solution. Crafted for the modern athlete, it combines lightweight design with rapid-drying technology, guaranteeing unparalleled comfort and a consistently cool feel. Make every workout count with a tee that supports your active lifestyle, seamlessly blending performance with everyday style.</p>"
	]
}




let sampleDescriptions = {
    "suggestions": [
        "<h2>Elevate Your Performance: Experience Ultimate Cool with the Aero Daily Fitness Tee!</h2>\n<p>Tired of sweat-soaked shirts that weigh you down during your most intense workouts? Introducing the <strong>Aero Daily Fitness Tee</strong>, engineered to keep you cool, dry, and focused, no matter how hard you push yourself. This isn't just another workout shirt; it's your unfair advantage in every session.</p>\n<h3>Unleash Your Full Potential</h3>\n<ul>\n    <li><strong>Advanced Moisture-Wicking:</strong> Our revolutionary fabric actively pulls sweat away from your skin, ensuring you stay dry and comfortable from warm-up to cool-down. Say goodbye to clingy, uncomfortable gym wear!</li>\n    <li><strong>Feather-Light Breathability:</strong> Designed for maximum airflow, the Aero Tee feels incredibly light, allowing your skin to breathe. Experience unrestricted movement and a constant sensation of coolness, even during peak exertion.</li>\n    <li><strong>Durable & Dynamic:</strong> Built to withstand the rigors of daily training, this <strong>performance tee</strong> retains its shape and comfort wash after wash. It's the essential <strong>activewear</strong> piece for anyone serious about their fitness journey.</li>\n</ul>\n<p>Step up your game and redefine what comfort means in your fitness routine. The Aero Daily Fitness Tee is here to transform your workouts. <a href=\"https://dev.actusanima.com/product/aero-daily-fitness-tee/\">Get yours today</a> and feel the difference!</p>",
        "<h2>Your Everyday Essential: The Aero Daily Fitness Tee – Where Comfort Meets Performance</h2>\n<p>In today's fast-paced world, you need apparel that keeps up with your dynamic lifestyle. The <strong>Aero Daily Fitness Tee</strong> isn't just for the gym; it's designed for seamless transitions from your morning run to your coffee shop meeting, and everything in between. Perfect for Millennials who demand both style and substance, this tee combines peak performance with unparalleled everyday comfort.</p>\n<h3>Beyond the Workout: All-Day Versatility</h3>\n<ul>\n    <li><strong>Effortless Style:</strong> With its modern fit and clean design, this tee looks as good on the street as it feels during a workout. Pair it with jeans, shorts, or your favorite joggers for a polished, athletic look.</li>\n    <li><strong>Superior Comfort, All Day Long:</strong> Crafted from a soft, lightweight fabric, the Aero Daily Fitness Tee provides a comfortable, barely-there feel that lasts from dawn till dusk. It’s the ultimate <strong>versatile shirt</strong> for your busy schedule.</li>\n    <li><strong>Quick-Drying Freshness:</strong> Whether it's post-gym or navigating a humid day, its quick-drying properties keep you feeling fresh and confident, making it the ideal <strong>daily fitness tee</strong> for every occasion.</li>\n</ul>\n<p>Don't compromise on comfort or performance. Embrace a tee that works as hard as you do, wherever your day takes you. <a href=\"https://dev.actusanima.com/product/aero-daily-fitness-tee/\">Discover your new go-to shirt</a> and elevate your daily grind!</p>"
    ],
    "refinementPrompts": [
        [
            "Add a specific scenario or anecdote where the tee's benefits would be crucial (e.g., 'Imagine hitting that PR without feeling restricted...').",
            "Include a call to action that emphasizes a limited-time offer or discount to create urgency.",
            "Suggest adding a quote or testimonial from a satisfied customer to boost social proof.",
            "Elaborate on the specific fabric technology used, if available, to highlight its innovative nature.",
            "Add a section about the aesthetic benefits, such as how the fit enhances physique or style during workouts."
        ],
        [
            "Suggest incorporating a visual description of how the tee can be styled for different everyday occasions.",
            "Add information about potential odor-resistant properties, if applicable, to enhance the 'freshness' benefit.",
            "Include a direct question to the reader that makes them reflect on their current wardrobe struggles (e.g., 'Are you tired of changing clothes multiple times a day?').",
            "Propose a comparison to a less versatile shirt to emphasize the unique selling proposition of the Aero Daily Fitness Tee.",
            "Add a strong concluding statement that reinforces the tee's value as an investment in their lifestyle."
        ]
    ],
    "model": "gemini-2.5-flash",
    "api": "google"
}




