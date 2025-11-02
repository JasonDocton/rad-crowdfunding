// This sets up the connection to Stripe so we can accept credit card payments.
// Stripe handles the actual payment processing securely.

import Stripe from 'stripe'
import { env } from '@/env.ts'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
	apiVersion: '2025-09-30.clover',
})

export { stripe }
