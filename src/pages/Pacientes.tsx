import { useState } from 'react'
import { usePacientes } from '../hooks/usePacientes'
import { updatePaciente, deletePaciente } from '../services/pacientes'
import { Paciente } from '../services/supabaseClient'

type EstadoPaciente = 'pendiente' | 'enviado' | 'apto' | 'reprogramar'

function getEstadoBadge(estado: string) {
  const styles: Record<string, string> = {
    pendiente: 'bg-gray-100 text-gray-700',
    enviado: 'bg-blue-100 text-blue-700',
    apto: 'bg-green-100 text-green-700',
    reprogramar: 'bg-orange-100 text-orange-700',
  }
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    enviado: 'Enviado',
    apto: 'Apto',
    reprogramar: 'Reprogramar',
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[estado] || styles.pendiente}`}>
      {labels[estado] || estado}
    </span>
  )
}

function formatFecha(fecha: string) {
  if (!fecha) return '-'
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatFechaHora(fecha: string) {
  if (!fecha) return '-'
  return new Date(fecha).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ModalEditar({ paciente, onClose, onSave }: { paciente: Paciente; onClose: () => void; onSave: () => void }) {
  const [nombre, setNombre] = useState(paciente.nombre)
  const [telefono, setTelefono] = useState(paciente.telefono)
  const [whatsapp, setWhatsapp] = useState(paciente.whatsapp || '')
  const [fecha, setFecha] = useState(paciente.fecha_procedimiento)
  const [estado, setEstado] = useState<EstadoPaciente>(paciente.estado as EstadoPaciente)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePaciente(paciente.id, {
        nombre,
        telefono,
        whatsapp: whatsapp || telefono,
        fecha_procedimiento: fecha,
        estado: estado as any,
      })
      onSave()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar paciente?')) return
    setSaving(true)
    try {
      await deletePaciente(paciente.id)
      onSave()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Editar Paciente</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Procedimiento</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoPaciente)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="pendiente">Pendiente</option>
              <option value="enviado">Enviado</option>
              <option value="apto">Apto</option>
              <option value="reprogramar">Reprogramar</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleDelete}
            disabled={saving}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
          >
            Eliminar
          </button>
          <div className="flex-1"></div>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Pacientes() {
  const { pacientes, loading, error, refresh } = usePacientes()
  const [editando, setEditando] = useState<Paciente | null>(null)

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Pacientes</h1>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Pacientes</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pacientes</h1>
        <button
          onClick={refresh}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
        >
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enviado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puntaje</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pacientes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No hay pacientes cargados
                </td>
              </tr>
            ) : (
              pacientes.map((paciente) => (
                <tr key={paciente.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{paciente.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{paciente.telefono}</td>
                  <td className="px-4 py-3 text-gray-600">{formatFecha(paciente.fecha_procedimiento)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{formatFechaHora(paciente.fecha_envio || '')}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {paciente.puntaje !== undefined && paciente.puntaje !== null ? (
                      <span className={`px-2 py-1 rounded text-xs ${
                        paciente.puntaje === 5 ? 'bg-green-100 text-green-700' :
                        paciente.puntaje >= 0 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {paciente.puntaje}/5 NO
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">{getEstadoBadge(paciente.estado)}</td>
                  <td className="px-4 py-3 text-center">
                    {paciente.estado === 'pendiente' ? (
                      <button
                        onClick={async () => {
                          console.log('Enviando cambio para:', paciente.id, paciente.nombre)
                          try {
                            const result = await updatePaciente(paciente.id, { 
                              estado: 'enviado',
                              fecha_envio: new Date().toISOString()
                            })
                            console.log('Resultado:', result)
                            alert('✓ Marcado como enviado. Ahora corre npm run whatsapp para enviar el mensaje.')
                            refresh()
                          } catch (e: any) {
                            console.error('Error:', e)
                            alert('Error al enviar: ' + (e.message || e))
                          }
                        }}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        📤 Enviar
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditando(paciente)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pacientes.length > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          Mostrando {pacientes.length} paciente{pacientes.length === 1 ? '' : 's'}
        </p>
      )}

      {editando && (
        <ModalEditar
          paciente={editando}
          onClose={() => setEditando(null)}
          onSave={refresh}
        />
      )}
    </div>
  )
}