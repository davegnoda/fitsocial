import { useState, useEffect, useRef, useCallback } from 'react'
import type { Activity, Workout, ExerciseEntry } from '../types'

interface Props {
  onSave: (activity: Activity) => Promise<void>
  onClose: () => void
  existing?: Activity | null
}

const TYPES = [
  { value: 'running', icon: '🏃', label: 'Corsa' },
  { value: 'cycling', icon: '🚴', label: 'Bici' },
  { value: 'gym',     icon: '💪', label: 'Gym' },
  { value: 'walking', icon: '🚶', label: 'Walk' },
  { value: 'hiit',    icon: '⚡', label: 'HIIT' },
  { value: 'other',   icon: '🏋️', label: 'Altro' },
] as const

const RATES: Record<string, { stepsPerMin: number; kcalPerMin: number; kmPerMin: number }> = {
  running:  { stepsPerMin: 160, kcalPerMin: 11,  kmPerMin: 0.16 },
  cycling:  { stepsPerMin: 0,   kcalPerMin: 9,   kmPerMin: 0.27 },
  gym:      { stepsPerMin: 40,  kcalPerMin: 7,   kmPerMin: 0 },
  walking:  { stepsPerMin: 100, kcalPerMin: 4,   kmPerMin: 0.07 },
  hiit:     { stepsPerMin: 110, kcalPerMin: 13,  kmPerMin: 0 },
  other:    { stepsPerMin: 60,  kcalPerMin: 6,   kmPerMin: 0.05 },
}

// Expanded exercise library organized by muscle group
const GYM_EXERCISES: Record<string, string[]> = {
  'Petto': ['Panca Piana', 'Panca Inclinata', 'Croci ai Cavi', 'Push-up', 'Dips'],
  'Schiena': ['Trazioni', 'Rematore con Bilanciere', 'Lat Machine', 'Pulley Basso', 'Rematore Manubrio'],
  'Spalle': ['Military Press', 'Alzate Laterali', 'Alzate Frontali', 'Face Pull', 'Arnold Press'],
  'Gambe': ['Squat', 'Stacco da Terra', 'Leg Press', 'Affondi', 'Leg Curl', 'Leg Extension', 'Hip Thrust', 'Calf Raise'],
  'Braccia': ['Curl Bicipiti', 'Curl Martello', 'Tricipiti Cavo', 'French Press', 'Dips Tricipiti'],
  'Core': ['Plank', 'Crunch', 'Russian Twist', 'Leg Raise', 'Ab Wheel'],
  'Cardio': ['Burpees', 'Mountain Climber', 'Jumping Jack', 'Box Jump', 'Corda'],
}
const ALL_EXERCISES = Object.values(GYM_EXERCISES).flat()

const RPE_LABELS: Record<number, { label: string; color: string; desc: string }> = {
  1: { label: '1', color: '#22C55E', desc: 'Riposo attivo' },
  2: { label: '2', color: '#22C55E', desc: 'Molto facile' },
  3: { label: '3', color: '#4ADE80', desc: 'Facile' },
  4: { label: '4', color: '#84CC16', desc: 'Moderato' },
  5: { label: '5', color: '#EAB308', desc: 'Medio' },
  6: { label: '6', color: '#F59E0B', desc: 'Medio-intenso' },
  7: { label: '7', color: '#F97316', desc: 'Intenso' },
  8: { label: '8', color: '#EF4444', desc: 'Molto intenso' },
  9: { label: '9', color: '#DC2626', desc: 'Quasi al limite' },
  10: { label: '10', color: '#991B1B', desc: 'Massimale' },
}

interface ExerciseInput {
  name: string
  sets: Array<{ kg: string; reps: string }>
}

type FieldKey = 'duration' | 'steps' | 'kcal' | 'km'

