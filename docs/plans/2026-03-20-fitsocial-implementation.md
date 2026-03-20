# FitSocial Phase 1 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add server-side security (Cloud Functions), Stripe payments (premium + pool prize), smartwatch integration, and social gamification (duels, streak battles, weekly leagues).

**Architecture:** Firebase-native. Cloud Functions v2 handle all business logic (XP, scoring, payouts). Client writes activities to Firestore; triggers do the rest. Stripe Checkout for payments, webhooks for state sync. OAuth2 for smartwatch providers, scheduled sync every 15 min. Real-time listeners for duels and leagues.

**Tech Stack:** Firebase Cloud Functions v2 (Node.js 20, TypeScript), Stripe SDK, Google Fit REST API, Terra API, React Query, Firebase Admin SDK, FCM for push.

---

## Phase A: Cloud Functions Setup + Security Fix

### Task 1: Initialize Cloud Functions project

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/src/index.ts`
- Modify: `firebase.json`

**Step 1: Create functions directory and initialize**

```bash
cd "C:/Users/david/Desktop/App Fitness"
mkdir -p functions/src/triggers functions/src/api functions/src/utils
```

**Step 2: Create `functions/package.json`**

```json
{
  "name": "fitsocial-functions",
  "private": true,
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  },
  "engines": { "node": "20" },
  "dependencies": {
    "firebase-admin": "^13.0.0",
    "firebase-functions": "^6.3.0",
    "stripe": "^17.0.0"
  },
  "devDependencies": {
    "typescript": "~5.7.0",
    "@types/node": "^20.0.0"
  }
}
```

**Step 3: Create `functions/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2022",
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

**Step 4: Create `functions/src/index.ts`** (empty scaffold)

```typescript
import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Triggers
export { onActivityCreated } from './triggers/onActivityCreated'
export { onChallengeEnd } from './triggers/onChallengeEnd'
export { onFriendRequestCreated } from './triggers/onFriendRequest'
export { onWeekEnd } from './triggers/onWeekEnd'

// API
export { createCheckoutSession, stripeWebhook, createConnectAccount } from './api/payments'
export { joinPaidChallenge, createPaidChallenge } from './api/challenges'
export { healthOAuthCallback, syncHealthData } from './api/health'
export { createDuel, acceptDuel } from './api/duels'
```

**Step 5: Update `firebase.json`** to include functions

Add to the existing firebase.json:
```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  }
}
```

**Step 6: Install dependencies**

```bash
cd functions && npm install
```

**Step 7: Commit**

```bash
git add functions/ firebase.json
git commit -m "feat: initialize Cloud Functions project with TypeScript scaffold"
```

---

### Task 2: Scoring utils (server-only business logic)

**Files:**
- Create: `functions/src/utils/scoring.ts`

**Step 1: Write scoring utility**

This centralizes ALL score/XP calculations server-side so the client can never manipulate them.

```typescript
import { getFirestore } from 'firebase-admin/firestore'

const db = getFirestore()

interface ActivityData {
  date: string
  steps: number
  calories: number
  distance: number
  workouts: {
    type: string
    duration: number
    distance?: number
    exercises?: { name: string; sets: { kg: number; reps: number }[] }[]
  }[]
  source?: string
  verified?: boolean
}

/** Calculate XP gained from an activity */
export function calculateXP(activity: ActivityData): number {
  let xp = 0
  xp += Math.floor(activity.steps / 100)        // 1 XP per 100 steps
  xp += Math.floor(activity.calories / 10)       // 1 XP per 10 kcal
  xp += Math.floor(activity.distance * 10)       // 10 XP per km
  for (const w of activity.workouts) {
    xp += Math.floor(w.duration / 5) * 2         // 2 XP per 5 min workout
  }
  if (activity.verified) xp = Math.floor(xp * 1.1) // 10% bonus for verified data
  return xp
}

/** Calculate level from total XP */
export function calculateLevel(xp: number): number {
  return Math.floor(xp / 1000) + 1
}

/** Calculate new streak */
export function calculateStreak(lastActive: string | undefined, currentStreak: number): number {
  const today = new Date().toISOString().split('T')[0]
  if (lastActive === today) return currentStreak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  return lastActive === yesterday ? currentStreak + 1 : 1
}

/** Get score value for a challenge type from activity data */
export function getScoreForType(type: string, activity: ActivityData): number {
  switch (type) {
    case 'steps': return activity.steps
    case 'calories': return activity.calories
    case 'distance': return Math.round(activity.distance * 10)
    case 'workouts': return activity.workouts.length
    default: return 0
  }
}

/** Epley formula for estimated 1RM */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}
```

**Step 2: Commit**

```bash
git add functions/src/utils/scoring.ts
git commit -m "feat: add server-side scoring utilities (XP, streak, challenge scores, 1RM)"
```

---

### Task 3: Notification utils (FCM push)

**Files:**
- Create: `functions/src/utils/notifications.ts`

**Step 1: Write notification helper**

```typescript
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
```

**Step 2: Commit**

```bash
git add functions/src/utils/notifications.ts
git commit -m "feat: add notification utility (in-app + FCM push)"
```

---

### Task 4: onActivityCreated trigger (core workflow)

**Files:**
- Create: `functions/src/triggers/onActivityCreated.ts`

This is the most important function — it runs every time a user logs a workout.

**Step 1: Write the trigger**

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { calculateXP, calculateLevel, calculateStreak, getScoreForType, estimate1RM } from '../utils/scoring'
import { sendNotification } from '../utils/notifications'

const db = getFirestore()

