// This defines the structure of all database tables (donations, Bitcoin payments, etc.).
// It's like a blueprint that describes what data we store and how to find it.

import { defineSchema, defineTable } from 'convex/server'
import { type Infer, v } from 'convex/values'

// Shared Payment Metadata Validator
export const paymentMetadataValidator = v.optional(
	v.object({
		player_name: v.union(v.string(), v.null()),
		use_player_name: v.boolean(),
		message: v.optional(v.string()),
	})
)

const schema = defineSchema({
	donations: defineTable({
		amount: v.float64(),
		payment_id: v.string(),
		display_name: v.string(),
		payment_method: v.union(
			v.literal('stripe'),
			v.literal('paypal'),
			v.literal('bitcoin')
		),
		message: v.optional(v.string()),
	}).index('by_payment_id', ['payment_id']),
	payment_id_mappings: defineTable({
		source_id: v.string(), // Payment ID from URL (Stripe session_id / PayPal order_id)
		donation_payment_id: v.string(), // Actual payment_id in donations table (capture_id for PayPal)
	}).index('by_source_id', ['source_id']),
	bitcoin_config: defineTable({
		key: v.string(),
		value: v.union(v.number(), v.string()), // Support both numbers and stringified JSON
	}).index('by_key', ['key']),
	pending_bitcoin_payments: defineTable({
		session_id: v.string(), // Browser session ID for ownership validation
		address: v.string(),
		expected_amount_btc: v.number(),
		expected_amount_usd: v.number(),
		exchange_rate: v.number(),
		derivation_index: v.number(),
		metadata: paymentMetadataValidator,
		status: v.union(
			v.literal('initialized'), // Address generated, waiting for transaction
			v.literal('pending'), // Transaction detected, waiting for confirmations
			v.literal('confirmed'), // Fully confirmed, donation created
			v.literal('expired') // Timed out or abandoned
		),
		txid: v.optional(v.string()), // Transaction ID once detected
		detected_at: v.optional(v.number()), // Timestamp when transaction first seen
		scheduled_job_id: v.optional(v.id('_scheduled_functions')), // Scheduler job ID for cancellation
		created_at: v.number(),
		expires_at: v.number(),
	})
		.index('by_address', ['address'])
		.index('by_session_id', ['session_id'])
		.index('by_session_amount', ['session_id', 'expected_amount_usd']) // For idempotency
		.index('by_status', ['status'])
		.index('by_status_and_expires', ['status', 'expires_at']), // For cleanup queries
})

// biome-ignore lint/style/noDefaultExport: Safe to write default here, according to Convex docs
export default schema

export const donation = schema.tables.donations.validator
export type Donation = Infer<typeof donation>

export const bitcoinConfig = schema.tables.bitcoin_config.validator
export type BitcoinConfig = Infer<typeof bitcoinConfig>

export const pendingBitcoinPayment =
	schema.tables.pending_bitcoin_payments.validator
export type PendingBitcoinPayment = Infer<typeof pendingBitcoinPayment>
