// This page shows when someone visits a URL that doesn't exist.
// It displays a 404 error and buttons to go back or return home.

import { Link } from '@tanstack/react-router'
import { Button } from './button.tsx'

export function NotFound({ children }: { children?: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
			<h1 className="font-bold text-4xl">404</h1>
			<p className="text-xl">
				{children || 'The page you are looking for does not exist.'}
			</p>
			<div className="flex flex-wrap items-center gap-4">
				<Button onClick={() => window.history.back()} variant="primary">
					Go Back
				</Button>
				<Button asChild variant="secondary">
					<Link to="/">Home</Link>
				</Button>
			</div>
		</div>
	)
}
