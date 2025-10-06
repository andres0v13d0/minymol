import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Linking,
    Modal,
    Platform,
    Alert as RNAlert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiCall } from '../../utils/apiUtils';
import { getUbuntuFont } from '../../utils/fonts';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://api.minymol.com';

const statusLabels = {
    pending: 'Pendiente',
    processing: 'En proceso',
    shipped: 'Enviado',
    delivered: 'Entregado',
    canceled: 'Cancelado',
};

const statusColors = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981',
    canceled: '#ef4444',
};

const statusBackgroundColors = {
    pending: 'rgba(245, 158, 11, 0.15)',
    processing: 'rgba(59, 130, 246, 0.15)',
    shipped: 'rgba(139, 92, 246, 0.15)',
    delivered: 'rgba(16, 185, 129, 0.15)',
    canceled: 'rgba(239, 68, 68, 0.15)',
};

// Skeleton Loader
const OrderDetailSkeleton = () => {
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
        <View style={styles.skeletonContainer}>
            {/* Status Card Skeleton */}
            <View style={styles.skeletonCard}>
                <View style={styles.skeletonCardRow}>
                    <Animated.View style={[styles.skeletonStatusLabel, { opacity }]} />
                    <Animated.View style={[styles.skeletonBadge, { opacity }]} />
                </View>
                <Animated.View style={[styles.skeletonDate, { opacity }]} />
            </View>

            {/* Customer Section Skeleton */}
            <View style={styles.skeletonCard}>
                <View style={styles.skeletonCardRow}>
                    <Animated.View style={[styles.skeletonIcon, { opacity }]} />
                    <Animated.View style={[styles.skeletonSectionTitle, { opacity }]} />
                </View>
            </View>

            {/* Items Skeleton */}
            <View style={styles.skeletonItemsTitle}>
                <Animated.View style={[styles.skeletonProductsLabel, { opacity }]} />
            </View>
            {[1, 2, 3].map((item) => (
                <View key={item} style={styles.skeletonItemCard}>
                    <View style={styles.skeletonItemRow}>
                        <Animated.View style={[styles.skeletonImage, { opacity }]} />
                        <View style={styles.skeletonItemInfo}>
                            <Animated.View style={[styles.skeletonItemTitle, { opacity }]} />
                            <Animated.View style={[styles.skeletonItemDetail, { opacity }]} />
                            <Animated.View style={[styles.skeletonItemDetail, { opacity, width: '50%' }]} />
                            <Animated.View style={[styles.skeletonItemPrice, { opacity }]} />
                        </View>
                    </View>
                    <View style={styles.skeletonVariantsRow}>
                        {[1, 2, 3, 4].map((v) => (
                            <Animated.View key={v} style={[styles.skeletonVariant, { opacity }]} />
                        ))}
                    </View>
                </View>
            ))}

            {/* Total Skeleton */}
            <View style={styles.skeletonTotalCard}>
                <View style={styles.skeletonCardRow}>
                    <Animated.View style={[styles.skeletonIcon, { opacity }]} />
                    <Animated.View style={[styles.skeletonTotalLabel, { opacity }]} />
                </View>
                <Animated.View style={[styles.skeletonTotalAmount, { opacity }]} />
            </View>
        </View>
    );
};

