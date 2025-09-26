import { MaterialIcons } from '@expo/vector-icons';
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
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUbuntuFont } from '../../utils/fonts';

const { height: screenHeight } = Dimensions.get('window');

// Departamentos y ciudades de Colombia
const DEPARTAMENTOS_CIUDADES = {
    'Antioquia': ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Apartadó', 'Turbo', 'Rionegro'],
    'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Sabanagrande', 'Puerto Colombia'],
    'Bogotá D.C.': ['Bogotá'],
    'Bolívar': ['Cartagena', 'Magangué', 'Turbaco', 'Arjona'],
    'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá'],
    'Caldas': ['Manizales', 'Villamaría', 'Chinchiná'],
    'Caquetá': ['Florencia', 'San Vicente del Caguán'],
    'Cauca': ['Popayán', 'Santander de Quilichao'],
    'Cesar': ['Valledupar', 'Aguachica'],
    'Córdoba': ['Montería', 'Cereté', 'Lorica'],
    'Cundinamarca': ['Soacha', 'Girardot', 'Zipaquirá', 'Facatativá', 'Chía', 'Mosquera', 'Fusagasugá'],
    'Huila': ['Neiva', 'Pitalito', 'Garzón'],
    'La Guajira': ['Riohacha', 'Maicao'],
    'Magdalena': ['Santa Marta', 'Ciénaga'],
    'Meta': ['Villavicencio', 'Acacías'],
    'Nariño': ['Pasto', 'Tumaco', 'Ipiales'],
    'Norte de Santander': ['Cúcuta', 'Ocaña', 'Villa del Rosario'],
    'Quindío': ['Armenia', 'Calarcá', 'La Tebaida'],
    'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'],
    'Santander': ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja'],
    'Sucre': ['Sincelejo', 'Corozal'],
    'Tolima': ['Ibagué', 'Espinal', 'Melgar'],
    'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tulúa', 'Cartago', 'Buga'],
};

