// This defines all the data types used throughout the backend code.
// It ensures data is structured correctly when moving between different parts of the app.

import type { FunctionReturnType } from 'convex/server'
import type { api } from './_generated/api.ts'
import type { Doc } from './_generated/dataModel'

// Public-Safe Types (safe to expose to clients)

// Public-safe donation data - excludes payment_id, payment_method, _creationTime
// Renames _id → id to make exposure deliberate
export type PublicDonation = {
	readonly id: string
	readonly display_name: string
	readonly amount: number
}

// NEVER return to clients - use PublicDonation instead
export type InternalDonation = Doc<'donations'>

// Query/Mutation Return Types
export type DonorListResult = FunctionReturnType<
	typeof api.donation.getDonorList
>
export type DonationListItem = DonorListResult['page'][number]

export type DonationTotal = FunctionReturnType<
	typeof api.donation.getAmountTotal
>

// Shared Payment Types
export type PaymentMethod = 'stripe' | 'paypal' | 'bitcoin'

// Shared Payment Constants
export const minDonationAmount = 1 as const
export const maxDonationAmount = 100_000 as const
export const maxPlayerNameLength = 50 as const
export const maxDisplayNameLength = 200 as const
export const maxMessageLength = 500 as const

// Session Configuration
export const sessionExpiryMs = 300_000 as const // 5 minutes

// Action Input Types
export type PaymentMetadata = {
	readonly player_name: string | null
	readonly use_player_name: boolean
	readonly message?: string
}

export type CreateCheckoutInput = {
	amount: number
	metadata?: PaymentMetadata
}

export type CreateOrderInput = CreateCheckoutInput

export type CaptureOrderInput = {
	orderId: string
}

// Shared Utilities
export function getDisplayName(
	metadata: PaymentMetadata | undefined,
	fallback: string
): string {
	return metadata?.use_player_name && metadata.player_name
		? metadata.player_name
		: fallback
}

export function validateDonationAmount(amount: number): void {
	if (amount < minDonationAmount) {
		throw new Error(`Amount must be at least $${minDonationAmount}`)
	}
	if (amount > maxDonationAmount) {
		throw new Error(
			`Amount must not exceed $${maxDonationAmount.toLocaleString()}`
		)
	}
}

export function validatePlayerName(playerName: string | null): void {
	if (!playerName) return

	if (playerName.length > maxPlayerNameLength) {
		throw new Error(
			`Player name must not exceed ${maxPlayerNameLength} characters`
		)
	}

	if (playerName.trim().length === 0) {
		throw new Error('Player name cannot be empty or whitespace only')
	}
}

// Prevent database bloat from excessively long names
export function validateDisplayName(displayName: string): void {
	if (displayName.length > maxDisplayNameLength) {
		throw new Error(
			`Display name must not exceed ${maxDisplayNameLength} characters`
		)
	}

	if (displayName.trim().length === 0) {
		throw new Error('Display name cannot be empty or whitespace only')
	}
}

export function validateMessage(message: string | undefined): void {
	if (!message) return

	if (message.length > maxMessageLength) {
		throw new Error(`Message must not exceed ${maxMessageLength} characters`)
	}

	if (message.trim().length === 0) {
		throw new Error('Message cannot be empty or whitespace only')
	}
}
