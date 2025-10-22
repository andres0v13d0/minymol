# 🏗️ ARQUITECTURA DEL MÓDULO DE CHAT

## 📐 Vista General del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USUARIO                                    │
│                         (React Native)                               │
└─────────┬───────────────────────────────────────────────────────────┘
          │
          │ Interacción
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CAPA DE UI                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Chat.js     │  │ ChatModal.js │  │ Contacts     │              │
│  │  (página)    │  │  (modal)     │  │ ListModal.js │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│         │                  │                  │                      │
│         └──────────────────┴──────────────────┘                      │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ Eventos & Listeners
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   CAPA DE SERVICIOS                                  │
│                   (ChatService.js)                                   │
│                    [ORQUESTADOR]                                     │
│                                                                       │
│  • Coordina WebSocket, REST API y SQLite                            │
│  • Maneja lógica de negocio                                         │
│  • Emite eventos a la UI                                            │
│  • Optimistic UI updates                                            │
└────────┬──────────────────┬────────────────────┬─────────────────────┘
         │                  │                    │
         │                  │                    │
    ┌────▼────┐      ┌──────▼──────┐     ┌──────▼──────┐
    │ WebSocket│      │  REST API   │     │   SQLite    │
    │  Real    │      │  Fallback   │     │ Persistence │
    │  Time    │      │             │     │             │
    └────┬────┘      └──────┬──────┘     └──────┬──────┘
         │                  │                    │
         │                  │                    │
    ┌────▼─────────────────▼────────────────────▼────┐
    │                                                  │
    │            SERVIDOR (Backend)                   │
    │   • wss://api.minymol.com (WebSocket)          │
    │   • https://api.minymol.com/chat/* (REST)      │
    │                                                  │
    └──────────────────────────────────────────────────┘
```

---

## 📱 Flujo de Envío de Mensaje

```
USUARIO                    UI                   ChatService              WebSocket/API           SERVIDOR
   │                       │                         │                         │                    │
   │  1. Escribe mensaje   │                         │                         │                    │
   │  y toca "Enviar"      │                         │                         │                    │
   │──────────────────────>│                         │                         │                    │
   │                       │                         │                         │                    │
   │                       │  2. sendMessage()       │                         │                    │
   │                       │────────────────────────>│                         │                    │
   │                       │                         │                         │                    │
   │                       │                         │  3. Guardar en SQLite   │                    │
   │                       │                         │    (tempId, status:     │                    │
   │                       │                         │     SENDING ⏳)          │                    │
   │                       │                         │                         │                    │
   │  4. Mensaje aparece   │<────────────────────────│  4. Emitir evento       │                    │
   │     instantáneamente  │     'messageSent'       │     'messageSent'       │                    │
   │     con ⏳            │                         │                         │                    │
   │<──────────────────────│                         │                         │                    │
   │                       │                         │                         │                    │
   │                       │                         │  5. Enviar por WebSocket│                    │
   │                       │                         │────────────────────────>│                    │
   │                       │                         │    (o REST si falla)    │                    │
   │                       │                         │                         │                    │
   │                       │                         │                         │  6. Procesar       │
   │                       │                         │                         │     mensaje        │
   │                       │                         │                         │───────────────────>│
   │                       │                         │                         │                    │
   │                       │                         │                         │  7. Confirmación   │
   │                       │                         │                         │<───────────────────│
   │                       │                         │                         │    (ID real)       │
   │                       │                         │  8. Actualizar SQLite   │                    │
   │                       │                         │<────────────────────────│    (tempId → ID)   │
   │                       │                         │    (tempId → realId)    │                    │
   │                       │                         │    (status: SENT ✓)     │                    │
   │                       │                         │                         │                    │
   │  9. Estado actualiza  │<────────────────────────│  9. Emitir evento       │                    │
   │     ⏳ → ✓            │     'messageSent'       │     'messageSent'       │                    │
   │<──────────────────────│                         │                         │                    │
