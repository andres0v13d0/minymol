import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    Alert as RNAlert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiCall } from '../../utils/apiUtils';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
            {/* Skeleton de cards de proveedores */}
            {[1, 2, 3, 4].map((item) => (
                <View key={item} style={styles.skeletonProviderCard}>
                    <View style={styles.skeletonProviderHeader}>
                        <Animated.View style={[styles.skeletonIconCircle, { opacity }]} />
                        <View style={styles.skeletonProviderInfo}>
                            <Animated.View style={[styles.skeletonProviderName, { opacity }]} />
                            <Animated.View style={[styles.skeletonProviderPhone, { opacity }]} />
                        </View>
                    </View>
                    <Animated.View style={[styles.skeletonDivider, { opacity }]} />
                    <Animated.View style={[styles.skeletonDetail, { opacity }]} />
                    <Animated.View style={[styles.skeletonDetailSmall, { opacity }]} />
                    <View style={styles.skeletonActions}>
                        <Animated.View style={[styles.skeletonActionButton, { opacity }]} />
                        <Animated.View style={[styles.skeletonActionButton, { opacity }]} />
                    </View>
                </View>
            ))}
        </View>
    );
};

const ProvidersModal = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [proveedorEditar, setProveedorEditar] = useState(null);

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

            // Filtrar por búsqueda si hay texto
            const filteredData = busqueda.trim()
                ? data.filter(proveedor =>
                    proveedor.name.toLowerCase().includes(busqueda.toLowerCase()) ||
                    proveedor.phone.includes(busqueda)
                )
                : data;

            setProveedores(filteredData);
        } catch (err) {
            console.error('Error al cargar proveedores:', err);
            RNAlert.alert('Error', 'No se pudieron cargar los proveedores');
        } finally {
            setLoading(false);
        }
    }, [busqueda]);

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
        }
    }, [visible]);

    // Recargar cuando cambia la búsqueda
    const handleBuscar = () => {
        fetchProveedores();
    };

    // Función para eliminar proveedor
    const handleEliminar = (proveedor) => {
        RNAlert.alert(
            'Eliminar proveedor',
            `¿Estás seguro de que deseas eliminar a ${proveedor.name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await apiCall(
                                `https://api.minymol.com/debts/providers/${proveedor.id}`,
                                { method: 'DELETE' }
                            );

                            if (!res.ok) throw new Error('Error al eliminar');

                            setProveedores(prev => prev.filter(p => p.id !== proveedor.id));
                            RNAlert.alert('Éxito', 'Proveedor eliminado correctamente');
                        } catch (err) {
                            RNAlert.alert('Error', 'No se pudo eliminar el proveedor');
                        }
                    }
                }
            ]
        );
    };

    // Función para editar proveedor
    const handleEditar = (proveedor) => {
        setProveedorEditar(proveedor);
        setShowCreateModal(true);
    };

    // Función para crear/actualizar proveedor
    const handleSaveProvider = async (name, phone) => {
        try {
            if (proveedorEditar) {
                // Actualizar
                const res = await apiCall(
                    `https://api.minymol.com/debts/providers/${proveedorEditar.id}`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, phone }),
                    }
                );

                if (!res.ok) throw new Error('Error al actualizar');

                const proveedorActualizado = await res.json();
                setProveedores(prev =>
                    prev.map(p => p.id === proveedorEditar.id ? proveedorActualizado : p)
                );
                RNAlert.alert('Éxito', 'Proveedor actualizado correctamente');
            } else {
                // Crear
                const res = await apiCall('https://api.minymol.com/debts/providers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone }),
                });

                if (!res.ok) throw new Error('Error al crear');

                const nuevoProveedor = await res.json();
                setProveedores(prev => [...prev, nuevoProveedor]);
                RNAlert.alert('Éxito', 'Proveedor creado correctamente');
            }

            setShowCreateModal(false);
            setProveedorEditar(null);
        } catch (err) {
            RNAlert.alert('Error', 'No se pudo guardar el proveedor');
        }
    };

    // Refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProveedores();
        setRefreshing(false);
    };

    // Formatear número
    const formatNumber = (num) => {
        if (num == null) return '0';
        return num.toLocaleString('es-CO');
    };

    // Renderizar card de proveedor
    const renderProviderCard = (proveedor) => (
        <View key={proveedor.id} style={styles.providerCard}>
            <View style={styles.providerHeader}>
                <View style={styles.providerIconContainer}>
                    <Ionicons name="person" size={24} color="#fa7e17" />
                </View>
                <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>{proveedor.name}</Text>
                    <Text style={styles.providerPhone}>{proveedor.phone}</Text>
                </View>
            </View>

            <View style={styles.providerDetails}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Deuda actual:</Text>
                    <Text style={[
                        styles.detailValue,
                        proveedor.deudaRestante > 0 && styles.debtValue
                    ]}>
                        ${formatNumber(proveedor.deudaRestante)}
                    </Text>
                </View>

                {proveedor.lastMovement && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Último movimiento:</Text>
                        <Text style={styles.detailValueSmall}>
                            {proveedor.lastMovement}
                            {proveedor.lastType && ` (${proveedor.lastType})`}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.providerActions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEditar(proveedor)}
                >
                    <Ionicons name="create-outline" size={20} color="#3b82f6" />
                    <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleEliminar(proveedor)}
                >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

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
                        {/* Header del modal - Solo chevron, sin borde */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleClose}
                            >
                                <Ionicons name="chevron-back" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Contenido del modal */}
                        <View style={styles.content}>
                            {/* Botón agregar */}
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => {
                                    setProveedorEditar(null);
                                    setShowCreateModal(true);
                                }}
                            >
                                <Ionicons name="add-circle" size={20} color="#fff" />
                                <Text style={styles.addButtonText}>Agregar proveedor</Text>
                            </TouchableOpacity>

                            {/* Buscador */}
                            <View style={styles.searchContainer}>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Buscar por nombre o teléfono"
                                    placeholderTextColor="#9ca3af"
                                    value={busqueda}
                                    onChangeText={setBusqueda}
                                    onSubmitEditing={handleBuscar}
                                />
                                <TouchableOpacity
                                    style={styles.searchButton}
                                    onPress={handleBuscar}
                                >
                                    <Ionicons name="search" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Lista de proveedores */}
                            {loading && !refreshing ? (
                                <SkeletonLoader />
                            ) : (
                                <ScrollView
                                    style={styles.scrollContainer}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={[
                                        styles.scrollContentContainer,
                                        { paddingBottom: Math.max(insets.bottom, 20) }
                                    ]}
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={refreshing}
                                            onRefresh={onRefresh}
                                            colors={['#fa7e17']}
                                            tintColor="#fa7e17"
                                        />
                                    }
                                >
                                    {proveedores.length > 0 ? (
                                        proveedores.map(renderProviderCard)
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <Ionicons name="people-outline" size={64} color="#d1d5db" />
                                            <Text style={styles.emptyTitle}>
                                                {busqueda.trim() ? 'No se encontraron proveedores' : 'No tienes proveedores'}
                                            </Text>
                                            <Text style={styles.emptySubtitle}>
                                                {busqueda.trim()
                                                    ? 'Intenta con otra búsqueda'
                                                    : 'Agrega tu primer proveedor'}
                                            </Text>
                                        </View>
                                    )}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </Animated.View>
            </View>

            {/* Modal de crear/editar proveedor */}
            <CreateProviderModal
                visible={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setProveedorEditar(null);
                }}
                onSave={handleSaveProvider}
                editData={proveedorEditar}
            />
        </Modal>
    );
};

