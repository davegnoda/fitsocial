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

export type { ActivityData }
