# 🚀 MÓDULO DE CHAT - INSTALACIÓN Y CONFIGURACIÓN

## ✅ Archivos Creados

### 📁 Tipos y Utilidades
- ✅ `types/chat.types.js` - Definiciones de tipos con JSDoc
- ✅ `utils/chatHelpers.js` - Funciones helper (formateo, validación, avatares)

### 📁 Servicios (Capa de datos)
- ✅ `services/chat/ChatDatabase.js` - Gestor SQLite con CRUD completo
- ✅ `services/chat/ChatWebSocket.js` - Cliente Socket.IO para tiempo real
- ✅ `services/chat/ChatApiClient.js` - Cliente REST API (fallback)
- ✅ `services/chat/ChatService.js` - Orquestador principal

### 📁 Componentes UI
- ✅ `components/chat/MessageBubble.js` - Burbuja de mensaje con colas CSS
- ✅ `components/chat/ConversationItem.js` - Item de lista de conversación
- ✅ `components/chat/ChatModal.js` - Modal de conversación completo
- ✅ `components/chat/ContactsListModal.js` - Modal de selección de contactos

### 📁 Páginas
- ✅ `pages/Chat/Chat.js` - Página principal de mensajes

### 📁 Contextos
- ✅ `contexts/ChatCounterContext.js` - Contador de mensajes no leídos

### 📁 Modificaciones de archivos existentes
- ✅ `App.js` - Reemplazado Categories por Chat
- ✅ `components/NavInf/NavInf.js` - Reemplazado tab "Categorías" por "Mensajes" con badge

---

## 🔧 INSTALACIÓN DE DEPENDENCIAS

Ejecuta estos comandos en PowerShell desde la carpeta `Minymol`:

```powershell
# 1. Instalar expo-sqlite (versión 16.x para compatibilidad con Expo 54)
npm install expo-sqlite@16.0.8

# 2. Instalar socket.io-client (cliente WebSocket)
npm install socket.io-client@4.8.1

# 3. Instalar react-native-uuid (generación de IDs temporales)
npm install react-native-uuid@2.0.3
```

---

## 📱 CONFIGURACIÓN DEL PROYECTO

### 1. Pre-build de Android
Después de instalar las dependencias, necesitas hacer pre-build de Android porque expo-sqlite es una librería nativa:

```powershell
npx expo prebuild --platform android --clean
```

### 2. Rebuild de Android
```powershell
npx expo run:android
```

---

## 🎨 ASSET NECESARIO (Opcional)

Si quieres un fondo de imagen para el chat, crea:
- `assets/imgs/chat-background.png` (patrón sutil de fondo)

Por ahora no es necesario porque usamos fondo plano `#f5f5f5`.

---

## 🧪 TESTING

### Verificar que funciona:

1. **Inicialización del Chat**
   - Al abrir la app, verás logs detallados en la consola:
   ```
   ╔═══════════════════════════════════════════════════════════════╗
   ║  💬 INICIALIZANDO MÓDULO DE CHAT                             ║
   ╚═══════════════════════════════════════════════════════════════╝
   ```

2. **Conexión WebSocket**
   - Si el WebSocket conecta, verás:
   ```
   ✅ WEBSOCKET CONECTADO EXITOSAMENTE
   ```
   - Si falla, verá:
   ```
   ❌ ERROR DE CONEXIÓN WEBSOCKET
   📱 MODO FALLBACK ACTIVADO: El chat funcionará usando solo REST API
   ```

3. **Base de datos SQLite**
   - Se crea automáticamente: `minymol_chat.db`
   - Con tablas: `messages` y `conversations`

4. **Navegación**
   - Tap en el tab "Mensajes" (icono de chatbubbles)
   - Verás la lista de conversaciones o pantalla vacía
   - Badge naranja con contador de no leídos

5. **Nuevo chat**
   - Tap en FAB (+) o ícono de editar
   - Se abre modal con lista de proveedores
   - Buscar y seleccionar proveedor
   - Se abre chat vacío

6. **Enviar mensaje**
   - Escribir texto y tap en botón enviar
   - Mensaje aparece instantáneamente con ⏳ (optimista)
   - Cuando confirma servidor: ✓ (enviado)
   - Cuando llega al destinatario: ✓✓ (entregado)
   - Cuando lo lee: ✓✓ azul (leído)

---

## 🔍 TROUBLESHOOTING

### Error: "Can't find variable: io"
**Solución:** Falta instalar `socket.io-client`
```powershell
npm install socket.io-client@4.8.1
```

### Error: "expo-sqlite is not installed"
**Solución:** Falta instalar expo-sqlite y hacer prebuild
```powershell
npm install expo-sqlite@16.0.8
npx expo prebuild --platform android --clean
npx expo run:android
```

### Error: "uuid is not a function"
**Solución:** Falta instalar react-native-uuid
```powershell
npm install react-native-uuid@2.0.3
```

### WebSocket no conecta
**Diagnóstico:** Revisa los logs detallados en consola. Verás exactamente qué falla.
**Solución:** El chat seguirá funcionando usando REST API (fallback automático).

### No aparecen contactos
**Causa:** El endpoint `/chat/available-contacts` debe retornar proveedores con `typeOfPerson = 1`
**Solución:** Verifica que el backend retorna la estructura correcta.

### Mensajes no se guardan
**Causa:** Error en SQLite
**Solución:** Revisa logs, puede ser problema de permisos o espacio.

---

## 🚀 ENDPOINTS DEL BACKEND

Asegúrate de que tu backend implementa estos endpoints:

### WebSocket (wss://api.minymol.com)
- `connect` (con auth: { token, userId })
- Eventos emitidos:
  - `sendMessage` (enviar mensaje)
  - `markAsDelivered` (marcar como entregado)
  - `markAsRead` (marcar como leído)
