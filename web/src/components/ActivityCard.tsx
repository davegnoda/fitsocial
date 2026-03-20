interface Props {
  icon: string
  label: string
  value: number
  unit: string
  goal: number
  color: string
  delay?: number
}

export default function ActivityCard({ icon, label, value, unit, goal, color, delay = 0 }: Props) {
  const pct = Math.min(100, Math.round((value / goal) * 100))
  const displayValue = value >= 1000 ? (value / 1000).toFixed(1) + 'k' : String(value)

  return (
    <div
      className="animate-up"
      style={{
        animationDelay: `${delay}ms`,
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        padding: '16px',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center justify-between mb-1.5">
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {label}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 700, color }}>
            {pct}%
          </span>
        </div>
        <div style={{ height: '4px', background: 'var(--bg-surface)', borderRadius: '2px', overflow: 'hidden' }}>
          <div
            className="animate-fill"
            style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', animationDelay: `${delay + 200}ms` }}
          />
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span className="font-display" style={{ fontSize: '1.6rem', color: 'var(--text)', lineHeight: 1, display: 'block' }}>
          {displayValue}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-sub)' }}>{unit}</span>
      </div>
    </div>
  )
}
