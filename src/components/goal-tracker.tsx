// This shows how much money has been raised toward the goal.
// Thanks to Convex, this easily updates in real-time as donations come in.
// The use of minimumFractionDigits ensures we always show two decimal places for cents.
// Bitcoin donations can sometimes result in fractional cents, so this is important.

import { api } from 'convex/_generated/api'
import { useQuery } from 'convex/react'
import type { DonationTotal } from 'convex/types'

const goalAmount = 12000
const plusIconSvgPath = 'M12 4.5v15m7.5-7.5h-15'

interface GoalTrackerProps {
	initialTotal?: DonationTotal
}

function PlusIcon() {
	return (
		<svg
			aria-hidden="true"
			className="bg-primary"
			fill="none"
			height={56}
			stroke="hsla(360, 100%, 100%, 0.28)"
			strokeWidth="4"
			viewBox="0 0 24 24"
			width={56}
		>
			<path d={plusIconSvgPath} strokeLinejoin="round" />
		</svg>
	)
}

function GoalTracker({ initialTotal }: GoalTrackerProps) {
	const liveTotal = useQuery(api.donation.getAmountTotal)
	const total = liveTotal ?? initialTotal ?? 0
	const percentComplete = Math.round((total / goalAmount) * 100)

	return (
		<div className="relative flex min-h-14 w-full items-center overflow-hidden">
			<PlusIcon />
			<meter
				aria-label={`Donation goal progress: $${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of $${goalAmount.toLocaleString('en-US')} raised, ${percentComplete}% complete`}
				className="h-14 w-full"
				max={goalAmount}
				min={0}
				value={total}
			>
				{percentComplete}%
			</meter>
			<span
				aria-hidden="true"
				className="-translate-y-1/2 absolute top-1/2 right-0 pr-2 text-sm leading-tight"
			>
				$
				{total.toLocaleString('en-US', {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})}{' '}
				/ ${goalAmount.toLocaleString('en-US')} Raised
			</span>
		</div>
	)
}

export { GoalTracker }
