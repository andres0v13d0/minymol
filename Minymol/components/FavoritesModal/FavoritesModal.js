import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { useFavorites } from '../../hooks/useFavorites';
import { getUbuntuFont } from '../../utils/fonts';
import Product from '../Product/Product';
import ProductsSkeleton from '../ProductsSkeleton/ProductsSkeleton';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FavoritesModal = ({
    visible,
    onClose,
    onProductPress
}) => {
    const insets = useSafeAreaInsets();
    const [allProducts, setAllProducts] = useState([]); // Todos los productos favoritos
    const [visibleProducts, setVisibleProducts] = useState([]); // Productos visibles
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [visibleCount, setVisibleCount] = useState(0);
    
    // Hook de favoritos para escuchar cambios
    const { favorites, refreshFavorites } = useFavorites();
    
    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;
    const scrollThrottleRef = useRef(null);

    // Calcular el padding superior
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

    // Función para cargar productos favoritos
    const loadFavorites = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setAllProducts([]);
            setVisibleProducts([]);
            setVisibleCount(0);
            setHasMore(true);

            // Obtener el ID del usuario desde AsyncStorage
            const userData = await AsyncStorage.getItem('usuario');
            if (!userData) {
                throw new Error('No se encontró información del usuario');
            }

            const usuario = JSON.parse(userData);
            const userId = usuario.id;

            if (!userId) {
                throw new Error('ID de usuario no válido');
            }

            console.log('🔗 Cargando favoritos para usuario:', userId);

            // Obtener los favoritos del usuario
            const favoritesUrl = `https://api.minymol.com/favorites/${userId}`;
            const favoritesResponse = await fetch(favoritesUrl);

            if (!favoritesResponse.ok) {
                throw new Error(`Error ${favoritesResponse.status}: ${favoritesResponse.statusText}`);
            }

            const favoritesData = await favoritesResponse.json();
            console.log(`⭐ Favoritos recibidos:`, favoritesData);

            if (!Array.isArray(favoritesData) || favoritesData.length === 0) {
                console.log('📭 No hay productos favoritos');
                setHasMore(false);
                return;
            }

            // Extraer los IDs de los productos favoritos
            const favoriteIds = favoritesData.map(fav => fav.id).filter(id => id);
            console.log(`🆔 ${favoriteIds.length} IDs de favoritos extraídos`);

            if (favoriteIds.length === 0) {
                setHasMore(false);
                return;
            }

            // Obtener los previews de los productos favoritos
            const previewsUrl = 'https://api.minymol.com/products/previews';
            console.log(`🌐 Obteniendo previews para ${favoriteIds.length} productos favoritos`);

            const previewsResponse = await fetch(previewsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: favoriteIds })
            });

            if (!previewsResponse.ok) {
                throw new Error(`Error ${previewsResponse.status}: ${previewsResponse.statusText}`);
            }

            const products = await previewsResponse.json();
            console.log(`📦 Productos obtenidos: ${Array.isArray(products) ? products.length : 0}`);

            // Filtrar productos válidos
            const validProducts = Array.isArray(products) ? products.filter(p => p && p.uuid) : [];
            console.log(`✅ ${validProducts.length} productos válidos`);

            // Guardar TODOS los productos y mostrar los primeros
            setAllProducts(validProducts);
            const initialVisible = validProducts.slice(0, PRODUCTS_PER_PAGE);
            setVisibleProducts(initialVisible);
            setVisibleCount(PRODUCTS_PER_PAGE);
            setHasMore(validProducts.length > PRODUCTS_PER_PAGE);

        } catch (err) {
            console.error('❌ Error cargando favoritos:', err);
            setError(err.message);

            // Mostrar alerta de error al usuario
            Alert.alert(
                'Error',
                'No se pudieron cargar tus favoritos. Verifica tu conexión e intenta nuevamente.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    }, []);

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

    // Cargar favoritos cuando se abre el modal o cuando cambian los favoritos
    useEffect(() => {
        if (visible) {
            loadFavorites();
        }
    }, [visible, favorites, loadFavorites]); // Agregar favorites como dependencia para recargar

    // Función para cargar más productos (paginación del lado del cliente)
    const handleLoadMore = useCallback(() => {
        if (!hasMore || loading) return;

        const nextCount = visibleCount + PRODUCTS_PER_PAGE;
        const nextVisible = allProducts.slice(0, nextCount);

        setVisibleProducts(nextVisible);
        setVisibleCount(nextCount);

        // Verificar si hay más productos
        if (nextCount >= allProducts.length) {
            setHasMore(false);
        }
    }, [hasMore, loading, visibleCount, allProducts]);

    // Manejar scroll infinito al 80%
    const handleScroll = useCallback((event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

        // Calcular el porcentaje de scroll
        const scrollPercentage = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;

        // Carga anticipada al 80%
        const preloadThreshold = 80;

        // Verificar si necesitamos cargar más productos
        const shouldLoadMore = scrollPercentage >= preloadThreshold &&
            hasMore &&
            !loading &&
            contentSize.height > layoutMeasurement.height;

        if (shouldLoadMore) {
            // Throttling: solo ejecutar si han pasado al menos 500ms desde la última carga
            const now = Date.now();
            if (!scrollThrottleRef.current || (now - scrollThrottleRef.current) > 500) {
                scrollThrottleRef.current = now;
                console.log(`🚀 Scroll infinito activado al ${scrollPercentage.toFixed(1)}% con ${visibleProducts.length} productos`);
                handleLoadMore();
            }
        }
    }, [hasMore, loading, visibleProducts.length, handleLoadMore]);

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
                        showProvider={true}
                    />
                </View>
            ))}
        </View>
    );

    // Renderizar estado vacío
    const renderEmptyState = useCallback(() => {
        if (loading) return null;

        return (
            <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="heart-outline" size={64} color="#d1d5db" />
                </View>
                <Text style={styles.emptyTitle}>No tienes favoritos</Text>
                <Text style={styles.emptySubtitle}>
                    Los productos que marques como favoritos aparecerán aquí
                </Text>
            </View>
        );
    }, [loading]);

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
                                    Favoritos
                                </Text>
                            </View>

                            <View style={styles.headerSpacer} />
                        </View>

                        {/* Contenido del modal */}
                        <View style={styles.content}>
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ProductsSkeleton columnsCount={2} itemsCount={6} />
                                </View>
                            ) : error ? (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorTitle}>Error</Text>
                                    <Text style={styles.errorText}>{error}</Text>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={() => loadFavorites()}
                                    >
                                        <Text style={styles.retryButtonText}>Reintentar</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : visibleProducts.length === 0 ? (
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
                                        {distributeProductsInColumns(visibleProducts).map((columnProducts, columnIndex) =>
                                            renderMasonryColumn(columnProducts, columnIndex)
                                        )}
                                    </View>

                                    {/* Mensaje de fin */}
                                    {!hasMore && visibleProducts.length > 0 && (
                                        <View style={styles.endMessageContainer}>
                                            <Text style={styles.endMessageText}>¡Has visto todos tus favoritos!</Text>
                                        </View>
                                    )}
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
    emptyIconContainer: {
        marginBottom: 16,
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
    },
});

export default FavoritesModal;
