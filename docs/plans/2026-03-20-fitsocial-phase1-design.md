# FitSocial Phase 1 Design — Fondamenta + Monetizzazione + Differenziazione

**Data:** 2026-03-20
**Approccio:** Firebase-native (Cloud Functions v2 + Stripe + Health APIs)
**Obiettivo:** Sicurezza server-side + pagamenti reali + smartwatch + social gamification avanzata

---

## 1. Cloud Functions + Sicurezza

### 1.1 Struttura Cloud Functions

```
functions/
├── src/
│   ├── index.ts                    — Export di tutte le functions
│   ├── triggers/
│   │   ├── onActivityCreated.ts    — Workflow post-workout
│   │   │   → Calcola XP server-side
│   │   │   → Aggiorna streak
│   │   │   → Sync punteggi sfide attive + duelli
│   │   │   → Controlla e sblocca achievement
│   │   │   → Pubblica nel feed
│   │   │   → Aggiorna PR
│   │   │   → Aggiorna streak battles (elimina chi ha saltato)
│   │   │
│   │   ├── onChallengeEnd.ts       — Scheduled (ogni ora)
│   │   │   → Trova sfide/duelli scaduti
│   │   │   → Determina vincitore
│   │   │   → Distribuisci premio (Stripe payout)
│   │   │   → Invia notifica push al vincitore
│   │   │
│   │   ├── onFriendRequest.ts      — Friend request creata
│   │   │   → Invia notifica push al destinatario
│   │   │
│   │   └── onWeekEnd.ts            — Scheduled (domenica 23:59)
│   │       → Calcola promozioni/retrocessioni leghe settimanali
│   │       → Crea nuove leghe per la settimana successiva
│   │
│   ├── api/
│   │   ├── challenges.ts      — HTTP: crea sfida, join con pagamento
│   │   ├── duels.ts           — HTTP: crea duello, accetta, scommessa
│   │   ├── payments.ts        — HTTP: webhook Stripe, abbonamenti
│   │   └── health.ts          — HTTP: OAuth callback, sync dati smartwatch
│   │
│   └── utils/
│       ├── stripe.ts          — Stripe SDK config
│       ├── scoring.ts         — Logica calcolo punteggi (server-only)
│       └── notifications.ts   — FCM helper per push
```

### 1.2 Operazioni spostate da client a server

| Operazione | Ora (client) | Dopo (server) |
|---|---|---|
| Calcolo XP + level | `userService.updateUserXP()` | `onActivityCreated` trigger |
| Sync punteggi sfide | `challengeService.syncUserScores()` | `onActivityCreated` trigger |
| Check achievement | `achievementService.checkAndUnlock()` | `onActivityCreated` trigger |
| Pubblica feed | `feedService.publishToFeed()` | `onActivityCreated` trigger |
| Aggiorna PR | `prService.checkAndUpdatePRs()` | `onActivityCreated` trigger |
| Determina vincitore sfida | `challengeService.getWonChallenges()` | `onChallengeEnd` scheduled |
| Crea sfida con pool prize | Client diretto | `api/challenges` HTTP function |
| Pagamenti | Non esiste | `api/payments` HTTP function |

### 1.3 Firestore Rules — Fix sicurezza

Cambiamenti chiave:
- **Attività**: solo il proprietario e gli amici accettati possono leggere
- **Sfide**: punteggi write-only per Cloud Functions (service account)
- **Gruppi/Eventi**: solo il creatore può fare update
- **Profilo utente**: `xp`, `level`, `streak` non scrivibili dal client
- **Validazione struttura dati**: check sui tipi dei campi in ingresso

### 1.4 Flusso post-workout

