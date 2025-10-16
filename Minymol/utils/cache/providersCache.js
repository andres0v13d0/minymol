import AsyncStorage from '@react-native-async-storage/async-storage';

const PROVIDERS_CACHE_KEY = '@minymol_providers_carousel';
const PROVIDERS_CACHE_TIMESTAMP_KEY = '@minymol_providers_carousel_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

/**
 * Obtiene los proveedores desde la caché
 * @returns {Promise<Array|null>} Array de proveedores o null si no hay caché
 */
export const getCachedProviders = async () => {
    try {
        const cachedData = await AsyncStorage.getItem(PROVIDERS_CACHE_KEY);

        if (!cachedData) {
            console.log('📦 ProvidersCache: No hay datos en caché');
            return null;
        }

        const providers = JSON.parse(cachedData);
        console.log('📦 ProvidersCache: Datos cargados desde caché:', providers.length, 'proveedores');
        return providers;
    } catch (error) {
        console.error('📦 ProvidersCache: Error al leer caché:', error);
        return null;
    }
};

/**
 * Guarda los proveedores en la caché
 * @param {Array} providers - Array de proveedores a guardar
 * @returns {Promise<boolean>} true si se guardó correctamente
 */
export const setCachedProviders = async (providers) => {
    try {
        if (!providers || !Array.isArray(providers)) {
            console.warn('📦 ProvidersCache: Datos inválidos para guardar en caché');
            return false;
        }

        await AsyncStorage.setItem(PROVIDERS_CACHE_KEY, JSON.stringify(providers));
        await AsyncStorage.setItem(PROVIDERS_CACHE_TIMESTAMP_KEY, Date.now().toString());

        console.log('📦 ProvidersCache: Datos guardados en caché:', providers.length, 'proveedores');
        return true;
    } catch (error) {
        console.error('📦 ProvidersCache: Error al guardar caché:', error);
        return false;
    }
};

/**
 * Verifica si la caché ha expirado
 * @returns {Promise<boolean>} true si la caché ha expirado o no existe
 */
export const isCacheExpired = async () => {
    try {
        const timestamp = await AsyncStorage.getItem(PROVIDERS_CACHE_TIMESTAMP_KEY);

        if (!timestamp) {
            console.log('📦 ProvidersCache: No hay timestamp, caché expirada');
            return true;
        }

        const cacheAge = Date.now() - parseInt(timestamp, 10);
        const expired = cacheAge > CACHE_DURATION;

        if (expired) {
            console.log('📦 ProvidersCache: Caché expirada (edad:', Math.round(cacheAge / 1000 / 60), 'minutos)');
        } else {
            console.log('📦 ProvidersCache: Caché válida (edad:', Math.round(cacheAge / 1000 / 60), 'minutos)');
        }

        return expired;
    } catch (error) {
        console.error('📦 ProvidersCache: Error al verificar expiración:', error);
        return true;
    }
};

/**
 * Limpia la caché de proveedores
 * @returns {Promise<boolean>} true si se limpió correctamente
 */
export const clearProvidersCache = async () => {
    try {
        await AsyncStorage.removeItem(PROVIDERS_CACHE_KEY);
        await AsyncStorage.removeItem(PROVIDERS_CACHE_TIMESTAMP_KEY);
        console.log('📦 ProvidersCache: Caché limpiada');
        return true;
    } catch (error) {
        console.error('📦 ProvidersCache: Error al limpiar caché:', error);
        return false;
    }
};

/**
 * Obtiene información sobre la caché
 * @returns {Promise<Object>} Información de la caché
 */
export const getCacheInfo = async () => {
    try {
        const timestamp = await AsyncStorage.getItem(PROVIDERS_CACHE_TIMESTAMP_KEY);
        const data = await AsyncStorage.getItem(PROVIDERS_CACHE_KEY);

        if (!timestamp || !data) {
            return {
                exists: false,
                count: 0,
                age: null,
                expired: true,
            };
        }

        const providers = JSON.parse(data);
        const cacheAge = Date.now() - parseInt(timestamp, 10);
        const expired = cacheAge > CACHE_DURATION;

        return {
            exists: true,
            count: providers.length,
            age: cacheAge,
            ageInMinutes: Math.round(cacheAge / 1000 / 60),
            expired,
        };
    } catch (error) {
        console.error('📦 ProvidersCache: Error al obtener info de caché:', error);
        return {
            exists: false,
            count: 0,
            age: null,
            expired: true,
            error: error.message,
        };
    }
};
