import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    RefreshControl,
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
import ProductsSkeleton from '../../components/ProductsSkeleton/ProductsSkeleton';
import Reels from '../../components/Reels';
import { useAppState } from '../../contexts/AppStateContext';
import { getUbuntuFont } from '../../utils/fonts';
import subCategoriesManager from '../../utils/SubCategoriesManager';

const { width: screenWidth } = Dimensions.get('window');

const CategorySliderHome = ({ onProductPress, selectedTab = 'home', onTabPress, onSearchPress }) => {
    // Verificar que onProductPress existe
    if (!onProductPress) {
        console.warn('⚠️ onProductPress no está definido en CategorySliderHome');
    }

    // Estado global de la app
    const {
        categories,
        currentCategoryIndex,
        currentSubCategoryIndex,
        loading,
        changeCategory,
        changeSubCategory,
        getCategoryProducts,
        loadCategoryProducts,
        getCurrentCategory,
        isCategoryLoading,
        loadCategories,
        homeInitialized,
        setHomeInitialized,
        totalCategories
    } = useAppState();

    // Función para manejar cuando se presiona un proveedor
    const handleProviderPress = useCallback((provider) => {
        console.log('Proveedor seleccionado:', provider);
        // Aquí puedes agregar navegación específica para el proveedor
        // Por ejemplo, filtrar productos por proveedor o navegar a una página del proveedor
        if (onSearchPress) {
            onSearchPress(provider.nombre_empresa);
        }
    }, [onSearchPress]);

    // Estados locales para UI
    const [showSubCategories, setShowSubCategories] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreProducts, setHasMoreProducts] = useState(true);
    const [currentOffset, setCurrentOffset] = useState(0);

    // Estado unificado para manejar productos por categoría
    const [categoryProducts, setCategoryProducts] = useState({});

    // Estado para recordar la subcategoría seleccionada por cada categoría
    const [categorySubCategoryMemory, setCategorySubCategoryMemory] = useState({});

    // Función helper para obtener la subcategoría actual de una categoría específica
    const getCurrentSubCategoryForCategory = useCallback((categoryIndex) => {
        return categorySubCategoryMemory[categoryIndex] || 0;
    }, [categorySubCategoryMemory]);

    // Función helper para establecer la subcategoría de una categoría específica
    const setSubCategoryForCategory = useCallback((categoryIndex, subCategoryIndex) => {
        setCategorySubCategoryMemory(prev => ({
            ...prev,
            [categoryIndex]: subCategoryIndex
        }));
        
        // Solo cambiar el estado global si es la categoría actual
        if (categoryIndex === currentCategoryIndex) {
            changeSubCategory(subCategoryIndex);
        }
    }, [currentCategoryIndex, changeSubCategory]);

    // Hook para forzar re-render cuando se actualizan las subcategorías
    const [, forceUpdate] = useState({});

    // Animaciones
    const subCategoriesHeight = useRef(new Animated.Value(65)).current;
    const subCategoriesTranslateY = useRef(new Animated.Value(0)).current; // Nueva animación para sticky header

    // Referencias
    const categoryFlatListRef = useRef(null);
    const scrollThrottleRef = useRef(null); // Para throttling del scroll anticipado

    // Función helper para actualizar estado de productos por categoría
    const setCategoryProductsState = useCallback((categoryIndex, newState) => {
        setCategoryProducts(prev => {
            const currentState = prev[categoryIndex] || {
                products: [],
                offset: 0,
                hasMore: true,
                isLoading: false,
                initialized: false
            };

            return {
                ...prev,
                [categoryIndex]: {
                    ...currentState,
                    ...newState
                }
            };
        });
    }, []);

    // Función para inicializar productos de una categoría específica
    const initializeCategoryProducts = useCallback(async (categoryIndex) => {
        // Usar setCategoryProducts con función para acceder al estado actual
        setCategoryProducts(prev => {
            const currentState = prev[categoryIndex] || {
                products: [],
                offset: 0,
                hasMore: true,
                isLoading: false,
                initialized: false
            };

            // Si ya está inicializada o cargando, no hacer nada
            if (currentState.initialized || currentState.isLoading) {
                console.log(`⏭️ Categoría ${categoryIndex} ya inicializada o cargando`);
                return prev;
            }

            console.log(`🔄 Inicializando productos para categoría ${categoryIndex}-${getCurrentSubCategoryForCategory(categoryIndex)}`);
            console.log(`📊 Estado antes de cargar:`, currentState);

            // Obtener la subcategoría específica para esta categoría
            const categorySubCategoryIndex = getCurrentSubCategoryForCategory(categoryIndex);

            // Marcar como cargando y ejecutar la carga async
            const newState = { ...currentState, isLoading: true };

            // Ejecutar la carga de productos de forma async
            loadCategoryProducts(categoryIndex, categorySubCategoryIndex)
                .then(products => {
                    setCategoryProducts(prevState => ({
                        ...prevState,
                        [categoryIndex]: {
                            products: products || [],
                            offset: 10,
                            hasMore: (products && products.length > 0),
                            isLoading: false,
                            initialized: true,
                            lastSubCategoryIndex: categorySubCategoryIndex
                        }
                    }));
                    console.log(`✅ Categoría ${categoryIndex} inicializada con ${(products || []).length} productos`);
                })
                .catch(error => {
                    console.error(`❌ Error inicializando categoría ${categoryIndex}:`, error);
                    setCategoryProducts(prevState => ({
                        ...prevState,
                        [categoryIndex]: {
                            products: [],
                            offset: 0,
                            hasMore: false,
                            isLoading: false,
                            initialized: true,
                            lastSubCategoryIndex: categorySubCategoryIndex
                        }
                    }));
                });

            return {
                ...prev,
                [categoryIndex]: newState
            };
        });
    }, [loadCategoryProducts, getCurrentSubCategoryForCategory]);    // Cargar categorías al montar el componente
    useEffect(() => {
        const initializeHome = async () => {
            if (!homeInitialized) {
                console.log('🏠 Inicializando Home...');
                try {
                    // Cargar categorías primero
                    await loadCategories();
                    console.log('✅ Categorías cargadas');

                    // Iniciar sincronización de subcategorías en background (sin bloquear)
                    subCategoriesManager.syncWithDatabase()
                        .then(hasChanges => {
                            if (hasChanges) {
                                console.log('🔄 Subcategorías sincronizadas con cambios');
                                forceUpdate({});
                            }
                        })
                        .catch(error => {
                            // Error silencioso - no afecta la funcionalidad principal
                            console.log('⚠️ Sincronización de subcategorías falló silenciosamente');
                        });

                    // Marcar como inicializado sin esperar la carga de productos
                    setHomeInitialized(true);
                    console.log('✅ Home inicializado correctamente');
                } catch (error) {
                    console.error('❌ Error inicializando Home:', error);
                    setHomeInitialized(true); // Marcar como inicializado aún con error
                }
            }
        };

        // Solo ejecutar si no está inicializado
        if (!homeInitialized) {
            initializeHome();
        }
    }, [homeInitialized, loadCategories, setHomeInitialized]);

    // Effect adicional para verificar que las categorías se cargaron correctamente
    // REMOVIDO para evitar loops infinitos - la lógica de recarga se maneja en la inicialización

    // Effect para cargar productos cuando cambia la categoría/subcategoría
    useEffect(() => {
        if (!homeInitialized || !categories || categories.length === 0) return;

        // Obtener la subcategoría actual para esta categoría
        const categorySubCategoryIndex = getCurrentSubCategoryForCategory(currentCategoryIndex);

        // Cuando cambia la subcategoría, necesitamos resetear la categoría actual
        setCategoryProducts(prevCategoryProducts => {
            const currentState = prevCategoryProducts[currentCategoryIndex];

            // Si la categoría no está inicializada o si cambió la subcategoría, reinicializar
            if (!currentState || !currentState.initialized || currentState.lastSubCategoryIndex !== categorySubCategoryIndex) {
                console.log(`🔄 Reinicializando categoría ${currentCategoryIndex} para subcategoría ${categorySubCategoryIndex}`);
                console.log(`📊 Estado actual:`, currentState);
                console.log(`📊 Subcategoría anterior: ${currentState?.lastSubCategoryIndex}, nueva: ${categorySubCategoryIndex}`);

                // Resetear el estado de la categoría para la nueva subcategoría
                const resetState = {
                    products: [],
                    offset: 0,
                    hasMore: true,
                    isLoading: false,
                    initialized: false,
                    lastSubCategoryIndex: categorySubCategoryIndex
                };

                // Llamar initializeCategoryProducts de forma async
                setTimeout(() => {
                    initializeCategoryProducts(currentCategoryIndex);
                }, 0);

                return {
                    ...prevCategoryProducts,
                    [currentCategoryIndex]: resetState
                };
            }

            // Si no hay cambios, retornar el estado sin modificaciones
            return prevCategoryProducts;
        });

    }, [currentCategoryIndex, homeInitialized, categories.length, initializeCategoryProducts, getCurrentSubCategoryForCategory, categorySubCategoryMemory]);

    // Función para refrescar productos
    const onRefresh = useCallback(async () => {
        console.log('🔄 Refrescando productos...');
        setIsRefreshing(true);

        try {
            // Recargar categorías
            await loadCategories();

            // Obtener la subcategoría específica para la categoría actual
            const categorySubCategoryIndex = getCurrentSubCategoryForCategory(currentCategoryIndex);

            // Reset del estado de la categoría actual
            const refreshedProducts = await loadCategoryProducts(currentCategoryIndex, categorySubCategoryIndex, true);

            setCategoryProducts(prev => ({
                ...prev,
                [currentCategoryIndex]: {
                    products: refreshedProducts || [],
                    offset: 10,
                    hasMore: (refreshedProducts && refreshedProducts.length > 0),
                    isLoading: false,
                    initialized: true,
                    lastSubCategoryIndex: categorySubCategoryIndex
                }
            }));

            console.log(`✅ Categoría ${currentCategoryIndex} refrescada con ${(refreshedProducts || []).length} productos`);
        } catch (error) {
            console.error('❌ Error refrescando:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [currentCategoryIndex, loadCategories, loadCategoryProducts, getCurrentSubCategoryForCategory]);

    // Función para cargar más productos (infinite scroll) con lotes adaptativos
    const loadMoreProducts = useCallback(async () => {
        setCategoryProducts(prev => {
            const currentState = prev[currentCategoryIndex] || {};

            if (currentState.isLoading || !currentState.hasMore || !currentState.initialized) {
                return prev;
            }

            const currentOffset = currentState.offset || 10;
            const currentProductCount = currentState.products?.length || 0;
            
            // Lotes adaptativos: cargar más productos si ya tenemos muchos (scroll rápido detectado)
            let batchSize = 10; // Tamaño base
            if (currentProductCount > 30) {
                batchSize = 15; // Lotes más grandes para usuarios que hacen scroll rápido
            } else if (currentProductCount > 60) {
                batchSize = 20; // Lotes aún más grandes para power users
            }
            
            // Obtener la subcategoría específica para la categoría actual
            const categorySubCategoryIndex = getCurrentSubCategoryForCategory(currentCategoryIndex);
            
            console.log(`🔄 Cargando más productos para categoría ${currentCategoryIndex}... offset: ${currentOffset}, batch: ${batchSize}`);

            // Marcar como cargando más y ejecutar la carga async
            const newState = { ...currentState, isLoading: true };

            // Ejecutar la carga de productos de forma async
            loadCategoryProducts(currentCategoryIndex, categorySubCategoryIndex, false, currentOffset)
                .then(moreProducts => {
                    if (moreProducts && moreProducts.length > 0) {
                        setCategoryProducts(prevState => {
                            const currentProducts = prevState[currentCategoryIndex]?.products || [];
                            const existingIds = new Set(currentProducts.map(p => p.id || p.uuid));
                            const uniqueNewProducts = moreProducts.filter(p => !existingIds.has(p.id || p.uuid));

                            console.log(`🔍 ${moreProducts.length} productos recibidos, ${uniqueNewProducts.length} únicos (batch size: ${batchSize})`);

                            return {
                                ...prevState,
                                [currentCategoryIndex]: {
                                    ...currentState,
                                    products: [...currentProducts, ...uniqueNewProducts],
                                    offset: currentOffset + batchSize, // Usar el tamaño de lote dinámico
                                    hasMore: uniqueNewProducts.length > 0,
                                    isLoading: false
                                }
                            };
                        });

                        console.log(`✅ ${moreProducts.length} productos más cargados`);
                    } else {
                        setCategoryProducts(prevState => ({
                            ...prevState,
                            [currentCategoryIndex]: {
                                ...currentState,
                                hasMore: false,
                                isLoading: false
                            }
                        }));
                        console.log('🏁 No hay más productos disponibles');
                    }
                })
                .catch(error => {
                    console.error('❌ Error cargando más productos:', error);
                    setCategoryProducts(prevState => ({
                        ...prevState,
                        [currentCategoryIndex]: {
                            ...currentState,
                            hasMore: false,
                            isLoading: false
                        }
                    }));
                });

            return {
                ...prev,
                [currentCategoryIndex]: newState
            };
        });
    }, [currentCategoryIndex, loadCategoryProducts, getCurrentSubCategoryForCategory]);

    // Obtener subcategorías de la categoría actual - INSTANTÁNEO desde JSON
    const getCurrentSubCategories = useCallback(() => {
        if (currentCategoryIndex === 0) return []; // "Todos" no tiene subcategorías
        if (!categories || categories.length === 0) return []; // Verificación de seguridad

        const category = categories[currentCategoryIndex - 1]; // -1 porque 0 es "Todos"
        if (!category || !category.slug) return [];

        try {
            // Usar el manager para obtener subcategorías estáticas
            const staticSubCategories = subCategoriesManager.getSubcategoriesByCategory(category.slug) || [];

            // Sincronizar en background (sin errores que afecten la UI)
            if (subCategoriesManager.shouldSync()) {
                subCategoriesManager.syncWithDatabase()
                    .then(hasChanges => {
                        if (hasChanges) {
                            console.log('🔄 Subcategorías actualizadas, refrescando UI...');
                            // Forzar re-render solo si hubo cambios
                            forceUpdate({});
                        }
                    })
                    .catch(error => {
                        // Error silencioso - no afecta la UI
                        console.log('⚠️ Sincronización silenciosa de subcategorías falló');
                    });
            }

            return staticSubCategories;
        } catch (error) {
            console.log('⚠️ Error obteniendo subcategorías, usando array vacío');
            return [];
        }
    }, [currentCategoryIndex, categories]);

    // Manejar cambio de categoría desde BarSup
    const handleCategoryPress = useCallback((category) => {
        console.log('🔄 Cambio de categoría solicitado:', category);

        // Guardar la subcategoría actual antes de cambiar (usar la función helper)
        const currentSubCategoryForCategory = getCurrentSubCategoryForCategory(currentCategoryIndex);
        setSubCategoryForCategory(currentCategoryIndex, currentSubCategoryForCategory);

        let newCategoryIndex;
        if (!category) {
            // Presionaron "Todos"
            newCategoryIndex = 0;
        } else {
            // Encontrar el índice de la categoría
            const categoryIndex = categories.findIndex(cat => cat.id === category.id);
            if (categoryIndex !== -1) {
                newCategoryIndex = categoryIndex + 1; // +1 porque 0 es "Todos"
            }
        }

        if (newCategoryIndex !== undefined && currentCategoryIndex !== newCategoryIndex) {
            changeCategory(newCategoryIndex);

            // Restaurar la subcategoría recordada para esta categoría
            const rememberedSubCategory = getCurrentSubCategoryForCategory(newCategoryIndex);
            console.log(`🧠 Restaurando subcategoría ${rememberedSubCategory} para categoría ${newCategoryIndex}`);
            
            // Actualizar la subcategoría si es diferente
            if (rememberedSubCategory !== currentSubCategoryIndex) {
                setTimeout(() => {
                    changeSubCategory(rememberedSubCategory);
                }, 0);
            }
        }

        // Reset scroll position y animaciones
        setLastScrollY(0);
        setShowSubCategories(true);
        subCategoriesTranslateY.setValue(0); // Resetear posición del sticky header

        // Sincronizar FlatList con el cambio de categoría
        if (categoryFlatListRef.current && newCategoryIndex !== undefined) {
            if (newCategoryIndex !== currentCategoryIndex) {
                categoryFlatListRef.current.scrollToIndex({
                    index: newCategoryIndex,
                    animated: true
                });
            }
        }
    }, [currentCategoryIndex, currentSubCategoryIndex, categories, changeCategory, changeSubCategory, getCurrentSubCategoryForCategory, setSubCategoryForCategory]);

    // Manejar cambio de categoría desde el FlatList horizontal
    const handleCategoryScroll = useCallback((event) => {
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
        if (newIndex !== currentCategoryIndex) {
            changeCategory(newIndex);
        }
    }, [currentCategoryIndex]);

    // Manejar cambio de subcategoría
    const handleSubCategoryPress = useCallback((subCategoryIndex) => {
        console.log(`🔀 Cambiando a subcategoría ${subCategoryIndex} para categoría ${currentCategoryIndex}`);

        // Usar la nueva función helper para actualizar la subcategoría específica
        setSubCategoryForCategory(currentCategoryIndex, subCategoryIndex);
    }, [currentCategoryIndex, setSubCategoryForCategory]);

    // Función para distribuir productos en columnas (masonry)
    const distributeProductsInColumns = useCallback((products) => {
        const columns = [[], []];

        products.forEach((product, index) => {
            const columnIndex = index % 2;
            columns[columnIndex].push(product);
        });

        return columns;
    }, []);

    // Renderizar columna de masonry
    const renderMasonryColumn = useCallback((columnProducts, columnIndex) => (
        <View key={columnIndex} style={styles.masonryColumn}>
            {columnProducts.map((product, index) => (
                <View key={`${product.uuid || product.id}-${columnIndex}-${index}`} style={styles.masonryItem}>
                    <Product
                        product={product}
                        onProductPress={(product) => {
                            console.log('🔄 CategorySliderHome: onProductPress llamado con producto:', product?.name);
                            onProductPress(product);
                        }}
                    />
                </View>
            ))}
        </View>
    ), [onProductPress]);

    // Manejar scroll para sticky header de subcategorías y infinite scroll
    const handleScroll = useCallback((event) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const isScrollingDown = currentY > lastScrollY && currentY > 20; // Umbral más alto para mejor UX
        const isScrollingUp = currentY < lastScrollY - 10; // Umbral para scroll hacia arriba

        setLastScrollY(currentY);

        // Manejar sticky header de subcategorías con animación suave
        if (isScrollingDown && showSubCategories) {
            // Ocultar barra al hacer scroll hacia abajo
            setShowSubCategories(false);
            Animated.timing(subCategoriesTranslateY, {
                toValue: -80, // Mover completamente fuera de la pantalla
                duration: 250,
                useNativeDriver: true, // Usar native driver para mejor performance
            }).start();
        } else if (isScrollingUp && !showSubCategories) {
            // Mostrar barra al hacer scroll hacia arriba
            setShowSubCategories(true);
            Animated.timing(subCategoriesTranslateY, {
                toValue: 0, // Posición original
                duration: 250,
                useNativeDriver: true,
            }).start();
        }

        // Infinite scroll estilo Amazon/Temu - carga anticipada inteligente con throttling
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        
        // Calcular el porcentaje de scroll
        const scrollPercentage = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;
        
        const currentState = categoryProducts[currentCategoryIndex] || {};
        const currentProductCount = currentState.products?.length || 0;
        
        // Carga anticipada progresiva: más agresiva mientras más productos tengamos
        let preloadThreshold = 75; // Base: 75%
        
        if (currentProductCount > 50) {
            preloadThreshold = 70; // Con muchos productos, cargar al 70%
        } else if (currentProductCount > 100) {
            preloadThreshold = 65; // Con muchísimos productos, cargar al 65%
        }
        
        // Verificar si necesitamos cargar más productos
        const shouldLoadMore = scrollPercentage >= preloadThreshold && 
                              currentState.hasMore && 
                              !currentState.isLoading && 
                              currentState.initialized &&
                              contentSize.height > layoutMeasurement.height; // Solo si hay contenido para hacer scroll

        if (shouldLoadMore) {
            // Throttling: solo ejecutar si han pasado al menos 500ms desde la última carga
            const now = Date.now();
            if (!scrollThrottleRef.current || (now - scrollThrottleRef.current) > 500) {
                scrollThrottleRef.current = now;
                console.log(`🚀 Carga anticipada activada al ${scrollPercentage.toFixed(1)}% (threshold: ${preloadThreshold}%) con ${currentProductCount} productos`);
                loadMoreProducts();
            }
        }
    }, [lastScrollY, showSubCategories, categoryProducts, currentCategoryIndex, loadMoreProducts]);

    // Renderizar página de categoría
    const renderCategoryPage = useCallback(({ item: categoryIndex }) => {
        // Obtener el estado de los productos de esta categoría
        const categoryState = categoryProducts[categoryIndex] || {
            products: [],
            offset: 0,
            hasMore: true,
            isLoading: false,
            initialized: false,
            lastSubCategoryIndex: -1 // Para forzar inicialización en primera carga
        };

        const subCategories = getCurrentSubCategories();

        // Ocultar barra de subcategorías para "Todos" inmediatamente
        const shouldShowSubCategories = categoryIndex !== 0 && subCategories.length > 0;

        // Si la categoría no está inicializada, mostrar skeleton  
        if (!categoryState.initialized && categoryState.isLoading) {
            return (
                <View style={[styles.categoryPage, { width: screenWidth }]}>
                    <ScrollView
                        style={styles.categoryPage}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={onRefresh}
                                colors={['#fa7e17']}
                            />
                        }
                    >
                        {/* Reels solo para categoría "Todos" */}
                        {categoryIndex === 0 && (
                            <View style={styles.reelsContainer}>
                                <Reels />
                            </View>
                        )}

                        {/* AutoCarousel solo para categoría "Todos" */}
                        {categoryIndex === 0 && (
                            <View style={styles.autoCarouselContainer}>
                                <AutoCarousel onProviderPress={handleProviderPress} />
                            </View>
                        )}

                        {/* Skeleton de productos */}
                        <ProductsSkeleton columnsCount={2} itemsCount={6} />
                    </ScrollView>
                </View>
            );
        }

        const isLoading = isCategoryLoading(categoryIndex, getCurrentSubCategoryForCategory(categoryIndex));

        return (
            <View style={[styles.categoryPage, { width: screenWidth }]}>
                {/* Barra de subcategorías sticky - Solo mostrar si NO es "Todos" y hay subcategorías */}
                {shouldShowSubCategories && (
                    <Animated.View style={[
                        styles.stickySubCategoriesContainer,
                        {
                            transform: [{ translateY: subCategoriesTranslateY }]
                        }
                    ]}>
                        <View style={styles.subCategoriesBar}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.subCategoriesList}
                                contentContainerStyle={styles.subCategoriesScrollContent}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.subCategoryItem,
                                        getCurrentSubCategoryForCategory(categoryIndex) === 0 && styles.selectedSubCategory
                                    ]}
                                    onPress={() => handleSubCategoryPress(0)}
                                >
                                    <Text style={[
                                        styles.subCategoryText,
                                        getCurrentSubCategoryForCategory(categoryIndex) === 0 && styles.selectedSubCategoryText
                                    ]}>
                                        Todos
                                    </Text>
                                </TouchableOpacity>

                                {subCategories.map((subCategory, index) => (
                                    <TouchableOpacity
                                        key={subCategory.id || index}
                                        style={[
                                            styles.subCategoryItem,
                                            getCurrentSubCategoryForCategory(categoryIndex) === (index + 1) && styles.selectedSubCategory
                                        ]}
                                        onPress={() => handleSubCategoryPress(index + 1)}
                                    >
                                        <Text style={[
                                            styles.subCategoryText,
                                            getCurrentSubCategoryForCategory(categoryIndex) === (index + 1) && styles.selectedSubCategoryText
                                        ]}>
                                            {subCategory.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </Animated.View>
                )}

                <ScrollView
                    style={styles.categoryPage}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollViewContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            colors={['#fa7e17']}
                        />
                    }
                >
                    {/* Reels solo para categoría "Todos" */}
                    {categoryIndex === 0 && (
                        <View style={styles.reelsContainer}>
                            <Reels />
                        </View>
                    )}

                    {/* AutoCarousel solo para categoría "Todos" */}
                    {categoryIndex === 0 && (
                        <View style={styles.autoCarouselContainer}>
                            <AutoCarousel onProviderPress={handleProviderPress} />
                        </View>
                    )}

                    {/* Productos con padding superior para compensar sticky header */}
                    <View style={[
                        styles.productsList,
                        shouldShowSubCategories && styles.productsListWithStickyHeader
                    ]}>
                        {categoryState.products.length > 0 ? (
                            <View style={styles.masonryContainer}>
                                {distributeProductsInColumns(categoryState.products).map((columnProducts, columnIndex) =>
                                    renderMasonryColumn(columnProducts, columnIndex)
                                )}
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                {isLoading ? (
                                    <ProductsSkeleton columnsCount={2} itemsCount={4} />
                                ) : (
                                    <Text style={styles.emptyMessage}>
                                        No hay productos disponibles
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Indicador de carga sutil para infinite scroll estilo Amazon/Temu */}
                    {categoryState.isLoading && categoryState.products.length > 0 && (
                        <View style={styles.loadingMoreContainer}>
                            <View style={styles.loadingMoreContent}>
                                <ActivityIndicator color="#fa7e17" size="small" />
                                <Text style={styles.loadingMoreText}>Cargando más productos...</Text>
                            </View>
                            {/* Línea sutil de separación */}
                            <View style={styles.loadingMoreSeparator} />
                        </View>
                    )}

                    {/* Mensaje de fin si no hay más productos */}
                    {!categoryState.hasMore && categoryState.products.length > 0 && (
                        <View style={styles.endMessageContainer}>
                            <Text style={styles.endMessageText}>¡Has visto todos los productos!</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        );
    }, [categoryProducts, getCurrentSubCategories, handleSubCategoryPress, handleScroll, distributeProductsInColumns, renderMasonryColumn, isRefreshing, onRefresh, getCurrentSubCategoryForCategory, subCategoriesTranslateY]);

    // Mostrar skeleton si estamos cargando categorías o no está inicializado
    if (loading && (!categories || categories.length === 0)) {
        console.log('🔄 Mostrando loading inicial - categories.length:', categories?.length, 'loading:', loading);
        return (
            <View style={styles.container}>
                <Header selectedTab={selectedTab} onTabPress={onTabPress} onProductPress={onProductPress} onSearchPress={onSearchPress} isHome={true} />
                <BarSup
                    categories={[]}
                    currentCategory=""
                    onCategoryPress={() => { }}
                />
                <ProductsSkeleton columnsCount={2} itemsCount={6} />
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} />
            </View>
        );
    }

    // Si no hay categorías después de la inicialización, mostrar skeleton con mensaje
    if (homeInitialized && categories.length === 0) {
        console.log('❌ Home inicializado pero sin categorías disponibles');
        return (
            <View style={styles.container}>
                <Header selectedTab={selectedTab} onTabPress={onTabPress} onProductPress={onProductPress} onSearchPress={onSearchPress} isHome={true} />
                <BarSup
                    categories={[]}
                    currentCategory=""
                    onCategoryPress={() => { }}
                />
                <ProductsSkeleton columnsCount={2} itemsCount={6} />
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} />
            </View>
        );
    }

    console.log('🎯 Renderizando CategorySliderHome:', {
        categoriesCount: categories.length,
        currentCategoryIndex,
        homeInitialized,
        loading
    });

    return (
        <View style={styles.container}>
            <Header selectedTab={selectedTab} onTabPress={onTabPress} onProductPress={onProductPress} onSearchPress={onSearchPress} isHome={true} />

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
                onMomentumScrollEnd={handleCategoryScroll}
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

            <NavInf selectedTab={selectedTab} onTabPress={onTabPress} />
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
        flex: 1,
        backgroundColor: 'white',
    },
    scrollViewContent: {
        paddingBottom: 85, // Espacio para el NavInf (70px) + extra (15px)
    },
    autoCarouselContainer: {
        position: 'relative',
        zIndex: 1,
        backgroundColor: 'white',
    },
    reelsContainer: {
        backgroundColor: 'white',
        marginBottom: 10,
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
    productsList: {
        paddingHorizontal: 8,
        paddingTop: 10,
        paddingBottom: 100,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
        minHeight: 200,
    },
    emptyMessage: {
        textAlign: 'center',
        color: '#888',
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        marginTop: 10,
    },
    subCategoriesContainer: {
        backgroundColor: '#ffffff',
        width: '100%',
        overflow: 'hidden',
    },
    stickySubCategoriesContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        zIndex: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    productsListWithStickyHeader: {
        paddingTop: 65,
    },
    subCategoriesBar: {
        backgroundColor: '#ffffff',
        paddingVertical: 12,
        paddingHorizontal: 5,
        height: 65,
    },
    subCategoriesList: {
        flexGrow: 0,
        flexShrink: 0,
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
    loadingMoreContainer: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafafa',
        marginHorizontal: 8,
        marginVertical: 8,
        borderRadius: 8,
    },
    loadingMoreContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingMoreText: {
        marginLeft: 8,
        fontSize: 13,
        color: '#666',
        fontFamily: getUbuntuFont('regular'),
    },
    loadingMoreSeparator: {
        width: 30,
        height: 2,
        backgroundColor: '#fa7e17',
        marginTop: 8,
        borderRadius: 1,
        opacity: 0.3,
    },
    endMessageContainer: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    endMessageText: {
        fontSize: 14,
        color: '#999',
        fontFamily: getUbuntuFont('regular'),
        textAlign: 'center',
    },
});

export default CategorySliderHome;
