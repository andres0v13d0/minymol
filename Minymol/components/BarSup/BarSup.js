import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUbuntuFont } from '../../utils/fonts';

const BarSup = React.memo(({ categories = [], currentCategory = '', onCategoryPress }) => {
  // Verificación de seguridad para categories
  const safeCategories = Array.isArray(categories) ? categories : [];
  
  console.log('🔍 BarSup renderizado con categorías:', safeCategories.length);

  const handleCategoryPress = useCallback((category) => {
    if (onCategoryPress) {
      onCategoryPress(category);
    }
  }, [onCategoryPress]);

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
        >
          <Text style={[
            styles.linkText,
            currentCategory === '' && styles.selected
          ]}>
            Todos
          </Text>
        </TouchableOpacity>

        {safeCategories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.linkSup}
            onPress={() => handleCategoryPress(cat)}
          >
            <Text style={[
              styles.linkText,
              currentCategory === cat.slug && styles.selected
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

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

// Función de comparación para evitar re-renders innecesarios
const areEqual = (prevProps, nextProps) => {
  // Asegurar que categories sea un array válido
  const prevCategories = Array.isArray(prevProps.categories) ? prevProps.categories : [];
  const nextCategories = Array.isArray(nextProps.categories) ? nextProps.categories : [];
  
  // Comparar cantidad de categorías
  if (prevCategories.length !== nextCategories.length) {
    return false;
  }

  // Comparar categoría actual
  if (prevProps.currentCategory !== nextProps.currentCategory) {
    return false;
  }

  // Comparar categorías por ID y slug (lo más importante)
  for (let i = 0; i < prevCategories.length; i++) {
    const prev = prevCategories[i];
    const next = nextCategories[i];

    if (!prev || !next || prev.id !== next.id || prev.slug !== next.slug || prev.name !== next.name) {
      return false;
    }
  }

  // Si todo es igual, no re-renderizar
  return true;
};

export default React.memo(BarSup, areEqual);
