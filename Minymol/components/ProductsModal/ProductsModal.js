import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductDetail from '../../pages/ProductDetail/ProductDetailSimple';
import { getUbuntuFont } from '../../utils/fonts';
import FloatingCartButton from '../FloatingCartButton';
import Product from '../Product/Product';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ProductsModal = ({
    visible,
    onClose,
    subcategorySlug,
    subcategoryName,
    onProductPress
}) => {
    const insets = useSafeAreaInsets();
    
    // ✅ OPTIMIZADO: Estado simplificado con cursor pagination
    const [products, setProducts] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // ✅ Estado para ProductDetail modal
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showProductDetail, setShowProductDetail] = useState(false);
    
    // ✅ Seed único por modal para orden aleatorio consistente
    const [feedSeed] = useState(() => Math.random().toString(36).substring(2, 10));
    
    // Animaciones como SearchModal
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current; // Desde la derecha
    const scrollThrottleRef = useRef(null); // Para throttling del scroll infinito
    
    // Calcular el padding superior como SearchModal
    const getTopPadding = () => {
        if (Platform.OS === 'ios') {
            return insets.top || 50;
        } else {
            return (StatusBar.currentHeight || 24) + 10;
        }
    };

    const PRODUCTS_PER_PAGE = 20;

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
        if (!subcategorySlug) return;

        try {
            setLoading(true);
            setError(null);

            // Construir URL con el nuevo endpoint
            const params = new URLSearchParams();
            params.append('seed', feedSeed);
            params.append('limit', '20');
            params.append('subCategorySlug', subcategorySlug);
            
            if (cursor) {
                params.append('cursor', cursor);
            }

            const url = `https://api.minymol.com/products/feed?${params.toString()}`;
            console.log(`🚀 ProductsModal - Cargando desde /feed:`, url);

            const response = await fetch(url);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error del servidor:', response.status, errorText);
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const { data, nextCursor: newCursor, hasMore: more } = await response.json();

            console.log(`✅ Feed cargado: ${data.length} productos, hasMore: ${more}, nextCursor: ${newCursor}`);

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
            console.error('❌ Error cargando productos:', err);
            setError(err.message);

            // Mostrar alerta de error al usuario
            Alert.alert(
                'Error',
                'No se pudieron cargar los productos. Verifica tu conexión e intenta nuevamente.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    }, [subcategorySlug, feedSeed]);

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

    // Manejar clic en producto: abrir ProductDetail como modal encima
    const handleProductPress = (product) => {
        console.log('🔄 ProductsModal: Producto presionado, abriendo ProductDetail modal:', product?.name);
        setSelectedProduct(product);
        setShowProductDetail(true);
    };

    // Cerrar ProductDetail modal
    const handleCloseProductDetail = () => {
        console.log('🔄 ProductsModal: Cerrando ProductDetail modal');
        setShowProductDetail(false);
        setSelectedProduct(null);
    };

    // Cargar productos cuando se abre el modal o cambia el slug
    useEffect(() => {
        if (visible && subcategorySlug) {
            // Reset estado al abrir
            setProducts([]);
            setNextCursor(null);
            setHasMore(true);
            setError(null);
            // Cargar primera página
            loadProducts(null);
        }
    }, [visible, subcategorySlug, loadProducts]);

    // ✅ OPTIMIZADO: Función para cargar más productos con cursor pagination
    const handleLoadMore = useCallback(() => {
        if (!hasMore || loading || !nextCursor) return;

        console.log(`🔄 Cargando más productos con cursor: ${nextCursor}`);
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
                        onProductPress={() => handleProductPress(product)}
                        index={index}
                        showProvider={true}
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
                    <Text style={styles.endMessageText}>¡Has visto todos los productos!</Text>
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
                    No se encontraron productos en esta categoría
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
                        {/* Header del modal */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleClose}
                            >
                                <Ionicons name="chevron-back" size={24} color="#333" />
                            </TouchableOpacity>

                            <View style={styles.titleContainer}>
                                <Text style={styles.title} numberOfLines={1}>
                                    {subcategoryName || 'Productos'}
                                </Text>
                            </View>
                            
                            <View style={styles.headerSpacer} />
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

            {/* ProductDetail Modal encima */}
            {showProductDetail && selectedProduct && (
                <Modal
                    visible={showProductDetail}
                    transparent={false}
                    animationType="slide"
                    onRequestClose={handleCloseProductDetail}
                    statusBarTranslucent={true}
                >
                    <ProductDetail
                        route={{ params: { product: selectedProduct } }}
                        navigation={{ goBack: handleCloseProductDetail }}
                        isModal={true}
                    />
                </Modal>
            )}
            
            {/* 🛒 Botón flotante del carrito */}
            <FloatingCartButton 
                onPress={() => {
                    console.log('🛒 FloatingCart presionado en ProductsModal');
                    handleClose();
                    // Cerrar y navegar al carrito
                    if (onProductPress) {
                        setTimeout(() => onProductPress(null), 100);
                    }
                }}
                bottom={20}
                right={20}
            />
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 8,
        marginRight: 4,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    title: {
        color: '#333',
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        textAlign: 'center',
    },

    headerSpacer: {
        width: 40,
    },
    content: {
        flex: 1,
        backgroundColor: 'white',
        paddingTop: 8,
    },
    loadingContainer: {
        flex: 1,
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

export default ProductsModal;