// This loads and validates all the secret keys and settings when the app starts.
// Context-aware proxy that provides unified access to env vars across Browser/SSR/Convex environments.

/** biome-ignore-all lint/style/noProcessEnv: <This is our main environment configuration file. Process.env shouldn't be used outside of this file.> */
/** biome-ignore-all lint/performance/noNamespaceImport: Zod documentation recommends using namespace here */
import * as z from 'zod/mini'
import {
	clientEnvSchema,
	type Env,
	envSchema,
	formatValidationError,
	frontendSSREnvSchema,
	getRuntimeEnv,
	isConvexEnvironment,
	isValidationError,
	serverEnvSchema,
	validateBitcoinConfig,
} from '@/configs/env-config.ts'

let envCache: Partial<Env> | null = null

function getValidatedEnv(): Partial<Env> {
	if (envCache) {
		return envCache
	}

	const isServer = typeof window === 'undefined'
	const isConvex = isConvexEnvironment()
	const runtimeEnv = getRuntimeEnv()

	try {
		let result: Partial<Env>

		// Step 1: Validate schema based on execution context
		if (!isServer) {
			// Browser: Only validate client vars
			result = z.parse(clientEnvSchema, runtimeEnv)
		} else if (isConvex) {
			// Convex: Validate all server vars (strict)
			result = z.parse(envSchema, runtimeEnv)
		} else {
			// Frontend SSR: Validate client vars + optional server vars
			result = z.parse(frontendSSREnvSchema, runtimeEnv)
		}

		// Step 2: Validate cross-field requirements (server-side only)
		if (isServer) {
			validateBitcoinConfig(result)
		}

		envCache = result
		return result
	} catch (error) {
		if (isValidationError(error)) {
			const isServer = typeof window === 'undefined'
			const isConvex = isConvexEnvironment()

			let context = 'Environment'
			let helpText = ''

			if (!isServer) {
				context = 'Client environment'
				helpText = '\n\nSet missing variables in .env.local'
			} else if (isConvex) {
				context = 'Convex environment'
				helpText =
					'\n\nSet missing variables via:' +
					'\n  - Convex Dashboard: https://dashboard.convex.dev → Settings → Environment Variables' +
					'\n  - CLI: npx convex env set VARIABLE_NAME value'
			} else {
				context = 'Frontend SSR environment'
				helpText = '\n\nSet missing variables in .env.local'
			}

			throw new Error(
				`${context} validation failed:\n${formatValidationError(error.issues)}${helpText}`
			)
		}
		throw error
	}
}

export const env = new Proxy({} as Env & { BITCOIN_MASTER_KEY: string }, {
	get(_target, prop) {
		const validated = getValidatedEnv()

		// Special computed property: return correct Bitcoin key based on network
		if (prop === 'BITCOIN_MASTER_KEY') {
			const network = validated.BITCOIN_NETWORK
			if (network === 'testnet') {
				const key = validated.BITCOIN_MASTER_VPRV
				if (!key) {
					throw new Error(
						'BITCOIN_MASTER_VPRV is required when BITCOIN_NETWORK is testnet'
					)
				}
				return key
			}
			if (network === 'mainnet') {
				const key = validated.BITCOIN_MASTER_ZPRV
				if (!key) {
					throw new Error(
						'BITCOIN_MASTER_ZPRV is required when BITCOIN_NETWORK is mainnet'
					)
				}
				return key
			}
			throw new Error('BITCOIN_NETWORK must be either "mainnet" or "testnet"')
		}

		// Check if prop exists in validated env first
		if (prop in validated) {
			return validated[prop as keyof Env]
		}

		// Only throw error if trying to access a server-only variable that wasn't provided
		if (typeof window !== 'undefined' && prop in serverEnvSchema.shape) {
			throw new Error(
				`Cannot access server environment variable "${String(prop)}" in the browser`
			)
		}

		return undefined
	},
})
