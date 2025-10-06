import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

const DebtHistoryModal = ({ visible, onClose, provider, history }) => {
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        if (visible) {
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
            slideAnim.setValue(50);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 50,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const formatNumber = (num) => {
        return num?.toLocaleString('es-CO') || '0';
    };

    const handleDeleteMovement = (index) => {
        Alert.alert(
            'Anular movimiento',
            '¿Estás seguro de que deseas anular este movimiento?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Anular',
                    style: 'destructive',
                    onPress: () => {
                        // Aquí implementarías la lógica para anular el movimiento
                        console.log('Anular movimiento:', index);
                    },
                },
            ]
        );
    };

    const getStatusColor = (status) => {
        const statusLower = status?.toLowerCase();
        if (statusLower === 'pendiente' || statusLower === 'mora') return '#ef4444';
        if (statusLower === 'pagado' || statusLower === 'aldia') return '#10b981';
        return '#6b7280';
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
        >
            <Animated.View
                style={[
                    styles.modalOverlay,
                    { opacity: fadeAnim }
                ]}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={handleClose}
                />

                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim,
                            paddingBottom: Math.max(insets.bottom, 20),
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.headerTop}>
                            <View style={styles.headerIconContainer}>
                                <View style={styles.headerIconCircle}>
                                    <Ionicons name="document-text" size={28} color="#fa7e17" />
                                </View>
                            </View>
                            <View style={styles.headerInfo}>
                                <Text style={styles.modalTitle}>{provider.name}</Text>
                                <View style={styles.headerBadges}>
                                    <View style={styles.totalBadge}>
                                        <Text style={styles.totalLabel}>Total pagado: </Text>
                                        <Text style={styles.totalValue}>${formatNumber(provider.totalPaid || 0)}</Text>
                                    </View>
                                    <View style={[
                                        styles.statusBadge,
                                        provider.status === 'deuda' ? styles.statusBadgeDanger : styles.statusBadgeSuccess
                                    ]}>
                                        <Text style={[
                                            styles.statusBadgeText,
                                            provider.status === 'deuda' ? styles.statusBadgeTextDanger : styles.statusBadgeTextSuccess
                                        ]}>
                                            {provider.status === 'deuda' ? 'En mora' : 'Al día'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* History List */}
                    <ScrollView
                        style={styles.historyList}
                        showsVerticalScrollIndicator={false}
                    >
                        {history.length > 0 ? (
                            history.map((item, index) => (
                                <View key={index} style={styles.historyItem}>
                                    <View style={styles.historyLeft}>
                                        <Text style={styles.historyDate}>{item.date}</Text>
                                        <Text style={styles.historyType}>
                                            {item.type === 'Deuda nueva' && item.description ? item.description : item.type}
                                        </Text>
                                    </View>
                                    <View style={styles.historyRight}>
                                        <View style={[
                                            styles.historyStatusBadge,
                                            { backgroundColor: `${getStatusColor(item.status)}15` }
                                        ]}>
                                            <Text style={[
                                                styles.historyStatus,
                                                { color: getStatusColor(item.status) }
                                            ]}>
                                                {item.status}
                                            </Text>
                                        </View>
                                        <Text style={styles.historyAmount}>${formatNumber(item.amount)}</Text>
                                    </View>
                                    <View style={styles.historyActions}>
                                        {index === 0 && (
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() => handleDeleteMovement(index)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="document-outline" size={48} color="#d1d5db" />
                                <Text style={styles.emptyText}>Sin movimientos registrados</Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer Buttons */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[styles.footerButton, styles.closeButton]}
                            onPress={handleClose}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.closeButtonText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%',
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
    },
    modalHeader: {
        backgroundColor: '#fff7f0',
        paddingTop: 24,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ffe4cc',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    headerIconContainer: {
        marginTop: 4,
    },
    headerIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    headerInfo: {
        flex: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 8,
    },
    headerBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
    },
    totalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 13,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
    },
    totalValue: {
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeDanger: {
        backgroundColor: '#fef2f2',
    },
    statusBadgeSuccess: {
        backgroundColor: '#f0fdf4',
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: getUbuntuFont('bold'),
    },
    statusBadgeTextDanger: {
        color: '#ef4444',
    },
    statusBadgeTextSuccess: {
        color: '#10b981',
    },

    // History List
    historyList: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    historyItem: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    historyLeft: {
        flex: 1,
    },
    historyDate: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        marginBottom: 4,
    },
    historyType: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#1f2937',
    },
    historyRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    historyStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    historyStatus: {
        fontSize: 11,
        fontFamily: getUbuntuFont('bold'),
        textTransform: 'capitalize',
    },
    historyAmount: {
        fontSize: 15,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    historyActions: {
        width: 40,
        alignItems: 'center',
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fef2f2',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Empty State
    emptyState: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        fontFamily: getUbuntuFont('regular'),
        color: '#9ca3af',
        marginTop: 12,
    },

    // Footer
    modalFooter: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        backgroundColor: '#fff',
    },
    footerButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    closeButton: {
        backgroundColor: '#fa7e17',
        elevation: 2,
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
    },
});

export default DebtHistoryModal;
