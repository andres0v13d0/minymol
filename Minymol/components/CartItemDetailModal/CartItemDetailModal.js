import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { getUbuntuFont } from '../../utils/fonts';

const { height: screenHeight } = Dimensions.get('window');

// Componente de selector de cantidad para el modal
const QuantitySelectorModal = ({ item, currentQuantity, onQuantityChange, getAvailableQuantities }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownHeight, setDropdownHeight] = useState(0);
    const animatedRotation = useRef(new Animated.Value(0)).current;
    const animatedOpacity = useRef(new Animated.Value(0)).current;

    const availableQuantities = getAvailableQuantities(item);

    const toggleDropdown = useCallback(() => {
        const newIsOpen = !isOpen;
        setIsOpen(newIsOpen);

        if (newIsOpen) {
            const maxVisible = Math.min(availableQuantities.length, 5);
            const itemHeight = 50;
            const newHeight = maxVisible * itemHeight;
            setDropdownHeight(newHeight);
        } else {
            setDropdownHeight(0);
        }

        Animated.timing(animatedRotation, {
            toValue: newIsOpen ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();

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
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View style={styles.quantitySelector}>
            <TouchableOpacity
                style={[styles.quantitySelectorButton, isOpen && styles.quantitySelectorButtonOpen]}
                onPress={toggleDropdown}
                activeOpacity={0.8}
            >
                <View style={styles.quantitySelectorContent}>
                    <MaterialIcons name="confirmation-number" size={20} color="#666" />
                    <Text style={styles.quantitySelectorText}>{currentQuantity}</Text>
                </View>
                <Animated.View style={{ transform: [{ rotate: rotateInterpolation }] }}>
                    <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
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
                                    size={16}
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
                                <MaterialIcons name="check" size={18} color="#fff" />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Animated.View>
        </View>
    );
};

const CartItemDetailModal = ({
    visible,
    onClose,
    item,
    getApplicablePrice,
    calculateSubtotal,
    getAvailableQuantities,
    updateQuantity,
    toggleItemCheck
}) => {
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    // Animación de apertura/cierre
    const animateModal = useCallback((show) => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: show ? 0 : screenHeight,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }),
            Animated.timing(backdropAnim, {
                toValue: show ? 1 : 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, [slideAnim, backdropAnim]);

    // Efecto para animar cuando visible cambia
    useEffect(() => {
        if (visible) {
            animateModal(true);
        }
    }, [visible, animateModal]);

    const handleClose = () => {
        animateModal(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    if (!visible || !item) return null;

    const priceData = getApplicablePrice(item);
    const unitPrice = parseFloat(priceData.price || 0);
    const subtotal = calculateSubtotal(item);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.modalContainer}>
                {/* Backdrop */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: backdropAnim }
                    ]}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={handleClose}
                        activeOpacity={1}
                    />
                </Animated.View>

                {/* Modal Content */}
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.dragIndicator} />
                        <View style={styles.headerContent}>
                            <Text style={styles.headerTitle}>Detalle del producto</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleClose}
                            >
                                <MaterialIcons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Imagen del producto */}
                        <View style={styles.imageContainer}>
                            <Image
                                source={{ uri: item.imageUrlSnapshot }}
                                style={styles.productImage}
                                resizeMode="cover"
                            />
                            <TouchableOpacity
                                style={styles.checkButtonModal}
                                onPress={() => toggleItemCheck(item.id)}
                            >
                                <MaterialIcons
                                    name={item.isChecked ? "check-circle" : "radio-button-unchecked"}
                                    size={32}
                                    color={item.isChecked ? "#fa7e17" : "#ddd"}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Información del producto */}
                        <View style={styles.infoContainer}>
                            {/* Nombre del producto */}
                            <Text style={styles.productName}>
                                {item.productNameSnapshot}
                            </Text>

                            {/* Variantes */}
                            {(item.colorSnapshot || item.sizeSnapshot) && (
                                <View style={styles.variantsContainer}>
                                    <Text style={styles.variantsLabel}>Variantes:</Text>
                                    <View style={styles.variantsList}>
                                        {item.colorSnapshot && (
                                            <View style={styles.variantChip}>
                                                <MaterialIcons name="palette" size={14} color="#666" />
                                                <Text style={styles.variantText}>{item.colorSnapshot}</Text>
                                            </View>
                                        )}
                                        {item.sizeSnapshot && (
                                            <View style={styles.variantChip}>
                                                <MaterialIcons name="straighten" size={14} color="#666" />
                                                <Text style={styles.variantText}>{item.sizeSnapshot}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Separador */}
                            <View style={styles.separator} />

                            {/* Precio unitario */}
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Precio unitario:</Text>
                                <Text style={styles.unitPrice}>
                                    ${unitPrice.toLocaleString('es-CO')}
                                </Text>
                            </View>

                            {/* Selector de cantidad */}
                            <View style={styles.quantityRow}>
                                <Text style={styles.quantityLabel}>Cantidad:</Text>
                                <QuantitySelectorModal
                                    item={item}
                                    currentQuantity={item.cantidad}
                                    onQuantityChange={updateQuantity}
                                    getAvailableQuantities={getAvailableQuantities}
                                />
                            </View>

                            {/* Separador */}
                            <View style={styles.separator} />

                            {/* Total */}
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Subtotal:</Text>
                                <Text style={styles.totalPrice}>
                                    ${subtotal.toLocaleString('es-CO')}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.bottomSpacer} />
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: screenHeight * 0.90, // Altura del 90% de la pantalla
        maxHeight: screenHeight * 0.95, // Máximo permitido
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    header: {
        paddingTop: 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#ddd',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 12,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    imageContainer: {
        position: 'relative',
        backgroundColor: '#f8f8f8',
        width: '100%',
        aspectRatio: 1, // Hace que el contenedor sea cuadrado
        justifyContent: 'center',
        alignItems: 'center',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    checkButtonModal: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    infoContainer: {
        padding: 20,
    },
    productName: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        marginBottom: 16,
        lineHeight: 28,
    },
    variantsContainer: {
        marginBottom: 16,
    },
    variantsLabel: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#666',
        marginBottom: 8,
    },
    variantsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    variantChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6,
    },
    variantText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#666',
    },
    separator: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 16,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    priceLabel: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
    },
    unitPrice: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
    },
    quantityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    quantityLabel: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
    },
    quantitySelector: {
        position: 'relative',
        zIndex: 9999,
        minWidth: 120,
    },
    quantitySelectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: '#ddd',
        borderRadius: 12,
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 50,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    quantitySelectorButtonOpen: {
        borderColor: '#fa7e17',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    quantitySelectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    quantitySelectorText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
    },
    quantityDropdownContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#fa7e17',
        borderTopWidth: 0,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        overflow: 'hidden',
        zIndex: 10000,
        elevation: 25,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    quantityDropdownScroll: {
        maxHeight: 250,
    },
    quantityDropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        minHeight: 50,
    },
    quantityDropdownOptionSelected: {
        backgroundColor: '#fa7e17',
    },
    quantityOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    quantityDropdownOptionText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
    },
    quantityDropdownOptionTextSelected: {
        color: 'white',
        fontFamily: getUbuntuFont('bold'),
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
    },
    totalPrice: {
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
    },
    bottomSpacer: {
        height: 30,
    },
});

export default CartItemDetailModal;
