import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import CartItemDetailModal from '../../components/CartItemDetailModal';
import CustomerModal from '../../components/CustomerModal';
import NavInf from '../../components/NavInf/NavInf';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import OrderRequestModal from '../../components/OrderRequestModal';
import { useCart } from '../../contexts/CartContext';
import { useCartCounter } from '../../contexts/CartCounterContext';
import { getUserData } from '../../utils/apiUtils';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

// Componente minimalista de item del carrito (estilo Temu)
const MinimalCartItem = ({
    item,
    calculateSubtotal,
    toggleItemCheck,
    removeItem,
    onItemPress
}) => {
    const subtotal = calculateSubtotal(item);

    const handleRemove = (e) => {
        e.stopPropagation();
        Alert.alert(
            'Eliminar producto',
            '¿Estás seguro de que quieres eliminar este producto del carrito?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => removeItem(item.id)
                }
            ]
        );
    };

    return (
        <View style={styles.minimalCartItemContainer}>
            <TouchableOpacity
                style={[
                    styles.minimalCartItem,
                    item.isChecked && styles.minimalCartItemChecked
                ]}
                onPress={() => onItemPress(item)}
                activeOpacity={0.7}
            >
                {/* Checkbox */}
                <TouchableOpacity
                    style={styles.checkButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        toggleItemCheck(item.id);
                    }}
                >
                    <MaterialIcons
                        name={item.isChecked ? "check-box" : "check-box-outline-blank"}
                        size={24}
                        color={item.isChecked ? "#fa7e17" : "#ddd"}
                    />
                </TouchableOpacity>

                {/* Imagen grande del producto */}
                <View style={styles.imageWrapper}>
                    <Image
                        source={{ uri: item.imageUrlSnapshot }}
                        style={styles.minimalProductImage}
                        resizeMode="cover"
                    />
                </View>

                {/* Información resumida */}
                <View style={styles.minimalProductInfo}>
                    {/* Nombre truncado */}
                    <Text style={styles.minimalProductName} numberOfLines={2} ellipsizeMode="tail">
                        {item.productNameSnapshot}
                    </Text>

                    {/* Variantes muy pequeñas */}
                    {(item.colorSnapshot || item.sizeSnapshot) && (
                        <View style={styles.minimalVariants}>
                            {item.colorSnapshot && (
                                <Text style={styles.minimalVariantText} numberOfLines={1}>
                                    {item.colorSnapshot}
                                </Text>
                            )}
                            {item.colorSnapshot && item.sizeSnapshot && (
                                <Text style={styles.minimalVariantSeparator}>•</Text>
                            )}
                            {item.sizeSnapshot && (
                                <Text style={styles.minimalVariantText} numberOfLines={1}>
                                    {item.sizeSnapshot}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Cantidad (solo muestra, no edita) */}
                    <View style={styles.minimalQuantityDisplay}>
                        <MaterialIcons name="confirmation-number" size={12} color="#999" />
                        <Text style={styles.minimalQuantityText}>x{item.cantidad}</Text>
                    </View>

                    {/* Total */}
                    <Text style={styles.minimalTotalPrice}>
                        ${subtotal.toLocaleString('es-CO')}
                    </Text>
                </View>

                {/* Indicador de "ver más" */}
                <View style={styles.chevronIndicator}>
                    <MaterialIcons name="chevron-right" size={20} color="#ccc" />
                </View>
            </TouchableOpacity>

            {/* Botón de eliminar */}
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleRemove}
                activeOpacity={0.7}
            >
                <MaterialIcons name="delete" size={20} color="#ff4444" />
            </TouchableOpacity>
        </View>
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
        removeMultipleItems,
        getGroupedItems,
        loadCart
    } = useCart();
    
    // 🚀 NUEVO: Obtener contador ultrarrápido directamente
    const { count: cartItemCount } = useCartCounter();

    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [selectedProviderItems, setSelectedProviderItems] = useState([]);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerData, setCustomerData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [selectedProviderId, setSelectedProviderId] = useState(null);
    
    // ✅ Estados para OrderDetailModal
    const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);

    // ✅ Estados para CartItemDetailModal
    const [showItemDetailModal, setShowItemDetailModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // ✅ Estado para Pull to Refresh
    const [refreshing, setRefreshing] = useState(false);

    // ✅ Función para manejar Pull to Refresh
    const onRefresh = async () => {
        if (!user) {
            console.log('⚠️ No se puede sincronizar sin usuario autenticado');
            return;
        }
        
        console.log('🔄 Pull to Refresh: Sincronizando carrito...');
        setRefreshing(true);
        
        try {
            await loadCart(true); // Forzar sincronización
            console.log('✅ Pull to Refresh: Sincronización completada');
        } catch (error) {
            console.error('❌ Error en Pull to Refresh:', error);
        } finally {
            setRefreshing(false);
        }
    };

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
            console.log('✅ Orden creada exitosamente:', orderId);
            console.log('🗑️ Eliminando items del carrito:', orderItems.length);
            
            // ✅ Eliminar TODOS los items en batch (más eficiente y evita errores)
            const itemIds = orderItems.map(item => item.id);
            await removeMultipleItems(itemIds);

            // Cerrar modales de pedido
            setShowOrderModal(false);
            setSelectedProvider(null);
            setSelectedProviderItems([]);
            setShowCustomerModal(false);
            setCustomerData(null);

            // ✅ Mostrar OrderDetailModal directamente
            setSelectedOrderId(orderId);
            setShowOrderDetailModal(true);
            
        } catch (error) {
            console.error('❌ Error removiendo items del carrito:', error);
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

    // Manejar apertura del modal de detalle del item
    const handleItemPress = (item) => {
        console.log('🔍 Abriendo detalle del item:', item.productNameSnapshot);
        setSelectedItem(item);
        setShowItemDetailModal(true);
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fa7e17" />
                    <Text style={styles.loadingText}>Cargando carrito...</Text>
                </View>
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} cartItemCount={cartItemCount} />
            </View>
        );
    }

    if (cartItems.length === 0) {
        return (
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={styles.emptyScrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#fa7e17']}
                            tintColor="#fa7e17"
                            title="Sincronizando..."
                            titleColor="#fa7e17"
                        />
                    }
                >
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="shopping-cart" size={100} color="#fa7e17" />
                        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
                        <Text style={styles.emptyText}>Descubre productos increíbles para ti</Text>
                        {user && (
                            <View style={styles.pullToRefreshHint}>
                                <MaterialIcons name="refresh" size={16} color="#999" />
                                <Text style={styles.pullToRefreshHintText}>
                                    Desliza hacia abajo para sincronizar
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.continueShoppingButton}
                            onPress={() => onTabPress('home')}
                        >
                            <MaterialIcons name="add-shopping-cart" size={20} color="white" style={styles.buttonIcon} />
                            <Text style={styles.continueShoppingText}>Explorar productos</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} cartItemCount={cartItemCount} />
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
            
            <ScrollView 
                style={styles.scrollView} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    user ? (
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#fa7e17']}
                            tintColor="#fa7e17"
                            title="Sincronizando carrito..."
                            titleColor="#fa7e17"
                        />
                    ) : undefined
                }
            >
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
                    
                    {/* Hint de Pull to Refresh */}
                    {user && !syncInProgress && (
                        <View style={styles.pullToRefreshHintContainer}>
                            <MaterialIcons name="arrow-downward" size={12} color="#999" />
                            <Text style={styles.pullToRefreshHintText}>
                                Desliza hacia abajo para sincronizar
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
                            <MinimalCartItem
                                key={item.id}
                                item={item}
                                calculateSubtotal={calculateSubtotal}
                                toggleItemCheck={toggleItemCheck}
                                removeItem={removeItem}
                                onItemPress={handleItemPress}
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

            <NavInf selectedTab={selectedTab} onTabPress={onTabPress} cartItemCount={cartItemCount} />
            
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
            
            {/* ✅ Modal de detalle de orden */}
            {showOrderDetailModal && selectedOrderId && (
                <OrderDetailModal
                    visible={showOrderDetailModal}
                    orderId={selectedOrderId}
                    onClose={() => {
                        console.log('📋 Cerrando OrderDetailModal');
                        setShowOrderDetailModal(false);
                        setSelectedOrderId(null);
                    }}
                />
            )}

            {/* ✅ Modal de detalle del item del carrito */}
            {showItemDetailModal && selectedItem && (
                <CartItemDetailModal
                    visible={showItemDetailModal}
                    onClose={() => {
                        console.log('🔍 Cerrando CartItemDetailModal');
                        setShowItemDetailModal(false);
                        setSelectedItem(null);
                    }}
                    item={selectedItem}
                    getApplicablePrice={getApplicablePrice}
                    calculateSubtotal={calculateSubtotal}
                    getAvailableQuantities={getAvailableQuantities}
                    updateQuantity={updateQuantity}
                    toggleItemCheck={toggleItemCheck}
                />
            )}
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
        justifyContent: 'space-between',
        flex: 1,
    },
    cartTitle: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        marginLeft: 12,
        flex: 1,
    },
    syncButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(250, 126, 23, 0.1)',
        marginLeft: 8,
    },
    syncButtonLoading: {
        opacity: 0.5,
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
    emptyScrollContent: {
        flex: 1,
        minHeight: '100%',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        backgroundColor: '#f5f7fa',
        minHeight: 600,
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
        marginBottom: 16,
    },
    pullToRefreshHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        gap: 6,
    },
    pullToRefreshHintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        marginTop: 8,
    },
    pullToRefreshHintText: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#999',
        marginLeft: 4,
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
    // ✅ Estilos para item minimalista (estilo Temu)
    minimalCartItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    minimalCartItem: {
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    minimalCartItemChecked: {
        backgroundColor: '#fffbf5',
    },
    deleteButton: {
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkButton: {
        marginRight: 10,
        padding: 4,
    },
    imageWrapper: {
        width: 100,
        height: 100,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 12,
        backgroundColor: '#f8f8f8',
    },
    minimalProductImage: {
        width: '100%',
        height: '100%',
    },
    minimalProductInfo: {
        flex: 1,
        justifyContent: 'space-between',
    },
    minimalProductName: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#333',
        marginBottom: 4,
        lineHeight: 18,
    },
    minimalVariants: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    minimalVariantText: {
        fontSize: 10,
        fontFamily: getUbuntuFont('regular'),
        color: '#999',
    },
    minimalVariantSeparator: {
        fontSize: 10,
        color: '#999',
        marginHorizontal: 4,
    },
    minimalQuantityDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 4,
    },
    minimalQuantityText: {
        fontSize: 11,
        fontFamily: getUbuntuFont('regular'),
        color: '#999',
    },
    minimalTotalPrice: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
    },
    chevronIndicator: {
        marginLeft: 8,
        padding: 4,
    },
    providerFooter: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 14,
        zIndex: -1,
        borderTopWidth: 2,
        borderTopColor: '#e0e0e0',
    },
    providerTotal: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        textAlign: 'center',
        paddingVertical: 8,
    },
    requestButton: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestButtonActive: {
        backgroundColor: '#fa7e17',
        shadowColor: '#fa7e17',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    requestButtonDisabled: {
        backgroundColor: '#d0d0d0',
        opacity: 0.6,
    },
    requestButtonText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#fff',
        textAlign: 'center',
    },
    bottomSpacer: {
        height: 100,
    },
});

// ✅ Exportar directamente sin memo por ahora para evitar problemas con el contexto
export default Cart;
