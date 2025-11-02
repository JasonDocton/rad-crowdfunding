// This lets users choose how they want to pay: Stripe, PayPal, or Bitcoin.
// Shows three buttons that users can click to select their payment method.

import type { PaymentMethod } from 'convex/types'
import { RadioGroup } from '../radio-group.tsx'

interface DonateMethodSelectorProps {
	value: PaymentMethod
	onChange: (method: PaymentMethod) => void
	disabled?: boolean
}

const paymentMethods = [
	{
		value: 'stripe' as const,
		label: 'Stripe',
		description: 'Credit/Debit Card',
	},
	{
		value: 'paypal' as const,
		label: 'PayPal',
		description: 'PayPal Account',
	},
	{
		value: 'bitcoin' as const,
		label: 'Bitcoin',
		description: 'Cryptocurrency',
	},
]

function DonateMethodSelector({
	value,
	onChange,
	disabled = false,
}: DonateMethodSelectorProps) {
	return (
		<RadioGroup
			className="flex gap-4"
			disabled={disabled}
			legend="Select Payment Method"
			name="paymentMethod"
			onChange={onChange}
			options={paymentMethods}
			value={value}
			variant="method"
		/>
	)
}

export { DonateMethodSelector }
