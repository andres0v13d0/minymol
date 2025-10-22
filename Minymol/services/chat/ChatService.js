/**
 * ChatService - Orquestador principal del sistema de chat
 * Coordina WebSocket, REST API y SQLite
 * Minymol Minoristas
 */

import uuid from 'react-native-uuid';
import { getUserData } from '../../utils/apiUtils';
import ChatDatabase from './ChatDatabase';
import ChatWebSocket from './ChatWebSocket';
import ChatApiClient from './ChatApiClient';
import { MESSAGE_TYPES, MESSAGE_STATUS } from '../../types/chat';

class ChatService {
    constructor() {
        this.initialized = false;
        this.currentUserId = null;
        this.currentUserName = null;
        this.listeners = new Map();
        this.syncInProgress = false;
        this.syncingConversations = false; // Prevenir loop de sincronización
    }

    /**
     * Inicializar el servicio de chat
     */
    async init() {
        if (this.initialized) {
            return;
        }

        try {
            // 1. Obtener datos del usuario
            const userData = await getUserData();
            if (!userData?.id) {
                // Usuario no autenticado, no inicializar
                if (__DEV__) {
                    console.log('💬 Chat: Usuario no autenticado, esperando login...');
                }
                return;
            }

            this.currentUserId = userData.id;
            this.currentUserName = userData.nombre || 'Usuario';

            if (__DEV__) {
                console.log('');
                console.log('╔═══════════════════════════════════════════════════════════════╗');
                console.log('║  💬 INICIALIZANDO CHAT SERVICE                               ║');
                console.log('╚═══════════════════════════════════════════════════════════════╝');
                console.log('');
                console.log('📱 Usuario:', this.currentUserName, `(ID: ${this.currentUserId})`);
            }

            // 2. Inicializar base de datos SQLite (con reintentos)
            try {
                await ChatDatabase.init();
            } catch (dbError) {
                console.error('❌ Error crítico inicializando base de datos:', dbError);
                // No lanzar error, continuar con funcionalidad limitada
                if (__DEV__) {
                    console.log('⚠️ Chat funcionará en modo limitado (sin persistencia local)');
                }
            }

            // 3. Limpiar mensajes viejos (solo si la BD está lista)
            if (ChatDatabase.isInitialized) {
                try {
                    await ChatDatabase.cleanOldMessages();
                } catch (cleanError) {
                    if (__DEV__) {
                        console.log('💬 Error limpiando mensajes antiguos (no crítico):', cleanError.message);
                    }
                }
            }

            // 4. Conectar WebSocket
            this.setupWebSocketListeners();
            
            // Obtener token de Firebase (con manejo de errores)
            try {
                const { auth } = await import('../../config/firebase');
                const token = await auth.currentUser?.getIdToken();

                if (token) {
                    ChatWebSocket.connect(token, this.currentUserId);
                } else {
                    if (__DEV__) {
                        console.log('⚠️ No hay token de Firebase, WebSocket no se conectará');
                    }
                }
            } catch (firebaseError) {
                if (__DEV__) {
                    console.log('⚠️ Error obteniendo token de Firebase:', firebaseError.message);
                    console.log('💬 Chat funcionará sin WebSocket (solo REST API)');
                }
            }

            // 5. Sincronizar mensajes iniciales (solo si la BD está lista)
            if (ChatDatabase.isInitialized) {
                try {
                    await this.syncUnreadMessages();
                } catch (syncError) {
                    if (__DEV__) {
                        console.log('💬 Error sincronizando mensajes (no crítico):', syncError.message);
                    }
                }
            }

            this.initialized = true;

            if (__DEV__) {
                console.log('╔═══════════════════════════════════════════════════════════════╗');
                console.log('║  ✅ CHAT SERVICE LISTO                                        ║');
                console.log('╚═══════════════════════════════════════════════════════════════╝');
                console.log('');
            }

        } catch (error) {
            if (__DEV__) {
                console.log('💬 Chat no disponible:', error.message);
            }
            throw error;
        }
    }

