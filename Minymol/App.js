import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppStateProvider } from './contexts/AppStateContext';
import { useFonts } from './hooks/useFonts';
import Categories from './pages/Categories/Categories';
import Home from './pages/Home/Home';
import ProductDetail from './pages/ProductDetail/ProductDetailSimple';
import Profile from './pages/Profile/Profile';
import CacheManager from './utils/cache/CacheManager';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [selectedTab, setSelectedTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cacheInitialized, setCacheInitialized] = useState(false);
  const fontsLoaded = useFonts();

  // Inicializar el sistema de caché al arrancar la app
  useEffect(() => {
    const initializeCache = async () => {
      try {
        console.log('🚀 Inicializando sistema de caché...');
        await CacheManager.initialize();
        
        // Obtener estadísticas del caché
        const stats = await CacheManager.getStats();
        console.log('📊 Estadísticas del caché:', stats);
        
        setCacheInitialized(true);
        console.log('✅ Sistema de caché inicializado correctamente');
      } catch (error) {
        console.error('❌ Error inicializando caché:', error);
        // Continuar sin caché en caso de error
        setCacheInitialized(true);
      }
    };

    initializeCache();
  }, []);

  // Mostrar loading mientras se inicializa el caché y cargan las fuentes
  if (!fontsLoaded || !cacheInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa7e17" />
      </View>
    );
  }

  const handleCategorySelect = (categorySlug) => {
    console.log('Categoría seleccionada:', categorySlug);
    // Aquí podrías navegar a una página de productos de esa categoría
    // o implementar la lógica que necesites
  };

  const handleNavigate = (action, params = {}) => {
    console.log('Navegando a:', action, 'con parámetros:', params);
    // Aquí puedes implementar la lógica de navegación según la acción
    // Por ejemplo, para login, configuración, etc.
  };

  const handleTabPress = (tab) => {
    try {
      console.log('🔄 handleTabPress iniciado:', tab);
      setSelectedTab(tab);
      setCurrentScreen(tab);
      setSelectedProduct(null);
      console.log('✅ handleTabPress completado:', tab);
    } catch (error) {
      console.error('❌ Error en handleTabPress:', error);
    }
  };

  const handleProductPress = (product) => {
    console.log('App: handleProductPress llamado con:', product);
    setSelectedProduct(product);
    setCurrentScreen('productDetail');
    console.log('App: Estado actualizado, currentScreen:', 'productDetail');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
    setSelectedProduct(null);
    setSelectedTab('home');
  };

  // Mostrar loading mientras cargan las fuentes
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#14144b" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa7e17" />
        </View>
      </SafeAreaView>
    );
  }

  const renderScreen = () => {
    console.log('App: renderScreen llamado, currentScreen:', currentScreen);
    
    // Si estamos en ProductDetail, mostramos solo esa pantalla
    if (currentScreen === 'productDetail') {
      console.log('App: Renderizando ProductDetail con producto:', selectedProduct);
      return (
        <ProductDetail 
          route={{ params: { product: selectedProduct } }}
          navigation={{ goBack: handleBackToHome }}
          selectedTab={selectedTab}
          onTabPress={handleTabPress}
        />
      );
    }
    
    // Para el resto de pantallas, las mantenemos todas vivas y solo ocultamos/mostramos
    return (
      <View style={{ flex: 1 }}>
        {/* Home - siempre montado */}
        <View style={{ 
          display: selectedTab === 'home' ? 'flex' : 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: selectedTab === 'home' ? 1 : 0
        }}>
          <Home 
            onProductPress={handleProductPress} 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
          />
        </View>

        {/* Categories - siempre montado */}
        <View style={{ 
          display: selectedTab === 'categories' ? 'flex' : 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: selectedTab === 'categories' ? 1 : 0
        }}>
          <Categories 
            onProductPress={handleProductPress} 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onCategoryPress={handleCategorySelect}
          />
        </View>

        {/* Profile - siempre montado */}
        <View style={{ 
          display: selectedTab === 'profile' ? 'flex' : 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: selectedTab === 'profile' ? 1 : 0
        }}>
          <Profile 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onNavigate={handleNavigate}
          />
        </View>

        {/* Cart - siempre montado (por ahora usa Home como placeholder) */}
        <View style={{ 
          display: selectedTab === 'cart' ? 'flex' : 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: selectedTab === 'cart' ? 1 : 0
        }}>
          <View style={styles.placeholderScreen}>
            <Home 
              onProductPress={handleProductPress} 
              selectedTab={selectedTab}
              onTabPress={handleTabPress}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#14144b" barStyle="light-content" />
      {renderScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
