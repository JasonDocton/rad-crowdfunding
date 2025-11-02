// This is the main layout wrapper for all pages on the site.
// It loads the CSS styles and sets up error handling for the whole app.

/// <reference types="vite/client" />
import type { QueryClient } from '@tanstack/react-query'
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button } from '@/components/button.tsx'
import { DefaultCatchBoundary } from '@/components/default-catch-boundary.tsx'
import { Footer } from '@/components/footer.tsx'
import { createSeo } from '@/components/seo.tsx'
// biome-ignore lint/correctness/useImportExtensions: <Flags because of the ?url TankStack requires.>
import appCss from '@/styles/global.css?url'

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient
}>()({
	head: () => {
		const seo = createSeo({ includeCanonical: false })
		return {
			...seo,
			links: [{ rel: 'stylesheet', href: appCss }, ...seo.links],
		}
	},
	component: RootComponent,
	errorComponent: (props) => {
		return (
			<RootDocument>
				<DefaultCatchBoundary {...props} />
			</RootDocument>
		)
	},
	notFoundComponent: NotFound,
})

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	)
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="mx-auto flex min-h-screen max-w-prose flex-col bg-background px-4 pt-4 text-secondary">
				<header></header>
				{children}
				<Footer />
				<Scripts />
			</body>
		</html>
	)
}

function NotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
			<h1 className="font-bold text-4xl">404</h1>
			<p className="text-xl">Page Not Found</p>
			<Button asChild variant="primary">
				<Link to="/">Go Home</Link>
			</Button>
		</div>
	)
}
