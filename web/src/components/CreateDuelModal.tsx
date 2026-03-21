import { useState } from 'react'
import type { Duel } from '../types'

interface Props {
  onClose: () => void
  onCreated: () => void
}

const TYPES: { value: Duel['type']; icon: string; label: string }[] = [
  { value: 'distance', icon: '📍', label: 'Distanza' },
  { value: 'calories', icon: '🔥', label: 'Calorie' },
  { value: 'active_minutes', icon: '⏱️', label: 'Minuti Attivi' },
]

const DURATIONS: { value: Duel['duration']; label: string }[] = [
  { value: '24h', label: '24 ore' },
  { value: '48h', label: '48 ore' },
  { value: '7d', label: '7 giorni' },
]

export default function CreateDuelModal({ onClose, onCreated }: Props) {
  const [type, setType] = useState<Duel['type']>('distance')
  const [duration, setDuration] = useState<Duel['duration']>('24h')
  const [hasBet, setHasBet] = useState(false)
  const [betAmount, setBetAmount] = useState(5)

  const handleCreate = () => {
    // Backend call will be wired when Cloud Functions are deployed
    onCreated()
    onClose()
  }

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 16px',
    fontSize: '13px',
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
        animation: 'slide-up 0.3s ease',
      }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
          <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: '2px', margin: '0 auto 20px' }} />

          {/* Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--indigo)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Nuovo</p>
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>Crea Duello ⚔️</h2>
            </div>
            <button onClick={onClose} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              color: 'var(--text-sub)', width: 36, height: 36, borderRadius: '10px',
              fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>x</button>
          </div>

          {/* Opponent */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Avversario</p>
          <input
            type="text"
            placeholder="Cerca tra i tuoi amici..."
            disabled
            style={{
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--border)',
              color: 'var(--text-sub)',
              padding: '12px 14px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '12px',
              outline: 'none',
              width: '100%',
              fontFamily: "'DM Sans', sans-serif",
              boxSizing: 'border-box',
              marginBottom: '18px',
              cursor: 'not-allowed',
              opacity: 0.7,
            }}
          />

          {/* Type pills */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Tipo di Sfida</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={pillStyle(type === t.value)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Duration pills */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Durata</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            {DURATIONS.map(d => (
              <button key={d.value} onClick={() => setDuration(d.value)} style={pillStyle(duration === d.value)}>
                ⏱️ {d.label}
              </button>
            ))}
          </div>

          {/* Bet toggle */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Scommessa (opzionale)</p>
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: '14px',
            padding: '14px 16px',
            border: '1px solid var(--border)',
            marginBottom: '8px',
          }}>
            <div className="flex items-center justify-between" style={{ marginBottom: hasBet ? '14px' : 0 }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>💰 Scommessa</p>
                <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>Chi perde paga</p>
              </div>
              <button
                onClick={() => setHasBet(!hasBet)}
                style={{
                  width: '48px', height: '28px', borderRadius: '14px',
                  background: hasBet ? 'var(--indigo)' : 'var(--bg-card)',
                  border: `2px solid ${hasBet ? 'var(--indigo)' : 'var(--border)'}`,
                  cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                  padding: 0,
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  position: 'absolute', top: '2px',
                  left: hasBet ? '22px' : '2px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {hasBet && (
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  {[1, 2, 5, 10, 20].map(amt => (
                    <button key={amt} onClick={() => setBetAmount(amt)}
                      style={{
                        padding: '8px 12px', fontSize: '13px', fontWeight: 700,
                        borderRadius: '10px', cursor: 'pointer',
                        background: betAmount === amt ? 'var(--indigo)' : 'var(--bg-card)',
                        color: betAmount === amt ? 'white' : 'var(--text)',
                        border: betAmount === amt ? 'none' : '1px solid var(--border)',
                        fontFamily: "'DM Sans', sans-serif",
                        transition: 'all 0.15s',
                      }}>
                      €{amt}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '10px', color: '#F59E0B', fontWeight: 600, letterSpacing: '0.02em' }}>
                  ⚠️ Richiede verifica smartwatch · Commissione 10%
                </p>
              </div>
            )}
          </div>

          <div style={{ height: '8px' }} />
        </div>

        {/* Sticky footer */}
        <div style={{
          padding: '16px 20px 32px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)',
          flexShrink: 0,
        }}>
          <button onClick={handleCreate}
            style={{
              background: 'var(--gradient)',
              color: 'white',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              fontFamily: "'Sora', sans-serif",
              boxShadow: '0 4px 16px rgba(79,70,229,0.35)',
              transition: 'all 0.2s',
            }}>
            Sfida! ⚔️
          </button>
        </div>
      </div>
    </div>
  )
}
