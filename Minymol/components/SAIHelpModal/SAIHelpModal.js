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
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

const SAIHelpModal = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;

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

    // Componente para los ítems con check
    const FeatureItem = ({ text }) => (
        <View style={styles.featureItem}>
            <View style={styles.checkIconContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            </View>
            <Text style={styles.featureText}>{text}</Text>
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
            <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
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
                            <Text style={styles.headerTitle}>Ayuda SAI</Text>
                            <View style={styles.placeholder} />
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
                            {/* Hero Section */}
                            <View style={styles.heroSection}>
                                <View style={styles.heroIconContainer}>
                                    <Ionicons name="help-circle" size={48} color="#fa7e17" />
                                </View>
                                <Text style={styles.heroTitle}>Centro de Ayuda SAI</Text>
                                <Text style={styles.heroSubtitle}>
                                    Todo lo que necesitas saber sobre el Sistema de Abonos Inteligentes
                                </Text>
                            </View>

                            {/* Sección 1: ¿Qué es el sistema SAI? */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="information-circle" size={24} color="#fa7e17" />
                                    <Text style={styles.sectionTitle}>¿Qué es el sistema SAI?</Text>
                                </View>

                                <Text style={styles.text}>
                                    El Sistema de Abonos Inteligentes (SAI) es una plataforma revolucionaria que transforma
                                    completamente la gestión financiera de tu negocio. Diseñado específicamente para optimizar
                                    el manejo de pagos, deudas y flujo de efectivo, SAI te permite tomar decisiones financieras
                                    estratégicas con precisión matemática.
                                </Text>

                                <Text style={styles.subsectionTitle}>¿Qué hace especial al SAI?</Text>

                                <FeatureItem text="Simulación inteligente de abonos que maximiza el impacto de cada peso invertido" />
                                <FeatureItem text="Gestión estratégica de múltiples proveedores con priorización automática" />
                                <FeatureItem text="Control de flujo de caja en tiempo real para decisiones inmediatas" />
                                <FeatureItem text="Interfaz drag & drop para reorganizar pagos según tus prioridades comerciales" />
                                <FeatureItem text="Validaciones inteligentes que previenen errores financieros costosos" />
                                <FeatureItem text="Proyecciones de saldo que te muestran el impacto futuro de cada decisión" />

                                <Text style={styles.text}>
                                    SAI no es solo una herramienta de cálculo; es tu asesor financiero inteligente que te ayuda
                                    a optimizar cada peso, fortalecer relaciones comerciales y mantener un flujo de caja saludable
                                    para el crecimiento sostenible de tu negocio.
                                </Text>
                            </View>

                            {/* Sección 2: ¿Qué puedo lograr usando el SAI? */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="trophy" size={24} color="#fa7e17" />
                                    <Text style={styles.sectionTitle}>¿Qué puedo lograr usando el SAI?</Text>
                                </View>

                                <Text style={styles.text}>
                                    Con SAI, transformarás la manera en que manejas las finanzas de tu negocio, alcanzando niveles
                                    de eficiencia y control que antes parecían imposibles. Los resultados son inmediatos y duraderos.
                                </Text>

                                <Text style={styles.subsectionTitle}>Resultados Financieros Inmediatos:</Text>

                                <FeatureItem text="Reducir el tiempo de decisión de pagos de horas a minutos con simulaciones precisas" />
                                <FeatureItem text="Optimizar hasta un 40% más tu capital disponible con distribución inteligente" />
                                <FeatureItem text="Eliminar errores de cálculo que pueden costar miles de pesos en sobregiros" />
                                <FeatureItem text="Mantener relaciones comerciales sólidas con pagos estratégicos y oportunos" />
                                <FeatureItem text="Proyectar escenarios financieros para planificar el crecimiento de tu negocio" />

                                <Text style={styles.subsectionTitle}>Ventajas Estratégicas a Largo Plazo:</Text>

                                <FeatureItem text="Desarrollar credibilidad comercial con proveedores mediante pagos consistentes" />
                                <FeatureItem text="Acceder a mejores condiciones comerciales por tu historial de pagos organizado" />
                                <FeatureItem text="Crear un sistema financiero escalable que crece con tu negocio" />
                                <FeatureItem text="Obtener tranquilidad mental al tener control total sobre tus obligaciones" />
                                <FeatureItem text="Dedicar más tiempo al crecimiento del negocio en lugar de cálculos manuales" />

                                <Text style={styles.text}>
                                    El SAI te convierte en un experto en gestión financiera, sin importar tu nivel de experiencia previo.
                                    Es como tener un contador y un asesor financiero trabajando 24/7 para optimizar cada decisión de pago.
                                </Text>
                            </View>

                            {/* Sección 3: ¿Cómo uso la plataforma para el método SAI? */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="bulb" size={24} color="#fa7e17" />
                                    <Text style={styles.sectionTitle}>¿Cómo uso la plataforma para el método SAI?</Text>
                                </View>

                                <Text style={styles.text}>
                                    Usar SAI es sorprendentemente simple y intuitivo. En menos de 5 minutos dominarás el sistema
                                    que revolucionará tu gestión financiera. Cada paso está diseñado para ser lógico y eficiente.
                                </Text>

                                <Text style={styles.subsectionTitle}>Proceso Paso a Paso:</Text>

                                <FeatureItem text="Ingresa tu capital disponible: Escribe la cantidad exacta de dinero que tienes para distribuir hoy" />
                                <FeatureItem text="Visualiza tus proveedores: El sistema muestra automáticamente todas tus deudas organizadas y actualizadas" />
                                <FeatureItem text="Arrastra para priorizar: Reorganiza los proveedores según tu estrategia comercial usando drag & drop" />
                                <FeatureItem text="Simula abonos inteligentes: Toca cualquier proveedor para simular diferentes montos de pago" />
                                <FeatureItem text="Valida en tiempo real: El sistema te avisa si excedes tu presupuesto o la deuda del proveedor" />
                                <FeatureItem text="Ve proyecciones instantáneas: Observa cómo cada abono afecta el saldo total y individual" />
                                <FeatureItem text="Guarda tu estrategia perfecta: Una vez satisfecho con la distribución, guarda la simulación" />
                                <FeatureItem text="Ejecuta con confianza: Procede con los pagos sabiendo que cada peso está optimizado" />

                                <Text style={styles.subsectionTitle}>Funciones Avanzadas:</Text>

                                <FeatureItem text="Reinicio rápido: Borra toda la simulación con un clic para empezar con nuevos parámetros" />
                                <FeatureItem text="Alertas inteligentes: Recibe notificaciones visuales cuando algo requiere tu atención" />
                                <FeatureItem text="Modo responsivo: Usa SAI perfectamente desde tu celular, tablet o computador" />
                                <FeatureItem text="Cálculos automáticos: Todo se actualiza instantáneamente sin necesidad de botones adicionales" />

                                <Text style={styles.text}>
                                    La belleza del SAI radica en su simplicidad: tecnología avanzada que funciona de manera tan
                                    intuitiva que te sentirás como un experto desde el primer uso. Es la herramienta que siempre
                                    quisiste tener para manejar tus finanzas comerciales con precisión profesional.
                                </Text>
                            </View>

                            {/* Footer con botón de contacto */}
                            <View style={styles.footerSection}>
                                <Ionicons name="chatbubbles" size={32} color="#fa7e17" />
                                <Text style={styles.footerTitle}>¿Necesitas más ayuda?</Text>
                                <Text style={styles.footerText}>
                                    Nuestro equipo de soporte está listo para ayudarte
                                </Text>
                                <TouchableOpacity style={styles.contactButton}>
                                    <Ionicons name="mail" size={18} color="#fff" />
                                    <Text style={styles.contactButtonText}>Contactar soporte</Text>
                                </TouchableOpacity>
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
        backgroundColor: '#ffffff',
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
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    placeholder: {
        width: 40,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingTop: 10,
    },

    // Hero Section
    heroSection: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ffe4cc',
    },
    heroIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff7f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },

    // Sections
    section: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        flex: 1,
    },
    subsectionTitle: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#374151',
        marginTop: 16,
        marginBottom: 12,
    },
    text: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#4b5563',
        lineHeight: 22,
        marginBottom: 16,
        textAlign: 'justify',
    },

    // Feature Items
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        paddingLeft: 8,
    },
    checkIconContainer: {
        marginTop: 2,
        marginRight: 12,
    },
    featureText: {
        flex: 1,
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#374151',
        lineHeight: 20,
    },

    // Footer Section
    footerSection: {
        backgroundColor: '#fff7f0',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ffe4cc',
    },
    footerTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginTop: 12,
        marginBottom: 8,
    },
    footerText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fa7e17',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    contactButtonText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: getUbuntuFont('bold'),
    },
});

export default SAIHelpModal;
