import _log	 				from "../Log.js";
import ProductSelect 		from '../ProductSelect.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let $ = jQuery;
const DATA = window.copyspell_ai_admin || {}









// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: Marketing Extra
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default class MarketingExtra {

	// ────────────────────────────────────
	constructor() {

		this.prefs 	= {};
		this.target = null;
		this.productIds = null;
		this.productSelect = null;

		this.data = {}



	}



	// MARK: Get Data
	// ────────────────────────────────────
	get() {
		this.data = {}
		this.target.find('input').each( (i, el) => {
			let $el = $(el);
			let name = $el.attr('name');
			if ( ! name ) return;
			let val = $el.val();
			this.data[ name ] = val;
		})
		this.target.find('select').each( (i, el) => {
			let $el = $(el);
			let name = $el.attr('name');
			if ( ! name ) return;
			let val = $el.val();
			this.data[ name ] = val;
		})
		this.target.find('textarea').each( (i, el) => {
			let $el = $(el);
			let name = $el.attr('name');
			if ( ! name ) return;
			let val = $el.val();
			this.data[ name ] = val;
		})
		if ( this.productSelect ) this.data.product_ids = this.productSelect.getSelectedIds();
		_log('Marketing Extra Data', this.data );
		return this.data;
	}



	// MARK: Render
	// ────────────────────────────────────
	render( prefs, target ) {
		this.prefs = prefs;
		this.target = target;
		this.productIds = null;
		this.productSelect = null;
		
		this.target.empty();

		if ( this[ this.prefs.group ] ) {
			let html = this[ this.prefs.group ]( this.prefs.type );
			this.target.append( html );
		}

	}








	

	// MARK: Blog
	// ────────────────────────────────────
	blog( type ) {
		let result = ''


		// Product Blog
		if ( type == 0 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="focus_point" value="${this.data.focus_point || ''}" type="text" class="aai-input" placeholder="focus point..." />
				<label>
					Main focus of this blog post.
					eg. Features, Benefits, Use cases, Innovation, Craftsmanship, Story behind product.
				</label>
			</div>
			<div class="aai-group">
				<input name="use_cases" value="${this.data.use_cases || ''}" type="text" class="aai-input" placeholder="use cases..." />
				<label>
					Specific use-case examples to include.
				</label>
			</div>
			` + this.ctaStyle();


		}


		
		// How-To Guide
		if ( type == 1 ) {
			result += this.products()
			result += this.skillLevel() + `
			<div class="aai-group">
				<input name="tips" value="${this.data.tips || ''}" type="text" class="aai-input" placeholder="tips..." />
				<label>
					Special tips or insights to include.
				</label>
			</div>
			<div class="aai-group">
				<input name="mistakes" value="${this.data.mistakes || ''}" type="text" class="aai-input" placeholder="common mistakes..." />
				<label>
					Common mistakes to include or address.
				</label>
			</div>
			<div class="aai-group">
				<input name="tools" value="${this.data.tools || ''}" type="text" class="aai-input" placeholder="materials/tools..." />
				<label>
					List of materials/tools the user may need.
				</label>
			</div>
			`

		}

		
		
		// Problem-Solution
		if ( type == 2 ) {

			result += this.products()
			result += `
			<div class="aai-group">
				<input name="problem" value="${this.data.problem || ''}" type="text" class="aai-input" placeholder="the problem..." />
				<label>
					Specific problem to highlight.
				</label>
			</div>
			<div class="aai-group">
				<input name="solution" value="${this.data.solution || ''}" type="text" class="aai-input" placeholder="solution elements..." />
				<label>
					Key aspects of the solution to emphasize.
					eg. Performance, Usability, Cost savings, Reliability, Speed.
				</label>
			</div>
			`

		}


		
		// Industry Insights
		if ( type == 3 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="focus" value="${this.data.focus || ''}" type="text" class="aai-input" placeholder="trend focus..." />
				<label>
					Specific trend or topic to focus on.
					eg. Market growth, Consumer behavior, Technology, Sustainability, Innovation
				</label>
			</div>
			<div class="aai-group">
				<textarea name="data" class="aai-textarea" placeholder="data points...">${this.data.data || ''}</textarea>
				<label>
					Data, stats, or references to include.
				</label>
			</div>
			<div class="aai-group">
				<select name="expert_angle" value="${this.data.expert_angle || ''}" class="aai-select">
					<option value="" disabled selected>Select user type...</option>
					Industry Trends, Practical Tips, Expert Insights, Data-Backed Analysis, Step-by-Step Guidance, Common Mistakes to Avoid, Pro Best Practices, Future Predictions, Technical Deep Dive, Beginner-Friendly Breakdown
					<option value="industry_trends">Industry Trends</option>
					<option value="practical_tips">Practical Tips</option>
					<option value="expert_insights">Expert Insights</option>
					<option value="data_backed_analysis">Data-Backed Analysis</option>
					<option value="step_by_step_guidance">Step-by-Step Guidance</option>
					<option value="common_mistakes">Common Mistakes to Avoid</option>
					<option value="pro_best_practices">Pro Best Practices</option>
					<option value="future_predictions">Future Predictions</option>
					<option value="technical_deep_dive">Technical Deep Dive</option>
					<option value="beginner_friendly">Beginner-Friendly Breakdown</option>
				</select>
				<label>
					Expert Angle
				</label>
			</div>
			`
		}



		
		// Comparison
		if ( type == 4 ) {

			result += this.products() + `
			<div class="aai-group">
				<input name="criteria" value="${this.data.criteria || ''}" type="text" class="aai-input" placeholder="criteria..." />
				<label>
					Key comparison criteria.
					eg. Features, Price, Performance, Ease of Use, Support, Reliability
				</label>
			</div>
			`

		}

		
		// Case Study
		if ( type == 5 ) {
			result += this.products()

			result += `
			<div class="aai-group">
				<input name="client_type" value="${this.data.client_type || ''}" type="text" class="aai-input" placeholder="client type..." />
				<label>
					Type of customer or business featured in the case study.
					eg. Small Business, E-commerce Store, Freelancer, Enterprise, Agency.
				</label>
			</div>
			<div class="aai-group">
				<input name="challenge" value="${this.data.challenge || ''}" type="text" class="aai-input" placeholder="main challenge..." />
				<label>
					Main challenge or problem they faced.
				</label>
			</div>
			<div class="aai-group">
				<input name="outcome" value="${this.data.outcome || ''}" type="text" class="aai-input" placeholder="outcome metrics..." />
				<label>
					Measurable results or improvements.
				</label>
			</div>
			<div class="aai-group">
				<input name="testimonial" value="${this.data.testimonial || ''}" type="text" class="aai-input" placeholder="testimonial quote..." />
				<label>
					Customer quote.
				</label>
			</div>
			`

		}



		// Listicle
		if ( type == 6 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="theme" value="${this.data.theme || ''}" type="text" class="aai-input" placeholder="list theme..." />
				<label>
					Theme of the list. eg. Tips, Benefits, Use Cases, Mistakes to Avoid, Ideas.
				</label>
			</div>
			<div class="aai-group">
				<input name="list_count" value="${this.data.list_count || 0}" type="number" class="aai-input" placeholder="list items..." />
				<label>
					Number of list items. 
				</label>
			</div>
			` + this.ctaStyle();

		}


		
		// Announcement
		if ( type == 7 ) {

			result += this.products()

			result += `
			<div class="aai-group">
				<input name="theme" value="${this.data.theme || ''}" type="text" class="aai-input" placeholder="list theme..." />
				<label>
					What kind of announcement is this?
					eg. New Product, Feature Update, Event, Sale, Company News.
				</label>
			</div>
			<div class="aai-group">
				<input name="key_details" value="${this.data.key_details || ''}" type="text" class="aai-input" placeholder="key details..." />
				<label>
					Key details to highlight. 
				</label>
			</div>
			` + this.ctaStyle();

		}



		
		// Opinion / Thought Leadership
		if ( type == 8 ) {

			result += this.products()

			result += `
			<div class="aai-group">
				<input name="topic" value="${this.data.topic || ''}" type="text" class="aai-input" placeholder="topic..." />
				<label>
					Topic or issue you want to express an opinion about.
				</label>
			</div>
			<div class="aai-group">
				<input name="stance" value="${this.data.stance || ''}" type="text" class="aai-input" placeholder="stance..." />
				<label>
					Your position or viewpoint. eg. Support, Critique, Analysis, Prediction. 
				</label>
			</div>
			`


		}



		
		// Storytelling
		if ( type == 9 ) {

			result += this.products()

			result += `
			<div class="aai-group">
				<input name="theme" value="${this.data.theme || ''}" type="text" class="aai-input" placeholder="story theme..." />
				<label>
					Theme or type of story you want to tell.
				</label>
			</div>
			<div class="aai-group">
				<input name="character" value="${this.data.character || ''}" type="text" class="aai-input" placeholder="main character..." />
				<label>
					Who is the main character? eg. Founder, Customer, Employee, Everyday User.
				</label>
			</div>
			`;


		}



		
		// Data-Driven Insights
		if ( type == 10 ) {

			result += this.products()

			result += `
			<div class="aai-group">
				<textarea name="data" class="aai-textarea" placeholder="data points...">${this.data.data || ''}</textarea>
				<label>
					Data, stats, or references to include.
				</label>
			</div>
			<div class="aai-group">
				<input name="key_findings" value="${this.data.key_findings || ''}" type="text" class="aai-input" placeholder="key findings..." />
				<label>
					Most important findings to highlight.
				</label>
			</div>
			<div class="aai-group">
				<input name="takeaway_style" value="${this.data.takeaway_style || ''}" type="text" class="aai-input" placeholder="takeaway style..." />
				<label>
					Style of the final recommendations. eg. Actionable Steps, Strategic Advice, Best Practices, Future Trends.
				</label>
			</div>
			`;


		}



		// News / Trend Analysis
		if ( type == 11 ) {

			result += this.products()

			result += `
			<div class="aai-group">
				<input name="industry" value="${this.data.industry || ''}" type="text" class="aai-input" placeholder="industry or niche..." />
				<label>
					Industry or niche to cover. eg. Tech, E-commerce, Beauty, Fitness, Marketing, AI, Fashion.
				</label>
			</div>
			<div class="aai-group">
				<input name="topic" value="${this.data.topic || ''}" type="text" class="aai-input" placeholder="trend topic..." />
				<label>
					Specific news or trend to analyze.
				</label>
			</div>
			<div class="aai-group">
				<input name="forecast_style" value="${this.data.forecast_style || ''}" type="text" class="aai-input" placeholder="forecast style..." />
				<label>
					How should the future outlook be framed? eg. Cautious, Optimistic, Balanced, Critical.
				</label>
			</div>
			`;


		}













		return result;
	}



	// MARK: Email
	// ────────────────────────────────────
	email( type ) {
		let result = ''


		// Promotional
		if ( type == 0 ) {
			result += this.products()
			result += 
			this.benefits(`Describe the key advantage of the product that should be highlighted in this promotional email (e.g., “keeps drinks cold all day,” “enhances productivity”).`) +
			this.offer();
		}

		// Welcome
		if ( type == 1 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<select name="user_type" value="${this.data.user_type || ''}" class="aai-select">
					<option value="" disabled selected>Select user type...</option>
					<option value="new_subscriber">New Subscriber</option>
					<option value="first_time_buyer">First-Time Buyer</option>
					<option value="app_sign_up">App Sign-Up</option>
					<option value="newsletter_joiner">Newsletter Joiner</option>
					<option value="trial_sign_up">Trial Sign-Up</option>
					<option value="returning_customer">Returning Customer</option>
					<option value="loyalty_program_member">Loyalty Program Member</option>
					<option value="event_registrant">Event / Webinar Registrant</option>
					<option value="social_media_follower">Social Media Follower</option>
					<option value="referral_sign_up">Referral Sign-Up</option>
					<option value="customer">Customer</option>
				</select>
				<label>
					User Type
				</label>
			</div>
			`+ 
			this.cta(`Call-to-action to guide the recipient, e.g., “Explore our products,” “Start shopping,” “Learn more about us.”`);
		}

		// Product Launch
		if ( type == 2 ) {
			result += this.products()
			result += this.launch() + this.cta();
		}

		// Product Highlight
		if ( type == 3 ) {
			result += this.products()
			result += this.benefits('The main features or benefits that should be emphasized in the email.') + `
			<div class="aai-group">
				<input name="recognition" value="${this.data.recognition || ''}" type="text" class="aai-input" placeholder="special notes..." />
				<label>
					Anything notable about the product such as awards, limited edition status, or unique characteristics.
				</label>
			</div>
			`+ 
			this.cta();
		}

		// Offer / Discount
		if ( type == 4 ) {
			result += this.products()
			result += this.offer() + this.cta();
		}

		// New Collection
		if ( type == 5 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="collection" value="${this.data.collection || ''}" type="text" class="aai-input" placeholder="collection name..." />
				<label>
					The name or theme of the new collection to introduce.
				</label>
			</div>
			` + this.launch() + this.cta();
		}


		// Abandoned Cart
		if ( type == 6 ) {
			result += 
			this.products('Products Left in Cart') +
			this.customer() + 
			`<div class="aai-group">
				<input name="discount" value="${this.data.discount || ''}" type="text" class="aai-input" placeholder="discount..." />
				<label>
					Any special offer to encourage completion of the purchase, e.g., “10% off,” “Free shipping.”
				</label>
			</div>` + this.cta();
		}


		// Thank You
		if ( type == 7 ) {
			result += 
			this.products() +
			this.customer(`Personalize the message to make it feel more genuine.`) + 
			`<div class="aai-group">
				<select name="reason" value="${this.data.reason || ''}" class="aai-select">
					<option value="" disabled selected>Select reason...</option>
					<option value="purchase">Purchase</option>
					<option value="newsletter_signup">Newsletter Signup</option>
					<option value="event_participation">Event Participation</option>
					<option value="referral">Referral</option>
					<option value="feedback_submission">Feedback Submission</option>
				</select>
				<label>
					Reason for Thanks
				</label>
			</div>` + this.cta(`Optional next step you want the recipient to take, e.g., “Explore more products,” “Share your experience,” “Follow us on social media.”`);
		}



		// Re-engagement
		if ( type == 8 ) {
			result += this.products()
			result += this.customer(`Personalize the message to make the recipient feel recognized.`) + 
			`<div class="aai-group">
				<select name="reason" value="${this.data.reason || ''}" class="aai-select">
					<option value="" disabled selected>Select reason...</option>
					<option value="inactive_subscriber">Inactive Subscriber</option>
					<option value="no_recent_purchase">Haven’t Purchased in a While</option>
					<option value="abandoned_product_interest">Abandoned Product Interest</option>
					<option value="lapsed_loyalty_member">Lapsed Loyalty Member</option>
					<option value="dormant_app_user">Dormant App User</option>
					<option value="event_no_show">Event No-Show</option>
				</select>
				<label>
					Reason
				</label>
			</div>
			<div class="aai-group">
				<input name="discount" value="${this.data.discount || ''}" type="text" class="aai-input" placeholder="incentive / offer..." />
				<label>
					Any special reason to entice them back (e.g., discount, free shipping, exclusive content).
				</label>
			</div>` + 
			this.cta(`What action you want the recipient to take, e.g., “Visit us again,” “Claim your offer,” “Check out new products.”`);
		}




		// Post-Purchase
		if ( type == 9 ) {
			result += this.products()
			result += this.customer() + 
			this.products('Purchased Product(s)') + `
			<div class="aai-group">
				<input name="recommendations" value="${this.data.recommendations || ''}" type="text" class="aai-input" placeholder="next steps / recommendations..." />
				<label>
					Suggestions for complementary products, tips, or related content.
				</label>
			</div>` + this.cta(`Encourage further engagement, e.g., “Share your experience,” “Check out related products,” “Leave a review.”`);
		}


		// Newsletter
		if ( type == 10 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<select name="topic" value="${this.data.topic || ''}" class="aai-select">
					<option value="" disabled selected>Select topic...</option>
					<option value="new_arrivals">New Arrivals</option>
					<option value="tips_guides">Tips & Guides</option>
					<option value="industry_news">Industry News</option>
					<option value="product_updates">Product Updates</option>
					<option value="promotions_offers">Promotions & Offers</option>
					<option value="customer_stories">Customer Stories</option>
					<option value="seasonal_highlights">Seasonal Highlights</option>
					<option value="how_to_tutorials">How-To Tutorials</option>
					<option value="behind_the_scenes">Behind the Scenes</option>
					<option value="expert_insights">Expert Insights</option>
					<option value="event_announcements">Event Announcements</option>
					<option value="limited_time_offers">Limited-Time Offers</option>
					<option value="product_comparisons">Product Comparisons</option>
					<option value="diy_ideas">DIY Ideas</option>
					<option value="brand_milestones">Brand Milestones</option>
					<option value="loyalty_program_updates">Loyalty Program Updates</option>
					<option value="trends_insights">Trends & Insights</option>
					<option value="featured_reviews">Featured Reviews</option>
					<option value="special_collaborations">Special Collaborations</option>
					<option value="exclusive_previews">Exclusive Previews</option>
				</select>
				<label>
					Newsletter Topic / Theme
				</label>
			</div>
			<div class="aai-group">
				<textarea name="sections" class="aai-textarea" placeholder="key highlights / sections...">${this.data.sections || ''}</textarea>
				<label>
					The important content pieces or announcements to feature in this newsletter.
				</label>
			</div>` + 
			this.cta(`The main action you want readers to take, e.g., “Read more,” “Shop now,” “Sign up for an event.”`);

		}


		
		// Seasonal
		if ( type == 11 ) {

			result += this.products()
			result += this.seasonal() + 
			this.offer(`Include any seasonal offer, discount, or special perk`) +
			this.cta();

		}


		// Educational / Tips
		if ( type == 12 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="topic" class="aai-input" type="text" placeholder="topic or skill to teach..." value="${this.data.topic || ''}" />
				<label>
					What the email should focus on (e.g., “pet nutrition basics”, “how to choose the right hosting plan”).
				</label>
			</div>
			<div class="aai-group">
				<input name="tips_number" value="${this.data.tips_number || 0}" type="number" class="aai-input" placeholder="number of tips..." />
				<label>
					Specify how many tips or points you want the email to include. 
				</label>
			</div>` + 
			this.skillLevel();
		}



		// Storytelling
		if ( type == 13 ) {

			result += this.products()
			result += `
			<div class="aai-group">
				<input name="story_theme" value="${this.data.story_theme || ''}" type="text" class="aai-input" placeholder="story theme..." />
				<label>
					Describe the everyday moment or situation where the product naturally fits (e.g., “a quiet morning routine,” “a busy workday,” “a weekend getaway”). This sets the emotional scene of the story.
				</label>
			</div>
			<div class="aai-group">
				<input name="target_persona" value="${this.data.target_persona || ''}" type="text" class="aai-input" placeholder="target persona..." />
				<label>
					Describe the type of person in the story (e.g., “a young professional,” “a busy parent,” “a fitness lover”). This helps tailor tone and perspective.
				</label>
			</div>
			<div class="aai-group">
				<input name="moral" value="${this.data.moral || ''}" type="text" class="aai-input" placeholder="moral of the story..." />
				<label>
					What feeling or insight should remain with the reader at the end.
				</label>
			</div>
			`;

		}



		// Milestone / Loyalty
		if ( type == 14 ) {
			result += 
			`<div class="aai-group">
				<input name="milestone" value="${this.data.milestone || ''}" type="text" class="aai-input" placeholder="milestone type..." />
				<label>
					Milestone or Loyalty Event (eg. “Anniversary”, “Spending Milestone”, “Order Count Milestone”, “Birthday”, “VIP Tier Reached”)
				</label>
			</div>` + 
			this.customer() + 
			`<div class="aai-group">
				<input name="reward" value="${this.data.reward || ''}" type="text" class="aai-input" placeholder="reward or gift..." />
				<label>
					Reward or Thank-You Gift (if any)<br>
					e.g., “10% loyalty discount”, “early VIP access”, “free add-on”.
				</label>
			</div>` + 
			``;
		}



		// Feedback Request
		if ( type == 15 ) {
			result += this.products('Purchased Product(s)')
			result += `
			<div class="aai-group">
				<select name="feedback_type" value="${this.data.feedback_type || ''}" class="aai-select">
					<option value="" disabled selected>Select type...</option>
					<option value="star_rating">Star Rating</option>
					<option value="short_review">Short Review</option>
					<option value="detailed_testimonial">Detailed Testimonial</option>
					<option value="feature_suggestion">Feature Suggestion</option>
					<option value="experience_rating">Experience Rating</option>
					<option value="satisfaction_survey">Satisfaction Survey</option>
					<option value="before_after_story">Before/After Story</option>
					<option value="video_review">Video Review</option>
					<option value="social_media_post">Social Media Post</option>
				</select>
				<label>
					Feedback Type
				</label>
			</div>
			`
			result += this.customer() + `
			<div class="aai-group">
				<input name="reward" value="${this.data.reward || ''}" type="text" class="aai-input" placeholder="reward or gift..." />
				<label>
					Reward for Leaving Feedback (if any)<br>
					e.g., “10% discount”, “early VIP access”, “free add-on”.
				</label>
			</div>
			<div class="aai-group">
				<input name="purpose" value="${this.data.purpose || ''}" type="text" class="aai-input" placeholder="purpose of feedback..." />
				<label>
					How Will the Feedback Be Used?<br>
					e.g., “improving the product”, “website testimonials”, “future updates”.
				</label>
			</div>
			`;

		}




		// VIP / Exclusive Access
		if ( type == 16 ) {
			result += `
			<div class="aai-group">
				<input name="vip_level" value="${this.data.vip_level || ''}" type="text" class="aai-input" placeholder="member level..." />
				<label>
					VIP Tier / Member Level.<br>
					e.g., “VIP”, “Gold Member”, “Platinum Member”, “Elite”, “Loyalty Plus”.
				</label>
			</div>` +
			this.offer(`Exclusive Access or Benefit.<br>e.g., “early access to new products”, “private sale”, “members-only discount”.`)
			result += `
			<div class="aai-group">
				<input name="reason" value="${this.data.reason || ''}" type="text" class="aai-input" placeholder="reason for exclusive access..." />
				<label>
					Reason for Exclusive Access.<br>
					e.g., “your loyalty”, “your long-time support”, “your purchase history”.
				</label>
			</div>`

		}





		return result;
	}




	// MARK: Advertisement
	// ────────────────────────────────────
	adv( type ) {

		let result = ''

		// Product Promotion
		if ( type == 0 ) {
			result += this.products()
			result += this.benefits(`Tell us the most important benefit of the product (e.g., “keeps drinks cold for 24 hours”, “reduces back pain”).`)
		}


		// Discount / Offer
		if ( type == 1 ) {
			result += this.products()
			result += this.offer();
		}



		// Launch / New Arrival
		if ( type == 2 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="features" value="${this.data.features || ''}" type="text" class="aai-input" placeholder="key features..." />
				<label>
					List the main features or attributes of the product that you want highlighted (e.g., “lightweight, waterproof, long battery life”).
				</label>
			</div>
			<div class="aai-group">
				<input name="special" value="${this.data.special || ''}" type="text" class="aai-input" placeholder="what makes it special..." />
				<label>
					Explain what sets this product apart or why people will love it (e.g., “crafted from sustainable materials,” “limited edition design,” “enhanced performance”).
				</label>
			</div>
			` + this.launch();
		}


		// Brand Awareness
		if ( type == 3 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="values" value="${this.data.values || ''}" type="text" class="aai-input" placeholder="brand values to emphasize..." />
				<label>
					List the core values you want to highlight (e.g., “sustainability,” “innovation,” “attention to detail,” “community focus”). These will be woven naturally into the story to strengthen your brand identity.
				</label>
			</div>
			`;
		}


		// Retargeting
		if ( type == 4 ) {
			result += this.products()
			result += this.customer(`Personalize the message to make the recipient feel recognized.`) + 
			`
			<div class="aai-group">
				<input name="discount" value="${this.data.discount || ''}" type="text" class="aai-input" placeholder="incentive / offer..." />
				<label>
					Any special reason to entice them back (e.g., discount, free shipping, exclusive content).
				</label>
			</div>` + 
			this.cta(`What action you want the recipient to take, e.g., “Visit us again,” “Claim your offer,” “Check out new products.”`);
		}


		// Seasonal / Holiday
		if ( type == 5 ) {
			result += this.products()
			result += this.seasonal();
			result += this.offer();
		}


		// Testimonial / Social Proof
		if ( type == 6 ) {
			result += this.products()
			result += 
			this.benefits(`Specify the key advantage or positive effect the customer experienced (e.g., “keeps drinks cold all day,” “made my skin feel smoother,” “easy to assemble”).`) +
			this.customer();
		}



		// Comparison
		if ( type == 7 ) {
			result += this.products() + `
			<div class="aai-group">
				<input name="advantages" value="${this.data.advantages || ''}" type="text" class="aai-input" placeholder="key advantages..." />
				<label>
					List the 2-4 main benefits or standout features of your product that you want emphasized in the comparison.
				</label>
			</div>`;
		}


		// Video / Visual Showcase
		if ( type == 8 ) {
			result += this.products()
		}



		// Limited-Time / Urgency
		if ( type == 9 ) {
			result += this.products()
			result += this.offer() + this.cta();
		}



		// Problem-Solution
		if ( type == 10 ) {

			result += this.products()
			result += `
			<div class="aai-group">
				<input name="problem" value="${this.data.problem || ''}" type="text" class="aai-input" placeholder="the problem..." />
				<label>
					Specific problem to highlight.
				</label>
			</div>
			<div class="aai-group">
				<input name="solution" value="${this.data.solution || ''}" type="text" class="aai-input" placeholder="solution elements..." />
				<label>
					Key aspects of the solution to emphasize.
					eg. Performance, Usability, Cost savings, Reliability, Speed.
				</label>
			</div>
			`

		}


		
		// Value Proposition Ad
		if ( type == 11 ) {
			result += this.products()
			result += this.benefits(`Tell us the main unique selling proposition or value of the product(s).`)
		}




		return result;

	}





	// MARK: Social
	// ────────────────────────────────────
	social( type ) {

		let result = ''

		// Product Showcase
		if ( type == 0 ) {
			result += this.products()
			result += this.benefits(`Tell us the most important benefit of the product (e.g., “keeps drinks cold for 24 hours”, “reduces back pain”).`)
		}

		// Demo / Tutorial
		if ( type == 1 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="use_case" value="${this.data.use_case || ''}" type="text" class="aai-input" placeholder="specific use case or scenario..." />
				<label>
					Describe the specific scenario in which the product is being used (e.g., “cleaning a car interior,” “making a smoothie,” “organizing cables”). This sets the context for the tutorial.
				</label>
			</div>
			<div class="aai-group">
				<input name="key_steps" value="${this.data.key_steps || ''}" type="text" class="aai-input" placeholder="main steps involved..." />
				<label>
					List the main steps involved in using the product. These will be transformed into a clear, user-friendly demonstration.
				</label>
			</div>
			` + 
			this.skillLevel();
		}

		// Lifestyle / Storytelling
		if ( type == 2 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="ideal_scenario" value="${this.data.ideal_scenario || ''}" type="text" class="aai-input" placeholder="ideal scenario..." />
				<label>
					Describe the everyday moment or situation where the product naturally fits (e.g., “a quiet morning routine,” “a busy workday,” “a weekend getaway”). This sets the emotional scene of the story.
				</label>
			</div>
			<div class="aai-group">
				<input name="target_persona" value="${this.data.target_persona || ''}" type="text" class="aai-input" placeholder="target persona..." />
				<label>
					Describe the type of person in the story (e.g., “a young professional,” “a busy parent,” “a fitness lover”). This helps tailor tone and perspective.
				</label>
			</div>
			<div class="aai-group">
				<input name="story_theme" value="${this.data.story_theme || ''}" type="text" class="aai-input" placeholder="specific story theme..." />
				<label>
					Write the emotional or narrative theme you want the story to follow (e.g., “self-care,” “productivity boost,” “cozy moments,” “confidence,” “simplicity”). This influences the mood and message.
				</label>
			</div>
			`;
		}

		// Promotional / Offer
		if ( type == 3 ) {
			result += this.products()
			result += this.offer();
		}

		// Educational / Value
		if ( type == 4 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="main_lesson" value="${this.data.main_lesson || ''}" type="text" class="aai-input" placeholder="main lesson..." />
				<label>
					Write the core educational takeaway you want the audience to learn<br>
					(e.g., “how to clean leather safely,” “why hydration matters,” “the benefits of ergonomic design”).
				</label>
			</div>
			<div class="aai-group">
				<input name="facts" value="${this.data.facts || ''}" type="text" class="aai-input" placeholder="facts or notes..." />
				<label>
					Provide any special knowledge, interesting facts, or expert notes you want included (e.g., “this material lasts 2x longer,” “95% of people use it incorrectly”). Leave blank if none.
				</label>
			</div>
			<div class="aai-group">
				<input name="tips_number" value="${this.data.tips_number || 0}" type="number" class="aai-input" placeholder="number of tips..." />
				<label>
					Specify how many tips or points you want the post to include. 
				</label>
			</div>
			`;
		}

		// Customer Review
		if ( type == 5 ) {
			result += this.products()
			result += 
			this.benefits(`Specify the key advantage or positive effect the customer experienced (e.g., “keeps drinks cold all day,” “made my skin feel smoother,” “easy to assemble”).`) +
			this.customer();
		}

		// Comparison
		if ( type == 6 ) {
			result += this.products() + `
			<div class="aai-group">
				<input name="advantages" value="${this.data.advantages || ''}" type="text" class="aai-input" placeholder="key advantages..." />
				<label>
					List the 2-4 main benefits or standout features of your product that you want emphasized in the comparison.
				</label>
			</div>`;
		}

		// New Arrival / Back in Stock
		if ( type == 7 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="features" value="${this.data.features || ''}" type="text" class="aai-input" placeholder="key features..." />
				<label>
					List the main features or attributes of the product that you want highlighted (e.g., “lightweight, waterproof, long battery life”).
				</label>
			</div>
			<div class="aai-group">
				<input name="special" value="${this.data.special || ''}" type="text" class="aai-input" placeholder="what makes it special..." />
				<label>
					Explain what sets this product apart or why people will love it (e.g., “crafted from sustainable materials,” “limited edition design,” “enhanced performance”).
				</label>
			</div>
			` + this.launch();
		}


		// Seasonal / Themed
		if ( type == 8 ) {
			result += this.products()
			result += this.seasonal();
			result += this.offer();
		}


		// Behind the Scenes
		if ( type == 9 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="process" value="${this.data.process || ''}" type="text" class="aai-input" placeholder="part of the process to highlight..." />
				<label>
					Specify the step, activity, or aspect of your process that you want featured (e.g., “handcrafting each item,” “quality checks,” “team brainstorming sessions”). This helps illustrate authenticity and human effort.
				</label>
			</div>
			<div class="aai-group">
				<input name="values" value="${this.data.values || ''}" type="text" class="aai-input" placeholder="brand values to emphasize..." />
				<label>
					List the core values you want to highlight (e.g., “sustainability,” “innovation,” “attention to detail,” “community focus”). These will be woven naturally into the story to strengthen your brand identity.
				</label>
			</div>
			`;
		}

		
		// Tips & Tricks
		if ( type == 10 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="tips_number" value="${this.data.tips_number || 0}" type="number" class="aai-input" placeholder="number of tips..." />
				<label>
					Specify how many tips or points you want the post to include. 
				</label>
			</div>
			<div class="aai-group">
				<input name="tips_type" value="${this.data.tips_type || ''}" type="text" class="aai-input" placeholder="type of tips..." />
				<label>
					Define the style or focus of the tips (e.g., “product hacks,” “time-saving techniques,” “creative uses,” “maintenance tips”).
				</label>
			</div>
			` +
			this.skillLevel();
		}
		
		// Poll / Question
		if ( type == 11 ) {
			result += this.products()
			result += `
			<div class="aai-group">
				<input name="question" value="${this.data.question || ''}" type="text" class="aai-input" placeholder="main question..." />
				<label>
					Write the central question you want to ask the audience (e.g., “Which color do you prefer?”, “How do you usually use this product?”). This will be the focus of the post.
				</label>
			</div>
			<div class="aai-group">
				<input name="poll_options" value="${this.data.poll_options || ''}" type="text" class="aai-input" placeholder="poll options..." />
				<label>
					Provide the answer choices or options for the poll (e.g., “Red, Blue, Green” or “Morning, Afternoon, Evening”). Leave blank if open-ended.
				</label>
			</div>
			<div class="aai-group">
				<input name="insight" value="${this.data.insight || ''}" type="text" class="aai-input" placeholder="insight to gather..." />
				<label>
					Describe what insight or feedback you want from the audience (e.g., “to learn the most popular usage,” “to understand style preferences”). This guides the tone and framing of the post.
				</label>
			</div>
			`
		}




		return result;

	}







	// MARK: Seasonal
	// - seasonal_event
	// ────────────────────────────────────
	seasonal( label ) {
		label = label || `Specify the exact holiday, season, or special event.<br>(e.g. Christmas, Easter, Summer Sale, Valentine's Day, Back to School, Black Friday, Mother's Day)`
		return `
		<div class="aai-group">
			<input name="seasonal_event" value="${this.data.seasonal_event || ''}" type="text" class="aai-input" placeholder="holiday, season, or event..." />
			<label>${label}</label>
		</div>
		`
	}


	// MARK: Skill Level
	// ────────────────────────────────────
	skillLevel() {
		return `
		<div class="aai-group">
			<select name="skill_level" value="${this.data.skill_level || ''}" class="aai-select">
				<option value="" disabled selected>Select skill level...</option>
				<option value="beginner">Beginner</option>
				<option value="intermediate">Intermediate</option>
				<option value="expert">Expert</option>
			</select>
			<label>
				Skill Level
			</label>
		</div>
		`
	}


	// MARK: Offer
	// - offer
	// ────────────────────────────────────
	offer( label, timeframe=true ) {
		label = label || 'Specify the promotion, discount, or incentive (e.g., “20% off all products,” “Buy 1 Get 1 Free,” “Free shipping”).'
		let result = `
		<div class="aai-group">
			<input name="offer" value="${this.data.offer || ''}" type="text" class="aai-input" placeholder="offer, discount, or deal..." />
			<label>${label}</label>
		</div>
		`
		if (timeframe) {
			result += `
			<div class="aai-group">
				<input name="offer_timeframe" value="${this.data.offer_timeframe || ''}" type="text" class="aai-input" placeholder="offer timeframe..." />
				<label>
					Specify when the offer begins and ends (e.g., “Valid until Sunday,” “Only this week,” “Ends on March 12”).<br>
					If the promotion has no timeframe, leave this empty.
				</label>
			</div>`
		}

		return result;
	}


	// MARK: CTA
	// ────────────────────────────────────
	cta( label ) {
		label = label || `The action you want the recipient to take, e.g., “Shop now,” “Pre-order today,” “Learn more.”`;
		return `
			<div class="aai-group">
				<input name="cta" value="${this.data.cta || ''}" type="text" class="aai-input" placeholder="suggested call-to-action..." />
				<label>${label}</label>
			</div>
		`;
	}


	// MARK: CTA Style
	// ────────────────────────────────────
	ctaStyle( label ) {
		label = label || `The style of the call-to-action.`;
		return `
			<div class="aai-group">
				<select name="user_type" value="${this.data.user_type || ''}" class="aai-select">
					<option value="" disabled selected>Select cta style...</option>
					<option value="soft">Soft CTA (subtle prompt)</option>
					<option value="strong">Strong CTA (direct command)</option>
					<option value="value-driven">Value-Driven CTA (focus on benefits)</option>
					<option value="urgent">Urgent CTA (creates urgency)</option>
					<option value="friendly">Friendly CTA (conversational tone)</option>
					<option value="teaser">Teaser CTA (creates curiosity)</option>
					<option value="none">No CTA</option>
				</select>
				<label>${label}</label>
			</div>
		`;
	}



	// MARK: benefits
	// ────────────────────────────────────
	benefits( label ) {
		label = label || `Short list of what makes this product unique or valuable.`
		return `
			<div class="aai-group">
				<input name="key_benefits" value="${this.data.key_benefits || ''}" type="text" class="aai-input" placeholder="key benefits..." />
				<label>
					${label}
				</label>
			</div>
		`
	}



	// MARK: Launch
	// ────────────────────────────────────
	launch( label ) {
		label = label || `The official release date. Leave blank if timing is flexible.`
		return `
		<div class="aai-group">
			<input name="launch" value="${this.data.launch || ''}" type="date" class="aai-input"/>
			<label>${label}</label>
		</div>
		`
	}



	// MARK: Customer
	// ────────────────────────────────────
	customer( label ) {
		label = label || `Enter the customer's name to personalize the post. Leave blank if anonymous.`
		return `
			<div class="aai-group">
				<input name="customer_name" value="${this.data.customer_name || ''}" type="text" class="aai-input" placeholder="customer name..." />
				<label>${label}</label>
			</div>
		`
	}





	// MARK: Products
	// ────────────────────────────────────
	products1( label ) {
		return `
			<div class="aai-group">
				<input name="products" value="${this.data.products || ''}" type="text" class="aai-input" placeholder="select products..." />
				${label ? `<label>${label}</label>` : ''}
			</div>
		`
	}


	// MARK: Products
	// ────────────────────────────────────
	products( label ) {

		if ( label !== false ) label = label || 'Relevant Products'

		setTimeout(() => {
			
			this.productSelect = new ProductSelect({
				label: label,
				container: this.target[0].querySelector('.aai-select-products-container'),
				placeholder: 'search products...',
				multiple: true,
				initialIds: [ DATA.post.id ],
				onChange: (selectedIds) => {
					//console.log('Selected product IDs:', selectedIds);
				}
			});
		
		}, 10);

		return '<div class="aai-select-products-container"></div>';

	
	}



}





