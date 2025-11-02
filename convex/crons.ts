// This schedules automatic cleanup tasks that run every hour.
// It removes old expired payments to keep the database tidy.

import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

// Scheduled cron jobs for maintenance tasks
// Convex requires this file to default export the crons configuration,
// so we disable the noDefaultExport rule for this file.
const crons = cronJobs()

// Clean up pending Bitcoin payment records
// Runs every hour to:
// - Mark pending payments as 'expired' after 24 hours
// - Delete confirmed payments (donation already recorded in donations table)
// - Delete old expired payments after 7 days
// This prevents database bloat while maintaining audit trail in donations table.
// Schedule: Every hour at :30 minutes
crons.hourly(
	'cleanup-expired-pending-payments',
	{ minuteUTC: 30 }, // Run at :30 past each hour
	internal.bitcoin.mutations.cleanupExpiredPendingPayments
)

// Clean up old PayPal payment ID mappings
// Runs every hour to:
// - Delete order ID → capture ID mappings older than 7 days
// These mappings are only needed for success page lookup after payment.
// Users typically visit success page within minutes, so 7 days is generous.
// Schedule: Every hour at :45 minutes (offset from Bitcoin cleanup)
crons.hourly(
	'cleanup-old-payment-id-mappings',
	{ minuteUTC: 45 }, // Run at :45 past each hour
	internal.paypal.mutations.cleanupOldPaymentIdMappings
)

// biome-ignore lint/style/noDefaultExport: Convex requires default export for crons configuration
export default crons
