// This catches unexpected errors and shows you an error page.
// You'll mostly see this because of hydration errors or incorrect imports.

import type { ErrorComponentProps } from '@tanstack/react-router'
import {
	ErrorComponent,
	Link,
	rootRouteId,
	useMatch,
	useRouter,
} from '@tanstack/react-router'
import { logger } from '@/utils/logger.ts'
import { Button } from './button.tsx'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
	const router = useRouter()
	const isRoot = useMatch({
		strict: false,
		select: (state) => state.id === rootRouteId,
	})

	// Log error with sanitized message (avoid logging full error objects that might contain sensitive data)
	const errorMessage = error instanceof Error ? error.message : 'Unknown error'
	logger.error('Uncaught error in application:', errorMessage)

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
			<ErrorComponent error={error} />
			<div className="flex flex-wrap items-center gap-4">
				<Button
					onClick={() => {
						router.invalidate()
					}}
					type="button"
					variant="primary"
				>
					Try Again
				</Button>
				{isRoot ? (
					<Button asChild variant="secondary">
						<Link to="/">Home</Link>
					</Button>
				) : (
					<Button asChild variant="secondary">
						<Link
							onClick={(e) => {
								e.preventDefault()
								window.history.back()
							}}
							to="/"
						>
							Go Back
						</Link>
					</Button>
				)}
			</div>
		</div>
	)
}
