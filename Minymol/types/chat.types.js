/**
 * Tipos para el módulo de Chat
 * Minymol Minoristas
 */

// No usamos TypeScript, pero documentamos los tipos con JSDoc para mejor intellisense

/**
 * @typedef {'TEXT'} MessageType
 */

/**
 * @typedef {Object} Message
 * @property {string} id - ID del mensaje en servidor
 * @property {string} [tempId] - ID temporal mientras se sincroniza
 * @property {number} senderId - ID del remitente
 * @property {number} receiverId - ID del destinatario
 * @property {string} message - Contenido del mensaje
 * @property {MessageType} messageType - Tipo de mensaje
 * @property {string} [fileUrl] - URL del archivo (para futuras implementaciones)
 * @property {boolean} isDelivered - Si fue entregado
 * @property {boolean} isRead - Si fue leído
 * @property {boolean} isDeleted - Si fue eliminado
 * @property {string} createdAt - Fecha de creación ISO
 * @property {string} updatedAt - Fecha de actualización ISO
 * @property {string} chatId - ID del chat (userId1-userId2)
 * @property {boolean} isSentByMe - Si lo envié yo
 */

/**
 * @typedef {Object} CreateMessageDto
 * @property {number} senderId
 * @property {number} receiverId
 * @property {string} message
 * @property {MessageType} messageType
 * @property {string} [fileUrl]
 * @property {string} [tempId]
 */

/**
 * @typedef {Object} Conversation
 * @property {string} chatId - ID del chat
 * @property {number} otherUserId - ID del otro usuario
 * @property {string} otherUserName - Nombre del otro usuario
 * @property {string} [otherUserPhone] - Teléfono del otro usuario
 * @property {string} [otherUserLogoUrl] - URL del logo
 * @property {'comerciante'|'proveedor'} [otherUserRole] - Rol del otro usuario
 * @property {string} [lastMessageId] - ID del último mensaje
 * @property {string} [lastMessageText] - Texto del último mensaje
 * @property {string} [lastMessageTime] - Timestamp del último mensaje
 * @property {number} unreadCount - Contador de no leídos
 * @property {string} updatedAt - Última actualización
 */

/**
 * @typedef {Object} Contact
 * @property {number} userId - ID del usuario
 * @property {string} nombre - Nombre del contacto
 * @property {string} [telefono] - Teléfono del contacto
 * @property {'comerciante'|'proveedor'} rol - Rol del usuario
 * @property {string} [logo_url] - URL del logo
 * @property {Message} [lastMessage] - Último mensaje
 * @property {number} [unreadCount] - Mensajes no leídos
 * @property {boolean} [canChat] - Si puede chatear con este usuario
 */

/**
 * @typedef {Object} MessageSentPayload
 * @property {string} [tempId] - ID temporal del mensaje
 * @property {Message} message - Mensaje confirmado por el servidor
 * @property {string} status - Estado ('sent')
 * @property {string} timestamp - Timestamp de la confirmación
 */

/**
 * @typedef {Object} MessageStatusUpdate
 * @property {number} receiverId - ID del receptor
 * @property {'delivered'|'read'} status - Nuevo estado
 * @property {string} timestamp - Timestamp del cambio
 */

/**
 * @typedef {Object} MessageFailedPayload
 * @property {string} [tempId] - ID temporal del mensaje fallido
 * @property {string} error - Descripción del error
 * @property {string} timestamp - Timestamp del error
 */

/**
 * @typedef {Object} WebSocketEvents
 * @property {void} connected - Conectado exitosamente
 * @property {void} disconnected - Desconectado
 * @property {Message} newMessage - Nuevo mensaje recibido
 * @property {MessageSentPayload} messageSent - Mensaje enviado confirmado
 * @property {MessageStatusUpdate} messageDelivered - Mensaje entregado
 * @property {MessageStatusUpdate} messageRead - Mensaje leído
 * @property {MessageFailedPayload} messageFailed - Error al enviar
 * @property {Error} error - Error general
 */

/**
 * @typedef {Object} SendMessagePayload
 * @property {number} senderId
 * @property {number} receiverId
 * @property {string} message
 * @property {MessageType} messageType
 * @property {string} [fileUrl]
 * @property {string} [tempId]
 */

/**
 * @typedef {Object} ConversationsResponse
 * @property {number} userId
 * @property {string} nombre
 * @property {'comerciante'|'proveedor'} rol
 * @property {string} [logo_url]
 * @property {Message} [lastMessage]
 * @property {number} unreadCount
 */

/**
 * @typedef {Object} MessageBubbleProps
 * @property {Message} message - Mensaje a mostrar
 * @property {boolean} [showDate] - Si mostrar separador de fecha
 */

/**
 * @typedef {Object} ConversationItemProps
 * @property {Conversation} conversation - Conversación a mostrar
 * @property {function(number): void} onPress - Callback al presionar
 */

/**
 * @typedef {Object} ChatModalProps
 * @property {boolean} visible - Si el modal está visible
 * @property {number} otherUserId - ID del otro usuario
 * @property {string} otherUserName - Nombre del otro usuario
 * @property {string} [otherUserLogoUrl] - URL del logo
 * @property {function(): void} onClose - Callback para cerrar
 */

/**
 * @typedef {Object} ContactsListModalProps
 * @property {boolean} visible - Si el modal está visible
 * @property {function(): void} onClose - Callback para cerrar
 * @property {function(number, string, string): void} onSelectContact - Callback al seleccionar contacto
 */

// Exportar tipos (aunque en JS no se exportan, sirve para documentación)
export default {};
