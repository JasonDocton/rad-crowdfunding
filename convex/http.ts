// This handles incoming webhook requests from Stripe and PayPal.
// Imagine this in the same way you'd use next/api/webhooks.

import { httpRouter } from 'convex/server'
import { logger } from '@/utils/logger'
import { api } from './_generated/api'
import { httpAction } from './_generated/server'

const http = httpRouter()

// Stripe webhook endpoint
// Receives webhook events from Stripe and verifies the signature
// before processing the event.
http.route({
	path: '/stripe/webhook',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		// Extract raw body for signature verification
		const payload = await request.text()

		// Get Stripe signature from headers
		const signature = request.headers.get('stripe-signature')

		if (!signature) {
			return new Response(
				JSON.stringify({ error: 'Missing stripe-signature header' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			)
		}

		try {
			// Call the Stripe webhook handler (runs in Node.js runtime)
			await ctx.runAction(api.stripe.webhooks.handleStripeWebhook, {
				signature,
				payload,
			})

			return new Response(JSON.stringify({ received: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error'
			logger.error('Stripe webhook error:', errorMsg)
			return new Response(
				JSON.stringify({ error: 'Webhook processing failed' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			)
		}
	}),
})

// PayPal webhook endpoint
// Receives webhook events from PayPal and verifies the signature
// using PayPal's REST API before processing the event.
http.route({
	path: '/paypal/webhook',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		// Extract raw body for signature verification
		const payload = await request.text()

		// Get PayPal webhook headers
		const transmission_id = request.headers.get('paypal-transmission-id')
		const transmission_time = request.headers.get('paypal-transmission-time')
		const cert_url = request.headers.get('paypal-cert-url')
		const auth_algo = request.headers.get('paypal-auth-algo')
		const transmission_sig = request.headers.get('paypal-transmission-sig')

		// Validate all required headers are present
		if (
			!transmission_id ||
			!transmission_time ||
			!cert_url ||
			!auth_algo ||
			!transmission_sig
		) {
			return new Response(
				JSON.stringify({ error: 'Missing required PayPal webhook headers' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			)
		}

		try {
			// Call the PayPal webhook handler (runs in Node.js runtime)
			const result = await ctx.runAction(
				api.paypal.webhooks.handlePayPalWebhook,
				{
					payload,
					headers: {
						transmission_id,
						transmission_time,
						cert_url,
						auth_algo,
						transmission_sig,
					},
				}
			)

			return new Response(JSON.stringify(result), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error'
			logger.error('PayPal webhook error:', errorMsg)
			return new Response(
				JSON.stringify({ error: 'Webhook processing failed' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			)
		}
	}),
})

// biome-ignore lint/style/noDefaultExport: Convex requires default export for HTTP router
export default http
