import { useState } from 'react'
import { parseCSV, csvToObjects, extractSheetId } from '../utils/csvParser'
import { createPacientes } from '../services/pacientes'

const DEFAULT_SHEET_ID = '1b08rfFNvb5fJ6sZNUbjPLdfASEbD-iaOq74r-xp5Mho'

interface PacientePreview {
  nombre: string
  telefono: string
  whatsapp: string
  fecha_procedimiento: string
  [key: string]: string
}

export default function Importar() {
  const [sheetId, setSheetId] = useState(DEFAULT_SHEET_ID)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PacientePreview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ insertados: number; duplicados: number } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const id = extractSheetId(sheetId)
      const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`
      console.log('Fetching:', url)

      const response = await fetch(url)
      console.log('Response status:', response.status)
      if (!response.ok) {
        throw new Error('Error al descargar la hoja: ' + response.status)
      }

      const text = await response.text()
      console.log('Raw CSV (first 500 chars):', text.slice(0, 500))
      
      const rows = parseCSV(text)
      console.log('Parsed rows:', rows.length)

      if (rows.length < 2) {
        throw new Error('La hoja está vacía o no tiene datos')
      }

      const headers = rows[0].map(h => h.toLowerCase().trim())
      console.log('Headers:', headers)
      
      const data = csvToObjects(headers, rows.slice(1))

      const mapped = data
        .filter(row => row.nombre || row.Nombre)
        .map(row => {
          const tel = String(row.whatsapp || row['whatsapp'] || row.telefono || row.Telefono || row['whatsapp'] || '').replace(/\D/g, '')
          const fecha = row.fecha || row.Fecha || row.fecha_procedimiento || ''

          let fechaFormateada = ''
          if (fecha) {
            try {
              const d = new Date(fecha)
              if (!isNaN(d.getTime())) {
                fechaFormateada = d.toISOString().split('T')[0]
              } else {
                const partes = String(fecha).split(/[\/\-]/)
                if (partes.length === 3) {
                  fechaFormateada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`
                }
              }
            } catch {
              const partes = String(fecha).split(/[\/\-]/)
              if (partes.length === 3) {
                fechaFormateada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`
              }
            }
          }

          return {
            nombre: row.nombre || row.Nombre || '',
            telefono: tel ? `57${tel}` : '',
            whatsapp: tel ? `57${tel}` : '',
            fecha_procedimiento: fechaFormateada,
          }
        })
        .filter(p => p.nombre && p.telefono && p.fecha_procedimiento)

      console.log('Mapped pacientes:', mapped.length, mapped)
      setPreview(mapped.slice(0, 10))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (preview.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const pacientesToInsert = preview.map(p => ({
        nombre: p.nombre,
        telefono: p.telefono,
        whatsapp: p.whatsapp,
        fecha_procedimiento: p.fecha_procedimiento,
      }))

      const result = await createPacientes(pacientesToInsert)
      setResult({ insertados: result.insertados, duplicados: result.duplicados })
      setPreview([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Importar Pacientes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL o ID de Google Sheets
          </label>
          <input
            type="text"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            placeholder="Pega la URL o ID de la hoja"
          />

          <button
            onClick={fetchData}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Cargando...' : 'Previsualizar Datos'}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              ✅ Importados: {result.insertados} pacientes
              {result.duplicados > 0 && ` (${result.duplicados} omitidos por duplicado)`}
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">
            Preview ({preview.length} pacientes)
          </h2>

          {preview.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Teléfono</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preview.map((p, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-800">{p.nombre}</td>
                        <td className="px-3 py-2 text-gray-600">{p.telefono}</td>
                        <td className="px-3 py-2 text-gray-600">{p.fecha_procedimiento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Importando...' : `Importar ${preview.length} Pacientes`}
              </button>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No hay datos. Carga una hoja para ver preview.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}