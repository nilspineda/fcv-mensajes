-- =====================================================
-- SISTEMA DE GESTIÓN DE PACIENTES - SCHEMA SUPABASE
-- =====================================================

-- -----------------------------------------------------
-- TABLA: pacientes
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    whatsapp TEXT,
    fecha_procedimiento DATE NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'apto', 'reprogramar', 'enviado')),
    numero_documento TEXT,
    tipo_documento TEXT,
    departamento TEXT,
    municipio TEXT,
    importado_por TEXT DEFAULT 'sheets',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas frecuentes
CREATE INDEX idx_pacientes_fecha ON public.pacientes(fecha_procedimiento);
CREATE INDEX idx_pacientes_estado ON public.pacientes(estado);
CREATE INDEX idx_pacientes_telefono ON public.pacientes(telefono);

-- -----------------------------------------------------
-- TABLA: respuestas
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.respuestas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    pregunta_numero INTEGER NOT NULL CHECK (pregunta_numero BETWEEN 1 AND 5),
    respuesta TEXT NOT NULL CHECK (respuesta IN ('SI', 'NO', 'si', 'no')),
    mensaje_original TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(paciente_id, pregunta_numero)
);

CREATE INDEX idx_respuestas_paciente ON public.respuestas(paciente_id);

-- -----------------------------------------------------
-- TABLA: resultados
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resultados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID UNIQUE NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    total_no INTEGER DEFAULT 0,
    estado_final TEXT CHECK (estado_final IN ('APTO', 'REPROGRAMAR')),
    evaluated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id)
);

CREATE INDEX idx_resultados_estado ON public.resultados(estado_final);

-- -----------------------------------------------------
-- TABLA: usuarios (para auth)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT DEFAULT 'auxiliar' CHECK (rol IN ('auxiliar', 'coordinadora', 'admin')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON public.usuarios(email);

-- -----------------------------------------------------
-- TABLA: audit_log
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    entidad_id TEXT,
    detalles JSONB,
    usuario_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- TRIGGER: updated_at automático
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pacientes_updated_at
    BEFORE UPDATE ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Política: everyone puede leer pacientes
CREATE POLICY "pacientes_read" ON public.pacientes
    FOR SELECT USING (true);

-- Política: usuarios autenticados pueden insertar
CREATE POLICY "pacientes_insert" ON public.pacientes
    FOR INSERT WITH CHECK (true);

-- Política: usuarios autenticados pueden actualizar
CREATE POLICY "pacientes_update" ON public.pacientes
    FOR UPDATE USING (true);

-- RLS para respuestas
CREATE POLICY "respuestas_read" ON public.respuestas
    FOR SELECT USING (true);
CREATE POLICY "respuestas_insert" ON public.respuestas
    FOR INSERT WITH CHECK (true);

-- RLS para resultados
CREATE POLICY "resultados_read" ON public.resultados
    FOR SELECT USING (true);
CREATE POLICY "resultados_insert" ON public.resultados
    FOR INSERT WITH CHECK (true);
CREATE POLICY "resultados_update" ON public.resultados
    FOR UPDATE USING (true);

-- RLS para usuarios
CREATE POLICY "usuarios_read" ON public.usuarios
    FOR SELECT USING (true);
CREATE POLICY "usuarios_insert" ON public.usuarios
    FOR INSERT WITH CHECK (true);

-- RLS para audit_log
CREATE POLICY "audit_log_insert" ON public.audit_log
    FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_log_read" ON public.audit_log
    FOR SELECT USING (true);