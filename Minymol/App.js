import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, StatusBar, StyleSheet, View } from 'react-native';
import 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import './config/firebase'; // Inicializar Firebase
import SearchModal from './components/SearchModal/SearchModal';
import { AppStateProvider } from './contexts/AppStateContext';
import { CartProvider } from './contexts/CartContext';
import { CartCounterProvider, useCartCounter } from './contexts/CartCounterContext';
import { ChatCounterProvider } from './contexts/ChatCounterContext';
import { FavoritesProvider } from './hooks/useFavorites';
import { useFonts } from './hooks/useFonts';
import Cart from './pages/Cart/Cart';
import Chat from './pages/Chat/Chat';
import Home from './pages/Home/Home';
import Profile from './pages/Profile/Profile';

// ✅ CRÍTICO: Memoizar componentes pesados para evitar re-renders
const MemoizedHome = memo(Home, (prevProps, nextProps) => {
  // Solo re-renderizar si cambia isActive o selectedTab
  return prevProps.isActive === nextProps.isActive && 
         prevProps.selectedTab === nextProps.selectedTab;
});

const MemoizedChat = memo(Chat, (prevProps, nextProps) => {
  // Solo re-renderizar si cambia isActive o selectedTab
  return prevProps.isActive === nextProps.isActive && 
         prevProps.selectedTab === nextProps.selectedTab;
});

const MemoizedProfile = memo(Profile);
const MemoizedCart = memo(Cart);

// Cargar utilidades de debug en desarrollo
if (__DEV__) {
  require('./utils/cartDebug');
}

export default function App() {
  console.log('🚀 App component montando...');
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <CartCounterProvider>
          <ChatCounterProvider>
            <CartProvider>
              <FavoritesProvider>
                <AppContent />
              </FavoritesProvider>
            </CartProvider>
          </ChatCounterProvider>
        </CartCounterProvider>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  console.log('📱 AppContent component montando...');
  const [selectedTab, setSelectedTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  const fontsLoaded = useFonts();
  
  console.log('📱 AppContent: obteniendo contexto del carrito...');
  // ✅ OPTIMIZADO: Usar el contador ultrarrápido que se actualiza instantáneamente
  const { count: cartItemCount } = useCartCounter();
  console.log('📱 AppContent: contador del carrito =', cartItemCount);

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

  // ✅ OPTIMIZADO: Actualización instantánea del estado - ultra simple
  const handleTabPress = useCallback((tab) => {
    const startTime = performance.now();
    console.log('🔵 ========================================');
    console.log('🔵 TAB PRESS INICIADO:', tab);
    console.log('🔵 Timestamp:', startTime.toFixed(2), 'ms');
    
    // 🚀 CRITICAL: Just update state, no complex logic
    setSelectedTab(tab);
    setCurrentScreen(tab);
    setSelectedProduct(null);
    
    // 🚀 Measure after paint
    requestAnimationFrame(() => {
      const afterPaintTime = performance.now();
      console.log('🟢 UI actualizada en:', (afterPaintTime - startTime).toFixed(2), 'ms');
      console.log('🟢 TRANSICIÓN COMPLETA en:', (afterPaintTime - startTime).toFixed(2), 'ms');
      console.log('🔵 ========================================');
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
        {/* ✅ ESTILO TEMU: Componentes memoizados montados permanentemente */}
        {/* Home Screen - Always mounted, memoized */}
        <View style={[
          styles.screenContainer, 
          currentScreen === 'home' ? styles.visible : styles.hidden
        ]}>
          <MemoizedHome 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onProductPress={handleProductPress}
            onSearchPress={handleSearchPress}
            isActive={currentScreen === 'home'}
          />
        </View>

        {/* Chat Screen - Always mounted, memoized */}
        <View style={[
          styles.screenContainer, 
          currentScreen === 'messages' ? styles.visible : styles.hidden
        ]}>
          <MemoizedChat 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            isActive={currentScreen === 'messages'}
          />
        </View>

        {/* Profile Screen - Always mounted, memoized */}
        <View style={[
          styles.screenContainer, 
          currentScreen === 'profile' ? styles.visible : styles.hidden
        ]}>
          <MemoizedProfile 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onNavigate={handleNavigate}
            onSearchPress={handleSearchPress}
            isActive={currentScreen === 'profile'}
          />
        </View>

        {/* Cart Screen - Always mounted, memoized */}
        <View style={[
          styles.screenContainer, 
          currentScreen === 'cart' ? styles.visible : styles.hidden
        ]}>
          <MemoizedCart 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onProductPress={handleProductPress}
            onSearchPress={handleSearchPress}
            isActive={currentScreen === 'cart'}
          />
        </View>
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
