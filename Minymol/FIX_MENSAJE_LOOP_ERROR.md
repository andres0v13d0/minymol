# 🔧 Fix: Loop Infinito y Error de Base de Datos en Mensajes

**Fecha:** 22 de Octubre, 2025

## 🐛 Problemas Encontrados

### 1. Error de Base de Datos
```
Error: no such column: status
```

La tabla `messages` en SQLite **NO tenía** la columna `status`, pero el código intentaba actualizarla.

### 2. Loop Infinito de `messageFailed`

El evento `messageFailed` se estaba procesando múltiples veces:
- Se recibía el evento del servidor
- Se intentaba actualizar la BD (fallaba por la columna faltante)
- Se re-emitía el evento en el `catch`
- Esto causaba un loop infinito

```
LOG  ❌ ERROR AL ENVIAR MENSAJE (WebSocket)
LOG  ❌ Mensaje falló, intentando por REST...
LOG  ❌ Mensaje falló, intentando por REST...
LOG  ❌ Mensaje falló, intentando por REST...
... (repetido múltiples veces)
```

---

## ✅ Soluciones Implementadas

### 1. Agregar Columna `status` a la Tabla SQLite

**Archivo:** `services/chat/ChatDatabase.js`

#### a) Actualizar esquema de creación de tabla:
```javascript
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId INTEGER NOT NULL,
    receiverId INTEGER NOT NULL,
    message TEXT NOT NULL,
    messageType TEXT DEFAULT 'TEXT',
    fileUrl TEXT,
    isDelivered INTEGER DEFAULT 0,
    isRead INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    chatId TEXT NOT NULL,
    isSentByMe INTEGER DEFAULT 0,
    tempId TEXT,
    status TEXT DEFAULT 'sent'  // ← NUEVA COLUMNA
);
```

#### b) Agregar migración automática:
```javascript
// Migración: Agregar columna status si no existe
try {
    await this.db.execAsync(`
        ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'sent';
    `);
    console.log('✅ Columna "status" agregada a la tabla messages');
} catch (error) {
    // Si la columna ya existe, ignorar el error
    if (error.message && error.message.includes('duplicate column')) {
        console.log('ℹ️ Columna "status" ya existe');
    } else {
        console.log('ℹ️ Migración de columna status:', error.message);
    }
}
```

### 2. Mejorar Método `updateMessageStatus`

**Antes:**
```javascript
async updateMessageStatus(messageId, isDelivered, isRead) {
    // Solo actualizaba isDelivered e isRead
}
```

**Después:**
```javascript
async updateMessageStatus(messageId, isDelivered, isRead, status) {
    const updates = [];
    const params = [];

    if (isDelivered !== undefined && isDelivered !== null) {
        updates.push('isDelivered = ?');
        params.push(isDelivered ? 1 : 0);
    }

    if (isRead !== undefined && isRead !== null) {
        updates.push('isRead = ?');
        params.push(isRead ? 1 : 0);
    }

    // ✅ NUEVO: Soporte para campo status
    if (status !== undefined && status !== null) {
        updates.push('status = ?');
        params.push(status);
    }

    if (updates.length === 0) return;

    params.push(messageId);
    const sql = `UPDATE messages SET ${updates.join(', ')} WHERE id = ? OR tempId = ?`;
    params.push(messageId); // Agregar segundo parámetro para tempId
    await this.execute(sql, params);
}
```

### 3. Mejorar `markMessageAsFailed`

**Antes:**
```javascript
async markMessageAsFailed(tempId) {
    const sql = `UPDATE messages SET isDelivered = 0 WHERE tempId = ?`;
    await this.execute(sql, [tempId]);
}
```

**Después:**
```javascript
async markMessageAsFailed(tempId) {
    const sql = `UPDATE messages SET isDelivered = 0, status = 'failed' WHERE tempId = ? OR id = ?`;
    await this.execute(sql, [tempId, tempId]);
}
```

### 4. Corregir Loop en Listener `messageFailed`

**Archivo:** `services/chat/ChatService.js`

**Antes:**
```javascript
ChatWebSocket.on('messageFailed', async (data) => {
    try {
        // Intentar actualizar BD
        await ChatDatabase.updateMessageStatus(...);
        this.emit('messageFailed', data);
    } catch (error) {
        // ❌ RE-EMITÍA el evento, causando loop
        this.emit('messageFailed', data);
    }
});
```

