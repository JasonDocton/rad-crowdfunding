// This displays a summary of the donation with an icon and tier level on the Donate Page.
// Shows the donation amount and which Rust game item tier it matches.

import { selectTierByAmountRange } from '@/utils/tier-selector.tsx'
import { DonationIcon } from './donation-icon.tsx'

interface DonationSummaryProps {
	amount: number
}

function DonationSummary({ amount }: DonationSummaryProps) {
	const tierName = selectTierByAmountRange(amount)

	return (
		<section className="flex items-center justify-between bg-primary/40 p-2 text-right font-extrabold font-mono text-base uppercase">
			<h2 className="sr-only">Donation Summary</h2>
			<div aria-hidden="true" className="relative flex">
				<DonationIcon amount={amount} size={80} />
				<span className="-z-10 absolute h-full w-full rounded-full bg-accent" />
			</div>
			<div>
				<div className="flex flex-col">
					<span>{tierName} Level Donation</span>
					<span>${amount} USD</span>
				</div>
			</div>
		</section>
	)
}

export { DonationSummary }
