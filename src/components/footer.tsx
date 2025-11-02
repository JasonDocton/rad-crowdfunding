// This is the footer at the bottom of every page.
// It shows links to privacy policy, terms of service, and copyright info.

import { Link } from '@tanstack/react-router'

function Footer() {
	return (
		<footer className="mt-auto border-secondary/20 border-t-2 pt-4 pb-4 text-center">
			<nav aria-label="Legal" className="space-x-2 text-sm">
				<Link className="transition-colors hover:text-white" to="/privacy">
					Privacy Policy
				</Link>
				<span className="text-secondary/30">·</span>
				<Link className="transition-colors hover:text-white" to="/terms">
					Terms of Service
				</Link>
			</nav>
			<p className="mt-2 text-secondary/50 text-xs">
				© 2025 Rise Above The Disorder
			</p>
		</footer>
	)
}

export { Footer }
