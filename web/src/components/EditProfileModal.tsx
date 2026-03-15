import { useState } from 'react'
import type { UserProfile } from '../types'

interface Props {
  profile: UserProfile
  onSave: (data: Partial<UserProfile>) => Promise<void>
  onClose: () => void
}

const FITNESS_LEVELS = [
  { value: 'beginner',     icon: '🌱', label: 'ROOKIE' },
  { value: 'intermediate', icon: '🔥', label: 'PRO' },
  { value: 'advanced',     icon: '⚡', label: 'ELITE' },
] as const

export default function EditProfileModal({ profile, onSave, onClose }: Props) {
  const [name, setName] = useState(profile.name ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [fitnessLevel, setFitnessLevel] = useState<UserProfile['fitnessLevel']>(profile.fitnessLevel ?? 'beginner')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const inputStyle = {
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    color: 'var(--text)', padding: '13px 14px', fontSize: '14px',
    borderRadius: '4px', outline: 'none', width: '100%',
    fontFamily: 'DM Sans, sans-serif',
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), city: city.trim(), fitnessLevel })
    setSaving(false); setSaved(true)
    setTimeout(onClose, 700)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', padding: '20px 20px 40px' }}>
        <div style={{ width: 40, height: 3, background: 'var(--border-strong)', borderRadius: '2px', margin: '0 auto 20px' }} />

        <div className="flex items-center justify-between mb-5">
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--purple)', letterSpacing: '0.2em' }}>MODIFICA</p>
            <h2 className="font-display" style={{ fontSize: '2rem', color: 'var(--text)', lineHeight: 1 }}>PROFILO</h2>
          </div>
          <button onClick={onClose}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', color: 'var(--text-sub)', width: 36, height: 36, borderRadius: '4px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', marginBottom: '6px' }}>NOME *</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--purple)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', marginBottom: '6px' }}>CITTÀ</p>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--purple)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
          </div>
        </div>

        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.15em', marginBottom: '10px' }}>LIVELLO FITNESS</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginBottom: '20px' }}>
          {FITNESS_LEVELS.map(l => (
            <button key={l.value} onClick={() => setFitnessLevel(l.value)}
              className="font-display flex flex-col items-center gap-1"
              style={{ padding: '12px 6px', background: fitnessLevel === l.value ? 'rgba(168,85,247,0.1)' : 'var(--bg-card)', border: `1px solid ${fitnessLevel === l.value ? 'var(--purple)' : 'var(--border)'}`, borderRadius: '4px', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.4rem' }}>{l.icon}</span>
              <span style={{ fontSize: '0.85rem', color: fitnessLevel === l.value ? 'var(--purple)' : 'var(--text-sub)', letterSpacing: '0.06em' }}>{l.label}</span>
            </button>
          ))}
        </div>

        <button onClick={handleSave} disabled={saving || saved || !name.trim()} className="font-display w-full"
          style={{ background: saved ? 'rgba(168,85,247,0.15)' : !name.trim() || saving ? 'rgba(168,85,247,0.2)' : 'var(--purple)', color: saved ? 'var(--purple)' : '#fff', padding: '14px', fontSize: '1.2rem', letterSpacing: '0.06em', borderRadius: '4px', border: 'none', cursor: !name.trim() || saving ? 'not-allowed' : 'pointer' }}>
          {saved ? '✓ SALVATO' : saving ? '...' : 'SALVA PROFILO →'}
        </button>
      </div>
    </div>
  )
}
