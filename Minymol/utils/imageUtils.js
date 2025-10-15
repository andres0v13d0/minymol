import { Dimensions, Platform } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Determina la calidad de imagen óptima basada en el dispositivo
 */
export const getOptimalImageQuality = () => {
    // Para dispositivos de gama baja, usar calidad reducida
    if (screenWidth < 768) {
        return 'low'; // Móviles
    } else if (screenWidth < 1200) {
        return 'medium'; // Tablets
    }
    return 'high'; // Desktop
};

/**
 * Calcula el tamaño óptimo de imagen para el dispositivo
 */
export const getOptimalImageSize = (columnsCount = 2) => {
    const paddingBetweenColumns = 4;
    const totalPadding = paddingBetweenColumns * columnsCount;
    const availableWidth = screenWidth - totalPadding;
    const containerWidth = availableWidth / columnsCount;

    // Redondear al múltiplo de 100 más cercano para mejor caching
    const optimalWidth = Math.ceil(containerWidth / 100) * 100;

    return {
        width: optimalWidth,
        height: optimalWidth, // Usar aspecto cuadrado por defecto
    };
};

/**
 * Optimiza la URL de una imagen agregando parámetros de tamaño si es posible
 * Soporta servicios comunes como Cloudinary, imgix, etc.
 */
export const optimizeImageUrl = (url, options = {}) => {
    if (!url) return url;

    const {
        width = 400,
        quality = getOptimalImageQuality(),
        format = 'auto',
    } = options;

    try {
        // Detectar si es Cloudinary
        if (url.includes('cloudinary.com')) {
            const parts = url.split('/upload/');
            if (parts.length === 2) {
                const qualityMap = { low: 'q_60', medium: 'q_75', high: 'q_85' };
                const transforms = `w_${width},${qualityMap[quality]},f_${format},c_limit`;
                return `${parts[0]}/upload/${transforms}/${parts[1]}`;
            }
        }

        // Detectar si es imgix
        if (url.includes('imgix.net')) {
            const separator = url.includes('?') ? '&' : '?';
            const qualityMap = { low: 60, medium: 75, high: 85 };
            return `${url}${separator}w=${width}&q=${qualityMap[quality]}&auto=format`;
        }

        // Para Firebase Storage o URLs genéricas, intentar agregar parámetros
        if (url.includes('firebasestorage.googleapis.com')) {
            // Firebase no soporta transformaciones directas, pero podemos cachear mejor
            return url;
        }

        // Si no se puede optimizar, devolver la URL original
        return url;
    } catch (error) {
        console.warn('Error optimizando URL de imagen:', error);
        return url;
    }
};

/**
 * Obtiene la configuración óptima de Image para el dispositivo actual
 */
export const getOptimalImageConfig = () => {
    const quality = getOptimalImageQuality();

    return {
        transition: quality === 'low' ? 50 : quality === 'medium' ? 100 : 150,
        cachePolicy: 'memory-disk',
        priority: 'normal',
        placeholder: { blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' },
        contentFit: 'cover',
        // Para gama baja, reducir la calidad del placeholder
        placeholderContentFit: quality === 'low' ? 'contain' : 'cover',
    };
};

/**
 * Pre-calcula dimensiones de imagen para evitar re-renders
 */
export const calculateImageDimensions = (containerWidth, aspectRatio = 1, maxHeight = 400) => {
    const calculatedHeight = Math.min(containerWidth * aspectRatio, maxHeight);
    return {
        width: containerWidth,
        height: calculatedHeight,
    };
};

/**
 * Determina si se debe usar carga lazy para imágenes
 */
export const shouldUseLazyLoading = () => {
    // En dispositivos de gama baja, siempre usar lazy loading
    return screenWidth < 768 || Platform.OS === 'android';
};

/**
 * Obtiene el número de columnas óptimo según el ancho de pantalla
 */
export const getOptimalColumnsCount = () => {
    if (screenWidth >= 1600) return 6;
    if (screenWidth >= 1200) return 5;
    if (screenWidth >= 768) return 3;
    return 2; // móvil
};

export default {
    getOptimalImageQuality,
    getOptimalImageSize,
    optimizeImageUrl,
    getOptimalImageConfig,
    calculateImageDimensions,
    shouldUseLazyLoading,
    getOptimalColumnsCount,
};