const OrderDetailModal = ({ visible, orderId, onClose }) => {
    const insets = useSafeAreaInsets();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCustomerDetails, setShowCustomerDetails] = useState(false);
    const [showProviderDetails, setShowProviderDetails] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(width)).current;

    // Calcular el padding superior
    const getTopPadding = () => {
        if (Platform.OS === 'ios') {
            return insets.top > 0 ? insets.top : 20;
        } else {
            return StatusBar.currentHeight || 0;
        }
    };

    useEffect(() => {
        if (visible && orderId) {
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

            // Cargar orden
            fetchOrderDetails();
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
    }, [visible, orderId]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const res = await apiCall(`${API_BASE_URL}/orders/${orderId}`);

            if (!res.ok) {
                throw new Error('Error al cargar la orden');
            }

            const data = await res.json();
            setOrder(data);
        } catch (error) {
            console.error('Error al cargar orden:', error);
            RNAlert.alert('Error', 'No se pudo cargar la información de la orden');
        } finally {
            setLoading(false);
        }
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

    const handleWhatsApp = useCallback(() => {
        if (!order) return;

        const telefono = order.provider?.usuario?.telefono || '';
        if (!telefono) {
            RNAlert.alert('Error', 'No hay número de teléfono disponible');
            return;
        }

        const numero = telefono.replace(/\D/g, '');
        const nombreEmpresa = order.provider?.nombre_empresa || 'Minymol';
        const nombreCliente = order.customer?.nombre || '';
        const total = Number(order.totalPrice || 0).toLocaleString('es-CO');
        const cantidad = Array.isArray(order.items)
            ? order.items.reduce((acc, item) => acc + item.quantity, 0)
            : 0;

        const mensaje = `Hola! Acabo de hacer un pedido desde Minymol.\n\nPedido N.º: ${order.providerOrderNumber}\nProductos: ${cantidad}\nTotal: $${total}\nCliente: ${nombreCliente}\n\n¿Cómo es el método de pago y envío?`;

        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
        Linking.openURL(url).catch(() => {
            RNAlert.alert('Error', 'No se pudo abrir WhatsApp');
        });
    }, [order]);

    // Agrupar items por producto y color
    const groupedItems = useCallback(() => {
        if (!order?.items) return [];

        return Object.values(
            order.items.reduce((acc, item) => {
                const key = `${item.productId}_${item.color || 'sin-color'}`;

                if (!acc[key]) {
                    acc[key] = {
                        ...item,
                        variants: [],
                        totalQuantity: 0,
                        subtotal: 0,
                    };
                }

                acc[key].variants.push({
                    size: item.size,
                    quantity: item.quantity,
                });

                acc[key].totalQuantity += item.quantity;
                acc[key].subtotal += item.unitPrice * item.quantity;

                return acc;
            }, {})
        );
    }, [order]);

    const statusColor = statusColors[order?.status] || '#6b7280';

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
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleClose}
                            >
                                <Ionicons name="chevron-back" size={26} color="#1f2937" />
                            </TouchableOpacity>
                            
                            {/* Título centrado con position absolute */}
                            <View style={styles.headerTitleContainer}>
                                {loading ? (
                                    <Animated.View style={[styles.headerTitleSkeleton, { opacity: fadeAnim }]} />
                                ) : (
                                    <Text style={styles.headerTitle}>
                                        Orden #{order?.providerOrderNumber || '—'}
                                    </Text>
                                )}
                            </View>
                            
                            <View style={styles.headerActions}>
                                {!loading && order && (
                                    <TouchableOpacity
                                        style={styles.whatsappButton}
                                        onPress={handleWhatsApp}
                                    >
                                        <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                                        <Text style={styles.whatsappText}>WhatsApp</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Content */}
                        <ScrollView
                            style={styles.content}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 20 }}
                        >
                            {loading ? (
                                <OrderDetailSkeleton />
                            ) : order ? (
                                <>
                                    {/* Estado */}
                                    <View style={styles.statusSection}>
                                        <View style={styles.statusRow}>
                                            <Text style={styles.statusLabel}>Estado:</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                                                <Text style={styles.statusTextWhite}>
                                                    {statusLabels[order.status] || order.status}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.dateUpdate}>
                                            Última actualización: {new Date(order.updatedAt).toLocaleString('es-CO')}
                                        </Text>
                                    </View>

                                    <View style={styles.divider} />

                                    {/* Cliente */}
                                    <TouchableOpacity
                                        style={styles.toggleSection}
                                        onPress={() => setShowCustomerDetails(!showCustomerDetails)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.toggleHeader}>
                                            <Ionicons name="person" size={20} color="#fa7e17" />
                                            <Text style={styles.toggleTitle}>{order.customer?.nombre || 'Cliente'}</Text>
                                        </View>
                                        <Ionicons
                                            name={showCustomerDetails ? 'chevron-down' : 'chevron-forward'}
                                            size={20}
                                            color="#9ca3af"
                                        />
                                    </TouchableOpacity>

                                    {showCustomerDetails && (
                                        <View style={styles.detailsContent}>
                                            <View style={styles.detailRow}>
                                                <Ionicons name="location" size={16} color="#fa7e17" />
                                                <Text style={styles.detailText}>{order.customer?.direccion || 'Sin dirección'}</Text>
                                            </View>
                                            <View style={styles.detailRow}>
                                                <Ionicons name="business" size={16} color="#6b7280" />
                                                <Text style={styles.detailText}>
                                                    {order.customer?.ciudad || 'Sin ciudad'}, {order.customer?.departamento || 'Sin departamento'}
                                                </Text>
                                            </View>
                                            <View style={styles.detailRow}>
                                                <Ionicons name="call" size={16} color="#10b981" />
                                                <Text style={styles.detailText}>{order.customer?.celular || 'Sin teléfono'}</Text>
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.space} />

                                    {/* Items */}
                                    <View style={styles.itemsSection}>
                                        {groupedItems().map((item, index) => (
                                            <View key={index} style={styles.itemCard}>
                                                <View style={styles.itemHeader}>
                                                    <Image
                                                        source={{ uri: item.imageSnapshot || 'https://cdn.minymol.com/uploads/logoblanco.webp' }}
                                                        style={styles.itemImage}
                                                    />
                                                    <View style={styles.itemInfo}>
                                                        <Text style={styles.itemName}>{item.productName}</Text>
                                                        {item.color && (
                                                            <Text style={styles.itemDetail}>Color: {item.color}</Text>
                                                        )}
                                                        <Text style={styles.itemDetail}>
                                                            x{item.totalQuantity} {item.unity === 'unidad' ? 'unidades' : item.unity === 'docena' ? 'docenas' : item.unity}
                                                        </Text>
                                                        <Text style={styles.itemSubtotal}>
                                                            Subtotal: ${Number(item.subtotal).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Variantes */}
                                                {item.variants && item.variants.length > 0 && (
                                                    <View style={styles.variantsBar}>
                                                        {[...item.variants]
                                                            .sort((a, b) => {
                                                                const sizeA = parseFloat(a.size) || 0;
                                                                const sizeB = parseFloat(b.size) || 0;
                                                                return sizeA - sizeB;
                                                            })
                                                            .map((v, i) => (
                                                                <View key={i} style={styles.variantChip}>
                                                                    <Text style={styles.variantSize}>{v.size || '-'}</Text>
                                                                    <View style={styles.variantDivider} />
                                                                    <Text style={styles.variantQuantity}>{v.quantity}</Text>
                                                                </View>
                                                            ))}
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>

                                    <View style={styles.space} />

                                    {/* Total */}
                                    <View style={styles.totalSection}>
                                        <View style={styles.totalHeader}>
                                            <Ionicons name="cash" size={22} color="#fa7e17" />
                                            <Text style={styles.totalLabel}>Monto total a pagar</Text>
                                        </View>
                                        <Text style={styles.totalAmount}>
                                            ${Number(order.totalPrice).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                        </Text>
                                    </View>

                                    <View style={styles.bigSpace} />

                                    {/* Proveedor */}
                                    <TouchableOpacity
                                        style={styles.toggleSection}
                                        onPress={() => setShowProviderDetails(!showProviderDetails)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.toggleHeader}>
                                            <Ionicons name="storefront" size={20} color="#fa7e17" />
                                            <Text style={styles.toggleTitle}>{order.provider?.nombre_empresa || 'Proveedor'}</Text>
                                        </View>
                                        <Ionicons
                                            name={showProviderDetails ? 'chevron-down' : 'chevron-forward'}
                                            size={20}
                                            color="#9ca3af"
                                        />
                                    </TouchableOpacity>

                                    {showProviderDetails && (
                                        <View style={styles.detailsContent}>
                                            <View style={styles.ratingContainer}>
                                                <Text style={styles.ratingLabel}>Calificación:</Text>
                                                <View style={styles.starsContainer}>
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Ionicons
                                                            key={star}
                                                            name={star <= (order.provider?.calificacion || 0) ? 'star' : 'star-outline'}
                                                            size={18}
                                                            color={star <= (order.provider?.calificacion || 0) ? '#fbbf24' : '#d1d5db'}
                                                        />
                                                    ))}
                                                    <Text style={styles.ratingNumber}>
                                                        {order.provider?.calificacion || 0}/5
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.space} />
                                </>
                            ) : null}
                        </ScrollView>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
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
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -8,
    },
    headerTitleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#111827',
    },
    headerTitleSkeleton: {
        width: 140,
        height: 22,
        backgroundColor: '#e5e7eb',
        borderRadius: 6,
        flex: 1,
        alignSelf: 'center',
    },
    headerActions: {
        alignItems: 'flex-end',
        minWidth: 100,
    },
    whatsappButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: '#25D366',
        shadowColor: '#25D366',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    whatsappText: {
        fontSize: 13,
        fontFamily: getUbuntuFont('bold'),
        color: '#ffffff',
    },
    content: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },

    // Status Section - Mejorado
    statusSection: {
        backgroundColor: '#ffffff',
        padding: 18,
        marginTop: 16,
        marginHorizontal: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusLabel: {
        fontSize: 15,
        fontFamily: getUbuntuFont('bold'),
        color: '#374151',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
        elevation: 2,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontFamily: getUbuntuFont('bold'),
        textTransform: 'capitalize',
    },
    statusTextWhite: {
        fontSize: 13,
        fontFamily: getUbuntuFont('bold'),
        color: '#ffffff',
        textTransform: 'capitalize',
    },
    dateUpdate: {
        fontSize: 13,
        color: '#9ca3af',
        fontFamily: getUbuntuFont('regular'),
        marginTop: 4,
    },

    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 16,
        marginHorizontal: 16,
    },

    // Toggle Sections - Mejorado
    toggleSection: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 18,
        paddingVertical: 16,
        marginHorizontal: 16,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    toggleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    toggleTitle: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#111827',
    },
    detailsContent: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 16,
        marginHorizontal: 16,
        marginTop: -12,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        borderTopWidth: 0,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    detailText: {
        fontSize: 14,
        color: '#374151',
        fontFamily: getUbuntuFont('regular'),
        flex: 1,
        lineHeight: 20,
    },

    space: {
        height: 16,
    },
    bigSpace: {
        height: 24,
    },

    // Items - Mejorado
    itemsSection: {
        marginHorizontal: 16,
    },
    itemCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    itemHeader: {
        flexDirection: 'row',
        gap: 14,
    },
    itemImage: {
        width: 90,
        height: 90,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    itemInfo: {
        flex: 1,
        justifyContent: 'space-between',
    },
    itemName: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#111827',
        marginBottom: 6,
        lineHeight: 22,
    },
    itemDetail: {
        fontSize: 14,
        color: '#6b7280',
        fontFamily: getUbuntuFont('regular'),
        marginBottom: 4,
    },
    itemSubtotal: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
        marginTop: 6,
    },
    variantsBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    variantChip: {
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        minWidth: 54,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    variantSize: {
        fontSize: 13,
        fontFamily: getUbuntuFont('bold'),
        color: '#374151',
    },
    variantDivider: {
        width: '100%',
        height: 1,
        backgroundColor: '#d1d5db',
        marginVertical: 3,
    },
    variantQuantity: {
        fontSize: 12,
        fontFamily: getUbuntuFont('medium'),
        color: '#6b7280',
    },

    // Total - Mejorado con gradiente visual
    totalSection: {
        backgroundColor: '#ffffff',
        padding: 20,
        marginHorizontal: 16,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1.5,
        borderColor: '#fed7aa',
    },
    totalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    totalLabel: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#374151',
    },
    totalAmount: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
        letterSpacing: -0.5,
    },

    // Rating with stars
    ratingContainer: {
        flexDirection: 'column',
        gap: 8,
    },
    ratingLabel: {
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
        color: '#374151',
    },
    starsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingNumber: {
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
        color: '#6b7280',
        marginLeft: 8,
    },

    // Skeleton - Completamente rediseñado
    skeletonContainer: {
        padding: 16,
    },
    skeletonCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    skeletonCardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    skeletonStatusLabel: {
        width: 60,
        height: 16,
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
    },
    skeletonBadge: {
        width: 100,
        height: 28,
        backgroundColor: '#e5e7eb',
        borderRadius: 14,
    },
    skeletonDate: {
        width: 180,
        height: 14,
        backgroundColor: '#e5e7eb',
        borderRadius: 7,
    },
    skeletonIcon: {
        width: 20,
        height: 20,
        backgroundColor: '#e5e7eb',
        borderRadius: 10,
    },
    skeletonSectionTitle: {
        width: 120,
        height: 18,
        backgroundColor: '#e5e7eb',
        borderRadius: 9,
        marginLeft: 12,
    },
    skeletonItemsTitle: {
        marginBottom: 12,
    },
    skeletonProductsLabel: {
        width: 100,
        height: 20,
        backgroundColor: '#e5e7eb',
        borderRadius: 10,
    },
    skeletonItemCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    skeletonItemRow: {
        flexDirection: 'row',
        gap: 14,
    },
    skeletonImage: {
        width: 90,
        height: 90,
        backgroundColor: '#e5e7eb',
        borderRadius: 12,
    },
    skeletonItemInfo: {
        flex: 1,
        justifyContent: 'space-between',
    },
    skeletonItemTitle: {
        width: '85%',
        height: 18,
        backgroundColor: '#e5e7eb',
        borderRadius: 9,
        marginBottom: 8,
    },
    skeletonItemDetail: {
        height: 14,
        backgroundColor: '#e5e7eb',
        borderRadius: 7,
        marginBottom: 6,
    },
    skeletonItemPrice: {
        width: 90,
        height: 18,
        backgroundColor: '#e5e7eb',
        borderRadius: 9,
        marginTop: 4,
    },
    skeletonVariantsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    skeletonVariant: {
        width: 50,
        height: 48,
        backgroundColor: '#e5e7eb',
        borderRadius: 10,
    },
    skeletonTotalCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1.5,
        borderColor: '#fed7aa',
    },
    skeletonTotalLabel: {
        width: 140,
        height: 18,
        backgroundColor: '#e5e7eb',
        borderRadius: 9,
        marginLeft: 12,
    },
    skeletonTotalAmount: {
        width: 110,
        height: 26,
        backgroundColor: '#e5e7eb',
        borderRadius: 13,
        marginTop: 8,
        alignSelf: 'flex-end',
    },
});

export default OrderDetailModal;
