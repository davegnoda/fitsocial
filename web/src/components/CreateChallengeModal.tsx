import { useState } from 'react'
import { createChallenge } from '../services/challengeService'
import { useAuth } from '../contexts/AuthContext'
import type { Challenge } from '../types'

interface Props {
  onSave: () => void
  onClose: () => void
}

const TYPES: { value: Challenge['type']; icon: string; label: string }[] = [
  { value: 'distance', icon: '📍', label: 'Distanza' },
  { value: 'calories', icon: '🔥', label: 'Calorie' },
  { value: 'active_minutes', icon: '⏱️', label: 'Minuti Attivi' },
  { value: 'workouts', icon: '💪', label: 'Workout' },
]

const PERIODS: { value: Challenge['period']; label: string }[] = [
  { value: 'daily', label: 'Giornaliera' },
  { value: 'weekly', label: 'Settimanale' },
  { value: 'monthly', label: 'Mensile' },
]

const LEVELS: { value: Challenge['fitnessLevel']; label: string }[] = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzato' },
  { value: 'all', label: 'Tutti' },
]

export default function CreateChallengeModal({ onSave, onClose }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<Challenge['type']>('distance')
  const [period, setPeriod] = useState<Challenge['period']>('weekly')
  const [fitnessLevel, setFitnessLevel] = useState<Challenge['fitnessLevel']>('all')
  const [prizeValue, setPrizeValue] = useState('')
  const [prizeBrand, setPrizeBrand] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!user || !title.trim()) return
    setSaving(true)
    setError('')
    try {
      const now = Date.now()
      const duration = period === 'daily' ? 86400000 : period === 'weekly' ? 7 * 86400000 : 30 * 86400000
      await createChallenge({
        title: title.trim(),
        type,
        scoringMode: 'improvement',
        verifiedOnly: true,
        period,
        fitnessLevel,
        participants: [user.uid],
        prize: { type: 'sponsored', value: prizeValue.trim(), brandName: prizeBrand.trim() || undefined },
        leaderboard: [],
        startDate: now,
        endDate: now + duration,
      })
      onSave()
      onClose()
    } catch {
      setError('Errore nella creazione. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  const baseInput: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1.5px solid var(--border)',
    color: 'var(--text)',
    padding: '12px 14px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '12px',
    outline: 'none',
    width: '100%',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  }

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '20px',
    cursor: 'pointer',
    background: active ? 'var(--gradient)' : 'var(--bg-surface)',
    color: active ? 'white' : 'var(--text-sub)',
    border: active ? 'none' : '1px solid var(--border)',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  })

  const canSave = !!title.trim() && !saving

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        paddingBottom: '64px',
        background: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%',
        background: 'var(--bg-card)',
        borderRadius: '24px 24px 0 0',
        border: '1px solid var(--border)',
        boxShadow: '0 -8px 40px rgba(15,23,42,0.15)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
          <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: '2px', margin: '0 auto 20px' }} />

          {/* Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--indigo)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Nuova</p>
              <h2 className="font-display" style={{ fontSize: '1.8rem', color: 'var(--text)', lineHeight: 1 }}>Crea una Sfida</h2>
            </div>
            <button onClick={onClose} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              color: 'var(--text-sub)', width: 36, height: 36, borderRadius: '10px',
              fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>x</button>
          </div>

          {/* Title input */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Titolo</p>
          <input
            type="text"
            placeholder="Es. Sfida 10.000 passi"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ ...baseInput, marginBottom: '18px' }}
            onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />

          {/* Type pills */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Tipo</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={pillStyle(type === t.value)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Period pills */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Periodo</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)} style={pillStyle(period === p.value)}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Fitness Level pills */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Livello</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
            {LEVELS.map(l => (
              <button key={l.value} onClick={() => setFitnessLevel(l.value)} style={pillStyle(fitnessLevel === l.value)}>
                {l.label}
              </button>
            ))}
          </div>

          {/* Prize value */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Premio</p>
          <input
            type="text"
            placeholder="Es. €50 Nike Gift Card"
            value={prizeValue}
            onChange={e => setPrizeValue(e.target.value)}
            style={{ ...baseInput, marginBottom: '12px' }}
            onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />

          {/* Prize brand */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Brand Sponsor (opzionale)</p>
          <input
            type="text"
            placeholder="Es. Nike"
            value={prizeBrand}
            onChange={e => setPrizeBrand(e.target.value)}
            style={{ ...baseInput, marginBottom: '12px' }}
            onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />

          <div style={{ height: '8px' }} />
        </div>

        {/* Sticky footer */}
        <div style={{
          padding: '16px 20px 32px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)',
          flexShrink: 0,
        }}>
          {error && (
            <p style={{ fontSize: '12px', color: '#DC2626', marginBottom: '8px', textAlign: 'center' }}>{error}</p>
          )}
          <button onClick={handleSubmit} disabled={!canSave}
            style={{
              background: !canSave ? 'var(--bg-surface)' : 'var(--gradient)',
              color: !canSave ? 'var(--text-sub)' : 'white',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: '14px',
              border: 'none',
              cursor: canSave ? 'pointer' : 'not-allowed',
              width: '100%',
              fontFamily: "'Sora', sans-serif",
              boxShadow: canSave ? '0 4px 16px rgba(79,70,229,0.35)' : 'none',
              transition: 'all 0.2s',
            }}>
            {saving ? 'Creazione...' : 'Crea Sfida'}
          </button>
        </div>
      </div>
    </div>
  )
}
