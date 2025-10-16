import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    InteractionManager,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Header from '../../components/Header/Header';
import NavInf from '../../components/NavInf/NavInf';
import Product from '../../components/Product/Product';
import { useAppState } from '../../contexts/AppStateContext';
import { useCartCounter } from '../../contexts/CartCounterContext';
import ProductDetail from '../../pages/ProductDetail/ProductDetailSimple';
import { getUbuntuFont } from '../../utils/fonts';
import subCategoriesManager from '../../utils/SubCategoriesManager';

// ✅ MEGA OPTIMIZACIÓN: Lazy loading de componentes pesados
// Estos solo se cargan cuando son necesarios, reduciendo el bundle inicial
const AutoCarousel = lazy(() => import('../../components/AutoCarousel'));
const Reels = lazy(() => import('../../components/Reels'));

const { width: screenWidth } = Dimensions.get('window');

const CategorySliderHome = ({ onProductPress, selectedTab = 'home', onTabPress, onSearchPress, isActive = true }) => {
    // 🚀 NUEVO: Obtener contador ultrarrápido directamente
    const { count: cartItemCount } = useCartCounter();
    
    // 🚀 MEGA OPTIMIZACIÓN: Renderizado lazy después de interacciones
    // Esto permite que la UI base se monte PRIMERO, y luego se cargue el contenido pesado
    const [isReady, setIsReady] = useState(false);
    
    // ✅ NUEVO: Loader global para carga inicial (Carousel + Reels + Productos)
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const hasHiddenLoaderRef = useRef(false); // Ref para evitar ocultar el loader múltiples veces
    
    // 🔥 NUEVO: Estados para ProductDetail modal
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showProductDetail, setShowProductDetail] = useState(false);
    
    useEffect(() => {
        if (isActive) {
            // Esperar a que terminen todas las interacciones actuales
            const task = InteractionManager.runAfterInteractions(() => {
                setIsReady(true);
            });
            
            return () => task.cancel();
        }
    }, [isActive]);

    // ✅ NUEVO: Timeout de seguridad para ocultar el loader después de 3 segundos máximo
    useEffect(() => {
        if (isActive && isInitialLoading && !hasHiddenLoaderRef.current) {
            const safetyTimeout = setTimeout(() => {
                console.log('⏱️ Timeout de seguridad: ocultando loader global');
                hasHiddenLoaderRef.current = true;
                setIsInitialLoading(false);
            }, 3000); // 3 segundos máximo
            
            return () => clearTimeout(safetyTimeout);
        }
    }, [isActive, isInitialLoading]);
    
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
        // TODO: Aquí debería abrirse un modal de proveedor o navegar a la página del proveedor
        // NO debe abrir el SearchModal
        
        // ❌ COMENTADO: Esto estaba causando que se abriera el SearchModal al seleccionar un proveedor
        // if (onSearchPress) {
        //     onSearchPress(provider.nombre_empresa);
        // }
    }, []);

    // Estados locales para UI
    const [showSubCategories, setShowSubCategories] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // ✅ OPTIMIZADO: Estado local para highlight instantáneo del BarSup (sin esperar contexto global)
    const [localCategoryIndex, setLocalCategoryIndex] = useState(currentCategoryIndex);

    // ✅ MEGA OPTIMIZACIÓN: Seed único por sesión para orden aleatorio consistente (como Temu)
    // Se regenera solo cuando el usuario hace refresh explícito
    const [feedSeed, setFeedSeed] = useState(() => Math.random().toString(36).substring(2, 10));

    // ✅ NUEVO: Estado optimizado para productos con cursor pagination
    // Estructura: { [categoryIndex]: { products: [], nextCursor: null, hasMore: true, isLoading: false, ... } }
    const [categoryProducts, setCategoryProducts] = useState({});

    // Estado para recordar la subcategoría seleccionada por cada categoría
    const [categorySubCategoryMemory, setCategorySubCategoryMemory] = useState({});

    // Función helper para obtener la subcategoría actual de una categoría específica
    const getCurrentSubCategoryForCategory = useCallback((categoryIndex) => {
        return categorySubCategoryMemory[categoryIndex] || 0; // 0 = "Todos" en UI
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

    // ✅ NUEVO: Ocultar loader cuando los productos se inicializan (sin esperar carousel/reels)
    useEffect(() => {
        const categoryState = categoryProducts[0];
        if (categoryState?.initialized && !hasHiddenLoaderRef.current) {
            const timer = setTimeout(() => {
                console.log('✅ Productos inicializados: ocultando loader global');
                hasHiddenLoaderRef.current = true;
                setIsInitialLoading(false);
            }, 500); // Pequeño delay para que se vean los componentes
            return () => clearTimeout(timer);
        }
    }, [categoryProducts]);

    // Hook para forzar re-render cuando se actualizan las subcategorías
    const [, forceUpdate] = useState({});

    // ✅ MEGA OPTIMIZACIÓN: Animaciones - crear valores pero NO iniciar hasta que esté activo
    const subCategoriesHeight = useRef(new Animated.Value(65)).current;
    const subCategoriesTranslateY = useRef(new Animated.Value(0)).current;
    
    // ✅ Flag para saber si las animaciones ya fueron inicializadas
    const animationsInitialized = useRef(false);

    // ✅ MEGA OPTIMIZACIÓN: Inicializar animaciones solo cuando el componente está activo
    useEffect(() => {
        if (isActive && !animationsInitialized.current) {
            console.log('🎬 Inicializando animaciones...');
            animationsInitialized.current = true;
            // Las animaciones ya están en su valor inicial, solo marcar como listas
        }
    }, [isActive]);

    // Referencias
    const categoryFlatListRef = useRef(null);
    const scrollThrottleRef = useRef(null); // Para throttling del scroll anticipado
    const isProgrammaticScrollRef = useRef(false); // ✅ NUEVO: Flag para scroll programático
    const lastIndexRef = useRef(currentCategoryIndex); // ✅ Para evitar updates duplicados

    // Función helper para actualizar estado de productos por categoría
    const setCategoryProductsState = useCallback((categoryIndex, newState) => {
        setCategoryProducts(prev => ({
            ...prev,
            [categoryIndex]: {
                ...(prev[categoryIndex] || {}),
                ...newState
            }
        }));
    }, []);

    // ✅ MEGA OPTIMIZACIÓN: Cargar productos con nuevo endpoint /products/feed
    const loadProductsWithFeed = useCallback(async (categoryIndex, subCategoryIndex, cursor = null) => {
        try {
            const category = categoryIndex === 0 ? null : categories[categoryIndex - 1];
            const categorySlug = category?.slug;
            
            // ✅ CORREGIDO: Construir URL con parámetros correctamente tipados
            const params = new URLSearchParams();
            params.append('seed', feedSeed);
            params.append('limit', '20'); // El backend lo parsea correctamente

            if (categorySlug) {
                params.append('categorySlug', categorySlug);
            }

            // Si hay subcategoría seleccionada (no "Todos")
            if (subCategoryIndex > 0 && category) {
                const subCategories = subCategoriesManager.getSubcategoriesByCategory(categorySlug) || [];
                const subCategory = subCategories[subCategoryIndex - 1]; // -1 porque índice 0 es "Todos"
                if (subCategory?.slug) {
                    params.append('subCategorySlug', subCategory.slug);
                }
            }

            if (cursor) {
                params.append('cursor', cursor);
            }

            const url = `https://api.minymol.com/products/feed?${params.toString()}`;
            console.log(`🚀 Cargando productos desde /feed:`, url);

            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error del servidor:', response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const { data, nextCursor, hasMore } = await response.json();

            console.log(`✅ Feed cargado: ${data.length} productos, hasMore: ${hasMore}, nextCursor: ${nextCursor}`);

            return { products: data, nextCursor, hasMore };

        } catch (error) {
            console.error('❌ Error cargando feed de productos:', error);
            return { products: [], nextCursor: null, hasMore: false };
        }
    }, [categories, feedSeed]);

    // ✅ OPTIMIZADO: Función para inicializar productos de una categoría específica
    const initializeCategoryProducts = useCallback(async (categoryIndex) => {
        setCategoryProducts(prev => {
            const currentState = prev[categoryIndex] || {
                products: [],
                nextCursor: null,
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

            console.log(`🔄 Inicializando productos para categoría ${categoryIndex} - SubCat: ${categorySubCategoryUIIndex}`);

            // Marcar como cargando
            const newState = { ...currentState, isLoading: true };

            // ✅ MEGA OPTIMIZACIÓN: Cargar primera página con nuevo endpoint /feed
            loadProductsWithFeed(categoryIndex, categorySubCategoryUIIndex, null)
                .then(({ products, nextCursor, hasMore }) => {
                    setCategoryProducts(prevState => ({
                        ...prevState,
                        [categoryIndex]: {
                            products,
                            nextCursor,
                            hasMore,
                            isLoading: false,
                            initialized: true,
                            lastSubCategoryIndex: categorySubCategoryUIIndex
                        }
                    }));
                    console.log(`✅ Categoría ${categoryIndex} inicializada con ${products.length} productos`);
                })
                .catch(error => {
                    console.error(`❌ Error inicializando categoría ${categoryIndex}:`, error);
                    setCategoryProducts(prevState => ({
                        ...prevState,
                        [categoryIndex]: {
                            products: [],
                            nextCursor: null,
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
    }, [loadProductsWithFeed, getCurrentSubCategoryForCategory]);

    // ✅ OPTIMIZADO: Cargar categorías solo cuando el componente está activo Y listo
    useEffect(() => {
        // ⚡ CRÍTICO: No ejecutar si la página no está activa o no está lista
        if (!isActive || !isReady) {
            console.log('⏸️ Home inactivo o no listo, deteniendo inicialización');
            return;
        }

        // 🚀 ULTRA OPTIMIZACIÓN: Esperar a que terminen las animaciones/interacciones
        const handle = InteractionManager.runAfterInteractions(() => {
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
        });

        // Cleanup: cancelar si el componente se desmonta o se desactiva
        return () => handle.cancel();
    }, [homeInitialized, loadCategories, setHomeInitialized, isActive, isReady]); // ✅ Agregado isReady

    // ✅ OPTIMIZADO: Sincronizar estado local con el contexto global
    // Solo cuando el contexto global cambie externamente (no por nuestras propias acciones)
    useEffect(() => {
        setLocalCategoryIndex(currentCategoryIndex);
    }, [currentCategoryIndex]);

    // Effect adicional para verificar que las categorías se cargaron correctamente
    // REMOVIDO para evitar loops infinitos - la lógica de recarga se maneja en la inicialización

    // ✅ MEGA OPTIMIZADO: Effect para cargar productos cuando cambia la categoría/subcategoría
    // SOLO se ejecuta cuando la página está activa Y lista
    useEffect(() => {
        // ⚡ CRÍTICO: No ejecutar si la página no está activa o no está lista
        if (!isActive || !isReady) {
            console.log('⏸️ Home inactivo o no listo, pausando carga de productos');
            return;
        }

        if (!homeInitialized || !categories || categories.length === 0) return;

        // 🚀 ULTRA OPTIMIZACIÓN: Esperar a que terminen las animaciones
        const handle = InteractionManager.runAfterInteractions(() => {
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

            // Solo pre-cargar si estamos activos Y listos
            if (isActive && isReady) {
                preloadAdjacentCategories();
            }
        });

        // Cleanup: cancelar si el componente se desmonta o se desactiva
        return () => handle.cancel();

    }, [currentCategoryIndex, homeInitialized, categories.length, initializeCategoryProducts, getCurrentSubCategoryForCategory, categorySubCategoryMemory, categories, isActive, isReady]); // ✅ Agregado isReady

    // ✅ OPTIMIZADO: Función para refrescar productos con nuevo endpoint
    const onRefresh = useCallback(async () => {
        console.log('🔄 Refrescando productos...');
        setIsRefreshing(true);

        try {
            // ✅ Generar NUEVO seed para mostrar productos diferentes
            const newSeed = Math.random().toString(36).substring(2, 10);
            setFeedSeed(newSeed);
            console.log(`🎲 Nuevo seed generado: ${newSeed}`);

            // Recargar categorías
            await loadCategories();

            // Obtener la subcategoría específica para la categoría actual (UI index)
            const categorySubCategoryUIIndex = getCurrentSubCategoryForCategory(currentCategoryIndex);

            // ✅ MEGA OPTIMIZACIÓN: Cargar desde cero con nuevo endpoint (sin cursor)
            const { products, nextCursor, hasMore } = await loadProductsWithFeed(
                currentCategoryIndex, 
                categorySubCategoryUIIndex, 
                null
            );

            setCategoryProducts(prev => ({
                ...prev,
                [currentCategoryIndex]: {
                    products,
                    nextCursor,
                    hasMore,
                    isLoading: false,
                    initialized: true,
                    lastSubCategoryIndex: categorySubCategoryUIIndex
                }
            }));

            console.log(`✅ Categoría ${currentCategoryIndex} refrescada con ${products.length} productos`);
        } catch (error) {
            console.error('❌ Error refrescando:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [currentCategoryIndex, loadCategories, loadProductsWithFeed, getCurrentSubCategoryForCategory]);

    // ✅ MEGA OPTIMIZACIÓN: Infinite scroll con cursor pagination REAL (como Temu)
    const loadMoreProducts = useCallback(() => {
        setCategoryProducts(prev => {
            const currentState = prev[currentCategoryIndex] || {};

            // No cargar si ya está cargando, no hay más, o no está inicializada
            if (currentState.isLoading || !currentState.hasMore || !currentState.initialized) {
                return prev;
            }

            // Verificar que tenemos un cursor para la siguiente página
            if (!currentState.nextCursor) {
                console.log('⚠️ No hay nextCursor disponible');
                return prev;
            }

            console.log(`🔄 Cargando más productos para categoría ${currentCategoryIndex} con cursor: ${currentState.nextCursor}`);

            // Marcar como cargando
            const newState = { ...currentState, isLoading: true };

            // Obtener la subcategoría específica para esta categoría
            const categorySubCategoryUIIndex = getCurrentSubCategoryForCategory(currentCategoryIndex);

            // ✅ Cargar siguiente página con cursor pagination
            loadProductsWithFeed(currentCategoryIndex, categorySubCategoryUIIndex, currentState.nextCursor)
                .then(({ products: newProducts, nextCursor, hasMore }) => {
                    setCategoryProducts(prevState => {
                        const state = prevState[currentCategoryIndex] || {};
                        
                        return {
                            ...prevState,
                            [currentCategoryIndex]: {
                                ...state,
                                products: [...(state.products || []), ...newProducts], // Concatenar nuevos productos
                                nextCursor, // Actualizar cursor
                                hasMore, // Actualizar flag
                                isLoading: false
                            }
                        };
                    });
                    
                    console.log(`✅ ${newProducts.length} productos más cargados. Total: ${(currentState.products?.length || 0) + newProducts.length}`);
                })
                .catch(error => {
                    console.error('❌ Error cargando más productos:', error);
                    setCategoryProducts(prevState => ({
                        ...prevState,
                        [currentCategoryIndex]: {
                            ...prevState[currentCategoryIndex],
                            isLoading: false
                        }
                    }));
                });

            return {
                ...prev,
                [currentCategoryIndex]: newState
            };
        });
    }, [currentCategoryIndex, loadProductsWithFeed, getCurrentSubCategoryForCategory]);

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
                            console.log('🔄 CategorySliderHome: Abriendo ProductDetail modal:', product?.name);
                            setSelectedProduct(product);
                            setShowProductDetail(true);
                        }}
                    />
                </View>
            ))}
        </View>
    ), [onProductPress]);

    // Función para cerrar ProductDetail modal
    const handleCloseProductDetail = () => {
        console.log('🔄 CategorySliderHome: Cerrando ProductDetail modal');
        setShowProductDetail(false);
        setSelectedProduct(null);
    };

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

        // ✅ MEGA OPTIMIZACIÓN: Infinite scroll con cursor pagination real
        // Carga anticipada al 60% para dispositivos de gama baja
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        
        // Calcular el porcentaje de scroll
        const scrollPercentage = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;
        
        const currentState = categoryProducts[currentCategoryIndex] || {};
        
        // Carga anticipada (60%) para dar tiempo al servidor a responder
        const preloadThreshold = 60;
        
        // Verificar si necesitamos cargar más productos desde el servidor
        const shouldLoadMore = scrollPercentage >= preloadThreshold && 
                              currentState.hasMore && 
                              !currentState.isLoading && 
                              currentState.initialized &&
                              currentState.nextCursor && // ✅ Verificar que tenemos cursor
                              contentSize.height > layoutMeasurement.height;

        if (shouldLoadMore) {
            // ✅ MEGA OPTIMIZADO: Throttling mínimo (200ms) para cargas muy rápidas
            const now = Date.now();
            if (!scrollThrottleRef.current || (now - scrollThrottleRef.current) > 200) {
                scrollThrottleRef.current = now;
                const currentProductCount = currentState.products?.length || 0;
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
        // ✅ OPTIMIZADO: Obtener el estado de los productos de esta categoría
        const categoryState = categoryProducts[categoryIndex] || {
            products: [],
            nextCursor: null,
            hasMore: true,
            isLoading: false,
            initialized: false,
            lastSubCategoryIndex: 0
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
                    {/* ✅ MEGA OPTIMIZACIÓN: Reels solo para categoría "Todos" con lazy loading */}
                    {categoryIndex === 0 && isActive && (
                        <View style={[styles.reelsContainer, isInitialLoading && styles.hiddenContent]}>
                            <Suspense fallback={null}>
                                <Reels />
                            </Suspense>
                        </View>
                    )}

                    {/* ✅ MEGA OPTIMIZACIÓN: AutoCarousel solo para categoría "Todos" con lazy loading */}
                    {categoryIndex === 0 && isActive && (
                        <View style={[styles.autoCarouselContainer, isInitialLoading && styles.hiddenContent]}>
                            <Suspense fallback={null}>
                                <AutoCarousel 
                                    onProviderPress={handleProviderPress}
                                />
                            </Suspense>
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
                                {/* ✅ Mostrar loader si está cargando O si no está inicializada */}
                                {(isLoading || !categoryState.initialized) ? (
                                    <ActivityIndicator size="large" color="#fa7e17" />
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

                    {/* ✅ Mensaje de fin con loader mientras valida si hay más */}
                    {categoryState.products.length > 0 && !categoryState.hasMore && !categoryState.isLoading && (
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

                {/* ✅ OPTIMIZADO: Solo loader, sin texto */}
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fa7e17" />
                </View>
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} cartItemCount={cartItemCount} />
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
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} cartItemCount={cartItemCount} />
            </View>
        );
    }

    // 🚀 MEGA OPTIMIZACIÓN: Si no está listo aún, mostrar UI mínima mientras se monta el resto
    if (!isReady && isActive) {
        return (
            <View style={styles.container}>
                <Header selectedTab={selectedTab} onTabPress={onTabPress} onProductPress={onProductPress} onSearchPress={onSearchPress} isHome={true} />
                
                {/* BarSup básico */}
                <View style={barSupStyles.barSup}>
                    <ActivityIndicator size="small" color="#fa7e17" style={{ margin: 10 }} />
                </View>
                
                {/* Skeleton ligero */}
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fa7e17" />
                    <Text style={styles.loadingText}>Cargando...</Text>
                </View>
                
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} cartItemCount={cartItemCount} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header selectedTab={selectedTab} onTabPress={onTabPress} onProductPress={onProductPress} onSearchPress={onSearchPress} isHome={true} />

            {/* ✅ NUEVO: Loader global para carga inicial */}
            {isInitialLoading && (
                <View style={styles.globalLoadingOverlay}>
                    <ActivityIndicator size="large" color="#fa7e17" />
                    <Text style={styles.globalLoadingText}>Cargando contenido...</Text>
                </View>
            )}

            {/* ✅ OPTIMIZADO: BarSup inline con actualización instantánea - Renderizado directo sin memoización */}
            {renderBarSup()}

            {/* ✅ MEGA OPTIMIZACIÓN: FlatList con configuración ultra-agresiva para gama baja */}
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
                windowSize={2} // ✅ Reducido de 3 a 2 para menor consumo de memoria
                initialNumToRender={1} // ✅ Solo renderizar la pantalla actual
                maxToRenderPerBatch={1} // ✅ Solo 1 pantalla a la vez
                removeClippedSubviews={true} // ✅ Activado para remover vistas fuera de pantalla
                decelerationRate="fast"
                updateCellsBatchingPeriod={100} // ✅ Actualizar en lotes más frecuentes
            />

            <NavInf selectedTab={selectedTab} onTabPress={onTabPress} cartItemCount={cartItemCount} />

            {/* 🔥 ProductDetail Modal */}
            {showProductDetail && selectedProduct && (
                <Modal
                    visible={showProductDetail}
                    transparent={false}
                    animationType="slide"
                    onRequestClose={handleCloseProductDetail}
                    statusBarTranslucent={true}
                >
                    <ProductDetail
                        route={{ params: { product: selectedProduct } }}
                        navigation={{ goBack: handleCloseProductDetail }}
                        isModal={true}
                    />
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    globalLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 70, // Espacio para NavInf
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    globalLoadingText: {
        color: '#333',
        marginTop: 12,
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
    },
    hiddenContent: {
        opacity: 0,
        position: 'absolute',
        left: -9999,
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
    // ✅ MEGA OPTIMIZACIÓN: Estilos para lazy loading fallbacks
    lazyLoadingContainer: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
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
