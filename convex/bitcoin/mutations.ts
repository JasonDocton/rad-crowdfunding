/**
 * Bitcoin Database Mutations
 *
 * Database operations for Bitcoin payment processing.
 * Handles pending payment CRUD, derivation counter, and cleanup operations.
 */

import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from 'convex/_generated/server'
import { v } from 'convex/values'
import { paymentMetadataValidator } from '../schema.ts'

// Internal mutation to atomically get next derivation index
export const getNextDerivationIndex = internalMutation({
	args: {},
	handler: async (ctx) => {
		const config = await ctx.db
			.query('bitcoin_config')
			.withIndex('by_key', (q) => q.eq('key', 'next_derivation_index'))
			.first()

		if (!config) {
			// First time setup - initialize counter
			await ctx.db.insert('bitcoin_config', {
				key: 'next_derivation_index',
				value: 1,
			})
			return 0
		}

		const currentIndex =
			typeof config.value === 'number' ? config.value : Number(config.value)
		await ctx.db.patch(config._id, { value: currentIndex + 1 })
		return currentIndex
	},
})

// Check for existing Bitcoin payment session (idempotency)
// If a payment with same session_id and amount exists and hasn't expired,
// returns the existing address. Otherwise returns null.
// Used by generateBitcoinAddress to prevent generating multiple addresses
// when user refreshes or clicks generate multiple times.
export const checkExistingPaymentSession = internalQuery({
	args: {
		session_id: v.string(),
		amount: v.number(),
	},
	handler: async (ctx, { session_id, amount }) => {
		const now = Date.now()

		// Check for existing payment with same session_id and amount
		const existing = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_session_amount', (q) =>
				q.eq('session_id', session_id).eq('expected_amount_usd', amount)
			)
			.first()

		// If exists and not expired, return existing
		if (existing && existing.expires_at > now) {
			return {
				address: existing.address,
				derivation_index: existing.derivation_index,
			}
		}

		return null
	},
})

// Validate that a session owns a specific Bitcoin address
export const validateSessionOwnsAddress = internalMutation({
	args: {
		session_id: v.string(),
		address: v.string(),
	},
	handler: async (ctx, { session_id, address }) => {
		const now = Date.now()

		// Find payment by address
		const payment = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_address', (q) => q.eq('address', address))
			.first()

		if (!payment) {
			throw new Error('Address not found in pending payments')
		}

		if (payment.session_id !== session_id) {
			throw new Error('Session does not own this address')
		}

		// Only enforce expiry if no transaction detected yet
		// Once a transaction is sent, we must continue monitoring regardless of expiry
		if (payment.status === 'initialized' && payment.expires_at <= now) {
			throw new Error('Payment session has expired')
		}

		return true
	},
})

// Create a pending Bitcoin payment record
export const createPendingBitcoinPayment = internalMutation({
	args: {
		session_id: v.string(),
		address: v.string(),
		expected_amount_btc: v.number(),
		expected_amount_usd: v.number(),
		exchange_rate: v.number(),
		derivation_index: v.number(),
		metadata: paymentMetadataValidator,
	},
	handler: async (
		ctx,
		{
			session_id,
			address,
			expected_amount_btc,
			expected_amount_usd,
			exchange_rate,
			derivation_index,
			metadata,
		}
	) => {
		const now = Date.now()
		const expiresAt = now + 86400000 // 24 hours

		await ctx.db.insert('pending_bitcoin_payments', {
			session_id,
			address,
			expected_amount_btc,
			expected_amount_usd,
			exchange_rate,
			derivation_index,
			metadata,
			status: 'initialized', // Start in initialized state
			created_at: now,
			expires_at: expiresAt,
		})
	},
})

// Update pending payment with scheduled job ID for cancellation
export const updatePendingPaymentJobId = internalMutation({
	args: {
		address: v.string(),
		scheduled_job_id: v.id('_scheduled_functions'),
	},
	handler: async (ctx, { address, scheduled_job_id }) => {
		const payment = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_address', (q) => q.eq('address', address))
			.first()

		if (!payment) {
			throw new Error(`Pending payment not found for address: ${address}`)
		}

		await ctx.db.patch(payment._id, { scheduled_job_id })
		return payment._id
	},
})

// Update pending payment with transaction details when detected
export const updatePendingPaymentWithTx = internalMutation({
	args: {
		address: v.string(),
		txid: v.string(),
	},
	handler: async (ctx, { address, txid }) => {
		const payment = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_address', (q) => q.eq('address', address))
			.first()

		if (!payment) {
			return null
		}

		// Only update if status is initialized or pending (not confirmed/expired)
		if (payment.status !== 'initialized' && payment.status !== 'pending') {
			return null
		}

		// Upgrade status to 'pending' if still 'initialized'
		const newStatus =
			payment.status === 'initialized' ? 'pending' : payment.status

		await ctx.db.patch(payment._id, {
			txid,
			detected_at: Date.now(),
			status: newStatus,
		})

		return payment._id
	},
})

// Get all pending Bitcoin payments for background monitoring
export const getPendingPayments = internalQuery({
	args: {},
	handler: async (ctx) => {
		const initialized = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_status', (q) => q.eq('status', 'initialized'))
			.collect()

		const pending = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_status', (q) => q.eq('status', 'pending'))
			.collect()

		return [...initialized, ...pending]
	},
})

