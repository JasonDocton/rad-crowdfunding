// This creates the donation tier ranges from the config settings.
// Converts the list of amounts into ranges like $1-$4, $5-$9, etc.

import { suggestedDonationTiers } from '@/configs/donate-config.ts'

type TierName = (typeof suggestedDonationTiers.tierLabels)[number]

interface Tier {
	min: number
	max: number
	name: TierName
}

function generateDonationTiers(config: typeof suggestedDonationTiers): Tier[] {
	const { amounts, tierLabels } = config

	return amounts.slice(0, -1).reduce<Tier[]>((acc, min, i) => {
		const max = amounts[i + 1]
		const name = tierLabels[i]
		if (max !== undefined && name !== undefined) {
			acc.push({ min, max, name })
		}
		return acc
	}, [])
}

const donationTiers = generateDonationTiers(suggestedDonationTiers)

export { type TierName, donationTiers, generateDonationTiers }
