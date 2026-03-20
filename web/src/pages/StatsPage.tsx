import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { logWeight, getWeightHistory, logInjury, getRecentInjuries, logMeasurement, getMeasurementHistory } from '../services/bodyService'
import { getPersonalRecords } from '../services/prService'
import type { PersonalRecords } from '../services/prService'
import Layout from '../components/Layout'
import type { Activity, WeightEntry, InjuryLog, BodyMeasurement } from '../types'

const TYPE_META: Record<string, { emoji: string; color: string; label: string }> = {
  running: { emoji: '🏃', color: '#0D9488', label: 'Corsa' },
  cycling: { emoji: '🚴', color: '#3B82F6', label: 'Ciclismo' },
  gym:     { emoji: '💪', color: '#7C3AED', label: 'Palestra' },
  hiit:    { emoji: '⚡', color: '#EA580C', label: 'HIIT' },
  walking: { emoji: '🚶', color: '#059669', label: 'Camminata' },
  other:   { emoji: '🎯', color: '#6B7280', label: 'Altro' },
}

const MUSCLE_MAP: Record<string, string[]> = {
  running: ['gambe', 'cardio'],
  cycling: ['gambe', 'cardio'],
  walking: ['gambe', 'cardio'],
  hiit:    ['gambe', 'core', 'cardio'],
  gym:     ['braccia', 'petto', 'gambe', 'core'],
  other:   ['gambe', 'core'],
}

const BODY_PARTS = ['Ginocchio sin.', 'Ginocchio des.', 'Schiena', 'Spalla', 'Caviglia', 'Flessore', 'Polso', 'Collo']

/* ── SVG Radar chart (5-axis) ── */
function RadarChart({ scores }: { scores: number[] }) {
  const cx = 120, cy = 110, r = 62
  const axes = 5
  const angleStep = (2 * Math.PI) / axes
  const offset = -Math.PI / 2

  const point = (i: number, pct: number) => {
    const a = offset + i * angleStep
    return [cx + r * pct * Math.cos(a), cy + r * pct * Math.sin(a)]
  }

  const gridLevels = [0.25, 0.5, 0.75, 1]
  const labels = ['CARDIO', 'FORZA', 'RESISTENZA', 'VELOCITÀ', 'RECUPERO']
  const labelOffsets = [
    [0, -12], [16, 0], [10, 12], [-10, 12], [-16, 0],
  ]

  return (
    <svg viewBox="0 0 240 230" style={{ width: '100%', maxWidth: '280px' }}>
      {/* Grid lines */}
      {gridLevels.map(level => (
        <polygon key={level}
          points={Array.from({ length: axes }, (_, i) => point(i, level).join(',')).join(' ')}
          fill="none" stroke="var(--border)" strokeWidth={level === 1 ? 1.5 : 0.8} opacity={0.5}
        />
      ))}
      {/* Axis lines */}
      {Array.from({ length: axes }, (_, i) => {
        const [x, y] = point(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={0.6} opacity={0.4} />
      })}
      {/* Data polygon */}
      <polygon
        points={scores.map((s, i) => point(i, s / 100).join(',')).join(' ')}
        fill="rgba(124,58,237,0.25)" stroke="#7C3AED" strokeWidth={2}
      />
      {/* Data dots */}
      {scores.map((s, i) => {
        const [x, y] = point(i, s / 100)
        return <circle key={i} cx={x} cy={y} r={3.5} fill="#7C3AED" />
      })}
      {/* Labels */}
      {labels.map((label, i) => {
        const [x, y] = point(i, 1.22)
        return (
          <text key={i} x={x + labelOffsets[i][0]} y={y + labelOffsets[i][1]}
            textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: '8px', fontWeight: 700, fill: 'var(--text-sub)', letterSpacing: '0.06em' }}>
            {label}
          </text>
        )
      })}
    </svg>
  )
}

/* ── Circular Gauge ── */
function RecoveryGauge({ score }: { score: number }) {
  const r = 38, circ = 2 * Math.PI * r
  const pct = score / 100
  const color = score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444'
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border)" strokeWidth="7" opacity={0.3} />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="48" y="44" textAnchor="middle" style={{ fontSize: '22px', fontWeight: 800, fill: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
        {score}
      </text>
      <text x="48" y="60" textAnchor="middle" style={{ fontSize: '8px', fontWeight: 600, fill: 'var(--text-sub)', letterSpacing: '0.04em' }}>
        / 100
      </text>
    </svg>
  )
}

