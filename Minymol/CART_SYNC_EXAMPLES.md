# 📘 Ejemplos de Uso - Sistema de Sincronización del Carrito

## 🎯 Para Desarrolladores

Este documento muestra cómo usar el sistema de sincronización del carrito en diferentes escenarios.

---

## 1️⃣ Uso Básico en Componentes

### Importar el Hook

```javascript
import { useCart } from '../contexts/CartContext';
```

### Obtener Datos y Funciones

```javascript
function MyComponent() {
  const {
    cartItems,        // Array de items
    loading,          // Boolean: cargando inicial
    syncInProgress,   // Boolean: sincronizando en background
    user,            // Usuario de Firebase (null si no autenticado)
    addToCart,       // Función para agregar
    updateQuantity,  // Función para actualizar cantidad
    toggleItemCheck, // Función para seleccionar/deseleccionar
    removeItem,      // Función para eliminar
    getTotalItems,   // Función para obtener total de items
    getTotalPrice,   // Función para obtener precio total
    getGroupedItems  // Función para agrupar por proveedor
  } = useCart();

  // Tu código aquí...
}
```

---

## 2️⃣ Agregar Producto al Carrito

```javascript
const handleAddToCart = async () => {
  const product = {
    productId: '123',
    productNameSnapshot: 'Camiseta Roja',
    imageUrlSnapshot: 'https://...',
    providerNameSnapshot: 'Mi Tienda',
    precio: 50000,
    cantidad: 2,
    quantity: 2,
    color: 'Rojo',
    talla: 'M'
  };

  const success = await addToCart(product);
  
  if (success) {
    console.log('✅ Producto agregado');
    // Si el usuario está autenticado, se sincroniza automáticamente en background
  } else {
    console.log('❌ Error al agregar');
  }
};
```

**Resultado:**
- ⚡ Se guarda inmediatamente en AsyncStorage
- 👁️ UI se actualiza al instante
- 🔄 Si está autenticado: sincroniza en background
- 📋 Si falla sync: se agrega a cola de reintentos

---

## 3️⃣ Actualizar Cantidad

```javascript
const handleUpdateQuantity = async (itemId, newQuantity) => {
  const success = await updateQuantity(itemId, newQuantity);
  
  if (success) {
    console.log('✅ Cantidad actualizada a:', newQuantity);
  }
};

// Ejemplo de uso con selector
<select 
  value={item.cantidad}
  onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
>
  <option value={1}>1</option>
  <option value={2}>2</option>
  <option value={3}>3</option>
</select>
```

---

## 4️⃣ Seleccionar/Deseleccionar Items

```javascript
const handleToggleCheck = async (itemId) => {
  const success = await toggleItemCheck(itemId);
  
  if (success) {
    console.log('✅ Selección actualizada');
  }
};

// Ejemplo de uso con checkbox
<input
  type="checkbox"
  checked={item.isChecked}
  onChange={() => handleToggleCheck(item.id)}
/>
```

---

## 5️⃣ Eliminar Item

```javascript
const handleRemoveItem = async (itemId) => {
  // Mostrar confirmación
  Alert.alert(
    'Eliminar producto',
    '¿Estás seguro?',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const success = await removeItem(itemId);
          if (success) {
            console.log('✅ Item eliminado');
          }
        }
      }
    ]
  );
};

// Ejemplo de uso con botón
<TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
  <MaterialIcons name="delete" size={24} color="red" />
</TouchableOpacity>
```

---

## 6️⃣ Mostrar Total de Items

```javascript
function CartBadge() {
  const { getTotalItems } = useCart();
  const totalItems = getTotalItems();

  return (
    <View style={styles.badge}>
      <Text>{totalItems}</Text>
    </View>
  );
}
```

---

## 7️⃣ Calcular Precio Total

```javascript
function CartTotal() {
  const { getTotalPrice } = useCart();
  const total = getTotalPrice();

  return (
    <Text>
      Total: ${total.toLocaleString('es-CO')}
    </Text>
  );
}
```

---

