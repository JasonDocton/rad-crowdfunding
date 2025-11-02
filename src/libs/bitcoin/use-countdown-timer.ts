// Countdown timer with milestone announcements for Bitcoin payment window
// Manages 5-minute payment window with screen reader announcements

import type { BitcoinPaymentData } from 'convex/bitcoin/types'
import { useEffect, useState } from 'react'

interface UseCountdownTimerParams {
	readonly isOpen: boolean
	readonly paymentData: BitcoinPaymentData | null
	readonly isExpired: boolean
	readonly isPending: boolean
	readonly isPaid: boolean
}

interface UseCountdownTimerReturn {
	readonly timeRemaining: number
	readonly announcement: string
}

export function useCountdownTimer({
	isOpen,
	paymentData,
	isExpired,
	isPending,
	isPaid,
}: UseCountdownTimerParams): UseCountdownTimerReturn {
	const [currentTime, setCurrentTime] = useState(Date.now())
	const [announcement, setAnnouncement] = useState('')

	// Calculate time remaining (uses currentTime state to trigger re-renders)
	const timeRemaining = paymentData
		? Math.max(0, Math.floor((paymentData.expiresAt - currentTime) / 1000))
		: 0

	// Timer effect - updates countdown every second
	useEffect(() => {
		if (!isOpen || !paymentData || isExpired) return

		// Reset to current time immediately when modal opens
		setCurrentTime(Date.now())

		const interval = setInterval(() => {
			setCurrentTime(Date.now())
		}, 1000)

		return () => clearInterval(interval)
	}, [isOpen, paymentData, isExpired])

	// Timer milestone announcements for screen readers
	useEffect(() => {
		if (!isOpen || !paymentData) return

		// Don't announce timer updates if payment is pending/paid/expired
		if (isPending || isPaid || isExpired) return

		// Initial announcement
		if (timeRemaining === 300) {
			// 5:00
			setAnnouncement(
				'Payment window started. You have 5 minutes to complete payment.'
			)
		}
		// Halfway point
		else if (timeRemaining === 150) {
			// 2:30
			setAnnouncement('2 minutes 30 seconds remaining.')
		}
		// Final warning
		else if (timeRemaining === 30) {
			setAnnouncement('30 seconds remaining.')
		}
		// Clear announcement after it's been read
		else if (announcement) {
			const timeout = setTimeout(() => setAnnouncement(''), 1000)
			return () => clearTimeout(timeout)
		}
	}, [
		timeRemaining,
		isOpen,
		paymentData,
		announcement,
		isPending,
		isPaid,
		isExpired,
	])

	return {
		timeRemaining,
		announcement,
	}
}
