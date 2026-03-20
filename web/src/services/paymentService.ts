const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL ?? ''

export async function createCheckoutSession(userId: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_URL}/createCheckoutSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  const data = await res.json()
  return data.url
}

export async function createConnectAccount(userId: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_URL}/createConnectAccount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  const data = await res.json()
  return data.url
}

export async function joinPaidChallenge(userId: string, challengeId: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_URL}/joinPaidChallenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, challengeId }),
  })
  const data = await res.json()
  return data.url
}
