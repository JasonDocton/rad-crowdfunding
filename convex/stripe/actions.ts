// This creates Stripe checkout sessions for credit card payments.
// When users click donate, this sends them to Stripe's secure payment page.

import { RateLimiter } from '@convex-dev/rate-limiter'
import { components } from 'convex/_generated/api'
import { action } from 'convex/_generated/server'
import { v } from 'convex/values'
import { env } from '@/env.ts'
import { stripe } from '@/libs/stripe/get-stripe.ts'
import { logger } from '@/utils/logger'
import { paymentMetadataValidator } from '../schema.ts'
import { validateDonationAmount } from '../types.ts'

// Initialize rate limiter for checkout creation
const rateLimiter = new RateLimiter(components.rateLimiter, {
	createCheckout: {
		kind: 'token bucket',
		rate: 5, // 5 checkouts per period
		period: 300_000, // 5 minutes
		capacity: 5,
		maxReserved: 5,
	},
})

export const createCheckoutSession = action({
	args: {
		amount: v.number(),
		metadata: paymentMetadataValidator,
	},
	handler: async (ctx, { amount, metadata }) => {
		// Validate donation amount using consistent validator
		validateDonationAmount(amount)

		// Rate limit checkout creation (global limit to prevent abuse)
		await rateLimiter.limit(ctx, 'createCheckout', { key: 'global' })

		try {
			const session = await stripe.checkout.sessions.create({
				payment_method_types: [],
				line_items: [
					{
						price_data: {
							currency: 'usd',
							product_data: {
								name: 'Donation',
								description: metadata?.use_player_name
									? `Donation from ${metadata.player_name || 'Anonymous'}`
									: 'Public donation',
							},
							unit_amount: Math.round(amount * 100),
						},
						quantity: 1,
					},
				],
				mode: 'payment',
				success_url: `${env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${env.SITE_URL}/donate`,
				metadata: {
					player_name: metadata?.player_name || '',
					use_player_name: metadata?.use_player_name ? 'true' : 'false',
					message: metadata?.message || '',
					amount: amount.toString(),
				},
			})
			return { url: session.url, sessionId: session.id }
		} catch (error) {
			logger.error('Stripe checkout error:', error)
			throw new Error('Failed to create checkout session')
		}
	},
})
