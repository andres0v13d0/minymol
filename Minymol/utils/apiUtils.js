import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

// Cache para peticiones y throttling
const requestCache = new Map();
const requestTimestamps = new Map();
const THROTTLE_DELAY = 1000; // 1 segundo entre peticiones similares
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos entre reintentos

/**
 * Función de throttling para evitar spam de peticiones
 */
const shouldThrottleRequest = (url, method = 'GET') => {
    const key = `${method}:${url}`;
    const now = Date.now();
    const lastRequest = requestTimestamps.get(key);

    if (lastRequest && (now - lastRequest) < THROTTLE_DELAY) {
        return true;
    }

    requestTimestamps.set(key, now);
    return false;
};

/**
 * Función para manejar errores de cuota de Firebase
 */
const handleQuotaError = async (error, retryCount = 0) => {
    const isQuotaError = error.message?.includes('quota-exceeded') || 
                        error.code === 'auth/quota-exceeded';
    
    if (isQuotaError && retryCount < MAX_RETRIES) {
        console.log(`Cuota excedida, esperando ${RETRY_DELAY}ms antes del reintento ${retryCount + 1}/${MAX_RETRIES}`);
        
        // Esperar con backoff exponencial
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return true; // Indica que se debe reintentar
    }
    
    return false; // No reintentar
};

/**
 * Función centralizada para llamadas HTTP con autenticación Firebase
 * Incluye throttling y manejo de errores de cuota
 */
export const apiCall = async (url, options = {}, retryCount = 0) => {
    const method = options.method || 'GET';
    
    // Verificar throttling
    if (shouldThrottleRequest(url, method)) {
        console.log(`Petición throttled: ${method} ${url}`);
        
        // Retornar respuesta desde caché si existe
        const cacheKey = `${method}:${url}`;
        const cachedResponse = requestCache.get(cacheKey);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Esperar el throttle delay
        await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY));
    }

    try {
        // Obtener token actual de Firebase
        const user = auth.currentUser;
        let token = null;

        if (user) {
            try {
                // Obtener token sin forzar renovación para evitar sobrecarga
                token = await user.getIdToken(false);
                
                // Solo actualizar en AsyncStorage si es necesario
                const storedToken = await AsyncStorage.getItem('token');
                if (storedToken !== token) {
                    await AsyncStorage.setItem('token', token);
                }
            } catch (tokenError) {
                console.error('Error obteniendo token:', tokenError);
                
                // Si hay error de cuota, manejarlo
                const shouldRetry = await handleQuotaError(tokenError, retryCount);
                if (shouldRetry) {
                    return apiCall(url, options, retryCount + 1);
                }
                throw tokenError;
            }
        } else {
            // Si no hay usuario autenticado, intentar obtener token del storage
            token = await AsyncStorage.getItem('token');
        }

        // Configurar headers por defecto
        const defaultHeaders = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };

        // Merge headers
        const headers = {
            ...defaultHeaders,
            ...options.headers
        };

        // Realizar llamada HTTP
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Cachear respuesta exitosa para GET requests
        if (method === 'GET' && response.ok) {
            const cacheKey = `${method}:${url}`;
            requestCache.set(cacheKey, response.clone());
            
            // Limpiar caché después de 5 minutos
            setTimeout(() => requestCache.delete(cacheKey), 5 * 60 * 1000);
        }

        // Si el token está vencido (401), intentar renovar
        if (response.status === 401 && user && retryCount < MAX_RETRIES) {
            console.log('Token vencido, renovando...');

            try {
                // Renovar token
                const newToken = await user.getIdToken(true);
                await AsyncStorage.setItem('token', newToken);

                // Reintentar llamada con nuevo token
                const retryResponse = await fetch(url, {
                    ...options,
                    headers: {
                        ...defaultHeaders,
                        'Authorization': `Bearer ${newToken}`,
                        ...options.headers
                    }
                });

                return retryResponse;
            } catch (renewError) {
                console.error('Error renovando token:', renewError);
                
                // Si hay error de cuota, manejarlo
                const shouldRetry = await handleQuotaError(renewError, retryCount);
                if (shouldRetry) {
                    return apiCall(url, options, retryCount + 1);
                }
                throw renewError;
            }
        }

        return response;
    } catch (error) {
        console.error('Error en apiCall:', error);
        
        // Manejar errores de cuota de Firebase
        const shouldRetry = await handleQuotaError(error, retryCount);
        if (shouldRetry) {
            return apiCall(url, options, retryCount + 1);
        }
        
        throw error;
    }
};

/**
 * Verificar si el usuario está autenticado
 */
export const isAuthenticated = () => {
    return auth.currentUser !== null;
};

/**
 * Obtener datos del usuario desde AsyncStorage
 */
export const getUserData = async () => {
    try {
        const userData = await AsyncStorage.getItem('usuario');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error obteniendo datos de usuario:', error);
        return null;
    }
};

/**
 * Obtener ID del usuario actual
 */
export const getUserId = async () => {
    try {
        const userData = await getUserData();
        return userData?.id || null;
    } catch (error) {
        console.error('Error obteniendo ID de usuario:', error);
        return null;
    }
};