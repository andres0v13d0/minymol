// 📊 Performance Monitoring Utility
// Pega este código en App.js temporalmente para medir transiciones

import { useEffect, useRef } from 'react';

// Hook personalizado para medir performance de transiciones
export const useTransitionPerformance = (currentScreen, selectedTab) => {
  const lastScreenRef = useRef(currentScreen);
  const transitionStartRef = useRef(null);
  const metricsRef = useRef({
    transitions: [],
    averageTime: 0,
    maxTime: 0,
    minTime: Infinity
  });

  useEffect(() => {
    // Detectar cambio de pantalla
    if (lastScreenRef.current !== currentScreen) {
      // Si hay una transición en curso, medir el tiempo
      if (transitionStartRef.current) {
        const endTime = performance.now();
        const duration = endTime - transitionStartRef.current;
        
        // Guardar métrica
        metricsRef.current.transitions.push({
          from: lastScreenRef.current,
          to: currentScreen,
          duration: duration,
          timestamp: new Date().toISOString()
        });
        
        // Actualizar estadísticas
        const transitions = metricsRef.current.transitions;
        metricsRef.current.averageTime = 
          transitions.reduce((sum, t) => sum + t.duration, 0) / transitions.length;
        metricsRef.current.maxTime = 
          Math.max(metricsRef.current.maxTime, duration);
        metricsRef.current.minTime = 
          Math.min(metricsRef.current.minTime, duration);
        
        // Log con emojis según performance
        let emoji = '⚡';
        if (duration > 100) emoji = '🔴';
        else if (duration > 50) emoji = '🟡';
        
        console.log(
          `${emoji} Transición: ${lastScreenRef.current} → ${currentScreen} | ` +
          `${duration.toFixed(2)}ms | ` +
          `Promedio: ${metricsRef.current.averageTime.toFixed(2)}ms`
        );
        
        // Mostrar estadísticas cada 10 transiciones
        if (transitions.length % 10 === 0) {
          console.log('📊 ===== ESTADÍSTICAS DE PERFORMANCE =====');
          console.log(`Total transiciones: ${transitions.length}`);
          console.log(`Tiempo promedio: ${metricsRef.current.averageTime.toFixed(2)}ms`);
          console.log(`Tiempo máximo: ${metricsRef.current.maxTime.toFixed(2)}ms`);
          console.log(`Tiempo mínimo: ${metricsRef.current.minTime.toFixed(2)}ms`);
          console.log('=========================================');
        }
        
        transitionStartRef.current = null;
      }
      
      lastScreenRef.current = currentScreen;
    }
  }, [currentScreen]);

  // Método para iniciar medición (llamar en handleTabPress)
  const startTransition = () => {
    transitionStartRef.current = performance.now();
  };

  // Método para obtener estadísticas
  const getMetrics = () => metricsRef.current;

  return { startTransition, getMetrics };
};

// ===== CÓMO USAR =====

// 1. En App.js, agregar el hook:
/*
function AppContent() {
  const [selectedTab, setSelectedTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('home');
  
  // 🔥 Agregar hook de performance
  const { startTransition, getMetrics } = useTransitionPerformance(currentScreen, selectedTab);
  
  const handleTabPress = useCallback((tab) => {
    // 🔥 Iniciar medición
    startTransition();
    
    setIsTransitioning(true);
    requestAnimationFrame(() => {
      setSelectedTab(tab);
      setCurrentScreen(tab);
      setSelectedProduct(null);
      
      requestAnimationFrame(() => {
        setIsTransitioning(false);
      });
    });
  }, [startTransition]);
  
  // ... resto del código
  
  // 🔥 Para ver estadísticas en cualquier momento:
  // console.log(getMetrics());
}
*/

// 2. Ver logs en consola mientras navegas:
/*
⚡ Transición: home → categories | 45.23ms | Promedio: 45.23ms
⚡ Transición: categories → profile | 38.67ms | Promedio: 41.95ms
🟡 Transición: profile → cart | 87.34ms | Promedio: 57.08ms
⚡ Transición: cart → home | 42.11ms | Promedio: 53.34ms

📊 ===== ESTADÍSTICAS DE PERFORMANCE =====
Total transiciones: 10
Tiempo promedio: 51.23ms
Tiempo máximo: 87.34ms
Tiempo mínimo: 38.67ms
=========================================
*/

