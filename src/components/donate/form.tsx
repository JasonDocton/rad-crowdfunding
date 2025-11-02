// This is the main donation form where users enter their info and choose how to pay.
// It handles all three payment methods: Stripe, PayPal, and Bitcoin.

import { api } from 'convex/_generated/api'
import type { BitcoinPaymentData } from 'convex/bitcoin/types'
import { isValidBitcoinPaymentData } from 'convex/bitcoin/types'
import { useAction } from 'convex/react'
import {
	type CreateCheckoutInput,
	minDonationAmount,
	type PaymentMethod,
} from 'convex/types'
import {
	type FormEvent,
	useEffect,
	useId,
	useRef,
	useState,
	useTransition,
} from 'react'
import { useBitcoinSession } from '@/libs/bitcoin/use-bitcoin-session.ts'
import { useFormValidation } from '@/libs/use-form-validation.ts'
import { logger } from '@/utils/logger.ts'
import { Button } from '../button.tsx'
import { CheckboxInput } from '../checkbox.tsx'
import { DonationSummary } from '../donation-summary.tsx'
import { TextInput } from '../text-input.tsx'
import { DonateBitcoinModal } from './bitcoin-modal.tsx'
import { DonateCustomInput } from './custom-input.tsx'
import { DonateMethodSelector } from './method-selector.tsx'
import { DonateRecommendedInput } from './recommended-input.tsx'
import { TextAreaInput } from './textarea-input.tsx'

const processingInterval = 100
const assetWarmupTime = 800

