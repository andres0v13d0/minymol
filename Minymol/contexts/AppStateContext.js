import { createContext, useCallback, useContext, useReducer } from 'react';
import globalProductsCache from '../utils/cache/GlobalProductsCache';

// Acciones del reducer
const ACTIONS = {
    SET_CATEGORIES: 'SET_CATEGORIES',
    SET_CURRENT_CATEGORY: 'SET_CURRENT_CATEGORY',
    SET_CURRENT_SUBCATEGORY: 'SET_CURRENT_SUBCATEGORY',
    SET_LOADING: 'SET_LOADING',
    SET_CATEGORY_LOADING: 'SET_CATEGORY_LOADING',
    SET_HOME_INITIALIZED: 'SET_HOME_INITIALIZED'
};

// Generar seed único para la sesión
const SESSION_SEED = Date.now();

// Estado inicial
const initialState = {
    categories: [],
    currentCategoryIndex: 0, // 0 = "Todos"
    currentSubCategoryIndex: 0,
    loading: false,
    categoryLoadingStates: {}, // { "categoryIndex-subCategoryIndex": boolean }
    homeInitialized: false,
    sessionSeed: SESSION_SEED
};

// Reducer para manejar el estado
const appStateReducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.SET_CATEGORIES:
            return {
                ...state,
                categories: Array.isArray(action.payload) ? action.payload : []
            };

        case ACTIONS.SET_CURRENT_CATEGORY:
            return {
                ...state,
                currentCategoryIndex: action.payload
                // NO resetear automáticamente la subcategoría
            };

        case ACTIONS.SET_CURRENT_SUBCATEGORY:
            return {
                ...state,
                currentSubCategoryIndex: action.payload
            };

        case ACTIONS.SET_LOADING:
            return {
                ...state,
                loading: action.payload
            };

        case ACTIONS.SET_CATEGORY_LOADING:
            return {
                ...state,
                categoryLoadingStates: {
                    ...state.categoryLoadingStates,
                    [action.categoryKey]: action.loading
                }
            };

        case ACTIONS.SET_HOME_INITIALIZED:
            return {
                ...state,
                homeInitialized: action.payload
            };

        default:
            return state;
    }
};

// Crear el contexto
const AppStateContext = createContext();

