// Default router.tsx used on the Tanstack Start examples, with Convex wrapping the app and query client setup.

import { ConvexQueryClient } from '@convex-dev/react-query'
import { notifyManager, QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexProvider } from 'convex/react'
import { DefaultCatchBoundary } from './components/default-catch-boundary.tsx'
import { NotFound } from './components/not-found.tsx'
import { env } from './env.ts'
import { routeTree } from './routeTree.gen.ts'

export function getRouter() {
	if (typeof document !== 'undefined') {
		notifyManager.setScheduler(window.requestAnimationFrame)
	}

	const convexQueryClient = new ConvexQueryClient(env.VITE_CONVEX_URL)

	const queryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
	})
	convexQueryClient.connect(queryClient)

	const router = createRouter({
		routeTree,
		defaultPreload: 'intent',
		defaultErrorComponent: DefaultCatchBoundary,
		defaultNotFoundComponent: () => <NotFound />,
		context: { queryClient },
		Wrap: ({ children }) => (
			<ConvexProvider client={convexQueryClient.convexClient}>
				{children}
			</ConvexProvider>
		),
		scrollRestoration: true,
	})

	setupRouterSsrQueryIntegration({
		router,
		queryClient,
	})

	return router
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>
	}
}
