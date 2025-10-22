/**
 * ChatWebSocket - Gestor de WebSocket para mensajes en tiempo real usando Socket.IO
 * Minymol Minoristas
 */

import { io } from 'socket.io-client';

class ChatWebSocket {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.token = null;
        this.userId = null;
        this.isManuallyDisconnected = false;
    }

    /**
     * Conectar al servidor WebSocket con Socket.IO
     */
    connect(token, userId) {
        if (this.isConnected()) {
            console.log('⚠️ Socket.IO ya está conectado');
            return;
        }

        this.token = token;
        this.userId = userId;
        this.isManuallyDisconnected = false;

        try {
            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log('║  🔌 INICIANDO CONEXIÓN WEBSOCKET                             ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('📍 DETALLES DE CONEXIÓN:');
            console.log('   ├─ API Base: https://api.minymol.com');
            console.log('   ├─ Socket URL: wss://api.minymol.com/socket.io/');
            console.log('   ├─ Protocolo: WebSocket (wss://) con fallback a HTTP polling');
            console.log('   ├─ Usuario ID:', userId);
            console.log('   ├─ Token:', token ? `${token.substring(0, 15)}...` : 'NO TOKEN');
            console.log('   └─ Librería: Socket.IO Client');
            console.log('');
            console.log('⚙️  CONFIGURACIÓN:');
            console.log('   ├─ Transports: [websocket, polling]');
            console.log('   ├─ Reconexión automática: SÍ');
            console.log('   ├─ Intentos máximos:', this.maxReconnectAttempts);
            console.log('   ├─ Delay inicial: 3000ms');
            console.log('   ├─ Delay máximo: 10000ms');
            console.log('   └─ Timeout: 20000ms');
            console.log('');
            console.log('🚀 Intentando conexión...');

            // Socket.IO convierte automáticamente https:// a wss://
            this.socket = io('https://api.minymol.com', {
                transports: ['websocket', 'polling'], // Intentar WebSocket primero, fallback a polling
                auth: {
                    token,
                    userId
                },
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 3000,
                reconnectionDelayMax: 10000,
                timeout: 20000,
            });

            this.setupSocketListeners();

        } catch (error) {
            console.log('');
            console.log('❌ ERROR EN INICIALIZACIÓN:');
            console.log('   └─', error);
            console.log('');
            this.emit('error', error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Configurar listeners de Socket.IO
     */
    setupSocketListeners() {
        if (!this.socket) return;

        // Conexión exitosa
        this.socket.on('connect', () => {
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log('║  ✅ WEBSOCKET CONECTADO EXITOSAMENTE                         ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('📊 INFORMACIÓN DE CONEXIÓN:');
            console.log('   ├─ Socket ID:', this.socket?.id);
            console.log('   ├─ Transport:', this.socket?.io.engine.transport.name);
            console.log('   ├─ Usuario ID:', this.userId);
            console.log('   └─ Estado: CONECTADO ✅');
            console.log('');
            console.log('🎧 Escuchando eventos:');
            console.log('   ├─ receiveMessage (mensajes entrantes)');
            console.log('   ├─ messageSent (confirmaciones)');
            console.log('   ├─ messageDelivered (entregados ✓✓)');
            console.log('   ├─ messageRead (leídos 👁️)');
            console.log('   └─ error (errores del servidor)');
            console.log('');
            this.reconnectAttempts = 0;
            this.emit('connected', undefined);
        });

        // Error de conexión
        this.socket.on('connect_error', (error) => {
            this.reconnectAttempts++;
            
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log('║  ❌ ERROR DE CONEXIÓN WEBSOCKET                               ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('🔍 DETALLES DEL ERROR:');
            console.log('   ├─ Mensaje:', error.message);
            console.log('   ├─ Tipo:', error.name);
            console.log('   ├─ Intento:', `${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            console.log('   └─ URL intentada: wss://api.minymol.com/socket.io/');
            console.log('');
            
            if (this.reconnectAttempts <= this.maxReconnectAttempts) {
                console.log('🔄 Reintentando conexión automáticamente...');
                console.log(`   └─ Próximo intento en: ${Math.min(3000 * this.reconnectAttempts, 10000)}ms`);
            } else {
                console.log('⚠️  MÁXIMOS INTENTOS ALCANZADOS');
                console.log('');
                console.log('📱 MODO FALLBACK ACTIVADO:');
                console.log('   └─ El chat funcionará usando solo REST API');
                console.log('      (https://api.minymol.com/chat/*)');
                console.log('   └─ Sin mensajes en tiempo real');
                console.log('   └─ Sincronización manual/por polling');
                console.log('');
                // Desconectar completamente para evitar más intentos
                this.socket?.close();
                this.socket = null;
            }
            console.log('');
        });

        // Desconexión
        this.socket.on('disconnect', (reason) => {
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log('║  🔌 WEBSOCKET DESCONECTADO                                    ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('📊 INFORMACIÓN:');
            console.log('   ├─ Razón:', reason);
            console.log('   ├─ Socket ID previo:', this.socket?.id || 'N/A');
            console.log('   └─ Estado: DESCONECTADO ❌');
            console.log('');
            
            if (reason === 'io server disconnect') {
                console.log('⚠️  El servidor cerró la conexión');
                console.log('   └─ Posibles causas:');
                console.log('      • Token expirado');
                console.log('      • Servidor reiniciado');
                console.log('      • Sesión invalidada');
            } else if (reason === 'io client disconnect') {
                console.log('ℹ️  Desconexión manual del cliente');
            } else if (reason === 'ping timeout') {
                console.log('⚠️  Timeout de ping (sin respuesta del servidor)');
            } else if (reason === 'transport close') {
                console.log('⚠️  Transporte cerrado inesperadamente');
            }
            console.log('');
            
            this.emit('disconnected', undefined);
        });

        // Mensaje nuevo recibido
        this.socket.on('receiveMessage', (data) => {
            console.log('');
            console.log('📨 MENSAJE NUEVO RECIBIDO (WebSocket):');
            console.log('   ├─ De:', data.senderId);
            console.log('   ├─ Para:', data.receiverId);
            console.log('   ├─ Mensaje:', data.message);
            console.log('   └─ Timestamp:', new Date().toISOString());
            console.log('');
            this.emit('newMessage', data);
        });

        // Confirmación de mensaje enviado
        this.socket.on('messageSent', (data) => {
            console.log('');
            console.log('✅ CONFIRMACIÓN DE ENVÍO (WebSocket):');
            console.log('   ├─ Temp ID:', data.tempId || 'N/A');
            console.log('   ├─ Mensaje ID real:', data.message?.id);
            console.log('   ├─ Estado:', data.status);
            console.log('   ├─ De:', data.message?.senderId);
            console.log('   ├─ Para:', data.message?.receiverId);
            console.log('   └─ Timestamp:', data.timestamp);
            console.log('');
            this.emit('messageSent', data);
        });

        // Mensajes marcados como entregados (doble check ✓✓)
        this.socket.on('messageDelivered', (data) => {
            console.log('');
            console.log('✅ MENSAJES ENTREGADOS (WebSocket):');
            console.log('   ├─ Receptor:', data.receiverId, '(los mensajes enviados a este usuario)');
            console.log('   ├─ Estado:', data.status);
            console.log('   └─ Timestamp:', data.timestamp);
            console.log('');
            this.emit('messageDelivered', data);
        });

        // Mensajes marcados como leídos (check azul)
        this.socket.on('messageRead', (data) => {
            console.log('');
            console.log('👁️ MENSAJES LEÍDOS (WebSocket):');
            console.log('   ├─ Receptor:', data.receiverId, '(los mensajes enviados a este usuario)');
            console.log('   ├─ Estado:', data.status);
            console.log('   └─ Timestamp:', data.timestamp);
            console.log('');
            this.emit('messageRead', data);
        });

        // Error al enviar mensaje
        this.socket.on('messageFailed', (data) => {
            console.log('');
            console.log('❌ ERROR AL ENVIAR MENSAJE (WebSocket):');
            console.log('   ├─ Temp ID:', data.tempId);
            console.log('   ├─ Error:', data.error);
            console.log('   └─ Timestamp:', data.timestamp);
            console.log('');
            this.emit('messageFailed', data);
        });

        // Error del servidor
        this.socket.on('error', (data) => {
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log('║  ❌ ERROR DEL SERVIDOR WEBSOCKET                              ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('🔍 DETALLES:');
            console.log('   ├─ Mensaje:', data.message || 'Error desconocido');
            console.log('   ├─ Código:', data.code || 'N/A');
            console.log('   └─ Data:', JSON.stringify(data, null, 2));
            console.log('');
            this.emit('error', new Error(data.message || 'Socket.IO server error'));
        });
    }

    /**
     * Enviar mensaje via Socket.IO
     */
    sendMessage(payload) {
        if (!this.isConnected()) {
            console.log('');
            console.log('⚠️  WEBSOCKET NO DISPONIBLE');
            console.log('   └─ Usando REST API como fallback');
            console.log('      (POST https://api.minymol.com/chat/message)');
            console.log('');
            return false;
        }

        try {
            console.log('');
            console.log('📤 ENVIANDO MENSAJE (WebSocket):');
            console.log('   ├─ Evento: sendMessage');
            console.log('   ├─ De:', payload.senderId);
            console.log('   ├─ Para:', payload.receiverId);
            console.log('   ├─ Tipo:', payload.messageType);
            console.log('   ├─ Temp ID:', payload.tempId);
            console.log('   └─ Socket ID:', this.socket?.id);
            console.log('');
            
            this.socket.emit('sendMessage', payload);
            
            console.log('✅ Mensaje enviado por WebSocket');
            console.log('   └─ Esperando confirmación del servidor...');
            console.log('');
            
            return true;
        } catch (error) {
            console.log('');
            console.log('❌ ERROR ENVIANDO POR WEBSOCKET:');
            console.log('   ├─ Error:', error);
            console.log('   └─ Fallback a REST API activado');
            console.log('');
            return false;
        }
    }

    /**
     * Marcar mensajes como entregados
     */
    markAsDelivered(senderId, receiverId) {
        if (!this.isConnected()) {
            return false;
        }

        try {
            console.log('📬 Marcando mensajes como entregados:', { senderId, receiverId });
            this.socket.emit('markAsDelivered', { senderId, receiverId });
            return true;
        } catch (error) {
            console.log('❌ Error marcando como entregado:', error);
            return false;
        }
    }

    /**
     * Marcar mensajes como leídos
     */
    markAsRead(senderId, receiverId) {
        if (!this.isConnected()) {
            return false;
        }

        try {
            console.log('👁️ Marcando mensajes como leídos:', { senderId, receiverId });
            this.socket.emit('markAsRead', { senderId, receiverId });
            return true;
        } catch (error) {
            console.log('❌ Error marcando como leído:', error);
            return false;
        }
    }

    /**
     * Verificar si está conectado
     */
    isConnected() {
        return this.socket !== null && this.socket.connected;
    }

    /**
     * Desconectar Socket.IO
     */
    disconnect() {
        console.log('🔌 Desconectando Socket.IO...');

        this.isManuallyDisconnected = true;

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        this.token = null;
        this.userId = null;
        this.reconnectAttempts = 0;

        console.log('✅ Socket.IO desconectado');
    }

    /**
     * Agregar listener para un evento
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        this.listeners.get(event).push(callback);
    }

    /**
     * Remover listener de un evento
     */
    off(event, callback) {
        const eventListeners = this.listeners.get(event);
        if (!eventListeners) return;

        const index = eventListeners.indexOf(callback);
        if (index > -1) {
            eventListeners.splice(index, 1);
        }
    }

    /**
     * Remover todos los listeners
     */
    removeAllListeners() {
        this.listeners.clear();
    }

    /**
     * Emitir evento a los listeners
     */
    emit(event, data) {
        const eventListeners = this.listeners.get(event);
        if (!eventListeners) return;

        eventListeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Error en listener de ${event}:`, error);
            }
        });
    }

    /**
     * Obtener estado de la conexión
     */
    getConnectionState() {
        if (!this.socket) return 'DISCONNECTED';
        return this.socket.connected ? 'CONNECTED' : 'DISCONNECTED';
    }
}

// Exportar instancia única (Singleton)
export default new ChatWebSocket();
