import { createContext, useCallback, useContext, useReducer } from 'react';
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
                totalCategories: action.payload.length,
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
            
            // Por ahora retornamos un array vacío
            // En una implementación real aquí se haría la llamada a la API de productos
            const products = [];
            
            console.log(`✅ ${products.length} productos cargados`);
            return products;
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            return [];
        }
    }, []);

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