import Layout from '../components/Layout'

export default function CommunityPage() {
  return (
    <Layout>
      <div className="bg-white border-b border-gray-100 px-5 pt-10 pb-5">
        <h1 className="text-2xl font-bold">Community 📍</h1>
        <p className="text-sm text-gray-400 mt-1">Trova persone per allenarti insieme</p>
      </div>
      <div className="px-5 py-10 text-center">
        <p className="text-5xl mb-4">🗺️</p>
        <h2 className="text-lg font-bold text-gray-700">Radar Runner</h2>
        <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
          La mappa live con i runner vicino a te sarà disponibile nell'app mobile. Installa FitSocial sul tuo telefono per accedere.
        </p>
        <div className="mt-6 space-y-3">
          {['🏃 Trova runner vicino a te', '📅 Crea eventi sportivi', '👥 Gruppi di allenamento', '🗺️ Percorsi popolari'].map(f => (
            <div key={f} className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-600 text-left">
              {f} <span className="text-xs text-blue-500 float-right">App mobile</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
