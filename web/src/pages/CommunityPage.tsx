import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../hooks/useUser'
import { getGroups, joinGroup, createGroup, getEvents, joinEvent, createEvent } from '../services/communityService'
import { getFeed, toggleReaction } from '../services/feedService'
import type { CommunityGroup, CommunityEvent, FeedEntry } from '../types'

const AVATAR_COLORS = ['#4F46E5', '#0D9488', '#EA580C', '#DB2777', '#6D28D9', '#059669', '#2563EB', '#7C3AED']

const STORY_COLORS = [
  'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
  'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
  'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
  'linear-gradient(135deg, #DB2777 0%, #EC4899 100%)',
]

function storyColor(uid: string) {
  let n = 0
  for (let i = 0; i < uid.length; i++) n = (n + uid.charCodeAt(i)) % STORY_COLORS.length
  return STORY_COLORS[n]
}

function withTimeout<T>(p: Promise<T>, ms = 3000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])
}

const SPORT_EMOJIS: Record<string, string> = {
  running: '🏃', gym: '💪', cycling: '🚴',
  yoga: '🧘', hiit: '⚡', walking: '🚶',
}

const SPORT_OPTIONS = [
  { value: 'running', label: 'Running' },
  { value: 'gym', label: 'Gym' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'walking', label: 'Walking' },
]

const REACTION_EMOJIS = ['🔥', '💪', '👏']

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m fa`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h fa`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'ieri'
  return `${days}g fa`
}

/* ── Demo data when Firestore is empty ── */
const DEMO_STORIES: FeedEntry[] = [
  { id: 'd1', userId: 'u_marco', userName: 'Marco R.', date: new Date(Date.now() - 3_600_000).toISOString(), workoutTypes: ['running'], duration: 42, calories: 380, distance: 5.2, steps: 6800, reactions: { '🔥': ['u2', 'u3'] }, createdAt: Date.now() },
  { id: 'd2', userId: 'u_giulia', userName: 'Giulia M.', date: new Date(Date.now() - 7_200_000).toISOString(), workoutTypes: ['yoga'], duration: 55, calories: 180, distance: 0, steps: 0, reactions: { '👏': ['u1'] }, createdAt: Date.now() },
  { id: 'd3', userId: 'u_luca', userName: 'Luca B.', date: new Date(Date.now() - 10_800_000).toISOString(), workoutTypes: ['gym', 'hiit'], duration: 65, calories: 520, distance: 0, steps: 3200, reactions: { '💪': ['u1', 'u4', 'u5'] }, createdAt: Date.now() },
  { id: 'd4', userId: 'u_sara', userName: 'Sara T.', date: new Date(Date.now() - 14_400_000).toISOString(), workoutTypes: ['cycling'], duration: 90, calories: 640, distance: 28.5, steps: 0, reactions: { '🔥': ['u1'] }, createdAt: Date.now() },
  { id: 'd5', userId: 'u_alex', userName: 'Alex P.', date: new Date(Date.now() - 18_000_000).toISOString(), workoutTypes: ['running'], duration: 30, calories: 290, distance: 4.1, steps: 5400, reactions: {}, createdAt: Date.now() },
  { id: 'd6', userId: 'u_elena', userName: 'Elena V.', date: new Date(Date.now() - 25_000_000).toISOString(), workoutTypes: ['walking'], duration: 45, calories: 150, distance: 3.8, steps: 5100, reactions: { '👏': ['u2', 'u3'] }, createdAt: Date.now() },
]

