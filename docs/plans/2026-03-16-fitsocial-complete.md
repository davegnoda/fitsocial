# FitSocial Complete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform FitSocial from a partially-demo app into a fully functional, production-ready fitness social platform with real data everywhere, notifications, onboarding, statistics, settings, PWA support, push notifications, and social features.

**Architecture:** All data flows through Firestore. New services extend existing pattern (import from firebase.ts, export async functions). New types extend `types/index.ts`. Pages replace hardcoded data with Firestore queries. New features (notifications, onboarding, settings) are new pages/components following existing Layout pattern.

**Tech Stack:** React 18 + TypeScript + Vite, Firebase (Auth, Firestore, Storage, Cloud Messaging), Tailwind utility classes + inline styles, Sora + DM Sans fonts.

---

## FASE 1 — Real Data Everywhere

### Task 1: Dashboard — Real Friends Activity

Replace `ONLINE_FRIENDS` hardcoded array with real data from Firestore (friends who were active today).

**Files:**
- Modify: `web/src/services/friendService.ts` — add `getActiveFriends()` function
- Modify: `web/src/services/activityService.ts` — add `getLatestActivity()` for other users
- Modify: `web/src/pages/DashboardPage.tsx` — replace ONLINE_FRIENDS with real data
- Modify: `web/src/types/index.ts` — add `Notification` and `Event` types
- Modify: `firestore.rules` — allow reading friends' activities

**Step 1: Add `getActiveFriends` to friendService.ts**

Add after existing exports:
```typescript
export async function getActiveFriends(userId: string): Promise<UserProfile[]> {
  const friends = await getFriends(userId)
  const today = new Date().toISOString().split('T')[0]
  return friends.filter(f => f.lastActive === today)
}
```

**Step 2: Add `getLatestActivity` to activityService.ts**

Add after existing exports:
```typescript
export async function getLatestActivity(userId: string): Promise<Activity | null> {
  const q = query(
    collection(db, 'users', userId, 'activities'),
    orderBy('date', 'desc'),
    limit(1)
  )
  const snap = await getDocs(q)
  return snap.empty ? null : (snap.data() as Activity)
}
```

Wait — `snap.docs[0].data()` is correct. Fix:
```typescript
return snap.empty ? null : (snap.docs[0].data() as Activity)
```

**Step 3: Update Firestore rules — allow reading friends' activities**

In `firestore.rules`, change the activities rule to allow friends to read:
```
match /users/{userId}/activities/{activityId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```
(Change read from owner-only to any authenticated user — needed for friend feeds)

**Step 4: Update DashboardPage.tsx — replace ONLINE_FRIENDS**

Remove the `ONLINE_FRIENDS` const. Add state + effect:
```typescript
const [activeFriends, setActiveFriends] = useState<{name: string; steps: string; uid: string}[]>([])

useEffect(() => {
  if (!user) return
  getActiveFriends(user.uid).then(async friends => {
    const withSteps = await Promise.all(friends.slice(0, 6).map(async f => {
      const act = await getTodayActivity(f.uid)
      return { name: f.name.split(' ')[0], steps: `${((act?.steps ?? 0) / 1000).toFixed(1)}k`, uid: f.uid }
    }))
    setActiveFriends(withSteps)
  }).catch(() => {})
}, [user])
```

Replace `ONLINE_FRIENDS.map(f => ...)` with `activeFriends.map((f, i) => ...)` using Avatar initials instead of `<img>`.

**Step 5: Commit**
```
feat: dashboard shows real active friends from Firestore
```

---

### Task 2: Dashboard — Real Stats (remove hardcoded events, dynamic AI coach)

**Files:**
- Modify: `web/src/pages/DashboardPage.tsx` — remove EVENTS, make AI coach dynamic
- Modify: `web/src/services/activityService.ts` — add `getWeeklyActivities` already exists, add `getTotalActivities`

