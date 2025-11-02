// This sets the donation amounts and which Rust game items they match.
// Each donation level gets a different icon like a rock, pick, or AK-47.
// Note that the tierLabels are used both for displaying the name of the their and for catching the icon url.

const suggestedDonationTiers = {
	amounts: [1, 5, 10, 20, 50, 100, 200, 500, 1000, 1500, 5000, 10000],
	tierLabels: [
		'rock', // $1-$4 range
		'pick', // $5-$9 range
		'bow', // $10-$19 range
		'p2', // $20-$49 range
		'tommy', // $50-$99 range
		'hmlmg', // $100-$199 range
		'ak', // $200-$499 range
		'l9', // $500-$999 range
		'm2', // $1000-$1499 range
		'rocket', // $1500-$4999 range
		'c4', // $5000-$9999 range
	],
} as const

type SuggestedDonationTier = (typeof suggestedDonationTiers.amounts)[number]

export { suggestedDonationTiers, type SuggestedDonationTier }
