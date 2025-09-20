/**
 * GlobalProductsCache - Cache simple en memoria para productos y categorías
 * Restaurado para que funcione como antes de las optimizaciones problemáticas
 */
class GlobalProductsCache {
    constructor() {
        this.categories = {
            data: [],
            initialized: false,
            timestamp: null
        };
        
        this.homeProducts = {
            products: [],
            seed: null,
            initialized: false,
            timestamp: null
        };
        
        this.categoryProducts = new Map(); // categoryKey -> { products, initialized, timestamp }
        this.loadingStates = new Map(); // categoryKey -> boolean
        
        // TTL de 5 minutos para verificar freshness
        this.TTL = 5 * 60 * 1000;
    }

    // Métodos para categorías
    getCategories() {
        return this.categories;
    }

    setCategories(categoriesData) {
        this.categories = {
            data: categoriesData,
            initialized: true,
            timestamp: Date.now()
        };
    }

    shouldLoadCategories() {
        if (!this.categories.initialized) return true;
        
        // Verificar si el cache está stale (más de 5 minutos)
        const now = Date.now();
        return (now - this.categories.timestamp) > this.TTL;
    }

    // Métodos para productos del home
    getHomeProducts() {
        return this.homeProducts;
    }

    setHomeProducts(products, seed) {
        this.homeProducts = {
            products,
            seed,
            initialized: true,
            timestamp: Date.now()
        };
    }

    // Métodos para productos por categoría
    getCategoryKey(categoryIndex, subCategoryIndex) {
        return `${categoryIndex}-${subCategoryIndex}`;
    }

    getCategoryProducts(categoryIndex, subCategoryIndex) {
        const key = this.getCategoryKey(categoryIndex, subCategoryIndex);
        const cached = this.categoryProducts.get(key);
        
        if (!cached) {
            return {
                products: [],
                initialized: false,
                timestamp: null
            };
        }
        
        return cached;
    }

    setCategoryProducts(categoryIndex, subCategoryIndex, products) {
        const key = this.getCategoryKey(categoryIndex, subCategoryIndex);
        
        this.categoryProducts.set(key, {
            products,
            initialized: true,
            timestamp: Date.now()
        });
        
        // Remover estado de loading
        this.loadingStates.delete(key);
    }

    shouldLoadCategory(categoryIndex, subCategoryIndex) {
        const cached = this.getCategoryProducts(categoryIndex, subCategoryIndex);
        
        if (!cached.initialized) return true;
        
        // Verificar si el cache está stale
        const now = Date.now();
        return (now - cached.timestamp) > this.TTL;
    }

    isCategoryStale(categoryIndex, subCategoryIndex) {
        const cached = this.getCategoryProducts(categoryIndex, subCategoryIndex);
        
        if (!cached.initialized) return true;
        
        const now = Date.now();
        return (now - cached.timestamp) > this.TTL;
    }

    // Estados de loading para evitar múltiples llamadas
    isLoading(categoryIndex, subCategoryIndex) {
        const key = this.getCategoryKey(categoryIndex, subCategoryIndex);
        return this.loadingStates.get(key) || false;
    }

    setLoading(categoryIndex, subCategoryIndex, loading) {
        const key = this.getCategoryKey(categoryIndex, subCategoryIndex);
        if (loading) {
            this.loadingStates.set(key, true);
        } else {
            this.loadingStates.delete(key);
        }
    }

    // Limpieza para evitar memory leaks
    clearOldCache() {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000; // 30 minutos

        // Limpiar categorías viejas
        for (const [key, cached] of this.categoryProducts.entries()) {
            if ((now - cached.timestamp) > maxAge) {
                this.categoryProducts.delete(key);
            }
        }
    }

    // Debug info
    getStats() {
        return {
            categoriesInitialized: this.categories.initialized,
            homeProductsInitialized: this.homeProducts.initialized,
            cachedCategoriesCount: this.categoryProducts.size,
            loadingStatesCount: this.loadingStates.size
        };
    }
}

// Exportar instancia singleton
const globalProductsCache = new GlobalProductsCache();
export default globalProductsCache;