    /**
     * Configurar listeners de WebSocket
     */
    setupWebSocketListeners() {
        // Mensaje nuevo recibido
        ChatWebSocket.on('newMessage', async (data) => {
            try {
                console.log('📨 Procesando mensaje nuevo de WebSocket...');

                const chatId = ChatDatabase.generateChatId(data.senderId, data.receiverId);

                // Guardar en SQLite
                await ChatDatabase.saveMessage({
                    id: data.id,
                    senderId: data.senderId,
                    receiverId: data.receiverId,
                    message: data.message,
                    messageType: data.messageType || 'TEXT',
                    isDelivered: true, // Ya llegó a nosotros
                    isRead: false,
                    isDeleted: false,
                    createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
                    updatedAt: data.updatedAt || data.timestamp || new Date().toISOString(),
                    chatId: chatId,
                    isSentByMe: data.senderId === this.currentUserId
                });

                // Actualizar conversación
                await this.updateConversationFromMessage(data);

                // Notificar a la UI
                this.emit('newMessage', data);

                // Marcar como entregado automáticamente
                if (ChatWebSocket.isConnected()) {
                    ChatWebSocket.markAsDelivered(data.senderId, data.receiverId);
                }

            } catch (error) {
                console.error('❌ Error procesando mensaje nuevo:', error);
            }
        });

        // Confirmación de mensaje enviado
        ChatWebSocket.on('messageSent', async (data) => {
            try {
                console.log('✅ Procesando confirmación de envío...');

                // Actualizar tempId por el ID real en SQLite
                if (data.tempId && data.message?.id) {
                    await ChatDatabase.updateMessageId(
                        data.tempId,
                        data.message.id,
                        MESSAGE_STATUS.SENT
                    );
                }

                // Notificar a la UI
                this.emit('messageSent', data);

            } catch (error) {
                console.error('❌ Error procesando confirmación:', error);
            }
        });

        // Mensajes entregados
        ChatWebSocket.on('messageDelivered', async (data) => {
            try {
                console.log('✅ Procesando mensajes entregados...');

                // Actualizar estado en SQLite
                await ChatDatabase.updateMessageStatus(
                    this.currentUserId,
                    data.receiverId,
                    'delivered'
                );

                // Notificar a la UI
                this.emit('messageDelivered', data);

            } catch (error) {
                console.error('❌ Error procesando entrega:', error);
            }
        });

        // Mensajes leídos
        ChatWebSocket.on('messageRead', async (data) => {
            try {
                console.log('👁️ Procesando mensajes leídos...');

                // Actualizar estado en SQLite
                await ChatDatabase.updateMessageStatus(
                    this.currentUserId,
                    data.receiverId,
                    'read'
                );

                // Notificar a la UI
                this.emit('messageRead', data);

            } catch (error) {
                console.error('❌ Error procesando lectura:', error);
            }
        });

        // Mensaje falló
        ChatWebSocket.on('messageFailed', async (data) => {
            try {
                console.log('');
                console.log('╔═══════════════════════════════════════════════════════════════╗');
                console.log('║  ❌ MENSAJE FALLÓ EN EL SERVIDOR                              ║');
                console.log('╚═══════════════════════════════════════════════════════════════╝');
                console.log('');
                console.log('📋 DETALLES:');
                console.log('   ├─ Temp ID:', data.tempId);
                console.log('   ├─ Error:', data.error);
                console.log('   └─ Timestamp:', data.timestamp);
                console.log('');
                
                // Intentar marcar como fallido en SQLite (sin reintentar)
                if (data.tempId) {
                    try {
                        await ChatDatabase.updateMessageStatus(
                            data.tempId,
                            null,
                            null,
                            MESSAGE_STATUS.FAILED
                        );
                        
                        console.log('💾 Mensaje marcado como fallido en SQLite');
                        console.log('   └─ El usuario puede reintentar manualmente');
                    } catch (dbError) {
                        // Si falla la BD, solo loguear pero NO re-emitir
                        console.error('⚠️ No se pudo actualizar estado en SQLite:', dbError.message);
                        console.log('   └─ El mensaje quedará con estado "enviando" en UI');
                    }
                }
                
                console.log('');
                
                // Notificar a la UI para mostrar error (SOLO UNA VEZ)
                this.emit('messageFailed', data);

            } catch (error) {
                console.error('❌ Error procesando mensaje fallido:', error);
                // NO re-emitir para evitar loops
            }
        });

        // Conectado
        ChatWebSocket.on('connected', () => {
            console.log('✅ WebSocket conectado');
            this.emit('connected', undefined);
            // Sincronizar mensajes pendientes
            this.syncUnreadMessages();
        });

        // Desconectado
        ChatWebSocket.on('disconnected', () => {
            console.log('⚠️ WebSocket desconectado, usando REST API');
            this.emit('disconnected', undefined);
        });
    }

