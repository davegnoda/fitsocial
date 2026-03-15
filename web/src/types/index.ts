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
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced'
  createdAt: number
}

export interface Activity {
  date: string
  steps: number
  calories: number
  distance: number
  heartRate?: number
  sleep?: number
  workouts: Workout[]
}

export interface Workout {
  type: 'running' | 'cycling' | 'walking' | 'gym' | 'hiit' | 'other'
  duration: number
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
  title: string
  type: 'steps' | 'calories' | 'distance' | 'workouts'
  period: 'daily' | 'weekly' | 'monthly'
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'all'
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

export interface AppRoute {
  id: string
  createdBy: string
  city: string
  gpsPoints: GpsPoint[]
  distance: number
  elevation: number
  sport: 'running' | 'cycling' | 'walking' | 'hiking'
  popularity: number
}

export interface FriendRequest {
  status: 'pending' | 'accepted'
  direction: 'sent' | 'received'
}
