import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loginWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('Email o password non validi')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      await loginWithGoogle()
      navigate('/dashboard')
    } catch {
      setError('Errore con Google. Riprova.')
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
        padding: '72px 28px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: '-30px', left: '20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              ⚡
            </div>
            <span className="font-display" style={{ fontSize: '1.8rem', color: 'white', letterSpacing: '0.02em' }}>FitSocial</span>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
            Allenati, sfida gli amici e vinci premi reali.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            {['🏃 Corsa', '💪 Gym', '🚴 Cycling'].map(t => (
              <span key={t} style={{
                fontSize: '11px', color: 'rgba(255,255,255,0.8)',
                background: 'rgba(255,255,255,0.12)',
                padding: '4px 10px', borderRadius: '20px', fontWeight: 500,
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* FORM AREA */}
      <div style={{ flex: 1, padding: '28px 24px 40px', maxWidth: '440px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px', fontFamily: "'Sora', sans-serif" }}>
          Bentornato 👋
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '24px' }}>
          Accedi per continuare il tuo allenamento
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
          <div>
            <label htmlFor="login-email" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Email</label>
            <input id="login-email" type="email" placeholder="la@tua.email" value={email} onChange={e => setEmail(e.target.value)} required
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label htmlFor="login-password" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Password</label>
            <input id="login-password" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--indigo)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button type="button" onClick={async () => {
              if (!email.trim()) { setError('Inserisci la tua email prima di resettare la password'); return }
              try {
                const { sendPasswordResetEmail } = await import('firebase/auth')
                const { auth } = await import('../firebase')
                await sendPasswordResetEmail(auth, email)
                setError('Email di reset inviata! Controlla la tua casella di posta.')
              } catch {
                setError('Impossibile inviare l\'email di reset. Verifica l\'indirizzo.')
              }
            }} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: 'var(--indigo)', fontWeight: 600,
              padding: '6px 0 0', fontFamily: "'DM Sans', sans-serif",
            }}>
              Password dimenticata?
            </button>
          </div>
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
            {loading ? 'Accesso...' : 'Accedi →'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 600, letterSpacing: '0.1em' }}>OPPURE</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <button onClick={handleGoogle} disabled={loading}
          style={{
            background: 'var(--bg-card)', border: '1.5px solid var(--border)',
            color: 'var(--text)', padding: '13px', fontSize: '13px', fontWeight: 600,
            borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '10px', cursor: 'pointer', width: '100%',
            boxShadow: 'var(--shadow-sm)',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continua con Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-sub)' }}>
          Non hai un account?{' '}
          <Link to="/register" style={{ color: 'var(--indigo)', fontWeight: 700, textDecoration: 'none' }}>Registrati</Link>
        </p>
      </div>
    </div>
  )
}
