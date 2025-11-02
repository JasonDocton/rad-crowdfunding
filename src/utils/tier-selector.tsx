// This figures out which Rust game item tier matches a donation amount.
// For example, $50 is "tommy" tier, $100 is "hmlmg" tier, etc.

import { donationTiers, type TierName } from './generate-tiers.tsx'

const selectTierByAmountRange = (num: number): TierName | 'hv' =>
	donationTiers.find(({ min, max }) => num >= min && num < max)?.name ?? 'hv'

export { selectTierByAmountRange }
