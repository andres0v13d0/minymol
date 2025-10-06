import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
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
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiCall } from '../../utils/apiUtils';
import { getUbuntuFont } from '../../utils/fonts';
import DebtHistoryModal from '../DebtHistoryModal';

const { width: screenWidth } = Dimensions.get('window');

// Estados/pestañas disponibles
const DEBT_TABS = [
    { key: 'todos', label: 'Todos', value: null },
    { key: 'mora', label: 'Mora', value: 'mora' },
    { key: 'aldia', label: 'Al día', value: 'aldia' },
];

// Componente Skeleton animado
const SkeletonLoader = () => {
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
            {[1, 2, 3].map((item) => (
                <View key={item} style={styles.skeletonCard}>
                    <View style={styles.skeletonHeader}>
                        <Animated.View style={[styles.skeletonName, { opacity }]} />
                        <Animated.View style={[styles.skeletonAmount, { opacity }]} />
                    </View>
                    <Animated.View style={[styles.skeletonDivider, { opacity }]} />
                    <Animated.View style={[styles.skeletonDetail, { opacity }]} />
                    <Animated.View style={[styles.skeletonDetail, { opacity }]} />
                </View>
            ))}
        </View>
    );
};

const ReportsModal = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentTabIndex, setCurrentTabIndex] = useState(0); // Índice de la pestaña actual
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [modalData, setModalData] = useState({
        provider: null,
        history: [],
    });

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;
    const tabFlatListRef = useRef(null);

    // Calcular el padding superior
    const getTopPadding = () => {
        if (Platform.OS === 'ios') {
            return Math.max(insets.top, 20);
        } else {
            return StatusBar.currentHeight || 0;
        }
    };

    // Manejar animaciones cuando el modal se abre/cierra
    useEffect(() => {
        if (visible) {
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
        } else {
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
            ]).start();
        }
    }, [visible]);

    // Función para cargar proveedores
    const fetchProviders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiCall('https://api.minymol.com/debts/providers');
            const data = await response.json();
            setProviders(data || []);
        } catch (err) {
            console.error('Error cargando proveedores:', err);
            Alert.alert('Error', 'No se pudieron cargar los proveedores');
            setProviders([]);
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

    // Cargar proveedores cuando se abre el modal
    useEffect(() => {
        if (visible) {
            fetchProviders();
        }
    }, [visible]);

    // Refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProviders();
        setRefreshing(false);
    };

    // Función para filtrar proveedores por pestaña
    const getFilteredProviders = useCallback((tabIndex) => {
        const currentTab = DEBT_TABS[tabIndex];
        if (!currentTab.value) {
            return providers; // Todos
        }
        
        if (currentTab.value === 'mora') {
            return providers.filter(p => p.estado === 'mora');
        }
        
        if (currentTab.value === 'aldia') {
            return providers.filter(p => p.estado === 'aldia' || p.estado === 'deuda' || p.estado !== 'mora');
        }
        
        return providers;
    }, [providers]);

    // Manejar cambio de pestaña desde la barra de navegación
    const handleTabPress = useCallback((tabIndex) => {
        if (tabIndex !== currentTabIndex) {
            setCurrentTabIndex(tabIndex);
            
            // Sincronizar FlatList horizontal
            if (tabFlatListRef.current) {
                tabFlatListRef.current.scrollToIndex({
                    index: tabIndex,
                    animated: true
                });
            }
        }
    }, [currentTabIndex]);

    // Manejar scroll del FlatList horizontal
    const handleTabScroll = useCallback((event) => {
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
        if (newIndex !== currentTabIndex && newIndex >= 0 && newIndex < DEBT_TABS.length) {
            setCurrentTabIndex(newIndex);
        }
    }, [currentTabIndex]);

    // Calcular resumen
    const deudaTotal = providers.reduce((sum, p) => sum + p.deudaRestante, 0);
    const countMora = providers.filter(p => p.estado === 'mora').length;
    const nextDue = providers
        .map(p => p.deudaMasAntigua)
        .filter(d => d)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] || 'Sin pendientes';

    // Formatear número
    const formatNumber = (num) => {
        return num.toLocaleString('es-CO');
    };

    // Abrir historial de deuda
    const openHistoryModal = async (prov) => {
        try {
            const response = await apiCall(`https://api.minymol.com/movements/by-provider/${prov.id}`);
            const data = await response.json();
            setModalData(data);
            setShowHistoryModal(true);
        } catch (err) {
            console.error('Error cargando historial:', err);
            Alert.alert('Error', 'No se pudo cargar el historial de movimientos');
        }
    };

    // Renderizar card de proveedor
    const renderProviderCard = (prov) => (
        <TouchableOpacity
            key={prov.id}
            style={styles.debtCard}
            onPress={() => openHistoryModal(prov)}
            activeOpacity={0.7}
        >
            <View style={styles.debtHeader}>
                <View style={styles.providerIconContainer}>
                    <Ionicons name="person" size={24} color="#fa7e17" />
                </View>
                <View style={styles.providerHeaderInfo}>
                    <Text style={styles.providerName}>{prov.name}</Text>
                    <Text style={styles.providerPhone}>{prov.phone}</Text>
                </View>
                <View style={styles.debtAmountContainer}>
                    <Text style={[styles.debtAmount, prov.deudaRestante === 0 && styles.debtAmountZero]}>
                        ${formatNumber(prov.deudaRestante)}
                    </Text>
                </View>
            </View>

            <View style={styles.debtDivider} />

            <View style={styles.debtInfo}>
                <View style={styles.debtInfoItem}>
                    <View style={[
                        styles.infoIcon,
                        prov.estado === 'mora' ? styles.infoIconDanger : styles.infoIconSuccess
                    ]}>
                        <Ionicons
                            name={prov.estado === 'mora' ? 'hourglass-outline' : 'calendar-outline'}
                            size={16}
                            color={prov.estado === 'mora' ? '#ef4444' : '#3b82f6'}
                        />
                    </View>
                    <Text style={styles.infoText}>
                        {prov.deudaMasAntigua
                            ? `${prov.estado === 'mora' ? 'Vence en' : 'Vence el'}: ${prov.deudaMasAntigua}`
                            : 'No tiene deuda'}
                    </Text>
                </View>

                <View style={styles.debtInfoItem}>
                    <View style={[
                        styles.infoIcon,
                        prov.estado === 'mora' ? styles.infoIconDanger : styles.infoIconSuccess
                    ]}>
                        <Ionicons
                            name={prov.estado === 'mora' ? 'alert-circle' : 'checkmark-circle'}
                            size={16}
                            color={prov.estado === 'mora' ? '#ef4444' : '#10b981'}
                        />
                    </View>
                    <Text style={styles.infoText}>
                        Estado: {prov.estado === 'mora' ? 'Mora' : 'Al día'}
                    </Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.cardFooterText}>Toca para ver historial</Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
        </TouchableOpacity>
    );

    // Renderizar estado vacío
    const renderEmpty = () => (
        <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
                No hay proveedores
            </Text>
            <Text style={styles.emptySubtitle}>
                {currentTabIndex === 0
                    ? 'No tienes proveedores registrados'
                    : `No hay proveedores en ${DEBT_TABS[currentTabIndex].label.toLowerCase()}`}
            </Text>
        </View>
    );

    // Renderizar página de pestaña
    const renderTabPage = useCallback(({ item: tabIndex }) => {
        const filteredProviders = getFilteredProviders(tabIndex)
            .sort((a, b) => b.deudaRestante - a.deudaRestante);

        return (
            <View style={[styles.tabPage, { width: screenWidth }]}>
                <FlatList
                    data={filteredProviders}
                    renderItem={({ item }) => renderProviderCard(item)}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={[
                        styles.listContent,
                        filteredProviders.length === 0 && styles.listContentEmpty,
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
    }, [getFilteredProviders, refreshing, onRefresh, insets.bottom, currentTabIndex]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent={true}
        >
            <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" />
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
                                <Ionicons name="chevron-back" size={24} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Informes de deuda</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        {/* Content */}
                        <View style={styles.content}>
                            {/* Summary Card */}
                            <View style={[
                                styles.summaryCard,
                                deudaTotal === 0 && styles.summaryCardZero
                            ]}>
                                <View style={styles.summaryHeader}>
                                    <Text style={styles.summaryTitle}>Deuda Total</Text>
                                    <Text style={styles.summaryAmount}>
                                        ${formatNumber(deudaTotal)}
                                    </Text>
                                </View>
                                <View style={styles.summaryDetails}>
                                    <View style={styles.summaryDetailItem}>
                                        <View style={styles.summaryIcon}>
                                            <Ionicons name="warning" size={18} color="#ef4444" />
                                        </View>
                                        <Text style={styles.summaryDetailText}>
                                            Proveedores en mora: {countMora}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryDetailItem}>
                                        <View style={styles.summaryIcon}>
                                            <Ionicons name="calendar" size={18} color="#3b82f6" />
                                        </View>
                                        <Text style={styles.summaryDetailText}>
                                            Próximo pago: {nextDue}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Tabs */}
                            <View style={styles.tabsContainer}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.tabsScrollContent}
                                >
                                    {DEBT_TABS.map((tab, index) => (
                                        <TouchableOpacity
                                            key={tab.key}
                                            style={[
                                                styles.tabButton,
                                                currentTabIndex === index && styles.tabButtonActive
                                            ]}
                                            onPress={() => handleTabPress(index)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.tabText,
                                                currentTabIndex === index && styles.tabTextActive
                                            ]}>
                                                {tab.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* List con scroll horizontal por pestaña */}
                            {loading && providers.length === 0 ? (
                                <SkeletonLoader />
                            ) : (
                                <FlatList
                                    ref={tabFlatListRef}
                                    data={DEBT_TABS.map((_, index) => index)}
                                    renderItem={renderTabPage}
                                    keyExtractor={(item) => `tab-${item}`}
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    onMomentumScrollEnd={handleTabScroll}
                                    getItemLayout={(data, index) => ({
                                        length: screenWidth,
                                        offset: screenWidth * index,
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

            {/* Debt History Modal */}
            <DebtHistoryModal
                visible={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                provider={modalData.provider || { name: '', totalPaid: 0, status: 'aldia' }}
                history={modalData.history || []}
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
        backgroundColor: '#f8fafc',
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
        paddingVertical: 10,
        backgroundColor: '#f8fafc',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    content: {
        flex: 1,
        backgroundColor: '#f8fafc',
        paddingTop: 8,
    },

    // Summary Card
    summaryCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#ef4444',
        elevation: 3,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    summaryCardZero: {
        borderColor: '#10b981',
        shadowColor: '#10b981',
    },
    summaryHeader: {
        marginBottom: 16,
    },
    summaryTitle: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#6b7280',
        marginBottom: 8,
    },
    summaryAmount: {
        fontSize: 32,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    summaryDetails: {
        gap: 12,
    },
    summaryDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    summaryIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryDetailText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#4b5563',
        flex: 1,
    },

    // Tabs
    tabsContainer: {
        backgroundColor: '#ffffff',
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tabsScrollContent: {
        paddingHorizontal: 10,
        alignItems: 'center',
        flexDirection: 'row',
        minWidth: '100%',
    },
    tabButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        minWidth: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabButtonActive: {
        backgroundColor: '#fa7e17',
        transform: [{ scale: 1.05 }],
    },
    tabText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#6b7280',
        textAlign: 'center',
    },
    tabTextActive: {
        color: '#fff',
        fontFamily: getUbuntuFont('bold'),
    },
    tabPage: {
        flex: 1,
    },
    listContent: {
        padding: 16,
    },
    listContentEmpty: {
        flex: 1,
    },

    // Skeleton
    skeletonContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    skeletonCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    skeletonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    skeletonName: {
        height: 20,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        width: '50%',
    },
    skeletonAmount: {
        height: 20,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        width: '30%',
    },
    skeletonDivider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginBottom: 12,
    },
    skeletonDetail: {
        height: 16,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 8,
        width: '70%',
    },

    // Debt Cards
    debtCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    debtHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    providerIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff7f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    providerHeaderInfo: {
        flex: 1,
    },
    providerName: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 2,
    },
    providerPhone: {
        fontSize: 13,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
    },
    debtAmountContainer: {
        marginLeft: 8,
    },
    debtAmount: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#ef4444',
    },
    debtAmountZero: {
        color: '#10b981',
    },
    debtDivider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginBottom: 12,
    },
    debtInfo: {
        gap: 8,
        marginBottom: 12,
    },
    debtInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoIconDanger: {
        backgroundColor: '#fef2f2',
    },
    infoIconSuccess: {
        backgroundColor: '#f0fdf4',
    },
    infoText: {
        fontSize: 13,
        fontFamily: getUbuntuFont('regular'),
        color: '#4b5563',
        flex: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        gap: 4,
    },
    cardFooterText: {
        fontSize: 12,
        fontFamily: getUbuntuFont('medium'),
        color: '#9ca3af',
    },

    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#6b7280',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#9ca3af',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
});

export default ReportsModal;
