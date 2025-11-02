import { env } from '@/env.ts'

// Universal logger utility
// Works across all environments: Convex (V8 isolate + Node.js), client, and server
// Production: Structured JSON logging for aggregation tools
// Development: Human-readable console logs for debugging
// ```typescript
// import { logger } from '@/utils/logger'
// logger.info('Processing payment')
// logger.error('Payment failed', error)
// logger.audit('donation_created', { amount: 50, method: 'stripe' })
// ```

const isDevelopment = env.NODE_ENV !== 'production'

export const logger = {
	// Info logs - development only
	// Use for general information and debugging
	info: (...args: unknown[]) => {
		if (isDevelopment) {
			console.log('[INFO]', ...args)
		}
	},

	// Warning logs - always shown
	// Use for potential issues that should be investigated
	warn: (...args: unknown[]) => {
		if (isDevelopment) {
			console.warn('[WARN]', ...args)
		} else {
			console.warn(
				JSON.stringify({
					level: 'warn',
					message: args,
					timestamp: Date.now(),
				})
			)
		}
	},

	// Error logs - always shown
	// Use for failures and exceptions
	error: (...args: unknown[]) => {
		if (isDevelopment) {
			console.error('[ERROR]', ...args)
		} else {
			console.error(
				JSON.stringify({
					level: 'error',
					message: args,
					timestamp: Date.now(),
					stack: args[0] instanceof Error ? args[0].stack : undefined,
				})
			)
		}
	},

	// Debug logs - development only
	// Use for verbose debugging information (including sensitive data in development)
	// Safe for sensitive data: derivation_index, addresses, session_ids, payment_ids, etc.
	// Only shown in development (NODE_ENV !== 'production'), never in production
	debug: (...args: unknown[]) => {
		if (isDevelopment) {
			console.log('[DEBUG]', ...args)
		}
	},

	// Audit logs - always shown
	// Use for important business events (donations, payments, milestones)
	// Always logged in structured format for compliance/tracking
	audit: (event: string, data?: Record<string, unknown>) => {
		console.log(
			JSON.stringify({
				level: 'audit',
				event,
				data: data ? sanitizeForLogging(data) : undefined,
				timestamp: Date.now(),
			})
		)
	},
}

// SECURITY: Sanitize data before logging
// Removes sensitive fields that should never appear in logs
export function sanitizeForLogging<T extends Record<string, unknown>>(
	data: T
): Partial<T> {
	const sensitiveFields = [
		// Authentication & Secrets
		'password',
		'token',
		'secret',
		'apiKey',
		'api_key',
		'webhook_secret',
		'client_secret',

		// Payment Information
		'creditCard',
		'credit_card',
		'ssn',

		// Cryptographic Keys
		'privateKey',
		'private_key',
		'master_key',
		'masterKey',
		'xprv',
		'zprv',
		'tprv',
		'vprv',

		// Bitcoin-Specific Identifiers
		'session_id',
		'sessionId',
		'address',
		'btc_address',
		'bitcoin_address',
		'tx_hash',
		'txHash',
		'transaction_hash',
		'transactionHash',
		'derivation_index',
		'derivationIndex',

		// Payment Processing IDs (may be PII depending on processor)
		'payment_id',
		'paymentId',
		'order_id',
		'orderId',
		'customer_id',
		'customerId',

		// User-Generated Content (may contain PII)
		'message',
	]

	const sanitized = { ...data }

	for (const field of sensitiveFields) {
		if (field in sanitized) {
			delete sanitized[field]
		}
	}

	return sanitized
}

// SECURITY: Safe error logging helper
// Logs only error messages, not full error objects that may contain sensitive data
// ```typescript
// try {
//   await processPayment()
// } catch (error) {
//   logErrorSafely('Payment processing failed', error)
// }
// ```
export function logErrorSafely(message: string, error: unknown): void {
	const errorMessage = error instanceof Error ? error.message : 'Unknown error'
	logger.error(message, { error: errorMessage })
}