**Después:**
```javascript
ChatWebSocket.on('messageFailed', async (data) => {
    try {
        console.log('║  ❌ MENSAJE FALLÓ EN EL SERVIDOR  ║');
        
        // Intentar marcar como fallido en SQLite
        if (data.tempId) {
            try {
                await ChatDatabase.updateMessageStatus(
                    data.tempId,
                    null,
                    null,
                    'failed'
                );
                console.log('💾 Mensaje marcado como fallido en SQLite');
            } catch (dbError) {
                // ✅ NO re-emitir, solo loguear
                console.error('⚠️ No se pudo actualizar estado en SQLite:', dbError.message);
            }
        }
        
        // ✅ Emitir SOLO UNA VEZ
        this.emit('messageFailed', data);

    } catch (error) {
        console.error('❌ Error procesando mensaje fallido:', error);
        // ✅ NO re-emitir para evitar loops
    }
});
```

### 5. Mejorar Logs en WebSocket

**Archivo:** `services/chat/ChatWebSocket.js`

Agregamos el `tempId` a los logs para mejor debugging:

```javascript
sendMessage(payload) {
    console.log('📤 ENVIANDO MENSAJE (WebSocket):');
    console.log('   ├─ Evento: sendMessage');
    console.log('   ├─ De:', payload.senderId);
    console.log('   ├─ Para:', payload.receiverId);
    console.log('   ├─ Tipo:', payload.messageType);
    console.log('   ├─ Temp ID:', payload.tempId);  // ← AGREGADO
    console.log('   └─ Socket ID:', this.socket?.id);
}
```

### 6. Mejorar UI en `ChatModal.js`

**Archivo:** `components/chat/ChatModal.js`

```javascript
const handleMessageFailed = (payload) => {
    console.log('❌ MANEJANDO MENSAJE FALLIDO:');
    console.log('   ├─ Temp ID:', payload.tempId);
    console.log('   └─ Error:', payload.error);
    
    if (payload.tempId) {
        // Marcar el mensaje como fallido en UI
        setMessages(prev => prev.map(msg => {
            if (msg.tempId === payload.tempId || msg.id === payload.tempId) {
                return { 
                    ...msg, 
                    failed: true,
                    status: 'failed'  // ✅ Esto mostrará ❌ en el MessageBubble
                };
            }
            return msg;
        }));

        // Mostrar alerta al usuario
        Alert.alert(
            'Error al enviar', 
            payload.error || 'No se pudo enviar el mensaje. Verifica tu conexión.'
        );
    }
};
```

---

## 🎯 Flujo Correcto del Manejo de Errores

### Escenario 1: WebSocket NO disponible

```
1. Usuario envía mensaje
2. ChatService.sendMessage() crea tempId
3. Guarda en SQLite con status='sending'
4. Intenta WebSocket → retorna false
5. ✅ Usa REST API inmediatamente
6. Si REST API OK → actualiza con ID real
7. Si REST API falla → marca status='failed'
```

### Escenario 2: WebSocket disponible pero falla en servidor

```
1. Usuario envía mensaje
2. ChatService.sendMessage() crea tempId
3. Guarda en SQLite con status='sending'
4. Intenta WebSocket → retorna true
5. Servidor recibe pero falla (permisos, etc.)
6. Servidor emite 'messageFailed' con tempId
7. ✅ ChatService recibe evento UNA SOLA VEZ
8. Actualiza SQLite: status='failed'
9. ✅ Emite a UI UNA SOLA VEZ
10. UI muestra ❌ y alerta al usuario
```

---

## 📊 Estados del Mensaje

| Estado | Icono | Descripción |
|--------|-------|-------------|
| `sending` | ⏳ | Enviando al servidor |
| `sent` | ✓ | Enviado y confirmado |
| `delivered` | ✓✓ | Entregado al destinatario |
| `read` | ✓✓ (azul) | Leído por el destinatario |
| `failed` | ❌ | Error al enviar |

---

## 🧪 Testing

Para probar que todo funciona:

1. **Cerrar la app completamente**
2. **Reiniciar la app** (para que se ejecute la migración de BD)
3. **Enviar un mensaje** (debería funcionar sin loops)
4. **Desconectar WiFi y enviar** (debería mostrar error limpiamente)

---

## 📝 Notas Importantes

- ✅ La migración de base de datos se ejecuta automáticamente al iniciar
- ✅ Es segura: si la columna ya existe, se ignora el error
- ✅ No hay pérdida de datos
- ✅ El loop infinito está completamente corregido
- ✅ Los logs son más claros para debugging

---

**Última actualización:** 22 de Octubre, 2025