**Step 1: Add `getTotalActivities` to activityService.ts**
```typescript
export async function getTotalActivities(userId: string): Promise<number> {
  const snap = await getDocs(collection(db, 'users', userId, 'activities'))
  return snap.size
}
```

**Step 2: Make AI coach dynamic based on real data**

Replace the hardcoded AI coach text with:
```typescript
const coachMsg = steps >= 8000
  ? `Fantastico! Hai già ${steps.toLocaleString('it-IT')} passi oggi. Sei al ${stepsPct}% dell'obiettivo!`
  : steps >= 4000
  ? `Buon progresso! ${steps.toLocaleString('it-IT')} passi finora. Una camminata di 20 min ti porterà più vicino al goal.`
  : `Inizia la giornata! Sei a ${steps.toLocaleString('it-IT')} passi. Un allenamento rapido ti darà la spinta.`
```

**Step 3: Remove hardcoded EVENTS section from Dashboard**

Remove the `EVENTS` const and the "Eventi vicini" section entirely. Events belong to CommunityPage.

**Step 4: Commit**
```
feat: dashboard uses real stats + dynamic AI coach
```

---

### Task 3: Profile Page — Real Counters

**Files:**
- Modify: `web/src/pages/ProfilePage.tsx` — real activity count, challenges won, friend count
- Modify: `web/src/services/activityService.ts` — reuse `getTotalActivities`
- Modify: `web/src/services/challengeService.ts` — add `getWonChallenges`

**Step 1: Add `getWonChallenges` to challengeService.ts**
```typescript
export async function getWonChallenges(userId: string): Promise<number> {
  const q = query(collection(db, 'challenges'), where('endDate', '<', Date.now()))
  const snap = await getDocs(q)
  return snap.docs.filter(d => {
    const scores = d.data().scores ?? {}
    const entries = Object.values(scores) as { userId: string; score: number }[]
    if (entries.length === 0) return false
    entries.sort((a, b) => b.score - a.score)
    return entries[0].userId === userId
  }).length
}
```

**Step 2: Update ProfilePage.tsx stats to fetch real data**
```typescript
const [totalActivities, setTotalActivities] = useState(0)
const [challengesWon, setChallengesWon] = useState(0)
const [friendCount, setFriendCount] = useState(0)

useEffect(() => {
  if (!user) return
  getTotalActivities(user.uid).then(setTotalActivities).catch(() => {})
  getWonChallenges(user.uid).then(setChallengesWon).catch(() => {})
  getFriends(user.uid).then(f => setFriendCount(f.length)).catch(() => {})
}, [user])
```

Replace hardcoded `'42'` with `totalActivities.toString()`, `'0'` with `challengesWon.toString()`.

**Step 3: Remove fake DEVICES section** (placeholder only — no real API exists)

Replace DEVICES with a "Prossimamente" card:
```typescript
<div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'center' }}>
  <span style={{ fontSize: '2rem' }}>⌚</span>
  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '8px' }}>Dispositivi — Prossimamente</p>
  <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '4px' }}>Integrazione con Google Health, Apple Health e Garmin in arrivo.</p>
</div>
```

**Step 4: Commit**
```
feat: profile page shows real activity/challenge/friend counts
```

---

### Task 4: Friends Page — Real Activity Feed

**Files:**
- Modify: `web/src/pages/FriendsPage.tsx` — replace MOCK_FEED with real friend activities
- Modify: `web/src/services/activityService.ts` — already has `getTodayActivity`, reuse

**Step 1: Replace MOCK_FEED with real data**

Remove `MOCK_FEED` const. After loading friends, fetch their today activity:
```typescript
const [friendActivities, setFriendActivities] = useState<Map<string, Activity | null>>(new Map())

