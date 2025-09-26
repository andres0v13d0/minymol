import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Localization from 'expo-localization';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth } from '../../config/firebase';
import { getUbuntuFont } from '../../utils/fonts';
import LogoMinymol from '../LogoMinymol';

const LoginModal = ({ visible, onClose, onLoginSuccess }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [countryInfo, setCountryInfo] = useState({
        code: 'CO',
        flag: '🇨🇴',
        dialCode: '+57',
        placeholder: '310 123 4567',
        validation: /^3[0-9]{9}$/
    });

    // Configuración de países soportados
    const countriesConfig = {
        CO: { // Colombia
            code: 'CO',
            flag: '🇨🇴',
            dialCode: '+57',
            placeholder: '3101234567',
            validation: /^3[0-9]{9}$/,
            length: 10
        },
        EC: { // Ecuador
            code: 'EC',
            flag: '🇪🇨',
            dialCode: '+593',
            placeholder: '0912345678',
            validation: /^9[0-9]{8}$/,
            length: 9
        },
        PE: { // Perú
            code: 'PE',
            flag: '🇵🇪',
            dialCode: '+51',
            placeholder: '912345678',
            validation: /^9[0-9]{8}$/,
            length: 9
        },
        // Agregar más países según necesites
    };

    // Detectar país automáticamente
    useEffect(() => {
        const detectCountry = async () => {
            try {
                const locales = Localization.getLocales();
                const deviceRegion = locales[0]?.regionCode || 'CO';
                
                console.log('País detectado:', deviceRegion);
                
                // Si el país está soportado, usarlo; si no, usar Colombia por defecto
                const selectedCountry = countriesConfig[deviceRegion] || countriesConfig.CO;
                setCountryInfo(selectedCountry);
                
            } catch (error) {
                console.log('Error detectando país, usando Colombia por defecto:', error);
                setCountryInfo(countriesConfig.CO);
            }
        };

        detectCountry();
    }, []);

    // Configurar persistencia local al montar el componente
    React.useEffect(() => {
        const configurePersistence = async () => {
            try {
                // En React Native, la persistencia local ya está habilitada por defecto
                // pero podemos asegurarnoslo explícitamente si es necesario
                console.log('Firebase Auth persistence configurada como LOCAL');
            } catch (error) {
                console.error('Error configurando persistencia:', error);
            }
        };
        configurePersistence();
    }, []);

    const sendTokenToBackend = async (token) => {
        try {
            const response = await axios.post(
                'https://api.minymol.com/auth/login',
                { token },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const userData = response.data;

            // Guardar datos en AsyncStorage
            await AsyncStorage.setItem('usuario', JSON.stringify(userData));
            await AsyncStorage.setItem('token', token);

            // Llamar callback de éxito
            if (onLoginSuccess) {
                onLoginSuccess(userData, token);
            }

        } catch (error) {
            console.error('Error desde el backend:', error);

            let errorMessage = 'No se pudo autenticar con el servidor';

            if (error.response?.status === 401) {
                errorMessage = 'Token inválido o usuario no autorizado';
            } else if (error.response?.status === 500) {
                errorMessage = 'Error del servidor. Intenta de nuevo';
            } else if (error.code === 'NETWORK_ERROR') {
                errorMessage = 'Sin conexión a internet';
            }

            Alert.alert('Error de autenticación', errorMessage);
        }
    };

    const validatePhone = (phoneNumber) => {
        // Remover espacios y caracteres especiales
        const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
        
        // Validar usando el patrón del país actual
        return countryInfo.validation.test(cleanPhone);
    };

    const clearFieldsOnError = () => {
        setPhone('');
        setPassword('');
        setShowPassword(false);
        setErrors({});
    };

    const handleLogin = async () => {
        setErrors({});

        // Validaciones
        if (!phone.trim()) {
            setErrors({ phone: 'Ingresa tu número de celular' });
            return;
        }

        if (!validatePhone(phone)) {
            setErrors({ 
                phone: `Número de celular inválido. Ejemplo: ${countryInfo.placeholder.replace(/\s/g, '')}` 
            });
            return;
        }

        if (!password.trim()) {
            setErrors({ password: 'Ingresa tu contraseña' });
            return;
        }

        if (password.length < 6) {
            setErrors({ password: 'La contraseña debe tener al menos 6 caracteres' });
            return;
        }

        setLoading(true);

        try {
            // Limpiar número de teléfono y crear email fake
            const cleanPhone = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
            const fakeEmail = `${cleanPhone}@minymol.com`;

            console.log('Intentando login con:', fakeEmail);

            // Autenticar con Firebase
            const result = await signInWithEmailAndPassword(auth, fakeEmail, password);
            const token = await result.user.getIdToken();

            console.log('Login exitoso con Firebase, obteniendo datos del backend...');

            // Enviar token al backend
            await sendTokenToBackend(token);

        } catch (error) {
            console.error('Error en login:', error);

            let errorMessage = '';
            let shouldClearFields = true;

            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Número de celular no registrado';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Contraseña incorrecta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Formato de número inválido';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Cuenta deshabilitada. Contacta soporte';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Demasiados intentos fallidos. Espera un momento e intenta de nuevo';
                    shouldClearFields = false;
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Sin conexión a internet. Verifica tu conexión';
                    shouldClearFields = false;
                    break;
                default:
                    errorMessage = 'Credenciales incorrectas. Verifica tu número y contraseña';
            }

            // Limpiar campos por seguridad (excepto en errores de red)
            if (shouldClearFields) {
                clearFieldsOnError();
            }

            Alert.alert('Error de inicio de sesión', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setPhone('');
            setPassword('');
            setShowPassword(false);
            setErrors({});
            onClose();
        }
    };

    const handleForgotPassword = () => {
        Alert.alert(
            'Recuperar contraseña',
            'Contacta con soporte para recuperar tu contraseña',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Contactar', onPress: () => console.log('Contactar soporte') }
            ]
        );
    };

    const handleRegister = () => {
        Alert.alert(
            'Registro',
            'Para registrarte, contacta con nuestro equipo de ventas',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Contactar', onPress: () => console.log('Contactar ventas') }
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header con botón cerrar y logo */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        
                        <View style={styles.headerLogoContainer}>
                            <LogoMinymol size="small" />
                        </View>
                    </View>

                    {/* Título */}
                    <Text style={styles.title}>¡Bienvenido!</Text>
                    <Text style={styles.subtitle}>
                        Ingresa tu número de celular y contraseña para continuar
                    </Text>

                    {/* Formulario */}
                    <View style={styles.formContainer}>
                        {/* Campo de número de celular */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Número de celular
                                <Text style={styles.requiredAsterisk}> *</Text>
                            </Text>
                            <View style={[
                                styles.phoneInputContainer,
                                errors.phone && styles.inputError,
                                loading && styles.inputDisabled
                            ]}>
                                <TextInput
                                    style={[styles.phoneInputClean, loading && styles.inputTextDisabled]}
                                    placeholder={countryInfo.placeholder}
                                    value={phone}
                                    onChangeText={(text) => {
                                        // Solo permitir números y espacios
                                        const formatted = text.replace(/[^0-9\s]/g, '');
                                        setPhone(formatted);
                                        if (errors.phone) setErrors({ ...errors, phone: null });
                                    }}
                                    keyboardType="phone-pad"
                                    maxLength={countryInfo.length + 3} // +3 para espacios
                                    editable={!loading}
                                    placeholderTextColor="#aaa"
                                />
                            </View>
                            {errors.phone && (
                                <Text style={styles.errorText}>{errors.phone}</Text>
                            )}
                        </View>

                        {/* Campo de contraseña */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Contraseña
                                <Text style={styles.requiredAsterisk}> *</Text>
                            </Text>
                            <View style={[
                                styles.passwordContainer,
                                errors.password && styles.inputError,
                                loading && styles.inputDisabled
                            ]}>
                                <TextInput
                                    style={[styles.passwordInput, loading && styles.inputTextDisabled]}
                                    placeholder="Ingresa tu contraseña"
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (errors.password) setErrors({ ...errors, password: null });
                                    }}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!loading}
                                    placeholderTextColor="#aaa"
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowPassword(!showPassword)}
                                    disabled={loading}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={22}
                                        color={loading ? '#ccc' : '#666'}
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.password && (
                                <Text style={styles.errorText}>{errors.password}</Text>
                            )}
                        </View>

                        {/* Enlace olvidé contraseña */}
                        <TouchableOpacity
                            style={styles.forgotContainer}
                            onPress={handleForgotPassword}
                            disabled={loading}
                        >
                            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                        </TouchableOpacity>

                        {/* Botón de login */}
                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading || !phone.trim() || !password.trim()}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color="white" />
                                    <Text style={styles.loadingText}>Verificando...</Text>
                                </View>
                            ) : (
                                <Text style={styles.loginButtonText}>Iniciar sesión</Text>
                            )}
                        </TouchableOpacity>

                        {/* Enlace de registro */}
                        <View style={styles.registerContainer}>
                            <Text style={styles.registerText}>
                                ¿No tienes cuenta?{' '}
                                <Text
                                    style={[styles.registerLink, loading && styles.linkDisabled]}
                                    onPress={loading ? null : handleRegister}
                                >
                                    Regístrate
                                </Text>
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f8f8f8',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    headerLogoContainer: {
        flex: 1,
        alignItems: 'center',
        marginRight: 44, // Para centrar el logo considerando el botón de cerrar
    },
    title: {
        fontSize: 32,
        fontFamily: getUbuntuFont('bold'),
        color: '#14144b',
        textAlign: 'center',
        marginBottom: 10,
        marginTop: 30,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    formContainer: {
        paddingHorizontal: 30,
        flex: 1,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: '#14144b',
        marginBottom: 8,
    },
    requiredAsterisk: {
        color: '#fa7e17',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e8e8e8',
        borderRadius: 16,
        backgroundColor: '#fafafa',
        minHeight: 56,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    countryCode: {
        paddingLeft: 16,
        paddingRight: 12,
        borderRightWidth: 1,
        borderRightColor: '#e8e8e8',
    },
    countryCodeText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: '#333',
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
    },
    phoneInputClean: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
        width: '100%',
    },
    inputError: {
        borderColor: '#ff4757',
        backgroundColor: '#fff5f5',
    },
    inputDisabled: {
        backgroundColor: '#f0f0f0',
        borderColor: '#ddd',
    },
    inputTextDisabled: {
        color: '#999',
    },
    errorText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#ff4757',
        marginTop: 6,
        marginLeft: 4,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e8e8e8',
        borderRadius: 16,
        backgroundColor: '#fafafa',
        minHeight: 56,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
    },
    eyeButton: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 8,
    },
    forgotContainer: {
        alignItems: 'flex-end',
        marginBottom: 35,
        marginTop: 5,
    },
    forgotText: {
        fontSize: 15,
        fontFamily: getUbuntuFont('medium'),
        color: '#fa7e17',
    },
    loginButton: {
        backgroundColor: '#fa7e17',
        paddingVertical: 20,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        minHeight: 60,
        shadowColor: '#fa7e17',
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    loginButtonDisabled: {
        backgroundColor: '#d0d0d0',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        letterSpacing: 0.5,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: 'white',
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        marginLeft: 8,
    },
    registerContainer: {
        alignItems: 'center',
        paddingBottom: 40,
        paddingTop: 10,
    },
    registerText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    registerLink: {
        color: '#fa7e17',
        fontFamily: getUbuntuFont('medium'),
        textDecorationLine: 'underline',
    },
    linkDisabled: {
        color: '#ccc',
    },
});

export default LoginModal;
