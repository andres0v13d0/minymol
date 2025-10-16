import { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getProvidersForCarousel } from '../../utils/apiUtils';
import { getCachedProviders, isCacheExpired, setCachedProviders } from '../../utils/cache/providersCache';
import { getUbuntuFont } from '../../utils/fonts';
import ProviderProductsModal from '../ProviderProductsModal';

const { width: screenWidth } = Dimensions.get('window');

const AutoCarouselAnimated = ({ 
  autoScrollInterval = 4000,
  onProviderPress = () => {},
  onProductPress = () => {}, // Nuevo prop para manejar click en productos
}) => {
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [providers, setProviders] = useState([]);
  const [providerGroups, setProviderGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carouselHeight] = useState(200); // Altura ajustada para el nuevo diseño circular
  
  // Estado para el modal de productos del proveedor
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerModalVisible, setProviderModalVisible] = useState(false);

  // Función para agrupar proveedores de 3 en 3
  const groupProviders = (providersArray) => {
    const groups = [];
    for (let i = 0; i < providersArray.length; i += 3) {
      groups.push(providersArray.slice(i, i + 3));
    }
    return groups;
  };

  // Cargar proveedores
  useEffect(() => {
    const loadProviders = async () => {
      try {
        console.log('🎠 AutoCarousel: Iniciando carga de proveedores...');
        
        // 1. Intentar cargar desde caché primero (instantáneo)
        const cachedProviders = await getCachedProviders();
        
        if (cachedProviders && cachedProviders.length > 0) {
          console.log('🎠 AutoCarousel: ✅ Cargando desde caché (instantáneo)');
          setProviders(cachedProviders);
          const groups = groupProviders(cachedProviders);
          setProviderGroups(groups);
          setLoading(false); // Mostrar datos inmediatamente
        } else {
          console.log('🎠 AutoCarousel: ⏳ No hay caché, cargando desde backend...');
          setLoading(true);
        }
        
        // 2. Verificar si necesitamos actualizar desde el backend
        const cacheIsExpired = await isCacheExpired();
        
        if (cacheIsExpired || !cachedProviders) {
          console.log('🎠 AutoCarousel: 🔄 Actualizando desde backend en background...');
          
          // Cargar desde backend
          const providersData = await getProvidersForCarousel();
          console.log('🎠 AutoCarousel: 📥 Datos recibidos del backend:', providersData?.length);
          
          // Solo actualizar si hay datos nuevos
          if (providersData && providersData.length > 0) {
            // Comparar si hay cambios
            const hasChanges = !cachedProviders || 
                              JSON.stringify(providersData) !== JSON.stringify(cachedProviders);
            
            if (hasChanges) {
              console.log('🎠 AutoCarousel: 🔄 Detectados cambios, actualizando...');
              setProviders(providersData);
              const groups = groupProviders(providersData);
              setProviderGroups(groups);
              
              // Guardar en caché para la próxima vez
              await setCachedProviders(providersData);
            } else {
              console.log('🎠 AutoCarousel: ✅ Sin cambios, manteniendo datos actuales');
            }
          }
        } else {
          console.log('🎠 AutoCarousel: ✅ Caché válida, no es necesario actualizar');
        }
        
      } catch (error) {
        console.error('🎠 AutoCarousel: ❌ Error cargando proveedores:', error);
        
        // Si hay error pero tenemos caché, mantener los datos en caché
        if (providers.length > 0) {
          console.log('🎠 AutoCarousel: 🔄 Error en backend, manteniendo caché');
        }
      } finally {
        setLoading(false);
        console.log('🎠 AutoCarousel: ✅ Carga terminada');
      }
    };

    loadProviders();
  }, []);

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

  // Componente skeleton para tarjeta de proveedor
  const ProviderCardSkeleton = () => (
    <View style={styles.providerCard}>
      <View style={[styles.logoContainer, styles.skeletonLogo]}>
        <View style={styles.skeletonCircle} />
      </View>
      <View style={styles.skeletonTextContainer}>
        <View style={styles.skeletonText} />
        <View style={[styles.skeletonText, styles.skeletonTextShort]} />
      </View>
    </View>
  );

  // Componente para mostrar una tarjeta de proveedor
  const ProviderCard = ({ provider }) => (
    <TouchableOpacity 
      style={styles.providerCard}
      onPress={() => {
        setSelectedProvider(provider);
        setProviderModalVisible(true);
        // También llamar al callback original si existe
        onProviderPress(provider);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.logoContainer}>
        <Image
          source={{ uri: provider.logo_url }}
          style={styles.providerLogo}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.providerName} numberOfLines={2}>
        {provider.nombre_empresa}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { height: carouselHeight }]}>
        <View style={[styles.groupContainer, { width: screenWidth }]}>
          <ProviderCardSkeleton />
          <ProviderCardSkeleton />
          <ProviderCardSkeleton />
        </View>
      </View>
    );
  }

  if (providerGroups.length === 0) {
    return (
      <View style={[styles.container, { height: carouselHeight }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No hay proveedores disponibles</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: carouselHeight }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {providerGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={[styles.groupContainer, { width: screenWidth }]}>
            {group.map((provider, providerIndex) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </View>
        ))}
      </ScrollView>
      
      {/* Indicadores de paginación */}
      {providerGroups.length > 1 && (
        <View style={styles.pagination}>
          {providerGroups.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex ? styles.paginationDotActive : null
              ]}
            />
          ))}
        </View>
      )}
      
      {/* Modal de productos del proveedor */}
      <ProviderProductsModal
        visible={providerModalVisible}
        onClose={() => {
          setProviderModalVisible(false);
          setSelectedProvider(null);
        }}
        provider={selectedProvider}
        onProductPress={onProductPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  groupContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 25,
  },
  providerCard: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: screenWidth / 3 - 30,
    maxWidth: 110,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#000000',
  },
  providerLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 4,
    minHeight: 34,
    fontFamily: getUbuntuFont('Ubuntu-Medium'),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: getUbuntuFont('Ubuntu-Regular'),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#bdc3c7',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: '#3498db',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Estilos para skeleton
  skeletonLogo: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0',
  },
  skeletonCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
  },
  skeletonTextContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  skeletonText: {
    width: '90%',
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonTextShort: {
    width: '70%',
  },
});

export default AutoCarouselAnimated;
