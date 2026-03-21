interface HrZoneMinutes {
  zone1_warmup: number
  zone2_fat_burn: number
  zone3_cardio: number
  zone4_peak: number
  zone5_max: number
}

interface ActivityData {
  date: string
  steps: number
  calories: number
  distance: number
  activeMinutes?: number
  heartRate?: number
  heartRateMax?: number
  hrZoneMinutes?: HrZoneMinutes
  workouts: {
    type: string
    duration: number
    distance?: number
    exercises?: { name: string; sets: { kg: number; reps: number }[] }[]
  }[]
  source?: string
  verified?: boolean
}

/** Calculate XP gained from an activity (only verified data gets full XP) */
export function calculateXP(activity: ActivityData): number {
  if (!activity.verified) return 0 // unverified = 0 XP
  let xp = 0
  xp += Math.floor(activity.distance * 10)       // 10 XP per km
  xp += Math.floor((activity.activeMinutes ?? 0) / 5) * 3 // 3 XP per 5 active min
  xp += Math.floor(activity.calories / 10)        // 1 XP per 10 kcal
  for (const w of activity.workouts) {
    xp += Math.floor(w.duration / 5) * 2          // 2 XP per 5 min workout
  }
  // HR zone bonus: time in zone 3-5 (real effort) gets extra XP
  if (activity.hrZoneMinutes) {
    const hardMinutes = activity.hrZoneMinutes.zone3_cardio +
      activity.hrZoneMinutes.zone4_peak +
      activity.hrZoneMinutes.zone5_max
    xp += hardMinutes * 2 // 2 XP per minute of real cardio effort
  }
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

// ─── CHALLENGE SCORING MODES ───

type ScoringMode = 'improvement' | 'consistency' | 'zone_training' | 'composite'
type ChallengeMetric = 'distance' | 'active_minutes' | 'calories' | 'hr_zone_minutes' | 'workouts'

/** Get raw metric value from verified activity data */
export function getMetricValue(metric: ChallengeMetric, activity: ActivityData): number {
  if (!activity.verified) return 0 // ONLY verified data counts
  switch (metric) {
    case 'distance': return activity.distance
    case 'active_minutes': return activity.activeMinutes ?? 0
    case 'calories': return activity.calories
    case 'hr_zone_minutes': {
      if (!activity.hrZoneMinutes) return 0
      // Only zone 3+ counts (real effort, not walking)
      return activity.hrZoneMinutes.zone3_cardio +
        activity.hrZoneMinutes.zone4_peak +
        activity.hrZoneMinutes.zone5_max
    }
    case 'workouts': return activity.workouts.filter(w => w.duration >= 15).length
    default: return 0
  }
}

/**
 * IMPROVEMENT scoring: how much did the user improve vs their baseline?
 * Baseline = average of the user's last 14 days before the challenge started.
 * Score = % improvement. e.g. baseline 5km, today 7km = +40% = 40 points.
 * This makes challenges FAIR — a beginner improving 3→5km (+66%) beats
 * a pro doing 10→11km (+10%).
 */
export function calculateImprovementScore(
  currentValue: number,
  baseline: number,
): number {
  if (baseline <= 0) return currentValue > 0 ? 100 : 0
  const improvement = ((currentValue - baseline) / baseline) * 100
  return Math.max(0, Math.round(improvement)) // can't go negative
}

/**
 * CONSISTENCY scoring: how many consecutive days did the user hit the target?
 * More consistent = higher score. Missing a day resets the multiplier.
 * Score = days_met + streak_bonus (streak^1.5 for exponential reward)
 */
export function calculateConsistencyScore(
  daysMetTarget: number,
  currentStreak: number,
): number {
  const baseScore = daysMetTarget * 10
  const streakBonus = Math.round(Math.pow(currentStreak, 1.5) * 5)
  return baseScore + streakBonus
}

/**
 * ZONE TRAINING scoring: minutes spent in target HR zones (3-5).
 * This is IMPOSSIBLE to fake — requires real-time heart rate from smartwatch.
 * Walking doesn't count. Only genuine cardiovascular effort.
 */
export function calculateZoneScore(hrZones: HrZoneMinutes | undefined): number {
  if (!hrZones) return 0
  return (
    hrZones.zone3_cardio * 1 +    // 1 point per min in cardio zone
    hrZones.zone4_peak * 2 +      // 2 points per min in peak zone
    hrZones.zone5_max * 3          // 3 points per min in max zone
  )
}

/**
 * COMPOSITE scoring: weighted combination of all factors.
 * 40% consistency + 30% improvement + 20% effort (HR zones) + 10% volume
 * This is the most balanced and hardest to game.
 */
export function calculateCompositeScore(params: {
  improvementPct: number
  consistencyDays: number
  currentStreak: number
  hrZoneMinutes: number
  rawVolume: number
  maxVolume: number
}): number {
  const consistency = calculateConsistencyScore(params.consistencyDays, params.currentStreak)
  const improvement = Math.min(params.improvementPct, 200) // cap at 200% improvement
  const effort = params.hrZoneMinutes
  const volumePct = params.maxVolume > 0 ? (params.rawVolume / params.maxVolume) * 100 : 0

  return Math.round(
    consistency * 0.4 +
    improvement * 0.3 +
    effort * 0.2 +
    volumePct * 0.1
  )
}

/**
 * Calculate challenge score based on scoring mode.
 * All modes require verified=true data. Manual data = 0 points.
 */
export function calculateChallengeScore(
  mode: ScoringMode,
  metric: ChallengeMetric,
  activity: ActivityData,
  baseline: number,
  daysMetTarget: number,
  currentStreak: number,
  maxVolumeInChallenge: number,
): number {
  if (!activity.verified) return 0

  const value = getMetricValue(metric, activity)

  switch (mode) {
    case 'improvement':
      return calculateImprovementScore(value, baseline)

    case 'consistency':
      return calculateConsistencyScore(daysMetTarget, currentStreak)

    case 'zone_training':
      return calculateZoneScore(activity.hrZoneMinutes)

    case 'composite':
      return calculateCompositeScore({
        improvementPct: calculateImprovementScore(value, baseline),
        consistencyDays: daysMetTarget,
        currentStreak,
        hrZoneMinutes: activity.hrZoneMinutes
          ? activity.hrZoneMinutes.zone3_cardio + activity.hrZoneMinutes.zone4_peak + activity.hrZoneMinutes.zone5_max
          : 0,
        rawVolume: value,
        maxVolume: maxVolumeInChallenge,
      })

    default:
      return value
  }
}

/** Epley formula for estimated 1RM */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

export type { ActivityData, HrZoneMinutes, ScoringMode, ChallengeMetric }
