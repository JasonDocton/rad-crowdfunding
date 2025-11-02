// This saves the connection between PayPal order IDs and payment IDs.
// Helps the success page find donations using the order ID from the URL.

import { internalMutation, mutation } from 'convex/_generated/server'
import { v } from 'convex/values'

// Store PayPal order ID → capture ID mapping
// Called by PayPal webhook after creating donation
// Why needed: PayPal redirects with order ID (?token=ORDER_ID) but we store
// capture ID as payment_id (authoritative proof of payment). This mapping
// allows success page to resolve order ID → capture ID → donation.
// Note: This must be in a separate file from paypal.ts because mutations
// cannot be defined in Node.js modules ('use node' files).
export const storePaymentIdMapping = internalMutation({
	args: {
		order_id: v.string(), // ID from redirect URL
		capture_id: v.string(), // ID stored in donations table
	},
	handler: async (ctx, { order_id, capture_id }) => {
		// Check if mapping already exists (idempotency)
		const existing = await ctx.db
			.query('payment_id_mappings')
			.withIndex('by_source_id', (q) => q.eq('source_id', order_id))
			.first()

		if (existing) {
			return existing._id
		}

		await ctx.db.insert('payment_id_mappings', {
			source_id: order_id,
			donation_payment_id: capture_id,
		})
	},
})

// Clean up old payment ID mappings (called by scheduled cron)
// Strategy:
// - Delete mappings older than 7 days
// - Users typically view success page within minutes of payment
// - After success page visit, mapping is never needed again
// - 7-day retention provides generous buffer for delayed page visits
// This prevents database bloat while maintaining short-term accessibility.
// Internal-only to prevent unauthorized cleanup triggering
export const cleanupOldPaymentIdMappings = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now()
		const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

		// Query all mappings older than 7 days
		// Note: _creationTime is built-in timestamp, not indexed
		const oldMappings = await ctx.db
			.query('payment_id_mappings')
			.filter((q) => q.lt(q.field('_creationTime'), sevenDaysAgo))
			.collect()

		// Delete each old mapping
		for (const mapping of oldMappings) {
			await ctx.db.delete(mapping._id)
		}

		return {
			deletedCount: oldMappings.length,
		}
	},
})
