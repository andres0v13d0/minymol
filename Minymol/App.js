import { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import 'react-native-gesture-handler';
import { useFonts } from './hooks/useFonts';
import Home from './pages/Home/Home';
import ProductDetail from './pages/ProductDetail/ProductDetailSimple';

export default function App() {
  const [selectedTab, setSelectedTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const fontsLoaded = useFonts();

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
          <View style={styles.placeholderScreen}>
            <Home 
              onProductPress={handleProductPress} 
              selectedTab={selectedTab}
              onTabPress={handleTabPress}
            />
          </View>
        );
      case 'profile':
        return (
          <View style={styles.placeholderScreen}>
            <Home 
              onProductPress={handleProductPress} 
              selectedTab={selectedTab}
              onTabPress={handleTabPress}
            />
          </View>
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
            onProductPress={handleProductPress} 
            selectedTab={selectedTab}
            onTabPress={handleTabPress}
          />
        );
    }
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