export const onActivityCreated = onDocumentCreated(
  'users/{userId}/activities/{activityId}',
  async (event) => {
    const snap = event.data
    if (!snap) return

    const userId = event.params.userId
    const activity = snap.data()

    // 1. Calculate and update XP, level, streak
    const userRef = db.collection('users').doc(userId)
    const userDoc = await userRef.get()
    if (!userDoc.exists) return

    const user = userDoc.data()!
    const gainedXp = calculateXP(activity as any)
    const newXp = (user.xp ?? 0) + gainedXp
    const newLevel = calculateLevel(newXp)
    const newStreak = calculateStreak(user.lastActive, user.streak ?? 0)
    const today = new Date().toISOString().split('T')[0]

    const leveledUp = newLevel > (user.level ?? 1)

    await userRef.update({
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      lastActive: today,
    })

    // 2. Sync scores to all active challenges
    const now = Date.now()
    const challengesSnap = await db.collection('challenges')
      .where('endDate', '>', now)
      .get()

    const joinedChallenges = challengesSnap.docs.filter(
      d => (d.data().participants ?? []).includes(userId)
    )

    await Promise.all(joinedChallenges.map(c => {
      const score = getScoreForType(c.data().type, activity as any)
      return c.ref.update({
        [`scores.${userId}`]: {
          userId,
          userName: user.name ?? 'Unknown',
          score,
          verified: activity.verified ?? false,
        }
      })
    }))

    // 3. Sync scores to active duels
    const duelsSnap = await db.collection('duels')
      .where('status', '==', 'active')
      .get()

    const userDuels = duelsSnap.docs.filter(d => {
      const data = d.data()
      return data.challenger === userId || data.opponent === userId
    })

    await Promise.all(userDuels.map(d => {
      const score = getScoreForType(d.data().type, activity as any)
      return d.ref.update({ [`scores.${userId}`]: score })
    }))

    // 4. Update streak battles
    const battlesSnap = await db.collection('streak-battles')
      .where('status', '==', 'active')
      .where('survivors', 'array-contains', userId)
      .get()

    // Mark user as active today in battle (handled by scheduled check)

    // 5. Check and unlock achievements
    const achievementsRef = db.collection('users').doc(userId).collection('achievements').doc('all')
    const achievDoc = await achievementsRef.get()
    const existing = achievDoc.exists ? achievDoc.data()! : {}
    const existingIds = new Set(Object.keys(existing))

    const totalActsSnap = await db.collection('users').doc(userId).collection('activities').get()
    const totalActs = totalActsSnap.size
    const totalSteps = totalActsSnap.docs.reduce((sum, d) => sum + (d.data().steps ?? 0), 0)

    const friendsSnap = await db.collection('users').doc(userId).collection('friends').get()
    const friendCount = friendsSnap.docs.filter(d => d.data().status === 'accepted').length

    const wonChallenges = challengesSnap.docs.filter(d => {
      if (d.data().endDate > now) return false
      const scores = d.data().scores ?? {}
      const entries = Object.values(scores) as { userId: string; score: number }[]
      if (entries.length === 0) return false
      entries.sort((a, b) => b.score - a.score)
      return entries[0].userId === userId
    }).length

    const checks: [string, boolean][] = [
      ['first_workout', totalActs >= 1],
      ['streak_7', newStreak >= 7],
      ['streak_30', newStreak >= 30],
      ['steps_50k', totalSteps >= 50000],
      ['steps_100k', totalSteps >= 100000],
      ['challenges_1', wonChallenges >= 1],
      ['friends_5', friendCount >= 5],
      ['level_5', newLevel >= 5],
      ['level_10', newLevel >= 10],
    ]

    const newBadges: Record<string, number> = {}
    for (const [id, condition] of checks) {
      if (condition && !existingIds.has(id)) {
        newBadges[id] = Date.now()
      }
    }

    if (Object.keys(newBadges).length > 0) {
      await achievementsRef.set({ ...existing, ...newBadges }, { merge: true })
      // Notify for each new badge
      for (const badgeId of Object.keys(newBadges)) {
        await sendNotification({
          userId,
          type: 'achievement',
          title: 'Nuovo Badge!',
          body: `Hai sbloccato: ${badgeId}`,
          data: { badgeId }
        })
      }
    }

    // 6. Publish to feed
    const feedId = `${userId}_${activity.date}`
    await db.collection('feed').doc(feedId).set({
      userId,
      userName: user.name ?? 'Unknown',
      date: activity.date,
      workoutTypes: (activity.workouts ?? []).map((w: any) => w.type),
      steps: activity.steps ?? 0,
      calories: activity.calories ?? 0,
      distance: activity.distance ?? 0,
      duration: (activity.workouts ?? []).reduce((s: number, w: any) => s + (w.duration ?? 0), 0),
      reactions: {},
      createdAt: Date.now(),
    }, { merge: true })

    // 7. Check and update PRs
    const prsRef = db.collection('users').doc(userId).collection('meta').doc('prs')
    const prsDoc = await prsRef.get()
    const prs = prsDoc.exists ? prsDoc.data()! : {}

    const updates: Record<string, any> = {}
    if ((activity.steps ?? 0) > (prs.maxSteps ?? 0)) updates.maxSteps = activity.steps
    if ((activity.distance ?? 0) > (prs.maxDistance ?? 0)) updates.maxDistance = activity.distance
    if ((activity.calories ?? 0) > (prs.maxCalories ?? 0)) updates.maxCalories = activity.calories

    // Exercise PRs
    const exercisePRs: Record<string, any> = prs.exercises ?? {}
    for (const workout of (activity.workouts ?? [])) {
      for (const exercise of (workout.exercises ?? [])) {
        const current = exercisePRs[exercise.name] ?? { maxWeight: 0, maxVolume: 0, estimated1RM: 0 }
        let changed = false
        for (const set of exercise.sets) {
          if (set.kg > current.maxWeight) { current.maxWeight = set.kg; changed = true }
          const volume = set.kg * set.reps
          if (volume > current.maxVolume) { current.maxVolume = volume; changed = true }
          const e1rm = estimate1RM(set.kg, set.reps)
          if (e1rm > current.estimated1RM) { current.estimated1RM = e1rm; changed = true }
        }
        if (changed) {
          current.date = activity.date
          exercisePRs[exercise.name] = current
        }
      }
    }
    updates.exercises = exercisePRs

    if (Object.keys(updates).length > 0) {
      await prsRef.set({ ...prs, ...updates }, { merge: true })
    }

    // 8. Level up notification
    if (leveledUp) {
      await sendNotification({
        userId,
        type: 'system',
        title: 'Level Up!',
        body: `Sei salito al livello ${newLevel}!`,
      })
    }
  }
)
```

**Step 2: Commit**

```bash
git add functions/src/triggers/onActivityCreated.ts
git commit -m "feat: add onActivityCreated trigger — server-side XP, scoring, badges, feed, PRs"
```

---

### Task 5: onChallengeEnd scheduled trigger

**Files:**
- Create: `functions/src/triggers/onChallengeEnd.ts`

**Step 1: Write the scheduled trigger**

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { sendNotification } from '../utils/notifications'

const db = getFirestore()

export const onChallengeEnd = onSchedule('every 1 hours', async () => {
  const now = Date.now()

  // 1. End expired challenges
  const challengesSnap = await db.collection('challenges')
    .where('endDate', '<=', now)
    .where('settled', '==', false)
    .get()

  for (const doc of challengesSnap.docs) {
    const challenge = doc.data()
    const scores = challenge.scores ?? {}
    const entries = Object.entries(scores)
      .map(([uid, s]: [string, any]) => ({ userId: uid, userName: s.userName, score: s.score, verified: s.verified }))
      .sort((a, b) => b.score - a.score)

    if (entries.length === 0) {
      await doc.ref.update({ settled: true })
      continue
    }

    const winner = entries[0]

    // For pool prize challenges, only verified scores count
    const isPaidChallenge = challenge.prize?.type === 'pool'
    let effectiveWinner = winner
    if (isPaidChallenge) {
      const verifiedEntries = entries.filter(e => e.verified)
      if (verifiedEntries.length > 0) {
        effectiveWinner = verifiedEntries[0]
      }
    }

    await doc.ref.update({
      settled: true,
      'prize.winnerId': effectiveWinner.userId,
      'prize.payoutStatus': isPaidChallenge ? 'pending' : undefined,
    })

    // Notify winner
    await sendNotification({
      userId: effectiveWinner.userId,
      type: 'system',
      title: 'Hai vinto!',
      body: `Hai vinto la sfida "${challenge.title}"!`,
      data: { challengeId: doc.id }
    })

    // TODO: Stripe payout for pool prize (Task 9)
  }

  // 2. End expired duels
  const duelsSnap = await db.collection('duels')
    .where('endsAt', '<=', now)
    .where('status', '==', 'active')
    .get()

  for (const doc of duelsSnap.docs) {
    const duel = doc.data()
    const scores = duel.scores ?? {}
    const challengerScore = scores[duel.challenger] ?? 0
    const opponentScore = scores[duel.opponent] ?? 0

    const winnerId = challengerScore >= opponentScore ? duel.challenger : duel.opponent
    const loserId = winnerId === duel.challenger ? duel.opponent : duel.challenger

    await doc.ref.update({
      status: 'completed',
      winnerId,
    })

    await sendNotification({
      userId: winnerId,
      type: 'duel',
      title: 'Duello vinto!',
      body: `Hai vinto il duello con ${challengerScore >= opponentScore ? duel.opponentName : duel.challengerName}!`,
    })

    await sendNotification({
      userId: loserId,
      type: 'duel',
      title: 'Duello concluso',
      body: 'Hai perso il duello. Riprova!',
    })

    // TODO: Stripe payout for bet duels (Task 9)
  }

  // 3. Streak battle daily check — eliminate users who didn't log today
  const yesterday = new Date(now - 86400000).toISOString().split('T')[0]
  const battlesSnap = await db.collection('streak-battles')
    .where('status', '==', 'active')
    .get()

  for (const doc of battlesSnap.docs) {
    const battle = doc.data()
    const survivors: string[] = battle.survivors ?? []
    const newSurvivors: string[] = []
    const newEliminated: string[] = [...(battle.eliminated ?? [])]

    for (const uid of survivors) {
      const actSnap = await db.collection('users').doc(uid).collection('activities').doc(yesterday).get()
      if (actSnap.exists) {
        newSurvivors.push(uid)
      } else {
        newEliminated.push(uid)
        await sendNotification({
          userId: uid,
          type: 'system',
          title: 'Eliminato!',
          body: 'Hai saltato un giorno e sei stato eliminato dalla Streak Battle!',
        })
      }
    }

    const update: Record<string, any> = { survivors: newSurvivors, eliminated: newEliminated }
    if (newSurvivors.length <= 1) {
      update.status = 'completed'
      if (newSurvivors.length === 1) {
        update.winnerId = newSurvivors[0]
        await sendNotification({
          userId: newSurvivors[0],
          type: 'system',
          title: 'Streak Battle vinta!',
          body: 'Sei l\'ultimo sopravvissuto!',
        })
      }
    }

    await doc.ref.update(update)
  }
})
```

