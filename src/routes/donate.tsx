// This is the donation page where users fill out the form to make a donation.
// Shows the progress tracker and the form with payment options.

import { createFileRoute } from '@tanstack/react-router'
import { DonateForm } from '@/components/donate/form.tsx'
import { GoalTracker } from '@/components/goal-tracker.tsx'
import { createSeo } from '@/components/seo.tsx'
import { siteConfig } from '@/configs/site-config.ts'
import { getDonationTotal } from '@/server/functions/get-donation-total.ts'
import { logger } from '@/utils/logger.ts'

export const Route = createFileRoute('/donate')({
	head: () =>
		createSeo({
			title: 'Donate Now',
			description:
				'Make a donation to support our crowdfunding campaign and help Smiley reach the next goal. Every contribution makes a difference!',
			url: `${siteConfig.siteUrl}/donate`,
			keywords: [...siteConfig.keywords, 'donate', 'contribute', 'donation'],
		}),
	loader: async () => {
		try {
			const total = await getDonationTotal()
			return { total }
		} catch (error) {
			// Don't block page load on error
			logger.error('Failed to prefetch donation total:', error)
			return { total: undefined }
		}
	},
	component: Donate,
})

function Donate() {
	const { total } = Route.useLoaderData()

	return (
		<main className="space-y-4">
			<h1 className="font-bold text-2xl text-white">
				Help Smiley Get Well By Reaching The Next Donation Goal!
			</h1>
			<GoalTracker initialTotal={total} />
			<DonateForm />
		</main>
	)
}
