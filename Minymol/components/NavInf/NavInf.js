import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CartIcon from '../Cart/Cart';
import { useChatCounter } from '../../contexts/ChatCounterContext';

const NavInf = ({ selectedTab, onTabPress, isProductInfo = false, cartItemCount = 0 }) => {
  // ✅ Contador de mensajes no leídos
  const { count: unreadCount } = useChatCounter();
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
  
  // ⚡ ULTRA OPTIMIZADO: Click handler instantáneo
  const handleTabPress = (tab) => {
    const clickTime = performance.now();
    console.log('⚡ CLICK INSTANTÁNEO:', tab, '@', clickTime.toFixed(2), 'ms');
    
    // Ejecutar callback INMEDIATAMENTE sin esperar
    if (onTabPress) {
      onTabPress(tab);
    }
    
    // Medir solo para debug (no bloquea)
    requestAnimationFrame(() => {
      const endTime = performance.now();
      console.log('⚡ Callback completado en:', (endTime - clickTime).toFixed(2), 'ms');
    });
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
        onPress={() => handleTabPress('messages')}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name="chatbubbles" 
            size={20} 
            color={activeTab === 'messages' ? '#fa7e17' : 'white'} 
          />
          {/* Badge de mensajes no leídos */}
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.navText, activeTab === 'messages' && styles.selectedText]}>
          Mensajes
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
  // Badge de mensajes no leídos
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fa7e17',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#14144b',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
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
