import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'Ubuntu-Regular': require('../assets/fonts/Ubuntu-Regular.ttf'),
          'Ubuntu-Bold': require('../assets/fonts/Ubuntu-Bold.ttf'),
          'Ubuntu-Light': require('../assets/fonts/Ubuntu-Light.ttf'),
          'Ubuntu-Medium': require('../assets/fonts/Ubuntu-Medium.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        // Si hay error cargando las fuentes, continúa con las fuentes del sistema
        setFontsLoaded(true);
      }
    };

    loadFonts();
  }, []);

  return fontsLoaded;
};
