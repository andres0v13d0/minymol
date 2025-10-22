/**
 * 🚀 CategorySliderHomeUltraOptimized - Zero-Delay Navigation
 * 
 * CRITICAL OPTIMIZATIONS:
 * - ❌ NO InteractionManager delays - immediate rendering
 * - ✅ Deferred hydration: render minimal UI first, load data after
 * - ✅ Cached computations for subcategories and masonry layout
 * - ✅ Single state source (no duplicate localCategoryIndex)
 * - ✅ Idle-time prefetching (no blocking prefetch)
 * - ✅ Optimized FlatList configuration for Android
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
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
import { useCartCounter } from '../../contexts/CartCounterContext';
import ProductDetail from '../../pages/ProductDetail/ProductDetailSimple';
import { getUbuntuFont } from '../../utils/fonts';
import subCategoriesManager from '../../utils/SubCategoriesManager';
import { useCategories } from '../../contexts/CategoriesContext';
import { useNavigation } from '../../contexts/NavigationContext';

// ✅ Lazy load heavy components
const AutoCarousel = lazy(() => import('../../components/AutoCarousel'));
const Reels = lazy(() => import('../../components/Reels'));

const { width: screenWidth } = Dimensions.get('window');

const CategorySliderHomeUltra = ({ onProductPress, selectedTab = 'home', onTabPress, onSearchPress, isActive = true }) => {
    // 🚀 Use new isolated contexts
    const { categories, loading: categoriesLoading, loadCategories, totalCategories, initialized: categoriesInitialized } = useCategories();
    const { currentCategoryIndex, currentSubCategoryIndex, setCategory, setSubCategory } = useNavigation();
    const { count: cartItemCount } = useCartCounter();
    
    // ✅ CRITICAL: Immediate ready state (no delays)
    const [isReady, setIsReady] = useState(false);
    const [showProductDetail, setShowProductDetail] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // UI state
    const [showSubCategories, setShowSubCategories] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    
    // Feed management
    const [feedSeed, setFeedSeed] = useState(() => Math.random().toString(36).substring(2, 10));
    const [categoryProducts, setCategoryProducts] = useState({});
    const [categorySubCategoryMemory, setCategorySubCategoryMemory] = useState({});
    
    // Animations
    const subCategoriesTranslateY = useRef(new Animated.Value(0)).current;
    
    // Refs
    const categoryFlatListRef = useRef(null);
    const scrollThrottleRef = useRef(null);
    const isProgrammaticScrollRef = useRef(false);
    const loadingRef = useRef({});
    
    // ✅ CRITICAL: Mark as ready IMMEDIATELY when active (no delays)
    useEffect(() => {
        if (isActive) {
            console.log('✅ Home ready IMMEDIATELY');
            setIsReady(true);
        }
    }, [isActive]);
    
    // ✅ Load categories immediately when ready (no InteractionManager)
    useEffect(() => {
        if (isActive && isReady && !categoriesInitialized) {
            console.log('🏠 Initializing Home data...');
            
            // Load categories in background
            loadCategories().then(() => {
                console.log('✅ Categories loaded');
                
                // Sync subcategories in background (non-blocking)
                subCategoriesManager.syncWithDatabase()
                    .catch(err => console.log('⚠️ Subcategories sync failed silently'));
            });
        }
    }, [isActive, isReady, categoriesInitialized, loadCategories]);
    
    // ✅ CACHED: Memoized subcategories getter
    const getSubcategoriesForCategory = useCallback((categoryIndex) => {
        if (categoryIndex === 0) return [];
        const category = categories[categoryIndex - 1];
        if (!category?.slug) return [];
        
        return subCategoriesManager.getSubcategoriesByCategory(category.slug) || [];
    }, [categories]);
    
    // ✅ Category/subcategory memory management
    const getCurrentSubCategoryForCategory = useCallback((categoryIndex) => {
        return categorySubCategoryMemory[categoryIndex] || 0;
    }, [categorySubCategoryMemory]);
    
    const setSubCategoryForCategory = useCallback((categoryIndex, subCategoryIndex) => {
        setCategorySubCategoryMemory(prev => ({
            ...prev,
            [categoryIndex]: subCategoryIndex
        }));
        
        if (categoryIndex === currentCategoryIndex) {
            setSubCategory(subCategoryIndex);
        }
    }, [currentCategoryIndex, setSubCategory]);
    
    // ✅ OPTIMIZED: Feed loading with proper deduplication
    const loadProductsWithFeed = useCallback(async (categoryIndex, subCategoryIndex, cursor = null) => {
        try {
            const category = categoryIndex === 0 ? null : categories[categoryIndex - 1];
            const categorySlug = category?.slug;
            
            const params = new URLSearchParams();
            params.append('seed', feedSeed);
            params.append('limit', '20');

            if (categorySlug) {
                params.append('categorySlug', categorySlug);
            }

            if (subCategoryIndex > 0 && category) {
                const subCategories = getSubcategoriesForCategory(categoryIndex);
                const subCategory = subCategories[subCategoryIndex - 1];
                if (subCategory?.slug) {
                    params.append('subCategorySlug', subCategory.slug);
                }
            }

            if (cursor) {
                params.append('cursor', cursor);
            }

            const url = `https://api.minymol.com/products/feed?${params.toString()}`;
            console.log(`🚀 Loading feed for category ${categoryIndex}`);

            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const { data, nextCursor, hasMore } = await response.json();
            console.log(`✅ Loaded ${data.length} products`);

            return { products: data, nextCursor, hasMore };

        } catch (error) {
            console.error('❌ Error loading feed:', error);
            return { products: [], nextCursor: null, hasMore: false };
        }
    }, [categories, feedSeed, getSubcategoriesForCategory]);
    
    // ✅ OPTIMIZED: Initialize products with deduplication
    const initializeCategoryProducts = useCallback(async (categoryIndex) => {
        // Prevent duplicate initialization
        const loadKey = `${categoryIndex}`;
        if (loadingRef.current[loadKey]) {
            console.log(`⏭️ Category ${categoryIndex} already loading`);
            return;
        }
        
        const currentState = categoryProducts[categoryIndex];
        if (currentState?.initialized) {
            console.log(`⏭️ Category ${categoryIndex} already initialized`);
            return;
        }
        
        loadingRef.current[loadKey] = true;
        
        setCategoryProducts(prev => ({
            ...prev,
            [categoryIndex]: {
                ...(prev[categoryIndex] || {}),
                isLoading: true,
            }
        }));
        
        const subCategoryUIIndex = getCurrentSubCategoryForCategory(categoryIndex);
        
        try {
            const { products, nextCursor, hasMore } = await loadProductsWithFeed(
                categoryIndex,
                subCategoryUIIndex,
                null
            );
            
            setCategoryProducts(prev => ({
                ...prev,
                [categoryIndex]: {
                    products,
                    nextCursor,
                    hasMore,
                    isLoading: false,
                    initialized: true,
                    lastSubCategoryIndex: subCategoryUIIndex
                }
            }));
            
            console.log(`✅ Category ${categoryIndex} initialized with ${products.length} products`);
        } catch (error) {
            console.error(`❌ Error initializing category ${categoryIndex}:`, error);
            setCategoryProducts(prev => ({
                ...prev,
                [categoryIndex]: {
                    products: [],
                    nextCursor: null,
                    hasMore: false,
                    isLoading: false,
                    initialized: true,
                    lastSubCategoryIndex: subCategoryUIIndex
                }
            }));
        } finally {
            delete loadingRef.current[loadKey];
        }
    }, [categoryProducts, getCurrentSubCategoryForCategory, loadProductsWithFeed]);
    
    // ✅ Initialize current category products when ready
    useEffect(() => {
        if (!isActive || !isReady || !categoriesInitialized) return;
        
        const categorySubCategoryUIIndex = getCurrentSubCategoryForCategory(currentCategoryIndex);
        const currentState = categoryProducts[currentCategoryIndex];
        
        // Reinitialize if subcategory changed or not initialized
        if (!currentState?.initialized || currentState.lastSubCategoryIndex !== categorySubCategoryUIIndex) {
            // Reset state first
            setCategoryProducts(prev => ({
                ...prev,
                [currentCategoryIndex]: {
                    products: [],
                    nextCursor: null,
                    hasMore: true,
                    isLoading: false,
                    initialized: false,
                    lastSubCategoryIndex: categorySubCategoryUIIndex
                }
            }));
            
            // Then initialize
            initializeCategoryProducts(currentCategoryIndex);
        }
    }, [currentCategoryIndex, isActive, isReady, categoriesInitialized, categorySubCategoryMemory, getCurrentSubCategoryForCategory]);
    
    // ✅ IDLE PREFETCH: Only prefetch when JS thread is idle
    useEffect(() => {
        if (!isActive || !isReady || !categoriesInitialized) return;
        
        // Use requestIdleCallback pattern (setTimeout fallback for React Native)
        const prefetchTimer = setTimeout(() => {
            const nextIndex = (currentCategoryIndex + 1) % totalCategories;
            const nextState = categoryProducts[nextIndex];
            
            if (!nextState?.initialized) {
                console.log(`⚡ Idle prefetch: category ${nextIndex}`);
                initializeCategoryProducts(nextIndex);
            }
        }, 1000); // Wait 1 second after navigation
        
        return () => clearTimeout(prefetchTimer);
    }, [currentCategoryIndex, isActive, isReady, categoriesInitialized, totalCategories, categoryProducts, initializeCategoryProducts]);
    
    // ✅ Refresh handler
    const onRefresh = useCallback(async () => {
        console.log('🔄 Refreshing...');
        setIsRefreshing(true);

        try {
            const newSeed = Math.random().toString(36).substring(2, 10);
            setFeedSeed(newSeed);
            
            await loadCategories();
            
            const categorySubCategoryUIIndex = getCurrentSubCategoryForCategory(currentCategoryIndex);
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
        } catch (error) {
            console.error('❌ Error refreshing:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [currentCategoryIndex, loadCategories, loadProductsWithFeed, getCurrentSubCategoryForCategory]);
    
    // ✅ Load more products
    const loadMoreProducts = useCallback(() => {
        const currentState = categoryProducts[currentCategoryIndex];
        
        if (!currentState || currentState.isLoading || !currentState.hasMore || !currentState.nextCursor) {
            return;
        }
        
        console.log(`🔄 Loading more products for category ${currentCategoryIndex}`);
        
        setCategoryProducts(prev => ({
            ...prev,
            [currentCategoryIndex]: {
                ...prev[currentCategoryIndex],
                isLoading: true
            }
        }));
        
        const categorySubCategoryUIIndex = getCurrentSubCategoryForCategory(currentCategoryIndex);
        
        loadProductsWithFeed(currentCategoryIndex, categorySubCategoryUIIndex, currentState.nextCursor)
            .then(({ products: newProducts, nextCursor, hasMore }) => {
                setCategoryProducts(prev => ({
                    ...prev,
                    [currentCategoryIndex]: {
                        ...prev[currentCategoryIndex],
                        products: [...(prev[currentCategoryIndex]?.products || []), ...newProducts],
                        nextCursor,
                        hasMore,
                        isLoading: false
                    }
                }));
            })
            .catch(error => {
                console.error('❌ Error loading more:', error);
                setCategoryProducts(prev => ({
                    ...prev,
                    [currentCategoryIndex]: {
                        ...prev[currentCategoryIndex],
                        isLoading: false
                    }
                }));
            });
    }, [categoryProducts, currentCategoryIndex, getCurrentSubCategoryForCategory, loadProductsWithFeed]);
    
    // ✅ Handle category press from BarSup
    const handleCategoryPress = useCallback((category) => {
        console.log('🔄 Category change:', category?.name || 'All');

        let newCategoryIndex;
        if (!category) {
            newCategoryIndex = 0;
        } else {
            const categoryIndex = categories.findIndex(cat => cat.id === category.id);
            if (categoryIndex !== -1) {
                newCategoryIndex = categoryIndex + 1;
            }
        }

        if (newCategoryIndex !== undefined && currentCategoryIndex !== newCategoryIndex) {
            isProgrammaticScrollRef.current = true;
            
            if (categoryFlatListRef.current) {
                categoryFlatListRef.current.scrollToIndex({
                    index: newCategoryIndex,
                    animated: false,
                });
            }
            
            setCategory(newCategoryIndex);
            
            const rememberedSubCategory = getCurrentSubCategoryForCategory(newCategoryIndex);
            if (rememberedSubCategory !== currentSubCategoryIndex) {
                setSubCategory(rememberedSubCategory);
            }

            setLastScrollY(0);
            setShowSubCategories(true);
            subCategoriesTranslateY.setValue(0);
            
            setTimeout(() => {
                isProgrammaticScrollRef.current = false;
            }, 100);
        }
    }, [currentCategoryIndex, currentSubCategoryIndex, categories, setCategory, setSubCategory, getCurrentSubCategoryForCategory, subCategoriesTranslateY]);
    
    // ✅ Handle category scroll
    const handleCategoryScroll = useCallback((event) => {
        if (isProgrammaticScrollRef.current) return;
        
        const offsetX = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(offsetX / screenWidth);
        
        if (newIndex !== currentCategoryIndex && newIndex >= 0 && newIndex < totalCategories) {
            console.log(`🎯 Scroll to category ${newIndex}`);
            setCategory(newIndex);
        }
    }, [currentCategoryIndex, totalCategories, setCategory]);
    
    // ✅ Handle subcategory press
    const handleSubCategoryPress = useCallback((subCategoryIndex) => {
        console.log(`🔀 Subcategory change to ${subCategoryIndex}`);
        setSubCategoryForCategory(currentCategoryIndex, subCategoryIndex);
    }, [currentCategoryIndex, setSubCategoryForCategory]);
    
    // ✅ Handle scroll for sticky header and infinite scroll
    const handleScroll = useCallback((event) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const isScrollingDown = currentY > lastScrollY && currentY > 20;
        const isScrollingUp = currentY < lastScrollY - 10;

        setLastScrollY(currentY);

        if (isScrollingDown && showSubCategories) {
            setShowSubCategories(false);
            Animated.timing(subCategoriesTranslateY, {
                toValue: -80,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else if (isScrollingUp && !showSubCategories) {
            setShowSubCategories(true);
            Animated.timing(subCategoriesTranslateY, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }

        // Infinite scroll logic
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const scrollPercentage = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;
        
        const currentState = categoryProducts[currentCategoryIndex];
        const shouldLoadMore = scrollPercentage >= 60 && 
                              currentState?.hasMore && 
                              !currentState?.isLoading && 
                              currentState?.initialized &&
                              currentState?.nextCursor &&
                              contentSize.height > layoutMeasurement.height;

        if (shouldLoadMore) {
            const now = Date.now();
            if (!scrollThrottleRef.current || (now - scrollThrottleRef.current) > 200) {
                scrollThrottleRef.current = now;
                loadMoreProducts();
            }
        }
    }, [lastScrollY, showSubCategories, categoryProducts, currentCategoryIndex, loadMoreProducts, subCategoriesTranslateY]);
    
    // ✅ CACHED: Memoized masonry distribution
    const distributeProductsInColumns = useCallback((products) => {
        const columns = [[], []];
        products.forEach((product, index) => {
            columns[index % 2].push(product);
        });
        return columns;
    }, []);
    
    // ✅ Render masonry column
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
                            setSelectedProduct(product);
                            setShowProductDetail(true);
                        }}
                    />
                </View>
            ))}
        </View>
    ), []);
    
    // ✅ Render BarSup
    const renderBarSup = useCallback(() => {
        const currentCategorySlug = currentCategoryIndex === 0 
            ? '' 
            : (categories[currentCategoryIndex - 1]?.slug || '');

        return (
            <View style={barSupStyles.barSup}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={barSupStyles.scrollContent}
                >
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

                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={barSupStyles.linkSup}
                            onPress={() => handleCategoryPress(cat)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                barSupStyles.linkText, 
                                currentCategorySlug === cat.slug && barSupStyles.selected
                            ]}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    }, [currentCategoryIndex, categories, handleCategoryPress]);
    
    // ✅ Render subcategories bar
    const renderSubCategoriesBar = useCallback((categoryIndex) => {
        if (categoryIndex === 0) return null;

        const subCategories = getSubcategoriesForCategory(categoryIndex);
        if (subCategories.length === 0) return null;

        return (
            <Animated.View style={[
                styles.stickySubCategoriesContainer,
                { transform: [{ translateY: subCategoriesTranslateY }] }
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
    }, [getSubcategoriesForCategory, getCurrentSubCategoryForCategory, handleSubCategoryPress, subCategoriesTranslateY]);
    
    // ✅ Render category page
    const renderCategoryPage = useCallback(({ item: categoryIndex }) => {
        const categoryState = categoryProducts[categoryIndex] || {
            products: [],
            nextCursor: null,
            hasMore: true,
            isLoading: false,
            initialized: false,
        };

        const hasSubCategories = categoryIndex !== 0 && getSubcategoriesForCategory(categoryIndex).length > 0;

        return (
            <View style={[styles.categoryPage, { width: screenWidth }]}>
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
                    {categoryIndex === 0 && isReady && (
                        <>
                            <Suspense fallback={null}>
                                <Reels />
                            </Suspense>
                            <Suspense fallback={null}>
                                <AutoCarousel onProviderPress={(p) => console.log('Provider:', p)} />
                            </Suspense>
                        </>
                    )}

                    <View style={[
                        styles.productsList,
                        hasSubCategories && styles.productsListWithStickyHeader
                    ]}>
                        {isReady && categoryState.products.length > 0 ? (
                            <View style={styles.masonryContainer}>
                                {distributeProductsInColumns(categoryState.products).map((columnProducts, columnIndex) =>
                                    renderMasonryColumn(columnProducts, columnIndex)
                                )}
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                {!isReady || !categoryState.initialized ? (
                                    <ActivityIndicator size="large" color="#fa7e17" />
                                ) : (
                                    <Text style={styles.emptyMessage}>No hay productos disponibles</Text>
                                )}
                            </View>
                        )}
                    </View>

                    {categoryState.isLoading && categoryState.products.length > 0 && (
                        <View style={styles.loadingMoreContainer}>
                            <ActivityIndicator color="#fa7e17" size="small" />
                            <Text style={styles.loadingMoreText}>Cargando más productos...</Text>
                        </View>
                    )}

                    {categoryState.products.length > 0 && !categoryState.hasMore && (
                        <View style={styles.endMessageContainer}>
                            <Text style={styles.endMessageText}>¡Has visto todos los productos!</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        );
    }, [categoryProducts, getSubcategoriesForCategory, renderSubCategoriesBar, handleScroll, isRefreshing, onRefresh, isReady, distributeProductsInColumns, renderMasonryColumn]);
    
    // Loading state
    if (categoriesLoading && categories.length === 0) {
        return (
            <View style={styles.container}>
                <Header selectedTab={selectedTab} onTabPress={onTabPress} onProductPress={onProductPress} onSearchPress={onSearchPress} isHome={true} />
                <View style={barSupStyles.barSup}>
                    <ActivityIndicator size="small" color="#fa7e17" />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fa7e17" />
                </View>
                <NavInf selectedTab={selectedTab} onTabPress={onTabPress} cartItemCount={cartItemCount} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header selectedTab={selectedTab} onTabPress={onTabPress} onProductPress={onProductPress} onSearchPress={onSearchPress} isHome={true} />
            {renderBarSup()}
            
            {/* ✅ OPTIMIZED FlatList for Android */}
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
                windowSize={3} // Optimized for Android
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                removeClippedSubviews={true}
                decelerationRate="fast"
                updateCellsBatchingPeriod={50}
            />

            <NavInf selectedTab={selectedTab} onTabPress={onTabPress} cartItemCount={cartItemCount} />

            {showProductDetail && selectedProduct && (
                <Modal
                    visible={showProductDetail}
                    transparent={false}
                    animationType="slide"
                    onRequestClose={() => setShowProductDetail(false)}
                    statusBarTranslucent={true}
                >
                    <ProductDetail
                        route={{ params: { product: selectedProduct } }}
                        navigation={{ goBack: () => setShowProductDetail(false) }}
                        isModal={true}
                    />
                </Modal>
            )}
        </View>
    );
};

