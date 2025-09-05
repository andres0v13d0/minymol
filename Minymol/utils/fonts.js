import { Platform } from 'react-native';

// Configuración de fuentes Ubuntu para diferentes plataformas
export const fonts = {
  ubuntu: {
    regular: Platform.select({
      ios: 'Ubuntu-Regular',
      android: 'Ubuntu-Regular',
      default: 'Ubuntu-Regular',
    }),
    bold: Platform.select({
      ios: 'Ubuntu-Bold',
      android: 'Ubuntu-Bold',
      default: 'Ubuntu-Bold',
    }),
    light: Platform.select({
      ios: 'Ubuntu-Light',
      android: 'Ubuntu-Light',
      default: 'Ubuntu-Light',
    }),
    medium: Platform.select({
      ios: 'Ubuntu-Medium',
      android: 'Ubuntu-Medium',
      default: 'Ubuntu-Medium',
    }),
  }
};

// Función helper para obtener la fuente Ubuntu
export const getUbuntuFont = (weight = 'regular') => {
  return fonts.ubuntu[weight] || fonts.ubuntu.regular;
};

// Estilos de texto predefinidos con Ubuntu
export const textStyles = {
  heading1: {
    fontFamily: getUbuntuFont('bold'),
    fontSize: 24,
    lineHeight: 32,
  },
  heading2: {
    fontFamily: getUbuntuFont('bold'),
    fontSize: 20,
    lineHeight: 28,
  },
  heading3: {
    fontFamily: getUbuntuFont('medium'),
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: getUbuntuFont('regular'),
    fontSize: 16,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: getUbuntuFont('regular'),
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: getUbuntuFont('light'),
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontFamily: getUbuntuFont('medium'),
    fontSize: 16,
    lineHeight: 20,
  },
};
