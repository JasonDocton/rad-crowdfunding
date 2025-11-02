# Payment Flow Implementation Guide

This document details the implementation patterns for all three payment methods in rad-crowdfunding.

## Overview

All payment methods follow the same high-level flow:
1. User selects amount and payment method
2. Create payment session/order
3. User completes payment (redirect or modal)
4. Confirmation callback creates donation record
5. Redirect to success page

**Key principle**: Donations are ONLY created after confirmed payment to prevent fraud.

## Stripe Payment Flow

### Architecture

```
Client (Form) → Convex Action → Stripe API → Redirect to Stripe Checkout
                                               ↓
                              User completes payment
                                               ↓
                              Webhook → Convex Action → Convex Mutation → Donation Created
                                               ↓
                              Redirect to Success Page
```

### Implementation Details

**Step 1: Create Checkout Session** (`convex/stripe/actions.ts`)

```typescript
export const createCheckoutSession = action({
  args: {
    amount: v.number(),
    metadata: paymentMetadataValidator,
  },
  handler: async (ctx, { amount, metadata }) => {
    // Validate amount
    validateDonationAmount(amount)

    // Initialize Stripe client
    const stripe = getStripe()

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(amount * 100), // Convert to cents
          product_data: { name: 'Donation' },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.SITE_URL}/`,
      metadata: {
        display_name: getDisplayName(metadata, 'Anonymous'),
      },
    })

    return { url: session.url }
  }
})
```

**Step 2: Webhook Handler** (`convex/stripe/webhooks.ts`)

```typescript
export const handleWebhook = action({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, { payload, signature }) => {
    const stripe = getStripe()

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      // Extract data
      const amount = session.amount_total / 100 // Convert from cents
      const payment_id = session.id
      const display_name = session.metadata?.display_name ?? 'Anonymous'

      // Create donation (with deduplication)
      await ctx.runMutation(api.donation.create, {
        amount,
        payment_id,
        display_name,
        payment_method: 'stripe',
      })
    }
  }
})
```

**Step 3: Client Integration** (`src/components/donate/form.tsx`)

```typescript
const handleStripeCheckout = () => {
  startTransition(async () => {
    try {
      const result = await createCheckoutSession({
        amount: selectedAmount,
        metadata: buildMetadata(),
      })

      // Redirect to Stripe
      window.location.href = result.url
    } catch (error) {
      setSubmitError('Failed to start checkout')
    }
  })
}
```

### Key Security Features

1. **Webhook signature verification** - Prevents forged payment confirmations
2. **Amount validation** - Min/max donation limits enforced
3. **Deduplication** - `payment_id` index prevents duplicate donations
4. **Metadata sanitization** - Display names validated before storage

### Common Issues

**Webhook not receiving events:**
- Verify `STRIPE_WEBHOOK_SECRET` matches dashboard
- Check webhook endpoint is publicly accessible
- Verify webhook is configured for `checkout.session.completed` event

**Duplicate donations:**
- Check `by_payment_id` index exists on donations table
- Verify mutation checks for existing payment_id before inserting

---

## PayPal Payment Flow

### Architecture

```
Client (Form) → Convex Action → PayPal API → Return order_id & approval_url
                                               ↓
                              User approves payment
                                               ↓
Client detects return → Convex Action (capture) → PayPal API → Convex Mutation → Donation Created
                                               ↓
                              Redirect to Success Page
```

### Implementation Details

**Step 1: Create Order** (`convex/paypal/actions.ts`)

```typescript
'use node' // Required for PayPal SDK

