// This checks that all the secret keys and settings are set up correctly before the app starts.
// Context-aware validation system that detects Browser/SSR/Convex execution and validates only required vars.

/** biome-ignore-all lint/style/noProcessEnv: <This is our main environment configuration file. Process.env shouldn't be used outside of this file.> */
/** biome-ignore-all lint/performance/noNamespaceImport: Zod documentation recommends using namespace here */
import * as z from 'zod/mini'

/**
 * Detects if code is running inside Convex serverless environment.
 * Convex always sets CONVEX_CLOUD_URL system variable.
 *
 * @returns true if running in Convex, false otherwise
 */
export function isConvexEnvironment(): boolean {
	return typeof process !== 'undefined' && !!process.env.CONVEX_CLOUD_URL
}

export const sharedEnvSchema = z.object({
	NODE_ENV: z.optional(
		z.enum(['development', 'production', 'test'], 'development')
	),
})

// Client-only environment variables (browser-safe)
export const clientEnvSchema = z.object({
	VITE_CONVEX_URL: z.string().check(z.url()),
	...sharedEnvSchema.shape,
})

// Server-only environment variables (secrets, server config)
export const serverEnvSchema = z.object({
	...sharedEnvSchema.shape,

	// Convex doesn't auto-set NODE_ENV, so we use CONVEX_ENV explicitly
	CONVEX_ENV: z.enum(['development', 'production']),

	STRIPE_SECRET_KEY: z.string().check(
		z.refine((val) => val.startsWith('sk_'), {
			message: 'Must be a valid Stripe key starting with sk_',
		})
	),
	STRIPE_WEBHOOK_SECRET: z.string().check(
		z.refine((val) => val.startsWith('whsec_'), {
			message: 'Must be a valid Stripe key starting with whsec_',
		})
	),

	PAYPAL_CLIENT_ID: z.string().check(
		z.refine((val) => val.length > 0, {
			message: 'PayPal Client ID is required',
		})
	),
	PAYPAL_CLIENT_SECRET: z.string().check(
		z.refine((val) => val.length > 0, {
			message: 'PayPal Client Secret is required',
		})
	),
	PAYPAL_WEBHOOK_ID: z.string().check(
		z.refine((val) => val.length > 0, {
			message: 'PayPal Webhook ID is required',
		})
	),

	BITCOIN_MASTER_VPRV: z.optional(
		z.string().check(
			z.refine((val) => val.startsWith('vprv'), {
				message: 'Must be a valid BIP84 testnet extended private key (vprv)',
			})
		)
	),
	BITCOIN_MASTER_ZPRV: z.optional(
		z.string().check(
			z.refine((val) => val.startsWith('zprv'), {
				message: 'Must be a valid BIP84 mainnet extended private key (zprv)',
			})
		)
	),
	BITCOIN_NETWORK: z.enum(['mainnet', 'testnet']),
	SITE_URL: z.string().check(z.url()),
})

// Frontend SSR schema: Client vars + optional server vars
// Used when code runs in TanStack Start SSR (not Convex)
// Backend vars are optional because they may not be set in .env.local
export const frontendSSREnvSchema = z.object({
	...clientEnvSchema.shape, // Includes sharedEnvSchema
	// Server vars are all optional for frontend SSR
	CONVEX_ENV: z.optional(z.enum(['development', 'production'])),
	STRIPE_SECRET_KEY: z.optional(z.string()),
	STRIPE_WEBHOOK_SECRET: z.optional(z.string()),
	PAYPAL_CLIENT_ID: z.optional(z.string()),
	PAYPAL_CLIENT_SECRET: z.optional(z.string()),
	PAYPAL_WEBHOOK_ID: z.optional(z.string()),
	BITCOIN_MASTER_VPRV: z.optional(z.string()),
	BITCOIN_MASTER_ZPRV: z.optional(z.string()),
	BITCOIN_NETWORK: z.optional(z.enum(['mainnet', 'testnet'])),
	SITE_URL: z.optional(z.string()),
})

// Combined schema for server-side (client + server vars)
// Used only in Convex environment with strict validation
export const envSchema = z.object({
	...clientEnvSchema.shape,
	...serverEnvSchema.shape,
})

interface ValidationIssue {
	readonly path: readonly string[]
	readonly message: string
}

export function formatValidationError(issues: ValidationIssue[]): string {
	return issues
		.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
		.join('\n')
}

export function isValidationError(
	error: unknown
): error is { issues: ValidationIssue[] } {
	return (
		error !== null &&
		typeof error === 'object' &&
		'issues' in error &&
		Array.isArray((error as { issues: unknown }).issues)
	)
}

