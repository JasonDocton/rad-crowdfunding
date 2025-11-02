/**
 * Bitcoin Type Definitions
 *
 * Type definitions, constants, and type guards for Bitcoin payment processing.
 */

// Bitcoin Constants
export const satoshiToBtc = 100_000_000 as const
export const btcAmountTolerance = 0.00001 as const

// Bitcoin Confirmation Requirements
export const bitcoinConfirmations = {
	mainnet: 3,
	testnet: 6,
} as const

// Exchange Rate Cache Configuration
export const exchangeRateCacheMs = 300_000 as const // 5 minutes

// Bitcoin Action Return Types
export type GenerateBitcoinAddressResult = {
	readonly address: string
	readonly amount_btc: number
	readonly amount_usd: number
	readonly exchange_rate: number
	readonly derivation_index: number
}

// Public-facing Bitcoin payment check result (returned from checkBitcoinPayment action)
// Discriminated union representing payment states visible to frontend
export type CheckBitcoinPaymentResult =
	| { readonly paid: false } // No payment detected
	| {
			readonly paid: true // Payment fully confirmed
			readonly tx_hash: string | undefined
			readonly amount_btc: number | undefined
			readonly confirmations: number
			readonly required_confirmations: number
	  }

// Bitcoin Client State (persists across modal open/close)
export type BitcoinPaymentData = {
	readonly address: string
	readonly derivation_index: number
	readonly amount_btc: number
	readonly exchange_rate: number
	readonly createdAt: number
	readonly expiresAt: number
}

// Bitcoin monitoring result (returned from monitorSinglePayment action)
export type BitcoinMonitoringResult = {
	readonly address: string
	readonly txid: string
	readonly amount_btc: number
	readonly confirmations: number
}

// Blockchain payment check result (internal, used by monitoring)
// Discriminated union representing distinct payment states
export type BlockchainPaymentResult =
	| { readonly status: 'api_failed' } // API call failed, state unknown
	| { readonly status: 'no_payment' } // API succeeded, no payment detected
	| {
			readonly status: 'pending' // Payment detected, waiting for confirmations
			readonly tx_hash: string
			readonly amount_btc: number
			readonly confirmations: number
	  }
	| {
			readonly status: 'paid' // Payment fully confirmed
			readonly tx_hash: string
			readonly amount_btc: number
			readonly confirmations: number
	  }

// Shared transaction status interface
export interface TransactionStatus {
	readonly confirmed: boolean
	readonly block_height?: number
}

// Type guard for validating BitcoinPaymentData from localStorage
export function isValidBitcoinPaymentData(
	data: unknown
): data is BitcoinPaymentData {
	if (typeof data !== 'object' || data === null) return false

	const d = data as Record<string, unknown>

	return (
		typeof d.address === 'string' &&
		typeof d.derivation_index === 'number' &&
		typeof d.amount_btc === 'number' &&
		typeof d.exchange_rate === 'number' &&
		typeof d.createdAt === 'number' &&
		typeof d.expiresAt === 'number'
	)
}

const bech32Charset = /^[a-z0-9]+$/
const invalidBech32Chars = /[1bio]/

// Validate Bech32 Bitcoin address (mainnet bc1, testnet tb1)
export function validateBitcoinAddress(
	address: string,
	network: 'mainnet' | 'testnet'
): void {
	const prefix = network === 'mainnet' ? 'bc1' : 'tb1'

	if (!address.startsWith(prefix)) {
		throw new Error(
			`Invalid Bitcoin address: expected ${network} address starting with ${prefix}`
		)
	}

	if (address.length < 42 || address.length > 90) {
		throw new Error('Invalid Bitcoin address length')
	}

	const addressBody = address.slice(3)
	if (!bech32Charset.test(addressBody)) {
		throw new Error('Invalid Bitcoin address characters')
	}

	if (invalidBech32Chars.test(addressBody)) {
		throw new Error(
			'Invalid Bitcoin address: contains invalid bech32 characters (1, b, i, or o)'
		)
	}
}
