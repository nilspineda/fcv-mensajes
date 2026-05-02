import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY || ''

const PREGUNTAS = [
  '1. ¿Ha tenido fiebre en las últimas 48 horas? (Responde SI o NO)',
  '2. ¿Ha tosido persistente o dificultad para respirar? (Responde SI o NO)',
  '3. ¿Ha tenido vómitos o diarrea? (Responde SI o NO)',
  '4. ¿Ha estado en contacto con personas con síntomas gripales? (Responde SI o NO)',
  '5. ¿Tiene sospecha que tiene gripa? (Responde SI o NO)',
]

const conversasActivas = new Map()

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function buscarPacientesParaEnviar() {
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, nombre, telefono, whatsapp, fecha_procedimiento')
    .eq('estado', 'enviado')

  if (error) {
    console.error('❌ Error buscando pacientes:', error.message)
    return []
  }

  return data || []
}

async function evaluarPaciente(pacienteId, respuestas) {
  const totalNo = respuestas.filter(r => r.respuesta === 'NO').length
  const estadoFinal = totalNo === 5 ? 'APTO' : 'REPROGRAMAR'

  await supabase.from('resultados').upsert({
    paciente_id: pacienteId,
    total_no: totalNo,
    estado_final: estadoFinal,
  }, { onConflict: 'paciente_id' })

  await supabase.from('pacientes').update({
    estado: estadoFinal.toLowerCase(),
  }).eq('id', pacienteId)

  console.log(`✅ Paciente ${pacienteId}: ${totalNo}/5 NO → ${estadoFinal}`)
}

function normalizeRespuesta(mensaje) {
  const m = mensaje.toUpperCase().trim()
  if (m === 'SI' || m === 'S' || m === 'YES' || m === 'Y') return 'SI'
  if (m === 'NO' || m === 'N') return 'NO'
  return null
}

async function handleMensaje(msg) {
  const chat = await msg.getChat()
  const contacto = await msg.getContact()
  const numero = contacto.number

  console.log(`💬 Mensaje de ${numero}: ${msg.body}`)

  if (!conversasActivas.has(numero)) {
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('id, nombre, estado')
      .eq('whatsapp', `57${numero}`)
      .eq('estado', 'enviado')
      .single()

    if (!paciente) {
      console.log('⚠️ Paciente no encontrado o ya evaluado')
      return
    }

    const { data: respuestasExistentes } = await supabase
      .from('respuestas')
      .select('pregunta_numero')
      .eq('paciente_id', paciente.id)

    const siguientePregunta = (respuestasExistentes?.length || 0) + 1

    if (siguientePregunta > 5) {
      console.log('✅ Paciente ya completó todas las preguntas')
      return
    }

    conversasActivas.set(numero, {
      pacienteId: paciente.id,
      preguntaActual: siguientePregunta,
      respuestas: [],
    })

    const mensaje = `Hola ${paciente.nombre}, buenos días!\n\n${PREGUNTAS[siguientePregunta - 1]}\n\nResponde solo SI o NO`
    await chat.sendMessage(mensaje)
    return
  }

  const convo = conversasActivas.get(numero)
  const respuesta = normalizeRespuesta(msg.body)

  if (!respuesta) {
    await chat.sendMessage('Por favor responde solo SI o NO')
    return
  }

  convo.respuestas.push(respuesta)

  await supabase.from('respuestas').upsert({
    paciente_id: convo.pacienteId,
    pregunta_numero: convo.preguntaActual,
    respuesta,
    mensaje_original: msg.body,
  }, { onConflict: 'paciente_id,pregunta_numero' })

  if (convo.preguntaActual < 5) {
    convo.preguntaActual++
    const mensaje = `Gracias!${PREGUNTAS[convo.preguntaActual - 1]}\n\nResponde solo SI o NO`
    await chat.sendMessage(mensaje)
  } else {
    await evaluarPaciente(convo.pacienteId, convo.respuestas)
    await chat.sendMessage('Gracias! Ya completaste el cuestionario. Te contactaremos pronto.')
    conversasActivas.delete(numero)
  }
}

async function iniciarBot() {
  console.log('🤖 Iniciando WhatsApp Bot...')
  console.log('='.repeat(50))

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: '.wwebjs_auth',
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  })

  client.on('qr', async (qr) => {
    console.log('\n📱 ESCANEA ESTE CÓDIGO CON TU WHATSAPP:')
    console.log('-'.repeat(50))
    console.log(qr)
    console.log('-'.repeat(50))
    console.log('\n💡 Si no puedes escanear, copia el código de arriba y pégalo en:')
    console.log('   https://api.qrserver.com/v1/create-qr-code/?data=' + encodeURIComponent(qr))
    console.log('='.repeat(50))
  })

  client.on('ready', () => {
    console.log('✅ WhatsApp conectado!')
  })

  client.on('message', async (msg) => {
    if (msg.fromMe) return
    if (msg.type !== 'chat') return
    
    try {
      await handleMensaje(msg)
    } catch (error) {
      console.error('❌ Error manejando mensaje:', error.message)
    }
  })

  client.on('disconnected', () => {
    console.log('❌ WhatsApp desconectado')
    process.exit(1)
  })

  await client.initialize()

  client.on('ready', async () => {
    console.log('✅ WhatsApp conectado!')
    
    const pacientes = await buscarPacientesParaEnviar()
    console.log(`📋 Pacientes para enviar: ${pacientes.length}`)

    for (const paciente of pacientes) {
      try {
        console.log(`📤 Enviando a ${paciente.nombre} (${paciente.whatsapp})...`)
        const chatId = `${paciente.whatsapp}@c.us`
        
        const mensajeInicio = `Hola ${paciente.nombre}! Buenos días\n\nTu procedimiento está programado para mañana. Por favor responde las siguientes preguntas:\n\n${PREGUNTAS[0]}\n\nResponde solo SI o NO`
        
        await client.sendMessage(chatId, mensajeInicio)
        console.log(`✅ Enviado a ${paciente.nombre}`)
        
      } catch (error) {
        console.error(`❌ Error.enviando a ${paciente.nombre}:`, error.message)
      }
    }
    
    if (pacientes.length === 0) {
      console.log('ℹ️ No hay pacientes para enviar. El bot permanecerá escuchando...')
    }
  })

iniciarBot().catch(console.error)