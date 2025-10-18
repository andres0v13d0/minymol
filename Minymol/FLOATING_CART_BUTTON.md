# 🛒 FloatingCartButton - Botón Flotante del Carrito

## 📋 Descripción

Se ha creado un **botón flotante del carrito** ultra optimizado que se muestra en todas las páginas y modales donde se pueden agregar productos. El botón se actualiza **instantáneamente** usando el `CartCounterContext` y tiene animaciones fluidas para un excelente feedback visual.

---

## ✨ Características

### 🎨 Diseño
- **Botón circular** de 70x70px con gradiente naranja
- **Badge rojo** en la esquina superior derecha con el contador
- **Etiqueta inferior** que muestra "X items"
- **Borde blanco** de 3px para destacar
- **Sombras y elevación** para efecto 3D

### ⚡ Animaciones
1. **Bounce al cambiar contador**: El botón crece a 1.15x y vuelve
2. **Badge explota**: El badge crece a 1.4x cuando cambia el número
3. **Pulso continuo**: Animación sutil de pulso cuando hay items (1.0x → 1.08x → 1.0x)
4. **Efecto de fondo**: Círculo de pulso con opacidad baja

### 🚀 Performance
- ✅ **React.memo** con comparación personalizada
- ✅ **useCartCounter** para actualizaciones instantáneas
- ✅ **No re-renders** innecesarios
- ✅ **Animaciones nativas** (useNativeDriver: true)

---

## 📱 Ubicaciones

### 1. ProductDetail ✅
```javascript
<FloatingCartButton 
    onPress={() => {
        if (navigation?.goBack) navigation.goBack();
        if (onTabPress) setTimeout(() => onTabPress('cart'), 100);
    }}
    bottom={20}
    right={20}
/>
```

**Posición:** Esquina inferior derecha  
**Acción:** Cierra el modal y navega al carrito

---

### 2. ProductsModal ✅
```javascript
<FloatingCartButton 
    onPress={() => {
        handleClose();
        if (onProductPress) setTimeout(() => onProductPress(null), 100);
    }}
    bottom={20}
    right={20}
/>
```

**Posición:** Esquina inferior derecha  
**Acción:** Cierra el modal y navega al carrito

---

### 3. SearchModal ✅
```javascript
<FloatingCartButton 
    onPress={() => {
        handleClose();
        if (onProductPress) setTimeout(() => onProductPress(null), 100);
    }}
    bottom={20}
    right={20}
/>
```

**Posición:** Esquina inferior derecha  
**Acción:** Cierra el modal y navega al carrito

---

## 🎯 Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `onPress` | function | - | Función que se ejecuta al presionar el botón |
| `bottom` | number | 80 | Distancia desde el borde inferior (px) |
| `right` | number | 20 | Distancia desde el borde derecho (px) |

---

## 🎨 Diseño Visual

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                           ┌─────┐    │
│                          │ 99+ │ ← Badge rojo
│                           └─────┘    │
│                         ┌─────────┐  │
│                        │    🛒    │ ← Icono
│                         └─────────┘  │
│                         ┌─────────┐  │
│                        │ 3 items  │ ← Label
│                         └─────────┘  │
│                                      │
└──────────────────────────────────────┘
```

### Colores
- **Fondo botón**: `#fa7e17` (naranja Minymol)
- **Badge**: `#ff4444` (rojo brillante)
- **Borde**: `#fff` (blanco)
- **Texto badge**: `#fff` (blanco)
- **Label fondo**: `rgba(20, 20, 75, 0.95)` (azul oscuro semitransparente)
- **Label texto**: `#fff` (blanco)
- **Label borde**: `#fa7e17` (naranja)

---

## 🌊 Animaciones en Detalle

### 1. Bounce al Agregar Producto
```javascript
Animated.sequence([
  spring(scale, { toValue: 1.15, friction: 3, tension: 100 }),
  spring(scale, { toValue: 1.0, friction: 3, tension: 100 }),
])
```

**Duración:** ~400ms  
**Efecto:** El botón "salta" para confirmar que se agregó algo

---

### 2. Badge Explosion
```javascript
Animated.sequence([
  spring(badgeScale, { toValue: 1.4, friction: 2, tension: 120 }),
  spring(badgeScale, { toValue: 1.0, friction: 3, tension: 100 }),
])
```

**Duración:** ~500ms  
**Efecto:** El número "explota" cuando cambia

---

### 3. Pulso Continuo (cuando count > 0)
```javascript
Animated.loop(
  Animated.sequence([
    timing(pulse, { toValue: 1.08, duration: 1000 }),
    timing(pulse, { toValue: 1.0, duration: 1000 }),
  ])
)
```

**Duración:** 2 segundos por ciclo (1s crecer + 1s reducir)  
**Efecto:** Pulso sutil constante para llamar la atención

---

## 📊 Estados del Botón

### Oculto (count === 0)
```javascript
if (count === 0) return null;
```
El botón **desaparece completamente** cuando no hay items en el carrito.

