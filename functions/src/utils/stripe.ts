import Stripe from 'stripe'
import { defineString } from 'firebase-functions/params'

const stripeSecretKey = defineString('STRIPE_SECRET_KEY')
const stripeWebhookSecret = defineString('STRIPE_WEBHOOK_SECRET')

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(stripeSecretKey.value())
  }
  return _stripe
}

export function getWebhookSecret(): string {
  return stripeWebhookSecret.value()
}

export const PREMIUM_PRICE_ID = 'price_XXXXX' // Set after creating product in Stripe Dashboard
export const PLATFORM_FEE_PERCENT = 12
