import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Localization from 'expo-localization';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
import { auth } from '../../config/firebase';
import { apiCall } from '../../utils/apiUtils';
import { getUbuntuFont } from '../../utils/fonts';
import latinCountries from '../../utils/latinCountries';
import CodigoInput from '../CodigoInput';
import CustomPicker from '../CustomPicker';
import LogoMinymol from '../LogoMinymol';
import ProgressBar from '../ProgressBar';
import { useNotifications } from '../../hooks/useNotifications';

const RegisterModal = ({ visible, onClose, onRegisterSuccess, onOpenLogin }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Hook de notificaciones
    const { enableNotifications, checkUserStatus } = useNotifications();

    // Animaciones
    const slideAnim = useRef(new Animated.Value(0)).current;
    
    // Referencias
    const codigoInputRef = useRef(null);

    // Datos del formulario
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [localPhone, setLocalPhone] = useState('');
    const [internationalPhone, setInternationalPhone] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [departments, setDepartments] = useState([]);
    const [cities, setCities] = useState([]);

    // Configuración de países con validaciones
    const getCountryConfig = () => {
        const config = {};
        latinCountries.forEach(country => {
            config[country.value] = {
                ...country,
                validation: getValidationPattern(country.value),
                length: getPhoneLength(country.value)
            };
        });
        return config;
    };

    const getValidationPattern = (countryCode) => {
        const patterns = {
            'CO': /^3[0-9]{9}$/,  // Colombia: 3001234567
            'EC': /^9[0-9]{8}$/,  // Ecuador: 912345678
            'PE': /^9[0-9]{8}$/,  // Perú: 912345678
            'AR': /^[0-9]{10,11}$/, // Argentina: variable
            'CL': /^[0-9]{8,9}$/,   // Chile: variable
        };
        return patterns[countryCode] || /^[0-9]{7,15}$/; // Patrón genérico
    };

    const getPhoneLength = (countryCode) => {
        const lengths = {
            'CO': 10,
            'EC': 9,
            'PE': 9,
            'AR': 11,
            'CL': 9,
        };
        return lengths[countryCode] || 12; // Longitud genérica
    };

    const countriesConfig = getCountryConfig();

    // Detectar país automáticamente al montar el componente
    useEffect(() => {
        const detectCountry = async () => {
            try {
                const locales = Localization.getLocales();
                const deviceRegion = locales[0]?.regionCode || 'CO';

                console.log('País detectado:', deviceRegion);

                // Buscar el país en la lista de países latinos
                const detectedCountry = latinCountries.find(country => country.value === deviceRegion);
                const defaultCountry = detectedCountry || latinCountries.find(country => country.value === 'CO');

                setSelectedCountry(defaultCountry);

            } catch (error) {
                console.log('Error detectando país, usando Colombia por defecto:', error);
                const defaultCountry = latinCountries.find(country => country.value === 'CO');
                setSelectedCountry(defaultCountry);
            }
        };

        if (visible) {
            detectCountry();
        }
    }, [visible]);

    // Cargar departamentos de Colombia cuando llegue al paso 4
    useEffect(() => {
        const loadDepartments = async () => {
            if (step === 4 && departments.length === 0) {
                try {
                    const response = await axios.get(
                        'https://raw.githubusercontent.com/marcovega/colombia-json/master/colombia.json'
                    );
                    setDepartments(response.data || []);
                } catch (error) {
                    console.error('Error cargando departamentos:', error);
                    Alert.alert('Error', 'No se pudieron cargar los departamentos');
                }
            }
        };
        loadDepartments();
    }, [step, departments.length]);

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

    // API Functions
    const checkIfPhoneExists = async (phone) => {
        try {
            const response = await axios.get(`https://api.minymol.com/users/resolve-phone/${phone}`);
            return response.data.phoneNumber;
        } catch (error) {
            if (error.response?.status === 404) {
                return null; // Teléfono disponible
            }
            throw error;
        }
    };

    const sendVerificationCode = async (phone) => {
        try {
            console.log('📤 Enviando código de verificación a:', phone);
            const response = await axios.post('https://api.minymol.com/notifications/verify/resend', {
                channel: 'whatsapp',
                type: 'verify_phone',
                phoneNumber: phone
            });
            console.log('✅ Respuesta envío código:', response.data);
            return true;
        } catch (error) {
            console.error('❌ Error enviando código:', error.response?.data || error.message);
            console.error('📞 Número:', phone);
            throw error;
        }
    };

    const verifyCode = async (phone, code) => {
        try {
            console.log('🔍 Verificando código...');
            console.log('📞 Número:', phone);
            console.log('🔑 Código:', code);
            
            const response = await axios.post('https://api.minymol.com/notifications/verify/confirm', {
                channel: 'whatsapp',
                type: 'verify_phone',
                phoneNumber: phone,
                code: code
            });
            
            console.log('✅ Respuesta verificación:', response.data);
            
            // ✅ FIX: El backend responde con {message: "Verificación exitosa"}, no con {verified: true}
            // Si la petición tiene éxito (status 200) y no lanza error, es válido
            return true;
        } catch (error) {
            console.error('❌ Error verificando código:', error.response?.status, error.response?.data || error.message);
            console.error('📞 Número que falló:', phone);
            console.error('🔑 Código que falló:', code);
            return false;
        }
    };

    const registerUserInBackend = async (userData, token) => {
        try {
            console.log('🔐 Enviando token al backend para login...');
            
            // Primer paso: Login con el token de Firebase (igual que la web)
            const loginResponse = await axios.post(
                'https://api.minymol.com/auth/login',
                { token },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('✅ Login exitoso:', loginResponse.data);

            // Segundo paso: Completar perfil del usuario
            console.log('📝 Completando perfil de usuario...');
            
            await axios.post(
                'https://api.minymol.com/users/complete-profile',
                {
                    nombre: `${userData.firstName} ${userData.lastName}`,
                    telefono: userData.phoneNumber,
                    departamento: userData.department || null,
                    ciudad: userData.city || null,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            console.log('✅ Perfil completado');

            // Tercer paso: Obtener los datos actualizados del usuario usando apiCall
            console.log('🔄 Obteniendo datos actualizados del usuario...');
            
            const updatedUserResponse = await apiCall(
                'https://api.minymol.com/users/me',
                { method: 'GET' }
            );

            const updatedUserData = await updatedUserResponse.json();
            console.log('✅ Datos actualizados obtenidos:', updatedUserData);

            return updatedUserData;

        } catch (error) {
            console.error('❌ Error en registro backend:', error.response?.status, error.response?.data || error.message);
            throw error;
        }
    };

    // Validation Functions
    const validatePhone = (phone) => {
        if (!selectedCountry) return false;
        
        const config = countriesConfig[selectedCountry.value];
        if (!config) return false;

        const cleanPhone = phone.replace(/\s+/g, '');
        return config.validation.test(cleanPhone);
    };

    const validatePassword = (pwd) => {
        return pwd.length >= 6;
    };

    const validateName = (name) => {
        return name.trim().length >= 2 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name);
    };

    // Step Handlers
    const handleStep1Next = async () => {
        setErrors({});

        if (!selectedCountry) {
            setErrors({ country: 'Selecciona tu país' });
            return;
        }

        if (!localPhone.trim()) {
            setErrors({ phone: 'Ingresa tu número de celular' });
            return;
        }

        if (!validatePhone(localPhone)) {
            setErrors({ 
                phone: `Número inválido. Formato esperado: ${countriesConfig[selectedCountry.value]?.label}` 
            });
            return;
        }

        setLoading(true);

        try {
            const cleanPhone = localPhone.replace(/\s+/g, '');
            const fullPhone = `${selectedCountry.dialCode}${cleanPhone}`;
            
            // Verificar si el teléfono ya existe
            const existingPhone = await checkIfPhoneExists(fullPhone);
            
            if (existingPhone) {
                setErrors({ phone: 'Este número ya está registrado. Inicia sesión en su lugar.' });
                setLoading(false);
                return;
            }

            // Guardar número internacional
            setInternationalPhone(fullPhone);

            // Enviar código de verificación
            await sendVerificationCode(fullPhone);

            Alert.alert(
                'Código enviado',
                `Te hemos enviado un código de verificación a ${fullPhone}`,
                [{ text: 'OK' }]
            );

            setStep(2);

        } catch (error) {
            console.error('Error en paso 1:', error);
            Alert.alert(
                'Error',
                'No se pudo enviar el código de verificación. Intenta de nuevo.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleStep2Next = async () => {
        setErrors({});

        if (verificationCode.length !== 6) {
            setErrors({ code: 'Ingresa el código de 6 dígitos' });
            return;
        }

        setLoading(true);

        try {
            const isValid = await verifyCode(internationalPhone, verificationCode);

            if (!isValid) {
                setErrors({ code: 'Código incorrecto. Verifica e intenta de nuevo.' });
                if (codigoInputRef.current) {
                    codigoInputRef.current.clearCode();
                }
                setLoading(false);
                return;
            }

            setStep(3);

        } catch (error) {
            console.error('Error verificando código:', error);
            Alert.alert('Error', 'No se pudo verificar el código. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleStep3Next = () => {
        setErrors({});

        if (!password.trim()) {
            setErrors({ password: 'Ingresa una contraseña' });
            return;
        }

        if (!validatePassword(password)) {
            setErrors({ password: 'La contraseña debe tener al menos 6 caracteres' });
            return;
        }

        if (!confirmPassword.trim()) {
            setErrors({ confirmPassword: 'Confirma tu contraseña' });
            return;
        }

        if (password !== confirmPassword) {
            setErrors({ confirmPassword: 'Las contraseñas no coinciden' });
            return;
        }

        setStep(4);
    };

    const handleStep4Submit = async () => {
        setErrors({});

        if (!firstName.trim()) {
            setErrors({ firstName: 'Ingresa tu nombre' });
            return;
        }

        if (!validateName(firstName)) {
            setErrors({ firstName: 'Nombre inválido. Solo letras y espacios' });
            return;
        }

        if (!lastName.trim()) {
            setErrors({ lastName: 'Ingresa tu apellido' });
            return;
        }

        if (!validateName(lastName)) {
            setErrors({ lastName: 'Apellido inválido. Solo letras y espacios' });
            return;
        }

        if (selectedCountry?.value === 'CO') {
            if (!selectedDepartment) {
                setErrors({ department: 'Selecciona tu departamento' });
                return;
            }

            if (!selectedCity) {
                setErrors({ city: 'Selecciona tu ciudad' });
                return;
            }
        }

        setLoading(true);

        try {
            // Crear email fake para Firebase
            const cleanPhone = localPhone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
            const fakeEmail = `${cleanPhone}@minymol.com`;

            console.log('Creando usuario en Firebase:', fakeEmail);

            // Crear usuario en Firebase
            const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
            
            // Actualizar perfil
            await updateProfile(userCredential.user, {
                displayName: `${firstName} ${lastName}`.trim()
            });

            // Obtener token
            const token = await userCredential.user.getIdToken();

            console.log('Usuario creado en Firebase, registrando en backend...');

            // Preparar datos para backend
            const userData = {
                phoneNumber: internationalPhone,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                country: selectedCountry.value,
            };

            // Solo agregar departamento y ciudad si es Colombia
            if (selectedCountry?.value === 'CO') {
                userData.department = selectedDepartment;
                userData.city = selectedCity;
            }

            // Registrar en backend
            const backendResponse = await registerUserInBackend(userData, token);

            console.log('Registro completado exitosamente');

            // Guardar datos en AsyncStorage
            await AsyncStorage.setItem('usuario', JSON.stringify(backendResponse));
            await AsyncStorage.setItem('token', token);

            // ✅ Actualizar estado del usuario en el hook de notificaciones
            await checkUserStatus();

            // Mostrar éxito
            Alert.alert(
                '¡Registro exitoso!',
                'Tu cuenta ha sido creada correctamente',
                [
                    {
                        text: 'OK',
                        onPress: async () => {
                            // 🔔 SOLICITAR PERMISOS DE NOTIFICACIÓN INMEDIATAMENTE DESPUÉS DEL REGISTRO
                            try {
                                console.log('🔔 Solicitando permisos de notificación después del registro...');
                                const result = await enableNotifications(false); // isAutoInit = false
                                if (result.success) {
                                    console.log('✅ Notificaciones activadas después del registro');
                                } else {
                                    console.log('⚠️ No se pudieron activar notificaciones:', result.message);
                                }
                            } catch (notifError) {
                                console.warn('⚠️ Error al solicitar notificaciones:', notifError);
                                // No bloqueamos el registro si fallan las notificaciones
                            }

                            // Llamar callback de éxito
                            if (onRegisterSuccess) {
                                onRegisterSuccess(backendResponse, token);
                            }
                            // Resetear formulario
                            resetForm();
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('Error en registro:', error);

            let errorMessage = 'No se pudo completar el registro';

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Este número ya está registrado';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'La contraseña es muy débil';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Sin conexión a internet';
            } else if (error.response?.status === 409) {
                errorMessage = 'Este número ya está registrado en el sistema';
            }

            Alert.alert('Error de registro', errorMessage);
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
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setFirstName('');
        setLastName('');
        setSelectedDepartment('');
        setSelectedCity('');
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
            await sendVerificationCode(internationalPhone);
            Alert.alert('Código reenviado', 'Te hemos enviado un nuevo código');
            if (codigoInputRef.current) {
                codigoInputRef.current.clearCodeSilent();
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo reenviar el código');
        } finally {
            setLoading(false);
        }
    };

    const handleGoToLogin = () => {
        if (!loading && onOpenLogin) {
            onClose();
            setTimeout(() => {
                onOpenLogin();
            }, 300);
        }
    };

    // Actualizar ciudades cuando cambia el departamento
    useEffect(() => {
        if (selectedDepartment && departments.length > 0) {
            const dept = departments.find(d => d.departamento === selectedDepartment);
            if (dept) {
                setCities(dept.ciudades || []);
                setSelectedCity(''); // Reset ciudad al cambiar departamento
            }
        } else {
            setCities([]);
            setSelectedCity('');
        }
    }, [selectedDepartment, departments]);

    // Render Steps
    const renderStep1 = () => (
        <Animated.View style={[styles.stepContainer, { opacity: slideAnim }]}>
            <Text style={styles.stepTitle}>Registro</Text>
            <Text style={styles.stepSubtitle}>
                Ingresa tu número de celular para comenzar
            </Text>

            <View style={styles.formContainer}>
                {/* Selector de país */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        País <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <CustomPicker
                        selectedValue={selectedCountry?.value}
                        onValueChange={(value) => {
                            const country = latinCountries.find(c => c.value === value);
                            setSelectedCountry(country);
                            setLocalPhone(''); // Reset phone al cambiar país
                            if (errors.country) setErrors({ ...errors, country: null });
                        }}
                        items={latinCountries.map(country => ({
                            label: country.label,
                            value: country.value
                        }))}
                        placeholder="Selecciona tu país"
                        disabled={loading}
                        error={!!errors.country}
                    />
                    {errors.country && (
                        <Text style={styles.errorText}>{errors.country}</Text>
                    )}
                </View>

                {/* Campo de teléfono */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        Número de celular <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <View style={[
                        styles.phoneInputContainer,
                        errors.phone && styles.inputError,
                        loading && styles.inputDisabled
                    ]}>
                        <View style={styles.countryCode}>
                            <Text style={styles.countryCodeText}>
                                {selectedCountry?.dialCode || '+57'}
                            </Text>
                        </View>
                        <TextInput
                            style={[styles.phoneInput, loading && styles.inputTextDisabled]}
                            placeholder={countriesConfig[selectedCountry?.value]?.label?.split(' ')[1] || '3001234567'}
                            value={localPhone}
                            onChangeText={(text) => {
                                const formatted = text.replace(/[^0-9\s]/g, '');
                                setLocalPhone(formatted);
                                if (errors.phone) setErrors({ ...errors, phone: null });
                            }}
                            keyboardType="phone-pad"
                            maxLength={countriesConfig[selectedCountry?.value]?.length + 3 || 15}
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
                        <Text style={styles.nextButtonText}>Continuar</Text>
                    )}
                </TouchableOpacity>

                {/* Link a login */}
                <View style={styles.loginContainer}>
                    <Text style={styles.loginText}>
                        ¿Ya tienes cuenta?{' '}
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
                        <Text style={styles.nextButtonText}>Verificar</Text>
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

    const renderStep3 = () => (
        <Animated.View style={[styles.stepContainer, { opacity: slideAnim }]}>
            <Text style={styles.stepTitle}>Contraseña</Text>
            <Text style={styles.stepSubtitle}>
                Crea una contraseña segura para tu cuenta
            </Text>

            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        Contraseña <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <View style={[
                        styles.passwordContainer,
                        errors.password && styles.inputError,
                        loading && styles.inputDisabled
                    ]}>
                        <TextInput
                            style={[styles.passwordInput, loading && styles.inputTextDisabled]}
                            placeholder="Mínimo 6 caracteres"
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
                        Confirmar contraseña <Text style={styles.requiredAsterisk}>*</Text>
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

                <TouchableOpacity
                    style={[styles.nextButton, loading && styles.nextButtonDisabled]}
                    onPress={handleStep3Next}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <Text style={styles.nextButtonText}>Continuar</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    const renderStep4 = () => (
        <Animated.View style={[styles.stepContainer, { opacity: slideAnim }]}>
            <Text style={styles.stepTitle}>Datos personales</Text>
            <Text style={styles.stepSubtitle}>
                Cuéntanos un poco sobre ti
            </Text>

            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        Nombre <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <TextInput
                        style={[
                            styles.textInput,
                            errors.firstName && styles.inputError,
                            loading && styles.inputDisabled
                        ]}
                        placeholder="Tu nombre"
                        value={firstName}
                        onChangeText={(text) => {
                            setFirstName(text);
                            if (errors.firstName) setErrors({ ...errors, firstName: null });
                        }}
                        autoCapitalize="words"
                        editable={!loading}
                        placeholderTextColor="#aaa"
                    />
                    {errors.firstName && (
                        <Text style={styles.errorText}>{errors.firstName}</Text>
                    )}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        Apellido <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <TextInput
                        style={[
                            styles.textInput,
                            errors.lastName && styles.inputError,
                            loading && styles.inputDisabled
                        ]}
                        placeholder="Tu apellido"
                        value={lastName}
                        onChangeText={(text) => {
                            setLastName(text);
                            if (errors.lastName) setErrors({ ...errors, lastName: null });
                        }}
                        autoCapitalize="words"
                        editable={!loading}
                        placeholderTextColor="#aaa"
                    />
                    {errors.lastName && (
                        <Text style={styles.errorText}>{errors.lastName}</Text>
                    )}
                </View>

                {/* Solo mostrar departamento/ciudad para Colombia */}
                {selectedCountry?.value === 'CO' && (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Departamento <Text style={styles.requiredAsterisk}>*</Text>
                            </Text>
                            <CustomPicker
                                selectedValue={selectedDepartment}
                                onValueChange={(value) => {
                                    setSelectedDepartment(value);
                                    if (errors.department) setErrors({ ...errors, department: null });
                                }}
                                items={departments.map(dept => ({
                                    label: dept.departamento,
                                    value: dept.departamento
                                }))}
                                placeholder="Selecciona tu departamento"
                                disabled={loading}
                                error={!!errors.department}
                            />
                            {errors.department && (
                                <Text style={styles.errorText}>{errors.department}</Text>
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Ciudad <Text style={styles.requiredAsterisk}>*</Text>
                            </Text>
                            <CustomPicker
                                selectedValue={selectedCity}
                                onValueChange={(value) => {
                                    setSelectedCity(value);
                                    if (errors.city) setErrors({ ...errors, city: null });
                                }}
                                items={cities.map(city => ({
                                    label: city,
                                    value: city
                                }))}
                                placeholder={selectedDepartment ? "Selecciona tu ciudad" : "Primero selecciona un departamento"}
                                disabled={loading || !selectedDepartment}
                                error={!!errors.city}
                            />
                            {errors.city && (
                                <Text style={styles.errorText}>{errors.city}</Text>
                            )}
                        </View>
                    </>
                )}

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleStep4Submit}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="white" />
                            <Text style={styles.loadingText}>Creando cuenta...</Text>
                        </View>
                    ) : (
                        <Text style={styles.submitButtonText}>Crear cuenta</Text>
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

                        {step === 2 ? (
                            <View style={styles.closeButtonPlaceholder} />
                        ) : (
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleClose}
                                disabled={loading}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Progress Bar */}
                    <ProgressBar currentStep={step} totalSteps={4} />

                    {/* Content */}
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
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
    closeButtonPlaceholder: {
        width: 44,
        height: 44,
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
    textInput: {
        borderWidth: 2,
        borderColor: '#e8e8e8',
        borderRadius: 16,
        backgroundColor: '#fafafa',
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
        minHeight: 56,
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
        marginTop: 30,
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

export default RegisterModal;
