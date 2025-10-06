import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRef } from 'react';
import {
    Alert,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { getUbuntuFont } from '../../utils/fonts';
import ReceiptCard from './ReceiptCard';

const SuccessModal = ({ visible, movementData, onClose }) => {
    const viewShotRef = useRef(null);

    // Función para generar el mensaje de WhatsApp
    const generateWhatsAppMessage = () => {
        const { provider, amount, description } = movementData;
        const previousDebt = provider.deudaRestante;
        const newDebt = previousDebt - amount;

        return `Hola ${provider.name}!

Te confirmo que hoy registré un abono por $${amount.toLocaleString('es-CO')}${description ? ` (${description})` : ''}.

RESUMEN DE CUENTA:
• Abono: $${amount.toLocaleString('es-CO')}
• Saldo anterior: $${previousDebt.toLocaleString('es-CO')}
• Nuevo saldo: $${newDebt.toLocaleString('es-CO')}

${newDebt === 0 ? '¡CUENTA SALDADA COMPLETAMENTE!' : 'Saldo pendiente actualizado'}

Fecha: ${movementData.date}

Adjunto el comprobante digital.

Gracias por tu confianza.`;
    };

    // Función para solo compartir la imagen (sin abrir WhatsApp)
    const handleShareImage = async () => {
        try {
            // Capturar la vista como imagen
            const uri = await viewShotRef.current.capture();

            // Verificar si el dispositivo soporta compartir
            const isAvailable = await Sharing.isAvailableAsync();
            
            if (!isAvailable) {
                Alert.alert('Error', 'No se puede compartir en este dispositivo');
                return;
            }

            // Copiar la imagen a un directorio compartible
            const fileName = `comprobante_${Date.now()}.png`;
            const newPath = `${FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.copyAsync({
                from: uri,
                to: newPath,
            });

            // Compartir la imagen
            await Sharing.shareAsync(newPath, {
                mimeType: 'image/png',
                dialogTitle: 'Compartir comprobante',
                UTI: 'public.png',
            });

        } catch (error) {
            console.error('Error compartiendo:', error);
            Alert.alert('Error', 'No se pudo compartir el comprobante');
        }
    };

    // Función para capturar y compartir por WhatsApp
    const handleShareWhatsApp = async () => {
        try {
            // Capturar la vista como imagen
            const uri = await viewShotRef.current.capture();

            // Verificar si el dispositivo soporta compartir
            const isAvailable = await Sharing.isAvailableAsync();

            if (!isAvailable) {
                Alert.alert('Error', 'No se puede compartir en este dispositivo');
                return;
            }

            // Generar mensaje de WhatsApp
            const message = generateWhatsAppMessage();

            // Limpiar el número de teléfono
            let rawPhone = movementData.provider.phone;
            let cleanPhone = rawPhone.replace(/[^\d+]/g, '');

            let phoneNumber;
            if (cleanPhone.startsWith('+')) {
                phoneNumber = cleanPhone.substring(1);
            } else {
                phoneNumber = `57${cleanPhone}`;
            }

            // Copiar la imagen a un directorio compartible
            const fileName = `comprobante_${Date.now()}.png`;
            const newPath = `${FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.copyAsync({
                from: uri,
                to: newPath,
            });

            // Abrir WhatsApp con el mensaje (la imagen se puede compartir después)
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

            const canOpen = await Linking.canOpenURL(whatsappUrl);
            if (canOpen) {
                await Linking.openURL(whatsappUrl);

                // Después de abrir WhatsApp, dar opción de compartir la imagen
                setTimeout(async () => {
                    try {
                        await Sharing.shareAsync(newPath, {
                            mimeType: 'image/png',
                            dialogTitle: 'Compartir comprobante',
                            UTI: 'public.png',
                        });
                    } catch (error) {
                        console.log('Usuario canceló compartir imagen');
                    }
                }, 1000);
            } else {
                // Si no puede abrir WhatsApp, solo compartir la imagen
                Alert.alert(
                    'WhatsApp no disponible',
                    '¿Deseas compartir el comprobante por otro medio?',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Compartir',
                            onPress: async () => {
                                await Sharing.shareAsync(newPath, {
                                    mimeType: 'image/png',
                                    dialogTitle: 'Compartir comprobante',
                                });
                            },
                        },
                    ]
                );
            }

        } catch (error) {
            console.error('Error compartiendo:', error);
            Alert.alert('Error', 'No se pudo compartir el comprobante');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.successIcon}>
                            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                        </View>
                        <Text style={styles.title}>¡Abono registrado!</Text>
                        <Text style={styles.subtitle}>
                            Se ha registrado el abono por ${movementData?.amount?.toLocaleString('es-CO')}
                            {' '}para {movementData?.provider?.name}
                        </Text>
                    </View>

                    {/* Comprobante (captura oculta) */}
                    <View style={styles.receiptContainer}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.receiptScroll}
                        >
                            <ViewShot
                                ref={viewShotRef}
                                options={{
                                    format: 'png',
                                    quality: 0.9,
                                }}
                                style={styles.viewShot}
                            >
                                <ReceiptCard movementData={movementData} />
                            </ViewShot>
                        </ScrollView>
                    </View>

                    {/* Botones de acción */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.whatsappButton}
                            onPress={handleShareWhatsApp}
                        >
                            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                            <Text style={styles.whatsappButtonText}>
                                Enviar por WhatsApp
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.shareButton}
                            onPress={handleShareImage}
                        >
                            <Ionicons name="share-social-outline" size={20} color="#fa7e17" />
                            <Text style={styles.shareButtonText}>
                                Compartir comprobante
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Text style={styles.closeButtonText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.hint}>
                        💡 Comparte el comprobante con tu proveedor
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        maxHeight: '90%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    successIcon: {
        marginBottom: 16,
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
    },
    receiptContainer: {
        maxHeight: 400,
        marginBottom: 20,
    },
    receiptScroll: {
        alignItems: 'center',
    },
    viewShot: {
        backgroundColor: '#fff',
    },
    actions: {
        gap: 12,
    },
    whatsappButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#25D366',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    whatsappButtonText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#ffffff',
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff7f0',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        borderWidth: 2,
        borderColor: '#fa7e17',
    },
    shareButtonText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
    },
    closeButton: {
        alignItems: 'center',
        paddingVertical: 14,
    },
    closeButtonText: {
        fontSize: 15,
        fontFamily: getUbuntuFont('medium'),
        color: '#6b7280',
    },
    hint: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 12,
    },
});

export default SuccessModal;
