# Despliegue - Sistema de Pacientes

## Frontend (Vercel)

### Pasos:
1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Click "New Project"
3. Importa tu repositorio de GitHub
4. Configura:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Agrega variables de entorno:
   - `VITE_SUPABASE_URL`: Tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY`: Tu anon key
6. Click "Deploy"

### Variables necesarias:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

---

## Backend Scripts (Railway/VPS)

### Opción 1: Railway

1. Ve a [railway.app](https://railway.app)
2. Crea nuovo progetto "Empty Project"
3. Click "New" → "Node.js"
4. Conecta tu repo de GitHub
5. Configura:
   - Root Directory: `.`
   - Build Command: `npm install`
   - Start Command: `npm run cron` o `npm run import`
6. Agrega variables de entorno en "Variables" tab

### Opción 2: VPS/Droplet

```bash
# En tu servidor
git clone tu-repo
cd tu-repo
npm install

# Para correr cron job
npm run cron

# Para importar desde Sheets
npm run import

# Para WhatsApp Bot
npm run whatsapp
```

### Scripts disponibles:
```bash
npm run import        # Importar pacientes desde Google Sheets
npm run cron         # Cron job de notificaciones (diario 9am)
npm run cron:manual  # Ejecutar cron manual
npm run whatsapp   # Iniciar WhatsApp Bot
```

---

## Estructura final

```
proyecto/
├── src/               # Frontend React
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   └── services/
├── scripts/            # Backend scripts
│   ├── importPatients.js
│   ├── cronNotifications.js
│   └── whatsappBot.js
├── supabase/          # Schema DB
│   └── schema.sql
└── dist/              # Build output (Vercel)
```

---

## Notas importantes

### WhatsApp Bot:
- Requiere sesión persistente (se guarda en `.wwebjs_auth/`)
- Primer inicio requiere escanear QR manualmente
- En producción Railway: asegurar que tenga Chrome/Chromium

### Google Sheets:
- Necesitas Service Account con acceso a la hoja
- Compartir la hoja con el email del service account

### Supabase:
- Las tablas ya están creadas con schema.sql
- RLS habilitado

### Crontab alternativo (VPS):
```bash
# Editar crontab
crontab -e

# Agregar línea para 9am diarias
0 9 * * * cd /ruta/proyecto && npm run cron:manual
```