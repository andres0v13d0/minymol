import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiCall } from '../../utils/apiUtils';
import { getUbuntuFont } from '../../utils/fonts';
import OrderCard from '../OrderCard';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://api.minymol.com';

// Estados disponibles para filtrar
const ORDER_STATUSES = [
    { key: 'all', label: 'Todos', value: null },
    { key: 'pending', label: 'Pendiente', value: 'pending' },
    { key: 'processing', label: 'En proceso', value: 'processing' },
    { key: 'shipped', label: 'Enviado', value: 'shipped' },
    { key: 'delivered', label: 'Entregado', value: 'delivered' },
    { key: 'canceled', label: 'Cancelado', value: 'canceled' },
];

// Componente Skeleton para las tarjetas de órdenes
const OrderCardSkeleton = () => {
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const opacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <View style={styles.skeletonCard}>
            <View style={styles.skeletonHeader}>
                <View style={styles.skeletonHeaderLeft}>
                    <Animated.View style={[styles.skeletonDate, { opacity }]} />
                    <Animated.View style={[styles.skeletonTime, { opacity }]} />
                </View>
                <Animated.View style={[styles.skeletonBadge, { opacity }]} />
            </View>
            
            <Animated.View style={[styles.skeletonOrderNum, { opacity }]} />
            <Animated.View style={[styles.skeletonProvider, { opacity }]} />
            
            <View style={styles.skeletonFooter}>
                <View style={styles.skeletonImages}>
                    {[1, 2, 3, 4].map((item) => (
                        <Animated.View key={item} style={[styles.skeletonImage, { opacity }]} />
                    ))}
                </View>
                <View style={styles.skeletonInfo}>
                    <Animated.View style={[styles.skeletonPrice, { opacity }]} />
                    <Animated.View style={[styles.skeletonQuantity, { opacity }]} />
                </View>
                <Animated.View style={[styles.skeletonChevron, { opacity }]} />
            </View>
        </View>
    );
};

// Skeleton Loader para el modal completo
const OrdersSkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
        {[1, 2, 3, 4].map((item) => (
            <OrderCardSkeleton key={item} />
        ))}
    </View>
);

