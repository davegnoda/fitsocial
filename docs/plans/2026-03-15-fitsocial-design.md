# FitSocial — Design Document
**Data:** 2026-03-15
**Versione:** 1.0
**Stato:** Approvato

---

## 1. Visione del Prodotto

FitSocial è un social network dello sport e della salute che unisce:
- Integrazione universale con smartwatch (Apple, Google, Garmin, Fitbit, Samsung, Amazfit)
- Gamification sociale forte (sfide, leghe, classifiche)
- Community sportiva locale (trova persone per allenarsi, eventi, gruppi)
- Premi reali (sponsorizzati in v1, denaro reale in v2)

**Posizionamento:** Strava + Duolingo + Meetup — il social network fitness universale che non esiste ancora.

**Mercato di lancio:** Europa
**Target:** Tutti — runner, fitness generale, community sportiva locale

---

## 2. Architettura Tecnica

### Stack
| Layer | Tecnologia | Note |
|-------|-----------|------|
| Web App (MVP) | React | Primo rilascio per validare |
| App Mobile (v2) | Flutter | iOS + Android nativo |
| Backend | Firebase | Auth, Firestore, Cloud Functions, Storage |
| Classifiche live | Firebase Realtime DB | Aggiornamenti in tempo reale |
| Pagamenti | Stripe | Pool prize v2 |
| Mappe | Google Maps API / Mapbox | GPS tracking e radar |
| AI Coach | OpenAI API / Claude API | Suggerimenti predittivi |

### Flusso Dati
```
Smartwatch
    ↓
Apple HealthKit (iOS) / Google Health Connect (Android)
    ↓
Flutter App (legge e sincronizza)
    ↓
Firebase Firestore (database condiviso)
    ↓
React Web App (legge in tempo reale) ← stesso account, stessi dati
```

**Nota critica:** La raccolta dati smartwatch richiede l'app mobile installata. La web app e la mobile condividono lo stesso Firebase — nessuna esportazione manuale necessaria. Web e mobile sono due finestre sullo stesso database.

### Integrazioni Smartwatch
- **iOS/Apple Watch:** Apple HealthKit
- **Android/tutto il resto:** Google Health Connect
  - Samsung Galaxy Watch
  - Garmin
  - Fitbit
  - Amazfit
  - Polar

---

## 3. Database Schema (Firestore)

```
users/
  {userId}/
    name, email, avatar, city, country
    level, xp, streak, fitnessPassport
    connectedDevices: [apple_watch, garmin...]
    plan: free | premium

    activities/
      {date}/
        steps, calories, distance, heartRate, sleep
        workouts: [{type, duration, gps_path, verified}]

    friends/
      {friendId}/
        status: pending | accepted

challenges/
  {challengeId}/
    type: steps | calories | distance | workouts
    period: daily | weekly | monthly
    fitnessLevel: beginner | intermediate | advanced
    participants: [userId...]
    prize: {type: sponsored | pool, value, brandName}
    leaderboard: [{userId, score, verified}]
    antiCheatScore: float

groups/
  {groupId}/
    name, members: [userId...]
    city, sport
    type: public | private | corporate
    events: [{date, location, participants}]

routes/
  {routeId}/
    createdBy, city
    gps_points: [...]
    distance, elevation
    sport: running | cycling | walking | hiking
    popularity: int

corporate/
  {companyId}/
    name, employees: [userId...]
    activeChallenges: [challengeId...]
    subscriptionPlan
```

---

## 4. Le 12 Funzioni — Fasi di Sviluppo

### FASE 1 — MVP Web (mesi 1-3)
*Obiettivo: validare l'idea con utenti reali in Europa*

1. **Dashboard Attività**
   - Visualizzazione passi, calorie, sonno, battito cardiaco
   - Dati da HealthKit/Health Connect via app mobile
   - Grafici giornalieri, settimanali, mensili

2. **Tracking GPS + Percorsi Popolari**
   - Registrazione allenamento con mappa
   - Salvataggio e condivisione percorsi
   - Percorsi più usati nella zona con statistiche

3. **Community Locale**
   - Trova persone per allenarsi (filtri: distanza, attività, livello)
   - Radar runner: mappa live opt-in (chi sta correndo vicino)
   - Creazione e iscrizione eventi sportivi locali
   - Gruppi/team

