import { apiCall, isAuthenticated } from './apiUtils';

/**
 * Servicio de sincronización del carrito con el backend
 * Mantiene la experiencia visual fluida mientras sincroniza en background
 */

const API_BASE_URL = 'https://api.minymol.com';

/**
 * Cargar carrito desde el backend
 */
export const loadCartFromBackend = async () => {
    try {
        if (!isAuthenticated()) {
            console.log('Usuario no autenticado, no se puede cargar carrito del backend');
            return [];
        }

        const response = await apiCall(`${API_BASE_URL}/cart`);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const cartItems = await response.json();

        // Enriquecer items con precios (como en la versión web)
        const enrichedItems = await Promise.all(
            cartItems.map(async (item) => {
                try {
                    const pricesResponse = await fetch(`${API_BASE_URL}/product-prices/product/${item.product.id}`);
                    const prices = await pricesResponse.json();

                    return {
                        ...item,
                        productPrices: prices,
                        // Mapear campos del backend a los que usa la app móvil
                        id: item.id,
                        productId: item.productId,
                        cantidad: item.quantity,
                        quantity: item.quantity,
                        color: item.colorSnapshot,
                        talla: item.sizeSnapshot,
                        precio: item.priceSnapshot,
                        productNameSnapshot: item.productNameSnapshot,
                        imageUrlSnapshot: item.imageUrlSnapshot,
                        providerNameSnapshot: item.providerNameSnapshot,
                        createdAt: item.createdAt
                    };
                } catch (priceError) {
                    console.warn('Error cargando precios para producto:', item.productId, priceError);
                    return {
                        ...item,
                        productPrices: [],
                        id: item.id,
                        productId: item.productId,
                        cantidad: item.quantity,
                        quantity: item.quantity,
                        color: item.colorSnapshot,
                        talla: item.sizeSnapshot,
                        precio: item.priceSnapshot,
                        productNameSnapshot: item.productNameSnapshot,
                        imageUrlSnapshot: item.imageUrlSnapshot,
                        providerNameSnapshot: item.providerNameSnapshot,
                        createdAt: item.createdAt
                    };
                }
            })
        );

        console.log('Carrito cargado desde backend:', enrichedItems.length, 'items');
        return enrichedItems;

    } catch (error) {
        console.error('Error cargando carrito desde backend:', error);
        return []; // Retornar array vacío en caso de error
    }
};

/**
 * Sincronizar adición de producto al carrito en background
 */
export const syncAddToCart = async (product) => {
    try {
        if (!isAuthenticated()) {
            console.log('Usuario no autenticado, no se sincroniza con backend');
            return false;
        }

        const requestBody = {
            productId: product.productId,
            quantity: product.cantidad || product.quantity,
            priceSnapshot: parseFloat(product.precio),
            colorSnapshot: product.color || null,
            sizeSnapshot: product.talla || null,
            // Snapshots adicionales para mantener consistencia
            productNameSnapshot: product.productNameSnapshot || product.nombre,
            imageUrlSnapshot: product.imageUrlSnapshot || product.image,
            providerNameSnapshot: product.providerNameSnapshot
        };

        console.log('Sincronizando adición al carrito en background:', requestBody);

        const response = await apiCall(`${API_BASE_URL}/cart`, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('Producto sincronizado exitosamente con backend:', result.id);
        return result;

    } catch (error) {
        console.error('Error sincronizando adición al carrito:', error);
        return false;
    }
};

/**
 * Sincronizar actualización de cantidad en background
 */
export const syncUpdateQuantity = async (itemId, newQuantity) => {
    try {
        if (!isAuthenticated()) {
            console.log('Usuario no autenticado, no se sincroniza actualización de cantidad');
            return false;
        }

        console.log('Sincronizando actualización de cantidad en background:', itemId, newQuantity);

        const response = await apiCall(`${API_BASE_URL}/cart/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity: newQuantity })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        console.log('Cantidad actualizada exitosamente en backend');
        return true;

    } catch (error) {
        console.error('Error sincronizando actualización de cantidad:', error);
        return false;
    }
};

/**
 * Sincronizar cambio de estado de check en background
 */
export const syncToggleCheck = async (itemId, isChecked) => {
    try {
        if (!isAuthenticated()) {
            console.log('Usuario no autenticado, no se sincroniza estado de check');
            return false;
        }

        console.log('Sincronizando cambio de check en background:', itemId, isChecked);

        const response = await apiCall(`${API_BASE_URL}/cart/${itemId}/check`, {
            method: 'PATCH',
            body: JSON.stringify({ isChecked })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        console.log('Estado de check actualizado exitosamente en backend');
        return true;

    } catch (error) {
        console.error('Error sincronizando estado de check:', error);
        return false;
    }
};

/**
 * Sincronizar eliminación de item en background
 */
export const syncRemoveItem = async (itemId) => {
    try {
        if (!isAuthenticated()) {
            console.log('Usuario no autenticado, no se sincroniza eliminación');
            return false;
        }

        console.log('Sincronizando eliminación de item en background:', itemId);

        const response = await apiCall(`${API_BASE_URL}/cart/${itemId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        console.log('Item eliminado exitosamente del backend');
        return true;

    } catch (error) {
        console.error('Error sincronizando eliminación de item:', error);
        return false;
    }
};