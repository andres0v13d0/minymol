import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Header from '../../components/Header/Header';
import LoginModal from '../../components/LoginModal';
import NavInf from '../../components/NavInf/NavInf';
import { getUbuntuFont } from '../../utils/fonts';

const Profile = ({ onTabPress, onNavigate }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const [subMenuSAIOpen, setSubMenuSAIOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const MenuButton = ({ icon, text, onPress, isSubitem = false, hasSubmenu = false, isOpen = false, isLogout = false }) => (
    <TouchableOpacity
      style={[
        styles.menuButton,
        isSubitem && styles.subMenuItem,
        isLogout && styles.logoutButton
      ]}
      onPress={onPress}
    >
      <View style={styles.buttonContent}>
        <Ionicons
          name={icon}
          size={20}
          color={isLogout ? '#ff4444' : '#666'}
          style={styles.iconLeft}
        />
        <Text style={[
          styles.buttonText,
          isLogout && styles.logoutText
        ]}>
          {text}
        </Text>
        <Ionicons
          name={hasSubmenu ? (isOpen ? 'chevron-down' : 'chevron-forward') : 'chevron-forward'}
          size={16}
          color="#ccc"
          style={styles.iconRight}
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
            {/* Información del usuario */}
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Bienvenido,</Text>
              <Text style={styles.userName}>
                {usuario.rol === 'proveedor'
                  ? usuario.proveedorInfo?.nombre_empresa
                  : usuario.nombre?.split(' ')[0]?.slice(0, 15) || 'Usuario'
                }
              </Text>
            </View>

            {/* Botones del menú */}
            <View style={styles.menuContainer}>
              {/* Panel de administrador / Mi catálogo */}
              {usuario.rol !== 'comerciante' && (
                <MenuButton
                  icon={usuario.rol === 'admin' ? 'clipboard-outline' : 'shirt-outline'}
                  text={usuario.rol === 'admin' ? 'Panel de administrador' : 'Mi catálogo'}
                  onPress={() => handleMenuPress(usuario.rol === 'admin' ? 'admin' : 'catalog', {
                    id: usuario.proveedorInfo?.id
                  })}
                />
              )}

              {/* Mi inventario / Abonos inteligentes */}
              {usuario.rol !== 'admin' && (
                <>
                  <MenuButton
                    icon={usuario.rol === 'proveedor' ? 'cube-outline' : 'trending-up-outline'}
                    text={usuario.rol === 'proveedor' ? 'Mi inventario' : 'Abonos inteligentes'}
                    hasSubmenu={true}
                    isOpen={subMenuOpen}
                    onPress={() => setSubMenuOpen(!subMenuOpen)}
                  />

                  {/* Submenú */}
                  {subMenuOpen && (
                    <View style={styles.submenu}>
                      {usuario.rol === 'comerciante' && (
                        <MenuButton
                          icon="people-outline"
                          text="Proveedores"
                          isSubitem={true}
                          onPress={() => handleMenuPress('proveedores')}
                        />
                      )}

                      <MenuButton
                        icon={usuario.rol === 'proveedor' ? 'archive-outline' : 'document-text-outline'}
                        text={usuario.rol === 'proveedor' ? 'Mis productos' : 'Informes'}
                        isSubitem={true}
                        onPress={() => handleMenuPress(usuario.rol === 'proveedor' ? 'productos' : 'informes')}
                      />

                      {usuario.rol === 'proveedor' && (
                        <MenuButton
                          icon="create-outline"
                          text="Editar inventario"
                          isSubitem={true}
                          onPress={() => handleMenuPress('editar-inventario')}
                        />
                      )}

                      {usuario.rol === 'comerciante' && (
                        <>
                          <MenuButton
                            icon="construct-outline"
                            text="Sistema SAI"
                            hasSubmenu={true}
                            isOpen={subMenuSAIOpen}
                            isSubitem={true}
                            onPress={() => setSubMenuSAIOpen(!subMenuSAIOpen)}
                          />

                          {subMenuSAIOpen && (
                            <View style={styles.subSubmenu}>
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
                            </View>
                          )}
                        </>
                      )}

                      <MenuButton
                        icon={usuario.rol === 'proveedor' ? 'eye-outline' : 'car-outline'}
                        text={usuario.rol === 'proveedor' ? 'Ver inventario' : 'Registrar movimiento'}
                        isSubitem={true}
                        onPress={() => handleMenuPress(usuario.rol === 'proveedor' ? 'ver-inventario' : 'movimientos')}
                      />
                    </View>
                  )}
                </>
              )}

              {/* Separador */}
              {usuario.rol === 'comerciante' && <View style={styles.separator} />}

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

      {/* Login Modal */}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
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
    padding: 20,
    backgroundColor: 'white',
  },
  userInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    fontFamily: getUbuntuFont('regular'),
    marginBottom: 5,
  },
  userName: {
    fontSize: 24,
    color: '#333',
    fontFamily: getUbuntuFont('bold'),
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconLeft: {
    marginRight: 15,
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontFamily: getUbuntuFont('medium'),
  },
  logoutText: {
    color: '#ff4444',
  },
  iconRight: {
    marginLeft: 10,
  },
  submenu: {
    backgroundColor: '#f8f8f8',
  },
  subSubmenu: {
    backgroundColor: '#f0f0f0',
    paddingLeft: 20,
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
