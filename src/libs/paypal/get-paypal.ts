// This sets up the connection to PayPal so we can accept PayPal payments.
// It handles both testing mode and real payment mode.

import {
	Client,
	Environment,
	OrdersController,
} from '@paypal/paypal-server-sdk'
import { env } from '@/env.ts'

let _client: Client | null = null
let _ordersController: OrdersController | null = null

// Determine PayPal environment based on CONVEX_ENV
export function isPayPalProduction(): boolean {
	return env.CONVEX_ENV === 'production'
}

// Get PayPal API base URL based on environment
export function getPayPalApiUrl(): string {
	return isPayPalProduction()
		? 'https://api-m.paypal.com'
		: 'https://api-m.sandbox.paypal.com'
}

function getClient(): Client {
	if (!_client) {
		_client = new Client({
			environment: isPayPalProduction()
				? Environment.Production
				: Environment.Sandbox,
			clientCredentialsAuthCredentials: {
				oAuthClientId: env.PAYPAL_CLIENT_ID,
				oAuthClientSecret: env.PAYPAL_CLIENT_SECRET,
			},
		})
	}
	return _client
}

export const ordersController = new Proxy({} as OrdersController, {
	get(_target, prop) {
		if (!_ordersController) {
			_ordersController = new OrdersController(getClient())
		}
		return _ordersController[prop as keyof OrdersController]
	},
})
