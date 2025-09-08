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
import { getUbuntuFont } from '../../utils/fonts';
import latinCountries from '../../utils/latinCountries';
import CodigoInput from '../CodigoInput';
import CustomPicker from '../CustomPicker';
import LogoMinymol from '../LogoMinymol';
import ProgressBar from '../ProgressBar';

const RegisterModal = ({ visible, onClose, onRegisterSuccess, onOpenLogin }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

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
            // Agregar más patrones según necesites
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
            return null;
        }
    };

    const sendVerificationCode = async (phone) => {
        return axios.post('https://api.minymol.com/notifications/verify/resend', {
            channel: 'whatsapp',
            type: 'verify_phone',
            phoneNumber: phone,
        });
    };

    const verifyCode = async (phone, code) => {
        return axios.post('https://api.minymol.com/notifications/verify/confirm', {
            channel: 'whatsapp',
            type: 'verify_phone',
            phoneNumber: phone,
            code: code,
        });
    };

    // Validation functions
    const validatePhone = (phone) => {
        if (!selectedCountry) return false;
        const config = countriesConfig[selectedCountry.value];
        if (!config) return false;

        const cleanPhone = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
        return config.validation.test(cleanPhone);
    };

    const validatePassword = (pass) => {
        return {
            hasLetter: /[a-zA-Z]/.test(pass),
            hasNumberOrSymbol: /[\d\W]/.test(pass),
            hasMinLength: pass.length >= 10,
        };
    };

    // Step navigation
    const nextStep = async () => {
        setErrors({});

        if (step === 1) {
            // Validar número de teléfono
            if (!selectedCountry) {
                setErrors({ country: 'Selecciona un país' });
                return;
            }

            if (!localPhone.trim()) {
                setErrors({ phone: 'Ingresa tu número de celular' });
                return;
            }

            if (!validatePhone(localPhone)) {
                setErrors({
                    phone: `Número inválido. Ejemplo: ${selectedCountry.example}`
                });
                return;
            }

            setLoading(true);

            try {
                // Crear número internacional
                const cleanPhone = localPhone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
                const fullNumber = selectedCountry.dial_code + cleanPhone;
                setInternationalPhone(fullNumber);

                // Verificar si el número ya existe
                const exists = await checkIfPhoneExists(cleanPhone);
                if (exists) {
                    setErrors({ phone: 'Este número ya está registrado' });
                    return;
                }

                // Enviar código de verificación
                await sendVerificationCode(fullNumber);

                Alert.alert(
                    'Código enviado',
                    'Te hemos enviado un código de verificación por WhatsApp'
                );

                animateStep(2);
            } catch (error) {
                console.error('Error enviando código:', error);
                Alert.alert('Error', 'No se pudo enviar el código de verificación');
            } finally {
                setLoading(false);
            }
            return;
        }

        if (step === 2) {
            // Validar código
            if (!verificationCode.trim() || verificationCode.length !== 6) {
                setErrors({ code: 'Ingresa el código de 6 dígitos' });
                return;
            }

            setLoading(true);

            try {
                await verifyCode(internationalPhone, verificationCode);
                animateStep(3);
            } catch (error) {
                console.error('Error verificando código:', error);
                setErrors({ code: 'Código incorrecto o expirado' });
            } finally {
                setLoading(false);
            }
            return;
        }

        if (step === 3) {
            // Validar contraseñas
            if (!password.trim()) {
                setErrors({ password: 'Ingresa una contraseña' });
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

            const validation = validatePassword(password);
            if (!validation.hasLetter || !validation.hasNumberOrSymbol || !validation.hasMinLength) {
                setErrors({ password: 'La contraseña no cumple con los requisitos' });
                return;
            }

            animateStep(4);
            return;
        }
    };

    const prevStep = () => {
        console.log('prevStep called, current step:', step);
        if (step > 1) {
            console.log('Going back to step:', step - 1);
            animateStep(step - 1);
        } else {
            console.log('Already at step 1, cannot go back');
        }
    };

    const animateStep = (newStep) => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setStep(newStep);
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        });
    };

    const handleClose = () => {
        if (!loading) {
            // Reset form
            setStep(1);
            setLocalPhone('');
            setInternationalPhone('');
            setVerificationCode('');
            setPassword('');
            setConfirmPassword('');
            setFirstName('');
            setLastName('');
            setSelectedDepartment('');
            setSelectedCity('');
            setErrors({});
            onClose();
        }
    };

    const handleRegister = async () => {
        // Validar campos del paso 4
        if (!firstName.trim()) {
            setErrors({ firstName: 'Ingresa tu nombre' });
            return;
        }

        if (!lastName.trim()) {
            setErrors({ lastName: 'Ingresa tu apellido' });
            return;
        }

        if (!selectedDepartment) {
            setErrors({ department: 'Selecciona un departamento' });
            return;
        }

        if (!selectedCity) {
            setErrors({ city: 'Selecciona una ciudad' });
            return;
        }

        setLoading(true);

        try {
            // Crear usuario en Firebase
            const cleanPhone = localPhone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
            const fakeEmail = `${cleanPhone}@minymol.com`;

            const result = await createUserWithEmailAndPassword(auth, fakeEmail, password);

            await updateProfile(result.user, {
                displayName: `${firstName} ${lastName}`
            });

            // Recargar el usuario para obtener el displayName actualizado
            await result.user.reload();

            const token = await result.user.getIdToken(true);

            // Enviar datos al backend
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

            // Completar perfil
            await axios.post(
                'https://api.minymol.com/users/complete-profile',
                {
                    nombre: `${firstName} ${lastName}`,
                    telefono: internationalPhone,
                    departamento: selectedDepartment,
                    ciudad: selectedCity,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            // Guardar datos localmente
            await AsyncStorage.setItem('usuario', JSON.stringify(userData));
            await AsyncStorage.setItem('token', token);

            // Callback de éxito
            if (onRegisterSuccess) {
                onRegisterSuccess(userData, token);
            }

            Alert.alert('¡Registro exitoso!', 'Tu cuenta ha sido creada correctamente');
            handleClose();

        } catch (error) {
            console.error('Error en registro:', error);
            Alert.alert('Error', 'No se pudo completar el registro');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (code) => {
        if (loading) return;
        
        // No procesar códigos vacíos o incompletos
        if (!code || code.length < 6) return;
        
        setErrors({});
        setLoading(true);
        
        try {
            await verifyCode(internationalPhone, code);
            animateStep(3);
        } catch (error) {
            console.error('Error verificando código:', error);
            setErrors({ code: 'Código incorrecto o expirado' });
            
            // Borrar todos los cuadros cuando hay error (sin ejecutar onComplete)
            if (codigoInputRef.current && codigoInputRef.current.clearCodeSilent) {
                setTimeout(() => {
                    codigoInputRef.current.clearCodeSilent();
                }, 100); // Pequeño delay para mostrar el error primero
            }
        } finally {
            setLoading(false);
        }
    };

    const resendCode = async () => {
        if (loading) return;
        
        setLoading(true);
        try {
            await sendVerificationCode(internationalPhone);
            Alert.alert('Código reenviado', 'Te hemos enviado un nuevo código');
        } catch (error) {
            Alert.alert('Error', 'No se pudo reenviar el código');
        } finally {
            setLoading(false);
        }
    };    const maskPhoneNumber = (phone) => {
        if (!phone || phone.length < 4) return phone;
        const visibleDigits = phone.slice(-3);
        return phone.slice(0, -3).replace(/\d/g, 'x') + visibleDigits;
    };

    const getStepContent = () => {
        const transform = [{
            translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [300, 0],
            }),
        }];

        switch (step) {
            case 1:
                return (
                    <Animated.View style={[styles.stepContainer, { transform }]}>
                        <Text style={styles.title}>Crear cuenta</Text>
                        <Text style={styles.subtitle}>
                            Para hacer tu primer pedido, necesitamos tu número de celular.
                        </Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>País</Text>
                            <CustomPicker
                                selectedValue={selectedCountry?.value || ''}
                                onValueChange={(value) => {
                                    const country = latinCountries.find(c => c.value === value);
                                    setSelectedCountry(country);
                                    setLocalPhone(''); // Limpiar teléfono al cambiar país
                                    if (errors.country) setErrors({ ...errors, country: null });
                                }}
                                items={latinCountries.map(country => ({
                                    label: country.label,
                                    value: country.value
                                }))}
                                placeholder="Selecciona tu país..."
                                disabled={loading}
                                error={!!errors.country}
                            />
                            {errors.country && (
                                <Text style={styles.errorText}>{errors.country}</Text>
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Número de celular
                                <Text style={styles.requiredAsterisk}> *</Text>
                            </Text>
                            <View style={[
                                styles.phoneContainer,
                                errors.phone && styles.inputError,
                                loading && styles.inputDisabled
                            ]}>
                                {selectedCountry && (
                                    <View style={styles.countryCodeContainer}>
                                        <Text style={styles.countryCodeText}>
                                            {selectedCountry.dial_code}
                                        </Text>
                                    </View>
                                )}
                                <TextInput
                                    style={[
                                        styles.phoneInput,
                                        loading && styles.inputTextDisabled
                                    ]}
                                    placeholder={selectedCountry?.example || 'Número de celular'}
                                    value={localPhone}
                                    onChangeText={(text) => {
                                        const formatted = text.replace(/[^0-9\s]/g, '');
                                        setLocalPhone(formatted);
                                        if (errors.phone) setErrors({ ...errors, phone: null });
                                    }}
                                    keyboardType="phone-pad"
                                    maxLength={selectedCountry ? countriesConfig[selectedCountry.value]?.length + 3 : 15}
                                    editable={!loading}
                                    placeholderTextColor="#aaa"
                                />
                            </View>
                            {errors.phone && (
                                <Text style={styles.errorText}>{errors.phone}</Text>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.continueButton, loading && styles.buttonDisabled]}
                            onPress={nextStep}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>Continuar</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.loginLinkContainer}>
                            <Text style={styles.loginLinkText}>
                                ¿Ya tienes cuenta?{' '}
                                <Text 
                                    style={styles.loginLink} 
                                    onPress={() => {
                                        if (onOpenLogin) {
                                            onClose();
                                            setTimeout(() => {
                                                onOpenLogin();
                                            }, 300);
                                        }
                                    }}
                                >
                                    Inicia sesión
                                </Text>
                            </Text>
                        </View>
                    </Animated.View>
                );

            case 2:
                return (
                    <Animated.View style={[styles.stepContainer, { transform }]}>
                        <ProgressBar currentStep={step} />
                        
                        <View style={styles.stepHeader}>
                            <Text style={styles.stepTitle}>Confirma tu número</Text>
                        </View>

                        <Text style={styles.codeLabel}>
                            Ingresa el código que te enviamos por WhatsApp
                            {internationalPhone && (
                                <Text style={styles.maskedPhone}>
                                    {' '}al número {maskPhoneNumber(internationalPhone)}
                                </Text>
                            )}
                        </Text>

                        <CodigoInput
                            ref={codigoInputRef}
                            length={6}
                            onComplete={(code) => {
                                setVerificationCode(code);
                                // Auto-envío al completar
                                handleVerifyCode(code);
                            }}
                            disabled={loading}
                        />

                        {errors.code && (
                            <Text style={styles.errorText}>{errors.code}</Text>
                        )}

                        {loading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#fa7e17" />
                                <Text style={styles.loadingText}>Verificando código...</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.resendButton}
                            onPress={resendCode}
                            disabled={loading}
                        >
                            <Text style={[styles.resendText, loading && styles.textDisabled]}>
                                Volver a enviar código
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                );

            case 3:
                const validation = validatePassword(password);
                const passwordsMatch = password && confirmPassword && password === confirmPassword;
                return (
                    <Animated.View style={[styles.stepContainer, { transform }]}>
                        <ProgressBar currentStep={step} />
                        
                        <View style={styles.stepHeader}>
                            <Text style={styles.stepTitle}>Crea una contraseña</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Contraseña
                                <Text style={styles.requiredAsterisk}> *</Text>
                            </Text>
                            <View style={[
                                styles.passwordContainer,
                                errors.password && styles.inputError
                            ]}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Ingresa tu contraseña"
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (errors.password) setErrors({ ...errors, password: null });
                                    }}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholderTextColor="#aaa"
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={22}
                                        color="#666"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Repetir contraseña
                                <Text style={styles.requiredAsterisk}> *</Text>
                            </Text>
                            <View style={[
                                styles.passwordContainer,
                                errors.confirmPassword && styles.inputError
                            ]}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Repite tu contraseña"
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                                    }}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholderTextColor="#aaa"
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={22}
                                        color="#666"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {(errors.password || errors.confirmPassword) && (
                            <Text style={styles.errorText}>
                                {errors.password || errors.confirmPassword}
                            </Text>
                        )}

                        <View style={styles.validationContainer}>
                            <Text style={styles.validationTitle}>Tu contraseña debe tener:</Text>

                            {/* Password Match Indicator */}
                            {confirmPassword && (
                                <View style={styles.validationItem}>
                                    <Ionicons
                                        name={passwordsMatch ? "checkmark-circle" : "close-circle"}
                                        size={16}
                                        color={passwordsMatch ? "#4CAF50" : "#F44336"}
                                    />
                                    <Text style={[
                                        styles.validationText,
                                        passwordsMatch && styles.validationTextValid
                                    ]}>
                                        Las contraseñas coinciden
                                    </Text>
                                </View>
                            )}

                            <View style={styles.validationItem}>
                                <Ionicons
                                    name={validation.hasLetter ? "checkmark-circle" : "ellipse-outline"}
                                    size={16}
                                    color={validation.hasLetter ? "#4CAF50" : "#ccc"}
                                />
                                <Text style={[
                                    styles.validationText,
                                    validation.hasLetter && styles.validationTextValid
                                ]}>
                                    Al menos 1 letra
                                </Text>
                            </View>

                            <View style={styles.validationItem}>
                                <Ionicons
                                    name={validation.hasNumberOrSymbol ? "checkmark-circle" : "ellipse-outline"}
                                    size={16}
                                    color={validation.hasNumberOrSymbol ? "#4CAF50" : "#ccc"}
                                />
                                <Text style={[
                                    styles.validationText,
                                    validation.hasNumberOrSymbol && styles.validationTextValid
                                ]}>
                                    Número o carácter especial
                                </Text>
                            </View>

                            <View style={styles.validationItem}>
                                <Ionicons
                                    name={validation.hasMinLength ? "checkmark-circle" : "ellipse-outline"}
                                    size={16}
                                    color={validation.hasMinLength ? "#4CAF50" : "#ccc"}
                                />
                                <Text style={[
                                    styles.validationText,
                                    validation.hasMinLength && styles.validationTextValid
                                ]}>
                                    Mínimo 10 caracteres
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.continueButton}
                            onPress={nextStep}
                        >
                            <Text style={styles.buttonText}>Siguiente</Text>
                        </TouchableOpacity>
                    </Animated.View>
                );

            case 4:
                return (
                    <Animated.View style={[styles.stepContainer, { transform }]}>
                        <ProgressBar currentStep={step} />
                        
                        <View style={styles.stepHeader}>
                            <Text style={styles.stepTitle}>Información personal</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Nombre
                                <Text style={styles.requiredAsterisk}> *</Text>
                            </Text>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    errors.firstName && styles.inputError
                                ]}
                                placeholder="Ej: Juan"
                                value={firstName}
                                onChangeText={(text) => {
                                    setFirstName(text);
                                    if (errors.firstName) setErrors({ ...errors, firstName: null });
                                }}
                                autoCapitalize="words"
                                placeholderTextColor="#aaa"
                            />
                            {errors.firstName && (
                                <Text style={styles.errorText}>{errors.firstName}</Text>
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Apellido
                                <Text style={styles.requiredAsterisk}> *</Text>
                            </Text>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    errors.lastName && styles.inputError
                                ]}
                                placeholder="Ej: Pérez"
                                value={lastName}
                                onChangeText={(text) => {
                                    setLastName(text);
                                    if (errors.lastName) setErrors({ ...errors, lastName: null });
                                }}
                                autoCapitalize="words"
                                placeholderTextColor="#aaa"
                            />
                            {errors.lastName && (
                                <Text style={styles.errorText}>{errors.lastName}</Text>
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Departamento
                                <Text style={styles.requiredAsterisk}> *</Text>
                            </Text>
                            <CustomPicker
                                selectedValue={selectedDepartment}
                                onValueChange={(value) => {
                                    setSelectedDepartment(value);
                                    setSelectedCity(''); // Reset city when department changes

                                    // Load cities for selected department
                                    const dept = departments.find(d => d.departamento === value);
                                    if (dept) {
                                        setCities(dept.ciudades || []);
                                    } else {
                                        setCities([]);
                                    }

                                    if (errors.department) setErrors({ ...errors, department: null });
                                }}
                                items={departments.map(dept => ({
                                    label: dept.departamento,
                                    value: dept.departamento
                                }))}
                                placeholder="Selecciona departamento..."
                                disabled={loading}
                                error={!!errors.department}
                            />
                            {errors.department && (
                                <Text style={styles.errorText}>{errors.department}</Text>
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Ciudad
                                <Text style={styles.requiredAsterisk}> *</Text>
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
                                placeholder="Selecciona ciudad..."
                                disabled={loading || cities.length === 0}
                                error={!!errors.city}
                            />
                            {errors.city && (
                                <Text style={styles.errorText}>{errors.city}</Text>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.registerButton, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator color="white" />
                                    <Text style={styles.loadingText}>Registrando...</Text>
                                </View>
                            ) : (
                                <Text style={styles.buttonText}>Registrarme</Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                );

            default:
                return null;
        }
    };

    const renderHeader = () => {
        console.log('Rendering header for step:', step);
        return (
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => {
                        console.log('Header button pressed, step:', step);
                        if (step === 1) {
                            handleClose();
                        } else {
                            prevStep();
                        }
                    }}
                    disabled={loading}
                    activeOpacity={0.7}
                >
                    {step === 1 ? (
                        <Ionicons name="close" size={24} color="#333" />
                    ) : (
                        <Ionicons name="chevron-back" size={24} color="#333" />
                    )}
                </TouchableOpacity>

                <View style={styles.headerLogoContainer}>
                    <LogoMinymol size="small" />
                </View>
            </View>
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
                {renderHeader()}

                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {getStepContent()}
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerButton: {
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
        marginRight: 44,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 30,
    },
    stepContainer: {
        flex: 1,
    },
    title: {
        fontSize: 32,
        fontFamily: getUbuntuFont('bold'),
        color: '#14144b',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    stepHeader: {
        marginBottom: 30,
        alignItems: 'center',
    },
    stepNumber: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: '#fa7e17',
        marginBottom: 5,
    },
    stepTitle: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#14144b',
        textAlign: 'center',
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

    phoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e8e8e8',
        borderRadius: 16,
        backgroundColor: '#fafafa',
        minHeight: 56,
    },
    countryCodeContainer: {
        paddingHorizontal: 16,
        borderRightWidth: 1,
        borderRightColor: '#e8e8e8',
        justifyContent: 'center',
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
    codeLabel: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 24,
    },
    maskedPhone: {
        fontFamily: getUbuntuFont('medium'),
        color: '#14144b',
    },
    resendButton: {
        alignItems: 'center',
        marginVertical: 20,
    },
    resendText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: '#fa7e17',
        textDecorationLine: 'underline',
    },
    textDisabled: {
        color: '#ccc',
    },
    validationContainer: {
        marginVertical: 20,
        padding: 16,
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
    },
    validationTitle: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: '#14144b',
        marginBottom: 12,
    },
    validationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    validationText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        marginLeft: 8,
    },
    validationTextValid: {
        color: '#4CAF50',
        fontFamily: getUbuntuFont('medium'),
    },
    continueButton: {
        backgroundColor: '#fa7e17',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
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
    registerButton: {
        backgroundColor: '#fa7e17',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
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
    buttonDisabled: {
        backgroundColor: '#d0d0d0',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        letterSpacing: 0.5,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingText: {
        color: 'white',
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        marginLeft: 8,
    },
    loginLinkContainer: {
        alignItems: 'center',
        marginTop: 30,
    },
    loginLinkText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        textAlign: 'center',
    },
    loginLink: {
        color: '#fa7e17',
        fontFamily: getUbuntuFont('medium'),
        textDecorationLine: 'underline',
    },
});

export default RegisterModal;
