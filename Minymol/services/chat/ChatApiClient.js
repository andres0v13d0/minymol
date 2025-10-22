/**
 * ChatApiClient - Cliente REST API para fallback cuando WebSocket falla
 * Minymol Minoristas
 */

import { apiCall, getUserData } from '../../utils/apiUtils';

const BASE_URL = 'https://api.minymol.com';

class ChatApiClient {
    /**
     * Obtener contactos disponibles para chat (solo proveedores)
     * GET /chat/available-contacts
     */
    async getAvailableContacts() {
        try {
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log('║  📇 OBTENIENDO CONTACTOS DISPONIBLES (REST)                  ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('📍 DETALLES:');
            console.log('   ├─ Endpoint: GET /chat/available-contacts');
            console.log('   ├─ URL completa: https://api.minymol.com/chat/available-contacts');
            console.log('   └─ Filtro: Solo proveedores (typeOfPerson = 1)');
            console.log('');
            console.log('🔄 Ejecutando petición...');

            const fetchResponse = await apiCall(`${BASE_URL}/chat/available-contacts`, { method: 'GET' });
            const response = await fetchResponse.json();

            console.log('');
            console.log('✅ CONTACTOS OBTENIDOS:');
            console.log('   ├─ Cantidad:', response?.length || 0);
            console.log('   └─ Tipo: Proveedores');
            console.log('');

            return response || [];
        } catch (error) {
            console.log('');
            console.log('❌ ERROR OBTENIENDO CONTACTOS:');
            console.log('   ├─ Error:', error.message);
            console.log('   └─ Retornando array vacío');
            console.log('');
            return [];
        }
    }

    /**
     * Obtener lista de conversaciones
     * GET /chat/conversations
     */
    async getConversations() {
        try {
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log('║  💬 OBTENIENDO CONVERSACIONES (REST)                         ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('📍 DETALLES:');
            console.log('   ├─ Endpoint: GET /chat/conversations');
            console.log('   ├─ URL completa: https://api.minymol.com/chat/conversations');
            console.log('   └─ Incluye: último mensaje, contador no leídos, timestamp');
            console.log('');
            console.log('🔄 Ejecutando petición...');

            const fetchResponse = await apiCall(`${BASE_URL}/chat/conversations`, { method: 'GET' });
            const response = await fetchResponse.json();

            console.log('');
            console.log('✅ CONVERSACIONES OBTENIDAS:');
            console.log('   ├─ Cantidad:', response?.length || 0);
            
            // DEBUG: Mostrar estructura completa de la primera conversación
            if (response && response.length > 0) {
                console.log('');
                console.log('🔍 ESTRUCTURA DE CONVERSACIÓN (DEBUG):');
                console.log('   Primera conversación:', JSON.stringify(response[0], null, 2));
                console.log('');
                
                const totalUnread = response.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
                console.log('   └─ Mensajes no leídos totales:', totalUnread);
            }
            console.log('');

            return response || [];
        } catch (error) {
            console.log('');
            console.log('❌ ERROR OBTENIENDO CONVERSACIONES:');
            console.log('   ├─ Error:', error.message);
            console.log('   └─ Retornando array vacío');
            console.log('');
            return [];
        }
    }

    /**
     * Enviar mensaje via REST API (fallback)
     * POST /chat/message
     */
    async sendMessage(messageData) {
        try {
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log('║  📤 ENVIANDO MENSAJE VIA REST API (FALLBACK)                 ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('📍 DETALLES:');
            console.log('   ├─ Endpoint: POST /chat/message');
            console.log('   ├─ URL completa: https://api.minymol.com/chat/message');
            console.log('   ├─ Motivo: WebSocket no disponible o falló');
            console.log('   └─ Content-Type: application/json');
            console.log('');
            console.log('📦 PAYLOAD:');
            console.log('   ├─ De:', messageData.senderId);
            console.log('   ├─ Para:', messageData.receiverId);
            console.log('   ├─ Tipo:', messageData.messageType);
            console.log('   ├─ Mensaje:', messageData.message);
            console.log('   └─ Temp ID:', messageData.tempId || 'N/A');
            console.log('');
            console.log('🔄 Ejecutando petición...');

            const fetchResponse = await apiCall(`${BASE_URL}/chat/message`, { 
                method: 'POST',
                body: JSON.stringify(messageData)
            });
            const response = await fetchResponse.json();

            console.log('');
            console.log('✅ MENSAJE ENVIADO VIA REST:');
            console.log('   ├─ Mensaje ID:', response?.id || 'N/A');
            console.log('   ├─ Estado:', response?.status || 'sent');
            console.log('   ├─ Timestamp:', response?.timestamp);
            console.log('   └─ Temp ID original:', messageData.tempId || 'N/A');
            console.log('');

            return response;
        } catch (error) {
            console.log('');
            console.log('❌ ERROR ENVIANDO MENSAJE VIA REST:');
            console.log('   ├─ Error:', error.message);
            console.log('   ├─ Temp ID:', messageData.tempId);
            console.log('   └─ El mensaje quedará en estado FAILED');
            console.log('');
            throw error;
        }
    }

    /**
     * Obtener historial de mensajes con un usuario
     * GET /chat/history/:userId
     */
    async getHistory(userId, page = 1, limit = 100) {
        try {
            console.log(`� GET /chat/history/${userId}`);
            
            const fetchResponse = await apiCall(`${BASE_URL}/chat/history/${userId}`, {
                method: 'GET'
            });

            if (!fetchResponse.ok) {
                if (fetchResponse.status === 404) {
                    console.log('ℹ️ No hay historial con este usuario');
                    return [];
                }
                throw new Error(`Error ${fetchResponse.status}: ${fetchResponse.statusText}`);
            }

            const messages = await fetchResponse.json();
            console.log(`✅ ${messages.length} mensajes en historial`);
            
            return messages;
        } catch (error) {
            console.error('❌ Error obteniendo historial:', error);
            return [];
        }
    }

    /**
     * Obtener mensajes no descargados de un usuario
     * GET /chat/unread-messages/:userId
     */
    async getUnreadMessages() {
        try {
            console.log('📡 GET /chat/unread-messages');
            
            const fetchResponse = await apiCall(`${BASE_URL}/chat/unread-messages`, {
                method: 'GET'
            });

            if (!fetchResponse.ok) {
                if (fetchResponse.status === 404) {
                    console.log('ℹ️ No hay mensajes nuevos');
                    return [];
                }
                throw new Error(`Error ${fetchResponse.status}: ${fetchResponse.statusText}`);
            }

            const messages = await fetchResponse.json();
            console.log(`✅ ${messages.length} mensajes nuevos`);
            
            return messages;
        } catch (error) {
            console.error('❌ Error obteniendo mensajes no leídos:', error);
            return [];
        }
    }

    /**
     * Marcar mensajes como descargados/entregados
     * POST /chat/mark-downloaded/:userId
     */
    async markAsDownloaded(senderId) {
        try {
            console.log('');
            console.log('📬 MARCANDO MENSAJES COMO DESCARGADOS (REST):');
            console.log('   ├─ Endpoint: POST /chat/mark-downloaded/:userId');
            console.log('   └─ De usuario:', senderId);
            console.log('');

            const fetchResponse = await apiCall(`${BASE_URL}/chat/mark-downloaded/${senderId}`, { 
                method: 'POST'
            });
            const response = await fetchResponse.json();

            console.log('✅ Mensajes marcados como descargados');
            console.log('');

            return response;
        } catch (error) {
            console.log('');
            console.log('❌ ERROR MARCANDO COMO DESCARGADOS:');
            console.log('   ├─ Error:', error.message);
            console.log('   └─ De usuario:', senderId);
            console.log('');
            return null;
        }
    }

    /**
     * Marcar mensajes como leídos
     * POST /chat/mark-read (en el body va otherUserId)
     */
    async markAsRead(otherUserId) {
        try {
            console.log('');
            console.log('👁️ MARCANDO MENSAJES COMO LEÍDOS (REST):');
            console.log('   ├─ Endpoint: POST /chat/mark-read');
            console.log('   └─ Otro usuario:', otherUserId);
            console.log('');

            const fetchResponse = await apiCall(`${BASE_URL}/chat/mark-read`, { 
                method: 'POST',
                body: JSON.stringify({ otherUserId })
            });
            const response = await fetchResponse.json();

            console.log('✅ Mensajes marcados como leídos');
            console.log('');

            return response;
        } catch (error) {
            console.log('');
            console.log('❌ ERROR MARCANDO COMO LEÍDOS:');
            console.log('   ├─ Error:', error.message);
            console.log('   └─ Usuario:', otherUserId);
            console.log('');
            return null;
        }
    }

    /**
     * Verificar si un usuario está online
     * GET /chat/is-online/:userId
     */
    async isUserOnline(userId) {
        try {
            console.log('📡 GET /chat/is-online/' + userId);
            
            const fetchResponse = await apiCall(`${BASE_URL}/chat/is-online/${userId}`, {
                method: 'GET'
            });

            console.log('📥 Status Code:', fetchResponse.status);
            console.log('📥 Response OK:', fetchResponse.ok);

            if (!fetchResponse.ok) {
                console.warn('⚠️ Error - Status:', fetchResponse.status);
                return false; // Default: offline
            }

            const isOnline = await fetchResponse.json();
            
            console.log('✅ Estado recibido del servidor:', isOnline);
            
            return isOnline;
        } catch (error) {
            console.error('❌ Error en request:', error);
            return false; // Default: offline
        }
    }
}

// Exportar instancia única (Singleton)
export default new ChatApiClient();