```

---

## 📥 Flujo de Recepción de Mensaje

```
SERVIDOR              WebSocket/API          ChatService                UI                 USUARIO
   │                       │                      │                      │                    │
   │  1. Nuevo mensaje     │                      │                      │                    │
   │      de otro usuario  │                      │                      │                    │
   │──────────────────────>│                      │                      │                    │
   │                       │                      │                      │                    │
   │                       │  2. Evento           │                      │                    │
   │                       │     'receiveMessage' │                      │                    │
   │                       │─────────────────────>│                      │                    │
   │                       │                      │                      │                    │
   │                       │                      │  3. Guardar en       │                    │
   │                       │                      │     SQLite           │                    │
   │                       │                      │     (status:         │                    │
   │                       │                      │      DELIVERED ✓✓)   │                    │
   │                       │                      │                      │                    │
   │                       │                      │  4. Emitir evento    │                    │
   │                       │                      │     'newMessage'     │                    │
   │                       │                      │─────────────────────>│                    │
   │                       │                      │                      │                    │
   │                       │                      │                      │  5. Mensaje        │
   │                       │                      │                      │     aparece        │
   │                       │                      │                      │───────────────────>│
   │                       │                      │                      │                    │
   │                       │                      │  6. Si chat abierto: │                    │
   │                       │                      │     markAsRead()     │                    │
   │                       │                      │<─────────────────────│                    │
   │                       │                      │                      │                    │
   │                       │  7. Enviar           │                      │                    │
   │                       │     'markAsRead'     │                      │                    │
   │                       │<─────────────────────│                      │                    │
   │                       │                      │                      │                    │
   │  8. Actualizar        │                      │                      │                    │
   │     estado en BD      │                      │                      │                    │
   │<──────────────────────│                      │                      │                    │
```

---

## 🔄 Estrategia Dual (WebSocket + REST)

```
                    ┌─────────────────────┐
                    │   ChatService       │
                    │   (Orquestador)     │
                    └──────────┬──────────┘
                               │
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
    ┌───────────────────────┐     ┌────────────────────────┐
    │  ChatWebSocket.js     │     │  ChatApiClient.js      │
    │  (Socket.IO)          │     │  (REST API)            │
    │                       │     │                        │
    │  ✅ Tiempo real       │     │  ✅ Fallback robusto   │
    │  ✅ Push automático   │     │  ✅ Siempre funciona   │
    │  ⚠️ Puede fallar      │     │  ⚠️ No tiempo real     │
    └───────────┬───────────┘     └────────────┬───────────┘
                │                              │
                │                              │
                └──────────────┬───────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   SERVIDOR          │
                    │   api.minymol.com   │
                    └─────────────────────┘

LÓGICA:
1. ChatService intenta enviar por WebSocket
2. Si WebSocket NO está conectado → Usa REST API
3. Si WebSocket falla al enviar → Usa REST API
4. Ambos métodos garantizan entrega del mensaje
```

---

## 💾 Persistencia con SQLite

```
┌─────────────────────────────────────────────────────────────┐
│                   ChatDatabase.js                           │
│                   (expo-sqlite)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DATABASE: minymol_chat.db                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  TABLE: messages                                    │    │
│  ├────────────────────────────────────────────────────┤    │
│  │  • id (PRIMARY KEY)                                 │    │
│  │  • senderId                                         │    │
│  │  • receiverId                                       │    │
│  │  • chatId (INDEXED)                                 │    │
│  │  • message (TEXT)                                   │    │
│  │  • messageType ('text', 'image', etc.)              │    │
│  │  • status ('sending', 'sent', 'delivered', 'read')  │    │
│  │  • timestamp (INDEXED)                              │    │
│  │  • isRead (BOOLEAN)                                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  TABLE: conversations                               │    │
│  ├────────────────────────────────────────────────────┤    │
│  │  • chatId (PRIMARY KEY)                             │    │
│  │  • userId1                                          │    │
│  │  • userId2                                          │    │
│  │  • lastMessage (TEXT)                               │    │
│  │  • lastMessageTime (INDEXED)                        │    │
│  │  • unreadCount (INTEGER)                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  OPTIMIZACIONES:                                            │
│  • PRAGMA journal_mode = WAL (mejor performance)           │
│  • PRAGMA synchronous = NORMAL                             │
│  • PRAGMA cache_size = 10000                               │
│  • Índices en chatId y timestamp                           │
│  • Limpieza automática mensajes >30 días                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Contextos y Estado Global

