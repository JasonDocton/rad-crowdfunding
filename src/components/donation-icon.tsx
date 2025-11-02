// This displays the Rust game item icon that matches the donation amount.
// Each donation gets a different icon based on how much was donated.

import { selectTierByAmountRange } from '@/utils/tier-selector.tsx'

function DonationIcon({ amount, size }: { amount: number; size: number }) {
	const tierName = selectTierByAmountRange(amount)
	return (
		<img
			alt={`${tierName} icon`}
			draggable="false"
			height={size}
			src={`/${tierName}.webp`}
			width={size}
		/>
	)
}

export { DonationIcon }
