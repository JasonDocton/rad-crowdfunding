// This is the home page that shows the donation goal, progress bar, and recent donors.
// It's the first page visitors see when they come to the site.

import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/button.tsx'
import { DonationTable } from '@/components/donation-table.tsx'
import { GoalTracker } from '@/components/goal-tracker.tsx'
import { createSeo } from '@/components/seo.tsx'
import { ShareModal } from '@/components/share-modal.tsx'
import { siteConfig } from '@/configs/site-config.ts'
import { getDonationList } from '@/server/functions/get-donation-list.ts'
import { getDonationTotal } from '@/server/functions/get-donation-total.ts'

const cacheHeaders = {
	'Cache-Control': 'max-age=300, s-maxage=3600, stale-while-revalidate',
}

export const Route = createFileRoute('/')({
	head: () =>
		createSeo({
			url: siteConfig.siteUrl,
		}),
	loader: async () => {
		const [donors, total] = await Promise.all([
			getDonationList(),
			getDonationTotal(),
		])
		return { donors, total }
	},
	headers: () => cacheHeaders,
	component: Home,
})

function Home() {
	const { donors, total } = Route.useLoaderData()
	return (
		<main className="flex max-h-[calc(100svh-5rem)] flex-col space-y-4 overflow-hidden">
			<section className="shrink-0">
				<img
					alt="A group of characters representing our fundraising goal"
					className="w-full"
					draggable={false}
					src="/smiley.webp"
				/>
				<h1 className="mt-2 text-2xl text-white">Rad Crowdfunding</h1>
				<p>Help Smiley Get Well By Reaching The Next Donation Goal!</p>
			</section>

			<section className="flex min-h-0 flex-col space-y-2">
				<GoalTracker initialTotal={total} />
				<div className="flex w-full flex-row gap-4">
					<Button asChild variant="primary">
						<Link to="/donate">Donate</Link>
					</Button>
					<ShareModal />
				</div>
				<DonationTable initialDonations={donors} />
			</section>
		</main>
	)
}
