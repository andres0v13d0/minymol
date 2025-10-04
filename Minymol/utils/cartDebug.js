import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utilidades de debugging para el sistema de sincronización del carrito
 * Solo usar en desarrollo para diagnosticar problemas
 */

const SYNC_QUEUE_KEY = 'cart_sync_queue';

/**
 * Ver el estado actual de la cola de sincronización
 */
export const debugSyncQueue = async () => {
    try {
        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const queue = queueStr ? JSON.parse(queueStr) : [];

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 COLA DE SINCRONIZACIÓN DEL CARRITO');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Total de operaciones pendientes: ${queue.length}`);

        if (queue.length === 0) {
            console.log('✅ Cola vacía - Todo sincronizado');
        } else {
            queue.forEach((op, index) => {
                console.log(`\n${index + 1}. ${op.type.toUpperCase()}`);
                console.log(`   Timestamp: ${new Date(op.timestamp).toLocaleString()}`);
                console.log(`   Reintentos: ${op.retries}`);
                console.log(`   Datos:`, op.data);
            });
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return queue;
    } catch (error) {
        console.error('❌ Error leyendo cola de sincronización:', error);
        return [];
    }
};

/**
 * Limpiar completamente la cola de sincronización
 * ⚠️ USAR CON PRECAUCIÓN: Las operaciones pendientes se perderán
 */
export const clearSyncQueue = async () => {
    try {
        await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
        console.log('🗑️ Cola de sincronización limpiada');
        return true;
    } catch (error) {
        console.error('❌ Error limpiando cola:', error);
        return false;
    }
};

/**
 * Ver el carrito local almacenado en AsyncStorage
 */
export const debugLocalCart = async () => {
    try {
        const cartStr = await AsyncStorage.getItem('cart');
        const cart = cartStr ? JSON.parse(cartStr) : [];

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🛒 CARRITO LOCAL (AsyncStorage)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Total de items: ${cart.length}`);

        if (cart.length === 0) {
            console.log('🛒 Carrito vacío');
        } else {
            cart.forEach((item, index) => {
                console.log(`\n${index + 1}. ${item.productNameSnapshot || 'Sin nombre'}`);
                console.log(`   ID: ${item.id}`);
                console.log(`   Cantidad: ${item.cantidad || item.quantity}`);
                console.log(`   Precio: $${item.precio}`);
                console.log(`   Seleccionado: ${item.isChecked ? '✅' : '❌'}`);
                console.log(`   Creado: ${new Date(item.createdAt).toLocaleString()}`);
            });
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return cart;
    } catch (error) {
        console.error('❌ Error leyendo carrito local:', error);
        return [];
    }
};

/**
 * Limpiar completamente el carrito local
 * ⚠️ USAR CON PRECAUCIÓN: Todos los productos se eliminarán
 */
export const clearLocalCart = async () => {
    try {
        await AsyncStorage.removeItem('cart');
        console.log('🗑️ Carrito local limpiado');
        return true;
    } catch (error) {
        console.error('❌ Error limpiando carrito local:', error);
        return false;
    }
};

/**
 * Ver todas las claves de AsyncStorage relacionadas con el carrito
 */
export const debugAllCartKeys = async () => {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cartKeys = allKeys.filter(key =>
            key.includes('cart') || key.includes('sync')
        );

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔑 CLAVES DE ASYNCSTORAGE (Carrito)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (cartKeys.length === 0) {
            console.log('Sin claves relacionadas con el carrito');
        } else {
            for (const key of cartKeys) {
                const value = await AsyncStorage.getItem(key);
                console.log(`\n📌 ${key}`);
                try {
                    const parsed = JSON.parse(value);
                    console.log(`   Tipo: ${Array.isArray(parsed) ? 'Array' : 'Object'}`);
                    console.log(`   Tamaño: ${Array.isArray(parsed) ? parsed.length : 'N/A'} items`);
                } catch {
                    console.log(`   Valor: ${value?.substring(0, 100)}...`);
                }
            }
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return cartKeys;
    } catch (error) {
        console.error('❌ Error leyendo claves:', error);
        return [];
    }
};

/**
 * Exportar todos los datos del carrito para debugging
 */
export const exportCartDebugData = async () => {
    const data = {
        timestamp: new Date().toISOString(),
        localCart: await debugLocalCart(),
        syncQueue: await debugSyncQueue(),
        allKeys: await debugAllCartKeys()
    };

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EXPORT COMPLETO DE DEBUG');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(data, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return data;
};

// Hacer accesibles las funciones globalmente en desarrollo
if (__DEV__) {
    global.debugCart = {
        queue: debugSyncQueue,
        clearQueue: clearSyncQueue,
        local: debugLocalCart,
        clearLocal: clearLocalCart,
        keys: debugAllCartKeys,
        export: exportCartDebugData
    };

    console.log('🔧 Debug utilities loaded. Use:');
    console.log('   debugCart.queue() - Ver cola de sincronización');
    console.log('   debugCart.local() - Ver carrito local');
    console.log('   debugCart.keys() - Ver todas las claves');
    console.log('   debugCart.export() - Exportar todo');
    console.log('   debugCart.clearQueue() - Limpiar cola');
    console.log('   debugCart.clearLocal() - Limpiar carrito\n');
}

export default {
    debugSyncQueue,
    clearSyncQueue,
    debugLocalCart,
    clearLocalCart,
    debugAllCartKeys,
    exportCartDebugData
};