**Step 2: Commit**

```bash
git add functions/src/triggers/onChallengeEnd.ts
git commit -m "feat: add onChallengeEnd scheduled trigger — settle challenges, duels, streak battles"
```

---

### Task 6: onFriendRequest trigger

**Files:**
- Create: `functions/src/triggers/onFriendRequest.ts`

**Step 1: Write trigger**

```typescript
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
```

**Step 2: Commit**

```bash
git add functions/src/triggers/onFriendRequest.ts
git commit -m "feat: add onFriendRequest trigger — push notification on new friend request"
```

---

### Task 7: onWeekEnd trigger (weekly leagues)

**Files:**
- Create: `functions/src/triggers/onWeekEnd.ts`

**Step 1: Write the weekly league processor**

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { sendNotification } from '../utils/notifications'

const db = getFirestore()

function getWeekId(date: Date): string {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

const TIERS = ['bronze', 'silver', 'gold', 'diamond'] as const
const TIER_MIN_XP = { bronze: 0, silver: 500, gold: 1500, diamond: 3000 }
const PROMOTE_COUNT = 3
const RELEGATE_COUNT = 3

export const onWeekEnd = onSchedule('every sunday 23:55', async () => {
  const now = new Date()
  const currentWeek = getWeekId(now)
  const leagueRef = db.collection('leagues').doc(currentWeek)
  const leagueDoc = await leagueRef.get()

  if (!leagueDoc.exists) return

  const league = leagueDoc.data()!
  const promotions: string[] = []
  const relegations: string[] = []

  // Process each tier
  for (let i = 0; i < TIERS.length; i++) {
    const tier = TIERS[i]
    const users: string[] = league.tiers?.[tier]?.users ?? []
    if (users.length === 0) continue

    // Get weekly XP for each user
    const userXps = await Promise.all(users.map(async uid => {
      const userDoc = await db.collection('users').doc(uid).get()
      const weeklyXp = userDoc.data()?.weeklyXp ?? 0
      return { uid, xp: weeklyXp }
    }))

    userXps.sort((a, b) => b.xp - a.xp)

    // Top 3 promote (if not already diamond)
    if (i < TIERS.length - 1) {
      const toPromote = userXps.slice(0, PROMOTE_COUNT).map(u => u.uid)
      promotions.push(...toPromote)
      for (const uid of toPromote) {
        await sendNotification({
          userId: uid,
          type: 'system',
          title: 'Promosso!',
          body: `Sei salito alla lega ${TIERS[i + 1].toUpperCase()}!`,
        })
      }
    }

    // Bottom 3 relegate (if not already bronze)
    if (i > 0) {
      const toRelegate = userXps.slice(-RELEGATE_COUNT).map(u => u.uid)
      relegations.push(...toRelegate)
      for (const uid of toRelegate) {
        await sendNotification({
          userId: uid,
          type: 'system',
          title: 'Retrocesso',
          body: `Sei sceso alla lega ${TIERS[i - 1].toUpperCase()}. Dai che ce la fai!`,
        })
      }
    }
  }

  await leagueRef.update({ promotions, relegations, settled: true })

  // Create next week's league
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekId = getWeekId(nextWeek)

  // Get all active users and assign to tiers based on XP
  const usersSnap = await db.collection('users')
    .where('lastActive', '>=', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
    .get()

  const tiers: Record<string, { minXP: number; users: string[] }> = {
    bronze: { minXP: 0, users: [] },
    silver: { minXP: 500, users: [] },
    gold: { minXP: 1500, users: [] },
    diamond: { minXP: 3000, users: [] },
  }

  for (const userDoc of usersSnap.docs) {
    const xp = userDoc.data().xp ?? 0
    const uid = userDoc.id
    // Apply promotions/relegations
    if (xp >= 3000) tiers.diamond.users.push(uid)
    else if (xp >= 1500) tiers.gold.users.push(uid)
    else if (xp >= 500) tiers.silver.users.push(uid)
    else tiers.bronze.users.push(uid)
  }

  // Reset weekly XP for all users
  const batch = db.batch()
  usersSnap.docs.forEach(d => batch.update(d.ref, { weeklyXp: 0 }))
  await batch.commit()

  await db.collection('leagues').doc(nextWeekId).set({
    week: nextWeekId,
    tiers,
    promotions: [],
    relegations: [],
    settled: false,
    createdAt: Date.now(),
  })
})
```

**Step 2: Commit**

```bash
git add functions/src/triggers/onWeekEnd.ts
git commit -m "feat: add onWeekEnd trigger — weekly league promotion/relegation system"
```

---

### Task 8: Fix Firestore security rules

**Files:**
- Modify: `firestore.rules`

**Step 1: Replace firestore.rules with hardened version**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: check if user is authenticated
    function isAuth() {
      return request.auth != null;
    }

    // Helper: check if request is from the user themselves
    function isOwner(userId) {
      return isAuth() && request.auth.uid == userId;
    }

    // Helper: fields the client is NOT allowed to write (server-managed)
    function noServerFields() {
      return !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['xp', 'level', 'streak', 'lastActive']);
    }

    // Users — read any, write own (except server-managed fields)
    match /users/{userId} {
      allow read: if isAuth();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) && noServerFields();
    }

    // Activities — owner writes, owner + friends read
    match /users/{userId}/activities/{activityId} {
      allow read: if isAuth(); // TODO: restrict to friends once friend-check helper is feasible
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
    }

    // Notifications — own only
    match /users/{userId}/notifications/{notifId} {
      allow read, write: if isOwner(userId);
    }

    // Achievements — read own, write only by server (admin SDK bypasses rules)
    match /users/{userId}/achievements/{docId} {
      allow read: if isOwner(userId);
      allow write: if false; // Server-only via Admin SDK
    }

    // PRs — read own, write only by server
    match /users/{userId}/meta/{docId} {
      allow read: if isOwner(userId);
      allow write: if false; // Server-only via Admin SDK
    }

    // Friends — read own, create if sender or owner, update own
    match /users/{userId}/friends/{friendId} {
      allow read: if isOwner(userId);
      allow create: if isAuth() && (request.auth.uid == userId || request.auth.uid == friendId);
      allow update: if isOwner(userId);
    }

    // Weights, injuries, measurements — own only
    match /users/{userId}/weights/{docId} {
      allow read, write: if isOwner(userId);
    }
    match /users/{userId}/injuries/{docId} {
      allow read, write: if isOwner(userId);
    }
    match /users/{userId}/measurements/{docId} {
      allow read, write: if isOwner(userId);
    }

    // Challenges — read all, create auth, update scores ONLY by server
    match /challenges/{challengeId} {
      allow read: if isAuth();
      allow create: if isAuth();
      // Participants can join (add themselves) but NOT modify scores
      allow update: if isAuth() &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['participants']) &&
        request.resource.data.participants.hasAll(resource.data.participants);
    }

    // Duels — read if participant, create auth, update only by server
    match /duels/{duelId} {
      allow read: if isAuth() &&
        (resource.data.challenger == request.auth.uid || resource.data.opponent == request.auth.uid);
      allow create: if isAuth();
      allow update: if false; // Server-only
    }

    // Streak battles — read if participant, create auth
    match /streak-battles/{battleId} {
      allow read: if isAuth() && request.auth.uid in resource.data.participants;
      allow create: if isAuth();
      allow update: if false; // Server-only
    }

    // Leagues — read all, write only by server
    match /leagues/{weekId} {
      allow read: if isAuth();
      allow write: if false; // Server-only
    }

    // Groups — read all, create auth, update only by creator
    match /groups/{groupId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update: if isAuth() && request.auth.uid == resource.data.createdBy;
    }

    // Events — read all, create auth, update only by creator
    match /events/{eventId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update: if isAuth() && request.auth.uid == resource.data.createdBy;
    }

    // Feed — read all, write only by server
    match /feed/{feedId} {
      allow read: if isAuth();
      allow write: if false; // Server-only via Admin SDK
    }

    // Routes — read all, create auth, update only by creator
    match /routes/{routeId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update: if isAuth() && request.auth.uid == resource.data.createdBy;
    }

    // Payments & Payouts — read own, write only by server
    match /payments/{paymentId} {
      allow read: if isAuth() && resource.data.userId == request.auth.uid;
      allow write: if false;
    }
    match /payouts/{payoutId} {
      allow read: if isAuth() && resource.data.userId == request.auth.uid;
      allow write: if false;
    }
  }
}
```

**Step 2: Commit**

```bash
git add firestore.rules
git commit -m "fix: harden Firestore rules — server-only XP/scores, owner-only groups, private achievements"
```

---

## Phase B: Stripe Payments

### Task 9: Stripe utilities + payments API

**Files:**
- Create: `functions/src/utils/stripe.ts`
- Create: `functions/src/api/payments.ts`

**Step 1: Write Stripe config**

```typescript
// functions/src/utils/stripe.ts
import Stripe from 'stripe'
import { defineString } from 'firebase-functions/params'

const stripeSecretKey = defineString('STRIPE_SECRET_KEY')
const stripeWebhookSecret = defineString('STRIPE_WEBHOOK_SECRET')

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(stripeSecretKey.value(), { apiVersion: '2025-04-30.basil' })
  }
  return _stripe
}

export function getWebhookSecret(): string {
  return stripeWebhookSecret.value()
}

export const PREMIUM_PRICE_ID = 'price_XXXXX' // Set after creating product in Stripe Dashboard
export const PLATFORM_FEE_PERCENT = 12
```

**Step 2: Write payments API**

```typescript
// functions/src/api/payments.ts
import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getStripe, getWebhookSecret, PREMIUM_PRICE_ID } from '../utils/stripe'
import { sendNotification } from '../utils/notifications'

const db = getFirestore()

/** Create Stripe Checkout for premium subscription */
export const createCheckoutSession = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { userId } = req.body
  if (!userId) { res.status(400).json({ error: 'userId required' }); return }

  const stripe = getStripe()
  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) { res.status(404).json({ error: 'User not found' }); return }

  const user = userDoc.data()!
  let customerId = user.stripeCustomerId

  // Create Stripe customer if needed
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { firebaseUid: userId },
    })
    customerId = customer.id
    await db.collection('users').doc(userId).update({ stripeCustomerId: customerId })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: `${req.headers.origin}/settings?payment=success`,
    cancel_url: `${req.headers.origin}/settings?payment=cancelled`,
    metadata: { firebaseUid: userId },
  })

  res.json({ url: session.url })
})

/** Create Stripe Connect account for receiving payouts */
export const createConnectAccount = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { userId } = req.body
  if (!userId) { res.status(400).json({ error: 'userId required' }); return }

  const stripe = getStripe()
  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) { res.status(404).json({ error: 'User not found' }); return }

  const user = userDoc.data()!

  if (user.stripeConnectId) {
    // Return onboarding link for existing account
    const link = await stripe.accountLinks.create({
      account: user.stripeConnectId,
      refresh_url: `${req.headers.origin}/settings`,
      return_url: `${req.headers.origin}/settings?connect=success`,
      type: 'account_onboarding',
    })
    res.json({ url: link.url })
    return
  }

  const account = await stripe.accounts.create({
    type: 'express',
    email: user.email,
    metadata: { firebaseUid: userId },
    capabilities: { transfers: { requested: true } },
  })

  await db.collection('users').doc(userId).update({ stripeConnectId: account.id })

  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${req.headers.origin}/settings`,
    return_url: `${req.headers.origin}/settings?connect=success`,
    type: 'account_onboarding',
  })

  res.json({ url: link.url })
})

