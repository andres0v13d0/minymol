import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchHistoryStorage } from '../../utils/searchHistoryStorage';
import Product from '../Product/Product';
import ProductsSkeleton from '../ProductsSkeleton/ProductsSkeleton';

const { width: screenWidth } = Dimensions.get('window');

const SearchModal = ({ visible, onClose, onProductPress, initialText = '' }) => {
    const [text, setText] = useState(initialText);
    const [searchHistory, setSearchHistory] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const textInputRef = useRef(null);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (visible) {
            setText(initialText);
            setHasSearched(false);
            setSearchResults([]);
            loadSearchHistory();

            // Animar entrada del modal
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Enfocar el input automáticamente
            setTimeout(() => {
                textInputRef.current?.focus();
            }, 250);
        } else {
            // Resetear animaciones
            fadeAnim.setValue(0);
            slideAnim.setValue(50);
        }
    }, [visible, initialText]);

    const loadSearchHistory = async () => {
        try {
            const history = await searchHistoryStorage.getSearchHistory();
            setSearchHistory(history);
        } catch (error) {
            console.error('Error loading search history:', error);
        }
    };

    const performSearch = async (searchText) => {
        try {
            setIsSearching(true);
            setHasSearched(true);
            
            console.log('Buscando productos para:', searchText);

            // Llamada a la API de búsqueda
            const searchRes = await fetch(
                `https://api.minymol.com/products/search/${encodeURIComponent(searchText.trim())}`
            );
            const data = await searchRes.json();

            if (!Array.isArray(data)) {
                throw new Error('Respuesta inválida del backend');
            }

            // Obtener previews de los productos
            const ids = data.map(p => p.product_id);

            if (ids.length > 0) {
                const previewsRes = await fetch('https://api.minymol.com/products/previews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids })
                });

                const previews = await previewsRes.json();
                setSearchResults(previews);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error al buscar productos:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearch = async (searchText = text) => {
        const trimmed = searchText.trim();
        if (!trimmed) return;

        try {
            // Guardar en historial
            await searchHistoryStorage.addSearch(trimmed);
            
            // Realizar búsqueda
            await performSearch(trimmed);
        } catch (error) {
            console.error('Error saving search:', error);
            // Continuar con la búsqueda aunque falle el guardado
            await performSearch(trimmed);
        }
    };

    const handleHistoryItemPress = (historyText) => {
        setText(historyText);
        handleSearch(historyText);
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 50,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleProductPress = (product) => {
        // Cerrar modal primero
        handleClose();
        // Luego navegar al producto
        setTimeout(() => {
            if (onProductPress) {
                onProductPress(product);
            }
        }, 200);
    };

    const clearHistory = async () => {
        try {
            await searchHistoryStorage.clearHistory();
            setSearchHistory([]);
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    };

    // Función para distribuir productos en columnas tipo masonry
    const distributeProductsInColumns = (products) => {
        const columns = [[], []]; // 2 columnas
        
        products.forEach((product, index) => {
            const columnIndex = index % 2;
            columns[columnIndex].push(product);
        });
        
        return columns;
    };

    const renderMasonryColumn = (columnProducts, columnIndex) => (
        <View key={`column-${columnIndex}`} style={styles.masonryColumn}>
            {columnProducts.map((product, index) => (
                <View key={`${product.id || product.product_id}-${index}`} style={styles.productContainer}>
                    <Product 
                        product={product} 
                        onPress={() => handleProductPress(product)}
                        index={index}
                    />
                </View>
            ))}
        </View>
    );

    const renderProduct = ({ item, index }) => (
        <View style={styles.productContainer}>
            <Product 
                product={item} 
                onPress={() => handleProductPress(item)}
                index={index}
            />
        </View>
    );

    const renderHistoryItem = ({ item }) => (
        <TouchableOpacity
            style={styles.historyItem}
            onPress={() => handleHistoryItemPress(item)}
        >
            <Ionicons name="time-outline" size={18} color="#666" style={styles.historyIcon} />
            <Text style={styles.historyText}>{item}</Text>
            <Ionicons name="arrow-up-outline" size={16} color="#999" style={styles.arrowIcon} />
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent={true}
        >
            <StatusBar backgroundColor="white" barStyle="dark-content" />
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                            paddingTop: insets.top,
                        },
                    ]}
                >
                    <View style={styles.container}>
                        {/* Header con input de búsqueda */}
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backButton} onPress={handleClose}>
                                <Ionicons name="chevron-back" size={24} color="#333" />
                            </TouchableOpacity>

                            <View style={styles.searchContainer}>
                                <TextInput
                                    ref={textInputRef}
                                    style={styles.searchInput}
                                    placeholder="Buscar..."
                                    placeholderTextColor="#999"
                                    value={text}
                                    onChangeText={setText}
                                    onSubmitEditing={() => handleSearch()}
                                    returnKeyType="search"
                                    autoFocus={true}
                                />
                                <TouchableOpacity style={styles.searchButton} onPress={() => handleSearch()}>
                                    <Ionicons name="search" size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Contenido del modal */}
                        <Animated.View
                            style={[
                                styles.content,
                                {
                                    opacity: fadeAnim,
                                },
                            ]}
                        >
                            {isSearching ? (
                                <View style={styles.loadingContainer}>
                                    <View style={styles.resultsHeader}>
                                        <Text style={styles.resultsTitle}>Buscando productos...</Text>
                                    </View>
                                    <ProductsSkeleton columnsCount={2} itemsCount={6} />
                                </View>
                            ) : hasSearched ? (
                                // Mostrar resultados de búsqueda
                                searchResults.length > 0 ? (
                                    <>
                                        <View style={styles.resultsHeader}>
                                            <Text style={styles.resultsTitle}>
                                                {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para "{text}"
                                            </Text>
                                        </View>
                                        <ScrollView 
                                            style={styles.resultsContainer}
                                            showsVerticalScrollIndicator={false}
                                            contentContainerStyle={styles.productsContainer}
                                        >
                                            <View style={styles.masonryContainer}>
                                                {distributeProductsInColumns(searchResults).map((columnProducts, columnIndex) =>
                                                    renderMasonryColumn(columnProducts, columnIndex)
                                                )}
                                            </View>
                                        </ScrollView>
                                    </>
                                ) : (
                                    <View style={styles.emptyResults}>
                                        <Ionicons name="search-outline" size={48} color="#ccc" />
                                        <Text style={styles.emptyResultsTitle}>Sin resultados</Text>
                                        <Text style={styles.emptyResultsText}>
                                            No se encontraron productos para "{text}"
                                        </Text>
                                    </View>
                                )
                            ) : (
                                // Mostrar historial cuando no se ha buscado
                                searchHistory.length > 0 ? (
                                    <>
                                        <View style={styles.historyHeader}>
                                            <Text style={styles.historyTitle}>Búsquedas recientes</Text>
                                            <TouchableOpacity onPress={clearHistory}>
                                                <Text style={styles.clearText}>Limpiar</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <FlatList
                                            data={searchHistory}
                                            renderItem={renderHistoryItem}
                                            keyExtractor={(item, index) => `${item}-${index}`}
                                            showsVerticalScrollIndicator={false}
                                            style={styles.historyList}
                                        />
                                    </>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="search-outline" size={48} color="#ccc" />
                                        <Text style={styles.emptyText}>Realiza tu primera búsqueda</Text>
                                    </View>
                                )
                            )}
                        </Animated.View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'white',
        marginTop: 0,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 8,
        marginRight: 4,
    },
    searchContainer: {
        flex: 1,
        backgroundColor: 'white',
        height: 40,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        paddingLeft: 16,
        paddingRight: 8,
        backgroundColor: 'transparent',
        color: 'black',
    },
    searchButton: {
        backgroundColor: '#fa7e17',
        height: '100%',
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
    },
    content: {
        flex: 1,
        backgroundColor: 'white',
        paddingTop: 8,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    clearText: {
        fontSize: 14,
        color: '#fa7e17',
        fontWeight: '500',
    },
    historyList: {
        flex: 1,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f8f8',
    },
    historyIcon: {
        marginRight: 12,
    },
    historyText: {
        flex: 1,
        fontSize: 15,
        color: '#333',
    },
    arrowIcon: {
        marginLeft: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 12,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    resultsHeader: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        backgroundColor: 'white',
    },
    resultsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    resultsContainer: {
        flex: 1,
    },
    productsContainer: {
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 20,
    },
    masonryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    masonryColumn: {
        flex: 1,
        paddingHorizontal: 5,
    },
    row: {
        justifyContent: 'space-between',
        paddingHorizontal: 5,
    },
    productContainer: {
        marginBottom: 15,
    },
    emptyResults: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyResultsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 12,
        marginBottom: 4,
        textAlign: 'center',
    },
    emptyResultsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
});

export default SearchModal;