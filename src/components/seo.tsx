// This helps search engines like Google understand what each page is about.
// It adds special tags to pages so they show up better in search results.

import { siteConfig } from '@/configs/site-config.ts'

interface SEOOptions {
	title?: string
	description?: string
	keywords?: string[]
	image?: string
	url?: string
	type?: 'website' | 'article'
	includeCanonical?: boolean
	robots?: string
}

// Create comprehensive SEO metadata for TanStack Router head() configuration
// // In a route file:
// export const Route = createFileRoute('/donate')({
//   head: () => createSeo({
//     title: 'Donate Now',
//     description: 'Make a donation to support our cause'
//   })
// })
export function createSeo(options: SEOOptions = {}) {
	const {
		title,
		description = siteConfig.siteDescription,
		keywords = siteConfig.keywords,
		image = `${siteConfig.siteUrl}${siteConfig.ogImage}`,
		url = siteConfig.siteUrl,
		type = 'website',
		includeCanonical = true,
		robots = 'index, follow',
	} = options

	// Auto-append site name to page titles
	const pageTitle = title
		? `${title} | ${siteConfig.siteTitle}`
		: siteConfig.siteTitle

	return {
		meta: [
			// Primary Meta Tags
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: pageTitle },
			{ name: 'description', content: description },
			{ name: 'keywords', content: keywords.join(', ') },

			// Open Graph / Facebook
			{ property: 'og:type', content: type },
			{ property: 'og:url', content: url },
			{ property: 'og:title', content: pageTitle },
			{ property: 'og:description', content: description },
			{ property: 'og:image', content: image },
			{ property: 'og:site_name', content: siteConfig.siteTitle },
			{ property: 'og:locale', content: siteConfig.locale },

			// Twitter
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:url', content: url },
			{ name: 'twitter:title', content: pageTitle },
			{ name: 'twitter:description', content: description },
			{ name: 'twitter:image', content: image },
			...(siteConfig.twitterHandle
				? [{ name: 'twitter:site', content: siteConfig.twitterHandle }]
				: []),

			// Additional SEO
			{ name: 'robots', content: robots },
			{ name: 'language', content: siteConfig.language },
			{ name: 'theme-color', content: siteConfig.themeColor },
		],

		links: [
			// Favicons - SVG first for modern browsers (especially Safari)
			{ rel: 'icon', type: 'image/svg+xml', href: '/favicon/favicon.svg' },
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '16x16',
				href: '/favicon/favicon-16x16.png',
			},
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '192x192',
				href: '/favicon/android-icon-192x192.png',
			},
			{ rel: 'icon', type: 'image/x-icon', href: '/favicon/favicon.ico' },
			{
				rel: 'apple-touch-icon',
				sizes: '180x180',
				href: '/favicon/apple-touch-icon.png',
			},
			// Canonical URL
			...(includeCanonical ? [{ rel: 'canonical', href: url }] : []),
		],

		scripts: [
			// JSON-LD Structured Data - Organization
			{
				type: 'application/ld+json',
				children: JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'Organization',
					name: siteConfig.organizationName,
					url: siteConfig.siteUrl,
					logo: `${siteConfig.siteUrl}${siteConfig.organizationLogo}`,
					contactPoint: {
						'@type': 'ContactPoint',
						email: siteConfig.contactEmail,
						contactType: 'Customer Service',
					},
					sameAs: siteConfig.twitterHandle
						? [
								`https://twitter.com/${siteConfig.twitterHandle.replace('@', '')}`,
							]
						: [],
				}),
			},

			// JSON-LD DonateAction - Shows donation info directly in search results
			{
				type: 'application/ld+json',
				children: JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'DonateAction',
					recipient: {
						'@type': 'Organization',
						name: siteConfig.organizationName,
						url: siteConfig.siteUrl,
					},
					paymentAccepted: ['Credit Card', 'PayPal', 'Bitcoin'],
					url: `${siteConfig.siteUrl}/donate`,
					description: siteConfig.siteDescription,
				}),
			},

			// JSON-LD Structured Data - WebSite
			{
				type: 'application/ld+json',
				children: JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'WebSite',
					name: siteConfig.siteTitle,
					url: siteConfig.siteUrl,
					description: siteConfig.siteDescription,
					inLanguage: siteConfig.language,
				}),
			},
		],
	}
}
