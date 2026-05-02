import { useState, useEffect, useCallback } from 'react'
import * as db from '../services/pacientes'
import { Paciente, NuevoPaciente } from '../services/supabaseClient'

interface Estadisticas {
  total: number
  aptos: number
  reprogramados: number
  pendientes: number
  enviados: number
}

interface UsePacientesReturn {
  pacientes: Paciente[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function usePacientes(): UsePacientesReturn {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await db.getPacientes()
      setPacientes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { pacientes, loading, error, refresh }
}

interface UseEstadisticasReturn {
  stats: Estadisticas | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useEstadisticas(): UseEstadisticasReturn {
  const [stats, setStats] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await db.getEstadisticas()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { stats, loading, error, refresh }
}

export function useCreatePaciente() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (paciente: NuevoPaciente) => {
    try {
      setLoading(true)
      setError(null)
      const created = await db.createPaciente(paciente)
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { create, loading, error }
}