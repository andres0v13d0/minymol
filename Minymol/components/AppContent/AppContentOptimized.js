/**
 * 🚀 AppContentOptimized - Ultra-optimized Navigation with Screen Unmounting
 * 
 * KEY OPTIMIZATIONS:
 * - Only ONE screen mounted at a time (unmount inactive screens)
 * - Instant tab switching with deferred heavy initialization
 * - Isolated navigation state to prevent cascade re-renders
 * - Minimal re-renders using React.memo and careful prop management
 */

import { memo, startTransition, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../../contexts/CartContext';
import { useFonts } from '../../hooks/useFonts';
import SearchModal from '../SearchModal/SearchModal';

// ✅ Lazy load screens to reduce initial bundle size
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('../../pages/Home/Home'));
const Categories = lazy(() => import('../../pages/Categories/Categories'));
const Profile = lazy(() => import('../../pages/Profile/Profile'));
const Cart = lazy(() => import('../../pages/Cart/Cart'));

// ✅ Lightweight loading fallback
const ScreenLoader = memo(() => (
  <View style={styles.screenLoader}>
    <ActivityIndicator size="large" color="#fa7e17" />
  </View>
));

function AppContentOptimized() {
  const [selectedTab, setSelectedTab] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const fontsLoaded = useFonts();
  
  // ✅ Get visual cart count directly from context
  const { visualCartCount } = useCart();
  const cartItemCount = visualCartCount || 0;

  // ✅ Memoized callbacks to prevent child re-renders
  const handleCategoryPress = useCallback((categorySlug) => {
    console.log('Category selected:', categorySlug);
  }, []);

  const handleNavigate = useCallback((action, params = {}) => {
    console.log('Navigating to:', action, 'with params:', params);
  }, []);

  // ✅ ULTRA-OPTIMIZED: Instant tab switching with startTransition
  const handleTabPress = useCallback((tab) => {
    const startTime = performance.now();
    console.log('🎯 ========================================');
    console.log('🎯 TAB SWITCH STARTED:', tab);
    console.log('🎯 Timestamp:', startTime.toFixed(2), 'ms');
    
    // ✅ CRITICAL: Use startTransition for non-blocking state update
    startTransition(() => {
      setSelectedTab(tab);
      setSelectedProduct(null);
    });
    
    // Measure actual switch time
    requestAnimationFrame(() => {
      const endTime = performance.now();
      console.log('✅ TAB SWITCH COMPLETED in:', (endTime - startTime).toFixed(2), 'ms');
      console.log('🎯 ========================================');
    });
  }, []);

  const handleProductPress = useCallback((product) => {
    console.log('App: handleProductPress (handled by modals)');
  }, []);

  const handleBackToHome = useCallback(() => {
    setSelectedTab('home');
    setSelectedProduct(null);
  }, []);

  const handleSearchPress = useCallback(() => {
    console.log('Opening search modal');
    setShowSearchModal(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    console.log('Closing search modal');
    setShowSearchModal(false);
  }, []);

  // ✅ Memoize common props to prevent unnecessary re-renders
  const commonProps = useMemo(() => ({
    onTabPress: handleTabPress,
    onProductPress: handleProductPress,
    onSearchPress: handleSearchPress,
    cartItemCount,
  }), [handleTabPress, handleProductPress, handleSearchPress, cartItemCount]);

  // Show loading while fonts are loading
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

  // ✅ CRITICAL: Only render the ACTIVE screen (unmount others)
  const renderActiveScreen = () => {
    console.log('🎨 Rendering active screen:', selectedTab);
    
    switch (selectedTab) {
      case 'home':
        return (
          <Suspense fallback={<ScreenLoader />}>
            <Home 
              {...commonProps}
              selectedTab={selectedTab}
              isActive={true}
            />
          </Suspense>
        );
      
      case 'categories':
        return (
          <Suspense fallback={<ScreenLoader />}>
            <Categories 
              {...commonProps}
              onCategoryPress={handleCategoryPress}
              isActive={true}
            />
          </Suspense>
        );
      
      case 'profile':
        return (
          <Suspense fallback={<ScreenLoader />}>
            <Profile 
              {...commonProps}
              onNavigate={handleNavigate}
              isActive={true}
            />
          </Suspense>
        );
      
      case 'cart':
        return (
          <Suspense fallback={<ScreenLoader />}>
            <Cart 
              {...commonProps}
              isActive={true}
            />
          </Suspense>
        );
      
      default:
        return null;
    }
  };

  // Determine SafeArea styling based on active screen
  const isWhiteArea = selectedTab === 'profile' || selectedTab === 'cart';
  const statusBarStyle = isWhiteArea ? 'dark-content' : 'light-content';
  const statusBarBackground = isWhiteArea ? '#f8fafc' : '#14144b';

  return (
    <View style={styles.container}>
      {/* Dynamic SafeArea */}
      <SafeAreaView 
        style={[
          styles.topSafeArea, 
          { backgroundColor: isWhiteArea ? '#f8fafc' : '#14144b' }
        ]} 
        edges={['top']}
      />
      
      <StatusBar backgroundColor={statusBarBackground} barStyle={statusBarStyle} />
      
      {/* ✅ CRITICAL: Only one screen mounted at a time */}
      <View style={styles.content}>
        {renderActiveScreen()}
      </View>
      
      {/* Bottom SafeArea */}
      <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']} />
      
      {/* Search modal (shared across screens) */}
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
    // backgroundColor set dynamically
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
  screenLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});

// ✅ Memo the entire component to prevent unnecessary re-renders
export default memo(AppContentOptimized);
