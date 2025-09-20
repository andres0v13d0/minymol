import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Dimensions, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

const Product = ({ product, onAddToCart, onProductPress, isOwnProduct = false }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageHeight, setImageHeight] = useState(200); // altura por defecto
  const [showPricesModal, setShowPricesModal] = useState(false);

  // Obtener el precio principal (primer precio)
  const mainPrice = product.prices && product.prices.length > 0 ? product.prices[0] : null;
  
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // Aquí puedes agregar la lógica para manejar favoritos con API
  };

  const handleProductPress = () => {
    if (onProductPress) {
      onProductPress(product);
    }
  };

  const handleAddToCartPress = () => {
    if (isOwnProduct && onProductPress) {
      // Si es producto propio, ir a editar
      onProductPress(product, 'edit');
    } else if (onAddToCart) {
      onAddToCart(product);
    } else if (onProductPress) {
      // Si no hay onAddToCart, ir al detalle del producto
      onProductPress(product);
    }
  };

  const handleShowPrices = () => {
    setShowPricesModal(true);
  };

  const handleClosePrices = () => {
    setShowPricesModal(false);
  };

  const handleImageLoad = (event) => {
    const { width, height } = event.nativeEvent.source;
    // Calcular la altura basada en el ancho del contenedor
    const getColumnsCount = () => {
      if (screenWidth >= 1600) return 6;
      if (screenWidth >= 1200) return 5;
      if (screenWidth >= 768) return 3;
      return 2; // móvil
    };
    
    const columnsCount = getColumnsCount();
    const paddingBetweenColumns = 4; // 2px padding a cada lado de cada columna
    const totalPadding = paddingBetweenColumns * columnsCount;
    const availableWidth = screenWidth - totalPadding;
    const containerWidth = availableWidth / columnsCount;
    const aspectRatio = height / width;
    const calculatedHeight = containerWidth * aspectRatio;
    setImageHeight(calculatedHeight);
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageLoaded(true);
  };

  // Simular si es producto nuevo (últimos 5 días)
  const isNew = () => {
    if (!product.createdAt) return false;
    const created = new Date(product.createdAt);
    const now = new Date();
    const diffInMs = now - created;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    return diffInDays <= 5;
  };

  // Calcular el tamaño dinámico del badge NEW basado en la altura de la imagen
  const getBadgeSize = () => {
    const baseSize = Math.min(Math.max(imageHeight * 0.25, 40), 80);
    return baseSize;
  };

  const getDynamicBadgeStyles = () => {
    const badgeSize = getBadgeSize();
    const textSize = Math.max(badgeSize * 0.25, 10);
    const textTop = -(badgeSize * 0.8);
    const textLeft = badgeSize * 0.02;
    
    return {
      badge: {
        borderTopWidth: badgeSize,
        borderRightWidth: badgeSize,
      },
      text: {
        fontSize: textSize,
        top: textTop,
        left: textLeft,
        width: badgeSize * 0.6,
      }
    };
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleProductPress} activeOpacity={0.8}>
      {/* Botón de favoritos */}
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={toggleFavorite}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={20}
          color={isFavorite ? '#e0245e' : '#666'}
        />
      </TouchableOpacity>

      {/* Imagen del producto */}
      <View style={styles.imageWrapper}>
        <Image 
          source={{ uri: product.image || 'https://via.placeholder.com/150' }} 
          style={[styles.image, { height: imageHeight }, !imageLoaded && styles.imageHidden]}
          onLoad={handleImageLoad}
          onError={handleImageError}
          resizeMode="cover"
        />
        {!imageLoaded && (
          <View style={[styles.imagePlaceholder, { height: imageHeight }]}>
            <Ionicons name="image-outline" size={30} color="#ccc" />
          </View>
        )}
      </View>

      {/* Etiqueta de nuevo */}
      {isNew() && (
        <View style={[styles.newBadge, getDynamicBadgeStyles().badge]}>
          <Text style={[styles.newBadgeText, getDynamicBadgeStyles().text]}>NEW</Text>
        </View>
      )}

      {/* Información del producto */}
      <View style={styles.productInfo}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        
        {/* Rating y proveedor */}
        <View style={styles.ratingContainer}>
          {[...Array(product.stars || 5)].map((_, index) => (
            <Ionicons key={index} name="star" size={12} color="#000" />
          ))}
          <Text style={styles.providerText} numberOfLines={1}>
            {product.provider || 'Minymol'}
          </Text>
        </View>

        {/* Precio y botón */}
        <View style={styles.priceContainer}>
          <View style={styles.priceHighlight}>
            {mainPrice && (
              <>
                <View style={styles.mainPriceContainer}>
                  <Text style={styles.currency}>COP</Text>
                  <Text style={styles.price}>
                    {parseFloat(mainPrice.amount || mainPrice.price || 0).toLocaleString('es-CO')}
                  </Text>
                </View>
                <Text style={styles.condition} numberOfLines={1}>
                  {mainPrice.condition || 'Nuevo'}
                </Text>
              </>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddToCartPress}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isOwnProduct ? "pencil" : "cart-outline"} 
              size={24} 
              color={isOwnProduct ? "#001634" : "#fa7e17"} 
            />
          </TouchableOpacity>
        </View>

        {/* Precios adicionales */}
        {product.prices && product.prices.length > 1 && (
          <TouchableOpacity onPress={handleShowPrices} activeOpacity={0.7}>
            <Text style={styles.moreInfo}>
              +{product.prices.length - 1} precios disponibles
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de precios adicionales */}
      <Modal
        visible={showPricesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClosePrices}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClosePrices}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Precios disponibles</Text>
            {product.prices && product.prices.slice(1).map((price, index) => (
              <View key={index} style={styles.priceItem}>
                <Text style={styles.modalPrice}>
                  $ {parseFloat(price.amount || price.price || 0).toLocaleString('es-CO')}
                </Text>
                <Text style={styles.modalCondition}>{price.condition || 'Sin condición'}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.closeButton} onPress={handleClosePrices}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 0,
    margin: 0,
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    // height se establece dinámicamente
  },
  imageHidden: {
    opacity: 0,
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  newBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderTopColor: '#078fff',
    borderRightColor: 'transparent',
    zIndex: 5,
  },
  newBadgeText: {
    position: 'absolute',
    color: 'white',
    fontFamily: getUbuntuFont('bold'),
    transform: [{ rotate: '-45deg' }],
    zIndex: 6,
    textAlign: 'center',
  },
  productInfo: {
    padding: 8,
    marginTop: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: getUbuntuFont('regular'),
    marginBottom: 5,
    color: '#333',
    lineHeight: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  providerText: {
    fontSize: 12,
    fontFamily: getUbuntuFont('regular'),
    color: '#888',
    marginLeft: 3,
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 5,
  },
  priceHighlight: {
    flex: 1,
    position: 'relative',
  },
  mainPriceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currency: {
    fontSize: 10,
    color: '#fa7e17',
    fontFamily: getUbuntuFont('medium'),
    marginTop: 3,
  },
  price: {
    fontSize: 20,
    fontFamily: getUbuntuFont('medium'),
    color: '#fa7e17',
    lineHeight: 22,
    marginLeft: 2,
  },
  condition: {
    fontSize: 10,
    fontFamily: getUbuntuFont('regular'),
    color: '#666',
    marginTop: 0,
    lineHeight: 12,
    maxWidth: 140,
  },
  addButton: {
    backgroundColor: 'transparent',
    padding: 8, // Reducido un poco el padding
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
    minWidth: 40, // Reducido un poco para mejor alineación
    height: 40, // Altura fija en lugar de minHeight para mejor control
    marginTop: -2, // Pequeño ajuste hacia arriba para alinear con el precio
  },
  moreInfo: {
    fontSize: 12,
    fontFamily: getUbuntuFont('regular'),
    color: '#999',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 16,
    margin: 20,
    maxWidth: 300,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: getUbuntuFont('bold'),
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalPrice: {
    fontSize: 16,
    fontFamily: getUbuntuFont('bold'),
    color: '#fa7e17',
  },
  modalCondition: {
    fontSize: 14,
    fontFamily: getUbuntuFont('regular'),
    color: '#666',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  closeButton: {
    backgroundColor: '#fa7e17',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 16,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontFamily: getUbuntuFont('medium'),
    fontSize: 14,
    textAlign: 'center',
  },
});

export default Product;
