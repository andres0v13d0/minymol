import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiCall } from '../../utils/apiUtils';
import { getUbuntuFont } from '../../utils/fonts';
import CustomPicker from '../CustomPicker/CustomPicker';
import SignaturePad from './SignaturePad';
import SuccessModal from './SuccessModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MovementsModal = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();

    // Estados principales
    const [providers, setProviders] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [movementType, setMovementType] = useState('abono'); // 'abono' o 'deuda'
    const [paymentMethod, setPaymentMethod] = useState('presencial'); // 'presencial' o 'transferencia'

    // Estados del formulario
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [days, setDays] = useState('');
    const [transferReference, setTransferReference] = useState('');

    // Estados de firma
    const [signatureData, setSignatureData] = useState(null);
    const [isSigning, setIsSigning] = useState(false);

    // Estados de carga y éxito
    const [loading, setLoading] = useState(false);
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [savedMovementData, setSavedMovementData] = useState(null);

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;

    // Calcular padding superior
    const getTopPadding = () => {
        if (Platform.OS === 'ios') {
            return insets.top > 0 ? insets.top : 44;
        } else {
            return insets.top > 0 ? insets.top : 0;
        }
    };

    // Animaciones de apertura/cierre
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

    // Cargar proveedores
    useEffect(() => {
        if (visible) {
            fetchProviders();
        }
    }, [visible]);

    const fetchProviders = async () => {
        setLoadingProviders(true);
        try {
            console.log('� Cargando proveedores...');
            
            const response = await apiCall('https://api.minymol.com/debts/providers');

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                throw new Error(`Error cargando proveedores (${response.status})`);
            }

            const data = await response.json();
            console.log('✅ Proveedores cargados:', data.length);
            console.log('📋 Primeros datos:', data.length > 0 ? JSON.stringify(data[0], null, 2) : 'Sin datos');
            setProviders(data);
        } catch (error) {
            console.error('❌ Error cargando proveedores:', error);
            Alert.alert('Error', error.message || 'No se pudieron cargar los proveedores');
        } finally {
            setLoadingProviders(false);
        }
    };

    // Cerrar modal
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
            // Reset form
            setSelectedProvider(null);
            setMovementType('abono');
            setPaymentMethod('presencial');
            setAmount('');
            setDescription('');
            setDays('');
            setTransferReference('');
            setSignatureData(null);
            onClose();
        });
    };

    // Formatear número
    const formatNumber = (num) => {
        if (!num) return '';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    // Manejar cambio de monto
    const handleAmountChange = (text) => {
        const cleanValue = text.replace(/\D/g, '');
        setAmount(cleanValue);
    };

    // Validar formulario
    const isValid = () => {
        if (!selectedProvider || !amount) return false;
        if (movementType === 'deuda' && !days) return false;
        if (movementType === 'abono' && parseFloat(amount) > selectedProvider.deudaRestante) return false;
        if (movementType === 'abono' && paymentMethod === 'presencial' && !signatureData) return false;
        if (movementType === 'abono' && paymentMethod === 'transferencia' && !transferReference) return false;
        return true;
    };

    // Enviar movimiento
    const handleSubmit = async () => {
        if (!isValid()) return;

        setLoading(true);
        try {
            const payload = {
                providerId: selectedProvider.id,
                type: movementType,
                amount: parseFloat(amount),
                description: description || '',
                ...(movementType === 'deuda' && { dueInDays: parseInt(days, 10) }),
                ...(movementType === 'abono' && {
                    paymentMethod,
                    ...(paymentMethod === 'transferencia' && { transferReference }),
                }),
            };

            console.log('📤 Enviando movimiento:', payload);

            const response = await apiCall('https://api.minymol.com/movements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('❌ Error al registrar:', errorData);
                throw new Error('Error al registrar movimiento');
            }

            console.log('✅ Movimiento registrado');

            // Guardar datos para el comprobante
            const movementData = {
                ...payload,
                provider: selectedProvider,
                signatureData: paymentMethod === 'presencial' ? signatureData : null,
                date: new Date().toLocaleString('es-CO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            };

            if (movementType === 'deuda') {
                Alert.alert('Éxito', 'Movimiento registrado correctamente');
                handleClose();
            } else {
                // Mostrar modal de éxito con comprobante
                setSavedMovementData(movementData);
                setShowSuccess(true);
            }

        } catch (error) {
            console.error('Error:', error);
            Alert.alert('Error', error.message || 'No se pudo registrar el movimiento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal
                visible={visible && !showSuccess}
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
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.container}
                        >
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={handleClose}
                                >
                                    <Ionicons name="chevron-back" size={24} color="#333" />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>Registrar movimiento</Text>
                            </View>

                            {/* Content */}
                            <ScrollView
                                style={styles.content}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                scrollEnabled={!isSigning}
                            >
                                {/* Selector de proveedor */}
                                <View style={styles.section}>
                                    <Text style={styles.label}>Proveedor</Text>
                                    
                                    {loadingProviders ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="small" color="#fa7e17" />
                                            <Text style={styles.loadingText}>Cargando proveedores...</Text>
                                        </View>
                                    ) : providers.length === 0 ? (
                                        <View style={styles.emptyContainer}>
                                            <Ionicons name="alert-circle-outline" size={40} color="#d1d5db" />
                                            <Text style={styles.emptyTitle}>No hay proveedores</Text>
                                            <Text style={styles.emptyText}>
                                                Debes agregar proveedores primero en la sección "Proveedores"
                                            </Text>
                                        </View>
                                    ) : (
                                        <>
                                            <CustomPicker
                                                selectedValue={selectedProvider?.id || null}
                                                onValueChange={(value) => {
                                                    const provider = providers.find(p => p.id === value);
                                                    setSelectedProvider(provider);
                                                }}
                                                items={providers.map(provider => ({
                                                    label: provider.name,
                                                    value: provider.id
                                                }))}
                                                placeholder="Selecciona un proveedor"
                                            />

                                            {selectedProvider && (
                                                <View style={styles.providerSummary}>
                                                    <View style={styles.summaryRow}>
                                                        <Text style={styles.summaryLabel}>{selectedProvider.name}</Text>
                                                        <Text style={[styles.summaryValue, selectedProvider.deudaRestante > 0 && styles.debtValue]}>
                                                            ${formatNumber(selectedProvider.deudaRestante)}
                                                        </Text>
                                                    </View>
                                                    {selectedProvider.lastMovement && (
                                                        <Text style={styles.summarySubtext}>
                                                            Últ. mov: {selectedProvider.lastMovement} · {selectedProvider.lastType}
                                                        </Text>
                                                    )}
                                                </View>
                                            )}
                                        </>
                                    )}
                                </View>

                                {/* Tipo de movimiento */}
                                <View style={styles.section}>
                                    <Text style={styles.label}>Tipo de movimiento</Text>
                                    <View style={styles.tabSelector}>
                                        <TouchableOpacity
                                            style={[styles.tab, movementType === 'abono' && styles.tabActive]}
                                            onPress={() => setMovementType('abono')}
                                        >
                                            <Text style={[styles.tabText, movementType === 'abono' && styles.tabTextActive]}>
                                                Abono
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.tab, movementType === 'deuda' && styles.tabActive]}
                                            onPress={() => setMovementType('deuda')}
                                        >
                                            <Text style={[styles.tabText, movementType === 'deuda' && styles.tabTextActive]}>
                                                Compra
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Monto */}
                                <View style={styles.section}>
                                    <Text style={styles.label}>Valor del movimiento</Text>
                                    <View style={styles.inputGroup}>
                                        <Ionicons name="cash-outline" size={20} color="#fa7e17" />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="0"
                                            keyboardType="numeric"
                                            value={formatNumber(amount)}
                                            onChangeText={handleAmountChange}
                                        />
                                    </View>
                                </View>

                                {/* Descripción */}
                                <View style={styles.section}>
                                    <Text style={styles.label}>Descripción (opcional)</Text>
                                    <View style={styles.inputGroup}>
                                        <Ionicons name="document-text-outline" size={20} color="#fa7e17" />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Descripción del movimiento"
                                            value={description}
                                            onChangeText={setDescription}
                                        />
                                    </View>
                                </View>

                                {/* Días (solo para deuda) */}
                                {movementType === 'deuda' && (
                                    <View style={styles.section}>
                                        <Text style={styles.label}>Días para pagar</Text>
                                        <View style={styles.inputGroup}>
                                            <Ionicons name="calendar-outline" size={20} color="#fa7e17" />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="0"
                                                keyboardType="numeric"
                                                value={days}
                                                onChangeText={setDays}
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* Método de pago (solo para abono) */}
                                {movementType === 'abono' && (
                                    <>
                                        <View style={styles.section}>
                                            <Text style={styles.label}>Método de pago</Text>
                                            <View style={styles.paymentMethodSelector}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.paymentMethod,
                                                        paymentMethod === 'presencial' && styles.paymentMethodActive
                                                    ]}
                                                    onPress={() => setPaymentMethod('presencial')}
                                                >
                                                    <Ionicons
                                                        name="hand-left-outline"
                                                        size={24}
                                                        color={paymentMethod === 'presencial' ? '#fa7e17' : '#6b7280'}
                                                    />
                                                    <Text style={[
                                                        styles.paymentMethodText,
                                                        paymentMethod === 'presencial' && styles.paymentMethodTextActive
                                                    ]}>
                                                        Presencial
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[
                                                        styles.paymentMethod,
                                                        paymentMethod === 'transferencia' && styles.paymentMethodActive
                                                    ]}
                                                    onPress={() => setPaymentMethod('transferencia')}
                                                >
                                                    <Ionicons
                                                        name="card-outline"
                                                        size={24}
                                                        color={paymentMethod === 'transferencia' ? '#fa7e17' : '#6b7280'}
                                                    />
                                                    <Text style={[
                                                        styles.paymentMethodText,
                                                        paymentMethod === 'transferencia' && styles.paymentMethodTextActive
                                                    ]}>
                                                        Transferencia
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Firma (presencial) */}
                                        {paymentMethod === 'presencial' && (
                                            <View style={styles.section}>
                                                <Text style={styles.label}>Firma del proveedor</Text>
                                                <SignaturePad 
                                                    onSave={setSignatureData}
                                                    onBegin={() => setIsSigning(true)}
                                                    onEnd={() => setIsSigning(false)}
                                                />
                                            </View>
                                        )}

                                        {/* Referencia (transferencia) */}
                                        {paymentMethod === 'transferencia' && (
                                            <View style={styles.section}>
                                                <Text style={styles.label}>Referencia de transferencia</Text>
                                                <View style={styles.inputGroup}>
                                                    <Ionicons name="receipt-outline" size={20} color="#fa7e17" />
                                                    <TextInput
                                                        style={styles.input}
                                                        placeholder="Número de comprobante"
                                                        value={transferReference}
                                                        onChangeText={setTransferReference}
                                                    />
                                                </View>
                                            </View>
                                        )}
                                    </>
                                )}

                                {/* Botón de envío */}
                                <TouchableOpacity
                                    style={[
                                        styles.submitButton,
                                        (!isValid() || loading) && styles.submitButtonDisabled
                                    ]}
                                    onPress={handleSubmit}
                                    disabled={!isValid() || loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                            <Text style={styles.submitButtonText}>Confirmar movimiento</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </Animated.View>
                </View>
            </Modal>

            {/* Modal de éxito con comprobante */}
            {showSuccess && savedMovementData && (
                <SuccessModal
                    visible={showSuccess}
                    movementData={savedMovementData}
                    onClose={() => {
                        setShowSuccess(false);
                        setSavedMovementData(null);
                        // NO llamar handleClose aquí, solo cerrar el SuccessModal
                    }}
                />
            )}
        </>
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
    },
    container: {
        flex: 1,
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
        paddingHorizontal: 16,
    },
    section: {
        marginTop: 20,
    },
    label: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#374151',
        marginBottom: 8,
    },
    providerSummary: {
        backgroundColor: '#fff7f0',
        padding: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#1f2937',
    },
    summaryValue: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    debtValue: {
        color: '#ef4444',
    },
    summarySubtext: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        marginTop: 4,
    },
    loadingContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingVertical: 40,
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
    },
    emptyContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#6b7280',
        marginTop: 8,
    },
    emptyText: {
        fontSize: 13,
        fontFamily: getUbuntuFont('regular'),
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 18,
    },
    tabSelector: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: '#fa7e17',
    },
    tabText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#6b7280',
    },
    tabTextActive: {
        color: '#fff',
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        fontFamily: getUbuntuFont('regular'),
        color: '#1f2937',
    },
    paymentMethodSelector: {
        flexDirection: 'row',
        gap: 12,
    },
    paymentMethod: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        gap: 8,
    },
    paymentMethodActive: {
        borderColor: '#fa7e17',
        backgroundColor: '#fff7f0',
    },
    paymentMethodText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#6b7280',
    },
    paymentMethodTextActive: {
        color: '#fa7e17',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fa7e17',
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 24,
        gap: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#d1d5db',
    },
    submitButtonText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#fff',
    },
});

export default MovementsModal;
