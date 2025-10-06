import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import PrivacyPolicyModal from '../../components/PrivacyPolicyModal';
import TermsAndConditionsModal from '../../components/TermsAndConditionsModal';
import useNotifications from '../../hooks/useNotifications';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

const Configuracion = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();
    const { notificationsEnabled, toggleNotifications } = useNotifications();
    const [loading, setLoading] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    // Detectar si está en Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';

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

    const handleToggleNotifications = async () => {
        // Si está en Expo Go, mostrar mensaje informativo
        if (isExpoGo) {
            Alert.alert(
                '⚠️ No disponible en Expo Go',
                'Las notificaciones push no funcionan en Expo Go desde el SDK 53.\n\n' +
                'Para usar notificaciones push, necesitas crear un Development Build o APK con EAS Build.\n\n' +
                '¿Quieres ver las instrucciones?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Ver instrucciones',
                        onPress: () => {
                            Alert.alert(
                                'Crear Development Build',
                                'Ejecuta estos comandos:\n\n' +
                                '1. npm install -g eas-cli\n' +
                                '2. eas login\n' +
                                '3. eas build --profile development --platform android\n\n' +
                                'Revisa el archivo EXPO_GO_NOTIFICACIONES.md para más detalles.',
                                [{ text: 'Entendido' }]
                            );
                        }
                    }
                ]
            );
            return;
        }

        setLoading(true);
        const result = await toggleNotifications();
        setLoading(false);

        if (result.success) {
            Alert.alert(
                notificationsEnabled ? 'Notificaciones desactivadas' : 'Notificaciones activadas',
                result.message,
                [{ text: 'OK' }]
            );
        } else {
            Alert.alert('Error', result.message, [{ text: 'OK' }]);
        }
    };

    const handleChangePassword = () => {
        // Mostrar modal de cambio de contraseña
        setShowChangePasswordModal(true);
    };

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

    const SettingItem = ({ icon, title, description, onPress, showChevron = true, rightComponent }) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={onPress}
            activeOpacity={0.7}
            disabled={!onPress}
        >
            <View style={styles.settingIcon}>
                <Ionicons name={icon} size={24} color="#fa7e17" />
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {description && <Text style={styles.settingDescription}>{description}</Text>}
            </View>
            {rightComponent ? (
                <View style={styles.rightComponent}>{rightComponent}</View>
            ) : showChevron ? (
                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            ) : null}
        </TouchableOpacity>
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
                        <ScrollView
                            style={styles.content}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={[
                                styles.scrollContent,
                                { paddingBottom: Math.max(insets.bottom, 20) }
                            ]}
                        >
                            {/* Banner de Expo Go */}
                            {isExpoGo && (
                                <View style={styles.expoGoBanner}>
                                    <View style={styles.expoGoBannerIcon}>
                                        <Ionicons name="information-circle" size={24} color="#f59e0b" />
                                    </View>
                                    <View style={styles.expoGoBannerContent}>
                                        <Text style={styles.expoGoBannerTitle}>Usando Expo Go</Text>
                                        <Text style={styles.expoGoBannerText}>
                                            Las notificaciones push no funcionan en Expo Go.
                                            Necesitas crear un Development Build para probarlas.
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Sección de Notificaciones */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Notificaciones</Text>
                                <View style={styles.card}>
                                    <SettingItem
                                        icon="notifications-outline"
                                        title="Notificaciones Push"
                                        description={
                                            isExpoGo
                                                ? 'No disponible en Expo Go. Toca para más información.'
                                                : notificationsEnabled
                                                    ? 'Recibirás notificaciones de pedidos, ofertas y más'
                                                    : 'Activa las notificaciones para estar al día'
                                        }
                                        showChevron={false}
                                        rightComponent={
                                            loading ? (
                                                <ActivityIndicator color="#fa7e17" />
                                            ) : (
                                                <Switch
                                                    value={notificationsEnabled}
                                                    onValueChange={handleToggleNotifications}
                                                    trackColor={{ false: '#cbd5e1', true: '#fed7aa' }}
                                                    thumbColor={notificationsEnabled ? '#fa7e17' : '#f1f5f9'}
                                                    ios_backgroundColor="#cbd5e1"
                                                    disabled={isExpoGo}
                                                />
                                            )
                                        }
                                    />
                                </View>
                            </View>

                            {/* Sección de Seguridad */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Seguridad</Text>
                                <View style={styles.card}>
                                    <SettingItem
                                        icon="lock-closed-outline"
                                        title="Cambiar contraseña"
                                        description="Actualiza tu contraseña regularmente"
                                        onPress={handleChangePassword}
                                    />
                                </View>
                            </View>

                            {/* Sección de Información */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Información</Text>
                                <View style={styles.card}>
                                    <SettingItem
                                        icon="information-circle-outline"
                                        title="Acerca de Minymol"
                                        description="Versión 1.0.0"
                                        onPress={() => {
                                            Alert.alert(
                                                'Minymol',
                                                'Versión 1.0.0\n\n© 2025 Minymol. Todos los derechos reservados.',
                                                [{ text: 'OK' }]
                                            );
                                        }}
                                    />
                                    <View style={styles.separator} />
                                    <SettingItem
                                        icon="shield-checkmark-outline"
                                        title="Política de privacidad"
                                        onPress={() => setShowPrivacyPolicyModal(true)}
                                    />
                                    <View style={styles.separator} />
                                    <SettingItem
                                        icon="document-text-outline"
                                        title="Términos y condiciones"
                                        onPress={() => setShowTermsModal(true)}
                                    />
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </Animated.View>
            </View>

            {/* Modal de cambio de contraseña */}
            <ChangePasswordModal
                visible={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
            />

            {/* Modal de política de privacidad */}
            <PrivacyPolicyModal
                visible={showPrivacyPolicyModal}
                onClose={() => setShowPrivacyPolicyModal(false)}
            />

            {/* Modal de términos y condiciones */}
            <TermsAndConditionsModal
                visible={showTermsModal}
                onClose={() => setShowTermsModal(false)}
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
    content: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollContent: {
        paddingVertical: 16,
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
        color: '#64748b',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        minHeight: 72,
    },
    settingIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff7f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: '#1e293b',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 13,
        fontFamily: getUbuntuFont('regular'),
        color: '#64748b',
        lineHeight: 18,
    },
    rightComponent: {
        marginLeft: 12,
    },
    separator: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginLeft: 80,
    },
    expoGoBanner: {
        flexDirection: 'row',
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: '#fde68a',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        alignItems: 'flex-start',
    },
    expoGoBannerIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    expoGoBannerContent: {
        flex: 1,
    },
    expoGoBannerTitle: {
        fontSize: 15,
        fontFamily: getUbuntuFont('bold'),
        color: '#92400e',
        marginBottom: 4,
    },
    expoGoBannerText: {
        fontSize: 13,
        fontFamily: getUbuntuFont('regular'),
        color: '#78350f',
        lineHeight: 18,
    },
});

export default Configuracion;
