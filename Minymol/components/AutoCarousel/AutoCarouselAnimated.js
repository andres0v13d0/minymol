import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import providersData from '../../assets/data/providers.json';
import { useCache } from '../../hooks/useCache';
import { CACHE_KEYS } from '../../utils/cache/StorageKeys';

const { width: screenWidth } = Dimensions.get('window');

// Función para obtener los proveedores desde la API
const fetchProviders = async () => {
  console.log('🔄 fetchProviders - Iniciando...');
  try {
    const response = await fetch('https://api.minymol.com/providers/carousel');
    if (!response.ok) {
      throw new Error('Error al cargar proveedores');
    }
    const data = await response.json();
    const providers = Array.isArray(data) ? data : (data.providers || []);
    console.log('✅ fetchProviders - Proveedores obtenidos:', providers.length);
    return providers;
  } catch (error) {
    console.error('❌ fetchProviders - Error:', error);
    console.log('📁 fetchProviders - Usando fallback local');
    return providersData.providers || [];
  }
};

// Función para agrupar proveedores de a 3
const groupProviders = (providers, groupSize = 3) => {
  const groups = [];
  for (let i = 0; i < providers.length; i += groupSize) {
    groups.push(providers.slice(i, i + groupSize));
  }
  return groups;
};

const AutoCarouselAnimated = ({ 
  autoScrollInterval = 4000,
}) => {
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [providerGroups, setProviderGroups] = useState([]);
  const [forceRender, setForceRender] = useState(0); // Para forzar re-render en Android
  
  // Animación para el skeleton
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Hook de caché para proveedores
  const {
    data: providers,
    isLoading,
    isRefreshing,
    hasCache,
    isOnline
  } = useCache(
    CACHE_KEYS.PROVIDERS_CAROUSEL,
    fetchProviders,
    {
      refreshOnMount: true, // Necesario para la primera carga
      refreshOnFocus: false
    }
  );

  // Debug logs
  useEffect(() => {
    console.log('🏗️ AutoCarousel - Estado:', {
      hasProviders: !!providers,
      providersCount: providers?.length || 0,
      hasCache,
      isLoading,
      isRefreshing,
      key: CACHE_KEYS.PROVIDERS_CAROUSEL
    });
  }, [providers, hasCache, isLoading, isRefreshing]);

  // Agrupar proveedores cuando cambien
  useEffect(() => {
    if (providers && providers.length > 0) {
      const groups = groupProviders(providers);
      setProviderGroups(groups);
    }
  }, [providers]);

  // En Android, forzar un re-render después de un breve delay
  useEffect(() => {
    if (Platform.OS === 'android') {
      setTimeout(() => {
        setForceRender(prev => prev + 1);
      }, 100);
    }
  }, []);

  // Animación del shimmer
  useEffect(() => {
    const shouldShowSkeleton = !providers && isLoading && !hasCache;
    
    if (shouldShowSkeleton) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [providers, isLoading, hasCache, shimmerAnim]);

  // Auto scroll
  useEffect(() => {
    if (providerGroups.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % providerGroups.length;
        
        // Scroll al siguiente grupo
        scrollViewRef.current?.scrollTo({
          x: nextIndex * screenWidth,
          animated: true,
        });
        
        return nextIndex;
      });
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [autoScrollInterval, providerGroups.length]);

  // Renderizar un proveedor individual
  const renderProvider = (provider) => (
    <View key={provider.id} style={styles.providerContainer}>
      <View style={styles.logoCircle}>
        <Image
          source={{ uri: provider.logo_url }}
          style={styles.providerLogo}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.providerName} numberOfLines={2}>
        {provider.nombre_empresa}
      </Text>
    </View>
  );

  // Renderizar un grupo de proveedores
  const renderProviderGroup = (group, index) => (
    <View key={`${index}-${forceRender}`} style={[styles.groupContainer, { width: screenWidth }]}>
      {group.map(provider => renderProvider(provider))}
    </View>
  );

  // Renderizar skeleton de carga
  const renderSkeleton = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    const shimmerTranslate = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 100],
    });

    return (
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Nuestros Proveedores</Text>
        </View>
        <View style={[styles.groupContainer, { width: screenWidth }]}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.providerContainer}>
              <View style={[styles.logoCircle, styles.skeletonCircle]}>
                <View style={styles.skeletonLogo}>
                  <Animated.View 
                    style={[
                      styles.shimmerOverlay,
                      {
                        opacity: shimmerOpacity,
                        transform: [{ translateX: shimmerTranslate }],
                      },
                    ]} 
                  />
                </View>
              </View>
              <View style={styles.skeletonTextContainer}>
                <View style={[styles.skeletonText, { width: 85 }]}>
                  <Animated.View 
                    style={[
                      styles.shimmerOverlayText,
                      {
                        opacity: shimmerOpacity,
                        transform: [{ translateX: shimmerTranslate }],
                      },
                    ]} 
                  />
                </View>
                <View style={[styles.skeletonText, { width: 65 }]}>
                  <Animated.View 
                    style={[
                      styles.shimmerOverlayText,
                      {
                        opacity: shimmerOpacity,
                        transform: [{ translateX: shimmerTranslate }],
                      },
                    ]} 
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Mostrar skeleton solo si es la primera carga SIN datos
  const shouldShowSkeleton = !providers && isLoading && !hasCache;
  
  if (shouldShowSkeleton) {
    return renderSkeleton();
  }

  if (providerGroups.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {!isOnline ? 'Sin conexión - Reintentando...' : 'No hay proveedores disponibles'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.title}>Nuestros Proveedores</Text>
          {isRefreshing && (
            <Text style={[styles.title, { fontSize: 12, marginLeft: 8, color: '#666' }]}>
              ⟳
            </Text>
          )}
        </View>
      </View>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={styles.scrollView}
        // Propiedades específicas para mejorar rendimiento en Android
        {...(Platform.OS === 'android' && {
          removeClippedSubviews: false,
          scrollEventThrottle: 1,
        })}
      >
        {providerGroups.map((group, index) => renderProviderGroup(group, index))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    height: 200,
    paddingVertical: 10,
    position: 'relative',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  groupContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  providerContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  providerLogo: {
    width: 75,
    height: 75,
    borderRadius: 35,
  },
  providerName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    color: '#333',
    maxWidth: 90,
    lineHeight: 14,
  },
  skeletonCircle: {
    backgroundColor: '#e8e8e8',
  },
  skeletonLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonTextContainer: {
    alignItems: 'center',
    width: '100%',
  },
  skeletonText: {
    height: 10,
    backgroundColor: '#e8e8e8',
    borderRadius: 5,
    marginBottom: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 35,
  },
  shimmerOverlayText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 5,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default AutoCarouselAnimated;
