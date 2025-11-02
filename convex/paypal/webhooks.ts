// This receives notifications from PayPal when a payment completes.
// It verifies the payment is real and creates the donation record.

'use node'

// Webhook handler with debug logging
import { v } from 'convex/values'
import { env } from '@/env.ts'
import { getPayPalApiUrl } from '@/libs/paypal/get-paypal'
import { logger } from '@/utils/logger'
import { api, internal } from '../_generated/api'
import { action } from '../_generated/server'
import type { PayPalWebhookEvent } from './types.ts'

// Verify PayPal webhook signature using REST API
async function verifyWebhookSignature(
	headers: {
		transmission_id: string
		transmission_time: string
		cert_url: string
		auth_algo: string
		transmission_sig: string
	},
	webhookId: string,
	webhookEvent: unknown
): Promise<boolean> {
	try {
		// Use the same environment logic as the PayPal client
		const apiUrl = getPayPalApiUrl()

		// Get OAuth access token
		const tokenResponse = await fetch(`${apiUrl}/v1/oauth2/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
			},
			body: 'grant_type=client_credentials',
		})

		if (!tokenResponse.ok) {
			logger.error('Failed to get PayPal access token')
			return false
		}

		const tokenData = (await tokenResponse.json()) as { access_token: string }

		// Verify webhook signature
		const verifyResponse = await fetch(
			`${apiUrl}/v1/notifications/verify-webhook-signature`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${tokenData.access_token}`,
				},
				body: JSON.stringify({
					transmission_id: headers.transmission_id,
					transmission_time: headers.transmission_time,
					cert_url: headers.cert_url,
					auth_algo: headers.auth_algo,
					transmission_sig: headers.transmission_sig,
					webhook_id: webhookId,
					webhook_event: webhookEvent,
				}),
			}
		)

		if (!verifyResponse.ok) {
			logger.error('PayPal webhook verification request failed')
			return false
		}

		const verifyData = (await verifyResponse.json()) as {
			verification_status: string
		}

		return verifyData.verification_status === 'SUCCESS'
	} catch (error) {
		logger.error('PayPal webhook verification error:', error)
		return false
	}
}

// Handle PayPal webhook with signature verification
// This runs in Node.js runtime to properly handle PayPal's webhook verification
// PayPal workflow (intent=CAPTURE):
// 1. User approves order on PayPal
// 2. CHECKOUT.ORDER.APPROVED webhook fires
// 3. We manually capture the order via API (required step!)
// 4. PAYMENT.CAPTURE.COMPLETED webhook fires (we acknowledge but don't process)
// 5. We create donation using the capture ID
// Why we capture in ORDER.APPROVED:
// - intent=CAPTURE does NOT mean auto-capture (common misconception!)
// - PayPal requires explicit capture API call after approval
// - CAPTURE.COMPLETED only fires AFTER we call capture API
// - We handle ORDER.APPROVED to capture immediately when user approves
// Why we ignore CAPTURE.COMPLETED:
// - We already created the donation during ORDER.APPROVED
// - Deduplication (unique payment_id index) prevents duplicates anyway
// - Processing it would be redundant
// Note on timing:
// - ORDER.APPROVED arrives immediately (user clicked "approve")
// - We capture synchronously during webhook processing
// - Donation created before webhook returns (no waiting on success page!)
// Security: Webhook signatures are verified using PayPal's REST API
// to prevent replay attacks and ensure authenticity.
export const handlePayPalWebhook = action({
	args: {
		payload: v.string(),
		headers: v.object({
			transmission_id: v.string(),
			transmission_time: v.string(),
			cert_url: v.string(),
			auth_algo: v.string(),
			transmission_sig: v.string(),
		}),
	},
	handler: async (ctx, { payload, headers }) => {
		let event: PayPalWebhookEvent

		try {
			event = JSON.parse(payload) as PayPalWebhookEvent
		} catch (_error) {
			logger.error('Invalid PayPal webhook payload')
			throw new Error('Invalid webhook payload')
		}

		// Verify webhook signature
		// PAYPAL_WEBHOOK_ID is required in all environments since webhooks work via Convex URL
		const isValid = await verifyWebhookSignature(
			headers,
			env.PAYPAL_WEBHOOK_ID,
			event
		)
		if (!isValid) {
			logger.error('PayPal webhook signature verification failed')
			throw new Error('Invalid webhook signature')
		}

		// Handle order approval - CAPTURE ORDER IMMEDIATELY
		// When user approves, we must manually capture the payment
		if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
			const orderId = event.resource.id
			const customId = event.resource.purchase_units?.[0]?.custom_id

			if (!orderId || !customId) {
				logger.warn('PayPal ORDER.APPROVED webhook missing required fields', {
					hasOrderId: !!orderId,
					hasCustomId: !!customId,
				})
				return { received: true, processed: false }
			}

			try {
				// Parse custom data to get donation details
				const customData = JSON.parse(customId)
				const amount = customData.amount
				const { validateDonationAmount } = await import('../types.ts')
				validateDonationAmount(amount)

				// Capture the order immediately (REQUIRED - PayPal does not auto-capture!)
				const { ordersController } = await import('@/libs/paypal/get-paypal.ts')
				const { result: captureResult } = await ordersController.captureOrder({
					id: orderId,
					prefer: 'return=representation',
				})

				// Extract capture ID from the response
				const captureId =
					captureResult.purchaseUnits?.[0]?.payments?.captures?.[0]?.id

				if (!captureId) {
					logger.error('PayPal capture response missing capture ID', {
						orderId,
						captureResultKeys: Object.keys(captureResult),
						purchaseUnits: captureResult.purchaseUnits,
					})
					return { received: true, processed: false }
				}

				// Create donation with capture ID
				const player_name = customData.player_name
				const use_player_name = customData.use_player_name
				const message = customData.message
				const display_name =
					use_player_name && player_name ? player_name : 'Anonymous'

				await ctx.runMutation(api.donation.create, {
					amount,
					display_name,
					payment_id: captureId,
					payment_method: 'paypal',
					message: message || undefined,
				})

				logger.audit('donation_created', {
					amount,
					payment_method: 'paypal',
					source: 'webhook_capture',
				})

				// Store ID mapping for success page
				await ctx.runMutation(internal.paypal.mutations.storePaymentIdMapping, {
					order_id: orderId,
					capture_id: captureId,
				})

				return { received: true, processed: true }
			} catch (error) {
				logger.error('PayPal order capture error:', error)
				return { received: true, processed: false }
			}
		}

		// Acknowledge other event types without processing
		// Note: PAYMENT.CAPTURE.COMPLETED fires after we capture in ORDER.APPROVED
		// We ignore it since the donation is already created (deduplication prevents duplicates)
		return { received: true, processed: false }
	},
})
