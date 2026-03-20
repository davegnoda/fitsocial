import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { createUserProfile } from '../services/userService'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password minimo 6 caratteri'); return }
    setLoading(true)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await createUserProfile(result.user.uid, { name, email, city })
      navigate('/onboarding')
    } catch {
      setError('Errore durante la registrazione. Email già in uso?')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1.5px solid var(--border)',
    color: 'var(--text)',
    padding: '14px 16px',
    fontSize: '14px',
    borderRadius: '12px',
    outline: 'none',
    width: '100%',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* HERO */}
      <div style={{
        background: 'var(--gradient-hero)',
        padding: '72px 28px 36px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'relative' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              ⚡
            </div>
            <span className="font-display" style={{ fontSize: '1.8rem', color: 'white', letterSpacing: '0.02em' }}>FitSocial</span>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>Unisciti alla community fitness più attiva d'Italia.</p>
        </div>
      </div>

      {/* FORM AREA */}
      <div style={{ flex: 1, padding: '28px 24px 40px', maxWidth: '440px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px', fontFamily: "'Sora', sans-serif" }}>
          Crea il tuo account 🚀
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '24px' }}>
          Inizia a tracciare, sfidare e vincere
        </p>

        {error && (
          <div style={{
            fontSize: '13px', color: '#DC2626',
            background: '#FEF2F2', border: '1px solid #FEE2E2',
            padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} required
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <input type="text" placeholder="Città" value={city} onChange={e => setCity(e.target.value)} required
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <input type="password" placeholder="Password (min. 6 caratteri)" value={password} onChange={e => setPassword(e.target.value)} required
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />

          <button type="submit" disabled={loading} className="font-display"
            style={{
              background: loading ? 'var(--bg-surface)' : 'var(--gradient)',
              color: loading ? 'var(--text-sub)' : 'white',
              padding: '14px', fontSize: '1rem', letterSpacing: '0.04em',
              borderRadius: '14px', border: 'none', marginTop: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(79,70,229,0.35)',
              fontFamily: "'Sora', sans-serif", fontWeight: 700,
              transition: 'all 0.2s',
            }}>
            {loading ? 'Creazione account...' : 'Crea account →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-sub)' }}>
          Hai già un account?{' '}
          <Link to="/login" style={{ color: 'var(--indigo)', fontWeight: 700, textDecoration: 'none' }}>Accedi</Link>
        </p>
      </div>
    </div>
  )
}
