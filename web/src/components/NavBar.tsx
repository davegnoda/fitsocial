import { Link, useLocation, useNavigate } from 'react-router-dom'

const NAV_LEFT = [
  {
    path: '/dashboard',
    label: 'HOME',
    icon: (a: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={a ? 'var(--indigo)' : 'var(--text-sub)'}>
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    ),
  },
  {
    path: '/community',
    label: 'COMMUNITY',
    icon: (a: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={a ? 'var(--indigo)' : 'var(--text-sub)'}>
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    ),
  },
]

const NAV_RIGHT = [
  {
    path: '/stats',
    label: 'STATS',
    icon: (a: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={a ? 'var(--indigo)' : 'var(--text-sub)'}>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'PROFILO',
    icon: (a: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={a ? 'var(--indigo)' : 'var(--text-sub)'}>
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    ),
  },
]

export default function NavBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const NavItem = ({ path, label, icon }: { path: string; label: string; icon: (a: boolean) => React.ReactNode }) => {
    const active = pathname === path
    return (
      <Link
        to={path}
        className="flex flex-col items-center justify-center gap-0.5"
        style={{ flex: 1, height: '100%', textDecoration: 'none' }}
      >
        {icon(active)}
        <span style={{
          fontSize: '9px',
          fontWeight: active ? 700 : 500,
          color: active ? 'var(--indigo)' : 'var(--text-sub)',
          letterSpacing: '0.06em',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {label}
        </span>
      </Link>
    )
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 20px rgba(15,23,42,0.06)',
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: '8px',
        paddingRight: '8px',
      }}
    >
      {NAV_LEFT.map(item => <NavItem key={item.path} {...item} />)}

      {/* Central FAB — opens Challenges/Sfide */}
      <button
        onClick={() => navigate('/challenges')}
        className="flex items-center justify-center"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'var(--gradient)',
          boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
          marginBottom: '6px',
          flexShrink: 0,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>

      {NAV_RIGHT.map(item => <NavItem key={item.path} {...item} />)}
    </nav>
  )
}
