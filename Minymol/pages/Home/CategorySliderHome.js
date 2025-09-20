import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AutoCarousel from '../../components/AutoCarousel';
import BarSup from '../../components/BarSup/BarSup';
import Header from '../../components/Header/Header';
import NavInf from '../../components/NavInf/NavInf';
import Product from '../../components/Product/Product';
import ProductsSkeleton from '../../components/ProductsSkeleton';
import Reels from '../../components/Reels';
import { useCategoryManager } from '../../hooks/useCategoryManager';
import cacheManager from '../../utils/cache/CacheManager';
import { CACHE_KEYS } from '../../utils/cache/StorageKeys';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');
const ITEMS_PER_LOAD = 10;

// Seed para paginación (se mantiene durante toda la sesión para consistencia)
let sessionSeed = null;
const getSessionSeed = () => {
    if (!sessionSeed) {
        sessionSeed = Math.floor(Date.now() / (1000 * 60 * 60)); // Cambia cada hora
        console.log('🎲 Session seed generado:', sessionSeed);
    }
    return sessionSeed;
};

// Seed actual para refresh (cambia cada vez que se presiona Home)
let currentSeed = null;
const generateNewSeed = () => {
    currentSeed = Math.floor(Math.random() * 1000000);
    console.log('🎯 Nuevo seed generado:', currentSeed);
    return currentSeed;
};

const getCurrentSeed = () => {
    if (!currentSeed) {
        return generateNewSeed();
    }
    return currentSeed;
};

