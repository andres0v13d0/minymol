/**
 * ChatDatabase - SQLite Manager para almacenamiento local de mensajes
 * Minymol Minoristas
 */

import * as SQLite from 'expo-sqlite';

class ChatDatabase {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Inicializar base de datos SQLite - FORZADO
     */
    async init() {
        if (this.isInitialized) {
            console.log('✅ ChatDatabase ya está inicializada');
            return;
        }

        let retries = 5; // Aumentado a 5 intentos
        let lastError = null;

        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  🗄️ INICIALIZANDO CHATDATABASE (FORZADO)                     ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');

        while (retries > 0) {
            try {
                console.log(`🔧 Intento ${6 - retries}/5: Inicializando ChatDatabase...`);

                // ✅ FORZAR: Cerrar cualquier conexión anterior
                if (this.db) {
                    try {
                        await this.db.closeAsync();
                        console.log('   ├─ Conexión anterior cerrada');
                    } catch (closeError) {
                        console.log('   ├─ No había conexión anterior');
                    }
                }

                this.db = null;
                this.isInitialized = false;

                // ✅ FORZAR: Abrir/crear base de datos con await
                console.log('   ├─ Abriendo base de datos SQLite...');
                this.db = await SQLite.openDatabaseAsync('minymol_chat.db');

                // ✅ FORZAR: Verificar que la conexión es válida
                if (!this.db) {
                    throw new Error('❌ CRÍTICO: Database connection is null después de openDatabaseAsync');
                }

                console.log('   ├─ ✅ Conexión SQLite establecida');

                // ✅ FORZAR: Crear tablas
                console.log('   ├─ Creando tablas...');
                await this.createTables();
                console.log('   ├─ ✅ Tablas creadas');

                // ✅ FORZAR: Optimizar performance
                console.log('   ├─ Optimizando base de datos...');
                await this.optimizeDatabase();
                console.log('   ├─ ✅ Base de datos optimizada');

                // ✅ MARCAR COMO INICIALIZADO
                this.isInitialized = true;
                
                console.log('');
                console.log('✅✅✅ ChatDatabase INICIALIZADA CORRECTAMENTE ✅✅✅');
                console.log('');
                return;

            } catch (error) {
                lastError = error;
                retries--;
                this.db = null;
                this.isInitialized = false;

                console.log('');
                console.log('❌ Error en inicialización:');
                console.log('   ├─ Error:', error.message);
                console.log('   ├─ Stack:', error.stack);
                console.log(`   └─ Intentos restantes: ${retries}`);
                console.log('');

                if (retries > 0) {
                    const waitTime = 2000; // 2 segundos entre intentos
                    console.log(`⏳ Esperando ${waitTime}ms antes de reintentar...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    // ✅ FORZAR: NO PERMITIR que continúe sin base de datos
                    console.log('');
                    console.log('╔═══════════════════════════════════════════════════════════════╗');
                    console.log('║  ❌❌❌ ERROR CRÍTICO: ChatDatabase NO SE PUDO INICIALIZAR ❌❌❌');
                    console.log('╚═══════════════════════════════════════════════════════════════╝');
                    console.log('');
                    console.log('💥 Último error:', lastError.message);
                    console.log('💥 Stack completo:', lastError.stack);
                    console.log('');
                    
                    // ✅ LANZAR ERROR PARA QUE SE VEA
                    throw new Error(`ChatDatabase FALLÓ después de 5 intentos: ${lastError.message}`);
                }
            }
        }
    }

    /**
     * Crear tablas de mensajes y conversaciones
     */
    async createTables() {
        if (!this.db) throw new Error('Database not initialized');

        try {
            // Tabla de mensajes
            await this.db.execAsync(`
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
                    status TEXT DEFAULT 'sent'
                );
            `);

            // Tabla de conversaciones
            await this.db.execAsync(`
                CREATE TABLE IF NOT EXISTS conversations (
                    chatId TEXT PRIMARY KEY,
                    otherUserId INTEGER NOT NULL,
                    otherUserName TEXT NOT NULL,
                    otherUserPhone TEXT,
                    otherUserLogoUrl TEXT,
                    otherUserRole TEXT,
                    lastMessageId TEXT,
                    lastMessageText TEXT,
                    lastMessageTime INTEGER,
                    unreadCount INTEGER DEFAULT 0,
                    updatedAt INTEGER NOT NULL
                );
            `);

            // Crear índices para mejorar performance
            await this.db.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_messages_chat 
                ON messages(chatId, createdAt DESC);
            `);

            await this.db.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_messages_unread 
                ON messages(chatId, isRead, isSentByMe);
            `);

            await this.db.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_conversations_time 
                ON conversations(lastMessageTime DESC);
            `);

            console.log('✅ Tablas e índices creados correctamente');

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

        } catch (error) {
            console.error('❌ Error creando tablas:', error);
            throw error;
        }
    }

