import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { updateUserProfile } from '../services/userService'
import { requestPushPermission, isPushSupported } from '../services/pushService'
import { createCheckoutSession } from '../services/paymentService'
import { PROVIDERS } from '../services/healthService'
import type { DeviceProvider } from '../types'
import { doc, deleteDoc } from 'firebase/firestore'
import { deleteUser } from 'firebase/auth'
import { db } from '../firebase'
import Layout from '../components/Layout'

const fitnessLevels = [
  { value: 'beginner' as const, label: 'Principiante' },
  { value: 'intermediate' as const, label: 'Intermedio' },
  { value: 'advanced' as const, label: 'Avanzato' },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const { profile, refetch } = useUser()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [publicProfile, setPublicProfile] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [premiumLoading, setPremiumLoading] = useState(false)

  useEffect(() => {
    isPushSupported().then(setPushSupported)
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted')
    }
  }, [])

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setCity(profile.city ?? '')
      setFitnessLevel(profile.fitnessLevel ?? 'beginner')
      setPublicProfile((profile as unknown as Record<string, unknown>).public !== false)
    }
  }, [profile])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await updateUserProfile(user.uid, {
      name: name.trim(),
      city: city.trim(),
      fitnessLevel,
    })
    // Also save public flag
    const { updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, 'users', user.uid), { public: publicProfile })
    refetch()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePushToggle = async () => {
    if (!user) return
    setPushLoading(true)
    const result = await requestPushPermission(user.uid)
    setPushEnabled(result)
    setPushLoading(false)
  }

  const handleDelete = async () => {
    if (!user) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'users', user.uid))
      await deleteUser(user)
      navigate('/login')
    } catch {
      setDeleteError('Errore durante l\'eliminazione. Rieffettua il login e riprova.')
      setDeleting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    color: 'var(--text)',
    outline: 'none',
  }

  const sectionHeader: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-sub)',
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: '10px',
  }

  return (
    <Layout>
      {/* HEADER */}
      <div style={{
        background: 'var(--bg)',
        padding: '52px 20px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text)">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <h1 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '-0.01em',
        }}>
          Impostazioni
        </h1>
      </div>

      <div style={{ padding: '0 20px', paddingBottom: '32px' }}>
        {/* SUCCESS BANNER */}
        {saved && (
          <div style={{
            background: 'var(--green-bg)',
            border: '1px solid #BBF7D0',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--green)',
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: '0.01em',
          }}>
            Salvato!
          </div>
        )}

        {/* PREMIUM BANNER */}
        {profile?.plan !== 'premium' ? (
          <div style={{
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: '20px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
            animation: 'slide-up 0.3s ease',
          }}>
            {/* Subtle pattern overlay */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '22px' }}>👑</span>
                <h3 style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'white',
                  letterSpacing: '-0.01em',
                }}>
                  PASSA A PREMIUM
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {[
                  { icon: '🤖', text: 'AI Coach personalizzato' },
                  { icon: '🚫', text: 'Zero Ads' },
                  { icon: '🏆', text: 'Crea Sfide a Premi' },
                  { icon: '📊', text: 'Analisi AI Avanzata' },
                ].map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{b.icon}</span>
                    <span style={{
                      fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)',
                      fontFamily: "'DM Sans', sans-serif",
                    }}>{b.text}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{
                  fontSize: '20px', fontWeight: 800, color: 'white',
                  fontFamily: "'Sora', sans-serif",
                }}>
                  €6.99<span style={{ fontSize: '12px', fontWeight: 500, opacity: 0.8 }}>/mese</span>
                </p>
                <button
                  onClick={async () => {
                    if (!user) return
                    setPremiumLoading(true)
                    try {
                      const url = await createCheckoutSession(user.uid)
                      window.location.href = url
                    } catch {
                      setPremiumLoading(false)
                    }
                  }}
                  disabled={premiumLoading}
                  style={{
                    padding: '10px 24px',
                    background: 'white',
                    color: '#4F46E5',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: premiumLoading ? 'wait' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: '0.01em',
                  }}
                >
                  {premiumLoading ? '...' : 'Attiva Premium'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--green-bg, #F0FDF4)',
            border: '1px solid #BBF7D0',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slide-up 0.3s ease',
          }}>
            <span style={{
              fontSize: '12px', fontWeight: 700,
              color: 'var(--green, #16A34A)',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.02em',
            }}>
              PREMIUM ATTIVO ✓
            </span>
          </div>
        )}

        {/* PROFILE SECTION */}
        <p style={sectionHeader}>Profilo</p>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Name */}
          <div>
            <label style={{
              fontSize: '12px', fontWeight: 600, color: 'var(--text)',
              display: 'block', marginBottom: '6px',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Il tuo nome"
              style={inputStyle}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label style={{
              fontSize: '12px', fontWeight: 600, color: 'var(--text)',
              display: 'block', marginBottom: '6px',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Email
            </label>
            <input
              type="email"
              value={profile?.email ?? ''}
              readOnly
              style={{
                ...inputStyle,
                background: 'var(--bg-surface)',
                color: 'var(--text-sub)',
                cursor: 'not-allowed',
              }}
            />
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>L'email non può essere modificata per sicurezza</p>
          </div>

          {/* City */}
          <div>
            <label style={{
              fontSize: '12px', fontWeight: 600, color: 'var(--text)',
              display: 'block', marginBottom: '6px',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Città
            </label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="La tua città"
              style={inputStyle}
            />
          </div>

          {/* Fitness Level */}
          <div>
            <label style={{
              fontSize: '12px', fontWeight: 600, color: 'var(--text)',
              display: 'block', marginBottom: '8px',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Livello Fitness
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {fitnessLevels.map(fl => (
                <button
                  key={fl.value}
                  onClick={() => setFitnessLevel(fl.value)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: fitnessLevel === fl.value
                      ? '2px solid var(--indigo)'
                      : '1px solid var(--border)',
                    background: fitnessLevel === fl.value
                      ? 'var(--indigo-light)'
                      : 'var(--bg-surface)',
                    color: fitnessLevel === fl.value
                      ? 'var(--indigo)'
                      : 'var(--text-sub)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: '0.01em',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {fl.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px',
            background: saving ? 'var(--text-sub)' : 'var(--gradient)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: '0.01em',
            marginBottom: '28px',
          }}
        >
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>

        {/* PRIVACY SECTION */}
        <p style={sectionHeader}>Privacy</p>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: '14px 16px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <p style={{
              fontSize: '13px', fontWeight: 600, color: 'var(--text)',
              fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.01em',
            }}>
              Profilo visibile a tutti
            </p>
            <p style={{
              fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px',
              letterSpacing: '0.01em',
            }}>
              Il tuo profilo sarà visibile nella community
            </p>
          </div>
          {/* Toggle */}
          <button
            onClick={() => setPublicProfile(prev => !prev)}
            style={{
              width: '48px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              background: publicProfile ? 'var(--indigo)' : 'var(--border-strong)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: publicProfile ? '23px' : '3px',
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }} />
          </button>
        </div>

        {/* NOTIFICHE SECTION */}
        {pushSupported && (
          <div style={{ marginBottom: '24px' }}>
            <p style={sectionHeader}>Notifiche</p>
            <div style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius)',
              padding: '14px 16px', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>Notifiche Push</p>
                <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>Ricevi aggiornamenti su sfide e amici</p>
              </div>
              <button
                onClick={handlePushToggle}
                disabled={pushLoading}
                style={{
                  padding: '6px 14px', borderRadius: '20px', border: 'none',
                  background: pushEnabled ? 'var(--green-bg, #F0FDF4)' : 'var(--gradient)',
                  color: pushEnabled ? 'var(--green, #16A34A)' : 'white',
                  fontSize: '12px', fontWeight: 700, cursor: pushLoading ? 'wait' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                {pushLoading ? '...' : pushEnabled ? '\u2713 Attive' : 'Attiva'}
              </button>
            </div>
          </div>
        )}

        {/* DISPOSITIVI SECTION */}
        <p style={sectionHeader}>Dispositivi</p>
        <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '12px', lineHeight: 1.4 }}>
          Collega il tuo smartwatch per partecipare alle sfide. Solo dati verificati contano.
        </p>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: '4px 0',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '28px',
          animation: 'slide-up 0.3s ease',
        }}>
          {(Object.entries(PROVIDERS) as [DeviceProvider, typeof PROVIDERS[DeviceProvider]][]).map(([key, provider], idx, arr) => {
            const isConnected = profile?.connectedDevices?.includes(key)
            const authUrl = provider.authUrl(user?.uid ?? '')
            const canConnect = provider.available && !!authUrl
            return (
              <div key={key} style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: `${provider.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', flexShrink: 0,
                  }}>
                    {provider.icon}
                  </div>
                  <div>
                    <p style={{
                      fontSize: '13px', fontWeight: 600, color: 'var(--text)',
                      fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.01em',
                    }}>{provider.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '1px' }}>
                      Passi, calorie, battito, zone HR
                    </p>
                  </div>
                </div>
                {isConnected ? (
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px',
                    background: '#F0FDF4', color: '#16A34A',
                    fontSize: '11px', fontWeight: 700,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    Connesso
                  </span>
                ) : canConnect ? (
                  <button
                    onClick={() => { window.location.href = authUrl }}
                    style={{
                      padding: '6px 16px', borderRadius: '20px', border: 'none',
                      background: provider.color, color: 'white',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Connetti
                  </button>
                ) : (
                  <span style={{
                    fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    In arrivo
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* DANGER ZONE */}
        <p style={sectionHeader}>Zona Pericolosa</p>
        <div style={{
          background: '#FFF5F5',
          borderRadius: 'var(--radius)',
          padding: '16px',
          border: '1px solid #FEE2E2',
        }}>
          {!showDeleteConfirm ? (
            <>
              <p style={{
                fontSize: '13px', fontWeight: 600, color: '#DC2626',
                fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.01em',
              }}>
                Elimina Account
              </p>
              <p style={{
                fontSize: '11px', color: '#DC2626', opacity: 0.7, marginTop: '4px',
                lineHeight: 1.4, letterSpacing: '0.01em',
              }}>
                Questa azione è irreversibile. Tutti i tuoi dati verranno eliminati.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  background: '#DC2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '0.01em',
                }}
              >
                Elimina Account
              </button>
            </>
          ) : (
            <>
              <p style={{
                fontSize: '14px', fontWeight: 700, color: '#DC2626',
                fontFamily: "'Sora', sans-serif", letterSpacing: '-0.01em',
              }}>
                Sei sicuro?
              </p>
              <p style={{
                fontSize: '12px', color: '#DC2626', opacity: 0.7, marginTop: '4px',
                lineHeight: 1.4, letterSpacing: '0.01em',
              }}>
                Il tuo account e tutti i dati associati verranno eliminati permanentemente.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: deleting ? '#999' : '#DC2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: '0.01em',
                  }}
                >
                  {deleting ? 'Eliminazione...' : 'Elimina'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'white',
                    color: '#DC2626',
                    border: '1px solid #FEE2E2',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: '0.01em',
                  }}
                >
                  Annulla
                </button>
              </div>
              {deleteError && (
                <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '10px', lineHeight: 1.4 }}>
                  {deleteError}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
