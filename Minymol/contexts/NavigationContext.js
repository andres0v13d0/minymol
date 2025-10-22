/**
 * 🚀 NavigationContext - Isolated Navigation State
 * 
 * Handles ONLY navigation state (current tab, category index, subcategory index)
 * Separated from data contexts to prevent cascade re-renders
 */

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

const initialState = {
    currentTab: 'home',
    currentCategoryIndex: 0,
    currentSubCategoryIndex: 0,
};

const NavigationActionTypes = {
    SET_TAB: 'SET_TAB',
    SET_CATEGORY: 'SET_CATEGORY',
    SET_SUBCATEGORY: 'SET_SUBCATEGORY',
};

const navigationReducer = (state, action) => {
    switch (action.type) {
        case NavigationActionTypes.SET_TAB:
            return { ...state, currentTab: action.payload };
        case NavigationActionTypes.SET_CATEGORY:
            // Only update if different to prevent unnecessary re-renders
            if (state.currentCategoryIndex === action.payload) return state;
            return { ...state, currentCategoryIndex: action.payload };
        case NavigationActionTypes.SET_SUBCATEGORY:
            // Only update if different to prevent unnecessary re-renders
            if (state.currentSubCategoryIndex === action.payload) return state;
            return { ...state, currentSubCategoryIndex: action.payload };
        default:
            return state;
    }
};

const NavigationContext = createContext(undefined);

export const NavigationProvider = ({ children }) => {
    const [state, dispatch] = useReducer(navigationReducer, initialState);

    const setTab = useCallback((tab) => {
        dispatch({ type: NavigationActionTypes.SET_TAB, payload: tab });
    }, []);

    const setCategory = useCallback((index) => {
        dispatch({ type: NavigationActionTypes.SET_CATEGORY, payload: index });
    }, []);

    const setSubCategory = useCallback((index) => {
        dispatch({ type: NavigationActionTypes.SET_SUBCATEGORY, payload: index });
    }, []);

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        ...state,
        setTab,
        setCategory,
        setSubCategory,
    }), [state, setTab, setCategory, setSubCategory]);

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useNavigation must be used within NavigationProvider');
    }
    return context;
};

// ✅ Selector hooks to prevent unnecessary re-renders
export const useCurrentTab = () => {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useCurrentTab must be used within NavigationProvider');
    }
    return context.currentTab;
};

export const useCurrentCategory = () => {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useCurrentCategory must be used within NavigationProvider');
    }
    return {
        index: context.currentCategoryIndex,
        setCategory: context.setCategory,
    };
};

export const useCurrentSubCategory = () => {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useCurrentSubCategory must be used within NavigationProvider');
    }
    return {
        index: context.currentSubCategoryIndex,
        setSubCategory: context.setSubCategory,
    };
};

export default NavigationContext;
