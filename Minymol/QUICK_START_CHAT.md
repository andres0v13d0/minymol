# 🚀 QUICK START - MÓDULO DE CHAT

## ⚡ Comandos para ejecutar AHORA

Abre PowerShell en la carpeta del proyecto y ejecuta estos comandos en orden:

### 1️⃣ Prebuild Android (genera archivos nativos para expo-sqlite)
```powershell
cd "c:\Users\Usuario\Documents\GitHub\minymol\Minymol"
npx expo prebuild --platform android --clean
```
⏱️ Esto tomará 1-2 minutos

---

### 2️⃣ Correr la App
```powershell
npx expo run:android
```
⏱️ Primera compilación: 3-5 minutos
⏱️ Siguientes: 30-60 segundos

---

## ✅ Verificación rápida

Una vez abierta la app:

1. **Ver logs en consola:**
   ```
   ╔═══════════════════════════════════════════════════════════════╗
   ║  💬 INICIALIZANDO MÓDULO DE CHAT                             ║
   ╚═══════════════════════════════════════════════════════════════╝
   ```

2. **Tocar tab "Mensajes"** (segundo desde la izquierda, icono 💬)

3. **Verificar:**
   - ✅ Badge naranja con número (si hay no leídos)
   - ✅ Lista de conversaciones o pantalla vacía
   - ✅ Botón FAB (+) en esquina inferior derecha

4. **Probar nuevo chat:**
   - Tocar FAB (+)
   - Buscar proveedor
   - Seleccionar
   - Enviar mensaje
   - Ver estado: ⏳ → ✓ → ✓✓

---

## 🔍 Si hay problemas

### WebSocket no conecta
✅ **Normal:** Verás en logs `⚠️ WEBSOCKET NO DISPONIBLE`
✅ **Solución:** Usa REST API (automático, sin hacer nada)
✅ **Chat funciona igual:** Solo sin tiempo real

### Error al compilar
```powershell
# Limpiar cache y rebuild
cd android
./gradlew clean
cd ..
npx expo run:android
```

### Error "module not found: socket.io-client"
```powershell
npm install socket.io-client@4.8.1
npx expo run:android
```

### Error "module not found: expo-sqlite"
```powershell
npm install expo-sqlite@16.0.8
npx expo prebuild --platform android --clean
npx expo run:android
```

---

## 📱 Resultado esperado

### Navegación inferior:
```
┌───────────────────────────────────────────────┐
│  [🏠 Inicio]  [💬 Mensajes 5]  [👤 Perfil]  [🛒 Carrito 2]  │
└───────────────────────────────────────────────┘
      └─ Badge naranja con contador de no leídos
```

### Pantalla de Mensajes:
```
╔══════════════════════════════════════════════╗
║  Mensajes                            [✏️]     ║
╠══════════════════════════════════════════════╣
║  🏪  Proveedor ABC                      💬 3  ║
║      Último mensaje aquí...                   ║
╟──────────────────────────────────────────────╢
║  🏪  Proveedor XYZ                            ║
║      Hola, necesito...                        ║
╟──────────────────────────────────────────────╢
║                                          [+]  ║
╚══════════════════════════════════════════════╝
                                           └─ FAB
```

---

## 🎯 Archivos importantes

### Logs detallados en:
- **Consola de Metro Bundler** (logs del chat con emojis)
- **Logcat Android** (logs nativos)

### Base de datos SQLite:
- **Ubicación:** `/data/data/com.minymol/databases/minymol_chat.db`
- **Tablas:** `messages`, `conversations`
- **Auto-creada** en primera ejecución

### Archivos modificados que puedes revisar:
1. `App.js` (líneas 13, 25, 43, 180)
2. `components/NavInf/NavInf.js` (líneas 6, 77-93, 147-157)

---

## 📊 Estados de mensaje

| Estado     | Icono | Significado                  |
|------------|-------|------------------------------|
| SENDING    | ⏳    | Enviando al servidor         |
| SENT       | ✓     | Servidor lo recibió          |
| DELIVERED  | ✓✓    | Llegó al destinatario        |
| READ       | ✓✓ 🔵  | Destinatario lo leyó (azul)  |
| FAILED     | ❌    | Error, reintentando          |

---

## 🆘 Contacto de soporte

Si después de seguir estos pasos hay problemas:

1. **Copia los logs** de la consola (tienen formato con ╔═══╗)
2. **Verifica que se instalaron las dependencias:**
   ```powershell
   npm list expo-sqlite socket.io-client react-native-uuid
   ```
3. **Confirma que se hizo prebuild:**
   ```powershell
   # Debe existir:
   ls android/app/build.gradle
   ```

---

¡Eso es todo! 🎉

**Solo ejecuta los 2 comandos de arriba** y tendrás el chat funcionando.
