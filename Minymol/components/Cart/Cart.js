import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const CartIcon = ({ isSelected = false, itemCount = 0 }) => {
  const [count, setCount] = useState(itemCount);
  const [previousCount, setPreviousCount] = useState(-1);
  
  // Animaciones
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Color del ícono basado en si está seleccionado
  const iconColor = isSelected ? '#fa7e17' : 'white';

  useEffect(() => {
    // Solo animar si hay un cambio real en la cantidad y no es la primera carga
    if (itemCount !== count) {
      // Si se añadió un producto (cantidad aumentó), animar
      if (itemCount > previousCount && previousCount >= 0) {
        animateAddToCart();
      }
      
      setCount(itemCount);
      setPreviousCount(itemCount);
    }
  }, [itemCount, count, previousCount]);

  const animateAddToCart = () => {
    // Secuencia de animaciones cuando se añade un producto
    Animated.sequence([
      // Primero un bounce del ícono
      Animated.timing(bounceAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      // Luego un pulse del badge
      Animated.timing(pulseAnim, {
        toValue: 1.4,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de escala del badge
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      {count > 0 && (
        <Animated.View 
          style={[
            styles.badge,
            {
              transform: [
                { scale: scaleAnim },
                { scale: pulseAnim }
              ]
            }
          ]}
        >
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </Animated.View>
      )}
      <Animated.View
        style={{
          transform: [{ scale: bounceAnim }]
        }}
      >
        <Ionicons name="cart" size={20} color={iconColor} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fa7e17',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#14144b',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});

// Exportar el componente base sin contexto
export { CartIcon };

// Exportar por defecto el componente base (sin contexto)
// El NavInf debe recibir itemCount como prop desde el componente padre que tiene acceso al contexto
export default CartIcon;