const MyOrdersModal = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();
    const [allOrders, setAllOrders] = useState([]); // Todos los pedidos sin filtrar
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentStatusIndex, setCurrentStatusIndex] = useState(0); // Índice del estado actual
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(width)).current;
    const statusFlatListRef = useRef(null);

    // Calcular el padding superior
    const getTopPadding = () => {
        if (Platform.OS === 'ios') {
            return insets.top > 0 ? insets.top : 20;
        } else {
            return StatusBar.currentHeight || 0;
        }
    };

    useEffect(() => {
        if (visible) {
            // Animación de entrada
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();

            // Cargar pedidos
            fetchOrders();
        } else {
            // Animación de salida
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: width,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await apiCall(`${API_BASE_URL}/orders/my`);

            if (!res.ok) {
                throw new Error('Error al cargar los pedidos');
            }

            const data = await res.json();

            const pedidosFormateados = data.map((order) => {
                const cantidadProductos = order.items.reduce((total, item) => total + item.quantity, 0);

                return {
                    id: order.id,
                    status: order.status,
                    total: order.totalPrice.toLocaleString('es-CO', { minimumFractionDigits: 0 }),
                    cantidad: cantidadProductos,
                    images: order.items.slice(0, 4).map(item => item.imageSnapshot || 'https://via.placeholder.com/150'),
                };
            });

            setAllOrders(pedidosFormateados);
        } catch (error) {
            console.error('Error al cargar pedidos:', error);
            Alert.alert('Error', 'No se pudieron cargar los pedidos');
        } finally {
            setLoading(false);
        }
    };

    // Función para filtrar pedidos por estado
    const getFilteredOrders = useCallback((statusIndex) => {
        const currentStatus = ORDER_STATUSES[statusIndex];
        if (!currentStatus.value) {
            return allOrders; // Todos
        }
        return allOrders.filter(order => order.status === currentStatus.value);
    }, [allOrders]);

    // Manejar cambio de estado desde la barra de navegación
    const handleStatusPress = useCallback((statusIndex) => {
        if (statusIndex !== currentStatusIndex) {
            setCurrentStatusIndex(statusIndex);
            
            // Sincronizar FlatList horizontal
            if (statusFlatListRef.current) {
                statusFlatListRef.current.scrollToIndex({
                    index: statusIndex,
                    animated: true
                });
            }
        }
    }, [currentStatusIndex]);

    // Manejar scroll del FlatList horizontal
    const handleStatusScroll = useCallback((event) => {
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
        if (newIndex !== currentStatusIndex && newIndex >= 0 && newIndex < ORDER_STATUSES.length) {
            setCurrentStatusIndex(newIndex);
        }
    }, [currentStatusIndex]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchOrders();
        setRefreshing(false);
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: width,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="receipt-outline" size={64} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>
                {currentStatusIndex === 0 
                    ? 'No tienes pedidos' 
                    : `No hay pedidos ${ORDER_STATUSES[currentStatusIndex].label.toLowerCase()}`
                }
            </Text>
            <Text style={styles.emptyText}>
                {currentStatusIndex === 0
                    ? 'Cuando realices un pedido, aparecerá aquí'
                    : 'Cambia el filtro para ver otros pedidos'
                }
            </Text>
        </View>
    );

    // Renderizar página de estado
    const renderStatusPage = useCallback(({ item: statusIndex }) => {
        const filteredOrders = getFilteredOrders(statusIndex);

        return (
            <View style={[styles.statusPage, { width }]}>
                <FlatList
                    data={filteredOrders}
                    renderItem={({ item }) => (
                        <OrderCard
                            {...item}
                        />
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={[
                        styles.listContent,
                        filteredOrders.length === 0 && styles.listContentEmpty,
                        { paddingBottom: Math.max(insets.bottom, 20) }
                    ]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#fa7e17']}
                            tintColor="#fa7e17"
                        />
                    }
                />
            </View>
        );
    }, [getFilteredOrders, refreshing, onRefresh, insets.bottom, currentStatusIndex]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent={true}
        >
            <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
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
                        {/* Header compacto */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleClose}
                            >
                                <Ionicons name="chevron-back" size={24} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Mis pedidos</Text>
                            <View style={styles.headerPlaceholder} />
                        </View>

                        {/* Barra de navegación de estados */}
                        <View style={styles.statusBar}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.statusScrollContent}
                            >
                                {ORDER_STATUSES.map((status, index) => (
                                    <TouchableOpacity
                                        key={status.key}
                                        style={[
                                            styles.statusItem,
                                            currentStatusIndex === index && styles.selectedStatusItem
                                        ]}
                                        onPress={() => handleStatusPress(index)}
                                    >
                                        <Text style={[
                                            styles.statusText,
                                            currentStatusIndex === index && styles.selectedStatusText
                                        ]}>
                                            {status.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Lista de pedidos con scroll horizontal por estado */}
                        <View style={styles.content}>
                            {loading && allOrders.length === 0 ? (
                                <OrdersSkeletonLoader />
                            ) : (
                                <FlatList
                                    ref={statusFlatListRef}
                                    data={ORDER_STATUSES.map((_, index) => index)}
                                    renderItem={renderStatusPage}
                                    keyExtractor={(item) => `status-${item}`}
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    onMomentumScrollEnd={handleStatusScroll}
                                    getItemLayout={(data, index) => ({
                                        length: width,
                                        offset: width * index,
                                        index,
                                    })}
                                    windowSize={3}
                                    initialNumToRender={1}
                                    maxToRenderPerBatch={1}
                                    removeClippedSubviews={false}
                                    decelerationRate="fast"
                                />
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
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        height: 50,
    },
    backButton: {
        padding: 4,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        flex: 1,
        textAlign: 'center',
    },
    headerPlaceholder: {
        width: 40,
    },
    statusBar: {
        backgroundColor: '#ffffff',
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    statusScrollContent: {
        paddingHorizontal: 10,
        alignItems: 'center',
        flexDirection: 'row',
        minWidth: '100%',
    },
    statusItem: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        minWidth: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 13,
        color: '#555',
        fontFamily: getUbuntuFont('medium'),
        textAlign: 'center',
    },
    selectedStatusItem: {
        backgroundColor: '#fa7e17',
        transform: [{ scale: 1.05 }],
    },
    selectedStatusText: {
        color: 'white',
        fontFamily: getUbuntuFont('bold'),
    },
    statusPage: {
        flex: 1,
    },
    content: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    listContent: {
        padding: 16,
    },
    listContentEmpty: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748b',
        fontFamily: getUbuntuFont('regular'),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 24,
    },
    
    // Skeleton Styles
    skeletonContainer: {
        flex: 1,
        padding: 16,
    },
    skeletonCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    skeletonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    skeletonHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    skeletonDate: {
        width: 70,
        height: 13,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
    },
    skeletonTime: {
        width: 50,
        height: 12,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
    },
    skeletonBadge: {
        width: 80,
        height: 24,
        backgroundColor: '#e5e7eb',
        borderRadius: 12,
    },
    skeletonOrderNum: {
        width: 120,
        height: 18,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 8,
    },
    skeletonProvider: {
        width: 150,
        height: 14,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 16,
    },
    skeletonFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    skeletonImages: {
        flexDirection: 'row',
        gap: 6,
        flex: 1,
    },
    skeletonImage: {
        width: 48,
        height: 48,
        backgroundColor: '#e5e7eb',
        borderRadius: 10,
    },
    skeletonInfo: {
        alignItems: 'flex-end',
    },
    skeletonPrice: {
        width: 80,
        height: 16,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 4,
    },
    skeletonQuantity: {
        width: 70,
        height: 12,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
    },
    skeletonChevron: {
        width: 32,
        height: 32,
        backgroundColor: '#e5e7eb',
        borderRadius: 16,
    },
});

export default MyOrdersModal;
