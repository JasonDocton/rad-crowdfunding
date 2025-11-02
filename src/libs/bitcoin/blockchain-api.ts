/**
 * Bitcoin Blockchain API Utilities
 *
 * Utilities for interacting with blockchain explorers.
 * Provides transaction status checking and address validation.
 */

// Standard timeout for blockchain API requests (ms)
export const blockchainApiTimeoutMs = 8000

// Fetch with timeout to prevent hanging on slow APIs
export async function fetchWithTimeout(
	url: string,
	timeoutMs: number
): Promise<Response> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(url, { signal: controller.signal })
		clearTimeout(timeout)
		return response
	} catch (error) {
		clearTimeout(timeout)
		// Provide better error messages for aborted requests
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(`Request timed out after ${timeoutMs}ms`)
		}
		throw error
	}
}

// Get current Bitcoin blockchain tip height from API
// Used to calculate transaction confirmations
export async function getCurrentBlockHeight(baseUrl: string): Promise<number> {
	try {
		const response = await fetchWithTimeout(
			`${baseUrl}/blocks/tip/height`,
			blockchainApiTimeoutMs
		)
		if (!response.ok) return 0
		return Number.parseInt(await response.text(), 10)
	} catch {
		return 0
	}
}

// Calculate confirmations for a transaction
export function calculateConfirmations(
	currentHeight: number,
	blockHeight: number | undefined
): number {
	if (!blockHeight || currentHeight === 0) return 0
	return currentHeight - blockHeight + 1
}