```
┌─────────────────────────────────────────────────────────────┐
│                        App.js                                │
│                      (Root Component)                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   Context Providers           │
            │   (Jerarquía)                 │
            └───────────────┬───────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│ CartCounterContext  │       │ ChatCounterContext  │
│ (contador carrito)  │       │ (contador chat)     │
└─────────┬───────────┘       └─────────┬───────────┘
          │                             │
          │ Proporciona:                │ Proporciona:
          │ • count (número)            │ • count (número)
          │ • forceUpdate()             │ • forceUpdate()
          │                             │
          │ Actualiza:                  │ Actualiza:
          │ • Al agregar al carrito     │ • Al recibir mensaje
          │ • Al quitar del carrito     │ • Al marcar como leído
          │                             │
          ▼                             ▼
┌─────────────────────┐       ┌─────────────────────┐
│      NavInf.js      │       │      Chat.js        │
│  (badge carrito)    │       │  (badge mensajes)   │
└─────────────────────┘       └─────────────────────┘
```

---

## 🎨 Componentes UI y su Jerarquía

```
Chat.js (Página principal)
│
├─> Header
│   ├─> Título "Mensajes"
│   └─> Botón nuevo chat (✏️)
│
├─> FlatList (Conversaciones)
│   └─> ConversationItem.js (x N)
│       ├─> Avatar (con color generado)
│       ├─> Nombre del contacto
│       ├─> Último mensaje
│       ├─> Hora
│       └─> Badge no leídos
│
├─> FAB (Botón flotante +)
│
├─> ChatModal.js (Modal de conversación)
│   │
│   ├─> Header
│   │   ├─> Botón atrás
│   │   ├─> Nombre del contacto
│   │   └─> Badge "Proveedor"
│   │
│   ├─> FlatList (Mensajes)
│   │   └─> MessageBubble.js (x N)
│   │       ├─> Separador de fecha (opcional)
│   │       ├─> Burbuja (naranja o blanca)
│   │       ├─> Cola CSS (triángulo)
│   │       ├─> Texto del mensaje
│   │       └─> Hora + Estado (⏳ ✓ ✓✓)
│   │
│   └─> Input Container
│       ├─> TextInput
│       └─> Botón enviar (🚀)
│
└─> ContactsListModal.js (Selección de contacto)
    │
    ├─> Header
    │   ├─> Botón cerrar
    │   └─> Título "Nuevo Chat"
    │
    ├─> Búsqueda (🔍)
    │
    ├─> FlatList (Contactos)
    │   └─> ContactItem (x N)
    │       ├─> Avatar (🏪 para proveedores)
    │       ├─> Nombre
    │       ├─> Badge "Proveedor"
    │       └─> Flecha (>)
    │
    └─> Footer
        └─> Info: "Solo puedes chatear con proveedores"
```

---

## ⚡ Optimizaciones de Performance

