import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_CONFIG, CACHE_KEYS, TTL_TIMES } from './StorageKeys';

/**
 * CacheManager - Sistema de caché completo para Minymol
 * Maneja TTL, limpieza automática y compresión de datos
 */
class CacheManager {
    constructor() {
        this.isInitialized = false;
        this.metadata = null;
    }

    /**
     * Inicializar el cache manager
     * Se debe llamar al inicio de la app
     */
    async initialize() {
        try {
            await this.loadMetadata();
            await this.performCleanupIfNeeded();
            this.isInitialized = true;
            console.log('✅ CacheManager inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando CacheManager:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Obtener datos del caché
     * @param {string} key - Clave del caché
     * @param {boolean} checkTTL - Si verificar expiración (default: true)
     * @returns {Object|null} Datos cacheados o null
     */
    async get(key, checkTTL = true) {
        try {
            const cached = await AsyncStorage.getItem(key);
            if (!cached) return null;

            const parsedData = JSON.parse(cached);

            // Verificar TTL si está habilitado
            if (checkTTL && this.isExpired(parsedData)) {
                await this.remove(key);
                return null;
            }

            // Actualizar último acceso
            await this.updateLastAccess(key);

            return parsedData.data;
        } catch (error) {
            console.error(`Error leyendo caché [${key}]:`, error);
            return null;
        }
    }

    /**
     * Guardar datos en el caché
     * @param {string} key - Clave del caché
     * @param {any} data - Datos a guardar
     * @param {number} customTTL - TTL personalizado en segundos
     */
    async set(key, data, customTTL = null) {
        try {
            const ttl = customTTL || TTL_TIMES[key] || TTL_TIMES.DEFAULT;
            const cacheItem = {
                data,
                timestamp: Date.now(),
                ttl: ttl * 1000, // Convertir a millisegundos
                version: CACHE_CONFIG.CURRENT_VERSION,
                lastAccess: Date.now(),
                size: this.calculateSize(data)
            };

            await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
            await this.updateMetadata(key, cacheItem);

            console.log(`💾 Guardado en caché [${key}] - TTL: ${ttl}s`);
        } catch (error) {
            console.error(`Error guardando caché [${key}]:`, error);
        }
    }

    /**
     * Eliminar una clave del caché
     * @param {string} key - Clave a eliminar
     */
    async remove(key) {
        try {
            await AsyncStorage.removeItem(key);
            await this.removeFromMetadata(key);
            console.log(`🗑️ Eliminado del caché [${key}]`);
        } catch (error) {
            console.error(`Error eliminando caché [${key}]:`, error);
        }
    }

    /**
     * Limpiar todo el caché
     */
    async clear() {
        try {
            const keys = await this.getAllCacheKeys();
            await AsyncStorage.multiRemove(keys);
            await this.resetMetadata();
            console.log('🧹 Caché completamente limpiado');
        } catch (error) {
            console.error('Error limpiando caché:', error);
        }
    }

    /**
     * Obtener múltiples valores del caché en paralelo
     * @param {string[]} keys - Array de claves
     * @returns {Object} Objeto con datos por clave
     */
    async getMultiple(keys) {
        try {
            const promises = keys.map(key => this.get(key));
            const results = await Promise.all(promises);

            return keys.reduce((acc, key, index) => {
                acc[key] = results[index];
                return acc;
            }, {});
        } catch (error) {
            console.error('Error obteniendo múltiples cachés:', error);
            return {};
        }
    }

    /**
     * Verificar si una entrada está expirada
     * @param {Object} cacheItem - Item del caché
     * @returns {boolean} True si está expirado
     */
    isExpired(cacheItem) {
        if (!cacheItem.timestamp || !cacheItem.ttl) return false;
        return Date.now() - cacheItem.timestamp > cacheItem.ttl;
    }

    /**
     * Obtener información del caché
     * @returns {Object} Estadísticas del caché
     */
    async getStats() {
        try {
            const metadata = await this.getMetadata();
            const keys = await this.getAllCacheKeys();

            return {
                totalKeys: keys.length,
                totalSize: metadata.totalSize || 0,
                lastCleanup: metadata.lastCleanup,
                version: CACHE_CONFIG.CURRENT_VERSION,
                maxSize: CACHE_CONFIG.MAX_CACHE_SIZE
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return null;
        }
    }

    /**
     * Invalidar caché basado en patrón
     * @param {string} pattern - Patrón de la clave (ej: "products_*")
     */
    async invalidatePattern(pattern) {
        try {
            const allKeys = await this.getAllCacheKeys();
            const regex = new RegExp(pattern.replace('*', '.*'));
            const keysToRemove = allKeys.filter(key => regex.test(key));

            await AsyncStorage.multiRemove(keysToRemove);
            console.log(`🔄 Invalidadas ${keysToRemove.length} entradas con patrón: ${pattern}`);
        } catch (error) {
            console.error('Error invalidando patrón:', error);
        }
    }

    // ===== MÉTODOS PRIVADOS =====

    /**
     * Cargar metadatos del caché
     */
    async loadMetadata() {
        try {
            const metadata = await AsyncStorage.getItem(CACHE_KEYS.METADATA);
            this.metadata = metadata ? JSON.parse(metadata) : this.createDefaultMetadata();
        } catch (error) {
            this.metadata = this.createDefaultMetadata();
        }
    }

    /**
     * Obtener metadatos actuales
     */
    async getMetadata() {
        if (!this.metadata) {
            await this.loadMetadata();
        }
        return this.metadata;
    }

    /**
     * Actualizar metadatos cuando se agrega/modifica un item
     */
    async updateMetadata(key, cacheItem) {
        const metadata = await this.getMetadata();

        metadata.keys[key] = {
            timestamp: cacheItem.timestamp,
            size: cacheItem.size,
            lastAccess: cacheItem.lastAccess
        };

        metadata.totalSize = Object.values(metadata.keys)
            .reduce((sum, item) => sum + (item.size || 0), 0);

        await AsyncStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(metadata));
        this.metadata = metadata;
    }

    /**
     * Remover clave de metadatos
     */
    async removeFromMetadata(key) {
        const metadata = await this.getMetadata();
        delete metadata.keys[key];

        metadata.totalSize = Object.values(metadata.keys)
            .reduce((sum, item) => sum + (item.size || 0), 0);

        await AsyncStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(metadata));
        this.metadata = metadata;
    }

    /**
     * Actualizar último acceso de una clave
     */
    async updateLastAccess(key) {
        const metadata = await this.getMetadata();
        if (metadata.keys[key]) {
            metadata.keys[key].lastAccess = Date.now();
            await AsyncStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(metadata));
            this.metadata = metadata;
        }
    }

    /**
     * Crear metadatos por defecto
     */
    createDefaultMetadata() {
        return {
            version: CACHE_CONFIG.CURRENT_VERSION,
            totalSize: 0,
            keys: {},
            lastCleanup: Date.now(),
            createdAt: Date.now()
        };
    }

    /**
     * Resetear metadatos
     */
    async resetMetadata() {
        this.metadata = this.createDefaultMetadata();
        await AsyncStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(this.metadata));
    }

