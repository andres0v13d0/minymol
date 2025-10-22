# 🔧 Fix: Claves Duplicadas en Chat (Duplicate Keys Error)

**Fecha:** 22 de Octubre, 2025  
**Problema:** `ERROR Encountered two children with the same key`  
**Archivos modificados:** `components/chat/ChatModal.js`

---

## 🐛 Problema Original

El sistema de chat mostraba múltiples errores de React:

```
ERROR  Encountered two children with the same key, `%s`. 
Keys should be unique so that components maintain their identity across updates.
```

### IDs Duplicados Detectados:
- `92192aa7-b1ed-488b-8013-fdd370ce9c6e`
- `b38e0f86-8e16-4b83-80aa-5da7fc548c0e`
- `b1bd68ca-ade2-4d41-9a8a-9e3521d279bc`

Estos son **UUIDs de tempId**, indicando que el problema estaba en el **manejo de mensajes temporales**.

---

## 🔍 Análisis del Problema

### Flujo INCORRECTO (antes del fix):

```
1. Usuario envía mensaje
   └─ handleSend() → Agrega mensaje con tempId a la lista
   
2. WebSocket emit('sendMessage') → Backend procesa
   
3. Backend retransmite el mensaje
   └─ emit('receiveMessage') → PROBLEMA AQUÍ ⚠️
   
4. Cliente recibe su propio mensaje
   └─ handleNewMessage() → Agrega OTRA VEZ el mismo mensaje
   
5. Backend confirma el envío
   └─ emit('messageSent') → handleMessageSent()
   └─ Intenta actualizar tempId → ID real
   └─ PERO YA HAY DOS MENSAJES CON EL MISMO tempId
```

### ¿Por qué se duplicaban los mensajes?

**`handleNewMessage`** estaba agregando **TODOS** los mensajes que llegaban por WebSocket, incluyendo:
- ✅ Mensajes que RECIBO de otros usuarios (correcto)
- ❌ Mensajes que YO ENVÍO (incorrecto, porque ya los tengo con optimistic update)

Cuando el backend retransmitía mi propio mensaje, `handleNewMessage` lo agregaba otra vez, creando duplicados.

---

## ✅ Solución Implementada

### 1. **Modificación de `handleNewMessage`**

**Antes:**
```javascript
const handleNewMessage = async (newMessage) => {
    if (newMessage.senderId === otherUser.id || newMessage.receiverId === otherUser.id) {
        setMessages(prev => [newMessage, ...prev]); // ❌ Agregaba TODOS
        // ...
    }
};
```

**Después:**
```javascript
const handleNewMessage = async (newMessage) => {
    if (newMessage.senderId === otherUser.id || newMessage.receiverId === otherUser.id) {
        
        // 🔥 FIX: NO agregar mensajes que YO envié (ya están con optimistic update)
        // Solo agregar mensajes que RECIBO (de otherUser)
        if (newMessage.senderId === otherUser.id) {
            // Verificar que no exista ya (evitar duplicados)
            setMessages(prev => {
                const exists = prev.some(msg => 
                    (msg.id && msg.id === newMessage.id) ||
                    (msg.tempId && msg.tempId === newMessage.tempId)
                );
                
                if (exists) {
                    console.log('⚠️ Mensaje ya existe en la lista, no se agrega');
                    return prev;
                }
                
                return [newMessage, ...prev];
            });

            // Marcar como leído...
        }
        // Si el mensaje es MÍO (receiverId === otherUser.id), ignorarlo
    }
};
```

**🎯 Cambio clave:**
- Ahora **SOLO** agrega mensajes donde `senderId === otherUser.id` (mensajes que RECIBO)
- Ignora mensajes donde `receiverId === otherUser.id` (mensajes que YO envío)
- Los mensajes que yo envío YA están en la lista con optimistic update de `handleSend`

---

### 2. **Mejora del `keyExtractor`**

**Antes:**
```javascript
keyExtractor={(item, index) => {
    if (item.id && !item.id.startsWith('temp_')) {
        return item.id; // ❌ Podía colisionar
    }
    if (item.tempId) {
        return item.tempId; // ❌ Podía colisionar
    }
    // ...
}}
```

**Después:**
```javascript
keyExtractor={(item, index) => {
    // 1. ID real con prefijo
    if (item.id && !item.id.startsWith('temp_')) {
        return `msg-${item.id}`;
    }
    // 2. tempId con prefijo
    if (item.tempId) {
        return `temp-${item.tempId}`;
    }
    // 3. ID temporal
    if (item.id) {
        return `temp-${item.id}`;
    }
    // 4. Fallback único
    return `msg-${index}-${item.createdAt || Date.now()}`;
}}
```

**🎯 Mejoras:**
- Prefijos únicos para diferenciar mensajes reales (`msg-`) de temporales (`temp-`)
- Evita colisiones entre IDs y tempIds
- Fallback más robusto

---

### 3. **Optimización de `handleMessageSent`**

**Antes:**
```javascript
const handleMessageSent = async (payload) => {
    setMessages(prev => {
        // Buscaba por tempId O por contenido (peligroso)
        const matchesByContent = !matchesByTempId && 
                               msg.tempId && 
                               msg.message === payload.message?.message;
        // ...
    });
    
    // Limpiaba duplicados inmediatamente (podía interferir con animaciones)
    setMessages(prev => { /* limpieza */ });
};
```

