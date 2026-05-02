import { supabase, Paciente, Respuesta, Resultado, NuevoPaciente } from './supabaseClient'

export async function getPacientes(): Promise<Paciente[]> {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .order('fecha_procedimiento', { ascending: true })

  if (error) {
    console.error('Error fetching pacientes:', error)
    throw error
  }

  return data || []
}

export async function getPacienteById(id: string): Promise<Paciente | null> {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching paciente:', error)
    throw error
  }

  return data
}

export async function getPacientesByFecha(fecha: string): Promise<Paciente[]> {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('fecha_procedimiento', fecha)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching pacientes by fecha:', error)
    throw error
  }

  return data || []
}

export async function getPacientesParaRecordatorio(diasAntelacion: number = 1): Promise<Paciente[]> {
  const fechaInicio = new Date()
  fechaInicio.setDate(fechaInicio.getDate() + diasAntelacion)
  const fechaFin = new Date(fechaInicio)
  fechaFin.setDate(fechaFin.getDate() + 1)

  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .gte('fecha_procedimiento', fechaInicio.toISOString().split('T')[0])
    .lt('fecha_procedimiento', fechaFin.toISOString().split('T')[0])
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching pacientes para recordatorio:', error)
    throw error
  }

  return data || []
}

export async function createPaciente(paciente: NuevoPaciente): Promise<Paciente> {
  const { data, error } = await supabase
    .from('pacientes')
    .insert(paciente)
    .select()
    .single()

  if (error) {
    console.error('Error creating paciente:', error)
    throw error
  }

  return data
}

export async function createPacientes(pacientes: NuevoPaciente[]): Promise<{ insertados: number; duplicados: number }> {
  if (pacientes.length === 0) {
    return { insertados: 0, duplicados: 0 }
  }

  // Check for duplicates: SAME phone + SAME date = duplicate
  // If SAME phone but DIFFERENT date = allow (different appointment)
  const pairs = pacientes.map(p => ({ telefono: p.telefono, fecha: p.fecha_procedimiento }))
  
  const { data: existentes, error: errFetch } = await supabase
    .from('pacientes')
    .select('telefono, fecha_procedimiento')
    .in('telefono', pairs.map(p => p.telefono))

  if (errFetch) {
    console.error('Error checking duplicates:', errFetch)
    throw errFetch
  }

  // Create a set of existing (phone, date) pairs
  const existentesMap = new Set(
    existentes?.map(p => `${p.telefono}|${p.fecha_procedimiento}`) || []
  )
  
  // Filter: keep only if (phone, date) is NOT in existing
  const nuevos = pacientes.filter(p => !existentesMap.has(`${p.telefono}|${p.fecha_procedimiento}`))
  const duplicados = pacientes.length - nuevos.length

  if (nuevos.length === 0) {
    return { insertados: 0, duplicados }
  }

  const { data, error } = await supabase
    .from('pacientes')
    .insert(nuevos)
    .select()

  if (error) {
    console.error('Error creating pacientes:', error)
    throw error
  }

  return { insertados: data?.length || nuevos.length, duplicados }
}

export async function updatePaciente(id: string, updates: Partial<Paciente>): Promise<Paciente> {
  const { data, error } = await supabase
    .from('pacientes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating paciente:', error)
    throw error
  }

  return data
}

export async function deletePaciente(id: string): Promise<void> {
  const { error } = await supabase
    .from('pacientes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting paciente:', error)
    throw error
  }
}

export async function getRespuestasByPaciente(pacienteId: string): Promise<Respuesta[]> {
  const { data, error } = await supabase
    .from('respuestas')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('pregunta_numero', { ascending: true })

  if (error) {
    console.error('Error fetching respuestas:', error)
    throw error
  }

  return data || []
}

export async function saveRespuesta(
  pacienteId: string,
  preguntaNumero: number,
  respuesta: 'SI' | 'NO',
  mensajeOriginal?: string
): Promise<Respuesta> {
  const { data, error } = await supabase
    .from('respuestas')
    .upsert(
      {
        paciente_id: pacienteId,
        pregunta_numero: preguntaNumero,
        respuesta: respuesta.toUpperCase(),
        mensaje_original: mensajeOriginal,
      },
      { onConflict: 'paciente_id,pregunta_numero' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error saving respuesta:', error)
    throw error
  }

  return data
}

export async function getResultadoByPaciente(pacienteId: string): Promise<Resultado | null> {
  const { data, error } = await supabase
    .from('resultados')
    .select('*')
    .eq('paciente_id', pacienteId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching resultado:', error)
    throw error
  }

  return data
}

export async function saveResultado(
  pacienteId: string,
  totalNo: number
): Promise<Resultado> {
  const estadoFinal = totalNo === 5 ? 'APTO' : 'REPROGRAMAR'

  const { data, error } = await supabase
    .from('resultados')
    .upsert(
      {
        paciente_id: pacienteId,
        total_no: totalNo,
        estado_final: estadoFinal,
      },
      { onConflict: 'paciente_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error saving resultado:', error)
    throw error
  }

  await supabase
    .from('pacientes')
    .update({ estado: estadoFinal.toLowerCase() })
    .eq('id', pacienteId)

  return data
}

export interface Estadisticas {
  total: number
  aptos: number
  reprogramados: number
  pendientes: number
  enviados: number
}

export async function getEstadisticas(): Promise<Estadisticas> {
  const { data, error } = await supabase.rpc('get_estadisticas_pacientes')

  if (error) {
    console.warn('RPC no encontrada, usando consulta manual')
    const { data: pacientes, error: err } = await supabase
      .from('pacientes')
      .select('estado')

    if (err) {
      console.error('Error fetching estadisticas:', err)
      throw err
    }

    const stats: Estadisticas = {
      total: 0,
      aptos: 0,
      reprogramados: 0,
      pendientes: 0,
      enviados: 0,
    }

    if (pacientes) {
      stats.total = pacientes.length
      stats.aptos = pacientes.filter((p: { estado: string }) => p.estado === 'apto').length
      stats.reprogramados = pacientes.filter((p: { estado: string }) => p.estado === 'reprogramar').length
      stats.pendientes = pacientes.filter((p: { estado: string }) => p.estado === 'pendiente').length
      stats.enviados = pacientes.filter((p: { estado: string }) => p.estado === 'enviado').length
    }

    return stats
  }

  return data
}