# Presupuestos App

Aplicación de control de gastos y presupuestos con funcionalidades PWA y sincronización con Supabase.

## 🌐 Aplicación Desplegada

- **URL Principal:** https://presupuestos-app-jdcubillos.vercel.app
- **URL de Producción:** https://presupuestos-agm4vy3qo-jdcubillos96-3708s-projects.vercel.app
- **Manifest:** https://presupuestos-app-jdcubillos.vercel.app/manifest.webmanifest
- **Service Worker:** https://presupuestos-app-jdcubillos.vercel.app/sw.js

## 🚀 Despliegue en Vercel

### Opción 1: Despliegue Automático (Recomendado)

1. **Sube tu código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/presupuestos-app.git
   git push -u origin main
   ```

2. **Conecta con Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Inicia sesión con tu cuenta de GitHub
   - Haz clic en "New Project"
   - Selecciona tu repositorio `presupuestos-app`
   - Vercel detectará automáticamente que es un proyecto Next.js

3. **Configura las variables de entorno:**
   - En la configuración del proyecto en Vercel, ve a "Settings" > "Environment Variables"
   - Añade las siguientes variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
     NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
     ```

4. **Despliega:**
   - Haz clic en "Deploy"
   - Vercel construirá y desplegará tu aplicación automáticamente

### Opción 2: Despliegue Manual con Vercel CLI

1. **Instala Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Inicia sesión:**
   ```bash
   vercel login
   ```

3. **Despliega:**
   ```bash
   vercel
   ```

4. **Para producción:**
   ```bash
   vercel --prod
   ```

## 📱 Generar APK

Una vez desplegada en Vercel, puedes generar un APK usando TWA (Trusted Web Activity):

### Requisitos:
- Android Studio con SDK instalado
- JDK 17
- Node.js

### Pasos:

1. **Instala Bubblewrap:**
   ```bash
   npm install -g @bubblewrap/cli
   ```

2. **Inicializa el proyecto TWA:**
   ```bash
   bubblewrap init --manifest=https://presupuestos-app-jdcubillos.vercel.app/manifest.webmanifest
   ```

3. **Construye el APK:**
   ```bash
   bubblewrap build
   ```

4. **Instala en tu dispositivo (modo debug):**
   ```bash
   bubblewrap install
   ```

5. **Para APK de release:**
   - Abre el proyecto en Android Studio
   - Ve a Build > Generate Signed Bundle/APK
   - Selecciona APK
   - Configura tu keystore
   - Construye el APK de release

## 🔧 Configuración de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ejecuta el script SQL en `scripts/sql/001_init.sql`
3. Configura Google OAuth en Authentication > Providers
4. Añade las variables de entorno en Vercel

## 📦 Scripts Disponibles

- `npm run dev` - Desarrollo local
- `npm run build` - Construir para producción
- `npm run start` - Iniciar servidor de producción
- `npm run lint` - Linting del código

## 📱 Funcionalidades PWA

- ✅ Instalación en dispositivos móviles
- ✅ Funcionamiento offline
- ✅ Sincronización con Supabase
- ✅ Compartir datos
- ✅ Exportar/Importar datos
- ✅ Editar y eliminar gastos
- ✅ Gestión de categorías y presupuestos

## 🔗 Enlaces Útiles

- **Dashboard de Vercel:** https://vercel.com/jdcubillos96-3708s-projects/presupuestos-app
- **Inspección de Deployments:** https://vercel.com/jdcubillos96-3708s-projects/presupuestos-app/9RLirp6bHnSQtsUBoSh5mSw8uw1i
