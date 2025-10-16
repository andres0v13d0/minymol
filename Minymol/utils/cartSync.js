import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiCall, isAuthenticated } from './apiUtils';

/**
 * Servicio de sincronización del carrito con el backend
 * Mantiene la experiencia visual fluida mientras sincroniza en background
 * Implementa cola de operaciones para casos offline
 */

const API_BASE_URL = 'https://api.minymol.com';
const SYNC_QUEUE_KEY = 'cart_sync_queue';

/**
 * Cola de operaciones pendientes de sincronización
 */
let syncQueue = [];
let isSyncing = false;

/**
 * Limpiar cola de sincronización
 * Se llama después de una sincronización exitosa completa desde el backend
 */
export const clearSyncQueue = async () => {
    try {
        await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
        syncQueue = [];
        console.log('🧹 Cola de sincronización limpiada');
    } catch (error) {
        console.error('Error limpiando cola de sincronización:', error);
    }
};

/**
 * Agregar operación a la cola de sincronización
 */
const addToSyncQueue = async (operation) => {
    try {
        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const queue = queueStr ? JSON.parse(queueStr) : [];
        queue.push({
            ...operation,
            timestamp: Date.now(),
            retries: 0
        });
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
        
        // Intentar procesar la cola inmediatamente
        processSyncQueue();
    } catch (error) {
        console.error('Error agregando a cola de sincronización:', error);
    }
};

/**
 * Procesar cola de operaciones pendientes
 */
const processSyncQueue = async () => {
    if (isSyncing || !isAuthenticated()) {
        return;
    }

    isSyncing = true;

    try {
        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const queue = queueStr ? JSON.parse(queueStr) : [];

        if (queue.length === 0) {
            isSyncing = false;
            return;
        }

        const successfulOps = [];

        for (const operation of queue) {
            try {
                let success = false;

                switch (operation.type) {
                    case 'add':
                        success = await syncAddToCartInternal(operation.data);
                        break;
                    case 'update_quantity':
                        success = await syncUpdateQuantityInternal(operation.data.itemId, operation.data.quantity);
                        break;
                    case 'toggle_check':
                        success = await syncToggleCheckInternal(operation.data.itemId, operation.data.isChecked);
                        break;
                    case 'remove':
                        success = await syncRemoveItemInternal(operation.data.itemId);
                        break;
                }

                if (success) {
                    successfulOps.push(operation);
                } else if (operation.retries >= 3) {
                    // Después de 3 reintentos, descartar
                    console.warn('Operación descartada después de 3 reintentos:', operation.type);
                    successfulOps.push(operation);
                }
            } catch (error) {
                console.warn('Error procesando operación de cola:', operation.type, error);
            }
        }

        // Remover operaciones exitosas de la cola
        const remainingQueue = queue.filter(op => !successfulOps.includes(op));
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));

    } catch (error) {
        console.error('Error procesando cola de sincronización:', error);
    } finally {
        isSyncing = false;
    }
};

/**
 * Cargar carrito desde el backend
 * Retorna array vacío si el usuario no está autenticado (sin error)
 */
export const loadCartFromBackend = async () => {
    try {
        if (!isAuthenticated()) {
            console.log('✋ Usuario no autenticado, omitiendo carga desde backend');
            return [];
        }

        console.log('📦 Cargando carrito desde backend...');
        const response = await apiCall(`${API_BASE_URL}/cart`);

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.log('🔒 No autorizado, usando solo datos locales');
                return [];
            }
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
                        createdAt: item.createdAt,
                        // ✅ CRÍTICO: Respetar isChecked del backend
                        isChecked: item.isChecked ?? false
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
                        createdAt: item.createdAt,
                        // ✅ CRÍTICO: Respetar isChecked del backend
                        isChecked: item.isChecked ?? false
                    };
                }
            })
        );

        console.log(`✅ Carrito cargado desde backend: ${enrichedItems.length} items`);
        
        // ✅ LIMPIAR cola de sincronización después de una carga exitosa
        // Esto evita errores 404/400 por operaciones sobre items que ya no existen
        await clearSyncQueue();
        console.log('🧹 Cola limpiada después de sincronización exitosa');
        
        return enrichedItems;

    } catch (error) {
        // No loggear como error si es problema de autenticación
        if (error.message?.includes('401') || error.message?.includes('403')) {
            console.log('⚠️ Sin acceso al carrito en backend, usando datos locales');
        } else {
            console.error('❌ Error cargando carrito desde backend:', error);
        }
        return []; // Retornar array vacío en caso de error
    }
};

/**
 * Función interna para sincronizar adición (usada por la cola)
 */
