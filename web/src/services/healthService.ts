import type { DeviceProvider } from '../types'

const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL ?? ''

interface ProviderConfig {
  name: string
  icon: string
  color: string
  authUrl: (userId: string) => string
  available: boolean
}

export const PROVIDERS: Record<DeviceProvider, ProviderConfig> = {
  apple_health: {
    name: 'Apple Health',
    icon: '🍎',
    color: '#FF2D55',
    authUrl: () => '', // handled natively in iOS app
    available: true,
  },
  google_fit: {
    name: 'Google Fit',
    icon: '💚',
    color: '#4285F4',
    authUrl: (userId: string) => {
      const clientId = import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID ?? ''
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${FUNCTIONS_URL}/healthOAuthCallback`,
        response_type: 'code',
        scope: [
          'https://www.googleapis.com/auth/fitness.activity.read',
          'https://www.googleapis.com/auth/fitness.heart_rate.read',
          'https://www.googleapis.com/auth/fitness.body.read',
          'https://www.googleapis.com/auth/fitness.sleep.read',
        ].join(' '),
        access_type: 'offline',
        state: `${userId}:google_fit`,
        prompt: 'consent',
      })
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    },
    available: true,
  },
  samsung_health: {
    name: 'Samsung Health',
    icon: '💙',
    color: '#1428A0',
    authUrl: () => '', // handled via Samsung SDK
    available: true,
  },
  fitbit: {
    name: 'Fitbit',
    icon: '⌚',
    color: '#00B0B9',
    authUrl: (userId: string) => {
      const clientId = import.meta.env.VITE_FITBIT_CLIENT_ID ?? ''
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: `${FUNCTIONS_URL}/healthOAuthCallback`,
        scope: 'activity heartrate sleep',
        state: `${userId}:fitbit`,
      })
      return `https://www.fitbit.com/oauth2/authorize?${params}`
    },
    available: true,
  },
  garmin: {
    name: 'Garmin Connect',
    icon: '🔺',
    color: '#007CC3',
    authUrl: () => '', // Garmin uses OAuth 1.0a, handled server-side
    available: true,
  },
}

/** Check if user has any connected device */
export function hasConnectedDevice(connectedDevices: string[]): boolean {
  return connectedDevices.length > 0
}
