import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase: Variables de entorno no configuradas')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Paciente {
  id: string
  nombre: string
  telefono: string
  whatsapp?: string
  fecha_procedimiento: string
  estado: 'pendiente' | 'apto' | 'reprogramar' | 'enviado'
  numero_documento?: string
  tipo_documento?: string
  departamento?: string
  municipio?: string
  fecha_envio?: string
  puntaje?: number
  created_at: string
  updated_at: string
}

export interface Respuesta {
  id: string
  paciente_id: string
  pregunta_numero: number
  respuesta: 'SI' | 'NO'
  mensaje_original?: string
  created_at: string
}

export interface Resultado {
  id: string
  paciente_id: string
  total_no: number
  estado_final: 'APTO' | 'REPROGRAMAR'
  evaluated_at: string
}

export interface NuevoPaciente {
  nombre: string
  telefono: string
  whatsapp?: string
  fecha_procedimiento: string
  numero_documento?: string
  tipo_documento?: string
  departamento?: string
  municipio?: string
}

export interface Estadisticas {
  total: number
  aptos: number
  reprogramados: number
  pendientes: number
  enviados: number
}