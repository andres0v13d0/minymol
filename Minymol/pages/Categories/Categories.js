import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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

  const filteredSubCategories = (categories && Array.isArray(categories)) 
    ? (categories.find(cat => cat.id === selectedCategoryId)?.subCategories || [])
    : [];

  const renderCategoryItem = ({ item }) => {
    return (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategoryId === item.id && styles.selectedCategory
      ]}
      onPress={() => setSelectedCategoryId(item.id)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategoryId === item.id && styles.selectedCategoryText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
    );
  };

  const renderSubCategoryItem = ({ item }) => {
    return (
    <TouchableOpacity
      style={styles.subCategoryItem}
      onPress={() => onCategoryPress && onCategoryPress(item.slug)}
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
    width: 90, // Más angosto como Temu
    backgroundColor: '#f5f5f5',
    paddingVertical: 5,
  },
  categoryItem: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    marginVertical: 2,
    marginLeft: 0, // Pegado al borde izquierdo
    marginRight: 0,
  },
  selectedCategory: {
    backgroundColor: '#fa7e17', // Naranja completo
  },
  categoryText: {
    color: '#666',
    fontSize: 12,
    fontFamily: getUbuntuFont('medium'),
    textAlign: 'left', // Alineado a la izquierda
    lineHeight: 14,
  },
  selectedCategoryText: {
    color: 'white', // Blanco cuando está seleccionado
    fontFamily: getUbuntuFont('bold'),
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