export const createOrder = action({
  args: {
    amount: v.number(),
    metadata: paymentMetadataValidator,
  },
  handler: async (ctx, { amount, metadata }) => {
    // Validate amount
    validateDonationAmount(amount)

    // Initialize PayPal client
    const { client, ordersController } = getPayPal()

    // Create order
    const response = await ordersController.ordersCreate({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [{
          amount: {
            currencyCode: 'USD',
            value: amount.toFixed(2),
          },
          customId: JSON.stringify({
            display_name: getDisplayName(metadata, 'Anonymous'),
          }),
        }],
        applicationContext: {
          returnUrl: `${env.SITE_URL}/success`,
          cancelUrl: `${env.SITE_URL}/`,
        },
      },
    })

    // Extract approval URL
    const approvalUrl = response.result.links?.find(
      link => link.rel === 'approve'
    )?.href

    return {
      orderId: response.result.id,
      approvalUrl,
    }
  }
})
```

**Step 2: Capture Order** (`convex/paypal/webhooks.ts`)

```typescript
export const captureOrder = action({
  args: {
    orderId: v.string(),
  },
  handler: async (ctx, { orderId }) => {
    const { client, ordersController } = getPayPal()

    // Capture payment
    const response = await ordersController.ordersCapture({
      id: orderId,
    })

    if (response.result.status !== 'COMPLETED') {
      throw new Error('Payment not completed')
    }

    // Extract data
    const capture = response.result.purchaseUnits?.[0]?.payments?.captures?.[0]
    const amount = parseFloat(capture.amount.value)
    const payment_id = capture.id // Use capture_id for deduplication

    // Parse custom metadata
    const customId = response.result.purchaseUnits?.[0]?.customId
    const metadata = customId ? JSON.parse(customId) : {}
    const display_name = metadata.display_name ?? 'Anonymous'

    // Create donation
    await ctx.runMutation(api.donation.create, {
      amount,
      payment_id,
      display_name,
      payment_method: 'paypal',
    })

    return { success: true }
  }
})
```

**Step 3: Client Integration** (`src/components/donate/form.tsx`)

```typescript
const handlePayPalCheckout = () => {
  startTransition(async () => {
    try {
      const result = await createOrder({
        amount: selectedAmount,
        metadata: buildMetadata(),
      })

      // Redirect to PayPal approval
      window.location.href = result.approvalUrl
    } catch (error) {
      setSubmitError('Failed to start checkout')
    }
  })
}

// On return from PayPal (in success page)
useEffect(() => {
  const orderId = searchParams.get('token') // PayPal returns order ID as 'token'

  if (orderId) {
    captureOrder({ orderId })
  }
}, [searchParams])
```

### Key Security Features

1. **Environment detection** - Uses `CONVEX_ENV` to switch sandbox/production
2. **Custom metadata** - Safely stores display name in `customId` field
3. **Capture verification** - Checks order status before creating donation
4. **Deduplication** - Uses `capture_id` as `payment_id` (NOT `order_id`)

### Common Issues

**Wrong environment (sandbox vs production):**
- Verify `CONVEX_ENV` is set correctly
- Check PayPal credentials match environment

**Capture fails with "ORDER_NOT_APPROVED":**
- User cancelled payment or approval expired
- Handle gracefully - show message and allow retry

**Duplicate donations on retry:**
- Always use `capture_id` as `payment_id`, NOT `order_id`
- Order ID reused if user retries, capture ID is unique

---

## Bitcoin Payment Flow

### Architecture

```
Client (Form) → Convex Action → Generate HD Address → Return address + QR code
                     ↓
      Convex Scheduler (background monitoring)
                     ↓
      Poll blockchain every 10 seconds
                     ↓
      Transaction detected → Check confirmations
                     ↓
      3+ confirmations → Convex Mutation → Donation Created
                     ↓
      Client polling detects confirmation → Redirect to Success Page
```

### Implementation Details

**Step 1: Generate Address** (`convex/bitcoin.ts`)

```typescript
'use node' // Required for crypto libraries

