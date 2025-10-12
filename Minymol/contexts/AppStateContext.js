import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { apiCall } from '../utils/apiUtils';
import { shuffleProducts } from '../utils/productUtils';
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

    // ✅ OPTIMIZADO: Solo hacer dispatch si el índice realmente cambia
    const changeCategory = useCallback((index) => {
        if (state.currentCategoryIndex !== index) {
            dispatch({ type: AppStateActionTypes.SET_CURRENT_CATEGORY, payload: index });
        }
    }, [state.currentCategoryIndex]);

    // ✅ OPTIMIZADO: Solo hacer dispatch si el índice realmente cambia
    const changeSubCategory = useCallback((index) => {
        if (state.currentSubCategoryIndex !== index) {
            dispatch({ type: AppStateActionTypes.SET_CURRENT_SUBCATEGORY, payload: index });
        }
    }, [state.currentSubCategoryIndex]);

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

    const loadCategoryProducts = useCallback(async (categoryIndex, subcategoryIndex = -1, forceRefresh = false) => {
        try {
            console.log(`🔄 Cargando productos para categoría ${categoryIndex}, subcategoría ${subcategoryIndex}`);
            
            // Crear un ID único para esta petición para evitar race conditions
            const requestId = `${categoryIndex}-${subcategoryIndex}-${Date.now()}`;
            console.log(`🆔 Request ID: ${requestId}`);
            
            // 1. Si es "Todos" (categoryIndex === 0), usar lógica web para HOME
            if (categoryIndex === 0) {
                console.log(`🏠 Cargando TODOS los productos para HOME (${requestId})`);
                
                // Obtener TODOS los IDs (como la web)
                const idsUrl = 'https://api.minymol.com/products/public-ids';
                console.log(`🌐 URL para obtener TODOS los IDs: ${idsUrl} (${requestId})`);
                
                const idsResponse = await apiCall(idsUrl);
                
                if (!idsResponse.ok) {
                    if (idsResponse.status === 429) {
                        console.log(`⚠️ Rate limiting en public-ids HOME, retornando array vacío (${requestId})`);
                        return [];
                    }
                    console.error(`❌ Error HTTP en public-ids HOME (${requestId}): ${idsResponse.status} - ${idsResponse.statusText}`);
                    throw new Error(`Error HTTP: ${idsResponse.status} - ${idsResponse.statusText}`);
                }
                
                const idsData = await idsResponse.json();
                console.log(`📦 TODOS los IDs obtenidos para HOME: ${Array.isArray(idsData) ? idsData.length : 0} productos (${requestId})`);
                
                if (!Array.isArray(idsData) || idsData.length === 0) {
                    console.log(`📭 No hay productos para HOME (${requestId})`);
                    return [];
                }
                
                // Extraer todos los IDs
                const allIds = idsData.map(p => p.product_id).filter(id => id);
                console.log(`📋 ${allIds.length} IDs válidos extraídos para HOME (${requestId})`);
                
                // ⚡ OPTIMIZACIÓN TEMPORAL: Limitar a 100 productos máximo
                const MAX_PRODUCTS = 100;
                const limitedIds = allIds.slice(0, MAX_PRODUCTS);
                if (allIds.length > MAX_PRODUCTS) {
                    console.log(`⚡ OPTIMIZACIÓN: Limitando HOME de ${allIds.length} a ${MAX_PRODUCTS} productos (${requestId})`);
                }
                
                // Randomizar los IDs limitados (paso clave de la Opción 3)
                const shuffledIds = shuffleProducts(limitedIds);
                console.log(`🎲 IDs randomizados para HOME: ${shuffledIds.length} productos (${requestId})`);
                
                // Obtener TODOS los previews de una vez (como la web)
                const previewsUrl = 'https://api.minymol.com/products/previews';
                console.log(`🌐 URL para obtener TODOS los previews: ${previewsUrl} con ${shuffledIds.length} IDs (${requestId})`);
                
                const previewsResponse = await apiCall(previewsUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: shuffledIds })
                });
                
                if (!previewsResponse.ok) {
                    if (previewsResponse.status === 429) {
                        console.log(`⚠️ Rate limiting en previews HOME, retornando array vacío (${requestId})`);
                        return [];
                    }
                    console.error(`❌ Error HTTP en previews HOME (${requestId}): ${previewsResponse.status} - ${previewsResponse.statusText}`);
                    throw new Error(`Error HTTP en previews: ${previewsResponse.status} - ${previewsResponse.statusText}`);
                }
                
                const products = await previewsResponse.json();
                console.log(`📦 TODOS los previews obtenidos para HOME: ${Array.isArray(products) ? products.length : 0} productos (${requestId})`);
                
                const validProducts = Array.isArray(products) ? products.filter(p => p && p.uuid) : [];
                console.log(`✅ ${validProducts.length} productos válidos para HOME después del filtrado (${requestId})`);
                
                return validProducts;
            }
            
            // 2. Para categorías específicas (1,2,3,4...), usar lógica web
            const categoryRealIndex = categoryIndex - 1;
            const category = state.categories[categoryRealIndex];
            
            if (!category) {
                console.error(`❌ No se encontró la categoría con índice real ${categoryRealIndex} (categoryIndex: ${categoryIndex}) (${requestId})`);
                console.error(`📊 Categorías disponibles: ${state.categories.length}, índice solicitado: ${categoryRealIndex}`);
                return [];
            }

            console.log(`📂 Cargando TODOS los productos para categoría: ${category.name || category.slug} (índice real: ${categoryRealIndex}) (${requestId})`);
            
            // Construir parámetros para la API de categorías
            const params = new URLSearchParams();
            
            // Usar el slug de la categoría
            const categorySlug = category.slug || category.name?.toLowerCase().replace(/\s+/g, '-');
            if (!categorySlug) {
                console.error(`❌ No se pudo determinar el slug para la categoría ${categoryRealIndex} (${requestId})`);
                return [];
            }
            
            // Lógica de parámetros (igual que antes)
            if (subcategoryIndex >= 0) {
                const subcategories = subCategoriesManager.getSubcategoriesByCategory(categorySlug);
                if (subcategories && subcategories[subcategoryIndex]) {
                    const subcategory = subcategories[subcategoryIndex];
                    params.append('subCategorySlug', subcategory.slug);
                    console.log(`📂 MODO SUBCATEGORÍA - Filtrando SOLO por subcategoría: ${subcategory.name} (slug: ${subcategory.slug}) (${requestId})`);
                } else {
                    console.warn(`⚠️ Subcategoría ${subcategoryIndex} no encontrada para ${categorySlug}, usando categorySlug como fallback (${requestId})`);
                    params.append('categorySlug', categorySlug);
                    console.log(`📂 MODO FALLBACK - Filtrando por categoría: ${category.name || categorySlug} (slug: ${categorySlug}) (${requestId})`);
                }
            } else {
                params.append('categorySlug', categorySlug);
                console.log(`📂 MODO CATEGORÍA - Filtrando SOLO por categoría: ${category.name || categorySlug} (slug: ${categorySlug}) (${requestId})`);
            }

            // Obtener TODOS los IDs de la categoría (como la web)
            const idsUrl = `https://api.minymol.com/products/public-ids?${params.toString()}`;
            console.log(`🌐 URL para obtener TODOS los IDs: ${idsUrl} (${requestId})`);
            console.log(`📋 Parámetros enviados: ${params.toString()} (${requestId})`);
            
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
            console.log(`📦 TODOS los IDs obtenidos para ${categorySlug}: ${Array.isArray(idsData) ? idsData.length : 0} productos (${requestId})`);
            
            if (!Array.isArray(idsData) || idsData.length === 0) {
                console.log(`📭 No hay productos para la categoría ${category.name || category.slug} (${requestId})`);
                return [];
            }

            // Extraer TODOS los IDs (sin paginación como la web)
            const allIds = idsData.map(p => p.product_id).filter(id => id);
            console.log(`📋 ${allIds.length} IDs válidos extraídos para categoría (${requestId})`);
            
            // ⚡ OPTIMIZACIÓN TEMPORAL: Limitar a 100 productos máximo
            // Esto reduce drasticamente el consumo de datos y memoria
            const MAX_PRODUCTS = 100;
            const limitedIds = allIds.slice(0, MAX_PRODUCTS);
            if (allIds.length > MAX_PRODUCTS) {
                console.log(`⚡ OPTIMIZACIÓN: Limitando de ${allIds.length} a ${MAX_PRODUCTS} productos para mejor rendimiento (${requestId})`);
            }
            
            // Randomizar los IDs limitados
            const shuffledIds = shuffleProducts(limitedIds);
            console.log(`🎲 IDs randomizados para categoría ${categorySlug}: ${shuffledIds.length} productos (${requestId})`);

            // Obtener TODOS los previews de una vez (como la web)
            const previewsUrl = `https://api.minymol.com/products/previews`;
            console.log(`🌐 URL para obtener TODOS los previews: ${previewsUrl} con ${shuffledIds.length} IDs (${requestId})`);
            
            const previewsResponse = await apiCall(previewsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: shuffledIds })
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
            console.log(`📦 TODOS los previews obtenidos para categoría: ${Array.isArray(products) ? products.length : 0} productos (${requestId})`);
            
            // Validar productos
            const validProducts = Array.isArray(products) ? products.filter(p => {
                if (!p || !p.uuid) {
                    console.warn(`⚠️ Producto inválido encontrado (${requestId}):`, p);
                    return false;
                }
                return true;
            }) : [];
            
            console.log(`✅ ${validProducts.length} productos válidos cargados para categoría ${category.name || category.slug} (${requestId})`);
            
            return validProducts;
            
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            console.error('📄 Detalles del error:', {
                message: error.message,
                stack: error.stack,
                categoryIndex,
                subcategoryIndex
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

    // ✅ OPTIMIZADO: Memoizar el value del contexto para evitar re-renders innecesarios
    const value = useMemo(() => ({
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
    }), [
        state,
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
    ]);

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