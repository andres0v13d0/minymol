# ⚠️ Notificaciones Push y Expo Go

## El Warning que estás viendo

```
ERROR  expo-notifications: Android Push notifications (remote notifications) 
functionality provided by expo-notifications was removed from Expo Go with 
the release of SDK 53. Use a development build instead of Expo Go.
```

## ¿Qué significa?

**Las notificaciones push ya NO funcionan en Expo Go desde el SDK 53.** 

Esto es una decisión de Expo para mejorar la estabilidad. Para usar notificaciones push necesitas crear un **Development Build** o un **APK de producción**.

---

## ✅ Soluciones

### Opción 1: Development Build (Recomendado para desarrollo)

```bash
# 1. Instalar EAS CLI (solo la primera vez)
npm install -g eas-cli

# 2. Login en EAS (solo la primera vez)
eas login

# 3. Configurar el proyecto (solo la primera vez)
eas build:configure

# 4. Crear el development build
eas build --profile development --platform android

# 5. Una vez listo, descarga e instala el APK
# Te dará un link para descargar
```

### Opción 2: Preview Build (Para testing)

```bash
# Crear un APK de preview (más rápido que production)
eas build --profile preview --platform android
```

### Opción 3: Production Build (Para publicar)

```bash
# Crear APK de producción
eas build --profile production --platform android
```

---

## 🚀 Pasos para probar notificaciones

### 1. Crear el Build

```bash
# Opción más rápida para desarrollo
eas build --profile development --platform android
```

### 2. Esperar el Build

El proceso tomará entre 5-15 minutos. Puedes ver el progreso en:
- La terminal
- [https://expo.dev/accounts/andres0v13d0/projects/minymol/builds](https://expo.dev/accounts/andres0v13d0/projects/minymol/builds)

### 3. Descargar e Instalar

Una vez completado:
1. EAS te dará un link para descargar el APK
2. Descarga el APK en tu teléfono Android
3. Habilita "Instalar de fuentes desconocidas" si es necesario
4. Instala el APK

### 4. Probar las Notificaciones

1. Abre la app instalada
2. Ve a Perfil → Configuración
3. Activa las notificaciones
4. El sistema te pedirá permisos
5. ¡Listo! Ya puedes recibir notificaciones

---

## 📱 Diferencias entre builds

| Build | Uso | Tiempo | Hot Reload |
|-------|-----|--------|------------|
| **Development** | Desarrollo diario | ~10 min | ✅ Sí (con expo-dev-client) |
| **Preview** | Testing antes de publicar | ~8 min | ❌ No |
| **Production** | Publicar en Play Store | ~12 min | ❌ No |

---

## 🔧 Configuración ya lista en tu proyecto

Tu `app.json` ya tiene todo configurado:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/favicon.png",
          "color": "#fa7e17"
        }
      ]
    ],
    "android": {
      "googleServicesFile": "./android/app/google-services.json",
      "permissions": [
        "android.permission.POST_NOTIFICATIONS"
      ]
    }
  }
}
```

---

## 🎯 Workflow recomendado

### Para desarrollo:

1. **Primera vez:**
   ```bash
   eas build --profile development --platform android
   ```

2. **Instala el APK** en tu dispositivo

3. **Desarrolla normalmente:**
   ```bash
   npx expo start --dev-client
   ```
   Escanea el QR con la app instalada (tendrás hot reload)

4. **Solo reconstruye** cuando:
   - Cambies configuración nativa
   - Agregues/quites plugins
   - Cambies permisos

### Para testing antes de publicar:

```bash
eas build --profile preview --platform android
```

### Para publicar:

```bash
eas build --profile production --platform android
```

---

## 🐛 Si tienes errores

### Error: "eas: command not found"
```bash
npm install -g eas-cli
```

### Error: "No está configurado EAS"
```bash
eas build:configure
```

### Error: "No hay google-services.json"
Ya lo tienes en `android/app/google-services.json` ✅

### Error al construir
1. Revisa los logs en la terminal
2. Revisa en [expo.dev](https://expo.dev)
3. Verifica que `app.json` esté correcto

---

## ⚡ Quick Start (Copiar y pegar)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar (si no lo has hecho)
eas build:configure

# Crear development build
eas build --profile development --platform android

# Espera ~10 minutos, descarga e instala el APK

# Luego desarrolla con hot reload
npx expo start --dev-client
```

---

## 📚 Recursos útiles

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Push Notifications](https://docs.expo.dev/push-notifications/overview/)

---

## 💡 Resumen

**Expo Go = No Notificaciones Push** ❌  
**EAS Build = Notificaciones Push funcionan** ✅

Es un paso adicional, pero necesario. Una vez tengas el development build instalado, podrás seguir desarrollando con hot reload como siempre, pero con notificaciones funcionando. 🚀
