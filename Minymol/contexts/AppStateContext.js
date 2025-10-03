import { createContext, useCallback, useContext, useReducer } from 'react';
import { apiCall } from '../utils/apiUtils';
import subCategoriesManager from '../utils/SubCategoriesManager';

// Estado inicial
const initialState = {
    user: null,
    isLoading: false,
    error: null,
    // Estados para categorías y productos
    categories: [],
    currentCategoryIndex: 0,
    currentSubCategoryIndex: -1,
    loading: true,
    homeInitialized: false,
    totalCategories: 0,
    // Agrega más estados globales que necesites
};

// Acciones
const AppStateActionTypes = {
    SET_USER: 'SET_USER',
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR',
    CLEAR_ERROR: 'CLEAR_ERROR',
    SET_CATEGORIES: 'SET_CATEGORIES',
    SET_CURRENT_CATEGORY: 'SET_CURRENT_CATEGORY',
    SET_CURRENT_SUBCATEGORY: 'SET_CURRENT_SUBCATEGORY',
    SET_HOME_INITIALIZED: 'SET_HOME_INITIALIZED',
};

// Reducer
const appStateReducer = (state, action) => {
    switch (action.type) {
        case AppStateActionTypes.SET_USER:
            return {
                ...state,
                user: action.payload,
                error: null,
            };
        case AppStateActionTypes.SET_LOADING:
            return {
                ...state,
                isLoading: action.payload,
            };
        case AppStateActionTypes.SET_ERROR:
            return {
                ...state,
                error: action.payload,
                isLoading: false,
            };
        case AppStateActionTypes.CLEAR_ERROR:
            return {
                ...state,
                error: null,
            };
        case AppStateActionTypes.SET_CATEGORIES:
            return {
                ...state,
                categories: action.payload,
                totalCategories: action.payload.length + 1, // +1 para incluir "Todos"
                loading: false,
            };
        case AppStateActionTypes.SET_CURRENT_CATEGORY:
            return {
                ...state,
                currentCategoryIndex: action.payload,
            };
        case AppStateActionTypes.SET_CURRENT_SUBCATEGORY:
            return {
                ...state,
                currentSubCategoryIndex: action.payload,
            };
        case AppStateActionTypes.SET_HOME_INITIALIZED:
            return {
                ...state,
                homeInitialized: action.payload,
            };
        default:
            return state;
    }
};

// Crear contexto
const AppStateContext = createContext();

