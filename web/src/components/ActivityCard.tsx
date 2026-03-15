interface ActivityCardProps {
  icon: string
  label: string
  value: number
  unit: string
  goal: number
  color: string
  delay?: number
}

const ACCENT_MAP: Record<string, { glow: string; bar: string; bg: string }> = {
  '#3b82f6': { glow: '59,130,246', bar: '#3D9EFF', bg: 'rgba(61,158,255,0.08)' },
  '#f97316': { glow: '255,69,0',   bar: '#FF4500', bg: 'rgba(255,69,0,0.08)' },
  '#10b981': { glow: '184,255,0',  bar: '#B8FF00', bg: 'rgba(184,255,0,0.08)' },
  '#ef4444': { glow: '255,69,100', bar: '#FF4564', bg: 'rgba(255,69,100,0.08)' },
}

export default function ActivityCard({ icon, label, value, unit, goal, color, delay = 0 }: ActivityCardProps) {
  const percent = Math.min((value / goal) * 100, 100)
  const accent = ACCENT_MAP[color] ?? { glow: '255,69,0', bar: '#FF4500', bg: 'rgba(255,69,0,0.08)' }
  const displayValue = typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value.toLocaleString()

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, #141419 0%, #0F0F14 100%)`,
        border: '1px solid #1C1C24',
        animationDelay: `${delay}ms`,
        animation: 'slide-up 0.4s ease both',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 80% 20%, rgba(${accent.glow},0.3) 0%, transparent 60%)`,
        }}
      />

      {/* Top row */}
      <div className="flex items-center justify-between mb-3 relative">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
          style={{ background: accent.bg, border: `1px solid rgba(${accent.glow}, 0.2)` }}
        >
          {icon}
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ color: accent.bar, background: `rgba(${accent.glow}, 0.1)` }}
        >
          {Math.round(percent)}%
        </span>
      </div>

      {/* Value */}
      <p
        className="text-4xl leading-none relative"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: '#F8F8FC' }}
      >
        {displayValue}
      </p>

      {/* Label */}
      <p className="text-xs mt-1 relative" style={{ color: '#8A8A96' }}>{unit}</p>
      <p className="text-sm font-600 mt-0.5 relative" style={{ color: '#D0D0D8', fontWeight: 600 }}>{label}</p>

      {/* Progress bar */}
      <div className="mt-3 rounded-full relative" style={{ height: '3px', background: '#1C1C24' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${accent.bar}, rgba(${accent.glow}, 0.5))`,
            boxShadow: `0 0 8px rgba(${accent.glow}, 0.5)`,
          }}
        />
      </div>
    </div>
  )
}