- Eventos escuchados:
  - `receiveMessage` (mensaje nuevo)
  - `messageSent` (confirmación)
  - `messageDelivered` (entregado)
  - `messageRead` (leído)
  - `messageFailed` (error)

### REST API
- `GET /chat/available-contacts` - Lista de proveedores
- `GET /chat/conversations` - Lista de conversaciones
- `POST /chat/message` - Enviar mensaje (fallback)
- `GET /chat/history?otherUserId=X&page=Y&limit=Z` - Historial
- `GET /chat/unread-messages` - Mensajes no leídos
- `POST /chat/mark-delivered` - Marcar como entregado
- `POST /chat/mark-read` - Marcar como leído

---

## 📊 ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────┐
│                        CHAT PAGE                            │
│  (lista de conversaciones + FAB + modales)                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      CHAT SERVICE                           │
│  (orquestador: coordina WebSocket, REST, SQLite)           │
└──────┬──────────────────┬────────────────────┬──────────────┘
       │                  │                    │
       ▼                  ▼                    ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
│ WebSocket   │  │ REST API     │  │ SQLite Database  │
│ (tiempo     │  │ (fallback)   │  │ (persistencia)   │
│  real)      │  │              │  │                  │
└─────────────┘  └──────────────┘  └──────────────────┘
```

### Flujo de envío de mensaje:
1. Usuario escribe y toca "Enviar"
2. **UI Optimista:** Mensaje aparece inmediatamente con ⏳ (tempId)
3. **SQLite:** Se guarda en DB local
4. **WebSocket:** Intenta enviar por WebSocket
   - ✅ Si funciona: Espera confirmación del servidor
   - ❌ Si falla: Envía por REST API automáticamente
5. **Confirmación:** Servidor retorna ID real
6. **Update:** Se actualiza tempId → realId, estado ⏳ → ✓

### Flujo de recepción de mensaje:
1. **WebSocket:** Evento `receiveMessage` o **REST:** Polling/sync
2. **SQLite:** Se guarda en DB local
3. **UI:** Se notifica a componentes (listeners)
4. **Auto-read:** Si el chat está abierto, marca como leído automáticamente
5. **Badge:** Actualiza contador de no leídos en NavInf

---

## ✨ CARACTERÍSTICAS IMPLEMENTADAS

✅ **Mensajería en tiempo real** con WebSocket (Socket.IO)
✅ **Fallback automático** a REST API si WebSocket falla
✅ **UI Optimista** (mensajes aparecen instantáneamente)
✅ **Persistencia local** con SQLite (mensajes offline)
✅ **Estados de mensaje:** SENDING ⏳ → SENT ✓ → DELIVERED ✓✓ → READ ✓✓ (azul)
✅ **Contador de no leídos** con badge animado en navegación
✅ **Auto-marcado como leído** al abrir conversación
✅ **Búsqueda de contactos** con filtrado en tiempo real
✅ **Paginación** de mensajes (cargar más al scroll)
✅ **Sincronización automática** de mensajes no leídos
✅ **Reconexión automática** de WebSocket
✅ **Limpieza automática** de mensajes antiguos (>30 días)
✅ **Separadores de fecha** en conversaciones
✅ **Burbujas con colas CSS** (estilo moderno)
✅ **Avatares generados** (colores y letras iniciales)
✅ **Indicador de proveedor** (icono de tienda)
✅ **Animaciones suaves** (slide, bounce, fade)
✅ **Optimización de performance** (memo, throttle, singleton)

---

## 🎯 PRÓXIMOS PASOS

1. **Instalar dependencias** (comandos arriba)
2. **Prebuild Android** (expo prebuild)
3. **Correr app** (expo run:android)
4. **Probar funcionalidad básica:**
   - Abrir tab "Mensajes"
   - Crear nuevo chat
   - Enviar mensaje
   - Verificar estados (⏳ → ✓ → ✓✓)
5. **Verificar backend:**
   - Endpoints REST funcionando
   - WebSocket server activo (wss://api.minymol.com)

---

## 📝 NOTAS IMPORTANTES

- **Minoristas solo pueden chatear con Proveedores** (`typeOfPerson = 1`)
- **userData simple:** Solo { id, nombre } (sin proveedorInfo)
- **Colores Minymol:** Naranja `#fa7e17`, burbujas naranjas `#FFD4A3`
- **Tab reemplazado:** "Categorías" → "Mensajes" (categories → messages)
- **Singleton pattern:** Todos los servicios son instancias únicas
- **Logs detallados:** Toda la comunicación se logea con emojis para debug

---

## ✅ CHECKLIST FINAL

- [ ] Dependencias instaladas (expo-sqlite, socket.io-client, react-native-uuid)
- [ ] Prebuild de Android ejecutado
- [ ] App compilada sin errores
- [ ] Tab "Mensajes" visible en navegación
- [ ] Badge de contador funcional
- [ ] WebSocket conecta o fallback funciona
- [ ] SQLite crea tablas correctamente
- [ ] Envío de mensajes funciona
- [ ] Estados de mensaje se actualizan
- [ ] Contador de no leídos actualiza
- [ ] Modal de contactos muestra proveedores
- [ ] Modal de chat abre correctamente

---

## 🆘 SOPORTE

Si encuentras errores:
1. Revisa los logs detallados en consola (tienen emojis y formato)
2. Verifica que todas las dependencias estén instaladas
3. Confirma que el prebuild se ejecutó correctamente
4. Prueba el fallback REST API si WebSocket falla

**El sistema está diseñado para ser resiliente:** Si una parte falla, las demás siguen funcionando.

---

¡Listo! 🎉 El módulo de chat está completamente implementado y documentado.