/** Stripe webhook handler */
export const stripeWebhook = onRequest(async (req, res) => {
  const stripe = getStripe()
  const sig = req.headers['stripe-signature'] as string

  let event
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, getWebhookSecret())
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`)
    return
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.firebaseUid
      if (userId && session.mode === 'subscription') {
        await db.collection('users').doc(userId).update({ plan: 'premium' })
        await db.collection('payments').add({
          userId,
          type: 'subscription',
          amount: session.amount_total,
          currency: session.currency,
          stripeSessionId: session.id,
          createdAt: Date.now(),
        })
        await sendNotification({
          userId,
          type: 'system',
          title: 'Benvenuto Premium!',
          body: 'Il tuo abbonamento Premium e\' attivo!',
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const customerId = invoice.customer as string
      const usersSnap = await db.collection('users')
        .where('stripeCustomerId', '==', customerId).limit(1).get()
      if (!usersSnap.empty) {
        const userId = usersSnap.docs[0].id
        await db.collection('users').doc(userId).update({ plan: 'free' })
        await sendNotification({
          userId,
          type: 'system',
          title: 'Pagamento fallito',
          body: 'Il tuo abbonamento Premium e\' stato sospeso. Aggiorna il metodo di pagamento.',
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const customerId = sub.customer as string
      const usersSnap = await db.collection('users')
        .where('stripeCustomerId', '==', customerId).limit(1).get()
      if (!usersSnap.empty) {
        await db.collection('users').doc(usersSnap.docs[0].id).update({ plan: 'free' })
      }
      break
    }
  }

  res.json({ received: true })
})
```

**Step 3: Commit**

```bash
git add functions/src/utils/stripe.ts functions/src/api/payments.ts
git commit -m "feat: add Stripe payments API — checkout, subscriptions, webhooks, Connect payouts"
```

---

### Task 10: Challenges API (paid challenges + duels)

**Files:**
- Create: `functions/src/api/challenges.ts`
- Create: `functions/src/api/duels.ts`

**Step 1: Write challenges API**

```typescript
// functions/src/api/challenges.ts
import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getStripe, PLATFORM_FEE_PERCENT } from '../utils/stripe'

const db = getFirestore()

/** Create a paid (pool prize) challenge — requires premium */
export const createPaidChallenge = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { userId, title, type, period, fitnessLevel, target, entryFee, startDate, endDate } = req.body

  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) { res.status(404).json({ error: 'User not found' }); return }
  if (userDoc.data()?.plan !== 'premium') {
    res.status(403).json({ error: 'Premium required to create paid challenges' })
    return
  }

  const challengeRef = await db.collection('challenges').add({
    title,
    type,
    period,
    fitnessLevel: fitnessLevel ?? 'all',
    target: target ?? null,
    participants: [userId],
    scores: {},
    prize: {
      type: 'pool',
      value: `Pool Prize`,
      entryFee,
      totalPool: 0,
      platformFee: PLATFORM_FEE_PERCENT,
      payoutStatus: 'pending',
    },
    startDate,
    endDate,
    settled: false,
    createdBy: userId,
    createdAt: Date.now(),
  })

  res.json({ challengeId: challengeRef.id })
})

/** Join a paid challenge — creates Stripe payment */
export const joinPaidChallenge = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { userId, challengeId } = req.body
  const stripe = getStripe()

  const challengeDoc = await db.collection('challenges').doc(challengeId).get()
  if (!challengeDoc.exists) { res.status(404).json({ error: 'Challenge not found' }); return }

  const challenge = challengeDoc.data()!
  if (challenge.participants.includes(userId)) {
    res.status(400).json({ error: 'Already joined' })
    return
  }

  const entryFee = challenge.prize?.entryFee
  if (!entryFee || challenge.prize?.type !== 'pool') {
    res.status(400).json({ error: 'Not a paid challenge' })
    return
  }

  // Get or create Stripe customer
  const userDoc = await db.collection('users').doc(userId).get()
  const user = userDoc.data()!
  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { firebaseUid: userId },
    })
    customerId = customer.id
    await db.collection('users').doc(userId).update({ stripeCustomerId: customerId })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: `Entry: ${challenge.title}` },
        unit_amount: Math.round(entryFee * 100), // cents
      },
      quantity: 1,
    }],
    success_url: `${req.headers.origin}/challenges?joined=${challengeId}`,
    cancel_url: `${req.headers.origin}/challenges`,
    metadata: { firebaseUid: userId, challengeId, type: 'challenge_entry' },
  })

  res.json({ url: session.url })
})
```

**Step 2: Write duels API**

```typescript
// functions/src/api/duels.ts
import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { sendNotification } from '../utils/notifications'

const db = getFirestore()

const DURATION_MS: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '48h': 48 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

/** Create a new duel */
export const createDuel = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { challengerId, opponentId, type, duration, betAmount } = req.body

  const challengerDoc = await db.collection('users').doc(challengerId).get()
  const opponentDoc = await db.collection('users').doc(opponentId).get()
  if (!challengerDoc.exists || !opponentDoc.exists) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const durationMs = DURATION_MS[duration] ?? DURATION_MS['24h']

  const duelRef = await db.collection('duels').add({
    challenger: challengerId,
    challengerName: challengerDoc.data()!.name,
    opponent: opponentId,
    opponentName: opponentDoc.data()!.name,
    type: type ?? 'steps',
    duration,
    status: 'pending',
    scores: { [challengerId]: 0, [opponentId]: 0 },
    bet: betAmount ? { amount: betAmount, currency: 'EUR' } : null,
    createdAt: Date.now(),
    endsAt: 0, // Set when accepted
  })

  await sendNotification({
    userId: opponentId,
    type: 'duel',
    title: 'Sfida 1v1!',
    body: `${challengerDoc.data()!.name} ti ha sfidato a un duello!`,
    data: { duelId: duelRef.id, challengerId },
  })

  res.json({ duelId: duelRef.id })
})

/** Accept a duel */
export const acceptDuel = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return }

  const { userId, duelId } = req.body

  const duelDoc = await db.collection('duels').doc(duelId).get()
  if (!duelDoc.exists) { res.status(404).json({ error: 'Duel not found' }); return }

  const duel = duelDoc.data()!
  if (duel.opponent !== userId) { res.status(403).json({ error: 'Not the opponent' }); return }
  if (duel.status !== 'pending') { res.status(400).json({ error: 'Duel not pending' }); return }

  const durationMs = DURATION_MS[duel.duration] ?? DURATION_MS['24h']

  await duelDoc.ref.update({
    status: 'active',
    endsAt: Date.now() + durationMs,
  })

  await sendNotification({
    userId: duel.challenger,
    type: 'duel',
    title: 'Duello accettato!',
    body: `${duel.opponentName} ha accettato la sfida!`,
    data: { duelId },
  })

  res.json({ success: true })
})
```

**Step 3: Commit**

```bash
git add functions/src/api/challenges.ts functions/src/api/duels.ts
git commit -m "feat: add challenges & duels API — paid entry, 1v1 creation, duel accept flow"
```

---

## Phase C: Smartwatch Integration

### Task 11: Health API (OAuth + sync)

**Files:**
- Create: `functions/src/api/health.ts`

**Step 1: Write health sync API**

```typescript
// functions/src/api/health.ts
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { defineString } from 'firebase-functions/params'

const db = getFirestore()

const GOOGLE_FIT_CLIENT_ID = defineString('GOOGLE_FIT_CLIENT_ID')
const GOOGLE_FIT_CLIENT_SECRET = defineString('GOOGLE_FIT_CLIENT_SECRET')

/** OAuth callback — stores tokens server-side */
export const healthOAuthCallback = onRequest({ cors: true }, async (req, res) => {
  const { code, state, provider } = req.query as Record<string, string>

  if (!code || !state) { res.status(400).send('Missing code or state'); return }

  // state = userId:provider
  const [userId, prov] = state.split(':')

  if (prov === 'google_fit') {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_FIT_CLIENT_ID.value(),
        client_secret: GOOGLE_FIT_CLIENT_SECRET.value(),
        redirect_uri: `${req.headers.origin}/api/health/callback`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    // Store tokens securely (server-only collection)
    await db.collection('users').doc(userId).collection('tokens').doc('google_fit').set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      provider: 'google_fit',
      connectedAt: Date.now(),
    })

    // Update user profile
    await db.collection('users').doc(userId).update({
      connectedDevices: ['google_fit'],
    })
  }

  // Redirect back to app
  res.redirect('/settings?device=connected')
})

/** Scheduled sync — pull data from connected providers every 15 min */
export const syncHealthData = onSchedule('every 15 minutes', async () => {
  // Find all users with connected devices
  const usersSnap = await db.collection('users')
    .where('connectedDevices', '!=', [])
    .get()

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id
    const devices: string[] = userDoc.data().connectedDevices ?? []

    for (const device of devices) {
      try {
        if (device === 'google_fit') {
          await syncGoogleFit(userId)
        }
        // Add other providers here (fitbit, garmin, terra)
      } catch (err) {
        console.error(`Sync failed for ${userId}/${device}:`, err)
      }
    }
  }
})

async function syncGoogleFit(userId: string) {
  const tokenDoc = await db.collection('users').doc(userId).collection('tokens').doc('google_fit').get()
  if (!tokenDoc.exists) return

  const tokenData = tokenDoc.data()!
  let accessToken = tokenData.accessToken

  // Refresh token if expired
  if (Date.now() > tokenData.expiresAt) {
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: tokenData.refreshToken,
        client_id: GOOGLE_FIT_CLIENT_ID.value(),
        client_secret: GOOGLE_FIT_CLIENT_SECRET.value(),
        grant_type: 'refresh_token',
      }),
    })
    const newTokens = await refreshRes.json()
    accessToken = newTokens.access_token
    await tokenDoc.ref.update({
      accessToken,
      expiresAt: Date.now() + (newTokens.expires_in * 1000),
    })
  }

  // Fetch today's data from Google Fit
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const endOfDay = startOfDay + 86400000

  const fitRes = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' },
        { dataTypeName: 'com.google.distance.delta' },
        { dataTypeName: 'com.google.heart_rate.bpm' },
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startOfDay,
      endTimeMillis: endOfDay,
    }),
  })

  const fitData = await fitRes.json()
  const buckets = fitData.bucket ?? []

  let steps = 0, calories = 0, distance = 0, heartRate = 0
  for (const bucket of buckets) {
    for (const dataset of (bucket.dataset ?? [])) {
      for (const point of (dataset.point ?? [])) {
        const val = point.value?.[0]
        if (!val) continue
        const typeName = dataset.dataSourceId ?? ''
        if (typeName.includes('step_count')) steps += val.intVal ?? 0
        else if (typeName.includes('calories')) calories += Math.round(val.fpVal ?? 0)
        else if (typeName.includes('distance')) distance += (val.fpVal ?? 0) / 1000 // meters to km
        else if (typeName.includes('heart_rate')) heartRate = Math.round(val.fpVal ?? 0)
      }
    }
  }

  const dateStr = today.toISOString().split('T')[0]
  const actRef = db.collection('users').doc(userId).collection('activities').doc(dateStr)
  const existing = await actRef.get()

  if (existing.exists) {
    // Merge — smartwatch data takes priority
    await actRef.update({
      steps: Math.max(steps, existing.data()?.steps ?? 0),
      calories: Math.max(calories, existing.data()?.calories ?? 0),
      distance: Math.max(distance, existing.data()?.distance ?? 0),
      heartRate: heartRate || existing.data()?.heartRate,
      source: 'google_fit',
      verified: true,
      lastSync: Date.now(),
    })
  } else {
    await actRef.set({
      date: dateStr,
      steps,
      calories,
      distance: Math.round(distance * 100) / 100,
      heartRate: heartRate || undefined,
      workouts: [],
      source: 'google_fit',
      verified: true,
      lastSync: Date.now(),
    })
  }

  // Update last sync time
  await db.collection('users').doc(userId).collection('tokens').doc('google_fit').update({
    lastSync: Date.now(),
  })
}
```

**Step 2: Add token security rule (server-only)**

The tokens subcollection is already protected because there's no rule allowing client access — Firebase Admin SDK bypasses rules.

**Step 3: Commit**

```bash
git add functions/src/api/health.ts
git commit -m "feat: add health API — Google Fit OAuth, scheduled sync every 15 min, verified data"
```

---

## Phase D: Frontend Updates

### Task 12: Add React Query + update types

**Files:**
- Modify: `web/package.json` (add @tanstack/react-query)
- Modify: `web/src/types/index.ts` (add new types)
- Modify: `web/src/main.tsx` (add QueryClientProvider)

**Step 1: Install React Query**

```bash
cd "C:/Users/david/Desktop/App Fitness/web" && npm install @tanstack/react-query
```

**Step 2: Update `web/src/types/index.ts`** — add new interfaces

Append the following to the existing types file:

```typescript
// --- New types for Phase 1 ---

export interface ConnectedDevice {
  provider: 'google_fit' | 'fitbit' | 'garmin' | 'terra'
  connectedAt: number
  lastSync: number
  scopes: string[]
}

export interface Duel {
  id: string
  challenger: string
  challengerName: string
  opponent: string
  opponentName: string
  type: 'steps' | 'calories' | 'distance'
  duration: '24h' | '48h' | '7d'
  status: 'pending' | 'active' | 'completed'
  bet?: { amount: number; currency: string }
  scores: Record<string, number>
  winnerId?: string
  createdAt: number
  endsAt: number
}

export interface StreakBattle {
  id: string
  participants: string[]
  type: 'longest_streak'
  startDate: number
  status: 'active' | 'completed'
  survivors: string[]
  eliminated: string[]
  winnerId?: string
}

export interface WeeklyLeague {
  week: string
  tiers: Record<string, { minXP: number; users: string[] }>
  promotions: string[]
  relegations: string[]
  settled: boolean
}
```

**Step 3: Update `web/src/main.tsx`** — wrap app with QueryClientProvider

Add import and provider:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,     // 2 min cache
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Wrap the render:
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Spinner />}>
            <Routes>
              {/* ... existing routes ... */}
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
```

**Step 4: Commit**

```bash
git add web/package.json web/src/types/index.ts web/src/main.tsx
git commit -m "feat: add React Query + new types (Duel, StreakBattle, WeeklyLeague, ConnectedDevice)"
```

---

### Task 13: Remove client-side business logic from services

**Files:**
- Modify: `web/src/services/userService.ts` — remove `updateUserXP()`
- Modify: `web/src/services/challengeService.ts` — remove `syncUserScores()`, `updateScore()`
- Modify: `web/src/services/achievementService.ts` — remove `checkAndUnlockAchievements()`
- Modify: `web/src/services/feedService.ts` — remove `publishToFeed()`
- Modify: `web/src/services/prService.ts` — remove `checkAndUpdatePRs()`

**Step 1: Remove `updateUserXP` from userService.ts**

Delete the entire `updateUserXP` function (lines 64-80). All XP/level/streak logic is now in the `onActivityCreated` Cloud Function.

**Step 2: Remove `syncUserScores` and `updateScore` from challengeService.ts**

Delete both functions (lines 42-59). Score syncing is now server-side.

**Step 3: Remove `checkAndUnlockAchievements` from achievementService.ts**

Delete the function (lines 35-79). Keep `getUnlockedAchievements()` and `BADGES` for display purposes. Achievement checking is now in the Cloud Function.

**Step 4: Remove `publishToFeed` from feedService.ts**

Delete the function. Keep `getFeed()` and `toggleReaction()`. Feed publishing is now server-side.

**Step 5: Remove `checkAndUpdatePRs` from prService.ts**

Delete the function. Keep `getPersonalRecords()` for reading. PR checks are now server-side.

**Step 6: Update DashboardPage and other pages**

Remove all calls to the deleted functions from page components. The `onActivityCreated` trigger handles everything automatically when the user writes an activity.

**Step 7: Commit**

```bash
git add web/src/services/ web/src/pages/
git commit -m "refactor: remove client-side business logic — XP, scoring, badges, feed, PRs now server-side"
```

---

### Task 14: Add new service files for duels, leagues, payments

**Files:**
- Create: `web/src/services/duelService.ts`
- Create: `web/src/services/leagueService.ts`
- Create: `web/src/services/paymentService.ts`
- Create: `web/src/services/healthService.ts`

**Step 1: Write duelService.ts**

```typescript
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import type { Duel } from '../types'