// Provider component
export const AppStateProvider = ({ children }) => {
    const [state, dispatch] = useReducer(appStateReducer, initialState);

    // Acciones del contexto
    const setUser = useCallback((user) => {
        dispatch({ type: AppStateActionTypes.SET_USER, payload: user });
    }, []);

    const setLoading = useCallback((isLoading) => {
        dispatch({ type: AppStateActionTypes.SET_LOADING, payload: isLoading });
    }, []);

    const setError = useCallback((error) => {
        dispatch({ type: AppStateActionTypes.SET_ERROR, payload: error });
    }, []);

    const clearError = useCallback(() => {
        dispatch({ type: AppStateActionTypes.CLEAR_ERROR });
    }, []);

    // Funciones para categorías
    const loadCategories = useCallback(async () => {
        try {
            dispatch({ type: AppStateActionTypes.SET_LOADING, payload: true });
            console.log('🔄 Cargando categorías desde la API...');
            
            // Cargar categorías reales desde la API
            const res = await fetch('https://api.minymol.com/categories/with-products-and-images');
            const data = await res.json();

            if (Array.isArray(data)) {
                console.log(`✅ ${data.length} categorías cargadas exitosamente`);
                
                // Actualizar el SubCategoriesManager con los datos de la API
                subCategoriesManager.setCategoriesFromAPI(data);
                
                dispatch({ type: AppStateActionTypes.SET_CATEGORIES, payload: data });
                return data;
            } else {
                console.error('❌ La respuesta de categorías no es un array:', data);
                // Fallback a categorías mock si la API falla
                const fallbackCategories = [
                    { id: 1, name: 'Tecnología', slug: 'tecnologia' },
                    { id: 2, name: 'Hogar', slug: 'hogar' },
                    { id: 3, name: 'Ropa', slug: 'ropa' },
                ];
                subCategoriesManager.setCategoriesFromAPI(fallbackCategories);
                dispatch({ type: AppStateActionTypes.SET_CATEGORIES, payload: fallbackCategories });
                return fallbackCategories;
            }
        } catch (error) {
            console.error('❌ Error cargando categorías:', error);
            dispatch({ type: AppStateActionTypes.SET_ERROR, payload: error.message });
            
            // Fallback a categorías mock en caso de error de red
            const fallbackCategories = [
                { id: 1, name: 'Tecnología', slug: 'tecnologia' },
                { id: 2, name: 'Hogar', slug: 'hogar' },
                { id: 3, name: 'Ropa', slug: 'ropa' },
            ];
            subCategoriesManager.setCategoriesFromAPI(fallbackCategories);
            dispatch({ type: AppStateActionTypes.SET_CATEGORIES, payload: fallbackCategories });
            return fallbackCategories;
        }
    }, []);

    const changeCategory = useCallback((index) => {
        dispatch({ type: AppStateActionTypes.SET_CURRENT_CATEGORY, payload: index });
    }, []);

    const changeSubCategory = useCallback((index) => {
        dispatch({ type: AppStateActionTypes.SET_CURRENT_SUBCATEGORY, payload: index });
    }, []);

    const setHomeInitialized = useCallback((initialized) => {
        dispatch({ type: AppStateActionTypes.SET_HOME_INITIALIZED, payload: initialized });
    }, []);

    // Funciones para productos
    const getCategoryProducts = useCallback((categoryIndex = state.currentCategoryIndex) => {
        // Mock básico - en una implementación real esto vendría de un estado más complejo
        return { 
            products: [], 
            isLoading: false, 
            hasMore: true, 
            initialized: false 
        };
    }, [state.currentCategoryIndex]);

    const loadCategoryProducts = useCallback(async (categoryIndex, subcategoryIndex = -1, offset = 0, limit = 20) => {
        try {
            console.log(`🔄 Cargando productos para categoría ${categoryIndex}, subcategoría ${subcategoryIndex}`);
            
            // Asegurar que offset y limit sean números
            const numericOffset = Number(offset) || 0;
            const numericLimit = Number(limit) || 20;
            
            // Crear un ID único para esta petición para evitar race conditions
            const requestId = `${categoryIndex}-${subcategoryIndex}-${numericOffset}-${numericLimit}-${Date.now()}`;
            console.log(`🆔 Request ID: ${requestId}`);
            
            // 1. Si es "Todos" (categoryIndex === 0), cargar productos aleatorios
            if (categoryIndex === 0) {
                console.log(`🏠 Cargando productos aleatorios para HOME/Todos (${requestId})`);
                const apiUrl = `https://api.minymol.com/products/random-previews?limit=${numericLimit}&offset=${numericOffset}`;
                console.log(`🌐 URL de la API (HOME): ${apiUrl}`);
                
                const response = await apiCall(apiUrl);
                
                if (!response.ok) {
                    console.error(`❌ Error HTTP en HOME (${requestId}): ${response.status} - ${response.statusText}`);
                    throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
                }
                
                const products = await response.json();
                console.log(`✅ ${products.length} productos aleatorios cargados para HOME (${requestId})`);
                
                const validProducts = Array.isArray(products) ? products.filter(p => p && p.uuid) : [];
                console.log(`📋 ${validProducts.length} productos válidos después del filtrado (${requestId})`);
                return validProducts;
            }
            
            // 2. Para categorías específicas (1,2,3,4...), ajustar el índice
            // Restar 1 porque el índice 0 es "Todos"
            const categoryRealIndex = categoryIndex - 1;
            const category = state.categories[categoryRealIndex];
            
            if (!category) {
                console.error(`❌ No se encontró la categoría con índice real ${categoryRealIndex} (categoryIndex: ${categoryIndex}) (${requestId})`);
                console.error(`📊 Categorías disponibles: ${state.categories.length}, índice solicitado: ${categoryRealIndex}`);
                return [];
            }

            console.log(`📂 Cargando productos para categoría: ${category.name || category.slug} (índice real: ${categoryRealIndex}) (${requestId})`);
            
            // Construir parámetros para la API de categorías
            const params = new URLSearchParams();
            
            // Usar el slug de la categoría
            const categorySlug = category.slug || category.name?.toLowerCase().replace(/\s+/g, '-');
            if (!categorySlug) {
                console.error(`❌ No se pudo determinar el slug para la categoría ${categoryRealIndex} (${requestId})`);
                return [];
            }
            
            params.append('categorySlug', categorySlug);
            
            // Si hay subcategoría específica, añadirla
            if (subcategoryIndex >= 0) {
                const subcategories = subCategoriesManager.getSubcategoriesByCategory(categorySlug);
                if (subcategories && subcategories[subcategoryIndex]) {
                    const subcategory = subcategories[subcategoryIndex];
                    params.append('subCategorySlug', subcategory.slug);
                    console.log(`📂 Filtrando por subcategoría: ${subcategory.name} (${requestId})`);
                } else {
                    console.warn(`⚠️ Subcategoría ${subcategoryIndex} no encontrada para ${categorySlug} (${requestId})`);
                }
            }

            // Primer paso: obtener los IDs de productos
            const idsUrl = `https://api.minymol.com/products/public-ids?${params.toString()}`;
            console.log(`🌐 URL para obtener IDs: ${idsUrl} (${requestId})`);
            
            const idsResponse = await apiCall(idsUrl);
            
            if (!idsResponse.ok) {
                if (idsResponse.status === 429) {
                    console.log(`⚠️ Rate limiting en public-ids, retornando array vacío (${requestId})`);
                    return [];
                }
                console.error(`❌ Error HTTP en public-ids (${requestId}): ${idsResponse.status} - ${idsResponse.statusText}`);
                throw new Error(`Error HTTP en public-ids: ${idsResponse.status} - ${idsResponse.statusText}`);
            }
            
            const idsData = await idsResponse.json();
            console.log(`📦 IDs obtenidos para ${categorySlug}: ${Array.isArray(idsData) ? idsData.length : 0} productos (${requestId})`);
            
            if (!Array.isArray(idsData) || idsData.length === 0) {
                console.log(`📭 No hay productos para la categoría ${category.name || category.slug} (${requestId})`);
                return [];
            }

            // Aplicar paginación a los IDs usando números
            const totalIds = idsData.length;
            const startIndex = Math.min(numericOffset, totalIds);
            const endIndex = Math.min(numericOffset + numericLimit, totalIds);
            const paginatedIds = idsData.slice(startIndex, endIndex);
            
            console.log(`📄 Paginación: ${startIndex}-${endIndex} de ${totalIds} productos (${requestId})`);
            
            const ids = paginatedIds.map(p => p.product_id).filter(id => id); // Filtrar IDs nulos

            if (ids.length === 0) {
                console.log(`📭 No hay más productos en esta página (offset: ${numericOffset}) (${requestId})`);
                return [];
            }

            // Segundo paso: obtener los previews de esos productos
            const previewsUrl = `https://api.minymol.com/products/previews`;
            console.log(`🌐 URL para obtener previews: ${previewsUrl} con ${ids.length} IDs (${requestId})`);
            console.log(`📋 IDs a obtener: ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '...' : ''} (${requestId})`);
            
            const previewsResponse = await apiCall(previewsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });
            
            if (!previewsResponse.ok) {
                if (previewsResponse.status === 429) {
                    console.log(`⚠️ Rate limiting en previews, retornando array vacío (${requestId})`);
                    return [];
                }
                console.error(`❌ Error HTTP en previews (${requestId}): ${previewsResponse.status} - ${previewsResponse.statusText}`);
                throw new Error(`Error HTTP en previews: ${previewsResponse.status} - ${previewsResponse.statusText}`);
            }
            
            const products = await previewsResponse.json();
            console.log(`📦 Respuesta de previews: ${Array.isArray(products) ? products.length : 0} productos (${requestId})`);
            
            // Validar que los productos tengan la estructura esperada y pertenezcan a la categoría correcta
            const validProducts = Array.isArray(products) ? products.filter(p => {
                if (!p || !p.uuid) {
                    console.warn(`⚠️ Producto inválido encontrado (${requestId}):`, p);
                    return false;
                }
                return true;
            }) : [];
            
            console.log(`✅ ${validProducts.length} productos válidos cargados para categoría ${category.name || category.slug} (${requestId})`);
            
            // Agregar metadatos de categoría a cada producto para debugging
            const productsWithMetadata = validProducts.map(product => ({
                ...product,
                _categoryMetadata: {
                    categoryIndex,
                    categoryRealIndex,
                    categorySlug,
                    subcategoryIndex,
                    requestId,
                    loadedAt: new Date().toISOString()
                }
            }));
            
            return productsWithMetadata;
            
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            console.error('📄 Detalles del error:', {
                message: error.message,
                stack: error.stack,
                categoryIndex,
                subcategoryIndex,
                offset: Number(offset) || 0,
                limit: Number(limit) || 20
            });
            return [];
        }
    }, [state.categories]);

    const getCurrentCategory = useCallback(() => {
        if (!state.categories || state.categories.length === 0) return null;
        return state.categories[state.currentCategoryIndex] || null;
    }, [state.categories, state.currentCategoryIndex]);

    const isCategoryLoading = useCallback((categoryIndex = state.currentCategoryIndex) => {
        // Mock básico - en una implementación real esto vendría del estado
        return false;
    }, [state.currentCategoryIndex]);

    const value = {
        ...state,
        setUser,
        setLoading,
        setError,
        clearError,
        loadCategories,
        changeCategory,
        changeSubCategory,
        setHomeInitialized,
        getCategoryProducts,
        loadCategoryProducts,
        getCurrentCategory,
        isCategoryLoading,
    };

    return (
        <AppStateContext.Provider value={value}>
            {children}
        </AppStateContext.Provider>
    );
};

// Hook personalizado para usar el contexto
export const useAppState = () => {
    const context = useContext(AppStateContext);
    if (!context) {
        throw new Error('useAppState debe ser usado dentro de AppStateProvider');
    }
    return context;
};

export default AppStateContext;