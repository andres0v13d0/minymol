import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import AuthManager from '../../components/AuthManager';
import MyOrdersModal from '../../components/MyOrdersModal';
import NavInf from '../../components/NavInf/NavInf';
import ProvidersModal from '../../components/ProvidersModal';
import SAIHelpModal from '../../components/SAIHelpModal';
import SAIModal from '../../components/SAIModal';
import { getUbuntuFont } from '../../utils/fonts';

const Profile = ({ onTabPress, onNavigate }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const [subMenuSAIOpen, setSubMenuSAIOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState('login'); // 'login' o 'register'
  const [refreshing, setRefreshing] = useState(false);
  const [showProvidersModal, setShowProvidersModal] = useState(false);
  const [showSAIModal, setShowSAIModal] = useState(false);
  const [showSAIHelpModal, setShowSAIHelpModal] = useState(false);
  const [showMyOrdersModal, setShowMyOrdersModal] = useState(false);

  // Animaciones
  const subMenuAnimation = useRef(new Animated.Value(0)).current;
  const subMenuSAIAnimation = useRef(new Animated.Value(0)).current;

  // Animar submenú principal
  useEffect(() => {
    Animated.timing(subMenuAnimation, {
      toValue: subMenuOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [subMenuOpen]);

  // Animar submenú SAI
  useEffect(() => {
    Animated.timing(subMenuSAIAnimation, {
      toValue: subMenuSAIOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [subMenuSAIOpen]);

  useEffect(() => {
    loadUserData();
  }, []);

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
    
    // Manejar la acción de proveedores
    if (action === 'proveedores') {
      setShowProvidersModal(true);
      return;
    }
    
    // Manejar la acción de SAI
    if (action === 'sai') {
      setShowSAIModal(true);
      return;
    }
    
    // Manejar la acción de ayuda SAI
    if (action === 'sai-help') {
      setShowSAIHelpModal(true);
      return;
    }
    
    // Manejar la acción de mis pedidos
    if (action === 'mis-pedidos') {
      setShowMyOrdersModal(true);
      return;
    }
    
    // Aquí puedes implementar la navegación según la acción
    if (onNavigate) {
      onNavigate(action, params);
    }
  };

  const handleLogin = () => {
    setAuthType('login');
    setShowAuthModal(true);
  };

  const handleAuthSuccess = async (userData, token) => {
    try {
      // Los datos ya fueron guardados en AsyncStorage
      // Solo necesitamos actualizar el estado local
      setUsuario(userData);
      setShowAuthModal(false);

      console.log('Autenticación exitosa:', userData.nombre || userData.proveedorInfo?.nombre_empresa);
    } catch (error) {
      console.error('Error manejando autenticación exitosa:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const MenuButton = ({ icon, text, onPress, isSubitem = false, hasSubmenu = false, isOpen = false, isLogout = false, isSpecial = false }) => (
    <TouchableOpacity
      style={[
        styles.menuButton,
        isSubitem && styles.subMenuItem,
        isLogout && styles.logoutButton,
        isSpecial && styles.specialButton
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        <View style={[
          styles.iconContainer,
          isLogout && styles.logoutIconContainer,
          isSpecial && styles.specialIconContainer
        ]}>
          <Ionicons
            name={icon}
            size={22}
            color={isLogout ? '#ff4757' : isSpecial ? '#fa7e17' : '#4a5568'}
          />
        </View>
        <Text style={[
          styles.buttonText,
          isLogout && styles.logoutText,
          isSpecial && styles.specialText
        ]}>
          {text}
        </Text>
        <View style={styles.chevronContainer}>
          {hasSubmenu && (
            <Ionicons
              name={isOpen ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color="#9ca3af"
            />
          )}
          {!hasSubmenu && !isSubitem && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color="#d1d5db"
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa7e17" />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
        <NavInf selectedTab="profile" onTabPress={onTabPress} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            {/* Información del usuario con gradiente y marca de agua */}
            <LinearGradient
              colors={['#fa7e17', '#ff9a3d']}
              style={styles.userHeaderGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Imagen de marca de agua en la esquina inferior derecha */}
              <Image
                source={require('../../assets/fondo_perfil.png')}
                style={styles.watermarkImage}
                resizeMode="contain"
              />
              
              <View style={styles.userHeaderContent}>
                <View style={styles.userInfoRow}>
                  <View style={styles.userIconCircle}>
                    <Ionicons 
                      name={
                        usuario.rol === 'proveedor' ? 'business' : 
                        usuario.rol === 'admin' ? 'shield-checkmark' : 
                        'person'
                      } 
                      size={32} 
                      color="#fff" 
                    />
                  </View>
                  
                  <View style={styles.userTextInfo}>
                    <Text style={styles.welcomeText}>¡Hola!</Text>
                    <Text style={styles.userName}>
                      {usuario.rol === 'proveedor'
                        ? usuario.proveedorInfo?.nombre_empresa
                        : usuario.nombre?.split(' ')[0]?.slice(0, 15) || 'Usuario'
                      }
                    </Text>
                    <View style={styles.userBadgeContainer}>
                      <View style={styles.roleBadge}>
                        <Ionicons 
                          name={
                            usuario.rol === 'proveedor' ? 'briefcase' : 
                            usuario.rol === 'admin' ? 'shield' : 
                            'storefront'
                          } 
                          size={12} 
                          color="#fff" 
                          style={styles.badgeIcon}
                        />
                        <Text style={styles.roleBadgeText}>
                          {usuario.rol === 'proveedor' ? 'Proveedor' : 
                           usuario.rol === 'admin' ? 'Administrador' : 'Comerciante'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Panel de administrador / Mi catálogo - Contenedor separado */}
            {usuario.rol !== 'comerciante' && (
              <View style={styles.specialContainer}>
                <MenuButton
                  icon={usuario.rol === 'admin' ? 'clipboard-outline' : 'shirt-outline'}
                  text={usuario.rol === 'admin' ? 'Panel de administrador' : 'Mi catálogo'}
                  isSpecial={true}
                  onPress={() => handleMenuPress(usuario.rol === 'admin' ? 'admin' : 'catalog', {
                    id: usuario.proveedorInfo?.id
                  })}
                />
              </View>
            )}

            {/* Abonos inteligentes - Contenedor separado solo para comerciantes */}
            {usuario.rol === 'comerciante' && (
              <View style={styles.specialContainer}>
                <MenuButton
                  icon="trending-up-outline"
                  text="Abonos inteligentes"
                  hasSubmenu={true}
                  isOpen={subMenuOpen}
                  isSpecial={true}
                  onPress={() => setSubMenuOpen(!subMenuOpen)}
                />

                {/* Submenú */}
                <Animated.View
                  style={[
                    styles.submenu,
                    {
                      maxHeight: subMenuAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 500],
                      }),
                      opacity: subMenuAnimation,
                      overflow: 'hidden',
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

                    <>
                      <MenuButton
                        icon="construct-outline"
                        text="Sistema SAI"
                        hasSubmenu={true}
                        isOpen={subMenuSAIOpen}
                        isSubitem={true}
                        onPress={() => setSubMenuSAIOpen(!subMenuSAIOpen)}
                      />

                      <Animated.View
                        style={[
                          styles.subSubmenu,
                          {
                            maxHeight: subMenuSAIAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 200],
                            }),
                            opacity: subMenuSAIAnimation,
                            overflow: 'hidden',
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
                    </>

                    <MenuButton
                      icon="car-outline"
                      text="Registrar movimiento"
                      isSubitem={true}
                      onPress={() => handleMenuPress('movimientos')}
                    />
                </Animated.View>
              </View>
            )}

            {/* Botones del menú principal */}
            <View style={styles.menuContainer}>
              {/* Mi inventario (solo proveedores) */}
              {usuario.rol === 'proveedor' && (
                <>
                  <MenuButton
                    icon="cube-outline"
                    text="Mi inventario"
                    hasSubmenu={true}
                    isOpen={subMenuOpen}
                    onPress={() => setSubMenuOpen(!subMenuOpen)}
                  />

                  {/* Submenú de Mi inventario */}
                  <Animated.View
                    style={[
                      styles.submenu,
                      {
                        maxHeight: subMenuAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 500],
                        }),
                        opacity: subMenuAnimation,
                        overflow: 'hidden',
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

              {/* Mis pedidos */}
              <MenuButton
                icon={usuario.rol === 'comerciante' ? 'basket-outline' : 'clipboard-outline'}
                text="Mis pedidos"
                onPress={() => handleMenuPress('mis-pedidos')}
              />

              {/* Favoritos (solo comerciantes) */}
              {usuario.rol === 'comerciante' && (
                <MenuButton
                  icon="star-outline"
                  text="Favoritos"
                  onPress={() => handleMenuPress('favoritos')}
                />
              )}

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
            </View>

            {/* Botón de cerrar sesión separado */}
            <View style={styles.logoutContainer}>
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
            <View style={styles.noUserBackground}>
              <View style={styles.noUserContent}>
                <View style={styles.noUserIconContainer}>
                  <LinearGradient
                    colors={['#fa7e17', '#ff9a3d']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="person" size={50} color="#fff" />
                  </LinearGradient>
                </View>

                <Text style={styles.noUserTitle}>¡Únete a Minymol!</Text>
                <Text style={styles.noUserText}>
                  Accede a tu cuenta para disfrutar de todas las funcionalidades
                </Text>

                <View style={styles.benefitsContainer}>
                  <View style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <Ionicons name="heart" size={20} color="#fa7e17" />
                    </View>
                    <Text style={styles.benefitText}>Guarda tus favoritos</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <Ionicons name="receipt" size={20} color="#fa7e17" />
                    </View>
                    <Text style={styles.benefitText}>Historial de pedidos</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <Ionicons name="notifications" size={20} color="#fa7e17" />
                    </View>
                    <Text style={styles.benefitText}>Notificaciones personalizadas</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                  <LinearGradient
                    colors={['#fa7e17', '#ff9a3d']}
                    style={styles.loginButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.loginButtonText}>Iniciar sesión / Registrarse</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Auth Modal */}
      <AuthManager
        showLogin={showAuthModal && authType === 'login'}
        showRegister={showAuthModal && authType === 'register'}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Providers Modal */}
      <ProvidersModal
        visible={showProvidersModal}
        onClose={() => setShowProvidersModal(false)}
      />

      {/* SAI Modal */}
      <SAIModal
        visible={showSAIModal}
        onClose={() => setShowSAIModal(false)}
      />

      {/* SAI Help Modal */}
      <SAIHelpModal
        visible={showSAIHelpModal}
        onClose={() => setShowSAIHelpModal(false)}
      />

      {/* My Orders Modal */}
      <MyOrdersModal
        visible={showMyOrdersModal}
        onClose={() => setShowMyOrdersModal(false)}
      />

      <NavInf selectedTab="profile" onTabPress={onTabPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingBottom: 75,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 16,
    fontSize: 16,
    fontFamily: getUbuntuFont('regular'),
  },
  profileContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  userContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Header del usuario con gradiente
  userHeaderGradient: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    elevation: 4,
    shadowColor: '#fa7e17',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  watermarkImage: {
    position: 'absolute',
    width: 200, // Ajusta aquí el tamaño horizontal (X)
    height: 200, // Ajusta aquí el tamaño vertical (Y)
    bottom: -70, // Mueve aquí en Y (valores negativos bajan la imagen)
    right: 10, // Mueve aquí en X (valores negativos mueven a la derecha)
    opacity: 0.3, // Transparencia de la marca de agua (0.0 - 1.0)
    transform: [{ rotate: '0deg' }], // Puedes rotar la imagen si lo deseas
  },
  userHeaderContent: {
    padding: 24,
    minHeight: 140,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  userTextInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: getUbuntuFont('regular'),
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 24,
    color: '#ffffff',
    fontFamily: getUbuntuFont('bold'),
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  userBadgeContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeIcon: {
    marginRight: 2,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: getUbuntuFont('bold'),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Container del menú
  menuContainer: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Container especial para botones destacados (Mi catálogo, Abonos inteligentes)
  specialContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  
  // Botones del menú
  menuButton: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subMenuItem: {
    backgroundColor: '#ffffff',
    paddingLeft: 16,
    borderBottomColor: '#e2e8f0',
  },
  specialButton: {
    backgroundColor: '#fff7f0',
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderBottomWidth: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  specialIconContainer: {
    backgroundColor: '#fff7f0',
  },
  logoutIconContainer: {
    backgroundColor: '#fef2f2',
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontFamily: getUbuntuFont('medium'),
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  specialText: {
    color: '#ea580c',
  },
  logoutText: {
    color: '#dc2626',
  },
  chevronContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Submenús
  submenu: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  subSubmenu: {
    backgroundColor: '#ffffff',
    paddingLeft: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  
  // Separadores
  separator: {
    height: 8,
    backgroundColor: '#f1f5f9',
  },
  
  // Container del botón de logout
  logoutContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Estado sin usuario
  noUserContainer: {
    flex: 1,
  },
  noUserBackground: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  noUserContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noUserIconContainer: {
    marginBottom: 32,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noUserTitle: {
    fontSize: 28,
    fontFamily: getUbuntuFont('bold'),
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  noUserText: {
    fontSize: 16,
    fontFamily: getUbuntuFont('regular'),
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  
  // Beneficios
  benefitsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitText: {
    fontSize: 16,
    fontFamily: getUbuntuFont('medium'),
    color: '#374151',
    flex: 1,
  },
  
  // Botones de login
  loginButton: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: getUbuntuFont('bold'),
    marginRight: 8,
  },
});

export default Profile;
