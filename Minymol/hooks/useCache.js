import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import CacheManager from '../utils/cache/CacheManager';

/**
 * Hook personalizado para manejar caché con lógica tipo Temu
 * Carga instantánea desde caché + actualización en background
 */
export const useCache = (key, fetchFunction, options = {}) => {
    const {
        enabled = true,
        customTTL = null,
        refreshOnMount = true,
        refreshOnFocus = false,
        retryOnError = true,
        dependencies = [],
    } = options;

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isOnline, setIsOnline] = useState(true);
    const [hasCache, setHasCache] = useState(false);

    const isMountedRef = useRef(true);
    const fetchingRef = useRef(false);
    const lastFetchTime = useRef(0);

    // Detectar estado de conexión
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected);
        });

        return () => {
            unsubscribe();
            isMountedRef.current = false;
        };
    }, []);

    /**
     * Cargar datos desde caché
     */
    const loadFromCache = useCallback(async () => {
        if (!enabled || !key) return null;

        try {
            const cachedData = await CacheManager.get(key);
            if (cachedData && isMountedRef.current) {
                setData(cachedData);
                setHasCache(true);
                setLastUpdated(new Date());
                return cachedData;
            }
            return null;
        } catch (error) {
            console.error(`Error cargando caché [${key}]:`, error);
            return null;
        }
    }, [key, enabled]);

    /**
     * Ejecutar función de fetch con manejo de errores
     */
    const executeFetch = useCallback(async (isBackground = false) => {
        if (!enabled || !fetchFunction || !isOnline || fetchingRef.current) {
            return;
        }

        // Evitar requests muy frecuentes
        const now = Date.now();
        if (now - lastFetchTime.current < 5000) { // 5 segundos mínimo
            return;
        }

        try {
            fetchingRef.current = true;
            lastFetchTime.current = now;

            if (!isBackground && !hasCache) {
                setIsLoading(true);
            } else {
                setIsRefreshing(true);
            }

            setError(null);

            const freshData = await fetchFunction();

            if (isMountedRef.current && freshData) {
                // Comparar con datos actuales para evitar re-renders innecesarios
                const isDifferent = JSON.stringify(freshData) !== JSON.stringify(data);

                if (isDifferent) {
                    setData(freshData);
                    setLastUpdated(new Date());

                    // Guardar en caché
                    await CacheManager.set(key, freshData, customTTL);
                    console.log(`📱 Datos actualizados [${key}]`);
                } else {
                    console.log(`✅ Datos sin cambios [${key}]`);
                }
            }
        } catch (fetchError) {
            console.error(`Error fetching [${key}]:`, fetchError);

            if (isMountedRef.current) {
                setError(fetchError);

                // Si no hay caché y hay error, mantener el loading
                if (!hasCache) {
                    setIsLoading(true);
                }
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
            fetchingRef.current = false;
        }
    }, [enabled, fetchFunction, isOnline, key, customTTL, data, hasCache]);

    /**
     * Invalidar caché y refrescar
     */
    const invalidateAndRefresh = useCallback(async () => {
        if (!key) return;

        await CacheManager.remove(key);
        setData(null);
        setHasCache(false);
        await executeFetch(false);
    }, [key, executeFetch]);

    /**
     * Refrescar datos manualmente
     */
    const refresh = useCallback(async () => {
        await executeFetch(false);
    }, [executeFetch]);

    /**
     * Mutación optimista
     */
    const mutate = useCallback(async (newData, shouldRevalidate = true) => {
        if (isMountedRef.current) {
            setData(newData);

            if (newData && key) {
                await CacheManager.set(key, newData, customTTL);
            }

            if (shouldRevalidate) {
                setTimeout(() => executeFetch(true), 100);
            }
        }
    }, [key, customTTL, executeFetch]);

    // Efecto principal: cargar caché + fetch en background
    useEffect(() => {
        if (!enabled || !key) return;

        const initialize = async () => {
            // 1. Cargar desde caché inmediatamente
            const cachedData = await loadFromCache();

            // 2. Si hay caché, mostrar y hacer fetch en background
            // 3. Si no hay caché, hacer fetch con loading
            if (refreshOnMount || !cachedData) {
                const isBackground = !!cachedData;
                setTimeout(() => executeFetch(isBackground), isBackground ? 100 : 0);
            }
        };

        initialize();
    }, [key, enabled, refreshOnMount, ...dependencies]);

    // Refrescar cuando vuelve la conexión
    useEffect(() => {
        if (isOnline && hasCache && refreshOnMount) {
            setTimeout(() => executeFetch(true), 1000);
        }
    }, [isOnline, hasCache, refreshOnMount, executeFetch]);

    return {
        data,
        isLoading,
        isRefreshing,
        error,
        lastUpdated,
        isOnline,
        hasCache,
        refresh,
        invalidateAndRefresh,
        mutate,
    };
};

