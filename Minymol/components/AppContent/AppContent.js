import { memo, startTransition, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../../contexts/CartContext';
import { useFonts } from '../../hooks/useFonts';
import Cart from '../../pages/Cart/Cart';
import Categories from '../../pages/Categories/Categories';
import Home from '../../pages/Home/Home';
import Profile from '../../pages/Profile/Profile';
import SearchModal from '../SearchModal/SearchModal';

export default function AppContent() {
  const [selectedTab, setSelectedTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fontsLoaded = useFonts();
  
  // ✅ Obtener contador visual directamente del contexto (se actualiza en tiempo real)
  const { visualCartCount } = useCart();
  const cartItemCount = visualCartCount || 0;

  // ✅ OPTIMIZADO: useCallback para evitar re-renders de componentes hijos
  const handleCategoryPress = useCallback((categorySlug) => {
    console.log('Categoría seleccionada:', categorySlug);
  }, []);

  const handleNavigate = useCallback((action, params = {}) => {
    console.log('Navegando a:', action, 'con parámetros:', params);
  }, []);

  // ✅ ULTRA OPTIMIZADO: Cambio instantáneo sin delays
  const handleTabPress = useCallback((tab) => {
    const startTime = performance.now();
    console.log('🔵 ========================================');
    console.log('🔵 TAB PRESS:', tab);
    
    // Actualización síncrona INMEDIATA
    setSelectedTab(tab);
    setCurrentScreen(tab);
    setSelectedProduct(null);
    
    // Medir tiempo en el próximo frame
    requestAnimationFrame(() => {
      const endTime = performance.now();
      console.log('⚡ TRANSICIÓN COMPLETADA en:', (endTime - startTime).toFixed(2), 'ms');
      console.log('🔵 ========================================');
    });
  }, []);

  const handleProductPress = useCallback((product) => {
    console.log('App: handleProductPress llamado (DEPRECATED - Los modales lo manejan ahora)');
  }, []);

  const handleBackToHome = useCallback(() => {
    setCurrentScreen('home');
    setSelectedProduct(null);
    setSelectedTab('home');
  }, []);

  const handleSearchPress = useCallback(() => {
    console.log('App: handleSearchPress llamado, abriendo modal');
    setShowSearchModal(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    console.log('App: handleCloseSearch llamado, cerrando modal');
    setShowSearchModal(false);
  }, []);

  // Mostrar loading mientras cargan las fuentes
  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={[styles.topSafeArea, { backgroundColor: '#14144b' }]} edges={['top']} />
        <StatusBar backgroundColor="#14144b" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa7e17" />
        </View>
        <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']} />
      </View>
    );
  }

  // ✅ MEGA OPTIMIZADO: Renderizar solo la pantalla actual + usar useMemo
  const currentScreenComponent = useMemo(() => {
    console.log('🎨 Renderizando pantalla:', currentScreen);
    const renderStart = performance.now();
    
    let component;
    switch (currentScreen) {
      case 'home':
        component = (
          <Home 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onProductPress={handleProductPress}
            onSearchPress={handleSearchPress}
            cartItemCount={cartItemCount}
            isActive={true}
          />
        );
        break;
      case 'categories':
        component = (
          <Categories 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onCategoryPress={handleCategoryPress}
            onSearchPress={handleSearchPress}
            cartItemCount={cartItemCount}
            isActive={true}
          />
        );
        break;
      case 'profile':
        component = (
          <Profile 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onNavigate={handleNavigate}
            onSearchPress={handleSearchPress}
            cartItemCount={cartItemCount}
            isActive={true}
          />
        );
        break;
      case 'cart':
        component = (
          <Cart 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onProductPress={handleProductPress}
            onSearchPress={handleSearchPress}
            cartItemCount={cartItemCount}
            isActive={true}
          />
        );
        break;
      default:
        component = null;
    }
    
    requestAnimationFrame(() => {
      const renderEnd = performance.now();
      console.log('🎨 Tiempo de render:', (renderEnd - renderStart).toFixed(2), 'ms');
    });
    
    return component;
  }, [
    currentScreen, 
    selectedTab, 
    cartItemCount,
    handleTabPress,
    handleProductPress,
    handleSearchPress,
    handleCategoryPress,
    handleNavigate
  ]);

  // Determinar el estilo del SafeArea superior
  const isWhiteArea = selectedTab === 'profile' || selectedTab === 'cart';
  const statusBarStyle = isWhiteArea ? 'dark-content' : 'light-content';
  const statusBarBackground = isWhiteArea ? '#f8fafc' : '#14144b';

  return (
    <View style={styles.container}>
      {/* SafeArea superior condicional */}
      <SafeAreaView 
        style={[
          styles.topSafeArea, 
          { backgroundColor: isWhiteArea ? '#f8fafc' : '#14144b' }
        ]} 
        edges={['top']}
      />
      
      <StatusBar backgroundColor={statusBarBackground} barStyle={statusBarStyle} />
      
      <View style={styles.content}>
        {currentScreenComponent}
      </View>
      
      {/* SafeArea inferior */}
      <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']} />
      
      {/* Modal de búsqueda */}
      <SearchModal
        visible={showSearchModal}
        onClose={handleCloseSearch}
        onProductPress={handleProductPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#14144b',
  },
  topSafeArea: {
    // El backgroundColor se define dinámicamente
  },
  content: {
    flex: 1,
  },
  bottomSafeArea: {
    backgroundColor: '#14144b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#14144b',
  },
});
