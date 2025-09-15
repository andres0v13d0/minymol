import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// Función para obtener los proveedores desde la API
const fetchProviders = async () => {
  try {
    const response = await fetch('https://api.minymol.com/providers/carousel');
    if (!response.ok) {
      throw new Error('Error al cargar proveedores');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching providers:', error);
    return [];
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
  const [providers, setProviders] = useState([]);
  const [providerGroups, setProviderGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forceRender, setForceRender] = useState(0); // Para forzar re-render en Android
  
  // Animación para el skeleton
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Cargar proveedores al montar el componente
  useEffect(() => {
    const loadProviders = async () => {
      setLoading(true);
      const fetchedProviders = await fetchProviders();
      setProviders(fetchedProviders);
      const groups = groupProviders(fetchedProviders);
      setProviderGroups(groups);
      setLoading(false);
    };

    loadProviders();
    
    // En Android, forzar un re-render después de un breve delay
    if (Platform.OS === 'android') {
      setTimeout(() => {
        setForceRender(prev => prev + 1);
      }, 100);
    }
  }, []);

  // Animación del shimmer
  useEffect(() => {
    if (loading) {
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
  }, [loading, shimmerAnim]);

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

  if (loading) {
    return renderSkeleton();
  }

  if (providerGroups.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay proveedores disponibles</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    height: 180, // Altura fija para el carousel de proveedores
    paddingVertical: 10,
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
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  providerLogo: {
    width: 70,
    height: 70,
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
    height: 180,
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
    height: 180,
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
