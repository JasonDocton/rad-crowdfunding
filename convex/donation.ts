// This handles reading and creating donation records in the database.
// Convex makes all of this pretty straight forward.

import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { logger } from '@/utils/logger'
import { mutation, query } from './_generated/server'
import type { PublicDonation } from './types'
import { validateDisplayName, validateMessage } from './types.ts' // Get total donations amount
// Calculates directly from donations table (single source of truth)
// Collect() should be fine here since we're not pulling from thousands of records
export const getAmountTotal = query({
	args: {},
	handler: async (ctx) => {
		const donations = await ctx.db.query('donations').collect()
		return donations.reduce((sum, donation) => sum + donation.amount, 0)
	},
})

// Get paginated list of donors
export const getDonorList = query({
	args: {
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const result = await ctx.db
			.query('donations')
			.order('desc')
			.paginate(args.paginationOpts)

		return {
			...result,
			page: result.page.map(
				(donation): PublicDonation => ({
					id: donation._id,
					display_name: donation.display_name || 'Anonymous',
					amount: donation.amount,
				})
			),
		}
	},
})

// Get donation by payment ID
export const getDonationByPaymentId = query({
	args: {
		payment_id: v.string(),
	},
	handler: async (ctx, { payment_id }) => {
		return await ctx.db
			.query('donations')
			.withIndex('by_payment_id', (q) => q.eq('payment_id', payment_id))
			.first()
	},
})

// Create a new donation record
export const create = mutation({
	args: {
		amount: v.number(),
		display_name: v.string(),
		payment_id: v.string(),
		payment_method: v.union(
			v.literal('stripe'),
			v.literal('paypal'),
			v.literal('bitcoin')
		),
		message: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Validate display name length before processing
		validateDisplayName(args.display_name)

		// Validate message if provided
		if (args.message) {
			validateMessage(args.message)
		}

		// Check for duplicate payment_id (idempotency)
		const existing = await ctx.db
			.query('donations')
			.withIndex('by_payment_id', (q) => q.eq('payment_id', args.payment_id))
			.first()

		if (existing) {
			logger.debug('Donation already exists:', args.payment_id)
			return existing._id
		}

		// Create donation record with data
		const donationId = await ctx.db.insert('donations', {
			amount: args.amount,
			display_name: args.display_name,
			payment_id: args.payment_id,
			payment_method: args.payment_method,
			message: args.message,
		})

		return donationId
	},
})
