// This shows preset donation amounts that users can quickly select.
// Displays common amounts like $1, $5, $10, etc. You can change these in the donate-config.

import { donationTiers } from '@/utils/generate-tiers.tsx'
import { RadioGroup } from '../radio-group.tsx'

interface DonateOptionsProps {
	onChange: (amount: number) => void
	value?: number
}

// Calculate donation options at module level (only once, not per render)
const donationOptions = donationTiers.map(({ min }) => min).slice(0, -2)

function DonateRecommendedInput({ onChange, value }: DonateOptionsProps) {
	return (
		<RadioGroup
			className="grid grid-cols-3 gap-4"
			legend="Recommended Donation Amounts"
			name="donationAmount"
			onChange={onChange}
			options={donationOptions.map((amount) => ({
				value: amount,
				label: `$${amount}`,
			}))}
			value={value}
			variant="donation"
		/>
	)
}

export { DonateRecommendedInput }
