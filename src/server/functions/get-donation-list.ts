// This fetches the list of recent donations from the database.
// Called by the server when loading pages to show recent donors.

// This could resonably be done without the server function wrapper around what is otherwise a simple convex query.
// Keeping as is because I wanted to explore Tanstack's server functions, and because mixed with Cloudflare rate-limiting,
// we can prevent spamming the database with too many requests.

import { createServerFn } from '@tanstack/react-start'
import { api } from 'convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'
import { env } from '@/env.ts'

export const getDonationList = createServerFn({ method: 'GET' }).handler(
	async () => {
		const convex = new ConvexHttpClient(env.VITE_CONVEX_URL)
		const result = await convex.query(api.donation.getDonorList, {
			paginationOpts: { numItems: 50, cursor: null },
		})
		return result.page
	}
)
