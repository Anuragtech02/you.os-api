import type Stripe from 'stripe'
import { syncSubscriptionFromStripe, recordPayment } from './index'
import { db } from '../../db/client'
import { subscriptions } from '../../db/schema/billing'
import { users } from '../../db/schema/users'
import { eq } from 'drizzle-orm'

/**
 * Handle checkout.session.completed event
 * This is called when a customer completes the checkout flow
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log('Checkout completed:', session.id)

  // The subscription is created automatically by Stripe
  // We'll handle it in the subscription.created webhook
  // This is just for logging/tracking
}

/**
 * Handle customer.subscription.created event
 */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('Subscription created:', subscription.id)

  await syncSubscriptionFromStripe({
    id: subscription.id,
    customer: subscription.customer as string,
    status: subscription.status,
    items: subscription.items,
    current_period_start: (subscription as unknown as { current_period_start: number }).current_period_start,
    current_period_end: (subscription as unknown as { current_period_end: number }).current_period_end,
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_start: (subscription as unknown as { trial_start?: number | null }).trial_start,
    trial_end: (subscription as unknown as { trial_end?: number | null }).trial_end,
    metadata: subscription.metadata as { userId?: string; planId?: string },
  })
}

/**
 * Handle customer.subscription.updated event
 * This includes plan changes, cancellations, renewals
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('Subscription updated:', subscription.id)

  await syncSubscriptionFromStripe({
    id: subscription.id,
    customer: subscription.customer as string,
    status: subscription.status,
    items: subscription.items,
    current_period_start: (subscription as unknown as { current_period_start: number }).current_period_start,
    current_period_end: (subscription as unknown as { current_period_end: number }).current_period_end,
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_start: (subscription as unknown as { trial_start?: number | null }).trial_start,
    trial_end: (subscription as unknown as { trial_end?: number | null }).trial_end,
    metadata: subscription.metadata as { userId?: string; planId?: string },
  })
}

/**
 * Handle customer.subscription.deleted event
 * Subscription has been canceled and period has ended
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('Subscription deleted:', subscription.id)

  // Update subscription to canceled status
  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
}

/**
 * Handle invoice.paid event
 * Successful payment for subscription
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  console.log('Invoice paid:', invoice.id)

  const paymentIntent = (invoice as unknown as { payment_intent?: string | { id: string } | null }).payment_intent

  await recordPayment({
    id: invoice.id,
    customer: invoice.customer as string,
    payment_intent: paymentIntent,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status || 'paid',
    hosted_invoice_url: invoice.hosted_invoice_url,
  })
}

/**
 * Handle invoice.payment_failed event
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log('Invoice payment failed:', invoice.id)

  const paymentIntent = (invoice as unknown as { payment_intent?: string | { id: string } | null }).payment_intent

  await recordPayment({
    id: invoice.id,
    customer: invoice.customer as string,
    payment_intent: paymentIntent,
    amount_paid: 0,
    currency: invoice.currency,
    status: 'failed',
    hosted_invoice_url: invoice.hosted_invoice_url,
  })

  // The subscription status will be updated via subscription.updated webhook
}

/**
 * Handle customer.updated event
 */
export async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  console.log('Customer updated:', customer.id)

  // Update user email if changed
  if (customer.email) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customer.id))
      .limit(1)

    if (user && user.email !== customer.email) {
      // Note: We don't automatically update email as it's linked to Supabase auth
      console.log(`Customer email changed: ${user.email} -> ${customer.email}`)
    }
  }
}

/**
 * Main webhook event router
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
      break

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break

    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice)
      break

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
      break

    case 'customer.updated':
      await handleCustomerUpdated(event.data.object as Stripe.Customer)
      break

    default:
      console.log(`Unhandled webhook event type: ${event.type}`)
  }
}
