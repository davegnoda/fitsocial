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
  sports?: string[]
  stepsGoal?: number
  lastActive?: string
  createdAt: number
}

export interface Activity {
  date: string
  steps: number
  calories: number
  distance: number
  heartRate?: number
  heartRateMax?: number
  hrZoneMinutes?: HrZoneMinutes  // time spent in each HR zone (from smartwatch)
  activeMinutes?: number         // total active minutes (from smartwatch)
  sleep?: number
  source?: 'manual' | DeviceProvider
  verified: boolean              // true only if from smartwatch
  preWorkoutMood?: 'stanco' | 'normale' | 'carico'
  rpe?: number // Rate of Perceived Exertion 1-10 (post-workout)
  workouts: Workout[]
}

export interface HrZoneMinutes {
  zone1_warmup: number    // 50-60% max HR
  zone2_fat_burn: number  // 60-70% max HR
  zone3_cardio: number    // 70-80% max HR
  zone4_peak: number      // 80-90% max HR
  zone5_max: number       // 90-100% max HR
}

export interface WeightEntry {
  date: string
  weight: number
  bodyFat?: number
}

export interface InjuryLog {
  date: string
  bodyPart: string
  intensity: 1 | 2 | 3 | 4 | 5
}

export interface ExerciseSet {
  kg: number
  reps: number
}

export interface ExerciseEntry {
  name: string
  sets: ExerciseSet[]
}

export interface Workout {
  type: 'running' | 'cycling' | 'walking' | 'gym' | 'hiit' | 'other'
  duration: number
  warmUpMins?: number
  coolDownMins?: number
  distance?: number
  gpsPath?: GpsPoint[]
  verified: boolean
  exercises?: ExerciseEntry[]
}

export interface ExercisePR {
  name: string
  maxWeight: number
  maxVolume: number // best single-set volume (kg × reps)
  estimated1RM: number
  date: string
}

export interface BodyMeasurement {
  date: string
  chest?: number
  waist?: number
  hips?: number
  bicepL?: number
  bicepR?: number
  thighL?: number
  thighR?: number
}

export interface GpsPoint {
  lat: number
  lng: number
  timestamp: number
}

export type ChallengeMetric = 'distance' | 'active_minutes' | 'calories' | 'hr_zone_minutes' | 'workouts'
export type ChallengeScoringMode = 'improvement' | 'consistency' | 'zone_training' | 'composite'

export interface Challenge {
  id: string
  title: string
  type: ChallengeMetric
  scoringMode: ChallengeScoringMode
  period: 'daily' | 'weekly' | 'monthly'
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'all'
  target?: number
  participants: string[]
  prize: Prize
  leaderboard: LeaderboardEntry[]
  startDate: number
  endDate: number
  verifiedOnly: true // challenges ALWAYS require smartwatch — enforced
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
  verified: true // always true — only verified data counts
  improvementPct?: number   // % improvement vs personal baseline
  consistencyDays?: number  // consecutive days hitting target
  hrZoneMinutes?: number    // minutes in target HR zone
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

export interface AppNotification {
  id: string
  type: 'friend_request' | 'challenge_invite' | 'achievement' | 'reaction' | 'system'
  title: string
  body: string
  read: boolean
  createdAt: number
  data?: Record<string, string>
}

export interface Achievement {
  id: string
  unlockedAt: number
}

export interface FeedEntry {
  id: string
  userId: string
  userName: string
  date: string
  workoutTypes: string[]
  steps: number
  calories: number
  distance: number
  duration: number
  reactions: Record<string, string[]>
  createdAt: number
}

// --- Phase 1: New types ---

export type DeviceProvider = 'apple_health' | 'google_fit' | 'samsung_health' | 'fitbit' | 'garmin'

export interface ConnectedDevice {
  provider: DeviceProvider
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
  type: ChallengeMetric
  scoringMode: ChallengeScoringMode
  duration: '24h' | '48h' | '7d'
  status: 'pending' | 'active' | 'completed'
  bet?: { amount: number; currency: string }
  scores: Record<string, number>
  improvementScores?: Record<string, number>  // % improvement per user
  winnerId?: string
  verifiedOnly: true // always requires smartwatch
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