    /**
     * Optimizar base de datos con PRAGMA
     */
    async optimizeDatabase() {
        if (!this.db) return;

        try {
            // Write-Ahead Logging para mejor concurrencia
            await this.db.execAsync('PRAGMA journal_mode=WAL;');

            // Balance entre performance y seguridad
            await this.db.execAsync('PRAGMA synchronous=NORMAL;');

            // Cache de 10000 páginas (~40MB)
            await this.db.execAsync('PRAGMA cache_size=10000;');

            console.log('✅ Base de datos optimizada');
        } catch (error) {
            console.error('⚠️ No se pudo optimizar la base de datos:', error);
        }
    }

    /**
     * Generar chatId consistente entre dos usuarios
     * Siempre ordena los IDs para que sea el mismo sin importar el orden
     */
    generateChatId(userId1, userId2) {
        const sortedIds = [userId1, userId2].sort((a, b) => a - b);
        return `${sortedIds[0]}-${sortedIds[1]}`;
    }

    /**
     * Ejecutar query SQL con parámetros
     */
    async execute(sql, params = []) {
        if (!this.db || !this.isInitialized) {
            const error = new Error('❌ CRÍTICO: Database not initialized - Debes llamar ChatDatabase.init() primero');
            console.error(error);
            throw error;
        }

        try {
            const result = await this.db.runAsync(sql, ...params);
            return result;
        } catch (error) {
            console.error('❌ Error ejecutando query:', error);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw error;
        }
    }

    /**
     * Ejecutar query SELECT y obtener resultados
     */
    async getAllAsync(sql, params = []) {
        if (!this.db || !this.isInitialized) {
            const error = new Error('❌ CRÍTICO: Database not initialized - Debes llamar ChatDatabase.init() primero');
            console.error(error);
            throw error;
        }

        try {
            const result = await this.db.getAllAsync(sql, ...params);
            return result;
        } catch (error) {
            console.error('❌ Error ejecutando SELECT:', error);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw error;
        }
    }

