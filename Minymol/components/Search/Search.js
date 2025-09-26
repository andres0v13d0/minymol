import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Search = ({ onSearch }) => {
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

  return (
    <View style={[styles.search, isFocused && styles.searchFocused]}>
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
      />
      <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
        <Ionicons name="search" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  search: {
    backgroundColor: 'white',
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    flex: 1,
    overflow: 'hidden',
  },
  searchFocused: {
    // Puedes agregar estilos para cuando esté enfocado
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
