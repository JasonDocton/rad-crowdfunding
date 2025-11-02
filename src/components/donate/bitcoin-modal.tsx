// This popup shows a Bitcoin address and QR code when someone wants to donate with Bitcoin.
// It watches the blockchain and updates when the payment is received and confirmed.

import {
	Description,
	Dialog,
	DialogPanel,
	DialogTitle,
} from '@headlessui/react'
import { api } from 'convex/_generated/api'
import type { BitcoinPaymentData } from 'convex/bitcoin/types'
import { useAction, useMutation, useQuery } from 'convex/react'
import { QRCodeSVG } from 'qrcode.react'
import {
	useEffect,
	useEffectEvent,
	useId,
	useMemo,
	useRef,
	useState,
	useTransition,
} from 'react'
import { env } from '@/env.ts'
import { useConfirmationSync } from '@/libs/bitcoin/use-confirmation-sync.ts'
import { useCountdownTimer } from '@/libs/bitcoin/use-countdown-timer.ts'
import { logger } from '@/utils/logger.ts'
import { getSecureItem, setSecureItem } from '@/utils/secure-storage.ts'
import { Button } from '../button.tsx'

interface DonateBitcoinModalProps {
	isOpen: boolean
	onClose: (error?: string) => void
	amount: number
	message: string | null
	playerName: string | null
	usePlayerName: boolean
	paymentData: BitcoinPaymentData | null
	onPaymentDataUpdate: (data: BitcoinPaymentData | null) => void
	confirmations: { current: number; required: number } | null
	onConfirmationsUpdate: (
		confirmations: { current: number; required: number } | null
	) => void
	sessionId: string | null // Lazy-loaded when user selects Bitcoin (GDPR compliance)
}

type PaymentStatus = 'loading' | 'active' | 'pending' | 'paid'