    /**
     * Guardar mensaje en SQLite
     */
    async saveMessage(message) {
        const sql = `
            INSERT OR REPLACE INTO messages 
            (id, senderId, receiverId, message, messageType, fileUrl, 
             isDelivered, isRead, isDeleted, createdAt, updatedAt, chatId, isSentByMe, tempId) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            message.id,
            message.senderId,
            message.receiverId,
            message.message,
            message.messageType,
            message.fileUrl || null,
            message.isDelivered ? 1 : 0,
            message.isRead ? 1 : 0,
            message.isDeleted ? 1 : 0,
            new Date(message.createdAt).getTime(),
            new Date(message.updatedAt || message.createdAt).getTime(),
            message.chatId,
            message.isSentByMe ? 1 : 0,
            message.tempId || null
        ];

        await this.execute(sql, params);
    }

    /**
     * Obtener mensajes de una conversación con paginación
     */
    async getMessages(chatId, page = 0, limit = 50) {
        const offset = page * limit;

        const sql = `
            SELECT * FROM messages 
            WHERE chatId = ? AND isDeleted = 0 
            ORDER BY createdAt DESC 
            LIMIT ? OFFSET ?
        `;

        const rows = await this.getAllAsync(sql, [chatId, limit, offset]);

        return rows.map(row => this.rowToMessage(row));
    }

    /**
     * Convertir fila de BD a objeto Message
     */
    rowToMessage(row) {
        return {
            id: row.id,
            tempId: row.tempId || undefined,
            senderId: row.senderId,
            receiverId: row.receiverId,
            message: row.message,
            messageType: row.messageType,
            fileUrl: row.fileUrl,
            isDelivered: row.isDelivered === 1,
            isRead: row.isRead === 1,
            isDeleted: row.isDeleted === 1,
            createdAt: new Date(row.createdAt).toISOString(),
            updatedAt: new Date(row.updatedAt).toISOString(),
            chatId: row.chatId,
            isSentByMe: row.isSentByMe === 1
        };
    }

    /**
     * Actualizar ID de mensaje temporal con ID real del servidor
     */
    async updateMessageId(tempId, realId) {
        try {
            // Verificar si ya existe un mensaje con el ID real
            const checkSql = `SELECT id FROM messages WHERE id = ?`;
            const existing = await this.getAllAsync(checkSql, [realId]);

            if (existing.length > 0) {
                // Ya existe un mensaje con ese ID real, solo eliminar el temporal
                console.log('⚠️ Mensaje con ID real ya existe, eliminando temporal:', tempId);
                const deleteSql = `DELETE FROM messages WHERE tempId = ?`;
                await this.execute(deleteSql, [tempId]);
            } else {
                // No existe, hacer UPDATE normal
                const sql = `UPDATE messages SET id = ?, tempId = NULL WHERE tempId = ?`;
                await this.execute(sql, [realId, tempId]);
            }
        } catch (error) {
            console.error('❌ Error en updateMessageId:', error);
            throw error;
        }
    }

    /**
     * Marcar mensaje como fallido
     */
    /**
     * Marcar mensaje como fallido
     */
    async markMessageAsFailed(tempId) {
        const sql = `UPDATE messages SET isDelivered = 0, status = 'failed' WHERE tempId = ? OR id = ?`;
        await this.execute(sql, [tempId, tempId]);
    }

    /**
     * Actualizar estado de mensaje (entregado/leído/fallido)
     */
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

    /**
     * Marcar todos los mensajes de un chat como leídos
     */
    async markChatAsRead(chatId) {
        const sql = `
            UPDATE messages 
            SET isRead = 1 
            WHERE chatId = ? AND isSentByMe = 0 AND isRead = 0
        `;
        await this.execute(sql, [chatId]);
    }

    /**
     * Contar mensajes no leídos de un chat
     */
    async getUnreadCount(chatId) {
        try {
            // Verificar que la BD esté inicializada
            if (!this.db) {
                if (__DEV__) {
                    console.log('💬 Base de datos aún no inicializada');
                }
                return 0;
            }

            const sql = `
                SELECT COUNT(*) as count FROM messages 
                WHERE chatId = ? AND isSentByMe = 0 AND isRead = 0 AND isDeleted = 0
            `;

            const rows = await this.getAllAsync(sql, [chatId]);
            return rows[0]?.count || 0;
        } catch (error) {
            // Silencioso: es normal que falle si las tablas no existen aún
            if (__DEV__) {
                console.log('💬 Error contando mensajes (normal al inicio):', error.message);
            }
            return 0;
        }
    }

    /**
     * Guardar o actualizar conversación
     */
    async saveConversation(conversation) {
        const sql = `
            INSERT OR REPLACE INTO conversations 
            (chatId, otherUserId, otherUserName, otherUserPhone, otherUserLogoUrl, otherUserRole,
             lastMessageId, lastMessageText, lastMessageTime, unreadCount, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            conversation.chatId,
            conversation.otherUserId,
            conversation.otherUserName,
            conversation.otherUserPhone || null,
            conversation.otherUserLogoUrl || null,
            conversation.otherUserRole || null,
            conversation.lastMessageId || null,
            conversation.lastMessageText || null,
            conversation.lastMessageTime ? new Date(conversation.lastMessageTime).getTime() : null,
            conversation.unreadCount,
            new Date(conversation.updatedAt).getTime()
        ];

        await this.execute(sql, params);
    }