## 8️⃣ Agrupar Items por Proveedor

```javascript
function CartByProvider() {
  const { getGroupedItems } = useCart();
  const groupedItems = getGroupedItems();

  return (
    <View>
      {Object.entries(groupedItems).map(([providerName, items]) => (
        <View key={providerName}>
          <Text>{providerName}</Text>
          {items.map(item => (
            <View key={item.id}>
              <Text>{item.productNameSnapshot}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
```

---

## 9️⃣ Indicador de Sincronización

```javascript
function SyncIndicator() {
  const { syncInProgress, user } = useCart();

  if (!syncInProgress || !user) return null;

  return (
    <View style={styles.syncIndicator}>
      <ActivityIndicator size="small" color="#fa7e17" />
      <Text>Sincronizando...</Text>
    </View>
  );
}
```

---

## 🔟 Banner de Usuario No Autenticado

```javascript
function OfflineBanner() {
  const { user, cartItems } = useCart();

  if (user || cartItems.length === 0) return null;

  return (
    <View style={styles.banner}>
      <MaterialIcons name="cloud-off" size={20} color="#ff9800" />
      <Text>Inicia sesión para sincronizar tu carrito</Text>
    </View>
  );
}
```

---

## 1️⃣1️⃣ Loading State

```javascript
function CartScreen() {
  const { loading, cartItems } = useCart();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#fa7e17" />
        <Text>Cargando carrito...</Text>
      </View>
    );
  }

  if (cartItems.length === 0) {
    return <EmptyCart />;
  }

  return <CartList items={cartItems} />;
}
```

---

## 🔧 Debugging en Desarrollo

### Ver Estado del Carrito

```javascript
// Desde la consola del navegador/terminal
debugCart.local()
```

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 CARRITO LOCAL (AsyncStorage)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total de items: 3

1. Camiseta Roja
   ID: 123-Rojo-M-1234567890
   Cantidad: 2
   Precio: $50000
   Seleccionado: ✅
   Creado: 1/15/2025, 10:30:00 AM
...
```

### Ver Cola de Sincronización

```javascript
debugCart.queue()
```

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 COLA DE SINCRONIZACIÓN DEL CARRITO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total de operaciones pendientes: 2

1. ADD
   Timestamp: 1/15/2025, 10:31:00 AM
   Reintentos: 1
   Datos: { productId: '456', ... }

2. UPDATE_QUANTITY
   Timestamp: 1/15/2025, 10:32:00 AM
   Reintentos: 0
   Datos: { itemId: '123', quantity: 3 }
```

### Exportar Todo para Análisis

```javascript
debugCart.export()
```

### Limpiar Datos (Solo en Desarrollo)

```javascript
// ⚠️ Cuidado: Esto elimina todos los datos

// Limpiar solo la cola
debugCart.clearQueue()

// Limpiar todo el carrito
debugCart.clearLocal()
```

---

## 🎨 Estilos Recomendados

### Indicador de Sincronización

```javascript
syncIndicator: {
  position: 'absolute',
  top: 10,
  right: 16,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(250, 126, 23, 0.1)',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 20,
  zIndex: 1000,
},
syncText: {
  fontSize: 12,
  fontFamily: 'Ubuntu-Medium',
  color: '#fa7e17',
  marginLeft: 6,
}
```

### Banner de Offline

```javascript
offlineInfo: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff8e1',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#ffe082',
  marginTop: 12,
},
offlineText: {
  fontSize: 13,
  fontFamily: 'Ubuntu-Medium',
  color: '#f57c00',
  marginLeft: 6,
  flex: 1,
}
```

---

## 🔐 Manejo de Autenticación

### Escuchar Cambios de Autenticación

```javascript
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      console.log('👤 Usuario autenticado:', firebaseUser.uid);
      // El CartContext automáticamente sincroniza
    } else {
      console.log('👤 Usuario no autenticado');
      // El carrito sigue funcionando en modo local
    }
  });

  return () => unsubscribe();
}, []);
```

---

## 📊 Ejemplo Completo: Pantalla de Carrito

