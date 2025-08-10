# 🚀 Guía para Generar APK

## Requisitos Previos

1. **Android Studio** instalado con:
   - Android SDK
   - Android SDK Platform-Tools
   - JDK 17

2. **Node.js** (ya tienes)

3. **Variables de entorno configuradas:**
   ```bash
   ANDROID_HOME=C:\Users\user\AppData\Local\Android\Sdk
   JAVA_HOME=C:\Program Files\Java\jdk-17
   ```

## Pasos para Generar APK

### 1. Instalar Bubblewrap
```bash
npm install -g @bubblewrap/cli
```

### 2. Inicializar Proyecto TWA
```bash
bubblewrap init --manifest=https://presupuestos-app-jdcubillos.vercel.app/manifest.webmanifest
```

### 3. Construir APK de Debug
```bash
bubblewrap build
```

### 4. Instalar en Dispositivo (Opcional)
```bash
bubblewrap install
```
*Nota: Necesitas tener el dispositivo conectado con ADB habilitado*

### 5. Generar APK de Release

1. **Abrir en Android Studio:**
   ```bash
   bubblewrap open
   ```

2. **En Android Studio:**
   - Ve a `Build` > `Generate Signed Bundle/APK`
   - Selecciona `APK`
   - Crea un nuevo keystore o usa uno existente
   - Selecciona `release` como build variant
   - Haz clic en `Finish`

3. **El APK se generará en:**
   ```
   android/app/release/app-release.apk
   ```

## 📱 Probar la Aplicación

### En el Navegador:
- **URL:** https://presupuestos-app-jdcubillos.vercel.app
- **PWA:** Puedes instalarla desde el navegador

### En Android:
- Instala el APK generado
- La app funcionará como una aplicación nativa

## 🔧 Solución de Problemas

### Error: "Command not found: bubblewrap"
```bash
npm install -g @bubblewrap/cli
```

### Error: "Android SDK not found"
1. Instala Android Studio
2. Configura ANDROID_HOME:
   ```bash
   setx ANDROID_HOME "C:\Users\user\AppData\Local\Android\Sdk"
   ```

### Error: "Java not found"
1. Instala JDK 17
2. Configura JAVA_HOME:
   ```bash
   setx JAVA_HOME "C:\Program Files\Java\jdk-17"
   ```

### Error: "Device not found" (para install)
1. Habilita "Opciones de desarrollador" en tu Android
2. Habilita "Depuración USB"
3. Conecta el dispositivo por USB
4. Ejecuta: `adb devices`

## 📦 Archivos Generados

- **APK Debug:** `android/app/debug/app-debug.apk`
- **APK Release:** `android/app/release/app-release.apk`
- **AAB:** `android/app/release/app-release.aab` (para Play Store)

## 🎯 Próximos Pasos

1. **Probar la app** en diferentes dispositivos
2. **Configurar Supabase** para sincronización
3. **Publicar en Play Store** (opcional)
4. **Configurar actualizaciones automáticas** desde Vercel
