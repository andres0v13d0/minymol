/**
 * 🚀 CartCounterContext - Contador Global Ultrarrápido del Carrito
 * 
 * Este contexto maneja SOLO el contador visual del carrito de forma independiente
 * para actualizaciones instantáneas en la UI sin depender de sincronizaciones.
 * 
 * CARACTERÍSTICAS:
 * - ⚡ Actualización instantánea al agregar/eliminar productos
 * - 🔄 Se sincroniza con CartContext como respaldo
 * - 🎯 Optimizado para performance máxima
 * - 📱 Funciona sin autenticación
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const CartCounterContext = createContext(undefined);

export const useCartCounter = () => {
    const context = useContext(CartCounterContext);
    if (context === undefined) {
        throw new Error('useCartCounter debe ser usado dentro de CartCounterProvider');
    }
    return context;
};

export const CartCounterProvider = ({ children }) => {
    const [count, setCount] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);

    // Inicializar contador desde AsyncStorage
    useEffect(() => {
        const initCounter = async () => {
            try {
                const cartString = await AsyncStorage.getItem('cart');
                const cart = cartString ? JSON.parse(cartString) : [];
                setCount(cart.length);
                console.log('🔢 CartCounter inicializado:', cart.length);
            } catch (error) {
                console.error('❌ Error inicializando contador:', error);
                setCount(0);
            } finally {
                setIsInitialized(true);
            }
        };
        
        initCounter();
    }, []);

    // ⚡ Incrementar contador (inmediato)
    const increment = useCallback(() => {
        setCount(prev => {
            const newCount = prev + 1;
            console.log('➕ Contador incrementado:', newCount);
            return newCount;
        });
    }, []);

    // ⚡ Decrementar contador (inmediato)
    const decrement = useCallback(() => {
        setCount(prev => {
            const newCount = Math.max(0, prev - 1);
            console.log('➖ Contador decrementado:', newCount);
            return newCount;
        });
    }, []);

    // ⚡ Actualizar contador a un valor específico (inmediato)
    const setCartCount = useCallback((newCount) => {
        setCount(Math.max(0, newCount));
        console.log('🔄 Contador actualizado:', newCount);
    }, []);

    // 🔄 Sincronizar con el carrito real desde AsyncStorage
    const syncWithStorage = useCallback(async () => {
        try {
            const cartString = await AsyncStorage.getItem('cart');
            const cart = cartString ? JSON.parse(cartString) : [];
            setCount(cart.length);
            console.log('🔄 Contador sincronizado con storage:', cart.length);
            return cart.length;
        } catch (error) {
            console.error('❌ Error sincronizando contador:', error);
            return count;
        }
    }, [count]);

    // 🎯 Resetear contador
    const reset = useCallback(() => {
        setCount(0);
        console.log('🔄 Contador reseteado');
    }, []);

    const value = {
        count,
        isInitialized,
        increment,
        decrement,
        setCartCount,
        syncWithStorage,
        reset,
    };

    return (
        <CartCounterContext.Provider value={value}>
            {children}
        </CartCounterContext.Provider>
    );
};
