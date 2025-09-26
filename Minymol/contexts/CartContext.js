import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { isAuthenticated } from '../utils/apiUtils';
import {
    loadCartFromBackend,
    syncAddToCart,
    syncRemoveItem,
    syncToggleCheck,
    syncUpdateQuantity
} from '../utils/cartSync';

// Crear el contexto
const CartContext = createContext();

// Hook personalizado para usar el contexto
export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart debe ser usado dentro de CartProvider');
    }
    return context;
};

// Proveedor del contexto
export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cargar carrito desde AsyncStorage y sincronizar con backend
    const loadCart = useCallback(async () => {
        try {
            // 1. Cargar primero desde AsyncStorage para respuesta inmediata
            const cartString = await AsyncStorage.getItem('cart');
            const localCart = cartString ? JSON.parse(cartString) : [];
            setCartItems(localCart);
            setLoading(false); // Mostrar datos locales inmediatamente
            
            // 2. Si el usuario está autenticado, sincronizar con backend en background
            if (isAuthenticated()) {
                console.log('Usuario autenticado, sincronizando con backend...');
                
                try {
                    const backendCart = await loadCartFromBackend();
                    
                    // 3. Merge inteligente: priorizar backend pero mantener cambios locales recientes
                    const mergedCart = mergeCartData(localCart, backendCart);
                    
                    // 4. Actualizar tanto AsyncStorage como estado
                    if (JSON.stringify(mergedCart) !== JSON.stringify(localCart)) {
                        await AsyncStorage.setItem('cart', JSON.stringify(mergedCart));
                        setCartItems(mergedCart);
                        console.log('Carrito sincronizado con backend');
                    }
                } catch (syncError) {
                    console.warn('Error sincronizando con backend, usando datos locales:', syncError);
                    // Mantener datos locales si hay error de sincronización
                }
            } else {
                console.log('Usuario no autenticado, usando solo datos locales');
            }
        } catch (error) {
            console.error('Error cargando carrito:', error);
            setCartItems([]);
            setLoading(false);
        }
    }, []);

    // Función para merge inteligente de datos local vs backend
    const mergeCartData = (localCart, backendCart) => {
        // Por ahora, priorizar backend pero esto se puede mejorar
        // TODO: Implementar lógica más sofisticada basada en timestamps
        return backendCart.length > 0 ? backendCart : localCart;
    };

    // Guardar carrito en AsyncStorage
    const saveCart = useCallback(async (cart) => {
        try {
            await AsyncStorage.setItem('cart', JSON.stringify(cart));
            setCartItems(cart);
        } catch (error) {
            console.error('Error guardando carrito:', error);
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
            if (existingItemIndex !== -1) {
                // Si existe, aumentar la cantidad
                updatedCart = [...existingCart];
                updatedCart[existingItemIndex].cantidad += product.cantidad;
                updatedCart[existingItemIndex].quantity += product.quantity;
            } else {
                // Si no existe, añadir nuevo item
                updatedCart = [...existingCart, {
                    ...product,
                    id: `${product.productId}-${product.color || 'nocolor'}-${product.talla || 'nosize'}-${Date.now()}`,
                    createdAt: new Date().toISOString()
                }];
            }

            // 1. Actualizar inmediatamente AsyncStorage y estado (UX fluida)
            await saveCart(updatedCart);

            // 2. Sincronizar con backend en background (sin bloquear UI)
            if (isAuthenticated()) {
                // No awaiteamos para no bloquear la UI
                syncAddToCart(product).catch(error => {
                    console.warn('Error en sync background al agregar:', error);
                    // TODO: Implementar cola de reintento para casos offline
                });
            }

            return true;
        } catch (error) {
            console.error('Error añadiendo al carrito:', error);
            return false;
        }
    }, [saveCart]);

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

            // 2. Sincronizar con backend en background
            if (isAuthenticated()) {
                syncUpdateQuantity(itemId, newQuantity).catch(error => {
                    console.warn('Error en sync background al actualizar cantidad:', error);
                });
            }

            return true;
        } catch (error) {
            console.error('Error actualizando cantidad:', error);
            return false;
        }
    }, [cartItems, saveCart]);

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

            // 2. Sincronizar con backend en background
            if (isAuthenticated()) {
                const item = updatedCart.find(i => i.id === itemId);
                if (item) {
                    syncToggleCheck(itemId, item.isChecked).catch(error => {
                        console.warn('Error en sync background al togglear check:', error);
                    });
                }
            }

            return true;
        } catch (error) {
            console.error('Error actualizando selección:', error);
            return false;
        }
    }, [cartItems, saveCart]);

    // Eliminar item del carrito con sincronización en background
    const removeItem = useCallback(async (itemId) => {
        try {
            const updatedCart = cartItems.filter(item => item.id !== itemId);
            
            // 1. Actualizar inmediatamente (UX fluida)
            await saveCart(updatedCart);

            // 2. Sincronizar con backend en background
            if (isAuthenticated()) {
                syncRemoveItem(itemId).catch(error => {
                    console.warn('Error en sync background al eliminar:', error);
                });
            }

            return true;
        } catch (error) {
            console.error('Error eliminando item:', error);
            return false;
        }
    }, [cartItems, saveCart]);

    // Limpiar carrito
    const clearCart = useCallback(async () => {
        try {
            await AsyncStorage.removeItem('cart');
            setCartItems([]);
            return true;
        } catch (error) {
            console.error('Error limpiando carrito:', error);
            return false;
        }
    }, []);

    // Obtener cantidad total de items (productos únicos)
    const getTotalItems = useCallback(() => {
        return cartItems.length; // Contar productos únicos, no cantidades
    }, [cartItems]);

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

    // Cargar carrito al inicializar
    useEffect(() => {
        loadCart();
    }, [loadCart]);

    const value = {
        cartItems,
        loading,
        addToCart,
        updateQuantity,
        toggleItemCheck,
        removeItem,
        clearCart,
        getTotalItems,
        getTotalPrice,
        getGroupedItems,
        loadCart,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};