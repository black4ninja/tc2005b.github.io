# TC2005B API

Backend del proyecto **TC2005B - Construccion de Software y Toma de Decisiones**. Construido con Express + Parse Server sobre MongoDB Atlas.

En produccion, este servidor tambien sirve el frontend (React/Vite), la documentacion (Docusaurus) y el contenido legacy estatico.

---

## Requisitos

- **Node.js** >= 18
- **Yarn** (gestor de paquetes)
- **MongoDB Atlas** (o instancia local de MongoDB)
- **PM2** (para produccion)

---

## Estructura del proyecto

```
packages/api/
├── src/
│   ├── index.ts              # Entry point del servidor
│   ├── app.ts                # Configuracion de Express y rutas
│   ├── config/
│   │   ├── index.ts          # Variables de entorno
│   │   └── parse.ts          # Inicializacion de Parse Server
│   ├── models/               # Modelos Parse (AppUser, Grupo, etc.)
│   ├── routes/               # Definicion de rutas /api/*
│   ├── controllers/          # Logica de cada endpoint
│   ├── middlewares/          # Auth, ABAC, error handler
│   ├── services/             # Logica de negocio (auth, email, ABAC)
│   └── templates/            # Plantillas HTML para emails
├── scripts/                  # Seeds y migraciones
├── logs/                     # Logs de PM2
├── .env                      # Variables de entorno (no commitear)
├── .env.example              # Plantilla de variables
├── tsconfig.json
└── package.json
```

---

## Configuracion

### 1. Instalar dependencias

Desde la raiz del monorepo:

```bash
yarn install
```

### 2. Configurar variables de entorno

Copiar el archivo de ejemplo y editar con los valores reales:

```bash
cp packages/api/.env.example packages/api/.env
```

Variables disponibles:

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3002` |
| `NODE_ENV` | Entorno (`development` / `production`) | `development` |
| `DATABASE_URI` | URI de conexion a MongoDB Atlas | — |
| `APP_ID` | Identificador de la app Parse | `tc2005b-api` |
| `MASTER_KEY` | Llave maestra de Parse (generar aleatoriamente) | — |
| `PARSE_MOUNT` | Ruta donde se monta Parse Server | `/parse` |
| `SERVER_URL` | URL publica del Parse Server | `http://localhost:3002/parse` |
| `MAILERSEND_API_KEY` | API key de MailerSend para envio de correos | — |
| `EMAIL_FROM` | Correo remitente | `no_reply@meeplab.com` |
| `EMAIL_FROM_NAME` | Nombre del remitente | `TC2005B` |
| `AZURE_CLIENT_ID` | Client ID de Azure AD (opcional, para login Microsoft) | — |
| `AZURE_TENANT_ID` | Tenant ID de Azure AD (opcional) | — |
| `MAGIC_LINK_EXPIRY_MINUTES` | Expiracion del magic link en minutos | `15` |
| `SESSION_EXPIRY_DAYS` | Expiracion de sesion en dias | `7` |
| `FRONTEND_URL` | URL del frontend (para magic links) | `http://localhost:5173` |

---

## Desarrollo

### Iniciar todos los servicios (desde la raiz del monorepo)

```bash
yarn dev
```

Esto levanta concurrentemente:
- **Web (Vite)** en `http://localhost:5173`
- **Docs (Docusaurus)** en `http://localhost:3001`
- **API** en `http://localhost:3002`

### Iniciar solo la API

```bash
yarn workspace @tc2005b/api dev
```

### Verificar que funciona

```
GET http://localhost:3002/api/health  →  { "status": "ok" }
```

---

## Seeds

Poblar la base de datos con datos iniciales:

```bash
# Ejecutar todos los seeds
yarn workspace @tc2005b/api seed

# Vista previa sin guardar cambios
yarn workspace @tc2005b/api seed:dry-run

# Solo competencias
yarn workspace @tc2005b/api seed:competencias
```

---

## Rutas principales

### Publicas (sin autenticacion)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login con correo y contrasena |
| `POST` | `/api/auth/magic-link` | Solicitar magic link |
| `POST` | `/api/auth/verify` | Verificar magic link |
| `POST` | `/api/auth/microsoft` | Login con Microsoft OAuth |
| `GET` | `/api/calendario/:grupoName` | Calendario publico por grupo |
| `GET` | `/api/health` | Health check |

### Autenticadas (requieren header `x-session-token`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/api/auth/me` | Obtener usuario actual |
| `POST` | `/api/auth/logout` | Cerrar sesion |

### Admin (requieren rol admin)

- `/api/admin/grupos` — CRUD de grupos
- `/api/admin/grupos/:grupoId/alumnos` — Gestion de alumnos
- `/api/admin/calendario/actividad` — Gestion de actividades
- `/api/admin/calendario/semana` — Gestion de semanas
- `/api/admin/competencias` — CRUD de competencias
- `/api/admin/grupos/:grupoId/entrevistas` — Entrevistas
- `/api/admin/grupos/:grupoId/equipos` — Equipos
- `/api/admin/grupos/:grupoId/calificaciones` — Calificaciones

### Alumno (requieren rol alumno)

