interface Props {
  icon: string
  label: string
  value: number
  unit: string
  goal: number
  color: string
  delay?: number
}

const COLOR_MAP: Record<string, string> = {
  '#3b82f6': 'var(--blue)',
  '#f97316': 'var(--orange)',
  '#10b981': 'var(--green)',
  '#ef4444': 'var(--pink)',
}

export default function ActivityCard({ icon, label, value, unit, goal, color, delay = 0 }: Props) {
  const c = COLOR_MAP[color] ?? color
  const pct = Math.min(100, Math.round((value / goal) * 100))
  const displayValue = value >= 1000 ? (value / 1000).toFixed(1) + 'k' : String(value)

  return (
    <div
      className="animate-up"
      style={{
        animationDelay: `${delay}ms`,
        background: 'var(--bg-card)',
        borderLeft: `3px solid ${c}`,
        padding: '14px 16px 12px',
        borderRadius: '0 6px 6px 0',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '16px' }}>{icon}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {label}
          </span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, color: c }}>
          {pct}%
        </span>
      </div>
      <div className="flex items-end justify-between">
        <span className="font-display" style={{ fontSize: '2.6rem', color: 'var(--text)', lineHeight: 1 }}>
          {displayValue}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-sub)', paddingBottom: '4px' }}>{unit}</span>
      </div>
      <div style={{ height: '2px', background: 'var(--border)', marginTop: '10px', borderRadius: '1px', overflow: 'hidden' }}>
        <div
          className="animate-fill"
          style={{ width: `${pct}%`, height: '100%', background: c, animationDelay: `${delay + 200}ms` }}
        />
      </div>
    </div>
  )
}