// Modal para crear/editar proveedor
const CreateProviderModal = ({ visible, onClose, onSave, editData }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        if (editData) {
            setName(editData.name);
            setPhone(editData.phone);
        } else {
            setName('');
            setPhone('');
        }
    }, [editData, visible]);

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

    const handleSave = () => {
        if (!name.trim()) {
            RNAlert.alert('Error', 'El nombre es requerido');
            return;
        }
        if (!phone.trim()) {
            RNAlert.alert('Error', 'El teléfono es requerido');
            return;
        }

        onSave(name.trim(), phone.trim());
        setName('');
        setPhone('');
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <Animated.View 
                    style={[
                        styles.createModalOverlay,
                        { opacity: fadeAnim }
                    ]}
                >
                    <TouchableOpacity 
                        style={styles.createModalBackdrop}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                    
                    <Animated.View
                        style={[
                            styles.createModalContent,
                            {
                                transform: [{ translateY: slideAnim }],
                                opacity: fadeAnim,
                            }
                        ]}
                    >
                        {/* Header del modal */}
                        <View style={styles.createModalHeader}>
                            <View style={styles.createModalIconContainer}>
                                <View style={styles.createModalIconCircle}>
                                    <Ionicons 
                                        name={editData ? "create-outline" : "person-add-outline"} 
                                        size={28} 
                                        color="#fa7e17" 
                                    />
                                </View>
                            </View>
                            <Text style={styles.createModalTitle}>
                                {editData ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </Text>
                            <Text style={styles.createModalSubtitle}>
                                {editData ? 'Actualiza la información del proveedor' : 'Ingresa los datos del nuevo proveedor'}
                            </Text>
                        </View>

                        {/* Formulario */}
                        <ScrollView 
                            style={styles.createModalForm}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    <Ionicons name="person-outline" size={14} color="#6b7280" /> Nombre
                                    <Text style={styles.requiredAsterisk}> *</Text>
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="person" size={18} color="#9ca3af" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej: Juan Pérez"
                                        placeholderTextColor="#9ca3af"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    <Ionicons name="call-outline" size={14} color="#6b7280" /> Teléfono
                                    <Text style={styles.requiredAsterisk}> *</Text>
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="call" size={18} color="#9ca3af" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej: 300 123 4567"
                                        placeholderTextColor="#9ca3af"
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        {/* Botones */}
                        <View style={styles.createModalActions}>
                            <TouchableOpacity
                                style={[styles.createModalButton, styles.cancelButton]}
                                onPress={handleClose}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close-circle-outline" size={18} color="#6b7280" />
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.createModalButton, styles.saveButton]}
                                onPress={handleSave}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                <Text style={styles.saveButtonText}>
                                    {editData ? 'Actualizar' : 'Crear'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </Animated.View>
            </KeyboardAvoidingView>
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
    },
    backButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        backgroundColor: '#f8fafc',
        paddingTop: 8,
    },
    title: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginHorizontal: 16,
        marginBottom: 16,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fa7e17',
        marginHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
    },
    searchContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    searchButton: {
        backgroundColor: '#fa7e17',
        paddingHorizontal: 20,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Skeleton loader
    skeletonContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    skeletonProviderCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    skeletonProviderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    skeletonIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e5e7eb',
        marginRight: 12,
    },
    skeletonProviderInfo: {
        flex: 1,
    },
    skeletonProviderName: {
        height: 18,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 8,
        width: '70%',
    },
    skeletonProviderPhone: {
        height: 16,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        width: '50%',
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
        width: '85%',
    },
    skeletonDetailSmall: {
        height: 14,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 12,
        width: '60%',
    },
    skeletonActions: {
        flexDirection: 'row',
        gap: 8,
    },
    skeletonActionButton: {
        flex: 1,
        height: 36,
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
    },

    scrollContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    scrollContentContainer: {
        paddingTop: 10,
    },
    providerCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    providerHeader: {
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
    providerInfo: {
        flex: 1,
    },
    providerName: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 4,
    },
    providerPhone: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
    },
    providerDetails: {
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
    },
    detailValue: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    debtValue: {
        color: '#ef4444',
    },
    detailValueSmall: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        flex: 1,
        textAlign: 'right',
        marginLeft: 8,
    },
    providerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    editButton: {
        backgroundColor: '#eff6ff',
    },
    editButtonText: {
        color: '#3b82f6',
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
    },
    deleteButton: {
        backgroundColor: '#fef2f2',
    },
    deleteButtonText: {
        color: '#ef4444',
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
    },
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
    },

    // Modal de crear/editar
    keyboardAvoidingView: {
        flex: 1,
    },
    createModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 80,
    },
    createModalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    createModalContent: {
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
    createModalHeader: {
        backgroundColor: '#fff7f0',
        paddingTop: 28,
        paddingBottom: 24,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ffe4cc',
    },
    createModalIconContainer: {
        marginBottom: 16,
    },
    createModalIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    createModalTitle: {
        fontSize: 22,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 6,
        textAlign: 'center',
    },
    createModalSubtitle: {
        fontSize: 13,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 18,
    },
    createModalForm: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        maxHeight: 250,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#374151',
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    requiredAsterisk: {
        color: '#fa7e17',
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
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
    createModalActions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    createModalButton: {
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
    saveButtonText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: getUbuntuFont('bold'),
    },
});

export default ProvidersModal;
