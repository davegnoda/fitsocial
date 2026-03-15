import { useState } from 'react'
import type { Activity, Workout } from '../types'

interface Props {
  onSave: (activity: Activity) => Promise<void>
  onClose: () => void
  existing?: Activity | null
}

const TYPES = [
  { value: 'running', icon: '🏃', label: 'CORSA' },
  { value: 'cycling', icon: '🚴', label: 'BICI' },
  { value: 'gym',     icon: '💪', label: 'GYM' },
  { value: 'walking', icon: '🚶', label: 'WALK' },
  { value: 'hiit',    icon: '⚡', label: 'HIIT' },
  { value: 'other',   icon: '🏋️', label: 'ALTRO' },
] as const

export default function LogWorkoutModal({ onSave, onClose, existing }: Props) {
  const [type, setType] = useState<Workout['type']>('running')
  const [duration, setDuration] = useState('')
  const [steps, setSteps] = useState(existing?.steps ? String(existing.steps) : '')
  const [calories, setCalories] = useState(existing?.calories ? String(existing.calories) : '')
  const [distance, setDistance] = useState(existing?.distance ? String(existing.distance) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const inputStyle = {
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    color: 'var(--text)', padding: '12px 14px', fontSize: '14px', fontWeight: 700,
    borderRadius: '4px', outline: 'none', width: '100%', textAlign: 'center' as const,
    fontFamily: 'DM Sans, sans-serif',
  }

  const handleSave = async () => {
    if (!duration) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const workout: Workout = { type, duration: parseInt(duration) || 0, distance: parseFloat(distance) || undefined, verified: false }
    const activity: Activity = {
      date: today,
      steps: parseInt(steps) || existing?.steps || 0,
      calories: parseInt(calories) || existing?.calories || 0,
      distance: parseFloat(distance) || existing?.distance || 0,
      workouts: [...(existing?.workouts ?? []), workout],
    }
    await onSave(activity)
    setSaving(false); setSaved(true)
    setTimeout(onClose, 700)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', padding: '20px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 3, background: 'var(--border-strong)', borderRadius: '2px', margin: '0 auto 20px' }} />

        <div className="flex items-center justify-between mb-5">
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--green)', letterSpacing: '0.2em' }}>NUOVO</p>
            <h2 className="font-display" style={{ fontSize: '2rem', color: 'var(--text)', lineHeight: 1 }}>ALLENAMENTO</h2>
          </div>
          <button onClick={onClose}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', color: 'var(--text-sub)', width: 36, height: 36, borderRadius: '4px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>

        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', marginBottom: '10px' }}>TIPO</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginBottom: '16px' }}>
          {TYPES.map(t => (
            <button key={t.value} onClick={() => setType(t.value)}
              className="font-display flex flex-col items-center gap-1"
              style={{ padding: '12px 6px', background: type === t.value ? 'rgba(196,255,0,0.1)' : 'var(--bg-card)', border: `1px solid ${type === t.value ? 'var(--lime)' : 'var(--border)'}`, borderRadius: '4px', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.4rem' }}>{t.icon}</span>
              <span style={{ fontSize: '0.85rem', color: type === t.value ? 'var(--lime)' : 'var(--text-sub)', letterSpacing: '0.06em' }}>{t.label}</span>
            </button>
          ))}
        </div>

        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', marginBottom: '8px' }}>DURATA (MIN) *</p>
        <input type="number" inputMode="numeric" placeholder="45" value={duration} onChange={e => setDuration(e.target.value)}
          style={{ ...inputStyle, marginBottom: '14px' }}
          onFocus={e => (e.target.style.borderColor = 'var(--lime)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: 'PASSI', value: steps, set: setSteps, placeholder: '8500', color: 'var(--blue)' },
            { label: 'KCAL', value: calories, set: setCalories, placeholder: '350', color: 'var(--orange)' },
            { label: 'KM', value: distance, set: setDistance, placeholder: '5.2', color: 'var(--green)' },
          ].map(f => (
            <div key={f.label}>
              <p style={{ fontSize: '9px', fontWeight: 700, color: f.color, letterSpacing: '0.15em', marginBottom: '6px' }}>{f.label}</p>
              <input type="number" inputMode="decimal" placeholder={f.placeholder} value={f.value} onChange={e => f.set(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = f.color)}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
          ))}
        </div>

        <button onClick={handleSave} disabled={saving || saved || !duration} className="font-display w-full"
          style={{ background: saved ? 'rgba(196,255,0,0.15)' : !duration || saving ? 'rgba(196,255,0,0.2)' : 'var(--lime)', color: saved ? 'var(--lime)' : '#000', padding: '14px', fontSize: '1.2rem', letterSpacing: '0.06em', borderRadius: '4px', border: 'none', cursor: !duration || saving ? 'not-allowed' : 'pointer' }}>
          {saved ? '✓ SALVATO' : saving ? '...' : 'SALVA ALLENAMENTO →'}
        </button>
      </div>
    </div>
  )
}
