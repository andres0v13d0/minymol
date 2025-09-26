import { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import 'react-native-gesture-handler';
<<<<<<< Updated upstream
=======
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppStateProvider } from './contexts/AppStateContext';
import { CartProvider } from './contexts/CartContext';
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
import { useFonts } from './hooks/useFonts';
import Cart from './pages/Cart/Cart';
import Categories from './pages/Categories/Categories';
import Home from './pages/Home/Home';
import ProductDetail from './pages/ProductDetail/ProductDetailSimple';
import Profile from './pages/Profile/Profile';

export default function App() {
<<<<<<< Updated upstream
=======
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
>>>>>>> Stashed changes
  const [selectedTab, setSelectedTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const fontsLoaded = useFonts();

  const handleCategoryPress = (categorySlug) => {
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
    setSelectedTab(tab);
    setCurrentScreen(tab);
    setSelectedProduct(null);
    console.log('Tab seleccionado:', tab);
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

  const renderScreen = () => {
    console.log('App: renderScreen llamado, currentScreen:', currentScreen);
    switch (currentScreen) {
      case 'productDetail':
        console.log('App: Renderizando ProductDetail con producto:', selectedProduct);
        return (
          <ProductDetail 
            route={{ params: { product: selectedProduct } }}
            navigation={{ goBack: handleBackToHome }}
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
          />
        );
      case 'home':
        return (
          <Home 
            onProductPress={handleProductPress} 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
          />
        );
      case 'categories':
        return (
          <Categories 
            onProductPress={handleProductPress} 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onCategoryPress={handleCategoryPress}
          />
        );
      case 'profile':
        return (
          <Profile 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
            onNavigate={handleNavigate}
          />
<<<<<<< Updated upstream
        );
      case 'cart':
        return (
          <View style={styles.placeholderScreen}>
            <Home 
              onProductPress={handleProductPress} 
              selectedTab={selectedTab}
              onTabPress={handleTabPress}
            />
          </View>
        );
      default:
        return (
          <Home 
=======
        </View>

        {/* Cart - siempre montado */}
        <View style={{ 
          display: selectedTab === 'cart' ? 'flex' : 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: selectedTab === 'cart' ? 1 : 0
        }}>
          <Cart 
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
            onProductPress={handleProductPress} 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
          />
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
        );
    }
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
        </View>
      </View>
    );
>>>>>>> Stashed changes
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
        {renderScreen()}
      </View>
      
      {/* SafeArea inferior */}
      <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']} />
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
  placeholderScreen: {
    flex: 1,
    backgroundColor: 'white',
  },
});
