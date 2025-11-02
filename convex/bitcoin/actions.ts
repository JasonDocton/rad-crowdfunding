/**
 * Bitcoin Public Actions
 *
 * Public-facing Convex actions for Bitcoin payment processing.
 * Handles address generation, payment checking, and exchange rate fetching.
 * Includes rate limiting and session validation.
 */

'use node'

import { RateLimiter } from '@convex-dev/rate-limiter'
import { api, components, internal } from 'convex/_generated/api'
import { action } from 'convex/_generated/server'
import { paymentMetadataValidator } from 'convex/schema.ts'
import {
	getDisplayName,
	validateDonationAmount,
	validateMessage,
	validatePlayerName,
} from 'convex/types.ts'
import { v } from 'convex/values'
import { env } from '@/env.ts'
import { deriveBip84Address } from '@/libs/bitcoin/bip84.ts'
import { logger } from '@/utils/logger.ts'
import { getBtcPrice } from './exchange.ts'
import { checkBlockchainPayment } from './monitoring.ts'
import type {
	CheckBitcoinPaymentResult,
	GenerateBitcoinAddressResult,
} from './types.ts'
import {
	bitcoinConfirmations,
	btcAmountTolerance,
	validateBitcoinAddress,
} from './types.ts'

const rateLimiter = new RateLimiter(components.rateLimiter, {
	generateAddress: {
		kind: 'token bucket',
		rate: 1,
		period: 300_000, // 5 minutes
		capacity: 1,
		maxReserved: 1,
	},
	checkPayment: {
		kind: 'fixed window',
		rate: 1,
		period: 10_000, // 10 seconds
	},
	getExchangeRate: {
		kind: 'fixed window',
		rate: 1,
		period: 30_000, // 30 seconds
	},
})

// SECURITY: BITCOIN_MASTER_KEY compromise exposes all derived addresses
// Production deployments should use HSM or dedicated key management service (see SECURITY.md)

