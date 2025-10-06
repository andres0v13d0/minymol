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
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

const ProviderRegistrationModal = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;

    // Estado del formulario
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        telefono: '',
        ciudad: '',
        departamento: '',
        empresa: '',
        antiguedad: '',
        productos: '',
        tipo: '', // fabricante o distribuidor
    });

    const [loading, setLoading] = useState(false);

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

    // Manejar cambios en los inputs
    const handleChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    // Validar formulario
    const validateForm = () => {
        const requiredFields = [
            'nombre',
            'apellido',
            'telefono',
            'ciudad',
            'departamento',
            'empresa',
            'antiguedad',
            'productos',
            'tipo',
        ];

        for (let field of requiredFields) {
            if (!formData[field] || formData[field].trim() === '') {
                Alert.alert('Error', 'Por favor completa todos los campos');
                return false;
            }
        }

        // Validar que antiguedad sea un número
        if (isNaN(formData.antiguedad)) {
            Alert.alert('Error', 'Los años de antigüedad debe ser un número');
            return false;
        }

        return true;
    };

    // Enviar formulario con EmailJS
    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);

        try {
            // Aquí integrarías EmailJS para React Native
            // Por ahora simulamos el envío
            const emailJSData = {
                service_id: 'service_s0c2e5w',
                template_id: 'template_simple_minymol',
                user_id: 'yHE_T7SENJdKd_roU',
                template_params: formData,
            };

            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailJSData),
            });

            if (response.ok) {
                Alert.alert(
                    '✅ Éxito',
                    'Solicitud enviada correctamente. Nos pondremos en contacto contigo pronto.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Resetear formulario
                                setFormData({
                                    nombre: '',
                                    apellido: '',
                                    telefono: '',
                                    ciudad: '',
                                    departamento: '',
                                    empresa: '',
                                    antiguedad: '',
                                    productos: '',
                                    tipo: '',
                                });
                                handleClose();
                            },
                        },
                    ]
                );
            } else {
                throw new Error('Error al enviar');
            }
        } catch (error) {
            console.error('❌ Error al enviar:', error);
            Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
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
                                <Text style={styles.headerTitle}>Registro de Proveedor</Text>
                                <View style={{ width: 40 }} />
                            </View>

                            {/* Content */}
                            <ScrollView
                                style={styles.scrollContainer}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={[
                                    styles.scrollContentContainer,
                                    { paddingBottom: Math.max(insets.bottom, 20) },
                                ]}
                            >
                                {/* Info Section */}
                                <View style={styles.infoSection}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="business" size={40} color="#fa7e17" />
                                    </View>
                                    <Text style={styles.infoTitle}>
                                        ¡Únete a nuestra red de proveedores!
                                    </Text>
                                    <Text style={styles.infoDescription}>
                                        Completa el formulario y nos pondremos en contacto contigo
                                        para iniciar nuestra colaboración.
                                    </Text>
                                </View>

                                {/* Formulario */}
                                <View style={styles.formSection}>
                                    {/* Nombre */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Nombre *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ingresa tu nombre"
                                            value={formData.nombre}
                                            onChangeText={(value) => handleChange('nombre', value)}
                                            placeholderTextColor="#9ca3af"
                                        />
                                    </View>

                                    {/* Apellido */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Apellido *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ingresa tu apellido"
                                            value={formData.apellido}
                                            onChangeText={(value) => handleChange('apellido', value)}
                                            placeholderTextColor="#9ca3af"
                                        />
                                    </View>

                                    {/* Teléfono */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Teléfono o WhatsApp *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ej: 3169277199"
                                            value={formData.telefono}
                                            onChangeText={(value) => handleChange('telefono', value)}
                                            keyboardType="phone-pad"
                                            placeholderTextColor="#9ca3af"
                                        />
                                    </View>

                                    {/* Ciudad */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Ciudad *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ej: Cali"
                                            value={formData.ciudad}
                                            onChangeText={(value) => handleChange('ciudad', value)}
                                            placeholderTextColor="#9ca3af"
                                        />
                                    </View>

                                    {/* Departamento */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Departamento *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ej: Valle del Cauca"
                                            value={formData.departamento}
                                            onChangeText={(value) =>
                                                handleChange('departamento', value)
                                            }
                                            placeholderTextColor="#9ca3af"
                                        />
                                    </View>

                                    {/* Empresa */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Nombre de la empresa *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ingresa el nombre de tu empresa"
                                            value={formData.empresa}
                                            onChangeText={(value) => handleChange('empresa', value)}
                                            placeholderTextColor="#9ca3af"
                                        />
                                    </View>

                                    {/* Antigüedad */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Años de antigüedad *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ej: 5"
                                            value={formData.antiguedad}
                                            onChangeText={(value) =>
                                                handleChange('antiguedad', value)
                                            }
                                            keyboardType="numeric"
                                            placeholderTextColor="#9ca3af"
                                        />
                                    </View>

                                    {/* Tipo de proveedor */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Tipo de proveedor *</Text>
                                        <View style={styles.radioGroup}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.radioButton,
                                                    formData.tipo === 'Fabricante' &&
                                                    styles.radioButtonActive,
                                                ]}
                                                onPress={() => handleChange('tipo', 'Fabricante')}
                                            >
                                                <View
                                                    style={[
                                                        styles.radioCircle,
                                                        formData.tipo === 'Fabricante' &&
                                                        styles.radioCircleActive,
                                                    ]}
                                                >
                                                    {formData.tipo === 'Fabricante' && (
                                                        <View style={styles.radioCircleInner} />
                                                    )}
                                                </View>
                                                <Text
                                                    style={[
                                                        styles.radioLabel,
                                                        formData.tipo === 'Fabricante' &&
                                                        styles.radioLabelActive,
                                                    ]}
                                                >
                                                    Fabricante
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.radioButton,
                                                    formData.tipo === 'Distribuidor' &&
                                                    styles.radioButtonActive,
                                                ]}
                                                onPress={() => handleChange('tipo', 'Distribuidor')}
                                            >
                                                <View
                                                    style={[
                                                        styles.radioCircle,
                                                        formData.tipo === 'Distribuidor' &&
                                                        styles.radioCircleActive,
                                                    ]}
                                                >
                                                    {formData.tipo === 'Distribuidor' && (
                                                        <View style={styles.radioCircleInner} />
                                                    )}
                                                </View>
                                                <Text
                                                    style={[
                                                        styles.radioLabel,
                                                        formData.tipo === 'Distribuidor' &&
                                                        styles.radioLabelActive,
                                                    ]}
                                                >
                                                    Distribuidor
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Productos */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Productos que distribuye *</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            placeholder="Describe los productos que distribuyes o fabricas"
                                            value={formData.productos}
                                            onChangeText={(value) =>
                                                handleChange('productos', value)
                                            }
                                            multiline
                                            numberOfLines={4}
                                            textAlignVertical="top"
                                            placeholderTextColor="#9ca3af"
                                        />
                                    </View>

                                    {/* Botón de envío */}
                                    <TouchableOpacity
                                        style={[
                                            styles.submitButton,
                                            loading && styles.submitButtonDisabled,
                                        ]}
                                        onPress={handleSubmit}
                                        disabled={loading}
                                        activeOpacity={0.8}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <Ionicons name="send" size={20} color="#fff" />
                                                <Text style={styles.submitButtonText}>
                                                    Enviar solicitud
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
    },
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
        backgroundColor: '#fff',
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
    scrollContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    scrollContentContainer: {
        paddingTop: 20,
    },

    // Info Section
    infoSection: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fa7e17',
        elevation: 2,
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    iconContainer: {
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
    infoTitle: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    infoDescription: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },

    // Form Section
    formSection: {
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        fontFamily: getUbuntuFont('regular'),
        color: '#1f2937',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    textArea: {
        minHeight: 100,
        paddingTop: 14,
    },

    // Radio Group
    radioGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    radioButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    radioButtonActive: {
        borderColor: '#fa7e17',
        backgroundColor: '#fff7f0',
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#9ca3af',
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioCircleActive: {
        borderColor: '#fa7e17',
    },
    radioCircleInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fa7e17',
    },
    radioLabel: {
        fontSize: 15,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
    },
    radioLabelActive: {
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
    },

    // Submit Button
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fa7e17',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 10,
        elevation: 3,
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        marginTop: 10,
    },
    submitButtonDisabled: {
        backgroundColor: '#9ca3af',
        elevation: 1,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
    },
});

export default ProviderRegistrationModal;
