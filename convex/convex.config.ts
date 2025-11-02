// Used to configure Convex apps with Convex Components. Learn more at https://docs.convex.dev/concepts/convex-components
// For our use case, most of the components were overkill, but I wanted to experiment with them.

import actionCache from '@convex-dev/action-cache/convex.config'
import rateLimiter from '@convex-dev/rate-limiter/convex.config'
import { defineApp } from 'convex/server'

const app = defineApp()
app.use(rateLimiter) // Used for rate limiting in Bitcoin, PayPal, and Stripe actions
app.use(actionCache) // Used for BTC exchange rate caching in bitcoin/exchange.ts

// biome-ignore lint/style/noDefaultExport: Convex requires default export for config
export default app
