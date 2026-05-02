import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import 'dotenv/config'
import fs from 'fs'
import http from 'http'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

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

const QR_CODE_URL = 'http://localhost:9876/qr.png'
let qrImage = ''

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/qr.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' })
      res.end(qrImage, 'binary')
      return
    }
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>WhatsApp QR - FCV</title>
          <style>
            body { font-family: Arial; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
            h1 { color: #333; }
            .qr { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            img { width: 300px; height: 300px; }
            .status { margin-top: 20px; color: #666; }
          </style>
        </head>
        <body>
          <h1>📱 WhatsApp Bot - FCV</h1>
          <div class="qr">
            <img src="/qr.png" alt="QR Code" />
          </div>
          <p class="status">Escanea este código con tu WhatsApp</p>
        </body>
        </html>
      `)
      return
    }
    res.writeHead(404)
    res.end()
  })
  
  server.listen(9876, () => {
    console.log('🌐 Servidor QR: http://localhost:9876')
  })
}

startServer()

async function iniciarBot() {
  console.log('🤖 Iniciando WhatsApp Bot...')

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
    console.log('📱 Generando QR...')
    qrImage = await QRCode.toBuffer(qr, { margin: 1, width: 300 })
    console.log('✅ QR en: http://localhost:9876')
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

  const pacientes = await buscarPacientesParaEnviar()
  console.log(`📋 Pacientes para enviar: ${pacientes.length}`)

  for (const paciente of pacientes) {
    try {
      console.log(`📤 Enviando a ${paciente.nombre} (${paciente.whatsapp})...`)
      const chatId = `${paciente.whatsapp}@c.us`
      
      const mensajeInicio = `Hola ${paciente.nombre}! Buenos días\n\nTu procedimiento está programadas para mañana. Por favor responde las siguientes preguntas:\n\n${PREGUNTAS[0]}\n\nResponde solo SI o NO`
      
      await client.sendMessage(chatId, mensajeInicio)
      console.log(`✅ Enviado a ${paciente.nombre}`)
      
    } catch (error) {
      console.error(`❌ Error.enviando a ${paciente.nombre}:`, error.message)
    }
  }
}

iniciarBot().catch(console.error)