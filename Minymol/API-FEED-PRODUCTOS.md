# 🚀 API Feed de Productos - Documentación Frontend

## 📍 Endpoint Principal

```
GET https://api.minymol.com/products/feed
```

Feed de productos con **orden aleatorio determinístico** y **cursor pagination**.

---

## 🎯 Características

✅ **Orden aleatorio estable**: El mismo `seed` genera siempre el mismo orden  
✅ **Cursor pagination**: Performance constante (sin importar cuántas páginas)  
✅ **Filtros flexibles**: Categoría, subcategoría, proveedor  
✅ **Scroll infinito**: Perfecto para feeds tipo Instagram/TikTok/Temu  
✅ **Sin duplicados**: Garantizado por cursor pagination  

---

## 📥 Parámetros de Query

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `seed` | `string` | ✅ Sí* | Aleatorio | Semilla para orden aleatorio. Mismo seed = mismo orden |
| `limit` | `number` | ❌ No | `20` | Número de productos por página |
| `cursor` | `string` | ❌ No | `null` | UUID del último producto (para paginación) |
| `categorySlug` | `string` | ❌ No | - | Filtrar por slug de categoría |
| `subCategorySlug` | `string` | ❌ No | - | Filtrar por slug de subcategoría |
| `providerId` | `number` | ❌ No | - | Filtrar por ID de proveedor |

> **\*Nota:** Si no envías `seed`, el backend genera uno aleatorio automáticamente.

---

## 📤 Respuesta

```typescript
{
  data: Product[];        // Array de productos
  nextCursor: string | null;  // UUID del último producto (null si no hay más)
  hasMore: boolean;       // true si hay más productos disponibles
}
```

### Estructura de `Product`:

```typescript
{
  uuid: string;
  name: string;
  provider: string;
  stars: number;
  image: string;
  createdAt: string;
  subCategory: {
    id: number;
    name: string;
    slug: string;
  } | null;
  prices: Array<{
    amount: string;      // Formateado: "50.000"
    condition: string;   // Ej: "Desde 100 unidades"
  }>;
}
```

---

## 💡 Casos de Uso

### 🔹 1. Feed Principal (Home/Explorar)

**Primera carga:**
```javascript
// Generar seed único para la sesión
const seed = Math.random().toString(36).substring(2, 10);
localStorage.setItem('feedSeed', seed);

const response = await fetch(`/products/feed?seed=${seed}&limit=20`);
const { data, nextCursor, hasMore } = await response.json();

// Mostrar productos
setProducts(data);
setNextCursor(nextCursor);
```

**Scroll infinito (siguiente página):**
```javascript
const seed = localStorage.getItem('feedSeed');
const cursor = nextCursor; // Del estado anterior

const response = await fetch(
  `/products/feed?seed=${seed}&limit=20&cursor=${cursor}`
);
const { data, nextCursor: newCursor, hasMore } = await response.json();

// Agregar productos al feed
setProducts(prev => [...prev, ...data]);
setNextCursor(newCursor);
```

---

### 🔹 2. Feed por Categoría

```javascript
const seed = Math.random().toString(36).substring(2, 10);

const response = await fetch(
  `/products/feed?seed=${seed}&limit=20&categorySlug=ropa`
);
```

---

### 🔹 3. Feed por Subcategoría

```javascript
const response = await fetch(
  `/products/feed?seed=${seed}&limit=20&subCategorySlug=camisetas`
);
```

---

### 🔹 4. Feed por Proveedor

```javascript
const response = await fetch(
  `/products/feed?seed=${seed}&limit=20&providerId=5`
);
```

---

### 🔹 5. Filtros Combinados

```javascript
const response = await fetch(
  `/products/feed?seed=${seed}&limit=20&categorySlug=ropa&providerId=5&cursor=${cursor}`
);
```

---

## 🔄 Flujo Completo de Scroll Infinito

```javascript
import { useState, useEffect } from 'react';

function ProductFeed() {
  const [products, setProducts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [seed] = useState(() => 
    Math.random().toString(36).substring(2, 10)
  );

  // Primera carga
  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts(cursor = null) {
    if (loading) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        seed,
        limit: '20',
      });

      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await fetch(`/products/feed?${params}`);
      const { data, nextCursor: newCursor, hasMore: more } = await response.json();

      setProducts(prev => cursor ? [...prev, ...data] : data);
      setNextCursor(newCursor);
      setHasMore(more);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    if (hasMore && nextCursor && !loading) {
      loadProducts(nextCursor);
    }
  }

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.uuid} product={product} />
      ))}
      
      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Cargando...' : 'Cargar más'}
        </button>
      )}
      
      {!hasMore && <p>No hay más productos</p>}
    </div>
  );
}
```

