# 🧪 Guía de Testing - Optimizaciones de Rendimiento

## 📱 Pruebas Necesarias

### 1. Testing en Dispositivos Reales

#### Gama Alta (Recomendado)
- **iPhone 12+** o **Samsung S21+**
- **4GB+ RAM**
- Debería sentirse instantáneo (<100ms)

#### Gama Media (OBJETIVO PRINCIPAL) ⭐
- **iPhone 8-11** o **Samsung A50-A70**
- **2-4GB RAM**
- **OBJETIVO: <200ms** (antes 500-1000ms)

#### Gama Baja
- **Dispositivos con 1-2GB RAM**
- **OBJETIVO: <400ms** (antes 1000-1500ms)

---

## ⏱️ Cómo Medir el Rendimiento

### Opción 1: Console Logs (Ya implementados)

Los logs ya están en el código. Solo abre la consola de desarrollo:

```powershell
npx expo start
# Luego presiona 'j' para abrir debugger
```

**Busca en console:**
```
⏱️ Home activation time: XXXms
🎬 Inicializando animaciones...
⚡ Pre-cargando categoría siguiente: X
✅ Categoría X inicializada con Y productos totales, mostrando primeros 6
```

---

### Opción 2: Agregar Medición Manual (Opcional)

Si quieres medir más específicamente, agrega esto en `CategorySliderHomeOptimized.js`:

```javascript
// Al inicio del componente
useEffect(() => {
  if (isActive) {
    const startTime = performance.now();
    
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const activationTime = endTime - startTime;
      
      console.log(`⏱️ HOME ACTIVATION TIME: ${activationTime.toFixed(2)}ms`);
      
      // Clasificar el rendimiento
      if (activationTime < 100) {
        console.log('✅ EXCELENTE - Gama Alta');
      } else if (activationTime < 200) {
        console.log('✅ BUENO - Gama Media (OBJETIVO CUMPLIDO)');
      } else if (activationTime < 400) {
        console.log('🟡 ACEPTABLE - Gama Baja');
      } else {
        console.log('🔴 LENTO - Necesita más optimización');
      }
    });
  }
}, [isActive]);
```

---

## 🔍 Qué Probar

### Test 1: Cambio de Tab (Crítico) ⭐⭐⭐

**Pasos:**
1. Abrir app en Home
2. Cambiar a "Categorías" (tab central)
3. **MEDIR:** ¿Cuánto tarda en mostrarse?
4. Volver a Home
5. **MEDIR:** ¿Cuánto tarda en activarse?

**Resultado esperado:**
- ✅ Gama media: <200ms
- ✅ Transición suave, sin parpadeos
- ✅ Estado preservado (scroll position intacto)

---

### Test 2: Carga Inicial

**Pasos:**
1. Cerrar app completamente
2. Abrir app
3. **MEDIR:** Tiempo hasta ver productos

**Resultado esperado:**
- ✅ Ver skeleton o productos en <600ms (gama media)
- ✅ Primeros 6 productos visibles rápido
- ✅ Resto se carga progresivamente

---

### Test 3: Scroll Infinito

**Pasos:**
1. Estar en Home → categoría "Todos"
2. Hacer scroll hacia abajo
3. **OBSERVAR:** ¿Se cargan productos suavemente?
4. **VERIFICAR:** Lotes de 6-10 productos (no 8-16)

**Resultado esperado:**
- ✅ Carga suave sin bloqueos
- ✅ Lotes más pequeños
- ✅ No hay "saltos" en el scroll

---

### Test 4: Lazy Loading

**Pasos:**
1. Abrir app
2. **OBSERVAR:** Reels y AutoCarousel
3. Verificar en console que se cargan diferido

**Resultado esperado:**
```
🎬 Inicializando animaciones...
📦 Cargando Reels...
📦 Cargando AutoCarousel...
```

---

### Test 5: Navegación Rápida (Stress Test)

**Pasos:**
1. Cambiar tabs rápidamente: Home → Categories → Profile → Home
2. Repetir 5 veces seguidas
3. **OBSERVAR:** ¿Hay lag? ¿Se congela?

**Resultado esperado:**
- ✅ Transiciones fluidas
- ✅ No congelamiento
- ✅ Estado preservado en cada tab

---

## 📊 Métricas a Registrar

Crea una tabla con tus resultados:

| Dispositivo | RAM | Test 1 (Tab) | Test 2 (Inicial) | Test 3 (Scroll) | Test 5 (Stress) |
|-------------|-----|--------------|------------------|-----------------|-----------------|
| iPhone 12   | 4GB | ___ms | ___ms | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Galaxy A50  | 3GB | ___ms | ___ms | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Redmi 9A    | 2GB | ___ms | ___ms | ⭐⭐⭐ | ⭐⭐⭐ |

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: "Aún hay delay de 300-400ms en gama media"

**Posibles causas:**
1. Muchas imágenes grandes sin optimizar
2. Context re-renderizando todo
3. Animaciones bloqueando el thread