// Inside reload(), after setting friends:
const actMap = new Map<string, Activity | null>()
await Promise.all(f.map(async friend => {
  const act = await getTodayActivity(friend.uid).catch(() => null)
  actMap.set(friend.uid, act)
}))
setFriendActivities(actMap)
```

In the feed rendering, replace `MOCK_FEED[fi % MOCK_FEED.length]` with real activity data:
```typescript
const act = friendActivities.get(f.uid)
const feedItem = act && act.steps > 0
  ? { action: 'ha fatto', value: `${act.steps.toLocaleString('it-IT')} passi`, icon: '👟', color: '#2563EB', bg: '#EFF6FF' }
  : act && act.workouts.length > 0
  ? { action: 'ha fatto', value: `${act.workouts[0].type} per ${act.workouts[0].duration}min`, icon: '🏃', color: '#0D9488', bg: '#F0FDFA' }
  : { action: 'nessuna attività', value: 'oggi', icon: '😴', color: '#94A3B8', bg: '#F1F5F9' }
```

**Step 2: Replace hardcoded "Suggeriti" with city-based suggestions**

Add to friendService.ts:
```typescript
export async function getSuggestedUsers(userId: string, city: string): Promise<UserProfile[]> {
  if (!city) return []
  const q = query(collection(db, 'users'), where('city', '==', city), limit(10))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => d.data() as UserProfile)
    .filter(p => p.uid !== userId)
    .slice(0, 4)
}
```

Replace hardcoded names with real suggestions from same city.

**Step 3: Commit**
```
feat: friends feed shows real activities, suggestions based on city
```

---

### Task 5: Challenges Page — Real Global Leaderboard

**Files:**
- Modify: `web/src/services/userService.ts` — add `getTopUsers()`
- Modify: `web/src/pages/ChallengesPage.tsx` — replace GLOBAL_LB with real data

**Step 1: Add `getTopUsers` to userService.ts**
```typescript
export async function getTopUsers(n: number = 10): Promise<UserProfile[]> {
  const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(n))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as UserProfile)
}
```

**Step 2: Replace GLOBAL_LB in ChallengesPage.tsx**

Remove `GLOBAL_LB` const. Add state:
```typescript
const [topUsers, setTopUsers] = useState<UserProfile[]>([])

useEffect(() => {
  getTopUsers(10).then(setTopUsers).catch(() => {})
}, [])
```

Replace the global tab rendering to use `topUsers` with real XP values.

**Step 3: Remove DEMO_CHALLENGES fallback** (show empty state instead)

When no challenges exist, show "Nessuna sfida attiva — crea la prima!" with a button.

**Step 4: Commit**
```
feat: real global leaderboard + remove demo challenges fallback
```

---

### Task 6: Community Page — Real Groups & Events from Firestore

**Files:**
- Create: `web/src/services/communityService.ts`
- Modify: `web/src/types/index.ts` — add `CommunityGroup` and `CommunityEvent` types
- Modify: `web/src/pages/CommunityPage.tsx` — fetch real data, add create/join functionality
- Modify: `firestore.rules` — add events collection rules

**Step 1: Add types to types/index.ts**
```typescript
export interface CommunityGroup {
  id: string
  name: string
  description: string
  city: string
  sport: string
  members: string[]
  createdBy: string
  createdAt: number
}

export interface CommunityEvent {
  id: string
  title: string
  description: string
  date: number
  time: string
  location: string
  city: string
  sport: string
  participants: string[]
  createdBy: string
  image?: string
  createdAt: number
}
```

**Step 2: Create communityService.ts**
```typescript
import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import type { CommunityGroup, CommunityEvent } from '../types'

export async function getGroups(city: string): Promise<CommunityGroup[]> {
  const q = city
    ? query(collection(db, 'groups'), where('city', '==', city), limit(20))
    : query(collection(db, 'groups'), limit(20))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityGroup))
}

export async function joinGroup(groupId: string, userId: string) {
  await updateDoc(doc(db, 'groups', groupId), { members: arrayUnion(userId) })
}

export async function createGroup(data: Omit<CommunityGroup, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'groups'), data)
  return ref.id
}