// Styles (abbreviated for space)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    categoryPage: { flex: 1, backgroundColor: 'white' },
    scrollViewContent: { paddingBottom: 85 },
    masonryContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    masonryColumn: { flex: 1, paddingLeft: 0, paddingRight: 4 },
    leftColumn: { paddingLeft: 0, paddingRight: 2 },
    rightColumn: { paddingLeft: 2, paddingRight: 0 },
    masonryItem: { marginBottom: 8 },
    productsList: { paddingTop: 10, paddingBottom: 100 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20, minHeight: 200 },
    emptyMessage: { textAlign: 'center', color: '#888', fontSize: 16, fontFamily: getUbuntuFont('regular'), marginTop: 10 },
    stickySubCategoriesContainer: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#ffffff', zIndex: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    productsListWithStickyHeader: { paddingTop: 65 },
    subCategoriesBar: { backgroundColor: '#ffffff', paddingVertical: 12, paddingHorizontal: 5, height: 65 },
    subCategoriesList: { flexGrow: 0, flexShrink: 0 },
    subCategoriesScrollContent: { paddingHorizontal: 15, paddingVertical: 5, alignItems: 'center', flexDirection: 'row', minWidth: '100%' },
    subCategoryItem: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 12, borderRadius: 25, backgroundColor: '#f5f5f5', borderWidth: 0, minWidth: 60, justifyContent: 'center', alignItems: 'center' },
    subCategoryText: { fontSize: 13, color: '#555', fontFamily: getUbuntuFont('medium'), textAlign: 'center', fontWeight: '500' },
    selectedSubCategory: { backgroundColor: '#fa7e17', transform: [{ scale: 1.05 }] },
    selectedSubCategoryText: { color: 'white', fontFamily: getUbuntuFont('bold'), fontSize: 13, fontWeight: '600' },
    loadingMoreContainer: { paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', marginHorizontal: 8, marginVertical: 8, borderRadius: 8 },
    loadingMoreText: { marginLeft: 8, fontSize: 13, color: '#666', fontFamily: getUbuntuFont('regular') },
    endMessageContainer: { paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
    endMessageText: { fontSize: 14, color: '#999', fontFamily: getUbuntuFont('regular'), textAlign: 'center' },
});

const barSupStyles = StyleSheet.create({
    barSup: { backgroundColor: '#2d2d58', width: '100%', paddingVertical: 5 },
    scrollContent: { alignItems: 'center', paddingHorizontal: 8 },
    linkSup: { paddingHorizontal: 15, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
    linkText: { color: 'white', fontSize: 15, fontFamily: getUbuntuFont('regular'), textAlign: 'center' },
    selected: { color: '#fa7e17' },
});

export default CategorySliderHomeUltra;
