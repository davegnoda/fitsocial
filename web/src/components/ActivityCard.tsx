interface ActivityCardProps {
  icon: string
  label: string
  value: number
  unit: string
  goal: number
  color: string
}

export default function ActivityCard({ icon, label, value, unit, goal, color }: ActivityCardProps) {
  const percent = Math.min((value / goal) * 100, 100)
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-semibold px-2 py-1 rounded-full"
          style={{ backgroundColor: color + '15', color }}>
          {Math.round(percent)}%
        </span>
      </div>
      <p className="text-2xl font-bold mt-1">{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value.toLocaleString()}</p>
      <p className="text-xs text-gray-400">{unit}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
      <div className="mt-2 bg-gray-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