export type SharedEnv = z.infer<typeof sharedEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>
export type FrontendSSREnv = z.infer<typeof frontendSSREnvSchema>
export type Env = z.infer<typeof envSchema>

/**
 * Returns environment variables based on execution context.
 * Detects three contexts: Browser, Frontend SSR, or Convex.
 */
export function getRuntimeEnv(): Partial<Env> {
	const isServer = typeof window === 'undefined'
	const isConvex = isConvexEnvironment()

	// Browser context: Only client vars from import.meta.env
	if (!isServer) {
		return {
			VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
			NODE_ENV: import.meta.env.MODE as
				| 'development'
				| 'production'
				| 'test'
				| undefined,
		}
	}

	// Server context: Either Frontend SSR or Convex
	const isDevelopment = process.env.NODE_ENV === 'development'

	// Convex context: Read all vars from Convex's process.env
	if (isConvex) {
		return {
			VITE_CONVEX_URL: process.env.VITE_CONVEX_URL,
			CONVEX_ENV: process.env.CONVEX_ENV as
				| 'development'
				| 'production'
				| undefined,
			STRIPE_SECRET_KEY: isDevelopment
				? process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
				: process.env.STRIPE_SECRET_KEY,
			STRIPE_WEBHOOK_SECRET: isDevelopment
				? process.env.STRIPE_WEBHOOK_SECRET_TEST ||
					process.env.STRIPE_WEBHOOK_SECRET
				: process.env.STRIPE_WEBHOOK_SECRET,
			PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
			PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
			PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
			BITCOIN_MASTER_VPRV: process.env.BITCOIN_MASTER_VPRV,
			BITCOIN_MASTER_ZPRV: process.env.BITCOIN_MASTER_ZPRV,
			BITCOIN_NETWORK: (isDevelopment
				? (process.env.BITCOIN_NETWORK as 'mainnet' | 'testnet' | undefined) ||
					'testnet'
				: (process.env.BITCOIN_NETWORK as 'mainnet' | 'testnet' | undefined)) as
				| 'mainnet'
				| 'testnet'
				| undefined,
			NODE_ENV: process.env.NODE_ENV as
				| 'development'
				| 'production'
				| 'test'
				| undefined,
			SITE_URL:
				process.env.SITE_URL ||
				(isDevelopment ? 'http://localhost:3000' : undefined),
		}
	}

	// Frontend SSR context: Client vars + optional server vars from .env.local
	// Detect if running in Vite SSR (has import.meta.env) vs plain Node script
	const isViteSSR = typeof import.meta.env !== 'undefined'
	return {
		VITE_CONVEX_URL: isViteSSR
			? import.meta.env.VITE_CONVEX_URL
			: process.env.VITE_CONVEX_URL,
		NODE_ENV: process.env.NODE_ENV as
			| 'development'
			| 'production'
			| 'test'
			| undefined,
		// Optional server vars (may not be set in .env.local)
		CONVEX_ENV: process.env.CONVEX_ENV as
			| 'development'
			| 'production'
			| undefined,
		SITE_URL:
			process.env.SITE_URL ||
			(isDevelopment ? 'http://localhost:3000' : undefined),
		// Payment processor vars are optional in frontend SSR
		STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
		STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
		PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
		PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
		PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
		BITCOIN_MASTER_VPRV: process.env.BITCOIN_MASTER_VPRV,
		BITCOIN_MASTER_ZPRV: process.env.BITCOIN_MASTER_ZPRV,
		BITCOIN_NETWORK: process.env.BITCOIN_NETWORK as
			| 'mainnet'
			| 'testnet'
			| undefined,
	}
}

/**
 * Validates Bitcoin configuration cross-field requirements.
 * Called after schema validation to ensure network/key consistency.
 *
 * @throws {Error} If Bitcoin network is set but corresponding key is missing
 */
export function validateBitcoinConfig(env: Partial<Env>): void {
	if (!env.BITCOIN_NETWORK) {
		return // Bitcoin not configured, skip validation
	}

	if (env.BITCOIN_NETWORK === 'testnet' && !env.BITCOIN_MASTER_VPRV) {
		throw new Error(
			'Environment validation failed:\n' +
				'  - BITCOIN_MASTER_VPRV: Required when BITCOIN_NETWORK is testnet'
		)
	}

	if (env.BITCOIN_NETWORK === 'mainnet' && !env.BITCOIN_MASTER_ZPRV) {
		throw new Error(
			'Environment validation failed:\n' +
				'  - BITCOIN_MASTER_ZPRV: Required when BITCOIN_NETWORK is mainnet'
		)
	}
}
