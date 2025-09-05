import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Cart from '../Cart/Cart';

const NavInf = ({ selected, onPress }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => onPress && onPress('home')}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name="home" 
            size={20} 
            color={selected === 'home' ? '#fa7e17' : 'white'} 
          />
        </View>
        <Text style={[styles.navText, selected === 'home' && styles.selectedText]}>
          Inicio
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => onPress && onPress('categories')}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name="list" 
            size={20} 
            color={selected === 'categories' ? '#fa7e17' : 'white'} 
          />
        </View>
        <Text style={[styles.navText, selected === 'categories' && styles.selectedText]}>
          Categorías
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => onPress && onPress('profile')}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name="person" 
            size={20} 
            color={selected === 'profile' ? '#fa7e17' : 'white'} 
          />
        </View>
        <Text style={[styles.navText, selected === 'profile' && styles.selectedText]}>
          Perfil
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => onPress && onPress('cart')}
      >
        <View style={styles.iconContainer}>
          <Cart />
        </View>
        <Text style={[styles.navText, selected === 'cart' && styles.selectedText]}>
          Carrito
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#14144b',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  iconContainer: {
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
    color: 'white',
    fontFamily: 'System',
    textAlign: 'center',
  },
  selectedText: {
    color: '#fa7e17',
  },
});

export default NavInf;
