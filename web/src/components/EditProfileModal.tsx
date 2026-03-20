import { useState } from 'react'
import type { UserProfile } from '../types'

interface Props {
  profile: UserProfile
  onSave: (data: Partial<UserProfile>) => Promise<void>
  onClose: () => void
}

const FITNESS_LEVELS = [
  { value: 'beginner',     icon: '🌱', label: 'Beginner' },
  { value: 'intermediate', icon: '🔥', label: 'Intermedio' },
  { value: 'advanced',     icon: '⚡', label: 'Avanzato' },
] as const

export default function EditProfileModal({ profile, onSave, onClose }: Props) {
  const [name, setName] = useState(profile.name ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [fitnessLevel, setFitnessLevel] = useState<UserProfile['fitnessLevel']>(profile.fitnessLevel ?? 'beginner')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1.5px solid var(--border)',
    color: 'var(--text)',
    padding: '13px 14px',
    fontSize: '14px',
    borderRadius: '12px',
    outline: 'none',
    width: '100%',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.2s',
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), city: city.trim(), fitnessLevel })
      setSaving(false); setSaved(true)
      setTimeout(onClose, 700)
    } catch {
      setError('Errore nel salvataggio. Riprova.')
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', paddingBottom: '64px', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', background: 'var(--bg-card)',
        borderRadius: '24px 24px 0 0',
        border: '1px solid var(--border)',
        padding: '20px 20px 40px',
        boxShadow: '0 -8px 40px rgba(15,23,42,0.15)',
      }}>
        <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: '2px', margin: '0 auto 20px' }} />

        <div className="flex items-center justify-between mb-5">
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--indigo)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Modifica</p>
            <h2 className="font-display" style={{ fontSize: '1.8rem', color: 'var(--text)', lineHeight: 1 }}>Profilo</h2>
          </div>
          <button onClick={onClose}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              color: 'var(--text-sub)', width: 36, height: 36, borderRadius: '10px',
              fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Nome *</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Città</p>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Livello fitness</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '24px' }}>
          {FITNESS_LEVELS.map(l => (
            <button key={l.value} onClick={() => setFitnessLevel(l.value)}
              className="flex flex-col items-center gap-1.5"
              style={{
                padding: '14px 6px',
                background: fitnessLevel === l.value ? 'var(--indigo-light)' : 'var(--bg-surface)',
                border: `1.5px solid ${fitnessLevel === l.value ? 'var(--indigo)' : 'var(--border)'}`,
                borderRadius: '14px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: '1.4rem' }}>{l.icon}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: fitnessLevel === l.value ? 'var(--indigo)' : 'var(--text-sub)', fontFamily: "'Sora', sans-serif" }}>
                {l.label}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p style={{ fontSize: '12px', color: '#DC2626', marginBottom: '8px', textAlign: 'center' }}>{error}</p>
        )}
        <button onClick={handleSave} disabled={saving || saved || !name.trim()}
          style={{
            background: saved ? 'var(--green-bg)' : !name.trim() || saving ? 'var(--bg-surface)' : 'var(--gradient)',
            color: saved ? 'var(--green)' : !name.trim() || saving ? 'var(--text-sub)' : 'white',
            padding: '14px', fontSize: '1rem', fontWeight: 700,
            borderRadius: '14px', border: 'none', cursor: !name.trim() || saving ? 'not-allowed' : 'pointer',
            width: '100%', fontFamily: "'Sora', sans-serif",
            boxShadow: !name.trim() || saving || saved ? 'none' : '0 4px 16px rgba(79,70,229,0.35)',
            transition: 'all 0.2s',
          }}>
          {saved ? '✓ Salvato!' : saving ? 'Salvataggio...' : 'Salva profilo →'}
        </button>
      </div>
    </div>
  )
}
