/**
 * SubCategoriesManager - Gestor de subcategorías para productos
 * Maneja la lógica de filtrado y organización de productos por categorías y subcategorías
 */

class SubCategoriesManager {
    constructor() {
        this.subcategoriesCache = new Map();
        this.categoriesCache = new Map();
    }

    /**
     * Obtiene todas las categorías disponibles
     * @returns {Array} Array de categorías
     */
    getCategories() {
        // Primero intentar obtener desde el caché de la API
        if (this.categoriesCache.size > 0) {
            return Array.from(this.categoriesCache.values());
        }

        // Fallback a categorías hardcodeadas si no hay datos de la API
        return [
            { id: 1, name: 'Tecnología', slug: 'tecnologia' },
            { id: 2, name: 'Hogar', slug: 'hogar' },
            { id: 3, name: 'Ropa', slug: 'ropa' },
            { id: 4, name: 'Deportes', slug: 'deportes' },
            { id: 5, name: 'Libros', slug: 'libros' },
        ];
    }

    /**
     * Establece las categorías con sus subcategorías desde la API
     * @param {Array} categories - Categorías con subcategorías desde la API
     */
    setCategoriesFromAPI(categories) {
        this.categoriesCache.clear();
        this.subcategoriesCache.clear();
        
        if (Array.isArray(categories)) {
            categories.forEach(category => {
                this.categoriesCache.set(category.slug, category);
                if (category.subCategories && Array.isArray(category.subCategories)) {
                    this.subcategoriesCache.set(category.slug, category.subCategories);
                }
            });
        }
    }

    /**
     * Obtiene subcategorías por categoría
     * @param {string} categorySlug - Slug de la categoría
     * @returns {Array} Array de subcategorías
     */
    getSubcategoriesByCategory(categorySlug) {
        // Primero intentar obtener desde el caché de la API
        if (this.subcategoriesCache.has(categorySlug)) {
            return this.subcategoriesCache.get(categorySlug) || [];
        }

        // Fallback a subcategorías hardcodeadas si no hay datos de la API
        const subcategoriesMap = {
            'tecnologia': [
                { id: 1, name: 'Smartphones', slug: 'smartphones' },
                { id: 2, name: 'Laptops', slug: 'laptops' },
                { id: 3, name: 'Tablets', slug: 'tablets' },
                { id: 4, name: 'Accesorios', slug: 'accesorios-tech' },
            ],
            'hogar': [
                { id: 5, name: 'Cocina', slug: 'cocina' },
                { id: 6, name: 'Decoración', slug: 'decoracion' },
                { id: 7, name: 'Muebles', slug: 'muebles' },
                { id: 8, name: 'Electrodomésticos', slug: 'electrodomesticos' },
            ],
            'ropa': [
                { id: 9, name: 'Hombre', slug: 'hombre' },
                { id: 10, name: 'Mujer', slug: 'mujer' },
                { id: 11, name: 'Niños', slug: 'ninos' },
                { id: 12, name: 'Zapatos', slug: 'zapatos' },
            ],
            'deportes': [
                { id: 13, name: 'Fitness', slug: 'fitness' },
                { id: 14, name: 'Fútbol', slug: 'futbol' },
                { id: 15, name: 'Basketball', slug: 'basketball' },
                { id: 16, name: 'Natación', slug: 'natacion' },
            ],
            'libros': [
                { id: 17, name: 'Ficción', slug: 'ficcion' },
                { id: 18, name: 'No Ficción', slug: 'no-ficcion' },
                { id: 19, name: 'Educativos', slug: 'educativos' },
                { id: 20, name: 'Infantiles', slug: 'infantiles' },
            ],
        };

        return subcategoriesMap[categorySlug] || [];
    }

    /**
     * Filtra productos por categoría
     * @param {Array} products - Array de productos
     * @param {string} categorySlug - Slug de la categoría
     * @returns {Array} Productos filtrados
     */
    filterProductsByCategory(products, categorySlug) {
        if (!categorySlug || categorySlug === '') {
            return products;
        }

        return products.filter(product =>
            product.category?.slug === categorySlug ||
            product.categorySlug === categorySlug
        );
    }

    /**
     * Filtra productos por subcategoría
     * @param {Array} products - Array de productos
     * @param {string} subcategorySlug - Slug de la subcategoría
     * @returns {Array} Productos filtrados
     */
    filterProductsBySubcategory(products, subcategorySlug) {
        if (!subcategorySlug || subcategorySlug === '') {
            return products;
        }

        return products.filter(product =>
            product.subcategory?.slug === subcategorySlug ||
            product.subcategorySlug === subcategorySlug
        );
    }

    /**
     * Obtiene la información de una categoría por su slug
     * @param {string} categorySlug - Slug de la categoría
     * @returns {Object|null} Información de la categoría
     */
    getCategoryBySlug(categorySlug) {
        const categories = this.getCategories();
        return categories.find(cat => cat.slug === categorySlug) || null;
    }

    /**
     * Obtiene la información de una subcategoría por su slug
     * @param {string} subcategorySlug - Slug de la subcategoría
     * @returns {Object|null} Información de la subcategoría
     */
    getSubcategoryBySlug(subcategorySlug) {
        const categories = this.getCategories();

        for (const category of categories) {
            const subcategories = this.getSubcategoriesByCategory(category.slug);
            const subcategory = subcategories.find(sub => sub.slug === subcategorySlug);
            if (subcategory) {
                return { ...subcategory, parentCategory: category };
            }
        }

        return null;
    }

    /**
     * Busca productos por texto
     * @param {Array} products - Array de productos
     * @param {string} searchText - Texto de búsqueda
     * @returns {Array} Productos que coinciden con la búsqueda
     */
    searchProducts(products, searchText) {
        if (!searchText || searchText.trim() === '') {
            return products;
        }

        const searchLower = searchText.toLowerCase().trim();

        return products.filter(product => {
            const name = (product.name || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            const category = (product.category?.name || product.categoryName || '').toLowerCase();
            const subcategory = (product.subcategory?.name || product.subcategoryName || '').toLowerCase();

            return name.includes(searchLower) ||
                description.includes(searchLower) ||
                category.includes(searchLower) ||
                subcategory.includes(searchLower);
        });
    }

  /**
   * Organiza productos en columnas para layout masonry
   * @param {Array} products - Array de productos
   * @param {number} columnsCount - Número de columnas
   * @returns {Array} Array de columnas con productos
   */
  organizeProductsInColumns(products, columnsCount = 2) {
    const columns = Array.from({ length: columnsCount }, () => []);
    
    products.forEach((product, index) => {
      const columnIndex = index % columnsCount;
      columns[columnIndex].push(product);
    });
    
    return columns;
  }

  /**
   * Verifica si se debe sincronizar con la base de datos
   * @returns {boolean} Si debe sincronizar
   */
  shouldSync() {
    // Por ahora siempre retorna false para evitar sincronización automática
    return false;
  }

  /**
   * Sincroniza subcategorías con la base de datos
   * @returns {Promise<boolean>} Si hubo cambios
   */
  async syncWithDatabase() {
    try {
      // Mock de sincronización - aquí podrías hacer llamadas a API
      console.log('🔄 Sincronizando subcategorías...');
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Por ahora no hay cambios
      return false;
    } catch (error) {
      console.error('❌ Error sincronizando subcategorías:', error);
      return false;
    }
  }
}// Exportamos una instancia singleton
const subCategoriesManager = new SubCategoriesManager();

export default subCategoriesManager;