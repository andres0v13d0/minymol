import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

const PrivacyPolicyModal = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;

    const getTopPadding = () => {
        if (Platform.OS === 'ios') {
            return insets.top || 50;
        } else {
            return (StatusBar.currentHeight || 24) + 10;
        }
    };

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

    const Section = ({ title, children }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
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
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleClose}
                            >
                                <Ionicons name="chevron-back" size={24} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Política de Privacidad</Text>
                            <View style={styles.placeholder} />
                        </View>

                        {/* Content */}
                        <ScrollView
                            style={styles.content}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={[
                                styles.scrollContent,
                                { paddingBottom: Math.max(insets.bottom, 20) }
                            ]}
                        >
                            <View style={styles.card}>
                                <Text style={styles.mainTitle}>Política de Privacidad de Minymol</Text>

                                <Section title="1. Introducción">
                                    <Text style={styles.text}>
                                        En Minymol, respetamos tu privacidad y nos comprometemos a proteger los datos personales que compartes con nosotros. Esta política explica cómo recopilamos, usamos y protegemos tu información.
                                    </Text>
                                </Section>

                                <Section title="2. Información que recopilamos">
                                    <View style={styles.list}>
                                        <Text style={styles.listItem}>• Datos personales: nombre, correo electrónico, teléfono, dirección, etc.</Text>
                                        <Text style={styles.listItem}>• Información de uso: páginas visitadas, tiempo en el sitio, etc.</Text>
                                        <Text style={styles.listItem}>• Datos técnicos: dirección IP, tipo de navegador, dispositivo utilizado, etc.</Text>
                                    </View>
                                </Section>

                                <Section title="3. Uso de la información">
                                    <View style={styles.list}>
                                        <Text style={styles.listItem}>• Para proveer nuestros servicios y operar la plataforma.</Text>
                                        <Text style={styles.listItem}>• Para mejorar la experiencia del usuario.</Text>
                                        <Text style={styles.listItem}>• Para enviar notificaciones y mensajes relevantes.</Text>
                                        <Text style={styles.listItem}>• Para fines de seguridad y prevención de fraude.</Text>
                                    </View>
                                </Section>

                                <Section title="4. Compartir información">
                                    <Text style={styles.text}>
                                        No vendemos ni alquilamos tu información personal. Podemos compartirla con terceros únicamente en los siguientes casos:
                                    </Text>
                                    <View style={styles.list}>
                                        <Text style={styles.listItem}>• Con proveedores de servicios que nos ayudan a operar la plataforma.</Text>
                                        <Text style={styles.listItem}>• En cumplimiento de obligaciones legales o requerimientos de autoridades.</Text>
                                    </View>
                                </Section>

                                <Section title="5. Seguridad">
                                    <Text style={styles.text}>
                                        Implementamos medidas de seguridad para proteger tu información. Sin embargo, ningún sistema es completamente seguro, por lo que no podemos garantizar protección absoluta.
                                    </Text>
                                </Section>

                                <Section title="6. Derechos del usuario">
                                    <View style={styles.list}>
                                        <Text style={styles.listItem}>• Acceder, corregir o eliminar tus datos personales.</Text>
                                        <Text style={styles.listItem}>• Oponerte al procesamiento de tu información.</Text>
                                        <Text style={styles.listItem}>• Solicitar la portabilidad de tus datos.</Text>
                                    </View>
                                </Section>

                                <Section title="7. Cookies">
                                    <Text style={styles.text}>
                                        Utilizamos cookies para mejorar tu experiencia. Puedes controlar su uso desde la configuración de tu navegador.
                                    </Text>
                                </Section>

                                <Section title="8. Cambios en la política">
                                    <Text style={styles.text}>
                                        Nos reservamos el derecho de modificar esta política. Te notificaremos cualquier cambio importante a través de la plataforma.
                                    </Text>
                                </Section>

                                <Section title="9. Contacto">
                                    <Text style={styles.text}>
                                        Si tienes preguntas sobre esta política, contáctanos en privacidad@surtte.com.
                                    </Text>
                                </Section>
                            </View>
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
        fontSize: 17,
        fontFamily: getUbuntuFont('bold'),
        color: '#1e293b',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollContent: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    mainTitle: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
        marginBottom: 24,
        textAlign: 'center',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#1e293b',
        marginBottom: 12,
    },
    text: {
        fontSize: 15,
        fontFamily: getUbuntuFont('regular'),
        color: '#475569',
        lineHeight: 22,
    },
    list: {
        marginTop: 8,
    },
    listItem: {
        fontSize: 15,
        fontFamily: getUbuntuFont('regular'),
        color: '#475569',
        lineHeight: 24,
        marginBottom: 4,
    },
});

export default PrivacyPolicyModal;
