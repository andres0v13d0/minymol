import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CartIcon from '../Cart/Cart';

const NavInf = ({ selectedTab, onTabPress, isProductInfo = false }) => {
  // Si estamos en ProductInfo, no mostrar ningún tab como seleccionado
  const activeTab = isProductInfo ? null : selectedTab;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => onTabPress && onTabPress('home')}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name="home" 
            size={20} 
            color={activeTab === 'home' ? '#fa7e17' : 'white'} 
          />
        </View>
        <Text style={[styles.navText, activeTab === 'home' && styles.selectedText]}>
          Inicio
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => onTabPress && onTabPress('categories')}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name="list" 
            size={20} 
            color={activeTab === 'categories' ? '#fa7e17' : 'white'} 
          />
        </View>
        <Text style={[styles.navText, activeTab === 'categories' && styles.selectedText]}>
          Categorías
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => onTabPress && onTabPress('profile')}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name="person" 
            size={20} 
            color={activeTab === 'profile' ? '#fa7e17' : 'white'} 
          />
        </View>
        <Text style={[styles.navText, activeTab === 'profile' && styles.selectedText]}>
          Perfil
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => onTabPress && onTabPress('cart')}
      >
        <View style={styles.iconContainer}>
          <CartIcon isSelected={activeTab === 'cart'} />
        </View>
        <Text style={[styles.navText, activeTab === 'cart' && styles.selectedText]}>
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

// ✅ OPTIMIZADO: React.memo para evitar re-renders innecesarios
export default React.memo(NavInf);
