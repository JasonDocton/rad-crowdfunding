// This page explains how we protect user privacy and what data we collect.
// Shows our privacy policy that users can read before donating.
// You should note that much of this is simply RAD's standard Privacy Policy. It doesn't apply the site-config data.
// Make sure to replace with your own Privacy Policy.

import { createFileRoute } from '@tanstack/react-router'
import { createSeo } from '@/components/seo.tsx'
import { siteConfig } from '@/configs/site-config.ts'

export const Route = createFileRoute('/privacy')({
	head: () =>
		createSeo({
			title: 'Privacy Policy',
			description:
				'Learn about our privacy-first approach. We collect minimal data and prioritize your security. No emails, no tracking, no analytics.',
			url: `${siteConfig.siteUrl}/privacy`,
			robots: 'noindex, follow',
		}),
	component: PrivacyPolicy,
})

function PrivacyPolicy() {
	return (
		<div className="mx-auto max-w-4xl space-y-12 px-4 py-12 leading-relaxed">
			<div className="space-y-6">
				<h1 className="font-bold text-4xl leading-tight">Privacy Policy</h1>
				<p className="text-secondary/75 text-sm">
					Last Updated: October 30, 2025
				</p>
			</div>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">Overview</h2>
				<p>
					This Privacy Policy explains how Rise Above The Disorder ("RAD," "we,"
					"us," or "our") collects, uses, and protects your personal information
					when you use this crowdfunding platform. This platform is operated by
					Rise Above The Disorder, a nonprofit organization committed to making
					mental health support accessible to everyone.
				</p>
				<p>
					We are committed to protecting your privacy and handling your personal
					information with transparency and care. This policy outlines what data
					we collect, why we collect it, how we use it, and your rights
					regarding your personal information.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Data Controller Information
				</h2>
				<p>
					For the purposes of data protection law, the data controller
					responsible for your personal information is:
				</p>
				<div className="space-y-2 rounded-lg border border-secondary/20 p-4">
					<p>
						<strong>Rise Above The Disorder</strong>
					</p>
					<p>5750 Wilshire Blvd</p>
					<p>Los Angeles, CA 90036</p>
					<p>United States</p>
					<p>
						<strong>Email:</strong>{' '}
						<a
							className="text-primary hover:underline"
							href="mailto:Hey@youarerad.org"
						>
							Hey@youarerad.org
						</a>
					</p>
				</div>
			</section>

			<section className="space-y-6">
				<h2 className="font-semibold text-2xl leading-tight">
					What Personal Information We Collect
				</h2>

				<div className="space-y-4">
					<h3 className="font-semibold text-xl leading-snug">
						Information You Provide
					</h3>
					<p>When you make a donation through our platform, we collect:</p>
					<ul className="list-outside list-disc space-y-2 pl-6">
						<li>
							<strong>Donation amount:</strong> The amount you choose to donate
						</li>
						<li>
							<strong>Display name (optional):</strong> If you choose to be
							recognized publicly on our donor list
						</li>
						<li>
							<strong>Payment confirmation ID:</strong> A transaction identifier
							from your payment processor
						</li>
						<li>
							<strong>Contact information:</strong> If you reach out to us via
							email or social media
						</li>
					</ul>
				</div>

				<div className="space-y-4">
					<h3 className="font-semibold text-xl leading-snug">
						Browser Fingerprinting (Bitcoin Payments Only)
					</h3>
					<div className="space-y-2 rounded-lg border border-accent bg-accent/10 p-4">
						<p className="font-semibold leading-snug">
							Important: Browser fingerprinting only occurs when you select
							Bitcoin as your payment method.
						</p>
						<p>
							<strong>When:</strong> Only when you explicitly select Bitcoin as
							your payment method
						</p>
						<p>
							<strong>What we collect:</strong> Browser type and version,
							language settings, screen resolution and color depth, timezone,
							CPU core count
						</p>
						<p>
							<strong>Purpose:</strong> Generate encryption keys to protect your
							Bitcoin payment session data stored in your browser's local
							storage. This ensures your payment information remains secure and
							private.
						</p>
						<p>
							<strong>Legal basis (GDPR):</strong> Strictly necessary for
							providing the Bitcoin payment service you explicitly requested
						</p>
						<p>
							<strong>Your choice:</strong> You can avoid browser fingerprinting
							entirely by selecting Stripe or PayPal as your payment method
							instead.
						</p>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					How We Use Your Information
				</h2>
				<p>We use the collected information for the following purposes:</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>
						<strong>Process donations:</strong> Complete your payment
						transaction and issue confirmation
					</li>
					<li>
						<strong>Donor recognition:</strong> Display your name (if provided)
						on our public donor list
					</li>
					<li>
						<strong>Financial record-keeping:</strong> Maintain accurate
						donation records for accounting and legal compliance
					</li>
					<li>
						<strong>Service improvement:</strong> Analyze usage patterns to
						improve our platform
					</li>
					<li>
						<strong>Security:</strong> Protect against fraud and ensure platform
						security
					</li>
					<li>
						<strong>Legal compliance:</strong> Meet regulatory requirements for
						financial transactions
					</li>
				</ul>
				<div className="mt-4 space-y-2 rounded-lg border border-secondary/20 p-4">
					<h3 className="font-semibold text-lg leading-snug">
						Legal Basis for Processing
					</h3>
					<p>
						Under GDPR, we process your personal information based on the
						following legal grounds:
					</p>
					<ul className="list-outside list-disc space-y-2 pl-6">
						<li>
							<strong>Legitimate interest:</strong> Processing donation
							transactions, maintaining financial records, fraud prevention, and
							platform security (GDPR Article 6(1)(f))
						</li>
						<li>
							<strong>Strictly necessary:</strong> Browser fingerprinting for
							Bitcoin payment encryption is necessary to provide the service you
							explicitly requested (GDPR Article 6(1)(b))
						</li>
						<li>
							<strong>Legal obligation:</strong> Compliance with financial
							record-keeping and anti-money laundering regulations (GDPR Article
							6(1)(c))
						</li>
					</ul>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Third-Party Data Sharing and Processors
				</h2>
				<p>
					We share your information with the following trusted third-party
					service providers who help us operate this platform:
				</p>
				<div className="space-y-4">
					<div className="space-y-2 rounded-lg border border-secondary/20 p-4">
						<h3 className="font-semibold text-lg leading-snug">
							Payment Processors
						</h3>
						<ul className="list-outside list-disc space-y-2 pl-6">
							<li>
								<strong>Stripe</strong> (credit/debit card processing) -{' '}
								<a
									className="text-primary hover:underline"
									href="https://stripe.com/privacy"
									rel="noopener noreferrer"
									target="_blank"
								>
									Privacy Policy
								</a>
							</li>
							<li>
								<strong>PayPal</strong> (PayPal payments) -{' '}
								<a
									className="text-primary hover:underline"
									href="https://www.paypal.com/privacy"
									rel="noopener noreferrer"
									target="_blank"
								>
									Privacy Policy
								</a>
							</li>
						</ul>
						<p className="text-secondary/75 text-sm">
							Note: Bitcoin payments are processed directly on the blockchain
							and do not involve third-party payment processors. Your Bitcoin
							transaction data is publicly visible on the blockchain.
						</p>
					</div>
					<div className="space-y-2 rounded-lg border border-secondary/20 p-4">
						<h3 className="font-semibold text-lg leading-snug">
							Database Hosting
						</h3>
						<ul className="list-outside list-disc space-y-2 pl-6">
							<li>
								<strong>Convex</strong> (database and backend services) -{' '}
								<a
									className="text-primary hover:underline"
									href="https://convex.dev/privacy"
									rel="noopener noreferrer"
									target="_blank"
								>
									Privacy Policy
								</a>
							</li>
						</ul>
					</div>
				</div>
				<p>We may also disclose your personal information to:</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>
						<strong>Legal authorities:</strong> When required by law, subpoena,
						or court order
					</li>
					<li>
						<strong>Affiliated entities:</strong> Other Rise Above The Disorder
						programs and services
					</li>
					<li>
						<strong>Business partners:</strong> Organizations we collaborate
						with to fulfill our mission
					</li>
				</ul>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					How Long We Keep Your Data
				</h2>
				<p>Different types of data are retained for different periods:</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>
						<strong>Bitcoin payment sessions:</strong> 5 minutes after creation
						(automatically deleted from temporary storage)
					</li>
					<li>
						<strong>Pending payment records:</strong> 24 hours for pending
						payments, then marked as expired. Expired records are deleted after
						7 days.
					</li>
					<li>
						<strong>Completed donation records:</strong> Retained indefinitely
						for financial record-keeping, donor recognition, and legal
						compliance. These records contain ONLY: donation amount, payment
						confirmation ID (transaction hash, not personally identifiable),
						display name (optional alias you provide), payment method, and
						timestamp. No email addresses, IP addresses, or other identifying
						information is stored.
					</li>
				</ul>
				<p className="text-secondary/75 text-sm">
					Note: We do not collect or store website analytics data. We do not
					track page views, session duration, or visitor behavior.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">Data Security</h2>
				<p>
					We take the security of your personal information seriously and
					implement commercially reasonable measures to protect it, including:
				</p>
				<ul className="list-outside list-disc space-y-2 pl-6">
					<li>Encryption of sensitive data in transit and at rest</li>
					<li>Secure payment processing through PCI-compliant providers</li>
					<li>
						Browser-based encryption for Bitcoin payment session data (using
						device fingerprinting to generate encryption keys)
					</li>
					<li>Regular security audits and updates</li>
					<li>Access controls limiting who can view your information</li>
				</ul>
				<p className="text-secondary/75 text-sm">
					However, please note that no method of electronic transmission or
					storage is 100% secure. While we strive to protect your personal
					information, we cannot guarantee absolute security.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Privacy-First Design
				</h2>
				<p>
					This platform was designed from the ground up with privacy as a core
					principle. We collect only the absolute minimum data necessary to
					process your donation.
				</p>
				<div className="space-y-4">
					<h3 className="font-semibold text-xl leading-snug">
						What We Don't Collect
					</h3>
					<ul className="list-outside list-disc space-y-2 pl-6">
						<li>No email addresses</li>
						<li>No IP addresses</li>
						<li>No tracking cookies or analytics</li>
						<li>No cross-site tracking or advertising pixels</li>
						<li>No session duration or page view tracking</li>
						<li>No physical addresses or phone numbers</li>
					</ul>
				</div>
				<div className="space-y-4">
					<h3 className="font-semibold text-xl leading-snug">
						Cryptographic Protection
					</h3>
					<p>
						For Bitcoin payments, we protect your payment session data in your
						browser's local storage using industry-standard, audited encryption
						libraries:
					</p>
					<ul className="list-outside list-disc space-y-2 pl-6">
						<li>
							<strong>
								XChaCha20-Poly1305 authenticated encryption (AEAD) - prevents
								tampering and provides confidentiality
							</strong>
						</li>
						<li>
							<strong>SHA-256 cryptographic hashing for key derivation</strong>
						</li>
						<li>
							<strong>
								Bitcoin transaction signing and address generation
							</strong>
						</li>
					</ul>
					<p className="text-secondary/75 text-sm">
						All cryptographic libraries have been independently audited by
						Cure53 for security vulnerabilities. Learn more at{' '}
						<a
							className="text-primary hover:underline"
							href="https://paulmillr.com/noble/"
							rel="noopener noreferrer"
							target="_blank"
						>
							paulmillr.com/noble
						</a>
						.
					</p>
				</div>
				<div className="space-y-4">
					<h3 className="font-semibold text-xl leading-snug">
						Why This Matters
					</h3>
					<p>Even if our database were compromised, an attacker would find:</p>
					<ul className="list-outside list-disc space-y-2 pl-6">
						<li>
							Donation amounts (not sensitive - you chose to display this
							publicly)
						</li>
						<li>
							Payment confirmation IDs (transaction hashes - not reversible to
							personal information)
						</li>
						<li>
							Display names (optional aliases you provided - not real names)
						</li>
						<li>Payment methods (not sensitive)</li>
					</ul>
					<p>
						<strong>
							No personally identifiable information. No way to deanonymize
							donors.
						</strong>
					</p>
				</div>
			</section>

			<section className="space-y-6">
				<h2 className="font-semibold text-2xl leading-tight">
					Your Privacy Rights
				</h2>

				<div className="space-y-4">
					<h3 className="font-semibold text-xl leading-snug">
						GDPR Rights (European Union Residents)
					</h3>
					<p>
						If you are located in the European Union, you have the right to:
					</p>
					<ul className="list-outside list-disc space-y-2 pl-6">
						<li>
							<strong>Access:</strong> Request a copy of the personal data we
							hold about you
						</li>
						<li>
							<strong>Rectification:</strong> Request correction of inaccurate
							or incomplete data
						</li>
						<li>
							<strong>Erasure:</strong> Request deletion of your personal data
							("right to be forgotten")
						</li>
						<li>
							<strong>Data portability:</strong> Receive your data in a
							structured, machine-readable format
						</li>
						<li>
							<strong>Object to processing:</strong> Object to certain types of
							data processing
						</li>
						<li>
							<strong>Withdraw consent:</strong> Withdraw consent for data
							processing at any time
						</li>
						<li>
							<strong>Lodge a complaint:</strong> File a complaint with your
							local data protection authority
						</li>
					</ul>
				</div>

				<div className="space-y-4">
					<h3 className="font-semibold text-xl leading-snug">
						CCPA/CPRA Rights (California Residents)
					</h3>
					<p>If you are a California resident, you have the right to:</p>
					<ul className="list-outside list-disc space-y-2 pl-6">
						<li>
							<strong>Know:</strong> Request disclosure of what personal
							information we collect, use, and share
						</li>
						<li>
							<strong>Delete:</strong> Request deletion of your personal
							information
						</li>
						<li>
							<strong>Opt-out:</strong> Opt out of the "sale" or "sharing" of
							personal information (Note: We do not sell or share personal
							information)
						</li>
						<li>
							<strong>Non-discrimination:</strong> Receive equal service and
							pricing even if you exercise your privacy rights
						</li>
					</ul>
					<div className="mt-4 space-y-2 rounded-lg border border-secondary/20 bg-secondary/5 p-4">
						<h4 className="font-semibold leading-snug">
							Authorized Agent Requests
						</h4>
						<p>
							California residents may designate an authorized agent to submit
							privacy requests on their behalf. To verify an authorized agent
							request, we require:
						</p>
						<ul className="list-outside list-disc space-y-2 pl-6">
							<li>
								Written authorization signed by you (the consumer) authorizing
								the agent to act on your behalf
							</li>
							<li>
								Proof of the agent's identity and authorization to act on your
								behalf
							</li>
						</ul>
						<p>
							Please submit authorized agent requests to{' '}
							<a
								className="text-primary hover:underline"
								href="mailto:Hey@youarerad.org"
							>
								Hey@youarerad.org
							</a>{' '}
							with the subject line "Authorized Agent Privacy Request."
						</p>
					</div>
				</div>

				{/* biome-ignore lint/correctness/useUniqueElementIds: Static anchor ID required for CCPA "Do Not Sell" requirement */}
				<div
					className="space-y-2 rounded-lg border border-primary bg-primary/10 p-4"
					id="do-not-sell"
				>
					<h3 className="font-semibold text-xl leading-snug">
						Do Not Sell My Personal Information
					</h3>
					<p>
						<strong>
							We do not sell your personal information to third parties.
						</strong>{' '}
						We only share data with service providers necessary to operate this
						platform (payment processors, database hosting) and as required by
						law.
					</p>
				</div>

				<div className="space-y-4">
					<h3 className="font-semibold text-xl leading-snug">
						How to Exercise Your Rights
					</h3>
					<p>To exercise any of these privacy rights, please contact us at:</p>
					<ul className="list-outside list-disc space-y-2 pl-6">
						<li>
							<strong>Email:</strong>{' '}
							<a
								className="text-primary hover:underline"
								href="mailto:Hey@youarerad.org"
							>
								Hey@youarerad.org
							</a>
						</li>
						<li>
							<strong>Subject line:</strong> "Privacy Request"
						</li>
					</ul>
					<p>We will respond to your request within:</p>
					<ul className="list-outside list-disc space-y-2 pl-6">
						<li>
							<strong>GDPR requests:</strong> 30 days
						</li>
						<li>
							<strong>CCPA requests:</strong> 45 days
						</li>
					</ul>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Global Privacy Control (GPC)
				</h2>
				<p>
					We honor Global Privacy Control (GPC) signals sent by your browser.
					GPC is a privacy preference signal that allows you to opt out of data
					sharing and certain types of data collection.
				</p>
				<p>
					If you enable GPC in your browser, we will treat it as a request to
					opt out of browser fingerprinting. You can still make donations using
					Stripe or PayPal without any browser fingerprinting.
				</p>
				<p className="text-secondary/75 text-sm">
					To enable GPC, use a browser that supports it (such as Brave, Firefox
					with Privacy Badger, or DuckDuckGo) and enable the GPC setting in your
					browser preferences.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Tax-Deductible Donations
				</h2>
				<p>
					Rise Above The Disorder is a 501(c)(3) nonprofit organization, and
					donations made through this platform may be tax-deductible to the
					extent permitted by law. However, due to our privacy-first design, we
					do not collect email addresses and therefore cannot automatically send
					tax receipts.
				</p>
				<p>
					If you need a tax receipt for your donation, please contact us at{' '}
					<a
						className="text-primary hover:underline"
						href="mailto:Hey@youarerad.org"
					>
						Hey@youarerad.org
					</a>{' '}
					with your payment confirmation information. We will be happy to
					provide the necessary documentation for your tax records.
				</p>
				<p className="text-secondary/75 text-sm">
					Please consult with a tax professional regarding the deductibility of
					your donation based on your specific circumstances.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Anti-Money Laundering Compliance
				</h2>
				<p>
					As a nonprofit organization, we are committed to preventing financial
					crimes and complying with anti-money laundering (AML) regulations.
				</p>
				<p>
					For donations over $5,000, we conduct basic due diligence procedures
					as required by law. This may include verifying the source of funds and
					ensuring compliance with applicable regulations. These procedures help
					protect both donors and the organization from potential financial
					crimes.
				</p>
				<p className="text-secondary/75 text-sm">
					If you have questions about our due diligence procedures, please
					contact us at{' '}
					<a
						className="text-primary hover:underline"
						href="mailto:Hey@youarerad.org"
					>
						Hey@youarerad.org
					</a>
					.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Automated Decision-Making and Profiling
				</h2>
				<p>
					We do not use automated decision-making or profiling. All decisions
					regarding donations and platform access are made with human oversight.
				</p>
				<p>
					Your donation processing is handled through secure payment processors
					(Stripe, PayPal) or blockchain transactions (Bitcoin), but no
					automated systems make decisions about whether to accept or reject
					your donation based on personal characteristics or behavior patterns.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Children's Privacy
				</h2>
				<p>
					This platform is not intended for children under the age of 13. We do
					not knowingly collect personal information from children under 13. If
					you believe we have inadvertently collected information from a child
					under 13, please contact us immediately and we will delete the
					information.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					International Data Transfers
				</h2>
				<p>
					Your personal information may be transferred to and processed in
					countries other than your country of residence. These countries may
					have data protection laws that are different from the laws of your
					country.
				</p>
				<p>
					When we transfer personal information internationally, we ensure
					appropriate safeguards are in place to protect your data in accordance
					with this Privacy Policy and applicable laws.
				</p>
				<div className="mt-4 space-y-2 rounded-lg border border-secondary/20 p-4">
					<h3 className="font-semibold text-lg leading-snug">
						EU to US Data Transfers
					</h3>
					<p>
						Our database hosting provider, Convex, is located in the United
						States and has implemented Standard Contractual Clauses (SCCs)
						approved by the European Commission to ensure GDPR-compliant data
						transfers from the European Union to the United States.
					</p>
					<p>
						These SCCs provide appropriate safeguards for your personal data and
						ensure that your data protection rights are maintained when your
						information is transferred internationally.
					</p>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Changes to This Privacy Policy
				</h2>
				<p>
					We may update this Privacy Policy from time to time to reflect changes
					in our practices, technology, legal requirements, or other factors. We
					will post the updated Privacy Policy on this page with a new "Last
					Updated" date.
				</p>
				<p>
					We encourage you to review this Privacy Policy periodically. Your
					continued use of this platform after changes are posted constitutes
					your acceptance of the updated Privacy Policy.
				</p>
				<p className="text-secondary/75 text-sm">
					Note: As required by California law (CCPA), this Privacy Policy is
					reviewed and updated at least annually.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold text-2xl leading-tight">
					Contact Information
				</h2>
				<p>
					If you have any questions, concerns, or requests regarding this
					Privacy Policy or our data practices, please contact us:
				</p>
				<div className="space-y-2 rounded-lg border border-secondary/20 p-4">
					<p>
						<strong>Rise Above The Disorder</strong>
					</p>
					<p>
						<strong>Privacy Contact:</strong> Jason Docton
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
					Acknowledgment and Consent
				</h2>
				<p>
					By using this crowdfunding platform and making a donation, you
					acknowledge that you have read and understood this Privacy Policy and
					consent to the collection, use, and disclosure of your personal
					information as described herein.
				</p>
			</section>
		</div>
	)
}
