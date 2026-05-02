import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

const CRON_TIME = process.env.CRON_TIME || '0 9 * * *'

function getFechaProcedimiento(dias) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toISOString().split('T')[0]
}

async function buscarPacientesParaRecordatorio(supabase) {
  const fechaObjetivo = getFechaProcedimiento(1)

  const { data, error } = await supabase
    .from('pacientes')
    .select('id, nombre, telefono, whatsapp, fecha_procedimiento, estado')
    .eq('fecha_procedimiento', fechaObjetivo)
    .eq('estado', 'pendiente')

  if (error) {
    console.error('❌ Error buscando pacientes:', error.message)
    return []
  }

  console.log(`📋 Pacientes con procedimiento el ${fechaObjetivo}: ${data?.length || 0}`)
  return data || []
}

async function marcarParaEnvio(supabase, pacientes) {
  if (pacientes.length === 0) {
    console.log('⚠️ No hay pacientes para marcar')
    return
  }

  const ids = pacientes.map(p => p.id)

  const { error } = await supabase
    .from('pacientes')
    .update({ estado: 'enviado' })
    .in('id', ids)

  if (error) {
    console.error('❌ Error actualizando estado:', error.message)
    return
  }

  console.log(`✅ Marcados ${ids.length} pacientes para envío de mensaje`)
}

async function ejecutarJob() {
  console.log('\n⏰ === Cron Job: Buscar pacientes para recordatorio ===')
  console.log(`🕐 Ejecución: ${new Date().toISOString()}`)

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Faltan credenciales de Supabase')
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const pacientes = await buscarPacientesParaRecordatorio(supabase)
  
  await marcarParaEnvio(supabase, pacientes)

  console.log('✅ Job completado\n')
}

async function main() {
  const esManual = process.argv.includes('--manual')

  if (esManual) {
    console.log('🔧 Modo manual: ejecutando una vez...')
    await ejecutarJob()
    process.exit(0)
  }

  console.log('🚀 Cron Job de notificaciones iniciado')
  console.log(`⏰ Programado para: ${CRON_TIME}`)
  console.log('🛑 Presiona Ctrl+C para detener')

  if (!cron.validate(CRON_TIME)) {
    console.error('❌ Expresión CRON inválida:', CRON_TIME)
    process.exit(1)
  }

  cron.schedule(CRON_TIME, ejecutarJob)
}

main()