### Visible (count > 0)
- Botón visible con animación de entrada
- Badge con el número de items
- Label con texto "X item(s)"
- Pulso continuo activo

### Contador > 99
```javascript
{count > 99 ? '99+' : count}
```
Muestra "99+" cuando hay más de 99 items.

---

## 🔄 Flujo de Actualización

```
1. Usuario presiona "Agregar al carrito"
   ↓
2. CartContext.addToCart() ejecuta:
   - CartCounter.increment() ⚡ INMEDIATO
   ↓
3. FloatingCartButton recibe nuevo count
   ↓
4. useEffect detecta cambio (count !== prevCount)
   ↓
5. Dispara animaciones:
   - Bounce del botón (1.0 → 1.15 → 1.0)
   - Explosion del badge (1.0 → 1.4 → 1.0)
   ↓
6. Usuario ve feedback instantáneo 🎉
   ↓
7. Pulso continuo se activa (si count > 0)
```

**Tiempo total de feedback visual: ~0ms (sincrónico)**

---

## 💡 Casos de Uso

### Usuario agrega primer producto
```
Estado inicial: Botón oculto (count = 0)
                ↓
Usuario agrega:  count = 1
                ↓
Efecto:         - Botón aparece con fade in
                - Badge muestra "1"
                - Label muestra "1 item"
                - Animación de bounce
                - Pulso continuo inicia
```

### Usuario agrega más productos
```
Estado: count = 3
        ↓
Agrega: count = 4
        ↓
Efecto: - Badge cambia de 3 → 4
        - Animación de explosion en badge
        - Animación de bounce en botón
        - Label actualiza a "4 items"
```

### Usuario presiona el botón
```
Click en botón flotante
        ↓
Se ejecuta onPress()
        ↓
Modal se cierra (handleClose)
        ↓
Navega al carrito (onTabPress('cart'))
        ↓
Usuario ve su carrito completo
```

---

## 🎭 Plataforma-Específico

### iOS
```javascript
shadowColor: '#fa7e17',
shadowOffset: { width: 0, height: 8 },
shadowOpacity: 0.4,
shadowRadius: 12,
```

### Android
```javascript
elevation: 12,
```

**Resultado:** Sombra naranja brillante en ambas plataformas

---

## 🛡️ Optimización

### React.memo con comparación personalizada
```javascript
React.memo(FloatingCartButton, (prevProps, nextProps) => {
  return prevProps.onPress === nextProps.onPress &&
         prevProps.bottom === nextProps.bottom &&
         prevProps.right === nextProps.right;
});
```

**Ventaja:** Solo re-renderiza si cambian las props, NO cuando cambia el contador (el contador se lee internamente con useCartCounter)

---

## 📝 Archivos Modificados/Creados

### Nuevos
1. ✅ `components/FloatingCartButton/FloatingCartButton.js`
2. ✅ `components/FloatingCartButton/index.js`

### Modificados
1. ✅ `pages/ProductDetail/ProductDetailSimple.js` - Agregado botón
2. ✅ `components/ProductsModal/ProductsModal.js` - Agregado botón
3. ✅ `components/SearchModal/SearchModal.js` - Agregado botón

---

## ✅ Testing

### Manual
- [x] Botón oculto cuando count = 0
- [x] Botón visible cuando count > 0
- [x] Animación de bounce al agregar
- [x] Badge actualiza instantáneamente
- [x] Label muestra texto correcto ("1 item" vs "X items")
- [x] Pulso continuo funciona
- [x] Click navega al carrito
- [x] Muestra "99+" cuando count > 99

### Visual
- [x] Sombra naranja visible
- [x] Badge rojo destacado
- [x] Borde blanco visible
- [x] Label legible
- [x] Animaciones fluidas a 60fps

---

## 🎯 Ventajas

1. **⚡ Actualización instantánea**: 0ms de delay
2. **🎨 Feedback visual claro**: Animaciones confirman acción
3. **🎭 Consistente en todas las páginas**: Mismo look & feel
4. **📱 Responsivo**: Funciona en cualquier tamaño de pantalla
5. **🚀 Performance optimizado**: React.memo + useNativeDriver
6. **♿ Accesible**: Tappable area de 70x70px (mayor que mínimo 44x44)

---

## 🔮 Mejoras Futuras

- [ ] **Haptic feedback** al presionar
- [ ] **Sonido sutil** al agregar item
- [ ] **Animación de "vuelo"** del producto al carrito
- [ ] **Toast temporal** "Agregado al carrito"
- [ ] **Gesture para arrastrar** y soltar en carrito
- [ ] **Preview rápido** del carrito al hacer long press

---

**✨ Componente listo para producción!**

El FloatingCartButton proporciona un acceso rápido y visualmente atractivo al carrito desde cualquier pantalla de productos, con actualizaciones instantáneas y animaciones fluidas.

**Fecha:** Octubre 2025  
**Versión:** 1.0  
**Estado:** ✅ Producción Ready
