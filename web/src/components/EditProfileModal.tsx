import { useState } from 'react'
import type { UserProfile } from '../types'

interface Props {
  profile: UserProfile
  onSave: (data: Partial<UserProfile>) => Promise<void>
  onClose: () => void
}

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Principiante', icon: '🌱' },
  { value: 'intermediate', label: 'Intermedio', icon: '🔥' },
  { value: 'advanced', label: 'Avanzato', icon: '⚡' },
] as const

export default function EditProfileModal({ profile, onSave, onClose }: Props) {
  const [name, setName] = useState(profile.name ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [fitnessLevel, setFitnessLevel] = useState<UserProfile['fitnessLevel']>(profile.fitnessLevel ?? 'beginner')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), city: city.trim(), fitnessLevel })
    setSaving(false)
    setSaved(true)
    setTimeout(onClose, 700)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full rounded-t-3xl px-5 pt-5 pb-8"
        style={{ background: '#0F0F14', border: '1px solid #1C1C24', borderBottom: 'none' }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#2A2A35' }} />

        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: '#BF5AF2' }}>Modifica</p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#F8F8FC', lineHeight: 1 }}>
              PROFILO
            </h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#1C1C24', color: '#8A8A96', fontSize: '1.2rem' }}>
            ×
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs uppercase tracking-widest font-bold block mb-2" style={{ color: '#8A8A96' }}>Nome *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl px-4 py-3.5 text-sm outline-none"
              style={{ background: '#141419', border: '1px solid #1C1C24', color: '#F8F8FC' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(191,90,242,0.5)')}
              onBlur={e => (e.target.style.borderColor = '#1C1C24')}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-bold block mb-2" style={{ color: '#8A8A96' }}>Città</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full rounded-xl px-4 py-3.5 text-sm outline-none"
              style={{ background: '#141419', border: '1px solid #1C1C24', color: '#F8F8FC' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(191,90,242,0.5)')}
              onBlur={e => (e.target.style.borderColor = '#1C1C24')}
            />
          </div>
        </div>

        <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: '#8A8A96' }}>Livello fitness</p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {FITNESS_LEVELS.map(l => (
            <button
              key={l.value}
              onClick={() => setFitnessLevel(l.value)}
              className="rounded-xl py-3 flex flex-col items-center gap-1 transition-all"
              style={{
                background: fitnessLevel === l.value ? 'rgba(191,90,242,0.12)' : '#141419',
                border: fitnessLevel === l.value ? '1px solid rgba(191,90,242,0.4)' : '1px solid #1C1C24',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>{l.icon}</span>
              <span className="text-xs font-bold" style={{ color: fitnessLevel === l.value ? '#BF5AF2' : '#8A8A96' }}>{l.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || saved || !name.trim()}
          className="w-full rounded-2xl py-4 font-bold uppercase tracking-wider text-sm transition-all"
          style={{
            background: saved ? 'rgba(191,90,242,0.2)' : saving || !name.trim() ? 'rgba(191,90,242,0.2)' : 'linear-gradient(135deg, #BF5AF2, #0A84FF)',
            color: saved ? '#BF5AF2' : '#FFFFFF',
            boxShadow: saving || saved || !name.trim() ? 'none' : '0 4px 24px rgba(191,90,242,0.3)',
          }}
        >
          {saved ? '✓ Salvato!' : saving ? 'Salvataggio...' : 'Salva profilo →'}
        </button>
      </div>
    </div>
  )
}
