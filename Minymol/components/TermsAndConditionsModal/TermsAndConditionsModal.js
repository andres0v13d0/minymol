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

const TermsAndConditionsModal = ({ visible, onClose }) => {
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
                            <Text style={styles.headerTitle}>Términos y Condiciones</Text>
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
                                <Text style={styles.mainTitle}>Términos y Condiciones de Minymol</Text>

                                <Section title="1. Aceptación de los términos">
                                    <Text style={styles.text}>
                                        Al acceder o utilizar nuestros servicios, aceptas cumplir con estos términos y condiciones. Si no estás de acuerdo con alguna parte, por favor no utilices Minymol.
                                    </Text>
                                </Section>

                                <Section title="2. Definiciones">
                                    <Text style={styles.text}>
                                        <Text style={styles.bold}>Proveedor:</Text> Usuario que ofrece productos dentro de la plataforma.{'\n\n'}
                                        <Text style={styles.bold}>Comerciante:</Text> Usuario que compra productos de los proveedores.{'\n\n'}
                                        <Text style={styles.bold}>Minymol:</Text> Plataforma intermediaria que facilita la conexión entre comerciantes y proveedores.
                                    </Text>
                                </Section>

                                <Section title="3. Registro de usuarios">
                                    <Text style={styles.text}>
                                        Los usuarios deben proporcionar información verdadera y actualizada. Nos reservamos el derecho de suspender o cancelar cuentas que incumplan esta norma.
                                    </Text>
                                </Section>

                                <Section title="4. Obligaciones del usuario">
                                    <View style={styles.list}>
                                        <Text style={styles.listItem}>• Utilizar la plataforma de forma legal y respetuosa.</Text>
                                        <Text style={styles.listItem}>• No suplantar a otras personas ni publicar contenido falso.</Text>
                                        <Text style={styles.listItem}>• Respetar los derechos de propiedad intelectual de otros.</Text>
                                    </View>
                                </Section>

                                <Section title="5. Responsabilidad del proveedor">
                                    <Text style={styles.text}>
                                        El proveedor es responsable de la veracidad de sus productos, tiempos de entrega, condiciones de venta y atención al cliente.
                                    </Text>
                                </Section>

                                <Section title="6. Pagos y comisiones">
                                    <Text style={styles.text}>
                                        Los proveedores aceptan el uso de plataformas de pago autorizadas. Minymol puede cobrar comisiones por servicios, las cuales serán informadas previamente.
                                    </Text>
                                </Section>

                                <Section title="7. Cancelaciones y devoluciones">
                                    <Text style={styles.text}>
                                        Cada proveedor define su política de cancelaciones. El comerciante debe revisarla antes de realizar un pedido. Minymol puede intervenir en disputas bajo ciertas condiciones.
                                    </Text>
                                </Section>

                                <Section title="8. Propiedad intelectual">
                                    <Text style={styles.text}>
                                        Todo el contenido original de Minymol (logo, código, imágenes, textos) es propiedad de la plataforma. Está prohibido su uso no autorizado.
                                    </Text>
                                </Section>

                                <Section title="9. Modificaciones">
                                    <Text style={styles.text}>
                                        Minymol puede modificar estos términos en cualquier momento. Los usuarios serán notificados mediante la plataforma.
                                    </Text>
                                </Section>

                                <Section title="10. Contacto">
                                    <Text style={styles.text}>
                                        Para dudas o consultas, escríbenos a soporte@surtte.com.
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
    bold: {
        fontFamily: getUbuntuFont('bold'),
        color: '#1e293b',
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

export default TermsAndConditionsModal;
