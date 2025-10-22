/**
 * 🚀 CategoriesContext - Isolated Categories Data State
 * 
 * Handles ONLY category data (list, loading state)
 * Separated from navigation to prevent unnecessary re-renders
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import subCategoriesManager from '../utils/SubCategoriesManager';

const initialState = {
    categories: [],
    loading: true,
    error: null,
    initialized: false,
};

const CategoriesActionTypes = {
    SET_LOADING: 'SET_LOADING',
    SET_CATEGORIES: 'SET_CATEGORIES',
    SET_ERROR: 'SET_ERROR',
    SET_INITIALIZED: 'SET_INITIALIZED',
};

const categoriesReducer = (state, action) => {
    switch (action.type) {
        case CategoriesActionTypes.SET_LOADING:
            return { ...state, loading: action.payload };
        case CategoriesActionTypes.SET_CATEGORIES:
            return {
                ...state,
                categories: action.payload,
                loading: false,
                error: null,
            };
        case CategoriesActionTypes.SET_ERROR:
            return {
                ...state,
                error: action.payload,
                loading: false,
            };
        case CategoriesActionTypes.SET_INITIALIZED:
            return { ...state, initialized: action.payload };
        default:
            return state;
    }
};

const CategoriesContext = createContext(undefined);

export const CategoriesProvider = ({ children }) => {
    const [state, dispatch] = useReducer(categoriesReducer, initialState);
    const loadingRef = useRef(false);

    const loadCategories = useCallback(async () => {
        // Prevent multiple simultaneous loads
        if (loadingRef.current) {
            console.log('⏭️ Categories already loading, skipping...');
            return state.categories;
        }

        try {
            loadingRef.current = true;
            dispatch({ type: CategoriesActionTypes.SET_LOADING, payload: true });
            console.log('🔄 Loading categories from API...');

            const res = await fetch('https://api.minymol.com/categories/with-products-and-images');
            const data = await res.json();

            if (Array.isArray(data)) {
                console.log(`✅ ${data.length} categories loaded successfully`);

                // Update SubCategoriesManager with API data
                subCategoriesManager.setCategoriesFromAPI(data);

                dispatch({ type: CategoriesActionTypes.SET_CATEGORIES, payload: data });
                dispatch({ type: CategoriesActionTypes.SET_INITIALIZED, payload: true });
                return data;
            } else {
                console.error('❌ Categories response is not an array:', data);
                throw new Error('Invalid categories data');
            }
        } catch (error) {
            console.error('❌ Error loading categories:', error);
            dispatch({ type: CategoriesActionTypes.SET_ERROR, payload: error.message });
            
            // Fallback to empty array instead of mock data
            dispatch({ type: CategoriesActionTypes.SET_CATEGORIES, payload: [] });
            return [];
        } finally {
            loadingRef.current = false;
        }
    }, []);

    // ✅ Get category by index (memoized)
    const getCategoryByIndex = useCallback((index) => {
        if (index === 0) return null; // "All" category
        return state.categories[index - 1] || null;
    }, [state.categories]);

    // ✅ Get total categories count (including "All")
    const totalCategories = useMemo(() => {
        return state.categories.length + 1; // +1 for "All"
    }, [state.categories.length]);

    // Memoize the context value
    const value = useMemo(() => ({
        ...state,
        loadCategories,
        getCategoryByIndex,
        totalCategories,
    }), [state, loadCategories, getCategoryByIndex, totalCategories]);

    return (
        <CategoriesContext.Provider value={value}>
            {children}
        </CategoriesContext.Provider>
    );
};

export const useCategories = () => {
    const context = useContext(CategoriesContext);
    if (context === undefined) {
        throw new Error('useCategories must be used within CategoriesProvider');
    }
    return context;
};

// ✅ Selector hook for just the categories list
export const useCategoriesList = () => {
    const context = useContext(CategoriesContext);
    if (context === undefined) {
        throw new Error('useCategoriesList must be used within CategoriesProvider');
    }
    return context.categories;
};

// ✅ Selector hook for just the loading state
export const useCategoriesLoading = () => {
    const context = useContext(CategoriesContext);
    if (context === undefined) {
        throw new Error('useCategoriesLoading must be used within CategoriesProvider');
    }
    return context.loading;
};

export default CategoriesContext;