- `/api/alumno/grupos/:grupoId/malla` — Malla de actividades
- `/api/alumno/grupos/:grupoId/competencias` — Competencias del alumno
- `/api/alumno/grupos/:grupoId/plan-evaluacion` — Plan de evaluacion

---

## Produccion con PM2

### Arquitectura en produccion

En produccion, el servidor API sirve todo desde un solo proceso:

```
Puerto 3002
├── /parse          → Parse Server (BaaS)
├── /api/*          → REST API (Express)
├── /docs/*         → Docusaurus (archivos estaticos)
├── /*              → Frontend React/Vite (SPA)
└── /ejercicios, /laboratorios, /lecturas, etc. → Contenido legacy
```

### Paso 1: Instalar PM2 globalmente

```bash
npm install -g pm2
```

### Paso 2: Compilar el proyecto completo

Desde la raiz del monorepo:

```bash
# Instalar dependencias
yarn install

# Construir frontend (Vite), documentacion (Docusaurus) y API (TypeScript)
yarn build
```

Esto genera:
- `dist/` — Frontend compilado (HTML, JS, CSS)
- `dist/docs/` — Documentacion Docusaurus compilada
- `dist/ejercicios/`, `dist/laboratorios/`, etc. — Contenido legacy
- `packages/api/dist/` — API compilada (JavaScript)

### Paso 3: Configurar variables de entorno para produccion

Editar `packages/api/.env`:

```env
PORT=3002
NODE_ENV=production
DATABASE_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
APP_ID=<tu-app-id>
MASTER_KEY=<tu-master-key-segura>
PARSE_MOUNT=/parse
SERVER_URL=https://tu-dominio.com/parse
MAILERSEND_API_KEY=<tu-api-key>
EMAIL_FROM=no_reply@meeplab.com
EMAIL_FROM_NAME=TC2005B
FRONTEND_URL=https://tu-dominio.com
```

> **Importante:** `SERVER_URL` y `FRONTEND_URL` deben apuntar al dominio real en produccion.

### Paso 4: Crear archivo de configuracion PM2

Crear `packages/api/ecosystem.config.cjs` con la siguiente configuracion:

```javascript
module.exports = {
  apps: [
    {
      name: 'tc2005b-api',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
    },
  ],
};
```

### Paso 5: Configurar el servidor para servir archivos estaticos

Agregar middleware de archivos estaticos en `src/app.ts` para que el API sirva el frontend, Docusaurus y el contenido legacy. El orden es importante:

1. Las rutas `/api/*` y `/parse` se resuelven primero (ya configuradas)
2. `/docs` sirve la documentacion Docusaurus
3. El contenido legacy (`/ejercicios`, `/laboratorios`, etc.) se sirve como estatico
4. Todo lo demas cae al `index.html` del SPA (React Router)

```typescript
// En produccion, agregar despues de las rutas API:
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../../../dist');

  // Servir Docusaurus en /docs
  app.use('/docs', express.static(path.join(distPath, 'docs')));

  // Contenido legacy
  const legacyDirs = ['ejercicios', 'laboratorios', 'lecturas', 'documentos', 'imagenes', 'css', 'js'];
  for (const dir of legacyDirs) {
    app.use(`/${dir}`, express.static(path.join(distPath, dir)));
  }

  // Frontend SPA — servir archivos estaticos
  app.use(express.static(distPath));

  // SPA fallback — cualquier ruta no encontrada devuelve index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
```

### Paso 6: Iniciar con PM2

```bash
cd packages/api

# Iniciar la aplicacion
pm2 start ecosystem.config.cjs

# Verificar que esta corriendo
pm2 status

# Ver logs en tiempo real
pm2 logs tc2005b-api

# Monitorear recursos
pm2 monit
```

### Paso 7: Configurar inicio automatico

Para que PM2 reinicie la app automaticamente al reiniciar el servidor:

```bash
# Generar script de startup
pm2 startup

# Guardar la lista de procesos actual
pm2 save
```

---

## Comandos utiles de PM2

```bash
# Reiniciar la aplicacion
pm2 restart tc2005b-api

# Detener la aplicacion
pm2 stop tc2005b-api

# Eliminar del proceso de PM2
pm2 delete tc2005b-api

# Recargar sin downtime (0-downtime reload)
pm2 reload tc2005b-api

# Ver metricas detalladas
pm2 show tc2005b-api

# Limpiar logs
pm2 flush
```

---

## Despliegue (actualizaciones)

Para desplegar una nueva version:

```bash
# 1. Obtener los ultimos cambios
git pull origin main

# 2. Instalar dependencias (si cambiaron)
yarn install

# 3. Reconstruir todo
yarn build

# 4. Reiniciar el servidor
cd packages/api
pm2 restart tc2005b-api
```

---

## Notas tecnicas

- **Autenticacion:** Se usa un modelo `AppUser` personalizado (no `ParseUser`). Las contrasenas se hashean con `bcryptjs`.
- **Sesiones:** Token personalizado en `AppSession`, validado via header `x-session-token`.
- **ABAC:** Control de acceso basado en atributos con politicas almacenadas en la clase `Policy`.
- **Soft deletes:** Los registros nunca se eliminan fisicamente; se marcan con `active: false`.
- **Relaciones:** Todas las relaciones usan Parse Pointers (nunca strings).
- **Emails:** Enviados via MailerSend con plantillas HTML.