---

## 🎨 Refresh del Feed (Nuevo Orden)

Para mostrar productos en **orden diferente** (simular "refresh"):

```javascript
function refreshFeed() {
  // Generar nuevo seed = nuevo orden
  const newSeed = Math.random().toString(36).substring(2, 10);
  localStorage.setItem('feedSeed', newSeed);
  
  // Cargar desde cero
  loadProducts(null, newSeed);
}
```

---

## 📊 Ejemplos de URLs

```bash
# Feed principal
GET /products/feed?seed=abc123xyz&limit=20

# Segunda página
GET /products/feed?seed=abc123xyz&limit=20&cursor=550e8400-e29b-41d4-a716-446655440000

# Por categoría
GET /products/feed?seed=abc123xyz&limit=20&categorySlug=ropa

# Por subcategoría
GET /products/feed?seed=abc123xyz&limit=20&subCategorySlug=camisetas

# Por proveedor
GET /products/feed?seed=abc123xyz&limit=20&providerId=5

# Combinado
GET /products/feed?seed=abc123xyz&limit=20&categorySlug=ropa&providerId=5

# Con paginación y filtros
GET /products/feed?seed=abc123xyz&limit=20&cursor=550e8400-e29b-41d4-a716-446655440000&categorySlug=ropa
```

---

## ⚡ Mejores Prácticas

### ✅ **DO (Hacer)**

1. **Guardar el seed** durante toda la sesión del usuario
   ```javascript
   const seed = localStorage.getItem('feedSeed') || 
                Math.random().toString(36).substring(2, 10);
   localStorage.setItem('feedSeed', seed);
   ```

2. **Usar el mismo seed** para todas las páginas del mismo feed
   ```javascript
   // ❌ MAL - Genera nuevo seed cada vez
   fetch(`/products/feed?seed=${Math.random()}`);
   
   // ✅ BIEN - Reutiliza el seed de la sesión
   fetch(`/products/feed?seed=${savedSeed}&cursor=${cursor}`);
   ```

3. **Verificar `hasMore` antes de cargar más**
   ```javascript
   if (hasMore && nextCursor) {
     loadMore();
   }
   ```

4. **Cambiar el seed solo cuando quieras nuevo orden**
   - Refresh manual del usuario
   - Nueva sesión
   - Cambio de filtros (categoría, proveedor)

---

### ❌ **DON'T (No hacer)**

1. **NO** mezclar seeds diferentes en el mismo feed
   ```javascript
   // ❌ MAL - Causará duplicados y orden inconsistente
   loadPage1(seed: 'abc');
   loadPage2(seed: 'xyz');
   ```

2. **NO** usar offset en lugar de cursor
   ```javascript
   // ❌ MAL - El endpoint ya no soporta offset
   fetch(`/products/feed?offset=20`);
   
   // ✅ BIEN - Usa cursor
   fetch(`/products/feed?cursor=${lastProductId}`);
   ```

3. **NO** ignorar `nextCursor` y calcular manualmente
   ```javascript
   // ❌ MAL
   const cursor = products[products.length - 1].uuid;
   
   // ✅ BIEN - Usa el nextCursor de la respuesta
   const { nextCursor } = await response.json();
   ```

---

## 🔍 Comparación: Antes vs Ahora

| Aspecto | Antes (`/random-previews`) | Ahora (`/feed`) |
|---------|---------------------------|-----------------|
| **Paginación** | Offset (`?offset=20`) | Cursor (`?cursor=uuid`) |
| **Performance** | Degrada con páginas grandes | Constante ⚡ |
| **Seed** | Opcional (timestamp) | Requerido (string) |
| **Filtros** | ❌ No soporta | ✅ Categoría, subcategoría, proveedor |
| **Respuesta** | Array simple | Objeto con metadata |
| **Duplicados** | Posibles con offset | Imposibles con cursor |
| **Scroll infinito** | Complejo | Nativo ✅ |

---

## 🐛 Troubleshooting

### Problema: "Veo productos duplicados"
**Solución:** Verifica que estás usando el **mismo seed** en todas las páginas.

### Problema: "El orden cambia al paginar"
**Solución:** No estás pasando el seed correctamente. Guárdalo en el estado/localStorage.

### Problema: "No carga más productos aunque `hasMore: true`"
**Solución:** Verifica que estás pasando el `nextCursor` correctamente en la siguiente petición.

### Problema: "Quiero nuevo orden pero sigue igual"
**Solución:** Genera un **nuevo seed** diferente al anterior.

---

## 📞 Soporte

Para dudas o problemas con este endpoint, contacta al equipo de backend.

---

**Última actualización:** Octubre 2025  
**Versión API:** 1.0
