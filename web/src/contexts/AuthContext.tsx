import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, GoogleAuthProvider,
  signInWithPopup } from 'firebase/auth'
import { auth } from '../firebase'
import { getUserProfile, createUserProfile } from '../services/userService'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const login = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password).then(() => {})

  const register = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password).then(() => {})

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, new GoogleAuthProvider())
    const user = result.user
    const existing = await getUserProfile(user.uid)
    if (!existing) {
      await createUserProfile(user.uid, {
        name: user.displayName ?? 'Utente',
        email: user.email ?? '',
        city: '',
        country: '',
      })
    }
  }

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