const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL ?? ''

export async function createDuel(challengerId: string, opponentId: string, type: string, duration: string, betAmount?: number) {
  const res = await fetch(`${FUNCTIONS_URL}/createDuel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengerId, opponentId, type, duration, betAmount }),
  })
  return res.json()
}

export async function acceptDuel(userId: string, duelId: string) {
  const res = await fetch(`${FUNCTIONS_URL}/acceptDuel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, duelId }),
  })
  return res.json()
}

export function subscribeToActiveDuels(userId: string, callback: (duels: Duel[]) => void) {
  const q = query(collection(db, 'duels'), where('status', '==', 'active'))
  return onSnapshot(q, snap => {
    const duels = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Duel))
      .filter(d => d.challenger === userId || d.opponent === userId)
    callback(duels)
  })
}

export async function getUserDuels(userId: string): Promise<Duel[]> {
  // Firestore doesn't support OR queries on different fields easily,
  // so we query active duels and filter client-side (small dataset)
  const q = query(collection(db, 'duels'), where('status', 'in', ['active', 'pending']))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Duel))
    .filter(d => d.challenger === userId || d.opponent === userId)
}
```

**Step 2: Write leagueService.ts**

```typescript
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { WeeklyLeague } from '../types'

function getCurrentWeekId(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export async function getCurrentLeague(): Promise<WeeklyLeague | null> {
  const weekId = getCurrentWeekId()
  const snap = await getDoc(doc(db, 'leagues', weekId))
  return snap.exists() ? (snap.data() as WeeklyLeague) : null
}

export function getUserTier(league: WeeklyLeague, userId: string): string | null {
  for (const [tier, data] of Object.entries(league.tiers)) {
    if (data.users.includes(userId)) return tier
  }
  return null
}
```

**Step 3: Write paymentService.ts**

```typescript
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL ?? ''

export async function createCheckoutSession(userId: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_URL}/createCheckoutSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  const data = await res.json()
  return data.url
}

