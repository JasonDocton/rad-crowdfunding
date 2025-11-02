// This looks up PayPal donations by order ID.
// Used on the success page to show donation info after payment.

import { query } from 'convex/_generated/server'
import { v } from 'convex/values'

// Get capture ID from order ID
// Used by success page to resolve PayPal order ID → capture ID
// Returns the capture_id if mapping exists, otherwise returns null
// (null means webhook hasn't created the donation yet)
// Note: This must be in a separate file from paypal.ts because queries
// cannot be defined in Node.js modules ('use node' files).
export const getPaymentIdMapping = query({
	args: {
		order_id: v.string(),
	},
	handler: async (ctx, { order_id }) => {
		const mapping = await ctx.db
			.query('payment_id_mappings')
			.withIndex('by_source_id', (q) => q.eq('source_id', order_id))
			.first()

		return mapping?.donation_payment_id ?? null
	},
})
