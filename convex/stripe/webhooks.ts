// This receives notifications from Stripe when a payment completes.
// It verifies the payment is real and creates the donation record.
'use node'

import { api } from 'convex/_generated/api'
import { action } from 'convex/_generated/server'
import { v } from 'convex/values'
import type Stripe from 'stripe'
import { env } from '@/env.ts'
import { stripe } from '@/libs/stripe/get-stripe'
import { logger } from '@/utils/logger'
import { getDisplayName } from '../types.ts'

// Handle Stripe webhook with signature verification
export const handleStripeWebhook = action({
	args: {
		signature: v.string(),
		payload: v.string(),
	},
	handler: async (ctx, { signature, payload }) => {
		let event: Stripe.Event

		try {
			// Verify webhook signature
			event = stripe.webhooks.constructEvent(
				payload,
				signature,
				env.STRIPE_WEBHOOK_SECRET
			)
		} catch (error) {
			logger.error('Webhook signature verification failed:', error)
			throw new Error('Invalid signature')
		}

		// Process checkout.session.completed event
		if (event.type === 'checkout.session.completed') {
			const session = event.data.object as Stripe.Checkout.Session

			const customerName = session.customer_details?.name || 'Anonymous'
			// SECURITY: Use Stripe's authoritative amount_total (actual charge amount)
			// NOT metadata.amount which could be tampered with
			const amount = session.amount_total ? session.amount_total / 100 : 0
			const player_name = session.metadata?.player_name
			const use_player_name = session.metadata?.use_player_name === 'true'
			const message = session.metadata?.message

			const metadata = use_player_name
				? {
						player_name: player_name || null,
						use_player_name: true,
						message: message || undefined,
					}
				: message
					? {
							player_name: null,
							use_player_name: false,
							message: message,
						}
					: undefined

			const display_name = getDisplayName(metadata, customerName)

			await ctx.runMutation(api.donation.create, {
				amount,
				display_name,
				payment_id: session.id,
				payment_method: 'stripe',
				message: metadata?.message,
			})

			logger.audit('donation_created', {
				amount,
				payment_method: 'stripe',
				source: 'webhook',
			})
		}

		return { received: true }
	},
})