// Update pending payment status (internal only)
export const updatePendingPaymentStatus = internalMutation({
	args: {
		address: v.string(),
		status: v.union(
			v.literal('initialized'),
			v.literal('pending'),
			v.literal('confirmed'),
			v.literal('expired')
		),
	},
	handler: async (ctx, { address, status }) => {
		const pending = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_address', (q) => q.eq('address', address))
			.first()

		if (!pending) {
			return null
		}

		await ctx.db.patch(pending._id, { status })
		return pending._id
	},
})

// Mark payment as expired (called by client when countdown expires)
export const markPaymentExpired = mutation({
	args: {
		address: v.string(),
		session_id: v.string(),
	},
	handler: async (ctx, { address, session_id }) => {
		// Find pending payment
		const payment = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_address', (q) => q.eq('address', address))
			.first()

		if (!payment) {
			return null // No payment record, nothing to mark
		}

		// Validate session owns this address
		if (payment.session_id !== session_id) {
			throw new Error('Session does not own this address')
		}

		// Only mark as expired if still initialized (no transaction detected)
		if (payment.status === 'initialized') {
			await ctx.db.patch(payment._id, { status: 'expired' })
			return payment._id
		}

		// Payment already has transaction or is confirmed - don't change status
		return null
	},
})

// Get pending payment by address (internal - no session validation)
export const getPendingPaymentByAddressInternal = internalQuery({
	args: {
		address: v.string(),
	},
	handler: async (ctx, { address }) => {
		return await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_address', (q) => q.eq('address', address))
			.first()
	},
})

// Get pending payment by address for modal status updates
export const getPendingPaymentByAddress = query({
	args: {
		address: v.string(),
		session_id: v.string(),
	},
	handler: async (ctx, { address, session_id }) => {
		// Find payment by address
		const payment = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_address', (q) => q.eq('address', address))
			.first()

		if (!payment) {
			return null // Address not found
		}

		// Validate session owns this address
		if (payment.session_id !== session_id) {
			throw new Error('Session does not own this address')
		}

		// Session validated - return payment details
		return payment
	},
})

// Atomically create donation from confirmed Bitcoin payment
// Returns true if donation was created, false if already exists
export const createDonationFromPayment = internalMutation({
	args: {
		address: v.string(),
		amount_usd: v.number(),
		display_name: v.string(),
		message: v.optional(v.string()),
	},
	handler: async (ctx, { address, amount_usd, display_name, message }) => {
		// Check if donation already exists (deduplication)
		const existingDonation = await ctx.db
			.query('donations')
			.withIndex('by_payment_id', (q) => q.eq('payment_id', address))
			.first()

		if (existingDonation) {
			return false // Already created
		}

		// Create donation
		await ctx.db.insert('donations', {
			amount: amount_usd,
			display_name,
			payment_id: address,
			payment_method: 'bitcoin',
			message,
		})

		return true // Created successfully
	},
})

// Clean up expired and confirmed pending payments (called by scheduled cron)
// Strategy:
// - Marks 'initialized' payments as 'expired' if time exceeded (user left site, no tx sent)
// - Leaves 'pending' payments alone (transaction detected, actively monitoring)
// - Deletes confirmed payments (donation already in donations table - redundant)
// - Deletes old expired payments (7 days after expiration for audit trail)
// Internal-only to prevent unauthorized cleanup triggering
export const cleanupExpiredPendingPayments = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now()
		const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

		// Mark 'initialized' payments that have expired (user abandoned without sending tx)
		const expiredInitialized = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_status_and_expires', (q) => q.eq('status', 'initialized'))
			.filter((q) => q.lt(q.field('expires_at'), now))
			.collect()

		for (const payment of expiredInitialized) {
			await ctx.db.patch(payment._id, { status: 'expired' })
		}

		// Also mark 'pending' payments that are very old (24h+) as expired
		// This handles edge case where transaction never confirms
		const expiredPending = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_status_and_expires', (q) => q.eq('status', 'pending'))
			.filter((q) => q.lt(q.field('expires_at'), now))
			.collect()

		for (const payment of expiredPending) {
			await ctx.db.patch(payment._id, { status: 'expired' })
		}

		// Delete confirmed payments (donation already recorded in donations table)
		const confirmed = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_status', (q) => q.eq('status', 'confirmed'))
			.collect()

		for (const payment of confirmed) {
			await ctx.db.delete(payment._id)
		}

		// Delete old expired payments (keep for 7 days for debugging/audit)
		const oldExpired = await ctx.db
			.query('pending_bitcoin_payments')
			.withIndex('by_status_and_expires', (q) => q.eq('status', 'expired'))
			.filter((q) => q.lt(q.field('expires_at'), sevenDaysAgo))
			.collect()

		for (const payment of oldExpired) {
			await ctx.db.delete(payment._id)
		}

		return {
			markedExpiredInitialized: expiredInitialized.length,
			markedExpiredPending: expiredPending.length,
			deletedConfirmed: confirmed.length,
			deletedOldExpired: oldExpired.length,
		}
	},
})
