/**
 * StorageKeys - Constantes para las claves de almacenamiento en caché
 * Centraliza todas las claves utilizadas en AsyncStorage para evitar duplicados
 * y facilitar el mantenimiento
 */

export const CACHE_KEYS = {
    // Productos
    PRODUCTS: 'products_cache',
    PRODUCTS_PREVIEWS: 'products_previews_cache',
    PRODUCTS_IDS: 'products_ids_cache',
    PRODUCT_DETAIL: 'product_detail_',

    // Categorías
    CATEGORIES: 'categories_cache',
    SUBCATEGORIES: 'subcategories_cache',
    CATEGORY_PRODUCTS: 'category_products_',

    // Usuario
    USER_PROFILE: 'user_profile_cache',
    USER_FAVORITES: 'user_favorites_cache',
    USER_CART: 'user_cart_cache',
    USER_ORDERS: 'user_orders_cache',

    // Reels y Stories
    REELS: 'reels_cache',
    REELS_PROVIDERS: 'reels_providers_cache',
    MY_REELS: (userId) => `my_reels_${userId}`,
    PROVIDER_STORIES: 'provider_stories_cache',
    USER_STORIES: 'user_stories_cache',
    STORIES_VIEWED: 'stories_viewed_cache',

    // Búsquedas
    SEARCH_HISTORY: 'search_history',
    SEARCH_SUGGESTIONS: 'search_suggestions_cache',
    RECENT_SEARCHES: 'recent_searches_cache',

    // Configuración de la app
    APP_SETTINGS: 'app_settings_cache',
    THEME_PREFERENCE: 'theme_preference',
    LANGUAGE_PREFERENCE: 'language_preference',
    NOTIFICATIONS_SETTINGS: 'notifications_settings',

    // Autenticación
    AUTH_TOKEN: 'auth_token',
    USER_SESSION: 'user_session_cache',
    LOGIN_CREDENTIALS: 'login_credentials',

    // Caché temporal
    TEMP_DATA: 'temp_data_cache',
    TEMP_IMAGES: 'temp_images_cache',
    TEMP_VIDEOS: 'temp_videos_cache',

    // API y red
    API_CACHE: 'api_cache_',
    NETWORK_STATE: 'network_state_cache',
    LAST_SYNC: 'last_sync_timestamp',

    // Onboarding y tutorial
    ONBOARDING_COMPLETED: 'onboarding_completed',
    TUTORIAL_SEEN: 'tutorial_seen_',
    FIRST_LAUNCH: 'first_launch',

    // Timestamps para expiración
    TIMESTAMPS: {
        PRODUCTS: 'products_cache_timestamp',
        CATEGORIES: 'categories_cache_timestamp',
        REELS: 'reels_cache_timestamp',
        USER_PROFILE: 'user_profile_cache_timestamp',
        SEARCH_SUGGESTIONS: 'search_suggestions_cache_timestamp',
    }
};

/**
 * Claves de configuración para tiempos de expiración (en milisegundos)
 */
export const CACHE_EXPIRY = {
    // 5 minutos
    SHORT: 5 * 60 * 1000,

    // 30 minutos
    MEDIUM: 30 * 60 * 1000,

    // 1 hora
    HOUR: 60 * 60 * 1000,

    // 24 horas
    DAY: 24 * 60 * 60 * 1000,

    // 7 días
    WEEK: 7 * 24 * 60 * 60 * 1000,

    // 30 días
    MONTH: 30 * 24 * 60 * 60 * 1000,
};

/**
 * Prefijos para diferentes tipos de datos
 */
export const CACHE_PREFIXES = {
    USER: 'user_',
    PRODUCT: 'product_',
    CATEGORY: 'category_',
    SEARCH: 'search_',
    MEDIA: 'media_',
    API: 'api_',
    TEMP: 'temp_',
};

/**
 * Genera una clave de caché dinámica con prefijo
 * @param {string} prefix - Prefijo de la clave
 * @param {string} identifier - Identificador único
 * @returns {string} Clave de caché generada
 */
export const generateCacheKey = (prefix, identifier) => {
    return `${prefix}${identifier}`;
};

/**
 * Genera una clave de timestamp para expiración
 * @param {string} baseKey - Clave base
 * @returns {string} Clave de timestamp
 */
export const generateTimestampKey = (baseKey) => {
    return `${baseKey}_timestamp`;
};

/**
 * Claves específicas para diferentes módulos
 */
export const MODULE_CACHE_KEYS = {
    // Módulo de productos
    PRODUCTS: {
        LIST: CACHE_KEYS.PRODUCTS,
        PREVIEWS: CACHE_KEYS.PRODUCTS_PREVIEWS,
        DETAIL: CACHE_KEYS.PRODUCT_DETAIL,
        BY_CATEGORY: CACHE_KEYS.CATEGORY_PRODUCTS,
    },

    // Módulo de reels
    REELS: {
        LIST: CACHE_KEYS.REELS,
        MY_REELS: CACHE_KEYS.MY_REELS,
        PROVIDER_STORIES: CACHE_KEYS.PROVIDER_STORIES,
        USER_STORIES: CACHE_KEYS.USER_STORIES,
        VIEWED: CACHE_KEYS.STORIES_VIEWED,
    },

    // Módulo de búsqueda
    SEARCH: {
        HISTORY: CACHE_KEYS.SEARCH_HISTORY,
        SUGGESTIONS: CACHE_KEYS.SEARCH_SUGGESTIONS,
        RECENT: CACHE_KEYS.RECENT_SEARCHES,
    },

    // Módulo de usuario
    USER: {
        PROFILE: CACHE_KEYS.USER_PROFILE,
        FAVORITES: CACHE_KEYS.USER_FAVORITES,
        CART: CACHE_KEYS.USER_CART,
        ORDERS: CACHE_KEYS.USER_ORDERS,
    },
};

export default CACHE_KEYS;