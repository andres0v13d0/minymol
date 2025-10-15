import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import CustomerModal from '../../components/CustomerModal';
import NavInf from '../../components/NavInf/NavInf';
import OrderRequestModal from '../../components/OrderRequestModal';
import { useCart } from '../../contexts/CartContext';
import { getUserData } from '../../utils/apiUtils';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

// Componente de selector de cantidad animado
const QuantitySelector = ({ item, currentQuantity, onQuantityChange, getAvailableQuantities }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownHeight, setDropdownHeight] = useState(0);
    const animatedRotation = useRef(new Animated.Value(0)).current;
    const animatedOpacity = useRef(new Animated.Value(0)).current;

    const availableQuantities = getAvailableQuantities(item);

    const toggleDropdown = useCallback(() => {
        const newIsOpen = !isOpen;
        setIsOpen(newIsOpen);

        if (newIsOpen) {
            // Calcular altura basada en número de opciones (máximo 4 visibles)
            const maxVisible = Math.min(availableQuantities.length, 4);
            const itemHeight = 44; // Altura de cada opción
            const newHeight = maxVisible * itemHeight;
            setDropdownHeight(newHeight);
        } else {
            setDropdownHeight(0);
        }

        // Animar rotación del icono
        Animated.timing(animatedRotation, {
            toValue: newIsOpen ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();

        // Animar opacidad del dropdown
        Animated.timing(animatedOpacity, {
            toValue: newIsOpen ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [isOpen, availableQuantities.length, animatedRotation, animatedOpacity]);

    const handleQuantitySelect = useCallback((quantity) => {
        onQuantityChange(item.id, quantity);
        setIsOpen(false);
        setDropdownHeight(0);

        // Resetear animaciones
        Animated.timing(animatedRotation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();

        Animated.timing(animatedOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [item.id, onQuantityChange, animatedRotation, animatedOpacity]);

    const rotateInterpolation = animatedRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'], // Cambio de vuelta a 180deg para que indique hacia abajo
    });

    return (
        <View style={styles.quantitySelector}>
            <TouchableOpacity 
                style={[styles.quantitySelectorButton, isOpen && styles.quantitySelectorButtonOpen]}
                onPress={toggleDropdown}
                activeOpacity={0.8}
            >
                <View style={styles.quantitySelectorContent}>
                    <MaterialIcons name="confirmation-number" size={16} color="#666" />
                    <Text style={styles.quantitySelectorText}>{currentQuantity}</Text>
                </View>
                <Animated.View style={{ transform: [{ rotate: rotateInterpolation }] }}>
                    <MaterialIcons name="keyboard-arrow-down" size={20} color="#666" />
                </Animated.View>
            </TouchableOpacity>
            
            <Animated.View 
                style={[
                    styles.quantityDropdownContainer,
                    {
                        height: dropdownHeight,
                        opacity: animatedOpacity,
                    }
                ]}
            >
                <ScrollView 
                    style={styles.quantityDropdownScroll}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                >
                    {availableQuantities.map((qty) => (
                        <TouchableOpacity
                            key={qty}
                            style={[
                                styles.quantityDropdownOption,
                                currentQuantity === qty && styles.quantityDropdownOptionSelected
                            ]}
                            onPress={() => handleQuantitySelect(qty)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.quantityOptionContent}>
                                <MaterialIcons 
                                    name="confirmation-number" 
                                    size={14} 
                                    color={currentQuantity === qty ? "#fff" : "#666"} 
                                />
                                <Text style={[
                                    styles.quantityDropdownOptionText,
                                    currentQuantity === qty && styles.quantityDropdownOptionTextSelected
                                ]}>
                                    {qty}
                                </Text>
                            </View>
                            {currentQuantity === qty && (
                                <MaterialIcons name="check" size={16} color="#fff" />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Animated.View>
        </View>
    );
};

// Componente animado para cada item del carrito
const AnimatedCartItem = ({
    item,
    getApplicablePrice,
    calculateSubtotal,
    getAvailableQuantities,
    updateQuantity,
    toggleItemCheck,
    removeItem,
    onProductPress
}) => {
    // Solo animaciones esenciales - eliminamos conflictos
    const slideAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Animar entrada del item
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleRemoveWithAnimation = () => {
        // Animar salida hacia la izquierda
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -400,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            removeItem(item.id); // Llamar directamente removeItem del contexto
        });
    };

    const handleRemoveClick = () => {
        // Mostrar alert de confirmación ANTES de la animación
        Alert.alert(
            'Eliminar producto',
            '¿Estás seguro de que quieres eliminar este producto del carrito?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: handleRemoveWithAnimation // Solo animar si confirma
                }
            ]
        );
    };

    const handleToggleCheck = () => {
        // Solo ejecutar la acción sin animaciones complejas
        toggleItemCheck(item.id);
    };

    const priceData = getApplicablePrice(item);
    const unitPrice = parseFloat(priceData.price || 0);
    const availableQuantities = getAvailableQuantities(item);

    return (
        <Animated.View
            style={[
                styles.cartItem,
                {
                    transform: [{ translateX: slideAnim }],
                    opacity: opacityAnim,
                    backgroundColor: item.isChecked ? '#fff8f0' : '#fff',
                    borderLeftWidth: item.isChecked ? 3 : 0,
                    borderLeftColor: '#fa7e17',
                }
            ]}
        >
            <TouchableOpacity
                style={styles.checkButton}
                onPress={handleToggleCheck}
            >
                <MaterialIcons
                    name={item.isChecked ? "check-box" : "check-box-outline-blank"}
                    size={24}
                    color={item.isChecked ? "#fa7e17" : "#ddd"}
                />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.productImage}
                onPress={() => onProductPress && onProductPress({ id: item.productId, uuid: item.productId })}
            >
                <Image
                    source={{ uri: item.imageUrlSnapshot }}
                    style={styles.productImageImg}
                    resizeMode="cover"
                />
            </TouchableOpacity>

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

                <Text style={styles.unitPrice}>
                    ${unitPrice.toLocaleString('es-CO')} c/u
                </Text>

                <View style={styles.quantityContainer}>
                    <Text style={styles.quantityLabel}>Cantidad:</Text>
                    <QuantitySelector
                        item={item}
                        currentQuantity={item.cantidad}
                        onQuantityChange={updateQuantity}
                        getAvailableQuantities={getAvailableQuantities}
                    />
                </View>

                <Text style={styles.subtotal}>
                    Total: ${calculateSubtotal(item).toLocaleString('es-CO')}
                </Text>
            </View>

            <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveClick}
            >
                <MaterialIcons name="delete" size={24} color="#ff4444" />
            </TouchableOpacity>
        </Animated.View>
    );
};

const Cart = ({ selectedTab, onTabPress, onProductPress }) => {
    const {
        cartItems,
        loading,
        syncInProgress,
        user,
        updateQuantity,
        toggleItemCheck,
        removeItem,
        getGroupedItems
    } = useCart();

    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [selectedProviderItems, setSelectedProviderItems] = useState([]);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerData, setCustomerData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [selectedProviderId, setSelectedProviderId] = useState(null);

    // Obtener items agrupados por proveedor
    const groupedItems = getGroupedItems();

    // Cargar datos del usuario
    useEffect(() => {
        const loadUserData = async () => {
            const user = await getUserData();
            setUserData(user);
        };
        loadUserData();
    }, []);

    // Obtener precio aplicable según cantidad
    const getApplicablePrice = (item) => {
        if (!item.productPrices || !Array.isArray(item.productPrices)) {
            return { price: item.precio || 0 };
        }

        return item.productPrices.find(p => {
            const qList = p.quantity?.split(',').map(q => parseInt(q.trim())) || [];
            return qList.includes(item.cantidad);
        }) || { price: item.precio || 0 };
    };

    // Calcular subtotal de un item
    const calculateSubtotal = (item) => {
        const priceData = getApplicablePrice(item);
        const unitPrice = parseFloat(priceData.price || 0);
        return unitPrice * item.cantidad;
    };

    // Calcular total por proveedor
    const calculateProviderTotal = (items) => {
        return items
            .filter(item => item.isChecked)
            .reduce((sum, item) => sum + calculateSubtotal(item), 0);
    };

    // Obtener cantidades disponibles para un producto
    const getAvailableQuantities = (item) => {
        if (!item.productPrices || !Array.isArray(item.productPrices)) {
            return [1, 2, 3, 4, 5]; // Cantidades por defecto
        }

        const quantities = new Set();
        item.productPrices.forEach(p => {
            if (p.quantity) {
                p.quantity.split(',').forEach(q => {
                    const num = parseInt(q.trim());
                    if (!isNaN(num)) quantities.add(num);
                });
            }
        });

        const result = Array.from(quantities).sort((a, b) => a - b);
        return result.length > 0 ? result : [1, 2, 3, 4, 5];
    };

    // Manejar pedido por proveedor
    const handleRequestByProvider = (providerName, items) => {
        const checkedItems = items.filter(item => item.isChecked);

        if (checkedItems.length === 0) {
            Alert.alert('Error', 'Selecciona al menos un producto para este proveedor');
            return;
        }

        console.log('🚀 ABRIENDO OrderRequestModal para proveedor:', providerName);
        console.log('🚀 Items seleccionados:', checkedItems.length);
        
        // Obtener providerId del primer item (todos son del mismo proveedor)
        const providerId = checkedItems[0]?.product?.providerId || checkedItems[0]?.providerId;
        
        // Abrir el modal de solicitud de pedido
        setSelectedProvider(providerName);
        setSelectedProviderItems(checkedItems);
        setSelectedProviderId(providerId);
        setShowOrderModal(true);
        
        console.log('🚀 Estados configurados - showOrderModal:', true);
        console.log('🚀 ProviderId:', providerId);
    };

    // Manejar creación exitosa de orden
    const handleOrderCreated = async (orderId, customerData, orderItems) => {
        try {
            // Eliminar items del carrito después de crear la orden
            for (const item of orderItems) {
                await removeItem(item.id);
            }

            // Cerrar modal
            setShowOrderModal(false);
            setSelectedProvider(null);
            setSelectedProviderItems([]);

            // Mostrar mensaje de éxito
            Alert.alert(
                'Pedido creado', 
                `Tu pedido #${orderId} ha sido enviado exitosamente.`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error removing items from cart:', error);
            Alert.alert('Advertencia', 'El pedido se creó correctamente, pero hubo un error al actualizar el carrito.');
        }
    };

    // Manejar apertura de CustomerModal
    const handleOpenCustomerModal = () => {
        console.log('📋 ABRIENDO CustomerModal desde Cart.js');
        setShowCustomerModal(true);
    };

    // Manejar cierre de CustomerModal
    const handleCloseCustomerModal = () => {
        console.log('📋 CERRANDO CustomerModal desde Cart.js');
        setShowCustomerModal(false);
    };

    // Manejar datos guardados del CustomerModal
    const handleCustomerDataSaved = (data) => {
        console.log('📋 DATOS GUARDADOS en Cart.js:', data);
        setCustomerData(data);
        setShowCustomerModal(false);
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fa7e17" />
                    <Text style={styles.loadingText}>Cargando carrito...</Text>
                </View>
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} />
            </View>
        );
    }

    if (cartItems.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="shopping-cart" size={100} color="#fa7e17" />
                    <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
                    <Text style={styles.emptyText}>Descubre productos increíbles para ti</Text>
                    <TouchableOpacity
                        style={styles.continueShoppingButton}
                        onPress={() => onTabPress('home')}
                    >
                        <MaterialIcons name="add-shopping-cart" size={20} color="white" style={styles.buttonIcon} />
                        <Text style={styles.continueShoppingText}>Explorar productos</Text>
                    </TouchableOpacity>
                </View>
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} />
            </View>
        );
    }

    // Calcular estadísticas del carrito
    const totalItems = cartItems.length;
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.cantidad, 0);
    const totalProviders = Object.keys(groupedItems).length;
    const checkedItems = cartItems.filter(item => item.isChecked).length;

    return (
        <View style={styles.container}>
            {/* Indicador sutil de sincronización en background */}
            {syncInProgress && user && (
                <View style={styles.syncIndicator}>
                    <ActivityIndicator size="small" color="#fa7e17" />
                    <Text style={styles.syncText}>Sincronizando...</Text>
                </View>
            )}
            
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header mejorado con estadísticas */}
                <View style={styles.cartHeader}>
                    <View style={styles.headerTop}>
                        <View style={styles.titleContainer}>
                            <MaterialIcons name="shopping-cart" size={28} color="#fa7e17" />
                            <Text style={styles.cartTitle}>Mi carrito</Text>
                        </View>
                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{totalItems}</Text>
                                <Text style={styles.statLabel}>Productos</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{totalQuantity}</Text>
                                <Text style={styles.statLabel}>Unidades</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{totalProviders}</Text>
                                <Text style={styles.statLabel}>Proveedores</Text>
                            </View>
                        </View>
                    </View>

                    {checkedItems > 0 && (
                        <View style={styles.selectionInfo}>
                            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                            <Text style={styles.selectionText}>
                                {checkedItems} de {totalItems} productos seleccionados
                            </Text>
                        </View>
                    )}
                    
                    {/* Mensaje informativo si no está autenticado */}
                    {!user && cartItems.length > 0 && (
                        <View style={styles.offlineInfo}>
                            <MaterialIcons name="cloud-off" size={16} color="#ff9800" />
                            <Text style={styles.offlineText}>
                                Inicia sesión para sincronizar tu carrito
                            </Text>
                        </View>
                    )}
                </View>

                {/* Proveedores */}
                {Object.entries(groupedItems).map(([providerName, items]) => (
                    <View key={providerName} style={styles.providerGroup}>
                        <View style={styles.providerHeader}>
                            <Text style={styles.providerName}>{providerName}</Text>
                        </View>

                        {items.map((item) => (
                            <AnimatedCartItem
                                key={item.id}
                                item={item}
                                getApplicablePrice={getApplicablePrice}
                                calculateSubtotal={calculateSubtotal}
                                getAvailableQuantities={getAvailableQuantities}
                                updateQuantity={updateQuantity}
                                toggleItemCheck={toggleItemCheck}
                                removeItem={removeItem}
                                onProductPress={onProductPress}
                            />
                        ))}

                        <View style={styles.providerFooter}>
                            <Text style={styles.providerTotal}>
                                Subtotal: ${calculateProviderTotal(items).toLocaleString('es-CO')}
                            </Text>
                            <TouchableOpacity
                                style={[
                                    styles.requestButton,
                                    items.some(item => item.isChecked) ? styles.requestButtonActive : styles.requestButtonDisabled
                                ]}
                                onPress={() => handleRequestByProvider(providerName, items)}
                                disabled={!items.some(item => item.isChecked)}
                            >
                                <Text style={styles.requestButtonText}>
                                    Solicitar pedido
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                <View style={styles.bottomSpacer} />
            </ScrollView>

            <NavInf selectedTab={selectedTab} onTabPress={onTabPress} />
            
            <OrderRequestModal
                visible={showOrderModal}
                onClose={() => {
                    console.log('🚨 CERRANDO OrderRequestModal desde Cart.js');
                    setShowOrderModal(false);
                    setSelectedProvider(null);
                    setSelectedProviderItems([]);
                    setShowCustomerModal(false);
                    setCustomerData(null);
                    console.log('🚨 Estados reseteados en Cart.js');
                }}
                providerName={selectedProvider}
                checkedItems={selectedProviderItems}
                getApplicablePrice={getApplicablePrice}
                calculateSubtotal={calculateSubtotal}
                onCreateOrder={handleOrderCreated}
                customerData={customerData}
                onOpenCustomerModal={handleOpenCustomerModal}
                onCustomerDataLoaded={handleCustomerDataSaved}
            />
            
            <CustomerModal
                visible={showCustomerModal}
                onClose={handleCloseCustomerModal}
                onContinue={handleCustomerDataSaved}
                initialData={customerData}
                userData={userData}
                providerId={selectedProviderId}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    syncIndicator: {
        position: 'absolute',
        top: 10,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(250, 126, 23, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    syncText: {
        fontSize: 12,
        fontFamily: getUbuntuFont('medium'),
        color: '#fa7e17',
        marginLeft: 6,
    },
    cartHeader: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerTop: {
        marginBottom: 16,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cartTitle: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        marginLeft: 12,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#eee',
        marginHorizontal: 8,
    },
    selectionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fff4',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#c8e6c9',
        marginTop: 12,
    },
    selectionText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#2e7d32',
        marginLeft: 6,
    },
    offlineInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff8e1',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffe082',
        marginTop: 12,
    },
    offlineText: {
        fontSize: 13,
        fontFamily: getUbuntuFont('medium'),
        color: '#f57c00',
        marginLeft: 6,
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f7fa',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        backgroundColor: '#f5f7fa',
    },
    emptyTitle: {
        fontSize: 26,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    continueShoppingButton: {
        backgroundColor: '#fa7e17',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#fa7e17',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonIcon: {
        marginRight: 8,
    },
    continueShoppingText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
    },
    providerGroup: {
        marginHorizontal: 16,
        marginVertical: 6,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'visible',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: -999,
        position: 'relative',
    },
    providerHeader: {
        backgroundColor: '#fa7e17',
        paddingHorizontal: 20,
        paddingVertical: 16,
        zIndex: -111,
        position: 'relative',
    },
    providerName: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#fff',
    },
    cartItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'flex-start',
        overflow: 'visible',
    },
    checkButton: {
        marginRight: 12,
        marginTop: 4,
    },
    productImage: {
        width: 70,
        height: 70,
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 12,
    },
    productImageImg: {
        width: '100%',
        height: '100%',
    },
    productInfo: {
        flex: 1,
        marginRight: 8,
    },
    productName: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: '#333',
        marginBottom: 6,
        lineHeight: 22,
    },
    productVariants: {
        flexDirection: 'row',
        marginBottom: 6,
        flexWrap: 'wrap',
    },
    variantChip: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 4,
    },
    variantText: {
        fontSize: 12,
        fontFamily: getUbuntuFont('medium'),
        color: '#666',
    },
    unitPrice: {
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
        marginBottom: 8,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12, // Aumenté el margen para dar más espacio al dropdown
    },
    quantityLabel: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        marginRight: 8,
    },
    quantitySelector: {
        position: 'relative',
        zIndex: 9999,
        minWidth: 80,
    },
    quantitySelectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 36,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 9999,
    },
    quantitySelectorButtonOpen: {
        borderColor: '#fa7e17',
        borderBottomLeftRadius: 0, // Cambio para que se conecte con el dropdown que está abajo
        borderBottomRightRadius: 0,
    },
    quantitySelectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    quantitySelectorText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#333',
        marginLeft: 6,
    },
    quantityDropdownContainer: {
        position: 'absolute',
        top: '100%', // Cambio de vuelta a 'top' para que se abra hacia abajo
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#fa7e17',
        borderTopWidth: 0, // Cambio de vuelta a 'borderTopWidth'
        borderBottomLeftRadius: 8, // Cambio de vuelta a 'borderBottomLeftRadius'
        borderBottomRightRadius: 8, // Cambio de vuelta a 'borderBottomRightRadius'
        overflow: 'visible',
        zIndex: 1, // Z-index muy alto para aparecer encima del subtotal
        elevation: 20, // Elevation alta para Android
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4, // Sombra hacia abajo
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        maxHeight: 120, // Máximo 4 opciones (44px cada una)
    },
    quantityDropdownScroll: {
        maxHeight: 120, // Mismo valor que el contenedor
    },
    quantityDropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        minHeight: 44,
        zIndex: 999,
    },
    quantityDropdownOptionSelected: {
        backgroundColor: '#fa7e17',
    },
    quantityOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    quantityDropdownOptionText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
        marginLeft: 6,
    },
    quantityDropdownOptionTextSelected: {
        color: 'white',
        fontFamily: getUbuntuFont('medium'),
    },
    subtotal: {
        fontSize: 15,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
    },
    removeButton: {
        padding: 8,
    },
    providerFooter: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: -1,
    },
    providerTotal: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
    },
    requestButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    requestButtonActive: {
        backgroundColor: '#fa7e17',
        shadowColor: '#fa7e17',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    requestButtonDisabled: {
        backgroundColor: '#ddd',
    },
    requestButtonText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
        color: '#fff',
    },
    bottomSpacer: {
        height: 100,
    },
});

// ✅ MEGA OPTIMIZADO: React.memo con comparación personalizada para evitar re-renders
const CartOptimized = memo(Cart, (prevProps, nextProps) => {
  // Si se desactiva, NO re-renderizar (ya está oculto)
  if (!nextProps.isActive && !prevProps.isActive) {
    return true; // Son iguales, no re-renderizar
  }
  
  // Si cambia isActive, sí re-renderizar
  if (prevProps.isActive !== nextProps.isActive) {
    return false; // Son diferentes, re-renderizar
  }
  
  // Si está activo, verificar props críticas
  return (
    prevProps.selectedTab === nextProps.selectedTab &&
    prevProps.onTabPress === nextProps.onTabPress &&
    prevProps.onProductPress === nextProps.onProductPress &&
    prevProps.onSearchPress === nextProps.onSearchPress
  );
});

export default CartOptimized;
