import { useEstadisticas } from '../hooks/usePacientes'

export default function Dashboard() {
  const { stats, loading, error, refresh } = useEstadisticas()

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <button
          onClick={refresh}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
        >
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Pacientes</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats?.total || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Aptos</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats?.aptos || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Reprogramados</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">{stats?.reprogramados || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-4">Estado General</p>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Pendientes</span>
              <span className="font-medium">{stats?.pendientes || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Enviados</span>
              <span className="font-medium">{stats?.enviados || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Aptos</span>
              <span className="font-medium text-green-600">{stats?.aptos || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reprogramados</span>
              <span className="font-medium text-orange-600">{stats?.reprogramados || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-4">Resumen</p>
          <p className="text-gray-600">
            {stats && stats.total > 0
              ? `Hay ${stats.total} paciente${stats.total === 1 ? '' : 's'} registrado${
                  stats.total === 1 ? '' : 's'
                }.`
              : 'No hay pacientes registrados.'}
          </p>
        </div>
      </div>
    </div>
  )
}