export const generateBitcoinAddress = action({
  args: {
    amount: v.number(),
    session_id: v.string(),
    metadata: paymentMetadataValidator,
  },
  handler: async (ctx, { amount, session_id, metadata }) => {
    // Validate inputs
    validateDonationAmount(amount)

    // Rate limit (1 per 5 minutes per session)
    await rateLimiter.limit(ctx, 'generateAddress', { key: session_id })

    // Check for existing session (idempotency)
    const existing = await ctx.runQuery(
      internal.bitcoin_mutations.checkExistingPaymentSession,
      { session_id, amount }
    )

    if (existing) {
      // Return existing address
      return {
        address: existing.address,
        amount_btc: amount / btcPrice,
        amount_usd: amount,
        exchange_rate: btcPrice,
        derivation_index: existing.derivation_index,
      }
    }

    // Get BTC price
    const btcPrice = await getBtcPrice(ctx)
    const amount_btc = amount / btcPrice

    // Atomically increment derivation index
    const derivation_index = await ctx.runMutation(
      internal.bitcoin_mutations.getNextDerivationIndex
    )

    // Derive BIP84 address
    const network = env.BITCOIN_NETWORK === 'testnet' ? 'testnet' : 'mainnet'
    const address = deriveBip84Address(
      env.BITCOIN_MASTER_KEY,
      derivation_index,
      network
    )

    // Create pending payment
    await ctx.runMutation(
      internal.bitcoin_mutations.createPendingBitcoinPayment,
      {
        session_id,
        address,
        expected_amount_btc: amount_btc,
        expected_amount_usd: amount,
        exchange_rate: btcPrice,
        derivation_index,
        metadata,
      }
    )

    // Enqueue background monitoring worker
    await bitcoinMonitoringPool.enqueueAction(
      ctx,
      internal.bitcoin.monitorSinglePayment,
      {
        address,
        expected_amount_btc: amount_btc,
        derivation_index,
      },
      {
        onComplete: internal.bitcoin_mutations.handleConfirmedBitcoinPayment,
      }
    )

    return {
      address,
      amount_btc,
      amount_usd: amount,
      exchange_rate: btcPrice,
      derivation_index,
    }
  }
})
```

**Step 2: Monitor Payment** (`convex/bitcoin.ts`)

```typescript
export const monitorSinglePayment = internalAction({
  args: {
    address: v.string(),
    expected_amount_btc: v.number(),
    derivation_index: v.number(),
  },
  handler: async (ctx, { address, expected_amount_btc, derivation_index }) => {
    // Check if payment still exists (may have been cleaned up)
    const pendingPayment = await ctx.runQuery(
      internal.bitcoin_mutations.getPendingPaymentByAddressInternal,
      { address }
    )

    if (!pendingPayment) {
      // Payment deleted - stop monitoring gracefully
      return {
        address,
        txid: 'canceled',
        amount_btc: 0,
        confirmations: 0,
      }
    }

    // Check if already confirmed
    if (pendingPayment.status === 'confirmed') {
      return {
        address,
        txid: pendingPayment.txid ?? 'unknown',
        amount_btc: expected_amount_btc,
        confirmations: bitcoinConfirmations[network],
      }
    }

    // Check if expired
    if (pendingPayment.status === 'expired') {
      return {
        address,
        txid: 'expired',
        amount_btc: 0,
        confirmations: 0,
      }
    }

    // Check blockchain for payment
    const result = await checkBlockchainPayment(address)

    if (!result.paid) {
      // Not paid yet - throw error to trigger retry
      throw new Error('Payment not confirmed yet')
    }

    // Validate confirmations
    const network = env.BITCOIN_NETWORK === 'testnet' ? 'testnet' : 'mainnet'
    const requiredConfirmations = bitcoinConfirmations[network] // 3 mainnet, 6 testnet

    if (!result.confirmations || result.confirmations < requiredConfirmations) {
      throw new Error(`Waiting for confirmations: ${result.confirmations}/${requiredConfirmations}`)
    }

    // Payment confirmed!
    return {
      address,
      txid: result.tx_hash ?? 'unknown',
      amount_btc: result.amount_btc ?? expected_amount_btc,
      confirmations: result.confirmations,
    }
  }
})
```

**Step 3: Completion Callback** (`convex/bitcoin/mutations.ts`)

```typescript
export const handleConfirmedBitcoinPayment = internalMutation({
  args: {
    workId: v.string(),
    context: v.any(),
    result: workpoolResultValidator,
  },
  handler: async (ctx, { result }) => {
    if (result.kind !== 'success') {
      return null
    }

    const { address, txid, amount_btc } = result.returnValue

    // Handle early returns (canceled/expired)
    if (txid === 'canceled' || txid === 'expired') {
      return null
    }

    // Get pending payment for metadata
    const pending = await ctx.db
      .query('pending_bitcoin_payments')
      .withIndex('by_address', q => q.eq('address', address))
      .first()

    if (!pending) return null

    // Calculate final USD amount
    const usd_amount = amount_btc * pending.exchange_rate
    validateDonationAmount(usd_amount)

    const display_name = getDisplayName(pending.metadata, 'Anonymous')

    // Check for duplicate
    const existing = await ctx.db
      .query('donations')
      .withIndex('by_payment_id', q => q.eq('payment_id', address))
      .first()

    if (!existing) {
      // Create donation
      await ctx.db.insert('donations', {
        amount: usd_amount,
        display_name,
        payment_id: address, // Bitcoin uses address as payment_id
        payment_method: 'bitcoin',
      })
    }

    // Mark pending payment as confirmed
    await ctx.db.patch(pending._id, {
      status: 'confirmed',
      txid,
      detected_at: Date.now(),
    })

    return pending._id
  }
})
```

**Step 4: Client Polling** (`src/components/donate/bitcoinPaymentModal.tsx`)

```typescript
// Poll for payment every 10 seconds
useEffect(() => {
  if (!paymentData?.address) return

  const interval = setInterval(async () => {
    try {
      const result = await checkBitcoinPayment({
        address: paymentData.address,
        session_id: sessionId,
        expected_btc_amount: paymentData.amount_btc,
        metadata: buildMetadata(),
      })

      if (result.paid) {
        // Payment confirmed - redirect to success
        window.location.href = `/success?address=${paymentData.address}`
      } else if (result.pending) {
        // Update confirmation count
        setConfirmations(result.confirmations ?? 0)
      }
    } catch (error) {
      console.error('Payment check failed:', error)
    }
  }, 10_000) // 10 seconds

  return () => clearInterval(interval)
}, [paymentData])
```

### Key Security Features

1. **Rate limiting** - 1 address per 5 minutes per session
2. **Session ownership validation** - Can only check addresses you created
3. **Confirmation requirements** - 3 mainnet, 6 testnet (prevents double-spend)
4. **Amount validation** - Rejects underpayments
5. **Deduplication** - Address used as `payment_id`
6. **Workpool auto-stop** - Workers gracefully exit when payment expired/confirmed

### Bitcoin-Specific Patterns

**Atomic Derivation Counter:**
```typescript
// Prevents address reuse with concurrent users
export const getNextDerivationIndex = internalMutation({
  handler: async (ctx) => {
    const config = await ctx.db
      .query('bitcoin_config')
      .withIndex('by_key', q => q.eq('key', 'next_derivation_index'))
      .first()

    const currentIndex = config.value
    await ctx.db.patch(config._id, { value: currentIndex + 1 })
    return currentIndex
  }
})
```

**Idempotency (Amount Changes):**
```typescript
// User changes $100 → $50
// Same address shown, QR updates with new BTC amount
// No wasted derivation indices
const existing = await ctx.runQuery(
  internal.bitcoin_mutations.checkExistingPaymentSession,
  { session_id, amount }
)