function DonateBitcoinModal({
	isOpen,
	onClose,
	amount,
	message,
	playerName,
	usePlayerName,
	paymentData,
	onPaymentDataUpdate,
	confirmations,
	onConfirmationsUpdate,
	sessionId,
}: DonateBitcoinModalProps) {
	const [status, setStatus] = useState<PaymentStatus>('loading' as const)
	const [isCopied, setIsCopied] = useState(false)
	const [isAmountCopied, setIsAmountCopied] = useState(false)
	const [displayData, setDisplayData] = useState<{
		amount_btc: number
		exchange_rate: number
	} | null>(null)
	const [pollingDelay, setPollingDelay] = useState(10000) // Start at 10 seconds

	const [isGenerating, startGeneration] = useTransition()
	const pollingRef = useRef<NodeJS.Timeout | null>(null)
	const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const copyButtonRef = useRef<HTMLButtonElement>(null)
	const viewTxButtonRef = useRef<HTMLAnchorElement>(null)

	// Track if payment was already confirmed when modal opened
	// This prevents re-redirecting to success page on subsequent modal opens
	const wasAlreadyPaidOnMount = useRef(false)

	// Track if we've performed the initial mount check
	// This distinguishes "donation existed on mount" from "donation appeared during session"
	const hasCheckedInitialState = useRef(false)

	// Track if expiration announcement has been made (prevents infinite loop)
	const hasAnnouncedExpiration = useRef(false)

	// Track if we've already marked payment as expired (prevents duplicate calls)
	const hasMarkedExpired = useRef(false)

	// Generate unique ID for bitcoin-address input (accessibility + linting)
	const addressInputId = useId()

	const generateBitcoinAddress = useAction(
		api.bitcoin.actions.generateBitcoinAddress
	)
	const checkBitcoinPayment = useAction(api.bitcoin.actions.checkBitcoinPayment)
	const getBtcExchangeRate = useAction(api.bitcoin.actions.getBtcExchangeRate)
	const markPaymentExpired = useMutation(
		api.bitcoin.mutations.markPaymentExpired
	)

	// Query pending payment for txid and status
	// Skip if no sessionId (shouldn't happen after lazy loading, but type-safe)
	const pendingPayment = useQuery(
		api.bitcoin.mutations.getPendingPaymentByAddress,
		paymentData?.address && sessionId
			? { address: paymentData.address, session_id: sessionId }
			: 'skip'
	)

	// Query donations table to check if payment was already confirmed
	// This persists even after cleanup deletes pending_bitcoin_payments
	const confirmedDonation = useQuery(
		api.donation.getDonationByPaymentId,
		paymentData?.address ? { payment_id: paymentData.address } : 'skip'
	)

	// Confirmation sync between parent and modal
	const { localConfirmations, setLocalConfirmations } = useConfirmationSync({
		isOpen,
		parentConfirmations: confirmations,
		onUpdate: onConfirmationsUpdate,
	})

	// Only consider expired if timer is up AND no payment detected (computed inline first)
	const isExpiredWithoutPayment =
		paymentData && paymentData.expiresAt <= Date.now() && status === 'active'

	// Countdown timer with milestone announcements
	const { timeRemaining, announcement } = useCountdownTimer({
		isOpen,
		paymentData,
		isExpired: isExpiredWithoutPayment || false,
		isPending: status === 'pending',
		isPaid: status === 'paid',
	})

	// Auto-focus copy button when modal opens for quick keyboard access
	useEffect(() => {
		if (isOpen && paymentData && copyButtonRef.current) {
			copyButtonRef.current.focus()
		}
	}, [isOpen, paymentData])

	// Auto-focus View Transaction button when it appears (accessibility + UX)
	useEffect(() => {
		if (
			status === 'pending' &&
			pendingPayment?.txid &&
			viewTxButtonRef.current
		) {
			viewTxButtonRef.current.focus()
		}
	}, [status, pendingPayment?.txid])

	// Expiration announcement is now handled by the countdown timer hook
	useEffect(() => {
		if (isExpiredWithoutPayment && !hasAnnouncedExpiration.current) {
			hasAnnouncedExpiration.current = true
		}
	}, [isExpiredWithoutPayment])

	// Mark payment as expired when countdown expires (client-side cleanup)
	useEffect(() => {
		if (
			isExpiredWithoutPayment &&
			paymentData &&
			sessionId &&
			!hasMarkedExpired.current
		) {
			hasMarkedExpired.current = true

			// Call mutation to mark payment as expired
			// This allows cron to clean it up later without waiting 24h
			markPaymentExpired({
				address: paymentData.address,
				session_id: sessionId,
			}).catch((error) => {
				// Log error but don't show to user (non-critical cleanup operation)
				const errorMsg =
					error instanceof Error ? error.message : 'Unknown error'
				logger.warn('Failed to mark payment as expired:', errorMsg)
			})
		}
	}, [isExpiredWithoutPayment, paymentData, sessionId, markPaymentExpired])

	// Redirect to success page when payment confirms
	// This handles BOTH client polling and reactive query detection
	useEffect(() => {
		if (!isOpen || !paymentData || status !== 'paid' || !sessionId) return

		// Don't redirect if payment was already confirmed when modal opened
		// This prevents redirect loop when user reopens modal to view confirmation
		if (wasAlreadyPaidOnMount.current) {
			return
		}

		// Check if we've already redirected for this address during THIS session
		// This persists across modal close/reopen and page refreshes
		const redirectKey = `bitcoin_redirected_${paymentData.address}`

		// Check redirect flag asynchronously
		void (async () => {
			const hasRedirected = await getSecureItem<string>(redirectKey)

			if (hasRedirected) {
				// User has already been redirected for this payment
				// They're reopening the modal to view confirmation or make another donation
				return
			}

			// Mark as redirected before navigating
			// Success page will clear this flag when it loads
			await setSecureItem(redirectKey, 'true')

			// Payment just confirmed - show success message briefly, then redirect
			redirectTimeoutRef.current = setTimeout(() => {
				window.location.href = `/success?payment_id=${encodeURIComponent(paymentData.address)}`
			}, 2000)
		})()

		return () => {
			if (redirectTimeoutRef.current) {
				clearTimeout(redirectTimeoutRef.current)
			}
		}
	}, [isOpen, paymentData, status, sessionId])

	// Check for existing pending payment and set status accordingly
	// This must run BEFORE the generate address effect to prevent showing expired state
	useEffect(() => {
		if (!isOpen || !paymentData) return

		// FIRST: Check donations table (permanent record)
		if (confirmedDonation !== undefined) {
			// If donation exists, payment is confirmed (regardless of pending_bitcoin_payments cleanup)
			if (confirmedDonation) {
				// Only set wasAlreadyPaidOnMount on the FIRST check (when modal opens)
				// If donation appears DURING the session, allow redirect
				if (!hasCheckedInitialState.current) {
					wasAlreadyPaidOnMount.current = true
					hasCheckedInitialState.current = true
				}
				setStatus((prev) => (prev === 'paid' ? prev : 'paid'))
				return
			}
			// No donation found - mark that we've checked initial state
			if (!hasCheckedInitialState.current) {
				hasCheckedInitialState.current = true
			}
			// No donation found - continue to check pending_bitcoin_payments
		}

		// SECOND: Check pending_bitcoin_payments (temporary tracking)
		// Wait for query to load (pendingPayment will be undefined while loading)
		if (pendingPayment === undefined) {
			setStatus((prev) => (prev === 'loading' ? prev : 'loading'))
			return
		}

		// If we have a pending payment with txid, set status immediately
		if (pendingPayment?.txid) {
			// Transaction exists - check if it's fully confirmed or still pending
			if (pendingPayment.status === 'confirmed') {
				// Payment was already confirmed when modal opened
				// Mark this so we don't redirect to success page again
				wasAlreadyPaidOnMount.current = true
				setStatus((prev) => (prev === 'paid' ? prev : 'paid'))
			} else {
				setStatus((prev) => (prev === 'pending' ? prev : 'pending'))
				// Note: Confirmation counts will be fetched by polling
				// We don't store them in the database to avoid stale data
			}
		}
	}, [isOpen, paymentData, confirmedDonation, pendingPayment])

	// Generate address on mount if needed (only when no payment data exists)
	useEffect(() => {
		if (!isOpen) return

		if (paymentData) {
			// We have payment data - wait for BOTH queries to load
			// Don't set status until we know payment state from both sources
			if (pendingPayment === undefined || confirmedDonation === undefined) {
				// Still loading - keep status as 'loading'
				return
			}

			// If confirmed donation exists, the effect above will handle status (set to 'paid')
			// If pending payment exists with txid, the effect above will handle status (set to 'pending')
			// Only set to 'active' if NEITHER exists (fresh address waiting for payment)
			if (!pendingPayment?.txid && !confirmedDonation) {
				setStatus('active')
			}
		} else {
			// No payment data - generate new address
			// Safety check: sessionId should always be set by handleBitcoinPayment
			if (!sessionId) {
				logger.error(
					'[Bitcoin] Modal opened without session ID - this should not happen'
				)
				onClose(
					'Unable to load Bitcoin payment. Please close this window and try again.'
				)
				return
			}

			startGeneration(async () => {
				try {
					const result = await generateBitcoinAddress({
						amount,
						session_id: sessionId,
						metadata:
							usePlayerName || message
								? {
										player_name: playerName,
										use_player_name: usePlayerName,
										message: message || undefined,
									}
								: undefined,
					})

					const now = Date.now()
					onPaymentDataUpdate({
						address: result.address,
						derivation_index: result.derivation_index,
						amount_btc: result.amount_btc,
						exchange_rate: result.exchange_rate,
						createdAt: now,
						expiresAt: now + 300000, // 5 minutes
					})
					setStatus('active')
				} catch (error) {
					const errorMsg =
						error instanceof Error ? error.message : 'Unknown error'
					logger.error('Failed to generate address:', errorMsg)
					onClose(
						'Unable to create Bitcoin payment address. Please close this window and try again, or choose a different payment method.'
					)
				}
			})
		}
	}, [
		isOpen,
		paymentData,
		pendingPayment,
		confirmedDonation,
		amount,
		usePlayerName,
		playerName,
		message,
		sessionId,
		generateBitcoinAddress,
		onPaymentDataUpdate,
		onClose,
	])

	// Set initial display data from persisted payment data
	useEffect(() => {
		if (!isOpen || !paymentData || isExpiredWithoutPayment) return

		// Use persisted exchange rate initially (prevents QR code from changing on reopen)
		setDisplayData({
			amount_btc: paymentData.amount_btc,
			exchange_rate: paymentData.exchange_rate,
		})
	}, [isOpen, paymentData, isExpiredWithoutPayment])

	// Update exchange rate every 30 seconds for accurate BTC amount
	useEffect(() => {
		if (!isOpen || !paymentData || isExpiredWithoutPayment) return

		const updateExchangeRate = async () => {
			try {
				// Use Convex action for robust multi-exchange median rate
				const rate = await getBtcExchangeRate()
				setDisplayData({
					amount_btc: amount / rate,
					exchange_rate: rate,
				})
			} catch (error) {
				const errorMsg =
					error instanceof Error ? error.message : 'Unknown error'
				logger.warn('Exchange rate fetch failed:', errorMsg)
			}
		}

		// Start updates after 30 seconds (don't update immediately)
		const interval = setInterval(updateExchangeRate, 30000)

		return () => clearInterval(interval)
	}, [isOpen, paymentData, amount, isExpiredWithoutPayment, getBtcExchangeRate])

	// Extract polling logic as an event to avoid restarting the interval
	// when metadata like playerName or sessionId changes
	const onPollPayment = useEffectEvent(async () => {
		if (!paymentData || !displayData || !sessionId) return

		try {
			const result = await checkBitcoinPayment({
				address: paymentData.address,
				session_id: sessionId,
				expected_btc_amount: displayData.amount_btc,
				metadata:
					usePlayerName || message
						? {
								player_name: playerName,
								use_player_name: usePlayerName,
								message: message || undefined,
							}
						: undefined,
			})

			// Handle no payment detected
			if (!result.paid) {
				// No change to status - keep showing 'active' state with countdown
				return
			}

			// Payment detected (result.paid === true)
			// Check if we have enough confirmations
			if (result.confirmations < result.required_confirmations) {
				// Payment seen but not enough confirmations - show pending state
				setStatus('pending')

				// Only update confirmations if they changed (prevent flashing)
				const newConfirmations = {
					current: result.confirmations,
					required: result.required_confirmations,
				}

				setLocalConfirmations((prev) => {
					if (
						prev &&
						prev.current === newConfirmations.current &&
						prev.required === newConfirmations.required
					) {
						return prev // No change, return previous state
					}
					return newConfirmations // useConfirmationSync will sync to parent
				})
				return
			}

			// Fully confirmed payment
			setStatus('paid')
			setLocalConfirmations(null) // useConfirmationSync will sync to parent
			if (pollingRef.current) {
				clearInterval(pollingRef.current)
			}
			// Redirect logic moved to centralized useEffect (line 242-259)
			// This handles both client polling and reactive query detection
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error'
			logger.error('Payment check failed:', errorMsg)
		}
	})

	// Payment polling with exponential backoff
	// biome-ignore lint/correctness/useExhaustiveDependencies: onPollPayment is useEffectEvent, stable reference
	useEffect(() => {
		// Poll while waiting for payment OR waiting for confirmations
		// Stop polling only when fully paid or expired without payment
		if (
			!isOpen ||
			status === 'paid' || // Stop once fully confirmed
			status === 'loading' || // Don't poll while generating address
			!paymentData ||
			isExpiredWithoutPayment // Only stop polling if expired WITHOUT payment
		)
			return

		// Initial poll
		void onPollPayment()

		// Set up interval with current delay
		pollingRef.current = setInterval(onPollPayment, pollingDelay)

		// Implement exponential backoff: 10s → 15s → 20s → 30s → 45s → 60s
		const backoffTimer = setTimeout(() => {
			if (pollingDelay < 60000) {
				const nextDelay = Math.min(pollingDelay + 5000, 60000)
				setPollingDelay(nextDelay)

				// Restart interval with new delay
				if (pollingRef.current) {
					clearInterval(pollingRef.current)
				}
			}
		}, pollingDelay)

		return () => {
			if (pollingRef.current) {
				clearInterval(pollingRef.current)
				pollingRef.current = null
			}
			clearTimeout(backoffTimer)
		}
	}, [isOpen, status, paymentData, pollingDelay, isExpiredWithoutPayment])

	// Shared state reset logic for both close and regenerate actions
	const resetModalState = () => {
		// Cancel any pending operations
		if (pollingRef.current) {
			clearInterval(pollingRef.current)
			pollingRef.current = null
		}
		if (redirectTimeoutRef.current) {
			clearTimeout(redirectTimeoutRef.current)
			redirectTimeoutRef.current = null
		}

		// Reset UI state (but NOT status - let it stay as-is to avoid flash during close)
		setIsCopied(false)
		setIsAmountCopied(false)
		// Don't reset localConfirmations - parent state is source of truth
		// useConfirmationSync will sync parent → local when modal reopens
		setPollingDelay(10000)

		// Reset announcement ref flags
		hasAnnouncedExpiration.current = false
		hasMarkedExpired.current = false

		// Reset initial state check so next open correctly detects if donation exists
		hasCheckedInitialState.current = false
		wasAlreadyPaidOnMount.current = false
	}

	const handleClose = () => {
		resetModalState()
		onClose()
	}

	const handleRegenerate = () => {
		onPaymentDataUpdate(null) // Clear payment data to trigger new address generation
		resetModalState()
	}

	const bip21URI = useMemo(() => {
		if (!paymentData || !displayData) return ''
		return `bitcoin:${paymentData.address}?amount=${displayData.amount_btc}&label=${encodeURIComponent(playerName || 'Donation')}&message=${encodeURIComponent('RAD Crowdfunding Donation')}`
	}, [paymentData, displayData, playerName])

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${String(secs).padStart(2, '0')}`
	}

	// Generate transaction explorer link
	const getTxLink = (txid: string): string => {
		// Use development environment as proxy for testnet
		// Development = testnet, Production = mainnet
		const isDevelopment = env.NODE_ENV === 'development'

		if (isDevelopment) {
			// All new addresses are generated on testnet4 in development
			return `https://mempool.space/testnet4/tx/${txid}`
		}

		return `https://mempool.space/tx/${txid}`
	}

	return (
		<Dialog
			as="div"
			className="relative z-10 focus:outline-none"
			onClose={handleClose}
			open={isOpen}
		>
			<div className="fixed inset-0 w-screen overflow-y-auto">
				<div className="flex min-h-full items-center justify-center p-4">
					<DialogPanel
						className="data-closed:transform-[scale(95%)] w-full max-w-md rounded-xl bg-secondary/5 p-6 backdrop-blur-2xl duration-300 ease-out data-closed:opacity-0"
						transition
					>
						{/* Hide ALL content while checking existing payment status */}
						{status === 'loading' &&
						paymentData &&
						pendingPayment === undefined ? null : (
							<>
								<DialogTitle className="font-medium text-secondary">
									{status === 'pending' || status === 'paid'
										? 'Bitcoin Transaction'
										: 'Bitcoin Payment'}
								</DialogTitle>
								<Description className="text-secondary/60 text-sm">
									{status === 'pending'
										? `Confirming your $${amount} donation`
										: status === 'paid'
											? `Your $${amount} donation is confirmed!`
											: `Send Bitcoin to complete your $${amount} donation`}
								</Description>
							</>
						)}

						{/* Single container for consistent spacing across all states */}
						<div className="mt-6 space-y-4">
							{/* Loading State - only show when generating NEW address */}
							{(status === 'loading' || isGenerating) &&
								!isExpiredWithoutPayment &&
								!paymentData && (
									<div className="text-center text-secondary/75">
										Generating payment address...
									</div>
								)}

							{/* Terminal States: Expired or Paid - both allow starting a new donation */}
							{(isExpiredWithoutPayment || status === 'paid') && (
								<>
									<div className="text-center">
										{status === 'paid' ? (
											<>
												<div className="font-bold text-xl">
													Payment confirmed!
												</div>
												<p className="mt-2 text-secondary/75 text-sm">
													Thank you for your donation!
												</p>
											</>
										) : (
											<div className="text-secondary/75">
												Payment window expired
											</div>
										)}
									</div>
									<Button className="w-full" onClick={handleRegenerate}>
										{status === 'paid'
											? 'Make Another Donation'
											: 'Generate New Address'}
									</Button>
								</>
							)}

							{/* Active Payment State */}
							{status === 'active' &&
								!isExpiredWithoutPayment &&
								paymentData &&
								displayData && (
									<>
										{/* QR Code */}
										<div
											aria-label={`Bitcoin payment QR code for ${displayData.amount_btc.toFixed(8)} BTC`}
											className="mx-auto w-64 max-w-full"
											role="img"
										>
											<QRCodeSVG
												className="h-auto w-full"
												level="M"
												size={256}
												value={bip21URI}
											/>
										</div>

										{/* Address */}
										<div className="flex items-center gap-4">
											<input
												aria-label="Bitcoin payment address"
												className="focus-ring w-full border-2 border-primary bg-primary/50 px-3 py-1.5 font-medium text-sm text-white shadow-2xs"
												id={addressInputId}
												name="bitcoin-address"
												readOnly
												type="text"
												value={paymentData.address}
											/>
											<Button
												aria-label={isCopied ? 'Copied!' : 'Copy address'}
												onCopySuccess={() => setIsCopied(true)}
												ref={copyButtonRef}
												size="md"
												textToCopy={paymentData.address}
												variant="copy"
											/>
										</div>

										{/* Copy success announcement */}
										{isCopied && (
											<output aria-live="polite" className="sr-only">
												Address copied to clipboard
											</output>
										)}

										{/* Amount Info */}
										<div className="space-y-2">
											<div className="flex items-center justify-center gap-2">
												<div className="font-bold text-xl">
													{displayData.amount_btc.toFixed(8)} BTC
												</div>
												<Button
													aria-label={
														isAmountCopied
															? 'Amount copied!'
															: 'Copy BTC amount'
													}
													onCopySuccess={() => setIsAmountCopied(true)}
													size="sm"
													textToCopy={displayData.amount_btc.toFixed(8)}
													variant="copy"
												/>
											</div>
											<div className="text-center text-secondary/60 text-sm">
												≈ ${amount} USD @ $
												{displayData.exchange_rate.toLocaleString()}
											</div>
										</div>

										{/* Amount copy success announcement */}
										{isAmountCopied && (
											<output aria-live="polite" className="sr-only">
												BTC amount copied to clipboard
											</output>
										)}

										{/* Countdown Timer */}
										<div className="text-center text-secondary/75">
											Time remaining: {formatTime(timeRemaining)}
										</div>

										{/* Status */}
										<div className="text-center text-secondary/60 text-sm">
											<p>Waiting for payment...</p>
										</div>
									</>
								)}

							{/* Pending Confirmations State */}
							{status === 'pending' && (
								<>
									{/* Status heading */}
									<h3 className="text-center font-bold text-xl">
										⏳ Waiting for confirmations
									</h3>

									{/* Confirmation progress - live region for dynamic updates */}
									{localConfirmations ? (
										<output
											aria-atomic="true"
											aria-live="polite"
											className="block text-center font-mono text-lg text-secondary"
										>
											{localConfirmations.current} /{' '}
											{localConfirmations.required}
										</output>
									) : (
										<div className="text-center text-secondary/75 text-sm">
											Loading confirmation status...
										</div>
									)}

									{/* Transaction link or placeholder */}
									{pendingPayment?.txid ? (
										<div className="flex justify-center">
											<a
												className="focus-ring inline-flex items-center gap-2 rounded bg-primary/20 px-4 py-2 text-primary text-sm hover:bg-primary/30"
												href={getTxLink(pendingPayment.txid)}
												ref={viewTxButtonRef}
												rel="noopener noreferrer"
												target="_blank"
											>
												<span>View Transaction</span>
												<svg
													aria-hidden="true"
													className="size-4"
													fill="none"
													stroke="currentColor"
													strokeWidth={2}
													viewBox="0 0 24 24"
												>
													<path
														d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
												<span className="sr-only">(opens in new window)</span>
											</a>
										</div>
									) : (
										<p className="text-center text-secondary/60 text-xs">
											Transaction link loading...
										</p>
									)}

									{/* Detailed information */}
									<aside
										aria-label="Transaction information"
										className="rounded-lg bg-secondary/5 p-4 text-left"
									>
										<div className="font-medium text-secondary text-sm">
											Transaction Detected
										</div>
										<div className="mt-2 space-y-1 text-secondary/75 text-xs">
											<p>
												Your transaction has been broadcast to the Bitcoin
												network.
											</p>
											<p className="font-medium text-primary">
												You can safely close this window. Your donation will
												automatically appear on the main page once confirmed
												(usually 10-30 minutes).
											</p>
										</div>
									</aside>
								</>
							)}

							{/* Timer announcements for screen readers */}
							{announcement && (
								<output aria-live="polite" className="sr-only">
									{announcement}
								</output>
							)}
						</div>
					</DialogPanel>
				</div>
			</div>
		</Dialog>
	)
}

export { DonateBitcoinModal }
