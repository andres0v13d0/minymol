/**
 * Tipos para el módulo de Chat (usando JSDoc para type checking)
 * Minymol Minoristas - Sistema de Mensajería en Tiempo Real
 */

// ============================================
// TIPOS DE MENSAJE
// ============================================

/**
 * Tipos de mensaje soportados
 * @typedef {'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE'} MessageType
 */

/**
 * Estados de mensaje
 * @typedef {'sending' | 'sent' | 'delivered' | 'read' | 'failed'} MessageStatus
 */

/**
 * Estructura de un mensaje individual
 * @typedef {Object} Message
 * @property {string} id - ID único del mensaje (UUID del servidor o tempId)
 * @property {string} [tempId] - ID temporal para mensajes no sincronizados con el servidor
 * @property {number} senderId - ID del usuario que envía el mensaje
 * @property {number} receiverId - ID del usuario que recibe el mensaje
 * @property {string} message - Contenido del mensaje (texto)
 * @property {MessageType} messageType - Tipo de mensaje
 * @property {string} [fileUrl] - URL del archivo (null para mensajes de texto)
 * @property {boolean} isDelivered - Si el mensaje fue entregado al destinatario
 * @property {boolean} isRead - Si el mensaje fue leído por el destinatario
 * @property {boolean} isDeleted - Si el mensaje fue eliminado
 * @property {string} createdAt - Fecha de creación (ISO string)
 * @property {string} updatedAt - Fecha de última actualización (ISO string)
 * @property {string} chatId - ID del chat (formato: "userId1-userId2" ordenado)
 * @property {boolean} isSentByMe - Si el mensaje fue enviado por el usuario actual
 * @property {MessageStatus} [status] - Estado del mensaje
 * @property {boolean} [failed] - Si el mensaje falló al enviarse
 */

/**
 * DTO para crear un mensaje nuevo
 * @typedef {Object} CreateMessageDto
 * @property {number} senderId - ID del usuario que envía
 * @property {number} receiverId - ID del usuario que recibe
 * @property {string} message - Contenido del mensaje
 * @property {MessageType} messageType - Tipo de mensaje
 * @property {string} [fileUrl] - URL del archivo (opcional)
 * @property {string} [tempId] - ID temporal del frontend para tracking
 */

// ============================================
// CONVERSACIONES
// ============================================

/**
 * Estructura de una conversación
 * @typedef {Object} Conversation
 * @property {string} chatId - ID del chat (formato: "userId1-userId2")
 * @property {number} otherUserId - ID del otro usuario en la conversación
 * @property {string} otherUserName - Nombre del otro usuario
 * @property {string} [otherUserPhone] - Teléfono del otro usuario (opcional)
 * @property {string} [otherUserLogoUrl] - URL del logo del otro usuario (solo si es proveedor)
 * @property {string} [otherUserRole] - Rol del otro usuario ('comerciante' | 'proveedor')
 * @property {boolean} [isProveedor] - Si el otro usuario es proveedor
 * @property {string} [lastMessageId] - ID del último mensaje
 * @property {string} [lastMessageText] - Texto del último mensaje
 * @property {string} [lastMessageTime] - Fecha del último mensaje (ISO string)
 * @property {number} unreadCount - Cantidad de mensajes no leídos
 * @property {string} updatedAt - Fecha de última actualización (ISO string)
 */

// ============================================
// CONTACTOS
// ============================================

/**
 * Estructura de un contacto disponible para chatear
 * @typedef {Object} Contact
 * @property {number} userId - ID del usuario
 * @property {string} nombre - Nombre del contacto
 * @property {string} [telefono] - Teléfono del contacto
 * @property {string} rol - Rol del contacto ('comerciante' | 'proveedor')
 * @property {string} [logo_url] - URL del logo (solo proveedores)
 * @property {Message} [lastMessage] - Último mensaje con este contacto
 * @property {number} [unreadCount] - Cantidad de mensajes no leídos
 * @property {boolean} [canChat] - Si se puede chatear con este contacto
 */

// ============================================
// WEBSOCKET
// ============================================

/**
 * Payload de confirmación de mensaje enviado (messageSent)
 * @typedef {Object} MessageSentPayload
 * @property {string} [tempId] - ID temporal del frontend
 * @property {Message} message - Mensaje completo con ID real del servidor
 * @property {string} status - Estado ('sent')
 * @property {string} timestamp - Timestamp ISO
 */

/**
 * Payload para actualización de estado de mensaje (delivered/read)
 * @typedef {Object} MessageStatusUpdate
 * @property {number} receiverId - ID del usuario receptor
 * @property {string} status - Estado ('delivered' | 'read')
 * @property {string} timestamp - Timestamp ISO
 */

/**
 * Payload de error de mensaje
 * @typedef {Object} MessageFailedPayload
 * @property {string} [tempId] - ID temporal del frontend
 * @property {string} error - Descripción del error
 * @property {string} timestamp - Timestamp ISO
 */

/**
 * Payload para enviar mensaje via WebSocket
 * @typedef {Object} SendMessagePayload
 * @property {number} senderId - ID del remitente
 * @property {number} receiverId - ID del receptor
 * @property {string} message - Contenido del mensaje
 * @property {MessageType} messageType - Tipo de mensaje
 * @property {string} [fileUrl] - URL del archivo (opcional)
 * @property {string} [tempId] - ID temporal del frontend
 */

// ============================================
// CONSTANTES
// ============================================

/**
 * Tipos de mensaje válidos
 * @constant
 * @type {Object.<string, MessageType>}
 */
export const MESSAGE_TYPES = {
    TEXT: 'TEXT',
    IMAGE: 'IMAGE',
    VIDEO: 'VIDEO',
    FILE: 'FILE'
};

/**
 * Estados de mensaje válidos
 * @constant
 * @type {Object.<string, MessageStatus>}
 */
export const MESSAGE_STATUS = {
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed'
};

/**
 * Roles de usuario
 * @constant
 * @type {Object.<string, string>}
 */
export const USER_ROLES = {
    COMERCIANTE: 'comerciante',
    PROVEEDOR: 'proveedor'
};

// Exportar para usar en otros archivos
export default {
    MESSAGE_TYPES,
    MESSAGE_STATUS,
    USER_ROLES
};