/**
 * Hook especializado para listas con paginación
 */
export const usePaginatedCache = (baseKey, fetchFunction, options = {}) => {
    const {
        pageSize = 20,
        maxCachedPages = 3,
        ...restOptions
    } = options;

    const [pages, setPages] = useState({});
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const getPageKey = useCallback((page) => `${baseKey}_page_${page}`, [baseKey]);

    const fetchPage = useCallback(async (page) => {
        const pageData = await fetchFunction(page, pageSize);

        if (pageData) {
            setPages(prev => ({
                ...prev,
                [page]: pageData
            }));

            setHasMore(pageData.length === pageSize);

            // Cachear la página
            const pageKey = getPageKey(page);
            await CacheManager.set(pageKey, pageData);
        }

        return pageData;
    }, [fetchFunction, pageSize, getPageKey]);

    const loadMore = useCallback(async () => {
        if (hasMore && !pages[currentPage + 1]) {
            const nextPage = currentPage + 1;
            await fetchPage(nextPage);
            setCurrentPage(nextPage);
        }
    }, [hasMore, pages, currentPage, fetchPage]);

    const refresh = useCallback(async () => {
        setPages({});
        setCurrentPage(1);
        setHasMore(true);
        await fetchPage(1);
    }, [fetchPage]);

    // Cargar primera página desde caché
    useEffect(() => {
        const loadInitialPage = async () => {
            const firstPageKey = getPageKey(1);
            const cachedPage = await CacheManager.get(firstPageKey);

            if (cachedPage) {
                setPages({ 1: cachedPage });
            } else {
                await fetchPage(1);
            }
        };

        loadInitialPage();
    }, [baseKey]);

    // Combinar todas las páginas en un array
    const allData = Object.keys(pages)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .reduce((acc, pageNum) => [...acc, ...pages[pageNum]], []);

    return {
        data: allData,
        pages,
        hasMore,
        currentPage,
        loadMore,
        refresh,
        isLoading: Object.keys(pages).length === 0,
    };
};

/**
 * Hook para múltiples cachés en paralelo
 */
export const useMultipleCache = (cacheConfigs) => {
    const [results, setResults] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAllCaches = async () => {
            const promises = cacheConfigs.map(async ({ key, fetchFunction, ...options }) => {
                const cachedData = await CacheManager.get(key);

                return {
                    key,
                    data: cachedData,
                    hasCache: !!cachedData,
                    fetchFunction,
                    options
                };
            });

            const cacheResults = await Promise.all(promises);

            const initialResults = {};
            const backgroundFetches = [];

            cacheResults.forEach(({ key, data, hasCache, fetchFunction, options }) => {
                initialResults[key] = {
                    data,
                    hasCache,
                    isLoading: !hasCache,
                };

                // Fetch en background si es necesario
                if (!hasCache || options.refreshOnMount !== false) {
                    backgroundFetches.push(
                        fetchFunction().then(freshData => ({ key, data: freshData }))
                    );
                }
            });

            setResults(initialResults);
            setIsLoading(false);

            // Procesar fetches en background
            if (backgroundFetches.length > 0) {
                Promise.all(backgroundFetches).then(fetchResults => {
                    const updatedResults = { ...initialResults };

                    fetchResults.forEach(({ key, data }) => {
                        if (data) {
                            updatedResults[key] = {
                                ...updatedResults[key],
                                data,
                                isLoading: false,
                            };

                            CacheManager.set(key, data);
                        }
                    });

                    setResults(updatedResults);
                });
            }
        };

        loadAllCaches();
    }, []);

    return { results, isLoading };
};