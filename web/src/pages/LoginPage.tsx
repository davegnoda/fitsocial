import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
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
    setError('')
    try {
      await loginWithGoogle()
      navigate('/dashboard')
    } catch {
      setError('Accesso con Google fallito')
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden"
      style={{ background: '#07070A' }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(255,69,0,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(61,158,255,0.05) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '4rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}
          >
            <span style={{ color: '#FF4500' }}>FIT</span>
            <span style={{ color: '#F8F8FC' }}>SOCIAL</span>
          </h1>
          <p className="text-sm mt-2 uppercase tracking-widest font-bold" style={{ color: '#8A8A96' }}>
            Allenati · Sfida · Vinci
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
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
            style={{
              background: '#141419',
              border: '1px solid #1C1C24',
              color: '#F8F8FC',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,69,0,0.5)'}
            onBlur={e => e.target.style.borderColor = '#1C1C24'}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
            style={{
              background: '#141419',
              border: '1px solid #1C1C24',
              color: '#F8F8FC',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,69,0,0.5)'}
            onBlur={e => e.target.style.borderColor = '#1C1C24'}
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
            {loading ? 'Accesso in corso...' : 'Accedi →'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: '#1C1C24' }} />
          <span className="text-xs uppercase tracking-widest" style={{ color: '#3A3A44' }}>oppure</span>
          <div className="flex-1 h-px" style={{ background: '#1C1C24' }} />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
          style={{ background: '#141419', border: '1px solid #2A2A35', color: '#F8F8FC' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continua con Google
        </button>

        {/* Register link */}
        <p className="text-center mt-8 text-sm" style={{ color: '#8A8A96' }}>
          Non hai un account?{' '}
          <Link to="/register" className="font-bold hover:opacity-80" style={{ color: '#FF4500' }}>
            Registrati
          </Link>
        </p>
      </div>
    </div>
  )
}
