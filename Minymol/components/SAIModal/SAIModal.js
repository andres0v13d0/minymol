import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    Alert as RNAlert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiCall } from '../../utils/apiUtils';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

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
            {/* Skeleton del monto total */}
            <View style={styles.skeletonMontoCard}>
                <Animated.View style={[styles.skeletonLabel, { opacity }]} />
                <Animated.View style={[styles.skeletonMonto, { opacity }]} />
            </View>

            {/* Skeleton de proveedores */}
            {[1, 2, 3].map((item) => (
                <View key={item} style={styles.skeletonProveedorCard}>
                    <View style={styles.skeletonProveedorHeader}>
                        <Animated.View style={[styles.skeletonIcon, { opacity }]} />
                        <Animated.View style={[styles.skeletonNombre, { opacity }]} />
                        <Animated.View style={[styles.skeletonMontoProv, { opacity }]} />
                    </View>
                    <Animated.View style={[styles.skeletonDivider, { opacity }]} />
                    <Animated.View style={[styles.skeletonDetail, { opacity }]} />
                    <Animated.View style={[styles.skeletonDetail, { opacity }]} />
                </View>
            ))}
        </View>
    );
};

const SAIModal = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [montoTotal, setMontoTotal] = useState('');
    const [modalProveedorIdx, setModalProveedorIdx] = useState(null);
    const [abonoSim, setAbonoSim] = useState('');

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;

    // Calcular el padding superior
    const getTopPadding = () => {
        if (Platform.OS === 'ios') {
            return insets.top || 50;
        } else {
            return (StatusBar.currentHeight || 24) + 10;
        }
    };

    // Manejar animaciones cuando el modal se abre/cierra
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
            fadeAnim.setValue(0);
            slideAnim.setValue(screenWidth);
        }
    }, [visible]);

    // Función para cargar proveedores
    const fetchProveedores = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiCall('https://api.minymol.com/debts/providers');

            if (!res.ok) {
                throw new Error('Error cargando proveedores');
            }

            const data = await res.json();

            // Transformar los datos del backend al formato que usa SAI
            const proveedoresFormateados = data.map(prov => ({
                id: prov.id,
                nombre: prov.name,
                deuda: prov.deudaRestante,
                abono: 0
            }));

            setProveedores(proveedoresFormateados);
        } catch (err) {
            console.error('Error al cargar proveedores:', err);
            RNAlert.alert('Error', 'No se pudieron cargar los proveedores');
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
            fetchProveedores();
            setMontoTotal('');
        }
    }, [visible]);

    // Función para formatear números con separadores de miles (puntos)
    const formatNumber = (value) => {
        if (!value) return '';
        const numbers = value.toString().replace(/\D/g, '');
        return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    // Función para obtener el valor numérico limpio
    const getCleanNumber = (value) => {
        if (!value) return 0;
        return Number(value.toString().replace(/\./g, ''));
    };

    // Saldo restante general
    const saldoRestante =
        getCleanNumber(montoTotal) -
        proveedores.reduce((acum, p) => acum + (parseInt(p.abono) || 0), 0);

    // Función para obtener el label dinámico según el estado
    const getLabelDinamico = () => {
        const montoLimpio = getCleanNumber(montoTotal);

        if (!montoTotal || montoLimpio === 0) {
            return '¿Con cuánto dinero cuentas hoy?';
        }
        if (saldoRestante === 0 && montoLimpio > 0) {
            return '¡Perfecto! Todo distribuido';
        }
        if (saldoRestante > 0) {
            return '¡Esto es lo que puedes repartir!';
        }
        if (saldoRestante < 0) {
            return '¡Te excediste del presupuesto!';
        }
        return '¿Con cuánto dinero cuentas hoy?';
    };

    // Función para obtener el color del header según el estado
    const getHeaderColor = () => {
        const montoLimpio = getCleanNumber(montoTotal);

        if (!montoTotal || montoLimpio === 0) {
            return '#fa7e17';
        }
        if (saldoRestante === 0 && montoLimpio > 0) {
            return '#10b981';
        }
        if (saldoRestante < 0) {
            return '#ef4444';
        }
        if (saldoRestante > 0) {
            return '#3b82f6';
        }
        return '#fa7e17';
    };

    // Abrir modal de proveedor
    const handleOpenModal = (idx) => {
        setModalProveedorIdx(idx);
        setAbonoSim(proveedores[idx].abono ? formatNumber(proveedores[idx].abono.toString()) : '');
    };

    // Cerrar modal de proveedor
    const handleCloseProveedorModal = () => {
        setModalProveedorIdx(null);
        setAbonoSim('');
    };

    // Guardar abono simulado
    const handleGuardarAbono = () => {
        if (modalProveedorIdx === null) return;

        const nuevoAbono = getCleanNumber(abonoSim);

        setProveedores((prev) =>
            prev.map((p, idx) =>
                idx === modalProveedorIdx ? { ...p, abono: nuevoAbono } : p
            )
        );

        handleCloseProveedorModal();
    };

    // Validación: no puede superar saldo restante + el abono actual
    const getTopeAbono = () => {
        if (modalProveedorIdx === null) return 0;
        return saldoRestante + (proveedores[modalProveedorIdx].abono || 0);
    };

    // Saldo simulado en el modal
    const getSimSaldo = () => {
        if (modalProveedorIdx === null) return 0;
        return proveedores[modalProveedorIdx].deuda - getCleanNumber(abonoSim);
    };

    // Validar si el abono excede la deuda del proveedor
    const abonoExcedeDeuda = () => {
        if (modalProveedorIdx === null) return false;
        return getCleanNumber(abonoSim) > proveedores[modalProveedorIdx].deuda;
    };

    // Reiniciar simulación
    const handleReiniciarSimulacion = () => {
        setProveedores(prev => prev.map(p => ({ ...p, abono: 0 })));
        setMontoTotal('');
    };

    // Verificar si hay abonos simulados
    const hayAbonosSimulados = () => {
        return proveedores.some(p => p.abono && p.abono > 0);
    };

    // Formatear moneda
    const formatCurrency = (value) => {
        if (!value && value !== 0) return '';
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

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
                        {/* Header del modal */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleClose}
                            >
                                <Ionicons name="chevron-back" size={24} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Método SAI</Text>
                        </View>

                        {/* Contenido del modal */}
                        <View style={styles.content}>
                            {loading ? (
                                <SkeletonLoader />
                            ) : (
                                <GestureHandlerRootView style={{ flex: 1 }}>
                                    <DraggableFlatList
                                        data={proveedores}
                                        onDragEnd={({ data }) => setProveedores(data)}
                                        keyExtractor={(item) => item.id.toString()}
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={[
                                            styles.scrollContentContainer,
                                            { paddingBottom: Math.max(insets.bottom, 20), paddingHorizontal: 16 }
                                        ]}
                                        ListHeaderComponent={
                                            <View>
                                                {/* Card del monto total */}
                                                <View style={[styles.montoCard, { backgroundColor: getHeaderColor() + '15', borderColor: getHeaderColor() }]}>
                                                    <Text style={[styles.montoLabel, { color: getHeaderColor() }]}>
                                                        {getLabelDinamico()}
                                                    </Text>
                                                    <TextInput
                                                        style={[styles.montoInput, { color: getHeaderColor() }]}
                                                        value={
                                                            saldoRestante === 0 && getCleanNumber(montoTotal) > 0
                                                                ? '$ 0'
                                                                : saldoRestante > 0
                                                                    ? '$ ' + formatNumber(saldoRestante.toString())
                                                                    : montoTotal ? '$ ' + montoTotal : ''
                                                        }
                                                        onChangeText={(text) => {
                                                            const cleaned = text.replace('$', '').trim();
                                                            setMontoTotal(formatNumber(cleaned));
                                                        }}
                                                        placeholder="$ 1.000.000"
                                                        placeholderTextColor={getHeaderColor() + '80'}
                                                        keyboardType="numeric"
                                                        editable={saldoRestante === getCleanNumber(montoTotal) || saldoRestante < 0}
                                                    />
                                                </View>

                                                {/* Botón de reiniciar */}
                                                {hayAbonosSimulados() && (
                                                    <TouchableOpacity
                                                        style={styles.resetButton}
                                                        onPress={handleReiniciarSimulacion}
                                                    >
                                                        <Ionicons name="refresh" size={16} color="#fa7e17" />
                                                        <Text style={styles.resetButtonText}>Reiniciar simulación</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        }
                                        ListEmptyComponent={
                                            <View style={styles.emptyState}>
                                                <Ionicons name="people-outline" size={64} color="#d1d5db" />
                                                <Text style={styles.emptyTitle}>No tienes proveedores</Text>
                                                <Text style={styles.emptySubtitle}>
                                                    Agrega proveedores desde la sección de Abonos Inteligentes
                                                </Text>
                                            </View>
                                        }
                                        renderItem={({ item, drag, isActive }) => {
                                            const idx = proveedores.findIndex(p => p.id === item.id);
                                            return (
                                                <ScaleDecorator>
                                                    <TouchableOpacity
                                                        onLongPress={drag}
                                                        disabled={isActive}
                                                        onPress={() => handleOpenModal(idx)}
                                                        style={[
                                                            styles.proveedorCard,
                                                            isActive && styles.proveedorCardActive
                                                        ]}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={styles.proveedorHeader}>
                                                            <Ionicons name="reorder-three" size={24} color="#9ca3af" />
                                                            <Text style={styles.proveedorNombre}>{item.nombre}</Text>
                                                            <Text style={styles.proveedorMonto}>
                                                                $ {formatCurrency(item.deuda - (item.abono || 0))}
                                                            </Text>
                                                        </View>

                                                        <View style={styles.proveedorDetails}>
                                                            <View style={styles.detailRow}>
                                                                <Ionicons name="wallet" size={16} color="#fa7e17" />
                                                                <Text style={styles.detailLabel}>Deuda total:</Text>
                                                                <Text style={styles.detailValue}>
                                                                    $ {formatCurrency(item.deuda)}
                                                                </Text>
                                                            </View>

                                                            <View style={styles.detailRow}>
                                                                <Ionicons name="cash" size={16} color="#3b82f6" />
                                                                <Text style={styles.detailLabel}>Abono simulado:</Text>
                                                                <Text style={[styles.detailValue, styles.abonoValue]}>
                                                                    $ {formatCurrency(item.abono)}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                </ScaleDecorator>
                                            );
                                        }}
                                    />
                                </GestureHandlerRootView>
                            )}
                        </View>
                    </View>
                </Animated.View>
            </View>

            {/* Modal de proveedor individual */}
            {modalProveedorIdx !== null && (
                <ProveedorAbonoModal
                    visible={modalProveedorIdx !== null}
                    proveedor={proveedores[modalProveedorIdx]}
                    abonoSim={abonoSim}
                    onAbonoSimChange={(text) => setAbonoSim(formatNumber(text.replace(/\./g, '')))}
                    onClose={handleCloseProveedorModal}
                    onSave={handleGuardarAbono}
                    topeAbono={getTopeAbono()}
                    saldoSimulado={getSimSaldo()}
                    abonoExcedeDeuda={abonoExcedeDeuda()}
                    formatCurrency={formatCurrency}
                />
            )}
        </Modal>
    );
};

// Modal para simular abono de proveedor
const ProveedorAbonoModal = ({
    visible,
    proveedor,
    abonoSim,
    onAbonoSimChange,
    onClose,
    onSave,
    topeAbono,
    saldoSimulado,
    abonoExcedeDeuda,
    formatCurrency,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    const getCleanNumber = (value) => {
        if (!value) return 0;
        return Number(value.toString().replace(/\./g, ''));
    };

    const excedeTope = getCleanNumber(abonoSim) > topeAbono;

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
            fadeAnim.setValue(0);
            slideAnim.setValue(50);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 50,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
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
                    styles.abonoModalOverlay,
                    { opacity: fadeAnim }
                ]}
            >
                <TouchableOpacity
                    style={styles.abonoModalBackdrop}
                    activeOpacity={1}
                    onPress={handleClose}
                />

                <Animated.View
                    style={[
                        styles.abonoModalContent,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim,
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.abonoModalHeader}>
                        <Text style={styles.abonoModalTitle}>{proveedor.nombre}</Text>
                        <Text style={styles.abonoModalSubtitle}>Simular abono</Text>
                    </View>

                    {/* Formulario */}
                    <ScrollView
                        style={styles.abonoModalForm}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.abonoInfoGroup}>
                            <Text style={styles.abonoInfoLabel}>Deuda actual:</Text>
                            <Text style={styles.abonoInfoValue}>
                                $ {formatCurrency(proveedor.deuda)}
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                                <Ionicons name="cash-outline" size={14} color="#6b7280" /> Simular abono de:
                            </Text>
                            <View style={[styles.inputWrapper, excedeTope && styles.inputWrapperError]}>
                                <Ionicons name="cash" size={18} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Monto a simular"
                                    placeholderTextColor="#9ca3af"
                                    value={abonoSim}
                                    onChangeText={onAbonoSimChange}
                                    keyboardType="numeric"
                                    autoFocus
                                />
                            </View>
                            {excedeTope && (
                                <Text style={styles.errorText}>
                                    El monto excede el disponible para la simulación
                                </Text>
                            )}
                            {abonoExcedeDeuda && !excedeTope && (
                                <Text style={styles.warningText}>
                                    El abono es mayor a la deuda. El proveedor quedaría con saldo a favor.
                                </Text>
                            )}
                        </View>

                        <View style={styles.abonoInfoGroup}>
                            <Text style={styles.abonoInfoLabel}>Saldo proyectado tras abono:</Text>
                            <Text style={[styles.abonoInfoValue, styles.saldoProyectado]}>
                                $ {formatCurrency(saldoSimulado)}
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Botones */}
                    <View style={styles.abonoModalActions}>
                        <TouchableOpacity
                            style={[styles.abonoModalButton, styles.cancelButton]}
                            onPress={handleClose}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.abonoModalButton,
                                styles.saveButton,
                                excedeTope && styles.saveButtonDisabled
                            ]}
                            onPress={onSave}
                            activeOpacity={0.7}
                            disabled={excedeTope}
                        >
                            <Text style={styles.saveButtonText}>Aplicar a simulación</Text>
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
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        position: 'relative',
    },
    backButton: {
        padding: 8,
        position: 'absolute',
        left: 10,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    content: {
        flex: 1,
        backgroundColor: '#f8fafc',
        paddingTop: 8,
    },

    // Skeleton loader
    skeletonContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    skeletonMontoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    skeletonLabel: {
        height: 20,
        width: '60%',
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 12,
        alignSelf: 'center',
    },
    skeletonMonto: {
        height: 40,
        width: '80%',
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
        alignSelf: 'center',
    },
    skeletonProveedorCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    skeletonProveedorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    skeletonIcon: {
        width: 24,
        height: 24,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
    },
    skeletonNombre: {
        flex: 1,
        height: 20,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
    },
    skeletonMontoProv: {
        width: 100,
        height: 24,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
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
        width: '90%',
    },

    scrollContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    scrollContentContainer: {
        paddingTop: 10,
    },

    // Card del monto total
    montoCard: {
        backgroundColor: '#fff7f0',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#fa7e17',
    },
    montoLabel: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
        marginBottom: 12,
        textAlign: 'center',
    },
    montoInput: {
        fontSize: 32,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
        textAlign: 'center',
        padding: 0,
    },

    // Botón de reiniciar
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginBottom: 16,
        gap: 6,
    },
    resetButtonText: {
        color: '#fa7e17',
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
    },

    // Card de proveedor
    proveedorCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    proveedorCardActive: {
        opacity: 0.8,
        borderColor: '#fa7e17',
        elevation: 6,
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    proveedorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    proveedorNombre: {
        flex: 1,
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    proveedorMonto: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
    },
    proveedorDetails: {
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
        gap: 10,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailLabel: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    abonoValue: {
        color: '#3b82f6',
    },

    // Estado vacío
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
        paddingHorizontal: 20,
    },

    // Modal de abono individual
    abonoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 80,
    },
    abonoModalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    abonoModalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 0,
        width: '90%',
        maxWidth: 420,
        maxHeight: '85%',
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
    },
    abonoModalHeader: {
        backgroundColor: '#fff7f0',
        paddingTop: 24,
        paddingBottom: 20,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ffe4cc',
    },
    abonoModalTitle: {
        fontSize: 22,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 6,
        textAlign: 'center',
    },
    abonoModalSubtitle: {
        fontSize: 13,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        textAlign: 'center',
    },
    abonoModalForm: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        maxHeight: 300,
    },
    abonoInfoGroup: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    abonoInfoLabel: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#6b7280',
        marginBottom: 8,
    },
    abonoInfoValue: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    saldoProyectado: {
        color: '#10b981',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#374151',
        marginBottom: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',
    },
    inputWrapperError: {
        borderColor: '#ef4444',
    },
    inputIcon: {
        marginLeft: 14,
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 14,
        fontSize: 15,
        fontFamily: getUbuntuFont('regular'),
        color: '#1f2937',
    },
    errorText: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#ef4444',
        marginTop: 6,
    },
    warningText: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#f59e0b',
        marginTop: 6,
    },
    abonoModalActions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    abonoModalButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
    },
    cancelButton: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    cancelButtonText: {
        color: '#6b7280',
        fontSize: 15,
        fontFamily: getUbuntuFont('bold'),
    },
    saveButton: {
        backgroundColor: '#fa7e17',
        elevation: 2,
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    saveButtonDisabled: {
        backgroundColor: '#d1d5db',
        elevation: 0,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: getUbuntuFont('bold'),
    },
});

export default SAIModal;
