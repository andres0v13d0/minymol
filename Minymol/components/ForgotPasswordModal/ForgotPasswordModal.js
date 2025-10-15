import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Localization from 'expo-localization';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
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
import { getUbuntuFont } from '../../utils/fonts';
import CodigoInput from '../CodigoInput';
import LogoMinymol from '../LogoMinymol';

const ForgotPasswordModal = ({ visible, onClose, onOpenLogin }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Animaciones
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Referencias
    const codigoInputRef = useRef(null);

    // Datos del formulario
    const [localPhone, setLocalPhone] = useState('');
    const [internationalPhone, setInternationalPhone] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [countryInfo, setCountryInfo] = useState({
        code: 'CO',
        dialCode: '+57',
        placeholder: '3101234567',
        validation: /^3[0-9]{9}$/,
        length: 10
    });

    // Configuración de países soportados
    const countriesConfig = {
        CO: { // Colombia
            code: 'CO',
            dialCode: '+57',
            placeholder: '3101234567',
            validation: /^3[0-9]{9}$/,
            length: 10
        },
        EC: { // Ecuador
            code: 'EC',
            dialCode: '+593',
            placeholder: '0912345678',
            validation: /^9[0-9]{8}$/,
            length: 9
        },
        PE: { // Perú
            code: 'PE',
            dialCode: '+51',
            placeholder: '912345678',
            validation: /^9[0-9]{8}$/,
            length: 9
        },
    };

    // Detectar país automáticamente
    useEffect(() => {
        const detectCountry = async () => {
            try {
                const locales = Localization.getLocales();
                const deviceRegion = locales[0]?.regionCode || 'CO';

                const selectedCountry = countriesConfig[deviceRegion] || countriesConfig.CO;
                setCountryInfo(selectedCountry);

            } catch (error) {
                console.log('Error detectando país, usando Colombia por defecto:', error);
                setCountryInfo(countriesConfig.CO);
            }
        };

        if (visible) {
            detectCountry();
        }
    }, [visible]);

    // Animación de transición entre pasos
    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            slideAnim.setValue(0);
        }
    }, [visible, step]);

    // Validar número de teléfono
    const validatePhone = (phoneNumber) => {
        const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
        const digitsOnly = cleanPhone.replace(/\+/g, '');
        return digitsOnly.length >= 7 && digitsOnly.length <= 15 && /^[0-9]+$/.test(digitsOnly);
    };

    // Validar contraseña
    const validatePassword = (pwd) => {
        const hasLetter = /[A-Za-z]/.test(pwd);
        const hasNumberOrSymbol = /[0-9\W]/.test(pwd);
        const hasMinLength = pwd.length >= 10;
        return hasLetter && hasNumberOrSymbol && hasMinLength;
    };

    // Paso 1: Enviar código
    const handleStep1Next = async () => {
        setErrors({});

        if (!localPhone.trim()) {
            setErrors({ phone: 'Ingresa tu número de celular' });
            return;
        }

        if (!validatePhone(localPhone)) {
            setErrors({
                phone: 'Número de celular inválido. Debe contener entre 7 y 15 dígitos'
            });
            return;
        }

        setLoading(true);

        try {
            const cleanPhone = localPhone.replace(/\s+/g, '').replace(/[^0-9]/g, '');

            // Resolver el número de teléfono
            const resolveRes = await axios.get(
                `https://api.minymol.com/users/resolve-phone/${cleanPhone}`
            );
            const fullPhone = resolveRes.data.phoneNumber;

            // Enviar código de verificación
            await axios.post('https://api.minymol.com/notifications/verify/resend', {
                channel: 'whatsapp',
                type: 'recover_password',
                phoneNumber: fullPhone,
            });

            setInternationalPhone(fullPhone);
            setStep(2);

        } catch (error) {
            console.error('Error enviando código:', error);

            let errorMessage = 'No se pudo enviar el código de verificación';

            if (error.response?.status === 404) {
                errorMessage = 'Número de celular no registrado';
            } else if (error.response?.status === 500) {
                errorMessage = 'Error del servidor. Intenta de nuevo';
            } else if (error.code === 'NETWORK_ERROR') {
                errorMessage = 'Sin conexión a internet';
            }

            setErrors({ phone: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    // Paso 2: Verificar código
    const handleStep2Next = async () => {
        setErrors({});

        if (verificationCode.length !== 6) {
            setErrors({ code: 'El código debe tener 6 dígitos' });
            return;
        }

        setLoading(true);

        try {
            await axios.post('https://api.minymol.com/notifications/verify/confirm', {
                channel: 'whatsapp',
                type: 'recover_password',
                phoneNumber: internationalPhone,
                code: verificationCode,
            });

            setStep(3);

        } catch (error) {
            console.error('Error verificando código:', error);
            setErrors({ code: 'Código incorrecto o expirado' });
        } finally {
            setLoading(false);
        }
    };

    // Paso 3: Cambiar contraseña
    const handleStep3Submit = async () => {
        setErrors({});

        if (!newPassword.trim()) {
            setErrors({ password: 'Ingresa tu nueva contraseña' });
            return;
        }

        if (!validatePassword(newPassword)) {
            setErrors({
                password: 'La contraseña debe tener al menos 10 caracteres, incluir una letra y un número o símbolo'
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrors({ confirmPassword: 'Las contraseñas no coinciden' });
            return;
        }

        setLoading(true);

        try {
            const cleanPhone = localPhone.replace(/\s+/g, '').replace(/[^0-9]/g, '');

            await axios.patch('https://api.minymol.com/users/recover-password', {
                phoneNumber: cleanPhone,
                code: verificationCode,
                newPassword: newPassword,
            });

            Alert.alert(
                'Contraseña actualizada',
                'Tu contraseña ha sido cambiada exitosamente. Ahora puedes iniciar sesión.',
                [
                    {
                        text: 'Iniciar sesión',
                        onPress: handleGoToLogin
                    }
                ]
            );

        } catch (error) {
            console.error('Error cambiando contraseña:', error);

            let errorMessage = 'No se pudo cambiar la contraseña';

            if (error.response?.status === 400) {
                errorMessage = 'Código inválido o expirado';
            } else if (error.response?.status === 500) {
                errorMessage = 'Error del servidor. Intenta de nuevo';
            }

            setErrors({ password: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
            setErrors({});
        }
    };

    const resetForm = () => {
        setStep(1);
        setLocalPhone('');
        setInternationalPhone('');
        setVerificationCode('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setErrors({});
    };

    const handleClose = () => {
        if (!loading) {
            resetForm();
            onClose();
        }
    };

    const handleResendCode = async () => {
        setLoading(true);
        try {
            await axios.post('https://api.minymol.com/notifications/verify/resend', {
                channel: 'whatsapp',
                type: 'recover_password',
                phoneNumber: internationalPhone,
            });

            Alert.alert('Código reenviado', 'Te hemos enviado un nuevo código por WhatsApp');
        } catch (error) {
            Alert.alert('Error', 'No se pudo reenviar el código');
        } finally {
            setLoading(false);
        }
    };

    const handleGoToLogin = () => {
        resetForm();
        onClose();
        setTimeout(() => {
            if (onOpenLogin) {
                onOpenLogin();
            }
        }, 300);
    };

    // Validación de contraseña en tiempo real
    const passwordValidation = {
        hasLetter: /[A-Za-z]/.test(newPassword),
        hasNumberOrSymbol: /[0-9\W]/.test(newPassword),
        hasMinLength: newPassword.length >= 10,
    };

    // Paso 1: Ingresar número
    const renderStep1 = () => (
        <Animated.View style={[styles.stepContainer, { opacity: slideAnim }]}>
            <Text style={styles.stepTitle}>Recuperar contraseña</Text>
            <Text style={styles.stepSubtitle}>
                Ingresa el número de celular con el que creaste tu cuenta para recibir un código por WhatsApp
            </Text>

            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        Número de celular <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <View style={[
                        styles.phoneInputContainer,
                        errors.phone && styles.inputError,
                        loading && styles.inputDisabled
                    ]}>
                        <TextInput
                            style={[styles.phoneInput, loading && styles.inputTextDisabled]}
                            placeholder={countryInfo.placeholder}
                            value={localPhone}
                            onChangeText={(text) => {
                                const formatted = text.replace(/[^0-9\s]/g, '');
                                setLocalPhone(formatted);
                                if (errors.phone) setErrors({ ...errors, phone: null });
                            }}
                            keyboardType="phone-pad"
                            maxLength={countryInfo.length + 3}
                            editable={!loading}
                            placeholderTextColor="#aaa"
                        />
                    </View>
                    {errors.phone && (
                        <Text style={styles.errorText}>{errors.phone}</Text>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.nextButton, loading && styles.nextButtonDisabled]}
                    onPress={handleStep1Next}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text style={styles.nextButtonText}>Enviar código</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.loginContainer}>
                    <Text style={styles.loginText}>
                        ¿Recordaste tu contraseña?{' '}
                        <Text
                            style={[styles.loginLink, loading && styles.linkDisabled]}
                            onPress={loading ? null : handleGoToLogin}
                        >
                            Inicia sesión
                        </Text>
                    </Text>
                </View>
            </View>
        </Animated.View>
    );

    // Paso 2: Verificar código
    const renderStep2 = () => (
        <Animated.View style={[styles.stepContainer, { opacity: slideAnim }]}>
            <Text style={styles.stepTitle}>Verificación</Text>
            <Text style={styles.stepSubtitle}>
                Ingresa el código de 6 dígitos que enviamos por WhatsApp al número{'\n'}
                <Text style={styles.phoneHighlight}>{internationalPhone}</Text>
            </Text>

            <View style={styles.formContainer}>
                <CodigoInput
                    ref={codigoInputRef}
                    length={6}
                    onComplete={(code) => {
                        setVerificationCode(code);
                        if (errors.code) setErrors({ ...errors, code: null });
                    }}
                    disabled={loading}
                />

                {errors.code && (
                    <Text style={styles.errorTextCenter}>{errors.code}</Text>
                )}

                <TouchableOpacity
                    style={[styles.nextButton, loading && styles.nextButtonDisabled]}
                    onPress={handleStep2Next}
                    disabled={loading || verificationCode.length !== 6}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text style={styles.nextButtonText}>Verificar código</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.resendContainer}
                    onPress={handleResendCode}
                    disabled={loading}
                >
                    <Text style={styles.resendText}>¿No recibiste el código? Reenviar</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    // Paso 3: Nueva contraseña
    const renderStep3 = () => (
        <Animated.View style={[styles.stepContainer, { opacity: slideAnim }]}>
            <Text style={styles.stepTitle}>Nueva contraseña</Text>
            <Text style={styles.stepSubtitle}>
                Crea una contraseña segura para tu cuenta
            </Text>

            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        Contraseña nueva <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <View style={[
                        styles.passwordContainer,
                        errors.password && styles.inputError,
                        loading && styles.inputDisabled
                    ]}>
                        <TextInput
                            style={[styles.passwordInput, loading && styles.inputTextDisabled]}
                            placeholder="Mínimo 10 caracteres"
                            value={newPassword}
                            onChangeText={(text) => {
                                setNewPassword(text);
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

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        Repetir contraseña <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <View style={[
                        styles.passwordContainer,
                        errors.confirmPassword && styles.inputError,
                        loading && styles.inputDisabled
                    ]}>
                        <TextInput
                            style={[styles.passwordInput, loading && styles.inputTextDisabled]}
                            placeholder="Repite tu contraseña"
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                            }}
                            secureTextEntry={!showConfirmPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                            placeholderTextColor="#aaa"
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={loading}
                        >
                            <Ionicons
                                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={22}
                                color={loading ? '#ccc' : '#666'}
                            />
                        </TouchableOpacity>
                    </View>
                    {errors.confirmPassword && (
                        <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                    )}
                </View>

                {/* Validación visual de contraseña */}
                <View style={styles.validationContainer}>
                    <View style={styles.validationItem}>
                        <Ionicons
                            name={passwordValidation.hasLetter ? 'checkmark-circle' : 'ellipse-outline'}
                            size={20}
                            color={passwordValidation.hasLetter ? '#4caf50' : '#ccc'}
                        />
                        <Text style={[
                            styles.validationText,
                            passwordValidation.hasLetter && styles.validationTextValid
                        ]}>
                            Al menos 1 letra
                        </Text>
                    </View>
                    <View style={styles.validationItem}>
                        <Ionicons
                            name={passwordValidation.hasNumberOrSymbol ? 'checkmark-circle' : 'ellipse-outline'}
                            size={20}
                            color={passwordValidation.hasNumberOrSymbol ? '#4caf50' : '#ccc'}
                        />
                        <Text style={[
                            styles.validationText,
                            passwordValidation.hasNumberOrSymbol && styles.validationTextValid
                        ]}>
                            Número o carácter especial
                        </Text>
                    </View>
                    <View style={styles.validationItem}>
                        <Ionicons
                            name={passwordValidation.hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                            size={20}
                            color={passwordValidation.hasMinLength ? '#4caf50' : '#ccc'}
                        />
                        <Text style={[
                            styles.validationText,
                            passwordValidation.hasMinLength && styles.validationTextValid
                        ]}>
                            Mínimo 10 caracteres
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleStep3Submit}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="white" />
                            <Text style={styles.loadingText}>Cambiando contraseña...</Text>
                        </View>
                    ) : (
                        <Text style={styles.submitButtonText}>Cambiar contraseña</Text>
                    )}
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

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
                    {/* Header */}
                    <View style={styles.header}>
                        {step > 1 ? (
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleBack}
                                disabled={loading}
                            >
                                <Ionicons name="arrow-back" size={24} color="#333" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.backButtonPlaceholder} />
                        )}

                        <View style={styles.headerLogoContainer}>
                            <LogoMinymol size="small" />
                        </View>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            disabled={loading}
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* Renderizar pasos */}
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
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
        paddingTop: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f8f8f8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonPlaceholder: {
        width: 44,
        height: 44,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f8f8f8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerLogoContainer: {
        flex: 1,
        alignItems: 'center',
    },
    stepContainer: {
        flex: 1,
        paddingHorizontal: 30,
        paddingTop: 20,
    },
    stepTitle: {
        fontSize: 32,
        fontFamily: getUbuntuFont('bold'),
        color: '#14144b',
        textAlign: 'center',
        marginBottom: 10,
    },
    stepSubtitle: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
    },
    phoneHighlight: {
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
    },
    formContainer: {
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
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e8e8e8',
        borderRadius: 16,
        backgroundColor: '#fafafa',
        minHeight: 56,
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
    errorTextCenter: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#ff4757',
        textAlign: 'center',
        marginBottom: 20,
    },
    validationContainer: {
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    validationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    validationText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#999',
        marginLeft: 8,
    },
    validationTextValid: {
        color: '#4caf50',
        fontFamily: getUbuntuFont('medium'),
    },
    nextButton: {
        backgroundColor: '#fa7e17',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 20,
        minHeight: 56,
        shadowColor: '#fa7e17',
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    nextButtonDisabled: {
        backgroundColor: '#d0d0d0',
        shadowOpacity: 0.1,
    },
    nextButtonText: {
        color: 'white',
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
    },
    submitButton: {
        backgroundColor: '#fa7e17',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 40,
        minHeight: 56,
        shadowColor: '#fa7e17',
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    submitButtonDisabled: {
        backgroundColor: '#d0d0d0',
        shadowOpacity: 0.1,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
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
    loginContainer: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    loginText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
    },
    loginLink: {
        color: '#fa7e17',
        fontFamily: getUbuntuFont('medium'),
        textDecorationLine: 'underline',
    },
    linkDisabled: {
        color: '#ccc',
    },
    resendContainer: {
        alignItems: 'center',
        paddingTop: 10,
    },
    resendText: {
        fontSize: 15,
        fontFamily: getUbuntuFont('medium'),
        color: '#fa7e17',
        textDecorationLine: 'underline',
    },
});

export default ForgotPasswordModal;
