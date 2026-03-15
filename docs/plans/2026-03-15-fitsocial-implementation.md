# FitSocial Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Costruire FitSocial — social network fitness universale con sfide, premi, GPS, community locale e AI coach, dall'MVP web fino all'app mobile con pool prize in denaro.

**Architecture:** Web MVP in React + Firebase per validare velocemente, poi Flutter mobile per integrazione smartwatch nativa. Firebase gestisce auth, database (Firestore), funzioni serverless e storage. Web e mobile condividono lo stesso backend — nessuna esportazione dati manuale.

**Tech Stack:** React 18, TypeScript, Firebase 10 (Auth + Firestore + Functions + Realtime DB + Storage), Tailwind CSS, Flutter 3, Google Maps API, Stripe, Claude API

---

## FASE 1 — MVP Web (Mesi 1-3)
*Obiettivo: app web funzionante con le 5 funzioni core*

---

### Task 1: Setup Progetto React + Firebase

**Files:**
- Create: `web/package.json`
- Create: `web/src/main.tsx`
- Create: `web/src/firebase.ts`
- Create: `web/.env.example`

**Step 1: Inizializza progetto React con TypeScript**

```bash
cd "App Fitness"
npm create vite@latest web -- --template react-ts
cd web
npm install
```

**Step 2: Installa dipendenze Firebase e UI**

```bash
npm install firebase
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 3: Crea file configurazione Firebase**

```typescript
// web/src/firebase.ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const realtimeDb = getDatabase(app)
export const storage = getStorage(app)
```

**Step 4: Crea `.env.example`**

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=
VITE_GOOGLE_MAPS_API_KEY=
```

**Step 5: Crea progetto Firebase**
1. Vai su https://console.firebase.google.com
2. Crea nuovo progetto "fitsocial"
3. Abilita Authentication (Email/Password + Google + Apple)
4. Crea database Firestore in modalità test
5. Crea Realtime Database
6. Copia le credenziali nel file `.env`

**Step 6: Avvia dev server e verifica**

```bash
npm run dev
```
Atteso: app React base visibile su http://localhost:5173

**Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: setup React + Firebase project"
```

---

### Task 2: Autenticazione Utenti

**Files:**
- Create: `web/src/contexts/AuthContext.tsx`
- Create: `web/src/pages/LoginPage.tsx`
- Create: `web/src/pages/RegisterPage.tsx`
- Create: `web/src/components/ProtectedRoute.tsx`

**Step 1: Crea AuthContext**

```typescript
// web/src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, GoogleAuthProvider,
  signInWithPopup } from 'firebase/auth'
import { auth } from '../firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  const login = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password).then(() => {})

  const register = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password).then(() => {})

  const loginWithGoogle = () =>
    signInWithPopup(auth, new GoogleAuthProvider()).then(() => {})

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

**Step 2: Crea pagina Login**

```typescript
// web/src/pages/LoginPage.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('Email o password non validi')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-6">FitSocial</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg px-4 py-2" required />
          <input type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded-lg px-4 py-2" required />
          <button type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700">
            Accedi
          </button>
        </form>
        <button onClick={loginWithGoogle}
          className="w-full mt-3 border rounded-lg py-2 font-semibold hover:bg-gray-50">
          Continua con Google
        </button>
        <p className="text-center mt-4 text-sm">
          Non hai un account? <Link to="/register" className="text-blue-600">Registrati</Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 3: Crea ProtectedRoute**

```typescript
// web/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" />
}
```

**Step 4: Setup Router in main.tsx**

```typescript
// web/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
```

**Step 5: Installa react-router-dom**

```bash
npm install react-router-dom
```

**Step 6: Testa login manualmente**
- Apri http://localhost:5173
- Registra un account
- Verifica redirect a /dashboard
- Verifica che logout funzioni

**Step 7: Commit**

```bash
git add .
git commit -m "feat: authentication with email and Google"
```

---

### Task 3: Profilo Utente + Firestore Schema

**Files:**
- Create: `web/src/types/index.ts`
- Create: `web/src/services/userService.ts`
- Create: `web/src/hooks/useUser.ts`

**Step 1: Definisci i tipi TypeScript**

```typescript
// web/src/types/index.ts
export interface UserProfile {
  uid: string
  name: string
  email: string
  avatar?: string
  city: string
  country: string
  level: number
  xp: number
  streak: number
  connectedDevices: string[]
  plan: 'free' | 'premium'
  createdAt: number
}

