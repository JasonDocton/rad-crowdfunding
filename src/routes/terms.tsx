// This page shows the rules for using the donation site.
// Explains the terms of service that users agree to when they donate.
// You should note that much of this is simply RAD's standard ToS. It doesn't apply the site-config data.
// Make sure to replace with your own ToS.

import { createFileRoute, Link } from '@tanstack/react-router'
import { createSeo } from '@/components/seo.tsx'
import { siteConfig } from '@/configs/site-config.ts'

export const Route = createFileRoute('/terms')({
	head: () =>
		createSeo({
			title: 'Terms of Service',
			description:
				'Terms of Service for using our crowdfunding platform. Donation policies, payment terms, and user obligations.',
			url: `${siteConfig.siteUrl}/terms`,
			robots: 'noindex, follow',
		}),
	component: TermsOfService,
})

function TermsOfService() {
	return (
		<div className="mx-auto max-w-4xl space-y-12 px-4 py-12 leading-relaxed">
			<div className="space-y-6">
				<h1 className="font-bold text-4xl leading-tight">Terms of Service</h1>
				<p className="text-secondary/75 text-sm">
					Last Updated: October 30, 2025
				</p>
			</div>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">Overview</h2>
				<p>
					Welcome to this crowdfunding platform operated by Rise Above The
					Disorder ("RAD," "we," "us," or "our"). By accessing or using this
					platform, you agree to be bound by these Terms of Service. If you do
					not agree to these terms, please do not use this platform.
				</p>
				<p>
					<strong>
						You must be at least 13 years old to use this platform.
					</strong>{' '}
					By using this platform, you represent and warrant that you are at
					least 13 years of age.
				</p>
				<p>
					We reserve the right to amend these terms at any time. Material
					changes to these Terms will take effect 30 days after publication on
					this page. Non-material changes take effect immediately. Your
					continued use of the platform after changes are posted constitutes
					acceptance of the modified terms.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Service Description
				</h2>
				<p>
					This crowdfunding platform allows you to make donations to support
					Rise Above The Disorder's mission of making mental health support
					accessible to everyone. We accept donations through multiple payment
					methods:
				</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>Credit and debit cards (processed by Stripe)</li>
					<li>PayPal payments</li>
					<li>Bitcoin cryptocurrency</li>
				</ul>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">Payment Terms</h2>
				<p>
					By making a donation through this platform, you acknowledge and agree
					to the following payment terms:
				</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>
						<strong>All donations are final.</strong> We do not offer refunds
						for donations made through this platform, except in cases of
						fraudulent charges, payment processing errors, or as required by
						law. Refunds for such exceptions are granted at our sole discretion
						and must be requested within 30 days of the donation by contacting{' '}
						<a
							className="text-primary hover:underline"
							href="mailto:Hey@youarerad.org"
						>
							Hey@youarerad.org
						</a>
						.
					</li>
					<li>
						<strong>Third-party processing:</strong> Credit card and PayPal
						payments are processed by third-party payment processors (Stripe and
						PayPal, respectively). Your payment information is subject to their
						terms of service and privacy policies.
					</li>
					<li>
						<strong>Bitcoin confirmations:</strong> Bitcoin donations require a
						minimum of 3 blockchain confirmations before appearing in our donor
						list. This typically takes 30-60 minutes but can vary based on
						network conditions.
					</li>
					<li>
						<strong>Minimum donation:</strong> The minimum donation amount is $1
						USD across all payment methods.
					</li>
					<li>
						<strong>Exchange rates:</strong> For Bitcoin donations, exchange
						rates are determined at the time of payment based on real-time
						market data from multiple exchanges. We are not responsible for
						fluctuations in cryptocurrency exchange rates.
					</li>
					<li>
						<strong>Transaction fees:</strong> Payment processing fees are
						covered by Rise Above The Disorder. You will not be charged
						additional fees beyond your donation amount.
					</li>
				</ul>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					User Obligations
				</h2>
				<p>By using this platform, you agree to:</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>
						Provide accurate information when making a donation, including any
						display name you choose to provide
					</li>
					<li>
						Not use the platform for any illegal purposes or in violation of any
						applicable laws or regulations
					</li>
					<li>
						Take full responsibility for securing your Bitcoin wallet and
						private keys if using cryptocurrency payments
					</li>
					<li>
						Comply with your local laws regarding online donations and
						charitable giving
					</li>
					<li>
						Not attempt to circumvent or interfere with the platform's security
						measures or rate limiting systems
					</li>
					<li>
						Not transmit any malicious code, viruses, or harmful content through
						the platform
					</li>
					<li>
						Not attempt to gain unauthorized access to any portion of the
						platform or other users' information
					</li>
				</ul>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Intellectual Property
				</h2>
				<p>
					All content on this platform, including but not limited to text,
					graphics, logos, images, and software, is the property of Rise Above
					The Disorder or its licensors and is protected by copyright,
					trademark, and other intellectual property laws.
				</p>
				<p>
					You are granted a limited, non-exclusive, non-transferable license to
					access and use this platform for its intended purpose of making
					donations. You may not:
				</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>Reproduce, distribute, or publicly display platform content</li>
					<li>Modify or create derivative works from platform content</li>
					<li>Remove or alter copyright notices or proprietary markings</li>
					<li>Use platform content for commercial purposes</li>
					<li>
						Reverse engineer, decompile, or disassemble any software used in the
						platform
					</li>
				</ul>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Limitation of Liability
				</h2>
				<p>
					To the maximum extent permitted by law, Rise Above The Disorder shall
					not be liable for any indirect, incidental, special, consequential, or
					punitive damages, or any loss of profits or revenues, whether incurred
					directly or indirectly, or any loss of data, use, goodwill, or other
					intangible losses resulting from:
				</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>
						Your use or inability to use the platform or any payment method
					</li>
					<li>Blockchain transaction delays or failures beyond our control</li>
					<li>
						Bitcoin or cryptocurrency exchange rate fluctuations or market
						volatility
					</li>
					<li>
						Third-party payment processor issues, including Stripe or PayPal
						service interruptions or downtime
					</li>
					<li>
						Loss of funds due to user error, such as entering an incorrect
						Bitcoin address, losing wallet access, or sending funds to the wrong
						destination
					</li>
					<li>
						Unauthorized access to or alteration of your transmissions or data
					</li>
					<li>
						Statements or conduct of any third party on or through the platform
					</li>
					<li>
						Any other matter relating to the platform or these Terms of Service
					</li>
				</ul>
				<p>
					Some jurisdictions do not allow the exclusion of certain warranties or
					the limitation of liability for consequential or incidental damages.
					In such jurisdictions, our liability will be limited to the maximum
					extent permitted by law.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Disclaimer of Warranties
				</h2>
				<p>
					This platform and all content, materials, and services provided
					through it are provided "as is" and "as available" without warranties
					of any kind, either express or implied, including but not limited to:
				</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>
						Implied warranties of merchantability or fitness for a particular
						purpose
					</li>
					<li>
						Warranties regarding the accuracy, reliability, or completeness of
						platform content
					</li>
					<li>
						Warranties that the platform will be uninterrupted, secure, or
						error-free
					</li>
					<li>
						Warranties regarding the results that may be obtained from using the
						platform
					</li>
				</ul>
				<p>
					We make no representations or warranties regarding the accuracy of
					cryptocurrency exchange rates, blockchain confirmation times, or the
					availability of third-party payment processors.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Third-Party Services and Links
				</h2>
				<p>This platform integrates with third-party services, including:</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>
						<strong>Stripe:</strong> Credit card payment processing
					</li>
					<li>
						<strong>PayPal:</strong> PayPal payment processing
					</li>
					<li>
						<strong>Convex:</strong> Database and backend services
					</li>
					<li>
						<strong>Blockchain.info and cryptocurrency exchanges:</strong>{' '}
						Bitcoin transaction verification and exchange rate data
					</li>
				</ul>
				<p>
					These third-party services have their own terms of service and privacy
					policies. We are not responsible for and do not endorse the content,
					products, services, or practices of any third-party sites or services.
					Your use of third-party services is at your own risk.
				</p>
				<p>
					The platform may contain links to external websites. We have no
					control over and assume no responsibility for the content, privacy
					policies, or practices of any third-party sites.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Termination and Suspension
				</h2>
				<p>
					We reserve the right to terminate or suspend your access to the
					platform at any time, without prior notice or liability, for any
					reason, including but not limited to:
				</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>Violation of these Terms of Service</li>
					<li>Fraudulent, abusive, or illegal activity</li>
					<li>Attempts to circumvent platform security or rate limits</li>
					<li>Behavior that we deem harmful to the platform or other users</li>
				</ul>
				<p>
					Upon termination, your right to use the platform will immediately
					cease. All provisions of these Terms which by their nature should
					survive termination shall survive, including but not limited to
					intellectual property provisions, warranty disclaimers, and
					limitations of liability.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Governing Law and Dispute Resolution
				</h2>
				<p>
					These Terms of Service shall be governed by and construed in
					accordance with the laws of the State of California, United States,
					without regard to its conflict of law provisions.
				</p>
				<p>
					Any disputes arising out of or relating to these Terms or your use of
					the platform shall be resolved through binding arbitration in
					accordance with the rules of the American Arbitration Association,
					except that either party may seek injunctive or other equitable relief
					in any court of competent jurisdiction.
				</p>
				<p>
					<strong>Small Claims Court Exception:</strong> Notwithstanding the
					above, either party may bring an individual action in small claims
					court for disputes or claims within the scope of that court's
					jurisdiction. This small claims court option is available as an
					alternative to arbitration.
				</p>
				<p>
					The arbitration will be conducted in California, and judgment on the
					arbitration award may be entered into any court having jurisdiction
					thereof. Each party will bear its own costs and expenses in the
					arbitration.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">Force Majeure</h2>
				<p>
					We shall not be liable for any failure or delay in performance of our
					obligations under these Terms due to causes beyond our reasonable
					control, including but not limited to:
				</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>Acts of God, natural disasters, or extreme weather events</li>
					<li>War, terrorism, civil unrest, or government actions</li>
					<li>
						Internet service provider failures or telecommunications outages
					</li>
					<li>
						Blockchain network congestion, hard forks, or cryptocurrency network
						failures
					</li>
					<li>
						Third-party payment processor outages or service interruptions
						(Stripe, PayPal)
					</li>
					<li>
						Cyberattacks, distributed denial-of-service attacks, or other
						security incidents
					</li>
					<li>Pandemics, epidemics, or public health emergencies</li>
					<li>
						Any other circumstances beyond our reasonable control that prevent
						or delay performance
					</li>
				</ul>
				<p>
					In the event of a force majeure, our obligations under these Terms
					will be suspended for the duration of the event. We will make
					reasonable efforts to resume normal operations as soon as possible.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">Severability</h2>
				<p>
					If any provision of these Terms of Service is found to be invalid,
					illegal, or unenforceable by a court of competent jurisdiction, such
					provision shall be severed from these Terms, and the remaining
					provisions shall continue in full force and effect.
				</p>
				<p>
					The invalid or unenforceable provision shall be replaced with a valid
					and enforceable provision that most closely matches the intent of the
					original provision.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Entire Agreement
				</h2>
				<p>
					These Terms of Service, together with our{' '}
					<Link className="text-primary hover:underline" to="/privacy">
						Privacy Policy
					</Link>
					, constitute the entire agreement between you and Rise Above The
					Disorder regarding your use of this platform and supersede all prior
					agreements and understandings, whether written or oral, relating to
					the subject matter hereof.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Contact Information
				</h2>
				<p>
					If you have any questions, concerns, or requests regarding these Terms
					of Service, please contact us:
				</p>
				<div className="space-y-2 rounded-lg border border-secondary/20 p-4">
					<p>
						<strong>Rise Above The Disorder</strong>
					</p>
					<p>
						<strong>Legal Contact:</strong> Jason Docton
					</p>
					<p>
						<strong>Email:</strong>{' '}
						<a
							className="text-primary hover:underline"
							href="mailto:Hey@youarerad.org"
						>
							Hey@youarerad.org
						</a>
					</p>
					<p className="text-secondary/75 text-sm">
						For general inquiries about Rise Above The Disorder and our mission,
						visit{' '}
						<a
							className="text-primary hover:underline"
							href="https://youarerad.org"
							rel="noopener noreferrer"
							target="_blank"
						>
							youarerad.org
						</a>
					</p>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Acknowledgment and Acceptance
				</h2>
				<p>
					By using this crowdfunding platform and making a donation, you
					acknowledge that you have read, understood, and agree to be bound by
					these Terms of Service and our{' '}
					<Link className="text-primary hover:underline" to="/privacy">
						Privacy Policy
					</Link>
					.
				</p>
			</section>
		</div>
	)
}
