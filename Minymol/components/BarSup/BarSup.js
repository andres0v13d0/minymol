import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUbuntuFont } from '../../utils/fonts';

const BarSup = ({ currentCategory = '', onCategoryPress }) => {
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const res = await fetch('https://api.minymol.com/categories/with-products-and-images');
        const data = await res.json();
        setCategorias(data);
      } catch (err) {
        console.error('Error al cargar categorías:', err);
      }
    };

    fetchCategorias();
  }, []);

  const handleCategoryPress = (category) => {
    if (onCategoryPress) {
      onCategoryPress(category);
    }
  };

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

        {categorias.map((cat) => (
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
};

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

export default BarSup;
