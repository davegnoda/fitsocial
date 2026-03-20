import { collection, getDocs, query, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../firebase'
import type { FeedEntry } from '../types'

export async function getFeed(n = 30): Promise<FeedEntry[]> {
  const q = query(collection(db, 'feed'), orderBy('createdAt', 'desc'), limit(n))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, reactions: {}, ...d.data() } as FeedEntry))
}

export async function toggleReaction(entryId: string, userId: string, emoji: string, hasReacted: boolean): Promise<void> {
  await updateDoc(doc(db, 'feed', entryId), {
    [`reactions.${emoji}`]: hasReacted ? arrayRemove(userId) : arrayUnion(userId),
  })
}