// 3. Objetivos de performance:
/*
⚡ Excelente:  <50ms  (Verde)
🟡 Aceptable:  50-100ms (Amarillo)
🔴 Mejorable:  >100ms (Rojo)

Gama alta:   Todas ⚡
Gama media:  Mayoría ⚡, algunas 🟡
Gama baja:   Mayoría 🟡, evitar 🔴
*/

// 4. Si ves muchos 🔴 o 🟡, considera:
/*
- Reducir productos iniciales (8 → 6 → 4)
- Deshabilitar pre-carga en gama baja
- Lazy load más componentes
- Usar más InteractionManager
- Memoizar más callbacks
*/

// ===== ANÁLISIS AVANZADO =====

// Función para detectar tipo de dispositivo
export const detectDeviceTier = () => {
  // Heurística simple basada en hardware.concurrency y deviceMemory
  const cores = navigator.hardwareConcurrency || 2;
  const ram = navigator.deviceMemory || 2; // GB
  
  if (cores >= 6 && ram >= 6) {
    return { tier: 'high', name: 'Gama Alta', emoji: '🚀' };
  } else if (cores >= 4 && ram >= 4) {
    return { tier: 'mid', name: 'Gama Media', emoji: '⚙️' };
  } else {
    return { tier: 'low', name: 'Gama Baja', emoji: '🐌' };
  }
};

// Función para ajustar configuración según dispositivo
export const getOptimizedConfig = () => {
  const device = detectDeviceTier();
  
  const configs = {
    high: {
      initialProducts: 12,
      batchSize: 16,
      enablePreload: true,
      animationDuration: 300,
      lazyLoadDelay: 0
    },
    mid: {
      initialProducts: 8,
      batchSize: 12,
      enablePreload: true,
      animationDuration: 200,
      lazyLoadDelay: 100
    },
    low: {
      initialProducts: 6,
      batchSize: 8,
      enablePreload: false,
      animationDuration: 150,
      lazyLoadDelay: 200
    }
  };
  
  const config = configs[device.tier];
  console.log(`${device.emoji} Dispositivo detectado: ${device.name}`);
  console.log('📊 Configuración optimizada:', config);
  
  return config;
};

// ===== USO DE CONFIGURACIÓN ADAPTATIVA =====
/*
// En CategorySliderHomeOptimized.js
import { getOptimizedConfig } from './utils/performanceMonitor';

const CategorySliderHome = ({ ... }) => {
  const config = useMemo(() => getOptimizedConfig(), []);
  
  // Usar config en lugar de valores hardcodeados
  const initialCount = config.initialProducts;
  const batchSize = config.batchSize;
  
  // Condicional de pre-carga
  if (config.enablePreload && isActive) {
    preloadAdjacentCategories();
  }
  
  // ...
};
*/

// ===== MONITOR EN TIEMPO REAL =====

// Componente visual para mostrar performance en desarrollo
export const PerformanceOverlay = ({ metrics }) => {
  if (!__DEV__) return null;
  
  const lastTransition = metrics.transitions[metrics.transitions.length - 1];
  if (!lastTransition) return null;
  
  const getColor = (duration) => {
    if (duration < 50) return '#00ff00';
    if (duration < 100) return '#ffff00';
    return '#ff0000';
  };
  
  return (
    <View style={{
      position: 'absolute',
      top: 50,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 10,
      borderRadius: 5,
      zIndex: 9999
    }}>
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
        PERFORMANCE MONITOR
      </Text>
      <Text style={{ color: getColor(lastTransition.duration), fontSize: 12 }}>
        Last: {lastTransition.duration.toFixed(0)}ms
      </Text>
      <Text style={{ color: '#fff', fontSize: 10 }}>
        Avg: {metrics.averageTime.toFixed(0)}ms
      </Text>
      <Text style={{ color: '#fff', fontSize: 10 }}>
        Max: {metrics.maxTime.toFixed(0)}ms
      </Text>
    </View>
  );
};

/*
// Usar en App.js:
import { PerformanceOverlay } from './utils/performanceMonitor';

function AppContent() {
  const { startTransition, getMetrics } = useTransitionPerformance(...);
  const [metrics, setMetrics] = useState(getMetrics());
  
  // Actualizar métricas cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getMetrics());
    }, 1000);
    return () => clearInterval(interval);
  }, [getMetrics]);
  
  return (
    <>
      {renderAllScreens()}
      <PerformanceOverlay metrics={metrics} />
    </>
  );
}
*/

export default {
  useTransitionPerformance,
  detectDeviceTier,
  getOptimizedConfig,
  PerformanceOverlay
};