/* ── HR Zone Bar ── */
function ZoneBar({ zones }: { zones: { label: string; pct: number; color: string }[] }) {
  return (
    <div>
      <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', gap: '2px' }}>
        {zones.map((z, i) => (
          <div key={i} style={{ flex: z.pct, background: z.color, transition: 'flex 0.5s ease' }} title={`${z.label}: ${z.pct}%`} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {zones.map((z, i) => (
          <span key={i} style={{ fontSize: '9px', color: z.color, fontWeight: 700 }}>{z.label}</span>
        ))}
      </div>
    </div>
  )
}

export default function StatsPage() {
  const { user } = useAuth()
  const { profile } = useUser()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [injuries, setInjuries] = useState<InjuryLog[]>([])
  const [weightKg, setWeightKg] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [showWeightForm, setShowWeightForm] = useState(false)
  const [injPart, setInjPart] = useState('')
  const [injIntensity, setInjIntensity] = useState<1|2|3|4|5>(1)
  const [showInjForm, setShowInjForm] = useState(false)
  const [savingWeight, setSavingWeight] = useState(false)
  const [savingInj, setSavingInj] = useState(false)
  const [prs, setPrs] = useState<PersonalRecords | null>(null)
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [showMeasForm, setShowMeasForm] = useState(false)
  const [measChest, setMeasChest] = useState('')
  const [measWaist, setMeasWaist] = useState('')
  const [measHips, setMeasHips] = useState('')
  const [measBicep, setMeasBicep] = useState('')
  const [measThigh, setMeasThigh] = useState('')
  const [savingMeas, setSavingMeas] = useState(false)
  const [rangeDays, setRangeDays] = useState(7)
  const [waterGlasses, setWaterGlasses] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem('fitsocial_water') ?? '{}'); return d.date === new Date().toISOString().slice(0, 10) ? (d.count ?? 0) : 0 }
    catch { return 0 }
  })

  const addWater = () => {
    const today = new Date().toISOString().slice(0, 10)
    const next = Math.min(waterGlasses + 1, 12)
    setWaterGlasses(next)
    localStorage.setItem('fitsocial_water', JSON.stringify({ date: today, count: next }))
  }

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'activities'), orderBy('date', 'desc'))
    const timeout = setTimeout(() => setLoading(false), 2500)
    getDocs(q)
      .then(snap => { clearTimeout(timeout); setActivities(snap.docs.map(d => d.data() as Activity)); setLoading(false) })
      .catch(() => { clearTimeout(timeout); setLoading(false) })
    getWeightHistory(user.uid).then(setWeights).catch(() => {})
    getRecentInjuries(user.uid).then(setInjuries).catch(() => {})
    getPersonalRecords(user.uid).then(p => p && setPrs(p)).catch(() => {})
    getMeasurementHistory(user.uid).then(setMeasurements).catch(() => {})
  }, [user])

  /* ── Computed stats ── */
  const now = Date.now()
  const todayStr = new Date().toISOString().slice(0, 10)
  const filtered = activities.filter(a => now - new Date(a.date).getTime() < rangeDays * 86_400_000)
  const last30 = activities.filter(a => now - new Date(a.date).getTime() < 30 * 86_400_000)

  // Range dates for header
  const rangeStart = new Date(now - (rangeDays - 1) * 86_400_000)
  const rangeEnd = new Date()
  const fmtDate = (d: Date) => `${d.getDate()} ${d.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}`
  const dateRangeLabel = `${fmtDate(rangeStart)} — ${fmtDate(rangeEnd)}`

  // Totals
  const totalCal = filtered.reduce((s, a) => s + (a.calories ?? 0), 0)
  const totalDist = filtered.reduce((s, a) => s + (a.distance ?? 0), 0)
  const totalMinutes = filtered.reduce((s, a) => s + (a.workouts ?? []).reduce((ss, w) => ss + (w.duration ?? 0), 0), 0)
  const avgHR = (() => {
    const hrs = filtered.filter(a => a.heartRate && a.heartRate > 0).map(a => a.heartRate!)
    return hrs.length > 0 ? Math.round(hrs.reduce((s, h) => s + h, 0) / hrs.length) : 0
  })()
  const totalWeight = filtered.reduce((s, a) => s + (a.workouts ?? []).reduce((ss, w) =>
    ss + (w.exercises ?? []).reduce((sss, ex) => sss + ex.sets.reduce((ssss, set) => ssss + set.kg * set.reps, 0), 0), 0), 0)

  // Sleep average
  const sleepEntries = filtered.filter(a => a.sleep != null)
  const avgSleep = sleepEntries.length > 0 ? sleepEntries.reduce((s, a) => s + (a.sleep ?? 0), 0) / sleepEntries.length : 0

  // Recovery score
  const streak = profile?.streak ?? 0
  const recoveryBase = 65
  const recoveryStreak = Math.min(20, streak * 1.5)
  const recoverySleep = avgSleep >= 7 ? 15 : avgSleep >= 6 ? 8 : 0
  const recoveryScore = Math.min(100, Math.round(recoveryBase + recoverySleep - (streak > 14 ? 10 : 0) + (streak <= 7 ? recoveryStreak : 0)))

  // DNA Sportivo scores
  const cardioScore = Math.min(100, Math.round(filtered.filter(a => (a.workouts ?? []).some(w => ['running','cycling','walking'].includes(w.type))).length * 18 + 25))
  const forzaScore = Math.min(100, Math.round(filtered.filter(a => (a.workouts ?? []).some(w => ['gym'].includes(w.type))).length * 20 + 20))
  const resistenzaScore = Math.min(100, Math.round(Math.min(totalMinutes / 5, 40) + 20))
  const velocitaScore = Math.min(100, Math.round(filtered.filter(a => (a.workouts ?? []).some(w => ['hiit','running'].includes(w.type))).length * 16 + 22))
  const recuperoScore = Math.min(100, recoveryScore)
  const dnaScores = [cardioScore, forzaScore, resistenzaScore, velocitaScore, recuperoScore]
  const dnaOverall = Math.round(dnaScores.reduce((s, v) => s + v, 0) / dnaScores.length)

  // Muscle fatigue
  const muscleHits: Record<string, number> = { gambe: 0, cardio: 0, core: 0, braccia: 0, petto: 0 }
  filtered.forEach(a => (a.workouts ?? []).forEach(w => (MUSCLE_MAP[w.type] ?? []).forEach(g => { if (g in muscleHits) muscleHits[g]++ })))
  const maxMuscle = Math.max(1, ...Object.values(muscleHits))

  // Fatigue map (higher hits = more fatigue)
  const fatigueGroups = [
    { label: 'Gambe (Quad/Ham)', keys: ['gambe'], color: '#EF4444' },
    { label: 'Core & Schiena', keys: ['core'], color: '#F59E0B' },
    { label: 'Parte Superiore', keys: ['braccia', 'petto'], color: '#3B82F6' },
  ].map(g => {
    const hits = g.keys.reduce((s, k) => s + (muscleHits[k] ?? 0), 0)
    const pct = Math.min(100, Math.round((hits / Math.max(1, maxMuscle)) * 100))
    const statusLabel = pct >= 70 ? 'AFFATICATE' : pct >= 40 ? 'RECUPERO' : 'FRESCA'
    const statusColor = pct >= 70 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#22C55E'
    const statusBg = pct >= 70 ? 'rgba(239,68,68,0.12)' : pct >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)'
    return { ...g, pct, statusLabel, statusColor, statusBg }
  })

  // VO2 Max estimate & Training load
  const vo2Max = (52 + (totalMinutes / 30) + (cardioScore / 10)).toFixed(1)
  const weeklyTSS = Math.round(totalMinutes * 2.8 + totalCal * 0.12)
  const hrZones = [
    { label: 'Z1-Z2 (Base)', pct: 35, color: '#3B82F6' },
    { label: 'Z3 (Tempo)', pct: 25, color: '#22C55E' },
    { label: 'Z4 (Soglia)', pct: 25, color: '#F59E0B' },
    { label: 'Z5 (Max)', pct: 15, color: '#EF4444' },
  ]

  // Records
  const maxSteps = Math.max(0, ...activities.map(a => a.steps))
  const maxDistance = Math.max(0, ...activities.map(a => a.distance))
  const totalWorkouts = activities.reduce((sum, a) => sum + (a.workouts?.length ?? 0), 0)
  const sortedDates = [...new Set(activities.map(a => a.date))].sort()
  let longestStreak = 0, currentStreak = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()
    if (diff <= 86_400_000) currentStreak++
    else currentStreak = 1
    longestStreak = Math.max(longestStreak, currentStreak)
  }
  if (sortedDates.length === 1) longestStreak = 1

  // Workout breakdown
  const workoutCounts: Record<string, number> = {}
  activities.forEach(a => (a.workouts ?? []).forEach(w => { workoutCounts[w.type] = (workoutCounts[w.type] ?? 0) + 1 }))
  const maxWCount = Math.max(1, ...Object.values(workoutCounts))

  // Strength progression
  const exerciseSessions: Record<string, { date: string; volume: number; maxKg: number }[]> = {}
  activities.forEach(a => {
    ;(a.workouts ?? []).forEach(w => {
      ;(w.exercises ?? []).forEach(ex => {
        const volume = ex.sets.reduce((s, set) => s + set.kg * set.reps, 0)
        const maxKg = Math.max(...ex.sets.map(s => s.kg))
        if (!exerciseSessions[ex.name]) exerciseSessions[ex.name] = []
        exerciseSessions[ex.name].push({ date: a.date, volume, maxKg })
      })
    })
  })
  const topExercises = Object.entries(exerciseSessions).sort((a, b) => b[1].length - a[1].length).slice(0, 3)

  // 30-day chart
  const avgSteps = last30.length > 0 ? Math.round(last30.reduce((s, a) => s + a.steps, 0) / last30.length) : 0
  const barMax = Math.max(1, ...last30.map(a => a.steps))
  const dayMap = new Map<string, number>()
  last30.forEach(a => dayMap.set(a.date, a.steps))
  const chartDays: { label: string; steps: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000)
    chartDays.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, steps: dayMap.get(d.toISOString().slice(0, 10)) ?? 0 })
  }

  // Mood distribution
  const moodCounts = { stanco: 0, normale: 0, carico: 0 }
  activities.slice(0, 14).forEach(a => { if (a.preWorkoutMood) moodCounts[a.preWorkoutMood]++ })

  // RPE distribution
  const rpeCounts: Record<string, number> = {}
  filtered.forEach(a => { if (a.rpe) rpeCounts[a.rpe] = (rpeCounts[a.rpe] ?? 0) + 1 })
  const avgRpe = (() => {
    const rpeEntries = filtered.filter(a => a.rpe)
    return rpeEntries.length > 0 ? (rpeEntries.reduce((s, a) => s + (a.rpe ?? 0), 0) / rpeEntries.length).toFixed(1) : null
  })()

  // Weekly volume trend (tonnage per week for past 4 weeks)
  const weekVolumes: { label: string; volume: number }[] = []
  for (let w = 3; w >= 0; w--) {
    const weekStart = now - (w + 1) * 7 * 86_400_000
    const weekEnd = now - w * 7 * 86_400_000
    const weekActs = activities.filter(a => {
      const t = new Date(a.date).getTime()
      return t >= weekStart && t < weekEnd
    })
    const vol = weekActs.reduce((s, a) => s + (a.workouts ?? []).reduce((ss, wk) =>
      ss + (wk.exercises ?? []).reduce((sss, ex) => sss + ex.sets.reduce((ssss, set) => ssss + set.kg * set.reps, 0), 0), 0), 0)
    const d = new Date(weekEnd)
    weekVolumes.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, volume: vol })
  }
  const maxWeekVol = Math.max(1, ...weekVolumes.map(w => w.volume))

  // Exercise PRs from prService
  const exercisePRs = prs?.exercisePRs ? Object.values(prs.exercisePRs).sort((a, b) => b.estimated1RM - a.estimated1RM) : []

  /* ── Handlers ── */
  const handleSaveWeight = async () => {
    if (!user || !weightKg) return
    setSavingWeight(true)
    const entry: WeightEntry = { date: todayStr, weight: parseFloat(weightKg), bodyFat: bodyFat ? parseFloat(bodyFat) : undefined }
    await logWeight(user.uid, entry).catch(() => {})
    setWeights(prev => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)))
    setWeightKg(''); setBodyFat(''); setShowWeightForm(false); setSavingWeight(false)
  }

  const handleSaveInjury = async () => {
    if (!user || !injPart) return
    setSavingInj(true)
    const entry: InjuryLog = { date: todayStr, bodyPart: injPart, intensity: injIntensity }
    await logInjury(user.uid, entry).catch(() => {})
    setInjuries(prev => [entry, ...prev])
    setInjPart(''); setInjIntensity(1); setShowInjForm(false); setSavingInj(false)
  }

  const handleSaveMeasurement = async () => {
    if (!user) return
    const entry: BodyMeasurement = {
      date: todayStr,
      chest: measChest ? parseFloat(measChest) : undefined,
      waist: measWaist ? parseFloat(measWaist) : undefined,
      hips: measHips ? parseFloat(measHips) : undefined,
      bicepR: measBicep ? parseFloat(measBicep) : undefined,
      thighR: measThigh ? parseFloat(measThigh) : undefined,
    }
    if (!entry.chest && !entry.waist && !entry.hips && !entry.bicepR && !entry.thighR) return
    setSavingMeas(true)
    await logMeasurement(user.uid, entry).catch(() => {})
    setMeasurements(prev => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)))
    setMeasChest(''); setMeasWaist(''); setMeasHips(''); setMeasBicep(''); setMeasThigh('')
    setShowMeasForm(false); setSavingMeas(false)
  }

  /* ── Styles ── */
  const sectionTitle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-sub)', marginBottom: '12px',
  }
  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '16px', boxShadow: 'var(--shadow-card)', padding: '16px',
  }
  const smallBtn = (active?: boolean): React.CSSProperties => ({
    padding: '6px 14px', fontSize: '11px', fontWeight: 700,
    borderRadius: '20px', border: 'none', cursor: 'pointer',
    background: active ? 'var(--gradient)' : 'var(--bg-surface)',
    color: active ? 'white' : 'var(--text-sub)',
    fontFamily: "'DM Sans', sans-serif",
  })

  const RANGE_OPTIONS = [
    { days: 1, label: 'OGGI' },
    { days: 7, label: '7G' },
    { days: 15, label: '15G' },
    { days: 30, label: '30G' },
    { days: 60, label: '60G' },
    { days: 90, label: '90G' },
    { days: 365, label: '1A' },
  ]

  if (loading) return (
    <Layout>
      <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-sub)' }}>Caricamento...</div>
    </Layout>
  )

  return (
    <Layout>
      <div style={{ padding: '52px 16px 32px' }}>
        {/* ═══ HEADER ═══ */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                Control Center
              </h1>
              <p style={{ fontSize: '11px', color: 'var(--indigo)', fontWeight: 700, letterSpacing: '0.06em', marginTop: '6px' }}>
                📅 {dateRangeLabel}
              </p>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 600, marginTop: '6px' }}>
              {filtered.length} attività
            </span>
          </div>
          {/* Range pills */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '14px' }}>
            {RANGE_OPTIONS.map(opt => {
              const active = rangeDays === opt.days
              return (
                <button key={opt.days} onClick={() => setRangeDays(opt.days)} style={{
                  flex: 1, padding: '8px 0', borderRadius: '10px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 700, fontFamily: "'Sora', sans-serif",
                  letterSpacing: '0.02em', border: 'none',
                  background: active ? 'var(--gradient)' : 'var(--bg-card)',
                  color: active ? 'white' : 'var(--text-sub)',
                  boxShadow: active ? '0 4px 12px rgba(79,70,229,0.3)' : 'var(--shadow-sm)',
                  transition: 'all 0.2s',
                }}>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ═══ 1. RECOVERY SCORE ═══ */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            ...card,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, var(--bg-card) 60%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px' }}>🔋</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
                  {recoveryScore >= 70 ? 'Pronto per allenarti' : recoveryScore >= 40 ? 'Recupero parziale' : 'Riposo consigliato'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginLeft: '26px', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
                {recoveryScore >= 70 ? 'RECUPERO OTTIMALE' : recoveryScore >= 40 ? 'RECUPERO IN CORSO' : 'AFFATICAMENTO'}
              </p>
            </div>
            <RecoveryGauge score={recoveryScore} />
          </div>
        </div>

        {/* ═══ 2. DNA SPORTIVO ═══ */}
        <div style={{ marginBottom: '20px' }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
                Il tuo DNA Sportivo
              </span>
              <span style={{
                fontSize: '11px', fontWeight: 700, color: '#7C3AED',
                background: 'rgba(124,58,237,0.1)', padding: '4px 10px', borderRadius: '8px',
              }}>
                Score: {dnaOverall}/100
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart scores={dnaScores} />
            </div>
          </div>
        </div>

        {/* ═══ 3. METRIC GRID — 2 col ═══ */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { icon: '🔥', value: totalCal >= 1000 ? `${(totalCal / 1000).toFixed(1)}k` : `${totalCal}`, unit: 'KCAL', color: '#EA580C', bg: 'rgba(234,88,12,0.08)' },
              { icon: '📍', value: totalDist.toFixed(1), unit: 'KM FATTI', color: '#0D9488', bg: 'rgba(13,148,136,0.08)' },
              { icon: '⏱️', value: `${totalMinutes}`, unit: 'min', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
              { icon: '❤️', value: avgHR > 0 ? `${avgHR}` : '—', unit: avgHR > 0 ? 'bpm MEDIA' : 'bpm', color: '#DB2777', bg: 'rgba(219,39,119,0.08)' },
              { icon: '🌙', value: avgSleep > 0 ? `${Math.floor(avgSleep)}h ${Math.round((avgSleep % 1) * 60)}m` : '—', unit: 'SONNO NOTTURNO', color: '#6D28D9', bg: 'rgba(109,40,217,0.08)' },
              { icon: '🏋️', value: totalWeight >= 1000 ? `${(totalWeight / 1000).toFixed(1)}` : `${totalWeight}`, unit: totalWeight >= 1000 ? 'ton CARICO' : 'kg CARICO', color: '#059669', bg: 'rgba(5,150,105,0.08)' },
              { icon: '💧', value: `${waterGlasses}`, unit: '/ 8 BICCHIERI', color: '#2563EB', bg: 'rgba(37,99,235,0.08)', tap: addWater },
              { icon: '🧘', value: `${recoveryScore}`, unit: '/ 100 RECUPERO', color: '#0D9488', bg: 'rgba(13,148,136,0.08)' },
            ].map((m, i) => (
              <div key={i} onClick={m.tap} style={{
                ...card, padding: '16px', cursor: m.tap ? 'pointer' : 'default',
                background: m.bg, borderColor: 'transparent',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>{m.icon}</div>
                <span style={{ fontSize: '26px', fontWeight: 800, color: m.color, fontFamily: "'Sora', sans-serif", lineHeight: 1, display: 'block' }}>
                  {m.value}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-sub)', fontWeight: 700, letterSpacing: '0.06em', marginTop: '4px', display: 'block' }}>
                  {m.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 4. MAPPA AFFATICAMENTO ═══ */}
        <div style={{ marginBottom: '20px' }}>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px' }}>🔥</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
                Mappa Affaticamento
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {fatigueGroups.map(g => (
                <div key={g.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{g.label}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, color: g.statusColor,
                      background: g.statusBg, padding: '3px 10px', borderRadius: '6px',
                      letterSpacing: '0.04em',
                    }}>
                      {g.statusLabel} ({g.pct}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${g.pct}%`, background: g.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ 5. TRAINING STATUS ═══ */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            ...card,
            background: 'linear-gradient(135deg, rgba(79,70,229,0.06) 0%, var(--bg-card) 60%)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📊</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
                  Training Status
                </span>
              </div>
              <span style={{ fontSize: '14px', color: 'var(--indigo)' }}>📈</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '16px', lineHeight: 1.4 }}>
              {recoveryScore >= 70 ? 'Carico ottimale. Sei in miglioramento.' : recoveryScore >= 40 ? 'Carico moderato. Mantieni il ritmo.' : 'Carico alto. Considera un giorno di riposo.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>VO2 MAX</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>{vo2Max}</span>
                  <span style={{ fontSize: '14px', color: '#0D9488' }}>🫁</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>CARICO SETT.</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>{weeklyTSS}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 600 }}>TSS</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              ZONE DI FREQUENZA
            </p>
            <ZoneBar zones={hrZones} />
          </div>
        </div>

        {/* ═══ 6. 30-DAY CHART ═══ */}
        <div style={{ marginBottom: '28px' }}>
          <p style={sectionTitle}>ULTIMI 30 GIORNI</p>
          <div style={{ ...card, padding: '16px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>Media giornaliera</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--indigo)' }}>{avgSteps.toLocaleString('it-IT')} passi</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
              {chartDays.map((day, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ width: '100%', height: `${Math.max(barMax > 0 ? (day.steps / barMax) * 100 : 0, 2)}%`, borderRadius: '3px 3px 0 0', background: day.steps > 0 ? 'var(--gradient)' : 'var(--border)', minHeight: '2px' }} title={`${day.label}: ${day.steps.toLocaleString('it-IT')} passi`} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
              {chartDays.map((day, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '8px', color: 'var(--text-sub)' }}>
                  {i % 5 === 0 ? day.label : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ 7. PERSONAL RECORDS ═══ */}
        <div style={{ marginBottom: '28px' }}>
          <p style={sectionTitle}>RECORD PERSONALI</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { emoji: '🔥', value: maxSteps.toLocaleString('it-IT'), label: 'Max passi in un giorno' },
              { emoji: '📍', value: `${maxDistance.toFixed(1)} km`, label: 'Max distanza in un giorno' },
              { emoji: '⚡', value: `${longestStreak}`, label: 'Streak più lunga' },
              { emoji: '🏋️', value: `${totalWorkouts}`, label: 'Allenamenti totali' },
            ].map((rec, i) => (
              <div key={i} style={{ ...card, textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{rec.emoji}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>{rec.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>{rec.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 8. BILANCIO MUSCOLARE ═══ */}
        <div style={{ marginBottom: '28px' }}>
          <p style={sectionTitle}>BILANCIO MUSCOLARE — QUESTA SETTIMANA</p>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'gambe',  label: '🦵 Gambe',         color: '#2563EB' },
              { key: 'cardio', label: '🫁 Cardio',         color: '#0D9488' },
              { key: 'core',   label: '🎯 Core',           color: '#7C3AED' },
              { key: 'braccia',label: '💪 Braccia',        color: '#EA580C' },
              { key: 'petto',  label: '🏋️ Petto/Schiena', color: '#DB2777' },
            ].map(m => {
              const count = muscleHits[m.key] ?? 0
              const pct = (count / maxMuscle) * 100
              return (
                <div key={m.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text)' }}>{m.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: count > 0 ? m.color : 'var(--text-sub)' }}>
                      {count > 0 ? `${count}x` : '—'}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )
            })}
            {Object.values(muscleHits).every(v => v === 0) && (
              <p style={{ fontSize: '12px', color: 'var(--text-sub)', textAlign: 'center', padding: '4px 0' }}>
                Nessun allenamento questa settimana — inizia oggi!
              </p>
            )}
          </div>
        </div>

        {/* ═══ 9. WORKOUT BREAKDOWN ═══ */}
        <div style={{ marginBottom: '28px' }}>
          <p style={sectionTitle}>TIPI DI ALLENAMENTO</p>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.keys(workoutCounts).length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--text-sub)', textAlign: 'center' }}>
                Nessun allenamento registrato
              </p>
            )}
            {Object.entries(workoutCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const meta = TYPE_META[type] ?? TYPE_META.other
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text)' }}>{meta.emoji} {meta.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{count}</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxWCount) * 100}%`, borderRadius: '4px', background: meta.color, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ═══ 10. PROGRESSIONE FORZA ═══ */}
        {topExercises.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <p style={sectionTitle}>PROGRESSIONE FORZA</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topExercises.map(([name, sessions]) => {
                const last6 = sessions.slice(-6)
                const maxVol = Math.max(1, ...last6.map(s => s.volume))
                const lastSession = sessions[sessions.length - 1]
                return (
                  <div key={name} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>💪 {name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{sessions.length} sessioni</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '52px', marginBottom: '8px' }}>
                      {last6.map((s, i) => (
                        <div key={i} title={`${s.date}: ${s.volume} kg vol.`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{
                            width: '100%', height: `${Math.max((s.volume / maxVol) * 100, 8)}%`,
                            borderRadius: '4px 4px 0 0',
                            background: i === last6.length - 1 ? 'var(--gradient)' : 'var(--border-strong)',
                            transition: 'height 0.4s ease',
                          }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                        Max: <strong style={{ color: 'var(--text)' }}>{lastSession.maxKg} kg</strong>
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--indigo)', fontWeight: 700 }}>
                        {lastSession.volume.toLocaleString('it-IT')} kg volume
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══ 11. PESO CORPOREO ═══ */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ ...sectionTitle, marginBottom: 0 }}>PESO CORPOREO</p>
            <button onClick={() => setShowWeightForm(!showWeightForm)} style={smallBtn(showWeightForm)}>
              {showWeightForm ? '✕ Chiudi' : '+ Log peso'}
            </button>
          </div>

          {showWeightForm && (
            <div style={{ ...card, marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px' }}>Peso (kg)</p>
                  <input type="number" inputMode="decimal" placeholder="72.5" value={weightKg} onChange={e => setWeightKg(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--text)', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px' }}>% Grasso (opt)</p>
                  <input type="number" inputMode="decimal" placeholder="18" value={bodyFat} onChange={e => setBodyFat(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>
              <button onClick={handleSaveWeight} disabled={!weightKg || savingWeight}
                style={{ width: '100%', background: !weightKg ? 'var(--bg-surface)' : 'var(--gradient)', color: !weightKg ? 'var(--text-sub)' : 'white', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: "'Sora', sans-serif", fontSize: '13px' }}>
                {savingWeight ? '...' : 'Salva Peso'}
              </button>
            </div>
          )}

          {weights.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '24px' }}>
              <span style={{ fontSize: '2rem', display: 'block' }}>⚖️</span>
              <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '8px' }}>Nessun dato peso ancora. Inizia a tracciare!</p>
            </div>
          ) : (
            <div style={card}>
              <div style={{ position: 'relative', height: '60px', marginBottom: '12px' }}>
                {(() => {
                  const minW = Math.min(...weights.map(x => x.weight)) - 1
                  const maxW = Math.max(...weights.map(x => x.weight)) + 1
                  const range = maxW - minW || 1
                  return weights.map((w, i) => {
                    const xPct = weights.length > 1 ? (i / (weights.length - 1)) * 96 : 50
                    const yPct = 100 - ((w.weight - minW) / range) * 80
                    return (
                      <div key={i} title={`${w.date}: ${w.weight}kg`} style={{
                        position: 'absolute', left: `${xPct}%`, top: `${yPct}%`,
                        transform: 'translate(-50%, -50%)',
                        width: i === weights.length - 1 ? '10px' : '7px',
                        height: i === weights.length - 1 ? '10px' : '7px',
                        borderRadius: '50%',
                        background: i === weights.length - 1 ? 'var(--indigo)' : 'var(--border-strong)',
                      }} />
                    )
                  })
                })()}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>Ultimo peso:</span>
                <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--indigo)', fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>
                  {weights[weights.length - 1].weight} kg
                </span>
              </div>
              {weights[weights.length - 1].bodyFat && (
                <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>
                  Grasso corporeo: {weights[weights.length - 1].bodyFat}%
                </p>
              )}
              {weights.length > 1 && (() => {
                const diff = weights[weights.length - 1].weight - weights[0].weight
                return (
                  <p style={{ fontSize: '12px', color: diff < 0 ? '#16A34A' : diff > 0 ? '#DC2626' : 'var(--text-sub)', marginTop: '4px', fontWeight: 600 }}>
                    {diff < 0 ? '↓' : diff > 0 ? '↑' : '='} {Math.abs(diff).toFixed(1)} kg rispetto all'inizio
                  </p>
                )
              })()}
            </div>
          )}
        </div>

        {/* ═══ 12. SONNO & MOOD ═══ */}
        {(avgSleep > 0 || moodCounts.stanco + moodCounts.normale + moodCounts.carico > 0) && (
          <div style={{ marginBottom: '28px' }}>
            <p style={sectionTitle}>SONNO & STATO PRE-ALLENAMENTO</p>
            <div style={{ display: 'grid', gridTemplateColumns: avgSleep > 0 ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '10px' }}>
              {avgSleep > 0 && (
                <div style={{ ...card, textAlign: 'center', padding: '14px 8px' }}>
                  <span style={{ fontSize: '22px', display: 'block' }}>😴</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', display: 'block', marginTop: '4px' }}>{avgSleep.toFixed(1)}h</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Media sonno</span>
                </div>
              )}
              {(['stanco', 'normale', 'carico'] as const).map(m => (
                <div key={m} style={{ ...card, textAlign: 'center', padding: '14px 8px' }}>
                  <span style={{ fontSize: '22px', display: 'block' }}>{m === 'stanco' ? '😴' : m === 'normale' ? '😐' : '⚡'}</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', display: 'block', marginTop: '4px' }}>{moodCounts[m]}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-sub)', letterSpacing: '0.06em', fontWeight: 700, textTransform: 'capitalize' as const }}>{m}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ 13. DOLORI / INFORTUNI ═══ */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ ...sectionTitle, marginBottom: 0 }}>DOLORI / INFORTUNI</p>
            <button onClick={() => setShowInjForm(!showInjForm)} style={smallBtn(showInjForm)}>
              {showInjForm ? '✕ Chiudi' : '+ Aggiungi'}
            </button>
          </div>

          {showInjForm && (
            <div style={{ ...card, marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Parte del corpo</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {BODY_PARTS.map(p => (
                  <button key={p} onClick={() => setInjPart(p)}
                    style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, border: `1.5px solid ${injPart === p ? 'var(--indigo)' : 'var(--border)'}`, background: injPart === p ? 'var(--indigo-light)' : 'transparent', color: injPart === p ? 'var(--indigo)' : 'var(--text-sub)' }}>
                    {p}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Intensità dolore (1 = lieve · 5 = forte)</p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {([1, 2, 3, 4, 5] as const).map(n => {
                  const c = n <= 2 ? '#16A34A' : n <= 3 ? '#D97706' : '#DC2626'
                  return (
                    <button key={n} onClick={() => setInjIntensity(n)}
                      style={{ flex: 1, height: '38px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', border: `1.5px solid ${injIntensity === n ? c : 'var(--border)'}`, background: injIntensity === n ? (n <= 2 ? '#F0FDF4' : n <= 3 ? '#FFFBEB' : '#FEF2F2') : 'transparent', color: injIntensity === n ? c : 'var(--text-sub)' }}>
                      {n}
                    </button>
                  )
                })}
              </div>
              <button onClick={handleSaveInjury} disabled={!injPart || savingInj}
                style={{ width: '100%', background: !injPart ? 'var(--bg-surface)' : 'var(--gradient)', color: !injPart ? 'var(--text-sub)' : 'white', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: "'Sora', sans-serif", fontSize: '13px' }}>
                {savingInj ? '...' : 'Registra Dolore'}
              </button>
            </div>
          )}

          {injuries.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>Nessun dolore registrato</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {injuries.map((inj, i) => {
                const c = inj.intensity <= 2 ? '#16A34A' : inj.intensity <= 3 ? '#D97706' : '#DC2626'
                const bg = inj.intensity <= 2 ? '#F0FDF4' : inj.intensity <= 3 ? '#FFFBEB' : '#FEF2F2'
                return (
                  <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                      {inj.intensity <= 2 ? '💚' : inj.intensity <= 3 ? '🟡' : '🔴'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{inj.bodyPart}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '1px' }}>{inj.date} · Intensità <span style={{ color: c, fontWeight: 700 }}>{inj.intensity}/5</span></p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ═══ 14. EXERCISE PRs — 1RM ═══ */}
        {exercisePRs.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <p style={sectionTitle}>RECORD PER ESERCIZIO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {exercisePRs.map((pr, i) => (
                <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', flexShrink: 0,
                  }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏋️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>{pr.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>
                      Max: <strong style={{ color: 'var(--text)' }}>{pr.maxWeight}kg</strong> · 1RM: <strong style={{ color: '#7C3AED' }}>~{pr.estimated1RM}kg</strong>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 600, letterSpacing: '0.06em' }}>{pr.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ 15. VOLUME SETTIMANALE ═══ */}
        {weekVolumes.some(w => w.volume > 0) && (
          <div style={{ marginBottom: '28px' }}>
            <p style={sectionTitle}>VOLUME SETTIMANALE (TONNELLAGGIO)</p>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '100px', marginBottom: '8px' }}>
                {weekVolumes.map((w, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: w.volume > 0 ? 'var(--indigo)' : 'var(--text-muted)', marginBottom: '4px' }}>
                      {w.volume > 0 ? `${(w.volume / 1000).toFixed(1)}t` : '—'}
                    </p>
                    <div style={{
                      width: '100%', maxWidth: '48px',
                      height: `${Math.max(w.volume > 0 ? (w.volume / maxWeekVol) * 100 : 0, 4)}%`,
                      borderRadius: '6px 6px 0 0',
                      background: i === weekVolumes.length - 1 ? 'var(--gradient)' : 'var(--border-strong)',
                      transition: 'height 0.5s ease',
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {weekVolumes.map((w, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: 'var(--text-sub)', fontWeight: 600 }}>
                    Sett. {w.label}
                  </div>
                ))}
              </div>
              {weekVolumes.length >= 2 && weekVolumes[weekVolumes.length - 1].volume > 0 && weekVolumes[weekVolumes.length - 2].volume > 0 && (() => {
                const curr = weekVolumes[weekVolumes.length - 1].volume
                const prev = weekVolumes[weekVolumes.length - 2].volume
                const diff = ((curr - prev) / prev) * 100
                return (
                  <p style={{ fontSize: '12px', color: diff > 0 ? '#16A34A' : diff < 0 ? '#DC2626' : 'var(--text-sub)', fontWeight: 700, marginTop: '12px', textAlign: 'center' }}>
                    {diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️'} {diff > 0 ? '+' : ''}{diff.toFixed(0)}% rispetto alla settimana precedente
                  </p>
                )
              })()}
            </div>
          </div>
        )}

        {/* ═══ 16. RPE DISTRIBUTION ═══ */}
        {avgRpe && (
          <div style={{ marginBottom: '28px' }}>
            <p style={sectionTitle}>INTENSITÀ PERCEPITA (RPE)</p>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>Media RPE nel periodo</span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: parseFloat(avgRpe) >= 8 ? '#DC2626' : parseFloat(avgRpe) >= 6 ? '#F59E0B' : '#22C55E', fontFamily: "'Sora', sans-serif" }}>
                  {avgRpe}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '3px', height: '48px', alignItems: 'flex-end' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => {
                  const count = rpeCounts[n] ?? 0
                  const maxC = Math.max(1, ...Object.values(rpeCounts))
                  const h = count > 0 ? Math.max((count / maxC) * 100, 12) : 4
                  const color = n <= 3 ? '#22C55E' : n <= 5 ? '#84CC16' : n <= 7 ? '#F59E0B' : '#EF4444'
                  return (
                    <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{
                        width: '100%', height: `${h}%`, borderRadius: '3px 3px 0 0',
                        background: count > 0 ? color : 'var(--border)',
                        transition: 'height 0.4s ease',
                      }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <div key={n} style={{ flex: 1, textAlign: 'center', fontSize: '9px', color: 'var(--text-sub)', fontWeight: 600 }}>{n}</div>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '10px', textAlign: 'center', lineHeight: 1.4 }}>
                {parseFloat(avgRpe) >= 8 ? '⚠️ Carico molto alto — considera un deload' : parseFloat(avgRpe) >= 6 ? '💪 Buona intensità — continua così' : '🌱 Intensità moderata — puoi spingere di più'}
              </p>
            </div>
          </div>
        )}

        {/* ═══ 17. MISURE CORPOREE ═══ */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ ...sectionTitle, marginBottom: 0 }}>MISURE CORPOREE</p>
            <button onClick={() => setShowMeasForm(!showMeasForm)} style={smallBtn(showMeasForm)}>
              {showMeasForm ? '✕ Chiudi' : '+ Misura'}
            </button>
          </div>

          {showMeasForm && (
            <div style={{ ...card, marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginBottom: '10px', lineHeight: 1.4 }}>
                Inserisci le misure in cm. Compila solo quelle disponibili.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {[
                  { label: 'Petto', val: measChest, set: setMeasChest, icon: '📏' },
                  { label: 'Vita', val: measWaist, set: setMeasWaist, icon: '📐' },
                  { label: 'Fianchi', val: measHips, set: setMeasHips, icon: '📏' },
                  { label: 'Bicipite', val: measBicep, set: setMeasBicep, icon: '💪' },
                  { label: 'Coscia', val: measThigh, set: setMeasThigh, icon: '🦵' },
                ].map(m => (
                  <div key={m.label}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{m.icon} {m.label} (cm)</p>
                    <input type="number" inputMode="decimal" placeholder="—" value={m.val} onChange={e => m.set(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--text)', outline: 'none', textAlign: 'center' }} />
                  </div>
                ))}
              </div>
              <button onClick={handleSaveMeasurement} disabled={savingMeas}
                style={{ width: '100%', background: 'var(--gradient)', color: 'white', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: "'Sora', sans-serif", fontSize: '13px' }}>
                {savingMeas ? '...' : 'Salva Misure'}
              </button>
            </div>
          )}

          {measurements.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '24px' }}>
              <span style={{ fontSize: '2rem', display: 'block' }}>📐</span>
              <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '8px' }}>Nessuna misura registrata. Traccia petto, vita e braccia per vedere i progressi!</p>
            </div>
          ) : (
            <div style={card}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { key: 'chest' as const, label: 'Petto', icon: '📏' },
                  { key: 'waist' as const, label: 'Vita', icon: '📐' },
                  { key: 'hips' as const, label: 'Fianchi', icon: '📏' },
                  { key: 'bicepR' as const, label: 'Bicipite', icon: '💪' },
                  { key: 'thighR' as const, label: 'Coscia', icon: '🦵' },
                ].map(m => {
                  const entries = measurements.filter(x => x[m.key] != null)
                  if (entries.length === 0) return null
                  const latest = entries[entries.length - 1][m.key]!
                  const first = entries[0][m.key]!
                  const diff = latest - first
                  return (
                    <div key={m.key} style={{ textAlign: 'center', padding: '10px 6px' }}>
                      <span style={{ fontSize: '16px' }}>{m.icon}</span>
                      <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Sora', sans-serif", lineHeight: 1, marginTop: '4px' }}>
                        {latest}
                      </p>
                      <p style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' }}>{m.label} (cm)</p>
                      {entries.length > 1 && (
                        <p style={{ fontSize: '10px', color: diff > 0 ? '#16A34A' : diff < 0 ? '#DC2626' : 'var(--text-sub)', fontWeight: 700, marginTop: '4px' }}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} cm
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}