export interface Activity {
  date: string // YYYY-MM-DD
  steps: number
  calories: number
  distance: number // km
  heartRate?: number
  sleep?: number // ore
  workouts: Workout[]
}

export interface Workout {
  type: 'running' | 'cycling' | 'walking' | 'gym' | 'hiit' | 'other'
  duration: number // minuti
  distance?: number
  gpsPath?: GpsPoint[]
  verified: boolean
}

export interface GpsPoint {
  lat: number
  lng: number
  timestamp: number
}

export interface Challenge {
  id: string
  type: 'steps' | 'calories' | 'distance' | 'workouts'
  period: 'daily' | 'weekly' | 'monthly'
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  participants: string[]
  prize: Prize
  leaderboard: LeaderboardEntry[]
  startDate: number
  endDate: number
}

export interface Prize {
  type: 'sponsored' | 'pool'
  value: string
  brandName?: string
  amount?: number
}

export interface LeaderboardEntry {
  userId: string
  userName: string
  score: number
  verified: boolean
}

export interface Route {
  id: string
  createdBy: string
  city: string
  gpsPoints: GpsPoint[]
  distance: number
  elevation: number
  sport: 'running' | 'cycling' | 'walking' | 'hiking'
  popularity: number
}
```

**Step 2: Crea userService**

```typescript
// web/src/services/userService.ts
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { UserProfile } from '../types'

export async function createUserProfile(uid: string, data: Partial<UserProfile>) {
  await setDoc(doc(db, 'users', uid), {
    uid,
    level: 1,
    xp: 0,
    streak: 0,
    connectedDevices: [],
    plan: 'free',
    createdAt: Date.now(),
    ...data,
  })
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(db, 'users', uid), data)
}
```

**Step 3: Crea hook useUser**

```typescript
// web/src/hooks/useUser.ts
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUserProfile } from '../services/userService'
import { UserProfile } from '../types'

