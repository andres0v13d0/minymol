# 🟢 Estado "En Línea" - Flujo Completo

Este documento explica cómo funciona la detección y comunicación del estado "en línea" entre usuarios en el sistema de chat de Minymol Mayoristas.

---

## 📋 Tabla de Contenidos

1. [Resumen General](#resumen-general)
2. [Lado del Cliente: Envío de Estado](#lado-del-cliente-envío-de-estado)
3. [Lado del Servidor: Procesamiento](#lado-del-servidor-procesamiento)
4. [Lado del Cliente: Recepción de Estado](#lado-del-cliente-recepción-de-estado)
5. [Flujo Completo Visual](#flujo-completo-visual)
6. [Debugging y Troubleshooting](#debugging-y-troubleshooting)

---

## 🎯 Resumen General

El sistema de estado "en línea" funciona mediante:

1. **WebSocket Connection**: El usuario se conecta → Backend marca como "online"
2. **Heartbeat/Ping**: Mantiene la conexión activa
3. **Polling REST API**: Otros usuarios verifican el estado cada 30 segundos
4. **WebSocket Events**: (Opcional) Eventos en tiempo real de conexión/desconexión

### 🔑 Componentes Clave

| Componente | Archivo | Responsabilidad |
|------------|---------|-----------------|
| **Frontend WebSocket** | `ChatWebSocket.ts` | Conectar al servidor WebSocket |
| **Frontend Service** | `ChatService.ts` | Lógica de negocio y coordinación |
| **Frontend API Client** | `ChatApiClient.ts` | Llamadas HTTP REST |
| **Frontend UI** | `ChatModal.tsx` | Mostrar estado visual |
| **Backend Socket.IO** | `server/socket.io` | Gestionar conexiones WebSocket |
| **Backend REST API** | `server/chat/routes` | Endpoint `/is-online/:userId` |
| **Backend Database** | `Redis/DB` | Almacenar estado de usuarios |

---

## 📤 Lado del Cliente: Envío de Estado

### 1️⃣ Inicialización de la App

**Archivo:** `components/chat/ProviderMessagesScreen.tsx`

```typescript
// Cuando el usuario abre la app de mensajes
const initializeChatModule = async () => {
    // 1. Obtener datos del usuario
    const userData = await AsyncStorage.getItem('providerUser');
    const user = JSON.parse(userData);
    const userId = user.id;

    // 2. Inicializar ChatService
    await ChatService.init(userId, userName);

    // 3. Conectar WebSocket
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        await ChatService.connectWebSocket(token);
    }
};
```

**🔍 ¿Qué pasa aquí?**
- Se obtiene el ID del usuario autenticado
- Se inicializa el servicio de chat
- Se obtiene el token de Firebase
- Se conecta al WebSocket con el token

---

### 2️⃣ Conexión WebSocket

**Archivo:** `services/chat/ChatService.ts`

```typescript
async connectWebSocket(token: string): Promise<void> {
    if (!this.currentUserId) {
        console.error('❌ ChatService no está inicializado');
        return;
    }

    console.log('🔌 Conectando WebSocket para usuario:', this.currentUserId);
    
    // Conectar WebSocket con token y userId
    ChatWebSocket.connect(token, this.currentUserId);

    // Configurar listeners
    ChatWebSocket.on('connected', () => {
        console.log('🎉 WebSocket conectado - Usuario ahora ONLINE');
    });
}
```

**🔍 ¿Qué pasa aquí?**
- Se pasa el token y el userId al WebSocket
- Se registran los event listeners
- Cuando se conecta exitosamente, el usuario está "online"

---

### 3️⃣ Establecimiento de Conexión Socket.IO

**Archivo:** `services/chat/ChatWebSocket.ts`

```typescript
connect(token: string, userId: number): void {
    console.log('🚀 Intentando conexión WebSocket...');
    console.log('   ├─ API Base: https://api.minymol.com');
    console.log('   ├─ Usuario ID:', userId);
    console.log('   └─ Token:', token.substring(0, 15) + '...');

    // Socket.IO convierte automáticamente https:// a wss://
    this.socket = io('https://api.minymol.com', {
        transports: ['websocket', 'polling'],
        auth: {
            token,      // ← Token de autenticación
            userId      // ← ID del usuario
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        timeout: 20000,
    });

    this.setupSocketListeners();
}
```

**🔍 ¿Qué pasa aquí?**
- Se crea una conexión Socket.IO
- Se envían **credenciales** en el objeto `auth`:
  - `token`: Token JWT de Firebase
  - `userId`: ID numérico del usuario
- El servidor recibirá estos datos en el evento `connection`

---

### 4️⃣ Confirmación de Conexión

**Archivo:** `services/chat/ChatWebSocket.ts`

```typescript
private setupSocketListeners(): void {
    // Evento: Conexión exitosa
    this.socket.on('connect', () => {
        console.log('✅ WEBSOCKET CONECTADO EXITOSAMENTE');
        console.log('   ├─ Socket ID:', this.socket?.id);
        console.log('   ├─ Transport:', this.socket?.io.engine.transport.name);
        console.log('   ├─ Usuario ID:', this.userId);
        console.log('   └─ Estado: CONECTADO ✅');
        
        this.reconnectAttempts = 0;
        this.emit('connected', undefined);
    });
}
```

**🔍 ¿Qué pasa aquí?**
- Socket.IO emite el evento `connect` cuando se conecta exitosamente
- Se obtiene un `socket.id` único
- Se notifica a toda la app que el WebSocket está conectado
- **EN ESTE MOMENTO, EL BACKEND MARCA AL USUARIO COMO "ONLINE"**

---

### 5️⃣ Mantener Conexión Activa (Heartbeat)

Socket.IO maneja esto automáticamente:

```typescript
// Socket.IO envía "ping" cada 25 segundos (default)
// Si no hay respuesta en 60 segundos, se desconecta

// Configuración en el cliente:
this.socket = io('https://api.minymol.com', {
    reconnection: true,           // Auto-reconectar si se cae
    reconnectionAttempts: 5,      // Intentos máximos
    reconnectionDelay: 3000,      // Espera 3s entre intentos
});
```

**🔍 ¿Qué pasa aquí?**
- Socket.IO envía "ping" automáticamente
- Si hay respuesta, la conexión permanece activa
- Si no hay respuesta, se desconecta y el usuario queda "offline"

---

## 🖥️ Lado del Servidor: Procesamiento

### 6️⃣ Recepción de Conexión (Backend)

**Archivo (Backend):** `server/socket/socket.controller.ts` o similar

```typescript
// Cuando un cliente se conecta
io.on('connection', async (socket) => {
    const { token, userId } = socket.handshake.auth;
    
    console.log('🔌 Nueva conexión WebSocket');
    console.log('   ├─ Socket ID:', socket.id);
    console.log('   ├─ Usuario ID:', userId);
    console.log('   └─ Token:', token?.substring(0, 15) + '...');

    try {
        // 1. Verificar token
        const decoded = await verifyFirebaseToken(token);
        if (!decoded || decoded.uid !== userId) {
            socket.disconnect();
            return;
        }

        // 2. Marcar usuario como ONLINE en Redis/DB
        await redisClient.set(`user:${userId}:online`, 'true', 'EX', 300);
        // Expira en 5 minutos si no hay actividad
        
        // 3. Guardar mapping socket.id → userId
        await redisClient.set(`socket:${socket.id}`, userId);
        
        // 4. Guardar userId → socket.id
        await redisClient.set(`user:${userId}:socket`, socket.id);
        
        // 5. Actualizar "last seen" en base de datos
        await db.users.update({
            where: { id: userId },
            data: { lastSeen: new Date(), isOnline: true }
        });

        console.log(`✅ Usuario ${userId} marcado como ONLINE`);
        
        // 6. Notificar a otros usuarios (opcional)
        socket.broadcast.emit('userConnected', {
            userId: userId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error en autenticación:', error);
        socket.disconnect();
    }
});
```

**🔍 ¿Qué pasa aquí?**
1. Se reciben las credenciales (`token` y `userId`)
2. Se verifica que el token sea válido
3. Se marca al usuario como "online" en **Redis** (caché rápida)
4. Se guarda el mapeo `socket.id ↔ userId`
5. Se actualiza la base de datos principal
6. Se puede notificar a otros usuarios conectados

---

### 7️⃣ Mantener Estado Online (Heartbeat)

**Archivo (Backend):** `server/socket/socket.controller.ts`

```typescript
// Cada vez que recibimos un evento del cliente
socket.on('ping', async () => {
    // Renovar el estado online
    await redisClient.expire(`user:${userId}:online`, 300); // 5 minutos más
    
    socket.emit('pong');
});

// O usar el ping automático de Socket.IO
socket.on('ping', async () => {
    // Actualizar timestamp
    await db.users.update({
        where: { id: userId },
        data: { lastSeen: new Date() }
    });
});
```

**🔍 ¿Qué pasa aquí?**
- Cada "ping" renueva el estado online
- Si no hay ping en 5 minutos, expira automáticamente

---

### 8️⃣ Manejo de Desconexión

**Archivo (Backend):** `server/socket/socket.controller.ts`

```typescript
socket.on('disconnect', async (reason) => {
    console.log('🔌 Usuario desconectado');
    console.log('   ├─ Socket ID:', socket.id);
    console.log('   ├─ Usuario ID:', userId);
    console.log('   └─ Razón:', reason);

    try {
        // 1. Marcar como OFFLINE en Redis
        await redisClient.del(`user:${userId}:online`);
        
        // 2. Limpiar mappings
        await redisClient.del(`socket:${socket.id}`);
        await redisClient.del(`user:${userId}:socket`);
        
        // 3. Actualizar base de datos
        await db.users.update({
            where: { id: userId },
            data: { 
                isOnline: false,
                lastSeen: new Date()
            }
        });

        console.log(`❌ Usuario ${userId} marcado como OFFLINE`);
        
        // 4. Notificar a otros usuarios
        socket.broadcast.emit('userDisconnected', {
            userId: userId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error en desconexión:', error);
    }
});
```

**🔍 ¿Qué pasa aquí?**
1. Se elimina el estado "online" de Redis
2. Se limpian los mappings
3. Se actualiza la base de datos con `isOnline: false`
4. Se guarda el timestamp de última conexión
5. Se notifica a otros usuarios

---

### 9️⃣ Endpoint REST: Verificar Estado

**Archivo (Backend):** `server/chat/chat.routes.ts`

```typescript
// GET /chat/is-online/:userId
router.get('/is-online/:userId', async (req, res) => {
    const { userId } = req.params;
    const requesterId = req.user.id; // Usuario que hace la consulta

    try {
        console.log(`📡 Verificando si usuario ${userId} está online`);
        console.log(`   └─ Solicitado por: ${requesterId}`);

        // Opción 1: Verificar en Redis (más rápido)
        const isOnlineRedis = await redisClient.get(`user:${userId}:online`);
        
        if (isOnlineRedis === 'true') {
            console.log(`✅ Usuario ${userId} está ONLINE (Redis)`);
            return res.json(true);
        }

        // Opción 2: Verificar en Base de Datos
        const user = await db.users.findUnique({
            where: { id: parseInt(userId) },
            select: { isOnline: true, lastSeen: true }
        });

        if (!user) {
            console.log(`❌ Usuario ${userId} no encontrado`);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Considerar "online" si la última vez fue hace menos de 5 minutos
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const isOnlineByActivity = user.lastSeen > fiveMinutesAgo;

        const isOnline = user.isOnline || isOnlineByActivity;

        console.log(`📊 Usuario ${userId}:`);
        console.log(`   ├─ isOnline (DB): ${user.isOnline}`);
        console.log(`   ├─ lastSeen: ${user.lastSeen}`);
        console.log(`   └─ Estado final: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

        res.json(isOnline);

    } catch (error) {
        console.error('❌ Error verificando estado online:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});
```

**🔍 ¿Qué pasa aquí?**
1. Se recibe el ID del usuario a verificar
2. Se busca primero en **Redis** (caché rápida)
3. Si no está en Redis, se busca en **Base de Datos**
4. Se considera "online" si:
   - `isOnline === true` en DB
   - O si `lastSeen` fue hace menos de 5 minutos
5. Se retorna `true` o `false`

---

## 📥 Lado del Cliente: Recepción de Estado

### 🔟 Verificación de Estado en UI

**Archivo:** `components/chat/ChatModal.tsx`

```typescript
const ChatModal: React.FC<ChatModalProps> = ({
    otherUserId,  // ← ID del usuario del que queremos saber el estado
    // ...
}) => {
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        if (visible) {
            // 1. Verificar estado inmediatamente
            checkOnlineStatus();
            
            // 2. Verificar cada 30 segundos
            const onlineInterval = setInterval(checkOnlineStatus, 30000);

            return () => {
                clearInterval(onlineInterval); // Limpiar al cerrar
            };
        }
    }, [visible]);

    const checkOnlineStatus = async () => {
        try {
            console.log('🔍 Verificando si usuario', otherUserId, 'está online...');
            
            const online = await ChatService.isUserOnline(otherUserId);
            
            console.log('📊 Resultado:', online ? '✅ ONLINE' : '❌ OFFLINE');
            
            setIsOnline(online);
        } catch (error) {
            console.error('❌ Error verificando estado online:', error);
        }
    };

    // ...
};
```

**🔍 ¿Qué pasa aquí?**
1. Cuando se abre el chat modal, se verifica el estado
2. Se establece un intervalo para verificar cada 30 segundos
3. El estado se guarda en el state `isOnline`
4. Al cerrar el modal, se limpia el intervalo

---

### 1️⃣1️⃣ Servicio de Verificación

**Archivo:** `services/chat/ChatService.ts`

```typescript
/**
 * Verificar si un usuario está online
 */
async isUserOnline(userId: number): Promise<boolean> {
    try {
        console.log('📞 Llamando API para verificar estado de usuario', userId);
        
        const isOnline = await ChatApiClient.isUserOnline(userId);
        
        console.log('📬 Respuesta recibida:', isOnline);
        
        return isOnline;
    } catch (error) {
        console.error('❌ Error verificando estado online:', error);
        return false;
    }
}
```

**🔍 ¿Qué pasa aquí?**
- Se delega la llamada HTTP al `ChatApiClient`
- Si hay error, se asume que está offline

---

### 1️⃣2️⃣ Cliente API REST

**Archivo:** `services/chat/ChatApiClient.ts`

```typescript
/**
 * Verificar si un usuario está online
 * GET /chat/is-online/:userId
 */
async isUserOnline(userId: number): Promise<boolean> {
    try {
        console.log('📡 GET https://api.minymol.com/chat/is-online/' + userId);
        
        const response = await apiCall(`${BASE_URL}/chat/is-online/${userId}`, {
            method: 'GET'
        });

        console.log('📥 Status Code:', response.status);
        console.log('📥 Response OK:', response.ok);

        if (!response.ok) {
            console.warn('⚠️ Error - Status:', response.status);
            return false; // ← Default: offline
        }

        const isOnline: boolean = await response.json();
        
        console.log('✅ Estado recibido del servidor:', isOnline);
        
        return isOnline;
    } catch (error) {
        console.error('❌ Error en request:', error);
        return false; // ← Default: offline
    }
}
```

**🔍 ¿Qué pasa aquí?**
1. Se hace un `GET` request a `/chat/is-online/{userId}`
2. Se incluye el token de autenticación en headers
3. Se parsea la respuesta como booleano
4. Si falla, se retorna `false` (offline por defecto)

---

### 1️⃣3️⃣ Visualización en UI

**Archivo:** `components/chat/ChatModal.tsx`

```typescript
<View style={styles.header}>
    <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>
            {otherUserName}
        </Text>
        
        {/* Indicador de estado */}
        <View style={styles.statusContainer}>
            {/* Punto de color */}
            <View style={[
                styles.statusDot,
                { 
                    backgroundColor: isOnline 
                        ? COLORS.online      // Verde #10b981
                        : COLORS.offline     // Gris #94a3b8
                }
            ]} />
            
            {/* Texto */}
            <Text style={styles.statusText}>
                {isOnline ? 'En línea' : 'Desconectado'}
            </Text>
        </View>
    </View>
</View>
```

**Estilos:**

```typescript
const COLORS = {
    online: '#10b981',      // Verde
    offline: '#94a3b8',     // Gris
};

const styles = StyleSheet.create({
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
        marginRight: 6,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    statusText: {
        fontSize: 13,
        fontFamily: getUbuntuFont('medium'),
        color: COLORS.secondaryText,
    },
});
```

**🔍 ¿Qué pasa aquí?**
- Se muestra un punto de color:
  - 🟢 **Verde** si `isOnline === true`
  - 🔴 **Gris** si `isOnline === false`
- Se muestra el texto correspondiente
- El diseño es limpio y minimalista

---

## 🔄 Flujo Completo Visual

### Diagrama de Secuencia

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Usuario A │         │   Backend   │         │   Usuario B │
│  (Proveedor)│         │  Socket.IO  │         │ (Comerciante│
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ 1. Abre app de chat   │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │ 2. connect(token, id) │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │                  3. Verifica token            │
       │                       │                       │
       │                  4. SET user:123:online=true  │
       │                       │                       │
       │                  5. UPDATE users SET isOnline │
       │                       │                       │
       │ 6. connected ✅       │                       │
       │<──────────────────────│                       │
       │                       │                       │
       │           7. broadcast: userConnected(123)    │
       │                       │──────────────────────>│
       │                       │                       │
       │         (Cada 25 segundos - automático)       │
       │ 8. ping               │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │                  9. EXPIRE user:123:online 300│
       │                       │                       │
       │ 10. pong              │                       │
       │<──────────────────────│                       │
       │                       │                       │
       │                       │  11. Abre chat con A  │
       │                       │<──────────────────────│
       │                       │                       │
       │                       │ 12. GET /is-online/123│
       │                       │<──────────────────────│
       │                       │                       │
       │                  13. GET user:123:online      │
       │                       │                       │
       │                       │ 14. response: true ✅ │
       │                       │──────────────────────>│
       │                       │                       │
       │                       │  15. Muestra "En línea"
       │                       │       con punto verde │
       │                       │                       │
       │ 16. Cierra app        │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │                  17. DEL user:123:online      │
       │                       │                       │
       │                  18. UPDATE isOnline=false    │
       │                       │                       │
       │           19. broadcast: userDisconnected(123)│
       │                       │──────────────────────>│
       │                       │                       │
       │                       │  20. Próximo polling  │
       │                       │      (30 seg después) │
       │                       │<──────────────────────│
       │                       │                       │
       │                       │ 21. GET /is-online/123│
       │                       │<──────────────────────│
       │                       │                       │
       │                  22. GET user:123:online=NULL │
       │                       │                       │
       │                       │ 23. response: false ❌│
       │                       │──────────────────────>│
       │                       │                       │
       │                       │ 24. Muestra "Desconect"
       │                       │      con punto gris   │
       │                       │                       │
```

---

## ⏱️ Timeline de Eventos

### Cuando Usuario A se conecta:

| Tiempo | Evento | Descripción |
|--------|--------|-------------|
| `t=0s` | Usuario A abre app | Inicia el proceso |
| `t=0.5s` | WebSocket connect | Se envía token y userId |
| `t=1s` | Backend verifica token | Valida autenticación |
| `t=1.5s` | Backend: SET Redis | `user:123:online = true` |
| `t=2s` | Backend: UPDATE DB | `isOnline = true` |
| `t=2.5s` | Evento: connected | Cliente recibe confirmación |
| `t=25s` | Ping automático | Socket.IO heartbeat |
| `t=50s` | Ping automático | Socket.IO heartbeat |

### Cuando Usuario B verifica estado:

| Tiempo | Evento | Descripción |
|--------|--------|-------------|
| `t=0s` | Usuario B abre chat con A | Inicia verificación |
| `t=0.1s` | GET /is-online/123 | Request HTTP |
| `t=0.3s` | Backend: GET Redis | Consulta caché |
| `t=0.4s` | Response: true | Usuario A está online |
| `t=0.5s` | UI: Punto verde + "En línea" | Renderiza estado |
| `t=30s` | Polling automático | Verifica nuevamente |
| `t=60s` | Polling automático | Verifica nuevamente |

---

## 🐛 Debugging y Troubleshooting

### ❌ Problema: Siempre muestra "Desconectado"

#### Checklist de Diagnóstico:

##### 1. **Verificar que el WebSocket esté conectado**

Agrega logs en `ChatWebSocket.ts`:

```typescript
this.socket.on('connect', () => {
    console.log('✅ WEBSOCKET CONECTADO');
    console.log('   ├─ Socket ID:', this.socket?.id);
    console.log('   ├─ Transport:', this.socket?.io.engine.transport.name);
    console.log('   └─ Usuario ID:', this.userId);
});
```

**Resultado esperado:**
```
✅ WEBSOCKET CONECTADO
   ├─ Socket ID: abc123xyz
   ├─ Transport: websocket
   └─ Usuario ID: 123
```

**Si no aparece:** El WebSocket NO se está conectando.

---

##### 2. **Verificar el endpoint REST**

Agrega logs en `ChatApiClient.ts`:

```typescript
async isUserOnline(userId: number): Promise<boolean> {
    console.log('📡 REQUEST: GET /chat/is-online/' + userId);
    
    const response = await apiCall(`${BASE_URL}/chat/is-online/${userId}`, {
        method: 'GET'
    });

    console.log('📥 RESPONSE Status:', response.status);
    console.log('📥 RESPONSE OK:', response.ok);

    if (!response.ok) {
        const error = await response.text();
        console.log('❌ ERROR Response:', error);
        return false;
    }

    const isOnline = await response.json();
    console.log('✅ isOnline:', isOnline);
    
    return isOnline;
}
```

**Resultado esperado:**
```
📡 REQUEST: GET /chat/is-online/123
📥 RESPONSE Status: 200
📥 RESPONSE OK: true
✅ isOnline: true
```

**Posibles errores:**
- `Status: 401` → Token inválido o expirado
- `Status: 404` → Usuario no encontrado
- `Status: 500` → Error del servidor
- `Response: false` → Usuario está offline

---

##### 3. **Verificar logs del backend**

En el servidor, verifica:

```bash
# Redis
redis-cli
> GET user:123:online
"true"  ← Debería aparecer si está online

# Base de datos
SELECT id, isOnline, lastSeen FROM users WHERE id = 123;
```

**Resultado esperado:**
```
id  | isOnline | lastSeen
123 | true     | 2025-10-22 14:30:00
```

---

##### 4. **Probar con cURL**

Desde la terminal:

```bash
# Obtener token
# Desde Firebase Console o desde la app

# Probar endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.minymol.com/chat/is-online/123
```

**Resultado esperado:**
```json
true
```

---

### ✅ Soluciones Comunes

#### Solución 1: Reiniciar WebSocket

```typescript
// En ChatService.ts
async reconnectWebSocket(): Promise<void> {
    this.disconnectWebSocket();
    
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
        const token = await firebaseUser.getIdToken(true); // Forzar refresh
        await this.connectWebSocket(token);
    }
}
```

#### Solución 2: Agregar eventos de WebSocket

Escuchar eventos de conexión/desconexión:

```typescript
// En ChatModal.tsx
useEffect(() => {
    // Escuchar cuando el otro usuario se conecta
    const handleUserConnected = (data: { userId: number }) => {
        if (data.userId === otherUserId) {
            console.log('🟢 Usuario', otherUserId, 'se conectó');
            setIsOnline(true);
        }
    };

    // Escuchar cuando el otro usuario se desconecta
    const handleUserDisconnected = (data: { userId: number }) => {
        if (data.userId === otherUserId) {
            console.log('🔴 Usuario', otherUserId, 'se desconectó');
            setIsOnline(false);
        }
    };

    ChatWebSocket.on('userConnected', handleUserConnected);
    ChatWebSocket.on('userDisconnected', handleUserDisconnected);

    return () => {
        ChatWebSocket.off('userConnected', handleUserConnected);
        ChatWebSocket.off('userDisconnected', handleUserDisconnected);
    };
}, [otherUserId]);
```

#### Solución 3: Reducir intervalo de polling

```typescript
// En lugar de 30 segundos, usar 10 segundos
const onlineInterval = setInterval(checkOnlineStatus, 10000);
```

#### Solución 4: Mostrar "last seen" como fallback

```typescript
// En ChatModal.tsx
<Text style={styles.statusText}>
    {isOnline 
        ? 'En línea' 
        : lastSeen 
            ? `Últ. vez: ${formatLastSeen(lastSeen)}`
            : 'Desconectado'
    }
</Text>
```

---

## 📊 Resumen de Flujo

### 🟢 Usuario se conecta (Online)

```
1. Usuario abre app
2. ChatService.connectWebSocket(token)
3. ChatWebSocket.connect(token, userId)
4. Socket.IO: emit('connection', { auth: { token, userId } })
5. Backend: Verifica token
6. Backend: SET user:123:online = 'true' (Redis)
7. Backend: UPDATE users SET isOnline = true (DB)
8. Cliente: Evento 'connected' → Usuario marcado como ONLINE
```

### 🔴 Usuario se desconecta (Offline)

```
1. Usuario cierra app o pierde conexión
2. Socket.IO: emit('disconnect')
3. Backend: DEL user:123:online (Redis)
4. Backend: UPDATE users SET isOnline = false (DB)
5. Backend: broadcast('userDisconnected', { userId: 123 })
```

### 👀 Otro usuario verifica estado

```
1. Usuario B abre chat con Usuario A
2. ChatModal: checkOnlineStatus()
3. ChatService.isUserOnline(userAId)
4. ChatApiClient.isUserOnline(userAId)
5. HTTP: GET /chat/is-online/123
6. Backend: GET user:123:online (Redis)
7. Backend: response JSON: true/false
8. ChatModal: setIsOnline(result)
9. UI: Renderiza punto verde/gris + texto
10. Repetir cada 30 segundos
```

---

## 🎯 Conclusión

El sistema de estado "en línea" funciona mediante:

1. **WebSocket Connection** → Marca como online automáticamente
2. **Redis Cache** → Respuesta rápida para consultas
3. **Database Persistence** → Registro permanente
4. **Heartbeat/Ping** → Mantiene conexión activa
5. **REST API Polling** → Verifica estado cada 30s
6. **WebSocket Events** → Notificaciones en tiempo real (opcional)

**Ventajas:**
- ✅ Detección automática de conexión
- ✅ Respuestas rápidas (Redis)
- ✅ Tolerante a fallos (fallback a DB)
- ✅ No requiere intervención manual

**Desventajas:**
- ❌ Delay de hasta 30 segundos en polling
- ❌ Depende de WebSocket estar conectado
- ❌ No funciona si el backend está caído

---

## 📚 Referencias

- [Socket.IO Authentication](https://socket.io/docs/v4/middlewares/#sending-credentials)
- [Redis SET with expiration](https://redis.io/commands/set/)
- [React Native WebSocket](https://reactnative.dev/docs/network)
- [Polling vs WebSocket](https://ably.com/topic/websockets-vs-polling)

---

**Última actualización:** 22 de Octubre, 2025
