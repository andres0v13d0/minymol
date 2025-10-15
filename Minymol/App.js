import { startTransition, useCallback, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import SearchModal from './components/SearchModal/SearchModal';
import { AppStateProvider } from './contexts/AppStateContext';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './hooks/useFavorites';
import { useFonts } from './hooks/useFonts';
import Cart from './pages/Cart/Cart';
import Categories from './pages/Categories/Categories';
import Home from './pages/Home/Home';
import Profile from './pages/Profile/Profile';

// Cargar utilidades de debug en desarrollo
if (__DEV__) {
  require('./utils/cartDebug');
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <CartProvider>
          <FavoritesProvider>
            <AppContent />
          </FavoritesProvider>
        </CartProvider>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [selectedTab, setSelectedTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // ✅ Flag de transición
  const fontsLoaded = useFonts();

  // ✅ OPTIMIZADO: useCallback para evitar re-renders de componentes hijos
  const handleCategoryPress = useCallback((categorySlug) => {
    console.log('Categoría seleccionada:', categorySlug);
    // Aquí podrías navegar a una página de productos de esa categoría
    // o implementar la lógica que necesites
  }, []);

  const handleNavigate = useCallback((action, params = {}) => {
    console.log('Navegando a:', action, 'con parámetros:', params);
    
    // Aquí puedes implementar la lógica de navegación según la acción
    // Por ejemplo, para login, configuración, etc.
  }, []);

  // ✅ MEGA OPTIMIZADO: Actualización instantánea del estado sin delay
  // Usando startTransition para hacer el update no-bloqueante
  const handleTabPress = useCallback((tab) => {
    const startTime = performance.now();
    console.log('🔵 ========================================');
    console.log('🔵 TAB PRESS INICIADO:', tab);
    console.log('🔵 Timestamp:', startTime.toFixed(2), 'ms');
    
    // 🚀 SOLUCIÓN: Usar startTransition para hacer el cambio no-bloqueante
    // Esto permite que React priorice la UI y procese los updates en segundo plano
    startTransition(() => {
      setSelectedTab(tab);
      setCurrentScreen(tab);
      setSelectedProduct(null);
    });
    
    // Medir cuánto tomó el setState
    requestAnimationFrame(() => {
      const afterStateTime = performance.now();
      console.log('🟢 setState INICIADO en:', (afterStateTime - startTime).toFixed(2), 'ms');
      
      // Medir cuándo termina el render completo
      requestAnimationFrame(() => {
        const endTime = performance.now();
        console.log('🟢 RENDER COMPLETO en:', (endTime - startTime).toFixed(2), 'ms');
        console.log('🔵 ========================================');
      });
    });
  }, []);

  const handleProductPress = useCallback((product) => {
    console.log('App: handleProductPress llamado (DEPRECATED - Los modales lo manejan ahora)');
    // Esta función ya no se usa, cada modal maneja su propio ProductDetail
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

  const renderAllScreens = () => {
    console.log('🎨 renderAllScreens llamado, currentScreen:', currentScreen);
    const renderStart = performance.now();
    
    // Medir tiempo de render
    requestAnimationFrame(() => {
      const renderEnd = performance.now();
      console.log('🎨 Tiempo de renderAllScreens:', (renderEnd - renderStart).toFixed(2), 'ms');
    });
    
    return (
      <>
        {/* Home Screen */}
        <View style={[
          styles.screenContainer, 
          currentScreen === 'home' ? styles.visible : styles.hidden
        ]}>
          <Home 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onSearchPress={handleSearchPress}
            isActive={currentScreen === 'home'}
          />
        </View>

        {/* Categories Screen */}
        <View style={[
          styles.screenContainer, 
          currentScreen === 'categories' ? styles.visible : styles.hidden
        ]}>
          <Categories 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onCategoryPress={handleCategoryPress}
            onSearchPress={handleSearchPress}
            isActive={currentScreen === 'categories'}
          />
        </View>

        {/* Profile Screen */}
        <View style={[
          styles.screenContainer, 
          currentScreen === 'profile' ? styles.visible : styles.hidden
        ]}>
          <Profile 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onNavigate={handleNavigate}
            onSearchPress={handleSearchPress}
            isActive={currentScreen === 'profile'}
          />
        </View>

        {/* Cart Screen */}
        <View style={[
          styles.screenContainer, 
          currentScreen === 'cart' ? styles.visible : styles.hidden
        ]}>
          <Cart 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onSearchPress={handleSearchPress}
            isActive={currentScreen === 'cart'}
          />
        </View>
      </>
    );
  };

  // Determinar el estilo del SafeArea superior
  const isWhiteArea = selectedTab === 'profile' || selectedTab === 'cart';
  const statusBarStyle = isWhiteArea ? 'dark-content' : 'light-content';
  const statusBarBackground = isWhiteArea ? '#ffffff' : '#14144b';

  return (
    <View style={styles.container}>
      {/* SafeArea superior condicional */}
      <SafeAreaView 
        style={[
          styles.topSafeArea, 
          { backgroundColor: isWhiteArea ? '#ffffff' : '#14144b' }
        ]} 
        edges={['top']}
      />
      
      <StatusBar backgroundColor={statusBarBackground} barStyle={statusBarStyle} />
      
      <View style={styles.content}>
        {renderAllScreens()}
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
  screenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
  },
  // ✅ ULTRA OPTIMIZADO: Estilos con hardware acceleration para cambio instantáneo
  visible: {
    opacity: 1,
    zIndex: 1,
    pointerEvents: 'auto',
  },
  hidden: {
    opacity: 0,
    zIndex: -1,
    pointerEvents: 'none',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
  placeholderScreen: {
    flex: 1,
    backgroundColor: 'white',
  },
});
