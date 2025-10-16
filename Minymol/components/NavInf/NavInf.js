import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CartIcon from '../Cart/Cart';

const NavInf = ({ selectedTab, onTabPress, isProductInfo = false, cartItemCount = 0 }) => {
  // Si estamos en ProductInfo, no mostrar ningún tab como seleccionado
  const activeTab = isProductInfo ? null : selectedTab;
  
  // ✅ Animación para el contador del carrito
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(cartItemCount);
  
  // ✅ Efecto de bounce cuando cambia el contador
  useEffect(() => {
    if (cartItemCount !== prevCount.current) {
      console.log('🎯 Contador cambió de', prevCount.current, 'a', cartItemCount);
      
      // Secuencia de animación: crecer y volver
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          useNativeDriver: true,
          friction: 3,
          tension: 100,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
          tension: 100,
        }),
      ]).start();
      
      prevCount.current = cartItemCount;
    }
  }, [cartItemCount, scaleAnim]);
  
  // 🔍 DEBUG: Medir tiempo de respuesta del click
  const handleTabPress = (tab) => {
    const clickTime = performance.now();
    console.log('🖱️  ========================================');
    console.log('🖱️  NAVINF CLICK en tab:', tab);
    console.log('🖱️  Click timestamp:', clickTime.toFixed(2), 'ms');
    
    if (onTabPress) {
      onTabPress(tab);
      
      // Medir cuánto tarda en ejecutarse el callback
      requestAnimationFrame(() => {
        const callbackTime = performance.now();
        console.log('🖱️  Callback ejecutado en:', (callbackTime - clickTime).toFixed(2), 'ms');
      });
    }
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleTabPress('home')}
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
        onPress={() => handleTabPress('categories')}
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
        onPress={() => handleTabPress('profile')}
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
        onPress={() => handleTabPress('cart')}
      >
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
          <CartIcon isSelected={activeTab === 'cart'} itemCount={cartItemCount} />
        </Animated.View>
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

// ✅ MEGA OPTIMIZADO: React.memo con comparación personalizada
// NavInf solo debe re-renderizar cuando cambia selectedTab o cartItemCount
const NavInfOptimized = React.memo(NavInf, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian estas props clave
  const shouldNotUpdate = 
    prevProps.selectedTab === nextProps.selectedTab &&
    prevProps.isProductInfo === nextProps.isProductInfo &&
    prevProps.cartItemCount === nextProps.cartItemCount;
    
  // Log para debug
  if (!shouldNotUpdate) {
    console.log('🔄 NavInf RE-RENDER:', {
      tabChanged: prevProps.selectedTab !== nextProps.selectedTab,
      countChanged: prevProps.cartItemCount !== nextProps.cartItemCount,
      prevCount: prevProps.cartItemCount,
      nextCount: nextProps.cartItemCount,
    });
  }
  
  return shouldNotUpdate;
});

export default NavInfOptimized;