const DEMO_GROUPS: CommunityGroup[] = [
  { id: 'g1', name: 'Runners Milano', sport: 'running', description: 'Corriamo insieme ogni weekend', city: 'Milano', members: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'], createdBy: 'u1', createdAt: Date.now() },
  { id: 'g2', name: 'CrossFit Zone', sport: 'gym', description: 'WOD giornalieri e motivazione', city: 'Milano', members: ['u1', 'u2', 'u3', 'u4'], createdBy: 'u2', createdAt: Date.now() },
  { id: 'g3', name: 'Yoga Flow', sport: 'yoga', description: 'Pratiche guidate e meditazione', city: 'Milano', members: ['u1', 'u2', 'u3'], createdBy: 'u3', createdAt: Date.now() },
  { id: 'g4', name: 'Ciclisti Navigli', sport: 'cycling', description: 'Uscite lungo i Navigli', city: 'Milano', members: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8'], createdBy: 'u1', createdAt: Date.now() },
  { id: 'g5', name: 'HIIT Warriors', sport: 'hiit', description: 'Allenamenti intensi da 30 min', city: 'Milano', members: ['u1', 'u2'], createdBy: 'u4', createdAt: Date.now() },
]

const DEMO_EVENTS: CommunityEvent[] = [
  { id: 'e1', title: 'Parkrun Sempione', sport: 'running', date: Date.now() + 2 * 86_400_000, time: '08:00', location: 'Parco Sempione, ingresso Arco della Pace', city: 'Milano', description: '5K per tutti i livelli', participants: ['u1', 'u2', 'u3', 'u4', 'u5'], createdBy: 'u1', createdAt: Date.now() },
  { id: 'e2', title: 'Yoga al Tramonto', sport: 'yoga', date: Date.now() + 4 * 86_400_000, time: '18:30', location: 'Giardini Indro Montanelli', city: 'Milano', description: 'Sessione open-air gratuita', participants: ['u1', 'u2', 'u3'], createdBy: 'u3', createdAt: Date.now() },
  { id: 'e3', title: 'Giro dei Navigli', sport: 'cycling', date: Date.now() + 7 * 86_400_000, time: '09:00', location: 'Darsena, Milano', city: 'Milano', description: '40km rilassati lungo i Navigli', participants: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'], createdBy: 'u2', createdAt: Date.now() },
]

const SPORT_CARD_COLORS: Record<string, [string, string]> = {
  running: ['#FFF7ED', '#EA580C'],
  gym: ['#F5F3FF', '#7C3AED'],
  cycling: ['#EFF6FF', '#2563EB'],
  yoga: ['#F0FDF4', '#16A34A'],
  hiit: ['#FFF1F2', '#E11D48'],
  walking: ['#F0FDFA', '#0D9488'],
}

export default function CommunityPage() {
  const { user } = useAuth()
  const { profile } = useUser()
  const navigate = useNavigate()
  const city = profile?.city || ''

  const [groups, setGroups] = useState<CommunityGroup[]>([])
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [stories, setStories] = useState<FeedEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Create group form
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupSport, setGroupSport] = useState('running')
  const [groupDesc, setGroupDesc] = useState('')
  const [submittingGroup, setSubmittingGroup] = useState(false)

  // Create event form
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventSport, setEventSport] = useState('running')
  const [eventDesc, setEventDesc] = useState('')
  const [submittingEvent, setSubmittingEvent] = useState(false)

  const loadGroups = useCallback(async () => {
    const data = await withTimeout(getGroups(city)).catch(() => [])
    setGroups(data.length > 0 ? data : DEMO_GROUPS)
  }, [city])

  const loadEvents = useCallback(async () => {
    const data = await withTimeout(getEvents(city)).catch(() => [])
    setEvents(data.length > 0 ? data : DEMO_EVENTS)
  }, [city])

  useEffect(() => {
    setLoading(true)
    const loadAll = async () => {
      const [feedData] = await Promise.all([
        withTimeout(getFeed(20)).catch(() => [] as FeedEntry[]),
        loadGroups(),
        loadEvents(),
      ])
      const realFeed = feedData.length > 0 ? feedData : DEMO_STORIES
      setFeed(realFeed)
      // Stories = deduplicated by user
      const seen = new Set<string>()
      setStories(realFeed.filter(e => { if (seen.has(e.userId)) return false; seen.add(e.userId); return true }).slice(0, 12))
      setLoading(false)
    }
    loadAll()
  }, [loadGroups, loadEvents])

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return
    await joinGroup(groupId, user.uid).catch(() => {})
    loadGroups()
  }

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim()) return
    setSubmittingGroup(true)
    await createGroup({ name: groupName.trim(), description: groupDesc.trim(), city, sport: groupSport, members: [user.uid], createdBy: user.uid, createdAt: Date.now() }).catch(() => {})
    setGroupName(''); setGroupDesc(''); setGroupSport('running'); setShowCreateGroup(false)
    setSubmittingGroup(false)
    loadGroups()
  }

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return
    await joinEvent(eventId, user.uid).catch(() => {})
    loadEvents()
  }

  const handleCreateEvent = async () => {
    if (!user || !eventTitle.trim() || !eventDate || !eventTime || !eventLocation.trim()) return
    setSubmittingEvent(true)
    await createEvent({ title: eventTitle.trim(), description: eventDesc.trim(), date: new Date(eventDate).getTime(), time: eventTime, location: eventLocation.trim(), city, sport: eventSport, participants: [user.uid], createdBy: user.uid, createdAt: Date.now() }).catch(() => {})
    setEventTitle(''); setEventDesc(''); setEventDate(''); setEventTime(''); setEventLocation(''); setEventSport('running'); setShowCreateEvent(false)
    setSubmittingEvent(false)
    loadEvents()
  }

  const handleReaction = async (entryId: string, emoji: string) => {
    if (!user) return
    const entry = feed.find(e => e.id === entryId)
    if (!entry) return
    const users = entry.reactions[emoji] ?? []
    const hasReacted = users.includes(user.uid)
    setFeed(prev => prev.map(e => e.id === entryId ? {
      ...e,
      reactions: {
        ...e.reactions,
        [emoji]: hasReacted ? users.filter(u => u !== user.uid) : [...users, user.uid],
      },
    } : e))
    await toggleReaction(entryId, user.uid, emoji, hasReacted).catch(() => {})
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '10px',
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    color: 'var(--text)', fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)',
    marginBottom: '4px', display: 'block',
  }

  // Next upcoming event for hero
  const nextEvent = useMemo(() => {
    const upcoming = events.filter(e => e.date > Date.now()).sort((a, b) => a.date - b.date)
    return upcoming[0] ?? null
  }, [events])

  // Active friends count
  const activeCount = stories.length

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-sub)', fontSize: '14px' }}>
          Caricamento...
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: 'var(--gradient-hero)',
        padding: '24px 20px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '22px', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>
              Community
            </h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
              {city ? `${city} · ` : ''}{activeCount} sportivi attivi oggi
            </p>
          </div>
          <button
            onClick={() => navigate('/friends')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '8px 14px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            Trova Amici
          </button>
        </div>

        {/* Next event teaser */}
        {nextEvent && (
          <div style={{
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            borderRadius: '14px',
            padding: '12px 14px',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'white', lineHeight: 1, fontFamily: "'Sora', sans-serif" }}>
                {new Date(nextEvent.date).getDate()}
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>
                {new Date(nextEvent.date).toLocaleDateString('it-IT', { month: 'short' })}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                {nextEvent.title}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
                {nextEvent.time} · {nextEvent.location.split(',')[0]} · {nextEvent.participants.length} partecipanti
              </p>
            </div>
            <span style={{ fontSize: '20px' }}>{SPORT_EMOJIS[nextEvent.sport] || '💪'}</span>
          </div>
        )}
      </div>

      {/* ══ STORIES ROW ══ */}
      <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', padding: '16px 20px 8px', scrollbarWidth: 'none' }}>
        {/* "Tu" — always first */}
        <div className="flex flex-col items-center gap-1" style={{ flexShrink: 0 }}>
          <div style={{ padding: '2.5px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: 'var(--bg-card)', border: '2.5px solid var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: 700, color: 'var(--indigo)',
              fontFamily: "'Sora', sans-serif",
            }}>
              {profile?.name?.slice(0, 2).toUpperCase() ?? '?'}
            </div>
          </div>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-sub)', maxWidth: 56, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Tu</span>
        </div>
        {stories.map(entry => (
          <button key={entry.userId} onClick={() => navigate(`/user/${entry.userId}`)} className="flex flex-col items-center gap-1" style={{ flexShrink: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <div style={{ padding: '2.5px', borderRadius: '50%', background: storyColor(entry.userId) }}>
              <div style={{
                width: 50, height: 50, borderRadius: '50%',
                background: 'var(--bg-card)', border: '2.5px solid var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', fontWeight: 700, color: 'var(--text)',
                fontFamily: "'Sora', sans-serif",
              }}>
                {entry.userName.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-sub)', maxWidth: 56, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.userName.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* ══ QUICK ACTIONS BAR ══ */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px 20px 4px' }}>
        <button
          onClick={() => setShowCreateGroup(true)}
          style={{
            flex: 1, padding: '10px', borderRadius: '12px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            fontSize: '12px', fontWeight: 700, color: 'var(--indigo)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          👥 Crea Gruppo
        </button>
        <button
          onClick={() => setShowCreateEvent(true)}
          style={{
            flex: 1, padding: '10px', borderRadius: '12px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            fontSize: '12px', fontWeight: 700, color: 'var(--purple)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          📅 Crea Evento
        </button>
      </div>

      {/* ══ CREATE GROUP MODAL ══ */}
      {showCreateGroup && (
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}>
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>Nuovo Gruppo</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div><label style={labelStyle}>Nome</label><input style={inputStyle} value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Es. Runners Milano Est" /></div>
              <div><label style={labelStyle}>Sport</label><select style={inputStyle} value={groupSport} onChange={e => setGroupSport(e.target.value)}>{SPORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{SPORT_EMOJIS[s.value]} {s.label}</option>)}</select></div>
              <div><label style={labelStyle}>Descrizione</label><input style={inputStyle} value={groupDesc} onChange={e => setGroupDesc(e.target.value)} placeholder="Breve descrizione" /></div>
              <div className="flex" style={{ gap: '8px', marginTop: '4px' }}>
                <button onClick={() => setShowCreateGroup(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Annulla</button>
                <button onClick={handleCreateGroup} disabled={submittingGroup || !groupName.trim()} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--gradient)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: submittingGroup ? 'wait' : 'pointer', fontFamily: "'Sora', sans-serif", opacity: submittingGroup || !groupName.trim() ? 0.6 : 1 }}>{submittingGroup ? 'Creando...' : 'Crea'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CREATE EVENT MODAL ══ */}
      {showCreateEvent && (
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}>
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>Nuovo Evento</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div><label style={labelStyle}>Titolo</label><input style={inputStyle} value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Es. Parkrun Sempione" /></div>
              <div className="flex" style={{ gap: '8px' }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Data</label><input type="date" style={inputStyle} value={eventDate} onChange={e => setEventDate(e.target.value)} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>Ora</label><input type="time" style={inputStyle} value={eventTime} onChange={e => setEventTime(e.target.value)} /></div>
              </div>
              <div><label style={labelStyle}>Luogo</label><input style={inputStyle} value={eventLocation} onChange={e => setEventLocation(e.target.value)} placeholder="Es. Parco Sempione" /></div>
              <div><label style={labelStyle}>Sport</label><select style={inputStyle} value={eventSport} onChange={e => setEventSport(e.target.value)}>{SPORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{SPORT_EMOJIS[s.value]} {s.label}</option>)}</select></div>
              <div><label style={labelStyle}>Descrizione (opzionale)</label><input style={inputStyle} value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="Dettagli sull'evento" /></div>
              <div className="flex" style={{ gap: '8px', marginTop: '4px' }}>
                <button onClick={() => setShowCreateEvent(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Annulla</button>
                <button onClick={handleCreateEvent} disabled={submittingEvent || !eventTitle.trim() || !eventDate || !eventTime || !eventLocation.trim()} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--gradient)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: submittingEvent ? 'wait' : 'pointer', fontFamily: "'Sora', sans-serif", opacity: submittingEvent || !eventTitle.trim() || !eventDate || !eventTime || !eventLocation.trim() ? 0.6 : 1 }}>{submittingEvent ? 'Creando...' : 'Crea'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ GRUPPI — Horizontal Carousel ══ */}
      <div style={{ padding: '16px 0 0' }}>
        <div className="flex items-center justify-between" style={{ padding: '0 20px', marginBottom: '12px' }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
            Gruppi
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-sub)', fontWeight: 600 }}>
            {groups.length} gruppi
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 20px 4px', scrollbarWidth: 'none' }}>
          {groups.map((g, gi) => {
            const isMember = user ? g.members.includes(user.uid) : false
            const [sBg, sColor] = SPORT_CARD_COLORS[g.sport] ?? ['var(--indigo-light)', 'var(--indigo)']
            const isActive = gi % 3 === 0
            return (
              <div key={g.id} style={{
                minWidth: '200px', maxWidth: '220px', flexShrink: 0,
                background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                padding: '14px', boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: sBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', flexShrink: 0,
                  }}>
                    {SPORT_EMOJIS[g.sport] || '💪'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                    <div className="flex items-center gap-1" style={{ marginTop: '3px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#22C55E' : '#9CA3AF', display: 'inline-block' }} />
                      <span style={{ fontSize: '10px', color: 'var(--text-sub)' }}>
                        {g.members.length} membri
                      </span>
                    </div>
                  </div>
                </div>

                {g.description && (
                  <p style={{ fontSize: '11px', color: 'var(--text-sub)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {g.description}
                  </p>
                )}

                {/* Member avatars */}
                <div className="flex items-center justify-between">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {[...Array(Math.min(3, g.members.length))].map((_, mi) => {
                      const col = AVATAR_COLORS[(gi * 4 + mi) % AVATAR_COLORS.length]
                      return (
                        <div key={mi} style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: col, border: '2px solid var(--bg-card)',
                          marginLeft: mi === 0 ? 0 : -6, zIndex: 5 - mi,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: 700, color: 'white',
                          fontFamily: "'Sora', sans-serif",
                        }}>
                          {String.fromCharCode(65 + ((gi * 4 + mi) % 26))}
                        </div>
                      )
                    })}
                    {g.members.length > 3 && (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-surface)', border: '2px solid var(--bg-card)', marginLeft: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'var(--text-sub)' }}>
                        +{g.members.length - 3}
                      </div>
                    )}
                  </div>
                  <button onClick={() => !isMember && handleJoinGroup(g.id)} disabled={isMember}
                    style={{
                      borderRadius: '8px', padding: '5px 12px',
                      background: isMember ? sBg : sColor,
                      color: isMember ? sColor : '#fff',
                      border: 'none',
                      fontSize: '11px', fontWeight: 700,
                      cursor: isMember ? 'default' : 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                    {isMember ? '✓' : 'Entra'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ══ EVENTI PROSSIMI ══ */}
      <div style={{ padding: '20px 20px 0' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
            Prossimi Eventi
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-sub)', fontWeight: 600 }}>
            {events.length} eventi
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {events.slice(0, 3).map(ev => {
            const isParticipant = user ? ev.participants.includes(user.uid) : false
            const d = new Date(ev.date)
            const dayNum = d.getDate()
            const monthStr = d.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()
            const dayName = d.toLocaleDateString('it-IT', { weekday: 'short' })
            const [sBg, sColor] = SPORT_CARD_COLORS[ev.sport] ?? ['var(--indigo-light)', 'var(--indigo)']
            return (
              <div key={ev.id} style={{
                background: 'var(--bg-card)', borderRadius: 'var(--radius)',
                padding: '12px 14px', boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                {/* Date block */}
                <div style={{
                  width: '48px', height: '52px', borderRadius: '12px',
                  background: sBg, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: sColor, lineHeight: 1, fontFamily: "'Sora', sans-serif" }}>
                    {dayNum}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: sColor, opacity: 0.7, textTransform: 'uppercase' }}>
                    {monthStr}
                  </span>
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                    {ev.title}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '3px' }}>
                    {dayName} · {ev.time} · {ev.location.split(',')[0]}
                  </p>
                  <div className="flex items-center gap-2" style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-sub)', background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '6px', fontWeight: 600 }}>
                      {SPORT_EMOJIS[ev.sport]} {ev.sport}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-sub)' }}>
                      👥 {ev.participants.length}
                    </span>
                  </div>
                </div>

                {/* Join button */}
                <button onClick={() => !isParticipant && handleJoinEvent(ev.id)} disabled={isParticipant}
                  style={{
                    borderRadius: '10px', padding: '8px 14px',
                    background: isParticipant ? sBg : sColor,
                    color: isParticipant ? sColor : '#fff',
                    border: 'none',
                    fontSize: '11px', fontWeight: 700,
                    cursor: isParticipant ? 'default' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    flexShrink: 0,
                  }}>
                  {isParticipant ? '✓ Vai' : 'Partecipa'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ══ FEED ATTIVITÀ ══ */}
      <div style={{ padding: '20px 20px 24px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
            Feed Attività
          </h2>
          <button
            onClick={() => navigate('/friends')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: 'var(--indigo)', fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Vedi tutti →
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {feed.slice(0, 5).map(entry => (
            <div key={entry.id} style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius)',
              padding: '14px 16px', boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border)',
            }}>
              {/* User row */}
              <div className="flex items-center gap-3" style={{ marginBottom: '10px' }}>
                <button onClick={() => navigate(`/user/${entry.userId}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: storyColor(entry.userId),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'white', fontFamily: "'Sora', sans-serif" }}>
                      {entry.userName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/user/${entry.userId}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>
                        {entry.userName}
                      </p>
                    </button>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{timeAgo(entry.date)}</span>
                  </div>
                  <div className="flex items-center gap-1" style={{ marginTop: '2px' }}>
                    {entry.workoutTypes.map(t => (
                      <span key={t} style={{ fontSize: '11px' }}>{SPORT_EMOJIS[t] ?? '🏋️'}</span>
                    ))}
                    <span style={{ fontSize: '11px', color: 'var(--text-sub)', marginLeft: '2px' }}>
                      {entry.duration > 0 ? `${entry.duration} min` : ''}
                      {entry.distance > 0 ? ` · ${entry.distance.toFixed(1)} km` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stat chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {entry.calories > 0 && (
                  <span style={{ background: '#FFF7ED', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: '#EA580C' }}>
                    🔥 {entry.calories} kcal
                  </span>
                )}
                {entry.steps > 0 && (
                  <span style={{ background: 'var(--indigo-light)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: 'var(--indigo)' }}>
                    👟 {entry.steps.toLocaleString('it-IT')}
                  </span>
                )}
              </div>

              {/* Reactions */}
              <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                {REACTION_EMOJIS.map(emoji => {
                  const users = entry.reactions[emoji] ?? []
                  const hasReacted = user ? users.includes(user.uid) : false
                  return (
                    <button key={emoji} onClick={() => handleReaction(entry.id, emoji)}
                      style={{
                        background: hasReacted ? 'var(--indigo-light)' : 'var(--bg-surface)',
                        border: `1.5px solid ${hasReacted ? 'var(--indigo)' : 'transparent'}`,
                        borderRadius: '20px', padding: '4px 10px',
                        fontSize: '12px', cursor: 'pointer',
                        color: hasReacted ? 'var(--indigo)' : 'var(--text-sub)',
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '3px',
                        transition: 'all 0.15s',
                      }}>
                      {emoji}
                      {users.length > 0 && (
                        <span style={{ fontSize: '10px' }}>{users.length}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
