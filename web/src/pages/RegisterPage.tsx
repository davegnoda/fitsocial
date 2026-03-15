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
      createUserProfile(result.user.uid, { name, email, city }).catch(() => {})
      navigate('/dashboard')
    } catch {
      setError('Errore durante la registrazione. Email già in uso?')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    color: 'var(--text)', padding: '14px 16px', fontSize: '14px',
    borderRadius: '4px', outline: 'none', width: '100%',
    fontFamily: 'DM Sans, sans-serif',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Brand */}
      <div style={{ padding: '48px 24px 0' }}>
        <div className="flex items-end gap-1">
          <span className="font-display" style={{ fontSize: '3.8rem', color: 'var(--lime)', lineHeight: 1 }}>FIT</span>
          <span className="font-display" style={{ fontSize: '3.8rem', color: 'var(--text)', lineHeight: 1 }}>SOCIAL</span>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-sub)', letterSpacing: '0.22em', fontWeight: 700, marginTop: '6px' }}>
          UNISCITI ALLA COMMUNITY
        </p>
      </div>

      <div style={{ height: '1px', background: 'var(--border)', margin: '28px 0 0' }} />

      {/* Form area */}
      <div style={{ flex: 1, padding: '28px 24px 40px', maxWidth: '440px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.2em', marginBottom: '20px' }}>
          CREA IL TUO ACCOUNT
        </p>

        {error && (
          <div style={{ fontSize: '12px', color: 'var(--orange)', background: 'rgba(255,69,0,0.06)', border: '1px solid rgba(255,69,0,0.2)', padding: '10px 14px', borderRadius: '4px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} required
            style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--lime)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
            style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--lime)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
          <input type="text" placeholder="Città" value={city} onChange={e => setCity(e.target.value)} required
            style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--lime)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
          <input type="password" placeholder="Password (min. 6 caratteri)" value={password} onChange={e => setPassword(e.target.value)} required
            style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--lime)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />

          <button type="submit" disabled={loading} className="font-display"
            style={{ background: loading ? 'rgba(196,255,0,0.25)' : 'var(--lime)', color: '#000', padding: '14px', fontSize: '1.3rem', letterSpacing: '0.06em', borderRadius: '4px', border: 'none', marginTop: '6px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '...' : 'CREA ACCOUNT →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'var(--text-sub)' }}>
          Hai già un account?{' '}
          <Link to="/login" style={{ color: 'var(--lime)', fontWeight: 700, textDecoration: 'none' }}>Accedi</Link>
        </p>
      </div>
    </div>
  )
}