export async function createConnectAccount(userId: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_URL}/createConnectAccount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  const data = await res.json()
  return data.url
}

export async function joinPaidChallenge(userId: string, challengeId: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_URL}/joinPaidChallenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, challengeId }),
  })
  const data = await res.json()
  return data.url
}
```

**Step 4: Write healthService.ts**

```typescript
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL ?? ''

const GOOGLE_FIT_CLIENT_ID = import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID ?? ''

export function getGoogleFitAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_FIT_CLIENT_ID,
    redirect_uri: `${FUNCTIONS_URL}/healthOAuthCallback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read',
    access_type: 'offline',
    state: `${userId}:google_fit`,
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export function disconnectDevice(userId: string, provider: string): Promise<void> {
  // TODO: Revoke OAuth token + remove from connectedDevices
  return Promise.resolve()
}
```

**Step 5: Commit**

```bash
git add web/src/services/duelService.ts web/src/services/leagueService.ts web/src/services/paymentService.ts web/src/services/healthService.ts
git commit -m "feat: add client services for duels, leagues, payments, and health sync"
```

---

### Task 15: Build and verify Cloud Functions compile

**Step 1: Build functions**

```bash
cd "C:/Users/david/Desktop/App Fitness/functions" && npm run build
```

Expected: TypeScript compiles without errors to `functions/lib/`.

