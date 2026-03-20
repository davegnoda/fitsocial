import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Triggers — will be uncommented as files are created
export { onActivityCreated } from './triggers/onActivityCreated'
export { onChallengeEnd } from './triggers/onChallengeEnd'
export { onFriendRequestCreated } from './triggers/onFriendRequest'
export { onWeekEnd } from './triggers/onWeekEnd'

// API
export { createCheckoutSession, stripeWebhook, createConnectAccount } from './api/payments'
export { joinPaidChallenge, createPaidChallenge } from './api/challenges'
export { healthOAuthCallback, syncHealthData } from './api/health'
export { createDuel, acceptDuel } from './api/duels'
