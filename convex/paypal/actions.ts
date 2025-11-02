// This creates and captures PayPal payment orders.
// It handles the whole PayPal payment flow from start to finish.

'use node'

import { RateLimiter } from '@convex-dev/rate-limiter'
import { CheckoutPaymentIntent } from '@paypal/paypal-server-sdk'
import { v } from 'convex/values'
import { siteConfig } from '@/configs/site-config.ts'
import { env } from '@/env.ts'
import { ordersController } from '@/libs/paypal/get-paypal.ts'
import { logger } from '@/utils/logger'
import { components } from '../_generated/api'
import { action } from '../_generated/server'
import { paymentMetadataValidator } from '../schema.ts'
import { validateDonationAmount } from '../types.ts'

// Initialize rate limiter for order creation
const rateLimiter = new RateLimiter(components.rateLimiter, {
	createOrder: {
		kind: 'token bucket',
		rate: 5, // 5 orders per period
		period: 300_000, // 5 minutes
		capacity: 5,
		maxReserved: 5,
	},
})

export const createOrder = action({
	args: {
		amount: v.number(),
		metadata: paymentMetadataValidator,
	},
	handler: async (ctx, { amount, metadata }) => {
		// Validate donation amount using consistent validator
		validateDonationAmount(amount)

		// Rate limit order creation (global limit to prevent abuse)
		await rateLimiter.limit(ctx, 'createOrder', { key: 'global' })

		try {
			const { result } = await ordersController.createOrder({
				body: {
					intent: CheckoutPaymentIntent.Capture,
					purchaseUnits: [
						{
							amount: {
								currencyCode: 'USD',
								value: amount.toFixed(2),
							},
							description: metadata?.use_player_name
								? `Donation from ${metadata.player_name || 'Anonymous'}`
								: 'Public donation',
							customId: JSON.stringify({
								player_name: metadata?.player_name || '',
								use_player_name: metadata?.use_player_name || false,
								message: metadata?.message || '',
								amount: amount,
							}),
						},
					],
					paymentSource: {
						paypal: {
							experienceContext: {
								brandName: siteConfig.siteTitle,
								returnUrl: `${env.SITE_URL}/success`,
								cancelUrl: `${env.SITE_URL}/donate`,
							},
						},
					},
				},
				prefer: 'return=representation',
			})

			// Try both 'payer-action' and 'approve' link rels
			// Modern API uses 'payer-action', legacy API uses 'approve'
			const approvalUrl =
				result.links?.find((link) => link.rel === 'payer-action')?.href ||
				result.links?.find((link) => link.rel === 'approve')?.href

			// Ensure order ID exists
			if (!result.id) {
				throw new Error('PayPal order creation failed - no order ID returned')
			}

			return {
				orderId: result.id,
				approvalUrl: approvalUrl || null,
			}
		} catch (error) {
			logger.error('PayPal order creation error:', error)
			throw new Error('Failed to create PayPal order')
		}
	},
})
