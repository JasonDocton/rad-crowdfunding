/**
 * Bitcoin Exchange Rate Service
 *
 * Fetches and caches BTC/USD exchange rates from multiple sources.
 * Implements fallback logic across Coinbase, Kraken, and Binance APIs.
 */

'use node'

import { ActionCache } from '@convex-dev/action-cache'
import { components, internal } from 'convex/_generated/api'
import { type ActionCtx, internalAction } from 'convex/_generated/server'
import { fetchWithTimeout } from '@/libs/bitcoin/blockchain-api.ts'
import { logger } from '@/utils/logger.ts'
import { exchangeRateCacheMs } from './types.ts'

// Exchange API response types
type CoinbaseRates = {
	data: {
		rates: {
			USD: string
		}
	}
}

type KrakenTicker = {
	result: {
		XXBTZUSD: {
			c: readonly [string, ...string[]]
		}
	}
}

type BinanceTicker = {
	price: string
}

type ExchangeAPI<T> = {
	readonly name: string
	readonly url: string
	readonly extractPrice: (data: T) => string | undefined
}

export const exchangeApis = [
	{
		name: 'Coinbase',
		url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
		extractPrice: (data: unknown) => (data as CoinbaseRates).data?.rates?.USD,
	},
	{
		name: 'Kraken',
		url: 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD',
		extractPrice: (data: unknown) =>
			(data as KrakenTicker).result?.XXBTZUSD?.c?.[0],
	},
	{
		name: 'Binance',
		url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
		extractPrice: (data: unknown) => (data as BinanceTicker).price,
	},
] as const satisfies readonly ExchangeAPI<unknown>[]

// Internal action: fetch BTC/USD from multiple exchanges, return median
// Using median protects against single-source failures and price manipulation
export const fetchBtcPriceInternal = internalAction({
	args: {},
	handler: async (): Promise<number> => {
		const prices: number[] = []

		await Promise.all(
			exchangeApis.map(async ({ name, url, extractPrice }) => {
				try {
					const response = await fetchWithTimeout(url, 5000)
					if (response.ok) {
						const data = await response.json()
						const priceStr = extractPrice(data)
						if (priceStr) {
							prices.push(Number.parseFloat(priceStr))
						}
					}
				} catch (_error) {
					logger.info(`${name} price fetch failed`)
				}
			})
		)

		if (prices.length > 0) {
			prices.sort((a, b) => a - b)
			const mid = Math.floor(prices.length / 2)
			let median: number

			if (prices.length % 2 === 0) {
				const lower = prices[mid - 1]
				const upper = prices[mid]
				if (lower === undefined || upper === undefined) {
					throw new Error(
						'Invalid median calculation: array index out of bounds'
					)
				}
				median = (lower + upper) / 2
			} else {
				const value = prices[mid]
				if (value === undefined) {
					throw new Error(
						'Invalid median calculation: array index out of bounds'
					)
				}
				median = value
			}

			return median
		}

		throw new Error('Failed to fetch BTC price from any exchange')
	},
})

const exchangeRateCache = new ActionCache(components.actionCache, {
	action: internal.bitcoin.exchange.fetchBtcPriceInternal,
	name: 'btc_usd_exchange_rate',
	ttl: exchangeRateCacheMs, // 5 minutes
})

// Get BTC/USD with 5-min cache, fallback to cached value on API failures
export async function getBtcPrice(ctx: ActionCtx): Promise<number> {
	return await exchangeRateCache.fetch(ctx, {})
}
