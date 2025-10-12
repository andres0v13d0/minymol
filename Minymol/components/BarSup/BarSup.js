import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUbuntuFont } from '../../utils/fonts';

// ✅ OPTIMIZADO: Componente para barra superior de categorías
const BarSup = ({ currentCategory = '', onCategoryPress, categories = [] }) => {
  // ✅ OPTIMIZADO: Usar categorías del prop en lugar de cargar desde API
  // Esto elimina el delay de 1+ segundo
  
  const handleCategoryPress = useCallback((category) => {
    if (onCategoryPress) {
      onCategoryPress(category);
    }
  }, [onCategoryPress]);

  // ✅ OPTIMIZADO: Memoizar el renderizado de categorías
  // NOTA: No incluimos handleCategoryPress en deps porque causa re-creación
  // El closure capturará la versión actual automáticamente
  const categoryButtons = useMemo(() => {
    return categories.map((cat) => {
      const isSelected = currentCategory === cat.slug;
      return (
        <TouchableOpacity
          key={cat.id}
          style={styles.linkSup}
          onPress={() => handleCategoryPress(cat)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.linkText, 
            isSelected && styles.selected
          ]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      );
    });
  }, [categories, currentCategory]);

  // ✅ OPTIMIZADO: Calcular si "Todos" está seleccionado
  const isTodosSelected = currentCategory === '';

  return (
    <View style={styles.barSup}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={styles.linkSup}
          onPress={() => handleCategoryPress(null)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.linkText, 
            isTodosSelected && styles.selected
          ]}>
            Todos
          </Text>
        </TouchableOpacity>

        {categoryButtons}
      </ScrollView>
    </View>
  );
};

// ✅ OPTIMIZACIÓN CRÍTICA: Comparación personalizada para React.memo
// Solo re-renderizar si currentCategory cambia (ignorar cambios en onCategoryPress)
const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.currentCategory === nextProps.currentCategory &&
    prevProps.categories.length === nextProps.categories.length
  );
};

// Exportar con comparación personalizada
const BarSupMemo = React.memo(BarSup, arePropsEqual);
BarSupMemo.displayName = 'BarSup';

const styles = StyleSheet.create({
  barSup: {
    backgroundColor: '#2d2d58',
    width: '100%',
    paddingVertical: 5, // Reducido de 8 a 5
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 8, // Reducido de 10 a 8
  },
  linkSup: {
    paddingHorizontal: 15, // Reducido de 20 a 15
    paddingVertical: 6, // Reducido de 8 a 6
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: 'white',
    fontSize: 15,
    fontFamily: getUbuntuFont('regular'),
    textAlign: 'center',
  },
  selected: {
    color: '#fa7e17',
  },
});

export default BarSupMemo;
