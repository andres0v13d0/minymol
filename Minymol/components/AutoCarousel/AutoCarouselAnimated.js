import { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Platform, ScrollView, StyleSheet, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const AutoCarouselAnimated = ({ 
  images = [
    require('../../assets/imgs/img1.gif'),
    require('../../assets/imgs/img2.gif'),
    require('../../assets/imgs/img3.gif'),
  ],
  autoScrollInterval = 4000,
}) => {
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageHeight, setImageHeight] = useState(screenWidth * 0.6);
  const [forceRender, setForceRender] = useState(0); // Para forzar re-render en Android

  // Calcular altura inicial
  useEffect(() => {
    setImageHeight(screenWidth * 0.6); // Aspect ratio común para GIFs
    
    // En Android, forzar un re-render después de un breve delay para activar GIFs
    if (Platform.OS === 'android') {
      setTimeout(() => {
        setForceRender(prev => prev + 1);
      }, 100);
    }
  }, []);

  // Auto scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % images.length;
        
        // Scroll a la siguiente imagen
        scrollViewRef.current?.scrollTo({
          x: nextIndex * screenWidth,
          animated: true,
        });
        
        return nextIndex;
      });
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [autoScrollInterval, images.length]);

  // Manejar carga de imagen para ajustar altura
  const handleImageLoad = (event) => {
    const { width, height } = event.nativeEvent.source;
    if (width && height && currentIndex === 0) {
      const aspectRatio = height / width;
      const calculatedHeight = screenWidth * aspectRatio;
      setImageHeight(calculatedHeight);
    }
  };

  return (
    <View style={[styles.container, { height: imageHeight }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={styles.scrollView}
        // Propiedades específicas para mejorar GIFs en Android
        {...(Platform.OS === 'android' && {
          removeClippedSubviews: false,
          scrollEventThrottle: 1,
        })}
      >
        {images.map((image, index) => (
          <View key={`${index}-${forceRender}`} style={[styles.imageContainer, { width: screenWidth }]}>
            <Image
              source={image}
              style={styles.image}
              resizeMode="contain"
              onLoad={index === 0 ? handleImageLoad : undefined}
              // Propiedades específicas para Android GIFs
              {...(Platform.OS === 'android' && {
                fadeDuration: 0,
                loadingIndicatorSource: undefined,
                progressiveRenderingEnabled: true,
              })}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default AutoCarouselAnimated;