    /**
     * Obtener todas las claves del caché
     */
    async getAllCacheKeys() {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            return allKeys.filter(key => key.startsWith('@minymol_'));
        } catch (error) {
            console.error('Error obteniendo claves:', error);
            return [];
        }
    }

    /**
     * Realizar limpieza automática si es necesario
     */
    async performCleanupIfNeeded() {
        const metadata = await this.getMetadata();
        const now = Date.now();
        const timeSinceLastCleanup = now - (metadata.lastCleanup || 0);

        // Limpiar cada 24 horas o si excede el tamaño máximo
        const shouldCleanup =
            timeSinceLastCleanup > CACHE_CONFIG.CLEANUP_INTERVAL ||
            metadata.totalSize > CACHE_CONFIG.MAX_CACHE_SIZE;

        if (shouldCleanup) {
            await this.performCleanup();
        }
    }

    /**
     * Realizar limpieza del caché
     */
    async performCleanup() {
        try {
            console.log('🧹 Iniciando limpieza automática del caché...');

            const allKeys = await this.getAllCacheKeys();
            const keysToRemove = [];

            for (const key of allKeys) {
                if (key === CACHE_KEYS.METADATA) continue;

                const cached = await AsyncStorage.getItem(key);
                if (cached) {
                    const parsedData = JSON.parse(cached);

                    // Eliminar si está expirado o es versión antigua
                    if (this.isExpired(parsedData) ||
                        parsedData.version < CACHE_CONFIG.CURRENT_VERSION) {
                        keysToRemove.push(key);
                    }
                }
            }

            if (keysToRemove.length > 0) {
                await AsyncStorage.multiRemove(keysToRemove);
                console.log(`🗑️ Eliminadas ${keysToRemove.length} entradas expiradas`);
            }

            // Actualizar metadata
            const metadata = await this.getMetadata();
            metadata.lastCleanup = Date.now();
            await AsyncStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(metadata));
            this.metadata = metadata;

            console.log('✅ Limpieza completada');
        } catch (error) {
            console.error('❌ Error durante limpieza:', error);
        }
    }

    /**
     * Calcular tamaño aproximado de los datos
     */
    calculateSize(data) {
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch (error) {
            // Fallback para React Native
            return JSON.stringify(data).length * 2; // Aproximación
        }
    }
}

// Exportar instancia singleton
export default new CacheManager();