4. **Sfide e Classifiche**
   - Leghe settimanali: Bronzo → Argento → Oro → Diamante
   - Sfide private tra amici
   - Classifiche per città e quartiere
   - Badge e streak (tipo Duolingo)

5. **Premi Sponsorizzati**
   - Brand fitness pagano i premi (scarpe, palestre, integratori)
   - Nessun denaro degli utenti in gioco
   - Gestione partnership brand

### FASE 2 — App Mobile Flutter + Funzioni Differenzianti (mesi 4-7)
*Obiettivo: esperienza premium, differenziarsi dalla concorrenza*

6. **Matchmaking Equo per Sfide**
   - Calcolo livello fitness automatico dai dati storici
   - Sfide separate per livello (principianti vs intermedi vs avanzati)
   - Sistema di promozione/retrocessione tra livelli

7. **Allenati Insieme Live**
   - Sync in tempo reale durante allenamento con amici a distanza
   - Visualizzazione posizione/ritmo dell'altro sulla mappa
   - Audio cues opzionali ("Marco ti ha superato!")
   - Tecnologia: Firebase Realtime DB + WebSocket

8. **AI Coach Predittivo**
   - Analisi pattern 30/60/90 giorni
   - Suggerimenti personalizzati ("aggiungi 15 min giovedì per raggiungere l'obiettivo")
   - Piani di allenamento adattivi
   - Integrazione Claude API / OpenAI API

9. **Fitness Passport**
   - Profilo pubblico verificato e condivisibile
   - Record personali, km totali, sfide vinte
   - Traguardi certificati (non falsificabili grazie ai dati smartwatch)
   - Condivisibile come link o card social

### FASE 3 — Monetizzazione Avanzata + B2B (mesi 8-12)
*Obiettivo: revenue solida e scalabilità*

10. **Pool Prize con Denaro Reale**
    - Integrazione Stripe per wallet utenti
    - Sfide con contributo monetario (es. 10 amici × 10€)
    - Compliance legale europea (GDPR + regolamenti sweepstakes)
    - Licenze necessarie per ogni paese di operazione

11. **Anti-Cheat Engine**
    - Cross-verifica GPS + frequenza cardiaca + dati smartwatch
    - Rilevamento anomalie (velocità impossibili, dati inconsistenti)
    - Score di affidabilità per ogni attività
    - Necessario prima del lancio pool prize

12. **B2B Corporate Wellness**
    - Dashboard admin per aziende
    - Sfide interne tra dipendenti
    - Report HR (partecipazione, attività media, trend)
    - Piano abbonamento enterprise
    - Mercato target: aziende 50-5000 dipendenti

---

## 5. Modelli di Monetizzazione

| Modello | Fase | Revenue Stimata |
|---------|------|----------------|
| Abbonamento Premium (€4,99/mese) | v1 | Principale |
| Premi sponsorizzati (brand pagano) | v1 | Partnership |
| Pool prize fee (5% del premio) | v2 | Alta scala |
| Corporate Wellness (€500-5000/mese/azienda) | v2 | B2B |

---

## 6. Considerazioni Legali

- **GDPR:** Dati salute sono "dati sensibili" categoria speciale — consenso esplicito obbligatorio, data retention policy, diritto all'oblio
- **Pool Prize:** In Italia e UE servono licenze specifiche per competizioni con premi monetari — consultare legale prima del lancio v2
- **HealthKit/Health Connect:** Policy Apple e Google richiedono privacy policy specifica per dati salute
- **Anti-cheat:** Necessario per pool prize, altrimenti rischio frodi e problemi legali

---

## 7. Metriche di Successo

| Fase | KPI Target |
|------|-----------|
| MVP (mese 3) | 1.000 utenti attivi, retention 40% |
| V1 (mese 6) | 10.000 utenti, 3 partnership brand |
| V2 (mese 12) | 100.000 utenti, 10 aziende B2B |

---

## 8. Stack Completo Riepilogo

```
Frontend Web:    React + Tailwind CSS
Frontend Mobile: Flutter (iOS + Android)
Backend:         Firebase (Auth + Firestore + Functions + Storage)
Real-time:       Firebase Realtime Database
Mappe/GPS:       Google Maps API + Mapbox
Pagamenti:       Stripe
AI:              Claude API (Anthropic) / OpenAI
Notifiche:       Firebase Cloud Messaging
Hosting Web:     Firebase Hosting / Vercel
Analytics:       Firebase Analytics + PostHog
```
