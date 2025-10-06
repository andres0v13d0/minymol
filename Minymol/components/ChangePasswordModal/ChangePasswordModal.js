import { Ionicons } from '@expo/vector-icons';
import { EmailAuthProvider, getAuth, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
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

const ChangePasswordModal = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showRepeat, setShowRepeat] = useState(false);

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;

    // Validaciones de contraseña
    const passwordValidation = {
        hasLetter: /[a-zA-Z]/.test(newPassword),
        hasNumberOrSymbol: /[\d\W]/.test(newPassword),
        hasMinLength: newPassword.length >= 10,
    };

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

    const handleChangePassword = async () => {
        // Validaciones
        if (!oldPassword || !newPassword || !repeatPassword) {
            Alert.alert('Error', 'Completa todos los campos');
            return;
        }

        if (newPassword !== repeatPassword) {
            Alert.alert('Error', 'Las contraseñas no coinciden');
            return;
        }

        if (!passwordValidation.hasLetter || !passwordValidation.hasNumberOrSymbol || !passwordValidation.hasMinLength) {
            Alert.alert('Error', 'La nueva contraseña no cumple con los requisitos');
            return;
        }

        try {
            setLoading(true);
            const auth = getAuth();
            const user = auth.currentUser;

            if (!user) {
                Alert.alert('Error', 'No hay usuario autenticado');
                setLoading(false);
                return;
            }

            // Reautenticar usuario
            const cred = EmailAuthProvider.credential(user.email, oldPassword);
            await reauthenticateWithCredential(user, cred);

            // Actualizar contraseña
            await updatePassword(user, newPassword);

            Alert.alert(
                'Éxito',
                'Contraseña actualizada exitosamente',
                [
                    {
                        text: 'OK',
                        onPress: () => handleClose(),
                    },
                ]
            );
        } catch (err) {
            console.error('Error cambiando contraseña:', err);
            let errorMessage = 'Error al cambiar la contraseña. Verifica los datos.';
            
            if (err.code === 'auth/wrong-password') {
                errorMessage = 'La contraseña actual es incorrecta';
            } else if (err.code === 'auth/weak-password') {
                errorMessage = 'La nueva contraseña es muy débil';
            } else if (err.code === 'auth/requires-recent-login') {
                errorMessage = 'Por seguridad, vuelve a iniciar sesión e intenta de nuevo';
            }
            
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
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
            setOldPassword('');
            setNewPassword('');
            setRepeatPassword('');
            setShowOld(false);
            setShowNew(false);
            setShowRepeat(false);
            onClose();
        });
    };

    const PasswordInput = ({
        placeholder,
        value,
        onChangeText,
        showPassword,
        onToggleShow,
        label,
    }) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#9ca3af"
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                />
                <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={onToggleShow}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#9ca3af"
                    />
                </TouchableOpacity>
            </View>
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
                        {/* Header del modal */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleClose}
                            >
                                <Ionicons name="chevron-back" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Contenido del modal */}
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.content}
                        >
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={[
                                    styles.scrollContent,
                                    { paddingBottom: Math.max(insets.bottom, 20) }
                                ]}
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* Título y descripción */}
                                <View style={styles.titleSection}>
                                    <View style={styles.iconCircle}>
                                        <Ionicons name="key" size={32} color="#fa7e17" />
                                    </View>
                                    <Text style={styles.title}>Cambiar contraseña</Text>
                                    <Text style={styles.subtitle}>
                                        Para cambiar tu contraseña, ingresa tu contraseña actual y la nueva.
                                    </Text>
                                </View>

                                {/* Formulario */}
                                <View style={styles.formContainer}>
                                    <PasswordInput
                                        label="Contraseña actual"
                                        placeholder="Ingresa tu contraseña actual"
                                        value={oldPassword}
                                        onChangeText={setOldPassword}
                                        showPassword={showOld}
                                        onToggleShow={() => setShowOld(!showOld)}
                                    />

                                    <View style={styles.separator} />

                                    <PasswordInput
                                        label="Nueva contraseña"
                                        placeholder="Ingresa tu nueva contraseña"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        showPassword={showNew}
                                        onToggleShow={() => setShowNew(!showNew)}
                                    />

                                    <PasswordInput
                                        label="Repite tu nueva contraseña"
                                        placeholder="Repite la nueva contraseña"
                                        value={repeatPassword}
                                        onChangeText={setRepeatPassword}
                                        showPassword={showRepeat}
                                        onToggleShow={() => setShowRepeat(!showRepeat)}
                                    />

                                    {/* Validaciones de contraseña */}
                                    <View style={styles.validationContainer}>
                                        <Text style={styles.validationTitle}>La contraseña debe tener:</Text>
                                        
                                        <View style={styles.validationItem}>
                                            <Ionicons
                                                name={passwordValidation.hasLetter ? 'checkmark-circle' : 'close-circle'}
                                                size={20}
                                                color={passwordValidation.hasLetter ? '#10b981' : '#d1d5db'}
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
                                                name={passwordValidation.hasNumberOrSymbol ? 'checkmark-circle' : 'close-circle'}
                                                size={20}
                                                color={passwordValidation.hasNumberOrSymbol ? '#10b981' : '#d1d5db'}
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
                                                name={passwordValidation.hasMinLength ? 'checkmark-circle' : 'close-circle'}
                                                size={20}
                                                color={passwordValidation.hasMinLength ? '#10b981' : '#d1d5db'}
                                            />
                                            <Text style={[
                                                styles.validationText,
                                                passwordValidation.hasMinLength && styles.validationTextValid
                                            ]}>
                                                Mínimo 10 caracteres
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Botón de actualizar */}
                                    <TouchableOpacity
                                        style={[styles.updateButton, loading && styles.updateButtonDisabled]}
                                        onPress={handleChangePassword}
                                        disabled={loading}
                                        activeOpacity={0.7}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                                <Text style={styles.updateButtonText}>Actualizar contraseña</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </KeyboardAvoidingView>
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
        paddingHorizontal: 16,
    },
    titleSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff7f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    title: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#374151',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',
    },
    inputIcon: {
        marginLeft: 14,
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 14,
        fontSize: 15,
        fontFamily: getUbuntuFont('regular'),
        color: '#1f2937',
    },
    eyeIcon: {
        padding: 12,
    },
    separator: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 8,
    },
    validationContainer: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    validationTitle: {
        fontSize: 13,
        fontFamily: getUbuntuFont('bold'),
        color: '#6b7280',
        marginBottom: 12,
    },
    validationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    validationText: {
        fontSize: 13,
        fontFamily: getUbuntuFont('regular'),
        color: '#9ca3af',
        marginLeft: 8,
    },
    validationTextValid: {
        color: '#10b981',
        fontFamily: getUbuntuFont('medium'),
    },
    updateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fa7e17',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        elevation: 2,
        shadowColor: '#fa7e17',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    updateButtonDisabled: {
        backgroundColor: '#cbd5e1',
        opacity: 0.7,
    },
    updateButtonText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#fff',
    },
});

export default ChangePasswordModal;
