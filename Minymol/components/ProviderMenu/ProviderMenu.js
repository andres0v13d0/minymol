import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ProviderMenu = () => {
  const [providers] = useState([
    { id: '1', name: 'Proveedor A', category: 'Alimentos' },
    { id: '2', name: 'Proveedor B', category: 'Bebidas' },
    { id: '3', name: 'Proveedor C', category: 'Productos de limpieza' },
    { id: '4', name: 'Proveedor D', category: 'Electrodomésticos' },
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menú de Proveedores</Text>
      {providers.map((provider) => (
        <TouchableOpacity key={provider.id} style={styles.providerItem}>
          <Text style={styles.providerName}>{provider.name}</Text>
          <Text style={styles.providerCategory}>{provider.category}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  providerItem: {
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  providerCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
});

export default ProviderMenu;