    /**
     * Enviar mensaje (intenta WebSocket primero, luego REST)
     * @param {number} receiverId - ID del usuario receptor
     * @param {string} message - Contenido del mensaje
     * @param {MessageType} messageType - Tipo de mensaje (por defecto TEXT)
     * @returns {Promise<Message>} Mensaje creado con tempId
     */
    async sendMessage(receiverId, message, messageType = MESSAGE_TYPES.TEXT) {
        try {
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log('║  📤 ENVIANDO MENSAJE                                          ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('');

            if (!this.currentUserId) {
                throw new Error('Chat no inicializado');
            }

            // Validar que messageType sea válido
            const validTypes = Object.values(MESSAGE_TYPES);
            const normalizedType = messageType.toUpperCase();
            
            if (!validTypes.includes(normalizedType)) {
                console.warn(`⚠️ Tipo de mensaje inválido: "${messageType}", usando TEXT por defecto`);
                messageType = MESSAGE_TYPES.TEXT;
            } else {
                messageType = normalizedType;
            }

            // Generar ID temporal
            const tempId = `temp_${uuid.v4()}`;
            const chatId = ChatDatabase.generateChatId(this.currentUserId, receiverId);

            const messageData = {
                id: tempId,
                tempId: tempId,
                senderId: this.currentUserId,
                receiverId,
                message,
                messageType: messageType, // Ya está en mayúsculas
                status: MESSAGE_STATUS.SENDING,
                timestamp: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isRead: false,
                isDelivered: false,
                isDeleted: false,
                chatId: chatId,
                isSentByMe: true
            };

            console.log('📊 DETALLES:');
            console.log('   ├─ De:', this.currentUserId, `(${this.currentUserName})`);
            console.log('   ├─ Para:', receiverId);
            console.log('   ├─ Mensaje:', message);
            console.log('   ├─ Tipo:', messageType);
            console.log('   ├─ Temp ID:', tempId);
            console.log('   └─ Estado inicial:', MESSAGE_STATUS.SENDING, '⏳');
            console.log('');

            // 1. Guardar inmediatamente en SQLite (UI Optimista)
            console.log('💾 Guardando en SQLite (UI optimista)...');
            await ChatDatabase.saveMessage(messageData);

            // 2. Actualizar conversación
            await this.updateConversationFromMessage(messageData);

            console.log('   └─ ✅ Guardado local completado');
            console.log('');

            // 3. Crear payload para envío
            const payload = {
                senderId: this.currentUserId,
                receiverId,
                message,
                messageType: messageType, // Ya está validado y en mayúsculas
                tempId
            };

            console.log('🔄 ESTRATEGIA DE ENVÍO:');
            console.log('   1️⃣  Intentar WebSocket primero');
            console.log('   2️⃣  Si falla → Usar REST API');
            console.log('');

            // 4. Intentar enviar por WebSocket
            console.log('🔌 Verificando WebSocket...');
            const sentViaWebSocket = ChatWebSocket.sendMessage(payload);

            if (sentViaWebSocket) {
                // WebSocket OK - Esperamos evento 'messageSent' o 'messageFailed'
                console.log('✅ Mensaje enviado por WebSocket');
                console.log('   └─ Esperando confirmación del servidor...');
                console.log('   └─ Si falla, se recibirá evento "messageFailed"');
                console.log('');
                return messageData;
            }

            // 5. WebSocket no disponible - Usar REST API inmediatamente
            console.log('⚠️  WebSocket no disponible');
            console.log('');
            console.log('🔄 USANDO FALLBACK: REST API');
            console.log('   └─ POST https://api.minymol.com/chat/message');
            console.log('');

            await this.sendMessageViaRest(payload);
            
            console.log('');
            return messageData;

        } catch (error) {
            console.log('');
            console.log('❌ ERROR ENVIANDO MENSAJE:');
            console.log('   └─', error.message);
            console.log('');
            throw error;
        }
    }

    /**
     * Enviar mensaje via REST API (fallback)
     * @param {SendMessagePayload} payload - Datos del mensaje
     * @returns {Promise<Message>} Mensaje confirmado por el servidor
     */
    async sendMessageViaRest(payload) {
        try {
            console.log('📡 Enviando por REST API...');
            console.log('   └─ Temp ID:', payload.tempId);
            
            const response = await ChatApiClient.sendMessage(payload);

            if (response?.id) {
                console.log('');
                console.log('✅ MENSAJE ENVIADO POR REST API');
                console.log('   ├─ Server Message ID:', response.id);
                console.log('   └─ Actualizando base de datos local...');
                
                // Actualizar tempId por el ID real
                await ChatDatabase.updateMessageId(
                    payload.tempId,
                    response.id,
                    MESSAGE_STATUS.SENT
                );

                console.log('   └─ ✅ Base de datos local actualizada');
                console.log('');

                // Notificar a la UI con la estructura correcta (igual que WebSocket)
                this.emit('messageSent', {
                    tempId: payload.tempId,
                    message: { 
                        ...response, 
                        status: MESSAGE_STATUS.SENT,
                        isSentByMe: true 
                    }
                });
            }

            return response;

        } catch (error) {
            console.log('');
            console.log('❌ ERROR ENVIANDO POR REST API:');
            console.log('   ├─ Error:', error.message);
            console.log('   └─ Temp ID:', payload.tempId);
            console.log('');
            
            // Marcar como fallido en SQLite
            await ChatDatabase.updateMessageStatus(
                payload.tempId,
                null,
                null,
                MESSAGE_STATUS.FAILED
            );

            // Notificar a la UI
            this.emit('messageFailed', { 
                tempId: payload.tempId, 
                error: error.message 
            });

            throw error;
        }
    }

    /**
     * Obtener mensajes de una conversación con paginación
     */
    async getMessages(otherUserId, limit = 50, offset = 0) {
        try {
            // Generar chatId correcto
            const chatId = ChatDatabase.generateChatId(this.currentUserId, otherUserId);
            
            // Primero obtener de SQLite (rápido)
            const messages = await ChatDatabase.getMessages(
                chatId,
                offset,
                limit
            );

            // Si no hay offset (primera carga), sincronizar del servidor en background
            if (offset === 0) {
                this.syncMessagesFromServer(otherUserId).catch(err => {
                    console.error('Error sincronizando mensajes:', err);
                });
            }

            return messages;

        } catch (error) {
            console.error('❌ Error obteniendo mensajes:', error);
            return [];
        }
    }

    /**
     * Sincronizar mensajes desde el servidor
     */
    async syncMessagesFromServer(otherUserId) {
        try {
            console.log('🔄 Sincronizando mensajes desde servidor...');

            // Usar getHistory en vez de getUnreadMessages para obtener todo el historial
            const serverMessages = await ChatApiClient.getHistory(otherUserId);

            if (serverMessages.length > 0) {
                console.log(`   └─ ${serverMessages.length} mensajes del servidor`);

                // Guardar en SQLite
                for (const msg of serverMessages) {
                    const chatId = ChatDatabase.generateChatId(msg.senderId, msg.receiverId);
                    await ChatDatabase.saveMessage({
                        ...msg,
                        chatId: chatId,
                        isSentByMe: msg.senderId === this.currentUserId,
                        isRead: msg.status === 'read' || msg.isRead,
                        isDelivered: msg.status === 'delivered' || msg.status === 'read' || msg.isDelivered,
                        isDeleted: msg.isDeleted || false,
                        createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
                        updatedAt: msg.updatedAt || msg.timestamp || new Date().toISOString()
                    });
                }

                // Actualizar conversación con el último mensaje
                if (serverMessages.length > 0) {
                    await this.updateConversationFromMessage(serverMessages[0]);
                }

                // Notificar a la UI que hay nuevos mensajes
                this.emit('messagesUpdated', { otherUserId });
            }

        } catch (error) {
            console.error('❌ Error sincronizando:', error);
        }
    }

    /**
     * Marcar mensajes como leídos
     */
    async markAsRead(otherUserId) {
        try {
            console.log('👁️ Marcando mensajes como leídos...');

            // 1. Marcar en SQLite
            const chatId = ChatDatabase.generateChatId(this.currentUserId, otherUserId);
            await ChatDatabase.markChatAsRead(chatId);

            // 2. Notificar por WebSocket (si está conectado)
            if (ChatWebSocket.isConnected()) {
                ChatWebSocket.markAsRead(otherUserId, this.currentUserId);
            } else {
                // 3. O por REST API
                await ChatApiClient.markAsRead(otherUserId);
            }

            // 4. Notificar a la UI
            this.emit('messagesRead', { otherUserId });

            console.log('   └─ ✅ Mensajes marcados como leídos');

        } catch (error) {
            console.error('❌ Error marcando como leídos:', error);
        }
    }

    /**
     * Actualizar mensaje en BD local (reemplazar tempId con ID real)
     */
    async updateMessageInDB(tempId, realId) {
        try {
            // Actualizar ID del mensaje (ya maneja el estado internamente)
            await ChatDatabase.updateMessageId(tempId, realId);
        } catch (error) {
            console.error('❌ Error actualizando mensaje en BD:', error);
            throw error;
        }
    }

    /**
     * Actualizar estado de mensaje (delivered/read)
     */
    async updateMessageStatus(messageId, isDelivered, isRead) {
        try {
            await ChatDatabase.updateMessageStatus(messageId, isDelivered, isRead);
        } catch (error) {
            console.error('❌ Error actualizando estado de mensaje:', error);
            throw error;
        }
    }

    /**
     * Sincronizar mensajes (alias para retrocompatibilidad)
     */
    async syncMessages(otherUserId) {
        try {
            await this.syncMessagesFromServer(otherUserId);
            
            // Retornar cantidad de mensajes nuevos
            const chatId = ChatDatabase.generateChatId(this.currentUserId, otherUserId);
            const messages = await ChatDatabase.getMessages(chatId, 0, 50);
            const unread = messages.filter(m => !m.isRead && m.senderId === otherUserId);
            return unread.length;
        } catch (error) {
            console.error('❌ Error en syncMessages:', error);
            return 0;
        }
    }

    /**
     * Verificar si un usuario está online
     */
    async isUserOnline(userId) {
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

    /**
     * Obtener lista de conversaciones
     */
    async getConversations() {
        console.log('📋 getConversations() llamado');
        console.log('   ├─ initialized:', this.initialized);
        console.log('   ├─ currentUserId:', this.currentUserId);
        console.log('   └─ DB initialized:', ChatDatabase.isInitialized);

        // Si el chat no está inicializado, intentar obtener del servidor directamente
        if (!this.initialized || !this.currentUserId) {
            if (__DEV__) {
                console.log('⚠️ Chat no inicializado, intentando obtener del servidor...');
            }
            
            try {
                const serverConversations = await ChatApiClient.getConversations();
                const normalized = this.normalizeConversations(serverConversations);
                console.log('   └─ Conversaciones del servidor (normalizadas):', normalized.length);
                return normalized;
            } catch (error) {
                if (__DEV__) {
                    console.log('💬 Error obteniendo del servidor:', error.message);
                }
                return [];
            }
        }

        try {
            let localConversations = [];

            // Intentar obtener de SQLite si está inicializada
            if (ChatDatabase.isInitialized) {
                try {
                    localConversations = await ChatDatabase.getConversations();
                    console.log('   └─ Conversaciones locales (SQLite):', localConversations.length);
                } catch (dbError) {
                    if (__DEV__) {
                        console.log('💬 Error obteniendo de SQLite:', dbError.message);
                    }
                }
            }

            // Si no hay conversaciones locales, obtener del servidor
            if (localConversations.length === 0) {
                console.log('⚠️ No hay conversaciones locales, obteniendo del servidor...');
                try {
                    const serverConversations = await ChatApiClient.getConversations();
                    const normalized = this.normalizeConversations(serverConversations);
                    console.log('   └─ Conversaciones del servidor:', normalized.length);
                    
                    // Guardar en SQLite si está disponible
                    if (ChatDatabase.isInitialized && normalized.length > 0) {
                        for (const conv of normalized) {
                            try {
                                await ChatDatabase.saveConversation(conv);
                            } catch (saveError) {
                                if (__DEV__) {
                                    console.log('💬 Error guardando conversación:', saveError.message);
                                }
                            }
                        }
                    }
                    
                    return normalized;
                } catch (serverError) {
                    if (__DEV__) {
                        console.log('💬 Error obteniendo del servidor:', serverError.message);
                    }
                }
            } else {
                // Si hay conversaciones locales, sincronizar en background SIN esperar
                // Esto NO bloqueará ni llamará recursivamente
                this.syncConversationsFromServerSilent();
            }

            return localConversations;

        } catch (error) {
            if (__DEV__) {
                console.log('💬 Error general obteniendo conversaciones:', error.message);
            }
            return [];
        }
    }

    /**
     * Sincronizar conversaciones desde el servidor (silencioso, sin notificar)
     * Este método se ejecuta en background y NO llama a getConversations()
     */
    syncConversationsFromServerSilent() {
        // Evitar múltiples sincronizaciones simultáneas
        if (this.syncingConversations) {
            console.log('⚠️ Sincronización de conversaciones ya en progreso');
            return;
        }

        this.syncingConversations = true;

        ChatApiClient.getConversations()
            .then(serverConversations => {
                const normalized = this.normalizeConversations(serverConversations);

                if (normalized.length > 0 && ChatDatabase.isInitialized) {
                    console.log(`🔄 Sincronizando ${normalized.length} conversaciones en background...`);
                    
                    // Guardar cada conversación
                    const savePromises = normalized.map(conv => 
                        ChatDatabase.saveConversation(conv).catch(err => {
                            if (__DEV__) {
                                console.log('💬 Error guardando conversación:', err.message);
                            }
                        })
                    );

                    return Promise.all(savePromises);
                }
            })
            .then(() => {
                console.log('✅ Sincronización de conversaciones completada');
                // NO emitir evento para evitar recargas innecesarias
                // La UI ya tiene los datos de SQLite
            })
            .catch(error => {
                if (__DEV__) {
                    console.log('💬 Error en sincronización background:', error.message);
                }
            })
            .finally(() => {
                this.syncingConversations = false;
            });
    }

    /**
     * Normalizar conversaciones del servidor
     * Asegura que todas tienen los campos requeridos
     */
    normalizeConversations(conversations) {
        if (!Array.isArray(conversations)) {
            console.warn('⚠️ normalizeConversations: entrada no es array');
            return [];
        }

        return conversations
            .map((conv, index) => {
                try {
                    // El servidor puede devolver diferentes formatos
                    const otherUserId = conv.otherUserId || conv.userId || null;
                    const otherUserName = conv.otherUserName || conv.userName || conv.nombre || conv.name || 'Usuario sin nombre';
                    
                    // Extraer el texto del último mensaje (puede ser objeto o string)
                    let lastMessageText = '';
                    let lastMessageTime = null;
                    let lastMessageId = null;
                    
                    if (conv.lastMessage && typeof conv.lastMessage === 'object') {
                        // lastMessage es un objeto completo
                        lastMessageText = conv.lastMessage.message || '';
                        lastMessageTime = conv.lastMessage.createdAt || conv.lastMessage.timestamp || null;
                        lastMessageId = conv.lastMessage.id || null;
                    } else if (typeof conv.lastMessageText === 'string') {
                        // lastMessageText ya es string
                        lastMessageText = conv.lastMessageText;
                        lastMessageTime = conv.lastMessageTime || null;
                        lastMessageId = conv.lastMessageId || null;
                    }
                    
                    // Generar chatId si no existe
                    const chatId = conv.chatId || 
                                  (otherUserId ? this.generateChatId(this.currentUserId, otherUserId) : null) ||
                                  `unknown-${Date.now()}-${index}`;

                    // Validar que al menos tenga otherUserId
                    if (!otherUserId) {
                        console.warn('⚠️ Conversación sin otherUserId:', conv);
                        return null;
                    }

                    // Normalizar
                    const normalized = {
                        chatId: chatId,
                        otherUserId: otherUserId,
                        otherUserName: otherUserName,
                        otherUserPhone: conv.otherUserPhone || conv.phone || conv.telefono || null,
                        otherUserLogoUrl: conv.otherUserLogoUrl || conv.logoUrl || conv.logo_url || conv.avatar || null,
                        otherUserRole: conv.otherUserRole || conv.role || conv.rol || null,
                        isProveedor: conv.isProveedor || conv.isProvider || conv.rol === 'proveedor' || false,
                        lastMessageId: lastMessageId,
                        lastMessageText: lastMessageText,
                        lastMessageTime: lastMessageTime || new Date().toISOString(),
                        unreadCount: conv.unreadCount || conv.unread || 0,
                        updatedAt: conv.updatedAt || lastMessageTime || new Date().toISOString()
                    };

                    console.log('✅ Conversación normalizada:', {
                        chatId: normalized.chatId,
                        otherUserId: normalized.otherUserId,
                        otherUserName: normalized.otherUserName,
                        lastMessageText: normalized.lastMessageText?.substring(0, 30) || 'Sin mensaje',
                        unreadCount: normalized.unreadCount
                    });

                    return normalized;
                } catch (error) {
                    console.error('❌ Error normalizando conversación:', error, conv);
                    return null;
                }
            })
            .filter(conv => conv !== null); // Filtrar conversaciones inválidas
    }

    /**
     * Sincronizar conversaciones desde el servidor
     */
    async syncConversationsFromServer() {
        try {
            console.log('🔄 Sincronizando conversaciones desde servidor...');

            const serverConversations = await ChatApiClient.getConversations();
            const normalized = this.normalizeConversations(serverConversations);

            if (normalized.length > 0) {
                console.log(`   └─ ${normalized.length} conversaciones del servidor (normalizadas)`);

                // Guardar en SQLite si está disponible
                if (ChatDatabase.isInitialized) {
                    for (const conv of normalized) {
                        try {
                            await ChatDatabase.saveConversation(conv);
                            console.log(`   └─ ✅ Conversación guardada: ${conv.otherUserName}`);
                        } catch (saveError) {
                            console.error(`   └─ ❌ Error guardando conversación:`, saveError.message);
                        }
                    }
                } else {
                    console.log('   └─ ⚠️ Base de datos no inicializada, no se guardaron localmente');
                }

                // Notificar a la UI
                this.emit('conversationsUpdated', undefined);
            } else {
                console.log('   └─ Sin conversaciones en el servidor');
            }

        } catch (error) {
            console.error('❌ Error sincronizando conversaciones:', error);
        }
    }

    /**
     * Generar chatId consistente entre dos usuarios
     */
    generateChatId(userId1, userId2) {
        const sortedIds = [userId1, userId2].sort((a, b) => a - b);
        return `${sortedIds[0]}-${sortedIds[1]}`;
    }

    /**
     * Sincronizar mensajes no leídos
     */
    async syncUnreadMessages() {
        if (this.syncInProgress) {
            console.log('⚠️ Sincronización ya en progreso');
            return;
        }

        try {
            this.syncInProgress = true;
            console.log('📬 Sincronizando mensajes no leídos...');

            const unreadMessages = await ChatApiClient.getUnreadMessages();

            if (unreadMessages.length > 0) {
                console.log(`   └─ ${unreadMessages.length} mensajes no leídos`);

                // Guardar en SQLite
                for (const msg of unreadMessages) {
                    const chatId = ChatDatabase.generateChatId(msg.senderId, msg.receiverId);
                    
                    await ChatDatabase.saveMessage({
                        ...msg,
                        chatId: chatId,
                        isSentByMe: msg.senderId === this.currentUserId,
                        isRead: false,
                        isDelivered: true, // Ya llegó a nosotros
                        isDeleted: msg.isDeleted || false,
                        createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
                        updatedAt: msg.updatedAt || msg.timestamp || new Date().toISOString()
                    });

                    // Actualizar conversación
                    await this.updateConversationFromMessage(msg);
                }

                // Notificar a la UI
                this.emit('unreadMessagesUpdated', undefined);
            }

        } catch (error) {
            console.error('❌ Error sincronizando no leídos:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Obtener contador de mensajes no leídos totales
     */
    async getUnreadCount() {
        try {
            // Si no está inicializado, retornar 0 silenciosamente
            if (!this.initialized || !this.currentUserId) {
                return 0;
            }
            
            return await ChatDatabase.getUnreadCount(this.currentUserId);
        } catch (error) {
            // Silencioso: retornar 0 si hay algún error
            if (__DEV__) {
                console.log('💬 Error obteniendo contador (DB no lista):', error.message);
            }
            return 0;
        }
    }

    /**
     * Obtener contactos disponibles para chat
     */
    async getAvailableContacts() {
        try {
            return await ChatApiClient.getAvailableContacts();
        } catch (error) {
            console.error('❌ Error obteniendo contactos:', error);
            return [];
        }
    }

    /**
     * Actualizar conversación desde un mensaje
     */
    async updateConversationFromMessage(message) {
        try {
            const otherUserId = message.senderId === this.currentUserId
                ? message.receiverId
                : message.senderId;

            const chatId = ChatDatabase.generateChatId(this.currentUserId, otherUserId);

            // Obtener información del otro usuario si no la tenemos
            let otherUserName = message.senderName || message.receiverName || 'Usuario';
            
            // Si el mensaje es de otro usuario, usar su nombre como sender
            if (message.senderId !== this.currentUserId && message.senderName) {
                otherUserName = message.senderName;
            }
            // Si enviamos nosotros, el nombre es del receptor
            else if (message.senderId === this.currentUserId && message.receiverName) {
                otherUserName = message.receiverName;
            }

            // Actualizar/crear conversación con formato correcto
            await ChatDatabase.saveConversation({
                chatId: chatId,
                otherUserId: otherUserId,
                otherUserName: otherUserName,
                otherUserPhone: message.otherUserPhone || null,
                otherUserLogoUrl: message.otherUserLogoUrl || null,
                otherUserRole: message.otherUserRole || null,
                lastMessageId: message.id || null,
                lastMessageText: message.message || '',
                lastMessageTime: message.timestamp || message.createdAt || new Date().toISOString(),
                unreadCount: message.senderId !== this.currentUserId ? 1 : 0,
                updatedAt: message.timestamp || message.createdAt || new Date().toISOString()
            });

            console.log('✅ Conversación actualizada:', chatId, '-', otherUserName);

        } catch (error) {
            console.error('❌ Error actualizando conversación desde mensaje:', error);
        }
    }

    /**
     * Buscar mensajes
     */
    async searchMessages(query) {
        try {
            return await ChatDatabase.searchMessages(this.currentUserId, query);
        } catch (error) {
            console.error('❌ Error buscando mensajes:', error);
            return [];
        }
    }

    /**
     * Cerrar servicio
     */
    async close() {
        console.log('🔌 Cerrando ChatService...');

        ChatWebSocket.disconnect();
        ChatWebSocket.removeAllListeners();
        await ChatDatabase.close();

        this.initialized = false;
        this.currentUserId = null;
        this.currentUserName = null;
        this.listeners.clear();

        console.log('✅ ChatService cerrado');
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
}

// Exportar instancia única (Singleton)
export default new ChatService();
