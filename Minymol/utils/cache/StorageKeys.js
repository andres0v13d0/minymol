/**
 * StorageKeys - Configuración centralizada del sistema de caché
 * Todas las keys, TTL y configuraciones del caché
 */

// Prefijo para todas las keys del caché
const CACHE_PREFIX = '@minymol_';

// ===== CACHE KEYS =====
export const CACHE_KEYS = {
    // Metadatos del sistema
    METADATA: `${CACHE_PREFIX}cache_metadata`,

    // === NAVEGACIÓN Y CATEGORÍAS ===
    CATEGORIES_MAIN: `${CACHE_PREFIX}categories_main`,
    SUBCATEGORIES: (categoryId) => `${CACHE_PREFIX}subcategories_${categoryId}`,
    CATEGORY_FILTERS: (categoryId) => `${CACHE_PREFIX}filters_${categoryId}`,

    // === HOME FEED ===
    HOME_PRODUCTS_PAGE: (page) => `${CACHE_PREFIX}home_products_page_${page}`,
    HOME_BANNERS: `${CACHE_PREFIX}home_banners`,
    HOME_TRENDING: `${CACHE_PREFIX}home_trending`,

    // === PRODUCTOS ===
    PRODUCTS_CATEGORY: (categoryId, filters = '', page = 1) => {
        const filterHash = filters ? `_${btoa(filters).slice(0, 8)}` : '';
        return `${CACHE_PREFIX}products_${categoryId}${filterHash}_page_${page}`;
    },
    PRODUCT_DETAIL: (productId) => `${CACHE_PREFIX}product_detail_${productId}`,
    PRODUCT_RELATED: (productId) => `${CACHE_PREFIX}product_related_${productId}`,

    // === BÚSQUEDA ===
    SEARCH_RESULTS: (query) => `${CACHE_PREFIX}search_${encodeURIComponent(query)}`,
    RECENT_SEARCHES: `${CACHE_PREFIX}recent_searches`,
    TRENDING_SEARCHES: `${CACHE_PREFIX}trending_searches`,
    SEARCH_SUGGESTIONS: `${CACHE_PREFIX}search_suggestions`,

    // === PROVEEDORES Y REELS ===
    PROVIDERS_CAROUSEL: `${CACHE_PREFIX}providers_carousel`,
    REELS_PROVIDERS: `${CACHE_PREFIX}reels_providers`,
    MY_REELS: (userId) => `${CACHE_PREFIX}my_reels_${userId}`,
    PROVIDER_STORIES: (providerId) => `${CACHE_PREFIX}provider_stories_${providerId}`,

    // === USUARIO ===
    USER_FAVORITES: (userId) => `${CACHE_PREFIX}user_favorites_${userId}`,
    RECENTLY_VIEWED: (userId) => `${CACHE_PREFIX}recently_viewed_${userId}`,
    USER_PREFERENCES: (userId) => `${CACHE_PREFIX}user_preferences_${userId}`,
    CART_BACKUP: (userId) => `${CACHE_PREFIX}cart_backup_${userId}`,

    // === CONFIGURACIÓN ===
    APP_CONFIG: `${CACHE_PREFIX}app_config`,
    FEATURE_FLAGS: `${CACHE_PREFIX}feature_flags`,
    TRANSLATIONS: (language) => `${CACHE_PREFIX}translations_${language}`,

    // === NOTIFICACIONES ===
    NOTIFICATIONS: (userId) => `${CACHE_PREFIX}notifications_${userId}`,
    PUSH_TOKENS: `${CACHE_PREFIX}push_tokens`,
};

// ===== TTL TIMES (en segundos) =====
export const TTL_TIMES = {
    // Datos casi estáticos (cambian raramente)
    [CACHE_KEYS.CATEGORIES_MAIN]: 7 * 24 * 60 * 60, // 7 días
    [CACHE_KEYS.APP_CONFIG]: 24 * 60 * 60, // 24 horas
    [CACHE_KEYS.FEATURE_FLAGS]: 6 * 60 * 60, // 6 horas

    // Subcategorías (por patrón)
    SUBCATEGORIES: 3 * 24 * 60 * 60, // 3 días
    CATEGORY_FILTERS: 24 * 60 * 60, // 24 horas

    // Home feed
    HOME_PRODUCTS_PAGE: 1 * 60 * 60, // 1 hora
    HOME_BANNERS: 6 * 60 * 60, // 6 horas
    HOME_TRENDING: 30 * 60, // 30 minutos

    // Productos
    PRODUCTS_CATEGORY: 2 * 60 * 60, // 2 horas
    PRODUCT_DETAIL: 12 * 60 * 60, // 12 horas
    PRODUCT_RELATED: 6 * 60 * 60, // 6 horas

    // Búsqueda
    SEARCH_RESULTS: 30 * 60, // 30 minutos
    RECENT_SEARCHES: 30 * 24 * 60 * 60, // 30 días (permanente prácticamente)
    TRENDING_SEARCHES: 24 * 60 * 60, // 24 horas
    SEARCH_SUGGESTIONS: 6 * 60 * 60, // 6 horas

    // Proveedores y Reels
    [CACHE_KEYS.PROVIDERS_CAROUSEL]: 24 * 60 * 60, // 24 horas
    [CACHE_KEYS.REELS_PROVIDERS]: 1 * 60 * 60, // 1 hora
    MY_REELS: 30 * 60, // 30 minutos
    PROVIDER_STORIES: 1 * 60 * 60, // 1 hora

    // Usuario
    USER_FAVORITES: 24 * 60 * 60, // 24 horas
    RECENTLY_VIEWED: 7 * 24 * 60 * 60, // 7 días
    USER_PREFERENCES: 30 * 24 * 60 * 60, // 30 días
    CART_BACKUP: 3 * 24 * 60 * 60, // 3 días

    // Traducciones
    TRANSLATIONS: 7 * 24 * 60 * 60, // 7 días

    // Notificaciones
    NOTIFICATIONS: 7 * 24 * 60 * 60, // 7 días
    PUSH_TOKENS: 30 * 24 * 60 * 60, // 30 días

    // Default para claves no especificadas
    DEFAULT: 1 * 60 * 60, // 1 hora
};

