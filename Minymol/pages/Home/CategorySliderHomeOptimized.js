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
import Header from '../../components/Header/Header';
import NavInf from '../../components/NavInf/NavInf';
import Product from '../../components/Product/Product';
import ProductsSkeleton from '../../components/ProductsSkeleton/ProductsSkeleton';
import Reels from '../../components/Reels';
import { useAppState } from '../../contexts/AppStateContext';
import { getUbuntuFont } from '../../utils/fonts';
import subCategoriesManager from '../../utils/SubCategoriesManager';

const { width: screenWidth } = Dimensions.get('window');

const CategorySliderHome = ({ onProductPress, selectedTab = 'home', onTabPress, onSearchPress, isActive = true }) => {
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
    
    // ✅ OPTIMIZADO: Estado local para highlight instantáneo del BarSup (sin esperar contexto global)
    const [localCategoryIndex, setLocalCategoryIndex] = useState(currentCategoryIndex);

    // Estado unificado para manejar productos por categoría
    const [categoryProducts, setCategoryProducts] = useState({});

    // Estado para recordar la subcategoría seleccionada por cada categoría
    const [categorySubCategoryMemory, setCategorySubCategoryMemory] = useState({});

    // Función helper para obtener la subcategoría actual de una categoría específica
    const getCurrentSubCategoryForCategory = useCallback((categoryIndex) => {
        return categorySubCategoryMemory[categoryIndex] || 0; // 0 = "Todos" en UI
    }, [categorySubCategoryMemory]);

    // Función helper para convertir índice de UI a índice de API
    const convertUIIndexToAPIIndex = useCallback((uiIndex) => {
        // UI: 0="Todos", 1=primera subcategoría, 2=segunda subcategoría
        // API: -1="Todos", 0=primera subcategoría, 1=segunda subcategoría
        const apiIndex = uiIndex === 0 ? -1 : uiIndex - 1;
        console.log(`🔀 Conversión UI→API: UI(${uiIndex}) → API(${apiIndex})`);
        return apiIndex;
    }, []);

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
    const isProgrammaticScrollRef = useRef(false); // ✅ NUEVO: Flag para scroll programático
    const lastIndexRef = useRef(currentCategoryIndex); // ✅ Para evitar updates duplicados

    // Función helper para actualizar estado de productos por categoría
    const setCategoryProductsState = useCallback((categoryIndex, newState) => {
        setCategoryProducts(prev => {
            const currentState = prev[categoryIndex] || {
                allProducts: [], // Lista completa de productos
                products: [], // Productos visibles actualmente
                visibleCount: 0, // Cantidad de productos visibles
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

            // Obtener la subcategoría específica para esta categoría (UI index)
            const categorySubCategoryUIIndex = getCurrentSubCategoryForCategory(categoryIndex);
            // Convertir a API index para la petición
            const categorySubCategoryAPIIndex = convertUIIndexToAPIIndex(categorySubCategoryUIIndex);

            console.log(`🔄 Inicializando productos para categoría ${categoryIndex} - UI SubCat: ${categorySubCategoryUIIndex}, API SubCat: ${categorySubCategoryAPIIndex}`);
            console.log(`📊 Estado antes de cargar:`, currentState);

            // Marcar como cargando y ejecutar la carga async
            const newState = { ...currentState, isLoading: true };

            // Ejecutar la carga de productos de forma async (ahora devuelve TODOS los productos)
            loadCategoryProducts(categoryIndex, categorySubCategoryAPIIndex)
                .then(allProducts => {
                    const products = allProducts || [];
                    // ✅ MEGA OPTIMIZADO: Reducir carga inicial para dispositivos de gama baja
                    // 8 productos en lugar de 12 para carga más rápida
                    const initialCount = 8;
                    setCategoryProducts(prevState => ({
                        ...prevState,
                        [categoryIndex]: {
                            allProducts: products, // Guardar TODOS los productos
                            products: products.slice(0, initialCount), // Mostrar primeros 12
                            visibleCount: Math.min(initialCount, products.length), // Productos visibles
                            hasMore: products.length > initialCount,
                            isLoading: false,
                            initialized: true,
                            lastSubCategoryIndex: categorySubCategoryUIIndex
                        }
                    }));
                    console.log(`✅ Categoría ${categoryIndex} inicializada con ${products.length} productos totales, mostrando primeros ${initialCount}`);
                })
                .catch(error => {
                    console.error(`❌ Error inicializando categoría ${categoryIndex}:`, error);
                    setCategoryProducts(prevState => ({
                        ...prevState,
                        [categoryIndex]: {
                            allProducts: [],
                            products: [],
                            visibleCount: 0,
                            hasMore: false,
                            isLoading: false,
                            initialized: true,
                            lastSubCategoryIndex: categorySubCategoryUIIndex
                        }
                    }));
                });

            return {
                ...prev,
                [categoryIndex]: newState
            };
        });
    }, [loadCategoryProducts, getCurrentSubCategoryForCategory, convertUIIndexToAPIIndex]);

    // ✅ OPTIMIZADO: Cargar categorías solo cuando el componente está activo
    useEffect(() => {
        // ⚡ CRÍTICO: No ejecutar si la página no está activa
        if (!isActive) {
            console.log('⏸️ Home inactivo, deteniendo inicialización');
            return;
        }

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

        // Solo ejecutar si no está inicializado Y está activo
        if (!homeInitialized) {
            initializeHome();
        }
    }, [homeInitialized, loadCategories, setHomeInitialized, isActive]); // ✅ Agregado isActive

    // ✅ OPTIMIZADO: Sincronizar estado local con el contexto global
    // Solo cuando el contexto global cambie externamente (no por nuestras propias acciones)
    useEffect(() => {
        setLocalCategoryIndex(currentCategoryIndex);
    }, [currentCategoryIndex]);

    // Effect adicional para verificar que las categorías se cargaron correctamente
    // REMOVIDO para evitar loops infinitos - la lógica de recarga se maneja en la inicialización

    // ✅ MEGA OPTIMIZADO: Effect para cargar productos cuando cambia la categoría/subcategoría
    // SOLO se ejecuta cuando la página está activa
    useEffect(() => {
        // ⚡ CRÍTICO: No ejecutar si la página no está activa (performance en gama media/baja)
        if (!isActive) {
            console.log('⏸️ Home inactivo, pausando carga de productos');
            return;
        }

        if (!homeInitialized || !categories || categories.length === 0) return;

        // Obtener la subcategoría actual para esta categoría (UI index)
        const categorySubCategoryUIIndex = getCurrentSubCategoryForCategory(currentCategoryIndex);

        // Cuando cambia la subcategoría, necesitamos resetear la categoría actual
        setCategoryProducts(prevCategoryProducts => {
            const currentState = prevCategoryProducts[currentCategoryIndex];

            // Si la categoría no está inicializada o si cambió la subcategoría, reinicializar
            if (!currentState || !currentState.initialized || currentState.lastSubCategoryIndex !== categorySubCategoryUIIndex) {
                console.log(`🔄 Reinicializando categoría ${currentCategoryIndex} para subcategoría UI: ${categorySubCategoryUIIndex}`);

                // Resetear el estado de la categoría para la nueva subcategoría
                const resetState = {
                    allProducts: [],
                    products: [],
                    visibleCount: 0,
                    hasMore: true,
                    isLoading: false,
                    initialized: false,
                    lastSubCategoryIndex: categorySubCategoryUIIndex
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

        // ✅ MEGA OPTIMIZADO: Pre-carga solo si es gama alta (más de 4GB RAM estimado)
        // En dispositivos de gama baja, la pre-carga causa lag
        const preloadAdjacentCategories = async () => {
            // Solo pre-cargar si la app ha estado activa por más de 2 segundos
            // Esto asegura que la UI ya está renderizada
            setTimeout(() => {
                if (!isActive) return; // No pre-cargar si la página ya no está activa
                
                const totalCats = categories.length + 1; // +1 por "Todos"
                const nextIndex = (currentCategoryIndex + 1) % totalCats;
                
                // ✅ OPTIMIZADO: Solo pre-cargar la SIGUIENTE categoría (no la anterior)
                // Esto reduce el trabajo a la mitad
                setCategoryProducts(prev => {
                    const nextState = prev[nextIndex];
                    if (!nextState || !nextState.initialized) {
                        console.log(`⚡ Pre-cargando categoría siguiente: ${nextIndex}`);
                        initializeCategoryProducts(nextIndex);
                    }
                    return prev;
                });
            }, 800); // ✅ Aumentado de 300ms a 800ms para dar tiempo a la UI
        };

        // Solo pre-cargar si estamos activos
        if (isActive) {
            preloadAdjacentCategories();
        }

    }, [currentCategoryIndex, homeInitialized, categories.length, initializeCategoryProducts, getCurrentSubCategoryForCategory, categorySubCategoryMemory, categories, isActive]); // ✅ Agregado isActive

    // Función para refrescar productos
    const onRefresh = useCallback(async () => {
        console.log('🔄 Refrescando productos...');
        setIsRefreshing(true);

        try {
            // Recargar categorías
            await loadCategories();

            // Obtener la subcategoría específica para la categoría actual (UI index)
            const categorySubCategoryUIIndex = getCurrentSubCategoryForCategory(currentCategoryIndex);
            // Convertir a API index para la petición
            const categorySubCategoryAPIIndex = convertUIIndexToAPIIndex(categorySubCategoryUIIndex);

            // Reset del estado de la categoría actual
            const refreshedProducts = await loadCategoryProducts(currentCategoryIndex, categorySubCategoryAPIIndex, true);

            setCategoryProducts(prev => ({
                ...prev,
                [currentCategoryIndex]: {
                    allProducts: refreshedProducts || [],
                    products: (refreshedProducts || []).slice(0, 20),
                    visibleCount: Math.min(20, (refreshedProducts || []).length),
                    hasMore: (refreshedProducts || []).length > 20,
                    isLoading: false,
                    initialized: true,
                    lastSubCategoryIndex: categorySubCategoryUIIndex
                }
            }));

            console.log(`✅ Categoría ${currentCategoryIndex} refrescada con ${(refreshedProducts || []).length} productos totales, mostrando primeros 20`);
        } catch (error) {
            console.error('❌ Error refrescando:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [currentCategoryIndex, loadCategories, loadCategoryProducts, getCurrentSubCategoryForCategory, convertUIIndexToAPIIndex]);

    // Función para cargar más productos (infinite scroll) con lotes adaptativos - Ahora usa slice() en cliente
    const loadMoreProducts = useCallback(() => {
        setCategoryProducts(prev => {
            const currentState = prev[currentCategoryIndex] || {};

            if (currentState.isLoading || !currentState.hasMore || !currentState.initialized) {
                return prev;
            }

            const allProducts = currentState.allProducts || [];
            const currentVisibleCount = currentState.visibleCount || 12;
            
            // ✅ MEGA OPTIMIZADO: Lotes muy pequeños para dispositivos de gama baja
            let batchSize = 8; // Reducido de 12 a 8 para dispositivos lentos
            if (currentVisibleCount > 40) {
                batchSize = 12; // Lotes medianos después de scroll inicial
            } else if (currentVisibleCount > 80) {
                batchSize = 16; // Lotes más grandes para usuarios activos
            }
            
            const newVisibleCount = Math.min(currentVisibleCount + batchSize, allProducts.length);
            const hasMore = newVisibleCount < allProducts.length;
            
            console.log(`🔄 Mostrando más productos para categoría ${currentCategoryIndex}... visible: ${currentVisibleCount} → ${newVisibleCount}, total: ${allProducts.length}, batch: ${batchSize}`);

            // ✅ OPTIMIZADO: Delay reducido de 300ms a 150ms para carga más rápida
            setTimeout(() => {
                setCategoryProducts(prevState => {
                    const state = prevState[currentCategoryIndex] || {};
                    const newProducts = state.allProducts?.slice(0, newVisibleCount) || [];
                    
                    return {
                        ...prevState,
                        [currentCategoryIndex]: {
                            ...state,
                            products: newProducts,
                            visibleCount: newVisibleCount,
                            hasMore: newVisibleCount < (state.allProducts?.length || 0),
                            isLoading: false
                        }
                    };
                });
                
                console.log(`✅ ${batchSize} productos más mostrados (${newVisibleCount}/${allProducts.length})`);
            }, 150); // ✅ OPTIMIZADO: Reducido de 300ms a 150ms para carga más rápida

            return {
                ...prev,
                [currentCategoryIndex]: {
                    ...currentState,
                    isLoading: true
                }
            };
        });
    }, [currentCategoryIndex]);

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
        console.log('🔄 Cambio de categoría desde BarSup:', category?.name || 'Todos');

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
            // ✅ OPTIMIZADO: Actualizar índice local PRIMERO para highlight instantáneo
            setLocalCategoryIndex(newCategoryIndex);
            
            // ✅ OPTIMIZADO: Marcar que el scroll es programático
            isProgrammaticScrollRef.current = true;
            
            // ✅ OPTIMIZADO: Scroll instantáneo del FlatList (una sola vez, sin duplicados)
            if (categoryFlatListRef.current) {
                categoryFlatListRef.current.scrollToIndex({
                    index: newCategoryIndex,
                    animated: false, // Sin animación para cambio instantáneo
                });
            }
            
            // Actualizar contexto global (puede tomar tiempo, pero el highlight ya está actualizado)
            changeCategory(newCategoryIndex);

            // Restaurar la subcategoría recordada para esta categoría
            const rememberedSubCategory = getCurrentSubCategoryForCategory(newCategoryIndex);
            
            // Actualizar la subcategoría si es diferente
            if (rememberedSubCategory !== currentSubCategoryIndex) {
                changeSubCategory(rememberedSubCategory);
            }

            // Reset scroll position y animaciones
            setLastScrollY(0);
            setShowSubCategories(true);
            subCategoriesTranslateY.setValue(0); // Resetear posición del sticky header
            
            // ✅ Resetear la bandera de scroll programático después de un delay
            setTimeout(() => {
                isProgrammaticScrollRef.current = false;
            }, 100);
        }
    }, [currentCategoryIndex, currentSubCategoryIndex, categories, changeCategory, changeSubCategory, getCurrentSubCategoryForCategory, setSubCategoryForCategory, subCategoriesTranslateY]);

    // Manejar cambio de categoría desde el FlatList horizontal (cuando el usuario swipea)
    // ✅ MEGA OPTIMIZADO: Actualización DIRECTA sin cálculos complejos
    const handleCategoryScroll = useCallback((event) => {
        // ✅ CRÍTICO: Ignorar eventos de scroll si fue iniciado programáticamente
        if (isProgrammaticScrollRef.current) {
            return;
        }
        
        const offsetX = event.nativeEvent.contentOffset.x;
        
        // ✅ SIMPLIFICADO: Calcular el índice más cercano basado en la posición actual
        const newIndex = Math.round(offsetX / screenWidth);
        
        // Solo actualizar si cambió el índice y es válido
        if (newIndex !== localCategoryIndex && newIndex >= 0 && newIndex < categories.length + 1) {
            console.log(`🎯 Cambio detectado: ${localCategoryIndex} → ${newIndex}`);
            
            // ✅ CRÍTICO: Actualizar AMBOS estados de inmediato
            setLocalCategoryIndex(newIndex);
            
            // Actualizar contexto global solo si es diferente
            if (newIndex !== currentCategoryIndex) {
                changeCategory(newIndex);
            }
        }
    }, [categories.length, currentCategoryIndex, localCategoryIndex, changeCategory]);

    // ✅ OPTIMIZADO: Renderizar BarSup inline SIN useMemo para actualización INSTANTÁNEA del highlight
    // Usa localCategoryIndex en lugar de currentCategoryIndex para actualización sin delay
    const renderBarSup = () => {
        // ✅ CRÍTICO: Usar localCategoryIndex para highlight instantáneo (no espera contexto global)
        const currentCategorySlug = localCategoryIndex === 0 
            ? '' 
            : (categories[localCategoryIndex - 1]?.slug || '');

        return (
            <View style={barSupStyles.barSup}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={barSupStyles.scrollContent}
                >
                    {/* Botón "Todos" */}
                    <TouchableOpacity
                        style={barSupStyles.linkSup}
                        onPress={() => handleCategoryPress(null)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            barSupStyles.linkText, 
                            currentCategorySlug === '' && barSupStyles.selected
                        ]}>
                            Todos
                        </Text>
                    </TouchableOpacity>

                    {/* Categorías */}
                    {categories.map((cat) => {
                        const isSelected = currentCategorySlug === cat.slug;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={barSupStyles.linkSup}
                                onPress={() => handleCategoryPress(cat)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    barSupStyles.linkText, 
                                    isSelected && barSupStyles.selected
                                ]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

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
        <View key={columnIndex} style={[
            styles.masonryColumn,
            columnIndex === 0 ? styles.leftColumn : styles.rightColumn
        ]}>
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
        
        // ✅ MEGA OPTIMIZADO: Carga MÁS anticipada (60% en lugar de 70%) para gama baja
        // Dispositivos lentos necesitan más tiempo para renderizar
        const preloadThreshold = 60; // Reducido de 70% a 60% para dispositivos lentos
        
        // Verificar si necesitamos cargar más productos
        const shouldLoadMore = scrollPercentage >= preloadThreshold && 
                              currentState.hasMore && 
                              !currentState.isLoading && 
                              currentState.initialized &&
                              contentSize.height > layoutMeasurement.height; // Solo si hay contenido para hacer scroll

        if (shouldLoadMore) {
            // ✅ MEGA OPTIMIZADO: Throttling mínimo (200ms) para cargas muy rápidas
            const now = Date.now();
            if (!scrollThrottleRef.current || (now - scrollThrottleRef.current) > 200) {
                scrollThrottleRef.current = now;
                console.log(`🚀 Carga anticipada activada al ${scrollPercentage.toFixed(1)}% (threshold: ${preloadThreshold}%) con ${currentProductCount} productos`);
                loadMoreProducts();
            }
        }
    }, [lastScrollY, showSubCategories, categoryProducts, currentCategoryIndex, loadMoreProducts]);

    // ✅ OPTIMIZADO: Renderizar barra de subcategorías estática para cada categoría
    const renderSubCategoriesBar = useCallback((categoryIndex) => {
        // No renderizar para "Todos" (índice 0)
        if (categoryIndex === 0) return null;

        // Obtener subcategorías específicas para esta categoría
        const category = categories[categoryIndex - 1]; // -1 porque 0 es "Todos"
        if (!category || !category.slug) return null;

        const subCategories = subCategoriesManager.getSubcategoriesByCategory(category.slug) || [];
        if (subCategories.length === 0) return null;

        return (
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
        );
    }, [categories, getCurrentSubCategoryForCategory, handleSubCategoryPress, subCategoriesTranslateY]);

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

        // ✅ OPTIMIZADO: Obtener subcategorías específicas para esta categoría (sin usar getCurrentSubCategories compartido)
        const category = categories[categoryIndex - 1]; // -1 porque 0 es "Todos"
        const hasSubCategories = categoryIndex !== 0 && category && category.slug && 
                                (subCategoriesManager.getSubcategoriesByCategory(category.slug) || []).length > 0;

        const isLoading = isCategoryLoading(categoryIndex, getCurrentSubCategoryForCategory(categoryIndex));

        return (
            <View style={[styles.categoryPage, { width: screenWidth }]}>
                {/* ✅ OPTIMIZADO: Barra de subcategorías estática para cada categoría */}
                {hasSubCategories && renderSubCategoriesBar(categoryIndex)}

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
                        hasSubCategories && styles.productsListWithStickyHeader
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
    }, [categoryProducts, handleSubCategoryPress, handleScroll, distributeProductsInColumns, renderMasonryColumn, isRefreshing, onRefresh, getCurrentSubCategoryForCategory, subCategoriesTranslateY, renderSubCategoriesBar, categories, handleProviderPress, isCategoryLoading]);

    // Mostrar loading simple si estamos cargando categorías inicialmente
    if (loading && (!categories || categories.length === 0)) {
        return (
            <View style={styles.container}>
                <Header selectedTab={selectedTab} onTabPress={onTabPress} onProductPress={onProductPress} onSearchPress={onSearchPress} isHome={true} />
                
                {/* BarSup vacío mientras carga */}
                <View style={barSupStyles.barSup}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={barSupStyles.scrollContent}
                    >
                        <TouchableOpacity style={barSupStyles.linkSup} activeOpacity={0.7}>
                            <Text style={[barSupStyles.linkText, barSupStyles.selected]}>
                                Todos
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* ✅ OPTIMIZADO: Indicador simple en lugar de skeleton */}
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fa7e17" />
                    <Text style={styles.loadingText}>Cargando categorías...</Text>
                </View>
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} />
            </View>
        );
    }

    // Si no hay categorías después de la inicialización, mostrar mensaje
    if (homeInitialized && categories.length === 0) {
        return (
            <View style={styles.container}>
                <Header selectedTab={selectedTab} onTabPress={onTabPress} onProductPress={onProductPress} onSearchPress={onSearchPress} isHome={true} />
                
                {/* BarSup vacío si no hay categorías */}
                <View style={barSupStyles.barSup}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={barSupStyles.scrollContent}
                    >
                        <TouchableOpacity style={barSupStyles.linkSup} activeOpacity={0.7}>
                            <Text style={[barSupStyles.linkText, barSupStyles.selected]}>
                                Todos
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* ✅ Mensaje en lugar de skeleton */}
                <View style={styles.loadingContainer}>
                    <Text style={styles.emptyText}>No hay categorías disponibles</Text>
                </View>
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header selectedTab={selectedTab} onTabPress={onTabPress} onProductPress={onProductPress} onSearchPress={onSearchPress} isHome={true} />

            {/* ✅ OPTIMIZADO: BarSup inline con actualización instantánea - Renderizado directo sin memoización */}
            {renderBarSup()}

            <FlatList
                ref={categoryFlatListRef}
                data={Array.from({ length: totalCategories }, (_, index) => index)}
                renderItem={renderCategoryPage}
                keyExtractor={(item) => `category-${item}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleCategoryScroll}
                scrollEventThrottle={16}
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
        paddingLeft: 0,
        paddingRight: 4,
    },
    leftColumn: {
        paddingLeft: 0,
        paddingRight: 2,
    },
    rightColumn: {
        paddingLeft: 2,
        paddingRight: 0,
    },
    masonryItem: {
        marginBottom: 8,
    },
    productsList: {
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

// ✅ OPTIMIZADO: Estilos del BarSup inline para mejor performance
const barSupStyles = StyleSheet.create({
    barSup: {
        backgroundColor: '#2d2d58',
        width: '100%',
        paddingVertical: 5,
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    linkSup: {
        paddingHorizontal: 15,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkText: {
        color: 'white',
        fontSize: 15,
        fontFamily: getUbuntuFont('regular'),
        textAlign: 'center',
    },
    selected: {
        color: '#fa7e17',
    },
});

// ✅ OPTIMIZACIÓN REMOVIDA: React.memo estaba bloqueando re-renders del estado local
// Ahora el componente se actualiza instantáneamente cuando cambia localCategoryIndex
export default CategorySliderHome;
