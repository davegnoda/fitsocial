import { useState } from 'react'
import type { Activity, Workout } from '../types'

interface Props {
  onSave: (activity: Activity) => Promise<void>
  onClose: () => void
  existing?: Activity | null
}

const WORKOUT_TYPES = [
  { value: 'running',  icon: '🏃', label: 'Corsa' },
  { value: 'cycling',  icon: '🚴', label: 'Bici' },
  { value: 'gym',      icon: '💪', label: 'Palestra' },
  { value: 'walking',  icon: '🚶', label: 'Camminata' },
  { value: 'hiit',     icon: '⚡', label: 'HIIT' },
  { value: 'other',    icon: '🏋️', label: 'Altro' },
] as const

export default function LogWorkoutModal({ onSave, onClose, existing }: Props) {
  const [workoutType, setWorkoutType] = useState<Workout['type']>('running')
  const [duration, setDuration] = useState('')
  const [steps, setSteps] = useState(existing?.steps ? String(existing.steps) : '')
  const [calories, setCalories] = useState(existing?.calories ? String(existing.calories) : '')
  const [distance, setDistance] = useState(existing?.distance ? String(existing.distance) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!duration) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const newWorkout: Workout = {
      type: workoutType,
      duration: parseInt(duration) || 0,
      distance: parseFloat(distance) || undefined,
      verified: false,
    }
    const activity: Activity = {
      date: today,
      steps: parseInt(steps) || existing?.steps || 0,
      calories: parseInt(calories) || existing?.calories || 0,
      distance: parseFloat(distance) || existing?.distance || 0,
      workouts: [...(existing?.workouts ?? []), newWorkout],
    }
    await onSave(activity)
    setSaving(false)
    setSaved(true)
    setTimeout(onClose, 800)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full rounded-t-3xl px-5 pt-5 pb-8"
        style={{ background: '#0F0F14', border: '1px solid #1C1C24', borderBottom: 'none', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#2A2A35' }} />

        {/* Title */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: '#30D158' }}>Nuovo</p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#F8F8FC', lineHeight: 1 }}>
              ALLENAMENTO
            </h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#1C1C24', color: '#8A8A96', fontSize: '1.2rem' }}>
            ×
          </button>
        </div>

        {/* Workout type selector */}
        <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: '#8A8A96' }}>Tipo</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {WORKOUT_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setWorkoutType(t.value)}
              className="rounded-xl py-3 flex flex-col items-center gap-1 transition-all"
              style={{
                background: workoutType === t.value ? 'rgba(48,209,88,0.12)' : '#141419',
                border: workoutType === t.value ? '1px solid rgba(48,209,88,0.4)' : '1px solid #1C1C24',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{t.icon}</span>
              <span className="text-xs font-bold" style={{ color: workoutType === t.value ? '#30D158' : '#8A8A96' }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Duration — required */}
        <div className="mb-4">
          <label className="text-xs uppercase tracking-widest font-bold block mb-2" style={{ color: '#8A8A96' }}>
            Durata (minuti) *
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="es. 45"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-sm outline-none"
            style={{ background: '#141419', border: '1px solid #1C1C24', color: '#F8F8FC' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(48,209,88,0.5)')}
            onBlur={e => (e.target.style.borderColor = '#1C1C24')}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Passi', value: steps, set: setSteps, placeholder: '8500', color: '#0A84FF', icon: '👟' },
            { label: 'Calorie', value: calories, set: setCalories, placeholder: '350', color: '#FF9F0A', icon: '🔥' },
            { label: 'Km', value: distance, set: setDistance, placeholder: '5.2', color: '#30D158', icon: '📍' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs font-bold block mb-2" style={{ color: f.color }}>
                {f.icon} {f.label}
              </label>
              <input
                type="number"
                inputMode="decimal"
                placeholder={f.placeholder}
                value={f.value}
                onChange={e => f.set(e.target.value)}
                className="w-full rounded-xl px-3 py-3 text-sm outline-none text-center font-bold"
                style={{ background: '#141419', border: '1px solid #1C1C24', color: '#F8F8FC' }}
                onFocus={e => (e.target.style.borderColor = f.color + '80')}
                onBlur={e => (e.target.style.borderColor = '#1C1C24')}
              />
            </div>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || saved || !duration}
          className="w-full rounded-2xl py-4 font-bold uppercase tracking-wider text-sm transition-all"
          style={{
            background: saved
              ? 'rgba(48,209,88,0.2)'
              : saving || !duration
                ? 'rgba(48,209,88,0.2)'
                : 'linear-gradient(135deg, #30D158, #0A84FF)',
            color: saved ? '#30D158' : '#FFFFFF',
            boxShadow: saving || saved || !duration ? 'none' : '0 4px 24px rgba(48,209,88,0.3)',
          }}
        >
          {saved ? '✓ Salvato!' : saving ? 'Salvataggio...' : 'Salva allenamento →'}
        </button>
      </div>
    </div>
  )
}