export async function getEvents(city: string): Promise<CommunityEvent[]> {
  const now = Date.now()
  const q = city
    ? query(collection(db, 'events'), where('city', '==', city), where('date', '>', now), orderBy('date'), limit(20))
    : query(collection(db, 'events'), where('date', '>', now), orderBy('date'), limit(20))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityEvent))
}

export async function joinEvent(eventId: string, userId: string) {
  await updateDoc(doc(db, 'events', eventId), { participants: arrayUnion(userId) })
}

export async function createEvent(data: Omit<CommunityEvent, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'events'), data)
  return ref.id
}
```

**Step 3: Add Firestore rules for events**
```
match /events/{eventId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth != null;
}
```

**Step 4: Rewrite CommunityPage.tsx with real data**

Remove all hardcoded consts. Fetch groups and events from Firestore. Add join buttons that actually work. Add "Crea Gruppo" and "Crea Evento" modals.

**Step 5: Commit**
```
feat: community page with real groups & events from Firestore
```

---

### Task 7: Create Challenge Feature

**Files:**
- Create: `web/src/components/CreateChallengeModal.tsx`
- Modify: `web/src/pages/ChallengesPage.tsx` — add "Crea Sfida" button + modal

**Step 1: Create CreateChallengeModal component**

Modal with form fields: title, type (steps/calories/distance/workouts), period (daily/weekly/monthly), fitnessLevel, prize description. On submit, calls `createChallenge()` service.

**Step 2: Add "Crea Sfida" button to ChallengesPage**

Floating action or header button that opens the modal.

**Step 3: Commit**
```
feat: users can create challenges from the app
```

---

## FASE 2 — Polish & UX

### Task 8: Notifications System (in-app)

**Files:**
- Create: `web/src/services/notificationService.ts`
- Create: `web/src/components/NotificationsPanel.tsx`
- Modify: `web/src/types/index.ts` — add `Notification` type
- Modify: `web/src/pages/DashboardPage.tsx` — wire bell button to panel
- Modify: `firestore.rules` — add notifications subcollection

**Step 1: Add Notification type**
```typescript
export interface AppNotification {
  id: string
  type: 'friend_request' | 'challenge_invite' | 'achievement' | 'system'
  title: string
  body: string
  read: boolean
  createdAt: number
  data?: Record<string, string>
}
```

**Step 2: Create notificationService.ts**
CRUD for `users/{userId}/notifications` subcollection.

**Step 3: Create NotificationsPanel**
Slide-in panel from bell button. Shows unread count badge. Mark as read on open.

**Step 4: Wire to DashboardPage bell button**

**Step 5: Trigger notifications on key events**
- Friend request received → notification
- Challenge joined → notification
- XP milestone → notification

**Step 6: Commit**
```
feat: in-app notifications with bell icon + badge
```

---

### Task 9: Onboarding Wizard

**Files:**
- Create: `web/src/pages/OnboardingPage.tsx`
- Modify: `web/src/App.tsx` — add onboarding route
- Modify: `web/src/contexts/AuthContext.tsx` or ProtectedRoute — redirect new users

**Step 1: Create multi-step onboarding**
3 steps:
1. Welcome + choose name/city
2. Select sports interests (multi-select pills)
3. Set fitness level + daily goals

**Step 2: Save to user profile on completion**

**Step 3: Redirect to onboarding if `profile.fitnessLevel` is undefined**

**Step 4: Commit**
```
feat: onboarding wizard for new users
```

---

### Task 10: Statistics Page

**Files:**
- Create: `web/src/pages/StatsPage.tsx`
- Modify: `web/src/App.tsx` — add route
- Modify: `web/src/components/NavBar.tsx` — replace ESPLORA with STATS in nav

**Step 1: Create StatsPage with sections**
- Monthly chart (last 30 days activity)
- Personal records (max steps, max distance, longest streak)
- Workout breakdown by type (pie/bar)

**Step 2: Wire nav tab**

**Step 3: Commit**
```
feat: statistics page with monthly trends + personal records
```

---

### Task 11: Settings Page

**Files:**
- Create: `web/src/pages/SettingsPage.tsx`
- Modify: `web/src/App.tsx` — add route
- Modify: `web/src/pages/ProfilePage.tsx` — link settings button to /settings

**Step 1: Create SettingsPage with sections**
- Profile editing (reuse EditProfileModal logic inline)
- Privacy toggle (profile visible to non-friends)
- Delete account (with confirmation)
- App info / version

**Step 2: Delete account functionality**
Delete Firestore user doc + Firebase Auth account.

**Step 3: Commit**
```
feat: settings page with privacy + delete account
```

---

### Task 12: PWA Support

**Files:**
- Create: `web/public/manifest.json`
- Create: `web/public/sw.js` (simple service worker)
- Modify: `web/index.html` — add manifest link + SW registration
- Create: `web/public/icons/` — app icons (192x192, 512x512)

**Step 1: Create manifest.json**
```json
{
  "name": "FitSocial",
  "short_name": "FitSocial",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F8FAFC",
  "theme_color": "#4F46E5",
  "icons": [...]
}
```

**Step 2: Create minimal service worker for offline shell**

**Step 3: Register SW in index.html**

**Step 4: Generate app icons (SVG-based)**

**Step 5: Commit**
```
feat: PWA support — installable app with offline shell
```

---

## FASE 3 — Advanced Features

### Task 13: Push Notifications (Firebase Cloud Messaging)

**Files:**
- Create: `web/src/services/pushService.ts`
- Modify: `web/public/firebase-messaging-sw.js`
- Modify: `web/src/pages/SettingsPage.tsx` — add notification toggle

**Step 1: Set up FCM in the app**
Request notification permission, get FCM token, store in user profile.

**Step 2: Create firebase-messaging-sw.js**
Background message handler service worker.

**Step 3: Add toggle in Settings**

**Step 4: Commit**
```
feat: push notifications via Firebase Cloud Messaging
```

---

### Task 14: Global Weekly/Monthly Rankings

**Files:**
- Modify: `web/src/services/userService.ts` — add `getWeeklyRanking`, `getMonthlyRanking`
- Modify: `web/src/pages/ChallengesPage.tsx` — enhance global tab with time filters

**Step 1: Add ranking functions using XP + activity aggregation**

**Step 2: Add week/month toggle to global leaderboard tab**

**Step 3: Commit**
```
feat: weekly/monthly global rankings
```

---

### Task 15: Achievements / Badges System

**Files:**
- Create: `web/src/services/achievementService.ts`
- Create: `web/src/components/AchievementBadge.tsx`
- Modify: `web/src/types/index.ts` — add `Achievement` type
- Modify: `web/src/pages/ProfilePage.tsx` — show earned badges
- Modify: `web/src/pages/DashboardPage.tsx` — trigger badge checks after workout

**Step 1: Define achievements**
```typescript
export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  condition: 'first_workout' | 'streak_7' | 'streak_30' | 'steps_100k' | 'challenges_3' | 'friends_10'
  unlockedAt?: number
}
```

**Step 2: Create check + unlock logic**
After each workout save, check if any new achievement condition is met.

**Step 3: Show badges on profile**

**Step 4: Show unlock notification**

**Step 5: Commit**
```
feat: achievements/badges system with auto-unlock
```

---

## Final: Build, Deploy & Verify

### Task 16: Final Build + Deploy

**Step 1: Run `npm run build` — fix any TS errors**

**Step 2: Deploy Firestore rules**
```bash
npx firebase deploy --only firestore:rules
```

**Step 3: Deploy hosting**
```bash
npx firebase deploy --only hosting
```

**Step 4: Test live app at https://fitsocial-7b10a.web.app**

**Step 5: Commit final state**
```
chore: production build + deploy
```
