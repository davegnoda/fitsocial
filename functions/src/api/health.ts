import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { defineString } from 'firebase-functions/params'

const db = getFirestore()

const GOOGLE_FIT_CLIENT_ID = defineString('GOOGLE_FIT_CLIENT_ID')
const GOOGLE_FIT_CLIENT_SECRET = defineString('GOOGLE_FIT_CLIENT_SECRET')

export const healthOAuthCallback = onRequest({ cors: true }, async (req, res) => {
  const { code, state } = req.query as Record<string, string>

  if (!code || !state) { res.status(400).send('Missing code or state'); return }

  const [userId, provider] = state.split(':')

  if (provider === 'google_fit') {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_FIT_CLIENT_ID.value(),
        client_secret: GOOGLE_FIT_CLIENT_SECRET.value(),
        redirect_uri: `${req.headers.origin}/api/health/callback`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    await db.collection('users').doc(userId).collection('tokens').doc('google_fit').set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      provider: 'google_fit',
      connectedAt: Date.now(),
    })

    await db.collection('users').doc(userId).update({
      connectedDevices: ['google_fit'],
    })
  }

  res.redirect('/settings?device=connected')
})

export const syncHealthData = onSchedule('every 15 minutes', async () => {
  const usersSnap = await db.collection('users')
    .where('connectedDevices', '!=', [])
    .get()

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id
    const devices: string[] = userDoc.data().connectedDevices ?? []

    for (const device of devices) {
      try {
        if (device === 'google_fit') {
          await syncGoogleFit(userId)
        }
      } catch (err) {
        console.error(`Sync failed for ${userId}/${device}:`, err)
      }
    }
  }
})

async function syncGoogleFit(userId: string) {
  const tokenDoc = await db.collection('users').doc(userId).collection('tokens').doc('google_fit').get()
  if (!tokenDoc.exists) return

  const tokenData = tokenDoc.data()!
  let accessToken = tokenData.accessToken

  if (Date.now() > tokenData.expiresAt) {
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: tokenData.refreshToken,
        client_id: GOOGLE_FIT_CLIENT_ID.value(),
        client_secret: GOOGLE_FIT_CLIENT_SECRET.value(),
        grant_type: 'refresh_token',
      }),
    })
    const newTokens = await refreshRes.json()
    accessToken = newTokens.access_token
    await tokenDoc.ref.update({
      accessToken,
      expiresAt: Date.now() + (newTokens.expires_in * 1000),
    })
  }

  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const endOfDay = startOfDay + 86400000

  const fitRes = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' },
        { dataTypeName: 'com.google.distance.delta' },
        { dataTypeName: 'com.google.heart_rate.bpm' },
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startOfDay,
      endTimeMillis: endOfDay,
    }),
  })

  const fitData = await fitRes.json()
  const buckets = fitData.bucket ?? []

  let steps = 0, calories = 0, distance = 0, heartRate = 0
  for (const bucket of buckets) {
    for (const dataset of (bucket.dataset ?? [])) {
      for (const point of (dataset.point ?? [])) {
        const val = point.value?.[0]
        if (!val) continue
        const typeName = dataset.dataSourceId ?? ''
        if (typeName.includes('step_count')) steps += val.intVal ?? 0
        else if (typeName.includes('calories')) calories += Math.round(val.fpVal ?? 0)
        else if (typeName.includes('distance')) distance += (val.fpVal ?? 0) / 1000
        else if (typeName.includes('heart_rate')) heartRate = Math.round(val.fpVal ?? 0)
      }
    }
  }

  const dateStr = today.toISOString().split('T')[0]
  const actRef = db.collection('users').doc(userId).collection('activities').doc(dateStr)
  const existing = await actRef.get()

  if (existing.exists) {
    await actRef.update({
      steps: Math.max(steps, existing.data()?.steps ?? 0),
      calories: Math.max(calories, existing.data()?.calories ?? 0),
      distance: Math.max(distance, existing.data()?.distance ?? 0),
      heartRate: heartRate || existing.data()?.heartRate,
      source: 'google_fit',
      verified: true,
      lastSync: Date.now(),
    })
  } else {
    await actRef.set({
      date: dateStr,
      steps,
      calories,
      distance: Math.round(distance * 100) / 100,
      heartRate: heartRate || undefined,
      workouts: [],
      source: 'google_fit',
      verified: true,
      lastSync: Date.now(),
    })
  }

  await db.collection('users').doc(userId).collection('tokens').doc('google_fit').update({
    lastSync: Date.now(),
  })
}