if (existing) {
  return { address: existing.address, ... }
}
```

### Common Issues

**Payment not detected:**
- Check blockchain explorer for transaction
- Verify amount sent matches expected (within 0.00001 BTC tolerance)
- Wait for polling interval (10 seconds)

**Address doesn't match wallet:**
- Run `verify-wallet-compatibility.ts` script
- See `BITCOIN_SETUP.md` for troubleshooting

---

## Success Page Implementation

All payment methods redirect to `/success` with different query parameters:

**Stripe:** `?session_id=cs_test_...`
**PayPal:** `?token=ORDER_ID` (requires capture)
**Bitcoin:** `?payment_id=bc1q...` (address used as payment_id)

The success page:
1. Validates query parameters
2. Maps payment IDs (PayPal: order_id → capture_id)
3. Polls for donation record (handles race conditions with reactive queries)
4. Displays confirmation with payment details
5. Shows updated goal tracker and donation table

### Bitcoin-Specific Success Page Behavior

**Redirect Flow**:
1. Modal detects `status === 'paid'` (6 confirmations reached)
2. Checks `secureStorage` for `bitcoin_redirected_{address}` flag
3. If flag NOT set: sets flag + shows "Payment confirmed!" for 2 seconds → redirects
4. If flag already set: shows confirmation without redirecting (user reopened modal)

**Success Page Actions**:
1. Receives `?payment_id={address}` from redirect
2. Queries Convex for donation using address as payment_id
3. Displays Bitcoin payment confirmation
4. **Clears** `bitcoin_redirected_{address}` flag from secureStorage
5. User can now make another donation and be redirected again

**Prevents Redirect Loop**:
- `wasAlreadyPaidOnMount` ref: tracks if payment confirmed before modal opened
- Only redirects if payment confirms DURING active modal session
- Not if user navigates back and reopens modal later

See implementation in:
- Modal redirect: `src/components/donate/bitcoin-modal.tsx:245-285`
- Success page: `src/routes/success.tsx:104-111`

---

## Common Patterns Across All Methods

### 1. Deduplication

```typescript
// Check before inserting
const existing = await ctx.db
  .query('donations')
  .withIndex('by_payment_id', q => q.eq('payment_id', paymentId))
  .first()

