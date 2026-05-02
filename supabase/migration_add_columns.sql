-- =====================================================
-- ACTUALIZACIÓN SCHEMA - Columnas nuevas
-- =====================================================

-- Agregar columnas a pacientes
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS fecha_envio TIMESTAMPTZ;
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS puntaje INTEGER DEFAULT 0;

-- Actualizar índice para búsqueda por fecha_envio
CREATE INDEX IF NOT EXISTS idx_pacientes_fecha_envio ON public.pacientes(fecha_envio);