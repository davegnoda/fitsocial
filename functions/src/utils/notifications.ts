import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

const db = getFirestore()

interface NotificationPayload {
  userId: string
  type: 'friend_request' | 'challenge_invite' | 'achievement' | 'reaction' | 'system' | 'duel' | 'payout'
  title: string
  body: string
  data?: Record<string, string>
}

/** Save in-app notification + send push if token exists */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const { userId, type, title, body, data } = payload

  // Save in-app notification
  await db.collection('users').doc(userId).collection('notifications').add({
    type, title, body, read: false, createdAt: Date.now(), data: data ?? {}
  })

  // Try push notification
  try {
    const userDoc = await db.collection('users').doc(userId).get()
    const fcmToken = userDoc.data()?.fcmToken
    if (fcmToken) {
      await getMessaging().send({
        token: fcmToken,
        notification: { title, body },
        data: data ?? {}
      })
    }
  } catch {
    // Push failure is non-critical
  }
}
