import NavBar from './NavBar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#060B17', minHeight: '100vh', paddingBottom: '80px' }}>
      {children}
      <NavBar />
    </div>
  )
}
