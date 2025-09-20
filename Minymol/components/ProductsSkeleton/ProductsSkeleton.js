import { Dimensions, StyleSheet, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const ProductsSkeleton = ({ columnsCount = 2, itemsCount = 6 }) => {
  // Crear array de skeletons para mostrar
  const skeletonItems = Array.from({ length: itemsCount }, (_, index) => index);

  // Distribuir items en columnas como en el masonry
  const distributeSkeletonsInColumns = () => {
    const columns = Array.from({ length: columnsCount }, () => []);
    
    skeletonItems.forEach((item, index) => {
      const columnIndex = index % columnsCount;
      columns[columnIndex].push(item);
    });
    
    return columns;
  };

  const renderSkeletonItem = (index) => {
    // Altura aleatoria para simular productos de diferentes tamaños
    const heights = [180, 220, 160, 200, 240, 190, 170, 210];
    const imageHeight = heights[index % heights.length];
    
    return (
      <View key={`skeleton-${index}`} style={styles.skeletonItem}>
        {/* Imagen skeleton - SIN shimmer interno */}
        <View style={[styles.skeletonImage, { height: imageHeight }]} />

        {/* Información del producto skeleton */}
        <View style={styles.skeletonInfo}>
          {/* Nombre del producto */}
          <View style={styles.skeletonName} />
          <View style={[styles.skeletonName, { width: '70%', marginTop: 4 }]} />
          
          {/* Rating y proveedor */}
          <View style={styles.skeletonRating} />
          
          {/* Precio */}
          <View style={styles.skeletonPriceContainer}>
            <View style={styles.skeletonPrice} />
            <View style={styles.skeletonButton} />
          </View>
        </View>
      </View>
    );
  };

  const renderSkeletonColumn = (columnItems, columnIndex) => (
    <View key={`column-${columnIndex}`} style={styles.skeletonColumn}>
      {columnItems.map((item) => renderSkeletonItem(item))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.skeletonContainer}>
        {distributeSkeletonsInColumns().map((columnItems, columnIndex) => 
          renderSkeletonColumn(columnItems, columnIndex)
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  skeletonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  skeletonColumn: {
    flex: 1,
    paddingHorizontal: 4,
  },
  skeletonItem: {
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 0,
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    backgroundColor: '#f0f0f0',
  },
  skeletonInfo: {
    padding: 8,
    marginTop: 2,
  },
  skeletonName: {
    height: 14,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonRating: {
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginTop: 5,
    marginBottom: 5,
    width: '60%',
  },
  skeletonPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  skeletonPrice: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    width: '50%',
  },
  skeletonButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
  },
});

export default ProductsSkeleton;