import { memo, useEffect, useState } from 'react';
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
import ProductsModal from '../../components/ProductsModal';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

const Categories = ({ onTabPress, onProductPress, onCategoryPress, onSearchPress, isActive = true }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para el modal de productos
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // 🔍 DEBUG: Medir cuándo se activa/desactiva Categories
  useEffect(() => {
    const timestamp = performance.now();
    console.log(`📂 CATEGORIES isActive cambió a: ${isActive} - Time: ${timestamp.toFixed(2)}ms`);
    
    if (isActive) {
      const activationStart = performance.now();
      console.log('🟢 CATEGORIES ACTIVÁNDOSE...');
      
      requestAnimationFrame(() => {
        const activationEnd = performance.now();
        console.log('🟢 CATEGORIES ACTIVADO en:', (activationEnd - activationStart).toFixed(2), 'ms');
      });
    } else {
      console.log('🔴 CATEGORIES DESACTIVÁNDOSE...');
    }
  }, [isActive]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://api.minymol.com/categories/with-products-and-images');
        const data = await res.json();

        if (Array.isArray(data)) {
          setCategories(data);
          if (data.length > 0) {
            setSelectedCategoryId(data[0].id);
          }
        } else {
          console.error('La respuesta no es un array:', data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredSubCategories = categories.find(cat => cat.id === selectedCategoryId)?.subCategories || [];

  // Función para manejar clic en subcategoría
  const handleSubCategoryPress = (subcategory) => {
    console.log('🔗 Subcategoría seleccionada:', subcategory);
    setSelectedSubcategory(subcategory);
    setModalVisible(true);
  };

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedSubcategory(null);
  };

  const renderCategoryItem = ({ item }) => (
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

  const renderSubCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.subCategoryItem}
      onPress={() => handleSubCategoryPress(item)}
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
          onSearchPress={onSearchPress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa7e17" />
          <Text style={styles.loadingText}>Cargando categorías...</Text>
        </View>
        <NavInf selectedTab="categories" onTabPress={onTabPress} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        minimal={false}
        searchBar={false}
        currentPage="categories"
        onSearchPress={onSearchPress}
      />
      
      <View style={styles.categoriesContainer}>
        {/* Sidebar de categorías */}
        <View style={styles.sidebar}>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Grid de subcategorías */}
        <View style={styles.categoriesMain}>
          <FlatList
            data={filteredSubCategories}
            renderItem={renderSubCategoryItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={getSubCategoryColumns()}
            key={getSubCategoryColumns()} // Para forzar re-render cuando cambian las columnas
            contentContainerStyle={styles.subCategoriesGrid}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      <NavInf selectedTab="categories" onTabPress={onTabPress} />
      
      {/* Modal de productos */}
      <ProductsModal
        visible={modalVisible}
        onClose={handleCloseModal}
        subcategorySlug={selectedSubcategory?.slug}
        subcategoryName={selectedSubcategory?.name}
        onProductPress={onProductPress}
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

// ✅ MEGA OPTIMIZADO: React.memo con comparación personalizada para evitar re-renders
const CategoriesOptimized = memo(Categories, (prevProps, nextProps) => {
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
    prevProps.onTabPress === nextProps.onTabPress &&
    prevProps.onProductPress === nextProps.onProductPress &&
    prevProps.onCategoryPress === nextProps.onCategoryPress &&
    prevProps.onSearchPress === nextProps.onSearchPress
  );
});

export default CategoriesOptimized;
