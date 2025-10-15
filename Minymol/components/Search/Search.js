import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const Search = ({ onSearch, onPress }) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = () => {
    const trimmed = text.trim();
    if (onSearch) {
      onSearch(trimmed);
    }
    // Aquí puedes agregar navegación como en el código web
    console.log('Buscando:', trimmed);
  };

  const handleSubmit = () => {
    handleSearch();
  };

  const handlePress = () => {
    console.log('🔍 Search: handlePress llamado, onPress existe:', !!onPress);
    if (onPress) {
      console.log('🔍 Search: Ejecutando onPress (abriendo modal)');
      onPress();
    }
  };

  const handleInputPress = () => {
    // Solo abrir modal si onPress está definido
    console.log('🔍 Search: handleInputPress llamado, onPress existe:', !!onPress);
    if (onPress) {
      console.log('🔍 Search: Input presionado, abriendo modal');
      onPress();
    }
  };

  return (
    <View style={[styles.search, isFocused && styles.searchFocused]}>
      <View style={styles.searchContainer}>
        <TouchableOpacity 
          style={styles.inputWrapper}
          onPress={handleInputPress}
          activeOpacity={onPress ? 0.7 : 1}
          disabled={!onPress}
          hitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor="#999"
            value={text}
            onChangeText={setText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            editable={!onPress} // Si hay onPress, el TextInput no es editable (solo modal)
            pointerEvents={onPress ? 'none' : 'auto'} // Evita conflictos de touch
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={handlePress}
          activeOpacity={0.7}
          hitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <Ionicons name="search" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  search: {
    backgroundColor: 'white',
    height: 40,
    borderRadius: 10,
    marginHorizontal: 10,
    flex: 1,
    overflow: 'hidden',
  },
  searchFocused: {
    // Puedes agregar estilos para cuando esté enfocado
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  inputWrapper: {
    flex: 1,
    height: '100%',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    paddingLeft: 16,
    paddingRight: 8,
    backgroundColor: 'transparent',
    color: 'black',
  },
  searchButton: {
    backgroundColor: '#fa7e17',
    height: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
});

export default Search;
