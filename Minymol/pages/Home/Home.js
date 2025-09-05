import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import AutoCarousel from '../../components/AutoCarousel';
import Header from '../../components/Header/Header';
import Product from '../../components/Product/Product';
import { getUbuntuFont } from '../../utils/fonts';

// Función para mezclar array aleatoriamente
function shuffleArray(arr) {
  return arr
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

const ITEMS_PER_LOAD = 10;
const CACHE_KEY = 'cachedProducts';
const CACHE_TIMESTAMP_KEY = 'cachedProductsTimestamp';
const CACHE_DAYS = 3;
const IS_DEV_MODE = false; // Ponlo en true para desactivar el cache temporalmente

const { width: screenWidth } = Dimensions.get('window');

const Home = ({ onProductPress }) => {
  const [products, setProducts] = useState([]);
  const [visibleProducts, setVisibleProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadIndexRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('');

  // Configuración de breakpoints para columnas tipo Masonry
  const getColumnsCount = () => {
    if (screenWidth >= 1600) return 6;
    if (screenWidth >= 1200) return 5;
    if (screenWidth >= 768) return 3;
    return 2; // móvil
  };

  const columnsCount = getColumnsCount();

  const handleSearch = (searchText) => {
    console.log('Buscando:', searchText);
    // Aquí implementarías la lógica de búsqueda
  };

  const handleCategoryPress = (category) => {
    if (category) {
      setCurrentCategory(category.slug);
      console.log('Categoría seleccionada:', category.name);
      // Aquí puedes agregar la lógica para filtrar productos por categoría
    } else {
      setCurrentCategory('');
      console.log('Mostrando todos los productos');
      // Aquí puedes agregar la lógica para mostrar todos los productos
    }
  };

  const addToCart = (product) => {
    setCartItems([...cartItems, product]);
  };

  // Función para organizar productos en columnas tipo Masonry
  const organizeProductsInColumns = (products) => {
    const columns = Array.from({ length: columnsCount }, () => []);
    
    products.forEach((product, index) => {
      const columnIndex = index % columnsCount;
      columns[columnIndex].push(product);
    });
    
    return columns;
  };

  const handleScroll = useCallback((event) => {
    if (loading || loadingMore || !hasMore) return;

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 200;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMore();
    }
  }, [loading, loadingMore, hasMore, loadMore]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    setTimeout(() => {
      const next = products.slice(
        loadIndexRef.current,
        loadIndexRef.current + ITEMS_PER_LOAD
      );
      setVisibleProducts(prev => [...prev, ...next]);
      loadIndexRef.current += ITEMS_PER_LOAD;
      if (loadIndexRef.current >= products.length) {
        setHasMore(false);
      }
      setLoadingMore(false);
    }, 500);
  }, [products, loadingMore, hasMore]);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      setVisibleProducts([]);
      loadIndexRef.current = 0;
      setHasMore(true);

      // Intentar obtener del caché
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      const isCacheValid =
        !IS_DEV_MODE &&
        cached &&
        cachedTimestamp &&
        Date.now() - parseInt(cachedTimestamp) < CACHE_DAYS * 86400000;

      if (isCacheValid) {
        const cachedProducts = JSON.parse(cached);
        if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
          setProducts(cachedProducts);
          setLoading(false);
          return;
        } else {
          // Cache inválido: limpiamos
          await AsyncStorage.removeItem(CACHE_KEY);
          await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
        }
      }

      // Cargar desde API
      const idsRes = await fetch('https://api.minymol.com/products/public-ids');
      const idsData = await idsRes.json();

      if (!Array.isArray(idsData)) throw new Error('Respuesta inválida del backend');

      const ids = idsData.map(p => p.product_id);

      const previewsRes = await fetch('https://api.minymol.com/products/previews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      const previews = await previewsRes.json();
      const shuffled = shuffleArray(previews);

      // Guardar en caché
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(shuffled));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, `${Date.now()}`);

      setProducts(shuffled);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setLoading(false);
      // Fallback a productos locales si falla la API
      const fallbackProducts = [
        {
          id: '1',
          name: 'Producto 1',
          price: 29.99,
          description: 'Descripción del producto 1',
          image: 'https://via.placeholder.com/150'
        },
        {
          id: '2',
          name: 'Producto 2',
          price: 39.99,
          description: 'Descripción del producto 2',
          image: 'https://via.placeholder.com/150'
        },
        {
          id: '3',
          name: 'Producto 3',
          price: 19.99,
          description: 'Descripción del producto 3',
          image: 'https://via.placeholder.com/150'
        },
      ];
      setProducts(fallbackProducts);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  useEffect(() => {
    if (!loading && products.length > 0) {
      const inicial = products.slice(0, ITEMS_PER_LOAD);
      setVisibleProducts(inicial);
      loadIndexRef.current = ITEMS_PER_LOAD;
      setHasMore(products.length > ITEMS_PER_LOAD);
    }
  }, [loading, products]);

  const handleProductPress = (product, action = 'view') => {
    console.log('Producto presionado:', product.name, 'Acción:', action);
    // Aquí se manejará la navegación al detalle del producto
    if (action === 'view') {
      // Por ahora usamos una función prop que se pasará desde App.js
      if (onProductPress) {
        onProductPress(product);
      }
    } else if (action === 'edit') {
      console.log('Editar producto:', product.name);
    }
  };

  const renderColumn = (columnProducts, columnIndex) => {
    // Determinar el estilo de la columna según su posición
    const getColumnStyle = () => {
      if (columnIndex === 0) {
        // Primera columna: pegada al borde izquierdo
        return [styles.column, styles.firstColumn];
      } else if (columnIndex === columnsCount - 1) {
        // Última columna: pegada al borde derecho
        return [styles.column, styles.lastColumn];
      } else {
        // Columnas del medio: espacio a ambos lados
        return [styles.column, styles.middleColumn];
      }
    };

    return (
      <View key={columnIndex} style={getColumnStyle()}>
        {columnProducts.map((product, index) => (
          <View key={`product-${product.id || index}`} style={styles.productContainer}>
            <Product 
              product={product} 
              onAddToCart={addToCart}
              onProductPress={handleProductPress}
              isOwnProduct={false} // Aquí puedes agregar lógica para determinar si es producto propio
            />
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header 
          isHome={true}
          currentCategory={currentCategory}
          onCategoryPress={handleCategoryPress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa7e17" />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      </View>
    );
  }

  const productColumns = organizeProductsInColumns(visibleProducts);

  return (
    <View style={styles.container}>
      <Header 
        isHome={true}
        currentCategory={currentCategory}
        onCategoryPress={handleCategoryPress}
      />
      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator={false}
      >
        {/* Carrusel de GIFs */}
        <AutoCarousel 
          height={200}
          autoScrollInterval={4000}
          showDots={true}
        />
        
        <View style={styles.masonryContainer}>
          {productColumns.map((columnProducts, columnIndex) => 
            renderColumn(columnProducts, columnIndex)
          )}
        </View>

        {loadingMore && hasMore && (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color="#fa7e17" />
            <Text style={styles.loadingText}>Cargando más productos...</Text>
          </View>
        )}
        
        {!hasMore && visibleProducts.length > 0 && (
          <View style={styles.endMessage}>
            <Text style={styles.endText}>No hay más productos para mostrar</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white', // Cambiado de #f5f5f5 a blanco
  },
  scrollView: {
    flex: 1,
  },
  masonryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0, // Sin padding horizontal para pegar a los bordes
    paddingVertical: 0,
    marginTop: 10, // Pequeño margen para separar del carrusel
  },
  column: {
    flex: 1,
  },
  firstColumn: {
    paddingLeft: 0, // Pegada al borde izquierdo
    paddingRight: 2, // Más espacio a la derecha (aumentado de 1 a 4)
  },
  lastColumn: {
    paddingLeft: 2, // Más espacio a la izquierda (aumentado de 1 a 4)
    paddingRight: 0, // Pegada al borde derecho
  },
  middleColumn: {
    paddingLeft: 2, // Más espacio a la izquierda (aumentado de 1 a 4)
    paddingRight: 2, // Más espacio a la derecha (aumentado de 1 a 4)
  },
  productContainer: {
    marginBottom: 8, // Aumentado de 2 a 8 para más espacio vertical
    backgroundColor: 'white', // Fondo blanco para cada producto
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white', // Cambiado de #f5f5f5 a blanco
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
    fontFamily: getUbuntuFont('regular'),
  },
  endMessage: {
    padding: 20,
    alignItems: 'center',
  },
  endText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    fontFamily: getUbuntuFont('regular'),
  },
});

export default Home;