// ===== CONFIGURACIÓN GENERAL =====
export const CACHE_CONFIG = {
    // Versión del caché (cambiar para invalidar todo)
    CURRENT_VERSION: 1,

    // Tamaño máximo del caché (6MB)
    MAX_CACHE_SIZE: 6 * 1024 * 1024,

    // Intervalo de limpieza automática (24 horas)
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000,

    // Límites por tipo de dato
    LIMITS: {
        RECENT_SEARCHES: 20,
        RECENTLY_VIEWED: 50,
        USER_FAVORITES: 1000,
        CACHED_PAGES_PER_CATEGORY: 3,
        MAX_SEARCH_RESULTS_PER_QUERY: 50,
    },

    // Configuración de sincronización
    SYNC: {
        // Tiempo mínimo entre actualizaciones background
        MIN_BACKGROUND_UPDATE_INTERVAL: 5 * 60 * 1000, // 5 minutos

        // Tiempo máximo para considerar datos "frescos"
        FRESH_DATA_THRESHOLD: 30 * 1000, // 30 segundos

        // Reintento automático de requests fallidos
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000, // 1 segundo
    },
};

// ===== UTILIDADES =====

/**
 * Obtener TTL para una clave específica
 * @param {string} key - Clave del caché
 * @returns {number} TTL en segundos
 */
export const getTTLForKey = (key) => {
    // Verificar claves exactas primero
    if (TTL_TIMES[key]) {
        return TTL_TIMES[key];
    }

    // Verificar patrones
    if (key.includes('subcategories_')) {
        return TTL_TIMES.SUBCATEGORIES;
    }

    if (key.includes('filters_')) {
        return TTL_TIMES.CATEGORY_FILTERS;
    }

    if (key.includes('home_products_page_')) {
        return TTL_TIMES.HOME_PRODUCTS_PAGE;
    }

    if (key.includes('products_') && key.includes('_page_')) {
        return TTL_TIMES.PRODUCTS_CATEGORY;
    }

    if (key.includes('product_detail_')) {
        return TTL_TIMES.PRODUCT_DETAIL;
    }

    if (key.includes('product_related_')) {
        return TTL_TIMES.PRODUCT_RELATED;
    }

    if (key.includes('search_')) {
        return TTL_TIMES.SEARCH_RESULTS;
    }

    if (key.includes('my_reels_')) {
        return TTL_TIMES.MY_REELS;
    }

    if (key.includes('provider_stories_')) {
        return TTL_TIMES.PROVIDER_STORIES;
    }

    if (key.includes('user_favorites_')) {
        return TTL_TIMES.USER_FAVORITES;
    }

    if (key.includes('recently_viewed_')) {
        return TTL_TIMES.RECENTLY_VIEWED;
    }

    if (key.includes('user_preferences_')) {
        return TTL_TIMES.USER_PREFERENCES;
    }

    if (key.includes('cart_backup_')) {
        return TTL_TIMES.CART_BACKUP;
    }

    if (key.includes('translations_')) {
        return TTL_TIMES.TRANSLATIONS;
    }

    if (key.includes('notifications_')) {
        return TTL_TIMES.NOTIFICATIONS;
    }

    // Default
    return TTL_TIMES.DEFAULT;
};

/**
 * Verificar si una clave es crítica (no se debe eliminar en limpieza agresiva)
 * @param {string} key - Clave del caché
 * @returns {boolean} True si es crítica
 */
export const isCriticalKey = (key) => {
    const criticalKeys = [
        CACHE_KEYS.CATEGORIES_MAIN,
        CACHE_KEYS.RECENT_SEARCHES,
        CACHE_KEYS.APP_CONFIG,
        CACHE_KEYS.METADATA,
    ];

    const criticalPatterns = [
        'user_favorites_',
        'user_preferences_',
        'home_products_page_1', // Primera página del home
    ];

    return criticalKeys.includes(key) ||
        criticalPatterns.some(pattern => key.includes(pattern));
};

/**
 * Generar clave de caché para productos con filtros
 * @param {string} categoryId - ID de la categoría
 * @param {Object} filters - Filtros aplicados
 * @param {number} page - Número de página
 * @returns {string} Clave del caché
 */
export const generateProductsKey = (categoryId, filters = {}, page = 1) => {
    const filterString = Object.entries(filters)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join('|');

    return CACHE_KEYS.PRODUCTS_CATEGORY(categoryId, filterString, page);
};

/**
 * Limpiar caracteres especiales para usar en claves
 * @param {string} str - String a limpiar
 * @returns {string} String limpio
 */
export const sanitizeForKey = (str) => {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
};