const CustomerModal = ({ visible, onClose, onContinue, initialData = null }) => {
    console.log('CustomerModal rendered with visible:', visible);
    
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(screenHeight)).current;
    
    const [formData, setFormData] = useState({
        nombre: '',
        celular: '',
        direccion: '',
        ciudad: '',
        departamento: '',
        referencia: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [availableCities, setAvailableCities] = useState([]);

    useEffect(() => {
        console.log('CustomerModal visible state changed:', visible);
        if (visible) {
            // Inicializar datos si se proporcionan
            if (initialData) {
                console.log('Inicializando con datos:', initialData);
                setFormData(initialData);
            }
            
            // Animar entrada
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            // Resetear posición
            translateY.setValue(screenHeight);
        }
    }, [visible, initialData]);

    const handleClose = () => {
        Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Si cambia el departamento, actualizar ciudades disponibles
        if (field === 'departamento') {
            setAvailableCities(DEPARTAMENTOS_CIUDADES[value] || []);
            // Limpiar ciudad seleccionada si el departamento cambia
            setFormData(prev => ({
                ...prev,
                [field]: value,
                ciudad: ''
            }));
        }
    };

    const validateForm = () => {
        if (!formData.nombre.trim()) {
            Alert.alert('Error', 'Por favor ingresa tu nombre');
            return false;
        }
        if (!formData.celular.trim()) {
            Alert.alert('Error', 'Por favor ingresa tu número de celular');
            return false;
        }
        if (!formData.direccion.trim()) {
            Alert.alert('Error', 'Por favor ingresa tu dirección');
            return false;
        }
        if (!formData.ciudad.trim()) {
            Alert.alert('Error', 'Por favor ingresa tu ciudad');
            return false;
        }
        if (!formData.departamento.trim()) {
            Alert.alert('Error', 'Por favor selecciona tu departamento');
            return false;
        }
        return true;
    };

    const handleContinue = () => {
        if (!validateForm()) return;
        
        setIsLoading(true);
        
        // Simular guardado/procesamiento
        setTimeout(() => {
            setIsLoading(false);
            onContinue(formData);
            handleClose();
        }, 1000);
    };

    // Modal simple y funcional
    if (!visible) {
        console.log('CustomerModal NO visible, returning null');
        return null;
    }

    console.log('CustomerModal SÍ visible, renderizando modal');
    
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
            presentationStyle="overFullScreen"
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <Animated.View
                        style={[
                            styles.container,
                            {
                                transform: [{ translateY }],
                            }
                        ]}
                    >
                        <SafeAreaView style={styles.safeArea} edges={['top']}>
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={handleClose}
                                >
                                    <MaterialIcons name="chevron-left" size={28} color="#333" />
                                </TouchableOpacity>
                                <Text style={styles.title}>Datos de entrega</Text>
                                <View style={styles.placeholder} />
                            </View>
                        </SafeAreaView>

                        {/* Información importante */}
                        <View style={styles.importantInfo}>
                            <MaterialIcons name="info" size={20} color="#fa7e17" />
                            <Text style={styles.importantInfoText}>
                                Todos los campos marcados con * son obligatorios
                            </Text>
                        </View>

                        {/* Content */}
                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            <View style={styles.form}>
                                {/* Nombre */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Nombre completo *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.nombre}
                                        onChangeText={(text) => handleInputChange('nombre', text)}
                                        placeholder="Ej: Juan Pérez"
                                        placeholderTextColor="#999"
                                    />
                                </View>

                                {/* Celular */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Número de celular *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.celular}
                                        onChangeText={(text) => handleInputChange('celular', text)}
                                        placeholder="Ej: 3101234567"
                                        placeholderTextColor="#999"
                                        keyboardType="phone-pad"
                                    />
                                </View>

                                {/* Dirección */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Dirección *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.direccion}
                                        onChangeText={(text) => handleInputChange('direccion', text)}
                                        placeholder="Ej: Calle 123 # 45-67"
                                        placeholderTextColor="#999"
                                    />
                                </View>

                                {/* Departamento con selector */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Departamento *</Text>
                                    <TouchableOpacity 
                                        style={styles.selector}
                                        onPress={() => setShowDepartmentPicker(true)}
                                    >
                                        <Text style={[styles.selectorText, !formData.departamento && styles.placeholder]}>
                                            {formData.departamento || 'Selecciona tu departamento'}
                                        </Text>
                                        <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                {/* Ciudad con selector */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Ciudad *</Text>
                                    <TouchableOpacity 
                                        style={[styles.selector, !formData.departamento && styles.selectorDisabled]}
                                        onPress={() => formData.departamento && setShowCityPicker(true)}
                                        disabled={!formData.departamento}
                                    >
                                        <Text style={[styles.selectorText, !formData.ciudad && styles.placeholder]}>
                                            {formData.ciudad || (formData.departamento ? 'Selecciona tu ciudad' : 'Primero selecciona departamento')}
                                        </Text>
                                        <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                {/* Referencia */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Referencia (opcional)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.referencia}
                                        onChangeText={(text) => handleInputChange('referencia', text)}
                                        placeholder="Ej: Casa blanca con portón negro"
                                        placeholderTextColor="#999"
                                        multiline
                                        numberOfLines={2}
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        {/* Footer */}
                        <SafeAreaView style={styles.safeAreaBottom} edges={['bottom']}>
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
                                    onPress={handleContinue}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <ActivityIndicator size="small" color="#fff" />
                                            <Text style={styles.continueButtonText}>Guardando...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.continueButtonText}>Continuar</Text>
                                            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>

            {/* Modal selector de departamentos */}
            {showDepartmentPicker && (
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Selecciona tu departamento</Text>
                            <TouchableOpacity onPress={() => setShowDepartmentPicker(false)}>
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            {Object.keys(DEPARTAMENTOS_CIUDADES).map((dept) => (
                                <TouchableOpacity
                                    key={dept}
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        handleInputChange('departamento', dept);
                                        setShowDepartmentPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerItemText}>{dept}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            {/* Modal selector de ciudades */}
            {showCityPicker && (
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Selecciona tu ciudad</Text>
                            <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            {availableCities.map((city) => (
                                <TouchableOpacity
                                    key={city}
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        handleInputChange('ciudad', city);
                                        setShowCityPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerItemText}>{city}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}
        </Modal>
    );

};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
        zIndex: 10000,
        elevation: 10000,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: screenHeight * 0.9, // Exactamente 90% de la pantalla
        zIndex: 10000,
        elevation: 10000,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    closeButton: {
        padding: 5,
    },
    title: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
    },
    placeholder: {
        width: 34,
    },
    safeArea: {
        backgroundColor: '#fff',
    },
    safeAreaBottom: {
        backgroundColor: '#fff',
    },
    importantInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff8f0',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ffe0b2',
    },
    importantInfoText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#f57c00',
        marginLeft: 8,
        flex: 1,
    },
    content: {
        flex: 1,
    },
    form: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 15,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
        backgroundColor: '#fafafa',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    selector: {
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fafafa',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    selectorDisabled: {
        backgroundColor: '#f5f5f5',
        borderColor: '#e0e0e0',
    },
    selectorText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
        flex: 1,
    },
    placeholder: {
        color: '#999',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    continueButton: {
        backgroundColor: '#fa7e17',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#fa7e17',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    continueButtonDisabled: {
        opacity: 0.6,
        shadowOpacity: 0,
        elevation: 0,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        marginRight: 8,
    },
    // Estilos para los pickers
    pickerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20000,
        elevation: 20000,
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '85%',
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    pickerTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
    },
    pickerList: {
        maxHeight: 300,
    },
    pickerItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    pickerItemText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
    },
});

export default CustomerModal;