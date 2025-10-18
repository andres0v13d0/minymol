/**
 * 🛒 FloatingCartButton - Botón flotante del carrito ultrarrápido
 * 
 * Características:
 * - ⚡ Actualización instantánea usando CartCounterContext
 * - 🎨 Diseño moderno con animaciones fluidas
 * - 🎯 Badge con contador visible
 * - 📱 Responsivo y adaptable
 * - 🚀 Performance optimizado con React.memo
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCartCounter } from '../../contexts/CartCounterContext';

const FloatingCartButton = ({ onPress, bottom = 80, right = 20 }) => {
  // 🚀 Hook ultrarrápido para el contador
  const { count } = useCartCounter();
  
  // Animaciones
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const badgeScaleAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(count);

  // ✨ Animación de bounce cuando cambia el contador
  useEffect(() => {
    if (count !== prevCount.current && count > 0) {
      // Animación del botón completo
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
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

      // Animación del badge
      Animated.sequence([
        Animated.spring(badgeScaleAnim, {
          toValue: 1.4,
          useNativeDriver: true,
          friction: 2,
          tension: 120,
        }),
        Animated.spring(badgeScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
          tension: 100,
        }),
      ]).start();

      prevCount.current = count;
    }
  }, [count, scaleAnim, badgeScaleAnim]);

  // 🌊 Animación de pulso continuo cuando hay items
  useEffect(() => {
    if (count > 0) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [count, pulseAnim]);

  // No mostrar si no hay items
  if (count === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom,
          right,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {/* Efecto de pulso de fondo */}
        <Animated.View
          style={[
            styles.pulseBackground,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        {/* Gradiente simulado con sombras */}
        <View style={styles.buttonContent}>
          {/* Icono del carrito */}
          <MaterialIcons name="shopping-cart" size={28} color="#fff" />

          {/* Badge con contador */}
          <Animated.View
            style={[
              styles.badge,
              {
                transform: [{ scale: badgeScaleAnim }],
              },
            ]}
          >
            <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
          </Animated.View>

          {/* Indicador de items */}
          <View style={styles.itemsIndicator}>
            <Text style={styles.itemsText}>
              {count === 1 ? '1 item' : `${count} items`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#fa7e17',
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    position: 'relative',
  },
  pulseBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250, 126, 23, 0.2)',
    borderRadius: 35,
  },
  buttonContent: {
    flex: 1,
    backgroundColor: '#fa7e17',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    paddingHorizontal: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  itemsIndicator: {
    position: 'absolute',
    bottom: -22,
    backgroundColor: 'rgba(20, 20, 75, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fa7e17',
    minWidth: 70,
    alignItems: 'center',
  },
  itemsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

// ✅ Optimización con React.memo
// Solo re-renderiza cuando cambia onPress o el count cambia
export default React.memo(FloatingCartButton, (prevProps, nextProps) => {
  return prevProps.onPress === nextProps.onPress &&
         prevProps.bottom === nextProps.bottom &&
         prevProps.right === nextProps.right;
});