const CategorySliderHome = ({ onProductPress, selectedTab = 'home', onTabPress }) => {
    const {
        categories,
        currentCategoryIndex,
        loading,
        changeCategory,
        getCurrentCategoryProducts,
        getCurrentCategory,
        loadCategoryProducts,
        loadSubCategoryProducts,
        totalCategories,
        allProducts // Obtener allProducts directamente
    } = useCategoryManager();

    // Estado simplificado - cada categoría mantiene sus productos
    const [categoryProducts, setCategoryProducts] = useState({});
    const [categorySubIndex, setCategorySubIndex] = useState({}); // Índice de subcategoría por categoría
    const [categoryPagination, setCategoryPagination] = useState({}); // Estado de paginación por categoría

    // Estados para el flujo cache → API → update del Home
    const [homeProductsCache, setHomeProductsCache] = useState([]); // Productos desde cache
    const [homeProductsAPI, setHomeProductsAPI] = useState([]); // Productos desde API
    const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);
    const [shouldUpdateHome, setShouldUpdateHome] = useState(false);
    const [homeInitialized, setHomeInitialized] = useState(false); // Controlar inicialización

    // Estados para el comportamiento de scroll
    const [isScrollingDown, setIsScrollingDown] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [showSubCategories, setShowSubCategories] = useState(true);
    const [heightAccumulator, setHeightAccumulator] = useState(65); // Altura acumulada para efecto persiana

    // Animación para altura del contenedor de subcategorías (efecto arrastre)
    const subCategoriesHeight = useRef(new Animated.Value(65)).current;
    // Animación para la transición de productos del Home
    const homeOpacity = useRef(new Animated.Value(1)).current;

    // Referencias para FlatList
    const categoryFlatListRef = useRef(null);

    // Obtener estado de paginación para una categoría/subcategoría
    const getPaginationState = useCallback((categoryIndex, subCategoryIndex = 0) => {
        const key = `${categoryIndex}-${subCategoryIndex}`;
        return categoryPagination[key] || {
            loadedCount: 0,
            hasMore: true,
            loading: false
        };
    }, [categoryPagination]);

    // Actualizar estado de paginación
    const updatePaginationState = useCallback((categoryIndex, subCategoryIndex, newState) => {
        const key = `${categoryIndex}-${subCategoryIndex}`;
        setCategoryPagination(prev => ({
            ...prev,
            [key]: { ...getPaginationState(categoryIndex, subCategoryIndex), ...newState }
        }));
    }, [getPaginationState]);

    // Función para comparar arrays de productos (simple comparación por IDs)
    const areProductsEqual = useCallback((products1, products2) => {
        if (!products1 || !products2) return false;
        if (products1.length !== products2.length) return false;
        
        // Comparar IDs en el mismo orden
        for (let i = 0; i < products1.length; i++) {
            if (products1[i]?.id !== products2[i]?.id) {
                return false;
            }
        }
        return true;
    }, []);

    // Función para cargar productos del Home desde cache
    const loadHomeFromCache = useCallback(async () => {
        try {
            const cachedProducts = await cacheManager.get(CACHE_KEYS.HOME_PRODUCTS_PAGE(1));
            if (cachedProducts && Array.isArray(cachedProducts) && cachedProducts.length > 0) {
                console.log('🟢 Home cargado desde cache:', cachedProducts.length, 'productos');
                setHomeProductsCache(cachedProducts);
                
                // Actualizar categoryProducts inmediatamente para mostrar el cache
                const key = '0-0'; // "Todos" - subcategoría 0
                setCategoryProducts(prev => ({
                    ...prev,
                    [key]: cachedProducts.slice(0, ITEMS_PER_LOAD)
                }));
                
                updatePaginationState(0, 0, {
                    loadedCount: ITEMS_PER_LOAD,
                    hasMore: cachedProducts.length > ITEMS_PER_LOAD,
                    loading: false
                });
                
                return cachedProducts;
            }
        } catch (error) {
            console.error('Error cargando Home desde cache:', error);
        }
        return null;
    }, [updatePaginationState]);

    // Función para hacer background fetch del Home
    const backgroundFetchHome = useCallback(async () => {
        if (isBackgroundFetching) return;
        
        setIsBackgroundFetching(true);
        console.log('🔄 Iniciando background fetch del Home...');
        
        try {
            // Obtener el seed actual (cambia cada vez que se presiona Home) y el offset
            const seed = getCurrentSeed();
            const offset = 0; // Primera carga siempre empieza en 0
            const limit = ITEMS_PER_LOAD;
            
            // Llamar a la API que devuelve productos aleatorios del backend
            const url = `https://api.minymol.com/products/random-previews?limit=${limit}&offset=${offset}&seed=${seed}`;
            console.log('🌐 Llamando API con currentSeed:', url);
            const response = await fetch(url);
            const apiProducts = await response.json();
            
            if (Array.isArray(apiProducts) && apiProducts.length > 0) {
                console.log('🆕 Productos obtenidos de la API:', apiProducts.length);
                setHomeProductsAPI(apiProducts);
                
                // Comparar con los productos del cache
                if (!areProductsEqual(homeProductsCache, apiProducts)) {
                    console.log('🔥 Los productos han cambiado, actualizando UI...');
                    setShouldUpdateHome(true);
                    
                    // Guardar en cache
                    await cacheManager.set(CACHE_KEYS.HOME_PRODUCTS_PAGE(1), apiProducts);
                } else {
                    console.log('✅ Los productos son iguales, no se actualiza la UI');
                }
            }
        } catch (error) {
            console.error('Error en background fetch del Home:', error);
        } finally {
            setIsBackgroundFetching(false);
        }
    }, [isBackgroundFetching, homeProductsCache, areProductsEqual]);

    // Función para aplicar la actualización del Home con animación
    const applyHomeUpdate = useCallback(() => {
        if (!shouldUpdateHome || homeProductsAPI.length === 0) return;
        
        console.log('🎬 Aplicando actualización del Home con animación...');
        
        // Fade out
        Animated.timing(homeOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            // Actualizar productos
            const key = '0-0';
            setCategoryProducts(prev => ({
                ...prev,
                [key]: homeProductsAPI.slice(0, ITEMS_PER_LOAD)
            }));
            
            updatePaginationState(0, 0, {
                loadedCount: ITEMS_PER_LOAD,
                hasMore: homeProductsAPI.length > ITEMS_PER_LOAD,
                loading: false
            });
            
            // Actualizar cache local
            setHomeProductsCache(homeProductsAPI);
            setShouldUpdateHome(false);
            
            // Fade in
            Animated.timing(homeOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        });
    }, [shouldUpdateHome, homeProductsAPI, homeOpacity, updatePaginationState]);

    // Effect para inicializar el cache manager
    useEffect(() => {
        const initCache = async () => {
            if (!cacheManager.isInitialized) {
                await cacheManager.initialize();
            }
        };
        initCache();
    }, [cacheManager]);

    // Effect para detectar cuando se presiona el tab Home
    useEffect(() => {
        if (selectedTab === 'home' && categories.length > 0) {
            console.log('🏠 Tab Home presionado - Reiniciando flujo');
            
            // Generar nuevo seed para productos frescos
            generateNewSeed();
            
            // Resetear inicialización para permitir nuevo flujo
            setHomeInitialized(false);
            
            // Resetear estado de background fetching
            setIsBackgroundFetching(false);
        }
    }, [selectedTab, categories.length]);

    // Effect para el flujo del Home: cache → background fetch (solo una vez)
    useEffect(() => {
        if (currentCategoryIndex === 0 && !loading && categories.length > 0 && !homeInitialized) {
            console.log('🚀 Inicializando flujo del Home por primera vez...');
            
            const initHomeFlow = async () => {
                setHomeInitialized(true); // Marcar como inicializado INMEDIATAMENTE
                
                // 1. Cargar desde cache primero
                const cachedProducts = await loadHomeFromCache();
                
                // 2. Si no hay cache, no hacer nada aquí - el background fetch lo manejará
                if (!cachedProducts) {
                    console.log('🟡 No hay cache, esperando background fetch');
                } else {
                    console.log('✅ Productos cargados desde cache para Home');
                }
                
                // 3. Background fetch (siempre) - sin delay
                backgroundFetchHome();
            };
            
            initHomeFlow();
        }
    }, [currentCategoryIndex, loading, categories.length, homeInitialized, allProducts]); // Agregar allProducts a dependencias

    // Effect para cargar productos automáticamente al cambiar categoría/subcategoría
    useEffect(() => {
        if (categories.length === 0 || loading) return;
        
        const currentSubIndex = getCurrentSubIndex(currentCategoryIndex);
        const key = `${currentCategoryIndex}-${currentSubIndex}`;
        
        // Solo cargar si no tenemos productos y no estamos cargando
        if (!categoryProducts.hasOwnProperty(key) && !getPaginationState(currentCategoryIndex, currentSubIndex).loading) {
            // No cargar para categoría "Todos" ya que se maneja por el flujo cache → API
            if (currentCategoryIndex !== 0) {
                getProductsForCategory(currentCategoryIndex, currentSubIndex);
            }
        }
    }, [currentCategoryIndex, getCurrentSubIndex, categoryProducts, getPaginationState, getProductsForCategory, categories.length, loading]);

    // Remover el effect separado de fallback ya que está incluido en el principal

    // Effect para aplicar actualización cuando sea necesario
    useEffect(() => {
        if (shouldUpdateHome && currentCategoryIndex === 0) {
            applyHomeUpdate();
        }
    }, [shouldUpdateHome, currentCategoryIndex, applyHomeUpdate]);

    // Función para manejar el scroll y detectar dirección
    const handleScroll = useCallback((event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;

        // Para subcategorías - efecto persiana acumulativo (como Temu)
        if (currentCategoryIndex > 0) {
            const HEADER_HEIGHT = 65; // Altura máxima del contenedor
            const MIN_HEIGHT = 0; // Altura mínima del contenedor
            
            // Calcular DELTA del scroll (cuánto se movió, no dónde está)
            const scrollDelta = currentScrollY - lastScrollY;
            
            // Calcular nueva altura acumulada
            let newHeight = heightAccumulator - scrollDelta; // Si baja (+delta), resta altura. Si sube (-delta), suma altura
            
            // Limitar entre MIN y MAX
            newHeight = Math.max(MIN_HEIGHT, Math.min(HEADER_HEIGHT, newHeight));
            
            // Aplicar nueva altura inmediatamente (sin animación temporal)
            subCategoriesHeight.setValue(newHeight);
            setHeightAccumulator(newHeight);
        }
        
        setLastScrollY(currentScrollY);
    }, [currentCategoryIndex, subCategoriesHeight, lastScrollY, heightAccumulator]);    // Obtener el índice de subcategoría actual para una categoría
    const getCurrentSubIndex = useCallback((categoryIndex) => {
        return categorySubIndex[categoryIndex] || 0;
    }, [categorySubIndex]);

    // Configuración de columnas para layout masonry
    const getColumnsCount = () => {
        if (screenWidth >= 1200) return 4;
        if (screenWidth >= 768) return 3;
        return 2;
    };

    const columnsCount = getColumnsCount();

    // Función para distribuir productos en columnas masonry
    const distributeProductsInColumns = useCallback((products) => {
        if (!products || products.length === 0) return [];

        const columns = Array.from({ length: columnsCount }, () => []);

        // Distribuir productos alternando entre columnas
        products.forEach((product, index) => {
            const columnIndex = index % columnsCount;
            columns[columnIndex].push(product);
        });

        return columns;
    }, [columnsCount]);

    // Función para obtener productos de una categoría/subcategoría con paginación
    const getProductsForCategory = useCallback(async (categoryIndex, subCategoryIndex = 0) => {
        const key = `${categoryIndex}-${subCategoryIndex}`;

        // Si ya tenemos productos (y no es undefined), devolverlos
        if (categoryProducts.hasOwnProperty(key) && categoryProducts[key] !== undefined) {
            return categoryProducts[key];
        }

        // Para categoría "Todos" (índice 0), usar productos del cache/API del Home
        if (categoryIndex === 0) {
            console.log('🟡 getProductsForCategory: Manejando categoría "Todos"');
            
            // Si tenemos productos del cache/API del Home, usarlos
            if (homeProductsCache.length > 0) {
                const products = homeProductsCache.slice(0, ITEMS_PER_LOAD);
                const key = '0-0';
                setCategoryProducts(prev => ({
                    ...prev,
                    [key]: products
                }));
                updatePaginationState(0, 0, {
                    loadedCount: products.length,
                    hasMore: homeProductsCache.length > ITEMS_PER_LOAD,
                    loading: false
                });
                return products;
            } else if (homeProductsAPI.length > 0) {
                const products = homeProductsAPI.slice(0, ITEMS_PER_LOAD);
                const key = '0-0';
                setCategoryProducts(prev => ({
                    ...prev,
                    [key]: products
                }));
                updatePaginationState(0, 0, {
                    loadedCount: products.length,
                    hasMore: homeProductsAPI.length > ITEMS_PER_LOAD,
                    loading: false
                });
                return products;
            } else {
                console.log('🟡 No hay productos de Home disponibles aún');
                return [];
            }
        }

        // Marcar como loading al inicio
        updatePaginationState(categoryIndex, subCategoryIndex, { loading: true });

        // Obtener productos SIN modificar el estado global
        const currentCategory = categories[categoryIndex - 1];
        let productsToLoad = [];

        try {
            if (currentCategory) {
                if (subCategoryIndex === 0) {
                    // Todas las subcategorías de esta categoría - usar solo el slug de la categoría
                    productsToLoad = await loadCategoryProducts(currentCategory.slug);
                } else {
                    // Subcategoría específica
                    const currentSubCategory = currentCategory.subCategories?.[subCategoryIndex - 1];
                    if (currentSubCategory) {
                        productsToLoad = await loadCategoryProducts(currentCategory.slug, currentSubCategory.slug);
                    }
                }
            }
        } catch (error) {
            console.error(`Error cargando productos para categoría ${categoryIndex}, subcategoría ${subCategoryIndex}:`, error);
            productsToLoad = [];
        }

        if (Array.isArray(productsToLoad) && productsToLoad.length > 0) {
            const initialProducts = productsToLoad.slice(0, ITEMS_PER_LOAD);

            // Guardar productos iniciales
            setCategoryProducts(prev => ({
                ...prev,
                [key]: initialProducts
            }));

            // Actualizar estado de paginación
            updatePaginationState(categoryIndex, subCategoryIndex, {
                loadedCount: ITEMS_PER_LOAD,
                hasMore: productsToLoad.length > ITEMS_PER_LOAD,
                loading: false
            });

            return initialProducts;
        } else {
            // IMPORTANTE: Guardar array vacío para evitar re-renderizados
            setCategoryProducts(prev => ({
                ...prev,
                [key]: []
            }));

            // Actualizar estado de paginación para indicar que no hay productos
            updatePaginationState(categoryIndex, subCategoryIndex, {
                loadedCount: 0,
                hasMore: false,
                loading: false
            });

            return [];
        }
    }, [categoryProducts, categories, loadCategoryProducts, updatePaginationState]);

    // Función para cargar más productos (loadMore)
    const loadMoreProducts = useCallback(async (categoryIndex, subCategoryIndex = 0) => {
        const key = `${categoryIndex}-${subCategoryIndex}`;
        const paginationState = getPaginationState(categoryIndex, subCategoryIndex);

        // Si ya está cargando o no hay más productos, no hacer nada
        if (paginationState.loading || !paginationState.hasMore) {
            return;
        }

        // Marcar como loading
        updatePaginationState(categoryIndex, subCategoryIndex, { loading: true });

        // Para categoría "Todos" (índice 0), usar productos del cache/API
        let productsForLoadMore = [];

        try {
            if (categoryIndex === 0) {
                // Para categoría "Todos" - hacer nueva llamada a la API con offset
                const seed = getSessionSeed();
                const offset = paginationState.loadedCount; // Usar los productos ya cargados como offset
                const limit = ITEMS_PER_LOAD;
                
                const url = `https://api.minymol.com/products/random-previews?limit=${limit}&offset=${offset}&seed=${seed}`;
                console.log('🔄 LoadMore Todos - Llamando API con sessionSeed:', url);
                
                const response = await fetch(url);
                const newProducts = await response.json();
                
                if (Array.isArray(newProducts) && newProducts.length > 0) {
                    productsForLoadMore = newProducts;
                    console.log('🆕 LoadMore Todos: obtenidos', newProducts.length, 'productos nuevos');
                } else {
                    productsForLoadMore = [];
                    console.log('📭 LoadMore Todos: no hay más productos');
                }
            } else {
                const currentCategory = categories[categoryIndex - 1];
                if (currentCategory) {
                    if (subCategoryIndex === 0) {
                        // Todas las subcategorías de esta categoría
                        productsForLoadMore = await loadCategoryProducts(currentCategory.slug);
                    } else {
                        // Subcategoría específica
                        const currentSubCategory = currentCategory.subCategories?.[subCategoryIndex - 1];
                        if (currentSubCategory) {
                            productsForLoadMore = await loadCategoryProducts(currentCategory.slug, currentSubCategory.slug);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error cargando más productos para categoría ${categoryIndex}:`, error);
            productsForLoadMore = [];
        }

        if (Array.isArray(productsForLoadMore)) {
            const currentProducts = categoryProducts[key] || [];
            let nextProducts = [];
            let hasMoreProducts = false;

            if (categoryIndex === 0) {
                // Para categoría "Todos" - los productos vienen directamente de la API
                nextProducts = productsForLoadMore;
                hasMoreProducts = nextProducts.length === ITEMS_PER_LOAD; // Si devolvió la cantidad completa, probablemente hay más
            } else {
                // Para otras categorías - slice normal
                nextProducts = productsForLoadMore.slice(
                    paginationState.loadedCount,
                    paginationState.loadedCount + ITEMS_PER_LOAD
                );
                hasMoreProducts = paginationState.loadedCount + nextProducts.length < productsForLoadMore.length;
            }

            if (nextProducts.length > 0) {
                // Agregar nuevos productos
                setCategoryProducts(prev => ({
                    ...prev,
                    [key]: [...currentProducts, ...nextProducts]
                }));

                // Actualizar estado de paginación
                updatePaginationState(categoryIndex, subCategoryIndex, {
                    loadedCount: paginationState.loadedCount + nextProducts.length,
                    hasMore: hasMoreProducts,
                    loading: false
                });
            } else {
                // No hay más productos
                updatePaginationState(categoryIndex, subCategoryIndex, {
                    hasMore: false,
                    loading: false
                });
            }
        } else {
            // Error al cargar productos
            updatePaginationState(categoryIndex, subCategoryIndex, { loading: false });
        }
    }, [categoryProducts, categories, loadCategoryProducts, getPaginationState, updatePaginationState, homeProductsAPI, homeProductsCache]);
    // Función para manejar selección de subcategoría
    const handleSubCategoryPress = useCallback((subCategoryIndex) => {
        const previousSubIndex = getCurrentSubIndex(currentCategoryIndex);

        // Solo actualizar si es diferente
        if (previousSubIndex !== subCategoryIndex) {
            const newKey = `${currentCategoryIndex}-${subCategoryIndex}`;

            // PRIMERO: Marcar como loading INMEDIATAMENTE
            setCategoryPagination(prev => ({
                ...prev,
                [newKey]: {
                    loadedCount: 0,
                    hasMore: true,
                    loading: true // Marcar como loading ANTES de limpiar productos
                }
            }));

            setCategorySubIndex(prev => ({
                ...prev,
                [currentCategoryIndex]: subCategoryIndex
            }));

            // SEGUNDO: Limpiar productos DESPUÉS de marcar loading
            setCategoryProducts(prev => ({
                ...prev,
                [newKey]: undefined // Cambiar a undefined para forzar recarga
            }));

            // TERCERO: Cargar productos
            setTimeout(() => {
                getProductsForCategory(currentCategoryIndex, subCategoryIndex);
            }, 0);
        }
    }, [currentCategoryIndex, getCurrentSubIndex, getProductsForCategory]);

    // Renderizar barra de subcategorías
    const renderSubCategoriesBar = useCallback((categoryIndex) => {
        const currentCategory = categoryIndex === 0 ? null : categories[categoryIndex - 1];
        const currentSubIndex = getCurrentSubIndex(categoryIndex);

        if (!currentCategory || !currentCategory.subCategories || currentCategory.subCategories.length === 0) {
            return null;
        }

        return (
            <Animated.View
                style={[
                    styles.subCategoriesContainer,
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        height: subCategoriesHeight,
                        overflow: 'hidden', // CRUCIAL: Corta el contenido que no cabe
                    }
                ]}
            >
                <View style={styles.subCategoriesBar}>
                    <ScrollView
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.subCategoriesScrollContent}
                        style={styles.subCategoriesList}
                        scrollEventThrottle={16}
                        nestedScrollEnabled={true}
                        scrollEnabled={true}
                        bounces={false}
                        overScrollMode="never"
                    >
                        {[{ id: 'todas', name: 'Todas', index: 0 }, ...currentCategory.subCategories.map((sub, index) => ({ ...sub, index: index + 1 }))].map((item, index) => (
                            <TouchableOpacity
                                key={`subcategory-${item.id || item.index || index}`}
                                style={[
                                    styles.subCategoryItem,
                                    currentSubIndex === item.index && styles.selectedSubCategory
                                ]}
                                onPress={() => handleSubCategoryPress(item.index)}
                                activeOpacity={0.8}
                            >
                                <Text style={[
                                    styles.subCategoryText,
                                    currentSubIndex === item.index && styles.selectedSubCategoryText
                                ]}>
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Animated.View>
        );
    }, [getCurrentSubIndex, handleSubCategoryPress, categories, subCategoriesHeight]);

    // Función para manejar cambios de categoría desde Header/BarSup
    const handleCategoryPress = useCallback((cat) => {
        let newIndex = 0;

        if (cat === null || cat === '') {
            newIndex = 0; // "Todos"
        } else {
            const categoryIndex = categories.findIndex(c => c.slug === cat.slug || c.slug === cat);
            if (categoryIndex !== -1) {
                newIndex = categoryIndex + 1; // +1 porque "Todos" es índice 0
            }
        }

        // Cambiar la categoría inmediatamente
        if (newIndex !== currentCategoryIndex) {
            changeCategory(newIndex);
            // No resetear subcategoría, mantener la que tenía cada categoría
        }

        // Animar a la nueva categoría usando FlatList
        if (categoryFlatListRef.current && newIndex !== currentCategoryIndex) {
            try {
                categoryFlatListRef.current.scrollToIndex({
                    index: newIndex,
                    animated: true
                });
            } catch (error) {
                console.log('Error scrollToIndex:', error);
            }
        }
    }, [categories, currentCategoryIndex, changeCategory]);

    // Renderizar página de categoría individual
    const renderCategoryPage = useCallback(({ item: categoryIndex }) => {
        // Obtener productos para esta categoría específica
        const currentSubIndex = getCurrentSubIndex(categoryIndex);
        const key = `${categoryIndex}-${currentSubIndex}`;
        const products = categoryProducts[key] || [];
        const paginationState = getPaginationState(categoryIndex, currentSubIndex);

        // Los productos se cargan automáticamente a través del useEffect

        return (
            <View style={[styles.categoryPage, { width: screenWidth }]}>
                {/* Solo mostrar carousel en "Todos" (índice 0) - posición estática */}


                {/* Mostrar subcategorías si no es "Todos" */}
                {categoryIndex > 0 && renderSubCategoriesBar(categoryIndex)}

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.productsList,
                        categoryIndex > 0 && { paddingTop: 75 } // Espacio para contenedor sticky
                    ]}
                    onScroll={(event) => {
                        // Manejar scroll para paginación
                        const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
                        const isCloseToBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 200;

                        if (isCloseToBottom && paginationState.hasMore && !paginationState.loading && products.length > 0) {
                            loadMoreProducts(categoryIndex, currentSubIndex);
                        }

                        // Manejar scroll para ocultar/mostrar elementos
                        handleScroll(event);
                    }}
                    scrollEventThrottle={16}
                >
                    {categoryIndex === 0 && (
                        <Reels onProductPress={onProductPress} />
                    )}

                    {categoryIndex === 0 && (
                        <View style={styles.autoCarouselContainer}>
                            <AutoCarousel />
                        </View>
                    )}

                    {categoryIndex === 0 ? (
                        /* Contenido animado para la categoría "Todos" */
                        <Animated.View style={{ opacity: homeOpacity }}>
                            {products.length > 0 ? (
                                <View style={styles.masonryContainer}>
                                    {distributeProductsInColumns(products).map((columnProducts, columnIndex) =>
                                        renderMasonryColumn(columnProducts, columnIndex)
                                    )}
                                </View>
                            ) : (
                                // Solo mostrar loading si realmente no hay datos disponibles
                                allProducts.length === 0 ? (
                                    <View style={styles.emptyContainer}>
                                        <ActivityIndicator color="#fa7e17" size="large" />
                                        <Text style={styles.emptyMessage}>
                                            Cargando productos...
                                        </Text>
                                    </View>
                                ) : null // No mostrar nada si hay allProducts disponibles
                            )}
                        </Animated.View>
                    ) : (
                        /* Contenido normal para otras categorías */
                        products.length > 0 ? (
                            <View style={styles.masonryContainer}>
                                {distributeProductsInColumns(products).map((columnProducts, columnIndex) =>
                                    renderMasonryColumn(columnProducts, columnIndex)
                                )}
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                {false ? ( // DESACTIVAR SKELETON COMPLETAMENTE
                                    <View>
                                        {console.log('🟡 SKELETON CATEGORÍA DESACTIVADO')}
                                        <ProductsSkeleton columnsCount={columnsCount} itemsCount={4} />
                                    </View>
                                ) : (
                                    <Text style={styles.emptyMessage}>
                                        No hay productos disponibles en esta categoría
                                    </Text>
                                )}
                            </View>
                        )
                    )}

                    {/* Footer para carga adicional */}
                    {paginationState.loading && products.length > 0 && (
                        <View style={styles.loadingMore}>
                            <ActivityIndicator color="#fa7e17" size="small" />
                            <Text style={styles.loadingText}>Cargando más productos...</Text>
                        </View>
                    )}

                    {!paginationState.hasMore && products.length > 0 && (
                        <Text style={styles.endMessage}>
                            No hay más productos para mostrar
                        </Text>
                    )}
                </ScrollView>
            </View>
        );
    }, [getProductsForCategory, getCurrentSubIndex, getPaginationState, loadMoreProducts, columnsCount, screenWidth, renderSubCategoriesBar, categoryProducts, distributeProductsInColumns, renderMasonryColumn, handleScroll, homeOpacity, allProducts]);

    // Renderizar una columna de productos para masonry
    const renderMasonryColumn = useCallback((columnProducts, columnIndex) => (
        <View key={`column-${columnIndex}`} style={styles.masonryColumn}>
            {columnProducts.map((product, index) => (
                <View key={`${product.id || index}`} style={styles.masonryItem}>
                    <Product
                        product={product}
                        onProductPress={onProductPress}
                    />
                </View>
            ))}
        </View>
    ), [onProductPress]);

    // Renderizar producto individual para grilla responsive
    const renderProduct = useCallback(({ item: product, index }) => (
        <View style={[
            styles.productWrapper,
            {
                width: `${100 / columnsCount}%`,
            }
        ]}>
            <Product
                product={product}
                onPress={onProductPress}
            />
        </View>
    ), [onProductPress, columnsCount]);

    // Effect para resetear estados de scroll al cambiar de categoría
    useEffect(() => {
        setLastScrollY(0);
        
        // Resetear visibilidad y animaciones
        setShowSubCategories(true);
        setHeightAccumulator(65); // Resetear altura acumulada
        subCategoriesHeight.setValue(65); // Altura completa al cambiar categoría
        
        // Resetear inicialización del Home si cambiamos de categoría
        if (currentCategoryIndex !== 0) {
            setHomeInitialized(false);
        }
    }, [currentCategoryIndex, subCategoriesHeight]);
    return (
        <View style={styles.container}>
            <Header />
            <BarSup
                categories={categories}
                currentCategory={currentCategoryIndex === 0 ? '' : categories[currentCategoryIndex - 1]?.slug || ''}
                onCategoryPress={handleCategoryPress}
            />

            <FlatList
                ref={categoryFlatListRef}
                data={Array.from({ length: totalCategories }, (_, index) => index)}
                renderItem={renderCategoryPage}
                keyExtractor={(item) => `category-${item}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                    const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                    if (newIndex !== currentCategoryIndex) {
                        changeCategory(newIndex);
                        // No resetear subcategoría
                    }
                }}
                getItemLayout={(data, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                })}
                windowSize={3}
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                removeClippedSubviews={false}
                decelerationRate="fast"
            />

            <NavInf selected={selectedTab} onPress={onTabPress} />
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
    categoryPage: {
        backgroundColor: 'white',
    },
    autoCarouselContainer: {
        position: 'relative',
        zIndex: 1,
        backgroundColor: 'white',
    },
    masonryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    masonryColumn: {
        flex: 1,
        paddingHorizontal: 4,
    },
    masonryItem: {
        marginBottom: 8,
    },
    productWrapper: {
        paddingHorizontal: 4,
        paddingVertical: 4,
        flex: 1,
    },
    productsList: {
        paddingHorizontal: 8,
        paddingTop: 10,
        paddingBottom: 100, // Espacio suficiente para NavInf
    },
    loadingMore: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    endMessage: {
        textAlign: 'center',
        color: '#888',
        padding: 20,
        fontFamily: getUbuntuFont('regular'),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyMessage: {
        textAlign: 'center',
        color: '#888',
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
    },
    subCategoriesContainer: {
        backgroundColor: '#ffffff',
        width: '100%',
    },
    subCategoriesBar: {
        backgroundColor: '#ffffff',
        paddingVertical: 12,
        paddingHorizontal: 5,
        height: 65, // Altura fija del contenido
    },
    subCategoriesList: {
        flexGrow: 0,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'scroll',
    },
    subCategoriesScrollContent: {
        paddingHorizontal: 15,
        paddingVertical: 5,
        alignItems: 'center',
        flexDirection: 'row',
        minWidth: '100%',
    },
    subCategoryItem: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 12,
        borderRadius: 25,
        backgroundColor: '#f5f5f5',
        borderWidth: 0,
        minWidth: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subCategoryText: {
        fontSize: 13,
        color: '#555',
        fontFamily: getUbuntuFont('medium'),
        textAlign: 'center',
        fontWeight: '500',
    },
    selectedSubCategory: {
        backgroundColor: '#fa7e17',
        transform: [{ scale: 1.05 }],
    },
    selectedSubCategoryText: {
        color: 'white',
        fontFamily: getUbuntuFont('bold'),
        fontSize: 13,
        fontWeight: '600',
    },
});

export default CategorySliderHome;