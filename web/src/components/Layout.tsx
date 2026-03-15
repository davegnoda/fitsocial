import NavBar from './NavBar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#07070A', minHeight: '100vh', paddingBottom: '80px' }}>
      {children}
      <NavBar />
    </div>
  )
}
