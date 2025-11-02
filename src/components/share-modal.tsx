// This is a popup window that lets people share the donation page on social media.
// It shows links to Facebook, Twitter, and Reddit, which you can change in the site-config.

import {
	Description,
	Dialog,
	DialogPanel,
	DialogTitle,
} from '@headlessui/react'
import { useState } from 'react'
import { shareToSocialMedia, siteConfig } from '@/configs/site-config.ts'
import { Button } from './button.tsx'
import { TextInput } from './text-input.tsx'

function ShareModal() {
	const [isOpen, setIsOpen] = useState(false)
	const [isCopied, setIsCopied] = useState(false)
	return (
		<>
			<Button onClick={() => setIsOpen(true)} variant="secondary">
				Share
			</Button>
			<Dialog
				as="div"
				className="relative z-10 focus:outline-none"
				onClose={() => setIsOpen(false)}
				open={isOpen}
			>
				<div className="fixed inset-0 z-10 w-screen overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4">
						<DialogPanel
							className="data-closed:transform-[scale(95%)] w-full max-w-md rounded-xl bg-secondary/5 p-6 backdrop-blur-2xl duration-300 ease-out data-closed:opacity-0"
							transition
						>
							<DialogTitle className="font-medium text-secondary">
								Share The Cause
							</DialogTitle>
							<Description className="text-secondary/50 text-sm">
								Help us spread the word and reach our donation goal.
							</Description>

							<div className="mt-3 flex items-center space-x-4">
								{shareToSocialMedia.map((link) => (
									<a
										aria-label={link.name}
										className="focus-ring group"
										href={link.url}
										key={link.name}
										rel="noopener noreferrer"
										target="_blank"
									>
										<img
											alt=""
											className="hover:invert-100 group-focus:invert-100"
											height={24}
											src={`/${link.icon}.svg`}
											width={24}
										/>
									</a>
								))}
							</div>

							<div className="mt-4 flex items-center gap-4">
								<TextInput
									aria-label="Share URL"
									name="share-url"
									readOnly
									value={siteConfig.siteUrl}
									variant="highlight"
								/>
								<Button
									aria-label={isCopied ? 'Copied!' : 'Copy to clipboard'}
									onCopySuccess={() => setIsCopied(true)}
									size="md"
									textToCopy={siteConfig.siteUrl}
									variant="copy"
								/>
							</div>

							{/* Copy success announcement */}
							{isCopied && (
								<output aria-live="polite" className="sr-only">
									URL copied to clipboard
								</output>
							)}
						</DialogPanel>
					</div>
				</div>
			</Dialog>
		</>
	)
}

export { ShareModal }
