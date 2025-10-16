import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { auth } from '../config/firebase';
import { isAuthenticated } from '../utils/apiUtils';
import {
    loadCartFromBackend,
    syncAddToCart,
    syncRemoveItem,
    syncToggleCheck,
    syncUpdateQuantity,
    triggerSync
} from '../utils/cartSync';
import { useCartCounter } from './CartCounterContext';

// Crear el contexto con valor por defecto
const CartContext = createContext(undefined);

// Hook personalizado para usar el contexto
export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        console.error('❌ ERROR: useCart fue llamado fuera de CartProvider');
        console.error('❌ Stack trace:', new Error().stack);
        throw new Error('useCart debe ser usado dentro de CartProvider');
    }
    return context;
};

// Proveedor del contexto
export const CartProvider = ({ children }) => {
    console.log('🛒 CartProvider INICIANDO montaje...');
    console.log('🛒 CartProvider tiene children:', !!children);
    
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const appState = useRef(AppState.currentState);
    const [syncInProgress, setSyncInProgress] = useState(false);
    // ✅ Contador visual que se actualiza instantáneamente
    const [visualCartCount, setVisualCartCount] = useState(0);
    
    // 🚀 NUEVO: Hook del contador ultrarrápido
    const cartCounter = useCartCounter();
    
    console.log('🛒 CartProvider: estados inicializados');

    // Cargar carrito desde AsyncStorage y sincronizar con backend
    const loadCart = useCallback(async (forceSync = false) => {
        try {
            console.log('📦 Cargando carrito...', forceSync ? '(FORZADO)' : '');
            
            // Si es forzado, mostrar loading y sincronizar directo
            if (forceSync && user && isAuthenticated()) {
                setLoading(true);
                setSyncInProgress(true);
                
                try {
                    // ✅ BORRAR TODO EL CARRITO LOCAL antes de sincronizar
                    console.log('🗑️ Borrando carrito local antes de sincronizar...');
                    await AsyncStorage.removeItem('cart');
                    setCartItems([]);
                    setVisualCartCount(0);
                    
                    // ✅ Cargar datos frescos del backend
                    const backendCart = await loadCartFromBackend();
                    await AsyncStorage.setItem('cart', JSON.stringify(backendCart));
                    setCartItems(backendCart);
                    setVisualCartCount(backendCart.length);
                    cartCounter.setCartCount(backendCart.length); // 🚀 Sincronizar contador
                    console.log(`✅ Carrito sincronizado FORZADO con backend: ${backendCart.length} items`);
                    
                } catch (syncError) {
                    console.warn('⚠️ Error sincronizando con backend:', syncError.message);
                } finally {
                    setSyncInProgress(false);
                    setLoading(false);
                }
                return;
            }
            
            // 1. Cargar primero desde AsyncStorage para respuesta inmediata
            const cartString = await AsyncStorage.getItem('cart');
            const localCart = cartString ? JSON.parse(cartString) : [];
            setCartItems(localCart);
            // ✅ Sincronizar contador visual con datos reales
            setVisualCartCount(localCart.length);
            cartCounter.setCartCount(localCart.length); // 🚀 Sincronizar contador
            setLoading(false); // Mostrar datos locales inmediatamente
            
            console.log(`✅ Datos locales cargados: ${localCart.length} items`);
            
            // 2. Si el usuario está autenticado, sincronizar con backend en background
            if (user && isAuthenticated()) {
                console.log('🔄 Usuario autenticado, sincronizando con backend...');
                setSyncInProgress(true);
                
                try {
                    // ✅ BORRAR TODO EL CARRITO LOCAL antes de sincronizar
                    console.log('🗑️ Borrando carrito local antes de sincronizar...');
                    await AsyncStorage.removeItem('cart');
                    
                    // ✅ Cargar datos frescos del backend
                    const backendCart = await loadCartFromBackend();
                    
                    // ✅ Guardar SOLO lo que viene del backend
                    await AsyncStorage.setItem('cart', JSON.stringify(backendCart));
                    setCartItems(backendCart);
                    setVisualCartCount(backendCart.length);
                    cartCounter.setCartCount(backendCart.length); // 🚀 Sincronizar contador
                    console.log(`✅ Carrito sincronizado con backend: ${backendCart.length} items`);
                    
                } catch (syncError) {
                    console.warn('⚠️ Error sincronizando con backend, usando datos locales:', syncError.message);
                    // Restaurar datos locales si hay error de sincronización
                    const fallbackCart = cartString ? JSON.parse(cartString) : [];
                    setCartItems(fallbackCart);
                    setVisualCartCount(fallbackCart.length);
                    cartCounter.setCartCount(fallbackCart.length); // 🚀 Sincronizar contador
                } finally {
                    setSyncInProgress(false);
                }
            } else {
                console.log('✋ Usuario no autenticado, usando solo datos locales');
            }
        } catch (error) {
            console.error('❌ Error cargando carrito:', error);
            setCartItems([]);
            setVisualCartCount(0); // ✅ Resetear contador visual
            cartCounter.reset(); // 🚀 Resetear contador
            setLoading(false);
        }
    }, [user, cartCounter]);

    // Guardar carrito en AsyncStorage
    const saveCart = useCallback(async (cart) => {
        try {
            await AsyncStorage.setItem('cart', JSON.stringify(cart));
            setCartItems(cart);
        } catch (error) {
            console.error('❌ Error guardando carrito:', error);
        }
    }, []);

    // Añadir producto al carrito con sincronización en background
    const addToCart = useCallback(async (product) => {
        try {
            const existingCartString = await AsyncStorage.getItem('cart');
            const existingCart = existingCartString ? JSON.parse(existingCartString) : [];

            // Verificar si el producto ya existe con la misma configuración
            const existingItemIndex = existingCart.findIndex(cartItem =>
                cartItem.productId === product.productId &&
                cartItem.color === product.color &&
                cartItem.talla === product.talla
            );

            let updatedCart;
            let isNewItem = false;
            
            if (existingItemIndex !== -1) {
                // Si existe, aumentar la cantidad
                updatedCart = [...existingCart];
                updatedCart[existingItemIndex].cantidad += product.cantidad;
                updatedCart[existingItemIndex].quantity += product.quantity;
            } else {
                // Si no existe, añadir nuevo item
                isNewItem = true;
                updatedCart = [...existingCart, {
                    ...product,
                    id: `${product.productId}-${product.color || 'nocolor'}-${product.talla || 'nosize'}-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    // ✅ Respetar isChecked del producto o usar true por defecto (como en web)
                    isChecked: product.isChecked ?? true
                }];
            }

            // 🚀 ACTUALIZAR CONTADOR INSTANTÁNEAMENTE (antes de cualquier await)
            if (isNewItem) {
                cartCounter.increment();
            }

            // 1. Actualizar inmediatamente AsyncStorage y estado (UX fluida)
            await saveCart(updatedCart);
            // ✅ Actualizar contador visual instantáneamente basado en el tamaño real del carrito
            setVisualCartCount(updatedCart.length);
            console.log('✅ Producto agregado al carrito local, total items:', updatedCart.length);

            // 2. Sincronizar con backend en background (sin bloquear UI)
            if (user && isAuthenticated()) {
                // No awaiteamos para no bloquear la UI
                syncAddToCart(product).catch(error => {
                    console.warn('⚠️ Error en sync background al agregar:', error.message);
                });
            } else {
                console.log('✋ Sin sincronización: usuario no autenticado');
            }

            return true;
        } catch (error) {
            console.error('❌ Error añadiendo al carrito:', error);
            // 🔄 Si hay error, sincronizar contador con la realidad
            cartCounter.syncWithStorage();
            return false;
        }
    }, [saveCart, user, cartCounter]);

    // Actualizar cantidad de un item con sincronización en background
    const updateQuantity = useCallback(async (itemId, newQuantity) => {
        try {
            const updatedCart = cartItems.map(item =>
                item.id === itemId
                    ? { ...item, cantidad: newQuantity, quantity: newQuantity }
                    : item
            );

            // 1. Actualizar inmediatamente (UX fluida)
            await saveCart(updatedCart);
            console.log('✅ Cantidad actualizada localmente');

            // 2. Sincronizar con backend en background
            if (user && isAuthenticated()) {
                syncUpdateQuantity(itemId, newQuantity).catch(error => {
                    console.warn('⚠️ Error en sync background al actualizar cantidad:', error.message);
                });
            }

            return true;
        } catch (error) {
            console.error('❌ Error actualizando cantidad:', error);
            return false;
        }
    }, [cartItems, saveCart, user]);

    // Alternar estado de selección de un item con sincronización en background
    const toggleItemCheck = useCallback(async (itemId) => {
        try {
            const updatedCart = cartItems.map(item =>
                item.id === itemId
                    ? { ...item, isChecked: !item.isChecked }
                    : item
            );

            // 1. Actualizar inmediatamente (UX fluida)
            await saveCart(updatedCart);
            console.log('✅ Selección actualizada localmente');

            // 2. Sincronizar con backend en background
            if (user && isAuthenticated()) {
                const item = updatedCart.find(i => i.id === itemId);
                if (item) {
                    syncToggleCheck(itemId, item.isChecked).catch(error => {
                        console.warn('⚠️ Error en sync background al togglear check:', error.message);
                    });
                }
            }

            return true;
        } catch (error) {
            console.error('❌ Error actualizando selección:', error);
            return false;
        }
    }, [cartItems, saveCart, user]);

    // Eliminar item del carrito con sincronización en background
    const removeItem = useCallback(async (itemId) => {
        try {
            const updatedCart = cartItems.filter(item => item.id !== itemId);
            
            // 🚀 ACTUALIZAR CONTADOR INSTANTÁNEAMENTE (antes de cualquier await)
            cartCounter.decrement();
            
            // 1. Actualizar inmediatamente (UX fluida)
            await saveCart(updatedCart);
            // ✅ Actualizar contador visual instantáneamente basado en el tamaño real
            setVisualCartCount(updatedCart.length);
            console.log('✅ Item eliminado localmente, total items:', updatedCart.length);

            // 2. Sincronizar con backend en background
            if (user && isAuthenticated()) {
                syncRemoveItem(itemId).catch(error => {
                    console.warn('⚠️ Error en sync background al eliminar:', error.message);
                });
            }

            return true;
        } catch (error) {
            console.error('❌ Error eliminando item:', error);
            // 🔄 Si hay error, sincronizar contador con la realidad
            cartCounter.syncWithStorage();
            return false;
        }
    }, [cartItems, saveCart, user, cartCounter]);

    // ✅ NUEVO: Eliminar múltiples items del carrito (batch delete)
    const removeMultipleItems = useCallback(async (itemIds) => {
        try {
            console.log('🗑️ Eliminando múltiples items:', itemIds.length);
            
            const updatedCart = cartItems.filter(item => !itemIds.includes(item.id));
            
            // 🚀 ACTUALIZAR CONTADOR INSTANTÁNEAMENTE con el nuevo tamaño
            cartCounter.setCartCount(updatedCart.length);
            
            // 1. Actualizar inmediatamente (UX fluida)
            await saveCart(updatedCart);
            // ✅ Actualizar contador visual instantáneamente basado en el tamaño real
            setVisualCartCount(updatedCart.length);
            console.log('✅ Items eliminados localmente, total items:', updatedCart.length);

            // 2. Sincronizar con backend en background
            if (user && isAuthenticated()) {
                // Eliminar todos en paralelo
                const deletePromises = itemIds.map(id => 
                    syncRemoveItem(id).catch(error => {
                        console.warn(`⚠️ Error eliminando ${id}:`, error.message);
                    })
                );
                
                await Promise.allSettled(deletePromises);
                console.log('✅ Sincronización de eliminación completada');
            }

            return true;
        } catch (error) {
            console.error('❌ Error eliminando múltiples items:', error);
            // 🔄 Si hay error, sincronizar contador con la realidad
            cartCounter.syncWithStorage();
            return false;
        }
    }, [cartItems, saveCart, user, cartCounter]);

    // Limpiar carrito
    const clearCart = useCallback(async () => {
        try {
            await AsyncStorage.removeItem('cart');
            setCartItems([]);
            setVisualCartCount(0); // ✅ Resetear contador visual
            cartCounter.reset(); // 🚀 Resetear contador ultrarrápido
            return true;
        } catch (error) {
            console.error('Error limpiando carrito:', error);
            return false;
        }
    }, [cartCounter]);

    // Obtener cantidad total de items (productos únicos)
    const getTotalItems = useCallback(() => {
        return cartItems.length; // Contar productos únicos, no cantidades
    }, [cartItems]);

    // ✅ Obtener contador visual (actualización instantánea)
    const getVisualCartCount = useCallback(() => {
        return visualCartCount || 0;
    }, [visualCartCount]);

    // Obtener total del carrito
    const getTotalPrice = useCallback(() => {
        return cartItems
            .filter(item => item.isChecked)
            .reduce((total, item) => {
                const unitPrice = parseFloat(item.precio || 0);
                return total + (unitPrice * item.cantidad);
            }, 0);
    }, [cartItems]);

    // Agrupar items por proveedor
    const getGroupedItems = useCallback(() => {
        return cartItems.reduce((acc, item) => {
            const providerName = item.providerNameSnapshot || 'Proveedor desconocido';
            if (!acc[providerName]) {
                acc[providerName] = [];
            }
            acc[providerName].push(item);
            return acc;
        }, {});
    }, [cartItems]);

    // ✅ Sincronizar contador visual con cartItems como respaldo
    useEffect(() => {
        setVisualCartCount(cartItems.length);
        console.log('🔄 Sincronizando contador visual:', cartItems.length);
    }, [cartItems]);

    // Cargar carrito al inicializar
    useEffect(() => {
        loadCart();
    }, [loadCart]);

    // Listener de autenticación Firebase
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            
            // Si el usuario se autentica, recargar carrito para sincronizar
            if (firebaseUser) {
                console.log('👤 Usuario autenticado, recargando carrito...');
                loadCart();
            } else {
                console.log('👤 Usuario no autenticado');
            }
        });

        return () => unsubscribe();
    }, [loadCart]);

    // Listener para cuando la app vuelve a primer plano
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                console.log('📱 App en primer plano, sincronizando...');
                
                // Sincronizar cuando la app vuelve a estar activa
                if (user && isAuthenticated()) {
                    triggerSync().catch(error => {
                        console.warn('⚠️ Error sincronizando al volver a primer plano:', error);
                    });
                }
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [user]);

    // ✅ OPTIMIZADO: Memoizar el value del contexto para evitar re-renders innecesarios
    const value = useMemo(() => ({
        cartItems,
        loading,
        syncInProgress,
        user,
        visualCartCount, // ✅ Exponer directamente el valor del contador visual
        addToCart,
        updateQuantity,
        toggleItemCheck,
        removeItem,
        removeMultipleItems,
        clearCart,
        getTotalItems,
        getVisualCartCount,
        getTotalPrice,
        getGroupedItems,
        loadCart,
    }), [
        cartItems,
        loading,
        syncInProgress,
        user,
        visualCartCount, // ✅ Incluir en dependencias
        addToCart,
        updateQuantity,
        toggleItemCheck,
        removeItem,
        removeMultipleItems,
        clearCart,
        getTotalItems,
        getVisualCartCount,
        getTotalPrice,
        getGroupedItems,
        loadCart,
    ]);

    console.log('🛒 CartProvider: value creado, retornando Provider con value:', {
        hasCartItems: !!cartItems,
        cartItemsLength: cartItems.length,
        visualCartCount,
        loading,
        hasUser: !!user
    });

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};