// Generate Bitcoin address with rate limiting and idempotency
// Uses BIP84 (m/84'/0'/0'/0/{index}) for native SegWit addresses
export const generateBitcoinAddress = action({
	args: {
		amount: v.number(),
		session_id: v.string(),
		metadata: paymentMetadataValidator,
	},
	handler: async (
		ctx,
		{ amount, session_id, metadata }
	): Promise<GenerateBitcoinAddressResult> => {
		validateDonationAmount(amount)
		if (metadata?.player_name) {
			validatePlayerName(metadata.player_name)
		}
		if (metadata?.message) {
			validateMessage(metadata.message)
		}

		await rateLimiter.limit(ctx, 'generateAddress', { key: session_id })

		try {
			const btcPrice = await getBtcPrice(ctx)
			const amount_btc = amount / btcPrice

			const existingSession = await ctx.runQuery(
				internal.bitcoin.mutations.checkExistingPaymentSession,
				{
					session_id,
					amount,
				}
			)

			if (existingSession) {
				return {
					address: existingSession.address,
					amount_btc,
					amount_usd: amount,
					exchange_rate: btcPrice,
					derivation_index: existingSession.derivation_index,
				}
			}

			const derivation_index = await ctx.runMutation(
				internal.bitcoin.mutations.getNextDerivationIndex
			)

			const address = deriveBip84Address(
				env.BITCOIN_MASTER_KEY,
				derivation_index,
				env.BITCOIN_NETWORK
			)

			await ctx.runMutation(
				internal.bitcoin.mutations.createPendingBitcoinPayment,
				{
					session_id,
					address,
					expected_amount_btc: amount_btc,
					expected_amount_usd: amount,
					exchange_rate: btcPrice,
					derivation_index,
					metadata,
				}
			)

			const jobId = await ctx.scheduler.runAfter(
				10_000,
				internal.bitcoin.monitoring.monitorSinglePayment,
				{
					address,
					expected_amount_btc: amount_btc,
					derivation_index,
				}
			)

			await ctx.runMutation(
				internal.bitcoin.mutations.updatePendingPaymentJobId,
				{
					address,
					scheduled_job_id: jobId,
				}
			)

			logger.audit('bitcoin_monitoring_started', {
				derivation_index,
				job_id: jobId,
			})

			return {
				address,
				amount_btc,
				amount_usd: amount,
				exchange_rate: btcPrice,
				derivation_index,
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error'
			logger.error('Bitcoin address generation failed:', errorMsg)
			throw new Error(
				error instanceof Error
					? `Failed to generate Bitcoin address: ${error.message}`
					: 'Failed to generate Bitcoin address'
			)
		}
	},
})

// Get BTC/USD exchange rate with global rate limiting (1 req/30s)
export const getBtcExchangeRate = action({
	args: {},
	handler: async (ctx): Promise<number> => {
		await rateLimiter.limit(ctx, 'getExchangeRate', { key: 'global' })
		return await getBtcPrice(ctx)
	},
})

// Check Bitcoin payment with validation and rate limiting
// Client polls this until payment confirmed
export const checkBitcoinPayment = action({
	args: {
		address: v.string(),
		session_id: v.string(),
		expected_btc_amount: v.optional(v.number()),
		metadata: paymentMetadataValidator,
	},
	handler: async (
		ctx,
		{ address, session_id, expected_btc_amount, metadata }
	): Promise<CheckBitcoinPaymentResult> => {
		try {
			validateBitcoinAddress(address, env.BITCOIN_NETWORK)

			await ctx.runMutation(
				internal.bitcoin.mutations.validateSessionOwnsAddress,
				{
					session_id,
					address,
				}
			)

			await rateLimiter.limit(ctx, 'checkPayment', { key: session_id })

			const result = await checkBlockchainPayment(address)

			if (result.status === 'api_failed' || result.status === 'no_payment') {
				return { paid: false }
			}

			if (result.status === 'pending') {
				const requiredConfirmations = bitcoinConfirmations[env.BITCOIN_NETWORK]
				return {
					paid: true,
					tx_hash: result.tx_hash,
					confirmations: result.confirmations,
					required_confirmations: requiredConfirmations,
					amount_btc: result.amount_btc,
				}
			}

			const requiredConfirmations = bitcoinConfirmations[env.BITCOIN_NETWORK]
			const hasEnoughConfirmations =
				result.confirmations >= requiredConfirmations

			if (!hasEnoughConfirmations) {
				return {
					paid: true,
					tx_hash: result.tx_hash,
					confirmations: result.confirmations,
					required_confirmations: requiredConfirmations,
					amount_btc: result.amount_btc,
				}
			}

			if (expected_btc_amount) {
				const difference = Math.abs(result.amount_btc - expected_btc_amount)
				if (difference > btcAmountTolerance) {
					if (result.amount_btc < expected_btc_amount) {
						throw new Error(
							'Underpayment detected: payment amount does not match expected amount'
						)
					}
					logger.info(
						'Overpayment detected: received more than expected amount'
					)
				}
			}

			const btcPrice = await getBtcPrice(ctx)
			const amount_usd = result.amount_btc * btcPrice

			validateDonationAmount(amount_usd)

			const display_name = getDisplayName(metadata, 'Anonymous')

			// Create donation atomically (handles deduplication internally)
			const created = await ctx.runMutation(
				internal.bitcoin.mutations.createDonationFromPayment,
				{
					address,
					amount_usd,
					display_name,
					message: metadata?.message,
				}
			)

			if (created) {
				logger.audit('donation_created', {
					amount_usd,
					payment_method: 'bitcoin',
					confirmations: result.confirmations,
				})
			}

			// Mark payment as confirmed
			await ctx.runMutation(
				internal.bitcoin.mutations.updatePendingPaymentStatus,
				{
					address,
					status: 'confirmed',
				}
			)

			return {
				paid: true,
				tx_hash: result.tx_hash,
				amount_btc: result.amount_btc,
				confirmations: result.confirmations,
				required_confirmations: requiredConfirmations,
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error'
			logger.error('Bitcoin payment check failed:', errorMsg)
			throw new Error(
				error instanceof Error
					? `Failed to check Bitcoin payment: ${error.message}`
					: 'Failed to check Bitcoin payment'
			)
		}
	},
})
