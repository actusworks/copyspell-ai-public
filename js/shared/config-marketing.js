



const Marketing = {}




// MARK: Groups
// ────────────────────────────────────
Marketing.groups = {
	social: 'Social Media Post',
	adv: 'Advertisement',
	email: 'Email Newsletter',
	blog: 'Blog Post',
	//testimonial: 'Customer Testimonial',
}

Marketing.groupsShort = {
	social: 'social post',
	adv: 'advertisement',
	email: 'email',
	blog: 'blog post',
	//testimonial: 'customer testimonial',
}





// MARK: Media & Types
// ────────────────────────────────────
Marketing.media = {
	social: ['Facebook Post', 'Instagram Post', 'LinkedIn Post', 'Tweet' ],
	adv: ['Facebook Ad', 'Instagram Ad', 'Google Search Ad', 'Google Display Ad', 'YouTube Ad', 'TikTok Ad', 'LinkedIn Ad', 'Pinterest Ad' ],
}

Marketing.types = {
	social: [
		'🛒 Product Showcase',
		'🎥 Demo / Tutorial',
		'🌟 Lifestyle / Storytelling',
		'💰 Promotion / Offer',
		'🧠 Educational / Value',
		'📝 Customer Review',
		'🆚 Comparison / Feature Highlight',
		'🆕 New Arrival / Back in Stock',
		'🎁 Seasonal / Themed',
		'🎬 Behind the Scenes / Brand Story',
		'🎯 Tips & Tricks',
		'💬 Poll / Question to Audience'
	],
	adv: [ 
		'📢 Product Promotion',
		'💸 Discount / Offer',
		'🚀 Launch / New Arrival',
		'🏷️ Brand Awareness',
		'🎯 Retargeting',
		'🎄 Seasonal / Holiday',
		'🌟 Testimonial / Social Proof',
		'🆚 Comparison',
		'🎬 Video / Visual Showcase',
		'⏰ Limited-Time / Urgency',
		'🧩 Problem-Solution Ad',
		'💡 Value Proposition Ad',
		'🤝 Partnership / Collaboration Ad'
	],
	email: [
		'💌 Promotional',
		'👋 Welcome',
		'🚀 Product Launch',
		'🛍️ Product Highlight',
		'💰 Offer / Discount',
		'🆕 New Collection',
		'🛒 Abandoned Cart',
		'🙏 Thank You',
		'💤 Re-engagement',
		'📦 Post-Purchase',
		'📰 Newsletter',
		'🎄 Seasonal',
		'🧠 Educational / Tips',
		'📖 Storytelling',
		'🎉 Milestone / Loyalty',
		'🗣️ Feedback Request',
		'👑 VIP / Exclusive Access',
		//'🎯 Personalized Recommendation'
	],
	blog: [
		'🛍️ Product Blog',
		'🧭 How-To Guide',
		'🧩 Problem-Solution',
		'📊 Industry Insights',
		'🆚 Comparison',
		'📚 Case Study',
		'🧾 Listicle',
		'📣 Announcement',
		'💭 Opinion / Thought Leadership',
		'📖 Storytelling',
		'📈 Data-Driven Insights',
		'🗞️ News / Trend Analysis'
	],
	testimonial: [
		'🛒 Product Experience',
		'🔁 Before and After',
		'🧩 Problem-Solution',
		'💎 Brand Loyalty',
		'🧭 Customer Journey',
		'💖 Emotional',
		'👨‍⚕️ Professional Endorsement',
		'✨ Feature-specific Praise',
		'🛠️ Customer Service Testimonial',
		'📈 Impact / ROI Testimonial',
		'🎬 Video Testimonial',
		'🌟 Influencer Endorsement'
	]
}




// MARK: Descriptions
// ────────────────────────────────────
Marketing.descriptions = {
	social: [
		'Highlights a specific product’s key features and benefits.',
		'Shows how to use the product or demonstrates it in action.',
		'Connects the product to a real-life story or lifestyle moment.',
		'Announces sales, discounts, or limited-time deals.',
		'Shares knowledge or tips that relate to the product’s niche.',
		'Features a real user’s feedback or testimonial post.',
		'Compares your product with alternatives or emphasizes unique features.',
		'Announces new product drops or restocks.',
		'Aligns the product with holidays, seasons, or special events.',
		'Shares your brand’s personality or creative process.',
		'Reposts or highlights content made by real customers.',
		'Offers helpful product-related advice or creative uses.',
		'Encourages engagement through questions or opinions.'
	],
	adv: [
		'A direct ad showcasing a product’s key value or offer.',
		'Focuses on price drops, sales, or limited-time discounts.',
		'Introduces a new product or upcoming release.',
		'Strengthens brand recognition with an emotional or visual message.',
		'Targets users who interacted before, reminding them to complete a purchase.',
		'Tailored ad for specific holidays, seasons, or events.',
		'Features customer reviews or endorsements to build trust.',
		'Shows how your product outperforms competitors or alternatives.',
		'Focuses on visuals or short-form video storytelling.',
		'Creates urgency by emphasizing limited-time availability or deadlines.',
		'Addresses a common pain point and positions your product as the solution.',
		'Highlights your main unique selling proposition or value.',
		'Announces collaborations or co-branded campaigns.'
	],
	email: [
		'Sends general promotions or special offers to subscribers.',
		'Welcomes new subscribers and introduces your brand.',
		'Announces a new product or collection release.',
		'Spotlights specific products or categories.',
		'Encourages purchases with discounts or coupons.',
		'Highlights new arrivals or seasonal collections.',
		'Reminds customers to complete their cart purchase.',
		'Thanks customers for their purchase or support.',
		'Re-engages inactive subscribers or past customers.',
		'Follows up after purchase to encourage repeat orders or feedback.',
		'Shares regular news, articles, or updates from your brand.',
		'Celebrates holidays or seasonal occasions with themed messages.',
		'Provides educational tips or valuable information.',
		'Tells a story to build emotional connection with your audience.',
		'Rewards loyal customers or celebrates milestones.',
		'Requests feedback, reviews, or testimonials from customers.',
		'Offers exclusive content or deals to VIP customers.',
		//'Sends product suggestions based on user behavior or preferences.'
	],
	blog: [
		'Explains and promotes a specific product or collection.',
		'Provides a step-by-step tutorial or guide.',
		'Starts with a relatable problem and offers your product as the solution.',
		'Shares expert insights or analysis about your industry.',
		'Compares your product to alternatives in an objective way.',
		'Details a real customer success story or internal brand case study.',
		'Presents information in a list format for easier reading.',
		'Announces company or product updates and releases.',
		'Expresses professional opinions or thought leadership ideas.',
		'Tells a story to connect emotionally with readers.',
		'Uses data or research to strengthen credibility.',
		'Analyzes recent trends or news relevant to your audience.'
	],
	testimonial: [
		'Shows how a customer experienced and benefited from your product.',
		'Presents before-and-after results that demonstrate transformation.',
		'Describes how your product solved a specific customer problem.',
		'Highlights repeat purchases or long-term trust from loyal users.',
		'Tells the customer’s full journey from discovery to satisfaction.',
		'Focuses on emotional relief or satisfaction after using your product.',
		'Features an expert or professional endorsement.',
		'Praises a specific feature or function customers loved most.',
		'Commends your brand’s customer support or after-sales service.',
		'Quantifies the positive impact or return on investment.',
		'Shares an authentic video testimonial from a real customer.',
		'Highlights content or endorsements from influencers or partners.'
	]
}








// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Marketing;
