// Form validation logic for donation form
// Consolidates validation checks for amount, player name, and message

import { useMemo } from 'react'

interface UseFormValidationParams {
	readonly selectedAmount: number
	readonly minAmount: number
	readonly privacy: boolean
	readonly playerName: string
	readonly playerNameTouched: boolean
	readonly includeMessage: boolean
	readonly message: string
	readonly messageTouched: boolean
	readonly submitAttempted: boolean
}

interface UseFormValidationReturn {
	readonly isValidAmount: boolean
	readonly showPlayerNameError: boolean
	readonly showMessageError: boolean
	readonly hasValidationErrors: boolean
}

export function useFormValidation({
	selectedAmount,
	minAmount,
	privacy,
	playerName,
	playerNameTouched,
	includeMessage,
	message,
	messageTouched,
	submitAttempted,
}: UseFormValidationParams): UseFormValidationReturn {
	const isValidAmount = selectedAmount >= minAmount

	const showPlayerNameError =
		privacy &&
		(playerNameTouched || submitAttempted) &&
		playerName.trim().length === 0

	const showMessageError =
		includeMessage &&
		(messageTouched || submitAttempted) &&
		message.trim().length === 0

	const hasValidationErrors = useMemo(() => {
		if (!isValidAmount) return true
		if (privacy && !playerName.trim()) return true
		if (includeMessage && !message.trim()) return true
		return false
	}, [isValidAmount, privacy, playerName, includeMessage, message])

	return {
		isValidAmount,
		showPlayerNameError,
		showMessageError,
		hasValidationErrors,
	}
}
