import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OrderRequestModal = ({
    visible,
    onClose,
    providerName,
    checkedItems = [],
    getApplicablePrice,
    calculateSubtotal,
    onCreateOrder,
    customerData,
    onOpenCustomerModal
}) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(screenWidth)).current; // Cambiado de screenHeight a screenWidth

    const [currentStep, setCurrentStep] = useState(1);
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [orderCreated, setOrderCreated] = useState(false);
    const [orderId, setOrderId] = useState(null);

    // Animaciones para los pasos
    const step1Anim = useRef(new Animated.Value(0)).current;
    const step2Anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Animar entrada del modal
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Reset states al abrir
            setCurrentStep(1);
            setOrderCreated(false);
            setOrderId(null);
            setIsCreatingOrder(false);
        } else {
            // Resetear posición y TODOS los estados al cerrar
            slideAnim.setValue(screenWidth); // Cambiado de screenHeight a screenWidth
            setCurrentStep(1);
            setIsCreatingOrder(false);
            setOrderCreated(false);
            setOrderId(null);
        }
    }, [visible]);

    useEffect(() => {
        // Animar expansión del paso 1
        Animated.timing(step1Anim, {
            toValue: currentStep === 1 ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();

        // Animar expansión del paso 2
        Animated.timing(step2Anim, {
            toValue: currentStep === 2 ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [currentStep]);

    const handleClose = () => {
        console.log('Cerrando OrderRequestModal');
        
        Animated.timing(slideAnim, {
            toValue: screenWidth, // Cambiado de screenHeight a screenWidth
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            // Reset completo de estados
            setCurrentStep(1);
            setIsCreatingOrder(false);
            setOrderCreated(false);
            setOrderId(null);
            onClose();
        });
    };

    const handleCustomerDataSaved = (data) => {
        console.log('Datos del cliente guardados:', data);
        if (currentStep === 1) {
            setCurrentStep(2);
        }
    };

    const calculateTotal = () => {
        return checkedItems.reduce((sum, item) => sum + calculateSubtotal(item), 0);
    };

    const handleCreateOrder = async () => {
        if (!customerData) {
            Alert.alert('Error', 'Por favor completa los datos de entrega');
            return;
        }

        if (checkedItems.length === 0) {
            Alert.alert('Error', 'No hay productos seleccionados');
            return;
        }

        setIsCreatingOrder(true);

        try {
            // Obtener datos del usuario desde AsyncStorage (equivalente a localStorage en web)
            const { getAuth } = await import('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            
            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            // Obtener token del usuario
            const token = await user.getIdToken();
            const userId = user.uid;

            // Obtener providerId del primer item (todos son del mismo proveedor)
            const providerId = checkedItems[0]?.product?.providerId || checkedItems[0]?.providerId;
            
            if (!providerId) {
                throw new Error('ID del proveedor no encontrado');
            }

            // Preparar items del pedido
            const orderItems = checkedItems.map((item) => ({
                productId: item.productId || item.product?.id,
                productName: item.productNameSnapshot,
                quantity: item.cantidad,
                unity: 'unidad',
                unitPrice: parseFloat(getApplicablePrice(item)?.price || '0'),
                color: item.colorSnapshot,
                size: item.sizeSnapshot,
                imageSnapshot: item.imageUrlSnapshot,
            }));

            const totalPrice = orderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

            // Crear customer en el backend
            const customerBody = {
                ...customerData,
                providerId,
                userId,
            };

            const customerRes = await fetch('https://api.minymol.com/customers/from-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(customerBody),
            });

            if (!customerRes.ok) {
                throw new Error('Error al crear datos del cliente');
            }

            const customer = await customerRes.json();

            // Crear la orden
            const orderRes = await fetch('https://api.minymol.com/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId,
                    providerId,
                    customerId: customer.id,
                    totalPrice,
                    items: orderItems,
                    notes: 'Hola, he colocado un pedido desde la tienda.',
                }),
            });

            if (!orderRes.ok) {
                throw new Error('Error al crear el pedido');
            }

            const order = await orderRes.json();
            setOrderId(order.id);

            // Eliminar items del carrito después de crear la orden exitosamente
            if (onCreateOrder) {
                await onCreateOrder(order.id, customer, checkedItems);
            }

            // Crear enlace compartible
            const shareRes = await fetch('https://api.minymol.com/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: `Pedido #${order.id}`,
                    imageUrl: checkedItems[0].imageUrlSnapshot,
                    redirectUrl: `https://minymol.com/orden/${order.id}`,
                }),
            });

            let shareUrl = null;
            if (shareRes.ok) {
                const shareData = await shareRes.json();
                shareUrl = shareData.shareUrl;
            }

            // Obtener datos del proveedor
            const providerRes = await fetch(`https://api.minymol.com/providers/public/${providerId}`);
            let providerData = null;
            if (providerRes.ok) {
                providerData = await providerRes.json();
            }

            // Enviar notificación WhatsApp al proveedor
            if (providerData && providerData.telefono) {
                try {
                    await fetch('https://api.minymol.com/notifications', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            channel: 'whatsapp',
                            purpose: 'new_order',
                            phoneNumber: providerData.telefono,
                            data: {
                                proveedor: providerData.nombre_empresa,
                                cliente: customer.nombre ?? 'Cliente',
                                ciudad: customer.ciudad ?? 'Sin ciudad',
                                departamento: customer.departamento ?? 'Sin departamento',
                                orden: order.id,
                                valor: totalPrice.toLocaleString('es-CO'),
                                url: shareUrl || `https://minymol.com/orden/${order.id}`,
                            },
                        }),
                    });
                } catch (notifError) {
                    console.log('Error enviando notificación WhatsApp:', notifError);
                    // No bloqueamos el flujo por errores de notificación
                }
            }

            // Enviar push notification al proveedor
            try {
                await fetch('https://api.minymol.com/push/send-to-provider', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        providerId,
                        title: `Nuevo pedido recibido`,
                        body: `Has recibido un nuevo pedido del cliente ${customerData.nombre} (#${order.id})`,
                        data: {
                            url: `https://minymol.com/orden/${order.id}`,
                            orderId: order.id,
                        },
                        type: 'order'
                    })
                });
            } catch (pushError) {
                console.log('Error enviando push notification:', pushError);
                // No bloqueamos el flujo por errores de push
            }

            // TODO: Aquí irá la lógica futura de IA para:
            // - Análisis inteligente del pedido basado en historial
            // - Recomendaciones personalizadas de productos complementarios
            // - Optimización de rutas de entrega usando ML
            // - Predicción de tiempos de entrega con algoritmos avanzados
            // - Análisis de sentimientos en las notas del pedido
            // - Notificaciones inteligentes basadas en el comportamiento del usuario
            // - Detección de patrones de compra para ofertas personalizadas

            setOrderCreated(true);

        } catch (error) {
            console.error('Error creating order:', error);
            Alert.alert(
                'Error', 
                error.message || 'Hubo un problema al crear el pedido. Inténtalo de nuevo.'
            );
        } finally {
            setIsCreatingOrder(false);
        }
    };    const StepHeader = ({ stepNumber, title, isActive, isCompleted, onPress }) => (
        <TouchableOpacity
            style={[
                styles.stepHeader,
                isActive && styles.stepHeaderActive,
                isCompleted && styles.stepHeaderCompleted
            ]}
            onPress={onPress}
            disabled={isCreatingOrder || orderCreated}
        >
            <View style={styles.stepHeaderLeft}>
                <View style={[
                    styles.stepNumber,
                    isActive && styles.stepNumberActive,
                    isCompleted && styles.stepNumberCompleted
                ]}>
                    {isCompleted ? (
                        <MaterialIcons name="check" size={18} color="#fff" />
                    ) : (
                        <Text style={[
                            styles.stepNumberText,
                            isActive && styles.stepNumberTextActive
                        ]}>
                            {stepNumber}
                        </Text>
                    )}
                </View>
                <Text style={[
                    styles.stepTitle,
                    isActive && styles.stepTitleActive
                ]}>
                    {title}
                </Text>
            </View>
            <MaterialIcons
                name={isActive ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={24}
                color={isActive ? "#fa7e17" : "#666"}
            />
        </TouchableOpacity>
    );

    const AddressSection = () => (
        <Animated.View style={[
            styles.stepContent,
            {
                maxHeight: step1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 300],
                }),
                opacity: step1Anim,
            }
        ]}>
            {customerData ? (
                <View style={styles.addressDisplay}>
                    <View style={styles.addressInfo}>
                        <View style={styles.addressRow}>
                            <MaterialIcons name="person" size={20} color="#fa7e17" />
                            <Text style={styles.addressText}>{customerData.nombre}</Text>
                        </View>
                        <View style={styles.addressRow}>
                            <MaterialIcons name="phone" size={20} color="#fa7e17" />
                            <Text style={styles.addressText}>{customerData.celular}</Text>
                        </View>
                        <View style={styles.addressRow}>
                            <MaterialIcons name="location-on" size={20} color="#fa7e17" />
                            <Text style={styles.addressText}>
                                {customerData.direccion}, {customerData.ciudad}, {customerData.departamento}
                            </Text>
                        </View>
                        {customerData.referencia && (
                            <View style={styles.addressRow}>
                                <MaterialIcons name="info" size={20} color="#fa7e17" />
                                <Text style={styles.addressText}>{customerData.referencia}</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.editAddressButton}
                        onPress={() => {
                            console.log('🔧 BOTÓN EDITAR PRESIONADO');
                            onOpenCustomerModal();
                        }}
                    >
                        <MaterialIcons name="edit" size={16} color="#fa7e17" />
                        <Text style={styles.editAddressText}>Editar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.addAddressButton}
                    onPress={() => {
                        console.log('🔥 BOTÓN AGREGAR DIRECCIÓN PRESIONADO desde OrderRequestModal');
                        onOpenCustomerModal();
                    }}
                >
                    <MaterialIcons name="add-location" size={24} color="#fa7e17" />
                    <Text style={styles.addAddressText}>Agregar dirección de entrega</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#fa7e17" />
                </TouchableOpacity>
            )}
        </Animated.View>
    );

    const ProductsSection = () => (
        <Animated.View style={[
            styles.stepContent,
            {
                maxHeight: step2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 400],
                }),
                opacity: step2Anim,
            }
        ]}>
            <ScrollView
                style={styles.productsList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
            >
                {checkedItems.map((item, index) => {
                    const priceData = getApplicablePrice(item);
                    const unitPrice = parseFloat(priceData?.price || 0);
                    const subtotal = calculateSubtotal(item);

                    return (
                        <View key={item.id} style={styles.productItem}>
                            <Image
                                source={{ uri: item.imageUrlSnapshot }}
                                style={styles.productImage}
                                resizeMode="cover"
                            />
                            <View style={styles.productInfo}>
                                <Text style={styles.productName} numberOfLines={2}>
                                    {item.productNameSnapshot}
                                </Text>
                                <View style={styles.productVariants}>
                                    {item.colorSnapshot && (
                                        <View style={styles.variantChip}>
                                            <Text style={styles.variantText}>{item.colorSnapshot}</Text>
                                        </View>
                                    )}
                                    {item.sizeSnapshot && (
                                        <View style={styles.variantChip}>
                                            <Text style={styles.variantText}>{item.sizeSnapshot}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.productPricing}>
                                    <Text style={styles.unitPrice}>
                                        ${unitPrice.toLocaleString('es-CO')} c/u
                                    </Text>
                                    <Text style={styles.quantity}>
                                        Cantidad: {item.cantidad}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.productTotal}>
                                <Text style={styles.productTotalText}>
                                    ${subtotal.toLocaleString('es-CO')}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );

    const SuccessScreen = () => (
        <View style={styles.successContainer}>
            <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
            <Text style={styles.successTitle}>¡Pedido solicitado con éxito!</Text>
            <Text style={styles.successMessage}>
                Tu pedido #{orderId} ha sido enviado a {providerName}
            </Text>
            <View style={styles.successInfo}>
                <Text style={styles.successInfoText}>
                    Recibirás una notificación cuando el proveedor confirme tu pedido.
                </Text>
                {/* TODO: Aquí irá la lógica futura de IA para:
                    - Tiempo estimado de respuesta inteligente
                    - Recomendaciones de productos relacionados
                    - Análisis de preferencias del usuario
                    - Seguimiento predictivo del pedido */}
            </View>
            <TouchableOpacity
                style={styles.successButton}
                onPress={handleClose}
            >
                <Text style={styles.successButtonText}>Continuar comprando</Text>
            </TouchableOpacity>
        </View>
    );

    // No renderizar nada si no es visible
    if (!visible) {
        return null;
    }

    if (orderCreated) {
        return (
            <View style={styles.overlayContainer}>
                <View style={styles.overlay}>
                    <Animated.View
                        style={[
                            styles.container,
                            {
                                transform: [{ translateX: slideAnim }], // Cambiado de translateY a translateX
                                paddingTop: Platform.OS === 'ios' ? 0 : insets.top,
                                paddingBottom: insets.bottom,
                            }
                        ]}
                    >
                        <SuccessScreen />
                    </Animated.View>
                </View>
            </View>
        );
    }

    return (
        <>
            <View style={styles.overlayContainer}>
                <View style={styles.overlay}>
                    <Animated.View
                        style={[
                            styles.container,
                            {
                                transform: [{ translateX: slideAnim }], // Cambiado de translateY a translateX
                                paddingTop: Platform.OS === 'ios' ? 0 : insets.top,
                                paddingBottom: insets.bottom,
                            }
                        ]}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleClose}
                                disabled={isCreatingOrder}
                            >
                                <MaterialIcons name="chevron-left" size={28} color="#333" />
                            </TouchableOpacity>
                            <View style={styles.headerContent}>
                                <Text style={styles.title}>Solicitar pedido</Text>
                                <Text style={styles.subtitle}>{providerName}</Text>
                            </View>
                            <View style={styles.placeholder} />
                        </View>

                        {/* Content */}
                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            {/* Paso 1: Dirección */}
                            <View style={styles.step}>
                                <StepHeader
                                    stepNumber={1}
                                    title="Dirección de entrega"
                                    isActive={currentStep === 1}
                                    isCompleted={customerData !== null}
                                    onPress={() => setCurrentStep(currentStep === 1 ? 0 : 1)}
                                />
                                <AddressSection />
                            </View>

                            {/* Paso 2: Productos */}
                            <View style={styles.step}>
                                <StepHeader
                                    stepNumber={2}
                                    title={`Productos (${checkedItems.length})`}
                                    isActive={currentStep === 2}
                                    isCompleted={false}
                                    onPress={() => setCurrentStep(currentStep === 2 ? 0 : 2)}
                                />
                                <ProductsSection />
                            </View>

                            {/* Resumen del total */}
                            <View style={styles.totalSection}>
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Total del pedido:</Text>
                                    <Text style={styles.totalAmount}>
                                        ${calculateTotal().toLocaleString('es-CO')}
                                    </Text>
                                </View>
                            </View>

                            {/* Información importante */}
                            <View style={styles.infoSection}>
                                <View style={styles.infoHeader}>
                                    <MaterialIcons name="info" size={20} color="#2196F3" />
                                    <Text style={styles.infoHeaderText}>Información importante</Text>
                                </View>
                                
                                <View style={styles.infoItem}>
                                    <View style={styles.infoBullet} />
                                    <Text style={styles.infoText}>
                                        Tu pedido llega directamente al proveedor para confirmación
                                    </Text>
                                </View>
                                
                                <View style={styles.infoItem}>
                                    <View style={styles.infoBullet} />
                                    <Text style={styles.infoText}>
                                        Formas de pago y entrega se coordinan directamente con el proveedor
                                    </Text>
                                </View>
                                
                                <View style={styles.infoItem}>
                                    <View style={styles.infoBullet} />
                                    <Text style={styles.infoText}>
                                        No se realiza pago a través de la plataforma
                                    </Text>
                                </View>
                                
                                <View style={styles.infoItem}>
                                    <View style={styles.infoBullet} />
                                    <Text style={styles.infoText}>
                                        Recibirás una notificación cuando el proveedor confirme tu pedido
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[
                                    styles.createOrderButton,
                                    (!customerData || isCreatingOrder) && styles.createOrderButtonDisabled
                                ]}
                                onPress={handleCreateOrder}
                                disabled={!customerData || isCreatingOrder}
                            >
                                {isCreatingOrder ? (
                                    <>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={styles.createOrderButtonText}>Creando pedido...</Text>
                                    </>
                                ) : (
                                    <>
                                        <MaterialIcons name="send" size={20} color="#fff" />
                                        <Text style={styles.createOrderButtonText}>Solicitar pedido</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        elevation: 1000,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        zIndex: 1000,
        elevation: 1000,
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
    headerContent: {
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#fa7e17',
        marginTop: 2,
    },
    placeholder: {
        width: 38, // Ajustado para chevron más grande
    },
    content: {
        flex: 1,
    },
    step: {
        marginHorizontal: 16,
        marginVertical: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#fafafa',
    },
    stepHeaderActive: {
        backgroundColor: '#fff8f0',
    },
    stepHeaderCompleted: {
        backgroundColor: '#f0fff4',
    },
    stepHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ddd',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    stepNumberActive: {
        backgroundColor: '#fa7e17',
    },
    stepNumberCompleted: {
        backgroundColor: '#4CAF50',
    },
    stepNumberText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
        color: '#666',
    },
    stepNumberTextActive: {
        color: '#fff',
    },
    stepTitle: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: '#333',
    },
    stepTitleActive: {
        color: '#fa7e17',
    },
    stepContent: {
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    // Address section styles
    addressDisplay: {
        padding: 16,
        backgroundColor: '#fff',
    },
    addressInfo: {
        marginBottom: 16,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    addressText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
        marginLeft: 12,
        flex: 1,
    },
    editAddressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fa7e17',
    },
    editAddressText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#fa7e17',
        marginLeft: 4,
    },
    addAddressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderWidth: 2,
        borderColor: '#fa7e17',
        borderStyle: 'dashed',
        borderRadius: 12,
        margin: 16,
    },
    addAddressText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: '#fa7e17',
        flex: 1,
        marginLeft: 8,
    },
    // Products section styles
    productsList: {
        maxHeight: 300,
    },
    productItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    productImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    productInfo: {
        flex: 1,
        marginRight: 8,
    },
    productName: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#333',
        marginBottom: 4,
    },
    productVariants: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    variantChip: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginRight: 6,
    },
    variantText: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
    },
    productPricing: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    unitPrice: {
        fontSize: 12,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
    },
    quantity: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
    },
    productTotal: {
        alignItems: 'flex-end',
    },
    productTotalText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
    },
    // Total section styles
    totalSection: {
        margin: 16,
        padding: 16,
        backgroundColor: '#fff8f0',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fa7e17',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
    },
    totalAmount: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
    },
    // Info section styles
    infoSection: {
        margin: 16,
        marginTop: 0,
        padding: 16,
        backgroundColor: '#f8f9ff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e3f2fd',
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoHeaderText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#2196F3',
        marginLeft: 8,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    infoBullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2196F3',
        marginTop: 6,
        marginRight: 10,
        flex: 0,
    },
    infoText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#1976d2',
        lineHeight: 18,
        flex: 1,
    },
    // Footer styles
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    createOrderButton: {
        backgroundColor: '#fa7e17',
        borderRadius: 12,
        paddingVertical: 15,
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
    createOrderButtonDisabled: {
        backgroundColor: '#ddd',
        shadowOpacity: 0,
        elevation: 0,
    },
    createOrderButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        marginLeft: 8,
    },
    // Success screen styles
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    successTitle: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 12,
    },
    successMessage: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    successInfo: {
        backgroundColor: '#f0fff4',
        padding: 16,
        borderRadius: 12,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#c8e6c9',
    },
    successInfoText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#2e7d32',
        textAlign: 'center',
        lineHeight: 20,
    },
    successButton: {
        backgroundColor: '#fa7e17',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: '#fa7e17',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    successButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
    },
});

export default OrderRequestModal;