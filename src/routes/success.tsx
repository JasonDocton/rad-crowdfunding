// This is the thank you page that shows after someone completes a donation.
// It confirms the payment worked and shows the updated donation list.

import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'
import { useQuery } from 'convex/react'
import { useEffect } from 'react'
import { Button } from '@/components/button.tsx'
import { DonationTable } from '@/components/donation-table.tsx'
import { GoalTracker } from '@/components/goal-tracker.tsx'
import { createSeo } from '@/components/seo.tsx'
import { siteConfig } from '@/configs/site-config.ts'
import { getDonationList } from '@/server/functions/get-donation-list.ts'
import { getDonationTotal } from '@/server/functions/get-donation-total.ts'
import { removeSecureItem } from '@/utils/secure-storage.ts'

type SearchParams = {
	payment_id: string | undefined
}

export const Route = createFileRoute('/success')({
	head: () =>
		createSeo({
			title: 'Thank You!',
			description: 'Thank you for your contribution to our campaign!',
			url: `${siteConfig.siteUrl}/success`,
			robots: 'noindex, nofollow',
		}),
	validateSearch: (search: Record<string, unknown>): SearchParams => {
		// Normalize payment provider URL parameters into single payment_id field
		// Stripe: session_id, PayPal: token, Bitcoin: payment_id
		const payment_id =
			(typeof search.payment_id === 'string' ? search.payment_id : undefined) ||
			(typeof search.session_id === 'string' ? search.session_id : undefined) ||
			(typeof search.token === 'string' ? search.token : undefined)

		return { payment_id }
	},
	beforeLoad: ({ search }) => {
		if (!search.payment_id) {
			throw redirect({ to: '/' })
		}
	},
	loader: async () => {
		// Prefetch donation data server-side while payment is processing
		// Components will show this cached data immediately, then auto-update
		// when the new donation is created via Convex reactive queries
		const [donors, total] = await Promise.all([
			getDonationList(),
			getDonationTotal(),
		])
		return { donors, total }
	},
	component: Success,
})

// Helper component for repeated states
type LoadingStateProps = {
	readonly title: string
	readonly message: string
	readonly status: string
}

function LoadingState({ title, message, status }: LoadingStateProps) {
	return (
		<main className="space-y-4">
			<h1 className="font-bold text-2xl text-white">{title}</h1>
			<p>{message}</p>
			<div
				aria-busy="true"
				aria-live="polite"
				className="flex items-center gap-2"
			>
				<span className="animate-pulse">●</span>
				<span>{status}</span>
			</div>
		</main>
	)
}

function Success() {
	const { payment_id } = Route.useSearch()
	const { donors, total } = Route.useLoaderData()

	// Get payment ID mapping (for PayPal: order ID → capture ID)
	// Returns null if no mapping exists (Stripe/Bitcoin use payment_id directly)
	const mappedPaymentId = useQuery(
		api.paypal.queries.getPaymentIdMapping,
		payment_id ? { order_id: payment_id } : 'skip'
	)

	// Use mapped ID if it exists, otherwise use original payment_id
	// This handles: PayPal (needs mapping), Stripe (direct), Bitcoin (direct)
	const finalPaymentId = mappedPaymentId || payment_id

	// Get donation directly from donations table (reactive query)
	// Convex will automatically update when webhook creates the donation
	const donation = useQuery(
		api.donation.getDonationByPaymentId,
		finalPaymentId ? { payment_id: finalPaymentId } : 'skip'
	)

	// Clear Bitcoin redirect flag when success page loads
	// This allows the user to donate again and be redirected for the new donation
	useEffect(() => {
		if (donation && donation.payment_method === 'bitcoin') {
			const redirectKey = `bitcoin_redirected_${donation.payment_id}`
			removeSecureItem(redirectKey)
		}
	}, [donation])

	// Loading state: Queries still loading
	if (mappedPaymentId === undefined || donation === undefined) {
		return (
			<LoadingState
				message="Please wait while we confirm your payment..."
				status="Loading payment information"
				title="Processing Your Contribution..."
			/>
		)
	}

	// Waiting state: Donation not created yet (webhook hasn't arrived)
	// Convex reactive query will automatically update when donation is created
	if (donation === null) {
		return (
			<LoadingState
				message="Your payment is being processed. This page will automatically update when your payment is confirmed."
				status="Waiting for payment confirmation..."
				title="Processing Your Contribution..."
			/>
		)
	}

	// At this point, donation is guaranteed to exist (TypeScript knows this)

	// Success state - donation found
	const confirmationDate = new Date(donation._creationTime).toLocaleDateString(
		'en-US',
		{
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		}
	)

	// Payment confirmation details - mapped for consistency
	type ConfirmationDetail = {
		readonly label: string
		readonly value: string
		readonly className?: string
	}

	const confirmationDetails: readonly ConfirmationDetail[] = [
		{
			label: 'Payment ID',
			value: donation.payment_id,
			className: 'font-mono text-xs break-all',
		},
		{ label: 'Date', value: confirmationDate },
		{
			label: 'Amount',
			value: `$${donation.amount.toLocaleString()}`,
			className: 'font-bold text-white',
		},
		{ label: 'Display Name', value: donation.display_name },
		{
			label: 'Payment Method',
			value: donation.payment_method,
			className: 'capitalize',
		},
	]

	return (
		<main className="space-y-4">
			<div
				aria-live="polite"
				className="space-y-2 rounded-lg bg-background/50"
				role="alert"
			>
				<h1 className="font-bold text-2xl text-white">
					Thank You for Your Contribution!
				</h1>
				<p className="text-lg">
					Your generous contribution of{' '}
					<strong className="text-white">
						${donation.amount.toLocaleString()}
					</strong>{' '}
					has been confirmed.
				</p>
			</div>

			<section className="space-y-2 rounded-lg bg-background/50">
				<h2 className="font-bold text-white text-xl">Payment Confirmation</h2>
				<dl className="space-y-1">
					{confirmationDetails.map(({ label, value, className }) => (
						<div className="flex items-center justify-between" key={label}>
							<dt>{label}:</dt>
							<dd className={className}>{value}</dd>
						</div>
					))}
				</dl>
				{donation.message && (
					<div className="space-y-1 border-secondary/20 border-t pt-2">
						<dt className="font-semibold text-sm text-white">Your Message:</dt>
						<dd className="whitespace-pre-wrap break-words text-sm italic">
							{donation.message}
						</dd>
					</div>
				)}
				<p className="pt-2 text-sm">
					Thank you for your contribution! This confirmation is for your
					records.
				</p>
			</section>

			<GoalTracker initialTotal={total} />
			<nav
				aria-label="Post-donation navigation"
				className="flex w-full flex-row gap-4"
			>
				<Button asChild variant="primary">
					<Link to="/donate">Donate Again</Link>
				</Button>
				<Button asChild variant="secondary">
					<Link to="/">Home</Link>
				</Button>
			</nav>
			<DonationTable initialDonations={donors} />
		</main>
	)
}
