import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { sendNotification } from '../utils/notifications'

export const onFriendRequestCreated = onDocumentCreated(
  'users/{userId}/friends/{friendId}',
  async (event) => {
    const snap = event.data
    if (!snap) return

    const data = snap.data()
    if (data.status !== 'pending' || data.direction !== 'received') return

    const userId = event.params.userId
    const friendId = event.params.friendId

    await sendNotification({
      userId,
      type: 'friend_request',
      title: 'Nuova richiesta di amicizia',
      body: 'Qualcuno vuole aggiungerti come amico!',
      data: { fromUserId: friendId }
    })
  }
)
