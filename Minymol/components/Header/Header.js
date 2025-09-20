import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import BarSup from '../BarSup/BarSup';
import Search from '../Search/Search';

const { width: screenWidth } = Dimensions.get('window');

const Header = ({ 
  minimal = false, 
  searchBar = false, 
  menuProvider = false, 
  providerName = '', 
  providerBanner, 
  providerLogo,
  currentPage = '', 
  backOn = false, 
  isHome = false,
  onBack,
  currentCategory = '',
  onCategoryPress 
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  const handleLogoPress = () => {
    // Navegar a home - aquí puedes agregar la lógica de navegación
    console.log('Ir a home');
  };

  // Header para páginas con barra de búsqueda
  if (searchBar) {
    return (
      <View style={[
        styles.header, 
        styles.searchBarHeader
      ]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={25} color="white" />
        </TouchableOpacity>
        {backOn && (
          <TouchableOpacity onPress={handleLogoPress}>
            <Image source={require('../../assets/logo.png')} style={styles.logoMinymol} />
          </TouchableOpacity>
        )}
        {!backOn && (
          <View style={styles.logoProvider}>
            <Image 
              source={providerBanner ? { uri: providerBanner } : require('../../assets/logo.png')} 
              style={styles.providerBannerImage}
            />
          </View>
        )}
      </View>
    );
  }

  // Header minimal (solo logo)
  if (minimal) {
    return (
      <View style={[
        styles.header, 
        styles.headerMinimal
      ]}>
        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleLogoPress}>
            <Image source={require('../../assets/logo.png')} style={styles.logoMinymol} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Header completo (con search, sin logo para móvil)
  return (
    <View style={styles.header}>
      <View style={styles.titleHeader}>
        {!isHome && onBack && (
          <TouchableOpacity style={styles.backBtnHeader} onPress={handleBack}>
            <Ionicons name="chevron-back" size={25} color="white" />
          </TouchableOpacity>
        )}
        <View style={styles.searchContainer}>
          <Search />
        </View>
      </View>
      {isHome && (
        <BarSup 
          currentCategory={currentCategory}
          onCategoryPress={onCategoryPress}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#14144b',
    width: '100%',
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    // Removido paddingTop fijo - ahora es dinámico
    minHeight: 60,
  },
  headerMinimal: {
    minHeight: 50,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  searchBarHeader: {
    height: 'auto',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    // Removido paddingTop fijo - ahora es dinámico
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50, // Reducido de 60 a 50
    paddingHorizontal: 5, // Reducido de 10 a 5 para más ancho
    paddingVertical: 5, // Agregado para control fino
    width: '100%',
  },
  searchContainer: {
    flex: 1, // Ocupa todo el espacio disponible
    marginLeft: 5, // Reducido de 10 a 5
    marginRight: 5, // Agregado para estar casi pegado al borde derecho
  },
  logoMinymol: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
    marginHorizontal: 5, // Reducido de 10 a 5
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15, // Reducido de 20 a 15
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
    marginRight: 5, // Reducido de 10 a 5
    paddingLeft: 5, // Reducido de 10 a 5
  },
  backBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
    marginRight: 5, // Reducido de 10 a 5
  },
  logoProvider: {
    width: '85%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  providerBannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

export default Header;