```javascript
import { useCart } from '../contexts/CartContext';
import { MaterialIcons } from '@expo/vector-icons';

function CartScreen({ navigation }) {
  const {
    cartItems,
    loading,
    syncInProgress,
    user,
    updateQuantity,
    toggleItemCheck,
    removeItem,
    getGroupedItems,
    getTotalPrice
  } = useCart();

  const groupedItems = getGroupedItems();
  const total = getTotalPrice();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#fa7e17" />
        <Text>Cargando carrito...</Text>
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialIcons name="shopping-cart" size={100} color="#ccc" />
        <Text style={styles.emptyText}>Tu carrito está vacío</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text>Explorar productos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Indicador de sincronización */}
      {syncInProgress && user && (
        <View style={styles.syncIndicator}>
          <ActivityIndicator size="small" color="#fa7e17" />
          <Text style={styles.syncText}>Sincronizando...</Text>
        </View>
      )}

      <ScrollView>
        {/* Banner si no está autenticado */}
        {!user && (
          <View style={styles.offlineBanner}>
            <MaterialIcons name="cloud-off" size={20} color="#ff9800" />
            <Text style={styles.offlineText}>
              Inicia sesión para sincronizar tu carrito
            </Text>
          </View>
        )}

        {/* Items agrupados por proveedor */}
        {Object.entries(groupedItems).map(([providerName, items]) => (
          <View key={providerName} style={styles.providerGroup}>
            <Text style={styles.providerName}>{providerName}</Text>
            
            {items.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <input
                  type="checkbox"
                  checked={item.isChecked}
                  onChange={() => toggleItemCheck(item.id)}
                />
                
                <Image source={{ uri: item.imageUrlSnapshot }} />
                
                <View style={styles.info}>
                  <Text>{item.productNameSnapshot}</Text>
                  <Text>${item.precio}</Text>
                </View>

                <select
                  value={item.cantidad}
                  onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>

                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <MaterialIcons name="delete" size={24} color="red" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Footer con total */}
      <View style={styles.footer}>
        <Text style={styles.total}>
          Total: ${total.toLocaleString('es-CO')}
        </Text>
        <TouchableOpacity style={styles.checkoutButton}>
          <Text>Solicitar pedido</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

---

## 🚨 Errores Comunes y Soluciones

### Error: "useCart debe ser usado dentro de CartProvider"

**Solución:** Asegúrate de que tu componente esté envuelto en `<CartProvider>`:

```javascript
// App.js
<CartProvider>
  <MyComponent />
</CartProvider>
```

### Error: Los cambios no se guardan

**Debug:**
```javascript
// Ver si se está guardando localmente
debugCart.local()

// Ver si hay errores en la cola
debugCart.queue()
```

### Error: No sincroniza con backend

**Verificar:**
1. Usuario está autenticado: `debugCart.export()` → ver `user`
2. Token válido en localStorage/AsyncStorage
3. Logs en consola: buscar emoji ⚠️ o ❌

---

## 💡 Tips y Mejores Prácticas

### 1. No bloquear la UI
```javascript
// ✅ Correcto (no esperar sincronización)
await addToCart(product);
showSuccessMessage();

// ❌ Incorrecto (esperar sincronización innecesariamente)
const result = await syncAddToCart(product);
if (result) showSuccessMessage();
```

### 2. Confiar en el estado local
```javascript
// ✅ Correcto
const { cartItems } = useCart();
return <Text>{cartItems.length} items</Text>;

// ❌ Incorrecto (no necesitas verificar backend)
const count = await fetchFromBackend();
return <Text>{count} items</Text>;
```

### 3. Usar indicadores visuales sutiles
```javascript
// ✅ Correcto (badge discreto)
{syncInProgress && <SyncBadge />}

// ❌ Incorrecto (modal bloqueante)
{syncInProgress && <LoadingModal />}
```

---

**🎉 ¡Listo para Usar!**

El sistema de sincronización es completamente automático. Solo usa los hooks y funciones del contexto, todo lo demás se maneja automáticamente en background.
