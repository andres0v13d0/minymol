import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiCall } from '../../utils/apiUtils';
import { getUbuntuFont } from '../../utils/fonts';

const statusLabels = {
    pending: 'Pendiente',
    processing: 'Procesando',
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

const API_BASE_URL = 'https://api.minymol.com';

const OrderCard = ({ id, status, total, cantidad, images, onPress }) => {
    const [nombreMostrar, setNombreMostrar] = useState('Cargando...');
    const [fechaHora, setFechaHora] = useState({ fecha: '', hora: '' });
    const [ordenNumProveedor, setOrdenNumProveedor] = useState('');
    const [loading, setLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState({});
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Animación de pulso para skeleton
        if (loading) {
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
        }
    }, [loading]);

    const skeletonOpacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    useEffect(() => {
        const fetchDatosOrden = async () => {
            try {
                setLoading(true);
                const res = await apiCall(`${API_BASE_URL}/orders/${id}`);

                if (!res.ok) throw new Error('Error al obtener la orden');
                const data = await res.json();

                const nombreProveedor = data?.provider?.nombre_empresa;
                setOrdenNumProveedor(data?.providerOrderNumber || '—');
                setNombreMostrar(nombreProveedor ? `${nombreProveedor}` : 'Desconocido');

                const fechaActualizada = new Date(data.updatedAt);
                setFechaHora({
                    fecha: fechaActualizada.toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }),
                    hora: fechaActualizada.toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                });
            } catch (error) {
                console.error('Error al cargar orden:', error);
                setNombreMostrar('Desconocido');
                setFechaHora({ fecha: '—', hora: '—' });
            } finally {
                setLoading(false);
            }
        };

        fetchDatosOrden();
    }, [id]);

    const statusColor = statusColors[status] || '#6b7280';

    return (
        <TouchableOpacity
            style={styles.orderCard}
            onPress={() => onPress && onPress(id)}
            activeOpacity={0.7}
        >
            {/* Header con fecha y estado */}
            <View style={styles.orderHeader}>
                <View style={styles.orderTime}>
                    {loading ? (
                        <>
                            <Animated.View style={[styles.skeletonDate, { opacity: skeletonOpacity }]} />
                            <Animated.View style={[styles.skeletonHour, { opacity: skeletonOpacity }]} />
                        </>
                    ) : (
                        <>
                            <Text style={styles.orderDate}>{fechaHora.fecha}</Text>
                            <Text style={styles.orderHour}>{fechaHora.hora}</Text>
                        </>
                    )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {statusLabels[status] || status}
                    </Text>
                </View>
            </View>

            {/* Número de pedido */}
            {loading ? (
                <Animated.View style={[styles.skeletonOrderNum, { opacity: skeletonOpacity }]} />
            ) : (
                <Text style={styles.orderNum}>Pedido #{ordenNumProveedor}</Text>
            )}

            {/* Nombre del proveedor */}
            <View style={styles.providerContainer}>
                <Ionicons name="storefront" size={16} color="#6b7280" />
                <Text style={styles.orderClient}>{nombreMostrar}</Text>
            </View>

            {/* Items del pedido */}
            <View style={styles.orderItems}>
                {/* Imágenes de productos */}
                <View style={styles.orderImagesWrapper}>
                    <View style={styles.orderImages}>
                        {images.slice(0, 4).map((img, index) => {
                            const imageUrl = imageErrors[index] || !img 
                                ? 'https://cdn.minymol.com/uploads/logoblanco.webp' 
                                : img;
                            
                            return (
                                <View key={index} style={styles.imageContainer}>
                                    <Image
                                        source={{ uri: imageUrl }}
                                        style={styles.productImage}
                                        onError={() => {
                                            setImageErrors(prev => ({ ...prev, [index]: true }));
                                        }}
                                    />
                                </View>
                            );
                        })}
                        {images.length > 4 && (
                            <View style={[styles.imageContainer, styles.moreImagesOverlay]}>
                                <Text style={styles.moreImagesText}>+{images.length - 4}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Información de precio y cantidad */}
                <View style={styles.orderInfo}>
                    <Text style={styles.orderTotal}>
                        ${(Math.floor(Number(total.replace(/\./g, '')) / 100) * 100).toLocaleString('es-CO')}
                    </Text>
                    <Text style={styles.orderQuantity}>{cantidad} productos</Text>
                </View>

                {/* Botón de chevron */}
                <View style={styles.chevronButton}>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    orderCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderTime: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    orderDate: {
        fontSize: 13,
        color: '#64748b',
        fontFamily: getUbuntuFont('medium'),
    },
    orderHour: {
        fontSize: 12,
        color: '#94a3b8',
        fontFamily: getUbuntuFont('regular'),
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontFamily: getUbuntuFont('bold'),
        textTransform: 'capitalize',
    },
    orderNum: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 8,
    },
    providerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    orderClient: {
        fontSize: 14,
        color: '#6b7280',
        fontFamily: getUbuntuFont('medium'),
    },
    orderItems: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    orderImagesWrapper: {
        flex: 1,
    },
    orderImages: {
        flexDirection: 'row',
        gap: 6,
    },
    imageContainer: {
        width: 48,
        height: 48,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    productImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    moreImagesOverlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreImagesText: {
        color: '#ffffff',
        fontSize: 12,
        fontFamily: getUbuntuFont('bold'),
    },
    orderInfo: {
        alignItems: 'flex-end',
    },
    orderTotal: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 2,
    },
    orderQuantity: {
        fontSize: 12,
        color: '#94a3b8',
        fontFamily: getUbuntuFont('regular'),
    },
    chevronButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Skeleton styles
    skeletonDate: {
        width: 70,
        height: 13,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
    },
    skeletonHour: {
        width: 50,
        height: 12,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
    },
    skeletonOrderNum: {
        width: 120,
        height: 18,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 8,
    },
});

export default OrderCard;
