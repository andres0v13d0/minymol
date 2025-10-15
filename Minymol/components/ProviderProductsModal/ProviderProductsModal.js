import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { getUbuntuFont } from '../../utils/fonts';
import Product from '../Product/Product';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ProviderProductsModal = ({
    visible,
    onClose,
    provider, // { id, nombre_empresa, logo_url, banner_url }
    onProductPress
}) => {
    // ✅ OPTIMIZADO: Estado simplificado con cursor pagination
    const [products, setProducts] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // ✅ Seed único por modal para orden aleatorio consistente
    const [feedSeed] = useState(() => Math.random().toString(36).substring(2, 10));
    
    // Animaciones como SearchModal
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current; // Desde la derecha
    const scrollThrottleRef = useRef(null); // Para throttling del scroll infinito
    
    // Calcular el padding superior sin SafeAreaProvider
    const getTopPadding = () => {
        if (Platform.OS === 'ios') {
            return 50; // Padding fijo para iOS
        } else {
            return (StatusBar.currentHeight || 24) + 10;
        }
    };    const PRODUCTS_PER_PAGE = 20;

    // Manejar animaciones cuando el modal se abre/cierra
    useEffect(() => {
        if (visible) {
            // Animar entrada del modal desde la derecha
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Resetear animaciones
            fadeAnim.setValue(0);
            slideAnim.setValue(screenWidth);
        }
    }, [visible]);

    // ✅ MEGA OPTIMIZACIÓN: Cargar productos con nuevo endpoint /products/feed
    const loadProducts = useCallback(async (cursor = null) => {
        if (!provider?.id) return;

        try {
            setLoading(true);
            setError(null);

            // Construir URL con el nuevo endpoint
            const params = new URLSearchParams();
            params.append('seed', feedSeed);
            params.append('limit', '20');
            params.append('providerId', provider.id.toString());

            if (cursor) {
                params.append('cursor', cursor);
            }

            const url = `https://api.minymol.com/products/feed?${params.toString()}`;
            console.log(`🚀 ProviderProductsModal - Cargando desde /feed:`, url);

            const response = await fetch(url);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error del servidor:', response.status, errorText);
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const { data, nextCursor: newCursor, hasMore: more } = await response.json();

            console.log(`✅ Feed cargado: ${data.length} productos del proveedor ${provider.nombre_empresa}, hasMore: ${more}, nextCursor: ${newCursor}`);

            if (cursor) {
                // Cargar más: concatenar productos
                setProducts(prev => [...prev, ...data]);
            } else {
                // Primera carga: reemplazar
                setProducts(data);
            }

            setNextCursor(newCursor);
            setHasMore(more);

        } catch (err) {
            console.error('❌ Error cargando productos del proveedor:', err);
            setError(err.message);

            // Mostrar alerta de error al usuario
            Alert.alert(
                'Error',
                'No se pudieron cargar los productos del proveedor. Verifica tu conexión e intenta nuevamente.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    }, [provider, feedSeed]);

    // Función para cerrar con animación
    const handleClose = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: screenWidth,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    // Cargar productos cuando se abre el modal o cambia el proveedor
    useEffect(() => {
        if (visible && provider?.id) {
            // Reset estado al abrir
            setProducts([]);
            setNextCursor(null);
            setHasMore(true);
            setError(null);
            // Cargar primera página
            loadProducts(null);
        }
    }, [visible, provider?.id, loadProducts]);

    // ✅ OPTIMIZADO: Función para cargar más productos con cursor pagination
    const handleLoadMore = useCallback(() => {
        if (!hasMore || loading || !nextCursor) return;

        console.log(`🔄 Cargando más productos del proveedor con cursor: ${nextCursor}`);
        loadProducts(nextCursor);
    }, [hasMore, loading, nextCursor, loadProducts]);

    // ✅ OPTIMIZADO: Manejar scroll infinito con cursor pagination
    const handleScroll = useCallback((event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

        // Calcular el porcentaje de scroll
        const scrollPercentage = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;

        // Carga anticipada al 70%
        const preloadThreshold = 70;

        // Verificar si necesitamos cargar más productos
        const shouldLoadMore = scrollPercentage >= preloadThreshold &&
            hasMore &&
            !loading &&
            nextCursor &&
            contentSize.height > layoutMeasurement.height;

        if (shouldLoadMore) {
            // Throttling: solo ejecutar si han pasado al menos 300ms desde la última carga
            const now = Date.now();
            if (!scrollThrottleRef.current || (now - scrollThrottleRef.current) > 300) {
                scrollThrottleRef.current = now;
                console.log(`🚀 Scroll infinito activado al ${scrollPercentage.toFixed(1)}% con ${products.length} productos`);
                handleLoadMore();
            }
        }
    }, [hasMore, loading, nextCursor, products.length, handleLoadMore]);

    // Función para distribuir productos en columnas tipo masonry
    const distributeProductsInColumns = (products) => {
        const columns = [[], []]; // 2 columnas

        products.forEach((product, index) => {
            const columnIndex = index % 2;
            columns[columnIndex].push(product);
        });

        return columns;
    };

    const renderMasonryColumn = (columnProducts, columnIndex) => (
        <View
            key={`column-${columnIndex}`}
            style={[
                styles.masonryColumn,
                columnIndex === 0 ? { marginRight: 5 } : { marginLeft: 5 }
            ]}
        >
            {columnProducts.map((product, index) => (
                <View key={`${product.id || product.uuid}-${index}`} style={styles.productContainer}>
                    <Product
                        product={product}
                        onProductPress={onProductPress}
                        index={index}
                        showProvider={false} // No mostrar proveedor ya que todos son del mismo
                    />
                </View>
            ))}
        </View>
    );

    // Renderizar footer de carga
    const renderFooter = useCallback(() => {
        if (loading && products.length > 0) {
            return (
                <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color="#fa7e17" />
                    <Text style={styles.footerText}>Cargando más...</Text>
                </View>
            );
        }

        if (!hasMore && products.length > 0) {
            return (
                <View style={styles.endMessageContainer}>
                    <Text style={styles.endMessageText}>¡Has visto todos los productos del proveedor!</Text>
                </View>
            );
        }
        return null;
    }, [hasMore, loading, products.length]);

    // Renderizar estado vacío
    const renderEmptyState = useCallback(() => {
        if (loading) return null;

        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No hay productos</Text>
                <Text style={styles.emptySubtitle}>
                    Este proveedor aún no tiene productos disponibles
                </Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => loadProducts(null)}
                >
                    <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }, [loading, loadProducts]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent={true}
        >
            <StatusBar backgroundColor="white" barStyle="dark-content" />
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateX: slideAnim }],
                            paddingTop: getTopPadding(),
                        },
                    ]}
                >
                    <View style={styles.container}>
                        {/* Header del modal con banner del proveedor */}
                        <View style={styles.headerWrapper}>
                            {/* Botón de cerrar a la izquierda */}
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleClose}
                            >
                                <Ionicons name="chevron-back" size={26} color="#333" />
                            </TouchableOpacity>
                            
                            {/* Banner del proveedor */}
                            <View style={styles.headerContainer}>
                                {provider?.banner_url && (
                                    <Image
                                        source={{ uri: provider.banner_url }}
                                        style={styles.bannerImage}
                                        resizeMode="contain"
                                    />
                                )}
                            </View>
                        </View>

                        {/* Contenido del modal */}
                        <View style={styles.content}>
                            {loading && products.length === 0 ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#fa7e17" />
                                </View>
                            ) : error ? (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorTitle}>Error</Text>
                                    <Text style={styles.errorText}>{error}</Text>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={() => loadProducts(null)}
                                    >
                                        <Text style={styles.retryButtonText}>Reintentar</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : products.length === 0 ? (
                                renderEmptyState()
                            ) : (
                                <ScrollView
                                    style={styles.resultsContainer}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.productsContainer}
                                    onScroll={handleScroll}
                                    scrollEventThrottle={16}
                                >
                                    <View style={styles.masonryContainer}>
                                        {distributeProductsInColumns(products).map((columnProducts, columnIndex) =>
                                            renderMasonryColumn(columnProducts, columnIndex)
                                        )}
                                    </View>

                                    {/* Footer con loader o mensaje final */}
                                    {renderFooter()}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'white',
        marginTop: 0,
    },
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    headerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingVertical: 8,
        paddingRight: 8,
    },
    closeButton: {
        padding: 8,
        marginLeft: 4,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        flex: 1,
        height: 100,
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
    },
    content: {
        flex: 1,
        backgroundColor: 'white',
        paddingTop: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 20,
    },
    resultsContainer: {
        flex: 1,
    },
    productsContainer: {
        paddingTop: 10,
        paddingBottom: 20,
    },
    masonryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
    },
    masonryColumn: {
        flex: 1,
    },
    productContainer: {
        marginBottom: 15,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    errorTitle: {
        color: '#e74c3c',
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        marginBottom: 8,
    },
    errorText: {
        color: '#666',
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#fa7e17',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
    },
    footerLoader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    footerText: {
        color: '#666',
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        marginLeft: 8,
    },
    endMessageContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    endMessageText: {
        color: '#666',
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        textAlign: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyTitle: {
        color: '#333',
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        marginBottom: 8,
    },
    emptySubtitle: {
        color: '#666',
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
});

export default ProviderProductsModal;
