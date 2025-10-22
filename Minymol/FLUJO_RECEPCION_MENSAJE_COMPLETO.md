# 📬 Flujo Completo de Recepción de Mensaje

Este documento explica paso a paso cómo funciona la recepción de un mensaje en el sistema de chat de Minymol Mayoristas, desde que llega del backend hasta que se muestra en la UI y se guarda en SQLite.

---

## 📋 Tabla de Contenidos

1. [Resumen General](#resumen-general)
2. [Paso 1: Backend Envía el Mensaje](#paso-1-backend-envía-el-mensaje)
3. [Paso 2: WebSocket Recibe el Evento](#paso-2-websocket-recibe-el-evento)
4. [Paso 3: Emisión a Listeners Internos](#paso-3-emisión-a-listeners-internos)
5. [Paso 4: ChatService Procesa el Mensaje](#paso-4-chatservice-procesa-el-mensaje)
6. [Paso 5: Enriquecimiento del Mensaje](#paso-5-enriquecimiento-del-mensaje)
7. [Paso 6: Guardar en SQLite](#paso-6-guardar-en-sqlite)
8. [Paso 7: Actualizar Conversación](#paso-7-actualizar-conversación)
9. [Paso 8: Notificar a la UI](#paso-8-notificar-a-la-ui)
10. [Paso 9: Renderizar en Pantalla](#paso-9-renderizar-en-pantalla)
11. [Paso 10: Marcar como Leído](#paso-10-marcar-como-leído)
12. [Flujo Visual Completo](#flujo-visual-completo)
13. [Sincronización REST API](#sincronización-rest-api)
14. [Debugging](#debugging)

---

## 🎯 Resumen General

### Dos Formas de Recibir Mensajes

El sistema soporta **dos estrategias** para recibir mensajes:

#### 1️⃣ **Tiempo Real (WebSocket)** - Preferido
```
Backend → Socket.IO emit('receiveMessage') → Cliente escucha → Muestra inmediatamente
```

✅ **Ventajas:**
- Instantáneo (< 100ms)
- No requiere polling
- Menor uso de datos
- Notificaciones en tiempo real

#### 2️⃣ **Sincronización (REST API)** - Fallback
```
Cliente → GET /chat/unread/:userId → Backend retorna mensajes → Cliente procesa
```

✅ **Ventajas:**
- Funciona sin WebSocket
- Recupera mensajes perdidos
- Útil al abrir la app

### Componentes Involucrados

| Componente | Archivo | Responsabilidad |
|------------|---------|-----------------|
| **Backend Socket.IO** | `server/socket` | Emitir evento `receiveMessage` |
| **WebSocket Client** | `ChatWebSocket.ts` | Escuchar evento WebSocket |
| **Service** | `ChatService.ts` | Procesar mensaje, coordinar |
| **Database** | `ChatDatabase.ts` | Guardar en SQLite |
| **UI Chat Modal** | `ChatModal.tsx` | Actualizar lista, marcar leído |
| **UI Conversaciones** | `ProviderMessagesScreen.tsx` | Actualizar contador |
| **Message Bubble** | `MessageBubble.tsx` | Renderizar mensaje |

---

## 📤 Paso 1: Backend Envía el Mensaje

### 📍 Ubicación: Backend (Node.js + Socket.IO)

### 1.1 Usuario A envía mensaje a Usuario B

```typescript
// server/socket/socket.controller.ts
socket.on('sendMessage', async (payload: SendMessagePayload) => {
    // Usuario A envió un mensaje a Usuario B
    
    console.log('📨 MENSAJE RECIBIDO PARA ENVIAR');
    console.log('   ├─ De (Usuario A):', payload.senderId);
    console.log('   ├─ Para (Usuario B):', payload.receiverId);
    console.log('   └─ Mensaje:', payload.message);

    try {
        // 1. Guardar en base de datos
        const savedMessage = await db.messages.create({
            data: {
                senderId: payload.senderId,      // Usuario A
                receiverId: payload.receiverId,  // Usuario B
                message: payload.message,
                messageType: payload.messageType,
                fileUrl: payload.fileUrl,
                isDelivered: false,
                isRead: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        console.log('💾 Mensaje guardado con ID:', savedMessage.id);

        // 2. Confirmar al REMITENTE (Usuario A)
        socket.emit('messageSent', {
            tempId: payload.tempId,
            message: savedMessage,
            status: 'sent',
            timestamp: new Date().toISOString()
        });

        console.log('✅ Confirmación enviada al remitente (Usuario A)');

        // 3. ENVIAR AL DESTINATARIO (Usuario B) ← AQUÍ EMPIEZA LA RECEPCIÓN
        const receiverSocketId = await redisClient.get(`user:${payload.receiverId}:socket`);
        
        if (receiverSocketId) {
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log('║  📬 ENVIANDO MENSAJE AL DESTINATARIO (WebSocket)              ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('📊 INFORMACIÓN:');
            console.log('   ├─ Destinatario (Usuario B):', payload.receiverId);
            console.log('   ├─ Socket ID:', receiverSocketId);
            console.log('   ├─ Mensaje ID:', savedMessage.id);
            console.log('   └─ Evento: receiveMessage');
            console.log('');

            // ENVIAR POR WEBSOCKET
            io.to(receiverSocketId).emit('receiveMessage', savedMessage);
            
            console.log('✅ Mensaje enviado por WebSocket');
            console.log('   └─ El cliente de Usuario B debería recibirlo ahora');
            console.log('');
        } else {
            console.log('');
            console.log('⚠️  DESTINATARIO DESCONECTADO');
            console.log('   ├─ Usuario B no está online');
            console.log('   ├─ Mensaje guardado en BD');
            console.log('   └─ Lo recibirá al sincronizar (REST API)');
            console.log('');
        }

    } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
        socket.emit('messageFailed', {
            tempId: payload.tempId,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
```

**🔍 ¿Qué pasa aquí?**
1. Usuario A envía un mensaje a Usuario B
2. Backend guarda el mensaje en la base de datos
3. Backend confirma a Usuario A (remitente)
4. Backend busca si Usuario B está conectado (en Redis)
5. Si está conectado → **Envía el mensaje por WebSocket**
6. Si NO está conectado → Usuario B lo recibirá al sincronizar

### 1.2 Estructura del Mensaje Enviado

```typescript
// Evento: receiveMessage
// Datos enviados al cliente de Usuario B:
{
    id: "67890",                              // ID real del servidor
    senderId: 123,                            // Usuario A (quien envió)
    receiverId: 456,                          // Usuario B (yo, quien recibe)
    message: "Hola, ¿cómo estás?",
    messageType: "TEXT",
    fileUrl: null,
    isDelivered: false,
    isRead: false,
    isDeleted: false,
    createdAt: "2025-10-22T14:30:00.000Z",
    updatedAt: "2025-10-22T14:30:00.000Z"
}
```

---

## 🔌 Paso 2: WebSocket Recibe el Evento

### 📍 Ubicación: `services/chat/ChatWebSocket.ts`

### 2.1 Listener Configurado

```typescript
// ChatWebSocket.ts
private setupSocketListeners(): void {
    if (!this.socket) return;

    // ... otros listeners ...

    // Escuchar MENSAJES NUEVOS recibidos
    this.socket.on('receiveMessage', (data: any) => {
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  📨 MENSAJE NUEVO RECIBIDO (WebSocket)                        ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('📊 DATOS DEL MENSAJE:');
        console.log('   ├─ ID:', data.id);
        console.log('   ├─ De (senderId):', data.senderId);
        console.log('   ├─ Para (receiverId):', data.receiverId);
        console.log('   ├─ Mensaje:', data.message.substring(0, 50) + '...');
        console.log('   ├─ Tipo:', data.messageType);
        console.log('   ├─ Timestamp:', data.createdAt);
        console.log('   └─ Socket ID:', this.socket?.id);
        console.log('');

        // Emitir a los listeners internos (ChatService)
        this.emit('newMessage', data);
        
        console.log('✅ Evento "newMessage" emitido a listeners internos');
        console.log('');
    });
}
```

**🔍 ¿Qué pasa aquí?**
1. El WebSocket está escuchando el evento `receiveMessage`
2. Cuando llega un mensaje, se ejecuta el callback
3. Se hace log de los datos recibidos
4. Se **emite** el evento `newMessage` a los listeners internos
5. El `ChatService` está escuchando este evento

### 2.2 Sistema de Eventos Internos

```typescript
// ChatWebSocket.ts
class ChatWebSocket {
    private listeners: Map<keyof WebSocketEvents, EventListener[]> = new Map();

    /**
     * Agregar listener para un evento
     */
    on<K extends keyof WebSocketEvents>(
        event: K,
        callback: (data: WebSocketEvents[K]) => void
    ): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        this.listeners.get(event)!.push(callback);
        
        console.log(`🎧 Listener registrado para evento: ${event}`);
    }

    /**
     * Emitir evento a los listeners
     */
    private emit<K extends keyof WebSocketEvents>(
        event: K,
        data: WebSocketEvents[K]
    ): void {
        const eventListeners = this.listeners.get(event);
        if (!eventListeners) return;

        console.log(`📢 Emitiendo evento "${event}" a ${eventListeners.length} listener(s)`);

        eventListeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Error en listener de ${event}:`, error);
            }
        });
    }
}
```

**🔍 ¿Qué pasa aquí?**
- Hay un sistema de **pub/sub** interno
- Otros componentes pueden registrar listeners con `.on()`
- Cuando llega un evento, se emite a todos los listeners registrados

---

## 🔗 Paso 3: Emisión a Listeners Internos

### 📍 Ubicación: `services/chat/ChatService.ts`

### 3.1 Registro del Listener en ChatService

```typescript
// ChatService.ts
async connectWebSocket(token: string): Promise<void> {
    if (!this.currentUserId) {
        console.error('❌ ChatService no está inicializado');
        return;
    }

    try {
        console.log('🔌 Conectando WebSocket...');
        
        ChatWebSocket.connect(token, this.currentUserId);

        // REGISTRAR LISTENER PARA MENSAJES NUEVOS
        ChatWebSocket.on('newMessage', async (message: Message) => {
            console.log('');
            console.log('📨 ChatService: Mensaje nuevo recibido del WebSocket');
            console.log('   └─ Procesando mensaje...');
            
            await this.handleIncomingMessage(message);
        });

        console.log('✅ Listener de mensajes nuevos registrado');

        // ... otros listeners ...

    } catch (error) {
        console.error('❌ Error conectando WebSocket:', error);
    }
}
```

**🔍 ¿Qué pasa aquí?**
1. Al conectar el WebSocket, se registra un listener
2. El listener escucha el evento `newMessage`
3. Cuando llega un mensaje, se llama a `handleIncomingMessage()`
4. Este método procesa el mensaje

---

## 🔄 Paso 4: ChatService Procesa el Mensaje

### 📍 Ubicación: `services/chat/ChatService.ts`

```typescript
/**
 * Manejar mensaje entrante (tiempo real)
 */
private async handleIncomingMessage(message: Message): Promise<void> {
    try {
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  🔄 PROCESANDO MENSAJE ENTRANTE                               ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('📋 MENSAJE RECIBIDO:');
        console.log('   ├─ ID:', message.id);
        console.log('   ├─ De:', message.senderId);
        console.log('   ├─ Para:', message.receiverId);
        console.log('   └─ Texto:', message.message.substring(0, 50) + '...');
        console.log('');

        // 1. ENRIQUECER mensaje con campos adicionales
        console.log('🔧 Enriqueciendo mensaje...');
        
        const enrichedMessage: Message = {
            ...message,
            chatId: ChatDatabase.generateChatId(message.senderId, message.receiverId),
            isSentByMe: message.senderId === this.currentUserId
        };

        console.log('   ├─ Chat ID generado:', enrichedMessage.chatId);
        console.log('   ├─ isSentByMe:', enrichedMessage.isSentByMe);
        console.log('   └─ Mensaje enriquecido ✅');
        console.log('');

        // 2. GUARDAR en SQLite
        console.log('💾 Guardando en SQLite...');
        
        await ChatDatabase.saveMessage(enrichedMessage);
        
        console.log('✅ Mensaje guardado en SQLite');
        console.log('');

        // 3. ACTUALIZAR conversación
        console.log('📝 Actualizando conversación...');
        
        await this.updateConversation(message.senderId, enrichedMessage);
        
        console.log('✅ Conversación actualizada');
        console.log('');

        console.log('✅ MENSAJE PROCESADO COMPLETAMENTE');
        console.log('   └─ Listo para mostrarse en UI');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error manejando mensaje entrante:', error);
    }
}
```

**🔍 ¿Qué pasa aquí?**
1. Se recibe el mensaje del WebSocket
2. Se **enriquece** con campos adicionales (`chatId`, `isSentByMe`)
3. Se **guarda** en SQLite
4. Se **actualiza** la conversación
5. El mensaje ya está listo para mostrarse

---

## ✨ Paso 5: Enriquecimiento del Mensaje

### Por qué es necesario enriquecer?

El mensaje que viene del backend **NO** tiene todos los campos que necesitamos en el cliente:

**Mensaje del Backend:**
```typescript
{
    id: "67890",
    senderId: 123,
    receiverId: 456,
    message: "Hola",
    messageType: "TEXT",
    fileUrl: null,
    isDelivered: false,
    isRead: false,
    createdAt: "2025-10-22T14:30:00.000Z",
    updatedAt: "2025-10-22T14:30:00.000Z"
    // ❌ Faltan: chatId, isSentByMe
}
```

**Mensaje Enriquecido:**
```typescript
{
    id: "67890",
    senderId: 123,
    receiverId: 456,
    message: "Hola",
    messageType: "TEXT",
    fileUrl: null,
    isDelivered: false,
    isRead: false,
    createdAt: "2025-10-22T14:30:00.000Z",
    updatedAt: "2025-10-22T14:30:00.000Z",
    chatId: "123-456",           // ✅ AGREGADO
    isSentByMe: false            // ✅ AGREGADO (porque senderId !== currentUserId)
}
```

### Generación del ChatID

```typescript
// ChatDatabase.ts
generateChatId(userId1: number, userId2: number): string {
    // Ordenar IDs para que siempre sea el mismo
    const sortedIds = [userId1, userId2].sort((a, b) => a - b);
    return `${sortedIds[0]}-${sortedIds[1]}`;
}

// Ejemplos:
// Usuario 5 con Usuario 3 → "3-5"
// Usuario 3 con Usuario 5 → "3-5" (mismo!)
// Usuario 100 con Usuario 50 → "50-100"
```

### Determinar isSentByMe

```typescript
// Si YO (currentUserId = 456) recibo un mensaje de Usuario 123:
isSentByMe: message.senderId === this.currentUserId
         // 123 === 456 → false ✅

// Si YO envío un mensaje (ya lo hice antes):
isSentByMe: message.senderId === this.currentUserId
         // 456 === 456 → true ✅
```

---

## 💾 Paso 6: Guardar en SQLite

### 📍 Ubicación: `services/chat/ChatDatabase.ts`

```typescript
/**
 * Guardar mensaje en SQLite
 */
async saveMessage(message: Message): Promise<void> {
    console.log('');
    console.log('💾 GUARDANDO MENSAJE EN SQLITE');
    console.log('   ├─ ID:', message.id);
    console.log('   ├─ Chat ID:', message.chatId);
    console.log('   ├─ Enviado por mí:', message.isSentByMe);
    console.log('   └─ Timestamp:', message.createdAt);

    const sql = `
        INSERT OR REPLACE INTO messages 
        (id, senderId, receiverId, message, messageType, fileUrl, 
         isDelivered, isRead, isDeleted, createdAt, updatedAt, chatId, isSentByMe, tempId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        message.id,                                      // ID real del servidor
        message.senderId,
        message.receiverId,
        message.message,
        message.messageType,
        message.fileUrl || null,
        message.isDelivered ? 1 : 0,
        message.isRead ? 1 : 0,
        message.isDeleted ? 1 : 0,
        new Date(message.createdAt).getTime(),           // Timestamp en ms
        new Date(message.updatedAt || message.createdAt).getTime(),
        message.chatId,
        message.isSentByMe ? 1 : 0,
        message.tempId || null                           // NULL para mensajes recibidos
    ];

    console.log('');
    console.log('📝 EJECUTANDO INSERT:');
    console.log('   └─ INSERT OR REPLACE INTO messages...');

    await this.execute(sql, params);

    console.log('');
    console.log('✅ MENSAJE GUARDADO EN SQLITE');
    console.log('   └─ Tabla: messages');
    console.log('');
}
```

**🔍 ¿Qué pasa aquí?**
1. Se construye una query SQL `INSERT OR REPLACE`
2. Se convierten los valores a formato SQLite:
   - Booleanos → 0 o 1
   - Fechas → Timestamps (milisegundos)
   - Null → NULL
3. Se ejecuta la query
4. El mensaje queda persistido en SQLite

### 📊 Estado en SQLite Después de Guardar

```sql
-- Tabla: messages
SELECT * FROM messages WHERE id = '67890';

-- Resultado:
id          = "67890"                    -- ID real del servidor
tempId      = NULL                       -- No es temporal (mensaje recibido)
senderId    = 123                        -- Usuario A (quien envió)
receiverId  = 456                        -- Usuario B (yo)
message     = "Hola, ¿cómo estás?"
messageType = "TEXT"
fileUrl     = NULL
isDelivered = 0                          -- Aún no marcado como entregado
isRead      = 0                          -- Aún no marcado como leído
isDeleted   = 0
createdAt   = 1729612800000              -- Timestamp
updatedAt   = 1729612800000
chatId      = "123-456"                  -- Chat entre Usuario 123 y 456
isSentByMe  = 0                          -- NO es mío (lo recibí)
```

---

## 📝 Paso 7: Actualizar Conversación

### 📍 Ubicación: `services/chat/ChatService.ts`

```typescript
/**
 * Actualizar información de conversación
 */
async updateConversation(otherUserId: number, lastMessage?: Message): Promise<void> {
    if (!this.currentUserId) return;

    try {
        console.log('');
        console.log('📝 ACTUALIZANDO CONVERSACIÓN');
        console.log('   ├─ Otro usuario:', otherUserId);
        console.log('   └─ Mi usuario:', this.currentUserId);

        const chatId = ChatDatabase.generateChatId(this.currentUserId, otherUserId);
        console.log('   ├─ Chat ID:', chatId);

        // Obtener conversación existente
        let conversation = await ChatDatabase.getConversation(chatId);

        // Si no hay último mensaje, obtenerlo de la BD
        if (!lastMessage) {
            const messages = await ChatDatabase.getMessages(chatId, 0, 1);
            lastMessage = messages[0];
        }

        console.log('   ├─ Último mensaje ID:', lastMessage?.id);

        // Contar mensajes no leídos
        const unreadCount = await ChatDatabase.getUnreadCount(chatId);
        console.log('   ├─ Mensajes no leídos:', unreadCount);

        if (!conversation) {
            // Crear nueva conversación si no existe
            console.log('   └─ Creando nueva conversación...');
            
            conversation = {
                chatId,
                otherUserId,
                otherUserName: `Usuario ${otherUserId}`,  // Placeholder
                lastMessageId: lastMessage?.id,
                lastMessageText: lastMessage?.message || '',
                lastMessageTime: lastMessage?.createdAt,
                unreadCount,
                updatedAt: new Date().toISOString()
            };
        } else {
            // Actualizar conversación existente
            console.log('   └─ Actualizando conversación existente...');
            
            conversation = {
                ...conversation,
                lastMessageId: lastMessage?.id,
                lastMessageText: lastMessage?.message || '',
                lastMessageTime: lastMessage?.createdAt,
                unreadCount,
                updatedAt: new Date().toISOString()
            };
        }

        await ChatDatabase.saveConversation(conversation);
        
        console.log('');
        console.log('✅ CONVERSACIÓN ACTUALIZADA');
        console.log('   ├─ Último mensaje:', conversation.lastMessageText?.substring(0, 30) + '...');
        console.log('   ├─ No leídos:', conversation.unreadCount);
        console.log('   └─ Actualizada:', conversation.updatedAt);
        console.log('');

    } catch (error) {
        console.error('❌ Error actualizando conversación:', error);
    }
}
```

**🔍 ¿Qué pasa aquí?**
1. Se genera el `chatId`
2. Se obtiene la conversación existente (si existe)
3. Se cuenta los mensajes no leídos
4. Se actualiza con el último mensaje
5. Se guarda en SQLite

### 📊 Estado en SQLite - Tabla Conversations

```sql
-- Tabla: conversations
SELECT * FROM conversations WHERE chatId = '123-456';

-- Resultado:
chatId          = "123-456"
otherUserId     = 123                        -- Usuario A (con quien estoy hablando)
otherUserName   = "Proveedor ABC"
otherUserPhone  = "+573001234567"
otherUserLogoUrl= "https://..."
otherUserRole   = "proveedor"
lastMessageId   = "67890"                    -- ID del mensaje que acabo de recibir
lastMessageText = "Hola, ¿cómo estás?"      -- Texto del mensaje
lastMessageTime = 1729612800000              -- Timestamp
unreadCount     = 1                          -- ✅ Incrementó porque NO lo he leído
updatedAt       = 1729612800500              -- Timestamp de actualización
```

---

## 📱 Paso 8: Notificar a la UI

### 📍 Ubicación: `components/chat/ChatModal.tsx`

### 8.1 Listener del Evento en UI

```typescript
// ChatModal.tsx
useEffect(() => {
    if (visible) {
        // ... código de inicialización ...

        // ESCUCHAR MENSAJES NUEVOS EN TIEMPO REAL
        messageListenerRef.current = ChatWebSocket.on('newMessage', handleNewMessage);

        return () => {
            if (messageListenerRef.current) {
                ChatWebSocket.off('newMessage', messageListenerRef.current);
            }
        };
    }
}, [visible]);
```

### 8.2 Handler del Mensaje Nuevo

```typescript
const handleNewMessage = async (newMessage: Message) => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  📱 UI: MENSAJE NUEVO RECIBIDO                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('🔍 VERIFICANDO MENSAJE:');
    console.log('   ├─ De:', newMessage.senderId);
    console.log('   ├─ Para:', newMessage.receiverId);
    console.log('   ├─ Chat actual:', otherUserId);
    console.log('   └─ ¿Es de este chat?:', 
        newMessage.senderId === otherUserId || newMessage.receiverId === otherUserId
    );
    console.log('');

    // Solo procesar si es de este chat
    if (newMessage.senderId === otherUserId || newMessage.receiverId === otherUserId) {
        console.log('✅ El mensaje pertenece a este chat');
        console.log('');
        console.log('📝 AGREGANDO A LA LISTA...');

        // Agregar al principio de la lista (lista invertida)
        setMessages(prev => [newMessage, ...prev]);
        
        console.log('✅ Mensaje agregado a la UI');
        console.log('');

        // Si recibo un mensaje de este usuario, marcar como leído
        if (newMessage.senderId === otherUserId) {
            console.log('👁️ Marcando como leído...');
            console.log('   (porque estoy viendo el chat)');
            console.log('');

            // Marcar en BD local
            await ChatService.markAsRead(otherUserId);

            // Notificar via WebSocket al remitente
            const currentUserId = ChatService.getCurrentUserId();
            if (currentUserId) {
                // Primero marcar como entregado
                ChatWebSocket.markAsDelivered(otherUserId, currentUserId);
                
                // Luego marcar como leído
                ChatWebSocket.markAsRead(otherUserId, currentUserId);
            }

            console.log('✅ Mensaje marcado como leído');
            console.log('   └─ El remitente verá checks azules 👁️');
            console.log('');
        }
    } else {
        console.log('⚠️  El mensaje NO es de este chat, ignorando');
        console.log('');
    }
};
```

**🔍 ¿Qué pasa aquí?**
1. La UI escucha el evento `newMessage` del WebSocket
2. Cuando llega un mensaje, se verifica si es del chat actual
3. Si es del chat actual:
   - Se agrega a la lista de mensajes (`setMessages`)
   - React re-renderiza automáticamente
   - Si soy el receptor, se marca como leído
4. Si NO es del chat actual, se ignora (ya está guardado en SQLite)

### 8.3 Actualización de State

```typescript
// Antes de recibir el mensaje:
const [messages, setMessages] = useState<Message[]>([
    // Mensajes anteriores...
]);

// Después de recibir el mensaje:
setMessages(prev => [newMessage, ...prev]);
//                   ↑ Nuevo mensaje al principio
//                     (porque la lista está invertida)
```

**Resultado:**
```typescript
messages = [
    {
        id: "67890",           // ← NUEVO MENSAJE
        senderId: 123,
        receiverId: 456,
        message: "Hola, ¿cómo estás?",
        isSentByMe: false,
        // ...
    },
    {
        id: "67889",           // Mensaje anterior
        // ...
    },
    // ... más mensajes anteriores
]
```

---

## 🎨 Paso 9: Renderizar en Pantalla

### 📍 Ubicación: `components/chat/ChatModal.tsx` + `MessageBubble.tsx`

### 9.1 FlatList Renderiza los Mensajes

```typescript
// ChatModal.tsx
<FlatList
    ref={flatListRef}
    data={messages}  // ← Array con el nuevo mensaje
    keyExtractor={(item) => item.id || item.tempId || `${item.createdAt}`}
    renderItem={renderMessage}  // ← Función de renderizado
    inverted  // ← Lista invertida (más recientes arriba)
    // ...
/>

const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    // Verificar si mostrar separador de fecha
    const showDate = index === messages.length - 1 ||
        !isSameDay(item.createdAt, messages[index + 1]?.createdAt);

    return <MessageBubble message={item} showDate={showDate} />;
};
```

### 9.2 MessageBubble Renderiza el Mensaje

```tsx
// MessageBubble.tsx
const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showDate = false }) => {
    const isMe = message.isSentByMe;  // false (mensaje recibido)
    const time = formatBubbleTime(message.createdAt);  // "2:30 PM"

    return (
        <View style={styles.container}>
            {/* Separador de fecha (si es necesario) */}
            {showDate && (
                <View style={styles.dateSeparator}>
                    <Text style={styles.dateSeparatorText}>
                        {formatDateSeparator(message.createdAt)}  // "Hoy", "Ayer", etc.
                    </Text>
                </View>
            )}

            {/* Burbuja de mensaje */}
            <View style={[
                styles.bubbleContainer,
                isMe ? styles.myBubbleContainer : styles.otherBubbleContainer
                //     ❌ NO es mío                ✅ Del otro usuario
            ]}>
                {/* Cola izquierda (mensajes de otros) */}
                {!isMe && <View style={styles.tailLeft} />}
                
                <View style={[
                    styles.bubble,
                    isMe ? styles.myBubble : styles.otherBubble
                    //     ❌                ✅ Burbuja blanca
                ]}>
                    {/* Texto del mensaje */}
                    <Text style={[
                        styles.messageText,
                        isMe ? styles.myMessageText : styles.otherMessageText
                    ]}>
                        {message.message}  {/* "Hola, ¿cómo estás?" */}
                    </Text>

                    {/* Footer: hora */}
                    <View style={styles.footer}>
                        <Text style={styles.timeText}>
                            {time}  {/* "2:30 PM" */}
                        </Text>
                        
                        {/* NO mostrar checks (no es mi mensaje) */}
                    </View>
                </View>
            </View>
        </View>
    );
};
```

### 9.3 Estilos Aplicados

**Para mensajes RECIBIDOS:**
```typescript
const styles = StyleSheet.create({
    otherBubbleContainer: {
        justifyContent: 'flex-start',  // ← Alineado a la izquierda
    },
    otherBubble: {
        backgroundColor: '#ffffff',     // ← Fondo blanco
        borderTopRightRadius: 8,
        borderTopLeftRadius: 8,
        borderBottomRightRadius: 8,
        borderBottomLeftRadius: 0,      // ← Sin esquina (para cola)
    },
    tailLeft: {
        position: 'absolute',
        left: -8,                       // ← Cola del lado izquierdo
        bottom: 0,
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderRightWidth: 10,
        borderBottomWidth: 15,
        borderRightColor: '#ffffff',    // ← Color de la burbuja
        borderBottomColor: 'transparent',
    },
});
```

**Resultado Visual:**
```
┌─────────────────────────────────────────┐
│                                         │
│    ┌─────────────────────┐              │
│   ◀│ Hola, ¿cómo estás?  │              │
│    │                     │              │
│    │              2:30 PM│              │
│    └─────────────────────┘              │
│     ↑ Burbuja blanca                    │
│     ↑ Cola izquierda                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## ✅ Paso 10: Marcar como Leído

### 10.1 Marcar en SQLite Local

```typescript
// ChatService.ts
async markAsRead(otherUserId: number): Promise<void> {
    if (!this.currentUserId) return;

    try {
        console.log('');
        console.log('👁️ MARCANDO MENSAJES COMO LEÍDOS');
        console.log('   ├─ Otro usuario:', otherUserId);
        console.log('   └─ Chat con este usuario');

        const chatId = ChatDatabase.generateChatId(this.currentUserId, otherUserId);

        // Marcar en SQLite
        await ChatDatabase.markChatAsRead(chatId);

        console.log('✅ Mensajes marcados como leídos en SQLite');

        // Actualizar contador en conversación
        await ChatDatabase.updateUnreadCount(chatId);

        console.log('✅ Contador de no leídos actualizado');
        console.log('');
    } catch (error) {
        console.error('❌ Error marcando como leído:', error);
    }
}
```

```typescript
// ChatDatabase.ts
async markChatAsRead(chatId: string): Promise<void> {
    console.log('💾 UPDATE en SQLite:');
    console.log('   └─ Marcando mensajes como leídos...');

    const sql = `
        UPDATE messages 
        SET isRead = 1 
        WHERE chatId = ? 
          AND isSentByMe = 0    -- Solo mensajes recibidos
          AND isRead = 0        -- Solo los que NO están leídos
    `;
    
    await this.execute(sql, [chatId]);

    console.log('✅ UPDATE ejecutado');
}
```

### 10.2 Notificar al Remitente (WebSocket)

```typescript
// ChatModal.tsx - handleNewMessage()
if (newMessage.senderId === otherUserId) {
    // Notificar via WebSocket
    const currentUserId = ChatService.getCurrentUserId();
    if (currentUserId) {
        console.log('📡 Notificando al remitente...');

        // 1. Marcar como ENTREGADO
        ChatWebSocket.markAsDelivered(otherUserId, currentUserId);
        
        // 2. Marcar como LEÍDO
        ChatWebSocket.markAsRead(otherUserId, currentUserId);

        console.log('✅ Notificaciones enviadas');
    }
}
```

```typescript
// ChatWebSocket.ts
markAsRead(senderId: number, receiverId: number): boolean {
    if (!this.isConnected()) {
        return false;
    }

    try {
        console.log('📬 emit("markAsRead")');
        console.log('   ├─ senderId:', senderId);     // Usuario A (quien envió)
        console.log('   └─ receiverId:', receiverId); // Usuario B (yo, quien leyó)

        this.socket!.emit('markAsRead', { senderId, receiverId });
        
        return true;
    } catch (error) {
        console.log('❌ Error:', error);
        return false;
    }
}
```

### 10.3 Backend Procesa y Notifica

```typescript
// Backend - socket.controller.ts
socket.on('markAsRead', async (data: { senderId: number; receiverId: number }) => {
    console.log('👁️ Marcar como leído:');
    console.log('   ├─ Sender:', data.senderId);
    console.log('   └─ Receiver:', data.receiverId);

    try {
        // Actualizar en base de datos
        await db.messages.updateMany({
            where: {
                senderId: data.senderId,
                receiverId: data.receiverId,
                isRead: false
            },
            data: {
                isRead: true,
                updatedAt: new Date()
            }
        });

        // Notificar al remitente (Usuario A)
        const senderSocketId = await redisClient.get(`user:${data.senderId}:socket`);
        
        if (senderSocketId) {
            io.to(senderSocketId).emit('messageRead', {
                receiverId: data.receiverId,
                status: 'read',
                timestamp: new Date().toISOString()
            });

            console.log('✅ Remitente notificado (verá checks azules)');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
});
```

### 10.4 Usuario A Recibe la Notificación

```typescript
// ChatModal.tsx (Usuario A - quien envió el mensaje)
const handleMessageRead = async (update: MessageStatusUpdate) => {
    // Solo actualizar si soy el remitente
    if (update.receiverId === otherUserId) {
        console.log('👁️ Mis mensajes fueron leídos');

        setMessages(prev => prev.map(msg => {
            if (msg.isSentByMe && msg.receiverId === otherUserId && !msg.isRead) {
                return { 
                    ...msg, 
                    isDelivered: true,
                    isRead: true      // ← Marcar como leído
                };
            }
            return msg;
        }));

        console.log('✅ UI actualizada con checks azules');
    }
};
```

---

## 🔄 Flujo Visual Completo

### Diagrama de Secuencia

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│Usuario A│  │Backend  │  │WebSocket│  │ChatServ │  │SQLite   │  │Usuario B│
│(Envía)  │  │Socket.IO│  │Client   │  │         │  │         │  │(Recibe) │
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     │            │            │            │            │            │
     │ 1. Envía   │            │            │            │            │
     │  mensaje   │            │            │            │            │
     │───────────>│            │            │            │            │
     │            │            │            │            │            │
     │            │ 2. Guarda  │            │            │            │
     │            │    en BD   │            │            │            │
     │            │            │            │            │            │
     │            │ 3. Busca   │            │            │            │
     │            │   socketId │            │            │            │
     │            │   Usuario B│            │            │            │
     │            │            │            │            │            │
     │            │ 4. emit('receiveMessage')            │            │
     │            │────────────────────────>│            │            │
     │            │                         │            │            │
     │            │                         │ 5. on('receiveMessage') │
     │            │                         │            │            │
     │            │                         │ 6. emit('newMessage')   │
     │            │                         │───────────>│            │
     │            │                         │            │            │
     │            │                         │            │ 7. Enriquecer
     │            │                         │            │    mensaje │
     │            │                         │            │            │
     │            │                         │            │ 8. saveMsg │
     │            │                         │            │───────────>│
     │            │                         │            │            │
     │            │                         │            │            │ INSERT
     │            │                         │            │<───────────│
     │            │                         │            │            │
     │            │                         │            │ 9. updateConv
     │            │                         │            │───────────>│
     │            │                         │            │            │
     │            │                         │            │<───────────│
     │            │                         │            │            │
     │            │                         │ 10. Notificar UI        │
     │            │                         │────────────────────────>│
     │            │                         │            │            │
     │            │                         │            │            │ 11. setMessages
     │            │                         │            │            │     (agregar)
     │            │                         │            │            │
     │            │                         │            │            │ 12. React
     │            │                         │            │            │     re-render
     │            │                         │            │            │
     │            │                         │            │            │ 13. Muestra
     │            │                         │            │            │     burbuja
     │            │                         │            │            │     blanca ⬜
     │            │                         │            │            │
     │            │                         │            │ 14. markAsRead
     │            │                         │            │<───────────│
     │            │                         │            │            │
     │            │                         │ 15. emit('markAsRead')  │
     │            │                         │<────────────────────────│
     │            │                         │            │            │
     │            │ 16. on('markAsRead')    │            │            │
     │            │<────────────────────────│            │            │
     │            │                         │            │            │
     │            │ 17. UPDATE BD           │            │            │
     │            │    (isRead=true)        │            │            │
     │            │                         │            │            │
     │            │ 18. emit('messageRead') │            │            │
     │            │────────────────────────>│            │            │
     │            │                         │            │            │
     │ 19. on('messageRead')                │            │            │
     │<────────────────────────────────────────────────────────────────
     │            │                         │            │            │
     │ 20. Actualiza│                       │            │            │
     │     checks  │                       │            │            │
     │     azules 👁│                       │            │            │
     │            │                         │            │            │
```

### Timeline con Tiempos Aproximados

| Tiempo | Evento | Actor | Descripción |
|--------|--------|-------|-------------|
| `t=0ms` | Usuario A envía | Backend | Mensaje guardado en BD |
| `t=50ms` | Backend busca socketId | Backend | Consulta Redis |
| `t=60ms` | emit('receiveMessage') | Backend | Envía por WebSocket |
| `t=80ms` | on('receiveMessage') | WebSocket Client | Recibe evento |
| `t=85ms` | emit('newMessage') | WebSocket Client | Notifica a ChatService |
| `t=90ms` | handleIncomingMessage() | ChatService | Procesa mensaje |
| `t=95ms` | Enriquecer mensaje | ChatService | Agrega chatId, isSentByMe |
| `t=100ms` | INSERT SQLite | SQLite | Guarda mensaje |
| `t=110ms` | UPDATE conversación | SQLite | Actualiza última actividad |
| `t=120ms` | Notificar UI | ChatModal | Llama a handleNewMessage |
| `t=125ms` | setMessages() | React | Agrega a la lista |
| `t=130ms` | Re-render | React | Renderiza MessageBubble |
| `t=140ms` | **Usuario B ve el mensaje** | UI | ⬜ Burbuja blanca visible |
| `t=150ms` | markAsRead() | ChatService | Marca en SQLite |
| `t=160ms` | emit('markAsRead') | WebSocket | Notifica al backend |
| `t=180ms` | on('markAsRead') | Backend | Actualiza BD |
| `t=200ms` | emit('messageRead') | Backend | Notifica a Usuario A |
| `t=220ms` | on('messageRead') | Usuario A | Actualiza UI |
| `t=230ms` | **Usuario A ve checks azules** | UI | 👁️ Mensaje leído |

---

## 🔄 Sincronización REST API (Alternativa)

Si el WebSocket **NO** está disponible, los mensajes se obtienen por polling:

### Cuando Usuario B Abre el Chat

```typescript
// ChatModal.tsx - initializeChat()
const initializeChat = async () => {
    try {
        setLoading(true);

        // 1. Cargar mensajes locales INMEDIATAMENTE
        const localMessages = await ChatService.getMessages(otherUserId, 0, 50);
        setMessages(localMessages);
        setLoading(false);

        // 2. SINCRONIZAR con servidor en background
        setIsSyncing(true);
        const newMessagesCount = await ChatService.syncMessages(otherUserId);
        setIsSyncing(false);

        // 3. Si hay mensajes nuevos, RECARGAR
        if (newMessagesCount > 0) {
            const updatedMessages = await ChatService.getMessages(otherUserId, 0, 50);
            setMessages(updatedMessages);
        }

        // 4. Marcar como leídos
        await ChatService.markAsRead(otherUserId);

    } catch (error) {
        console.error('Error inicializando chat:', error);
    }
};
```

### Sincronización en Background

```typescript
// ChatService.ts
async syncMessages(otherUserId: number): Promise<number> {
    if (!this.currentUserId) {
        throw new Error('ChatService no está inicializado');
    }

    try {
        console.log('🔄 SINCRONIZANDO MENSAJES (REST API)');
        console.log('   └─ GET /chat/unread/' + otherUserId);

        // 1. Obtener mensajes no descargados del servidor
        const newMessages = await ChatApiClient.getUnreadMessages(otherUserId);

        if (newMessages.length === 0) {
            console.log('✅ No hay mensajes nuevos');
            return 0;
        }

        console.log(`📨 ${newMessages.length} mensajes nuevos encontrados`);

        // 2. Guardar mensajes en SQLite
        for (const message of newMessages) {
            const enrichedMessage: Message = {
                ...message,
                chatId: ChatDatabase.generateChatId(message.senderId, message.receiverId),
                isSentByMe: message.senderId === this.currentUserId
            };

            await ChatDatabase.saveMessage(enrichedMessage);
        }

        // 3. Marcar como descargados en servidor
        await ChatApiClient.markAsDownloaded(otherUserId);

        // 4. Actualizar conversación
        await this.updateConversation(otherUserId);

        console.log(`✅ ${newMessages.length} mensajes sincronizados`);
        return newMessages.length;

    } catch (error) {
        console.error('❌ Error sincronizando:', error);
        return 0;
    }
}
```

### Endpoint REST API

```typescript
// Backend - chat.routes.ts
router.get('/unread/:otherUserId', async (req, res) => {
    const { otherUserId } = req.params;
    const userId = req.user.id;  // Del token JWT

    try {
        // Obtener mensajes NO descargados aún
        const messages = await db.messages.findMany({
            where: {
                senderId: parseInt(otherUserId),
                receiverId: userId,
                isDownloaded: false  // Solo los no descargados
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        res.json(messages);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});
```

---

## 🐛 Debugging

### Agregar Logs Completos

#### En WebSocket Client:

```typescript
// ChatWebSocket.ts
this.socket.on('receiveMessage', (data: any) => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📨 MENSAJE RECIBIDO POR WEBSOCKET');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 DATOS COMPLETOS:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log('🔍 CAMPOS IMPORTANTES:');
    console.log('   ├─ ID:', data.id);
    console.log('   ├─ De:', data.senderId);
    console.log('   ├─ Para:', data.receiverId);
    console.log('   ├─ Mensaje:', data.message);
    console.log('   ├─ Tipo:', data.messageType);
    console.log('   └─ Timestamp:', data.createdAt);
    console.log('');
    console.log('🎯 EMITIENDO A LISTENERS...');
    
    this.emit('newMessage', data);
    
    console.log('✅ Emitido');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
});
```

#### En ChatService:

```typescript
// ChatService.ts
private async handleIncomingMessage(message: Message): Promise<void> {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔄 CHATSERVICE: PROCESANDO MENSAJE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    try {
        console.log('1️⃣ MENSAJE ORIGINAL:');
        console.log(JSON.stringify(message, null, 2));
        console.log('');

        const enrichedMessage: Message = {
            ...message,
            chatId: ChatDatabase.generateChatId(message.senderId, message.receiverId),
            isSentByMe: message.senderId === this.currentUserId
        };

        console.log('2️⃣ MENSAJE ENRIQUECIDO:');
        console.log('   ├─ chatId:', enrichedMessage.chatId);
        console.log('   ├─ isSentByMe:', enrichedMessage.isSentByMe);
        console.log('   └─ currentUserId:', this.currentUserId);
        console.log('');

        console.log('3️⃣ GUARDANDO EN SQLITE...');
        await ChatDatabase.saveMessage(enrichedMessage);
        console.log('✅ Guardado');
        console.log('');

        console.log('4️⃣ ACTUALIZANDO CONVERSACIÓN...');
        await this.updateConversation(message.senderId, enrichedMessage);
        console.log('✅ Actualizada');
        console.log('');

        console.log('✅ MENSAJE PROCESADO COMPLETAMENTE');
        
    } catch (error) {
        console.error('❌ ERROR:', error);
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
}
```

#### En ChatModal:

```typescript
// ChatModal.tsx
const handleNewMessage = async (newMessage: Message) => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📱 UI: MENSAJE NUEVO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('🔍 VERIFICACIÓN:');
    console.log('   ├─ newMessage.senderId:', newMessage.senderId);
    console.log('   ├─ newMessage.receiverId:', newMessage.receiverId);
    console.log('   ├─ otherUserId:', otherUserId);
    console.log('   └─ ¿Es de este chat?:', 
        newMessage.senderId === otherUserId || newMessage.receiverId === otherUserId
    );
    console.log('');

    if (newMessage.senderId === otherUserId || newMessage.receiverId === otherUserId) {
        console.log('✅ AGREGANDO A LA LISTA');
        console.log('   ├─ Mensajes actuales:', messages.length);
        
        setMessages(prev => {
            const updated = [newMessage, ...prev];
            console.log('   └─ Mensajes después:', updated.length);
            return updated;
        });
        
        console.log('');
        console.log('📊 STATE ACTUALIZADO');
        console.log('   └─ React re-renderizará');
        console.log('');

        if (newMessage.senderId === otherUserId) {
            console.log('👁️ MARCANDO COMO LEÍDO...');
            await ChatService.markAsRead(otherUserId);
            
            const currentUserId = ChatService.getCurrentUserId();
            if (currentUserId) {
                ChatWebSocket.markAsDelivered(otherUserId, currentUserId);
                ChatWebSocket.markAsRead(otherUserId, currentUserId);
            }
            console.log('✅ Marcado');
        }
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
};
```

### Verificar SQLite

```typescript
// Después de guardar, verificar:
const savedMessages = await ChatDatabase.getMessages(chatId, 0, 5);
console.log('💾 ÚLTIMOS 5 MENSAJES EN SQLITE:');
savedMessages.forEach((msg, i) => {
    console.log(`   ${i + 1}. ID: ${msg.id} | ${msg.message.substring(0, 30)}`);
});
```

### Verificar Conversación

```typescript
const conversation = await ChatDatabase.getConversation(chatId);
console.log('📝 CONVERSACIÓN:');
console.log('   ├─ Último mensaje:', conversation?.lastMessageText);
console.log('   └─ No leídos:', conversation?.unreadCount);
```

---

## 📚 Resumen del Flujo

### ✅ Pasos Clave

1. **Backend envía** → emit('receiveMessage', mensaje)
2. **WebSocket recibe** → on('receiveMessage')
3. **WebSocket emite interno** → emit('newMessage')
4. **ChatService escucha** → on('newMessage')
5. **ChatService procesa** → handleIncomingMessage()
6. **Enriquecer mensaje** → Agregar chatId, isSentByMe
7. **Guardar en SQLite** → INSERT mensaje
8. **Actualizar conversación** → UPDATE último mensaje, contador
9. **Notificar a UI** → emit a ChatModal
10. **Actualizar state** → setMessages()
11. **React renderiza** → MessageBubble
12. **Marcar como leído** → UPDATE SQLite + notify backend
13. **Backend notifica remitente** → emit('messageRead')
14. **Remitente ve checks azules** → UI actualizada

### 🎯 Características Importantes

✅ **Tiempo real** - Mensajes instantáneos (< 100ms)
✅ **Persistencia** - Guardado en SQLite inmediatamente
✅ **Sincronización** - Fallback a REST API si WebSocket falla
✅ **Estados visuales** - Checks de entregado/leído
✅ **Optimizado** - No duplicados, queries eficientes
✅ **Robusto** - Manejo de errores, recuperación automática

### 🔄 Diferencias con Envío

| Aspecto | Envío (Usuario A) | Recepción (Usuario B) |
|---------|-------------------|----------------------|
| **TempID** | Sí, se genera UUID | No, viene con ID real |
| **Optimistic Update** | Sí, se muestra antes de confirmar | No, se muestra después de guardar |
| **isSentByMe** | `true` | `false` |
| **Burbuja** | Naranja, derecha | Blanca, izquierda |
| **Checks** | Muestra estado | No muestra checks |
| **Marcar leído** | Recibe notificación | Envía notificación |

---

**Última actualización:** 22 de Octubre, 2025
