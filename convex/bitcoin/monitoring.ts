/**
 * Bitcoin Blockchain Monitoring
 *
 * Scheduler-based blockchain monitoring logic.
 * Checks payment status across multiple blockchain explorers.
 */

'use node'

import { api, internal } from 'convex/_generated/api'
import { internalAction } from 'convex/_generated/server'
import { getDisplayName } from 'convex/types.ts'
import { v } from 'convex/values'
import { env } from '@/env.ts'
import {
	blockchainApiTimeoutMs,
	calculateConfirmations,
	fetchWithTimeout,
	getCurrentBlockHeight,
} from '@/libs/bitcoin/blockchain-api.ts'
import { logger } from '@/utils/logger.ts'
import {
	type BlockchainPaymentResult,
	bitcoinConfirmations,
	btcAmountTolerance,
	satoshiToBtc,
	type TransactionStatus,
} from './types.ts'

// Bitcoin payment monitoring: scheduled polling (every 10s) until confirmed or expired (24h max)
// Using scheduler instead of Workpool for cleaner logs and simpler cancellation

// Blockchain API response types
type BlockchainAddress = {
	total_received: number
	txs: Array<{
		hash: string
	}>
}

type MempoolAddress = {
	chain_stats: {
		funded_txo_sum: number
		tx_count: number
	}
	mempool_stats: {
		funded_txo_sum: number
		tx_count: number
	}
}

type MempoolTx = {
	txid: string
	status: TransactionStatus
	vout: Array<{
		scriptpubkey_address?: string
		value: number
	}>
}

