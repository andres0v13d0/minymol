import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import SearchModal from '../SearchModal';

const Search = ({ onProductPress }) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity style={[styles.search, isFocused && styles.searchFocused]} onPress={handleOpenModal}>
        <View style={styles.searchContent}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor="#999"
            value={text}
            editable={false}
            pointerEvents="none"
          />
          <View style={styles.searchButton}>
            <Ionicons name="search" size={20} color="white" />
          </View>
        </View>
      </TouchableOpacity>

      <SearchModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onProductPress={onProductPress}
        initialText={text}
      />
    </>
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
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
