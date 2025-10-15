import { memo, useEffect } from 'react';
import CategorySliderHomeOptimized from './CategorySliderHomeOptimized';

const Home = ({ onProductPress, selectedTab = 'home', onTabPress, onSearchPress, isActive = true }) => {
  // 🔍 DEBUG: Medir cuándo se activa/desactiva Home
  useEffect(() => {
    const timestamp = performance.now();
    console.log(`🏠 HOME isActive cambió a: ${isActive} - Time: ${timestamp.toFixed(2)}ms`);
    
    if (isActive) {
      const activationStart = performance.now();
      console.log('🟢 HOME ACTIVÁNDOSE...');
      
      requestAnimationFrame(() => {
        const activationEnd = performance.now();
        console.log('🟢 HOME ACTIVADO en:', (activationEnd - activationStart).toFixed(2), 'ms');
      });
    } else {
      console.log('🔴 HOME DESACTIVÁNDOSE...');
    }
  }, [isActive]);

  return (
    <CategorySliderHomeOptimized 
      onProductPress={onProductPress}
      selectedTab={selectedTab}
      onTabPress={onTabPress}
      onSearchPress={onSearchPress}
      isActive={isActive}
    />
  );
};

// ✅ MEGA OPTIMIZADO: React.memo con comparación personalizada
// Solo re-renderizar si isActive cambia o si las props críticas cambian
const HomeOptimized = memo(Home, (prevProps, nextProps) => {
  // Si se desactiva, NO re-renderizar (ya está oculto)
  if (!nextProps.isActive && !prevProps.isActive) {
    return true; // Son iguales, no re-renderizar
  }
  
  // Si cambia isActive, sí re-renderizar
  if (prevProps.isActive !== nextProps.isActive) {
    return false; // Son diferentes, re-renderizar
  }
  
  // Si está activo, verificar props críticas
  return (
    prevProps.selectedTab === nextProps.selectedTab &&
    prevProps.onProductPress === nextProps.onProductPress &&
    prevProps.onTabPress === nextProps.onTabPress &&
    prevProps.onSearchPress === nextProps.onSearchPress
  );
});

export default HomeOptimized;

