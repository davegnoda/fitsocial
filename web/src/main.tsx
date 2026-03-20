import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

const LoginPage      = lazy(() => import('./pages/LoginPage'))
const RegisterPage   = lazy(() => import('./pages/RegisterPage'))
const DashboardPage  = lazy(() => import('./pages/DashboardPage'))
const ChallengesPage = lazy(() => import('./pages/ChallengesPage'))
const CommunityPage  = lazy(() => import('./pages/CommunityPage'))
const FriendsPage    = lazy(() => import('./pages/FriendsPage'))
const ProfilePage    = lazy(() => import('./pages/ProfilePage'))
const StatsPage      = lazy(() => import('./pages/StatsPage'))
const SettingsPage   = lazy(() => import('./pages/SettingsPage'))
const OnboardingPage    = lazy(() => import('./pages/OnboardingPage'))
const UserProfilePage  = lazy(() => import('./pages/UserProfilePage'))

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
    <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
  </div>
)

// Prefetch all page chunks after initial load — makes navigation instant
setTimeout(() => {
  void import('./pages/DashboardPage')
  void import('./pages/ChallengesPage')
  void import('./pages/CommunityPage')
  void import('./pages/FriendsPage')
  void import('./pages/ProfilePage')
  void import('./pages/StatsPage')
  void import('./pages/SettingsPage')
}, 1500)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/login"      element={<LoginPage />} />
              <Route path="/register"   element={<RegisterPage />} />
              <Route path="/dashboard"  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/challenges" element={<ProtectedRoute><ChallengesPage /></ProtectedRoute>} />
              <Route path="/stats"      element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
              <Route path="/community"  element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
              <Route path="/friends"    element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
              <Route path="/profile"    element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/settings"   element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route path="/user/:uid"  element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
              <Route path="*"           element={<Navigate to="/dashboard" />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
