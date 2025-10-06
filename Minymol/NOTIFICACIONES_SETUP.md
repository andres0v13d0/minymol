# Configuración de Notificaciones Push con FCM

## 📦 Instalación de Dependencias

Necesitas instalar las siguientes dependencias para que las notificaciones funcionen:

```bash
npx expo install expo-notifications expo-device
```

## 🔧 Configuración de Firebase

### 1. Google Services JSON

Ya tienes el archivo `google-services.json` en `android/app/google-services.json`. Este archivo contiene la configuración de Firebase para Android.

### 2. Verificar configuración en `app.json`

El archivo `app.json` ya está configurado con:
- Plugin de notificaciones
- Ruta al archivo `google-services.json`
- Permisos necesarios para Android

## 🚀 Construcción de la App

### Para desarrollo/pruebas (APK):

```bash
eas build:configure
eas build -p android --profile preview
```

### Para producción:

```bash
eas build -p android --profile production
```

## 📱 Características Implementadas

### 1. Hook de Notificaciones (`hooks/useNotifications.js`)

Este hook maneja:
- ✅ Solicitud de permisos de notificaciones
- ✅ Registro del token FCM
- ✅ Envío del token al backend
- ✅ Activación/desactivación de notificaciones
- ✅ Listeners para notificaciones recibidas

### 2. Pantalla de Configuración (`pages/Configuracion/Configuracion.js`)

Incluye:
- ✅ Toggle para activar/desactivar notificaciones
- ✅ Botón para cambiar contraseña
- ✅ Información de la app
- ✅ Enlaces a políticas y términos

### 3. Modal de Cambio de Contraseña (`components/ChangePasswordModal`)

Permite:
- ✅ Cambiar contraseña de forma segura
- ✅ Validación de contraseñas
- ✅ Verificación de contraseña actual

## 🔔 Cómo Funciona

### Activar Notificaciones:

1. Usuario va a Perfil → Configuración
2. Activa el toggle de "Notificaciones Push"
3. Se solicitan permisos al sistema
4. Se obtiene el token FCM
5. El token se envía al backend: `POST /push/register-token`
6. Se guarda en AsyncStorage que están activadas

### Desactivar Notificaciones:

1. Usuario desactiva el toggle
2. Se elimina la información local
3. Se notifica al backend: `POST /push/unregister-token`

## 🛠️ API Endpoints Necesarios

Tu backend debe tener estos endpoints:

### Registrar Token
```
POST https://api.minymol.com/push/register-token
Headers: Authorization: Bearer {token}
Body: {
  "fcmToken": "string",
  "userId": "number",
  "userType": "string" // 'comerciante', 'proveedor', 'admin'
}
```

### Desregistrar Token
```
POST https://api.minymol.com/push/unregister-token
Headers: Authorization: Bearer {token}
```

### Cambiar Contraseña
```
POST https://api.minymol.com/auth/change-password
Headers: Authorization: Bearer {token}
Body: {
  "currentPassword": "string",
  "newPassword": "string"
}
```

## 📝 Notas Importantes

1. **Google Services**: El archivo `google-services.json` ya está en la carpeta correcta
2. **Project ID**: El project ID de EAS (`fa331260-c87d-4a77-b708-31b53a5f11d3`) está en `useNotifications.js`
3. **Permisos**: Android 13+ requiere el permiso `POST_NOTIFICATIONS` (ya configurado)
4. **Dispositivos físicos**: Las notificaciones push solo funcionan en dispositivos reales, no en emuladores

## 🧪 Probar las Notificaciones

### En desarrollo:

1. Construye la app con `eas build -p android --profile preview`
2. Descarga e instala el APK en un dispositivo físico
3. Activa las notificaciones desde Configuración
4. Verifica en los logs que el token se obtuvo correctamente
5. Prueba enviando una notificación desde Firebase Console o tu backend

### Verificar token en logs:

```javascript
console.log('Token de notificación:', token);
```

## 🔐 Seguridad

- Los tokens FCM se almacenan de forma segura en AsyncStorage
- Las contraseñas se envían siempre por HTTPS
- El token de autenticación se incluye en todas las peticiones

## 🎨 Personalización

### Colores de notificaciones (Android):

En `app.json`:
```json
"color": "#fa7e17"
```

En `useNotifications.js`:
```javascript
lightColor: '#fa7e17'
```

### Icono de notificaciones:

Usa `./assets/favicon.png` o crea un icono específico para notificaciones.

## ✅ Checklist Final

Antes de lanzar a producción:

- [ ] Instalar dependencias: `expo-notifications` y `expo-device`
- [ ] Verificar que `google-services.json` esté en su lugar
- [ ] Construir con EAS Build (no con Expo Go)
- [ ] Probar en dispositivo físico
- [ ] Verificar que el backend recibe y guarda los tokens
- [ ] Probar envío de notificaciones desde el backend
- [ ] Probar cambio de contraseña
- [ ] Verificar que las notificaciones se desactivan correctamente

## 🆘 Troubleshooting

### "No se otorgaron permisos"
- Usuario debe aceptar manualmente en la configuración del sistema

### "Debe usar un dispositivo físico"
- Las notificaciones push no funcionan en emuladores

### "Error al activar notificaciones"
- Verificar que el backend esté disponible
- Verificar que el usuario esté autenticado
- Revisar los logs de consola para más detalles

## 📚 Recursos

- [Expo Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [EAS Build](https://docs.expo.dev/build/introduction/)
