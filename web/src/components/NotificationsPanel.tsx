import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getNotifications, markAllRead } from '../services/notificationService'
import type { AppNotification } from '../types'

interface Props {
  onClose: () => void
}

const TYPE_ICONS: Record<string, string> = {
  friend_request: '\u{1F465}',
  challenge_invite: '\u{1F3C6}',
  achievement: '\u{1F396}\uFE0F',
  system: '\u{1F4E2}',
}

export default function NotificationsPanel({ onClose }: Props) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!user) return
    getNotifications(user.uid).then(n => {
      setNotifications(n)
      setLoading(false)
      markAllRead(user.uid).catch(() => {})
    }).catch(() => { setLoading(false); setError(true) })
  }, [user])

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min fa`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h fa`
    return `${Math.floor(diff / 86400000)}g fa`
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />

      {/* Panel */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: '320px', maxWidth: '85vw',
        background: 'var(--bg)',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '52px 20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
            Notifiche
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-sub)', padding: '4px',
          }}>{'\u2715'}</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '40px 0', fontSize: '13px' }}>Caricamento...</p>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <span style={{ fontSize: '2rem', display: 'block' }}>⚠️</span>
              <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '8px' }}>Impossibile caricare le notifiche</p>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <span style={{ fontSize: '3rem', display: 'block' }}>{'\u{1F514}'}</span>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginTop: '12px' }}>Nessuna notifica</p>
              <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>Le tue notifiche appariranno qui</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifications.map(n => (
                <div key={n.id} style={{
                  background: n.read ? 'transparent' : 'var(--indigo-light)',
                  borderRadius: '12px',
                  padding: '12px',
                  border: n.read ? '1px solid var(--border)' : '1px solid rgba(79,70,229,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{TYPE_ICONS[n.type] || '\u{1F4E2}'}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{n.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px', lineHeight: 1.4 }}>{n.body}</p>
                      <p style={{ fontSize: '10px', color: 'var(--text-sub)', marginTop: '4px' }}>{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
