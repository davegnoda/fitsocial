import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import app from '../firebase'
import { updateUserProfile } from './userService'

let messaging: ReturnType<typeof getMessaging> | null = null

async function getMessagingInstance() {
  if (messaging) return messaging
  const supported = await isSupported()
  if (!supported) return null
  messaging = getMessaging(app)
  return messaging
}

export async function requestPushPermission(userId: string): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const m = await getMessagingInstance()
    if (!m) return false

    const token = await getToken(m, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
    })

    if (token) {
      await updateUserProfile(userId, { fcmToken: token } as any)
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function isPushSupported(): Promise<boolean> {
  try {
    return await isSupported()
  } catch {
    return false
  }
}
