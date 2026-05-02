import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

const SHEET_ID = process.env.GOOGLE_SHEET_ID
const SHEET_RANGE = process.env.GOOGLE_SHEET_RANGE || 'Hoja1!A:Z'

const Columnas = {
  tipoDocumento: 'A',
  numeroDocumento: 'B',
  nombre: 'C',
  departamento: 'D',
  municipio: 'E',
  whatsapp: 'F',
  fechaProcedimiento: 'G',
}

async function authGoogle() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}')
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  })

  const client = await auth.getClient()
  return client
}

async function getSheetData(authClient) {
  const sheets = google.sheets({ version: 'v4', auth: authClient })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE,
  })

  return response.data.values || []
}

function mapPacientes(rows) {
  if (rows.length < 2) {
    console.log('⚠️ No hay datos para importar')
    return []
  }

  const headerRow = rows[0].map(h => h?.toLowerCase().trim() || '')
  
  const idx = {
    tipoDocumento: headerRow.findIndex(c => c.includes('tipo')),
    numeroDocumento: headerRow.findIndex(c => c.includes('numero')),
    nombre: headerRow.findIndex(c => c.includes('nombre')),
    departamento: headerRow.findIndex(c => c.includes('departamento')),
    municipio: headerRow.findIndex(c => c.includes('municipio')),
    whatsapp: headerRow.findIndex(c => c.includes('whatsapp') || c.includes('telefono')),
    fechaProcedimiento: headerRow.findIndex(c => c.includes('fecha') || c.includes('procedimiento')),
  }

  console.log('📊 Índices de columnas:', idx)

  const pacientes = []
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0 || !row[idx.nombre]) continue

    const telefono = idx.whatsapp >= 0 ? String(row[idx.whatsapp] || '').replace(/\D/g, '') : ''
    const fechaProc = idx.fechaProcedimiento >= 0 ? row[idx.fechaProcedimiento] : null

    if (!telefono || !fechaProc) {
      console.log(`⚠️ Fila ${i + 1}: Sin teléfono o fecha, saltando`)
      continue
    }

    let fechaFormateada
    try {
      const fechaParse = new Date(fechaProc)
      if (isNaN(fechaParse.getTime())) {
        const partes = String(fechaProc).split(/[\/\-]/)
        if (partes.length === 3) {
          fechaFormateada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`
        } else {
          continue
        }
      } else {
        fechaFormateada = fechaParse.toISOString().split('T')[0]
      }
    } catch {
      continue
    }

    pacientes.push({
      nombre: String(row[idx.nombre] || '').trim(),
      telefono: `57${telefono}`,
      whatsapp: `57${telefono}`,
      fecha_procedimiento: fechaFormateada,
      numero_documento: idx.numeroDocumento >= 0 ? String(row[idx.numeroDocumento] || '') : null,
      tipo_documento: idx.tipoDocumento >= 0 ? String(row[idx.tipoDocumento] || '') : null,
      departamento: idx.departamento >= 0 ? String(row[idx.departamento] || '') : null,
      municipio: idx.municipio >= 0 ? String(row[idx.municipio] || '') : null,
    })
  }

  return pacientes
}

async function insertarPacientes(pacientes) {
  if (pacientes.length === 0) {
    console.log('⚠️ No hay pacientes para insertar')
    return { insertados: 0, duplicados: 0 }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const { data: existentes } = await supabase
    .from('pacientes')
    .select('telefono, fecha_procedimiento')
    .in('telefono', pacientes.map(p => p.telefono))

  const existentesMap = new Set(existentes?.map(p => p.telefono) || [])
  
  const nuevos = pacientes.filter(p => !existentesMap.has(p.telefono))
  const duplicados = pacientes.length - nuevos.length

  console.log(`📋 Total: ${pacientes.length}, Existentes: ${existentesMap.size}, Nuevos: ${nuevos.length}, Duplicados: ${duplicados}`)

  if (nuevos.length > 0) {
    const { data, error } = await supabase
      .from('pacientes')
      .insert(nuevos)
      .select()

    if (error) {
      console.error('❌ Error inserting:', error.message)
      throw error
    }

    console.log(`✅ Insertados: ${data?.length || nuevos.length} pacientes`)
    return { insertados: data?.length || nuevos.length, duplicados }
  }

  return { insertados: 0, duplicados }
}

async function main() {
  console.log('🚀 Iniciando importación de pacientes...')
  console.log(`📋 Sheet ID: ${SHEET_ID}`)
  console.log(`📋 Range: ${SHEET_RANGE}`)

  if (!SHEET_ID) {
    console.error('❌ Falta GOOGLE_SHEET_ID en .env')
    process.exit(1)
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Faltan credenciales de Supabase')
    process.exit(1)
  }

  try {
    console.log('🔐 Autenticando con Google...')
    const authClient = await authGoogle()

    console.log('📥 Leyendo Google Sheets...')
    const rows = await getSheetData(authClient)
    console.log(`📊 Filas encontradas: ${rows.length}`)

    console.log('🔄 Mapeando pacientes...')
    const pacientes = mapPacientes(rows)

    console.log('💾 Insertando en Supabase...')
    const resultado = await insertarPacientes(pacientes)

    console.log('\n✅ Importación completada!')
    console.log(`   Insertados: ${resultado.insertados}`)
    console.log(`   Duplicados: ${resultado.duplicados}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()