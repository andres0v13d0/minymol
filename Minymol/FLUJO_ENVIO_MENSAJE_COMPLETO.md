# 📨 Flujo Completo de Envío de Mensaje

Este documento explica paso a paso cómo funciona el envío de un mensaje en el sistema de chat de Minymol Mayoristas, desde que el usuario presiona "Enviar" hasta que el mensaje se confirma y se guarda en SQLite.

---

## 📋 Tabla de Contenidos

1. [Resumen General](#resumen-general)
2. [Paso 1: Usuario Presiona Enviar](#paso-1-usuario-presiona-enviar)
3. [Paso 2: Validación y Limpieza](#paso-2-validación-y-limpieza)
4. [Paso 3: Generación de TempID](#paso-3-generación-de-tempid)
5. [Paso 4: Optimistic Update (Guardar en SQLite)](#paso-4-optimistic-update-guardar-en-sqlite)
6. [Paso 5: Actualizar UI Inmediatamente](#paso-5-actualizar-ui-inmediatamente)
7. [Paso 6: Envío al Servidor](#paso-6-envío-al-servidor)
8. [Paso 7: Procesamiento en el Backend](#paso-7-procesamiento-en-el-backend)
9. [Paso 8: Confirmación del Servidor](#paso-8-confirmación-del-servidor)
10. [Paso 9: Actualizar TempID con ID Real](#paso-9-actualizar-tempid-con-id-real)
11. [Paso 10: Estados del Mensaje](#paso-10-estados-del-mensaje)
12. [Flujo Visual Completo](#flujo-visual-completo)
13. [Manejo de Errores](#manejo-de-errores)
14. [Debugging](#debugging)

---

## 🎯 Resumen General

### Estrategia: **Optimistic Update**

El sistema usa una estrategia de **actualización optimista** para dar la mejor experiencia de usuario:

1. ✅ **Guardar primero en SQLite** (local) con un `tempId`
2. ✅ **Mostrar inmediatamente en la UI** (con reloj ⏳)
3. ✅ **Enviar al servidor en background** (WebSocket o REST API)
4. ✅ **Esperar confirmación** con el ID real del servidor
5. ✅ **Actualizar el mensaje** reemplazando `tempId` con `id` real
6. ✅ **Mostrar estado** (✓ enviado, ✓✓ entregado, 👁️ leído)

### Componentes Involucrados

| Componente | Archivo | Responsabilidad |
|------------|---------|-----------------|
| **UI** | `ChatModal.tsx` | Input de texto, botón enviar, renderizado |
| **Service** | `ChatService.ts` | Lógica de negocio, coordinación |
| **Database** | `ChatDatabase.ts` | SQLite, persistencia local |
| **WebSocket** | `ChatWebSocket.ts` | Comunicación en tiempo real |
| **API Client** | `ChatApiClient.ts` | Llamadas HTTP REST (fallback) |
| **Backend** | Socket.IO Server | Procesar mensajes, guardar en DB |

---

## 📝 Paso 1: Usuario Presiona Enviar

### 📍 Ubicación: `components/chat/ChatModal.tsx`

#### 1.1 Input de Texto

```tsx
const ChatModal: React.FC<ChatModalProps> = ({ otherUserId, otherUserName }) => {
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);

    return (
        <View style={styles.inputContainer}>
            {/* Input de texto */}
            <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Escribe un mensaje..."
                multiline
                maxLength={1000}
                editable={!sending}  // ← Deshabilitado mientras se envía
            />

            {/* Botón de enviar */}
            <TouchableOpacity
                style={[
                    styles.sendButton,
                    (!inputText.trim() || sending) && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}  // ← Función que se ejecuta
                disabled={!inputText.trim() || sending}
            >
                {sending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                    <Ionicons name="send" size={22} color="#ffffff" />
                )}
            </TouchableOpacity>
        </View>
    );
};
```

**🔍 ¿Qué pasa aquí?**
- El usuario escribe en el `TextInput`
- El texto se guarda en el state `inputText`
- Al presionar el botón, se ejecuta `handleSendMessage()`
- El botón se deshabilita mientras `sending === true`
- Se muestra un spinner durante el envío

---

## ✅ Paso 2: Validación y Limpieza

### 📍 Ubicación: `components/chat/ChatModal.tsx`

```tsx
const handleSendMessage = async () => {
    // 1. Obtener texto y eliminar espacios
    const text = inputText.trim();

    // 2. Validar que no esté vacío
    if (!isValidMessage(text)) {
        return; // No hacer nada si está vacío
    }

    try {
        setSending(true);  // ← Bloquear botón de enviar

        // 3. Limpiar input INMEDIATAMENTE (mejor UX)
        setInputText('');

        // 4. Enviar mensaje
        const newMessage = await ChatService.sendMessage(otherUserId, text);

        // 5. Optimistic update (mostrar en UI inmediatamente)
        setMessages(prev => [newMessage, ...prev]);

    } catch (error: any) {
        console.error('Error enviando mensaje:', error);
        
        // Mensajes de error personalizados
        let errorMessage = 'No se pudo enviar el mensaje';
        
        if (error.message?.includes('permiso para chatear')) {
            errorMessage = 'Este comerciante debe iniciar la conversación primero.';
        } else if (error.message?.includes('403')) {
            errorMessage = 'No tienes permiso para chatear con este usuario';
        }
        
        Alert.alert('Error', errorMessage);

        // Restaurar texto en input si falla
        setInputText(text);
    } finally {
        setSending(false);  // ← Desbloquear botón
    }
};
```

**🔍 ¿Qué pasa aquí?**
1. Se obtiene el texto y se limpia (`trim()`)
2. Se valida que no esté vacío con `isValidMessage()`
3. Se limpia el input **inmediatamente** para mejor UX
4. Se marca como `sending = true` para bloquear el botón
5. Se llama a `ChatService.sendMessage()`
6. Se agrega el mensaje a la lista local (optimistic update)
7. Si hay error, se muestra alerta y se restaura el texto

---

## 🆔 Paso 3: Generación de TempID

### 📍 Ubicación: `services/chat/ChatService.ts`

```tsx
import uuid from 'react-native-uuid';

async sendMessage(
    otherUserId: number,
    text: string,
    messageType: MessageType = 'TEXT',
    fileUrl?: string
): Promise<Message> {
    if (!this.currentUserId) {
        throw new Error('ChatService no está inicializado');
    }

    try {
        console.log('📤 PREPARANDO MENSAJE PARA ENVÍO');
        console.log('   ├─ De:', this.currentUserId);
        console.log('   ├─ Para:', otherUserId);
        console.log('   └─ Texto:', text.substring(0, 50) + '...');

        // 1. Generar ID temporal único (UUID v4)
        const tempId = String(uuid.v4());
        console.log('   ├─ Temp ID generado:', tempId);

        // 2. Generar timestamp
        const now = new Date().toISOString();
        console.log('   ├─ Timestamp:', now);

        // 3. Generar chatId (consistente entre ambos usuarios)
        const chatId = ChatDatabase.generateChatId(this.currentUserId, otherUserId);
        console.log('   └─ Chat ID:', chatId);

        // 4. Crear objeto mensaje temporal
        const tempMessage: Message = {
            id: tempId,              // ← ID temporal (UUID)
            tempId: tempId,          // ← Guardar también en tempId
            senderId: this.currentUserId,
            receiverId: otherUserId,
            message: text,
            messageType,
            fileUrl: fileUrl || null,
            isDelivered: false,      // ← Aún no entregado
            isRead: false,           // ← Aún no leído
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
            chatId,
            isSentByMe: true         // ← Soy yo quien envía
        };

        console.log('✅ Mensaje temporal creado:', tempMessage);

        // Continúa en el siguiente paso...
        return tempMessage;
    } catch (error) {
        console.error('❌ Error creando mensaje:', error);
        throw error;
    }
}
```

**🔍 ¿Qué pasa aquí?**
1. Se genera un **UUID v4** único como `tempId`
   - Ejemplo: `"550e8400-e29b-41d4-a716-446655440000"`
2. Se crea el timestamp actual en formato ISO
3. Se genera el `chatId` (ordenado por IDs)
   - Si usuario 5 escribe a usuario 3 → `chatId = "3-5"`
   - Si usuario 3 escribe a usuario 5 → `chatId = "3-5"` (mismo)
4. Se crea el objeto `Message` con **todos** los campos
5. Los campos `id` y `tempId` tienen el mismo valor (UUID)
6. El mensaje aún NO está en el servidor

### 📌 Importancia del TempID

El `tempId` es crucial porque:
- ✅ Permite identificar el mensaje **antes** de tener el ID del servidor
- ✅ Permite hacer **Optimistic Update** (mostrar en UI antes de confirmar)
- ✅ Permite **reemplazar** el mensaje cuando llegue la confirmación
- ✅ Evita duplicados al sincronizar

---

## 💾 Paso 4: Optimistic Update (Guardar en SQLite)

### 📍 Ubicación: `services/chat/ChatService.ts`

```tsx
async sendMessage(/* ... */): Promise<Message> {
    // ... (código anterior)

    try {
        // 1. Guardar INMEDIATAMENTE en SQLite (Optimistic Update)
        console.log('');
        console.log('💾 GUARDANDO EN SQLITE (Local)');
        console.log('   └─ Antes de enviar al servidor');
        
        await ChatDatabase.saveMessage(tempMessage);
        
        console.log('✅ Mensaje guardado en SQLite con tempId:', tempId);

        // 2. Actualizar conversación
        console.log('');
        console.log('📝 ACTUALIZANDO CONVERSACIÓN');
        
        await this.updateConversation(otherUserId, tempMessage);
        
        console.log('✅ Conversación actualizada');

        // 3. Enviar al servidor en background
        console.log('');
        console.log('🚀 ENVIANDO AL SERVIDOR (Background)');
        
        this.sendToServer(tempMessage);  // ← No await (background)

        // 4. Retornar mensaje inmediatamente
        console.log('');
        console.log('✅ MENSAJE LISTO PARA UI');
        console.log('   └─ Se mostrará con reloj ⏳ mientras se confirma');
        
        return tempMessage;
    } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        throw error;
    }
}
```

**🔍 ¿Qué pasa aquí?**
1. Se guarda **inmediatamente** en SQLite con el `tempId`
2. Se actualiza la lista de conversaciones
3. Se envía al servidor en **background** (sin `await`)
4. Se retorna el mensaje **antes** de confirmar con el servidor
5. La UI ya puede mostrar el mensaje mientras se envía

### 📊 Estado del Mensaje en SQLite

```sql
-- Tabla: messages
INSERT INTO messages VALUES (
    id = "550e8400-e29b-41d4-a716-446655440000",  -- tempId como ID
    tempId = "550e8400-e29b-41d4-a716-446655440000",
    senderId = 123,
    receiverId = 456,
    message = "Hola, ¿cómo estás?",
    messageType = "TEXT",
    fileUrl = NULL,
    isDelivered = 0,      -- ✗ No entregado
    isRead = 0,           -- ✗ No leído
    isDeleted = 0,
    createdAt = 1729612800000,
    updatedAt = 1729612800000,
    chatId = "123-456",
    isSentByMe = 1        -- ✓ Enviado por mí
);
```

**Explicación:**
- `id` y `tempId` tienen el **mismo valor** (UUID)
- `isDelivered = 0` → Aún no confirmado
- `isSentByMe = 1` → Es mi mensaje
- Se guarda **antes** de enviar al servidor

---

## 📺 Paso 5: Actualizar UI Inmediatamente

### 📍 Ubicación: `components/chat/ChatModal.tsx`

```tsx
const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!isValidMessage(text)) return;

    try {
        setSending(true);
        setInputText('');  // ← Limpiar input inmediatamente

        // Enviar mensaje (retorna inmediatamente)
        const newMessage = await ChatService.sendMessage(otherUserId, text);

        // Agregar a la lista de mensajes (Optimistic Update)
        setMessages(prev => [newMessage, ...prev]);
        //             ↑ Nuevo mensaje al principio (lista invertida)

    } catch (error) {
        // Manejar error...
    } finally {
        setSending(false);
    }
};
```

**🔍 ¿Qué pasa aquí?**
1. Se llama a `sendMessage()` y retorna **inmediatamente**
2. El mensaje ya tiene `tempId` pero **NO** tiene confirmación
3. Se agrega al state `messages` al principio (lista invertida)
4. React re-renderiza el componente

### 🎨 Renderizado del Mensaje

```tsx
const renderMessage = ({ item }: { item: Message }) => {
    return <MessageBubble message={item} />;
};

// En MessageBubble.tsx
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
    const showStatus = message.isSentByMe;  // Solo en mis mensajes

    return (
        <View style={styles.bubble}>
            <Text style={styles.messageText}>{message.message}</Text>
            
            {showStatus && (
                <View style={styles.statusContainer}>
                    <Text style={styles.timestamp}>
                        {formatTime(message.createdAt)}
                    </Text>
                    
                    {/* Indicador de estado */}
                    {message.tempId ? (
                        // ⏳ Enviando (tiene tempId)
                        <Ionicons name="time-outline" size={14} color="#999" />
                    ) : message.isRead ? (
                        // 👁️ Leído (checks azules)
                        <Ionicons name="checkmark-done" size={14} color="#0088cc" />
                    ) : message.isDelivered ? (
                        // ✓✓ Entregado (checks grises)
                        <Ionicons name="checkmark-done" size={14} color="#999" />
                    ) : (
                        // ✓ Enviado (un check)
                        <Ionicons name="checkmark" size={14} color="#999" />
                    )}
                </View>
            )}
        </View>
    );
};
```

**🔍 ¿Qué pasa aquí?**
- Si el mensaje tiene `tempId` → Muestra **reloj** ⏳ (enviando)
- Si `isRead === true` → Muestra **checks azules** 👁️ (leído)
- Si `isDelivered === true` → Muestra **doble check gris** ✓✓ (entregado)
- Si ninguno → Muestra **check simple** ✓ (enviado)

---

## 🌐 Paso 6: Envío al Servidor

### 📍 Ubicación: `services/chat/ChatService.ts`

```tsx
/**
 * Enviar mensaje al servidor (WebSocket o REST API)
 */
private async sendToServer(message: Message): Promise<void> {
    try {
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  📤 ENVIANDO MENSAJE AL SERVIDOR                              ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');
        
        // Crear payload para el servidor
        const payload: CreateMessageDto = {
            senderId: message.senderId,
            receiverId: message.receiverId,
            message: message.message,
            messageType: message.messageType,
            fileUrl: message.fileUrl,
            tempId: message.tempId  // ← MUY IMPORTANTE: Enviar tempId
        };

        console.log('📋 PAYLOAD:');
        console.log('   ├─ Temp ID:', message.tempId);
        console.log('   ├─ De:', message.senderId);
        console.log('   ├─ Para:', message.receiverId);
        console.log('   ├─ Tipo:', message.messageType);
        console.log('   └─ Texto:', message.message.substring(0, 50) + '...');
        console.log('');
        console.log('🔄 ESTRATEGIA DE ENVÍO:');
        console.log('   1️⃣  Intentar WebSocket primero');
        console.log('   2️⃣  Si falla → Usar REST API');
        console.log('');

        // ESTRATEGIA 1: Intentar WebSocket
        console.log('🔌 Verificando WebSocket...');
        const sentViaWS = ChatWebSocket.sendMessage(payload);

        if (sentViaWS) {
            console.log('✅ Mensaje enviado por WebSocket');
            console.log('   └─ Esperando evento "messageSent" con confirmación...');
            console.log('');
        } else {
            // ESTRATEGIA 2: Fallback a REST API
            console.log('⚠️  WebSocket no disponible');
            console.log('');
            console.log('🔄 USANDO FALLBACK: REST API');
            console.log('   └─ POST https://api.minymol.com/chat/message');
            console.log('');
            
            const serverMessage = await ChatApiClient.sendMessage(payload);

            console.log('');
            console.log('✅ MENSAJE ENVIADO POR REST API');
            console.log('   ├─ Server Message ID:', serverMessage.id);
            console.log('   └─ Actualizando base de datos local...');
            console.log('');

            // Actualizar mensaje en SQLite
            if (message.tempId) {
                await ChatDatabase.updateMessageId(message.tempId, serverMessage.id);
                await ChatDatabase.updateMessageStatus(serverMessage.id, true, false);
                console.log('✅ Base de datos local actualizada');
                console.log('   ├─ TempID reemplazado con ID real:', serverMessage.id);
                console.log('   └─ Estado: isDelivered = true');
            }
            console.log('');
        }
    } catch (error) {
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  ❌ ERROR ENVIANDO AL SERVIDOR                                ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('🔍 ERROR:', error);
        console.log('');

        // Marcar mensaje como fallido en SQLite
        if (message.tempId) {
            await ChatDatabase.markMessageAsFailed(message.tempId);
            console.log('❌ Mensaje marcado como fallido');
        }
    }
}
```

**🔍 ¿Qué pasa aquí?**

### 6.1 Se crea el payload

```typescript
const payload: CreateMessageDto = {
    senderId: 123,
    receiverId: 456,
    message: "Hola, ¿cómo estás?",
    messageType: "TEXT",
    fileUrl: null,
    tempId: "550e8400-e29b-41d4-a716-446655440000"  // ← CRUCIAL
};
```

### 6.2 Estrategia 1: WebSocket

```typescript
// Intentar enviar por WebSocket
const sentViaWS = ChatWebSocket.sendMessage(payload);

if (sentViaWS) {
    // ✅ Enviado por WebSocket
    // Esperar evento "messageSent" del servidor
}
```

**Código en `ChatWebSocket.ts`:**

```typescript
sendMessage(payload: SendMessagePayload): boolean {
    if (!this.isConnected()) {
        return false;  // No está conectado
    }

    try {
        console.log('📤 ENVIANDO MENSAJE (WebSocket):');
        console.log('   ├─ Evento: sendMessage');
        console.log('   ├─ Temp ID:', payload.tempId);
        console.log('   └─ Socket ID:', this.socket?.id);
        
        // Emitir evento "sendMessage" al servidor
        this.socket!.emit('sendMessage', payload);
        
        return true;  // ✅ Enviado
    } catch (error) {
        console.log('❌ ERROR enviando por WebSocket:', error);
        return false;  // ❌ Falló
    }
}
```

### 6.3 Estrategia 2: REST API (Fallback)

```typescript
else {
    // WebSocket no disponible, usar REST API
    const serverMessage = await ChatApiClient.sendMessage(payload);
    
    // Actualizar inmediatamente en SQLite
    await ChatDatabase.updateMessageId(message.tempId, serverMessage.id);
    await ChatDatabase.updateMessageStatus(serverMessage.id, true, false);
}
```

**Código en `ChatApiClient.ts`:**

```typescript
async sendMessage(dto: CreateMessageDto): Promise<Message> {
    console.log('📡 POST /chat/message');
    console.log('   └─ Temp ID:', dto.tempId);
    
    const response = await apiCall(`${BASE_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto)
    });

    if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
    }

    const serverMessage: Message = await response.json();
    
    console.log('✅ Respuesta del servidor:');
    console.log('   └─ ID real:', serverMessage.id);
    
    return serverMessage;
}
```

---

## 🖥️ Paso 7: Procesamiento en el Backend

### 📍 Ubicación: Backend (Node.js + Socket.IO)

### 7.1 Recepción por WebSocket

```typescript
// server/socket/socket.controller.ts
io.on('connection', (socket) => {
    const { userId } = socket.handshake.auth;

    // Escuchar evento "sendMessage"
    socket.on('sendMessage', async (payload: SendMessagePayload) => {
        console.log('');
        console.log('📨 MENSAJE RECIBIDO (WebSocket)');
        console.log('   ├─ De:', payload.senderId);
        console.log('   ├─ Para:', payload.receiverId);
        console.log('   ├─ Temp ID:', payload.tempId);
        console.log('   └─ Mensaje:', payload.message.substring(0, 50) + '...');

        try {
            // 1. Validar permisos
            if (payload.senderId !== userId) {
                socket.emit('messageFailed', {
                    tempId: payload.tempId,
                    error: 'Usuario no autorizado',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // 2. Guardar en base de datos
            const savedMessage = await db.messages.create({
                data: {
                    senderId: payload.senderId,
                    receiverId: payload.receiverId,
                    message: payload.message,
                    messageType: payload.messageType,
                    fileUrl: payload.fileUrl,
                    isDelivered: false,
                    isRead: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            console.log('');
            console.log('💾 MENSAJE GUARDADO EN BASE DE DATOS');
            console.log('   ├─ ID generado:', savedMessage.id);
            console.log('   └─ Timestamp:', savedMessage.createdAt);

            // 3. Confirmar al remitente (quien envió)
            socket.emit('messageSent', {
                tempId: payload.tempId,  // ← Para que el cliente lo identifique
                message: savedMessage,   // ← Mensaje con ID real
                status: 'sent',
                timestamp: new Date().toISOString()
            });

            console.log('');
            console.log('✅ CONFIRMACIÓN ENVIADA AL REMITENTE');
            console.log('   └─ Evento: messageSent');

            // 4. Enviar al destinatario (si está conectado)
            const receiverSocketId = await redisClient.get(`user:${payload.receiverId}:socket`);
            
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('receiveMessage', savedMessage);
                
                console.log('');
                console.log('📬 MENSAJE ENVIADO AL DESTINATARIO');
                console.log('   ├─ Receptor ID:', payload.receiverId);
                console.log('   ├─ Socket ID:', receiverSocketId);
                console.log('   └─ Evento: receiveMessage');
            } else {
                console.log('');
                console.log('⚠️  DESTINATARIO DESCONECTADO');
                console.log('   └─ Se guardó en BD, lo recibirá al sincronizar');
            }

        } catch (error) {
            console.error('❌ ERROR procesando mensaje:', error);
            
            // Notificar error al remitente
            socket.emit('messageFailed', {
                tempId: payload.tempId,
                error: error.message || 'Error del servidor',
                timestamp: new Date().toISOString()
            });
        }
    });
});
```

**🔍 ¿Qué pasa aquí?**
1. Se recibe el evento `sendMessage` con el payload
2. Se valida que el usuario tenga permiso
3. Se guarda en la **base de datos** (PostgreSQL/MySQL)
4. Se genera un **ID real** (auto-increment o UUID)
5. Se envía confirmación al **remitente** con `messageSent`
6. Se envía el mensaje al **destinatario** con `receiveMessage` (si está online)

### 7.2 Recepción por REST API

```typescript
// server/chat/chat.routes.ts
router.post('/message', async (req, res) => {
    const { senderId, receiverId, message, messageType, fileUrl, tempId } = req.body;
    const userId = req.user.id;  // Del token JWT

    console.log('📡 POST /chat/message');
    console.log('   ├─ De:', senderId);
    console.log('   ├─ Para:', receiverId);
    console.log('   └─ Temp ID:', tempId);

    try {
        // Validar permisos
        if (senderId !== userId) {
            return res.status(403).json({ error: 'No autorizado' });
        }

        // Guardar en base de datos
        const savedMessage = await db.messages.create({
            data: {
                senderId,
                receiverId,
                message,
                messageType,
                fileUrl,
                isDelivered: false,
                isRead: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        console.log('💾 Mensaje guardado con ID:', savedMessage.id);

        // Retornar mensaje con ID real
        res.status(201).json(savedMessage);

        // Notificar al destinatario si está conectado (WebSocket)
        const receiverSocketId = await redisClient.get(`user:${receiverId}:socket`);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receiveMessage', savedMessage);
        }

    } catch (error) {
        console.error('❌ Error guardando mensaje:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});
```

---

## ✅ Paso 8: Confirmación del Servidor

### 📍 Ubicación: `services/chat/ChatWebSocket.ts`

### 8.1 Listener del Evento `messageSent`

```typescript
// Configurar listener al conectar
private setupSocketListeners(): void {
    // Confirmación de mensaje enviado
    this.socket.on('messageSent', (data: any) => {
        console.log('');
        console.log('✅ CONFIRMACIÓN DE ENVÍO (WebSocket):');
        console.log('   ├─ Temp ID:', data.tempId);
        console.log('   ├─ Mensaje ID real:', data.message?.id);
        console.log('   ├─ Estado:', data.status);
        console.log('   └─ Timestamp:', data.timestamp);
        console.log('');
        
        // Emitir a los listeners registrados
        this.emit('messageSent', data);
    });
}
```

### 8.2 Estructura del Evento `messageSent`

```typescript
// Datos que llegan del servidor
{
    tempId: "550e8400-e29b-41d4-a716-446655440000",  // UUID temporal
    message: {
        id: "67890",                                  // ID REAL del servidor
        senderId: 123,
        receiverId: 456,
        message: "Hola, ¿cómo estás?",
        messageType: "TEXT",
        fileUrl: null,
        isDelivered: false,
        isRead: false,
        createdAt: "2025-10-22T14:30:00.000Z",
        updatedAt: "2025-10-22T14:30:00.000Z"
    },
    status: "sent",
    timestamp: "2025-10-22T14:30:00.500Z"
}
```

---

## 🔄 Paso 9: Actualizar TempID con ID Real

### 📍 Ubicación: `components/chat/ChatModal.tsx`

### 9.1 Listener del Evento

```typescript
useEffect(() => {
    if (visible) {
        // Escuchar confirmación de envío (quita el reloj ⏳)
        messageSentListenerRef.current = ChatWebSocket.on('messageSent', handleMessageSent);

        return () => {
            if (messageSentListenerRef.current) {
                ChatWebSocket.off('messageSent', messageSentListenerRef.current);
            }
        };
    }
}, [visible]);
```

### 9.2 Handler del Evento

```typescript
const handleMessageSent = async (payload: MessageSentPayload) => {
    console.log('');
    console.log('🔄 PROCESANDO CONFIRMACIÓN');
    console.log('   ├─ Temp ID:', payload.tempId);
    console.log('   ├─ ID Real:', payload.message?.id);
    console.log('   └─ Actualizando mensaje...');

    let foundTempId: string | null = null;

    // Actualizar mensaje en el state (UI)
    setMessages(prev => {
        const updated = [...prev];
        
        // Buscar el mensaje por tempId
        for (let index = 0; index < updated.length; index++) {
            const msg = updated[index];
            
            // Buscar por tempId exacto
            const matchesByTempId = payload.tempId && msg.tempId === payload.tempId;
            
            // Fallback: buscar por contenido (por si acaso)
            const matchesByContent = !matchesByTempId && 
                                   msg.tempId && 
                                   msg.message === payload.message?.message;
            
            if (matchesByTempId || matchesByContent) {
                foundTempId = msg.tempId || null;
                
                // REEMPLAZAR mensaje temporal con mensaje confirmado
                updated[index] = {
                    ...payload.message,
                    isSentByMe: true,
                    tempId: undefined  // ← QUITAR tempId (ya confirmado)
                };
                
                console.log('✅ Mensaje actualizado en UI');
                console.log('   ├─ Índice:', index);
                console.log('   └─ TempId removido');
                
                break;
            }
        }
        
        return updated;
    });

    // Actualizar en SQLite también
    if (foundTempId && payload.message?.id) {
        try {
            await ChatService.updateMessageInDB(foundTempId, payload.message.id);
            
            console.log('✅ Mensaje actualizado en SQLite');
            console.log('   ├─ TempId:', foundTempId);
            console.log('   └─ ID Real:', payload.message.id);
        } catch (error) {
            console.error('❌ Error actualizando en SQLite:', error);
        }
    }

    console.log('');
};
```

**🔍 ¿Qué pasa aquí?**
1. Se recibe el evento `messageSent` con `tempId` y el mensaje real
2. Se busca el mensaje en el state por `tempId`
3. Se **reemplaza** el mensaje temporal con el mensaje confirmado
4. Se **quita** el `tempId` (ahora tiene ID real)
5. React re-renderiza → El reloj ⏳ desaparece, aparece ✓
6. Se actualiza también en SQLite

### 9.3 Actualización en SQLite

**Archivo:** `services/chat/ChatDatabase.ts`

```typescript
/**
 * Actualizar ID de mensaje temporal con ID real del servidor
 */
async updateMessageId(tempId: string, realId: string): Promise<void> {
    try {
        console.log('');
        console.log('🔄 ACTUALIZANDO ID EN SQLITE');
        console.log('   ├─ TempId:', tempId);
        console.log('   └─ ID Real:', realId);

        // 1. Verificar si ya existe un mensaje con el ID real
        const checkSql = `SELECT id FROM messages WHERE id = ?`;
        const existing = await this.getAllAsync(checkSql, [realId]);

        if (existing.length > 0) {
            // Ya existe, solo eliminar el temporal (evitar duplicado)
            console.log('⚠️ Mensaje con ID real ya existe, eliminando temporal');
            
            const deleteSql = `DELETE FROM messages WHERE tempId = ?`;
            await this.execute(deleteSql, [tempId]);
            
            console.log('✅ Mensaje temporal eliminado');
        } else {
            // No existe, hacer UPDATE normal
            console.log('✏️ Actualizando ID del mensaje');
            
            const sql = `UPDATE messages SET id = ?, tempId = NULL WHERE tempId = ?`;
            await this.execute(sql, [realId, tempId]);
            
            console.log('✅ ID actualizado correctamente');
        }

        console.log('');
    } catch (error) {
        console.error('❌ Error en updateMessageId:', error);
        throw error;
    }
}
```

**🔍 ¿Qué pasa aquí?**
1. Se recibe el `tempId` y el `realId` del servidor
2. Se verifica si ya existe un mensaje con ese `realId` (evitar duplicados)
3. Si **NO existe**: Se actualiza el `id` y se quita el `tempId`
4. Si **SÍ existe**: Se elimina el mensaje temporal (ya está el real)

### 📊 Estado en SQLite ANTES y DESPUÉS

**ANTES (con tempId):**
```sql
id = "550e8400-e29b-41d4-a716-446655440000"  -- UUID temporal
tempId = "550e8400-e29b-41d4-a716-446655440000"
senderId = 123
receiverId = 456
message = "Hola, ¿cómo estás?"
isDelivered = 0  -- No confirmado
```

**DESPUÉS (con ID real):**
```sql
id = "67890"     -- ID real del servidor ✅
tempId = NULL    -- Ya no es temporal
senderId = 123
receiverId = 456
message = "Hola, ¿cómo estás?"
isDelivered = 1  -- Confirmado ✅
```

---

## 📊 Paso 10: Estados del Mensaje

### Estados Posibles

| Estado | Icono | Condición | Descripción |
|--------|-------|-----------|-------------|
| **Enviando** | ⏳ | `tempId !== null` | Mensaje local, aún no confirmado |
| **Enviado** | ✓ | `tempId === null && !isDelivered && !isRead` | Confirmado por servidor, no entregado |
| **Entregado** | ✓✓ | `isDelivered === true && !isRead` | Recibido por el destinatario |
| **Leído** | 👁️ | `isRead === true` | Visto por el destinatario |
| **Error** | ⚠️ | Error en `messageFailed` | No se pudo enviar |

### 10.1 Mensaje Entregado

**Evento del servidor:** `messageDelivered`

```typescript
// ChatModal.tsx
const handleMessageDelivered = async (update: MessageStatusUpdate) => {
    // Solo actualizar si soy el remitente
    if (update.receiverId === otherUserId) {
        const messagesToUpdate: string[] = [];

        setMessages(prev => prev.map(msg => {
            if (msg.isSentByMe && msg.receiverId === otherUserId && !msg.isDelivered) {
                if (msg.id && !msg.tempId) {
                    messagesToUpdate.push(msg.id);
                }
                return { ...msg, isDelivered: true };  // ← Marcar como entregado
            }
            return msg;
        }));

        // Actualizar en SQLite
        for (const messageId of messagesToUpdate) {
            await ChatService.updateMessageStatus(messageId, true, false);
        }
    }
};
```

### 10.2 Mensaje Leído

**Evento del servidor:** `messageRead`

```typescript
// ChatModal.tsx
const handleMessageRead = async (update: MessageStatusUpdate) => {
    // Solo actualizar si soy el remitente
    if (update.receiverId === otherUserId) {
        const messagesToUpdate: string[] = [];

        setMessages(prev => prev.map(msg => {
            if (msg.isSentByMe && msg.receiverId === otherUserId && !msg.isRead) {
                if (msg.id && !msg.tempId) {
                    messagesToUpdate.push(msg.id);
                }
                return { 
                    ...msg, 
                    isDelivered: true,  // ← También entregado
                    isRead: true        // ← Marcar como leído
                };
            }
            return msg;
        }));

        // Actualizar en SQLite
        for (const messageId of messagesToUpdate) {
            await ChatService.updateMessageStatus(messageId, true, true);
        }
    }
};
```

---

## 🔄 Flujo Visual Completo

### Diagrama de Secuencia

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Usuario │    │   UI     │    │ Service  │    │  SQLite  │    │  Server  │
│          │    │ ChatModal│    │          │    │          │    │ Socket.IO│
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │
     │ 1. Presiona   │               │               │               │
     │   "Enviar"    │               │               │               │
     │──────────────>│               │               │               │
     │               │               │               │               │
     │               │ 2. handleSend │               │               │
     │               │──────────────>│               │               │
     │               │               │               │               │
     │               │               │ 3. Generar    │               │
     │               │               │    tempId     │               │
     │               │               │    (UUID)     │               │
     │               │               │               │               │
     │               │               │ 4. saveMessage│               │
     │               │               │──────────────>│               │
     │               │               │               │               │
     │               │               │               │ INSERT con    │
     │               │               │               │ tempId        │
     │               │               │               │               │
     │               │               │ 5. return msg │               │
     │               │               │<──────────────│               │
     │               │               │               │               │
     │               │ 6. newMessage │               │               │
     │               │<──────────────│               │               │
     │               │               │               │               │
     │ 7. Muestra    │ setMessages   │               │               │
     │    mensaje    │ (Optimistic)  │               │               │
     │    con ⏳     │               │               │               │
     │<──────────────│               │               │               │
     │               │               │               │               │
     │               │               │ 8. sendToServer (background)  │
     │               │               │──────────────────────────────>│
     │               │               │               │               │
     │               │               │  emit('sendMessage', payload) │
     │               │               │               │               │
     │               │               │               │  9. Guardar   │
     │               │               │               │     en BD     │
     │               │               │               │  (ID real)    │
     │               │               │               │               │
     │               │               │  10. emit('messageSent')      │
     │               │               │<──────────────────────────────│
     │               │               │               │               │
     │               │ 11. on('messageSent')         │               │
     │               │<──────────────│               │               │
     │               │               │               │               │
     │               │ 12. handleMessageSent         │               │
     │               │    (reemplaza tempId)         │               │
     │               │               │               │               │
     │               │               │ 13. updateMessageId           │
     │               │               │──────────────>│               │
     │               │               │               │               │
     │               │               │               │ UPDATE id     │
     │               │               │               │ SET tempId=NULL
     │               │               │               │               │
     │ 14. Muestra   │ setMessages   │               │               │
     │     ✓ check   │ (sin tempId)  │               │               │
     │<──────────────│               │               │               │
     │               │               │               │               │
     │               │     [Cuando destinatario abre chat]           │
     │               │               │               │               │
     │               │               │  15. emit('markAsDelivered')  │
     │               │<──────────────────────────────────────────────│
     │               │               │               │               │
     │ 16. Muestra   │ setMessages   │               │               │
     │     ✓✓ checks │ (isDelivered) │               │               │
     │<──────────────│               │               │               │
     │               │               │               │               │
     │               │     [Cuando destinatario ve mensaje]          │
     │               │               │               │               │
     │               │               │  17. emit('markAsRead')       │
     │               │<──────────────────────────────────────────────│
     │               │               │               │               │
     │ 18. Muestra   │ setMessages   │               │               │
     │     👁️ leído  │ (isRead)      │               │               │
     │<──────────────│               │               │               │
```

### Timeline con Tiempos Aproximados

| Tiempo | Evento | Descripción |
|--------|--------|-------------|
| `t=0ms` | Usuario presiona enviar | Click en botón |
| `t=10ms` | Se genera `tempId` | UUID v4 |
| `t=20ms` | Se guarda en SQLite | INSERT con tempId |
| `t=30ms` | Se muestra en UI | Con reloj ⏳ |
| `t=50ms` | Se envía por WebSocket | emit('sendMessage') |
| `t=150ms` | Servidor procesa | Validar + Guardar en BD |
| `t=200ms` | Servidor confirma | emit('messageSent') |
| `t=250ms` | Cliente recibe confirmación | Evento WebSocket |
| `t=260ms` | Se actualiza SQLite | UPDATE id, tempId=NULL |
| `t=270ms` | Se actualiza UI | Quita ⏳, muestra ✓ |
| `t=...` | Destinatario recibe | emit('receiveMessage') |
| `t=...` | Destinatario ve | emit('markAsRead') |
| `t=...` | Se actualiza a leído | isRead=true 👁️ |

---

## ❌ Manejo de Errores

### Error 1: WebSocket No Disponible

```typescript
// ChatService.ts - sendToServer()
const sentViaWS = ChatWebSocket.sendMessage(payload);

if (!sentViaWS) {
    // Fallback automático a REST API
    const serverMessage = await ChatApiClient.sendMessage(payload);
    
    // Actualizar en SQLite
    await ChatDatabase.updateMessageId(message.tempId, serverMessage.id);
}
```

### Error 2: Fallo al Enviar

```typescript
// ChatWebSocket.ts
this.socket.on('messageFailed', (data: any) => {
    console.log('❌ ERROR AL ENVIAR MENSAJE:');
    console.log('   ├─ Temp ID:', data.tempId);
    console.log('   └─ Error:', data.error);
    
    // Emitir a listeners
    this.emit('messageFailed', data);
});

// ChatModal.tsx
const handleMessageFailed = (payload: { tempId?: string; error: string }) => {
    if (payload.tempId) {
        // Marcar mensaje como fallido en UI
        setMessages(prev => prev.map(msg => {
            if (msg.tempId === payload.tempId) {
                return { ...msg, failed: true };  // Flag de error
            }
            return msg;
        }));

        // Mostrar alerta
        Alert.alert('Error', payload.error || 'No se pudo enviar el mensaje');
    }
};
```

### Error 3: Sin Conexión a Internet

```typescript
// ChatService.ts - sendToServer()
try {
    const sentViaWS = ChatWebSocket.sendMessage(payload);
    if (!sentViaWS) {
        const serverMessage = await ChatApiClient.sendMessage(payload);
        // ...
    }
} catch (error) {
    console.log('❌ ERROR ENVIANDO AL SERVIDOR');
    
    // Marcar mensaje como fallido en SQLite
    if (message.tempId) {
        await ChatDatabase.markMessageAsFailed(message.tempId);
    }
    
    // El mensaje queda en SQLite con tempId
    // Se puede reintentar más tarde
}
```

**Estado en UI:**
- Mensaje se queda con ⏳ o muestra ⚠️
- Usuario puede reintentar manualmente
- Al recuperar conexión, se puede sincronizar

---

## 🐛 Debugging

### Agregar Logs Completos

#### En `ChatModal.tsx`:

```typescript
const handleSendMessage = async () => {
    const text = inputText.trim();
    
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  📤 USUARIO PRESIONA ENVIAR                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📝 INPUT:');
    console.log('   ├─ Texto:', text);
    console.log('   ├─ Longitud:', text.length);
    console.log('   └─ Destinatario:', otherUserId);
    console.log('');

    if (!isValidMessage(text)) {
        console.log('❌ Mensaje inválido (vacío o solo espacios)');
        return;
    }

    try {
        setSending(true);
        console.log('🔒 Bloqueando botón de enviar...');
        
        setInputText('');
        console.log('🧹 Input limpiado');

        console.log('');
        console.log('🚀 Llamando ChatService.sendMessage()...');
        const newMessage = await ChatService.sendMessage(otherUserId, text);
        
        console.log('');
        console.log('✅ MENSAJE RECIBIDO DEL SERVICE:');
        console.log('   ├─ ID:', newMessage.id);
        console.log('   ├─ Temp ID:', newMessage.tempId);
        console.log('   ├─ Chat ID:', newMessage.chatId);
        console.log('   └─ Timestamp:', newMessage.createdAt);
        console.log('');

        console.log('🎨 Agregando a la UI (Optimistic Update)...');
        setMessages(prev => [newMessage, ...prev]);
        console.log('✅ Mensaje agregado a la lista');
        console.log('');

    } catch (error: any) {
        console.log('');
        console.log('❌ ERROR EN ENVÍO:');
        console.log('   └─', error.message || error);
        console.log('');
        
        Alert.alert('Error', error.message || 'No se pudo enviar el mensaje');
        setInputText(text);  // Restaurar texto
    } finally {
        setSending(false);
        console.log('🔓 Desbloqueando botón de enviar');
        console.log('');
    }
};
```

#### Verificar Estado de WebSocket:

```typescript
// Antes de enviar
console.log('🔌 Estado WebSocket:', ChatWebSocket.getConnectionState());
console.log('🔌 ¿Conectado?:', ChatWebSocket.isConnected());
```

#### Verificar SQLite:

```typescript
// Después de guardar
const savedMessages = await ChatDatabase.getMessages(chatId, 0, 10);
console.log('💾 Mensajes en SQLite:', savedMessages.length);
console.log('💾 Último mensaje:', savedMessages[0]);
```

---

## 📚 Resumen del Flujo

### ✅ Pasos Clave

1. **Usuario escribe y presiona enviar** → `handleSendMessage()`
2. **Se valida el texto** → No vacío, max 1000 chars
3. **Se genera UUID único** → `tempId`
4. **Se guarda en SQLite** → Con `tempId` como `id`
5. **Se muestra en UI** → Con reloj ⏳ (optimistic update)
6. **Se envía al servidor** → WebSocket o REST API (background)
7. **Servidor guarda en BD** → Genera ID real
8. **Servidor confirma** → emit('messageSent') con `tempId` + `id real`
9. **Cliente recibe confirmación** → Busca mensaje por `tempId`
10. **Se actualiza SQLite** → UPDATE `id`, quitar `tempId`
11. **Se actualiza UI** → Reemplaza mensaje, quita ⏳, muestra ✓
12. **Estados posteriores** → ✓✓ entregado, 👁️ leído

### 🎯 Ventajas del Sistema

✅ **Respuesta inmediata** - El usuario ve su mensaje al instante
✅ **Tolerante a fallos** - Si falla WebSocket, usa REST API
✅ **Sin duplicados** - El `tempId` asegura identificación única
✅ **Persistente** - Se guarda en SQLite antes de confirmar
✅ **Estados visuales** - El usuario ve el progreso del mensaje
✅ **Re-intentos** - Mensajes fallidos quedan guardados para reintentar

### ⚠️ Consideraciones

- El `tempId` debe ser **único** (UUID v4)
- Debe enviarse al servidor para identificar la confirmación
- SQLite debe actualizarse tanto en UI como en background
- Evitar duplicados al recibir confirmación
- Manejar errores de red gracefully

---

**Última actualización:** 22 de Octubre, 2025
