import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUbuntuFont } from '../../utils/fonts';
import ProviderRegistrationModal from '../ProviderRegistrationModal';

const { width: screenWidth } = Dimensions.get('window');

const CustomerServiceModal = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;

    // Estado para controlar el modal de registro de proveedor
    const [showProviderModal, setShowProviderModal] = useState(false);

    // Calcular el padding superior
    const getTopPadding = () => {
        if (Platform.OS === 'ios') {
            return insets.top > 0 ? insets.top : 20;
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

    // Función para abrir WhatsApp
    const handleWhatsApp = () => {
        const phoneNumber = '573169277199';
        const url = `whatsapp://send?phone=${phoneNumber}`;
        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(url);
                } else {
                    // Si WhatsApp no está instalado, abre en el navegador
                    return Linking.openURL(`https://wa.me/${phoneNumber}`);
                }
            })
            .catch((err) => console.error('Error al abrir WhatsApp:', err));
    };

    // Función para hacer llamada
    const handleCall = () => {
        const phoneNumber = 'tel:+573169277199';
        Linking.openURL(phoneNumber).catch((err) =>
            console.error('Error al abrir el teléfono:', err)
        );
    };

    // Función para enviar email
    const handleEmail = () => {
        const email = 'mailto:notificaciones@minymol.com';
        Linking.openURL(email).catch((err) =>
            console.error('Error al abrir el email:', err)
        );
    };

    // Función para abrir ubicación
    const handleLocation = () => {
        const address = 'Carrera 46 # 45-88, Cali, Colombia';
        const url = Platform.select({
            ios: `maps:0,0?q=${encodeURIComponent(address)}`,
            android: `geo:0,0?q=${encodeURIComponent(address)}`,
        });
        Linking.openURL(url).catch((err) =>
            console.error('Error al abrir el mapa:', err)
        );
    };

    // Función para navegar a solicitud de proveedor
    const handleProveedorClick = () => {
        setShowProviderModal(true);
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
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleClose}
                            >
                                <Ionicons name="chevron-back" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <ScrollView
                            style={styles.scrollContainer}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={[
                                styles.scrollContentContainer,
                                { paddingBottom: Math.max(insets.bottom, 20) }
                            ]}
                        >
                            {/* Header Section */}
                            <View style={styles.headerSection}>
                                <View style={styles.headerIconContainer}>
                                    <Ionicons name="headset" size={40} color="#fa7e17" />
                                </View>
                                <Text style={styles.headerTitle}>Servicio al Cliente</Text>
                                <Text style={styles.headerSubtitle}>
                                    Estamos aquí para ayudarte en todo lo que necesites. ¡Tu satisfacción es nuestra prioridad!
                                </Text>
                            </View>

                            {/* Info Cards */}
                            <View style={styles.infoSection}>
                                {/* Llamar */}
                                <TouchableOpacity
                                    style={styles.infoCard}
                                    onPress={handleCall}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.infoIconContainer, { backgroundColor: '#dbeafe' }]}>
                                        <Ionicons name="call" size={24} color="#3b82f6" />
                                    </View>
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoTitle}>Llámanos</Text>
                                        <Text style={styles.infoDescription}>(+57) 316 927 7199</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                                </TouchableOpacity>

                                {/* WhatsApp */}
                                <TouchableOpacity
                                    style={[styles.infoCard, styles.whatsappCard]}
                                    onPress={handleWhatsApp}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.infoIconContainer, { backgroundColor: '#dcfce7' }]}>
                                        <Ionicons name="logo-whatsapp" size={24} color="#22c55e" />
                                    </View>
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoTitle}>Escríbenos al WhatsApp</Text>
                                        <Text style={styles.infoDescription}>Respuesta inmediata</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                                </TouchableOpacity>

                                {/* Email */}
                                <TouchableOpacity
                                    style={styles.infoCard}
                                    onPress={handleEmail}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.infoIconContainer, { backgroundColor: '#fee2e2' }]}>
                                        <Ionicons name="mail" size={24} color="#ef4444" />
                                    </View>
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoTitle}>Correo electrónico</Text>
                                        <Text style={styles.infoDescription}>notificaciones@minymol.com</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                                </TouchableOpacity>

                                {/* Ubicación */}
                                <TouchableOpacity
                                    style={styles.infoCard}
                                    onPress={handleLocation}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.infoIconContainer, { backgroundColor: '#fef3c7' }]}>
                                        <Ionicons name="location" size={24} color="#f59e0b" />
                                    </View>
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoTitle}>Oficinas</Text>
                                        <Text style={styles.infoDescription}>Carrera 46 # 45-88, Cali, Colombia</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                                </TouchableOpacity>

                                {/* Horario */}
                                <View style={styles.infoCard}>
                                    <View style={[styles.infoIconContainer, { backgroundColor: '#e0e7ff' }]}>
                                        <Ionicons name="time" size={24} color="#6366f1" />
                                    </View>
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoTitle}>Horario de atención</Text>
                                        <Text style={styles.infoDescription}>Lunes a Viernes de 8:00 AM a 6:00 PM</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Proveedor Section */}
                            <View style={styles.proveedorSection}>
                                <View style={styles.proveedorIconContainer}>
                                    <Ionicons name="hand-left" size={48} color="#fa7e17" />
                                </View>
                                <Text style={styles.proveedorTitle}>¿Quieres ser proveedor?</Text>
                                <Text style={styles.proveedorDescription}>
                                    Únete a nuestra comunidad de proveedores y haz crecer tu negocio con nosotros. Tendrás acceso a miles de compradores, herramientas para gestionar tus productos y un equipo de soporte dedicado.
                                </Text>
                                <TouchableOpacity
                                    style={styles.proveedorButton}
                                    onPress={handleProveedorClick}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="business" size={20} color="#fff" />
                                    <Text style={styles.proveedorButtonText}>Más información</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </Animated.View>
            </View>

            {/* Modal de registro de proveedor */}
            <ProviderRegistrationModal
                visible={showProviderModal}
                onClose={() => setShowProviderModal(false)}
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
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: '#f8fafc',
    },
    backButton: {
        padding: 8,
    },
    scrollContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    scrollContentContainer: {
        paddingTop: 10,
    },

    // Header Section
    headerSection: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        elevation: 2,
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    headerIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff7f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#ffe4cc',
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },

    // Info Section
    infoSection: {
        marginBottom: 20,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    whatsappCard: {
        borderColor: '#22c55e',
        borderWidth: 1.5,
    },
    infoIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 4,
    },
    infoDescription: {
        fontSize: 13,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        lineHeight: 18,
    },

    // Proveedor Section
    proveedorSection: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fa7e17',
        elevation: 3,
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    proveedorIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#fff7f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 3,
        borderColor: '#ffe4cc',
    },
    proveedorTitle: {
        fontSize: 22,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    proveedorDescription: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    proveedorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fa7e17',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
        gap: 8,
        elevation: 2,
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    proveedorButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
    },
});

export default CustomerServiceModal;
