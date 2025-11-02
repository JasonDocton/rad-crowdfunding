// PayPal webhook event structure (https://developer.paypal.com/docs/api/webhooks/v1/)
export type PayPalWebhookEvent = {
	readonly event_type: string
	readonly resource: {
		readonly id?: string
		readonly custom_id?: string
		readonly amount?: {
			readonly value?: string
			readonly currency_code?: string
		}
		readonly purchase_units?: ReadonlyArray<{
			readonly custom_id?: string
			readonly amount?: {
				readonly value?: string
				readonly currency_code?: string
			}
		}>
		readonly supplementary_data?: {
			readonly related_ids?: {
				readonly order_id?: string
			}
		}
	}
}

// PayPal webhook verification headers - required for signature verification
export type PayPalWebhookHeaders = {
	readonly transmission_id: string
	readonly transmission_time: string
	readonly cert_url: string
	readonly auth_algo: string
	readonly transmission_sig: string
}