// Provider del contexto
export const AppStateProvider = ({ children }) => {
    const [state, dispatch] = useReducer(appStateReducer, initialState);

    // Acciones del contexto
    const actions = {
        // Cargar categorías desde cache o API
        loadCategories: useCallback(async () => {
            console.log('🔄 Cargando categorías...');

            try {
                // Verificar si necesitamos cargar desde cache
                if (!globalProductsCache.shouldLoadCategories()) {
                    const cached = globalProductsCache.getCategories();
                    console.log('📦 Cache encontrado:', cached);
                    dispatch({ type: ACTIONS.SET_CATEGORIES, payload: cached.data });
                    console.log('✅ Categorías cargadas desde cache');
                    return cached.data;
                }

                console.log('🌐 Cargando desde API...');
                // Si necesitamos cargar desde API
                dispatch({ type: ACTIONS.SET_LOADING, payload: true });

                // Obtener desde caché local primero si existe
                const cachedCategories = globalProductsCache.getCategories();
                if (cachedCategories.initialized) {
                    dispatch({ type: ACTIONS.SET_CATEGORIES, payload: cachedCategories.data });
                }

                // Cargar desde API real
                try {
                    console.log('📡 Haciendo fetch a la API de categorías...');
                    const response = await fetch('https://api.minymol.com/categories/with-products-and-images');
                    
                    console.log('📡 Respuesta recibida, status:', response.status);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const categoriesData = await response.json();
                    console.log('📡 Datos recibidos:', categoriesData);

                    // Verificar que la respuesta es un array válido
                    if (Array.isArray(categoriesData) && categoriesData.length > 0) {
                        // Guardar en cache y estado
                        globalProductsCache.setCategories(categoriesData);
                        dispatch({ type: ACTIONS.SET_CATEGORIES, payload: categoriesData });

                        console.log(`✅ ${categoriesData.length} categorías cargadas desde API con imágenes`);
                        return categoriesData;
                    } else {
                        console.error('❌ La respuesta de categorías no es un array válido:', categoriesData);
                        throw new Error('Formato de respuesta inválido o array vacío');
                    }
                } catch (apiError) {
                    console.error('❌ Error cargando categorías desde API:', apiError);

                    // Fallback: usar categorías hardcodeadas
                    console.log('🔄 Usando categorías fallback...');
                    const fallbackCategories = [
                        { id: 1, name: 'Electrónicos', slug: 'electronics', subCategories: [] },
                        { id: 2, name: 'Ropa', slug: 'clothing', subCategories: [] },
                        { id: 3, name: 'Hogar', slug: 'home', subCategories: [] },
                        { id: 4, name: 'Deportes', slug: 'sports', subCategories: [] }
                    ];

                    globalProductsCache.setCategories(fallbackCategories);
                    dispatch({ type: ACTIONS.SET_CATEGORIES, payload: fallbackCategories });

                    console.log('⚠️ Usando categorías fallback');
                    return fallbackCategories;
                }

            } catch (error) {
                console.error('❌ Error cargando categorías:', error);
                // En caso de error, usar categorías en cache si existen
                const cached = globalProductsCache.getCategories();
                if (cached.initialized) {
                    dispatch({ type: ACTIONS.SET_CATEGORIES, payload: cached.data });
                    return cached.data;
                }
                return [];
            } finally {
                dispatch({ type: ACTIONS.SET_LOADING, payload: false });
            }
        }, []),

        // Cambiar categoría actual
        changeCategory: useCallback((categoryIndex) => {
            console.log(`🔀 Cambiando a categoría index: ${categoryIndex}`);
            dispatch({ type: ACTIONS.SET_CURRENT_CATEGORY, payload: categoryIndex });
        }, []),

        // Cambiar subcategoría actual
        changeSubCategory: useCallback((subCategoryIndex) => {
            console.log(`🔀 Cambiando a subcategoría index: ${subCategoryIndex}`);
            dispatch({ type: ACTIONS.SET_CURRENT_SUBCATEGORY, payload: subCategoryIndex });
        }, []),

        // Obtener productos de una categoría/subcategoría
        getCategoryProducts: useCallback((categoryIndex, subCategoryIndex = 0) => {
            return globalProductsCache.getCategoryProducts(categoryIndex, subCategoryIndex);
        }, []),

        // Cargar productos de una categoría
        loadCategoryProducts: useCallback(async (categoryIndex, subCategoryIndex = 0, forceRefresh = false, offset = 0) => {
            const categoryKey = globalProductsCache.getCategoryKey(categoryIndex, subCategoryIndex);

            console.log(`🔄 Cargando productos para categoría ${categoryKey}, offset: ${offset}`);

            try {
                // Marcar como cargando en el cache
                globalProductsCache.setLoading(categoryIndex, subCategoryIndex, true);

                // Si es offset > 0, siempre cargar desde API (infinite scroll)
                // Si no necesitamos actualizar y no es refresh forzado, devolver cache
                if (offset === 0 && !forceRefresh && !globalProductsCache.shouldLoadCategory(categoryIndex, subCategoryIndex)) {
                    const cached = globalProductsCache.getCategoryProducts(categoryIndex, subCategoryIndex);
                    console.log(`✅ Productos de categoría ${categoryKey} obtenidos desde cache`);
                    return cached.products;
                }

                // Construir URL de API según la categoría
                let apiUrl;
                if (categoryIndex === 0) {
                    // Categoría "Todos" - productos random con seed de sesión
                    console.log(`🌱 Usando sessionSeed: ${SESSION_SEED}`);
                    apiUrl = `https://api.minymol.com/products/random-previews?limit=10&offset=${offset}&seed=${SESSION_SEED}`;
                } else {
                    // Categoría específica - usar la lógica correcta de dos llamadas
                    const categories = state.categories || [];
                    const category = categories[categoryIndex - 1]; // -1 porque 0 es "Todos"
                    if (!category) {
                        console.error(`❌ Categoría no encontrada para índice ${categoryIndex}`);
                        return [];
                    }
                    
                    // Primera llamada: obtener IDs de productos
                    const params = new URLSearchParams();
                    params.append('categorySlug', category.slug);
                    
                    if (subCategoryIndex > 0) {
                        // Subcategoría específica
                        const subCategory = category.subCategories && category.subCategories[subCategoryIndex - 1];
                        if (!subCategory) {
                            console.error(`❌ Subcategoría no encontrada para índice ${subCategoryIndex}`);
                            return [];
                        }
                        params.append('subCategorySlug', subCategory.slug);
                    }
                    
                    console.log(`🌐 Obteniendo IDs de productos: https://api.minymol.com/products/public-ids?${params.toString()}`);
                    
                    try {
                        const idsResponse = await fetch(`https://api.minymol.com/products/public-ids?${params.toString()}`);
                        if (!idsResponse.ok) {
                            throw new Error(`HTTP error! status: ${idsResponse.status}`);
                        }
                        
                        const idsData = await idsResponse.json();
                        if (!Array.isArray(idsData)) {
                            throw new Error('Respuesta inválida del backend para IDs');
                        }
                        
                        const allIds = idsData.map(p => p.product_id);
                        
                        // Aplicar offset y limit para paginación
                        const paginatedIds = allIds.slice(offset, offset + 10);
                        
                        if (paginatedIds.length === 0) {
                            console.log('✅ No hay más productos para esta categoría');
                            return [];
                        }
                        
                        console.log(`🌐 Obteniendo previews para ${paginatedIds.length} productos`);
                        
                        // Segunda llamada: obtener previews
                        const previewsResponse = await fetch(`https://api.minymol.com/products/previews`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids: paginatedIds })
                        });
                        
                        if (!previewsResponse.ok) {
                            throw new Error(`HTTP error! status: ${previewsResponse.status}`);
                        }
                        
                        const productsData = await previewsResponse.json();
                        
                        // Procesar productos (continúa con la lógica existente)
                        let products = [];
                        if (Array.isArray(productsData)) {
                            products = productsData;
                        } else if (productsData.products && Array.isArray(productsData.products)) {
                            products = productsData.products;
                        } else if (productsData.data && Array.isArray(productsData.data)) {
                            products = productsData.data;
                        }
                        
                        console.log(`✅ ${products.length} productos cargados desde API`);
                        
                        // Continuar con la validación de productos...
                        const validProducts = products.filter(product => 
                            product && 
                            (product.id || product.uuid) && 
                            product.name && 
                            (product.price || product.price === 0 || (product.prices && Array.isArray(product.prices) && product.prices.length > 0))
                        ).map(product => ({
                            // Normalizar la estructura del producto
                            id: product.id || product.uuid,
                            uuid: product.uuid || product.id,
                            name: product.name,
                            price: product.price || (product.prices && product.prices[0] ? parseFloat(product.prices[0].amount) : 0),
                            image: product.image,
                            provider: product.provider,
                            stars: product.stars || 0,
                            createdAt: product.createdAt,
                            subCategory: product.subCategory,
                            category: product.category,
                            prices: product.prices || [],
                            // Mantener todas las propiedades originales
                            ...product
                        }));
                        
                        console.log(`✅ ${validProducts.length} productos válidos de ${products.length} totales`);
                        
                        // Guardar en cache para categorías específicas
                        if (offset === 0) {
                            // Primera carga, reemplazar productos
                            globalProductsCache.setCategoryProducts(categoryIndex, subCategoryIndex, validProducts);
                        } else {
                            // Infinite scroll, agregar productos
                            const currentCache = globalProductsCache.getCategoryProducts(categoryIndex, subCategoryIndex);
                            const allProducts = [...(currentCache.products || []), ...validProducts];
                            globalProductsCache.setCategoryProducts(categoryIndex, subCategoryIndex, allProducts);
                        }
                        
                        return validProducts;
                        
                    } catch (categoryError) {
                        console.error('❌ Error obteniendo productos por categoría:', categoryError);
                        throw categoryError;
                    }
                }

                // Solo llegamos aquí para categoryIndex === 0 ("Todos")
                
                try {
                    const response = await fetch(apiUrl);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const productsData = await response.json();
                    
                    // Asegurar que tenemos la estructura esperada
                    let products = [];
                    if (Array.isArray(productsData)) {
                        products = productsData;
                    } else if (productsData.products && Array.isArray(productsData.products)) {
                        products = productsData.products;
                    } else if (productsData.data && Array.isArray(productsData.data)) {
                        products = productsData.data;
                    }
                    
                    console.log(`✅ ${products.length} productos cargados desde API`);
                    
                    // Verificar que los productos tienen la estructura mínima necesaria
                    const validProducts = products.filter(product => 
                        product && 
                        (product.id || product.uuid) && 
                        product.name && 
                        (product.price || product.price === 0 || (product.prices && Array.isArray(product.prices) && product.prices.length > 0))
                    ).map(product => ({
                        // Normalizar la estructura del producto
                        id: product.id || product.uuid,
                        uuid: product.uuid || product.id,
                        name: product.name,
                        price: product.price || (product.prices && product.prices[0] ? parseFloat(product.prices[0].amount) : 0),
                        image: product.image,
                        provider: product.provider,
                        stars: product.stars || 0,
                        createdAt: product.createdAt,
                        subCategory: product.subCategory,
                        category: product.category,
                        prices: product.prices || [],
                        // Mantener todas las propiedades originales
                        ...product
                    }));
                    
                    console.log(`✅ ${validProducts.length} productos válidos de ${products.length} totales`);
                    
                    // Lógica simplificada de cache - solo para infinite scroll
                    if (categoryIndex === 0) {
                        if (offset === 0) {
                            // Primera carga, reemplazar productos
                            globalProductsCache.setHomeProducts(validProducts, SESSION_SEED);
                        } else {
                            // Infinite scroll, agregar productos
                            const currentCache = globalProductsCache.getHomeProducts();
                            const allProducts = [...(currentCache.products || []), ...validProducts];
                            globalProductsCache.setHomeProducts(allProducts, SESSION_SEED);
                        }
                    } else {
                        if (offset === 0) {
                            // Primera carga, reemplazar productos
                            globalProductsCache.setCategoryProducts(categoryIndex, subCategoryIndex, validProducts);
                        } else {
                            // Infinite scroll, agregar productos
                            const currentCache = globalProductsCache.getCategoryProducts(categoryIndex, subCategoryIndex);
                            const allProducts = [...(currentCache.products || []), ...validProducts];
                            globalProductsCache.setCategoryProducts(categoryIndex, subCategoryIndex, allProducts);
                        }
                    }

                    return validProducts; // Devolver solo los productos nuevos para infinite scroll
                } catch (apiError) {
                    console.error('❌ Error llamando API:', apiError);
                    
                    // En caso de error, devolver productos en cache si existen
                    const cached = globalProductsCache.getCategoryProducts(categoryIndex, subCategoryIndex);
                    if (cached.products.length > 0) {
                        console.log(`⚠️ Usando productos desde cache debido a error de API`);
                        return cached.products;
                    }
                    
                    // Si no hay cache, devolver array vacío
                    console.log(`⚠️ No hay productos en cache, devolviendo array vacío`);
                    return [];
                }

            } catch (error) {
                console.error(`❌ Error cargando productos para categoría ${categoryKey}:`, error);
                // Devolver productos en cache si existen
                const cached = globalProductsCache.getCategoryProducts(categoryIndex, subCategoryIndex);
                return cached.products || [];
            } finally {
                // Quitar loading del cache
                globalProductsCache.setLoading(categoryIndex, subCategoryIndex, false);
            }
        }, [state.categories]),

        // Obtener categoría actual
        getCurrentCategory: useCallback(() => {
            if (state.currentCategoryIndex === 0) {
                return { name: 'Todos', slug: '', subCategories: [] };
            }
            const categories = state.categories || [];
            return categories[state.currentCategoryIndex - 1] || null;
        }, [state.categories, state.currentCategoryIndex]),

        // Verificar si una categoría está cargando
        isCategoryLoading: useCallback((categoryIndex, subCategoryIndex = 0) => {
            return globalProductsCache.isLoading(categoryIndex, subCategoryIndex);
        }, []),

        // Marcar Home como inicializado
        setHomeInitialized: useCallback((initialized) => {
            dispatch({ type: ACTIONS.SET_HOME_INITIALIZED, payload: initialized });
        }, [])
    };

    const value = {
        // Estado (con valores seguros)
        categories: state.categories || [],
        currentCategoryIndex: state.currentCategoryIndex,
        currentSubCategoryIndex: state.currentSubCategoryIndex,
        loading: state.loading,
        categoryLoadingStates: state.categoryLoadingStates || {},
        homeInitialized: state.homeInitialized,

        // Acciones
        ...actions,

        // Getters útiles
        totalCategories: (state.categories || []).length + 1, // +1 por "Todos"
        currentCategory: actions.getCurrentCategory()
    };

    return (
        <AppStateContext.Provider value={value}>
            {children}
        </AppStateContext.Provider>
    );
};

// Hook para usar el contexto
export const useAppState = () => {
    const context = useContext(AppStateContext);
    if (!context) {
        throw new Error('useAppState debe ser usado dentro de un AppStateProvider');
    }
    return context;
};

export default AppStateContext;