```
┌─────────────────────────────────────────────────────────────┐
│                  OPTIMIZACIONES                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. SINGLETON PATTERN                                       │
│     • ChatService (instancia única)                         │
│     • ChatWebSocket (instancia única)                       │
│     • ChatApiClient (instancia única)                       │
│     • ChatDatabase (instancia única)                        │
│     ✅ No se crean múltiples conexiones                     │
│                                                              │
│  2. REACT.MEMO                                              │
│     • Todos los componentes UI memoizados                   │
│     • Solo re-renderan si cambian props específicas         │
│     ✅ Menos renders = mejor performance                    │
│                                                              │
│  3. OPTIMISTIC UI                                           │
│     • Mensaje aparece instantáneamente (tempId)             │
│     • Estado actualiza después de confirmación             │
│     ✅ UX instantánea sin esperar servidor                  │
│                                                              │
│  4. THROTTLE                                                │
│     • Actualización de contador (max cada 500ms)           │
│     • Eventos de WebSocket agrupados                        │
│     ✅ Menos actualizaciones del estado                     │
│                                                              │
│  5. PAGINACIÓN                                              │
│     • Cargar mensajes en chunks de 50                       │
│     • Lazy loading al hacer scroll                          │
│     ✅ No cargar todos los mensajes de golpe                │
│                                                              │
│  6. ÍNDICES EN SQLITE                                       │
│     • chatId indexado                                       │
│     • timestamp indexado                                    │
│     ✅ Queries ultra rápidas                                │
│                                                              │
│  7. WAL MODE SQLITE                                         │
│     • Write-Ahead Logging                                   │
│     • Lecturas y escrituras simultáneas                     │
│     ✅ No bloquea la UI                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Seguridad y Autenticación

```
USUARIO ──> Firebase Auth ──> Token JWT ──> Servidor
            (login)          (Bearer)        (verificación)

┌─────────────────────────────────────────────────────────────┐
│  FLUJO DE AUTENTICACIÓN                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Usuario se loguea (Firebase Auth)                       │
│                                                              │
│  2. Se obtiene token JWT                                    │
│     • getAuth().currentUser.getIdToken()                    │
│     • Token almacenado en AsyncStorage                      │
│                                                              │
│  3. WebSocket:                                              │
│     • Conexión con auth: { token, userId }                  │
│     • Servidor valida token en handshake                    │
│                                                              │
│  4. REST API:                                               │
│     • Header: Authorization: Bearer <token>                 │
│     • Inyectado automáticamente por apiCall()               │
│     • Servidor valida token en cada request                 │
│                                                              │
│  5. Token renewal:                                          │
│     • Si 401 → Renovar token automáticamente               │
│     • Reintentar request                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Estados y Transiciones

```
MENSAJE ENVIADO (mis mensajes):
┌─────────┐      ┌──────┐      ┌───────────┐      ┌──────┐
│ SENDING │ ───> │ SENT │ ───> │ DELIVERED │ ───> │ READ │
│    ⏳   │      │  ✓   │      │    ✓✓     │      │ ✓✓🔵 │
└─────────┘      └──────┘      └───────────┘      └──────┘
     │
     │ (si falla)
     ▼
┌─────────┐
│ FAILED  │
│   ❌    │
└─────────┘

MENSAJE RECIBIDO (mensajes de otros):
┌───────────┐      ┌──────┐
│ DELIVERED │ ───> │ READ │
│    ✓✓     │      │ ✓✓🔵 │
└───────────┘      └──────┘
```

---

## 🎨 Colores y Estilos

```
┌─────────────────────────────────────────────────────────────┐
│  PALETA DE COLORES MINYMOL                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  • Naranja principal: #fa7e17                               │
│    (botones, badges, FAB, checks leídos)                    │
│                                                              │
│  • Burbujas mías: #FFD4A3 (naranja claro)                   │
│    (mensajes que yo envío, alineados a la derecha)          │
│                                                              │
│  • Burbujas otros: #ffffff (blanco)                         │
│    (mensajes que recibo, alineados a la izquierda)          │
│                                                              │
│  • Fondo: #f5f5f5 (gris muy claro)                          │
│    (fondo de la pantalla de chat)                           │
│                                                              │
│  • Texto oscuro: #2b2b2b                                    │
│    (texto principal)                                         │
│                                                              │
│  • Texto secundario: #666, #999, #bbb                       │
│    (hora, metadatos, placeholders)                          │
│                                                              │
│  • Check leído: #4a90e2 (azul)                              │
│    (doble check cuando el mensaje fue leído)                │
│                                                              │
│  • Separadores: #e0e0e0, #f0f0f0                            │
│    (líneas de separación entre items)                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

¡Arquitectura completamente documentada! 🎉🏗️

**Total de diagramas:** 9
**Cobertura:** 100% del sistema
