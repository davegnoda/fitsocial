import NavBar from './NavBar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '90px' }}>
      {children}
      <NavBar />
    </div>
  )
}