```
Utente logga workout (client)
    ↓
writeDoc('users/{uid}/activities/{date}', activityData)
    ↓
[Firestore trigger: onActivityCreated]
    ↓
    ├─ Calcola XP → aggiorna users/{uid}.xp, .level, .streak
    ├─ Sync scores → per ogni sfida attiva, aggiorna scores.{uid}
    ├─ Check badges → sblocca nuovi achievement
    ├─ Pubblica feed → scrive in /feed/{id}
    ├─ Check PR → aggiorna /users/{uid}/meta/prs
    └─ Update streak battles/duels → aggiorna punteggi
    ↓
Client riceve aggiornamento via onSnapshot listener
    ↓
UI si aggiorna in tempo reale
```

---

## 2. Stripe Payments — Abbonamenti + Pool Prize

### 2.1 Architettura

```
Client (React) → Cloud Functions (api/payments) → Stripe → Webhook → Cloud Functions → Firestore
```

Il client non tocca mai Stripe direttamente. Tutto passa dalle Cloud Functions.

### 2.2 Abbonamento Premium

**Flusso:**
1. Utente clicca "Passa a Premium" → chiama `createCheckoutSession`
2. Cloud Function crea Stripe Checkout Session → ritorna URL
3. Client redirige a Stripe Checkout (PCI compliant)
4. Utente paga → webhook `checkout.session.completed`
5. Cloud Function aggiorna `users/{uid}.plan = 'premium'`
6. Client vede il cambio via onSnapshot

**Webhook gestiti:**
- `checkout.session.completed` → attiva premium
- `invoice.payment_failed` → downgrade a free + notifica
- `customer.subscription.deleted` → downgrade a free

**Piano Premium: €6.99/mese**

### 2.3 Paywall

```
Feature                    Free          Premium
─────────────────────────────────────────────────
Sfide attive              Illimitate    Illimitate
Stats page                Completa      Completa
Amici                     Illimitati    Illimitati
AI Coach                  ✗             ✓
Badge premium             ✗             ✓
Ads                       ✓             ✗
Sfide pool prize          Solo entry    Crea + entry
Export dati               ✗             ✓
Temi personalizzati       ✗             ✓
Analisi avanzata AI       ✗             ✓
Priority support          ✗             ✓
```

### 2.4 Pool Prize

**Flusso:**
1. Creatore crea sfida con `prize.type = 'pool'`, `entryFee = 3`
2. Utente clicca "Partecipa" → Cloud Function `joinPaidChallenge`
3. Stripe Payment Intent → checkout
4. Pagamento ok → webhook → utente aggiunto ai partecipanti
5. Sfida termina → `onChallengeEnd`:
   - Vincitore = punteggio più alto verificato
   - Montepremi = partecipanti × entry fee
   - Commissione FitSocial = 12%
   - Payout vincitore = 88% via Stripe Connect

**Anti-frode:**
- Punteggi calcolati SOLO server-side
- `verified: true` solo da smartwatch
- Pool > €50 richiede min 3 partecipanti
- Cooldown 24h prima del payout

### 2.5 Nuovi tipi (pagamenti)

```typescript
// UserProfile — nuovi campi
stripeCustomerId?: string
stripeConnectId?: string

// Challenge.prize — aggiornato
prize: {
  type: 'sponsored' | 'pool' | 'free'
  value: string
  brandName?: string
  entryFee?: number
  totalPool?: number
  platformFee?: number       // default 12%
  payoutStatus?: 'pending' | 'paid' | 'failed'
  winnerId?: string
}
```

---

## 3. Smartwatch Integration

### 3.1 Architettura

```
Google Fit / Fitbit / Garmin / Terra API
        ↕ OAuth2
Cloud Function: syncHealthData (scheduled ogni 15 min)
        ↓
Firestore: /users/{uid}/activities/{date}
  → verified: true
  → source: 'google_fit' | 'fitbit' | 'garmin'
```

### 3.2 Flusso connessione

1. Utente va su Settings → "Connetti Dispositivo"
2. Sceglie provider → redirect OAuth2
3. Cloud Function riceve token → salva server-side (mai esposto al client)
4. Scheduled function (ogni 15 min) sincronizza: passi, calorie, distanza, HR, sonno
5. Dati scritti con `verified: true` e `source: 'provider_name'`
6. Dati smartwatch hanno priorità su dati manuali

