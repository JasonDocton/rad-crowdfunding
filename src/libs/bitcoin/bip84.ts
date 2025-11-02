// This creates Bitcoin wallet addresses for donations using special Bitcoin rules (BIP84).
// It makes sure each address is unique and safe to receive payments.

import { sha256 } from '@noble/hashes/sha2.js'
import { createBase58check } from '@scure/base'
import { HDKey } from '@scure/bip32'
import { NETWORK, p2wpkh, TEST_NETWORK } from '@scure/btc-signer'

// BIP84 version bytes for extended private keys
const bip84Versions = {
	mainnet: 0x04b2430c, // zprv
	testnet: 0x045f18bc, // vprv
} as const

// Derive BIP84 native SegWit address from extended private key
// BIP84 defines the standard for deriving native SegWit (P2WPKH) addresses
// using the path m/84'/0'/0'/0/{index}. This function accepts BIP84 extended
// private keys (zprv for mainnet, vprv for testnet) at any depth and automatically
// derives the address at the specified index.
// Uses Paul Millr's audited @scure libraries:
// - @scure/base: Base58 decoding with checksum validation
// - @scure/bip32: HD wallet derivation (BIP32)
// - @scure/btc-signer: Native SegWit (P2WPKH) address generation
// This implementation manually decodes BIP84 extended keys (zprv/vprv) because
// (xprv/tprv). We extract the raw private key and chain code, then construct
// an HDKey directly.
// ```typescript
// // Mainnet example
// const address = deriveBip84Address(
//   'zprvAd...', // zprv key at depth 3 (account level)
//   0,           // First address
//   'mainnet'
// )
// // Returns: bc1q...
// // Testnet example
// const address = deriveBip84Address(
//   'vprv9s...', // vprv key from Electrum
//   5,           // Sixth address
//   'testnet'
// )
// // Returns: tb1q...
// ```
export function deriveBip84Address(
	extendedKey: string,
	index: number,
	network: 'mainnet' | 'testnet'
): string {
	// Select network configuration
	const btcNetwork = network === 'testnet' ? TEST_NETWORK : NETWORK

	try {
		// Create base58check coder with sha256 hash function
		const b58check = createBase58check(sha256)

		// Decode base58check encoded extended key
		const decoded = b58check.decode(extendedKey)

		// BIP32 extended key structure (78 bytes after base58check decode):
		// [4 bytes]  version
		// [1 byte]   depth
		// [4 bytes]  parent fingerprint
		// [4 bytes]  child number
		// [32 bytes] chain code
		// [33 bytes] key data (0x00 + 32-byte private key)

		// Extract and validate version bytes (first 4 bytes)
		const version = new DataView(
			decoded.buffer,
			decoded.byteOffset,
			4
		).getUint32(0, false)
		const expectedVersion =
			network === 'testnet' ? bip84Versions.testnet : bip84Versions.mainnet

		if (version !== expectedVersion) {
			const expectedFormat = network === 'testnet' ? 'vprv' : 'zprv'
			throw new Error(
				`Invalid BIP84 key: expected ${network} key (${expectedFormat}), got version 0x${version.toString(16).padStart(8, '0')}`
			)
		}

		// Extract depth (byte 4)
		const depth = decoded[4]

		// Extract chain code (bytes 13-45)
		const chainCode = decoded.slice(13, 45)

		// Extract private key (bytes 46-78, skipping 0x00 prefix at byte 45)
		const privateKey = decoded.slice(46, 78)

		// Validate key depth (BIP84 keys should be at depth 0-3)
		if (depth === undefined || depth > 3) {
			throw new Error(
				`Invalid BIP84 key depth: got depth ${depth}. ` +
					'BIP84 keys should be at depth 0 (master), 1 (purpose), 2 (coin type), or 3 (account)'
			)
		}

		// Create HDKey from raw key material
		// Note: We don't pass versions here because we'll derive using standard methods
		let hdkey = new HDKey({
			chainCode,
			privateKey,
		})

		// Derive to account level (m/84'/0'/0') based on current depth
		// BIP84 path: m/84'/0'/0'/0/{index}
		//
		// IMPORTANT: Electrum exports vprv keys with depth=1 but they should be
		// treated as account-level keys (depth 3). This is an Electrum quirk.
		// We treat depth 1 the same as depth 3 to maintain Electrum compatibility.
		//
		// - depth 0: master key (m) → derive m/84'/0'/0'
		// - depth 1: Electrum account key (reported as m/84', actually m/84'/0'/0') → use as-is
		// - depth 2: coin type key (m/84'/0') → derive m/0'
		// - depth 3: account key (m/84'/0'/0') → use as-is
		if (depth === 0) {
			// Master key: derive m/84'/0'/0'
			hdkey = hdkey
				.deriveChild(0x80000000 + 84) // 84'
				.deriveChild(0x80000000 + 0) // 0'
				.deriveChild(0x80000000 + 0) // 0'
		} else if (depth === 2) {
			// Coin type key (m/84'/0'): derive m/0'
			hdkey = hdkey.deriveChild(0x80000000 + 0) // 0'
		}
		// else depth === 1 or 3: Electrum account key, use as-is

		// Derive external chain (0 = receiving addresses, 1 = change addresses)
		const externalChain = hdkey.deriveChild(0)

		// Derive specific address index
		const child = externalChain.deriveChild(index)

		// Check that we have a valid public key
		if (!child.publicKey) {
			throw new Error('Failed to derive public key from child node')
		}

		// Generate native SegWit (P2WPKH) address from public key
		const payment = p2wpkh(child.publicKey, btcNetwork)

		if (!payment.address) {
			throw new Error('Failed to generate P2WPKH address from public key')
		}

		return payment.address
	} catch (error) {
		// Provide detailed error messages for debugging
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		throw new Error(
			`BIP84 address derivation failed for index ${index} on ${network}: ${errorMessage}`
		)
	}
}