**Soluciones:**
```javascript
// Opción A: Reducir aún más productos iniciales
const initialCount = 4; // En lugar de 6

// Opción B: Desactivar removeClippedSubviews temporalmente
removeClippedSubviews={Platform.OS === 'android'} // Solo Android

// Opción C: Aumentar delays
setTimeout(() => { /* carga */ }, 150); // En lugar de 100ms
```

---

### Problema 2: "Lazy loading no funciona"

**Verificar:**
```javascript
// 1. Imports correctos
import { lazy, Suspense } from 'react';

// 2. Componentes envueltos en Suspense
<Suspense fallback={<ActivityIndicator />}>
  <Reels />
</Suspense>

// 3. Condición isActive
{isActive && <Suspense>...</Suspense>}
```

---

### Problema 3: "FlatList salta o se ve raro"

**Ajustar:**
```javascript
<FlatList
  removeClippedSubviews={false} // ✅ Desactivar temporalmente
  windowSize={3} // ✅ Aumentar a 3 de nuevo
/>
```

---

### Problema 4: "Productos no se cargan en scroll"

**Verificar threshold:**
```javascript
// Probar con threshold más alto
const preloadThreshold = 50; // En lugar de 60
```

---

## 🎯 Criterios de Éxito

### ✅ Optimización EXITOSA si:

1. **Gama Media:**
   - [ ] Cambio de tab: <200ms ⚡⚡⚡⚡
   - [ ] Carga inicial: <600ms
   - [ ] Scroll fluido sin bloqueos
   - [ ] Estado preservado

2. **Gama Baja:**
   - [ ] Cambio de tab: <400ms ⚡⚡⚡
   - [ ] Carga inicial: <1000ms
   - [ ] Scroll aceptable
   - [ ] Sin crashes

3. **General:**
   - [ ] Sin cambios visuales (diseño idéntico)
   - [ ] Sin pérdida de funcionalidad
   - [ ] Console logs sin errores
   - [ ] Cache funcionando

---

## 🛠️ Herramientas de Profiling

### React DevTools Profiler

```powershell
# Instalar React DevTools
npm install -g react-devtools

# Ejecutar
react-devtools
```

**Buscar:**
- Componentes que se re-renderizan mucho
- Tiempo de render de CategorySliderHome
- Flamegraph para identificar cuellos de botella

---

### Flipper (Performance Monitor)

```powershell
# Abrir Flipper y conectar dispositivo
# Ver métricas de:
# - CPU Usage
# - Memory Usage
# - FPS
```

**Objetivo:**
- CPU: <30% en idle
- RAM: <100MB para Home
- FPS: 60fps durante scroll

---

## 📝 Checklist de Validación

Antes de considerar las optimizaciones completas:

- [ ] Probado en al menos 1 dispositivo de gama media
- [ ] Probado en al menos 1 dispositivo de gama baja
- [ ] Test de cambio de tabs repetido 10 veces
- [ ] Test de scroll hasta el final (100+ productos)
- [ ] Test de navegación rápida (stress test)
- [ ] Verificado lazy loading en console
- [ ] Verificado que solo 6 productos iniciales se cargan
- [ ] Verificado que lotes son de 6-10 (no 8-16)
- [ ] Verificado que FlatList usa removeClippedSubviews
- [ ] Sin errores en console
- [ ] Sin crashes durante 5 minutos de uso

---

## 📊 Plantilla de Reporte

Después de probar, completa este reporte:

```markdown
## Reporte de Testing - Optimizaciones

**Fecha:** _______________
**Dispositivo:** _______________
**RAM:** _______________
**Android/iOS:** _______________

### Métricas
- Cambio de tab Home→Categories: ___ms
- Cambio de tab Categories→Home: ___ms
- Carga inicial: ___ms
- FPS durante scroll: ___fps

### Observaciones
- Lazy loading funciona: [ ] SÍ [ ] NO
- Lotes pequeños: [ ] SÍ [ ] NO
- Transiciones suaves: [ ] SÍ [ ] NO
- Estado preservado: [ ] SÍ [ ] NO

### Problemas encontrados:
1. _______________
2. _______________

### Conclusión:
[ ] ✅ Optimización exitosa
[ ] 🟡 Necesita ajustes menores
[ ] 🔴 Necesita más trabajo
```

---

## 🚀 Próximos Pasos

1. **Si pasa todos los tests:** ✅ Listo para producción
2. **Si hay issues menores:** 🟡 Aplicar ajustes del apartado "Problemas Comunes"
3. **Si aún es lento:** 🔴 Implementar "Optimizaciones Futuras" del otro documento

---

## 💡 Tips Finales

- **Probar en WiFi Y datos móviles** (la red afecta carga de imágenes)
- **Probar con cache vacío** (primera carga)
- **Probar después de 5 min de uso** (cache poblado)
- **Comparar con versión anterior** (para ver mejora real)
- **Grabar video** para análisis frame-by-frame

---

✅ **Lista para empezar el testing**

Cualquier duda, revisa los documentos:
- `ANALISIS_UNMOUNT_ON_BLUR.md` - Arquitectura
- `OPTIMIZACIONES_GAMA_BAJA_FINALES.md` - Detalles técnicos
- `RESUMEN_OPTIMIZACIONES_FINALES.md` - Resumen ejecutivo