if (existing) {
  return // Already processed
}

await ctx.db.insert('donations', { ... })
```

### 2. Amount Validation

```typescript
export function validateDonationAmount(amount: number) {
  if (amount < 10) {
    throw new Error('Minimum donation: $10')
  }
  if (amount > 10000) {
    throw new Error('Maximum donation: $10,000')
  }
}
```

### 3. Display Name Handling

```typescript
export function getDisplayName(
  metadata: PaymentMetadata | null | undefined,
  fallback: string
): string {
  if (!metadata?.use_player_name || !metadata.player_name) {
    return fallback
  }
  return metadata.player_name
}
```

### 4. Error Handling

```typescript
try {
  const result = await createCheckout(...)
  window.location.href = result.url
} catch (error) {
  logger.error('Checkout error:', error)
  setSubmitError('Failed to start checkout. Please try again.')
}
```

---

## Testing Checklist

**Stripe:**
- [ ] Test card: `4242 4242 4242 4242`
- [ ] Webhook receives events
- [ ] Donation created with correct amount
- [ ] Success page displays confirmation

**PayPal:**
- [ ] Sandbox account works
- [ ] Order approval flow
- [ ] Capture creates donation
- [ ] Success page displays confirmation

**Bitcoin:**
- [ ] Address generation
- [ ] QR code displays correctly
- [ ] Blockchain polling detects payment
- [ ] Confirmation count increments
- [ ] Donation created after confirmations
- [ ] Workpool worker stops after confirmation

**All Methods:**
- [ ] Deduplication prevents duplicates
- [ ] Amount validation enforced
- [ ] Display names stored correctly
- [ ] Goal tracker updates in real-time

---

## Implementation Notes

### Bitcoin Monitoring - Scheduler Implementation (October 28, 2025)

**Current Implementation**: ✅ Scheduler-based recursive polling

**Pattern**: `ctx.scheduler.runAfter()` for continuous blockchain monitoring

**How It Works**:
1. User generates Bitcoin address → `generateBitcoinAddress` action
2. Address generation schedules first monitoring check (10 seconds)
3. `monitorSinglePayment` action runs:
   - Checks blockchain for payment
   - If not confirmed: schedules next check in 10 seconds (recursive)
   - If confirmed: creates donation and stops (no next check)
   - If expired: marks as expired and stops
4. Natural termination via clean exits (no error throwing)

**Benefits Over Workpool Approach**:
- ✅ No console spam (normal control flow, not exceptions)
- ✅ Clean logs (only logs important events: tx detected, confirmed)
- ✅ Simple cancellation (just don't schedule next check)
- ✅ No artificial retry limits (built-in 24-hour timeout)
- ✅ Better developer experience

**Key Implementation Details**:
- Scheduled job IDs stored in `pending_bitcoin_payments.scheduled_job_id`
- API failures logged at INFO level (development-only)
- Only critical events logged at WARN/ERROR level
- Multiple concurrent donations fully supported

**Previous Approach (Workpool)**:
- Deprecated October 28, 2025
- Functionally working but poor DX (error spam)
- Lessons documented in `bitcoin.md`

**Pattern Recognition Lesson**:
> Workpool/Workflow/Retrier assume "retry on failure" but Bitcoin monitoring needs "poll until success"

**When to Use Each**:
- **Scheduler**: Continuous polling, long-running monitoring, recurring jobs
- **Workpool**: Discrete tasks (emails), one-time operations, clear success/failure states
