// This keeps data safe in the browser's storage by scrambling it with encryption.
// Used to securely store browser fingerprinting, which we use for Bitcoin payment sessions.

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { managedNonce } from '@noble/ciphers/utils.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { logger } from '@/utils/logger.ts'

// Derive encryption key from browser fingerprint
// Combines stable browser characteristics to generate a consistent 256-bit key.
// This provides defense-in-depth but is NOT cryptographically strong protection
// against XSS. Worst case with XSS is the donors device or wifi was compromised and
// an attacker hijacks the bitcoin address we show in the bitcoin-modal. Not much we
// can do to prevent that scenario.

// The fingerprint includes:
// - User agent (browser + OS)
// - Language preference
// - Screen dimensions and color depth
// - Timezone offset
// - Hardware concurrency (CPU cores)

function getEncryptionKey(): Uint8Array {
	// Collect stable browser characteristics
	const fingerprint = [
		navigator.userAgent,
		navigator.language,
		screen.width.toString(),
		screen.height.toString(),
		screen.colorDepth.toString(),
		new Date().getTimezoneOffset().toString(),
		navigator.hardwareConcurrency?.toString() ?? 'unknown',
	].join('|')

	// Hash fingerprint with SHA-256 to get 256-bit key
	const encoder = new TextEncoder()
	const data = encoder.encode(fingerprint)

	// Use noble-hashes for consistent cross-platform SHA-256
	return sha256(data)
}

// Securely store item in localStorage with automatic nonce handling
// Flow:
// 1. Derive encryption key from browser fingerprint
// 2. Create managedNonce cipher (auto-generates fresh nonce)
// 3. Encrypt data (nonce is automatically prepended)
// 4. Encode as base64 and store in localStorage
// The managedNonce wrapper eliminates nonce reuse bugs by:
// - Generating fresh 24-byte CSPRNG nonce for each encrypt()
// - Automatically prepending nonce to ciphertext
// - No need to track or store nonces separately
// ```typescript
// await setSecureItem('sessionId', '123e4567-e89b-12d3-a456-426614174000')
// await setSecureItem('paymentData', { address: 'bc1q...', amount: 0.001 })
// ```
// biome-ignore lint/suspicious/useAwait: Function is async for API consistency (Promise-based interface)
export async function setSecureItem(
	key: string,
	value: unknown
): Promise<void> {
	try {
		// Derive encryption key from browser fingerprint
		const encKey = getEncryptionKey()

		// Create cipher with automatic nonce management
		// This eliminates manual nonce tracking and reuse bugs
		const cipher = managedNonce(xchacha20poly1305)(encKey)

		// Serialize value to JSON
		const data = JSON.stringify(value)
		const dataBytes = new TextEncoder().encode(data)

		// Encrypt with auto-generated nonce
		// The nonce is automatically prepended to the ciphertext
		const encrypted = cipher.encrypt(dataBytes)

		// Convert to base64 for localStorage storage
		const base64 = btoa(String.fromCharCode(...encrypted))

		// Store encrypted data
		localStorage.setItem(key, base64)
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error'
		logger.error('Failed to encrypt localStorage item:', errorMsg)
		throw new Error('Encryption failed')
	}
}

// Securely retrieve item from localStorage with automatic nonce extraction
// Flow:
// 1. Retrieve base64-encoded ciphertext from localStorage
// 2. Derive same encryption key from browser fingerprint
// 3. Create managedNonce cipher
// 4. Decrypt data (nonce automatically extracted from prefix)
// 5. Parse JSON and return value
// The managedNonce wrapper automatically:
// - Extracts first 24 bytes as nonce
// - Uses remaining bytes as ciphertext
// - Verifies Poly1305 authentication tag
// ```typescript
// const sessionId = await getSecureItem<string>('sessionId')
// const paymentData = await getSecureItem<BitcoinPaymentData>('paymentData')
// ```
// biome-ignore lint/suspicious/useAwait: Function is async for API consistency (Promise-based interface)
export async function getSecureItem<T>(key: string): Promise<T | null> {
	try {
		// Retrieve encrypted data from localStorage
		const stored = localStorage.getItem(key)
		if (!stored) return null

		// Derive same encryption key from browser fingerprint
		const encKey = getEncryptionKey()

		// Create cipher with automatic nonce extraction
		const cipher = managedNonce(xchacha20poly1305)(encKey)

		// Decode base64 to bytes
		const encrypted = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0))

		// Decrypt (automatically extracts nonce from first 24 bytes)
		// Throws if authentication fails (data tampered)
		const decrypted = cipher.decrypt(encrypted)

		// Parse JSON
		const data = new TextDecoder().decode(decrypted)
		return JSON.parse(data) as T
	} catch (error) {
		// Decryption failure could mean:
		// - Wrong browser/fingerprint (user switched browser)
		// - Corrupted localStorage data
		// - Data tampered with (Poly1305 auth failed)
		const errorMsg = error instanceof Error ? error.message : 'Unknown error'
		logger.warn('Failed to decrypt localStorage item:', errorMsg)

		// Clear corrupted data
		localStorage.removeItem(key)

		return null
	}
}

// Remove item from localStorage
// Simple wrapper for consistency with setSecureItem/getSecureItem API.
// ```typescript
// removeSecureItem('sessionId')
// removeSecureItem('paymentData')
// ```
export function removeSecureItem(key: string): void {
	localStorage.removeItem(key)
}

// Check if item exists in localStorage (without decrypting)
// ```typescript
// if (hasSecureItem('sessionId')) {
//   const sessionId = await getSecureItem<string>('sessionId')
// }
// ```
export function hasSecureItem(key: string): boolean {
	return localStorage.getItem(key) !== null
}
