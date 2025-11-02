// TanStack Start Server Entry Point
// This file handles all SSR-related work, server routes, and server function requests.
// It wraps the default handler to inject security headers into all HTTP responses.

import handler from '@tanstack/react-start/server-entry'
import { env } from './env.ts'

// Add security headers to all HTTP responses
function addSecurityHeaders(response: Response): void {
	// Content Security Policy - allows Stripe, PayPal, Convex, and various Bitcoin related apis we use checking transactions and exchange prices.
	//
	// Note: 'unsafe-inline' is required for TanStack Start's dynamic inline hydration scripts.
	//
	// XSS Risk Assessment: LOW
	// - React's automatic escaping protects all user data rendering
	// - No innerHTML, dangerouslySetInnerHTML, or eval() in codebase
	// - All payments processed off-site (Stripe, PayPal) or system-generated (Bitcoin)
	// - Only user input: donation amount (numeric) and player name (50 char max, validated)
	// - Strong defense-in-depth: input validation, TypeScript types, server-authoritative data
	//
	// Nonce Support Status: PR #5522 merged but not yet functional in TanStack Start v1.134.0
	// TODO: Implement nonce-based CSP when TanStack Start properly supports router.options.ssr.nonce
	// Tracking: https://github.com/TanStack/router/pull/5522
	const cspDirectives = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://www.paypal.com",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: https:",
		"font-src 'self' data:",
		"connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://api.coinbase.com https://blockstream.info https://mempool.space https://js.stripe.com https://www.paypal.com https://api.kraken.com https://api.binance.com",
		'frame-src https://js.stripe.com https://www.paypal.com',
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	]

	// Only upgrade to HTTPS in production (breaks Safari localhost in development - I use Safari for their responsive design mode)
	if (env.NODE_ENV === 'production') {
		cspDirectives.push('upgrade-insecure-requests')
	}

	response.headers.set('Content-Security-Policy', cspDirectives.join('; '))

	// Security headers - defense in depth
	response.headers.set('X-Frame-Options', 'DENY')
	response.headers.set('X-Content-Type-Options', 'nosniff')
	response.headers.set('X-XSS-Protection', '1; mode=block')
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
	response.headers.set(
		'Permissions-Policy',
		'geolocation=(), microphone=(), camera=()'
	)

	// Cross-Origin headers for modern browsers
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
	response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
}

// biome-ignore lint/style/noDefaultExport: Required for TanStack Start server entry point
export default {
	async fetch(request: Request): Promise<Response> {
		const response = await handler.fetch(request)
		addSecurityHeaders(response)
		return response
	},
}
