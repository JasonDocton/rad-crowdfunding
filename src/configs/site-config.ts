// This file has all the settings for the website like the name, description, and social media links.
// Mostly just used for SEO purposes.

const siteConfig = {
	// Basic Information
	siteUrl: 'https://rad-crowdfunding-demo.jason-be2.workers.dev',
	siteTitle: 'Rad Crowdfunding',
	siteDescription:
		'Help Smiley reach the next donation goal! Support our crowdfunding campaign and make a difference today.',

	// SEO & Social
	keywords: [
		'crowdfunding',
		'donations',
		'fundraising',
		'charity',
		'community support',
	],
	ogImage: '/og-image.png', // 1200x630px recommended
	twitterHandle: '@youarerad', // Optional: Twitter/X handle

	// Organization Info (for structured data)
	organizationName: 'Rise Above The Disorder',
	organizationLogo: '/logo.png',
	contactEmail: 'hey@youarerad.org',

	// Language & Locale
	locale: 'en_US',
	language: 'en',

	// Theme Colors
	themeColor: '#cd412b', // Primary red color from your theme
}

// Used by the share-modal.tsx component, but kept here since you'll likely want to reuse the types here or even add links to your own socials
interface SocialMediaLink {
	readonly name: string
	readonly url: string
	readonly icon: string
}

const shareToSocialMedia: readonly SocialMediaLink[] = [
	{
		name: 'X',
		url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Support ${siteConfig.siteTitle}!`)}&url=${siteConfig.siteUrl}`,
		icon: 'x',
	},
	{
		name: 'Facebook',
		url: `https://www.facebook.com/sharer/sharer.php?u=${siteConfig.siteUrl}`,
		icon: 'facebook',
	},
	{
		name: 'Reddit',
		url: `https://www.reddit.com/submit?url=${siteConfig.siteUrl}&title=${encodeURIComponent(siteConfig.siteTitle)}`,
		icon: 'reddit',
	},
]

export { shareToSocialMedia, siteConfig }