function DonateForm() {
	const [currentDonateOption, setCurrentDonateOption] = useState<
		number | undefined
	>(100)
	const [customAmount, setCustomAmount] = useState<string>('')
	const [playerName, setPlayerName] = useState<string>('')
	const [privacy, setPrivacy] = useState<boolean>(false)
	const [includeMessage, setIncludeMessage] = useState<boolean>(false)
	const [message, setMessage] = useState<string>('')

	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe')

	const [isPending, startTransition] = useTransition()
	const [processingTime, setProcessingTime] = useState<number>(0)

	const [submitError, setSubmitError] = useState<string | null>(null)
	const [playerNameTouched, setPlayerNameTouched] = useState<boolean>(false)
	const [messageTouched, setMessageTouched] = useState<boolean>(false)
	const [submitAttempted, setSubmitAttempted] = useState<boolean>(false)

	// Bitcoin payment state
	const [showBitcoinModal, setShowBitcoinModal] = useState<boolean>(false)
	const [bitcoinPaymentData, setBitcoinPaymentData] =
		useState<BitcoinPaymentData | null>(null)
	const [bitcoinConfirmations, setBitcoinConfirmations] = useState<{
		current: number
		required: number
	} | null>(null)

	// Bitcoin session management (GDPR-compliant lazy loading)
	const bitcoinSession = useBitcoinSession()

	const submitErrorId = useId()
	const playerNameInputRef = useRef<HTMLInputElement>(null)
	const messageInputRef = useRef<HTMLTextAreaElement>(null)

	const createStripeCheckout = useAction(
		api.stripe.actions.createCheckoutSession
	)

	const createPayPalOrder = useAction(api.paypal.actions.createOrder)

	const selectedAmount = customAmount
		? Number(customAmount)
		: (currentDonateOption ?? 0)

	const validation = useFormValidation({
		selectedAmount,
		minAmount: minDonationAmount,
		privacy,
		playerName,
		playerNameTouched,
		includeMessage,
		message,
		messageTouched,
		submitAttempted,
	})

	useEffect(() => {
		if (!isPending) {
			setProcessingTime(0)
			return
		}

		const interval = setInterval(() => {
			setProcessingTime((prev) => prev + processingInterval)
		}, processingInterval)

		return () => clearInterval(interval)
	}, [isPending])

	useEffect(() => {
		// Only focus on errors after a submit attempt (not during typing)
		if (!submitAttempted) return

		// Focus the first field with an error (priority order: playerName, then message)
		if (validation.showPlayerNameError && playerNameInputRef.current) {
			playerNameInputRef.current.focus()
		} else if (validation.showMessageError && messageInputRef.current) {
			messageInputRef.current.focus()
		}
	}, [
		validation.showPlayerNameError,
		validation.showMessageError,
		submitAttempted,
	])

	// Restore Bitcoin session on mount if stored session exists
	// User already consented to fingerprinting by clicking Bitcoin payment button previously
	// biome-ignore lint/correctness/useExhaustiveDependencies: Run once on mount to restore session
	useEffect(() => {
		if (typeof window === 'undefined') return

		const restoreSession = async () => {
			try {
				// initializeSession checks for stored session (no new fingerprinting if exists)
				await bitcoinSession.initializeSession()

				// Load existing payment data if available
				const storedPaymentData = await bitcoinSession.loadPaymentData()
				if (storedPaymentData) {
					setBitcoinPaymentData(storedPaymentData)
					logger.debug('[Bitcoin] Restored payment session on mount')
				}
			} catch {
				// Silently fail - no stored session exists yet
			}
		}

		void restoreSession()
	}, [])

	// Persist Bitcoin payment data to encrypted localStorage when it changes
	useEffect(() => {
		if (typeof window === 'undefined') return
		if (!bitcoinSession.isInitialized) return

		void bitcoinSession.savePaymentData(bitcoinPaymentData)
	}, [bitcoinPaymentData, bitcoinSession])

	// Note: We intentionally do NOT auto-clear expired payment data
	// The user must manually click "Generate New Address" to create a new one
	// This prevents infinite address generation if the user walks away

	const buildPaymentPayload = (): CreateCheckoutInput => ({
		amount: selectedAmount,
		metadata:
			privacy || includeMessage
				? {
						player_name: privacy ? playerName.trim() || null : null,
						use_player_name: privacy,
						message: includeMessage ? message.trim() : undefined,
					}
				: undefined,
	})

	const handleStripeCheckout = async () => {
		const result = await createStripeCheckout(buildPaymentPayload())

		if (!result?.url) {
			throw new Error('No checkout URL returned')
		}

		window.location.href = result.url
	}

	const handlePayPalCheckout = async () => {
		const result = await createPayPalOrder(buildPaymentPayload())

		if (!result?.approvalUrl) {
			throw new Error('No PayPal approval URL returned')
		}

		window.location.href = result.approvalUrl
	}

	const handleBitcoinPayment = async (): Promise<void> => {
		setSubmitAttempted(true)

		if (validation.hasValidationErrors) {
			if (!validation.isValidAmount) {
				setSubmitError(
					`Please select or enter a donation amount of at least $${minDonationAmount}`
				)
			}
			return
		}

		setSubmitError(null)

		// GDPR Compliance: Initialize session and load payment data
		if (!bitcoinSession.isInitialized) {
			try {
				await bitcoinSession.initializeSession()

				// Load payment data from encrypted storage if exists
				const storedPaymentData = await bitcoinSession.loadPaymentData()
				if (storedPaymentData) {
					setBitcoinPaymentData(storedPaymentData)
				}
			} catch (error) {
				const errorMsg =
					error instanceof Error ? error.message : 'Unknown error'
				logger.error('Bitcoin session initialization failed:', errorMsg)
				setSubmitError(errorMsg)
				return
			}
		}

		setShowBitcoinModal(true)
	}

	const handleBitcoinModalClose = (error?: string): void => {
		setShowBitcoinModal(false)
		if (error) {
			setSubmitError(error)
		}
	}

	const handleBitcoinPaymentDataUpdate = (
		data: BitcoinPaymentData | null
	): void => {
		setBitcoinPaymentData(data)

		// If clearing payment data (regenerating), generate new session ID
		if (data === null) {
			bitcoinSession.regenerateSession()
		}
	}

	const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
		e.preventDefault()
		setSubmitAttempted(true)

		if (validation.hasValidationErrors) {
			if (!validation.isValidAmount) {
				setSubmitError(
					`Please select or enter a donation amount of at least $${minDonationAmount}`
				)
			}
			return
		}

		// Bitcoin now requires async initialization for lazy session loading
		if (paymentMethod === 'bitcoin') {
			void handleBitcoinPayment()
			return
		}

		startTransition(async () => {
			setSubmitError(null)

			try {
				if (paymentMethod === 'stripe') {
					await handleStripeCheckout()
				} else {
					await handlePayPalCheckout()
				}
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Unknown error'
				logger.error('Checkout error:', errorMsg)
				setSubmitError(
					'Unable to start payment. Please check your connection and try again.'
				)
			}
		})
	}

	const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const value = e.currentTarget.value
		const numValue = Number(value)

		if (
			value === '' ||
			(numValue >= minDonationAmount && !Number.isNaN(numValue))
		) {
			setCustomAmount(value)
			setCurrentDonateOption(undefined)
			setSubmitError(null)
		}
	}

	const handleOptionChange = (amount: number): void => {
		setCurrentDonateOption(amount)
		setCustomAmount('')
		setSubmitError(null)
	}

	const handlePrivacyChange = (
		e: React.ChangeEvent<HTMLInputElement>
	): void => {
		setPrivacy(e.currentTarget.checked)
		setPlayerNameTouched(false)
		setSubmitAttempted(false)
		setSubmitError(null)
	}
	const handleIncludeMessageChange = (
		e: React.ChangeEvent<HTMLInputElement>
	): void => {
		setIncludeMessage(e.currentTarget.checked)
		setMessageTouched(false)
		setSubmitAttempted(false)
		setSubmitError(null)
	}

	const handlePlayerNameChange = (
		e: React.ChangeEvent<HTMLInputElement>
	): void => {
		setPlayerName(e.currentTarget.value)
		setPlayerNameTouched(true)
		setSubmitAttempted(false)
		setSubmitError(null)
	}

	const handleMessageChange = (
		e: React.ChangeEvent<HTMLTextAreaElement>
	): void => {
		setMessage(e.currentTarget.value)
		setMessageTouched(true)
		setSubmitAttempted(false)
		setSubmitError(null)
	}

	const handlePaymentMethodChange = (method: PaymentMethod): void => {
		setPaymentMethod(method)
		setSubmitError(null)
	}

	return (
		<form
			className="space-y-6"
			name="donate"
			noValidate
			onSubmit={handleSubmit}
		>
			<section className="space-y-4">
				<h2 className="sr-only">Select Donation Amount</h2>
				<DonateRecommendedInput
					onChange={handleOptionChange}
					value={currentDonateOption}
				/>
				<DonateCustomInput
					aria-describedby={submitError ? submitErrorId : undefined}
					aria-invalid={!validation.isValidAmount && customAmount !== ''}
					onChange={handleAmountChange}
					value={customAmount}
				/>
			</section>

			<DonationSummary amount={selectedAmount} />

			<section className="flex flex-col items-start space-y-2">
				<h2 className="sr-only">Privacy and Message Options</h2>
				<CheckboxInput
					checked={privacy}
					name="privacy"
					onChange={handlePrivacyChange}
				>
					Keep my info private
				</CheckboxInput>
				<CheckboxInput
					checked={includeMessage}
					name="includeMessage"
					onChange={handleIncludeMessageChange}
				>
					Include a message
				</CheckboxInput>
				{privacy && (
					<TextInput
						aria-invalid={validation.showPlayerNameError}
						description="Display your in-game name instead of real name."
						error={validation.showPlayerNameError}
						errorMessage="Please enter your in-game name."
						label="Name"
						maxLength={50}
						onChange={handlePlayerNameChange}
						placeholder="FeelsRADMan"
						ref={playerNameInputRef}
						required={privacy}
						value={playerName}
					/>
				)}
				{includeMessage && (
					<TextAreaInput
						aria-invalid={validation.showMessageError}
						error={validation.showMessageError}
						errorMessage="Please enter a message."
						onChange={handleMessageChange}
						ref={messageInputRef}
						required={includeMessage}
						value={message ? message.slice(0, 500) : ''}
					/>
				)}
			</section>

			<section className="space-y-4">
				<h2 className="sr-only">Complete Donation</h2>
				<DonateMethodSelector
					disabled={isPending}
					onChange={handlePaymentMethodChange}
					value={paymentMethod}
				/>

				<Button
					aria-busy={isPending}
					aria-describedby={submitError ? submitErrorId : undefined}
					disabled={isPending}
					type="submit"
				>
					{isPending ? (
						<div className="flex flex-col">
							Loading
							<span aria-hidden className="text-secondary/50 text-sm">
								Asset Warmup ({processingTime}/{assetWarmupTime})
							</span>
						</div>
					) : paymentMethod === 'bitcoin' ? (
						'Open Bitcoin Payment'
					) : (
						`Donate with ${paymentMethod === 'stripe' ? 'Stripe' : 'PayPal'}`
					)}
				</Button>

				{submitError && (
					<div
						aria-live="assertive"
						className="rounded border-2 border-accent bg-accent/20 px-3 py-1.5 text-accent"
						id={submitErrorId}
						role="alert"
					>
						{submitError}
					</div>
				)}
			</section>

			<DonateBitcoinModal
				amount={selectedAmount}
				confirmations={bitcoinConfirmations}
				isOpen={showBitcoinModal}
				message={includeMessage ? message : null}
				onClose={handleBitcoinModalClose}
				onConfirmationsUpdate={setBitcoinConfirmations}
				onPaymentDataUpdate={handleBitcoinPaymentDataUpdate}
				paymentData={bitcoinPaymentData}
				playerName={privacy ? playerName : null}
				sessionId={bitcoinSession.sessionId}
				usePlayerName={privacy}
			/>
		</form>
	)
}

export { DonateForm }
