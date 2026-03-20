import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { updateUserProfile } from '../services/userService'

const SPORTS = [
  { key: 'running', label: 'Running', emoji: '\u{1F3C3}' },
  { key: 'gym', label: 'Gym', emoji: '\u{1F4AA}' },
  { key: 'cycling', label: 'Ciclismo', emoji: '\u{1F6B4}' },
  { key: 'yoga', label: 'Yoga', emoji: '\u{1F9D8}' },
  { key: 'hiit', label: 'HIIT', emoji: '\u26A1' },
  { key: 'walking', label: 'Camminata', emoji: '\u{1F6B6}' },
  { key: 'swimming', label: 'Nuoto', emoji: '\u{1F3CA}' },
  { key: 'other', label: 'Altro', emoji: '\u{1F3AF}' },
]

const LEVELS = [
  { key: 'beginner' as const, label: 'Principiante', desc: 'Ho appena iniziato', emoji: '\u{1F331}' },
  { key: 'intermediate' as const, label: 'Intermedio', desc: 'Mi alleno regolarmente', emoji: '\u{1F4AA}' },
  { key: 'advanced' as const, label: 'Avanzato', desc: 'Atleta esperto', emoji: '\u{1F525}' },
]

const STEP_GOALS = [5000, 8000, 10000, 15000]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [sports, setSports] = useState<string[]>([])
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced' | ''>('')
  const [stepsGoal, setStepsGoal] = useState(8000)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const toggleSport = (key: string) => {
    setSports(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    )
  }

  const canAdvance = () => {
    if (step === 1) return name.trim().length > 0 && city.trim().length > 0
    if (step === 2) return sports.length > 0
    if (step === 3) return level !== ''
    return false
  }

  const handleFinish = async () => {
    if (!user || level === '') return
    setSaving(true)
    try {
      setSaveError('')
      await updateUserProfile(user.uid, {
        name: name.trim(),
        city: city.trim(),
        fitnessLevel: level,
        sports,
        stepsGoal,
      })
      navigate('/dashboard')
    } catch {
      setSaveError('Errore nel salvataggio. Controlla la connessione e riprova.')
      setSaving(false)
    }
  }

  const progressPercent = (step / 3) * 100

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1.5px solid var(--border)',
    color: 'var(--text)',
    padding: '14px 16px',
    fontSize: '15px',
    borderRadius: '12px',
    outline: 'none',
    width: '100%',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.2s',
  }

  const btnPrimary: React.CSSProperties = {
    background: 'var(--gradient)',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    width: '100%',
    opacity: canAdvance() ? 1 : 0.5,
    pointerEvents: canAdvance() ? 'auto' : 'none',
    transition: 'opacity 0.2s',
  }

  const btnSecondary: React.CSSProperties = {
    background: 'transparent',
    color: 'var(--text-sub)',
    border: '1.5px solid var(--border)',
    borderRadius: '14px',
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Progress bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: 'var(--border)',
        zIndex: 100,
      }}>
        <div style={{
          height: '100%',
          width: `${progressPercent}%`,
          background: 'var(--gradient)',
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Skip button */}
      <button onClick={() => navigate('/dashboard')} style={{
        position: 'fixed', top: '16px', right: '16px', zIndex: 101,
        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
        border: 'none', borderRadius: '20px', padding: '6px 16px',
        fontSize: '12px', fontWeight: 600, color: 'white', cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Salta →
      </button>

      {/* Header with step indicator */}
      <div style={{
        background: 'var(--gradient-hero)',
        padding: '48px 24px 32px',
        textAlign: 'center',
        borderRadius: '0 0 28px 28px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 24,
        }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: s === step ? 28 : 10,
              height: 10,
              borderRadius: 5,
              background: s <= step ? '#fff' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        <h1 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 26,
          fontWeight: 700,
          color: '#fff',
          margin: 0,
          marginBottom: 8,
        }}>
          {step === 1 && 'Benvenuto su FitSocial!'}
          {step === 2 && 'Quali sport pratichi?'}
          {step === 3 && 'Qual \u00e8 il tuo livello?'}
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 15,
          color: 'rgba(255,255,255,0.8)',
          margin: 0,
        }}>
          {step === 1 && 'Dicci qualcosa di te per personalizzare la tua esperienza'}
          {step === 2 && 'Seleziona tutti gli sport che ti interessano'}
          {step === 3 && 'Scegli il tuo livello e il tuo obiettivo giornaliero'}
        </p>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '28px 20px',
        maxWidth: 440,
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Step 1: Name and City */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-sub)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 8,
                display: 'block',
              }}>Nome</label>
              <input
                type="text"
                placeholder="Il tuo nome"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--indigo)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-sub)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 8,
                display: 'block',
              }}>Citt\u00e0</label>
              <input
                type="text"
                placeholder="La tua citt\u00e0"
                value={city}
                onChange={e => setCity(e.target.value)}
                style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--indigo)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>
        )}

        {/* Step 2: Sports */}
        {step === 2 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {SPORTS.map(sport => {
              const selected = sports.includes(sport.key)
              return (
                <button
                  key={sport.key}
                  onClick={() => toggleSport(sport.key)}
                  style={{
                    background: selected ? 'var(--gradient)' : 'var(--bg-card)',
                    color: selected ? '#fff' : 'var(--text)',
                    border: selected ? 'none' : '1.5px solid var(--border)',
                    borderRadius: 16,
                    padding: '18px 12px',
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                    boxShadow: selected ? '0 4px 16px rgba(79,70,229,0.3)' : 'var(--shadow-sm)',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{sport.emoji}</span>
                  <span>{sport.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Step 3: Level + Steps Goal */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {LEVELS.map(lv => {
                const selected = level === lv.key
                return (
                  <button
                    key={lv.key}
                    onClick={() => setLevel(lv.key)}
                    style={{
                      background: selected ? 'var(--gradient)' : 'var(--bg-card)',
                      color: selected ? '#fff' : 'var(--text)',
                      border: selected ? 'none' : '1.5px solid var(--border)',
                      borderRadius: 16,
                      padding: '18px 20px',
                      fontSize: 15,
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      transition: 'all 0.2s ease',
                      boxShadow: selected ? '0 4px 16px rgba(79,70,229,0.3)' : 'var(--shadow-sm)',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{lv.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{lv.label}</div>
                      <div style={{
                        fontSize: 13,
                        color: selected ? 'rgba(255,255,255,0.8)' : 'var(--text-sub)',
                        marginTop: 2,
                      }}>{lv.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Steps Goal */}
            <div>
              <label style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-sub)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 12,
                display: 'block',
              }}>Obiettivo passi giornaliero</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {STEP_GOALS.map(goal => {
                  const selected = stepsGoal === goal
                  return (
                    <button
                      key={goal}
                      onClick={() => setStepsGoal(goal)}
                      style={{
                        flex: 1,
                        background: selected ? 'var(--indigo-light)' : 'var(--bg-card)',
                        color: selected ? 'var(--indigo)' : 'var(--text-sub)',
                        border: selected ? '1.5px solid var(--indigo)' : '1.5px solid var(--border)',
                        borderRadius: 12,
                        padding: '12px 4px',
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {(goal / 1000).toFixed(0)}k
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div style={{
        padding: '16px 20px 32px',
        maxWidth: 440,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        gap: 12,
      }}>
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{ ...btnSecondary, width: 'auto', flex: '0 0 auto', padding: '14px 20px' }}
          >
            Indietro
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => canAdvance() && setStep(s => s + 1)}
            style={btnPrimary}
          >
            Avanti
          </button>
        ) : (
          <button
            onClick={handleFinish}
            style={{ ...btnPrimary, opacity: canAdvance() && !saving ? 1 : 0.5, pointerEvents: canAdvance() && !saving ? 'auto' : 'none' }}
          >
            {saving ? 'Salvataggio...' : 'Inizia!'}
          </button>
        )}
      </div>

      {saveError && (
        <p style={{
          padding: '0 16px 16px',
          maxWidth: 440,
          margin: '0 auto',
          width: '100%',
          fontSize: '12px',
          color: '#DC2626',
          lineHeight: 1.4,
          textAlign: 'center',
        }}>
          {saveError}
        </p>
      )}
    </div>
  )
}