function deriveFrom(source: FieldKey, rawValue: number, type: Workout['type']): Record<FieldKey, string> {
  const r = RATES[type] ?? RATES.other
  let mins = 0

  switch (source) {
    case 'duration': mins = rawValue; break
    case 'steps':    mins = r.stepsPerMin > 0 ? rawValue / r.stepsPerMin : 0; break
    case 'kcal':     mins = r.kcalPerMin > 0  ? rawValue / r.kcalPerMin  : 0; break
    case 'km':       mins = r.kmPerMin > 0    ? rawValue / r.kmPerMin    : 0; break
  }

  if (mins <= 0) return { duration: '', steps: '', kcal: '', km: '' }

  return {
    duration: source === 'duration' ? String(rawValue) : String(Math.round(mins)),
    steps:    source === 'steps'    ? String(rawValue) : r.stepsPerMin > 0 ? String(Math.round(mins * r.stepsPerMin)) : '0',
    kcal:     source === 'kcal'     ? String(rawValue) : String(Math.round(mins * r.kcalPerMin)),
    km:       source === 'km'       ? String(rawValue) : r.kmPerMin > 0 ? String(parseFloat((mins * r.kmPerMin).toFixed(1))) : '0',
  }
}

// Rest timer component
function RestTimer({ onDone }: { onDone: () => void }) {
  const [seconds, setSeconds] = useState(90)
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(90)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    setRunning(true)
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          setRunning(false)
          onDone()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, onDone])

  const stop = () => {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const pct = running ? (remaining / seconds) * 100 : 100

  return (
    <div style={{
      background: running ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'var(--bg-surface)',
      borderRadius: '10px', padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: '10px',
      border: running ? 'none' : '1px solid var(--border)',
      transition: 'all 0.3s',
    }}>
      <span style={{ fontSize: '14px' }}>⏱️</span>
      {!running ? (
        <>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[60, 90, 120, 180].map(s => (
              <button key={s} onClick={() => setSeconds(s)} style={{
                padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                background: seconds === s ? 'var(--indigo)' : 'var(--bg-card)',
                color: seconds === s ? 'white' : 'var(--text-sub)',
                border: seconds === s ? 'none' : '1px solid var(--border)',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
          </div>
          <button onClick={start} style={{
            marginLeft: 'auto', background: 'var(--indigo)', color: 'white',
            border: 'none', borderRadius: '8px', padding: '5px 12px',
            fontSize: '11px', fontWeight: 700, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Avvia
          </button>
        </>
      ) : (
        <>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'white', fontFamily: "'Sora', sans-serif" }}>
                {fmt(remaining)}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>RIPOSO</span>
            </div>
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'white', borderRadius: '2px', transition: 'width 1s linear' }} />
            </div>
          </div>
          <button onClick={stop} style={{
            background: 'rgba(255,255,255,0.2)', color: 'white',
            border: 'none', borderRadius: '8px', padding: '5px 10px',
            fontSize: '11px', fontWeight: 700, cursor: 'pointer',
          }}>
            Stop
          </button>
        </>
      )}
    </div>
  )
}

export default function LogWorkoutModal({ onSave, onClose, existing }: Props) {
  const [type, setType] = useState<Workout['type']>('running')
  const [duration, setDuration] = useState('')
  const [steps, setSteps]       = useState(existing?.steps    ? String(existing.steps)    : '')
  const [calories, setCalories] = useState(existing?.calories ? String(existing.calories) : '')
  const [distance, setDistance] = useState(existing?.distance ? String(existing.distance) : '')
  const [estimated, setEstimated] = useState<Set<FieldKey>>(new Set())
  const [mood, setMood] = useState<'stanco' | 'normale' | 'carico' | null>(null)
  const [rpe, setRpe] = useState<number | null>(null)
  const [warmUp, setWarmUp] = useState('')
  const [coolDown, setCoolDown] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [exercises, setExercises] = useState<ExerciseInput[]>([])
  const [customExercise, setCustomExercise] = useState('')
  const [showCustomInput, setShowCustomInput] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showRestTimer, setShowRestTimer] = useState(false)

  const showExercises = type === 'gym' || type === 'hiit'

  // Load last workout for quick-repeat
  const [lastWorkout, setLastWorkout] = useState<{ type: string; exercises: ExerciseInput[] } | null>(null)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fitsocial_last_workout')
      if (saved) setLastWorkout(JSON.parse(saved))
    } catch { /* ignore */ }
    // Check for program prefill from AI Coach cards
    try {
      const prefill = localStorage.getItem('fitsocial_program_prefill')
      if (prefill) {
        localStorage.removeItem('fitsocial_program_prefill')
        const data = JSON.parse(prefill)
        if (data.type) setType(data.type as Workout['type'])
        if (data.exercises?.length > 0) setExercises(data.exercises)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (estimated.size === 0) return
    const allFields: FieldKey[] = ['duration', 'steps', 'kcal', 'km']
    const sourceField = allFields.find(f => !estimated.has(f))
    if (!sourceField) return
    const rawMap: Record<FieldKey, string> = { duration, steps, kcal: calories, km: distance }
    const raw = parseFloat(rawMap[sourceField])
    if (!raw) return
    const derived = deriveFrom(sourceField, raw, type)
    setDuration(derived.duration)
    setSteps(derived.steps)
    setCalories(derived.kcal)
    setDistance(derived.km)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const handleFieldChange = (field: FieldKey, value: string) => {
    const raw = parseFloat(value)
    switch (field) {
      case 'duration': setDuration(value); break
      case 'steps':    setSteps(value); break
      case 'kcal':     setCalories(value); break
      case 'km':       setDistance(value); break
    }
    if (!raw || raw <= 0) { setEstimated(new Set()); return }
    const derived = deriveFrom(field, raw, type)
    const newEstimated = new Set<FieldKey>(['duration', 'steps', 'kcal', 'km'])
    newEstimated.delete(field)
    setEstimated(newEstimated)
    if (field !== 'duration') setDuration(derived.duration)
    if (field !== 'steps')    setSteps(derived.steps)
    if (field !== 'kcal')     setCalories(derived.kcal)
    if (field !== 'km')       setDistance(derived.km)
  }

  const addExercise = () =>
    setExercises(prev => [...prev, { name: ALL_EXERCISES[0], sets: [{ kg: '', reps: '' }] }])

  const removeExercise = (i: number) =>
    setExercises(prev => prev.filter((_, idx) => idx !== i))

  const updateExerciseName = (i: number, name: string) =>
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, name } : ex))

  const addSet = (exIdx: number) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === exIdx ? { ...ex, sets: [...ex.sets, { kg: '', reps: '' }] } : ex))

  const removeSet = (exIdx: number, setIdx: number) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === exIdx ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) } : ex))

  const updateSet = (exIdx: number, setIdx: number, field: 'kg' | 'reps', val: string) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === exIdx
        ? { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: val } : s) }
        : ex))

  const repeatLastWorkout = () => {
    if (!lastWorkout) return
    setType(lastWorkout.type as Workout['type'])
    setExercises(lastWorkout.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({ kg: s.kg, reps: '' })), // keep weight, clear reps
    })))
  }

  const addCustomExercise = (exIdx: number) => {
    if (!customExercise.trim()) return
    updateExerciseName(exIdx, customExercise.trim())
    setCustomExercise('')
    setShowCustomInput(null)
  }

  const handleSave = async () => {
    if (!duration) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]

    const exerciseEntries: ExerciseEntry[] = exercises
      .filter(ex => ex.name && ex.sets.some(s => s.kg && s.reps))
      .map(ex => ({
        name: ex.name,
        sets: ex.sets
          .filter(s => s.kg && s.reps)
          .map(s => ({ kg: parseFloat(s.kg), reps: parseInt(s.reps) })),
      }))

    const workout: Workout = {
      type, duration: parseInt(duration) || 0,
      warmUpMins: warmUp ? parseInt(warmUp) : undefined,
      coolDownMins: coolDown ? parseInt(coolDown) : undefined,
      distance: parseFloat(distance) || undefined, verified: false,
      exercises: exerciseEntries.length > 0 ? exerciseEntries : undefined,
    }
    const activity: Activity = {
      date: today,
      steps:    parseInt(steps)    || existing?.steps    || 0,
      calories: parseInt(calories) || existing?.calories || 0,
      distance: parseFloat(distance) || existing?.distance || 0,
      workouts: [...(existing?.workouts ?? []), workout],
      sleep: sleepHours ? parseFloat(sleepHours) : undefined,
      preWorkoutMood: mood ?? undefined,
      rpe: rpe ?? undefined,
      verified: false,
    }

    // Save last workout for quick-repeat
    if (exercises.length > 0) {
      try {
        localStorage.setItem('fitsocial_last_workout', JSON.stringify({ type, exercises }))
      } catch { /* ignore */ }
    }

    setSaveError('')
    try {
      await onSave(activity)
      setSaved(true)
      setTimeout(onClose, 350)
    } catch {
      setSaveError('Errore nel salvataggio. Riprova.')
      setSaving(false)
    }
  }

  const baseInput: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1.5px solid var(--border)',
    color: 'var(--text)',
    padding: '12px 14px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '12px',
    outline: 'none',
    width: '100%',
    textAlign: 'center',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.2s',
  }

  const estimatedStyle: React.CSSProperties = {
    ...baseInput,
    color: 'var(--text-sub)',
    fontStyle: 'italic',
    background: '#F8FAFF',
    border: '1.5px dashed var(--border)',
  }

  const FIELDS: { key: FieldKey; label: string; value: string; color: string; placeholder: string }[] = [
    { key: 'duration', label: 'Durata (min)',  value: duration,  color: 'var(--indigo)', placeholder: '45' },
    { key: 'steps',    label: 'Passi',         value: steps,     color: '#2563EB',        placeholder: '7200' },
    { key: 'kcal',     label: 'Kcal',          value: calories,  color: '#EA580C',        placeholder: '350' },
    { key: 'km',       label: 'Km',            value: distance,  color: '#0D9488',        placeholder: '5.2' },
  ]

  const canSave = !!duration && !saving && !saved

  // Compute volume for summary
  const totalVolume = exercises.reduce((sum, ex) =>
    sum + ex.sets.reduce((s, set) => {
      const kg = parseFloat(set.kg) || 0
      const reps = parseInt(set.reps) || 0
      return s + kg * reps
    }, 0), 0)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', paddingBottom: '64px', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', background: 'var(--bg-card)',
        borderRadius: '24px 24px 0 0',
        border: '1px solid var(--border)',
        boxShadow: '0 -8px 40px rgba(15,23,42,0.15)',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
          <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: '2px', margin: '0 auto 20px' }} />

          {/* Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--indigo)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Nuovo</p>
              <h2 className="font-display" style={{ fontSize: '1.8rem', color: 'var(--text)', lineHeight: 1 }}>Allenamento</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Repeat last workout */}
              {lastWorkout && lastWorkout.exercises.length > 0 && (
                <button onClick={repeatLastWorkout} style={{
                  background: 'var(--indigo-light)', border: '1px solid var(--indigo)',
                  borderRadius: '10px', padding: '6px 12px', fontSize: '10px',
                  fontWeight: 700, color: 'var(--indigo)', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                }}>
                  🔁 Ripeti ultimo
                </button>
              )}
              <button onClick={onClose} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                color: 'var(--text-sub)', width: 36, height: 36, borderRadius: '10px',
                fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
          </div>

          {/* Pre-workout mood */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Come stai oggi?</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {(['😴 Stanco', '😐 Normale', '⚡ Carico'] as const).map((label, i) => {
              const key = (['stanco', 'normale', 'carico'] as const)[i]
              return (
                <button key={key} onClick={() => setMood(key)}
                  style={{
                    flex: 1, padding: '10px 4px', fontSize: '12px', fontWeight: 600,
                    background: mood === key ? 'var(--indigo-light)' : 'var(--bg-surface)',
                    border: `1.5px solid ${mood === key ? 'var(--indigo)' : 'var(--border)'}`,
                    borderRadius: '12px', cursor: 'pointer',
                    color: mood === key ? 'var(--indigo)' : 'var(--text-sub)',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all 0.15s',
                  }}>
                  {label}
                </button>
              )
            })}
          </div>

          {/* Workout type */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Tipo</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '20px' }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)}
                className="flex flex-col items-center gap-1.5"
                style={{
                  padding: '14px 6px',
                  background: type === t.value ? 'var(--indigo-light)' : 'var(--bg-surface)',
                  border: `1.5px solid ${type === t.value ? 'var(--indigo)' : 'var(--border)'}`,
                  borderRadius: '14px', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: '1.4rem' }}>{t.icon}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: type === t.value ? 'var(--indigo)' : 'var(--text-sub)', fontFamily: "'Sora', sans-serif" }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Hint */}
          <div style={{
            background: 'var(--indigo-light)', borderRadius: '10px',
            padding: '8px 12px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '14px' }}>💡</span>
            <p style={{ fontSize: '11px', color: 'var(--indigo)', fontWeight: 500, lineHeight: 1.3 }}>
              Compila uno qualsiasi dei campi e gli altri vengono stimati automaticamente.
            </p>
          </div>

          {/* 4 fields in 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {FIELDS.map(f => {
              const isEst = estimated.has(f.key)
              return (
                <div key={f.key}>
                  <div className="flex items-center gap-1" style={{ marginBottom: '6px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: f.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{f.label}</p>
                    {isEst && <span style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 600 }}>≈ stima</span>}
                  </div>
                  <input
                    type="number" inputMode="decimal"
                    placeholder={f.placeholder}
                    value={f.value}
                    onChange={e => handleFieldChange(f.key, e.target.value)}
                    style={isEst ? estimatedStyle : baseInput}
                    onFocus={e => (e.target.style.borderColor = f.color)}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              )
            })}
          </div>

          {/* Warm-up / Cool-down */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                🔥 Riscaldamento (min)
              </p>
              <input
                type="number" inputMode="numeric" placeholder="5"
                value={warmUp} onChange={e => setWarmUp(e.target.value)}
                style={{ ...baseInput, fontSize: '13px', padding: '10px 12px' }}
                onFocus={e => (e.target.style.borderColor = '#F59E0B')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#0EA5E9', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                🧊 Defaticamento (min)
              </p>
              <input
                type="number" inputMode="numeric" placeholder="5"
                value={coolDown} onChange={e => setCoolDown(e.target.value)}
                style={{ ...baseInput, fontSize: '13px', padding: '10px 12px' }}
                onFocus={e => (e.target.style.borderColor = '#0EA5E9')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>

          {/* ── Esercizi (solo gym/hiit) ── */}
          {showExercises && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Esercizi <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opzionale)</span>
                </p>
                <button onClick={addExercise} style={{
                  background: 'var(--indigo-light)', border: 'none', color: 'var(--indigo)',
                  padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>
                  + Aggiungi
                </button>
              </div>

              {exercises.length === 0 && (
                <p style={{ fontSize: '12px', color: 'var(--text-sub)', textAlign: 'center', padding: '8px 0' }}>
                  Traccia sets × reps × kg per vedere la progressione forza nel tempo.
                </p>
              )}

              {/* Rest timer */}
              {exercises.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  {showRestTimer ? (
                    <RestTimer onDone={() => {
                      // Vibrate on timer end if supported
                      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
                    }} />
                  ) : (
                    <button onClick={() => setShowRestTimer(true)} style={{
                      width: '100%', padding: '8px', background: 'var(--bg-surface)',
                      border: '1px dashed var(--border)', borderRadius: '10px',
                      fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)',
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}>
                      ⏱️ Mostra timer di riposo
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {exercises.map((ex, exIdx) => (
                  <div key={exIdx} style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '12px',
                  }}>
                    {/* Exercise name row */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                      {showCustomInput === exIdx ? (
                        <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
                          <input
                            type="text" placeholder="Nome esercizio personalizzato"
                            value={customExercise}
                            onChange={e => setCustomExercise(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addCustomExercise(exIdx)}
                            autoFocus
                            style={{
                              flex: 1, background: 'var(--bg-card)', border: '1.5px solid var(--indigo)',
                              borderRadius: '8px', padding: '8px 10px', fontSize: '13px', fontWeight: 600,
                              color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", outline: 'none',
                            }}
                          />
                          <button onClick={() => addCustomExercise(exIdx)} style={{
                            background: 'var(--indigo)', color: 'white', border: 'none',
                            borderRadius: '8px', padding: '8px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                          }}>✓</button>
                          <button onClick={() => setShowCustomInput(null)} style={{
                            background: 'none', border: 'none', color: 'var(--text-sub)',
                            fontSize: '14px', cursor: 'pointer',
                          }}>×</button>
                        </div>
                      ) : (
                        <>
                          <select
                            value={ALL_EXERCISES.includes(ex.name) ? ex.name : ''}
                            onChange={e => {
                              if (e.target.value === '__custom__') {
                                setShowCustomInput(exIdx)
                                setCustomExercise('')
                              } else {
                                updateExerciseName(exIdx, e.target.value)
                              }
                            }}
                            style={{
                              flex: 1, background: 'var(--bg-card)', border: '1.5px solid var(--border)',
                              borderRadius: '8px', padding: '8px 10px', fontSize: '13px', fontWeight: 600,
                              color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", outline: 'none',
                            }}
                          >
                            {!ALL_EXERCISES.includes(ex.name) && ex.name && (
                              <option value="">{ex.name} (custom)</option>
                            )}
                            {Object.entries(GYM_EXERCISES).map(([group, exs]) => (
                              <optgroup key={group} label={`── ${group} ──`}>
                                {exs.map(name => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                              </optgroup>
                            ))}
                            <option value="__custom__">✏️ Esercizio personalizzato...</option>
                          </select>
                          <button onClick={() => removeExercise(exIdx)} style={{
                            background: 'none', border: 'none', color: 'var(--text-sub)',
                            fontSize: '16px', cursor: 'pointer', padding: '4px 6px', lineHeight: 1,
                          }}>✕</button>
                        </>
                      )}
                    </div>

                    {/* Sets */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {ex.sets.map((s, setIdx) => (
                        <div key={setIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-sub)', fontWeight: 700, minWidth: '28px' }}>
                            S{setIdx + 1}
                          </span>
                          <input
                            type="number" inputMode="decimal" placeholder="kg"
                            value={s.kg}
                            onChange={e => updateSet(exIdx, setIdx, 'kg', e.target.value)}
                            style={{ flex: 1, padding: '8px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', outline: 'none', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>×</span>
                          <input
                            type="number" inputMode="numeric" placeholder="reps"
                            value={s.reps}
                            onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                            style={{ flex: 1, padding: '8px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', outline: 'none', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}
                          />
                          {ex.sets.length > 1 && (
                            <button onClick={() => removeSet(exIdx, setIdx)} style={{
                              background: 'none', border: 'none', color: 'var(--text-muted)',
                              fontSize: '14px', cursor: 'pointer', padding: '2px 4px',
                            }}>×</button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button onClick={() => addSet(exIdx)} style={{
                      marginTop: '8px', background: 'none', border: '1px dashed var(--border)',
                      borderRadius: '8px', padding: '5px', width: '100%', fontSize: '11px',
                      color: 'var(--text-sub)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}>
                      + Set
                    </button>
                  </div>
                ))}
              </div>

              {/* Volume summary */}
              {totalVolume > 0 && (
                <div style={{
                  marginTop: '10px', background: '#F5F3FF', borderRadius: '10px',
                  padding: '10px 14px', border: '1px solid #EDE9FE',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#7C3AED', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Volume totale</p>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: '#6D28D9', fontFamily: "'Sora', sans-serif", lineHeight: 1, marginTop: '2px' }}>
                      {totalVolume.toLocaleString('it-IT')} <span style={{ fontSize: '11px', fontWeight: 600 }}>kg</span>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '10px', color: '#7C3AED', fontWeight: 600 }}>
                      {exercises.filter(e => e.sets.some(s => s.kg && s.reps)).length} esercizi
                    </p>
                    <p style={{ fontSize: '10px', color: '#7C3AED', fontWeight: 600 }}>
                      {exercises.reduce((sum, e) => sum + e.sets.filter(s => s.kg && s.reps).length, 0)} set totali
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RPE - Rate of Perceived Exertion */}
          {duration && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                Intensità percepita (RPE)
              </p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Quanto ti è sembrato duro questo allenamento? (1 = facile, 10 = massimale)
              </p>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setRpe(n)} style={{
                    flex: 1, padding: '8px 0', borderRadius: '8px',
                    background: rpe === n ? RPE_LABELS[n].color : 'var(--bg-surface)',
                    color: rpe === n ? 'white' : 'var(--text-sub)',
                    border: rpe === n ? 'none' : '1px solid var(--border)',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'Sora', sans-serif",
                    transition: 'all 0.15s',
                    opacity: rpe && rpe !== n ? 0.5 : 1,
                  }}>
                    {n}
                  </button>
                ))}
              </div>
              {rpe && (
                <div style={{
                  background: `${RPE_LABELS[rpe].color}15`, borderRadius: '8px',
                  padding: '6px 12px', border: `1px solid ${RPE_LABELS[rpe].color}30`,
                }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: RPE_LABELS[rpe].color }}>
                    RPE {rpe}: {RPE_LABELS[rpe].desc}
                  </p>
                  {rpe >= 9 && (
                    <p style={{ fontSize: '10px', color: RPE_LABELS[rpe].color, opacity: 0.8, marginTop: '2px' }}>
                      ⚠️ Assicurati di riposarti adeguatamente prima del prossimo allenamento
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sleep field with smart estimate */}
          {(() => {
            const mins = parseInt(duration) || 0
            const kcal = parseInt(calories) || 0
            const intensityTypes = ['running', 'hiit', 'cycling']
            const isIntense = intensityTypes.includes(type)
            let rec = 7.5
            if (mins > 0) {
              rec += (mins / 30) * (isIntense ? 0.5 : 0.3)
              if (kcal > 400) rec += 0.25
              if (kcal > 700) rec += 0.25
              if (mood === 'stanco') rec += 0.5
              else if (mood === 'carico') rec -= 0.25
              // RPE impact on sleep recommendation
              if (rpe && rpe >= 8) rec += 0.5
              else if (rpe && rpe >= 6) rec += 0.25
            }
            rec = Math.min(9.5, Math.max(7, parseFloat(rec.toFixed(1))))
            const hasWorkoutData = mins > 0

            const reasons: string[] = []
            if (mins > 0) reasons.push(`${mins} min di ${type}`)
            if (kcal > 400) reasons.push(`${kcal} kcal bruciate`)
            if (mood === 'stanco') reasons.push('ti senti stanco')
            if (rpe && rpe >= 8) reasons.push(`RPE ${rpe} (molto intenso)`)

            return (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Ore di sonno stanotte
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number" inputMode="decimal"
                    placeholder={hasWorkoutData ? String(rec) : '7.5'}
                    value={sleepHours}
                    onChange={e => setSleepHours(e.target.value)}
                    min="0" max="12"
                    style={{ ...baseInput, textAlign: 'left', padding: '10px 14px', flex: 1 }}
                    onFocus={e => (e.target.style.borderColor = '#6B7280')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                  {hasWorkoutData && !sleepHours && (
                    <button
                      onClick={() => setSleepHours(String(rec))}
                      style={{
                        background: 'linear-gradient(135deg, #6D28D9, #4F46E5)',
                        color: 'white', border: 'none', borderRadius: '10px',
                        padding: '10px 14px', fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      💤 {rec}h
                    </button>
                  )}
                </div>
                {hasWorkoutData && (
                  <div style={{
                    marginTop: '8px', background: '#F5F3FF', borderRadius: '10px',
                    padding: '8px 12px', border: '1px solid #EDE9FE',
                  }}>
                    <p style={{ fontSize: '11px', color: '#6D28D9', fontWeight: 600, lineHeight: 1.3 }}>
                      🛏️ Recupero ottimale: <strong>{rec}h</strong>
                    </p>
                    {reasons.length > 0 && (
                      <p style={{ fontSize: '10px', color: '#7C3AED', opacity: 0.8, marginTop: '2px', lineHeight: 1.3 }}>
                        Basato su: {reasons.join(' · ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          <div style={{ height: '8px' }} />
        </div>

        {/* Sticky footer */}
        <div style={{
          padding: '16px 20px 32px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)',
          flexShrink: 0,
        }}>
          {saveError && (
            <p style={{ fontSize: '12px', color: '#DC2626', marginBottom: '8px', textAlign: 'center' }}>{saveError}</p>
          )}
          <button onClick={handleSave} disabled={!canSave}
            style={{
              background: saved ? 'var(--green-bg)' : !canSave ? 'var(--bg-surface)' : 'var(--gradient)',
              color: saved ? 'var(--green)' : !canSave ? 'var(--text-sub)' : 'white',
              padding: '14px', fontSize: '1rem', fontWeight: 700,
              borderRadius: '14px', border: 'none',
              cursor: canSave ? 'pointer' : 'not-allowed',
              width: '100%', fontFamily: "'Sora', sans-serif",
              boxShadow: canSave ? '0 4px 16px rgba(79,70,229,0.35)' : 'none',
              transition: 'all 0.2s',
            }}>
            {saved ? '✓ Salvato!' : saving ? 'Salvataggio...' : duration ? `Salva · ${duration} min →` : 'Inserisci la durata per salvare'}
          </button>
        </div>
      </div>
    </div>
  )
}