const syncAddToCartInternal = async (product) => {
    try {
        const requestBody = {
            productId: product.productId,
            quantity: product.cantidad || product.quantity,
            priceSnapshot: parseFloat(product.precio),
            colorSnapshot: product.color || null,
            sizeSnapshot: product.talla || null,
            productNameSnapshot: product.productNameSnapshot || product.nombre,
            imageUrlSnapshot: product.imageUrlSnapshot || product.image,
            providerNameSnapshot: product.providerNameSnapshot
        };

        const response = await apiCall(`${API_BASE_URL}/cart`, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Producto sincronizado con backend:', result.id);
        return true;

    } catch (error) {
        console.warn('⚠️ Error sincronizando adición:', error.message);
        return false;
    }
};

/**
 * Sincronizar adición de producto al carrito en background
 * Si no hay conexión, agrega a cola para sincronizar después
 */
export const syncAddToCart = async (product) => {
    if (!isAuthenticated()) {
        console.log('✋ Usuario no autenticado, no se sincroniza adición');
        return false;
    }

    console.log('🔄 Sincronizando adición al carrito en background...');

    // Intentar sincronización inmediata
    const success = await syncAddToCartInternal(product);
    
    // Si falla, agregar a cola para reintentar
    if (!success) {
        await addToSyncQueue({
            type: 'add',
            data: product
        });
        console.log('📋 Adición agregada a cola de sincronización');
    }
    
    return success;
};

/**
 * Función interna para actualizar cantidad (usada por la cola)
 */
const syncUpdateQuantityInternal = async (itemId, newQuantity) => {
    try {
        const response = await apiCall(`${API_BASE_URL}/cart/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity: newQuantity })
        });

        if (!response.ok) {
            // Si es 404, el item ya no existe, descartar operación
            if (response.status === 404) {
                console.log('⚠️ Item no existe en backend (404), descartando operación:', itemId);
                return true; // Retornar true para que se elimine de la cola
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }

        console.log('✅ Cantidad actualizada en backend:', itemId);
        return true;

    } catch (error) {
        console.warn('⚠️ Error actualizando cantidad:', error.message);
        return false;
    }
};

/**
 * Sincronizar actualización de cantidad en background
 */
export const syncUpdateQuantity = async (itemId, newQuantity) => {
    if (!isAuthenticated()) {
        console.log('✋ Usuario no autenticado, no se sincroniza cantidad');
        return false;
    }

    console.log('🔄 Sincronizando cantidad en background:', newQuantity);

    const success = await syncUpdateQuantityInternal(itemId, newQuantity);
    
    if (!success) {
        await addToSyncQueue({
            type: 'update_quantity',
            data: { itemId, quantity: newQuantity }
        });
        console.log('📋 Actualización de cantidad en cola');
    }
    
    return success;
};

/**
 * Función interna para cambiar estado de check (usada por la cola)
 */
const syncToggleCheckInternal = async (itemId, isChecked) => {
    try {
        const response = await apiCall(`${API_BASE_URL}/cart/${itemId}/check`, {
            method: 'PATCH',
            body: JSON.stringify({ isChecked })
        });

        if (!response.ok) {
            // Si es 404, el item ya no existe, descartar operación
            if (response.status === 404) {
                console.log('⚠️ Item no existe en backend (404), descartando operación:', itemId);
                return true; // Retornar true para que se elimine de la cola
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }

        console.log('✅ Check actualizado en backend:', itemId, isChecked);
        return true;

    } catch (error) {
        console.warn('⚠️ Error actualizando check:', error.message);
        return false;
    }
};

/**
 * Sincronizar cambio de estado de check en background
 */
export const syncToggleCheck = async (itemId, isChecked) => {
    if (!isAuthenticated()) {
        console.log('✋ Usuario no autenticado, no se sincroniza check');
        return false;
    }

    console.log('🔄 Sincronizando check en background:', isChecked);

    const success = await syncToggleCheckInternal(itemId, isChecked);
    
    if (!success) {
        await addToSyncQueue({
            type: 'toggle_check',
            data: { itemId, isChecked }
        });
        console.log('📋 Toggle check en cola');
    }
    
    return success;
};

/**
 * Función interna para eliminar item (usada por la cola)
 */
const syncRemoveItemInternal = async (itemId) => {
    try {
        const response = await apiCall(`${API_BASE_URL}/cart/${itemId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            // Si es 404, el item ya no existe, considerar exitoso
            if (response.status === 404) {
                console.log('⚠️ Item ya no existe en backend (404), considerando exitoso:', itemId);
                return true; // Retornar true para que se elimine de la cola
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }

        console.log('✅ Item eliminado del backend:', itemId);
        return true;

    } catch (error) {
        console.warn('⚠️ Error eliminando item:', error.message);
        return false;
    }
};

/**
 * Sincronizar eliminación de item en background
 */
export const syncRemoveItem = async (itemId) => {
    if (!isAuthenticated()) {
        console.log('✋ Usuario no autenticado, no se sincroniza eliminación');
        return false;
    }

    console.log('🔄 Sincronizando eliminación en background...');

    const success = await syncRemoveItemInternal(itemId);
    
    if (!success) {
        await addToSyncQueue({
            type: 'remove',
            data: { itemId }
        });
        console.log('📋 Eliminación en cola');
    }
    
    return success;
};

/**
 * Exportar función para procesar cola manualmente
 * Útil para llamar cuando la app regresa de background o recupera conexión
 */
export const triggerSync = async () => {
    if (isAuthenticated()) {
        console.log('🔄 Procesando cola de sincronización manualmente...');
        await processSyncQueue();
    }
};