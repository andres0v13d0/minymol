import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Header from '../../components/Header/Header';
import NavInf from '../../components/NavInf/NavInf';
import SubCategoryModal from '../../components/SubCategoryModal';
import { useCache } from '../../hooks/useCache';
import { CACHE_KEYS } from '../../utils/cache/StorageKeys';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

// Función para cargar categorías desde la API
const fetchCategories = async () => {
  try {
    const res = await fetch('https://api.minymol.com/categories/with-products-and-images');
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();

    if (Array.isArray(data)) {
      return data;
    } else {
      console.error('La respuesta no es un array:', data);
      // Fallback a array vacío ya que la estructura local es incompatible
      return [];
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Fallback a array vacío en caso de error
    return [];
  }
};

const Categories = ({ onTabPress, onProductPress, onCategoryPress }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  // Animación para el cambio de categoría
  const categoryAnimations = useRef({}).current;

  // Hook de caché para categorías principales
  const {
    data: categories,
    isLoading,
    isRefreshing,
    hasCache,
    isOnline,
    refresh: refreshCategories
  } = useCache(
    CACHE_KEYS.CATEGORIES_MAIN,
    fetchCategories,
    {
      refreshOnMount: true,
      refreshOnFocus: false
    }
  );

  // Solo mostrar loading si no hay caché
  const loading = isLoading && !hasCache;

  // Seleccionar primera categoría cuando se cargan los datos
  useEffect(() => {
    if (categories && Array.isArray(categories) && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Función para inicializar animación de cada categoría
  const initCategoryAnimation = (categoryId) => {
    if (!categoryAnimations[categoryId]) {
      categoryAnimations[categoryId] = new Animated.Value(1);
    }
    return categoryAnimations[categoryId];
  };

  // Función para animar categoría al seleccionar
  const animateCategory = (categoryId) => {
    const animation = categoryAnimations[categoryId];
    if (animation) {
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  const filteredSubCategories = (categories && Array.isArray(categories)) 
    ? (categories.find(cat => cat.id === selectedCategoryId)?.subCategories || [])
    : [];

  const renderCategoryItem = ({ item }) => {
    const isSelected = selectedCategoryId === item.id;
    const categoryAnimation = initCategoryAnimation(item.id);
    
    return (
    <Animated.View style={{ transform: [{ scale: categoryAnimation }] }}>
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.selectedCategory
        ]}
        onPress={() => {
          setSelectedCategoryId(item.id);
          animateCategory(item.id);
        }}
        activeOpacity={0.7}
      >
        {/* Barra izquierda para categoría seleccionada */}
        {isSelected && (
          <View style={styles.selectedIndicator} />
        )}
        
        <Text style={[
          styles.categoryText,
          isSelected && styles.selectedCategoryText
        ]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
    );
  };

  const renderSubCategoryItem = ({ item }) => {
    return (
    <TouchableOpacity
      style={styles.subCategoryItem}
      onPress={() => {
        setSelectedSubCategory(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.circleImage}>
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.subCategoryImage}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.subCategoryText}>{item.name}</Text>
    </TouchableOpacity>
    );
  };

  const getSubCategoryColumns = () => {
    // Para móvil, siempre 2 columnas es lo mejor
    return 2;
  };

  const getSidebarWidth = () => {
    if (screenWidth >= 1200) return screenWidth * 0.25;
    if (screenWidth >= 768) return screenWidth * 0.3;
    return screenWidth * 0.35;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header 
          minimal={false}
          searchBar={false}
          currentPage="categories"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa7e17" />
          <Text style={styles.loadingText}>Cargando categorías...</Text>
        </View>
        <NavInf selected="categories" onPress={onTabPress} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        minimal={false}
        searchBar={false}
        currentPage="categories"
      />
      
      <View style={styles.categoriesContainer}>
        {/* Sidebar de categorías */}
        <View style={styles.sidebar}>
          <FlatList
            data={categories || []}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item?.id || Math.random().toString()}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Grid de subcategorías */}
        <View style={styles.categoriesMain}>
          <FlatList
            data={filteredSubCategories || []}
            renderItem={renderSubCategoryItem}
            keyExtractor={(item) => item?.id || Math.random().toString()}
            numColumns={getSubCategoryColumns()}
            key={getSubCategoryColumns()} // Para forzar re-render cuando cambian las columnas
            contentContainerStyle={styles.subCategoriesGrid}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      <NavInf selected="categories" onPress={onTabPress} />
      
      {/* Modal de subcategoría */}
      <SubCategoryModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedSubCategory(null);
        }}
        subCategory={selectedSubCategory}
        onProductPress={onProductPress}
        onAddToCart={(product) => {
          // Aquí puedes manejar agregar al carrito si tienes esa funcionalidad
          console.log('Agregar al carrito:', product);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    color: '#333',
    marginTop: 10,
    fontSize: 16,
    fontFamily: getUbuntuFont('regular'),
  },
  categoriesContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 120,
    backgroundColor: '#ffffff',
    paddingVertical: 5,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  categoryItem: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    marginVertical: 3,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  selectedCategory: {
    backgroundColor: '#fa7e17',
    shadowColor: '#fa7e17',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    color: '#666',
    fontSize: 12,
    fontFamily: getUbuntuFont('medium'),
    textAlign: 'center',
    lineHeight: 14,
  },
  selectedCategoryText: {
    color: 'white',
    fontFamily: getUbuntuFont('bold'),
  },
  selectedIndicator: {
    position: 'absolute',
    left: 3,
    top: 3,
    bottom: 3,
    width: 6,
    backgroundColor: '#14144b',
    borderRadius: 3,
  },
  categoriesMain: {
    flex: 1,
    backgroundColor: 'white',
  },
  subCategoriesGrid: {
    padding: 15,
    paddingBottom: 85, // Espacio para el NavInf (70px) + extra (15px)
  },
  subCategoryItem: {
    width: '50%', // Exactamente la mitad
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5, // Padding interno en lugar de margin
  },
  circleImage: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  subCategoryImage: {
    width: '100%',
    height: '100%',
  },
  subCategoryText: {
    color: '#333',
    fontSize: 13,
    fontFamily: getUbuntuFont('regular'),
    textAlign: 'center',
    maxWidth: 100,
    lineHeight: 15,
  },
});

export default Categories;
