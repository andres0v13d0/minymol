import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Alert as RNAlert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import NavInf from '../../components/NavInf/NavInf';
import Product from '../../components/Product/Product';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

// CARRUSEL INDEPENDIENTE CON MEMO - NO SE RECREA EN CADA RENDER
const ImageCarousel = memo(({ images, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageMode, setImageMode] = useState('contain'); // modo de redimensionamiento dinámico
  const animatedHeight = useRef(new Animated.Value(400)).current; // altura animada
  const flatListRef = useRef(null);
  
  // Función para animar el cambio de altura
  const animateHeight = useCallback((newHeight) => {
    Animated.timing(animatedHeight, {
      toValue: newHeight,
      duration: 300, // 300ms de duración
      useNativeDriver: false, // No se puede usar native driver para height
    }).start();
  }, [animatedHeight]);
  
  // Pre-cargar TODAS las imágenes y calcular dimensiones
  useEffect(() => {
    if (images && images.length > 0) {
      images.forEach((img, index) => {
        if (img?.imageUrl) {
          Image.prefetch(img.imageUrl).catch(() => {});
          
          // Obtener dimensiones de la imagen
          Image.getSize(
            img.imageUrl,
            (width, height) => {
              // Calcular altura proporcional manteniendo el ancho de pantalla
              const aspectRatio = height / width;
              const newHeight = screenWidth * aspectRatio;
              
              // Determinar el modo de redimensionamiento según las proporciones
              const newMode = aspectRatio > 1.2 ? 'cover' : 'contain'; // Si es muy alta, usar cover
              
              // Si es la primera imagen o la imagen actual, actualizar altura del contenedor
              if (index === 0 || index === currentIndex) {
                const finalHeight = Math.min(newHeight, screenWidth * 1.5); // máximo 150% del ancho
                animateHeight(finalHeight);
                setImageMode(newMode);
              }
            },
            () => {
              // En caso de error, mantener altura por defecto
              console.warn('Error obteniendo dimensiones de imagen:', img.imageUrl);
            }
          );
        }
      });
    }
  }, [images, currentIndex, animateHeight]);

  const handleMomentumScrollEnd = useCallback((event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / screenWidth);
    
    if (newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
      
      // Actualizar altura del contenedor para la nueva imagen con animación
      const currentImage = images[newIndex];
      if (currentImage?.imageUrl) {
        Image.getSize(
          currentImage.imageUrl,
          (width, height) => {
            const aspectRatio = height / width;
            const newHeight = screenWidth * aspectRatio;
            const newMode = aspectRatio > 1.2 ? 'cover' : 'contain'; // Si es muy alta, usar cover
            
            const finalHeight = Math.min(newHeight, screenWidth * 1.5); // máximo 150% del ancho
            animateHeight(finalHeight);
            setImageMode(newMode);
          },
          () => {
            // En caso de error, mantener altura actual
          }
        );
      }
    }
  }, [images, animateHeight]);

  const navigateToImage = useCallback((index) => {
    if (flatListRef.current && index >= 0 && index < images.length) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true
      });
      setCurrentIndex(index);
    }
  }, [images.length]);

  const renderImageItem = useCallback(({ item }) => (
    <Animated.View style={[styles.instagramSlide, { height: animatedHeight }]}>
      <Image
        source={{ uri: item.imageUrl }}
        style={[styles.instagramImage, { height: '100%' }]}
        resizeMode={imageMode}
      />
    </Animated.View>
  ), [animatedHeight, imageMode]);

  const keyExtractor = useCallback((item, index) => `img-${index}-${item.imageUrl}`, []);

  // Si no hay imágenes
  if (!images || images.length === 0) {
    return (
      <Animated.View style={[styles.instagramCarousel, { height: animatedHeight }]}>
        <Image 
          source={{ uri: 'https://cdn.minymol.com/uploads/logoblanco.webp' }}
          style={[styles.instagramImage, { height: '100%' }]}
          resizeMode={imageMode}
        />
      </Animated.View>
    );
  }
  
  // Si solo hay una imagen
  if (images.length === 1) {
    return (
      <Animated.View style={[styles.instagramCarousel, { height: animatedHeight }]}>
        <Image 
          source={{ uri: images[0].imageUrl }}
          style={[styles.instagramImage, { height: '100%' }]}
          resizeMode={imageMode}
        />
      </Animated.View>
    );
  }
  
  // Carrusel múltiple optimizado
  return (
    <>
      <Animated.View style={[styles.instagramCarousel, { height: animatedHeight }]}>
        <FlatList
          ref={flatListRef}
          data={images}
          renderItem={renderImageItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={false}
          initialScrollIndex={0}
          initialNumToRender={images.length}
          maxToRenderPerBatch={images.length}
          windowSize={images.length}
          removeClippedSubviews={false}
          updateCellsBatchingPeriod={10}
        />
      </Animated.View>
      
      {/* Dots fuera del carrusel */}
      <View style={styles.dotsContainer}>
        {images.map((_, index) => (
          <TouchableOpacity 
            key={`dot-${index}`}
            onPress={() => navigateToImage(index)}
            style={styles.dotButton}
            activeOpacity={0.8}
          >
            <View style={[
              styles.dot,
              currentIndex === index && styles.activeDot
            ]} />
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
});

const ProductDetail = ({ route, navigation, selectedTab = '', onTabPress }) => {
  
  // Recibir el producto completo desde los parámetros
  const productData = route?.params?.product;
  const productId = productData?.uuid || productData?.id || '1';
  
  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [prices, setPrices] = useState([]);
  const [provider, setProvider] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSubcat, setSelectedSubcat] = useState(null);
  const [displayedProductsCount, setDisplayedProductsCount] = useState(5);
  const [subCategories, setSubCategories] = useState([]);
  const [quantityDropdownOpen, setQuantityDropdownOpen] = useState(false);

  // Función para ordenar tallas
  const sortSizes = (sizesRaw) => {
    const priority = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

    return sizesRaw.slice().sort((a, b) => {
      const aVal = a.name.toUpperCase();
      const bVal = b.name.toUpperCase();

      const aIndex = priority.indexOf(aVal);
      const bIndex = priority.indexOf(bVal);

      const isANumeric = !isNaN(Number(aVal));
      const isBNumeric = !isNaN(Number(bVal));

      if (isANumeric && isBNumeric) {
        return Number(aVal) - Number(bVal);
      }

      if (!isANumeric && !isBNumeric) {
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        return aVal.localeCompare(bVal);
      }

      return isANumeric ? 1 : -1;
    });
  };

  useEffect(() => {
    
    const fetchData = async () => {
      try {
        setLoading(true);

        // Cargar datos del producto
        const productRes = await fetch(`https://api.minymol.com/products/${productId}`);
        const productApiData = await productRes.json();
        setProduct(productApiData);
        setColors(productApiData.colors || []);
        setSizes(sortSizes(productApiData.sizes || []));

        // Cargar imágenes
        const imagesRes = await fetch(`https://api.minymol.com/images/by-product/${productId}`);
        const imagesData = await imagesRes.json();
        const imagesArray = Array.isArray(imagesData) ? imagesData : [];
        setImages(imagesArray);

        // Cargar precios
        const pricesRes = await fetch(`https://api.minymol.com/product-prices/product/${productId}`);
        const pricesData = await pricesRes.json();
        setPrices(Array.isArray(pricesData) ? pricesData : []);

        // Establecer cantidad inicial
        if (Array.isArray(pricesData) && pricesData.length > 0) {
          const firstQty = pricesData[0]?.quantity?.split(',')?.[0];
          if (firstQty) setQuantity(parseInt(firstQty.trim()));
        }

        // Cargar proveedor
        const providerRes = await fetch(`https://api.minymol.com/providers/public/${productApiData.providerId}`);
        const providerData = await providerRes.json();
        setProvider(providerData);

        // Cargar productos relacionados
        const relatedRes = await fetch(`https://api.minymol.com/products/by-provider/${productApiData.providerId}`);
        const resIds = await relatedRes.json();

        if (Array.isArray(resIds) && resIds.length > 0) {
          const ids = resIds.map(p => p.product_id).filter(Boolean);

          if (ids.length > 0) {
            const previewsRes = await fetch('https://api.minymol.com/products/previews', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids }),
            });

            const previews = await previewsRes.json();
            if (Array.isArray(previews)) {
              const activos = previews.filter(prod => !prod.isInactive);
              setRelatedProducts(activos);
              
              // Extraer subcategorías
              const categoryMap = new Map();
              activos.forEach(p => {
                if (p.subCategory && !categoryMap.has(p.subCategory.slug)) {
                  categoryMap.set(p.subCategory.slug, p.subCategory);
                }
              });
              setSubCategories(Array.from(categoryMap.values()));
            }
          }
        } else {
          setRelatedProducts([]);
        }

        setLoading(false);
        
      } catch (err) {
        
        // Fallback usando los datos que vienen desde Home
        if (productData) {
          setProduct({
            id: productData.uuid || productData.id,
            name: productData.name,
            description: productData.description || 'Descripción no disponible',
          });
          
          setProvider({
            nombre_empresa: productData.provider || 'Proveedor no especificado',
            calificacion: productData.stars || 0,
            descripcion: `Proveedor: ${productData.provider || 'No especificado'}`,
            cantidadPedidos: 0,
            ciudad: 'Cali',
            logo_url: null,
            banner_url: null
          });
          
          // Convertir precios del formato que viene de Home
          const formattedPrices = productData.prices ? productData.prices.map((priceInfo, index) => ({
            id: index + 1,
            price: parseFloat(priceInfo.amount),
            quantity: priceInfo.condition.match(/\d+/g)?.join(',') || '1',
            description: priceInfo.condition
          })) : [
            { id: 1, price: 25000, quantity: '1,2,3,4,5', description: 'Precio base' }
          ];
          
          setPrices(formattedPrices);
          
          // Usar la imagen del producto
          const productImages = productData.image ? [
            { imageUrl: productData.image }
          ] : [
            { imageUrl: 'https://cdn.minymol.com/uploads/logoblanco.webp' }
          ];
          
          setImages(productImages);
          setRelatedProducts([]);
        } else {
          // Último fallback si no hay nada
          setProduct({
            id: productId,
            name: 'Producto no disponible',
            description: 'No se pudieron cargar los datos del producto.',
          });
          
          setProvider({
            nombre_empresa: 'Proveedor no disponible',
            calificacion: 0,
            descripcion: 'No se pudo cargar la información del proveedor',
            cantidadPedidos: 0,
            ciudad: 'Cali',
            logo_url: null,
            banner_url: null
          });
          
          setPrices([
            { id: 1, price: 0, quantity: '1', description: 'Precio no disponible' }
          ]);
          
          setImages([
            { imageUrl: 'https://cdn.minymol.com/uploads/logoblanco.webp' }
          ]);
          
          setRelatedProducts([]);
        }
        
        setColors([]);
        setSizes([]);
        setLoading(false);
        
      }
    };

    fetchData();
  }, [productId]);

  // Cantidades disponibles
  const availableQuantities = useMemo(() => {
    const set = new Set();
    if (Array.isArray(prices)) {
      prices.forEach(p => {
        if (p.quantity) {
          p.quantity.split(',').forEach(q => set.add(parseInt(q.trim())));
        }
      });
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [prices]);

  // Precio aplicable según cantidad
  const applicablePrice = useMemo(() => {
    if (!Array.isArray(prices)) return null;
    
    return prices.find(p => {
      if (!p.quantity) return false;
      const qList = p.quantity.split(',').map(q => parseInt(q.trim()));
      return qList.includes(quantity);
    });
  }, [quantity, prices]);

  // Productos filtrados y paginados
  const filteredProducts = useMemo(() => {
    let filtered = relatedProducts;
    if (selectedSubcat) {
      filtered = relatedProducts.filter(p => p.subCategory?.slug === selectedSubcat);
    }
    return filtered.slice(0, displayedProductsCount);
  }, [relatedProducts, selectedSubcat, displayedProductsCount]);

  // Formatear rangos de cantidad
  const formatRanges = (numbersStr) => {
    const numbers = numbersStr
      .match(/\d+/g)
      ?.map(n => parseInt(n))
      .sort((a, b) => a - b) || [];

    if (numbers.length === 0) return 'Aplica 0 unidades';

    const ranges = [];
    let start = numbers[0];
    let end = numbers[0];

    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] === end + 1) {
        end = numbers[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = numbers[i];
        end = numbers[i];
      }
    }

    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return `Aplica ${ranges.join(', ')} unidades`;
  };

  const handleAddToCart = () => {
    if (Array.isArray(colors) && colors.length > 0 && !selectedColor) {
      RNAlert.alert('Error', 'Selecciona un color');
      return;
    }

    if (Array.isArray(sizes) && sizes.length > 0 && !selectedSize) {
      RNAlert.alert('Error', 'Selecciona una talla');
      return;
    }

    if (!applicablePrice) {
      RNAlert.alert('Error', 'No hay precio válido para esta cantidad');
      return;
    }

    const item = {
      productId: product.id,
      nombre: product.name,
      talla: selectedSize || null,
      color: selectedColor || null,
      cantidad: quantity,
      precio: applicablePrice.price,
      productPrices: prices,
      image: images[0]?.imageUrl, // Usar primera imagen
    };

    RNAlert.alert('Éxito', 'Producto agregado al carrito');
  };

  const handleBack = () => {
    if (navigation) {
      navigation.goBack();
    } else {
    }
  };

  const handleProductPress = (product) => {
    // Aquí se navegaría a otro producto
  };

  const addToCart = (product) => {
    RNAlert.alert('Producto agregado', `${product.name} agregado al carrito`);
  };

  // Organizar productos relacionados en columnas
  const getColumnsCount = () => {
    if (screenWidth >= 768) return 3;
    return 2; // móvil
  };

  const organizeProductsInColumns = (products) => {
    const columnsCount = getColumnsCount();
    const columns = Array.from({ length: columnsCount }, () => []);
    
    products.forEach((product, index) => {
      const columnIndex = index % columnsCount;
      columns[columnIndex].push(product);
    });
    
    return columns;
  };

  // Componente Header personalizado para ProductDetail
  const CustomHeader = ({ provider, onBack }) => (
    <View style={styles.customHeader}>
      {/* Botón de back */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <MaterialIcons name="arrow-back-ios-new" size={30} color="#fa7e17" />
      </TouchableOpacity>
      
      {/* Banner del proveedor */}
      {provider && (
        <View style={styles.headerBannerContainer}>
          <Image
            source={{ 
              uri: provider.banner_url || 'https://cdn.minymol.com/uploads/logoblanco.webp' 
            }}
            style={styles.headerBanner}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <CustomHeader provider={null} onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa7e17" />
          <Text style={styles.loadingText}>Cargando producto...</Text>
        </View>
      </View>
    );
  }

  if (!product || !provider) {
    return (
      <View style={styles.container}>
        <CustomHeader provider={null} onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No se pudo cargar el producto</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader provider={provider} onBack={handleBack} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Título del producto */}
        <Text style={styles.productTitle}>{product.name}</Text>

        {/* Carrusel de imágenes */}
        <ImageCarousel images={images} initialIndex={0} />

        {/* Detalles del producto */}
        <View style={styles.productDetails}>
          <Text style={styles.productDescription}>{product.description}</Text>

          {/* Precio principal */}
          <View style={styles.priceHighlight}>
            <View style={styles.priceContainer}>
              <Text style={styles.currency}>COP</Text>
              <Text style={styles.price}>
                {applicablePrice ? parseFloat(applicablePrice.price).toLocaleString('es-CO') : '0'}
              </Text>
            </View>
          </View>

          <Text style={styles.priceInfo}>
            Este producto tiene descuentos por cantidad. Todos los precios son por unidad.
          </Text>

          {/* Lista de precios */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.priceScrollList}
          >
            {Array.isArray(prices) && prices.map((p, index) => (
              <View 
                key={index} 
                style={[
                  styles.priceBlock,
                  applicablePrice?.id === p.id && styles.activePriceBlock
                ]}
              >
                <Text style={styles.priceAmount}>
                  COP {parseFloat(p.price || 0).toLocaleString('es-CO')}
                </Text>
                <Text style={styles.priceCondition}>{formatRanges(p.description || p.quantity || '')}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Selectores */}
          <View style={styles.selectors}>
            {Array.isArray(colors) && colors.length > 0 && (
              <View style={styles.selectorGroup}>
                <Text style={styles.selectorLabel}>Color:</Text>
                <View style={styles.optionsContainer}>
                  {colors.map((color, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        selectedColor === color.name && styles.selectedOption
                      ]}
                      onPress={() => setSelectedColor(color.name)}
                    >
                      <Text style={[
                        styles.optionText,
                        selectedColor === color.name && styles.selectedOptionText
                      ]}>
                        {color.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {Array.isArray(sizes) && sizes.length > 0 && (
              <View style={styles.selectorGroup}>
                <Text style={styles.selectorLabel}>Talla:</Text>
                <View style={styles.optionsContainer}>
                  {sizes.map((size, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        selectedSize === size.name && styles.selectedOption
                      ]}
                      onPress={() => setSelectedSize(size.name)}
                    >
                      <Text style={[
                        styles.optionText,
                        selectedSize === size.name && styles.selectedOptionText
                      ]}>
                        {size.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.selectorGroup}>
              <Text style={styles.selectorLabel}>Cantidad:</Text>
              <View style={styles.customDropdownContainer}>
                <TouchableOpacity 
                  style={styles.customDropdownButton}
                  onPress={() => setQuantityDropdownOpen(!quantityDropdownOpen)}
                >
                  <Text style={styles.customDropdownText}>{quantity}</Text>
                  <Text style={styles.customDropdownArrow}>
                    {quantityDropdownOpen ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                
                {quantityDropdownOpen && (
                  <View style={styles.customDropdownOptions}>
                    <ScrollView 
                      style={styles.customDropdownScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {Array.isArray(availableQuantities) && availableQuantities.map((qty) => (
                        <TouchableOpacity
                          key={qty}
                          style={[
                            styles.customDropdownOption,
                            quantity === qty && styles.customDropdownOptionSelected
                          ]}
                          onPress={() => {
                            setQuantity(qty);
                            setQuantityDropdownOpen(false);
                          }}
                        >
                          <Text style={[
                            styles.customDropdownOptionText,
                            quantity === qty && styles.customDropdownOptionTextSelected
                          ]}>
                            {qty}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Subtotal */}
          {applicablePrice && (
            <View style={styles.subtotalContainer}>
              <Text style={styles.subtotalText}>
                Subtotal: <Text style={styles.subtotalAmount}>
                  COP {(quantity * parseFloat(applicablePrice.price)).toLocaleString('es-CO')}
                </Text>
              </Text>
            </View>
          )}

          {/* Botón de agregar al carrito */}
          <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
            <Text style={styles.addToCartText}>Añadir al carrito</Text>
          </TouchableOpacity>

          <View style={styles.line} />

          {/* Información del proveedor */}
          <View style={styles.providerInfo}>
            <Text style={styles.providerTitle}>Información del proveedor</Text>
            <View style={styles.providerHeader}>
              <Image
                source={{ 
                  uri: provider.logo_url || 'https://cdn.minymol.com/uploads/logoblanco.webp' 
                }}
                style={styles.providerLogo}
                resizeMode="cover"
              />
              <View style={styles.providerDetails}>
                <Text style={styles.providerName}>{provider.nombre_empresa}</Text>
                <Text style={styles.providerRating}>
                  <Text style={styles.bold}>Calificación: </Text>⭐ {provider.calificacion}
                </Text>
              </View>
            </View>
            <Text style={styles.providerDescription}>{provider.descripcion}</Text>
            <Text style={styles.providerInfoText}>
              Cantidad de pedidos: {provider?.cantidadPedidos || 0}
            </Text>
            <Text style={styles.providerInfoText}>
              Ciudad: {provider?.ciudad || 'Cali'}
            </Text>
          </View>

          {/* Productos relacionados */}
          {Array.isArray(relatedProducts) && relatedProducts.length > 0 && (
            <>
              <View style={styles.line} />
              <Text style={styles.relatedTitle}>Más productos del proveedor</Text>
              
              {/* Filtro de subcategorías */}
              {Array.isArray(subCategories) && subCategories.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Filtrar por categoría:</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterContainer}
                  >
                    <TouchableOpacity
                      style={[
                        styles.filterButton,
                        !selectedSubcat && styles.filterButtonActive
                      ]}
                      onPress={() => setSelectedSubcat(null)}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        !selectedSubcat && styles.filterButtonTextActive
                      ]}>
                        Todas
                      </Text>
                    </TouchableOpacity>
                    {subCategories.map(sc => (
                      <TouchableOpacity
                        key={sc.slug}
                        style={[
                          styles.filterButton,
                          selectedSubcat === sc.slug && styles.filterButtonActive
                        ]}
                        onPress={() => setSelectedSubcat(sc.slug)}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          selectedSubcat === sc.slug && styles.filterButtonTextActive
                        ]}>
                          {sc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              <View style={styles.relatedProductsContainer}>
                {organizeProductsInColumns(filteredProducts).map((columnProducts, columnIndex) => (
                  <View key={columnIndex} style={styles.column}>
                    {columnProducts.map((product, index) => (
                      <View key={`product-${product.id || index}`} style={styles.productContainer}>
                        <Product 
                          product={product} 
                          onAddToCart={addToCart}
                          onProductPress={handleProductPress}
                          isOwnProduct={false}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
              
              {/* Botón de cargar más */}
              {filteredProducts.length < relatedProducts.length && (
                <TouchableOpacity 
                  style={styles.loadMoreButton}
                  onPress={() => setDisplayedProductsCount(prev => prev + 5)}
                >
                  <Text style={styles.loadMoreText}>Cargar más productos</Text>
                </TouchableOpacity>
              )}
            </>
          )}

        </View>
      </ScrollView>
      
      {/* Navegación inferior */}
      <NavInf 
        isProductInfo={true} 
        selected={selectedTab}
        onPress={onTabPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  // Nuevo: Header personalizado
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingTop: 10, // para el safe area
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 20,
    marginRight: 12,
  },
  backIcon: {
    fontSize: 30,
    color: '#333',
    fontFamily: getUbuntuFont('bold'),
  },
  headerBannerContainer: {
    flex: 1,
    height: 50,
    overflow: 'hidden',
  },
  headerBanner: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
    fontFamily: getUbuntuFont('regular'),
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    fontFamily: getUbuntuFont('regular'),
    textAlign: 'center',
  },
  // Nuevo: Sección del logo del proveedor
  providerLogoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  providerLogoTop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  providerNameTop: {
    fontSize: 16,
    fontFamily: getUbuntuFont('medium'),
    color: '#333',
    flex: 1,
  },
  productTitle: {
    fontSize: 20,
    fontFamily: getUbuntuFont('bold'),
    marginBottom: 16,
    paddingHorizontal: 16,
    color: '#333',
  },
  // Estilos del carrusel con altura automática - DINAMICO
  instagramCarousel: {
    width: screenWidth,
    backgroundColor: '#fff', // Fondo blanco
    position: 'relative',
    overflow: 'hidden', // Asegurar que no haya contenido sobresaliendo
  },
  instagramSlide: {
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // Fondo blanco
  },
  instagramImage: {
    width: '100%', // Usar 100% para ocupar todo el ancho disponible
    flex: 1, // Permitir que la imagen se expanda
  },
  // Dots externos negros
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  dotButton: {
    padding: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#333',
  },
  // Estilos instagram legacy (por si acaso)
  instagramDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instagramDotButton: {
    padding: 4,
  },
  instagramDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 2,
  },
  instagramDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  // Wrapper para casos legacy
  mainImageWrapper: {
    width: screenWidth,
    height: screenWidth,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  productDetails: {
    paddingHorizontal: 16,
    paddingBottom: 85, // Espacio para el NavInf (70px) + extra (15px)
  },
  productDescription: {
    fontSize: 16,
    fontFamily: getUbuntuFont('regular'),
    marginBottom: 16,
    color: '#333',
    lineHeight: 22,
  },
  priceHighlight: {
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currency: {
    fontSize: 15,
    color: '#fa7e17',
    fontFamily: getUbuntuFont('medium'),
    marginTop: 8,
  },
  price: {
    fontSize: 40,
    fontFamily: getUbuntuFont('medium'),
    color: '#fa7e17',
    marginLeft: 5,
  },
  priceInfo: {
    fontSize: 12,
    fontFamily: getUbuntuFont('regular'),
    color: '#666',
    marginBottom: 16,
  },
  priceScrollList: {
    marginBottom: 16,
  },
  priceBlock: {
    minWidth: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    opacity: 0.6,
  },
  activePriceBlock: {
    backgroundColor: '#fa7e17',
    opacity: 1,
  },
  priceAmount: {
    fontSize: 14,
    fontFamily: getUbuntuFont('bold'),
    color: '#333',
    marginBottom: 4,
  },
  priceCondition: {
    fontSize: 12,
    fontFamily: getUbuntuFont('regular'),
    color: '#666',
  },
  selectors: {
    marginBottom: 16,
  },
  selectorGroup: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 16,
    fontFamily: getUbuntuFont('bold'),
    color: '#333',
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  selectedOption: {
    backgroundColor: '#fa7e17',
    borderColor: '#fa7e17',
  },
  optionText: {
    fontSize: 14,
    fontFamily: getUbuntuFont('regular'),
    color: '#333',
  },
  selectedOptionText: {
    color: 'white',
  },
  // Nuevo: Dropdown personalizado para cantidad
  customDropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  customDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  customDropdownText: {
    fontSize: 16,
    fontFamily: getUbuntuFont('regular'),
    color: '#333',
    flex: 1,
  },
  customDropdownArrow: {
    fontSize: 12,
    color: '#666',
    fontFamily: getUbuntuFont('regular'),
  },
  customDropdownOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    zIndex: 1001,
    elevation: 5, // Para Android
    shadowColor: '#000', // Para iOS
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  customDropdownScroll: {
    maxHeight: 200,
  },
  customDropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customDropdownOptionSelected: {
    backgroundColor: '#fa7e17',
  },
  customDropdownOptionText: {
    fontSize: 16,
    fontFamily: getUbuntuFont('regular'),
    color: '#333',
    textAlign: 'center',
  },
  customDropdownOptionTextSelected: {
    color: 'white',
    fontFamily: getUbuntuFont('medium'),
  },
  subtotalContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  subtotalText: {
    fontSize: 16,
    fontFamily: getUbuntuFont('regular'),
    color: '#333',
  },
  subtotalAmount: {
    fontFamily: getUbuntuFont('bold'),
    color: '#fa7e17',
  },
  addToCartButton: {
    backgroundColor: '#fa7e17',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  addToCartText: {
    color: 'white',
    fontSize: 18,
    fontFamily: getUbuntuFont('medium'),
  },
  line: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 16,
  },
  providerInfo: {
    marginBottom: 16,
  },
  providerTitle: {
    fontSize: 18,
    fontFamily: getUbuntuFont('medium'),
    color: '#333',
    marginBottom: 12,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontFamily: getUbuntuFont('bold'),
    color: '#333',
    marginBottom: 4,
  },
  providerRating: {
    fontSize: 14,
    fontFamily: getUbuntuFont('regular'),
    color: '#666',
  },
  bold: {
    fontFamily: getUbuntuFont('bold'),
  },
  providerDescription: {
    fontSize: 14,
    fontFamily: getUbuntuFont('regular'),
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  providerInfoText: {
    fontSize: 14,
    fontFamily: getUbuntuFont('regular'),
    color: '#333',
    marginBottom: 4,
  },
  relatedTitle: {
    fontSize: 18,
    fontFamily: getUbuntuFont('medium'),
    color: '#333',
    marginBottom: 16,
  },
  // Nuevo: Filtros de subcategorías
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontFamily: getUbuntuFont('medium'),
    color: '#333',
    marginBottom: 8,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterContainer: {
    paddingHorizontal: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#fa7e17',
    borderColor: '#fa7e17',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: getUbuntuFont('regular'),
    color: '#333',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  relatedProductsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  column: {
    flex: 1,
    paddingHorizontal: 4,
  },
  productContainer: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  // Nuevo: Botón de cargar más
  loadMoreButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loadMoreText: {
    fontSize: 16,
    fontFamily: getUbuntuFont('medium'),
    color: '#333',
  },
  // Nuevos estilos para el carrusel y parallax
  parallaxItemContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  parallaxImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  paginationItemContainer: {
    width: 10,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  paginationDot: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
});

export default ProductDetail;
