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
      // Fire profile creation in background — don't block navigation
      createUserProfile(result.user.uid, { name, email, city }).catch(() => {})
      navigate('/dashboard')
    } catch {
      setError('Errore durante la registrazione. Email già in uso?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden"
      style={{ background: '#060B17' }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(155,91,255,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(255,69,0,0.05) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '3rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}
          >
            <span style={{ color: '#FF4500' }}>REGI</span>
            <span style={{ color: '#F8F8FC' }}>STRATI</span>
          </h1>
          <p className="text-sm mt-2 uppercase tracking-widest font-bold" style={{ color: '#8A8A96' }}>
            Unisciti alla community
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
            style={{ background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.3)', color: '#FF6B3D' }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Nome completo"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
            style={{
              background: '#0E1424',
              border: '1px solid #182035',
              color: '#F8F8FC',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,69,0,0.5)'}
            onBlur={e => e.target.style.borderColor = '#182035'}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
            style={{
              background: '#0E1424',
              border: '1px solid #182035',
              color: '#F8F8FC',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,69,0,0.5)'}
            onBlur={e => e.target.style.borderColor = '#182035'}
            required
          />
          <input
            type="text"
            placeholder="Città"
            value={city}
            onChange={e => setCity(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
            style={{
              background: '#0E1424',
              border: '1px solid #182035',
              color: '#F8F8FC',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,69,0,0.5)'}
            onBlur={e => e.target.style.borderColor = '#182035'}
            required
          />
          <input
            type="password"
            placeholder="Password (min. 6 caratteri)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
            style={{
              background: '#0E1424',
              border: '1px solid #182035',
              color: '#F8F8FC',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,69,0,0.5)'}
            onBlur={e => e.target.style.borderColor = '#182035'}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wider transition-all"
            style={{
              background: loading ? 'rgba(255,69,0,0.3)' : 'linear-gradient(135deg, #FF4500, #FF6A00)',
              color: '#FFFFFF',
              boxShadow: loading ? 'none' : '0 4px 24px rgba(255,69,0,0.35)',
            }}
          >
            {loading ? 'Registrazione...' : 'Crea account →'}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center mt-8 text-sm" style={{ color: '#8A8A96' }}>
          Hai già un account?{' '}
          <Link to="/login" className="font-bold hover:opacity-80" style={{ color: '#FF4500' }}>
            Accedi
          </Link>
        </p>
      </div>
    </div>
  )
}
