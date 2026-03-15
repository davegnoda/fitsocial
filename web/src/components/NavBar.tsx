import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/dashboard', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#0A84FF' : '#8A8A96'}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ), label: 'Home' },
  { path: '/challenges', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#0A84FF' : '#8A8A96'}>
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
    </svg>
  ), label: 'Sfide' },
  { path: '/community', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#0A84FF' : '#8A8A96'}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  ), label: 'Mappa' },
  { path: '/friends', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#0A84FF' : '#8A8A96'}>
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  ), label: 'Amici' },
  { path: '/profile', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#0A84FF' : '#8A8A96'}>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  ), label: 'Profilo' },
]

export default function NavBar() {
  const { pathname } = useLocation()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center px-2 z-50"
      style={{
        background: 'rgba(7,7,10,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid #182035',
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        paddingTop: '10px',
      }}
    >
      {navItems.map(item => {
        const active = pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all"
            style={{ minWidth: '52px' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: active ? 'rgba(10,132,255,0.12)' : 'transparent',
                border: active ? '1px solid rgba(10,132,255,0.25)' : '1px solid transparent',
              }}
            >
              {item.icon(active)}
            </div>
            <span
              className="text-xs font-medium leading-none"
              style={{ color: active ? '#0A84FF' : '#8A8A96' }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
