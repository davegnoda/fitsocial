const GOOGLE_FIT_CLIENT_ID = import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID ?? ''
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL ?? ''

export function getGoogleFitAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_FIT_CLIENT_ID,
    redirect_uri: `${FUNCTIONS_URL}/healthOAuthCallback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read',
    access_type: 'offline',
    state: `${userId}:google_fit`,
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}
