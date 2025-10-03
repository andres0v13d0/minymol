/**
 * Utilities para manejo de productos
 * Incluye randomización y configuración global
 */

/**
 * Función Fisher-Yates shuffle optimizada
 * @param {Array} array - Array a randomizar
 * @returns {Array} - Array randomizado (copia)
 */
function shuffleArray(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return array;
    }

    const shuffled = [...array]; // Crear copia para no mutar el original

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

/**
 * Configuración global para randomización
 * Puedes cambiar 'enabled' para activar/desactivar en toda la app
 */
const GLOBAL_SHUFFLE_CONFIG = {
    enabled: true, // true = randomizar siempre, false = mantener orden original

    // Configuraciones adicionales (futuras)
    // algorithm: 'fisher-yates',
    // seed: null, // Para randomización reproducible
    // preserveFirst: false, // Para mantener primeros elementos fijos
};

/**
 * Función principal para randomizar productos
 * @param {Array} products - Array de productos a randomizar
 * @param {boolean|null} forceRandom - null = usar config global, true = forzar random, false = no randomizar
 * @returns {Array} - Array de productos (randomizado o no según configuración)
 */
export const shuffleProducts = (products, forceRandom = null) => {
    // Validación de entrada
    if (!Array.isArray(products) || products.length === 0) {
        return products;
    }

    // Determinar si debe randomizar
    const shouldShuffle = forceRandom !== null ? forceRandom : GLOBAL_SHUFFLE_CONFIG.enabled;

    // Randomizar o retornar original
    return shouldShuffle ? shuffleArray(products) : products;
};

/**
 * Función para cambiar la configuración global
 * @param {boolean} enabled - true para activar randomización global
 */
export const setGlobalShuffleEnabled = (enabled) => {
    GLOBAL_SHUFFLE_CONFIG.enabled = Boolean(enabled);
};

/**
 * Función para obtener el estado actual de la configuración
 * @returns {boolean} - Estado actual de randomización global
 */
export const isGlobalShuffleEnabled = () => {
    return GLOBAL_SHUFFLE_CONFIG.enabled;
};

/**
 * Función helper para randomizar IDs específicamente
 * Útil para el patrón: obtener IDs → randomizar → obtener previews
 * @param {Array} ids - Array de IDs (strings o números)
 * @param {boolean} forceRandom - Forzar randomización independiente de config global
 * @returns {Array} - IDs randomizados
 */
export const shuffleProductIds = (ids, forceRandom = null) => {
    return shuffleProducts(ids, forceRandom);
};

// Export default para importación más simple
export default {
    shuffleProducts,
    shuffleProductIds,
    setGlobalShuffleEnabled,
    isGlobalShuffleEnabled,
};