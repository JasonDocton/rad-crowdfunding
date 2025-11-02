// Bitcoin session management with GDPR-compliant lazy loading
// Session ID is only generated when user explicitly selects Bitcoin payment

import type { BitcoinPaymentData } from 'convex/bitcoin/types'
import { isValidBitcoinPaymentData } from 'convex/bitcoin/types'
import { useRef, useState } from 'react'
import { logger } from '@/utils/logger.ts'
import {
	getSecureItem,
	removeSecureItem,
	setSecureItem,
} from '@/utils/secure-storage.ts'

interface UseBitcoinSessionReturn {
	readonly sessionId: string | null
	readonly isInitialized: boolean
	readonly initializeSession: () => Promise<void>
	readonly regenerateSession: () => void
	readonly loadPaymentData: () => Promise<BitcoinPaymentData | null>
	readonly savePaymentData: (data: BitcoinPaymentData | null) => Promise<void>
}

export function useBitcoinSession(): UseBitcoinSessionReturn {
	const [sessionId, setSessionId] = useState<string | null>(null)
	const sessionInitialized = useRef(false)

	// GDPR Compliance: Browser fingerprinting happens HERE for the first time
	// User has explicitly chosen Bitcoin payment, so "strictly necessary" legal basis applies
	const initializeSession = async (): Promise<void> => {
		if (sessionInitialized.current) {
			return
		}

		try {
			// Load session ID from encrypted storage (triggers fingerprinting)
			const storedSessionId = await getSecureItem<string>('bitcoinSessionId')

			if (storedSessionId) {
				logger.debug('[Bitcoin] Loading existing session')
				setSessionId(storedSessionId)
			} else {
				// No stored session - create new one (truly first interaction)
				logger.debug(
					'[Bitcoin] First Bitcoin interaction - creating new session'
				)
				const newSessionId = crypto.randomUUID()
				setSessionId(newSessionId)
				await setSecureItem('bitcoinSessionId', newSessionId)
			}

			sessionInitialized.current = true
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error'
			logger.warn('Failed to initialize Bitcoin session:', errorMsg)
			throw new Error(
				'Unable to start Bitcoin payment. Please reload the page and try again.'
			)
		}
	}

	// Generate new session ID (used when regenerating payment address)
	const regenerateSession = (): void => {
		const newSessionId = crypto.randomUUID()
		setSessionId(newSessionId)
		logger.debug('[Bitcoin] Generated new session ID for regeneration')

		// Save new session ID immediately to storage
		setSecureItem('bitcoinSessionId', newSessionId).catch((error) => {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error'
			logger.warn('Failed to persist new session ID:', errorMsg)
		})
	}

	// Load payment data from encrypted storage if exists
	const loadPaymentData = async (): Promise<BitcoinPaymentData | null> => {
		try {
			const storedPaymentData =
				await getSecureItem<BitcoinPaymentData>('bitcoinPaymentData')

			if (storedPaymentData && isValidBitcoinPaymentData(storedPaymentData)) {
				// Return payment data even if expired (let modal show expired state)
				logger.debug('[Bitcoin] Loaded existing payment data')
				return storedPaymentData
			}

			if (storedPaymentData) {
				logger.warn('[Bitcoin] Invalid payment data in storage')
			}

			return null
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error'
			logger.warn('Failed to load encrypted Bitcoin data:', errorMsg)
			return null
		}
	}

	// Save payment data to encrypted localStorage
	const savePaymentData = async (
		data: BitcoinPaymentData | null
	): Promise<void> => {
		try {
			logger.debug(
				'[Bitcoin] Persisting payment data:',
				data ? 'saving' : 'clearing'
			)
			if (data) {
				await setSecureItem('bitcoinPaymentData', data)
			} else {
				// Clear payment data only - sessionId persisted separately
				removeSecureItem('bitcoinPaymentData')
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error'
			logger.warn('Failed to persist encrypted Bitcoin data:', errorMsg)
		}
	}

	return {
		sessionId,
		isInitialized: sessionInitialized.current,
		initializeSession,
		regenerateSession,
		loadPaymentData,
		savePaymentData,
	}
}