export function useUser() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    getUserProfile(user.uid).then(p => {
      setProfile(p)
      setLoading(false)
    })
  }, [user])

  return { profile, loading }
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: user profile types and Firestore service"
```

---

### Task 4: Dashboard Attività

**Files:**
- Create: `web/src/pages/DashboardPage.tsx`
- Create: `web/src/components/ActivityCard.tsx`
- Create: `web/src/components/StatsRing.tsx`
- Create: `web/src/services/activityService.ts`

**Step 1: Crea activityService**

```typescript
// web/src/services/activityService.ts
import { doc, setDoc, getDoc, collection, getDocs, orderBy, query, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { Activity } from '../types'

export async function getTodayActivity(userId: string): Promise<Activity | null> {
  const today = new Date().toISOString().split('T')[0]
  const snap = await getDoc(doc(db, 'users', userId, 'activities', today))
  return snap.exists() ? (snap.data() as Activity) : null
}

export async function saveActivity(userId: string, activity: Activity) {
  await setDoc(doc(db, 'users', userId, 'activities', activity.date), activity)
}

export async function getWeeklyActivities(userId: string): Promise<Activity[]> {
  const q = query(
    collection(db, 'users', userId, 'activities'),
    orderBy('date', 'desc'),
    limit(7)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Activity)
}
```

**Step 2: Crea ActivityCard component**

```typescript
// web/src/components/ActivityCard.tsx
interface ActivityCardProps {
  icon: string
  label: string
  value: number
  unit: string
  goal: number
  color: string
}

export default function ActivityCard({ icon, label, value, unit, goal, color }: ActivityCardProps) {
  const percent = Math.min((value / goal) * 100, 100)
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full`}
          style={{ backgroundColor: color + '20', color }}>
          {Math.round(percent)}%
        </span>
      </div>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500">{unit} · obiettivo {goal.toLocaleString()}</p>
      <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
      <div className="mt-3 bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
```

**Step 3: Crea DashboardPage**

```typescript
// web/src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { getTodayActivity } from '../services/activityService'
import ActivityCard from '../components/ActivityCard'
import { Activity } from '../types'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { profile } = useUser()
  const [activity, setActivity] = useState<Activity | null>(null)

  useEffect(() => {
    if (user) getTodayActivity(user.uid).then(setActivity)
  }, [user])

  const stats = [
    { icon: '👟', label: 'Passi', value: activity?.steps ?? 0, unit: 'passi', goal: 10000, color: '#3b82f6' },
    { icon: '🔥', label: 'Calorie', value: activity?.calories ?? 0, unit: 'kcal', goal: 500, color: '#f97316' },
    { icon: '📍', label: 'Distanza', value: activity?.distance ?? 0, unit: 'km', goal: 8, color: '#10b981' },
    { icon: '❤️', label: 'Battito', value: activity?.heartRate ?? 0, unit: 'bpm', goal: 80, color: '#ef4444' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Ciao, {profile?.name ?? user?.email} 👋</h1>
          <p className="text-sm text-gray-500">Livello {profile?.level ?? 1} · {profile?.streak ?? 0} giorni streak 🔥</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Esci</button>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold mb-4">Attività di oggi</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => <ActivityCard key={s.label} {...s} />)}
        </div>
        <div className="mt-8 bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-gray-500 text-sm text-center">
            📱 Collega l'app mobile per sincronizzare automaticamente i dati dal tuo smartwatch
          </p>
        </div>
      </main>
    </div>
  )
}
```

**Step 4: Testa visivamente**
- Apri il dashboard
- Verifica che le card appaiano con 0 valori
- Inserisci manualmente un'activity su Firestore via console Firebase e ricarica

**Step 5: Commit**

```bash
git add .
git commit -m "feat: dashboard with activity cards"
```

---

### Task 5: Sistema Amici

**Files:**
- Create: `web/src/services/friendService.ts`
- Create: `web/src/pages/FriendsPage.tsx`
- Create: `web/src/components/FriendCard.tsx`

**Step 1: Crea friendService**

```typescript
// web/src/services/friendService.ts
import { doc, setDoc, getDocs, collection, query, where, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { UserProfile } from '../types'

export async function sendFriendRequest(fromId: string, toId: string) {
  await setDoc(doc(db, 'users', fromId, 'friends', toId), { status: 'pending', direction: 'sent' })
  await setDoc(doc(db, 'users', toId, 'friends', fromId), { status: 'pending', direction: 'received' })
}

export async function acceptFriendRequest(userId: string, friendId: string) {
  await setDoc(doc(db, 'users', userId, 'friends', friendId), { status: 'accepted' })
  await setDoc(doc(db, 'users', friendId, 'friends', userId), { status: 'accepted' })
}

export async function getFriends(userId: string): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'friends'))
  const accepted = snap.docs.filter(d => d.data().status === 'accepted')
  const profiles = await Promise.all(accepted.map(d => getDoc(doc(db, 'users', d.id))))
  return profiles.filter(p => p.exists()).map(p => p.data() as UserProfile)
}
```

**Step 2: Crea FriendsPage**

```typescript
// web/src/pages/FriendsPage.tsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getFriends } from '../services/friendService'
import { UserProfile } from '../types'

export default function FriendsPage() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<UserProfile[]>([])

  useEffect(() => {
    if (user) getFriends(user.uid).then(setFriends)
  }, [user])

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h2 className="text-xl font-bold mb-6">I tuoi amici ({friends.length})</h2>
      {friends.length === 0 && (
        <p className="text-gray-500 text-center py-12">Nessun amico ancora. Invita qualcuno!</p>
      )}
      <div className="space-y-3">
        {friends.map(f => (
          <div key={f.uid} className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
              {f.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="font-semibold">{f.name}</p>
              <p className="text-sm text-gray-500">Livello {f.level} · {f.city}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: friends system with Firestore"
```

---

### Task 6: Sfide e Classifiche

**Files:**
- Create: `web/src/services/challengeService.ts`
- Create: `web/src/pages/ChallengesPage.tsx`
- Create: `web/src/components/LeaderboardCard.tsx`

**Step 1: Crea challengeService**

```typescript
// web/src/services/challengeService.ts
import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { Challenge } from '../types'

export async function createChallenge(challenge: Omit<Challenge, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'challenges'), challenge)
  return ref.id
}

export async function joinChallenge(challengeId: string, userId: string) {
  await updateDoc(doc(db, 'challenges', challengeId), {
    participants: arrayUnion(userId)
  })
}

export async function getActiveChallenges(): Promise<Challenge[]> {
  const now = Date.now()
  const q = query(collection(db, 'challenges'), where('endDate', '>', now))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge))
}

export async function updateLeaderboard(challengeId: string, userId: string, userName: string, score: number) {
  const challengeRef = doc(db, 'challenges', challengeId)
  // Cloud Function gestirà l'ordinamento - qui aggiorniamo solo il punteggio
  await updateDoc(challengeRef, {
    [`scores.${userId}`]: { userId, userName, score, verified: false }
  })
}
```

**Step 2: Crea LeaderboardCard**

```typescript
// web/src/components/LeaderboardCard.tsx
import { LeaderboardEntry } from '../types'

interface Props {
  entries: LeaderboardEntry[]
  currentUserId: string
}

const medals = ['🥇', '🥈', '🥉']

export default function LeaderboardCard({ entries, currentUserId }: Props) {
  const sorted = [...entries].sort((a, b) => b.score - a.score)
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {sorted.map((entry, i) => (
        <div key={entry.userId}
          className={`flex items-center px-4 py-3 border-b last:border-0 ${
            entry.userId === currentUserId ? 'bg-blue-50' : ''
          }`}>
          <span className="w-8 text-lg">{medals[i] ?? `${i + 1}`}</span>
          <div className="flex-1">
            <p className="font-semibold">{entry.userName}</p>
          </div>
          <p className="font-bold text-blue-600">{entry.score.toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Crea ChallengesPage**

```typescript
// web/src/pages/ChallengesPage.tsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getActiveChallenges, joinChallenge } from '../services/challengeService'
import LeaderboardCard from '../components/LeaderboardCard'
import { Challenge } from '../types'

export default function ChallengesPage() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])

  useEffect(() => { getActiveChallenges().then(setChallenges) }, [])

  const handleJoin = async (challengeId: string) => {
    if (!user) return
    await joinChallenge(challengeId, user.uid)
    getActiveChallenges().then(setChallenges)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h2 className="text-xl font-bold mb-6">Sfide Attive</h2>
      <div className="space-y-6">
        {challenges.map(c => {
          const isParticipant = user ? c.participants.includes(user.uid) : false
          return (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold capitalize">{c.type} {c.period}</h3>
                  <p className="text-sm text-gray-500">
                    🏆 Premio: {c.prize.value}
                    {c.prize.brandName && ` · ${c.prize.brandName}`}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  c.fitnessLevel === 'beginner' ? 'bg-green-100 text-green-700' :
                  c.fitnessLevel === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>{c.fitnessLevel}</span>
              </div>
              {isParticipant ? (
                <LeaderboardCard entries={c.leaderboard} currentUserId={user?.uid ?? ''} />
              ) : (
                <button onClick={() => handleJoin(c.id)}
                  className="w-full bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700">
                  Partecipa
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: challenges and leaderboard system"
```

---

### Task 7: Navigazione + Layout Principale

**Files:**
- Create: `web/src/components/Layout.tsx`
- Create: `web/src/components/NavBar.tsx`

**Step 1: Crea NavBar**

```typescript
// web/src/components/NavBar.tsx
import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/dashboard', icon: '🏠', label: 'Home' },
  { path: '/challenges', icon: '🏆', label: 'Sfide' },
  { path: '/community', icon: '📍', label: 'Community' },
  { path: '/friends', icon: '👥', label: 'Amici' },
  { path: '/profile', icon: '👤', label: 'Profilo' },
]

export default function NavBar() {
  const { pathname } = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2 flex justify-around">
      {navItems.map(item => (
        <Link key={item.path} to={item.path}
          className={`flex flex-col items-center text-xs gap-1 px-3 py-1 rounded-lg ${
            pathname === item.path ? 'text-blue-600 font-semibold' : 'text-gray-500'
          }`}>
          <span className="text-xl">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
```

**Step 2: Crea Layout**

```typescript
// web/src/components/Layout.tsx
import NavBar from './NavBar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20">
      {children}
      <NavBar />
    </div>
  )
}
```

**Step 3: Aggiorna routes per usare Layout**

Modifica `main.tsx` per wrappare tutte le pagine protette con `<Layout>`.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: bottom navigation and layout"
```

---

## FASE 2 — App Mobile Flutter + Funzioni Differenzianti (Mesi 4-7)

### Task 8: Setup Flutter + Firebase

```bash
flutter create mobile
cd mobile
flutter pub add firebase_core firebase_auth cloud_firestore
flutter pub add health  # per HealthKit + Health Connect
flutter pub add google_maps_flutter
flutterfire configure  # collega al progetto Firebase esistente
```

### Task 9: Integrazione HealthKit / Health Connect

**Files:**
- Create: `mobile/lib/services/health_service.dart`

```dart
// mobile/lib/services/health_service.dart
import 'package:health/health.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class HealthService {
  final _health = HealthFactory();

  Future<bool> requestPermissions() async {
    final types = [
      HealthDataType.STEPS,
      HealthDataType.CALORIES_BURNED,
      HealthDataType.DISTANCE_WALKING_RUNNING,
      HealthDataType.HEART_RATE,
      HealthDataType.SLEEP_ASLEEP,
    ];
    return await _health.requestAuthorization(types);
  }

  Future<Map<String, dynamic>> getTodayData() async {
    final now = DateTime.now();
    final midnight = DateTime(now.year, now.month, now.day);

    final steps = await _health.getTotalStepsInInterval(midnight, now) ?? 0;
    final data = await _health.getHealthDataFromTypes(midnight, now, [
      HealthDataType.CALORIES_BURNED,
      HealthDataType.HEART_RATE,
    ]);

    double calories = 0;
    double heartRate = 0;
    for (final point in data) {
      if (point.type == HealthDataType.CALORIES_BURNED) {
        calories += (point.value as NumericHealthValue).numericValue.toDouble();
      }
      if (point.type == HealthDataType.HEART_RATE) {
        heartRate = (point.value as NumericHealthValue).numericValue.toDouble();
      }
    }

    return {
      'steps': steps,
      'calories': calories.round(),
      'heartRate': heartRate.round(),
      'date': now.toIso8601String().split('T')[0],
    };
  }

  Future<void> syncToFirestore(String userId) async {
    final todayData = await getTodayData();
    await FirebaseFirestore.instance
        .collection('users')
        .doc(userId)
        .collection('activities')
        .doc(todayData['date'])
        .set(todayData, SetOptions(merge: true));
  }
}
```

### Task 10: GPS Tracking in Flutter

**Files:**
- Create: `mobile/lib/services/gps_service.dart`
- Create: `mobile/lib/pages/workout_tracking_page.dart`

Usa `geolocator` e `flutter_map` per tracking live con salvataggio percorso su Firestore.

### Task 11: Matchmaking Equo

**Files:**
- Create: `functions/src/matchmaking.ts` (Firebase Cloud Function)

```typescript
// Calcola fitness level basato su ultimi 30 giorni
export const calculateFitnessLevel = functions.firestore
  .document('users/{userId}/activities/{date}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId
    // Leggi ultimi 30 giorni di attività
    // Calcola media passi giornalieri
    // < 5000 = beginner, 5000-10000 = intermediate, > 10000 = advanced
    // Aggiorna users/{userId}.fitnessLevel
  })
```

### Task 12: Allenati Insieme Live

Usa Firebase Realtime Database per sync posizione GPS in tempo reale durante workout condiviso.

```typescript
// Struttura Realtime DB
liveWorkouts/{sessionId}/{userId}: {
  lat: number,
  lng: number,
  pace: number,
  timestamp: number
}
```

### Task 13: AI Coach (Claude API)

**Files:**
- Create: `functions/src/aiCoach.ts`

```typescript
export const getAICoachAdvice = functions.https.onCall(async (data, context) => {
  const { userId } = data
  // Leggi ultimi 30 giorni attività da Firestore
  // Invia a Claude API con prompt strutturato
  // Ritorna suggerimento personalizzato
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Sei un coach fitness. Analizza questi dati degli ultimi 30 giorni: ${JSON.stringify(activityData)}. Dai un consiglio specifico e motivante in italiano in 2-3 frasi.`
    }]
  })
  return { advice: response.content[0].text }
})
```

### Task 14: Fitness Passport

**Files:**
- Create: `web/src/pages/PassportPage.tsx`

Pagina pubblica con URL `/passport/{userId}` che mostra:
- Km totali nella vita
- Record personali verificati
- Sfide vinte
- Badge ottenuti
- Condivisibile come link o card immagine

---

## FASE 3 — Monetizzazione Avanzata + B2B (Mesi 8-12)

### Task 15: Anti-Cheat Engine

**Files:**
- Create: `functions/src/antiCheat.ts`

```typescript
// Cross-verifica dati attività per sfide con soldi
// Controlla: velocità GPS realistiche, HR coerente con attività,
// dati smartwatch presenti, nessuna anomalia temporale
export const verifyActivity = functions.firestore
  .document('users/{userId}/activities/{date}')
  .onWrite(async (change, context) => {
    const activity = change.after.data()
    const antiCheatScore = calculateAntiCheatScore(activity)
    // 0.0 = sospetto, 1.0 = verificato
    await change.after.ref.update({ antiCheatScore })
  })
```

### Task 16: Pool Prize con Stripe

**Files:**
- Create: `functions/src/payments.ts`
- Create: `web/src/pages/WalletPage.tsx`

Integrazione Stripe per:
- Deposito nel wallet utente
- Contributo a sfida (escrow)
- Distribuzione premio al vincitore verificato
- Ricevuta e storico transazioni

### Task 17: Corporate Wellness Dashboard

**Files:**
- Create: `web/src/pages/CorporateDashboard.tsx`
- Create: `functions/src/corporate.ts`

Dashboard B2B per HR manager con:
- Statistiche aggregate dipendenti (anonime per GDPR)
- Creazione sfide interne
- Report partecipazione mensile
- Esportazione CSV

---

## Regole Firestore Security (GDPR + Sicurezza)

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Un utente può leggere/scrivere solo i propri dati
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Profili base visibili agli amici
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    // Sfide pubbliche in lettura, scrittura solo per partecipanti
    match /challenges/{challengeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Variabili d'Ambiente Necessarie

```bash
# Firebase
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_DATABASE_URL

# Mappe
VITE_GOOGLE_MAPS_API_KEY

# AI (Cloud Functions)
ANTHROPIC_API_KEY

# Pagamenti (Fase 3)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

---

## Struttura Directory Finale

```
App Fitness/
├── web/                    # React Web App
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   └── package.json
├── mobile/                 # Flutter App
│   └── lib/
│       ├── pages/
│       └── services/
├── functions/              # Firebase Cloud Functions
│   └── src/
│       ├── aiCoach.ts
│       ├── antiCheat.ts
│       ├── matchmaking.ts
│       └── payments.ts
├── docs/
│   └── plans/
│       ├── 2026-03-15-fitsocial-design.md
│       └── 2026-03-15-fitsocial-implementation.md
└── firestore.rules
```