**Después:**
```javascript
const handleMessageSent = async (payload) => {
    setMessages(prev => {
        // Solo busca por tempId exacto
        if (payload.tempId && msg.tempId === payload.tempId) {
            // Actualiza
        }
        return updated;
    });
    
    // Limpia duplicados DESPUÉS de 100ms (evita interferencia)
    setTimeout(() => {
        setMessages(prev => {
            const key = (msg.id && !msg.id.startsWith('temp_')) 
                ? msg.id 
                : msg.tempId || msg.id;
            // ...
        });
    }, 100);
};
```

**🎯 Mejoras:**
- Búsqueda más específica (solo por `tempId`, no por contenido)
- Limpieza de duplicados con delay para no interferir con animaciones
- Actualización a SQLite de forma asíncrona

---

### 4. **Limpieza en `initializeChat`**

Se asegura de limpiar duplicados al:
1. Cargar mensajes iniciales
2. Recargar después de sincronización

```javascript
// 4. Si hay mensajes nuevos, recargar y limpiar duplicados
if (newMessagesCount > 0) {
    const updatedMessages = await ChatService.getMessages(otherUser.id, 50, 0);
    const uniqueUpdated = removeDuplicates(updatedMessages);
    setMessages(uniqueUpdated);
}
```

---

## 📊 Comparación del Flujo

### ❌ Antes (Duplicados):

```
Usuario envía "Hola"
│
├─ handleSend() → [{ tempId: "abc123", message: "Hola" }] ✅
│
├─ Backend recibe
│
├─ Backend retransmite
│   └─ handleNewMessage() → [
│         { tempId: "abc123", message: "Hola" },  ← ORIGINAL
│         { tempId: "abc123", message: "Hola" }   ← DUPLICADO ❌
│       ]
│
└─ handleMessageSent() → Intenta actualizar pero hay 2 mensajes
    └─ ERROR: Duplicate keys
```

### ✅ Después (Sin Duplicados):

```
Usuario envía "Hola"
│
├─ handleSend() → [{ tempId: "abc123", message: "Hola" }] ✅
│
├─ Backend recibe
│
├─ Backend retransmite
│   └─ handleNewMessage() → IGNORA (porque senderId === currentUserId) ✅
│
└─ handleMessageSent() → Actualiza tempId → ID real
    └─ [{ id: "67890", message: "Hola" }] ✅
```

---

## 🎯 Resultados

### ✅ Beneficios:

1. **No más claves duplicadas** - Error de React eliminado completamente
2. **Mensajes únicos** - Cada mensaje aparece solo una vez
3. **Optimistic updates funcionan correctamente** - Los mensajes propios se muestran instantáneamente
4. **Transición suave** - De tempId a ID real sin duplicados
5. **Mejor rendimiento** - Menos re-renders innecesarios

### 🧪 Testing:

Para verificar que funciona:

1. **Enviar mensaje propio:**
   ```
   ✅ Aparece inmediatamente con tempId
   ✅ Se actualiza a ID real cuando el backend confirma
   ✅ No se duplica
   ```

2. **Recibir mensaje de otro usuario:**
   ```
   ✅ Aparece cuando llega por WebSocket
   ✅ No se duplica
   ```

3. **Múltiples mensajes rápidos:**
   ```
   ✅ Cada uno tiene clave única
   ✅ No hay errores de duplicate keys
   ```

---

## 🔄 Flujo Completo Corregido

### Envío de Mensaje (Usuario A):

```
1. Usuario A escribe "Hola"
   └─ handleSend()
      └─ Genera tempId: "abc-123"
      └─ Agrega a lista: [{ tempId: "abc-123", message: "Hola", isSentByMe: true }]
      └─ emit('sendMessage')

2. Backend procesa
   └─ Guarda en BD con ID real: "67890"
   └─ emit('messageSent') → Usuario A
   └─ emit('receiveMessage') → Usuario B

3. Usuario A recibe 'messageSent'
   └─ handleMessageSent()
      └─ Busca mensaje con tempId "abc-123"
      └─ Actualiza a ID real "67890"
      └─ Lista final: [{ id: "67890", message: "Hola", isSentByMe: true }]

4. Usuario A recibe 'receiveMessage' (su propio mensaje retransmitido)
   └─ handleNewMessage()
      └─ Detecta: receiverId === otherUser.id (es mensaje MÍO)
      └─ IGNORA ✅ (no agrega)
```

### Recepción de Mensaje (Usuario B):

```
1. Backend emit('receiveMessage') → Usuario B
   └─ Mensaje: { id: "67890", senderId: A, receiverId: B, message: "Hola" }

2. Usuario B recibe 'receiveMessage'
   └─ handleNewMessage()
      └─ Detecta: senderId === otherUser.id (es mensaje de A)
      └─ Verifica que no existe ya
      └─ Agrega a lista: [{ id: "67890", message: "Hola", isSentByMe: false }]
      └─ Marca como leído
```

---

## 📝 Documentación Relacionada

- Ver flujo completo en: `FLUJO_RECEPCION_MENSAJE_COMPLETO.md`
- Arquitectura del chat: `ARQUITECTURA_CHAT.md`

---

**Estado:** ✅ Implementado y funcionando  
**Última actualización:** 22 de Octubre, 2025