**Step 2: Build frontend**

```bash
cd "C:/Users/david/Desktop/App Fitness/web" && npm run build
```

Expected: Vite build succeeds.

**Step 3: Fix any compilation errors**

Address any type errors or missing imports.

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve any compilation errors from Phase 1 integration"
```

---

## Summary: Task Dependency Graph

```
Task 1: Init Cloud Functions ─────────────┐
Task 2: Scoring utils ────────────────────┤
Task 3: Notification utils ───────────────┤
                                          ▼
Task 4: onActivityCreated trigger ────────┤
Task 5: onChallengeEnd trigger ───────────┤
Task 6: onFriendRequest trigger ──────────┤
Task 7: onWeekEnd trigger ───────────────┤
Task 8: Fix Firestore rules ─────────────┤
                                          ▼
Task 9: Stripe payments API ─────────────┤
Task 10: Challenges + Duels API ──────────┤
Task 11: Health API (smartwatch) ─────────┤
                                          ▼
Task 12: React Query + new types ─────────┤
Task 13: Remove client business logic ────┤
Task 14: New client services ─────────────┤
                                          ▼
Task 15: Build + verify ──────────────────┘
```

Tasks 1-3 can run in parallel.
Tasks 4-8 depend on 1-3 but can run in parallel with each other.
Tasks 9-11 depend on 1-3, can run in parallel.
Tasks 12-14 can run in parallel.
Task 15 depends on all previous tasks.
