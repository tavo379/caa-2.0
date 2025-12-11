# Guía de Deployment en Vercel - Cacao & Avocado

Esta guía te ayudará a publicar tu monorepo en Vercel paso a paso.

## Pre-requisitos

✅ Ya hemos configurado:
- `vercel.json` en la raíz
- `turbo.json` actualizado para Astro
- `astro.config.mjs` con soporte para URL de producción

## Variables de Entorno de Sanity

Primero, necesitarás obtener tus credenciales de Sanity. Deberías tener estas variables en tu archivo `.env` local:

- `SANITY_PROJECT_ID`
- `SANITY_DATASET` (ej: "production")
- `SANITY_API_VERSION` (ej: "2025-02-19")
- `SANITY_USE_CDN` (ej: "true")

## Opción 1: Deployment via Vercel Dashboard (Recomendado)

### Paso 1: Conectar tu Repositorio

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Inicia sesión o crea una cuenta si no tienes una
3. Haz clic en "Add New..." → "Project"
4. Selecciona tu proveedor de Git (GitHub, GitLab, o Bitbucket)
5. Encuentra y selecciona el repositorio `cacao-and-avocado`
6. Haz clic en "Import"

### Paso 2: Configurar el Proyecto

Vercel detectará automáticamente la configuración de `vercel.json`. Verifica que:

- **Framework Preset**: Other (o detectará automáticamente)
- **Root Directory**: `.` (debe estar en la raíz)
- **Build Command**: Se usará el de `vercel.json`
- **Output Directory**: Se usará el de `vercel.json`

### Paso 3: Configurar Variables de Entorno

En la sección "Environment Variables", agrega las siguientes variables:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `SANITY_PROJECT_ID` | Tu Project ID de Sanity | Production, Preview, Development |
| `SANITY_DATASET` | production | Production, Preview, Development |
| `SANITY_API_VERSION` | 2025-02-19 | Production, Preview, Development |
| `SANITY_USE_CDN` | true | Production, Preview, Development |
| `SITE_URL` | https://tu-dominio.vercel.app | Production |

> **Nota**: Después del primer deployment, Vercel te dará una URL (ej: `cacao-and-avocado.vercel.app`). Deberás agregar `SITE_URL` con esa URL completa incluyendo `https://`.

### Paso 4: Deploy

1. Haz clic en "Deploy"
2. Vercel comenzará a:
   - Clonar tu repositorio
   - Instalar dependencias
   - Ejecutar el build con Turborepo
   - Publicar el sitio

3. Espera a que el deployment termine (usualmente 2-5 minutos)

### Paso 5: Configurar SITE_URL

1. Una vez completado el deployment, copia la URL de producción
2. Ve a Settings → Environment Variables
3. Agrega o actualiza `SITE_URL` con la URL de producción:
   - Variable: `SITE_URL`
   - Value: `https://tu-proyecto.vercel.app`
   - Environments: Production
4. Haz un nuevo deployment (Deployments → ... → Redeploy)

## Opción 2: Deployment via Vercel CLI

### Paso 1: Instalar Vercel CLI

```bash
npm i -g vercel
```

### Paso 2: Login

```bash
vercel login
```

### Paso 3: Deploy a Preview

Desde la raíz de tu monorepo:

```bash
cd c:\Users\tavor\Desktop\cacao-and-avocado
vercel
```

Responde las preguntas:
- **Set up and deploy**: Yes
- **Which scope**: Selecciona tu cuenta
- **Link to existing project**: No
- **Project name**: cacao-and-avocado (o el que prefieras)
- **In which directory**: `./`
- **Override settings**: No

### Paso 4: Configurar Variables de Entorno

```bash
vercel env add SANITY_PROJECT_ID production
# Ingresa el valor cuando te lo pida

vercel env add SANITY_DATASET production
# Ingresa "production"

vercel env add SANITY_API_VERSION production
# Ingresa "2025-02-19"

vercel env add SANITY_USE_CDN production
# Ingresa "true"

vercel env add SITE_URL production
# Ingresa la URL que Vercel te dio (ej: https://cacao-and-avocado.vercel.app)
```

### Paso 5: Deploy a Production

```bash
vercel --prod
```

## Verificación Post-Deployment

Una vez completado el deployment:

### ✅ Verificar que el sitio cargue

Visita tu URL de Vercel y verifica que:
- La página de inicio carga correctamente
- No hay errores 404

### ✅ Verificar rutas i18n

Prueba las siguientes URLs:
- `https://tu-url.vercel.app/es/` (español)
- `https://tu-url.vercel.app/en/` (inglés)

### ✅ Verificar integración con Sanity

Si tienes contenido en Sanity:
- Visita páginas que usan contenido dinámico
- Verifica que el contenido se muestre correctamente

### ✅ Revisar Build Logs

1. En Vercel Dashboard → Deployments
2. Haz clic en el deployment más reciente
3. Revisa la pestaña "Building" para ver los logs
4. Asegúrate de que no haya errores o warnings críticos

## Configuración de Dominio Personalizado (Opcional)

Si tienes un dominio personalizado:

1. Ve a tu proyecto en Vercel → Settings → Domains
2. Haz clic en "Add"
3. Ingresa tu dominio (ej: `cacaoandavocado.com`)
4. Sigue las instrucciones para configurar los DNS:
   - Si usas un dominio apex (`cacaoandavocado.com`): Agrega un registro A
   - Si usas un subdominio (`www.cacaoandavocado.com`): Agrega un registro CNAME
5. Actualiza la variable de entorno `SITE_URL` con tu dominio personalizado
6. Haz un redeploy

## Deployments Automáticos

Vercel configurará automáticamente:
- ✅ **Production**: Cada push a la rama `main` o `master`
- ✅ **Preview**: Cada push a otras ramas o Pull Requests

## Troubleshooting

### El build falla

1. Verifica los logs en Vercel Dashboard
2. Asegúrate de que el build funcione localmente:
   ```bash
   npm run build
   ```
3. Verifica que todas las variables de entorno estén configuradas
4. Revisa que `vercel.json` esté en la raíz del repositorio

### El sitio muestra errores 404

1. Verifica que `outputDirectory` en `vercel.json` sea correcto: `/apps/web/dist`
2. Asegúrate de que Astro esté generando archivos en el directorio `dist`

### Contenido de Sanity no carga

1. Verifica que las variables de entorno de Sanity estén correctamente configuradas
2. Asegúrate de que `SANITY_PROJECT_ID` y `SANITY_DATASET` sean correctos
3. Verifica que tu dataset en Sanity tenga el modo de acceso público habilitado si es necesario

## Próximos Pasos

Después de un deployment exitoso:

1. ✅ Configura notificaciones de deployment (Integrations → Slack/Discord)
2. ✅ Habilita Analytics en Vercel (opcional)
3. ✅ Configura un dominio personalizado
4. ✅ Revisa y optimiza el performance con Vercel Speed Insights