### 3.3 Nuovi tipi (smartwatch)

```typescript
interface ConnectedDevice {
  provider: 'google_fit' | 'fitbit' | 'garmin' | 'terra'
  connectedAt: number
  lastSync: number
  scopes: string[]
}

// Activity — nuovi campi
source?: 'manual' | 'google_fit' | 'fitbit' | 'garmin'
verified: boolean
heartRateAvg?: number
heartRateMax?: number
sleepHours?: number
sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent'
```

### 3.4 Impatto sulle sfide

- Pool prize: solo dati `verified: true` contano
- Sfide gratuite: dati manuali accettati, segnalati con icona diversa
- Leaderboard mostra badge "verificato" accanto ai punteggi da smartwatch

---

## 4. Social Gamification Avanzata

### 4.1 Sfide 1v1 (Duelli)

```
/duels/{id}
{
  challenger: uidA,
  opponent: uidB,
  type: 'steps' | 'calories' | 'distance',
  duration: '24h' | '48h' | '7d',
  status: 'pending' → 'active' → 'completed',
  bet?: { amount: number, currency: 'EUR' },
  scores: { [uidA]: number, [uidB]: number },
  createdAt: number,
  endsAt: number
}
```

- A sfida B → push notification
- B accetta → stato `active`, timer parte
- `onActivityCreated` aggiorna punteggi automaticamente
- Client usa `onSnapshot` per aggiornamenti real-time
- Se scommessa → escrow via Stripe, payout al vincitore (commissione 10%)

### 4.2 Streak Battles

```
/streak-battles/{id}
{
  participants: string[],        // 2-10 persone
  type: 'longest_streak',
  startDate: number,
  status: 'active' | 'completed',
  survivors: string[],
  eliminated: string[]
}
```

Tutti partono lo stesso giorno. Logga almeno un workout al giorno o vieni eliminato. Ultimo sopravvissuto vince.

### 4.3 Weekly Leagues

```
/leagues/{weekId}
{
  week: '2026-W12',
  tiers: {
    bronze:   { minXP: 0,    users: string[] },
    silver:   { minXP: 500,  users: string[] },
    gold:     { minXP: 1500, users: string[] },
    diamond:  { minXP: 3000, users: string[] }
  },
  promotions: string[],     // top 3 salgono di tier
  relegations: string[]     // bottom 3 scendono
}
```

Ogni settimana, ~20 persone per lega dello stesso livello. Top 3 salgono, bottom 3 scendono. Meccanica Duolingo.

### 4.4 Scommesse tra amici

- Integrato in duelli 1v1
- Entry fee: €1-€20
- Obbligatoria verifica smartwatch
- Escrow via Cloud Function
- Payout automatico, commissione 10%

---

## 5. Nuove Collections Firestore

```
Esistenti (aggiornate):
  /users/{uid}                + stripeCustomerId, stripeConnectId, connectedDevices
  /users/{uid}/activities     + source, verified, heartRateAvg, sleepHours
  /challenges/{id}            + prize.entryFee, prize.totalPool, prize.payoutStatus

Nuove:
  /duels/{id}                 — Sfide 1v1 con punteggi real-time
  /streak-battles/{id}        — Gare di streak
  /leagues/{weekId}           — Leghe settimanali
  /payments/{id}              — Audit trail pagamenti
  /payouts/{id}               — Audit trail payout vincitori
```

---

## 6. Frontend — Miglioramenti inclusi

- React Query per caching + gestione errori
- Skeleton loaders al posto degli spinner
- Error boundaries con retry
- onSnapshot listeners per dati real-time (duelli, sfide)
- Rimozione demo data hardcoded (sostituiti da empty states)
- Refactor StatsPage (1800 righe → componenti separati)
