import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AuthManager from '../../components/AuthManager';
import Header from '../../components/Header/Header';
import NavInf from '../../components/NavInf/NavInf';
import { getUbuntuFont } from '../../utils/fonts';

const Profile = ({ onTabPress, onNavigate }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const [subMenuSAIOpen, setSubMenuSAIOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animaciones
  const subMenuAnimation = useRef(new Animated.Value(0)).current;
  const subMenuSAIAnimation = useRef(new Animated.Value(0)).current;
  const welcomeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (usuario) {
      Animated.timing(welcomeAnimation, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [usuario]);

  // Animación para submenús
  const toggleSubMenu = () => {
    const toValue = subMenuOpen ? 0 : 1;
    setSubMenuOpen(!subMenuOpen);
    
    Animated.timing(subMenuAnimation, {
      toValue,
      duration: 300,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: false,
    }).start();
  };

  const toggleSubMenuSAI = () => {
    const toValue = subMenuSAIOpen ? 0 : 1;
    setSubMenuSAIOpen(!subMenuSAIOpen);
    
    Animated.timing(subMenuSAIAnimation, {
      toValue,
      duration: 300,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: false,
    }).start();
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('usuario');
      if (userData) {
        setUsuario(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setUsuario(null);
              // Aquí puedes agregar lógica adicional para redirigir al login
              console.log('Sesión cerrada');
            } catch (error) {
              console.error('Error cerrando sesión:', error);
            }
          },
        },
      ]
    );
  };

  const handleMenuPress = (action, params = {}) => {
    console.log('Acción:', action, 'Parámetros:', params);
    // Aquí puedes implementar la navegación según la acción
    if (onNavigate) {
      onNavigate(action, params);
    }
  };

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = async (userData, token) => {
    try {
      // Los datos ya fueron guardados en AsyncStorage por el LoginModal
      // Solo necesitamos actualizar el estado local
      setUsuario(userData);
      setShowLoginModal(false);

      console.log('Login exitoso:', userData.nombre || userData.proveedorInfo?.nombre_empresa);
    } catch (error) {
      console.error('Error manejando login exitoso:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const MenuButton = ({ 
    icon, 
    text, 
    onPress, 
    isSubitem = false, 
    hasSubmenu = false, 
    isOpen = false, 
    isLogout = false, 
    isHighlighted = false 
  }) => (
    <TouchableOpacity
      style={[
        styles.menuButton,
        isSubitem && styles.subMenuItem,
        isLogout && styles.logoutButton,
        isHighlighted && styles.highlightedButton
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        {isHighlighted && <View style={styles.highlightIndicator} />}
        <Ionicons
          name={icon}
          size={20}
          color={isLogout ? '#ff4444' : isHighlighted ? '#fa7e17' : '#666'}
          style={styles.iconLeft}
        />
        <Text style={[
          styles.buttonText,
          isLogout && styles.logoutText,
          isHighlighted && styles.highlightedText
        ]}>
          {text}
        </Text>
        <Ionicons
          name={hasSubmenu ? (isOpen ? 'chevron-down' : 'chevron-forward') : 'chevron-forward'}
          size={16}
          color={isHighlighted ? '#fa7e17' : '#ccc'}
          style={[styles.iconRight, hasSubmenu && isOpen && styles.iconRotated]}
        />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          minimal={false}
          searchBar={false}
          currentPage="profile"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa7e17" />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
        <NavInf selected="profile" onPress={onTabPress} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        minimal={false}
        searchBar={false}
        currentPage="profile"
        isHome={true}
        currentCategory=""
        onCategoryPress={(category) => console.log('Categoría seleccionada:', category)}
      />

      <ScrollView
        style={styles.profileContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#fa7e17']}
            tintColor="#fa7e17"
          />
        }
      >
        {usuario ? (
          <View style={styles.userContainer}>
            {/* Información del usuario con animación */}
            <Animated.View 
              style={[
                styles.userInfo,
                {
                  opacity: welcomeAnimation,
                  transform: [{
                    translateY: welcomeAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  }],
                },
              ]}
            >
              <View style={styles.welcomeContainer}>
                <View style={styles.welcomeIconContainer}>
                  <Ionicons name="sparkles" size={24} color="#fa7e17" />
                </View>
                <View style={styles.welcomeTextContainer}>
                  <Text style={styles.welcomeText}>¡Hola de nuevo!</Text>
                  <Text style={styles.userName}>
                    {usuario.rol === 'proveedor'
                      ? usuario.proveedorInfo?.nombre_empresa
                      : usuario.nombre?.split(' ')[0]?.slice(0, 15) || 'Usuario'
                    }
                  </Text>
                </View>
                <View style={styles.userTypeIndicator}>
                  <Text style={styles.userTypeText}>
                    {usuario.rol === 'proveedor' ? 'Proveedor' : 
                     usuario.rol === 'admin' ? 'Admin' : 'Comerciante'}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Sección de acciones principales */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Acciones principales</Text>
            </View>
            
            <View style={styles.highlightedMenuContainer}>
              {/* Panel de administrador / Mi catálogo (solo para admin y proveedores) */}
              {usuario.rol !== 'comerciante' && (
                <MenuButton
                  icon={usuario.rol === 'admin' ? 'clipboard-outline' : 'shirt-outline'}
                  text={usuario.rol === 'admin' ? 'Panel de administrador' : 'Mi catálogo'}
                  isHighlighted={usuario.rol !== 'admin'}
                  onPress={() => handleMenuPress(usuario.rol === 'admin' ? 'admin' : 'catalog', {
                    id: usuario.proveedorInfo?.id
                  })}
                />
              )}

              {/* Abonos inteligentes (solo para comerciantes) */}
              {usuario.rol === 'comerciante' && (
                <>
                  <MenuButton
                    icon="trending-up-outline"
                    text="Abonos inteligentes"
                    hasSubmenu={true}
                    isOpen={subMenuOpen}
                    isHighlighted={true}
                    onPress={toggleSubMenu}
                  />

                  {/* Submenú animado para comerciantes */}
                  <Animated.View
                    style={[
                      styles.submenu,
                      {
                        maxHeight: subMenuAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 300],
                        }),
                        opacity: subMenuAnimation,
                        transform: [{
                          scaleY: subMenuAnimation,
                        }],
                      },
                    ]}
                  >
                    <MenuButton
                      icon="people-outline"
                      text="Proveedores"
                      isSubitem={true}
                      onPress={() => handleMenuPress('proveedores')}
                    />

                    <MenuButton
                      icon="document-text-outline"
                      text="Informes"
                      isSubitem={true}
                      onPress={() => handleMenuPress('informes')}
                    />

                    <MenuButton
                      icon="construct-outline"
                      text="Sistema SAI"
                      hasSubmenu={true}
                      isOpen={subMenuSAIOpen}
                      isSubitem={true}
                      onPress={toggleSubMenuSAI}
                    />

                    <Animated.View
                      style={[
                        styles.subSubmenu,
                        {
                          maxHeight: subMenuSAIAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 120],
                          }),
                          opacity: subMenuSAIAnimation,
                        },
                      ]}
                    >
                      <MenuButton
                        icon="settings-outline"
                        text="Usar estrategia"
                        isSubitem={true}
                        onPress={() => handleMenuPress('sai')}
                      />
                      <MenuButton
                        icon="help-circle-outline"
                        text="Ayuda"
                        isSubitem={true}
                        onPress={() => handleMenuPress('sai-help')}
                      />
                    </Animated.View>

                    <MenuButton
                      icon="car-outline"
                      text="Registrar movimiento"
                      isSubitem={true}
                      onPress={() => handleMenuPress('movimientos')}
                    />
                  </Animated.View>
                </>
              )}
            </View>

            {/* Sección de opciones adicionales */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mis opciones</Text>
            </View>
            
            <View style={styles.menuContainer}>
              {/* Mi inventario (solo para proveedores) */}
              {usuario.rol === 'proveedor' && (
                <>
                  <MenuButton
                    icon="cube-outline"
                    text="Mi inventario"
                    hasSubmenu={true}
                    isOpen={subMenuOpen}
                    onPress={toggleSubMenu}
                  />

                  {/* Submenú animado para proveedores */}
                  <Animated.View
                    style={[
                      styles.submenu,
                      {
                        maxHeight: subMenuAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 200],
                        }),
                        opacity: subMenuAnimation,
                        transform: [{
                          scaleY: subMenuAnimation,
                        }],
                      },
                    ]}
                  >
                    <MenuButton
                      icon="archive-outline"
                      text="Mis productos"
                      isSubitem={true}
                      onPress={() => handleMenuPress('productos')}
                    />

                    <MenuButton
                      icon="create-outline"
                      text="Editar inventario"
                      isSubitem={true}
                      onPress={() => handleMenuPress('editar-inventario')}
                    />

                    <MenuButton
                      icon="eye-outline"
                      text="Ver inventario"
                      isSubitem={true}
                      onPress={() => handleMenuPress('ver-inventario')}
                    />
                  </Animated.View>
                </>
              )}

              {/* Mis pedidos (solo comerciantes) */}
              {usuario.rol === 'comerciante' && (
                <MenuButton
                  icon="basket-outline"
                  text="Mis pedidos"
                  onPress={() => handleMenuPress('mis-pedidos')}
                />
              )}

              {/* Favoritos / Mis pedidos (proveedor) */}
              <MenuButton
                icon={usuario.rol === 'proveedor' ? 'clipboard-outline' : 'star-outline'}
                text={usuario.rol === 'proveedor' ? 'Mis pedidos' : 'Favoritos'}
                onPress={() => handleMenuPress(usuario.rol === 'proveedor' ? 'mis-pedidos' : 'favoritos')}
              />

              {/* Opciones específicas de proveedor */}
              {usuario.rol === 'proveedor' && (
                <>
                  <MenuButton
                    icon="people-outline"
                    text="Mis clientes"
                    onPress={() => handleMenuPress('mis-clientes')}
                  />
                  <MenuButton
                    icon="storefront-outline"
                    text="Mi tienda"
                    onPress={() => handleMenuPress('mi-tienda')}
                  />
                </>
              )}

              {/* Configuración */}
              <MenuButton
                icon="settings-outline"
                text="Configuración"
                onPress={() => handleMenuPress('configuracion')}
              />

              {/* Atención al cliente */}
              <MenuButton
                icon="headset-outline"
                text="Atención al cliente"
                onPress={() => handleMenuPress('servicio')}
              />

              {/* Dashboard de partners */}
              {usuario.isPartner && (
                <MenuButton
                  icon="analytics-outline"
                  text="Mi Dashboard"
                  onPress={() => handleMenuPress('dashboard')}
                />
              )}

              {/* Cerrar sesión */}
              <MenuButton
                icon="log-out-outline"
                text="Cerrar sesión"
                isLogout={true}
                onPress={handleLogout}
              />
            </View>
          </View>
        ) : (
          <View style={styles.noUserContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-circle-outline" size={100} color="#fa7e17" style={styles.noUserIcon} />
            </View>

            <Text style={styles.noUserTitle}>Inicia sesión</Text>
            <Text style={styles.noUserText}>
              Accede a tu cuenta para ver tus pedidos y favoritos
            </Text>

            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <Ionicons name="heart-outline" size={22} color="#fa7e17" />
                <Text style={styles.benefitText}>Guarda tus favoritos</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="receipt-outline" size={22} color="#fa7e17" />
                <Text style={styles.benefitText}>Historial de pedidos</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Iniciar sesión / Registrarse</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Auth Manager - Maneja Login y Register */}
      <AuthManager
        showLogin={showLoginModal}
        showRegister={false}
        onClose={() => setShowLoginModal(false)}
        onAuthSuccess={handleLoginSuccess}
      />

      <NavInf selected="profile" onPress={onTabPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    color: '#333',
    marginTop: 10,
    fontSize: 16,
    fontFamily: getUbuntuFont('regular'),
  },
  profileContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  userContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // Espacio adicional para evitar que se recorte con la navegación inferior
    backgroundColor: 'white',
    minHeight: 'auto',
  },
  userInfo: {
    backgroundColor: '#fff',
    padding: 0,
    borderRadius: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  welcomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    background: 'linear-gradient(135deg, #fa7e17 0%, #ff9940 100%)',
    backgroundColor: '#fa7e17',
    position: 'relative',
  },
  welcomeIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 12,
    marginRight: 16,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: getUbuntuFont('regular'),
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    color: '#fff',
    fontFamily: getUbuntuFont('bold'),
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userTypeIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userTypeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: getUbuntuFont('medium'),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: getUbuntuFont('bold'),
    color: '#333',
    paddingHorizontal: 4,
  },
  highlightedMenuContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(250, 126, 23, 0.15)',
    marginBottom: 30,
    // Sutil resplandor para destacar
    backgroundColor: '#fffef9',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    marginBottom: 20,
  },
  menuButton: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  subMenuItem: {
    backgroundColor: '#f8f8f8',
    paddingLeft: 40,
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  highlightedButton: {
    backgroundColor: '#fff8f4',
    borderLeftWidth: 4,
    borderLeftColor: '#fa7e17',
    position: 'relative',
    // Asegurar que el borde izquierdo sea visible en ambas plataformas
    ...Platform.select({
      ios: {
        borderLeftWidth: 4,
        borderLeftColor: '#fa7e17',
      },
      android: {
        borderLeftWidth: 4,
        borderLeftColor: '#fa7e17',
      },
    }),
  },
  highlightIndicator: {
    position: 'absolute',
    left: -1, // Ajuste para mejor alineación
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#fa7e17',
    // Asegurar visibilidad en ambas plataformas
    zIndex: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 56,
  },
  iconLeft: {
    marginRight: 15,
    width: 24,
    alignItems: 'center',
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontFamily: getUbuntuFont('medium'),
  },
  highlightedText: {
    color: '#fa7e17',
    fontFamily: getUbuntuFont('bold'),
  },
  logoutText: {
    color: '#ff4444',
  },
  iconRight: {
    marginLeft: 10,
    transform: [{ rotate: '0deg' }],
  },
  iconRotated: {
    transform: [{ rotate: '90deg' }],
  },
  submenu: {
    backgroundColor: '#f8f8f8',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: '#efefef',
  },
  subSubmenu: {
    backgroundColor: '#f0f0f0',
    paddingLeft: 20,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  noUserContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
  },
  iconContainer: {
    backgroundColor: '#fff8f5',
    borderRadius: 60,
    padding: 20,
    marginBottom: 30,
  },
  noUserIcon: {
    marginBottom: 0,
  },
  noUserTitle: {
    fontSize: 28,
    fontFamily: getUbuntuFont('bold'),
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  noUserText: {
    fontSize: 17,
    fontFamily: getUbuntuFont('regular'),
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 50,
    paddingHorizontal: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff8f5',
    borderRadius: 12,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 16,
    fontFamily: getUbuntuFont('medium'),
    color: '#333',
    marginLeft: 15,
  },
  loginButton: {
    backgroundColor: '#fa7e17',
    paddingVertical: 18,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 17,
    fontFamily: getUbuntuFont('bold'),
  },
});

export default Profile;
