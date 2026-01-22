# Sistema de Facturas - Cacao & Avocado

Backoffice privado para gestión de facturas con la marca de Cacao & Avocado.

## Stack Técnico

- **Framework**: Next.js 15 (App Router)
- **Auth + DB**: Supabase (Auth + Postgres)
- **PDF**: Generación HTML con impresión del navegador
- **Email**: Resend
- **UI**: React + CSS personalizado

## Configuración Inicial

### 1. Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```bash
# Supabase (obtén estos valores del dashboard de Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend (obtén la API key de resend.com)
RESEND_API_KEY=re_xxx

# URL de la app (para links en emails)
NEXT_PUBLIC_APP_URL=https://invoices.cacaoandavocado.co
```

### 2. Configurar Supabase

1. Ve al SQL Editor de Supabase
2. Ejecuta `supabase/migrations/001_initial_schema.sql`
3. Ejecuta `supabase/migrations/002_rls_policies.sql`

### 3. Crear Usuario Admin

En Supabase > Authentication > Users:
- Click "Add user"
- Email: `gustavo.ramirez@cacaoandavocado.co`
- Password: tu contraseña segura
- Marca "Auto Confirm User"

### 4. Instalar Dependencias

```bash
cd apps/invoices
npm install
```

### 5. Desarrollo Local

```bash
npm run dev
```

Abre http://localhost:3001

## Despliegue en Vercel

1. Crea un nuevo proyecto en Vercel
2. Conecta al repositorio
3. Configura:
   - **Root Directory**: `apps/invoices`
   - **Framework Preset**: Next.js
4. Agrega las variables de entorno de producción
5. En **Domains**, agrega `invoices.cacaoandavocado.co`

## Uso

### Flujo Básico

1. **Login**: Accede con tu email/password
2. **Crear Cliente**: Menú → Clientes → Nuevo Cliente
3. **Crear Factura**: Menú → Facturas → Nueva Factura
4. **Generar PDF**: En detalle → "Generar PDF"
5. **Enviar Email**: Click "Enviar por Email"
6. **Marcar Pagada**: Click "Marcar como Pagada"

### Enlace Público

Cada factura tiene un enlace público `/i/[token]` que puedes compartir con el cliente.

## Estructura de Archivos

```
apps/invoices/
├── src/
│   ├── app/
│   │   ├── (dashboard)/      # Páginas protegidas
│   │   ├── api/              # API routes
│   │   ├── i/[token]/        # Vista pública
│   │   └── login/            # Autenticación
│   ├── components/           # Componentes React
│   ├── i18n/                 # Traducciones
│   ├── lib/                  # Utilidades
│   └── styles/               # CSS
├── public/                   # Assets estáticos
└── supabase/migrations/      # SQL migrations
```