// Check Mempool.space API (primary) - detects both confirmed and mempool transactions
async function checkMempoolSpace(
	address: string,
	isTestnet: boolean
): Promise<BlockchainPaymentResult | null> {
	const baseUrl = isTestnet
		? 'https://mempool.space/testnet4/api'
		: 'https://mempool.space/api'

	try {
		logger.info(
			`[Bitcoin] Fetching address from mempool.space ${isTestnet ? 'testnet4' : 'mainnet'}: ${address}`
		)

		const addressResponse = await fetchWithTimeout(
			`${baseUrl}/address/${address}`,
			blockchainApiTimeoutMs
		)

		logger.info(
			`[Bitcoin] Address fetch response: ${addressResponse.status} ${addressResponse.statusText}`
		)

		if (!addressResponse.ok) {
			if (addressResponse.status === 404) return { status: 'no_payment' }
			return null
		}

		const addressData = (await addressResponse.json()) as MempoolAddress

		const confirmedAmount = addressData.chain_stats.funded_txo_sum
		const mempoolAmount = addressData.mempool_stats.funded_txo_sum
		const totalReceived = confirmedAmount + mempoolAmount

		logger.info(
			`[Bitcoin] Address stats: confirmed=${confirmedAmount} sats, mempool=${mempoolAmount} sats, total=${totalReceived} sats`
		)

		if (totalReceived === 0) {
			logger.info('[Bitcoin] No payment detected (total received = 0)')
			return { status: 'no_payment' }
		}

		logger.info('[Bitcoin] Fetching transaction list')
		const txsResponse = await fetchWithTimeout(
			`${baseUrl}/address/${address}/txs`,
			blockchainApiTimeoutMs
		)
		logger.info(`[Bitcoin] Transactions fetch response: ${txsResponse.status}`)

		if (!txsResponse.ok) {
			return null
		}

		const txs = (await txsResponse.json()) as MempoolTx[]
		const latestTx = txs[0]

		if (!latestTx) {
			logger.info('[Bitcoin] No transactions found in response')
			return { status: 'no_payment' }
		}

		logger.info(
			`[Bitcoin] Found transaction: ${latestTx.txid}, block_height=${latestTx.status.block_height ?? 'mempool'}`
		)

		const currentHeight = await getCurrentBlockHeight(baseUrl)
		const confirmations = calculateConfirmations(
			currentHeight,
			latestTx.status.block_height
		)

		logger.info(
			`[Bitcoin] Confirmations: ${confirmations} (current height: ${currentHeight})`
		)

		const receivedAmount =
			latestTx.vout
				.filter((vout) => vout.scriptpubkey_address === address)
				.reduce((sum, vout) => sum + vout.value, 0) / satoshiToBtc

		logger.info(
			`[Bitcoin] Received amount: ${receivedAmount} BTC, paid=${confirmations > 0}, pending=${confirmations === 0}`
		)

		if (confirmations === 0) {
			return {
				status: 'pending',
				tx_hash: latestTx.txid,
				amount_btc: receivedAmount,
				confirmations,
			}
		}

		return {
			status: 'paid',
			tx_hash: latestTx.txid,
			amount_btc: receivedAmount,
			confirmations,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		const errorName = error instanceof Error ? error.name : 'UnknownError'
		logger.info(
			`[Bitcoin] Mempool.space ${isTestnet ? 'testnet4' : 'mainnet'} API error: [${errorName}] ${errorMessage}`
		)
		return null
	}
}

// Check Blockstream.info API (fallback)
async function checkBlockstream(
	address: string,
	isTestnet: boolean
): Promise<BlockchainPaymentResult | null> {
	const baseUrl = isTestnet
		? 'https://blockstream.info/testnet/api'
		: 'https://blockstream.info/api'

	try {
		const response = await fetchWithTimeout(
			`${baseUrl}/address/${address}`,
			blockchainApiTimeoutMs
		)

		if (!response.ok) {
			if (response.status === 404) return { status: 'no_payment' }
			return null
		}

		const data = (await response.json()) as BlockchainAddress

		if (!data.total_received || data.total_received === 0) {
			return { status: 'no_payment' }
		}

		const latestTx = data.txs[0]
		if (!latestTx) {
			return { status: 'no_payment' }
		}

		const txResponse = await fetchWithTimeout(
			`${baseUrl}/tx/${latestTx.hash}`,
			blockchainApiTimeoutMs
		)

		if (!txResponse.ok) {
			return {
				status: 'pending',
				tx_hash: latestTx.hash,
				amount_btc: data.total_received / satoshiToBtc,
				confirmations: 0,
			}
		}

		const txData = (await txResponse.json()) as {
			status: TransactionStatus
		}

		const currentHeight = await getCurrentBlockHeight(baseUrl)
		const confirmations = calculateConfirmations(
			currentHeight,
			txData.status.block_height
		)

		if (confirmations === 0) {
			return {
				status: 'pending',
				tx_hash: latestTx.hash,
				amount_btc: data.total_received / satoshiToBtc,
				confirmations,
			}
		}

		return {
			status: 'paid',
			tx_hash: latestTx.hash,
			amount_btc: data.total_received / satoshiToBtc,
			confirmations,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		logger.info(
			`Blockstream.info ${isTestnet ? 'testnet' : 'mainnet'} API error: ${errorMessage}`
		)
		return null
	}
}

// Check blockchain with API fallback: Mempool.space (testnet4/mainnet) → Blockstream.info (mainnet only)
export async function checkBlockchainPayment(
	address: string
): Promise<BlockchainPaymentResult> {
	const isTestnet = env.BITCOIN_NETWORK === 'testnet'

	logger.info(
		`[Bitcoin] checkBlockchainPayment starting for ${isTestnet ? 'testnet' : 'mainnet'} address: ${address}`
	)

	if (isTestnet) {
		const testnet4Result = await checkMempoolSpace(address, true)
		if (testnet4Result !== null) {
			logger.info('[Bitcoin] Testnet4 API returned result')
			return testnet4Result
		}

		return { status: 'api_failed' }
	}

	const mempoolResult = await checkMempoolSpace(address, false)
	if (mempoolResult !== null) {
		logger.info('[Bitcoin] Mempool.space mainnet API returned result')
		return mempoolResult
	}

	logger.info(
		'[Bitcoin] Mempool.space failed, trying Blockstream.info fallback'
	)
	const blockstreamResult = await checkBlockstream(address, false)
	if (blockstreamResult !== null) {
		logger.info('[Bitcoin] Blockstream.info API returned result')
		return blockstreamResult
	}

	return { status: 'api_failed' }
}

// Monitor single payment: recursive polling with scheduler, stops on confirmed/deleted/expired
export const monitorSinglePayment = internalAction({
	args: {
		address: v.string(),
		expected_amount_btc: v.number(),
		derivation_index: v.number(),
	},
	handler: async (ctx, { address, expected_amount_btc, derivation_index }) => {
		// Single query to get payment status
		const pendingPayment = await ctx.runQuery(
			internal.bitcoin.mutations.getPendingPaymentByAddressInternal,
			{ address }
		)

		// Early exit conditions - check payment state first
		if (!pendingPayment) {
			logger.info(
				`Payment monitoring stopped: record deleted for ${derivation_index}`
			)
			return
		}

		if (pendingPayment.status === 'confirmed') {
			logger.info(
				`Payment monitoring stopped: already confirmed ${derivation_index}`
			)
			return
		}

		if (pendingPayment.status === 'expired') {
			logger.info(
				`Payment monitoring stopped: payment expired ${derivation_index}`
			)
			return
		}

		// Check expiration before making API call
		const now = Date.now()
		if (now > pendingPayment.expires_at) {
			logger.warn(
				`Payment monitoring timeout: ${derivation_index} exceeded 24 hours`
			)
			await ctx.runMutation(
				internal.bitcoin.mutations.updatePendingPaymentStatus,
				{
					address,
					status: 'expired',
				}
			)
			return
		}

		// Check blockchain (external API call)
		const result = await checkBlockchainPayment(address)
		const requiredConfirmations = bitcoinConfirmations[env.BITCOIN_NETWORK]

		// API failed - retry
		if (result.status === 'api_failed') {
			await ctx.scheduler.runAfter(
				10_000,
				internal.bitcoin.monitoring.monitorSinglePayment,
				{
					address,
					expected_amount_btc,
					derivation_index,
				}
			)
			return
		}

		// No payment detected yet - keep polling
		if (result.status === 'no_payment') {
			await ctx.scheduler.runAfter(
				10_000,
				internal.bitcoin.monitoring.monitorSinglePayment,
				{
					address,
					expected_amount_btc,
					derivation_index,
				}
			)
			return
		}

		// Transaction detected but not confirmed yet
		if (result.status === 'pending') {
			// Update txid if this is the first time we're seeing it
			if (pendingPayment.txid !== result.tx_hash) {
				await ctx.runMutation(
					internal.bitcoin.mutations.updatePendingPaymentWithTx,
					{
						address,
						txid: result.tx_hash,
					}
				)
				logger.info(
					`Transaction detected: ${derivation_index} at ${result.confirmations}/${requiredConfirmations} confirmations`
				)
			}

			// Continue monitoring
			await ctx.scheduler.runAfter(
				10_000,
				internal.bitcoin.monitoring.monitorSinglePayment,
				{
					address,
					expected_amount_btc,
					derivation_index,
				}
			)
			return
		}

		// Transaction is paid but may not have enough confirmations
		if (result.confirmations < requiredConfirmations) {
			// Update txid if needed (edge case: status jumped from no_payment to paid)
			if (pendingPayment.txid !== result.tx_hash) {
				await ctx.runMutation(
					internal.bitcoin.mutations.updatePendingPaymentWithTx,
					{
						address,
						txid: result.tx_hash,
					}
				)
			}

			// Continue monitoring
			await ctx.scheduler.runAfter(
				10_000,
				internal.bitcoin.monitoring.monitorSinglePayment,
				{
					address,
					expected_amount_btc,
					derivation_index,
				}
			)
			return
		}

		// Payment is fully confirmed - validate amount
		const difference = Math.abs(result.amount_btc - expected_amount_btc)
		if (difference > btcAmountTolerance) {
			if (result.amount_btc < expected_amount_btc) {
				logger.warn(
					`Underpayment detected: ${derivation_index} expected ${expected_amount_btc} BTC, received ${result.amount_btc} BTC`
				)
				await ctx.runMutation(
					internal.bitcoin.mutations.updatePendingPaymentStatus,
					{
						address,
						status: 'expired',
					}
				)
				return
			}
			logger.info(
				`Overpayment accepted: ${derivation_index} expected ${expected_amount_btc} BTC, received ${result.amount_btc} BTC`
			)
		}

		// Calculate USD amount and create donation atomically
		const amount_btc = result.amount_btc
		const amount_usd = amount_btc * pendingPayment.exchange_rate
		const display_name = getDisplayName(pendingPayment.metadata, 'Anonymous')

		// Create donation in a single atomic mutation (handles deduplication internally)
		const created = await ctx.runMutation(
			internal.bitcoin.mutations.createDonationFromPayment,
			{
				address,
				amount_usd,
				display_name,
				message: pendingPayment.metadata?.message,
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

		logger.info(
			`Payment monitoring complete: ${derivation_index} confirmed with ${result.confirmations} confirmations`
		)
	},
})
