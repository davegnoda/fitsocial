import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/dashboard', icon: '🏠', label: 'Home' },
  { path: '/challenges', icon: '🏆', label: 'Sfide' },
  { path: '/community', icon: '📍', label: 'Community' },
  { path: '/friends', icon: '👥', label: 'Amici' },
  { path: '/profile', icon: '👤', label: 'Profilo' },
]

export default function NavBar() {
  const { pathname } = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 flex justify-around z-50">
      {navItems.map(item => (
        <Link key={item.path} to={item.path}
          className={`flex flex-col items-center text-xs gap-0.5 px-3 py-2 rounded-xl transition-colors ${
            pathname === item.path
              ? 'text-blue-600 bg-blue-50 font-semibold'
              : 'text-gray-400 hover:text-gray-600'
          }`}>
          <span className="text-xl">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