    /**
     * Obtener todas las conversaciones
     */
    async getConversations() {
        const sql = `
            SELECT * FROM conversations 
            ORDER BY lastMessageTime DESC
        `;

        const rows = await this.getAllAsync(sql);

        return rows.map(row => this.rowToConversation(row));
    }

    /**
     * Convertir fila de BD a objeto Conversation
     */
    rowToConversation(row) {
        return {
            chatId: row.chatId,
            otherUserId: row.otherUserId,
            otherUserName: row.otherUserName,
            otherUserPhone: row.otherUserPhone,
            otherUserLogoUrl: row.otherUserLogoUrl,
            otherUserRole: row.otherUserRole,
            lastMessageId: row.lastMessageId,
            lastMessageText: row.lastMessageText,
            lastMessageTime: row.lastMessageTime ? new Date(row.lastMessageTime).toISOString() : undefined,
            unreadCount: row.unreadCount,
            updatedAt: new Date(row.updatedAt).toISOString()
        };
    }

    /**
     * Obtener conversación por chatId
     */
    async getConversation(chatId) {
        const sql = `SELECT * FROM conversations WHERE chatId = ?`;
        const rows = await this.getAllAsync(sql, [chatId]);

        if (rows.length === 0) return null;
        return this.rowToConversation(rows[0]);
    }

    /**
     * Actualizar contador de no leídos de una conversación
     */
    async updateUnreadCount(chatId) {
        const count = await this.getUnreadCount(chatId);

        const sql = `UPDATE conversations SET unreadCount = ? WHERE chatId = ?`;
        await this.execute(sql, [count, chatId]);
    }

    /**
     * Buscar mensajes por palabra clave
     */
    async searchMessages(query) {
        const sql = `
            SELECT * FROM messages 
            WHERE message LIKE ? AND isDeleted = 0 
            ORDER BY createdAt DESC 
            LIMIT 100
        `;

        const rows = await this.getAllAsync(sql, [`%${query}%`]);
        return rows.map(row => this.rowToMessage(row));
    }

    /**
     * Limpiar mensajes antiguos (más de 30 días)
     */
    async cleanOldMessages() {
        // Verificar que la base de datos esté inicializada
        if (!this.db || !this.isInitialized) {
            if (__DEV__) {
                console.log('💬 Base de datos no inicializada, omitiendo limpieza');
            }
            return 0;
        }

        try {
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

            const sql = `DELETE FROM messages WHERE createdAt < ?`;
            const result = await this.execute(sql, [thirtyDaysAgo]);

            console.log(`🧹 ${result.changes || 0} mensajes antiguos eliminados`);
            return result.changes || 0;
        } catch (error) {
            if (__DEV__) {
                console.log('💬 Error en limpieza de mensajes (no crítico):', error.message);
            }
            return 0;
        }
    }

    /**
     * Eliminar mensaje (soft delete)
     */
    async deleteMessage(messageId) {
        const sql = `UPDATE messages SET isDeleted = 1 WHERE id = ?`;
        await this.execute(sql, [messageId]);
    }

    /**
     * Cerrar base de datos
     */
    async close() {
        if (this.db) {
            await this.db.closeAsync();
            this.db = null;
            this.isInitialized = false;
            console.log('✅ ChatDatabase cerrada');
        }
    }
}

// Exportar instancia única (Singleton)
export default new ChatDatabase();
