import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

/**
 * Función centralizada para llamadas HTTP con autenticación Firebase
 * Similar a secureFetch pero optimizada para React Native
 */
export const apiCall = async (url, options = {}) => {
    try {
        // Obtener token actual de Firebase
        const user = auth.currentUser;
        let token = null;

        if (user) {
            // Forzar renovación del token para asegurar que esté fresco
            token = await user.getIdToken(true);

            // Actualizar token en AsyncStorage
            await AsyncStorage.setItem('token', token);
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

        // Si el token está vencido (401), intentar renovar
        if (response.status === 401 && user) {
            console.log('Token vencido, renovando...');

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
        }

        return response;
    } catch (error) {
        console.error('Error en apiCall:', error);
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