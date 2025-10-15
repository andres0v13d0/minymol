import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
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

    // ✅ OPTIMIZADO: Función helper para verificar si una categoría está cargando
    const isCategoryLoading = useCallback((categoryIndex, subCategoryIndex = -1) => {
        // Siempre retornar false ya que la carga se maneja localmente en los componentes
        return false;
    }, []);

    // ✅ Obtener categoría actual
    const getCurrentCategory = useCallback(() => {
        if (state.currentCategoryIndex === 0) return null; // "Todos"
        return state.categories[state.currentCategoryIndex - 1] || null;
    }, [state.currentCategoryIndex, state.categories]);

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