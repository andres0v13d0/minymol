import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUbuntuFont } from '../../utils/fonts';
import Product from '../Product/Product';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const ITEMS_PER_LOAD = 10;

const SubCategoryModal = ({
    visible,
    onClose,
    subCategory,
    onProductPress,
    onAddToCart
}) => {
    const [products, setProducts] = useState([]);
    const [visibleProducts, setVisibleProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const loadIndexRef = useRef(0);
    const insets = useSafeAreaInsets();

    // Animaciones
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    // Efecto para manejar la animación del modal
    useEffect(() => {
        if (visible) {
            // Mostrar modal
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Ocultar modal
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: screenWidth,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // Cargar productos cuando se abra el modal
    useEffect(() => {
        if (visible && subCategory) {
            fetchProducts();
        }
    }, [visible, subCategory]);

    const fetchProducts = async () => {
        if (!subCategory?.slug) return;

        try {
            setLoading(true);
            setProducts([]);
            setVisibleProducts([]);
            loadIndexRef.current = 0;
            setHasMore(true);

            // Usar la misma API que CategoryPage
            const params = new URLSearchParams();
            params.append('subCategorySlug', subCategory.slug);

            const url = `https://api.minymol.com/products/public-ids?${params.toString()}`;
            const res = await fetch(url);
            const data = await res.json();

            if (!Array.isArray(data)) throw new Error('Respuesta inválida del backend');

            const ids = data.map(p => p.product_id);

            if (ids.length === 0) {
                setProducts([]);
                setHasMore(false);
                return;
            }

            const previewsRes = await fetch(`https://api.minymol.com/products/previews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });

            const previews = await previewsRes.json();
            setProducts(previews);

            // Cargar productos iniciales
            const inicial = previews.slice(0, ITEMS_PER_LOAD);
            setVisibleProducts(inicial);
            loadIndexRef.current = ITEMS_PER_LOAD;
            setHasMore(previews.length > ITEMS_PER_LOAD);

        } catch (error) {
            console.error('Error cargando productos:', error);
            setProducts([]);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (loadingMore || !hasMore || loading) return;

        setLoadingMore(true);

        setTimeout(() => {
            const next = products.slice(
                loadIndexRef.current,
                loadIndexRef.current + ITEMS_PER_LOAD
            );
            setVisibleProducts(prev => [...prev, ...next]);
            loadIndexRef.current += ITEMS_PER_LOAD;

            if (loadIndexRef.current >= products.length) {
                setHasMore(false);
            }
            setLoadingMore(false);
        }, 300);
    };

    const renderProduct = ({ item, index }) => (
        <View style={styles.productContainer}>
            <Product
                product={item}
                onProductPress={onProductPress}
                onAddToCart={onAddToCart}
            />
        </View>
    );

    const renderFooter = () => {
        if (loadingMore) {
            return (
                <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color="#fa7e17" />
                    <Text style={styles.loadingText}>Cargando más productos...</Text>
                </View>
            );
        }

        if (!hasMore && visibleProducts.length > 0) {
            return (
                <View style={styles.endMessage}>
                    <Text style={styles.endMessageText}>No hay más productos</Text>
                </View>
            );
        }

        return null;
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <StatusBar backgroundColor="white" barStyle="dark-content" />
            <View style={styles.overlay}>
                {/* Backdrop */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: backdropAnim }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.backdropTouchable}
                        onPress={onClose}
                        activeOpacity={1}
                    />
                </Animated.View>

                {/* Modal Content */}
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ translateX: slideAnim }],
                            paddingTop: insets.top,
                        }
                    ]}
                >
                    <View style={styles.container}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={onClose}
                            >
                                <Ionicons
                                    name="chevron-back"
                                    size={24}
                                    color="#333"
                                />
                            </TouchableOpacity>

                            <Text style={styles.headerTitle} numberOfLines={1}>
                                {subCategory?.name || 'Subcategoría'}
                            </Text>

                            <View style={styles.headerSpacer} />
                        </View>

                        {/* Content */}
                        <View style={styles.content}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#fa7e17" />
                                <Text style={styles.loadingText}>Cargando productos...</Text>
                            </View>
                        ) : visibleProducts.length > 0 ? (
                            <FlatList
                                data={visibleProducts}
                                renderItem={renderProduct}
                                keyExtractor={(item, index) => `product-${item.id || index}`}
                                numColumns={2}
                                contentContainerStyle={styles.productsList}
                                showsVerticalScrollIndicator={false}
                                onEndReached={loadMore}
                                onEndReachedThreshold={0.3}
                                ListFooterComponent={renderFooter}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="cube-outline" size={64} color="#ccc" />
                                <Text style={styles.emptyText}>
                                    No hay productos disponibles
                                </Text>
                                <Text style={styles.emptySubtext}>
                                    En esta subcategoría
                                </Text>
                            </View>
                        )}
                    </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: 'row',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdropTouchable: {
        flex: 1,
    },
    modalContainer: {
        width: screenWidth,
        height: screenHeight,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: {
            width: 2,
            height: 0,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    container: {
        flex: 1,
        backgroundColor: '#14144b',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        textAlign: 'center',
        marginHorizontal: 16,
    },
    headerSpacer: {
        width: 40, // Para balancear el botón de atrás
    },
    content: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        fontFamily: getUbuntuFont('regular'),
    },
    productsList: {
        padding: 12,
        paddingBottom: 24,
    },
    productContainer: {
        flex: 1,
        margin: 6,
        maxWidth: '47%', // Para asegurar 2 columnas
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    endMessage: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    endMessageText: {
        fontSize: 14,
        color: '#888',
        fontFamily: getUbuntuFont('regular'),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        fontFamily: getUbuntuFont('medium'),
        textAlign: 'center',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        fontFamily: getUbuntuFont('regular'),
        textAlign: 'center',
        marginTop: 8,
    },
});

export default SubCategoryModal;