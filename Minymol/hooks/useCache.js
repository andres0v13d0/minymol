import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook personalizado para manejo de caché con AsyncStorage y funcionalidad SWR-like
 * @param {string} key - Clave para el almacenamiento
 * @param {Function|*} fetcherOrDefaultValue - Función fetcher para datos remotos o valor por defecto
 * @param {Object} options - Opciones de configuración
 */
export const useCache = (key, fetcherOrDefaultValue = null, options = {}) => {
    // Si el segundo parámetro es una función, es un fetcher; si no, es defaultValue
    const isFetcher = typeof fetcherOrDefaultValue === 'function';
    const fetcher = isFetcher ? fetcherOrDefaultValue : null;
    const defaultValue = isFetcher ? null : fetcherOrDefaultValue;
    
    const {
        expireTime = null,
        enabled = true,
        refreshOnMount = false,
        refreshOnFocus = false,
    } = options;
    const [data, setData] = useState(defaultValue);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [hasCache, setHasCache] = useState(false);
    const [isOnline] = useState(true); // Simplificado para este caso
    
    const mountedRef = useRef(true);
    const fetchingRef = useRef(false);

    // Generar claves para datos y timestamp
    const dataKey = key;
    const timestampKey = `${key}_timestamp`;

    /**
     * Verifica si el caché ha expirado
     */
    const isCacheExpired = useCallback(async () => {
        if (!expireTime) return false;

        try {
            const timestamp = await AsyncStorage.getItem(timestampKey);
            if (!timestamp) return true;

            const now = Date.now();
            const cacheTime = parseInt(timestamp, 10);

            return (now - cacheTime) > expireTime;
        } catch (err) {
            console.error('Error checking cache expiration:', err);
            return true;
        }
    }, [timestampKey, expireTime]);

    /**
     * Carga datos del caché
     */
    const loadFromCache = useCallback(async () => {
        if (!key || !mountedRef.current) return defaultValue;
        
        try {
            // Verificar si el caché ha expirado
            const expired = await isCacheExpired();
            if (expired) {
                setHasCache(false);
                return defaultValue;
            }

            const cachedData = await AsyncStorage.getItem(dataKey);

            if (cachedData !== null) {
                const parsedData = JSON.parse(cachedData);
                setHasCache(true);
                return parsedData;
            } else {
                setHasCache(false);
                return defaultValue;
            }
        } catch (err) {
            console.error('Error loading from cache:', err);
            setHasCache(false);
            return defaultValue;
        }
    }, [dataKey, defaultValue, isCacheExpired, key]);

    /**
     * Fetch datos remotos
     */
    const fetchData = useCallback(async (isRefresh = false) => {
        if (!fetcher || !enabled || !key || fetchingRef.current || !mountedRef.current) {
            return;
        }

        try {
            fetchingRef.current = true;
            
            if (isRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            
            setError(null);

            const result = await fetcher();
            
            if (mountedRef.current) {
                setData(result);
                
                // Guardar en caché
                if (result !== null && result !== undefined) {
                    await AsyncStorage.setItem(dataKey, JSON.stringify(result));
                    if (expireTime) {
                        await AsyncStorage.setItem(timestampKey, Date.now().toString());
                    }
                    setHasCache(true);
                }
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            if (mountedRef.current) {
                setError(err);
            }
        } finally {
            fetchingRef.current = false;
            if (mountedRef.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [fetcher, enabled, key, dataKey, timestampKey, expireTime]);

    /**
     * Mutate function (SWR-like)
     */
    const mutate = useCallback(async (newData, shouldRevalidate = true) => {
        if (!mountedRef.current) return;
        
        try {
            if (newData !== undefined) {
                setData(newData);
                
                // Guardar en caché
                if (newData !== null) {
                    await AsyncStorage.setItem(dataKey, JSON.stringify(newData));
                    if (expireTime) {
                        await AsyncStorage.setItem(timestampKey, Date.now().toString());
                    }
                    setHasCache(true);
                }
            }

            // Revalidar si se solicita
            if (shouldRevalidate && fetcher) {
                await fetchData(true);
            }
        } catch (err) {
            console.error('Error in mutate:', err);
            setError(err);
        }
    }, [dataKey, timestampKey, expireTime, fetchData, fetcher]);

    /**
     * Refresh function
     */
    const refresh = useCallback(async () => {
        await fetchData(true);
    }, [fetchData]);

    // Cargar datos inicialmente
    useEffect(() => {
        if (!key) return;
        
        mountedRef.current = true;
        
        const initializeData = async () => {
            // Cargar desde caché primero
            const cachedData = await loadFromCache();
            if (mountedRef.current) {
                setData(cachedData);
                setIsLoading(false);
            }

            // Si hay fetcher y está habilitado, y se solicita refresh en mount
            if (fetcher && enabled && refreshOnMount) {
                await fetchData();
            } else if (fetcher && enabled && !hasCache) {
                // O si no hay caché y hay fetcher
                await fetchData();
            } else if (!fetcher) {
                // Si no hay fetcher, solo usar datos de caché o default
                setIsLoading(false);
            }
        };

        initializeData();

        return () => {
            mountedRef.current = false;
        };
    }, [key, enabled]); // Solo depender de key y enabled para evitar loops

    // Cleanup effect
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            fetchingRef.current = false;
        };
    }, []);

    return {
        data,
        isLoading,
        isRefreshing,
        error,
        hasCache,
        isOnline,
        mutate,
        refresh,
        // Mantener compatibilidad con API anterior
        loading: isLoading,
        saveToCache: mutate,
        clearCache: async () => {
            try {
                await AsyncStorage.removeItem(dataKey);
                if (expireTime) {
                    await AsyncStorage.removeItem(timestampKey);
                }
                setData(defaultValue);
                setHasCache(false);
                return true;
            } catch (err) {
                console.error('Error clearing cache:', err);
                setError(err);
                return false;
            }
        },
        updateCache: mutate,
        refreshCache: refresh,
        isCacheExpired,
    };
};

/**
 * Hook simplificado para caché con tiempo de expiración
 */
export const useCacheWithExpiry = (key, defaultValue, expireTimeMs) => {
    return useCache(key, defaultValue, expireTimeMs);
};

/**
 * Hook para caché permanente (sin expiración)
 */
export const usePermanentCache = (key, defaultValue) => {
    return useCache(key, defaultValue, null);
};

export default useCache;